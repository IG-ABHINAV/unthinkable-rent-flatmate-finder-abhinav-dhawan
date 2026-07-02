import type { Listing, TenantProfile } from "@prisma/client";
import OpenAI from "openai";
import { z } from "zod";
import { config } from "../config.js";
import { db } from "../db.js";

const responseSchema = z.object({ score: z.number().min(0).max(100), explanation: z.string().min(1).max(600) });
type ScoreInput = Pick<Listing, "location" | "rent" | "availableFrom" | "roomType" | "furnishingStatus">;
type ProfileInput = Pick<TenantProfile, "preferredLocation" | "budgetMin" | "budgetMax" | "moveInDate">;

const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, " ");

export function fallbackScore(listing: ScoreInput, profile: ProfileInput) {
  const location = normalize(listing.location);
  const preferred = normalize(profile.preferredLocation);
  const exact = location === preferred;
  const partial = !exact && (location.includes(preferred) || preferred.includes(location));
  const locationScore = exact ? 60 : partial ? 30 : 0;
  let budgetScore: number;
  if (listing.rent >= profile.budgetMin && listing.rent <= profile.budgetMax) budgetScore = 40;
  else if (listing.rent < profile.budgetMin) budgetScore = 40 - Math.min(40, ((profile.budgetMin - listing.rent) / profile.budgetMin) * 40);
  else budgetScore = Math.max(0, 40 - ((listing.rent - profile.budgetMax) / profile.budgetMax) * 100);
  const score = Math.max(0, Math.min(100, Math.round(locationScore + budgetScore)));
  return {
    score,
    explanation: `Rule-based score: ${exact ? "exact" : partial ? "partial" : "no"} location match; rent is ${listing.rent >= profile.budgetMin && listing.rent <= profile.budgetMax ? "within" : "outside"} the preferred budget.`,
    scoringMethod: "FALLBACK" as const
  };
}

async function llmScore(listing: ScoreInput, profile: ProfileInput) {
  if (!config.LLM_API_KEY) throw new Error("LLM is not configured");
  const client = new OpenAI({ apiKey: config.LLM_API_KEY, timeout: 8_000, maxRetries: 1 });
  const completion = await client.chat.completions.create({
    model: config.LLM_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "You are a rental-matching assistant. Respond only with valid JSON containing score and explanation." },
      { role: "user", content: `Room listing: ${JSON.stringify(listing)}\nTenant profile: ${JSON.stringify(profile)}\nCompute compatibility from 0 to 100, prioritizing budget and location. Return {\"score\": number, \"explanation\": string}.` }
    ]
  });
  const parsed = responseSchema.parse(JSON.parse(completion.choices[0]?.message.content ?? ""));
  return { ...parsed, score: Math.round(parsed.score), scoringMethod: "LLM" as const };
}

export async function scoreListing(tenantId: string, listingId: string) {
  const [cached, listing, profile] = await Promise.all([
    db.match.findUnique({ where: { tenantId_listingId: { tenantId, listingId } } }),
    db.listing.findUnique({ where: { id: listingId } }),
    db.tenantProfile.findUnique({ where: { userId: tenantId } })
  ]);
  if (!listing || listing.status !== "ACTIVE") throw new Error("Listing unavailable");
  if (!profile) throw new Error("Tenant profile required");
  if (cached && cached.computedAt >= listing.updatedAt && cached.computedAt >= profile.updatedAt) return cached;
  let result;
  try { result = await llmScore(listing, profile); }
  catch (error) { console.warn("LLM scoring failed; using fallback", error instanceof Error ? error.message : error); result = fallbackScore(listing, profile); }
  return db.match.upsert({
    where: { tenantId_listingId: { tenantId, listingId } },
    create: { tenantId, listingId, ...result },
    update: { ...result, computedAt: new Date() }
  });
}


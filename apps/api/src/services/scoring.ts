import type { Listing, TenantProfile } from "@prisma/client";
import OpenAI from "openai";
import { z } from "zod";
import { config } from "../config.js";
import { db } from "../db.js";

const responseSchema = z.object({ score: z.number().min(0).max(100), explanation: z.string().min(1).max(600) });
type ScoreInput = Pick<Listing, "location" | "rent" | "availableFrom" | "roomType" | "furnishingStatus" | "genderPreference" | "smokingAllowed" | "petsAllowed" | "dietaryPolicy" | "sleepHabitAllowed" | "amenities" | "roommateInterests">;
type ProfileInput = Pick<TenantProfile, "preferredLocation" | "budgetMin" | "budgetMax" | "moveInDate" | "gender" | "genderPreference" | "smoking" | "pets" | "diet" | "sleepHabit" | "interests">;

const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, " ");

export function fallbackScore(listing: ScoreInput, profile: ProfileInput) {
  // Hard constraint: Gender preference
  if (listing.genderPreference !== "ANY" && profile.gender !== "ANY" && listing.genderPreference !== profile.gender) {
    return {
      score: 0,
      explanation: `Gender mismatch: listing requires a ${listing.genderPreference.toLowerCase()} roommate, but your profile gender is ${profile.gender.toLowerCase()}.`,
      scoringMethod: "FALLBACK" as const
    };
  }

  const location = normalize(listing.location);
  const preferred = normalize(profile.preferredLocation);
  const exact = location === preferred;
  const partial = !exact && (location.includes(preferred) || preferred.includes(location));
  const locationScore = exact ? 30 : partial ? 15 : 0;

  let budgetScore: number;
  if (listing.rent >= profile.budgetMin && listing.rent <= profile.budgetMax) {
    budgetScore = 30;
  } else if (listing.rent < profile.budgetMin) {
    budgetScore = Math.max(0, 30 - ((profile.budgetMin - listing.rent) / profile.budgetMin) * 30);
  } else {
    budgetScore = Math.max(0, 30 - ((listing.rent - profile.budgetMax) / profile.budgetMax) * 60);
  }

  // Lifestyle compatibility (4 parameters, 7.5 points each)
  let lifestyleScore = 0;
  const reasons: string[] = [];

  // Smoking
  if (profile.smoking && !listing.smokingAllowed) {
    reasons.push("smoking mismatch");
  } else {
    lifestyleScore += 7.5;
  }

  // Pets
  if (profile.pets && !listing.petsAllowed) {
    reasons.push("pet mismatch");
  } else {
    lifestyleScore += 7.5;
  }

  // Diet
  if (listing.dietaryPolicy === "VEG_ONLY" && profile.diet === "NON_VEG") {
    reasons.push("diet mismatch (veg-only listing)");
  } else {
    lifestyleScore += 7.5;
  }

  // Sleep Cycle
  if (listing.sleepHabitAllowed === "ANY" || profile.sleepHabit === "ANY" || listing.sleepHabitAllowed === profile.sleepHabit) {
    lifestyleScore += 7.5;
  } else {
    reasons.push(`sleep schedule mismatch (${profile.sleepHabit.toLowerCase().replace('_', ' ')} vs allowed ${listing.sleepHabitAllowed.toLowerCase().replace('_', ' ')})`);
  }

  // Interests
  const tenantInterests = profile.interests || [];
  const roommateInterests = listing.roommateInterests || [];
  const shared = tenantInterests.filter(i => roommateInterests.includes(i));
  const interestScore = Math.min(10, shared.length * 2.5);

  if (shared.length > 0) {
    reasons.push(`shared interests: ${shared.join(", ")}`);
  }

  const score = Math.max(0, Math.min(100, Math.round(locationScore + budgetScore + lifestyleScore + interestScore)));
  const explanation = `Rule-based match score: ${score}%. Location is a ${exact ? "perfect" : partial ? "partial" : "poor"} match. Rent is ${listing.rent >= profile.budgetMin && listing.rent <= profile.budgetMax ? "within" : "outside"} budget. ` + (reasons.length > 0 ? `Details: ${reasons.join("; ")}.` : "Lifestyle preferences align.");

  return {
    score,
    explanation,
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
      { role: "system", content: "You are a professional flatmate matching assistant. Calculate compatibility from 0 to 100 between a tenant and a room listing. Return a JSON object with keys: score (number) and explanation (string, max 600 chars). The explanation should be a concise, friendly, and structured summary detailing why they are a good fit or if there are conflicts, highlighting shared hobbies, budget, location, and lifestyle habits." },
      { role: "user", content: `Room listing: ${JSON.stringify(listing)}\nTenant profile: ${JSON.stringify(profile)}\n\nRequirements:\n1. If listing genderPreference is not "ANY", and tenant gender is not "ANY", and they do not match, score MUST be 0 and explanation must state the gender mismatch.\n2. Consider budget alignment, location proximity, smoking preference, pet allowance, vegetarian/non-vegetarian alignment, sleeping patterns, and shared hobbies/interests. Shared interests should boost the score.\n3. Return JSON: { \"score\": number, \"explanation\": string }` }
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


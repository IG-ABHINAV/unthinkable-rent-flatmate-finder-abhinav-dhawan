import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { asyncRoute, HttpError } from "../lib/http.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { scoreListing } from "../services/scoring.js";

export const listingsRouter = Router();
listingsRouter.use(requireAuth);
const inputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(3000),
  location: z.string().trim().min(2).max(120),
  rent: z.number().int().positive(),
  availableFrom: z.coerce.date(),
  roomType: z.string().trim().min(2).max(40),
  furnishingStatus: z.string().trim().min(2).max(40),
  photos: z.array(z.string().url()).max(10).default([]),
  genderPreference: z.string().trim().default("ANY"),
  smokingAllowed: z.boolean().default(false),
  petsAllowed: z.boolean().default(false),
  dietaryPolicy: z.string().trim().default("NO_RESTRICTIONS"),
  sleepHabitAllowed: z.string().trim().default("ANY"),
  amenities: z.array(z.string()).default([]),
  roommateInterests: z.array(z.string()).default([])
});

listingsRouter.get("/mine", requireRole(Role.OWNER), asyncRoute(async (req, res) => {
  res.json(await db.listing.findMany({ where: { ownerId: req.user!.id }, orderBy: { createdAt: "desc" } }));
}));

listingsRouter.post("/", requireRole(Role.OWNER), asyncRoute(async (req, res) => {
  res.status(201).json(await db.listing.create({ data: { ...inputSchema.parse(req.body), ownerId: req.user!.id } }));
}));

listingsRouter.patch("/:id", requireRole(Role.OWNER), asyncRoute(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const existing = await db.listing.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Listing not found");
  if (existing.ownerId !== req.user!.id) throw new HttpError(403, "Not your listing");
  const data = inputSchema.partial().parse(req.body);
  const listing = await db.$transaction(async tx => {
    const updated = await tx.listing.update({ where: { id: existing.id }, data });
    await tx.match.deleteMany({ where: { listingId: existing.id } });
    return updated;
  });
  res.json(listing);
}));

listingsRouter.patch("/:id/fill", requireRole(Role.OWNER), asyncRoute(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const existing = await db.listing.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Listing not found");
  if (existing.ownerId !== req.user!.id) throw new HttpError(403, "Not your listing");
  res.json(await db.listing.update({ where: { id: existing.id }, data: { status: "FILLED" } }));
}));

listingsRouter.get("/", requireRole(Role.TENANT), asyncRoute(async (req, res) => {
  const query = z.object({ location: z.string().optional(), budgetMin: z.coerce.number().int().nonnegative().optional(), budgetMax: z.coerce.number().int().positive().optional() }).parse(req.query);
  const listings = await db.listing.findMany({
    where: { status: "ACTIVE", location: query.location ? { contains: query.location, mode: "insensitive" } : undefined, rent: { gte: query.budgetMin, lte: query.budgetMax } },
    include: { owner: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" }
  });
  const ranked = await Promise.all(listings.map(async listing => ({ ...listing, match: await scoreListing(req.user!.id, listing.id) })));
  ranked.sort((a, b) => b.match.score - a.match.score);
  res.json(ranked);
}));

listingsRouter.get("/:id/score", requireRole(Role.TENANT), asyncRoute(async (req, res) => res.json(await scoreListing(req.user!.id, z.string().uuid().parse(req.params.id)))));

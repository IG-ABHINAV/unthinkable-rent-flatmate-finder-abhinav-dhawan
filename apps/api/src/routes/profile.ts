import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { asyncRoute } from "../lib/http.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const profileRouter = Router();
profileRouter.use(requireAuth, requireRole(Role.TENANT));
const schema = z.object({
  preferredLocation: z.string().trim().min(2).max(120),
  budgetMin: z.number().int().nonnegative(),
  budgetMax: z.number().int().positive(),
  moveInDate: z.coerce.date(),
  gender: z.string().trim().default("ANY"),
  genderPreference: z.string().trim().default("ANY"),
  smoking: z.boolean().default(false),
  pets: z.boolean().default(false),
  diet: z.string().trim().default("ANY"),
  sleepHabit: z.string().trim().default("ANY"),
  interests: z.array(z.string()).default([])
}).refine(v => v.budgetMax >= v.budgetMin, { message: "Maximum budget must be at least minimum budget", path: ["budgetMax"] });

profileRouter.get("/", asyncRoute(async (req, res) => res.json(await db.tenantProfile.findUnique({ where: { userId: req.user!.id } }))));
profileRouter.put("/", asyncRoute(async (req, res) => {
  const input = schema.parse(req.body);
  const profile = await db.$transaction(async tx => {
    const saved = await tx.tenantProfile.upsert({ where: { userId: req.user!.id }, create: { userId: req.user!.id, ...input }, update: input });
    await tx.match.deleteMany({ where: { tenantId: req.user!.id } });
    return saved;
  });
  res.json(profile);
}));

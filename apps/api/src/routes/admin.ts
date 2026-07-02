import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { asyncRoute, HttpError } from "../lib/http.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole(Role.ADMIN));
adminRouter.get("/users", asyncRoute(async (_req, res) => res.json(await db.user.findMany({ select: { id: true, name: true, email: true, role: true, active: true, createdAt: true }, orderBy: { createdAt: "desc" } }))));
adminRouter.patch("/users/:id", asyncRoute(async (req, res) => {
  const { active } = z.object({ active: z.boolean() }).parse(req.body);
  const id = z.string().uuid().parse(req.params.id);
  if (id === req.user!.id && !active) throw new HttpError(400, "You cannot disable your own account");
  res.json(await db.user.update({ where: { id }, data: { active }, select: { id: true, active: true } }));
}));
adminRouter.get("/listings", asyncRoute(async (_req, res) => res.json(await db.listing.findMany({ include: { owner: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "desc" } }))));
adminRouter.delete("/listings/:id", asyncRoute(async (req, res) => { await db.listing.delete({ where: { id: z.string().uuid().parse(req.params.id) } }); res.status(204).end(); }));
adminRouter.get("/activity", asyncRoute(async (_req, res) => {
  const [users, listings, activeListings, interests, acceptedInterests, matches, messages] = await Promise.all([
    db.user.count(), db.listing.count(), db.listing.count({ where: { status: "ACTIVE" } }), db.interest.count(), db.interest.count({ where: { status: "ACCEPTED" } }), db.match.count(), db.message.count()
  ]);
  res.json({ users, listings, activeListings, interests, acceptedInterests, matches, messages });
}));

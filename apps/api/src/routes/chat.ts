import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { asyncRoute, HttpError } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";

export const chatRouter = Router();
chatRouter.use(requireAuth);
chatRouter.get("/:interestId/messages", asyncRoute(async (req, res) => {
  const query = z.object({ before: z.coerce.date().optional(), limit: z.coerce.number().int().min(1).max(100).default(50) }).parse(req.query);
  const interestId = z.string().uuid().parse(req.params.interestId);
  const interest = await db.interest.findUnique({ where: { id: interestId }, include: { listing: { select: { ownerId: true } } } });
  if (!interest || interest.status !== "ACCEPTED") throw new HttpError(404, "Accepted chat not found");
  if (![interest.tenantId, interest.listing.ownerId].includes(req.user!.id)) throw new HttpError(403, "Not a chat participant");
  const messages = await db.message.findMany({ where: { interestId: interest.id, createdAt: query.before ? { lt: query.before } : undefined }, include: { sender: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" }, take: query.limit });
  res.json(messages.reverse());
}));

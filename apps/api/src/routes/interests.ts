import { NotificationType, Prisma, Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { db } from "../db.js";
import { asyncRoute, HttpError } from "../lib/http.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { sendEmail } from "../services/mailer.js";
import { scoreListing } from "../services/scoring.js";

export const interestsRouter = Router();
interestsRouter.use(requireAuth);

async function notify(userId: string, type: NotificationType, payload: Record<string, unknown>, subject: string, text: string) {
  const notification = await db.notification.create({ data: { userId, type, payload: payload as Prisma.InputJsonValue } });
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  void sendEmail(user.email, subject, `${text}\n\nOpen Rent Finder: ${config.APP_URL}`).then(async emailSent => { if (emailSent) await db.notification.update({ where: { id: notification.id }, data: { emailSent: true } }); }).catch(error => console.error("Email failed", error));
}

interestsRouter.post("/", requireRole(Role.TENANT), asyncRoute(async (req, res) => {
  const { listingId } = z.object({ listingId: z.string().uuid() }).parse(req.body);
  const listing = await db.listing.findUnique({ where: { id: listingId }, include: { owner: true } });
  if (!listing || listing.status !== "ACTIVE") throw new HttpError(404, "Active listing not found");
  const match = await scoreListing(req.user!.id, listingId);
  let interest;
  try { interest = await db.interest.create({ data: { tenantId: req.user!.id, listingId } }); }
  catch { throw new HttpError(409, "Interest already sent"); }
  if (match.score > 80) await notify(listing.ownerId, "HIGH_MATCH_INTEREST", { listingId, interestId: interest.id, score: match.score }, "New high-compatibility tenant", `A tenant with a ${match.score}% compatibility score is interested in ${listing.title}.`);
  res.status(201).json(interest);
}));

interestsRouter.patch("/:id", requireRole(Role.OWNER), asyncRoute(async (req, res) => {
  const { status } = z.object({ status: z.enum(["ACCEPTED", "DECLINED"]) }).parse(req.body);
  const id = z.string().uuid().parse(req.params.id);
  const interest = await db.interest.findUnique({ where: { id }, include: { listing: true } });
  if (!interest) throw new HttpError(404, "Interest not found");
  if (interest.listing.ownerId !== req.user!.id) throw new HttpError(403, "Not your listing");
  if (interest.status !== "PENDING") throw new HttpError(409, "Interest has already been answered");
  const updated = await db.interest.update({ where: { id: interest.id }, data: { status, respondedAt: new Date() } });
  const type = status === "ACCEPTED" ? "INTEREST_ACCEPTED" : "INTEREST_DECLINED";
  await notify(interest.tenantId, type, { listingId: interest.listingId, interestId: interest.id }, `Interest ${status.toLowerCase()}`, `The owner has ${status.toLowerCase()} your interest in ${interest.listing.title}.`);
  res.json(updated);
}));

interestsRouter.get("/mine", asyncRoute(async (req, res) => {
  const where = req.user!.role === Role.TENANT ? { tenantId: req.user!.id } : req.user!.role === Role.OWNER ? { listing: { ownerId: req.user!.id } } : {};
  res.json(await db.interest.findMany({ where, include: { tenant: { select: { id: true, name: true, email: true } }, listing: true }, orderBy: { createdAt: "desc" } }));
}));

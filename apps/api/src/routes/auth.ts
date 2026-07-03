import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { asyncRoute, HttpError } from "../lib/http.js";
import { requireAuth, signToken } from "../middleware/auth.js";

export const authRouter = Router();
const credentials = z.object({ email: z.string().email().transform(v => v.toLowerCase()), password: z.string().min(8).max(72) });

authRouter.post("/register", asyncRoute(async (req, res) => {
  const input = credentials.extend({ name: z.string().trim().min(2).max(80), role: z.enum([Role.TENANT, Role.OWNER]) }).parse(req.body);
  if (await db.user.findUnique({ where: { email: input.email } })) throw new HttpError(409, "Email is already registered");
  const { password, ...account } = input;
  const user = await db.user.create({ data: { ...account, passwordHash: await bcrypt.hash(password, 12) }, select: { id: true, name: true, email: true, role: true } });
  res.status(201).json({ user, token: signToken({ id: user.id, role: user.role }) });
}));

authRouter.post("/login", asyncRoute(async (req, res) => {
  const input = credentials.parse(req.body);
  const user = await db.user.findUnique({ where: { email: input.email } });
  if (!user || !user.active || !(await bcrypt.compare(input.password, user.passwordHash))) throw new HttpError(401, "Invalid email or password");
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token: signToken({ id: user.id, role: user.role }) });
}));

authRouter.get("/me", requireAuth, asyncRoute(async (req, res) => {
  const user = await db.user.findUnique({ where: { id: req.user!.id }, select: { id: true, name: true, email: true, role: true, active: true } });
  if (!user?.active) throw new HttpError(401, "Account unavailable");
  res.json(user);
}));

authRouter.get("/notifications", requireAuth, asyncRoute(async (req, res) => {
  res.json(await db.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" } }));
}));


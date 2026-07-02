import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { HttpError } from "../lib/http.js";

export type AuthUser = { id: string; role: Role };

export function signToken(user: AuthUser) {
  return jwt.sign(user, config.JWT_SECRET, { expiresIn: "7d" });
}

export function parseToken(token: string): AuthUser {
  const payload = jwt.verify(token, config.JWT_SECRET);
  if (typeof payload !== "object" || typeof payload.id !== "string" || typeof payload.role !== "string") throw new Error("Invalid token payload");
  return { id: payload.id, role: payload.role as Role };
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return next(new HttpError(401, "Authentication required"));
  try { req.user = parseToken(token); return next(); }
  catch { return next(new HttpError(401, "Invalid or expired token")); }
}

export const requireRole = (...roles: Role[]) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new HttpError(403, "Insufficient permissions"));
  return next();
};

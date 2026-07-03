import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { z } from "zod";
import { config } from "./config.js";
import { db } from "./db.js";
import { parseToken, type AuthUser } from "./middleware/auth.js";

export function createSocketServer(server: HttpServer) {
  const origins = config.CORS_ORIGIN.split(",").map(o => o.trim());
  const corsOrigin = origins.includes("*") ? true : origins;
  const io = new Server(server, { cors: { origin: corsOrigin, credentials: true } });
  io.use((socket, next) => {
    try { socket.data.user = parseToken(z.string().parse(socket.handshake.auth.token)); next(); }
    catch { next(new Error("Authentication failed")); }
  });
  const authorize = async (interestId: string, user: AuthUser) => {
    const interest = await db.interest.findUnique({ where: { id: interestId }, include: { listing: { select: { ownerId: true } } } });
    return interest?.status === "ACCEPTED" && [interest.tenantId, interest.listing.ownerId].includes(user.id) ? interest : null;
  };
  io.on("connection", socket => {
    const user = socket.data.user as AuthUser;
    socket.on("join_room", async (raw, acknowledge) => {
      try { const { interestId } = z.object({ interestId: z.string().uuid() }).parse(raw); if (!await authorize(interestId, user)) throw new Error("Forbidden"); await socket.join(interestId); acknowledge?.({ ok: true }); }
      catch (error) { acknowledge?.({ ok: false, error: error instanceof Error ? error.message : "Invalid request" }); }
    });
    socket.on("send_message", async (raw, acknowledge) => {
      try {
        const input = z.object({ interestId: z.string().uuid(), content: z.string().trim().min(1).max(2000) }).parse(raw);
        if (!await authorize(input.interestId, user)) throw new Error("Forbidden");
        const message = await db.message.create({ data: { interestId: input.interestId, senderId: user.id, content: input.content }, include: { sender: { select: { id: true, name: true } } } });
        io.to(input.interestId).emit("message_received", message);
        acknowledge?.({ ok: true, message });
      } catch (error) { acknowledge?.({ ok: false, error: error instanceof Error ? error.message : "Invalid request" }); }
    });
  });
  return io;
}


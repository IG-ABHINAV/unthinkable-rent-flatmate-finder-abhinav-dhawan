import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { errorHandler } from "./lib/http.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { chatRouter } from "./routes/chat.js";
import { interestsRouter } from "./routes/interests.js";
import { listingsRouter } from "./routes/listings.js";
import { profileRouter } from "./routes/profile.js";

export const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = config.CORS_ORIGIN.split(",");
    if (allowed.includes("*") || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/listings", listingsRouter);
app.use("/api/interests", interestsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/admin", adminRouter);
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));
app.use(errorHandler);


import { createServer } from "node:http";
import { execSync } from "node:child_process";
import { app } from "./app.js";
import { config } from "./config.js";
import { db } from "./db.js";
import { createSocketServer } from "./socket.js";

async function start() {
  try {
    const listingCount = await db.listing.count();
    if (listingCount === 0) {
      console.log("No listings found. Seeding database automatically...");
      execSync("npx tsx apps/api/prisma/seed.ts", { stdio: "inherit" });
      console.log("Seeding complete.");
    } else {
      console.log(`Database has ${listingCount} listings. Skipping seeding.`);
    }
  } catch (error) {
    console.error("Database bootstrap check/seed failed:", error);
  }

  const server = createServer(app);
  createSocketServer(server);
  server.listen(config.PORT, "0.0.0.0", () => console.log(`API listening on ${config.PORT}`));

  async function shutdown() {
    server.close(async () => { await db.$disconnect(); process.exit(0); });
    setTimeout(() => process.exit(1), 10_000).unref();
  }
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start();

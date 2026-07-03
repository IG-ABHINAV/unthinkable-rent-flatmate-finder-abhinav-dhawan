import { createServer } from "node:http";
import { execSync } from "node:child_process";
import { app } from "./app.js";
import { config } from "./config.js";
import { db } from "./db.js";
import { createSocketServer } from "./socket.js";

async function start() {
  try {
    const userCount = await db.user.count();
    if (userCount === 0) {
      console.log("Database is empty. Seeding database automatically...");
      execSync("pnpm --filter @rent-finder/api prisma:seed", { stdio: "inherit" });
      console.log("Seeding complete.");
    } else {
      console.log(`Database has ${userCount} users. Skipping seeding.`);
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

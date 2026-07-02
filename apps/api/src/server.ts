import { createServer } from "node:http";
import { app } from "./app.js";
import { config } from "./config.js";
import { db } from "./db.js";
import { createSocketServer } from "./socket.js";

const server = createServer(app);
createSocketServer(server);
server.listen(config.PORT, "0.0.0.0", () => console.log(`API listening on ${config.PORT}`));

async function shutdown() {
  server.close(async () => { await db.$disconnect(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

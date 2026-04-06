// Background jobs worker for IPSAS demo

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is missing. Worker cannot start.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

async function runWorker() {
  console.log("Background worker started...");
  while (true) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 60000));
    } catch (error) {
      console.error("Worker error:", error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

runWorker().catch((err) => {
  console.error("Fatal worker error:", err);
  process.exit(1);
});

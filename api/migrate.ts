import path from "node:path";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { getDb } from "./queries/connection";
import { log } from "./lib/logger";

try {
  await migrate(getDb(), {
    migrationsFolder: path.resolve(process.cwd(), "db/migrations"),
  });
  log.info("Database migrations applied");
  process.exit(0);
} catch (error) {
  log.error("Database migration failed", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
}

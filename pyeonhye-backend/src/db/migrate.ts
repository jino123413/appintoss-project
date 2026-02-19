import path from "node:path";
import { db } from "./knex";

export async function runMigrations(): Promise<void> {
  const directory = path.resolve(process.cwd(), "migrations");
  await db.migrate.latest({ directory });
}

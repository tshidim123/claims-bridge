import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
export class DatabaseConfigurationError extends Error { constructor() { super("Database configuration is unavailable."); this.name = "DatabaseConfigurationError"; } }
export function getDb() { const url = process.env.DATABASE_URL; if (!url) throw new DatabaseConfigurationError(); return drizzle(neon(url), { schema }); }

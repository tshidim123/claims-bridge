import { defineConfig } from "drizzle-kit";
import { loadEnvConfig } from "@next/env";

// Preserve an explicitly supplied environment value (such as Vercel's) and
// load .env.local only as the normal local-development fallback.
loadEnvConfig(process.cwd(), true);

export default defineConfig({
  schema: "./src/lib/db/schema/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});

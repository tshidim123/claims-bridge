import "server-only";

import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { isDocumentReviewAvailable } from "@/lib/documents/service";

export type SystemStatus = {
  authentication: "Configured" | "Not configured";
  database: "Configured" | "Not configured";
  databaseReachability: "Available" | "Unavailable" | "Not checked";
  documentStorage: "Configured" | "Not configured";
  messaging: "Available";
  notifications: "Available";
  sms: "Configured" | "Not configured";
  push: "Configured" | "Not configured";
};

export async function getSystemStatus(): Promise<SystemStatus> {
  const database = Boolean(process.env.DATABASE_URL);
  let databaseReachability: SystemStatus["databaseReachability"] = database
    ? "Unavailable"
    : "Not checked";
  if (database) {
    try {
      await getDb().execute(sql`select 1`);
      databaseReachability = "Available";
    } catch {
      databaseReachability = "Unavailable";
    }
  }
  return {
    authentication:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY
        ? "Configured"
        : "Not configured",
    database: database ? "Configured" : "Not configured",
    databaseReachability,
    documentStorage: isDocumentReviewAvailable()
      ? "Configured"
      : "Not configured",
    messaging: "Available",
    notifications: "Available",
    sms: "Not configured",
    push: "Not configured",
  };
}

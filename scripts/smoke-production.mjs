import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), true);
const configured = process.env.NEXT_PUBLIC_SITE_URL;
if (!configured) {
  console.error("Production smoke test blocked: NEXT_PUBLIC_SITE_URL is not configured.");
  process.exit(1);
}
let origin;
try { origin = new URL(configured); } catch { console.error("Production smoke test blocked: NEXT_PUBLIC_SITE_URL is invalid."); process.exit(1); }
if (origin.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(origin.hostname)) { console.error("Production smoke test blocked: an HTTPS production origin is required."); process.exit(1); }

const publicPaths = ["/", "/robots.txt", "/sitemap.xml", "/how-it-works", "/contact"];
let failed = false;
for (const route of publicPaths) {
  try { const response = await fetch(new URL(route, origin), { redirect: "manual" }); const ok = response.status >= 200 && response.status < 400; console.log(`${route}: ${response.status} ${ok ? "ok" : "failed"}`); if (!ok) failed = true; } catch { console.log(`${route}: unavailable`); failed = true; }
}
try { const admin = await fetch(new URL("/admin", origin), { redirect: "manual" }); const protectedRoute = admin.status >= 300 && admin.status < 400; console.log(`/admin: ${admin.status} ${protectedRoute ? "protected" : "review required"}`); if (!protectedRoute) failed = true; } catch { console.log("/admin: unavailable"); failed = true; }
process.exitCode = failed ? 1 : 0;

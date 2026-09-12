import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const base = "http://127.0.0.1:3100";
const directory = "test-results/communications-qa";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = {
  templates: [],
  viewports: [],
  protectedRoutes: [],
  assessment: null,
};
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.goto(`${base}/dev/communications`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByRole("heading", { name: "Communications studio" })
    .waitFor({ timeout: 20000 });
  const events = await page
    .locator('select[name="event"] option')
    .evaluateAll((options) => options.map((option) => option.value));
  assert.equal(events.length, 23);
  for (const event of events) {
    await page.goto(`${base}/dev/communications?event=${event}&scenario=long`, {
      waitUntil: "domcontentloaded",
    });
    for (const width of [600, 390]) {
      await page
        .getByRole("button", {
          name: width === 600 ? "Desktop · 600px" : "Mobile · 390px",
        })
        .click();
      const frame = page.frameLocator("iframe");
      await frame.locator("body").waitFor();
      const size = await frame
        .locator("body")
        .evaluate((body) => ({
          scroll: body.scrollWidth,
          viewport: body.ownerDocument.documentElement.clientWidth,
        }));
      assert.ok(
        size.scroll <= size.viewport + 1,
        `${event} overflows at ${width}px`,
      );
    }
    await page.getByLabel("Block images").check();
    await page
      .frameLocator("iframe")
      .getByText("Claims Bridge", { exact: true })
      .first()
      .waitFor();
    await page.getByRole("button", { name: "Plain text", exact: true }).click();
    assert.ok(
      (await page.getByLabel("Plain-text email").innerText()).length > 80,
    );
    report.templates.push(event);
  }
  for (const [width, height] of [
    [390, 844],
    [430, 932],
    [768, 1024],
    [1024, 768],
    [1280, 720],
    [1366, 768],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${base}/dev/communications`, {
      waitUntil: "domcontentloaded",
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Preview page overflow at ${width}`,
    );
    if ([390, 1440].includes(width))
      await page.screenshot({ path: `${directory}/preview-${width}.png` });
    report.viewports.push(`${width}x${height}`);
  }
  for (const route of [
    "/admin/notifications",
    "/admin/preferences",
    "/admin/communications",
    "/admin/system",
  ]) {
    await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
    assert.equal(new URL(page.url()).pathname, "/sign-in");
    report.protectedRoutes.push(`${route}: signed-out access denied`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/check-eligibility`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "Start the initial check" }).click();
  const next = () =>
    page.getByRole("button", { name: "Continue", exact: true }).click();
  for (const answer of ["England", "Yes", "A letting agent"]) {
    await page.getByRole("radio", { name: answer, exact: true }).check();
    await next();
  }
  await next();
  await page.getByRole("radio", { name: "No", exact: true }).check();
  await next();
  await page.getByRole("button", { name: /see preliminary route/i }).click();
  await page.getByLabel("First name", { exact: false }).fill("Fabricated");
  await page.getByLabel("Surname", { exact: false }).fill("Communications QA");
  await page
    .getByLabel("Email address", { exact: false })
    .fill("communications-qa@example.invalid");
  await page.getByRole("checkbox", { name: /save and follow up/i }).check();
  await page
    .getByRole("button", { name: /Save assessment & view my result/ })
    .click();
  await page
    .getByRole("heading", { name: "Assessment completed", exact: true })
    .waitFor({ timeout: 20000 });
  const reference = await page
    .getByText(/Assessment reference: CB-/)
    .innerText();
  assert.match(reference, /CB-ASM-[A-Z0-9]+/);
  await page
    .getByText("We’re sending your confirmation email.", { exact: true })
    .waitFor();
  const cta = page.getByRole("button", { name: "Start claim", exact: true });
  assert.equal(await cta.count(), 1);
  const bounds = await cta.boundingBox();
  assert.ok(
    bounds && bounds.y >= 0 && bounds.y + bounds.height <= 844,
    "Primary claim action is above the fold",
  );
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await page.screenshot({ path: `${directory}/eligibility-390.png` });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: `${directory}/eligibility-1440.png` });
  // Inspect the intended navigation without sending an auth continuation token to logs or artifacts.
  let continuation = false;
  await page.route("**/sign-up**", async (route) => {
    const destination = new URL(route.request().url());
    continuation =
      destination.pathname === "/sign-up" &&
      (destination.searchParams.get("redirect_url") ?? "").startsWith(
        "/account/onboarding?lead=",
      );
    await route.fulfill({
      contentType: "text/html",
      body: "<h1>Secure account continuation</h1>",
    });
  });
  await cta.click();
  await page.waitForURL("**/sign-up**");
  assert.equal(continuation, true);
  report.assessment = {
    reference,
    receipt: "Queued",
    startClaim: "Secure sign-up continuation; no automatic claim creation",
    fixture: "One fabricated Development assessment retained for review",
  };
  await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}

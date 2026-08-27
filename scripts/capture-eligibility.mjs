import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const outputDirectory = join(process.cwd(), "test-results", "eligibility-visual");
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch();

for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  const page = await browser.newPage({ viewport });
  await page.goto("http://127.0.0.1:3100/check-eligibility");
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Start the initial check" }).click();
  await page.getByRole("heading", { level: 2, name: "Where was the rented property?" }).waitFor();
  await page.waitForTimeout(650);
  await page.screenshot({
    path: join(outputDirectory, `workspace-${viewport.width}.png`),
    fullPage: false,
  });
  await page.close();
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  const page = await browser.newPage({ viewport });
  await page.goto("http://127.0.0.1:3100/check-eligibility");
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Start the initial check" }).click();
  for (const answer of ["England", "Yes", "A letting agent"]) {
    await page.getByRole("radio", { name: answer, exact: true }).check();
    await page.locator("form").getByRole("button", { name: "Continue" }).click();
  }
  await page.locator("form").getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: "No", exact: true }).check();
  await page.locator("form").getByRole("button", { name: "Review answers" }).click();
  await page.getByRole("heading", { level: 2, name: /accurate picture/i }).waitFor();
  await page.waitForTimeout(650);
  await page.screenshot({
    path: join(outputDirectory, `review-${viewport.width}.png`),
    fullPage: false,
  });
  await page.close();
}

await browser.close();

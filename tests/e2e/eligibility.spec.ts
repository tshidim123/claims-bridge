import { expect, test, type Page } from "@playwright/test";

async function start(page: Page) {
  await page.goto("/check-eligibility");
  await page.getByRole("button", { name: "Start the initial check" }).click();
}

async function next(page: Page) {
  await page.getByRole("button", { name: "Continue" }).click();
}

test("starts and validates the first question", async ({ page }) => {
  await start(page);
  await expect(page.getByRole("heading", { level: 2, name: "Where was the rented property?" })).toBeFocused();
  await next(page);
  await expect(page.getByRole("alert")).toContainText("Choose where the rented property was located.");
});

test("no-deposit path skips protection questions", async ({ page }) => {
  await start(page);
  await page.getByRole("radio", { name: "England" }).check(); await next(page);
  await page.getByRole("radio", { name: "Yes" }).check(); await next(page);
  await page.getByRole("radio", { name: "A letting agent" }).check(); await next(page); await next(page);
  await page.getByRole("radio", { name: "No", exact: true }).check(); await next(page);
  await expect(page.getByRole("heading", { level: 2, name: /how much was the deposit/i })).not.toBeVisible();
  await expect(page.getByText("Deposit protection", { exact: true })).not.toBeVisible();
});

test("answers can be changed with back navigation", async ({ page }) => {
  await start(page);
  await page.getByRole("radio", { name: "England" }).check(); await next(page);
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("radio", { name: "England" })).toBeChecked();
});

test("keyboard controls and evidence multi-choice work", async ({ page }) => {
  await start(page);
  const england = page.getByRole("radio", { name: "England" }); await england.focus(); await page.keyboard.press("Space");
  await expect(england).toBeChecked();
});

test("restart dialog cancels, closes on Escape, and restores trigger focus", async ({ page }) => {
  await start(page);
  await page.getByRole("radio", { name: "England" }).check();
  const trigger = page.getByRole("button", { name: "Restart" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Restart your assessment?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("radio", { name: "England" })).toBeChecked();
});

test("confirming restart clears answers and returns to the first question", async ({ page }) => {
  await start(page);
  await page.getByRole("radio", { name: "England" }).check();
  await page.getByRole("button", { name: "Restart" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Restart assessment" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Where was the rented property?" })).toBeFocused();
  await expect(page.getByRole("radio", { name: "England" })).not.toBeChecked();
});

test("review and preliminary result retain a readable action hierarchy across responsive viewports", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  for (const viewport of [{ width: 390, height: 844 }, { width: 430, height: 932 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await start(page);
    await page.getByRole("radio", { name: "England" }).check(); await next(page);
    await page.getByRole("radio", { name: "Yes" }).check(); await next(page);
    await page.getByRole("radio", { name: "A letting agent" }).check(); await next(page); await next(page);
    await page.getByRole("radio", { name: "No", exact: true }).check(); await next(page);
    await expect(page.getByRole("heading", { name: /review the picture/i })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("button", { name: /see preliminary route/i }).click();
    await expect(page.getByRole("heading", { name: /save your eligibility assessment/i })).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByLabel("Phone number")).toBeVisible();
    await expect(page.getByLabel(/may contact me about this enquiry/i)).toBeVisible();
    await expect(page.getByLabel(/marketing/i)).not.toBeChecked();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (viewport.width === 390 || viewport.width === 1440) await page.screenshot({ path: testInfo.outputPath(`phase-12e-contact-${viewport.width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

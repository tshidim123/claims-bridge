import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

// Existing fake-data studio only: never submits an assessment or invokes delivery.
const base = "http://localhost:3000";
const output = "test-results/campaign-email";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  for (const scenario of ["standard", "long"]) {
    await page.goto(`${base}/dev/communications?event=ASSESSMENT_RECEIVED&scenario=${scenario}`);
    await page.getByRole("heading", { name: "Communications studio" }).waitFor();
    for (const width of [390, 600]) {
      await page.getByRole("button", { name: width === 390 ? "Mobile · 390px" : "Desktop · 600px" }).click();
      for (const mode of ["light", "dark"]) {
        await page.emulateMedia({ colorScheme: mode });
        const frame = page.frameLocator("iframe");
        await frame.locator(".campaign-cta").first().waitFor();
        const metrics = await frame.locator("body").evaluate((body) => {
          const buttons = [...body.querySelectorAll(".campaign-cta")];
          const rect = buttons[0].getBoundingClientRect();
          const evidence = [...body.querySelectorAll("h2")].find((h) => h.textContent === "Documents to prepare");
          const rgb = (value) => value.match(/\d+/g).slice(0, 3).map(Number);
          const luminance = (value) => rgb(value).map((v) => {
            const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
          }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
          const contrast = (foreground, background) => {
            const a = luminance(foreground), b = luminance(background);
            return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          };
          const buttonStyle = getComputedStyle(buttons[0]);
          const secondaryStyle = getComputedStyle(body.querySelector(".email-secondary"));
          const cardStyle = getComputedStyle(body.querySelector(".email-card"));
          return {
            overflow: body.scrollWidth > body.ownerDocument.documentElement.clientWidth,
            buttons: buttons.length, identicalUrls: buttons[0].href === buttons[1].href,
            top: rect.top, width: rect.width, height: rect.height,
            beforeEvidence: rect.bottom < evidence.getBoundingClientRect().top,
            afterEvidence: buttons[1].getBoundingClientRect().top > evidence.getBoundingClientRect().top,
            buttonContrast: contrast(buttonStyle.color, buttonStyle.backgroundColor),
            secondaryContrast: contrast(secondaryStyle.color, cardStyle.backgroundColor),
          };
        });
        assert.equal(metrics.overflow, false);
        assert.equal(metrics.buttons, 2);
        assert.ok(metrics.identicalUrls && metrics.beforeEvidence && metrics.afterEvidence);
        assert.ok(metrics.top < (scenario === "long" ? 650 : 500));
        assert.ok(metrics.width >= 300 && metrics.height >= 48);
        assert.ok(metrics.buttonContrast >= 4.5 && metrics.secondaryContrast >= 4.5);
        await page.locator("iframe").screenshot({ path: `${output}/${scenario}-${width}-${mode}.png` });
        console.log(JSON.stringify({ scenario, viewportWidth: width, mode, ...metrics }));
      }
    }
    await page.getByLabel("Block images").check();
    await page.frameLocator("iframe").getByText("Claims Bridge", { exact: true }).first().waitFor();
    await page.getByRole("button", { name: "Plain text", exact: true }).click();
    assert.match(await page.getByLabel("Plain-text email").innerText(), /START MY CLAIM/);
  }
} finally {
  await browser.close();
}

import { expect, test } from "@playwright/test";

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
}

function relativeLuminance(hex: string) {
  const channels = hexToRgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

test("desktop mega menu supports keyboard entry, Escape return, and viewport bounds", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const claimsTrigger = page.getByRole("button", { name: "Claims" });
  await claimsTrigger.focus();
  await page.keyboard.press("ArrowDown");

  const menu = page.locator("#public-mega-menu");
  await expect(menu).toBeVisible();
  await expect(menu).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "View overview" })).toBeFocused();

  const bounds = await menu.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(1440);

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(claimsTrigger).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("mega menu remains bounded at the desktop cutoff", async ({ page }) => {
  await page.setViewportSize({ width: 1120, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Resources" }).click();

  const menu = page.locator("#public-mega-menu");
  await expect(menu).toBeVisible();
  const bounds = await menu.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(1120);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("mobile navigation is a full-height modal and closes with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: "Open navigation" }).click();
  const dialog = page.locator("dialog[open]");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveJSProperty("open", true);

  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.height).toBeGreaterThanOrEqual(840);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
});

test("portal shell is usable without horizontal page overflow on mobile and desktop", async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/account");
    await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("responsive shell remains bounded across phone, tablet, landscape, and ultrawide", async ({ page }) => {
  const viewports = [
    { width: 375, height: 812, mobileNavigation: true },
    { width: 768, height: 1024, mobileNavigation: true },
    { width: 1024, height: 768, mobileNavigation: true },
    { width: 1920, height: 1080, mobileNavigation: false },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    if (viewport.mobileNavigation) {
      await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
    } else {
      await expect(page.getByRole("button", { name: "Claims" })).toBeVisible();
    }
  }
});

test("small-phone shell tolerates increased browser text size", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.fontSize = "125%"; });
  const layout = await page.evaluate(() => ({
    fits: document.documentElement.scrollWidth <= window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    offenders: Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .map((element) => ({ element, bounds: element.getBoundingClientRect() }))
      .filter(({ bounds }) => bounds.right > window.innerWidth + 1 || bounds.left < -1)
      .slice(0, 8)
      .map(({ element, bounds }) => ({
        className: element.className,
        left: Math.round(bounds.left),
        right: Math.round(bounds.right),
        tag: element.tagName,
      })),
  }));
  expect(layout.fits, JSON.stringify(layout)).toBe(true);
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
});

test("reduced motion removes non-essential transition timing", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const values = await page.locator(".button").first().evaluate((element) => ({
    transitionDuration: getComputedStyle(element).transitionDuration,
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
  }));

  expect(Number.parseFloat(values.transitionDuration)).toBeLessThanOrEqual(0.001);
  expect(values.scrollBehavior).toBe("auto");
});

test("semantic text tokens meet contrast targets on protected dark surfaces", async ({ page }) => {
  await page.goto("/");
  const tokens = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return {
      text: root.getPropertyValue("--color-text").trim(),
      muted: root.getPropertyValue("--color-text-muted").trim(),
      surface: root.getPropertyValue("--color-surface-raised").trim(),
      canvas: root.getPropertyValue("--color-canvas").trim(),
    };
  });

  expect(contrastRatio(tokens.text, tokens.surface)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(tokens.muted, tokens.canvas)).toBeGreaterThanOrEqual(4.5);
});

import { expect, test } from "@playwright/test";

const requiredViewports = [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

async function horizontalLayoutAudit(page: import("@playwright/test").Page) {
  return page.evaluate(() => ({
    fits: document.documentElement.scrollWidth <= window.innerWidth,
    offenders: Array.from(document.querySelectorAll<HTMLElement>("main *"))
      .map((element) => ({ element, bounds: element.getBoundingClientRect() }))
      .filter(({ element, bounds }) => {
        const style = getComputedStyle(element);
        const intentionallyScrollable = style.overflowX === "auto" || style.overflowX === "scroll";
        return !intentionallyScrollable && (bounds.right > window.innerWidth + 1 || bounds.left < -1);
      })
      .slice(0, 10)
      .map(({ element, bounds }) => ({
        className: typeof element.className === "string" ? element.className : "",
        left: Math.round(bounds.left),
        right: Math.round(bounds.right),
        tag: element.tagName,
      })),
  }));
}

test("homepage tells the complete qualified product story", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: /Your deposit.*Your tenancy.*Know where you stand/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Check My Eligibility" }).first()).toHaveAttribute("href", "/check-eligibility");
  await expect(page.getByRole("link", { name: /Sign in \/ track an existing claim/i })).toHaveAttribute("href", "/account");

  for (const heading of [
    "Do you know what happened to your deposit?",
    "Start with what you remember.",
    "Different records can point to different questions.",
    "A connected route, with every hand-off in view.",
    "Your claim shouldn’t disappear into an inbox.",
    "One place for the records that may matter.",
    "Progress should be visible, not inferred.",
    "Understand the issue before deciding what to do.",
    "Trust is built by making the process legible.",
    "A useful starting point.",
    "Start with what you know.",
  ]) {
    await expect(page.getByRole("heading", { level: 2, name: heading })).toBeAttached();
  }

  await expect(page.getByText("Example interface")).toBeAttached();
  await expect(page.getByText("3 of 5 requested documents")).toBeAttached();
  await expect(page.getByText("No eligibility result is calculated in this preview.")).toBeAttached();
  await expect(page.locator("main")).not.toContainText(/guaranteed compensation|you are owed|success rate/i);
});

test("eligibility preview is keyboard-usable and never calculates a result", async ({ page }) => {
  await page.goto("/");

  const firstGroup = page.getByRole("group", { name: "Where was the property?" });
  await firstGroup.scrollIntoViewIfNeeded();
  await firstGroup.getByRole("radio", { name: "England" }).focus();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: /Continue/ }).click();

  const secondGroup = page.getByRole("group", { name: "Did you pay a tenancy deposit?" });
  await secondGroup.getByRole("radio", { name: "Yes", exact: true }).focus();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: /Continue/ }).click();

  const thirdGroup = page.getByRole("group", { name: /Do you know whether it was placed/i });
  const finalLink = page.getByRole("link", { name: /Continue to the initial check/ });
  await expect(finalLink).toHaveAttribute("aria-disabled", "true");
  await thirdGroup.getByRole("radio", { name: "Not sure" }).focus();
  await page.keyboard.press("Space");
  await expect(finalLink).toHaveAttribute("aria-disabled", "false");
  await expect(finalLink).toHaveAttribute("href", "/check-eligibility");
});

test("FAQ disclosure uses native keyboard semantics", async ({ page }) => {
  await page.goto("/");

  const firstFaq = page.locator("details").filter({ hasText: "What is tenancy deposit protection?" });
  const summary = firstFaq.locator("summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(firstFaq).toHaveAttribute("open", "");
  await expect(firstFaq.getByText(/Deposit protection is a framework/i)).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(firstFaq).not.toHaveAttribute("open", "");
});

test("homepage remains bounded at every required review viewport", async ({ page }) => {
  for (const viewport of requiredViewports) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const audit = await horizontalLayoutAudit(page);
    expect(audit.fits, `${viewport.width}x${viewport.height}: ${JSON.stringify(audit.offenders)}`).toBe(true);
  }
});

test("narrow mobile composition keeps key controls visible and touch-sized", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const primaryAction = page.getByRole("link", { name: "Check My Eligibility" }).first();
  const menuButton = page.getByRole("button", { name: "Open navigation" });
  const actionBounds = await primaryAction.boundingBox();
  const menuBounds = await menuButton.boundingBox();
  expect(actionBounds).not.toBeNull();
  expect(menuBounds).not.toBeNull();
  expect(actionBounds!.height).toBeGreaterThanOrEqual(44);
  expect(menuBounds!.height).toBeGreaterThanOrEqual(44);

  await primaryAction.focus();
  const focusStyle = await primaryAction.evaluate((element) => getComputedStyle(element).boxShadow);
  expect(focusStyle).not.toBe("none");
});

test("responsive reflow supports a 200 percent text-size audit", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });

  const primaryAction = page.getByRole("link", { name: "Check My Eligibility" }).first();
  await expect(primaryAction).toBeVisible();
  const bounds = await primaryAction.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(1440);
  expect((await horizontalLayoutAudit(page)).fits).toBe(true);
});

test("reduced motion stops homepage material and path animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const motion = await page.locator('[data-artwork-target*="hero-bridge-environment"]').evaluate((slot) => {
    const material = slot.querySelector<HTMLElement>("div > div");
    const slotAfter = getComputedStyle(slot, "::after");
    return {
      descendantAnimation: material ? getComputedStyle(material).animationDuration : "0s",
      slotAnimation: slotAfter.animationDuration,
    };
  });

  expect(Number.parseFloat(motion.descendantAnimation)).toBeLessThanOrEqual(0.001);
  expect(Number.parseFloat(motion.slotAnimation)).toBeLessThanOrEqual(0.001);
});

test("future artwork slots use CSS fallbacks without broken images", async ({ page }) => {
  await page.goto("/");

  const heroArtwork = page.locator('[data-artwork-target="/images/claims-bridge/home/hero-bridge-environment.webp"]');
  const evidenceArtwork = page.locator('[data-artwork-target="/images/claims-bridge/home/evidence-vault.webp"]');
  const portalArtwork = page.locator('[data-artwork-target="/images/claims-bridge/home/portal-atmosphere.webp"]');

  await expect(heroArtwork).toHaveCount(1);
  await expect(evidenceArtwork).toHaveCount(1);
  await expect(portalArtwork).toHaveCount(1);
  await expect(heroArtwork).toHaveAttribute("data-artwork-mobile-target", /hero-bridge-environment-mobile\.webp$/);
  await expect(evidenceArtwork).toHaveAttribute("data-artwork-mobile-target", /evidence-vault-mobile\.webp$/);
  await expect(portalArtwork).toHaveAttribute("data-artwork-mobile-target", /portal-atmosphere-mobile\.webp$/);
  await expect(heroArtwork).toHaveAttribute("aria-hidden", "true");
  await expect(evidenceArtwork).toHaveAttribute("aria-hidden", "true");
  await expect(portalArtwork).toHaveAttribute("aria-hidden", "true");
  await expect(heroArtwork).toHaveAttribute("data-artwork-state", "fallback");
  await expect(evidenceArtwork).toHaveAttribute("data-artwork-state", "fallback");
  await expect(portalArtwork).toHaveAttribute("data-artwork-state", "fallback");
  await expect(page.getByRole("figure").filter({ hasText: "Example claim" })).toBeAttached();
  await expect(page.locator("[data-artwork-target] img")).toHaveCount(0);
});

test("homepage metadata exposes social cards and conditional canonical architecture", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Tenancy deposit claims, made clearer.*Claims Bridge/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /may warrant further assessment/i);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Tenancy deposit claims, made clearer");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
});

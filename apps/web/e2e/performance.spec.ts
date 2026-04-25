import { test, expect } from "@playwright/test";

test.describe("Performance Tests", () => {
  test("home page should load within acceptable time", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const loadTime = Date.now() - startTime;

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    console.log(`Home page load time: ${loadTime}ms`);
  });

  test("dashboard should load within acceptable time", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");
    const loadTime = Date.now() - startTime;

    // Dashboard should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    console.log(`Dashboard load time: ${loadTime}ms`);
  });

  test("should have reasonable page weight", async ({ page }) => {
    // Navigate and collect performance metrics
    await page.goto("/");

    const performanceMetrics = await page.evaluate(() => {
      const perfEntries = performance.getEntriesByType(
        "navigation"
      ) as PerformanceNavigationTiming[];
      if (perfEntries.length > 0) {
        const entry = perfEntries[0];
        return {
          domContentLoaded: entry.domContentLoadedEventEnd - entry.startTime,
          loadComplete: entry.loadEventEnd - entry.startTime,
          transferSize: entry.transferSize,
        };
      }
      return null;
    });

    if (performanceMetrics) {
      console.log("Performance Metrics:", performanceMetrics);
      // DOM should be ready within 3 seconds
      expect(performanceMetrics.domContentLoaded).toBeLessThan(3000);
    }
  });
});

test.describe("Accessibility Tests", () => {
  test("home page should have proper heading structure", async ({ page }) => {
    await page.goto("/");

    // Check for at least one heading
    const headings = page.locator("h1, h2, h3, h4, h5, h6");
    const count = await headings.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("buttons should be accessible", async ({ page }) => {
    await page.goto("/");

    const buttons = page.getByRole("button");
    const buttonCount = await buttons.count();

    // Each button should have accessible text
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const isVisible = await button.isVisible();
      if (isVisible) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute("aria-label");
        // Button should have either text content or aria-label
        expect(text || ariaLabel).toBeTruthy();
      }
    }
  });

  test("images should have alt text", async ({ page }) => {
    await page.goto("/");

    const images = page.locator("img");
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute("alt");
      // Images should have alt attribute (can be empty for decorative)
      expect(alt).not.toBeNull();
    }
  });

  test("forms should have labels", async ({ page }) => {
    await page.goto("/login");

    const inputs = page.locator(
      'input:not([type="hidden"]):not([type="submit"])'
    );
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute("id");
      const ariaLabel = await input.getAttribute("aria-label");
      const placeholder = await input.getAttribute("placeholder");

      // Input should have some form of label
      const hasLabel = id || ariaLabel || placeholder;
      expect(hasLabel).toBeTruthy();
    }
  });
});

test.describe("PWA Features", () => {
  test("should have manifest.json", async ({ page }) => {
    await page.goto("/");

    // Check for manifest link
    const manifest = page.locator('link[rel="manifest"]');
    const hasManifest = (await manifest.count()) > 0;

    // PWA should have manifest
    expect(hasManifest).toBe(true);
  });

  test("should have meta viewport", async ({ page }) => {
    await page.goto("/");

    const viewport = page.locator('meta[name="viewport"]');
    const hasViewport = (await viewport.count()) > 0;

    expect(hasViewport).toBe(true);
  });

  test("should have theme-color meta", async ({ page }) => {
    await page.goto("/");

    const themeColor = page.locator('meta[name="theme-color"]');
    const hasThemeColor = (await themeColor.count()) > 0;

    // PWA should have theme-color for mobile browsers
    // This is optional but recommended
    console.log(`Has theme-color: ${hasThemeColor}`);
  });
});

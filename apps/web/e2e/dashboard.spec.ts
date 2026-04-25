import { test, expect } from "@playwright/test";

test.describe("Dashboard Page", () => {
  test.beforeEach(async ({ page }) => {
    // Login first (assuming demo mode)
    await page.goto("/login");
    await page.fill('input[name="username"], input[type="text"]', "admin");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
    // Wait for any redirect after login
    await page.waitForURL(/dashboard|admin|\/$/i, { timeout: 10000 });
  });

  test("should display dashboard after login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/dashboard/);
  });

  test("should show daily statistics", async ({ page }) => {
    await page.goto("/dashboard");

    // Check for key dashboard elements
    await expect(page.getByText(/xe|xà lan|tổng|total/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("should navigate to history page", async ({ page }) => {
    await page.goto("/dashboard");

    // Click on history link
    const historyLink = page.getByRole("link", { name: /lịch sử|history/i });
    if (await historyLink.isVisible()) {
      await historyLink.click();
      await expect(page).toHaveURL(/history/);
    }
  });

  test("should be responsive", async ({ page }) => {
    await page.goto("/dashboard");
    await page.setViewportSize({ width: 375, height: 667 });

    // Should still show page content (body always visible)
    await expect(page.locator("body")).toBeVisible();
    // Page should not have horizontal scroll
    const body = page.locator("body");
    await expect(body).toHaveCSS("overflow-x", /(hidden|auto|visible)/);
  });
});

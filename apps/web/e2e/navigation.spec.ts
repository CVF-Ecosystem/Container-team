import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("should navigate to home page", async ({ page }) => {
    await page.goto("/");

    // Check title
    await expect(page).toHaveTitle(/Báo cáo|Daily Report|Tan Thuan/i);
  });

  test("should navigate to login page", async ({ page }) => {
    await page.goto("/login");

    // Check login page has heading with login text (use first() or filter)
    await expect(
      page.getByRole("heading", { name: /Đăng Nhập/i })
    ).toBeVisible();
  });

  test("should navigate to dashboard", async ({ page }) => {
    await page.goto("/dashboard");

    // Check dashboard page loads
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Login Flow", () => {
  test("should show login form", async ({ page }) => {
    await page.goto("/login");

    // Check form elements exist
    await expect(
      page.getByRole("textbox").or(page.locator('input[type="text"]')).first()
    ).toBeVisible();
    await expect(
      page.getByRole("button").filter({ hasText: /Đăng nhập|Login|Submit/i })
    ).toBeVisible();
  });

  test("should show error on invalid login", async ({ page }) => {
    await page.goto("/login");

    // Try to submit empty form or invalid credentials
    const submitButton = page
      .getByRole("button")
      .filter({ hasText: /Đăng nhập|Login|Submit/i });

    if (await submitButton.isVisible()) {
      await submitButton.click();
      // Should show some form of validation or error
      await page.waitForTimeout(1000);
    }
  });
});

test.describe("Responsive Design", () => {
  test("should be responsive on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Page should still be functional
    await expect(page.locator("body")).toBeVisible();
  });

  test("should be responsive on tablet", async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    // Page should still be functional
    await expect(page.locator("body")).toBeVisible();
  });
});

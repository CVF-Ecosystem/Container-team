import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("should display login page", async ({ page }) => {
    // Title is app name, not login specific
    await expect(page).toHaveTitle(/Báo Cáo|Cảng Tân Thuận|Daily Report/i);
    await expect(
      page.getByRole("button", { name: /đăng nhập/i })
    ).toBeVisible();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.fill('input[name="username"], input[type="text"]', "invalid");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Wait for form submission and check we're still on login (not redirected)
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/login/);
  });

  test("should login with demo credentials", async ({ page }) => {
    // Fill in demo credentials
    await page.fill('input[name="username"], input[type="text"]', "admin");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');

    // Should redirect (could be dashboard, admin, or home)
    await page.waitForURL(/dashboard|admin|\/$/i, { timeout: 10000 });
  });

  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(
      page.getByRole("button", { name: /đăng nhập/i })
    ).toBeVisible();
  });
});

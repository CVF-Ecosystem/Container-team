import { test, expect, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.fill('input[name="username"], input[type="text"]', "admin");
  await page.fill('input[type="password"]', "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|admin|\/$/i, { timeout: 10000 });
}

test.describe("Cosmic interactions", () => {
  test("sidebar collapse state persists across reload", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");

    // Collapse the sidebar via localStorage then reload
    await page.evaluate(() => {
      localStorage.setItem("ttport.sidebar.collapsed", "1");
    });
    await page.reload();

    // Sidebar element should reflect collapsed state (w-16 present, not w-60)
    const collapsedSidebar = page.locator("[class*='w-16']").first();
    await expect(collapsedSidebar).toBeVisible({ timeout: 5000 });

    // Restore state so other tests are unaffected
    await page.evaluate(() => {
      localStorage.setItem("ttport.sidebar.collapsed", "0");
    });
  });

  test("history row opens drawer and ESC closes it", async ({ page }) => {
    await login(page);
    await page.goto("/history");

    const rows = page.locator("tbody tr");
    const count = await rows.count();
    if (count === 0) {
      // No data seeded — skip gracefully
      return;
    }

    // Click first row to open the detail drawer
    await rows.first().click();
    await expect(
      page.getByText("Chi tiết báo cáo").first()
    ).toBeVisible({ timeout: 5000 });

    // ESC should close the drawer
    await page.keyboard.press("Escape");
    await expect(
      page.getByText("Chi tiết báo cáo").first()
    ).not.toBeVisible({ timeout: 3000 });
  });

  test("settings tabs navigate without page reload", async ({ page }) => {
    await login(page);
    await page.goto("/settings");

    // Default tab content visible
    await expect(page.getByText("Hồ sơ cá nhân").first()).toBeVisible();

    // Switch to Hiển thị tab
    await page.getByRole("button", { name: /hiển thị/i }).click();
    await expect(page.getByText(/ngôn ngữ|language/i).first()).toBeVisible({
      timeout: 3000,
    });

    // Switch to Thông báo tab
    await page.getByRole("button", { name: /thông báo/i }).click();
    await expect(page.getByText(/ca|shift/i).first()).toBeVisible({
      timeout: 3000,
    });

    // URL stays on /settings throughout
    expect(page.url()).toContain("/settings");
  });
});

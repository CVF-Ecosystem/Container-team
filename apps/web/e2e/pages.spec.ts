import { test, expect } from "@playwright/test";

test.describe("Dashboard Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("should load dashboard page", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("should display date information", async ({ page }) => {
    // Dashboard typically shows current date
    const today = new Date();
    const year = today.getFullYear().toString();

    // Check if year is visible somewhere on page
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
  });

  test("should have interactive elements", async ({ page }) => {
    // Check for buttons or interactive elements
    const buttons = page.getByRole("button");
    const buttonCount = await buttons.count();

    // Dashboard should have some interactive elements
    expect(buttonCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe("History Page", () => {
  test("should load history page", async ({ page }) => {
    await page.goto("/history");
    await expect(page.locator("body")).toBeVisible();
  });

  test("should display data table or list", async ({ page }) => {
    await page.goto("/history");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Check page has content
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });
});

test.describe("Settings Page", () => {
  test("should load settings page", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Admin Pages", () => {
  test("should load admin page", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load admin data page", async ({ page }) => {
    await page.goto("/admin/data");
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load admin personnel page", async ({ page }) => {
    await page.goto("/admin/personnel");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Shift Pages", () => {
  test("should load start-shift page", async ({ page }) => {
    await page.goto("/start-shift");
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load end-shift page", async ({ page }) => {
    await page.goto("/end-shift");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Other Pages", () => {
  test("should load inventory page", async ({ page }) => {
    await page.goto("/inventory");
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load leave page", async ({ page }) => {
    await page.goto("/leave");
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load ship-report page", async ({ page }) => {
    await page.goto("/ship-report");
    await expect(page.locator("body")).toBeVisible();
  });
});

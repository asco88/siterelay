import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders the hero headline", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Your home server");
  });

  test("nav shows Sign In when logged out", async ({ page }) => {
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("logo is visible in nav", async ({ page }) => {
    const logo = page.getByRole("img", { name: /siterelay/i });
    await expect(logo).toBeVisible();
  });

  test("CTA buttons are visible in hero section", async ({ page }) => {
    // scope to hero — first instance of the button
    await expect(page.getByRole("button", { name: /get started free/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /view on github/i }).first()).toBeVisible();
  });

  test("features section has all key cards", async ({ page }) => {
    await page.getByText("Everything you need").scrollIntoViewIfNeeded();
    await expect(page.getByText("Real-time sync")).toBeVisible();
    await expect(page.getByText("Home Assistant native")).toBeVisible();
    await expect(page.getByText("Privacy first")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Open source" })).toBeVisible();
  });

  test("how-it-works section has all 4 steps", async ({ page }) => {
    await expect(page.getByText("Sign up with Google")).toBeVisible();
    await expect(page.getByText("Add an integration")).toBeVisible();
    await expect(page.getByText("Install on your server")).toBeVisible();
    await expect(page.getByText("Watch it go live")).toBeVisible();
  });

  test("footer is present", async ({ page }) => {
    await expect(page.locator("footer")).toBeVisible();
    await expect(page.locator("footer").getByText("MIT License")).toBeVisible();
  });

  // Visual snapshot — update with: npm run test:e2e:update
  test("landing page visual snapshot", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("landing-desktop.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});

test.describe("Landing page — mobile", () => {
  test("hero is readable on mobile", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /get started free/i }).first()).toBeVisible();
  });
});

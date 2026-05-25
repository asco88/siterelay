import { test, expect } from "@playwright/test";

test.describe("Auth flows", () => {
  test("visiting /dashboard redirects to /login when unauthenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("visiting /onboarding redirects to /login when unauthenticated", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page shows Google sign-in button", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /sign in with google/i })).toBeVisible();
  });

  test("login page visual snapshot", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("login.png", {
      maxDiffPixelRatio: 0.02,
    });
  });
});

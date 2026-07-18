import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const user = {
  about: null,
  base_currency: "USD",
  base_currency_changed_at: null,
  created_at: "2026-07-15T00:00:00Z",
  email: "mobile@example.com",
  full_name: "Mobile User",
  home_balance_source_id: null,
  home_balance_source_type: null,
  id: "11111111-1111-1111-1111-111111111111",
  is_active: true,
  occupation: null,
  phone_number: null,
};

test("offers email, Google, and GitHub authentication", async ({ page }) => {
  await page.route("**/api/auth/email-route", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { destination: "login" },
      status: 200,
    });
  });
  await page.goto("/auth?next=/analytics");

  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeVisible();
  await expect(page.getByText("Facebook", { exact: false })).toHaveCount(0);

  await page.getByLabel("Email address").fill("mobile@example.com");
  await page.getByRole("button", { name: "Continue with email" }).click();
  await expect(page).toHaveURL(
    /\/auth\/login\?email=mobile%40example\.com&next=%2Fanalytics$/,
  );
  await expect(page.getByLabel("Email address")).toHaveValue("mobile@example.com");
});

test("routes an unknown email to registration with the email prefilled", async ({ page }) => {
  await page.route("**/api/auth/email-route", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { destination: "register" },
      status: 200,
    });
  });
  await page.goto("/auth");

  await page.getByLabel("Email address").fill("new-user@example.com");
  await page.getByRole("button", { name: "Continue with email" }).click();

  await expect(page).toHaveURL(
    /\/auth\/register\?email=new-user%40example\.com$/,
  );
  await expect(page.getByLabel("Email address")).toHaveValue(
    "new-user@example.com",
  );
});

test("moves an OAuth registration ticket into the explicit account form", async ({ page }) => {
  await page.route("**/api/auth/oauth/preview", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        email: "oauth@example.com",
        full_name: "OAuth User",
        provider: "github",
      },
      status: 200,
    });
  });

  await page.goto(`/auth/oauth/callback#registration_ticket=${"t".repeat(64)}`);
  await expect(page).toHaveURL(/\/auth\/register\?oauth=1$/);
  await expect(page.getByLabel("Full name")).toHaveValue("OAuth User");
  await expect(page.getByLabel("Email address")).toHaveValue("oauth@example.com");
  await expect(page.getByLabel("Email address")).toHaveAttribute("readonly", "");
  await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
});

test("validates login details before submission", async ({ page }) => {
  await page.goto("/auth/login");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Enter a valid email address")).toBeVisible();
  await expect(page.getByText("Enter your password")).toBeVisible();
});

test("signs in and returns to the requested protected page", async ({ page }) => {
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({ contentType: "application/json", json: { user }, status: 200 });
  });
  await page.goto("/auth/login?next=/analytics");
  await page.getByLabel("Email address").fill("mobile@example.com");
  await page.getByLabel("Password", { exact: true }).fill("CorrectHorse42");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/analytics$/);
  await expect(
    page.getByRole("heading", { exact: true, name: "Analytics" }),
  ).toBeVisible();
});

test("validates matching registration passwords", async ({ page }) => {
  await page.goto("/auth/register");
  await page.getByLabel("Full name").fill("Mobile User");
  await page.getByLabel("Email address").fill("mobile@example.com");
  await page.getByLabel("Password", { exact: true }).fill("CorrectHorse42");
  await page.getByLabel("Confirm password").fill("DifferentHorse42");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Passwords do not match")).toBeVisible();
});

test("creates an account and opens the guided setup", async ({ page }) => {
  await page.route("**/api/auth/register", async (route) => {
    await route.fulfill({ contentType: "application/json", json: { user }, status: 201 });
  });
  await page.route("**/api/backend/users/me", async (route) => route.fulfill({ contentType: "application/json", json: user }));
  await page.route("**/api/backend/accounts?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [], next_cursor: null } }));
  await page.goto("/auth/register");
  await page.getByLabel("Full name").fill("Mobile User");
  await page.getByLabel("Email address").fill("mobile@example.com");
  await page.getByLabel("Password", { exact: true }).fill("CorrectHorse42");
  await page.getByLabel("Confirm password").fill("CorrectHorse42");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/setup$/);
  await expect(page.getByRole("heading", { name: "Set up your money" })).toBeVisible();
});

test("auth screens have no detectable accessibility violations", async ({ page }) => {
  for (const route of [
    "/auth",
    "/auth/login",
    "/auth/register",
    "/auth/oauth/callback?error=callback_failed",
  ]) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, `accessibility at ${route}`).toEqual([]);
  }
});

import { expect, request as playwrightRequest, test } from "@playwright/test";

const appBaseUrl = process.env.E2E_APP_BASE_URL;
const apiBaseUrl = process.env.E2E_API_BASE_URL;

if (!appBaseUrl || !apiBaseUrl) {
  throw new Error("E2E_APP_BASE_URL and E2E_API_BASE_URL are required.");
}

const authenticatedRoutes = [
  "/",
  "/analytics",
  "/transaction",
  "/accounts",
  "/loan",
  "/budget",
  "/savings",
  "/settings",
];

test("authenticated routes use the shell foundation while auth remains public", async ({
  page,
}) => {
  await page.goto("/auth/login");
  await expect(page.locator('[data-shell="authenticated"]')).toHaveCount(0);
  await expect(page.locator("main")).toBeVisible();

  const api = await playwrightRequest.newContext({
    baseURL: apiBaseUrl,
    extraHTTPHeaders: {
      "Content-Type": "application/json",
    },
  });
  const email = `pfm-shell-${Date.now()}@example.test`;
  const password = "StrongPass123!";

  await api.post("/api/v1/auth/register", {
    data: {
      email,
      name: "Shell User",
      password,
      phone_number: "5550100",
    },
  });
  const loginResponse = await api.post("/api/v1/auth/login", {
    data: { email, password },
  });
  expect(loginResponse.ok()).toBeTruthy();
  await api.dispose();

  await page.goto("/auth/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/`);

  for (const route of authenticatedRoutes) {
    await page.goto(route);
    await expect(page.locator('[data-shell="authenticated"]')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('[data-shell-region="main"]')).toBeVisible();
    await expect(
      page.locator('[data-content-mode="legacy-constrained"]'),
    ).toBeVisible();

    const hasNoHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    );
    expect(hasNoHorizontalOverflow).toBe(true);
  }

  await page.evaluate(() => {
    window.localStorage.setItem("pfm.ui.theme", "dark");
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator('[data-shell="authenticated"]')).toBeVisible();

  await page.evaluate(() => {
    window.localStorage.setItem("pfm.ui.theme", "light");
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

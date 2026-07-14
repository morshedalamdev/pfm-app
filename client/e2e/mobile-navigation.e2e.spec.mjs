import { expect, request as playwrightRequest, test } from "@playwright/test";

const appBaseUrl = process.env.E2E_APP_BASE_URL;
const apiBaseUrl = process.env.E2E_API_BASE_URL;

if (!appBaseUrl || !apiBaseUrl) {
  throw new Error("E2E_APP_BASE_URL and E2E_API_BASE_URL are required.");
}

test("mobile bottom navigation exposes add plan more menus and safe routes", async ({
  page,
}) => {
  const api = await playwrightRequest.newContext({
    baseURL: apiBaseUrl,
    extraHTTPHeaders: {
      "Content-Type": "application/json",
    },
  });
  const email = `pfm-mobile-nav-${Date.now()}@example.test`;
  const password = "StrongPass123!";

  await api.post("/api/v1/auth/register", {
    data: {
      email,
      name: "Mobile Nav User",
      password,
      phone_number: "5550102",
    },
  });
  await api.dispose();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/auth/login");
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toHaveCount(0);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/`);

  const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Home" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await navigation.getByRole("link", { name: "Reports" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/analytics`);
  await expect(navigation.getByRole("link", { name: "Reports" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  const addTrigger = page.getByRole("button", { name: "Open add menu" });
  await addTrigger.click();
  await expect(page.getByRole("menuitem", { name: "Add Transaction" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(addTrigger).toBeFocused();
  await addTrigger.click();
  await page.getByRole("menuitem", { name: "Add Account" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/accounts/create`);
  await expect(navigation).toHaveCount(0);

  await page.goto("/budget");
  const planTrigger = page.getByRole("button", { name: "Open plan menu" });
  await planTrigger.click();
  await expect(page.getByRole("menuitem", { name: "Budget Setup" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(planTrigger).toBeFocused();
  await planTrigger.click();
  await page.getByRole("menuitem", { name: "Savings Goals" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/savings`);

  await page.getByRole("button", { name: "Open more menu" }).click();
  await expect(page.getByRole("menuitem", { name: "Accounts" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Profile" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Reset Password" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Delete Account" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Contact Us" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/settings`);

  await page.evaluate(() => {
    window.localStorage.setItem("pfm.ui.theme", "dark");
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(navigation).toBeVisible();

  const viewportBottom = await navigation.evaluate(
    (element) => Math.round(element.getBoundingClientRect().bottom),
  );
  expect(viewportBottom).toBeLessThanOrEqual(844);

  await page.getByRole("button", { name: "Open more menu" }).click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/auth/login`);
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toHaveCount(0);
});

import { expect, request as playwrightRequest, test } from "@playwright/test";

const appBaseUrl = process.env.E2E_APP_BASE_URL;
const apiBaseUrl = process.env.E2E_API_BASE_URL;

if (!appBaseUrl || !apiBaseUrl) {
  throw new Error("E2E_APP_BASE_URL and E2E_API_BASE_URL are required.");
}

test("desktop and tablet shell navigation exposes route metadata and account actions", async ({
  page,
}) => {
  const api = await playwrightRequest.newContext({
    baseURL: apiBaseUrl,
    extraHTTPHeaders: {
      "Content-Type": "application/json",
    },
  });
  const email = `pfm-shell-nav-${Date.now()}@example.test`;
  const password = "StrongPass123!";

  await api.post("/api/v1/auth/register", {
    data: {
      email,
      name: "Shell Nav User",
      password,
      phone_number: "5550101",
    },
  });
  await api.dispose();

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/auth/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/`);

  const sidebar = page.getByRole("complementary", {
    name: "Primary navigation",
  });
  await expect(sidebar).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Overview", level: 1 }),
  ).toBeVisible();

  await sidebar.getByRole("link", { name: "Transactions" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/transaction`);
  const transactionsLink = sidebar.getByRole("link", { name: "Transactions" });
  await expect(transactionsLink).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("heading", { name: "Transactions", level: 1 }),
  ).toBeVisible();

  await page.goto("/transaction/create");
  await expect(transactionsLink).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("heading", { name: "Add Transaction", level: 1 }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to Transactions" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/transaction`);

  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/budget/setup");
  const budgetSetupLink = sidebar.getByRole("link", { name: "Budget Setup" });
  await expect(budgetSetupLink).toBeVisible();
  await expect(budgetSetupLink).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("heading", { name: "Budget Setup", level: 1 }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Open account menu" }).click();
  await expect(page.getByRole("menuitem", { name: "Profile" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Settings" })).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Reset Password" }),
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Delete Account" }),
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "What is Infiny PFM" }),
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Privacy Notice" }),
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "User Agreement" }),
  ).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Contact Us" })).toBeVisible();

  await page.getByRole("menuitem", { name: "Logout" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/auth/login`);
});

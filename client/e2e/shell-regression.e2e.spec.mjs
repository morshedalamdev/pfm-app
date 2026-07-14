import { expect, request as playwrightRequest, test } from "@playwright/test";

const appBaseUrl = process.env.E2E_APP_BASE_URL;
const apiBaseUrl = process.env.E2E_API_BASE_URL;

if (!appBaseUrl || !apiBaseUrl) {
  throw new Error("E2E_APP_BASE_URL and E2E_API_BASE_URL are required.");
}

const viewports = [
  { width: 320, height: 720 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

const zoomLevels = [1, 1.25, 1.5, 2];
const themeModes = ["system", "light", "dark"];

test("shell navigation regression matrix remains accessible and responsive", async ({
  page,
}) => {
  const { email, password } = await registerUser();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/auth/login");
  await expect(page.locator('[data-shell="authenticated"]')).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toHaveCount(0);

  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/`);

  for (const theme of themeModes) {
    await page.evaluate((nextTheme) => {
      if (nextTheme === "system") {
        window.localStorage.removeItem("pfm.ui.theme");
      } else {
        window.localStorage.setItem("pfm.ui.theme", nextTheme);
      }
    }, theme);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      theme === "dark" ? "dark" : "light",
    );
  }

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);
    await expect(page.locator('[data-shell="authenticated"]')).toBeVisible();

    const hasNoHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    );
    expect(hasNoHorizontalOverflow).toBe(true);

    if (viewport.width < 768) {
      await expect(page.getByText(/available balance/i)).toBeVisible({
        timeout: 15_000,
      });
      const mobileNavigation = page.getByRole("navigation", {
        name: "Mobile navigation",
      });
      await expect(mobileNavigation).toBeVisible({ timeout: 15_000 });
      const navBottom = await mobileNavigation.evaluate((element) =>
        Math.round(element.getBoundingClientRect().bottom),
      );
      expect(navBottom).toBeLessThanOrEqual(viewport.height);
    } else {
      await expect(
        page.getByRole("complementary", { name: "Primary navigation" }),
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        page.locator('[data-shell-region="top-bar"]'),
      ).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    }
  }

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  for (const zoom of zoomLevels) {
    await setPageScale(page, zoom);
    await page.waitForTimeout(100);
    await expect(page.locator('[data-shell-region="main"]')).toBeVisible();
    const hasNoHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 2,
    );
    expect(hasNoHorizontalOverflow).toBe(true);
  }
});

async function registerUser() {
  const api = await playwrightRequest.newContext({
    baseURL: apiBaseUrl,
    extraHTTPHeaders: {
      "Content-Type": "application/json",
    },
  });
  const email = `pfm-shell-regression-${Date.now()}@example.test`;
  const password = "StrongPass123!";

  await api.post("/api/v1/auth/register", {
    data: {
      email,
      name: "Shell Regression User",
      password,
      phone_number: "5550103",
    },
  });
  await api.dispose();

  return { email, password };
}

async function setPageScale(page, pageScaleFactor) {
  const cdpSession = await page.context().newCDPSession(page);
  await cdpSession.send("Emulation.setPageScaleFactor", { pageScaleFactor });
  await cdpSession.detach();
}

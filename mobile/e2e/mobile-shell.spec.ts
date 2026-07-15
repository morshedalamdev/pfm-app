import { expect, test } from "@playwright/test";

test("loads inside the mobile canvas without horizontal overflow", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Mobile foundation ready" }),
  ).toBeVisible();

  const layout = await page.evaluate(() => {
    const app = document.querySelector<HTMLElement>("[data-testid='mobile-app']");

    return {
      appWidth: app?.getBoundingClientRect().width ?? 0,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  expect(layout.appWidth).toBeLessThanOrEqual(480);
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
});

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function openFreshLoginPage(page: Page) {
  await page.context().clearCookies();
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto('/login');
}

async function requestMockCode(page: Page, email: string) {
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole('button', { name: '发送验证码' }).click();

  const devCodeText = page.getByText(/当前开发验证码：\s*\d{6}/);
  await expect(devCodeText).toBeVisible();

  const matchedCode = (await devCodeText.textContent())?.match(/(\d{6})/)?.[1];
  expect(matchedCode).toBeTruthy();
  return matchedCode!;
}

async function completeLogin(page: Page, email: string) {
  const code = await requestMockCode(page, email);
  await page.locator('input[name="code"]').fill(code);
  await page.getByRole('button', { name: '登录并继续' }).click();
}

test('匿名用户可以打开登录页并看到核心表单', async ({ page }) => {
  await openFreshLoginPage(page);

  await expect(page.getByRole('heading', { name: '邮箱登录' })).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="code"]')).toBeVisible();
  await expect(page.getByRole('button', { name: '发送验证码' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '登录并继续' })).toBeDisabled();
});

test('mock 发码时会在登录页显示验证码，未建档账号会进入 onboarding', async ({ page }) => {
  await openFreshLoginPage(page);

  await completeLogin(page, `new-user+${Date.now()}@example.com`);

  await page.waitForURL(/\/onboarding$/);
  await expect(page).toHaveURL(/\/onboarding$/);
});

test('已建档账号再次登录后会直接进入 today', async ({ page }) => {
  const email = `existing-user+${Date.now()}@example.com`;

  await openFreshLoginPage(page);
  await completeLogin(page, email);
  await page.waitForURL(/\/onboarding$/);

  await page.getByRole('button', { name: '下一步' }).click();
  await page.getByRole('button', { name: '下一步' }).click();
  await page.getByRole('button', { name: '完成建档并生成今日计划' }).click();

  await page.waitForURL(/\/today$/);
  await expect(page).toHaveURL(/\/today$/);

  await page.context().clearCookies();
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto('/login');
  await completeLogin(page, email);

  await page.waitForURL(/\/today$/);
  await expect(page).toHaveURL(/\/today$/);
});

import { expect, test, type Page } from '@playwright/test';

const session = {
  user: { email: 'browser@local.invalid' },
  account: { id: 'acct_browser', planType: 'plus' },
  accessToken:
    'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImJyb3dzZXJAbG9jYWwuaW52YWxpZCIsImV4cCI6MTg5MzQ1NjAwMCwiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS9hdXRoIjp7ImNoYXRncHRfYWNjb3VudF9pZCI6ImFjY3RfYnJvd3NlciIsImNoYXRncHRfcGxhbl90eXBlIjoicGx1cyJ9fQ.signature',
};

test('converts local input, switches locale and does not persist secrets', async ({
  page,
  context,
}) => {
  const foreignRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4173') {
      foreignRequests.push(request.url());
    }
  });
  await page.goto('/');
  await page.locator('#session-input').fill(JSON.stringify(session));

  const output = page.locator('#output');
  await expect(output).toHaveValue(/"type": "sub2api-data"/u);
  await expect(output).toHaveValue(/"chatgpt_account_id": "acct_browser"/u);
  await expect(page.locator('#issues')).toContainText('No refresh token present');
  const exportedAt = (JSON.parse(await output.inputValue()) as { exported_at: string }).exported_at;
  await page.getByRole('button', { name: 'CPA' }).click();
  await page.getByRole('button', { name: 'sub2api' }).click();
  expect((JSON.parse(await output.inputValue()) as { exported_at: string }).exported_at).toBe(
    exportedAt,
  );

  await page.getByRole('button', { name: '中文' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('转换登录 Session');
  expect(
    await page.evaluate(() => getComputedStyle(document.body).fontFamily.includes('LXGW WenKai')),
  ).toBe(true);

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: '复制 JSON' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('"sub2api-data"');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载 JSON' }).click();
  expect((await downloadEvent).suggestedFilename()).toContain('session-bridge-sub2api');

  expect(foreignRequests).toEqual([]);
  expect(
    await page.evaluate(async () => ({
      local: localStorage.length,
      session: sessionStorage.length,
      databases: (await indexedDB.databases()).length,
    })),
  ).toEqual({ local: 0, session: 0, databases: 0 });

  await page.reload();
  await expect(page.locator('#session-input')).toHaveValue('');
});

test('accepts an actual dropped JSON file and keeps outputs honest about renewal capability', async ({
  page,
}) => {
  await page.goto('/');
  await dropJson(page, session);

  await expect(page.locator('#session-input')).toHaveValue(/browser@local\.invalid/u);
  await page.getByRole('button', { name: 'AxonHub' }).click();
  await expect(page.locator('#output')).toHaveValue(/"access_token"/u);
  expect(await page.locator('#output').inputValue()).not.toContain('__missing_refresh_token__');
  expect(await page.locator('#output').inputValue()).not.toContain('"refresh_token"');

  await page.getByRole('button', { name: '9router' }).click();
  await expect(page.locator('#output')).toHaveValue(/"accessToken"/u);
  expect(await page.locator('#output').inputValue()).not.toContain('"authType"');

  await page.getByRole('button', { name: 'CPA' }).click();
  await page.locator('#synthetic').check();
  await expect(page.locator('#output')).toHaveValue(/\.synthetic/u);
  await expect(page.locator('#issues')).toContainText('synthetic ID token');
});

test('rejects oversized dropped files before producing output', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(
      new File(['x'.repeat(4 * 1024 * 1024 + 1)], 'oversized.json', {
        type: 'application/json',
      }),
    );
    document
      .querySelector('#drop-zone')
      ?.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
  });

  await expect(page.locator('#issues')).toContainText('exceeds the 4 MiB processing limit');
  await expect(page.locator('#output')).toHaveValue('');
});

test('rejects a multi-file batch that exceeds combined size limits', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const dataTransfer = new DataTransfer();
    for (const name of ['part-one.json', 'part-two.json']) {
      dataTransfer.items.add(
        new File(['x'.repeat(2 * 1024 * 1024 + 1)], name, { type: 'application/json' }),
      );
    }
    document
      .querySelector('#drop-zone')
      ?.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
  });

  await expect(page.locator('#issues')).toContainText('exceeds the 4 MiB processing limit');
  await expect(page.locator('#output')).toHaveValue('');
});

test('rejects an excessive number of selected files', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const dataTransfer = new DataTransfer();
    for (let index = 0; index < 251; index += 1) {
      dataTransfer.items.add(new File(['{}'], `input-${index}.json`, { type: 'application/json' }));
    }
    document
      .querySelector('#drop-zone')
      ?.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
  });

  await expect(page.locator('#issues')).toContainText('no more than 250 JSON files');
  await expect(page.locator('#output')).toHaveValue('');
});

test('maintains the two-panel workspace at desktop and a single-column flow on mobile', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const skipLink = page.locator('.skip-link');
  await page.keyboard.press('Tab');
  await expect(skipLink).toBeFocused();
  expect(
    await skipLink.evaluate((element) => element.getBoundingClientRect().top),
  ).toBeGreaterThanOrEqual(0);
  await page.getByRole('button', { name: 'Load safe example' }).click();
  expect(
    await skipLink.evaluate((element) => element.getBoundingClientRect().bottom),
  ).toBeLessThanOrEqual(0);
  await page.screenshot({
    path: testInfo.outputPath('workspace.png'),
    fullPage: true,
  });

  const columns = await page
    .locator('.conversion-grid')
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
  expect(columns).toBe(testInfo.project.name === 'mobile-chromium' ? 1 : 2);

  await page.getByRole('button', { name: '中文' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: testInfo.outputPath('workspace-zh.png'),
    fullPage: true,
  });
});

async function dropJson(page: Page, value: unknown): Promise<void> {
  await page.evaluate((input) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(
      new File([JSON.stringify(input)], 'dropped-session.json', { type: 'application/json' }),
    );
    const dropZone = document.querySelector('#drop-zone');
    if (!dropZone) {
      throw new Error('Drop zone unavailable');
    }
    dropZone.dispatchEvent(
      new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }),
    );
  }, value);
}

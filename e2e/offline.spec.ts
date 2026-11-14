// `npm run smoke`: what unit tests cannot see — the built app starts, and works without a network
// once the service worker has precached it (spec §2).
import { expect, test } from '@playwright/test';

test('a session can be played offline after the first visit', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active?.state === 'activated') return;
    await new Promise((resolve) =>
      registration.active?.addEventListener('statechange', resolve, { once: true }),
    );
  });

  await context.setOffline(true);
  await page.reload();

  await page.getByRole('button', { name: /Tafels/ }).click();
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.getByText('1 / 15')).toBeVisible();

  await page.getByRole('button', { name: '7', exact: true }).click();
  await expect(page.getByLabel('Jouw antwoord')).toHaveText('7');
});

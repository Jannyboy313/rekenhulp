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

test('a played session leaves its records in IndexedDB (memory spec §4)', async ({ page }) => {
  const stored = () =>
    page.evaluate(
      () =>
        new Promise<number>((resolve, reject) => {
          const open = indexedDB.open('rekenhulp');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const count = open.result.transaction('records').objectStore('records').count();
            count.onsuccess = () => {
              open.result.close();
              resolve(count.result);
            };
            count.onerror = () => reject(count.error);
          };
        }),
    );

  await page.goto('/');
  await page.getByRole('button', { name: /Tafels/ }).click();
  await page.getByRole('button', { name: /^Start/ }).click();
  // 1 is never a table answer.
  await page.getByRole('button', { name: '1', exact: true }).click();
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await page.getByRole('button', { name: 'Verder' }).click();
  await page.getByRole('button', { name: 'Stoppen' }).click();
  await expect(page.getByRole('button', { name: 'Opnieuw' })).toBeVisible();
  await expect.poll(stored).toBe(1);

  await page.reload();
  await expect(page.getByText('Wat wil je oefenen?')).toBeVisible();
  expect(await stored()).toBe(1);
});

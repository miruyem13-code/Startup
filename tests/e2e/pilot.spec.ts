import { test, expect } from '@playwright/test';

test('contact inbox, operations controls, local verification and demo passes', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('velocity-language', 'en'));
  const suffix = Date.now();
  await page.goto('/contact');
  await page.getByLabel('Your name').fill(`Browser visitor ${suffix}`);
  await page.getByLabel('Email address').fill(`visitor-${suffix}@example.com`);
  await page
    .getByLabel('Your message')
    .fill('Please share details about the next city mobility pilot.');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('MESSAGE RECEIVED')).toBeVisible();
  await page.goto('/login');
  await page.getByLabel('Email address').fill('admin@velocity.demo');
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.DEMO_ADMIN_PASSWORD || 'VelocityAdmin2026!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/admin/feedback');
  const feedback = page.locator('tbody tr').filter({ hasText: `Browser visitor ${suffix}` });
  await expect(feedback).toBeVisible();
  await feedback.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Review status').selectOption('CLOSED');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(feedback).toContainText('CLOSED');
  await page.goto('/admin/teams');
  await page.getByRole('button', { name: 'Create team' }).click();
  await page.getByLabel('Team name').fill(`Browser community ${suffix}`);
  await page
    .getByLabel('Description')
    .fill('A welcoming community for slow and steady city exploration.');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('tbody')).toContainText(`Browser community ${suffix}`);
  await page.goto('/admin/challenges');
  await page.getByRole('button', { name: 'Create competition' }).click();
  await page.getByLabel('Competition name').fill(`Browser competition ${suffix}`);
  await page
    .getByLabel('Description')
    .fill('A friendly city exploration event scored from completed rides.');
  await page.getByLabel('Green Pedal', { exact: true }).check();
  await page.getByLabel('Tashkent Explorers', { exact: true }).check();
  await page.getByRole('button', { name: 'Save changes' }).click();
  const competition = page.locator('tbody tr').filter({ hasText: `Browser competition ${suffix}` });
  await competition.getByRole('button', { name: 'Activate', exact: true }).click();
  await expect(competition).toContainText('ACTIVE');
  await page.goto('/battles');
  await expect(page.getByText(`Browser competition ${suffix}`)).toBeVisible();
  for (const route of ['territories', 'rewards', 'plans', 'users', 'seasons']) {
    await page.goto(`/admin/${route}`);
    await expect(page.locator('tbody tr').first()).toBeVisible();
  }
  await page.goto('/admin/settings');
  await expect(page.getByLabel('Unlock fee (UZS)')).toHaveValue('2000');
  await page.goto('/admin/intelligence');
  await expect(page.getByText('Historical returns by hour')).toBeVisible();
  await expect(page.locator('tbody tr')).not.toHaveCount(0);
  await page.screenshot({ path: 'docs/screenshots/intelligence-desktop.png', fullPage: true });
  await page.goto('/admin/reports');
  await expect(page.getByRole('link', { name: 'inventory CSV' })).toBeVisible();
  const report = await page.request.get('/api/admin/reports/inventory.csv');
  expect(report.status()).toBe(200);
  expect(await report.text()).toContain('V-001');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.goto('/register');
  await page.getByLabel('Your name').fill('Pass Explorer');
  await page.getByLabel('Email address').fill(`pass-${suffix}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill('VelocityBrowser2026!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Prepare local verification' }).click();
  await page.getByRole('button', { name: 'Confirm local verification' }).click();
  await expect(page.getByText('VERIFIED', { exact: true })).toBeVisible();
  await page.getByLabel('Community and competition news').uncheck();
  await page.getByRole('button', { name: 'Save notification preferences' }).click();
  await page.reload();
  await expect(page.getByLabel('Community and competition news')).not.toBeChecked();
  await page.goto('/subscriptions');
  await page.getByRole('button', { name: 'Choose pass' }).first().click();
  await page.getByRole('button', { name: 'Confirm demo purchase' }).click();
  await expect(page.getByRole('button', { name: 'End pass', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'End pass', exact: true }).click();
  await page.getByRole('button', { name: 'End pass now' }).click();
  await expect(page.locator('tbody')).toContainText('CANCELLED');
  await page.goto('/achievements');
  await expect(page.locator('.passport-card')).toHaveCount(10);
  await page.goto('/fitness');
  await expect(page.getByText('A habit with room for rest')).toBeVisible();
  await page.goto('/leaderboard');
  await page.getByRole('combobox', { name: 'Ranking', exact: true }).selectOption('DISTANCE');
  await page.getByRole('combobox', { name: 'Period', exact: true }).selectOption('WEEK');
  await expect(page.locator('thead')).toContainText('km');
  await page.getByRole('combobox', { name: 'Community', exact: true }).selectOption('FRIENDS');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('combobox', { name: 'Community', exact: true }).selectOption('GLOBAL');
  await page.locator('tbody tr').first().locator('td').nth(1).getByRole('link').click();
  await expect(page.getByText('PUBLIC PROFILE', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});
test('landing, session, real demo rental, missions, rewards and mobile', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('velocity-language', 'en');
  });
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Your city.');
  await expect(page.locator('.bike-marker').first()).toBeInViewport({ timeout: 20000 });
  await page.screenshot({ path: 'docs/screenshots/landing-desktop.png', fullPage: true });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Explore with a demo account' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('.metric-value').first()).not.toHaveText('0km');
  await page.screenshot({ path: 'docs/screenshots/dashboard-desktop.png', fullPage: true });
  await page.goto('/goals');
  await expect(page.locator('h1')).toHaveText('A goal that moves with you.');
  await page.goto('/battles');
  await expect(page.getByText('Live season standings')).toBeVisible();
  await page.goto('/friends');
  await expect(page.locator('h1')).toHaveText('Your city circle.');
  await page.goto('/bikes');
  await page
    .locator('.bike-card')
    .first()
    .getByRole('button', { name: 'Report a problem' })
    .click();
  await page
    .getByRole('textbox', { name: 'What is wrong?' })
    .fill('Browser check: the rear reflector needs inspection.');
  await page.getByRole('button', { name: 'Send report' }).click();
  await expect(page.locator('dialog')).not.toBeVisible();
  // Fresh rider fixture keeps rewards independent of previous demonstrations.
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.goto('/register');
  await page.getByRole('textbox', { name: 'Your name' }).fill('Pilot Explorer');
  await page
    .getByRole('textbox', { name: 'Email address' })
    .fill(`pilot-${Date.now()}@example.com`);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('VelocityBrowser2026!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/missions');
  for (const name of ['Your first chapter', 'The 3 km club']) {
    await page
      .locator('.mission-card')
      .filter({ hasText: name })
      .getByRole('button', { name: 'Join', exact: true })
      .click();
    await page.locator('dialog').getByRole('button', { name: 'Join mission', exact: true }).click();
    await expect(page.locator('dialog')).not.toBeVisible();
  }
  await page.goto('/ride/active');
  const active = await page.request.get('/api/dashboard');
  const state = (await active.json()).active;
  if (!state) {
    await page.goto('/map');
    await page.locator('.station-bike-row .button').first().click();
  }
  await expect(page).toHaveURL(/ride\/active/);
  const reserved = await page.request.get('/api/dashboard');
  const rental = (await reserved.json()).active;
  if (rental.state === 'RESERVED') {
    await page.getByRole('textbox', { name: 'Bike ID' }).fill(rental.bike.code);
    await page.getByRole('button', { name: 'Simulate unlock' }).click();
  }
  await expect(page.getByRole('button', { name: 'Next simulation step' })).toBeVisible();
  const ride = (await (await page.request.get('/api/dashboard')).json()).active;
  if (ride.simulationPaused)
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
  for (let i = ride.step; i < 18; i++) {
    await page.getByRole('button', { name: 'Next simulation step' }).click();
    await expect(page.locator('.active-map-card .badge')).toHaveText(`${i + 1} / 18 steps`);
  }
  await page.getByRole('button', { name: 'End ride', exact: true }).click();
  await page.getByRole('button', { name: 'Park at Amir Temur Square' }).click();
  await expect(page.locator('.ride-summary h1')).toHaveText('Your city looks good on you.');
  await page.screenshot({ path: 'docs/screenshots/ride-summary.png', fullPage: true });
  await page.goto('/missions');
  await expect(page.locator('.mission-card').first()).toBeVisible();
  expect(await page.locator('.mission-card').count()).toBeGreaterThanOrEqual(40);
  await expect(
    page
      .locator('.mission-card')
      .filter({ hasText: 'Your first chapter' })
      .getByText('Completed', { exact: true }),
  ).toBeVisible();
  await page.goto('/passport');
  await expect(page.locator('.passport-card.stamped')).not.toHaveCount(0);
  await page.goto('/rewards');
  await page.locator('.reward-card').first().getByRole('button', { name: 'Redeem' }).click();
  await page.getByRole('button', { name: 'Confirm redemption' }).click();
  await expect(page.locator('.redemption-history tbody tr')).toHaveCount(1);
  await page.goto('/dashboard');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.mobile-bottom-nav')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'docs/screenshots/dashboard-mobile.png', fullPage: true });
  await page.locator('.preferences .language-select').selectOption('uz');
  await expect(page.locator('.page-intro h1')).toHaveText('Har kuni kichik bir yutuq.');
  await page.locator('.preferences .language-select').selectOption('ru');
  await expect(page.locator('.page-intro h1')).toHaveText('Немного прогресса каждый день.');
  await page.locator('.preferences .language-select').selectOption('en');
  await page.getByRole('button', { name: 'Toggle color theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: 'docs/screenshots/dashboard-dark.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('admin login, mission publication, fleet edit, investor model and business isolation', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('velocity-language', 'en'));
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email address' }).fill('admin@velocity.demo');
  await page
    .getByRole('textbox', { name: 'Password', exact: true })
    .fill(process.env.DEMO_ADMIN_PASSWORD || 'VelocityAdmin2026!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator('.metric-value').first()).toContainText('/ 120');
  await page.goto('/admin/missions');
  await page.getByRole('button', { name: 'Create mission', exact: true }).click();
  const title = `Pilot browser mission ${Date.now()}`;
  await page.getByRole('textbox', { name: 'Mission name' }).fill(title);
  await page
    .getByRole('textbox', { name: 'Description' })
    .fill('Complete a calm three kilometer demo journey.');
  await page.getByLabel('Publication').selectOption('PUBLISHED');
  await page.locator('dialog').getByRole('button', { name: 'Create mission', exact: true }).click();
  await expect(page.locator('tbody')).toContainText(title);
  const missionRow = page.locator('tbody tr').filter({ hasText: title });
  await missionRow.getByRole('button', { name: 'Edit', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Description', exact: true })
    .fill('Complete a calm three kilometer demo journey and enjoy the city.');
  await page.getByRole('button', { name: 'Save mission', exact: true }).click();
  await expect(page.locator('dialog')).not.toBeVisible();
  await page.goto('/challenges');
  await expect(page.locator('.mission-grid')).toContainText(title);
  await page.goto('/admin/bikes');
  const editableBike = page
    .locator('tbody tr')
    .filter({ has: page.locator('button:not(:disabled)') })
    .first();
  await editableBike.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Demo lock battery (%)').fill('95');
  await page.getByRole('button', { name: 'Save bicycle' }).click();
  await expect(editableBike).toContainText('95%');
  await page.goto('/admin/investor-overview');
  await expect(page.locator('.projection-results')).toContainText('Projected monthly revenue');
  await page.getByRole('button', { name: 'Optimistic' }).click();
  await expect(page.getByLabel('Rides per bike per day')).toHaveValue('5');
  await page.screenshot({ path: 'docs/screenshots/investor-desktop.png', fullPage: true });
  await page.goto('/business/dashboard');
  await expect(page.locator('h1')).toContainText('needs a different role');
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email address' }).fill('business@velocity.demo');
  await page
    .getByRole('textbox', { name: 'Password', exact: true })
    .fill(process.env.DEMO_BUSINESS_PASSWORD || 'VelocityBusiness2026!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/business\/dashboard/);
  await expect(page.locator('.corporate-challenges')).toContainText('A greener October');
  await page.goto('/business/employees');
  await expect(page.locator('h1')).toHaveText('Bring the team along.');
  await expect(page.getByText('Current members')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/business-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('business sponsor review and sponsored mission publication', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('velocity-language', 'en'));
  async function login(email: string, password: string, destination: RegExp) {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(destination);
  }
  const businessPassword = process.env.DEMO_BUSINESS_PASSWORD || 'VelocityBusiness2026!';
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD || 'VelocityAdmin2026!';
  const suffix = Date.now();
  const sponsorName = `Browser city sponsor ${suffix}`;
  const missionName = `Browser sponsored chapter ${suffix}`;
  await login('business@velocity.demo', businessPassword, /business\/dashboard/);
  await page.goto('/business/sponsors');
  await page.getByLabel('Sponsor name', { exact: true }).fill(sponsorName);
  await page
    .getByLabel('Brand description')
    .fill('An illustrative mobility partnership with no real commercial agreement.');
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByText(sponsorName, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await login('admin@velocity.demo', adminPassword, /\/admin$/);
  await page.goto('/admin/sponsors');
  const sponsorRow = page.locator('tbody tr').filter({ hasText: sponsorName });
  await sponsorRow.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Approval status').selectOption('APPROVED');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(sponsorRow).toContainText('APPROVED');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await login('business@velocity.demo', businessPassword, /business\/dashboard/);
  await page.goto('/business/sponsors');
  await page.getByLabel('Approved sponsor').selectOption({ label: sponsorName });
  await page.getByLabel('Mission name', { exact: true }).fill(missionName);
  await page
    .getByLabel('Mission description')
    .fill('Explore ten kilometers at your own pace in this demonstration challenge.');
  await page.getByRole('button', { name: 'Submit mission draft' }).click();
  await expect(page.locator('tbody tr').filter({ hasText: missionName })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await login('admin@velocity.demo', adminPassword, /\/admin$/);
  await page.goto('/admin/missions');
  await page
    .locator('tbody tr')
    .filter({ hasText: missionName })
    .getByRole('button', { name: 'Publish', exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirm change' }).click();
  await expect(page.locator('dialog')).not.toBeVisible();
  await page.goto('/challenges');
  const card = page.locator('.mission-card').filter({ hasText: missionName });
  await expect(card).toContainText('DEMO SPONSORED');
  await expect(card).toContainText(sponsorName);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});

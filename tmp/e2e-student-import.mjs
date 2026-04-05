const { chromium } = require('/root/.openclaw/workspace/node_modules/playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const base = 'https://ipsas-demo.ithinksys.co.zw';
  const filePath = '/root/.openclaw/workspace/ipsas-demo/tmp/e2e-students-import.csv';

  const log = (...args) => console.log('[e2e]', ...args);

  try {
    log('goto login');
    await page.goto(base + '/login', { waitUntil: 'networkidle', timeout: 120000 });
    await page.getByLabel('Email').fill('admin@school.ac.zw');
    await page.getByLabel('Password').fill('Admin@123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 120000 });
    log('logged in');

    await page.goto(base + '/dashboard/imports/students', { waitUntil: 'networkidle', timeout: 120000 });
    log('on import page');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    await page.getByRole('button', { name: /upload & preview/i }).click();
    log('uploaded');

    await page.getByText('Preview: STUDENTS', { exact: false }).waitFor({ timeout: 120000 });
    const previewText = await page.locator('body').innerText();
    console.log('===PREVIEW_TEXT_START===');
    console.log(previewText);
    console.log('===PREVIEW_TEXT_END===');

    const commitBtn = page.getByRole('button', { name: /commit .*records/i });
    await commitBtn.click();
    log('commit clicked');

    await page.getByText('Import Completed', { exact: false }).waitFor({ timeout: 120000 });
    const finalText = await page.locator('body').innerText();
    console.log('===FINAL_TEXT_START===');
    console.log(finalText);
    console.log('===FINAL_TEXT_END===');

    await page.goto(base + '/dashboard/students', { waitUntil: 'networkidle', timeout: 120000 });
    await page.getByPlaceholder(/search/i).fill('E2E-IMP-001');
    await page.waitForTimeout(2000);
    const studentsText = await page.locator('body').innerText();
    console.log('===STUDENTS_TEXT_START===');
    console.log(studentsText);
    console.log('===STUDENTS_TEXT_END===');

    await browser.close();
  } catch (err) {
    console.error('E2E_FAILED', err);
    await page.screenshot({ path: path.join('/root/.openclaw/workspace/ipsas-demo/tmp', 'e2e-student-import-failure.png'), fullPage: true }).catch(() => {});
    await browser.close();
    process.exit(1);
  }
})();

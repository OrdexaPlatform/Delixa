const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:3000/login/admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  await page.click('#demo-login-admin-btn');
  await page.waitForTimeout(3000);
  
  const text = await page.locator('body').innerText();
  console.log('PAGE TEXT:');
  console.log(text.substring(0, 1000));
  
  await browser.close();
})();

import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => console.log(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', err => console.log(`[PAGE_ERROR] ${err.message}`));

page.on('response', res => {
  const url = res.url();
  if (url.includes(':8080/') || url.includes('.m3u8') || url.includes('.mpd')) {
    console.log(`[${res.status()}] ${url}`);
  }
});

await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

const title = await page.title();
console.log('Page title:', title);

const body = await page.textContent('body');
console.log('Body text (first 500 chars):', body.substring(0, 500));

await page.close();

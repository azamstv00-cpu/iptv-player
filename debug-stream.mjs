import { chromium } from 'playwright';

const STREAM_URL = process.argv[2] || 'https://otte.cache.aiv-cdn.net/bom-nitro/live/clients/dash/enc/zpfs5hlgya/out/v1/84b1d591a23640178a8e8aa43c6e59a7/cenc.mpd|drmScheme=clearkey&drmLicense=0cc2f872759c96de70237e6fa6de03d0:a879b1d38ed002d4018bce96f9219b8d';

const browser = await chromium.launch({ headless: false, args: ['--ignore-certificate-errors'] });
const context = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await context.newPage();

// ---- INTERCEPT ALL NETWORK ----
page.on('request', req => {
  const url = req.url();
  if (url.includes('aiv-cdn.net') || url.includes('192.168.0.136') || url.includes('localhost:8080') || (url.includes('cenc.mpd') && !url.includes('drm'))) {
    console.log(`\n>>> ${req.method()} ${url}`);
    console.log('  origin:', req.headers()['origin']);
    console.log('  referer:', req.headers()['referer']);
    console.log('  user-agent:', (req.headers()['user-agent'] || '').substring(0, 70));
    console.log('  sec-fetch-site:', req.headers()['sec-fetch-site']);
    console.log('  cookie:', req.headers()['cookie'] ? 'YES' : 'NO');
    console.log('  ALL headers:', JSON.stringify(req.headers(), null, 2));
  }
});

page.on('response', async resp => {
  const url = resp.url();
  if (url.includes('aiv-cdn.net') || url.includes('192.168.0.136') || url.includes('localhost:8080') || (url.includes('cenc.mpd') && !url.includes('drm'))) {
    const status = resp.status();
    console.log(`\n<<< ${status} ${url}`);
    console.log('  Response headers:', JSON.stringify(resp.headers(), null, 2));
    if (status >= 400) {
      try {
        console.log('  Body:', (await resp.text()).substring(0, 500));
      } catch (e) {}
    }
  }
});

page.on('console', msg => {
  const t = msg.text();
  if (t.includes('Error') || t.includes('error') || t.includes('400') || t.includes('1001')) {
    console.log(`[CONSOLE ${msg.type()}] ${t.substring(0, 300)}`);
  }
});

// ---- NAVIGATE ----
console.log('=== NAVIGATING ===');
try {
  await page.goto('https://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 20000 });
} catch (e) { console.log('Nav timeout, continuing'); }
await page.waitForTimeout(2000);
await page.screenshot({ path: 'debug-1-loaded.png', fullPage: true });

// ---- PASTE URL ----
const ta = page.locator('textarea').first();
await ta.click();
await ta.fill('');
await ta.pressSequentially(STREAM_URL, { delay: 2 });
console.log('\n=== URL PASTED ===');

// ---- CHECK DROPDOWN ----
const selects = page.locator('select');
const sc = await selects.count();
let currentProxy = '';
for (let i = 0; i < sc; i++) {
  const val = await selects.nth(i).inputValue();
  const opts = await selects.nth(i).locator('option').allTextContents();
  console.log(`Select[${i}]: value="${val}", opts=${JSON.stringify(opts)}`);
  if (opts.length > 0) currentProxy = val;
}

// ---- TRY: NO PROXY FIRST ----
if (sc > 0) {
  // Try selecting "No proxy" option
  const opts = await selects.first().locator('option').all();
  for (const opt of opts) {
    const text = (await opt.textContent()) || '';
    if (text.toLowerCase().includes('no proxy')) {
      const val = await opt.getAttribute('value');
      console.log(`\n=== Selecting proxy: "${text}" (${val}) ===`);
      await selects.first().selectOption(val || '');
      await page.waitForTimeout(300);
      break;
    }
  }
}

// ---- CLICK LOAD STREAM ----
const buttons = page.locator('button');
const btnTexts = [];
for (let i = 0; i < await buttons.count(); i++) {
  btnTexts.push(((await buttons.nth(i).textContent()) || '').trim().toLowerCase());
}
console.log(`\nButtons: ${JSON.stringify(btnTexts)}`);

const loadIdx = btnTexts.findIndex(t => t.includes('load'));
if (loadIdx >= 0) {
  console.log(`\n=== CLICKING "${btnTexts[loadIdx]}" ===`);
  await buttons.nth(loadIdx).click();
} else {
  console.log('No load button found');
}

// ---- WAIT ----
console.log('\n=== WAITING 25s FOR STREAMING... ===');
await page.waitForTimeout(25000);
await page.screenshot({ path: 'debug-2-after-stream.png', fullPage: true });

console.log('\n=== DONE. Browser stays open 60s ===');
await page.waitForTimeout(60000);
await browser.close();

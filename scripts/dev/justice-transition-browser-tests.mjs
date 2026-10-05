// Loopback-only visual navigation checks. No AI, uploads or remote data writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const base = new URL(process.env.HAQ_QA_URL || 'http://127.0.0.1:3005');
if (!['localhost', '127.0.0.1'].includes(base.hostname)) throw Error('Loopback only.');
const {chromium} = await import(process.env.HAQ_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({executablePath: process.env.HAQ_CHROME_PATH, headless: true});
const out = path.join(process.env.TEMP || '.', 'haq-justice-transition-20261005');
fs.mkdirSync(out, {recursive: true});
const evidence = [];
let citizenState;
const messages = (locale, file) => JSON.parse(fs.readFileSync(`src/messages/${locale}/${file}.json`, 'utf8'));

async function sampleFrames(page) {
  await page.evaluate(() => {
    window.__justiceFrames = [];
    const start = performance.now();
    function sample() {
      const cue = document.querySelector('[data-route-transition]');
      const panel = cue?.querySelector('[data-justice-scale-panel]');
      const icon = cue?.querySelector('svg[data-justice-scale]');
      const box = panel?.getBoundingClientRect();
      const iconBox = icon?.getBoundingClientRect();
      const center = box ? {x: box.x + box.width / 2, y: box.y + box.height / 2} : null;
      const hit = center ? document.elementFromPoint(center.x, center.y) : null;
      window.__justiceFrames.push({
        time: performance.now() - start, path: location.pathname, cuePath: cue?.dataset.routeTransition,
        opacity: cue ? Number(getComputedStyle(cue).opacity) : 0,
        pointer: cue ? getComputedStyle(cue).pointerEvents : null,
        centered: center ? Math.abs(center.x - innerWidth / 2) < 2 && Math.abs(center.y - innerHeight / 2) < 2 : false,
        iconWidth: iconBox?.width || 0, iconHeight: iconBox?.height || 0,
        justiceBalance: !!icon?.classList.contains('lucide-scale') && icon.querySelectorAll('path').length >= 4,
        background: panel ? getComputedStyle(panel).backgroundColor : null,
        gold: icon ? getComputedStyle(icon).color : null,
        blocksHit: !!cue && !!hit && cue.contains(hit),
      });
      if (performance.now() - start < 2200) requestAnimationFrame(sample);
    }
    sample();
  });
}

async function navigate(page, control, destination, label, reduced, locale, viewport) {
  await page.locator('[data-route-transition]').waitFor({state: 'detached'});
  await sampleFrames(page);
  // Start observing before clicking so fast prefetched transitions are captured.
  const visible = reduced ? null : page.waitForFunction(expected => {
    const cue = document.querySelector('[data-route-transition]');
    return cue?.dataset.routeTransition === expected && Number(getComputedStyle(cue).opacity) >= 0.85;
  }, destination, {timeout: 10000});
  await control.click();
  await page.waitForURL(url => url.pathname === destination);
  if (visible) {
    await visible;
    await page.screenshot({path: path.join(out, `${locale}-${viewport}-${label}.png`)});
  }
  await page.waitForFunction(() => window.__justiceFrames.at(-1)?.time >= 1500);
  const frames = await page.evaluate(() => window.__justiceFrames);
  const shown = frames.filter(frame => frame.cuePath === destination && frame.opacity >= 0.5);
  if (reduced) {
    assert.equal(frames.some(frame => frame.cuePath), false, 'Reduced motion must render no route cue.');
  } else {
    assert.ok(shown.length >= 3, 'Justice balance must appear across real rendered frames.');
    assert.ok(shown.every(frame => frame.centered && frame.justiceBalance && frame.iconWidth >= 72 && frame.iconHeight >= 72));
    assert.ok(shown.every(frame => frame.background === 'rgb(12, 20, 33)' && frame.gold === 'rgb(203, 167, 96)'));
    assert.ok(frames.filter(frame => frame.cuePath).every(frame => frame.pointer === 'none' && !frame.blocksHit));
    const first = frames.find(frame => frame.cuePath === destination);
    const disappeared = frames.find(frame => frame.time > first.time && !frame.cuePath);
    assert.ok(disappeared, 'Cue must unmount cleanly.');
    const duration = disappeared.time - first.time;
    assert.ok(duration >= 400 && duration <= 750, `Observed cue duration ${duration} ms.`);
    assert.ok(shown.some(frame => frame.path === destination), 'Destination renders while the balance is still visible.');
  }
  assert.equal(await page.locator('[data-route-transition]').count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  evidence.push({locale, viewport, reduced, label, destination, frames});
  console.log(`${locale}/${viewport}/${reduced ? 'reduced' : 'motion'} ${label}: ${reduced ? 'no cue' : `${shown.length} visible centered justice-balance frames; clean removal/nonblocking`} PASS`);
}

try {
  for (const locale of ['en', 'ar']) for (const viewport of ['desktop', 'mobile']) for (const reduced of [false, true]) {
    const context = await browser.newContext({
      viewport: {width: viewport === 'mobile' ? 390 : 1440, height: 900},
      reducedMotion: reduced ? 'reduce' : 'no-preference',
      storageState: citizenState,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    let allowDemoEntry = !citizenState, external = 0;
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && /hydrat|did not match|server rendered/i.test(message.text())) errors.push(message.text());
    });
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== base.origin) {external++; return route.abort();}
      if (request.method() !== 'GET' && request.method() !== 'HEAD' && !(allowDemoEntry && request.method() === 'POST' && url.pathname === `/${locale}`)) return route.abort();
      return route.continue();
    });
    const landing = messages(locale, 'landing');
    const ready = () => page.locator(`[data-legal-motion="${reduced ? 'reduced' : 'active'}"]`).waitFor();
    await page.goto(`${base.origin}/${locale}`); await ready();
    assert.equal(await page.locator('[data-route-transition]').count(), 0, 'No first-load cue.');
    assert.equal(await page.locator('html').getAttribute('dir'), locale === 'ar' ? 'rtl' : 'ltr');
    // One legitimate signed demo entry, reused in memory across the matrix.
    // Avoid cycling sessions or changing the existing entry abuse controls.
    if (!citizenState) {
      await page.getByText(landing.demoEntry.citizen, {exact: true}).click();
      await page.waitForURL(`**/${locale}/citizen/dashboard`);
      await page.locator(`main a[href="/${locale}/citizen/analyze/new"]`).first().waitFor();
      citizenState = await context.storageState();
    }
    allowDemoEntry = false;

    await page.goto(`${base.origin}/${locale}`); await ready();
    await navigate(page, page.getByRole('button', {name: landing.hero.ctaPrimary, exact: true}).first(), `/${locale}/citizen/analyze/new`, 'home-analyze', reduced, locale, viewport);
    await page.locator('#contract-text').waitFor();

    await page.goto(`${base.origin}/${locale}`); await ready();
    await navigate(page, page.getByRole('link', {name: landing.hero.ctaSecondary, exact: true}).first(), `/${locale}/lawyers`, 'home-lawyers', reduced, locale, viewport);

    await page.goto(`${base.origin}/${locale}/citizen/dashboard`);
    await navigate(page, page.locator(`main a[href="/${locale}/citizen/documents"]`).first(), `/${locale}/citizen/documents`, 'dashboard-documents', reduced, locale, viewport);
    assert.deepEqual(errors, [], 'No page or hydration errors.');
    assert.equal(external, 0, 'No external requests or Supabase traffic.');
    await context.close();
  }
  fs.writeFileSync(path.join(out, 'navigation-frames.json'), JSON.stringify(evidence, null, 2));
  console.log('justice-transition-browser-tests: 24 actual navigation cases PASS; 12 visible-frame screenshots; no AI/remote data writes.');
} finally {
  await browser.close();
}

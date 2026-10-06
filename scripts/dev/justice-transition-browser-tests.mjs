// Loopback-only visual navigation checks. No AI, uploads or remote data writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const base = new URL(process.env.HAQ_QA_URL || 'http://127.0.0.1:3005');
if (!['localhost', '127.0.0.1'].includes(base.hostname)) throw Error('Loopback only.');
const {chromium} = await import(process.env.HAQ_PLAYWRIGHT_MODULE || 'playwright');
const playwrightDir = path.dirname(fileURLToPath(import.meta.resolve(process.env.HAQ_PLAYWRIGHT_MODULE || 'playwright')));
const {PNG} = createRequire(import.meta.url)(path.join(playwrightDir, '../playwright-core/lib/utilsBundle.js'));
const browser = await chromium.launch({executablePath: process.env.HAQ_CHROME_PATH, headless: process.env.HAQ_QA_HEADED !== '1'});
const out = path.join(process.env.TEMP || '.', 'haq-minimal-transition-20261006', process.env.HAQ_QA_RUNTIME || 'production');
fs.mkdirSync(out, {recursive: true});
const evidence = [];
let citizenState;
const messages = (locale, file) => JSON.parse(fs.readFileSync(`src/messages/${locale}/${file}.json`, 'utf8'));

async function sampleFrames(page) {
  await page.evaluate(() => {
    window.__justiceFrames = [];
    window.__justiceStart = [];
    window.addEventListener('haq:navigation-start', () => {
      // Observe after all synchronous listeners, regardless of their registration
      // order during selective hydration. This still precedes a rendered arrival.
      queueMicrotask(() => {
        const cue = document.querySelector('[data-route-transition]');
        window.__justiceStart.push({path: location.pathname, time: performance.now(), display: cue ? getComputedStyle(cue).display : null, opacity: cue ? Number(getComputedStyle(cue).opacity) : 0});
      });
    }, {once: true});
    const start = performance.now();
    function sample() {
      const cue = document.querySelector('[data-route-transition]');
      const icon = cue?.querySelector('svg[data-justice-scale]');
      const iconBox = icon?.getBoundingClientRect();
      const center = iconBox ? {x: iconBox.x + iconBox.width / 2, y: iconBox.y + iconBox.height / 2} : null;
      const hit = center ? document.elementFromPoint(center.x, center.y) : null;
      window.__justiceFrames.push({
        time: performance.now() - start, path: location.pathname, cuePath: cue?.dataset.routeTransition,
        opacity: cue ? Number(getComputedStyle(cue).opacity) : 0, phase: cue?.dataset.routePhase,
        fixed: cue ? getComputedStyle(cue).position === 'fixed' : false,
        fullScreen: cue ? Math.abs(cue.getBoundingClientRect().width - document.documentElement.clientWidth) < 2 && Math.abs(cue.getBoundingClientRect().height - document.documentElement.clientHeight) < 2 : false,
        bounds: cue ? {width: cue.getBoundingClientRect().width, height: cue.getBoundingClientRect().height, viewportWidth: document.documentElement.clientWidth, viewportHeight: document.documentElement.clientHeight} : null,
        zIndex: cue ? Number(getComputedStyle(cue).zIndex) : 0,
        backdrop: cue ? getComputedStyle(cue).backgroundColor : null,
        pointer: cue ? getComputedStyle(cue).pointerEvents : null,
        centered: center ? Math.abs(center.x - document.documentElement.clientWidth / 2) < 2 && Math.abs(center.y - document.documentElement.clientHeight / 2) < 2 : false,
        iconWidth: iconBox?.width || 0, iconHeight: iconBox?.height || 0,
        justiceBalance: !!icon?.classList.contains('lucide-scale') && icon.querySelectorAll('path').length >= 4,
        iconOnly: !!cue && cue.children.length === 1 && cue.firstElementChild === icon && cue.textContent.trim() === '',
        noPanel: !!cue && !cue.querySelector('[data-justice-scale-panel]') && getComputedStyle(cue).boxShadow === 'none' && getComputedStyle(cue).borderTopWidth === '0px',
        staticIcon: icon ? getComputedStyle(icon).transform === 'none' : false,
        gold: icon ? getComputedStyle(icon).color : null,
        blocksHit: !!cue && !!hit && cue.contains(hit),
      });
      if (performance.now() - start < 6500) requestAnimationFrame(sample);
    }
    sample();
  });
}

async function navigate(page, control, destination, label, reduced, locale, viewport, holdResponse = false) {
  await page.locator('[data-route-transition]').waitFor({state: 'detached'});
  const source = new URL(page.url()).pathname;
  await page.bringToFront();
  await control.scrollIntoViewIfNeeded();
  await sampleFrames(page);
  // Optional test-only response hold proves a painted overlay BEFORE arrival.
  // Normal-navigation cases below never hold or delay any request.
  let release, intercepted, handler;
  const matchesDestination = url => url.pathname === destination;
  if (holdResponse) {
    const pending = new Promise(resolve => { release = resolve; });
    intercepted = new Promise(resolve => {
      handler = async route => {
        if (route.request().headers().rsc === '1' && !route.request().headers()['next-router-prefetch']) {
          resolve(); await pending; await route.continue();
        } else await route.continue();
      };
    });
    await page.route(matchesDestination, handler);
  }
  const visible = page.waitForFunction(expected => {
    const cue = document.querySelector('[data-route-transition]');
    return cue?.dataset.routeTransition === expected && Number(getComputedStyle(cue).opacity) >= 0.85;
  }, destination, {timeout: 10000});
  const box = await control.boundingBox(); assert.ok(box);
  // Trusted browser mouse input on actual application controls, never DOM.click.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.up();
  await visible;
  if (holdResponse) {
    let requestTimeout;
    try {
      await Promise.race([intercepted, new Promise((_, reject) => { requestTimeout = setTimeout(() => reject(Error('No pending route request')), 10000); })]);
    } finally { clearTimeout(requestTimeout); }
    assert.equal(new URL(page.url()).pathname, source);
  }
  const screenshot = await page.screenshot({path: path.join(out, `${locale}-${viewport}-${reduced ? 'reduced' : 'normal'}-${label}-start.png`)});
  const png = PNG.sync.read(screenshot);
  const extent = await page.evaluate(() => ({width: document.documentElement.clientWidth, height: document.documentElement.clientHeight}));
  // Sample the actual rendered content viewport, excluding browser scrollbars
  // and the centered icon. No previous page/header may bleed through the navy.
  // The destination can remove its scrollbar before this metadata read, while
  // the screenshot still contains the source's native Windows scrollbar.
  for (const x of [8, Math.floor(extent.width / 2), Math.min(extent.width, png.width) - 24]) {
    for (const y of [8, Math.floor(extent.height / 4), extent.height - 8]) {
      assert.deepEqual([...png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 4)], [12, 20, 33, 255], 'Rendered screenshot must be completely opaque HAQ navy outside the icon.');
    }
  }
  if (holdResponse) release();
  await page.waitForURL(url => url.pathname === destination);
  if (!holdResponse) {
    await page.waitForFunction(() => window.__justiceFrames.at(-1)?.time >= 300);
    if (await page.locator('[data-route-transition]').count()) {
      await page.screenshot({path: path.join(out, `${locale}-${viewport}-${reduced ? 'reduced' : 'normal'}-${label}-hold.png`)});
    }
  }
  await page.locator('[data-route-transition]').waitFor({state: 'detached'});
  await page.waitForFunction(() => window.__justiceFrames.at(-1)?.time >= 1500);
  const frames = await page.evaluate(() => window.__justiceFrames);
  const shown = frames.filter(frame => frame.cuePath === destination && frame.opacity >= 0.5);
  const starts = await page.evaluate(() => window.__justiceStart);
  evidence.push({locale, viewport, reduced, label, destination, starts, frames});
  assert.equal(starts.length, 1);
  assert.ok(starts[0].path === source && starts[0].display === 'grid' && starts[0].opacity === 1, 'Overlay DOM visible synchronously at navigation start, before URL change.');
  {
    assert.ok(shown.length >= 3, 'Justice balance must appear across real rendered frames.');
    assert.ok(shown.every(frame => frame.centered && frame.justiceBalance && frame.iconWidth === 56 && frame.iconHeight === 56));
    assert.ok(shown.every(frame => frame.fixed && frame.fullScreen && frame.zIndex >= 1_000_000 && frame.backdrop === 'rgb(12, 20, 33)'));
    assert.ok(shown.every(frame => frame.iconOnly && frame.noPanel && frame.staticIcon && frame.gold === 'rgb(203, 167, 96)'));
    assert.ok(frames.filter(frame => frame.cuePath).every(frame => frame.pointer === 'none' && !frame.blocksHit));
    const first = frames.find(frame => frame.cuePath === destination);
    const disappeared = frames.find(frame => frame.time > first.time && !frame.cuePath);
    assert.ok(disappeared, 'Cue must hide cleanly.');
    const duration = disappeared.time - first.time;
    const arrival = frames.find(frame => frame.path === destination && frame.cuePath === destination);
    assert.ok(arrival, 'Arrival must be observed while the overlay is visible.');
    // Slow routes must remain pending through arrival, rather than being hidden
    // prematurely to satisfy a fixed total-time assertion. Allow frame overhead.
    const expected = Math.max(450, arrival.time - first.time) + (reduced ? 100 : 150);
    assert.ok(duration >= 500 && duration <= expected + 160, `Observed cue ${duration} ms; arrival ${arrival.time - first.time} ms; expected approximately ${expected} ms.`);
    evidence.at(-1).timing = {visibleMs: duration, arrivalMs: arrival.time - first.time, expectedMs: expected};
    const opaque = shown.filter(frame => frame.opacity >= 0.99);
    assert.ok(opaque.at(-1).time - opaque[0].time >= 400, 'Human-perceptible minimum solid-navy hold.');
    if (holdResponse) assert.ok(shown.some(frame => frame.path === source && frame.phase === 'pending'), 'Painted overlay on source before arrival.');
    assert.ok(shown.some(frame => frame.path === destination), 'Destination renders while the balance is still visible.');
  }
  assert.equal(await page.locator('[data-route-transition]').count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  if (handler) await page.unroute(matchesDestination, handler);
  console.log(`${locale}/${viewport}/${reduced ? 'reduced' : 'normal'} ${label}: immediate start, ${shown.length} visible justice-balance frames, ${Math.round(evidence.at(-1).timing.visibleMs)} ms hold/fade, clean removal/nonblocking PASS`);
}

try {
  for (const locale of ['en', 'ar']) for (const viewport of ['desktop', 'mobile']) for (const reduced of [false, true]) {
    const context = await browser.newContext({
      viewport: {width: viewport === 'mobile' ? 390 : 1440, height: 900},
      reducedMotion: reduced ? 'reduce' : 'no-preference',
      storageState: citizenState,
      ...(process.env.HAQ_QA_VIDEO === '1' ? {recordVideo: {dir: path.join(out, 'videos'), size: {width: viewport === 'mobile' ? 390 : 1440, height: 900}}} : {}),
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
    // Compile server routes before measuring normal navigation in Next dev.
    // These are real isolated-session GETs, not fixtures or delayed clicks.
    for (const route of ['citizen/analyze/new', 'lawyers', 'citizen/documents']) {
      assert.equal((await context.request.get(`${base.origin}/${locale}/${route}`)).status(), 200);
    }

    await page.goto(`${base.origin}/${locale}`); await ready();
    await navigate(page, page.getByRole('button', {name: landing.hero.ctaPrimary, exact: true}).first(), `/${locale}/citizen/analyze/new`, 'home-analyze', reduced, locale, viewport);
    await page.locator('#contract-text').waitFor();

    await page.goto(`${base.origin}/${locale}`); await ready();
    await navigate(page, page.getByRole('link', {name: landing.hero.ctaSecondary, exact: true}).first(), `/${locale}/lawyers`, 'home-lawyers', reduced, locale, viewport);

    await page.goto(`${base.origin}/${locale}/citizen/dashboard`);
    await navigate(page, page.locator(`main a[href="/${locale}/citizen/documents"]`).first(), `/${locale}/citizen/documents`, 'dashboard-documents', reduced, locale, viewport);
    if (process.argv.includes('--pending')) {
      await page.goto(`${base.origin}/${locale}`); await ready();
      await navigate(page, page.getByRole('link', {name: landing.hero.ctaSecondary, exact: true}).first(), `/${locale}/lawyers`, 'pending-lawyers', reduced, locale, viewport, true);
    }
    assert.deepEqual(errors, [], 'No page or hydration errors.');
    assert.equal(external, 0, 'No external requests or Supabase traffic.');
    await context.close();
  }
  fs.writeFileSync(path.join(out, 'navigation-frames.json'), JSON.stringify(evidence, null, 2));
  console.log(`justice-transition-browser-tests: ${evidence.length} actual mouse-navigation cases PASS; start/hold screenshots; no AI/remote data writes. Reduced motion keeps static scale + short fade.`);
} finally {
  fs.writeFileSync(path.join(out, 'navigation-frames.json'), JSON.stringify(evidence, null, 2));
  await browser.close();
}

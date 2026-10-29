#!/usr/bin/env node
/*
 * Croissant Flap verification suite.
 *
 *   node run-tests.js                 # all checks, file:// and http://
 *   node run-tests.js --target=http   # only one target (file | http)
 *   node run-tests.js --only=7        # only check 7 (comma-separated ids allowed)
 *
 * Screenshots are written to tests/screenshots/<target>/.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.error('Playwright is not installed. Run:\n  cd croissant-flap/tests && npm install && npx playwright install chromium');
  process.exit(2);
}

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'screenshots');
const argv = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
  return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const TARGETS = argv.target ? [argv.target] : ['file', 'http'];
const ONLY = argv.only ? String(argv.only).split(',').map(Number) : null;

const PIN = '2468';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Static server for the http target
// ---------------------------------------------------------------------------
function startServer() {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, buf) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
        res.end(buf);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------
class Env {
  constructor(browser, base, target) {
    this.browser = browser;
    this.base = base;
    this.target = target;
    this.contexts = [];
    this.errors = [];
  }

  url(test = true) { return this.base + (test ? '?test=1' : ''); }

  async open(opts = {}) {
    const { test = true, initScript, ...ctxOpts } = opts;
    const ctx = await this.browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true, ...ctxOpts });
    this.contexts.push(ctx);
    if (initScript) await ctx.addInitScript(initScript);
    const page = await ctx.newPage();
    this.track(page);
    await page.goto(this.url(test));
    await page.waitForFunction(() => document.getElementById('scrMenu') && !document.getElementById('scrMenu').hidden);
    return { ctx, page };
  }

  track(page) {
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') this.errors.push(`console.${m.type()}: ${m.text()}`); });
    page.on('pageerror', (e) => this.errors.push(`pageerror: ${e.message}`));
    page.on('requestfailed', (r) => this.errors.push(`requestfailed: ${r.url()} ${r.failure() && r.failure().errorText}`));
    page.on('response', (r) => { if (r.status() >= 400) this.errors.push(`http ${r.status()}: ${r.url()}`); });
  }

  async closeAll() {
    for (const c of this.contexts) await c.close().catch(() => {});
    this.contexts = [];
  }
}

const st = (page) => page.evaluate(() => window.__croissant.getState());
const step = (page, seconds, frameMs) => page.evaluate(([s, f]) => window.__croissant.step(s, f), [seconds, frameMs || 1000 / 60]);
const waitScreen = (page, name, timeout = 5000) =>
  page.waitForFunction((n) => window.__croissant.getState().screen === n, name, { timeout });
const visible = (page, sel) => page.locator(sel).first().isVisible();

async function longPressTitle(page, ms) {
  const box = await page.locator('#menuTitle').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await sleep(ms);
  await page.mouse.up();
}

async function openStaff(page) {
  await longPressTitle(page, 3200);
  await page.waitForSelector('#dlgPin:not([hidden])');
  await page.fill('#inPin', PIN);
  await page.click('#btnPinOk');
  await waitScreen(page, 'staff');
}

// A real finger swipe through raw CDP touch events (Input.synthesizeScrollGesture does not scroll in headless mode).
async function touchSwipe(cdp, x, y0, y1) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / 12 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

// Fills the leaderboard entry form through real input events.
async function fillEntry(page, name, contact, consent = true) {
  await page.fill('#inName', name);
  await page.fill('#inContact', contact);
  if (consent) await page.check('#inConsent');
}

// ---------------------------------------------------------------------------
// Autopilot (runs inside the page). It plans with a short look-ahead search
// over flap / no-flap decisions using the game's own physics constants, with a
// slightly inflated hitbox so a pass means the level is beatable with margin.
// ---------------------------------------------------------------------------
function pageAutopilot(opts) {
  const H = window.__croissant;
  const C = H.getConfig().constants;
  const LEVELS = H.getConfig().LEVELS;
  const FRAME = 1 / 60;
  const STEPS = Math.round(FRAME / C.DT);
  const HORIZON = opts.horizon || 54;
  const MARGIN = 1.5;

  function hitsRect(cx, cy, rx, ry, x0, y0, x1, y1) {
    const nx = Math.max(x0, Math.min(cx, x1));
    const ny = Math.max(y0, Math.min(cy, y1));
    const dx = (nx - cx) / rx;
    const dy = (ny - cy) / ry;
    return dx * dx + dy * dy < 1;
  }

  function decide(s) {
    const g = s.phys.gravity;
    const fv = s.phys.flap;
    const sp = s.phys.speed;
    const rx = C.HITBOX_RX + MARGIN;
    const ry = C.HITBOX_RY + MARGIN;
    const cx = C.CROISSANT_X;
    const obs = s.obstacles;
    const memo = new Set();
    let nodes = 0;
    function dead(y, k) {
      if (y + ry >= C.GROUND_Y) return true;
      const shift = sp * C.DT * k;
      for (let i = 0; i < obs.length; i++) {
        const o = obs[i];
        const x0 = o.x - shift;
        const x1 = x0 + o.w;
        if (x1 < cx - rx || x0 > cx + rx) continue;
        if (hitsRect(cx, y, rx, ry, x0, -1e4, x1, o.gapTop) || hitsRect(cx, y, rx, ry, x0, o.gapBottom, x1, 1e4)) return true;
      }
      return false;
    }
    function frameSim(y, vy, flap, f) {
      for (let i = 0; i < STEPS; i++) {
        if (flap && i === 0) vy = fv;
        vy = Math.min(vy + g * C.DT, C.TERMINAL_VY);
        y += vy * C.DT;
        if (y < C.CEILING_Y) { y = C.CEILING_Y; if (vy < 0) vy = 0; }
        if (dead(y, f * STEPS + i + 1)) return null;
      }
      return [y, vy];
    }
    function ok(f, y, vy) {
      if (f >= HORIZON) return true;
      if (++nodes > 150000) return true;
      const key = f + '|' + Math.round(y * 2) + '|' + Math.round(vy / 4);
      if (memo.has(key)) return false;
      let r = frameSim(y, vy, false, f);
      if (r && ok(f + 1, r[0], r[1])) return true;
      r = frameSim(y, vy, true, f);
      if (r && ok(f + 1, r[0], r[1])) return true;
      memo.add(key);
      return false;
    }
    const r0 = frameSim(s.croissant.y, s.croissant.vy, false, 0);
    return !(r0 && ok(1, r0[0], r0[1]));
  }

  if (opts.start === 'level') {
    H.setSeed(opts.seed);
    H.startAtLevel(opts.level, opts.lock);
  } else {
    H.flap(); // first flap from the ready screen starts a normal run
  }

  // Audit obstacle generation while playing.
  const seen = new Map();
  const violations = [];
  const spacings = LEVELS.map((L) => L.spacing);
  let prev = null;
  function audit(s) {
    const L = LEVELS[s.level - 1];
    s.obstacles.forEach((o) => {
      const key = Math.round((o.x + s.distance) * 1000);
      const rec = seen.get(key);
      if (!rec) {
        seen.set(key, { gap: o.gap, center: o.gapCenter });
        if (o.gapTop < C.GAP_MARGIN - 1e-6 || o.gapBottom > C.GROUND_Y - C.GAP_MARGIN + 1e-6) violations.push('gap outside margins');
        if (Math.abs(o.gapBottom - o.gapTop - o.gap) > 1e-6) violations.push('gap height mismatch');
        if (prev) {
          const dx = o.x + s.distance - prev.wx;
          if (!spacings.some((v) => Math.abs(v - dx) < 1e-3)) violations.push('unexpected spacing ' + dx);
          if (dx < L.spacing - 1e-3 && Math.abs(dx - LEVELS[Math.max(0, s.level - 2)].spacing) > 1e-3) violations.push('spacing ' + dx + ' below level ' + s.level);
          if (Math.abs(o.gapCenter - prev.center) > L.maxShift + 1e-6) violations.push('gap shift ' + Math.abs(o.gapCenter - prev.center).toFixed(1) + ' > ' + L.maxShift);
        }
        prev = { wx: o.x + s.distance, center: o.gapCenter };
      } else if (rec.gap !== o.gap || rec.center !== o.gapCenter) {
        violations.push('obstacle changed after spawning');
      }
    });
  }

  const log = [];
  let last = -1;
  let frames = 0;
  while (frames < opts.maxFrames) {
    const s = H.getState();
    if (s.score !== last) { log.push([s.score, s.level]); last = s.score; }
    if (s.screen !== 'playing' || s.score >= opts.targetScore) break;
    audit(s);
    if (decide(s)) H.flap();
    H.step(FRAME, FRAME * 1000);
    frames++;
  }
  const end = H.getState();
  return { score: end.score, screen: end.screen, level: end.level, frames, log, violations: violations.slice(0, 10) };
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------
const checks = [];
const check = (id, name, fn) => checks.push({ id, name, fn });

check(1, 'Console: zero errors and zero failed requests on every screen', async (env) => {
  const { page } = await env.open();
  const visit = async (sel, screen) => { await page.click(sel); await waitScreen(page, screen); };
  await visit('[data-go="howto"]', 'howto');
  await visit('#scrHowTo [data-back]', 'menu');
  await visit('[data-go="prizes"]', 'prizes');
  await visit('#scrPrizes [data-back]', 'menu');
  await visit('[data-go="leaderboard"]', 'leaderboard');
  await visit('#scrLeaderboard [data-back]', 'menu');
  await visit('#btnPlay', 'ready');
  await page.keyboard.press('Space');
  await waitScreen(page, 'playing');
  await page.keyboard.press('KeyP');
  await waitScreen(page, 'paused');
  await page.click('#btnResume');
  await waitScreen(page, 'countdown');
  await step(page, 3.05);
  assert.strictEqual((await st(page)).screen, 'playing');
  await page.keyboard.press('Escape');
  await waitScreen(page, 'paused');
  await page.click('#btnEndRun');
  await step(page, 0.05);
  await page.evaluate(() => window.__croissant.endRunWithScore(12, 2));
  await step(page, 1.1);
  await fillEntry(page, 'Walker', 'walk@example.com');
  await page.click('#btnSave');
  await page.click('#btnGoMenu');
  await waitScreen(page, 'menu');
  await page.evaluate(() => window.__croissant.realtime());
  await openStaff(page);
  const dl = page.waitForEvent('download');
  await page.click('#btnExportJson');
  await dl;
  await page.click('#scrStaff [data-back]');
  await waitScreen(page, 'menu');
  await sleep(300);
  return 'visited menu, how to play, prizes, leaderboard, ready, playing, paused, countdown, game over, staff';
});

check(2, 'Level config is monotonic and levels change at exactly 10/20/30/45/60/80', async (env) => {
  const { page } = await env.open();
  const { LEVELS } = await page.evaluate(() => window.__croissant.getConfig());
  assert.strictEqual(LEVELS.length, 7, 'exactly 7 levels');
  for (let i = 1; i < LEVELS.length; i++) {
    const a = LEVELS[i - 1];
    const b = LEVELS[i];
    assert.ok(b.startsAt > a.startsAt, 'thresholds increase');
    assert.ok(b.speed > a.speed, 'speed increases');
    assert.ok(b.gravity > a.gravity, 'gravity increases');
    assert.ok(b.gap < a.gap, 'gap decreases');
    assert.ok(b.spacing <= a.spacing, 'spacing does not grow');
  }
  const jumps = LEVELS.map((L) => (L.flap * L.flap) / (2 * L.gravity));
  jumps.forEach((j, i) => assert.ok(j >= 50 && j <= 60, `level ${i + 1} jump ${j.toFixed(1)} px is outside 50-60`));
  assert.deepStrictEqual(LEVELS.map((L) => L.startsAt), [0, 10, 20, 30, 45, 60, 80]);

  // Play a normal run (from the ready screen) to 81 points with the autopilot.
  let result = null;
  for (const seed of [11, 12, 13, 14, 15]) {
    await page.evaluate((s) => window.__croissant.setSeed(s), seed);
    await page.click('#btnPlay');
    await waitScreen(page, 'ready');
    result = await page.evaluate(pageAutopilot, { start: 'ready', targetScore: 81, maxFrames: 60 * 400 });
    if (result.score >= 81) break;
    await page.evaluate(() => window.__croissant.endRunWithScore(0, 1));
    await step(page, 1.1);
    await page.click('#btnGoMenu');
  }
  assert.ok(result.score >= 81, `autopilot only reached ${result.score} in progressive mode`);
  assert.deepStrictEqual(result.violations, [], 'obstacle audit');
  const expected = (score) => LEVELS.reduce((lv, L) => (score >= L.startsAt ? L.level : lv), 1);
  for (const [score, level] of result.log) assert.strictEqual(level, expected(score), `score ${score} should be level ${expected(score)}, got ${level}`);
  const changes = [];
  for (let i = 1; i < result.log.length; i++) if (result.log[i][1] !== result.log[i - 1][1]) changes.push(result.log[i][0]);
  assert.deepStrictEqual(changes, [10, 20, 30, 45, 60, 80]);
  return `jump heights ${jumps.map((j) => j.toFixed(1)).join(', ')} px; level changed at ${changes.join(', ')} points`;
});

check(3, 'Beatable: autopilot passes 30+ obstacles on every level with 5 seeds', async (env) => {
  const { page } = await env.open();
  const rows = [];
  for (let level = 1; level <= 7; level++) {
    const scores = [];
    for (const seed of [1, 2, 3, 4, 5]) {
      const r = await page.evaluate(pageAutopilot, { start: 'level', level, lock: true, seed, targetScore: 30, maxFrames: 60 * 200 });
      assert.deepStrictEqual(r.violations, [], `level ${level} seed ${seed} obstacle audit`);
      assert.strictEqual(r.level, level, 'level stays locked');
      assert.ok(r.score >= 30, `level ${level} seed ${seed}: autopilot passed only ${r.score} obstacles (screen ${r.screen})`);
      scores.push(r.score);
    }
    rows.push(`L${level}: ${scores.join('/')}`);
  }
  return rows.join('  ');
});

check(4, 'Frame-rate independence (33.3 / 16.7 / 8.3 / 6.9 ms frames)', async (env) => {
  const { page } = await env.open();
  const runs = [];
  for (const fm of [33.3, 16.7, 8.3, 6.9]) {
    runs.push(await page.evaluate((frameMs) => {
      const H = window.__croissant;
      H.setSeed(7);
      H.startAtLevel(1, true);
      const peaks = [];
      for (const wait of [0.41, 0.37, 0.53]) {
        H.resetPeak();
        H.flap();
        H.step(wait, frameMs);
        peaks.push(H.getState().croissant.peakY);
      }
      const s = H.getState();
      return { frameMs, peaks, y: s.croissant.y, distance: s.distance };
    }, fm));
  }
  const base = runs[0];
  for (const r of runs.slice(1)) {
    r.peaks.forEach((p, i) => assert.ok(Math.abs(p - base.peaks[i]) < 1, `peak ${i} differs: ${p} vs ${base.peaks[i]} at ${r.frameMs} ms`));
    assert.ok(Math.abs(r.distance - base.distance) < 0.01, `scroll distance differs at ${r.frameMs} ms`);
    assert.ok(Math.abs(r.y - base.y) < 1, `final y differs at ${r.frameMs} ms`);
  }
  const spread = Math.max(...runs.map((r) => Math.max(...r.peaks.map((p, i) => Math.abs(p - base.peaks[i])))));
  return `peaks ${base.peaks.map((p) => p.toFixed(2)).join(' / ')}; max difference ${spread.toExponential(1)} px`;
});

check(5, 'Input: keyboard, mouse, touch, key repeat, text fields, HUD buttons, crash lock, auto-pause', async (env) => {
  const notes = [];
  // Keyboard and mouse
  const { page } = await env.open();
  await page.click('#btnPlay');
  await waitScreen(page, 'ready');
  await page.keyboard.press('Space');
  await waitScreen(page, 'playing');
  await step(page, 1 / 60); // freeze the clock and apply the queued flap
  let s = await st(page);
  assert.strictEqual(s.flaps, 1, 'Space starts the run and flaps');
  const flapWith = async (fn, label) => {
    const before = (await st(page)).flaps;
    await fn();
    await step(page, 1 / 60);
    const after = (await st(page)).flaps;
    assert.strictEqual(after, before + 1, `${label} should flap once`);
  };
  await flapWith(() => page.keyboard.press('ArrowUp'), 'ArrowUp');
  await flapWith(() => page.keyboard.press('KeyW'), 'W');
  const fb = await page.locator('#frame').boundingBox();
  await flapWith(() => page.mouse.click(fb.x + fb.width * 0.5, fb.y + fb.height * 0.75), 'mouse click');
  // Holding Space must flap once only (repeat events ignored).
  const beforeHold = (await st(page)).flaps;
  await page.keyboard.down('Space');
  for (let i = 0; i < 5; i++) await page.keyboard.down('Space');
  await page.keyboard.up('Space');
  await step(page, 1 / 60);
  assert.strictEqual((await st(page)).flaps, beforeHold + 1, 'holding Space flaps once');
  // HUD buttons do not flap.
  const beforeBtns = (await st(page)).flaps;
  const muted0 = (await st(page)).muted;
  await page.click('#hud .btn-mute');
  await step(page, 1 / 60);
  s = await st(page);
  assert.strictEqual(s.flaps, beforeBtns, 'mute button does not flap');
  assert.strictEqual(s.muted, !muted0, 'mute button toggles mute');
  await page.click('#btnPause');
  await step(page, 1 / 60);
  s = await st(page);
  assert.strictEqual(s.screen, 'paused', 'pause button pauses');
  assert.strictEqual(s.flaps, beforeBtns, 'pause button does not flap');
  // Space after clicking a HUD button with the mouse must not re-press it.
  await page.click('#btnResume');
  await step(page, 3.05);
  assert.strictEqual((await st(page)).screen, 'playing', 'countdown ends in playing');
  await flapWith(() => page.keyboard.press('Space'), 'Space after clicking a button');
  notes.push('Space/Up/W/mouse flap once each; key repeat ignored; HUD buttons never flap');

  // Countdown and auto-pause
  await page.keyboard.press('KeyP');
  assert.strictEqual((await st(page)).screen, 'paused');
  await page.keyboard.press('KeyP');
  await step(page, 2.9);
  assert.strictEqual((await st(page)).screen, 'countdown', 'still counting down at 2.9 s');
  await step(page, 0.15);
  assert.strictEqual((await st(page)).screen, 'playing', 'resumes after 3 s');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  assert.strictEqual((await st(page)).screen, 'paused', 'window blur pauses');
  await page.keyboard.press('Escape');
  await step(page, 3.05);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  assert.strictEqual((await st(page)).screen, 'paused', 'hidden tab pauses');
  await page.evaluate(() => {
    delete document.hidden;
    delete document.visibilityState;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.keyboard.press('KeyP');
  await step(page, 3.05);
  const yBefore = (await st(page)).croissant.y;
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.waitForFunction(() => window.__croissant.getState().screen === 'paused');
  assert.strictEqual((await st(page)).croissant.y, yBefore, 'resize pauses without resetting the run');
  notes.push('P/Esc pause+resume with 3-2-1; blur, hidden tab and resize auto-pause');

  // Crash input lock
  await page.evaluate(() => { window.__croissant.setSeed(5); window.__croissant.startAtLevel(1, true); });
  for (let i = 0; i < 200 && (await st(page)).screen === 'playing'; i++) await step(page, 1 / 60);
  assert.strictEqual((await st(page)).screen, 'dying', 'falls and crashes without flaps');
  const fb2 = await page.locator('#frame').boundingBox();
  await page.mouse.click(fb2.x + fb2.width / 2, fb2.y + fb2.height / 2);
  await page.keyboard.press('Space');
  await step(page, 0.3);
  s = await st(page);
  assert.strictEqual(s.screen, 'dying', 'tap/Space within 300 ms of crash does nothing');
  await page.mouse.click(fb2.x + fb2.width / 2, fb2.y + fb2.height / 2);
  await step(page, 0.25);
  assert.strictEqual((await st(page)).screen, 'dying', 'still locked at 550 ms');
  await step(page, 0.1);
  s = await st(page);
  assert.strictEqual(s.screen, 'gameover', 'panel shown after 600 ms');
  assert.strictEqual(s.gameoverArmed, false, 'panel buttons not armed yet');
  assert.ok(await page.locator('#btnRetry').isDisabled(), 'Retry disabled right after the panel appears');
  await page.locator('#btnRetry').click({ force: true });
  await page.keyboard.press('Space');
  assert.strictEqual((await st(page)).screen, 'gameover', 'early Retry/Space ignored');
  await step(page, 0.45);
  assert.ok(await page.locator('#btnRetry').isEnabled(), 'Retry enabled after the lock');
  await page.click('#btnRetry');
  assert.strictEqual((await st(page)).screen, 'ready', 'Retry works after the lock');
  notes.push('taps at 0-600 ms after a crash ignored; Retry armed at 1 s');

  // Typing in the name field
  await page.evaluate(() => window.__croissant.endRunWithScore(5, 1));
  await step(page, 1.1);
  const mutedBefore = (await st(page)).muted;
  await page.click('#inName');
  await page.keyboard.type('M P W  ');
  s = await st(page);
  assert.strictEqual(s.muted, mutedBefore, 'typing M in the name field does not mute');
  assert.strictEqual(s.screen, 'gameover', 'typing P/space in the name field does not pause or retry');
  assert.strictEqual(await page.inputValue('#inName'), 'M P W  ');
  await page.click('#inContact');
  await page.keyboard.type('m p');
  assert.strictEqual((await st(page)).muted, mutedBefore, 'typing in the contact field does not mute');
  notes.push('hotkeys ignored in text fields');

  // Touch
  const t = await env.open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  const tp = t.page;
  await tp.tap('#btnPlay');
  await waitScreen(tp, 'ready');
  const tb = await tp.locator('#frame').boundingBox();
  await tp.touchscreen.tap(tb.x + tb.width / 2, tb.y + tb.height * 0.7);
  await waitScreen(tp, 'playing');
  await step(tp, 1 / 60);
  assert.strictEqual((await st(tp)).flaps, 1, 'touch tap starts and flaps');
  await tp.touchscreen.tap(tb.x + tb.width / 2, tb.y + tb.height * 0.7);
  await step(tp, 1 / 60);
  assert.strictEqual((await st(tp)).flaps, 2, 'second tap flaps once (no double flap)');
  const tMuted = (await st(tp)).muted;
  await tp.tap('#hud .btn-mute');
  await step(tp, 1 / 60);
  assert.strictEqual((await st(tp)).flaps, 2, 'tapping mute does not flap');
  assert.strictEqual((await st(tp)).muted, !tMuted, 'tapping mute toggles');
  await tp.tap('#btnPause');
  await step(tp, 1 / 60);
  assert.strictEqual((await st(tp)).screen, 'paused', 'tapping pause pauses');
  assert.strictEqual((await st(tp)).flaps, 2, 'tapping pause does not flap');
  notes.push('touch tap flaps exactly once; tapping HUD buttons never flaps');
  return notes.join('; ');
});

const VIEWPORTS = [
  { name: '1920x1080', viewport: { width: 1920, height: 1080 } },
  { name: '1366x768', viewport: { width: 1366, height: 768 } },
  { name: '390x844', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  { name: '360x800', viewport: { width: 360, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: '844x390', viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
];

function pageLayoutAudit() {
  const problems = [];
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const de = document.documentElement;
  if (de.scrollWidth > vw || de.scrollHeight > vh || document.body.scrollWidth > vw || document.body.scrollHeight > vh) problems.push('page has scrollbars');
  const fr = document.getElementById('frame').getBoundingClientRect();
  const aspect = fr.width / fr.height;
  if (Math.abs(aspect - 360 / 640) > 0.01) problems.push('frame aspect ' + aspect.toFixed(4));
  if (fr.left < -0.5 || fr.top < -0.5 || fr.right > vw + 0.5 || fr.bottom > vh + 0.5) problems.push('frame outside viewport');
  const desc = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').join('.') : '') + ' "' + (e.textContent || '').trim().slice(0, 20) + '"';
  const isVisible = (e) => {
    if (e.closest('[hidden]')) return false;
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
  };
  const controls = Array.from(document.querySelectorAll('#frame button, #frame input[type=text], #frame input[type=password], #frame label.check')).filter(isVisible);
  controls.forEach((c) => {
    const r = c.getBoundingClientRect();
    if (r.width < 43.5 || r.height < 43.5) problems.push('tap target too small: ' + desc(c) + ' ' + r.width.toFixed(1) + 'x' + r.height.toFixed(1));
    if (r.left < fr.left - 0.5 || r.right > fr.right + 0.5) problems.push('control outside frame: ' + desc(c));
  });
  for (let i = 0; i < controls.length; i++) {
    for (let j = i + 1; j < controls.length; j++) {
      const a = controls[i].getBoundingClientRect();
      const b = controls[j].getBoundingClientRect();
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 1 && oy > 1) problems.push('controls overlap: ' + desc(controls[i]) + ' / ' + desc(controls[j]));
    }
  }
  Array.from(document.querySelectorAll('#frame *')).filter((e) => isVisible(e) && e.id !== 'testBadge' &&
    Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())).forEach((t) => {
    const size = parseFloat(getComputedStyle(t).fontSize);
    if (size < 12) problems.push('text smaller than 12px: ' + desc(t) + ' ' + size);
    const r = t.getBoundingClientRect();
    if (r.right > fr.right + 1 || r.left < fr.left - 1) problems.push('text outside frame: ' + desc(t));
  });
  document.querySelectorAll('.panel').forEach((p) => {
    if (isVisible(p) && p.scrollWidth > p.clientWidth + 1) problems.push('panel overflows sideways: ' + desc(p));
  });
  // Buttons that sit directly in a list panel (Back, Close, exports) must be on screen without scrolling.
  document.querySelectorAll('.panel.has-list .btn').forEach((b) => {
    if (!isVisible(b)) return;
    const r = b.getBoundingClientRect();
    const pr = b.closest('.panel').getBoundingClientRect();
    if (r.top < pr.top - 0.5 || r.bottom > pr.bottom + 0.5 || r.bottom > fr.bottom + 0.5) problems.push('button needs scrolling to reach: ' + desc(b));
  });
  const scrollers = Array.from(document.querySelectorAll('.panel, .scroll')).filter((p) => isVisible(p) && p.scrollHeight > p.clientHeight + 1);
  scrollers.forEach((p, i) => p.setAttribute('data-scroll-probe', String(i)));
  return { problems, scrolling: scrollers.length, frame: [Math.round(fr.width), Math.round(fr.height)] };
}

check(6, 'Layout: every screen at 5 sizes (screenshots + automated audit)', async (env) => {
  const dir = path.join(SHOTS, env.target);
  fs.mkdirSync(dir, { recursive: true });
  const problems = [];
  const scrolled = [];
  for (const vp of VIEWPORTS) {
    const { name, ...ctxOpts } = vp;
    const { page } = await env.open(ctxOpts);
    // Long, wide names stress the leaderboard layout.
    await page.evaluate(() => {
      const names = ['WWWWWWWWWWWW', 'Nur Aisyah', 'Mei Ling 22', 'Bartholomew', 'Siti', 'Jean Paul', 'Kumar R', 'Ana', 'Zoe Q', 'Li Wei'];
      names.forEach((n, i) => window.__croissant.leaderboard.add({
        name: n, contact: 'p' + i + '@example.com', score: 100 - i * 9, level: Math.max(1, 7 - Math.floor(i / 2)),
        at: new Date(Date.UTC(2026, 9, 29, 10, i)).toISOString()
      }));
    });
    await page.reload();
    await waitScreen(page, 'menu');
    const cdp = ctxOpts.hasTouch ? await page.context().newCDPSession(page) : null;
    const shoot = async (screen) => {
      await sleep(80);
      await page.screenshot({ path: path.join(dir, `${name}-${screen}.png`) });
      const a = await page.evaluate(pageLayoutAudit);
      a.problems.forEach((p) => problems.push(`${name} ${screen}: ${p}`));
      if (!a.scrolling) return;
      scrolled.push(`${name} ${screen}`);
      if (!cdp) return;
      // The page blocks touch gestures globally, so prove each scrollable area really scrolls with a finger.
      for (let i = 0; i < a.scrolling; i++) {
        const sel = `[data-scroll-probe="${i}"]`;
        const box = await page.locator(sel).boundingBox();
        await touchSwipe(cdp, box.x + box.width / 2, box.y + box.height * 0.75, box.y + box.height * 0.3);
        await sleep(250);
        const top = await page.$eval(sel, (e) => e.scrollTop);
        if (!(top > 0)) problems.push(`${name} ${screen}: scroll area ${sel} does not scroll by touch`);
        await page.$eval(sel, (e) => { e.scrollTop = 0; e.removeAttribute('data-scroll-probe'); });
      }
    };
    await shoot('menu');
    await page.click('[data-go="leaderboard"]'); await waitScreen(page, 'leaderboard'); await shoot('leaderboard');
    await page.click('#scrLeaderboard [data-back]');
    await page.click('[data-go="prizes"]'); await waitScreen(page, 'prizes'); await shoot('prizes');
    await page.click('#scrPrizes [data-back]');
    await page.click('[data-go="howto"]'); await waitScreen(page, 'howto'); await shoot('howto');
    await page.click('#scrHowTo [data-back]');
    await openStaff(page); await shoot('staff');
    await page.click('#scrStaff [data-back]');
    await page.click('#btnPlay'); await waitScreen(page, 'ready');
    await step(page, 0.2); await shoot('ready');
    await page.evaluate(() => {
      const H = window.__croissant;
      H.setSeed(4);
      H.startAtLevel(3, true);
      for (let i = 0; i < 4; i++) { H.flap(); H.step(0.3); }
    });
    await shoot('playing');
    await page.click('#btnPause'); await waitScreen(page, 'paused'); await shoot('paused');
    await page.evaluate(() => window.__croissant.endRunWithScore(57, 5));
    await step(page, 1.1);
    assert.ok(await visible(page, '#entryForm'), 'entry form shown for a qualifying score');
    await shoot('gameover-form');
  }
  assert.deepStrictEqual(problems, []);
  return `${VIEWPORTS.length * 9} screenshots in tests/screenshots/${env.target}/; no audit problems` +
    (scrolled.length ? `; scrolling areas (touch-scroll verified on phones): ${scrolled.join(', ')}` : '');
});

check(7, 'Leaderboard: ranking, ties, one entry per person, top 10, highlight, persistence, validation, storage failures', async (env) => {
  const { ctx, page } = await env.open();
  const T0 = Date.UTC(2026, 9, 29, 9, 0, 0);
  const at = (m) => new Date(T0 + m * 60000).toISOString();
  const results = await page.evaluate((entries) => entries.map((e) => window.__croissant.leaderboard.add(e).status), [
    { name: 'Ali', contact: 'ali@example.com', score: 50, level: 6, at: at(1) },
    { name: 'Bea', contact: '+60 12-345 6789', score: 50, level: 6, at: at(2) },
    { name: 'Chen', contact: 'chen@example.com', score: 40, level: 5, at: at(3) },
    { name: 'Ali B', contact: ' ALI@example.com ', score: 30, level: 4, at: at(4) },
    { name: 'Dina', contact: 'dina@example.com', score: 45, level: 5, at: at(5) },
    { name: 'Eko', contact: 'eko@example.com', score: 20, level: 3, at: at(6) },
    { name: 'Faye', contact: 'faye@example.com', score: 10, level: 2, at: at(7) },
    { name: 'Gus', contact: 'gus@example.com', score: 35, level: 4, at: at(8) },
    { name: 'Hana', contact: '0123456789', score: 25, level: 3, at: at(9) },
    { name: 'Ivy', contact: 'ivy@example.com', score: 15, level: 2, at: at(10) },
    { name: 'Jon', contact: 'jon@example.com', score: 5, level: 1, at: at(11) },
    { name: 'Bea', contact: '60123456789', score: 60, level: 6, at: at(12) },
    { name: 'Kai', contact: 'kai@example.com', score: 45, level: 5, at: at(13) }
  ]);
  assert.deepStrictEqual(results, ['added', 'added', 'added', 'kept', 'added', 'added', 'added', 'added', 'added', 'added', 'added', 'added', 'added']);
  const expectedOrder = ['Bea', 'Ali', 'Dina', 'Kai', 'Chen', 'Gus', 'Hana', 'Eko', 'Ivy', 'Faye'];
  let list = await page.evaluate(() => window.__croissant.leaderboard.list());
  assert.deepStrictEqual(list.map((e) => e.name), expectedOrder, 'ranking with tie rule, dedupe and top-10 cut');
  assert.ok(!(await page.evaluate(() => window.__croissant.leaderboard.qualifies(10))), '10 does not beat the 10th place (tie goes to the earlier score)');
  assert.ok(await page.evaluate(() => window.__croissant.leaderboard.qualifies(11)), '11 beats the 10th place');
  assert.ok(!(await page.evaluate(() => window.__croissant.leaderboard.qualifies(0))), '0 never qualifies');

  // Persistence and public view
  await page.reload();
  await waitScreen(page, 'menu');
  await page.click('[data-go="leaderboard"]');
  await waitScreen(page, 'leaderboard');
  const rows = await page.$$eval('#lbList li', (lis) => lis.map((li) => ({ cls: li.className, name: li.querySelector('.name').textContent, prize: (li.querySelector('.prize') || {}).textContent || '', rank: li.querySelector('.rank').textContent })));
  assert.deepStrictEqual(rows.map((r) => r.name), expectedOrder, 'order survives reload');
  assert.deepStrictEqual(rows.slice(0, 3).map((r) => r.cls), ['p1', 'p2', 'p3'], 'top 3 highlighted');
  assert.deepStrictEqual(rows.slice(0, 3).map((r) => r.rank), ['1st', '2nd', '3rd']);
  assert.deepStrictEqual(rows.slice(0, 3).map((r) => r.prize), ['Prize: Stand Mixer', 'Prize: Kitchen Scale', 'Prize: Kitchen Scale']);
  assert.ok(rows.slice(3).every((r) => r.cls === '' && r.prize === ''), 'no highlight or prize below 3rd');
  const publicText = await page.locator('#scrLeaderboard').innerText();
  for (const c of ['@example.com', '6789', '0123456789']) assert.ok(!publicText.includes(c), `public leaderboard must not show contact "${c}"`);
  await page.click('#scrLeaderboard [data-back]');

  // Entry form validation through the UI
  await page.evaluate(() => window.__croissant.endRunWithScore(70, 6));
  await step(page, 1.1);
  assert.ok(await visible(page, '#entryForm'), 'form shown for a top-10 score');
  assert.ok(!(await visible(page, '#goActions')), 'Retry/Menu hidden until save or skip');
  const saveDisabled = () => page.locator('#btnSave').isDisabled();
  await page.evaluate(() => { const i = document.getElementById('inName'); i.value = 'ABCDEFGHIJKLM'; i.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.fill('#inContact', 'zed@example.com');
  await page.check('#inConsent');
  assert.ok(await saveDisabled(), '13-character name rejected');
  assert.ok(await visible(page, '#errName'), 'name error shown');
  await page.fill('#inName', '<b>x</b>');
  assert.ok(await saveDisabled(), '"<b>x</b>" rejected');
  await page.fill('#inName', 'Zed  Q');
  await page.fill('#inContact', '12345');
  assert.ok(await saveDisabled(), 'short phone rejected');
  await page.fill('#inContact', 'zed@example.com');
  await page.uncheck('#inConsent');
  assert.ok(await saveDisabled(), 'consent required');
  await page.check('#inConsent');
  assert.ok(!(await saveDisabled()), 'valid form can be saved');
  await page.click('#btnSave');
  assert.match(await page.textContent('#goResult'), /#1/);
  assert.ok(await visible(page, '#goActions'), 'Retry/Menu shown after save');
  list = await page.evaluate(() => window.__croissant.leaderboard.list());
  assert.strictEqual(list[0].name, 'Zed Q', 'name trimmed and spaces collapsed');
  assert.strictEqual(list.length, 10);
  const lowRun = await page.evaluate(() => { window.__croissant.endRunWithScore(3, 1); window.__croissant.step(1.1); return window.__croissant.getState().qualifies; });
  assert.strictEqual(lowRun, false);
  assert.ok(!(await visible(page, '#entryForm')), 'no form for a score outside the top 10');

  // Corrupt data
  const key = (await st(page)).storageKey;
  await page.evaluate((k) => localStorage.setItem(k, '{"leaderboard": [oops'), key);
  await page.reload();
  await waitScreen(page, 'menu');
  assert.strictEqual((await st(page)).storage, 'reset');
  assert.ok(await visible(page, '#scrMenu .storage-notice'), 'notice shown for corrupt data');
  assert.strictEqual(await page.evaluate((k) => localStorage.getItem(k + '.corrupt-backup'), key), '{"leaderboard": [oops', 'corrupt data backed up');
  await page.click('#btnPlay');
  await page.keyboard.press('Space');
  await waitScreen(page, 'playing');
  await ctx.close();

  // Blocked storage
  const b = await env.open({
    initScript: () => {
      Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('The operation is insecure.', 'SecurityError'); } });
    }
  });
  const bp = b.page;
  assert.strictEqual((await st(bp)).storage, 'blocked');
  assert.ok(await visible(bp, '#scrMenu .storage-notice'), 'notice shown when storage is blocked');
  assert.match(await bp.textContent('#scrMenu .storage-notice'), /can't be saved/);
  await bp.click('#btnPlay');
  await bp.keyboard.press('Space');
  await waitScreen(bp, 'playing');
  await bp.evaluate(() => window.__croissant.endRunWithScore(8, 1));
  await step(bp, 1.1);
  await fillEntry(bp, 'Blocked', 'b@example.com');
  await bp.click('#btnSave');
  assert.match(await bp.textContent('#goResult'), /can't store scores/);
  return 'order ' + expectedOrder.join(' > ') + '; tie, dedupe, top-10, highlight, reload, validation, corrupt and blocked storage all OK';
});

check(8, 'Staff panel: PIN, contacts, CSV/JSON export, protected clear', async (env) => {
  const { page } = await env.open();
  await page.evaluate(() => {
    const L = window.__croissant.leaderboard;
    L.add({ name: 'Phone Fan', contact: '+60123456789', score: 42, level: 5, at: '2026-10-29T02:00:00.000Z' });
    L.add({ name: 'Mail Q', contact: 'm"q@example.com', score: 30, level: 4, at: '2026-10-29T02:05:00.000Z' });
    L.add({ name: 'Eq', contact: '=1+1@example.com', score: 12, level: 2, at: '2026-10-29T02:10:00.000Z' });
  });
  // A short press must not open the PIN dialog.
  await longPressTitle(page, 800);
  await sleep(2500);
  assert.ok(!(await visible(page, '#dlgPin')), 'short press does not open the PIN dialog');
  await longPressTitle(page, 3200);
  await page.waitForSelector('#dlgPin:not([hidden])');
  const mutedBefore = (await st(page)).muted;
  await page.keyboard.type('0000m');
  assert.strictEqual((await st(page)).muted, mutedBefore, 'typing in the PIN field does not mute');
  await page.click('#btnPinOk');
  assert.match(await page.textContent('#pinErr'), /Wrong PIN/);
  assert.notStrictEqual((await st(page)).screen, 'staff', 'wrong PIN rejected');
  await page.fill('#inPin', PIN);
  await page.click('#btnPinOk');
  await waitScreen(page, 'staff');
  const staffText = await page.locator('#staffList').innerText();
  assert.ok(staffText.includes('+60123456789') && staffText.includes('m"q@example.com'), 'staff view shows contacts');

  let dlp = page.waitForEvent('download');
  await page.click('#btnExportCsv');
  let dl = await dlp;
  assert.match(dl.suggestedFilename(), /^croissant-flap-leaderboard-\d{4}-\d{2}-\d{2}\.csv$/);
  const csvBuf = fs.readFileSync(await dl.path());
  assert.deepStrictEqual([...csvBuf.slice(0, 3)], [0xef, 0xbb, 0xbf], 'CSV starts with a UTF-8 BOM');
  const csv = csvBuf.toString('utf8').slice(1);
  const lines = csv.trim().split('\r\n');
  assert.strictEqual(lines.length, 4, 'header + 3 rows');
  assert.ok(lines[0].startsWith('"Rank","Name","Contact","Score"'), 'header row');
  assert.ok(lines.every((l) => /^"(?:[^"]|"")*"(,"(?:[^"]|"")*")*$/.test(l)), 'every value quoted');
  assert.ok(lines[1].includes(`"'+60123456789"`), 'phone exported with apostrophe prefix');
  assert.ok(lines[2].includes('"m""q@example.com"'), 'embedded quotes are doubled');
  assert.ok(lines[3].includes(`"'=1+1@example.com"`), 'formula-like value neutralised');

  dlp = page.waitForEvent('download');
  await page.click('#btnExportJson');
  dl = await dlp;
  assert.match(dl.suggestedFilename(), /\.json$/);
  const json = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  assert.strictEqual(json.leaderboard.length, 3, 'JSON contains every entry');
  assert.strictEqual(json.leaderboard[0].contact, '+60123456789');

  await page.click('#btnClear');
  await page.waitForSelector('#dlgConfirm:not([hidden])');
  await page.click('#dlgConfirm [data-close]');
  assert.strictEqual((await page.evaluate(() => window.__croissant.leaderboard.list())).length, 3, 'cancel keeps the scores');
  await page.click('#btnClear');
  await page.waitForSelector('#dlgConfirm:not([hidden])');
  await page.click('#btnConfirmOk');
  assert.strictEqual((await page.evaluate(() => window.__croissant.leaderboard.list())).length, 0, 'confirm clears');
  assert.match(await page.locator('#staffList').innerText(), /No scores yet/);
  await page.reload();
  assert.strictEqual((await page.evaluate(() => window.__croissant.leaderboard.list())).length, 0, 'clear persists');
  return 'short press ignored; wrong PIN rejected; CSV (BOM, quoted, injection-safe) and JSON exports verified; clear needs confirmation';
});

check(9, 'Audio: nothing before interaction, starts on first tap, mute persists, music stops when paused/hidden', async (env) => {
  const { page } = await env.open();
  await sleep(600);
  let a = (await st(page)).audio;
  assert.strictEqual(a.contextState, 'none', 'no AudioContext before interaction');
  assert.strictEqual(a.notesScheduled, 0, 'no notes before interaction');
  assert.strictEqual(a.musicPlaying, false);
  await page.click('#btnPlay');
  await page.waitForFunction(() => window.__croissant.getState().audio.contextState === 'running', null, { timeout: 3000 });
  await sleep(400);
  a = (await st(page)).audio;
  assert.ok(a.musicPlaying && a.notesScheduled > 0, 'music scheduled after the first tap');
  assert.strictEqual(a.masterGain, 1);
  await page.keyboard.press('KeyM');
  a = (await st(page)).audio;
  assert.strictEqual(a.masterGain, 0, 'M sets master gain to 0');
  await page.reload();
  await waitScreen(page, 'menu');
  assert.strictEqual((await st(page)).muted, true, 'mute survives reload');
  assert.ok((await page.getAttribute('#scrMenu .btn-mute', 'aria-pressed')) === 'true', 'mute button shows muted state');
  await page.click('#btnPlay');
  await page.waitForFunction(() => window.__croissant.getState().audio.contextState === 'running');
  assert.strictEqual((await st(page)).audio.masterGain, 0, 'new AudioContext starts muted');
  await page.click('#hud .btn-mute');
  assert.strictEqual((await st(page)).audio.masterGain, 1, 'unmute restores gain');

  // Paused: music stops and no new notes are scheduled.
  await page.keyboard.press('Space');
  await waitScreen(page, 'playing');
  await page.keyboard.press('KeyP');
  await waitScreen(page, 'paused');
  const n1 = (await st(page)).audio.notesScheduled;
  await sleep(600);
  a = (await st(page)).audio;
  assert.strictEqual(a.musicPlaying, false, 'music stopped while paused');
  assert.strictEqual(a.notesScheduled, n1, 'no notes scheduled while paused');
  await page.click('#btnResume');
  await sleep(300);
  assert.ok((await st(page)).audio.musicPlaying, 'music resumes after pause');
  await page.evaluate(() => window.__croissant.endRunWithScore(0, 1));
  await step(page, 1.1);
  await page.click('#btnGoMenu');
  await page.evaluate(() => window.__croissant.realtime());

  // Hidden tab: music stops; visible again: music resumes on the menu.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const n2 = (await st(page)).audio.notesScheduled;
  await sleep(600);
  a = (await st(page)).audio;
  assert.strictEqual(a.musicPlaying, false, 'music stopped while hidden');
  assert.strictEqual(a.notesScheduled, n2, 'no notes scheduled while hidden');
  await page.evaluate(() => {
    delete document.hidden;
    delete document.visibilityState;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await sleep(300);
  assert.ok((await st(page)).audio.musicPlaying, 'music resumes when visible again');

  // Tempo rises 3 BPM per level, applied at the next bar.
  await page.evaluate(() => window.__croissant.startAtLevel(7, true));
  await page.waitForFunction(() => window.__croissant.getState().audio.tempo === 138, null, { timeout: 4000 });
  return 'context created only on first gesture; mute = gain 0 and persists; music stops when paused or hidden; Level 7 tempo 138 BPM';
});

check(10, 'Test isolation: test mode uses its own storage key; no hook in normal mode', async (env) => {
  const t = await env.open();
  await t.page.keyboard.press('KeyM');
  await t.page.evaluate(() => window.__croissant.leaderboard.add({ name: 'Tess', contact: 'tess@example.com', score: 9, level: 1, at: new Date().toISOString() }));
  const keysTest = await t.page.evaluate(() => Object.keys(localStorage).sort());
  assert.deepStrictEqual(keysTest, ['croissantFlap.test.v1'], 'test mode writes only the test key');
  assert.ok(await visible(t.page, '#testBadge'), 'test badge visible in test mode');

  const n = await env.open({ test: false });
  assert.strictEqual(await n.page.evaluate(() => typeof window.__croissant), 'undefined', 'no hook without ?test=1');
  assert.ok(!(await visible(n.page, '#testBadge')), 'no test badge in normal mode');
  await n.page.keyboard.press('KeyM');
  const keysReal = await n.page.evaluate(() => Object.keys(localStorage).sort());
  assert.deepStrictEqual(keysReal, ['croissantFlap.v1'], 'normal mode writes only the real key');
  const globals = await n.page.evaluate(() => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const clean = new Set(Object.getOwnPropertyNames(iframe.contentWindow));
    iframe.remove();
    return Object.getOwnPropertyNames(window).filter((k) => !clean.has(k));
  });
  assert.deepStrictEqual(globals, [], 'no globals leak in normal mode');
  return 'test key only in test mode; real key only in normal mode; no hook or globals without ?test=1';
});

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
(async () => {
  const server = await startServer();
  const bases = {
    file: 'file://' + path.join(ROOT, 'index.html'),
    http: `http://127.0.0.1:${server.address().port}/index.html`
  };
  const browser = await chromium.launch();
  const results = [];
  for (const target of TARGETS) {
    for (const c of checks) {
      if (ONLY && !ONLY.includes(c.id)) continue;
      const env = new Env(browser, bases[target], target);
      const t0 = Date.now();
      let ok = true;
      let detail = '';
      try {
        detail = (await c.fn(env)) || '';
      } catch (e) {
        ok = false;
        detail = (e && e.message ? e.message : String(e)).split('\n').slice(0, 40).join(' ');
      }
      await sleep(50);
      await env.closeAll();
      if (env.errors.length) {
        ok = false;
        detail += ' | console/network: ' + [...new Set(env.errors)].slice(0, 5).join(' ; ');
      }
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      results.push({ target, id: c.id, name: c.name, ok, detail, secs });
      console.log(`${ok ? 'PASS' : 'FAIL'}  [${target}] ${c.id}. ${c.name} (${secs}s)\n      ${detail}`);
    }
  }
  await browser.close();
  server.close();
  fs.writeFileSync(path.join(__dirname, 'last-results.json'), JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  process.exit(failed.length ? 1 : 0);
})();

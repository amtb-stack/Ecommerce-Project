/* Vespa Raya The Baker — permainan runner pixel art 2D.
   Semua grafik dilukis secara prosedural (tiada fail imej luar). */
(() => {
'use strict';

// ============================================================
// Pemalar
// ============================================================
const W = 216, H = 384;
const GY = 284;                 // garis tayar menyentuh jalan
const ROAD_TOP = 266, ROAD_BOT = 294;
const VERGE_TOP = 254;
const CANAL_TOP = 300, CANAL_BOT = 324;
const PX = 30;                  // kedudukan x vespa di skrin
const TOTAL = 30;               // jumlah rumah
const JUMP_V = 330, GRAV = 1000, HOLD_G = 0.7;
const SPEED_MIN = 88, SPEED_MAX = 140;
const FONT_PIX = '"Lilita One", "Baloo 2", sans-serif';
const FONT_BODY = '"Baloo 2", "Trebuchet MS", sans-serif';
const QS = new URLSearchParams(location.search);
const FRAME = QS.get('frame');

const PAL = {
  ink: '#1d1530',
  cream: '#f3e6c4', creamS: '#cdb68a', creamH: '#fff9e8',
  red: '#d93a3a', redS: '#9e2333', redH: '#ff8a76',
  skin: '#c98a5c', skinS: '#9b6343', blush: '#e0866e',
  teal: '#2f9e9a', tealS: '#1f716f', tealH: '#55c2b8',
  songket: '#2c6a3f', gold: '#f2c14e', goldS: '#c98f22',
  tyre: '#2a2633', hub: '#c7ccd6', metal: '#8d95a3', metalD: '#5b6372',
  pants: '#3b3f6b', shoe: '#2b2230', seat: '#4a2a24', seatH: '#71443a', lamp: '#fff2a8',
  box: '#d9823b', boxS: '#a3561f', ribbon: '#e94f64',
  wood: '#a8653a', woodS: '#6e3c22', woodH: '#cf8b55',
  grass: '#5cb34a', grassS: '#3f8b3a', grassH: '#8fd66b', grassD: '#2f6e30',
  water: '#3c8fd0', waterS: '#2a6aa8', waterH: '#9fdcf7',
  road: '#6b6878', roadS: '#56535f', roadH: '#858293', roadLine: '#efe6c4',
  dirt: '#b48a5a', dirtS: '#8e6640',
  goose: '#f6f6f6', gooseS: '#c9cfdc', beak: '#f08a24', beakS: '#c4611a', angry: '#e33a3a',
  rock: '#8b8f9c', rockS: '#5d6170', rockH: '#b7bcc8',
  dung: '#6a4424', dungS: '#4a2d16', dungH: '#8a5c34',
  coconut: '#6b4b2a', coconutH: '#8f6a3e', coconutG: '#6a9a34',
  leaf: '#3e9a46', leafS: '#2c6e35', leafH: '#68c060', trunk: '#8a6a45', trunkS: '#614a30',
  jar: '#cfeaf5', jarS: '#8fbfd6', lid: '#e0b640', lidS: '#b88a22',
  ketG: '#4fae4a', ketGS: '#2f7a34', ketY: '#e8d27a',
  flame: '#ffd34a', flameO: '#ff7a2a', bamboo: '#b89a4a', bambooS: '#7f6a2c',
  warnY: '#ffcf33', warnS: '#d89a14',
  white: '#ffffff',
};

const NAMES = ['Mak Cik Kiah', 'Pak Abu', 'Tok Wan', 'Kak Long', 'Abang Man', 'Cikgu Rahim',
  'Mak Teh', 'Pak Long Hassan', 'Nek Som', 'Uncle Muthu', 'Auntie Lim', 'Kak Yah', 'Pak Mat',
  'Mak Lang', 'Cikgu Ani', 'Tok Penghulu', 'Abang Jai', 'Kak Ngah', 'Pak Su', 'Mak Uda', 'Opah',
  'Atuk Din', 'Bang Leh', 'Kak Ida', 'Mak Andak', 'Pak Ngah', 'Cik Siti', 'Encik Ahmad',
  'Aunty Mary', 'Imam Kassim'];

const PHASES = [
  { name: 'SIANG', sub: 'Jalan kampung yang tenang' },
  { name: 'PETANG', sub: 'Awas angsa & kelapa jatuh!' },
  { name: 'SENJA', sub: 'Pelita dah menyala' },
  { name: 'MALAM', sub: 'Malam raya, bunga api!' },
];
const PHASE_AT = [0, 8 / TOTAL, 16 / TOTAL, 23 / TOTAL];

const HURT_TEXT = {
  lubang: 'ALAMAK! LUBANG!', batu: 'ADUH! BATU!', tahi: 'EEE! TAHI LEMBU!',
  angsa: 'HONK! DIPATUK!', kelapa: 'BUK! KELAPA!', parit: 'PLUP! MASUK PARIT!',
};

// ============================================================
// Utiliti
// ============================================================
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rand = mulberry32(12345);
const rr = (a, b) => a + rand() * (b - a);
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const rgbStr = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mixRgb = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const overlap = (a0, a1, b0, b1) => a0 < b1 && b0 < a1;
function hash(n) { n = (n << 13) ^ n; return 1 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824; }
const fmtTime = (s) => { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storan disekat */ } },
};

// ============================================================
// Sprite vektor gaya kartun chibi — dilukis sekali ke kanvas resolusi tinggi
// ============================================================
const OL = '#2a1d3a';       // garisan luar kartun
const RES = 5;              // resolusi sprite (piksel sebenar per unit permainan)
function vsprite(w, h, fn) {
  const cv = document.createElement('canvas'); cv.width = Math.ceil(w * RES); cv.height = Math.ceil(h * RES);
  const c = cv.getContext('2d'); c.scale(RES, RES); c.lineJoin = 'round'; c.lineCap = 'round';
  fn(c); cv.lw = w; cv.lh = h; return cv;
}
function ds(c, spr, x, y, sc = 1) { c.drawImage(spr, x, y, spr.lw * sc, spr.lh * sc); }
const P = {
  circ: (x, y, r) => (c) => c.arc(x, y, r, 0, Math.PI * 2),
  ell: (x, y, rx, ry, rot = 0) => (c) => c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2),
  rr: (x, y, w, h, r) => (c) => { r = Math.min(r, w / 2, h / 2); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); },
  poly: (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); },
};
function fillP(c, path, fill, stroke = OL, lw = 1) {
  c.beginPath(); path(c);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke && lw) { c.lineWidth = lw; c.strokeStyle = stroke; c.stroke(); }
}
// cel shading: bentuk diisi warna bayang, kemudian bentuk sama dianjak (dx,dy) diisi warna asas
function cel(c, path, base, shade, dx = 0, dy = 1.5, lw = 1, hl) {
  c.save(); c.beginPath(); path(c); c.fillStyle = shade || base; c.fill(); c.clip();
  if (shade) { c.translate(-dx, -dy); c.beginPath(); path(c); c.fillStyle = base; c.fill(); c.translate(dx, dy); }
  if (hl) { c.globalAlpha = hl.a || 0.7; c.fillStyle = hl.c || '#fff'; c.beginPath(); hl.p(c); c.fill(); c.globalAlpha = 1; }
  c.restore();
  if (lw) { c.beginPath(); path(c); c.lineWidth = lw; c.strokeStyle = OL; c.stroke(); }
}
function lineP(c, pts, col, lw) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.strokeStyle = col; c.lineWidth = lw; c.stroke(); }
// gumpalan bulatan dengan satu garisan luar (awan, semak, kuih)
function blob(c, circles, fill, o = {}) {
  const lw = o.lw == null ? 1 : o.lw;
  if (lw) { c.fillStyle = o.ol || OL; for (const [x, y, r] of circles) { c.beginPath(); c.arc(x, y, r + lw, 0, 7); c.fill(); } }
  c.fillStyle = fill; for (const [x, y, r] of circles) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
  if (o.shade) {
    c.save(); c.beginPath(); for (const [x, y, r] of circles) { c.moveTo(x + r, y); c.arc(x, y, r, 0, 7); } c.clip();
    c.fillStyle = o.shade; c.fillRect(-50, o.shadeY, 200, 100); c.restore();
  }
}
const sparkle = (c, x, y, r, col = '#fff') => { c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fillStyle = col; c.fill(); };

// ---------------- Watak chibi & vespa ----------------
const SKIN = '#f6cba3', SKIN_S = '#e0a47b', CREAM = '#fbf0d6', CREAM_S = '#e2cb9f';
const TEAL = '#3cc0b4', TEAL_S = '#2a948b';
function drawWheel(c, x, y, r, f) {
  fillP(c, P.circ(x, y, r), '#2d2636', OL, 1);
  fillP(c, P.circ(x, y, r * 0.58), '#e3e8ef', OL, 0.7);
  c.save(); c.translate(x, y); c.rotate(f * Math.PI / 9); c.strokeStyle = '#98a1b0'; c.lineWidth = 0.6;
  for (let k = 0; k < 3; k++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(-r * 0.5, 0); c.lineTo(r * 0.5, 0); c.stroke(); }
  c.restore();
  fillP(c, P.circ(x, y, r * 0.2), '#98a1b0', OL, 0.5);
  c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 0.8; c.beginPath(); c.arc(x, y, r - 1.3, Math.PI * 1.1, Math.PI * 1.5); c.stroke();
}
function animeEye(c, x, y, rx, ry) {
  fillP(c, P.ell(x, y, rx, ry), '#3a2140', null);
  c.save(); c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.clip();
  fillP(c, P.ell(x, y + ry * 0.55, rx * 0.9, ry * 0.55), '#6a3b2a', null);
  c.restore();
  fillP(c, P.ell(x - rx * 0.25, y - ry * 0.32, rx * 0.5, ry * 0.36), '#fff', null);
  fillP(c, P.circ(x + rx * 0.35, y + ry * 0.42, rx * 0.22), '#fff', null);
  c.beginPath(); c.ellipse(x, y, rx + 0.25, ry + 0.15, 0, Math.PI * 1.05, Math.PI * 1.95); c.strokeStyle = OL; c.lineWidth = 0.95; c.stroke();
}
function chibiHead(c, hx, hy, mood) {
  cel(c, P.circ(hx, hy, 9.2), SKIN, SKIN_S, -1.2, 1.3, 1);
  fillP(c, P.ell(hx - 3.8, hy + 2.2, 1.6, 2), SKIN, OL, 0.8);
  // jambul rambut di bawah topi
  c.beginPath(); c.moveTo(hx - 5, hy - 3); c.lineTo(hx + 8.8, hy - 3.4); c.lineTo(hx + 8.4, hy - 1.6); c.lineTo(hx + 6.8, hy - 2.4); c.lineTo(hx + 5.6, hy - 1);
  c.lineTo(hx + 4.2, hy - 2.3); c.lineTo(hx + 2.8, hy - 0.9); c.lineTo(hx + 1.4, hy - 2.2); c.lineTo(hx - 4.6, hy + 0.2); c.closePath();
  c.fillStyle = '#2b2033'; c.fill(); c.lineWidth = 0.8; c.strokeStyle = OL; c.stroke();
  // topi keledar merah
  const helm = (c) => { c.moveTo(hx - 9.6, hy + 2.2); c.bezierCurveTo(hx - 10.6, hy - 8.5, hx - 1, hy - 12.3, hx + 5.2, hy - 9.4); c.bezierCurveTo(hx + 9, hy - 7.6, hx + 10.2, hy - 4.6, hx + 9.6, hy - 2.6); c.lineTo(hx - 0.5, hy - 3.2); c.quadraticCurveTo(hx - 4.4, hy - 2.4, hx - 4.8, hy + 3.4); c.lineTo(hx - 9.2, hy + 3.6); c.closePath(); };
  cel(c, helm, '#ee4250', '#b72a3a', -1, 1.6, 1, { p: P.ell(hx - 4.6, hy - 7.6, 2.6, 1.3, -0.5), a: 0.75 });
  c.beginPath(); c.moveTo(hx - 7.8, hy - 3); c.bezierCurveTo(hx - 6.5, hy - 9.4, hx + 1, hy - 10.5, hx + 5, hy - 8.3); c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.stroke();
  fillP(c, P.rr(hx + 3.3, hy - 3.9, 7.2, 2.2, 1.1), '#c92f3f', OL, 0.8);
  lineP(c, [[hx - 4.6, hy + 3], [hx - 2, hy + 7.4]], '#4a2f2f', 0.8);
  // muka
  if (mood === 'hurt') {
    c.strokeStyle = OL; c.lineWidth = 0.9;
    for (const [ex, dir] of [[hx + 3.4, 1], [hx + 7.4, -1]]) { c.beginPath(); c.moveTo(ex - 1.3 * dir, hy - 0.2); c.lineTo(ex + 1.1 * dir, hy + 1.3); c.lineTo(ex - 1.3 * dir, hy + 2.8); c.stroke(); }
    c.beginPath(); c.moveTo(hx + 3.8, hy + 6); c.quadraticCurveTo(hx + 4.8, hy + 5, hx + 5.6, hy + 6); c.quadraticCurveTo(hx + 6.4, hy + 7, hx + 7.2, hy + 6); c.stroke();
    fillP(c, (c) => { c.moveTo(hx - 6.5, hy - 1); c.quadraticCurveTo(hx - 4.6, hy + 2, hx - 6.5, hy + 2.6); c.quadraticCurveTo(hx - 8.4, hy + 2, hx - 6.5, hy - 1); }, '#8fd3ff', OL, 0.6);
  } else if (mood === 'dizzy') {
    c.strokeStyle = OL; c.lineWidth = 0.75;
    for (const [ex, r] of [[hx + 3.4, 1.9], [hx + 7.4, 1.5]]) { c.beginPath(); for (let a = 0; a < 12; a += 0.4) c.lineTo(ex + Math.cos(a) * r * a / 12, hy + 1.4 + Math.sin(a) * r * a / 12); c.stroke(); }
    fillP(c, P.ell(hx + 5.6, hy + 6.2, 1.3, 1.6), '#b8323f', OL, 0.6);
  } else {
    animeEye(c, hx + 3.1, hy + 2.5, 1.85, 2.5);
    animeEye(c, hx + 7.7, hy + 2.3, 1.3, 2.2);
    lineP(c, [[hx + 1.8, hy - 0.3], [hx + 4.4, hy - 0.6]], '#2b2033', 0.6); lineP(c, [[hx + 6.9, hy - 0.5], [hx + 8.6, hy - 0.4]], '#2b2033', 0.6);
    c.globalAlpha = 0.55; fillP(c, P.ell(hx + 1.6, hy + 5.8, 1.6, 0.9), '#ff8c9a', null); fillP(c, P.ell(hx + 8.6, hy + 5.4, 0.9, 0.75), '#ff8c9a', null); c.globalAlpha = 1;
    fillP(c, (c) => { c.moveTo(hx + 4.9, hy + 6.2); c.quadraticCurveTo(hx + 6, hy + 8.4, hx + 7.2, hy + 6); c.closePath(); }, '#b8323f', OL, 0.6);
    fillP(c, P.ell(hx + 6.05, hy + 7.2, 0.7, 0.4), '#ff9aa8', null);
  }
}
function drawChibi(c, mood = 'ride') {
  const leg = (c) => { c.moveTo(13.5, 33); c.lineTo(24, 33.2); c.quadraticCurveTo(27.2, 33.6, 26.8, 37); c.lineTo(26.4, 41.6); c.lineTo(23, 41.6); c.lineTo(23.2, 37.2); c.lineTo(13.5, 37.2); c.closePath(); };
  cel(c, leg, '#4252a0', '#2f3b78', 0, 1.2, 1);
  fillP(c, P.rr(22, 41, 7, 2.8, 1.4), '#2f2a3d', OL, 0.9);
  cel(c, P.rr(11.2, 28.6, 11.6, 6.6, 2.6), '#2f8a52', '#22663c', 0, 1.3, 1);           // sampin songket
  c.fillStyle = '#ffd25e';
  for (const [x, y] of [[13.5, 30.6], [16.5, 31.8], [19.5, 30.6], [15, 33.4], [18, 33.4], [21, 32.4]]) { c.beginPath(); c.moveTo(x, y - 0.8); c.lineTo(x + 0.8, y); c.lineTo(x, y + 0.8); c.lineTo(x - 0.8, y); c.closePath(); c.fill(); }
  const body = (c) => { c.moveTo(12.4, 30); c.bezierCurveTo(11.8, 25, 12.6, 21.8, 16.5, 21.2); c.lineTo(18.5, 21.2); c.bezierCurveTo(21.8, 21.6, 22.6, 25, 22.2, 30); c.closePath(); };
  cel(c, body, TEAL, TEAL_S, -1.2, 0, 1);                                              // baju melayu
  c.fillStyle = '#ffd25e'; for (const y of [24, 26.4]) { c.beginPath(); c.arc(20.4, y, 0.55, 0, 7); c.fill(); }
  const arm = (c) => { c.moveTo(16.5, 22.3); c.lineTo(28.6, 21.7); c.quadraticCurveTo(30.6, 23.2, 28.7, 24.9); c.lineTo(17, 25.9); c.closePath(); };
  cel(c, arm, TEAL, TEAL_S, 0, 1, 1);
  fillP(c, P.circ(30, 23.1, 2), SKIN, OL, 0.9);
  fillP(c, P.rr(15.6, 18.6, 4, 3.4, 1.2), SKIN_S, OL, 0.8);
  chibiHead(c, 18.2, 12.2, mood);
}
function drawVespaV(c, f, rider, mood) {
  drawWheel(c, 10, 46, 5, f); drawWheel(c, 34.5, 46, 5, f);
  fillP(c, P.rr(0.6, 41.6, 8.5, 3, 1.5), '#b9c0cc', OL, 0.8);
  const cowl = (c) => { c.moveTo(3.5, 44); c.bezierCurveTo(0.5, 41, 1, 33.5, 8, 32.5); c.lineTo(19.5, 32.5); c.bezierCurveTo(24.5, 33, 25.5, 40, 23.5, 44); c.closePath(); };
  cel(c, cowl, CREAM, CREAM_S, 0, 2.3, 1, { p: P.ell(9, 35, 5, 1.1), a: 0.8 });
  c.beginPath(); c.moveTo(4, 39.6); c.quadraticCurveTo(13, 41.6, 23.3, 39.1); c.strokeStyle = '#33b0a6'; c.lineWidth = 1.3; c.stroke();
  fillP(c, P.rr(19, 42, 12, 3, 1.2), '#e9d6ad', OL, 0.8);
  const shield = (c) => { c.moveTo(28, 45); c.lineTo(32.5, 45); c.bezierCurveTo(37, 39.5, 38.5, 31, 37.5, 23.5); c.lineTo(33.2, 22.8); c.bezierCurveTo(33.5, 30, 31, 37.5, 28, 45); c.closePath(); };
  cel(c, shield, CREAM, CREAM_S, 1.2, 0, 1);
  const fender = (c) => { c.moveTo(28.6, 43.4); c.quadraticCurveTo(34.5, 36.3, 40.3, 43.4); c.lineTo(38.6, 43.8); c.quadraticCurveTo(34.5, 39.6, 30.3, 43.8); c.closePath(); };
  cel(c, fender, CREAM, CREAM_S, 0, 0.8, 0.9);
  cel(c, P.rr(30.5, 20, 9.5, 5.2, 2.6), CREAM, CREAM_S, 0, 1.2, 1);
  fillP(c, P.circ(41, 22.6, 2.7), '#fff4b8', OL, 0.9); fillP(c, P.circ(40.3, 21.9, 0.9), '#ffffff', null);
  fillP(c, P.rr(27.6, 20.4, 4.2, 2.1, 1), '#3b3346', OL, 0.7);
  lineP(c, [[34, 20.2], [33, 16.6]], OL, 0.8); fillP(c, P.ell(32.8, 15.6, 1.7, 1.3), '#bfe4ff', OL, 0.7);
  cel(c, P.rr(5, 29.6, 15, 3.6, 1.8), '#6b4336', '#4a2c23', 0, 1, 0.9);
  lineP(c, [[0.4, 30.2], [11.6, 30.2]], '#7c8494', 1.1);
  // kotak kuih dengan reben
  cel(c, P.rr(0.6, 18.6, 11, 11, 2), '#ee9a4f', '#c46f2f', 1, 1.5, 1);
  fillP(c, P.rr(5.2, 18.6, 1.8, 11, 0.5), '#ff5d78', null); fillP(c, P.rr(0.6, 23.2, 11, 1.8, 0.5), '#ff5d78', null);
  fillP(c, P.ell(4.4, 17.6, 2, 1.3, -0.4), '#ff5d78', OL, 0.7); fillP(c, P.ell(7.8, 17.6, 2, 1.3, 0.4), '#ff5d78', OL, 0.7); fillP(c, P.circ(6.1, 18, 0.9), '#ff8aa0', OL, 0.6);
  if (rider) drawChibi(c, mood);
}
function drawChibiFly(c) {
  c.translate(1, 3.5);
  // kaki terkapai
  cel(c, P.rr(4, 22, 4, 10, 2), '#4252a0', '#2f3b78', 1, 0, 1);
  cel(c, (c) => { c.save(); c.translate(20, 28); c.rotate(-0.9); c.rect(-2, -5, 4, 10); c.restore(); }, '#4252a0', '#2f3b78', 1, 0, 1);
  fillP(c, P.rr(3, 31, 6, 2.6, 1.3), '#2f2a3d', OL, 0.9); fillP(c, P.ell(25, 23.5, 3, 1.5, -0.9), '#2f2a3d', OL, 0.9);
  cel(c, P.rr(5, 19, 13, 6, 2.6), '#2f8a52', '#22663c', 0, 1.2, 1);
  cel(c, P.rr(6, 12, 11, 9, 3), TEAL, TEAL_S, -1, 0, 1);
  // tangan ke atas
  cel(c, P.rr(1, 4, 3.4, 10, 1.7), TEAL, TEAL_S, 1, 0, 1); fillP(c, P.circ(2.7, 3.6, 1.9), SKIN, OL, 0.9);
  cel(c, P.rr(18, 8, 9, 3.4, 1.7), TEAL, TEAL_S, 0, 1, 1); fillP(c, P.circ(27.5, 9.6, 1.9), SKIN, OL, 0.9);
  chibiHead(c, 14.5, 12, 'dizzy');
}

// ---------------- Angsa pengejar (marah!) ----------------
function drawGooseV(c, f) {
  const legx = f ? [9, 15.5] : [11.5, 13.8];
  for (const lx of legx) { lineP(c, [[lx, 21], [lx + (f ? (lx < 12 ? -1.2 : 1.2) : 0), 25.4]], '#f39a2b', 1.5); fillP(c, P.poly([[lx - 2, 26.6], [lx + 2.6, 26.6], [lx + 0.3, 24.6]]), '#f39a2b', OL, 0.6); }
  fillP(c, P.poly([[3.6, 14.6], [0.8, 10.6], [6.6, 12.6]]), '#ffffff', OL, 0.9);
  cel(c, P.ell(12.6, 17.4, 10.4, 6.8, -0.08), '#ffffff', '#d7deeb', 0, 1.8, 1);
  if (f) cel(c, (c) => { c.moveTo(6, 15); c.quadraticCurveTo(3.6, 4.6, 13, 4.2); c.quadraticCurveTo(12, 10, 16, 14.5); c.closePath(); }, '#f4f6fb', '#d3dae8', 0, 1.2, 0.9);
  else cel(c, P.ell(11.5, 16.2, 6.8, 3.8, -0.15), '#f4f6fb', '#d3dae8', 0, 1.2, 0.9);
  c.beginPath(); c.moveTo(17.5, 15.6); c.bezierCurveTo(20.6, 12, 18, 9, 21, 6); c.strokeStyle = OL; c.lineWidth = 6.2; c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 4.4; c.stroke();
  cel(c, P.circ(22.5, 5.8, 3.9), '#ffffff', '#dfe5f0', 0, 1, 1);
  if (f) { fillP(c, P.poly([[25.3, 4.5], [31.2, 3.6], [26, 6.1]]), '#ff9b2f', OL, 0.8); fillP(c, P.poly([[25.4, 6.8], [30.6, 8.6], [25.6, 8.2]]), '#ff9b2f', OL, 0.8); fillP(c, P.poly([[25.6, 6.2], [28, 6.8], [25.6, 7]]), '#8a2335', null); }
  else fillP(c, P.poly([[25.3, 4.4], [31.2, 6], [25.4, 7.8]]), '#ff9b2f', OL, 0.8);
  fillP(c, P.ell(23.7, 5.1, 1, 1.25), '#2a1d3a', null); fillP(c, P.circ(23.4, 4.6, 0.38), '#fff', null);
  lineP(c, [[21.3, 2.7], [25.1, 3.8]], OL, 1.15);
  // simbol marah (anime)
  const ax = 18.4, ay = 2.4; c.strokeStyle = '#ff3b4f'; c.lineWidth = 0.9; c.beginPath();
  c.moveTo(ax - 1.7, ay - 0.4); c.quadraticCurveTo(ax - 0.4, ay - 0.4, ax - 0.4, ay - 1.7);
  c.moveTo(ax + 0.4, ay - 1.7); c.quadraticCurveTo(ax + 0.4, ay - 0.4, ax + 1.7, ay - 0.4);
  c.moveTo(ax + 1.7, ay + 0.4); c.quadraticCurveTo(ax + 0.4, ay + 0.4, ax + 0.4, ay + 1.7);
  c.moveTo(ax - 0.4, ay + 1.7); c.quadraticCurveTo(ax - 0.4, ay + 0.4, ax - 1.7, ay + 0.4); c.stroke();
}

// ---------------- Rumah kampung ----------------
const HOUSE_STYLE = [
  { wall: '#de9a66', wallS: '#bd7845', plank: '#c8834f', roof: '#cf5a42', roofS: '#9f3d2d', shut: '#3aa57a' },
  { wall: '#8cc6ea', wallS: '#62a0ca', plank: '#76b2da', roof: '#8a9bb3', roofS: '#66778f', shut: '#ef6b5a' },
  { wall: '#aadb92', wallS: '#7fb868', plank: '#96cc7e', roof: '#c75c44', roofS: '#954130', shut: '#f2b84b' },
  { wall: '#f6e5b9', wallS: '#d8c189', plank: '#e9d3a0', roof: '#a06f47', roofS: '#765132', shut: '#4b84d4' },
];
function drawHouseV(c, v, lit) {
  const H0 = HOUSE_STYLE[v];
  c.fillStyle = 'rgba(30,20,40,0.18)'; c.beginPath(); c.ellipse(41, 70, 38, 2, 0, 0, 7); c.fill();
  for (const x of [6, 20, 54.5, 69]) cel(c, P.rr(x, 51, 3.4, 19, 1), '#9a6440', '#74472b', 1, 0, 0.9);
  cel(c, P.rr(2, 48.5, 78, 4.4, 1.5), '#8a5634', '#683e24', 0, 1.2, 1);
  cel(c, P.rr(4, 27.5, 74, 21.5, 2), H0.wall, H0.wallS, 0, 2.5, 1);
  c.strokeStyle = H0.plank; c.lineWidth = 0.7;
  for (let x = 8; x < 76; x += 4.2) { c.beginPath(); c.moveTo(x, 31.8); c.lineTo(x, 46); c.stroke(); }
  fillP(c, P.rr(4, 27.5, 74, 3.6, 1.5), '#f3d9a8', OL, 0.8);                 // kerawang
  c.fillStyle = '#b67a45';
  for (let x = 7; x < 76; x += 3.6) { c.beginPath(); c.moveTo(x, 28.4); c.lineTo(x + 1.1, 29.3); c.lineTo(x, 30.2); c.lineTo(x - 1.1, 29.3); c.closePath(); c.fill(); }
  const win = (x) => {
    fillP(c, P.rr(x - 4.8, 33.4, 4.6, 11.8, 1), H0.shut, OL, 0.8); fillP(c, P.rr(x + 11.2, 33.4, 4.6, 11.8, 1), H0.shut, OL, 0.8);
    fillP(c, P.rr(x, 33.4, 11, 11.8, 1.2), '#7a4a2c', OL, 1);
    const g = c.createLinearGradient(0, 34.4, 0, 44.4);
    if (lit) { g.addColorStop(0, '#fff4b8'); g.addColorStop(1, '#ffc24f'); } else { g.addColorStop(0, '#c7ecff'); g.addColorStop(1, '#72aedb'); }
    fillP(c, P.rr(x + 1, 34.4, 9, 9.8, 0.8), g, null);
    fillP(c, (c) => { c.moveTo(x + 1, 34.4); c.lineTo(x + 4.2, 34.4); c.quadraticCurveTo(x + 2.6, 39, x + 1, 41.5); c.closePath(); }, '#ff9fb2', null);
    fillP(c, (c) => { c.moveTo(x + 10, 34.4); c.lineTo(x + 6.8, 34.4); c.quadraticCurveTo(x + 8.4, 39, x + 10, 41.5); c.closePath(); }, '#ff9fb2', null);
    lineP(c, [[x + 5.5, 34.4], [x + 5.5, 44.2]], '#7a4a2c', 0.8);
    if (!lit) { c.globalAlpha = 0.6; lineP(c, [[x + 2.6, 42.4], [x + 4.6, 37.4]], '#fff', 0.7); c.globalAlpha = 1; }
  };
  win(11.5); win(57);
  fillP(c, P.rr(34.5, 31.5, 13, 17.5, 1.6), '#6a3c22', OL, 1);
  fillP(c, P.rr(35.8, 32.8, 4.9, 15.4, 0.8), lit ? '#ffcf6a' : '#8f5531', null); fillP(c, P.rr(41.3, 32.8, 4.9, 15.4, 0.8), lit ? '#ffcf6a' : '#8f5531', null);
  fillP(c, P.circ(40, 41, 0.6), '#ffd25e', null); fillP(c, P.circ(42, 41, 0.6), '#ffd25e', null);
  lineP(c, [[41, 27.8], [41, 30.4]], OL, 0.5); fillP(c, P.poly([[41, 30.2], [43.1, 32.4], [41, 34.6], [38.9, 32.4]]), '#5cbf4f', OL, 0.6);   // ketupat hiasan
  lineP(c, [[33.5, 50], [31.5, 70]], '#6a3c22', 1.4); lineP(c, [[48, 50], [50, 70]], '#6a3c22', 1.4);
  for (let i = 0; i < 4; i++) fillP(c, P.rr(32.8 - i * 0.5, 54 + i * 4.2, 16 + i, 2, 0.8), '#c9864f', OL, 0.7);
  const roof = (c) => { c.moveTo(-0.2, 29.5); c.quadraticCurveTo(7, 26, 13, 8.5); c.lineTo(69, 8.5); c.quadraticCurveTo(75, 26, 82.2, 29.5); c.quadraticCurveTo(41, 31.5, -0.2, 29.5); c.closePath(); };
  cel(c, roof, H0.roof, H0.roofS, 0, 2.2, 1);
  c.save(); c.beginPath(); roof(c); c.clip(); c.strokeStyle = H0.roofS; c.lineWidth = 0.7;
  for (let y = 12; y < 29; y += 3.4) { c.beginPath(); c.moveTo(0, y + 0.8); c.quadraticCurveTo(41, y - 1, 82, y + 0.8); c.stroke(); }
  c.restore();
  fillP(c, P.poly([[28.5, 9.2], [53.5, 9.2], [41, 1.4]]), '#f0c68e', OL, 1);     // tebar layar
  c.strokeStyle = '#c98a4f'; c.lineWidth = 0.6;
  for (const dx of [-8, -4, 0, 4, 8]) { c.beginPath(); c.moveTo(41, 2.8); c.lineTo(41 + dx, 8.8); c.stroke(); }
  fillP(c, P.circ(41, 1.4, 0.9), '#ffd25e', OL, 0.5);
}
function drawHouseFarV(c) {
  fillP(c, P.rr(3, 9.5, 21, 9, 1), '#d2a07a', '#7a5566', 0.6);
  fillP(c, P.rr(6, 12, 3.2, 3.2, 0.5), '#6a4a5a', null); fillP(c, P.rr(17, 12, 3.2, 3.2, 0.5), '#6a4a5a', null);
  lineP(c, [[5, 18.5], [5, 22]], '#7a5566', 1); lineP(c, [[22, 18.5], [22, 22]], '#7a5566', 1);
  fillP(c, (c) => { c.moveTo(0.5, 11); c.quadraticCurveTo(3.5, 9, 6, 2.5); c.lineTo(21, 2.5); c.quadraticCurveTo(23.5, 9, 26.5, 11); c.closePath(); }, '#c0685a', '#7a5566', 0.6);
}

// ---------------- Pokok ----------------
function drawPalmV(c) {
  const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push([21 + Math.sin(t * 1.7) * 6, 88 - t * 70, lerp(3.2, 2.1, t)]); }
  c.beginPath(); pts.forEach(([x, y, w], i) => (i ? c.lineTo(x - w, y) : c.moveTo(x - w, y))); for (let i = pts.length - 1; i >= 0; i--) c.lineTo(pts[i][0] + pts[i][2], pts[i][1]); c.closePath();
  c.fillStyle = '#b48a58'; c.fill(); c.lineWidth = 1; c.strokeStyle = OL; c.stroke();
  c.strokeStyle = '#8a6438'; c.lineWidth = 0.6;
  for (let i = 1; i < 14; i++) { const [x, y, w] = pts[i]; c.beginPath(); c.moveTo(x - w + 0.4, y); c.quadraticCurveTo(x, y + 1, x + w - 0.4, y); c.stroke(); }
  const cx = 27, cy = 17;
  const leaf = (ang, len, droop, col) => {
    const ex = cx + Math.cos(ang) * len, ey = cy + Math.sin(ang) * len + droop;
    const mx = cx + Math.cos(ang) * len * 0.5, my = cy + Math.sin(ang) * len * 0.5 - 3;
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    c.beginPath(); c.moveTo(cx, cy); c.quadraticCurveTo(mx + nx * 4.5, my + ny * 4.5, ex, ey); c.quadraticCurveTo(mx - nx * 1.5, my - ny * 1.5 + 2, cx, cy); c.closePath();
    c.fillStyle = col; c.fill(); c.strokeStyle = OL; c.lineWidth = 0.9; c.stroke();
    c.beginPath(); c.moveTo(cx, cy); c.quadraticCurveTo(mx + nx * 1.4, my + ny * 1.4, ex, ey); c.strokeStyle = 'rgba(25,70,35,0.5)'; c.lineWidth = 0.6; c.stroke();
  };
  leaf(Math.PI * 1.05, 22, 8, '#3f9e48'); leaf(Math.PI * 0.85, 19, 9, '#4cb352'); leaf(-Math.PI * 0.72, 15, 3, '#44a84c');
  leaf(-0.1, 21, 9, '#3f9e48'); leaf(0.2, 18, 10, '#4cb352'); leaf(-Math.PI * 0.3, 16, 3, '#56bf5c'); leaf(-Math.PI / 2, 11, 1, '#56bf5c');
  fillP(c, P.circ(24.5, 20, 2.3), '#7cb342', OL, 0.8); fillP(c, P.circ(29, 20.2, 2.3), '#8d6234', OL, 0.8); fillP(c, P.circ(26.8, 22.4, 2.3), '#7cb342', OL, 0.8);
}
function drawBananaV(c) {
  cel(c, P.rr(13, 20, 4.5, 25, 2), '#8bc34a', '#6a9a34', 1, 0, 0.9);
  const lf = (p, col) => { c.beginPath(); c.moveTo(p[0][0], p[0][1]); c.quadraticCurveTo(p[1][0], p[1][1], p[2][0], p[2][1]); c.quadraticCurveTo(p[3][0], p[3][1], p[0][0], p[0][1]); c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = OL; c.lineWidth = 0.9; c.stroke(); };
  lf([[15, 22], [4, 9], [0.8, 20], [8, 24]], '#5cbf4f'); lf([[15, 21], [26, 7], [31, 19], [21, 24]], '#66c95a');
  lf([[15, 21], [7, 3], [13, 1], [17, 14]], '#4fae46'); lf([[16, 21], [20, 2], [25.5, 5], [18, 18]], '#5cbf4f');
  for (let i = 0; i < 3; i++) fillP(c, P.ell(19.5 + i * 0.6, 27 + i * 2.2, 2.6, 1.1, 0.5), '#ffd84d', OL, 0.6);
  fillP(c, P.ell(18.5, 34.5, 1.2, 1.8), '#8c2f45', OL, 0.6);
}
function drawBushV(c) {
  blob(c, [[6.5, 9.2, 5], [13.5, 7.2, 6.2], [20.5, 9.6, 4.6], [13, 11, 4]], '#4cb352', { shade: '#3f9e48', shadeY: 10.5 });
  for (const [x, y, col] of [[9, 7, '#ff8fb0'], [17, 6, '#ffe066'], [21, 10, '#ff8fb0'], [13, 10, '#fff']]) { fillP(c, P.circ(x, y, 1.2), col, OL, 0.5); fillP(c, P.circ(x, y, 0.4), '#f5a623', null); }
}

// ---------------- Halangan ----------------
function drawRockV(c) {
  const rock = (c) => { c.moveTo(1.5, 11.8); c.bezierCurveTo(0.5, 6, 4, 1.5, 9, 1.6); c.bezierCurveTo(14, 1.8, 17, 6, 16.5, 11.8); c.closePath(); };
  cel(c, rock, '#a8aebd', '#787e8f', 1.4, 1.8, 1, { p: P.ell(6.5, 4.8, 2.6, 1.2, -0.4), a: 0.85, c: '#e7eaf1' });
  lineP(c, [[11, 5], [12.4, 8], [11.4, 10]], '#5d6272', 0.6);
}
function drawDungV(c) {
  cel(c, P.ell(8, 7, 7, 1.9), '#7a4c27', '#5b3519', 0, 0.8, 0.9);
  cel(c, P.ell(8, 4.9, 5, 1.7), '#8a5a30', '#6a401f', 0, 0.7, 0.9);
  cel(c, P.ell(8, 2.9, 2.8, 1.4), '#9c6a3a', '#7a4c27', 0, 0.6, 0.9);
  fillP(c, P.circ(7.4, 1.1, 0.9), '#9c6a3a', OL, 0.6);
  c.globalAlpha = 0.7; fillP(c, P.ell(5.6, 4.3, 1.2, 0.5), '#fff', null); c.globalAlpha = 1;
}
function drawCoconutV(c) {
  cel(c, P.circ(6, 6.2, 5), '#8d6234', '#674421', 1, 1.2, 1, { p: P.ell(4.2, 4.3, 1.6, 1), a: 0.5, c: '#d9b07a' });
  fillP(c, (c) => { c.moveTo(1.6, 3.6); c.quadraticCurveTo(6, -0.2, 10.4, 3.6); c.quadraticCurveTo(6, 2, 1.6, 3.6); }, '#7cb342', OL, 0.6);
  for (const [x, y] of [[5, 7], [7.2, 7], [6.1, 8.8]]) fillP(c, P.circ(x, y, 0.55), '#3a2416', null);
}
function drawWarnV(c) {
  const tri = (c) => { c.moveTo(8, 1.2); c.quadraticCurveTo(8.8, 0.6, 9.5, 1.8); c.lineTo(15.2, 12); c.quadraticCurveTo(15.6, 13.6, 14, 13.6); c.lineTo(2, 13.6); c.quadraticCurveTo(0.4, 13.6, 0.8, 12); c.lineTo(6.5, 1.8); c.quadraticCurveTo(7.2, 0.6, 8, 1.2); c.closePath(); };
  cel(c, tri, '#ffd23f', '#e8a917', 0, 1.2, 1);
  fillP(c, P.rr(7.1, 4.6, 1.8, 5, 0.9), OL, null); fillP(c, P.circ(8, 11.3, 1), OL, null);
}

// ---------------- Kuih raya & item ----------------
function drawSemperitV(c) {
  const lobes = []; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; lobes.push([5.5 + Math.cos(a) * 3, 5.5 + Math.sin(a) * 3, 1.8]); }
  lobes.push([5.5, 5.5, 3]);
  blob(c, lobes, '#f6d38f', { lw: 0.8, shade: '#e0ad62', shadeY: 7 });
  fillP(c, P.circ(5.5, 5.5, 1.5), '#e8283f', OL, 0.6); fillP(c, P.circ(5, 5, 0.5), '#fff', null);
}
function drawTartV(c) {
  const edge = []; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; edge.push([5.5 + Math.cos(a) * 3.6, 5.5 + Math.sin(a) * 3.6, 1.3]); }
  edge.push([5.5, 5.5, 3.6]);
  blob(c, edge, '#eab25f', { lw: 0.8, shade: '#c98d3c', shadeY: 7.5 });
  fillP(c, P.circ(5.5, 5.5, 2.4), '#f47b1f', OL, 0.6);
  c.strokeStyle = '#f8cf8a'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(4, 4); c.lineTo(7, 7); c.moveTo(7, 4); c.lineTo(4, 7); c.stroke();
  fillP(c, P.circ(4.5, 4.4, 0.5), '#fff', null);
}
function drawBangkitV(c) {
  const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2 : 4.4; pts.push([5 + Math.cos(a) * r, 5.3 + Math.sin(a) * r]); }
  c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
  c.fillStyle = '#fffaf0'; c.fill(); c.lineWidth = 0.8; c.strokeStyle = OL; c.lineJoin = 'round'; c.stroke();
  fillP(c, P.circ(5, 5.3, 0.9), '#ff8fb0', null);
}
function drawKekLapisV(c) {
  cel(c, P.rr(0.8, 1, 10.4, 8, 1.4), '#7a3e1e', '#5a2c14', 0, 0.8, 0.9);
  c.save(); c.beginPath(); P.rr(0.8, 1, 10.4, 8, 1.4)(c); c.clip(); c.fillStyle = '#f6c453';
  for (let y = 2.4; y < 9; y += 1.8) c.fillRect(0, y, 12, 0.8); c.restore();
  lineP(c, [[1.6, 1.6], [10.4, 1.6]], '#b56a3a', 0.6);
}
function drawJarV(c) {
  cel(c, P.rr(3.2, 0.8, 8.6, 3.2, 1.2), '#f2c548', '#c99a22', 0, 0.8, 0.9);
  c.globalAlpha = 0.85; fillP(c, P.rr(1.2, 3.6, 12.6, 13.6, 3), '#d8f1fb', null); c.globalAlpha = 1;
  c.save(); c.beginPath(); P.rr(1.2, 3.6, 12.6, 13.6, 3)(c); c.clip();
  for (const [x, y, col] of [[4, 14.5, '#f6d38f'], [7.5, 15, '#eab25f'], [11, 14.5, '#f6d38f'], [5.5, 11.5, '#eab25f'], [9.5, 12, '#fffaf0'], [7, 8.8, '#f6d38f'], [4, 8.5, '#fffaf0'], [10.5, 8.6, '#eab25f']]) fillP(c, P.circ(x, y, 1.7), col, OL, 0.4);
  c.restore();
  fillP(c, P.rr(1.2, 3.6, 12.6, 13.6, 3), null, OL, 1);
  c.globalAlpha = 0.8; lineP(c, [[3, 6], [3, 12]], '#fff', 0.9); c.globalAlpha = 1;
  fillP(c, P.rr(1.2, 6.2, 12.6, 2, 0.6), '#ff5d78', OL, 0.5);
  fillP(c, P.ell(6, 6.6, 1.6, 1.1, -0.4), '#ff5d78', OL, 0.5); fillP(c, P.ell(9, 6.6, 1.6, 1.1, 0.4), '#ff5d78', OL, 0.5);
}
function drawKetupatV(c) {
  for (const [x0, x1] of [[6.5, 5], [8.5, 10]]) { c.beginPath(); c.moveTo(7.5, 6); c.quadraticCurveTo(x0, 3, x1, 0.8); c.strokeStyle = '#4fae46'; c.lineWidth = 0.9; c.stroke(); }
  const dia = P.poly([[7.5, 5], [14, 11.5], [7.5, 18], [1, 11.5]]);
  cel(c, dia, '#5cbf4f', '#3f9440', 0, 1.2, 1);
  c.save(); c.beginPath(); dia(c); c.clip(); c.strokeStyle = '#d6ee80'; c.lineWidth = 0.9;
  for (let k = -12; k < 20; k += 3) { c.beginPath(); c.moveTo(k, 5); c.lineTo(k + 13, 18); c.stroke(); }
  c.strokeStyle = 'rgba(40,110,45,0.6)'; c.lineWidth = 0.6;
  for (let k = 0; k < 30; k += 3) { c.beginPath(); c.moveTo(k, 5); c.lineTo(k - 13, 18); c.stroke(); }
  c.restore(); fillP(c, dia, null, OL, 1);
}
function drawGiftV(c) {
  cel(c, P.rr(0.8, 3.6, 8.4, 5.8, 1), '#ef8f45', '#c9692a', 0, 1, 0.9);
  fillP(c, P.rr(0.4, 2.4, 9.2, 2.2, 0.8), '#f7a35d', OL, 0.8);
  fillP(c, P.rr(4.1, 2.4, 1.8, 7, 0.4), '#ff5d78', null);
  fillP(c, P.ell(3.4, 1.6, 1.7, 1.1, -0.4), '#ff5d78', OL, 0.6); fillP(c, P.ell(6.6, 1.6, 1.7, 1.1, 0.4), '#ff5d78', OL, 0.6);
}
function drawPelitaV(c) {
  cel(c, P.rr(2.4, 4, 3.2, 18, 1.4), '#d7c160', '#a8913a', 1, 0, 0.9);
  lineP(c, [[2.4, 10], [5.6, 10]], '#8a7a30', 0.6); lineP(c, [[2.4, 16], [5.6, 16]], '#8a7a30', 0.6);
  fillP(c, P.rr(1.2, 2, 5.6, 3, 1), '#7a5232', OL, 0.8);
}
function drawCloudV(c, big) {
  const cs = big ? [[9, 11, 5.5], [17, 8, 7], [26, 9.5, 6], [33, 12, 4.5], [20, 12.5, 5]] : [[7, 8.5, 4.5], [13.5, 6, 5.5], [20, 8.5, 4.2], [13, 9.5, 4]];
  blob(c, cs, '#ffffff', { lw: 0.8, ol: '#aebbe0', shade: '#e3e9fb', shadeY: big ? 12.5 : 9.5 });
}
function drawCowV(c) {
  for (const x of [5, 8, 14, 17]) lineP(c, [[x, 10], [x, 14]], OL, 1.6);
  cel(c, P.rr(2, 4.5, 17, 7.5, 3.5), '#ffffff', '#dfe3ea', 0, 1, 0.9);
  fillP(c, P.ell(7, 6.5, 2.6, 1.8), '#7a4a2c', null); fillP(c, P.ell(13.5, 9, 2, 1.5), '#7a4a2c', null);
  fillP(c, P.rr(2, 4.5, 17, 7.5, 3.5), null, OL, 0.9);
  cel(c, P.ell(19.5, 5, 3.4, 3), '#ffffff', '#dfe3ea', 0, 0.8, 0.9);
  fillP(c, P.ell(21, 6.6, 2, 1.3), '#ffb3b8', OL, 0.6);
  fillP(c, P.circ(19.6, 4.2, 0.6), OL, null);
  lineP(c, [[17.6, 2.4], [17, 1]], '#e8dcc0', 0.9); lineP(c, [[20.6, 2.2], [21.4, 0.9]], '#e8dcc0', 0.9);
  lineP(c, [[2.2, 6], [0.8, 9.6]], OL, 0.8);
}
function drawSignV(c) {
  cel(c, P.rr(10, 11, 3, 24, 1), '#9a6440', '#74472b', 1, 0, 0.9);
  fillP(c, P.rr(0.6, 0.6, 21.8, 12, 3), '#2c55b8', OL, 1);
  fillP(c, P.rr(2, 2, 19, 9.2, 2.2), null, '#ffffff', 0.6);
}
function drawAwasV(c) {
  cel(c, P.rr(10, 13, 3, 22, 1), '#9a6440', '#74472b', 1, 0, 0.9);
  cel(c, P.rr(0.6, 0.6, 21.8, 14, 3), '#ffd23f', '#e8a917', 0, 1.2, 1);
}
function drawMoonV(c) {
  c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(12, 12, 10, 0, 7); c.fill();
  c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(17, 9, 9, 0, 7); c.fill(); c.globalCompositeOperation = 'source-over';
}

// ============================================================
// Daftar sprite
// ============================================================
const S = {};
function buildSprites() {
  S.vespa = [0, 1, 2].map((f) => vsprite(46, 52, (c) => drawVespaV(c, f, true, 'ride')));
  S.vespaHurt = vsprite(46, 52, (c) => drawVespaV(c, 0, true, 'hurt'));
  S.vespaBare = vsprite(46, 52, (c) => drawVespaV(c, 0, false));
  S.riderFly = vsprite(34, 40, drawChibiFly);
  S.goose = [0, 1].map((f) => vsprite(32, 28, (c) => drawGooseV(c, f)));
  S.house = [0, 1, 2, 3].map((v) => vsprite(82, 72, (c) => drawHouseV(c, v, false)));
  S.houseLit = [0, 1, 2, 3].map((v) => vsprite(82, 72, (c) => drawHouseV(c, v, true)));
  S.houseFar = vsprite(28, 23, drawHouseFarV);
  S.palm = vsprite(48, 90, drawPalmV);
  S.banana = vsprite(32, 46, drawBananaV);
  S.bush = vsprite(27, 15, drawBushV);
  S.rock = vsprite(18, 13, drawRockV);
  S.dung = vsprite(16, 9, drawDungV);
  S.coconut = vsprite(12, 12, drawCoconutV);
  S.warn = vsprite(16, 15, drawWarnV);
  S.kuih = [vsprite(11, 11, drawSemperitV), vsprite(11, 11, drawTartV), vsprite(10, 10.5, drawBangkitV), vsprite(12, 10, drawKekLapisV)];
  S.jar = vsprite(15, 18, drawJarV);
  S.ketupat = vsprite(15, 19, drawKetupatV);
  S.gift = vsprite(10, 10, drawGiftV);
  S.pelita = vsprite(8, 23, drawPelitaV);
  S.cloud = [vsprite(40, 19, (c) => drawCloudV(c, true)), vsprite(26, 14, (c) => drawCloudV(c, false))];
  S.cow = vsprite(24, 15, drawCowV);
  S.sign = vsprite(23, 36, drawSignV);
  S.awas = vsprite(23, 36, drawAwasV);
  S.moon = vsprite(24, 24, drawMoonV);
  const root = document.documentElement.style;
  root.setProperty('--heart-full', `url("${heartURI('#ff4d6d', '#ffffff')}")`);
  root.setProperty('--heart-empty', `url("${heartURI('#4a4f7a', '#7a80b0')}")`);
  root.setProperty('--gift', `url(${S.gift.toDataURL()})`);
}
function disc(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
function heartURI(fill, shine) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 18'><path d='M10 16.6C4.2 12.4 1.2 9.2 1.2 5.6A4.4 4.4 0 0 1 10 4.2A4.4 4.4 0 0 1 18.8 5.6C18.8 9.2 15.8 12.4 10 16.6Z' fill='${fill}' stroke='#2a1d3a' stroke-width='1.7' stroke-linejoin='round'/><ellipse cx='5.8' cy='5.6' rx='1.9' ry='1.2' fill='${shine}' opacity='.85'/></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

// ============================================================
// Audio — gamelan Melayu & zapin raya (gubahan asal, disintesis WebAudio)
//   menu   : gamelan Melayu (saron, keromong, gambang, kenong, gong agung, gendang ibu/anak)
//   siang/petang : rentak joget 6/8 (biola, akordion, gendang Melayu, rebana, gong)
//   senja/malam  : zapin (gambus, marwas, dok) + lapisan gamelan, lebih dramatik
//   tegang : versi dramatik bila nyawa tinggal satu
//   pening : lagu "pening-pening" untuk skrin ALAHAI OPPS
// ============================================================
const MIDI = (n) => { const m = n.match(/^([A-G])(b|#)?(\d)$/); return { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12; };
const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
const noteF = (n) => mf(MIDI(n));

// [nota, panjang dalam 1/16]. '-' = rehat
function seqToSong(bars, roots, barLen = 16) {
  const len = bars.length * barLen, onset = new Array(len).fill(null), held = new Array(len).fill(0);
  let s = 0;
  for (const bar of bars) for (const [n, l] of bar) { if (n !== '-') onset[s] = { m: MIDI(n), len: l }; for (let k = 0; k < l; k++) held[s + k] = n === '-' ? -1 : MIDI(n); s += l; }
  for (let i = 0; i < len; i++) if (held[i] < 0) held[i] = held[(i + len - 1) % len] > 0 ? held[(i + len - 1) % len] : MIDI('D4');
  return { len, bars: bars.length, onset, held, roots: (roots || []).map(MIDI) };
}
// Lagu tema zapin (mod Hijaz D: D Eb F# G A Bb C)
const Z_A = [
  [['A4', 2], ['Bb4', 2], ['A4', 2], ['G4', 2], ['F#4', 2], ['G4', 2], ['A4', 4]],
  [['Bb4', 2], ['C5', 2], ['Bb4', 1], ['A4', 1], ['G4', 2], ['A4', 8]],
  [['D5', 2], ['C5', 2], ['Bb4', 2], ['A4', 2], ['G4', 1], ['A4', 1], ['Bb4', 2], ['A4', 4]],
  [['G4', 2], ['F#4', 2], ['Eb4', 2], ['F#4', 2], ['D4', 8]],
];
const Z_B = [
  [['D4', 2], ['F#4', 2], ['A4', 2], ['D5', 4], ['C5', 2], ['D5', 2], ['Eb5', 2]],
  [['D5', 2], ['C5', 2], ['Bb4', 2], ['C5', 2], ['A4', 8]],
  [['Bb4', 2], ['A4', 2], ['G4', 2], ['A4', 2], ['F#4', 2], ['G4', 2], ['A4', 4]],
  [['G4', 2], ['F#4', 1], ['G4', 1], ['Eb4', 2], ['F#4', 2], ['D4', 8]],
];
const Z_C = [
  [['D5', 2], ['Eb5', 2], ['D5', 2], ['C5', 2], ['Bb4', 2], ['C5', 2], ['D5', 4]],
  [['G5', 2], ['F#5', 2], ['Eb5', 2], ['D5', 2], ['C5', 2], ['D5', 6]],
  [['Bb4', 2], ['C5', 2], ['D5', 2], ['Bb4', 2], ['A4', 2], ['Bb4', 2], ['C5', 4]],
  [['Bb4', 2], ['A4', 2], ['G4', 2], ['F#4', 2], ['G4', 8]],
  [['G4', 2], ['A4', 2], ['Bb4', 2], ['A4', 2], ['G4', 2], ['F#4', 2], ['G4', 4]],
  [['A4', 2], ['Bb4', 2], ['A4', 2], ['G4', 2], ['F#4', 8]],
  [['D4', 2], ['Eb4', 2], ['F#4', 2], ['G4', 2], ['A4', 2], ['Bb4', 2], ['C5', 2], ['Bb4', 2]],
  [['A4', 2], ['G4', 1], ['A4', 1], ['F#4', 2], ['Eb4', 2], ['D4', 8]],
];
const SONG_PLAY = seqToSong([...Z_A, ...Z_B, ...Z_A, ...Z_C],
  ['D3', 'G2', 'D3', 'D3', 'D3', 'C3', 'G2', 'D3', 'D3', 'G2', 'D3', 'D3', 'D3', 'C3', 'G2', 'G2', 'G2', 'D3', 'C3', 'D3']);
SONG_PLAY.gongBars = new Set([0, 4, 8, 12, 16]);
// Versi tegang (nyawa tinggal satu)
const SONG_TENSE = seqToSong([
  [['D4', 1], ['Eb4', 1], ['F#4', 1], ['G4', 1], ['A4', 2], ['G4', 2], ['F#4', 2], ['Eb4', 2], ['D4', 4]],
  [['A4', 1], ['Bb4', 1], ['C5', 1], ['Bb4', 1], ['A4', 2], ['G4', 2], ['A4', 8]],
  [['D5', 2], ['C5', 1], ['Bb4', 1], ['A4', 2], ['G4', 1], ['F#4', 1], ['G4', 2], ['A4', 2], ['Bb4', 4]],
  [['A4', 2], ['G4', 2], ['F#4', 2], ['Eb4', 2], ['D4', 2], ['Eb4', 2], ['D4', 4]],
], ['D2', 'D2', 'G2', 'D2']);
SONG_TENSE.gongBars = new Set([0, 2]);
// Menu: gamelan Melayu (gaya Terengganu) — pentatonik major D E F# A B, satu not balungan setiap ketukan
const MENU_TUNE = ('A4 B4 A4 F#4  E4 F#4 A4 A4  B4 D5 B4 A4  F#4 E4 D4 D4  ' +
  'F#4 A4 B4 D5  E5 D5 B4 A4  B4 A4 F#4 E4  F#4 E4 D4 D4  ' +
  'D5 E5 D5 B4  A4 B4 D5 D5  E5 D5 B4 A4  B4 A4 F#4 F#4  ' +
  'A4 F#4 E4 D4  E4 F#4 A4 B4  A4 F#4 E4 F#4  E4 D4 D4 D4').trim().split(/\s+/);
const SONG_MENU = { beats: MENU_TUNE.map(MIDI), len: MENU_TUNE.length * 4 };
const PENTA = []; for (let o = 3; o <= 7; o++) for (const n of [2, 4, 6, 9, 11]) PENTA.push(o * 12 + n);
const pentaIdx = (m) => { let best = 0; for (let i = 0; i < PENTA.length; i++) if (Math.abs(PENTA[i] - m) < Math.abs(PENTA[best] - m)) best = i; return best; };
const GENDANG_IBU = 'D..T.DT.', GENDANG_ANAK = '.t.t..t.';
// Kompang raya: induk (P), anak (p), peningkah (K)
const KOMPANG_A = 'P.pK.pP.pK.p', KOMPANG_B = 'P.pKP.pKP.pK', KOMPANG_16 = 'P.pK.pP.pK.pP.KK';
// Lagu joget raya (6/8, D mixolydian). 12 langkah 1/16 setiap bar.
// Bar ganjil = 3+3, bar genap = hemiola 2+2+2 (lenggok khas joget).
const SONG_JOGET = seqToSong([
  [['A4', 2], ['B4', 2], ['A4', 2], ['F#4', 3], ['G4', 1], ['A4', 2]],
  [['D5', 4], ['C5', 2], ['B4', 2], ['A4', 4]],
  [['B4', 2], ['A4', 2], ['G4', 2], ['F#4', 2], ['E4', 2], ['F#4', 2]],
  [['G4', 4], ['A4', 4], ['D4', 4]],
  [['F#4', 2], ['G4', 2], ['A4', 2], ['D5', 3], ['E5', 1], ['D5', 2]],
  [['C5', 4], ['B4', 2], ['C5', 2], ['A4', 4]],
  [['G4', 2], ['B4', 2], ['A4', 2], ['G4', 2], ['F#4', 2], ['E4', 2]],
  [['D4', 8], ['-', 4]],
  [['D5', 2], ['E5', 2], ['F#5', 2], ['E5', 3], ['D5', 1], ['C5', 2]],
  [['D5', 4], ['B4', 4], ['A4', 4]],
  [['G4', 2], ['A4', 2], ['B4', 2], ['C5', 2], ['B4', 2], ['A4', 2]],
  [['B4', 4], ['A4', 4], ['F#4', 4]],
  [['E4', 2], ['F#4', 2], ['G4', 2], ['A4', 3], ['B4', 1], ['A4', 2]],
  [['D5', 4], ['C5', 4], ['A4', 4]],
  [['G4', 2], ['F#4', 2], ['E4', 2], ['F#4', 2], ['G4', 2], ['E4', 2]],
  [['D4', 8], ['-', 4]],
], ['D3', 'G2', 'D3', 'A2', 'D3', 'C3', 'A2', 'D3', 'D3', 'G2', 'C3', 'D3', 'A2', 'D3', 'A2', 'D3'], 12);
const JOGET_SCALE = [62, 64, 66, 67, 69, 71, 72];           // D E F# G A B C
const JOGET_DQ = [0, 100, 108, 108, 108];                    // tempo (dotted quarter)
const GENDANG_A = 'D...T.D.T.T.', GENDANG_B = 'D.t.T.t.D.T.', GENDANG_FILL = 'D...T.DTTTTT';
const REBANA_A = '..t...t..t.t', REBANA_B = '.t.t.t.t.t.t';
// Rentak
const MARWAS_A = 'D..T..D.T.D.T...';
const MARWAS_B = '..t..t.t...t..tt';
const DOK = 'B.....B...B.....';
const FILL = 'D.TTD.TTDTDTD.D.';
const TENSE_DRUM = 'TtTtDtTtTtDtTtDT';
const HEART = 'B..B......B..B..';
const BPM_PLAY = [0, 108, 114, 118, 124];

const Sfx = {
  ctx: null, master: null, musicGain: null, muted: store.get('vrtb_muted', false),
  musicOn: false, timer: null, step: 0, nextT: 0, track: 'menu', level: 1, tense: false, ksCache: {},
  init() {
    if (FRAME) return;
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { const AC = window.AudioContext || window.webkitAudioContext; this.attach(new AC()); } catch (e) { this.ctx = null; }
  },
  attach(ctx, forceOn) {
    this.ctx = ctx; this.ksCache = {};
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2; comp.connect(ctx.destination);
    this.master = ctx.createGain(); this.master.gain.value = (this.muted && !forceOn) ? 0 : 0.7; this.master.connect(comp);
    this.musicGain = ctx.createGain(); this.musicGain.gain.value = 0.6; this.musicGain.connect(this.master);
    const len = Math.floor(ctx.sampleRate * 0.6); this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  },
  setMuted(m) { this.muted = m; store.set('vrtb_muted', m); if (this.master) this.master.gain.value = m ? 0 : 0.7; },
  now() { return this.ctx ? this.ctx.currentTime : 0; },

  // ---------- blok binaan bunyi ----------
  env(type, f, t, decay, vol, dest, o = {}) {
    const c = this.ctx, osc = c.createOscillator(), g = c.createGain();
    osc.type = type; osc.frequency.setValueAtTime(o.f0 || f, t);
    if (o.f0) osc.frequency.exponentialRampToValueAtTime(f, t + (o.glide || 0.02));
    if (o.fEnd) osc.frequency.exponentialRampToValueAtTime(o.fEnd, t + (o.glide || decay));
    if (o.wob) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.wob; lg.gain.value = f * (o.wobDepth || 0.03); l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + decay + 0.05); }
    const a = o.attack || 0.002;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + decay);
    osc.connect(g); g.connect(dest || this.master); osc.start(t); osc.stop(t + a + decay + 0.05);
  },
  noiseHit(t, decay, vol, ftype, freq, q, dest) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = ftype; f.frequency.value = freq; if (q) f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    s.connect(f); f.connect(g); g.connect(dest || this.master); s.start(t, Math.random() * 0.3); s.stop(t + decay + 0.02);
  },
  // gambus: tali dipetik (Karplus-Strong)
  ks(f) {
    const sr = this.ctx.sampleRate, N = Math.max(2, Math.round(sr / f));
    if (this.ksCache[N]) return this.ksCache[N];
    const len = Math.floor(sr * 1.3), buf = this.ctx.createBuffer(1, len, sr), d = buf.getChannelData(0), line = new Float32Array(N);
    let prev = 0; for (let i = 0; i < N; i++) { prev = prev * 0.35 + (Math.random() * 2 - 1) * 0.65; line[i] = prev; }
    let idx = 0, mx = 0;
    for (let i = 0; i < len; i++) { const a = line[idx], b = line[(idx + 1) % N]; d[i] = a; line[idx] = (a + b) * 0.5 * 0.9968; idx = (idx + 1) % N; if (Math.abs(a) > mx) mx = Math.abs(a); }
    for (let i = 0; i < len; i++) d[i] /= (mx || 1);
    return (this.ksCache[N] = { buf, N });
  },
  gambus(f, t, vol, dur, o = {}) {
    const c = this.ctx, k = this.ks(f), s = c.createBufferSource(), g = c.createGain(), lp = c.createBiquadFilter(), pk = c.createBiquadFilter();
    s.buffer = k.buf; const rate = f * k.N / c.sampleRate; s.playbackRate.setValueAtTime(rate, t);
    if (o.bend) s.playbackRate.exponentialRampToValueAtTime(rate * o.bend, t + (o.bendT || 0.3));
    lp.type = 'lowpass'; lp.frequency.value = o.dark ? 1100 : 3800;
    pk.type = 'peaking'; pk.frequency.value = 750; pk.Q.value = 1.2; pk.gain.value = 5;
    const end = t + Math.max(0.12, dur) + 0.22;
    g.gain.setValueAtTime(vol, t); g.gain.setValueAtTime(vol, end - 0.22); g.gain.exponentialRampToValueAtTime(0.0001, end);
    s.connect(lp); lp.connect(pk); pk.connect(g); g.connect(o.dest || this.musicGain); s.start(t); s.stop(end + 0.02);
  },
  metal(f, t, vol, decay, parts, beat, dest, o) {
    for (const [r, a, dk] of parts) this.env('sine', f * r, t, decay * dk, vol * a, dest, o);
    if (beat) this.env('sine', f + beat, t, decay, vol * 0.45, dest, o);
  },
  saron(f, t, vol, decay = 1.1, dest) { this.metal(f, t, vol, decay, [[1, 1, 1], [2.76, 0.32, 0.25], [5.4, 0.12, 0.1]], 2.4, dest || this.musicGain); },
  bonang(f, t, vol, dest, o) { this.metal(f, t, vol, 0.65, [[1, 1, 1], [2.42, 0.28, 0.3], [4.1, 0.09, 0.12]], 1.7, dest || this.musicGain, { f0: f * 1.015, glide: 0.025, ...(o || {}) }); },
  kenong(f, t, vol, dest) { this.metal(f, t, vol, 1.4, [[1, 1, 1], [2.01, 0.22, 0.35], [3.1, 0.08, 0.15]], 1.3, dest || this.musicGain, { attack: 0.006 }); },
  gong(t, vol, dest) {
    const d = dest || this.musicGain, f = 68;
    this.env('sine', f, t, 4.2, vol, d, { attack: 0.025, f0: f * 1.04, glide: 0.25 });
    this.env('sine', f + 0.7, t, 4.2, vol * 0.8, d, { attack: 0.025 });
    this.env('sine', f * 2.01, t, 1.6, vol * 0.25, d, { attack: 0.02 });
    this.env('sine', f * 2.93, t, 0.7, vol * 0.1, d, { attack: 0.01 });
    this.noiseHit(t, 0.12, vol * 0.25, 'lowpass', 220, 0, d);
  },
  dung(t, vol, dest) { this.env('sine', 88, t, 0.2, vol, dest || this.musicGain, { f0: 170, glide: 0.09 }); this.noiseHit(t, 0.03, vol * 0.3, 'lowpass', 900, 0, dest || this.musicGain); },
  tak(t, vol, bp = 2600, dest) { this.noiseHit(t, 0.07, vol, 'bandpass', bp, 1.3, dest || this.musicGain); this.env('triangle', 540, t, 0.04, vol * 0.35, dest || this.musicGain); },
  dok(t, vol, dest) { this.env('sine', 54, t, 0.36, vol, dest || this.musicGain, { f0: 100, glide: 0.18 }); },
  kesi(t, vol, dest) { this.noiseHit(t, 0.1, vol, 'highpass', 6500, 0, dest || this.musicGain); },

  // biola: dua gergaji sedikit sumbang + vibrato lambat masuk
  violin(f, t, dur, vol, dest) {
    const c = this.ctx, g = c.createGain(), lp = c.createBiquadFilter(), pk = c.createBiquadFilter(), lfo = c.createOscillator(), lg = c.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 3000; lp.Q.value = 0.7;
    pk.type = 'peaking'; pk.frequency.value = 1600; pk.Q.value = 1.4; pk.gain.value = 5;
    const end = t + Math.max(0.07, dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.03); g.gain.setValueAtTime(vol * 0.85, Math.max(t + 0.031, end - 0.02)); g.gain.exponentialRampToValueAtTime(0.0001, end + 0.09);
    lfo.frequency.value = 5.6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.007, t + Math.min(0.25, dur + 0.05)); lfo.connect(lg);
    for (const det of [-5, 5]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; lg.connect(o.frequency); o.connect(lp); o.start(t); o.stop(end + 0.12); }
    lp.connect(pk); pk.connect(g); g.connect(dest || this.musicGain); lfo.start(t); lfo.stop(end + 0.12);
  },
  // akordion: buluh berganda (musette)
  accNote(f, t, dur, vol, dark, dest) {
    const c = this.ctx, g = c.createGain(), lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = dark ? 800 : 2300;
    const end = t + Math.max(0.05, dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.setValueAtTime(vol, end); g.gain.exponentialRampToValueAtTime(0.0001, end + 0.06);
    for (const det of [-9, 9]) { const o = c.createOscillator(); o.type = dark ? 'sawtooth' : 'square'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(end + 0.08); }
    lp.connect(g); g.connect(dest || this.musicGain);
  },
  accChord(root, t, dur, vol) { const r = 62 + (((root - 62) % 12) + 12) % 12; for (const m of [r, r + 4, r + 7]) this.accNote(mf(m), t, dur, vol); },
  keromong(f, t, vol, dest) { this.metal(f, t, vol, 0.95, [[1, 1, 1], [2.0, 0.16, 0.3], [3.0, 0.06, 0.12]], 1.1, dest || this.musicGain, { f0: f * 1.01, glide: 0.02, attack: 0.004 }); },
  gambang(f, t, vol, dest) { const d = dest || this.musicGain; this.env('sine', f, t, 0.22, vol, d); this.env('sine', f * 3.98, t, 0.04, vol * 0.3, d); this.noiseHit(t, 0.015, vol * 0.4, 'bandpass', 2500, 1, d); },
  kompang(t, vol, open, dest) {
    const d = dest || this.musicGain;
    if (open) { this.env('sine', 185, t, 0.12, vol * 0.8, d, { f0: 250, glide: 0.04 }); this.noiseHit(t, 0.05, vol * 0.45, 'bandpass', 900, 1, d); }
    else { this.noiseHit(t, 0.045, vol, 'bandpass', 1500, 1.5, d); this.env('triangle', 330, t, 0.03, vol * 0.45, d); }
  },
  gDung(t, vol, dest) { this.env('sine', 108, t, 0.28, vol, dest || this.musicGain, { f0: 150, glide: 0.05 }); this.noiseHit(t, 0.04, vol * 0.25, 'lowpass', 600, 0, dest || this.musicGain); },
  gTak(t, vol, dest) { this.noiseHit(t, 0.06, vol, 'bandpass', 2000, 2, dest || this.musicGain); this.env('triangle', 410, t, 0.05, vol * 0.4, dest || this.musicGain); },
  ching(t, vol, dest) { this.env('sine', 3900, t, 0.22, vol, dest || this.musicGain); this.env('sine', 5300, t, 0.16, vol * 0.6, dest || this.musicGain); this.noiseHit(t, 0.04, vol * 0.5, 'highpass', 7000, 0, dest || this.musicGain); },

  // ---------- kesan bunyi ----------
  at(delay = 0) { return this.now() + delay; },
  jump() { if (!this.ctx) return; this.env('square', 620, this.at(), 0.12, 0.05, this.master, { f0: 300, glide: 0.1 }); },
  coin() { if (!this.ctx) return; const t = this.at(); this.bonang(noteF('A5'), t, 0.1, this.master); this.bonang(noteF('D6'), t + 0.06, 0.09, this.master); },
  jar() { if (!this.ctx) return; const t = this.at(); ['D5', 'F#5', 'A5', 'D6'].forEach((n, i) => this.bonang(noteF(n), t + i * 0.05, 0.1, this.master)); },
  life() { if (!this.ctx) return; const t = this.at(); ['D5', 'F#5', 'A5', 'C6', 'D6'].forEach((n, i) => this.saron(noteF(n), t + i * 0.07, 0.11, 0.8, this.master)); this.kenong(noteF('D5'), t + 0.38, 0.12, this.master); },
  deliver(perfect) {
    if (!this.ctx) return; const t = this.at();
    const ns = perfect ? ['D5', 'F#5', 'A5', 'Bb5', 'D6'] : ['D5', 'F#5', 'A5', 'D6'];
    ns.forEach((n, i) => this.bonang(noteF(n), t + i * 0.055, 0.1, this.master));
    this.kenong(noteF(perfect ? 'D5' : 'A4'), t + ns.length * 0.055, 0.14, this.master);
  },
  throwIt() { if (!this.ctx) return; this.env('triangle', 1100, this.at(), 0.15, 0.06, this.master, { f0: 500, glide: 0.14 }); },
  nope() { if (!this.ctx) return; this.tak(this.at(), 0.12, 1800, this.master); },
  hit() { if (!this.ctx) return; const t = this.at(); this.noiseHit(t, 0.25, 0.3, 'lowpass', 900); this.env('sawtooth', 70, t, 0.3, 0.12, this.master, { f0: 170, glide: 0.25 }); this.gambus(noteF('Eb3'), t, 0.35, 0.3, { bend: 0.75, dest: this.master }); },
  honk() { if (!this.ctx) return; const t = this.at(); this.env('sawtooth', 300, t, 0.16, 0.08, this.master, { f0: 340 }); this.env('sawtooth', 280, t + 0.2, 0.2, 0.08, this.master, { f0: 330 }); },
  splash() { if (!this.ctx) return; const t = this.at(); this.noiseHit(t, 0.5, 0.3, 'lowpass', 2000); this.env('sine', 120, t, 0.3, 0.1, this.master, { f0: 400, glide: 0.3 }); },
  thud() { if (!this.ctx) return; const t = this.at(); this.dok(t, 0.4, this.master); this.noiseHit(t, 0.12, 0.15, 'lowpass', 500); },
  whistle() { if (!this.ctx) return; this.env('sine', 500, this.at(), 0.6, 0.04, this.master, { f0: 1400, glide: 0.6 }); },
  miss() { if (!this.ctx) return; const t = this.at(); ['A4', 'F#4', 'Eb4'].forEach((n, i) => this.gambus(noteF(n), t + i * 0.13, 0.4, 0.15, { dest: this.master })); },
  phase() { if (!this.ctx) return; const t = this.at(); this.gong(t, 0.35, this.master); ['D5', 'Eb5', 'F#5', 'A5', 'D6'].forEach((n, i) => this.bonang(noteF(n), t + 0.05 + i * 0.07, 0.08, this.master)); },
  boom() { if (!this.ctx) return; const t = this.at(); this.noiseHit(t, 0.6, 0.12, 'lowpass', 700); this.kesi(t + 0.15, 0.03, this.master); },
  tick() { if (!this.ctx) return; this.kenong(noteF('A4'), this.at(), 0.16, this.master); },
  go() { if (!this.ctx) return; const t = this.at(); this.gong(t, 0.45, this.master); this.tak(t, 0.3, 2600, this.master); this.bonang(noteF('D6'), t, 0.1, this.master); },
  win() {
    if (!this.ctx) return; const t = this.at();
    // larian gambus + "tahtim" marwas + gong penutup
    ['D4', 'Eb4', 'F#4', 'G4', 'A4', 'Bb4', 'C5', 'D5'].forEach((n, i) => this.gambus(noteF(n), t + i * 0.07, 0.4, 0.1, { dest: this.master }));
    for (let i = 0; i < 8; i++) this.tak(t + 0.6 + i * 0.06, 0.25 + i * 0.02, 2600, this.master);
    this.dung(t + 1.1, 0.6, this.master); this.gong(t + 1.1, 0.6, this.master);
    ['D5', 'F#5', 'A5', 'D6'].forEach((n, i) => this.saron(noteF(n), t + 1.1 + i * 0.12, 0.12, 1.2, this.master));
  },
  crash() {
    if (!this.ctx) return; const t = this.at();
    this.noiseHit(t, 0.6, 0.35, 'lowpass', 700);
    ['D5', 'C5', 'Bb4', 'A4', 'G4', 'F#4', 'Eb4', 'D4'].forEach((n, i) => this.gambus(noteF(n), t + 0.15 + i * 0.09, 0.4, 0.12, { dest: this.master }));
    this.gong(t + 0.9, 0.5, this.master);
  },

  // ---------- muzik latar ----------
  play(track, level) {
    if (!this.ctx) return;
    const changed = track !== this.track || !this.musicOn;
    this.track = track; if (level != null) this.level = level;
    if (!changed) return;
    this.stopMusic(); this.musicOn = true; this.sstep = 0; this.cur = null; this.nextT = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.pump(), 25); this.pump();
  },
  setLevel(l) { this.level = l; },
  setTense(on) { this.tense = on; },
  stopMusic() { this.musicOn = false; clearInterval(this.timer); this.timer = null; },
  pump() {
    if (!this.musicOn || !this.ctx) return;
    while (this.nextT < this.ctx.currentTime + 0.15) this.nextT += this.playStep(this.nextT);
  },
  // satu langkah muzik; pulangkan tempoh langkah (saat)
  playStep(t) {
    if (this.track === 'menu') { this.stepMenu(this.sstep++, t); return 60 / 92 / 4; }
    if (this.track === 'dizzy') { this.stepDizzy(this.sstep++, t); return 60 / 72 / 4; }
    const want = this.tense ? 'tense' : (this.level <= 2 ? 'joget' : 'zapin');
    // tukar lagu hanya di permulaan bar
    if (!this.cur || (want !== this.cur && this.sstep % (this.cur === 'joget' ? 12 : 16) === 0)) { this.cur = want; this.sstep = 0; }
    const st = this.sstep++;
    if (this.cur === 'joget') { this.stepJoget(st, t); return 60 / (JOGET_DQ[this.level] * 6); }
    if (this.cur === 'zapin') { this.stepZapin(st, t); return 60 / BPM_PLAY[this.level] / 4; }
    this.stepTense(st, t); return 60 / Math.max(128, BPM_PLAY[this.level] + 8) / 4;
  },
  stepJoget(step, t) {
    const J = SONG_JOGET, s = step % J.len, bar = Math.floor(s / 12), b = s % 12, L = this.level, d = 60 / (JOGET_DQ[L] * 6);
    const hem = bar % 2 === 1, fill = bar % 8 === 7;
    if (b === 0 && bar % 8 === 0) this.gong(t, 0.45);
    if (b === 0 && bar % 8 === 4) this.kenong(noteF('A3'), t, 0.1);
    // biola + cengkok (not hiasan atas) pada not panjang
    const on = J.onset[s];
    if (on) {
      const f = mf(on.m), long = on.len >= 3;
      if (long && L >= 1) {
        const i = JOGET_SCALE.indexOf(((on.m - 62) % 12 + 12) % 12 + 62);
        const up = i >= 0 ? JOGET_SCALE[(i + 1) % 7] + (on.m - (((on.m - 62) % 12 + 12) % 12 + 62)) + (i === 6 ? 12 : 0) : on.m + 2;
        this.violin(mf(up), t, 0.045, 0.07); this.violin(f, t + 0.05, on.len * d - 0.05, 0.09);
      } else this.violin(f, t, on.len * d * 0.92, 0.09);
      if (L >= 2) this.env('sine', mf(on.m + 12), t, on.len * d + 0.1, 0.035, this.musicGain, { attack: 0.03, wob: 5, wobDepth: 0.006 });
    }
    // akordion: bes + kord (oom-pah-pah 6/8, hemiola pada bar genap)
    if (b % 2 === 0) {
      const e = b / 2, root = J.roots[bar];
      const bass = hem ? [0, 2, 4] : [0, 3], chord = hem ? [1, 3, 5] : [1, 2, 4, 5];
      const bi = bass.indexOf(e);
      if (bi >= 0) this.accNote(mf(root + (bi % 2 ? 7 : 0)), t, d * 1.5, 0.12, true);
      if (chord.includes(e)) this.accChord(root, t, d * 1.2, 0.026);
    }
    // gendang Melayu
    const ch = (fill ? GENDANG_FILL : hem ? GENDANG_B : GENDANG_A)[b];
    if (ch === 'D') this.gDung(t, 0.5); else if (ch === 'T') this.gTak(t, 0.3); else if (ch === 't') this.gTak(t, 0.13);
    if (L >= 2 && (hem ? REBANA_B : REBANA_A)[b] === 't') this.tak(t, 0.1, 3400);
    if (L >= 2 && (hem ? b % 4 === 0 : b % 6 === 0)) this.ching(t, 0.03);
    const kp = (hem ? KOMPANG_B : KOMPANG_A)[b];
    if (kp === 'P') this.kompang(t, 0.26, false); else if (kp === 'p') this.kompang(t, 0.13, false); else if (kp === 'K') this.kompang(t, 0.22, true);
  },
  stepZapin(step, t) {
    const S0 = SONG_PLAY, s = step % S0.len, bar = s >> 4, b = s & 15, L = this.level, d16 = 60 / BPM_PLAY[L] / 4;
    if (b === 0 && S0.gongBars.has(bar)) this.gong(t, 0.5);
    if (b === 8) this.kenong(mf(bar % 2 ? 62 : 57), t, 0.09);
    const on = S0.onset[s];
    if (on) {
      this.gambus(mf(on.m), t, 0.34, on.len * d16);
      if (L >= 4) this.gambus(mf(on.m + 12), t, 0.12, on.len * d16);
      if (on.len >= 4 && L >= 2) for (let k = 2; k < on.len; k += (L >= 3 ? 1 : 2)) this.gambus(mf(on.m), t + k * d16, L >= 3 ? 0.13 : 0.17, d16);
    }
    if (L >= 2 && b % 4 === 0) this.saron(mf(S0.held[s] + 12), t, 0.05, 0.9);
    if (L >= 3 && b % 4 === 0) this.keromong(mf(S0.held[s] + 12), t, 0.04);
    if (L >= 2 && (b === 0 || b === 6 || b === 10)) this.gambus(mf(S0.roots[bar] + (b === 6 ? 7 : 0)), t, 0.26, d16 * 3, { dark: true });
    if (L === 1 && (b === 0 || b === 10)) this.gambus(mf(S0.roots[bar]), t, 0.2, d16 * 3, { dark: true });
    const fill = bar === S0.bars - 1 || (L >= 4 && bar % 4 === 3);
    const ch = (fill ? FILL : MARWAS_A)[b];
    if (ch === 'D') this.dung(t, 0.42); else if (ch === 'T') this.tak(t, 0.26);
    if (L >= 2 && MARWAS_B[b] === 't') this.tak(t, 0.13, 3600);
    if (L >= 3 && DOK[b] === 'B') this.dok(t, 0.4);
    if (L >= 4 && b % 4 === 2) this.kesi(t, 0.04);
    if (b === 0 || b === 10) this.gDung(t, 0.3);
    const kp = KOMPANG_16[b];
    if (kp === 'P') this.kompang(t, 0.2, false); else if (kp === 'p') this.kompang(t, 0.1, false); else if (kp === 'K') this.kompang(t, 0.17, true);
  },
  stepTense(step, t) {
    const S0 = SONG_TENSE, s = step % S0.len, bar = s >> 4, b = s & 15, d16 = 60 / Math.max(128, BPM_PLAY[this.level] + 8) / 4;
    if (b === 0 && S0.gongBars.has(bar)) this.gong(t, 0.55);
    const on = S0.onset[s];
    if (on) this.gambus(mf(on.m), t, 0.34, on.len * d16);
    // tremolo gambus rendah (bunyi cemas)
    this.gambus(mf(S0.roots[bar] + 12 + (b % 8 === 7 ? 1 : 0)), t, 0.1, d16, { dark: true });
    // bonang tinggi bertembung Eb/D
    if (b % 2 === 0) this.bonang(noteF(b % 4 === 0 ? 'Eb6' : 'D6'), t, 0.025);
    if (b % 4 === 0) this.saron(mf(S0.held[s] + 12), t, 0.05, 0.6);
    const ch = TENSE_DRUM[b];
    if (ch === 'D') this.dung(t, 0.45); else if (ch === 'T') this.tak(t, 0.24); else if (ch === 't') this.tak(t, 0.12, 3600);
    if (HEART[b] === 'B') this.dok(t, 0.5);
    if (b === 12) this.kenong(noteF('Eb4'), t, 0.08);
    if (KOMPANG_16[b] === 'K') this.kompang(t, 0.18, true); else if (KOMPANG_16[b] === 'P') this.kompang(t, 0.16, false);
  },
  stepMenu(step, t) {
    const M = SONG_MENU, s = step % M.len, beat = s >> 2, sub = s & 3, n = M.beats[beat], nx = M.beats[(beat + 1) % M.beats.length], inP = beat % 16;
    const ni = pentaIdx(n), xi = pentaIdx(nx), dir = xi > ni ? 1 : xi < ni ? -1 : 1;
    if (sub === 0) {
      this.saron(mf(n + 12), t, 0.08, 1.1);                       // saron: balungan
      if (inP === 15) this.gong(t, 0.6);                           // gong agung
      else if (inP === 7) this.kenong(mf(n - 12), t, 0.14);        // gong suwukan / kenong besar
      else if (inP % 4 === 3) this.kenong(mf(n), t, 0.07);
      this.keromong(mf(n + 12), t, 0.06);
    }
    if (sub === 2) this.keromong(mf(PENTA[ni + dir] + 12), t, 0.045);   // keromong: not lalu ke not seterusnya
    if (beat % 8 >= 4 && beat % 8 < 7) this.gambang(mf(PENTA[clamp(ni + dir * sub, 0, PENTA.length - 1)] + 24), t, 0.035);
    const k = s % 8;                                                // gendang ibu & anak
    if (GENDANG_IBU[k] === 'D') this.gDung(t, 0.42); else if (GENDANG_IBU[k] === 'T') this.gTak(t, 0.24);
    if (GENDANG_ANAK[k] === 't') this.gTak(t, 0.1);
  },
  // lagu "pening-pening": nada beralun, wisel jatuh, burung bercicip
  stepDizzy(step, t) {
    const s = step % 32, b = s & 15, d16 = 60 / 72 / 4;
    const LEAD = { 0: 'A5', 3: 'F#5', 6: 'Eb5', 8: 'C5', 11: 'A4', 14: 'F#4', 16: 'Eb4', 19: 'D4', 22: 'Eb4', 24: 'D4', 27: 'C#4', 28: 'D4' };
    if (LEAD[s]) {
      const f = noteF(LEAD[s]);
      this.env('triangle', f, t, 0.55, 0.16, this.musicGain, { wob: 5.5, wobDepth: 0.045 });
      this.env('sine', f * 1.012, t, 0.55, 0.09, this.musicGain, { wob: 4.1, wobDepth: 0.05 });
    }
    // bass "boing" berpegas
    if (b === 0 || b === 8) this.gambus(noteF(b === 0 ? 'D3' : 'A2'), t, 0.5, d16 * 3, { bend: 0.82, bendT: 0.35, dark: true });
    // rentak terhuyung-hayang
    if (b === 4 || b === 13) this.tak(t, 0.12, 2200);
    if (b === 0) this.dok(t, 0.25);
    // wisel jatuh "wiiuuu"
    if (s === 2) this.env('sine', 380, t, 0.9, 0.08, this.musicGain, { f0: 1500, glide: 0.9, wob: 7, wobDepth: 0.04 });
    // burung bercicip (bintang pening)
    if (s === 20 || s === 23 || s === 30) { this.env('sine', 2900, t, 0.06, 0.03, this.musicGain, { f0: 2200, glide: 0.05 }); this.env('sine', 3100, t + 0.07, 0.05, 0.025, this.musicGain, { f0: 2500, glide: 0.04 }); }
  },
  // rakam muzik secara luar talian (untuk ujian / demo)
  async renderDemo(parts, sr = 44100) {
    const total = parts.reduce((a, p) => a + p.secs, 0);
    const off = new OfflineAudioContext(1, Math.ceil(sr * (total + 1)), sr);
    const keep = { ctx: this.ctx, master: this.master, musicGain: this.musicGain, noiseBuf: this.noiseBuf, ksCache: this.ksCache, track: this.track, level: this.level, tense: this.tense, cur: this.cur, sstep: this.sstep };
    this.attach(off, true);
    let t0 = 0.05;
    for (const p of parts) {
      this.track = p.track; this.level = p.level || 1; this.tense = !!p.tense; this.cur = null; this.sstep = 0;
      let t = t0;
      while (t < t0 + p.secs) t += this.playStep(t);
      t0 += p.secs;
    }
    const buf = await off.startRendering();
    Object.assign(this, keep);
    return buf.getChannelData(0);
  },
};
function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* tiada */ } }

// ============================================================
// Penjana tahap
// ============================================================
function phaseOfIdx(i) { return i < 8 ? 0 : i < 16 ? 1 : i < 23 ? 2 : 3; }
function speedAtIdx(i) { return lerp(SPEED_MIN, SPEED_MAX, i / (TOTAL - 1)); }

function buildLevel(seed, decorOnly = false) {
  rand = mulberry32(seed);
  const L = { houses: [], obs: [], items: [], crossings: [], decor: [], geese: [], signs: [], endX: 0 };
  const names = shuffle(NAMES);
  let x = 300;
  const kets = new Set([10, 18, 25]);
  for (let i = 0; i < TOTAL; i++) {
    const ph = phaseOfIdx(i), sp = speedAtIdx(i);
    const spacing = Math.round(lerp(330, 410, i / (TOTAL - 1))) + ri(-15, 15);
    const hx = x + spacing;
    if (!decorOnly) fillHazards(L, x + 20, hx - 30, i, ph, sp);
    else if (rand() < 0.4) L.crossings.push({ x: x + 120, len: 60, broken: false });
    if (!decorOnly && kets.has(i)) L.items.push({ type: 'ketupat', x: hx - 40, y: GY - 46, taken: false });
    const house = { x: hx, w: 78, idx: i + 1, name: names[i], state: decorOnly ? 'deco' : 'pending', v: ri(0, 3), zone: [hx + 12, hx + 66], thanks: 0 };
    L.houses.push(house);
    // kuih di depan rumah sebagai panduan
    if (!decorOnly && rand() < 0.5) for (let k = 0; k < 3; k++) L.items.push({ type: 'kuih', k: ri(0, 3), x: hx + 26 + k * 12, y: GY - 12, taken: false });
    x = hx + 78 + 24;
  }
  L.endX = x + 60;
  L.lastHouseX = L.houses[TOTAL - 1].x;
  // hiasan tepi jalan (di belakang jalan)
  const blocked = (a, b) => L.houses.some((h) => overlap(a, b, h.x - 18, h.x + h.w + 4)) || L.crossings.some((c) => overlap(a, b, c.x - 30, c.x + c.len + 6));
  let d = 40;
  while (d < L.endX + 400) {
    const type = pick(['palm', 'palm', 'banana', 'bush', 'bush', 'pagar']);
    const w = { palm: 34, banana: 30, bush: 26, pagar: 40 }[type];
    if (!blocked(d, d + w)) L.decor.push({ type, x: d });
    d += w + ri(10, 60);
  }
  // pelita sepanjang jalan untuk senja & malam
  const pelStart = L.houses[15].x - 60;
  for (let p = pelStart; p < L.endX + 300; p += 46) if (!L.crossings.some((c) => overlap(p - 4, p + 8, c.x - 4, c.x + c.len + 4))) L.decor.push({ type: 'pelita', x: p });
  // kelapa jatuh mesti ada pokok kelapa
  for (const o of L.obs) if (o.type === 'kelapa') L.decor.push({ type: 'palm', x: o.x - 14 });
  for (const c of L.crossings) if (c.broken) L.signs.push({ x: c.x - 30 });
  L.decor.sort((a, b) => a.x - b.x);
  L.obs.sort((a, b) => a.x - b.x);
  L.items.sort((a, b) => a.x - b.x);
  L.geese.sort((a, b) => a.x - b.x);
  L.crossings.sort((a, b) => a.x - b.x);
  return L;
}

function fillHazards(L, a, b, i, ph, sp) {
  const minGap = sp * 0.85 + 24;
  let cur = a + rr(10, 40);
  const weights = [
    { lubang: 3, batu: 3, tahi: 1.5, angsa: i >= 3 ? 1 : 0, broken: i >= 5 ? 0.8 : 0, bridge: 1, kuih: 1.4 },
    { lubang: 2, batu: 2, tahi: 2.5, angsa: 1.6, kelapa: 1.8, bridge: 0.6, kuih: 1.5, broken: 0.4 },
    { lubang: 2, batu: 2, tahi: 2, angsa: 1.5, kelapa: 1.5, broken: 2, kuih: 1.2 },
    { lubang: 2, batu: 2.2, tahi: 2, angsa: 1.6, kelapa: 1.2, broken: 2.2, kuih: 1 },
  ][ph];
  const count = [i < 2 ? 1 : 2, i < 12 ? 2 : 3, 3, 3][ph];
  let placed = 0, guard = 0;
  while (cur < b - 16 && guard++ < 20) {
    let total = 0; for (const k in weights) total += weights[k];
    let r = rand() * total, type = 'lubang';
    for (const k in weights) { r -= weights[k]; if (r <= 0) { type = k; break; } }
    if (placed >= count && type !== 'kuih') type = 'kuih';
    if (type === 'bridge' || type === 'broken') {
      const broken = type === 'broken';
      const len = broken ? ri(74, 88) : ri(54, 66);
      if (cur + len > b) { cur += 20; continue; }
      const gw = broken ? Math.round(lerp(30, 44, i / TOTAL)) : 0;
      const cr = { x: cur, len, broken, gap: broken ? [cur + Math.round((len - gw) / 2), cur + Math.round((len + gw) / 2)] : null };
      L.crossings.push(cr);
      if (broken) { for (let k = 0; k < 3; k++) L.items.push({ type: 'kuih', k: ri(0, 3), x: cr.gap[0] - 6 + k * ((gw + 12) / 2), y: GY - 30 - (k === 1 ? 14 : 0), taken: false }); placed++; }
      cur += len + minGap;
    } else if (type === 'kuih') {
      const n = ri(3, 5), high = rand() < 0.35;
      for (let k = 0; k < n; k++) L.items.push({ type: 'kuih', k: ri(0, 3), x: cur + k * 13, y: high ? GY - 40 : GY - 12, taken: false });
      if (high && rand() < 0.5) L.items.push({ type: 'jar', x: cur + n * 13 + 10, y: GY - 62, taken: false });
      cur += n * 13 + 30;
    } else if (type === 'angsa') {
      L.geese.push({ x: cur - PX - Math.round(sp * 1.3), fired: false });
      cur += minGap * 1.4; placed++;
    } else {
      const dims = { lubang: [ri(18, 24), 3], batu: [15, 11], tahi: [14, 6], kelapa: [11, 10] }[type];
      const o = { type, x: cur, w: dims[0], h: dims[1], hit: false, state: 'wait', fy: -14, vy: 0 };
      L.obs.push(o); placed++;
      if (rand() < 0.45) for (let k = 0; k < 3; k++) L.items.push({ type: 'kuih', k: ri(0, 3), x: cur + o.w / 2 - 14 + k * 14, y: GY - 34 - (k === 1 ? 8 : 0), taken: false });
      cur += o.w + minGap * rr(1, 1.5);
    }
  }
}

// ============================================================
// Keadaan permainan
// ============================================================
const G = {
  state: 'menu', level: null, cam: 0, speed: 0, tod: 0.06, todForced: null, anim: 0,
  score: 0, delivered: 0, processed: 0, lives: 3, combo: 0, bestCombo: 0, kuih: 0, time: 0, perfects: 0,
  player: null, goose: null, particles: [], popups: [], packages: [], fireworks: [], confetti: [],
  shake: 0, flash: 0, phaseIdx: 0, banner: null, countdown: 0, deliverCd: 0, doneT: 0,
  paused: false, menuScale: 2, lights: [], jumps: 0, playerName: store.get('vrtb_name', ''), consent: store.get('vrtb_consent', false),
  lastRank: -1, finalBonus: 0, gooseIdx: 0,
};
function newPlayer() { return { y: GY, vy: 0, grounded: true, coyote: 0, buffer: 0, holding: false, inv: 0, falling: false, splashT: 0, ghost: 0, wheelT: 0, crashT: 0, rot: 0, dropIn: 0 }; }
G.player = newPlayer();

// ============================================================
// Kanvas
// ============================================================
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const worldCv = document.createElement('canvas');
const wctx = worldCv.getContext('2d');
const darkCv = document.createElement('canvas'); darkCv.width = W; darkCv.height = H;
const dctx = darkCv.getContext('2d');
let SC = 3;
// cache jalur latar (dilukis sekali, disalin setiap frame)
const STRIPS = new Map();
function strip(key, w, h, draw) {
  let s = STRIPS.get(key);
  if (!s || s.sc !== SC) {
    s = document.createElement('canvas'); s.width = Math.ceil(w * SC); s.height = Math.ceil(h * SC);
    const c = s.getContext('2d'); c.scale(SC, SC); c.lineJoin = 'round'; c.lineCap = 'round'; draw(c);
    s.sc = SC; s.lw = w; s.lh = h; STRIPS.set(key, s);
    if (STRIPS.size > 90) STRIPS.delete(STRIPS.keys().next().value);
  }
  return s;
}
const blit = (c, s, x, y) => c.drawImage(s, x, y, s.lw, s.lh);
const DOTS = {};
function dotSprite(col) {
  if (DOTS[col]) return DOTS[col];
  const cv = document.createElement('canvas'); cv.width = cv.height = 24; const g = cv.getContext('2d');
  g.globalAlpha = 0.35; g.fillStyle = col; g.beginPath(); g.arc(12, 12, 11, 0, 7); g.fill(); g.globalAlpha = 1; g.beginPath(); g.arc(12, 12, 5, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(10.5, 10.5, 1.8, 0, 7); g.fill();
  return (DOTS[col] = cv);
}
// sprite cahaya siap-lukis
const LIGHT = {};
function buildLights() {
  const radial = (rgb, inner) => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); const gr = g.createRadialGradient(32, 32, inner, 32, 32, 32); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return cv; };
  LIGHT.hole = radial('0,0,0', 1); LIGHT.glow = radial('255,170,60', 0);
  const cone = (rgb, mid, k) => {
    const cv = document.createElement('canvas'); cv.width = 160 * k; cv.height = 100 * k; const g = cv.getContext('2d'); g.scale(k, k);
    g.beginPath(); g.moveTo(2, 48); g.lineTo(156, 4); g.lineTo(156, 94); g.lineTo(2, 53); g.closePath(); g.clip();
    const gr = g.createRadialGradient(4, 50, 2, 4, 50, 150); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.6, `rgba(${rgb},${mid})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 160, 100); return cv;
  };
  LIGHT.coneHole = cone('0,0,0', 0.75, 1); LIGHT.coneGlow = cone('255,236,150', 0.35, 2);
}

function resize() {
  const fit = document.getElementById('fit'), fr = document.getElementById('frame');
  const r = fit.getBoundingClientRect();
  const scale = Math.max(0.5, Math.min(r.width / W, r.height / H));
  const cw = Math.floor(W * scale), ch = Math.floor(H * scale);
  fr.style.width = cw + 'px'; fr.style.height = ch + 'px';
  fr.style.setProperty('--px', scale + 'px');
  const dpr = window.devicePixelRatio || 1;
  SC = clamp(Math.round(scale * dpr), 1, 3);
  cv.width = W * SC; cv.height = H * SC; worldCv.width = W * SC; worldCv.height = H * SC;
  if (FRAME) render();
}

// ============================================================
// Langit & masa
// ============================================================
const SKY = [
  { t: 0.00, c: ['#3f9be8', '#7cc4f5', '#c9ecff'], tint: [0, 0, 0, 0], dark: 0 },
  { t: 0.21, c: ['#3f9be8', '#7cc4f5', '#c9ecff'], tint: [0, 0, 0, 0], dark: 0 },
  { t: 0.29, c: ['#ee8f3c', '#f7bd5a', '#ffe6a6'], tint: [255, 150, 40, 0.13], dark: 0 },
  { t: 0.49, c: ['#ee8f3c', '#f7bd5a', '#ffe6a6'], tint: [255, 150, 40, 0.13], dark: 0 },
  { t: 0.56, c: ['#4a2f7a', '#d55a78', '#ffa552'], tint: [190, 70, 120, 0.24], dark: 0.04 },
  { t: 0.71, c: ['#41286e', '#c94f74', '#ff9a4e'], tint: [190, 70, 120, 0.28], dark: 0.12 },
  { t: 0.79, c: ['#070b26', '#141c4a', '#2a2f6a'], tint: [20, 30, 90, 0.30], dark: 0.64 },
  { t: 1.00, c: ['#070b26', '#141c4a', '#2a2f6a'], tint: [20, 30, 90, 0.30], dark: 0.64 },
].map((k) => ({ ...k, rgb: k.c.map(hex2rgb) }));
function skyAt(t) {
  let i = 0; while (i < SKY.length - 2 && t > SKY[i + 1].t) i++;
  const a = SKY[i], b = SKY[i + 1], f = clamp((t - a.t) / (b.t - a.t || 1), 0, 1);
  return {
    c: a.rgb.map((c, k) => mixRgb(c, b.rgb[k], f)),
    tint: [lerp(a.tint[0], b.tint[0], f), lerp(a.tint[1], b.tint[1], f), lerp(a.tint[2], b.tint[2], f), lerp(a.tint[3], b.tint[3], f)],
    dark: lerp(a.dark, b.dark, f),
  };
}
function todAt(cam) {
  const L = G.level; if (!L || G.state === 'menu') return 0.06;
  const pxw = cam + PX + 20, hs = L.houses;
  if (pxw <= hs[0].x) return clamp(pxw / hs[0].x, 0, 1) * (0.5 / TOTAL);
  for (let i = 0; i < hs.length - 1; i++) if (pxw < hs[i + 1].x) return (i + 0.5 + (pxw - hs[i].x) / (hs[i + 1].x - hs[i].x)) / TOTAL;
  return clamp((TOTAL - 0.5 + (pxw - hs[TOTAL - 1].x) / 300) / TOTAL, 0, 1);
}
const phaseOfTod = (t) => (t < PHASE_AT[1] ? 0 : t < PHASE_AT[2] ? 1 : t < PHASE_AT[3] ? 2 : 3);
function clockAt(t) {
  const K = [[0, 8], [0.27, 14.5], [0.53, 18.4], [0.77, 19.9], [1, 22.5]];
  let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++;
  const h = lerp(K[i][1], K[i + 1][1], clamp((t - K[i][0]) / (K[i + 1][0] - K[i][0]), 0, 1));
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}

// latar: banjaran gunung & bukit
const MT_FAR = new Int16Array(512), MT_NEAR = new Int16Array(512);
for (let i = 0; i < 512; i++) {
  const a = (i / 512) * Math.PI * 2;
  MT_FAR[i] = Math.round(40 + 16 * Math.sin(a * 2) + 9 * Math.sin(a * 5 + 1) + 4 * Math.sin(a * 13 + 2));
  MT_NEAR[i] = Math.round(18 + 7 * Math.sin(a * 3 + 0.5) + 5 * Math.sin(a * 7 + 1.3) + 2 * Math.sin(a * 17));
}
const STARS = Array.from({ length: 70 }, (_, i) => ({ x: (hash(i * 3 + 1) * 0.5 + 0.5) * W, y: (hash(i * 7 + 2) * 0.5 + 0.5) * 170, p: hash(i * 11) * 6 }));
const CLOUDS = [{ x: 20, y: 64, s: 0, v: 3 }, { x: 140, y: 40, s: 1, v: 5 }, { x: 250, y: 92, s: 0, v: 2 }, { x: 330, y: 120, s: 1, v: 4 }];
const FAR_ITEMS = (() => { const r = mulberry32(99); const out = []; let x = 0; while (x < 640) { out.push({ x, t: r() < 0.55 ? 'house' : 'palm', f: r() < 0.5 }); x += 22 + Math.floor(r() * 40); } return out; })();

// ============================================================
// Lukisan (gaya kartun 2D)
// ============================================================
function drawSky(c, t) {
  const sk = skyAt(t);
  const g = c.createLinearGradient(0, 0, 0, 210);
  g.addColorStop(0, rgbStr(sk.c[0])); g.addColorStop(0.55, rgbStr(sk.c[1])); g.addColorStop(1, rgbStr(sk.c[2]));
  c.fillStyle = g; c.fillRect(0, 0, W, 215);
  const night = clamp((t - 0.7) / 0.1, 0, 1);
  if (night > 0) {
    for (const s of STARS) {
      const a = night * (0.45 + 0.55 * Math.sin(G.anim * 2 + s.p));
      c.globalAlpha = clamp(a, 0, 1);
      if (s.p > 4) sparkle(c, s.x, s.y, 1.6, '#fff6d8'); else { c.fillStyle = '#fff6d8'; c.fillRect(s.x - 0.5, s.y - 0.5, 1, 1); }
    }
    c.globalAlpha = 1;
  }
  if (t < 0.74 && G.state !== 'menu') {
    const k = clamp(t / 0.72, 0, 1);
    const sx = lerp(168, 112, k), sy = lerp(46, 196, k * k);
    const col = mixRgb([255, 232, 110], [255, 110, 60], clamp((t - 0.25) / 0.45, 0, 1));
    const r = lerp(11, 16, k);
    const gl = c.createRadialGradient(sx, sy, r * 0.6, sx, sy, r * 2.6); gl.addColorStop(0, rgbStr(col, 0.45)); gl.addColorStop(1, rgbStr(col, 0));
    c.fillStyle = gl; c.fillRect(sx - r * 3, sy - r * 3, r * 6, r * 6);
    c.fillStyle = rgbStr(col); disc(c, sx, sy, r);
    c.fillStyle = 'rgba(255,255,255,0.35)'; disc(c, sx - r * 0.3, sy - r * 0.3, r * 0.45);
  }
  if (night > 0) {
    const my = lerp(70, 44, night) + 12;
    const gl = c.createRadialGradient(170, my, 4, 170, my, 30); gl.addColorStop(0, `rgba(255,240,190,${0.35 * night})`); gl.addColorStop(1, 'rgba(255,240,190,0)');
    c.fillStyle = gl; c.fillRect(140, my - 30, 60, 60);
    c.globalAlpha = night; ds(c, S.moon, 158, my - 12); c.globalAlpha = 1;
  }
}

function drawClouds(c) {
  for (const cl of CLOUDS) {
    const span = W + 90;
    let x = (cl.x - G.cam * 0.04 - G.anim * cl.v) % span; if (x < -45) x += span;
    ds(c, S.cloud[cl.s], x, cl.y);
  }
}

function hillPath(c, arr, off, base, amp = 1, width = W) {
  c.beginPath(); c.moveTo(-2, base + 8);
  for (let x = -2; x <= width + 3; x += 2) { const p = x + off, i = Math.floor(p), f = p - i; c.lineTo(x, base - lerp(arr[((i % 512) + 512) % 512], arr[(((i + 1) % 512) + 512) % 512], f) * amp); }
  c.lineTo(width + 3, base + 8); c.closePath();
}
function drawFarLayers(c, t) {
  const cam = G.cam;
  const far = strip('mtfar', 512 + W, 84, (c) => {
    c.translate(0, -126); hillPath(c, MT_FAR, 0, 202, 1, 512 + W);
    const g = c.createLinearGradient(0, 140, 0, 205); g.addColorStop(0, '#a7c9e8'); g.addColorStop(1, '#cfe3f3');
    c.fillStyle = g; c.fill(); c.strokeStyle = '#86aed3'; c.lineWidth = 0.8; c.stroke();
  });
  blit(c, far, -((cam * 0.05) % 512), 126);
  const near = strip('mtnear', 512 + W, 46, (c) => {
    c.translate(0, -166); hillPath(c, MT_NEAR, 0, 204, 1, 512 + W);
    const g = c.createLinearGradient(0, 170, 0, 205); g.addColorStop(0, '#7cc274'); g.addColorStop(1, '#a6db8e');
    c.fillStyle = g; c.fill(); c.strokeStyle = '#4f9a52'; c.lineWidth = 0.9; c.stroke();
  });
  blit(c, near, -((cam * 0.12) % 512), 166);
  const o = cam * 0.28;
  for (const it of FAR_ITEMS) {
    let x = it.x - (o % 640); if (x < -30) x += 640; if (x > W) continue;
    if (it.t === 'house') ds(c, S.houseFar, x, 180);
    else c.drawImage(S.palm, x, 164, 24, 45);
  }
  const sk = skyAt(t);
  const hz = c.createLinearGradient(0, 150, 0, 205); hz.addColorStop(0, rgbStr(sk.c[2], 0)); hz.addColorStop(1, rgbStr(sk.c[2], 0.35));
  c.fillStyle = hz; c.fillRect(0, 150, W, 55);
}

function paddyColors(t) {
  const gold = Math.round(clamp((t - 0.2) / 0.12, 0, 1) * (1 - clamp((t - 0.55) / 0.1, 0, 0.4)) * 24) / 24;
  return [mixRgb([150, 214, 92], [236, 200, 88], gold), mixRgb([98, 172, 70], [204, 160, 58], gold), mixRgb([196, 240, 130], [255, 232, 140], gold)];
}
function drawSawah(c, t) {
  const [base, dark, light] = paddyColors(t);
  const rows = [5, 5, 6, 7, 8, 9, 10, 10];
  let y = 200;
  c.fillStyle = rgbStr(dark); c.fillRect(0, 198.6, W, 1.6);
  for (let j = 0; j < rows.length; j++) {
    const h = rows[j], f = 0.32 + j * 0.085, off = G.cam * f, sp = 4 + j;
    const row = strip(`sawah${base.join(',')}:${j}`, W + sp + 2, h + 0.5, (c) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, rgbStr(j % 2 ? base : mixRgb(base, light, 0.3))); g.addColorStop(1, rgbStr(mixRgb(base, dark, 0.45)));
      c.fillStyle = g; c.fillRect(0, 0, W + sp + 2, h + 0.5);
      c.beginPath();
      for (let x = 0; x < W + sp + 4; x += sp) { c.moveTo(x, h); c.quadraticCurveTo(x - 0.6, h * 0.5, x - 1.2, 0.6); c.moveTo(x, h); c.quadraticCurveTo(x + 0.6, h * 0.5, x + 1.3, 1); }
      c.strokeStyle = rgbStr(dark, 0.8); c.lineWidth = 0.55; c.stroke();
    });
    blit(c, row, -(off % sp) - 1, y);
    if (j === 2 || j === 5) { c.fillStyle = 'rgba(210,240,255,0.4)'; for (let x = -(off % 37); x < W; x += 37) c.fillRect(x, y + h - 1.6, 9, 0.8); }
    if (j === 3) { const period = 900; let cx = 300 - (off % period); if (cx < -30) cx += period; if (cx < W) ds(c, S.cow, cx, y - 9); }
    y += h;
  }
}

function drawVerge(c) {
  const v = strip('verge', W + 9, ROAD_TOP - VERGE_TOP + 1, (c) => {
    const g = c.createLinearGradient(0, 1, 0, ROAD_TOP - VERGE_TOP + 1); g.addColorStop(0, '#6cc457'); g.addColorStop(1, '#4ea845');
    c.fillStyle = g; c.fillRect(0, 0, W + 9, ROAD_TOP - VERGE_TOP + 1);
    c.fillStyle = '#3f8f3c'; c.fillRect(0, 0, W + 9, 1.2);
    c.beginPath();
    for (let x = 0; x < W + 18; x += 9) { c.moveTo(x, 7); c.quadraticCurveTo(x + 0.3, 5, x + 1.4, 4); c.moveTo(x + 4.5, 11.5); c.quadraticCurveTo(x + 4.8, 9.5, x + 5.8, 8.5); }
    c.strokeStyle = '#8fdc6f'; c.lineWidth = 0.7; c.stroke();
  });
  blit(c, v, -(G.cam % 9), VERGE_TOP - 1);
}

function drawRoad(c) {
  const r = strip('road', W + 28, ROAD_BOT - ROAD_TOP, (c) => {
    const RH = ROAD_BOT - ROAD_TOP, Wd = W + 28;
    c.fillStyle = '#c9a06a'; c.fillRect(0, 0, Wd, 2.4);
    const g = c.createLinearGradient(0, 2, 0, RH - 2); g.addColorStop(0, '#8a8798'); g.addColorStop(1, '#6c6a7c');
    c.fillStyle = g; c.fillRect(0, 2, Wd, RH - 4);
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(0, 2, Wd, 1.2);
    c.fillStyle = '#a07a4c'; c.fillRect(0, RH - 2.4, Wd, 2.4);
    c.fillStyle = '#f4ead0';
    for (let x = 0; x < Wd; x += 28) { c.beginPath(); P.rr(x, 275.3 - ROAD_TOP, 12, 1.6, 0.8)(c); c.fill(); }
  });
  blit(c, r, -(G.cam % 28), ROAD_TOP);
  const t0 = Math.floor(G.cam / 40);
  c.strokeStyle = 'rgba(70,66,84,0.6)'; c.lineWidth = 0.6;
  for (let k = t0; k < t0 + 8; k++) {
    const h = hash(k * 17); if (h <= 0.3) continue;
    const x = k * 40 - G.cam + h * 20, y = 286 + h * 3;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + 3, y + 0.8); c.lineTo(x + 5, y - 0.4); c.stroke();
  }
}

function drawCrossing(c, cr) {
  const sx = cr.x - G.cam, len = cr.len;
  if (sx > W + 10 || sx + len < -10) return;
  const g = c.createLinearGradient(0, VERGE_TOP, 0, CANAL_TOP); g.addColorStop(0, '#5aa7e0'); g.addColorStop(1, '#3a84c7');
  c.fillStyle = g; c.fillRect(sx, VERGE_TOP - 1, len, CANAL_TOP - VERGE_TOP + 2);
  c.strokeStyle = 'rgba(220,245,255,0.8)'; c.lineWidth = 0.7;
  for (let y = VERGE_TOP + 4; y < CANAL_TOP; y += 7) { const ox = (G.anim * 8 + y * 3) % 14; c.beginPath(); c.moveTo(sx + 3 + ox, y); c.quadraticCurveTo(sx + 5.5 + ox, y - 1.2, sx + 8 + ox, y); c.stroke(); if (len > 40) { c.beginPath(); c.moveTo(sx + 26 + ox, y + 3); c.quadraticCurveTo(sx + 28 + ox, y + 2, sx + 30 + ox, y + 3); c.stroke(); } }
  c.fillStyle = '#9b7448'; c.fillRect(sx - 2, VERGE_TOP - 1, 2.4, CANAL_TOP - VERGE_TOP + 2); c.fillRect(sx + len - 0.4, VERGE_TOP - 1, 2.4, CANAL_TOP - VERGE_TOP + 2);
  const deck = (x0, x1) => {
    if (x1 <= x0) return;
    for (let x = x0 + 2; x < x1 - 1; x += 10) fillP(c, P.rr(x, GY - 12, 2.4, 12, 0.8), '#a8693e', OL, 0.6);
    fillP(c, P.rr(x0, GY - 12, x1 - x0, 2.2, 1), '#c98a55', OL, 0.6);
    fillP(c, P.rr(x0, GY, x1 - x0, 5.4, 1.2), '#b8774a', OL, 0.8);
    c.strokeStyle = '#8a5432'; c.lineWidth = 0.5; c.beginPath(); for (let x = x0 + 4; x < x1 - 1; x += 4) { c.moveTo(x, GY + 0.8); c.lineTo(x, GY + 4.6); } c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x0 + 1, GY + 0.6, x1 - x0 - 2, 0.8);
  };
  const post = (x) => { fillP(c, P.rr(x, GY + 5, 3, 16, 1), '#8a5634', OL, 0.6); c.strokeStyle = 'rgba(230,248,255,0.8)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(x - 1.4, GY + 16); c.quadraticCurveTo(x + 1.5, GY + 15, x + 4.4, GY + 16); c.stroke(); };
  if (!cr.broken) { post(sx + 4); post(sx + len - 7); post(sx + len / 2 - 1.5); deck(sx - 3, sx + len + 3); }
  else {
    const g0 = cr.gap[0] - G.cam, g1 = cr.gap[1] - G.cam;
    post(sx + 4); post(sx + len - 7); deck(sx - 3, g0); deck(g1, sx + len + 3);
    fillP(c, P.poly([[g0 - 1, GY], [g0 + 3, GY + 2], [g0 + 1, GY + 3.5], [g0 + 4, GY + 5.4], [g0 - 1, GY + 5.4]]), '#b8774a', OL, 0.6);
    fillP(c, P.poly([[g1 + 1, GY], [g1 - 3, GY + 2.5], [g1 - 1, GY + 4], [g1 + 1, GY + 5.4]]), '#b8774a', OL, 0.6);
    fillP(c, P.rr(g0 + 6 + Math.sin(G.anim * 2) * 2, CANAL_TOP - 8 + Math.sin(G.anim * 3), 9, 2, 1), '#b8774a', OL, 0.5);
  }
}

function drawFrontCanal(c) {
  const canal = strip('canal', W + 40, CANAL_BOT - ROAD_BOT, (c) => {
    const Wd = W + 40, top = CANAL_TOP - ROAD_BOT, bot = CANAL_BOT - ROAD_BOT;
    c.fillStyle = '#4ea845'; c.fillRect(0, 0, Wd, top);
    c.fillStyle = '#6cc457'; c.fillRect(0, 0, Wd, 1.6);
    const g = c.createLinearGradient(0, top, 0, bot); g.addColorStop(0, '#5aa7e0'); g.addColorStop(1, '#2f76b8');
    c.fillStyle = g; c.fillRect(0, top, Wd, bot - top);
    c.fillStyle = '#3f8f3c'; c.fillRect(0, top, Wd, 1);
    c.strokeStyle = 'rgba(225,246,255,0.85)'; c.lineWidth = 0.8; c.beginPath();
    for (let x = 0; x < Wd + 40; x += 40) for (const [dx, dy, w] of [[0, 6, 8], [18, 13, 6], [30, 18.5, 5]]) { c.moveTo(x + dx, top + dy); c.quadraticCurveTo(x + dx + w / 2, top + dy - 1.3, x + dx + w, top + dy); }
    c.stroke();
  });
  blit(c, canal, -((G.cam * 1.05 + G.anim * 6) % 40), ROAD_BOT);
  const grass = strip('grass', W + 23, H - CANAL_BOT, (c) => {
    const Wd = W + 23, Hd = H - CANAL_BOT;
    const g = c.createLinearGradient(0, 0, 0, Hd); g.addColorStop(0, '#5cb64d'); g.addColorStop(1, '#3f9440');
    c.fillStyle = g; c.fillRect(0, 0, Wd, Hd);
    c.fillStyle = '#3f8f3c'; c.fillRect(0, 0, Wd, 1.6);
    c.beginPath();
    for (let x = 0; x < Wd + 23; x += 23) { c.moveTo(x, 11); c.quadraticCurveTo(x + 0.3, 8, x - 1, 6.5); c.moveTo(x + 2, 11); c.quadraticCurveTo(x + 2.3, 8, x + 3.6, 6.8); c.moveTo(x + 12, 24); c.quadraticCurveTo(x + 12.4, 21, x + 13.6, 20); }
    c.strokeStyle = '#8ad86b'; c.lineWidth = 0.8; c.stroke();
  });
  blit(c, grass, -((G.cam * 1.15) % 23), CANAL_BOT);
  const flowers = strip('flowers', W + 61, 50, (c) => {
    for (let x = 0; x < W + 122; x += 61) for (const [dx, dy, col] of [[30, 15, '#ffe066'], [7, 35, '#ff8fb0'], [46, 44, '#ffffff']]) {
      c.fillStyle = col; for (let k = 0; k < 4; k++) disc(c, x + dx + Math.cos(k * 1.57) * 1.1, dy + Math.sin(k * 1.57) * 1.1, 0.9);
      c.fillStyle = '#f5a623'; disc(c, x + dx, dy, 0.6);
    }
  });
  blit(c, flowers, -((G.cam * 1.15) % 61), CANAL_BOT);
}

function flame(c, x, y, s, fl) {
  const g = c.createRadialGradient(x, y + 1, 0, x, y + 1, 6 * s); g.addColorStop(0, 'rgba(255,200,80,0.55)'); g.addColorStop(1, 'rgba(255,200,80,0)');
  c.fillStyle = g; c.fillRect(x - 6 * s, y - 5 * s, 12 * s, 12 * s);
  const h = (4.2 + fl * 0.8) * s;
  c.beginPath(); c.moveTo(x, y - h); c.quadraticCurveTo(x + 2.4 * s, y - h * 0.2, x, y + 1.6 * s); c.quadraticCurveTo(x - 2.4 * s, y - h * 0.2, x, y - h);
  c.fillStyle = '#ff8a2a'; c.fill(); c.lineWidth = 0.5; c.strokeStyle = '#c4501a'; c.stroke();
  c.beginPath(); c.moveTo(x, y - h * 0.55); c.quadraticCurveTo(x + 1.1 * s, y, x, y + 1 * s); c.quadraticCurveTo(x - 1.1 * s, y, x, y - h * 0.55); c.fillStyle = '#ffe36a'; c.fill();
}

function drawDecor(c) {
  const L = G.level; if (!L) return;
  const dark = skyAt(G.tod).dark;
  for (const d of L.decor) {
    const sx = d.x - G.cam;
    if (sx > W + 10) break; if (sx < -60) continue;
    if (d.type === 'palm') ds(c, S.palm, sx - 6, ROAD_TOP - 88);
    else if (d.type === 'banana') ds(c, S.banana, sx, ROAD_TOP - 45);
    else if (d.type === 'bush') ds(c, S.bush, sx, ROAD_TOP - 14);
    else if (d.type === 'pagar') {
      for (let x = 0; x < 40; x += 6) fillP(c, (c) => { c.moveTo(sx + x, ROAD_TOP); c.lineTo(sx + x, ROAD_TOP - 11); c.lineTo(sx + x + 1.3, ROAD_TOP - 13); c.lineTo(sx + x + 2.6, ROAD_TOP - 11); c.lineTo(sx + x + 2.6, ROAD_TOP); c.closePath(); }, '#fbf3e0', OL, 0.6);
      fillP(c, P.rr(sx - 1, ROAD_TOP - 8.5, 42, 2, 0.8), '#fbf3e0', OL, 0.6);
    } else if (d.type === 'pelita' && G.tod > 0.5) {
      ds(c, S.pelita, sx, ROAD_TOP - 22);
      flame(c, sx + 4, ROAD_TOP - 22.5, 1, Math.sin(G.anim * 14 + d.x));
      if (dark > 0.02) G.lights.push({ x: sx + 4, y: ROAD_TOP - 24, r: 26, i: 0.95 });
    }
  }
  for (const s of L.signs) {
    const sx = s.x - G.cam; if (sx < -30 || sx > W + 10) continue;
    ds(c, S.awas, sx, ROAD_TOP - 35);
    text(c, 'AWAS!', sx + 11.5, ROAD_TOP - 30.6, { size: 4.6, color: OL, outline: null });
    text(c, 'PATAH', sx + 11.5, ROAD_TOP - 25.6, { size: 4.2, color: '#c0261e', outline: null });
  }
}

function drawHouses(c) {
  const L = G.level; if (!L) return;
  const dark = skyAt(G.tod).dark;
  for (const h of L.houses) {
    const sx = h.x - G.cam;
    if (sx > W + 30) break; if (sx < -100) continue;
    ds(c, S.house[h.v], sx - 2, ROAD_TOP - 70);
    const glowA = h.state === 'done' ? 1 : clamp(dark * 1.4, 0, 0.95);
    if (glowA > 0.03) { c.globalAlpha = glowA; ds(c, S.houseLit[h.v], sx - 2, ROAD_TOP - 70); c.globalAlpha = 1; }
    if (dark > 0.05) { G.lights.push({ x: sx + 15, y: ROAD_TOP - 31, r: 20, i: glowA }); G.lights.push({ x: sx + 60.5, y: ROAD_TOP - 31, r: 20, i: glowA }); }
    if (G.tod > 0.7) {
      c.strokeStyle = 'rgba(40,30,50,0.7)'; c.lineWidth = 0.4; c.beginPath(); c.moveTo(sx, ROAD_TOP - 40); c.quadraticCurveTo(sx + 40, ROAD_TOP - 36, sx + 80, ROAD_TOP - 40); c.stroke();
      for (let k = 0; k < 14; k++) {
        const u = k / 13, lx = sx + u * 80, ly = ROAD_TOP - 40 + Math.sin(u * Math.PI) * 3.2;
        const on = (Math.floor(G.anim * 3) + k) % 3;
        const col = ['#ff5a6a', '#ffd447', '#5ae0ff'][on];
        c.drawImage(dotSprite(col), lx - 2.4, ly - 1.6, 4.8, 4.8);
      }
    }
    if (h.state !== 'deco') {
      const px = sx - 14;
      ds(c, S.sign, px, ROAD_TOP - 35);
      text(c, String(h.idx), px + 11.5, ROAD_TOP - 28.6, { size: 6.2, color: '#fff', outline: null });
    }
  }
}

function drawZones(c) {
  const L = G.level; if (!L || G.state === 'menu') return;
  for (const h of L.houses) {
    if (h.state !== 'pending') continue;
    const x0 = h.zone[0] - G.cam, x1 = h.zone[1] - G.cam;
    if (x0 > W || x1 < 0) continue;
    const pulse = 0.55 + 0.45 * Math.sin(G.anim * 8);
    const y0 = ROAD_TOP + 3.5, hh = ROAD_BOT - ROAD_TOP - 7;
    c.fillStyle = `rgba(255,212,71,${0.18 + pulse * 0.1})`; c.beginPath(); P.rr(x0, y0, x1 - x0, hh, 4)(c); c.fill();
    const m0 = lerp(x0, x1, 0.32), m1 = lerp(x0, x1, 0.68);
    c.fillStyle = `rgba(255,240,150,${0.25 + pulse * 0.15})`; c.beginPath(); P.rr(m0, y0, m1 - m0, hh, 3)(c); c.fill();
    c.setLineDash([3.5, 2.5]); c.lineDashOffset = -G.anim * 12;
    c.strokeStyle = `rgba(255,200,40,${0.75 + pulse * 0.25})`; c.lineWidth = 1.1; c.beginPath(); P.rr(x0, y0, x1 - x0, hh, 4)(c); c.stroke();
    c.setLineDash([]);
  }
}

function drawObstacles(c) {
  const L = G.level; if (!L || G.state === 'menu') return;
  for (const o of L.obs) {
    const sx = o.x - G.cam;
    if (sx > W + 20) break; if (sx < -30) continue;
    if (o.type === 'lubang') {
      const w = o.w, cx = sx + w / 2;
      fillP(c, P.ell(cx, GY - 0.3, w / 2 + 0.6, 3.4), '#4d4a5c', OL, 0.8);
      fillP(c, P.ell(cx, GY + 0.2, w / 2 - 1.6, 2.2), '#1c1826', null);
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 0.6; c.beginPath(); c.ellipse(cx, GY - 0.3, w / 2 - 0.4, 2.8, 0, 0.15, Math.PI - 0.15); c.stroke();
      c.strokeStyle = '#4d4a5c'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(sx - 2, GY - 3); c.lineTo(sx + 1, GY - 1.6); c.moveTo(sx + w + 2, GY + 1.8); c.lineTo(sx + w - 1, GY + 1); c.stroke();
    } else if (o.type === 'batu') ds(c, S.rock, sx - 1.5, GY - 12.5);
    else if (o.type === 'tahi') {
      ds(c, S.dung, sx - 1, GY - 8.6);
      c.strokeStyle = 'rgba(120,170,60,0.75)'; c.lineWidth = 0.7;
      for (let k = 0; k < 2; k++) { const ph = (G.anim * 0.8 + k * 0.5) % 1, yy = GY - 10 - ph * 8; c.globalAlpha = 1 - ph; c.beginPath(); c.moveTo(sx + 5 + k * 5, yy); c.quadraticCurveTo(sx + 7 + k * 5, yy - 1.5, sx + 5 + k * 5, yy - 3); c.quadraticCurveTo(sx + 3 + k * 5, yy - 4.5, sx + 5 + k * 5, yy - 6); c.stroke(); }
      c.globalAlpha = 1; c.fillStyle = OL;
      for (let k = 0; k < 2; k++) { const a = G.anim * (7 + k * 3) + k * 2; disc(c, sx + 7 + Math.cos(a) * 6, GY - 13 + Math.sin(a * 1.3) * 3, 0.6); }
    } else if (o.type === 'kelapa') {
      if (o.state === 'wait' || o.state === 'fall') {
        const bob = Math.sin(G.anim * 10) * 0.8;
        ds(c, S.warn, sx - 2.5, GY - 17 + bob);
        const k = o.state === 'fall' ? clamp((o.fy + 14) / (GY + 4), 0, 1) : 0;
        c.fillStyle = `rgba(20,10,30,${0.15 + k * 0.3})`; c.beginPath(); c.ellipse(sx + 6, GY, 1 + k * 5, 1 + k * 0.8, 0, 0, 7); c.fill();
        if (o.state === 'fall') ds(c, S.coconut, sx, o.fy - 6);
      } else ds(c, S.coconut, sx, GY - 11.5);
    }
  }
}

function drawItems(c) {
  const L = G.level; if (!L || G.state === 'menu') return;
  for (const it of L.items) {
    if (it.taken) continue;
    const sx = it.x - G.cam; if (sx > W + 20) break; if (sx < -20) continue;
    const by = it.y + Math.sin(G.anim * 4 + it.x * 0.1) * 1.5;
    const spr = it.type === 'jar' ? S.jar : it.type === 'ketupat' ? S.ketupat : S.kuih[it.k];
    if (it.type !== 'kuih') { const g = c.createRadialGradient(sx, by, 1, sx, by, 12); g.addColorStop(0, 'rgba(255,240,170,0.55)'); g.addColorStop(1, 'rgba(255,240,170,0)'); c.fillStyle = g; c.fillRect(sx - 12, by - 12, 24, 24); }
    ds(c, spr, sx - spr.lw / 2, by - spr.lh / 2);
    const tw = Math.sin(G.anim * 5 + it.x);
    if (tw > 0.6) sparkle(c, sx + spr.lw * 0.35, by - spr.lh * 0.4, 1.8 * (tw - 0.5) * 2);
  }
}

function drawGooseEnt(c) {
  const gs = G.goose; if (!gs || gs.warn > 0) return;
  const f = Math.floor(G.anim * 10) % 2;
  c.fillStyle = 'rgba(20,10,30,0.22)'; c.beginPath(); c.ellipse(gs.x + 14, GY, 9, 1.6, 0, 0, 7); c.fill();
  const y = gs.hitT > 0 ? GY - 27 - gs.hitT * 40 : GY - 27;
  ds(c, S.goose[f], gs.x, y);
}

function drawPlayer(c, scale = 1, cx = null) {
  const p = G.player;
  if (p.splashT > 0) return;
  if (p.inv > 0 && G.state === 'play' && p.inv < 1.15 && Math.floor(p.inv * 14) % 2 === 0) return;
  const hurtFace = p.inv > 1.15 && G.state === 'play';
  const spr = hurtFace ? S.vespaHurt : S.vespa[Math.floor(p.wheelT) % 3];
  const vib = p.grounded && G.state !== 'done' ? Math.sin(G.anim * 40) * 0.35 : 0;
  const x = cx == null ? PX : cx;
  const hgt = clamp((GY - p.y) / 70, 0, 1);
  if (!p.falling) { c.fillStyle = `rgba(20,10,30,${0.26 - hgt * 0.14})`; c.beginPath(); c.ellipse(x + 22 * scale, GY, (17 - hgt * 6) * scale, 1.8 * scale, 0, 0, 7); c.fill(); }
  c.save();
  const ang = p.grounded ? 0 : clamp(p.vy * 0.00045, -0.16, 0.16);
  c.translate(x + 10 * scale, p.y + vib); c.rotate(ang);
  c.drawImage(spr, -10 * scale, -51 * scale, spr.lw * scale, spr.lh * scale);
  c.restore();
  if (skyAt(G.tod).dark > 0.05) G.lights.push({ x: x + 42 * scale, y: p.y - 28 * scale, r: 30, i: 1, cone: true });
}

function drawPackages(c) {
  for (const pk of G.packages) {
    const k = clamp(pk.t / pk.dur, 0, 1);
    const x = lerp(pk.sx, pk.tx - G.cam, k), y = lerp(pk.sy, pk.ty, k) - Math.sin(k * Math.PI) * 42;
    c.save(); c.translate(x, y); c.rotate(k * 7); ds(c, S.gift, -5, -5); c.restore();
  }
}

function drawParticles(c, list) {
  for (const p of list) {
    c.globalAlpha = p.fade === false ? 1 : clamp(p.life / p.max, 0, 1);
    c.fillStyle = p.color;
    const s = (p.size || 1) * 0.75;
    if (p.sway != null) { c.save(); c.translate(p.x, p.y); c.rotate(G.anim * 4 + p.sway); c.fillRect(-s, -s * 0.5, s * 2, s); c.restore(); }
    else disc(c, p.x, p.y, s);
  }
  c.globalAlpha = 1;
}

function text(c, str, x, y, o = {}) {
  const title = !o.font || o.font === FONT_PIX;
  const size = (o.size || 8) * (title ? 1.5 : 1);
  c.font = `${o.weight || ''} ${size}px ${o.font || FONT_PIX}`; c.textAlign = o.align || 'center'; c.textBaseline = 'middle';
  if (o.outline !== null) { c.lineWidth = o.ow || Math.max(1.6, size * 0.24); c.strokeStyle = o.outline || OL; c.lineJoin = 'round'; c.strokeText(str, x, y); }
  c.fillStyle = o.color || '#fff'; c.fillText(str, x, y);
}

function drawMarkers(c) {
  const L = G.level; if (!L || G.state === 'menu') return;
  for (const h of L.houses) {
    const sx = h.x - G.cam;
    if (sx > W + 30 || sx < -100) continue;
    const cx = sx + 38;
    if (h.state === 'pending') {
      const by = 166 + Math.sin(G.anim * 5) * 2;
      c.font = `600 8px ${FONT_BODY}`; const tw = Math.ceil(c.measureText(h.name).width) + 12;
      const lx = clamp(cx, tw / 2 + 3, W - tw / 2 - 3);
      fillP(c, P.rr(lx - tw / 2, by - 15, tw, 11, 5.5), '#fff6dc', OL, 1);
      text(c, h.name, lx, by - 9.2, { size: 8, font: FONT_BODY, weight: 600, color: OL, outline: null });
      ds(c, S.gift, cx - 5, by + 0.5);
      fillP(c, P.poly([[cx - 4.5, by + 12], [cx + 4.5, by + 12], [cx, by + 17]]), '#ffd447', OL, 0.9);
    } else if (h.state === 'done' && h.thanks > 0) {
      const a = clamp(h.thanks, 0, 1), by = 172 - (1.6 - h.thanks) * 6;
      c.globalAlpha = a;
      fillP(c, (c) => { P.rr(cx - 34, by - 9, 68, 18, 8)(c); }, '#ffffff', OL, 1);
      fillP(c, P.poly([[cx - 4, by + 8.4], [cx + 3, by + 8.4], [cx - 2, by + 13]]), '#ffffff', null);
      lineP(c, [[cx - 4, by + 9], [cx - 2, by + 13], [cx + 3, by + 9]], OL, 1);
      text(c, 'Terima kasih!', cx, by - 3, { size: 8.5, font: FONT_BODY, color: OL, outline: null });
      text(c, h.name, cx, by + 4.5, { size: 6.5, font: FONT_BODY, color: '#b04a2a', outline: null });
      c.globalAlpha = 1;
    } else if (h.state === 'missed' && h.thanks > 0) {
      c.globalAlpha = clamp(h.thanks, 0, 1); text(c, '?', cx, 172, { size: 12, color: '#ff6b6b' }); c.globalAlpha = 1;
    }
  }
}

function drawLighting(t) {
  const sk = skyAt(t), w = wctx;
  w.globalCompositeOperation = 'source-atop';
  let dark = sk.dark;
  const fwFlash = G.fireworks.reduce((m, f) => Math.max(m, f.flash || 0), 0);
  dark *= 1 - fwFlash * 0.35;
  if (dark <= 0.01 && sk.tint[3] > 0.005) { w.fillStyle = rgbStr(sk.tint, sk.tint[3]); w.fillRect(0, 0, W, H); }
  if (dark > 0.01) {
    const d = dctx;
    d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W, H);
    if (sk.tint[3] > 0.005) { d.fillStyle = rgbStr(sk.tint, sk.tint[3]); d.fillRect(0, 0, W, H); }
    d.fillStyle = `rgba(6,10,40,${dark})`; d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'destination-out';
    for (const l of G.lights) {
      if (l.cone) { d.globalAlpha = 1; d.drawImage(LIGHT.coneHole, l.x - 4, l.y - 50, 160, 100); d.globalAlpha = 0.75; d.drawImage(LIGHT.hole, l.x - 58, l.y - 28, 72, 72); }
      else { d.globalAlpha = l.i; d.drawImage(LIGHT.hole, l.x - l.r, l.y - l.r, l.r * 2, l.r * 2); }
    }
    d.globalAlpha = 1;
    w.drawImage(darkCv, 0, 0, W, H);
  }
  w.globalCompositeOperation = 'source-over';
  return dark;
}

function drawGlows(c, dark) {
  if (dark < 0.05) return;
  c.globalCompositeOperation = 'lighter';
  for (const l of G.lights) {
    if (l.cone) { c.globalAlpha = 0.32 * dark; c.drawImage(LIGHT.coneGlow, l.x - 4, l.y - 50, 160, 100); }
    else { c.globalAlpha = 0.28 * dark * l.i; c.drawImage(LIGHT.glow, l.x - l.r * 0.6, l.y - l.r * 0.6, l.r * 1.2, l.r * 1.2); }
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}

function drawFireworks(c) {
  if (!G.fireworks.length) return;
  c.globalCompositeOperation = 'lighter';
  for (const f of G.fireworks) {
    if (f.stage === 'rise') { c.fillStyle = '#ffe9a0'; disc(c, f.x, f.y, 0.9); c.globalAlpha = 0.4; c.fillRect(f.x - 0.4, f.y, 0.8, 5); c.globalAlpha = 1; }
    if (f.flash > 0) { const g = c.createRadialGradient(f.x, f.ty, 0, f.x, f.ty, 40); g.addColorStop(0, `rgba(255,240,200,${0.35 * f.flash})`); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.fillRect(f.x - 40, f.ty - 40, 80, 80); }
    for (const p of f.parts) {
      const a = clamp(p.life / p.max, 0, 1); c.fillStyle = p.color;
      const z = (p.size || 1) * 1.2;
      c.globalAlpha = a * 0.35; c.fillRect(p.x - p.vx * 0.05 - 0.5, p.y - p.vy * 0.05 - 0.5, 1, 1);
      c.globalAlpha = a; c.fillRect(p.x - z / 2, p.y - z / 2, z, z);
    }
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}

function drawUIfx(c) {
  for (const p of G.popups) { c.globalAlpha = clamp(p.life / 0.35, 0, 1); text(c, p.text, p.x, p.y, { size: p.size || 7, color: p.color || '#fff' }); c.globalAlpha = 1; }
  const gs = G.goose;
  if (gs && gs.warn > 0 && Math.floor(gs.warn * 8) % 2 === 0) {
    fillP(c, P.circ(10, GY - 30, 7), '#ff4d5e', OL, 1.2);
    text(c, '!', 10, GY - 29.5, { size: 7, color: '#fff', outline: null });
    text(c, 'HONK!', 36, GY - 42, { size: 5.5, color: '#ffd447' });
  }
  if (G.banner) {
    const b = G.banner, t = b.t;
    const inX = t < 0.35 ? lerp(W, 0, easeOut(t / 0.35)) : t > b.dur - 0.35 ? lerp(0, -W, easeIn((t - (b.dur - 0.35)) / 0.35)) : 0;
    const y = 120;
    fillP(c, P.rr(inX + 12, y - 18, W - 24, 36, 12), 'rgba(30,40,110,0.88)', OL, 1.4);
    fillP(c, P.rr(inX + 15, y - 15, W - 30, 30, 10), null, '#ffd447', 1);
    text(c, b.title, inX + W / 2, y - 4, { size: 11, color: '#ffd447' });
    text(c, b.sub, inX + W / 2, y + 8.5, { size: 8, font: FONT_BODY, color: '#fff6dc', outline: null });
  }
  if (G.state === 'play' && G.countdown > 0) {
    const n = Math.ceil(G.countdown / 0.6);
    if (n >= 1 && n <= 3) { const k = 1 - ((G.countdown / 0.6) % 1); c.save(); c.translate(W / 2, 150); c.scale(1 + k * 0.4, 1 + k * 0.4); text(c, String(n), 0, 0, { size: 24, color: '#ffd447', ow: 5 }); c.restore(); }
  }
  if (G.state === 'play' && G.goTimer > 0) text(c, 'JOM!', W / 2, 150, { size: 22, color: '#7ee07a', ow: 5 });
  if (G.state === 'play' && G.combo >= 3) text(c, `COMBO x${comboMult()}`, W - 8, 62, { size: 6.5, color: '#ffd447', align: 'right' });
  // nyawa tinggal satu: degupan merah di tepi skrin
  if (G.state === 'play' && G.lives === 1) {
    const beat = Math.pow(Math.max(0, Math.sin(G.anim * 7)), 6);
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.62);
    g.addColorStop(0, 'rgba(255,40,60,0)'); g.addColorStop(1, `rgba(255,40,60,${0.18 + beat * 0.25})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  if (G.flash > 0) { c.fillStyle = `rgba(255,60,60,${G.flash * 0.9})`; c.fillRect(0, 0, W, H); }
}
const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeIn = (t) => Math.pow(clamp(t, 0, 1), 3);

function render() {
  ctx.setTransform(SC, 0, 0, SC, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (G.state === 'crash') { drawCrashScene(ctx); return; }
  if (G.state === 'aset') { drawAssetSheet(ctx); return; }
  const t = G.todForced != null ? G.todForced : G.tod;
  G.tod = t;
  G.lights.length = 0;
  drawSky(ctx, t);
  drawFireworks(ctx);
  const sk0 = skyAt(t), useWorld = sk0.tint[3] > 0.005 || sk0.dark > 0.01;
  const wc = useWorld ? wctx : ctx;
  if (useWorld) {
    wctx.setTransform(1, 0, 0, 1, 0, 0); wctx.clearRect(0, 0, worldCv.width, worldCv.height);
    wctx.setTransform(SC, 0, 0, SC, 0, 0); wctx.imageSmoothingEnabled = true; wctx.imageSmoothingQuality = 'high';
    wctx.lineJoin = 'round'; wctx.lineCap = 'round';
  } else ctx.save();
  const shx = G.shake > 0 ? (Math.random() - 0.5) * 4 * (G.shake / 0.35) : 0;
  const shy = G.shake > 0 ? (Math.random() - 0.5) * 3 * (G.shake / 0.35) : 0;
  wc.translate(shx, shy);
  drawClouds(wc);
  drawFarLayers(wc, t);
  drawSawah(wc, t);
  drawVerge(wc);
  drawDecor(wc);
  drawHouses(wc);
  drawRoad(wc);
  if (G.level) for (const cr of G.level.crossings) { if (cr.x - G.cam > W + 10) break; drawCrossing(wc, cr); }
  drawZones(wc);
  drawObstacles(wc);
  drawItems(wc);
  drawGooseEnt(wc);
  if (G.state === 'menu') drawPlayer(wc, G.menuScale, 62);
  else drawPlayer(wc);
  drawPackages(wc);
  drawFrontCanal(wc);
  drawParticles(wc, G.particles);
  let dark = 0;
  if (useWorld) { dark = drawLighting(t); ctx.drawImage(worldCv, 0, 0, W, H); } else ctx.restore();
  drawGlows(ctx, dark);
  drawMarkers(ctx);
  drawParticles(ctx, G.confetti);
  drawUIfx(ctx);
}

// ---------------- Skrin jatuh ----------------
function drawCrashScene(c) {
  const g = c.createRadialGradient(W / 2, 150, 20, W / 2, 170, 260);
  g.addColorStop(0, '#3a5fd0'); g.addColorStop(1, '#16215e');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // jalur sinar berpusing
  c.save(); c.translate(W / 2, 92); c.rotate(G.anim * 0.15);
  c.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(300, -26); c.lineTo(300, 26); c.closePath(); c.fill(); }
  c.restore();
  for (let i = 0; i < 18; i++) {
    const a = 0.3 + 0.7 * Math.abs(Math.sin(G.anim * 2 + i));
    c.globalAlpha = a; sparkle(c, (hash(i * 5) * 0.5 + 0.5) * W, (hash(i * 9) * 0.5 + 0.5) * 110 + 8, 2.2, '#fff0b0');
  }
  c.globalAlpha = 1;
  const bob = Math.sin(G.anim * 3) * 2;
  c.fillStyle = 'rgba(255,255,255,0.15)'; for (const [x, y, r] of [[60, 128, 11], [78, 133, 9], [100, 128, 8], [44, 132, 7]]) disc(c, x, y, r);
  c.save(); c.translate(80, 84 + bob); c.rotate(-0.55); c.drawImage(S.vespaBare, -46, -52, 92, 104); c.restore();
  c.strokeStyle = '#fff6dc'; c.lineWidth = 1.6;
  for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(20 + i * 6, 40 + i * 9); c.lineTo(30 + i * 4, 40 + i * 9); c.stroke(); }
  c.save(); c.translate(150, 64 - bob); c.rotate(0.45 + Math.sin(G.anim * 2) * 0.08); c.drawImage(S.riderFly, -34, -40, 68, 80); c.restore();
  // bintang & burung berpusing atas kepala
  for (let i = 0; i < 4; i++) {
    const a = G.anim * 3.5 + i * Math.PI / 2, x = 146 + Math.cos(a) * 18, y = 30 + Math.sin(a) * 5;
    if (i % 2) sparkle(c, x, y, 3.4, '#ffd447');
    else { fillP(c, P.ell(x, y, 3, 2.2), '#8fd3ff', OL, 0.8); fillP(c, P.poly([[x + 2.6, y - 0.6], [x + 5, y], [x + 2.6, y + 0.6]]), '#ffb03b', null); disc(c, x + 1, y - 0.6, 0.2); }
  }
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(108, 303, 92, 5, 0, 0, 7); c.fill();
  ds(c, S.jar, 22, 260, 2);
  c.save(); c.translate(110, 290); c.rotate(1.45); c.drawImage(S.jar, -15, -18, 30, 36); c.restore();
  ds(c, S.jar, 158, 256, 2.2);
  const ks = [[70, 296, 0], [86, 300, 1], [132, 298, 2], [146, 302, 0], [60, 304, 1], [124, 306, 3], [98, 306, 2], [178, 304, 1], [42, 302, 3]];
  for (const [x, y, k] of ks) ds(c, S.kuih[k], x, y, 1.6);
}

// ---------------- Helaian aset ----------------
function drawAssetSheet(c) {
  c.fillStyle = '#16235e'; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(140,175,255,0.12)'; c.lineWidth = 0.5;
  for (let x = 0; x < W; x += 12) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  for (let y = 0; y < H; y += 12) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  text(c, 'ASET & ELEMEN', W / 2, 14, { size: 8, color: '#ffd447' });
  const cell = (x, y, label) => text(c, label, x, y, { size: 7.5, font: FONT_BODY, color: '#fff6dc', outline: null });
  ds(c, S.vespa[0], 20, 24, 1.3); cell(50, 94, 'Watak & Vespa');
  ds(c, S.goose[1], 126, 36, 1.7); cell(155, 94, 'Angsa Pengejar');
  ds(c, S.house[0], 6, 104); cell(48, 182, 'Rumah Kampung');
  ds(c, S.houseLit[1], 118, 112, 0.88); cell(155, 182, 'Rumah (malam)');
  ds(c, S.jar, 12, 196, 1.45); ds(c, S.kuih[0], 38, 204, 1.5); ds(c, S.kuih[1], 56, 204, 1.5); ds(c, S.kuih[2], 74, 204, 1.5);
  cell(52, 232, 'Balang & Kuih Raya');
  ds(c, S.ketupat, 116, 192, 1.45); ds(c, S.kuih[3], 142, 204, 1.5); ds(c, S.gift, 166, 204, 1.6);
  cell(155, 232, 'Ketupat & Hadiah');
  ds(c, S.rock, 10, 248, 1.5); ds(c, S.dung, 40, 254, 1.5); ds(c, S.coconut, 68, 250, 1.5); ds(c, S.warn, 90, 247, 1.4);
  cell(56, 280, 'Halangan');
  ds(c, S.pelita, 124, 246, 1.3); flame(c, 129, 245, 1.3, 0.5);
  ds(c, S.palm, 140, 236, 0.5); ds(c, S.banana, 168, 248, 0.65);
  cell(160, 290, 'Pelita & Pokok');
  const sw = ['#7cc4f5', '#ffd447', '#f08a24', '#d55a78', '#3cc0b4', '#ee4250', '#16235e', '#2a1d3a'];
  sw.forEach((col, i) => fillP(c, P.circ(22 + i * 25, 320, 8), col, '#fff', 1));
  cell(W / 2, 338, 'Palet warna');
  text(c, 'Siang > Petang > Senja > Malam', W / 2, 360, { size: 7.5, font: FONT_BODY, color: '#b9c6ef', outline: null });
}

// ============================================================
// Logik
// ============================================================
function comboMult() { return 1 + Math.min(3, Math.floor(Math.max(0, G.combo - 1) / 2)); }
function popup(textS, x, y, color, size = 7, life = 1.0) { G.popups.push({ text: textS, x: clamp(x, 30, W - 30), y, color, size, life, vy: -20 }); }
function burst(x, y, n, colors, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = o.ang != null ? o.ang + rr(-o.spread, o.spread) : rr(0, Math.PI * 2), s = rr(o.min || 20, o.max || 70);
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: o.g == null ? 160 : o.g, life: rr(0.3, o.life || 0.7), max: o.life || 0.7, color: pick(colors), size: o.size || 1, world: o.world !== false });
  }
}

function updateParticles(dt, list, scroll) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= dt; if (p.life <= 0) { list.splice(i, 1); continue; }
    p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.world && scroll) p.x -= scroll * dt;
    if (p.sway) p.x += Math.sin(G.anim * 6 + p.sway) * 0.4;
  }
}

function spawnFirework() {
  const x = rr(20, W - 20), ty = rr(30, 110);
  G.fireworks.push({ x, y: 205, ty, vy: -rr(150, 190), stage: 'rise', parts: [], flash: 0, col: pick(['#ffd447', '#ff5a8a', '#5ae0ff', '#8cff6a', '#ff9a3c', '#c89bff']) });
}
function updateFireworks(dt) {
  const night = G.tod > 0.76 && (G.state === 'play' || G.state === 'done' || G.state === 'result');
  if (night) { G.fwTimer = (G.fwTimer || 0) - dt; if (G.fwTimer <= 0) { spawnFirework(); G.fwTimer = rr(0.5, 1.4); } }
  for (let i = G.fireworks.length - 1; i >= 0; i--) {
    const f = G.fireworks[i];
    f.flash = Math.max(0, f.flash - dt * 2.5);
    if (f.stage === 'rise') {
      f.y += f.vy * dt;
      if (f.y <= f.ty) {
        f.stage = 'burst'; f.flash = 1; Sfx.boom();
        const n = 40;
        for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2, s = rr(30, 62); f.parts.push({ x: f.x, y: f.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rr(0.9, 1.4), max: 1.4, color: rand() < 0.2 ? '#ffffff' : f.col, size: rand() < 0.5 ? 2 : 1 }); }
      }
    }
    for (let k = f.parts.length - 1; k >= 0; k--) { const p = f.parts[k]; p.life -= dt; if (p.life <= 0) { f.parts.splice(k, 1); continue; } p.vx *= 0.97; p.vy = p.vy * 0.97 + 40 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    if (f.stage === 'burst' && !f.parts.length) G.fireworks.splice(i, 1);
  }
}

function supported() {
  const L = G.level; if (!L) return true;
  if (G.player.ghost > 0) return true;
  const r = G.cam + PX + 9, f = G.cam + PX + 33;
  for (const c of L.crossings) {
    if (!c.broken) continue;
    if (c.x > f + 10) break;
    if (r > c.gap[0] && r < c.gap[1] && f > c.gap[0] && f < c.gap[1]) return false;
    if (r > c.gap[0] + 2 && r < c.gap[1] && f > c.gap[1] && false) return false;
  }
  return true;
}

function doJump() {
  const p = G.player;
  p.vy = -JUMP_V; p.grounded = false; p.coyote = 0; p.buffer = 0;
  Sfx.jump(); G.jumps++;
  burst(PX + 10, GY - 1, 5, ['#d8c8a8', '#b8a888'], { ang: Math.PI, spread: 0.6, min: 20, max: 50, g: 60, life: 0.4 });
  if (G.jumps === 3) document.getElementById('jump-hint').classList.add('fade');
}

function updatePlayer(dt) {
  const p = G.player;
  p.wheelT += dt * G.speed / 10;
  if (p.inv > 0) p.inv -= dt;
  if (p.ghost > 0) p.ghost -= dt;
  if (p.buffer > 0) p.buffer -= dt;
  if (p.coyote > 0) p.coyote -= dt;
  if (p.splashT > 0) { p.splashT -= dt; if (p.splashT <= 0) respawn(); return; }
  if (p.buffer > 0 && (p.grounded || p.coyote > 0) && !p.falling) doJump();
  if (!p.grounded) {
    const g = (p.holding && p.vy < 0) ? GRAV * HOLD_G : GRAV;
    p.vy += g * dt; p.y += p.vy * dt;
    const sup = supported();
    if (p.vy >= 0 && p.y >= GY && !p.falling) {
      if (sup) {
        p.y = GY; p.vy = 0; p.grounded = true;
        burst(PX + 20, GY - 1, 6, ['#d8c8a8', '#b8a888'], { ang: -Math.PI / 2, spread: 1.4, min: 15, max: 40, g: 80, life: 0.35 });
      } else if (p.y > GY + 3) p.falling = true;
    }
    if (p.falling && p.y > GY + 30) splash();
  } else if (!supported()) { p.grounded = false; p.coyote = 0.08; p.vy = 0; }
  // asap ekzos
  if (p.grounded && Math.random() < dt * 8) G.particles.push({ x: PX + 1, y: GY - 6, vx: -20, vy: -8, g: -10, life: 0.5, max: 0.5, color: 'rgba(220,220,230,0.7)', size: 2, world: true });
}

function splash() {
  const p = G.player;
  burst(PX + 20, CANAL_TOP - 2, 16, [PAL.waterH, '#ffffff', PAL.water], { ang: -Math.PI / 2, spread: 0.9, min: 50, max: 110, g: 300, life: 0.7, size: 2 });
  Sfx.splash(); p.splashT = 0.6; p.falling = false;
  hurt('parit', null, true);
}
function respawn() {
  const p = G.player; if (G.state !== 'play') return;
  p.y = GY - 130; p.vy = 0; p.grounded = false; p.ghost = 1.2; p.inv = Math.max(p.inv, 1.6); p.falling = false;
}

function hurt(kind, o, force) {
  const p = G.player;
  if (!force && p.inv > 0) return;
  if (o) o.hit = true;
  G.lives--; G.combo = 0; p.inv = 1.7; G.shake = 0.35; G.flash = 0.22;
  Sfx.hit(); vibrate(90);
  popup(HURT_TEXT[kind] || 'ADUH!', PX + 50, GY - 56, '#ff7b7b', 6.5, 1.2);
  burst(PX + 6, GY - 26, 8, ['#f2cf86', '#f4c271', '#fbf3e4', '#e94f64'], { ang: -Math.PI * 0.7, spread: 0.6, min: 40, max: 90, g: 300, life: 0.8, size: 2 });
  updateHud(true);
  if (G.lives === 1) Sfx.setTense(true);
  if (G.lives <= 0) startCrash();
}

function collect(it) {
  it.taken = true;
  const x = it.x - G.cam;
  if (it.type === 'kuih') { G.score += 10; G.kuih++; Sfx.coin(); popup('+10', x, it.y - 10, '#fff6dc', 5, 0.6); }
  else if (it.type === 'jar') { G.score += 50; G.kuih += 5; Sfx.jar(); popup('+50 BALANG!', x, it.y - 12, '#ffd447', 6); }
  else if (it.type === 'ketupat') {
    if (G.lives < 3) { G.lives++; Sfx.life(); if (G.lives > 1) Sfx.setTense(false); popup('+1 NYAWA!', x, it.y - 12, '#7dff8a', 6.5); updateHud(true, true); }
    else { G.score += 100; Sfx.jar(); popup('+100 KETUPAT!', x, it.y - 12, '#7dff8a', 6); }
  }
  burst(x, it.y, 6, ['#ffd447', '#ffffff'], { min: 20, max: 50, g: 0, life: 0.35 });
  updateHud();
}

function deliver() {
  if (G.state !== 'play' || G.countdown > 0 || G.paused) return;
  if (G.deliverCd > 0) { Sfx.nope(); return; }
  const L = G.level, c = G.cam + PX + 20;
  const h = L.houses.find((hh) => hh.state === 'pending' && c >= hh.zone[0] && c <= hh.zone[1]);
  if (!h) {
    G.deliverCd = 0.45; Sfx.nope();
    const next = L.houses.find((hh) => hh.state === 'pending');
    popup(next && next.zone[0] - c < 60 ? 'AWAL SIKIT!' : 'BELUM SAMPAI!', PX + 40, GY - 52, '#c9d3f5', 5.5, 0.7);
    return;
  }
  const mid = (h.zone[0] + h.zone[1]) / 2, half = (h.zone[1] - h.zone[0]) / 2;
  const acc = 1 - Math.abs(c - mid) / half;
  h.state = 'done'; h.thanks = 1.8;
  G.delivered++; G.processed++; G.combo++; G.bestCombo = Math.max(G.bestCombo, G.combo);
  const mult = comboMult(), perfect = acc > 0.62;
  let pts = 100 * mult; if (perfect) { pts += 50; G.perfects++; }
  G.score += pts;
  G.packages.push({ sx: PX + 8, sy: G.player.y - 26, tx: h.x + 40, ty: ROAD_TOP - 26, t: 0, dur: 0.45, house: h });
  Sfx.throwIt();
  setTimeout(() => Sfx.deliver(perfect), 260);
  popup('+' + pts, PX + 30, GY - 60, '#ffd447', 8, 1.1);
  popup(perfect ? 'SEMPURNA!' : 'BAGUS!', PX + 30, GY - 74, perfect ? '#7dff8a' : '#ffffff', 6.5, 1.1);
  if (mult > 1) popup('COMBO x' + mult, PX + 30, GY - 86, '#ff9a3c', 6, 1.1);
  updateHud(true);
}

function startCrash() {
  G.state = 'crashing'; G.player.crashT = 0; Sfx.stopMusic(); Sfx.setTense(false); Sfx.crash(); vibrate([60, 40, 120]);
  setHud(false);
}

function finish() {
  G.state = 'done'; G.doneT = 0; Sfx.stopMusic(); Sfx.setTense(false); Sfx.win();
  const lifeBonus = G.lives * 150, allBonus = G.delivered === TOTAL ? 500 : 0;
  G.finalBonus = lifeBonus + allBonus; G.score += G.finalBonus;
  setHud(false);
  const good = G.delivered >= 20;
  document.getElementById('done-title').textContent = good ? 'BERJAYA!' : 'SELESAI!';
  document.getElementById('done-sub').textContent = `${G.delivered}/${TOTAL} hantaran`;
  showScreens('scr-done');
  for (let i = 0; i < 70; i++) G.confetti.push({ x: rr(0, W), y: rr(-120, -5), vx: rr(-15, 15), vy: rr(30, 70), g: 10, life: rr(2.5, 4), max: 4, color: pick(['#ffd447', '#ff5a8a', '#5ae0ff', '#8cff6a', '#fff']), size: 2, sway: rr(0, 6), fade: false });
}

function updatePlay(dt) {
  const L = G.level, p = G.player;
  if (G.countdown > 0) {
    const before = Math.ceil(G.countdown / 0.6);
    G.countdown -= dt;
    const after = Math.ceil(G.countdown / 0.6);
    if (after !== before && after >= 1 && after <= 3) Sfx.tick();
    if (G.countdown <= 0) { G.goTimer = 0.6; Sfx.go(); }
    return;
  }
  if (G.goTimer > 0) G.goTimer -= dt;
  G.time += dt;
  if (G.deliverCd > 0) G.deliverCd -= dt;
  G.speed = lerp(SPEED_MIN, SPEED_MAX, clamp(G.cam / L.lastHouseX, 0, 1));
  G.cam += G.speed * dt;
  G.tod = todAt(G.cam);
  const ph = phaseOfTod(G.tod);
  if (ph !== G.phaseIdx) { G.phaseIdx = ph; G.banner = { title: PHASES[ph].name, sub: PHASES[ph].sub, t: 0, dur: 2.4 }; Sfx.phase(); Sfx.setLevel(ph + 1); }
  updatePlayer(dt);
  // halangan
  const camL = G.cam - 40, camR = G.cam + W + 40;
  for (const o of L.obs) {
    if (o.x > camR) break; if (o.x + o.w < camL) continue;
    const sx = o.x - G.cam;
    if (o.type === 'kelapa') {
      if (o.state === 'wait' && sx < Math.min(W - 6, 128 + G.speed * 0.66)) { o.state = 'fall'; o.fy = -14; o.vy = 0; Sfx.whistle(); }
      else if (o.state === 'fall') {
        o.vy += 1400 * dt; o.fy += o.vy * dt;
        if (o.fy >= GY - 6) { o.fy = GY - 6; o.state = 'ground'; G.shake = Math.max(G.shake, 0.12); Sfx.thud(); burst(sx + 5, GY - 2, 6, ['#d8c8a8', '#8a6a45'], { ang: -Math.PI / 2, spread: 1.3, min: 20, max: 50, g: 200, life: 0.4 }); }
      }
    }
    if (o.hit || p.inv > 0 || p.splashT > 0) continue;
    let hit = false;
    if (o.type === 'lubang') hit = p.grounded && overlap(PX + 13, PX + 29, sx + 5, sx + o.w - 5);
    else if (o.type === 'kelapa' && o.state === 'fall') hit = overlap(PX + 10, PX + 32, sx + 1, sx + 10) && o.fy + 5 > p.y - 30 && o.fy - 5 < p.y;
    else if (o.type !== 'kelapa' || o.state === 'ground') hit = overlap(PX + 13, PX + 30, sx + 3, sx + o.w - 3) && p.y > GY - o.h + 3;
    if (hit) hurt(o.type, o);
  }
  // item
  for (const it of L.items) {
    if (it.taken) continue; const sx = it.x - G.cam; if (sx > W + 10) break; if (sx < -20) continue;
    if (overlap(PX + 4, PX + 38, sx - 5, sx + 5) && it.y > p.y - 38 && it.y < p.y + 3) collect(it);
  }
  // angsa
  while (G.gooseIdx < L.geese.length && L.geese[G.gooseIdx].x <= G.cam) {
    if (!G.goose) { G.goose = { x: -34, warn: 0.95, hitT: 0, hit: false, passed: false }; Sfx.honk(); }
    G.gooseIdx++;
  }
  const gs = G.goose;
  if (gs) {
    if (gs.warn > 0) gs.warn -= dt;
    else {
      gs.x += 110 * dt;
      if (gs.hitT > 0) gs.hitT += dt;
      if (!gs.hit && p.inv <= 0 && p.splashT <= 0 && overlap(gs.x + 6, gs.x + 23, PX + 13, PX + 30) && p.y > GY - 16) { gs.hit = true; gs.hitT = 0.01; Sfx.honk(); hurt('angsa', null); }
      if (!gs.hit && !gs.passed && gs.x > PX + 30) { gs.passed = true; G.score += 25; popup('ELAK! +25', PX + 40, GY - 50, '#8cff6a', 6); }
      if (gs.x > W + 40) G.goose = null;
    }
  }
  // rumah terlepas
  for (const h of L.houses) {
    if (h.state !== 'pending') { if (h.thanks > 0) h.thanks -= dt; continue; }
    if (h.zone[0] > G.cam + W) break;
    if (G.cam + PX + 20 > h.zone[1]) {
      h.state = 'missed'; h.thanks = 1.2; G.processed++; G.combo = 0;
      Sfx.miss(); popup(`TERLEPAS! No.${h.idx}`, PX + 60, GY - 60, '#ff7b7b', 6, 1.1);
      updateHud(true);
    }
  }
  // bungkusan
  for (let i = G.packages.length - 1; i >= 0; i--) {
    const pk = G.packages[i]; pk.t += dt;
    if (pk.t >= pk.dur) { G.packages.splice(i, 1); burst(pk.tx - G.cam, pk.ty, 12, ['#ffd447', '#ffffff', '#ff5a8a'], { min: 20, max: 60, g: 40, life: 0.6 }); }
  }
  if (G.processed >= TOTAL && G.cam + PX > L.lastHouseX + 110 && !G.packages.length) finish();
}

function update(dt) {
  G.anim += dt;
  if (G.shake > 0) G.shake -= dt;
  if (G.flash > 0) G.flash -= dt;
  if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.dur) G.banner = null; }
  for (let i = G.popups.length - 1; i >= 0; i--) { const p = G.popups[i]; p.life -= dt; p.y += p.vy * dt; p.vy *= 0.96; if (p.life <= 0) G.popups.splice(i, 1); }
  updateFireworks(dt);
  updateParticles(dt, G.confetti, 0);
  const st = G.state;
  if (st === 'menu') { G.cam += 34 * dt; G.player.wheelT += dt * 3.4; updateParticles(dt, G.particles, 34); return; }
  if (st === 'play') { updatePlay(dt); updateParticles(dt, G.particles, G.countdown > 0 ? 0 : G.speed); }
  else if (st === 'crashing') {
    const p = G.player; p.crashT += dt; G.speed = Math.max(0, G.speed - 140 * dt); G.cam += G.speed * dt; p.wheelT += dt * G.speed / 10;
    updateParticles(dt, G.particles, G.speed);
    if (p.crashT > 1.0) showCrash();
  } else if (st === 'done') {
    G.speed = Math.max(0, G.speed - 90 * dt); G.cam += G.speed * dt; G.player.wheelT += dt * G.speed / 10; G.doneT += dt;
    updateParticles(dt, G.particles, G.speed);
  } else if (st === 'result' || st === 'crash') updateParticles(dt, G.particles, 0);
  updateHud();
}

// ============================================================
// UI
// ============================================================
const $ = (id) => document.getElementById(id);
const SCREENS = ['scr-menu', 'scr-pdpa', 'scr-howto', 'scr-board', 'scr-pause', 'scr-crash', 'scr-done', 'scr-result'];
function showScreens(...ids) { for (const s of SCREENS) $(s).hidden = !ids.includes(s); }
function setHud(on) { $('hud').hidden = !on; $('controls').hidden = !on; $('tapzone').hidden = !on; }

let hudCache = {};
function buildHearts() { const el = $('h-lives'); el.innerHTML = ''; for (let i = 0; i < 3; i++) { const s = document.createElement('span'); s.className = 'heart'; el.appendChild(s); } }
function updateHud(bump = false, gained = false) {
  if (!G.level) return;
  const sc = String(G.score), dl = String(G.delivered).padStart(2, '0') + '/' + TOTAL;
  if (hudCache.sc !== sc) { $('h-score').textContent = sc; hudCache.sc = sc; }
  if (hudCache.dl !== dl) { $('h-del').textContent = dl; hudCache.dl = dl; if (bump) { const e = $('h-del'); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); } }
  if (hudCache.lv !== G.lives) {
    const hs = $('h-lives').children;
    for (let i = 0; i < hs.length; i++) { hs[i].classList.toggle('lost', i >= G.lives); }
    if (gained && hs[G.lives - 1]) { hs[G.lives - 1].classList.remove('pop'); void hs[0].offsetWidth; hs[G.lives - 1].classList.add('pop'); }
    hudCache.lv = G.lives;
  }
  const prog = clamp(G.tod, 0, 1) * 100;
  const pr = prog.toFixed(1);
  if (hudCache.pr !== pr) { $('h-prog').style.width = pr + '%'; $('h-marker').style.left = pr + '%'; hudCache.pr = pr; }
  const ck = clockAt(G.tod); if (hudCache.ck !== ck) { $('h-clock').textContent = ck; hudCache.ck = ck; }
  // butang HANTAR bercahaya bila dalam zon
  if (G.state === 'play') {
    const c = G.cam + PX + 20;
    const ready = G.level.houses.some((h) => h.state === 'pending' && c >= h.zone[0] - 4 && c <= h.zone[1]);
    if (hudCache.rd !== ready) { $('btn-deliver').classList.toggle('ready', ready); hudCache.rd = ready; }
    const cool = G.deliverCd > 0; if (hudCache.cl !== cool) { $('btn-deliver').classList.toggle('cool', cool); hudCache.cl = cool; }
  }
}

function soundLabel() { const t = Sfx.muted ? 'BUNYI: OFF' : 'BUNYI: ON'; $('btn-sound').textContent = t; $('btn-sound2').textContent = t; }
function playerLabel() {
  const b = $('btn-player');
  if (G.consent && G.playerName) { b.hidden = false; b.textContent = `Pemain: ${G.playerName} (tukar)`; } else b.hidden = true;
}

function enterMenu() {
  Sfx.setTense(false); Sfx.play('menu');
  G.state = 'menu'; G.paused = false; G.todForced = null; G.tod = 0.06;
  G.level = buildLevel(4242, true); G.cam = 0; G.player = newPlayer(); G.goose = null;
  G.particles.length = 0; G.popups.length = 0; G.fireworks.length = 0; G.confetti.length = 0; G.banner = null;
  setHud(false); showScreens('scr-menu'); playerLabel(); soundLabel();
}

function startGame(seed) {
  Sfx.init();
  G.level = buildLevel(seed != null ? seed : (Date.now() & 0x7fffffff));
  Object.assign(G, { state: 'play', cam: 0, speed: SPEED_MIN, tod: 0, todForced: null, score: 0, delivered: 0, processed: 0, lives: 3, combo: 0, bestCombo: 0, kuih: 0, time: 0, perfects: 0, goose: null, phaseIdx: 0, banner: null, countdown: 2.1, goTimer: 0, deliverCd: 0, paused: false, jumps: 0, gooseIdx: 0, finalBonus: 0 });
  G.player = newPlayer(); G.particles.length = 0; G.popups.length = 0; G.packages.length = 0; G.fireworks.length = 0; G.confetti.length = 0;
  hudCache = {}; buildHearts(); updateHud();
  $('jump-hint').classList.remove('fade');
  showScreens(); setHud(true);
  Sfx.tense = false; Sfx.stopMusic(); Sfx.play('play', 1);
}

function showCrash() {
  G.state = 'crash'; setHud(false); showScreens('scr-crash');
  Sfx.play('dizzy');
  const left = TOTAL - G.processed;
  $('crash-sub').textContent = `${G.delivered} kuih sampai, ${left} rumah masih menunggu`;
}

function saveScore() {
  const list = store.get('vrtb_board', []);
  const entry = { n: G.playerName || 'Tanpa Nama', s: G.score, d: G.delivered, t: Math.round(G.time), at: Date.now() };
  list.push(entry); list.sort((a, b) => b.s - a.s || b.d - a.d || a.t - b.t);
  const trimmed = list.slice(0, 20); store.set('vrtb_board', trimmed);
  G.lastRank = trimmed.indexOf(entry);
  return trimmed;
}
function renderBoard(el, list, max, meIdx = -1) {
  el.innerHTML = '';
  if (!list.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Belum ada rekod. Jadilah yang pertama!'; el.appendChild(li); return; }
  list.slice(0, max).forEach((e, i) => {
    const li = document.createElement('li'); if (i === meIdx) li.className = 'me';
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = e.n;
    const sc = document.createElement('span'); sc.className = 'sc'; sc.textContent = e.s;
    li.append(nm, sc); el.appendChild(li);
  });
  if (meIdx >= max) {
    const li = document.createElement('li'); li.className = 'me'; li.style.counterSet = `r ${meIdx}`;
    const e = list[meIdx];
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = e.n;
    const sc = document.createElement('span'); sc.className = 'sc'; sc.textContent = e.s;
    li.append(nm, sc); el.appendChild(li);
  }
}
function showResult(sample) {
  G.state = 'result'; setHud(false); showScreens('scr-result');
  if (!sample) Sfx.play('menu');
  $('r-del').textContent = `${G.delivered}/${TOTAL}`;
  $('r-time').textContent = fmtTime(G.time);
  $('r-kuih').textContent = String(G.kuih);
  $('r-combo').textContent = 'x' + G.bestCombo;
  $('r-score').textContent = String(G.score);
  const list = sample || saveScore();
  renderBoard($('result-board'), list, 5, sample ? 3 : G.lastRank);
}

function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 1800); }
async function share() {
  const msg = `Saya hantar ${G.delivered}/${TOTAL} kuih raya dengan skor ${G.score} dalam Vespa Raya The Baker! Boleh kalahkan saya?`;
  try { if (navigator.share) { await navigator.share({ title: 'Vespa Raya The Baker', text: msg }); return; } } catch (e) { /* jatuh balik ke salin */ }
  try { await navigator.clipboard.writeText(msg); toast('Teks disalin! Tampal di WhatsApp.'); }
  catch (e) { toast('Skor: ' + G.score + ' (' + G.delivered + '/30)'); }
}

function pause(on) {
  if (G.state !== 'play') return;
  G.paused = on; showScreens(on ? 'scr-pause' : null);
  if (on) Sfx.stopMusic(); else { Sfx.stopMusic(); Sfx.play('play'); }
}

function validatePdpa() {
  const ok = $('in-agree').checked && $('in-name').value.trim().length >= 2;
  $('btn-continue').disabled = !ok;
}

function bindUI() {
  // lompat: tekan mana-mana bahagian skrin
  const jumpDown = (e) => {
    if (G.state !== 'play' || G.paused) return;
    if (e && e.target.closest('button')) return;
    e && e.preventDefault();
    const p = G.player; p.holding = true; p.buffer = 0.13;
  };
  const jumpUp = () => { G.player.holding = false; };
  $('tapzone').addEventListener('pointerdown', jumpDown);
  $('controls').addEventListener('pointerdown', jumpDown);
  $('hud').addEventListener('pointerdown', jumpDown);
  window.addEventListener('pointerup', jumpUp); window.addEventListener('pointercancel', jumpUp);
  const del = $('btn-deliver');
  del.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); del.classList.add('pressed'); deliver(); });
  const unpress = () => del.classList.remove('pressed');
  del.addEventListener('pointerup', unpress); del.addEventListener('pointerleave', unpress);
  del.addEventListener('click', (e) => { if (e.detail === 0) deliver(); });

  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    const k = e.key;
    if (G.state === 'play' && !G.paused) {
      if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W' || k === 'z' || k === 'Z') { e.preventDefault(); if (!e.repeat) { G.player.holding = true; G.player.buffer = 0.13; } }
      else if (k === 'Enter' || k === 'ArrowRight' || k === 'ArrowDown' || k === 'd' || k === 'D' || k === 'x' || k === 'X') { e.preventDefault(); if (!e.repeat) deliver(); }
    }
    if ((k === 'p' || k === 'P' || k === 'Escape') && G.state === 'play') { e.preventDefault(); pause(!G.paused); }
    if (G.state === 'done' && (k === ' ' || k === 'Enter')) { e.preventDefault(); if (G.doneT > 0.8) showResult(); }
  });
  window.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === 'z' || e.key === 'Z') G.player.holding = false; });

  const unlock = () => { Sfx.init(); if (G.state === 'menu' && !Sfx.musicOn) Sfx.play('menu'); };
  window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
  $('btn-start').addEventListener('click', () => {
    Sfx.init();
    if (G.consent && G.playerName) startGame(); else { $('in-name').value = G.playerName; $('in-agree').checked = G.consent; validatePdpa(); showScreens('scr-pdpa'); }
  });
  $('btn-player').addEventListener('click', () => { $('in-name').value = G.playerName; $('in-agree').checked = G.consent; validatePdpa(); showScreens('scr-pdpa'); });
  $('in-agree').addEventListener('change', validatePdpa);
  $('in-name').addEventListener('input', validatePdpa);
  $('pdpa-form').addEventListener('submit', (e) => {
    e.preventDefault(); if ($('btn-continue').disabled) return;
    G.playerName = $('in-name').value.trim().slice(0, 14); G.consent = true;
    store.set('vrtb_name', G.playerName); store.set('vrtb_consent', true);
    startGame();
  });
  $('btn-pdpa-back').addEventListener('click', () => showScreens('scr-menu'));
  $('btn-board').addEventListener('click', () => { renderBoard($('board-list'), store.get('vrtb_board', []), 10); showScreens('scr-board'); });
  $('btn-board-close').addEventListener('click', () => showScreens('scr-menu'));
  $('btn-howto').addEventListener('click', () => showScreens('scr-howto'));
  $('btn-howto-close').addEventListener('click', () => showScreens('scr-menu'));
  const toggleSound = () => { Sfx.init(); Sfx.setMuted(!Sfx.muted); soundLabel(); };
  $('btn-sound').addEventListener('click', toggleSound);
  $('btn-sound2').addEventListener('click', toggleSound);
  $('btn-pause').addEventListener('click', (e) => { e.stopPropagation(); pause(true); });
  $('btn-pause').addEventListener('pointerdown', (e) => e.stopPropagation());
  $('btn-resume').addEventListener('click', () => pause(false));
  $('btn-quit').addEventListener('click', () => enterMenu());
  $('btn-retry').addEventListener('click', () => startGame());
  $('btn-crash-menu').addEventListener('click', () => enterMenu());
  $('btn-crash-x').addEventListener('click', () => enterMenu());
  $('scr-done').addEventListener('pointerdown', () => { if (G.doneT > 0.8) showResult(); });
  $('btn-again').addEventListener('click', () => startGame());
  $('btn-share').addEventListener('click', share);
  $('btn-result-menu').addEventListener('click', () => enterMenu());
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play' && !G.paused) pause(true); });
  window.addEventListener('resize', resize);
}

// ============================================================
// Mod "frame" — untuk pratonton setiap skrin (?frame=nama)
// ============================================================
function clearView(from, to) {
  const L = G.level;
  L.obs = L.obs.filter((o) => o.x < from || o.x > to);
  L.items = L.items.filter((o) => o.x < from || o.x > to);
  L.crossings = L.crossings.filter((o) => o.x + o.len < from || o.x > to);
  L.signs = L.signs.filter((o) => o.x < from || o.x > to);
  L.decor = L.decor.filter((o) => o.type === 'pelita' || o.x < from || o.x > to);
}
function setupFrame(name) {
  const at = (sx) => G.cam + sx;
  const L0 = () => G.level;
  const stage = (houseIdx, houseSx, tod) => {
    startGame(777); G.countdown = 0;
    const h = L0().houses[houseIdx];
    G.cam = h.x - houseSx; G.todForced = tod; G.tod = tod;
    clearView(G.cam - 40, G.cam + W + 60);
    for (let i = 0; i < houseIdx; i++) { L0().houses[i].state = i % 7 === 3 ? 'missed' : 'done'; L0().houses[i].thanks = 0; }
    G.delivered = L0().houses.filter((x) => x.state === 'done').length; G.processed = houseIdx;
    G.phaseIdx = phaseOfTod(tod);
  };
  const obs = (type, sx, extra = {}) => { const dims = { lubang: [22, 3], batu: [15, 11], tahi: [14, 6], kelapa: [11, 10] }[type]; G.level.obs.push({ type, x: at(sx), w: dims[0], h: dims[1], hit: false, state: 'wait', fy: -14, vy: 0, ...extra }); G.level.obs.sort((a, b) => a.x - b.x); };
  const item = (type, sx, y, k = 0) => { G.level.items.push({ type, k, x: at(sx), y, taken: false }); G.level.items.sort((a, b) => a.x - b.x); };
  const cross = (sx, len, broken) => { const gw = 40; G.level.crossings.push({ x: at(sx), len, broken, gap: broken ? [at(sx) + (len - gw) / 2, at(sx) + (len + gw) / 2] : null }); G.level.crossings.sort((a, b) => a.x - b.x); if (broken) G.level.signs.push({ x: at(sx) - 30 }); };
  switch (name) {
    case 'menu': enterMenu(); G.cam = 150; break;
    case 'pdpa': enterMenu(); G.cam = 150; $('in-name').value = 'Ahmad'; $('in-agree').checked = true; validatePdpa(); showScreens('scr-pdpa'); break;
    case 'caramain': enterMenu(); G.cam = 150; showScreens('scr-howto'); break;
    case 'siang':
      stage(3, 150, 0.1); cross(PX - 14, 60, false);
      for (let k = 0; k < 4; k++) item('kuih', 100 + k * 13, GY - 12, k);
      obs('lubang', 196); G.score = 380; G.kuih = 8;
      break;
    case 'petang':
      stage(10, 165, 0.38);
      G.goose = { x: -2, warn: 0, hitT: 0, hit: false, passed: false };
      G.player.y = GY - 24; G.player.vy = -120; G.player.grounded = false;
      obs('kelapa', 120, { state: 'fall', fy: 150 }); obs('lubang', 70); obs('batu', 158); obs('tahi', 200);
      item('jar', 118, GY - 62); item('kuih', 150, GY - 36, 1); item('kuih', 164, GY - 42, 0);
      G.score = 1240; G.combo = 3; G.kuih = 22;
      G.popups.push({ text: 'ELAK! +25', x: 70, y: GY - 58, color: '#8cff6a', size: 6, life: 1, vy: 0 });
      break;
    case 'hantar':
      stage(13, 6, 0.46);
      G.player.wheelT = 3; G.score = 1890; G.combo = 5;
      L0().houses[13].state = 'done'; L0().houses[13].thanks = 1.5; G.delivered++;
      G.packages.push({ sx: PX + 8, sy: GY - 26, tx: L0().houses[13].x + 40, ty: ROAD_TOP - 26, t: 0.3, dur: 0.45 });
      G.popups.push({ text: '+350', x: PX + 34, y: GY - 62, color: '#ffd447', size: 8, life: 1, vy: 0 });
      G.popups.push({ text: 'SEMPURNA!', x: PX + 34, y: GY - 76, color: '#7dff8a', size: 6.5, life: 1, vy: 0 });
      G.popups.push({ text: 'COMBO x3', x: PX + 34, y: GY - 88, color: '#ff9a3c', size: 6, life: 1, vy: 0 });
      break;
    case 'senja':
      stage(18, 156, 0.64); cross(58, 84, true);
      G.player.y = GY; obs('batu', 206);
      item('kuih', 84, GY - 30, 0); item('kuih', 100, GY - 44, 1); item('kuih', 116, GY - 30, 2);
      G.score = 2460; G.lives = 2; G.kuih = 41;
      break;
    case 'malam':
      stage(26, 120, 0.9); cross(PX - 16, 64, false);
      obs('batu', 168); item('ketupat', 140, GY - 44);
      G.score = 3820; G.lives = 2; G.kuih = 63;
      rand = mulberry32(5);
      for (let i = 0; i < 3; i++) { spawnFirework(); const f = G.fireworks[i]; f.y = f.ty + 1; }
      for (let s = 0; s < 40; s++) updateFireworks(1 / 60);
      G.fireworks.forEach((f) => (f.flash = 0));
      break;
    case 'banner':
      stage(16, 260, 0.56); G.banner = { title: 'SENJA', sub: PHASES[2].sub, t: 1, dur: 2.4 }; G.score = 2100;
      break;
    case 'zon':
      stage(29, 70, 0.97); L0().houses[29].state = 'done'; L0().houses[29].thanks = 1.5; G.delivered = 27; G.processed = 30; G.lives = 2; G.score = 4520;
      G.speed = 0; finish(); G.doneT = 1;
      for (const p of G.confetti) { p.y = rr(20, 330); }
      break;
    case 'jatuh':
      stage(12, 200, 0.4); G.delivered = 11; G.processed = 12; G.score = 1460; showCrash(); break;
    case 'keputusan': {
      stage(29, 260, 0.95); Object.assign(G, { delivered: 24, time: 630, kuih: 58, bestCombo: 9, score: 4120 });
      const sample = [{ n: 'Ahmad', s: 5210 }, { n: 'Siti', s: 4870 }, { n: 'Amran', s: 4390 }, { n: 'Anda', s: 4120 }, { n: 'Mei Ling', s: 3650 }];
      rand = mulberry32(9); for (let i = 0; i < 2; i++) { spawnFirework(); G.fireworks[i].y = G.fireworks[i].ty + 1; } for (let s = 0; s < 40; s++) updateFireworks(1 / 60); G.fireworks.forEach((f) => (f.flash = 0));
      showResult(sample); break;
    }
    case 'aset': G.state = 'aset'; showScreens(); setHud(false); break;
  }
  updateHud();
}

// ============================================================
// Mula
// ============================================================
let last = 0, acc = 0;
function loop(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
  if (!G.paused) {
    acc += dt; const step = 1 / 120;
    while (acc >= step) { update(step); acc -= step; }
  }
  render();
  requestAnimationFrame(loop);
}

function boot() {
  buildLights();
  if (QS.get('debug')) window.__vrtb = { G, S, Sfx, deliver, startGame, update, render, PX, GY, W, supported, showResult };
  buildSprites();
  buildHearts();
  bindUI();
  resize();
  if (FRAME) {
    setupFrame(FRAME);
    const done = () => { render(); document.body.dataset.ready = '1'; };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(done, 50));
    return;
  }
  enterMenu();
  requestAnimationFrame((ts) => { last = ts; requestAnimationFrame(loop); });
}
boot();
})();

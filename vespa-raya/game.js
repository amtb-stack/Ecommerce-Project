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
const SPEED_MIN = 74, SPEED_MAX = 132;
const FONT_PIX = '"Press Start 2P", monospace';
const FONT_BODY = '"Pixelify Sans", "Trebuchet MS", sans-serif';
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
// Pembina sprite piksel (dengan garis luar automatik)
// ============================================================
class PG {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); this.ox = 0; this.oy = 0; }
  px(x, y, c) { x = Math.round(x + this.ox); y = Math.round(y + this.oy); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c); }
  hline(x0, x1, y, c) { for (let x = x0; x <= x1; x++) this.px(x, y, c); }
  vline(x, y0, y1, c) { for (let y = y0; y <= y1; y++) this.px(x, y, c); }
  ell(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x - cx) / (rx + 0.5), dy = (y - cy) / (ry + 0.5);
        if (dx * dx + dy * dy <= 1) this.px(x, y, c);
      }
  }
  circ(cx, cy, r, c) { this.ell(cx, cy, r, r, c); }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) { this.px(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  poly(pts, c) {
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs = [], yc = y + 0.5;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.px(x, y, c);
    }
  }
  outline(c) {
    const s = this.d.slice(), w = this.w, h = this.h;
    const n = (x, y) => x >= 0 && y >= 0 && x < w && y < h && s[y * w + x];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (s[y * w + x]) continue;
      if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) this.d[y * w + x] = c;
    }
  }
  canvas() {
    const cv = document.createElement('canvas'); cv.width = this.w; cv.height = this.h;
    const g = cv.getContext('2d'); const id = g.createImageData(this.w, this.h);
    for (let i = 0; i < this.d.length; i++) {
      const c = this.d[i]; if (!c) continue;
      const [r, gg, b] = hex2rgb(c); id.data[i * 4] = r; id.data[i * 4 + 1] = gg; id.data[i * 4 + 2] = b; id.data[i * 4 + 3] = 255;
    }
    g.putImageData(id, 0, 0); return cv;
  }
}
function sprite(w, h, fn, outline = PAL.ink) { const g = new PG(w, h); g.ox = 1; g.oy = 1; fn(g); if (outline) g.outline(outline); return g.canvas(); }

// ---------------- Watak & vespa ----------------
function drawRider(g, ox = 0, oy = 0, pose = 'ride') {
  const P = PAL, X = (x) => x + ox, Y = (y) => y + oy;
  if (pose === 'ride') {
    g.rect(X(14), Y(20), 9, 3, P.pants);            // peha
    g.rect(X(21), Y(22), 3, 6, P.pants);            // betis
    g.rect(X(21), Y(27), 5, 2, P.shoe);             // kasut
  } else {
    g.rect(X(8), Y(20), 3, 7, P.pants); g.rect(X(14), Y(19), 7, 3, P.pants);
    g.rect(X(6), Y(26), 4, 2, P.shoe); g.rect(X(20), Y(18), 2, 4, P.shoe);
  }
  // sampin songket
  g.rect(X(11), Y(17), 9, 5, P.songket);
  g.hline(X(11), X(19), Y(17), P.gold);
  for (const [x, y] of [[13, 19], [16, 19], [18, 20], [12, 21], [15, 21]]) g.px(X(x), Y(y), P.gold);
  // baju melayu
  g.rect(X(12), Y(9), 8, 9, P.teal);
  g.vline(X(12), Y(10), Y(16), P.tealS);
  g.hline(X(15), X(17), Y(9), P.tealH);
  g.px(X(17), Y(11), P.gold); g.px(X(17), Y(13), P.gold);   // butang baju
  // tangan
  if (pose === 'ride') {
    g.rect(X(18), Y(11), 9, 3, P.teal); g.hline(X(18), X(26), Y(13), P.tealS);
    g.rect(X(26), Y(10), 3, 3, P.skin);
  } else {
    g.rect(X(18), Y(6), 3, 6, P.teal); g.rect(X(18), Y(4), 3, 2, P.skin);
    g.rect(X(8), Y(11), 5, 3, P.teal); g.rect(X(5), Y(11), 3, 3, P.skin);
  }
  // leher & kepala
  g.rect(X(15), Y(7), 3, 2, P.skinS);
  g.ell(X(17), Y(4), 4, 3.6, P.skin);
  // topi keledar merah
  g.ell(X(15.5), Y(2.5), 5, 3.5, P.red);
  g.rect(X(11), Y(3), 4, 4, P.red);
  g.rect(X(11), Y(5), 3, 2, P.redS);
  g.hline(X(12), X(19), Y(5), P.redS);
  g.px(X(13), Y(0), P.redH); g.px(X(14), Y(0), P.redH); g.px(X(12), Y(1), P.redH);
  g.rect(X(18), Y(4), 3, 4, P.skin);
  g.px(X(19), Y(5), P.ink);                        // mata
  g.px(X(20), Y(7), P.blush);
  g.px(X(16), Y(7), P.ink);                        // tali keledar
  if (pose !== 'ride') { g.px(X(19), Y(5), P.ink); g.px(X(18), Y(5), P.ink); g.px(X(20), Y(6), P.ink); }
}
function drawVespa(g, f, withRider) {
  const P = PAL;
  const wheel = (cx, cy) => {
    g.circ(cx, cy, 4.6, P.tyre); g.circ(cx, cy, 2.2, P.hub); g.px(cx, cy, P.metalD);
    if (f === 0) { g.px(cx - 2, cy, P.metalD); g.px(cx + 2, cy, P.metalD); g.px(cx, cy - 2, P.metalD); g.px(cx, cy + 2, P.metalD); }
    else { g.px(cx - 1, cy - 1, P.metalD); g.px(cx + 1, cy + 1, P.metalD); g.px(cx + 1, cy - 1, P.metalD); g.px(cx - 1, cy + 1, P.metalD); }
  };
  wheel(10, 31); wheel(33, 31);
  // ekzos
  g.rect(1, 29, 6, 2, P.metal); g.hline(1, 6, 29, P.hub);
  // badan belakang (kowl Vespa)
  g.ell(12, 25, 10.5, 5.5, P.creamS);
  g.ell(12, 24, 9.8, 4.6, P.cream);
  g.hline(6, 16, 20, P.creamH); g.hline(4, 6, 21, P.creamH);
  g.hline(5, 19, 26, P.teal);                      // jalur hiasan
  // lantai kaki
  g.rect(19, 27, 10, 2, P.creamS); g.hline(19, 28, 27, P.cream);
  // perisai kaki depan
  g.poly([[27, 30], [32, 30], [35, 13], [31, 12], [28, 20]], P.cream);
  g.line(34, 14, 32, 28, P.creamS);
  // fender depan
  g.ell(33, 26.5, 5.5, 2, P.cream); g.hline(30, 36, 25, P.creamH);
  // kepala & hendal
  g.rect(30, 9, 7, 3, P.cream); g.hline(30, 36, 9, P.creamH);
  g.rect(37, 9, 2, 3, P.lamp); g.px(38, 10, P.white);
  g.px(28, 10, P.tyre); g.px(29, 10, P.tyre);
  g.vline(31, 6, 8, P.metal); g.rect(30, 5, 3, 2, P.metal);   // cermin
  // tempat duduk
  g.rect(5, 18, 13, 2, P.seat); g.hline(6, 16, 18, P.seatH);
  // rak & kotak kuih
  g.hline(0, 9, 17, P.metalD);
  g.rect(0, 9, 10, 8, P.box); g.rect(0, 15, 10, 2, P.boxS);
  g.vline(5, 9, 16, P.ribbon); g.hline(0, 9, 12, P.ribbon);
  g.px(4, 8, P.ribbon); g.px(6, 8, P.ribbon); g.px(3, 7, P.ribbon); g.px(7, 7, P.ribbon);
  if (withRider) drawRider(g, 0, 0, 'ride');
}

// ---------------- Angsa pengejar ----------------
function drawGoose(g, f) {
  const P = PAL;
  // kaki
  const lx = f ? [9, 14] : [11, 12];
  for (const x of lx) { g.vline(x, 20, 22, P.beak); g.hline(x - 1, x + 1, 23, P.beak); }
  // badan
  g.ell(11, 15, 9, 5.5, P.goose);
  g.poly([[1, 10], [6, 12], [5, 16]], P.goose);
  g.hline(5, 17, 19, P.gooseS); g.hline(7, 15, 20, P.gooseS);
  // sayap
  if (f) { g.poly([[4, 13], [14, 12], [8, 4], [3, 6]], P.gooseS); g.line(5, 7, 12, 12, P.goose); }
  else { g.ell(10, 14, 6, 3, P.gooseS); g.hline(6, 14, 13, P.goose); }
  // leher & kepala
  g.rect(17, 5, 3, 11, P.goose);
  g.ell(20, 4.5, 3.5, 2.8, P.goose);
  // paruh (terbuka bila honk)
  g.rect(23, 3, 4, 2, P.beak); g.px(23, 2, P.beakS);
  if (f) { g.rect(23, 6, 3, 1, P.beakS); }
  else g.rect(23, 5, 3, 1, P.beakS);
  // mata marah merah
  g.px(21, 3, P.angry); g.px(20, 2, P.ink); g.px(21, 2, P.ink); g.px(22, 3, P.ink);
}

// ---------------- Rumah kampung ----------------
const HOUSE_VARIANTS = [
  { wall: ['#b06a3c', '#8a4f2a', '#cf8b55'], roof: ['#8a3b2a', '#64281d'], shut: '#2f7a5a' },
  { wall: ['#6fa3c7', '#4f7fa3', '#9ac6e3'], roof: ['#9aa4ae', '#6d7782'], shut: '#d9533f' },
  { wall: ['#86b874', '#5f9353', '#acd79a'], roof: ['#a0452e', '#742f20'], shut: '#f0c24a' },
  { wall: ['#e3cf9c', '#bda672', '#f5e6bd'], roof: ['#7a5c3a', '#5a422a'], shut: '#3a6fc0' },
];
function drawHouse(g, v) {
  const P = PAL, V = HOUSE_VARIANTS[v];
  // tiang
  for (const x of [5, 19, 52, 67]) { g.rect(x, 52, 3, 17, P.woodS); g.vline(x, 52, 68, P.wood); }
  g.rect(2, 49, 74, 4, P.woodS); g.hline(2, 75, 49, P.wood);
  // dinding papan
  g.rect(4, 28, 70, 21, V.wall[0]);
  for (let x = 6; x < 74; x += 4) g.vline(x, 31, 48, V.wall[1]);
  g.rect(4, 28, 70, 3, V.wall[2]);
  for (let x = 6; x < 73; x += 3) g.px(x, 29, V.wall[1]);            // ukiran kerawang
  // tingkap
  const win = (x) => {
    g.rect(x, 34, 11, 11, P.woodS); g.rect(x + 1, 35, 9, 9, '#3a2418');
    g.vline(x + 5, 35, 43, P.woodS); g.hline(x + 1, x + 9, 39, P.woodS);
    g.rect(x - 4, 34, 4, 11, V.shut); g.rect(x + 11, 34, 4, 11, V.shut);
    g.vline(x - 2, 35, 43, P.ink); g.vline(x + 13, 35, 43, P.ink);
  };
  win(11); win(56);
  // pintu
  g.rect(33, 32, 12, 17, P.woodS); g.rect(34, 33, 10, 16, '#7a4a2a');
  g.vline(38, 33, 48, P.woodS); g.vline(39, 33, 48, P.woodS);
  g.px(36, 41, P.gold); g.px(41, 41, P.gold);
  // tangga
  for (let i = 0; i < 4; i++) g.rect(32, 53 + i * 4, 14, 2, i % 2 ? P.wood : P.woodH);
  g.vline(31, 50, 68, P.woodS); g.vline(46, 50, 68, P.woodS);
  // bumbung
  g.poly([[-1, 29], [79, 29], [66, 8], [12, 8]], V.roof[0]);
  for (let y = 11; y < 29; y += 3) g.hline(Math.round(12 - (y - 8) * 0.62), Math.round(66 + (y - 8) * 0.62), y, V.roof[1]);
  g.hline(0, 78, 28, V.roof[1]);
  // tebar layar (gable berukir)
  g.poly([[27, 9], [51, 9], [39, -1]], P.woodH);
  for (const dx of [-8, -4, 0, 4, 8]) g.line(39, 1, 39 + dx, 8, P.wood);
  g.hline(28, 50, 9, P.woodS);
}
function drawHouseFar(g) {
  g.rect(3, 10, 20, 8, '#9a6a4a'); g.rect(4, 18, 2, 3, '#6e4a35'); g.rect(20, 18, 2, 3, '#6e4a35');
  g.rect(6, 12, 3, 3, '#3a2418'); g.rect(16, 12, 3, 3, '#3a2418');
  g.poly([[0, 11], [26, 11], [21, 2], [5, 2]], '#7a3b2a');
}

// ---------------- Pokok ----------------
function drawPalm(g) {
  const P = PAL;
  // batang melengkung
  for (let y = 86; y > 18; y--) {
    const t = (86 - y) / 68, x = 20 + Math.sin(t * 1.6) * 6;
    g.rect(x, y, 4, 1, (y % 5 === 0) ? P.trunkS : P.trunk);
    g.px(x + 3, y, P.trunkS);
  }
  const cx = 26, cy = 17;
  const frond = (ang, len, droop) => {
    let px = cx, py = cy;
    for (let i = 0; i < len; i++) {
      const t = i / len, a = ang + droop * t * t;
      px += Math.cos(a); py += Math.sin(a);
      g.px(px, py, P.leaf); g.px(px, py + 1, P.leafS);
      if (i > 2 && i % 2 === 0) { g.px(px + Math.cos(a + 1.4) * 2, py + Math.sin(a + 1.4) * 2 + 1, P.leaf); g.px(px + Math.cos(a - 1.4) * 2, py + Math.sin(a - 1.4) * 2 + 1, P.leafS); }
    }
  };
  frond(Math.PI, 20, -1.1); frond(Math.PI * 0.82, 18, -0.9); frond(-Math.PI * 0.75, 14, -0.6);
  frond(0, 19, 1.1); frond(Math.PI * 0.16, 17, 0.9); frond(-Math.PI * 0.25, 15, 0.6); frond(-Math.PI / 2, 9, 0.4);
  g.circ(24, 19, 2, PAL.coconutG); g.circ(28, 19, 2, PAL.coconut); g.circ(26, 21, 2, PAL.coconutG);
}
function drawBanana(g) {
  const P = PAL;
  g.rect(13, 22, 4, 22, '#7aa33e'); g.vline(13, 22, 43, '#55782a');
  const leaf = (pts) => g.poly(pts, P.leafH);
  leaf([[15, 23], [2, 14], [0, 18], [10, 25]]); leaf([[15, 22], [28, 12], [29, 17], [18, 25]]);
  leaf([[15, 22], [9, 3], [13, 2], [17, 20]]); leaf([[15, 22], [22, 4], [25, 6], [17, 22]]);
  g.line(15, 23, 2, 15, P.leafS); g.line(15, 22, 28, 13, P.leafS); g.line(15, 22, 10, 3, P.leafS); g.line(16, 22, 23, 5, P.leafS);
  g.rect(16, 26, 4, 6, '#d6c34a'); g.px(18, 32, '#8a3b2a');
}
function drawBush(g) {
  g.ell(6, 8, 6, 4, PAL.grassS); g.ell(14, 7, 7, 5, PAL.grass); g.ell(20, 9, 4, 3, PAL.grassS);
  g.px(11, 5, PAL.grassH); g.px(16, 4, PAL.grassH); g.px(13, 6, '#ff8fb0'); g.px(18, 7, '#ffe066');
}

// ---------------- Halangan ----------------
function drawRock(g) { g.ell(8, 7, 7.5, 4.5, PAL.rockS); g.ell(7, 6, 6.5, 3.8, PAL.rock); g.hline(4, 8, 3, PAL.rockH); g.px(10, 5, PAL.rockH); g.px(12, 8, PAL.rockS); }
function drawDung(g) { g.ell(7, 5.5, 6, 2, PAL.dungS); g.ell(7, 4, 4.5, 1.6, PAL.dung); g.ell(7, 2.5, 2.6, 1.2, PAL.dungH); g.px(7, 1, PAL.dungH); }
function drawCoconut(g) { g.circ(5, 5, 4.6, PAL.coconut); g.px(3, 3, PAL.coconutH); g.px(4, 2, PAL.coconutH); g.hline(3, 7, 1, PAL.coconutG); g.px(6, 6, PAL.ink); g.px(4, 7, PAL.ink); }
function drawWarn(g) {
  g.poly([[6.5, -0.5], [13.5, 12], [-0.5, 12]], PAL.warnY);
  g.hline(1, 12, 11, PAL.warnS);
  g.vline(6, 4, 7, PAL.ink); g.vline(7, 4, 7, PAL.ink); g.rect(6, 9, 2, 1, PAL.ink);
}

// ---------------- Kuih raya & item ----------------
function drawSemperit(g) {
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.circ(4.5 + Math.cos(a) * 3, 4.5 + Math.sin(a) * 3, 1.5, '#f2cf86'); }
  g.circ(4.5, 4.5, 2.5, '#f6dc9e'); g.circ(4.5, 4.5, 1, '#e23b4a'); g.px(4, 4, '#ff9aa0');
}
function drawTart(g) {
  g.circ(4.5, 4.5, 4.5, '#e3a957'); g.circ(4.5, 4.5, 3, '#f4c271'); g.circ(4.5, 4.5, 2, '#f08a24');
  g.px(4, 3, '#ffc070'); g.hline(3, 6, 1, '#f9d79a');
}
function drawBangkit(g) {
  g.poly([[4, -0.5], [5.5, 3], [8.5, 3], [6, 5], [7, 8.5], [4, 6.5], [1, 8.5], [2, 5], [-0.5, 3], [2.5, 3]], '#fbf3e4');
  g.px(4, 4, '#f08aa0');
}
function drawKekLapis(g) {
  g.rect(0, 0, 10, 8, '#7a3e1e');
  for (let y = 1; y < 8; y += 2) g.hline(0, 9, y, '#f2c14e');
  g.hline(0, 9, 0, '#5a2a12');
}
function drawJar(g) {
  g.rect(3, 0, 7, 3, PAL.lid); g.hline(3, 9, 2, PAL.lidS);
  g.rect(1, 3, 11, 12, PAL.jar); g.vline(1, 4, 14, PAL.jarS); g.vline(11, 4, 14, PAL.jarS); g.hline(2, 10, 14, PAL.jarS);
  for (const [x, y, c] of [[3, 11, '#f2cf86'], [6, 12, '#f4c271'], [9, 11, '#f2cf86'], [4, 8, '#f4c271'], [7, 9, '#fbf3e4'], [5, 5, '#f2cf86'], [8, 6, '#f4c271']]) { g.rect(x, y, 2, 2, c); }
  g.vline(3, 4, 7, PAL.white);
  g.rect(4, 6, 5, 3, PAL.ribbon); g.px(6, 7, PAL.gold);
}
function drawKetupat(g) {
  g.poly([[6, -0.5], [12.5, 6], [6, 12.5], [-0.5, 6]], PAL.ketG);
  for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) if ((i + j) % 4 === 0 && Math.abs(i - 6) + Math.abs(j - 6) < 6) g.px(i, j, PAL.ketY);
  g.line(6, 0, 12, 6, PAL.ketGS); g.line(6, 12, 12, 6, PAL.ketGS);
  g.line(7, -1, 9, -4, PAL.ketG); g.line(5, -1, 4, -4, PAL.ketG);
}
function drawGift(g) {
  g.rect(0, 2, 8, 6, PAL.box); g.rect(0, 6, 8, 2, PAL.boxS);
  g.vline(3, 2, 7, PAL.ribbon); g.vline(4, 2, 7, PAL.ribbon); g.hline(0, 7, 4, PAL.ribbon);
  g.px(2, 1, PAL.ribbon); g.px(5, 1, PAL.ribbon); g.px(1, 0, PAL.ribbon); g.px(6, 0, PAL.ribbon);
}
function drawPelita(g) {
  g.rect(2, 4, 3, 17, PAL.bamboo); g.vline(4, 4, 20, PAL.bambooS);
  g.hline(2, 4, 9, PAL.bambooS); g.hline(2, 4, 15, PAL.bambooS);
  g.rect(1, 2, 5, 3, '#6b4b2a'); g.px(3, 1, '#3a2a1a');
}
function drawCloud(g, w) {
  const big = w > 30;
  if (big) { g.ell(10, 10, 9, 4, '#e6eefc'); g.ell(20, 7, 10, 6, '#ffffff'); g.ell(30, 10, 7, 4, '#ffffff'); g.hline(4, 34, 13, '#d3defa'); }
  else { g.ell(8, 7, 7, 3.5, '#ffffff'); g.ell(17, 5, 7, 4.5, '#ffffff'); g.hline(3, 22, 9, '#d3defa'); }
}
function drawCow(g) {
  g.rect(3, 4, 13, 7, '#8a5a3a'); g.rect(6, 5, 4, 3, '#f2e6d0');
  g.rect(15, 2, 5, 5, '#8a5a3a'); g.px(19, 3, PAL.ink); g.rect(18, 5, 3, 2, '#e8b8a0');
  g.px(15, 1, '#e8e0c8'); g.px(18, 1, '#e8e0c8');
  for (const x of [4, 7, 12, 15]) g.vline(x, 11, 13, '#6a4028');
  g.vline(2, 5, 9, '#6a4028');
}
function drawSign(g) {
  g.rect(9, 10, 2, 24, PAL.woodS); g.vline(9, 10, 33, PAL.wood);
  g.rect(0, 0, 21, 12, '#21418f'); g.rect(1, 1, 19, 10, '#2f58b8');
}
function drawAwas(g) {
  g.rect(9, 12, 2, 22, PAL.woodS);
  g.rect(0, 0, 21, 14, PAL.warnY); g.rect(1, 1, 19, 12, '#ffe066');
  g.hline(1, 19, 12, PAL.warnS);
}

// ============================================================
// Sprite registry
// ============================================================
const S = {};
function buildSprites() {
  S.vespa = [0, 1].map((f) => sprite(44, 40, (g) => drawVespa(g, f, true)));
  S.vespaBare = sprite(44, 40, (g) => drawVespa(g, 0, false));
  S.riderFly = sprite(30, 32, (g) => drawRider(g, 0, 1, 'fly'));
  S.goose = [0, 1].map((f) => sprite(30, 26, (g) => drawGoose(g, f)));
  S.house = [0, 1, 2, 3].map((v) => sprite(82, 72, (g) => { g.oy = 2; drawHouse(g, v); }));
  S.houseFar = sprite(28, 23, drawHouseFar, '#5a3a2a');
  S.palm = sprite(48, 90, drawPalm);
  S.palmFar = sprite(48, 90, drawPalm, null);
  S.banana = sprite(32, 46, drawBanana);
  S.bush = sprite(27, 15, drawBush);
  S.rock = sprite(18, 13, drawRock);
  S.dung = sprite(16, 9, drawDung);
  S.coconut = sprite(12, 12, drawCoconut);
  S.warn = sprite(16, 15, drawWarn);
  S.kuih = [sprite(11, 11, drawSemperit), sprite(11, 11, drawTart), sprite(11, 11, drawBangkit), sprite(12, 10, drawKekLapis)];
  S.jar = sprite(15, 18, drawJar);
  S.ketupat = sprite(15, 18, (g) => { g.oy = 5; drawKetupat(g); });
  S.gift = sprite(10, 10, drawGift);
  S.pelita = sprite(8, 23, drawPelita);
  S.cloud = [sprite(42, 18, (g) => drawCloud(g, 40), '#c7d3f2'), sprite(28, 13, (g) => drawCloud(g, 26), '#c7d3f2')];
  S.cow = sprite(23, 15, drawCow);
  S.sign = sprite(23, 36, drawSign);
  S.awas = sprite(23, 36, drawAwas);
  // bulan sabit (anak bulan Syawal)
  const m = document.createElement('canvas'); m.width = 24; m.height = 24; const mg = m.getContext('2d');
  mg.fillStyle = '#fff4c2'; pixCircle(mg, 12, 12, 10); mg.globalCompositeOperation = 'destination-out'; pixCircle(mg, 17, 9, 9);
  S.moon = m;
  // ikon untuk HTML
  const root = document.documentElement.style;
  root.setProperty('--heart-full', `url(${heartURI('#ff4d5e', '#ffffff')})`);
  root.setProperty('--heart-empty', `url(${heartURI('#3b3f6b', '#5a6090')})`);
  root.setProperty('--gift', `url(${S.gift.toDataURL()})`);
}
function pixCircle(c, cx, cy, r) { for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); c.fillRect(cx - w, cy + y, w * 2, 1); } }
function heartURI(fill, shine) {
  const rows = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
  const g = new PG(9, 8); g.ox = 1; g.oy = 1;
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'X') g.px(x, y, fill); }));
  g.px(1, 1, shine); g.outline(PAL.ink);
  return g.canvas().toDataURL();
}

// ============================================================
// Audio (WebAudio, sintesis chiptune)
// ============================================================
const Sfx = {
  ctx: null, master: null, musicGain: null, muted: store.get('vrtb_muted', false), musicOn: false, timer: null, step: 0, nextT: 0,
  init() {
    if (FRAME) return;
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.55; this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.32; this.musicGain.connect(this.master);
      const len = this.ctx.sampleRate * 0.6; this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },
  setMuted(m) { this.muted = m; store.set('vrtb_muted', m); if (this.master) this.master.gain.value = m ? 0 : 0.55; },
  tone(freq, dur, type = 'square', vol = 0.12, slide = 0, delay = 0, dest) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.linearRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest || this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol = 0.2, freq = 1200, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay, s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noiseBuf; f.type = 'lowpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur + 0.02);
  },
  jump() { this.tone(300, 0.14, 'square', 0.09, 380); },
  coin() { this.tone(988, 0.06, 'square', 0.07); this.tone(1319, 0.12, 'square', 0.07, 0, 0.06); },
  jar() { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.08, 'square', 0.07, 0, i * 0.05)); },
  life() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.14, 0, i * 0.06)); },
  deliver(perfect) {
    const n = perfect ? [523, 659, 784, 1047, 1319] : [523, 659, 784, 1047];
    n.forEach((f, i) => this.tone(f, 0.12, 'square', 0.08, 0, i * 0.055));
    this.tone(perfect ? 2093 : 1568, 0.25, 'triangle', 0.08, 0, n.length * 0.055);
  },
  throwIt() { this.tone(600, 0.15, 'triangle', 0.08, 500); },
  nope() { this.tone(160, 0.1, 'square', 0.07); },
  hit() { this.noise(0.25, 0.3, 900); this.tone(160, 0.3, 'sawtooth', 0.12, -100); },
  honk() { this.tone(330, 0.16, 'sawtooth', 0.09, -60); this.tone(310, 0.2, 'sawtooth', 0.09, -60, 0.2); },
  splash() { this.noise(0.5, 0.3, 2000); this.tone(400, 0.3, 'sine', 0.1, -300); },
  thud() { this.tone(110, 0.15, 'triangle', 0.25, -50); this.noise(0.12, 0.15, 500); },
  whistle() { this.tone(1400, 0.6, 'sine', 0.04, -900); },
  miss() { [392, 330, 262].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.13, 0, i * 0.12)); },
  phase() { [659, 784, 988, 1319].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.1, 0, i * 0.09)); },
  boom() { this.noise(0.6, 0.12, 700); },
  pop() { this.noise(0.05, 0.05, 4000); },
  tick() { this.tone(880, 0.08, 'square', 0.07); },
  go() { this.tone(1320, 0.3, 'square', 0.08); },
  win() { [523, 659, 784, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.16, 'square', 0.08, 0, i * 0.11)); },
  crash() { this.noise(0.6, 0.35, 700); [330, 262, 196, 131].forEach((f, i) => this.tone(f, 0.2, 'sawtooth', 0.08, -20, 0.1 + i * 0.13)); },
  // Muzik latar: gelung pentatonik ceria (gubahan asal)
  startMusic() {
    if (!this.ctx || this.musicOn) return; this.musicOn = true; this.step = 0; this.nextT = this.ctx.currentTime + 0.05;
    this.timer = setInterval(() => this.schedule(), 30);
  },
  stopMusic() { this.musicOn = false; clearInterval(this.timer); },
  schedule() {
    const MEL = ['E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C5', 'D5', 'E5', '-', 'G5', 'E5', 'D5', 'C5', 'A4', '-',
      'C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'A5', 'G5', 'E5', 'D5', 'C5', 'D5', 'C5', '-', '-', '-',
      'A4', 'C5', 'D5', 'E5', 'D5', 'C5', 'A4', 'G4', 'A4', '-', 'C5', 'D5', 'E5', '-', 'G5', '-',
      'A5', 'G5', 'E5', 'D5', 'E5', 'G5', 'E5', 'D5', 'C5', 'D5', 'E5', 'D5', 'C5', '-', '-', '-'];
    const BASS = ['C3', 'G3', 'A2', 'E3', 'F2', 'C3', 'G2', 'D3'];
    const dt = 60 / 132 / 2;
    while (this.nextT < this.ctx.currentTime + 0.12) {
      const s = this.step % MEL.length, t = this.nextT - this.ctx.currentTime;
      const n = MEL[s]; if (n !== '-') this.tone(noteF(n), dt * 0.9, 'square', 0.05, 0, t, this.musicGain);
      if (s % 4 === 0) this.tone(noteF(BASS[(s / 4 | 0) % BASS.length]), dt * 1.8, 'triangle', 0.16, 0, t, this.musicGain);
      if (s % 2 === 1) this.noiseAt(t, 0.03);
      this.step++; this.nextT += dt;
    }
  },
  noiseAt(delay, vol) { this.noise(0.04, vol, 6000, delay); },
};
function noteF(n) { const m = n.match(/([A-G])(#?)(\d)/); const idx = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0); return 440 * Math.pow(2, (idx + (+m[3] + 1) * 12 - 69) / 12); }
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
  let x = 380;
  const kets = new Set([10, 18, 25]);
  for (let i = 0; i < TOTAL; i++) {
    const ph = phaseOfIdx(i), sp = speedAtIdx(i);
    const spacing = Math.round(lerp(330, 420, i / (TOTAL - 1))) + ri(-15, 15);
    const hx = x + spacing;
    if (!decorOnly) fillHazards(L, x + 20, hx - 30, i, ph, sp);
    else if (rand() < 0.4) L.crossings.push({ x: x + 120, len: 60, broken: false });
    if (!decorOnly && kets.has(i)) L.items.push({ type: 'ketupat', x: hx - 40, y: GY - 46, taken: false });
    const house = { x: hx, w: 78, idx: i + 1, name: names[i], state: decorOnly ? 'deco' : 'pending', v: ri(0, 3), zone: [hx + 8, hx + 70], thanks: 0 };
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
  const minGap = sp * 0.95 + 26;
  let cur = a + rr(10, 40);
  const weights = [
    { lubang: 3, batu: 3, bridge: 1.2, kuih: 2 },
    { lubang: 2, batu: 2, tahi: 2.5, angsa: 1.6, kelapa: 1.8, bridge: 0.6, kuih: 1.5, broken: 0.4 },
    { lubang: 2, batu: 2, tahi: 2, angsa: 1.5, kelapa: 1.5, broken: 2, kuih: 1.2 },
    { lubang: 2, batu: 2.2, tahi: 2, angsa: 1.6, kelapa: 1.2, broken: 2.2, kuih: 1 },
  ][ph];
  const count = [1, 2, 2, 3][ph];
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

function resize() {
  const fit = document.getElementById('fit'), fr = document.getElementById('frame');
  const r = fit.getBoundingClientRect();
  const scale = Math.max(0.5, Math.min(r.width / W, r.height / H));
  const cw = Math.floor(W * scale), ch = Math.floor(H * scale);
  fr.style.width = cw + 'px'; fr.style.height = ch + 'px';
  fr.style.setProperty('--px', scale + 'px');
  const dpr = window.devicePixelRatio || 1;
  SC = clamp(Math.ceil(scale * dpr), 1, 5);
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
// Lukisan
// ============================================================
function drawSky(c, t) {
  const sk = skyAt(t);
  const g = c.createLinearGradient(0, 0, 0, 210);
  g.addColorStop(0, rgbStr(sk.c[0])); g.addColorStop(0.55, rgbStr(sk.c[1])); g.addColorStop(1, rgbStr(sk.c[2]));
  c.fillStyle = g; c.fillRect(0, 0, W, 215);
  // bintang
  const night = clamp((t - 0.7) / 0.1, 0, 1);
  if (night > 0) {
    for (const s of STARS) {
      const a = night * (0.5 + 0.5 * Math.sin(G.anim * 2 + s.p));
      c.fillStyle = `rgba(255,248,220,${a})`; c.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
    }
  }
  // matahari
  if (t < 0.74 && G.state !== 'menu') {
    const k = clamp(t / 0.72, 0, 1);
    const sx = lerp(168, 112, k), sy = lerp(46, 196, k * k);
    const col = mixRgb([255, 236, 120], [255, 110, 60], clamp((t - 0.25) / 0.45, 0, 1));
    const r = lerp(10, 15, k);
    c.fillStyle = rgbStr(col, 0.25); pixCircle(c, Math.round(sx), Math.round(sy), Math.round(r + 5));
    c.fillStyle = rgbStr(col, 1); pixCircle(c, Math.round(sx), Math.round(sy), Math.round(r));
  }
  // bulan sabit
  if (night > 0) { c.globalAlpha = night; c.drawImage(S.moon, 158, Math.round(lerp(70, 44, night))); c.globalAlpha = 1; }
}

function drawClouds(c, t) {
  for (const cl of CLOUDS) {
    const span = W + 90;
    let x = (cl.x - G.cam * 0.04 - G.anim * cl.v) % span; if (x < -45) x += span;
    c.drawImage(S.cloud[cl.s], Math.round(x), cl.y);
  }
}

function drawFarLayers(c, t) {
  const cam = G.cam;
  // gunung jauh
  let o = Math.floor(cam * 0.05);
  c.fillStyle = '#8db7d9';
  for (let x = 0; x < W; x++) { const h = MT_FAR[(x + o) & 511]; c.fillRect(x, 202 - h, 1, h); }
  c.fillStyle = '#b1d0ea';
  for (let x = 0; x < W; x++) { const h = MT_FAR[(x + o) & 511]; c.fillRect(x, 202 - h, 1, 1); }
  // bukit dekat
  o = Math.floor(cam * 0.12);
  c.fillStyle = '#5d9e5e';
  for (let x = 0; x < W; x++) { const h = MT_NEAR[(x + o) & 511]; c.fillRect(x, 203 - h, 1, h); }
  c.fillStyle = '#79ba6e';
  for (let x = 0; x < W; x++) { const h = MT_NEAR[(x + o) & 511]; c.fillRect(x, 203 - h, 1, 1); }
  // kampung jauh
  o = cam * 0.28;
  for (const it of FAR_ITEMS) {
    let x = Math.round(it.x - (o % 640)); if (x < -30) x += 640; if (x > W) continue;
    if (it.t === 'house') c.drawImage(S.houseFar, x, 180);
    else c.drawImage(S.palmFar, x, 165, 24, 45);
  }
  // kabus jarak
  const sk = skyAt(t);
  c.fillStyle = rgbStr(sk.c[2], 0.28); c.fillRect(0, 150, W, 55);
}

function paddyColors(t) {
  const gold = clamp((t - 0.2) / 0.12, 0, 1) * (1 - clamp((t - 0.55) / 0.1, 0, 0.4));
  return [mixRgb([143, 207, 78], [226, 192, 80], gold), mixRgb([94, 163, 59], [196, 158, 54], gold), mixRgb([180, 232, 110], [247, 222, 120], gold)];
}
function drawSawah(c, t) {
  const [base, dark, light] = paddyColors(t);
  const rows = [5, 5, 6, 7, 8, 9, 10, 10];
  let y = 200;
  c.fillStyle = rgbStr(dark); c.fillRect(0, 199, W, 1);
  for (let j = 0; j < rows.length; j++) {
    const h = rows[j], f = 0.32 + j * 0.085, off = G.cam * f, sp = 4 + j;
    c.fillStyle = rgbStr(j % 2 ? base : mixRgb(base, dark, 0.35)); c.fillRect(0, y, W, h);
    c.fillStyle = rgbStr(dark);
    for (let x = -(off % sp); x < W; x += sp) c.fillRect(Math.round(x), y + 1, 1, h - 1);
    c.fillStyle = rgbStr(light);
    for (let x = -(off % sp) + 2; x < W; x += sp * 2) c.fillRect(Math.round(x), y, 1, 2);
    // air sawah berkilau
    if (j === 2 || j === 5) { c.fillStyle = 'rgba(190,235,255,0.35)'; for (let x = -((off * 1.0) % 37); x < W; x += 37) c.fillRect(Math.round(x), y + h - 2, 9, 1); }
    // lembu/kerbau di sawah
    if (j === 3) {
      const period = 900; let cx = 300 - (off % period); if (cx < -30) cx += period;
      if (cx < W) c.drawImage(S.cow, Math.round(cx), y - 9);
    }
    y += h;
  }
}

function drawVerge(c) {
  c.fillStyle = PAL.grassS; c.fillRect(0, VERGE_TOP - 1, W, 1);
  c.fillStyle = PAL.grass; c.fillRect(0, VERGE_TOP, W, ROAD_TOP - VERGE_TOP);
  c.fillStyle = PAL.grassH;
  const o = G.cam % 9;
  for (let x = -o; x < W; x += 9) { c.fillRect(Math.round(x), VERGE_TOP + 3, 1, 2); c.fillRect(Math.round(x + 4), VERGE_TOP + 7, 1, 2); }
}

function drawRoad(c) {
  c.fillStyle = PAL.dirt; c.fillRect(0, ROAD_TOP, W, 2);
  c.fillStyle = PAL.road; c.fillRect(0, ROAD_TOP + 2, W, ROAD_BOT - ROAD_TOP - 4);
  c.fillStyle = PAL.roadH; c.fillRect(0, ROAD_TOP + 2, W, 1);
  c.fillStyle = PAL.dirtS; c.fillRect(0, ROAD_BOT - 2, W, 2);
  // garis tengah putus-putus
  c.fillStyle = PAL.roadLine;
  for (let x = -(G.cam % 28); x < W; x += 28) c.fillRect(Math.round(x), 276, 12, 1);
  // tampalan & rekahan
  const t0 = Math.floor(G.cam / 40);
  for (let k = t0; k < t0 + 8; k++) {
    const h = hash(k * 17);
    if (h > 0.3) { const x = Math.round(k * 40 - G.cam + (h * 20)); c.fillStyle = PAL.roadS; c.fillRect(x, 286 + Math.round(h * 3), 6, 1); c.fillRect(x + 2, 287 + Math.round(h * 3), 3, 1); }
  }
}

function drawCrossing(c, cr) {
  const sx = Math.round(cr.x - G.cam), len = cr.len;
  if (sx > W + 10 || sx + len < -10) return;
  // air parit melintang
  c.fillStyle = PAL.waterS; c.fillRect(sx, VERGE_TOP - 1, len, CANAL_TOP - VERGE_TOP + 2);
  c.fillStyle = PAL.water; c.fillRect(sx + 2, VERGE_TOP, len - 4, CANAL_TOP - VERGE_TOP);
  c.fillStyle = PAL.waterH;
  for (let y = VERGE_TOP + 3; y < CANAL_TOP; y += 6) { const ox = Math.round((G.anim * 8 + y * 3) % 14); c.fillRect(sx + 3 + ox, y, 5, 1); if (len > 40) c.fillRect(sx + 25 + ox, y + 3, 4, 1); }
  c.fillStyle = PAL.dirtS; c.fillRect(sx - 2, VERGE_TOP - 1, 2, CANAL_TOP - VERGE_TOP + 2); c.fillRect(sx + len, VERGE_TOP - 1, 2, CANAL_TOP - VERGE_TOP + 2);
  // jambatan kayu
  const deck = (x0, x1) => {
    if (x1 <= x0) return;
    c.fillStyle = PAL.woodS; c.fillRect(x0, GY, x1 - x0, 6);
    c.fillStyle = PAL.wood; c.fillRect(x0, GY, x1 - x0, 4);
    c.fillStyle = PAL.woodH; c.fillRect(x0, GY, x1 - x0, 1);
    c.fillStyle = PAL.woodS; for (let x = x0 + 3; x < x1; x += 4) c.fillRect(x, GY + 1, 1, 3);
    // pagar belakang
    for (let x = x0 + 2; x < x1 - 1; x += 10) { c.fillStyle = PAL.woodS; c.fillRect(x, GY - 11, 2, 11); }
    c.fillStyle = PAL.wood; c.fillRect(x0, GY - 11, x1 - x0, 2); c.fillStyle = PAL.woodH; c.fillRect(x0, GY - 11, x1 - x0, 1);
  };
  const posts = (x) => { c.fillStyle = PAL.woodS; c.fillRect(x, GY + 6, 3, 16); c.fillStyle = PAL.waterH; c.fillRect(x - 1, GY + 16, 5, 1); };
  if (!cr.broken) { deck(sx - 3, sx + len + 3); posts(sx + 4); posts(sx + len - 7); posts(sx + (len >> 1) - 1); }
  else {
    const g0 = Math.round(cr.gap[0] - G.cam), g1 = Math.round(cr.gap[1] - G.cam);
    deck(sx - 3, g0); deck(g1, sx + len + 3);
    // hujung papan patah
    c.fillStyle = PAL.wood; c.fillRect(g0, GY + 1, 2, 2); c.fillRect(g0 + 2, GY + 3, 2, 2); c.fillRect(g1 - 2, GY + 2, 2, 2); c.fillRect(g1 - 4, GY + 4, 2, 1);
    posts(sx + 4); posts(sx + len - 7);
    // papan terapung
    c.fillStyle = PAL.wood; c.fillRect(g0 + 6 + Math.round(Math.sin(G.anim * 2) * 2), CANAL_TOP - 8, 8, 2);
  }
}

function drawFrontCanal(c) {
  c.fillStyle = PAL.grassS; c.fillRect(0, ROAD_BOT, W, CANAL_TOP - ROAD_BOT);
  c.fillStyle = PAL.grass; c.fillRect(0, ROAD_BOT, W, 2);
  c.fillStyle = PAL.waterS; c.fillRect(0, CANAL_TOP, W, CANAL_BOT - CANAL_TOP);
  c.fillStyle = PAL.water; c.fillRect(0, CANAL_TOP + 2, W, CANAL_BOT - CANAL_TOP - 4);
  c.fillStyle = PAL.waterH;
  const o = (G.cam * 1.05 + G.anim * 6) % 40;
  for (let x = -o; x < W; x += 40) { c.fillRect(Math.round(x), CANAL_TOP + 6, 8, 1); c.fillRect(Math.round(x + 18), CANAL_TOP + 13, 6, 1); c.fillRect(Math.round(x + 30), CANAL_TOP + 18, 5, 1); }
  // tebing hadapan & rumput
  c.fillStyle = PAL.grass; c.fillRect(0, CANAL_BOT, W, H - CANAL_BOT);
  c.fillStyle = PAL.grassS; c.fillRect(0, CANAL_BOT, W, 2);
  const o2 = (G.cam * 1.15) % 23;
  for (let x = -o2; x < W; x += 23) {
    c.fillStyle = PAL.grassH; c.fillRect(Math.round(x), CANAL_BOT + 8, 1, 3); c.fillRect(Math.round(x + 2), CANAL_BOT + 7, 1, 4);
    c.fillStyle = PAL.grassD; c.fillRect(Math.round(x + 11), CANAL_BOT + 20, 1, 3); c.fillRect(Math.round(x + 13), CANAL_BOT + 21, 1, 2);
  }
  const o3 = (G.cam * 1.15) % 61;
  for (let x = -o3; x < W; x += 61) { c.fillStyle = '#ffe066'; c.fillRect(Math.round(x + 30), CANAL_BOT + 14, 2, 2); c.fillStyle = '#ff8fb0'; c.fillRect(Math.round(x + 7), CANAL_BOT + 34, 2, 2); }
}

function drawDecor(c) {
  const L = G.level; if (!L) return;
  const dark = skyAt(G.tod).dark;
  for (const d of L.decor) {
    const sx = Math.round(d.x - G.cam);
    if (sx > W + 10) break; if (sx < -60) continue;
    if (d.type === 'palm') c.drawImage(S.palm, sx - 6, ROAD_TOP - 88);
    else if (d.type === 'banana') c.drawImage(S.banana, sx, ROAD_TOP - 45);
    else if (d.type === 'bush') c.drawImage(S.bush, sx, ROAD_TOP - 14);
    else if (d.type === 'pagar') {
      c.fillStyle = PAL.ink; c.fillRect(sx - 1, ROAD_TOP - 13, 42, 1);
      for (let x = 0; x < 40; x += 6) { c.fillStyle = PAL.ink; c.fillRect(sx + x - 1, ROAD_TOP - 13, 4, 13); c.fillStyle = '#e8dcc0'; c.fillRect(sx + x, ROAD_TOP - 12, 2, 12); }
      c.fillStyle = '#e8dcc0'; c.fillRect(sx, ROAD_TOP - 9, 40, 2);
    } else if (d.type === 'pelita' && G.tod > 0.5) {
      c.drawImage(S.pelita, sx, ROAD_TOP - 22);
      const fl = Math.sin(G.anim * 18 + d.x) > 0 ? 1 : 0;
      c.fillStyle = PAL.flameO; c.fillRect(sx + 2, ROAD_TOP - 26 - fl, 4, 4 + fl);
      c.fillStyle = PAL.flame; c.fillRect(sx + 3, ROAD_TOP - 25 - fl, 2, 3);
      if (dark > 0.02) G.lights.push({ x: sx + 4, y: ROAD_TOP - 24, r: 26, i: 0.95 });
    }
  }
  for (const s of L.signs) {
    const sx = Math.round(s.x - G.cam); if (sx < -30 || sx > W + 10) continue;
    c.drawImage(S.awas, sx, ROAD_TOP - 35);
    text(c, 'AWAS', sx + 11.5, ROAD_TOP - 30, { size: 4, color: PAL.ink, outline: null });
    text(c, 'PATAH', sx + 11.5, ROAD_TOP - 25, { size: 3, color: '#b0261e', outline: null });
  }
}

function drawHouses(c) {
  const L = G.level; if (!L) return;
  const dark = skyAt(G.tod).dark;
  for (const h of L.houses) {
    const sx = Math.round(h.x - G.cam);
    if (sx > W + 30) break; if (sx < -100) continue;
    c.drawImage(S.house[h.v], sx - 2, ROAD_TOP - 70);
    // tingkap & pintu menyala waktu malam
    if (dark > 0.05 || h.state === 'done') {
      const glowA = h.state === 'done' ? 0.95 : clamp(dark * 1.4, 0, 0.9);
      c.fillStyle = `rgba(255,214,110,${glowA})`;
      for (const wx of [13, 58]) { c.fillRect(sx + wx, ROAD_TOP - 68 + 37, 4, 4); c.fillRect(sx + wx + 5, ROAD_TOP - 68 + 37, 4, 4); c.fillRect(sx + wx, ROAD_TOP - 68 + 42, 4, 3); c.fillRect(sx + wx + 5, ROAD_TOP - 68 + 42, 4, 3); }
      if (dark > 0.05) { G.lights.push({ x: sx + 18, y: ROAD_TOP - 28, r: 20, i: glowA }); G.lights.push({ x: sx + 63, y: ROAD_TOP - 28, r: 20, i: glowA }); }
    }
    // lampu lip-lap raya (malam)
    if (G.tod > 0.7) {
      for (let k = 0; k < 13; k++) {
        const lx = sx + 2 + k * 6, ly = ROAD_TOP - 40 + (k % 2);
        const on = (Math.floor(G.anim * 3) + k) % 3;
        c.fillStyle = ['#ff5a6a', '#ffd447', '#5ae0ff'][on]; c.fillRect(lx, ly, 2, 2);
      }
    }
    // papan nombor rumah
    if (h.state !== 'deco') {
      const px = sx - 14;
      c.drawImage(S.sign, px, ROAD_TOP - 35);
      text(c, String(h.idx), px + 11.5, ROAD_TOP - 28.5, { size: 6, color: '#fff', outline: null });
    }
  }
}

function drawZones(c) {
  const L = G.level; if (!L || G.state === 'menu') return;
  for (const h of L.houses) {
    if (h.state !== 'pending') continue;
    const x0 = Math.round(h.zone[0] - G.cam), x1 = Math.round(h.zone[1] - G.cam);
    if (x0 > W || x1 < 0) continue;
    const pulse = 0.55 + 0.45 * Math.sin(G.anim * 8);
    c.fillStyle = `rgba(255,212,71,${0.16 + pulse * 0.1})`; c.fillRect(x0, ROAD_TOP + 3, x1 - x0, ROAD_BOT - ROAD_TOP - 6);
    const m0 = Math.round(lerp(x0, x1, 0.32)), m1 = Math.round(lerp(x0, x1, 0.68));
    c.fillStyle = `rgba(255,236,140,${0.22 + pulse * 0.12})`; c.fillRect(m0, ROAD_TOP + 3, m1 - m0, ROAD_BOT - ROAD_TOP - 6);
    c.fillStyle = `rgba(255,212,71,${0.7 + pulse * 0.3})`;
    for (let x = x0; x < x1; x += 6) { c.fillRect(x, ROAD_TOP + 3, 3, 1); c.fillRect(x, ROAD_BOT - 4, 3, 1); }
    c.fillRect(x0, ROAD_TOP + 3, 1, ROAD_BOT - ROAD_TOP - 6); c.fillRect(x1 - 1, ROAD_TOP + 3, 1, ROAD_BOT - ROAD_TOP - 6);
  }
}

function drawObstacles(c) {
  const L = G.level; if (!L || G.state === 'menu') return;
  for (const o of L.obs) {
    const sx = Math.round(o.x - G.cam);
    if (sx > W + 20) break; if (sx < -30) continue;
    if (o.type === 'lubang') {
      const w = o.w;
      c.fillStyle = '#3d3a48'; c.fillRect(sx + 3, GY - 3, w - 6, 1); c.fillRect(sx + 1, GY - 2, w - 2, 3); c.fillRect(sx + 3, GY + 1, w - 6, 1);
      c.fillStyle = '#17141f'; c.fillRect(sx + 4, GY - 2, w - 8, 3); c.fillRect(sx + 2, GY - 1, w - 4, 1);
      c.fillStyle = PAL.roadH; c.fillRect(sx + 3, GY + 2, w - 6, 1);
      c.fillStyle = '#3d3a48'; c.fillRect(sx - 2, GY - 4, 3, 1); c.fillRect(sx + w - 1, GY + 1, 3, 1);
    } else if (o.type === 'batu') c.drawImage(S.rock, sx - 1, GY - 12);
    else if (o.type === 'tahi') {
      c.drawImage(S.dung, sx, GY - 8);
      c.fillStyle = PAL.ink;
      for (let k = 0; k < 2; k++) { const a = G.anim * (7 + k * 3) + k * 2; c.fillRect(Math.round(sx + 7 + Math.cos(a) * 6), Math.round(GY - 13 + Math.sin(a * 1.3) * 3), 1, 1); }
    } else if (o.type === 'kelapa') {
      if (o.state === 'wait' || o.state === 'fall') {
        if (Math.floor(G.anim * 6) % 2 === 0) c.drawImage(S.warn, sx - 2, GY - 16);
        const k = o.state === 'fall' ? clamp((o.fy + 14) / (GY + 4), 0, 1) : 0;
        c.fillStyle = `rgba(20,10,30,${0.15 + k * 0.3})`; c.fillRect(sx + 5 - Math.round(k * 4), GY - 1, 2 + Math.round(k * 8), 2);
        if (o.state === 'fall') c.drawImage(S.coconut, sx, Math.round(o.fy) - 6);
      } else c.drawImage(S.coconut, sx, GY - 11);
    }
  }
}

function drawItems(c) {
  const L = G.level; if (!L || G.state === 'menu') return;
  for (const it of L.items) {
    if (it.taken) continue;
    const sx = Math.round(it.x - G.cam); if (sx > W + 20) break; if (sx < -20) continue;
    const by = Math.round(it.y + Math.sin(G.anim * 4 + it.x * 0.1) * 1.5);
    let spr = it.type === 'jar' ? S.jar : it.type === 'ketupat' ? S.ketupat : S.kuih[it.k];
    c.drawImage(spr, sx - (spr.width >> 1), by - (spr.height >> 1));
    if ((it.type !== 'kuih' || (Math.floor(G.anim * 2 + it.x) % 5 === 0)) && Math.sin(G.anim * 6 + it.x) > 0.7) {
      c.fillStyle = '#fff'; c.fillRect(sx + 3, by - 6, 1, 3); c.fillRect(sx + 2, by - 5, 3, 1);
    }
  }
}

function drawGooseEnt(c) {
  const gs = G.goose; if (!gs || gs.warn > 0) return;
  const f = Math.floor(G.anim * 10) % 2;
  const y = gs.hitT > 0 ? GY - 25 - Math.round(gs.hitT * 40) : GY - 25;
  c.drawImage(S.goose[f], Math.round(gs.x), y);
  c.fillStyle = 'rgba(20,10,30,0.25)'; c.fillRect(Math.round(gs.x) + 5, GY - 1, 16, 2);
}

function drawPlayer(c, scale = 1, cx = null) {
  const p = G.player;
  if (p.splashT > 0) return;
  if (p.inv > 0 && G.state === 'play' && Math.floor(p.inv * 14) % 2 === 0) return;
  const f = Math.floor(p.wheelT) % 2;
  const spr = S.vespa[f];
  const vib = p.grounded && G.state !== 'done' ? (Math.floor(G.anim * 12) % 2) : 0;
  const x = cx == null ? PX : cx;
  // bayang
  const hgt = clamp((GY - p.y) / 70, 0, 1);
  if (!p.falling) { c.fillStyle = `rgba(20,10,30,${0.28 - hgt * 0.15})`; const sw = Math.round((34 - hgt * 12) * scale); c.fillRect(Math.round(x + (40 * scale - sw) / 2), GY - 1, sw, 2); }
  c.save();
  const ang = p.grounded ? 0 : clamp(p.vy * 0.00045, -0.16, 0.16);
  const pivX = x + 11 * scale, pivY = Math.round(p.y);
  c.translate(pivX, pivY - vib); c.rotate(ang);
  c.drawImage(spr, -11 * scale, -37 * scale, spr.width * scale, spr.height * scale);
  c.restore();
  // lampu
  if (skyAt(G.tod).dark > 0.05) G.lights.push({ x: x + 39 * scale, y: Math.round(p.y) - 26 * scale, r: 30, i: 1, cone: true });
}

function drawPackages(c) {
  for (const pk of G.packages) {
    const k = clamp(pk.t / pk.dur, 0, 1);
    const tx = pk.tx - G.cam;
    const x = lerp(pk.sx, tx, k), y = lerp(pk.sy, pk.ty, k) - Math.sin(k * Math.PI) * 42;
    c.save(); c.translate(Math.round(x), Math.round(y)); c.rotate(k * 7); c.drawImage(S.gift, -5, -5); c.restore();
  }
}

function drawParticles(c, list) {
  for (const p of list) {
    const a = clamp(p.life / p.max, 0, 1);
    c.globalAlpha = p.fade === false ? 1 : a;
    c.fillStyle = p.color;
    const s = p.size || 1;
    c.fillRect(Math.round(p.x), Math.round(p.y), s, s);
  }
  c.globalAlpha = 1;
}

function text(c, str, x, y, o = {}) {
  const size = o.size || 8;
  c.font = `${size}px ${o.font || FONT_PIX}`; c.textAlign = o.align || 'center'; c.textBaseline = 'middle';
  if (o.outline !== null) { c.lineWidth = o.ow || Math.max(2, size * 0.32); c.strokeStyle = o.outline || PAL.ink; c.lineJoin = 'round'; c.strokeText(str, x, y); }
  c.fillStyle = o.color || '#fff'; c.fillText(str, x, y);
}

function drawMarkers(c) {
  const L = G.level; if (!L || G.state === 'menu') return;
  for (const h of L.houses) {
    const sx = Math.round(h.x - G.cam);
    if (sx > W + 30 || sx < -100) continue;
    const cx = sx + 38;
    if (h.state === 'pending') {
      const by = 166 + Math.round(Math.sin(G.anim * 5) * 2);
      // label nama
      c.font = `7px ${FONT_BODY}`; const tw = Math.ceil(c.measureText(h.name).width) + 10;
      const lx = clamp(cx, (tw >> 1) + 3, W - (tw >> 1) - 3);
      c.fillStyle = PAL.ink; c.fillRect(lx - (tw >> 1) - 1, by - 13, tw + 2, 11);
      c.fillStyle = '#fff6dc'; c.fillRect(lx - (tw >> 1), by - 12, tw, 9);
      text(c, h.name, lx, by - 7.5, { size: 7, font: FONT_BODY, color: PAL.ink, outline: null });
      // hadiah & anak panah
      c.drawImage(S.gift, cx - 5, by + 1);
      c.fillStyle = PAL.ink; c.fillRect(cx - 4, by + 12, 9, 1); c.fillRect(cx - 3, by + 13, 7, 1); c.fillRect(cx - 2, by + 14, 5, 1); c.fillRect(cx - 1, by + 15, 3, 1);
      c.fillStyle = '#ffd447'; c.fillRect(cx - 3, by + 12, 7, 1); c.fillRect(cx - 2, by + 13, 5, 1); c.fillRect(cx - 1, by + 14, 3, 1);
    } else if (h.state === 'done' && h.thanks > 0) {
      const a = clamp(h.thanks, 0, 1), by = 172 - Math.round((1.6 - h.thanks) * 6);
      c.globalAlpha = a;
      c.fillStyle = PAL.ink; c.fillRect(cx - 34, by - 9, 68, 18);
      c.fillStyle = '#fff'; c.fillRect(cx - 33, by - 8, 66, 16); c.fillRect(cx - 3, by + 8, 5, 3);
      c.fillStyle = PAL.ink; c.fillRect(cx - 4, by + 9, 1, 2); c.fillRect(cx + 2, by + 9, 1, 2); c.fillRect(cx - 3, by + 11, 5, 1);
      text(c, 'Terima kasih!', cx, by - 2.5, { size: 7, font: FONT_BODY, color: PAL.ink, outline: null });
      text(c, h.name, cx, by + 4.5, { size: 5.5, font: FONT_BODY, color: '#7a3b1d', outline: null });
      c.globalAlpha = 1;
    } else if (h.state === 'missed' && h.thanks > 0) {
      c.globalAlpha = clamp(h.thanks, 0, 1);
      text(c, '?', cx, 172, { size: 12, color: '#ff6b6b' });
      c.globalAlpha = 1;
    }
  }
}

function drawLighting(t) {
  const sk = skyAt(t);
  const w = wctx;
  w.globalCompositeOperation = 'source-atop';
  if (sk.tint[3] > 0.005) { w.fillStyle = rgbStr(sk.tint, sk.tint[3]); w.fillRect(0, 0, W, H); }
  let dark = sk.dark;
  const fwFlash = G.fireworks.reduce((m, f) => Math.max(m, f.flash || 0), 0);
  dark *= 1 - fwFlash * 0.35;
  if (dark > 0.01) {
    const d = dctx;
    d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W, H);
    d.fillStyle = `rgba(4,8,32,${dark})`; d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'destination-out';
    for (const l of G.lights) {
      if (l.cone) {
        d.save(); d.beginPath(); d.moveTo(l.x - 2, l.y - 2); d.lineTo(l.x + 150, l.y - 46); d.lineTo(l.x + 150, l.y + 44); d.lineTo(l.x - 2, l.y + 3); d.closePath(); d.clip();
        const g = d.createRadialGradient(l.x, l.y, 2, l.x, l.y, 150); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        d.fillStyle = g; d.fillRect(l.x - 4, l.y - 50, 160, 100); d.restore();
        const g2 = d.createRadialGradient(l.x - 20, l.y + 8, 2, l.x - 20, l.y + 8, 34); g2.addColorStop(0, 'rgba(0,0,0,0.7)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
        d.fillStyle = g2; d.fillRect(l.x - 60, l.y - 30, 80, 80);
      } else {
        const g = d.createRadialGradient(l.x, l.y, 1, l.x, l.y, l.r); g.addColorStop(0, `rgba(0,0,0,${l.i})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        d.fillStyle = g; d.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
      }
    }
    w.imageSmoothingEnabled = true; w.drawImage(darkCv, 0, 0, W, H); w.imageSmoothingEnabled = false;
  }
  w.globalCompositeOperation = 'source-over';
  return dark;
}

function drawGlows(c, dark) {
  if (dark < 0.05) return;
  c.globalCompositeOperation = 'lighter';
  for (const l of G.lights) {
    if (l.cone) {
      c.save(); c.beginPath(); c.moveTo(l.x - 1, l.y - 1); c.lineTo(l.x + 140, l.y - 40); c.lineTo(l.x + 140, l.y + 38); c.lineTo(l.x - 1, l.y + 2); c.closePath(); c.clip();
      const g = c.createRadialGradient(l.x, l.y, 1, l.x, l.y, 140); g.addColorStop(0, `rgba(255,236,150,${0.32 * dark})`); g.addColorStop(1, 'rgba(255,236,150,0)');
      c.fillStyle = g; c.fillRect(l.x, l.y - 42, 142, 84); c.restore();
    } else {
      const g = c.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.6); g.addColorStop(0, `rgba(255,170,60,${0.28 * dark * l.i})`); g.addColorStop(1, 'rgba(255,170,60,0)');
      c.fillStyle = g; c.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
  }
  c.globalCompositeOperation = 'source-over';
}

function drawFireworks(c) {
  if (!G.fireworks.length) return;
  c.globalCompositeOperation = 'lighter';
  for (const f of G.fireworks) {
    if (f.stage === 'rise') { c.fillStyle = '#ffe9a0'; c.fillRect(Math.round(f.x), Math.round(f.y), 1, 3); }
    if (f.flash > 0) { const g = c.createRadialGradient(f.x, f.ty, 0, f.x, f.ty, 40); g.addColorStop(0, `rgba(255,240,200,${0.35 * f.flash})`); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.fillRect(f.x - 40, f.ty - 40, 80, 80); }
    for (const p of f.parts) {
      const a = clamp(p.life / p.max, 0, 1); c.fillStyle = p.color;
      c.globalAlpha = a * 0.35; c.fillRect(Math.round(p.x - p.vx * 0.05), Math.round(p.y - p.vy * 0.05), 1, 1);
      c.globalAlpha = a; c.fillRect(Math.round(p.x), Math.round(p.y), p.size || 1, p.size || 1);
    }
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}

function drawUIfx(c) {
  // popup teks
  for (const p of G.popups) {
    const a = clamp(p.life / 0.35, 0, 1);
    c.globalAlpha = a; text(c, p.text, Math.round(p.x), Math.round(p.y), { size: p.size || 7, color: p.color || '#fff' }); c.globalAlpha = 1;
  }
  // amaran angsa
  const gs = G.goose;
  if (gs && gs.warn > 0 && Math.floor(gs.warn * 8) % 2 === 0) {
    c.fillStyle = PAL.ink; pixCircle(c, 9, GY - 30, 7); c.fillStyle = '#e33a3a'; pixCircle(c, 9, GY - 30, 6);
    text(c, '!', 9.5, GY - 29.5, { size: 8, color: '#fff', outline: null });
    text(c, 'HONK!', 34, GY - 42, { size: 5, color: '#ffd447' });
  }
  // sepanduk fasa
  if (G.banner) {
    const b = G.banner, t = b.t;
    const inX = t < 0.35 ? lerp(W, 0, easeOut(t / 0.35)) : t > b.dur - 0.35 ? lerp(0, -W, easeIn((t - (b.dur - 0.35)) / 0.35)) : 0;
    const y = 120;
    c.fillStyle = 'rgba(16,22,64,0.85)'; c.fillRect(Math.round(inX), y - 16, W, 32);
    c.fillStyle = '#ffd447'; c.fillRect(Math.round(inX), y - 16, W, 2); c.fillRect(Math.round(inX), y + 14, W, 2);
    text(c, b.title, Math.round(inX + W / 2), y - 4, { size: 12, color: '#ffd447' });
    text(c, b.sub, Math.round(inX + W / 2), y + 8, { size: 7, font: FONT_BODY, color: '#fff6dc', outline: null });
  }
  // kiraan mula
  if (G.state === 'play' && G.countdown > 0) {
    const n = Math.ceil(G.countdown / 0.6);
    const label = n > 3 ? '' : n >= 1 ? String(n) : '';
    if (label) text(c, label, W / 2, 150, { size: 26, color: '#ffd447', ow: 6 });
  }
  if (G.state === 'play' && G.goTimer > 0) text(c, 'JOM!', W / 2, 150, { size: 22, color: '#5fd06f', ow: 6 });
  // combo
  if (G.state === 'play' && G.combo >= 3) {
    const mult = comboMult();
    text(c, `COMBO x${mult}`, W - 8, 62, { size: 6, color: '#ffd447', align: 'right' });
  }
  // kilat merah bila cedera
  if (G.flash > 0) { c.fillStyle = `rgba(255,60,60,${G.flash * 0.9})`; c.fillRect(0, 0, W, H); }
}
const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeIn = (t) => Math.pow(clamp(t, 0, 1), 3);

function render() {
  ctx.setTransform(SC, 0, 0, SC, 0, 0); ctx.imageSmoothingEnabled = false;
  if (G.state === 'crash') { drawCrashScene(ctx); return; }
  if (G.state === 'aset') { drawAssetSheet(ctx); return; }
  const t = G.todForced != null ? G.todForced : G.tod;
  G.tod = t;
  G.lights.length = 0;
  drawSky(ctx, t);
  drawFireworks(ctx);
  // dunia
  wctx.setTransform(1, 0, 0, 1, 0, 0); wctx.clearRect(0, 0, worldCv.width, worldCv.height);
  wctx.setTransform(SC, 0, 0, SC, 0, 0); wctx.imageSmoothingEnabled = false;
  const shx = G.shake > 0 ? Math.round((Math.random() - 0.5) * 4 * (G.shake / 0.35)) : 0;
  const shy = G.shake > 0 ? Math.round((Math.random() - 0.5) * 3 * (G.shake / 0.35)) : 0;
  wctx.translate(shx, shy);
  drawClouds(wctx, t);
  drawFarLayers(wctx, t);
  drawSawah(wctx, t);
  drawVerge(wctx);
  drawDecor(wctx);
  drawHouses(wctx);
  drawRoad(wctx);
  if (G.level) for (const cr of G.level.crossings) { if (cr.x - G.cam > W + 10) break; drawCrossing(wctx, cr); }
  drawZones(wctx);
  drawObstacles(wctx);
  drawItems(wctx);
  drawGooseEnt(wctx);
  if (G.state === 'menu') drawPlayer(wctx, G.menuScale, 70);
  else drawPlayer(wctx);
  drawPackages(wctx);
  drawFrontCanal(wctx);
  drawParticles(wctx, G.particles);
  const dark = drawLighting(t);
  ctx.drawImage(worldCv, 0, 0, W, H);
  drawGlows(ctx, dark);
  drawMarkers(ctx);
  drawParticles(ctx, G.confetti);
  drawUIfx(ctx);
}

// ---------------- Skrin jatuh ----------------
function drawCrashScene(c) {
  const g = c.createRadialGradient(W / 2, 150, 20, W / 2, 170, 260);
  g.addColorStop(0, '#2b4bb0'); g.addColorStop(1, '#0e1a52');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // corak
  c.fillStyle = 'rgba(255,255,255,0.05)';
  for (let y = 0; y < H; y += 12) for (let x = (y / 12) % 2 ? 6 : 0; x < W; x += 12) c.fillRect(x, y, 2, 2);
  for (let i = 0; i < 18; i++) {
    const a = 0.3 + 0.7 * Math.abs(Math.sin(G.anim * 2 + i));
    c.fillStyle = `rgba(255,236,160,${a})`;
    const x = Math.round((hash(i * 5) * 0.5 + 0.5) * W), y = Math.round((hash(i * 9) * 0.5 + 0.5) * 110) + 8;
    c.fillRect(x, y, 1, 3); c.fillRect(x - 1, y + 1, 3, 1);
  }
  const bob = Math.round(Math.sin(G.anim * 3) * 2);
  // vespa terbalik
  c.save(); c.translate(80, 86 + bob); c.rotate(-0.55); c.drawImage(S.vespaBare, -44, -40, 88, 80); c.restore();
  // garisan gerak
  c.fillStyle = '#fff6dc';
  for (let i = 0; i < 4; i++) c.fillRect(22 + i * 6, 40 + i * 9, 10 - i * 2, 2);
  // penunggang tercampak
  c.save(); c.translate(150, 66 - bob); c.rotate(0.5); c.drawImage(S.riderFly, -30, -32, 60, 64); c.restore();
  // bintang pening
  for (let i = 0; i < 3; i++) {
    const a = G.anim * 4 + i * 2.1, x = Math.round(150 + Math.cos(a) * 14), y = Math.round(36 + Math.sin(a) * 4);
    c.fillStyle = '#ffd447'; c.fillRect(x, y - 1, 1, 3); c.fillRect(x - 1, y, 3, 1);
  }
  // debu
  c.fillStyle = 'rgba(255,255,255,0.18)'; pixCircle(c, 60, 128, 10); pixCircle(c, 76, 132, 8); pixCircle(c, 100, 128, 7);
  // balang & kuih bersepah
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(20, 300, 176, 6);
  c.drawImage(S.jar, 24, 262, 30, 36);
  c.save(); c.translate(110, 290); c.rotate(1.45); c.drawImage(S.jar, -15, -18, 30, 36); c.restore();
  c.drawImage(S.jar, 156, 258, 34, 40);
  const ks = [[70, 296, 0], [86, 300, 1], [132, 298, 2], [146, 302, 0], [60, 304, 1], [124, 306, 3], [98, 306, 2], [176, 304, 1], [40, 302, 3]];
  for (const [x, y, k] of ks) c.drawImage(S.kuih[k], x, y, S.kuih[k].width * 1.6, S.kuih[k].height * 1.6);
}

// ---------------- Helaian aset ----------------
function drawAssetSheet(c) {
  c.fillStyle = '#132565'; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(140,175,255,0.12)'; c.lineWidth = 0.5;
  for (let x = 0; x < W; x += 12) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  for (let y = 0; y < H; y += 12) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  text(c, 'ASET & ELEMEN', W / 2, 14, { size: 8, color: '#ffd447' });
  const cell = (x, y, label) => { text(c, label, x, y, { size: 6.5, font: FONT_BODY, color: '#fff6dc', outline: null }); };
  c.drawImage(S.vespa[0], 14, 26, 66, 60); cell(48, 92, 'Watak & Vespa');
  c.drawImage(S.goose[1], 128, 34, 54, 47); cell(155, 92, 'Angsa Pengejar');
  c.drawImage(S.house[0], 6, 104, 82, 72); cell(48, 182, 'Rumah Kampung');
  c.drawImage(S.house[1], 118, 112, 72, 63); cell(155, 182, 'Varian Rumah');
  c.drawImage(S.jar, 14, 196, 22, 26); c.drawImage(S.kuih[0], 42, 206, 16, 16); c.drawImage(S.kuih[1], 60, 206, 16, 16); c.drawImage(S.kuih[2], 78, 206, 15, 15);
  cell(52, 230, 'Balang & Kuih Raya');
  c.drawImage(S.ketupat, 116, 192, 22, 26); c.drawImage(S.kuih[3], 146, 206, 18, 15); c.drawImage(S.gift, 172, 206, 15, 15);
  cell(155, 230, 'Ketupat & Hadiah');
  c.drawImage(S.rock, 12, 248, 27, 20); c.drawImage(S.dung, 44, 254, 24, 14); c.drawImage(S.coconut, 72, 250, 18, 18); c.drawImage(S.warn, 94, 248, 22, 21);
  cell(56, 278, 'Halangan');
  c.drawImage(S.pelita, 128, 244, 10, 30); c.fillStyle = PAL.flameO; c.fillRect(130, 238, 6, 6); c.fillStyle = PAL.flame; c.fillRect(132, 240, 2, 4);
  c.drawImage(S.palm, 146, 236, 24, 45); c.drawImage(S.banana, 172, 248, 20, 29);
  cell(160, 290, 'Pelita & Pokok');
  const sw = ['#7cc4f5', '#ffd447', '#f08a24', '#d55a78', '#2f9e9a', '#3b3f6b', '#132565', '#1d1530'];
  sw.forEach((col, i) => { c.fillStyle = PAL.ink; pixCircle(c, 22 + i * 25, 320, 9); c.fillStyle = col; pixCircle(c, 22 + i * 25, 320, 8); });
  cell(W / 2, 338, 'Palet warna');
  text(c, 'Siang > Petang > Senja > Malam', W / 2, 360, { size: 6.5, font: FONT_BODY, color: '#b9c6ef', outline: null });
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
  if (G.lives <= 0) startCrash();
}

function collect(it) {
  it.taken = true;
  const x = it.x - G.cam;
  if (it.type === 'kuih') { G.score += 10; G.kuih++; Sfx.coin(); popup('+10', x, it.y - 10, '#fff6dc', 5, 0.6); }
  else if (it.type === 'jar') { G.score += 50; G.kuih += 5; Sfx.jar(); popup('+50 BALANG!', x, it.y - 12, '#ffd447', 6); }
  else if (it.type === 'ketupat') {
    if (G.lives < 3) { G.lives++; Sfx.life(); popup('+1 NYAWA!', x, it.y - 12, '#7dff8a', 6.5); updateHud(true, true); }
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
  G.state = 'crashing'; G.player.crashT = 0; Sfx.stopMusic(); Sfx.crash(); vibrate([60, 40, 120]);
  setHud(false);
}

function finish() {
  G.state = 'done'; G.doneT = 0; Sfx.stopMusic(); Sfx.win();
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
  if (ph !== G.phaseIdx) { G.phaseIdx = ph; G.banner = { title: PHASES[ph].name, sub: PHASES[ph].sub, t: 0, dur: 2.4 }; Sfx.phase(); }
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
      gs.x += 100 * dt;
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
  Sfx.stopMusic();
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
  Sfx.startMusic();
}

function showCrash() {
  G.state = 'crash'; setHud(false); showScreens('scr-crash');
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
  if (on) Sfx.stopMusic(); else Sfx.startMusic();
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
  if (QS.get('debug')) window.__vrtb = { G, deliver, startGame, update, render, PX, GY, W, supported, showResult };
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

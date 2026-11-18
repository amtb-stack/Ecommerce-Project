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

const PHASES_LEMANG = [
  { name: 'TENGAH HARI', sub: 'Hutan lebat, rumah berjauhan' },
  { name: 'PETANG', sub: 'Awas pokok tumbang!' },
  { name: 'SENJA', sub: 'Unggun lemang menyala' },
  { name: 'MALAM', sub: 'Hampir ke simpang Kg. Ketupat' },
];
const NAMES_ORANG = ['Mak Jah', 'Pak Wahab', 'Adik Mira', 'Tok Ngah', 'Kak Ani', 'Abang Lan', 'Nenek Esah', 'Pak Hamid',
  'Adik Danish', 'Mak Su Ros', 'Pak Cik Rahman', 'Kak Zura', 'Atok Yusof', 'Adik Aiman', 'Mak Long Senah'];
const HURT_LEMANG = { lubang: 'PLOK! LOPAK LUMPUR!', pokok: 'DUSH! POKOK TUMBANG!', burung: 'EEE! TAHI BURUNG!', motor: 'DUM! MOTOR BESAR! -2' };
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

// ---------------- Watak & vespa (shading berlapis gaya arked) ----------------
const MS = {
  creamD: '#a8916a', redD: '#6e1626', tealD: '#155a57', skinD: '#7a4a30', metalH: '#eef2f8', tyreH: '#4d475c',
  songketS: '#1d4a2b', boxH: '#f2a75e', boxD: '#7a3f17', scarf: '#ffd447', scarfS: '#d18b16', lens: '#8fe0ff', lensD: '#2f6f9a',
  strap: '#5a3a2a', mouth: '#7a2030', teeth: '#ffffff', sweat: '#9fdcff', pantsS: '#2a2d52', pantsH: '#555b94', shoeH: '#4a4058',
};
function drawRider(g, ox = 0, oy = 0, pose = 'ride', f = 0, mood = 'ride') {
  // busana Melayu: songkok, baju Melayu cekak musang sedondon, samping songket, capal
  const P = PAL, X = (x) => x + ox, Y = (y) => y + oy;
  const SAMP = '#8a1d3a', SAMPS = '#5e1028', SAMPH = '#b33454', CAPAL = '#7a4a22', SONG = '#1a1626', SONGH = '#3e3856', HAIR = '#2b2033';
  if (pose === 'ride') {
    // seluar sedondon (warna sama dengan baju)
    g.rect(X(14), Y(20), 9, 3, P.teal); g.hline(X(14), X(22), Y(22), P.tealS);
    g.rect(X(21), Y(22), 3, 5, P.teal); g.vline(X(23), Y(22), Y(26), P.tealS);
    // capal kulit
    g.rect(X(20), Y(26), 6, 1, P.skin); g.px(X(25), Y(26), P.skinS);
    g.rect(X(19), Y(27), 8, 1, CAPAL); g.px(X(22), Y(26), CAPAL); g.px(X(26), Y(27), '#4a2a12');
    // samping songket labuh (pinggang ke lutut) + hujung berkibar
    g.rect(X(11), Y(16), 12, 6, SAMP); g.hline(X(11), X(22), Y(21), SAMPS); g.vline(X(22), Y(17), Y(21), SAMPS);
    g.hline(X(11), X(22), Y(16), P.gold); g.hline(X(12), X(21), Y(20), P.goldS);
    for (const [x, y] of [[13, 18], [16, 18], [19, 18], [14, 19], [17, 19], [20, 19], [12, 17], [21, 17]]) g.px(X(x), Y(y), (x + y) % 2 ? P.gold : SAMPH);
    const flap = f ? [[10, 17], [9, 18], [8, 18], [9, 19], [8, 20]] : [[10, 17], [9, 17], [8, 18], [9, 19], [9, 20]];
    for (const [x, y] of flap) g.px(X(x), Y(y), SAMP);
    g.px(X(f ? 7 : 8), Y(19), P.gold);
  } else {
    g.rect(X(8), Y(20), 3, 6, P.teal); g.vline(X(10), Y(20), Y(25), P.tealS); g.rect(X(14), Y(19), 7, 3, P.teal); g.hline(X(14), X(20), Y(21), P.tealS);
    g.rect(X(6), Y(26), 5, 2, CAPAL); g.rect(X(7), Y(25), 3, 1, P.skin); g.rect(X(20), Y(17), 2, 4, CAPAL);
    g.rect(X(10), Y(16), 11, 5, SAMP); g.hline(X(10), X(20), Y(16), P.gold); g.hline(X(10), X(20), Y(20), SAMPS);
    for (const [x, y] of [[12, 18], [15, 18], [18, 18], [13, 19], [16, 19]]) g.px(X(x), Y(y), P.gold);
  }
  // baju Melayu (3 tona) + cekak musang & butang emas
  g.rect(X(12), Y(8), 8, 9, P.teal);
  g.rect(X(12), Y(9), 2, 7, P.tealH); g.vline(X(19), Y(9), Y(15), P.tealS); g.hline(X(13), X(19), Y(15), P.tealS); g.px(X(19), Y(15), MS.tealD);
  g.rect(X(15), Y(7), 3, 2, P.teal); g.hline(X(15), X(17), Y(7), P.tealS);             // kolar cekak musang
  g.px(X(16), Y(9), P.gold); g.px(X(16), Y(11), P.gold); g.px(X(16), Y(13), P.gold);   // butang
  if (pose === 'ride') {
    g.rect(X(18), Y(10), 9, 3, P.teal); g.hline(X(18), X(25), Y(10), P.tealH); g.hline(X(18), X(26), Y(12), P.tealS);
    g.rect(X(26), Y(9), 3, 4, P.skin); g.vline(X(28), Y(9), Y(12), P.skinS);
  } else {
    g.rect(X(18), Y(4), 3, 7, P.teal); g.vline(X(20), Y(4), Y(10), P.tealS); g.rect(X(18), Y(1), 3, 3, P.skin);
    g.rect(X(7), Y(10), 6, 3, P.teal); g.hline(X(7), X(12), Y(12), P.tealS); g.rect(X(4), Y(10), 3, 3, P.skin);
  }
  // kepala besar
  g.ell(X(17), Y(4), 4.4, 3.8, P.skin);
  g.vline(X(21), Y(4), Y(7), P.skinS); g.hline(X(17), X(20), Y(8), P.skinS);
  // rambut di bawah songkok + telinga
  g.rect(X(13), Y(2), 3, 2, HAIR); g.px(X(13), Y(4), HAIR); g.px(X(16), Y(2), HAIR);
  g.px(X(15), Y(5), P.skinS); g.px(X(15), Y(4), P.skin);
  // songkok baldu hitam
  g.rect(X(12), Y(-2), 9, 4, SONG); g.hline(X(12), X(20), Y(-2), SONGH); g.px(X(13), Y(-1), SONGH); g.px(X(14), Y(-1), '#56507a');
  g.hline(X(12), X(20), Y(1), '#0e0b16'); g.px(X(20), Y(0), '#0e0b16');
  // muka
  g.rect(X(18), Y(3), 3, 5, P.skin); g.px(X(21), Y(5), P.skinS);
  if (mood === 'hurt' || pose !== 'ride') {
    g.px(X(18), Y(4), P.ink); g.px(X(19), Y(5), P.ink); g.px(X(18), Y(6), P.ink);
    g.px(X(20), Y(4), P.ink); g.px(X(20), Y(6), P.ink);
    g.px(X(19), Y(7), MS.mouth); g.px(X(20), Y(7), MS.mouth); g.px(X(19), Y(8), MS.mouth);
    g.px(X(10), Y(1), MS.sweat); g.px(X(10), Y(2), MS.sweat); g.px(X(9), Y(2), MS.sweat);
  } else {
    g.px(X(18), Y(3), P.ink); g.px(X(19), Y(3), P.ink);
    g.px(X(19), Y(5), P.white); g.px(X(20), Y(5), P.ink);
    g.px(X(18), Y(6), P.blush);
    g.px(X(19), Y(7), MS.mouth); g.px(X(20), Y(7), MS.teeth);
  }
}
function drawVespa(g, f, withRider, mood = 'ride') {
  const P = PAL;
  const wheel = (cx, cy) => {
    g.circ(cx, cy, 4.6, P.tyre);
    for (let k = 0; k < 4; k++) { const a = f * 0.4 + k * Math.PI / 2; g.px(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4, MS.tyreH); }
    g.px(cx - 3, cy - 3, MS.tyreH);
    g.circ(cx, cy, 2.4, P.metal); g.circ(cx - 0.5, cy - 0.5, 1.5, P.hub); g.px(cx - 1, cy - 1, MS.metalH); g.px(cx, cy, P.metalD);
  };
  wheel(10, 31); wheel(33, 31);
  // ekzos krom
  g.rect(0, 28, 7, 3, P.metal); g.hline(0, 6, 28, MS.metalH); g.hline(0, 6, 30, P.metalD); g.px(0, 29, P.ink);
  // badan belakang: 3 tona + kilat
  g.ell(12, 25, 10.5, 5.5, MS.creamD);
  g.ell(12, 24.4, 10, 5, P.creamS);
  g.ell(11.4, 23.6, 9, 4.2, P.cream);
  g.ell(9, 21.8, 4.6, 1.5, P.creamH); g.px(6, 21, P.white); g.px(7, 21, P.white);
  for (let x = 4; x <= 20; x++) if (x % 2) g.px(x, 28, MS.creamD);     // dither bawah
  g.hline(15, 19, 23, MS.creamD); g.hline(15, 19, 25, MS.creamD);        // gril angin
  g.hline(4, 20, 26, P.teal); g.hline(5, 19, 27, P.tealS);
  for (const [x, y] of [[5, 27], [8, 28], [17, 28]]) g.px(x, y, P.dirtS); // percikan lumpur
  // lantai kaki bergetah
  g.rect(19, 27, 10, 2, P.creamS); for (const x of [20, 23, 26]) g.px(x, 27, P.metalD);
  // perisai kaki depan
  g.poly([[27, 30], [32, 30], [35, 13], [31, 12], [28, 20]], P.cream);
  g.line(34, 14, 32, 29, P.creamS); g.line(33, 16, 31.5, 29, P.creamS);
  g.line(30, 14, 28, 27, P.creamH);
  // fender depan
  g.ell(33, 26.5, 5.5, 2, P.cream); g.hline(30, 36, 25, P.creamH); g.px(37, 27, P.creamS); g.px(36, 28, P.creamS);
  // kepala, lampu krom & hon
  g.rect(30, 9, 7, 3, P.cream); g.hline(30, 36, 9, P.creamH); g.hline(31, 36, 11, P.creamS);
  g.rect(37, 8, 3, 4, P.metal); g.rect(38, 9, 2, 2, P.lamp); g.px(38, 9, P.white); g.px(39, 11, P.metalD);
  g.rect(33, 13, 2, 2, P.metal); g.px(33, 13, MS.metalH);
  g.px(28, 10, P.tyre); g.px(29, 10, P.tyre); g.px(28, 11, P.tyre);
  g.vline(31, 6, 8, P.metal); g.rect(30, 4, 3, 2, MS.metalH); g.px(32, 5, P.metalD);
  // tempat duduk berjahit
  g.rect(5, 18, 13, 2, P.seat); g.hline(6, 16, 18, P.seatH); for (let x = 6; x < 17; x += 3) g.px(x, 19, P.seatH);
  // rak krom & peti kuih kayu
  g.hline(0, 10, 17, P.metal); for (let x = 0; x <= 10; x += 3) g.px(x, 17, MS.metalH);
  g.rect(0, 8, 10, 9, P.box); g.hline(0, 9, 8, MS.boxH); g.vline(0, 9, 15, MS.boxH);
  g.vline(3, 9, 16, P.boxS); g.vline(7, 9, 16, P.boxS); g.rect(0, 15, 10, 2, P.boxS); g.hline(0, 9, 16, MS.boxD);
  g.vline(5, 8, 16, P.ribbon); g.hline(0, 9, 12, P.ribbon); g.px(5, 12, '#ff8aa0');
  g.px(4, 7, P.ribbon); g.px(6, 7, P.ribbon); g.px(3, 6, P.ribbon); g.px(7, 6, P.ribbon); g.px(5, 7, '#ff8aa0');
  if (withRider) drawRider(g, 0, 0, 'ride', f, mood);
}

// ---------------- Angsa pengejar ----------------
function drawGoose(g, f) {
  const P = PAL, S2 = '#a8b0c4';
  const lx = f ? [9, 14] : [11, 12];
  for (const x of lx) { g.vline(x, 20, 22, P.beak); g.hline(x - 1, x + 1, 23, P.beak); g.px(x + 1, 23, P.beakS); }
  g.ell(11, 15, 9, 5.5, P.goose);
  g.poly([[1, 10], [6, 12], [5, 16]], P.goose); g.px(2, 11, P.gooseS);
  g.hline(4, 17, 19, P.gooseS); g.hline(6, 15, 20, S2); g.hline(12, 18, 18, P.gooseS);
  g.px(5, 12, P.white); g.px(6, 11, P.white);
  if (f) { g.poly([[4, 13], [14, 12], [8, 4], [3, 6]], P.gooseS); g.line(5, 7, 12, 12, P.goose); g.line(4, 9, 9, 12, S2); g.px(8, 5, P.white); }
  else { g.ell(10, 14, 6, 3, P.gooseS); g.hline(6, 14, 13, P.goose); g.hline(7, 13, 16, S2); for (const x of [8, 11]) g.px(x, 15, S2); }
  g.rect(17, 5, 3, 11, P.goose); g.vline(19, 6, 15, P.gooseS);
  g.ell(20, 4.5, 3.5, 2.8, P.goose); g.px(18, 3, P.white); g.hline(19, 22, 7, P.gooseS);
  g.rect(23, 3, 4, 2, P.beak); g.px(23, 2, P.beakS); g.hline(24, 26, 3, '#ffc070');
  if (f) { g.rect(23, 6, 3, 1, P.beakS); g.px(23, 5, P.angry); }
  else g.rect(23, 5, 3, 1, P.beakS);
  g.px(21, 3, P.angry); g.px(20, 2, P.ink); g.px(21, 2, P.ink); g.px(22, 3, P.ink); g.px(19, 1, P.ink);   // kening marah
}

// ---------------- Kesan khas: asap, debu, letupan, serpihan ----------------
const PUFF_COL = {
  smoke: ['#ffffff', '#d9dce8', '#a4a9bd', '#6f748c'],
  dust: ['#f3e2bf', '#d9c08f', '#b39566', '#7d6646'],
  dark: ['#8a8798', '#5d5a6c', '#403d4e', '#26232f'],
};
function drawPuff(g, k, col) {
  const C = PUFF_COL[col], r = 2 + k * 1.6, c = 11;
  const blobs = [[0, 0, 1], [-0.7, 0.3, 0.7], [0.7, 0.35, 0.75], [0.1, -0.55, 0.65]];
  for (const [dx, dy, s] of blobs) g.circ(c + dx * r, c + dy * r, r * s + 0.5, C[2]);
  for (const [dx, dy, s] of blobs) g.circ(c + dx * r - 0.6, c + dy * r - 0.7, r * s - 0.3, C[1]);
  for (const [dx, dy, s] of blobs) if (r * s > 2.2) g.circ(c + dx * r - 1.2, c + dy * r - 1.3, r * s * 0.45, C[0]);
}
function drawExplo(g, k) {
  const c = 15;
  if (k === 0) { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.line(c, c, c + Math.cos(a) * 7, c + Math.sin(a) * 7, '#fff6b0'); } g.circ(c, c, 3.5, '#ffffff'); return; }
  const r = [0, 7, 10, 12, 12][k];
  const outer = ['', '#ff9a2a', '#ff6a1f', '#c8381f', '#5d5a6c'][k], mid = ['', '#ffd447', '#ff9a2a', '#ff6a1f', '#8a8798'][k], core = ['', '#fff6b0', '#ffd447', '#ff9a2a', '#a4a9bd'][k];
  for (let i = 0; i < 7; i++) { const a = i * 0.9 + k; g.circ(c + Math.cos(a) * r * 0.45, c + Math.sin(a) * r * 0.45, r * 0.55, outer); }
  g.circ(c, c, r * 0.75, mid); g.circ(c - 1, c - 1, r * 0.42, core);
  if (k >= 2) for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.3; g.px(c + Math.cos(a) * (r + 1.5), c + Math.sin(a) * (r + 1.5), k >= 3 ? '#5d5a6c' : '#ffd447'); }
}
function drawFeather(g) { g.line(0, 5, 6, 0, '#c9cfdc'); g.line(1, 5, 6, 1, '#ffffff'); g.px(2, 3, '#ffffff'); g.px(4, 2, '#ffffff'); g.px(0, 5, PAL.beak); }
function drawChip(g, col) { g.poly([[0, 2], [3, 0], [5, 2], [3, 4]], col); g.px(2, 1, '#ffffff'); }
function drawBolt(g) { g.rect(0, 0, 3, 3, PAL.metal); g.px(1, 1, MS.metalH); g.px(2, 2, PAL.metalD); }

// ---------------- Hiasan kampung tambahan ----------------
function drawJemuran(g) {
  g.vline(0, 4, 26, PAL.woodS); g.vline(1, 4, 26, PAL.wood); g.vline(38, 4, 26, PAL.woodS); g.vline(39, 4, 26, PAL.wood);
  g.line(1, 5, 20, 7, '#d8d0c0'); g.line(20, 7, 38, 5, '#d8d0c0');
  const cloth = (x, w, h, a, b) => { g.rect(x, 7, w, h, a); for (let yy = 8; yy < 7 + h; yy += 2) for (let xx = x; xx < x + w; xx += 2) g.px(xx + ((yy / 2) % 2), yy, b); g.hline(x, x + w - 1, 7 + h - 1, b); };
  cloth(4, 7, 11, '#d94f6e', '#f2c14e');   // batik merah
  cloth(13, 6, 9, '#3a6fc0', '#ffffff');   // kain pelekat biru
  cloth(22, 8, 12, '#2c6a3f', '#f2c14e');  // songket hijau
  cloth(32, 4, 7, '#f6f2e4', '#c9c2b0');   // baju putih
}
function drawTempayan(g) {
  g.ell(7, 9, 6.5, 6, '#a0522d'); g.ell(6, 8, 5, 4.6, '#c8683a'); g.ell(4.5, 6.5, 1.8, 1.6, '#e8925a');
  g.rect(3, 1, 9, 2, '#8a4524'); g.hline(4, 10, 1, '#c8683a');
  g.hline(2, 12, 10, '#7a3f1d'); for (let x = 3; x < 12; x += 2) g.px(x, 11, '#e8925a');
  g.ell(7, 15.5, 5, 1, '#5a3a2a');
}
function drawFgGrass(g) {
  const C = ['#1f4d26', '#2c6a33', '#3b8a3e'];
  for (let i = 0; i < 9; i++) { const x = 3 + i * 2.6, h = 14 + ((i * 7) % 9), lean = (i % 3) - 1; g.line(x, 30, x + lean * 3, 30 - h, C[i % 3]); g.line(x + 1, 30, x + 1 + lean * 3, 31 - h, C[(i + 1) % 3]); }
  g.ell(13, 29, 12, 2.5, '#1a3f20');
}
function drawFgRock(g) { g.ell(10, 9, 9.5, 6, '#3d3b4c'); g.ell(8.5, 7.5, 7.5, 4.5, '#5a586c'); g.ell(6.5, 6, 3, 1.6, '#7c7a90'); g.hline(2, 18, 14, '#24222e'); }
function drawFgPost(g) {
  g.rect(2, 0, 5, 34, '#5a3a2a'); g.vline(2, 0, 33, '#7a5232'); g.vline(6, 0, 33, '#3d2618');
  g.hline(1, 7, 0, '#8a6038'); for (const y of [8, 19, 27]) g.px(4, y, '#3d2618');
  g.line(7, 6, 18, 9, '#a8a8b8'); g.line(7, 16, 18, 19, '#a8a8b8');   // dawai pagar
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

// ---------------- Kampung Lemang: rumah gonjong (gaya Minangkabau, Negeri Sembilan) ----------------
const GONJONG_VARIANTS = [
  { wall: ['#7a4a2a', '#5a321c'], carve: ['#a8322e', '#f2c14e', '#2a1a16'] },
  { wall: ['#8a5a34', '#653f22'], carve: ['#2c7a45', '#f2c14e', '#1a2a1a'] },
  { wall: ['#6e4428', '#4e2e18'], carve: ['#3a55b0', '#ffffff', '#1a1a2a'] },
  { wall: ['#9a6a40', '#74482a'], carve: ['#8a1d3a', '#f2c14e', '#2a1a16'] },
];
const GONJONG_TOP = [[0, -1], [9, 8], [24, 13], [41, 14], [58, 13], [72, 8], [80, -1]];
function gonjongRidge(x) {
  for (let i = 0; i < GONJONG_TOP.length - 1; i++) { const [x0, y0] = GONJONG_TOP[i], [x1, y1] = GONJONG_TOP[i + 1]; if (x <= x1) return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  return -1;
}
function drawGonjong(g, v) {
  const P = PAL, V = GONJONG_VARIANTS[v], R = ['#2e2622', '#4a3c34', '#1a1412'];
  for (const x of [5, 19, 54, 68]) { g.rect(x, 52, 3, 17, P.woodS); g.vline(x, 52, 68, P.wood); }
  g.rect(2, 49, 76, 4, P.woodS); g.hline(2, 77, 49, P.wood);
  // dinding papan berukir
  g.rect(5, 30, 72, 19, V.wall[0]);
  for (let x = 7; x < 77; x += 4) g.vline(x, 34, 44, V.wall[1]);
  for (let x = 5; x < 77; x++) {
    g.px(x, 30, V.carve[2]); g.px(x, 31, x % 4 < 2 ? V.carve[0] : V.carve[1]); g.px(x, 32, x % 4 === 1 ? V.carve[1] : V.carve[0]); g.px(x, 33, V.carve[2]);
    g.px(x, 45, V.carve[2]); g.px(x, 46, x % 3 === 0 ? V.carve[1] : V.carve[0]); g.px(x, 47, V.carve[2]);
  }
  const win = (x) => { g.rect(x, 35, 11, 10, V.carve[2]); g.rect(x + 1, 36, 9, 8, '#2a1810'); g.vline(x + 5, 36, 43, V.carve[2]); g.hline(x, x + 10, 35, V.carve[1]); g.hline(x + 1, x + 9, 44, V.carve[1]); g.px(x + 2, 37, '#4a3020'); };
  win(11); win(56);
  g.rect(34, 34, 12, 15, V.carve[2]); g.rect(35, 35, 10, 14, '#6a3a20'); g.vline(39, 35, 48, '#4a2814'); g.vline(40, 35, 48, '#4a2814');
  g.hline(34, 45, 34, V.carve[1]); g.px(38, 42, P.gold); g.px(41, 42, P.gold);
  for (let i = 0; i < 4; i++) g.rect(33, 53 + i * 4, 14, 2, i % 2 ? P.wood : P.woodH);
  g.vline(32, 50, 68, P.woodS); g.vline(47, 50, 68, P.woodS);
  // bumbung ijuk melengkung dengan tanduk gonjong
  g.poly([...GONJONG_TOP, [76, 12], [79, 30], [1, 30], [4, 12]], R[0]);
  for (let x = 3; x < 79; x += 3) g.vline(x, Math.ceil(gonjongRidge(x)) + 2, 28, R[1]);
  for (let i = 0; i < GONJONG_TOP.length - 1; i++) g.line(GONJONG_TOP[i][0], GONJONG_TOP[i][1] + 1, GONJONG_TOP[i + 1][0], GONJONG_TOP[i + 1][1] + 1, R[1]);
  g.hline(1, 79, 29, R[2]); g.hline(2, 78, 30, R[2]);
  g.px(0, -1, P.gold); g.px(1, 0, P.gold); g.px(80, -1, P.gold); g.px(79, 0, P.gold);
  // anjung kecil bergonjong di atas pintu
  g.poly([[28, 17], [34, 21], [41, 22], [48, 21], [54, 17], [52, 27], [30, 27]], R[0]);
  g.line(28, 18, 41, 23, R[1]); g.line(41, 23, 54, 18, R[1]); g.px(28, 17, P.gold); g.px(54, 17, P.gold);
  g.poly([[34, 27], [48, 27], [41, 23]], V.carve[0]); g.px(41, 25, V.carve[1]);
}

// ---------------- Orang kampung menunggu balang ----------------
function drawCustomer(g, v, f) {
  const P = PAL, up = f === 1;
  if (v === 0) {           // makcik: tudung + baju kurung
    g.rect(3, 18, 9, 6, '#5a2f8a'); for (const [x, y] of [[5, 20], [9, 21], [7, 22]]) g.px(x, y, '#f2c14e');
    g.rect(3, 23, 3, 1, '#7a4a22'); g.rect(8, 23, 3, 1, '#7a4a22');
    g.rect(3, 10, 9, 9, '#8a4fbf'); g.vline(11, 11, 18, '#6a3a9a'); g.hline(3, 11, 18, '#6a3a9a');
    g.poly([[1, 6], [13, 6], [13, 12], [1, 12]], '#f3c6dc'); g.hline(2, 12, 11, '#d9a0bd');
    g.ell(7, 4, 4, 4, '#f3c6dc'); g.rect(3, 3, 4, 4, P.skin); g.px(4, 4, P.ink); g.px(3, 6, P.blush); g.px(4, 6, '#7a2030');
    g.rect(0, up ? 4 : 7, 2, 5, '#8a4fbf'); g.rect(0, up ? 2 : 5, 2, 2, P.skin);
  } else if (v === 1) {    // pakcik: kopiah + baju Melayu + kain pelikat
    g.rect(3, 17, 9, 7, '#3a6fc0'); for (let y = 17; y < 24; y += 2) g.hline(3, 11, y, '#2a4f90'); for (let x = 4; x < 12; x += 3) g.vline(x, 17, 23, '#e8eef8');
    g.rect(3, 23, 3, 1, '#7a4a22'); g.rect(8, 23, 3, 1, '#7a4a22');
    g.rect(3, 9, 9, 9, '#8a6a3a'); g.vline(11, 10, 17, '#6a4e28'); g.px(6, 11, P.gold); g.px(6, 13, P.gold);
    g.ell(7, 5, 3.6, 3.6, P.skin); g.rect(4, 1, 7, 2, '#f6f2e4'); g.hline(4, 10, 1, '#ffffff');
    g.px(4, 5, P.ink); g.rect(4, 7, 3, 2, '#d8d0c8'); g.px(5, 8, '#b8b0a8');
    g.rect(0, up ? 4 : 8, 2, 5, '#8a6a3a'); g.rect(0, up ? 2 : 6, 2, 2, P.skin);
  } else {                 // adik: songkok kecil + baju Melayu merah
    g.rect(4, 19, 7, 5, '#d94f4f'); g.vline(10, 19, 23, '#a83434');
    g.rect(4, 23, 2, 1, '#7a4a22'); g.rect(8, 23, 2, 1, '#7a4a22');
    g.rect(4, 12, 7, 8, '#d94f4f'); g.vline(10, 13, 19, '#a83434'); g.rect(4, 17, 7, 2, '#2c6a3f'); g.px(6, 17, P.gold); g.px(8, 18, P.gold);
    g.ell(7, 8, 3.4, 3.4, P.skin); g.rect(4, 4, 7, 2, '#1a1626'); g.hline(4, 10, 4, '#3e3856');
    g.px(4, 8, P.ink); g.px(5, 10, '#7a2030'); g.px(4, 9, P.blush);
    g.rect(1, up ? 7 : 11, 2, 4, '#d94f4f'); g.rect(1, up ? 5 : 9, 2, 2, P.skin);
  }
}

// ---------------- Burung enggang (pembuang tahi) ----------------
function drawHornbill(g, f) {
  const B = '#1e1a24', W = '#f4f2ea', Y = '#f2b83a', R = '#d9532c';
  g.ell(11, 8, 6, 3, B); g.rect(15, 6, 6, 3, W); g.hline(15, 20, 8, '#c9c5b8');     // badan + ekor putih
  g.ell(5, 6, 2.6, 2.4, B); g.px(5, 5, '#ffffff'); g.px(5, 5, R);
  g.poly([[3, 6], [-1, 8], [3, 8]], Y); g.hline(1, 3, 5, R); g.px(2, 4, R);          // paruh & tanduk
  if (f) { g.poly([[9, 7], [14, 7], [12, 0], [8, 1]], B); g.hline(9, 12, 1, W); }
  else { g.poly([[9, 8], [14, 8], [13, 13], [8, 12]], B); g.hline(9, 12, 12, W); }
  g.px(10, 10, W); g.px(11, 10, W);
}
function drawPoop(g) { g.ell(2.5, 3, 2.2, 2.5, '#f6f6f0'); g.px(2, 1, '#ffffff'); g.px(3, 5, '#c9c9c0'); g.px(1, 4, '#9a9a90'); }
function drawSplat(g) { g.ell(7, 2, 6.5, 1.5, '#ecece4'); g.px(1, 1, '#ecece4'); g.px(13, 1, '#ecece4'); g.px(4, 0, '#ffffff'); g.hline(5, 9, 2, '#c9c9c0'); g.px(7, 1, '#7a7a70'); }

// ---------------- Pokok tumbang ----------------
function drawTreeFall(g) {
  g.rect(18, 30, 6, 49, '#6e4a2e'); g.vline(18, 30, 78, '#8a6038'); g.vline(23, 30, 78, '#4a3020');
  for (let y = 36; y < 78; y += 7) g.px(20, y, '#4a3020');
  g.poly([[14, 79], [18, 72], [24, 72], [28, 79]], '#6e4a2e');
  for (const [x, y, r, col] of [[21, 16, 14, '#1f5a30'], [10, 22, 9, '#246638'], [32, 22, 9, '#246638'], [21, 8, 9, '#2c7a40'], [14, 13, 7, '#2c7a40'], [28, 12, 7, '#358a48']]) g.circ(x, y, r, col);
  for (const [x, y] of [[16, 6], [24, 4], [10, 18], [30, 15], [20, 12]]) g.px(x, y, '#58b060');
}
function drawLog(g) {
  g.rect(1, 4, 31, 8, '#6e4a2e'); g.hline(1, 31, 4, '#8a6038'); g.hline(1, 31, 11, '#4a3020');
  for (let x = 4; x < 31; x += 6) { g.px(x, 7, '#4a3020'); g.px(x + 2, 9, '#4a3020'); }
  g.ell(33, 8, 3, 4, '#c8a06a'); g.ell(33, 8, 1.6, 2.4, '#e0bc84'); g.px(33, 8, '#8a6038');
  for (const [x, y, r] of [[6, 3, 3], [10, 2, 2.5], [3, 2, 2]]) g.circ(x, y, r, '#2c7a40');
  g.px(8, 1, '#58b060'); g.line(14, 4, 18, 0, '#6e4a2e'); g.px(19, 0, '#2c7a40');
}

// ---------------- Motor cruiser besar (generik, tanpa logo) ----------------
function drawChopper(g, f) {
  const P = PAL, BLK = '#1a1626', CH = '#c7ccd6', CHH = '#eef2f8', CHD = '#7c8494';
  const wheel = (cx, cy, r) => {
    g.circ(cx, cy, r, P.tyre); g.circ(cx, cy, r - 2.2, CHD); g.circ(cx, cy, r - 3.2, '#3a3646');
    for (let k = 0; k < 6; k++) { const a = f * 0.5 + k * Math.PI / 3; g.line(cx, cy, cx + Math.cos(a) * (r - 2.5), cy + Math.sin(a) * (r - 2.5), CH); }
    g.circ(cx, cy, 1.2, CHH);
  };
  wheel(12, 26, 7); wheel(54, 27, 6);
  g.ell(12, 20, 7.5, 3, BLK); g.hline(6, 18, 18, '#3e3856');                         // fender belakang
  g.line(1, 26, 22, 25, CH); g.line(2, 28, 24, 27, CH); g.hline(0, 3, 26, CHH); g.hline(0, 3, 28, CHD); // ekzos berkembar
  g.line(12, 26, 30, 22, BLK); g.line(20, 16, 44, 12, BLK);                            // rangka
  g.rect(27, 18, 8, 6, CH); g.rect(28, 15, 3, 4, CH); g.rect(32, 15, 3, 4, CH);       // enjin V-twin
  for (let y = 15; y < 24; y += 2) { g.px(27, y, CHD); g.px(35, y, CHD); } g.px(29, 16, CHH); g.px(33, 16, CHH);
  g.ell(36, 13, 7, 3.4, BLK); g.hline(31, 40, 11, '#3e3856');                         // tangki titisan air mata
  for (const [x, y, c] of [[32, 13, '#ff7a2a'], [33, 14, '#ffd447'], [34, 13, '#ff7a2a'], [35, 14, '#ffd447'], [36, 13, '#ff7a2a'], [37, 14, '#ff7a2a']]) g.px(x, y, c);
  g.rect(18, 13, 10, 3, '#5a3a2a'); g.hline(18, 27, 13, '#7a5232');                   // tempat duduk kulit
  g.vline(16, 5, 15, CH); g.hline(16, 18, 5, CH);                                    // sissy bar
  g.line(45, 10, 54, 27, CH); g.line(46, 10, 55, 27, CHD);                           // fork panjang
  g.circ(49, 11, 2.2, CH); g.px(50, 11, '#fff2a8'); g.px(51, 11, '#ffffff');          // lampu
  g.line(45, 10, 43, 2, CH); g.hline(40, 43, 2, CH); g.px(40, 3, BLK);                // hendal ape-hanger
  // penunggang: misai & janggut, cermin mata hitam, bandana, jaket kulit
  g.rect(31, 20, 8, 3, '#2f4a8a'); g.rect(37, 21, 3, 3, '#2f4a8a'); g.rect(38, 23, 4, 2, BLK);       // seluar jean & but
  g.rect(22, 6, 9, 9, '#ffffff'); g.rect(22, 6, 3, 9, BLK); g.rect(28, 6, 3, 9, BLK); g.vline(30, 7, 14, '#3e3856');
  g.rect(29, 4, 12, 3, '#d9a47a'); g.hline(29, 40, 6, '#b07a52'); g.px(32, 5, '#2a4f90'); g.px(35, 5, '#2a4f90');   // lengan bertatu
  g.ell(26, 2, 3.6, 3.4, '#d9a47a'); g.rect(22, -1, 8, 2, '#d93a3a'); g.px(21, 0, '#d93a3a'); g.px(20, 1, '#d93a3a');
  g.rect(27, 1, 4, 1, BLK); g.rect(25, 3, 6, 3, '#6e4a2e'); g.px(30, 3, '#8a6038');
}

// ---------------- Hiasan hutan ----------------
function drawBigTree(g) {
  g.rect(18, 24, 11, 86, '#4a3626'); g.vline(18, 24, 109, '#6a4e34'); g.vline(28, 24, 109, '#2e2218');
  for (let y = 30; y < 108; y += 9) { g.px(21, y, '#2e2218'); g.px(25, y + 4, '#2e2218'); }
  g.poly([[8, 110], [18, 92], [18, 110]], '#4a3626'); g.poly([[39, 110], [29, 92], [29, 110]], '#3e2e20');
  g.line(14, 30, 12, 80, '#3a7a3a'); g.line(30, 40, 33, 96, '#3a7a3a'); for (const y of [44, 58, 70]) g.px(12, y, '#58a050');
  for (const [x, y, r, c] of [[23, 12, 16, '#1d4a2c'], [8, 18, 9, '#235836'], [38, 18, 9, '#235836'], [23, 4, 10, '#2a6a3e']]) g.circ(x, y, r, c);
  for (const [x, y] of [[16, 4], [28, 2], [10, 14], [36, 13]]) g.px(x, y, '#4a9a58');
}
function drawBamboo(g) {
  const C = ['#7aa33e', '#8cb84a', '#6a9032'];
  for (let i = 0; i < 6; i++) {
    const x = 4 + i * 4.6, top = 6 + (i * 13) % 14, lean = (i % 3) - 1;
    for (let y = 79; y > top; y--) { const xx = x + lean * (79 - y) / 30; g.px(xx, y, C[i % 3]); g.px(xx + 1, y, C[(i + 1) % 3]); if (y % 9 === 0) { g.px(xx, y, '#4a6a22'); g.px(xx + 1, y, '#4a6a22'); } }
    const tx = x + lean * (79 - top) / 30;
    for (let k = 0; k < 4; k++) g.line(tx, top + 2 + k * 2, tx - 5 + k * 3 - lean * 2, top - 2 + k * 3, '#5a9a3a');
  }
}
function drawFern(g) {
  for (let i = 0; i < 6; i++) { const a = -Math.PI + 0.25 + i * 0.52; const ex = 12 + Math.cos(a) * 11, ey = 13 + Math.sin(a) * 10; g.line(12, 13, ex, ey, i % 2 ? '#3f8a3e' : '#2f6e30'); g.px(ex, ey + 1, '#58b060'); }
  g.hline(6, 18, 13, '#244f26');
}
function drawUnggun(g) {
  g.line(4, 24, 9, 8, '#5a3a22'); g.line(26, 24, 21, 8, '#5a3a22'); g.hline(6, 24, 9, '#6e4a2e');   // rak
  for (let i = 0; i < 5; i++) { const x = 7 + i * 3.6; g.line(x, 23, x + 3, 6, '#9ab84a'); g.line(x + 1, 23, x + 4, 6, '#7a9a34'); g.px(x, 22, '#2a2018'); g.px(x + 1, 21, '#2a2018'); g.px(x + 3, 6, '#3f8a3e'); g.px(x + 4, 5, '#58b060'); }
  g.rect(4, 23, 22, 2, '#3a2a1a'); g.line(3, 25, 27, 22, '#6e4a2e'); g.line(3, 22, 27, 25, '#5a3a22');   // kayu api
  for (const [x, y, c] of [[8, 22, '#ff7a2a'], [12, 23, '#ffd447'], [16, 22, '#ff4a1a'], [20, 23, '#ff7a2a'], [24, 22, '#ffd447']]) g.px(x, y, c);
}
function drawRockMoss(g) { drawRock(g); g.hline(3, 9, 2, '#4a9a48'); g.px(2, 3, '#3a7a3a'); g.px(10, 3, '#4a9a48'); g.px(5, 1, '#58b060'); }
function drawSimpang(g) {
  g.rect(19, 10, 3, 34, '#6e4a2e'); g.vline(19, 10, 43, '#8a6038');
  g.poly([[2, 2], [32, 2], [38, 7], [32, 12], [2, 12]], '#1f7a46'); g.hline(3, 32, 3, '#ffffff'); g.hline(3, 32, 11, '#ffffff');
  g.poly([[38, 15], [8, 15], [2, 20], [8, 25], [38, 25]], '#1f7a46'); g.hline(8, 37, 16, '#ffffff'); g.hline(8, 37, 24, '#ffffff');
}
function drawLemangIcon(g) {
  g.rect(3, 4, 6, 17, '#9ab84a'); g.vline(3, 4, 20, '#7a9a34'); g.vline(8, 4, 20, '#6a8a2a'); g.hline(3, 8, 12, '#5a7a22');
  g.rect(3, 17, 6, 4, '#3a2a1a'); g.px(5, 18, '#ff7a2a');
  g.poly([[3, 4], [9, 4], [10, 0], [6, 2], [2, 0]], '#3f8a3e'); g.rect(4, 3, 4, 2, '#fff6dc');
}

// ============================================================
// Sprite registry
// ============================================================
const S = {};
function buildSprites() {
  S.vespa = [0, 1].map((f) => sprite(44, 41, (g) => { g.oy = 2; drawVespa(g, f, true); }));
  S.vespaHurt = sprite(44, 41, (g) => { g.oy = 2; drawVespa(g, 0, true, 'hurt'); });
  S.vespaBare = sprite(44, 41, (g) => { g.oy = 2; drawVespa(g, 0, false); });
  S.riderFly = sprite(30, 33, (g) => { g.oy = 2; drawRider(g, 0, 1, 'fly'); });
  S.puff = {}; for (const col of ['smoke', 'dust', 'dark']) S.puff[col] = [0, 1, 2, 3, 4].map((k) => sprite(23, 23, (g) => drawPuff(g, k, col), PUFF_COL[col][3]));
  S.explo = [0, 1, 2, 3, 4].map((k) => sprite(31, 31, (g) => drawExplo(g, k), k >= 3 ? '#26232f' : '#7a2a12'));
  S.feather = sprite(9, 8, drawFeather);
  S.chips = { rock: sprite(8, 7, (g) => drawChip(g, PAL.rock)), dung: sprite(8, 7, (g) => drawChip(g, PAL.dung)), coco: sprite(8, 7, (g) => drawChip(g, PAL.coconut)), wood: sprite(8, 7, (g) => drawChip(g, PAL.wood)), leaf: sprite(8, 7, (g) => drawChip(g, '#3f8a3e')), poop: sprite(8, 7, (g) => drawChip(g, '#ecece4')) };
  S.bolt = sprite(5, 5, drawBolt);
  S.jemuran = sprite(42, 29, drawJemuran);
  S.tempayan = sprite(16, 18, drawTempayan);
  S.fgGrass = sprite(28, 33, drawFgGrass, '#10261a');
  S.fgRock = sprite(22, 17, drawFgRock);
  S.fgPost = sprite(21, 36, drawFgPost);
  // Kampung Lemang
  S.houseG = [0, 1, 2, 3].map((v) => sprite(82, 72, (g) => { g.oy = 2; drawGonjong(g, v); }));
  S.orang = [0, 1, 2].map((v) => [0, 1].map((f) => sprite(16, 26, (g) => drawCustomer(g, v, f))));
  S.bird = [0, 1].map((f) => sprite(24, 16, (g) => drawHornbill(g, f)));
  S.poop = sprite(7, 8, drawPoop);
  S.splat = sprite(16, 5, drawSplat);
  S.treeFall = sprite(44, 81, drawTreeFall);
  S.log = sprite(39, 14, drawLog);
  S.chopper = [0, 1].map((f) => sprite(64, 36, (g) => { g.oy = 2; drawChopper(g, f); }));
  S.bigtree = sprite(48, 112, drawBigTree);
  S.bamboo = sprite(36, 82, drawBamboo);
  S.fern = sprite(26, 16, drawFern);
  S.unggun = sprite(32, 28, drawUnggun);
  S.rockMoss = sprite(18, 13, drawRockMoss);
  S.simpang = sprite(42, 46, drawSimpang);
  S.lemangIcon = sprite(12, 23, drawLemangIcon);
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
  root.setProperty('--ico-ketupat', `url(${S.ketupat.toDataURL()})`);
  root.setProperty('--ico-lemang', `url(${S.lemangIcon.toDataURL()})`);
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
// Audio — gamelan Melayu & zapin raya (gubahan asal, disintesis WebAudio)
//   menu   : gamelan Melayu (saron, keromong, gambang, kenong, gong agung, gendang ibu/anak)
//   Kg. Ketupat : cha-cha raya, G major (biola, akordion, bass petik, guiro, konga, tamborin, kompang, gong)
//   Kg. Lemang  : inang raya, D major (seruling, biola, akordion, gendang ibu/anak, rebana, kompang, gong)
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
// ---- Lagu raya klasik (gubahan asal) ----
// Ciri lagu raya 1950-90an: tonaliti major, biola + akordion + orkestra kecil, rebana & gong,
// rentak joget/inang dan rentak Latin seperti cha-cha (cth. "Selamat Hari Raya", 1955).
function chord(name) { const m = name.match(/^([A-G][#b]?)(m?)(7?)$/); return { root: MIDI(m[1] + '3'), iv: m[2] ? [0, 3, 7] : m[3] ? [0, 4, 7, 10] : [0, 4, 7] }; }
function harm(m, scale, steps) {
  // naik/turun `steps` darjah dalam skala (cth. 2 = harmoni ketiga)
  const pcs = scale.map((x) => x % 12), pc = ((m % 12) + 12) % 12, i = pcs.indexOf(pc);
  if (i < 0) return m + (steps > 0 ? 4 : -3);
  const j = i + steps, oct = Math.floor(j / 7), jj = ((j % 7) + 7) % 7;
  const rel = (k) => (pcs[k] - pcs[0] + 12) % 12;
  return m - rel(i) + rel(jj) + 12 * oct;
}
// Kampung Ketupat: rentak cha-cha raya, G major
const SONG_CHACHA = seqToSong([
  [['D5', 2], ['B4', 2], ['D5', 2], ['E5', 2], ['D5', 4], ['B4', 2], ['G4', 2]],
  [['A4', 2], ['B4', 2], ['C5', 2], ['B4', 2], ['A4', 6], ['-', 2]],
  [['C5', 2], ['A4', 2], ['C5', 2], ['D5', 2], ['C5', 4], ['A4', 2], ['F#4', 2]],
  [['G4', 2], ['A4', 2], ['B4', 2], ['A4', 2], ['G4', 6], ['-', 2]],
  [['B4', 2], ['C5', 2], ['D5', 2], ['G5', 4], ['F#5', 2], ['E5', 2], ['D5', 2]],
  [['E5', 2], ['C5', 2], ['E5', 2], ['G5', 2], ['F#5', 4], ['E5', 2], ['D5', 2]],
  [['C5', 2], ['B4', 2], ['A4', 2], ['B4', 2], ['C5', 2], ['E5', 2], ['D5', 2], ['C5', 2]],
  [['A4', 2], ['B4', 2], ['C5', 2], ['A4', 2], ['D5', 6], ['-', 2]],
  [['G5', 3], ['F#5', 1], ['E5', 2], ['D5', 2], ['E5', 2], ['D5', 2], ['B4', 4]],
  [['C5', 3], ['B4', 1], ['A4', 2], ['G4', 2], ['A4', 2], ['B4', 2], ['C5', 4]],
  [['D5', 3], ['C5', 1], ['B4', 2], ['A4', 2], ['B4', 2], ['C5', 2], ['D5', 2], ['E5', 2]],
  [['F#5', 2], ['E5', 2], ['D5', 2], ['C5', 2], ['D5', 6], ['-', 2]],
  [['B4', 2], ['D5', 2], ['G5', 2], ['D5', 2], ['E5', 2], ['C5', 2], ['A4', 4]],
  [['A4', 2], ['C5', 2], ['F#5', 2], ['E5', 2], ['D5', 2], ['C5', 2], ['B4', 4]],
  [['C5', 2], ['E5', 2], ['D5', 2], ['B4', 2], ['A4', 2], ['B4', 2], ['F#4', 2], ['A4', 2]],
  [['G4', 10], ['-', 6]],
]);
SONG_CHACHA.chords = ['G', 'D7', 'D7', 'G', 'G', 'C', 'Am', 'D7', 'Em', 'C', 'G', 'D7', 'G', 'D', 'D7', 'G'].map(chord);
const CHA_SCALE = [67, 69, 71, 72, 74, 76, 78];
const CHA_BPM = [0, 120, 126, 130, 134];
const CHA_CONGA = 'm...s...m...O.O.', CHA_GUIRO = 'L...s.s.L...s.s.', CHA_COMP = '..x...x...x.x.x.', CHA_TAMB = '..t...t...t...t.';
// Kampung Lemang: rentak inang raya, D major, seruling di hadapan
const SONG_INANG = seqToSong([
  [['A4', 4], ['F#4', 2], ['A4', 2], ['B4', 2], ['A4', 2], ['F#4', 4]],
  [['E4', 2], ['F#4', 2], ['A4', 2], ['B4', 2], ['A4', 8]],
  [['D5', 4], ['B4', 2], ['D5', 2], ['E5', 2], ['D5', 2], ['B4', 4]],
  [['A4', 2], ['B4', 2], ['A4', 2], ['F#4', 2], ['E4', 8]],
  [['F#4', 2], ['A4', 2], ['B4', 2], ['D5', 2], ['E5', 4], ['F#5', 2], ['E5', 2]],
  [['D5', 2], ['B4', 2], ['A4', 2], ['B4', 2], ['D5', 8]],
  [['B4', 2], ['A4', 2], ['F#4', 2], ['E4', 2], ['F#4', 2], ['A4', 2], ['B4', 2], ['A4', 2]],
  [['F#4', 2], ['E4', 2], ['D4', 12]],
  [['D5', 2], ['E5', 2], ['F#5', 4], ['E5', 2], ['D5', 2], ['B4', 4]],
  [['A4', 2], ['B4', 2], ['D5', 4], ['B4', 2], ['A4', 2], ['F#4', 4]],
  [['G4', 2], ['A4', 2], ['B4', 4], ['A4', 2], ['G4', 2], ['E4', 4]],
  [['F#4', 2], ['G4', 2], ['A4', 12]],
  [['B4', 2], ['D5', 2], ['E5', 4], ['D5', 2], ['B4', 2], ['A4', 4]],
  [['F#4', 2], ['A4', 2], ['B4', 4], ['A4', 2], ['F#4', 2], ['E4', 4]],
  [['G4', 2], ['F#4', 2], ['E4', 2], ['F#4', 2], ['A4', 4], ['C#5', 2], ['E5', 2]],
  [['D5', 12], ['-', 4]],
]);
SONG_INANG.chords = ['D', 'A', 'G', 'A', 'D', 'G', 'Bm', 'D', 'D', 'Bm', 'Em', 'A7', 'G', 'D', 'A7', 'D'].map(chord);
const INANG_SCALE = [62, 64, 66, 67, 69, 71, 73];
const INANG_BPM = [0, 104, 110, 114, 118];
const GENDANG_INANG = 'D...T.D.T.t.D.T.', GENDANG_INANG_ANAK = '.t.t...t.t.t...t', REBANA_I = '..t...t...t...t.', INANG_STAB = '..x...x...x...x.';
const HEART = 'B..B......B..B..';

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

  // seruling buluh: sinus lembut + nafas + vibrato
  flute(f, t, dur, vol, dest) {
    const c = this.ctx, g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(), end = t + Math.max(0.08, dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.04); g.gain.setValueAtTime(vol * 0.85, Math.max(t + 0.041, end - 0.02)); g.gain.exponentialRampToValueAtTime(0.0001, end + 0.1);
    lfo.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.3, dur + 0.05)); lfo.connect(lg);
    const o1 = c.createOscillator(); o1.type = 'sine'; o1.frequency.value = f; lg.connect(o1.frequency); o1.connect(g);
    const o2 = c.createOscillator(), g2 = c.createGain(); o2.type = 'triangle'; o2.frequency.value = f * 2; g2.gain.value = 0.12; lg.connect(o2.frequency); o2.connect(g2); g2.connect(g);
    o1.start(t); o2.start(t); lfo.start(t); o1.stop(end + 0.12); o2.stop(end + 0.12); lfo.stop(end + 0.12);
    g.connect(dest || this.musicGain);
    this.noiseHit(t, 0.06, vol * 0.25, 'bandpass', f * 2, 2, dest || this.musicGain);
  },
  guiro(t, vol, long) { const n = long ? 7 : 3; for (let i = 0; i < n; i++) this.noiseHit(t + i * 0.017, 0.015, vol * (1 - i / (n * 1.6)), 'bandpass', 3200, 2.5); },
  tamb(t, vol) { this.noiseHit(t, 0.09, vol, 'highpass', 7500); this.env('sine', 6100, t, 0.06, vol * 0.25, this.musicGain); },
  conga(t, vol, type) {
    const d = this.musicGain;
    if (type === 'O') { this.env('sine', 196, t, 0.18, vol, d, { f0: 232, glide: 0.04 }); this.noiseHit(t, 0.02, vol * 0.3, 'bandpass', 1500, 1, d); }
    else if (type === 's') { this.noiseHit(t, 0.05, vol, 'bandpass', 2600, 1.2, d); this.env('triangle', 420, t, 0.04, vol * 0.4, d); }
    else { this.env('sine', 250, t, 0.05, vol * 0.7, d); this.noiseHit(t, 0.02, vol * 0.4, 'bandpass', 1800, 1, d); }
  },
  accChordQ(ch, t, dur, vol) { const r = 62 + (((ch.root - 62) % 12) + 12) % 12; for (const iv of ch.iv) this.accNote(mf(r + iv - (iv > 9 ? 12 : 0)), t, dur, vol); },

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
  horn() { if (!this.ctx) return; const t = this.at(); for (const [f, d] of [[392, 0], [494, 0], [392, 0.26], [494, 0.26]]) this.env('square', f, t + d, 0.2, 0.06, this.master, { attack: 0.01 }); },
  engine() { if (!this.ctx) return; const t = this.at(); this.env('sawtooth', 58, t, 2.6, 0.1, this.master, { attack: 0.3, fEnd: 90, glide: 2.4, wob: 18, wobDepth: 0.12 }); this.noiseHit(t + 1.2, 1.2, 0.08, 'lowpass', 300); },
  chirp() { if (!this.ctx) return; const t = this.at(); this.env('sine', 2400, t, 0.08, 0.04, this.master, { f0: 1800, glide: 0.06 }); this.env('sine', 2700, t + 0.11, 0.08, 0.035, this.master, { f0: 2000, glide: 0.06 }); },
  krak() { if (!this.ctx) return; const t = this.at(); for (let i = 0; i < 4; i++) this.noiseHit(t + i * 0.05, 0.05, 0.22, 'bandpass', 900 + i * 300, 2); this.env('sawtooth', 120, t, 0.3, 0.06, this.master, { f0: 220, glide: 0.25 }); },
  splatS() { if (!this.ctx) return; this.noiseHit(this.at(), 0.08, 0.12, 'lowpass', 1200); },
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
    const st = this.sstep++;
    return this.village === 'lemang' ? this.stepInang(st, t) : this.stepChacha(st, t);
  },
  stepChacha(step, t) {
    const S0 = SONG_CHACHA, s = step % S0.len, bar = s >> 4, b = s & 15, L = this.level || 1, T = this.tense;
    const d = 60 / (CHA_BPM[L] * (T ? 1.12 : 1)) / 4, ch = S0.chords[bar], next = S0.chords[(bar + 1) % S0.bars];
    if (b === 0 && bar % 8 === 0) this.gong(t, 0.4);
    const on = S0.onset[s];
    if (on) {
      this.violin(mf(on.m), t, on.len * d * 0.95, 0.1);
      if (L >= 2) this.accNote(mf(on.m - 12), t, on.len * d * 0.9, 0.028);
      if (L >= 3 && !T) this.flute(mf(harm(on.m, CHA_SCALE, 2) + 12), t, on.len * d * 0.9, 0.03);
      if (L >= 4) this.violin(mf(on.m + 12), t, on.len * d * 0.9, 0.028);
    }
    if (b === 0) this.gambus(mf(ch.root), t, 0.32, d * 3, { dark: true });
    if (b === 8) this.gambus(mf(ch.root + 7), t, 0.26, d * 3, { dark: true });
    if (b === 14) this.gambus(mf(next.root), t, 0.26, d * 2, { dark: true });
    if (CHA_COMP[b] === 'x') this.accChordQ(ch, t, d * 1.1, 0.026);
    const cg = CHA_CONGA[b]; if (cg !== '.') this.conga(t, cg === 'O' ? 0.3 : cg === 's' ? 0.26 : 0.2, cg);
    const gu = CHA_GUIRO[b]; if (gu === 'L') this.guiro(t, 0.06, true); else if (gu === 's') this.guiro(t, 0.045, false);
    if (L >= 2 && CHA_TAMB[b] === 't') this.tamb(t, 0.05);
    if (L >= 2 && (bar % 8 === 7 || L >= 4)) { const kp = KOMPANG_16[b]; if (kp === 'P') this.kompang(t, 0.2, false); else if (kp === 'p') this.kompang(t, 0.1, false); else if (kp === 'K') this.kompang(t, 0.17, true); }
    if (T) { if (HEART[b] === 'B') this.dok(t, 0.5); if (b % 2 === 0) this.violin(mf(ch.root + 24), t, d * 0.9, 0.022); }
    return d;
  },
  stepInang(step, t) {
    const S0 = SONG_INANG, s = step % S0.len, bar = s >> 4, b = s & 15, L = this.level || 1, T = this.tense;
    const d = 60 / (INANG_BPM[L] * (T ? 1.12 : 1)) / 4, ch = S0.chords[bar];
    if (b === 0 && bar % 4 === 0) this.gong(t, 0.42);
    if (b === 8 && bar % 4 === 2) this.kenong(noteF('A3'), t, 0.09);
    const on = S0.onset[s];
    if (on) {
      this.flute(mf(on.m + 12), t, on.len * d * 0.95, 0.075);
      if (L >= 2) this.violin(mf(harm(on.m, INANG_SCALE, -2)), t, on.len * d * 0.9, 0.04);
      if (L >= 4) this.accNote(mf(on.m), t, on.len * d * 0.9, 0.022);
    }
    if (b === 0) this.gambus(mf(ch.root), t, 0.32, d * 4, { dark: true });
    if (b === 10) this.gambus(mf(ch.root + 7), t, 0.26, d * 3, { dark: true });
    if (b === 0 || b === 8) this.accChordQ(ch, t, d * 7, 0.013);
    if (L >= 3 && INANG_STAB[b] === 'x') this.accChordQ(ch, t, d, 0.016);
    const gd = GENDANG_INANG[b]; if (gd === 'D') this.gDung(t, 0.45); else if (gd === 'T') this.gTak(t, 0.27); else if (gd === 't') this.gTak(t, 0.12);
    if (L >= 2 && GENDANG_INANG_ANAK[b] === 't') this.gTak(t, 0.08);
    if (L >= 2 && REBANA_I[b] === 't') this.tak(t, 0.09, 3400);
    if (L >= 3) { const kp = KOMPANG_16[b]; if (kp === 'P') this.kompang(t, 0.16, false); else if (kp === 'K') this.kompang(t, 0.14, true); if (b % 4 === 0) this.ching(t, 0.022); }
    if (T) { if (HEART[b] === 'B') this.dok(t, 0.5); if (b % 2 === 0) this.violin(mf(ch.root + 24), t, d * 0.9, 0.02); }
    return d;
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
    const keep = { ctx: this.ctx, master: this.master, musicGain: this.musicGain, noiseBuf: this.noiseBuf, ksCache: this.ksCache, track: this.track, level: this.level, tense: this.tense, village: this.village, cur: this.cur, sstep: this.sstep };
    this.attach(off, true);
    let t0 = 0.05;
    for (const p of parts) {
      this.track = p.track; this.level = p.level || 1; this.tense = !!p.tense; this.village = p.village || 'ketupat'; this.cur = null; this.sstep = 0;
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
    const type = pick(['palm', 'palm', 'banana', 'bush', 'bush', 'pagar', 'jemuran']);
    const w = { palm: 34, banana: 30, bush: 26, pagar: 40, jemuran: 42 }[type];
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

// ---- Kampung Lemang: rumah berjauhan, orang tepi jalan tunggu balang di antara rumah ----
function buildLevelLemang(seed) {
  rand = mulberry32(seed);
  const L = { houses: [], obs: [], items: [], crossings: [], decor: [], geese: [], motors: [], signs: [], endX: 0 };
  const names = shuffle(NAMES), onames = shuffle(NAMES_ORANG);
  let x = 300, hn = 0, on = 0;
  const kets = new Set([9, 17, 24]);
  for (let i = 0; i < TOTAL; i++) {
    const ph = phaseOfIdx(i), sp = speedAtIdx(i), isHouse = i % 2 === 0;
    const gap = Math.round(lerp(335, 385, i / (TOTAL - 1))) + ri(-15, 20);
    const sx = x + gap;
    fillHazardsL(L, x + 20, sx - (isHouse ? 30 : 40), i, ph, sp);
    if (kets.has(i)) L.items.push({ type: 'ketupat', x: sx - 40, y: GY - 46, taken: false });
    if (isHouse) {
      L.houses.push({ kind: 'house', x: sx, w: 78, idx: i + 1, name: names[hn++], state: 'pending', v: ri(0, 3), zone: [sx + 12, sx + 66], thanks: 0 });
      x = sx + 78 + 24;
    } else {
      L.houses.push({ kind: 'orang', x: sx, w: 14, idx: i + 1, name: onames[on++ % onames.length], state: 'pending', v: ri(0, 2), zone: [sx - 14, sx + 26], thanks: 0 });
      x = sx + 14 + 40;
    }
  }
  L.junctionX = x + 130; L.lastHouseX = L.junctionX - 110; L.endX = L.junctionX + 220;
  const blocked = (a, b) => L.houses.some((h) => overlap(a, b, h.x - (h.kind === 'orang' ? 10 : 18), h.x + h.w + 6)) || L.crossings.some((c) => overlap(a, b, c.x - 30, c.x + c.len + 6))
    || L.obs.some((o) => o.type === 'pokok' && overlap(a, b, o.x - 6, o.x + o.w + 30)) || overlap(a, b, L.junctionX - 10, L.junctionX + 50);
  let d = 30;
  while (d < L.endX + 400) {
    const type = pick(['bigtree', 'bigtree', 'buluh', 'buluh', 'pakis', 'pakis', 'banana', 'unggun']);
    const w = { bigtree: 40, buluh: 34, pakis: 24, banana: 30, unggun: 32 }[type];
    if (!blocked(d, d + w)) L.decor.push({ type, x: d });
    d += w + ri(4, 40);
  }
  const pelStart = L.houses[15].x - 60;
  for (let p = pelStart; p < L.endX + 300; p += 52) if (!L.crossings.some((c) => overlap(p - 4, p + 8, c.x - 4, c.x + c.len + 4))) L.decor.push({ type: 'pelita', x: p });
  for (const c of L.crossings) if (c.broken) L.signs.push({ x: c.x - 30 });
  L.decor.sort((a, b) => a.x - b.x); L.obs.sort((a, b) => a.x - b.x); L.items.sort((a, b) => a.x - b.x); L.crossings.sort((a, b) => a.x - b.x); L.motors.sort((a, b) => a.x - b.x);
  return L;
}
function fillHazardsL(L, a, b, i, ph, sp) {
  const minGap = sp * 0.85 + 24;
  let cur = a + rr(10, 40);
  if (i === 15 && !L.motors.length) { L.motors.push({ x: cur + 30 - PX - Math.round(sp * 1.7) }); cur += 30 + minGap * 2.2; }   // satu motor besar
  const weights = [
    { lubang: 2.5, batu: 2.5, pokok: i >= 2 ? 1.4 : 0, burung: i >= 1 ? 1.2 : 0, bridge: 1, kuih: 1.4 },
    { lubang: 2, batu: 2, pokok: 2.2, burung: 2, broken: 0.8, bridge: 0.5, kuih: 1.3 },
    { lubang: 2, batu: 2, pokok: 2.2, burung: 2, broken: 1.6, kuih: 1.1 },
    { lubang: 2, batu: 2, pokok: 2.4, burung: 2.2, broken: 1.8, kuih: 1 },
  ][ph];
  const count = [i < 2 ? 1 : 2, 2, 3, 3][ph];
  let placed = 0, guard = 0;
  while (cur < b - 16 && guard++ < 20) {
    let total = 0; for (const k in weights) total += weights[k];
    let r = rand() * total, type = 'lubang';
    for (const k in weights) { r -= weights[k]; if (r <= 0) { type = k; break; } }
    if (placed >= count && type !== 'kuih') type = 'kuih';
    if (type === 'bridge' || type === 'broken') {
      const broken = type === 'broken', len = broken ? ri(74, 88) : ri(54, 66);
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
    } else if (type === 'burung') {
      // burung enggang lalu & jatuhkan tahi; kesan tahi di jalan perlu dilompat
      L.obs.push({ type: 'burung', x: cur, w: 12, h: 3, hit: false, state: 'wait', fy: 0, vy: 0, bx: 0, by: 0, t: 0 });
      cur += 12 + minGap * rr(1.1, 1.5); placed++;
    } else {
      const dims = { lubang: [ri(18, 24), 3], batu: [15, 11], pokok: [32, 9] }[type];
      const o = { type, x: cur, w: dims[0], h: dims[1], hit: false, state: 'wait', fy: -14, vy: 0, t: 0 };
      L.obs.push(o); placed++;
      if (type !== 'pokok' && rand() < 0.45) for (let k = 0; k < 3; k++) L.items.push({ type: 'kuih', k: ri(0, 3), x: cur + o.w / 2 - 14 + k * 14, y: GY - 34 - (k === 1 ? 8 : 0), taken: false });
      cur += o.w + minGap * rr(type === 'pokok' ? 1.3 : 1, 1.5);
    }
  }
}

// ============================================================
// Keadaan permainan
// ============================================================
const G = {
  state: 'menu', village: 'ketupat', lastVillage: store.get('vrtb_village', 'ketupat'), motor: null, motorIdx: 0, level: null, cam: 0, speed: 0, tod: 0.06, todForced: null, anim: 0,
  score: 0, delivered: 0, processed: 0, lives: 3, combo: 0, bestCombo: 0, kuih: 0, time: 0, perfects: 0,
  player: null, goose: null, fx: [], hitstop: 0, particles: [], popups: [], packages: [], fireworks: [], confetti: [],
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
// sprite cahaya siap-lukis (malam lebih ringan)
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
  LIGHT.coneHole = cone('0,0,0', 0.75, 1); LIGHT.coneGlow = cone('255,236,150', 0.35, 1);
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
const SKY_KETUPAT = [
  { t: 0.00, c: ['#3f9be8', '#7cc4f5', '#c9ecff'], tint: [0, 0, 0, 0], dark: 0 },
  { t: 0.21, c: ['#3f9be8', '#7cc4f5', '#c9ecff'], tint: [0, 0, 0, 0], dark: 0 },
  { t: 0.29, c: ['#ee8f3c', '#f7bd5a', '#ffe6a6'], tint: [255, 150, 40, 0.13], dark: 0 },
  { t: 0.49, c: ['#ee8f3c', '#f7bd5a', '#ffe6a6'], tint: [255, 150, 40, 0.13], dark: 0 },
  { t: 0.56, c: ['#4a2f7a', '#d55a78', '#ffa552'], tint: [190, 70, 120, 0.24], dark: 0.04 },
  { t: 0.71, c: ['#41286e', '#c94f74', '#ff9a4e'], tint: [190, 70, 120, 0.28], dark: 0.12 },
  { t: 0.79, c: ['#070b26', '#141c4a', '#2a2f6a'], tint: [20, 30, 90, 0.30], dark: 0.64 },
  { t: 1.00, c: ['#070b26', '#141c4a', '#2a2f6a'], tint: [20, 30, 90, 0.30], dark: 0.64 },
].map((k) => ({ ...k, rgb: k.c.map(hex2rgb) }));
// Kampung Lemang: hutan lebat — tengah hari sudah redup macam senja, kebiruan (bukan kekuningan)
const SKY_LEMANG = [
  { t: 0.00, c: ['#29434e', '#47707a', '#78a0a2'], tint: [30, 60, 95, 0.22], dark: 0.16 },
  { t: 0.21, c: ['#29434e', '#47707a', '#78a0a2'], tint: [30, 60, 95, 0.22], dark: 0.18 },
  { t: 0.29, c: ['#22394a', '#3d5f6e', '#62868a'], tint: [30, 50, 95, 0.26], dark: 0.26 },
  { t: 0.49, c: ['#22394a', '#3d5f6e', '#62868a'], tint: [30, 50, 95, 0.26], dark: 0.3 },
  { t: 0.56, c: ['#1a2741', '#2f4364', '#4c6283'], tint: [30, 40, 100, 0.3], dark: 0.42 },
  { t: 0.71, c: ['#1a2741', '#2f4364', '#4c6283'], tint: [30, 40, 100, 0.3], dark: 0.48 },
  { t: 0.79, c: ['#060a1a', '#0f1831', '#1b2846'], tint: [20, 30, 90, 0.32], dark: 0.66 },
  { t: 1.00, c: ['#060a1a', '#0f1831', '#1b2846'], tint: [20, 30, 90, 0.32], dark: 0.66 },
].map((k) => ({ ...k, rgb: k.c.map(hex2rgb) }));
const VILLAGES = {
  ketupat: { id: 'ketupat', name: 'Kampung Ketupat', short: 'Kg. Ketupat', sky: SKY_KETUPAT, phases: PHASES, clock: [[0, 8], [0.27, 14.5], [0.53, 18.4], [0.77, 19.9], [1, 22.5]] },
  lemang: { id: 'lemang', name: 'Kampung Lemang', short: 'Kg. Lemang', sky: SKY_LEMANG, phases: PHASES_LEMANG, clock: [[0, 12], [0.27, 15.5], [0.53, 18.6], [0.77, 20], [1, 22.5]] },
};
const VIL = () => VILLAGES[G.village] || VILLAGES.ketupat;
const isLemang = () => G.village === 'lemang';
function skyAt(t) {
  const SKY = VIL().sky;
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
  const K = VIL().clock;
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
// ---------------- Kampung Lemang: latar hutan ----------------
const FOREST_FAR = new Int16Array(512), FOREST_MID = new Int16Array(512);
for (let i = 0; i < 512; i++) {
  const a = (i / 512) * Math.PI * 2;
  FOREST_FAR[i] = Math.round(62 + 7 * Math.sin(a * 6) + 5 * Math.sin(a * 17 + 1) + 4 * Math.abs(Math.sin(a * 37 + 2)) * 2);
  FOREST_MID[i] = Math.round(34 + 6 * Math.sin(a * 9 + 0.7) + 5 * Math.abs(Math.sin(a * 29)) * 2 + 3 * Math.sin(a * 53));
}
const FOREST_TRUNKS = (() => { const r = mulberry32(77); const out = []; let x = 0; while (x < 480) { out.push({ x, w: 3 + Math.floor(r() * 4), top: 100 + Math.floor(r() * 40), c: r() }); x += 18 + Math.floor(r() * 34); } return out; })();
const FIREFLIES = Array.from({ length: 18 }, (_, i) => ({ x: (hash(i * 5 + 3) * 0.5 + 0.5) * W, y: 186 + (hash(i * 9 + 1) * 0.5 + 0.5) * 70, p: hash(i * 13) * 6 }));
function forestOpen() { const L = G.level; return isLemang() && L && L.junctionX ? clamp((G.cam - (L.junctionX - 560)) / 320, 0, 1) : 0; }
function drawForestBack(c, t) {
  const cam = G.cam;
  // barisan pokok jauh
  let o = Math.floor(cam * 0.06);
  c.fillStyle = '#3d6b6a'; for (let x = 0; x < W; x++) { const h = FOREST_FAR[(x + o) & 511]; c.fillRect(x, 206 - h, 1, h); }
  c.fillStyle = '#4f807d'; for (let x = 0; x < W; x++) { const h = FOREST_FAR[(x + o) & 511]; c.fillRect(x, 206 - h, 1, 1); }
  // batang pokok hutan (parallax 0.3)
  const off = cam * 0.3;
  for (const tr of FOREST_TRUNKS) {
    let x = Math.round(tr.x - (off % 480)); if (x < -20) x += 480; if (x > W + 4) continue;
    c.fillStyle = tr.c > 0.5 ? '#2a4a46' : '#24403e'; c.fillRect(x, tr.top, tr.w, 214 - tr.top);
    c.fillStyle = '#35605a'; c.fillRect(x, tr.top, 1, 214 - tr.top);
    c.fillStyle = '#2c5a4c'; pixCircle(c, x + (tr.w >> 1), tr.top, 9 + tr.w); c.fillStyle = '#36705a'; pixCircle(c, x + (tr.w >> 1) - 3, tr.top - 3, 5 + (tr.w >> 1));
  }
  // semak lapisan tengah
  o = Math.floor(cam * 0.45);
  c.fillStyle = '#2c5a3e'; for (let x = 0; x < W; x++) { const h = FOREST_MID[(x + o) & 511]; c.fillRect(x, 232 - h * 0.6, 1, h * 0.6 + 2); }
  c.fillStyle = '#3a7048'; for (let x = 0; x < W; x++) { const h = FOREST_MID[(x + o) & 511]; c.fillRect(x, 232 - h * 0.6, 1, 1); }
  // lantai hutan berlapis (ganti sawah)
  const rows = [6, 7, 8, 9, 10, 12]; let y = 222;
  for (let j = 0; j < rows.length; j++) {
    const h = rows[j], f = 0.5 + j * 0.08, of = cam * f, sp = 7 + j * 2;
    c.fillStyle = j % 2 ? '#2f6a3e' : '#2a5f38'; c.fillRect(0, y, W, h);
    c.fillStyle = '#3f8a4a';
    for (let x = -(of % sp); x < W; x += sp) { c.fillRect(Math.round(x), y, 2, 1); c.fillRect(Math.round(x) + 1, y - 1, 1, 1); }
    c.fillStyle = '#204a2c'; for (let x = -(of % (sp * 3)); x < W; x += sp * 3) c.fillRect(Math.round(x) + 3, y + h - 2, 4, 2);
    y += h;
  }
  // sinar cahaya menembusi kanopi
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) {
    const bx = ((k * 97 - cam * 0.2 + G.anim * 3) % 300 + 300) % 300 - 40, a = 0.05 + 0.02 * Math.sin(G.anim * 0.7 + k);
    c.fillStyle = `rgba(200,230,240,${a})`; c.beginPath(); c.moveTo(bx, 40); c.lineTo(bx + 14, 40); c.lineTo(bx + 70, 254); c.lineTo(bx + 46, 254); c.closePath(); c.fill();
  }
  c.restore();
  // kabus
  c.fillStyle = 'rgba(160,195,205,0.14)'; c.fillRect(0, 196, W, 34);
  // kelip-kelip (senja & malam)
  const dark = skyAt(t).dark;
  if (dark > 0.3) {
    let n = 0;
    for (const f of FIREFLIES) {
      const fx = ((f.x - cam * 0.5 + Math.sin(G.anim * 0.6 + f.p) * 12) % W + W) % W, fy = f.y + Math.sin(G.anim * 1.3 + f.p) * 6;
      if (Math.sin(G.anim * 2.5 + f.p * 3) < 0.2) continue;
      c.fillStyle = '#d8ff7a'; c.fillRect(Math.round(fx), Math.round(fy), 1, 1);
      if (n++ < 10) G.lights.push({ x: fx, y: fy, r: 7, i: 0.6 });
    }
  }
}
function drawVergeL(c) {
  c.fillStyle = '#244f2c'; c.fillRect(0, VERGE_TOP - 1, W, 1);
  c.fillStyle = '#2f633a'; c.fillRect(0, VERGE_TOP, W, ROAD_TOP - VERGE_TOP);
  const o = G.cam % 11;
  for (let x = -o; x < W; x += 11) {
    c.fillStyle = '#4a9a4a'; c.fillRect(Math.round(x), VERGE_TOP + 4, 1, 3); c.fillRect(Math.round(x) + 1, VERGE_TOP + 3, 1, 2); c.fillRect(Math.round(x) - 1, VERGE_TOP + 5, 1, 2);
    c.fillStyle = '#7a5232'; c.fillRect(Math.round(x) + 6, VERGE_TOP + 9, 2, 1);
  }
}
function drawRoadL(c) {
  c.fillStyle = '#3f8a3e'; c.fillRect(0, ROAD_TOP, W, 2);
  c.fillStyle = '#a45a3a'; c.fillRect(0, ROAD_TOP + 2, W, ROAD_BOT - ROAD_TOP - 4);
  c.fillStyle = '#c47a52'; c.fillRect(0, ROAD_TOP + 2, W, 1);
  c.fillStyle = '#8a4630'; c.fillRect(0, 273, W, 1); c.fillRect(0, 287, W, 1);
  c.fillStyle = '#3f8a3e'; c.fillRect(0, ROAD_BOT - 2, W, 2);
  const t0 = Math.floor(G.cam / 30);
  for (let k = t0; k < t0 + 9; k++) {
    const h = hash(k * 23 + 5), x = Math.round(k * 30 - G.cam + h * 14);
    c.fillStyle = '#c88a62'; c.fillRect(x, 278 + Math.round(h * 5), 2, 1);
    c.fillStyle = '#7a3e28'; c.fillRect(x + 9, 270 + Math.round(h * 4), 3, 1);
    if (h > 0.4) { c.fillStyle = '#3f8a3e'; c.fillRect(x + 4, 290, 1, 2); c.fillRect(x + 5, 289, 1, 3); }
  }
}
function drawFrontL(c) {
  c.fillStyle = '#244f2c'; c.fillRect(0, ROAD_BOT, W, CANAL_TOP - ROAD_BOT);
  c.fillStyle = '#2f633a'; c.fillRect(0, ROAD_BOT, W, 2);
  c.fillStyle = '#245a66'; c.fillRect(0, CANAL_TOP, W, CANAL_BOT - CANAL_TOP);
  c.fillStyle = '#2f6e7a'; c.fillRect(0, CANAL_TOP + 2, W, CANAL_BOT - CANAL_TOP - 4);
  c.fillStyle = '#7fb8c0';
  const o = (G.cam * 1.05 + G.anim * 9) % 36;
  for (let x = -o; x < W; x += 36) { c.fillRect(Math.round(x), CANAL_TOP + 7, 6, 1); c.fillRect(Math.round(x + 17), CANAL_TOP + 14, 5, 1); c.fillRect(Math.round(x + 27), CANAL_TOP + 19, 4, 1); }
  const ro = (G.cam * 1.05) % 70;
  for (let x = -ro; x < W + 70; x += 70) {
    c.fillStyle = '#4a5260'; pixCircle(c, Math.round(x + 20), CANAL_TOP + 12, 4); c.fillStyle = '#6a7486'; pixCircle(c, Math.round(x + 19), CANAL_TOP + 11, 2);
    c.fillStyle = '#4a9a48'; c.fillRect(Math.round(x + 17), CANAL_TOP + 8, 4, 1);
  }
  c.fillStyle = '#21462a'; c.fillRect(0, CANAL_BOT, W, H - CANAL_BOT);
  c.fillStyle = '#1a3a22'; c.fillRect(0, CANAL_BOT, W, 2);
  const o2 = (G.cam * 1.15) % 29;
  for (let x = -o2; x < W; x += 29) {
    c.fillStyle = '#3f8a3e'; c.fillRect(Math.round(x), CANAL_BOT + 9, 1, 4); c.fillRect(Math.round(x) + 2, CANAL_BOT + 8, 1, 5); c.fillRect(Math.round(x) - 2, CANAL_BOT + 10, 1, 3);
    c.fillStyle = '#8a5a34'; c.fillRect(Math.round(x) + 14, CANAL_BOT + 26, 3, 1);
  }
  const o3 = (G.cam * 1.15) % 83;
  for (let x = -o3; x < W; x += 83) {   // cendawan merah
    const mx = Math.round(x + 40); c.fillStyle = '#efe6d0'; c.fillRect(mx + 1, CANAL_BOT + 19, 2, 3);
    c.fillStyle = '#d93a3a'; c.fillRect(mx - 1, CANAL_BOT + 17, 6, 2); c.fillRect(mx, CANAL_BOT + 16, 4, 1); c.fillStyle = '#fff'; c.fillRect(mx + 1, CANAL_BOT + 17, 1, 1);
  }
}
function drawCanopy(c, open) {
  if (open >= 1) return;
  c.save(); c.globalAlpha = 1 - open;
  const o = G.cam * 1.05;
  c.fillStyle = '#13301f'; c.fillRect(0, 0, W, 40);
  for (let x = -(o % 14) - 14; x < W + 14; x += 14) {
    const k = Math.floor((x + o) / 14), h = hash(k * 7 + 1) * 0.5 + 0.5;
    c.fillStyle = '#13301f'; pixCircle(c, Math.round(x + 7), 40, Math.round(8 + h * 7));
    c.fillStyle = '#1c4329'; pixCircle(c, Math.round(x + 5), 38 + Math.round(h * 4), Math.round(4 + h * 4));
    if (h > 0.72) {   // akar berjuntai / rotan
      const vx = Math.round(x + 9), vl = 30 + Math.round(h * 40);
      c.fillStyle = '#2a5a32'; c.fillRect(vx, 44, 1, vl);
      for (let y = 50; y < 44 + vl; y += 9) { c.fillStyle = '#3f8a3e'; c.fillRect(vx - 2, y, 2, 1); c.fillRect(vx + 1, y + 4, 2, 1); }
    }
  }
  c.restore();
}

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
  if (t < 0.74 && G.state !== 'menu' && !isLemang()) {
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
    else if (d.type === 'jemuran') c.drawImage(S.jemuran, sx, ROAD_TOP - 28);
    else if (d.type === 'pagar') {
      c.fillStyle = PAL.ink; c.fillRect(sx - 1, ROAD_TOP - 13, 42, 1);
      for (let x = 0; x < 40; x += 6) { c.fillStyle = PAL.ink; c.fillRect(sx + x - 1, ROAD_TOP - 13, 4, 13); c.fillStyle = '#e8dcc0'; c.fillRect(sx + x, ROAD_TOP - 12, 2, 12); }
      c.fillStyle = '#e8dcc0'; c.fillRect(sx, ROAD_TOP - 9, 40, 2);
    } else if (d.type === 'bigtree') c.drawImage(S.bigtree, sx - 4, ROAD_TOP - 110);
    else if (d.type === 'buluh') c.drawImage(S.bamboo, sx, ROAD_TOP - 80);
    else if (d.type === 'pakis') c.drawImage(S.fern, sx, ROAD_TOP - 14);
    else if (d.type === 'unggun') {
      // unggun lemang: buluh lemang dibakar, bara, asap & cahaya
      c.drawImage(S.unggun, sx, ROAD_TOP - 27);
      for (let k = 0; k < 3; k++) { const fl = Math.sin(G.anim * 16 + k * 2 + d.x) > 0 ? 1 : 0; c.fillStyle = PAL.flameO; c.fillRect(sx + 9 + k * 6, ROAD_TOP - 8 - fl, 3, 3 + fl); c.fillStyle = PAL.flame; c.fillRect(sx + 10 + k * 6, ROAD_TOP - 7 - fl, 1, 2); }
      for (let k = 0; k < 3; k++) { const ph = (G.anim * 0.45 + k / 3 + d.x * 0.01) % 1, spr = S.puff.smoke[Math.min(4, Math.floor(ph * 5))], z = Math.round(10 + ph * 14); c.globalAlpha = clamp(0.7 - ph * 0.7, 0, 1); c.drawImage(spr, Math.round(sx + 14 + Math.sin(ph * 6 + k) * 4 - z / 2), Math.round(ROAD_TOP - 30 - ph * 46 - z / 2), z, z); }
      c.globalAlpha = 1;
      if (dark > 0.02) G.lights.push({ x: sx + 16, y: ROAD_TOP - 8, r: 34, i: 1 });
    } else if (d.type === 'pelita' && G.tod > 0.5) {
      c.drawImage(S.pelita, sx, ROAD_TOP - 22);
      const fl = Math.sin(G.anim * 18 + d.x) > 0 ? 1 : 0;
      c.fillStyle = PAL.flameO; c.fillRect(sx + 2, ROAD_TOP - 26 - fl, 4, 4 + fl);
      c.fillStyle = PAL.flame; c.fillRect(sx + 3, ROAD_TOP - 25 - fl, 2, 3);
      if (dark > 0.02) G.lights.push({ x: sx + 4, y: ROAD_TOP - 24, r: 26, i: 0.95 });
    }
  }
  if (L.junctionX) {   // simpang ke Kampung Ketupat
    const jx = Math.round(L.junctionX - G.cam);
    if (jx > -50 && jx < W + 10) {
      c.drawImage(S.simpang, jx, ROAD_TOP - 45);
      text(c, 'KG.KETUPAT', jx + 18, ROAD_TOP - 37.5, { size: 3.6, color: '#ffffff', outline: null });
      text(c, 'KG.LEMANG', jx + 22, ROAD_TOP - 24.5, { size: 3.6, color: '#ffffff', outline: null });
      if (dark > 0.02) G.lights.push({ x: jx + 20, y: ROAD_TOP - 30, r: 26, i: 0.8 });
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
    if (h.kind === 'orang') { drawCustomerEnt(c, h, sx, dark); continue; }
    c.drawImage((isLemang() ? S.houseG : S.house)[h.v], sx - 2, ROAD_TOP - 70);
    if (h.v % 2 === 0) c.drawImage(S.tempayan, sx + 62, ROAD_TOP - 17);
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

function drawCustomerEnt(c, h, sx, dark) {
  const wave = h.state === 'pending' ? Math.floor(G.anim * 4 + h.x) % 2 : 0;
  c.fillStyle = 'rgba(20,10,30,0.25)'; c.fillRect(sx + 2, ROAD_TOP + 1, 12, 2);
  c.drawImage(S.orang[h.v][h.state === 'done' ? 1 : wave], sx, ROAD_TOP - 24);
  if (h.state === 'done') c.drawImage(S.jar, sx - 4, ROAD_TOP - 38, 10, 12);
  if (h.state === 'pending' && dark > 0.2) G.lights.push({ x: sx + 7, y: ROAD_TOP - 12, r: 16, i: 0.7 });
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
    if (o.type === 'lubang' && isLemang()) {   // lopak lumpur
      const w = o.w;
      c.fillStyle = '#5a3420'; c.fillRect(sx + 2, GY - 3, w - 4, 1); c.fillRect(sx, GY - 2, w, 4); c.fillRect(sx + 2, GY + 2, w - 4, 1);
      c.fillStyle = '#6e4a32'; c.fillRect(sx + 2, GY - 2, w - 4, 3);
      c.fillStyle = '#9ab8c0'; c.fillRect(sx + 4, GY - 2, 4, 1); c.fillRect(sx + w - 8, GY, 3, 1);
      continue;
    }
    if (o.type === 'batu' && isLemang()) { c.drawImage(S.rockMoss, sx - 1, GY - 12); continue; }
    if (o.type === 'pokok') {
      const bx = sx + o.w;
      if (o.state === 'wait' || o.state === 'shake') {
        const wob = o.state === 'shake' ? Math.round(Math.sin(G.anim * 50) * 1.5) : 0;
        c.drawImage(S.treeFall, bx - 22 + wob, ROAD_TOP + 2 - 80);
      } else if (o.state === 'fall') {
        const k = clamp(o.t / 0.35, 0, 1), ang = -k * k * 1.45, py = lerp(ROAD_TOP + 2, GY - 2, k);
        c.save(); c.translate(bx, Math.round(py)); c.rotate(Math.round(ang / (Math.PI / 16)) * (Math.PI / 16)); c.drawImage(S.treeFall, -22, -80); c.restore();
      } else c.drawImage(S.log, sx - 3, GY - 13);
      continue;
    }
    if (o.type === 'burung') {
      if (o.state !== 'wait' && o.bx > -30) c.drawImage(S.bird[Math.floor(G.anim * 8) % 2], Math.round(o.bx), Math.round(o.by));
      if (o.state === 'drop') {
        const k = clamp((o.fy - o.by) / (GY - o.by), 0, 1);
        c.fillStyle = `rgba(20,10,30,${0.15 + k * 0.3})`; c.fillRect(sx + 3 - Math.round(k * 3), GY - 1, 2 + Math.round(k * 6), 2);
        c.drawImage(S.poop, sx + 2, Math.round(o.fy) - 4);
      } else if (o.state === 'splat') c.drawImage(S.splat, sx - 1, GY - 3);
      continue;
    }
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

function drawMotor(c) {
  const m = G.motor; if (!m || m.warn > 0) return;
  c.fillStyle = 'rgba(20,10,30,0.28)'; c.fillRect(Math.round(m.x) + 4, GY - 1, 52, 2);
  const y = m.hit ? GY - 35 - Math.round(Math.sin(clamp(m.hitT, 0, 1) * Math.PI) * 10) : GY - 35;
  c.drawImage(S.chopper[Math.floor(G.anim * 14) % 2], Math.round(m.x), y + (Math.floor(G.anim * 20) % 2));
  if (skyAt(G.tod).dark > 0.05) G.lights.push({ x: m.x + 52, y: GY - 24, r: 30, i: 1, cone: true });
}

function drawPlayer(c, scale = 1, cx = null) {
  const p = G.player;
  if (p.splashT > 0) return;
  const crashing = G.state === 'crashing';
  const hurtFace = (p.inv > 1.15 && G.state === 'play') || crashing;
  if (p.inv > 0 && G.state === 'play' && !hurtFace && Math.floor(p.inv * 14) % 2 === 0) return;
  const spr = hurtFace ? S.vespaHurt : S.vespa[Math.floor(p.wheelT) % 2];
  const vib = p.grounded && G.state !== 'done' && !crashing ? (Math.floor(G.anim * 12) % 2) : 0;
  const x = cx == null ? PX : cx;
  const hgt = clamp((GY - p.y) / 70, 0, 1);
  if (!p.falling) { c.fillStyle = `rgba(20,10,30,${0.28 - hgt * 0.15})`; const sw = Math.round((34 - hgt * 12) * scale); c.fillRect(Math.round(x + (40 * scale - sw) / 2), GY - 1, sw, 2); }
  c.save();
  if (crashing) {
    const k = clamp(p.crashT / 0.9, 0, 1), lift = Math.sin(k * Math.PI) * 34;
    c.translate(Math.round(x + 22 + k * 20), Math.round(p.y - 18 - lift)); c.rotate(-Math.round(k * 12) * (Math.PI / 6));
    c.drawImage(spr, -22, -20);
  } else {
    const ang = p.grounded ? 0 : clamp(p.vy * 0.00045, -0.16, 0.16);
    c.translate(x + 11 * scale, Math.round(p.y) - vib); c.rotate(ang);
    c.drawImage(spr, -11 * scale, -38 * scale, spr.width * scale, spr.height * scale);
  }
  c.restore();
  if (skyAt(G.tod).dark > 0.05 && !crashing) G.lights.push({ x: x + 39 * scale, y: Math.round(p.y) - 26 * scale, r: 30, i: 1, cone: true });
}

// ---------------- kesan khas (asap, debu, letupan) ----------------
function fx(kind, x, y, o = {}) { G.fx.push({ kind, x, y, t: 0, dur: o.dur || 0.5, vx: o.vx || 0, vy: o.vy || 0, sc: o.sc || 1, col: o.col || 'smoke', world: o.world !== false }); }
function updateFx(dt, scroll) {
  for (let i = G.fx.length - 1; i >= 0; i--) {
    const f = G.fx[i]; f.t += dt; if (f.t >= f.dur) { G.fx.splice(i, 1); continue; }
    f.x += f.vx * dt - (f.world ? scroll * dt : 0); f.y += f.vy * dt; f.vx *= 0.97; f.vy *= 0.97;
  }
}
function drawFx(c) {
  for (const f of G.fx) {
    const frames = f.kind === 'explo' ? S.explo : S.puff[f.col];
    const k = Math.min(frames.length - 1, Math.floor((f.t / f.dur) * frames.length));
    const spr = frames[k], w = Math.round(spr.width * f.sc), h = Math.round(spr.height * f.sc);
    c.globalAlpha = f.kind === 'puff' ? clamp(1.7 - (f.t / f.dur) * 1.7, 0, 1) : 1;
    c.drawImage(spr, Math.round(f.x - w / 2), Math.round(f.y - h / 2), w, h);
    if (f.kind === 'explo' && f.t < 0.3) G.lights.push({ x: f.x, y: f.y, r: 40 * f.sc, i: 1 });
  }
  c.globalAlpha = 1;
}
function debris(x, y, n, sprs, o = {}) {
  for (let i = 0; i < n; i++) G.particles.push({ x: x + rr(-4, 4), y, vx: rr(o.vx0 == null ? -50 : o.vx0, o.vx1 == null ? 60 : o.vx1), vy: -rr(o.up0 || 70, o.up1 || 150), g: 460, life: rr(0.8, 1.2), max: 1.2, spr: pick(sprs), rot: rr(0, 6), vr: rr(-14, 14), bounce: o.bounce == null ? GY - 2 : o.bounce, world: true });
}
function drawForeground(c) {
  const off = G.cam * 1.3, T = 74, k0 = Math.floor(off / T) - 1;
  for (let k = k0; k < k0 + 6; k++) {
    const h = hash(k * 31 + 7) * 0.5 + 0.5; if (h < 0.3) continue;
    const sx = Math.round(k * T - off + (hash(k * 13) * 0.5 + 0.5) * 30);
    const spr = h > 0.78 ? S.fgRock : S.fgGrass;
    c.drawImage(spr, sx, H - spr.height + 3);
  }
}

function drawPackages(c) {
  for (const pk of G.packages) {
    const k = clamp(pk.t / pk.dur, 0, 1);
    const tx = pk.tx - G.cam;
    const x = lerp(pk.sx, tx, k), y = lerp(pk.sy, pk.ty, k) - Math.sin(k * Math.PI) * 42;
    const spr = pk.spr || S.gift; c.save(); c.translate(Math.round(x), Math.round(y)); c.rotate(Math.round(k * 7 / (Math.PI / 4)) * (Math.PI / 4)); c.drawImage(spr, -(spr.width >> 1), -(spr.height >> 1)); c.restore();
  }
}

function drawParticles(c, list) {
  for (const p of list) {
    c.globalAlpha = p.fade === false ? 1 : clamp((p.life / p.max) * 1.6, 0, 1);
    if (p.spr) { c.save(); c.translate(Math.round(p.x), Math.round(p.y)); c.rotate(Math.round((p.rot || 0) / (Math.PI / 4)) * (Math.PI / 4)); c.drawImage(p.spr, -(p.spr.width >> 1), -(p.spr.height >> 1)); c.restore(); }
    else { c.fillStyle = p.color; const s = p.size || 1; c.fillRect(Math.round(p.x), Math.round(p.y), s, s); }
  }
  c.globalAlpha = 1;
}

function text(c, str, x, y, o = {}) {
  const size = o.size || 8;
  c.font = `${size}px ${o.font || FONT_PIX}`; c.textAlign = o.align || 'center'; c.textBaseline = 'middle';
  const ow = o.ow || Math.max(2, size * 0.32);
  if (o.shadow) { c.lineWidth = ow; c.strokeStyle = o.shadow; c.lineJoin = 'round'; c.strokeText(str, x + 1, y + 1.5); c.fillStyle = o.shadow; c.fillText(str, x + 1, y + 1.5); }
  if (o.outline !== null) { c.lineWidth = ow; c.strokeStyle = o.outline || PAL.ink; c.lineJoin = 'round'; c.strokeText(str, x, y); }
  if (o.grad) { const g = c.createLinearGradient(0, y - size / 2, 0, y + size / 2); o.grad.forEach((col, i) => g.addColorStop(i / (o.grad.length - 1), col)); c.fillStyle = g; }
  else c.fillStyle = o.color || '#fff';
  c.fillText(str, x, y);
}

function drawMarkers(c) {
  const L = G.level; if (!L || G.state === 'menu') return;
  for (const h of L.houses) {
    const sx = Math.round(h.x - G.cam);
    if (sx > W + 30 || sx < -100) continue;
    const orang = h.kind === 'orang', cx = orang ? sx + 7 : sx + 38;
    if (orang && h.state === 'pending') {
      const by = ROAD_TOP - 46 + Math.round(Math.sin(G.anim * 6) * 1.5);
      c.font = `7px ${FONT_BODY}`; const tw = Math.ceil(c.measureText(h.name).width) + 8;
      const lx = clamp(cx, (tw >> 1) + 3, W - (tw >> 1) - 3);
      c.fillStyle = PAL.ink; c.fillRect(lx - (tw >> 1) - 1, by - 22, tw + 2, 10);
      c.fillStyle = '#fff6dc'; c.fillRect(lx - (tw >> 1), by - 21, tw, 8);
      text(c, h.name, lx, by - 17, { size: 6.5, font: FONT_BODY, color: PAL.ink, outline: null });
      c.fillStyle = PAL.ink; c.fillRect(cx - 8, by - 11, 17, 15); c.fillStyle = '#ffffff'; c.fillRect(cx - 7, by - 10, 15, 13); c.fillRect(cx - 1, by + 3, 3, 2);
      c.drawImage(S.jar, cx - 5, by - 10, 9, 11);
      text(c, '!', cx + 6, by - 8, { size: 5, color: '#e33a3a', outline: null });
      continue;
    }
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
      const a = clamp(h.thanks, 0, 1), by = (orang ? ROAD_TOP - 52 : 172) - Math.round((1.6 - h.thanks) * 6);
      c.globalAlpha = a;
      c.fillStyle = PAL.ink; c.fillRect(cx - 34, by - 9, 68, 18);
      c.fillStyle = '#fff'; c.fillRect(cx - 33, by - 8, 66, 16); c.fillRect(cx - 3, by + 8, 5, 3);
      c.fillStyle = PAL.ink; c.fillRect(cx - 4, by + 9, 1, 2); c.fillRect(cx + 2, by + 9, 1, 2); c.fillRect(cx - 3, by + 11, 5, 1);
      text(c, 'Terima kasih!', cx, by - 2.5, { size: 7, font: FONT_BODY, color: PAL.ink, outline: null });
      text(c, h.name, cx, by + 4.5, { size: 5.5, font: FONT_BODY, color: '#7a3b1d', outline: null });
      c.globalAlpha = 1;
    } else if (h.state === 'missed' && h.thanks > 0) {
      c.globalAlpha = clamp(h.thanks, 0, 1);
      text(c, '?', cx, orang ? ROAD_TOP - 40 : 172, { size: 12, color: '#ff6b6b' });
      c.globalAlpha = 1;
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
    d.fillStyle = `rgba(4,8,32,${dark})`; d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'destination-out';
    for (const l of G.lights) {
      if (l.cone) { d.globalAlpha = 1; d.drawImage(LIGHT.coneHole, l.x - 4, l.y - 50, 160, 100); d.globalAlpha = 0.7; d.drawImage(LIGHT.hole, l.x - 54, l.y - 26, 68, 68); }
      else { d.globalAlpha = l.i; d.drawImage(LIGHT.hole, l.x - l.r, l.y - l.r, l.r * 2, l.r * 2); }
    }
    d.globalAlpha = 1;
    w.imageSmoothingEnabled = true; w.drawImage(darkCv, 0, 0, W, H); w.imageSmoothingEnabled = false;
  }
  w.globalCompositeOperation = 'source-over';
  return dark;
}

function drawGlows(c, dark) {
  if (dark < 0.05) return;
  c.globalCompositeOperation = 'lighter'; c.imageSmoothingEnabled = true;
  for (const l of G.lights) {
    if (l.cone) { c.globalAlpha = 0.32 * dark; c.drawImage(LIGHT.coneGlow, l.x - 4, l.y - 50, 160, 100); }
    else { c.globalAlpha = 0.28 * dark * l.i; c.drawImage(LIGHT.glow, l.x - l.r * 0.6, l.y - l.r * 0.6, l.r * 1.2, l.r * 1.2); }
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.imageSmoothingEnabled = false;
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
  // amaran motor besar dari belakang
  const mt = G.motor;
  if (mt && mt.warn > 0 && Math.floor(mt.warn * 8) % 2 === 0) {
    c.fillStyle = PAL.ink; pixCircle(c, 11, GY - 34, 9); c.fillStyle = '#ff8a1e'; pixCircle(c, 11, GY - 34, 8);
    text(c, '!', 11.5, GY - 33.5, { size: 9, color: '#fff', outline: null });
    text(c, 'PON! PON!', 50, GY - 50, { size: 6, color: '#ffd447' });
    text(c, 'MOTOR BESAR -2 NYAWA', 66, GY - 40, { size: 4, color: '#ff9a9a' });
  }
  // sepanduk fasa
  if (G.banner) {
    const b = G.banner, t = b.t;
    const inX = t < 0.35 ? lerp(W, 0, easeOut(t / 0.35)) : t > b.dur - 0.35 ? lerp(0, -W, easeIn((t - (b.dur - 0.35)) / 0.35)) : 0;
    const y = 120, bx = Math.round(inX);
    c.fillStyle = 'rgba(14,18,52,0.92)'; c.fillRect(bx, y - 24, W, 48);
    for (let x = -8; x < W + 8; x += 8) {                    // jalur amaran kuning-hitam
      for (const yy of [y - 24, y + 21]) { c.fillStyle = '#ffd447'; c.fillRect(bx + x, yy, 4, 3); c.fillStyle = PAL.ink; c.fillRect(bx + x + 4, yy, 4, 3); }
    }
    text(c, b.mission || '', bx + W / 2, y - 13, { size: 6, color: '#ffffff' });
    text(c, b.title, bx + W / 2, y + 1, { size: 16, grad: ['#fff6b0', '#ffd447', '#ff8a1e'], shadow: '#7a2a12', ow: 5 });
    text(c, b.sub, bx + W / 2, y + 14, { size: 7, font: FONT_BODY, color: '#fff6dc', outline: null });
  }
  // kiraan mula
  if (G.state === 'play' && G.countdown > 0) {
    const n = Math.ceil(G.countdown / 0.6);
    const label = n > 3 ? '' : n >= 1 ? String(n) : '';
    if (label) text(c, label, W / 2, 150, { size: 26, grad: ['#fff6b0', '#ffd447', '#ff8a1e'], shadow: '#7a2a12', ow: 6 });
  }
  if (G.state === 'play' && G.goTimer > 0) text(c, 'JOM!', W / 2, 150, { size: 22, grad: ['#d6ffb0', '#7ee07a', '#2f9e4a'], shadow: '#14502a', ow: 6 });
  // combo
  if (G.state === 'play' && G.combo >= 3) {
    const mult = comboMult();
    text(c, `COMBO x${mult}`, W - 8, 62, { size: 6, color: '#ffd447', align: 'right' });
  }
  // nyawa tinggal satu: degupan merah di tepi skrin
  if (G.state === 'play' && G.lives === 1) {
    const beat = Math.pow(Math.max(0, Math.sin(G.anim * 7)), 6);
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.62);
    g.addColorStop(0, 'rgba(255,40,60,0)'); g.addColorStop(1, `rgba(255,40,60,${0.18 + beat * 0.25})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
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
  if (G.state === 'aset2') { drawAssetSheet2(ctx); return; }
  const t = G.todForced != null ? G.todForced : G.tod;
  G.tod = t;
  G.lights.length = 0;
  drawSky(ctx, t);
  drawFireworks(ctx);
  // dunia
  const sk0 = skyAt(t), useWorld = sk0.tint[3] > 0.005 || sk0.dark > 0.01;
  const wc = useWorld ? wctx : ctx;
  if (useWorld) {
    wctx.setTransform(1, 0, 0, 1, 0, 0); wctx.clearRect(0, 0, worldCv.width, worldCv.height);
    wctx.setTransform(SC, 0, 0, SC, 0, 0); wctx.imageSmoothingEnabled = false;
  } else ctx.save();
  const shx = G.shake > 0 ? Math.round((Math.random() - 0.5) * 4 * (G.shake / 0.35)) : 0;
  const shy = G.shake > 0 ? Math.round((Math.random() - 0.5) * 3 * (G.shake / 0.35)) : 0;
  wc.translate(shx, shy);
  const lem = isLemang(), open = lem ? forestOpen() : 0;
  if (!lem || open > 0) { drawClouds(wc, t); drawFarLayers(wc, t); drawSawah(wc, t); }
  if (lem) { wc.globalAlpha = 1 - open; drawForestBack(wc, t); wc.globalAlpha = 1; }
  if (lem) drawVergeL(wc); else drawVerge(wc);
  drawDecor(wc);
  drawHouses(wc);
  if (lem) drawRoadL(wc); else drawRoad(wc);
  if (G.level) for (const cr of G.level.crossings) { if (cr.x - G.cam > W + 10) break; drawCrossing(wc, cr); }
  drawZones(wc);
  drawObstacles(wc);
  drawItems(wc);
  drawGooseEnt(wc);
  drawMotor(wc);
  if (G.state === 'menu') drawPlayer(wc, G.menuScale, 70);
  else drawPlayer(wc);
  drawPackages(wc);
  drawFx(wc);
  if (lem) drawFrontL(wc); else drawFrontCanal(wc);
  drawParticles(wc, G.particles);
  drawForeground(wc);
  if (lem) drawCanopy(wc, open);
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
  // api & asap hitam berkepul (gaya arked)
  const cyc = Math.floor(G.anim * 8);
  c.drawImage(S.explo[1 + (cyc % 2)], 52, 92, 24, 24);
  for (let i = 0; i < 4; i++) {
    const ph = (G.anim * 0.55 + i / 4) % 1, spr = S.puff.dark[Math.min(4, Math.floor(ph * 5))], z = 20 + ph * 22;
    c.globalAlpha = clamp(1.3 - ph * 1.3, 0, 1); c.drawImage(spr, Math.round(58 + Math.sin(i * 2 + ph * 3) * 6 - z / 2 - ph * 14), Math.round(96 - ph * 70 - z / 2), Math.round(z), Math.round(z));
  }
  c.globalAlpha = 1;
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
  c.drawImage(S.explo[2], 112, 112, 46, 46); c.drawImage(S.puff.smoke[3], 158, 118, 36, 36); c.drawImage(S.puff.dust[2], 146, 146, 28, 28); cell(155, 182, 'Letupan & Asap');
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

function drawAssetSheet2(c) {
  c.fillStyle = '#14301f'; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(140,255,175,0.08)'; c.lineWidth = 0.5;
  for (let x = 0; x < W; x += 12) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  for (let y = 0; y < H; y += 12) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  text(c, 'ASET KG. LEMANG', W / 2, 14, { size: 8, color: '#ffd447' });
  const cell = (x, y, label) => text(c, label, x, y, { size: 6.5, font: FONT_BODY, color: '#fff6dc', outline: null });
  c.drawImage(S.houseG[0], 4, 26); cell(46, 104, 'Rumah Gonjong');
  c.drawImage(S.houseG[2], 116, 34, 74, 65); cell(155, 104, 'Varian Ukiran');
  S.orang.forEach((o, i) => c.drawImage(o[0], 10 + i * 24, 114, 21, 34)); cell(46, 156, 'Orang Tunggu Balang');
  c.drawImage(S.chopper[0], 112, 116, 90, 51); cell(155, 172, 'Motor Besar (-2)');
  c.drawImage(S.treeFall, 8, 168, 33, 61); c.drawImage(S.log, 46, 210, 39, 14); cell(46, 236, 'Pokok Tumbang');
  c.drawImage(S.bird[1], 116, 188, 36, 24); c.drawImage(S.poop, 160, 196, 10, 12); c.drawImage(S.splat, 176, 204, 24, 8); cell(158, 222, 'Tahi Burung');
  c.drawImage(S.unggun, 10, 250, 48, 42); c.drawImage(S.bamboo, 62, 240, 30, 68); cell(48, 318, 'Unggun Lemang & Buluh');
  c.drawImage(S.simpang, 124, 246, 50, 55); cell(150, 318, 'Simpang Kg. Ketupat');
  c.drawImage(S.vespa[0], 84, 330, 48, 45);
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
    if (p.vr) p.rot += p.vr * dt;
    if (p.bounce != null && p.y > p.bounce && p.vy > 0) { p.y = p.bounce; p.vy *= -0.4; p.vx *= 0.65; if (p.vr) p.vr *= 0.5; if (Math.abs(p.vy) < 25) { p.vy = 0; p.g = 0; p.vx *= 0.4; p.vr = 0; } }
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
  fx('puff', PX + 9, GY - 4, { col: 'dust', dur: 0.4, vx: -25, sc: 0.55 }); fx('puff', PX + 33, GY - 4, { col: 'dust', dur: 0.35, vx: -10, sc: 0.45 });
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
        fx('puff', PX + 10, GY - 4, { col: 'dust', dur: 0.4, vx: -30, sc: 0.6 }); fx('puff', PX + 33, GY - 4, { col: 'dust', dur: 0.4, vx: 12, sc: 0.5 });
      } else if (p.y > GY + 3) p.falling = true;
    }
    if (p.falling && p.y > GY + 30) splash();
  } else if (!supported()) { p.grounded = false; p.coyote = 0.08; p.vy = 0; }
  // asap ekzos
  G.exT = (G.exT || 0) - dt;
  if (p.grounded && G.exT <= 0) { G.exT = 0.12; fx('puff', PX, GY - 8, { col: 'smoke', dur: 0.45, vx: -28, vy: -14, sc: 0.32 }); }
  if (p.grounded && G.speed > 105 && Math.random() < dt * 6) fx('puff', PX + 6, GY - 3, { col: 'dust', dur: 0.35, vx: -40, sc: 0.35 });
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

function hurt(kind, o, force, dmg = 1) {
  const p = G.player;
  if (!force && p.inv > 0) return;
  if (o) o.hit = true;
  G.lives = Math.max(0, G.lives - dmg); G.combo = 0; p.inv = 1.7; G.shake = 0.35; G.flash = 0.22;
  Sfx.hit(); vibrate(90);
  popup((isLemang() && HURT_LEMANG[kind]) || HURT_TEXT[kind] || 'ADUH!', PX + 50, GY - 56, '#ff7b7b', 6.5, 1.2);
  G.hitstop = 0.08;
  if (kind !== 'parit') {
    const hx = PX + 40, hy = GY - 12;
    if (kind === 'batu' || kind === 'kelapa' || kind === 'angsa' || kind === 'pokok' || kind === 'motor') fx('explo', hx, hy - 4, { dur: 0.42, sc: kind === 'motor' ? 1.5 : 1.1 });
    if (kind === 'motor') { fx('explo', hx - 16, hy + 2, { dur: 0.5, sc: 1 }); debris(hx, GY - 10, 5, [S.bolt]); G.shake = 0.55; }
    if (kind === 'pokok') debris(hx, GY - 8, 5, [S.chips.wood, S.chips.leaf]);
    if (kind === 'burung') debris(hx, GY - 6, 4, [S.chips.poop]);
    fx('puff', hx - 4, hy, { col: kind === 'tahi' || kind === 'lubang' ? 'dust' : 'smoke', dur: 0.6, vy: -18, vx: -30, sc: 0.9 });
    fx('puff', hx + 6, hy - 4, { col: 'smoke', dur: 0.7, vy: -26, vx: -15, sc: 0.7 });
    if (kind === 'batu' || kind === 'lubang') debris(hx, GY - 4, 5, [S.chips.rock]);
    if (kind === 'tahi') debris(hx, GY - 4, 5, [S.chips.dung]);
    if (kind === 'kelapa') debris(hx, GY - 8, 5, [S.chips.coco]);
    if (kind === 'angsa') for (let i = 0; i < 7; i++) G.particles.push({ x: PX + 10 + rr(-6, 6), y: GY - 18, vx: rr(-50, 30), vy: -rr(40, 90), g: 70, life: rr(1, 1.6), max: 1.6, spr: S.feather, rot: rr(0, 6), vr: rr(-4, 4), world: true });
  }
  debris(PX + 6, G.player.y - 26, 4, S.kuih, { vx0: -80, vx1: -10, up0: 80, up1: 150 });
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
  if (h.kind === 'orang') G.packages.push({ sx: PX + 8, sy: G.player.y - 26, tx: h.x + 6, ty: ROAD_TOP - 18, t: 0, dur: 0.36, house: h, spr: S.jar });
  else G.packages.push({ sx: PX + 8, sy: G.player.y - 26, tx: h.x + 40, ty: ROAD_TOP - 26, t: 0, dur: 0.45, house: h });
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
  const px = PX + 22, py = G.player.y - 18;
  fx('explo', px, py, { dur: 0.6, sc: 1.3 }); fx('explo', px - 14, py + 6, { dur: 0.5, sc: 0.8 });
  for (let i = 0; i < 4; i++) fx('puff', px + rr(-12, 12), py + rr(-6, 6), { col: 'dark', dur: 0.9, vy: -rr(20, 40), vx: rr(-30, 10), sc: rr(0.8, 1.2) });
  debris(px, py, 6, [S.bolt, S.chips.wood]); debris(px, py, 5, S.kuih);
  G.shake = 0.6; G.flash = 0.3;
}

function finish() {
  G.state = 'done'; G.doneT = 0; Sfx.stopMusic(); Sfx.setTense(false); Sfx.win();
  const lifeBonus = G.lives * 150, allBonus = G.delivered === TOTAL ? 500 : 0;
  G.finalBonus = lifeBonus + allBonus; G.score += G.finalBonus;
  setHud(false);
  const good = G.delivered >= 20;
  document.getElementById('done-title').textContent = good ? 'BERJAYA!' : 'SELESAI!';
  document.getElementById('done-sub').textContent = `${G.delivered}/${TOTAL} hantaran` + (isLemang() ? ' · Tiba simpang Kg. Ketupat' : '');
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
    if (G.countdown <= 0) { G.goTimer = 0.6; Sfx.go(); G.banner = { mission: 'MISI 1 · ' + VIL().short.toUpperCase(), title: VIL().phases[0].name, sub: 'Hantar 30 kuih raya!', t: 0, dur: 2.2 }; }
    return;
  }
  if (G.hitstop > 0) { G.hitstop -= dt; return; }
  if (G.goTimer > 0) G.goTimer -= dt;
  G.time += dt;
  if (G.deliverCd > 0) G.deliverCd -= dt;
  G.speed = lerp(SPEED_MIN, SPEED_MAX, clamp(G.cam / L.lastHouseX, 0, 1));
  G.cam += G.speed * dt;
  G.tod = todAt(G.cam);
  const ph = phaseOfTod(G.tod);
  if (ph !== G.phaseIdx) { G.phaseIdx = ph; G.banner = { mission: `MISI ${ph + 1}`, title: VIL().phases[ph].name, sub: VIL().phases[ph].sub, t: 0, dur: 2.4 }; Sfx.phase(); Sfx.setLevel(ph + 1); }
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
        if (o.fy >= GY - 6) { o.fy = GY - 6; o.state = 'ground'; G.shake = Math.max(G.shake, 0.12); Sfx.thud(); fx('puff', sx + 5, GY - 4, { col: 'dust', dur: 0.45, sc: 0.7 }); }
      }
    }
    if (o.type === 'pokok') {
      // pokok tumbang mengejut: goyang -> tumbang -> kayu melintang di jalan
      if (o.state === 'wait' && sx < W - 10) { o.state = 'shake'; o.t = 0; o.dshake = clamp((sx - 132) / G.speed - 0.35, 0.25, 0.8); Sfx.krak(); popup('KRAK!', sx + o.w, ROAD_TOP - 72, '#ffd447', 7, 0.8); debris(sx + o.w, ROAD_TOP - 60, 4, [S.chips.leaf], { vx0: -40, vx1: 20, up0: 10, up1: 40 }); }
      else if (o.state === 'shake') { o.t += dt; if (o.t >= o.dshake) { o.state = 'fall'; o.t = 0; Sfx.whistle(); } }
      else if (o.state === 'fall') {
        o.t += dt;
        if (o.t >= 0.35) {
          o.state = 'ground'; G.shake = Math.max(G.shake, 0.25); Sfx.thud(); vibrate(40);
          for (let k = 0; k < 3; k++) fx('puff', sx + 4 + k * 13, GY - 5, { col: 'dust', dur: 0.5, vy: -10, sc: 0.75 });
          debris(sx + o.w / 2, GY - 10, 6, [S.chips.leaf, S.chips.wood]);
        }
      }
    } else if (o.type === 'burung') {
      // burung enggang lalu, jatuhkan tahi
      if (o.state === 'wait' && sx < W + 40) { o.state = 'fly'; o.bx = W + 30; o.by = 92 + Math.floor((hash(Math.floor(o.x)) * 0.5 + 0.5) * 18); o.t = 0; Sfx.chirp(); }
      if (o.state !== 'wait') o.bx -= 150 * dt;
      if (o.state === 'fly') { o.t += dt; if (o.t >= 0.3) { o.state = 'drop'; o.x = G.cam + o.bx + 6; o.fy = o.by + 10; o.vy = 0; } }
      else if (o.state === 'drop') { o.vy += 700 * dt; o.fy += o.vy * dt; if (o.fy >= GY - 3) { o.state = 'splat'; fx('puff', o.x - G.cam + 6, GY - 4, { col: 'smoke', dur: 0.3, sc: 0.4 }); Sfx.splatS(); } }
    }
    if (o.hit || p.inv > 0 || p.splashT > 0) continue;
    let hit = false;
    const osx = o.x - G.cam;
    if (o.type === 'pokok') hit = o.state === 'ground' && overlap(PX + 13, PX + 30, osx + 2, osx + o.w - 2) && p.y > GY - o.h + 3;
    else if (o.type === 'burung') hit = o.state === 'drop' ? (overlap(PX + 12, PX + 30, osx, osx + 5) && o.fy > p.y - 32 && o.fy < p.y) : o.state === 'splat' ? (p.grounded && overlap(PX + 13, PX + 29, osx + 2, osx + o.w - 2)) : false;
    else if (o.type === 'lubang') hit = p.grounded && overlap(PX + 13, PX + 29, sx + 5, sx + o.w - 5);
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
  // motor besar (Kampung Lemang) — dari belakang, hon, langgar = -2 nyawa
  while (L.motors && G.motorIdx < L.motors.length && L.motors[G.motorIdx].x <= G.cam) {
    if (!G.motor) { G.motor = { x: -70, warn: 1.15, hit: false, passed: false, hitT: 0, ex: 0, honk2: false }; Sfx.horn(); Sfx.engine(); }
    G.motorIdx++;
  }
  const mt = G.motor;
  if (mt) {
    if (mt.warn > 0) mt.warn -= dt;
    else {
      mt.x += 150 * dt; if (mt.hitT > 0) mt.hitT += dt;
      if (!mt.honk2 && mt.x > -12) { mt.honk2 = true; Sfx.horn(); }
      mt.ex -= dt; if (mt.ex <= 0) { mt.ex = 0.07; fx('puff', mt.x + 1, GY - 7, { col: 'dark', dur: 0.4, vx: -50, vy: -12, sc: 0.35, world: false }); }
      if (!mt.hit && p.inv <= 0 && p.splashT <= 0 && overlap(mt.x + 6, mt.x + 56, PX + 13, PX + 30) && p.y > GY - 14) { mt.hit = true; mt.hitT = 0.01; hurt('motor', null, false, 2); }
      if (!mt.hit && !mt.passed && mt.x + 6 > PX + 30) { mt.passed = true; G.score += 50; popup('ELAK MOTOR! +50', PX + 56, GY - 56, '#8cff6a', 6); }
      if (mt.x > W + 80) G.motor = null;
    }
  }
  // rumah terlepas
  for (const h of L.houses) {
    if (h.state !== 'pending') { if (h.thanks > 0) h.thanks -= dt; continue; }
    if (h.zone[0] > G.cam + W) break;
    if (G.cam + PX + 20 > h.zone[1]) {
      h.state = 'missed'; h.thanks = 1.2; G.processed++; G.combo = 0;
      Sfx.miss(); popup(h.kind === 'orang' ? `TERLEPAS! ${h.name}` : `TERLEPAS! No.${h.idx}`, PX + 60, GY - 60, '#ff7b7b', 6, 1.1);
      updateHud(true);
    }
  }
  // bungkusan
  for (let i = G.packages.length - 1; i >= 0; i--) {
    const pk = G.packages[i]; pk.t += dt;
    if (pk.t >= pk.dur) { G.packages.splice(i, 1); fx('puff', pk.tx - G.cam, pk.ty, { col: 'smoke', dur: 0.45, sc: 0.7 }); burst(pk.tx - G.cam, pk.ty, 12, ['#ffd447', '#ffffff', '#ff5a8a'], { min: 20, max: 60, g: 40, life: 0.6 }); }
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
  if (st === 'menu') {
    G.cam += 34 * dt; G.player.wheelT += dt * 3.4; updateParticles(dt, G.particles, 34); updateFx(dt, 34);
    G.exT = (G.exT || 0) - dt; if (G.exT <= 0) { G.exT = 0.14; fx('puff', 70, GY - 14, { col: 'smoke', dur: 0.55, vx: -30, vy: -16, sc: 0.6 }); }
    return;
  }
  if (st === 'play') { updatePlay(dt); const sc = G.countdown > 0 || G.hitstop > 0 ? 0 : G.speed; updateParticles(dt, G.particles, sc); updateFx(dt, sc); }
  else if (st === 'crashing') {
    const p = G.player; p.crashT += dt; G.speed = Math.max(0, G.speed - 140 * dt); G.cam += G.speed * dt; p.wheelT += dt * G.speed / 10;
    updateParticles(dt, G.particles, G.speed); updateFx(dt, G.speed);
    if (p.crashT > 1.0) showCrash();
  } else if (st === 'done') {
    G.speed = Math.max(0, G.speed - 90 * dt); G.cam += G.speed * dt; G.player.wheelT += dt * G.speed / 10; G.doneT += dt;
    updateParticles(dt, G.particles, G.speed); updateFx(dt, G.speed);
  } else if (st === 'result' || st === 'crash') updateParticles(dt, G.particles, 0);
  updateHud();
}

// ============================================================
// UI
// ============================================================
const $ = (id) => document.getElementById(id);
const SCREENS = ['scr-menu', 'scr-village', 'scr-pdpa', 'scr-howto', 'scr-board', 'scr-pause', 'scr-crash', 'scr-done', 'scr-result'];
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
  G.state = 'menu'; G.paused = false; G.todForced = null; G.tod = 0.06; G.village = 'ketupat'; G.motor = null;
  G.level = buildLevel(4242, true); G.cam = 0; G.player = newPlayer(); G.goose = null;
  G.particles.length = 0; G.popups.length = 0; G.fireworks.length = 0; G.confetti.length = 0; G.fx.length = 0; G.banner = null;
  setHud(false); showScreens('scr-menu'); playerLabel(); soundLabel();
}

function showVillage() {
  const board = store.get('vrtb_board', []);
  for (const k of ['ketupat', 'lemang']) { const best = board.filter((e) => (e.k || 'ketupat') === k).reduce((m, e) => Math.max(m, e.s), 0); $('best-' + k).textContent = best ? `Terbaik: ${best}` : 'Belum dimain'; }
  showScreens('scr-village');
}
function startGame(seed, village) {
  Sfx.init();
  G.village = village || G.lastVillage || 'ketupat'; G.lastVillage = G.village; store.set('vrtb_village', G.village);
  const sd = seed != null ? seed : (Date.now() & 0x7fffffff);
  G.level = G.village === 'lemang' ? buildLevelLemang(sd) : buildLevel(sd);
  G.motor = null; G.motorIdx = 0; Sfx.village = G.village;
  Object.assign(G, { state: 'play', cam: 0, speed: SPEED_MIN, tod: 0, todForced: null, score: 0, delivered: 0, processed: 0, lives: 3, combo: 0, bestCombo: 0, kuih: 0, time: 0, perfects: 0, goose: null, phaseIdx: 0, banner: null, countdown: 2.1, goTimer: 0, deliverCd: 0, paused: false, jumps: 0, gooseIdx: 0, finalBonus: 0 });
  G.player = newPlayer(); G.fx.length = 0; G.hitstop = 0; G.particles.length = 0; G.popups.length = 0; G.packages.length = 0; G.fireworks.length = 0; G.confetti.length = 0;
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
  const entry = { n: G.playerName || 'Tanpa Nama', s: G.score, d: G.delivered, t: Math.round(G.time), at: Date.now(), k: G.village };
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
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = e.n; if (e.k) { const tg = document.createElement('small'); tg.className = 'kg ' + e.k; tg.textContent = e.k === 'lemang' ? 'LEMANG' : 'KETUPAT'; nm.append(' ', tg); }
    const sc = document.createElement('span'); sc.className = 'sc'; sc.textContent = e.s;
    li.append(nm, sc); el.appendChild(li);
  });
  if (meIdx >= max) {
    const li = document.createElement('li'); li.className = 'me'; li.style.counterSet = `r ${meIdx}`;
    const e = list[meIdx];
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = e.n; if (e.k) { const tg = document.createElement('small'); tg.className = 'kg ' + e.k; tg.textContent = e.k === 'lemang' ? 'LEMANG' : 'KETUPAT'; nm.append(' ', tg); }
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
  $('r-kg').textContent = VIL().short;
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
    if (G.consent && G.playerName) showVillage(); else { $('in-name').value = G.playerName; $('in-agree').checked = G.consent; validatePdpa(); showScreens('scr-pdpa'); }
  });
  $('btn-player').addEventListener('click', () => { $('in-name').value = G.playerName; $('in-agree').checked = G.consent; validatePdpa(); showScreens('scr-pdpa'); });
  $('in-agree').addEventListener('change', validatePdpa);
  $('in-name').addEventListener('input', validatePdpa);
  $('pdpa-form').addEventListener('submit', (e) => {
    e.preventDefault(); if ($('btn-continue').disabled) return;
    G.playerName = $('in-name').value.trim().slice(0, 14); G.consent = true;
    store.set('vrtb_name', G.playerName); store.set('vrtb_consent', true);
    showVillage();
  });
  $('btn-pdpa-back').addEventListener('click', () => showScreens('scr-menu'));
  $('btn-kg-ketupat').addEventListener('click', () => startGame(undefined, 'ketupat'));
  $('btn-kg-lemang').addEventListener('click', () => startGame(undefined, 'lemang'));
  $('btn-village-back').addEventListener('click', () => showScreens('scr-menu'));
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
  $('btn-retry').addEventListener('click', () => startGame(undefined, G.lastVillage));
  $('btn-crash-menu').addEventListener('click', () => enterMenu());
  $('btn-crash-x').addEventListener('click', () => enterMenu());
  $('scr-done').addEventListener('pointerdown', () => { if (G.doneT > 0.8) showResult(); });
  $('btn-again').addEventListener('click', () => startGame(undefined, G.lastVillage));
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
  const stage = (houseIdx, houseSx, tod, village = 'ketupat') => {
    startGame(777, village); G.countdown = 0;
    const h = L0().houses[houseIdx];
    G.cam = h.x - houseSx; G.todForced = tod; G.tod = tod;
    clearView(G.cam - 40, G.cam + W + 60);
    for (let i = 0; i < houseIdx; i++) { L0().houses[i].state = i % 7 === 3 ? 'missed' : 'done'; L0().houses[i].thanks = 0; }
    G.delivered = L0().houses.filter((x) => x.state === 'done').length; G.processed = houseIdx;
    G.phaseIdx = phaseOfTod(tod);
  };
  const obs = (type, sx, extra = {}) => { const dims = { lubang: [22, 3], batu: [15, 11], tahi: [14, 6], kelapa: [11, 10], pokok: [32, 9] }[type]; G.level.obs.push({ type, x: at(sx), w: dims[0], h: dims[1], hit: false, state: 'wait', fy: -14, vy: 0, ...extra }); G.level.obs.sort((a, b) => a.x - b.x); };
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
      stage(16, 260, 0.56); G.banner = { mission: 'MISI 3', title: 'SENJA', sub: PHASES[2].sub, t: 1, dur: 2.4 }; G.score = 2100;
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
    case 'langgar':
      stage(6, 196, 0.16); obs('batu', 50, { hit: true });
      G.player.inv = 1.5; G.lives = 2; G.score = 860; G.kuih = 15;
      G.fx.push({ kind: 'explo', x: PX + 42, y: GY - 16, t: 0.12, dur: 0.42, vx: 0, vy: 0, sc: 1.1, col: 'smoke', world: true });
      G.fx.push({ kind: 'puff', x: PX + 22, y: GY - 12, t: 0.15, dur: 0.6, vx: 0, vy: 0, sc: 0.9, col: 'smoke', world: true });
      G.fx.push({ kind: 'puff', x: PX + 54, y: GY - 24, t: 0.2, dur: 0.7, vx: 0, vy: 0, sc: 0.7, col: 'smoke', world: true });
      for (const [x, y, k, r] of [[22, 228, 0, 1], [8, 240, 1, 2], [36, 222, 2, 5], [14, 256, 3, 3]]) G.particles.push({ x, y, vx: 0, vy: 0, g: 0, life: 1, max: 1, spr: S.kuih[k], rot: r, world: true });
      for (const [x, y, r] of [[70, 268, 1], [80, 262, 3], [62, 276, 5]]) G.particles.push({ x, y, vx: 0, vy: 0, g: 0, life: 1, max: 1, spr: S.chips.rock, rot: r, world: true });
      G.popups.push({ text: 'ADUH! BATU!', x: 84, y: GY - 58, color: '#ff7b7b', size: 6.5, life: 1, vy: 0 });
      break;
    case 'aset': G.state = 'aset'; showScreens(); setHud(false); break;
    case 'aset2': G.state = 'aset2'; showScreens(); setHud(false); break;
    case 'pilih': enterMenu(); G.cam = 150; showVillage(); break;
    case 'lemang':
      stage(5, 140, 0.12, 'lemang'); G.score = 520; G.kuih = 9;
      obs('lubang', 70); item('kuih', 196, GY - 12, 1); item('kuih', 208, GY - 12, 0);
      G.level.decor.push({ type: 'unggun', x: at(178) }, { type: 'bigtree', x: at(-6) }, { type: 'buluh', x: at(96) }); G.level.decor.sort((a, b) => a.x - b.x);
      break;
    case 'lemang-pokok':
      stage(8, 300, 0.38, 'lemang'); G.score = 1180; G.lives = 2; G.kuih = 18;
      obs('pokok', 118, { state: 'fall', t: 0.2 }); G.level.obs.push({ type: 'burung', x: at(70), w: 12, h: 3, hit: false, state: 'drop', fy: 196, vy: 0, bx: 92, by: 98, t: 0.4 });
      G.level.obs.push({ type: 'burung', x: at(186), w: 12, h: 3, hit: false, state: 'splat', fy: GY - 3, vy: 0, bx: -40, by: 98, t: 1 }); G.level.obs.sort((a, b) => a.x - b.x);
      G.popups.push({ text: 'KRAK!', x: 150, y: ROAD_TOP - 72, color: '#ffd447', size: 7, life: 1, vy: 0 });
      break;
    case 'lemang-motor':
      stage(15, 300, 0.52, 'lemang'); G.score = 2050; G.kuih = 30;
      G.player.y = GY - 44; G.player.vy = -60; G.player.grounded = false;
      G.motor = { x: 4, warn: 0, hit: false, passed: false, hitT: 0, ex: 0, honk2: true };
      for (let i = 0; i < 4; i++) G.fx.push({ kind: 'puff', x: 2 - i * 10, y: GY - 8 - i * 3, t: i * 0.1, dur: 0.4, vx: 0, vy: 0, sc: 0.35, col: 'dark', world: false });
      G.popups.push({ text: 'PON! PON!', x: 120, y: GY - 70, color: '#ffd447', size: 6, life: 1, vy: 0 });
      break;
    case 'lemang-malam':
      stage(26, 110, 0.9, 'lemang'); G.score = 3640; G.lives = 2; G.kuih = 52;
      G.level.decor.push({ type: 'unggun', x: at(8) }, { type: 'pelita', x: at(196) }); G.level.decor.sort((a, b) => a.x - b.x);
      break;
    case 'simpang': {
      stage(29, 60, 0.97, 'lemang'); const Lj = G.level; G.cam = Lj.junctionX - 150; clearView(G.cam - 40, G.cam + W + 60);
      G.processed = 30; G.delivered = 27; G.score = 4380; G.lives = 2;
      break;
    }
  }
  if (['siang', 'petang', 'hantar', 'senja', 'malam', 'banner'].includes(name)) for (let i = 0; i < 4; i++) G.fx.push({ kind: 'puff', x: PX - i * 9, y: GY - 8 - i * 3, t: i * 0.11, dur: 0.45, vx: 0, vy: 0, sc: 0.32, col: 'smoke', world: true });
  if (name === 'menu' || name === 'pdpa') for (let i = 0; i < 4; i++) G.fx.push({ kind: 'puff', x: 66 - i * 14, y: GY - 14 - i * 4, t: i * 0.13, dur: 0.55, vx: 0, vy: 0, sc: 0.6, col: 'smoke', world: true });
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
    document.body.classList.add('frame-mode');
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

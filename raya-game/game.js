/* Isi Balang Raya Opah: drawing, input and screens.
 *
 * Rules live in sim.js (shared with the server). This file only reads the
 * rule state, turns its events into animation, and sends player input back.
 * Everything is drawn in code as soft, rounded vector art on one canvas, at
 * 360x640 design units scaled to the screen.
 */
(function () {
  'use strict';

  var Sim = window.RayaSim, Snd = window.RayaAudio;

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  var CONFIG = {
    campaign: { start: '2027-01-11', weeks: 8, prefix: 'raya27' },
    apiBase: '',                 // leaderboard server; empty = demo mode
    starMs: [45000, 60000],      // 3 stars at or under 45 s, 2 stars at or under 60 s
    productUrl: 'https://shopee.com.my/search?keyword=the%20baker%20e-1ag',
    storageKey: 'opah27'
  };

  var KUIH = ['Tart Nenas', 'Semperit', 'Almond London', 'Cornflakes Madu', 'Coklat Cip', 'Biskut Makmur'];
  var PEOPLE = [
    { name: 'Mak Long', skin: '#E2AE86', wear: 'tudung', scarf: '#E79BB0', scarf2: '#C97A93', body: '#F4BFCB', body2: '#DE9CAD', dots: '#FFF1F4',
      lines: ['Tolong isi {k} untuk Mak Long, ya!', 'Mak Long nak bawa {k} balik KL!'] },
    { name: 'Pak Su', skin: '#C88E62', wear: 'songkok', hair: '#2A1B12', body: '#3FA7A0', body2: '#2E8781', samping: '#C98A1E',
      lines: ['{K} untuk rumah terbuka pejabat Pak Su!', 'Pak Su nak {k} sebalang!'] },
    { name: 'Kak Ton', skin: '#D9A272', wear: 'tudung', scarf: '#E6AE45', scarf2: '#C98E2C', body: '#F3E1BD', body2: '#DCC497', glasses: true, dots: '#E6AE45',
      lines: ['Kak Ton datang tukar kuih. Nak {k}!', '{K} untuk tetamu Kak Ton, boleh?'] },
    { name: 'Atuk', skin: '#C08A5E', wear: 'kopiah', beard: true, body: '#EEE6D3', body2: '#D3C7AE', samping: '#2F6B4F',
      lines: ['Atuk nak bawa {k} ke surau.', '{K} untuk kawan-kawan surau Atuk!'] },
    { name: 'Uncle Lim', skin: '#EFC9A4', wear: 'hair', hair: '#8E8E8E', body: '#8EC3E6', body2: '#6EA6CC', glasses: true, collar: true,
      lines: ['Selamat Hari Raya! Uncle nak {k}.', 'Uncle nak {k}, kuih Opah paling sedap!'] },
    { name: 'Kak Ngah', skin: '#E9BC94', wear: 'tudung', scarf: '#B9A0E2', scarf2: '#9A80C8', body: '#DCCFF4', body2: '#C2B0E6', dots: '#FFFFFF',
      lines: ['Kak Ngah nak isi balang rumah sendiri: {k}!', '{K}, untuk Kak Ngah ya!'] }
  ];
  var OPAH = { skin: '#E4B48E', wear: 'tudung', scarf: '#E9DCF2', scarf2: '#CDB8DE', glasses: true, old: true };
  var ADIK = { skin: '#E2AE86', wear: 'songkok', hair: '#2A1B12' };
  var THANKS = ['Terima kasih, sayang!', 'Wanginya!', 'Cantik balang ni!', 'Selamat Hari Raya!', 'Terima kasih, cucu Opah!'];
  var OPAH_CHEER = ['Pandai cucu Opah!', 'Laju, bagus!', 'Teruskan, sayang!'];

  // ---------------------------------------------------------------------------
  // Layout (design units)
  // ---------------------------------------------------------------------------
  var W = 360, H = 640;
  var WIN = { x: 80, y: 60, w: 200, h: 108 };
  var JAR_X = [60, 180, 300], JAR_BASE = 304, TAG_Y = 207;
  var DROP_LINE = 352;
  var TRAY = { x: 50, y: 362, w: 260, h: 106 };
  var SLOT_X = [84, 148, 212, 276], SLOT_Y = [389, 441];
  var OVEN = { x: 98, y: 480, w: 164, h: 138 };
  var GLASS = { x: 108, y: 500, w: 144, h: 84 };
  var OVEN_DOOR = { x: 180, y: 544 };
  var OPAH_X = 318;
  var ARRIVE_MS = Sim.RULES.arriveMs;

  function slotPos(i) { return { x: SLOT_X[i % 4], y: SLOT_Y[i >> 2] }; }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function easeOut(k) { return 1 - (1 - k) * (1 - k); }
  function easeBack(k) { var c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function fmt(ms) { return (Math.max(0, ms) / 1000).toFixed(2); }
  function store(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(CONFIG.storageKey + ':' + k);
      localStorage.setItem(CONFIG.storageKey + ':' + k, String(v));
    } catch (e) { return null; }
    return null;
  }
  function track(name, params) {
    params = params || {};
    try { if (typeof window.fbq === 'function') window.fbq('trackCustom', name, params); } catch (e) { /* ignore */ }
    try { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: name }, params)); } catch (e) { /* ignore */ }
  }
  function haptic(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ } }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgb(' + clamp((n >> 16) + amt, 0, 255) + ',' + clamp(((n >> 8) & 255) + amt, 0, 255) + ',' + clamp((n & 255) + amt, 0, 255) + ')';
  }
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function lin(c, x0, y0, x1, y1, stops) {
    var g = c.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    return g;
  }
  function radg(c, x0, y0, r0, x1, y1, r1, stops) {
    var g = c.createRadialGradient(x0, y0, r0, x1, y1, r1);
    stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    return g;
  }
  function ell(c, x, y, rx, ry, fill, rot) {
    c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2);
    c.fillStyle = fill; c.fill();
  }
  function softShadow(c, x, y, rx, ry, a) {
    c.save();
    c.translate(x, y); c.scale(1, ry / rx);
    c.fillStyle = radg(c, 0, 0, 0, 0, 0, rx, [[0, 'rgba(40,18,4,' + a + ')'], [1, 'rgba(40,18,4,0)']]);
    c.beginPath(); c.arc(0, 0, rx, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  var FD = '"Baloo 2", "Nunito", system-ui, sans-serif', FB = '"Nunito", system-ui, sans-serif';
  function text(c, str, x, y, size, color, o) {
    o = o || {};
    c.font = (o.weight || 800) + ' ' + size + 'px ' + (o.family || FD);
    c.textAlign = o.align || 'center';
    c.textBaseline = o.base || 'middle';
    c.globalAlpha = o.alpha == null ? 1 : o.alpha;
    if (o.stroke) { c.lineJoin = 'round'; c.lineWidth = o.sw || size * 0.24; c.strokeStyle = o.stroke; c.strokeText(str, x, y); }
    c.fillStyle = color;
    c.fillText(str, x, y);
    c.globalAlpha = 1;
  }

  // ---------------------------------------------------------------------------
  // Canvas, scaling and pre-drawn layers
  // ---------------------------------------------------------------------------
  var stage = $('stage'), canvas = $('game'), ctx = canvas.getContext('2d');
  var K = 2, L = {}, SPR = { kuih: [], toy: [] };
  var logoImg = new Image(), logoWhite = null;

  function layout() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var s = Math.min(vw / W, vh / H);
    var cw = Math.floor(W * s), ch = Math.floor(H * s);
    stage.style.width = cw + 'px';
    stage.style.height = ch + 'px';
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    K = canvas.width / W;
    document.documentElement.style.setProperty('--u', (cw / W) + 'px');
    buildSprites();
    buildLayers();
  }
  function layerCanvas(draw) {
    var c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    var x = c.getContext('2d');
    x.setTransform(K, 0, 0, K, 0, 0);
    draw(x);
    return c;
  }
  function blit(layer) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer, 0, 0);
    ctx.setTransform(K, 0, 0, K, 0, 0);
  }
  function sprite(size, draw) {
    var px = Math.ceil(size * K) + 2, c = document.createElement('canvas');
    c.width = px; c.height = px;
    var x = c.getContext('2d');
    x.scale(px / 100, px / 100);
    draw(x);
    return c;
  }

  // ---------------------------------------------------------------------------
  // Kuih and toys, drawn in a 100x100 box
  // ---------------------------------------------------------------------------
  function kTart(c) {
    c.save(); c.translate(50, 52);
    c.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = i / 10 * Math.PI * 2;
      c.arc(Math.cos(a) * 33, Math.sin(a) * 33, 12, a - Math.PI / 2, a + Math.PI / 2);
    }
    c.closePath();
    c.fillStyle = radg(c, -12, -14, 4, 0, 0, 48, [[0, '#FDE09A'], [0.55, '#EDB357'], [1, '#C98532']]);
    c.fill();
    c.strokeStyle = 'rgba(140,80,20,0.35)'; c.lineWidth = 2; c.stroke();
    ell(c, 0, 0, 26, 26, '#E3A244');
    ell(c, 0, 1, 22, 22, '#CF8730');
    c.beginPath(); c.arc(0, -1, 19, 0, Math.PI * 2);
    c.fillStyle = radg(c, -6, -8, 2, 0, 0, 22, [[0, '#FFB868'], [0.5, '#F07A2E'], [1, '#B8461A']]);
    c.fill();
    c.save(); c.beginPath(); c.arc(0, -1, 19, 0, Math.PI * 2); c.clip();
    c.strokeStyle = '#F7D584'; c.lineWidth = 3.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-14, -14); c.lineTo(12, 12); c.moveTo(12, -14); c.lineTo(-14, 12); c.stroke();
    c.restore();
    ell(c, -7, -9, 5, 3, 'rgba(255,255,255,0.55)', -0.6);
    c.restore();
  }
  function kSemperit(c) {
    c.save(); c.translate(50, 52);
    for (var i = 0; i < 8; i++) {
      var a = i / 8 * Math.PI * 2, x = Math.cos(a) * 24, y = Math.sin(a) * 24;
      c.beginPath(); c.arc(x, y, 15, 0, Math.PI * 2);
      c.fillStyle = radg(c, x - 5, y - 6, 2, x, y, 17, [[0, '#FFF3D2'], [0.7, '#F2D396'], [1, '#D6AA64']]);
      c.fill();
      c.strokeStyle = 'rgba(180,128,60,0.45)'; c.lineWidth = 1.8;
      c.beginPath(); c.arc(x, y, 9, a + 0.9, a + 2.6); c.stroke();
      c.beginPath(); c.arc(x, y, 9, a - 2.6, a - 0.9); c.stroke();
    }
    ell(c, 0, 0, 14, 14, '#E8C27E');
    c.beginPath(); c.arc(0, 0, 9, 0, Math.PI * 2);
    c.fillStyle = radg(c, -3, -3, 1, 0, 0, 10, [[0, '#FF8A8A'], [0.6, '#E0202E'], [1, '#A30E1E']]);
    c.fill();
    ell(c, -3, -3.5, 3, 2, 'rgba(255,255,255,0.7)', -0.5);
    c.restore();
  }
  function kAlmond(c) {
    c.save(); c.translate(50, 56);
    c.beginPath(); c.ellipse(0, -30, 9, 13, 0, 0, Math.PI * 2);
    c.fillStyle = radg(c, -3, -36, 1, 0, -30, 14, [[0, '#FBE3B8'], [1, '#C9955A']]);
    c.fill();
    c.beginPath(); c.ellipse(0, 2, 37, 32, 0, 0, Math.PI * 2);
    c.fillStyle = radg(c, -13, -14, 3, 0, 0, 44, [[0, '#A2633A'], [0.5, '#5E3019'], [1, '#341A0C']]);
    c.fill();
    [[-14, -8, '#FFFFFF'], [10, -14, '#F2B84B'], [18, 4, '#FFD6E0'], [-4, 10, '#FFFFFF'], [-20, 8, '#F2B84B'], [6, 18, '#FFD6E0'], [0, -6, '#F2B84B'], [-10, 20, '#FFFFFF']]
      .forEach(function (d, k) {
        c.save(); c.translate(d[0], d[1]); c.rotate(k * 0.8);
        rr(c, -3.5, -1.2, 7, 2.4, 1.2); c.fillStyle = d[2]; c.fill();
        c.restore();
      });
    ell(c, -12, -12, 8, 4, 'rgba(255,255,255,0.22)', -0.5);
    c.restore();
  }
  function kCornflakes(c) {
    c.save(); c.translate(50, 54);
    c.beginPath(); c.moveTo(-33, 0); c.lineTo(33, 0); c.lineTo(25, 36); c.lineTo(-25, 36); c.closePath();
    c.fillStyle = lin(c, -33, 0, 33, 0, [[0, '#FF6464'], [0.5, '#E0303A'], [1, '#B81E2A']]);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1.6;
    for (var i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(i * 7.4, 1); c.lineTo(i * 5.6, 35); c.stroke(); }
    var flakes = [[-22, -6, 11, 0.2], [-8, -12, 12, 1.1], [8, -10, 12, 2.1], [22, -4, 10, 0.7], [-16, -20, 10, 2.6], [2, -24, 11, 0.4],
      [16, -20, 10, 1.7], [-2, -4, 12, 2.9], [-26, 2, 8, 1.3], [26, 4, 8, 0.9], [-8, -30, 8, 1.9], [10, -30, 8, 2.4]];
    flakes.forEach(function (f, k) {
      c.save(); c.translate(f[0], f[1]); c.rotate(f[3]);
      c.beginPath();
      for (var p = 0; p < 6; p++) {
        var a = p / 6 * Math.PI * 2, rr2 = f[2] * (0.72 + ((k * 7 + p * 3) % 5) * 0.08);
        if (p === 0) c.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2 * 0.7); else c.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2 * 0.7);
      }
      c.closePath();
      c.fillStyle = k % 3 === 0 ? '#F7D27A' : (k % 3 === 1 ? '#EDB64F' : '#D99A2E');
      c.fill();
      c.strokeStyle = 'rgba(150,90,20,0.35)'; c.lineWidth = 1.2; c.stroke();
      c.restore();
    });
    [[-10, -16], [12, -14], [-2, -28], [20, -6]].forEach(function (h) { ell(c, h[0], h[1], 3, 1.6, 'rgba(255,255,255,0.6)', -0.4); });
    c.restore();
  }
  function kCoklat(c) {
    c.save(); c.translate(50, 52);
    c.beginPath();
    for (var i = 0; i < 24; i++) {
      var a = i / 24 * Math.PI * 2, r = 38 + ((i * 5) % 7) * 0.5;
      if (i === 0) c.moveTo(Math.cos(a) * r, Math.sin(a) * r); else c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.closePath();
    c.fillStyle = radg(c, -12, -14, 4, 0, 0, 42, [[0, '#F7D087'], [0.6, '#E2A54F'], [1, '#B97A30']]);
    c.fill();
    c.strokeStyle = 'rgba(255,230,170,0.6)'; c.lineWidth = 1.6;
    [[-20, -2, 10, 0.3], [6, -22, 9, 2], [14, 14, 8, 1.2]].forEach(function (k) { c.beginPath(); c.arc(k[0], k[1], k[2], k[3], k[3] + 1.4); c.stroke(); });
    [[-14, -12, 6], [10, -14, 5.5], [17, 4, 6], [-4, 6, 5.5], [-19, 13, 5], [6, 21, 4.5], [-1, -26, 4.5], [-26, -3, 4]].forEach(function (p) {
      c.beginPath(); c.ellipse(p[0], p[1], p[2], p[2] * 0.85, 0.4, 0, Math.PI * 2);
      c.fillStyle = '#3E2214'; c.fill();
      ell(c, p[0] - 1.5, p[1] - 1.5, p[2] * 0.35, p[2] * 0.25, '#7A4A2E');
    });
    c.restore();
  }
  function kMakmur(c) {
    c.save(); c.translate(50, 56);
    c.beginPath(); c.ellipse(0, 0, 35, 31, 0, 0, Math.PI * 2);
    c.fillStyle = radg(c, -12, -14, 3, 0, 0, 40, [[0, '#FFFFFF'], [0.6, '#F6EEE2'], [1, '#D6C5AE']]);
    c.fill();
    c.strokeStyle = 'rgba(170,145,110,0.45)'; c.lineWidth = 1.6; c.lineCap = 'round';
    [[-16, -8], [0, -14], [16, -8], [-10, 6], [8, 6], [0, 18]].forEach(function (p) {
      c.beginPath(); c.moveTo(p[0] - 4, p[1] - 2); c.lineTo(p[0], p[1] + 2); c.lineTo(p[0] + 4, p[1] - 2); c.stroke();
    });
    for (var i = 0; i < 18; i++) ell(c, -26 + (i * 37) % 52, -20 + (i * 23) % 42, 1.1, 1.1, 'rgba(255,255,255,0.95)');
    c.restore();
  }
  var KUIH_DRAW = [kTart, kSemperit, kAlmond, kCornflakes, kCoklat, kMakmur];

  function tCar(c) {
    c.save(); c.translate(50, 56);
    rr(c, -36, -8, 72, 24, 10); c.fillStyle = lin(c, 0, -8, 0, 16, [[0, '#5B97EC'], [1, '#2F63B8']]); c.fill();
    rr(c, -20, -26, 40, 22, 10); c.fillStyle = '#4A86DE'; c.fill();
    rr(c, -15, -22, 13, 14, 4); c.fillStyle = '#CFEAFF'; c.fill();
    rr(c, 2, -22, 13, 14, 4); c.fillStyle = '#CFEAFF'; c.fill();
    ell(c, 30, 2, 4, 3, '#FFE27A');
    [-22, 22].forEach(function (x) { ell(c, x, 18, 10, 10, '#2A2A30'); ell(c, x, 18, 4, 4, '#B8BEC6'); });
    ell(c, -18, -2, 10, 3, 'rgba(255,255,255,0.35)');
    c.restore();
  }
  function tGasing(c) {
    c.save(); c.translate(50, 50);
    c.beginPath(); c.moveTo(-32, -6); c.quadraticCurveTo(0, -26, 32, -6); c.quadraticCurveTo(10, 24, 0, 36); c.quadraticCurveTo(-10, 24, -32, -6); c.closePath();
    c.fillStyle = lin(c, -32, 0, 32, 0, [[0, '#E3A55C'], [1, '#9C6430']]); c.fill();
    c.strokeStyle = '#E0303A'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(-26, -2); c.quadraticCurveTo(0, -16, 26, -2); c.stroke();
    c.strokeStyle = '#F2C94C';
    c.beginPath(); c.moveTo(-18, 8); c.quadraticCurveTo(0, -2, 18, 8); c.stroke();
    rr(c, -4, -30, 8, 12, 3); c.fillStyle = '#7A4A26'; c.fill();
    c.strokeStyle = '#FFF6E4'; c.lineWidth = 2; c.beginPath(); c.moveTo(4, -26); c.quadraticCurveTo(26, -40, 36, -26); c.stroke();
    c.restore();
  }
  function tBola(c) {
    c.save(); c.translate(50, 52);
    ell(c, 0, 0, 32, 32, '#FFFFFF');
    c.save(); c.beginPath(); c.arc(0, 0, 32, 0, Math.PI * 2); c.clip();
    c.fillStyle = '#F2C94C'; c.beginPath(); c.moveTo(-40, -10); c.quadraticCurveTo(0, -30, 40, -10); c.lineTo(40, -40); c.lineTo(-40, -40); c.fill();
    c.fillStyle = '#3E7CD6'; c.beginPath(); c.moveTo(-40, 12); c.quadraticCurveTo(0, 30, 40, 12); c.lineTo(40, 40); c.lineTo(-40, 40); c.fill();
    c.restore();
    c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 31, 0, Math.PI * 2); c.stroke();
    ell(c, -11, -14, 9, 5, 'rgba(255,255,255,0.6)', -0.5);
    c.restore();
  }
  var TOY_DRAW = [tCar, tGasing, tBola];

  function buildSprites() {
    SPR.kuih = KUIH_DRAW.map(function (d) { return { big: sprite(48, d), mid: sprite(22, d), small: sprite(20, d) }; });
    SPR.toy = TOY_DRAW.map(function (d) { return sprite(44, d); });
  }

  // ---------------------------------------------------------------------------
  // Static layers
  // ---------------------------------------------------------------------------
  function drawWall(c) {
    var tones = ['#B8834F', '#AE7746', '#B47D4B', '#A97244'];
    for (var x = 0, i = 0; x < W; x += 30, i++) {
      c.fillStyle = lin(c, 0, 0, 0, 330, [[0, shade(tones[i % 4], -26)], [1, tones[i % 4]]]);
      c.fillRect(x, 0, 30, 330);
      c.fillStyle = 'rgba(70,38,16,0.45)'; c.fillRect(x, 0, 1.4, 330);
      c.strokeStyle = 'rgba(95,52,22,0.16)'; c.lineWidth = 1;
      for (var gl = 0; gl < 3; gl++) {
        c.beginPath();
        c.moveTo(x + 7 + gl * 8, 0);
        c.bezierCurveTo(x + 4 + gl * 8, 110, x + 11 + gl * 8, 210, x + 6 + gl * 8, 330);
        c.stroke();
      }
    }
    c.fillStyle = radg(c, 180, 120, 10, 180, 130, 260, [[0, 'rgba(255,196,110,0.32)'], [1, 'rgba(255,196,110,0)']]);
    c.fillRect(0, 0, W, 330);
    c.fillStyle = lin(c, 0, 0, 0, 70, [[0, 'rgba(30,14,4,0.45)'], [1, 'rgba(30,14,4,0)']]);
    c.fillRect(0, 0, W, 70);
    // carved kerawang panel above the window
    rr(c, 70, 30, 220, 24, 3); c.fillStyle = lin(c, 0, 30, 0, 54, [[0, '#8A5530'], [1, '#6A3D20']]); c.fill();
    c.fillStyle = '#2E170A';
    for (var k = 0; k < 9; k++) {
      var cx = 86 + k * 23.5, cy = 42;
      for (var p = 0; p < 4; p++) { var a = p * Math.PI / 2 + Math.PI / 4; ell(c, cx + Math.cos(a) * 4, cy + Math.sin(a) * 4, 3, 3, '#2E170A'); }
      ell(c, cx, cy, 1.6, 1.6, '#8A5530');
      if (k < 8) { c.beginPath(); c.moveTo(cx + 11.7, cy - 5); c.lineTo(cx + 15, cy); c.lineTo(cx + 11.7, cy + 5); c.lineTo(cx + 8.5, cy); c.closePath(); c.fill(); }
    }
    c.strokeStyle = '#C98A4E'; c.lineWidth = 1.2; rr(c, 70.5, 30.5, 219, 23, 3); c.stroke();
  }

  function drawFront(c) {
    // window frame, painted wood with a hole for the night scene
    c.beginPath();
    rr(c, 72, 54, 216, 122, 6);
    c.rect(WIN.x + WIN.w, WIN.y, -WIN.w, WIN.h);
    c.fillStyle = lin(c, 0, 54, 0, 176, [[0, '#F6EBD3'], [1, '#DCC8A2']]);
    c.fill('evenodd');
    c.strokeStyle = 'rgba(120,80,40,0.35)'; c.lineWidth = 1.5;
    c.strokeRect(WIN.x - 0.5, WIN.y - 0.5, WIN.w + 1, WIN.h + 1);
    c.fillStyle = 'rgba(60,30,10,0.25)'; c.fillRect(WIN.x, WIN.y, WIN.w, 3);
    // sill
    rr(c, 64, 166, 232, 12, 3); c.fillStyle = lin(c, 0, 166, 0, 178, [[0, '#C68E58'], [1, '#8E5A33']]); c.fill();
    c.fillStyle = 'rgba(40,18,4,0.25)'; c.fillRect(66, 178, 228, 3);
    // curtains (new langsir for Raya)
    [[46, 98, 1], [314, 262, -1]].forEach(function (cu) {
      var x0 = cu[0], x1 = cu[1], dir = cu[2];
      c.beginPath();
      c.moveTo(x0, 56); c.lineTo(x1, 56);
      c.quadraticCurveTo(x1 - dir * 10, 110, x0 + dir * 16, 140);
      c.quadraticCurveTo(x0 + dir * 4, 160, x0 + dir * 10, 186);
      c.lineTo(x0 - dir * 4, 186);
      c.closePath();
      c.fillStyle = lin(c, Math.min(x0, x1), 0, Math.max(x0, x1), 0, [[0, '#4C9A7B'], [0.3, '#62B592'], [0.55, '#4A9577'], [0.8, '#5EAE8C'], [1, '#3F8668']]);
      c.fill();
      c.fillStyle = 'rgba(242,206,120,0.85)';
      for (var f = 0; f < 7; f++) {
        var fx = lerp(x0, x1, 0.25 + (f % 3) * 0.22) - dir * f * 2.2, fy = 70 + f * 15;
        for (var p = 0; p < 5; p++) { var a = p / 5 * Math.PI * 2; ell(c, fx + Math.cos(a) * 2.4, fy + Math.sin(a) * 2.4, 1.5, 1.5, 'rgba(242,206,120,0.85)'); }
      }
      rr(c, x0 + dir * 8 - 7, 136, 14, 6, 3); c.fillStyle = '#E3B04B'; c.fill();
    });
    // valance
    c.beginPath(); c.moveTo(56, 50); c.lineTo(304, 50); c.lineTo(304, 64);
    for (var v = 304; v > 56; v -= 16) c.quadraticCurveTo(v - 8, 74, v - 16, 64);
    c.closePath();
    c.fillStyle = lin(c, 0, 50, 0, 74, [[0, '#3F8A6A'], [1, '#56A685']]); c.fill();
    c.fillStyle = '#E8B84E'; c.fillRect(56, 50, 248, 3);
    for (v = 296; v > 56; v -= 16) ell(c, v, 69, 1.8, 1.8, '#E8B84E');
    // old radio on the sill
    rr(c, 84, 143, 44, 25, 5); c.fillStyle = lin(c, 0, 143, 0, 168, [[0, '#9A6236'], [1, '#6A3E22']]); c.fill();
    rr(c, 88, 147, 21, 17, 3); c.fillStyle = '#E8D7B4'; c.fill();
    c.strokeStyle = 'rgba(140,100,60,0.5)'; c.lineWidth = 0.8;
    for (var gr = 0; gr < 5; gr++) { c.beginPath(); c.moveTo(89, 149.5 + gr * 3.2); c.lineTo(108, 149.5 + gr * 3.2); c.stroke(); }
    rr(c, 111, 147, 14, 7, 2); c.fillStyle = '#F6E9C9'; c.fill();
    c.fillStyle = '#D9202A'; c.fillRect(116, 147.5, 0.9, 6);
    ell(c, 114, 160, 2.6, 2.6, '#2A1A10'); ell(c, 122, 160, 2.6, 2.6, '#2A1A10');
    c.strokeStyle = '#B8BEC6'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(124, 143); c.lineTo(140, 120); c.stroke();
    ell(c, 140, 120, 1.6, 1.6, '#D8DCE2');
    // blue biscuit tin, which everyone knows holds sewing things
    rr(c, 238, 150, 38, 18, 4); c.fillStyle = lin(c, 238, 0, 276, 0, [[0, '#3A70BE'], [1, '#1E3F78']]); c.fill();
    c.fillStyle = 'rgba(243,232,208,0.85)';
    for (var d = 0; d < 6; d++) ell(c, 243 + d * 5.6, 159, 1.4, 1.4, 'rgba(243,232,208,0.85)');
    c.fillRect(238, 155, 38, 1); c.fillRect(238, 163, 38, 1);
    c.save(); c.translate(258, 149); c.rotate(-0.12);
    ell(c, 0, 0, 21, 4, '#2F62AE'); ell(c, 0, -0.6, 17, 2.6, '#4A82CE');
    c.restore();
    rr(c, 240, 145, 6, 6, 1.5); c.fillStyle = '#E995B0'; c.fill();
    c.strokeStyle = '#D8DCE2'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(249, 148); c.lineTo(254, 139); c.stroke();
    // ketupat
    [[24, 0.15], [336, -0.15]].forEach(function (kp) { ketupat(c, kp[0], 96, kp[1]); });
  }

  function ketupat(c, x, y, tilt) {
    c.strokeStyle = '#8A6A3A'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, 20); c.lineTo(x, y - 14); c.stroke();
    c.save(); c.translate(x, y); c.rotate(Math.PI / 4 + tilt);
    rr(c, -10, -10, 20, 20, 2); c.save(); c.clip();
    for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
      c.fillStyle = (i + j) % 2 ? '#9CC45A' : '#D6E27A';
      c.fillRect(-10 + i * 5, -10 + j * 5, 5, 5);
    }
    c.restore();
    c.strokeStyle = '#5E7F2E'; c.lineWidth = 1.2; rr(c, -10, -10, 20, 20, 2); c.stroke();
    c.restore();
    c.strokeStyle = '#9CC45A'; c.lineWidth = 2.2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - 1, y + 13); c.quadraticCurveTo(x - 5, y + 22, x - 2, y + 30); c.stroke();
    c.strokeStyle = '#D6E27A';
    c.beginPath(); c.moveTo(x + 1, y + 13); c.quadraticCurveTo(x + 5, y + 20, x + 3, y + 27); c.stroke();
  }

  function drawTableAndKitchen(c) {
    // lower kitchen wall
    for (var x = 0, i = 0; x < W; x += 30, i++) {
      c.fillStyle = lin(c, 0, 300, 0, 640, [[0, i % 2 ? '#875632' : '#8E5C37'], [1, i % 2 ? '#6E4426' : '#74482A']]);
      c.fillRect(x, 300, 30, 340);
      c.fillStyle = 'rgba(40,18,4,0.4)'; c.fillRect(x, 300, 1.4, 340);
    }
    c.fillStyle = 'rgba(255,190,110,0.08)'; c.fillRect(0, 300, W, 340);
    // table: top face, front, crochet tablecloth
    c.fillStyle = lin(c, 0, 294, 0, 306, [[0, '#CF9460'], [1, '#A86F42']]); c.fillRect(0, 294, W, 12);
    c.fillStyle = '#E2AE78'; c.fillRect(0, 294, W, 1.5);
    c.fillStyle = lin(c, 0, 306, 0, 352, [[0, '#8A5532'], [1, '#6E4024']]); c.fillRect(0, 306, W, 46);
    for (x = 18; x < W; x += 54) { c.fillStyle = 'rgba(40,18,4,0.25)'; c.fillRect(x, 330, 1.2, 22); }
    c.fillStyle = 'rgba(40,18,4,0.35)'; c.fillRect(0, 352, W, 4);
    c.fillStyle = '#FFF7EA'; c.fillRect(0, 303, W, 13);
    c.beginPath(); c.moveTo(0, 316);
    for (x = 0; x < W; x += 14) c.arc(x + 7, 316, 7, Math.PI, 0, true);
    c.lineTo(W, 303); c.lineTo(0, 303); c.closePath();
    c.fillStyle = '#FFF7EA'; c.fill();
    for (x = 7; x < W; x += 14) { ell(c, x, 318, 2, 2, '#E3D0B2'); ell(c, x, 309, 1.3, 1.3, '#E9DAC2'); ell(c, x + 7, 309, 1, 1, '#E9DAC2'); }
    c.fillStyle = 'rgba(40,18,4,0.18)'; c.fillRect(0, 324, W, 2);
    // ledge and tray
    softShadow(c, 180, 470, 150, 8, 0.35);
    rr(c, 36, 466, 288, 9, 3); c.fillStyle = lin(c, 0, 466, 0, 475, [[0, '#C68E58'], [1, '#8E5A33']]); c.fill();
    rr(c, TRAY.x, TRAY.y, TRAY.w, TRAY.h, 12);
    c.fillStyle = lin(c, 0, TRAY.y, 0, TRAY.y + TRAY.h, [[0, '#E6EAEF'], [1, '#A2A9B3']]); c.fill();
    rr(c, TRAY.x + 6, TRAY.y + 6, TRAY.w - 12, TRAY.h - 12, 8);
    c.fillStyle = '#F4E8D0'; c.fill();
    c.strokeStyle = 'rgba(190,160,110,0.35)'; c.lineWidth = 1;
    for (var cr = 0; cr < 6; cr++) {
      c.beginPath(); c.moveTo(TRAY.x + 20 + cr * 40, TRAY.y + 10);
      c.quadraticCurveTo(TRAY.x + 32 + cr * 40, TRAY.y + 50, TRAY.x + 18 + cr * 40, TRAY.y + 96); c.stroke();
    }
    for (var s = 0; s < 8; s++) { var p = slotPos(s); ell(c, p.x, p.y + 15, 20, 4, 'rgba(150,110,60,0.16)'); }
    // bench, and shadows under the oven and mixer
    c.fillStyle = lin(c, 0, 616, 0, 640, [[0, '#C68E58'], [0.3, '#A06A3E'], [1, '#7A4C2A']]); c.fillRect(0, 616, W, 24);
    c.fillStyle = '#DDA36B'; c.fillRect(0, 616, W, 1.5);
    softShadow(c, 180, 620, 96, 7, 0.55);
    softShadow(c, 50, 620, 48, 6, 0.45);
  }

  function drawAppliances(c) {
    var o = OVEN, x = o.x, y = o.y;
    // E-1AG convection oven
    rr(c, x, y, o.w, o.h, 10);
    c.fillStyle = lin(c, 0, y, 0, y + o.h, [[0, '#33333B'], [0.4, '#1E1E24'], [1, '#121216']]); c.fill();
    c.save(); rr(c, x, y, o.w, o.h, 10); c.clip();
    c.fillStyle = lin(c, x, 0, x + 7, 0, [[0, '#D9DEE4'], [1, '#8C939D']]); c.fillRect(x, y, 7, o.h);
    c.fillStyle = lin(c, x + o.w - 7, 0, x + o.w, 0, [[0, '#8C939D'], [1, '#C9CED6']]); c.fillRect(x + o.w - 7, y, 7, o.h);
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(x, y, o.w, 2);
    c.restore();
    // handle
    softShadow(c, 180, 497, 70, 3, 0.5);
    rr(c, 114, 486, 132, 8, 4); c.fillStyle = lin(c, 0, 486, 0, 494, [[0, '#F6F8FA'], [0.5, '#C2C8D0'], [1, '#7E858F']]); c.fill();
    rr(c, 118, 492, 6, 6, 1.5); c.fillStyle = '#0E0E12'; c.fill();
    rr(c, 236, 492, 6, 6, 1.5); c.fill();
    // glass: cut a hole for the warm interior, then add reflections
    rr(c, GLASS.x - 2, GLASS.y - 2, GLASS.w + 4, GLASS.h + 4, 7); c.fillStyle = '#0A0A0D'; c.fill();
    c.save(); c.globalCompositeOperation = 'destination-out';
    rr(c, GLASS.x, GLASS.y, GLASS.w, GLASS.h, 6); c.fill();
    c.restore();
    c.save(); rr(c, GLASS.x, GLASS.y, GLASS.w, GLASS.h, 6); c.clip();
    c.fillStyle = lin(c, GLASS.x, GLASS.y, GLASS.x + 80, GLASS.y + 84, [[0, 'rgba(255,255,255,0.16)'], [0.35, 'rgba(255,255,255,0.03)'], [0.36, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']]);
    c.fillRect(GLASS.x, GLASS.y, GLASS.w, GLASS.h);
    c.fillStyle = 'rgba(255,255,255,0.07)';
    c.beginPath(); c.moveTo(GLASS.x + 70, GLASS.y); c.lineTo(GLASS.x + 84, GLASS.y); c.lineTo(GLASS.x + 40, GLASS.y + GLASS.h); c.lineTo(GLASS.x + 26, GLASS.y + GLASS.h); c.closePath(); c.fill();
    c.restore();
    // control panel: logo and model like the real oven
    rr(c, 104, 590, 152, 23, 4); c.fillStyle = '#111115'; c.fill();
    c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(106, 590, 148, 1);
    if (logoWhite) c.drawImage(logoWhite, 110, 595.5, 46, 12);
    text(c, 'E-1AG', 174, 602, 7.5, '#E3E6EA', { weight: 700, family: FB });
    [205, 231].forEach(function (dx, i) {
      ell(c, dx, 601.5, 8.5, 8.5, lin(c, dx - 8, 593, dx + 8, 610, [[0, '#EEF1F5'], [1, '#7E858F']]));
      ell(c, dx, 601.5, 6, 6, '#16161B');
      c.strokeStyle = '#FFFFFF'; c.lineWidth = 1.3; c.lineCap = 'round';
      var a = i ? 0.9 : -2.2;
      c.beginPath(); c.moveTo(dx, 601.5); c.lineTo(dx + Math.cos(a) * 4.5, 601.5 + Math.sin(a) * 4.5); c.stroke();
    });
    ell(c, 249, 601.5, 4.5, 4.5, 'rgba(255,60,60,0.35)');
    ell(c, 249, 601.5, 2.4, 2.4, '#FF3B3B');
    rr(c, x + 6, y + o.h - 2, 12, 5, 2); c.fillStyle = '#0B0B0E'; c.fill();
    rr(c, x + o.w - 18, y + o.h - 2, 12, 5, 2); c.fill();

    // B10-ES mixer, Opah's own
    var mx = 8;
    rr(c, mx + 2, 604, 84, 14, 5); c.fillStyle = lin(c, 0, 604, 0, 618, [[0, '#C9CED6'], [1, '#8C939D']]); c.fill();
    rr(c, mx + 52, 512, 22, 96, 6); c.fillStyle = lin(c, mx + 52, 0, mx + 74, 0, [[0, '#F0F2F5'], [0.4, '#C9CED6'], [1, '#8C939D']]); c.fill();
    rr(c, mx + 30, 570, 36, 7, 3); c.fillStyle = '#8C939D'; c.fill();
    c.beginPath();
    c.moveTo(mx + 4, 550); c.lineTo(mx + 60, 550);
    c.bezierCurveTo(mx + 60, 578, mx + 50, 592, mx + 32, 592);
    c.bezierCurveTo(mx + 14, 592, mx + 4, 578, mx + 4, 550);
    c.closePath();
    c.fillStyle = lin(c, mx + 4, 0, mx + 60, 0, [[0, '#B8BEC6'], [0.25, '#FBFCFD'], [0.5, '#C9CED6'], [1, '#7E858F']]); c.fill();
    ell(c, mx + 32, 550, 28, 4.5, '#9AA1AB');
    ell(c, mx + 32, 549, 24, 3.4, '#F3DFB2');
    rr(c, mx + 4, 492, 76, 36, 12); c.fillStyle = lin(c, 0, 492, 0, 528, [[0, '#F2F4F7'], [0.5, '#C9CED6'], [1, '#9AA1AB']]); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.5)'; rr(c, mx + 10, 495, 60, 4, 2); c.fill();
    rr(c, mx + 10, 501, 28, 15, 2.5); c.fillStyle = '#D90000'; c.fill();
    if (logoWhite) c.drawImage(logoWhite, mx + 12, 505, 24, 6.2);
    rr(c, mx + 44, 501, 20, 15, 2.5); c.fillStyle = '#16161B'; c.fill();
    ell(c, mx + 54, 508.5, 3.6, 3.6, '#2EB85C');
    ell(c, mx + 53, 507.5, 1.2, 1.2, 'rgba(255,255,255,0.6)');
    ell(c, mx + 80, 518, 3.5, 3.5, '#9AA1AB');
    c.strokeStyle = '#16161B'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(mx + 80, 518); c.lineTo(mx + 86, 534); c.stroke();
    rr(c, mx + 29, 528, 6, 16, 2); c.fillStyle = '#9AA1AB'; c.fill();
  }

  function buildLayers() {
    if (!canvas.width) return;
    L.wall = layerCanvas(drawWall);
    L.front = layerCanvas(drawFront);
    L.table = layerCanvas(drawTableAndKitchen);
    L.app = layerCanvas(drawAppliances);
  }

  // ---------------------------------------------------------------------------
  // Night scene in the window (also used on the share card)
  // ---------------------------------------------------------------------------
  var STARS = [];
  for (var si = 0; si < 26; si++) STARS.push({ u: (si * 0.618) % 1, v: ((si * 0.37) % 1) * 0.55, r: 0.5 + (si % 3) * 0.35, p: si * 1.7 });

  function drawWindowScene(c, X, Y, Ww, Hh, lit, ts, fireworks) {
    c.save();
    c.beginPath(); c.rect(X, Y, Ww, Hh); c.clip();
    var sky = lin(c, 0, Y, 0, Y + Hh, [[0, '#141A3A'], [0.5, '#2E2659'], [0.8, '#6A3E66'], [1, '#A8586A']]);
    c.fillStyle = sky; c.fillRect(X, Y, Ww, Hh);
    STARS.forEach(function (s) {
      c.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(ts * 1.5 + s.p));
      ell(c, X + s.u * Ww, Y + 4 + s.v * Hh, s.r, s.r, '#FFF6E0');
    });
    c.globalAlpha = 1;
    var mx = X + Ww - 30, my = Y + 22;
    ell(c, mx, my, 18, 18, 'rgba(255,232,168,0.12)');
    ell(c, mx, my, 9, 9, '#FFE8A8');
    ell(c, mx + 4, my - 3, 8.4, 8.4, sky);
    c.fillStyle = '#251F48';
    c.beginPath(); c.moveTo(X, Y + Hh - 26);
    c.quadraticCurveTo(X + Ww * 0.25, Y + Hh - 40, X + Ww * 0.5, Y + Hh - 28);
    c.quadraticCurveTo(X + Ww * 0.75, Y + Hh - 18, X + Ww, Y + Hh - 32);
    c.lineTo(X + Ww, Y + Hh); c.lineTo(X, Y + Hh); c.closePath(); c.fill();
    palm(c, X + 18, Y + Hh - 16, 38, 0.15);
    palm(c, X + 36, Y + Hh - 16, 28, -0.1);
    palm(c, X + Ww - 20, Y + Hh - 16, 34, -0.2);
    house(c, X + Ww / 2 - 30, Y + Hh - 18, lit);
    c.fillStyle = '#1B2422'; c.fillRect(X, Y + Hh - 18, Ww, 18);
    c.fillStyle = '#2C3530'; c.fillRect(X, Y + Hh - 18, Ww, 1.5);
    c.fillStyle = '#3A3A30';
    c.beginPath(); c.moveTo(X + Ww / 2 - 6, Y + Hh - 18); c.lineTo(X + Ww / 2 + 6, Y + Hh - 18); c.lineTo(X + Ww / 2 + 20, Y + Hh); c.lineTo(X + Ww / 2 - 20, Y + Hh); c.closePath(); c.fill();
    var n = Sim.RULES.balang, x0 = X + 48, step = (Ww - 96) / (n - 1), py = Y + Hh - 6;
    for (var i = 0; i < n; i++) {
      var px = x0 + i * step;
      c.fillStyle = '#C9A46A'; c.fillRect(px - 0.8, py - 10, 1.6, 10);
      ell(c, px, py - 10, 3, 1.4, '#8A6A3A');
      if (i < lit) {
        var fl = 1 + 0.12 * Math.sin(ts * 12 + i * 1.9);
        c.fillStyle = radg(c, px, py - 13, 0, px, py - 13, 10, [[0, 'rgba(255,180,70,0.6)'], [1, 'rgba(255,180,70,0)']]);
        c.beginPath(); c.arc(px, py - 13, 10, 0, Math.PI * 2); c.fill();
        c.beginPath();
        c.moveTo(px, py - 11 - 6 * fl);
        c.quadraticCurveTo(px + 2.6, py - 13, px, py - 10.5);
        c.quadraticCurveTo(px - 2.6, py - 13, px, py - 11 - 6 * fl);
        c.fillStyle = lin(c, 0, py - 17, 0, py - 10, [[0, '#FFF3C4'], [1, '#FF9A2E']]);
        c.fill();
      }
    }
    if (fireworks) fireworks.forEach(function (f) {
      var k = f.k, r = easeOut(Math.min(1, k * 1.3)) * f.r;
      c.globalAlpha = clamp(1.3 - k * 1.3, 0, 1);
      for (var p = 0; p < f.n; p++) {
        var a = p / f.n * Math.PI * 2;
        ell(c, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r + k * k * 6, 1.1, 1.1, f.col);
        ell(c, f.x + Math.cos(a) * r * 0.6, f.y + Math.sin(a) * r * 0.6 + k * k * 4, 0.8, 0.8, k < 0.5 ? '#FFFFFF' : f.col);
      }
      if (k < 0.15) ell(c, f.x, f.y, 3, 3, '#FFFFFF');
      c.globalAlpha = 1;
    });
    c.restore();
  }
  function palm(c, x, gy, h, lean) {
    c.strokeStyle = '#1A173A'; c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, gy); c.quadraticCurveTo(x + lean * h, gy - h * 0.6, x + lean * h * 1.4, gy - h); c.stroke();
    var tx = x + lean * h * 1.4, ty = gy - h;
    c.lineWidth = 2;
    [[-12, 4], [-9, -4], [0, -7], [9, -4], [12, 4], [-6, 7], [6, 7]].forEach(function (d) {
      c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(tx + d[0] * 0.6, ty + d[1] * 0.4 - 3, tx + d[0], ty + d[1]); c.stroke();
    });
  }
  function house(c, x, gy, lit) {
    c.fillStyle = '#2E1E1C';
    for (var i = 0; i < 5; i++) c.fillRect(x + 4 + i * 13, gy - 8, 2, 8);
    c.fillStyle = '#4A2E26'; c.fillRect(x, gy - 10, 60, 3);
    c.fillStyle = lin(c, 0, gy - 30, 0, gy - 10, [[0, '#5A3A2E'], [1, '#43291F']]); c.fillRect(x + 3, gy - 30, 54, 20);
    c.fillStyle = '#2A1A1C';
    c.beginPath(); c.moveTo(x - 6, gy - 29); c.lineTo(x + 30, gy - 50); c.lineTo(x + 66, gy - 29); c.closePath(); c.fill();
    c.strokeStyle = '#6A4A3A'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 30, gy - 50); c.lineTo(x + 30, gy - 44); c.stroke();
    var wins = [[x + 9, gy - 26], [x + 22, gy - 26], [x + 41, gy - 26]];
    wins.forEach(function (w, k) {
      var on = k === 0 || lit >= (k === 1 ? 4 : 8);
      if (on) { c.fillStyle = radg(c, w[0] + 4, w[1] + 5, 0, w[0] + 4, w[1] + 5, 12, [[0, 'rgba(255,207,115,0.5)'], [1, 'rgba(255,207,115,0)']]); c.fillRect(w[0] - 8, w[1] - 7, 24, 24); }
      c.fillStyle = on ? '#FFCF73' : '#3A2626';
      c.fillRect(w[0], w[1], 8, 10);
      c.fillStyle = 'rgba(60,30,20,0.6)'; c.fillRect(w[0] + 3.6, w[1], 0.8, 10);
    });
    c.fillStyle = lit >= Sim.RULES.balang ? '#FFD98A' : '#3A2622'; c.fillRect(x + 32, gy - 26, 6, 16);
    c.fillStyle = '#2E1E1C';
    for (var s = 0; s < 3; s++) c.fillRect(x + 31 - s * 2, gy - 8 + s * 3, 8, 1.4);
  }

  // ---------------------------------------------------------------------------
  // People
  // ---------------------------------------------------------------------------
  function drawFace(c, x, y, mood, p, ts, seed) {
    c.fillStyle = 'rgba(255,120,120,0.3)';
    ell(c, x - 13, y + 9, 5, 3, 'rgba(255,120,120,0.3)'); ell(c, x + 13, y + 9, 5, 3, 'rgba(255,120,120,0.3)');
    var dark = '#2A1A10';
    c.strokeStyle = dark; c.lineCap = 'round';
    var blink = ((ts * 1000 + (seed || 0) * 977) % 3400) < 110;
    if (mood === 'happy') {
      c.lineWidth = 2.2;
      [-8, 8].forEach(function (dx) { c.beginPath(); c.arc(x + dx, y + 2.5, 3.4, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); });
    } else if (blink) {
      c.lineWidth = 1.8;
      [-8, 8].forEach(function (dx) { c.beginPath(); c.moveTo(x + dx - 3, y + 1); c.lineTo(x + dx + 3, y + 1); c.stroke(); });
    } else {
      var big = mood === 'surprise' ? 1.25 : 1;
      [-8, 8].forEach(function (dx) {
        ell(c, x + dx, y + 1, 2.7 * big, 3.4 * big, dark);
        ell(c, x + dx - 0.9, y - 0.4, 1, 1.1, '#FFFFFF');
      });
    }
    if (p.glasses) {
      c.strokeStyle = '#6B4A2A'; c.lineWidth = 1.3;
      [-8, 8].forEach(function (dx) { c.beginPath(); c.arc(x + dx, y + 1, 5.8, 0, Math.PI * 2); c.stroke(); });
      c.beginPath(); c.moveTo(x - 2.2, y + 0.5); c.lineTo(x + 2.2, y + 0.5); c.stroke();
    }
    if (p.old) {
      c.strokeStyle = 'rgba(120,70,40,0.35)'; c.lineWidth = 0.9;
      c.beginPath(); c.arc(x - 15, y + 2, 3, -0.6, 0.6); c.stroke();
      c.beginPath(); c.arc(x + 15, y + 2, 3, Math.PI - 0.6, Math.PI + 0.6); c.stroke();
    }
    if (p.beard) {
      c.beginPath(); c.ellipse(x, y + 14, 12, 9, 0, 0, Math.PI); c.fillStyle = '#F4F1EA'; c.fill();
      ell(c, x - 4, y + 8.5, 4.5, 2.2, '#F4F1EA'); ell(c, x + 4, y + 8.5, 4.5, 2.2, '#F4F1EA');
    }
    if (mood === 'happy') {
      c.beginPath(); c.arc(x, y + 9, 5.6, 0, Math.PI); c.closePath(); c.fillStyle = '#8A2A1A'; c.fill();
      ell(c, x, y + 12.2, 2.6, 1.6, '#F08A8A');
    } else if (mood === 'surprise') {
      ell(c, x, y + 11, 2.6, 3.1, '#8A2A1A');
    } else if (!p.beard) {
      c.strokeStyle = '#8A2A1A'; c.lineWidth = 1.8;
      c.beginPath(); c.arc(x, y + 7.5, 4.6, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
    }
  }

  function drawHead(c, x, y, p, mood, ts, seed, r) {
    r = r || 23;
    var skin = radg(c, x - 7, y - 8, 2, x, y, r + 4, [[0, shade(p.skin, 18)], [1, p.skin]]);
    if (p.wear === 'tudung') {
      c.beginPath();
      c.moveTo(x - r - 6, y + 2);
      c.quadraticCurveTo(x - r - 12, y + r + 18, x - r - 4, y + r + 28);
      c.lineTo(x + r + 4, y + r + 28);
      c.quadraticCurveTo(x + r + 12, y + r + 18, x + r + 6, y + 2);
      c.closePath();
      c.fillStyle = p.scarf2; c.fill();
      c.beginPath(); c.arc(x, y - 1, r + 6, 0, Math.PI * 2);
      c.fillStyle = radg(c, x - 8, y - 12, 2, x, y, r + 8, [[0, shade(p.scarf, 22)], [1, p.scarf]]);
      c.fill();
      c.beginPath(); c.ellipse(x, y + 3.5, r - 5, r - 3, 0, 0, Math.PI * 2); c.fillStyle = skin; c.fill();
      c.strokeStyle = p.scarf2; c.lineWidth = 2;
      c.beginPath(); c.ellipse(x, y + 3.5, r - 4.5, r - 2.5, 0, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
      ell(c, x, y + r + 4, 2.6, 2.6, '#F2C94C');
    } else {
      ell(c, x - r + 1, y + 2, 4, 5, shade(p.skin, -12));
      ell(c, x + r - 1, y + 2, 4, 5, shade(p.skin, -12));
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = skin; c.fill();
      if (p.wear === 'songkok') {
        c.fillStyle = p.hair || '#2A1B12';
        c.beginPath(); c.arc(x, y - 2, r, Math.PI * 1.02, Math.PI * 1.98); c.fill();
        c.beginPath();
        c.moveTo(x - r + 2, y - r + 10); c.lineTo(x - r + 5, y - r - 6); c.lineTo(x + r - 5, y - r - 6); c.lineTo(x + r - 2, y - r + 10);
        c.closePath();
        c.fillStyle = lin(c, x - r, 0, x + r, 0, [[0, '#2C2C34'], [0.35, '#45454F'], [1, '#141418']]); c.fill();
      } else if (p.wear === 'kopiah') {
        c.fillStyle = '#DAD6CC';
        c.beginPath(); c.arc(x, y - 1, r, Math.PI * 1.05, Math.PI * 1.95); c.fill();
        c.beginPath(); c.ellipse(x, y - r + 9, r - 1, 12, 0, Math.PI, 0); c.fillStyle = '#FAF7EF'; c.fill();
        for (var d = 0; d < 7; d++) ell(c, x - 15 + d * 5, y - r + 3 + (d % 2) * 3, 1, 1, '#D9D2C2');
      } else if (p.wear === 'hair') {
        c.fillStyle = p.hair;
        c.beginPath(); c.arc(x, y - 2, r + 1, Math.PI * 1.02, Math.PI * 1.98); c.fill();
        c.beginPath(); c.ellipse(x - 6, y - r + 5, 13, 7, -0.3, 0, Math.PI * 2); c.fill();
      }
    }
    drawFace(c, x, y, mood, p, ts, seed);
  }

  function drawPerson(c, x, p, mood, hop, ts, seed) {
    var hy = 190 - hop, by = 212 - hop;
    rr(c, x - 31, by, 62, 120, 24);
    c.fillStyle = lin(c, x - 31, by, x + 31, by + 70, [[0, shade(p.body, 16)], [0.6, p.body], [1, p.body2]]);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.07)';
    rr(c, x - 31, by + 18, 10, 90, 5); c.fill();
    rr(c, x + 21, by + 18, 10, 90, 5); c.fill();
    if (p.dots) for (var i = 0; i < 9; i++) ell(c, x - 20 + (i * 17) % 42, by + 26 + (i * 11) % 50, 1.8, 1.8, p.dots);
    if (p.samping) {
      c.fillStyle = p.samping;
      [0, 1, 2].forEach(function (b) { ell(c, x, by + 22 + b * 12, 2.2, 2.2, p.samping); });
    }
    if (p.collar) {
      c.fillStyle = '#F4F8FB';
      c.beginPath(); c.moveTo(x - 12, by + 2); c.lineTo(x, by + 12); c.lineTo(x - 3, by + 16); c.lineTo(x - 15, by + 8); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(x + 12, by + 2); c.lineTo(x, by + 12); c.lineTo(x + 3, by + 16); c.lineTo(x + 15, by + 8); c.closePath(); c.fill();
    }
    if (p.wear !== 'tudung') { rr(c, x - 7, hy + 16, 14, 10, 4); c.fillStyle = shade(p.skin, -14); c.fill(); }
    drawHead(c, x, hy, p, mood, ts, seed);
  }

  function drawOpah(ts, now) {
    var c = ctx, x = OPAH_X, pose = V.opah.pose, pt = now - V.opah.t0;
    if ((pose === 'ting' && pt > 700) || (pose === 'cheer' && pt > 1100)) { V.opah.pose = pose = 'idle'; }
    var hop = pose === 'cheer' ? Math.abs(Math.sin(pt / 1100 * Math.PI * 2)) * 5 : 0;
    var bob = Math.sin(ts * 2.2) * 1.1;
    var hy = 506 + bob - hop;
    rr(c, x - 40, hy + 26, 80, 150, 30);
    c.fillStyle = lin(c, x - 40, 0, x + 40, 0, [[0, '#8A62A8'], [0.55, '#6E4A8E'], [1, '#553874']]); c.fill();
    var fl = [[-24, 50], [6, 44], [26, 62], [-12, 74], [14, 88], [-28, 96], [0, 108], [24, 112]];
    fl.forEach(function (f, k) {
      for (var p = 0; p < 5; p++) {
        var a = p / 5 * Math.PI * 2 + k;
        ell(c, x + f[0] + Math.cos(a) * 3, hy + f[1] + Math.sin(a) * 3, 2, 2, k % 2 ? '#E9C46A' : '#F1DDF5');
      }
      ell(c, x + f[0], hy + f[1], 1.4, 1.4, '#FFF4D2');
    });
    var sleeve = '#7B55A0', hand = OPAH.skin;
    function arm(sx, sy, ex, ey) {
      c.strokeStyle = sleeve; c.lineWidth = 15; c.lineCap = 'round';
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
      ell(c, ex, ey, 6.5, 6.5, hand);
    }
    if (pose === 'cheer') { arm(x - 30, hy + 42, x - 40, hy - 6); arm(x + 30, hy + 42, x + 40, hy - 6); }
    else if (pose === 'ting') { arm(x - 30, hy + 44, x - 52, hy + 30); arm(x + 30, hy + 44, x + 22, hy + 76); }
    else { arm(x - 30, hy + 44, x - 12, hy + 78); arm(x + 30, hy + 44, x + 12, hy + 78); }
    var mood = pose === 'cheer' || pose === 'proud' ? 'happy' : 'ok';
    drawHead(c, x + (pose === 'ting' ? -3 : 0), hy, OPAH, mood, ts, 3, 26);
  }

  function adikPos(a, now) {
    var k = now - a.start;
    var home = a.side < 0 ? 30 : W - 30, off = a.side < 0 ? -50 : W + 50;
    if (k < 350) return lerp(off, home, easeOut(k / 350));
    if (k < 1250) return home;
    return lerp(home, off, clamp((k - 1250) / 350, 0, 1));
  }
  function adikHand(a, now) {
    var x = adikPos(a, now);
    return { x: x + (a.side < 0 ? 14 : -14), y: 384 };
  }
  function drawAdik(now, ts) {
    var a = V.adik;
    if (!a) return;
    var k = now - a.start;
    if (k > 1600) { V.adik = null; return; }
    var c = ctx, x = adikPos(a, now), bob = Math.abs(Math.sin(k / 120)) * 2;
    var hy = 400 - bob;
    rr(c, x - 17, hy + 14, 34, 60, 13);
    c.fillStyle = lin(c, x - 17, 0, x + 17, 0, [[0, '#FFDA6A'], [1, '#E9B530']]); c.fill();
    c.fillStyle = '#2E8B6E'; c.fillRect(x - 17, hy + 44, 34, 8);
    var hx = x + (a.side < 0 ? 15 : -15), hyy = hy + (k < 950 ? 6 : 26);
    c.strokeStyle = '#E9B530'; c.lineWidth = 9; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x + (a.side < 0 ? 8 : -8), hy + 24); c.lineTo(hx, hyy); c.stroke();
    ell(c, hx, hyy, 4.5, 4.5, ADIK.skin);
    if (k < 950 && !a.tossed) {
      if (a.kind === 'toy') c.drawImage(SPR.toy[a.toy], hx - 12, hyy - 22, 24, 24);
      else c.drawImage(SPR.kuih[a.guess].mid, hx - 11, hyy - 20, 22, 22);
    }
    c.save(); c.translate(x, hy); c.scale(0.78, 0.78);
    drawHead(c, 0, 0, ADIK, k > 800 && k < 1300 ? 'happy' : 'ok', ts, 7, 23);
    c.restore();
  }

  // ---------------------------------------------------------------------------
  // Balang and order tags
  // ---------------------------------------------------------------------------
  function drawJar(cx, types, wrongType, wrongK, lidK, bounceT, shakeT, now, alpha, sc) {
    var c = ctx, base = JAR_BASE;
    c.save();
    c.globalAlpha = alpha;
    var sq = now - bounceT < 260 ? Math.sin((now - bounceT) / 260 * Math.PI) * 0.07 : 0;
    var sh = now - shakeT < 380 ? Math.sin((now - shakeT) / 380 * Math.PI * 6) * 3 : 0;
    c.translate(cx + sh, base); c.scale(sc * (1 + sq), sc * (1 - sq)); c.translate(-cx, -base);
    softShadow(c, cx, base + 1, 31, 5, 0.4);
    var x = cx - 27, y = base - 58, w = 54, h = 58;
    rr(c, x, y, w, h, 9); c.fillStyle = 'rgba(214,236,250,0.24)'; c.fill();
    var n = types.length;
    function spot(i) { var col = i % 3, row = Math.floor(i / 3); return { x: cx - 15 + col * 15 + (row % 2 ? 4 : 0), y: base - 12 - row * 14 }; }
    types.forEach(function (t, i) { var s = spot(i); c.drawImage(SPR.kuih[t].small, s.x - 10, s.y - 10, 20, 20); });
    if (wrongType >= 0) {
      var s = spot(n), wob = Math.sin(now / 90) * 0.25;
      var fx = lerp(s.x, s.x, 1), fy = lerp(s.y - 60, s.y, easeOut(wrongK));
      c.save(); c.translate(fx, fy); c.rotate(wob);
      c.drawImage(SPR.kuih[wrongType].small, -10, -10, 20, 20);
      c.restore();
    }
    rr(c, x, y, w, h, 9); c.lineWidth = 1.6; c.strokeStyle = 'rgba(255,255,255,0.8)'; c.stroke();
    c.strokeStyle = 'rgba(110,150,180,0.4)'; c.beginPath(); c.moveTo(x + w - 2, y + 9); c.lineTo(x + w - 2, y + h - 9); c.stroke();
    rr(c, x + 6, y + 8, 4, h - 18, 2); c.fillStyle = 'rgba(255,255,255,0.6)'; c.fill();
    rr(c, x + 4, y - 5, w - 8, 7, 3); c.fillStyle = 'rgba(225,242,255,0.65)'; c.fill();
    var k = clamp(lidK, 0, 1), kb = k < 1 ? k : 1;
    var lx = lerp(cx + 42, cx, kb), ly = lerp(base - 3, y - 9, kb) - Math.sin(kb * Math.PI) * 20;
    var lw = lerp(24, 58, kb), lh = lerp(6, 11, kb);
    if (k >= 1) { var settle = easeBack(clamp((now - (bounceT || 0)) / 200, 0, 1)); void settle; }
    rr(c, lx - lw / 2, ly - lh / 2, lw, lh, 4);
    c.fillStyle = lin(c, 0, ly - lh / 2, 0, ly + lh / 2, [[0, '#FF4A4A'], [1, '#C40000']]); c.fill();
    rr(c, lx - lw / 2 + 3, ly - lh / 2 + 1.5, lw - 6, 2, 1); c.fillStyle = 'rgba(255,255,255,0.45)'; c.fill();
    if (kb > 0.5) { rr(c, lx - 8, ly - lh / 2 - 6, 16, 7, 3); c.fillStyle = '#D90000'; c.fill(); }
    c.restore();
  }

  function drawTag(cx, jar, now) {
    var c = ctx, n = jar.items.length, w = n === 1 ? 46 : 76, h = 30, x = cx - w / 2, y = TAG_Y;
    softShadow(c, cx, y + h + 2, w / 2 + 4, 4, 0.3);
    rr(c, x, y, w, h, 9); c.fillStyle = '#FFF8EC'; c.fill();
    var warn = jar.wrong >= 0;
    c.lineWidth = warn ? 2.2 : 1;
    c.strokeStyle = warn && Math.floor(now / 220) % 2 ? '#FF7A59' : 'rgba(150,100,50,0.28)';
    c.stroke();
    jar.items.forEach(function (it, i) {
      var icx = n === 1 ? cx : cx - 16 + i * 32;
      c.drawImage(SPR.kuih[it.type].mid, icx - 11, y + 2, 22, 22);
      rr(c, icx - 11, y + 25, 22, 3, 1.5); c.fillStyle = '#EADBC0'; c.fill();
      var r = Math.min(1, it.have / it.need);
      if (r > 0) { rr(c, icx - 11, y + 25, 22 * r, 3, 1.5); c.fillStyle = r >= 1 ? '#2E9B66' : '#E8A93B'; c.fill(); }
    });
    if (warn) {
      ell(c, x + w - 3, y + 3, 8, 8, '#FF7A59');
      text(c, '!', x + w - 3, y + 3.5, 11, '#FFFFFF', { weight: 800 });
    }
  }

  // ---------------------------------------------------------------------------
  // Game state
  // ---------------------------------------------------------------------------
  var challenge = Sim.challengeFor(Date.now(), CONFIG.campaign);
  var sim = Sim.create(challenge.seed);
  var log = [], mode = 'title', raceStart = performance.now(), DEBUG = { speed: 1 };
  var drag = null, selected = -1, result = null, startToken = null, raceWallStart = 0;
  var V;
  var challengeMs = 0;
  var hm = /^#cabar-(\d{4,6})$/.exec(window.location.hash || '');
  if (hm) challengeMs = parseInt(hm[1], 10);

  function resetVisual() {
    V = {
      cust: [null, null, null], leavers: [], jarTypes: {}, flyers: [], bounces: {}, fades: [],
      lid: {}, jarBounce: [0, 0, 0], jarShake: [-9e9, -9e9, -9e9], lit: 0, sparks: [], parts: [], pops: [],
      fireworks: [], speech: null, opah: { pose: 'idle', t0: 0 }, adik: null, adikDone: {},
      toyIn: {}, toyOut: [], wrongIn: {}, wrongOut: [], ovenFlash: -9e9, lastBake: -9e9, timerFlash: -9e9,
      banner: null, lastDrop: null, beeps: 0, completes: 0
    };
  }
  resetVisual();
  processFeed(sim.drain(), 0);

  function clock() { return (performance.now() - raceStart) * DEBUG.speed; }
  function nowInt() { return Math.max(sim.state.t, Math.floor(clock())); }

  function speak(textStr, x, y, dur, now, side) {
    V.speech = { text: textStr, x: x, y: y, t0: now, dur: dur || 2000, side: side || 0 };
  }
  function pop(str, x, y, size, color, now) { V.pops.push({ text: str, x: x, y: y, size: size, color: color, t0: now }); }
  function burst(x, y, n, colors, now, power) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = (power || 60) * (0.4 + Math.random() * 0.8);
      V.parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, t0: now, dur: 500 + Math.random() * 400, c: pick(colors), r: 1.4 + Math.random() * 1.8 });
    }
  }
  function pelitaPos(i) {
    var x0 = WIN.x + 48, step = (WIN.w - 96) / (Sim.RULES.balang - 1);
    return { x: x0 + i * step, y: WIN.y + WIN.h - 19 };
  }
  function custHomeX(j) { return JAR_X[j]; }
  function sideFor(j, order) { return j === 0 ? -1 : j === 2 ? 1 : (order % 2 ? 1 : -1); }
  function kuihNames(items) {
    return items.map(function (it) { return KUIH[it.type].toLowerCase(); }).join(' dan ');
  }

  // Rule events -> animation
  function processFeed(list, now) {
    list.forEach(function (e) {
      var c, p;
      switch (e.kind) {
        case 'arrive':
          V.cust[e.jar] = { order: e.order, who: e.who, jar: e.jar, ready: e.readyAt, side: sideFor(e.jar, e.order), happyAt: -1, leaveAt: -1, spoke: e.readyAt === 0 && e.jar !== 1, seed: e.order * 3 + 1 };
          V.jarTypes[e.order] = [];
          break;
        case 'deliver':
          p = V.lastDrop || slotPos(e.slot);
          V.flyers.push({ type: e.type, x0: p.x, y0: p.y, jar: e.jar, order: e.order, t0: now, dur: 170 });
          Snd.drop(); haptic(8);
          break;
        case 'wrong':
          p = V.lastDrop || slotPos(e.slot);
          V.bounces[e.slot] = { x: p.x, y: p.y, t0: now };
          V.jarShake[e.jar] = now; V.timerFlash = now;
          pop('+1 saat', JAR_X[e.jar], 232, 13, '#FF7A59', now);
          Snd.wrong(); haptic(35);
          if (sim.state.mistakes === 1) { V.opah.pose = 'ting'; V.opah.t0 = now; speak('Eh, bukan balang tu!', OPAH_X, 470, 1300, now); }
          break;
        case 'complete':
          V.lid[e.order] = now + 140;
          c = V.cust[e.jar];
          if (c) { c.happyAt = now; speak(pick(THANKS), JAR_X[e.jar], 162, 1300, now); }
          V.completes++;
          V.sparks.push({ x0: JAR_X[e.jar], y0: 232, idx: e.n - 1, t0: now + 150, dur: 650 });
          burst(JAR_X[e.jar], 236, 14, ['#F2B84B', '#FFE2A0', '#FFFFFF', '#FF9AB5'], now, 80);
          Snd.complete(); haptic(18);
          if (e.n % 3 === 0 && e.n < Sim.RULES.balang) {
            V.opah.pose = 'cheer'; V.opah.t0 = now;
            setTimeout(function () { speak(pick(OPAH_CHEER), OPAH_X, 468, 1300, clock()); }, 700);
          }
          break;
        case 'leave':
          c = V.cust[e.jar];
          if (c && c.order === e.order) { c.leaveAt = now; V.leavers.push(c); V.cust[e.jar] = null; }
          break;
        case 'bake':
          if (!e.instant) {
            V.ovenFlash = now; V.lastBake = now;
            Snd.ding();
            if (V.opah.pose === 'idle') { V.opah.pose = 'ting'; V.opah.t0 = now; }
          }
          break;
        case 'stale':
          V.fades.push({ type: e.type, slot: e.slot, t0: now });
          break;
        case 'toy':
          V.toyIn[e.slot] = { t0: now, toy: e.toy, from: V.adik ? adikHand(V.adik, now) : { x: 0, y: 384 } };
          if (V.adik) V.adik.tossed = true;
          Snd.adik();
          break;
        case 'adikWrong':
          V.wrongIn[e.jar] = { t0: now };
          if (V.adik) V.adik.tossed = true;
          Snd.adik();
          if (Math.random() < 0.6) speak('Adik, jangan kacau!', OPAH_X, 468, 1300, now);
          break;
        case 'toyOff':
          V.toyOut.push({ slot: e.slot, toy: V.toyIn[e.slot] ? V.toyIn[e.slot].toy : 0, t0: now });
          delete V.toyIn[e.slot];
          Snd.toyOff(); haptic(10);
          break;
        case 'wrongOff':
          V.wrongOut.push({ jar: e.jar, type: e.type, t0: now });
          delete V.wrongIn[e.jar];
          Snd.pick(); haptic(10);
          break;
        case 'finish':
          onFinish(now);
          break;
        case 'timeout':
          onTimeout(now);
          break;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------
  function toLogical(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }
  function slotAt(p) {
    for (var i = 0; i < 8; i++) {
      var s = slotPos(i);
      if (Math.abs(p.x - s.x) <= 32 && Math.abs(p.y - s.y) <= 26) return i;
    }
    return -1;
  }
  function colAt(x) { return clamp(Math.floor(x / 120), 0, 2); }
  function bouncing(slot, now) { var b = V.bounces[slot]; return b && now - b.t0 < 220; }

  function act(inp) {
    var now = clock();
    inp.t = nowInt();
    sim.advanceTo(inp.t);
    processFeed(sim.drain(), now);
    if (sim.state.phase !== 'race') return { ok: false };
    var r = sim.apply(inp);
    if (r.ok) log.push(inp);
    processFeed(sim.drain(), now);
    return r;
  }
  function deliverFrom(slot, col, pos) {
    V.lastDrop = pos;
    var r = act({ a: 'd', s: slot, j: col });
    V.lastDrop = null;
    if (!r.ok) V.bounces[slot] = { x: pos.x, y: pos.y, t0: clock() };
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (mode !== 'race') return;
    Snd.resume();
    var p = toLogical(e), now = clock(), s = sim.state;
    var slot = slotAt(p);
    if (slot >= 0) {
      if (s.toys[slot]) { act({ a: 't', s: slot }); e.preventDefault(); return; }
      var ck = s.tray[slot];
      if (ck && ck.readyAt <= now && !bouncing(slot, now)) {
        drag = { id: e.pointerId, slot: slot, cookie: ck.id, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false, wasSelected: selected === slot };
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        Snd.pick();
        e.preventDefault();
        return;
      }
    }
    var col = colAt(p.x);
    if (p.y > 196 && p.y < DROP_LINE) {
      var jar = s.jars[col];
      if (jar && jar.wrong >= 0 && Math.abs(p.x - JAR_X[col]) < 40) { act({ a: 'w', j: col }); return; }
      if (selected >= 0) { var sp = slotPos(selected); deliverFrom(selected, col, sp); selected = -1; return; }
    }
    selected = -1;
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var p = toLogical(e);
    drag.x = p.x; drag.y = p.y;
    if (!drag.moved && Math.abs(p.x - drag.sx) + Math.abs(p.y - drag.sy) > 6) { drag.moved = true; selected = -1; }
  });
  function pointerEnd(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag; drag = null;
    var ck = sim.state.tray[d.slot];
    if (!ck || ck.id !== d.cookie) return;
    if (d.moved) {
      var p = toLogical(e), pos = { x: p.x, y: p.y - 10 };
      if (e.type === 'pointerup' && p.y < DROP_LINE && mode === 'race') deliverFrom(d.slot, colAt(p.x), pos);
      else V.bounces[d.slot] = { x: pos.x, y: pos.y, t0: clock() };
    } else {
      selected = d.wasSelected ? -1 : d.slot;
    }
  }
  canvas.addEventListener('pointerup', pointerEnd);
  canvas.addEventListener('pointercancel', pointerEnd);

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------
  function update(now) {
    var ts = now / 1000, i;
    if (mode === 'countdown') {
      var beat = now < -1800 ? 1 : now < -1000 ? 2 : now < -200 ? 3 : 4;
      if (beat > V.beeps) { V.beeps = beat; if (beat < 4) Snd.count(); }
      if (now >= 0) {
        mode = 'race';
        Snd.go(); Snd.play('zapin');
        var c1 = V.cust[1];
        if (c1) { c1.spoke = true; speakArrival(c1, now); }
      }
    }
    if (mode === 'race') {
      sim.advanceTo(Math.floor(now));
      processFeed(sim.drain(), now);
      sim.state.ch.adik.forEach(function (a, k) {
        if (mode !== 'race' || V.adikDone[k] || now < a.at - 700) return;
        V.adikDone[k] = true;
        var guess = a.offset;
        V.adik = { k: k, start: a.at - 700, side: k % 2 ? 1 : -1, kind: a.kind, toy: a.toy, guess: guess, tossed: false };
        setTimeout(function () {
          if (V.adik && V.adik.k === k && mode === 'race') {
            speak(a.kind === 'toy' ? 'Adik tolong jaga dulang!' : 'Adik tolong masukkan!', V.adik.side < 0 ? 64 : W - 64, 360, 1100, clock());
          }
        }, 250);
      });
      for (i = 0; i < 3; i++) {
        var cu = V.cust[i];
        if (cu && !cu.spoke && now >= cu.ready) { cu.spoke = true; speakArrival(cu, now); }
      }
    }
    for (i = V.flyers.length - 1; i >= 0; i--) {
      var f = V.flyers[i];
      if (now - f.t0 >= f.dur) {
        V.flyers.splice(i, 1);
        if (V.jarTypes[f.order]) V.jarTypes[f.order].push(f.type);
        V.jarBounce[f.jar] = now;
        burst(JAR_X[f.jar], 250, 4, ['#FFE2A0', '#FFFFFF'], now, 40);
      }
    }
    for (i = V.sparks.length - 1; i >= 0; i--) {
      var sp = V.sparks[i];
      if (now - sp.t0 >= sp.dur) {
        V.sparks.splice(i, 1);
        V.lit = Math.max(V.lit, sp.idx + 1);
        var pp = pelitaPos(sp.idx);
        burst(pp.x, pp.y, 8, ['#FFB347', '#FFF3C4'], now, 30);
        Snd.pelita();
      }
    }
    V.parts = V.parts.filter(function (p) { return now - p.t0 < p.dur; });
    V.pops = V.pops.filter(function (p) { return now - p.t0 < 900; });
    V.fades = V.fades.filter(function (p) { return now - p.t0 < 500; });
    V.toyOut = V.toyOut.filter(function (p) { return now - p.t0 < 500; });
    V.wrongOut = V.wrongOut.filter(function (p) { return now - p.t0 < 500; });
    V.leavers = V.leavers.filter(function (c) { return now - c.leaveAt < 500; });
    V.fireworks = V.fireworks.filter(function (f) { return now - f.t0 < f.dur; });
    if ((mode === 'finished' || mode === 'end') && Math.random() < 0.06) addFirework(now);
    void ts;
  }
  function speakArrival(cu, now) {
    var jar = sim.state.jars[cu.jar];
    if (!jar || jar.order !== cu.order) return;
    var p = PEOPLE[cu.who], names = kuihNames(jar.items);
    var line = pick(p.lines).replace('{K}', names.charAt(0).toUpperCase() + names.slice(1)).replace('{k}', names);
    speak(p.name + ': ' + line, JAR_X[cu.jar], 162, 2300, now);
  }
  function addFirework(now) {
    V.fireworks.push({ x: WIN.x + 20 + Math.random() * (WIN.w - 40), y: WIN.y + 14 + Math.random() * 34, t0: now, dur: 1200, n: 14 + Math.floor(Math.random() * 6), r: 14 + Math.random() * 6, col: pick(['#F2B84B', '#FFF6E4', '#FF8FB0', '#8FD9FF', '#FFB347']) });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  function render(now) {
    var ts = now / 1000, s = sim.state, i;
    if (!L.wall) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(L.wall, 0, 0);
    ctx.setTransform(K, 0, 0, K, 0, 0);
    var lit = mode === 'title' ? Sim.RULES.balang : V.lit;
    var fw = V.fireworks.map(function (f) { return { x: f.x, y: f.y, k: (now - f.t0) / f.dur, n: f.n, r: f.r, col: f.col }; });
    drawWindowScene(ctx, WIN.x, WIN.y, WIN.w, WIN.h, lit, ts, fw);
    blit(L.front);
    if (Snd.playing) {
      for (i = 0; i < 2; i++) {
        var nk = ((ts * 0.6 + i * 0.5) % 1);
        text(ctx, i ? '♫' : '♪', 118 + Math.sin(nk * 6 + i) * 6 + i * 10, 140 - nk * 30, 10, '#FFF3D6', { alpha: 1 - nk, family: FB });
      }
    }
    // customers behind the table
    V.leavers.forEach(function (c) { drawCustomer(c, now, ts, true); });
    for (i = 0; i < 3; i++) if (V.cust[i]) drawCustomer(V.cust[i], now, ts, false);
    blit(L.table);
    // balang on the table
    V.leavers.forEach(function (c) {
      var k = clamp((now - c.leaveAt) / 450, 0, 1), x = lerp(JAR_X[c.jar], c.side < 0 ? -70 : W + 70, k * k);
      drawJar(x, V.jarTypes[c.order] || [], -1, 1, 1, 0, -9e9, now, 1, 1);
    });
    for (i = 0; i < 3; i++) {
      var cu = V.cust[i], jar = s.jars[i];
      if (!cu || !jar || jar.order !== cu.order || now < cu.ready) continue;
      var lidK = jar.done && V.lid[jar.order] != null ? clamp((now - V.lid[jar.order]) / 220, 0, 1) : 0;
      var wk = V.wrongIn[i] ? clamp((now - V.wrongIn[i].t0) / 300, 0, 1) : 1;
      var popIn = clamp((now - cu.ready) / 220, 0, 1);
      drawJar(JAR_X[i], V.jarTypes[jar.order] || [], jar.wrong, wk, lidK, V.jarBounce[i], V.jarShake[i], now, 1, cu.ready > 0 ? easeBack(popIn) : 1);
      if (!jar.done) drawTag(JAR_X[i], jar, now);
    }
    V.wrongOut.forEach(function (w) {
      var k = (now - w.t0) / 500;
      ctx.globalAlpha = 1 - k;
      ctx.drawImage(SPR.kuih[w.type].small, JAR_X[w.jar] + 10 + k * 30 - 10, 270 - k * 60 - 10, 20, 20);
      ctx.globalAlpha = 1;
    });
    // oven interior, then the oven body and mixer
    drawOvenInterior(now, ts);
    blit(L.app);
    drawBeater(ts);
    drawTrayCookies(now, ts);
    drawOpah(ts, now);
    drawAdik(now, ts);
    V.flyers.forEach(function (f) {
      var k = clamp((now - f.t0) / f.dur, 0, 1);
      var x = lerp(f.x0, JAR_X[f.jar], k), y = lerp(f.y0, 250, k) - Math.sin(k * Math.PI) * 24, sz = lerp(46, 22, k);
      ctx.drawImage(SPR.kuih[f.type].big, x - sz / 2, y - sz / 2, sz, sz);
    });
    if (drag && drag.moved) {
      var dc = s.tray[drag.slot];
      if (dc && dc.id === drag.cookie) {
        if (drag.y < DROP_LINE) {
          var col = colAt(drag.x), jj = s.jars[col];
          if (jj && !jj.done && jj.readyAt <= now) {
            ctx.save();
            ctx.shadowColor = 'rgba(255,214,120,0.9)'; ctx.shadowBlur = 12;
            rr(ctx, JAR_X[col] - 32, 240, 64, 68, 12); ctx.strokeStyle = '#FFD36E'; ctx.lineWidth = 2.5; ctx.stroke();
            ctx.restore();
          }
        }
        softShadow(ctx, drag.x, drag.y + 14, 20, 5, 0.35);
        ctx.drawImage(SPR.kuih[dc.type].big, drag.x - 28, drag.y - 38, 56, 56);
      }
    }
    // effects
    V.parts.forEach(function (p) {
      var k = (now - p.t0) / p.dur, t = (now - p.t0) / 1000;
      ctx.globalAlpha = clamp(1 - k, 0, 1);
      ell(ctx, p.x + p.vx * t, p.y + p.vy * t + 160 * t * t, p.r, p.r, p.c);
    });
    ctx.globalAlpha = 1;
    V.sparks.forEach(function (sp) {
      var k = clamp((now - sp.t0) / sp.dur, 0, 1);
      if (now < sp.t0) return;
      var to = pelitaPos(sp.idx), x = lerp(sp.x0, to.x, k), y = lerp(sp.y0, to.y, k) - Math.sin(k * Math.PI) * 50;
      ell(ctx, x, y, 7, 7, 'rgba(255,170,60,0.35)');
      ell(ctx, x, y, 3, 3, '#FFF3C4');
    });
    drawSpeech(now);
    V.pops.forEach(function (p) {
      var k = (now - p.t0) / 900;
      text(ctx, p.text, p.x, p.y - k * 22, p.size, p.color, { stroke: '#3A1E0C', alpha: clamp(1.5 - k * 1.5, 0, 1) });
    });
    drawHUD(now);
    drawOverlays(now);
  }

  function drawCustomer(c, now, ts, leaving) {
    var home = custHomeX(c.jar), off = c.side < 0 ? -70 : W + 70, x = home, bob = 0;
    if (leaving) { var k = clamp((now - c.leaveAt) / 450, 0, 1); x = lerp(home, off, k * k); bob = Math.abs(Math.sin(now / 90)) * 2; }
    else if (c.ready > 0 && now < c.ready) { var k2 = clamp((now - (c.ready - ARRIVE_MS)) / ARRIVE_MS, 0, 1); x = lerp(off, home, easeOut(k2)); bob = Math.abs(Math.sin(now / 90)) * 2; }
    var jar = sim.state.jars[c.jar];
    var mood = 'ok', hop = bob;
    if (c.happyAt >= 0 || leaving) { mood = 'happy'; if (now - c.happyAt < 500) hop += Math.sin((now - c.happyAt) / 500 * Math.PI) * 8; }
    else if (jar && jar.order === c.order && jar.wrong >= 0) mood = 'surprise';
    drawPerson(ctx, x, PEOPLE[c.who], mood, hop, ts, c.seed);
  }

  function drawOvenInterior(now, ts) {
    var c = ctx, g = GLASS;
    c.save();
    rr(c, g.x, g.y, g.w, g.h, 6); c.clip();
    c.fillStyle = lin(c, 0, g.y, 0, g.y + g.h, [[0, '#24120A'], [0.55, '#6A3214'], [1, '#C4601E']]);
    c.fillRect(g.x, g.y, g.w, g.h);
    var glow = 0.35 + 0.08 * Math.sin(ts * 3);
    c.fillStyle = radg(c, 180, g.y + g.h, 4, 180, g.y + g.h, 110, [[0, 'rgba(255,170,80,' + glow + ')'], [1, 'rgba(255,170,80,0)']]);
    c.fillRect(g.x, g.y, g.w, g.h);
    c.strokeStyle = 'rgba(200,205,212,0.5)'; c.lineWidth = 1;
    for (var r = 10; r < g.h; r += 12) {
      c.beginPath(); c.moveTo(g.x + 3, g.y + r); c.lineTo(g.x + 10, g.y + r); c.stroke();
      c.beginPath(); c.moveTo(g.x + g.w - 10, g.y + r); c.lineTo(g.x + g.w - 3, g.y + r); c.stroke();
    }
    [g.x + 44, g.x + g.w - 44].forEach(function (fx, k) {
      var fy = g.y + 32, a = ts * 9 + k;
      c.strokeStyle = 'rgba(20,8,4,0.55)'; c.lineWidth = 3;
      for (var b = 0; b < 4; b++) {
        var aa = a + b * Math.PI / 2;
        c.beginPath(); c.moveTo(fx, fy); c.quadraticCurveTo(fx + Math.cos(aa + 0.5) * 10, fy + Math.sin(aa + 0.5) * 10, fx + Math.cos(aa) * 16, fy + Math.sin(aa) * 16); c.stroke();
      }
      c.strokeStyle = 'rgba(30,14,8,0.8)'; c.lineWidth = 2.4;
      [8, 14, 20].forEach(function (rad) {
        for (var sgm = 0; sgm < 8; sgm++) {
          var a0 = sgm / 8 * Math.PI * 2 + 0.12, a1 = a0 + Math.PI / 4 - 0.3;
          c.beginPath(); c.arc(fx, fy, rad, a0, a1); c.stroke();
        }
      });
      ell(c, fx, fy, 3, 3, '#2A1408');
    });
    var bakeK = clamp((now - V.lastBake) / 2200, 0, 1);
    c.fillStyle = '#9AA1AB'; c.fillRect(g.x + 12, g.y + 72, g.w - 24, 2.5);
    for (var d = 0; d < 6; d++) {
      ell(c, g.x + 24 + d * 19.5, g.y + 69, 7, 3.5, lerpColor(bakeK));
    }
    var fk = (now - V.ovenFlash) / 450;
    if (fk >= 0 && fk < 1) { c.fillStyle = 'rgba(255,226,160,' + (0.55 * (1 - fk)) + ')'; c.fillRect(g.x, g.y, g.w, g.h); }
    c.restore();
  }
  function lerpColor(k) {
    var a = [243, 220, 168], b = [214, 146, 52];
    return 'rgb(' + Math.round(lerp(a[0], b[0], k)) + ',' + Math.round(lerp(a[1], b[1], k)) + ',' + Math.round(lerp(a[2], b[2], k)) + ')';
  }
  function drawBeater(ts) {
    var c = ctx, x = 40 + Math.sin(ts * 7) * 5;
    c.strokeStyle = '#C9CED6'; c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(40, 544); c.quadraticCurveTo(x + 4, 548, x, 552); c.stroke();
  }

  function drawTrayCookies(now, ts) {
    var s = sim.state, c = ctx;
    for (var i = 0; i < 8; i++) {
      var ck = s.tray[i], p = slotPos(i);
      if (ck && !(drag && drag.moved && drag.slot === i && drag.cookie === ck.id)) {
        var x = p.x, y = p.y, sz = 46;
        if (ck.readyAt > 0 && now < ck.readyAt) {
          var k = clamp((now - (ck.readyAt - Sim.RULES.flightMs)) / Sim.RULES.flightMs, 0, 1);
          x = lerp(OVEN_DOOR.x, p.x, easeOut(k)); y = lerp(OVEN_DOOR.y, p.y, k) - Math.sin(k * Math.PI) * 44; sz = lerp(26, 46, k);
        }
        var b = V.bounces[i];
        if (b && now - b.t0 < 220) { var kb = easeOut((now - b.t0) / 220); x = lerp(b.x, p.x, kb); y = lerp(b.y, p.y, kb); }
        var lift = selected === i ? 4 + Math.sin(ts * 8) * 1.5 : 0;
        softShadow(c, x, y + 15, 20, 4.5, 0.3);
        if (selected === i) {
          c.save(); c.shadowColor = 'rgba(255,200,90,0.9)'; c.shadowBlur = 10;
          ell(c, x, y - lift, 27, 27, 'rgba(255,214,110,0.35)');
          c.restore();
        }
        c.drawImage(SPR.kuih[ck.type].big, x - sz / 2, y - sz / 2 - lift, sz, sz);
      }
      if (s.toys[i]) {
        var ti = V.toyIn[i], tx = p.x, ty = p.y - 2, toy = ti ? ti.toy : 0;
        if (ti) {
          var kt = clamp((now - ti.t0) / 300, 0, 1);
          tx = lerp(ti.from.x, p.x, kt); ty = lerp(ti.from.y, p.y - 2, kt) - Math.sin(kt * Math.PI) * 40;
        }
        var wob = Math.sin(now / 140) * 0.08;
        c.save(); c.translate(tx, ty); c.rotate(wob);
        c.drawImage(SPR.toy[toy], -24, -24, 48, 48);
        c.restore();
        if (Math.floor(now / 400) % 2) { c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y, 29, 0, Math.PI * 2); c.stroke(); }
      }
    }
    V.fades.forEach(function (f) {
      var k = (now - f.t0) / 500, p = slotPos(f.slot);
      c.globalAlpha = 1 - k;
      c.drawImage(SPR.kuih[f.type].big, p.x - 23, p.y - 23 - k * 10, 46, 46);
      c.globalAlpha = 1;
    });
    V.toyOut.forEach(function (t) {
      var k = (now - t.t0) / 500, p = slotPos(t.slot);
      c.save(); c.globalAlpha = 1 - k; c.translate(p.x + k * 60 * (p.x < 180 ? -1 : 1), p.y - k * 70); c.rotate(k * 4);
      c.drawImage(SPR.toy[t.toy], -24, -24, 48, 48); c.restore();
    });
  }

  function drawSpeech(now) {
    var sp = V.speech;
    if (!sp) return;
    var k = (now - sp.t0) / sp.dur;
    if (k >= 1) { V.speech = null; return; }
    var c = ctx, a = clamp(Math.min(k * 8, (1 - k) * 6), 0, 1);
    c.font = '800 10px ' + FB;
    var words = sp.text.split(' '), lines = [], cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (c.measureText(t).width > 150 && cur) { lines.push(cur); cur = w; } else cur = t;
    });
    lines.push(cur);
    var tw = 0; lines.forEach(function (l) { tw = Math.max(tw, c.measureText(l).width); });
    var bw = tw + 18, bh = lines.length * 13 + 10;
    var bx = clamp(sp.x - bw / 2, 6, W - bw - 6), by = sp.y - bh - 8;
    var sc = 0.85 + 0.15 * easeBack(clamp(k * 6, 0, 1));
    c.save(); c.globalAlpha = a;
    c.translate(sp.x, sp.y); c.scale(sc, sc); c.translate(-sp.x, -sp.y);
    softShadow(c, bx + bw / 2, by + bh + 4, bw / 2, 4, 0.25);
    rr(c, bx, by, bw, bh, 10); c.fillStyle = '#FFFDF7'; c.fill();
    c.strokeStyle = 'rgba(120,70,30,0.25)'; c.lineWidth = 1; c.stroke();
    var tx = clamp(sp.x, bx + 14, bx + bw - 14);
    c.beginPath(); c.moveTo(tx - 6, by + bh - 0.5); c.lineTo(tx, by + bh + 7); c.lineTo(tx + 6, by + bh - 0.5); c.closePath(); c.fillStyle = '#FFFDF7'; c.fill();
    lines.forEach(function (l, i) {
      var nameSplit = i === 0 ? l.indexOf(':') : -1;
      if (nameSplit > 0) {
        var nm = l.slice(0, nameSplit + 1), rest = l.slice(nameSplit + 1);
        c.font = '800 10px ' + FB;
        var nw = c.measureText(nm).width, rw = c.measureText(rest).width, sx = bx + bw / 2 - (nw + rw) / 2;
        text(c, nm, sx, by + 11 + i * 13, 10, '#0E6B45', { align: 'left', family: FB, weight: 800, alpha: a });
        text(c, rest, sx + nw, by + 11 + i * 13, 10, '#3A2414', { align: 'left', family: FB, weight: 700, alpha: a });
      } else {
        text(c, l, bx + bw / 2, by + 11 + i * 13, 10, '#3A2414', { family: FB, weight: 700, alpha: a });
      }
    });
    c.restore();
  }

  function drawHUD(now) {
    var c = ctx, s = sim.state;
    softShadow(c, 62, 44, 52, 4, 0.35);
    rr(c, 10, 10, 104, 32, 16); c.fillStyle = '#FFF8EC'; c.fill();
    if (logoImg.complete && logoImg.naturalWidth) c.drawImage(logoImg, 19, 15.5, 86, 22.4);
    if (mode === 'title') return;
    var ms = mode === 'race' ? clock() + s.penaltyMs : (result ? (result.finished ? result.ms : Sim.RULES.capMs) : 0);
    if (mode === 'countdown') ms = 0;
    var flash = now - V.timerFlash < 500;
    softShadow(c, 180, 46, 56, 4, 0.35);
    rr(c, 124, 8, 112, 36, 18);
    c.fillStyle = flash ? lin(c, 0, 8, 0, 44, [[0, '#FF8A6A'], [1, '#E0573A']]) : lin(c, 0, 8, 0, 44, [[0, '#15734D'], [1, '#0A4A32']]);
    c.fill();
    ell(c, 145, 27, 8, 8, '#FFF8EC'); ell(c, 145, 27, 6, 6, flash ? '#E0573A' : '#0F5B3E');
    rr(c, 143, 16, 4, 3, 1); c.fillStyle = '#FFF8EC'; c.fill();
    c.strokeStyle = '#FFF8EC'; c.lineWidth = 1.4; c.lineCap = 'round';
    var ang = (ms / 1000) * Math.PI * 2 / 60 - Math.PI / 2;
    c.beginPath(); c.moveTo(145, 27); c.lineTo(145 + Math.cos(ang) * 4.5, 27 + Math.sin(ang) * 4.5); c.stroke();
    text(c, fmt(Math.min(ms, Sim.RULES.capMs)), 194, 27.5, 21, '#FFF8EC', { weight: 800 });
    var done = Math.min(s.completed, Sim.RULES.balang);
    rr(c, 138, 47, 84, 18, 9); c.fillStyle = 'rgba(255,248,236,0.94)'; c.fill();
    rr(c, 147, 51, 9, 11, 2.5); c.fillStyle = 'rgba(190,225,245,0.9)'; c.fill();
    rr(c, 146, 49.5, 11, 3, 1.2); c.fillStyle = '#E00000'; c.fill();
    text(c, done + '/' + Sim.RULES.balang + ' balang', 189, 56.5, 9.5, '#3A2414', { family: FB, weight: 800 });
  }

  function drawOverlays(now) {
    var c = ctx;
    if (mode === 'countdown') {
      c.fillStyle = 'rgba(30,14,4,0.38)'; c.fillRect(0, 0, W, H);
      var n = now < -1800 ? '3' : now < -1000 ? '2' : now < -200 ? '1' : 'MULA!';
      var segStart = now < -1800 ? -2600 : now < -1000 ? -1800 : now < -200 ? -1000 : -200;
      var k = clamp((now - segStart) / 300, 0, 1), sc = lerp(1.6, 1, easeOut(k));
      text(c, n, 180, 300, (n.length > 1 ? 58 : 110) * sc, '#FFD36E', { stroke: '#4A2410', sw: 10 });
      if (n !== 'MULA!') text(c, 'Isi 10 balang secepat mungkin!', 180, 372, 14, '#FFF8EC', { stroke: '#4A2410', sw: 4, family: FB });
    }
    if (mode === 'race' && now < 600) {
      var k2 = clamp(now / 600, 0, 1);
      text(c, 'MULA!', 180, 300, 58 * lerp(1, 1.15, k2), '#FFD36E', { stroke: '#4A2410', sw: 10, alpha: 1 - k2 });
    }
    if (V.banner) {
      var bk = clamp((now - V.banner.t0) / 400, 0, 1);
      text(c, V.banner.text, 180, 290, 46 * easeBack(bk), '#FFD36E', { stroke: '#4A2410', sw: 9 });
      if (V.banner.sub) text(c, V.banner.sub, 180, 334, 20, '#FFF8EC', { stroke: '#4A2410', sw: 5, alpha: bk });
    }
    if (mode === 'race' && sim.state.completed === 0 && now < 9000 && sim.state.inputs === 0) {
      var a = 0.6 + 0.4 * Math.sin(now / 200);
      text(c, 'Seret kuih ke balang yang betul!', 180, 357, 11.5, '#FFF8EC', { stroke: '#4A2410', sw: 3.5, family: FB, alpha: a });
    }
  }

  var last = 0;
  function frame() {
    var now = clock();
    update(now);
    render(now);
    last = now;
    window.requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------------------
  // Round flow
  // ---------------------------------------------------------------------------
  function startCountdown() {
    Snd.init(); Snd.resume(); Snd.renderAll();
    challenge = Sim.challengeFor(Date.now(), CONFIG.campaign);
    sim = Sim.create(challenge.seed);
    log = []; result = null; selected = -1; drag = null;
    resetVisual();
    processFeed(sim.drain(), 0);
    raceStart = performance.now() + 2600;
    raceWallStart = Date.now() + 2600;
    mode = 'countdown';
    Snd.stopMusic(0.15);
    var rounds = parseInt(store('rounds') || '0', 10) || 0;
    track(rounds === 0 ? 'RaceStart' : 'Replay', { challenge: challenge.id, round: rounds + 1 });
    startToken = null;
    if (CONFIG.apiBase) {
      fetch(CONFIG.apiBase + '/mula', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cabaran: challenge.id }) })
        .then(function (r) { return r.json(); }).then(function (j) { startToken = j && j.token; }).catch(function () { /* offline */ });
    }
  }

  function onFinish(now) {
    var s = sim.state;
    mode = 'finished';
    drag = null; selected = -1;
    result = { finished: true, ms: s.resultMs, mistakes: s.mistakes, penaltyMs: s.penaltyMs, log: log.slice(), seed: challenge.seed, challenge: challenge, wallMs: Date.now() - raceWallStart };
    V.banner = { text: 'SIAP!', sub: fmt(s.resultMs) + ' saat', t0: now };
    V.opah.pose = 'cheer'; V.opah.t0 = now;
    speak('Terima kasih, cucu Opah!', OPAH_X, 468, 2200, now);
    for (var i = 0; i < 4; i++) addFirework(now - i * 200);
    burst(180, 300, 40, ['#F2B84B', '#FFE2A0', '#FF8FB0', '#8FD9FF', '#FFFFFF'], now, 160);
    Snd.finish(); Snd.stopMusic(0.4);
    haptic(40);
    setTimeout(showEnd, 2600);
  }
  function onTimeout(now) {
    mode = 'finished';
    drag = null; selected = -1;
    result = { finished: false, ms: Sim.RULES.capMs, done: sim.state.completed, mistakes: sim.state.mistakes, challenge: challenge };
    V.banner = { text: 'Masa tamat!', sub: sim.state.completed + '/' + Sim.RULES.balang + ' balang siap', t0: now };
    speak('Takpe, cuba lagi ya!', OPAH_X, 468, 2000, now);
    Snd.timeout(); Snd.stopMusic(0.4);
    setTimeout(showEnd, 2200);
  }

  function starsFor(r) {
    if (!r.finished) return 0;
    return r.ms <= CONFIG.starMs[0] ? 3 : r.ms <= CONFIG.starMs[1] ? 2 : 1;
  }
  function titleFor(st) { return ['Hampir siap!', 'Pembantu Dapur Opah', 'Pembantu Cekap Opah', 'Cucu Kesayangan Opah'][st]; }
  function bestKey() { return 'best:' + challenge.id; }
  function getBest() { var b = parseInt(store(bestKey()) || '0', 10); return b > 0 ? b : 0; }

  var STAR_ON = null, STAR_OFF = null;
  function starImg(on) {
    var c = document.createElement('canvas'); c.width = 96; c.height = 96;
    var x = c.getContext('2d');
    x.translate(48, 50);
    x.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 19 : 42; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    x.closePath();
    x.lineJoin = 'round'; x.lineWidth = 8; x.strokeStyle = on ? '#C98A1E' : '#D9C9A8'; x.stroke();
    x.fillStyle = on ? lin(x, 0, -42, 0, 40, [[0, '#FFE38A'], [1, '#F2A93B']]) : '#EFE4CF'; x.fill();
    if (on) ell(x, -10, -14, 8, 4, 'rgba(255,255,255,0.6)', -0.5);
    return c.toDataURL();
  }

  function showEnd() {
    mode = 'end';
    var r = result, st = starsFor(r);
    var rounds = (parseInt(store('rounds') || '0', 10) || 0) + 1;
    store('rounds', rounds);
    var best = getBest(), isBest = false;
    if (r.finished && (!best || r.ms < best)) { store(bestKey(), r.ms); isBest = true; best = r.ms; }
    if (!STAR_ON) { STAR_ON = starImg(true); STAR_OFF = starImg(false); }
    $('end-eyebrow').textContent = r.finished ? 'Selamat Hari Raya!' : 'Masa tamat';
    Array.prototype.forEach.call($('stars').children, function (sp, i) { sp.style.backgroundImage = 'url(' + (i < st ? STAR_ON : STAR_OFF) + ')'; });
    $('stars').setAttribute('aria-label', st + ' bintang');
    $('end-title').textContent = titleFor(st);
    $('end-time').textContent = r.finished ? fmt(r.ms) : r.done + '/10';
    $('end-unit').textContent = r.finished ? 'saat' : 'balang';
    var stats = r.finished
      ? (r.mistakes ? r.mistakes + ' kesilapan (+' + r.mistakes + ' saat)' : 'Tiada kesilapan') + ' · ' + (isBest ? 'Rekod baru!' : 'Rekod terbaik ' + fmt(best) + ' saat')
      : 'Siapkan 10 balang dalam 90 saat untuk masuk papan pemenang.';
    $('end-stats').textContent = stats;
    var note = '';
    if (challengeMs && r.finished) {
      note = r.ms < challengeMs ? 'Anda kalahkan kawan anda (' + fmt(challengeMs) + ' saat)!' : 'Lagi ' + fmt(r.ms - challengeMs + 10) + ' saat untuk kalahkan kawan anda.';
    } else if (r.finished && st < 3) {
      note = 'Siap dalam ' + fmt(st === 2 ? CONFIG.starMs[0] : CONFIG.starMs[1]) + ' saat untuk ' + (st + 1) + ' bintang!';
    } else if (r.finished) {
      note = 'Hebat! Masuk papan pemenang dan rebut hadiah misteri.';
    } else {
      note = 'Cuba lagi. Tip: Adik nak tolong? Tekan cepat-cepat untuk alihkan.';
    }
    $('end-note').textContent = note;
    $('board-btn').hidden = !r.finished;
    $('share-btn').hidden = !r.finished;
    $('week-end').textContent = challenge.label;
    $('end-screen').hidden = false;
    Snd.play('lofi');
    if (r.finished) track('RaceFinish', { challenge: challenge.id, ms: r.ms, mistakes: r.mistakes, stars: st });
    else track('RaceTimeout', { challenge: challenge.id, done: r.done });
    if (rounds === 3) track('EngagedPlayer', { rounds: 3 });
  }

  // ---------------------------------------------------------------------------
  // Leaderboard
  // ---------------------------------------------------------------------------
  function openBoard() {
    $('end-screen').hidden = true;
    $('board-screen').hidden = false;
    $('board-week').textContent = challenge.label;
    $('board-time').textContent = fmt(result.ms) + ' saat' + (result.mistakes ? ' (' + result.mistakes + ' kesilapan)' : '');
    $('form-msg').textContent = '';
    var list = $('board-list');
    list.innerHTML = '';
    if (!CONFIG.apiBase) {
      $('board-demo').hidden = false;
      return;
    }
    $('board-demo').hidden = true;
    fetch(CONFIG.apiBase + '/papan?cabaran=' + encodeURIComponent(challenge.id))
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        (rows || []).slice(0, 10).forEach(function (row, i) {
          var li = document.createElement('li');
          var nm = document.createElement('span'); nm.textContent = (i + 1) + '. ' + row.nama;
          var tm = document.createElement('b'); tm.textContent = fmt(row.masaMs) + ' s';
          li.appendChild(nm); li.appendChild(tm); list.appendChild(li);
        });
      })
      .catch(function () { $('form-msg').textContent = 'Papan pemenang tidak dapat dimuatkan. Cuba sebentar lagi.'; });
  }
  function submitRecord(ev) {
    ev.preventDefault();
    var nama = $('f-nama').value.trim().replace(/\s+/g, ' ');
    var tel = $('f-tel').value.replace(/[\s-]/g, '');
    var msg = $('form-msg');
    if (!/^[A-Za-z0-9 ]{3,16}$/.test(nama)) { msg.textContent = 'Nama paparan perlu 3 hingga 16 huruf atau nombor.'; return; }
    if (!/^(\+?60|0)1\d{8,9}$/.test(tel)) { msg.textContent = 'Masukkan nombor telefon Malaysia yang sah, contohnya 012-3456789.'; return; }
    if (!$('f-setuju').checked) { msg.textContent = 'Sila tandakan persetujuan Terma & Syarat dan Notis Privasi.'; return; }
    var body = {
      cabaran: result.challenge.id, seed: result.seed, log: result.log, masaMs: result.ms, kesilapan: result.mistakes,
      nama: nama, telefon: tel, setuju: true, token: startToken, masaPelayanMs: result.wallMs
    };
    track('LeaderboardSubmit', { challenge: result.challenge.id, ms: result.ms });
    if (!CONFIG.apiBase) {
      store('entry:' + result.challenge.id, JSON.stringify({ nama: nama, masaMs: result.ms }));
      msg.textContent = 'Mod demo: rekod disimpan dalam peranti ini sahaja. Papan pemenang sebenar dibuka semasa pelancaran.';
      return;
    }
    msg.textContent = 'Menghantar…';
    fetch(CONFIG.apiBase + '/rekod', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.ok) { msg.textContent = 'Rekod diterima! Kedudukan anda sekarang: #' + j.kedudukan + '.'; openBoardListOnly(); }
        else msg.textContent = (j && j.sebab) ? 'Rekod tidak diterima: ' + j.sebab : 'Rekod tidak diterima.';
      })
      .catch(function () { msg.textContent = 'Tidak dapat menghantar. Semak sambungan internet dan cuba lagi.'; });
  }
  function openBoardListOnly() { if (CONFIG.apiBase) openBoard(); }

  // ---------------------------------------------------------------------------
  // Share card
  // ---------------------------------------------------------------------------
  function makeShareCard() {
    var r = result, Wc = 1080, Hc = 1350;
    var c = document.createElement('canvas'); c.width = Wc; c.height = Hc;
    var x = c.getContext('2d');
    x.fillStyle = lin(x, 0, 0, 0, Hc, [[0, '#3A2214'], [1, '#6A3E22']]); x.fillRect(0, 0, Wc, Hc);
    x.strokeStyle = 'rgba(242,184,75,0.10)'; x.lineWidth = 4;
    for (var d = -Hc; d < Wc + Hc; d += 60) {
      x.beginPath(); x.moveTo(d, 0); x.lineTo(d + Hc, Hc); x.stroke();
      x.beginPath(); x.moveTo(d, Hc); x.lineTo(d + Hc, 0); x.stroke();
    }
    rr(x, 330, 50, 420, 118, 59); x.fillStyle = '#FFF8EC'; x.fill();
    if (logoImg.complete && logoImg.naturalWidth) x.drawImage(logoImg, 380, 72, 320, 83);
    rr(x, 80, 210, 920, 560, 36); x.fillStyle = '#F6EBD3'; x.fill();
    x.save(); x.translate(110, 240); x.scale(4.3, 4.65);
    drawWindowScene(x, 0, 0, 200, 108, Sim.RULES.balang, 1.3, [
      { x: 40, y: 22, k: 0.45, n: 18, r: 16, col: '#F2B84B' }, { x: 104, y: 16, k: 0.5, n: 16, r: 14, col: '#FF8FB0' }, { x: 150, y: 30, k: 0.4, n: 16, r: 14, col: '#8FD9FF' }]);
    x.restore();
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#FFF8EC'; x.font = '800 46px ' + FB;
    x.fillText('Saya siap isi 10 balang kuih dalam', Wc / 2, 850);
    x.fillStyle = '#FFD36E'; x.font = '800 150px ' + FD;
    x.fillText(fmt(r.ms) + ' saat', Wc / 2, 975);
    x.fillStyle = '#FFF8EC'; x.font = '800 60px ' + FD;
    x.fillText(titleFor(starsFor(r)), Wc / 2, 1095);
    x.fillStyle = '#FFE2A0'; x.font = '800 46px ' + FB;
    x.fillText('Boleh lawan? Main Isi Balang Raya Opah', Wc / 2, 1200);
    x.fillStyle = 'rgba(255,248,236,0.75)'; x.font = '700 34px ' + FB;
    x.fillText(challenge.label + ' · Hadiah misteri untuk juara', Wc / 2, 1270);
    return c;
  }
  function challengeUrl() {
    return window.location.href.split('#')[0] + '#cabar-' + Math.round(result.ms);
  }

  // ---------------------------------------------------------------------------
  // DOM wiring
  // ---------------------------------------------------------------------------
  function iconData(draw) {
    var c = document.createElement('canvas'); c.width = 96; c.height = 96;
    var x = c.getContext('2d'); x.scale(0.96, 0.96); draw(x);
    return c.toDataURL();
  }
  function refreshTitle() {
    $('week-pill').textContent = challenge.label;
    var best = getBest();
    $('best-line').textContent = best ? 'Rekod terbaik anda: ' + fmt(best) + ' saat' : '';
    if (challengeMs) {
      $('challenge-line').hidden = false;
      $('challenge-line').textContent = 'Kawan anda siap dalam ' + fmt(challengeMs) + ' saat. Boleh lawan?';
    }
  }

  function init() {
    var icons = {
      kuih: iconData(kTart),
      salah: iconData(function (x) {
        rr(x, 8, 26, 84, 48, 24); x.fillStyle = '#FF7A59'; x.fill();
        x.fillStyle = '#FFFFFF'; x.font = '800 34px ' + FD; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('+1s', 50, 52);
      }),
      adik: iconData(tCar)
    };
    Array.prototype.forEach.call(document.querySelectorAll('[data-ico]'), function (el) {
      el.style.backgroundImage = 'url(' + icons[el.getAttribute('data-ico')] + ')';
    });
    refreshTitle();

    $('play-btn').addEventListener('click', function () { $('title-screen').hidden = true; startCountdown(); });
    $('replay-btn').addEventListener('click', function () { $('end-screen').hidden = true; startCountdown(); });
    $('board-btn').addEventListener('click', openBoard);
    $('board-close').addEventListener('click', function () { $('board-screen').hidden = true; $('end-screen').hidden = false; });
    $('board-form').addEventListener('submit', submitRecord);
    $('product-card').href = CONFIG.productUrl;
    $('product-card').addEventListener('click', function () { track('ShopeeClick', { product: 'E-1AG', ms: result ? result.ms : 0 }); });

    var shareFile = null;
    $('share-btn').addEventListener('click', function () {
      var card = makeShareCard();
      $('share-img').src = card.toDataURL('image/png');
      $('share-status').textContent = '';
      $('end-screen').hidden = true;
      $('share-screen').hidden = false;
      var nb = $('native-share-btn');
      nb.hidden = true; shareFile = null;
      if (card.toBlob && navigator.canShare) {
        card.toBlob(function (blob) {
          if (!blob) return;
          try {
            var f = new File([blob], 'isi-balang-raya-opah.png', { type: 'image/png' });
            if (navigator.canShare({ files: [f] })) { shareFile = f; nb.hidden = false; }
          } catch (e) { /* sharing files not supported */ }
        }, 'image/png');
      }
      track('ShareOpen', { ms: result.ms });
    });
    $('native-share-btn').addEventListener('click', function () {
      if (!shareFile) return;
      navigator.share({ files: [shareFile], title: 'Isi Balang Raya Opah', text: 'Saya siap dalam ' + fmt(result.ms) + ' saat. Boleh lawan? ' + challengeUrl() })
        .then(function () { track('ShareComplete', { method: 'native' }); $('share-status').textContent = 'Dikongsi. Terima kasih!'; })
        .catch(function () { /* cancelled */ });
    });
    $('copy-link-btn').addEventListener('click', function () {
      var url = challengeUrl();
      function fallback() { $('share-status').textContent = url; }
      try {
        navigator.clipboard.writeText(url).then(function () {
          $('share-status').textContent = 'Pautan disalin. Hantar kepada kawan anda!';
          track('ShareComplete', { method: 'link' });
        }, fallback);
      } catch (e) { fallback(); }
    });
    $('close-share-btn').addEventListener('click', function () { $('share-screen').hidden = true; $('end-screen').hidden = false; });

    var soundBtn = $('sound-btn');
    function syncSound() {
      soundBtn.setAttribute('aria-pressed', Snd.muted ? 'true' : 'false');
      soundBtn.setAttribute('aria-label', Snd.muted ? 'Hidupkan bunyi' : 'Matikan bunyi');
    }
    soundBtn.addEventListener('click', function () { Snd.init(); Snd.resume(); Snd.setMuted(!Snd.muted); syncSound(); if (mode === 'title' && !Snd.muted) Snd.play('lofi'); });
    syncSound();
    document.addEventListener('pointerdown', function first() {
      document.removeEventListener('pointerdown', first);
      Snd.init(); Snd.resume();
      if (mode === 'title') Snd.play('lofi');
    });

    document.addEventListener('visibilitychange', function () { if (document.hidden) Snd.suspend(); else Snd.resume(); });
    window.addEventListener('resize', layout);
    logoImg.onload = function () {
      var c = document.createElement('canvas');
      c.width = logoImg.naturalWidth; c.height = logoImg.naturalHeight;
      var x = c.getContext('2d');
      x.drawImage(logoImg, 0, 0);
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, c.width, c.height);
      logoWhite = c;
      buildLayers();
    };
    logoImg.src = 'assets/thebaker-logo.png';
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildLayers);
    layout();
    setTimeout(function () { Snd.renderAll(); }, 500);
    track('GameView', { challenge: challenge.id });
    window.requestAnimationFrame(frame);
  }

  // Test hook for automated checks; harmless in production.
  window.__opah = {
    debug: DEBUG,
    get sim() { return sim; },
    get log() { return log; },
    get mode() { return mode; },
    get result() { return result; },
    act: act, slotPos: slotPos, jarX: JAR_X, start: startCountdown
  };

  init();
})();

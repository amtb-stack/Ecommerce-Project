/* Kejar Tempahan Raya: The Baker Raya 2027 web game.
 *
 * The world is drawn on a 180x320 "game pixel" canvas and scaled up with
 * nearest-neighbour so it stays crisp pixel art. Text, the logo and speech
 * bubbles are drawn afterwards at screen resolution so they stay readable.
 *
 * Core loop: customers order a balang of kuih raya, the E-1AG oven bakes
 * trays of cookies, the player drags (or taps, then taps) cookies into the
 * right balang. Finished orders light pelita outside the window and charge
 * the B10-ES mixer; pulling its lever bakes a turbo batch.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  var CONFIG = {
    roundSeconds: 45,
    malamRayaSeconds: 10,
    pelitaCount: 10,
    starAt: [3, 6, 10], // pelita needed for 1, 2 and 3 stars
    products: {
      // Replace each url with the exact Shopee Mall product link before launch.
      oven: {
        q: 'Oven dalam game ni?',
        name: 'Ini The Baker E-1AG Convection Oven.',
        img: 'assets/e1ag-oven.jpg',
        url: 'https://shopee.com.my/search?keyword=the%20baker%20e-1ag'
      },
      mixer: {
        q: 'Mixer yang bagi turbo tadi?',
        name: 'Ini The Baker B10-ES Professional Mixer.',
        img: 'assets/b10es-mixer.jpg',
        url: 'https://shopee.com.my/search?keyword=the%20baker%20b10es'
      }
    },
    storageKey: 'thebaker-raya27'
  };

  // ---------------------------------------------------------------------------
  // Layout constants (game pixels)
  // ---------------------------------------------------------------------------
  var LW = 180, LH = 320;
  var COUNTER_Y = 120;
  var DROP_LINE = 150;
  var SLOT_CX = [30, 90, 150];
  var OPEN_ORDER = [1, 0, 2];
  var WIN = { x: 36, y: 26, w: 108, h: 50 };
  var TRAY = { x: 38, y: 152, w: 104, h: 48 };
  var TRAY_SLOTS = [];
  [164, 187].forEach(function (y) {
    [53, 78, 103, 128].forEach(function (x) { TRAY_SLOTS.push({ x: x, y: y }); });
  });
  var OVEN = { x: 44, y: 208, w: 92, h: 90 };
  var OVEN_DOOR = { x: 90, y: 236 };
  var MIXER = { x: 140, y: 200 };
  var BLENDER = { x: 3, y: 236 };
  var DRAG_LIFT = 7;
  var LEVER_LOW = -1.87, LEVER_HIGH = 1.87 - Math.PI * 2;

  var P = {
    outline: '#3A2212',
    wall: '#F7E9CF', wallLine: '#EEDCB9',
    wallLow: '#EBD5AA', wallLowLine: '#DFC493',
    emerald: '#0E6B45', emeraldDk: '#0A3D2A', emeraldLt: '#2E9B66',
    gold: '#F2B84B', goldDk: '#C98A1E', goldLt: '#FFE2A0',
    wood: '#8A5A3B', woodDk: '#6B4229', woodLt: '#A8724C', woodTop: '#C48A5E',
    red: '#E00000', redDk: '#A00000', redLt: '#FF5A5A',
    flame: '#FF8C1A', flameCore: '#FFF3C4',
    steel: '#C9CED6', steelLt: '#EEF1F5', steelDk: '#9AA1AB', steelDkr: '#6E7580',
    black: '#1C1C22', black2: '#25252D', black3: '#3C3C47',
    cream: '#FFF6E4', ink: '#2A1A10'
  };

  // ---------------------------------------------------------------------------
  // Pixel sprites
  // ---------------------------------------------------------------------------
  var SP = {
    o: '#4A2A14', h: '#F8D88A', g: '#E8B04A', G: '#C98A2E', j: '#E0602A', J: '#B8401A',
    s: '#F3DCA8', S: '#D9B678', c: '#6B3A22', C: '#3E2214', a: '#E2B07A', r: '#D9202A',
    R: '#9E1520', y: '#F0C060', Y: '#C8902E', w: '#FBF6EE', W: '#DCCFBF', x: '#FFFFFF',
    k: '#2A1A10', p: '#E8D6B8', q: '#C9B48E', n: '#B08A50', m: '#6A4A2A'
  };

  function makeSprite(rows, pal) {
    var c = document.createElement('canvas');
    c.width = rows[0].length; c.height = rows.length;
    var x = c.getContext('2d');
    for (var yy = 0; yy < rows.length; yy++) {
      for (var xx = 0; xx < rows[yy].length; xx++) {
        var ch = rows[yy][xx];
        if (ch !== '.') { x.fillStyle = (pal || SP)[ch]; x.fillRect(xx, yy, 1, 1); }
      }
    }
    return c;
  }

  var COOKIES = [
    { id: 'tart', name: 'tart nenas', title: 'Tart Nenas', unlock: 0, fill: '#E8B04A', top: '#E0602A', map: [
      '..oooooooo..', '.ohhhggggGo.', 'ohhggggggGGo', 'ohggojjjoGGo', 'oggojjhjjoGo', 'oggjjhjjjjGo',
      'oggjjjjjJjGo', 'oggojjjJJoGo', 'ogGGoJJJoGGo', 'oGGGGooooGGo', '.oGGGGGGGGo.', '..oooooooo..'] },
    { id: 'semperit', name: 'semperit', title: 'Semperit', unlock: 0, fill: '#F3DCA8', top: '#D9202A', map: [
      '..o.o..o.o..', '.ohohooohoo.', 'ohssssssssSo', '.ossoooooSo.', 'ohsoorrrooSo', '.osorrxrroSo',
      'ohsorrrRroSo', '.osoorrRooSo', 'ohsSoooooSSo', '.oSSSSSSSSo.', '..oSoSoSoo..', '...o.o.o....'] },
    { id: 'choc', name: 'coklat cip', title: 'Coklat Cip', unlock: 7, fill: '#E8B04A', top: '#3E2214', map: [
      '...oooooo...', '..ohhgggGo..', '.ohgCggggGo.', 'ohgggggCggGo', 'ogCggggggGGo', 'oggggCgggCGo',
      'oggCggggggGo', 'ogggggCggGGo', 'oGggCgggGGGo', '.oGGGGGCGGo.', '..oGGGGGGo..', '...oooooo...'] },
    { id: 'almond', name: 'almond london', title: 'Almond London', unlock: 15, fill: '#6B3A22', top: '#E2B07A', map: [
      '....oooo....', '...oaaaao...', '..occaacco..', '.occxccccCo.', 'occccccccCCo', 'occxcccccCCo',
      'occcccccCCCo', 'occccxccCCCo', 'oCccccccCCCo', '.oCCCCCCCCo.', '..oooooooo..', '............'] },
    { id: 'cornflakes', name: 'cornflakes madu', title: 'Cornflakes Madu', unlock: 23, fill: '#F0C060', top: '#D9202A', map: [
      '...oyoyyo...', '..oyYyhyYo..', '.oyhyYyyYyo.', 'oyYyyhyYyyYo', 'oyyYyyyyhyyo', 'orrxrrrrrrRo',
      '.orRrRrRrRo.', '.orrRrRrRro.', '..orRrRrRo..', '..orrRrRro..', '...oooooo...', '............'] },
    { id: 'makmur', name: 'biskut makmur', title: 'Biskut Makmur', unlock: 30, fill: '#FBF6EE', top: '#DCCFBF', map: [
      '............', '....oooo....', '..oowwwwoo..', '.owwxwwwwWo.', 'owwxxwwwwwWo', 'owwwwwwwwwWo',
      'owwwwwwwwWWo', 'owwwwwwwWWWo', '.oWwwwwWWWo.', '..ooWWWWoo..', '....oooo....', '............'] }
  ];
  var CK = {};
  COOKIES.forEach(function (c) { c.sprite = makeSprite(c.map); CK[c.id] = c; });

  var HAND = makeSprite([
    '...oo......', '..oxxo.....', '..oxxo.....', '..oxxoooo..', '..oxxxxxxoo', 'oooxxxxxxxo',
    'oxxxxxxxxxo', 'oxxxxxxxxxo', '.oxxxxxxxo.', '..oxxxxxo..', '..oxxxxxo..', '..ooooooo..']);
  var STAR_ON = makeSprite([
    '.....o.....', '....oyo....', '....oyo....', 'ooooyyyoooo', 'oyyyyxyyyyo', '.oyyyyyyyo.',
    '..oyyyyyo..', '..oyyoyyo..', '.oyyo.oyyo.', '.oyo...oyo.', '.oo.....oo.'],
    { o: '#8A5A12', y: '#F2B84B', x: '#FFE9A8' });
  var STAR_OFF = makeSprite([
    '.....o.....', '....oyo....', '....oyo....', 'ooooyyyoooo', 'oyyyyyyyyyo', '.oyyyyyyyo.',
    '..oyyyyyo..', '..oyyoyyo..', '.oyyo.oyyo.', '.oyo...oyo.', '.oo.....oo.'],
    { o: '#C9B48E', y: '#EADFC8' });
  var PELITA_ICON = makeSprite([
    '.....xx.....', '....xyyx....', '....yffy....', '.....ff.....', '....mmmm....', '.....nn.....',
    '.....nn.....', '.....nn.....', '.....nn.....', '.....nn.....', '.....nn.....', '....nnnn....'],
    { x: '#FFB347', y: '#FF8C1A', f: '#FFF3C4', m: '#8A6A3A', n: '#C9A46A' });
  var LEVER_ICON = makeSprite([
    '..kk........', '.kkkk.......', '.kkkk.......', '..kk........', '...kk.......', '....kk......',
    '.....kk.....', '......ss....', '.....ssss...', '.....ssss...', '......ss..y.', '.........yyy'],
    { k: '#FFF6E4', s: '#C9CED6', y: '#F2B84B' });

  var CHARS = [
    { id: 'mak', skin: '#E2A97E', wear: 'tudung', scarf: '#8E5BA8', scarfLt: '#A97BC2', body: '#B784CC', bodyDk: '#9466AB',
      lines: ['Along, Mak nak {k} satu balang!', '{k} untuk tetamu Raya, ya!'] },
    { id: 'tokwan', skin: '#C68B5E', wear: 'songkok', beard: true, body: '#EADCB8', bodyDk: '#CDBB91', samping: '#C98A1E',
      lines: ['Atuk nak {k}, jangan lupa!', '{k} macam zaman dulu-dulu!'] },
    { id: 'jiran', skin: '#D9A06E', wear: 'tudung', scarf: '#2E8B8A', scarfLt: '#45A8A6', body: '#F2B84B', bodyDk: '#C98A1E', glasses: true,
      lines: ['{k} macam tahun lepas, boleh?', 'Makcik sebelah rumah nak {k}!'] },
    { id: 'office', skin: '#E8B48A', wear: 'hair', hair: '#2A1B12', body: '#DDE6EE', bodyDk: '#B8C4CF', lanyard: '#3E7CB1',
      lines: ['Bos nak {k} untuk open house!', '{k}, sempat siap tak?'] },
    { id: 'budak', skin: '#D9A06E', wear: 'cap', cap: '#3E7CB1', capDk: '#2C5C88', body: '#FF8C1A', bodyDk: '#D96F0A', small: true,
      lines: ['Nak {k}! Nak {k}!', 'Mak suruh beli {k}!'] },
    { id: 'rider', skin: '#B97A50', wear: 'helmet', helmet: '#2F5D8A', helmetLt: '#4A7DB0', body: '#2F5D8A', bodyDk: '#22466A', stripe: '#F2B84B',
      lines: ['Order {k}! Cepat sikit ya!', 'Pelanggan saya nak {k}!'] }
  ];
  var HAPPY = ['Terima kasih!', 'Sedapnya!', 'Selamat Hari Raya!', 'Wangi lagi!', 'Mantap!', 'Laju betul!'];
  var SAD = ['Lambat sangat…', 'Takpe, esok datang lagi…', 'Alamak…'];

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function easeOut(k) { return 1 - (1 - k) * (1 - k); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function hexToRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mixColor(a, b, k) {
    var x = hexToRgb(a), y = hexToRgb(b);
    return 'rgb(' + Math.round(lerp(x[0], y[0], k)) + ',' + Math.round(lerp(x[1], y[1], k)) + ',' + Math.round(lerp(x[2], y[2], k)) + ')';
  }
  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(CONFIG.storageKey + ':' + key);
      localStorage.setItem(CONFIG.storageKey + ':' + key, String(val));
    } catch (e) { return null; }
    return null;
  }
  function track(name, params) {
    params = params || {};
    try { if (typeof window.fbq === 'function') window.fbq('trackCustom', name, params); } catch (e) { /* ignore */ }
    try { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: name }, params)); } catch (e) { /* ignore */ }
  }

  // ---------------------------------------------------------------------------
  // Sound: original chiptune with a kompang rhythm, plus effects. WebAudio only.
  // ---------------------------------------------------------------------------
  var Sound = (function () {
    var ac = null, master, musicBus, sfxBus, noiseBuf;
    var muted = store('mute') === '1';
    var playing = false, timer = null, nextT = 0, step = 0, tempo = 1;
    var BPM = 124;
    var MEL = ('A4 - B4 A4 F#4 - E4 - D4 - E4 F#4 A4 - - - B4 - D5 B4 A4 - F#4 - E4 - F#4 E4 D4 - - - ' +
      'F#4 A4 B4 - D5 - B4 A4 B4 - A4 F#4 E4 - - - D4 E4 F#4 A4 B4 - A4 F#4 E4 - D4 - D4 - . .').split(' ');
    var ROOTS = ['D3', 'D3', 'G2', 'A2', 'D3', 'B2', 'G2', 'A2'];
    var FIFTH = { D3: 'A3', G2: 'D3', A2: 'E3', B2: 'F#3' };
    var KOMPANG = 'D.TTDT.T';
    var NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    function midi(n) { var m = /^([A-G])(#?)(\d)$/.exec(n); return 12 * (parseInt(m[3], 10) + 1) + NOTE[m[1]] + (m[2] ? 1 : 0); }
    function hz(n) { return 440 * Math.pow(2, (midi(n) - 69) / 12); }

    function init() {
      if (ac) return true;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { ac = new AC(); } catch (e) { return false; }
      master = ac.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ac.destination);
      musicBus = ac.createGain(); musicBus.gain.value = 0.16; musicBus.connect(master);
      sfxBus = ac.createGain(); sfxBus.gain.value = 0.5; sfxBus.connect(master);
      noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.8), ac.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      setInterval(function () { if (playing) schedule(); }, 25);
      return true;
    }
    function resume() { if (ac && ac.state === 'suspended') ac.resume(); }
    function suspend() { if (ac && ac.state === 'running') ac.suspend(); }
    function tone(f, t, dur, type, vol, bus, f2) {
      var o = ac.createOscillator(), gn = ac.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(gn); gn.connect(bus || sfxBus);
      o.start(t); o.stop(t + dur + 0.03);
    }
    function noise(t, dur, vol, ftype, freq, bus) {
      var s = ac.createBufferSource(); s.buffer = noiseBuf;
      var f = ac.createBiquadFilter(); f.type = ftype || 'highpass'; f.frequency.value = freq || 1000;
      var gn = ac.createGain();
      gn.gain.setValueAtTime(vol, t);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(gn); gn.connect(bus || sfxBus);
      s.start(t); s.stop(t + dur + 0.03);
    }
    function schedule() {
      var eighth = 60 / BPM / 2 / tempo;
      while (nextT < ac.currentTime + 0.12) { playStep(step, nextT, eighth); nextT += eighth; step = (step + 1) % 64; }
    }
    function playStep(s, t, eighth) {
      var tok = MEL[s];
      if (tok !== '-' && tok !== '.') {
        var len = 1;
        while (MEL[(s + len) % 64] === '-' && len < 8) len++;
        tone(hz(tok), t, len * eighth * 0.92, 'square', 0.2, musicBus);
        tone(hz(tok) * 2, t, eighth * 0.5, 'triangle', 0.05, musicBus);
      }
      var bar = s >> 3, pos = s & 7, root = ROOTS[bar];
      if (pos === 0 || pos === 4) tone(hz(root), t, eighth * 1.8, 'triangle', 0.32, musicBus);
      if (pos === 2 || pos === 6) tone(hz(FIFTH[root]), t, eighth * 0.9, 'triangle', 0.22, musicBus);
      var k = KOMPANG[pos];
      if (k === 'D') tone(150, t, 0.18, 'sine', 0.6, musicBus, 55);
      if (k === 'T') { noise(t, 0.05, 0.22, 'bandpass', 2600, musicBus); tone(430, t, 0.04, 'triangle', 0.07, musicBus); }
    }
    function now() { return ac ? ac.currentTime : 0; }
    var api = {
      init: init, resume: resume, suspend: suspend,
      get muted() { return muted; },
      setMuted: function (m) {
        muted = m; store('mute', m ? '1' : '0');
        if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ac.currentTime, 0.02);
      },
      startMusic: function () { if (!ac) return; tempo = 1; step = 0; nextT = ac.currentTime + 0.06; playing = true; },
      stopMusic: function () { playing = false; },
      setTempo: function (x) { tempo = x; },
      pick: function () { if (!ac) return; tone(880, now(), 0.05, 'square', 0.1); },
      drop: function () { if (!ac) return; tone(520, now(), 0.09, 'triangle', 0.35, null, 1040); },
      wrong: function () { if (!ac) return; tone(190, now(), 0.16, 'square', 0.14, null, 120); },
      ding: function () {
        if (!ac) return; var t = now();
        tone(1568, t, 0.7, 'sine', 0.22); tone(2349, t, 0.45, 'sine', 0.08); tone(3136, t + 0.01, 0.25, 'sine', 0.04);
      },
      complete: function () {
        if (!ac) return; var t = now();
        noise(t, 0.04, 0.35, 'highpass', 3000);
        [1047, 1319, 1568, 2093].forEach(function (f, i) { tone(f, t + 0.05 + i * 0.06, 0.12, 'square', 0.09); });
      },
      sad: function () { if (!ac) return; var t = now(); tone(392, t, 0.16, 'triangle', 0.2); tone(311, t + 0.16, 0.3, 'triangle', 0.2); },
      pelita: function () { if (!ac) return; var t = now(); tone(1319, t, 0.3, 'triangle', 0.12); tone(1976, t + 0.06, 0.35, 'triangle', 0.08); },
      ready: function () { if (!ac) return; var t = now(); [784, 988, 1175].forEach(function (f, i) { tone(f, t + i * 0.07, 0.1, 'square', 0.1); }); },
      whir: function () {
        if (!ac) return; var t = now();
        var o = ac.createOscillator(), f = ac.createBiquadFilter(), gn = ac.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(260, t + 0.8);
        f.type = 'lowpass'; f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(2200, t + 0.8);
        gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.18, t + 0.1); gn.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
        o.connect(f); f.connect(gn); gn.connect(sfxBus); o.start(t); o.stop(t + 1.05);
      },
      blender: function () { if (!ac) return; noise(now(), 0.6, 0.05, 'bandpass', 900); },
      tick: function () { if (!ac) return; tone(1200, now(), 0.035, 'square', 0.07); },
      firework: function () { if (!ac) return; var t = now(); noise(t, 0.5, 0.12, 'lowpass', 900); tone(1600, t, 0.08, 'triangle', 0.03); },
      fanfare: function () { if (!ac) return; var t = now(); [587, 740, 880, 1175].forEach(function (f, i) { tone(f, t + i * 0.09, 0.18, 'square', 0.12); }); },
      finale: function () {
        if (!ac) return; var t = now();
        [880, 740, 880, 988, 1175].forEach(function (f, i) { tone(f, t + i * 0.13, 0.22, 'square', 0.12); });
        tone(587, t + 0.65, 0.6, 'triangle', 0.25);
      }
    };
    return api;
  })();

  // ---------------------------------------------------------------------------
  // Canvas and scaling
  // ---------------------------------------------------------------------------
  var stage = document.getElementById('stage');
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var scene = document.createElement('canvas');
  scene.width = LW; scene.height = LH;
  var g = scene.getContext('2d');

  function layout() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var frac = Math.min(vw / LW, vh / LH);
    var s = Math.floor(frac);
    if (s < 1 || s < frac * 0.86) s = frac;
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    var w = Math.floor(LW * s), h = Math.floor(LH * s);
    stage.style.width = w + 'px';
    stage.style.height = h + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    document.documentElement.style.setProperty('--u', (w / LW) + 'px');
  }
  function K() { return canvas.width / LW; }

  var logoImg = new Image();
  var logoWhite = null;
  logoImg.onload = function () {
    var c = document.createElement('canvas');
    c.width = logoImg.naturalWidth; c.height = logoImg.naturalHeight;
    var x = c.getContext('2d');
    x.drawImage(logoImg, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, c.width, c.height);
    logoWhite = c;
  };
  logoImg.src = 'assets/thebaker-logo.png';

  // ---------------------------------------------------------------------------
  // Game state
  // ---------------------------------------------------------------------------
  var S = {
    mode: 'title', time: 0, rounds: parseInt(store('rounds') || '0', 10) || 0,
    best: parseInt(store('best') || '0', 10) || 0, challenge: 0
  };
  var m = /^#cabar-(\d{1,6})$/.exec(window.location.hash || '');
  if (m) S.challenge = parseInt(m[1], 10);

  function resetRound() {
    S.t = 0; S.started = false; S.idleT = 0; S.malam = false; S.endT = 0; S.lastTick = 99;
    S.score = 0; S.combo = 0; S.orders = 0; S.lit = 0; S.delivered = {}; S.turbos = 0;
    S.tray = [null, null, null, null, null, null, null, null];
    S.selected = -1; S.drag = null; S.lever = null;
    S.customers = [null, null, null]; S.slotWait = [0.25, 0.3, 0.3];
    S.lastChar = [null, null, null];
    S.firstOrder = true; S.hintDone = false;
    S.poolSize = 2; S.newCookie = null;
    S.oven = { t: 0, flash: 0, fan: 0, progress: 0 };
    S.mixer = { charge: 0, lever: 0, turbo: 0, fired: false };
    S.blender = { whir: 0 };
    S.flyers = []; S.parts = []; S.pops = []; S.sparks = []; S.fireworks = []; S.banner = null;
    ['tart', 'tart', 'semperit', 'tart'].forEach(function (type, i) {
      var p = TRAY_SLOTS[i];
      S.tray[i] = { type: type, slot: i, state: 'idle', x: p.x, y: p.y, age: 0, alpha: 1 };
    });
  }
  resetRound();

  function diff() {
    var t = S.t, k = clamp(t / 40, 0, 1);
    return {
      slots: t < 2.5 ? 1 : (t < 10 ? 2 : 3),
      size: t < 10 ? 3 : (t < 24 ? 4 : (Math.random() < 0.4 ? 5 : 4)),
      mixed: t < 18 ? 0 : (S.malam ? 0.5 : 0.35),
      patience: lerp(17, 11.5, k),
      oven: lerp(2.8, 2.15, k)
    };
  }
  function pool() {
    var out = [];
    COOKIES.forEach(function (c) { if (c.unlock <= S.t) out.push(c.id); });
    return out;
  }
  function demandMap() {
    var d = {};
    S.customers.forEach(function (c) {
      if (!c || (c.state !== 'wait' && c.state !== 'enter')) return;
      c.items.forEach(function (it) { d[it.type] = (d[it.type] || 0) + (it.need - it.have - it.pending); });
    });
    return d;
  }
  function trayCounts() {
    var d = {};
    S.tray.forEach(function (ck) { if (ck && ck.state !== 'fade') d[ck.type] = (d[ck.type] || 0) + 1; });
    return d;
  }
  function isDemanded(type) { return (demandMap()[type] || 0) > 0; }
  function emptySlots() { var e = []; for (var i = 0; i < 8; i++) if (!S.tray[i]) e.push(i); return e; }
  function weighted(keys, w) {
    var total = 0; keys.forEach(function (k) { total += Math.max(0.01, w[k]); });
    var r = Math.random() * total;
    for (var i = 0; i < keys.length; i++) { r -= Math.max(0.01, w[keys[i]]); if (r <= 0) return keys[i]; }
    return keys[keys.length - 1];
  }

  // ---------------------------------------------------------------------------
  // Orders and customers
  // ---------------------------------------------------------------------------
  function item(type, need) { return { type: type, need: need, have: 0, pending: 0 }; }

  function makeOrder() {
    var D = diff(), ids = pool(), dem = demandMap(), onTray = trayCounts();
    function choose(exclude) {
      var w = {}, keys = [];
      ids.forEach(function (id) {
        if (exclude.indexOf(id) >= 0) return;
        var v = 1;
        if ((onTray[id] || 0) > (dem[id] || 0)) v += 2.5;
        if ((dem[id] || 0) > 0) v *= 0.45;
        if (S.newCookie && S.newCookie.id === id && !S.newCookie.used) v += 5;
        w[id] = v; keys.push(id);
      });
      var id = weighted(keys, w);
      if (S.newCookie && S.newCookie.id === id) S.newCookie.used = true;
      return id;
    }
    if (ids.length >= 3 && Math.random() < D.mixed) {
      var a = choose([]), b = choose([a]);
      var na = Math.ceil(D.size / 2);
      return [item(a, na), item(b, D.size - na)];
    }
    return [item(choose([]), D.size)];
  }

  function spawnCustomer(slot) {
    var used = S.customers.filter(Boolean).map(function (c) { return c.ch.id; });
    var options = CHARS.filter(function (ch) { return used.indexOf(ch.id) < 0 && ch.id !== S.lastChar[slot]; });
    var ch = pick(options.length ? options : CHARS);
    S.lastChar[slot] = ch.id;
    var items = S.firstOrder ? [item('tart', 3)] : makeOrder();
    S.firstOrder = false;
    var D = diff();
    var total = items.reduce(function (s, it) { return s + it.need; }, 0);
    var maxP = D.patience + (total - 3) * 1.1;
    var fromLeft = slot === 0 || (slot === 1 && Math.random() < 0.5);
    var startX = fromLeft ? -16 : LW + 16;
    var names = items.map(function (it) { return CK[it.type].name; }).join(' dengan ');
    var c = {
      slot: slot, ch: ch, items: items, maxP: maxP, p: maxP, state: 'enter',
      x: startX, fromX: startX, toX: SLOT_CX[slot] - 7, exitX: startX, walkT: 0, walkDur: 0.55, stateT: 0,
      jar: [], lidT: 0, shake: 0, happy: false, noLid: false,
      say: pick(ch.lines).replace(/\{k\}/g, names), sayT: 2.6, seed: Math.random() * 6
    };
    S.customers[slot] = c;
    say(c, c.say.charAt(0).toUpperCase() + c.say.slice(1), 2.4);
    if (items.some(function (it) { return it.type === 'tart'; })) { S.blender.whir = 1.0; Sound.blender(); }
  }

  function say(c, words, dur) {
    S.customers.forEach(function (o) { if (o && o !== c && o.sayT > 0.25) o.sayT = 0.25; });
    c.say = words; c.sayT = dur;
  }

  function startLeave(c) {
    c.state = 'leave'; c.walkT = 0; c.walkDur = 0.5; c.fromX = c.x;
  }
  function leaveSad(c) {
    c.state = 'sad'; c.stateT = 0; c.happy = false;
    S.combo = 0;
    say(c, pick(SAD), 1.4);
    Sound.sad();
  }
  function orderDone(c) { return c.items.every(function (it) { return it.have >= it.need; }); }

  function completeOrder(c) {
    c.state = 'happy'; c.stateT = 0; c.lidT = 0; c.happy = true;
    var mult = 1 + 0.5 * Math.min(S.combo, 4);
    var pf = clamp(c.p / c.maxP, 0, 1);
    var bonus = Math.round((50 + 50 * pf) * mult) * (S.malam ? 2 : 1);
    S.score += bonus; S.combo++; S.orders++;
    var cx = SLOT_CX[c.slot];
    pop('+' + bonus, cx, 86, 8, P.gold);
    if (mult > 1) pop('COMBO x' + mult, cx, 96, 5.5, P.cream);
    say(c, pick(HAPPY), 1.4);
    Sound.complete();
    burst(cx, 96, 12, [P.gold, P.goldLt, P.cream]);
    if (S.orders <= CONFIG.pelitaCount) spawnSpark(cx, 92, S.orders - 1);
    if (S.mixer.charge < 3) {
      S.mixer.charge++;
      if (S.mixer.charge === 3) { Sound.ready(); pop('MIXER PENUH!', MIXER.x + 18, MIXER.y - 4, 5, P.gold); }
    }
  }

  // ---------------------------------------------------------------------------
  // Oven, tray and mixer
  // ---------------------------------------------------------------------------
  function bakeBatch(n, turbo) {
    var empty = shuffle(emptySlots());
    n = Math.min(n, empty.length);
    if (!n) return;
    var dem = demandMap(), tc = trayCounts(), ids = pool();
    Object.keys(tc).forEach(function (k) { dem[k] = (dem[k] || 0) - tc[k]; });
    var filled = 8 - empty.length;
    for (var i = 0; i < n; i++) {
      var positive = Object.keys(dem).filter(function (k) { return dem[k] > 0 && ids.indexOf(k) >= 0; });
      var decoy = turbo ? 0 : (filled + i >= 5 ? 0.1 : 0.3);
      var type;
      if (positive.length && Math.random() >= decoy) { type = weighted(positive, dem); dem[type]--; }
      else type = pick(ids);
      var s = empty[i], p = TRAY_SLOTS[s];
      S.tray[s] = {
        type: type, slot: s, state: 'oven', x: OVEN_DOOR.x, y: OVEN_DOOR.y,
        fx: OVEN_DOOR.x, fy: OVEN_DOOR.y, tx: p.x, ty: p.y, t: -i * 0.07, dur: 0.38,
        age: 0, alpha: 1, gold: !!turbo
      };
    }
    S.oven.t = 0; S.oven.flash = 1;
    Sound.ding();
    pop(turbo ? 'TURBO!' : 'TING!', OVEN.x + OVEN.w / 2, OVEN.y - 3, turbo ? 9 : 5.5, turbo ? P.gold : P.cream);
  }

  function activateTurbo() {
    if (S.mixer.charge < 3 || S.mixer.turbo > 0 || S.mode !== 'play') return;
    S.started = true;
    S.mixer.charge = 0; S.mixer.turbo = 1.1; S.mixer.fired = false; S.turbos++;
    Sound.whir();
    track('MixerTurbo', { round: S.rounds + 1 });
  }

  function returnToSlot(ck) {
    var p = TRAY_SLOTS[ck.slot];
    ck.state = 'back'; ck.fx = ck.x; ck.fy = ck.y; ck.tx = p.x; ck.ty = p.y; ck.t = 0; ck.dur = 0.16;
  }

  function findItem(c, type) {
    for (var i = 0; i < c.items.length; i++) {
      var it = c.items[i];
      if (it.type === type && it.have + it.pending < it.need) return it;
    }
    return null;
  }

  function tryDeliver(ck, col) {
    var c = S.customers[col];
    var it = (c && c.state === 'wait') ? findItem(c, ck.type) : null;
    if (it) {
      it.pending++;
      S.tray[ck.slot] = null;
      if (S.selected === ck.slot) S.selected = -1;
      S.flyers.push({ type: ck.type, x0: ck.x, y0: ck.y, x1: SLOT_CX[col], y1: 102, t: 0, dur: 0.16, cust: c, item: it });
      S.started = true; S.hintDone = true;
    } else {
      returnToSlot(ck);
      if (c && c.state === 'wait') { c.shake = 0.35; Sound.wrong(); }
    }
  }

  function flyerArrive(f) {
    var c = f.cust, it = f.item;
    it.pending = Math.max(0, it.pending - 1);
    if (c.state !== 'wait' || S.customers[c.slot] !== c) { burst(f.x1, f.y1, 5, [CK[f.type].fill]); return; }
    it.have++;
    c.jar.push(f.type);
    S.delivered[f.type] = (S.delivered[f.type] || 0) + 1;
    var pts = 10 * (S.malam ? 2 : 1);
    S.score += pts;
    pop('+' + pts, f.x1, 92, 5, P.cream);
    Sound.drop();
    burst(f.x1, 98, 4, [CK[f.type].fill, CK[f.type].top]);
    if (orderDone(c)) completeOrder(c);
  }

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------
  function pop(text, x, y, size, color) { S.pops.push({ text: text, x: x, y: y, size: size, color: color, t: 0, dur: 0.9 }); }
  function burst(x, y, n, colors) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = 20 + Math.random() * 40;
      S.parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 25, t: 0, dur: 0.4 + Math.random() * 0.3, c: pick(colors) });
    }
  }
  function pelitaPos(X, Y, W, H, i) {
    return { x: Math.round(X + 6 + i * (W - 12) / (CONFIG.pelitaCount - 1)), y: Y + H - 5 };
  }
  function spawnSpark(x, y, idx) {
    var p = pelitaPos(WIN.x, WIN.y, WIN.w, WIN.h, idx);
    S.sparks.push({ x0: x, y0: y, x1: p.x, y1: p.y - 2, t: 0, dur: 0.65, idx: idx });
  }
  function spawnFirework() {
    S.fireworks.push({
      x: WIN.x + 12 + Math.random() * (WIN.w - 24), y: WIN.y + 7 + Math.random() * 16,
      t: 0, dur: 1.1, n: 12 + Math.floor(Math.random() * 6),
      c: pick(['#F2B84B', '#FFF6E4', '#FF7AA8', '#7AD7FF', '#FFB347'])
    });
    Sound.firework();
  }
  function banner(text, sub, dur) { S.banner = { text: text, sub: sub, t: 0, dur: dur || 2 }; }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------
  function update(dt) {
    S.time += dt;
    S.oven.fan += dt * 9;
    S.oven.flash = Math.max(0, S.oven.flash - dt * 2.5);
    if (S.mode === 'play') {
      if (S.started) {
        S.t += dt;
        var remaining = CONFIG.roundSeconds - S.t;
        if (!S.malam && remaining <= CONFIG.malamRayaSeconds) {
          S.malam = true;
          banner('MALAM RAYA!', 'Mata x2', 2.2);
          Sound.fanfare(); Sound.setTempo(1.12);
        }
        var sec = Math.ceil(remaining);
        if (remaining <= 5 && sec !== S.lastTick && sec > 0) { S.lastTick = sec; Sound.tick(); }
        if (remaining <= 0) { endRound(); }
        var ids = pool();
        if (ids.length > S.poolSize) {
          S.poolSize = ids.length;
          S.newCookie = { id: ids[ids.length - 1], t: 0, used: false };
        }
        if (S.malam && Math.random() < dt * 0.8) spawnFirework();
      } else {
        S.idleT += dt;
        if (S.idleT > 6) S.started = true;
      }
      if (S.mode === 'play') {
        updateOven(dt);
        updateSlots(dt);
      }
    } else if (S.mode === 'ending') {
      S.endT += dt;
      if (Math.random() < dt * 4) spawnFirework();
      if (S.endT > 2.6) showEnd();
    } else if (S.mode === 'end') {
      if (Math.random() < dt * 0.9) spawnFirework();
    }
    if (S.mode !== 'title') updateCustomers(dt);
    updateTray(dt);
    updateMixer(dt);
    updateEffects(dt);
  }

  function updateOven(dt) {
    var O = S.oven;
    if (!S.started) { O.progress = 0; return; }
    var interval = diff().oven;
    O.t += dt;
    O.progress = clamp(O.t / interval, 0, 1);
    if (O.t >= interval) {
      var empty = emptySlots().length;
      if (empty > 0) bakeBatch(Math.min(4, empty), false);
      else O.t = interval;
    }
  }

  function updateSlots(dt) {
    var n = diff().slots;
    for (var j = 0; j < n; j++) {
      var i = OPEN_ORDER[j];
      if (S.customers[i]) continue;
      S.slotWait[i] -= dt;
      if (S.slotWait[i] <= 0) spawnCustomer(i);
    }
  }

  function updateCustomers(dt) {
    for (var i = 0; i < 3; i++) {
      var c = S.customers[i];
      if (!c) continue;
      c.stateT += dt;
      c.shake = Math.max(0, c.shake - dt);
      if (c.sayT > 0) c.sayT -= dt;
      if (c.state === 'enter') {
        c.walkT += dt;
        var k = Math.min(1, c.walkT / c.walkDur);
        c.x = lerp(c.fromX, c.toX, easeOut(k));
        if (k >= 1) { c.state = 'wait'; c.stateT = 0; }
      } else if (c.state === 'wait') {
        if (S.started && S.mode === 'play') {
          c.p -= dt;
          if (c.p <= 0) leaveSad(c);
        }
      } else if (c.state === 'happy') {
        c.lidT += dt;
        if (c.stateT > 0.85) startLeave(c);
      } else if (c.state === 'sad') {
        if (c.stateT > 0.75) startLeave(c);
      } else if (c.state === 'leave') {
        c.walkT += dt;
        var k2 = Math.min(1, c.walkT / c.walkDur);
        c.x = lerp(c.fromX, c.exitX, k2 * k2);
        if (k2 >= 1) { S.customers[i] = null; S.slotWait[i] = 0.5 + Math.random() * 0.7; }
      }
    }
  }

  function updateTray(dt) {
    for (var i = 0; i < 8; i++) {
      var ck = S.tray[i];
      if (!ck) continue;
      if (ck.state === 'oven' || ck.state === 'back') {
        ck.t += dt;
        if (ck.t < 0) continue;
        var k = Math.min(1, ck.t / ck.dur);
        ck.x = lerp(ck.fx, ck.tx, k);
        ck.y = lerp(ck.fy, ck.ty, k) - (ck.state === 'oven' ? Math.sin(k * Math.PI) * 18 : 0);
        if (k >= 1) { ck.state = 'idle'; ck.x = ck.tx; ck.y = ck.ty; }
      } else if (ck.state === 'drag' && S.drag && S.drag.slot === i) {
        ck.x = S.drag.x; ck.y = S.drag.y - DRAG_LIFT;
      } else if (ck.state === 'idle') {
        ck.age += dt;
        if (S.started && ck.age > 9 && S.selected !== i && !isDemanded(ck.type)) { ck.state = 'fade'; ck.t = 0; }
      } else if (ck.state === 'fade') {
        ck.alpha -= dt * 2.5;
        if (ck.alpha <= 0) {
          burst(ck.x, ck.y, 5, [P.cream, P.steelLt]);
          S.tray[i] = null;
          if (S.selected === i) S.selected = -1;
        }
      }
    }
  }

  function updateMixer(dt) {
    var M = S.mixer;
    if (M.turbo > 0) {
      M.turbo -= dt;
      M.lever = Math.min(1, M.lever + dt * 6);
      if (!M.fired && M.turbo < 0.35) {
        M.fired = true;
        S.tray.forEach(function (ck, i) {
          if (ck && ck.state === 'idle' && !isDemanded(ck.type) && S.selected !== i) {
            burst(ck.x, ck.y, 4, [P.cream]); S.tray[i] = null;
          }
        });
        bakeBatch(8, true);
        burst(OVEN_DOOR.x, OVEN_DOOR.y - 20, 16, [P.gold, P.goldLt, P.cream]);
      }
    } else {
      M.lever = Math.max(0, M.lever - dt * 2);
    }
    S.blender.whir = Math.max(0, S.blender.whir - dt);
  }

  function updateEffects(dt) {
    var i;
    for (i = S.flyers.length - 1; i >= 0; i--) {
      var f = S.flyers[i];
      f.t += dt;
      if (f.t >= f.dur) { S.flyers.splice(i, 1); flyerArrive(f); }
    }
    for (i = S.parts.length - 1; i >= 0; i--) {
      var p = S.parts[i];
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt;
      if (p.t >= p.dur) S.parts.splice(i, 1);
    }
    for (i = S.pops.length - 1; i >= 0; i--) { S.pops[i].t += dt; if (S.pops[i].t >= S.pops[i].dur) S.pops.splice(i, 1); }
    for (i = S.sparks.length - 1; i >= 0; i--) {
      var s = S.sparks[i];
      s.t += dt;
      var k = Math.min(1, s.t / s.dur);
      var sx = lerp(s.x0, s.x1, k), sy = lerp(s.y0, s.y1, k) - Math.sin(k * Math.PI) * 26;
      if (Math.random() < 0.8) S.parts.push({ x: sx, y: sy, vx: 0, vy: 0, t: 0, dur: 0.25, c: P.goldLt, still: true });
      if (k >= 1) {
        S.sparks.splice(i, 1);
        S.lit = Math.max(S.lit, s.idx + 1);
        burst(s.x1, s.y1, 6, [P.flame, P.goldLt]);
        Sound.pelita();
        if (S.lit === CONFIG.pelitaCount) { banner('RUMAH TERANG!', 'Semua pelita menyala', 1.8); Sound.fanfare(); }
      }
    }
    for (i = S.fireworks.length - 1; i >= 0; i--) { S.fireworks[i].t += dt; if (S.fireworks[i].t >= S.fireworks[i].dur) S.fireworks.splice(i, 1); }
    if (S.banner) { S.banner.t += dt; if (S.banner.t >= S.banner.dur) S.banner = null; }
    if (S.newCookie && S.newCookie.t < 2.4) S.newCookie.t += dt;
  }

  // ---------------------------------------------------------------------------
  // Round flow
  // ---------------------------------------------------------------------------
  function startRound() {
    Sound.init(); Sound.resume();
    resetRound();
    S.mode = 'play';
    Sound.startMusic();
    track(S.rounds === 0 ? 'GameStart' : 'Replay', { round: S.rounds + 1 });
  }

  function endRound() {
    S.mode = 'ending'; S.endT = 0;
    if (S.drag) { var ck = S.tray[S.drag.slot]; if (ck) returnToSlot(ck); S.drag = null; }
    S.selected = -1; S.lever = null;
    canvas.classList.remove('dragging');
    var said = false;
    S.customers.forEach(function (c) {
      if (c && (c.state === 'wait' || c.state === 'enter')) {
        c.state = 'happy'; c.stateT = 0; c.noLid = true; c.happy = true;
        if (!said) { c.say = 'Selamat Hari Raya!'; c.sayT = 2; said = true; } else c.sayT = 0;
      }
    });
    banner('SELAMAT HARI RAYA!', 'Maaf zahir dan batin', 2.6);
    Sound.stopMusic(); Sound.finale();
  }

  function resultTitle(stars) {
    var topType = null, topN = 0;
    Object.keys(S.delivered).forEach(function (k) { if (S.delivered[k] > topN) { topN = S.delivered[k]; topType = k; } });
    if (stars >= 3) return 'Sifu Tempahan Raya';
    if (stars === 2 && topType) return 'Juara ' + CK[topType].title;
    if (stars === 1) return 'Tukang Kuih Harapan';
    return 'Pembantu Dapur Baru';
  }

  function showEnd() {
    S.mode = 'end';
    S.rounds++;
    store('rounds', S.rounds);
    var lit = Math.min(S.orders, CONFIG.pelitaCount);
    var stars = 0;
    CONFIG.starAt.forEach(function (n) { if (lit >= n) stars++; });
    var isBest = S.score > S.best;
    if (isBest) { S.best = S.score; store('best', S.best); }
    S.result = { score: S.score, stars: stars, lit: lit, orders: S.orders, title: resultTitle(stars) };

    $('end-title').textContent = S.result.title;
    $('end-score').textContent = fmt(S.score);
    var starsEl = $('stars');
    starsEl.setAttribute('aria-label', stars + ' bintang');
    Array.prototype.forEach.call(starsEl.children, function (sp, i) {
      sp.style.backgroundImage = 'url(' + (i < stars ? STAR_ON_URL : STAR_OFF_URL) + ')';
    });
    $('end-stats').textContent = S.orders + ' tempahan siap · ' + (isBest ? 'Rekod baru!' : 'Rekod ' + fmt(S.best));
    var next = '';
    if (S.challenge) {
      next = S.score > S.challenge ? 'Anda kalahkan skor kawan (' + fmt(S.challenge) + ')!'
        : 'Lagi ' + fmt(S.challenge - S.score + 1) + ' mata untuk kalahkan kawan anda.';
    } else if (stars < 3) {
      var need = CONFIG.starAt[stars] - lit;
      next = 'Lagi ' + need + ' pelita untuk ' + (stars + 1) + ' bintang!';
    } else {
      next = 'Rumah terang benderang! Semua pelita menyala.';
    }
    $('next-star').textContent = next;

    var prod = (S.turbos >= 1 && S.rounds % 2 === 0) ? CONFIG.products.mixer : CONFIG.products.oven;
    S.featured = prod === CONFIG.products.mixer ? 'B10-ES' : 'E-1AG';
    $('product-q').textContent = prod.q;
    $('product-name').textContent = prod.name;
    $('product-img').src = prod.img;
    $('product-card').href = prod.url;

    $('end-screen').hidden = false;
    $('replay-btn').focus({ preventScroll: true });
    track('RoundEnd', { round: S.rounds, score: S.score, stars: stars, orders: S.orders, turbos: S.turbos });
    if (S.rounds === 3) track('EngagedPlayer', { rounds: 3 });
  }

  // ---------------------------------------------------------------------------
  // Input: drag and drop, or tap a cookie then tap a customer
  // ---------------------------------------------------------------------------
  function toLogical(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * LW, y: (e.clientY - r.top) / r.height * LH };
  }
  function slotAt(p) {
    for (var i = 0; i < 8; i++) {
      var s = TRAY_SLOTS[i];
      if (Math.abs(p.x - s.x) <= 12 && Math.abs(p.y - s.y) <= 11.5) return i;
    }
    return -1;
  }
  function colAt(x) { return clamp(Math.floor(x / 60), 0, 2); }
  function inMixer(p) { return p.x >= 136 && p.y >= 192 && p.y <= 300; }

  canvas.addEventListener('pointerdown', function (e) {
    if (S.mode !== 'play') return;
    Sound.resume();
    var p = toLogical(e);
    var slot = slotAt(p);
    if (slot >= 0 && S.tray[slot] && S.tray[slot].state === 'idle') {
      S.started = true;
      S.drag = { id: e.pointerId, slot: slot, sx: p.x, sy: p.y, x: p.x, y: p.y, moved: false, wasSelected: S.selected === slot };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      canvas.classList.add('dragging');
      Sound.pick();
      e.preventDefault();
      return;
    }
    if (inMixer(p) && S.mixer.charge >= 3 && S.mixer.turbo <= 0) {
      S.lever = { id: e.pointerId, y: p.y, done: false };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      e.preventDefault();
      return;
    }
    if (S.selected >= 0 && p.y < DROP_LINE) {
      var ck = S.tray[S.selected];
      if (ck && ck.state === 'idle') tryDeliver(ck, colAt(p.x));
    }
    S.selected = -1;
  });

  canvas.addEventListener('pointermove', function (e) {
    var p;
    if (S.lever && e.pointerId === S.lever.id) {
      p = toLogical(e);
      if (!S.lever.done && p.y - S.lever.y > 7) { S.lever.done = true; activateTurbo(); }
      return;
    }
    if (!S.drag || e.pointerId !== S.drag.id) return;
    p = toLogical(e);
    var d = S.drag;
    d.x = p.x; d.y = p.y;
    if (!d.moved && Math.abs(p.x - d.sx) + Math.abs(p.y - d.sy) > 3) {
      d.moved = true;
      S.selected = -1;
      var ck = S.tray[d.slot];
      if (ck) ck.state = 'drag';
    }
  });

  function pointerEnd(e) {
    if (S.lever && e.pointerId === S.lever.id) {
      if (!S.lever.done && e.type === 'pointerup') activateTurbo();
      S.lever = null;
      return;
    }
    if (!S.drag || e.pointerId !== S.drag.id) return;
    var d = S.drag;
    S.drag = null;
    canvas.classList.remove('dragging');
    var ck = S.tray[d.slot];
    if (!ck) return;
    if (d.moved) {
      var p = toLogical(e);
      ck.x = p.x; ck.y = p.y - DRAG_LIFT;
      if (e.type === 'pointerup' && p.y < DROP_LINE && S.mode === 'play') tryDeliver(ck, colAt(p.x));
      else returnToSlot(ck);
    } else {
      S.selected = d.wasSelected ? -1 : d.slot;
    }
  }
  canvas.addEventListener('pointerup', pointerEnd);
  canvas.addEventListener('pointercancel', pointerEnd);

  // ---------------------------------------------------------------------------
  // Drawing helpers (game pixels)
  // ---------------------------------------------------------------------------
  function rc(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function R(x, y, w, h, col) { rc(g, x, y, w, h, col); }
  function disc(c, cx, cy, r, col) {
    c.fillStyle = col;
    for (var yy = -Math.ceil(r); yy <= Math.ceil(r); yy++) {
      var half = Math.floor(Math.sqrt(Math.max(0, r * r - yy * yy)));
      if (half > 0 || Math.abs(yy) <= r) c.fillRect(Math.round(cx - half), Math.round(cy + yy), half * 2 + 1, 1);
    }
  }
  function ring(c, cx, cy, r, col) {
    c.fillStyle = col;
    var steps = Math.max(16, Math.round(r * 7));
    for (var i = 0; i < steps; i++) {
      var a = i / steps * Math.PI * 2;
      c.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
    }
  }
  function line(c, x0, y0, x1, y1, col, w) {
    c.fillStyle = col;
    var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (var i = 0; i <= n; i++) {
      var x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
      c.fillRect(Math.round(x - (w > 1 ? 0.5 : 0)), Math.round(y - (w > 1 ? 0.5 : 0)), w || 1, w || 1);
    }
  }

  // ---------------------------------------------------------------------------
  // Window scene: dusk kampung, crescent moon, house and the pelita row.
  // Shared with the share card, so it takes its own context and rectangle.
  // ---------------------------------------------------------------------------
  var STARS = [];
  for (var si = 0; si < 22; si++) STARS.push({ u: Math.random(), v: Math.random() * 0.55, s: Math.random() * 6 });

  function drawWindowScene(c, X, Y, W, H, o) {
    c.save();
    c.beginPath(); c.rect(X, Y, W, H); c.clip();
    var grd = c.createLinearGradient(0, Y, 0, Y + H);
    if (o.night) {
      grd.addColorStop(0, '#0E1030'); grd.addColorStop(0.55, '#2A2150'); grd.addColorStop(1, '#5A2E55');
    } else {
      grd.addColorStop(0, '#1B1F3B'); grd.addColorStop(0.45, '#4A3566'); grd.addColorStop(0.8, '#C8664A'); grd.addColorStop(1, '#F2A65A');
    }
    c.fillStyle = grd; c.fillRect(X, Y, W, H);
    STARS.forEach(function (s, i) {
      var tw = Math.sin(o.time * 2 + s.s) > 0.55;
      rc(c, X + s.u * W, Y + s.v * H, 1, 1, tw ? '#FFF6E4' : (i % 2 ? '#9C95C8' : '#7A73A8'));
    });
    // anak bulan
    var mx = X + W - 16, my = Y + 10;
    disc(c, mx, my, 5, '#FFE9A8');
    disc(c, mx + 2, my - 2, 4.6, grd);
    // palms
    palm(c, X + 10, Y + H - 11, 18, '#22183A');
    palm(c, X + 22, Y + H - 11, 13, '#2A1E44');
    palm(c, X + W - 12, Y + H - 11, 16, '#22183A');
    // ground
    rc(c, X, Y + H - 11, W, 11, '#1F2620');
    rc(c, X, Y + H - 11, W, 1, '#33402F');
    rc(c, X, Y + H - 4, W, 1, '#3A3424');
    house(c, Math.round(X + W / 2 - 17), Y + H - 11, o);
    // pelita row
    for (var i = 0; i < CONFIG.pelitaCount; i++) {
      var p = pelitaPos(X, Y, W, H, i);
      rc(c, p.x, p.y, 1, 5, '#B08A50');
      rc(c, p.x - 1, p.y - 1, 3, 1, '#7A5A30');
      if (i < o.lit) {
        var fl = Math.sin(o.time * 13 + i * 1.7) > 0;
        c.globalAlpha = 0.28;
        disc(c, p.x, p.y - 3, fl ? 4 : 3.5, '#FF9A2E');
        c.globalAlpha = 1;
        rc(c, p.x, p.y - 3, 1, 2, fl ? P.flame : '#FFB347');
        rc(c, p.x, p.y - 2, 1, 1, P.flameCore);
      }
    }
    if (o.fireworks) drawFireworks(c, o.fireworks);
    c.restore();
  }

  function palm(c, x, gy, h, col) {
    for (var i = 0; i < h; i++) rc(c, x + Math.round(Math.sin(i / h * 1.4) * 2), gy - i, 1, 1, col);
    var tx = x + Math.round(Math.sin(1.4) * 2), ty = gy - h;
    [[-6, 2], [-4, -2], [0, -3], [4, -2], [6, 2], [-3, 3], [3, 3]].forEach(function (d) { line(c, tx, ty, tx + d[0], ty + d[1], col, 1); });
  }

  function house(c, x, gy, o) {
    var wall = '#7A4A2E', wallDk = '#5E3820', roof = '#3A2418', roofLt = '#4E3020', post = '#3B2A1E';
    for (var i = 0; i < 4; i++) rc(c, x + 3 + i * 9, gy - 6, 1, 6, post);
    rc(c, x, gy - 7, 34, 2, wallDk);
    rc(c, x + 2, gy - 17, 30, 10, wall);
    for (i = 0; i < 8; i++) rc(c, x + 2 + i * 4, gy - 17, 1, 10, wallDk);
    var lit = o.houseGlow ? '#FFD27A' : (o.lit >= 5 ? '#B8743A' : '#3A2626');
    if (o.houseGlow) {
      c.globalAlpha = 0.35;
      disc(c, x + 8, gy - 13, 5, '#FFD27A'); disc(c, x + 26, gy - 13, 5, '#FFD27A');
      c.globalAlpha = 1;
    }
    rc(c, x + 6, gy - 15, 5, 5, lit); rc(c, x + 23, gy - 15, 5, 5, lit);
    rc(c, x + 8, gy - 15, 1, 5, wallDk); rc(c, x + 25, gy - 15, 1, 5, wallDk);
    rc(c, x + 14, gy - 15, 6, 8, o.houseGlow ? P.gold : '#4A2E1E');
    for (var r = 0; r < 9; r++) rc(c, x - 2 + r * 2, gy - 18 - r, 38 - r * 4, 1, r % 3 === 0 ? roofLt : roof);
    for (var s = 0; s < 3; s++) rc(c, x + 14 - s, gy - 5 + s * 2, 6, 1, post);
  }

  function drawFireworks(c, list) {
    list.forEach(function (f) {
      var k = f.t / f.dur, r = easeOut(Math.min(1, k * 1.4)) * 11;
      c.globalAlpha = clamp(1.25 - k, 0, 1);
      for (var i = 0; i < f.n; i++) {
        var a = i / f.n * Math.PI * 2;
        var x = f.x + Math.cos(a) * r, y = f.y + Math.sin(a) * r + k * k * 5;
        rc(c, x, y, 1, 1, f.c);
        rc(c, f.x + Math.cos(a) * r * 0.65, f.y + Math.sin(a) * r * 0.65 + k * k * 4, 1, 1, k < 0.5 ? '#FFFFFF' : f.c);
      }
      if (k < 0.15) rc(c, f.x - 1, f.y - 1, 3, 3, '#FFFFFF');
      c.globalAlpha = 1;
    });
  }

  // ---------------------------------------------------------------------------
  // Room
  // ---------------------------------------------------------------------------
  function drawRoom() {
    var x, i;
    R(0, 0, LW, 150, P.wall);
    for (x = 6; x < LW; x += 12) R(x, 21, 1, 99, P.wallLine);
    // top bar and songket strip
    R(0, 0, LW, 15, P.emeraldDk);
    R(0, 15, LW, 6, P.emerald);
    for (x = 0; x < LW; x += 6) {
      R(x + 3, 15, 1, 1, P.gold); R(x + 2, 16, 3, 1, P.gold); R(x + 1, 17, 5, 1, P.gold);
      R(x + 3, 17, 1, 1, P.goldLt); R(x + 2, 18, 3, 1, P.gold); R(x + 3, 19, 1, 1, P.gold);
    }
    R(0, 21, LW, 1, P.goldDk);
    // window
    var W = WIN;
    R(W.x - 4, W.y - 4, W.w + 8, W.h + 8, P.emeraldDk);
    R(W.x - 3, W.y - 3, W.w + 6, W.h + 6, P.emerald);
    R(W.x - 3, W.y - 3, W.w + 6, 1, P.emeraldLt);
    R(W.x - 1, W.y - 1, W.w + 2, W.h + 2, P.emeraldDk);
    var lit = S.mode === 'title' ? CONFIG.pelitaCount : S.lit;
    drawWindowScene(g, W.x, W.y, W.w, W.h, {
      night: S.malam || S.mode === 'ending' || S.mode === 'end',
      lit: lit, houseGlow: lit >= CONFIG.pelitaCount, time: S.time, fireworks: S.fireworks
    });
    R(W.x - 7, W.y + W.h + 3, W.w + 14, 3, P.woodLt);
    R(W.x - 7, W.y + W.h + 3, W.w + 14, 1, P.woodTop);
    R(W.x - 7, W.y + W.h + 6, W.w + 14, 1, P.woodDk);
    shutter(W.x - 16, W.y - 2, W.h + 4);
    shutter(W.x + W.w + 5, W.y - 2, W.h + 4);
    ketupat(10, 23, Math.round(Math.sin(S.time * 1.6) * 1.2));
    ketupat(LW - 11, 23, Math.round(Math.sin(S.time * 1.6 + 1.3) * 1.2));
    // lower kitchen wall
    R(0, 148, LW, 152, P.wallLow);
    for (var y = 152, row = 0; y < 298; y += 9, row++) {
      R(0, y, LW, 1, P.wallLowLine);
      for (x = (row % 2) * 9; x < LW; x += 18) R(x, y, 1, 9, P.wallLowLine);
    }
    // bench
    R(0, 298, LW, 2, P.woodTop); R(0, 300, LW, 4, P.woodLt); R(0, 304, LW, 16, P.wood);
    for (x = 10; x < LW; x += 24) R(x, 304, 1, 16, P.woodDk);
    R(0, 311, LW, 3, P.woodDk);
    for (x = 0; x < LW; x += 6) { R(x + 3, 311, 1, 1, P.goldDk); R(x + 2, 312, 3, 1, P.goldDk); R(x + 3, 313, 1, 1, P.goldDk); }
    // shelf under the tray
    R(TRAY.x - 6, TRAY.y + TRAY.h + 1, TRAY.w + 12, 3, P.steelDk);
    R(TRAY.x - 6, TRAY.y + TRAY.h + 1, TRAY.w + 12, 1, P.steel);
    for (i = 0; i < 2; i++) R(TRAY.x - 2 + i * (TRAY.w + 2), TRAY.y + TRAY.h + 4, 2, 3, P.steelDkr);
  }

  function shutter(x, y, h) {
    R(x, y, 11, h, P.emeraldDk);
    R(x + 1, y + 1, 9, h - 2, P.emerald);
    R(x + 2, y + 3, 7, h - 6, P.emeraldDk);
    R(x + 3, y + 4, 5, h - 8, P.emerald);
    for (var yy = y + 8; yy < y + h - 8; yy += 10) {
      R(x + 5, yy, 1, 1, P.gold); R(x + 4, yy + 1, 3, 1, P.gold); R(x + 5, yy + 2, 1, 1, P.gold);
    }
  }

  function ketupat(x, top, sway) {
    var cx = x + sway, cy = top + 10;
    line(g, x, 21, cx, cy - 5, '#8A6A3A', 1);
    var widths = [1, 3, 5, 7, 9, 7, 5, 3, 1];
    for (var r = 0; r < 9; r++) {
      var w = widths[r], sx = cx - (w - 1) / 2;
      for (var k = 0; k < w; k++) {
        var edge = k === 0 || k === w - 1;
        R(sx + k, cy - 4 + r, 1, 1, edge ? '#4E6E2A' : ((k + r) % 2 ? '#7DB246' : '#C9D96A'));
      }
    }
    R(cx - 1, cy + 5, 1, 4, '#7DB246');
    R(cx + 1, cy + 5, 1, 3, '#C9D96A');
  }

  // ---------------------------------------------------------------------------
  // Customers, counter, jars, order tags
  // ---------------------------------------------------------------------------
  function moodOf(c) {
    if (c.state === 'happy' || (c.state === 'leave' && c.happy)) return 'happy';
    if (c.state === 'sad' || c.state === 'leave') return 'sad';
    if (c.state === 'wait' && c.p / c.maxP < 0.33) return 'worried';
    return 'ok';
  }

  function drawCustomer(c) {
    var ch = c.ch;
    var walking = c.state === 'enter' || c.state === 'leave';
    var bob = walking ? (Math.floor(c.walkT * 10) % 2 ? -1 : 0) : (Math.floor((S.time + c.seed) * 1.6) % 2 ? -1 : 0);
    var shakeX = c.shake > 0 ? (Math.floor(S.time * 40) % 2 ? 1 : -1) : 0;
    var x = Math.round(c.x) + shakeX;
    var hx = x - 6, hy = (ch.small ? 89 : 83) + bob;
    var by = hy + 11;
    // body
    R(x - 10, by, 20, COUNTER_Y - by, P.outline);
    R(x - 9, by + 1, 18, COUNTER_Y - by, ch.body);
    R(x + 5, by + 1, 4, COUNTER_Y - by, ch.bodyDk);
    if (ch.samping) { R(x - 9, by + 13, 18, 3, ch.samping); for (var s = 0; s < 18; s += 3) R(x - 9 + s, by + 14, 1, 1, P.goldLt); }
    if (ch.stripe) R(x - 9, by + 7, 18, 2, ch.stripe);
    if (ch.lanyard) { line(g, x - 3, by + 1, x, by + 8, ch.lanyard, 1); line(g, x + 3, by + 1, x, by + 8, ch.lanyard, 1); R(x - 1, by + 8, 3, 4, '#FFFFFF'); }
    if (ch.wear !== 'tudung') R(x - 2, by, 4, 2, ch.skin);
    // head
    R(hx - 1, hy - 1, 14, 14, P.outline);
    R(hx, hy, 12, 12, ch.skin);
    switch (ch.wear) {
      case 'tudung':
        R(hx - 2, hy - 2, 16, 15, P.outline);
        R(hx - 1, hy - 1, 14, 14, ch.scarf);
        R(hx + 1, hy, 6, 1, ch.scarfLt);
        R(hx + 1, hy + 2, 10, 9, ch.skin);
        R(x - 11, by, 22, 7, P.outline);
        R(x - 10, by, 20, 6, ch.scarf);
        R(x - 2, by + 6, 4, 2, ch.scarf);
        break;
      case 'songkok':
        R(hx - 1, hy - 4, 14, 5, P.outline);
        R(hx, hy - 3, 12, 4, '#1E1E24');
        R(hx, hy - 3, 12, 1, '#3A3A44');
        R(hx, hy + 1, 1, 4, '#D0D0D0'); R(hx + 11, hy + 1, 1, 4, '#D0D0D0');
        break;
      case 'hair':
        R(hx - 1, hy - 2, 14, 5, ch.hair);
        R(hx - 1, hy + 3, 2, 4, ch.hair); R(hx + 11, hy + 3, 2, 3, ch.hair);
        R(hx + 7, hy + 2, 3, 1, ch.hair);
        break;
      case 'cap':
        R(hx - 1, hy - 3, 14, 5, ch.cap);
        R(hx + 6, hy + 1, 9, 2, ch.capDk);
        R(hx, hy + 2, 1, 3, '#2A1B12');
        break;
      case 'helmet':
        R(hx - 2, hy - 4, 16, 9, P.outline);
        R(hx - 1, hy - 3, 14, 7, ch.helmet);
        R(hx + 1, hy - 2, 5, 1, ch.helmetLt);
        R(hx, hy + 4, 12, 1, '#9CC3E6');
        R(hx - 1, hy + 5, 1, 5, '#1E2A3A'); R(hx + 12, hy + 5, 1, 5, '#1E2A3A');
        break;
    }
    // face
    var mood = moodOf(c), EYE = '#2A1A10', ey = hy + (ch.wear === 'helmet' ? 6 : 5);
    if (mood === 'happy') {
      R(hx + 2, ey + 1, 1, 1, EYE); R(hx + 3, ey, 1, 1, EYE); R(hx + 4, ey + 1, 1, 1, EYE);
      R(hx + 7, ey + 1, 1, 1, EYE); R(hx + 8, ey, 1, 1, EYE); R(hx + 9, ey + 1, 1, 1, EYE);
      R(hx + 4, ey + 5, 4, 1, '#8A2A1A'); R(hx + 3, ey + 4, 1, 1, '#8A2A1A'); R(hx + 8, ey + 4, 1, 1, '#8A2A1A');
      R(hx + 1, ey + 3, 2, 1, '#F08A8A'); R(hx + 9, ey + 3, 2, 1, '#F08A8A');
    } else {
      R(hx + 3, ey, 1, 2, EYE); R(hx + 8, ey, 1, 2, EYE);
      if (mood === 'ok') R(hx + 5, ey + 5, 2, 1, '#8A2A1A');
      if (mood === 'worried') {
        R(hx + 5, ey + 4, 2, 2, '#8A2A1A');
        R(hx + 2, ey - 1, 1, 1, EYE); R(hx + 9, ey - 1, 1, 1, EYE);
        if (Math.floor(S.time * 3) % 2) R(hx + 12, ey - 1, 1, 2, '#7AC4F0');
      }
      if (mood === 'sad') {
        R(hx + 4, ey + 5, 4, 1, '#8A2A1A'); R(hx + 3, ey + 6, 1, 1, '#8A2A1A'); R(hx + 8, ey + 6, 1, 1, '#8A2A1A');
        R(hx + 2, ey - 2, 2, 1, EYE); R(hx + 8, ey - 2, 2, 1, EYE);
      }
    }
    if (ch.glasses) {
      ['#5A3A2A'].forEach(function (fc) {
        R(hx + 1, ey - 1, 4, 1, fc); R(hx + 1, ey + 2, 4, 1, fc); R(hx + 1, ey - 1, 1, 4, fc); R(hx + 4, ey - 1, 1, 4, fc);
        R(hx + 7, ey - 1, 4, 1, fc); R(hx + 7, ey + 2, 4, 1, fc); R(hx + 7, ey - 1, 1, 4, fc); R(hx + 10, ey - 1, 1, 4, fc);
        R(hx + 5, ey, 2, 1, fc);
      });
    }
    if (ch.beard) { R(hx + 2, hy + 9, 8, 3, '#F2F2F2'); R(hx + 3, hy + 12, 6, 2, '#F2F2F2'); R(hx + 4, ey + 4, 4, 1, '#F2F2F2'); }
  }

  function drawCounter() {
    R(0, COUNTER_Y, LW, 1, P.woodTop);
    R(0, COUNTER_Y + 1, LW, 6, P.woodLt);
    R(0, COUNTER_Y + 1, LW, 1, P.woodTop);
    R(0, COUNTER_Y + 7, LW, 1, P.woodDk);
    R(0, 128, LW, 20, P.wood);
    for (var x = 0; x < LW; x += 20) R(x, 128, 1, 13, P.woodDk);
    R(0, 141, LW, 4, P.woodDk);
    for (x = 0; x < LW; x += 6) { R(x + 3, 141, 1, 1, P.gold); R(x + 2, 142, 3, 1, P.gold); R(x + 3, 143, 1, 1, P.gold); }
    R(0, 145, LW, 3, P.wood);
    R(0, 147, LW, 1, '#4E3020');
  }

  function blob(x, y, type) {
    var ck = CK[type];
    R(x + 1, y, 4, 1, SP.o); R(x, y + 1, 6, 3, SP.o); R(x + 1, y + 4, 4, 1, SP.o);
    R(x + 1, y + 1, 4, 3, ck.fill);
    R(x + 2, y + 1, 2, 1, ck.top);
  }

  function jarX(c) {
    if (c.state === 'wait' || c.state === 'sad') return SLOT_CX[c.slot];
    return Math.round(c.x) + 7;
  }

  function drawJar(c) {
    var showing = c.state === 'wait' || c.state === 'sad' || (c.happy && !c.noLid && (c.state === 'happy' || c.state === 'leave'));
    if (!showing) return;
    var cx = jarX(c) + (c.shake > 0 ? (Math.floor(S.time * 40) % 2 ? 1 : -1) : 0);
    var rise = c.state === 'wait' ? Math.max(0, 6 - c.stateT * 50) : 0;
    var x = cx - 10, y = 98 + rise, w = 20, h = 22 - rise;
    if (c.state === 'sad') g.globalAlpha = clamp(1 - c.stateT * 1.6, 0, 1);
    g.globalAlpha *= 1;
    g.save(); g.globalAlpha = g.globalAlpha * 0.4; R(x, y, w, h, '#DDF2FF'); g.restore();
    c.jar.forEach(function (type, i) {
      var col = i % 3, row = Math.floor(i / 3);
      blob(x + 1 + col * 6, y + h - 6 - row * 5, type);
    });
    R(x, y, 1, h, '#B8DDF0'); R(x + w - 1, y, 1, h, '#8FB8D0'); R(x, y + h - 1, w, 1, '#8FB8D0');
    R(x + 2, y + 3, 1, Math.max(0, h - 7), '#FFFFFF');
    R(x + 1, y - 2, w - 2, 2, '#CDEBFA');
    // lid: set aside on the counter, then snaps on when the order is done
    var t = c.state === 'wait' || c.state === 'sad' ? 0 : clamp(c.lidT / 0.18, 0, 1);
    var lx = lerp(x + w + 2, x - 1, t), ly = lerp(116, y - 6, t) - Math.sin(t * Math.PI) * 8, lw = Math.round(lerp(8, 22, t));
    R(lx, ly, lw, 4, P.redDk);
    R(lx, ly, lw, 3, P.red);
    R(lx + 1, ly, lw - 2, 1, P.redLt);
    if (t > 0.5) { R(lx + lw / 2 - 3, ly - 2, 6, 2, P.redDk); R(lx + lw / 2 - 2, ly - 2, 4, 1, P.red); }
    g.globalAlpha = 1;
    // patience bar on the counter front
    if (c.state === 'wait') {
      var pf = clamp(c.p / c.maxP, 0, 1);
      var bx = SLOT_CX[c.slot] - 11;
      R(bx, 130, 22, 4, P.outline);
      R(bx + 1, 131, 20, 2, '#5A3A26');
      R(bx + 1, 131, Math.round(20 * pf), 2, pf > 0.5 ? P.emeraldLt : (pf > 0.25 ? P.gold : P.flame));
    }
  }

  function drawOrderTag(c) {
    if (c.state !== 'wait') return;
    var cx = SLOT_CX[c.slot], n = c.items.length;
    var w = n === 1 ? 18 : 29, h = 18;
    var x = cx + 1, y = c.ch.small ? 68 : 64;
    var warn = c.p / c.maxP < 0.33 && Math.floor(S.time * 4) % 2;
    R(x, y, w, h, warn ? P.flame : P.outline);
    R(x + 1, y + 1, w - 2, h - 2, P.cream);
    R(x - 1, y + 11, 2, 1, P.outline); R(x - 2, y + 12, 2, 1, P.outline); R(x, y + 11, 1, 2, P.cream);
    c.items.forEach(function (it, i) {
      var ix = x + 3 + i * 13, iy = y + 2;
      g.drawImage(CK[it.type].sprite, ix, iy);
      R(ix, iy + 13, 12, 2, '#D9C7A6');
      R(ix, iy + 13, Math.round(12 * Math.min(1, it.have / it.need)), 2, it.have >= it.need ? P.emeraldLt : P.gold);
    });
  }

  // ---------------------------------------------------------------------------
  // Equipment
  // ---------------------------------------------------------------------------
  function drawTray() {
    R(TRAY.x - 1, TRAY.y - 1, TRAY.w + 2, TRAY.h + 2, '#5A6068');
    R(TRAY.x, TRAY.y, TRAY.w, TRAY.h, P.steelDk);
    R(TRAY.x + 2, TRAY.y + 2, TRAY.w - 4, TRAY.h - 4, P.steel);
    R(TRAY.x + 2, TRAY.y + 2, TRAY.w - 4, 1, P.steelLt);
    TRAY_SLOTS.forEach(function (s) { R(s.x - 6, s.y + 6, 12, 1, '#AEB4BD'); });
  }

  function drawOven() {
    var x = OVEN.x, y = OVEN.y, w = OVEN.w, h = OVEN.h, O = S.oven, i;
    R(x - 1, y - 1, w + 2, h + 2, '#0B0B0E');
    R(x, y, w, h, P.black);
    R(x, y, 2, h, P.steelDk); R(x + w - 2, y, 2, h, P.steelDkr);
    R(x + 2, y + 1, w - 4, 1, P.black3);
    // handle
    R(x + 7, y + 4, w - 14, 4, '#0B0B0E');
    R(x + 8, y + 5, w - 16, 2, P.steelDkr);
    R(x + 8, y + 5, w - 16, 1, P.steel);
    // glass and the warm interior
    var gx = x + 6, gy = y + 11, gw = w - 12, gh = 55;
    R(gx - 1, gy - 1, gw + 2, gh + 2, '#0B0B0E');
    R(gx, gy, gw, gh, '#121216');
    var glow = clamp(0.7 + 0.12 * Math.sin(S.time * 3) + O.flash * 0.4, 0, 1);
    g.globalAlpha = glow;
    for (var r = 0; r < gh; r++) {
      var k = r / gh;
      R(gx, gy + r, gw, 1, k < 0.5 ? mixColor('#1E100A', '#5A2A12', k * 2) : mixColor('#5A2A12', '#B0521C', (k - 0.5) * 2));
    }
    g.globalAlpha = 1;
    for (r = 6; r < gh - 4; r += 8) { R(gx + 1, gy + r, 3, 1, P.steelDkr); R(gx + gw - 4, gy + r, 3, 1, P.steelDkr); }
    fan(gx + 21, gy + 21, O.fan);
    fan(gx + gw - 21, gy + 21, O.fan + 0.6);
    R(gx + 6, gy + 44, gw - 12, 2, P.steelDk);
    var dough = mixColor('#F3DCA8', '#D9952E', O.progress);
    for (i = 0; i < 6; i++) R(gx + 9 + i * 11, gy + 41, 6, 3, dough);
    g.globalAlpha = 0.07;
    line(g, gx + 8, gy + gh - 2, gx + 40, gy + 2, '#FFFFFF', 2);
    line(g, gx + 16, gy + gh - 2, gx + 48, gy + 2, '#FFFFFF', 1);
    g.globalAlpha = 1;
    if (O.flash > 0) { g.globalAlpha = O.flash * 0.45; R(gx, gy, gw, gh, P.goldLt); g.globalAlpha = 1; }
    // control strip: logo and model drawn later at screen resolution
    var cy = y + 70;
    R(x + 2, cy, w - 4, 16, P.black2);
    R(x + 2, cy, w - 4, 1, P.black3);
    dial(x + 58, cy + 8, -2.4 + O.progress * 4.8);
    dial(x + 73, cy + 8, 0.7);
    R(x + 83, cy + 6, 3, 3, '#FF2A2A');
    g.globalAlpha = 0.35; disc(g, x + 84, cy + 7, 3, '#FF5050'); g.globalAlpha = 1;
    R(x + 4, y + h, 6, 2, '#0B0B0E'); R(x + w - 10, y + h, 6, 2, '#0B0B0E');
  }

  function fan(cx, cy, a) {
    ring(g, cx, cy, 10, '#2A1810');
    ring(g, cx, cy, 7, '#2A1810');
    for (var i = 0; i < 4; i++) {
      var aa = a + i * Math.PI / 2;
      line(g, cx, cy, cx + Math.cos(aa) * 6, cy + Math.sin(aa) * 6, '#1A0E08', 1);
    }
    R(cx - 1, cy - 1, 3, 3, '#3A2418');
  }

  function dial(cx, cy, a) {
    disc(g, cx, cy, 5, '#16161B');
    ring(g, cx, cy, 5, P.steelDk);
    line(g, cx, cy, cx + Math.cos(a) * 4, cy + Math.sin(a) * 4, '#FFFFFF', 1);
  }

  function drawMixer() {
    var x = MIXER.x, y = MIXER.y, M = S.mixer;
    var sh = M.turbo > 0 ? (Math.floor(S.time * 30) % 2 ? 1 : -1) : 0;
    R(x + 1, y + 92, 38, 6, P.steelDkr);
    R(x + 2, y + 92, 36, 1, P.steel);
    R(x + 22, y + 22, 13, 71, '#7F8792');
    R(x + 23, y + 22, 11, 71, P.steel);
    R(x + 23, y + 22, 2, 71, P.steelLt);
    R(x + 31, y + 22, 3, 71, P.steelDk);
    for (var i = 0; i < 3; i++) R(x + 27, y + 42 + i * 6, 3, 3, i < M.charge ? P.gold : '#8C939D');
    R(x + 4, y + 70, 20, 3, P.steelDkr);
    // bowl
    for (var r = 0; r < 24; r++) {
      var bw = Math.round(14 + 12 * Math.sqrt(Math.max(0, 1 - Math.pow(r / 24, 2)))), bx = x + 14 - Math.floor(bw / 2) + sh;
      R(bx, y + 50 + r, bw, 1, r === 0 ? P.steelLt : (r < 3 ? P.steel : (r > 18 ? P.steelDkr : P.steelDk)));
      R(bx + 3, y + 50 + r, 2, 1, P.steelLt);
    }
    var dough = [0, 2, 4, 6][M.charge] + (M.turbo > 0 ? 2 : 0);
    if (dough) {
      R(x + 6 + sh, y + 50 - dough, 16, dough + 1, '#E8CF92');
      R(x + 7 + sh, y + 50 - dough, 14, dough, '#F6E3B4');
    }
    R(x + 13 + sh, y + 30, 3, 20, P.steelDk);
    if (M.turbo > 0) {
      var f = Math.floor(S.time * 24) % 2;
      R(x + 10 + sh + f * 4, y + 44, 2, 7, P.steelLt);
    }
    // head
    R(x + 1, y + 8, 38, 23, '#7F8792');
    R(x + 2, y + 9, 36, 21, P.steel);
    R(x + 2, y + 9, 36, 3, P.steelLt);
    R(x + 2, y + 27, 36, 3, P.steelDk);
    R(x + 4, y + 13, 9, 9, P.redDk); R(x + 5, y + 14, 7, 7, '#E00000');
    R(x + 6, y + 16, 5, 1, '#FFFFFF'); R(x + 6, y + 18, 4, 1, '#FFD0D0');
    R(x + 20, y + 12, 12, 9, P.black);
    disc(g, x + 26, y + 16, 2, '#2EB85C');
    // speed lever, swings from LOW (up) to HIGH (down) through the left side
    var a = lerp(LEVER_LOW, LEVER_HIGH, M.lever);
    var px = x + 35, py = y + 20, ex = px + Math.cos(a) * 14, ey = py + Math.sin(a) * 14;
    var ready = M.charge >= 3 && M.turbo <= 0 && S.mode === 'play';
    if (ready && Math.floor(S.time * 4) % 2) { line(g, px, py, ex, ey, P.gold, 4); R(ex - 4, ey - 4, 8, 8, P.gold); }
    line(g, px, py, ex, ey, '#111114', 2);
    R(ex - 3, ey - 3, 6, 6, '#111114');
    R(ex - 2, ey - 2, 3, 1, '#5A5A66');
    R(px - 2, py - 2, 5, 5, P.steelDkr);
    R(px - 1, py - 1, 3, 3, P.steelLt);
    if (ready) {
      var ay = y + 3 + (Math.floor(S.time * 3) % 2) * 2;
      R(x + 21, ay, 5, 1, P.gold); R(x + 22, ay + 1, 3, 1, P.gold); R(x + 23, ay + 2, 1, 1, P.gold);
    }
  }

  function drawBlender() {
    var x = BLENDER.x, y = BLENDER.y, wh = S.blender.whir > 0;
    var sh = wh ? (Math.floor(S.time * 30) % 2 ? 1 : 0) : 0;
    // base
    R(x + 5, y + 40, 26, 22, '#111114');
    R(x + 6, y + 41, 24, 20, P.black);
    R(x + 6, y + 41, 24, 1, P.black3);
    R(x + 12, y + 51, 12, 4, '#8FA39A');
    disc(g, x + 18, y + 46, 2, P.steelDk);
    R(x + 9, y + 57, 4, 2, '#3A3A44'); R(x + 23, y + 57, 4, 2, '#3A3A44');
    // jar
    x += sh;
    g.globalAlpha = 0.38;
    for (var r = 0; r < 32; r++) { var w = Math.round(22 - r * 6 / 31); R(x + 18 - w / 2, y + 7 + r, w, 1, '#DDF2FF'); }
    g.globalAlpha = 1;
    var t = S.time * 20;
    for (var i = 0; i < 9; i++) {
      var px = x + 12 + ((i * 5 + (wh ? Math.floor(t + i) : 0)) % 12), py = y + 31 + (i % 3) * 2 - (wh ? (i % 4) : 0);
      R(px, py, 2, 2, wh ? '#F2B84B' : (i % 2 ? '#F2C94C' : '#D9A92A'));
    }
    R(x + 7, y + 7, 1, 32, '#B8DDF0'); R(x + 28, y + 7, 1, 32, '#8FB8D0');
    R(x + 9, y + 9, 1, 26, '#FFFFFF');
    for (i = 0; i < 5; i++) R(x + 25, y + 12 + i * 5, 2, 1, '#B8DDF0');
    R(x + 2, y + 12, 5, 20, '#111114'); R(x + 4, y + 15, 2, 14, '#5A5A66');
    R(x + 6, y + 2, 24, 6, '#111114'); R(x + 7, y + 3, 22, 4, P.black);
    R(x + 13, y, 10, 3, '#CDEBFA');
  }

  // ---------------------------------------------------------------------------
  // Cookies on the tray, flying and dragged
  // ---------------------------------------------------------------------------
  function drawCookie(type, x, y, alpha) {
    if (alpha < 1) g.globalAlpha = Math.max(0, alpha);
    g.drawImage(CK[type].sprite, Math.round(x - 6), Math.round(y - 6));
    g.globalAlpha = 1;
  }

  function drawTrayCookies() {
    var dragged = null;
    S.tray.forEach(function (ck, i) {
      if (!ck) return;
      if (ck.state === 'drag') { dragged = ck; return; }
      if (ck.state === 'oven' && ck.t < 0) return;
      var lift = S.selected === i ? 2 : 0;
      if (S.selected === i && Math.floor(S.time * 5) % 2) {
        var s = TRAY_SLOTS[i];
        R(s.x - 9, s.y - 9 - lift, 18, 1, P.gold); R(s.x - 9, s.y + 8 - lift, 18, 1, P.gold);
        R(s.x - 9, s.y - 9 - lift, 1, 18, P.gold); R(s.x + 8, s.y - 9 - lift, 1, 18, P.gold);
      }
      if (ck.gold && ck.state === 'oven') { g.globalAlpha = 0.5; disc(g, ck.x, ck.y, 7, P.goldLt); g.globalAlpha = 1; }
      drawCookie(ck.type, ck.x, ck.y - lift, ck.alpha);
    });
    S.flyers.forEach(function (f) {
      var k = f.t / f.dur;
      drawCookie(f.type, lerp(f.x0, f.x1, k), lerp(f.y0, f.y1, k), 1);
    });
    return dragged;
  }

  function drawDragged(ck) {
    if (!ck) return;
    if (S.drag && S.drag.y < DROP_LINE) {
      var col = colAt(S.drag.x), c = S.customers[col];
      if (c && c.state === 'wait') {
        var cx = SLOT_CX[col];
        R(cx - 13, 94, 26, 1, P.gold); R(cx - 13, 121, 26, 1, P.gold);
        R(cx - 13, 94, 1, 28, P.gold); R(cx + 12, 94, 1, 28, P.gold);
      }
    }
    g.globalAlpha = 0.25; R(ck.x - 5, ck.y + 8, 10, 2, '#000000'); g.globalAlpha = 1;
    drawCookie(ck.type, ck.x, ck.y, 1);
  }

  function hintTarget() {
    if (S.hintDone || S.mode !== 'play') return null;
    for (var i = 0; i < 3; i++) {
      var c = S.customers[i];
      if (!c || c.state !== 'wait') continue;
      for (var s = 0; s < 8; s++) {
        var ck = S.tray[s];
        if (ck && ck.state === 'idle' && findItem(c, ck.type)) return { from: TRAY_SLOTS[s], to: { x: SLOT_CX[i], y: 104 }, type: ck.type };
      }
    }
    return null;
  }

  function drawHint() {
    var h = hintTarget();
    if (!h) return;
    var k = clamp(((S.time % 1.7) - 0.25) / 1.0, 0, 1);
    var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    var x = lerp(h.from.x, h.to.x, e), y = lerp(h.from.y, h.to.y, e);
    if (k > 0 && k < 1) drawCookie(h.type, x, y - DRAG_LIFT, 0.85);
    g.drawImage(HAND, Math.round(x - 3), Math.round(y));
  }

  function drawParticles() {
    S.parts.forEach(function (p) {
      g.globalAlpha = clamp(1 - p.t / p.dur, 0, 1);
      R(p.x, p.y, 1, 1, p.c);
    });
    g.globalAlpha = 1;
    S.sparks.forEach(function (s) {
      var k = Math.min(1, s.t / s.dur);
      var x = lerp(s.x0, s.x1, k), y = lerp(s.y0, s.y1, k) - Math.sin(k * Math.PI) * 26;
      g.globalAlpha = 0.45; disc(g, x, y, 3, P.flame); g.globalAlpha = 1;
      R(x - 1, y - 1, 2, 2, P.flameCore);
    });
  }

  // ---------------------------------------------------------------------------
  // Screen-resolution layer: text, logo, bubbles
  // ---------------------------------------------------------------------------
  function font(size, weight) { return (weight || 700) + ' ' + Math.max(8, Math.round(size * K())) + 'px "Pixelify Sans", "Courier New", monospace'; }
  function text(str, x, y, size, color, opt) {
    opt = opt || {};
    var k = K();
    ctx.font = font(size, opt.weight);
    ctx.textAlign = opt.align || 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = opt.alpha == null ? 1 : opt.alpha;
    if (opt.outline) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(2, size * k * 0.28);
      ctx.strokeStyle = opt.outline;
      ctx.strokeText(str, x * k, y * k);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x * k, y * k);
    ctx.globalAlpha = 1;
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }

  function speech(str, cx, tipY, maxW) {
    var k = K(), size = 5.2;
    ctx.font = font(size, 600);
    var words = str.split(' '), lines = [], cur = '';
    words.forEach(function (w) {
      var test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxW * k && cur) { lines.push(cur); cur = w; } else cur = test;
    });
    lines.push(cur);
    var lh = size * 1.18 * k, padX = 3 * k, padY = 2 * k;
    var tw = 0;
    lines.forEach(function (l) { tw = Math.max(tw, ctx.measureText(l).width); });
    var bw = tw + padX * 2, bh = lines.length * lh + padY * 2;
    var bx = clamp(cx * k - bw / 2, 2 * k, canvas.width - bw - 2 * k);
    var by = tipY * k - bh - 3 * k;
    ctx.lineWidth = Math.max(1.5, 0.75 * k);
    ctx.strokeStyle = P.ink;
    ctx.fillStyle = P.cream;
    roundRect(ctx, bx, by, bw, bh, 2 * k);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx * k - 2.5 * k, by + bh - ctx.lineWidth);
    ctx.lineTo(cx * k, tipY * k);
    ctx.lineTo(cx * k + 2.5 * k, by + bh - ctx.lineWidth);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx * k - 2.5 * k, by + bh); ctx.lineTo(cx * k, tipY * k); ctx.lineTo(cx * k + 2.5 * k, by + bh);
    ctx.stroke();
    ctx.fillStyle = P.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    lines.forEach(function (l, i) { ctx.fillText(l, bx + bw / 2, by + padY + i * lh + 0.1 * k); });
  }

  function drawScreenLayer() {
    var k = K();
    // logo plate in the top bar
    ctx.fillStyle = P.cream;
    roundRect(ctx, 3 * k, 2.5 * k, 41 * k, 10 * k, 2 * k);
    ctx.fill();
    if (logoImg.complete && logoImg.naturalWidth) ctx.drawImage(logoImg, 6 * k, 3.6 * k, 30.5 * k, 7.9 * k);
    // oven control panel: white logo and model, like the real E-1AG
    if (logoWhite) ctx.drawImage(logoWhite, (OVEN.x + 5) * k, (OVEN.y + 74.5) * k, 27 * k, 7 * k);
    text('E-1AG', OVEN.x + 42, OVEN.y + 78.3, 4.2, '#D8DCE2', { weight: 600 });

    if (S.mode !== 'title') {
      var remaining = Math.max(0, CONFIG.roundSeconds - (S.t || 0));
      var sec = Math.ceil(remaining);
      var tStr = '0:' + (sec < 10 ? '0' : '') + sec;
      var urgent = remaining <= CONFIG.malamRayaSeconds && S.mode === 'play';
      var pulse = urgent ? 1 + 0.08 * Math.sin(S.time * 12) : 1;
      text(tStr, 90, 8, 9 * pulse, urgent ? P.gold : P.cream, { outline: P.emeraldDk });
      text(fmt(S.score), 151, 8, 8, P.cream, { align: 'right' });
      ctx.font = font(8);
      var sw = ctx.measureText(fmt(S.score)).width / k;
      text('SKOR', 149 - sw, 8.6, 4.3, P.gold, { align: 'right' });
      if (S.combo >= 1 && S.mode === 'play') {
        var mult = 1 + 0.5 * Math.min(S.combo, 4);
        text('COMBO x' + mult, 175, 26, 5, P.gold, { align: 'right', outline: P.ink });
      }
    }

    // speech bubbles
    if (S.mode !== 'title') {
      S.customers.forEach(function (c) {
        if (!c || c.sayT <= 0) return;
        var a = clamp(c.sayT * 3, 0, 1);
        ctx.globalAlpha = a;
        speech(c.say, Math.round(c.x), (c.ch.small ? 66 : 62), 60);
        ctx.globalAlpha = 1;
      });
    }

    // popups
    S.pops.forEach(function (p) {
      var kk = p.t / p.dur;
      text(p.text, p.x, p.y - kk * 10, p.size, p.color, { outline: P.ink, alpha: clamp(1.4 - kk * 1.4, 0, 1) });
    });

    if (S.mode === 'play') {
      if (S.mixer.charge >= 3 && S.mixer.turbo <= 0) {
        text('TARIK!', 158, 194 + (Math.floor(S.time * 3) % 2), 6.5, P.gold, { outline: P.ink });
      }
      if (hintTarget()) text('Seret kuih ke balang!', 90, 143.5, 5.6, P.cream, { outline: P.ink });
      else if (S.newCookie && S.newCookie.t < 2.4) {
        var nc = CK[S.newCookie.id];
        var al = clamp((2.4 - S.newCookie.t) * 2, 0, 1);
        text('Kuih baru: ' + nc.title + '!', 90, 143.5, 5.4, P.gold, { outline: P.ink, alpha: al });
      }
    }

    if (S.banner) {
      var b = S.banner, t = b.t / b.dur;
      var sc = t < 0.12 ? lerp(1.6, 1, t / 0.12) : 1;
      var al2 = t > 0.8 ? (1 - t) / 0.2 : 1;
      text(b.text, 90, 138, 13 * sc, P.gold, { outline: P.ink, alpha: al2 });
      if (b.sub) text(b.sub, 90, 150, 6.5, P.cream, { outline: P.ink, alpha: al2 });
    }
  }

  // ---------------------------------------------------------------------------
  // Frame
  // ---------------------------------------------------------------------------
  function render() {
    g.imageSmoothingEnabled = false;
    drawRoom();
    if (S.mode !== 'title') {
      S.customers.forEach(function (c) { if (c) drawCustomer(c); });
    }
    drawCounter();
    if (S.mode !== 'title') {
      S.customers.forEach(function (c) { if (c) drawJar(c); });
      S.customers.forEach(function (c) { if (c) drawOrderTag(c); });
    }
    drawTray();
    drawOven();
    drawMixer();
    drawBlender();
    var dragged = drawTrayCookies();
    drawParticles();
    drawHint();
    drawDragged(dragged);
    if (S.malam) { g.globalAlpha = 0.08; R(0, 22, LW, 298, '#1B1F3B'); g.globalAlpha = 1; }

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(scene, 0, 0, canvas.width, canvas.height);
    drawScreenLayer();
  }

  var DEBUG = { speed: 1 };
  var last = 0;
  function frame(ts) {
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
    last = ts;
    update(dt * DEBUG.speed);
    render();
    window.requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------------------
  // Share card
  // ---------------------------------------------------------------------------
  function makeShareCard() {
    var r = S.result || { score: 0, stars: 0, lit: 0, title: '' };
    var W = 1080, H = 1350;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d');
    x.fillStyle = P.emeraldDk; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(242,184,75,0.12)'; x.lineWidth = 4;
    for (var d = -H; d < W + H; d += 54) {
      x.beginPath(); x.moveTo(d, 0); x.lineTo(d + H, H); x.stroke();
      x.beginPath(); x.moveTo(d, H); x.lineTo(d + H, 0); x.stroke();
    }
    x.fillStyle = P.cream; roundRect(x, 330, 56, 420, 124, 26); x.fill();
    if (logoImg.complete && logoImg.naturalWidth) x.drawImage(logoImg, 380, 74, 320, 83);
    var sc = document.createElement('canvas'); sc.width = 160; sc.height = 100;
    var sg = sc.getContext('2d');
    drawWindowScene(sg, 0, 0, 160, 100, {
      night: true, lit: r.lit, houseGlow: r.lit >= CONFIG.pelitaCount, time: 1.3,
      fireworks: [{ x: 30, y: 22, t: 0.45, dur: 1.1, n: 16, c: '#F2B84B' }, { x: 82, y: 16, t: 0.5, dur: 1.1, n: 14, c: '#FF7AA8' }, { x: 120, y: 30, t: 0.4, dur: 1.1, n: 14, c: '#7AD7FF' }]
    });
    x.fillStyle = P.gold; x.fillRect(48, 214, 984, 624);
    x.fillStyle = P.emerald; x.fillRect(56, 222, 968, 608);
    x.imageSmoothingEnabled = false;
    x.drawImage(sc, 60, 226, 960, 600);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = P.gold; x.font = '700 70px "Pixelify Sans", monospace';
    x.fillText(r.title, W / 2, 912);
    for (var i = 0; i < 3; i++) x.drawImage(i < r.stars ? STAR_ON : STAR_OFF, W / 2 - 170 + i * 120, 966, 100, 100);
    x.fillStyle = P.cream; x.font = '700 150px "Pixelify Sans", monospace';
    x.fillText(fmt(r.score), W / 2, 1150);
    x.font = '600 44px "Pixelify Sans", monospace'; x.fillStyle = P.goldLt;
    x.fillText('mata · ' + r.lit + '/' + CONFIG.pelitaCount + ' pelita menyala', W / 2, 1232);
    x.fillStyle = P.cream; x.font = '700 52px "Pixelify Sans", monospace';
    x.fillText('Boleh lawan skor aku?', W / 2, 1300);
    return c;
  }

  function challengeUrl() {
    var u = window.location.href.split('#')[0];
    return u + '#cabar-' + Math.round((S.result && S.result.score) || 0);
  }

  // ---------------------------------------------------------------------------
  // DOM wiring
  // ---------------------------------------------------------------------------
  function $(id) { return document.getElementById(id); }
  var STAR_ON_URL = STAR_ON.toDataURL(), STAR_OFF_URL = STAR_OFF.toDataURL();

  var icons = { cookie: CK.tart.sprite.toDataURL(), lever: LEVER_ICON.toDataURL(), pelita: PELITA_ICON.toDataURL() };
  Array.prototype.forEach.call(document.querySelectorAll('.howto-ico'), function (el) {
    el.style.backgroundImage = 'url(' + icons[el.getAttribute('data-ico')] + ')';
  });

  function refreshTitle() {
    $('best-line').textContent = S.best ? 'Rekod anda: ' + fmt(S.best) + ' mata' : '';
    if (S.challenge) {
      $('challenge-line').hidden = false;
      $('challenge-line').textContent = 'Kawan anda dapat ' + fmt(S.challenge) + ' mata. Boleh lawan?';
    }
  }
  refreshTitle();

  $('play-btn').addEventListener('click', function () {
    $('title-screen').hidden = true;
    startRound();
  });
  $('replay-btn').addEventListener('click', function () {
    $('end-screen').hidden = true;
    startRound();
  });
  $('product-card').addEventListener('click', function () {
    track('ShopeeClick', { product: S.featured || 'E-1AG', score: S.result ? S.result.score : 0 });
  });

  var shareFile = null;
  $('share-btn').addEventListener('click', function () {
    var card = makeShareCard();
    $('share-img').src = card.toDataURL('image/png');
    $('share-status').textContent = '';
    $('end-screen').hidden = true;
    $('share-screen').hidden = false;
    shareFile = null;
    var nb = $('native-share-btn');
    nb.hidden = true;
    if (card.toBlob && navigator.canShare) {
      card.toBlob(function (blob) {
        if (!blob) return;
        try {
          var f = new File([blob], 'kejar-tempahan-raya.png', { type: 'image/png' });
          if (navigator.canShare({ files: [f] })) { shareFile = f; nb.hidden = false; }
        } catch (e) { /* sharing files not supported */ }
      }, 'image/png');
    }
    track('ShareOpen', { score: S.result ? S.result.score : 0 });
  });
  $('native-share-btn').addEventListener('click', function () {
    if (!shareFile) return;
    navigator.share({ files: [shareFile], title: 'Kejar Tempahan Raya', text: 'Boleh lawan skor aku? ' + challengeUrl() })
      .then(function () { track('ShareComplete', { method: 'native' }); $('share-status').textContent = 'Dikongsi. Terima kasih!'; })
      .catch(function () { /* user cancelled */ });
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
  $('close-share-btn').addEventListener('click', function () {
    $('share-screen').hidden = true;
    $('end-screen').hidden = false;
  });

  var soundBtn = $('sound-btn');
  function syncSoundBtn() {
    soundBtn.setAttribute('aria-pressed', Sound.muted ? 'true' : 'false');
    soundBtn.setAttribute('aria-label', Sound.muted ? 'Hidupkan bunyi' : 'Matikan bunyi');
  }
  soundBtn.addEventListener('click', function () { Sound.init(); Sound.setMuted(!Sound.muted); syncSoundBtn(); });
  syncSoundBtn();

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) Sound.suspend(); else Sound.resume();
    last = 0;
  });
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', layout);

  // Test hook for automated checks; harmless in production.
  window.__raya = { debug: DEBUG, state: S, update: update, startRound: startRound, tryDeliver: tryDeliver, activateTurbo: activateTurbo, slots: TRAY_SLOTS };

  layout();
  track('GameView', {});
  window.requestAnimationFrame(frame);
})();

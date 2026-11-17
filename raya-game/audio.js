/* Isi Balang Raya Opah: music and sound effects.
 *
 * Two original tracks are composed here and rendered once, offline, into
 * looping buffers when the page loads:
 *   'lofi'  "Lofi Malam Raya"   76 BPM, suling melody, electric piano, vinyl
 *   'zapin' "Zapin Dapur Opah" 112 BPM, gambus, accordion, marwas drums
 * No recorded or licensed music is used. To use a licensed track instead,
 * set RayaAudio.trackUrls before the page loads (see README).
 */
(function () {
  'use strict';

  var SR = 32000;
  var NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(name) {
    var m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    return 12 * (parseInt(m[3], 10) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  // "A4:0.5 r:1 D5:1" -> [{ beat, len, midi }]
  function phrase(str, startBeat) {
    var out = [], b = startBeat || 0;
    str.trim().split(/\s+/).forEach(function (tok) {
      var p = tok.split(':'), len = parseFloat(p[1]);
      if (p[0] !== 'r') out.push({ beat: b, len: len, midi: midi(p[0]) });
      b += len;
    });
    return out;
  }

  // ---------------------------------------------------------------------------
  // Offline instruments
  // ---------------------------------------------------------------------------
  function Band(oc, bus, verb) {
    this.oc = oc; this.bus = bus; this.verb = verb;
    this.ks = {};
    var n = SR * 2, nb = oc.createBuffer(1, n, SR), d = nb.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
  }
  Band.prototype.out = function (node, wet) {
    node.connect(this.bus);
    if (wet) { var g = this.oc.createGain(); g.gain.value = wet; node.connect(g); g.connect(this.verb); }
  };
  Band.prototype.env = function (t, a, peak, hold, rel) {
    var g = this.oc.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
    return g;
  };
  Band.prototype.noise = function (t, dur, vol, type, freq, q, wet) {
    var oc = this.oc, s = oc.createBufferSource();
    s.buffer = this.noiseBuf;
    var f = oc.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || 0.7;
    var g = oc.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); this.out(g, wet);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.02);
  };
  Band.prototype.drop = function (t, f0, f1, dur, vol, type, wet) {
    var oc = this.oc, o = oc.createOscillator(), g = oc.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); this.out(g, wet);
    o.start(t); o.stop(t + dur + 0.02);
  };
  // Karplus-Strong plucked string, used for the gambus.
  Band.prototype.ksBuffer = function (freq, bright) {
    var N = Math.max(2, Math.floor(SR / freq)), key = N + '|' + bright;
    if (this.ks[key]) return this.ks[key];
    var len = Math.floor(SR * 1.6), buf = this.oc.createBuffer(1, len, SR), d = buf.getChannelData(0);
    var ring = new Float32Array(N), prev = 0, i;
    for (i = 0; i < N; i++) { prev += bright * ((Math.random() * 2 - 1) - prev); ring[i] = prev; }
    var idx = 0, decay = 0.9965;
    for (i = 0; i < len; i++) {
      var cur = ring[idx], nxt = ring[(idx + 1) % N];
      ring[idx] = decay * 0.5 * (cur + nxt);
      d[i] = cur;
      idx = (idx + 1) % N;
    }
    for (i = len - 2000; i < len; i++) d[i] *= (len - i) / 2000;
    this.ks[key] = { buf: buf, base: SR / N };
    return this.ks[key];
  };
  Band.prototype.gambus = function (t, m, vol, wet) {
    var oc = this.oc, f = hz(m), self = this;
    var body = oc.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 900; body.Q.value = 1.2; body.gain.value = 5;
    var g = oc.createGain(); g.gain.value = vol;
    body.connect(g); this.out(g, wet);
    [0, 0.012].forEach(function (off, i) {
      var k = self.ksBuffer(f * (i ? 1.004 : 1), 0.55);
      var s = oc.createBufferSource();
      s.buffer = k.buf;
      s.playbackRate.value = f * (i ? 1.004 : 1) / k.base;
      var sg = oc.createGain(); sg.gain.value = i ? 0.55 : 0.8;
      s.connect(sg); sg.connect(body);
      s.start(t + off); s.stop(t + off + 1.5);
    });
  };
  Band.prototype.accordion = function (t, notes, dur, vol, wet) {
    var oc = this.oc, self = this;
    var lp = oc.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700; lp.Q.value = 1.1;
    var e = this.env(t, 0.035, vol, Math.max(0.01, dur - 0.08), 0.12);
    lp.connect(e); this.out(e, wet);
    var lfo = oc.createOscillator(); lfo.frequency.value = 5.6;
    var depth = oc.createGain(); depth.gain.value = 6;
    lfo.connect(depth); lfo.start(t); lfo.stop(t + dur + 0.2);
    notes.forEach(function (m) {
      [-7, 7].forEach(function (cents) {
        var o = oc.createOscillator(); o.type = 'sawtooth';
        o.frequency.value = hz(m); o.detune.value = cents;
        depth.connect(o.detune);
        var g = oc.createGain(); g.gain.value = 0.22 / notes.length;
        o.connect(g); g.connect(lp);
        o.start(t); o.stop(t + dur + 0.2);
      });
    });
    void self;
  };
  Band.prototype.ep = function (t, notes, dur, vol, wet) {
    var oc = this.oc, self = this;
    var lp = oc.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1900;
    var trem = oc.createGain(); trem.gain.value = 1;
    var lfo = oc.createOscillator(); lfo.frequency.value = 4.2;
    var ld = oc.createGain(); ld.gain.value = 0.12;
    lfo.connect(ld); ld.connect(trem.gain); lfo.start(t); lfo.stop(t + dur + 1.6);
    lp.connect(trem); this.out(trem, wet);
    notes.forEach(function (m, i) {
      var e = self.env(t + i * 0.012, 0.008, vol / notes.length, 0.05, dur + 1.2);
      e.connect(lp);
      [[1, 'sine', 1], [2, 'sine', 0.22], [3, 'triangle', 0.06]].forEach(function (h) {
        var o = oc.createOscillator(); o.type = h[1]; o.frequency.value = hz(m) * h[0];
        var g = oc.createGain(); g.gain.value = h[2];
        o.connect(g); g.connect(e);
        o.start(t); o.stop(t + dur + 1.6);
      });
    });
  };
  Band.prototype.suling = function (t, m, dur, vol, wet) {
    var oc = this.oc, f = hz(m);
    var o = oc.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f * 0.985, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
    var lfo = oc.createOscillator(); lfo.frequency.value = 5.2;
    var vd = oc.createGain();
    vd.gain.setValueAtTime(0, t); vd.gain.linearRampToValueAtTime(f * 0.009, t + Math.min(0.35, dur));
    lfo.connect(vd); vd.connect(o.frequency);
    var e = this.env(t, 0.07, vol, Math.max(0.02, dur - 0.1), 0.22);
    var o2 = oc.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f * 2;
    var g2 = oc.createGain(); g2.gain.value = 0.08;
    o.connect(e); o2.connect(g2); g2.connect(e);
    this.out(e, wet);
    this.noise(t, dur * 0.9, vol * 0.08, 'bandpass', f * 2, 6, wet);
    [o, o2, lfo].forEach(function (x) { x.start(t); x.stop(t + dur + 0.3); });
  };
  Band.prototype.bass = function (t, m, dur, vol) {
    var oc = this.oc;
    var lp = oc.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    var e = this.env(t, 0.01, vol, dur * 0.6, dur * 0.5);
    lp.connect(e); this.out(e, 0);
    [['sine', 1], ['triangle', 0.35]].forEach(function (h) {
      var o = oc.createOscillator(); o.type = h[0]; o.frequency.value = hz(m);
      var g = oc.createGain(); g.gain.value = h[1];
      o.connect(g); g.connect(lp); o.start(t); o.stop(t + dur * 1.2);
    });
  };
  Band.prototype.kick = function (t, vol) { this.drop(t, 130, 45, 0.32, vol); };
  Band.prototype.snare = function (t, vol) {
    this.noise(t, 0.17, vol, 'bandpass', 1800, 0.8, 0.15);
    this.drop(t, 200, 160, 0.08, vol * 0.4, 'triangle');
  };
  Band.prototype.hat = function (t, vol) { this.noise(t, 0.035, vol, 'highpass', 7000, 0.7); };
  Band.prototype.dum = function (t, vol) {
    this.drop(t, 105, 70, 0.26, vol, 'sine', 0.1);
    this.noise(t, 0.05, vol * 0.3, 'lowpass', 600, 0.7);
  };
  Band.prototype.tak = function (t, vol) {
    this.noise(t, 0.06, vol, 'bandpass', 2400, 1.5, 0.12);
    this.drop(t, 560, 480, 0.045, vol * 0.35, 'triangle');
  };
  Band.prototype.jingle = function (t, vol) { this.noise(t, 0.13, vol, 'highpass', 5600, 0.9, 0.1); };
  Band.prototype.crackle = function (len, vol) {
    var oc = this.oc, n = Math.floor(len * SR), b = oc.createBuffer(1, n, SR), d = b.getChannelData(0), last = 0;
    for (var i = 0; i < n; i++) {
      last = last * 0.97 + (Math.random() * 2 - 1) * 0.03;
      d[i] = last * 0.25;
      if (Math.random() < 0.00045) d[i] += (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.7);
    }
    var s = oc.createBufferSource(); s.buffer = b;
    var g = oc.createGain(); g.gain.value = vol;
    var hp = oc.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    s.connect(hp); hp.connect(g); g.connect(this.bus);
    s.start(0);
  };

  function makeIR(oc, secs) {
    var n = Math.floor(SR * secs), b = oc.createBuffer(1, n, SR), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    return b;
  }
  function startRendering(oc) {
    return new Promise(function (res, rej) {
      oc.oncomplete = function (e) { res(e.renderedBuffer); };
      try {
        var p = oc.startRendering();
        if (p && p.then) p.then(res, rej);
      } catch (err) { rej(err); }
    });
  }

  // Renders bars of music plus a reverb tail, then folds the tail back onto
  // the start so the loop is seamless.
  function renderSong(bpm, bars, cutoff, compose) {
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return Promise.reject(new Error('no offline audio'));
    var beat = 60 / bpm, len = bars * 4 * beat, tail = 2.5;
    var frames = Math.ceil(len * SR), total = Math.ceil((len + tail) * SR);
    var oc = new OAC(1, total, SR);
    var warm = oc.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = cutoff;
    var master = oc.createGain(); master.gain.value = 0.85;
    var bus = oc.createGain();
    bus.connect(warm); warm.connect(master); master.connect(oc.destination);
    var verb = oc.createConvolver(); verb.buffer = makeIR(oc, 2.2);
    var vg = oc.createGain(); vg.gain.value = 0.32;
    verb.connect(vg); vg.connect(warm);
    var band = new Band(oc, bus, verb);
    compose(band, beat, len);
    return startRendering(oc).then(function (buf) {
      var d = buf.getChannelData(0);
      var out = oc.createBuffer(1, frames, SR), o = out.getChannelData(0);
      o.set(d.subarray(0, frames));
      for (var i = 0; i < total - frames; i++) o[i] += d[frames + i];
      var peak = 0;
      for (i = 0; i < frames; i++) peak = Math.max(peak, Math.abs(o[i]));
      if (peak > 0.95) for (i = 0; i < frames; i++) o[i] *= 0.95 / peak;
      return out;
    });
  }

  // ---------------------------------------------------------------------------
  // "Lofi Malam Raya": original, D minor, 8 bars
  // ---------------------------------------------------------------------------
  function composeLofi(b, beat, len) {
    var chords = [
      [50, [65, 69, 72, 76]], [43, [58, 62, 65, 69]], [48, [58, 62, 64, 67]], [41, [57, 60, 64, 69]],
      [46, [57, 62, 65, 69]], [43, [58, 62, 65, 70]], [45, [55, 61, 64, 67]], [50, [57, 62, 65, 69]]
    ];
    var swing = beat * 0.09;
    chords.forEach(function (c, bar) {
      var t0 = bar * 4 * beat;
      b.ep(t0, c[1], beat * 2.2, 0.34, 0.35);
      b.ep(t0 + 2.5 * beat + swing, c[1].slice(1), beat * 1.2, 0.2, 0.35);
      b.bass(t0, c[0], beat * 2.4, 0.42);
      b.bass(t0 + 2.5 * beat + swing, c[0] + 7, beat * 1.2, 0.3);
      b.kick(t0, 0.55); b.kick(t0 + 1.75 * beat + swing, 0.35); b.kick(t0 + 2.5 * beat + swing, 0.45);
      b.snare(t0 + beat, 0.2); b.snare(t0 + 3 * beat, 0.2);
      for (var h = 0; h < 8; h++) b.hat(t0 + h * beat / 2 + (h % 2 ? swing : 0), h % 2 ? 0.05 : 0.08);
      if (bar % 2 === 1) [0, 1, 2].forEach(function (k) { b.gambus(t0 + (3.25 + k * 0.25) * beat, c[1][k] + 12, 0.16, 0.4); });
    });
    var mel = 'r:1 A4:1.5 G4:0.5 F4:1 G4:2 F4:0.5 D4:1.5 E4:1 G4:1 Bb4:1.5 A4:0.5 A4:3 r:1 ' +
      'r:0.5 D5:1 C5:0.5 A4:1 F4:1 G4:1.5 A4:0.5 Bb4:1 D5:1 C#5:1.5 E5:0.5 D5:1 C#5:1 D5:3 r:1';
    phrase(mel).forEach(function (n) { b.suling(n.beat * beat, n.midi, n.len * beat * 0.95, 0.2, 0.45); });
    b.crackle(len + 2.5, 0.5);
  }

  // ---------------------------------------------------------------------------
  // "Zapin Dapur Opah": original, D harmonic minor, 16 bars
  // ---------------------------------------------------------------------------
  function composeZapin(b, beat, len) {
    var C = { Dm: [50, [62, 65, 69]], Gm: [43, [62, 67, 70]], A7: [45, [61, 64, 67]], Bb: [46, [62, 65, 70]] };
    var prog = ['Dm', 'Dm', 'Gm', 'Gm', 'A7', 'A7', 'Dm', 'Dm', 'Bb', 'Gm', 'A7', 'Dm', 'Bb', 'Gm', 'A7', 'Dm'];
    var marwas = { 0: 'D', 3: 'T', 5: 'T', 6: 'D', 9: 'T', 11: 'T', 12: 'D', 14: 'T', 15: 'T' };
    var sx = beat / 4;
    prog.forEach(function (name, bar) {
      var c = C[name], t0 = bar * 4 * beat, B = bar >= 8;
      // accordion: stabs in the A section, longer chords in the B section
      if (!B) { [0, 1.5, 3].forEach(function (p) { b.accordion(t0 + p * beat, c[1], beat * 0.9, 0.3, 0.25); }); }
      else { b.accordion(t0, c[1], beat * 1.9, 0.26, 0.3); b.accordion(t0 + 2 * beat, c[1], beat * 1.9, 0.24, 0.3); }
      b.bass(t0, c[0], beat * 1.3, 0.5);
      b.bass(t0 + 1.5 * beat, c[0], beat * 0.6, 0.35);
      b.bass(t0 + 3 * beat, c[0] + 7, beat * 0.9, 0.4);
      for (var st = 0; st < 16; st++) {
        var k = marwas[st], t = t0 + st * sx + (st % 2 ? sx * 0.12 : 0);
        if (k === 'D') b.dum(t, 0.55);
        if (k === 'T') b.tak(t, st === 3 || st === 9 ? 0.32 : 0.22);
      }
      if (bar % 2 === 1) b.jingle(t0 + 2 * beat, 0.12);
    });
    var A = 'A4:0.5 D5:0.5 E5:0.25 F5:0.25 E5:0.5 D5:1 r:1 C#5:0.5 D5:0.5 E5:0.5 F5:0.5 G5:0.5 F5:0.5 E5:1 ' +
      'D5:0.5 G5:0.5 F5:0.25 E5:0.25 D5:0.5 Bb4:1 r:1 A4:0.5 Bb4:0.5 C5:0.5 D5:0.5 Bb4:0.5 A4:0.5 G4:1 ' +
      'E5:0.5 C#5:0.5 E5:0.5 G5:0.5 F5:0.25 E5:0.25 D5:0.5 C#5:1 Bb4:0.5 C#5:0.5 E5:1 D5:0.5 C#5:0.5 A4:1 ' +
      'F5:0.5 E5:0.5 D5:0.5 C#5:0.5 D5:0.5 E5:0.5 F5:0.5 A5:0.5 G5:0.25 F5:0.25 E5:0.5 D5:2 r:1';
    var Bm = 'F5:1 D5:0.5 F5:0.5 Bb5:1 A5:0.5 G5:0.5 F5:0.5 G5:0.5 D5:1 Bb4:0.5 D5:0.5 G5:1 ' +
      'A5:0.5 G5:0.5 F5:0.5 E5:0.5 C#5:1 E5:1 D5:1.5 A4:0.5 D5:0.5 F5:0.5 A5:1 ' +
      'Bb5:0.5 A5:0.5 G5:0.5 F5:0.5 D5:1 F5:1 G5:0.5 F5:0.5 E5:0.5 D5:0.5 Bb4:1 D5:1 ' +
      'C#5:0.5 D5:0.5 E5:0.5 G5:0.5 F5:0.5 E5:0.5 C#5:0.5 E5:0.5 D5:2 r:2';
    phrase(A, 0).concat(phrase(Bm, 32)).forEach(function (n) {
      b.gambus(n.beat * beat, n.midi, 0.42, 0.22);
      if (n.len >= 1) b.gambus(n.beat * beat + beat * 0.5, n.midi, 0.22, 0.22);
    });
    b.crackle(len + 2.5, 0.25);
  }

  // ---------------------------------------------------------------------------
  // Live playback and sound effects
  // ---------------------------------------------------------------------------
  var ac = null, master, musicBus, sfxBus;
  var store = function (k, v) { try { if (v === undefined) return localStorage.getItem('opah27:' + k); localStorage.setItem('opah27:' + k, v); } catch (e) { return null; } return null; };
  var muted = store('mute') === '1';
  var buffers = {}, rendering = null, current = null, wanted = null;

  function renderAll() {
    if (rendering) return rendering;
    rendering = renderSong(112, 16, 5200, composeZapin).then(function (z) {
      buffers.zapin = z;
      if (wanted === 'zapin') play('zapin');
      return renderSong(76, 8, 3800, composeLofi);
    }).then(function (l) {
      buffers.lofi = l;
      if (wanted === 'lofi') play('lofi');
    }).catch(function () { /* music is optional */ });
    return rendering;
  }

  function init() {
    if (ac) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ac = new AC(); } catch (e) { return false; }
    master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.6; sfxBus.connect(master);
    return true;
  }
  function resume() { if (ac && ac.state === 'suspended') ac.resume(); }

  function play(name) {
    wanted = name;
    if (!ac || !buffers[name]) return;
    if (current && current.name === name) return;
    var t = ac.currentTime;
    if (current) {
      var old = current;
      old.gain.gain.setTargetAtTime(0.0001, t, 0.25);
      setTimeout(function () { try { old.src.stop(); } catch (e) { /* ignore */ } }, 1500);
    }
    var src = ac.createBufferSource(); src.buffer = buffers[name]; src.loop = true;
    var g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.setTargetAtTime(1, t, 0.3);
    src.connect(g); g.connect(musicBus); src.start(t + 0.02);
    current = { name: name, src: src, gain: g };
  }
  function stopMusic(fade) {
    wanted = null;
    if (!current || !ac) return;
    var old = current; current = null;
    old.gain.gain.setTargetAtTime(0.0001, ac.currentTime, fade || 0.2);
    setTimeout(function () { try { old.src.stop(); } catch (e) { /* ignore */ } }, 1500);
  }

  function tone(f, t, dur, type, vol, f2) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.8);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxBus);
    o.start(t); o.stop(t + dur + 0.03);
  }
  var noiseBuf = null;
  function noise(t, dur, vol, type, freq) {
    if (!noiseBuf) {
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var s = ac.createBufferSource(); s.buffer = noiseBuf;
    var f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    var g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + dur + 0.03);
  }
  function fx(fn) { return function () { if (!ac || muted) return; fn(ac.currentTime); }; }

  window.RayaAudio = {
    init: init, resume: resume, renderAll: renderAll, play: play, stopMusic: stopMusic,
    suspend: function () { if (ac && ac.state === 'running') ac.suspend(); },
    get muted() { return muted; },
    get ready() { return !!(buffers.zapin && buffers.lofi); },
    get playing() { return !!current && !muted; },
    setMuted: function (m) {
      muted = m; store('mute', m ? '1' : '0');
      if (master) master.gain.setTargetAtTime(m ? 0 : 1, ac.currentTime, 0.03);
    },
    pick: fx(function (t) { tone(620, t, 0.07, 'sine', 0.14, 900); }),
    drop: fx(function (t) { tone(520, t, 0.1, 'sine', 0.3, 1040); noise(t, 0.04, 0.05, 'highpass', 3000); }),
    wrong: fx(function (t) { tone(320, t, 0.22, 'triangle', 0.22, 150); }),
    complete: fx(function (t) {
      noise(t, 0.05, 0.25, 'lowpass', 900);
      [1175, 1480, 1760, 2349].forEach(function (f, i) { tone(f, t + 0.06 + i * 0.07, 0.35, 'sine', 0.1); });
    }),
    ding: fx(function (t) { tone(1568, t, 0.9, 'sine', 0.16); tone(2349, t, 0.6, 'sine', 0.06); tone(3136, t, 0.35, 'sine', 0.03); }),
    count: fx(function (t) { tone(110, t, 0.3, 'sine', 0.5, 62); noise(t, 0.05, 0.15, 'bandpass', 2400); }),
    go: fx(function (t) {
      tone(110, t, 0.35, 'sine', 0.55, 60);
      [587, 740, 880].forEach(function (f, i) { tone(f, t + i * 0.06, 0.4, 'triangle', 0.12); });
    }),
    finish: fx(function (t) {
      [587, 740, 880, 1175, 1480].forEach(function (f, i) { tone(f, t + i * 0.1, 0.5, 'triangle', 0.14); });
      tone(294, t + 0.5, 1.2, 'sine', 0.2);
    }),
    timeout: fx(function (t) { tone(440, t, 0.25, 'triangle', 0.2); tone(349, t + 0.25, 0.5, 'triangle', 0.2); }),
    pelita: fx(function (t) { tone(1319, t, 0.35, 'triangle', 0.08); tone(1976, t + 0.06, 0.4, 'triangle', 0.05); }),
    adik: fx(function (t) { [900, 1100, 1350].forEach(function (f, i) { tone(f, t + i * 0.08, 0.08, 'sine', 0.1, f * 1.15); }); }),
    toyOff: fx(function (t) { tone(1100, t, 0.1, 'square', 0.05, 1700); }),
    tick: fx(function (t) { tone(1400, t, 0.03, 'square', 0.04); })
  };
})();

/* Isi Balang Raya Opah: race rules.
 *
 * This file draws nothing. It decides what happens, and it is deterministic:
 * the same challenge seed plus the same inputs always give the same result,
 * in the browser and on the server. The server replays a player's input log
 * with this file to verify a time before it goes on the leaderboard.
 *
 * Times are integer milliseconds from "MULA!". Inputs look like { t, a, s, j }:
 *   a: 'd'  move the cookie in tray slot s into balang j
 *      't'  tap away Adik's toy in tray slot s
 *      'w'  take Adik's wrong kuih out of balang j
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RayaSim = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RULES = {
    balang: 10,          // orders to finish
    slots: 8,            // cookies on the tray
    jars: 3,             // balang on the table at once
    capMs: 90000,        // time limit
    penaltyMs: 1000,     // wrong balang
    flightMs: 350,       // oven to tray
    bakeDelayMs: 400,    // after a slot empties
    bakeGapMs: 800,      // between two bakes
    staleMs: 6000,       // unneeded cookie on a full tray gets put away
    staleRecheckMs: 2000,
    leaveMs: 650,        // customer leaves after the lid closes
    arriveMs: 450,       // next customer walks in
    decoyEvery: 4        // every 4th baked cookie is a random kuih
  };
  var TYPES = ['tart', 'semperit', 'almond', 'cornflakes', 'coklat', 'makmur'];
  var PEOPLE = 6;
  var SHAPES = [[3], [3], [3], [4], [2, 2], [4], [2, 2], [2, 2], [4], [2, 2]];
  var ADIK_AT = [6500, 15000, 24500, 34000, 44000, 55000, 67000, 80000];

  function hash(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  }
  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Everything random about a challenge is fixed here, from the seed.
  function makeChallenge(seed) {
    var r = mulberry(hash(String(seed)));
    function ri(n) { return Math.floor(r() * n); }
    var orders = [], prev = -1;
    SHAPES.forEach(function (shape) {
      var used = [];
      var items = shape.map(function (need, k) {
        var type, guard = 0;
        do { type = ri(TYPES.length); guard++; }
        while (guard < 50 && (used.indexOf(type) >= 0 || (k === 0 && shape.length === 1 && type === prev)));
        used.push(type);
        return { type: type, need: need };
      });
      prev = items[0].type;
      orders.push({ items: items });
    });
    var people = [], decoys = [], i;
    for (i = 0; i < 40; i++) people.push(ri(PEOPLE));
    for (i = 0; i < 40; i++) decoys.push(ri(TYPES.length));
    var adik = ADIK_AT.map(function (at, k) {
      return {
        at: at + ri(1500),
        kind: k % 2 === 0 ? 'toy' : 'wrong',
        target: ri(k % 2 === 0 ? RULES.slots : RULES.jars),
        toy: ri(3),
        offset: ri(TYPES.length)
      };
    });
    return { seed: String(seed), orders: orders, people: people, decoys: decoys, adik: adik };
  }

  // Weekly challenge from the campaign calendar (Malaysia time, UTC+8).
  function challengeFor(nowMs, campaign) {
    var p = String(campaign.start).split('-').map(Number);
    var startMs = Date.UTC(p[0], p[1] - 1, p[2]) - 8 * 3600 * 1000;
    var days = Math.floor((nowMs - startMs) / 86400000);
    var prefix = campaign.prefix || 'raya';
    if (days < 0) return { id: 'latihan', label: 'Cabaran Latihan', seed: prefix + '-latihan', week: 0 };
    var w = Math.floor(days / 7) + 1;
    if (w > campaign.weeks) return { id: 'bebas', label: 'Main Bebas', seed: prefix + '-bebas', week: -1, ended: true };
    return { id: 'minggu-' + w, label: 'Cabaran Minggu ' + w, seed: prefix + '-minggu-' + w, week: w };
  }

  // ---------------------------------------------------------------------------
  function create(seed) {
    var ch = makeChallenge(seed);
    var s = {
      ch: ch, t: 0, phase: 'race', next: 0, completed: 0, mistakes: 0, penaltyMs: 0,
      finishAt: -1, resultMs: -1, tray: [], toys: [], jars: [], queue: [], seq: 0,
      lastBake: -1e9, bakePending: false, decoyCount: 0, decoyIdx: 0, personIdx: 0,
      cookieId: 0, feed: [], inputs: 0
    };
    var i;
    for (i = 0; i < RULES.slots; i++) { s.tray.push(null); s.toys.push(0); }
    for (i = 0; i < RULES.jars; i++) s.jars.push(null);
    for (i = 0; i < RULES.jars; i++) assign(s, i, 0);
    bake(s, 0, true);
    ch.adik.forEach(function (a, k) { push(s, a.at, { type: 'adik', k: k }); });
    return {
      state: s,
      advanceTo: function (T) { advanceTo(s, T); },
      apply: function (inp) { return apply(s, inp); },
      drain: function () { var f = s.feed; s.feed = []; return f; }
    };
  }

  function push(s, at, ev) {
    ev.at = at; ev.seq = s.seq++;
    var q = s.queue, i = q.length;
    while (i > 0 && q[i - 1].at > at) i--;
    q.splice(i, 0, ev);
  }
  function emit(s, kind, data) { data.kind = kind; data.t = s.t; s.feed.push(data); }

  function assign(s, j, readyAt) {
    if (s.next >= s.ch.orders.length) { s.jars[j] = null; return; }
    var o = s.ch.orders[s.next];
    var onScreen = [];
    s.jars.forEach(function (x) { if (x) onScreen.push(x.who); });
    var who = -1;
    for (var g = 0; g < s.ch.people.length; g++) {
      var cand = s.ch.people[(s.personIdx + g) % s.ch.people.length];
      if (onScreen.indexOf(cand) < 0) { who = cand; s.personIdx += g + 1; break; }
    }
    if (who < 0) { for (var p = 0; p < PEOPLE; p++) if (onScreen.indexOf(p) < 0) { who = p; break; } }
    s.jars[j] = {
      order: s.next, who: who, readyAt: readyAt, done: false, doneAt: -1, wrong: -1,
      items: o.items.map(function (it) { return { type: it.type, need: it.need, have: 0 }; })
    };
    s.next++;
    emit(s, 'arrive', { jar: j, order: s.jars[j].order, who: who, readyAt: readyAt });
  }

  function demand(s) {
    var act = [0, 0, 0, 0, 0, 0], up = [0, 0, 0, 0, 0, 0], n;
    s.jars.forEach(function (jar) {
      if (!jar || jar.done) return;
      jar.items.forEach(function (it) { act[it.type] += it.need - it.have; });
    });
    for (n = s.next; n < Math.min(s.next + 2, s.ch.orders.length); n++) {
      s.ch.orders[n].items.forEach(function (it) { up[it.type] += it.need; });
    }
    s.tray.forEach(function (c) {
      if (!c) return;
      if (act[c.type] > 0) act[c.type]--;
      else if (up[c.type] > 0) up[c.type]--;
    });
    return { act: act, up: up };
  }
  function argmax(a) {
    var b = -1, bv = 0;
    for (var i = 0; i < a.length; i++) if (a[i] > bv) { bv = a[i]; b = i; }
    return b;
  }
  function neededNow(s, type) {
    for (var j = 0; j < s.jars.length; j++) {
      var jar = s.jars[j];
      if (!jar || jar.done) continue;
      for (var k = 0; k < jar.items.length; k++) if (jar.items[k].type === type && jar.items[k].have < jar.items[k].need) return true;
    }
    return false;
  }
  function hasEmptySlot(s) {
    for (var i = 0; i < RULES.slots; i++) if (!s.tray[i] && !s.toys[i]) return true;
    return false;
  }

  function bake(s, at, instant) {
    s.bakePending = false; s.lastBake = at;
    var d = demand(s), filled = [];
    for (var i = 0; i < RULES.slots; i++) {
      if (s.tray[i] || s.toys[i]) continue;
      s.decoyCount++;
      var pool = d.act, type = argmax(d.act);
      if (type < 0) { pool = d.up; type = argmax(d.up); }
      if (type < 0 || s.decoyCount % RULES.decoyEvery === 0) {
        type = s.ch.decoys[s.decoyIdx++ % s.ch.decoys.length];
        pool = null;
      }
      if (pool) pool[type]--;
      var ready = instant ? at : at + RULES.flightMs;
      s.tray[i] = { id: ++s.cookieId, type: type, readyAt: ready };
      push(s, ready + RULES.staleMs, { type: 'stale', slot: i, id: s.cookieId });
      filled.push(i);
    }
    if (filled.length) emit(s, 'bake', { slots: filled, instant: !!instant });
  }
  function scheduleBake(s) {
    if (s.bakePending || !hasEmptySlot(s)) return;
    s.bakePending = true;
    push(s, Math.max(s.t + RULES.bakeDelayMs, s.lastBake + RULES.bakeGapMs), { type: 'bake' });
  }

  function checkDone(s, j) {
    var jar = s.jars[j];
    if (!jar || jar.done || jar.wrong >= 0) return;
    for (var k = 0; k < jar.items.length; k++) if (jar.items[k].have < jar.items[k].need) return;
    jar.done = true; jar.doneAt = s.t; s.completed++;
    emit(s, 'complete', { jar: j, order: jar.order, who: jar.who, n: s.completed });
    if (s.completed >= RULES.balang) {
      s.phase = 'done'; s.finishAt = s.t; s.resultMs = s.t + s.penaltyMs;
      emit(s, 'finish', { resultMs: s.resultMs });
      return;
    }
    push(s, s.t + RULES.leaveMs, { type: 'leave', jar: j, order: jar.order });
  }

  function handle(s, e) {
    var jar, n;
    if (e.type === 'bake') {
      bake(s, s.t, false);
    } else if (e.type === 'leave') {
      jar = s.jars[e.jar];
      if (!jar || jar.order !== e.order) return;
      emit(s, 'leave', { jar: e.jar, order: jar.order, who: jar.who });
      s.jars[e.jar] = null;
      assign(s, e.jar, s.t + RULES.arriveMs);
    } else if (e.type === 'stale') {
      var c = s.tray[e.slot];
      if (!c || c.id !== e.id) return;
      if (!s.toys[e.slot] && !hasEmptySlot(s) && !neededNow(s, c.type)) {
        s.tray[e.slot] = null;
        emit(s, 'stale', { slot: e.slot, type: c.type });
        scheduleBake(s);
      } else {
        push(s, s.t + RULES.staleRecheckMs, { type: 'stale', slot: e.slot, id: e.id });
      }
    } else if (e.type === 'adik') {
      var a = s.ch.adik[e.k], done = false;
      if (a.kind === 'toy') {
        for (n = 0; n < RULES.slots && !done; n++) {
          var sl = (a.target + n) % RULES.slots;
          if (!s.toys[sl]) { s.toys[sl] = a.toy + 1; emit(s, 'toy', { slot: sl, toy: a.toy, k: e.k }); done = true; }
        }
      } else {
        for (n = 0; n < RULES.jars && !done; n++) {
          var jj = (a.target + n) % RULES.jars;
          jar = s.jars[jj];
          if (!jar || jar.done || jar.readyAt > s.t || jar.wrong >= 0) continue;
          for (var m = 0; m < TYPES.length; m++) {
            var ty = (a.offset + m) % TYPES.length, inOrder = false;
            for (var q = 0; q < jar.items.length; q++) if (jar.items[q].type === ty) inOrder = true;
            if (!inOrder) { jar.wrong = ty; break; }
          }
          emit(s, 'adikWrong', { jar: jj, type: jar.wrong, k: e.k });
          done = true;
        }
      }
      if (!done) emit(s, 'adikSkip', { k: e.k });
    }
  }

  function advanceTo(s, T) {
    if (s.phase !== 'race') return;
    var lim = Math.min(T, RULES.capMs);
    while (s.queue.length && s.queue[0].at <= lim) {
      var e = s.queue.shift();
      if (e.at > s.t) s.t = e.at;
      handle(s, e);
      if (s.phase !== 'race') return;
    }
    if (lim > s.t) s.t = lim;
    if (s.t >= RULES.capMs) { s.phase = 'timeout'; emit(s, 'timeout', {}); }
  }

  function deliver(s, slot, j) {
    var c = s.tray[slot], jar = s.jars[j];
    if (!c || c.readyAt > s.t || s.toys[slot]) return { ok: false };
    if (!jar || jar.done || jar.readyAt > s.t) return { ok: false };
    var it = null;
    for (var k = 0; k < jar.items.length; k++) {
      if (jar.items[k].type === c.type && jar.items[k].have < jar.items[k].need) { it = jar.items[k]; break; }
    }
    if (!it) {
      s.mistakes++; s.penaltyMs += RULES.penaltyMs;
      emit(s, 'wrong', { slot: slot, jar: j, type: c.type });
      return { ok: true, wrong: true };
    }
    it.have++;
    s.tray[slot] = null;
    emit(s, 'deliver', { slot: slot, jar: j, type: c.type, order: jar.order });
    checkDone(s, j);
    if (s.phase === 'race') scheduleBake(s);
    return { ok: true };
  }
  function removeToy(s, slot) {
    if (!s.toys[slot]) return { ok: false };
    s.toys[slot] = 0;
    emit(s, 'toyOff', { slot: slot });
    scheduleBake(s);
    return { ok: true };
  }
  function removeWrong(s, j) {
    var jar = s.jars[j];
    if (!jar || jar.wrong < 0) return { ok: false };
    var ty = jar.wrong;
    jar.wrong = -1;
    emit(s, 'wrongOff', { jar: j, type: ty });
    checkDone(s, j);
    return { ok: true };
  }

  function apply(s, inp) {
    if (!inp || typeof inp.t !== 'number' || inp.t !== Math.floor(inp.t) || inp.t < s.t) return { ok: false, bad: true };
    advanceTo(s, inp.t);
    if (s.phase !== 'race') return { ok: false };
    var sl = inp.s, jr = inp.j, r;
    if (inp.a === 'd' && sl >= 0 && sl < RULES.slots && jr >= 0 && jr < RULES.jars) r = deliver(s, sl, jr);
    else if (inp.a === 't' && sl >= 0 && sl < RULES.slots) r = removeToy(s, sl);
    else if (inp.a === 'w' && jr >= 0 && jr < RULES.jars) r = removeWrong(s, jr);
    else return { ok: false, bad: true };
    if (r.ok) s.inputs++;
    return r;
  }

  function replay(seed, log) {
    var sim = create(seed);
    for (var i = 0; i < log.length; i++) {
      var r = sim.apply(log[i]);
      if (!r.ok) return { valid: false, at: i, state: sim.state };
    }
    return { valid: sim.state.phase === 'done', state: sim.state };
  }

  return {
    RULES: RULES, TYPES: TYPES, PEOPLE: PEOPLE,
    makeChallenge: makeChallenge, challengeFor: challengeFor, create: create, replay: replay
  };
});

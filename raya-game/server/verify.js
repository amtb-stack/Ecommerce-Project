#!/usr/bin/env node
/* Record verifier for the leaderboard.
 *
 * The server must never trust the time a browser sends. It replays the
 * player's input log with the same rules file (../sim.js) and accepts the
 * record only if the replay finishes 10 balang with exactly the claimed time.
 *
 *   node server/verify.js rekod.json   verify one submission file
 *   node server/verify.js --uji        run the self-test
 */
'use strict';
const RayaSim = require('../sim.js');

const MAX_INPUTS = 400;

function verifyRun(sub) {
  const out = { sah: false, masaMs: null, kesilapan: null, bendera: [], sebab: '' };
  if (!sub || typeof sub.seed !== 'string' || !Array.isArray(sub.log)) { out.sebab = 'Data tidak lengkap'; return out; }
  if (sub.log.length > MAX_INPUTS) { out.sebab = 'Log terlalu panjang'; return out; }
  const r = RayaSim.replay(sub.seed, sub.log);
  if (!r.valid) {
    out.sebab = r.at != null ? 'Input ke-' + (r.at + 1) + ' tidak sah' : 'Pusingan tidak siap';
    return out;
  }
  const s = r.state;
  if (sub.masaMs !== s.resultMs) { out.sebab = 'Masa tidak sepadan dengan main semula'; return out; }
  // The race cannot take less real time than its game time.
  if (typeof sub.masaPelayanMs === 'number' && sub.masaPelayanMs + 1500 < s.finishAt) {
    out.sebab = 'Masa pelayan lebih pendek daripada masa permainan';
    return out;
  }
  let fast = 0;
  for (let i = 1; i < sub.log.length; i++) if (sub.log[i].t - sub.log[i - 1].t < 90) fast++;
  if (fast > 3) out.bendera.push('Gerakan terlalu pantas: semak manual');
  if (s.resultMs < 22000) out.bendera.push('Masa luar biasa pantas: semak manual');
  out.sah = true;
  out.masaMs = s.resultMs;
  out.kesilapan = s.mistakes;
  return out;
}

// Ranking: fastest time, then fewest mistakes, then whoever got there first.
function rank(entries) {
  return entries.slice().sort(function (a, b) {
    return (a.masaMs - b.masaMs) || (a.kesilapan - b.kesilapan) || (a.diterimaPada - b.diterimaPada);
  });
}

// A simple bot that plays like a fast human: one action every stepMs.
function botPlay(seed, stepMs) {
  const sim = RayaSim.create(seed), s = sim.state, log = [];
  for (let t = 300; t <= RayaSim.RULES.capMs && s.phase === 'race'; t += stepMs) {
    sim.advanceTo(t);
    if (s.phase !== 'race') break;
    let inp = null;
    const wj = s.jars.findIndex(function (j) { return j && j.wrong >= 0 && j.readyAt <= t; });
    const toy = s.toys.findIndex(function (x) { return x; });
    if (wj >= 0) inp = { t: t, a: 'w', j: wj };
    else if (toy >= 0) inp = { t: t, a: 't', s: toy };
    else {
      for (let sl = 0; sl < 8 && !inp; sl++) {
        const c = s.tray[sl];
        if (!c || c.readyAt > t || s.toys[sl]) continue;
        for (let j = 0; j < 3 && !inp; j++) {
          const jar = s.jars[j];
          if (!jar || jar.done || jar.readyAt > t) continue;
          if (jar.items.some(function (it) { return it.type === c.type && it.have < it.need; })) inp = { t: t, a: 'd', s: sl, j: j };
        }
      }
    }
    if (inp && sim.apply(inp).ok) log.push(inp);
  }
  return { log: log, state: s };
}

function selfTest() {
  const seed = 'raya27-latihan';
  let pass = 0, fail = 0;
  function check(name, cond) { if (cond) pass++; else fail++; console.log((cond ? 'LULUS  ' : 'GAGAL  ') + name); }

  const a = RayaSim.replay(seed, []).state, b = RayaSim.create(seed).state;
  check('Cabaran yang sama untuk semua pemain', JSON.stringify(a.ch) === JSON.stringify(b.ch));

  const fastBot = botPlay(seed, 450);
  check('Bot pantas siap 10 balang (' + (fastBot.state.resultMs / 1000).toFixed(2) + ' saat)', fastBot.state.phase === 'done');
  const slowBot = botPlay(seed, 1100);
  check('Bot perlahan: ' + (slowBot.state.phase === 'done' ? 'siap ' + (slowBot.state.resultMs / 1000).toFixed(2) + ' saat' : 'tamat masa'), true);

  const sub = { seed: seed, log: fastBot.log, masaMs: fastBot.state.resultMs };
  const ok = verifyRun(sub);
  check('Rekod jujur disahkan', ok.sah && ok.masaMs === fastBot.state.resultMs);

  check('Masa palsu ditolak', !verifyRun(Object.assign({}, sub, { masaMs: sub.masaMs - 5000 })).sah);

  const shifted = sub.log.map(function (x) { return Object.assign({}, x, { t: Math.max(0, x.t - 4000) }); });
  check('Log yang diubah ditolak', !verifyRun(Object.assign({}, sub, { log: shifted })).sah);

  check('Masa pelayan terlalu pendek ditolak', !verifyRun(Object.assign({}, sub, { masaPelayanMs: 5000 })).sah);

  const tie = rank([
    { nama: 'B', masaMs: 48000, kesilapan: 1, diterimaPada: 10 },
    { nama: 'A', masaMs: 48000, kesilapan: 0, diterimaPada: 20 },
    { nama: 'C', masaMs: 48000, kesilapan: 0, diterimaPada: 15 },
    { nama: 'D', masaMs: 47999, kesilapan: 3, diterimaPada: 99 }
  ]).map(function (e) { return e.nama; }).join('');
  check('Pemecah seri: masa, kesilapan, siapa dahulu (' + tie + ')', tie === 'DCAB');

  console.log('\n' + pass + ' lulus, ' + fail + ' gagal');
  if (fail) process.exit(1);
}

module.exports = { verifyRun: verifyRun, rank: rank, botPlay: botPlay };

if (require.main === module) {
  const arg = process.argv[2];
  if (arg && arg !== '--uji') {
    const sub = JSON.parse(require('fs').readFileSync(arg, 'utf8'));
    console.log(JSON.stringify(verifyRun(sub), null, 2));
  } else {
    selfTest();
  }
}

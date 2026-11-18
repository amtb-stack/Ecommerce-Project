/**
 * Vespa Raya The Baker: penerima data pemain (Google Apps Script)
 *
 * Cara pasang (sekali sahaja):
 *  1. Buka Google Sheet baharu > Extensions > Apps Script.
 *  2. Padam kod contoh, tampal SEMUA kod fail ini, Save.
 *  3. Pilih fungsi "setup" di bar atas > Run > benarkan akses (Allow).
 *  4. Deploy > New deployment > jenis "Web app":
 *       Execute as: Me
 *       Who has access: Anyone
 *     Deploy, kemudian salin "Web app URL" (berakhir dengan /exec).
 *  5. Tampal URL itu dalam vespa-raya/config.js -> endpoint.
 *
 * Bila kod ini diubah: Deploy > Manage deployments > Edit (ikon pensel) > Version: New version > Deploy.
 * URL kekal sama.
 */

const SHEET_PLAYERS = 'Pemain';
const SHEET_GAMES = 'Permainan';
const HEAD_PLAYERS = ['Kemas kini', 'ID Pemain', 'Nama', 'No. Telefon', 'E-mel', 'Setuju PDPA', 'Setuju Promosi', 'Versi Notis', 'Daftar Pertama', 'Bil. Main', 'Skor Terbaik'];
const HEAD_GAMES = ['Diterima', 'ID Pemain', 'Nama', 'Keputusan', 'Skor', 'Hantaran', 'Masa (s)', 'Kuih', 'Combo', 'Nyawa', 'Kampung', 'Benih', 'Masa Peranti', 'ID Rekod'];
const ROUTE_KEY = { 'Kg. Ketupat': 'ketupat', 'Kg. Lemang': 'lemang' };
const MAX_SCORE = 60000; // jauh melebihi skor maksimum yang mungkin
const BOARD_CACHE_S = 30;

function setup() {
  const ss = SpreadsheetApp.getActive();
  [[SHEET_PLAYERS, HEAD_PLAYERS], [SHEET_GAMES, HEAD_GAMES]].forEach(([name, head]) => {
    const sh = sheet_(ss, name, head);
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#ffd447');
  });
  const s1 = ss.getSheetByName('Sheet1');
  if (s1 && s1.getLastRow() === 0 && ss.getSheets().length > 2) ss.deleteSheet(s1);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return json_({ ok: false, error: 'sibuk' });
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const recs = Array.isArray(body.records) ? body.records.slice(0, 20) : [];
    const cache = CacheService.getScriptCache();
    const ss = SpreadsheetApp.getActive();
    let n = 0;
    recs.forEach((r) => {
      if (!r || typeof r !== 'object') return;
      const id = str_(r.id, 64), pid = str_(r.pid, 64);
      if (!id || !pid) return;
      if (cache.get('r_' + id)) return; // rekod sama dihantar semula (cuba lagi)
      if (r.type === 'player') savePlayer_(ss, r, pid);
      else if (r.type === 'game') saveGame_(ss, r, pid, id);
      else return;
      cache.put('r_' + id, '1', 21600);
      n++;
    });
    if (n) cache.remove('board');
    return json_({ ok: true, saved: n });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action !== 'board') return json_({ ok: true, service: 'vespa-raya' });
  const limit = Math.max(1, Math.min(50, Number(p.limit) || 10));
  const best = boardData_();
  const rows = best.slice(0, limit).map((b) => ({ n: b.n, s: b.s, d: b.d, k: b.k, me: !!p.pid && b.pid === p.pid }));
  let me = null;
  if (p.pid) {
    const i = best.findIndex((b) => b.pid === p.pid);
    if (i >= limit) me = { rank: i + 1, n: best[i].n, s: best[i].s, d: best[i].d, k: best[i].k, me: true };
  }
  return json_({ ok: true, rows: rows, me: me });
}

// Skor terbaik setiap pemain (nama & skor sahaja; tiada telefon/e-mel dikeluarkan).
function boardData_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('board');
  if (hit) return JSON.parse(hit);
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_GAMES);
  const last = sh ? sh.getLastRow() : 0;
  const byPid = {};
  if (last > 1) {
    const vals = sh.getRange(2, 1, last - 1, HEAD_GAMES.length).getValues();
    vals.forEach((v) => {
      const pid = String(v[1]), s = Number(v[4]) || 0, d = Number(v[5]) || 0, t = Number(v[6]) || 0;
      const cur = byPid[pid];
      if (!cur || s > cur.s || (s === cur.s && d > cur.d) || (s === cur.s && d === cur.d && t < cur.t)) {
        byPid[pid] = { pid: pid, n: String(v[2]).replace(/^'/, ''), s: s, d: d, t: t, k: ROUTE_KEY[String(v[10])] || '' };
      }
    });
  }
  const best = Object.keys(byPid).map((k) => byPid[k]).sort((a, b) => b.s - a.s || b.d - a.d || a.t - b.t).slice(0, 500);
  try { cache.put('board', JSON.stringify(best), BOARD_CACHE_S); } catch (err) { /* terlalu besar untuk cache */ }
  return best;
}

function savePlayer_(ss, r, pid) {
  const sh = sheet_(ss, SHEET_PLAYERS, HEAD_PLAYERS);
  const now = new Date();
  const row = findRow_(sh, pid);
  const vals = [now, pid, txt_(str_(r.name, 24)), phone_(r.phone), txt_(str_(r.email, 80)),
    r.consent ? 'YA' : 'TIDAK', r.marketing ? 'YA' : 'TIDAK', str_(r.policy, 20)];
  if (row) {
    sh.getRange(row, 1, 1, vals.length).setValues([vals]);
  } else {
    sh.appendRow(vals.concat([now, 0, 0]));
  }
}

function saveGame_(ss, r, pid, id) {
  const sh = sheet_(ss, SHEET_GAMES, HEAD_GAMES);
  const score = clamp_(r.score, 0, MAX_SCORE), del = clamp_(r.delivered, 0, 30);
  const result = { selesai: 'Selesai', gagal: 'Gagal', berhenti: 'Berhenti' }[r.result] || 'Lain';
  const route = { ketupat: 'Kg. Ketupat', lemang: 'Kg. Lemang' }[r.route] || '-';
  sh.appendRow([new Date(), pid, txt_(str_(r.name, 24)), result, score, del, clamp_(r.time, 0, 3600),
    clamp_(r.kuih, 0, 999), clamp_(r.combo, 0, 99), clamp_(r.lives, 0, 3), route, clamp_(r.seed, 0, 2147483647), str_(r.at, 40), id]);
  // kemas kini ringkasan pemain
  const ps = sheet_(ss, SHEET_PLAYERS, HEAD_PLAYERS);
  const row = findRow_(ps, pid);
  if (row) {
    const cur = ps.getRange(row, 10, 1, 2).getValues()[0];
    ps.getRange(row, 10, 1, 2).setValues([[(Number(cur[0]) || 0) + 1, Math.max(Number(cur[1]) || 0, score)]]);
  }
}

// Cipta helaian & tajuk jika belum ada (kalau "setup" terlupa dijalankan).
function sheet_(ss, name, head) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#ffd447');
    sh.setFrozenRows(1);
  }
  return sh;
}

function findRow_(sh, pid) {
  if (!sh || sh.getLastRow() < 2) return 0;
  const f = sh.getRange(2, 2, sh.getLastRow() - 1, 1).createTextFinder(pid).matchEntireCell(true).findNext();
  return f ? f.getRow() : 0;
}

function str_(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max); }
// Elak suntikan formula: teks bermula dengan = + - @ disimpan sebagai teks biasa.
function txt_(s) { return /^[=+\-@]/.test(s) ? "'" + s : s; }
function phone_(v) { const s = str_(v, 20).replace(/[^0-9+]/g, ''); return s ? "'" + s : ''; }
function clamp_(v, lo, hi) { const n = Math.round(Number(v)); return isFinite(n) ? Math.max(lo, Math.min(hi, n)) : 0; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

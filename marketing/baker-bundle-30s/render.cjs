// Frame-accurate renderer: drives window.render(t) in headless Chromium and pipes PNG frames into ffmpeg.
// Usage: node render.cjs [--fps 30] [--workers 4] [--out out/video_noaudio.mp4] [--stills 0.5,3,7]
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const path = require('path'), fs = require('fs');

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1]]), a), []));
const FPS = +(args.fps || 30), WORKERS = +(args.workers || 4);
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
// serve over http so CSS masks can use the product images (file:// blocks them)
const http = require('http');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const f = path.join(__dirname, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(__dirname) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
let url;
const outDir = path.join(__dirname, 'out'); fs.mkdirSync(outDir, { recursive: true });

async function page(browser) {
  const p = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await p.goto(url); await p.evaluate(() => window.ready);
  return p;
}

(async () => {
  await new Promise(r => server.listening ? r() : server.once('listening', r));
  url = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });
  if (args.stills) {
    const p = await page(browser);
    for (const t of args.stills.split(',').map(Number)) {
      await p.evaluate(t => window.render(t), t);
      await p.screenshot({ path: path.join(outDir, `still_${t.toFixed(2)}.png`) });
    }
    await browser.close(); server.close(); return;
  }
  const dur = 30, total = Math.round(dur * FPS), per = Math.ceil(total / WORKERS);
  const segs = [];
  await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
    const f0 = w * per, f1 = Math.min(total, f0 + per);
    const seg = path.join(outDir, `seg${w}.mp4`); segs[w] = seg;
    const p = await page(browser);
    const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(FPS), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = f0; f < f1; f++) {
      await p.evaluate(t => window.render(t), f / FPS);
      const buf = await p.screenshot({ type: 'png' });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if ((f - f0) % 60 === 0) console.log(`worker ${w}: frame ${f}/${f1 - 1}`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }));
  await browser.close();
  const list = path.join(outDir, 'segs.txt');
  fs.writeFileSync(list, segs.map(s => `file '${s}'`).join('\n'));
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', path.join(outDir, 'video_noaudio.mp4')]);
  segs.forEach(s => fs.unlinkSync(s)); fs.unlinkSync(list);
  server.close();
  console.log('done');
})();

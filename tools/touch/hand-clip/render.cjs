// D1072, THE HAND CLIPS (reusable: the listening pages now, the intermediate and advanced tutorials later). D690's realistic hands
// (WebXR generic-hand, MIT) holding a phone sideways, each thumb solved to where the game's touches put it (hand.html), rendered
// frame by frame in headless Chromium (software GL) and joined by ffmpeg into an H.264 mp4 in step with a render's audio.
//
//   npm install --prefix tools/touch/hand-clip          (three, the hand models: once)
//   node tools/touch/hand-clip/render.cjs <touches.json> <out.mp4> [--fps 30] [--secs N] [--size 640x360] [--from s] [--camera x,y,z (m)]
//
// touches.json: {W, H, touches: [{k: "down"|"move"|"up", id, t, side, x, y}]} as tools/touch/gesture/render.cjs writes them (the
// game's screen px; y may run past the screen: the rows touched are fitted into 34-76% of its height, within the thumbs' easy reach). Playwright from PLAYWRIGHT
// or the global modules.
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
const { execFileSync } = require('child_process');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const [inFile, outFile] = args;
const fps = Number(opt('fps', 30)), size = opt('size', '640x360').split('x').map(Number), from = Number(opt('from', 0));
const src = JSON.parse(fs.readFileSync(inFile, 'utf8'));
const W = src.W ?? 844, H = src.H ?? 390;
const ts = src.touches ?? [];
const secs = Number(opt('secs', Math.max(...ts.map((x) => x.t), 1) + 0.6));
// The rows touched fitted into the screen.
const ys = ts.filter((x) => x.y !== undefined).map((x) => x.y);
const y0 = Math.min(...ys), y1 = Math.max(...ys);
const fitY = (y) => (y1 > y0 ? H * (0.34 + (0.42 * (y - y0)) / (y1 - y0)) : H / 2);
const path_ = { left: [], right: [] }, sideOf = {};
for (const x of ts) {
  if (x.k === 'down') sideOf[x.id] = x.side;
  const side = x.side ?? sideOf[x.id];
  if (!side) continue;
  const last = path_[side].at(-1);
  if (x.k === 'up') path_[side].push({ t: x.t - from, x: last?.x ?? 0, y: last?.y ?? 0, down: false });
  else path_[side].push({ t: x.t - from, x: x.x, y: fitY(x.y), down: true });
}
// The marks: each touch's row lit from its landing to its lift (the notes, drawn as the box draws them, without words).
const marks = [];
for (const side of ['left', 'right']) { const p = path_[side]; for (let i = 0; i < p.length; i++) if (p[i].down && (i === 0 || !p[i - 1].down || p[i - 1].y !== p[i].y)) marks.push({ t0: p[i].t, t1: (p.slice(i + 1).find((q) => !q.down || q.y !== p[i].y)?.t ?? secs), x: p[i].x, y: p[i].y }); }
const root = __dirname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.json': 'application/json' };
const server = http.createServer((req, res) => { const f = path.join(root, decodeURIComponent(req.url.split('?')[0])); if (!f.startsWith(root) || !fs.existsSync(f)) return (res.writeHead(404), res.end()); res.writeHead(200, { 'content-type': types[path.extname(f)] ?? 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
(async () => {
  if (!fs.existsSync(path.join(root, 'node_modules/three'))) throw new Error('npm install --prefix tools/touch/hand-clip first');
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'handclip-'));
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: size[0], height: size[1] } });
  p.on('pageerror', (e) => console.error('pageerror', e.message));
  await p.goto(`http://localhost:${port}/hand.html`);
  await p.waitForFunction(() => window.setup);
  await p.evaluate((o) => window.setup(o), { width: size[0], height: size[1], W, H, path: path_, marks, camera: (opt('camera', '0,-0.07,0.29')).split(',').map(Number), look: (opt('look', '0,-0.018,0')).split(',').map(Number) });
  const n = Math.ceil(secs * fps);
  let worst = 0;
  for (let i = 0; i < n; i++) {
    const err = await p.evaluate((t) => window.frame(t), i / fps);
    worst = Math.max(worst, ...Object.values(err));
    const d = await p.evaluate(() => window.shot());
    fs.writeFileSync(path.join(tmp, `f${String(i).padStart(5, '0')}.png`), Buffer.from(d.split(',')[1], 'base64'));
  }
  await b.close();
  server.close();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(tmp, 'f%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '28', '-movflags', '+faststart', outFile]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(outFile, `${n} frames`, `thumb's worst miss ${(worst * 1000).toFixed(1)} mm`);
})();

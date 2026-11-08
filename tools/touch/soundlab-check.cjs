/**
 * D497: THE SOUND LAB checked in a browser on the production build (npx vite build; npx vite preview --port 4317):
 * it loads and plays (the audio clock advances, the bar moves), a seek lands on its bar, switching the sound and the
 * drums mid-play takes effect without a restart from the top, a deep link opens at its bar. Prints the seek times.
 *   NODE_PATH=$(npm root -g) node tools/touch/soundlab-check.cjs [base url]
 */
const { chromium } = require("playwright");

const BASE = process.argv[2] || "http://localhost:4317/";
const ok = (c, m) => {
  if (!c) throw new Error(`FAIL: ${m}`);
  console.log(`ok  ${m}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const st = () => page.evaluate(() => window.__soundlab.status());
  const eng = (fn, arg) => page.evaluate(([f, a]) => new Function("e", "a", f)(window.__soundlab, a), [fn, arg]);

  // A deep link opens at its bar, with its settings.
  await page.goto(`${BASE}soundlab.html#wtc1f12?sound=pianoSampled&drums=2&bar=40`);
  await page.waitForFunction(() => !!window.__soundlab);
  await sleep(300);
  let s = await st();
  ok(s.bar === 40, `deep link opens at bar 40 (bar ${s.bar})`);
  ok(s.sound === "pianoSampled", `deep link's sound (${s.sound})`);
  ok((await eng("return e.s.drums")) === 2, "deep link's drums style 2");
  ok((await page.textContent("#sl-bar")).includes("BAR 40"), "the bar shown");

  // It plays: the audio clock and the tick advance, from bar 40.
  await page.click("#sl-play");
  await page.waitForFunction(() => window.__soundlab.status().playing, null, { timeout: 30000 });
  await page.evaluate(() => { const c = window.__soundlab.chip; const n = c.note.bind(c); window.__notes = 0; c.note = (...a) => (window.__notes++, n(...a)); });
  const a0 = await st();
  await sleep(2500);
  const notes = await page.evaluate(() => window.__notes);
  ok(notes > 4, `notes sounded through the game's Chip (${notes} in 2.5 s)`);
  const a1 = await st();
  ok(a1.audioTime > a0.audioTime + 1.5, `the audio clock advances (${a0.audioTime.toFixed(2)} → ${a1.audioTime.toFixed(2)} s)`);
  ok(a1.tick > a0.tick && a1.bar >= 40, `the music moves on from bar 40 (now bar ${a1.bar})`);
  ok(a1.seekMs !== null, `first start ${Math.round(a1.seekMs ?? -1)} ms (loading included)`);

  // Seeking: to bar 20 while playing, then back to 50; each time measured.
  const seeks = [];
  for (const bar of [20, 50, 10, 30]) {
    await eng("e.seekBar(a)", bar);
    await page.waitForFunction((b) => { const x = window.__soundlab.status(); return x.seekMs !== null && x.playing && x.bar >= b; }, bar, { timeout: 10000 });
    await sleep(600);
    const x = await st();
    ok(x.bar >= bar && x.bar <= bar + 2, `seek to bar ${bar} lands there (bar ${x.bar}, ${Math.round(x.seekMs)} ms)`);
    seeks.push(x.seekMs);
  }

  // The sound switched mid-play: the engine goes on from where it was (not bar 1), on the new sound.
  const before = await st();
  await page.click('#sl-sounds [data-sound="harpsichordSampled"]');
  await page.waitForFunction(() => window.__soundlab.status().sound === "harpsichordSampled" && window.__soundlab.status().playing && !window.__soundlab.status().loading, null, { timeout: 30000 });
  await sleep(800);
  const after = await st();
  ok(after.bar >= before.bar && after.bar <= before.bar + 3, `sound pad switched mid-play, no restart (bar ${before.bar} → ${after.bar})`);
  ok(await page.evaluate(() => document.querySelector('#sl-sounds [data-sound="harpsichordSampled"]').classList.contains("on")), "the pad lights the sound playing");
  ok(await page.evaluate(() => !!document.querySelector('#sl-sounds [data-sound="vocalSynth"].own')), "the pad marks the fugue's default");
  ok((await page.evaluate(() => window.__soundlab.game && window.__soundlab.game.f.id)) === "wtc1f12", "same piece playing");

  // The drums switched mid-play: live (the game object is the same: no rebuild), the style followed.
  const g0 = await page.evaluate(() => { window.__g0 = window.__soundlab.game; return window.__soundlab.status().bar; });
  // D530: the pad offers the whole library by family, HOME and FITS marked; one tap a style.
  ok((await page.$$eval("#sl-drums [data-style]", (b) => b.length)) >= 28, "the pad shows the whole library");
  ok(!!(await page.$("#sl-drums button.own [class~='home']")), "HOME marked");
  await page.click('[data-style="triphop"]');
  await sleep(1200);
  const same = await page.evaluate(() => window.__soundlab.game === window.__g0);
  ok(same, "drums TRIP-HOP applied live (no rebuild of the engine)");
  ok((await eng("return e.s.style")) === "triphop", "drums now TRIP-HOP");
  const kit = await page.evaluate(() => { const l = window.__soundlab.chip.kitEvents; return l.length ? l[l.length - 1].style : null; });
  ok(kit !== null, `the drummer plays (last stroke's style: ${kit})`);
  await page.click('[data-drums="0"]');
  await sleep(300);
  ok(await page.evaluate(() => window.__soundlab.game === window.__g0), "drums off applied live");
  ok((await st()).bar >= g0, "still moving on");

  // A layer switched live.
  await page.click('[data-layer="form"]');
  await sleep(200);
  ok(await page.evaluate(() => window.__soundlab.game === window.__g0), "subject/episode layer off, live");

  // The summary: an item jumps to its bar (mid-play), and follows the drums chosen.
  await page.click('[data-drums="1"]');
  await sleep(200);
  ok((await page.textContent("#sl-summary")).includes("SWING"), "the summary names the drums now chosen");
  const target = await page.evaluate(() => { const b = [...document.querySelectorAll("#sl-summary button")].map((x) => Number(x.dataset.bar)).filter((x) => x > 5); return b[Math.floor(b.length / 2)]; });
  await page.click(`#sl-summary button[data-bar="${target}"]`);
  await page.waitForFunction((b) => { const x = window.__soundlab.status(); return x.seekMs !== null && x.bar >= b; }, target, { timeout: 10000 });
  const jb = (await st()).bar;
  ok(jb >= target && jb <= target + 2, `a summary item jumps to its bar (b.${target}, now ${jb})`);
  await page.click('[data-drums="0"]');
  ok(!(await page.textContent("#sl-summary")).includes("SWING"), "drums off: the summary drops them");

  // D531: an IDEA loads its fugue, sound and drums and plays from its bar.
  await page.click("#sl-ideas-btn");
  const idea = await page.$eval("#sl-ideas button[data-idea]:not([disabled])", (b) => b.dataset.idea);
  await page.click(`#sl-ideas button[data-idea="${idea}"]`);
  await page.waitForFunction(() => window.__soundlab.status().playing && window.__soundlab.s.drums > 0, null, { timeout: 20000 });
  ok(true, `IDEA ${idea} loaded and playing`);
  ok((await page.$$eval("#sl-ideas button[disabled]", (b) => b.length)) === 0, "the list closes on a tap");

  // A/B flip: the other setting at the same point.
  const fb = await st();
  await page.click("#sl-flip");
  await page.waitForFunction(() => !window.__soundlab.status().loading && window.__soundlab.status().playing, null, { timeout: 30000 });
  await sleep(600);
  const fa = await st();
  ok(fa.bar >= fb.bar && fa.bar <= fb.bar + 3, `A/B flip at the same point (bar ${fb.bar} → ${fa.bar}, sound ${fa.sound})`);

  // Pause.
  await page.click("#sl-play");
  await sleep(300);
  ok(!(await st()).playing, "pause");

  // Notes: kept across a reload; SEND a well-formed new-issue address with the note, the settings and the moment.
  const NOTE = "The episode at b.16 is too dark & the drums roll too often?";
  await page.fill("#sl-notes", NOTE);
  await page.reload();
  await page.waitForFunction(() => !!window.__soundlab);
  ok((await page.inputValue("#sl-notes")) === NOTE, "notes persist across a reload");
  const href = await page.getAttribute("#sl-send", "href");
  const u = new URL(href);
  ok(u.origin === "https://github.com" && u.pathname === "/matheusvalenteleite-collab/The-Well-Tempered-Game/issues/new", `SEND opens the repository's new issue (${u.pathname})`);
  ok(u.searchParams.get("title") === "Sound Lab notes: I/12 The Requiem", `its title (${u.searchParams.get("title")})`);
  const body = u.searchParams.get("body");
  ok(body.startsWith(NOTE) && /Settings: .*drums/.test(body) && /Moment: http.*soundlab\.html#wtc1f12/.test(body), "its body: the note, the settings, the moment's link");
  ok((await page.getAttribute("#sl-send", "target")) === "_blank", "SEND opens a new tab");
  await page.fill("#sl-notes", "");

  // Phone width: no horizontal scroll.
  await page.setViewportSize({ width: 375, height: 800 });
  await sleep(200);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(wide <= 1, `phone width fits (overflow ${wide}px)`);
  await page.screenshot({ path: process.env.SHOT || "/tmp/soundlab-phone.png", fullPage: false });

  ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
  const log = await page.evaluate(() => window.__soundlab.seekLog);
  const avg = seeks.reduce((a, b) => a + b, 0) / seeks.length;
  console.log(`seek times (ms, ask to the first note's time): ${seeks.map((x) => Math.round(x)).join(", ")}; mean ${Math.round(avg)}; all relaunches: ${log.map((x) => Math.round(x)).join(", ")}; engine build ${Math.round((await st()).buildMs)} ms`);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

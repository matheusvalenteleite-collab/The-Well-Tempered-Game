/**
 * D497: the instruments report's page (published as an artifact), from docs/sound/REPORT.json (the game's facts:
 * node tools/touch/sound-report.ts) and the suggestions written here.
 *   node tools/touch/sound-report-html.mjs <out.html>
 * BASE below is the Sound Lab's address every link opens.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const OUT = process.argv[2] ?? "sound-report.html";
const R = JSON.parse(readFileSync(`${REPO}docs/sound/REPORT.json`, "utf8"));
const BASE = "https://matheusvalenteleite-collab.github.io/The-Well-Tempered-Game/soundlab.html";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const P = Object.fromEntries(R.presets.map((p) => [p.id, p]));
const sname = (id) => P[id]?.name ?? id;
const vn = (n, v) => (({ 2: ["upper", "lower"], 3: ["soprano", "alto", "bass"], 4: ["soprano", "alto", "tenor", "bass"], 5: ["soprano I", "soprano II", "alto", "tenor", "bass"] })[n] ?? [])[v] ?? `voice ${v + 1}`;
const midi = (m) => `${["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"][m % 12]}${Math.floor(m / 12) - 1}`;
const KIND = { exposition: "Exposition", episode: "Episode", middle: "Middle entries", final: "Final group", coda: "Coda" };
const STYLE_WORDS = {
  chip: "the console's noise channel: kick, snare and hats from the chip itself",
  machine: "an analog drum machine: four on the floor in subject zones, clap with the snare, closed hats off the beat, the open hat at the bar's end",
  brushes: "Swirly Drums brushes (D503's engine): sweeps and taps, fills from the form",
  jazz: "a jazz kit with sticks: ride on every beat, hi-hat foot on the backbeat, feathered bass drum, cross-stick on the last beat",
  rock: "Big Rusty Drums with sticks: backbeat snare, hats or ride in subdivisions, the open hat every other bar",
  timpani: "two timpani tuned to the home key's tonic and dominant, with bass drum, cymbal and triangle; the bass drum takes the strokes away from the home key",
  frame: "frame drum (congas), bongo, tambourine and shaker: dum on the bar, tek between, tambourine on the backbeat",
};

// The links.
function lab(id, o = {}) {
  const q = Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  return `${BASE}#${id}${q.length ? `?${q.join("&")}` : ""}`;
}
const a = (href, text) => `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(text)}</a>`;
const L = (f, text, o) => a(lab(f.id, o), text);

// ---- Suggestions: rules over the facts, then the hand-written ones. ----
function ruleSuggestions(f) {
  const out = [];
  const d = f.drums;
  const fm = f.form;
  const z = f.zones;
  const own = f.sound.id;
  const style1 = d.presets[0];
  // Pedal under the climax.
  for (const p of fm.pedals) {
    if (p.from <= fm.climax.arrival && p.to >= fm.climax.rise)
      out.push({ t: `The pedal point at b.${p.from}–${p.to} sits inside the climax window (b.${fm.climax.rise}–${fm.climax.arrival}). The band's climax build and the drums' busier pattern both land on a held bass. Try thinning the drums during the pedal (cymbals and kick only) and letting the pedal itself carry the tension.`, l: { bar: p.from - 1, drums: 1 } });
  }
  // Contrast not clear.
  if (!z.clear) out.push({ t: `D513 rates this fugue's contrast as not clear (${z.episodes} inner episodes, ${Math.round(z.episodeShare * 100)}% of the piece; the rule asks 3 and 20%). The band gets no subject/episode colour and the drums keep the subject pattern from start to end. If the fugue should breathe, consider a hand override in form-points.ts for its quieter passages, or accept it as one continuous build and make sure the drums stay light.`, l: { bar: Math.max(1, Math.round(f.bars / 2)), drums: 1 } });
  // Colour plan standing aside.
  if (f.colourPlan.standsAsideForBusoni) out.push({ t: `The colour plan for ${sname(own)} has ${f.colourPlan.moments.length} moments, and none of them sound: Busoni's ${f.busoni.dyn} printed dynamics reach this sound, so Busoni leads (D431) and the plan stands aside. Compare with Busoni off to hear what the plan would add, then decide whether to let the plan's registration or timbre moments sound under Busoni.`, l: { busoni: 0, bar: f.colourPlan.moments[1] ? Math.floor(f.colourPlan.moments[1].bar) : 1 } });
  if (f.colourPlan.active) out.push({ t: `This is one of the few fugues where the colour plan is actually heard (Busoni prints ${f.busoni.has ? f.busoni.dyn : "no"} dynamics here, under the ${3} needed to lead). Its ${f.colourPlan.moments.length} moments carry the whole dramaturgy of the band's colour: check each one by ear with the plan on and off.`, l: { colour: 0, bar: Math.floor(f.colourPlan.moments[0]?.bar ?? 1) } });
  // Busoni absent or thin.
  if (!f.busoni.has || f.busoni.dyn < 3) out.push({ t: `Busoni ${f.busoni.has ? `prints only ${f.busoni.dyn} dynamic marks` : "has no edition of this fugue"}. The sound's dynamics come from the phrasing model alone; the climax build (+${R.constants.form.CLIMAX_DB} dB, a brighter shelf) is the only large-scale shape. Consider a stronger form layer here, for example a larger episode dip.` });
  // Trims at the cap.
  for (const s of f.seats) if (s.trimDb >= 5) out.push({ t: `The ${s.voiceName.toLowerCase()} (${s.name}) is lifted ${s.trimDb} dB by the D508 balance, at or near the 6 dB cap: on ${sname(own)} it still risks being lost (range ${midi(s.lo)}–${midi(s.hi)}). Solo it in the lab and compare. If the instrument itself is the problem, consider a different patch for this voice or a different sound.`, l: { bar: 1, solo: s.voice } });
  // Timpani mostly away.
  const tp = d.presets.find((p) => p.style === "timpani");
  if (tp && d.timpani.awayBars / d.timpani.ofBars > 0.3) out.push({ t: `TIMPANI (style ${tp.n}): the music is away from the home key's harmony in ${d.timpani.awayBars} of ${d.timpani.ofBars} bars, where the bass drum takes the timpani's strokes. Much of the time this style is a bass drum and a triangle. ${tp.n === 1 ? "As the default style, consider putting FRAME DRUM or the kit first." : "Fine as an option; do not make it the default."}`, l: { drums: tp.n, bar: 1 } });
  // Long climax window.
  const win = fm.climax.arrival - fm.climax.rise;
  if (win / f.bars > 0.25) out.push({ t: `The climax window is long: b.${fm.climax.rise}–${fm.climax.arrival}, ${Math.round((100 * win) / f.bars)}% of the fugue. The build reaches its top at the last entry (b.${fm.climax.peak}) and then holds ${fm.climax.arrival - fm.climax.peak} bars at full level and brightness. Listen for fatigue in the hold; a decay after the peak may be better than a plateau.`, l: { bar: fm.climax.peak, drums: 1 } });
  if (fm.climax.peak - fm.climax.rise <= 2 && fm.climax.arrival - fm.climax.peak <= 3) out.push({ t: `The climax is compact: built over b.${fm.climax.rise}–${fm.climax.peak}, held to b.${fm.climax.arrival}. At this tempo (♩ ${f.tempo.bpm}) the build takes about ${Math.round(((fm.climax.peak - fm.climax.rise + 1) * f.tempo.perBar * f.tempo.beatS))} s. Check that the change is audible at all and not just a jump.`, l: { bar: Math.max(1, fm.climax.rise - 2), drums: 1 } });
  // No break.
  if (d.breakBar === null) out.push({ t: `No drum break before the final entry: no episode precedes it. The final group arrives without the bar of silence the other fugues get. If you want a marked arrival, a one-beat break or a crash on the final entry would do it.` });
  else out.push({ t: `The drum break (a bar of silence) falls at b.${d.breakBar}, then the roll into the final entry at b.${z.finalEntry}. Check that the silence is not mistaken for a dropout, especially on the default style ${style1.name}.`, l: { bar: Math.max(1, d.breakBar - 2), drums: 1 } });
  // Fast and slow drums.
  if (f.tempo.beatS < 0.6) out.push({ t: `The beat is quick (${f.tempo.beatS} s at the default tempo), so every pattern plays the beat alone with no subdivisions and rolls take two beats. At FAST tempo the drums may feel busy against running sixteenths; listen at FAST with ${style1.name}.`, l: { tempo: "fast", drums: 1, bar: 1 } });
  if (f.tempo.beatS >= 1.3) out.push({ t: `The beat is slow (${f.tempo.beatS} s), which puts ACOUSTIC on brushes. Check whether any drum style suits this tempo at all. "Drums off by default, offered only as an option" may be the right call here.`, l: { drums: d.presets.findIndex((p) => p.style === "brushes") + 1 || 1, bar: 1 } });
  // Many episodes, rolls.
  if (d.rollsInto.length >= 6) out.push({ t: `The drums roll into ${d.rollsInto.length} subject zones (b.${d.rollsInto.join(", ")}) and out of ${d.rollsOut.length} episodes. That is a lot of rolls; consider rolling only into the act changes (b.${fm.actOn.slice(1).join(", ")}) and simply changing pattern elsewhere.`, l: { bar: d.rollsInto[1] - 2, drums: 1 } });
  // Sound used rarely.
  const n = P[own]?.defaultFor.length ?? 0;
  if (n === 1) out.push({ t: `${sname(own)} is the default of this fugue only. If the sound earns its place here, fine. If not, its upkeep (patches, colour plans, balance data) serves one fugue.` });
  return out;
}

// Hand-written suggestions: musical judgments, specific to each fugue. Links use the lab's parameters.
const HAND = {
  wtc1f01: [["The stile antico wants no drums at all. If drums stay offered, TIMPANI only on the final tonic pedal (b.24–27) would be the period-plausible gesture: a soft roll under the last chord.", { bar: 24, drums: 1 }], ["The organ's plan (flutes → principals → plenum at b.14 → principals at b.19) is silent because Busoni leads. Bodky's terraces fit the organ better than Busoni's piano hairpins. Consider letting the organ's registration plan win over Busoni on PIPE ORGAN.", { busoni: 0, bar: 14 }]],
  wtc1f02: [["ABBEY ROAD's own kit already plays fills into each entry and a break before b.29. With DRUMS on, the preset kit replaces it; compare style 1 (JAZZ KIT) against the band's own kit with DRUMS off. The band's own reads the fugue more closely.", { bar: 9, drums: 0, b: "abbeyRoad:1" }], ["The forte close (Keller) over the dominant pedal at b.25–26: try HARPSICHORD for an A/B against the band. Bodky's registration plan exists for it and would be heard with Busoni off.", { bar: 25, b: "harpsichordSampled:0" }]],
  wtc1f03: [["The alto sits 6 dB up on GAME BOY's second pulse. If it still disappears under the lead, give the alto the wave channel instead of the bass.", { bar: 1, solo: 1 }], ["The long chattering episodes (7–14, 28–34) are where the Game Boy's duty-cycle changes would sound, but Busoni leads. Try Busoni off from b.28 to hear the thinner pulses.", { bar: 28, busoni: 0 }]],
  wtc1f04: [["Five voices of ricercar: drums of any kind break the mood. Default DRUMS off is right; consider removing ELECTRO and JAZZ KIT from this fugue's options and offering TIMPANI only.", { drums: 1, bar: 94 }], ["The three subjects enter in turn: a registration step or a consort articulation stop (con sordino for the first exposition, arco after) would mark the triple fugue's architecture.", { bar: 36 }]],
  wtc1f05: [["BACH BRASS with TIMPANI is the most idiomatic pairing in the game: trumpets and drums in D. Make sure the timpani's tonic and dominant (D and A) are heard on a phone; the triangle and cymbal carry it there.", { drums: 1, bar: 1 }], ["The French-overture dotted rhythms: check that the brass articulation does not smear the dotted figures at the default tempo.", { bar: 1, tempo: "slow" }]],
  wtc1f06: [["JAZZ QUARTET in 3/4 for a severe minor fugue: test it against STRING CONSORT. The bass voice sits at the 6 dB trim cap on the double bass.", { bar: 1, b: "stringConsort:0" }], ["The brushes play through a fugue the data marks as not clearly contrasted: they never thin out. Consider the band's own brushes only (DRUMS off) as the default.", { drums: 0, bar: 20 }]],
  wtc1f07: [["SWITCHED-ON fits (Carlos recorded I/7). The filter-closing episodes in the plan (lp 2400) are silenced by Busoni. That episode colour is the Carlos signature; consider letting it through.", { busoni: 0, bar: 9 }], ["ELECTRO is the natural default here. Test ROCK KIT at FAST; the quick beat (0.76 s) suits sticks.", { drums: 2, tempo: "fast", bar: 1 }]],
  wtc1f08: [["The long D♯ minor fugue with augmentation (b.62 on): the piano's own dynamics carry it. The 87 bars with JAZZ KIT may tire; consider TIMPANI for the augmentation section only, or drums off.", { bar: 62, drums: 3 }], ["Nine episodes and the climax from b.75: the build is long (75–87). Listen to whether the plateau after the peak at b.80 holds.", { bar: 75, drums: 1 }]],
  wtc1f09: [["BAROQUE BAND with its continuo: the alto sits 4.4 dB up on the oboe. Check that the oboe does not poke out in the alto's entries once both lifts add up (trim + band entry +1 dB).", { bar: 1, solo: 1 }], ["A short, bright fugue (29 bars at ♩ 83): the climax window b.26–29 is three bars. A crash on the final entry may be all the drums need.", { bar: 24, drums: 1 }]],
  wtc1f10: [["Two voices on SOLO VOICES: the only two-voice fugue. The singers' syllables on fast eighth-note runs can blur; compare at SLOW, and against PIANO.", { tempo: "slow", bar: 1, b: "pianoSampled:0" }], ["FRAME DRUM fits the 3/4 dance. ELECTRO under two singers is a strong clash; consider dropping it here.", { drums: 1, bar: 1 }]],
  wtc1f11: [["TOMITA's space echo on a 3/8 passepied at 0.39 s a beat: the echo may smear the quick lines. Compare with the echo's room down (colour off) and against SID 64.", { bar: 1, b: "sid64:0" }], ["The beat is very quick: rolls take two beats and patterns play on the beat only. ELECTRO here is close to a disco pulse; check it isn't comic.", { drums: 1, bar: 30 }]],
  wtc1f12: [["The fugue the D513 layer was built for: seven episodes, 38% of the piece. Compare form on/off at the b.16 seam: the episodes should be calmer without going dull.", { bar: 14, form: 0, b: "vocalSynth:1" }], ["ELECTRO under VOCAL SYNTH's lament: the drum machine's four-on-the-floor in subject zones is the strongest stylistic risk in Book I. Try JAZZ KIT as the default instead.", { drums: 2, bar: 19 }], ["The break at b.52 and the roll into the final entry at b.53: the stage's dawn light breaks at the same bar. Watch it in the game, not only in the lab.", { bar: 50, drums: 1 }]],
  wtc1f13: [["ZELENKA TRIO's continuo enters by script. Listen to the bass voice alone to hear where the continuo joins, and check it does not double the drums' downbeats.", { bar: 1, solo: 2 }], ["The two oboes are 4–5 dB up (trim). If the bassoon now feels weak, a small mixer cut on oboe II tells you which way to go.", { bar: 6, lv: "0,-3,0" }]],
  wtc1f14: [["JAZZ QUARTET on a slow 6/4 (2.77 s a beat!): brushes. The bass is at the 6 dB trim cap. Solo it: if the double bass's pizzicato decays before the half-notes end, the line breaks.", { bar: 1, solo: 3 }], ["Contrast is not clear here (3 inner episodes, under 20%). The form layer is inactive. A sustained sound (STRING CONSORT, SOLO VOICES) might serve this grave fugue better.", { bar: 1, b: "stringConsort:0" }]],
  wtc1f15: [["MEGA FM on a 6/8 gigue: CHIP KIT first. The tonic pedal at b.84–86 falls inside the climax: let the drums end with the flourish and stay out of the pedal.", { bar: 82, drums: 1 }], ["Inversions are frequent in this fugue; the subject effects distinguish theme 1 only. A subtle colour change for the inverted entries (the GAME BOY-style duty change) would make the form audible.", { bar: 20 }]],
  wtc1f16: [["ABBEY ROAD on the G minor fugue: the band's own fills mark each entry. With only 2 inner episodes the D513 layer is off. Check whether the band's kit, which follows the entries itself, makes the preset drums redundant.", { bar: 1, drums: 0, b: "abbeyRoad:1" }], ["The climax runs from b.26 to the peak at b.33 (7 bars): the longest build in Book I relative to the climax. Check that it does not make the middle of the fugue sound like an ending.", { bar: 26, drums: 1 }]],
  wtc1f17: [["PIPE ORGAN with TIMPANI in A♭ major. The timpani are away from the home key in 17 of 35 bars; the bass drum stands in half the time.", { drums: 1, bar: 10 }], ["Bach's voice is the bass here (the second to enter). On the organ the pedal is the player's: check that the pedal's 16′ does not overwhelm the manuals when lifted.", { bar: 1, solo: 3 }]],
  wtc1f18: [["PIANO for the G♯ minor fugue, Busoni leading with 14 marks. Drums are optional; JAZZ KIT on the piano is a lounge sound. Test TIMPANI (style 3) for the dark final pages.", { drums: 3, bar: 35 }]],
  wtc1f19: [["Busoni prints only 2 marks: the band is flat in dynamics. The JAZZ QUARTET script (11 moments) carries the shape instead. With DRUMS on, the preset replaces those scripted brushes; keep DRUMS off as the default here.", { drums: 0, bar: 1 }], ["The bass (double bass) at the 6 dB cap, the alto 5.1 dB up: the balance is near its limit. If the bass still vanishes on a phone, the vibraphone's sustain may be masking it.", { bar: 4, solo: 2 }]],
  wtc1f20: [["KRAUTROCK on the 87-bar A minor fugue: motorik under a long learned fugue is the boldest choice in the game. Not clear by D513 (episodes short); the motorik's constancy is the point, so let it be.", { bar: 1 }], ["The pedal at b.83–87 overlaps the climax and the drum break at b.83 coincides with it: the beat stops just as the pedal starts. That can be a strong effect; check it is intentional.", { bar: 80, drums: 1 }]],
  wtc1f21: [["SID 64 on B♭ major: the climax window starts early (b.33 of 48, a third of the fugue). The busy pattern from b.37 may feel like the end arrives too soon.", { bar: 33, drums: 1 }]],
  wtc1f22: [["SOLO VOICES for the five-voice B♭ minor fugue (stile antico): the right instinct. Drums are foreign to it; TIMPANI at most, and only from the final stretto.", { drums: 1, bar: 65 }], ["Five singers: check the inner voices in the dense stretti of the second half; mute the soprano to hear whether alto and tenor are clear.", { bar: 50, mute: "0" }]],
  wtc1f23: [["VOCAL SYNTH on B major; the timpani are always at home (0 bars away). Only 3 inner episodes: the D513 contrast is just over the threshold.", { drums: 3, bar: 20 }]],
  wtc1f24: [["The end of Book I. STRING CONSORT with three upper voices lifted 4–5 dB: the cello is now the softest line. The climax at b.67–76 is the biggest moment in the book. Compare TIMPANI against no drums there.", { drums: 1, bar: 63 }], ["The episode at b.63–66 before the climax: the drums go to 55% and roll out, then break before the final entry at b.69. Listen to the whole sequence once with each style.", { bar: 61, drums: 3 }], ["Consort stops (con sordino) for the opening exposition would give the ending's arco more meaning; the stops are the player's, not the band's, so this is a design question.", { bar: 1 }]],
  wtc2f01: [["MEGA FM on C major's opening fugue: CHIP KIT. 18 of 83 bars away from home.", { drums: 1, bar: 1 }]],
  wtc2f02: [["Not clear by D513 and no break before the final entry (no episode precedes it): the drums play one pattern from start to end. On PIPE ORGAN, drums OFF is the honest default for this stretto fugue.", { drums: 0, bar: 19 }]],
  wtc2f03: [["SID 64, Busoni with 2 marks: the colour plan would lead, but SID 64 has no plan for this fugue. The form layer and the drums are the only shape. Pedals at b.28–30 and 33–35 sit inside a long climax (b.22–35).", { bar: 22, drums: 1 }]],
  wtc2f04: [["JAZZ QUARTET on a 12/16 gigue at 0.54 s a beat: brushes in compound time. The bass is at 5.9 dB trim.", { bar: 1, solo: 2 }]],
  wtc2f05: [["BACH BRASS (The Bell Tower) with TIMPANI: Busoni leaves it (2 marks), so the colour plan's 5 moments are heard. The beat is slow (1.9 s): timpani rolls are long. Check the final roll under the last chord.", { drums: 1, bar: 44 }]],
  wtc2f06: [["SID 64 on a D minor fugue with 20 Busoni marks: the tone moves with his dynamics. Short (27 bars), so the climax is compact.", { bar: 20, drums: 1 }]],
  wtc2f07: [["PIPE ORGAN, 70 bars at ♩ 124: the climax from b.51 to the arrival at b.70 is 27% of the fugue. A plenum held for 19 bars may be tiring; check the hold.", { bar: 51, drums: 1 }]],
  wtc2f08: [["STRING CONSORT; Busoni prints nothing, so the plan's 3 moments lead. Contrast is not clear. Drums, if any: TIMPANI only.", { drums: 1, bar: 30 }]],
  wtc2f09: [["SOLO VOICES with no Busoni marks: the plan leads. 4/2 at ♩ 100. Drums do not belong here; consider removing ELECTRO from the options.", { bar: 1 }]],
  wtc2f10: [["SID 64 on E minor at ♩ 110, 86 bars: the climax holds from the peak at b.71 to b.86, 15 bars. Listen for the plateau.", { bar: 69, drums: 1 }]],
  wtc2f11: [["CLASSIC CHIP in 6/16: the pedal at b.76–82 runs just before the climax rise (b.83). A good place for the drums to drop to the episode pattern.", { bar: 74, drums: 1 }]],
  wtc2f12: [["JAZZ QUARTET's own script (10 moments) shapes this fugue; with DRUMS on, the preset replaces it. Keep DRUMS off by default; compare the band's own brushes with style 1.", { drums: 0, bar: 15, b: "jazzQuartet:1" }]],
  wtc2f13: [["The only fugue on HARPSICHORD. Its plan has 9 moments, all silent under Busoni (17 marks). The harpsichord's registration terraces under Busoni are the game's showcase for D513's FORM_REG (8′, 8′8′, 8′8′4′): check them.", { bar: 1, busoni: 0, b: "harpsichordSampled:0" }]],
  wtc2f14: [["PIANO; Busoni 1 mark, so the plan's 4 moments lead. 70 bars, 9 episodes: rolls in and out often. Consider JAZZ KIT off and TIMPANI for the climax only.", { bar: 62, drums: 3 }]],
  wtc2f15: [["TRACKER on a 3/8 fugue at 0.39 s a beat; not clear by D513 and 32 of 72 bars away from home. The soprano is 4.9 dB up. CHIP KIT on the beat alone keeps it clean.", { drums: 1, bar: 1 }]],
  wtc2f16: [["BAROQUE BAND on G minor 3/4 with FRAME DRUM first: the tenor sits at the 6 dB cap (viola).", { bar: 1, solo: 2 }]],
  wtc2f17: [["CLASSIC CHIP on A♭ major (the owner's D510 choice). A short climax at the end.", { drums: 1, bar: 44 }]],
  wtc2f18: [["The longest fugue (143 bars), a double fugue: JAZZ QUARTET, Busoni prints nothing. 11 episodes: the drums roll in and out many times; brushes keep it light. The second subject's arrival is a natural act change for the sound.", { bar: 61, drums: 1 }], ["Pedal at b.132–134 inside the climax (133–143).", { bar: 130, drums: 1 }]],
  wtc2f19: [["SUPER 16-BIT on A major 4/4: CHIP KIT. 29 bars.", { drums: 1, bar: 20 }]],
  wtc2f20: [["SWITCHED-ON; Busoni 2 marks, so the plan leads (1 moment).", { drums: 1, bar: 20 }]],
  wtc2f21: [["BAROQUE BAND in 3/4 at ♩ 105; Busoni 1 mark, but BAROQUE BAND has no plan here, so the band's shape is the form layer alone. The climax holds from b.78 to b.93: 15 bars at full level.", { bar: 76, drums: 1 }]],
  wtc2f22: [["PIPE ORGAN in 3/2, 101 bars, the Colossus. TIMPANI away from home 33 bars. The plenum from the final entry is the game's grandest registration change: listen at b.94.", { bar: 94, drums: 1 }]],
  wtc2f23: [["ZELENKA TRIO on four voices: the continuo cello is the fourth voice. 12 episodes: the most in the 48. The rolls may dominate; test drums off.", { bar: 1, drums: 0 }]],
  wtc2f24: [["JAZZ QUARTET on the last fugue (3/8): it ends the WTC on a light note. The climax arrives at the very end (b.95–100). Consider whether the last fugue of the 48 should end on brushes.", { bar: 94, drums: 1 }]],
};

// Global suggestions.
const GLOBAL = [
  `Busoni leads on ${R.fugues.filter((f) => f.busoni.leads).length} of 48 fugues, so the colour plans written for each fugue's own sound are heard on only ${R.fugues.filter((f) => f.colourPlan.active).length} (${R.fugues.filter((f) => f.colourPlan.active).map((f) => f.tag).join(", ")}). The registration and timbre moments are the most sound-specific thing in the game and are mostly silent. Consider letting a plan's registration (reg), pulse width (pw) and filter (lp) moments sound under Busoni, with Busoni keeping only the level.`,
  "JAZZ QUARTET is the default of 7 fugues (I/6, I/14, I/19, II/4, II/12, II/18, II/24); HARPSICHORD, GAME BOY, SUPER 16-BIT, TRACKER, TOMITA and KRAUTROCK are the default of one each, and WIND QUINTET (trial) of none. The harpsichord, the instrument the WTC was written for, opens only II/13.",
  "The default drum style is always the first of three and is chosen by the default sound (consoles: electronic; piano and jazz: acoustic; church and court: percussion). ELECTRO is offered on 37 fugues (second on 32). For the stile antico fugues (I/1, I/4, I/22, II/9) consider offering fewer styles, or none.",
  `The D508 balance lifts a voice 5 dB or more (the cap is 6) in ${R.fugues.filter((f) => f.seats.some((s) => s.trimDb >= 5)).map((f) => f.tag).join(", ")}. Several of these are JAZZ QUARTET's double bass. The recording may need a fuller layer in its low range rather than more gain.`,
  "The drum break before the final entry is a bar of silence in 47 of 48 fugues. It is the same gesture everywhere; consider varying it by style (a cymbal choke for the kits, a timpani roll for TIMPANI, nothing for the brushes).",
  "The climax build is the same size everywhere (+0.6 dB, +0.5 dB of shelf, +0.05 room). For the big endings (I/24, II/22, I/8, II/18) a larger build, and for the small ones (I/9, II/19) a smaller one, would follow the music. A per-fugue climax size in form-points.ts would do it.",
  "Pedal points overlap the climax window in I/1, I/2, I/4, I/14, I/15, I/20, II/3 and II/18. In each, the drums' busiest pattern lands on a held bass. A rule 'drums thin out over a pedal' would apply to all of them at once.",
  "Subject effects: the shimmer, ping and brass layers of the per-fugue subject effects are silenced (D505); only echo and halo layers and the room sends remain. Most Book II fugues use the generic effect (a room send). If subject colour is wanted again, it would have to come from the instruments themselves (the consort's stops, the organ's registration) rather than layers.",
  "SLIDE_SOUND is 'auto': strings and voices take the instruments' portamento, all others the D486 gesture at arrival. The two alternatives (?slide=d486, ?slide=instruments on play.html) are untested on the band presets (ZELENKA TRIO's reeds, BACH BRASS) which take D486's reed and brass gestures under auto.",
  "Drums are off by default for every fugue (D344). If the owner wants the game to sound like its best demonstrations, consider turning drums on by default for the fugues where they clearly work (ABBEY ROAD and KRAUTROCK carry their own kits already; I/12, I/7, II/1 and the consoles' fugues with ELECTRO or CHIP KIT).",
];

// ---- The page. ----
function presetCard(p) {
  const n = p.defaultFor.length;
  const flag = p.trial ? "trial, not offered" : n === 0 ? "no fugue" : n === 1 ? "one fugue" : n <= 2 ? "two fugues" : "";
  const lay = (k) => (p.layouts[k] ?? []).map((s) => `${vn(Number(k), s.voice)}: ${esc(s.name)}${s.level !== 1 ? ` (×${s.level})` : ""}`).join("; ");
  return `<article class="preset" id="sound-${p.id}" data-sound="${p.id}">
  <header><h3>${esc(p.name)}</h3>${flag ? `<span class="pill warn">${flag}</span>` : ""}<span class="pill">${n} fugue${n === 1 ? "" : "s"}</span></header>
  <dl>
    <dt>Instruments</dt><dd>${p.patches.map((x) => esc(x.name)).join(", ")}</dd>
    <dt>Three voices</dt><dd>${lay(3)}</dd>
    <dt>Four voices</dt><dd>${lay(4)}</dd>
    <dt>Five voices</dt><dd>${lay(5)}</dd>
    <dt>Room</dt><dd>${p.fx ? `own effect "${p.fx}"` : `shared room ${p.room}`}; level ×${p.gain}, phone ×${p.phoneGain}</dd>
    <dt>Touch</dt><dd>family ${p.touch.expr}; touch kind ${p.touch.touchKind ?? "none"}; phrasing ${p.touch.phrasing}; drag ${p.touch.drag}${p.touch.keyboardSlide ? `; keyboard slide: ${p.touch.keyboardSlide}` : ""}</dd>
    <dt>Slide</dt><dd>${p.slide.families.join(", ")} gesture; sound mode under auto: ${p.slide.mode === "instruments" ? "the instrument's portamento following the thumb" : "D486's gesture on arrival"}</dd>
    <dt>Dynamics</dt><dd>Busoni ${p.busoni.reaches ? "reaches it" : "does not reach it"}: ${esc(p.busoni.how)}</dd>
    ${p.stops ? `<dt>Pistons</dt><dd>${p.stops.join(", ")} (the player's own stops)</dd>` : ""}
    ${p.consortStops ? `<dt>Stops</dt><dd>${p.consortStops.join(", ")} (the player's articulation)</dd>` : ""}
    ${p.formReg ? `<dt>Form registration</dt><dd>episode [${p.formReg.episode.join(" ") || "8′"}], subject [${p.formReg.subject.join(" ")}], climax [${p.formReg.climax.join(" ")}]</dd>` : ""}
    <dt>Drums</dt><dd>${p.ownDrums ? `own kit always (${p.ownDrums.groove}, ${p.ownDrums.kit}); with DRUMS on the chosen style replaces it` : "none of its own"}${p.drumFirst ? `; drum style 1 for its fugues: ${p.drumFirst}` : ""}</dd>
    <dt>Default for</dt><dd>${p.defaultFor.length ? p.defaultFor.map((id) => `<a href="#${id}">${tagOf(id)}</a>`).join(", ") : "none"}</dd>
  </dl>
  <p class="links">${a(lab(p.defaultFor[0] ?? "wtc1f01", { sound: p.id }), "Hear it in the Sound Lab")}</p>
</article>`;
}
const tagOf = (id) => `${id.startsWith("wtc1") ? "I" : "II"}/${Number(id.slice(-2))}`;

function fugueSection(f) {
  const d = f.drums;
  const fm = f.form;
  const z = f.zones;
  const firstEp = fm.seams.find((s) => s.kind === "episode");
  const moments = [
    ["Start", 1],
    firstEp ? ["First episode", firstEp.from] : null,
    ["Climax rise", fm.climax.rise],
    ["Final entry", z.finalEntry],
    ["Peak", fm.climax.peak],
    ["End", Math.max(1, f.bars - 2)],
  ].filter(Boolean);
  const momentLinks = moments.map(([t, b]) => `<li>${t} b.${b}: ${L(f, "own sound", { bar: b })} · ${L(f, "with drums 1", { bar: b, drums: 1 })}</li>`).join("");
  const seats = f.seats
    .map((s) => `<tr${s.voice === f.bachVoice ? ' class="bach"' : ""}><td>${esc(s.voiceName)}${s.voice === f.bachVoice ? " ★" : ""}</td><td>${esc(s.name)}</td><td class="num">${midi(s.lo)}–${midi(s.hi)}</td><td class="num">${s.pan > 0 ? "R" : s.pan < 0 ? "L" : "C"} ${Math.abs(s.pan)}</td><td class="num">${s.trimDb ? `+${s.trimDb}` : "0"}</td><td class="num">${s.playerLiftDb > 0 ? "+" : ""}${s.playerLiftDb}</td><td class="num">${s.notes}</td></tr>`)
    .join("");
  const seams = fm.seams.map((s) => `<li class="k-${s.kind}">${L(f, `b.${s.from}–${s.to}`, { bar: s.from })} ${KIND[s.kind]}${s.stretto ? " (stretto)" : ""} · act ${s.act}</li>`).join("");
  const sugg = [...(HAND[f.id] ?? []).map(([t, l]) => ({ t, l, hand: true })), ...ruleSuggestions(f)];
  const drumRows = d.presets
    .map((p) => `<tr><td>${p.n}${p.n === 1 ? " (default)" : ""}</td><td>${esc(p.name)}</td><td>${esc(STYLE_WORDS[p.style])}</td><td>${L(f, "start", { drums: p.n, bar: 1 })} · ${firstEp ? L(f, "episode", { drums: p.n, bar: Math.max(1, firstEp.from - 1) }) + " · " : ""}${L(f, "climax", { drums: p.n, bar: Math.max(1, fm.climax.rise - 1) })} · ${L(f, "end", { drums: p.n, bar: Math.max(1, f.bars - 3) })}</td></tr>`)
    .join("");
  const plan = f.colourPlan.moments.length
    ? `<ul class="plan">${f.colourPlan.moments.map((m) => `<li><b>b.${m.bar}</b> ${esc(JSON.stringify(m.c).replace(/[{}"]/g, "").replace(/,/g, ", "))}: ${esc(m.why)}</li>`).join("")}</ul>`
    : "<p>No colour plan for this sound.</p>";
  const fx = f.subjectFx;
  const fxLine = (x, label) => (x ? `<li>${label}: <b>${esc(x.name)}</b>, room ${x.room}; layers ${x.layers.length ? x.layers.map((l) => `${l.kind}${l.heard ? "" : " (silenced, D505)"}`).join(", ") : "none"}. ${esc(x.why)}</li>` : "");
  const busoni = f.busoni.has
    ? `Busoni's edition: “${esc(f.busoni.heading ?? "")}” ${f.busoni.dyn} dynamics, ${f.busoni.hairpins} hairpins, ${f.busoni.marks} articulation marks, ${f.busoni.slurs} slurs. First levels: ${f.busoni.firstDyn.map((x) => `b.${x.bar} ${esc(x.mark)}`).join(", ")}. ${f.busoni.leads ? "<b>Busoni leads</b>: the colour plan stands aside." : "Too few marks to lead: the colour plan sounds."}`
    : "No Busoni edition: the phrasing model alone.";
  const trio = f.trio ? `<p><b>Continuo script</b> (ZELENKA TRIO): ${f.trio.continuo.map((m) => `b.${m.bar} ${m.io}`).join(", ")}.</p>` : "";
  const ownKit = d.ownKit ? `<p><b>The band's own kit</b> (${d.ownKit.groove}, always on with DRUMS off): ${d.ownKit.moments ? d.ownKit.moments.map((m) => `b.${m.bar} ${m.kind}`).join(", ") : "pattern from the form"}.</p>` : "";
  const jazz = d.jazzScript ? `<p><b>Scripted brush fills</b> (D503): ${d.jazzScript.map((m) => `b.${m.bar} ${m.kind}`).join(", ")}.</p>` : "";
  const defStyle = d.presets[0].style;
  const flags = [!z.clear ? "flat" : "", f.colourPlan.standsAsideForBusoni ? "plan-silent" : "", fm.climaxOverPedal ? "pedal-climax" : "", f.seats.some((s) => s.trimDb >= 5) ? "trim-cap" : ""].filter(Boolean).join(" ");
  return `<section class="fugue" id="${f.id}" data-sound="${f.sound.id}" data-drum="${defStyle}" data-flags="${flags}">
  <header class="fh">
    <div><p class="eyebrow">${f.tag} · ${esc(f.title)} · ${f.meter} · ${f.voices} voices · ${f.bars} bars · ♩ ${f.tempo.bpm}${f.tempo.steps ? ` (slow ${f.tempo.steps.slow}, fast ${f.tempo.steps.fast})` : ""}</p>
    <h2>${esc(f.name)}</h2></div>
    <p class="sound"><span class="pill solid">${esc(f.sound.name)}</span> <span class="pill">drums 1: ${esc(d.presets[0].name)}</span></p>
  </header>
  <div class="cols">
  <div class="col">
    <h3>Default sound and why</h3>
    <p>${esc(f.sound.why ?? "")}</p>
    <p class="dim">${esc(f.sound.character ?? "")}</p>
    ${f.sound.otherPlans.length ? `<p class="dim">Colour plans also written for: ${f.sound.otherPlans.map(sname).join(", ")}.</p>` : ""}
    <h3>Voices and instruments</h3>
    <div class="tw"><table><thead><tr><th>Voice</th><th>Instrument</th><th>Range</th><th>Pan</th><th>Trim dB</th><th>Player dB</th><th>Notes</th></tr></thead><tbody>${seats}</tbody></table></div>
    <p class="dim">★ Herr Bach's voice in the lab (play.html's first offer). Trim: D508's band lift for this voice (${f.balance.measured ? "measured on this fugue" : "the sound's general table"}). Player dB: the level when the player takes the voice. Entries: player +${R.constants.balance.PLAYER_ENTRY_DB} dB, band +${R.constants.balance.BAND_ENTRY_DB} dB.</p>
    ${trio}
    <h3>Form</h3>
    <ol class="seams">${seams}</ol>
    <p>${fm.acts} acts, from b.${fm.actOn.join(", b.")}. Climax: rises b.${fm.climax.rise}, peak b.${fm.climax.peak}, arrival b.${fm.climax.arrival}. ${fm.pedals.length ? `Pedal points: ${fm.pedals.map((p) => `b.${p.from}–${p.to}`).join(", ")}.` : "No pedal point in the last quarter."} ${fm.cadences.length} cadences${fm.cadences.length ? `, the last b.${fm.cadences[fm.cadences.length - 1].bar} (${esc(fm.cadences[fm.cadences.length - 1].name)})` : ""}.</p>
    <h3>Changes in sound during a run</h3>
    <ul>
      <li><b>D513 zones</b>: ${z.clear ? `contrast clear (${z.episodes} inner episodes, ${Math.round(z.episodeShare * 100)}%). Subject zones +${R.constants.form.SUBJECT_DB} dB and a +${R.constants.form.SUBJECT_TONE} dB shelf; episodes ${R.constants.form.EPISODE_DB} dB and ${R.constants.form.EPISODE_TONE} dB shelf; the arc rises from ${R.constants.form.ARC_FROM_DB} dB.` : "contrast not clear: no subject/episode colour on the band."}${z.formReg ? ` Registration: episodes [${z.formReg.episode.join(" ") || "8′"}], subjects [${z.formReg.subject.join(" ")}], climax [${z.formReg.climax.join(" ")}].` : ""}</li>
      <li><b>Climax build</b>: from b.${z.climaxFrom} to the peak at b.${z.peak}: +${R.constants.form.CLIMAX_DB} dB, shelf to +${R.constants.form.CLIMAX_TONE}, room +${R.constants.form.CLIMAX_ROOM}; full registration from the final entry (b.${z.finalEntry}); at the arrival (b.${z.arrival}) the brightness lets go and the room opens +${R.constants.form.RESOLVE_ROOM}.</li>
      <li><b>Busoni</b>: ${busoni}</li>
      <li><b>Colour plan (${esc(f.sound.name)})</b>: ${f.colourPlan.active ? "heard." : f.colourPlan.standsAsideForBusoni ? "written but silent (Busoni leads)." : "none."} ${plan}</li>
      <li><b>Subject effect</b>${fx.tailored ? "" : " (generic)"}: <ul>${fxLine(fx.s1, "Subject")}${fxLine(fx.s2, "Second subject")}${fxLine(fx.s3, "Third subject")}${fxLine(fx.inverted, "Inverted")}${fxLine(fx.augmented, "Augmented")}</ul></li>
      <li><b>Pistons and stops</b>: ${P[f.sound.id]?.stops ? `the player's ${P[f.sound.id].stops.join(", ")}; the band follows the form's registration.` : P[f.sound.id]?.consortStops ? `the player's consort stops (${P[f.sound.id].consortStops.join(", ")}).` : "none on this sound."}</li>
    </ul>
  </div>
  <div class="col">
    <h3>Drums</h3>
    <div class="tw"><table><thead><tr><th>Style</th><th>Name</th><th>Character</th><th>Hear</th></tr></thead><tbody>${drumRows}</tbody></table></div>
    <p>Rolls (${d.rollBeats} beat${d.rollBeats > 1 ? "s" : ""}) into ${d.rollsInto.length ? `b.${d.rollsInto.join(", ")}` : "none"}; roll-outs into episodes at ${d.rollsOut.length ? `b.${d.rollsOut.join(", ")}` : "none"}. Episodes at ${Math.round(R.constants.drums.EPISODE_VEL * 100)}%. ${d.breakBar ? `Break (a bar's silence) at b.${d.breakBar}.` : "No break."} Climax level to ${Math.round(R.constants.drums.CLIMAX_VEL * 100)}%${d.busyFrom ? `, busier pattern from b.${d.busyFrom}` : ""}. Flourish into b.${d.flourishBar}; after the arrival a coda falls by ${Math.round(R.constants.drums.RESOLVE_FALL * 100)}%. Timpani on ${midi(d.timpani.tonic)} and ${midi(d.timpani.dominant)}; away from home in ${d.timpani.awayBars} of ${d.timpani.ofBars} bars.</p>
    ${d.brushes ? `<p><b>Brush fills</b>: ${d.brushes.map((x) => `b.${x.bar} ${x.kind}`).join(", ")}.</p>` : ""}
    ${jazz}${ownKit}
    <h3>Stage climax (D475)</h3>
    <p>${esc(f.stage ?? "")} The climax light breaks over the same window (b.${fm.climax.rise}–${fm.climax.arrival}).</p>
    <h3>Sound Lab</h3>
    <ul class="moments">${momentLinks}</ul>
    <h3>Suggestions</h3>
    <ul class="sugg">${sugg.map((s) => `<li${s.hand ? ' class="hand"' : ""}>${esc(s.t)}${s.l ? ` ${a(lab(f.id, s.l), "Try it")}` : ""}</li>`).join("")}</ul>
    <h3><label for="notes-${f.id}">Notes</label></h3>
    <textarea id="notes-${f.id}" data-id="${f.id}" rows="5" placeholder="Your notes on ${esc(f.tag)}"></textarea>
  </div>
  </div>
</section>`;
}

// Unused possibilities.
const usedSounds = new Set(R.fugues.map((f) => f.sound.id));
const unusedSounds = R.presets.filter((p) => !usedSounds.has(p.id));
const styleCount = {};
const styleDefault = {};
for (const f of R.fugues) for (const p of f.drums.presets) ((styleCount[p.style] = (styleCount[p.style] ?? 0) + 1), p.n === 1 && (styleDefault[p.style] = (styleDefault[p.style] ?? 0) + 1));
const UNUSED = [
  `Sounds never a default: ${unusedSounds.map((p) => `${p.name}${p.trial ? " (trial)" : ""}`).join(", ") || "none"}. Sounds used by one fugue: ${R.presets.filter((p) => p.defaultFor.length === 1).map((p) => p.name).join(", ")}.`,
  `Drum styles offered and how often each is the default: ${Object.entries(styleCount).map(([s, n]) => `${R.constants.drums.STYLE_NAMES[s]} offered ${n}×, default ${styleDefault[s] ?? 0}×`).join("; ")}.`,
  "DRUMS is off by default everywhere (D344). The three styles are heard only by players who switch them on.",
  `Withdrawn sounds and where a stored choice now opens: ${R.retired.map((x) => `${x.from} → ${x.to}`).join(", ")}.`,
  "WIND QUINTET (trial): flute, oboe, clarinet, horn, bassoon, recorded and balanced, never offered. Its slide gesture falls back to the chip family; it would need the reed and flute gestures before offering.",
  "CLASSIC CHIP's own drum loop (chipMarch) plays only with setDrums(true), which play.html never sets: the friends' DRUMS replaces it with the presets.",
  "SLIDE_SOUND alternatives: ?slide=d486 (every instrument the arrival gesture) and ?slide=instruments (the instruments' portamento and coulé) on play.html. Default auto.",
  "Subject effects' synthesized layers (shimmer, ping, brass) are kept in the data for every Book I fugue and silenced by SYNTH_LAYERS_SOUND = false (D505). The subject brightness and the others' dulling (D213) are off by default (LAB_DEFAULT.subject false); vibrato and stereo centring off.",
  "Colour plans for other sounds: most fugues have plans written for 2–4 other sounds (harpsichord, organ, chip, piano). They play only if the player chooses that sound and Busoni does not lead.",
  "OFFER_READINGS (Keller, Bodky and others as alternative readings) is off: only Busoni's reading is played. EXPRESSIVE_ALL (Busoni on every dynamic sound) is on.",
  "The consort's articulation stops (spiccato, pizzicato, con sordino, tremolo) and the harpsichord's and organ's pistons are the player's only. The band never changes articulation by itself; a form-driven stop change for the band (pizzicato episodes, for example) is an open idea.",
  "The Lab's hard tap (MECH.hardTap) and the motion sensor are off (D506); the strong zone gives the accents.",
];

const filtersSound = [...usedSounds].map((id) => `<option value="${id}">${esc(sname(id))}</option>`).join("");
const filtersDrum = Object.keys(R.constants.drums.STYLE_NAMES).map((s) => `<option value="${s}">${R.constants.drums.STYLE_NAMES[s]}</option>`).join("");
const index = R.fugues.map((f) => `<li data-sound="${f.sound.id}" data-drum="${f.drums.presets[0].style}"><a href="#${f.id}"><b>${f.tag}</b> ${esc(f.name)}<span>${esc(f.sound.name)} · ${esc(f.drums.presets[0].name)}</span></a></li>`).join("");

const html = `<title>WTG Instruments Report</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
/* Layout: a reading column for the catalogue, two columns per fugue on wide screens (facts left, drums, links and notes right). */
:root{--bg:#f6f6f2;--panel:#ffffff;--fg:#1d2026;--dim:#5d6270;--line:#d9dbd2;--accent:#7a4b12;--accent-bg:#f3e7d3;--warn:#a3341f;--warn-bg:#f8e1dc;
--expo:#4c79c9;--middle:#3f9b7a;--episode:#8a8f9e;--final:#c9783f;--coda:#7a5ca8;
--display:"Fraunces",Georgia,serif;--body:"IBM Plex Sans",system-ui,sans-serif;--mono:"IBM Plex Mono",ui-monospace,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#13151b;--panel:#1b1e26;--fg:#e8e9ec;--dim:#9ba1b0;--line:#30343f;--accent:#e2b56e;--accent-bg:#3a2e1a;--warn:#f08b74;--warn-bg:#3d2019;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#13151b;--panel:#1b1e26;--fg:#e8e9ec;--dim:#9ba1b0;--line:#30343f;--accent:#e2b56e;--accent-bg:#3a2e1a;--warn:#f08b74;--warn-bg:#3d2019;color-scheme:dark}
body{background:var(--bg);color:var(--fg);font:15px/1.5 var(--body)}
.wrap{max-width:1180px;margin:0 auto;padding-block:24px 64px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
h1,h2{font-family:var(--display);font-weight:600;text-wrap:balance;margin:0}
h1{font-size:2.1rem}h2{font-size:1.45rem}
h3{font-size:.78rem;letter-spacing:.09em;text-transform:uppercase;color:var(--dim);margin:18px 0 6px}
a{color:var(--accent)}a:focus-visible,button:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
p{margin:0 0 8px}.dim{color:var(--dim)}
.eyebrow{font:500 .76rem var(--mono);color:var(--dim);margin:0 0 4px}
.lede{max-width:70ch;color:var(--dim)}
nav.toc{display:flex;flex-wrap:wrap;gap:6px 16px;margin:14px 0;font-size:.9rem}
.bar{position:sticky;top:env(safe-area-inset-top,0px);z-index:5;background:var(--bg);border-bottom:1px solid var(--line);padding:10px 0;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:10;background:var(--bg)}
.bar label{font-size:.8rem;color:var(--dim)}
select,textarea,button{font:inherit;color:var(--fg);background:var(--panel);border:1px solid var(--line);border-radius:4px}
select{padding:5px 6px}
.count{font:.8rem var(--mono);color:var(--dim)}
.index{list-style:none;padding:0;margin:12px 0;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px}
.index a{display:block;padding:6px 8px;border:1px solid var(--line);border-radius:4px;background:var(--panel);text-decoration:none;color:var(--fg);font-size:.88rem}
.index a span{display:block;color:var(--dim);font-size:.76rem}
.presets{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px}
.preset{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:12px 14px;min-width:0}
.preset header{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.preset h3{font:600 1.05rem var(--display);color:var(--fg);text-transform:none;letter-spacing:0;margin:0 auto 0 0}
dl{display:grid;grid-template-columns:110px 1fr;gap:3px 10px;font-size:.84rem;margin:10px 0}
dt{color:var(--dim)}dd{margin:0;min-width:0}
.pill{font:500 .72rem var(--mono);border:1px solid var(--line);border-radius:999px;padding:2px 8px;white-space:nowrap}
.pill.solid{background:var(--accent-bg);border-color:transparent;color:var(--fg)}
.pill.warn{background:var(--warn-bg);color:var(--warn);border-color:transparent}
.fugue{border-top:2px solid var(--fg);padding-top:14px;margin-top:40px;scroll-margin-top:72px}
.fh{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;align-items:flex-end}
.cols{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:28px}
@media (max-width:860px){.cols{grid-template-columns:1fr}}
.col{min-width:0}
.tw{overflow-x:auto}
table{border-collapse:collapse;font-size:.82rem;width:100%}
th,td{text-align:left;padding:4px 6px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--dim);font-weight:500}
.num{font-variant-numeric:tabular-nums;white-space:nowrap}
tr.bach td{background:var(--accent-bg)}
.seams{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:4px 6px;font-size:.82rem}
.seams li{border-left:4px solid var(--k);padding:1px 6px;background:var(--panel)}
.k-exposition{--k:var(--expo)}.k-middle{--k:var(--middle)}.k-episode{--k:var(--episode)}.k-final{--k:var(--final)}.k-coda{--k:var(--coda)}
ul{padding-left:18px;margin:4px 0}li{margin:2px 0}
.plan{font-size:.82rem}
.sugg li{margin:6px 0}.sugg li.hand{font-weight:500}
.moments{font-size:.86rem}
textarea{width:100%;padding:8px;line-height:1.45;resize:vertical}
.global ol li{margin:8px 0;max-width:80ch}
.const{font:.8rem var(--mono);color:var(--dim);overflow-x:auto;white-space:pre-wrap}
@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
</style>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<div class="wrap">
<header>
  <p class="eyebrow">The Well-Tempered Game · ${R.version} · facts generated ${R.generated} from the code (tools/touch/sound-report.ts)</p>
  <h1>Instruments Report</h1>
  <p class="lede">Every sound the game offers, and for each of the 48 fugues: its sound and why, its voices' instruments, its form, everything that changes in the sound during a run, its three drummers, and suggestions to consider. Each “Try it” and each moment link opens the Sound Lab at that bar with those settings, playing the game's own engine and samples. Bold suggestions are written by hand; the others are derived from the data.</p>
  <nav class="toc"><a href="#catalogue">Sound catalogue</a><a href="#fugues">The 48 fugues</a><a href="#unused">Unused possibilities</a><a href="#global">Global suggestions</a><a href="#constants">Constants</a></nav>
</header>
<script>
/* The Sound Lab's address. */
const SOUND_LAB_BASE = ${JSON.stringify(BASE)};
</script>
<section id="catalogue"><h2>Sound catalogue</h2><p class="dim">${R.presets.length} sounds: ${R.presets.filter((p) => p.offered).length} offered, ${R.presets.filter((p) => p.trial).length} trial. A red pill marks a sound used by few or no fugues.</p><div class="presets">${R.presets.map(presetCard).join("")}</div></section>
<section id="fugues">
  <h2 style="margin-top:40px">The 48 fugues</h2>
  <div class="bar">
    <label for="f-sound">Sound</label><select id="f-sound"><option value="">All</option>${filtersSound}</select>
    <label for="f-drum">Drums 1</label><select id="f-drum"><option value="">All</option>${filtersDrum}</select>
    <label for="f-flag">Flag</label><select id="f-flag"><option value="">All</option><option value="flat">Contrast not clear</option><option value="plan-silent">Colour plan silent</option><option value="pedal-climax">Pedal in climax</option><option value="trim-cap">Voice at trim cap</option></select>
    <span class="count" id="f-count">48 of 48</span>
  </div>
  <ol class="index" id="index">${index}</ol>
  ${R.fugues.map(fugueSection).join("")}
</section>
<section id="unused" style="margin-top:48px"><h2>Unused possibilities</h2><ul>${UNUSED.map((u) => `<li>${esc(u)}</li>`).join("")}</ul></section>
<section id="global" class="global" style="margin-top:36px"><h2>Global suggestions</h2><ol>${GLOBAL.map((g) => `<li>${esc(g)}</li>`).join("")}</ol>
<h3><label for="notes-global">Global notes</label></h3><textarea id="notes-global" data-id="global" rows="8" placeholder="Your notes on the whole game's sound"></textarea></section>
<section id="constants" style="margin-top:36px"><h2>Constants</h2><p class="const">${esc(JSON.stringify(R.constants, null, 1))}</p></section>
</div>
<script>
(function(){
  var fs=document.getElementById('f-sound'),fd=document.getElementById('f-drum'),ff=document.getElementById('f-flag'),cnt=document.getElementById('f-count');
  function apply(){
    var s=fs.value,d=fd.value,g=ff.value,n=0;
    document.querySelectorAll('section.fugue').forEach(function(el){
      var ok=(!s||el.dataset.sound===s)&&(!d||el.dataset.drum===d)&&(!g||(' '+el.dataset.flags+' ').indexOf(' '+g+' ')>=0);
      el.hidden=!ok; if(ok)n++;
      var li=document.querySelector('#index a[href="#'+el.id+'"]'); if(li) li.parentNode.hidden=!ok;
    });
    cnt.textContent=n+' of 48';
  }
  [fs,fd,ff].forEach(function(x){x.addEventListener('change',apply)});
})();
</script>
`;
writeFileSync(OUT, html);
console.log(OUT, (html.length / 1024).toFixed(0), "KB");

/**
 * D497, THE SOUND LAB (soundlab.html, reached by its address only): the 48 fugues played through by Herr Bach on the
 * game's own engine, with every sound switch at hand, a scrub bar drawn with the fugue's form, the mixer, an A/B and
 * deep links (lab-state.ts) for the instruments report.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { barAt, barStart, cadenceName, fugueById } from "../../touch/fugue.ts";
import { formOf as pointsOf, phaseAt } from "../../touch/form-points.ts";
import { formOf as soundFormOf } from "../../touch/fugue-form.ts";
import { homeFor, styleInfo } from "../../touch/drum-library.ts";
import { FAMILY_LABEL, padGroups, padStyle } from "./drum-pad.ts";
import { IDEAS, ideaPlayable, ideaSettings, KIND_NAME, type Idea } from "./ideas.ts";
import { PIECE_SOUND } from "../../touch/piece-sound.ts";
import { FUGUE_NAMES } from "../../touch/fugue-names.ts";
import { Emblem } from "../FuguePicker.tsx";
import { stepTempi } from "../tempo-steps.ts";
import { VERSION } from "../version.ts";
import { bachVoice, bpmOf, FUGUES, LAB_SOUNDS, LabEngine, soundName, soundOf, type LabStatus } from "./lab-engine.ts";
import { defaults, linkOf, parseLink, type ABSlot, type LabSettings } from "./lab-state.ts";
import { seatsOf, voiceName } from "./facts.ts";
import { summaryOf } from "./summary.ts";
import { issueUrl, loadNote, noteBody, saveNote } from "./notes.ts";
import { loadColours } from "../../touch/colour.ts";

const nameOf = (id: string) => FUGUE_NAMES[id]?.en.full ?? id;
const tagOf = (id: string) => `${id.startsWith("wtc1") ? "I" : "II"}/${Number(id.slice(-2))}`;
const KIND_LABEL: Record<string, string> = { exposition: "EXPOSITION", episode: "EPISODE", middle: "MIDDLE ENTRIES", final: "FINAL GROUP", coda: "CODA" };

function initial(): { s: LabSettings; bar: number | null; b: ABSlot | null } {
  const l = parseLink(typeof location !== "undefined" ? location.hash : "", (id) => FUGUES.includes(id));
  return { s: l.settings, bar: l.bar, b: l.b };
}

export function SoundLab() {
  const init = useMemo(initial, []);
  const engine = useMemo(() => new LabEngine(init.s), []);
  const [s, setS] = useState<LabSettings>(init.s);
  const [st, setSt] = useState<LabStatus>(() => engine.status());
  const [b, setB] = useState<ABSlot>(init.b ?? { sound: null, drums: init.s.drums ? 0 : 1 });
  const [abOn, setAbOn] = useState<"A" | "B">("A");
  const [picker, setPicker] = useState(false);
  const [ideas, setIdeas] = useState(false);
  const [ideaOn, setIdeaOn] = useState<string | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [loopSec, setLoopSec] = useState<number | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [note, setNote] = useState(() => loadNote(init.s.piece));
  const [copied, setCopied] = useState(false);
  const [plansIn, setPlansIn] = useState(0);
  useEffect(() => {
    void loadColours().then(() => setPlansIn(1), () => {});
  }, []);
  useEffect(() => {
    setNote(loadNote(s.piece));
    setCopied(false);
  }, [s.piece]);
  const f = useMemo(() => fugueById(s.piece), [s.piece]);
  const form = useMemo(() => pointsOf(f), [f]);
  const sform = useMemo(() => soundFormOf(f), [f]);
  const n = f.voices.length;
  const lastBar = f.bars[f.bars.length - 1]?.n ?? 1;

  // The status at about 15 frames a second; the address kept with the setting and the bar.
  useEffect(() => {
    const off = engine.on(() => setSt(engine.status()));
    const id = window.setInterval(() => setSt(engine.status()), 66);
    if (init.bar !== null) engine.seekBar(init.bar);
    (window as unknown as { __soundlab?: LabEngine }).__soundlab = engine;
    return () => {
      off();
      window.clearInterval(id);
      engine.dispose();
    };
  }, []);
  useEffect(() => {
    const h = linkOf(s, st.bar, b);
    if (location.hash !== h) history.replaceState(null, "", h);
  }, [s, st.bar, b]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName ?? "")) return;
      if (e.key === " ") (e.preventDefault(), engine.toggle());
      else if (e.key === "ArrowRight") engine.seekBar(Math.min(lastBar, engine.status().bar + 1));
      else if (e.key === "ArrowLeft") engine.seekBar(Math.max(f.bars[0]?.n ?? 1, engine.status().bar - 1));
      else if (e.key === "x" || e.key === "X") flip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const change = (p: Partial<LabSettings>) => {
    const next = { ...s, ...p };
    setS(next);
    void engine.set(next, [b]);
  };
  const flip = () => {
    const other: ABSlot = { sound: s.sound, drums: s.drums, style: s.style };
    setB(other);
    setAbOn(abOn === "A" ? "B" : "A");
    const next = { ...s, sound: b.sound, drums: b.drums, style: b.style ?? null };
    setS(next);
    void engine.set(next, [other]);
  };
  const pick = (id: string) => {
    setPicker(false);
    setLoopSec(null);
    engine.loop = null;
    const next = { ...defaults(id), drums: s.drums ? 1 : 0, style: s.style };
    setS(next);
    void engine.set(next);
  };
  // D531: an IDEA loaded whole (fugue, sound, drums, layers, tempo) and played from its bar.
  const tryIdea = (it: Idea) => {
    if (!ideaPlayable(it)) return;
    setIdeas(false);
    setPicker(false);
    setLoopSec(null);
    engine.loop = null;
    setIdeaOn(it.id);
    const next = ideaSettings(it);
    setS(next);
    void engine.start(next, it.bar);
  };
  const toggleLoop = (i: number) => {
    const sm = form.seams[i];
    if (loopSec === i) {
      setLoopSec(null);
      engine.loop = null;
      return;
    }
    setLoopSec(i);
    engine.loop = { from: barStart(f, barAt(f, sm.on)), to: Math.max(sm.end, barStart(f, barAt(f, sm.on)) + f.barTicks) };
    engine.seek(engine.loop.from);
    if (!engine.status().playing) void engine.play();
  };

  const tickAtX = (x: number) => {
    const r = strip.current?.getBoundingClientRect();
    if (!r) return 0;
    return Math.max(0, Math.min(1, (x - r.left) / r.width)) * f.length;
  };
  const snap = (t: number) => barStart(f, barAt(f, t));
  const down = (e: RPointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag(snap(tickAtX(e.clientX)));
  };
  const move = (e: RPointerEvent<HTMLDivElement>) => drag !== null && setDrag(snap(tickAtX(e.clientX)));
  const up = (e: RPointerEvent<HTMLDivElement>) => {
    if (drag === null) return;
    const t = snap(tickAtX(e.clientX));
    setDrag(null);
    engine.seek(t);
  };

  const shown = drag ?? st.tick;
  const pct = (t: number) => `${(100 * Math.max(0, Math.min(f.length, t))) / f.length}%`;
  const ph = phaseAt(form, Math.max(0, shown));
  const tempi = stepTempi(s.piece);
  const own = PIECE_SOUND[s.piece] ?? "chip";
  const snd = soundOf(s);
  const groups = padGroups(s.piece, snd);
  const styleNow = padStyle(s, snd);
  const seats = seatsOf(snd, f);
  const bach = bachVoice(f, s);
  const link = `${location.origin}${location.pathname}${linkOf(s, st.bar)}`;
  const drumName = (st: string | null) => (st ? `${styleInfo(st).label}${st === homeFor(s.piece, snd) ? " (home)" : ""}` : "OFF");
  const summary = useMemo(() => summaryOf(f, s, snd), [f, s, snd, plansIn]);
  const settingsWords = `${soundName(snd)}${s.sound ? "" : " (own)"} · drums ${drumName(styleNow)} · tempo ${s.tempo} · Herr Bach on ${voiceName(bach, n)}${(["form", "climax", "busoni", "colour", "kit"] as const).filter((k) => !s[k]).map((k) => ` · ${k} off`).join("")}${s.solo !== null ? ` · solo ${voiceName(s.solo, n)}` : ""}${s.mute.length ? ` · muted ${s.mute.map((v) => voiceName(v, n)).join(", ")}` : ""} · bar ${st.bar} · ${VERSION}`;
  const sendUrl = issueUrl(`${tagOf(s.piece)} ${nameOf(s.piece)}`, noteBody(note, settingsWords, link));
  const copy = () => {
    const text = `Sound Lab notes: ${tagOf(s.piece)} ${nameOf(s.piece)}\n\n${noteBody(note, settingsWords, link)}`;
    const done = () => setCopied(true);
    const fallback = () => {
      const t = noteRef.current;
      if (t) (t.focus(), t.select());
    };
    try {
      void navigator.clipboard.writeText(text).then(done, fallback);
    } catch {
      fallback();
    }
  };

  return (
    <div className="sl">
      <header className="sl-head">
        <button type="button" className="sl-pic" onClick={() => setPicker(!picker)} aria-label="Choose a fugue">
          <Emblem id={s.piece} />
        </button>
        <div className="sl-title">
          <div className="sl-kicker">WTC SOUND LAB · HERR BACH PLAYS EVERY VOICE</div>
          <h1>
            {tagOf(s.piece)} · {nameOf(s.piece)}
          </h1>
          <div className="sl-sub">
            {f.title} · {f.meter} · {n} voices · {lastBar} bars · own sound {soundName(own)}
          </div>
        </div>
        <div className="sl-head-btns">
          <button type="button" className="sl-btn" onClick={() => (setPicker(!picker), setIdeas(false))}>
            {picker ? "CLOSE" : "48 FUGUES"}
          </button>
          <button type="button" className={`sl-btn sl-ideas-btn${ideas ? " on" : ""}`} id="sl-ideas-btn" onClick={() => (setIdeas(!ideas), setPicker(false))} aria-expanded={ideas}>
            {ideas ? "CLOSE" : "IDEAS"}
          </button>
        </div>
      </header>

      {ideas && (
        <section className="sl-panel sl-ideas" id="sl-ideas">
          <h2>IDEAS · {IDEAS.filter(ideaPlayable).length} TO TRY, ONE TAP EACH</h2>
          <p className="sl-note">Fugue, sound, drums and layers loaded together, played from the bar shown. COMING: S3's period drums, not playable yet.</p>
          {(["own", "safe", "tailored", "coming"] as const).map((k) => (
            <div key={k}>
              <h3 className="sl-ideas-h">{KIND_NAME[k]}</h3>
              <ol className="sl-idea-list">
                {IDEAS.filter((it) => (k === "coming" ? !ideaPlayable(it) : ideaPlayable(it) && it.kind === k)).map((it) => (
                  <li key={it.id}>
                    <button type="button" className={`${ideaOn === it.id ? "on" : ""}${ideaPlayable(it) ? "" : " coming"}`} onClick={() => tryIdea(it)} disabled={!ideaPlayable(it)} data-idea={it.id}>
                      <span className="sl-idea-t">
                        {tagOf(it.piece)} {nameOf(it.piece)} · {soundName(it.sound).replace(" (SAMPLED)", "")} · {styleInfo(it.style).id === it.style ? styleInfo(it.style).label : it.styleLabel ?? it.style}
                        {it.tempo && it.tempo !== "default" ? ` · ${it.tempo.toUpperCase()}` : ""}
                        {it.layers ? Object.entries(it.layers).map(([lk, on]) => ` · ${lk} ${on ? "on" : "off"}`).join("") : ""} · b.{it.bar}
                        {!ideaPlayable(it) && <span className="sl-own">COMING</span>}
                      </span>
                      <span className="sl-idea-w">{it.why}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      )}

      {picker && (
        <ol className="sl-grid" id="sl-picker">
          {FUGUES.map((id) => (
            <li key={id}>
              <button type="button" className={id === s.piece ? "here" : ""} onClick={() => pick(id)} data-piece={id}>
                <Emblem id={id} />
                <span className="sl-grid-t">
                  {tagOf(id)} · {nameOf(id)}
                </span>
                <span className="sl-grid-m">{soundName(PIECE_SOUND[id] ?? "chip")}</span>
              </button>
            </li>
          ))}
        </ol>
      )}

      <section className="sl-transport">
        <div className="sl-row">
          <button type="button" id="sl-play" className="sl-play" onClick={() => engine.toggle()} aria-label={st.playing ? "Pause" : "Play"}>
            {st.playing ? "❚❚" : "▶"}
          </button>
          <div className="sl-now">
            <div className="sl-bar" id="sl-bar">
              BAR {barAt(f, Math.max(0, shown))} <span>/ {lastBar}</span>
            </div>
            <div className="sl-phase">
              {KIND_LABEL[ph.kind]}
              {ph.stretto ? " · STRETTO" : ""} · ACT {ph.act + 1}/{form.acts}
              {ph.climax > 0 ? ` · CLIMAX ${Math.round(100 * ph.climax)}%` : ""}
              {ph.resolved > 0 ? " · RESOLVED" : ""}
              {ph.pedal ? " · PEDAL" : ""}
            </div>
          </div>
          <div className="sl-state">{st.loading ? "LOADING SOUNDS…" : st.playing ? `♩ ${st.bpm}` : "PAUSED"}</div>
        </div>
        <div className="sl-strip" ref={strip} onPointerDown={down} onPointerMove={move} onPointerUp={up} id="sl-strip">
          {form.seams.map((sm, i) => (
            <div key={i} className={`sl-seam k-${sm.kind}${sm.stretto ? " str" : ""}`} style={{ left: pct(sm.on), width: pct(sm.end - sm.on) }} title={`${KIND_LABEL[sm.kind]} b. ${barAt(f, sm.on)}–${barAt(f, Math.max(sm.on, sm.end - 1))}`} />
          ))}
          <div className="sl-climax" style={{ left: pct(form.climax.rise), width: pct(form.climax.arrival - form.climax.rise) }} title="climax: rise to arrival" />
          <div className="sl-peak" style={{ left: pct(form.climax.peak) }} title="climax peak (last entry)" />
          {form.pedals.map((p, i) => (
            <div key={i} className="sl-pedal" style={{ left: pct(p.on), width: pct(p.end - p.on) }} title="pedal point" />
          ))}
          {f.cadences.map((c, i) => (
            <div key={i} className="sl-cad" style={{ left: pct(c.on) }} title={`b. ${c.bar} ${cadenceName(c)}`} />
          ))}
          {f.entries.map((e, i) => (
            <div key={i} className="sl-entry" style={{ left: pct(e.on), top: `${(100 * e.voice) / n}%`, height: `${100 / n}%`, width: pct(e.end - e.on) }} />
          ))}
          <div className="sl-head-line" style={{ left: pct(shown) }} />
        </div>
        <div className="sl-ticks">
          {f.bars
            .filter((x) => x.n % (lastBar > 60 ? 10 : 5) === 0)
            .map((x) => (
              <span key={x.n} style={{ left: pct(x.on) }}>
                {x.n}
              </span>
            ))}
        </div>
        <div className="sl-legend">
          <span className="k-exposition">exposition</span> <span className="k-middle">middle</span> <span className="k-episode">episode</span> <span className="k-final">final group</span> <span className="k-coda">coda</span> <span className="lg-climax">climax</span> <span className="lg-pedal">pedal</span> <span className="lg-cad">cadence</span> <span className="lg-entry">subject entries by voice</span>
        </div>
        <ol className="sl-sections">
          {form.seams.map((sm, i) => (
            <li key={i}>
              <button type="button" className={`k-${sm.kind}`} onClick={() => engine.seek(barStart(f, barAt(f, sm.on)))}>
                b.{barAt(f, sm.on)} {KIND_LABEL[sm.kind]}
                {sm.stretto ? " (stretto)" : ""}
              </button>
              <button type="button" className={`sl-loop${loopSec === i ? " on" : ""}`} onClick={() => toggleLoop(i)} title="Loop this section">
                ⟲
              </button>
            </li>
          ))}
          <li>
            <button type="button" className="lg-climax" onClick={() => engine.seek(barStart(f, barAt(f, form.climax.rise)))}>
              b.{barAt(f, form.climax.rise)} CLIMAX RISE
            </button>
          </li>
          <li>
            <button type="button" className="lg-climax" onClick={() => engine.seek(barStart(f, barAt(f, form.climax.peak)))}>
              b.{barAt(f, form.climax.peak)} PEAK
            </button>
          </li>
          <li>
            <button type="button" className="lg-climax" onClick={() => engine.seek(barStart(f, barAt(f, form.climax.arrival)))}>
              b.{barAt(f, form.climax.arrival)} ARRIVAL
            </button>
          </li>
          {form.pedals.map((p, i) => (
            <li key={`p${i}`}>
              <button type="button" className="lg-pedal" onClick={() => engine.seek(barStart(f, barAt(f, p.on)))}>
                b.{barAt(f, p.on)} PEDAL
              </button>
            </li>
          ))}
        </ol>
        <div className="sl-row sl-small">
          <span>D513 contrast {sform.clear ? `clear (${sform.episodes} inner episodes, ${Math.round(100 * sform.episodeShare)}%)` : "not clear: drums keep the subject pattern"}</span>
          <span>{st.seekMs !== null ? `last seek ${Math.round(st.seekMs)} ms` : ""}</span>
        </div>
      </section>

      <section className="sl-panel">
        <h2>SOUND</h2>
        <div className="sl-pad" id="sl-sounds">
          {LAB_SOUNDS.filter((x) => !x.trial).map((x) => (
            <button type="button" key={x.id} className={`${snd === x.id ? "on" : ""}${x.id === own ? " own" : ""}`} onClick={() => change({ sound: x.id === own ? null : x.id })} data-sound={x.id} aria-pressed={snd === x.id}>
              {x.name.replace(" (SAMPLED)", "")}
              {x.id === own && <span className="sl-own">DEFAULT</span>}
            </button>
          ))}
        </div>
        <div className="sl-row wrap sl-voice-row">
          <span className="sl-label">HERR BACH PLAYS</span>
          <select id="sl-voice" value={bach} onChange={(e) => change({ voice: Number(e.target.value) })}>
            {f.voices.map((_, v) => (
              <option key={v} value={v}>
                {voiceName(v, n)}
              </option>
            ))}
          </select>
        </div>
        <h2>DRUMS</h2>
        <div className="sl-drumbar">
          <button type="button" className={`sl-drumoff${s.drums === 0 ? " on" : ""}`} onClick={() => change({ drums: 0 })} data-drums={0} aria-pressed={s.drums === 0}>
            OFF
          </button>
          <span className="sl-drumnow">{styleNow ? `${styleInfo(styleNow).label}: ${styleInfo(styleNow).why}` : "Tap a style. HOME: this sound's own; FITS: idiomatic in this fugue's metre."}</span>
        </div>
        <div className="sl-drumpad" id="sl-drums">
          {groups.map((g) => (
            <div key={g.family} className="sl-fam">
              <h3>{FAMILY_LABEL[g.family]}</h3>
              <div className="sl-fam-pad">
                {g.items.map((it) => (
                  <button
                    type="button"
                    key={it.style}
                    className={`${styleNow === it.style ? "on" : ""}${it.home ? " own" : ""}${it.fits ? " fits" : ""}${it.coming ? " coming" : ""}`}
                    disabled={it.coming}
                    onClick={() => change({ drums: 1, style: it.home ? null : it.style })}
                    data-style={it.style}
                    {...(it.home ? { "data-drums": 1 } : {})}
                    aria-pressed={styleNow === it.style}
                    title={it.coming ? "S3: score-driven period drums, coming" : styleInfo(it.style).why}
                  >
                    {it.name}
                    <span className="sl-marks">
                      {it.home && <span className="sl-mk home">HOME</span>}
                      {it.fits && <span className="sl-mk fits">FITS</span>}
                      {it.coming && <span className="sl-mk coming">COMING</span>}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <h2>LAYERS</h2>
        <div className="sl-seg wrap">
          {(
            [
              ["form", "SUBJECT/EPISODE (D513)"],
              ["climax", "CLIMAX BUILD"],
              ["busoni", "BUSONI'S DYNAMICS"],
              ["colour", "COLOUR PLANS"],
              ["kit", "BAND'S OWN KIT"],
            ] as const
          ).map(([k, label]) => (
            <button type="button" key={k} className={s[k] ? "on" : ""} onClick={() => change({ [k]: !s[k] } as Partial<LabSettings>)} data-layer={k}>
              {s[k] ? "✓ " : "✗ "}
              {label}
            </button>
          ))}
        </div>
        <h2>TEMPO</h2>
        <div className="sl-seg">
          {(["slow", "default", "fast"] as const).map((t) => (
            <button type="button" key={t} className={s.tempo === t ? "on" : ""} onClick={() => change({ tempo: t })} disabled={t !== "default" && !tempi}>
              {t.toUpperCase()} ♩{bpmOf(s.piece, t)}
            </button>
          ))}
        </div>
      </section>

      <section className="sl-panel">
        <h2>WHAT TO LISTEN FOR</h2>
        <ol className="sl-summary" id="sl-summary">
          {summary.map((it, i) => (
            <li key={i} className={`sm-${it.kind}`}>
              <button type="button" onClick={() => engine.seekBar(it.bar)} data-bar={it.bar}>
                <b>
                  b.{it.bar}
                  {it.to && it.to !== it.bar ? `–${it.to}` : ""}
                </b>{" "}
                {it.text}
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section className="sl-panel">
        <h2>
          <label htmlFor="sl-notes">NOTES FOR CLAUDE · {tagOf(s.piece)}</label>
        </h2>
        <textarea id="sl-notes" ref={noteRef} className="sl-notes" rows={5} value={note} placeholder={`What you hear in ${tagOf(s.piece)}, what to change…`} onChange={(e) => {
          setNote(e.target.value);
          setCopied(false);
          saveNote(s.piece, e.target.value);
        }} />
        <div className="sl-row wrap">
          <a className={`sl-btn sl-send${note.trim() ? "" : " off"}`} id="sl-send" href={sendUrl} target="_blank" rel="noopener" aria-disabled={!note.trim()} onClick={(e) => !note.trim() && e.preventDefault()}>
            SEND TO CLAUDE
          </a>
          <button type="button" className="sl-btn" id="sl-copy" onClick={copy}>
            {copied ? "COPIED" : "COPY"}
          </button>
        </div>
        <p className="sl-note">Notes save on this device. SEND opens a GitHub issue Claude can read (the repo is public).</p>
      </section>

      <section className="sl-panel">
        <h2>VOICES AND MIXER</h2>
        <table className="sl-mix">
          <tbody>
            {seats.map((seat) => (
              <tr key={seat.voice}>
                <td className="sl-vn">
                  {voiceName(seat.voice, n)}
                  {seat.voice === bach ? " ★" : ""}
                </td>
                <td className="sl-inst">{seat.name}</td>
                <td>
                  <input type="range" min={-24} max={12} step={1} value={s.levels[seat.voice] ?? 0} onChange={(e) => {
                    const lv = Array.from({ length: n }, (_, v) => s.levels[v] ?? 0);
                    lv[seat.voice] = Number(e.target.value);
                    change({ levels: lv });
                  }} aria-label={`${voiceName(seat.voice, n)} level`} />
                </td>
                <td className="sl-db">{(s.levels[seat.voice] ?? 0) > 0 ? "+" : ""}{s.levels[seat.voice] ?? 0} dB</td>
                <td>
                  <button type="button" className={`sl-ms${s.mute.includes(seat.voice) ? " on" : ""}`} onClick={() => change({ mute: s.mute.includes(seat.voice) ? s.mute.filter((x) => x !== seat.voice) : [...s.mute, seat.voice] })}>
                    M
                  </button>
                  <button type="button" className={`sl-ms${s.solo === seat.voice ? " on" : ""}`} onClick={() => change({ solo: s.solo === seat.voice ? null : seat.voice })}>
                    S
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="sl-note">★ the voice Herr Bach plays (the player's path: its lift, its entries +2 dB, its slide and touch). Mixer levels add to the game's own balance (D508).</p>
      </section>

      <section className="sl-panel">
        <h2>A/B</h2>
        <div className="sl-ab">
          <div className={abOn === "A" ? "on" : ""}>
            <b>NOW</b> {soundName(snd)} · DRUMS {drumName(styleNow)}
          </div>
          <div>
            <b>OTHER</b>
            <select value={soundOf({ ...s, sound: b.sound })} onChange={(e) => setB({ ...b, sound: e.target.value === own ? null : e.target.value })} id="sl-b-sound">
              {LAB_SOUNDS.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
            <select value={b.drums ? (b.style ?? "home") : "off"} onChange={(e) => setB({ ...b, drums: e.target.value === "off" ? 0 : 1, style: e.target.value === "off" || e.target.value === "home" ? null : e.target.value })} id="sl-b-drums">
              <option value="off">DRUMS OFF</option>
              <option value="home">DRUMS HOME</option>
              {groups.flatMap((g) => g.items.filter((x) => !x.coming)).map((x) => (
                <option key={x.style} value={x.style}>
                  DRUMS {x.name}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="sl-btn" id="sl-flip" onClick={flip}>
            FLIP ⇄ (X)
          </button>
        </div>
      </section>

      <section className="sl-panel">
        <h2>LINK TO THIS MOMENT</h2>
        <input className="sl-link" readOnly value={link} onFocus={(e) => e.target.select()} />
        <p className="sl-note">
          Live: drums, style, layers but Busoni, solo, mute, mixer. Rebuilt at the same bar (a short lead): sound, Busoni, tempo, Herr Bach's voice, and every seek. Keys: space play, ← → a bar, X flip.
        </p>
        {st.error && <p className="sl-note">{st.error}</p>}
      </section>
    </div>
  );
}

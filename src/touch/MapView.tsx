/**
 * The map (D164; D167; D168): a piece as a grid, its sections across (headed by their first bar, in
 * the colour of the key they reach), its parts (voices, or a prelude's hands) down, each cell the voice's best score in the section at the
 * chosen level, a star once earned. A diamond marks a voice carrying an entry of the subject in that
 * section, so the grid shows the fugue's architecture as the player fills it in. A cell opens that
 * section with that voice. The grid scrolls sideways when the fugue has many sections.
 */
import { inkOf, keyTint } from "./MusicBox.tsx";
import { keyAt, type TouchFugue } from "./fugue.ts";
import type { Level as Difficulty } from "./lanes.ts";
import { EARN, recordKey, voicesIn } from "./voice-mode.ts";

/** The entries of the subject in a section. */
export function sectionEntries(f: TouchFugue, section: number) {
  const s = f.sections[section];
  return f.entries.filter((e) => e.on >= s.from && e.on < s.to);
}

export function MapView({ f, best, diff, pick, close }: { f: TouchFugue; best: Record<string, number>; diff: Difficulty; pick: (section: number, voice: number) => void; close: () => void }) {
  const n = f.sections.length;
  const earned = (s: number, v: number) => (best[recordKey(f.id, s, [v], diff)] ?? 0) >= EARN * 100;
  const cells = f.sections.flatMap((_, s) => voicesIn(f, s).map((v) => earned(s, v)));
  const stars = cells.filter(Boolean).length;
  return (
    <div className="tg-card tg-map">
      <h1>
        {f.title.toUpperCase()} · {stars} OF {cells.length} <span className="tg-sym">★</span>
      </h1>
      <p className="tg-card-sub">
        {diff.toUpperCase()} · TAP A SQUARE TO PLAY IT
        {f.kind === "fugue" && (
          <>
            {" "}
            · <span className="tg-sym">◆</span> AN ENTRY OF THE SUBJECT
          </>
        )}
      </p>
      <div className="tg-grid-scroll">
        <div className="tg-grid" style={{ gridTemplateColumns: `3.6em repeat(${n}, minmax(2.2em, 1fr))` }}>
          <span />
          {f.sections.map((s, i) => (
            <span key={i} className="tg-grid-head" style={{ background: keyTint(keyAt(f, s.to - 1)) }}>
              {s.fromBar}
            </span>
          ))}
          {f.voiceNames.map((name, v) => (
            <Row key={name} f={f} v={v} best={best} diff={diff} pick={pick} />
          ))}
        </div>
      </div>
      <button type="button" id="map-close" className="tg-link" onClick={close}>
        Back
      </button>
    </div>
  );
}

function Row({ f, v, best, diff, pick }: { f: TouchFugue; v: number; best: Record<string, number>; diff: Difficulty; pick: (section: number, voice: number) => void }) {
  // "S", "SI", "RH": the name's initials.
  const short = f.voiceNames[v]
    .split(" ")
    .map((w) => (/^I+$/.test(w) ? w : w[0]))
    .join("")
    .toUpperCase();
  return (
    <>
      <span className="tg-grid-voice" style={{ color: inkOf(v, f.voices.length) }}>
        {short}
      </span>
      {f.sections.map((_, s) => {
        if (!voicesIn(f, s).includes(v)) return <span key={s} className="tg-cell tg-cell-rest" />;
        const pct = best[recordKey(f.id, s, [v], diff)];
        const star = pct !== undefined && pct >= EARN * 100;
        const entry = sectionEntries(f, s).some((e) => e.voice === v);
        return (
          <button
            key={s}
            type="button"
            id={`map-${s}-${v}`}
            className={`tg-cell${star ? " tg-cell-star" : ""}`}
            style={{ borderColor: star ? inkOf(v, f.voices.length) : undefined }}
            onClick={() => pick(s, v)}
            aria-label={`Bars ${f.sections[s].fromBar} to ${f.sections[s].toBar}, ${f.voiceNames[v]}${pct !== undefined ? `, best ${pct}%` : ""}`}
          >
            {entry && <i>◆</i>}
            {star ? "★" : pct !== undefined ? pct : ""}
          </button>
        );
      })}
    </>
  );
}

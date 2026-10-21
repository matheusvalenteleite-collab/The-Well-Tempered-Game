/**
 * The map (D164): the fugue as a grid, its six sections across, the voices and the pairs of voices
 * down, each cell the best score at the chosen level (a star once earned). A diamond marks the voice
 * that carries an entry of the subject in that section, so the grid shows the fugue's architecture as
 * the player fills it in. A cell opens that section with those voices.
 */
import { VOICE_INKS, KEY_TINTS } from "./MusicBox.tsx";
import { FUGUE } from "./fugue.ts";
import type { Level as Difficulty } from "./lanes.ts";
import { EARN, recordKey } from "./voice-mode.ts";

const ROWS: number[][] = [[0], [1], [2], [0, 1], [1, 2], [0, 2]];
const SHORT = ["S", "A", "B"];

/** The entries of the subject in a section: their voices and the key of the first. */
export function sectionEntries(section: number) {
  const s = FUGUE.sections[section];
  return FUGUE.entries.filter((e) => e.on >= s.from && e.on < s.to);
}

export function MapView({ best, diff, pick, close }: { best: Record<string, number>; diff: Difficulty; pick: (section: number, voices: number[]) => void; close: () => void }) {
  const n = FUGUE.sections.length;
  const earned = (k: string) => (best[k] ?? 0) >= EARN * 100;
  const total = ROWS.length * n;
  const stars = ROWS.flatMap((vs) => FUGUE.sections.map((_, s) => earned(recordKey(s, vs, diff)))).filter(Boolean).length;
  return (
    <div className="tg-card tg-map">
      <h1>
        THE FUGUE · {stars} OF {total} <span className="tg-sym">★</span>
      </h1>
      <p className="tg-card-sub">{diff.toUpperCase()} · TAP A SQUARE TO PLAY IT · <span className="tg-sym">◆</span> AN ENTRY OF THE SUBJECT</p>
      <div className="tg-grid" style={{ gridTemplateColumns: `2.6em repeat(${n}, 1fr)` }}>
        <span />
        {FUGUE.sections.map((s, i) => {
          const key = sectionEntries(i)[0]?.key ?? "c";
          return (
            <span key={i} className="tg-grid-head" style={{ background: KEY_TINTS[key] }}>
              {s.fromBar}
            </span>
          );
        })}
        {ROWS.map((vs) => (
          <Row key={vs.join("+")} vs={vs} best={best} diff={diff} pick={pick} />
        ))}
      </div>
      <button type="button" id="map-close" className="tg-link" onClick={close}>
        Back
      </button>
    </div>
  );
}

function Row({ vs, best, diff, pick }: { vs: number[]; best: Record<string, number>; diff: Difficulty; pick: (section: number, voices: number[]) => void }) {
  return (
    <>
      <span className="tg-grid-voice">
        {vs.map((v) => (
          <b key={v} style={{ color: VOICE_INKS[v] }}>
            {SHORT[v]}
          </b>
        ))}
      </span>
      {FUGUE.sections.map((_, s) => {
        const pct = best[recordKey(s, vs, diff)];
        const star = pct !== undefined && pct >= EARN * 100;
        const entry = vs.length === 1 && sectionEntries(s).some((e) => e.voice === vs[0]);
        return (
          <button
            key={s}
            type="button"
            id={`map-${s}-${vs.join("")}`}
            className={`tg-cell${star ? " tg-cell-star" : ""}`}
            style={{ borderColor: star ? VOICE_INKS[vs[vs.length - 1]] : undefined }}
            onClick={() => pick(s, vs)}
            aria-label={`Section ${s + 1}, ${vs.map((v) => FUGUE.voiceNames[v]).join(" and ")}${pct !== undefined ? `, best ${pct}%` : ""}`}
          >
            {entry && <i>◆</i>}
            {star ? "★" : pct !== undefined ? pct : ""}
          </button>
        );
      })}
    </>
  );
}

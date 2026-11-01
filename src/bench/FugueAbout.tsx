/**
 * Design studio (D411): ABOUT THIS FUGUE, the selection's "?" on the chosen fugue's picture. Two columns on a
 * phone held sideways: the picture, the names and the facts read from the score (pieces.json: voices, bars,
 * metre, the subject's entries voice by voice, the strettos, inverted or augmented entries, the keys it
 * passes through, the cadences); and the words: the companion's note (src/wtc/notes.ts) and, still to be
 * written and sourced by Glenn, its history and the recordings to hear. Nothing here is invented: where
 * the text is not yet written, the box says so.
 */
import { useEffect } from "react";
import { lang, partName, tr } from "../i18n/index.ts";
import { fugueById } from "../touch/fugue.ts";
import { fugueName } from "../touch/fugue-names.ts";
import { inkOf } from "../touch/MusicBox.tsx";
import { NOTES } from "../wtc/notes.ts";
import { Emblem } from "./FuguePicker.tsx";
import { keyWords, pieceTitle } from "./Selection.tsx";

const keyText = (k: string) => {
  const w = keyWords(k);
  return `${w.tonic} ${w.mode}`;
};

/** The subject's entries per voice, the strettos (an entry beginning before the last has ended), and the learned forms. */
export function entryFacts(id: string) {
  const f = fugueById(id);
  // The first subject's entries only (I/4 and others have second and third subjects: `theme`).
  const firsts = f.entries.filter((e) => !e.theme);
  const themes = new Set(f.entries.map((e) => e.theme ?? 1)).size;
  const per = f.voiceNames.map(() => 0);
  let stretti = 0;
  let inverted = 0;
  let augmented = 0;
  const sorted = [...firsts].sort((a, b) => a.on - b.on);
  sorted.forEach((e, i) => {
    per[e.voice] = (per[e.voice] ?? 0) + 1;
    if (i > 0 && sorted.slice(0, i).some((x) => x.end > e.on)) stretti++;
    if (e.inverted) inverted++;
    if (e.scale === 2) augmented++;
  });
  const keys = [...new Set(f.keys.map((k) => k.key))];
  return { per, themes, total: firsts.length, stretti, inverted, augmented, keys, cadences: f.cadences.length, bars: f.bars.length, meter: f.meter };
}

export function FugueAbout({ id, close }: { id: string; close: () => void }) {
  const f = fugueById(id);
  const facts = entryFacts(id);
  const note = NOTES[`wtc${f.book}.${String(f.number).padStart(2, "0")}`]?.fugue;
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && (e.stopPropagation(), close());
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [close]);
  return (
    <div className="tb-pop-veil" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="tb-pop sel-about-pop" role="dialog" aria-modal="true" aria-label={tr("ABOUT THIS FUGUE")} id="about-pop">
        <button type="button" id="about-close" className="tg-x tb-pop-x" aria-label="Close" onClick={close}>
          ✕
        </button>
        <div className="sel-about-side">
          <Emblem id={id} className="sel-about-pic" />
          <p className="sel-about-nick">{fugueName(id, lang())}</p>
          <p className="sel-about-title">{pieceTitle(id)}</p>
          <p className="sel-about-meta">
            {tr("BOOK")} {f.book === 1 ? "I" : "II"} · {f.number} · BWV {f.bwv.replace(/^BWV\s*/i, "")}
          </p>
          <dl className="sel-about-facts">
            <dt>{tr("VOICES")}</dt>
            <dd>{f.voices.length}</dd>
            <dt>{tr("BARS")}</dt>
            <dd>
              {facts.bars} · {facts.meter}
            </dd>
            <dt>{tr("KEYS")}</dt>
            <dd>{facts.keys.map(keyText).join(" → ")}</dd>
          </dl>
        </div>
        <div className="sel-about-main">
          <h2 className="sel-about-h">{tr("THE SUBJECT, VOICE BY VOICE")}</h2>
          <ul className="sel-about-entries" aria-label={tr("ENTRIES")}>
            {f.voiceNames.map((vn, i) => (
              <li key={vn} style={{ color: inkOf(i, f.voices.length) }}>
                <span>{partName(f.kind, vn)}</span>
                <span className="sel-about-dots" aria-hidden="true">
                  {"■".repeat(facts.per[i])}
                </span>
                <b>{facts.per[i]}</b>
              </li>
            ))}
          </ul>
          <p className="sel-about-line">
            {facts.total} {tr("ENTRIES")} · {facts.stretti} {tr("IN STRETTO")}
            {facts.themes > 1 && <> · {tr("{n} SUBJECTS", { n: facts.themes })}</>}
            {facts.inverted > 0 && <> · {facts.inverted} {tr("INVERTED")}</>}
            {facts.augmented > 0 && <> · {facts.augmented} {tr("AUGMENTED")}</>} · {facts.cadences} {tr("CADENCES")}
          </p>
          {note && (
            <>
              <h2 className="sel-about-h">{tr("THE PIECE")}</h2>
              <p className="sel-about-text">{note}</p>
            </>
          )}
          <h2 className="sel-about-h">{tr("HISTORY · RECORDINGS")}</h2>
          <p className="sel-about-text sel-about-todo">{tr("To be written, with sources (Glenn).")}</p>
        </div>
      </div>
    </div>
  );
}

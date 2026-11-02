/**
 * D237, the pop-up that replaced the title card: a small box over the cards with the piece's formal
 * title, the voice to play, preselected (flow.ts `defaultVoice`; D251: a prelude's part named, not
 * chosen), and a big ▶ PLAY straight into the count-in; ✕ (or Escape) closes it, back to the cards.
 */
import { lang, partName, pieceName, tr, trCanvas, voiceName } from "../i18n/index.ts";
import { useEffect, useState, type ReactNode } from "react";
import { fugueById } from "../touch/fugue.ts";
import { PIECE_SOUND } from "../touch/piece-sound.ts";
import { creditFor, presetById } from "../touch/sound.ts";
import { inkOf } from "../touch/MusicBox.tsx";
import { cardById } from "./cards.ts";
import { formalTitle } from "./FuguePicker.tsx";
import { SoundSelect } from "./SoundSelect.tsx";
import { fugueOf, isPrelude } from "./stages.ts";
import { markLegend } from "../touch/readings.ts";
import { STRONG_SIDE } from "../touch/touch-expr.ts";
import { coloursLoaded, hasColours, loadColours } from "../touch/colour.ts";
import type { RuleLevels } from "./lite.ts";

/** D344: HOW TO PLAY's three levels, in order (pt BÁSICO / INTERMEDIÁRIO / AVANÇADO, es BÁSICO / INTERMEDIO / AVANZADO). */
const LEVELS: readonly [keyof RuleLevels, string][] = [
  ["basics", "BASICS"],
  ["intermediate", "INTERMEDIATE"],
  ["advanced", "ADVANCED"],
];

/** The pop-up's title: "BWV 846/1 · PRELUDE IN C MAJOR" (the piece's own title where it has no card). */
export function popTitle(id: string): string {
  const c = cardById(fugueOf(id));
  if (c) return formalTitle(c, isPrelude(id) ? "prelude" : "fugue");
  // D340: the MORE BACH and CHORALES pieces: "BWV 1080/5 · CONTRAPUNCTUS 5", "BWV 269 · AUS MEINES HERZENS GRUNDE".
  const f = fugueById(id);
  return f.collection && f.bwv ? `BWV ${f.bwv} · ${f.title.toUpperCase()}` : f.title.toUpperCase();
}

/**
 * D240: the friends' page's sounds, chosen on the pop-up under HOW TO PLAY: the harpsichord and four
 * ensembles, and six of the console sounds (D209). D246: and first, starred, the piece's own sound
 * (piece-sound.ts) where it is not among them; the choice kept for the piece.
 */
/** D292: now the five sounds the players have (sound.ts PRESETS), in their order; D297: fifteen; D302: seventeen; D304: fifteen. */
export const POP_SOUNDS: readonly [id: string, name: string][] = [
  ["chip", "CLASSIC CHIP"],
  ["gameboy", "GAME BOY"],
  ["harpsichordSampled", "HARPSICHORD"],
  ["pianoSampled", "PIANO"],
  // D297: ANALOG SYNTH remade as SWITCHED-ON.
  ["analog", "SWITCHED-ON"],
  // D297: the new presets, after the five (for the owner to judge).
  ["super16", "SUPER 16-BIT"],
  ["nocturne32", "NOCTURNE 32-BIT"],
  ["megaFm", "MEGA FM"],
  ["sid64", "SID 64"],
  ["tracker", "TRACKER"],
  // D302: CHAMBER ORGAN remade as PIPE ORGAN; two singing voices. (D304: FOREST 64 and PARTY 64 withdrawn.)
  ["chamberOrgan", "PIPE ORGAN"],
  ["vocalSynth", "VOCAL SYNTH"],
  ["soloVoices", "SOLO VOICES"],
  ["tomita", "TOMITA"],
  // D365: D358's two presets on D349's way, offered.
  ["stringConsort", "STRING CONSORT"],
  ["lute", "LUTE"],
  // D430: the trials' BAROQUE BAND, offered (D433: BLEEPS AND BLOOPS retired).
  ["baroqueBand", "BAROQUE BAND"],
  // D501: the trials' CLAVICHORD, offered.
  ["clavichord", "CLAVICHORD"],
];

/** "ORGAN (SAMPLED)" → "ORGAN", "LIGHT WORLD · SNES" → "LIGHT WORLD". */
const shortSound = (name: string) => name.replace(/ \(SAMPLED\)$/, "").replace(/ · .*$/, "");
/** D246: the row for a piece: its own sound first where the row does not hold it (marked `own`: underlined in gold). */
export function popSounds(id: string): (readonly [id: string, name: string, own: boolean])[] {
  const own = PIECE_SOUND[id];
  const row = POP_SOUNDS.map(([sid, name]) => [sid, name, sid === own] as const);
  return !own || POP_SOUNDS.some(([sid]) => sid === own) ? row : [[own, shortSound(presetById(own).name), true] as const, ...row];
}

/**
 * D343: `plain` (play.html for the friends): the piece's name without its BWV number, no SOUND to choose
 * (the piece plays in its own; a recorded sound's credit still shown), so the only choice is the voice.
 */
export function PlayPop({ id, voice, singing, setVoice, play, close, learn, rules, sound, setSound, soundLocked, tuning, plain = false, children }: { id: string; voice: number; singing: readonly number[]; setVoice: (v: number) => void; play: () => void; close: () => void; learn?: () => void; rules?: RuleLevels; sound?: string; setSound?: (id: string) => void; soundLocked?: boolean; tuning?: string; plain?: boolean; children?: ReactNode }) {
  const f = fugueById(id);
  // D239: ? HOW TO PLAY: the mode's rules, folded under PLAY.
  const [help, setHelp] = useState(false);
  // D355: whether the sound has its own colours in this piece (the plans load on demand).
  const [, setPlans] = useState(coloursLoaded());
  useEffect(() => {
    if (!coloursLoaded()) void loadColours().then(setPlans, () => {});
  }, []);
  const colours = sound !== undefined && hasColours(id, sound);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      close();
    };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [close]);
  return (
    <div className="tb-pop-veil" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="tb-pop" role="dialog" aria-modal="true" aria-label={popTitle(id)}>
        <button type="button" id="pop-close" className="tg-x tb-pop-x" aria-label="Close" onClick={close}>
          ✕
        </button>
        <h2 className="tb-pop-title">{plain ? (lang() === "en" ? popTitle(id).split(" · ").at(-1) : pieceName(f.kind, f.key)) : lang() === "en" || f.collection ? popTitle(id) : `${popTitle(id).split(" · ")[0]} · ${pieceName(f.kind, f.key)}`}</h2>
        {/* D351: a reconstruction says so (BWV 1059: Bach left nine bars). */}
        {f.reconstruction && (
          <p className="tb-pop-ask tb-pop-recon" id="pop-reconstruction">
            {tr(f.reconstruction)}
          </p>
        )}
        {f.kind === "prelude" ? (
          // D251: no hand to choose for a prelude: it is played with the part the game gives (stages.ts `preludePart`), named in one small line.
          <p className="tb-pop-ask tb-pop-part" id="pop-part">
            {tr("YOU PLAY THE {voice}", { voice: voiceName(f.voiceNames[voice] ?? f.voiceNames[0]) })}
          </p>
        ) : (
          <>
            <p className="tb-pop-ask">{tr("YOUR VOICE")}</p>
            <div className="tg-voices" role="group" aria-label="Voice">
              {f.voiceNames.map((name, i) => (
                <button key={name} type="button" id={`voice-${i}`} className={i === voice ? "on" : ""} style={{ color: inkOf(i, f.voices.length) }} disabled={!singing.includes(i)} onClick={() => setVoice(i)} aria-pressed={i === voice}>
                  {partName(f.kind, name)}
                </button>
              ))}
            </div>
          </>
        )}
        {children}
        {/* D340: the edition's credit (the Mutopia Project's typesetters; Sapp's chorales, CC BY-NC-SA 4.0). */}
        {f.credit && (
          <p className="tb-pop-lock" id="pop-score-credit">
            {f.credit}
          </p>
        )}
        <button type="button" id="play" className="tb-play tb-pop-play" autoFocus onClick={play}>
          ▶ {tr("PLAY")}
        </button>
        {rules && rules.basics.length > 0 && (
          <button type="button" id="pop-help" className="tb-pop-help" aria-expanded={help} onClick={() => setHelp(!help)}>
            ? {tr("HOW TO PLAY")}
          </button>
        )}
        {help && rules && (
          // D344: the rules in three folded levels, BASICS open; the marks' legend under INTERMEDIATE.
          <div className="tb-pop-levels" id="pop-rules">
            {LEVELS.map(([key, title]) =>
              rules[key].length > 0 || key === "intermediate" ? (
                <details key={key} className="tb-pop-level" id={`pop-level-${key}`} open={key === "basics"}>
                  <summary>{tr(title)}</summary>
                  <ul className="tb-pop-rules">
                    {rules[key].map((r) => (
                      <li key={r}>{tr(r)}</li>
                    ))}
                  </ul>
                  {key === "intermediate" && (
                    // D314: the reading's marks over the subject, in plain words (the dot is SHORT). D325: only with a reading; D344: on play.html each fugue's own.
                    <div className="tb-pop-marks" id="pop-marks">
                      <p className="tb-pop-ask">{plain ? tr("THE MARKS OVER THE SUBJECT, WHERE THE FUGUE HAS THEM") : tr("A READING'S MARKS, IF YOU CHOOSE ONE IN HEAR THE SUBJECT")}</p>
                      <ul className="tb-pop-rules">
                        {markLegend(STRONG_SIDE).map((l) => (
                          <li key={l.kind}>
                            <b className={`tb-mark tb-mark-${l.kind}`}>{l.sym}</b> {l.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </details>
              ) : null,
            )}
          </div>
        )}
        {colours && (
          // D355: the sound's own colour plan for this piece (colour.ts): a hint, so a piece is worth trying again in another sound.
          <p className="tb-pop-lock tb-pop-colours" id="pop-colours">
            ♪ {tr("THIS SOUND HAS ITS OWN COLOURS HERE")}
          </p>
        )}
        {sound !== undefined && plain && creditFor(sound) && (
          <p className="tb-pop-lock" id="pop-credit">
            {creditFor(sound)}
          </p>
        )}
        {sound !== undefined && !plain && soundLocked && (
          // D265: the piece's own sound until it is finished with an A or S.
          <div className="tb-pop-sounds" id="pop-sound-locked">
            <p className="tb-pop-ask">{tr("SOUND")}: {tr(shortSound(presetById(sound).name))}</p>
            <p className="tb-pop-lock">{tr("FINISH IT WITH A B OR BETTER TO CHOOSE ANOTHER SOUND")}</p>
          </div>
        )}
        {sound !== undefined && setSound && !plain && !soundLocked && (
          <div className="tb-pop-sounds" role="group" aria-label="Sound">
            {/* D303: one dropdown, the piece's own sound first and starred (was a row of buttons). */}
            <SoundSelect id="pop-sound" value={sound} set={setSound} sounds={POP_SOUNDS} own={PIECE_SOUND[id]} />
            {/* D292: the recorded piano's credit (CC BY 3.0) while it is the sound. */}
            {/* D327: the tuning it plays in (the sound's own unless ⚙ TUNING chose another). */}
            {tuning && <p className="tb-pop-lock tb-pop-tuning" id="pop-tuning">{trCanvas(tuning)}</p>}
            {creditFor(sound) && <p className="tb-pop-lock" id="pop-credit">{creditFor(sound)}</p>}
          </div>
        )}
        {learn && (
          <button type="button" id="learn" className="tb-learn" onClick={learn}>
            LEARN THIS MODE
          </button>
        )}
      </div>
    </div>
  );
}

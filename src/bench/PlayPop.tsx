/**
 * D237, the pop-up that replaced the title card: a small box over the cards with the piece's formal
 * title, the voice to play, preselected (flow.ts `defaultVoice`; D251: a prelude's part named, not
 * chosen), and a big ▶ PLAY straight into the count-in; ✕ (or Escape) closes it, back to the cards.
 */
import { lang, pieceName, tr, voiceName } from "../i18n/index.ts";
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

/** The pop-up's title: "BWV 846/1 · PRELUDE IN C MAJOR" (the piece's own title where it has no card). */
export function popTitle(id: string): string {
  const c = cardById(fugueOf(id));
  return c ? formalTitle(c, isPrelude(id) ? "prelude" : "fugue") : fugueById(id).title.toUpperCase();
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
  ["modular", "BLEEPS AND BLOOPS"],
  ["tomita", "TOMITA"],
];

/** "ORGAN (SAMPLED)" → "ORGAN", "LIGHT WORLD · SNES" → "LIGHT WORLD". */
const shortSound = (name: string) => name.replace(/ \(SAMPLED\)$/, "").replace(/ · .*$/, "");
/** D246: the row for a piece: its own sound first where the row does not hold it (marked `own`: underlined in gold). */
export function popSounds(id: string): (readonly [id: string, name: string, own: boolean])[] {
  const own = PIECE_SOUND[id];
  const row = POP_SOUNDS.map(([sid, name]) => [sid, name, sid === own] as const);
  return !own || POP_SOUNDS.some(([sid]) => sid === own) ? row : [[own, shortSound(presetById(own).name), true] as const, ...row];
}

export function PlayPop({ id, voice, singing, setVoice, play, close, learn, rules, sound, setSound, soundLocked, children }: { id: string; voice: number; singing: readonly number[]; setVoice: (v: number) => void; play: () => void; close: () => void; learn?: () => void; rules?: readonly string[]; sound?: string; setSound?: (id: string) => void; soundLocked?: boolean; children?: ReactNode }) {
  const f = fugueById(id);
  // D239: ? HOW TO PLAY: the mode's rules, folded under PLAY.
  const [help, setHelp] = useState(false);
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
        <h2 className="tb-pop-title">{lang() === "en" ? popTitle(id) : `${popTitle(id).split(" · ")[0]} · ${pieceName(f.kind, f.key)}`}</h2>
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
                  {voiceName(name)}
                </button>
              ))}
            </div>
          </>
        )}
        {children}
        <button type="button" id="play" className="tb-play tb-pop-play" autoFocus onClick={play}>
          ▶ {tr("PLAY")}
        </button>
        {rules && rules.length > 0 && (
          <button type="button" id="pop-help" className="tb-pop-help" aria-expanded={help} onClick={() => setHelp(!help)}>
            ? {tr("HOW TO PLAY")}
          </button>
        )}
        {help && rules && (
          <ul className="tb-pop-rules" id="pop-rules">
            {rules.map((r) => (
              <li key={r}>{tr(r)}</li>
            ))}
          </ul>
        )}
        {help && rules && (
          // D314: the reading's marks over the subject, in plain words (the dot is SHORT). D325: only with a reading chosen.
          <div className="tb-pop-marks" id="pop-marks">
            <p className="tb-pop-ask">{tr("A READING'S MARKS, IF YOU CHOOSE ONE IN HEAR THE SUBJECT")}</p>
            <ul className="tb-pop-rules">
              {markLegend(STRONG_SIDE).map((l) => (
                <li key={l.kind}>
                  <b className={`tb-mark tb-mark-${l.kind}`}>{l.sym}</b> {l.text}
                </li>
              ))}
            </ul>
          </div>
        )}
        {sound !== undefined && soundLocked && (
          // D265: the piece's own sound until it is finished with an A or S.
          <div className="tb-pop-sounds" id="pop-sound-locked">
            <p className="tb-pop-ask">{tr("SOUND")}: {tr(shortSound(presetById(sound).name))}</p>
            <p className="tb-pop-lock">{tr("FINISH IT WITH AN A OR S TO CHOOSE ANOTHER SOUND")}</p>
          </div>
        )}
        {sound !== undefined && setSound && !soundLocked && (
          <div className="tb-pop-sounds" role="group" aria-label="Sound">
            {/* D303: one dropdown, the piece's own sound first and starred (was a row of buttons). */}
            <SoundSelect id="pop-sound" value={sound} set={setSound} sounds={POP_SOUNDS} own={PIECE_SOUND[id]} />
            {/* D292: the recorded piano's credit (CC BY 3.0) while it is the sound. */}
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

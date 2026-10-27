/**
 * D326, TOOLS: one small button beside ⚙ on play.html's list, opening a panel over the cards with
 * PRACTICE (an unscored run of chosen bars: LOOP, tempo 50-100%, WAIT FOR ME) and REHEARSAL (HEAR THE
 * OTHERS, solo and mute per voice, the player's own level −6 to +3 dB). The game itself gains nothing
 * on screen. Logic and storage: practice.ts.
 */
import { useEffect, useState } from "react";
import { lang, pieceName, voiceName } from "../i18n/index.ts";
import { fugueById, type TouchFugue } from "../touch/fugue.ts";
import { inkOf } from "../touch/MusicBox.tsx";
import { Panel } from "../touch/Panels.tsx";
import { popTitle } from "./PlayPop.tsx";
import { BALANCE_MAX, BALANCE_MIN, firstBar, lastBar, readTools, saveTools, TEMPO_MAX, TEMPO_MIN, type ToolsState } from "./practice.ts";
import { tt } from "./tools-i18n.ts";

/** The button beside ⚙ (the list's header). */
export function ToolsButton({ open }: { open: () => void }) {
  return (
    <button type="button" id="lite-tools" className="tg-x tb-tools-btn" aria-label={tt("TOOLS")} onClick={open}>
      {tt("TOOLS")}
    </button>
  );
}

/** A piece as the list names it ("BWV 847 · FUGUE IN C MINOR"). */
function pieceLabel(id: string): string {
  const f = fugueById(id);
  const t = popTitle(id);
  return lang() === "en" ? t : `${t.split(" · ")[0]} · ${pieceName(f.kind, f.key)}`;
}

function Toggle({ id, label, on, set }: { id: string; label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <button type="button" id={id} className={`tb-tools-toggle${on ? " on" : ""}`} aria-pressed={on} onClick={() => set(!on)}>
      <span aria-hidden="true">{on ? "■" : "□"}</span> {label}
    </button>
  );
}

export function ToolsPanel({ f, voice, pieces, setPiece, setVoice, practice, close, last }: { f: TouchFugue; voice: number; pieces: readonly string[]; setPiece: (id: string) => void; setVoice: (v: number) => void; practice: (s: ToolsState, listen: boolean) => void; close: () => void; last?: { right: number; of: number } | null }) {
  const [s, setS] = useState<ToolsState>(() => readTools(f));
  useEffect(() => setS(readTools(f)), [f.id]);
  const set = (p: Partial<ToolsState>) => {
    const next = { ...s, ...p };
    if (p.fromBar !== undefined && next.toBar < next.fromBar) next.toBar = next.fromBar;
    if (p.toBar !== undefined && next.fromBar > next.toBar) next.fromBar = next.toBar;
    setS(next);
    saveTools(f, next);
  };
  const bars = f.bars.map((b) => b.n).filter((n, i, a) => a.indexOf(n) === i && n >= firstBar(f) && n <= lastBar(f));
  const flip = (list: number[], v: number) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const soloing = s.solo.some((v) => v !== voice);
  const db = s.balance > 0 ? `+${s.balance}` : `${s.balance}`;
  return (
    <Panel title={tt("TOOLS")} close={close} className="tb-lite-settings tb-tools">
      <div className="tb-tools-piece">
        <label className="tb-sound-select">
          <span>{tt("PIECE")}</span>
          <span className="tb-sound-pick">
            <select id="tools-piece" value={f.id} onChange={(e) => setPiece(e.target.value)}>
              {pieces.map((id) => (
                <option key={id} value={id}>
                  {pieceLabel(id)}
                </option>
              ))}
            </select>
            <span aria-hidden="true">▼</span>
          </span>
        </label>
        {f.kind === "prelude" ? (
          <p className="tb-tools-note" id="tools-part">
            {tt("YOU PLAY THE {voice}", { voice: voiceName(f.voiceNames[voice] ?? f.voiceNames[0]) })}
          </p>
        ) : (
          <div className="tg-voices tb-tools-voices" role="group" aria-label={tt("YOUR VOICE")}>
            {f.voiceNames.map((name, i) => (
              <button key={name} type="button" id={`tools-voice-${i}`} className={i === voice ? "on" : ""} style={{ color: inkOf(i, f.voices.length) }} aria-pressed={i === voice} onClick={() => setVoice(i)}>
                {voiceName(name)}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="tb-tools-cols">
        <section className="tb-tools-sec" aria-label={tt("PRACTICE")}>
          <h2>{tt("PRACTICE")}</h2>
          <div className="tb-tools-row">
            <span>{tt("BARS")}</span>
            <span className="tb-tools-bars">
              <select id="tools-from" aria-label={tt("BARS")} value={s.fromBar} onChange={(e) => set({ fromBar: Number(e.target.value) })}>
                {bars.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span>{tt("TO")}</span>
              <select id="tools-to" aria-label={tt("TO")} value={s.toBar} onChange={(e) => set({ toBar: Number(e.target.value) })}>
                {bars.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </span>
          </div>
          <label className="tg-from tb-tools-range">
            <span>{tt("TEMPO {n}%", { n: s.tempo })}</span>
            <input type="range" id="tools-tempo" min={TEMPO_MIN} max={TEMPO_MAX} step={5} value={s.tempo} onChange={(e) => set({ tempo: Number(e.target.value) })} />
          </label>
          <div className="tb-tools-row tb-tools-toggles">
            <Toggle id="tools-loop" label={tt("LOOP")} on={s.loop} set={(loop) => set({ loop })} />
            <Toggle id="tools-wait" label={tt("WAIT FOR ME")} on={s.wait} set={(wait) => set({ wait })} />
          </div>
          <button type="button" id="tools-practice" className="tb-play tb-tools-go" onClick={() => practice(s, false)}>
            ▶ {tt("PRACTICE")}
          </button>
          {last && (
            <p className="tb-tools-last" id="tools-last" role="status">
              {tt("LAST PRACTICE: {n} OF {m} RIGHT", { n: last.right, m: last.of })}
            </p>
          )}
          <p className="tb-tools-note">{tt("Unscored: no crowd, no grade, no best score. A missed note still drops out.")}</p>
          {s.wait && <p className="tb-tools-note">{tt("WAIT FOR ME: the band waits for your next right note.")}</p>}
        </section>
        <section className="tb-tools-sec" aria-label={tt("REHEARSAL")}>
          <h2>{tt("REHEARSAL")}</h2>
          <button type="button" id="tools-hear" className="tb-play tb-tools-go" onClick={() => practice(s, true)}>
            ♪ {tt("HEAR THE OTHERS")}
          </button>
          <p className="tb-tools-note">{tt("The chosen bars without your voice. Solo and mute: here and in practice.")}</p>
          <ul className="tb-tools-mix" aria-label="Voices">
            {f.voiceNames.map((name, i) => {
              const own = i === voice;
              const solo = s.solo.includes(i);
              const mute = s.mute.includes(i);
              const silent = !own && (soloing ? !solo : mute);
              return (
                <li key={name} className={silent ? "silent" : ""}>
                  <span className="tb-tools-vname" style={{ color: inkOf(i, f.voices.length) }}>
                    {voiceName(name)}
                  </span>
                  {own ? (
                    <span className="tb-tools-you">{tt("YOU")}</span>
                  ) : (
                    <span className="tb-tools-sm">
                      <button type="button" id={`tools-solo-${i}`} className={solo ? "on" : ""} aria-pressed={solo} aria-label={tt("SOLO {voice}", { voice: voiceName(name) })} onClick={() => set({ solo: flip(s.solo, i) })}>
                        S
                      </button>
                      <button type="button" id={`tools-mute-${i}`} className={mute ? "on" : ""} aria-pressed={mute} aria-label={tt("MUTE {voice}", { voice: voiceName(name) })} onClick={() => set({ mute: flip(s.mute, i) })}>
                        M
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <label className="tg-from tb-tools-range">
            <span>{tt("YOUR VOICE IN THE BALANCE {db} DB", { db })}</span>
            <input type="range" id="tools-balance" min={BALANCE_MIN} max={BALANCE_MAX} step={0.5} value={s.balance} onChange={(e) => set({ balance: Number(e.target.value) })} />
          </label>
          <p className="tb-tools-note">{tt("Every run, scored ones too: one level for the whole run, never louder or softer for right or wrong notes.")}</p>
        </section>
      </div>
    </Panel>
  );
}

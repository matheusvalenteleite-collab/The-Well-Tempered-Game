/**
 * D726, BACH PLAYS WITH YOU: a take beside Kimiko Ishizaka's recording (takes/beside.ts), bar by bar: her
 * tempo above (up, quicker than her usual bar; down, slower), the player's timing below (up, ahead of the
 * beat; down, behind), each bar's pair marked where they lean together or apart; a bar tapped says both in
 * words and plays her in it (her recording, streamed; CC0). One line says plainly what it is not.
 */
import { useEffect, useMemo, useState } from "react";
import { tr } from "../i18n/index.ts";
import { fugueById, barStart } from "../touch/fugue.ts";
import { inkOf } from "../touch/MusicBox.tsx";
import { recording } from "../audio/recording.ts";
import { herMap, secAt } from "./her-clock.ts";
import { herUrls } from "./with-her.ts";
import { besideHer, type BarLean } from "./takes/beside.ts";
import { takeName, type Take } from "./takes/take.ts";
import { takeVoiceWord } from "./TakesPanel.tsx";

const CREDIT = "KIMIKO ISHIZAKA, THE OPEN WELL-TEMPERED CLAVIER (2015), CC0";

/** A bar's two leanings in words. */
export function barWords(b: BarLean): string[] {
  const her = Math.abs(b.her) < 1 ? tr("SHE KEEPS HER TEMPO") : b.her > 0 ? tr("SHE MOVES ON {p}%", { p: Math.abs(b.her) }) : tr("SHE HOLDS BACK {p}%", { p: Math.abs(b.her) });
  const you = b.you === null ? tr("TOO FEW NOTES OF YOURS") : Math.abs(b.you) < 5 ? tr("YOU ON THE BEAT") : b.you < 0 ? tr("YOU {ms} MS AHEAD", { ms: Math.abs(b.you) }) : tr("YOU {ms} MS BEHIND", { ms: b.you });
  return [her, you];
}

export function BesidePanel({ take, close }: { take: Take; close: () => void }) {
  const f = fugueById(take.piece);
  const m = herMap(take.piece);
  const b = useMemo(() => besideHer(take, m), [take, m]);
  const [sel, setSel] = useState<BarLean | null>(null);
  const [hearing, setHearing] = useState(false);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && (e.stopPropagation(), close());
    window.addEventListener("keydown", esc, true);
    return () => (window.removeEventListener("keydown", esc, true), recording.stop());
  }, [close]);
  if (!b || !m) return null;
  const n = b.bars.length;
  const W = Math.max(320, n * 14);
  const H = 150;
  const mid1 = 42;
  const mid2 = 112;
  // Scaled by the bars' usual size (the 90th percentile), the few beyond it (her last bar's broadening) drawn to the edge.
  const p90 = (xs: number[]) => [...xs].sort((u, v) => u - v)[Math.floor(xs.length * 0.9)] ?? 0;
  const herMax = Math.max(4, p90(b.bars.map((x) => Math.abs(x.her))));
  const youMax = Math.max(30, p90(b.bars.filter((x) => x.you !== null).map((x) => Math.abs(x.you!))));
  const bw = W / n;
  const ink = inkOf(take.voice, f.voices.length);
  const hear = (x: BarLean) => {
    const last = f.bars.at(-1)?.n ?? x.bar;
    const a = secAt(m, barStart(f, x.bar));
    const z = secAt(m, x.bar >= last ? f.length : barStart(f, x.bar + 1));
    setHearing(true);
    void recording.play(herUrls(m), [[Math.max(0, a - 0.05), z + 0.1]], () => {}, () => setHearing(false));
  };
  return (
    <div className="tb-pop-veil tb-takes-veil tb-beside-veil" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="tb-pop tb-takes tb-beside" role="dialog" aria-modal="true" aria-label={tr("BESIDE KIMIKO")}>
        <button type="button" id="beside-close" className="tg-x tb-pop-x" aria-label="Close" onClick={close}>
          ✕
        </button>
        <h2 className="tb-pop-title">{tr("BESIDE KIMIKO")}</h2>
        <p className="tb-take-meta tb-beside-who">{takeName(take, takeVoiceWord(take.piece))}</p>
        <p className="tb-beside-sum" id="beside-sum">
          {tr("WITH HER IN {n} BARS · AGAINST HER IN {m}", { n: b.withHer, m: b.againstHer })}
        </p>
        <div className="tb-beside-chart">
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={tr("HER TEMPO AND YOUR TIMING, BAR BY BAR")}>
            <text x="4" y="12" className="tb-beside-k">{tr("HER TEMPO (UP: QUICKER)")}</text>
            <text x="4" y={mid2 - 30} className="tb-beside-k">{tr("YOUR TIMING (UP: AHEAD OF THE BEAT)")}</text>
            <line x1="0" x2={W} y1={mid1} y2={mid1} className="tb-beside-axis" />
            <line x1="0" x2={W} y1={mid2} y2={mid2} className="tb-beside-axis" />
            {b.bars.map((x, i) => {
              const clip = (v: number) => Math.max(-28, Math.min(28, v));
              const hh = clip((x.her / herMax) * 24);
              const yh = x.you === null ? 0 : clip((-x.you / youMax) * 24);
              const on = sel?.bar === x.bar;
              return (
                <g key={x.bar} onClick={() => (setSel(x), hear(x))} className="tb-beside-bar" id={`beside-bar-${x.bar}`}>
                  <rect x={i * bw} y="0" width={bw} height={H} className={`tb-beside-hit${on ? " on" : ""}${x.with ? ` ${x.with}` : ""}`} />
                  <rect x={i * bw + bw * 0.2} y={hh >= 0 ? mid1 - hh : mid1} width={bw * 0.6} height={Math.max(1, Math.abs(hh))} fill="#ffd76a" />
                  {x.you !== null && <rect x={i * bw + bw * 0.2} y={yh >= 0 ? mid2 - yh : mid2} width={bw * 0.6} height={Math.max(1, Math.abs(yh))} fill={ink} />}
                  {(x.bar % 4 === 1 || n <= 24) && (
                    <text x={i * bw + bw / 2} y={H - 4} className="tb-beside-n" textAnchor="middle">
                      {x.bar}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
        {sel ? (
          <div className="tb-beside-sel" id="beside-sel">
            <p className="tb-beside-bar-n">
              {tr("BAR {n}", { n: sel.bar })}
              {sel.with ? ` · ${tr(sel.with === "with" ? "WITH HER" : "AGAINST HER")}` : ""}
            </p>
            {barWords(sel).map((w) => (
              <p key={w} className="tb-take-meta">
                {w}
              </p>
            ))}
            <button type="button" className="tb-take-btn tb-take-listen" id="beside-hear" onClick={() => (hearing ? (recording.stop(), setHearing(false)) : hear(sel))}>
              {hearing ? `■ ${tr("STOP")}` : `▶ ${tr("HEAR HER IN THIS BAR")}`}
            </button>
          </div>
        ) : (
          <p className="tb-takes-note">{tr("TAP A BAR TO SEE IT AND HEAR HER PLAY IT.")}</p>
        )}
        {b.herSlowest.length > 0 && (
          <p className="tb-takes-note" id="beside-slowest">
            {tr("WHERE SHE HOLDS BACK MOST")}: {b.herSlowest.map((x) => `${tr("BAR {n}", { n: x.bar })} (${barWords(x)[1]})`).join(" · ")}
          </p>
        )}
        <p className="tb-takes-note">{tr("IT COMPARES YOUR TIMING WITH ONE PIANIST'S RECORDING, NOT WITH AN IDEAL: SHE SETS HER OWN TEMPO, YOU PLAY AGAINST THE GAME'S STEADY BAND.")}</p>
        <p className="tb-pop-lock">{CREDIT}</p>
      </div>
    </div>
  );
}

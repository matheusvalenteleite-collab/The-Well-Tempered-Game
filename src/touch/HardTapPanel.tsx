/**
 * D425, THE HARD TAP's calibration (Settings › TAP STRENGTH, and offered once at the start of the first
 * run with accents on a phone with a motion sensor): six soft taps on the strips, then six hard; their
 * medians kept on the device (hard-tap.ts saveHardCal) and read from the next strike on. Kept plain: the
 * design studio restyles it. Without a sensor (a computer, motion access refused) it says so: the accent
 * is then the strong zone.
 */
import { useEffect, useRef, useState } from "react";
import { tr } from "../i18n/index.ts";
import { askMotion, gameMotion, hardTapDevice, stampOf, type Permission } from "./motion.ts";
import { DEFAULT_HARD_CAL, HARD_WAIT_MS, HARD_WINDOW_MS, hardCalibration, loadHardCal, saveHardCal, type HardCal } from "./hard-tap.ts";

/** Taps of each kind asked. */
export const CAL_TAPS = 6;

const f2 = (x: number) => x.toFixed(2);

/** The settings' row: what is kept, and CALIBRATE (the strips) or Reset. */
export function HardTapSetting() {
  const [cal, setCal] = useState<HardCal>(() => loadHardCal());
  const [open, setOpen] = useState<Promise<Permission> | null>(null);
  const device = hardTapDevice();
  return (
    <>
      <div className="tg-set" id="hard-tap-set">
        <span>{tr("TAP STRENGTH")}</span>
        <span className="tg-panel-val">{!device ? tr("NO MOTION SENSOR: THE STRONG ZONE") : cal.from === "player" ? tr("CALIBRATED") : tr("AS MOST PHONES")}</span>
      </div>
      {open ? (
        <HardTapCalibrate asked={open} done={(c) => (c && setCal(c), setOpen(null))} />
      ) : (
        device && (
          <div className="tg-row">
            <button type="button" id="hard-tap-calibrate" className="tg-piece" onClick={() => setOpen(askMotion(true))}>
              {tr("CALIBRATE")}
            </button>
            {cal.from === "player" && (
              <button type="button" id="hard-tap-reset" className="tg-link" onClick={() => (saveHardCal(null), setCal(DEFAULT_HARD_CAL))}>
                {tr("Reset")}
              </button>
            )}
          </div>
        )
      )}
    </>
  );
}

type Step = "ask" | "soft" | "hard" | "kept" | "alike" | "none";

/**
 * The strips: two bars at the screen's edges, as in the game. `done` with the calibration kept (null: none:
 * cancelled, LATER, or no sensor). `offer`: the run's start (its question first, LATER beside it).
 */
export function HardTapCalibrate({ done, offer, asked }: { done: (c: HardCal | null) => void; offer?: boolean; asked?: Promise<Permission> }) {
  const [step, setStep] = useState<Step>(offer ? "ask" : "soft");
  const [n, setN] = useState(0);
  const [kept, setKept] = useState<HardCal | null>(null);
  const peaks = useRef<{ soft: number[]; hard: number[] }>({ soft: [], hard: [] });
  const stepRef = useRef(step);
  stepRef.current = step;
  // The sensor asked from the tap that opened this (iOS asks only from a gesture: CALIBRATE, or the offer's own button).
  const answer = (q: Promise<Permission>) => void q.then((p) => (p === "denied" || p === "unavailable") && setStep("none"));
  useEffect(() => {
    if (asked) answer(asked);
  }, [asked]);
  const begin = () => {
    setStep("soft");
    answer(askMotion(true));
  };
  const tap = (e: React.PointerEvent) => {
    e.preventDefault();
    const kind = stepRef.current;
    if (kind !== "soft" && kind !== "hard") return;
    const t = stampOf(e.timeStamp, performance.now());
    gameMotion().peakAfter(t, HARD_WINDOW_MS, HARD_WAIT_MS, (pk) => {
      if (stepRef.current !== kind) return;
      if (pk.peak === null) return void (gameMotion().silent && setStep("none"));
      const xs = peaks.current[kind];
      xs.push(pk.peak);
      setN(xs.length);
      if (xs.length < CAL_TAPS) return;
      if (kind === "soft") return void (setStep("hard"), setN(0));
      const c = hardCalibration(peaks.current.soft, peaks.current.hard);
      if (!c) return void setStep("alike");
      saveHardCal(c);
      setKept(c);
      setStep("kept");
    });
  };
  const again = () => {
    peaks.current = { soft: [], hard: [] };
    setN(0);
    setStep("soft");
  };
  const strip = (side: "left" | "right") => (
    <div
      key={side}
      className={`tb-hardcal-strip ${side}`}
      onPointerDown={tap}
      style={{ position: "fixed", top: 0, bottom: 0, [side]: 0, width: "18%", background: "rgba(255, 209, 102, 0.18)", borderInline: "2px solid rgba(255, 209, 102, 0.6)", touchAction: "none", zIndex: 41 }}
    />
  );
  const say =
    step === "ask"
      ? tr("YOUR PHONE CAN FEEL HOW HARD YOU TAP: AN ACCENT IS A HARD TAP. CALIBRATE IT FOR YOUR THUMBS (12 TAPS)?")
      : step === "soft"
        ? tr("TAP SOFTLY ON THE STRIPS: {n} OF {m}", { n, m: CAL_TAPS })
        : step === "hard"
          ? tr("NOW TAP HARD: {n} OF {m}", { n, m: CAL_TAPS })
          : step === "kept" && kept
            ? tr("KEPT: SOFT {s} · HARD {h}", { s: f2(kept.soft), h: f2(kept.hard) })
            : step === "alike"
              ? tr("SOFT AND HARD CAME OUT ALIKE: TRY AGAIN, HARDER")
              : tr("NO MOTION SENSOR HERE: THE ACCENT IS THE STRONG ZONE");
  return (
    <div className="tb-hardcal" role="dialog" aria-label={tr("TAP STRENGTH")} style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--tg-bg, #10131a)", padding: "0 20%" }}>
      {(step === "soft" || step === "hard") && [strip("left"), strip("right")]}
      <div className="tb-hardcal-box" style={{ textAlign: "center", maxWidth: 420 }}>
        <p id="hard-cal-say">{say}</p>
        {(step === "soft" || step === "hard") && <p className="tg-panel-note">{tr("ALLOW MOTION ACCESS WHEN ASKED")}</p>}
        <div className="tg-row" style={{ justifyContent: "center" }}>
          {step === "ask" && (
            <button type="button" id="hard-cal-yes" className="tg-piece" onClick={begin}>
              {tr("CALIBRATE")}
            </button>
          )}
          {step === "alike" && (
            <button type="button" id="hard-cal-again" className="tg-piece" onClick={again}>
              {tr("AGAIN")}
            </button>
          )}
          <button type="button" id="hard-cal-close" className={step === "kept" || step === "none" ? "tg-piece" : "tg-link"} onClick={() => done(kept)}>
            {step === "kept" || step === "none" ? tr("OK") : offer ? tr("LATER") : tr("CANCEL")}
          </button>
        </div>
      </div>
    </div>
  );
}

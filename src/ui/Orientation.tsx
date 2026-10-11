/**
 * Orientation for a learner on their own (D149, after the learnability audit):
 *  - StartScreen (D157, in place of the first-visit welcome): the three modes at every launch; for
 *    a newcomer, what the game is, the tutorial, or everything open to explore.
 *  - ModeIntro: the first time a mode is opened, what it is, what one does there and what one must
 *    know first, with the tutorial lesson that teaches it (where there is one).
 * ModeIntro is a dialog: Escape closes, focus starts on the main action and returns where it was.
 */
import { useEffect, useRef } from "react";
import { t } from "./i18n.ts";
import type { Family } from "./ModeSelect.tsx";

function Dialog({ label, onClose, children }: { label: string; onClose(): void; children: React.ReactNode }) {
  const back = useRef<Element | null>(document.activeElement);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", key, true);
    const was = back.current;
    return () => {
      window.removeEventListener("keydown", key, true);
      if (was instanceof HTMLElement) was.focus();
    };
  }, [onClose]);
  return (
    <div className="dialog-backdrop orientation" role="dialog" aria-modal="true" aria-label={label} onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

/**
 * The start screen (D157): at every launch, the three modes of the game as three doors (Fux's
 * Gradus ad Parnassum, Bach's chorales, the Well-Tempered Clavier), and for a newcomer what the
 * game is and the way into the tutorial (what the first-visit welcome of D149 said).
 */
export function StartScreen({ newcomer, onMode, onTutorial, onExplore }: { newcomer: boolean; onMode(f: Family): void; onTutorial(): void; onExplore(): void }) {
  const door = (f: Family) => (
    <button key={f} className={`start-door mode-${f}`} onClick={() => onMode(f)} autoFocus={!newcomer && f === "fux"}>
      <span className="start-kicker">{t(`ui.start.${f}.kicker`)}</span>
      <strong>{t(`ui.start.${f}.title`)}</strong>
      <span>{t(`ui.start.${f}.sub`)}</span>
    </button>
  );
  return (
    <main className="start-screen" aria-label={t("ui.start.label")}>
      <h1 className="brand start-brand">{t("ui.title")}</h1>
      <p className="start-what">{t(newcomer ? "ui.welcome.what" : "ui.start.choose")}</p>
      <div className="start-doors">{(["fux", "chorale", "wtc"] as Family[]).map(door)}</div>
      <div className="start-more">
        <button className={newcomer ? "primary tutorial-btn" : "tutorial-btn"} onClick={onTutorial} autoFocus={newcomer}>
          <strong>{t("ui.welcome.tutorial")}</strong> <span>{t("ui.start.tutorialSub")}</span>
        </button>
        {newcomer && (
          <p className="help">
            {t("ui.welcome.how")} <button className="link" onClick={onExplore}>{t("ui.welcome.explore")}</button> {t("ui.welcome.exploreSub")}
          </p>
        )}
      </div>
    </main>
  );
}

/** The modes with an introduction, and the tutorial lesson that prepares each (if any). */
export const INTRO_LESSON: Record<string, string | null> = { "3": "three.bass", "4": "four.preview", wtc: "fugue.what", chorale: "harmony.triad", preludes: "harmony.figures" };

export function ModeIntro({ mode, onClose, onLearn }: { mode: string; onClose(): void; onLearn?: (lesson: string) => void }) {
  const lesson = INTRO_LESSON[mode];
  const k = (x: string) => t(`ui.intro.${mode}.${x}`);
  return (
    <Dialog label={k("title")} onClose={onClose}>
      <h2>{k("title")}</h2>
      <p>{k("what")}</p>
      <p>{k("do")}</p>
      <p className="intro-need">
        <strong>{t("ui.intro.need")}</strong> {k("need")}
      </p>
      <div className="welcome-doors">
        {lesson && onLearn && (
          <button className="tutorial-btn" onClick={() => onLearn(lesson)}>
            {t("ui.intro.learn")}
          </button>
        )}
        <button className="primary" onClick={onClose} autoFocus>
          {t("ui.intro.start")}
        </button>
      </div>
    </Dialog>
  );
}

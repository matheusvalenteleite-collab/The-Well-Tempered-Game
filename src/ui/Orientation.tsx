/**
 * Orientation for a learner on their own (D149, after the learnability audit):
 *  - Welcome: the first visit says what the game is and offers two doors — the tutorial for those
 *    who do not read music, the first exercise for those who do — or everything open to explore.
 *  - ModeIntro: the first time a mode is opened, what it is, what one does there and what one must
 *    know first, with the tutorial lesson that teaches it (where there is one).
 * Both are dialogs: Escape closes, focus starts on the main action and returns where it was.
 */
import { useEffect, useRef } from "react";
import { t } from "./i18n.ts";

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

export function Welcome({ onTutorial, onFirst, onExplore }: { onTutorial(): void; onFirst(): void; onExplore(): void }) {
  return (
    <Dialog label={t("ui.welcome.title")} onClose={onFirst}>
      <h2>{t("ui.welcome.title")}</h2>
      <p>{t("ui.welcome.what")}</p>
      <p>{t("ui.welcome.how")}</p>
      <div className="welcome-doors">
        <button className="primary tutorial-btn" onClick={onTutorial} autoFocus>
          <strong>{t("ui.welcome.tutorial")}</strong>
          <span>{t("ui.welcome.tutorialSub")}</span>
        </button>
        <button onClick={onFirst}>
          <strong>{t("ui.welcome.first")}</strong>
          <span>{t("ui.welcome.firstSub")}</span>
        </button>
      </div>
      <p className="help welcome-explore">
        <button className="link" onClick={onExplore}>{t("ui.welcome.explore")}</button> {t("ui.welcome.exploreSub")}
      </p>
    </Dialog>
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

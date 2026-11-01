/**
 * D371 (Mario and Luigi's report, 1a–1c), play.html's title page, on every launch. A black screen says
 * TOUCH TO BEGIN in the three languages (a phone plays no sound before a touch); that touch starts
 * Contrapunctus XIV's B♭–A–C–B♮ on the pipe organ (intro-sound.ts) and the page: Herr Bach's face (the
 * game's sprite, Bach.tsx), the wordmark (wordmark.ts, the title page between gold rules), the subtitle
 * and, small, the version, each fading in on its note. D406: on the D (the subject's continuation, the
 * consort's D major under it) the whole page cross-fades into the selection screen beneath it
 * (INTRO_CROSS_S from INTRO_RESOLVE_S), the chord dying away over the selection. Any further touch skips
 * straight to it (the sound faded out quickly).
 */
import { useEffect, useRef, useState } from "react";
import { lang, tr, WORDMARK, type Lang } from "../i18n/index.ts";
import { PT } from "../i18n/pt.ts";
import { ES } from "../i18n/es.ts";
import { Portrait } from "./Bach.tsx";
import { wordmark } from "./wordmark.ts";
import { VERSION } from "./version.ts";
import { INTRO_CROSS_S, INTRO_HALF_S, INTRO_RESOLVE_S, INTRO_S } from "./intro-sound.ts";

/** TOUCH TO BEGIN in each language (all three on the black screen, the one in force first). */
const BEGIN_IN: Record<Lang, string> = { en: "TOUCH TO BEGIN", pt: PT["TOUCH TO BEGIN"], es: ES["TOUCH TO BEGIN"] };

/** The version as the title page prints it: "VERSION 1.78" (VERSÃO, VERSIÓN). */
export const versionLine = (): string => tr("VERSION {v}", { v: VERSION.replace(/^WTC /, "") });

/** The wordmark: the pixel title page where a canvas draws it, else its words. */
export function Wordmark({ big, scale, className }: { big: number; scale: number; className?: string }) {
  const l = lang();
  const words = WORDMARK[l].filter(Boolean).join(" ");
  // Made once per language and size (cached), so a change of language redraws it.
  const w = wordmark(l, big);
  return w ? (
    <img className={`tb-wordmark${className ? ` ${className}` : ""}`} src={w.url} width={w.w * scale} height={w.h * scale} alt={words} draggable={false} />
  ) : (
    <span className={`tb-wordmark tb-wordmark-text${className ? ` ${className}` : ""}`}>{words}</span>
  );
}

/**
 * `begin` starts the sound and resolves with the seconds until its first note is heard (the picture
 * waits for it, at most a moment); `end` stops it (cut short on a skip) and leaves for the selection.
 */
export function Intro({ begin, end }: { begin: () => Promise<number>; end: (skipped: boolean) => void }) {
  // "touch": the black screen; "show": the title page playing; the times below from its first note.
  const [stage, setStage] = useState<"touch" | "wait" | "show">("touch");
  const done = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finish = (skipped: boolean) => {
    if (done.current) return;
    done.current = true;
    timers.current.forEach(clearTimeout);
    end(skipped);
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const touch = () => {
    if (stage !== "touch") return finish(true);
    setStage("wait");
    const go = (lead: number) => {
      if (done.current) return;
      timers.current.push(setTimeout(() => setStage("show"), Math.max(0, lead * 1000)));
      timers.current.push(setTimeout(() => finish(false), (Math.max(0, lead) + INTRO_S) * 1000));
    };
    // The picture never waits long for the sound to start (D406: the flute needs no loading).
    let started = false;
    const once = (lead: number) => {
      if (started) return;
      started = true;
      go(lead);
    };
    timers.current.push(setTimeout(() => once(0), 2600));
    begin().then(once, () => once(0));
  };
  const l = lang();
  const others = (["en", "pt", "es"] as const).filter((x) => x !== l);
  return (
    <div className={`tb-intro tb-intro-at-${stage}`} id="intro" role="button" tabIndex={0} aria-label={BEGIN_IN[l]} onClick={touch} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && touch()} style={{ ["--note" as string]: `${INTRO_HALF_S}s`, ["--resolve" as string]: `${INTRO_RESOLVE_S}s`, ["--cross" as string]: `${INTRO_CROSS_S}s` }}>
      {stage === "touch" ? (
        <div className="tb-intro-begin">
          <p className="tb-intro-touch" id="intro-touch">
            {BEGIN_IN[l]}
          </p>
          {others.map((x) => (
            <p key={x} className="tb-intro-touch-other" lang={x}>
              {BEGIN_IN[x]}
            </p>
          ))}
        </div>
      ) : stage === "wait" ? null : (
        <div className="tb-intro-page" aria-live="polite">
          <div className="tb-intro-face tb-intro-n1">
            <Portrait talking={false} />
          </div>
          <div className="tb-intro-words">
            <div className="tb-intro-n2">
              <Wordmark big={15} scale={2} className="tb-intro-mark" />
            </div>
            <p className="tb-intro-tag tb-intro-n3">{tr("24 FUGUES FOR TWO THUMBS")}</p>
          </div>
          <p className="tb-intro-version tb-intro-n4" id="intro-version">
            {versionLine()}
          </p>
        </div>
      )}
    </div>
  );
}

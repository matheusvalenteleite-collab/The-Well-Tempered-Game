/**
 * D233, HOME: where the game opens, on both platforms (a phone stacks it): the title with Herr Bach's
 * portrait, a big CONTINUE (START for a new player: home.ts `continueTarget`), a row of CHOOSE PIECE,
 * TUTORIAL, ACHIEVEMENTS, SETTINGS, and a quiet progress line.
 */
import { useMemo } from "react";
import { fugueById } from "../touch/fugue.ts";
import { Portrait } from "./Bach.tsx";
import { Glyph, TROPHY } from "./Achievements.tsx";
import { CAP } from "./LessonMap.tsx";
import { continueTarget, progressLine } from "./home.ts";
import { beatenFugues, readStages } from "./stages.ts";

export interface HomeActions {
  play: (piece: string) => void;
  choose: () => void;
  tutorial: () => void;
  achievements: () => void;
  settings: () => void;
}

export function Home({ current, on }: { current: string; on: HomeActions }) {
  const { target, progress } = useMemo(() => {
    const s = readStages();
    const won = beatenFugues(s);
    return { target: continueTarget(current, s, won), progress: progressLine(won) };
  }, [current]);
  const f = fugueById(target.piece);
  return (
    <div className="tb-home" role="dialog" aria-label="Home">
      <header className="tb-home-head">
        <Portrait talking={false} />
        <h1>
          DAS WOHLTEMPERIRTE
          <br />
          CLAVIER
        </h1>
      </header>
      <button type="button" id="home-continue" className="tb-home-go" onClick={() => on.play(target.piece)}>
        ▶ {target.fresh ? "START" : "CONTINUE"}
        <small>{f.title.toUpperCase()}</small>
      </button>
      <nav className="tb-home-row" aria-label="Menu">
        <button type="button" id="home-choose" onClick={on.choose}>
          <span aria-hidden="true">♪</span> CHOOSE PIECE
        </button>
        <button type="button" id="home-tutorial" onClick={on.tutorial}>
          <Glyph rows={CAP} /> TUTORIAL
        </button>
        <button type="button" id="home-achievements" onClick={on.achievements}>
          <Glyph rows={TROPHY} /> ACHIEVEMENTS
        </button>
        <button type="button" id="home-settings" onClick={on.settings}>
          <span aria-hidden="true">⚙</span> SETTINGS
        </button>
      </nav>
      <p className="tb-home-progress">{progress}</p>
    </div>
  );
}

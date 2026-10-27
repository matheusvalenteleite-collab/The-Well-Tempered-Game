/**
 * D342, THE MANUAL's drills for Phase A (Parts I and II), in the drill format (drill.ts), each with what it
 * claims to drill: its moves (steps, thirds, leaps, repeats) are held to the claim by
 * test/d342-manual.test.ts. Compiled and registered (fugue.ts registerPieces) when this module loads.
 */
import { registerPieces } from "../../touch/fugue.ts";
import { compileDrill, type Drill } from "./drill.ts";

export interface DrillDef {
  text: string;
  /** At least so many of each kind of move (and none of a kind claimed 0). */
  claims: Partial<Record<"steps" | "thirds" | "leaps" | "repeats", number>>;
}

export const DRILL_TEXTS: Record<string, DrillDef> = {
  // I.1: one pitch, eight strikes with a click, then eight with the click fading to silence.
  schlaege: {
    text: `drill "Schlaege" key C meter 4/4 tempo 72
voice G4 q G4 q G4 q G4 q | G4 q G4 q G4 q G4 q | G4 q G4 q G4 q G4 q | G4 q G4 q G4 q G4 q
band click fade 8 12`,
    claims: { repeats: 15, steps: 0, thirds: 0, leaps: 0 },
  },
  // I.2: C4 to G4 and back by steps, then C4–G4–C4 by leaps; WAIT FOR ME.
  treppe: {
    text: `drill "Treppe" key C meter 4/4 tempo 72 wait
voice C4 q D4 q E4 q F4 q | G4 q F4 q E4 q D4 q | C4 h G4 h | C4 q G4 q C4 h
band drone C3`,
    claims: { steps: 8, leaps: 4, repeats: 0 },
  },
  // II.1: eight quavers rocking G4 A4, then B4 C5, the thumbs alternating; WAIT FOR ME.
  pendel: {
    text: `drill "Pendel" key C meter 4/4 tempo 60 wait
voice G4 e A4 e G4 e A4 e G4 e A4 e G4 e A4 e | B4 e C5 e B4 e C5 e B4 e C5 e B4 e C5 e | G4 h r h
band drone C3`,
    claims: { steps: 15, leaps: 1, repeats: 0 },
  },
  // II.4: descending pairs, the second thumb resting on the lower note as the first strikes, the first lifted on the beat.
  paare: {
    text: `drill "Paare" key C meter 4/4 tempo 66
voice E4 q D4 q D4 q C4 q | G4 q F4 q F4 q E4 q | A4 q G4 q G4 q F4 q | E4 h r h
band drone C3`,
    claims: { steps: 7, repeats: 3, leaps: 2 },
  },
  // II.6: D minor up from D4 and back, sixteen semiquavers to a bar (the gesture of Invention 4's opening).
  tonleiter: {
    text: `drill "Tonleiter" key d meter 4/4 tempo 80
voice D4 s E4 s F4 s G4 s A4 s Bb4 s C#5 s D5 s C#5 s Bb4 s A4 s G4 s F4 s E4 s D4 s C#4 s | D4 s E4 s F4 s G4 s A4 s Bb4 s C#5 s D5 s C#5 s Bb4 s A4 s G4 s F4 s E4 s D4 s C#4 s | D4 h r h
band drone D3`,
    claims: { steps: 32, repeats: 0, leaps: 0 },
  },
};

export const DRILLS: Record<string, Drill> = Object.fromEntries(Object.entries(DRILL_TEXTS).map(([k, d]) => [k, compileDrill(d.text)]));
registerPieces(Object.values(DRILLS).map((d) => d.piece));

export const drillOf = (piece: string): Drill | undefined => Object.values(DRILLS).find((d) => d.id === piece);

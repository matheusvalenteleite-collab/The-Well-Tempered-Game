/**
 * D441, GLENN'S FILMS (the owner, 1 Nov 2026: a non-interactive "moment with Glenn" for each fugue, in the
 * manner of Gould's television programmes: he talks, plays, stops, talks while playing; never the whole
 * piece, never its ending, so the player hears the fugue whole only by playing it; a second chapter,
 * marked on the scrub bar, on how to play it, on the game's screen, Busoni's signs taught and mocked).
 *
 * A film is a script the game plays live (GlennFilm.tsx), not a recording: lines, excerpts (bars as
 * decimals, 2.625 = bar 2 at three quarters through), flags riding on notes, Herr Bach's cameos, the
 * chapter mark. Excerpts end like a gentleman's cut: the last beat eased, the last notes left to ring.
 * The rules every film keeps (test/d441-glenn.test.ts): no excerpt longer than four bars, nothing from the
 * last fifth of the piece, under 40% of the bars quoted.
 */
import { barStart, fugueById, type TouchFugue } from "../touch/fugue.ts";
import { standardTempo } from "../touch/tempi.ts";

export interface Flag {
  /** Where the note starts, in bars (2.625: bar 2, three quarters through). */
  at: number;
  voice: number;
  text: string;
}
export type Cue =
  | { kind: "say"; text: string; screen?: "game" }
  | { kind: "cameo"; text: string }
  | { kind: "chapter"; title: string }
  | { kind: "play"; from: number; to: number; voices?: number[]; lead: number; flags?: Flag[]; say?: string; screen?: "game"; thumbs?: boolean; marks?: boolean };

export interface Film {
  piece: string;
  title: string;
  cues: Cue[];
}

export const FILM_I1: Film = {
  piece: "wtc1f01",
  title: "FUGUE 1 IN C MAJOR",
  cues: [
    { kind: "chapter", title: "THE FUGUE" },
    { kind: "say", text: "Fugue number one, C major. The first fugue in the book, which makes it the one everybody has started and almost nobody has listened to." },
    { kind: "say", text: "One voice begins alone: the alto. Listen to its tune. It's the only idea the piece has, and it's enough." },
    {
      kind: "play",
      from: 1,
      to: 2.625,
      voices: [1],
      lead: 1,
      flags: [
        { at: 1.125, voice: 1, text: "four steps up" },
        { at: 1.6875, voice: 1, text: "a little curl" },
        { at: 1.875, voice: 1, text: "then it leaps" },
      ],
    },
    { kind: "say", text: "Fourteen notes. Bach will spend twenty-seven bars refusing to let go of them. The tune comes back twenty-four times. I counted. So did the computer." },
    { kind: "cameo", text: "Twenty-seven bars, well spent." },
    { kind: "say", text: "Now the soprano answers, a fifth higher, on G. Pay attention to this one. The soprano is you." },
    { kind: "play", from: 2.5, to: 4, lead: 0, flags: [{ at: 2.625, voice: 0, text: "you: the answer" }], say: "The alto doesn't stop. It carries on underneath, minding its own business." },
    { kind: "play", from: 4, to: 6, lead: 0, flags: [{ at: 4.125, voice: 2, text: "the tenor" }, { at: 5.625, voice: 3, text: "the bass, last, as basses are" }], say: "Then the tenor. Then the bass. Four voices, one tune." },
    { kind: "say", text: "Here is this fugue's trick. The voices stop waiting their turn. They come in on top of each other with the same tune. It's called a stretto: a seminar in which everyone interrupts." },
    { kind: "play", from: 7, to: 8, lead: 0, flags: [{ at: 7.125, voice: 0, text: "soprano" }, { at: 7.375, voice: 2, text: "tenor, a beat later" }] },
    { kind: "say", text: "That's most of the piece: the tune, everywhere, overlapping. Hardly a moment to rest. It's easy to play dully and hard to play well." },
    { kind: "say", text: "The ending I won't play for you. You'll earn it." },
    { kind: "chapter", title: "HOW TO PLAY IT" },
    { kind: "say", screen: "game", text: "Now your part, the soprano. You come in second, near the end of bar two. Wait for the alto, then take up its tune on G." },
    { kind: "play", from: 2.5, to: 4, lead: 0, screen: "game", thumbs: true, say: "Watch the thumbs. Left, right, taking turns." },
    { kind: "say", screen: "game", text: "Ferruccio Busoni edited this book. A great pianist, who couldn't leave a note alone. Over the first four notes he puts little lines." },
    { kind: "play", from: 2.5, to: 3.25, lead: 0, screen: "game", thumbs: true, marks: true, flags: [{ at: 2.625, voice: 0, text: "a line: hold it" }], say: "A line means hold the note its full length. Four notes, held. Held." },
    { kind: "say", screen: "game", text: "Then a dot, on the note after the jump down. A dot means short: touch and let go. He was very fond of dots." },
    { kind: "play", from: 3, to: 4, lead: 0, screen: "game", thumbs: true, marks: true, flags: [{ at: 3.5, voice: 0, text: "a dot: short" }], say: "Short. Then hold the next one." },
    { kind: "say", screen: "game", text: "The hard part is bars eight to twelve. The notes get quicker, and that's where people lose the crowd. Take turns with your thumbs, and don't chase the music: let it come to the line." },
    { kind: "play", from: 8, to: 10, lead: 0, screen: "game", thumbs: true, marks: true, say: "Left, right. Let it come to you." },
    { kind: "say", screen: "game", text: "If the crowd walks out, try it at SLOW. I've played things slower than anyone dared, and they called it insight." },
    { kind: "say", screen: "game", text: "Once more, the essentials. Wait for the alto. Come in on G. Four notes held, one short, thumbs taking turns. Off you go." },
  ],
};

export const FILMS: Record<string, Film> = { wtc1f01: FILM_I1 };
export const filmOf = (id: string): Film | undefined => FILMS[id];

/** Seconds a line stays up: reading time, at least two and a half seconds. */
export const sayFor = (text: string) => Math.max(2.5, 1.2 + text.length * 0.052);

/** The last beat of an excerpt slows to this share of the tempo (the gentleman's cut); its last notes ring this long. */
export const EASE = 0.25;
export const RING_S = 1.1;
/** Seconds of the box shown ahead of the gold line. */
export const AHEAD_S = 4.2;

export interface Seg {
  cue: Cue;
  t0: number;
  dur: number;
  chapter: number;
  /** A play cue's own clock. */
  clock?: Clock;
}
export interface Clock {
  from: number;
  to: number;
  tps: number;
  /** Seconds from the excerpt's start to a tick (the last beat eased). */
  at: (tick: number) => number;
  end: number;
}

/** A bar position (2.625) as a tick. */
export function tickOf(f: TouchFugue, pos: number): number {
  const n = Math.floor(pos);
  return Math.round(barStart(f, n) + (pos - n) * f.barTicks);
}

function clockOf(f: TouchFugue, from: number, to: number, bpm: number): Clock {
  const tps = (f.tpq * bpm) / 60;
  const ease = Math.max(from, to - f.tpq);
  const beat = f.tpq / tps;
  const at = (tick: number) => {
    if (tick <= ease) return (tick - from) / tps;
    const x = Math.min(1, (tick - ease) / f.tpq);
    return (ease - from) / tps - (beat / EASE) * Math.log(1 - EASE * x);
  };
  return { from, to, tps, at, end: at(to) };
}

export function timeline(film: Film): { segs: Seg[]; total: number; chapter2: number } {
  const f = fugueById(film.piece);
  const bpm = standardTempo(film.piece);
  let t = 0;
  let chapter = 0;
  let chapter2 = 0;
  const segs: Seg[] = [];
  for (const cue of film.cues) {
    if (cue.kind === "chapter") {
      chapter++;
      if (chapter === 2) chapter2 = t;
      segs.push({ cue, t0: t, dur: 1.6, chapter });
      t += 1.6;
    } else if (cue.kind === "play") {
      const clock = clockOf(f, tickOf(f, cue.from), tickOf(f, cue.to), bpm);
      const dur = clock.end + RING_S + 0.4;
      segs.push({ cue, t0: t, dur, chapter, clock });
      t += dur;
    } else {
      const dur = sayFor(cue.text);
      segs.push({ cue, t0: t, dur, chapter });
      t += dur;
    }
  }
  return { segs, total: t, chapter2 };
}


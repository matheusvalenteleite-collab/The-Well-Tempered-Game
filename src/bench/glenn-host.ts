/**
 * D441, GLENN AS THE TUTORIAL'S HOST (the owner, 1 Nov 2026: "improve the pre-existing tutorial by turning
 * it into Glenn tutorials … Glenn ought to resemble the real Glenn Gould … Herr Bach will be kept for small
 * appearances"). The pilot (the Lab only, lab.html?pilot=glenn): Part 1 hosted by Glenn, a character after
 * Glenn Gould (dry, sardonic, in love with the music; his lines are the game's own wit, never a quotation
 * of the real man). Who speaks is set as a lesson begins (BenchApp); every bubble asks `host()` for the
 * face and `hostLine` for the words: Glenn's own wording where he has one, else the line as written.
 */
import { APP } from "./config.ts";

export type Host = "bach" | "glenn";
let who: Host = "bach";
export const host = (): Host => who;
export const setHost = (h: Host) => void (who = h);
export const hostName = (): string => (who === "glenn" ? "Glenn" : "Herr Bach");
/** The parts Glenn hosts in the pilot. */
export const GLENN_PARTS = ["1"];
export const glennHosts = (part: string): boolean => !!APP.glennPilot && GLENN_PARTS.includes(part);

/** Glenn's wording of Part 1's lines (English; the Lab is English only), keyed by the line as Bach says it. */
export const GLENN_LINES: Record<string, string> = {
  // 1.1's tour.
  "Welcome. This is the screen you will play on. Let me show you its parts, one at a time.": "Ah. You came. Sit down; the chair is too high, they always are. This is where you'll play. I'll show you the parts quickly. I loathe a long introduction.",
  "Hold the phone sideways. Your thumbs go here, on these two strips. Touch anywhere along them.": "Phone sideways. Your thumbs live on these two strips, anywhere along them. Go on: touch both.",
  "In the middle the music goes by, right to left. Each little bar is one note.": "In the middle the music goes by, right to left. Each little bar is one note. Very democratic.",
  "The notes with a white border are yours. The thin ones are mine: I play them for you.": "The notes with a white border are yours. The thin ones are mine. I'll play them, and I'll try not to hum.",
  "When one of your notes reaches the gold line, touch a strip. That plays it.": "When one of your notes reaches the gold line, touch a strip. That plays it. The gold line is now. Everything else is past or future.",
  "A higher note: touch higher on the strip. A lower note: lower. Not exactly; just the right way.": "Higher note, higher on the strip. Lower note, lower. Not exactly: just the right way. The direction matters, the inch doesn't.",
  "Six parts, one at a time.": "Six things. Quickly.",
  "That is the whole screen. Now a tune.": "That's the whole screen. Now some music, which is the point.",
  // 1.2 THE LEFT THUMB ALONE.
  "Invention 1 begins with a little tune of eight notes. First your left thumb alone.": "Bach's first Invention starts with eight notes. The whole piece grows out of them; the rest is those eight, argued over. Left thumb first.",
  "Watch my left thumb. One note, then one a little higher: it climbs with the music, and drops where the music drops.": "Watch my left thumb. It climbs when the music climbs and drops when it drops. That's the whole trick.",
  "Now you, left thumb. Don't hurry: each note waits for you.": "Your left thumb. No hurry: each note waits for you. I'm a patient man, in this one respect.",
  "Now in time. I count four, then you begin. I'll go slowly.": "Now in time. I count four, then you're in. Slowly. It isn't a race, whatever the virtuosi tell you.",
  "That was the first idea of my first Invention, and you just played it.": "Those eight notes are the seed of the whole Invention. You've just planted it.",
  "Slowly: one note at a time, up when the tune goes up. Again.": "Slowly. One note at a time, up when the tune goes up. Again.",
  // 1.3 THE RIGHT THUMB ALONE.
  "The same tune with your right thumb. You know it already: only the thumb is new.": "Same tune, other thumb. You know it already; only the thumb is new.",
  "The same tune, with my right thumb. Your left one rests.": "Same tune, my right thumb. Your left one rests. Let it.",
  "Now you, right thumb. Each note waits for you.": "Your right thumb. Each note waits for you.",
  "Now in time, right thumb. I count four, then you begin.": "In time, right thumb. Four, and in.",
  "Both thumbs know the tune now.": "Both thumbs know the tune. The beginning of independence, which is all counterpoint is.",
  "One note at a time, the right way. Again.": "One note at a time, the right way. Again.",
  // 1.4 TAKING TURNS.
  "Quick notes are easier with two thumbs, one after the other.": "Quick notes go better with two thumbs, one after the other. Like walking: nobody hops on one leg by choice.",
  "Now both thumbs, taking turns. Under each note: ● one thumb, ○ the other, either way round.": "Both thumbs, taking turns. Under each note: ● one thumb, ○ the other, whichever way round you like. I don't care which; I care that they alternate.",
  "Now you: start with either thumb, then the marks tell you when to change.": "Your turn. Start with either thumb; the marks tell you when to change.",
  "In time, taking turns. I count four.": "In time, taking turns. Four, and in.",
  "A little quicker now. The same turns.": "A touch quicker. Same turns.",
  "Two thumbs walk where one would stumble.": "Two thumbs walk where one would stumble. Remember that when the notes get quick. They will.",
  "One thumb, then the other, as the marks say. Again.": "One thumb, then the other, as the marks say. Again.",
  // 1.5 PLAYING WITH BACH.
  "Now we play together. The music has two lines, two voices: I play one, you play the other.": "Now we play together. Two lines, two voices: I take one, you take the other. Not melody and accompaniment: a conversation.",
  "Watch the lower notes, the ones with a white border: that will be your part. My upper voice begins; yours answers.": "Watch the lower notes, the white-bordered ones. That's your part. My upper voice begins; yours answers.",
  "I'll take the upper voice, and you take the lower one. On my count: I play my tune first; when it reaches you, answer with the same tune, lower down.": "I take the upper voice, you the lower. I play the tune first; when it reaches you, answer with the same tune, lower down. Don't interrupt me. It's rude, even in counterpoint.",
  "We just played my Invention together, two voices. You answered me.": "We just played an Invention together, two voices, and you answered me. That, in small, is everything Bach does.",
  "Wait for my tune to reach the gold line, then answer it. Again.": "Wait for my tune to reach the gold line, then answer it. Again.",
  "From now on you play with me. My voices are drawn in their own colours, and the bar below names them: yours, and mine.": "From now on we play together. My voices have their own colours, and the bar below names them: yours, and mine.",
  "Your first notes, with both thumbs and with me. Next: high and low.": "Your first notes, both thumbs, and a duet with me. Next: high and low.",
  // The flow's own words between the steps.
  "Now you try, slowly.": "Your turn. Slowly.",
  "Now you, in time.": "Now you, in time.",
  "Good. On to the next.": "Good. Next.",
  "Let's go on: we'll meet this again.": "Let's move on. It'll come back; things do, in Bach.",
};

/** The line as the host says it (Glenn's wording where he has one). */
export const hostLine = (text: string): string => (who === "glenn" ? (GLENN_LINES[text] ?? text) : text);

/**
 * D504, ZELENKA TRIO's continuo scripts (trio.ts): for the fugues that open on the trio, where the basso continuo
 * (the cello and the harpsichord on the bassoon's line in three voices; the harpsichord on the cello's in four)
 * joins the bass, and why: each moment a bar (a fraction where the music asks), "in" or "out", and its reason, as
 * the colour plans are written (D355). Every moment is snapped to the bass's next phrase start (trio.ts spansOf),
 * so the continuo enters and leaves between phrases, never inside a note. Sources: Ledbetter's sections
 * (data/wtc/ledbetter-sections.json), the entries and cadences of the touch data (tools/touch/analysis.ts),
 * Keller's and Bodky's characters as the colour plans quote them; a Zelenka trio sonata's manner (ZWV 181: the
 * continuo silent under the trebles' imitations, the full band for the cadences, the bass's entries, the climax).
 */
/** A moment: the bar, whether the continuo comes in or goes out there, and why. */
export type ContinuoMoment = readonly [bar: number, inOut: "in" | "out", why: string];

export const TRIO_CONTINUO_SCRIPTS: Readonly<Record<string, readonly ContinuoMoment[]>> = {
  // I/13 in F#, euphonious, the "little brook" (4/4; Ledbetter: exposition 1-7, then 7-23 and 23-35; episodes 7-11, 12-15,
  // 17-20, 22-28). Three voices: the two oboes and the bassoon: the cello and the harpsichord join the bassoon.
  wtc1f13: [
    [5, "in", "The subject enters in the bass (5), closing the exposition: the continuo with it, under the two oboes' entries (1, 3)."],
    [8, "out", "The first episode (7-11), its water figures light: the reeds alone after the cadence in F# (7)."],
    [10, "in", "The approach to the perfect cadence in C# (11) and the soprano's return (11)."],
    [12, "out", "The episode 12-15 and the alto's entry (15): the oboes' conversation over the bassoon alone."],
    [16, "in", "Toward the perfect cadence in C# (17)."],
    [18, "out", "The episode 17-20, light again."],
    [20, "in", "The bass's entry in D# minor (20) and the cadences in D# minor (22, 23): the fugue's darkest moment."],
    [24, "out", "The long episode (23-28) and the alto's B major entry (28): the reeds alone."],
    [30, "in", "The last entry, the soprano's in F# (31), and the close (34-35) over the full continuo."],
  ],
  // II/23 in B, a double fugue in long notes (2/2: Keller, "quietly flowing, singing"; the second subject from 27, a long
  // episode 63-75 with the bass silent 61-74, a pedal on E 94-95). Four voices: the oboes, the bassoon and the cello on
  // the bass: the harpsichord joins the cello.
  wtc2f23: [
    [1, "in", "The subject opens in the bass (1): the continuo states the ground the trio's entries build on."],
    [5, "out", "The answer in the tenor (5) and the upper entries (10, 14): the voices alone over the cello."],
    [19, "in", "The bass's entry in G# minor (19), closing the exposition: the tension toward the cadence in F# (27)."],
    [27, "out", "The second subject enters (27-28): new matter, over the cello alone."],
    [31, "in", "The bass's entries in E and C# minor (31, 36) about the cadence in B (35): the subjects combined."],
    [40, "out", "An interlude of the upper voices (40-48)."],
    [48, "in", "The bass's G# minor entry in stretto with the soprano's C# minor (48-49), the bass in C# minor (54): the climax, to the cadences in E (59-61)."],
    [61, "out", "The long episode (61-75), the bass silent: the oboes and the bassoon alone."],
    [75, "in", "The bass's return in B (75) after its long silence, and the cadence in G# minor (76)."],
    [80, "out", "The middle voices' entries (85, 86) over the cello alone."],
    [89, "in", "The final group: the bass's G# and F# entries (89, 91), the soprano's last B (93), the pedal on E (94-95), the close in B (104)."],
  ],
};

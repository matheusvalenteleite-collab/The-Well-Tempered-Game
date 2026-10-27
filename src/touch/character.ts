/**
 * D309, each fugue's character (the practice report §6.1, §6.3): how the others' quavers and crotchets
 * are let go. "antico" (stile antico, ricercar-like, or played legato by pianists): steps and leaps held
 * nearer their full value; "lively" (dance, gigue and toccata-like fugues, or played detached by
 * pianists): a little shorter; "neutral": the instrument's table as it is (phrasing.ts, practice.ts
 * SHIFT). Never the player's touch, never a level.
 *
 * The owner corrects this table: change a letter and its reason, nothing else. "data" means the ASAP
 * piano measurement in the report (§3.3: per-fugue medians); the rest is the common characterisation
 * of the fugue (metre, subject, style), our judgment. Preludes, the Art of Fugue and the tutorial's
 * pieces are neutral (not listed).
 */
export type Character = "antico" | "neutral" | "lively";

const A = "antico";
const N = "neutral";
const L = "lively";

export const CHARACTER: Record<string, readonly [Character, string]> = {
  wtc1f01: [A, "data: played legato, overlapping (quavers held 1.12-1.19); vocal subject, dense strettos"],
  wtc1f02: [N, "lively semiquaver subject, but its readings already detach its quavers (marks come first)"],
  wtc1f03: [L, "data: bass detached (0.50/0.17), top steps legato; light passepied-like 4/4"],
  wtc1f04: [A, "stile antico (report §6.1): five-voice ricercar in 2/2, long values"],
  wtc1f05: [L, "French overture style: sharp dotted figures and runs, detached"],
  wtc1f06: [N, "3/4, moderate, inverted subject; neither dance nor motet"],
  wtc1f07: [L, "light, gigue-like quaver subject"],
  wtc1f08: [A, "stile antico: vocal subject in long values, augmentation and inversion"],
  wtc1f09: [L, "data: quaver staccato throughout (0.17-0.25)"],
  wtc1f10: [L, "two-voice toccata-like running fugue in 3/4"],
  wtc1f11: [L, "3/8 passepied-like dance"],
  wtc1f12: [A, "grave chromatic subject in long values, motet-like"],
  wtc1f13: [N, "gentle, lyrical 4/4"],
  wtc1f14: [N, "slow 6/4, contemplative but not alla breve"],
  wtc1f15: [L, "6/8 gigue (data: fast quavers near legato, 0.84-0.91: the table's fast rows join them anyway)"],
  wtc1f16: [N, "moderate 4/4, the subject's leap and repeated notes"],
  wtc1f17: [N, "moderate 4/4, short cheerful subject"],
  wtc1f18: [A, "data: played legato (1.03-1.08)"],
  wtc1f19: [L, "9/8, dance-like, detached subject leaps"],
  wtc1f20: [L, "data: detached throughout (0.28-0.32); toccata-like"],
  wtc1f21: [L, "light 3/4 dance"],
  wtc1f22: [A, "stile antico (report §6.1); data: legato (1.10-1.15)"],
  wtc1f23: [N, "calm 4/4"],
  wtc1f24: [A, "Largo, chromatic subject in long values (its paired slurs are the readings')"],
  wtc2f01: [L, "data: detached (0.16-0.56)"],
  wtc2f02: [N, "dignified 4/4 with augmentation, short subject"],
  wtc2f03: [L, "quick, short subject, strettos"],
  wtc2f04: [L, "12/16 gigue-like"],
  wtc2f05: [A, "stile antico-like alla breve, strettos (report: 'II/5?', our call)"],
  wtc2f06: [L, "fast toccata-like triplet runs"],
  wtc2f07: [A, "alla breve, stile antico"],
  wtc2f08: [N, "serious 4/4, not alla breve"],
  wtc2f09: [A, "stile antico (report §6.1): the classic ricercar in 4/2"],
  wtc2f10: [L, "long gigue-like subject with trills"],
  wtc2f11: [L, "6/16 gigue"],
  wtc2f12: [L, "light 2/4, gavotte-like"],
  wtc2f13: [L, "gavotte-like 2/2"],
  wtc2f14: [N, "data: moderately detached (0.39-0.57); serious triple fugue"],
  wtc2f15: [L, "fast 3/8 dance"],
  wtc2f16: [L, "data: bass more detached (0.28/0.19, top 0.63)"],
  wtc2f17: [N, "broad 4/4"],
  wtc2f18: [N, "flowing 6/8 double fugue"],
  wtc2f19: [L, "light, quick subject"],
  wtc2f20: [L, "data: bass detached (0.37/0.17), top steps legato; angular subject"],
  wtc2f21: [L, "light 3/4"],
  wtc2f22: [A, "stile antico (report §6.1); data: mostly joined (0.75-0.93)"],
  wtc2f23: [N, "broad alla breve, not stile antico"],
  wtc2f24: [L, "3/8 passepied-like"],
};

/** A piece's character (unlisted: neutral). */
export const characterOf = (id: string): Character => CHARACTER[id]?.[0] ?? "neutral";

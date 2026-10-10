/**
 * Progressive unlocking of the tutorial (D99). In BETA every lesson is open. In the real setup a
 * lesson opens once the one before it is done; a lesson done stays open; the first is always open.
 */
export function lessonOpen(ids: readonly string[], done: readonly string[], k: number, beta: boolean): boolean {
  if (beta || k <= 0) return true;
  return done.includes(ids[k]) || done.includes(ids[k - 1]);
}

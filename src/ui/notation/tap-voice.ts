/**
 * Which voice a tap on a staff writes (P1). The active voice if it lives on that staff; else, on a
 * staff of two of the player's voices, the one last active there; else the staff's first voice of
 * the player's (null on a staff with none, e.g. the cantus alone). Before P1 it was always the
 * first, so that after a tap on the other staff the lower voice of a shared staff (the bass in
 * four voices) could not be reached by tapping: its notes went to the voice above it.
 */
export function tapVoice(voices: readonly { staff: number; editable: boolean }[], staff: number, active: number, last: ReadonlyMap<number, number>): number | null {
  const here = voices.map((v, i) => ({ v, i })).filter(({ v }) => v.staff === staff && v.editable).map(({ i }) => i);
  if (here.includes(active)) return active;
  const before = last.get(staff);
  if (before !== undefined && here.includes(before)) return before;
  return here[0] ?? null;
}

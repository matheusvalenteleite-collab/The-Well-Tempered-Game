/**
 * D303: the sound chosen from one dropdown (the owner: "make sound selection easier to handle … I
 * don't want the clutter. A dropdown list which has the fugue default sound pre selected"). A native
 * select (on a phone, the system's own wheel or list), the sounds grouped by kind, the piece's own
 * sound first, starred, and chosen until the player picks another. Used by the pop-up and by ⚙ SOUND.
 */
import { tr } from "../i18n/index.ts";
import { presetById } from "../touch/sound.ts";

/** The kinds, in order; a sound in none of them goes under MORE. */
export const SOUND_GROUPS: readonly [group: string, ids: readonly string[]][] = [
  ["INSTRUMENTS", ["harpsichordSampled", "pianoSampled", "chamberOrgan"]],
  ["GAME CONSOLES", ["chip", "gameboy", "super16", "nocturne32", "megaFm", "sid64", "tracker", "forest64", "party64"]],
  ["SYNTHESIZERS", ["analog", "modular", "tomita"]],
  ["VOICES", ["vocalSynth", "soloVoices"]],
];

type Sound = readonly [id: string, name: string];

/** The options: the piece's own sound first (its group "THIS PIECE"), then the others by kind, each kind in the list's order. */
export function soundOptions(sounds: readonly Sound[], own?: string): { group: string; items: Sound[] }[] {
  const out: { group: string; items: Sound[] }[] = [];
  const mine = own ? (sounds.find(([id]) => id === own) ?? ([own, presetById(own).name] as const)) : null;
  if (mine) out.push({ group: "THIS PIECE", items: [mine] });
  const rest = sounds.filter(([id]) => id !== own);
  const placed = new Set<string>();
  for (const [group, ids] of SOUND_GROUPS) {
    const items = rest.filter(([id]) => ids.includes(id));
    items.forEach(([id]) => placed.add(id));
    if (items.length) out.push({ group, items });
  }
  const more = rest.filter(([id]) => !placed.has(id));
  if (more.length) out.push({ group: "MORE", items: more });
  return out;
}

export function SoundSelect({ id, value, set, sounds, own }: { id: string; value: string; set: (id: string) => void; sounds: readonly Sound[]; own?: string }) {
  const groups = soundOptions(sounds, own);
  return (
    <label className="tb-sound-select">
      <span>{tr("SOUND")}</span>
      <span className="tb-sound-pick">
        <select id={id} value={value} onChange={(e) => set(e.target.value)}>
          {groups.map(({ group, items }) => (
            <optgroup key={group} label={tr(group)}>
              {items.map(([sid, name]) => (
                <option key={sid} value={sid}>
                  {sid === own ? `★ ${tr(name)}` : tr(name)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <span aria-hidden="true">▾</span>
      </span>
    </label>
  );
}

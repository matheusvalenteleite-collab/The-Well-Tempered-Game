import type { TrioFinding } from "../game/trio-eval.ts";
import type { Slot } from "../counterpoint/layout.ts";
import { t } from "./i18n.ts";

// Findings of the same kind (and interval) are said once, naming all their places (owner).
function merge(fs: TrioFinding[]) {
  const m = new Map<string, TrioFinding & { groups: number[][] }>();
  for (const f of fs) {
    const key = `${f.kind}|${f.detail ?? ""}`;
    const g = m.get(key);
    if (g) g.groups.push(f.slots);
    else m.set(key, { ...f, groups: [f.slots] });
  }
  return [...m.values()];
}

/** Where the three-voice texture (cantus, your line, Fux's) works and where it breaks (D47). */
export function TrioReading({ findings, layout }: { findings: TrioFinding[]; layout: Slot[] }) {
  const half = layout.some((sl) => sl.beat === 1);
  const firstBar = layout[0]?.bar ?? 0;
  const where = (slots: number[]) =>
    [...new Set(slots)]
      .map((k) => {
        const sl = layout[k];
        const bar = sl.bar - firstBar + 1;
        return half ? `${bar}${"abcd"[sl.beat]}` : String(bar);
      })
      .join(", ");
  const faults = merge(findings.filter((f) => f.tone === "fault"));
  const notes = merge(findings.filter((f) => f.tone === "note"));
  const good = findings.filter((f) => f.tone === "good");
  const whereAll = (f: TrioFinding & { groups?: number[][] }) => (f.groups ? f.groups.map((g) => where(g).replace(", ", "–")).join(f.groups.every((g) => g.length === 1) ? ", " : "; ") : where(f.slots));
  const item = (f: TrioFinding & { groups?: number[][] }, i: number) => (
    <li key={`${f.kind}-${i}`} className={f.tone}>
      {t(`ui.trio.${f.kind}`, { where: whereAll(f), detail: f.detail ? t(`ui.trio.interval.${f.kind === "parallelPerfect" ? "plural" : "single"}.${f.detail}`) : "", n: new Set(f.slots).size })}
    </li>
  );
  return (
    <section className="compare trio-reading">
      <p className="help">{t(half ? "ui.trio.introHalf" : "ui.trio.intro")}</p>
      {faults.length === 0 && <p className="help">{t("ui.trio.noFaults")}</p>}
      {faults.length > 0 && (
        <>
          <h5>{t("ui.trio.breaks")}</h5>
          <ul className="reasons">{faults.map(item)}</ul>
        </>
      )}
      {notes.length > 0 && (
        <>
          <h5>{t("ui.trio.notes")}</h5>
          <ul className="reasons">{notes.map(item)}</ul>
        </>
      )}
      {good.length > 0 && (
        <>
          <h5>{t("ui.trio.works")}</h5>
          <ul className="reasons">{good.map(item)}</ul>
        </>
      )}
    </section>
  );
}

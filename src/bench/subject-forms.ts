/**
 * D676 (design studio; the owner: "when a fugue has multiple subjects, and variations of a subject (eg inversion
 * augmentation), these should be illustrated in the fugue card where we can hear the subject"): the forms a fugue's
 * subjects take, read from its entries as tagged (Instruments' tables: `theme` 2 or 3, `inverted`, `scale` 2 or 0.5):
 * one form for each subject and each transformation the fugue actually uses, in the order they first sound, each
 * with its first entry (the one heard) and the bar it first comes in. Nothing invented: a form the tables do not tag
 * is not shown (docs/design/SUBJECT-FORMS.md lists the gaps).
 */
import { fugueById, type TouchEntry } from "../touch/fugue.ts";
import { tr } from "../i18n/index.ts";

export interface SubjectForm {
  /** The subject (1, 2, 3), turned upside down, its note values doubled (2) or halved (0.5). */
  theme: number;
  inverted: boolean;
  scale: number;
  /** Its first entry (heard and drawn), and the bar it first comes in. */
  entry: TouchEntry;
  bar: number;
}

/**
 * Where the tables' second line is a countersubject rather than a second subject, the card calls it so (Instruments,
 * from each table's header: the Inventions' and Sinfonias 9 and 13's second lines, counted for their double
 * counterpoint; the Chromatic Fugue's, D770; the Albinoni fugue's, D779; Duets 2 and 4's, D740).
 */
const COUNTER = /^bwv(77[2-9]|78[0-6]|795|799|803|805|951|903-2)$/;

/** The fugue's subject forms, in the order they first sound (the first subject's first form first). */
export function subjectForms(id: string): SubjectForm[] {
  const f = fugueById(id);
  const seen = new Map<string, SubjectForm>();
  for (const e of [...f.entries].sort((a, b) => a.on - b.on || a.voice - b.voice)) {
    const theme = e.theme ?? 1;
    const inverted = !!e.inverted;
    const scale = e.scale ?? 1;
    const key = `${theme}:${inverted}:${scale}`;
    if (!seen.has(key)) seen.set(key, { theme, inverted, scale, entry: e, bar: e.bar });
  }
  return [...seen.values()].sort((a, b) => a.theme - b.theme || a.bar - b.bar);
}

/** A form's label: which subject (where there are more than one), and how it is changed. */
export function formLabel(id: string, form: SubjectForm, forms: readonly SubjectForm[]): string {
  const counters = COUNTER.test(id);
  const themes = new Set(forms.filter((x) => !counters || x.theme === 1).map((x) => x.theme)).size;
  const counter = counters && form.theme > 1;
  const subject = counter ? tr("COUNTERSUBJECT") : themes > 1 ? tr("SUBJECT {n}", { n: form.theme }) : tr("SUBJECT");
  const how = [form.inverted ? tr("INVERTED") : "", form.scale >= 2 ? tr("AUGMENTED") : form.scale > 0 && form.scale <= 0.5 ? tr("DIMINISHED") : ""].filter(Boolean);
  if (!how.length) return subject;
  return themes > 1 || counter ? `${subject} · ${how.join(" · ")}` : how.join(" · ");
}

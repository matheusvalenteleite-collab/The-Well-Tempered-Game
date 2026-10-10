/** The tutorial's words (D140): src/content/tutorial.en.json, read like the game's own strings. */
import content from "../content/tutorial.en.json" with { type: "json" };

export interface LessonText {
  title: string;
  /** Paragraphs. "**bold**" is bold; a paragraph "@quote:<step id>" is Aloysius's opening line of that exercise. */
  text: string[];
  prompt?: string;
  hint?: string;
  done?: string;
  clips?: Record<string, string>;
  options?: Record<string, { label: string; why: string }>;
  choices?: Record<string, string>;
}

const C = content as unknown as {
  ui: Record<string, string>;
  chapters: Record<string, { title: string; blurb: string }>;
  lessons: Record<string, LessonText>;
  say: Record<string, string>;
  coach: Record<string, string>;
  quiz: Record<string, string>;
  road: Record<string, string>;
  tour: Record<string, string | { title: string; text: string }>;
};

const fill = (key: string, value: string | undefined, vars: Record<string, string | number>) => {
  if (typeof value !== "string") throw new Error(`missing tutorial string ${key}`);
  return value.replace(/\{(\w+)\}/g, (_, v: string) => {
    if (!(v in vars)) throw new Error(`missing variable ${v} for ${key}`);
    return String(vars[v]);
  });
};

/** A string of a flat section: tt("ui.next"), tt("coach.perfect", {...}). */
export function tt(key: string, vars: Record<string, string | number> = {}): string {
  const [section, ...rest] = key.split(".");
  const sub = (C as unknown as Record<string, Record<string, unknown>>)[section];
  return fill(key, sub?.[rest.join(".")] as string | undefined, vars);
}

export function lessonText(id: string): LessonText {
  const l = C.lessons[id];
  if (!l) throw new Error(`no tutorial text for lesson ${id}`);
  return l;
}

export function chapterText(id: string) {
  const c = C.chapters[id];
  if (!c) throw new Error(`no tutorial text for chapter ${id}`);
  return c;
}

export function tourText(id: string): { title: string; text: string } {
  const x = C.tour[id];
  if (typeof x !== "object") throw new Error(`no tour text for ${id}`);
  return x;
}

export const lessonIds = () => Object.keys(C.lessons);
export const chapterIds = () => Object.keys(C.chapters);

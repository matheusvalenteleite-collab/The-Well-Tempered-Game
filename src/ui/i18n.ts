/** Localizable strings. All UI and tutor text lives in src/content/<lang>.json. */
import en from "../content/en.json" with { type: "json" };

type Tree = { [k: string]: string | Tree };
const content: Tree = en;

export function t(key: string, vars: Record<string, string | number> = {}): string {
  const [section, ...rest] = key.split(".");
  const sub = content[section];
  const value = typeof sub === "object" ? sub[rest.join(".")] : undefined;
  if (typeof value !== "string") throw new Error(`missing content string ${key}`);
  return value.replace(/\{(\w+)\}/g, (_, v: string) => {
    if (!(v in vars)) throw new Error(`missing variable ${v} for ${key}`);
    return String(vars[v]);
  });
}

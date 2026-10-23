// For the painters' tests: a .tsx module (MusicBox's colours, imported by the painters) loaded by
// transpiling it (TypeScript's JSX to react/jsx-runtime); node strips the .ts files itself.
import { readFile } from "node:fs/promises";
import ts from "typescript";

export async function load(url, context, next) {
  if (!url.endsWith(".tsx")) return next(url, context);
  const src = await readFile(new URL(url), "utf8");
  const out = ts.transpileModule(src, {
    fileName: new URL(url).pathname,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, rewriteRelativeImportExtensions: false },
  });
  return { format: "module", source: out.outputText, shortCircuit: true };
}

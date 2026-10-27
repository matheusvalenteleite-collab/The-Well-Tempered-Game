/**
 * D341: a small reader of part-wise MusicXML (and compressed .mxl), enough for the IMSLP editions of
 * BWV 228 (Brodersen's, from Capella) and BWV 54 (Casadesus-Masanell's, from MuseScore): each part's
 * notes as [onset, duration, spelled pitch] in ticks (TPQ a quarter), tied notes joined, grace and cue
 * notes left out, chords kept; the bars (the measures as written, a repeat or da capo not taken); the
 * first time signature, the parts' names. Lyrics, dynamics and layout are skipped.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { TPQ } from "../../src/wtc/kern.ts";

export interface XmlPart {
  id: string;
  name: string;
  notes: [on: number, dur: number, pitch: string][];
}
export interface XmlScore {
  parts: XmlPart[];
  bars: { n: number; on: number }[];
  meter: string;
  length: number;
}

/** The score's text: a .mxl unzipped (its rootfile) by python's zipfile, else the file. */
export function xmlText(path: string): string {
  if (!path.endsWith(".mxl")) return readFileSync(path, "utf8");
  const py =
    "import sys,zipfile,re\nz=zipfile.ZipFile(sys.argv[1])\nc=z.read('META-INF/container.xml').decode() if 'META-INF/container.xml' in z.namelist() else ''\nm=re.search(r'full-path=\"([^\"]+)\"',c)\nn=m.group(1) if m else [x for x in z.namelist() if x.endswith(('.xml','.musicxml')) and not x.startswith('META')][0]\nsys.stdout.write(z.read(n).decode('utf-8','replace'))";
  return execFileSync("python3", ["-I", "-c", py, path], { encoding: "utf8", maxBuffer: 256 << 20 });
}

const tag = (s: string, t: string) => new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)</${t}>`).exec(s)?.[1];
const ALTER: Record<string, string> = { "-2": "bb", "-1": "b", "0": "", "1": "#", "2": "##" };

export function readMusicXml(path: string): XmlScore {
  const t = xmlText(path);
  const names = new Map<string, string>();
  for (const m of t.matchAll(/<score-part id="([^"]+)">([\s\S]*?)<\/score-part>/g)) names.set(m[1], (tag(m[2], "part-name") ?? m[1]).trim());
  const parts: XmlPart[] = [];
  let bars: { n: number; on: number }[] = [];
  let meter = "";
  let length = 0;
  for (const pm of t.matchAll(/<part id="([^"]+)">([\s\S]*?)<\/part>/g)) {
    const notes: XmlPart["notes"] = [];
    const open = new Map<string, [number, number, string]>();
    const pbars: { n: number; on: number }[] = [];
    let divisions = 1;
    let at = 0;
    for (const mm of pm[2].matchAll(/<measure\b([^>]*)>([\s\S]*?)<\/measure>/g)) {
      const num = Number(/number="([^"]+)"/.exec(mm[1])?.[1]);
      const start = at;
      let cursor = start;
      let reach = start;
      let lastOn = start;
      if (Number.isFinite(num)) pbars.push({ n: num, on: start });
      // The measure's elements in order.
      for (const em of mm[2].matchAll(/<(attributes|note|backup|forward)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
        const [, kind, body] = em;
        if (kind === "attributes") {
          const d = tag(body, "divisions");
          if (d) divisions = Number(d);
          const beats = tag(body, "beats");
          const type = tag(body, "beat-type");
          if (!meter && beats && type) meter = `${beats}/${type}`;
          continue;
        }
        const dur = Math.round((Number(tag(body, "duration") ?? 0) / divisions) * TPQ);
        if (kind === "backup") {
          cursor -= dur;
          continue;
        }
        if (kind === "forward") {
          cursor += dur;
          reach = Math.max(reach, cursor);
          continue;
        }
        if (/<grace\b/.test(body) || /<cue\s*\/>/.test(body)) continue;
        const chord = /<chord\s*\/>/.test(body);
        const on = chord ? lastOn : cursor;
        if (!chord) cursor += dur;
        lastOn = on;
        reach = Math.max(reach, on + dur);
        if (/<rest\b/.test(body)) continue;
        const p = tag(body, "pitch");
        if (!p) continue;
        const name = `${tag(p, "step")}${ALTER[String(Number(tag(p, "alter") ?? 0))] ?? ""}${tag(p, "octave")}`;
        const voice = tag(body, "voice") ?? "1";
        const stop = /<tie type="stop"\s*\/>/.test(body);
        const begin = /<tie type="start"\s*\/>/.test(body);
        const key = `${voice}:${name}`;
        const prev = open.get(key);
        if (stop && prev && prev[0] + prev[1] === on) {
          prev[1] += dur;
          if (!begin) open.delete(key);
          continue;
        }
        const n: [number, number, string] = [on, dur, name];
        notes.push(n);
        if (begin) open.set(key, n);
        else open.delete(key);
      }
      at = Math.max(reach, start);
    }
    parts.push({ id: pm[1], name: names.get(pm[1]) ?? pm[1], notes: notes.sort((a, b) => a[0] - b[0]) });
    if (!bars.length) bars = pbars;
    length = Math.max(length, at);
  }
  return { parts, bars, meter: meter || "4/4", length };
}

/**
 * Dev-only listening harness (continuo-dev.html). Not imported by the game.
 * Open with `npm run dev`, then /continuo-dev.html.
 */
import { repository } from "../../music/fux/load-browser.ts";
import { DEFAULT_SYNTH, SYNTH_PRESETS, type SynthSettings } from "../../audio/synth-settings.ts";
import { TEMPERAMENTS, type TemperamentId } from "../../audio/temperament.ts";
import { inputFromSolution, realizeContinuo, sungNotes, type ContinuoRealization, type FinalsMode, type PresetId } from "../index.ts";
import { defaultTempo, playContinuo, renderContinuoOffline, type Playback } from "../audio.ts";
import type { CounterpointInput } from "../../counterpoint/rules/types.ts";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const solutions = repository.dataset.solutions.filter((s) => s.species === "first" || s.species === "second");

const exerciseSel = $<HTMLSelectElement>("exercise");
for (const s of solutions) {
  const ex = repository.getExercise(s.exercise_id)!;
  exerciseSel.add(new Option(`Fig. ${ex.figure} — ${s.species} species, ${s.modal_final}, cantus ${s.cantus_voice}`, s.exercise_id));
}
const timbreSel = $<HTMLSelectElement>("timbre");
timbreSel.add(new Option("game default", ""));
for (const p of SYNTH_PRESETS) timbreSel.add(new Option(p.id, p.id));
const temperamentSel = $<HTMLSelectElement>("temperament");
for (const t of TEMPERAMENTS) temperamentSel.add(new Option(t, t));
const tempo = $<HTMLInputElement>("tempo");
const tempoOut = $<HTMLSpanElement>("tempoOut");

const radio = (name: string) => (document.querySelector(`input[name=${name}]:checked`) as HTMLInputElement).value;
const checked = (id: string) => $<HTMLInputElement>(id).checked;

let input: CounterpointInput;
let realization: ContinuoRealization;
let playback: Playback | null = null;

function showTempo() {
  const half = Number(tempo.value);
  tempoOut.textContent = `${half} (whole = ${Math.round(half / 2)})`;
}

function load(resetTempo: boolean) {
  const sol = repository.getSolution(exerciseSel.value)!;
  input = inputFromSolution(sol);
  realization = realizeContinuo(input, { finals: radio("finals") as FinalsMode, passingFill: checked("passing"), preset: radio("preset") as PresetId });
  if (resetTempo) tempo.value = String(defaultTempo(input));
  showTempo();
  render();
}

/** Score-like table: one column per bar. */
function render() {
  const { notes } = sungNotes(input);
  const voiceRow = (voice: string) =>
    realization.bars.map((b) =>
      notes
        .filter((n) => n.voice === voice && n.start >= 2 * b.bar && n.start < 2 * b.bar + 2)
        .map((n) => n.pitch.name)
        .join(" ") || (notes.some((n) => n.voice === voice && n.start < 2 * b.bar && n.end > 2 * b.bar) ? "—" : "𝄼"),
    );
  const upperFirst = input.cantusVoice === "upper" ? ["cantus", "counterpoint"] : ["counterpoint", "cantus"];
  const rows: [string, string[], string?][] = [
    ["bar", realization.bars.map((b) => String(b.bar + 1))],
    [`${upperFirst[0]} (upper staff)`, voiceRow(upperFirst[0])],
    [`${upperFirst[1]} (lower staff)`, voiceRow(upperFirst[1])],
    ["right hand", realization.bars.map((b) => [...b.rh].reverse().join(" "))],
    [`continuo bass (−${realization.bassOctaves} oct)`, realization.bars.map((b) => b.bass)],
    ["figure", realization.bars.map((b) => b.figure), "fig"],
    ["upbeat", realization.bars.map((b) => b.upbeat?.kind ?? "")],
    ["cost", realization.bars.map((b) => b.cost.toFixed(1))],
  ];
  const table = $<HTMLTableElement>("score");
  table.replaceChildren(
    ...rows.map(([head, cells, cls]) => {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.textContent = head;
      tr.append(th);
      cells.forEach((c, i) => {
        const td = document.createElement("td");
        td.textContent = c;
        td.dataset.bar = String(i);
        const bar = realization.bars[i];
        if (cls) td.className = cls;
        if (cls === "fig" && bar.fallback) td.classList.add("cp");
        if (bar.notes.length) td.title = bar.notes.join("\n");
        tr.append(td);
      });
      return tr;
    }),
  );
  const s = realization.stats;
  const passes = realization.events.filter((e) => e.label === "pass").length;
  $("stats").textContent = `colla parte bars: ${s.fallbackBars} · parallel 5ths/8ves with the bass: ${s.parallels.withBass} · parallel 5ths with a sung voice: ${s.parallels.withSung} · passing notes: ${passes} · hover a column for the rules that fired`;
}

function highlight(bar: number) {
  for (const td of document.querySelectorAll<HTMLTableCellElement>("#score td")) td.classList.toggle("now", Number(td.dataset.bar) === bar);
}

const sungSynth = (): SynthSettings => SYNTH_PRESETS.find((p) => p.id === timbreSel.value)?.settings ?? DEFAULT_SYNTH;

function stop() {
  playback?.stop();
  playback = null;
}

$("play").addEventListener("click", () => {
  stop();
  playback = playContinuo(input, realization, {
    preset: radio("preset") as PresetId,
    tempoBpm: Number(tempo.value),
    includeSungVoices: checked("sung"),
    inegal: checked("inegal"),
    masterLevel: Number($<HTMLInputElement>("level").value),
    temperament: temperamentSel.value as TemperamentId,
    sungSynth: sungSynth(),
    onBar: highlight,
  });
});
$("stop").addEventListener("click", stop);
$("measure").addEventListener("click", async () => {
  const diag = $("diag");
  diag.textContent = "rendering…";
  const buf = await renderContinuoOffline(input, realization, {
    preset: radio("preset") as PresetId,
    tempoBpm: Number(tempo.value),
    includeSungVoices: checked("sung"),
    inegal: checked("inegal"),
    masterLevel: Number($<HTMLInputElement>("level").value),
    temperament: temperamentSel.value as TemperamentId,
    sungSynth: sungSynth(),
  });
  let peak = 0;
  let sum = 0;
  const d = buf.getChannelData(0);
  for (const x of d) {
    peak = Math.max(peak, Math.abs(x));
    sum += x * x;
  }
  diag.textContent = `peak ${peak.toFixed(3)} (${(20 * Math.log10(peak)).toFixed(1)} dBFS) · RMS ${(20 * Math.log10(Math.sqrt(sum / d.length))).toFixed(1)} dBFS`;
});
exerciseSel.addEventListener("change", () => {
  stop();
  load(true);
});
for (const el of document.querySelectorAll("input[name=finals], input[name=preset], #passing")) el.addEventListener("change", () => load(false));
tempo.addEventListener("input", showTempo);
$("tempoDefault").addEventListener("click", () => {
  tempo.value = String(defaultTempo(input));
  showTempo();
});
load(true);

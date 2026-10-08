#!/usr/bin/env python3
"""Validate the generated Fux two-voice dataset against itself and against the raw sources.

Hard errors (missing/malformed exercises, CF mismatches, unaccounted-for divergences from the
MusicXML, wrong counts, ...) make the script exit with status 1. Musically notable but legitimate
features of Fux's solutions (e.g. a whole note in the penultimate bar of a second-species
exercise) are reported as observations, never "fixed".

If music21 is installed, every per-exercise .krn and .mxl is also parsed with music21 as a fully
independent second parser and compared note by note with the dataset.

Writes: data/fux/two-voice/validation-report.json and data/fux/two-voice/VALIDATION.md
Run:    python3 tools/fux_import/validate.py
"""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from fractions import Fraction
from pathlib import Path

from musicxml import read_score
from pitch import ordered_interval, parse_pitch_name

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "fux" / "two-voice" / "fux-two-voice.json"
SRC = ROOT / "data" / "sources" / "fux-species"
REPORT_JSON = DATA.parent / "validation-report.json"
REPORT_MD = DATA.parent / "VALIDATION.md"

# Published counts (upstream README, "Counts by species" / "Counts by modal final", Part I row).
PUBLISHED_SPECIES = {"first": 10, "second": 12, "third": 6, "fourth": 6, "fifth": 12}
PUBLISHED_FINALS = {"D": 10, "E": 10, "F": 10, "G": 6, "A": 6, "C": 4}
NOTE_FIELDS = {"i", "pitch", "midi", "rest", "duration", "offset", "measure", "beat", "tie", "accidental_shown", "fermata", "grace"}
STEP_PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}

F = Fraction


class Report:
    def __init__(self):
        self.checks: list[dict] = []
        self.errors: list[str] = []
        self.observations: list[dict] = []

    def check(self, name: str, ok: bool, detail: str = "", hard: bool = True):
        self.checks.append({"check": name, "ok": bool(ok), "detail": detail, "severity": "error" if hard else "warning"})
        if not ok and hard:
            self.errors.append(f"{name}: {detail}")

    def observe(self, exercise: str, kind: str, detail: str):
        self.observations.append({"exercise_id": exercise, "kind": kind, "detail": detail})


def fr(s: str) -> Fraction:
    n, d = s.split("/")
    return F(int(n), int(d))


def bars(notes: list[dict]) -> dict[int, list[dict]]:
    out = defaultdict(list)
    for n in notes:
        out[n["measure"]].append(n)
    return out


def rhythm(ns: list[dict]) -> str:
    return " ".join(("r" if n["rest"] else "") + n["duration"] + ({"start": "[", "stop": "]", "continue": "_"}.get(n["tie"], "")) for n in ns)


def validate_voice_structure(r: Report, ex_id: str, label: str, notes: list[dict], measures: int):
    # contiguous, non-overlapping, measure bookkeeping, field types
    pos = F(0)
    for k, n in enumerate(notes):
        missing = NOTE_FIELDS - set(n)
        if missing:
            r.check(f"{ex_id}/{label}: note fields", False, f"note {k} lacks {sorted(missing)}")
            return
        if n["i"] != k:
            r.check(f"{ex_id}/{label}: note index", False, f"note {k} has i={n['i']}")
        off, dur = fr(n["offset"]), fr(n["duration"])
        if off != pos:
            r.check(f"{ex_id}/{label}: contiguity", False, f"note {k} at {off}, expected {pos}")
            return
        if dur <= 0:
            r.check(f"{ex_id}/{label}: duration", False, f"note {k} has non-positive duration {dur}")
        if n["measure"] != int(off) + 1 or fr(n["beat"]) != off - int(off):
            r.check(f"{ex_id}/{label}: measure/beat", False, f"note {k}: measure {n['measure']} beat {n['beat']} vs offset {off}")
        if not n["rest"]:
            p = parse_pitch_name(n["pitch"])
            if (p.step, p.alter, p.octave) != (n["step"], n["alter"], n["octave"]):
                r.check(f"{ex_id}/{label}: spelling fields", False, f"note {k}: {n['pitch']} vs {n['step']},{n['alter']},{n['octave']}")
            # MIDI recomputed with an independent formula.
            midi = (n["octave"] + 1) * 12 + STEP_PC[n["step"]] + n["alter"]
            if midi != n["midi"]:
                r.check(f"{ex_id}/{label}: midi", False, f"note {k}: {n['pitch']} midi {n['midi']} != {midi}")
        elif n["pitch"] is not None or n["midi"] is not None:
            r.check(f"{ex_id}/{label}: rest", False, f"rest {k} carries a pitch")
        if off + dur > int(off) + 1:
            r.check(f"{ex_id}/{label}: barline crossing", False, f"note {k} crosses a barline without a tie split")
        pos += dur
    r.check(f"{ex_id}/{label}: total length", pos == measures, f"{pos} whole notes for {measures} measures of 2/2")
    for m, ns in bars(notes).items():
        tot = sum(fr(n["duration"]) for n in ns)
        if tot != 1:
            r.check(f"{ex_id}/{label}: measure {m} length", False, f"sums to {tot}")


def species_observations(r: Report, ex: dict, cp: list[dict]):
    """Compare the counterpoint against the textbook rhythmic template of its species.

    The source species label is authoritative; departures are Fux's own and are only reported.
    Structural impossibilities (a rest-only voice, non-standard note values) are errors.
    """
    ex_id, sp, n_bars = ex["id"], ex["species"], ex["measures"]
    B = bars(cp)
    last = B[n_bars]
    sounding = [n for n in cp if not n["rest"]]
    r.check(f"{ex_id}: counterpoint has notes", len(sounding) > 0, f"{len(sounding)} sounding notes")
    allowed = {F(1), F(1, 2), F(1, 4), F(1, 8), F(3, 4), F(3, 8)}
    odd = sorted({n["duration"] for n in cp if fr(n["duration"]) not in allowed})
    r.check(f"{ex_id}: note values", not odd, f"unexpected durations {odd}")
    final_whole = len(last) == 1 and not last[0]["rest"] and last[0]["duration"] == "1/1"
    if not final_whole:
        r.observe(ex_id, "final_bar_not_single_whole_note", f"bar {n_bars}: {rhythm(last)}")
    template = {"first": ["1/1"], "second": ["1/2", "1/2"], "third": ["1/4"] * 4, "fourth": ["1/2", "1/2"]}.get(sp)
    devs = []
    if template:
        for m in range(1, n_bars):
            ns = B[m]
            durs = [n["duration"] for n in ns]
            if durs != template:
                devs.append(f"bar {m}: {rhythm(ns)}")
            elif m == 1 and sp != "first" and ns[0]["rest"]:
                pass  # opening rest is the normal species-2/3/4 beginning
            elif any(n["rest"] for n in ns) and m != 1:
                devs.append(f"bar {m}: rest inside the exercise ({rhythm(ns)})")
        if sp == "first":
            r.check(f"{ex_id}: first species one note per CF note",
                    len(sounding) == n_bars and all(n["duration"] == "1/1" for n in cp) and not any(n["rest"] for n in cp),
                    f"{len(sounding)} notes for {n_bars} bars; rhythm {rhythm(cp)}")
        if sp == "fourth":
            # Syncopation: in each inner bar, the downbeat note should be tied over from the previous bar.
            for m in range(2, n_bars):
                down = B[m][0]
                if down["tie"] not in ("stop", "continue"):
                    devs.append(f"bar {m}: downbeat not tied over ({rhythm(B[m])})")
    else:  # fifth species: florid; only report the rhythmic vocabulary
        vocab = Counter(n["duration"] for n in cp if not n["rest"])
        r.observe(ex_id, "fifth_species_rhythmic_vocabulary", ", ".join(f"{k}x{v}" for k, v in sorted(vocab.items(), key=lambda kv: -fr(kv[0]))))
        ties = sum(1 for n in cp if n["tie"] == "start")
        r.observe(ex_id, "fifth_species_ties", f"{ties} tied notes")
    for d in devs:
        r.observe(ex_id, f"{sp}_species_template_departure", d)
    return devs


def run_music21(r: Report, d: dict) -> dict:
    try:
        import music21  # noqa: F401
        from music21 import converter
    except Exception as e:  # pragma: no cover
        r.check("music21 cross-check available", False, f"music21 not importable ({e}); independent parse skipped", hard=False)
        return {"status": "skipped"}
    # (exercise, file kind) -> {(staff, offset)} recorded as divergent from the canonical reading
    reading_of = {"kern": "kern_vor", "musicxml": "musicxml_exercise_file"}
    divergent = defaultdict(set)
    for s in d["solutions"]:
        for div in s["source"]["divergences"]:
            for kind, name in reading_of.items():
                if div["b"] == name:
                    for x in div["differences"]:
                        divergent[(s["exercise_id"], kind)].add((div["staff"], x["offset"]))
    stats = Counter()
    for ex in d["exercises"]:
        sol = next(s for s in d["solutions"] if s["exercise_id"] == ex["id"])
        voices = {ex["cantus_voice"]: sol["cantus_firmus"]["notes"], ex["counterpoint_voice"]: sol["counterpoint"]["notes"]}
        for kind in ("kern", "musicxml"):
            path = SRC / ex["source"]["files"][kind]
            sc = converter.parse(str(path), format="humdrum" if kind == "kern" else "musicxml")
            parts = list(sc.parts)
            if kind == "kern":
                # The kern files put *part2 (lower staff) in the left spine; music21 names parts by spine.
                if "*part2\t*part1" not in path.read_text():
                    r.check(f"{ex['id']}: kern spine order", False, "expected *part2<TAB>*part1")
                    continue
                parts = sorted(parts, key=lambda p: p.id, reverse=True)  # spine_1 (upper) first
                if [p.id for p in parts] != ["spine_1", "spine_0"]:
                    r.check(f"{ex['id']}: music21 kern parts", False, str([p.id for p in parts]))
                    continue
            staff_parts = {"upper": parts[0], "lower": parts[1]}
            for staff, part in staff_parts.items():
                got = []
                for n in part.flatten().notesAndRests:
                    off = F(n.getOffsetInHierarchy(part)).limit_denominator(64) / 4
                    dur = F(n.quarterLength).limit_denominator(64) / 4
                    name = None if n.isRest else n.pitch.nameWithOctave.replace("-", "b")
                    tie = n.tie.type if n.tie is not None else None
                    got.append((off, dur, name, tie))
                want = [(fr(n["offset"]), fr(n["duration"]), n["pitch"], n["tie"]) for n in voices[staff]]
                gi = {g[0]: g for g in got}
                wi = {w[0]: w for w in want}
                for off in sorted(set(gi) | set(wi)):
                    g, w = gi.get(off), wi.get(off)
                    stats[f"{kind}_compared"] += 1
                    if g == w:
                        stats[f"{kind}_agree"] += 1
                        continue
                    if (staff, f"{off.numerator}/{off.denominator}") in divergent[(ex["id"], kind)]:
                        stats[f"{kind}_known_divergence"] += 1
                        continue
                    stats[f"{kind}_unexplained"] += 1
                    r.check(f"{ex['id']}: music21 {kind} {staff} @{off}", False, f"music21 {g} vs dataset {w}")
    for kind in ("kern", "musicxml"):
        r.check(f"music21 independent parse: {kind} agrees with dataset except recorded divergences",
                stats[f"{kind}_unexplained"] == 0 and stats[f"{kind}_compared"] > 0,
                f"{stats[f'{kind}_agree']} identical, {stats[f'{kind}_known_divergence']} recorded divergences, "
                f"{stats[f'{kind}_unexplained']} unexplained, of {stats[f'{kind}_compared']} onsets")
    return {"status": "ran", "music21_version": music21.__version__, **stats}


def main() -> int:
    r = Report()
    if not DATA.exists():
        print(f"VALIDATION FAILED: {DATA} missing (run build_dataset.py)", file=sys.stderr)
        return 1
    d = json.loads(DATA.read_text())
    exs, sols, anns, cfs = d["exercises"], d["solutions"], d["annotations"], d["cantus_firmi"]

    # 1-2. counts --------------------------------------------------------------------------------
    r.check("1. two-voice exercise count", len(exs) == 46, f"{len(exs)} exercises")
    r.check("2. exactly 46 exercises with unique ids", len({e["id"] for e in exs}) == 46 and [e["ordinal"] for e in exs] == list(range(1, 47)),
            f"{len({e['id'] for e in exs})} unique ids")
    r.check("solutions: one per exercise", sorted(s["exercise_id"] for s in sols) == sorted(e["id"] for e in exs), f"{len(sols)} solutions")
    r.check("annotations: one per exercise", sorted(a["exercise_id"] for a in anns) == sorted(e["id"] for e in exs), f"{len(anns)} annotation records")
    sc = Counter(e["species"] for e in exs)
    fc = Counter(e["modal_final"] for e in exs)
    r.check("species counts match published table (README)", dict(sc) == PUBLISHED_SPECIES, json.dumps(dict(sc)))
    r.check("modal-final counts match published table (README)", dict(fc) == PUBLISHED_FINALS, json.dumps(dict(fc)))

    cf_by_id = {c["cf_id"]: c for c in cfs}
    r.check("cf ids unique", len(cf_by_id) == len(cfs), f"{len(cfs)} records")
    sol_by_ex = {s["exercise_id"]: s for s in sols}
    ann_by_ex = {a["exercise_id"]: a for a in anns}
    all_devs = 0
    spell = Counter()

    # Per-exercise source MusicXML for spelling/octave checks (independent re-read, not the build's objects).
    pub = read_score(SRC / "I" / "I-Solutions.mxl")

    for ex in exs:
        eid = ex["id"]
        cf = ex["cantus_firmus"]["notes"]
        # 3. CF present
        r.check(f"3. {eid}: has a cantus firmus", len(cf) > 0 and not any(n["rest"] for n in cf), f"{len(cf)} notes")
        r.check(f"{eid}: CF is one whole note per bar", len(cf) == ex["measures"] and all(n["duration"] == "1/1" for n in cf),
                f"{len(cf)} notes / {ex['measures']} bars")
        blank = ex["counterpoint"]["blank_source"]
        r.check(f"{eid}: exercise counterpoint is blank", ex["counterpoint"]["notes"] == [] and
                sum(fr(b["rest_duration"]) for b in blank) == ex["measures"], f"{len(blank)} source rests")
        validate_voice_structure(r, eid, "exercise CF", cf, ex["measures"])
        # 4. solution CF == exercise CF
        sol = sol_by_ex[eid]
        same = [(n["pitch"], n["duration"], n["offset"]) for n in sol["cantus_firmus"]["notes"]] == [(n["pitch"], n["duration"], n["offset"]) for n in cf]
        r.check(f"4. {eid}: solution CF identical to exercise CF", same)
        r.check(f"{eid}: solution cf_id matches exercise", sol["cf_id"] == ex["cantus_firmus"]["cf_id"])
        r.check(f"{eid}: solution is Fux's original", sol["role"] == "original_solution" and sol["author"] == "Johann Joseph Fux")
        # the exercises-file CF must also agree (recorded as divergence if not)
        r.check(f"{eid}: published exercise CF agrees", not any(dv["b"] == "musicxml_published_exercise" for dv in sol["source"]["divergences"]))
        cp = sol["counterpoint"]["notes"]
        validate_voice_structure(r, eid, "solution CF", sol["cantus_firmus"]["notes"], ex["measures"])
        validate_voice_structure(r, eid, "solution counterpoint", cp, ex["measures"])
        # 5. species expectations
        all_devs += len(species_observations(r, ex, cp))
        # 6. distinct-CF mapping
        c = cf_by_id.get(ex["cantus_firmus"]["cf_id"])
        r.check(f"6. {eid}: cf_id resolves", c is not None, ex["cantus_firmus"]["cf_id"])
        if c:
            r.check(f"6. {eid}: CF catalogue entry identical", c["pitch_sequence"] == [n["pitch"] for n in cf]
                    and c["duration_sequence"] == [n["duration"] for n in cf] and eid in c["source_exercises"])
        # 7. modal final
        final = ex["modal_final"]
        r.check(f"7. {eid}: modal final agrees with metadata/label", final == ex["source"]["modal_final"].upper()
                and f"Modal final: {final.lower()}" in ex["source"]["label"])
        r.check(f"7. {eid}: CF ends on the modal final", cf[-1]["step"] == final and cf[-1]["alter"] == 0, cf[-1]["pitch"])
        if cf[0]["step"] != final:
            r.observe(eid, "cf_does_not_begin_on_final", cf[0]["pitch"])
        last_cp = [n for n in cp if not n["rest"]][-1]
        if last_cp["step"] != final or last_cp["alter"] != 0:
            r.observe(eid, "counterpoint_does_not_end_on_final", last_cp["pitch"])
        # 8. spelling/octave against the MusicXML
        for role, notes in (("cantus_firmus", sol["cantus_firmus"]["notes"]), ("counterpoint", cp)):
            div_offsets = {x["offset"] for dv in sol["source"]["divergences"] if dv["b"] == "musicxml_exercise_file"
                           and dv["voice"] == role for x in dv["differences"]}
            for n in notes:
                if n["rest"]:
                    continue
                spell["per_exercise_aligned" if "musicxml" in n else "per_exercise_unaligned"] += 1
                if "musicxml" in n:
                    mx = n["musicxml"]
                    if fr(n["duration"]) != F(mx["duration"], mx["divisions"] * 4):
                        r.check(f"8. {eid}: {role} note {n['i']} duration vs raw MusicXML divisions", False, f"{n['duration']} vs {mx}")
                if "musicxml" not in n:
                    r.check(f"8. {eid}: {role} note {n['i']} unaligned with MusicXML is a recorded divergence",
                            n["offset"] in div_offsets, n["pitch"])
        # independent re-read of the published combined file, segment by measure index
        seg = ex["source"]["files"]["solutions_combined"]
        for role, notes in (("cantus_firmus", sol["cantus_firmus"]["notes"]), ("counterpoint", cp)):
            staff = ex["cantus_voice"] if role == "cantus_firmus" else ex["counterpoint_voice"]
            part = pub.parts[0 if staff == "upper" else 1]
            ms = part.measures[seg["measure_index_start"]: seg["measure_index_start"] + seg["measure_count"]]
            start = ms[0].offset
            published = {(n.offset - start): n for m in ms for n in m.notes}
            known = {x["offset"] for dv in sol["source"]["divergences"] if dv["b"] == "musicxml_published" and dv["voice"] == role
                     for x in dv["differences"]}
            for n in notes:
                pn = published.get(fr(n["offset"]))
                ok = pn is not None and ((pn.pitch is None and n["rest"]) or (pn.pitch is not None and not n["rest"] and
                     (pn.pitch.step, pn.pitch.alter, pn.pitch.octave) == (n["step"], n["alter"], n["octave"])))
                spell["compared"] += 1
                spell["identical" if ok else ("recorded_divergence" if n["offset"] in known else "unexplained")] += 1
                if not ok and n["offset"] not in known:
                    r.check(f"8. {eid}: {role} @{n['offset']} spelling/octave vs I-Solutions.mxl", False,
                            f"dataset {n['pitch']} vs published {pn.pitch.name if pn is not None and pn.pitch else pn}")
                if pn is not None and pn.pitch is not None and not n["rest"]:
                    if (pn.accidental is not None) != n["accidental_shown"] and n["offset"] not in known:
                        r.observe(eid, "accidental_display_differs", f"{role} {n['pitch']} @{n['offset']}: dataset shown={n['accidental_shown']}, I-Solutions accidental={pn.accidental}")
        mirrors = [(b["measure"], b["rest_duration"]) for b in blank] == [(n["measure"], n["duration"]) for n in cp]
        r.check(f"{eid}: blank_source_mirrors_solution_rhythm flag correct", ex["counterpoint"]["blank_source_mirrors_solution_rhythm"] == mirrors)
        # 9. annotations
        ann = ann_by_ex[eid]
        r.check(f"9. {eid}: annotations present", len(ann["items"]) > 0, f"{len(ann['items'])} items")
        for it in ann["items"]:
            a, b = parse_pitch_name(it["counterpoint_note"]), parse_pitch_name(it["cantus_note"])
            computed = ordered_interval(a, b)[0]
            r.check(f"9. {eid}: annotation m{it['measure']}+{it['beat']} interval", computed == it["interval"],
                    f"source {it['interval']} computed {computed}")
            if "canonical_counterpoint_note" in it:
                r.observe(eid, "annotation_refers_to_superseded_reading",
                          f"m{it['measure']}+{it['beat']}: annotated {it['counterpoint_note']}/{it['cantus_note']}={it['interval']}, "
                          f"canonical {it['canonical_counterpoint_note']}/{it['canonical_cantus_note']}={it.get('canonical_interval_computed')}")
        struck = [n for n in cp if not n["rest"] and n["tie"] not in ("stop", "continue")]
        annotated = {it["offset"] for it in ann["items"]}
        missing = [n["offset"] for n in struck if n["offset"] not in annotated]
        r.check(f"9. {eid}: every struck counterpoint note annotated", not missing, f"unannotated onsets {missing}")
        # player representation placeholder must be empty
        r.check(f"{eid}: exercise does not leak the solution", ex["counterpoint"]["notes"] == [])

    r.check("8. spelling/octave of every note vs I-Solutions.mxl (published) re-read",
            spell["unexplained"] == 0, f"{spell['identical']} identical, {spell['recorded_divergence']} recorded divergences of {spell['compared']} notes and rests")
    r.check("8. every sounding note aligned with per-exercise MusicXML or a recorded divergence",
            True, f"{spell['per_exercise_aligned']} aligned (raw duration/divisions verified), {spell['per_exercise_unaligned']} recorded divergences")

    # 6. CF catalogue coherence + Distinct file
    used = {e["cantus_firmus"]["cf_id"] for e in exs}
    for c in cfs:
        r.check(f"6. {c['cf_id']}: length/range fields", c["length_in_notes"] == len(c["pitch_sequence"]) == len(c["duration_sequence"])
                and c["range"]["lowest_midi"] == min(c["midi_sequence"]) and c["range"]["highest_midi"] == max(c["midi_sequence"]))
        r.check(f"6. {c['cf_id']}: in_exercises flag", c["in_exercises"] == (c["cf_id"] in used))
        r.check(f"7. {c['cf_id']}: ends on its final", c["pitch_sequence"][-1][0] == c["modal_final"], c["pitch_sequence"][-1])
        for x in c["source_exercises"]:
            r.check(f"6. {c['cf_id']}: source exercise {x} uses it", next(e for e in exs if e["id"] == x)["cantus_firmus"]["cf_id"] == c["cf_id"])
    for de in d["distinct_file_entries"]:
        target = de.get("distinct_cf_id") or de["matched_cf_id"]
        c = cf_by_id.get(target)
        r.check(f"6. Distinct entry {de['index']} maps to a CF record", c is not None and c["pitch_sequence"] == de["pitch_sequence"],
                f"{de['label']} -> {target} ({de['match']})")
        r.check(f"7. Distinct entry {de['index']} final", de["pitch_sequence"][-1][0] == de["modal_final"])
    r.check("6. Distinct file has 12 entries (6 finals x 2 positions)", len(d["distinct_file_entries"]) == 12)
    r.check("6. every CF used by an exercise is catalogued", used <= set(cf_by_id))

    # 10. source discrepancies are explicit, not silent
    kinds = Counter(x["kind"] for x in d["source_discrepancies"])
    r.check("10. no annotation-interval mismatches in source", kinds.get("annotation_interval_mismatch", 0) == 0,
            f"{kinds.get('annotation_interval_mismatch', 0)} mismatches")

    m21 = run_music21(r, d)

    failed = [c for c in r.checks if not c["ok"]]
    summary = {
        "dataset": str(DATA.relative_to(ROOT)),
        "schema_version": d["schema_version"],
        "source_commit": d["provenance"]["commit"],
        "canonical_reading": d["conventions"]["canonical_reading"],
        "counts": d["counts"],
        "checks_run": len(r.checks),
        "checks_failed": len(failed),
        "errors": r.errors,
        "corpus_level_checks": [c for c in r.checks if "fux_2v_" not in c["check"] and "fux_cf_" not in c["check"]],
        "warnings": [c for c in failed if c["severity"] == "warning"],
        "music21": m21,
        "observations": r.observations,
        "species_template_departures": all_devs,
        "source_discrepancies": d["source_discrepancies"],
    }
    REPORT_JSON.write_text(json.dumps(summary, indent=1, ensure_ascii=False) + "\n")
    REPORT_MD.write_text(render_md(summary, r, d))
    status = "PASSED" if not r.errors else "FAILED"
    print(f"VALIDATION {status}: {len(r.checks)} checks, {len(r.errors)} errors, {len(r.observations)} observations")
    for e in r.errors[:50]:
        print("  ERROR", e)
    return 0 if not r.errors else 1


def render_md(s: dict, r: Report, d: dict) -> str:
    L = []
    L.append("# Fux two-voice dataset — validation report\n")
    L.append(f"Generated by `tools/fux_import/validate.py` over `{s['dataset']}` (schema {s['schema_version']}).\n")
    L.append(f"Source: {d['provenance']['repository']} @ `{s['source_commit']}`; canonical reading: `{s['canonical_reading']}`.\n")
    L.append(f"**Result: {'PASSED' if not s['errors'] else 'FAILED'}** — {s['checks_run']} checks, {len(s['errors'])} errors, "
             f"{len(s['warnings'])} warnings, {len(s['observations'])} observations.\n")
    L.append("## Counts\n")
    L.append("```json\n" + json.dumps(s["counts"], indent=1) + "\n```\n")
    L.append("## Checks by group\n")
    groups = Counter()
    fails = Counter()
    for c in r.checks:
        g = c["check"].split(" ")[0] if c["check"][0].isdigit() else "structure"
        groups[g] += 1
        fails[g] += 0 if c["ok"] else 1
    names = {"1.": "exercise count", "2.": "46 exercises", "3.": "CF present", "4.": "solution CF = exercise CF",
             "6.": "distinct-CF mapping", "7.": "modal finals", "8.": "spelling/octave vs MusicXML", "9.": "annotations vs computed intervals",
             "10.": "discrepancies explicit", "structure": "structural/rhythmic integrity, music21 cross-parse"}
    L.append("| group | checks | failed |\n|---|---|---|")
    for g in sorted(groups, key=lambda x: (not x[0].isdigit(), float(x.rstrip('.')) if x[0].isdigit() else 0)):
        L.append(f"| {g} {names.get(g, '')} | {groups[g]} | {fails[g]} |")
    L.append("")
    L.append("## Corpus-level checks\n")
    L += [f"- {'PASS' if c['ok'] else 'FAIL'} — {c['check']}" + (f": {c['detail']}" if c["detail"] else "") for c in s["corpus_level_checks"]]
    L.append("")
    if s["music21"].get("status") == "ran":
        m = s["music21"]
        L.append(f"## Independent parse (music21 {m['music21_version']})\n")
        for kind, label in (("kern", "per-exercise kern"), ("musicxml", "per-exercise MusicXML")):
            L.append(f"- {label}: {m.get(kind + '_agree', 0)} identical, {m.get(kind + '_known_divergence', 0)} recorded divergences, "
                     f"{m.get(kind + '_unexplained', 0)} unexplained (of {m.get(kind + '_compared', 0)} onsets)")
        L.append("")
    if s["errors"]:
        L.append("## Errors\n")
        L += [f"- {e}" for e in s["errors"]]
        L.append("")
    L.append("## Source discrepancies (preserved, not resolved)\n")
    for x in s["source_discrepancies"]:
        head = f"- **{x['kind']}** {x.get('exercise_id', '')} {x.get('file', '')}"
        if "differences" in x:
            L.append(head + f" — {x['voice']} ({x['staff']} staff): `{x['a']}` vs `{x['b']}`")
            L += [f"  - m{y['measure']}: {y['a']} ⟷ {y['b']}" for y in x["differences"]]
        else:
            L.append(head + f" — {x['detail']}")
    L.append("")
    L.append("## Observations on Fux's solutions (reported, never altered)\n")
    by_kind = defaultdict(list)
    for o in s["observations"]:
        by_kind[o["kind"]].append(o)
    for k, os_ in sorted(by_kind.items()):
        L.append(f"### {k} ({len(os_)})\n")
        L += [f"- {o['exercise_id']}: {o['detail']}" for o in os_]
        L.append("")
    return "\n".join(L) + "\n"


if __name__ == "__main__":
    sys.exit(main())

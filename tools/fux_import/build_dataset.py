#!/usr/bin/env python3
"""Build the game-ready Fux two-voice dataset from the vendored Four Score and More sources.

Input : data/sources/fux-species/  (see fetch_source.sh; pinned upstream commit in SOURCE.json)
Output: data/fux/two-voice/fux-two-voice.json

Every musical fact in the output is read from the source files. The only computed values are
derived conveniences (MIDI numbers, ranges, fractions, intervals used *for verification*, the
CF identity catalogue) and they are labelled as such. Cross-source disagreements are recorded,
never silently resolved. Any missing or malformed exercise aborts the build.

Run:  python3 tools/fux_import/build_dataset.py
"""
from __future__ import annotations

import csv
import dataclasses
import os
import json
import re
import sys
from collections import OrderedDict, defaultdict
from fractions import Fraction
from pathlib import Path

from kern import KNote, read_kern
from musicxml import XNote, XScore, read_score
from pitch import Pitch, frac, ordered_interval

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data" / "sources" / "fux-species"
OUT = ROOT / "data" / "fux" / "two-voice" / "fux-two-voice.json"

EXPECTED_EXERCISES = 46
SCHEMA_VERSION = "1.0.0"

# Which reading supplies the normalized note data when the upstream files disagree.
#   "kern_vor"          : the per-exercise **kern files, which upstream declares the version of record
#   "musicxml_published": the public-facing Part I MusicXML downloads (I-Solutions.mxl)
# Both readings are always kept; see source.divergences on each solution.
CANONICAL_READING = os.environ.get("FUX_CANONICAL_READING", "kern_vor")

SPECIES_ENUM = {1: "first", 2: "second", 3: "third", 4: "fourth", 5: "fifth"}
ROLE_BY_RAW = {"Upper": "upper", "Lower": "lower"}
PART_INDEX = {"upper": 0, "lower": 1}  # staff order in every Part I file (top staff first)
ORIGINAL_CLEFS = {
    "C1": {"sign": "C", "line": 1, "name": "soprano"},
    "C2": {"sign": "C", "line": 2, "name": "mezzo_soprano"},
    "C3": {"sign": "C", "line": 3, "name": "alto"},
    "C4": {"sign": "C", "line": 4, "name": "tenor"},
    "C5": {"sign": "C", "line": 5, "name": "baritone_c"},
    "F3": {"sign": "F", "line": 3, "name": "baritone_f"},
    "F4": {"sign": "F", "line": 4, "name": "bass"},
    "G2": {"sign": "G", "line": 2, "name": "treble"},
}
KERN_CLEFS = {"G2": "treble", "Gv2": "treble_8vb", "F4": "bass", "C3": "alto", "C4": "tenor", "C1": "soprano"}
LABEL_RE = re.compile(
    r"^Fig\. (?P<num>\d+)(?P<suffix>[a-z]?)(?: \((?P<note>[^)]*)\))?; Species: (?P<species>[\d,\s]+); "
    r"Modal final: (?P<final>[a-g]); Cantus firmus: (?P<cf>Upper|Lower)$"
)
DISTINCT_RE = re.compile(r"^Modal final: (?P<final>[a-g]); Cantus firmus: (?P<cf>Upper|Lower)$")


class BuildError(Exception):
    pass


def rel(p: Path) -> str:
    return p.relative_to(ROOT).as_posix()


def upstream_path(p: Path) -> str:
    return p.relative_to(SRC).as_posix()


# ---------------------------------------------------------------------------------------------
# Note normalization


def note_json(n: KNote | XNote, measure: int, beat: Fraction, index: int, xml: XNote | None, xml_file: str | None) -> dict:
    """Normalized note record. `xml` is the matching per-exercise MusicXML note, if aligned."""
    p = n.pitch
    out = OrderedDict()
    out["i"] = index
    out["pitch"] = p.name if p else None
    out["midi"] = p.midi if p else None
    out["rest"] = p is None
    out["duration"] = frac(n.duration)
    out["offset"] = frac(n.offset)
    out["measure"] = measure
    out["beat"] = frac(beat)
    if p:
        out["step"], out["alter"], out["octave"] = p.step, p.alter, p.octave
    tie = n.tie if isinstance(n, KNote) else n.tie_state()
    out["tie"] = tie
    if isinstance(n, KNote):
        out["accidental_shown"] = n.accidental_display == "X" or n.explicit_natural
    else:
        out["accidental_shown"] = n.accidental is not None
    out["fermata"] = n.fermata
    out["grace"] = n.grace
    if isinstance(n, KNote):
        out["kern"] = n.token
    if xml is not None:
        out["musicxml"] = OrderedDict(
            file=xml_file,
            measure=xml.measure,
            divisions=xml.divisions,
            duration=xml.raw_duration,
            type=xml.note_type,
            dots=xml.dots,
            accidental=xml.accidental,
            tie=xml.tie or None,
            tied=xml.tied or None,
        )
    return out


def reading(notes: list[KNote | XNote], start: Fraction = Fraction(0)) -> list[tuple]:
    """Comparable reading of a voice: (offset, duration, pitch-name|None, tie)."""
    out = []
    for n in notes:
        tie = n.tie if isinstance(n, KNote) else n.tie_state()
        out.append((n.offset - start, n.duration, n.pitch.name if n.pitch else None, tie))
    return out


def fmt_reading(r: tuple) -> str:
    off, dur, pitch, tie = r
    return f"@{frac(off)} {pitch or 'rest'} dur={frac(dur)}" + (f" tie={tie}" if tie else "")


def diff_readings(a: list[tuple], b: list[tuple], measure_of) -> list[dict]:
    """Onset-aligned diff of two readings of one voice."""
    ia = {r[0]: r for r in a}
    ib = {r[0]: r for r in b}
    out = []
    for off in sorted(set(ia) | set(ib)):
        ra, rb = ia.get(off), ib.get(off)
        if ra != rb:
            out.append({
                "offset": frac(off),
                "measure": measure_of(off),
                "a": fmt_reading(ra) if ra else None,
                "b": fmt_reading(rb) if rb else None,
            })
    return out


# ---------------------------------------------------------------------------------------------
# Combined-file segmentation


def segment(score: XScore, pattern: re.Pattern) -> list[dict]:
    """Split a combined Part I file into exercises using the direction words that head each one."""
    top, bottom = score.parts
    if len(top.measures) != len(bottom.measures):
        raise BuildError(f"{score.path}: staves have different measure counts")
    # Clef in force at each measure (MuseScore omits a clef that does not change).
    current = [None, None]
    in_force = []
    for i in range(len(top.measures)):
        for k, part in enumerate((top, bottom)):
            if part.measures[i].clef is not None:
                current[k] = part.measures[i].clef
        in_force.append(tuple(current))
    starts = []
    for i, m in enumerate(top.measures):
        labels = [w for w in m.words if pattern.match(w)]
        if len(labels) > 1:
            raise BuildError(f"{score.path}: two labels in one measure: {labels}")
        if labels:
            starts.append((i, labels[0]))
        unknown = [w for w in m.words if not pattern.match(w)]
        if unknown:
            raise BuildError(f"{score.path}: unrecognised direction words {unknown}")
    if not starts or starts[0][0] != 0:
        raise BuildError(f"{score.path}: file does not start with a label")
    segs = []
    for k, (i, label) in enumerate(starts):
        j = starts[k + 1][0] if k + 1 < len(starts) else len(top.measures)
        start_off = top.measures[i].offset
        segs.append({
            "label": label,
            "first_measure_index": i,  # 0-based measure index in the combined file
            "measure_count": j - i,
            "start": start_off,
            "voices": [
                [n for m in part.measures[i:j] for n in m.notes] for part in (top, bottom)
            ],
            "clefs": list(in_force[i]),
        })
    return segs


# ---------------------------------------------------------------------------------------------
# Build


def load_sources() -> dict:
    meta_files = sorted((SRC / "I").glob("sp*/gap_*.json"))
    if len(meta_files) != EXPECTED_EXERCISES:
        raise BuildError(f"expected {EXPECTED_EXERCISES} Part I metadata files, found {len(meta_files)}")
    sources = {
        "SOURCE": json.loads((SRC / "SOURCE.json").read_text()),
        "corpus": json.loads((SRC / "corpus.json").read_text()),
        "meta_files": meta_files,
        "exercises": read_score(SRC / "I" / "I-Exercises.mxl"),
        "solutions": read_score(SRC / "I" / "I-Solutions.mxl"),
        "annotations": read_score(SRC / "I" / "I-Annotations.mxl"),
        "distinct": read_score(SRC / "I" / "I-Distinct.mxl"),
    }
    with open(SRC / "I" / "data.tsv", newline="") as fh:
        sources["tsv"] = list(csv.DictReader(fh, delimiter="\t"))
    return sources


def figure_key(fig: dict) -> str:
    return f"{fig['number']}{fig['suffix'] or ''}"


def build() -> dict:
    S = load_sources()
    commit = S["SOURCE"]["commit"]
    repo_url = S["SOURCE"]["repository"]
    blob = f"{repo_url}/blob/{commit}/"

    seg_ex = segment(S["exercises"], LABEL_RE)
    seg_sol = segment(S["solutions"], LABEL_RE)
    seg_ann = segment(S["annotations"], LABEL_RE)
    seg_dis = segment(S["distinct"], DISTINCT_RE)
    for name, segs in (("I-Exercises", seg_ex), ("I-Solutions", seg_sol), ("I-Annotations", seg_ann)):
        if len(segs) != EXPECTED_EXERCISES:
            raise BuildError(f"{name}.mxl: expected {EXPECTED_EXERCISES} labelled exercises, found {len(segs)}")

    metas = [json.loads(p.read_text()) for p in S["meta_files"]]
    # Source order = order of the combined public files (also figure order).
    order = [LABEL_RE.match(s["label"]) for s in seg_sol]
    by_fig = {}
    for path, meta in zip(S["meta_files"], metas):
        by_fig[figure_key(meta["figure"])] = (path, meta)
    if len(by_fig) != EXPECTED_EXERCISES:
        raise BuildError("figure keys in metadata are not unique")

    source_discrepancies: list[dict] = []
    exercises, solutions, annotations = [], [], []
    cf_signatures: "OrderedDict[tuple, dict]" = OrderedDict()

    tsv_rows = S["tsv"]
    if len(tsv_rows) != EXPECTED_EXERCISES:
        raise BuildError(f"data.tsv: expected {EXPECTED_EXERCISES} rows, found {len(tsv_rows)}")

    for ordinal, (label_m, s_ex, s_sol, s_ann, tsv) in enumerate(zip(order, seg_ex, seg_sol, seg_ann, tsv_rows), 1):
        fkey = label_m["num"] + label_m["suffix"]
        if fkey not in by_fig:
            raise BuildError(f"I-Solutions label {s_sol['label']!r} has no per-exercise metadata file")
        meta_path, meta = by_fig.pop(fkey)
        uid = meta["id"]
        folder = meta_path.parent
        kern_path, mxl_path = folder / f"{uid}.krn", folder / f"{uid}.mxl"
        for p in (kern_path, mxl_path):
            if not p.exists():
                raise BuildError(f"{uid}: missing {p.name}")
        ex_id = f"fux_2v_fig_{fkey.zfill(3 + len(label_m['suffix']))}"

        # ---- metadata consistency ------------------------------------------------------------
        missing_keys = {"number", "suffix", "note", "corrected", "corrects"} - set(meta["figure"])
        if missing_keys:
            source_discrepancies.append({"exercise_id": ex_id, "kind": "metadata_schema_irregularity", "file": upstream_path(meta_path),
                                         "detail": f"figure object lacks keys {sorted(missing_keys)} (treated as null)"})
        species_list = meta["species"]
        if len(species_list) != 1 or species_list[0] not in SPECIES_ENUM:
            raise BuildError(f"{uid}: unexpected species {species_list}")
        species_n = species_list[0]
        final = meta["modal_final"]
        cf_raw = meta["cantus_firmus"]["raw"]
        cf_role = ROLE_BY_RAW[cf_raw]
        cp_role = "upper" if cf_role == "lower" else "lower"
        if meta["voices"] != 2:
            raise BuildError(f"{uid}: voices={meta['voices']}")
        if meta["cantus_firmus"]["part"] != PART_INDEX[cf_role] + 1:
            raise BuildError(f"{uid}: cantus_firmus.part {meta['cantus_firmus']['part']} disagrees with raw {cf_raw}")

        label_fields = {}
        for name, seg in (("I-Exercises.mxl", s_ex), ("I-Solutions.mxl", s_sol), ("I-Annotations.mxl", s_ann)):
            m = LABEL_RE.match(seg["label"])
            label_fields[name] = m.groupdict()
            got = (m["num"] + m["suffix"], int(m["species"]), m["final"], m["cf"], m["note"])
            want = (fkey, species_n, final, cf_raw, meta["figure"].get("note"))
            if got != want:
                source_discrepancies.append({
                    "exercise_id": ex_id, "kind": "label_vs_metadata", "file": f"I/{name}",
                    "detail": f"label {seg['label']!r} vs metadata {want}",
                })
            if seg["measure_count"] != meta["measures"]:
                raise BuildError(f"{uid}: {name} has {seg['measure_count']} measures, metadata says {meta['measures']}")

        kern = read_kern(kern_path)
        opr = kern.references.get("OPR", "")
        opr_expect = (f"Gradus ad Parnassum Exercise; Fig. {fkey}" + (f" ({meta['figure']['note']})" if meta["figure"].get("note") else "")
                      + f"; Species: {species_n}; Modal final: {final}; Cantus firmus: {cf_raw}")
        if opr != opr_expect:
            source_discrepancies.append({"exercise_id": ex_id, "kind": "kern_reference_vs_metadata", "file": upstream_path(kern_path),
                                         "detail": f"!!!OPR {opr!r} vs expected {opr_expect!r}"})

        # data.tsv (an older index file) -- compared, never used as an authority.
        tsv_fig = tsv["Figure"].split(" ")[0]
        tsv_cmp = (tsv_fig, tsv["Species"], tsv["Modal final"], tsv["Cantus firmus"], int(tsv["Measure Count"]),
                   int(tsv["Measure start"]) - 1)
        want_cmp = (fkey, str(species_n), final, cf_raw, meta["measures"], s_sol["first_measure_index"])
        if tsv_cmp != want_cmp:
            source_discrepancies.append({"exercise_id": ex_id, "kind": "data_tsv_vs_metadata", "file": "I/data.tsv",
                                         "detail": f"data.tsv row {dict(tsv)} vs metadata (figure, species, final, cf, measures, start-1)={want_cmp}"})

        # ---- voices from each reading -----------------------------------------------------------
        kparts = {}
        for kp in kern.parts:
            if kp.part not in ("1", "2"):
                raise BuildError(f"{uid}: kern spine without *part1/*part2")
            kparts["upper" if kp.part == "1" else "lower"] = kp
        xscore = read_score(mxl_path)
        if len(xscore.parts) != 2:
            raise BuildError(f"{uid}: per-exercise MusicXML has {len(xscore.parts)} parts")
        xvoices = {role: [n for m in xscore.parts[PART_INDEX[role]].measures for n in m.notes] for role in PART_INDEX}

        def measure_of(off: Fraction) -> int:
            return int(off) + 1  # every measure is a 2/2 whole-note bar (validated below)

        readings = {
            "kern_vor": {r: reading(kparts[r].notes) for r in PART_INDEX},
            "musicxml_exercise_file": {r: reading(xvoices[r]) for r in PART_INDEX},
            "musicxml_published": {r: reading(s_sol["voices"][PART_INDEX[r]], s_sol["start"]) for r in PART_INDEX},
            "musicxml_annotations": {r: reading(s_ann["voices"][PART_INDEX[r]], s_ann["start"]) for r in PART_INDEX},
        }
        ex_cf_reading = reading(s_ex["voices"][PART_INDEX[cf_role]], s_ex["start"])
        ex_cp_reading = reading(s_ex["voices"][PART_INDEX[cp_role]], s_ex["start"])

        divergences = []
        base = readings[CANONICAL_READING]
        for name, rd in readings.items():
            if name == CANONICAL_READING:
                continue
            for role in PART_INDEX:
                d = diff_readings(base[role], rd[role], measure_of)
                if d:
                    divergences.append({
                        "voice": "cantus_firmus" if role == cf_role else "counterpoint",
                        "staff": role,
                        "a": CANONICAL_READING, "b": name, "differences": d,
                    })
        d = diff_readings(base[cf_role], ex_cf_reading, measure_of)
        if d:
            divergences.append({"voice": "cantus_firmus", "staff": cf_role, "a": CANONICAL_READING,
                                "b": "musicxml_published_exercise", "differences": d})
        for div in divergences:
            source_discrepancies.append({"exercise_id": ex_id, "kind": "note_reading_divergence", **{k: div[k] for k in ("voice", "staff", "a", "b")},
                                         "differences": div["differences"]})

        # ---- canonical notes ------------------------------------------------------------------
        if CANONICAL_READING not in ("kern_vor", "musicxml_published"):
            raise BuildError(f"unknown CANONICAL_READING {CANONICAL_READING!r}")
        if CANONICAL_READING == "kern_vor":
            canon = {r: kparts[r].notes for r in PART_INDEX}
        else:
            # Rebased copies (offsets from the start of the exercise); the parsed objects stay untouched.
            canon = {r: [dataclasses.replace(n, offset=n.offset - s_sol["start"]) for n in s_sol["voices"][PART_INDEX[r]]]
                     for r in PART_INDEX}
        xml_by_onset = {r: {(n.offset, n.pitch.name if n.pitch else None, n.duration): n for n in xvoices[r]} for r in PART_INDEX}

        def voice_json(role: str) -> list[dict]:
            out = []
            for i, n in enumerate(canon[role]):
                m = measure_of(n.offset)
                xml = xml_by_onset[role].get((n.offset, n.pitch.name if n.pitch else None, n.duration))
                out.append(note_json(n, m, n.offset - (m - 1), i, xml, upstream_path(mxl_path) if xml else None))
            return out

        cf_notes = voice_json(cf_role)
        cp_notes = voice_json(cp_role)
        for corr in (meta.get("editorial") or {}).get("corrections", []):
            loc = corr["location"]
            role = "upper" if loc["part"] == 1 else "lower"
            onset = Fraction(loc["measure"] - 1) + Fraction(loc["offset_quarters"]) / 4
            target = [n for n in (cp_notes if role == cp_role else cf_notes) if Fraction(n["offset"]) == onset]
            if len(target) != 1 or target[0]["pitch"] != corr["encoded"]:
                raise BuildError(f"{uid}: editorial correction {corr} does not match the encoded note")
            target[0]["editorial"] = {"kind": corr["kind"], "printed_1725": corr["printed"], "encoded": corr["encoded"],
                                      "reason": corr["reason"], "by": "upstream editor (Four Score and More)"}
            source_discrepancies.append({"exercise_id": ex_id, "kind": "upstream_editorial_emendation", "file": upstream_path(meta_path),
                                         "detail": f"{loc['description']}: 1725 print {corr['printed']}, encoded {corr['encoded']}. {corr['reason']}"})
        for rn in meta["source"].get("review_notes", []):
            source_discrepancies.append({"exercise_id": ex_id, "kind": "upstream_open_review_note", "file": upstream_path(meta_path),
                                         "detail": f"system {rn.get('system_in_example')}: {rn.get('issue')} [{rn.get('status')}] {rn.get('description')}"})

        # ---- clefs ------------------------------------------------------------------------------
        orig = meta["clefs"]
        if len(orig) != 2 or any(c not in ORIGINAL_CLEFS for c in orig):
            raise BuildError(f"{uid}: unexpected original clefs {orig}")
        modern_x = {r: xscore.parts[PART_INDEX[r]].measures[0].clef for r in PART_INDEX}
        modern_pub = {r: s_sol["clefs"][PART_INDEX[r]] for r in PART_INDEX}
        for r in PART_INDEX:
            kc = KERN_CLEFS.get(kparts[r].clef)
            if kc != modern_x[r].name or kc != modern_pub[r].name:
                source_discrepancies.append({"exercise_id": ex_id, "kind": "modern_clef_divergence", "staff": r,
                                             "detail": f"kern *clef{kparts[r].clef} / per-exercise mxl {modern_x[r].name} / I-Solutions {modern_pub[r].name}"})
        sys_clefs = {tuple(s["clefs"]) for s in meta["source"].get("systems", [])}
        if sys_clefs and sys_clefs != {tuple(orig)}:
            source_discrepancies.append({"exercise_id": ex_id, "kind": "original_clef_varies_by_system",
                                         "detail": f"metadata clefs {orig}, per-system {sorted(sys_clefs)}"})

        def clef_block(role: str) -> dict:
            o = orig[PART_INDEX[role]]
            return {"original": {"code": o, **ORIGINAL_CLEFS[o]}, "modern": modern_x[role].to_json()}

        # ---- CF identity ----------------------------------------------------------------------
        if any(n["rest"] for n in cf_notes):
            raise BuildError(f"{uid}: cantus firmus contains rests")
        signature = (final, tuple(n["pitch"] for n in cf_notes), tuple(n["duration"] for n in cf_notes))
        entry = cf_signatures.setdefault(signature, {"exercises": [], "figures": [], "roles": [], "clefs": set(), "notes": cf_notes})
        entry["exercises"].append(ex_id)
        entry["figures"].append(fkey)
        entry["roles"].append(cf_role)
        entry["clefs"].add(orig[PART_INDEX[cf_role]])

        # ---- blank exercise representation ----------------------------------------------------
        blank_notes = s_ex["voices"][PART_INDEX[cp_role]]
        if any(n.pitch is not None for n in blank_notes):
            raise BuildError(f"{uid}: I-Exercises.mxl counterpoint staff is not blank")
        blank = [{"measure": measure_of(n.offset - s_ex["start"]), "rest_duration": frac(n.duration),
                  "musicxml": {"duration": n.raw_duration, "divisions": n.divisions, "type": n.note_type}} for n in blank_notes]

        source_files = OrderedDict(
            metadata=upstream_path(meta_path),
            kern=upstream_path(kern_path),
            musicxml=upstream_path(mxl_path),
            musicxml_member=xscore.member,
            exercises_combined={"file": "I/I-Exercises.mxl", "measure_index_start": s_ex["first_measure_index"], "measure_count": s_ex["measure_count"]},
            solutions_combined={"file": "I/I-Solutions.mxl", "measure_index_start": s_sol["first_measure_index"], "measure_count": s_sol["measure_count"]},
            annotations_combined={"file": "I/I-Annotations.mxl", "measure_index_start": s_ann["first_measure_index"], "measure_count": s_ann["measure_count"]},
        )
        source_block = OrderedDict(
            upstream_id=uid,
            part="I",
            figure=fkey,
            figure_number=meta["figure"]["number"],
            figure_suffix=meta["figure"]["suffix"] or None,
            figure_note=meta["figure"].get("note"),
            figure_corrected=meta["figure"]["corrected"],
            figure_corrects=meta["figure"]["corrects"],
            figure_numbering="Mann (Norton) 1965 edition numbering, as used by the source",
            label=s_sol["label"],
            species=species_list,
            modal_final=final,
            cantus_firmus=meta["cantus_firmus"],
            voices=meta["voices"],
            meter=meta["meter"],
            measures=meta["measures"],
            clefs_original=orig,
            page_1725=meta.get("page"),
            pdf=meta["source"],
            editorial=meta.get("editorial"),
            kern_references=kern.references,
            repository=repo_url,
            commit=commit,
            files=source_files,
            urls={k: blob + v for k, v in (("metadata", source_files["metadata"]), ("kern", source_files["kern"]), ("musicxml", source_files["musicxml"]))},
            vendored_root=rel(SRC),
        )

        sol_id = f"{ex_id}_solution"
        ann_id = f"{ex_id}_annotations"
        exercises.append(OrderedDict(
            id=ex_id,
            ordinal=ordinal,
            figure=fkey,
            species=SPECIES_ENUM[species_n],
            species_number=species_n,
            modal_final=final.upper(),
            cantus_voice=cf_role,
            counterpoint_voice=cp_role,
            meter="2/2",
            measures=meta["measures"],
            difficulty={"value": species_n, "basis": "derived: species number (not source data)"},
            cantus_firmus=OrderedDict(cf_id=None, staff=cf_role, staff_index=PART_INDEX[cf_role], clef=clef_block(cf_role), notes=cf_notes),
            counterpoint=OrderedDict(role="player", staff=cp_role, staff_index=PART_INDEX[cp_role], clef=clef_block(cp_role), notes=[],
                                     blank_source=blank,
                                     # I-Exercises.mxl writes the empty staff as rests in the rhythm of Fux's solution;
                                     # a game that shows those rests reveals the solution's rhythm.
                                     blank_source_mirrors_solution_rhythm=[(b["measure"], b["rest_duration"]) for b in blank]
                                     == [(n["measure"], n["duration"]) for n in cp_notes]),
            solution_id=sol_id,
            annotation_id=ann_id,
            source=source_block,
        ))
        solutions.append(OrderedDict(
            id=sol_id,
            exercise_id=ex_id,
            role="original_solution",
            author="Johann Joseph Fux",
            species=SPECIES_ENUM[species_n],
            species_number=species_n,
            modal_final=final.upper(),
            cantus_voice=cf_role,
            counterpoint_voice=cp_role,
            clefs={"cantus": clef_block(cf_role), "counterpoint": clef_block(cp_role)},
            cantus_firmus={"staff": cf_role, "pitch_sequence": [n["pitch"] for n in cf_notes], "notes": cf_notes},
            counterpoint={"staff": cp_role,
                          "pitch_sequence": [n["pitch"] for n in cp_notes if not n["rest"]],
                          "duration_sequence": [n["duration"] for n in cp_notes],
                          "notes": cp_notes},
            source=OrderedDict(
                canonical_reading=CANONICAL_READING,
                files=source_files,
                urls=source_block["urls"],
                commit=commit,
                editorial=meta.get("editorial"),
                divergences=divergences,
                alternative_readings=(
                    {name: {("cantus_firmus" if r == cf_role else "counterpoint"): [fmt_reading(x) for x in rd[r]] for r in PART_INDEX}
                     for name, rd in readings.items() if name != CANONICAL_READING and any(rd[r] != base[r] for r in PART_INDEX)}
                ),
            ),
        ))

        # ---- annotations ----------------------------------------------------------------------
        annotations.append(build_annotations(ex_id, ann_id, s_ann, cf_role, cp_role, canon, measure_of, source_discrepancies))

    if by_fig:
        raise BuildError(f"metadata files not present in I-Solutions.mxl: {sorted(by_fig)}")

    # ---- cantus firmus catalogue ------------------------------------------------------------
    cantus_firmi = []
    per_final = defaultdict(int)
    families: "OrderedDict[tuple, str]" = OrderedDict()
    fam_count = defaultdict(int)
    cf_id_of_ex = {}
    for (final, pitches, durs), e in cf_signatures.items():
        per_final[final] += 1
        cf_id = f"fux_cf_{final}_{per_final[final]:02d}"
        notes = [{k: n[k] for k in ("i", "pitch", "midi", "duration", "step", "alter", "octave")} for n in e["notes"]]
        midis = [n["midi"] for n in notes]
        lo = notes[midis.index(min(midis))]["pitch"]
        hi = notes[midis.index(max(midis))]["pitch"]
        # Octave-equivalence family: same pitch classes/spelling and contour, any register.
        first_oct = notes[0]["octave"]
        fam_key = (final, tuple((n["step"], n["alter"], n["octave"] - first_oct) for n in notes), durs)
        if fam_key not in families:
            fam_count[final] += 1
            families[fam_key] = f"fux_cf_family_{final}_{fam_count[final]:02d}"
        for x in e["exercises"]:
            cf_id_of_ex[x] = cf_id
        cantus_firmi.append(OrderedDict(
            cf_id=cf_id,
            family_id=families[fam_key],
            modal_final=final.upper(),
            pitch_sequence=list(pitches),
            midi_sequence=midis,
            duration_sequence=list(durs),
            length_in_notes=len(notes),
            range={"lowest": lo, "highest": hi, "lowest_midi": min(midis), "highest_midi": max(midis),
                   "semitones": max(midis) - min(midis)},
            original_register={"first": notes[0]["pitch"], "final": notes[-1]["pitch"],
                               "final_octave": notes[-1]["octave"],
                               "original_clefs": sorted(e["clefs"])},
            notes=notes,
            source_exercises=e["exercises"],
            source_figures=e["figures"],
            cantus_voices=sorted(set(e["roles"])),
            distinct_file_entries=[],
        ))

    for e in exercises:
        e["cantus_firmus"]["cf_id"] = cf_id_of_ex[e["id"]]
    for rec in solutions + annotations:
        rec["cf_id"] = cf_id_of_ex[rec["exercise_id"]]
    # Reorder so cf_id appears near the top of solutions/annotations records.
    solutions = [OrderedDict([(k, s[k]) for k in ("id", "exercise_id", "role", "author", "cf_id")] + [(k, v) for k, v in s.items() if k not in ("id", "exercise_id", "role", "author", "cf_id")]) for s in solutions]
    annotations = [OrderedDict([(k, a[k]) for k in ("id", "exercise_id", "cf_id")] + [(k, v) for k, v in a.items() if k not in ("id", "exercise_id", "cf_id")]) for a in annotations]

    # ---- Distinct file ----------------------------------------------------------------------
    by_sig = {(c["modal_final"].lower(), tuple(c["pitch_sequence"]), tuple(c["duration_sequence"])): c for c in cantus_firmi}
    distinct_entries = []
    distinct_only: "OrderedDict[tuple, dict]" = OrderedDict()
    for k, seg in enumerate(seg_dis):
        m = DISTINCT_RE.match(seg["label"])
        cf_role = ROLE_BY_RAW[m["cf"]]
        cp_role = "upper" if cf_role == "lower" else "lower"
        cf_v = seg["voices"][PART_INDEX[cf_role]]
        other = seg["voices"][PART_INDEX[cp_role]]
        if any(n.pitch is None for n in cf_v) or any(n.pitch is not None for n in other):
            raise BuildError(f"I-Distinct.mxl entry {k}: unexpected content")
        sig = (m["final"], tuple(n.pitch.name for n in cf_v), tuple(frac(n.duration) for n in cf_v))
        match = by_sig.get(sig)
        rec = OrderedDict(
            index=k,
            label=seg["label"],
            modal_final=m["final"].upper(),
            cantus_voice=cf_role,
            pitch_sequence=list(sig[1]),
            duration_sequence=list(sig[2]),
            clefs_modern={r: seg["clefs"][PART_INDEX[r]].to_json() if seg["clefs"][PART_INDEX[r]] else None for r in PART_INDEX},
            file="I/I-Distinct.mxl",
            measure_index_start=seg["first_measure_index"],
            measure_count=seg["measure_count"],
            matched_cf_id=match["cf_id"] if match else None,
            match="exact" if match else "none",
        )
        if match is None:
            # Try octave-equivalent match for the report.
            first = cf_v[0].pitch.octave
            fsig = tuple((n.pitch.step, n.pitch.alter, n.pitch.octave - first) for n in cf_v)
            for c in cantus_firmi:
                cfirst = c["notes"][0]["octave"]
                if c["modal_final"].lower() == m["final"] and tuple((n["step"], n["alter"], n["octave"] - cfirst) for n in c["notes"]) == fsig:
                    rec["matched_cf_id"], rec["match"] = c["cf_id"], f"octave_transposition ({first - cfirst:+d})"
                    break
            source_discrepancies.append({"kind": "distinct_entry_not_in_exercises", "file": "I/I-Distinct.mxl",
                                         "detail": f"entry {k} ({seg['label']}): {' '.join(sig[1])} -> {rec['match']} {rec['matched_cf_id']}"})
            # Keep the Distinct register as its own CF record (it is source material), linked to its family.
            if sig not in distinct_only:
                fam = next(c["family_id"] for c in cantus_firmi if c["cf_id"] == rec["matched_cf_id"]) if rec["matched_cf_id"] else None
                per_final[m["final"]] += 1
                cid = f"fux_cf_{m['final']}_{per_final[m['final']]:02d}"
                notes = [{"i": i, "pitch": n.pitch.name, "midi": n.pitch.midi, "duration": frac(n.duration), "step": n.pitch.step,
                          "alter": n.pitch.alter, "octave": n.pitch.octave} for i, n in enumerate(cf_v)]
                midis = [n["midi"] for n in notes]
                distinct_only[sig] = OrderedDict(
                    cf_id=cid, family_id=fam, modal_final=m["final"].upper(),
                    pitch_sequence=list(sig[1]), midi_sequence=midis, duration_sequence=list(sig[2]),
                    length_in_notes=len(notes),
                    range={"lowest": notes[midis.index(min(midis))]["pitch"], "highest": notes[midis.index(max(midis))]["pitch"],
                           "lowest_midi": min(midis), "highest_midi": max(midis), "semitones": max(midis) - min(midis)},
                    original_register={"first": notes[0]["pitch"], "final": notes[-1]["pitch"], "final_octave": notes[-1]["octave"],
                                       "original_clefs": [], "note": "register of the I-Distinct.mxl entry; not used by any Part I exercise"},
                    notes=notes, source_exercises=[], source_figures=[], cantus_voices=[],
                    distinct_file_entries=[], in_exercises=False,
                )
            distinct_only[sig]["distinct_file_entries"].append({"index": k, "label": seg["label"], "cantus_voice": cf_role})
            rec["distinct_cf_id"] = distinct_only[sig]["cf_id"]
        else:
            match["distinct_file_entries"].append({"index": k, "label": seg["label"], "cantus_voice": cf_role})
        distinct_entries.append(rec)
    for c in cantus_firmi:
        c["in_exercises"] = True
    cantus_firmi += list(distinct_only.values())
    for c in cantus_firmi:
        if not c["in_exercises"] and not c["distinct_file_entries"]:
            raise BuildError(f"{c['cf_id']}: orphan cantus firmus")

    counts = OrderedDict(
        exercises=len(exercises),
        solutions=len(solutions),
        annotated_solutions=sum(1 for a in annotations if a["items"]),
        annotation_items=sum(len(a["items"]) for a in annotations),
        distinct_cantus_firmi=len(cantus_firmi),
        distinct_cantus_firmi_used_by_exercises=sum(1 for c in cantus_firmi if c["in_exercises"]),
        distinct_cantus_firmi_from_distinct_file_only=sum(1 for c in cantus_firmi if not c["in_exercises"]),
        cantus_firmus_families=len(families),
        distinct_file_entries=len(distinct_entries),
        by_species={SPECIES_ENUM[s]: sum(1 for e in exercises if e["species_number"] == s) for s in SPECIES_ENUM},
        by_modal_final={f: sum(1 for e in exercises if e["modal_final"] == f) for f in "DEFGAC"},
        source_discrepancies=len(source_discrepancies),
    )

    return OrderedDict(
        schema_version=SCHEMA_VERSION,
        dataset_id="fux-gradus-ad-parnassum-part-I-two-voices",
        title="Johann Joseph Fux, Gradus ad Parnassum (1725), Part I: two-voice species counterpoint exercises",
        generated_by="tools/fux_import/build_dataset.py",
        conventions=OrderedDict(
            pitch="Scientific pitch notation (C4 = middle C = MIDI 60); spelled pitches exactly as encoded in the source; 'b' = flat, '#' = sharp.",
            duration="Fractions of a whole note as 'n/d' strings (1/1 = whole note = one 2/2 measure in this corpus).",
            offset="Onset in whole notes from the start of the exercise; 'beat' is the onset within the measure.",
            measure="1-based measure number within the exercise.",
            staff="'upper' / 'lower' staff of the two-voice score (upstream part 1 / part 2).",
            interval="Source style: quality + generic size, compound kept compound (P12, M10). Measured from the lower to the higher sounding note.",
            canonical_reading=CANONICAL_READING,
            musicxml="Each normalized note keeps the raw MusicXML <duration>/<divisions>/<type>/<accidental> of the per-exercise .mxl when that file agrees with the canonical reading at that onset.",
        ),
        provenance=OrderedDict(
            primary_dataset="Four Score and More / Open Music Theory 'Gradus ad Parnassum Exercises' dataset (Mark Gotham)",
            repository=repo_url,
            commit=commit,
            commit_date=S["SOURCE"]["commit_date"],
            latest_tag=S["SOURCE"]["latest_tag"],
            fetched=S["SOURCE"]["fetched"],
            vendored_copy=rel(SRC),
            reference_pages=[
                "https://pressbooks.nebraska.edu/openmusictheory/chapter/gradus-ad-parnassum-exercises/",
                "https://fourscoreandmore.org/species/",
                "https://github.com/MarkGotham/species",
            ],
            original_edition=S["corpus"]["source"],
            readings_used=OrderedDict(
                kern_vor="I/sp*/gap_*.krn: per-exercise Humdrum files, declared by upstream README the canonical 'version of record' (VoR)",
                musicxml_exercise_file="I/sp*/gap_*.mxl: per-exercise MusicXML derived from the krn by upstream scripts (music21)",
                musicxml_published="I/I-Solutions.mxl: public-facing Part I solutions download (MuseScore-edited)",
                musicxml_published_exercise="I/I-Exercises.mxl: public-facing Part I exercises download (CF only)",
                musicxml_annotations="I/I-Annotations.mxl: public-facing Part I annotated solutions (intervals as lyrics)",
                distinct="I/I-Distinct.mxl: public-facing Part I distinct cantus firmi (12 = 6 finals x 2 staff positions)",
                metadata="I/sp*/gap_*.json: per-exercise metadata (figure, species, modal final, CF part, original clefs, 1725 page)",
            ),
            choice_note=(
                "Upstream declares the krn+json files the version of record and all .mxl files derived. At the pinned commit the "
                "krn files of Figs. 22, 85b, 86a and 87b carry corrections against the 1725 print (upstream commit 67d0247) that "
                "were not yet propagated to any .mxl file. The normalized notes therefore follow the krn VoR; every MusicXML "
                "reading is parsed in full, compared note by note, and every disagreement is preserved in solutions[].source."
            ),
        ),
        license=OrderedDict(
            music="Fux's Gradus ad Parnassum (Vienna: van Ghelen, 1725) is in the public domain.",
            encodings=S["corpus"]["licence"],
            encodings_rights_statement_musicxml=S["solutions"].rights,
            upstream_code="MIT License, Copyright (c) 2026 Mark Gotham (see data/sources/fux-species/LICENSE)",
            attribution=("Encodings from the Four Score and More / Open Music Theory Gradus ad Parnassum dataset by Mark Gotham "
                         "(https://github.com/MarkGotham/species, DOI 10.5281/zenodo.18442041), building on initial transcriptions by "
                         "Jay Wilson. Figure numbers follow Alfred Mann's edition (Norton, 1965), as in the source."),
            note="CC0 waives rights; attribution is retained as scholarly courtesy and provenance, not as a legal requirement.",
        ),
        counts=counts,
        cantus_firmi=cantus_firmi,
        exercises=exercises,
        solutions=solutions,
        annotations=annotations,
        distinct_file_entries=distinct_entries,
        source_discrepancies=source_discrepancies,
    )


def build_annotations(ex_id, ann_id, seg, cf_role, cp_role, canon, measure_of, discrepancies) -> dict:
    """Read the interval lyrics of I-Annotations.mxl and pair each with the two sounding notes.

    The interval text is the source datum. The paired pitches are taken from the annotated file
    itself (so the record is faithful to that file); the canonical notes sounding at the same
    onset are linked by index, and any pitch difference is flagged.
    """
    start = seg["start"]
    voices = {r: seg["voices"][PART_INDEX[r]] for r in PART_INDEX}

    def sounding(notes, t):
        for n in notes:
            if n.offset - start <= t < n.offset - start + n.duration:
                return n
        return None

    def canon_sounding(role, t):
        for i, n in enumerate(canon[role]):
            if n.offset <= t < n.offset + n.duration:
                return i, n
        return None, None

    items = []
    for role in PART_INDEX:
        for n in voices[role]:
            if not n.lyrics:
                continue
            if len(n.lyrics) != 1:
                raise BuildError(f"{ex_id}: note with {len(n.lyrics)} lyrics in I-Annotations.mxl")
            t = n.offset - start
            other_role = cp_role if role == cf_role else cf_role
            other = sounding(voices[other_role], t)
            cp_n = n if role == cp_role else other
            cf_n = n if role == cf_role else other
            text = n.lyrics[0]
            item = OrderedDict(
                offset=frac(t),
                measure=measure_of(t),
                beat=frac(t - (measure_of(t) - 1)),
                annotated_voice="counterpoint" if role == cp_role else "cantus_firmus",
                counterpoint_note=cp_n.pitch.name if cp_n is not None and cp_n.pitch else None,
                cantus_note=cf_n.pitch.name if cf_n is not None and cf_n.pitch else None,
                interval=text,
                interval_computed=None,
                counterpoint_position=None,
                agrees=None,
                counterpoint_note_index=None,
                cantus_note_index=None,
            )
            if cp_n is not None and cp_n.pitch and cf_n is not None and cf_n.pitch:
                name, pos = ordered_interval(cp_n.pitch, cf_n.pitch)
                item["interval_computed"] = name
                item["counterpoint_position"] = {"a_above": "above", "b_above": "below", "unison": "unison"}[pos]
                item["agrees"] = name == text
                if name != text:
                    discrepancies.append({"exercise_id": ex_id, "kind": "annotation_interval_mismatch", "file": "I/I-Annotations.mxl",
                                          "detail": f"m{item['measure']} beat {item['beat']}: source {text!r}, computed {name!r} "
                                                    f"({item['counterpoint_note']} vs CF {item['cantus_note']})"})
            else:
                discrepancies.append({"exercise_id": ex_id, "kind": "annotation_without_two_sounding_notes", "file": "I/I-Annotations.mxl",
                                      "detail": f"m{item['measure']} beat {item['beat']}: {text!r}"})
            ci, cnote = canon_sounding(cp_role, t)
            fi, fnote = canon_sounding(cf_role, t)
            item["counterpoint_note_index"], item["cantus_note_index"] = ci, fi
            cname = cnote.pitch.name if cnote is not None and cnote.pitch else None
            fname = fnote.pitch.name if fnote is not None and fnote.pitch else None
            if (cname, fname) != (item["counterpoint_note"], item["cantus_note"]):
                item["canonical_counterpoint_note"] = cname
                item["canonical_cantus_note"] = fname
                if cnote is not None and cnote.pitch and fnote is not None and fnote.pitch:
                    item["canonical_interval_computed"] = ordered_interval(cnote.pitch, fnote.pitch)[0]
                discrepancies.append({"exercise_id": ex_id, "kind": "annotation_source_differs_from_canonical_notes", "file": "I/I-Annotations.mxl",
                                      "detail": f"m{item['measure']} beat {item['beat']}: annotated {item['counterpoint_note']}/{item['cantus_note']} "
                                                f"{text!r}; canonical {cname}/{fname}" + (f" -> {item.get('canonical_interval_computed')}" if item.get('canonical_interval_computed') else "")})
            items.append(item)
    items.sort(key=lambda x: (Fraction(x["offset"]), x["annotated_voice"] != "counterpoint"))

    # Coverage: which counterpoint onsets carry no annotation?
    annotated = {(x["offset"], x["annotated_voice"]) for x in items}
    def tie_of(n):
        return n.tie if isinstance(n, KNote) else n.tie_state()

    unannotated = [frac(n.offset) for n in canon[cp_role] if n.pitch is not None and tie_of(n) not in ("stop", "continue")
                   and (frac(n.offset), "counterpoint") not in annotated]
    return OrderedDict(
        id=ann_id,
        exercise_id=ex_id,
        source={"file": "I/I-Annotations.mxl", "measure_index_start": seg["first_measure_index"],
                "measure_count": seg["measure_count"], "encoding": "MusicXML <lyric> text under the annotated note"},
        items=items,
        unannotated_counterpoint_onsets=unannotated,
    )


def main() -> int:
    try:
        data = build()
    except BuildError as e:
        print(f"BUILD FAILED: {e}", file=sys.stderr)
        return 1
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    c = data["counts"]
    print(f"wrote {rel(OUT)} ({OUT.stat().st_size // 1024} KiB)")
    print(json.dumps(c, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())

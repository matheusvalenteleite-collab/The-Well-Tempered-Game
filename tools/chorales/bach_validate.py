#!/usr/bin/env python3
"""Validate the parsed Bach chorale library and write data/chorales/bach/VALIDATION.md.

Errors (the build is wrong) exit non-zero; findings (facts of the source worth knowing, such as an
incomplete bar before a repeat or a fermata held in one voice only) are listed, not failed.

Run:  python3 tools/chorales/bach_validate.py
"""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / "data" / "chorales" / "bach"
VOICES = ["soprano", "alto", "tenor", "bass"]
F = Fraction


def meter_length(meter: str) -> Fraction:
    n, d = meter.split("/")
    return F(int(n), int(d))


def main() -> None:
    index = json.loads((DIR / "index.json").read_text())
    errors: list[str] = []
    findings: dict[str, list[str]] = defaultdict(list)
    numbers = [c["number"] for c in index["catalogue"]]
    if sorted(numbers) != [n for n in range(1, 372) if n != 150]:
        errors.append("chorale numbers are not 1-371 without 150")
    ranges: dict[str, Counter] = {v: Counter() for v in VOICES}
    n_notes = 0
    keys = Counter()
    meters = Counter()
    for entry in index["catalogue"]:
        c = json.loads((DIR / entry["file"]).read_text())
        cid = f"no. {c['number']}"
        keys[c["key"]["mode"]] += 1
        meters[c["meters"][0]["meter"]] += 1
        length = F(c["length"])
        # 1. every voice fills the piece
        for v in VOICES:
            notes = c["voices"][v]
            n_notes += sum(not n.get("rest") for n in notes)
            end = F(notes[-1]["offset"]) + F(notes[-1]["duration"])
            if end != length:
                errors.append(f"{cid} {v}: ends at {end}, piece at {length}")
            pos = F(0)
            for n in notes:
                if F(n["offset"]) != pos:
                    errors.append(f"{cid} {v}: gap or overlap at {n['offset']}")
                pos += F(n["duration"])
                if "midi" in n:
                    ranges[v][n["pitch"]] += 1
        # 2. bar lengths against the metre in force
        ms = c["measures"]
        meter_at = sorted(((F(m["offset"]), meter_length(m["meter"])) for m in c["meters"]))
        for i, m in enumerate(ms):
            start = F(m["offset"])
            end = F(ms[i + 1]["offset"]) if i + 1 < len(ms) else length
            if end == start:
                continue
            want = [L for o, L in meter_at if o <= start][-1] if any(o <= start for o, _ in meter_at) else meter_at[0][1]
            if end - start != want:
                kind = "anacrusis" if m["number"] == 0 else "short or long bar"
                findings[f"Bars not equal to the metre ({kind})"].append(f"{cid} m.{m['number']}: {end - start} of {want}")
        # 3. ties join equal pitches
        for v in VOICES:
            notes = c["voices"][v]
            for a, b in zip(notes, notes[1:]):
                if a.get("tie") in ("start", "continue"):
                    if b.get("tie") not in ("continue", "stop") or a.get("pitch") != b.get("pitch"):
                        errors.append(f"{cid} {v}: broken tie at {a['offset']}")
        # 4. fermatas: every soprano fermata should be matched, in each voice, by a fermata on a
        #    note sounding at some point of the soprano's held note (lower voices may move under it).
        def spans(v: str):
            return [(F(n["offset"]), F(n["offset"]) + F(n["duration"])) for n in c["voices"][v] if n.get("fermata")]

        sop = spans("soprano")
        if not sop:
            findings["Chorales without fermatas"].append(cid)
        for a, b in sop:
            missing = [v for v in VOICES[1:] if not any(x < b and a < y for x, y in spans(v))]
            if missing:
                findings["Soprano fermatas without a fermata in another voice"].append(f"{cid} m.{_measure_at(c, a)}: none in {', '.join(missing)}")
        for v in VOICES[1:]:
            for x, y in spans(v):
                if not any(x < b and a < y for a, b in sop):
                    findings["Fermatas in a lower voice only"].append(f"{cid} m.{_measure_at(c, x)}: {v}")
        # Notes outside the usual ranges (S C4-A5, A F3-D5, T C3-A4, B C2-E4: a coarse net for
        # encoding errors, to be checked against the Breitkopf scan).
        bounds = {"soprano": (60, 81), "alto": (53, 74), "tenor": (48, 69), "bass": (36, 64)}
        for v in VOICES:
            lo, hi = bounds[v]
            for n in c["voices"][v]:
                if "midi" in n and not lo <= n["midi"] <= hi:
                    findings["Notes outside the usual ranges (check against the scan)"].append(f"{cid} m.{n['measure']} {v}: {n['pitch']}")
        # 5. crossings between adjacent voices at every onset
        events = sorted({F(n["offset"]) for v in VOICES for n in c["voices"][v]})
        sounding = {v: c["voices"][v] for v in VOICES}

        def at(v: str, t: Fraction):
            for n in sounding[v]:
                if F(n["offset"]) <= t < F(n["offset"]) + F(n["duration"]):
                    return n.get("midi")
            return None

        for t in events:
            mids = [at(v, t) for v in VOICES]
            for (hi, lo), (vh, vl) in zip(zip(mids, mids[1:]), zip(VOICES, VOICES[1:])):
                if hi is not None and lo is not None and hi < lo:
                    findings["Voice crossings (adjacent voices, at onsets)"].append(f"{cid} at {t}: {vh} below {vl}")
    if errors:
        print("\n".join(errors[:50]))
    lines = [
        "# Bach chorales (parsed library): validation report",
        "",
        f"Generated by `tools/chorales/bach_validate.py` from `index.json` and the {len(numbers)} chorale files.",
        "",
        f"- **Errors:** {len(errors)}" + ("" if not errors else " (the first are printed by the validator)"),
        f"- Chorales: {len(numbers)} (Breitkopf nos. 1-371; no. 150 is not four-part and is absent upstream)",
        f"- Sung notes: {n_notes}",
        f"- Modes (editor's designation): " + ", ".join(f"{k} {v}" for k, v in keys.most_common()),
        f"- Opening metres: " + ", ".join(f"{k} {v}" for k, v in meters.most_common()),
        "",
        "## Ranges",
        "",
        "| voice | lowest | highest |",
        "|---|---|---|",
    ]
    for v in VOICES:
        by_midi = sorted(ranges[v], key=_midi)
        lines.append(f"| {v} | {by_midi[0]} | {by_midi[-1]} |")
    lines += ["", "## Findings (facts of the source, not errors)", ""]
    for title, items in findings.items():
        lines += [f"### {title} ({len(items)})", ""]
        lines += [f"- {x}" for x in items[:40]]
        if len(items) > 40:
            lines.append(f"- ... and {len(items) - 40} more")
        lines.append("")
    (DIR / "VALIDATION.md").write_text("\n".join(lines))
    print(f"{len(errors)} errors; findings: " + ", ".join(f"{k}: {len(v)}" for k, v in findings.items()))
    sys.exit(1 if errors else 0)


def _measure_at(c: dict, t: Fraction) -> int:
    return [m["number"] for m in c["measures"] if F(m["offset"]) <= t][-1]


def _midi(name: str) -> int:
    step, rest = name[0], name[1:]
    alter = 0
    while rest and rest[0] in "#b":
        alter += 1 if rest[0] == "#" else -1
        rest = rest[1:]
    return 12 * (int(rest) + 1) + {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}[step] + alter


if __name__ == "__main__":
    main()

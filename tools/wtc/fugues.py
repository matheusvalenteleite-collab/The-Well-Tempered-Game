#!/usr/bin/env python3
"""The 48 fugues of the Well-Tempered Clavier: subject, answer, entries, exposition, stretto,
countersubject, episodes. Computed from the notes (data/local/wtc/, see import_wtc.py).

Method (each step is a reading, labelled as such in the output):

  voices        the spines the fugue starts with (the encoding gives one voice per spine, lowest
                first); a split of a spine is the voice dividing for a moment: its first branch
                stays the voice.
  subject       the first voice from its first note. Its end: the subject lasts as long as the
                answer, from its entry, repeats the first voice's rhythm and diatonic intervals (a
                step's difference allowed, at most three times, in the first six: the tonal
                mutation). A copy running past twice the distance between the entries includes
                a regular countersubject: it is capped at the note sounding when the answer
                enters (unless the answer enters in stretto, before the fifth note).
  answer        the second voice's statement: its interval from the subject (a fifth up or a fourth
                down, normally), and real (every interval kept to the semitone) or tonal (some
                changed, in the first notes, by the mutation of fifth and fourth).
  entries       every statement of the subject in any voice: the same rhythm (or twice / half as
                slow: augmentation, diminution) and the same diatonic intervals (or their mirror:
                inversion; in the first four intervals a step's difference is allowed twice: the
                tonal mutation), over at least the subject's head (its first notes, up to 6); a match
                that keeps going is followed to its end. The chromatic size of each interval may
                differ by a semitone (tonal answers, modal adjustments).
  exposition    the entries until every voice has had one: their order, by voice.
  stretto       an entry that begins before the previous entry has ended.
  countersubject  what the first voice sings against the answer; regular when its rhythm and
                diatonic intervals return against later entries.
  episodes      the time when no entry is sounding, as a share of the fugue, and the passages.

Output: data/wtc/fugues.json (facts about the fugues: subjects as pitch names, entries by bar and
voice; committed) and docs/wtc/FUGUES.md.

Run:  python3 tools/wtc/fugues.py
"""
from __future__ import annotations

import json
from fractions import Fraction as F
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LOCAL = ROOT / "data" / "local" / "wtc"
OUT = ROOT / "data" / "wtc" / "fugues.json"
REPORT = ROOT / "docs" / "wtc" / "FUGUES.md"
STEPS = "CDEFGAB"
HEAD = 6
VOICE_NAMES = {2: ["lower", "upper"], 3: ["bass", "alto", "soprano"], 4: ["bass", "tenor", "alto", "soprano"], 5: ["bass", "tenor", "alto", "mezzo", "soprano"]}


def diatonic(p: str) -> int:
    rest = p[1:]
    octave = int(rest.lstrip("#b"))
    return 7 * octave + STEPS.index(p[0])


def voices_of(piece: dict) -> list[list[dict]]:
    """One line per initial spine: notes of the spine and of the first branch of its splits; ties
    merged; rests kept as rests (they separate statements)."""
    n0 = piece["spines_initial"]
    lines = [[] for _ in range(n0)]
    for n in piece["notes"]:
        sp = n["spine"].split(".")
        top = int(sp[0]) - 1
        if top >= n0 or any(x != "1" for x in sp[1:]) or n.get("grace"):
            continue
        line = lines[top]
        if n.get("tie") in ("stop", "continue") and line and line[-1]["pitch"] == n["pitch"]:
            line[-1] = dict(line[-1], duration=str(F(line[-1]["duration"]) + F(n["duration"])))
            continue
        line.append(n)
    for line in lines:
        line.sort(key=lambda n: F(n["onset"]))
    return lines


def sounding(line: list[dict]) -> list[dict]:
    return [n for n in line if n["pitch"]]


def copy_run(a: list[dict], b: list[dict]) -> int:
    """How many notes b copies a from their first notes: the same diatonic intervals (in the first
    six intervals a step's difference is allowed, at most three times: the tonal mutation) and the same rhythm (the first note's
    length aside; the last note's length is not tested)."""
    k, mutated = 1, 0
    while k < min(len(a), len(b)):
        da = diatonic(a[k]["pitch"]) - diatonic(a[k - 1]["pitch"])
        db = diatonic(b[k]["pitch"]) - diatonic(b[k - 1]["pitch"])
        ok_pitch = da == db or (k - 1 < 6 and abs(da - db) <= 1 and mutated < 3)
        mutated += da != db
        ioi_a = F(a[k]["onset"]) - F(a[k - 1]["onset"])
        ioi_b = F(b[k]["onset"]) - F(b[k - 1]["onset"])
        if not ok_pitch or (k > 1 and ioi_a != ioi_b):
            break
        k += 1
    return k


def subject_of(lines: list[list[dict]]) -> tuple[int, list[dict], int, list[dict]]:
    """First voice, the subject's notes; second voice, the answer's notes.

    The answer copies the subject from its entry (rhythm and diatonic intervals, with the tonal
    mutation's step allowed in the first intervals); where it stops copying, the subject has ended.
    But a regular countersubject is copied too (the first voice sings it against the answer, the
    second against the third entry): when the copy runs on past twice the distance between the
    entries, it is capped where the answer enters (the subject is the first voice's notes up to
    and including the one sounding at the answer's entry). An answer entering in stretto (before
    the subject's fifth note) does not cap it."""
    firsts = sorted(((F(sounding(l)[0]["onset"]), i) for i, l in enumerate(lines) if sounding(l)))
    v1, v2 = firsts[0][1], firsts[1][1]
    a, b = sounding(lines[v1]), sounding(lines[v2])
    b_start = F(b[0]["onset"])
    pre = sum(1 for n in a if F(n["onset"]) < b_start)
    run = copy_run(a, b)
    # a copy reaching past twice the distance between the entries is a subject plus a regular
    # countersubject: cap it at the answer's entry
    run_end = F(a[run - 1]["onset"])
    regular = run_end >= b_start + (b_start - F(a[0]["onset"]))
    n = min(run, pre + 1) if regular and pre >= 5 else run
    return v1, a[:n], v2, b[:n]


def intervals(notes: list[dict]) -> tuple[list[int], list[int]]:
    d = [diatonic(y["pitch"]) - diatonic(x["pitch"]) for x, y in zip(notes, notes[1:])]
    c = [y["midi"] - x["midi"] for x, y in zip(notes, notes[1:])]
    return d, c


def match_at(line: list[dict], i: int, subj: list[dict], sd: list[int], sc: list[int]) -> tuple[str, float, int] | None:
    """Does a statement of the subject begin at line[i]? Returns (form, speed, notes matched)."""
    notes = sounding(line)
    head = min(HEAD, len(subj))
    best = None
    for form, sign in (("prime", 1), ("inversion", -1)):
        for speed in (F(1), F(2), F(1, 2)):
            k, mutated = 1, 0
            while k < len(subj) and i + k < len(notes):
                x, y = notes[i + k - 1], notes[i + k]
                # the first note's length is free (Bach lengthens or shortens it at an entry)
                if k > 1 and F(y["onset"]) - F(x["onset"]) != (F(subj[k]["onset"]) - F(subj[k - 1]["onset"])) * speed:
                    break
                dd = diatonic(y["pitch"]) - diatonic(x["pitch"])
                if dd != sign * sd[k - 1]:
                    # the tonal mutation: a step's difference in the head, at most twice
                    if not (k - 1 < 4 and abs(dd - sign * sd[k - 1]) == 1 and mutated < 2):
                        break
                    mutated += 1
                elif abs((y["midi"] - x["midi"]) - sign * sc[k - 1]) > 1:
                    break
                k += 1
            # augmentation and diminution: a longer stretch (scale runs would match a head)
            need = head if speed == 1 else min(len(subj), 8)
            if k >= need and (best is None or k > best[2]):
                best = (form if speed == 1 else f"{form}, {'augmentation' if speed == 2 else 'diminution'}", float(speed), k)
    return best


def analyse(piece: dict) -> dict:
    lines = voices_of(piece)
    nv = len(lines)
    names = VOICE_NAMES.get(nv, [str(i + 1) for i in range(nv)])
    v1, subj, v2, ans = subject_of(lines)
    sd, sc = intervals(subj)
    ad, ac = intervals(ans)
    transposition = ans[0]["midi"] - subj[0]["midi"]
    changed = [k + 1 for k, (x, y) in enumerate(zip(sc, ac)) if x != y]
    # tonal: an interval changed in the head; a change only further on is the answer's end
    # adjusted to what follows (a modulation, the countersubject's entry), not the mutation
    real = not any(k <= 6 for k in changed)
    entries = []
    for vi, line in enumerate(lines):
        notes = sounding(line)
        i = 0
        while i < len(notes):
            m = match_at(line, i, subj, sd, sc)
            if m:
                form, speed, k = m
                st = notes[i]
                end = notes[i + k - 1]
                entries.append({"voice": names[vi], "voice_index": vi, "onset": st["onset"], "measure": st["measure"],
                                "start": st["pitch"], "form": form, "notes": k, "complete": k >= len(subj),
                                "end": str(F(end["onset"]) + F(end["duration"]))})
                i += k
            else:
                i += 1
    entries.sort(key=lambda e: (F(e["onset"]), e["voice_index"]))
    # exposition: until every voice has entered
    seen, expo = set(), []
    for e in entries:
        if e["voice_index"] not in seen:
            seen.add(e["voice_index"])
            expo.append(e)
        if len(seen) == nv:
            break
    # stretto: an entry beginning before the previous one has ended (after the exposition)
    stretti = []
    for a, b in zip(entries, entries[1:]):
        if F(b["onset"]) < F(a["end"]) and b["voice_index"] != a["voice_index"]:
            stretti.append({"measure": b["measure"], "voices": [a["voice"], b["voice"]], "distance": str(F(b["onset"]) - F(a["onset"]))})
    # countersubject: the first voice against the answer
    a_start, a_end = F(ans[0]["onset"]), F(ans[-1]["onset"]) + F(ans[-1]["duration"])
    cs = [n for n in sounding(lines[v1]) if a_start <= F(n["onset"]) < a_end]
    cs_returns = 0
    if len(cs) >= 4:
        cd, cc = intervals(cs)
        cs_rel = [F(n["onset"]) - a_start for n in cs]
        for e in entries[2:]:
            e0 = F(e["onset"])
            for vi, line in enumerate(lines):
                if vi == e["voice_index"]:
                    continue
                notes = sounding(line)
                for j, n in enumerate(notes):
                    if F(n["onset"]) != e0 + cs_rel[0]:
                        continue
                    k = 1
                    while k < len(cs) and j + k < len(notes) and F(notes[j + k]["onset"]) - e0 == cs_rel[k] and diatonic(notes[j + k]["pitch"]) - diatonic(notes[j + k - 1]["pitch"]) == cd[k - 1]:
                        k += 1
                    if k >= min(6, len(cs)):
                        cs_returns += 1
                        break
    # episodes: time with no entry sounding (after the first entry)
    length = F(piece["length"])
    covered = []
    for e in entries:
        covered.append((F(e["onset"]), F(e["end"])))
    covered.sort()
    merged = []
    for s, e in covered:
        if merged and s <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], e))
        else:
            merged.append((s, e))
    gaps = []
    t = F(subj[0]["onset"])
    for s, e in merged:
        if s > t:
            gaps.append((t, s))
        t = max(t, e)
    if length > t:
        gaps.append((t, length))
    measures = [(F(m["onset"]), m["number"]) for m in piece["measures"]]
    bar_at = lambda x: max((num for on, num in measures if on <= x), default=0)  # noqa: E731
    episodes = [{"from_bar": bar_at(s), "to_bar": bar_at(e), "length": str(e - s)} for s, e in gaps if e - s >= F(1, 2)]
    ep_time = sum((e - s for s, e in gaps), F(0))
    return {
        "id": piece["id"], "book": piece["book"], "number": piece["number"], "key": piece["key"], "bwv": piece["bwv"],
        "voices": nv, "length_bars": piece["measures"][-1]["number"],
        "subject": {"voice": names[v1], "notes": [n["pitch"] for n in subj], "durations": [n["duration"] for n in subj],
                    "length": str(F(subj[-1]["onset"]) + F(subj[-1]["duration"]) - F(subj[0]["onset"])), "range_semitones": max(n["midi"] for n in subj) - min(n["midi"] for n in subj)},
        "answer": {"voice": names[v2], "interval_semitones": transposition, "real": real, "intervals_changed": changed,
                   "end_altered": any(k > 6 for k in changed), "notes": [n["pitch"] for n in ans]},
        "exposition": [e["voice"] for e in expo],
        "entries": entries,
        "counts": {"entries": len(entries), "inversions": sum("inversion" in e["form"] for e in entries),
                   "augmentations": sum("augmentation" in e["form"] for e in entries), "diminutions": sum("diminution" in e["form"] for e in entries),
                   "stretti": len(stretti), "countersubject_returns": cs_returns},
        "stretti": stretti,
        "countersubject": [n["pitch"] for n in cs],
        "episodes": episodes, "episode_share": round(float(ep_time / length), 3) if length else None,
    }


def checks(fugues: list[dict]) -> list[tuple[str, bool]]:
    by = {(f["book"], f["number"]): f for f in fugues}
    forms = lambda b, n, w: [e for e in by[(b, n)]["entries"] if w in e["form"]]  # noqa: E731
    return [
        ("1/1 C major: 24 entries of the subject", by[(1, 1)]["counts"]["entries"] == 24),
        ("1/1: the answer is real", by[(1, 1)]["answer"]["real"]),
        ("1/2 C minor: the answer is tonal", not by[(1, 2)]["answer"]["real"]),
        ("1/4 C-sharp minor: a five-voice fugue on a four-note head (C#-B#-E-D#)", by[(1, 4)]["subject"]["notes"][:4] == ["C#3", "B#2", "E3", "D#3"]),
        ("1/8 D-sharp minor: inversion, and augmentation from bar 62", bool(forms(1, 8, "inversion")) and any(e["measure"] == 62 for e in forms(1, 8, "augmentation"))),
        ("2/2 C minor: augmentation", bool(forms(2, 2, "augmentation"))),
        ("2/9 E major: diminution", bool(forms(2, 9, "diminution"))),
    ]


def interval_name(semis: int) -> str:
    names = {7: "fifth up", -5: "fourth down", 5: "fourth up", -7: "fifth down", 12: "octave up", -12: "octave down", 0: "unison",
             19: "twelfth up", -17: "eleventh down"}
    return names.get(semis, f"{semis:+d} semitones")


def main() -> None:
    idx = json.loads((LOCAL / "index.json").read_text())
    fugues = [analyse(json.loads((LOCAL / f"{x['id']}.json").read_text())) for x in idx if x["kind"] == "fugue"]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"generated_by": "tools/wtc/fugues.py", "note": "Computed readings (see the module docstring); subjects as pitch names, entries by bar and voice.", "fugues": fugues}, ensure_ascii=False, indent=1) + "\n")
    md = ["# The 48 fugues: subjects, answers, entries", "",
          "Generated by `tools/wtc/fugues.py` (method in its docstring). Every figure here is a computed reading,",
          "to be checked against the score; where the reading is doubtful the row says so.", "",
          "| fugue | key | voices | bars | subject (notes / length in whole notes / range in semitones) | answer | exposition | entries | inv. | aug. | dim. | stretti | CS returns | episodes |",
          "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for f in fugues:
        s, a, c = f["subject"], f["answer"], f["counts"]
        head = [k for k in a["intervals_changed"] if k <= 6]
        ans = f"{interval_name(a['interval_semitones'])}, {'real' if a['real'] else 'tonal (int. ' + ','.join(map(str, head)) + ')'}{'; end altered' if a['end_altered'] else ''}"
        md.append(f"| {f['book']}/{f['number']} | {f['key']} | {f['voices']} | {f['length_bars']} | {len(s['notes'])} / {float(F(s['length'])):.2g} / {s['range_semitones']} | {ans} | "
                  f"{'-'.join(v[0].upper() for v in f['exposition'])} | {c['entries']} | {c['inversions']} | {c['augmentations']} | {c['diminutions']} | {c['stretti']} | {c['countersubject_returns']} | {100 * f['episode_share']:.0f}% |")
    tot = lambda k: sum(f["counts"][k] for f in fugues)  # noqa: E731
    long_subjects = [f"{f['book']}/{f['number']}" for f in fugues if len(f["subject"]["notes"]) > 20]
    md += ["", f"Totals: {tot('entries')} entries, {tot('inversions')} inverted, {tot('augmentations')} augmented, {tot('stretti')} stretti; "
           f"tonal answers {sum(not f['answer']['real'] for f in fugues)} of {len(fugues)}.", "",
           "## Checks against what is known of these fugues", "",
           "Facts any analysis of the WTC states, which the reading must reproduce:", "",
           *[f"- {t}: **{'yes' if ok else 'NO'}**" for t, ok in checks(fugues)], "",
           "## Limits of the reading", "",
           "- The subject's end is the hardest call. Where the answer enters only after a codetta, or where the",
           "  countersubject is regular, the computed subject may run on (subjects of more than 20 notes:",
           f"  {', '.join(long_subjects)}); check these against the score.",
           "- Entries are found by exact rhythm and diatonic contour over the subject's head; an entry Bach alters",
           "  in its first notes (a changed head, a dotted variant) is missed, and a head-sized free passage can be",
           "  taken for one. Entry counts are a reading, not a census.",
           "- Voices are the encoding's spines; where a voice crosses into another spine the entry may be credited",
           "  to the wrong voice.", "",
           "## Subjects", ""]
    for f in fugues:
        md.append(f"- **{f['book']}/{f['number']} ({f['key']}, {f['voices']} voices)**: {' '.join(f['subject']['notes'])}")
    REPORT.write_text("\n".join(md) + "\n")
    print(f"{len(fugues)} fugues; entries {tot('entries')}; tonal {sum(not f['answer']['real'] for f in fugues)}")


if __name__ == "__main__":
    main()

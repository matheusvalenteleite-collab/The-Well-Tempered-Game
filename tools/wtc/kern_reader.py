"""A Humdrum **kern reader with spine manipulation (standard library only).

The WTC encodings (humdrum-tools/bach-wtc) divide a staff into voices with spine splits (*^),
join them again (*v), end spines (*-), and give alternative readings as "strophes" (*strophe,
*S/sic, *S/ossia, *S-). music21's parser loses notes on such files (Prelude 1 in C major comes
out with a tenth of its notes), so this reader follows the spines itself.

Each note keeps the path of the spine it was written in: "2" for the second spine of the file,
"2.1" and "2.2" for the two halves of a split of it. A fugue's voices are mostly whole spines;
a split is a voice dividing for a moment (a chord in one voice, a voice entering on its staff).
Ossia readings are dropped: only the main text (*S/sic, or no strophe) is kept.

Durations and onsets are Fractions of a whole note. Timing is by lines, as Humdrum defines it:
every event on a data line starts at the line's time, and the next line starts when the earliest
sounding event ends.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from fractions import Fraction as F
from pathlib import Path

_NOTE = re.compile(r"(?P<pre>[^0-9]*?)(?P<recip>\d+%?\d*)(?P<dots>\.*)(?P<grace>[qQ]?)(?P<mark>[xXyY]*)(?P<pitch>[a-gA-G]+|r)(?P<acc>(?:#{1,3}|-{1,3}|n)?)(?P<tail>.*)$")
_GRACE_ONLY = re.compile(r"(?P<pre>[^a-gA-Gr]*?)(?P<pitch>[a-gA-G]+)(?P<acc>(?:#{1,3}|-{1,3}|n)?)(?P<tail>[qQ].*)$")


@dataclass
class KNote:
    spine: str
    onset: F
    duration: F
    pitch: str | None  # spelled, scientific (C4 = middle C); None for a rest
    midi: int | None
    tie: str | None  # start / continue / stop
    fermata: bool
    grace: bool
    measure: int
    token: str


@dataclass
class KPiece:
    path: str
    refs: dict[str, str]
    notes: list[KNote]
    measures: list[dict]
    length: F
    keys: list[dict]  # {onset, key} (*C:, *a: ...)
    key_signatures: list[dict]
    meters: list[dict]
    spines_initial: int
    problems: list[str] = field(default_factory=list)


STEPS = "CDEFGAB"
PCS = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def kern_pitch(letters: str, acc: str) -> tuple[str, int]:
    ch = letters[0]
    if letters != ch * len(letters):
        raise ValueError(f"bad pitch {letters}")
    octave = 3 + len(letters) if ch.islower() else 4 - len(letters)
    alter = acc.count("#") - acc.count("-")
    step = ch.upper()
    name = step + ("#" * alter if alter > 0 else "b" * -alter) + str(octave)
    return name, 12 * (octave + 1) + PCS[step] + alter


def recip_duration(recip: str, dots: str) -> F:
    if "%" in recip:
        a, b = recip.split("%")
        base = F(int(b), int(a))
    else:
        r = int(recip)
        base = F(2) if r == 0 else F(1, r)
    d, add = base, base
    for _ in dots:
        add /= 2
        d += add
    return d


def read(path: str | Path) -> KPiece:
    path = Path(path)
    refs: dict[str, str] = {}
    spines: list[dict] | None = None  # each: {"id": str, "t": F, "ossia": bool}
    notes: list[KNote] = []
    measures: list[dict] = [{"number": 0, "onset": F(0), "style": None}]
    keys, kss, meters = [], [], []
    problems: list[str] = []
    measure = 0
    n_initial = 0
    clock = F(0)  # the time of the current data line (Humdrum timing is by lines)
    for lineno, line in enumerate(path.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
        if not line:
            continue
        if line.startswith("!!"):
            if line.startswith("!!!"):
                k, _, v = line[3:].partition(":")
                refs.setdefault(k.strip(), v.strip())
            continue
        fields = line.split("\t")
        if spines is None:
            if not fields[0].startswith("**"):
                continue
            spines = []
            for i, f in enumerate(fields):
                spines.append({"id": str(i + 1), "t": F(0), "ossia": False, "kern": f == "**kern", "n": 0})
            n_initial = len(spines)
            continue
        if line.startswith("!"):
            continue
        if len(fields) != len(spines):
            problems.append(f"{path.name}:{lineno}: {len(fields)} fields for {len(spines)} spines")
            continue
        if fields[0].startswith("*") and not fields[0].startswith("**"):
            # interpretation line, possibly with spine manipulators
            if any(f in ("*^", "*v", "*-", "*+", "*x") for f in fields):
                new: list[dict] = []
                i = 0
                while i < len(fields):
                    f, s = fields[i], spines[i]
                    if f == "*^":
                        s["n"] += 1
                        a = {"id": f"{s['id']}.1", "t": s["t"], "ossia": s["ossia"], "kern": s["kern"], "n": 0}
                        # the first half continues what the spine was sounding; the second starts free
                        b = {"id": f"{s['id']}.2", "t": min(s["t"], clock), "ossia": s["ossia"], "kern": s["kern"], "n": 0}
                        new += [a, b]
                        i += 1
                    elif f == "*v":
                        j = i
                        while j < len(fields) and fields[j] == "*v":
                            j += 1
                        group = spines[i:j]
                        ids = [g["id"] for g in group]
                        # joining the halves of one split gives the parent back
                        parents = {x.rsplit(".", 1)[0] for x in ids if "." in x}
                        jid = parents.pop() if len(parents) == 1 and all("." in x for x in ids) else ids[0]
                        ts = {g["t"] for g in group}
                        new.append({"id": jid, "t": max(ts), "ossia": all(g["ossia"] for g in group), "kern": group[0]["kern"], "n": 0})
                        i = j
                    elif f == "*-":
                        i += 1
                    elif f == "*+":
                        new += [s, {"id": f"{s['id']}+", "t": s["t"], "ossia": False, "kern": True, "n": 0}]
                        i += 1
                    elif f == "*x":
                        if i + 1 < len(fields) and fields[i + 1] == "*x":
                            new += [spines[i + 1], s]
                            i += 2
                        else:
                            new.append(s)
                            i += 1
                    else:
                        new.append(s)
                        i += 1
                spines = new
                continue
            for f, s in zip(fields, spines):
                if f == "*S/ossia":
                    s["ossia"] = True
                elif f in ("*S/sic", "*S-"):
                    s["ossia"] = False
                elif re.match(r"^\*[A-Ga-g][#-]?:", f) and s["kern"]:
                    if not keys or keys[-1]["key"] != f[1:] or keys[-1]["onset"] != s["t"]:
                        keys.append({"onset": s["t"], "key": f[1:], "spine": s["id"]})
                elif f.startswith("*k[") and s["kern"]:
                    kss.append({"onset": s["t"], "ks": f[3:-1], "spine": s["id"]})
                elif re.match(r"^\*M\d+/\d+", f) and s["kern"]:
                    meters.append({"onset": s["t"], "meter": f[2:], "spine": s["id"]})
            continue
        if fields[0].startswith("="):
            m = re.match(r"^=+(\d*)", fields[0])
            late = sorted({s["t"] for s in spines if s["kern"] and not s["ossia"] and s["t"] > clock})
            if late:
                problems.append(f"{path.name}:{lineno} (bar {m.group(1) if m else '?'}): a note crosses the bar line (ends {late} after {clock})")
            if m and m.group(1):
                measure = int(m.group(1))
                measures.append({"number": measure, "onset": clock, "style": fields[0][len(m.group(0)):] or None})
            continue
        for f, s in zip(fields, spines):
            if not s["kern"] or f == ".":
                continue
            if s["t"] > clock and not s["ossia"]:
                problems.append(f"{path.name}:{lineno}: a new event in spine {s['id']} before its last ends ({s['t']} > {clock})")
            s["t"] = clock
            step = None
            for tok in f.split(" "):
                if not tok:
                    continue
                # grace notes (q, Q) take no time of their own
                if "q" in tok or "Q" in tok:
                    mg = _NOTE.match(tok) or _GRACE_ONLY.match(tok)
                    if mg and mg["pitch"] != "r" and not s["ossia"]:
                        name, midi = kern_pitch(mg["pitch"], mg["acc"])
                        notes.append(KNote(s["id"], clock, F(0), name, midi, None, False, True, measure, tok))
                    continue
                mt = _NOTE.match(tok)
                if not mt:
                    problems.append(f"{path.name}:{lineno}: cannot read {tok!r}")
                    continue
                dur = recip_duration(mt["recip"], mt["dots"])
                step = dur if step is None else min(step, dur)
                if s["ossia"]:
                    continue
                pre, tail = mt["pre"], mt["tail"]
                tie = "start" if "[" in pre else "continue" if "_" in tail else "stop" if "]" in tail else None
                if mt["pitch"] == "r":
                    notes.append(KNote(s["id"], clock, dur, None, None, None, ";" in tail, False, measure, tok))
                else:
                    name, midi = kern_pitch(mt["pitch"], mt["acc"])
                    notes.append(KNote(s["id"], clock, dur, name, midi, tie, ";" in tail, False, measure, tok))
            if step is not None:
                s["t"] = clock + step
        # the next line starts when the earliest sounding event ends
        ends = [s["t"] for s in spines if s["kern"] and s["t"] > clock]
        if ends:
            clock = min(ends)
    length = max([s["t"] for s in spines or []] + [n.onset + n.duration for n in notes], default=F(0))
    return KPiece(str(path), refs, notes, measures, length, keys, kss, meters, n_initial, problems)

#!/usr/bin/env python3
"""Extract J. C. Kittel's 24 chorales (melody + eight figured basses) from the vector PDF.

Input : data/sources/kittel-24/kittel-24-chorale-bass.pdf  (Dorico engraving, 48 pages, 2 per chorale)
Output: data/chorales/kittel/kittel_NN.json (one per chorale) and, with --overlay, proof images

No optical recognition: the PDF draws every symbol as a character of a music font (Bravura; the
figures partly in FiguratoB) at an exact position, and stems, barlines, extenders and brackets as
vector lines. The extractor reads those and rebuilds the notation from geometry:

  staves      5 long horizontal lines; staff 0 = the melody (treble), 1..n = the basses [1]..[n]
  pitch       notehead baseline against the staff lines and the clef; accidentals in the bar
  rhythm      notehead kind (whole / half / black), dots, flags and beams; checked against the
              horizontal alignment of every staff (two independent readings of the same time)
  figures     figure glyphs above each bass staff, grouped into vertical stacks by x, read top to
              bottom; extender lines and dashes as continuations; bracketed figures as editorial

Anything the extractor cannot place is reported, never guessed silently.

Run:  python3 tools/chorales/kittel_extract.py [--chorales 1,2] [--overlay DIR]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from fractions import Fraction as F
from pathlib import Path

import pdfplumber

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "fux_import"))
from pitch import Pitch, frac  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
PDF = ROOT / "data" / "sources" / "kittel-24" / "kittel-24-chorale-bass.pdf"
OUT = ROOT / "data" / "chorales" / "kittel"
SCHEMA_VERSION = "0.1.0"

# --- glyph tables (SMuFL code points, read from the embedded fonts and checked by eye) -------------

BRAVURA = {
    "": ("clef", "G"), "": ("clef", "F"),
    "": ("time", "C"), "": ("timedigit", 2), "": ("timedigit", 3),
    "": ("head", "whole"), "": ("head", "half"), "": ("head", "black"),
    "": ("dot", None), "": ("repeatdots", None),
    "": ("flag", 1), "": ("flag", 1), "": ("flag", 2),
    "": ("acc", -1), "": ("acc", 0), "": ("acc", 1),
    "": ("accbracket", "("), "": ("accbracket", ")"),
    "": ("fermata", "above"), "": ("fermata", "below"),
    "": ("rest", "whole"), "": ("rest", "half"), "": ("rest", "quarter"), "": ("rest", "eighth"),
    "": ("artic", "accent"), "": ("artic", "staccatissimo"),
    "": ("dynamic", "p"), "": ("dynamic", "f"),
    "": ("bracket", None), "": ("bracket", None),
}
# Figured-bass glyphs -> (kind, value). "digit" values are interval numbers; "raised" marks the
# stroke through a figure (raised by a semitone: 4+, 6/, 7/ ...); "acc" a stand-alone accidental.
FIG_BRAVURA = {
    "": ("digit", 0), "": ("digit", 1), "": ("digit", 2), "": ("raised", 2),
    "": ("digit", 3), "": ("digit", 4), "": ("raised", 4), "": ("digit", 5),
    "": ("raised", 5), "": ("digit", 6), "": ("digit", 7), "": ("raised", 7),
    "": ("digit", 8), "": ("digit", 9), "": ("raised", 9),
    "": ("acc", -1), "": ("acc", 0), "": ("acc", 1), "": ("raised", 6),
}
FIG_FIGURATO = {
    "0": ("digit", 0), "1": ("digit", 1), "2": ("digit", 2), "3": ("digit", 3), "4": ("digit", 4),
    "5": ("digit", 5), "6": ("digit", 6), "7": ("digit", 7), "8": ("digit", 8),
    "#": ("acc", 1), "n": ("acc", 0), "d": ("dash", None), "": ("raised", 2),
    "": ("acc_bracketed", -1),
}
FIGURATO_EMPTY = {"(cid:2)", "(cid:4)", "(cid:5)"}  # empty glyphs (spacers) in the FiguratoB subset

STEPS = "CDEFGAB"
# Diatonic index (C0 = 0) of the bottom staff line for each clef.
BOTTOM_LINE = {"G": 7 * 4 + 2, "F": 7 * 2 + 4}  # E4, G2


@dataclass
class Glyph:
    kind: str
    value: object
    x: float  # origin (left edge of the glyph)
    y: float  # baseline, top-down page coordinates
    w: float
    size: float
    font: str
    text: str


@dataclass
class Staff:
    index: int
    lines: list[float]  # y of the five lines, top to bottom
    x0: float
    x1: float

    @property
    def top(self) -> float:
        return self.lines[0]

    @property
    def bottom(self) -> float:
        return self.lines[-1]

    @property
    def space(self) -> float:
        return (self.bottom - self.top) / 4


@dataclass
class Note:
    staff: int
    x: float
    y: float
    head: str
    rest: bool = False
    step_pos: int = 0  # half-spaces above the bottom line
    pitch: Pitch | None = None
    acc_written: int | None = None
    acc_editorial: bool = False
    dots: int = 0
    beams: int = 0
    flags: int = 0
    duration: F = F(0)
    offset: F | None = None
    fermata: bool = False
    tie_start: bool = False
    tie_stop: bool = False
    slur_start: bool = False
    slur_stop: bool = False
    stem: tuple | None = None
    measure: str | None = None
    artic: list = field(default_factory=list)
    grace: bool = False
    chord: list = field(default_factory=list)  # further noteheads struck with this one (lowest kept as the note)


def glyphs_of(page) -> tuple[list[Glyph], list[dict]]:
    H = page.height
    out, text = [], []
    for ch in page.chars:
        font = ch["fontname"].split("+", 1)[1]
        x, y = ch["matrix"][4], H - ch["matrix"][5]
        t = ch["text"]
        if font == "Bravura":
            if t in BRAVURA:
                k, v = BRAVURA[t]
            elif t in FIG_BRAVURA:
                k, v = FIG_BRAVURA[t]
                k = "fig_" + k
            else:
                raise ValueError(f"page {page.page_number}: unknown Bravura glyph U+{ord(t):04X}")
            out.append(Glyph(k, v, x, y, ch["x1"] - ch["x0"], ch["size"], font, t))
        elif font == "FiguratoB":
            if t in FIGURATO_EMPTY or t == " ":
                continue
            if t not in FIG_FIGURATO:
                raise ValueError(f"page {page.page_number}: unknown FiguratoB glyph {t!r}")
            k, v = FIG_FIGURATO[t]
            # FiguratoB reports zero advance widths; its digits are about 0.45 em wide.
            w = ch["x1"] - ch["x0"] or 0.45 * ch["size"]
            out.append(Glyph("fig_" + k, v, x, y, w, ch["size"], font, t))
        else:
            text.append({"font": font, "text": t, "x": x, "y": y, "size": ch["size"]})
    return out, text


def find_staves(page) -> list[Staff]:
    rows = sorted((l for l in page.lines if l["x1"] - l["x0"] > 300 and abs(l["top"] - l["bottom"]) < 0.01), key=lambda l: l["top"])
    ys = [l["top"] for l in rows]
    if len(ys) % 5:
        raise ValueError(f"page {page.page_number}: {len(ys)} staff lines")
    staves = []
    for i in range(0, len(ys), 5):
        five = ys[i : i + 5]
        gaps = [b - a for a, b in zip(five, five[1:])]
        if max(gaps) - min(gaps) > 0.2:
            raise ValueError(f"page {page.page_number}: uneven staff at {five}")
        staves.append(Staff(len(staves), five, rows[i]["x0"], rows[i]["x1"]))
    return staves


def staff_of(staves: list[Staff], y: float, slack: float = 0.0) -> Staff | None:
    for s in staves:
        if s.top - slack <= y <= s.bottom + slack:
            return s
    return None


def nearest_staff(staves: list[Staff], y: float) -> Staff:
    return min(staves, key=lambda s: 0 if s.top <= y <= s.bottom else min(abs(y - s.top), abs(y - s.bottom)))


def barlines_of(page, staves: list[Staff]) -> dict[int, list[dict]]:
    """Barlines per staff: x and style (solid, dashed, thick)."""
    verts = [l for l in page.lines if abs(l["x0"] - l["x1"]) < 0.01]
    per: dict[int, list[dict]] = {}
    for s in staves:
        cols: dict[float, list[dict]] = defaultdict(list)
        for l in verts:
            if l["bottom"] < s.top - 0.5 or l["top"] > s.bottom + 0.5:
                continue
            if l["linewidth"] < 0.8:  # stems are 0.51; barlines 0.85 (thin) and 2.12 (thick)
                continue
            cols[round(l["x0"], 1)].append(l)
        bars = []
        for x, ls in sorted(cols.items()):
            covered = sum(min(l["bottom"], s.bottom) - max(l["top"], s.top) for l in ls)
            height = s.bottom - s.top
            if covered < 0.3 * height:
                continue
            thick = any(l["linewidth"] > 2 for l in ls)
            dashed = len(ls) >= 3 and all(l["bottom"] - l["top"] < 4 for l in ls)
            bars.append({"x": x, "style": "thick" if thick else "dashed" if dashed else "solid"})
        # merge thin+thick pairs (final / repeat bars) into one barline
        merged: list[dict] = []
        for b in bars:
            if merged and b["x"] - merged[-1]["x"] < 5:
                merged[-1]["style"] = "+".join(sorted({*merged[-1]["style"].split("+"), b["style"]}))
                merged[-1]["x2"] = b["x"]
            else:
                merged.append(dict(b))
        per[s.index] = merged
    return per


def pitch_from(clef: str, step_pos: int, alter: int) -> Pitch:
    d = BOTTOM_LINE[clef] + step_pos
    return Pitch(STEPS[d % 7], alter, d // 7)


def key_sig_alters(n: int) -> dict[str, int]:
    """n > 0 sharps, n < 0 flats."""
    order = "FCGDAEB" if n > 0 else "BEADGCF"
    return {s: (1 if n > 0 else -1) for s in order[: abs(n)]}


def read_page(page, prev_state: dict | None) -> dict:
    gl, text = glyphs_of(page)
    staves = find_staves(page)
    bars = barlines_of(page, staves)
    report: list[str] = []
    stems = [l for l in page.lines if abs(l["x0"] - l["x1"]) < 0.01 and 0.45 < l["linewidth"] < 0.6]
    beams = [c for c in page.curves if c.get("fill") and _is_beam(c)]
    # A horizontal beam is drawn as a filled rectangle.
    beams += [
        {"x0": r["x0"], "x1": r["x1"], "pts": [(r["x0"], r["top"]), (r["x0"], r["bottom"]), (r["x1"], r["bottom"]), (r["x1"], r["top"])]}
        for r in page.rects
        if 1.5 < r["height"] < 2.6 and r["width"] > 4
    ]
    slurs = [c for c in page.curves if c.get("fill") and not _is_beam(c) and len(c["pts"]) >= 4]

    # Clefs, key signatures, time signature per staff
    staff_info = {}
    for s in staves:
        mine = [g for g in gl if staff_of(staves, g.y, s.space * 3) is s]
        clefs = sorted((g for g in mine if g.kind == "clef"), key=lambda g: g.x)
        if not clefs:
            raise ValueError(f"page {page.page_number} staff {s.index}: no clef")
        clef = clefs[0]
        first_event = min((g.x for g in mine if g.kind in ("head", "rest")), default=s.x1)
        time = [g for g in mine if g.kind in ("time", "timedigit") and g.x < first_event]
        ks_end = min([g.x for g in time] + [first_event])
        ks = [g for g in mine if g.kind == "acc" and clef.x < g.x < ks_end]
        alters = {g.value for g in ks}
        if len(alters) > 1:
            raise ValueError(f"page {page.page_number} staff {s.index}: mixed key signature")
        n = len(ks) * (alters.pop() if ks else 0)
        meter = None
        if time:
            if any(g.kind == "time" for g in time):
                meter = "C"
            else:
                digits = sorted((g for g in time if g.kind == "timedigit"), key=lambda g: g.y)
                meter = f"{digits[0].value}/{digits[1].value}"
        staff_info[s.index] = {"clef": clef.value, "key": n, "meter": meter, "ks_glyphs": {id(g) for g in ks}, "start_x": ks_end}

    # Noteheads and rests
    notes: list[Note] = []
    for g in gl:
        if g.kind not in ("head", "rest"):
            continue
        s = staff_of(staves, g.y, staves[0].space * 6)
        if s is None:
            s = nearest_staff(staves, g.y)
        n = Note(s.index, g.x, g.y, g.value, rest=g.kind == "rest", grace=g.size < 14)
        if not n.rest:
            n.step_pos = round((s.bottom - g.y) / (s.space / 2))
            if abs((s.bottom - g.y) / (s.space / 2) - n.step_pos) > 0.2:
                report.append(f"p{page.page_number} staff {s.index}: notehead off the grid at x={g.x:.1f}")
        n._w = g.w  # type: ignore[attr-defined]
        notes.append(n)

    by_staff: dict[int, list[Note]] = defaultdict(list)
    for n in notes:
        by_staff[n.staff].append(n)
    for si, lst in by_staff.items():
        lst.sort(key=lambda n: (n.x, -n.y))
        # Noteheads at one x in one staff are one chord (in the basses: a cadence note doubled at
        # the octave). The lowest stays the note; the others ride along in `chord`.
        merged: list[Note] = []
        for n in lst:
            if merged and not n.rest and not merged[-1].rest and abs(n.x - merged[-1].x) < 1.5 and n.head == merged[-1].head:
                merged[-1].chord.append(n)
            else:
                merged.append(n)
        by_staff[si] = merged

    # Accidentals, dots, fermatas, flags, articulations -> notes
    used = set()
    for g in gl:
        if g.kind in ("acc", "accbracket"):
            if any(id(g) in staff_info[i]["ks_glyphs"] for i in staff_info):
                continue
            s = staff_of(staves, g.y, staves[0].space * 6) or nearest_staff(staves, g.y)
            if g.kind == "accbracket":
                continue
            cands = [n for n in by_staff[s.index] if not n.rest and 0 < n.x - g.x < 4 * s.space and abs(n.y - g.y) < s.space * 0.3]
            if not cands:
                report.append(f"p{page.page_number} staff {s.index}: accidental at x={g.x:.1f} not attached")
                continue
            n = min(cands, key=lambda n: n.x - g.x)
            n.acc_written = g.value
            n.acc_editorial = any(h.kind == "accbracket" and abs(h.y - g.y) < 2 and abs(h.x - g.x) < 3 * s.space for h in gl)
        elif g.kind == "dot":
            s = staff_of(staves, g.y, staves[0].space * 6) or nearest_staff(staves, g.y)
            cands = [n for n in by_staff[s.index] if 0 < g.x - n.x < 3.5 * s.space and abs(n.y - g.y) <= s.space * 0.6]
            if not cands:
                report.append(f"p{page.page_number} staff {s.index}: dot at x={g.x:.1f} not attached")
                continue
            max(cands, key=lambda n: n.x).dots += 1
        elif g.kind == "fermata":
            s = nearest_staff(staves, g.y)
            cands = [n for n in by_staff[s.index] if abs(n.x + n._w / 2 - (g.x + g.w / 2)) < 2 * s.space]  # type: ignore[attr-defined]
            if not cands:
                report.append(f"p{page.page_number} staff {s.index}: fermata at x={g.x:.1f} not attached")
                continue
            min(cands, key=lambda n: abs(n.x - g.x)).fermata = True
        elif g.kind == "artic":
            s = nearest_staff(staves, g.y)
            cands = [n for n in by_staff[s.index] if abs(n.x + n._w / 2 - (g.x + g.w / 2)) < 2 * s.space]  # type: ignore[attr-defined]
            if cands:
                min(cands, key=lambda n: abs(n.x - g.x)).artic.append(g.value)
        elif g.kind == "flag":
            # A flag hangs from the end of its stem: find the stem, then the notehead at its
            # other end (a flag can reach into the staff above or below).
            stem = next((l for l in stems if abs(l["x0"] - g.x) < 1.2 and l["top"] - 2 <= g.y <= l["bottom"] + 2), None)
            cands = []
            if stem is not None:
                for lst in by_staff.values():
                    for n in lst:
                        if n.rest or n.head != "black":
                            continue
                        if (abs(n.x - stem["x0"]) < 0.9 or abs(n.x + n._w - stem["x0"]) < 0.9) and stem["top"] - 2 <= n.y <= stem["bottom"] + 2:  # type: ignore[attr-defined]
                            cands.append(n)
            if not cands:
                cands = [n for lst in by_staff.values() for n in lst if not n.rest and n.head == "black" and abs(n.x + n._w - g.x) < 3.5 and 0 < n.y - g.y < 18]  # type: ignore[attr-defined]
            if cands:
                max(cands, key=lambda n: abs(n.y - g.y)).flags = g.value
            else:
                report.append(f"p{page.page_number}: flag at x={g.x:.1f} y={g.y:.1f} not attached")

    # Stems -> notes; beams -> stems
    for s in staves:
        for n in by_staff[s.index]:
            if n.rest or n.head == "whole" or n.grace:
                continue
            w = n._w  # type: ignore[attr-defined]
            best = None
            for l in stems:
                at_x = abs(l["x0"] - n.x) < 0.8 or abs(l["x0"] - (n.x + w)) < 0.8
                if at_x and l["top"] - 1.5 <= n.y <= l["bottom"] + 1.5:
                    best = l
                    break
            if best is None:
                report.append(f"p{page.page_number} staff {s.index}: no stem for {n.head} at x={n.x:.1f}")
                continue
            tip = best["top"] if abs(best["bottom"] - n.y) < abs(best["top"] - n.y) else best["bottom"]
            n.stem = (best["x0"], tip)
            n.beams = sum(1 for b in beams if b["x0"] - 0.8 <= best["x0"] <= b["x1"] + 0.8 and _beam_y_at(b, best["x0"]) is not None and abs(_beam_y_at(b, best["x0"]) - tip) < 7)

    # Durations
    for n in notes:
        if n.grace:
            n.duration = F(0)  # an appoggiatura or grace note: written small, takes no time
            continue
        base = {"whole": F(1), "half": F(1, 2), "black": F(1, 4), "quarter": F(1, 4), "eighth": F(1, 8)}[n.head]
        if n.rest and n.head == "whole":
            base = None  # a whole-bar rest: length set from the bar
        if not n.rest and n.head == "black":
            base = F(1, 4) / (2 ** max(n.beams, n.flags))
        if base is not None:
            d, add = base, base
            for _ in range(n.dots):
                add /= 2
                d += add
            n.duration = d

    # Staff roles: staff 0 is the melody; a staff labelled "[n]" at the left is bass n; an unlabelled
    # staff below the first is the melody printed again for the bass under it (No. 21, where
    # one bass ends its last phrase in another place).
    labels: dict[int, int] = {}
    lab_chars = sorted((t for t in text if t["font"] == "Academico" and t["x"] < 90), key=lambda t: (round(t["y"]), t["x"]))
    for t in lab_chars:
        if t["text"].isdigit():
            st = min(staves, key=lambda s: abs((s.top + s.bottom) / 2 - t["y"] + 3))
            labels[st.index] = labels.get(st.index, 0) * 10 + int(t["text"])
    roles: dict[int, str] = {0: "melody"}
    for st in staves[1:]:
        if st.index in labels:
            roles[st.index] = f"bass {labels[st.index]}"
    for st in staves[1:]:
        if st.index not in labels:
            nxt = next((x for x in staves if x.index > st.index and x.index in labels), None)
            roles[st.index] = f"melody for bass {labels[nxt.index]}" if nxt else "unlabelled"
            if staff_info[st.index]["clef"] != "G":
                report.append(f"p{page.page_number} staff {st.index}: unlabelled staff with an F clef")
    return {
        "page": page.page_number,
        "roles": roles,
        "variant_staves": {si for si, r in roles.items() if r.startswith("melody for")},
        "staves": staves,
        "staff_info": staff_info,
        "bars": bars,
        "notes": by_staff,
        "glyphs": gl,
        "text": text,
        "slurs": slurs,
        "lines": page.lines,
        "rects": page.rects,
        "report": report,
    }


def _is_beam(c: dict) -> bool:
    pts = c["pts"]
    xs = sorted({round(p[0], 1) for p in pts})
    # A beam is a parallelogram: two vertical edges (2 points at each end x).
    if len(pts) not in (4, 5):
        return False
    left = [p for p in pts if abs(p[0] - xs[0]) < 0.05]
    right = [p for p in pts if abs(p[0] - xs[-1]) < 0.05]
    return len({round(p[1], 2) for p in left}) == 2 and len({round(p[1], 2) for p in right}) == 2


def _beam_y_at(c: dict, x: float) -> float | None:
    pts = c["pts"]
    x0, x1 = min(p[0] for p in pts), max(p[0] for p in pts)
    if not x0 - 1 <= x <= x1 + 1:
        return None
    left = [p[1] for p in pts if abs(p[0] - x0) < 0.05]
    right = [p[1] for p in pts if abs(p[0] - x1) < 0.05]
    t = 0 if x1 == x0 else (x - x0) / (x1 - x0)
    return (sum(left) / len(left)) * (1 - t) + (sum(right) / len(right)) * t


# --- time --------------------------------------------------------------------------------------------


def bar_grid(pg: dict) -> list[float]:
    """The system's barline positions (x), merged across staves (a staff that starts mid-system,
    such as a reprinted melody, shares the barlines it reaches)."""
    xs = sorted(b["x"] for si in pg["bars"] for b in pg["bars"][si])
    grid: list[float] = []
    for x in xs:
        if not grid or x - grid[-1] > 3:
            grid.append(x)
    return grid


def assign_time(pg: dict, meter_len: F, start_offset: F, first_measure: int, report: list[str]) -> list[dict]:
    """Give every note an onset, on a bar grid shared by all staves.

    The edition bars the chorales irregularly (its dashed bar lines follow the phrase, not a
    metre) and leaves a bar empty, without rests, in the staves that do not need it (a bass whose
    cadence takes one more bar than the others). So each bar has one length, the longest content
    of any staff in it, and each staff's onsets run from the start of the bar. A whole rest fills
    its bar. A staff that fills only part of a bar is reported (an underfull bar)."""
    grid = bar_grid(pg)
    nbars = len(grid) + 1
    in_bar: dict[int, list[list[Note]]] = {}
    for si, lst in pg["notes"].items():
        groups: list[list[Note]] = [[] for _ in range(nbars)]
        for n in lst:
            k = sum(1 for x in grid if n.x > x)
            groups[k].append(n)
        in_bar[si] = groups
    lengths = []
    for k in range(nbars):
        content = [sum((n.duration for n in g[k] if not (n.rest and n.head == "whole")), F(0)) for g in in_bar.values()]
        L = max(content, default=F(0))
        if L == 0 and any(n.rest and n.head == "whole" for g in in_bar.values() for n in g[k]):
            L = meter_len
        lengths.append(L)
    t0 = start_offset
    bars_out = []
    for k in range(nbars):
        for si, groups in in_bar.items():
            t = t0
            for n in groups[k]:
                if n.rest and n.head == "whole":
                    n.duration = lengths[k]
                n.bar = k  # type: ignore[attr-defined]
                n.offset = t
                t += n.duration
            filled = t - t0
            if groups[k] and filled < lengths[k] and groups[k][-1].fermata:
                pg.setdefault("findings", []).append(f"p{pg['page']} staff {si}: the fermata note ends {lengths[k] - filled} before the other staves")
            elif groups[k] and filled != lengths[k] and si not in pg.get("variant_staves", ()):
                report.append(f"p{pg['page']} staff {si}: bar at x>{grid[k - 1] if k else 0:.0f} holds {filled} of {lengths[k]}")
        bars_out.append({"index": k, "x_start": grid[k - 1] if k else None, "x_end": grid[k] if k < len(grid) else None, "start": t0, "length": lengths[k]})
        t0 += lengths[k]
    pg["bar_grid"] = bars_out
    pg["end"] = t0
    # the style of each barline, from the bass staves (the melody staff has its own short lines)
    dots = [g for g in pg["glyphs"] if g.kind == "repeatdots"]
    for b in bars_out:
        x = b["x_end"]
        if x is None:
            continue
        styles = [bl["style"] for si in pg["bars"] if si != 0 for bl in pg["bars"][si] if abs(bl["x"] - x) < 3]
        style = max(set(styles), key=styles.count) if styles else "solid"
        left = any(-9 < g.x - x < 0 for g in dots)
        right = any(0 < g.x - x < 12 for g in dots)
        b["barline"] = style + (" end-repeat" if left else "") + (" start-repeat" if right else "")
    return bars_out


def align_check(pg: dict, report: list[str]) -> None:
    """Notes with the same onset in different staves should share an x column (within a few
    points: Dorico aligns simultaneous notes). Report onsets whose x spread is large, and x
    columns that hold different onsets."""
    by_t: dict[F, list[float]] = defaultdict(list)
    for si, lst in pg["notes"].items():
        for n in lst:
            if (n.rest and n.head == "whole") or n.grace:
                continue  # a whole-bar rest is centred in its bar; a grace note precedes its beat
            by_t[n.offset].append(n.x)
    for t, xs in sorted(by_t.items()):
        if max(xs) - min(xs) > 6:
            report.append(f"p{pg['page']}: onset {t} spread over x {min(xs):.1f}..{max(xs):.1f}")
    # each staff's onsets must increase with x
    cols = sorted((min(xs), t) for t, xs in by_t.items())
    for (x1, t1), (x2, t2) in zip(cols, cols[1:]):
        if t2 < t1:
            report.append(f"p{pg['page']}: onset order disagrees with x at x={x2:.1f} ({t2} after {t1})")


# --- figures -----------------------------------------------------------------------------------------


def read_figures(pg: dict, report: list[str]) -> dict[int, list[dict]]:
    """Group figure glyphs into stacks per bass staff and attach each stack to a time."""
    staves = pg["staves"]
    figs = [g for g in pg["glyphs"] if g.kind.startswith("fig_")]
    accbr = [g for g in pg["glyphs"] if g.kind == "accbracket"]
    per_staff: dict[int, list[Glyph]] = defaultdict(list)
    for g in figs:
        # a figure sits above its bass staff: the nearest staff whose top is below the glyph
        below = [s for s in staves[1:] if s.top >= g.y - 2 and pg["roles"].get(s.index, "").startswith("bass")]
        if not below:
            report.append(f"p{pg['page']}: figure glyph at y={g.y:.1f} below the last staff")
            continue
        per_staff[min(below, key=lambda s: s.top).index].append(g)
    # Extender lines: thin horizontal lines between staves
    ext = [l for l in pg["lines"] if abs(l["top"] - l["bottom"]) < 0.01 and 0.3 < l["linewidth"] < 0.5 and 3 < l["x1"] - l["x0"] < 300]
    brackets = [r for r in pg["rects"] if r["height"] > 5 and r["width"] < 0.5]
    out: dict[int, list[dict]] = {}
    for si, glyphs in per_staff.items():
        s = staves[si]
        notes = [n for n in pg["notes"][si]]
        # Columns. Glyphs in different rows join a column when they start within 9 pt of it (the
        # engraving staggers the rows of one figure: "4 - #" over "8 - 7" ends its extenders at
        # different x). In the same row only an accidental and its digit join, when they touch.
        glyphs.sort(key=lambda g: g.x)
        cols: list[list[Glyph]] = []

        def same_row(a: Glyph, b: Glyph) -> bool:
            return abs(a.y - b.y) < 4

        for g in glyphs:
            placed = False
            for c in reversed(cols[-3:]):
                if g.x - min(h.x for h in c) > 9:
                    continue
                row_mates = [h for h in c if same_row(h, g)]
                if not row_mates:
                    c.append(g)
                    placed = True
                    break
                h = row_mates[-1]
                pair = {h.kind, g.kind}
                # FiguratoB reports unreliable glyph widths: judge by the distance between origins
                # Measured over the book: a digit and the accidental after it touch (gap -0.2..0.7 pt)
                # when they are one figure ("6♮"); "4 ♯", two figures in succession, leaves 2.3 pt.
                # FiguratoB reports unreliable widths, so an accidental before its digit is judged
                # by the distance between origins.
                touching = g.x - (h.x + h.w) < 1.6 or (h.kind.startswith("fig_acc") and 0 < g.x - h.x < 8)
                if touching and ("fig_digit" in pair or "fig_raised" in pair) and ("fig_acc" in pair or "fig_acc_bracketed" in pair) and len(row_mates) == 1:
                    c.append(g)
                    placed = True
                    break
            if not placed:
                cols.append([g])
        # merge accidentals into the column they precede (an accidental left of a digit, same row)
        stacks = []
        for c in sorted(cols, key=lambda c: min(g.x for g in c)):
            rows: list[list[Glyph]] = []
            for g in sorted(c, key=lambda g: g.y):
                for r in rows:
                    if abs(r[0].y - g.y) < 4:
                        r.append(g)
                        break
                else:
                    rows.append([g])
            stacks.append(rows)
        # pair accidental-only stacks with the digit stack immediately to their right
        merged = []
        for rows in stacks:
            only_acc = all(g.kind in ("fig_acc",) for r in rows for g in r)
            if merged and only_acc is False:
                pass
            merged.append(rows)
        result = []
        for rows in merged:
            xs = [g.x for r in rows for g in r]
            cx = sum(g.x + g.w / 2 for r in rows for g in r) / sum(len(r) for r in rows)
            items = []
            for r in rows:
                r.sort(key=lambda g: g.x)
                item = {"interval": None, "accidental": None, "raised": False, "dash": False, "editorial": False, "y": r[0].y}
                for g in r:
                    if g.kind == "fig_digit":
                        if item["interval"] is not None:
                            report.append(f"p{pg['page']} staff {si}: two digits in one figure row at x={g.x:.1f}")
                        item["interval"] = g.value
                    elif g.kind == "fig_raised":
                        item["interval"] = g.value
                        item["raised"] = True
                    elif g.kind == "fig_acc":
                        item["accidental"] = g.value
                        if any(abs(h.y - g.y) < 3 and abs(h.x - g.x) < 6 for h in accbr):
                            item["accidental_editorial"] = True
                    elif g.kind == "fig_acc_bracketed":
                        item["accidental"] = g.value
                        item["editorial"] = True
                    elif g.kind == "fig_dash":
                        item["dash"] = True
                x_left = min(g.x for g in r)
                x_right = max(g.x + g.w for g in r)
                # square brackets drawn as thin rects around this row
                if any(abs(b["top"] - (r[0].y - 7)) < 5 and (x_left - 4 < b["x0"] < x_left or x_right < b["x0"] < x_right + 4) for b in brackets):
                    item["editorial"] = True
                # extender: a thin line starting just right of this row, at mid-height of the digit
                for l in ext:
                    if x_right - 1 < l["x0"] < x_right + 4 and r[0].y - 9 < l["top"] < r[0].y + 1:
                        item["extender_to_x"] = l["x1"]
                items.append(item)
            # the onset: the note whose x is nearest the column's left, or an x between notes
            onset, how = time_at_x(notes, min(xs), cx, pg)
            result.append({"x": round(min(xs), 2), "cx": cx, "onset": onset, "placed": how, "rows": items})
        # Several figures over one note ("4 ♮", "6/4 5/3" over a cadence note): only the first
        # stands at its onset; the others follow inside the note.
        by_on: dict = defaultdict(list)
        for c in result:
            if c["placed"] == "over_note":
                by_on[c["onset"]].append(c)
        for group in by_on.values():
            for c in sorted(group, key=lambda c: c["cx"])[1:]:
                c["onset"], c["placed"] = None, "unplaced"
        place_inside_notes(result, notes)
        for c in result:
            if c["onset"] is None:
                report.append(f"p{pg['page']} staff {si}: figure column at x={c['x']} has no time")
        out[si] = result
    return out


def time_at_x(notes: list[Note], x_left: float, cx: float, pg: dict) -> tuple[F | None, str]:
    """Time of a figure column: the note it stands over, else interpolated between the onsets of
    all staves (figures over a held note mark a change inside the note)."""
    for n in notes:
        w = n._w  # type: ignore[attr-defined]
        if n.x - 3 <= cx <= n.x + w + 3:
            return n.offset, "over_note"
    # columns in other staves
    cols: dict[F, list[float]] = defaultdict(list)
    for si, lst in pg["notes"].items():
        for n in lst:
            cols[n.offset].append(n.x + n._w / 2)  # type: ignore[attr-defined]
    pts = sorted((sum(v) / len(v), t) for t, v in cols.items())
    for xa, ta in pts:
        if abs(cx - xa) < 3:
            return ta, "column"
    return None, "unplaced"


def place_inside_notes(result: list[dict], notes: list[Note]) -> None:
    """Figures inside a held bass note (8 7, 4 3, 6 5 over one note) are not spaced in proportion
    to time. Divide the note evenly among the figure columns standing over it: two columns over a
    minim fall on its two crotchets, over a semibreve on its two minims; four over a semibreve on
    its crotchets. When the division is not a plain note value, fall back to crotchets."""
    sounding = [n for n in notes]
    for i, n in enumerate(sounding):
        end_x = sounding[i + 1].x - 1 if i + 1 < len(sounding) else 1e9
        end_t = n.offset + n.duration
        inside = sorted(
            (c for c in result if c["onset"] == n.offset or (n.x - 6 <= c["cx"] < end_x and (c["onset"] is None or n.offset <= c["onset"] < end_t))),
            key=lambda c: c["cx"],
        )
        if not any(c["onset"] is None for c in inside):
            continue
        # Runs of unknown columns between two known times (the note's onset, a column whose time
        # another staff fixes, the note's end) share that interval evenly.
        anchors = [(n.offset, -1)] + [(c["onset"], j) for j, c in enumerate(inside) if c["onset"] is not None] + [(end_t, len(inside))]
        anchors = sorted(set(anchors), key=lambda a: a[1])
        for (ta, ja), (tb, jb) in zip(anchors, anchors[1:]):
            gap = [inside[j] for j in range(ja + 1, jb)]
            if not gap:
                continue
            step = (tb - ta) / (len(gap) + 1)
            if step.numerator == 1 and not step.denominator & (step.denominator - 1):
                times = [ta + k * step for k in range(1, len(gap) + 1)]
            else:
                # Halve what is left each time: "9 8 7" over a minim gives 9 on the beat, 8 on the
                # second crotchet, 7 on the last quaver.
                times, t, rest = [], ta, tb - ta
                for _ in gap:
                    rest /= 2
                    t += rest
                    times.append(t)
            for c, t in zip(gap, times):
                if ta < t < tb:
                    c["onset"], c["placed"] = t, "subdivided"


# --- assembly -----------------------------------------------------------------------------------------


def spell(pg: dict, report: list[str]) -> None:
    """Pitches with the key signature and accidentals that last to the next barline (any barline:
    the edition's dashed bar lines are bar lines), and through ties."""
    for si, lst in pg["notes"].items():
        info = pg["staff_info"][si]
        ks = key_sig_alters(info["key"]) if info["key"] else {}
        xs = [b["x"] for b in pg["bars"][si]]
        local: dict[tuple[str, int], int] = {}
        bar_i = 0
        for n in lst:
            while bar_i < len(xs) and n.x > xs[bar_i]:
                local = {}
                bar_i += 1
            if n.rest:
                continue
            d = BOTTOM_LINE[info["clef"]] + n.step_pos
            step, octave = STEPS[d % 7], d // 7
            for m in [n] + n.chord:
                d = BOTTOM_LINE[info["clef"]] + m.step_pos
                step, octave = STEPS[d % 7], d // 7
                if m.acc_written is not None:
                    local[(step, octave)] = m.acc_written
                    alter = m.acc_written
                else:
                    alter = local.get((step, octave), ks.get(step, 0))
                m.pitch = Pitch(step, alter, octave)


def ties_and_slurs(pg: dict, report: list[str]) -> None:
    staves = pg["staves"]
    for c in pg["slurs"]:
        pts = c["pts"]
        xa, xb = min(p[0] for p in pts), max(p[0] for p in pts)
        ya = min(pts, key=lambda p: p[0])[1]
        yb = max(pts, key=lambda p: p[0])[1]
        s = nearest_staff(staves, (ya + yb) / 2)
        lst = pg["notes"][s.index]
        left = [n for n in lst if not n.rest and abs((n.x + n._w / 2) - xa) < 8]  # type: ignore[attr-defined]
        right = [n for n in lst if not n.rest and abs((n.x + n._w / 2) - xb) < 8]  # type: ignore[attr-defined]
        if not left and not right:
            report.append(f"p{pg['page']} staff {s.index}: curve x={xa:.1f}..{xb:.1f} not attached")
            continue
        a = min(left, key=lambda n: abs(n.y - ya)) if left else None
        b = min(right, key=lambda n: abs(n.y - yb)) if right else None
        consecutive = a is not None and b is not None and a in lst and lst.index(b) == lst.index(a) + 1
        # a tie joins equal pitches; G to G sharp on one staff position is a slur
        if a and b and consecutive and a.pitch and b.pitch and a.pitch == b.pitch and abs(a.y - b.y) < 1:
            a.tie_start, b.tie_stop = True, True
        elif a and b and a is not b:
            a.slur_start, b.slur_stop = True, True
        elif a and not b:
            a.tie_start = True  # runs off the page: a tie to the next page (checked on assembly)
        elif b and not a:
            b.tie_stop = True


def chorale_pages(pl) -> list[tuple[int, str, list[int]]]:
    """(number, title, page indices) from the titles."""
    out = []
    for i, p in enumerate(pl.pages):
        title = "".join(c["text"] for c in p.chars if "PalatinoLinotype-Bold" in c["fontname"] and c["size"] > 12)
        m = re.match(r"№\s*(\d+)\.\s*(.*)$", title.replace("(cid:7)", "tt").strip())
        if m:
            out.append((int(m.group(1)), m.group(2).strip(), [i]))
        elif out:
            out[-1][2].append(i)
    return out


def note_json(n: Note, measure: str) -> dict:
    d = {
        "pitch": n.pitch.name if n.pitch else None,
        "midi": n.pitch.midi if n.pitch else None,
        "rest": n.rest,
        "duration": frac(n.duration),
        "offset": frac(n.offset),
        "measure": measure,
    }
    if n.fermata:
        d["fermata"] = True
    if n.grace:
        d["grace"] = True
    if n.chord:
        d["chord"] = [m.pitch.name for m in n.chord]
    if n.tie_start or n.tie_stop:
        d["tie"] = "continue" if n.tie_start and n.tie_stop else "start" if n.tie_start else "stop"
    if n.slur_start:
        d["slur"] = "start"
    if n.slur_stop:
        d["slur"] = "stop" if "slur" not in d else "stop+start"
    if n.acc_written is not None:
        d["accidental_shown"] = True
    if n.acc_editorial:
        d["accidental_editorial"] = True
    if n.artic:
        d["articulations"] = n.artic
    if not n.rest:
        d["_x"] = round(n.x, 2)
    return {k: v for k, v in d.items() if v is not None or k in ("pitch",)}


def build_chorale(pl, number: int, title: str, pages: list[int], overlay: Path | None) -> dict:
    report: list[str] = []
    pgs = []
    offset = F(0)
    meter = None
    for k, pi in enumerate(pages):
        pg = read_page(pl.pages[pi], None)
        report += pg["report"]
        if meter is None:
            meter = pg["staff_info"][0]["meter"]
        mlen = F(1) if meter in ("C", "4/4") else F(int(meter.split("/")[0]), int(meter.split("/")[1]))
        spell(pg, report)
        assign_time(pg, mlen, offset, 0, report)
        align_check(pg, report)
        ties_and_slurs(pg, report)
        pg["figures"] = read_figures(pg, report)
        offset = pg["end"]
        pgs.append(pg)
        if overlay:
            draw_overlay(pl, pi, pg, overlay / f"kittel_{number:02d}_p{pi + 1:02d}.png")
    # Bars: numbered through the chorale from the bar grid; the printed numbers (above the melody)
    # are a check. A segment of no length (before the first barline or after the last) is not a
    # bar.
    measures = []
    for pg in pgs:
        printed = bar_numbers(pg)
        for b in pg["bar_grid"]:
            if b["length"] == 0:
                b["number"] = None  # the margin before the first or after the last barline
                continue
            b["number"] = len(measures) + 1
            pn = printed.get("first") if b["x_start"] is None else next((v for k, v in printed.items() if k != "first" and abs(k - b["x_start"]) < 4), None)
            if pn is not None and pn != str(b["number"]):
                report.append(f"p{pg['page']}: bar {b['number']} is printed as {pn}")
            measures.append({"number": b["number"], "offset": frac(b["start"]), "length": frac(b["length"]), "page": pg["page"], "barline_after": b.get("barline")})
    roles = []
    for pg in pgs:
        for si in sorted(pg["roles"]):
            if pg["roles"][si] not in roles:
                roles.append(pg["roles"][si])
    voices: dict[str, dict] = {}
    for role in roles:
        notes, figures = [], []
        for pg in pgs:
            for si, r in pg["roles"].items():
                if r != role:
                    continue
                notes += [dict(note_json(n, measure_of(pg, si, n)), _page=pg["page"]) for n in pg["notes"][si]]
                figures += [fig_json(col, pg, si) for col in pg["figures"].get(si, [])]
        label = role.split()[-1] if role.startswith("bass") else None
        voices[role] = {"role": role, "label": f"[{label}]" if label else None, "notes": notes, "figures": figures}
    basses = [v for r, v in voices.items() if r.startswith("bass ")]
    basses.sort(key=lambda v: int(v["role"].split()[1]))
    for r, v in voices.items():
        if r.startswith("melody for bass "):
            b = next(x for x in basses if x["role"] == r.removeprefix("melody for "))
            b["melody_variant"] = {"notes": v["notes"], "note": "the melody as printed again above this bass, where the bass ends a phrase in another place"}
    if len(basses) not in (8, 9):
        report.append(f"{len(basses)} basses")
    info0 = pgs[0]["staff_info"]
    return {
        "id": f"kittel_{number:02d}",
        "number": number,
        "title": title,
        "pages": [p + 1 for p in pages],
        "printed_pages": [p + 3 for p in pages],
        "meter": "4/4" if meter == "C" else meter,
        "meter_sign": meter,
        "key_signature": info0[0]["key"],
        "length": frac(offset),
        "measures": measures,
        "phrases": phrases_of(measures, voices["melody"]["notes"]),
        "structure": structure_of(measures),
        "melody": voices["melody"],
        "basses": basses,
        "extraction_report": report,
        "findings": [f for pg in pgs for f in pg.get("findings", [])],
    }


def phrases_of(measures: list[dict], melody: list[dict]) -> list[dict]:
    """Phrases end at the melody's fermatas (the lines of the hymn). The edition also keeps the
    chorale's own barring at line ends (a solid bar line among the dashed ones); whether a phrase
    ends at one is recorded."""
    ends = sorted({n["measure"] for n in melody if n.get("fermata")})
    out, start = [], measures[0]["number"] if measures else 1
    for e in ends:
        m = next(x for x in measures if x["number"] == e)
        out.append({
            "number": len(out) + 1, "first_measure": start, "last_measure": e,
            "offset": next(x["offset"] for x in measures if x["number"] == start),
            "end": frac(F(m["offset"]) + F(m["length"])),
            "ends_at_solid_barline": (m.get("barline_after") or "dashed").split()[0] != "dashed",
        })
        start = e + 1
    return out


def structure_of(measures: list[dict]) -> dict:
    """Repeat structure. An end-repeat with no start-repeat before it repeats from the beginning
    (the Stollen of a bar form): A A B."""
    end = next((m["number"] for m in measures if "end-repeat" in (m.get("barline_after") or "")), None)
    if end is None:
        return {"form": "through", "sections": [{"label": "A", "first_measure": 1, "last_measure": measures[-1]["number"]}], "performed": ["A"]}
    return {
        "form": "bar form (Stollen repeated)",
        "sections": [{"label": "A", "first_measure": 1, "last_measure": end}, {"label": "B", "first_measure": end + 1, "last_measure": measures[-1]["number"]}],
        "performed": ["A", "A", "B"],
    }


def measure_of(pg: dict, si: int, n: Note) -> int | None:
    return pg["bar_grid"][n.bar]["number"] if hasattr(n, "bar") else None  # type: ignore[attr-defined]


def bar_numbers(pg: dict) -> dict:
    """Printed bar numbers (Academico-Italic above the top staff) keyed by the rounded x of the
    barline they stand on; 'first' for the number at the start of the page."""
    digits = sorted((t for t in pg["text"] if t["font"] == "Academico-Italic"), key=lambda t: t["x"])
    groups: list[list[dict]] = []
    for t in digits:
        if groups and t["x"] - groups[-1][-1]["x"] < 6:
            groups[-1].append(t)
        else:
            groups.append([t])
    xs = sorted({b["x"] for b in pg["bars"][0]})
    out: dict = {}
    for g in groups:
        num = "".join(t["text"] for t in g)
        gx = g[0]["x"]
        near = [x for x in xs if abs(x - gx) < 6]
        if near:
            out[round(near[0], 0)] = num
        else:
            out.setdefault("first", num)
    return out


def fig_json(col: dict, pg: dict, si: int) -> dict:
    rows = []
    n_rows = len(col["rows"])
    for i, r in enumerate(col["rows"]):
        # level: 0 = the row nearest the staff, within this figure; y: the baseline on the page
        # (rows of different figures that share a baseline continue one another).
        d = {"level": n_rows - 1 - i, "y": round(r["y"], 1)}
        if r["interval"] is not None:
            d["interval"] = r["interval"]
        if r["accidental"] is not None:
            d["accidental"] = {-1: "flat", 0: "natural", 1: "sharp"}[r["accidental"]]
        if r["raised"]:
            d["raised"] = True
        if r["dash"]:
            d["continuation"] = True
        if r["editorial"]:
            d["editorial"] = True
        if r.get("accidental_editorial"):
            d["accidental_editorial"] = True
        if "extender_to_x" in r:
            d["extender_to_x"] = round(r["extender_to_x"], 2)
        rows.append(d)
    return {"onset": frac(col["onset"]) if col["onset"] is not None else None, "placed": col["placed"], "x": col["x"], "page": pg["page"], "stack": rows}


# --- proof images ------------------------------------------------------------------------------------


def draw_overlay(pl, pi: int, pg: dict, path: Path) -> None:
    from PIL import Image, ImageDraw
    import pypdfium2 as pdfium

    sc = 2.5
    doc = pdfium.PdfDocument(str(PDF))
    im = doc[pi].render(scale=sc).to_pil().convert("RGB")
    d = ImageDraw.Draw(im)
    for si, lst in pg["notes"].items():
        s = pg["staves"][si]
        for n in lst:
            lab = "r" if n.rest else n.pitch.name if n.pitch else "?"
            dur = n.duration
            lab += f" {dur.numerator}/{dur.denominator}" if dur != 0 else " ?"
            if n.tie_start:
                lab += "~"
            x, y = n.x * sc, (s.bottom + 4) * sc
            d.text((x, y + (10 if (lst.index(n) % 2) else 0)), lab, fill=(220, 0, 0))
        for b in pg["bars"][si]:
            d.line((b["x"] * sc, s.top * sc - 4, b["x"] * sc, s.bottom * sc + 4), fill=(0, 150, 255) if b["style"] == "dashed" else (0, 200, 0), width=2)
    for si, cols in pg["figures"].items():
        s = pg["staves"][si]
        for col in cols:
            txt = "/".join(_row_text(r) for r in col["rows"])
            d.text((col["x"] * sc, (s.top - 27) * sc), txt, fill=(0, 120, 0) if col["onset"] is not None else (255, 0, 255))
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)


def _row_text(r: dict) -> str:
    acc = {None: "", -1: "b", 0: "n", 1: "#"}[r["accidental"]]
    if r["dash"]:
        return "-"
    num = "" if r["interval"] is None else str(r["interval"])
    return acc + num + ("+" if r["raised"] else "") + ("()" if r["editorial"] else "") + ("_" if "extender_to_x" in r else "")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--chorales", default="")
    ap.add_argument("--overlay", default="")
    a = ap.parse_args()
    pl = pdfplumber.open(str(PDF))
    want = {int(x) for x in a.chorales.split(",") if x}
    OUT.mkdir(parents=True, exist_ok=True)
    total_issues = 0
    summary = ["# Kittel chorales: extraction report", "", "Generated by `tools/chorales/kittel_extract.py` (the `extraction_report` of each chorale file).", ""]
    for number, title, pages in chorale_pages(pl):
        if want and number not in want:
            continue
        c = build_chorale(pl, number, title, pages, Path(a.overlay) if a.overlay else None)
        (OUT / f"{c['id']}.json").write_text(json.dumps(c, ensure_ascii=False, indent=1) + "\n")
        total_issues += len(c["extraction_report"])
        summary.append(f"- No. {number} ({title}): {len(c['extraction_report'])} issue(s)")
        summary += [f"  - {x}" for x in c["extraction_report"]]
        print(f"No. {number:2d} {title[:40]:40s} pages {c['pages']} basses {len(c['basses'])} issues {len(c['extraction_report'])}")
        for r in c["extraction_report"][:15]:
            print("   ", r)
    print(f"total issues: {total_issues}")
    if not want:
        (OUT / "EXTRACTION.md").write_text("\n".join(summary) + "\n")


if __name__ == "__main__":
    main()

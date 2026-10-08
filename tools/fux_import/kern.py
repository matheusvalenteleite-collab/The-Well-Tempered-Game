"""Minimal Humdrum **kern reader for the Fux dataset's version-of-record files (stdlib only).

Supports what the corpus uses (and fails loudly on anything else): one **kern spine per part,
no spine splits, recip durations with dots, rests, ties ([ _ ]), accidentals (# - n, with the
X/y display markers), fermatas (;), grace notes (q/Q), barlines, and the *part/*staff/*clef/
*k/*M interpretations. Pitch letters follow kern convention: c = C4, cc = C5, C = C3, CC = C2.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from fractions import Fraction
from pathlib import Path

from pitch import Pitch

_TOKEN = re.compile(
    r"^(?P<open>[\[\(\{&]*)"
    r"(?P<recip>\d+)(?P<dots>\.*)"
    r"(?P<grace>[qQ]?)"
    r"(?P<pitch>[a-gA-G]+|r{1,2})"
    r"(?P<acc>(?:#{1,2}|-{1,2}|n)?)"
    r"(?P<accflags>[Xy]*)"
    r"(?P<rest>.*)$"
)


@dataclass
class KNote:
    measure: str
    offset: Fraction  # whole notes from start
    duration: Fraction  # whole notes
    pitch: Pitch | None
    tie: str | None  # start | continue | stop | None
    accidental_display: str | None  # 'X' (explicitly shown), 'y' (hidden) or None
    explicit_natural: bool
    fermata: bool
    grace: bool
    token: str


@dataclass
class KPart:
    spine: int
    part: str | None
    staff: str | None
    clef: str | None
    key: str | None
    meter: str | None
    notes: list[KNote]


@dataclass
class KScore:
    path: str
    references: dict[str, str]
    parts: list[KPart]  # in spine order (left to right)


def _kern_pitch(letters: str, acc: str) -> Pitch:
    ch = letters[0]
    if letters != ch * len(letters):
        raise ValueError(f"bad kern pitch {letters!r}")
    octave = 3 + len(letters) if ch.islower() else 4 - len(letters)
    alter = {"": 0, "n": 0, "#": 1, "##": 2, "-": -1, "--": -2}[acc]
    return Pitch(ch.upper(), alter, octave)


def read_kern(path: str | Path) -> KScore:
    path = Path(path)
    refs: dict[str, str] = {}
    parts: list[KPart] | None = None
    cursors: list[Fraction] = []
    measure = "1"
    for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line:
            continue
        if line.startswith("!!!"):
            key, _, value = line[3:].partition(":")
            refs[key.strip()] = value.strip()
            continue
        if line.startswith("!"):
            continue
        fields = line.split("\t")
        if parts is None:
            if any(f != "**kern" for f in fields):
                raise ValueError(f"{path}:{lineno}: only **kern spines supported")
            parts = [KPart(i, None, None, None, None, None, []) for i in range(len(fields))]
            cursors = [Fraction(0)] * len(fields)
            continue
        if len(fields) != len(parts):
            raise ValueError(f"{path}:{lineno}: spine count changed (splits are unsupported)")
        if fields[0].startswith("*"):
            for p, tok in zip(parts, fields):
                if tok in ("*", "*-"):
                    continue
                if tok.startswith("*part"):
                    p.part = tok[5:]
                elif tok.startswith("*staff"):
                    p.staff = tok[6:]
                elif tok.startswith("*clef"):
                    p.clef = tok[5:]
                elif tok.startswith("*k["):
                    p.key = tok[2:]
                elif tok.startswith("*M") and "/" in tok:
                    p.meter = tok[2:]
                elif tok.startswith("*^") or tok.startswith("*v") or tok.startswith("*+"):
                    raise ValueError(f"{path}:{lineno}: spine manipulation unsupported")
            continue
        if fields[0].startswith("="):
            m = re.match(r"=+(\d*)", fields[0])
            if m and m.group(1):
                measure = m.group(1)
            continue
        for i, (p, tok) in enumerate(zip(parts, fields)):
            if tok == ".":
                continue
            if " " in tok:
                raise ValueError(f"{path}:{lineno}: chords unsupported ({tok!r})")
            mt = _TOKEN.match(tok)
            if not mt:
                raise ValueError(f"{path}:{lineno}: cannot parse kern token {tok!r}")
            recip = int(mt["recip"])
            if recip == 0:
                raise ValueError(f"{path}:{lineno}: breve (0) unsupported")
            dur = Fraction(1, recip)
            add = dur
            for _ in mt["dots"]:
                add /= 2
                dur += add
            grace = bool(mt["grace"])
            if grace:
                dur = Fraction(0)
            rest_tail = mt["rest"]
            unknown = re.sub(r"[\]\)\}_;LJkK/\\'~^]", "", rest_tail)
            if unknown:
                raise ValueError(f"{path}:{lineno}: unhandled kern signifiers {unknown!r} in {tok!r}")
            is_rest = mt["pitch"].startswith("r")
            tie = None
            if "[" in mt["open"]:
                tie = "start"
            elif "_" in rest_tail:
                tie = "continue"
            elif "]" in rest_tail:
                tie = "stop"
            flags = mt["accflags"]
            p.notes.append(
                KNote(
                    measure=measure,
                    offset=cursors[i],
                    duration=dur,
                    pitch=None if is_rest else _kern_pitch(mt["pitch"], mt["acc"]),
                    tie=tie,
                    accidental_display=("X" if "X" in flags else "y" if "y" in flags else None),
                    explicit_natural=mt["acc"] == "n",
                    fermata=";" in rest_tail,
                    grace=grace,
                    token=tok,
                )
            )
            cursors[i] += dur
    if parts is None:
        raise ValueError(f"{path}: no **kern spines found")
    return KScore(str(path), refs, parts)

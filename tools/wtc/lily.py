#!/usr/bin/env python3
"""A reader for the LilyPond used by the Mutopia Project's editions of the Well-Tempered Clavier.

It turns a .ly file into a list of notes, standard library only. It is not a LilyPond
implementation: it reads the subset that Mutopia's Bach keyboard files use, follows LilyPond's own
rules where they decide a pitch or a time, and ignores everything that only affects the engraving.

    from lily import read, notes
    score = read("bwv847a.ly")      # a LyScore: notes, measures, time signatures, warnings
    for n in notes("bwv847a.ly"):   # the notes alone
        ...

Each note is a dict:

    onset      Fraction, whole notes from the start (the start of an anacrusis is 0)
    duration   Fraction, whole notes; tied notes are merged into one; 0 for a grace note
    pitch      spelled name, scientific octave: "C4" is middle C, "F#3", "Bb2", "C##5"
    midi       int, 60 for C4
    measure    int; the first full bar is 1, an anacrusis (\\partial at the start) is bar 0, as
               in the Humdrum encodings; bars are counted from the time signatures in force
    staff      the staff the note is printed on (after \\change Staff): "upper" and "lower" for
               the two staves of a piano score, otherwise the name of the Staff context
    part       the staff whose music the note belongs to, before any \\change Staff ("upper",
               "lower"...): the hand, in keyboard music
    voice      an id: the staff's own voice ("upper"), a voice of << ... \\\\ ... >> ("upper:1",
               "upper:2"; LilyPond's Voice "1", "2" of that staff, so the same id for the same
               voice in successive << \\\\ >> blocks), a named Voice ("soprano"), or an anonymous
               \\new Voice ("upper/v3")
    grace      True for a grace note (\\grace, \\appoggiatura, \\acciaccatura, \\afterGrace)

What is read
------------
Pitches in Dutch (the default), Italian (do re mi, -d sharp, -b flat), English, German and
Spanish names, chosen by \\include "italiano.ly" and the like or by \\language. Absolute
octaves, \\relative (with or without a starting pitch), \\fixed, \\absolute, \\transpose and
\\modalTranspose. They are resolved as LilyPond resolves them, when the expression is read:
\\relative takes each note to the octave nearest the previous one by letter (a fourth or less),
' and , moving it from there; a chord's notes are taken one from the next, and its first note is
the reference for what follows; the elements of << >>, the voices of << \\\\ >> included, are taken
one after the other, each from where the previous left off, and the last one sets the reference
after >>; a repeated passage is taken once, so every repetition sounds the same, and its
alternatives follow it; \\transpose and a nested \\relative are left alone by an outer \\relative.
Variables (name = ...) are copied where they are used, as LilyPond does, and \\include of a file
beside the score is read in place.

Durations carry over when omitted (in the order of the text, as in LilyPond), with dots and
multipliers (R1*3, c8.*5/6). \\times, \\tuplet and \\scaleDurations scale them. \\repeat unfold,
volta, percent and tremolo are all unfolded; volta alternatives are played in turn (the first
alternative again when there are fewer alternatives than repeats), and each \\repeat with
\\alternative is mentioned in LyScore.warnings. Rests (r, R, a note with \\rest) and skips (s,
\\skip) take time and give no note; the pitch of a positioned rest (a8\\rest) still counts in
\\relative, as in LilyPond. Chords (< >), q, ties (~, on a chord or on one of its notes),
<< >> with or without \\\\, \\new and \\context Staff and Voice, \\change Staff, \\time, \\partial
at the start. Everything else (articulations, markup, \\override, \\set, Scheme, \\header,
\\paper, \\layout, \\midi, lyrics) is skipped. A tie joins a note to the next note of the same
pitch in its voice that starts when it ends; failing one, to such a note in the same part (a tie
written across a change of voice, which LilyPond would not engrave but the editor meant). A note
written in two voices at once (one notehead shared by two voices) is two notes, as LilyPond's own
MIDI output plays it.

Validation: against the Humdrum encodings (data/local/wtc), comparing each bar's attacks (onset
and MIDI pitch, grace notes and tied continuations left out), Preludes 1, 2, 5 and 6 of Book I
agree in 35/35, 35/38, 34/35 and 25/26 bars; every remaining difference is a reading of the
edition (Prelude 2, bar 18: B flat for C, as the file's comment says; bar 30: A for A flat; bar
34: A flat for A, twice; Prelude 6, bar 21: C sharp for C) or a shared notehead (Prelude 5, bar
33: D5 written in both voices).

Run as a script, it prints a file's notes as JSON lines:  python3 tools/wtc/lily.py FILE.ly
"""
from __future__ import annotations

import bisect
import copy
import json
import re
import sys
from dataclasses import dataclass, field
from fractions import Fraction as F
from pathlib import Path

__all__ = ["read", "notes", "parse", "LyScore", "LilyError"]


class LilyError(Exception):
    """Input this reader cannot make sense of."""


# --------------------------------------------------------------------------------------------
# Pitch names
# --------------------------------------------------------------------------------------------

STEPS = "CDEFGAB"
PCS = (0, 2, 4, 5, 7, 9, 11)


def _names(bases: dict[str, int], suffixes: dict[str, int]) -> dict[str, tuple[int, int]]:
    out = {}
    for b, s in bases.items():
        out[b] = (s, 0)
        for suf, alt in suffixes.items():
            out[b + suf] = (s, alt)
    return out


_DUTCH = _names(dict(zip("cdefgab", range(7))), {"is": 1, "isis": 2, "es": -1, "eses": -2})
_DUTCH.update({"as": (5, -1), "ases": (5, -2), "es": (2, -1), "eses": (2, -2)})
_ITALIAN = _names({"do": 0, "re": 1, "mi": 2, "fa": 3, "sol": 4, "la": 5, "si": 6},
                  {"d": 1, "dd": 2, "b": -1, "bb": -2})
_ENGLISH = _names(dict(zip("cdefgab", range(7))),
                  {"s": 1, "ss": 2, "x": 2, "f": -1, "ff": -2, "sharp": 1, "sharpsharp": 2,
                   "flat": -1, "flatflat": -2})
_GERMAN = _names(dict(zip("cdefgah", range(7))), {"is": 1, "isis": 2, "es": -1, "eses": -2})
_GERMAN.update({"as": (5, -1), "asas": (5, -2), "es": (2, -1), "eses": (2, -2), "b": (6, -1),
                "heses": (6, -2)})
_SPANISH = _names({"do": 0, "re": 1, "mi": 2, "fa": 3, "sol": 4, "la": 5, "si": 6},
                  {"s": 1, "ss": 2, "x": 2, "b": -1, "bb": -2})
LANGUAGES = {
    "nederlands": _DUTCH, "english": _ENGLISH, "deutsch": _GERMAN, "italiano": _ITALIAN,
    "francais": _ITALIAN, "espanol": _SPANISH, "español": _SPANISH, "catalan": _ITALIAN,
    "portugues": _SPANISH,
}
_LANGUAGE_FILES = {f"{k}.ly": k for k in LANGUAGES}


@dataclass
class Pitch:
    """A spelled pitch: step 0-6 (C-B), alteration in semitones, octave with c (C3) = 0."""
    step: int
    alter: int
    octave: int

    def steps(self) -> int:
        return self.octave * 7 + self.step

    def semitones(self) -> int:
        return self.octave * 12 + PCS[self.step] + self.alter

    def midi(self) -> int:
        return 48 + self.semitones()

    def name(self) -> str:
        acc = "#" * self.alter if self.alter > 0 else "b" * -self.alter
        return f"{STEPS[self.step]}{acc}{self.octave + 3}"

    def transposed(self, dsteps: int, dsemis: int) -> "Pitch":
        n = self.steps() + dsteps
        octave, step = divmod(n, 7)
        alter = self.semitones() + dsemis - (octave * 12 + PCS[step])
        return Pitch(step, alter, octave)


# --------------------------------------------------------------------------------------------
# Lexer
# --------------------------------------------------------------------------------------------

@dataclass
class Tok:
    kind: str    # word num str cmd scheme sym artic dir
    value: str
    line: int
    space: bool  # preceded by white space (or a comment)


_CMD = re.compile(r"[A-Za-z]+(?:[-_][A-Za-z]+)*")


def _skip_scheme(text: str, i: int) -> int:
    """The end of the Scheme datum starting at text[i] (just after # or $)."""
    n = len(text)
    if i >= n:
        return i
    c = text[i]
    if c == "#" and i + 1 < n and text[i + 1] in "tf":  # ##t, ##f
        return i + 2
    if c == "{":  # #{ embedded LilyPond #}
        j = text.find("#}", i)
        return n if j < 0 else j + 2
    while i < n and text[i] in "'`,@#":  # quote, quasiquote, nested #
        if text[i] == "#" and i + 1 < n and text[i + 1] in "tf\\":
            break
        i += 1
    if i < n and text[i] == "#" and i + 1 < n and text[i + 1] in "tf":
        return i + 2
    if i < n and text[i] == "#" and i + 1 < n and text[i + 1] == "\\":
        return i + 3
    if i < n and text[i] == "(":
        depth = 0
        while i < n:
            c = text[i]
            if c == '"':
                i += 1
                while i < n and text[i] != '"':
                    i += 2 if text[i] == "\\" else 1
            elif c == ";":
                while i < n and text[i] != "\n":
                    i += 1
                continue
            elif c == "#" and text[i + 1:i + 2] == "\\":
                i += 3
                continue
            elif c == "(":
                depth += 1
            elif c == ")":
                depth -= 1
                if depth == 0:
                    return i + 1
            i += 1
        return n
    if i < n and text[i] == '"':
        i += 1
        while i < n and text[i] != '"':
            i += 2 if text[i] == "\\" else 1
        return i + 1
    while i < n and not text[i].isspace() and text[i] not in "(){}<>\"":
        i += 1
    return i


def lex(text: str, base_dir: Path | None = None, _depth: int = 0) -> list[Tok]:
    """Tokens of a LilyPond text; \\include of a file found beside it is lexed in place."""
    toks: list[Tok] = []
    i, n, line, space = 0, len(text), 1, True

    def add(kind: str, value: str) -> None:
        nonlocal space
        toks.append(Tok(kind, value, line, space))
        space = False

    while i < n:
        c = text[i]
        if c.isspace():
            if c == "\n":
                line += 1
            space = True
            i += 1
        elif text.startswith("%{", i):
            j = text.find("%}", i + 2)
            j = n if j < 0 else j + 2
            line += text.count("\n", i, j)
            i, space = j, True
        elif c == "%":
            j = text.find("\n", i)
            i, space = (n if j < 0 else j), True
        elif c == '"':
            j, buf = i + 1, []
            while j < n and text[j] != '"':
                if text[j] == "\\" and j + 1 < n:
                    buf.append(text[j + 1])
                    j += 2
                else:
                    buf.append(text[j])
                    j += 1
            line += text.count("\n", i, j)
            add("str", "".join(buf))
            i = j + 1
        elif c in "#$":
            j = _skip_scheme(text, i + 1)
            line += text.count("\n", i, j)
            add("scheme", text[i:j])
            i = j
        elif c == "\\":
            if text.startswith("\\\\", i):
                add("sym", "\\\\")
                i += 2
                continue
            m = _CMD.match(text, i + 1)
            if m:
                add("cmd", m.group())
                i = m.end()
            else:
                add("cmd", text[i + 1:i + 2])
                i += 2
        elif text.startswith("<<", i) or text.startswith(">>", i):
            add("sym", text[i:i + 2])
            i += 2
        elif c in "-^_" and i + 1 < n:
            d = text[i + 1]
            if d in ".>^+|-_!":
                add("artic", text[i:i + 2])
                i += 2
            elif d.isdigit():
                j = i + 1
                while j < n and text[j].isdigit():
                    j += 1
                add("artic", text[i:j])
                i = j
            else:
                add("dir", c)
                i += 1
        elif c.isalpha():
            j = i
            while j < n and (text[j].isalpha() or (text[j] == "-" and j + 1 < n and text[j + 1].isalpha()
                                                   and text[i:j] in ("sharp", "flat"))):
                j += 1
            add("word", text[i:j])
            i = j
        elif c.isdigit():
            j = i
            while j < n and text[j].isdigit():
                j += 1
            add("num", text[i:j])
            i = j
        else:
            add("sym", c)
            i += 1

    # \include: a language file sets the note names; a file beside the score is read in place.
    out: list[Tok] = []
    k = 0
    while k < len(toks):
        t = toks[k]
        if t.kind == "cmd" and t.value == "include" and k + 1 < len(toks) and toks[k + 1].kind == "str":
            name = toks[k + 1].value
            k += 2
            if name in _LANGUAGE_FILES:
                out.append(Tok("cmd", "language", t.line, True))
                out.append(Tok("str", _LANGUAGE_FILES[name], t.line, True))
            elif base_dir is not None and (base_dir / name).is_file() and _depth < 10:
                sub = (base_dir / name).read_text(encoding="utf-8", errors="replace")
                out.extend(lex(sub, (base_dir / name).parent, _depth + 1))
            continue
        out.append(t)
        k += 1
    return out


# --------------------------------------------------------------------------------------------
# Music tree
# --------------------------------------------------------------------------------------------

@dataclass
class Event:
    """A note, chord, rest or skip. Pitches are resolved (absolute) by the time it is played."""
    kind: str  # note, chord, rest, pitched-rest (a8\rest), skip, mmrest, repeat-chord (q)
    pitches: list[Pitch]
    ties: list[bool]
    dur: F
    line: int


@dataclass
class Seq:
    items: list


@dataclass
class Sim:
    parts: list              # voiced: a list of item lists, one per voice; else one item each
    voiced: bool


@dataclass
class Fixed:
    """Music whose pitches are already resolved: an outer \\relative leaves it alone."""
    body: object


@dataclass
class Repeat:
    kind: str
    count: int
    body: object
    alts: list


@dataclass
class Scale:
    factor: F
    body: object


@dataclass
class Grace:
    body: object


@dataclass
class AfterGrace:
    main: object
    grace: object


@dataclass
class Context:
    type: str
    name: str | None
    body: object
    new: bool


@dataclass
class Change:
    type: str
    name: str


@dataclass
class Time:
    measure: F
    text: str


@dataclass
class Partial:
    dur: F


def _walk_pitches(node, fn) -> None:
    """Call fn on every Pitch inside node, Fixed included."""
    if isinstance(node, Event):
        for p in node.pitches:
            fn(p)
    elif isinstance(node, Seq):
        for x in node.items:
            _walk_pitches(x, fn)
    elif isinstance(node, Sim):
        for part in node.parts:
            for x in (part if node.voiced else [part]):
                _walk_pitches(x, fn)
    elif isinstance(node, (Fixed, Scale, Grace, Context)):
        _walk_pitches(node.body, fn)
    elif isinstance(node, Repeat):
        _walk_pitches(node.body, fn)
        for a in node.alts:
            _walk_pitches(a, fn)
    elif isinstance(node, AfterGrace):
        _walk_pitches(node.main, fn)
        _walk_pitches(node.grace, fn)


def _relative_pitch(p: Pitch, ref: Pitch) -> None:
    """Resolve p in place: nearest by letter to ref, then its octave marks (held in p.octave)."""
    delta = p.step - ref.step
    while delta > 3:
        delta -= 7
    while delta < -3:
        delta += 7
    n = ref.steps() + delta + 7 * p.octave
    p.octave, p.step = divmod(n, 7)


def _make_relative(node, ref: Pitch) -> Pitch:
    """LilyPond's relative-octave conversion of node from ref; returns the next reference."""
    if isinstance(node, Event):
        if node.kind in ("note", "chord", "pitched-rest") and node.pitches:
            r = ref
            for p in node.pitches:
                _relative_pitch(p, r)
                r = p
            return node.pitches[0]
        return ref
    if isinstance(node, Seq):
        for x in node.items:
            ref = _make_relative(x, ref)
        return ref
    if isinstance(node, Sim):
        for part in node.parts:
            for x in (part if node.voiced else [part]):
                ref = _make_relative(x, ref)
        return ref
    if isinstance(node, (Scale, Grace, Context)):
        return _make_relative(node.body, ref)
    if isinstance(node, AfterGrace):
        return _make_relative(node.grace, _make_relative(node.main, ref))
    if isinstance(node, Repeat):
        ref = _make_relative(node.body, ref)
        for a in node.alts:
            ref = _make_relative(a, ref)
        return ref
    return ref  # Fixed, commands


# --------------------------------------------------------------------------------------------
# Parser
# --------------------------------------------------------------------------------------------

_POST = set("""fermata shortfermata longfermata verylongfermata arpeggio arpeggioArrowUp
arpeggioArrowDown mordent prall prallprall prallmordent upprall downprall upmordent downmordent
pralldown prallup lineprall reverseturn turn trill staccato staccatissimo accent tenuto marcato
portato espressivo upbow downbow flageolet open stopped snappizzicato thumb segno coda varcoda
startTrillSpan stopTrillSpan glissando laissezVibrer repeatTie sustainOn sustainOff sostenutoOn
sostenutoOff unaCorda treCorde p pp ppp pppp mp mf f ff fff ffff fp sf sff sfz fz rfz sp spp
cresc decresc dim endcresc enddecresc enddim startTextSpan stopTextSpan startGroup stopGroup
harmonic halfopen ictus noBeam lheel rheel ltoe rtoe signumcongruentiae""".split()) | set("()[]<>!~+=")

_NOOP_PREFIX = {"once", "temporary", "parenthesize", "single", "footnote_"}
_SKIP_BLOCK = {"header", "paper", "layout", "midi", "with"}
_SKIP_MODE = {"lyricmode", "addlyrics", "chordmode", "chords", "figuremode", "figures", "drummode",
              "drums", "lyrics", "markuplist"}
_BASE = {"1": F(1), "2": F(1, 2), "4": F(1, 4), "8": F(1, 8), "16": F(1, 16), "32": F(1, 32),
         "64": F(1, 64), "128": F(1, 128), "256": F(1, 256)}
_LONG = {"breve": F(2), "longa": F(4), "maxima": F(8)}


class Parser:
    def __init__(self, toks: list[Tok]):
        self.toks = toks
        self.i = 0
        self.names = _DUTCH
        self.vars: dict[str, object] = {}
        self.last_dur = F(1, 4)
        self.scores: list = []
        self.warnings: list[str] = []

    # token helpers --------------------------------------------------------------------------
    def peek(self, k: int = 0) -> Tok | None:
        j = self.i + k
        return self.toks[j] if j < len(self.toks) else None

    def next(self) -> Tok:
        t = self.peek()
        if t is None:
            raise LilyError("unexpected end of input")
        self.i += 1
        return t

    def at(self, kind: str, value: str | None = None, k: int = 0) -> bool:
        t = self.peek(k)
        return t is not None and t.kind == kind and (value is None or t.value == value)

    def expect(self, kind: str, value: str | None = None) -> Tok:
        t = self.next()
        if t.kind != kind or (value is not None and t.value != value):
            raise LilyError(f"line {t.line}: expected {value or kind}, found {t.value!r}")
        return t

    def warn(self, msg: str) -> None:
        if msg not in self.warnings:
            self.warnings.append(msg)

    def skip_braces(self) -> None:
        self.expect("sym", "{")
        depth = 1
        while depth:
            t = self.next()
            if t.kind == "sym" and t.value == "{":
                depth += 1
            elif t.kind == "sym" and t.value == "}":
                depth -= 1

    def skip_markup(self) -> None:
        """Skip what follows \\markup: commands and their Scheme arguments, then a {...} or a word."""
        while True:
            t = self.peek()
            if t is None:
                return
            if t.kind == "sym" and t.value == "{":
                self.skip_braces()
                return
            if t.kind in ("cmd", "scheme"):
                self.i += 1
                continue
            if t.kind in ("str", "word", "num"):
                self.i += 1
            return

    def skip_value(self) -> None:
        t = self.peek()
        if t is None:
            return
        if t.kind == "cmd" and t.value in ("markup", "markuplist"):
            self.i += 1
            self.skip_markup()
        elif t.kind == "sym" and t.value == "{":
            self.skip_braces()
        elif t.kind == "word":
            self.i += 1
            while self.at("sym", ".") and self.at("word", k=1):
                self.i += 2
        elif t.kind in ("scheme", "str", "num", "cmd"):
            self.i += 1
            if t.kind == "num" and self.at("sym", "/") and self.at("num", k=1):
                self.i += 2  # a fraction: \set Score.timeSignatureFraction = 2/2

    def skip_path(self) -> None:
        """Skip a context/grob/property path: Staff.NoteCollision #'prop, or Score.tempoHideNote."""
        if self.at("word"):
            self.i += 1
            while self.at("sym", ".") and self.at("word", k=1):
                self.i += 2
        while self.at("scheme"):
            self.i += 1

    # top level ----------------------------------------------------------------------------
    def parse_file(self) -> None:
        while self.peek() is not None:
            t = self.peek()
            if t.kind == "word" and self.at("sym", "=", 1):
                name = t.value
                self.i += 2
                self.assign(name)
            elif t.kind == "cmd" and t.value in _SKIP_BLOCK and self.at("sym", "{", 1):
                self.i += 1
                self.skip_braces()
            elif t.kind == "cmd" and t.value in ("version", "language"):
                self.i += 1
                v = self.expect("str")
                if t.value == "language":
                    self.set_language(v.value)
            elif t.kind == "cmd" and t.value in ("book", "bookpart"):
                self.i += 1
                self.expect("sym", "{")  # read its contents as top-level material
                self.toks = self.toks[:self.i] + self._unwrap_block()
            elif t.kind == "cmd" and t.value == "score":
                self.i += 1
                self.scores.append(self.parse_score())
            elif t.kind in ("scheme", "str", "num") or (t.kind == "sym" and t.value == "}"):
                self.i += 1
            elif t.kind == "cmd" and t.value in ("markup", "markuplist"):
                self.i += 1
                self.skip_markup()
            else:
                m = self.parse_music()
                if m is not None:
                    self.scores.append(m)

    def _unwrap_block(self) -> list[Tok]:
        """The tokens after a \\book { with its closing brace removed (top-level reading)."""
        depth, j = 1, self.i
        while j < len(self.toks):
            t = self.toks[j]
            if t.kind == "sym" and t.value == "{":
                depth += 1
            elif t.kind == "sym" and t.value == "}":
                depth -= 1
                if depth == 0:
                    return self.toks[self.i:j] + self.toks[j + 1:]
            j += 1
        return self.toks[self.i:]

    def assign(self, name: str) -> None:
        t = self.peek()
        if t is None:
            return
        if t.kind in ("str", "num", "scheme"):
            self.i += 1
            return
        if t.kind == "cmd" and t.value in ("markup", "markuplist"):
            self.i += 1
            self.skip_markup()
            return
        if t.kind == "cmd" and t.value in _SKIP_BLOCK:
            self.i += 1
            if self.at("sym", "{"):
                self.skip_braces()
            return
        music = self.parse_music()
        if music is not None:
            self.vars[name] = music

    def parse_score(self):
        self.expect("sym", "{")
        items = []
        while not self.at("sym", "}"):
            t = self.peek()
            if t is None:
                raise LilyError("unterminated \\score")
            if t.kind == "cmd" and t.value in _SKIP_BLOCK:
                self.i += 1
                if self.at("sym", "{"):
                    self.skip_braces()
                continue
            m = self.parse_music()
            if m is not None:
                items.append(m)
        self.i += 1
        return items[0] if len(items) == 1 else Seq(items)

    def set_language(self, lang: str) -> None:
        if lang not in LANGUAGES:
            raise LilyError(f"unsupported note-name language {lang!r}")
        self.names = LANGUAGES[lang]

    # durations and pitches ------------------------------------------------------------------
    def parse_duration(self, required: bool = False) -> F | None:
        t = self.peek()
        if t is not None and t.kind == "num" and t.value in _BASE:
            base = _BASE[t.value]
            self.i += 1
        elif t is not None and t.kind == "cmd" and t.value in _LONG:
            base = _LONG[t.value]
            self.i += 1
        else:
            if required:
                raise LilyError(f"line {t.line if t else '?'}: expected a duration")
            return None
        d, add = base, base
        while self.at("sym", ".") and not self.peek().space:
            self.i += 1
            add /= 2
            d += add
        while self.at("sym", "*") and self.at("num", k=1):
            self.i += 1
            num = int(self.next().value)
            den = 1
            if self.at("sym", "/") and self.at("num", k=1):
                self.i += 1
                den = int(self.next().value)
            d *= F(num, den)
        return d

    def parse_fraction(self) -> F:
        a = int(self.expect("num").value)
        self.expect("sym", "/")
        b = int(self.expect("num").value)
        return F(a, b)

    def is_pitch(self, t: Tok | None) -> bool:
        return t is not None and t.kind == "word" and t.value in self.names

    def parse_pitch(self) -> Pitch:
        """A pitch name with its octave marks (held in octave), and an optional ! or ?."""
        t = self.expect("word")
        if t.value not in self.names:
            raise LilyError(f"line {t.line}: {t.value!r} is not a pitch")
        step, alter = self.names[t.value]
        octave = 0
        # octave marks, even when a space separates them from the name ("dis ," in some editions):
        # LilyPond reads them with the note, and a lone ' or , has no other meaning in music
        while self.at("sym", "'") or self.at("sym", ","):
            octave += 1 if self.next().value == "'" else -1
        while (self.at("sym", "!") or self.at("sym", "?")) and not self.peek().space:
            self.i += 1
        if self.at("sym", "=") and not self.peek().space:  # octave check c='
            self.i += 1
            while self.at("sym", "'") or self.at("sym", ","):
                self.i += 1
        return Pitch(step, alter, octave)

    def parse_post_events(self, ev: Event | None, per_note: int | None = None) -> None:
        """Ties, articulations, markup and the like after a note; marks a \\rest."""
        while True:
            t = self.peek()
            if t is None:
                return
            if t.kind == "sym" and t.value == "~":
                self.i += 1
                if ev is not None:
                    if per_note is None:
                        ev.ties = [True] * len(ev.pitches)
                    else:
                        ev.ties[per_note] = True
            elif t.kind == "sym" and t.value in "[]()":
                self.i += 1
            elif t.kind == "artic":
                self.i += 1
            elif t.kind == "dir":
                self.i += 1
                u = self.peek()
                if u is None:
                    return
                if u.kind == "cmd" and u.value in ("markup", "markuplist"):
                    self.i += 1
                    self.skip_markup()
                elif u.kind == "cmd" and u.value == "tweak":
                    self.i += 1
                    self.skip_path()
                    self.skip_value()
                    if self.at("cmd"):
                        self.i += 1
                else:
                    self.i += 1
            elif t.kind == "cmd" and t.value == "rest":
                self.i += 1
                if ev is not None and ev.kind == "note":
                    ev.kind = "pitched-rest"  # its pitch still counts in \\relative
            elif t.kind == "cmd" and t.value in _POST:
                self.i += 1
            elif t.kind == "cmd" and t.value == "tweak":
                self.i += 1
                self.skip_path()
                self.skip_value()
            else:
                return

    def take_duration(self) -> F:
        d = self.parse_duration()
        if d is None:
            return self.last_dur
        self.last_dur = d
        return d

    def parse_note(self) -> Event:
        line = self.peek().line
        p = self.parse_pitch()
        ev = Event("note", [p], [False], self.take_duration(), line)
        self.parse_post_events(ev)
        return ev

    def parse_chord(self) -> Event:
        line = self.expect("sym", "<").line
        ev = Event("chord", [], [], F(0), line)
        while not self.at("sym", ">"):
            t = self.peek()
            if t is None:
                raise LilyError(f"line {line}: unterminated chord")
            if self.is_pitch(t):
                ev.pitches.append(self.parse_pitch())
                ev.ties.append(False)
                self.parse_post_events(ev, len(ev.pitches) - 1)
            elif t.kind == "cmd" and t.value == "tweak":
                self.i += 1
                self.skip_path()
                self.skip_value()
            else:
                self.i += 1
        self.i += 1
        ev.dur = self.take_duration()
        self.parse_post_events(ev)
        if not ev.pitches:
            ev.kind = "skip"  # <>: an empty chord, a place for post-events
            ev.dur = F(0)
        return ev

    # music --------------------------------------------------------------------------------
    def parse_seq_items(self, close: str) -> list:
        items: list = []
        while not self.at("sym", close):
            if self.peek() is None:
                raise LilyError(f"missing {close!r}")
            if self.at("sym", "~"):  # a tie written apart from its note
                self.i += 1
                for x in reversed(items):
                    if isinstance(x, Event):
                        x.ties = [True] * len(x.pitches)
                        break
                continue
            m = self.parse_music()
            if m is not None:
                items.append(m)
        self.i += 1
        return items

    def parse_sim(self) -> Sim:
        self.expect("sym", "<<")
        parts: list[list] = [[]]
        while not self.at("sym", ">>"):
            if self.peek() is None:
                raise LilyError("missing '>>'")
            if self.at("sym", "\\\\"):
                self.i += 1
                parts.append([])
                continue
            m = self.parse_music()
            if m is not None:
                parts[-1].append(m)
        self.i += 1
        if len(parts) > 1:
            return Sim(parts, True)
        return Sim(parts[0], False)

    def parse_music(self):
        """One music expression, or None for something that is not music (a command, a comment)."""
        t = self.peek()
        if t is None:
            raise LilyError("unexpected end of input")
        k, v = t.kind, t.value
        if k == "sym":
            if v == "{":
                self.i += 1
                return Seq(self.parse_seq_items("}"))
            if v == "<<":
                return self.parse_sim()
            if v == "<":
                return self.parse_chord()
            self.i += 1
            if v in "|~[]()'.,!?=:":
                return None
            raise LilyError(f"line {t.line}: unexpected {v!r}")
        if k == "word":
            if v in self.names:
                return self.parse_note()
            if v in ("r", "R", "s"):
                self.i += 1
                ev = Event({"r": "rest", "R": "mmrest", "s": "skip"}[v], [], [], self.take_duration(), t.line)
                self.parse_post_events(ev)
                return ev
            if v == "q":
                self.i += 1
                ev = Event("repeat-chord", [], [], self.take_duration(), t.line)
                self.parse_post_events(ev)
                return ev
            self.i += 1
            self.warn(f"line {t.line}: unknown word {v!r} skipped")
            return None
        if k in ("artic", "dir"):
            self.parse_post_events(None)
            return None
        if k in ("scheme", "str", "num"):
            self.i += 1
            return None
        return self.parse_command()

    def parse_command(self):
        t = self.next()
        c = t.value
        if c in self.vars:
            return copy.deepcopy(self.vars[c])
        if c == "relative":
            ref = Pitch(3, 0, 0)  # f: the first note is as written, in absolute octaves
            if self.is_pitch(self.peek()):
                ref = self.parse_pitch()
            body = self.parse_music()
            _make_relative(body, ref)
            return Fixed(body)
        if c == "fixed":
            ref = self.parse_pitch()
            body = self.parse_music()

            def shift(p: Pitch) -> None:
                p.octave += ref.octave
            _walk_pitches(body, shift)
            return Fixed(body)
        if c == "absolute":
            return Fixed(self.parse_music())
        if c == "transpose":
            a, b = self.parse_pitch(), self.parse_pitch()
            body = self.parse_music()
            ds, dm = b.steps() - a.steps(), b.semitones() - a.semitones()

            def tr(p: Pitch) -> None:
                q = p.transposed(ds, dm)
                p.step, p.alter, p.octave = q.step, q.alter, q.octave
            _walk_pitches(body, tr)
            return Fixed(body)
        if c == "modalTranspose":
            a, b = self.parse_pitch(), self.parse_pitch()
            scale = self.parse_music()
            body = self.parse_music()
            self._modal_transpose(a, b, scale, body, t.line)
            return Fixed(body)
        if c == "repeat":
            kind = self.expect("word").value
            count = int(self.expect("num").value)
            body = self.parse_music()
            alts = []
            if self.at("cmd", "alternative"):
                self.i += 1
                self.expect("sym", "{")
                alts = self.parse_seq_items("}")
                self.warn(f"line {t.line}: \\repeat {kind} {count} with {len(alts)} alternatives, unfolded")
            return Repeat(kind, count, body, alts)
        if c == "alternative":
            self.warn(f"line {t.line}: \\alternative without \\repeat ignored")
            if self.at("sym", "{"):
                self.skip_braces()
            return None
        if c in ("times", "scaleDurations"):
            f = self.parse_fraction()
            return Scale(f, self.parse_music())
        if c == "tuplet":
            f = self.parse_fraction()
            self.parse_duration()  # the span of each bracket, for engraving only
            return Scale(1 / f, self.parse_music())
        if c in ("grace", "acciaccatura", "appoggiatura", "slashedGrace"):
            return Grace(self.parse_music())
        if c == "afterGrace":
            if self.at("num") and self.at("sym", "/", 1):
                self.parse_fraction()
            main = self.parse_music()
            return AfterGrace(main, self.parse_music())
        if c in ("new", "context"):
            ctype = self.expect("word").value
            name = None
            if self.at("sym", "="):
                self.i += 1
                name = self.next().value
            while self.at("cmd", "with"):
                self.i += 1
                if self.at("sym", "{"):
                    self.skip_braces()
                else:
                    self.i += 1
            return Context(ctype, name, self.parse_music(), c == "new")
        if c == "change":
            ctype = self.expect("word").value
            self.expect("sym", "=")
            return Change(ctype, self.next().value)
        if c == "time":
            nums = [int(self.expect("num").value)]
            while self.at("sym", ","):
                self.i += 1
                nums.append(int(self.expect("num").value))
            self.expect("sym", "/")
            den = int(self.expect("num").value)
            return Time(F(sum(nums), den), f"{'+'.join(map(str, nums))}/{den}")
        if c == "partial":
            return Partial(self.parse_duration(required=True))
        if c == "skip":
            d = self.parse_duration()
            if d is None:  # \skip music (LilyPond 2.24): not supported
                self.parse_music()
                self.warn(f"line {t.line}: \\skip with a music argument ignored")
                return None
            self.last_dur = d
            return Event("skip", [], [], d, t.line)
        if c == "key":
            if self.is_pitch(self.peek()):
                self.parse_pitch()
            if self.at("cmd"):
                self.i += 1
            return None
        if c == "clef":
            if self.at("str"):
                self.i += 1
            elif self.at("word"):
                self.i += 1
                while self.at("artic") and not self.peek().space:
                    self.i += 1
            return None
        if c in ("bar", "language", "version"):
            v = self.expect("str")
            if c == "language":
                self.set_language(v.value)
            return None
        if c == "tempo":
            if self.at("str"):
                self.i += 1
            elif self.at("cmd", "markup"):
                self.i += 1
                self.skip_markup()
            if self.at("num") and self.parse_duration() is not None:
                self.expect("sym", "=")
                self.expect("num")
                if self.at("artic") and self.peek().value.startswith("-"):
                    self.i += 1  # 60-70
                elif self.at("sym", "-"):
                    self.i += 2
            return None
        if c in ("set", "override"):
            while not self.at("sym", "="):
                if self.peek() is None:
                    raise LilyError(f"line {t.line}: \\{c} without '='")
                self.i += 1
            self.i += 1
            self.skip_value()
            return None
        if c in ("revert", "unset", "omit", "hide", "undo", "accidentalStyle"):
            if self.at("str"):
                self.i += 1
            else:
                self.skip_path()
            return None
        if c == "tweak":
            self.skip_path()
            self.skip_value()
            return None
        if c == "shape":
            self.skip_value()
            self.skip_path()
            return None
        if c in ("markup", "markuplist"):
            self.skip_markup()
            return None
        if c == "mark":
            self.skip_value()
            return None
        if c in _SKIP_BLOCK:
            if self.at("sym", "{"):
                self.skip_braces()
            return None
        if c in _SKIP_MODE:
            while self.at("str"):
                self.i += 1
            if self.at("sym", "{"):
                self.skip_braces()
            return None
        if c == "lyricsto":
            self.next()
            if self.at("sym", "{"):
                self.skip_braces()
            return None
        if c == "score":
            return self.parse_score()
        if c == "include":
            self.next()
            return None
        if c == "rest":
            return None
        # A command without arguments (\stemUp, \voiceOne, \break...): nothing to play.
        return None

    def _modal_transpose(self, a: Pitch, b: Pitch, scale, body, line: int) -> None:
        """\\modalTranspose: move each note by as many degrees of the scale as a is from b."""
        degrees: list[Pitch] = []
        _walk_pitches(scale, degrees.append)
        letters = [(p.step, p.alter) for p in degrees]
        if len(letters) != 7 or len({s for s, _ in letters}) != 7:
            raise LilyError(f"line {line}: \\modalTranspose needs a scale of seven letters")
        by_step = {s: alt for s, alt in letters}
        for q in (a, b):
            if by_step[q.step] != q.alter:
                raise LilyError(f"line {line}: \\modalTranspose: {q.name()} not in the scale")
        shift = b.steps() - a.steps()

        def mt(p: Pitch) -> None:
            if by_step[p.step] != p.alter:
                raise LilyError(f"line {line}: \\modalTranspose: {p.name()} not in the scale")
            p.octave, p.step = divmod(p.steps() + shift, 7)
            p.alter = by_step[p.step]
        _walk_pitches(body, mt)


# --------------------------------------------------------------------------------------------
# Playing the tree: times, voices, staves, ties
# --------------------------------------------------------------------------------------------

@dataclass
class LyScore:
    """What read() returns. Onsets and durations are Fractions of a whole note."""
    path: str
    notes: list[dict]
    time_signatures: list[dict]   # {onset, measure_length, text}
    partial: F | None             # the length of the anacrusis, if any
    measures: list[dict]          # {number, onset}
    length: F
    staves: list[str]             # staff names as written, in order of first appearance
    warnings: list[str] = field(default_factory=list)


class _Player:
    _IGNORED_CONTEXTS = {"Lyrics", "ChordNames", "FiguredBass", "Dynamics", "NoteNames",
                         "FretBoards", "TabStaff", "TabVoice", "DrumStaff", "DrumVoice"}
    _STAFF_CONTEXTS = {"Staff", "RhythmicStaff"}
    _GROUP_CONTEXTS = {"PianoStaff", "GrandStaff", "StaffGroup", "ChoirStaff", "Score"}

    def __init__(self):
        self.notes: list[dict] = []
        self.pending: dict[tuple, dict] = {}      # (voice, midi) -> tied note
        self.pending_part: dict[tuple, dict] = {}  # (part, midi) -> tied note
        self.voice_staff: dict[str, str] = {}      # voice -> staff it is printed on
        self.times: list[tuple[F, F, str]] = []
        self.partial: F | None = None
        self.staves: list[str] = []
        self.anon = 0
        self.last_chord: list[Pitch] = []
        self.warnings: list[str] = []

    def staff_of(self, ctx: dict) -> str:
        return self.voice_staff.get(ctx["voice"], ctx["part"])

    def play(self, node, t: F, ctx: dict) -> F:
        if node is None:
            return t
        if isinstance(node, Event):
            return self.event(node, t, ctx)
        if isinstance(node, Seq):
            for x in node.items:
                t = self.play(x, t, ctx)
            return t
        if isinstance(node, Sim):
            end = t
            if node.voiced:
                for i, part in enumerate(node.parts):
                    vid = f"{ctx['part']}:{i + 1}"
                    self.voice_staff[vid] = self.staff_of(ctx)
                    sub = dict(ctx, voice=vid)
                    for x in part:
                        end = max(end, self.play(x, t, sub))
            else:
                for x in node.parts:
                    end = max(end, self.play(x, t, ctx))
            return end
        if isinstance(node, Fixed):
            return self.play(node.body, t, ctx)
        if isinstance(node, Repeat):
            n = max(node.count, 1)
            alts = node.alts
            for k in range(n):
                t = self.play(node.body, t, ctx)
                if alts:
                    t = self.play(alts[max(0, k - (n - len(alts)))], t, ctx)
            return t
        if isinstance(node, Scale):
            return self.play(node.body, t, dict(ctx, factor=ctx["factor"] * node.factor))
        if isinstance(node, Grace):
            self.play(node.body, t, dict(ctx, grace=True))
            return t
        if isinstance(node, AfterGrace):
            end = self.play(node.main, t, ctx)
            self.play(node.grace, end, dict(ctx, grace=True))
            return end
        if isinstance(node, Context):
            return self.context(node, t, ctx)
        if isinstance(node, Change):
            if node.type in self._STAFF_CONTEXTS:
                self.voice_staff[ctx["voice"]] = node.name
                if node.name not in self.staves:
                    self.staves.append(node.name)
            return t
        if isinstance(node, Time):
            self.times.append((t, node.measure, node.text))
            return t
        if isinstance(node, Partial):
            if t == 0:
                self.partial = node.dur
            else:
                self.warnings.append(f"\\partial at {t} ignored")
            return t
        raise LilyError(f"cannot play {type(node).__name__}")

    def context(self, node: Context, t: F, ctx: dict) -> F:
        if node.type in self._IGNORED_CONTEXTS:
            return t
        if node.type in self._STAFF_CONTEXTS:
            name = node.name
            if name is None:
                self.anon += 1
                name = f"staff{self.anon}"
            if name not in self.staves:
                self.staves.append(name)
            self.voice_staff.setdefault(name, name)
            return self.play(node.body, t, dict(ctx, part=name, voice=name))
        if node.type == "Voice" or node.type == "Bottom":
            name = node.name
            if name is None:
                self.anon += 1
                name = f"{ctx['part']}/v{self.anon}"
            elif name.isdigit():
                name = f"{ctx['part']}:{name}"
            if node.new or name not in self.voice_staff:
                self.voice_staff[name] = self.staff_of(ctx)
            return self.play(node.body, t, dict(ctx, voice=name))
        return self.play(node.body, t, ctx)

    def event(self, ev: Event, t: F, ctx: dict) -> F:
        dur = ev.dur * ctx["factor"]
        if ev.kind in ("rest", "pitched-rest", "skip", "mmrest"):
            return t if ctx["grace"] else t + dur
        pitches = ev.pitches
        ties = ev.ties
        if ev.kind == "repeat-chord":
            pitches = self.last_chord
            ties = ev.ties or [False] * len(pitches)
            if len(ties) != len(pitches):
                ties = [ties[0]] * len(pitches)
        elif ev.kind == "chord":
            self.last_chord = pitches
        if ctx["grace"]:
            for p in pitches:
                self.notes.append(self.note(p, t, F(0), ctx, grace=True))
            return t
        for p, tied in zip(pitches, ties):
            m = p.midi()
            key, pkey = (ctx["voice"], m), (ctx["part"], m)
            prev = self.pending.get(key)
            if prev is None or prev["onset"] + prev["duration"] != t:
                prev = self.pending_part.get(pkey)
                if prev is not None and prev["onset"] + prev["duration"] != t:
                    prev = None
            if prev is not None:
                prev["duration"] += dur
                for d in (self.pending, self.pending_part):
                    for k2 in [k2 for k2, v in d.items() if v is prev]:
                        del d[k2]
                if tied:
                    self.pending[key] = prev
                    self.pending_part[pkey] = prev
                continue
            n = self.note(p, t, dur, ctx, grace=False)
            self.notes.append(n)
            if tied:
                self.pending[key] = n
                self.pending_part[pkey] = n
        return t + dur

    def note(self, p: Pitch, t: F, dur: F, ctx: dict, grace: bool) -> dict:
        return {"onset": t, "duration": dur, "pitch": p.name(), "midi": p.midi(), "measure": 0,
                "staff": self.staff_of(ctx), "part": ctx["part"], "voice": ctx["voice"],
                "grace": grace}


def _bars(times: list[tuple[F, F, str]], partial: F | None, length: F) -> list[dict]:
    """The bars' starts: {number, onset}; an anacrusis is bar 0."""
    sigs: dict[F, tuple[F, str]] = {}
    for onset, meas, text in times:
        sigs.setdefault(onset, (meas, text))
    if F(0) not in sigs:
        sigs[F(0)] = (F(1), "4/4")
    changes = sorted(sigs.items())
    bars = []
    t, number = F(0), 1
    if partial:
        bars.append({"number": 0, "onset": F(0)})
        t = partial
    k = 0
    while t < length or not bars:
        while k + 1 < len(changes) and changes[k + 1][0] <= t:
            k += 1
        bars.append({"number": number, "onset": t})
        nxt = t + changes[k][1][0]
        if k + 1 < len(changes) and changes[k + 1][0] < nxt:
            nxt = changes[k + 1][0]  # a time signature in mid-bar starts a new bar
        t, number = nxt, number + 1
    return bars


def parse(text: str, path: str = "<string>", base_dir: Path | None = None, score: int = 0) -> LyScore:
    """Read LilyPond source text; base_dir is where \\include looks. score picks a \\score."""
    p = Parser(lex(text, base_dir))
    p.parse_file()
    if not p.scores:
        raise LilyError(f"{path}: no music")
    if len(p.scores) > 1:
        p.warn(f"{len(p.scores)} scores in the file; reading number {score}")
    player = _Player()
    ctx = {"part": "", "voice": "", "factor": F(1), "grace": False}
    length = player.play(p.scores[score], F(0), ctx)

    # Two staves (a piano score): "upper" and "lower".
    sounding = [s for s in player.staves if any(n["staff"] == s or n["part"] == s for n in player.notes)]
    rename = {}
    if len(sounding) == 2:
        rename = {sounding[0]: "upper", sounding[1]: "lower"}

    def ren(x: str) -> str:
        if x in rename:
            return rename[x]
        for old, new in rename.items():
            if x.startswith(old + ":") or x.startswith(old + "/"):
                return new + x[len(old):]
        return x

    bars = _bars(player.times, player.partial, length)
    starts = [b["onset"] for b in bars]
    for n in player.notes:
        n["staff"], n["part"], n["voice"] = ren(n["staff"]), ren(n["part"]), ren(n["voice"])
        n["measure"] = bars[bisect.bisect_right(starts, n["onset"]) - 1]["number"]
    player.notes.sort(key=lambda n: (n["onset"], n["staff"] != "upper", -n["midi"], n["voice"]))
    sigs = []
    for onset, meas, text in sorted(set(player.times), key=lambda x: x[0]):
        if not sigs or sigs[-1]["onset"] != onset:
            sigs.append({"onset": onset, "measure_length": meas, "text": text})
    return LyScore(path, player.notes, sigs, player.partial, bars, length, player.staves,
                   p.warnings + player.warnings)


def read(path: str | Path, score: int = 0) -> LyScore:
    """Read a .ly file (and the files it \\includes from its folder)."""
    path = Path(path)
    return parse(path.read_text(encoding="utf-8", errors="replace"), str(path), path.parent, score)


def notes(path: str | Path, score: int = 0) -> list[dict]:
    """The notes of a .ly file, in order of onset (see the module docstring for the fields)."""
    return read(path, score).notes


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: lily.py FILE.ly")
    s = read(sys.argv[1])
    for w in s.warnings:
        print("warning:", w, file=sys.stderr)
    for n in s.notes:
        print(json.dumps({k: (str(v) if isinstance(v, F) else v) for k, v in n.items()}))

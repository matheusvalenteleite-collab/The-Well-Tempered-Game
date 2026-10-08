"""Minimal, faithful MusicXML (partwise) reader for the Fux dataset (standard library only).

It reads .mxl containers (ZIP: META-INF/container.xml -> rootfile) or plain .musicxml/.xml.
It keeps every piece of notation information that occurs in the material or that the game
may want later: rests, ties (both <tie> and <tied>), displayed accidentals (including
editorial/cautionary/parenthesised flags), dots, grace notes, fermatas, lyrics, direction
words, clefs, keys, meters and the raw <duration>/<divisions> values.

Nothing here interprets the music; it only reports what the file encodes.
"""
from __future__ import annotations

import posixpath
import xml.etree.ElementTree as ET
import zipfile
from dataclasses import dataclass, field
from fractions import Fraction
from pathlib import Path

from pitch import Pitch

CLEF_NAMES = {
    ("G", 2, 0): "treble",
    ("G", 2, -1): "treble_8vb",
    ("G", 2, 1): "treble_8va",
    ("F", 4, 0): "bass",
    ("C", 1, 0): "soprano",
    ("C", 2, 0): "mezzo_soprano",
    ("C", 3, 0): "alto",
    ("C", 4, 0): "tenor",
    ("C", 5, 0): "baritone_c",
    ("F", 3, 0): "baritone_f",
}


@dataclass
class Clef:
    sign: str
    line: int
    octave_change: int = 0

    @property
    def name(self) -> str:
        return CLEF_NAMES.get((self.sign, self.line, self.octave_change), f"{self.sign}{self.line}{self.octave_change:+d}")

    def to_json(self) -> dict:
        return {"sign": self.sign, "line": self.line, "octave_change": self.octave_change, "name": self.name}


@dataclass
class XNote:
    measure: str
    offset: Fraction  # from start of the whole file, in whole notes
    measure_offset: Fraction  # from start of measure, in whole notes
    duration: Fraction  # in whole notes (0 for grace notes)
    pitch: Pitch | None  # None for rests
    raw_duration: int | None
    divisions: int
    note_type: str | None
    dots: int
    tie: list[str]  # from <tie type=...>
    tied: list[str]  # from <notations><tied type=...>
    accidental: dict | None  # displayed accidental element, if any
    grace: bool
    fermata: bool
    chord: bool
    voice: str | None
    lyrics: list[str]
    articulations: list[str] = field(default_factory=list)

    @property
    def is_rest(self) -> bool:
        return self.pitch is None

    def tie_state(self) -> str | None:
        kinds = set(self.tie) | set(self.tied)
        if {"start", "stop"} <= kinds or "continue" in kinds:
            return "continue"
        if "start" in kinds:
            return "start"
        if "stop" in kinds:
            return "stop"
        return None


@dataclass
class XMeasure:
    number: str
    offset: Fraction
    duration: Fraction
    notes: list[XNote]
    words: list[str]
    clef: Clef | None  # clef change at start of this measure, if any
    key_fifths: int | None
    time: tuple[int, int] | None
    divisions: int


@dataclass
class XPart:
    id: str
    name: str
    measures: list[XMeasure]


@dataclass
class XScore:
    path: str
    member: str | None  # path inside the .mxl container
    title: str | None
    rights: str | None
    software: list[str]
    encoding_date: str | None
    parts: list[XPart]


def _read_xml_bytes(path: Path) -> tuple[bytes, str | None]:
    if path.suffix.lower() == ".mxl":
        with zipfile.ZipFile(path) as z:
            container = ET.fromstring(z.read("META-INF/container.xml"))
            rootfile = container.find(".//{*}rootfile")
            if rootfile is None:
                raise ValueError(f"{path}: META-INF/container.xml has no rootfile")
            member = rootfile.get("full-path")
            if not member or posixpath.isabs(member) or ".." in member.split("/"):
                raise ValueError(f"{path}: suspicious rootfile path {member!r}")
            return z.read(member), member
    return path.read_bytes(), None


def _text(el: ET.Element | None) -> str | None:
    return el.text.strip() if el is not None and el.text is not None else None


def read_score(path: str | Path) -> XScore:
    path = Path(path)
    data, member = _read_xml_bytes(path)
    root = ET.fromstring(data)
    if root.tag != "score-partwise":
        raise ValueError(f"{path}: expected score-partwise, got {root.tag}")

    names = {sp.get("id"): (_text(sp.find("part-name")) or "") for sp in root.iter("score-part")}
    parts = [_read_part(p, names.get(p.get("id"), "")) for p in root.findall("part")]
    ident = root.find("identification")
    return XScore(
        path=str(path),
        member=member,
        title=_text(root.find("work/work-title")) or _text(root.find("movement-title")),
        rights=_text(ident.find("rights")) if ident is not None else None,
        software=[s.text for s in root.iter("software") if s.text],
        encoding_date=_text(root.find("identification/encoding/encoding-date")),
        parts=parts,
    )


def _read_part(part_el: ET.Element, name: str) -> XPart:
    divisions = None
    cursor = Fraction(0)
    measures: list[XMeasure] = []
    for m in part_el.findall("measure"):
        m_start = cursor
        pos = Fraction(0)  # position within the measure, whole notes
        max_pos = Fraction(0)
        notes: list[XNote] = []
        words: list[str] = []
        clef = None
        key = None
        time = None
        last_onset = Fraction(0)
        for el in m:
            if el.tag == "attributes":
                d = el.find("divisions")
                if d is not None:
                    divisions = int(d.text)
                c = el.find("clef")
                if c is not None:
                    clef = Clef(c.findtext("sign"), int(c.findtext("line") or 0), int(c.findtext("clef-octave-change") or 0))
                k = el.find("key/fifths")
                if k is not None:
                    key = int(k.text)
                t = el.find("time")
                if t is not None:
                    time = (int(t.findtext("beats")), int(t.findtext("beat-type")))
            elif el.tag == "direction":
                words += [w.text.strip() for w in el.iter("words") if w.text and w.text.strip()]
            elif el.tag in ("backup", "forward"):
                amount = Fraction(int(el.findtext("duration")), divisions * 4)
                pos += -amount if el.tag == "backup" else amount
                max_pos = max(max_pos, pos)
            elif el.tag == "note":
                if divisions is None:
                    raise ValueError(f"measure {m.get('number')}: note before <divisions>")
                n = _read_note(el, divisions)
                onset = last_onset if n["chord"] else pos
                xn = XNote(measure=m.get("number"), offset=m_start + onset, measure_offset=onset, **n)
                notes.append(xn)
                if not n["chord"]:
                    last_onset = pos
                    pos += xn.duration
                    max_pos = max(max_pos, pos)
        measures.append(XMeasure(m.get("number"), m_start, max_pos, notes, words, clef, key, time, divisions))
        cursor += max_pos
    return XPart(part_el.get("id"), name, measures)


def _read_note(el: ET.Element, divisions: int) -> dict:
    grace = el.find("grace") is not None
    raw = el.findtext("duration")
    raw_duration = int(raw) if raw is not None else None
    duration = Fraction(0) if grace or raw_duration is None else Fraction(raw_duration, divisions * 4)
    p = el.find("pitch")
    pitch = None
    if p is not None:
        alter = p.findtext("alter")
        alter_f = Fraction(alter) if alter else Fraction(0)
        if alter_f.denominator != 1:
            raise ValueError(f"microtonal alter {alter} not supported")
        pitch = Pitch(p.findtext("step"), int(alter_f), int(p.findtext("octave")))
    elif el.find("rest") is None and el.find("unpitched") is not None:
        raise ValueError("unpitched notes not supported")
    acc_el = el.find("accidental")
    accidental = None
    if acc_el is not None:
        accidental = {"value": acc_el.text}
        for attr in ("editorial", "cautionary", "parentheses", "bracket"):
            if acc_el.get(attr) is not None:
                accidental[attr] = acc_el.get(attr) == "yes"
    notations = el.find("notations")
    return dict(
        duration=duration,
        pitch=pitch,
        raw_duration=raw_duration,
        divisions=divisions,
        note_type=el.findtext("type"),
        dots=len(el.findall("dot")),
        tie=[t.get("type") for t in el.findall("tie")],
        tied=[t.get("type") for t in notations.findall("tied")] if notations is not None else [],
        accidental=accidental,
        grace=grace,
        fermata=notations is not None and notations.find("fermata") is not None,
        chord=el.find("chord") is not None,
        voice=el.findtext("voice"),
        lyrics=[t.text for t in el.findall("lyric/text") if t.text is not None],
        articulations=[a.tag for a in notations.findall("articulations/*")] if notations is not None else [],
    )

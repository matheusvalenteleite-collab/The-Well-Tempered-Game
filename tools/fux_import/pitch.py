"""Pitch, duration and interval helpers (standard library only).

Pitches are kept as spelled pitches (step + alter + octave) throughout; MIDI numbers
are derived, never the other way round, so no enharmonic information is lost.
"""
from __future__ import annotations

from dataclasses import dataclass
from fractions import Fraction

STEPS = "CDEFGAB"
STEP_SEMITONES = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
ALTER_TO_SUFFIX = {-2: "bb", -1: "b", 0: "", 1: "#", 2: "##"}


@dataclass(frozen=True)
class Pitch:
    step: str  # "C".."B"
    alter: int  # -2..2
    octave: int  # scientific pitch notation octave (C4 = middle C)

    @property
    def name(self) -> str:
        """Scientific pitch notation, e.g. 'Bb3', 'F#4'."""
        return f"{self.step}{ALTER_TO_SUFFIX[self.alter]}{self.octave}"

    @property
    def midi(self) -> int:
        return 12 * (self.octave + 1) + STEP_SEMITONES[self.step] + self.alter

    @property
    def diatonic(self) -> int:
        """Diatonic step index (C0 = 0), used for generic interval sizes."""
        return 7 * self.octave + STEPS.index(self.step)


def parse_pitch_name(name: str) -> Pitch:
    step, rest = name[0], name[1:]
    alter = 0
    while rest and rest[0] in "#b":
        alter += 1 if rest[0] == "#" else -1
        rest = rest[1:]
    return Pitch(step, alter, int(rest))


def frac(x: Fraction) -> str:
    """Serialize a duration/offset (in whole notes) as 'n/d'."""
    x = Fraction(x)
    return f"{x.numerator}/{x.denominator}"


# Perfect-type generic intervals (reduced to within the octave, 0-based: unison=0, 4th=3, 5th=4).
_PERFECT_CLASSES = {0, 3, 4}
# Semitones of the perfect/major form of each simple generic interval (0-based).
_REFERENCE_SEMITONES = [0, 2, 4, 5, 7, 9, 11]


def interval_name(lower: Pitch, upper: Pitch) -> str:
    """Name the interval from `lower` to `upper` (upper must not be diatonically below lower).

    Returns names in the same style as the source annotations: quality + generic number,
    with compound intervals kept compound (P12, M10, ...). Qualities: P M m A d (AA/dd for
    doubly altered).
    """
    steps = upper.diatonic - lower.diatonic
    semis = upper.midi - lower.midi
    if steps < 0:
        raise ValueError(f"{upper.name} is below {lower.name}")
    octaves, simple = divmod(steps, 7)
    deviation = semis - 12 * octaves - _REFERENCE_SEMITONES[simple]
    if simple in _PERFECT_CLASSES:
        quality = {0: "P", 1: "A", 2: "AA", -1: "d", -2: "dd"}.get(deviation)
    else:
        quality = {0: "M", -1: "m", 1: "A", 2: "AA", -2: "d", -3: "dd"}.get(deviation)
    if quality is None:
        raise ValueError(f"unnameable interval {lower.name}->{upper.name}")
    return f"{quality}{steps + 1}"


def ordered_interval(a: Pitch, b: Pitch) -> tuple[str, str]:
    """Interval between two pitches regardless of order, plus which one is on top.

    Returns (interval_name, 'a_above' | 'b_above' | 'unison').
    """
    if (a.diatonic, a.midi) == (b.diatonic, b.midi):
        return interval_name(a, b), "unison"
    if a.diatonic > b.diatonic or (a.diatonic == b.diatonic and a.midi > b.midi):
        return interval_name(b, a), "a_above"
    return interval_name(a, b), "b_above"

"""Fundamental chords and dissonance after Kirnberger (shared by the chorale analyses).

Kirnberger (Die Kunst des reinen Satzes, 1771-79; with J. A. P. Schulz, Die wahren Grundsaetze zum
Gebrauche der Harmonie, 1773) reduces harmony to two fundamental chords, the triad and the
seventh chord, each standing on a fundamental bass (Grundbass), and divides dissonances into
essential ones, which belong to the chord (the seventh of the seventh chord), and incidental ones,
which stand in the place of a consonance (suspensions, passing notes). This module applies those
distinctions to four-part sonorities. The tests are operational readings of the distinctions; the
names and the tests are to be checked against Kirnberger's text (docs/chorales/KIRNBERGER.md), which
could not be consulted when this was written.

Pitches are spelled names ("F#4"); the reading is by letters (generic intervals) first, so that the
spelling decides, as in a thoroughbass: C-E-G is a triad, C-Fb-G is not.
"""
from __future__ import annotations

from dataclasses import dataclass
from itertools import combinations

STEPS = "CDEFGAB"
PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def parse(name: str) -> tuple[str, int, int]:
    step, rest = name[0], name[1:]
    alter = 0
    while rest and rest[0] in "#b":
        alter += 1 if rest[0] == "#" else -1
        rest = rest[1:]
    return step, alter, int(rest)


def diatonic(name: str) -> int:
    s, _, o = parse(name)
    return 7 * o + STEPS.index(s)


def midi(name: str) -> int:
    s, a, o = parse(name)
    return 12 * (o + 1) + PC[s] + a


@dataclass
class Chord:
    root: str  # spelled pitch class of the fundamental bass, e.g. "F#"
    kind: str  # major / minor / diminished / augmented triad; dominant / minor / half-diminished / diminished / major seventh
    seventh: bool
    members: dict  # voice -> "root" / "third" / "fifth" / "seventh"
    complete: bool  # third present (and fifth, for a triad: an omitted fifth is common and allowed)


TRIADS = {(4, 7): "major", (3, 7): "minor", (3, 6): "diminished", (4, 8): "augmented", (4, None): "major", (3, None): "minor"}
SEVENTHS = {(4, 7, 10): "dominant seventh", (3, 7, 10): "minor seventh", (3, 6, 10): "half-diminished seventh",
            (3, 6, 9): "diminished seventh", (4, 7, 11): "major seventh", (3, 7, 11): "minor-major seventh",
            (4, None, 10): "dominant seventh", (3, None, 10): "minor seventh", (4, None, 11): "major seventh"}
ROLE = {0: "root", 2: "third", 4: "fifth", 6: "seventh"}


def fundamental(notes: dict[str, str]) -> Chord | None:
    """The fundamental chord of a sonority {voice: pitch}, or None when the notes do not stand in
    thirds above one of them (an incidental dissonance is present)."""
    if not notes:
        return None
    steps = {v: parse(p)[0] for v, p in notes.items()}
    pcs = {v: (PC[parse(p)[0]] + parse(p)[1]) % 12 for v, p in notes.items()}
    found = []
    for rv, rstep in set((v, s) for v, s in steps.items()):
        r = STEPS.index(rstep)
        roles = {}
        ok = True
        for v, s in steps.items():
            g = (STEPS.index(s) - r) % 7
            if g not in ROLE:
                ok = False
                break
            roles[v] = ROLE[g]
        if not ok:
            continue
        rpc = pcs[rv]
        by_role = {}
        for v, role in roles.items():
            by_role.setdefault(role, set()).add((pcs[v] - rpc) % 12)
        if any(len(x) > 1 for x in by_role.values()):
            continue  # a chromatic clash (C and C# together): not one chord
        third = next(iter(by_role["third"])) if "third" in by_role else None
        fifth = next(iter(by_role["fifth"])) if "fifth" in by_role else None
        sev = next(iter(by_role["seventh"])) if "seventh" in by_role else None
        if third is None:
            # No third: root and fifth (a third replaced by a suspended fourth, or an open
            # sonority), or root, fifth and seventh (7/5/4: the third suspended). Incomplete.
            if sev is not None:
                kind = {10: "seventh chord, third not sounding (minor seventh)", 11: "seventh chord, third not sounding (major seventh)", 9: "seventh chord, third not sounding (diminished seventh)"}.get(sev)
                if kind is None or fifth not in (None, 6, 7):
                    continue
                kind, complete = kind, False
            else:
                kind, complete = ("triad, third not sounding" if fifth == 7 else "bare"), False
        elif sev is not None:
            kind = SEVENTHS.get((third, fifth, sev))
            if kind is None:
                continue
            complete = True
        else:
            kind = TRIADS.get((third, fifth))
            if kind is None:
                continue
            complete = True
        root_name = rstep + ("#" * ((pcs[rv] - PC[rstep]) % 12) if (pcs[rv] - PC[rstep]) % 12 < 6 else "b" * (12 - (pcs[rv] - PC[rstep]) % 12))
        found.append(Chord(root_name, kind, sev is not None, roles, complete))
    if not found:
        return None
    # prefer complete chords, then triads to sevenths (fewer dissonances), then the bass as root
    found.sort(key=lambda c: (not c.complete, c.seventh, c.members.get("bass") != "root"))
    return found[0]


def shape(prev: str | None, cur: str, nxt: str | None, held: bool) -> str:
    """The melodic shape of a note at a sonority: how the voice comes to it and leaves it."""
    d_in = None if prev is None else diatonic(cur) - diatonic(prev)
    d_out = None if nxt is None else diatonic(nxt) - diatonic(cur)
    if (held or d_in == 0) and d_out == -1:
        return "suspension"  # Vorhalt: prepared (held or struck again), resolving down by step
    if (held or d_in == 0) and d_out == 1:
        return "retardation"  # resolving up by step (the leading tone held)
    if d_in in (-1, 1) and d_out == d_in:
        return "passing"
    if d_in in (-1, 1) and d_out == -d_in:
        return "neighbour"
    if d_in in (-1, 1) and d_out == 0:
        return "anticipation"
    if d_in is not None and abs(d_in) > 1 and d_out in (-1, 1):
        return "appoggiatura"
    if d_in in (-1, 1) and d_out is not None and abs(d_out) > 1 and (d_out > 0) != (d_in > 0):
        return "escape"
    return "other"


def analyse_sonority(ctx: dict[str, dict]) -> tuple[Chord | None, dict[str, str]]:
    """ctx: voice -> {pitch, prev, next, held, struck, on_beat}. Returns the fundamental chord and a
    label per voice: a chord member ("root", "third", ...) or an incidental dissonance ("passing",
    "suspension", ...). Incidental notes are found by taking away the fewest notes whose melodic
    shape allows it (one, then two) until the rest stand in thirds."""
    notes = {v: c["pitch"] for v, c in ctx.items()}
    shapes = {v: shape(c["prev"], c["pitch"], c["next"], c["held"]) for v, c in ctx.items()}
    ch = fundamental(notes)
    if ch is not None:
        # A seventh struck in passing (or as a neighbour) is incidental, not essential: if the
        # other notes make a triad, the triad stands and the seventh passes (the bass B under C
        # major on its way from C to A; the 8-7 that passes over a held bass).
        v7 = next((v for v, r in ch.members.items() if r == "seventh"), None)
        if v7 is not None and ctx[v7]["struck"] and shapes[v7] in ("passing", "neighbour"):
            ch2 = fundamental({v: p for v, p in notes.items() if v != v7})
            if ch2 is not None and not ch2.seventh and ch2.complete:
                labels = dict(ch2.members)
                labels[v7] = shapes[v7]
                return ch2, labels
        return ch, dict(ch.members)
    # Every note may be taken away, at a cost: a note whose shape is not one of the incidental
    # kinds costs more ("free"), and the bass costs more still: the bass is the last note to give
    # up its place in the harmony (there is no ninth chord: over G, an A in the tenor is the
    # incidental note, not the G).
    cands = list(ctx)
    # One and two notes taken away compete on cost (a double suspension, 9/4 over the bass, is two
    # incidental notes, not one seventh chord on another root).
    best = None
    for k in (1, 2):
        for drop in combinations(cands, k):
            rest = {v: p for v, p in notes.items() if v not in drop}
            if len(rest) < 2:
                continue
            ch = fundamental(rest)
            if ch is None:
                continue
            cost = sum((0 if not ctx[v]["on_beat"] else 1)
                       + (0 if shapes[v] in ("suspension", "retardation") or ctx[v]["struck"] else 2)
                       + (4 if shapes[v] == "other" else 0)
                       + (3 if v == "bass" else 0)
                       + (3 if v == "bass" and ctx[v]["held"] and not ctx[v]["on_beat"] else 0) for v in drop)
            cost += 0 if ch.complete else 2
            cost += 0 if ch.members.get("bass") in ("root", "third", None) else 1
            cost += 1.5 * (k - 1)
            v7 = next((v for v, r in ch.members.items() if r == "seventh"), None)
            if v7 is not None and ctx[v7]["struck"] and shapes[v7] in ("passing", "neighbour"):
                cost += 2  # a seventh that only passes is better read as incidental
            if best is None or cost < best[0]:
                best = (cost, ch, drop)
    if best is not None:
        _, ch, drop = best
        labels = dict(ch.members)
        for v in drop:
            labels[v] = shapes[v] if shapes[v] != "other" else "free"
        return ch, labels
    return None, {v: "unanalysed" for v in ctx}

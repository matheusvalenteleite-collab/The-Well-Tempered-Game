#!/usr/bin/env python3
"""D728: the chorales' words, from Gertim Alberda's and Johannes Hentschel's "389 Chorale Settings" (MuseScore 3
files of the Breitkopf edition EB 3765, 1898; CC BY-NC-SA 4.0; github.com/johentsch/389_chorale_settings, DOI
10.5281/zenodo.11358762): data/sources/chorale-lyrics/SOURCE.md.

Each of our 370 chorales (data/chorales/bach/chorales/bach_NNN.json, Sapp's edition) is matched to its setting in the
389 by the music (its soprano's and bass's pitch contours, as a ratio of sequence likeness: difflib), and from that
setting each voice's note attacks are kept in order, with the syllables written under them (verse 1, and verse 2
where a repeated section has a second line of words), for tools/touch/chorales.ts to lay on our notes. Only the voices
the edition gives words carry syllables. Nothing is corrected here.

Run (with a clone of the repository at the commit named in SOURCE.md):
    python3 -I tools/chorales/alberda_lyrics.py PATH/TO/389_chorale_settings
Writes data/sources/chorale-lyrics/alberda.json.
"""
from __future__ import annotations

import difflib
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OURS = ROOT / "data" / "chorales" / "bach" / "chorales"
OUT = ROOT / "data" / "sources" / "chorale-lyrics" / "alberda.json"
VOICES = ("soprano", "alto", "tenor", "bass")


def contour(pitches: list[int]) -> tuple[int, ...]:
    """The steps between the pitches, a repeated pitch counted once (as the setting's ties and our joins may differ)."""
    out: list[int] = []
    for p in pitches:
        if not out or out[-1] != p:
            out.append(p)
    return tuple(b - a for a, b in zip(out, out[1:]))


def read_setting(path: Path) -> dict:
    """A setting's four voices: each attack (a tied continuation is no attack) its pitch and its syllables by verse."""
    score = ET.parse(path).getroot().find("Score")
    staves = score.findall("Staff")
    # Four staves: a voice each; two: soprano and alto on the first, tenor and bass on the second.
    where = [(0, 0), (1, 0), (2, 0), (3, 0)] if len(staves) >= 4 else [(0, 0), (0, 1), (1, 0), (1, 1)]
    voices = []
    for k, (si, vi) in enumerate(where):
        attacks = []
        for m in staves[si].findall("Measure"):
            vs = m.findall("voice")
            if vi >= len(vs):
                continue
            for c in vs[vi].findall("Chord"):
                notes = c.findall("Note")
                pitches = [int(n.findtext("pitch")) for n in notes]
                # A note tied from the one before is its continuation, not an attack.
                tied_in = any(sp.get("type") == "Tie" and sp.find("prev") is not None for n in notes for sp in n.findall("Spanner"))
                syl: dict[int, list[str]] = {}
                for ly in c.findall("Lyrics"):
                    no = int(ly.findtext("no") or 0)
                    text = (ly.findtext("text") or "").strip()
                    if not text:
                        continue
                    syllabic = ly.findtext("syllabic") or "single"
                    syl[no] = [text, syllabic]
                if tied_in and not syl:
                    continue
                pitch = max(pitches) if k == 0 else min(pitches) if k == 3 else pitches[0]
                attacks.append([pitch, {str(n): s for n, s in sorted(syl.items())}] if syl else [pitch])
        voices.append(attacks)
    title = {t.get("name"): (t.text or "") for t in score.findall("metaTag")}.get("workTitle", "")
    return {"title": title, "voices": voices}


def main() -> None:
    repo = Path(sys.argv[1])
    files = sorted((repo / "vocal_parts_only" / "MS3").glob("*.mscx"))
    settings = {f.name: read_setting(f) for f in files}
    out = {}
    tiers: dict[str, int] = {}
    for path in sorted(OURS.glob("bach_*.json")):
        c = json.loads(path.read_text())
        ours = {v: [n["midi"] for n in c["voices"][v] if n.get("midi") is not None] for v in ("soprano", "bass")}
        s, b = contour(ours["soprano"]), contour(ours["bass"])
        best = None
        for name, st in settings.items():
            ss = contour([a[0] for a in st["voices"][0]])
            sm = difflib.SequenceMatcher(None, s, ss, autojunk=False)
            if sm.real_quick_ratio() < 0.6 or sm.quick_ratio() < 0.6:
                continue
            r = sm.ratio()
            if r < 0.6:
                continue
            rb = difflib.SequenceMatcher(None, b, contour([a[0] for a in st["voices"][3]]), autojunk=False).ratio()
            if best is None or r + rb > best[0]:
                best = (r + rb, r, rb, name)
        n = c["number"]
        # The same setting (soprano and bass alike), the same tune (the soprano alike), or too far to trust.
        tier = "none" if not best else "exact" if best[1] >= 0.95 and best[2] >= 0.95 else "tune" if best[1] >= 0.9 else "weak"
        if tier in ("none", "weak"):
            # Else among the settings of the same work (the title naming our BWV number; the 389's movement numbers are
            # another numbering), the likest soprano, kept from a half likeness: the words laid only where the notes agree.
            work = str(c.get("bwv") or "").split("/")[0]
            pool = [nm for nm, st in settings.items() if work and re.search(rf"BWV\s*{re.escape(work)}(?!\d)", st["title"])]
            cand = []
            for nm in pool:
                st = settings[nm]
                r = difflib.SequenceMatcher(None, s, contour([a[0] for a in st["voices"][0]]), autojunk=False).ratio()
                rb = difflib.SequenceMatcher(None, b, contour([a[0] for a in st["voices"][3]]), autojunk=False).ratio()
                cand.append((r + rb, r, rb, nm))
            cand.sort(reverse=True)
            if cand and cand[0][1] >= 0.5:
                best, tier = cand[0], "bwv"
        tiers[tier] = tiers.get(tier, 0) + 1
        if tier in ("none", "weak"):
            continue
        _, r, rb, name = best
        st = settings[name]
        worded = [any(len(a) > 1 for a in v) for v in st["voices"]]
        out[f"chor{n:03d}"] = {
            "setting": name,
            "title": st["title"],
            "tier": tier,
            "likeness": [round(r, 3), round(rb, 3)],
            # Every voice's attacks where it has words; the others left out (nothing to lay).
            "voices": [v if w else None for v, w in zip(st["voices"], worded)],
        }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(out)} chorales; {tiers}")


if __name__ == "__main__":
    main()

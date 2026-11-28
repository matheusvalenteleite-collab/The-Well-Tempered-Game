#!/usr/bin/env python3
"""Ornament signs from a Mutopia LilyPond source, lined up with a MuseScore (MusicXML) note list.

Research prototype, run on French Suite 5 (BWV 816) only. Not part of the game build.

    python3 -I tools/suites/mutopia_ornaments.py --work DIR [--musicxml FILE.mxl] [--out DIR]

1. Downloads Mutopia's zipped .ly files (piece id 99) into DIR (a scratch folder, NOT the repo), records the
   file hashes and the licence the piece page states.
2. Reads each movement's .ly with the repo's own LilyPond reader (tools/wtc/lily.py), repeats unfolded, and writes
   OUT/french-suite-5.ornaments.json: per movement a plain list of [bar, voice, pitch, sign(s), small-note?],
   one row per sign.
3. With --musicxml (verits99's whole-suite MuseScore file, CC0 via PDMX), cuts that file into movements by the
   typesetter's words and reports how the two line up (by bar and pitch), in OUT/french-suite-5.alignment.json.

Only derived lists are written. The downloaded .ly files stay in DIR.
"""
import argparse
import hashlib
import json
import re
import subprocess
import sys
import zipfile
from bisect import bisect_right
from collections import Counter, defaultdict
from fractions import Fraction as F
from pathlib import Path
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "wtc"))
import lily  # noqa: E402

PIECE_ID = 99
PAGE = f"https://www.mutopiaproject.org/cgibin/piece-info.cgi?id={PIECE_ID}"
ZIP = "https://www.mutopiaproject.org/ftp/BachJS/BWV816/french-suite-5/french-suite-5-lys.zip"
MOVEMENTS = ["allemande", "courante", "sarabande", "gavotte", "bourree", "loure", "gigue"]
# the MuseScore file's movement words, in the same order
XML_WORDS = ["Allemande", "Courante", "Sarabande", "Gavotte", "Bourree", "Loure", "Gigue"]


def curl(url: str, dest: Path | None = None) -> bytes:
    cmd = ["curl", "-sfL", "-m", "90", url] + (["-o", str(dest)] if dest else [])
    r = subprocess.run(cmd, capture_output=True, check=True)
    return r.stdout


def fetch(work: Path) -> dict:
    work.mkdir(parents=True, exist_ok=True)
    page = curl(PAGE).decode("utf-8", "replace")
    text = re.sub(r"<[^>]+>", " ", page)
    lic = re.search(r"Copyright:\s*(.+?)\s{2,}", text)
    src = re.search(r"Source:\s*(.+?)\s{2,}", text)
    z = work / "lys.zip"
    curl(ZIP, z)
    zipfile.ZipFile(z).extractall(work / "ly")
    files = {}
    for m in MOVEMENTS:
        p = work / "ly" / "french-suite-5-lys" / f"french-suite-5-{m}.ly"
        files[m] = {"file": p.name, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()[:16]}
    return {"page": PAGE, "zip": ZIP, "licence": lic.group(1) if lic else "not read", "source": src.group(1) if src else "not read",
            "files": files}


def read_ly(path: Path) -> dict:
    s = lily.parse(path.read_text(encoding="utf-8", errors="replace"), str(path), path.parent, 0)
    onsets = [F(m["onset"]) for m in s.measures]
    first = s.measures[0]["number"]
    notes = []
    for n in s.notes:
        on = F(n["onset"])
        k = max(0, bisect_right(onsets, on) - 1)
        notes.append({"bar": s.measures[k]["number"], "in": on - onsets[k], "midi": n["midi"], "pitch": n["pitch"],
                      "voice": f'{n["staff"]}:{n["voice"]}', "grace": bool(n["grace"]), "orn": n.get("orn") or [], "gk": n.get("grace_kind")})
    return {"notes": notes, "bars": len(s.measures), "first_bar": first, "partial": str(s.partial or 0), "warnings": s.warnings}


def read_xml(path: Path) -> list[dict]:
    z = zipfile.ZipFile(path)
    rf = ET.fromstring(z.read("META-INF/container.xml")).find(".//rootfile").get("full-path")
    root = ET.fromstring(z.read(rf))
    part = root.findall("part")[0]
    step = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
    div = 1
    out = []
    for i, m in enumerate(part.findall("measure")):
        pos = F(0)
        last = F(0)
        words = [w.text.strip() for w in m.iter("words") if w.text]
        bm = {"idx": i, "words": words, "notes": [], "len": F(0)}
        for e in m:
            if e.tag == "attributes":
                d = e.find("divisions")
                if d is not None:
                    div = int(d.text)
            elif e.tag == "backup":
                pos -= F(int(e.findtext("duration")), div)
            elif e.tag == "forward":
                pos += F(int(e.findtext("duration")), div)
            elif e.tag == "note":
                dur = F(int(e.findtext("duration") or 0), div)
                grace = e.find("grace") is not None
                chord = e.find("chord") is not None
                if chord:
                    pos = last
                if e.find("rest") is None and e.find("pitch") is not None:
                    p = e.find("pitch")
                    midi = 12 * (int(p.findtext("octave")) + 1) + step[p.findtext("step")] + int(float(p.findtext("alter") or 0))
                    tie_stop = any(t.get("type") == "stop" for t in e.findall("tie"))
                    bm["notes"].append({"in": pos / 4, "midi": midi, "grace": grace, "tie_stop": tie_stop,
                                        "voice": f'{e.findtext("staff")}:{e.findtext("voice")}',
                                        "orn": [c.tag for c in e.findall("notations/ornaments/*")]})
                last = pos
                if not grace:
                    pos += dur
                bm["len"] = max(bm["len"], pos / 4)
        out.append(bm)
    return out


def cut_xml(bars: list[dict]) -> dict:
    marks = {}
    for b in bars:
        for w in b["words"]:
            for name in XML_WORDS:
                if w.lower().startswith(name.lower()) and name not in marks:
                    marks[name] = b["idx"]
    order = [marks[n] for n in XML_WORDS]
    ends = order[1:] + [len(bars)]
    return {n: bars[a:e] for n, a, e in zip(XML_WORDS, order, ends)}


def align(ly: dict, xbars: list[dict]) -> dict:
    """Match each LilyPond ornament to a MuseScore note by bar position, onset in the bar and pitch."""
    # bars are matched by position: the n-th bar of the unfolded .ly is the n-th bar of the MuseScore cut
    xs = defaultdict(list)
    for k, b in enumerate(xbars):
        for n in b["notes"]:
            if not n["tie_stop"] and not n["grace"]:
                xs[k].append(n)
    lyb = sorted({n["bar"] for n in ly["notes"]})
    pos = {bar: k for k, bar in enumerate(lyb)}
    stats = Counter()
    miss = []
    rows = []
    lyset = defaultdict(list)
    for n in ly["notes"]:
        if not n["grace"]:
            lyset[pos[n["bar"]]].append(n)
    # the opening bar is a pick-up in all seven dances: the two files place it differently inside the bar, so both
    # are measured from their own first note
    for d in (xs, lyset):
        if d.get(0):
            lo = min(n["in"] for n in d[0])
            d[0] = [{**n, "in": n["in"] - lo} for n in d[0]]
    shift0 = min((n["in"] for n in ly["notes"] if pos[n["bar"]] == 0 and not n["grace"]), default=F(0))
    # whole-bar agreement: the same multiset of (onset-in-bar, pitch) in both files
    for k in range(max(len(xbars), len(lyb))):
        a = Counter((n["in"], n["midi"]) for n in lyset.get(k, []))
        b = Counter((n["in"], n["midi"]) for n in xs.get(k, []))
        stats["bars"] += 1
        stats["notes_ly"] += sum(a.values())
        stats["notes_xml"] += sum(b.values())
        stats["notes_agree"] += sum((a & b).values())
        has_sign = any(n["orn"] for n in lyset.get(k, []))
        if a == b:
            stats["bars_identical"] += 1
        else:
            stats["bars_differ_with_sign" if has_sign else "bars_differ_no_sign"] += 1
        if a != b and not has_sign and len(miss) < 12:
            miss.append({"bar_index": k, "only_ly": [[str(o), m] for (o, m) in (a - b)][:4],
                         "only_xml": [[str(o), m] for (o, m) in (b - a)][:4]})
    xset = {k: {(n["in"], n["midi"]) for n in v} for k, v in xs.items()}
    for n in ly["notes"]:
        if not n["orn"] and not n["grace"]:
            continue
        k = pos[n["bar"]]
        kind = "small-note" if n["grace"] else "sign"
        stats["orn_" + kind] += 1
        nin = n["in"] - (shift0 if k == 0 else 0)
        hit = (nin, n["midi"]) in xset.get(k, set())
        if not hit and not n["grace"]:
            near = [x for x in xs.get(k, []) if abs(x["in"] - nin) <= F(1, 16) and abs(x["midi"] - n["midi"]) <= 2]
            stats["orn_sign_nearby_note"] += int(bool(near))
            # not the plain note any more: is the sign written out as extra notes near it in MuseScore?
            extra = [x for x in xs.get(k, []) if (x["in"], x["midi"]) not in {(y["in"], y["midi"]) for y in lyset.get(k, [])}
                     and abs(x["in"] - n["in"]) <= F(1, 4)]
            stats["orn_sign_written_out"] += int(bool(extra))
        if n["grace"]:
            # a small note has no onset of its own: count whether MuseScore also has a small note in that bar
            hit = any(g["grace"] for g in xbars[k]["notes"]) if k < len(xbars) else False
        stats["orn_" + kind + "_matched"] += int(hit)
        rows.append((k, n, hit))
    return {"stats": dict(stats), "differences": miss}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", required=True, help="scratch folder for the downloaded files (outside the repo)")
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent.parent / "data" / "sources" / "bach-suites-ornaments"))
    ap.add_argument("--musicxml", help="the MuseScore whole-suite .mxl for French Suite 5 (score 764746)")
    a = ap.parse_args()
    work, out = Path(a.work), Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    meta = fetch(work)
    result = {"source": meta, "movements": {}}
    lys = {}
    for m in MOVEMENTS:
        d = read_ly(work / "ly" / "french-suite-5-lys" / f"french-suite-5-{m}.ly")
        lys[m] = d
        rows = [[n["bar"], n["voice"], n["pitch"], n["orn"] or ["small-note:" + str(n["gk"] or "grace")], n["grace"]]
                for n in d["notes"] if n["orn"] or n["grace"]]
        result["movements"][m] = {"bars_unfolded": d["bars"], "first_bar": d["first_bar"], "signs": rows}
    (out / "french-suite-5.ornaments.json").write_text(json.dumps(result, separators=(",", ":")), encoding="utf-8")
    tot = Counter(o for mv in result["movements"].values() for r in mv["signs"] for o in r[3])
    print("signs per kind (repeats unfolded, so a sign in a repeated half counts twice):", dict(tot))
    if a.musicxml:
        cuts = cut_xml(read_xml(Path(a.musicxml)))
        rep = {}
        for m, w in zip(MOVEMENTS, XML_WORDS):
            rep[m] = {"bars_ly": lys[m]["bars"], "bars_xml": len(cuts[w]), **align(lys[m], cuts[w])}
            s = rep[m]["stats"]
            print(f"{m:10s} bars ly/xml {rep[m]['bars_ly']}/{rep[m]['bars_xml']}  identical bars {s.get('bars_identical',0)}/{s.get('bars',0)}  "
                  f"notes agree {s.get('notes_agree',0)}/{s.get('notes_ly',0)}  signs: plain note kept {s.get('orn_sign_matched',0)}, "
                  f"written out as notes {s.get('orn_sign_written_out',0)}, a MuseScore note within a 16th and 2 semitones {s.get('orn_sign_nearby_note',0)}, of {s.get('orn_sign',0)}  "
                  f"small notes with a MuseScore small note in the same bar {s.get('orn_small-note_matched',0)}/{s.get('orn_small-note',0)}  "
                  f"bars differing: near a sign {s.get('bars_differ_with_sign',0)}, elsewhere {s.get('bars_differ_no_sign',0)}")
        (out / "french-suite-5.alignment.json").write_text(json.dumps(rep, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()

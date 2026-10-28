"""
The preludes of the Well-Tempered Clavier that go with the fugues of D119 (D125), every note.
D366: read from the game's licence-clean corpus (data/wtc/preludes.json: OpenWTC, Mutopia and
verits99's editions, tools/wtc/import.ts) instead of the ASAP dataset (CC BY-NC-SA 4.0), with the
extractor's cleaning (written-out ornaments beside their main note dropped). Usage:

  python3 tools/wtc-preludes.py data/wtc/preludes.json data/bach/wtc/preludes-full.json

Each prelude: its time signature, the bar in quarters, the metre changes ([onset, bar], both in 96ths
of a quarter) and its notes as [MIDI, onset, length] in 96ths of a quarter from the start of the
first full bar (a pickup is padded, as for the fugues).
"""
import ast, json, os, sys
from fractions import Fraction as F

ROOT, OUT = sys.argv[1], sys.argv[2]
# The extractor's cleaning and pitch reading, taken from its source (it runs on import).
src = open(os.path.join(os.path.dirname(__file__), "wtc-extract.py")).read()
ns_ = {"F": F, "STEPS": {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}}
for node in ast.parse(src).body:
    if isinstance(node, ast.FunctionDef) and node.name in ("clean", "midi_of"):
        exec(compile(ast.Module([node], []), "wtc-extract.py", "exec"), ns_)
clean, midi_of = ns_["clean"], ns_["midi_of"]
D119 = [846, 848, 854, 856, 857, 858, 860, 862, 863, 864, 865, 866, 867, 868, 870, 873, 874, 875, 876, 880, 883, 884, 885, 887, 888, 889, 891, 892, 893]

out = {}
for p in json.load(open(ROOT)):
    bwv = 845 + (p["book"] - 1) * 24 + p["number"]
    if bwv not in D119: continue
    num, den = map(int, p["meter"].split("/"))
    barq = F(num * 4, den)
    b1 = next((b["on"] for b in p["bars"] if b["n"] == 1), 0)
    # The bar as the notes fill it (I/15's "24/16" is a bar of four crotchets of sextuplets).
    full = [b["on"] for b in p["bars"]] + [p["length"]]
    barq = F(full[2] - full[1], 1920) if len(full) > 2 else barq
    pad = barq - F(b1, 1920) if b1 else F(0)
    ns = [{"on": F(on, 1920), "dur": F(dur, 1920), "midi": midi_of(pitch)} for v in p["voices"] for on, dur, pitch, _ in v if dur > 0]
    ns = clean(sorted(ns, key=lambda x: (x["on"], x["midi"])))
    # Metre changes: where the bars' length changes for good (two bars alike or the last), from the first full bar.
    bars = [b["on"] for b in p["bars"]] + [p["length"]]
    lens = [F(bars[i + 1] - bars[i], 1920) for i in range(len(bars) - 1)]
    changes, cur = [], barq
    for i in range(1, len(lens) - 1):
        if lens[i] != cur and lens[i] == lens[i + 1]:
            cur = lens[i]
            changes.append([int((F(bars[i], 1920) + pad) * 96), int(cur * 96)])
    fid = f"wtc{p['book']}.{p['number']:02d}"
    out[fid] = {
        "time": p["meter"],
        "barQuarters": float(barq),
        "changes": changes,
        "notes": [[n["midi"], int(round((n["on"] + pad) * 96)), int(round(n["dur"] * 96))] for n in ns],
    }
    print(fid, p["meter"], len(ns), "notes", "changes", changes)

with open(OUT, "w") as fh:
    fh.write('{"source": "OpenWTC (CC0), Mutopia (public domain), verits99 on MuseScore (CC0); read by tools/wtc/import.ts (D366)", "unit": "1/96 quarter", "preludes": {\n')
    fh.write(",\n".join(f'"{k}": {json.dumps(v, separators=(",", ":"))}' for k, v in sorted(out.items())))
    fh.write("\n}}\n")

"""
The preludes of the Well-Tempered Clavier that go with the fugues of D119 (D125), every note, read
from the ASAP dataset's MusicXML scores (Foscarin, McLeod, Rigaux, Jacquemard, Sakai 2020,
CC BY-NC-SA 4.0) with the extractor's pooling (ties merged, written-out ornaments beside their main
note dropped). Usage:

  python3 tools/wtc-preludes.py <ASAP>/Bach/Prelude data/bach/wtc/preludes-full.json

Each prelude: its time signature, the bar in quarters, the metre changes (bar number and bar in
quarters) and its notes as [MIDI, onset, length] in 96ths of a quarter from the start of the first
full bar (a pickup is padded, as for the fugues).
"""
import ast, json, os, sys
from fractions import Fraction as F
from music21 import converter, meter

ROOT, OUT = sys.argv[1], sys.argv[2]
# The extractor's pooling and cleaning, taken from its source (it runs on import).
src = open(os.path.join(os.path.dirname(__file__), "wtc-extract.py")).read()
tree = ast.parse(src)
ns_ = {"F": F}
exec("from music21 import chord", ns_)
for node in tree.body:
    if isinstance(node, ast.FunctionDef) and node.name in ("pool", "clean"):
        exec(compile(ast.Module([node], []), "wtc-extract.py", "exec"), ns_)
pool = ns_["pool"]

def fid(bwv):
    return f"wtc1.{bwv - 845:02d}" if bwv <= 869 else f"wtc2.{bwv - 869:02d}"

out = {}
for d in sorted(os.listdir(ROOT)):
    if not d.startswith("bwv_"): continue
    bwv = int(d[4:])
    sc = converter.parse(os.path.join(ROOT, d, "xml_score.musicxml"))
    tss = list(sc.parts[0].recurse().getElementsByClass(meter.TimeSignature))
    ns = pool(sc)
    m0 = sc.parts[0].getElementsByClass("Measure").first()
    pad = F(m0.paddingLeft).limit_denominator(96)
    changes = []
    for t in tss[1:]:
        m = t.getContextByClass("Measure")
        bq = F(t.barDuration.quarterLength).limit_denominator(96)
        at = F(m.getOffsetInHierarchy(sc.parts[0])).limit_denominator(96) + pad
        if not changes or changes[-1][1] != int(bq * 96): changes.append([int(at * 96), int(bq * 96)])
    out[fid(bwv)] = {
        "time": tss[0].ratioString,
        "barQuarters": float(F(tss[0].barDuration.quarterLength)),
        "changes": changes,
        "notes": [[n["midi"], int(round((n["on"] + pad) * 96)), int(round(n["dur"] * 96))] for n in ns],
    }
    print(fid(bwv), tss[0].ratioString, len(ns), "notes", "changes", changes)

with open(OUT, "w") as fh:
    fh.write('{"source": "ASAP dataset (Foscarin et al. 2020), CC BY-NC-SA 4.0", "unit": "1/96 quarter", "preludes": {\n')
    fh.write(",\n".join(f'"{k}": {json.dumps(v, separators=(",", ":"))}' for k, v in sorted(out.items())))
    fh.write("\n}}\n")

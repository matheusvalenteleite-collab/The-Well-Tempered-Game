"""P29: the Bach pieces of the owner's test page beside the original ones: two chorales to compare
(Nos. 216 Es ist genug, 89 Wenn ich einmal soll scheiden), and the first sixteen bars of the WTC II
prelude in C sharp minor (wtc2p04: 41 ornaments, trills and appoggiaturas) for the ornaments.
Usage: python3 tools/playback/compose/test_pieces.py (after chorales.py, fugue.py and the Fux tool)."""
import json
path = "data/playback/test-pieces.json"
data = json.load(open(path))
study = {c["n"]: c for c in json.load(open("data/chorales/study.json"))["chorales"]}
data["bach"] = [{"n": n, "title": study[n]["title"], "bwv": study[n]["bwv"], "tonic": study[n]["tonic"], "mode": study[n]["mode"], "sig": study[n]["sig"], "meter": study[n]["meter"], "pickup": study[n]["pickup"], "voices": study[n]["voices"], "cadences": study[n]["cadences"], "harmony": study[n]["harmony"]} for n in (216, 89)]
pre = next(p for p in json.load(open("data/wtc/preludes.json")) if p["id"] == "wtc2p04")
TPQ = 1920
num, den = map(int, pre["meter"].split("/"))
bar = TPQ * 4 * num // den
end = pre["bars"][16]["on"] if len(pre["bars"]) > 16 else 16 * bar
orn = [r for r in json.load(open("data/wtc/ornaments.json"))["wtc2p04"] if r[1] < end]
data["ornaments"] = {"id": "wtc2p04", "title": "Prelude in C sharp minor, WTC II (bars 1-16)", "bwv": pre["bwv"], "key": pre["key"], "mode": pre["mode"], "meter": pre["meter"], "tpq": TPQ, "end": end,
                     "voices": [[n for n in v if n[0] < end] for v in pre["voices"]], "orn": orn}
json.dump(data, open(path, "w"), ensure_ascii=False, indent=1)
print("ornaments in the excerpt:", len(orn), "; voices:", len(pre["voices"]), "; bars", pre["bars"][:3])

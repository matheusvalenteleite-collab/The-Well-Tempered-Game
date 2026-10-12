"""P29: the Bach pieces of the owner's test page beside the original ones: two chorales to compare
(Nos. 216 Es ist genug, 89 Wenn ich einmal soll scheiden), and the first sixteen bars of the WTC II
prelude in C sharp minor (wtc2p04: 41 ornaments, trills and appoggiaturas) for the ornaments.
Usage: python3 tools/playback/compose/test_pieces.py (after chorales.py, fugue.py and the Fux tool)."""
import json
path = "data/playback/test-pieces.json"
data = json.load(open(path))
study = {c["n"]: c for c in json.load(open("data/chorales/study.json"))["chorales"]}
import glob
lyrics = json.load(open("data/playback/chorale-lyrics.json"))["chorales"]
# P30: Bach's chorales and fugues that the composer sessions' pieces ask to be compared with.
bench = [json.load(open(f)) for f in sorted(glob.glob("data/playback/bench/*.json"))]
def target(c):
    """A piece's comparison: a chorale number, a WTC id, or {n | id, from, to} (an excerpt)."""
    if isinstance(c, dict):
        return c.get("n", c.get("id"))
    return c
targets = [target(b.get("compare")) for b in bench]
wanted = sorted({216, 89} | {t for t in targets if isinstance(t, int)})
fugue_ids = sorted({t for t in targets if isinstance(t, str)})
fugues = {f["id"]: f for f in json.load(open("data/wtc/fugues.json"))} if fugue_ids else {}
data["bachFugues"] = [{"id": i, "title": f"Fugue {fugues[i]['key']} {fugues[i]['mode']}, WTC {fugues[i]['book']} (BWV {fugues[i]['bwv']})", "meter": fugues[i]["meter"], "tpq": 1920, "voices": fugues[i]["voices"]} for i in fugue_ids if i in fugues]
data["bach"] = [{"n": n, "lyrics": lyrics.get(f"chor{n:03d}"), "title": study[n]["title"], "bwv": study[n]["bwv"], "tonic": study[n]["tonic"], "mode": study[n]["mode"], "sig": study[n]["sig"], "meter": study[n]["meter"], "pickup": study[n]["pickup"], "voices": study[n]["voices"], "cadences": study[n]["cadences"], "harmony": study[n]["harmony"]} for n in wanted]
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

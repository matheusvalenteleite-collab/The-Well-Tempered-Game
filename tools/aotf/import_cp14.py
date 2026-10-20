"""P44: the unfinished fugue of the Art of Fugue (Contrapunctus XIV in the usual numbering) from
Craig Sapp's **kern (data/sources/art-of-fugue) to data/aotf/cp14.json: four voices, soprano to bass,
each note [onset, length, pitch] in 32nds (tied notes joined), and the bar count.
Usage: python3 tools/aotf/import_cp14.py"""
import json, re
SRC = "data/sources/art-of-fugue/kern/artfugue-019.krn"
lines = [l.rstrip("\n") for l in open(SRC, encoding="utf-8")]
spines = None
voices = [[], [], [], []]  # in spine order: bass .. soprano
time = [0, 0, 0, 0]
open_tie = [None] * 4
bars = 0
TOK = re.compile(r"^([^\d]*)(\d+)(\.*)([a-gA-G]+|r)([#\-n]*)(.*)$")

def pitch(letters, acc):
    step = letters[0].upper()
    octave = 3 - (len(letters) - 1) if letters[0].isupper() else 4 + (len(letters) - 1)
    alter = acc.replace("n", "")
    return step + alter.replace("-", "b") + str(octave)

for line in lines:
    if not line or line.startswith("!"):
        continue
    f = line.split("\t")
    if line.startswith("**"):
        spines = len(f)
        assert spines == 4
        continue
    if line.startswith("*"):
        assert not any(x in ("*^", "*v") for x in f), "spine splits not handled"
        continue
    if line.startswith("="):
        m = re.match(r"=(\d+)", f[0])
        if m:
            bars = max(bars, int(m.group(1)))
        continue
    for i, tok in enumerate(f):
        if tok == ".":
            continue
        t = TOK.match(tok)
        assert t, tok
        pre, num, dots, letters, acc, post = t.groups()
        d = 32 // int(num) if int(num) <= 32 else None
        assert d, tok
        add = d
        for _ in dots:
            add //= 2
            d += add
        at = time[i]
        time[i] += d
        if letters == "r":
            continue
        p = pitch(letters, acc)
        if "]" in post or "_" in post:
            # the continuation of a tied note
            n = open_tie[i]
            assert n and n[2] == p, (tok, n)
            n[1] += d
            if "]" in post:
                open_tie[i] = None
            continue
        n = [at, d, p]
        voices[i].append(n)
        if "[" in pre:
            open_tie[i] = n

assert len(set(time)) == 1, time
out = {
    "id": "bwv1080-cp14",
    "title": "Contrapunctus XIV (Fuga a 3 soggetti), unfinished",
    "bwv": "1080",
    "meter": "4/4",
    "key": "D minor",
    "sig": -1,
    "bars": bars,
    "end": time[0],
    "source": "Bach-Gesellschaft vol. 25.1 (1878), as encoded by Craig Stuart Sapp (github.com/craigsapp/art-of-the-fugue, artfugue-019.krn)",
    "voices": [voices[3], voices[2], voices[1], voices[0]],
}
json.dump(out, open("data/aotf/cp14.json", "w"), separators=(",", ":"))
print(bars, "bars;", time[0] / 32, "bars of time;", [len(v) for v in out["voices"]], "notes S A T B")

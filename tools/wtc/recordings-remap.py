#!/usr/bin/env python3
"""D366: the recordings' bar lines (data/recordings/ishizaka-book1.json, loesser-book2.json) moved
where the licence-clean editions bar a prelude otherwise than the Humdrum encoding the alignments were
made with: the encoding's bar 29 of I/8 (an overfull bar, 3/4 of a crotchet long), bar 17 of II/4
(a half crotchet) and bar 18 of II/11 (five crotchets, its spines misread) pushed every later bar line
on; the editions (OpenWTC and Mutopia for I/8, verits99 for II/4 and II/11) bar them regularly. Each
later bar line's time is read from the old alignment at the old position of the bar's start (linear
within the old bar), the end kept. Run once: python3 tools/wtc/recordings-remap.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
# key: (first bar index moved (0-based from the first bar), shift in bars, bars now)
FIX = {"wtc1-08p": (29, 1440 / 11520, 40), "wtc2-04p": (17, 960 / 8640, 62), "wtc2-11p": (18, 9600 / 11520, 72)}


def at(t, x):
    i = min(int(x), len(t) - 2)
    return t[i] + (x - i) * (t[i + 1] - t[i])


for name in ("ishizaka-book1.json", "loesser-book2.json"):
    path = ROOT / "data" / "recordings" / name
    d = json.loads(path.read_text())
    for key, (first, shift, bars) in FIX.items():
        tm = d["bars"].get(key)
        if tm is None:
            continue
        t = tm if isinstance(tm, list) else tm["t"]
        if isinstance(tm, dict):
            assert tm["b"] == list(range(len(t) - 1)), f"{key}: repeats not handled"
        if len(t) == bars + 1:
            print(f"{key}: already {bars} bars")
            continue
        new = [round(t[i], 3) if i < first else round(at(t, i + shift), 3) for i in range(bars)] + [t[-1]]
        if isinstance(tm, list):
            d["bars"][key] = new
        else:
            d["bars"][key] = {"t": new, "b": list(range(bars))}
        print(f"{key}: {len(t) - 1} → {bars} bars")
    # The file's layout kept (a key to a line): only the moved keys' lines rewritten.
    lines = path.read_text().split("\n")
    for key in FIX:
        tm = d["bars"].get(key)
        if tm is None:
            continue
        for i, line in enumerate(lines):
            if line.startswith(f'"{key}": '):
                tail = line[line.rindex("]") + 1:] if isinstance(tm, list) else line[line.rindex("]}") + 2:]
                body = json.dumps(tm) if isinstance(tm, list) else '{"t":%s,"b":%s}' % (json.dumps(tm["t"], separators=(",", ":")), json.dumps(tm["b"], separators=(",", ":")))
                lines[i] = f'"{key}": {body}{tail}'
    path.write_text("\n".join(lines))
    json.loads(path.read_text())

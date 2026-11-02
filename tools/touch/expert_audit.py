"""
D493: the expert audit's numbers. Compares the game's entries before the expert table (an old
data/touch/pieces.json, e.g. `git show 381019e:data/touch/pieces.json > /tmp/old.json`) with the
entries now (data/touch/pieces.json, docs/wtc/entries/expert-entries.json), fugue by fugue.
An old and a new entry are the same entry when they are in the same voice and start within a
quarter-note of each other. Prints a Markdown table (for docs/wtc/entries/EXPERT-AUDIT.md) and totals.
Run: python3 tools/touch/expert_audit.py OLD.json
"""
import json
import sys

old = {p["id"]: p for p in json.load(open(sys.argv[1])) if p.get("kind") == "fugue" and p["id"].startswith("wtc")}
new = {p["id"]: p for p in json.load(open("data/touch/pieces.json")) if p.get("kind") == "fugue" and p["id"].startswith("wtc")}
expert = json.load(open("docs/wtc/entries/expert-entries.json"))


def name(fid):
    return ("I" if fid[3] == "1" else "II") + "/" + str(int(fid[-2:]))


def form(e):
    return (bool(e.get("inverted")), e.get("scale") or 1, e.get("theme") or 1)


rows = []
tot = dict(old=0, new=0, added=0, removed=0, relabelled=0, moved=0, inv=0, aug=0, dim=0, numbered=0, partial=0, modified=0)
for fid in sorted(new, key=lambda f: (f[3], f)):
    o, n = old[fid], new[fid]
    tpq = n["tpq"]
    used = set()
    pairs = []
    for i, e in enumerate(n["entries"]):
        best = None
        for j, f in enumerate(o["entries"]):
            if j in used or f["voice"] != e["voice"] or abs(f["on"] - e["on"]) > tpq:
                continue
            if best is None or abs(f["on"] - e["on"]) < abs(o["entries"][best]["on"] - e["on"]):
                best = j
        if best is not None:
            used.add(best)
        pairs.append((e, o["entries"][best] if best is not None else None))
    added = [e for e, f in pairs if f is None]
    removed = [f for j, f in enumerate(o["entries"]) if j not in used]
    relab = [(e, f) for e, f in pairs if f is not None and form(e) != form(f)]
    moved = [(e, f) for e, f in pairs if f is not None and e["on"] != f["on"]]
    multi = expert[fid]["subjects"] > 1
    ex = expert[fid]["entries"]
    inv = sum(1 for (e, f), x in zip(pairs, ex) if e.get("inverted") and (f is None or not f.get("inverted")))
    aug = sum(1 for (e, f), x in zip(pairs, ex) if e.get("scale") == 2 and (f is None or f.get("scale") != 2))
    dim = sum(1 for (e, f), x in zip(pairs, ex) if e.get("scale") == 0.5 and (f is None or f.get("scale") != 0.5))
    # Numbered: a multi-subject fugue's entries now flagged SUBJECT 1 (before: plain SUBJECT).
    numbered = sum(1 for e in n["entries"] if multi and not e.get("theme"))
    partial = sum(1 for x in ex if "partial" in x["form"])
    modified = sum(1 for x in ex if "modified" in x["form"])
    srcs = " ".join(expert[fid]["sources"])
    for k, v in dict(old=len(o["entries"]), new=len(n["entries"]), added=len(added), removed=len(removed), relabelled=len(relab), moved=len(moved), inv=inv, aug=aug, dim=dim, numbered=numbered, partial=partial, modified=modified).items():
        tot[k] += v
    rows.append((name(fid), len(o["entries"]), len(n["entries"]), len(added), len(removed), inv, aug, dim, partial, modified, "1-%d" % expert[fid]["subjects"] if multi else "1", srcs))

print("| Fugue | Before | Now | Added | Removed | New inv. | New aug. | New dim. | Partial | Modified | Subjects | Sources |")
print("|---|---|---|---|---|---|---|---|---|---|---|---|")
for r in rows:
    print("| " + " | ".join(str(x) for x in r) + " |")
print()
print("TOTALS", json.dumps(tot))

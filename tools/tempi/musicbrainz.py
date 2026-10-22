"""
D199: gather the durations of the 48 fugues of the Well-Tempered Clavier (and Contrapunctus XIV)
from commercial recordings listed in MusicBrainz (track lengths, the performer from the recording's
"instrument" relation). Writes rows for data/tempi/recordings.csv (then reviewed by hand).

  python3 tools/tempi/musicbrainz.py CACHE_DIR search    # candidate releases
  python3 tools/tempi/musicbrainz.py CACHE_DIR fetch     # each release, with its tracks
  python3 tools/tempi/musicbrainz.py CACHE_DIR rows OUT.csv

Every request is cached in CACHE_DIR; MusicBrainz asks for at most one request a second.
"""
import csv, json, os, re, subprocess, sys, time, urllib.parse

UA = {"User-Agent": "WellTemperedGame-tempi/0.1 ( https://github.com/ )"}
API = "https://musicbrainz.org/ws/2/"


def get(cache, key, url):
    path = os.path.join(cache, re.sub(r"[^A-Za-z0-9._-]", "_", key)[:180] + ".json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    for _ in range(5):
        try:
            time.sleep(1.1)
            # curl rather than urllib: large replies stall through some proxies
            raw = subprocess.run(["curl", "-sS", "--max-time", "60", "-A", UA["User-Agent"], url],
                                 capture_output=True, check=True).stdout
            d = json.loads(raw)
            with open(path, "w") as f:
                json.dump(d, f)
            return d
        except Exception as e:  # noqa: BLE001 (retry anything)
            print("retry", url, e, file=sys.stderr)
            time.sleep(5)
    return None


QUERIES = [
    'release:"well-tempered clavier"', 'release:"well tempered clavier"', 'release:wohltemperierte',
    'release:"wohltemperirte"', 'release:"clavier bien tempéré"', 'release:"well-tempered klavier"',
    'release:"well-tempered" AND release:bach', 'release:"wohltemperierte klavier"',
    'release:"clavicembalo ben temperato"', 'release:"wohl temperierte"',
    'release:"art of fugue"', 'release:"kunst der fuge"', 'release:"art de la fugue"',
]


def search(cache):
    out = {}
    for q in QUERIES:
        off = 0
        while True:
            url = API + "release/?" + urllib.parse.urlencode({"query": q, "fmt": "json", "limit": 100, "offset": off})
            d = get(cache, f"s-{q}-{off}", url)
            if not d:
                break
            for r in d["releases"]:
                out[r["id"]] = {"title": r["title"], "date": r.get("date"), "tracks": r.get("track-count")}
            off += 100
            print(q, off, d["count"], len(out), file=sys.stderr)
            if off >= d["count"] or off >= 1500:
                break
    with open(os.path.join(cache, "cands.json"), "w") as f:
        json.dump(out, f)


def fetch(cache):
    with open(os.path.join(cache, "cands.json")) as f:
        cands = json.load(f)
    for i, rid in enumerate(cands):
        url = API + f"release/{rid}?inc=recordings+artist-credits+artist-rels+recording-level-rels&fmt=json"
        get(cache, "r-" + rid, url)
        if i % 50 == 0:
            print(i, len(cands), file=sys.stderr)


def piece_of(title):
    """The fugue a track holds: wtc1f01..wtc2f24, bwv1080-14, or None."""
    t = title.lower()
    if re.search(r"pr[aäéæ]?e?lud|praeambul|præambul", t) and not re.search(r"(fug[aeu]e?|fugue)\s*$", t):
        # a prelude, or a prelude and its fugue on one track
        if not re.search(r":\s*(fug|fuga|fugue|fuge)\b[^:]*$", t):
            return None
    if "contrapunctus" in t or "contrapunctu" in t:
        if re.search(r"contrapunctus\s*(14|xiv)\b", t) or re.search(r"fuga a 3 soggetti|unfinished|incomplete", t):
            return "bwv1080-14"
        return None
    if re.search(r"fuga a 3 soggetti|fuga a tre soggetti", t):
        return "bwv1080-14"
    if not re.search(r"fug", t):
        return None
    t = re.sub(r"bwv\.?\s*\d{3}\s*[-–—]\s*\d{3}", "", t)  # the book's range, "BWV 870-893"
    m = re.findall(r"bwv\.?\s*(\d{3})", t)
    if m:
        n = int(m[-1])
        no = re.findall(r"\bno\.?\s*(\d{1,2})\b", t)
        if no and int(no[-1]) != (n - 845 if n <= 869 else n - 869):
            return None  # the number and the BWV disagree: a mislabelled track
        if 846 <= n <= 869:
            return f"wtc1f{n - 845:02d}"
        if 870 <= n <= 893:
            return f"wtc2f{n - 869:02d}"
    return None


def performer(track):
    names, inst = [], ""
    for r in track["recording"].get("relations", []):
        if r["type"] in ("instrument", "performer") and "artist" in r:
            names.append(r["artist"]["name"])
            a = " ".join(r.get("attributes", [])).lower()
            inst = inst or a
    if not names:
        names = [c["name"] for c in track.get("artist-credit", []) if "bach" not in c["name"].lower()]
    return "; ".join(dict.fromkeys(names)), inst


def rows(cache, out):
    with open(os.path.join(cache, "cands.json")) as f:
        cands = json.load(f)
    res = []
    for rid in cands:
        path = os.path.join(cache, "r-" + rid + ".json")
        if not os.path.exists(path):
            continue
        with open(path) as f:
            d = json.load(f)
        rel_names = [c["name"] for c in d.get("artist-credit", []) if "bach" not in c["name"].lower()]
        for m in d.get("media", []):
            for t in m.get("tracks", []):
                p = piece_of(t["title"])
                if not p or not t.get("length"):
                    continue
                who, inst = performer(t)
                if not who:
                    who = "; ".join(rel_names)
                res.append({
                    "piece": p, "performer": who, "instrument": inst, "date": d.get("date", ""),
                    "seconds": round(t["length"] / 1000, 1), "recording": t["recording"]["id"],
                    "title": t["title"], "source": f"https://musicbrainz.org/release/{rid}",
                })
    with open(out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(res[0].keys()))
        w.writeheader()
        w.writerows(res)
    print(len(res), "rows", file=sys.stderr)


if __name__ == "__main__":
    cache, cmd = sys.argv[1], sys.argv[2]
    os.makedirs(cache, exist_ok=True)
    {"search": lambda: search(cache), "fetch": lambda: fetch(cache), "rows": lambda: rows(cache, sys.argv[3])}[cmd]()

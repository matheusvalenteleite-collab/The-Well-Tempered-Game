"""
D199: from the raw MusicBrainz rows (tools/tempi/musicbrainz.py rows) to data/tempi/recordings.csv.

  python3 tools/tempi/curate.py RAW.csv data/tempi/recordings.csv
  python3 tools/tempi/curate.py RAW.csv data/tempi/prelude-recordings.csv --preludes   # D861: the preludes

Keeps keyboard performances (piano, harpsichord, clavichord, fortepiano: the game's instruments;
organ, strings and ensembles are left out), one row per recording (a reissue whose duration is
within 3% (or 3 seconds) of one already kept, by the same performer, is the same recording), and drops tracks
whose tempo is less than half or more than twice the piece's median (a track mislabelled, or
a prelude and fugue on one track), printing what it dropped. Adds the two recordings the repository
aligned bar by bar (data/recordings): Ishizaka's Book I where MusicBrainz lacks it, Loesser's
Book II (one track holds a prelude and its fugue, so the fugue's span is read from the bar lines).
"""
import csv, json, math, os, re, statistics, sys

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
KEYBOARD = ("fortepiano", "piano", "harpsichord", "clavichord", "cembalo", "clavier", "virginal")
NAMES = {  # MusicBrainz names in their own scripts
    "Владимир Фельцман": "Vladimir Feltsman",
    "Самуил Евгеньевич Фейнберг": "Samuil Feinberg",
    "Святослав Рихтер": "Sviatoslav Richter",
    "Святослав Теофилович Рихтер": "Sviatoslav Richter",
    "Татьяна Николаева": "Tatiana Nikolayeva",
    "Татьяна Петровна Николаева": "Tatiana Nikolayeva",
    "Мария Юдина": "Maria Yudina",
    "Евгений Королёв": "Evgeni Koroliov",
    "Kimiko Douglass-Ishizaka": "Kimiko Ishizaka",
    "Святослав Теофилович Рихтер": "Sviatoslav Richter",
    "Андрей Волконский": "Andrei Volkonsky",
    "Антон Батагов": "Anton Batagov",
    "Григорий Соколов": "Grigory Sokolov",
    "Сергей Дижур": "Sergei Dizhur",
    "Татьяна Николаева": "Tatiana Nikolayeva",
    "鈴木雅明": "Masaaki Suzuki",
    "Joerg Demus": "Jörg Demus",
}
# Performers MusicBrainz names but whose instrument it leaves out (from the release, checked by hand).
INSTRUMENT = {
    "Andrew Rangell": "piano", "Christophe Rousset": "harpsichord", "Cédric Pescia": "piano",
    "Enrico Baiano": "harpsichord", "George Lepauw": "piano", "Gerlinde Otto": "piano", "Jörg Demus": "piano",
    "Kenneth Weiss": "harpsichord", "Konstantin Lifschitz": "piano", "Joanna MacGregor": "piano",
    "Albert Cano Smit": "piano", "Peter Hill": "piano", "Pierre-Laurent Aimard": "piano",
    "Robert Silverman": "piano", "Schaghajegh Nosrati": "piano", "Valery Afanassiev": "piano",
    "Sviatoslav Richter": "piano",
}
# Tracks left out by hand (MusicBrainz recording id: why).
EXCLUDE = {
    "bc984dcc-0670-450d-9217-281f218c7663": "Moroney's own completion of Contrapunctus XIV (the release's last track)",
}


def quarters():
    with open(os.path.join(ROOT, "data/touch/pieces.json")) as f:
        return {p["id"]: p["length"] / p["tpq"] for p in json.load(f)}


def mmss(s):
    s = round(s)
    return f"{s // 60}:{s % 60:02d}"


# D861: the preludes in two repeated halves (Bach's double bars; the Humdrum encoding's section labels,
# data/sources/bach-wtc/kern): where the second half begins, as (bar, quarter notes into it). The game plays
# each half once (II/10's first-time bar, 48a, too); a recording may play both repeats, or one only (Loesser's
# II/5 the first).
SECOND_HALF = {
    "wtc1p24": (18, 0), "wtc2p02": (13, 0), "wtc2p05": (17, 0), "wtc2p08": (17, 0), "wtc2p09": (25, 0),
    "wtc2p10": (49, 0), "wtc2p12": (28, 1), "wtc2p15": (17, 0), "wtc2p18": (25, 0), "wtc2p20": (17, 0),
    "wtc2p21": (33, 0),
}
# How many times each half is played.
PLAYS = {"AB": (1, 1), "AABB": (2, 2), "AAB": (2, 1), "ABB": (1, 2)}
PLAYS_NOTE = {"AB": "no repeats", "AABB": "both repeats", "AAB": "first repeat", "ABB": "second repeat"}


def halves(p):
    """A repeated prelude's two halves, in quarter notes (the game's length, split where the second begins)."""
    bar, extra = SECOND_HALF[p["id"]]
    on = next(b["on"] for b in p["bars"] if b["n"] == bar) / p["tpq"] + extra
    return on, p["length"] / p["tpq"] - on


def played(p, plays):
    """The quarter notes a performance plays, each half once or twice."""
    if p["id"] not in SECOND_HALF:
        return p["length"] / p["tpq"]
    a, b = halves(p)
    ka, kb = PLAYS[plays]
    return ka * a + kb * b


def resolve(p, rs):
    """D861: which recordings of a repeated prelude take the repeats. A duration alone cannot say, so each
    track is read both ways (each half once, or both twice; a single repeat is too rare to guess, and is
    kept only where the bar lines show it) and the reading nearer the recordings' common tempo kept: the
    centre (in log tempo) that the tracks' nearer readings lie closest to, found over a grid. The two
    readings are a factor 2 apart, so a track is misread only if it is 1.4 times off that centre."""
    known = [r for r in rs if r.get("plays")]
    free = [r for r in rs if not r.get("plays")]
    q1, q2 = played(p, "AB"), played(p, "AABB")
    logs = [(math.log(q1 * 60 / float(r["seconds"])), math.log(q2 * 60 / float(r["seconds"]))) for r in free]
    fixed = [math.log(played(p, r["plays"]) * 60 / float(r["seconds"])) for r in known]
    xs = [x for pair in logs for x in pair] + fixed
    lo, hi = min(xs), max(xs)
    cost = lambda c: sum(min(abs(a - c), abs(b - c)) for a, b in logs) + sum(abs(x - c) for x in fixed)  # noqa: E731
    c = min((lo + (hi - lo) * i / 2000 for i in range(2001)), key=cost)
    for r, (a, b) in zip(free, logs):
        r["plays"] = "AB" if abs(a - c) <= abs(b - c) else "AABB"
    return math.exp(c)


def preludes(raw, out):
    """D861: the preludes' rows, as main's for the fugues, each with the quarter notes it plays (its repeats)."""
    with open(os.path.join(ROOT, "data/touch/pieces.json")) as f:
        P = {p["id"]: p for p in json.load(f) if p["kind"] == "prelude"}
    uniq = keyboard_rows(raw)
    with open(os.path.join(ROOT, "data/recordings/ishizaka-book1.json")) as f:
        ish = json.load(f)
    for k, t in ish["bars"].items():
        if not k.endswith("p"):
            continue
        pid = f"wtc1p{k[5:7]}"
        if any(u["piece"] == pid and "Ishizaka" in u["performer"] for u in uniq):
            continue
        # her bar lines run once through the piece (I/24 too): no repeats
        uniq.append({"piece": pid, "performer": "Kimiko Ishizaka", "instrument": "piano", "date": "2015", "plays": "AB",
                     "seconds": round(t[-1] - t[0], 1), "source": ish["archive"], "title": "(bar lines, data/recordings)"})
    with open(os.path.join(ROOT, "data/recordings/loesser-book2.json")) as f:
        loe = json.load(f)
    for k, r in loe["bars"].items():
        if not k.endswith("p"):
            continue
        pid = f"wtc2p{k[5:7]}"
        t = r["t"] if isinstance(r, dict) else r
        plays = "AB"
        if pid in SECOND_HALF and isinstance(r, dict):
            # the bar lines in the order played: a half played twice goes back to its first bar
            back = [r["b"][i] for i in range(1, len(r["b"])) if r["b"][i] <= r["b"][i - 1]]
            first, second = any(b == 0 for b in back), any(b > 0 for b in back)
            plays = {(False, False): "AB", (True, True): "AABB", (True, False): "AAB", (False, True): "ABB"}[(first, second)]
        uniq.append({"piece": pid, "performer": "Arthur Loesser", "instrument": "piano", "date": "1964", "plays": plays,
                     "seconds": round(t[-1] - t[0], 1), "source": loe["archive"], "title": "(bar lines, data/recordings)"})
    final = []
    for pid in sorted(P):
        p = P[pid]
        rs = [u for u in uniq if u["piece"] == pid]
        if pid in SECOND_HALF:
            resolve(p, rs)
            a, b = halves(p)
            n2 = sum(u["plays"] != "AB" for u in rs)
            print(f"{pid}: halves of {a:g} + {b:g} quarters; {n2} of {len(rs)} read as taking repeats", file=sys.stderr)
        for u in rs:
            u.setdefault("plays", "AB")
        bpm = lambda u: played(p, u["plays"]) * 60 / float(u["seconds"])  # noqa: E731
        med = statistics.median(bpm(u) for u in rs)
        for u in rs:
            if not 0.5 <= bpm(u) / med <= 2.0:
                print(f"dropped {pid} {u['performer']} {u['seconds']}s ({bpm(u):.0f} vs median {med:.0f}): {u['title']}", file=sys.stderr)
                continue
            final.append(u)
    with open(out, "w", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["piece", "performer", "instrument", "year", "duration", "source", "quarters", "note"])
        for u in final:
            note = ["aligned bar lines (no final chord)"] if u["title"].startswith("(bar") else []
            if u["piece"] in SECOND_HALF:
                note.append(PLAYS_NOTE[u["plays"]])
            w.writerow([u["piece"], u["performer"], u["instrument"], (u["date"] or "")[:4], mmss(float(u["seconds"])),
                        u["source"], f"{played(P[u['piece']], u['plays']):g}", "; ".join(note)])
    print(len(final), "rows", file=sys.stderr)


def keyboard_rows(raw):
    """The raw rows played on a keyboard alone, one per recording (the earliest release of each)."""
    with open(raw) as f:
        rows = list(csv.DictReader(f))
    keep = []
    for r in rows:
        who = "; ".join(NAMES.get(n.strip(), n.strip()).replace("\u2010", "-") for n in r["performer"].split(";") if n.strip())
        inst = (r["instrument"] or INSTRUMENT.get(who, "")).lower()
        if not who or not any(k in inst for k in KEYBOARD):
            continue
        if "organ" in inst or ";" in who:  # an ensemble, or a keyboard with others
            continue
        if r["recording"] in EXCLUDE or re.search(r"complet|ergänz|vollend|reconstruct|ghielmi|tovey", r["title"], re.I):
            continue
        kind = next(k for k in KEYBOARD if k in inst)
        keep.append({**r, "performer": who, "instrument": {"cembalo": "harpsichord"}.get(kind, kind)})
    # one row per recording: the earliest release of each
    keep.sort(key=lambda r: (r["piece"], r["performer"], r["date"] or "9999"))
    uniq = []
    for r in keep:
        s = float(r["seconds"])
        if any(u["piece"] == r["piece"] and u["performer"] == r["performer"]
               and (u["recording"] == r["recording"] or abs(float(u["seconds"]) - s) <= max(3, 0.03 * s)) for u in uniq):
            continue
        uniq.append(r)
    return uniq


def main(raw, out):
    q = quarters()
    uniq = keyboard_rows(raw)
    # the repository's aligned recordings
    with open(os.path.join(ROOT, "data/recordings/ishizaka-book1.json")) as f:
        ish = json.load(f)
    for k, t in ish["bars"].items():
        if not k.endswith("f"):
            continue
        pid = f"wtc1f{k[5:7]}"
        if any(u["piece"] == pid and "Ishizaka" in u["performer"] for u in uniq):
            continue
        uniq.append({"piece": pid, "performer": "Kimiko Ishizaka", "instrument": "piano", "date": "2015",
                     "seconds": round(t[-1] - t[0], 1), "source": ish["archive"], "title": "(bar lines, data/recordings)"})
    with open(os.path.join(ROOT, "data/recordings/loesser-book2.json")) as f:
        loe = json.load(f)
    for k, r in loe["bars"].items():
        if not k.endswith("f"):
            continue
        t = r["t"] if isinstance(r, dict) else r
        uniq.append({"piece": f"wtc2f{k[5:7]}", "performer": "Arthur Loesser", "instrument": "piano", "date": "1964",
                     "seconds": round(t[-1] - t[0], 1), "source": loe["archive"], "title": "(bar lines, data/recordings)"})
    # drop the implausible
    final = []
    for pid in sorted({u["piece"] for u in uniq}):
        rs = [u for u in uniq if u["piece"] == pid]
        bpm = lambda u: q[pid] * 60 / float(u["seconds"])  # noqa: E731
        med = statistics.median(bpm(u) for u in rs)
        for u in rs:
            if not 0.5 <= bpm(u) / med <= 2.0:
                print(f"dropped {pid} {u['performer']} {u['seconds']}s ({bpm(u):.0f} vs median {med:.0f}): {u['title']}", file=sys.stderr)
                continue
            final.append(u)
    with open(out, "w", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["piece", "performer", "instrument", "year", "duration", "source", "note"])
        for u in final:
            w.writerow([u["piece"], u["performer"], u["instrument"], (u["date"] or "")[:4], mmss(float(u["seconds"])),
                        u["source"], "aligned bar lines (no final chord)" if u["title"].startswith("(bar") else ""])
    print(len(final), "rows", file=sys.stderr)


if __name__ == "__main__":
    (preludes if "--preludes" in sys.argv else main)(sys.argv[1], sys.argv[2])

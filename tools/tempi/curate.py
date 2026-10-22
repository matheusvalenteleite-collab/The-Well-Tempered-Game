"""
D199: from the raw MusicBrainz rows (tools/tempi/musicbrainz.py rows) to data/tempi/recordings.csv.

  python3 tools/tempi/curate.py RAW.csv data/tempi/recordings.csv

Keeps keyboard performances (piano, harpsichord, clavichord, fortepiano: the game's instruments;
organ, strings and ensembles are left out), one row per recording (a reissue whose duration is
within 3% (or 3 seconds) of one already kept, by the same performer, is the same recording), and drops tracks
whose tempo is less than half or more than twice the piece's median (a track mislabelled, or
a prelude and fugue on one track), printing what it dropped. Adds the two recordings the repository
aligned bar by bar (data/recordings): Ishizaka's Book I where MusicBrainz lacks it, Loesser's
Book II (one track holds a prelude and its fugue, so the fugue's span is read from the bar lines).
"""
import csv, json, os, re, statistics, sys

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


def main(raw, out):
    q = quarters()
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
    main(sys.argv[1], sys.argv[2])

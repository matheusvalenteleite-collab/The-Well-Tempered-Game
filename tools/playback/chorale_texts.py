"""P14: the chorales' words at their fermatas, for the chorale performance's "by context" reading.

Source: the Chorale-Corpus edition of Bach's chorales (github.com/Chorale-Corpus/Bach_JS; Gertim
Alberda's transcription of the Breitkopf chorales with their words; CC BY-NC-SA 4.0, as the game's
chorale encodings). Each of the game's chorales (data/sources/bach-370-chorales, chor001..chor370) is
matched to a piece of that edition by its soprano melody (intervals, so the key does not matter); the
syllables are carried onto the soprano's notes; at each soprano fermata the punctuation ending the
syllable sung there is kept, for every stanza line the edition gives ("." a sentence's end, ":" a
colon or semicolon, "," a comma, "" none), with the word.

Usage: clone the edition (git clone --depth 1 https://github.com/Chorale-Corpus/Bach_JS) and run
  python3 tools/playback/chorale_texts.py <path to Bach_JS>
Writes data/playback/chorale-fermatas.json.
"""
import csv, difflib, glob, json, os, re, sys
from fractions import Fraction

K = "data/sources/bach-370-chorales/kern"
C = sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-0/texts/ccbach"
PC = {"c": 0, "d": 2, "e": 4, "f": 5, "g": 7, "a": 9, "b": 11}


def kmidi(tok):
    m = re.search(r"([a-gA-G])\1*", tok)
    s = m.group(0)
    n = len(s)
    o = 4 + (n - 1) if s[0].islower() else 3 - (n - 1)
    return 12 * (o + 1) + PC[s[0].lower()] + tok.count("#") - tok.count("-")


def ksop(path):
    """The soprano's notes (a tied continuation merged), each with its fermata flag."""
    seq = []
    for line in open(path, encoding="utf-8", errors="replace"):
        if line.startswith(("!", "*", "=")):
            continue
        f = line.rstrip("\n").split("\t")
        if len(f) < 4:
            continue
        tok = f[3].split(" ")[0]
        if tok == "." or "r" in tok:
            continue
        if "]" in tok or "_" in tok:
            if ";" in tok and seq:
                seq[-1] = (seq[-1][0], True)
            continue
        seq.append((kmidi(tok), ";" in tok))
    return seq


def csop(p):
    """The edition's soprano notes, each with the syllables (one per stanza line) sung on it."""
    notes = [r for r in csv.DictReader(open(f"{C}/notes/{p}.notes.tsv", encoding="utf-8"), delimiter="\t") if r["staff"] == "1" and r["voice"] == "1" and r["tied"] not in ("0", "-1")]
    ch = list(csv.DictReader(open(f"{C}/chords/{p}.chords.tsv", encoding="utf-8"), delimiter="\t"))
    lc = [k for k in ch[0] if k.startswith("lyrics")]
    ly = {(x["mc"], x["mc_onset"]): [x[k] for k in lc] for x in ch if x["staff"] == "1" and x["voice"] == "1" and x["event"] == "Chord"}
    notes.sort(key=lambda r: (int(r["mc"]), Fraction(r["mc_onset"]), -int(r["midi"])))
    out, last = [], None
    for r in notes:
        k = (r["mc"], r["mc_onset"])
        if k == last:
            continue
        last = k
        out.append((int(r["midi"]), ly.get(k, [])))
    return out


def punct(s):
    s = s.strip()
    if re.search(r"[.!?][\"'»)]*$", s):
        return "."
    if re.search(r"[:;][\"'»)]*$", s):
        return ":"
    if re.search(r",[\"'»)]*$", s):
        return ","
    return ""


def join(syl):
    """Syllables into words: "mei-" "-nes" -> "meines"."""
    out = ""
    for x in syl:
        x = x.lstrip("-") if out.endswith("\x00") else (" " + x if out else x)
        out = out.replace("\x00", "")
        if x.endswith("-"):
            x = x[:-1] + "\x00"
        out += x
    return out.replace("\x00", "").strip()


iv = lambda s: [b - a for a, b in zip(s, s[1:])]
pieces = sorted(os.path.basename(p)[: -len(".notes.tsv")] for p in glob.glob(C + "/notes/*.notes.tsv"))
cso = {p: csop(p) for p in pieces}
civ = {p: iv([m for m, _ in cso[p]]) for p in pieces}
out = {}
for kf in sorted(glob.glob(K + "/chor*.krn")):
    c = os.path.basename(kf)[:-4]
    ks = ksop(kf)
    ki = iv([m for m, _ in ks])
    score, piece = max((difflib.SequenceMatcher(None, ki, civ[p], autojunk=False).ratio(), p) for p in pieces)
    if score < 0.8:
        continue
    cs = cso[piece]
    sm = difflib.SequenceMatcher(None, ki, civ[piece], autojunk=False)
    mp = {}
    for bl in sm.get_matching_blocks():
        for t in range(bl.size + 1):
            mp[bl.a + t] = bl.b + t
    fermatas, last, sung = [], None, {}
    for i, (m, ferm) in enumerate(ks):
        j = mp.get(i)
        if j is not None and cs[j][1] and any(x.strip() for x in cs[j][1]):
            last = cs[j][1]
            for k, x in enumerate(cs[j][1]):
                if x.strip():
                    sung.setdefault(k, []).append(x.strip())
        if ferm:
            lines = [x.strip() for x in (last or [])]
            # The words of the line ending here, in each stanza line that sings it (the guide quotes them).
            text = [join(sung[k]) if sung.get(k) else None for k in range(len(lines))]
            sung = {}
            fermatas.append({"punct": [punct(x) if x else None for x in lines], "word": next((x for x in lines if x), ""), "line": text})
    out[c] = {"piece": piece, "match": round(score, 3), "fermatas": fermatas}
os.makedirs("data/playback", exist_ok=True)
json.dump(
    {
        "source": "Chorale-Corpus, Bach_JS (Gertim Alberda's transcription; github.com/Chorale-Corpus/Bach_JS), CC BY-NC-SA 4.0",
        "note": "Per chorale, each soprano fermata in order: the punctuation ending the syllable sung there in every stanza line ('.', ':', ',', '' none; null: no words in that line) and the first line's word; and the line's words in each stanza line (line).",
        "chorales": out,
    },
    open("data/playback/chorale-fermatas.json", "w", encoding="utf-8"),
    ensure_ascii=False,
    separators=(",", ":"),
)
print(len(out), "chorales with words")

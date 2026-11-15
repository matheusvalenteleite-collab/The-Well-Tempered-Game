"""The Art of Fugue's 20 pictures (D669, design studio): the Constellation, one picture in twenty variations.

The owner: names, pictures and worlds for the WTC 48 only; every other work one setting, its tiles "subtle variations
in the common idea". So each tile is the work's one scene (stage-bg.ts `constellation`): a sky over a dark town of
narrow gabled houses and one church tower, and in the sky the piece's own subject as a figure of stars, read from
the score (its first entry's notes: pitch up, time across). What varies is the music's own: the figure (plain,
inverted, varied, the new subjects of 8, 9 and 10), the light along the cycle (dusk at Contrapunctus 1, deep night at
XIV), the mirror fugues' river, a canon's two voices (the follower below in gold; turned over and wider in the canon
by augmentation in contrary motion, as written), and XIV's figure breaking off. The D664 pictures are in git history.
"""
import json
import os

from lib import *  # noqa: F401,F403

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ORDER = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12r", "12i", "13r", "13i", "c14", "c15", "c16", "c17", "14"]
# stage-bg.ts AOF_SKY: the cycle's four lights (top, horizon).
SKY = [((60, 70, 120), (236, 176, 130)), ((90, 130, 190), (206, 214, 222)), ((60, 50, 100), (226, 130, 86)), ((12, 16, 40), (36, 42, 80))]
TOWN = (13, 13, 24)
WIN = (232, 186, 110)
STAR = (240, 244, 255)
GOLD_STAR = (250, 224, 170)

_entries = {}


def entries(pid):
    """The piece's entries in time order ([on, dur, midi] notes), from the game's own data."""
    if not _entries:
        for name in ("data/touch/more-bach.json", "data/touch/pieces.json"):
            for f in json.load(open(os.path.join(ROOT, name), encoding="utf8")):
                if f.get("id", "").startswith("bwv1080-"):
                    _entries[f["id"]] = sorted(f.get("entries", []), key=lambda e: e["on"])
    return _entries.get(pid, [])


def sky_of(pid):
    i = ORDER.index(pid.replace("bwv1080-", ""))
    u = min(19, 8 + i * 0.6) / 19 * 3
    a = min(2, int(u))
    t = u - a
    return mix(SKY[a][0], SKY[a + 1][0], t), mix(SKY[a][1], SKY[a + 1][1], t)


def h(n):
    """stage-bg.ts-style deterministic noise in [0, 1)."""
    x = math.sin(n * 127.1 + 311.7) * 43758.5453
    return x - math.floor(x)


def blend(p, x, y, c, k):
    x, y = int(round(x)), int(round(y))
    if 0 <= x < W and 0 <= y < H:
        r, g, b, _ = p.get(x, y)
        p.set(x, y, mix((r, g, b), c, k))


def figure(p, notes, x, y, w, hh, star, cut=1.0):
    """A figure of stars: one at each note's onset, joined by a faint line; up to `cut` of its length."""
    if not notes:
        return
    on0 = notes[0][0]
    span = max(1, notes[-1][0] + notes[-1][1] - on0)
    lo = min(n[2] for n in notes)
    hi = max(n[2] for n in notes)
    pts = []
    for on, _dur, m, *_ in notes:
        if on - on0 > span * cut:
            break
        pts.append((x + (on - on0) / span * w, y + (hi - m) / max(1, hi - lo) * hh))
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            blend(p, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, star, 0.4)
    for sx, sy in pts:
        sx, sy = int(round(sx)), int(round(sy))
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
            blend(p, sx + dx, sy + dy, star, 1.0 if (dx, dy) == (0, 0) else 0.32)


def town(p, ground):
    x, r = -2, 0
    while x < W + 4:
        rw = 5 + int(h(r + 40) * 4)
        wh = 3 + int(h(r + 41) * 4)
        top = ground - wh
        p.rect(x, top, rw, wh + 1, TOWN)
        if h(r + 43) > 0.5:
            p.poly([(x, top), (x + rw / 2 - 0.5, top - 3), (x + rw - 1, top)], TOWN)
        else:
            p.rect(x + 1, top - 1, rw - 2, 1, TOWN)
            p.rect(x + 2, top - 2, max(1, rw - 4), 1, TOWN)
        if h(r * 5 + 44) > 0.55:
            p.set(x + 2, top + 1, WIN)
        x += rw + 1
        r += 1
    tx = 40
    p.rect(tx, ground - 13, 4, 13, TOWN)
    p.rect(tx - 1, ground - 13, 6, 1, TOWN)
    p.poly([(tx, ground - 13), (tx + 1.5, ground - 19), (tx + 3, ground - 13)], TOWN)
    p.set(tx + 1, ground - 10, WIN)
    p.rect(0, ground, W, H - ground, TOWN)


def picture(pid):
    top, low = sky_of(pid)
    p = Pix()
    mirror = pid.endswith("i")
    ground = 25 if mirror else 33
    t0 = mix(top, (6, 8, 22), 0.5)
    p.vgrad(0, 0, W, ground, [mix(t0, low, i / 7) for i in range(8)])
    for i in range(16):
        x, y = int(h(i + 300) * W), int(h(i + 500) * (ground - 6))
        blend(p, x, y, STAR, 0.25 + 0.4 * h(i + 700))
    es = entries(pid)
    canon = "-c" in pid
    cut = 0.7 if pid == "bwv1080-14" else 1.0
    if es:
        if canon:
            figure(p, es[0]["notes"][:14], 13, 2, 34, 8, STAR)
            if len(es) > 1:
                wide = pid.endswith("c14")
                figure(p, es[1]["notes"][:14], 8 if wide else 13, 12, 44 if wide else 34, 8, GOLD_STAR)
        else:
            figure(p, es[0]["notes"], 13, 3, 34, 13 if not mirror else 11, STAR, cut)
    town(p, ground)
    if mirror:
        # the river: the sky reflected, darker, a line of light at its edge
        for y in range(ground + 2, H):
            sy = 2 * (ground + 1) - y
            for x in range(W):
                r, g, b, _ = p.get(x, max(0, sy))
                p.set(x, y, mix((r, g, b), (8, 10, 24), 0.55))
        p.hline(0, W - 1, ground + 1, mix(low, (8, 10, 24), 0.4))
    return p


PICTURES = {f"bwv1080-{x}": (lambda pid: (lambda: picture(pid)))(f"bwv1080-{x}") for x in ORDER}

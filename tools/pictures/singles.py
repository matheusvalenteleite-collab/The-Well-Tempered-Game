"""The single works' pictures (D672-D675, design studio): one setting per work, its tiles its variations (D668).

BWV 903, the Chromatic Fugue (the owner: the Fugue alone): THE LIGHTHOUSE (stage-bg.ts `lighthouse`). A night sea under
heavy cloud, a lighthouse on a dark headland, its beam swept across the water toward a ship's lights far out.

BWV 951, the Fugue on a Theme by Albinoni: THE LAGOON (stage-bg.ts `lagoon`). Dusk on still water, a far city of low
roofs, domes and a bell tower on the horizon, and the line of mooring posts running out toward it, every lantern lit
(each entry lights one), their light trembling in the water.
"""
from lib import *  # noqa: F401,F403

SEA = (16, 22, 36)
NIGHT = (22, 24, 42)
CLOUD = (44, 48, 68)
TOWN = (8, 9, 14)


def lighthouse(beam=True):
    p = Pix()
    p.vgrad(0, 0, W, 24, [(18, 20, 36), (30, 32, 52), (52, 54, 76), (64, 66, 88)])
    for cx, cy, r in ((8, 6, 5), (16, 4, 6), (26, 7, 5), (48, 5, 6), (58, 8, 5), (36, 3, 4)):
        p.disc(cx, cy, r, CLOUD)
    p.disc(22, 11, 2.5, (200, 206, 222))
    p.rect(0, 24, W, 16, SEA)
    for y in range(26, 40, 3):
        for x in range((y * 7) % 9, W, 9):
            p.hline(x, x + 3, y, (40, 50, 74))
    # the ship
    p.rect(12, 23, 7, 1, TOWN)
    p.vline(15, 18, 23, TOWN)
    p.set(12, 22, (255, 216, 144))
    p.set(18, 22, (255, 122, 106))
    # the headland and the tower
    p.poly([(36, 40), (40, 29), (45, 27), (54, 27), (60, 31), (63, 40)], TOWN)
    for b in range(6):
        p.rect(46, 9 + b * 3, 4, 3, (168, 58, 50) if b % 2 else (216, 210, 196))
    p.rect(45, 27, 6, 1, TOWN)
    p.rect(45, 8, 6, 1, (26, 26, 32))
    p.rect(46, 5, 4, 3, (26, 26, 32))
    p.set(47, 4, (26, 26, 32))
    p.set(48, 4, (26, 26, 32))
    p.rect(47, 6, 2, 1, (255, 226, 150))
    if beam:
        for i in range(1, 34):
            y0 = 6 + i * 0.5
            for dy in range(-1 - i // 10, 2 + i // 10):
                yy = int(y0 + dy)
                x = 47 - i
                if 0 <= x < W and 0 <= yy < H:
                    r, g, b, _ = p.get(x, yy)
                    k = 0.42 * (1 - i / 36)
                    p.set(x, yy, mix((r, g, b), (255, 226, 150), k))
    return p


def lagoon():
    p = Pix()
    p.vgrad(0, 0, W, 21, [(60, 62, 112), (110, 84, 122), (190, 120, 118), (232, 150, 120)])
    city = (42, 34, 54)
    for x0, w0, h0 in ((4, 8, 2), (12, 7, 3), (19, 9, 2), (28, 6, 3), (34, 8, 2), (42, 7, 3), (49, 9, 2), (58, 6, 2)):
        p.rect(x0, 21 - h0, w0, h0, city)
    p.disc(26, 18, 2.5, city)
    p.disc(37, 18, 2, city)
    p.rect(42, 10, 2, 11, city)
    p.set(42, 9, city)
    p.set(43, 9, city)
    for x in (8, 15, 30, 47, 53):
        p.set(x, 19, (255, 210, 140))
    p.vgrad(0, 21, W, 19, [(118, 80, 98), (60, 48, 78), (24, 24, 44)])
    for y in range(23, 40, 3):
        for x in range((y * 5) % 11, W, 11):
            p.hline(x, x + 3, y, (150, 110, 120))
    for i in range(9):
        d = (i / 8) ** 0.8
        x = int(10 + 36 * d)
        base = int(38 - 17 * d)
        hh = max(2, int(9 - 6 * d))
        p.vline(x, base - hh, base, (30, 20, 16))
        if hh > 4:
            p.vline(x - 1, base - hh + 1, base, (30, 20, 16))
            p.vline(x + 1, base - hh + 1, base, (30, 20, 16))
        p.set(x, base - hh - 1, (255, 214, 140))
        for j in range(1, 4):
            if base + j * 2 < H:
                p.set(x, base + j * 2, (200, 150, 110))
    return p


PICTURES = {"bwv903-2": lambda: lighthouse(True), "bwv951": lagoon}


def scaffold(fugue):
    """BWV 906, the Fantasia and Fugue in C minor: THE SCAFFOLD (stage-bg.ts `scaffold`). A church front being built at
    dusk inside its timber scaffold, the crane at the side. The Fantasia's tile: the gable's first courses, two masons'
    torches on the boards. The Fugue's: the gable higher, unfinished, the last stone hanging on the crane's rope."""
    p = Pix()
    p.vgrad(0, 0, W, 34, [(40, 34, 70), (90, 60, 90), (200, 116, 88)])
    p.rect(0, 34, W, 6, (42, 34, 32))
    st = (138, 122, 104)
    p.rect(20, 22, 24, 12, st)
    for y in range(24, 34, 3):
        for x in range(20 + (y % 2) * 2, 44, 5):
            p.set(x, y, (100, 88, 74))
    p.rect(30, 27, 4, 7, (42, 30, 24))
    p.set(31, 26, (42, 30, 24))
    p.set(32, 26, (42, 30, 24))
    p.line(20, 22, 32, 6, (150, 136, 126))
    p.line(44, 22, 32, 6, (150, 136, 126))
    rows = 4 if not fugue else 9
    for r in range(rows):
        y = 21 - r * 1.7
        half = 12 * (1 - (r + 1) / 10)
        p.rect(32 - half, y, half * 2, 2, st if r % 2 else (130, 114, 96))
    wood = (96, 66, 40)
    for x in (18, 26, 38, 46):
        p.vline(x, 8, 33, wood)
    for y in (21, 15, 10):
        p.hline(17, 47, y, wood)
    p.vline(52, 4, 33, wood)
    p.hline(30, 52, 4, wood)
    p.ring(52, 30, 3, wood)
    if fugue:
        p.vline(41, 5, 8, (26, 20, 16))
        p.rect(39, 9, 5, 3, (170, 154, 132))
        p.hline(39, 43, 8, (40, 30, 24))
        p.set(17, 13, (160, 96, 42))
    else:
        for x, y in ((22, 13), (41, 8)):
            p.vline(x, y + 1, y + 3, (60, 42, 26))
            p.set(x, y, (255, 210, 110))
            p.set(x, y - 1, (255, 240, 180))
    return p


PICTURES["bwv906-1"] = lambda: scaffold(False)
PICTURES["bwv906-2"] = lambda: scaffold(True)


def workshop(mv):
    """BWV 998, the Prelude, Fugue and Allegro in E-flat ("pour la luth ò cembal"): THE LUTE-MAKER'S WORKSHOP
    (stage-bg.ts `workshop`). Warm panelling, a lute on the wall, a window onto a garden, and on the bench a lute
    being finished. The three tiles: the window's light (morning, afternoon, evening) and the lute's strings (none
    in the Prelude, half strung in the Fugue, all in the Allegro, its rose catching the evening light)."""
    sky, sun = {1: ((190, 214, 236), (255, 236, 190)), 2: ((150, 190, 230), (255, 214, 150)), 3: ((230, 150, 110), (255, 170, 110))}[mv]
    p = Pix((58, 40, 24))
    for x in range(0, W, 6):
        p.vline(x, 0, 29, (44, 30, 18))
    p.rect(6, 4, 14, 16, sky)
    p.rect(6, 15, 14, 5, mix((80, 130, 70), sky, 0.25))
    p.rect(5, 3, 16, 1, (90, 60, 34))
    p.rect(5, 20, 16, 2, (90, 60, 34))
    p.vline(5, 3, 21, (90, 60, 34))
    p.vline(20, 3, 21, (90, 60, 34))
    p.vline(13, 4, 19, (90, 60, 34))
    p.hline(6, 19, 11, (90, 60, 34))

    def lute(cx, cy, r, wood, rose):
        p.ell(cx, cy, r, r * 0.8, wood)
        p.rect(cx - r * 2.2, cy - 1, r * 1.3, 2, wood)
        p.rect(cx - r * 2.4, cy - 3, 2, 3, wood)
        p.disc(cx - r * 0.15, cy, r * 0.28, rose)

    lute(46, 8, 5, (138, 90, 42), (42, 26, 16))
    for i in range(5):
        p.vline(30 + i * 2, 20, 23 + i % 2, (150, 150, 150) if i % 2 else (106, 74, 42))
    p.rect(0, 30, W, 10, (90, 58, 30))
    p.hline(0, W - 1, 30, (122, 82, 48))
    for i in range(10):
        p.hline(6 + (i * 7) % 50, 8 + (i * 7) % 50, 33 + i % 5, (230, 190, 130))
    for y in range(31, 38):
        for x in range(24 + (y - 31), 44 + (y - 31)):
            if (x + y) % 2 == 0:
                r, g, b, _ = p.get(x, y)
                p.set(x, y, mix((r, g, b), sun, 0.35))
    rose = (255, 214, 140) if mv == 3 else (42, 26, 16)
    lute(44, 27, 7, (176, 122, 62), rose)
    for y in {1: (), 2: (27,), 3: (26, 28)}[mv]:
        p.hline(29, 49, y, (240, 230, 200))
    p.vline(49, 25, 29, (58, 36, 20))
    return p


PICTURES["bwv998-1"] = lambda: workshop(1)
PICTURES["bwv998-2"] = lambda: workshop(2)
PICTURES["bwv998-3"] = lambda: workshop(3)

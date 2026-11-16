"""The single works' pictures (D672 on, design studio): one setting per work, its tiles its variations (D668).

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

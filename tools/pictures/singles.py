"""The single works' pictures (D672 on, design studio): one setting per work, its tiles its variations (D668).

BWV 903, the Chromatic Fugue (the owner: the Fugue alone): THE LIGHTHOUSE (stage-bg.ts `lighthouse`). A night sea under
heavy cloud, a lighthouse on a dark headland, its beam swept across the water toward a ship's lights far out.
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


PICTURES = {"bwv903-2": lambda: lighthouse(True)}

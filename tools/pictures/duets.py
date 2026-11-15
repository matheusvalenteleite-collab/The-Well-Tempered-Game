"""The Four Duets' 4 pictures (D671, design studio): the Gallery, one picture in four variations.

The owner's rule (D668): one setting per work, its tiles "subtle variations in the common idea". Each tile is the
work's one scene (stage-bg.ts `gallery`): a church's organ gallery at night, a pointed window of stained glass, the
pipes at either side, the rail, and on the music desk an open book with two candles, one for each voice. What
varies: the window's glass, in the duet's own colours (stage-bg.ts DUET_GLASS: E minor, F major, G major, A minor),
and which candle burns the higher (the upper voice's in the odd duets, the lower's in the even).
"""
from lib import *  # noqa: F401,F403

GLASS = {
    "bwv802": [(70, 80, 170), (120, 70, 150), (40, 110, 150)],
    "bwv803": [(200, 160, 60), (80, 140, 80), (190, 90, 60)],
    "bwv804": [(220, 140, 70), (200, 90, 110), (230, 190, 110)],
    "bwv805": [(50, 60, 140), (160, 40, 60), (90, 70, 150)],
}
WALL = (30, 27, 38)
LEAD = (14, 12, 20)


def picture(pid, n):
    p = Pix(WALL)
    p.vgrad(0, 0, W, 30, [(24, 22, 30), (34, 30, 40)])
    for y in range(2, 30, 4):
        for x in range((y // 4) % 2 * 4, W, 8):
            p.set(x, y, (40, 36, 48))
    # the window
    g = GLASS[pid]
    p.rect(25, 7, 14, 21, LEAD)
    p.poly([(25, 7), (32, 1), (39, 7)], LEAD)
    for r in range(6):
        for c in range(3):
            col = light(g[(r + c) % 3], 0.1)
            p.rect(26 + c * 4, 8 + r * 3, 3, 2, col)
    p.poly([(27, 7), (32, 3), (37, 7)], light(g[0], 0.2))
    p.rect(25, 7, 14, 1, LEAD)
    # the pipes
    for side in (0, 1):
        for i in range(5):
            x = (48 + i * 3) if side else (14 - i * 3)
            top = 12 + abs(2 - i) * 2
            p.rect(x, top, 2, 29 - top, (104, 96, 82))
            p.set(x, top, (160, 150, 124))
            p.rect(x, 24, 2, 1, (60, 52, 40))
    # the rail and the desk
    p.rect(0, 30, W, 10, (42, 30, 22))
    p.hline(0, W - 1, 30, (74, 54, 36))
    for x in range(1, W, 4):
        p.rect(x, 32, 2, 8, (60, 44, 32))
    p.rect(24, 28, 16, 2, (90, 64, 48))
    p.rect(26, 26, 5, 2, (232, 220, 192))
    p.rect(33, 26, 5, 2, (220, 208, 176))
    high = 0 if n % 2 == 1 else 1
    for v, x in ((0, 22), (1, 41)):
        p.rect(x, 23, 2, 5, (232, 224, 200))
        fh = 3 if v == high else 2
        for dx, dy in ((-1, 0), (2, 0), (0, -1 - fh), (1, -1 - fh)):
            p.set(x + dx, 22 - (0 if dy == 0 else fh) + (0 if dy == 0 else 0), (120, 90, 56))
        p.rect(x, 23 - fh, 2, fh, FIRE_L)
        p.set(x, 22 - fh, (255, 244, 200))
    return p


PICTURES = {f"bwv{801 + n}": (lambda pid, n: (lambda: picture(pid, n)))(f"bwv{801 + n}", n) for n in range(1, 5)}

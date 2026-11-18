"""The Goldberg Variations' 31 pictures (D677, design studio): THE NIGHT WATCH, one picture in 31 variations.

The owner's rule (D668): one setting per work, its tiles "subtle variations in the common idea"; the owner picked the
Night Watch. Each tile is the work's one room (stage-bg.ts `nightWatch`): a two-manual harpsichord, its lid open, by
a tall window, through one night. What varies is the hour: the Aria at evening, the lamp lit; each variation further
into the night (the sky, the stars, the moon crossing the window); the G-minor variations (15, 21, 25) the darkest,
25 lit by one candle; 16, the Ouverture, the curtains drawn open; 30, the Quodlibet, first light and a lit window
across the way. The canons (each third variation) have two candles on the desk, the second set higher by the canon's
interval (the unison at 3 to the ninth at 27).
"""
from lib import *  # noqa: F401,F403

KEYS = [(0, (70, 74, 124), (232, 150, 112)), (6, (26, 30, 70), (70, 60, 100)), (15, (14, 16, 42), (34, 34, 64)),
        (25, (8, 10, 26), (18, 20, 40)), (28, (24, 30, 66), (90, 80, 110)), (30, (110, 140, 196), (252, 204, 150))]
MINOR = {15, 21, 25}


def sky(n):
    i = 0
    while i < len(KEYS) - 2 and KEYS[i + 1][0] <= n:
        i += 1
    a, t0, l0 = KEYS[i]
    b, t1, l1 = KEYS[i + 1]
    u = max(0, min(1, (n - a) / max(1, b - a)))
    top, low = mix(t0, t1, u), mix(l0, l1, u)
    if n in MINOR:
        top, low = mix(top, (0, 0, 0), 0.35), mix(low, (0, 0, 0), 0.35)
    return top, low


def picture(n):
    top, low = sky(n)
    p = Pix((30, 22, 30))
    for x in range(0, W, 5):
        p.vline(x, 0, 32, (24, 18, 26))
    p.rect(0, 33, W, 7, (46, 32, 24))
    for x in range(0, W, 4):
        p.set(x + (2 if (x // 4) % 2 else 0), 36, (36, 24, 18))
    # the window
    p.vgrad(6, 3, 14, 24, [top, mix(top, low, 0.5), low])
    dark = max(0, min(1, 1 - abs(n - 20) / 14))
    for i in range(10):
        if (i * 37 % 10) / 10 < 0.3 + 0.7 * dark:
            p.set(7 + (i * 7) % 12, 4 + (i * 5) % 14, (230, 232, 250))
    if 2 < n < 29:
        mu = (n - 3) / 25
        p.disc(8 + 10 * mu, 10 - 4 * math.sin(mu * math.pi), 1.4, (236, 232, 214))
    if n == 30:
        p.rect(14, 19, 5, 5, (42, 34, 48))
        p.set(16, 21, (255, 210, 140))
    fr = (74, 52, 36)
    p.rect(5, 2, 16, 1, fr)
    p.rect(5, 27, 16, 2, fr)
    p.vline(5, 2, 28, fr)
    p.vline(20, 2, 28, fr)
    p.vline(13, 3, 26, fr)
    p.hline(6, 19, 15, fr)
    cw = 1 if n == 16 else 3
    p.rect(3, 1, cw + 2, 29, (90, 34, 40))
    p.rect(21 - cw, 1, cw + 2, 29, (90, 34, 40))
    # the harpsichord, its lid open
    p.poly([(30, 24), (59, 13), (61, 14), (61, 25)], (205, 185, 142))
    p.poly([(28, 24), (61, 25), (61, 29), (28, 29)], (106, 42, 36))
    p.hline(28, 60, 26, (208, 160, 80))
    p.rect(25, 24, 4, 1, (236, 228, 208))
    p.rect(25, 26, 4, 1, (236, 228, 208))
    for x in (30, 44, 59):
        p.vline(x, 30, 33, (74, 30, 26))
    p.rect(30, 20, 5, 4, (232, 220, 192))

    def candle(x, y, hgt):
        p.vline(x, y - hgt, y, (232, 224, 200))
        p.set(x, y - hgt - 1, (255, 224, 138))
        p.set(x, y - hgt - 2, (255, 244, 200))

    if n == 25:
        candle(37, 23, 3)
    elif n % 3 == 0 and 0 < n < 30:
        step = n // 3
        candle(28, 23, 3)
        candle(37, 23, 3 + (step + 1) // 2)
    else:
        p.vline(23, 22, 33, (42, 30, 20))
        p.rect(21, 18, 5, 4, (255, 226, 160))
        p.set(23, 17, (255, 244, 200))
    return p


PICTURES = {f"bwv988-{n:02d}": (lambda n: (lambda: picture(n)))(n) for n in range(31)}

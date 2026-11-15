"""The Inventions and Sinfonias' 30 pictures (D670, design studio): the Songbirds, one picture in thirty variations.

The owner's rule (D668): every work other than the WTC one setting, its tiles "subtle variations in the common idea".
Each tile is the work's one scene (stage-bg.ts `songbirds`): a branch across a garden sky over a hedge and a stone
wall, and on it one bird for each voice, each in its voice's colour in the box (voice-inks.ts): two in an Invention,
three in a Sinfonia. What varies is the piece's own: the number of birds, the season by its key's place in the book
(the books share their fifteen keys, C major to B minor: spring blossom to late autumn), day for a major key and
evening for a minor one.
"""
from lib import *  # noqa: F401,F403

KEYS = ["C", "c", "D", "d", "Eb", "E", "e", "F", "f", "G", "g", "A", "a", "Bb", "b"]
# voice-inks.ts INKS
INKS = {2: [(0x5C, 0xB2, 0xFF), (0x5F, 0xE0, 0x8A)], 3: [(0x5C, 0xB2, 0xFF), (0xFF, 0x8C, 0x4A), (0x5F, 0xE0, 0x8A)]}
BIRD = ["....bbb..", "...bbkbyy", "...bbbbb.", ".dddbwwb.", "ddddwwwb.", ".dddwww..", "...l.l...", "...l.l..."]
BRANCH = (58, 42, 30)


def light_of(n, minor):
    """stage-bg.ts songLight."""
    u = n / 14
    top = mix((70, 90, 140), (40, 40, 80), u) if minor else mix((120, 170, 220), (110, 140, 190), u)
    low = mix((220, 170, 150), (210, 130, 90), u) if minor else mix((235, 236, 220), (240, 210, 160), u)
    leaf = (120, 170, 90) if u < 0.3 else (70, 130, 60) if u < 0.65 else (200, 120, 50) if u < 0.9 else (150, 90, 50)
    return top, low, leaf, ((250, 225, 235) if u < 0.3 else None)


def picture(n, sin):
    minor = KEYS[n][0].islower()
    top, low, leaf, bloom = light_of(n, minor)
    p = Pix()
    p.vgrad(0, 0, W, 31, [mix(top, low, i / 6) for i in range(7)])
    hedge = mix(leaf, (20, 30, 20), 0.62)
    p.rect(0, 30, W, 6, hedge)
    for x in range(0, W, 5):
        p.disc(x + 2, 30, 2.2, hedge)
    p.rect(0, 35, W, 5, (90, 74, 62))
    for x in range(0, W, 6):
        p.set(x + (2 if (x // 6) % 2 else 0), 37, (70, 58, 48))
    p.hline(0, W - 1, 35, (110, 92, 78))

    def by(x):
        return 27 - (x - 6) * 0.07 + math.sin(x * 0.2) * 0.8

    for x in range(0, 60):
        p.set(x, by(x), BRANCH)
        p.set(x, by(x) + 1, BRANCH)
        if x < 30:
            p.set(x, by(x) + 2, BRANCH)
    for x0, dx, dy in ((18, 5, -3), (32, 4, 2), (44, 4, -3)):
        p.line(x0, by(x0), x0 + dx, by(x0) + dy, BRANCH)
    for i in range(26):
        x = int(2 + 56 * ((i * 37) % 26) / 26)
        y = by(x) + ((i * 13) % 5) - 2
        c = bloom if bloom and i % 2 else mix(leaf, (0, 0, 0), 0.15 * (i % 3))
        p.set(x, y, c)
        p.set(x + 1, y, c)
    nb = 3 if sin else 2
    xs = [22, 40] if nb == 2 else [15, 31, 47]
    for v, x in enumerate(xs):
        c = INKS[nb][v]
        ink = {"b": c, "d": dark(c, 0.45), "w": light(c, 0.6), "k": (16, 16, 24), "y": (240, 192, 64), "l": BRANCH}
        y = int(round(by(x))) - 5
        p.stamp(BIRD, ink, x - 4, y - 2, flip=bool(v % 2))
    return p


PICTURES = {}
for _n in range(15):
    PICTURES[f"bwv{772 + _n}"] = (lambda n: (lambda: picture(n, False)))(_n)
    PICTURES[f"bwv{787 + _n}"] = (lambda n: (lambda: picture(n, True)))(_n)

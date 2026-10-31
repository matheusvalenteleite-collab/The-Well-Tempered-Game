"""Book II: 24 more characters (D383; the names and their reasons in fugue-names.ts).

The same language as Book I: one character big in the frame, one pose, one prop, on the key's ground,
the subject in the scene only where it falls naturally (II/2's one stone twice the size, II/3's threads,
II/13's trill, II/14's three flasks for three subjects, II/18's two dancers for two subjects).
"""
import math
from lib import *  # noqa: F401,F403
from people import *  # noqa: F401,F403


def g07():
    """THE ORGANIST: an organist at the console under tall pipes (the choral fugue of long notes; Bodky: best on the organ)."""
    k = Key("Eb")
    p = Pix()
    room = k.c(-0.06, -0.15)
    p.rect(0, 0, W, H, room)
    # the pipes: a row of tall gold pipes in a case, tallest in the middle
    case = (100, 64, 40)
    p.rect(14, 0, 50, 24, case)
    p.hline(14, 63, 23, light(case, 0.2))
    for i in range(11):
        x = 17 + i * 4
        hgt = 20 - abs(i - 5) * 2
        top = 22 - hgt
        p.rect(x, top, 3, hgt, (230, 196, 100))
        p.vline(x, top, 21, (255, 236, 160))
        p.vline(x + 2, top, 21, (180, 140, 60))
        p.poly([(x, 22), (x + 1, 24), (x + 2, 22)], (180, 140, 60))
        p.hline(x, x + 2, 18, INK)
    # the console: manuals and stops
    p.rect(26, 26, 34, 9, (70, 44, 30))
    p.rect(28, 27, 30, 2, WHITE)
    for x in range(28, 58, 2):
        p.set(x, 27, INK)
    p.rect(28, 30, 30, 2, WHITE)
    for x in range(29, 58, 2):
        p.set(x, 30, INK)
    for x in (27, 59):
        p.disc(x, 25, 1, (200, 60, 60))
    p.rect(26, 35, 34, 5, (56, 34, 24))
    m = Pix()
    coat, coat_d = (60, 50, 110), (40, 34, 80)
    cx = 18
    m.poly([(cx - 5, 34), (cx - 4, 20), (cx + 4, 19), (cx + 6, 34)], coat)
    m.poly([(cx + 1, 19), (cx + 4, 19), (cx + 6, 34), (cx + 2, 34)], coat_d)
    m.rect(cx - 6, 34, 14, 2, (110, 70, 40))  # the bench
    face(m, cx, 14, SKIN, r=3, look=1)
    m.hline(cx - 3, cx + 2, 11, (236, 236, 236))  # wig
    m.disc(cx - 3, 14, 1.8, (236, 236, 236))
    m.disc(cx - 3, 17, 1.4, (220, 220, 224))
    m.thick(cx + 4, 22, cx + 10, 27, coat, 2)  # hands on the keys
    m.set(cx + 11, 27, SKIN)
    m.thick(cx + 2, 24, cx + 10, 30, coat_d, 1)
    m.set(cx + 11, 30, SKIN)
    m.line(cx + 1, 34, cx + 5, 38, INK)  # a foot on the pedals
    p.paste(m)
    # long notes sounding: soft bars of light from the pipes
    for x, y in ((6, 6), (8, 10), (4, 14)):
        p.hline(x, x + 4, y, light(room, 0.4))
    return p


def g11():
    """THE BUTTERFLY: a butterfly over the flowers, its path looping (delicate charm, fleeting and light; Bodky's wing-line theme)."""
    k = Key("F")
    p = Pix()
    sky(p, k, 0, 30, lift=0.18)
    meadow = (120, 186, 96)
    p.rect(0, 30, W, 10, meadow)
    p.hline(0, W - 1, 30, light(meadow, 0.3))
    for i, x in enumerate(range(3, W, 7)):
        y = 30 + (i * 3) % 6
        p.vline(x, y, y + 6, GREEN_D)
        c = [(250, 120, 140), (250, 220, 90), (255, 255, 255), (190, 140, 250)][i % 4]
        p.disc(x, y - 1, 1.3, c)
        p.set(x, y - 1, GOLD)
    # the looping flight, dotted
    pts = [(2 + t, 20 + 6 * math.sin(t / 5) - (t > 14) * 4 * math.sin((t - 14) / 3)) for t in range(0, 22)]
    for i, (x, y) in enumerate(pts):
        if i % 2 == 0:
            p.set(x, y, WHITE)
    b = Pix()
    wing, wing_d, spot = (250, 150, 50), (210, 96, 30), (40, 30, 30)
    cx, cy = 38, 17
    # upper wings large, lower smaller, a dark edge with white dots
    b.poly([(cx, cy), (cx - 12, cy - 11), (cx - 15, cy - 6), (cx - 11, cy + 1)], wing)
    b.poly([(cx, cy), (cx + 12, cy - 11), (cx + 15, cy - 6), (cx + 11, cy + 1)], wing)
    b.poly([(cx, cy + 1), (cx - 9, cy + 3), (cx - 8, cy + 9), (cx - 2, cy + 6)], wing_d)
    b.poly([(cx, cy + 1), (cx + 9, cy + 3), (cx + 8, cy + 9), (cx + 2, cy + 6)], wing_d)
    b.line(cx - 12, cy - 11, cx - 15, cy - 6, spot)
    b.line(cx - 15, cy - 6, cx - 11, cy + 1, spot)
    b.line(cx + 12, cy - 11, cx + 15, cy - 6, spot)
    b.line(cx + 15, cy - 6, cx + 11, cy + 1, spot)
    for x, y in ((cx - 13, cy - 7), (cx + 13, cy - 7), (cx - 12, cy - 3), (cx + 12, cy - 3)):
        b.set(x, y, WHITE)
    b.disc(cx - 6, cy - 4, 1.4, (255, 220, 120))
    b.disc(cx + 6, cy - 4, 1.4, (255, 220, 120))
    b.vline(cx, cy - 4, cy + 6, spot)
    b.line(cx, cy - 4, cx - 3, cy - 9, spot)
    b.line(cx, cy - 4, cx + 3, cy - 9, spot)
    b.set(cx - 3, cy - 10, spot)
    b.set(cx + 3, cy - 10, spot)
    p.paste(b)
    return p


def g19():
    """THE WANDERER: a wanderer walks a quiet road over the hills, staff and bundle (Keller: simple, unpretentious, a quiet walk)."""
    k = Key("A")
    p = Pix()
    sky(p, k, 0, 30, lift=0.16, warm=0.3)
    p.disc(52, 9, 4, (255, 236, 190))
    far = k.c(0.02, -0.15, 30)
    p.poly([(0, 24), (14, 18), (30, 22), (46, 16), (64, 21), (64, 40), (0, 40)], far)
    near = (110, 156, 84)
    p.poly([(0, 30), (24, 26), (64, 31), (64, 40), (0, 40)], near)
    p.line(0, 30, 24, 26, light(near, 0.3))
    p.line(24, 26, 64, 31, light(near, 0.3))
    # the road winding back to the hills
    road = (214, 190, 140)
    p.poly([(14, 40), (30, 40), (40, 31), (44, 27), (42, 27), (34, 31)], road)
    p.poly([(42, 27), (44, 27), (50, 22), (49, 22)], road)
    # a tree
    p.rect(56, 22, 2, 9, BROWN_D)
    p.disc(57, 19, 4.5, (70, 130, 70))
    p.disc(56, 18, 2, (110, 170, 90))
    w = Pix()
    coat, coat_d = (150, 80, 60), (110, 56, 44)
    cx = 22
    w.poly([(cx - 4, 16), (cx + 3, 16), (cx + 5, 30), (cx - 5, 30)], coat)
    w.poly([(cx, 16), (cx + 3, 16), (cx + 5, 30), (cx + 1, 30)], coat_d)
    w.thick(cx - 3, 30, cx - 6, 37, (80, 70, 60), 2)  # walking
    w.thick(cx + 1, 30, cx + 4, 37, (80, 70, 60), 2)
    w.hline(cx - 8, cx - 5, 38, INK)
    w.hline(cx + 4, cx + 7, 38, INK)
    face(w, cx, 12, SKIN, r=3, look=1, mouth=SKIN_B)
    w.hline(cx - 5, cx + 5, 9, (90, 110, 60))  # a broad hat
    w.rect(cx - 3, 6, 6, 3, (90, 110, 60))
    w.set(cx - 2, 6, RED)
    # the staff forward, the bundle on a stick over his shoulder
    w.vline(cx + 8, 12, 38, BROWN)
    w.thick(cx + 3, 18, cx + 7, 22, coat, 2)
    w.line(cx - 2, 15, cx - 10, 8, BROWN)
    w.disc(cx - 11, 8, 2.5, (220, 70, 70))
    w.set(cx - 12, 7, WHITE)
    w.set(cx - 10, 9, WHITE)
    p.paste(w)
    for x, y in ((8, 8), (10, 7), (12, 8)):
        p.set(x, y, INK)  # a bird far off
    return p


# ---- the owner's 48 (31 Oct 2026): the new pictures

PICTURES = {f"wtc2f{n:02d}": globals()[f"g{n:02d}"] for n in range(1, 25) if f"g{n:02d}" in globals()}

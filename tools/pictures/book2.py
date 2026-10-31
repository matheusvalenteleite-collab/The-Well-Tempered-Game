"""Book II's 24 pictures (D383's method; the names in fugue-names.ts).

WTC 1.92: the owner's 48 (docs/design/FUGUE-NAMES-48.md): all redrawn but the Organist, the Butterfly
and the Wanderer. The same language as Book I and the owner's rule on gender (book1.py); the music in
the scene where the owner's line puts it (II/2's shadows twice the figures' length, II/5's one bell
swinging of four, II/14's three sisters for three subjects, II/18's couple for two themes).
"""
import math
from lib import *  # noqa: F401,F403
from people import *  # noqa: F401,F403
from book1 import bell  # noqa: E402


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



def g01():
    """THE OLYMPIAN: a woman on the podium's top step, laurel crowned, both arms up (the close's high spirits)."""
    k = Key("C")
    p = Pix()
    sky(p, k, 0, 24, lift=0.18)
    # the stands: a crowd in dots
    p.rect(0, 14, W, 12, k.c(0.0, -0.1))
    for y in range(15, 26, 2):
        for x in range((y * 3) % 4, W, 4):
            p.set(x, y, [(240, 200, 160), (160, 108, 72), (250, 240, 220), (210, 70, 60)][(x + y) % 4])
    p.rect(0, 26, W, 14, (196, 120, 80))
    p.hline(0, W - 1, 26, (230, 160, 110))
    for x in (0, 16, 48):
        p.vline(x, 27, 39, (250, 236, 220))
    # the podium in marble: 2, 1, 3
    marble, marble_d = (238, 236, 230), (190, 186, 182)
    for x0, top, w in ((14, 29, 12), (26, 24, 12), (38, 31, 12)):
        p.rect(x0, top, w, H - top, marble)
        p.vline(x0 + w - 1, top, H - 1, marble_d)
        p.hline(x0, x0 + w - 1, top, WHITE)
    p.rect(31, 28, 2, 4, GOLD_D)
    a = Pix()
    cx = 32
    a.rect(cx - 3, 13, 7, 6, (60, 120, 210))  # the vest
    a.rect(cx + 1, 13, 3, 6, (40, 90, 170))
    a.hline(cx - 3, cx + 3, 15, WHITE)
    a.rect(cx - 3, 19, 7, 2, (30, 40, 70))  # shorts
    a.thick(cx - 2, 21, cx - 2, 23, TONES[4][0], 2)
    a.thick(cx + 1, 21, cx + 1, 23, TONES[4][0], 2)
    head(a, cx, 9, 4, "black", "ponytail", r=3, mouth=RED_D)
    arm(a, cx - 3, 14, cx - 8, 5, TONES[4][0], w=2)
    arm(a, cx + 3, 14, cx + 8, 5, TONES[4][0], w=2)
    a.disc(cx + 9, 3, 1.5, GOLD)  # the gold medal held up
    p.paste(a)
    # the laurel round her head, shining
    for dx, dy in ((-3, 7), (-2, 6), (-3, 8), (3, 7), (2, 6), (3, 8), (-1, 5), (1, 5)):
        p.set(cx + dx, dy, (90, 180, 70))
    p.set(cx, 5, (200, 240, 140))
    for x, y in ((cx - 10, 2), (cx + 12, 1), (cx - 6, 0)):
        twinkle(p, x, y, GOLD)
    return p



def g02():
    """THE SHADOWS: a woman and a man walking at sunset, their shadows twice their length (the subject at double length)."""
    k = Key("c")
    p = Pix()
    sky(p, k, 0, 18, lift=0.06, warm=1.4)
    p.vgrad(0, 8, W, 10, [k.c(0.1, 0.1, 20), (230, 140, 90), (250, 200, 120)])
    p.disc(6, 17, 4, (255, 230, 150))
    field = mix(k.c(0.1, 0.0, 30), (220, 150, 90), 0.45)
    p.rect(0, 18, W, 22, field)
    p.hline(0, W - 1, 18, (250, 200, 120))
    for y in range(20, H, 3):
        for x in range((y * 5) % 8, W, 8):
            p.set(x, y, light(field, 0.12))
    sh = dark(field, 0.55)
    # the shadows, long and thin, thrown away from the low sun
    for fx, top in ((20, 9), (27, 10)):
        p.poly([(fx - 1, 29), (fx + 2, 29), (fx + 36, 36), (fx + 33, 37)], sh)
        p.disc(fx + 37, 36, 2, sh)
    w = Pix()
    # the woman, a skirt and a long scarf; the man beside, taller trousers
    head(w, 20, 12, 1, "auburn", "long", r=2.6, look=1)
    w.poly([(18, 15), (22, 15), (24, 27), (16, 27)], (200, 70, 80))
    w.poly([(20, 15), (22, 15), (24, 27), (21, 27)], (150, 50, 64))
    w.vline(19, 28, 29, TONES[1][1])
    w.vline(22, 27, 29, TONES[1][1])
    w.line(17, 15, 14, 18, (240, 210, 90))  # the scarf blown back
    head(w, 28, 10, 3, "black", "short", r=2.6, look=1)
    w.rect(26, 13, 5, 8, (60, 90, 140))
    w.rect(26, 21, 2, 8, (50, 50, 60))
    w.rect(29, 21, 2, 7, (40, 40, 50))
    w.line(25, 15, 23, 18, (60, 90, 140))  # arm in arm
    p.paste(w)
    return p



def g03():
    """THE SWITCHBOARD: an operator at an old telephone switchboard, a headset on, cords crossing as calls go through."""
    k = Key("C#")
    p = Pix()
    p.rect(0, 0, W, H, k.c(-0.04, -0.15))
    p.rect(0, 32, W, 8, k.c(-0.12, -0.15))
    # the board: wood frame, rows of brass jacks, lamps
    wood, wood_d = (130, 84, 50), (90, 56, 36)
    p.rect(22, 2, 40, 28, wood)
    p.rect(24, 4, 36, 18, (40, 34, 30))
    for y in range(6, 21, 3):
        for x in range(26, 59, 3):
            p.set(x, y, GOLD)
    for x, y in ((29, 6), (44, 9), (53, 15)):
        p.set(x, y - 1, (255, 90, 80))
    p.rect(22, 22, 40, 3, wood_d)  # the shelf
    p.hline(22, 61, 22, light(wood, 0.3))
    # cords plugged into the jacks, crossing, sagging
    cols = [(220, 60, 50), (60, 120, 220), (240, 200, 60), (60, 170, 90)]
    for i, (x0, x1, y1) in enumerate(((30, 50, 9), (36, 26, 15), (42, 56, 6), (48, 35, 18))):
        for t in range(21):
            u = t / 20
            x = x0 + (x1 - x0) * u
            y = 23 + (y1 - 23) * u + math.sin(math.pi * u) * -3 + (6 * u * (1 - u))
            p.set(x, y, cols[i])
        p.rect(x1, y1, 1, 2, dark(cols[i], 0.2))
    o = Pix()
    cx = 13
    o.rect(cx - 5, 17, 10, 12, (190, 200, 220))  # shirt and waistcoat
    o.rect(cx - 2, 17, 4, 12, (70, 70, 90))
    o.vline(cx, 18, 28, WHITE)
    o.rect(cx - 5, 29, 10, 3, (50, 50, 60))
    head(o, cx, 12, 2, "brown", "short", r=3.5, look=2)
    o.ring(cx, 12, 4.2, INK, 190, 350)  # the headset band
    o.disc(cx - 4, 12, 1.2, (40, 40, 44))
    o.line(cx - 4, 13, cx + 2, 15, (40, 40, 44))  # the mouthpiece
    o.set(cx + 3, 15, GREY)
    arm(o, cx + 4, 19, cx + 12, 21, (190, 200, 220), hand=TONES[2][0])
    p.paste(o)
    return p



def g04():
    """THE PERPETUAL MOTION MACHINE: a wooden wheel of swinging weights, its inventor, a woman, proudly beside it."""
    k = Key("c#")
    p = Pix()
    wall = k.c(-0.02, -0.12)
    p.rect(0, 0, W, H, wall)
    for y in range(0, 32, 6):
        p.hline(0, W - 1, y, k.c(-0.06, -0.12))
    p.rect(0, 32, W, 8, (100, 70, 50))
    p.hline(0, W - 1, 32, (140, 100, 70))
    wood, wood_d = (176, 120, 70), (120, 80, 46)
    brass = (230, 180, 70)
    m = Pix()
    cx, cy, r = 40, 16, 12
    m.poly([(cx - 2, cy), (cx + 2, cy), (cx + 8, 32), (cx - 8, 32)], wood_d)  # the stand
    m.poly([(cx - 1, cy), (cx + 1, cy), (cx + 5, 32), (cx - 5, 32)], wood)
    for rr in (r, r - 1):
        m.ring(cx, cy, rr, wood)
    m.ring(cx, cy, r - 1, wood_d, 90, 270)
    for i in range(8):
        a = math.radians(i * 45 + 10)
        m.line(cx, cy, cx + (r - 1) * math.cos(a), cy + (r - 1) * math.sin(a), wood)
        # each weight hangs on a hinged arm: swung out on one side, folded in on the other
        bx = cx + r * math.cos(a)
        by = cy + r * math.sin(a)
        out = math.cos(a) > 0
        ex = bx + (4 if out else 1) * math.cos(a + (0.3 if out else 1.6))
        ey = by + (4 if out else 1) * math.sin(a + (0.3 if out else 1.6))
        m.line(bx, by, ex, ey, wood_d)
        m.disc(ex, ey, 1.4, brass)
    m.disc(cx, cy, 2, brass)
    m.set(cx - 1, cy - 1, WHITE)
    p.paste(m)
    # motion marks round the rim
    for a in (200, 215, 230):
        p.set(cx + (r + 5) * math.cos(math.radians(a)), cy + (r + 5) * math.sin(math.radians(a)), CREAM)
    s = Pix()
    ix = 13
    apron = (220, 210, 180)
    s.rect(ix - 4, 15, 9, 9, (160, 60, 50))  # her jacket
    s.rect(ix - 2, 17, 5, 13, apron)
    s.rect(ix - 4, 24, 9, 6, (70, 60, 70))
    s.rect(ix - 4, 30, 3, 3, (60, 50, 50))
    s.rect(ix + 2, 30, 3, 3, (60, 50, 50))
    head(s, ix, 10, 3, "auburn", "curls", r=3.2, look=1)
    s.rect(ix - 3, 6, 7, 2, (60, 60, 70))  # goggles pushed up
    s.set(ix - 2, 6, (160, 220, 240))
    s.set(ix + 2, 6, (160, 220, 240))
    arm(s, ix + 4, 17, ix + 12, 12, (160, 60, 50), hand=TONES[3][0])  # showing it off
    arm(s, ix - 4, 17, ix - 6, 22, (160, 60, 50))
    s.set(ix - 4, 22, TONES[3][0])  # hand on hip
    p.paste(s)
    return p



def g05():
    """THE BELL TOWER: a bell tower at evening, one bell swinging, the other three waiting."""
    k = Key("D")
    p = Pix()
    sky(p, k, lift=0.08, warm=0.8)
    p.vgrad(0, 22, W, 18, [k.c(0.12, 0.05, 20), (230, 160, 120), (240, 190, 130)])
    stars(p, [(4, 3), (10, 9), (56, 4), (60, 12), (50, 2)])
    p.poly([(0, 40), (0, 34), (12, 32), (24, 35), (40, 33), (64, 36), (64, 40)], k.c(-0.12, -0.1))
    stone, stone_d, stone_l = (170, 150, 140), (120, 104, 100), (210, 194, 180)
    t = Pix()
    t.rect(18, 4, 28, 36, stone)
    t.rect(40, 4, 6, 36, stone_d)
    t.vline(18, 4, 39, stone_l)
    t.poly([(16, 4), (32, -6), (48, 4)], (140, 70, 60))
    t.rect(16, 4, 32, 2, stone_l)
    t.rect(16, 21, 32, 2, stone_l)
    # four arches, a bell in each
    for ax in (20, 26, 33, 39):
        t.rect(ax, 8, 5, 12, (40, 30, 46))
        t.disc(ax + 2, 8, 2.5, (40, 30, 46))
    for y in range(26, 40, 4):
        for x in range(19 + (y // 4 % 2) * 3, 45, 6):
            t.hline(x, x + 3, y, stone_d)
    t.rect(30, 30, 4, 10, (70, 46, 36))
    t.disc(32, 30, 2, (70, 46, 36))
    p.paste(t)
    bz, bz_d = (210, 150, 70), (150, 100, 44)
    b = Pix()
    bell(b, 22.5, 9, 5, bz, bz_d, 0)
    bell(b, 28.5, 9, 5, bz, bz_d, 0)
    bell(b, 35.5, 9, 5, bz, bz_d, -24)  # the one swinging
    bell(b, 41.5, 9, 5, bz, bz_d, 0)
    p.paste(b, outline=None)
    for x, y in ((48, 11), (50, 9), (50, 13), (52, 11)):
        p.set(x, y, WHITE)
    return p



def g06():
    """THE CATAPULT: a siege catapult at the instant of release, the stone just flung."""
    k = Key("d")
    p = Pix()
    sky(p, k, 0, 28, lift=0.06)
    for cx, cy in ((44, 8), (48, 7), (52, 9)):
        p.disc(cx, cy, 2.5, k.c(0.2, -0.1))
    p.poly([(0, 30), (20, 26), (40, 29), (64, 25), (64, 40), (0, 40)], (90, 120, 70))
    p.poly([(44, 26), (52, 18), (60, 26)], k.c(-0.06, -0.1))  # a far keep
    p.rect(50, 16, 4, 6, k.c(-0.06, -0.1))
    timber, timber_d, timber_l = (150, 100, 60), (100, 64, 40), (196, 146, 96)
    c = Pix()
    c.rect(6, 28, 34, 3, timber)  # the base
    c.hline(6, 39, 28, timber_l)
    c.line(12, 28, 22, 16, timber)  # the A-frame
    c.line(13, 28, 23, 16, timber_d)
    c.line(32, 28, 22, 16, timber)
    c.line(33, 28, 23, 16, timber_d)
    c.hline(16, 30, 22, timber_d)
    c.disc(22, 18, 1.5, GREY_D)  # the axle
    c.thick(22, 18, 34, 4, timber, 2)  # the arm, flung up
    c.ell(35, 4, 2.5, 1.5, timber_d)  # the cup
    c.thick(22, 18, 13, 24, timber_d, 2)  # the short end
    c.rect(9, 23, 6, 5, (110, 110, 120))  # the counterweight
    c.hline(9, 14, 23, (160, 160, 170))
    for x in (10, 34):
        c.disc(x, 32, 3, timber_d)
        c.disc(x, 32, 1, timber_l)
    p.paste(c)
    # the stone in flight, its trail
    st = Pix()
    st.disc(47, 4, 2.2, (140, 136, 130))
    st.set(46, 3, (200, 196, 190))
    p.paste(st)
    for i, (x, y) in enumerate(((38, 4), (40, 3), (42, 3), (44, 4))):
        p.set(x, y, light(k.c(0.1), 0.4))
    for x, y in ((35, 1), (37, 2), (33, 2)):
        p.set(x, y, WHITE)
    return p



def g08():
    """THE RAIN: rain falling on a dark street at night, one window lit, drops on its sill."""
    k = Key("d#")
    p = Pix()
    sky(p, k, 0, 30, lift=-0.04)
    slate, slate_d = (60, 70, 84), (40, 46, 58)
    p.rect(0, 2, 26, 30, slate)  # houses
    p.rect(26, 6, 22, 26, slate_d)
    p.rect(48, 0, 16, 32, slate)
    for x0, x1, y in ((0, 25, 2), (26, 47, 6), (48, 63, 0)):
        p.hline(x0, x1, y, light(slate, 0.15))
    for x, y in ((4, 8), (14, 8), (4, 18), (52, 6), (52, 18), (30, 12), (40, 22)):
        p.rect(x, y, 5, 6, (30, 34, 44))
    # the one lit window, its light on the wet street
    p.rect(14, 18, 6, 7, (250, 210, 120))
    p.vline(17, 18, 24, (190, 140, 80))
    p.hline(14, 19, 21, (190, 140, 80))
    p.rect(13, 25, 8, 1, (160, 160, 170))  # the sill
    for x in (14, 16, 19):
        p.set(x, 26, (200, 220, 240))
    street = (44, 50, 62)
    p.rect(0, 32, W, 8, street)
    p.hline(0, W - 1, 32, (90, 100, 116))
    for y in range(34, 40, 2):
        p.hline(13, 20, y, (180, 150, 90) if y % 4 == 0 else (120, 110, 90))
    # a street lamp, haloed
    p.vline(42, 16, 31, (30, 30, 36))
    p.glow(42, 15, 4, (220, 210, 170), inner=0.3)
    p.set(42, 15, WHITE)
    # the rain: slanting streaks
    for i in range(46):
        x = (i * 23) % 70
        y = (i * 17) % 38
        p.line(x, y, x - 1, y + 2, (150, 170, 200))
    for x in (6, 30, 50, 58):
        p.ring(x, 37, 1.5, (130, 150, 180), 180, 360)
    return p



def g09():
    """THE CHORALE: a congregation standing in the pews, hymn books open, singing in the window's light."""
    k = Key("E")
    p = Pix()
    wall = k.c(-0.02, -0.18)
    p.rect(0, 0, W, H, wall)
    # tall windows, light falling
    for x in (6, 52):
        p.rect(x, 2, 6, 14, (240, 220, 170))
        p.disc(x + 2.5, 2, 3, (240, 220, 170))
        p.vline(x + 3, 0, 15, (180, 150, 100))
    p.dither(0, 0, W, 30, mix(wall, (240, 220, 170), 0.25))
    s = Pix()
    people = [("grey", "bun", 1), ("black", "short", 4), ("blonde", "long", 0), ("brown", "beard", 2),
              ("black", "curls", 3), ("auburn", "bob", 0), ("brown", "crop", 2), ("black", "braid", 4)]
    coats = [(160, 70, 70), (60, 80, 120), (90, 130, 90), (120, 90, 60), (140, 100, 160), (70, 110, 140), (170, 130, 70), (100, 70, 110)]
    for i, (hc, st, tn) in enumerate(people):
        row = i // 4
        x = 9 + (i % 4) * 15 + (6 if row else 0)
        y = 10 + row * 9
        s.rect(x - 3, y + 3, 7, 10, coats[i])
        head(s, x, y, tn, hc, st, r=2.8, mouth=False)
        s.rect(x, y + 2, 1, 1, INK)  # singing
        s.rect(x - 2, y + 5, 5, 2, (244, 238, 220))  # the open book
        s.set(x, y + 5, (150, 130, 100))
    p.paste(s)
    pew, pew_d = (140, 90, 54), (96, 60, 36)
    for y in (21, 33):
        p.rect(0, y, W, 3, pew)
        p.hline(0, W - 1, y, light(pew, 0.3))
        p.rect(0, y + 3, W, 3, pew_d)
    notes_trail(p, [(20, 6), (36, 4), (50, 7)], (250, 240, 200))
    return p



def g10():
    """THE CROOK: a pickpocket in a long coat lifts a purse at a crowded fair under the lanterns."""
    k = Key("e")
    p = Pix()
    sky(p, k, 0, 30, lift=-0.04)
    # the fair: a striped tent, a string of lanterns
    p.poly([(36, 30), (36, 12), (50, 4), (64, 12), (64, 30)], (190, 60, 70))
    for x in range(38, 64, 4):
        p.vline(x, 12, 29, (240, 220, 200))
    p.poly([(36, 12), (50, 4), (64, 12)], (230, 210, 190))
    for i in range(9):
        x = 2 + i * 7
        y = 4 + int(2 * math.sin(i * 0.9))
        lit = i not in (2, 6)  # each entry, a lantern goes out
        if lit:
            p.glow(x, y + 1, 3, mix(k.c(0.0), (250, 200, 100), 0.5), inner=0.2)
        p.rect(x, y, 2, 3, (250, 190, 80) if lit else (80, 60, 50))
    p.line(0, 4, 63, 4, (60, 50, 50))
    p.rect(0, 30, W, 10, (60, 50, 50))
    p.hline(0, W - 1, 30, (100, 84, 80))
    # the crowd behind, dark
    for x in range(0, 36, 6):
        p.disc(x + 3, 21, 2, k.c(-0.1, -0.1))
        p.rect(x + 1, 23, 5, 8, k.c(-0.1, -0.1))
    s = Pix()
    # the mark: a woman looking away, a handbag on her arm
    vx = 40
    s.poly([(vx - 3, 15), (vx + 3, 15), (vx + 5, 31), (vx - 5, 31)], (70, 120, 180))
    head(s, vx, 11, 0, "blonde", "bun", r=3, look=1)
    s.rect(vx - 7, 21, 4, 4, (150, 60, 50))  # the purse
    s.ring(vx - 5, 21, 1.5, (150, 60, 50), 180, 360)
    # the crook: long coat, a low hat, the hand slipping in
    cx = 22
    coat, coat_d = (90, 80, 70), (60, 52, 46)
    robe(s, cx, 14, 33, 4, 6, coat, coat_d)
    s.vline(cx, 16, 32, coat_d)
    head(s, cx, 10, 1, "brown", "short", r=3, look=2, mouth=False)
    s.hline(cx - 5, cx + 5, 8, (40, 36, 40))  # the hat brim, low
    s.rect(cx - 3, 5, 7, 3, (40, 36, 40))
    s.hline(cx, cx + 3, 12, TONES[1][1])  # a sly grin
    arm(s, cx + 4, 17, cx + 12, 22, coat, hand=TONES[1][0], w=2)
    p.paste(s)
    return p



def g12():
    """THE MASQUERADE: a masked ball in a candlelit hall: a woman with a fan and a gold mask, a cloaked partner in white."""
    k = Key("f")
    p = Pix()
    hall = k.c(-0.08, -0.15)
    p.rect(0, 0, W, H, hall)
    p.rect(0, 30, W, 10, (30, 26, 34))
    for x in range(0, W, 8):
        p.rect(x, 30, 4, 10, (50, 44, 56))
    # candelabra, gold light
    for x in (6, 58):
        p.glow(x, 8, 8, mix(hall, GOLD, 0.35), inner=0.3)
        p.vline(x, 9, 29, GOLD_D)
        p.hline(x - 3, x + 3, 9, GOLD_D)
        for dx in (-3, 0, 3):
            p.rect(x + dx, 6, 1, 3, CREAM)
            p.set(x + dx, 5, FIRE_L)
    # masked figures behind, half lost in the dark
    for x, y in ((18, 13), (46, 12)):
        p.disc(x, y, 2.5, k.c(-0.02, -0.15))
        p.rect(x - 3, y + 2, 7, 14, k.c(-0.03, -0.15))
        p.hline(x - 2, x + 2, y, (220, 210, 190))
    s = Pix()
    # her: a black gown, a gold mask, the fan opening
    wx = 26
    robe(s, wx, 16, 33, 3, 8, (150, 30, 60), (100, 20, 44))
    s.hline(wx - 3, wx + 3, 16, GOLD_D)
    head(s, wx, 11, 3, "black", "long", r=3, look=1, eyes="mask")
    s.hline(wx - 2, wx + 3, 10, GOLD)
    s.set(wx - 1, 10, INK)
    s.set(wx + 2, 10, INK)
    s.set(wx + 4, 9, GOLD)
    for a in range(-70, 71, 20):  # the fan
        s.line(wx - 5, 20, wx - 5 + 5 * math.sin(math.radians(a)), 20 - 5 * math.cos(math.radians(a)), GOLD if a % 40 else (250, 230, 160))
    # him: a black cloak, a white mask, a tricorn
    mx = 38
    s.poly([(mx - 4, 15), (mx + 4, 15), (mx + 8, 33), (mx - 7, 33)], (20, 18, 26))
    s.poly([(mx - 4, 15), (mx - 1, 15), (mx - 2, 33), (mx - 7, 33)], (60, 30, 50))
    head(s, mx, 10, 1, "brown", "short", r=3, look=-1, eyes="mask")
    s.rect(mx - 3, 8, 6, 5, (236, 234, 240))
    s.set(mx - 2, 10, INK)
    s.set(mx + 1, 10, INK)
    s.poly([(mx - 5, 7), (mx + 5, 7), (mx, 3)], (24, 20, 28))
    s.line(mx - 4, 18, wx + 3, 19, (20, 18, 26))  # hand in hand
    p.paste(s)
    return p



def g13():
    """THE TELEPHONE: a black rotary telephone on a table, its bell shaking (the opening trill)."""
    k = Key("F#")
    p = Pix()
    wall = k.c(0.04, -0.12)
    p.rect(0, 0, W, H, wall)
    for x in range(0, W, 6):
        p.vline(x, 0, 26, k.c(0.0, -0.12))
    table = (130, 80, 46)
    p.rect(0, 27, W, 13, table)
    p.hline(0, W - 1, 27, light(table, 0.3))
    p.rect(0, 30, W, 10, dark(table, 0.2))
    t = Pix()
    blk, blk_l = (32, 30, 36), (90, 88, 100)
    brass = (230, 180, 70)
    # the body: a domed box, the dial on its face
    t.poly([(16, 29), (20, 16), (44, 16), (48, 29)], blk)
    t.line(20, 16, 17, 28, blk_l)
    t.hline(20, 44, 16, blk_l)
    t.disc(32, 23, 6, (236, 230, 216))
    for i in range(10):
        a = math.radians(-60 + i * 30)
        t.disc(32 + 4 * math.cos(a), 23 + 4 * math.sin(a), 0.8, blk)
    t.disc(32, 23, 1.5, (200, 60, 60))
    t.rect(16, 29, 33, 2, brass)
    # the handset on its cradle, jumping
    t.rect(17, 9, 30, 4, blk)
    t.hline(17, 46, 9, blk_l)
    t.ell(18, 11, 3.5, 3, blk)
    t.ell(46, 11, 3.5, 3, blk)
    t.rect(22, 13, 3, 3, brass)
    t.rect(39, 13, 3, 3, brass)
    p.paste(t)
    # the ring: shake marks
    for x0, s in ((11, -1), (53, 1)):
        for dy in (-3, 0, 3):
            p.line(x0, 11 + dy, x0 + s * 2, 11 + dy - 1, WHITE)
    p.line(48, 30, 60, 34, (30, 28, 30))  # the cord
    p.line(60, 34, 63, 33, (30, 28, 30))
    return p



def g14():
    """THE THREE SISTERS: three sisters of three ages under one tree (three subjects, combined)."""
    k = Key("f#")
    p = Pix()
    sky(p, k, 0, 30, lift=0.1)
    p.rect(0, 30, W, 10, (90, 130, 70))
    p.hline(0, W - 1, 30, (130, 170, 90))
    # the tree over all three
    trunk = (100, 66, 44)
    p.rect(30, 8, 4, 23, trunk)
    p.vline(33, 8, 30, dark(trunk, 0.3))
    for cx, cy, r in ((32, 5, 9), (20, 7, 7), (44, 7, 7), (12, 10, 5), (52, 10, 5)):
        p.disc(cx, cy, r, (70, 120, 60))
    for cx, cy in ((26, 2), (38, 3), (16, 6), (48, 6)):
        p.disc(cx, cy, 2, (110, 160, 80))
    s = Pix()
    # the child, the young woman, the old woman: three colours
    sisters = (
        (12, 22, 2.6, 3, "black", "ponytail", (240, 190, 60), 31),
        (32, 15, 3, 1, "auburn", "long", (70, 130, 200), 33),
        (52, 17, 3, 0, "white", "bun", (170, 80, 120), 33),
    )
    for x, hy, r, tn, hc, st, dress, foot in sisters:
        robe(s, x, hy + r, foot, r - 0.5, r + 3, dress, dark(dress, 0.25))
        head(s, x, hy, tn, hc, st, r=r, look=0)
    s.vline(55, 22, 34, BROWN)  # the eldest's stick
    s.line(15, 26, 28, 22, TONES[1][0])  # hand in hand
    s.line(36, 22, 49, 24, TONES[0][0])
    p.paste(s)
    return p



def g15():
    """HOPSCOTCH: a girl hopping across chalk squares on the pavement, one foot up."""
    k = Key("G")
    p = Pix()
    wall = k.c(0.04, -0.15)
    p.rect(0, 0, W, 16, wall)
    for y in range(2, 16, 4):
        for x in range((y // 4 % 2) * 4, W, 8):
            p.rect(x, y, 7, 3, k.c(0.08, -0.15))
    pave = (170, 166, 160)
    p.rect(0, 16, W, 24, pave)
    for y in range(18, H, 6):
        p.hline(0, W - 1, y, dark(pave, 0.12))
    chalk = (250, 250, 246)
    # the chalk squares, single and double, toward the far end
    sq = [(4, 30, 8, 8), (12, 30, 8, 8), (20, 26, 8, 8), (20, 34, 8, 6), (28, 30, 8, 8), (36, 26, 8, 8), (36, 34, 8, 6), (44, 30, 8, 8)]
    for x, y, w, h in sq:
        p.line(x, y, x + w, y, chalk)
        p.line(x, y + h, x + w, y + h, chalk)
        p.line(x, y, x, y + h, chalk)
        p.line(x + w, y, x + w, y + h, chalk)
    for i, (x, y, w, h) in enumerate(sq):
        p.set(x + 3, y + 3, (250, 120, 160) if i % 2 else (100, 180, 250))
    p.ring(56, 32, 4, chalk)
    p.disc(40, 37, 1, (220, 70, 80))  # the marker stone
    g = Pix()
    cx = 32
    dress = (250, 180, 60)
    g.poly([(cx - 3, 13), (cx + 3, 13), (cx + 5, 22), (cx - 5, 22)], dress)
    g.poly([(cx + 1, 13), (cx + 3, 13), (cx + 5, 22), (cx + 1, 22)], dark(dress, 0.2))
    g.thick(cx - 1, 22, cx - 1, 29, TONES[2][0], 2)  # the hopping leg
    g.thick(cx + 2, 22, cx + 6, 25, TONES[2][0], 1)  # the other, tucked up
    g.hline(cx - 2, cx, 30, (200, 60, 60))
    head(g, cx, 9, 2, "brown", "braid", r=3, look=1)
    g.set(cx - 3, 6, (230, 60, 90))
    arm(g, cx - 3, 15, cx - 8, 11, TONES[2][0], w=1)
    arm(g, cx + 3, 15, cx + 8, 17, TONES[2][0], w=1)
    p.paste(g)
    return p



def g16():
    """THE JURY: the jury box, the forewoman on her feet with the verdict, the others shouting (the four hammered notes)."""
    k = Key("g")
    p = Pix()
    p.rect(0, 0, W, H, k.c(-0.02, -0.15))
    for x in range(0, W, 10):
        p.rect(x, 0, 6, 18, k.c(0.02, -0.15))
    wood, wood_d, wood_l = (150, 96, 56), (100, 62, 38), (196, 140, 90)
    s = Pix()
    back = [("black", "short", 4, (120, 60, 60)), ("grey", "bun", 1, (80, 90, 130)), ("brown", "beard", 2, (90, 110, 80)),
            ("blonde", "bob", 0, (130, 90, 140)), ("black", "curls", 3, (170, 120, 60))]
    for x, (hc, st, tn, coat) in zip((6, 17, 42, 51, 60), back):
        s.rect(x - 3, 21, 7, 8, coat)
        head(s, x, 17, tn, hc, st, r=2.8, mouth=False)
        s.rect(x, 19, 1, 2, INK)  # shouting
        arm(s, x + 3, 22, x + 5, 15, coat, hand=TONES[tn][0], w=1)  # a fist up
    # the forewoman, standing, the verdict in her hand
    fx = 30
    s.rect(fx - 4, 14, 9, 14, (40, 60, 110))
    s.rect(fx + 1, 14, 4, 14, (30, 44, 84))
    s.hline(fx - 1, fx + 1, 14, WHITE)
    head(s, fx, 9, 2, "auburn", "long", r=3.5, mouth=False)
    s.set(fx - 4, 11, GOLD)  # an earring
    s.rect(fx, 11, 1, 2, INK)
    arm(s, fx + 4, 16, fx + 10, 10, (40, 60, 110), w=2)
    s.rect(fx + 10, 6, 4, 5, (246, 240, 226))  # the verdict
    s.hline(fx + 11, fx + 12, 8, (120, 120, 140))
    p.paste(s)
    # the jury box's rail in front
    p.rect(0, 26, W, 14, wood)
    p.hline(0, W - 1, 26, wood_l)
    p.rect(0, 27, W, 2, wood_d)
    for x in range(2, W, 8):
        p.rect(x, 30, 5, 8, light(wood, 0.08))
        p.vline(x + 4, 30, 37, wood_d)
    # the hammered notes: four strokes over the box
    for i, x in enumerate((44, 49, 54, 59)):
        p.rect(x, 4, 2, 2, WHITE if i < 3 else GOLD)
        p.vline(x + 1, 0, 3, WHITE if i < 3 else GOLD)
    return p



def g17():
    """THE MIRROR: a woman before a tall mirror, her reflection looking back, the two halves alike."""
    k = Key("Ab")
    p = Pix()
    wall = k.c(-0.04, -0.15)
    p.rect(0, 0, W, H, wall)
    p.rect(0, 33, W, 7, k.c(-0.12, -0.15))
    p.hline(0, W - 1, 33, k.c(-0.06, -0.15))
    # a candle on each side
    for x in (4, 59):
        p.glow(x, 15, 6, mix(wall, GOLD, 0.35), inner=0.3)
        p.rect(x, 16, 1, 6, CREAM)
        p.set(x, 15, FIRE)
        p.set(x, 14, FIRE_L)
        p.rect(x - 1, 22, 3, 1, (200, 200, 210))
    # the tall mirror, silver framed, its glass a paler room
    mx0, mx1 = 34, 54
    p.rect(mx0 - 2, 2, mx1 - mx0 + 4, 32, (200, 204, 216))
    p.rect(mx0, 4, mx1 - mx0, 28, k.c(0.1, -0.2))
    p.vline(mx0 - 2, 2, 33, WHITE)
    p.vline(mx1 + 1, 2, 33, (130, 134, 150))
    p.disc(44, 2, 3, (200, 204, 216))
    p.line(mx0 + 2, 6, mx0 + 6, 2 + 8, light(k.c(0.1, -0.2), 0.3))

    def lady(L, cx, flip, dim=0.0):
        gown = mix((60, 140, 160), k.c(0.1, -0.2), dim)
        robe(L, cx, 16, 33, 3, 7, gown, dark(gown, 0.25))
        L.hline(cx - 2, cx + 2, 16, mix(WHITE, gown, dim))
        head(L, cx, 11, 2, mix(HAIR["black"], k.c(0.1, -0.2), dim), "ponytail", r=3.2, look=-1 if flip else 1, flip=flip)
        s = -1 if flip else 1
        arm(L, cx + s * 3, 18, cx + s * 7, 15, gown, hand=mix(TONES[2][0], k.c(0.1, -0.2), dim), w=2)

    a = Pix()
    lady(a, 24, False)
    p.paste(a)
    b = Pix()
    lady(b, 44, True, dim=0.3)
    for y in range(H):
        for x in range(W):
            if not (mx0 <= x < mx1 and 4 <= y < 32):
                b.px[x, y] = (0, 0, 0, 0)
    p.paste(b, outline=None)
    return p



def g18():
    """THE GIGUE: a couple dancing a jig on a tavern floor, a fiddler on a barrel (both themes together)."""
    k = Key("g#")
    p = Pix()
    wall = k.c(0.0, -0.2, -60)
    p.rect(0, 0, W, H, wall)
    for x in range(0, W, 7):
        p.vline(x, 0, 28, dark(wall, 0.2))
    p.rect(0, 2, W, 2, (90, 60, 40))  # a beam
    p.glow(32, 3, 6, mix(wall, GOLD, 0.4), inner=0.3)
    p.rect(31, 4, 2, 3, CREAM)
    p.set(31, 3, FIRE_L)
    floor = (130, 86, 52)
    p.rect(0, 29, W, 11, floor)
    for y in range(31, H, 3):
        p.hline(0, W - 1, y, dark(floor, 0.15))
    p.hline(0, W - 1, 29, light(floor, 0.2))
    s = Pix()
    # the fiddler on a barrel, right
    s.rect(48, 26, 10, 9, (150, 100, 60))
    s.hline(48, 57, 28, (90, 90, 100))
    s.hline(48, 57, 32, (90, 90, 100))
    s.rect(50, 16, 7, 10, (60, 100, 80))
    head(s, 53, 12, 4, "black", "short", r=3, look=-1)
    s.hline(50, 56, 9, (90, 60, 40))  # a cap
    s.rect(51, 7, 5, 2, (90, 60, 40))
    s.ell(47, 16, 3, 1.5, (170, 90, 40))  # the fiddle
    s.line(45, 12, 52, 20, WHITE)  # the bow
    # the couple, hands joined, spinning
    head(s, 18, 10, 1, "auburn", "long", r=3, look=1)
    s.poly([(15, 13), (21, 13), (25, 27), (11, 27)], (210, 70, 80))
    s.poly([(18, 13), (21, 13), (25, 27), (19, 27)], (160, 50, 64))
    s.vline(15, 28, 30, TONES[1][1])
    s.line(20, 28, 23, 30, TONES[1][1])
    head(s, 34, 10, 3, "brown", "beard", r=3, look=-1)
    s.rect(31, 13, 7, 8, (230, 220, 190))
    s.rect(31, 17, 7, 1, (80, 50, 40))
    s.rect(31, 21, 3, 9, (70, 60, 80))
    s.line(36, 21, 40, 27, (70, 60, 80))
    s.line(37, 21, 41, 27, (70, 60, 80))
    s.line(21, 16, 31, 16, TONES[1][0])
    s.line(21, 15, 31, 15, TONES[3][0])
    p.paste(s)
    # the spin: a swirl round their feet
    for a in range(0, 300, 25):
        p.set(28 + 14 * math.cos(math.radians(a)), 32 + 3 * math.sin(math.radians(a)), light(floor, 0.35))
    return p



def g20():
    """THE EARTHQUAKE: a city street splitting open, a lamp-post leaning, dust rising."""
    k = Key("a")
    p = Pix()
    sky(p, k, 0, 24, lift=0.04)
    for x0, w, top, c in ((0, 14, 6, 0), (14, 12, 10, 1), (38, 12, 4, 0), (50, 14, 9, 1)):
        col = k.c(-0.08 + c * 0.05, -0.2)
        p.rect(x0, top, w, 24 - top, col)
        for y in range(top + 2, 22, 4):
            for x in range(x0 + 2, x0 + w - 2, 4):
                p.rect(x, y, 2, 2, (240, 210, 120) if (x + y) % 3 == 0 else dark(col, 0.3))
    p.poly([(26, 24), (26, 12), (38, 14), (38, 24)], k.c(-0.04, -0.2))  # a leaning facade
    road = (110, 104, 100)
    p.rect(0, 24, W, 16, road)
    p.hline(0, W - 1, 24, light(road, 0.25))
    for x in range(4, W, 12):
        p.hline(x, x + 5, 32, (230, 220, 160))
    # the crack, zig-zag, opening toward us
    crack = [(30, 24), (28, 27), (33, 29), (27, 33), (35, 36), (29, 40)]
    for (x0, y0), (x1, y1) in zip(crack, crack[1:]):
        for w in range(int(1 + (y0 - 24) / 4)):
            p.line(x0 + w, y0, x1 + w, y1, (20, 16, 20))
        p.line(x0 - 1, y0, x1 - 1, y1, light(road, 0.3))
    # rubble and dust
    for x, y in ((24, 30), (38, 34), (22, 37), (40, 28), (19, 33), (44, 38)):
        p.rect(x, y, 2, 1, (150, 140, 130))
        p.set(x, y - 1, (180, 170, 160))
    for x, y, r in ((14, 22, 3), (46, 21, 4), (34, 20, 3)):
        p.dither(x - r, y - r, 2 * r, 2 * r, (200, 180, 160))
    # the lamp-post, leaning hard
    lp = Pix()
    lp.thick(14, 36, 22, 12, (40, 40, 48), 2)
    lp.rect(21, 9, 4, 4, (40, 40, 48))
    lp.rect(22, 10, 2, 2, (250, 220, 130))
    p.paste(lp)
    for x, y in ((10, 8), (52, 4), (30, 6)):
        p.set(x, y, light(k.c(0.2), 0.4))
    return p



def g21():
    """THE CRADLE: a father rocking a cradle by the fire, a baby asleep in it."""
    k = Key("Bb")
    p = Pix()
    wall = k.c(-0.04, -0.2, -120)
    p.rect(0, 0, W, H, wall)
    p.rect(0, 31, W, 9, (110, 70, 46))
    p.hline(0, W - 1, 31, (150, 100, 64))
    # the fireplace, the fire's light
    p.glow(10, 24, 16, mix(wall, FIRE, 0.3), inner=0.4)
    p.rect(0, 10, 20, 22, (130, 110, 100))
    p.rect(0, 9, 22, 2, (160, 140, 120))
    p.rect(3, 17, 14, 14, (30, 20, 20))
    p.poly([(5, 31), (8, 22), (10, 27), (12, 20), (15, 31)], FIRE)
    p.poly([(8, 31), (10, 25), (12, 31)], FIRE_L)
    p.rect(5, 30, 11, 1, BROWN_D)
    # the cradle on its rockers
    c = Pix()
    wood, wood_d = (176, 120, 70), (120, 80, 46)
    c.poly([(24, 22), (42, 22), (40, 30), (26, 30)], wood)
    c.poly([(36, 22), (42, 22), (40, 30), (35, 30)], wood_d)
    c.rect(22, 16, 3, 9, wood)  # the hood end
    c.ring(33, 33, 10, wood_d, 200, 340)
    c.ell(32, 22, 7, 1.5, (240, 236, 226))
    head(c, 28, 21, 1, "brown", "crop", r=2, eyes="shut", mouth=False, cheek=True)
    c.hline(30, 37, 21, (140, 170, 220))  # the blanket
    p.paste(c)
    f = Pix()
    fx = 50
    f.rect(fx - 4, 30, 9, 2, (90, 60, 40))  # the stool
    f.rect(fx - 4, 18, 9, 12, (90, 120, 80))
    f.rect(fx + 1, 18, 4, 12, (70, 96, 62))
    f.rect(fx - 6, 26, 5, 3, (60, 60, 80))  # knees forward
    f.rect(fx - 7, 29, 2, 6, (60, 60, 80))
    head(f, fx, 13, 2, "black", "beard", r=3.5, look=-1, eyes="shut")
    arm(f, fx - 4, 20, fx - 12, 23, (90, 120, 80), hand=TONES[2][0])  # his hand on the cradle
    p.paste(f)
    return p



def g22():
    """THE COLOSSUS: a giant bronze statue astride a harbour mouth, a torch raised, ships small at its feet."""
    k = Key("bb")
    p = Pix()
    sky(p, k, 0, 28, lift=0.06, warm=0.5)
    p.disc(54, 8, 3, (250, 230, 180))
    sea = k.c(0.02, 0.1, -20)
    p.rect(0, 28, W, 12, sea)
    for y in range(30, H, 2):
        for x in range((y * 7) % 6, W, 6):
            p.hline(x, x + 1, y, light(sea, 0.2))
    # the moles each side, a pedestal on each
    stone = (150, 140, 130)
    p.rect(0, 26, 22, 4, stone)
    p.rect(42, 26, 22, 4, stone)
    p.rect(14, 23, 8, 3, light(stone, 0.15))
    p.rect(42, 23, 8, 3, light(stone, 0.15))
    s = Pix()
    bronze, bronze_d, bronze_l = (190, 130, 60), (130, 84, 40), (236, 186, 110)
    # legs astride the mouth
    s.thick(18, 22, 27, 16, bronze, 3)
    s.thick(46, 22, 37, 16, bronze_d, 3)
    s.poly([(26, 17), (38, 17), (36, 9), (28, 9)], bronze)  # the tunic
    s.poly([(33, 9), (36, 9), (38, 17), (33, 17)], bronze_d)
    s.vline(28, 10, 16, bronze_l)
    s.disc(32, 6, 2.5, bronze)
    s.set(31, 6, bronze_d)
    s.set(33, 6, bronze_d)
    for dx in (-3, -1, 1, 3):  # a crown of rays
        s.set(32 + dx, 3 + abs(dx) // 2, bronze_l)
    s.thick(37, 10, 42, 4, bronze_d, 2)  # the arm raised with the torch
    s.thick(27, 10, 24, 16, bronze, 2)
    p.paste(s)
    p.glow(42, 3, 3, (255, 200, 100), inner=0.4)
    p.set(42, 2, WHITE)
    # ships small at its feet, sailing in between
    for x, y, c in ((30, 31, WHITE), (8, 34, (240, 230, 210)), (52, 33, (230, 220, 200))):
        p.rect(x - 2, y, 5, 1, BROWN)
        p.poly([(x, y - 1), (x, y - 5), (x + 3, y - 1)], c)
        p.vline(x, y - 5, y - 1, BROWN_D)
    return p



def g23():
    """THE ELEGY: a poet reading by a grave under a willow, its branches hanging still."""
    k = Key("B")
    p = Pix()
    sky(p, k, 0, 28, lift=0.06)
    grass = (80, 120, 70)
    p.rect(0, 28, W, 12, grass)
    p.hline(0, W - 1, 28, light(grass, 0.2))
    for x in range(1, W, 5):
        p.set(x, 32 + x % 4, dark(grass, 0.2))
    # the willow: a trunk, a crown, long hanging strands
    willow, willow_l = (90, 140, 80), (140, 186, 110)
    p.rect(44, 8, 4, 21, (90, 66, 46))
    p.disc(46, 6, 10, willow)
    p.disc(36, 7, 7, willow)
    for x in range(28, 60, 2):
        top = 6 + abs(x - 44) // 4
        p.vline(x, top, top + 16 - abs(x - 44) // 2, willow if x % 4 else willow_l)
    # the grave: a plain stone, flowers
    st = Pix()
    st.rect(14, 20, 9, 10, (180, 180, 190))
    st.disc(18.5, 20, 4.5, (180, 180, 190))
    st.vline(22, 18, 29, (130, 130, 144))
    st.hline(16, 21, 22, (130, 130, 144))
    st.hline(16, 20, 24, (130, 130, 144))
    p.paste(st)
    for x, c in ((14, (240, 200, 220)), (16, WHITE), (22, (240, 220, 120))):
        p.set(x, 29, c)
        p.set(x, 30, GREEN_D)
    # the poet, seated on the grass, reading aloud
    s = Pix()
    cx = 33
    s.rect(cx - 4, 18, 8, 9, (60, 60, 90))
    s.rect(cx, 18, 4, 9, (44, 44, 70))
    s.rect(cx - 6, 26, 11, 3, (50, 50, 60))  # legs folded
    head(s, cx, 13, 1, "brown", "short", r=3.2, look=-1)
    s.hline(cx - 1, cx + 1, 17, WHITE)
    arm(s, cx - 3, 20, cx - 7, 21, (60, 60, 90))
    s.rect(cx - 10, 19, 4, 3, (246, 238, 214))  # the book
    s.set(cx - 8, 19, (150, 120, 90))
    p.paste(s)
    return p



def g24():
    """THE LAST DANCE: two dancers in an emptying ballroom, the candles burned low."""
    k = Key("b")
    p = Pix()
    hall = k.c(-0.02, -0.15)
    p.rect(0, 0, W, H, hall)
    for x in (4, 22, 40, 58):
        p.rect(x, 0, 3, 30, k.c(0.04, -0.15))
    floor = (90, 60, 50)
    p.rect(0, 30, W, 10, floor)
    for x in range(0, W, 6):
        p.line(x, 30, x - 4, 39, dark(floor, 0.2))
    p.hline(0, W - 1, 30, light(floor, 0.2))
    # candles burned low along the wall, one still tall
    for i, x in enumerate((10, 16, 46, 52)):
        h = 1 if i != 2 else 4
        p.rect(x, 22 - h, 1, h, CREAM)
        p.set(x, 21 - h, FIRE)
        p.glow(x, 21 - h, 2.5, mix(hall, GOLD, 0.3), inner=0.2)
        p.rect(x - 1, 22, 3, 1, GOLD_D)
    # chairs stacked against the wall
    for x in (2, 58):
        for j in range(3):
            p.rect(x, 24 - j * 2, 4, 1, (120, 80, 50))
        p.vline(x, 24, 29, (120, 80, 50))
        p.vline(x + 3, 24, 29, (120, 80, 50))
    s = Pix()
    # she in a long pale gown, he in black tails, turning together
    head(s, 28, 9, 4, "black", "bun", r=3, look=1)
    s.poly([(25, 12), (31, 12), (35, 31), (21, 31)], (230, 210, 230))
    s.poly([(28, 12), (31, 12), (35, 31), (29, 31)], (190, 170, 200))
    head(s, 36, 8, 0, "blonde", "short", r=3, look=-1)
    s.rect(33, 11, 7, 10, (30, 28, 36))
    s.hline(35, 37, 11, WHITE)
    s.rect(33, 21, 3, 10, (30, 28, 36))
    s.rect(37, 21, 3, 10, (24, 22, 30))
    s.poly([(39, 17), (41, 23), (39, 23)], (30, 28, 36))  # the tails
    s.line(31, 15, 34, 15, TONES[4][0])  # her hand on his shoulder
    arm(s, 33, 16, 29, 18, (30, 28, 36))  # his on her back
    p.paste(s)
    return p


PICTURES = {f"wtc2f{n:02d}": globals()[f"g{n:02d}"] for n in range(1, 25)}

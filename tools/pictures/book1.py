"""Book I: the company of 24 (Mario and Luigi's report §3, system A; the names in fugue-names.ts).

One character a fugue, big, in one telling pose with one prop, on the key's own ground; the subject
hidden in the scene only where it falls naturally (I/1's three bells rung in close succession, I/3's
seven balls for seven sharps, I/12's ten steps, I/24's twelve hours).
"""
import math
from lib import *  # noqa: F401,F403
from people import *  # noqa: F401,F403


def rot(pts, ox, oy, deg):
    a = math.radians(deg)
    ca, sa = math.cos(a), math.sin(a)
    return [(ox + (x - ox) * ca - (y - oy) * sa, oy + (x - ox) * sa + (y - oy) * ca) for x, y in pts]


def bell(lay, cx, top, w, c, cd, tilt=0):
    """A bell hung at (cx, top), w wide, swung by `tilt` degrees: dome, waist, flared lip, clapper."""
    h = w * 1.0
    left = [(cx - w * 0.22, top), (cx - w * 0.3, top + h * 0.35), (cx - w * 0.34, top + h * 0.7), (cx - w * 0.5, top + h)]
    right = [(cx + w * 0.5, top + h), (cx + w * 0.34, top + h * 0.7), (cx + w * 0.3, top + h * 0.35), (cx + w * 0.22, top)]
    pts = rot(left + right, cx, top, tilt)
    lay.poly(pts, c)
    # the shade on the right half
    shade = rot([(cx + w * 0.05, top), (cx + w * 0.22, top), (cx + w * 0.3, top + h * 0.35), (cx + w * 0.34, top + h * 0.7), (cx + w * 0.5, top + h), (cx + w * 0.12, top + h)], cx, top, tilt)
    lay.poly(shade, cd)
    hl = rot([(cx - w * 0.16, top + h * 0.2), (cx - w * 0.2, top + h * 0.6)], cx, top, tilt)
    lay.line(*hl[0], *hl[1], light(c, 0.55))
    lip = rot([(cx - w * 0.5, top + h), (cx + w * 0.5, top + h)], cx, top, tilt)
    lay.line(*lip[0], *lip[1], dark(cd, 0.25))
    cl = rot([(cx, top + h + 1.5)], cx, top, tilt)[0]
    lay.disc(cl[0], cl[1], 1, dark(cd, 0.3))


def f02():
    """THE IMP: a red imp mid-hop over three white keys, grinning (the subject's head C-B-C, a hop down and back)."""
    k = Key("c")
    p = Pix()
    sky(p, k, lift=-0.02)
    moon(p, 54, 7, 4, CREAM, k.c(-0.04))
    stars(p, [(6, 4), (17, 9), (40, 3), (46, 11), (11, 15), (60, 17), (25, 4)])
    # three keys (C, B, C): the middle one lower, a key black between
    keyc, keyd = (238, 232, 216), (168, 158, 140)
    for x, top in ((6, 27), (25, 31), (44, 27)):
        p.rect(x, top, 15, H - top, keyc)
        p.hline(x, x + 14, top, WHITE)
        p.vline(x + 14, top, H - 1, keyd)
        p.vline(x, top, H - 1, keyd)
    p.rect(20, 25, 5, 15, (30, 26, 34))
    p.rect(40, 25, 4, 15, (30, 26, 34))
    # the hop's arc (dotted): from the left key down to the middle and up again
    for t in range(0, 21, 2):
        x = 13 + t * 1.55
        y = 24 - 10 * math.sin(math.pi * t / 20) + (2 if 6 < t < 14 else 0)
        p.set(x, y, light(k.c(0.2), 0.4))
    imp = Pix()
    red, red_d, red_l = (226, 70, 50), (160, 38, 36), (250, 120, 90)
    cx, cy = 32, 14
    imp.ell(cx, cy + 4, 4, 4.5, red)  # body
    imp.ell(cx + 1.5, cy + 5, 2, 3, red_d)
    imp.disc(cx, cy - 2, 4.2, red)  # head
    imp.set(cx - 2, cy - 4, red_l)
    imp.set(cx - 3, cy - 3, red_l)
    # horns
    imp.line(cx - 3, cy - 6, cx - 5, cy - 9, (250, 230, 200))
    imp.line(cx + 3, cy - 6, cx + 5, cy - 9, (250, 230, 200))
    # eyes and grin
    imp.set(cx - 2, cy - 2, (255, 240, 120))
    imp.set(cx + 1, cy - 2, (255, 240, 120))
    imp.set(cx - 2, cy - 3, INK)
    imp.set(cx + 1, cy - 3, INK)
    imp.hline(cx - 2, cx + 2, cy + 1, INK)
    imp.set(cx - 3, cy, INK)
    imp.set(cx + 3, cy, INK)
    imp.set(cx, cy + 1, WHITE)
    # arms flung up, legs tucked
    imp.thick(cx - 4, cy + 3, cx - 8, cy - 1, red, 2)
    imp.thick(cx + 4, cy + 3, cx + 8, cy - 1, red_d, 2)
    imp.thick(cx - 3, cy + 8, cx - 6, cy + 10, red_d, 2)
    imp.thick(cx + 2, cy + 8, cx + 5, cy + 10, red_d, 2)
    # the tail's curl with an arrow head
    for i in range(14):
        a = i * 0.5
        imp.set(cx + 5 + i * 0.55 + math.cos(a) * 1.4, cy + 8 - i * 0.6 + math.sin(a) * 1.4, red_d)
    imp.poly([(cx + 12, cy - 1), (cx + 14, cy + 1), (cx + 11, cy + 2)], red)
    p.paste(imp)
    return p


def f09():
    """THE SPARROW: a cheeky sparrow, two hops along a fence rail, then away (the two-note head, then the run)."""
    k = Key("E")
    p = Pix()
    sky(p, k, lift=0.18, warm=0.1)
    # clouds
    for cx, cy, r in ((10, 8, 4), (15, 7, 5), (20, 9, 3.5), (50, 5, 3), (54, 5, 4)):
        p.disc(cx, cy, r, light(k.c(0.2), 0.55))
    # the fence: posts and a rail
    wood, wood_d = (176, 128, 80), (124, 86, 52)
    p.rect(0, 26, W, 3, wood)
    p.hline(0, W - 1, 26, light(wood, 0.3))
    p.hline(0, W - 1, 28, wood_d)
    for x in (4, 26, 48):
        p.rect(x, 22, 4, 18, wood)
        p.vline(x + 3, 22, 39, wood_d)
        p.hline(x, x + 3, 22, light(wood, 0.3))
    p.rect(0, 34, W, 6, (110, 160, 80))
    p.hline(0, W - 1, 34, (150, 196, 100))
    # two hop marks on the rail (little prints) and the dotted path up and away
    for x in (10, 18):
        p.set(x, 25, wood_d)
        p.set(x + 1, 25, wood_d)
    for i, (x, y) in enumerate(((12, 22), (14, 19), (20, 21), (22, 19), (44, 12), (50, 8), (56, 5))):
        if i < 4 or True:
            p.set(x, y, WHITE)
    s = Pix()
    brown, brown_d, belly = (168, 112, 64), (110, 70, 40), (226, 210, 176)
    cx, cy = 34, 18
    s.ell(cx, cy, 6, 4.5, brown)  # body
    s.ell(cx + 1, cy + 1.5, 4, 3, belly)
    s.disc(cx + 5, cy - 4, 3.5, brown)  # head
    s.rect(cx + 4, cy - 8, 4, 2, (120, 110, 110))  # grey cap
    s.set(cx + 7, cy - 4, INK)  # eye
    s.set(cx + 6, cy - 5, WHITE)
    s.set(cx + 6, cy - 2, INK)  # black bib
    s.set(cx + 7, cy - 2, INK)
    s.poly([(cx + 8, cy - 4), (cx + 11, cy - 3), (cx + 8, cy - 2)], (230, 190, 90))  # beak
    # wing with stripes, tail cocked up
    s.ell(cx - 1, cy - 1, 4, 2.5, brown_d)
    s.hline(cx - 4, cx + 1, cy - 1, (200, 150, 90))
    s.poly([(cx - 5, cy - 1), (cx - 11, cy - 6), (cx - 10, cy - 3), (cx - 5, cy + 2)], brown_d)
    # legs on the rail
    s.vline(cx - 1, cy + 4, cy + 7, (200, 150, 100))
    s.vline(cx + 2, cy + 4, cy + 7, (200, 150, 100))
    p.paste(s)
    return p


def f10():
    """THE TWO HORSEMEN: two riders gallop side by side, one high on the ridge, one low on the road (two voices, octaves)."""
    k = Key("e")
    p = Pix()
    sky(p, k, lift=0.04, warm=0.4)
    p.disc(52, 9, 4, (250, 200, 150))
    ridge = k.c(-0.06, -0.1, 10)
    p.poly([(0, 21), (12, 17), (30, 16), (46, 18), (64, 15), (64, 40), (0, 40)], ridge)
    p.line(0, 21, 12, 17, light(ridge, 0.25))
    p.line(12, 17, 30, 16, light(ridge, 0.25))
    p.line(30, 16, 46, 18, light(ridge, 0.25))
    p.line(46, 18, 64, 15, light(ridge, 0.25))
    road = dark(ridge, 0.3)
    p.rect(0, 34, W, 6, road)
    p.hline(0, W - 1, 34, light(road, 0.2))

    def horse(lay, x, y, coat, coat_d, cloak):
        # body, neck forward, head; legs stretched in the gallop
        lay.ell(x, y, 6, 3, coat)
        lay.ell(x + 1, y + 1, 4, 1.5, coat_d)
        lay.poly([(x + 4, y - 2), (x + 8, y - 6), (x + 10, y - 5), (x + 7, y + 0)], coat)
        lay.poly([(x + 8, y - 7), (x + 12, y - 5), (x + 11, y - 3), (x + 8, y - 4)], coat)
        lay.set(x + 9, y - 6, INK)
        lay.line(x + 5, y - 3, x + 7, y - 7, coat_d)  # mane
        lay.line(x - 6, y - 1, x - 10, y + 2, coat_d)  # tail
        lay.line(x - 9, y + 2, x - 11, y + 3, coat_d)
        lay.line(x + 4, y + 2, x + 9, y + 4, coat)
        lay.line(x + 3, y + 2, x + 6, y + 5, coat_d)
        lay.line(x - 4, y + 2, x - 9, y + 4, coat)
        lay.line(x - 3, y + 2, x - 6, y + 5, coat_d)
        # the rider, leaning forward, cloak flying
        lay.rect(x - 1, y - 6, 3, 4, cloak)
        lay.poly([(x - 1, y - 6), (x - 7, y - 5), (x - 5, y - 3), (x - 1, y - 3)], dark(cloak, 0.2))
        face(lay, x + 2, y - 8, SKIN, r=1.6, look=1)
        lay.hline(x + 1, x + 3, y - 10, INK)

    a = Pix()
    horse(a, 22, 12, (230, 226, 216), (176, 170, 160), (190, 50, 50))
    p.paste(a)
    b = Pix()
    horse(b, 40, 29, (120, 72, 44), (80, 46, 30), (50, 90, 170))
    p.paste(b)
    # dust
    for x, y in ((8, 16), (10, 14), (27, 33), (25, 31)):
        p.set(x, y, light(ridge, 0.4))
    return p


def f14():
    """PIERROT: Pierrot in white at a window at night, one tear on his cheek (Bodky's teardrop countersubject)."""
    k = Key("f#")
    p = Pix()
    room = k.c(-0.08, -0.15)
    p.rect(0, 0, W, H, room)
    # the window: night sky, moon, its frame and cross
    win = k.c(0.0, 0.05)
    p.rect(30, 3, 28, 26, win)
    p.vgrad(30, 3, 28, 26, [k.c(-0.04), k.c(0.06), k.c(0.12)])
    p.disc(50, 10, 4, CREAM)
    stars(p, [(34, 6), (40, 12), (36, 20), (54, 22), (45, 5)])
    frame = (90, 66, 54)
    p.rect(28, 2, 32, 2, frame)
    p.rect(28, 28, 32, 3, frame)
    p.rect(28, 2, 2, 28, frame)
    p.rect(58, 2, 2, 28, frame)
    p.rect(43, 3, 2, 26, frame)
    p.rect(30, 15, 28, 1, frame)
    # moonlight on the floor
    for y in range(31, H):
        for x in range(26 - (y - 31), 58 - (y - 31) * 2):
            if (x + y) % 2 == 0:
                p.set(x, y, mix(room, CREAM, 0.25))
    pr = Pix()
    white, white_d = (244, 244, 250), (190, 194, 214)
    cx = 18
    # the loose white blouse falling to the floor, long empty sleeves, two black pompoms
    pr.poly([(cx - 4, 18), (cx + 4, 18), (cx + 7, 40), (cx - 7, 40)], white)
    pr.poly([(cx + 1, 18), (cx + 4, 18), (cx + 7, 40), (cx + 3, 40)], white_d)
    pr.disc(cx - 0.5, 24, 1, INK)
    pr.disc(cx - 0.5, 30, 1, INK)
    pr.thick(cx - 4, 19, cx - 8, 30, white, 2)  # the hanging sleeve
    pr.line(cx - 7, 30, cx - 9, 34, white_d)
    pr.line(cx - 6, 30, cx - 7, 34, white)
    # the ruff
    pr.ell(cx, 17, 6, 2, (236, 236, 244))
    for x in range(cx - 5, cx + 6, 2):
        pr.set(x, 18, white_d)
    # an oval chalk-white face, a black skullcap
    pr.ell(cx, 11, 3.4, 4.4, (250, 248, 250))
    for y in range(6, 10):
        for x in range(cx - 4, cx + 5):
            if ((x - cx) / 3.6) ** 2 + ((y - 10.5) / 4.6) ** 2 <= 1 and y < 9:
                pr.set(x, y, INK)
    pr.set(cx - 1, 11, INK)
    pr.set(cx + 2, 11, INK)
    pr.set(cx - 2, 10, INK)
    pr.set(cx + 3, 10, INK)
    pr.hline(cx, cx + 1, 14, RED)
    # the arm raised to the glass
    pr.thick(cx + 4, 20, cx + 10, 14, white, 2)
    pr.set(cx + 11, 13, (250, 248, 250))
    p.paste(pr)
    # the tear
    p.set(cx + 2, 12, (120, 200, 255))
    p.set(cx + 2, 13, (180, 230, 255))
    return p


def f16():
    """THE KNIGHT: a chess knight come alive, mid-leap in its L across the board (the answer swaps the subject's halves)."""
    k = Key("g")
    p = Pix()
    sky(p, k, 0, 22, lift=0.02)
    # the board in perspective
    for row in range(6):
        y0 = 22 + row * row * 0.5 + row * 2
        y1 = 22 + (row + 1) ** 2 * 0.5 + (row + 1) * 2
        for col in range(-6, 7):
            x0a, x1a = 32 + (col) * (6 + row * 1.6), 32 + (col + 1) * (6 + row * 1.6)
            x0b, x1b = 32 + (col) * (6 + (row + 1) * 1.6), 32 + (col + 1) * (6 + (row + 1) * 1.6)
            c = (232, 220, 196) if (row + col) % 2 else (60, 44, 46)
            p.poly([(x0a, y0), (x1a, y0), (x1b, y1), (x0b, y1)], c)
    # the L path: two squares across, one up, dotted
    pts = [(14, 34), (22, 34), (30, 34), (38, 34), (38, 28)]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        for t in range(0, 5):
            if t % 2 == 0:
                p.set(x0 + (x1 - x0) * t / 4, y0 + (y1 - y0) * t / 4, GOLD)
    n = Pix()
    ivory, ivory_d = (244, 238, 224), (196, 184, 160)
    cx, cy = 30, 12
    # the horse's head and mane, the piece's base, mid-leap (tilted forward)
    n.poly([(cx - 5, cy + 14), (cx - 6, cy + 4), (cx - 3, cy - 4), (cx + 1, cy - 6), (cx + 6, cy - 2), (cx + 8, cy + 2), (cx + 6, cy + 4), (cx + 2, cy + 2), (cx + 1, cy + 6), (cx + 4, cy + 14)], ivory)
    n.poly([(cx - 6, cy + 4), (cx - 3, cy - 4), (cx - 2, cy - 3), (cx - 4, cy + 6), (cx - 4, cy + 14), (cx - 5, cy + 14)], ivory_d)
    n.line(cx - 3, cy - 4, cx - 5, cy + 6, dark(ivory_d, 0.2))  # mane
    n.set(cx + 2, cy - 2, INK)  # eye
    n.set(cx + 7, cy + 2, dark(ivory_d, 0.3))  # nostril
    n.poly([(cx - 1, cy - 6), (cx, cy - 9), (cx + 1, cy - 6)], ivory)  # ear
    n.rect(cx - 7, cy + 14, 13, 2, ivory)
    n.rect(cx - 8, cy + 16, 15, 2, ivory_d)
    n.hline(cx - 7, cx + 5, cy + 14, WHITE)
    p.paste(n)
    # speed lines behind
    for y in (14, 18, 22):
        p.hline(14, 19, y, light(k.c(0.1), 0.5))
    return p


def f22():
    """THE PROCESSION: five hooded singers with lanterns close ranks on the road to a lit church door (five voices, stretti)."""
    k = Key("bb")
    p = Pix()
    sky(p, k, lift=-0.02)
    stars(p, [(4, 3), (14, 7), (26, 2), (36, 9), (20, 13)])
    # the church on the right, its door lit
    ch = k.c(-0.08, -0.2)
    p.poly([(42, 40), (42, 14), (52, 6), (62, 14), (62, 40)], ch)
    p.rect(50, 0, 4, 8, ch)
    p.poly([(49, 2), (52, -1), (55, 2)], ch)
    p.rect(47, 26, 10, 14, GOLD)
    p.disc(52, 26, 5, GOLD)
    p.rect(49, 27, 6, 13, FIRE_L)
    p.rect(51, 15, 2, 4, GOLD)
    # the road narrowing toward the door
    road = k.c(-0.1, -0.1, 20)
    p.poly([(0, 40), (0, 34), (46, 36), (56, 40)], road)
    p.poly([(0, 34), (46, 36), (47, 34), (0, 31)], dark(k.c(-0.04), 0.1))
    # five hooded figures, smaller as they near the door, closer together
    xs = [(7, 1.0), (16, 0.9), (24, 0.8), (31, 0.7), (37, 0.6)]
    for i, (x, s) in enumerate(xs):
        top = 36 - 22 * s
        p.glow(x + 4 * s + 1, top + 11 * s, 4 * s + 1, mix(k.c(0.0), GOLD, 0.35), inner=0.2)
    for i, (x, s) in enumerate(xs):
        f = Pix()
        top = 36 - 22 * s
        rb, rb_d, rb_l = (96, 76, 104), (64, 50, 72), (226, 170, 120)
        robe(f, x, top + 5 * s, 36 - (i * 0.4), 1.5 * s + 0.5, 4 * s, rb, rb_d)
        f.disc(x, top + 3 * s, 2.3 * s, rb)
        f.disc(x + 0.8, top + 3.4 * s, 1.3 * s, dark(rb_d, 0.4))
        f.set(x + 1, top + 3.5 * s, SKIN_D)
        f.vline(x + 2.5 * s, top + 6 * s, 35, rb_l)
        f.line(x + 2, top + 8 * s, x + 4 * s + 1, top + 9 * s, rb)
        f.vline(x + 4 * s + 1, top + 9 * s, top + 10 * s, GREY)
        p.paste(f)
        lx, ly = x + 4 * s + 1, top + 11 * s
        p.rect(lx - 1, ly, 2, 2, FIRE_L)
        p.set(lx, ly + 1, GOLD)
    return p


# ---- the owner's 48 (31 Oct 2026): the new pictures



def singer(L, cx, cy, tone, hair, style, robe_c, mouth_open, flip=False, r=3.5):
    """A singer's bust: robe to the frame's foot, a head, a mouth open by 0 (shut) to 3 (wide)."""
    robe(L, cx, cy + r, H - 1, r + 0.5, r + 4, robe_c, dark(robe_c, 0.3))
    L.hline(cx - 1, cx + 1, cy + r + 1, WHITE)  # a white collar
    head(L, cx, cy, tone, hair, style, r=r, mouth=False, flip=flip)
    my = cy + 2
    if mouth_open == 1:
        L.set(cx, my, INK)
    elif mouth_open == 2:
        L.rect(cx, my, 1, 2, INK)
    elif mouth_open >= 3:
        L.rect(cx - 1, my, 2, 2, INK)
        L.set(cx - 1, my + 2, RED_D)
    else:
        L.set(cx, my, mix(TONES[tone][1], RED_D, 0.5))



def f01():
    """THE CANON: four singers, women and men, in a staggered row, each mouth opening a beat after the last."""
    k = Key("C")
    p = Pix()
    stone, stone_d, stone_l = k.c(-0.04, -0.22), k.c(-0.1, -0.22), k.c(0.04, -0.22)
    p.rect(0, 0, W, H, stone)
    for y in range(0, H, 5):
        for x in range((y // 5 % 2) * 4, W, 8):
            p.hline(x, x + 6, y, stone_d)
            p.vline(x + 7, y, y + 4, stone_d)
            p.set(x, y + 1, stone_l)
    # candle-gold light from the candles behind
    for x in (6, 58):
        p.glow(x, 12, 9, mix(stone, GOLD, 0.35), inner=0.4)
        p.rect(x - 1, 10, 2, 8, CREAM)
        p.vline(x, 7, 9, FIRE_L)
        p.set(x, 8, FIRE)
        p.rect(x - 2, 18, 4, 2, GOLD_D)
    s = Pix()
    # the row steps up to the right: the first in, the mouth widest; the last, still shut
    singer(s, 12, 24, 1, "auburn", "long", (176, 40, 52), 3)
    singer(s, 25, 20, 3, "black", "beard", (60, 70, 140), 2)
    singer(s, 38, 16, 0, "blonde", "bun", (40, 120, 90), 1, flip=True)
    singer(s, 51, 12, 4, "black", "crop", (150, 100, 40), 0)
    p.paste(s)
    # their song: a note ahead of each open mouth
    notes_trail(p, [(17, 20), (30, 16), (43, 12)], GOLD)
    return p



def f03():
    """THE STONE-SKIPPER: Little Red Riding Hood skips a stone across a pond, her basket on her arm; rings at each bounce."""
    k = Key("C#")
    p = Pix()
    sky(p, k, 0, 18, lift=0.16)
    trees = k.c(-0.06, 0.0, 10)
    for x in range(0, W, 5):
        p.disc(x + 2, 15 + (x * 7) % 3, 3.5, trees)
        p.set(x + 1, 13 + (x * 7) % 3, light(trees, 0.2))
    water, water_d, water_l = (60, 130, 120), (40, 96, 96), (150, 206, 190)
    p.rect(0, 18, W, H - 18, water)
    for y in range(20, H, 3):
        for x in range((y * 3) % 9, W, 9):
            p.hline(x, x + 2, y, water_d)
    bank = (96, 150, 66)
    p.poly([(0, 24), (14, 25), (24, 30), (26, 40), (0, 40)], bank)
    p.line(0, 24, 14, 25, light(bank, 0.3))
    p.line(14, 25, 24, 30, light(bank, 0.3))
    for x, y in ((3, 32), (8, 36), (15, 33), (5, 28)):
        p.set(x, y, dark(bank, 0.25))
    # the stone's skips: rings smaller each bounce, the stone just past the last
    for cx, cy, rx in ((32, 31, 4), (42, 27, 3), (50, 24, 2.4), (56, 22, 1.6)):
        for a in range(0, 360, 20):
            p.set(cx + rx * math.cos(math.radians(a)), cy + rx * 0.4 * math.sin(math.radians(a)), water_l)
    for t in range(0, 30):
        x = 20 + t
        base = 31 - t * 0.33
        hop = abs(math.sin(math.pi * t / 10)) * (4 - t * 0.1)
        if t % 2 == 0:
            p.set(x, base - hop, light(water_l, 0.3))
    p.disc(59, 19, 1, (200, 196, 190))
    p.set(59, 18, WHITE)
    g = Pix()
    hood, hood_d = (210, 40, 44), (150, 26, 34)
    cx = 13
    # the cape over a pale dress, mid-throw: the arm swept out to the right
    g.poly([(cx - 4, 14), (cx + 3, 14), (cx + 7, 31), (cx - 7, 31)], hood)
    g.poly([(cx + 1, 14), (cx + 3, 14), (cx + 7, 31), (cx + 2, 31)], hood_d)
    g.rect(cx - 2, 26, 4, 5, (240, 230, 210))
    g.vline(cx - 1, 32, 35, TONES[1][1])
    g.vline(cx + 2, 32, 34, TONES[1][1])
    g.set(cx - 2, 35, INK)
    g.set(cx + 3, 34, INK)
    head(g, cx, 10, 1, "blonde", "braid", r=3, look=1)
    # the hood up round her face
    g.ring(cx, 10, 4, hood, 180, 360)
    g.vline(cx - 4, 10, 14, hood)
    g.vline(cx + 4, 9, 12, hood_d)
    g.hline(cx - 3, cx + 3, 6, hood)
    arm(g, cx + 3, 16, cx + 9, 19, hood_d, hand=TONES[1][0])
    # the basket on the other arm
    g.rect(cx - 9, 20, 6, 4, (196, 146, 80))
    g.hline(cx - 9, cx - 4, 20, (230, 190, 120))
    g.ring(cx - 6, 20, 2.5, (150, 100, 50), 180, 360)
    g.set(cx - 7, 19, WHITE)
    g.set(cx - 5, 19, (230, 60, 60))
    p.paste(g)
    return p



def f04():
    """THE CROSS: a great wooden cross on a hill at dusk, five candles lit at its foot."""
    k = Key("c#")
    p = Pix()
    sky(p, k, 0, 30, lift=0.02, warm=-1.5)
    p.vgrad(0, 18, W, 12, [k.c(0.06, 0.05, -40), (200, 120, 110), (240, 170, 110)])
    stars(p, [(5, 3), (14, 8), (50, 4), (58, 10), (42, 2)], light(k.c(0.2), 0.5))
    hill = k.c(-0.08, -0.15, -30)
    p.poly([(0, 40), (0, 32), (16, 28), (32, 26), (48, 28), (64, 31), (64, 40)], hill)
    p.line(16, 28, 32, 26, light(hill, 0.2))
    p.line(32, 26, 48, 28, light(hill, 0.2))
    c = Pix()
    wood, wood_d, wood_l = (130, 84, 50), (88, 54, 34), (176, 120, 76)
    c.rect(30, 3, 5, 25, wood)
    c.rect(33, 3, 2, 25, wood_d)
    c.vline(30, 3, 27, wood_l)
    c.rect(20, 9, 25, 4, wood)
    c.hline(20, 44, 9, wood_l)
    c.hline(20, 44, 12, wood_d)
    for y in (6, 16, 21):
        c.set(31, y, wood_d)
    p.paste(c)
    # five candles at the foot, their light pooled on the hill
    for i, x in enumerate((22, 26, 32, 38, 42)):
        h = 4 if i in (0, 4) else 5
        y = 29 - (1 if i == 2 else 0)
        p.glow(x, y - h - 1, 3, mix(hill, GOLD, 0.6), inner=0.3)
    for i, x in enumerate((22, 26, 32, 38, 42)):
        h = 4 if i in (0, 4) else 5
        y = 29 - (1 if i == 2 else 0)
        p.rect(x, y - h, 1, h, CREAM)
        p.set(x, y - h - 1, FIRE)
        p.set(x, y - h - 2, FIRE_L)
    return p



def f05():
    """THE CORONATION: a crown lowered onto a queen's bowed head in a cathedral, banners above."""
    k = Key("D")
    p = Pix()
    nave, nave_d = k.c(-0.06, -0.12), k.c(-0.12, -0.12)
    p.rect(0, 0, W, H, nave)
    for x in (2, 14, 46, 58):
        p.rect(x, 0, 4, H, k.c(0.04, -0.15))
        p.vline(x, 0, H - 1, k.c(0.12, -0.15))
        p.vline(x + 3, 0, H - 1, nave_d)
    p.glow(32, 8, 12, mix(nave, GOLD, 0.25), inner=0.3)
    # the tall window behind, gold light
    p.rect(28, 2, 8, 14, mix(nave, GOLD, 0.45))
    p.disc(31.5, 2, 4, mix(nave, GOLD, 0.45))
    p.vline(31, 0, 15, nave_d)
    p.hline(28, 35, 8, nave_d)
    # banners, purple and gilt, swung by the dotted rhythm
    for x, sw in ((8, 1), (20, -1), (40, 1), (52, -1)):
        p.poly([(x, 0), (x + 5, 0), (x + 5 + sw, 12), (x + 2.5 + sw, 10), (x + sw, 12)], PURPLE)
        p.vline(x + 2, 1, 9, GOLD)
        p.hline(x, x + 5, 0, GOLD_D)
    p.rect(0, 34, W, 6, (120, 30, 50))
    p.hline(0, W - 1, 34, (170, 60, 70))
    q = Pix()
    cx = 32
    # her gown and ermine cape, kneeling, head bowed
    q.poly([(cx - 9, 24), (cx + 9, 24), (cx + 12, 35), (cx - 12, 35)], PURPLE)
    q.poly([(cx + 3, 24), (cx + 9, 24), (cx + 12, 35), (cx + 5, 35)], PURPLE_D)
    q.poly([(cx - 8, 20), (cx + 8, 20), (cx + 10, 26), (cx - 10, 26)], (244, 240, 232))
    for x, y in ((cx - 6, 22), (cx - 2, 24), (cx + 3, 22), (cx + 7, 24), (cx - 8, 25), (cx + 1, 25)):
        q.set(x, y, INK)
    head(q, cx, 18, 2, "brown", "long", r=3.5, eyes="shut", mouth=True)
    # the crown, just above, held by two hands reaching down out of the light
    q.rect(cx - 4, 10, 9, 3, GOLD)
    for x in (cx - 4, cx, cx + 4):
        q.set(x, 9, GOLD)
        q.set(x, 8, FIRE_L)
    q.hline(cx - 4, cx + 4, 12, GOLD_D)
    q.set(cx - 2, 11, RED)
    q.set(cx + 2, 11, (90, 160, 230))
    for sx in (-1, 1):
        x = cx + sx * 7
        q.vline(x, 0, 8, (150, 40, 60))
        q.vline(x + sx, 0, 7, GOLD_D)
        q.set(x - sx, 9, TONES[1][0])
        q.set(x, 9, TONES[1][0])
        q.set(x - sx, 10, TONES[1][0])
    p.paste(q)
    for x, y in ((cx - 7, 7), (cx + 8, 6), (cx, 5)):
        p.set(x, y, WHITE)
    return p



def f06():
    """THE AMBUSH: a rider on a forest road; figures half-hidden behind the trees, a blade's glint."""
    k = Key("d")
    p = Pix()
    sky(p, k, 0, 24, lift=0.0)
    p.disc(50, 6, 3, (220, 220, 236))
    far = k.c(-0.1, -0.1)
    for x in range(0, W, 6):
        p.poly([(x, 26), (x + 3, 8 + (x * 5) % 6), (x + 6, 26)], far)
    road = k.c(-0.05, -0.25, 30)
    p.rect(0, 27, W, 13, road)
    p.hline(0, W - 1, 27, light(road, 0.2))
    for x in range(0, W, 7):
        p.set(x + 2, 32 + x % 3, dark(road, 0.3))
    trunk, trunk_d = (40, 34, 40), (24, 20, 26)
    steel = (196, 206, 224)
    # three trees in front, a watcher behind each
    for x, who in ((6, ("brown", "long", 2)), (46, ("black", "crop", 4)), (58, ("auburn", "bun", 0))):
        w = Pix()
        head(w, x + 4, 17, who[2], who[0], who[1], r=2.5, mouth=False, look=-1 if x > 30 else 1, cheek=False)
        w.rect(x + 2, 20, 5, 7, (54, 50, 70))
        p.paste(w, outline=None)
        p.rect(x, 0, 4, 31, trunk)
        p.vline(x + 3, 0, 30, trunk_d)
        p.vline(x, 0, 30, light(trunk, 0.2))
    p.line(52, 19, 52, 13, steel)  # a blade raised behind a tree
    p.set(52, 12, WHITE)
    p.line(9, 22, 12, 20, steel)
    # the rider, a man in a grey cloak, riding left to right on a dark horse
    r = Pix()
    x, y = 26, 24
    horse(r, x, y, (110, 74, 54), (74, 48, 36), stride=1)
    cloak = (120, 124, 140)
    r.poly([(x - 3, y - 9), (x + 2, y - 9), (x + 3, y + 2), (x - 4, y + 2)], cloak)
    r.poly([(x - 3, y - 8), (x - 9, y - 3), (x - 4, y + 1)], dark(cloak, 0.2))
    r.thick(x, y + 1, x + 2, y + 6, (60, 50, 50), 2)
    head(r, x, y - 12, 2, "brown", "beard", r=2.8, look=1)
    r.line(x + 2, y - 5, x + 10, y - 4, dark(cloak, 0.4))  # the reins
    p.paste(r)
    return p



def f07():
    """THE BICYCLE: a girl on an old high bicycle down a green lane, ribbon flying, ringing the bell."""
    k = Key("Eb")
    p = Pix()
    sky(p, k, 0, 26, lift=0.2)
    for cx, cy in ((10, 6), (14, 5), (18, 7)):
        p.disc(cx, cy, 2.6, WHITE)
    hedge = (70, 140, 70)
    p.rect(0, 22, W, 6, hedge)
    for x in range(0, W, 4):
        p.disc(x + 2, 22, 2.2, hedge)
        p.set(x + 1, 21, light(hedge, 0.3))
    lane = (190, 170, 120)
    p.rect(0, 28, W, 12, (110, 170, 80))
    p.poly([(0, 31), (64, 30), (64, 38), (0, 39)], lane)
    p.line(0, 31, 64, 30, light(lane, 0.3))
    b = Pix()
    metal, metal_d = (60, 60, 72), (34, 34, 44)
    fx, fy, fr = 36, 26, 11  # the great front wheel
    for rr in (fr, fr - 1):
        b.ring(fx, fy, rr, metal)
    for a in range(0, 360, 30):
        b.line(fx, fy, fx + (fr - 1) * math.cos(math.radians(a)), fy + (fr - 1) * math.sin(math.radians(a)), (150, 150, 160))
    b.disc(fx, fy, 1, metal_d)
    b.ring(20, 34, 3, metal)
    b.ring(20, 34, 2, metal)
    b.set(20, 34, metal_d)
    b.line(20, 34, 30, 16, metal)  # the backbone
    b.line(21, 34, 31, 16, metal_d)
    b.line(fx, fy, 34, 15, metal)  # the fork
    b.hline(32, 39, 13, metal)  # handlebar
    b.disc(39, 12, 1, GOLD)  # the bell
    b.set(39, 11, FIRE_L)
    p.paste(b)
    g = Pix()
    dress, dress_d = (236, 120, 150), (190, 80, 116)
    cx = 31
    g.poly([(cx - 3, 8), (cx + 3, 8), (cx + 4, 17), (cx - 5, 17)], dress)
    g.poly([(cx + 1, 8), (cx + 3, 8), (cx + 4, 17), (cx + 1, 17)], dress_d)
    g.thick(cx + 1, 16, cx + 4, 22, TONES[3][0], 1)  # a leg to the pedal
    g.thick(cx - 1, 16, cx + 2, 24, TONES[3][1], 1)
    head(g, cx, 4, 3, "black", "ponytail", r=2.6, look=1)
    arm(g, cx + 2, 10, cx + 7, 12, TONES[3][0], hand=None, w=1)
    p.paste(g)
    # the ribbon streaming back, the bell's ring
    for i in range(8):
        p.set(cx - 5 - i, 2 + i * 0.25 + math.sin(i * 0.9) * 1.2, (250, 220, 80))
    for x, y in ((41, 9), (42, 11), (41, 13)):
        p.set(x, y, WHITE)
    return p



def f08():
    """THE PILGRIM: a woman pilgrim with staff and shell on a long road at dusk, a shrine far off, lit."""
    k = Key("d#")
    p = Pix()
    sky(p, k, 0, 22, lift=0.04, warm=1.0)
    p.vgrad(0, 14, W, 8, [k.c(0.06, 0.05, 20), (200, 150, 110), (236, 190, 120)])
    land = k.c(-0.06, -0.15, 20)
    p.rect(0, 22, W, 18, land)
    p.hline(0, W - 1, 22, light(land, 0.2))
    dust = (170, 140, 100)
    p.poly([(44, 22), (47, 22), (40, 40), (12, 40)], dust)
    p.line(44, 22, 12, 40, light(dust, 0.25))
    # waymarks passed along the road
    for x, y, h in ((38, 31, 3), (43, 26, 2)):
        p.rect(x, y - h, 1, h, (200, 196, 180))
    # the shrine far off, its light
    p.glow(52, 19, 4, (250, 220, 140), inner=0.3)
    p.rect(50, 17, 4, 5, (220, 210, 190))
    p.poly([(49, 17), (52, 14), (55, 17)], (150, 70, 50))
    p.set(52, 19, FIRE_L)
    g = Pix()
    cloak, cloak_d = (120, 92, 70), (84, 62, 48)
    cx = 22
    robe(g, cx, 13, 35, 3.5, 7, cloak, cloak_d)
    g.poly([(cx - 4, 13), (cx + 4, 13), (cx + 5, 17), (cx - 5, 17)], light(cloak, 0.15))  # a shoulder cape
    g.set(cx - 2, 16, WHITE)
    g.set(cx - 3, 16, CREAM)
    g.set(cx - 2, 15, CREAM)  # the scallop shell
    head(g, cx, 9, 2, "brown", "braid", r=3, look=1)
    g.hline(cx - 6, cx + 6, 6, (150, 110, 60))  # the wide pilgrim hat
    g.rect(cx - 3, 4, 7, 2, (150, 110, 60))
    g.set(cx, 4, CREAM)
    g.vline(cx + 8, 4, 36, BROWN)  # the staff, a gourd hung on it
    g.disc(cx + 9, 9, 1.2, GOLD_D)
    arm(g, cx + 4, 15, cx + 7, 18, cloak_d, hand=TONES[2][0])
    p.paste(g)
    return p



def f12():
    """THE REQUIEM: a choir in black behind a draped bier, a row of candles lit before it."""
    k = Key("f")
    p = Pix()
    sky(p, k, lift=-0.04)
    p.glow(32, 16, 18, k.c(0.06), inner=0.3)
    for x in (4, 58):
        p.rect(x, 0, 3, H, k.c(-0.08, -0.1))
    ch = Pix()
    hairs = [("grey", "bun", 0), ("black", "crop", 4), ("auburn", "long", 1), ("brown", "beard", 2), ("blonde", "bob", 0), ("black", "curls", 3)]
    for i, (hc, st, tn) in enumerate(hairs):
        x = 10 + i * 9
        y = 11 if i % 2 else 13
        robe(ch, x, y + 3, 30, 3, 5, (40, 36, 48), (26, 24, 34))
        ch.set(x, y + 4, (220, 220, 220))
        head(ch, x, y, tn, hc, st, r=2.6, eyes="shut", mouth=True)
    p.paste(ch)
    # the bier, draped in dark cloth, a pale edge
    bier = Pix()
    bier.rect(14, 24, 36, 8, (60, 40, 70))
    bier.hline(14, 49, 24, (130, 110, 140))
    bier.rect(14, 31, 36, 2, (200, 190, 170))
    bier.vline(16, 33, 37, BROWN_D)
    bier.vline(47, 33, 37, BROWN_D)
    p.paste(bier)
    p.rect(0, 37, W, 3, k.c(-0.1, -0.1))
    for i in range(6):
        x = 8 + i * 10
        p.glow(x, 33, 3, mix(k.c(0.0), GOLD, 0.5), inner=0.3)
        p.rect(x, 34, 1, 4, CREAM)
        p.set(x, 33, FIRE)
        p.set(x, 32, FIRE_L)
    return p



def f11():
    """THE SHEPHERDESS: a shepherdess turns in a dance, ribbons flying, a lamb watching (the passepied)."""
    k = Key("F")
    p = Pix()
    sky(p, k, 0, 26, lift=0.18)
    p.disc(10, 7, 3, (255, 244, 200))
    for cx, cy in ((44, 6), (48, 5), (52, 7)):
        p.disc(cx, cy, 3, WHITE)
    meadow = (120, 176, 84)
    p.poly([(0, 26), (20, 23), (44, 25), (64, 22), (64, 40), (0, 40)], meadow)
    p.line(0, 26, 20, 23, light(meadow, 0.3))
    p.line(20, 23, 44, 25, light(meadow, 0.3))
    p.line(44, 25, 64, 22, light(meadow, 0.3))
    for x, y in ((6, 33), (14, 37), (40, 35), (56, 31), (60, 37), (30, 38)):
        p.set(x, y, WHITE if x % 2 else (250, 200, 220))
    s = Pix()
    dress, dress_d, apron = (90, 140, 220), (60, 100, 180), (248, 244, 230)
    cx = 28
    # the skirt twirling out, wide
    s.poly([(cx - 3, 19), (cx + 3, 19), (cx + 10, 31), (cx - 9, 32)], dress)
    s.poly([(cx + 1, 19), (cx + 3, 19), (cx + 10, 31), (cx + 3, 32)], dress_d)
    s.poly([(cx - 2, 21), (cx + 2, 21), (cx + 3, 29), (cx - 3, 29)], apron)
    s.rect(cx - 3, 14, 7, 6, (240, 236, 226))
    s.rect(cx - 2, 16, 5, 4, (180, 50, 60))  # bodice
    # her face (the owner: "looks off"): a fuller face, both eyes level, hair framing it to the shoulders
    head(s, cx, 10, 0, "blonde", "long", r=3, mouth=True)
    s.set(cx, 12, RED_D)
    # a straw hat tilted back, its brim behind her head
    s.hline(cx - 6, cx + 5, 6, (240, 210, 120))
    s.hline(cx - 5, cx + 4, 7, (214, 180, 96))
    s.rect(cx - 3, 4, 6, 2, (240, 210, 120))
    s.hline(cx - 3, cx + 2, 5, (230, 70, 90))  # the hat's ribbon
    # arms out, one up holding the crook
    s.thick(cx - 3, 15, cx - 8, 12, TONES[0][0], 1)
    s.thick(cx + 4, 15, cx + 9, 17, TONES[0][0], 1)
    s.vline(cx - 9, 4, 30, BROWN)
    s.ring(cx - 7, 4, 2, BROWN, 180, 360)
    s.set(cx - 9, 4, BROWN)
    s.vline(cx - 2, 32, 34, TONES[0][1])
    s.vline(cx + 2, 32, 33, TONES[0][1])
    p.paste(s)
    # ribbons flying from the hat
    for i in range(7):
        p.set(cx + 6 + i, 5 + math.sin(i * 1.1) * 1.5, (230, 60, 90))
        p.set(cx + 6 + i, 7 + math.sin(i * 1.1 + 1) * 1.5, (250, 220, 90))
    # the lamb
    lamb = Pix()
    lx, ly = 50, 32
    lamb.ell(lx, ly, 5, 3, WHITE)
    for dx in (-4, -2, 0, 2, 4):
        lamb.disc(lx + dx, ly - 2, 1.2, WHITE)
    lamb.disc(lx - 5, ly - 2, 2, (240, 234, 220))
    lamb.set(lx - 6, ly - 2, INK)
    lamb.set(lx - 4, ly - 4, (200, 190, 180))
    for dx in (-3, -1, 2, 4):
        lamb.vline(lx + dx, ly + 3, ly + 5, (70, 60, 60))
    p.paste(lamb)
    return p



def f13():
    """THE AQUARIUM: a boy watches fish drift in a big glass aquarium (Bodky's serene "Little Brook")."""
    k = Key("F#")
    p = Pix()
    wall = k.c(-0.02, -0.12)
    p.rect(0, 0, W, H, wall)
    p.rect(0, 33, W, 7, k.c(-0.1, -0.15))
    p.hline(0, W - 1, 33, k.c(-0.04, -0.15))
    # the tank: glass-blue water, a lid, a stand
    x0, y0, x1, y1 = 22, 5, 62, 31
    p.vgrad(x0, y0 + 2, x1 - x0, y1 - y0 - 2, [(110, 200, 210), (60, 150, 170), (40, 110, 130)])
    p.rect(x0 - 1, y0, x1 - x0 + 2, 2, (60, 60, 70))
    p.rect(x0 - 1, y1, x1 - x0 + 2, 3, (90, 70, 56))
    p.vline(x0 - 1, y0, y1, (200, 230, 236))
    p.vline(x1, y0, y1, (200, 230, 236))
    p.rect(x0, y1 - 3, x1 - x0, 3, (200, 180, 130))  # sand
    for x in range(x0 + 1, x1, 3):
        p.set(x, y1 - 3, (230, 214, 170))
    for x, h in ((26, 10), (29, 7), (55, 12), (58, 8)):  # weed
        for y in range(h):
            p.set(x + (1 if (y // 2) % 2 else 0), y1 - 4 - y, (60, 160, 80) if y % 3 else (90, 190, 100))
    for x, y in ((40, 22), (41, 18), (40, 14), (49, 11), (50, 8)):
        p.set(x, y, (220, 246, 250))
    p.hline(x0 + 2, x1 - 3, y0 + 3, (170, 230, 236))  # the light on the water
    f = Pix()

    def fish(x, y, c, d, flip=False):
        s = -1 if flip else 1
        f.ell(x, y, 3, 1.6, c)
        f.poly([(x - s * 3, y), (x - s * 6, y - 2), (x - s * 6, y + 2)], d)
        f.set(x + s * 2, y - 1, INK)
        f.set(x, y - 2, d)

    fish(36, 13, (250, 140, 40), (210, 90, 30))
    fish(48, 20, (250, 220, 70), (210, 160, 40), flip=True)
    fish(33, 24, (240, 90, 80), (190, 50, 60))
    p.paste(f, outline=(30, 70, 90))
    b = Pix()
    cx = 12
    # the boy in profile, nose to the glass, one hand on it
    shirt = (230, 210, 80)
    b.rect(cx - 4, 18, 8, 9, shirt)
    for y in (20, 23, 26):
        b.hline(cx - 4, cx + 3, y, (60, 110, 190))
    b.rect(cx - 3, 27, 3, 6, (60, 70, 110))
    b.rect(cx + 1, 27, 3, 6, (44, 52, 90))
    b.hline(cx - 4, cx - 1, 33, INK)
    b.hline(cx + 1, cx + 4, 33, INK)
    head(b, cx + 1, 13, 4, "black", "crop", r=3.8, look=2)
    b.set(cx + 5, 13, TONES[4][0])  # nose
    arm(b, cx + 3, 20, cx + 9, 16, shirt, hand=TONES[4][0])
    b.set(cx + 10, 16, TONES[4][0])
    p.paste(b)
    return p



def f15():
    """THE PINBALL: a pinball machine's playfield, the ball mid-flight among lit bumpers."""
    k = Key("G")
    p = Pix()
    p.rect(0, 0, W, H, k.c(-0.14, -0.1))
    # the playfield in perspective: wide at the foot, narrow at the head
    field = k.c(0.0, 0.2)
    p.poly([(14, 2), (50, 2), (60, 39), (4, 39)], field)
    p.vgrad(16, 3, 33, 6, [k.c(0.2, 0.3), field])
    chrome = (210, 216, 230)
    p.line(14, 2, 4, 39, chrome)
    p.line(50, 2, 60, 39, chrome)
    p.line(15, 2, 5, 39, (130, 136, 150))
    p.hline(14, 50, 2, chrome)
    # neon lanes and arrows
    for x0, x1 in ((22, 16), (42, 48)):
        p.line(x0, 10, x1, 30, (255, 90, 200))
    for x, y in ((30, 28), (34, 28), (32, 25)):
        p.set(x, y, (255, 240, 90))
    # three bumpers, two lit
    for (x, y, lit) in ((24, 13, True), (40, 13, True), (32, 19, False)):
        b = Pix()
        top = (255, 90, 120) if lit else (120, 60, 90)
        b.disc(x, y, 3.5, (40, 40, 60))
        b.disc(x, y - 1, 3, top)
        b.disc(x, y - 1, 1.5, WHITE if lit else light(top, 0.3))
        p.paste(b)
        if lit:
            for dx, dy in ((-5, -2), (5, -2), (0, -6), (-4, 3), (4, 3)):
                p.set(x + dx, y + dy, (255, 240, 120))
    # flippers
    fl = Pix()
    fl.thick(18, 33, 27, 36, (250, 250, 250), 2)
    fl.thick(46, 33, 37, 36, (250, 250, 250), 2)
    fl.disc(18, 33, 1.5, RED)
    fl.disc(46, 33, 1.5, RED)
    p.paste(fl)
    # the ball, chrome, flying, a trail behind
    for i in range(5):
        p.set(38 + i * 2, 29 - i * 3, light(field, 0.25 + i * 0.05))
    ball = Pix()
    ball.disc(35, 24, 2.2, chrome)
    ball.set(34, 23, WHITE)
    ball.set(36, 25, (120, 126, 140))
    p.paste(ball)
    return p



def f17():
    """THE DIARY: a girl writing in a diary by a summer window, a pressed flower on the page."""
    k = Key("Ab")
    p = Pix()
    wall = k.c(0.06, -0.12, -40)
    p.rect(0, 0, W, H, wall)
    # the summer window: light, a tree, a curtain
    p.rect(36, 3, 24, 22, (170, 214, 236))
    p.disc(50, 18, 7, (110, 180, 90))
    p.disc(44, 20, 5, (90, 160, 80))
    p.disc(54, 8, 3, (255, 244, 180))
    p.rect(36, 3, 24, 1, (240, 230, 210))
    p.vline(48, 3, 24, (240, 230, 210))
    p.hline(36, 59, 13, (240, 230, 210))
    p.rect(35, 2, 26, 1, BROWN_D)
    p.poly([(56, 2), (61, 2), (62, 26), (58, 26)], (230, 200, 120))  # the curtain
    p.dither(37, 4, 22, 20, (255, 250, 220), 1)
    p.rect(34, 25, 28, 2, (240, 230, 210))
    # light falling across the desk
    desk = (150, 104, 66)
    p.rect(0, 28, W, 3, desk)
    p.hline(0, W - 1, 28, light(desk, 0.3))
    p.rect(0, 31, W, 9, k.c(-0.08, -0.15, -40))
    p.vline(6, 31, 39, dark(desk, 0.3))
    p.vline(58, 31, 39, dark(desk, 0.3))
    # the open diary, a pressed flower on the left page
    d = Pix()
    d.poly([(22, 27), (31, 26), (31, 28), (22, 29)], (248, 244, 230))
    d.poly([(31, 26), (40, 27), (40, 29), (31, 28)], (230, 224, 206))
    d.rect(21, 28, 20, 1, (120, 60, 70))
    d.set(25, 27, (230, 120, 160))
    d.set(26, 26, (230, 120, 160))
    d.set(24, 26, (230, 120, 160))
    d.set(25, 28, (90, 150, 70))
    for x in range(33, 39, 2):
        d.set(x, 27, (120, 120, 160))
    p.paste(d)
    g = Pix()
    cx = 22
    dress = (90, 150, 210)
    g.poly([(cx - 5, 17), (cx + 3, 17), (cx + 5, 28), (cx - 7, 28)], dress)
    g.poly([(cx, 17), (cx + 3, 17), (cx + 5, 28), (cx + 1, 28)], dark(dress, 0.25))
    g.hline(cx - 3, cx + 1, 17, WHITE)
    head(g, cx, 12, 0, "red", "bun", r=3.5, look=1)
    g.set(cx + 1, 13, TONES[0][1])  # eyes down on the page
    arm(g, cx + 2, 20, cx + 11, 25, dress, hand=TONES[0][0])
    g.line(cx + 11, 25, cx + 13, 22, GOLD_D)  # the pen
    p.paste(g)
    return p



def f18():
    """THE SLEEPWALKER: a figure in a nightgown walks a rooftop ridge under a big moon, arms out, perfectly balanced."""
    k = Key("g#")
    p = Pix()
    sky(p, k, lift=-0.02)
    p.disc(44, 14, 11, (238, 232, 204))
    p.disc(41, 11, 2, (214, 206, 180))
    p.disc(47, 18, 1.5, (214, 206, 180))
    p.disc(49, 10, 1, (214, 206, 180))
    stars(p, [(4, 4), (12, 10), (22, 3), (60, 4), (58, 28), (6, 20)])
    far = k.c(-0.09, -0.2)
    for x0, top in ((0, 26), (14, 24), (52, 25)):
        p.poly([(x0, 40), (x0, top + 4), (x0 + 6, top), (x0 + 12, top + 4), (x0 + 12, 40)], far)
    p.rect(8, 21, 2, 5, far)
    roof = k.c(-0.04, -0.15, 20)
    p.poly([(0, 40), (0, 33), (64, 30), (64, 40)], roof)
    p.line(0, 33, 64, 30, light(roof, 0.3))
    for x in range(4, W, 6):
        p.line(x, 35, x - 2, 39, dark(roof, 0.3))
    p.rect(54, 25, 4, 6, roof)
    p.rect(53, 24, 6, 1, light(roof, 0.2))
    s = Pix()
    gown, gown_d = (232, 230, 244), (180, 178, 206)
    cx = 26
    robe(s, cx, 14, 29, 2.5, 5, gown, gown_d)
    # the face (the owner: improve face and hat): a round face, eyes shut in two dark arcs, a calm mouth
    head(s, cx, 10, 2, "brown", "short", r=3.2, eyes="shut", mouth=True, cheek=True)
    for dx in (-2, 1):
        s.hline(cx + dx, cx + dx + 1, 10, INK)
        s.set(cx + dx, 9, TONES[2][1])
    # a soft striped nightcap drooping to one side, a pompom at its tip
    cap, cap_s = (90, 110, 200), (236, 236, 250)
    s.poly([(cx - 4, 9), (cx + 4, 9), (cx + 3, 6), (cx - 2, 5)], cap)
    s.poly([(cx + 1, 5), (cx + 3, 6), (cx + 8, 9), (cx + 9, 11)], cap)
    for x in (cx - 2, cx + 1, cx + 4, cx + 7):
        s.line(x, 9 if x < cx + 3 else 8 + (x - cx - 3) // 2, x + 1, 5 if x < cx + 3 else 6 + (x - cx - 3) // 2, cap_s)
    s.hline(cx - 4, cx + 4, 9, cap_s)
    s.disc(cx + 9, 12, 1.2, WHITE)
    # arms straight out, balanced
    s.hline(cx - 11, cx - 2, 16, gown)
    s.hline(cx + 2, cx + 11, 16, gown)
    s.hline(cx - 11, cx - 2, 17, gown_d)
    s.hline(cx + 2, cx + 11, 17, gown_d)
    s.set(cx - 12, 16, TONES[2][0])
    s.set(cx + 12, 16, TONES[2][0])
    s.vline(cx - 1, 30, 31, TONES[2][0])
    s.vline(cx + 1, 30, 31, TONES[2][0])
    p.paste(s)
    p.set(cx + 6, 4, CREAM)  # z z
    p.hline(cx + 8, cx + 9, 2, CREAM)
    p.hline(cx + 11, cx + 13, 0, CREAM)
    return p



def f19():
    """THE THREE STOOGES: three slapstick comedians, two men and a woman, a pie in flight, in silent-film sepia."""
    k = Key("A")
    p = Pix()
    sep = lambda l: hls(k.h * 0.0 + 32, l, 0.32)  # noqa: E731  sepia, warmed toward the key
    p.vgrad(0, 0, W, 30, [sep(0.30), sep(0.40), sep(0.48)])
    p.rect(0, 30, W, 10, sep(0.26))
    p.hline(0, W - 1, 30, sep(0.5))
    for x in range(0, W, 8):
        p.vline(x, 31, 39, sep(0.2))
    # a painted backdrop: a door and a window
    p.rect(44, 8, 10, 22, sep(0.22))
    p.set(52, 19, sep(0.6))
    p.rect(8, 7, 10, 8, sep(0.55))
    p.vline(13, 7, 14, sep(0.3))
    p.hline(8, 17, 11, sep(0.3))
    c = Pix()
    suit, suit_d = sep(0.18), sep(0.1)
    # left: the bowl-cut one ducks, hands on knees
    head(c, 11, 20, 0, sep(0.2), "short", r=3.2, look=1, mouth=sep(0.1))
    c.rect(7, 23, 8, 6, suit)
    c.rect(7, 29, 3, 4, suit_d)
    c.rect(12, 29, 3, 4, suit_d)
    # middle: the bald one, a pie square in the face
    c.rect(28, 19, 8, 10, suit)
    c.rect(29, 29, 3, 4, suit_d)
    c.rect(33, 29, 3, 4, suit_d)
    head(c, 32, 14, 1, sep(0.12), "bald", r=3.6, mouth=False)
    c.disc(32, 14, 2.6, sep(0.92))
    c.set(31, 13, sep(0.75))
    c.set(34, 15, sep(0.75))
    c.thick(28, 21, 24, 17, suit, 2)
    c.thick(36, 21, 40, 17, suit, 2)
    # right: the woman in curls, arm back, a second pie ready
    c.poly([(48, 20), (54, 20), (56, 33), (46, 33)], sep(0.62))
    c.poly([(51, 20), (54, 20), (56, 33), (52, 33)], sep(0.5))
    head(c, 51, 15, 1, sep(0.12), "curls", r=3, look=-1, mouth=sep(0.1))
    c.thick(54, 21, 59, 16, sep(0.62), 2)
    c.ell(60, 14, 3, 1.5, sep(0.85))
    c.hline(57, 63, 15, sep(0.4))
    c.thick(48, 22, 44, 25, sep(0.62), 2)
    p.paste(c, outline=sep(0.05))
    # splash and stars round the hit
    for x, y in ((26, 11), (38, 11), (25, 16), (39, 17), (32, 8)):
        p.set(x, y, sep(0.95))
    # the film: dark edges, a scratch, a flicker of grain
    p.rect(0, 0, W, 1, (10, 8, 6))
    p.rect(0, 39, W, 1, (10, 8, 6))
    for x in (0, 1, 62, 63):
        p.vline(x, 0, H - 1, (16, 12, 8))
    p.vline(20, 2, 37, sep(0.62))
    for x, y in ((6, 5), (41, 33), (57, 4), (23, 36), (60, 27)):
        p.set(x, y, sep(0.7))
    return p



def f20():
    """THE LOCOMOTIVE: a steam locomotive at full power, pistons driving, smoke streaming; its driver, a woman, at the cab."""
    k = Key("a")
    p = Pix()
    sky(p, k, 0, 30, lift=0.02, warm=0.6)
    p.rect(0, 33, W, 7, k.c(-0.1, -0.1, 20))
    p.hline(0, W - 1, 33, (120, 110, 110))
    for x in range(0, W, 4):
        p.rect(x, 34, 2, 1, (90, 60, 40))
    # the smoke streaming back over the engine
    for i, (x, y, r) in enumerate(((22, 5, 3), (28, 4, 3.5), (35, 3, 4), (43, 4, 4.5), (52, 5, 5), (61, 7, 5))):
        p.disc(x, y, r, mix((220, 216, 220), k.c(0.1), i * 0.12))
        p.set(x - 1, y - 1, WHITE)
    e = Pix()
    coal, coal_d = (44, 40, 48), (26, 24, 30)
    red, red_d = (190, 44, 40), (130, 28, 30)
    e.rect(8, 15, 30, 9, coal)  # boiler
    e.hline(8, 37, 15, (90, 86, 96))
    for x in (14, 22, 30):
        e.vline(x, 15, 23, GOLD_D)  # bands
    e.rect(4, 17, 4, 7, coal_d)  # the smokebox front
    e.disc(5, 20, 2, (250, 220, 120))  # the lamp
    e.rect(16, 9, 4, 6, coal)  # the funnel
    e.rect(15, 8, 6, 2, coal)
    e.disc(28, 13, 2, GOLD)  # dome
    e.rect(38, 8, 14, 16, red)  # the cab
    e.rect(38, 7, 16, 2, coal)
    e.rect(42, 10, 6, 6, (250, 220, 150))  # the cab window, lit
    e.rect(48, 8, 4, 16, red_d)
    e.rect(52, 14, 10, 10, coal)  # tender
    e.hline(52, 61, 13, (80, 76, 86))
    e.rect(2, 24, 60, 2, red_d)  # the running board
    e.poly([(0, 30), (4, 26), (6, 26), (6, 30)], red_d)  # cow-catcher
    p.paste(e)
    head(p, 45, 13, 3, "black", "bun", r=2.5, look=-1)
    p.rect(43, 15, 5, 1, (60, 80, 140))
    # driving wheels and the rod
    for x, r in ((14, 4.5), (25, 4.5), (36, 4.5), (47, 2.5), (57, 2.5)):
        w = Pix()
        w.disc(x, 33 - r - 0.5 if r > 3 else 31, r, red)
        w.disc(x, 33 - r - 0.5 if r > 3 else 31, r - 1.5, coal)
        w.set(x, (33 - r - 0.5) if r > 3 else 31, GOLD)
        p.paste(w)
    p.thick(12, 30, 38, 27, (210, 210, 220), 1)
    p.rect(4, 26, 7, 3, (160, 160, 170))  # the piston
    # steam at the cylinder
    for x, y in ((2, 28), (1, 26), (3, 31)):
        p.set(x, y, WHITE)
    return p



def f21():
    """THE MARIONETTES: three marionettes, a dancer, a soldier and a harlequin, dancing in step, strings rising out of frame."""
    k = Key("Bb")
    p = Pix()
    p.rect(0, 0, W, H, k.c(-0.06, -0.05))
    p.glow(32, 22, 22, k.c(0.04), inner=0.4)
    curtain, curtain_d = (190, 36, 52), (130, 22, 40)
    p.rect(0, 0, W, 4, curtain)
    for x in range(0, W, 4):
        p.disc(x + 2, 4, 2, curtain)
    for x in range(0, 5):
        c = curtain if x % 2 == 0 else curtain_d
        p.vline(x, 0, 34, c)
        p.vline(W - 1 - x, 0, 34, c)
    p.hline(0, W - 1, 0, GOLD)
    p.rect(0, 33, W, 7, (140, 90, 50))
    p.hline(0, W - 1, 33, GOLD)
    p.hline(0, W - 1, 34, (190, 130, 70))
    wood = (232, 196, 150)
    s = Pix()

    def puppet(cx, kind):
        # strings first, from the hands, the head and the knee up out of frame
        for x0, y0 in ((cx - 6, 14), (cx + 6, 14), (cx, 8), (cx + 3, 26)):
            p.vline(x0, 0, y0 - 1, (236, 232, 220))
        if kind == "dancer":
            s.rect(cx - 2, 13, 5, 5, (240, 140, 180))
            s.ell(cx, 19, 6, 1.6, (250, 200, 220))  # the tutu
            s.hline(cx - 6, cx + 6, 19, (240, 170, 200))
            leg = wood
            head(s, cx, 10, 0, "brown", "bun", r=2.6)
        elif kind == "soldier":
            s.rect(cx - 2, 13, 5, 6, (50, 90, 180))
            s.hline(cx - 2, cx + 2, 15, GOLD)
            s.hline(cx - 2, cx + 2, 17, GOLD)
            leg = WHITE
            head(s, cx, 10, 1, "black", "crop", r=2.6)
            s.rect(cx - 2, 3, 5, 5, (40, 36, 44))  # the shako
            s.set(cx, 3, RED)
            s.hline(cx - 1, cx + 1, 12, INK)  # a moustache
        else:
            for y in range(13, 19):
                for x in range(cx - 2, cx + 3):
                    s.set(x, y, (250, 200, 60) if (x + y) % 2 else (40, 160, 120))
            leg = (40, 160, 120)
            head(s, cx, 10, 3, "black", "short", r=2.6)
            s.poly([(cx - 3, 8), (cx + 3, 8), (cx, 5)], (40, 36, 44))  # the harlequin's cap
        # arms up to the strings, joints as dots
        s.line(cx - 2, 14, cx - 6, 14, wood)
        s.line(cx + 2, 14, cx + 6, 14, wood)
        s.set(cx - 4, 14, dark(wood, 0.3))
        s.set(cx + 4, 14, dark(wood, 0.3))
        # in step: the left leg straight, the right kicked up at the knee
        s.vline(cx - 1, 19, 30, leg)
        s.line(cx + 1, 19, cx + 3, 25, leg)
        s.line(cx + 3, 26, cx + 6, 28, leg)
        s.set(cx + 3, 25, dark(leg, 0.3))
        s.set(cx - 1, 25, dark(leg, 0.3))
        s.hline(cx - 2, cx - 1, 31, INK)

    puppet(15, "dancer")
    puppet(32, "soldier")
    puppet(49, "harlequin")
    p.paste(s)
    # the floor's shadows under them
    for cx in (15, 32, 49):
        p.hline(cx - 3, cx + 4, 35, (110, 70, 40))
    return p



def f23():
    """THE GRAMOPHONE: an old gramophone with a brass horn in a quiet room, a cat asleep beside it."""
    k = Key("B")
    p = Pix()
    wall = k.c(0.0, -0.12)
    p.rect(0, 0, W, H, wall)
    for x in range(3, W, 8):
        p.vline(x, 0, 26, k.c(-0.04, -0.12))
    p.rect(0, 27, W, 13, (110, 74, 50))
    p.hline(0, W - 1, 27, (150, 104, 70))
    p.ell(30, 36, 26, 3, (150, 50, 50))  # the rug
    p.ell(30, 36, 22, 2, (180, 80, 60))
    # a small framed picture and the lamp's light
    p.rect(50, 6, 8, 6, (180, 140, 70))
    p.rect(51, 7, 6, 4, k.c(0.12))
    p.glow(8, 12, 9, mix(wall, GOLD, 0.35), inner=0.3)
    g = Pix()
    wood, wood_d = (150, 92, 50), (100, 60, 34)
    g.rect(14, 24, 16, 8, wood)  # the box
    g.rect(14, 24, 16, 1, light(wood, 0.3))
    g.rect(24, 24, 6, 8, wood_d)
    g.rect(15, 32, 2, 2, wood_d)
    g.rect(27, 32, 2, 2, wood_d)
    g.ell(22, 23, 7, 1.3, (30, 26, 30))  # the record
    g.hline(21, 23, 23, (200, 60, 60))
    g.disc(18, 26, 1, GOLD_D)  # the crank
    g.line(17, 27, 13, 28, GOLD_D)
    g.line(27, 22, 30, 15, GOLD_D)  # the arm up to the horn
    # the horn, flaring up and out to the right
    brass, brass_d, brass_l = (230, 176, 70), (170, 116, 40), (255, 226, 140)
    g.poly([(29, 16), (31, 14), (44, 2), (50, 12), (32, 18)], brass)
    g.poly([(31, 17), (48, 11), (50, 12), (32, 18)], brass_d)
    g.ell(47, 7, 3, 6, brass_l)
    g.ell(47, 7, 2, 4.5, brass_d)
    g.line(32, 15, 43, 4, brass_l)
    p.paste(g)
    # the cat, curled asleep on the rug
    c = Pix()
    fur, fur_d = (90, 84, 96), (60, 56, 66)
    c.ell(42, 33, 7, 3, fur)
    c.ell(43, 34, 5, 1.6, fur_d)
    c.disc(36, 32, 2.5, fur)
    c.set(35, 29, fur)
    c.set(37, 29, fur)
    c.hline(35, 36, 32, INK)
    c.line(49, 33, 52, 35, fur_d)
    p.paste(c)
    p.set(37, 26, CREAM)  # a z
    p.hline(38, 39, 24, CREAM)
    return p



def f24():
    """FAUST: a scholar, a woman, in her study at night, a book open, a sign glowing in the air before her."""
    k = Key("b")
    p = Pix()
    wall = k.c(-0.02, -0.15)
    p.rect(0, 0, W, H, wall)
    # shelves of books
    for y in (4, 13):
        p.rect(0, y + 7, 18, 1, BROWN)
        x = 1
        while x < 17:
            w = 1 + (x * 3 + y) % 2
            h = 5 + (x + y) % 3
            col = [(140, 50, 50), (60, 90, 140), (150, 120, 60), (70, 110, 70)][(x + y) % 4]
            p.rect(x, y + 7 - h, w, h, col)
            x += w + (1 if x % 5 == 0 else 0)
    p.rect(0, 31, W, 9, (70, 46, 36))
    p.hline(0, W - 1, 31, (110, 74, 54))
    # the sign: a ring of light with points, glowing in the dark air
    sx, sy = 46, 12
    p.glow(sx, sy, 10, mix(wall, (240, 220, 140), 0.4), inner=0.2)
    p.ring(sx, sy, 6, (255, 240, 170))
    p.ring(sx, sy, 3, (255, 240, 170))
    for a in range(0, 360, 60):
        p.set(sx + 6 * math.cos(math.radians(a + 30)), sy + 6 * math.sin(math.radians(a + 30)), WHITE)
    p.set(sx, sy, WHITE)
    # the lectern and the open book, a candle
    lec = Pix()
    lec.poly([(22, 22), (34, 20), (34, 23), (22, 25)], (130, 84, 50))
    lec.rect(27, 24, 3, 8, (100, 62, 38))
    lec.poly([(23, 21), (28, 19), (28, 21), (23, 23)], (246, 238, 214))
    lec.poly([(28, 19), (33, 18), (33, 20), (28, 21)], (226, 216, 190))
    lec.rect(36, 24, 2, 5, CREAM)
    p.paste(lec)
    p.set(36, 23, FIRE)
    p.set(36, 22, FIRE_L)
    s = Pix()
    cx = 13
    gown, gown_d = (70, 60, 110), (46, 40, 80)
    robe(s, cx, 17, 31, 3.5, 7, gown, gown_d)
    s.hline(cx - 3, cx + 3, 17, (200, 170, 90))
    head(s, cx, 13, 1, "grey", "bun", r=3.2, look=1)
    arm(s, cx + 3, 19, cx + 12, 14, gown, hand=TONES[1][0])  # her hand reaching to the sign
    s.set(cx + 13, 13, TONES[1][0])
    p.paste(s)
    return p


PICTURES = {f"wtc1f{n:02d}": globals()[f"f{n:02d}"] for n in range(1, 25) if f"f{n:02d}" in globals()}

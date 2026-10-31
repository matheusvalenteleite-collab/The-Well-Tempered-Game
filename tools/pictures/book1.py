"""Book I: the company of 24 (Mario and Luigi's report §3, system A; the names in fugue-names.ts).

One character a fugue, big, in one telling pose with one prop, on the key's own ground; the subject
hidden in the scene only where it falls naturally (I/1's three bells rung in close succession, I/3's
seven balls for seven sharps, I/12's ten steps, I/24's twelve hours).
"""
import math
from lib import *  # noqa: F401,F403


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


def f01():
    """THE BELL-RINGER: a monk in a belfry pulls the rope; three bells swing at three angles (the stretti)."""
    k = Key("C")
    p = Pix()
    sky(p, k, lift=0.14)
    wall, wall_d, wall_l = k.c(-0.08, -0.22, 10), k.c(-0.13, -0.22, 10), k.c(-0.02, -0.22, 10)
    # the belfry's arches: stone round three openings
    p.rect(0, 0, W, H, wall)
    for ox in (4, 24, 44):
        p.rect(ox, 8, 16, 26, k.c(0.14))
        p.disc(ox + 7.5, 8, 7.5, k.c(0.12))
        p.rect(ox, 22, 16, 12, k.c(0.2, 0.05))
    for y in range(0, H, 4):
        for x in range((y // 4 % 2) * 3, W, 6):
            if p.get(x, y)[:3] == wall:
                p.hline(x, x + 4, y, wall_d)
    for ox in (4, 24, 44):
        p.vline(ox - 1, 8, 34, wall_l)
    stars(p, [(8, 26), (29, 27), (52, 25), (56, 29), (12, 30)], light(k.c(0.2), 0.5))
    # the beam
    p.rect(0, 2, W, 3, BROWN)
    p.hline(0, W - 1, 2, mix(BROWN, GOLD, 0.3))
    p.hline(0, W - 1, 4, BROWN_D)
    lay = Pix()
    bell(lay, 32, 5, 12, GOLD, GOLD_D, 0)
    bell(lay, 12, 5, 9, (226, 170, 70), GOLD_D, 24)
    bell(lay, 52, 5, 9, (226, 170, 70), GOLD_D, -16)
    p.paste(lay)
    # sound: small rays from the big bell
    for x, y in ((23, 9), (22, 12), (41, 9), (42, 12)):
        p.set(x, y, WHITE)
    # the ropes down to the monk's hands
    p.vline(32, 19, 20, CREAM)
    p.line(8, 14, 29, 21, (200, 186, 150))
    p.line(56, 13, 35, 21, (200, 186, 150))
    # the monk: brown habit, a white cord, tonsure, both hands up on the rope
    m = Pix()
    habit, habit_d = (140, 90, 56), (96, 60, 38)
    robe(m, 32, 27, 39, 5, 9, habit, habit_d)
    m.hline(28, 36, 32, CREAM)
    m.set(29, 33, CREAM)
    m.set(29, 34, CREAM)
    m.thick(27, 29, 30, 22, habit, 2)
    m.thick(36, 29, 33, 22, habit_d, 2)
    m.rect(30, 21, 2, 2, SKIN)
    m.rect(33, 21, 2, 2, SKIN)
    m.poly([(27, 26), (37, 26), (36, 29), (28, 29)], habit_d)  # the hood fallen back
    face(m, 32, 25, SKIN, r=3, mouth=SKIN_B, cheek=True)
    m.hline(30, 34, 22, (110, 70, 44))  # hair round the tonsure
    m.set(29, 23, (110, 70, 44))
    m.set(35, 23, (110, 70, 44))
    m.set(32, 22, SKIN)
    p.paste(m)
    p.rect(0, 39, W, 1, wall_d)
    return p


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


def f03():
    """THE JUGGLER: a jester in motley keeps seven balls in the air (seven sharps)."""
    k = Key("C#")
    p = Pix()
    sky(p, k, lift=0.12)
    # a stage: boards and a curtain's edges
    p.rect(0, 33, W, 7, (140, 96, 60))
    for x in range(0, W, 8):
        p.vline(x, 34, 39, (104, 70, 44))
    p.hline(0, W - 1, 33, (196, 146, 96))
    for x in range(0, 6):
        p.vline(x, 0, 32 - x * 2, (176, 40, 56) if x % 2 == 0 else (140, 28, 44))
        p.vline(W - 1 - x, 0, 32 - x * 2, (176, 40, 56) if x % 2 == 0 else (140, 28, 44))
    j = Pix()
    a, b = (230, 58, 86), (250, 196, 60)
    cx = 32
    for y in range(19, 30):
        half = 4 if y < 27 else 4 + (y - 27)
        for x in range(int(cx - half), int(cx + half) + 1):
            j.set(x, y, a if ((x // 2 + y // 2) % 2) else b)
    j.hline(cx - 4, cx + 4, 19, WHITE)  # collar
    j.set(cx - 2, 20, WHITE)
    j.set(cx + 2, 20, WHITE)
    j.rect(cx - 3, 30, 2, 3, b)
    j.rect(cx + 2, 30, 2, 3, a)
    j.rect(cx - 5, 32, 4, 1, a)
    j.rect(cx + 2, 32, 4, 1, b)
    j.set(cx - 5, 31, a)
    j.set(cx + 5, 31, b)
    face(j, cx, 15, SKIN, r=2.6, mouth=RED_D, cheek=True)
    # the cap: two horns ending in bells
    j.poly([(cx - 3, 13), (cx, 11), (cx - 8, 7), (cx - 9, 9)], a)
    j.poly([(cx + 3, 13), (cx, 11), (cx + 8, 7), (cx + 9, 9)], b)
    j.hline(cx - 3, cx + 3, 12, a)
    j.set(cx - 10, 9, GOLD)
    j.set(cx + 10, 9, GOLD)
    # arms up and out
    j.thick(cx - 4, 21, cx - 9, 16, a, 2)
    j.thick(cx + 4, 21, cx + 9, 16, b, 2)
    j.set(cx - 10, 15, SKIN)
    j.set(cx + 10, 15, SKIN)
    p.paste(j)
    # seven balls on an arc, hand to hand
    cols = [(255, 90, 90), (255, 160, 60), (250, 230, 80), (110, 214, 110), (90, 186, 255), (150, 116, 250), (255, 120, 210)]
    for i in range(7):
        t = i / 6
        x = 11 + 42 * t
        y = 14 - 11 * math.sin(math.pi * t)
        bl = Pix()
        bl.disc(x, y, 1.6, cols[i])
        bl.set(x - 1, y - 1, WHITE)
        p.paste(bl, outline=dark(cols[i], 0.55))
    return p


def f04():
    """THE PILGRIM: a bowed pilgrim with a heavy pack climbs toward a cross-shaped window (the subject's cross)."""
    k = Key("c#")
    p = Pix()
    sky(p, k, lift=0.0)
    # the cathedral's dark west front on the right, a cross window lit gold
    stone = k.c(-0.07, -0.15)
    p.poly([(36, 40), (36, 10), (48, 0), (60, 10), (60, 40)], stone)
    p.poly([(50, 0), (60, 10), (60, 40), (52, 40)], dark(stone, 0.2))
    p.rect(46, 9, 4, 14, GOLD)
    p.rect(42, 13, 12, 4, GOLD)
    p.rect(47, 10, 2, 12, FIRE_L)
    p.rect(43, 14, 10, 2, FIRE_L)
    p.glow(48, 15, 11, mix(k.c(0.1), GOLD, 0.35), inner=0.0)
    p.rect(46, 9, 4, 14, GOLD)
    p.rect(42, 13, 12, 4, GOLD)
    p.rect(47, 10, 2, 12, FIRE_L)
    p.rect(43, 14, 10, 2, FIRE_L)
    # the slope up toward it
    hill = k.c(-0.09, -0.1, 15)
    p.poly([(0, 40), (0, 33), (40, 26), (64, 24), (64, 40)], hill)
    p.line(0, 33, 40, 26, light(hill, 0.2))
    stars(p, [(5, 4), (14, 9), (24, 3), (30, 12), (8, 17)])
    pg = Pix()
    cloak, cloak_d, cloak_l = (120, 98, 74), (82, 66, 50), (150, 126, 96)
    # bowed forward under the load, climbing to the right
    pg.poly([(13, 16), (21, 14), (26, 20), (25, 32), (12, 32)], cloak)
    pg.poly([(21, 15), (26, 20), (25, 32), (20, 32)], cloak_d)
    pg.line(13, 17, 12, 31, cloak_l)
    # the pack: a sack with a bedroll strapped on top
    pg.ell(13, 20, 5, 6, (168, 120, 70))
    pg.ell(14.5, 21, 2.5, 4.5, (132, 92, 52))
    pg.ell(12, 13, 5, 2, (196, 70, 60))
    pg.hline(8, 16, 13, (150, 50, 46))
    pg.line(16, 16, 20, 24, BROWN_D)  # strap
    face(pg, 25, 15, SKIN, r=2.4, look=1)
    # the pilgrim's broad hat with a shell
    pg.hline(20, 30, 12, (90, 70, 50))
    pg.rect(22, 9, 6, 3, (90, 70, 50))
    pg.set(24, 10, CREAM)
    pg.set(25, 10, CREAM)
    # the staff, a gourd tied to it
    pg.vline(30, 10, 34, BROWN)
    pg.set(30, 9, light(BROWN, 0.3))
    pg.disc(31, 15, 1, GOLD_D)
    pg.thick(25, 21, 29, 19, cloak, 2)
    pg.set(30, 19, SKIN)
    # legs mid-stride up the slope
    pg.thick(15, 32, 13, 35, cloak_d, 2)
    pg.thick(22, 32, 25, 31, cloak_d, 2)
    pg.hline(12, 15, 35, BROWN_D)
    pg.hline(25, 27, 31, BROWN_D)
    p.paste(pg)
    return p


def f05():
    """THE HERALD: a herald blows a long trumpet with a banner, the flourish unrolling (the overture's rush)."""
    k = Key("D")
    p = Pix()
    sky(p, k, lift=0.14, warm=0.3)
    # castle battlements behind
    wall = k.c(-0.04, -0.2, 15)
    p.rect(0, 27, W, 13, wall)
    for x in range(0, W, 8):
        p.rect(x, 24, 5, 3, wall)
    p.hline(0, W - 1, 27, light(wall, 0.2))
    for x in range(2, W, 8):
        p.vline(x, 30, 33, dark(wall, 0.3))
    h = Pix()
    tab, tab_d = (60, 90, 190), (40, 60, 140)
    # tabard over a red tunic, quartered
    h.rect(10, 18, 9, 13, tab)
    h.rect(14, 18, 5, 13, tab_d)
    h.rect(12, 21, 5, 5, GOLD)
    h.set(14, 23, RED)
    h.rect(10, 31, 3, 6, RED_D)
    h.rect(16, 31, 3, 6, RED_D)
    h.hline(9, 12, 37, INK)
    h.hline(16, 19, 37, INK)
    face(h, 15, 14, SKIN, r=2.6, look=1)
    h.set(17, 15, RED)  # cheeks puffed
    # the cap with a feather
    h.rect(12, 10, 6, 2, RED)
    h.line(13, 10, 9, 5, WHITE)
    h.line(14, 10, 10, 5, CREAM)
    # the trumpet: long, gold, a bell flaring right
    h.hline(18, 44, 14, GOLD)
    h.hline(18, 44, 15, GOLD_D)
    h.poly([(44, 14), (50, 10), (50, 19), (44, 15)], GOLD)
    h.line(50, 10, 50, 19, FIRE_L)
    h.thick(18, 19, 22, 15, SKIN, 2)
    # the banner hanging from it
    h.poly([(26, 16), (40, 16), (40, 25), (33, 22), (26, 25)], (210, 50, 56))
    h.rect(31, 18, 3, 3, GOLD)
    p.paste(h)
    # the flourish: a run of notes unrolling from the bell
    for i, (x, y) in enumerate(((53, 8), (55, 11), (57, 14), (59, 13), (61, 16))):
        p.set(x, y, WHITE)
        p.set(x, y - 1, CREAM if i % 2 else WHITE)
    p.line(52, 18, 62, 22, light(k.c(0.2), 0.6))
    return p


def f06():
    """THE DUELLIST: a fencer lunges at his own reflection in a tall mirror (the subject comes upside down)."""
    k = Key("d")
    p = Pix()
    sky(p, k, lift=0.02)
    floor = k.c(-0.05, -0.15, 10)
    p.rect(0, 33, W, 7, floor)
    for x in range(0, W, 6):
        p.line(x, 33, x - 4, 39, dark(floor, 0.25))
    # the mirror: gilt frame, a paler glass
    p.rect(38, 2, 22, 31, GOLD_D)
    p.rect(39, 3, 20, 29, GOLD)
    p.rect(40, 4, 18, 27, k.c(0.12, -0.1))
    p.line(42, 6, 47, 6, light(k.c(0.12), 0.4))
    p.line(41, 8, 41, 14, light(k.c(0.12), 0.4))

    def fencer(lay, x0, flip, white, shade):
        s = -1 if flip else 1
        X = lambda dx: x0 + s * dx  # noqa: E731
        lay.poly([(X(0), 18), (X(5), 17), (X(6), 26), (X(1), 27)], white)
        lay.line(X(4), 18, X(5), 26, shade)
        face(lay, X(4), 14, SKIN, r=2.2, look=s)
        lay.rect(min(X(2), X(6)), 12, 5, 4, (60, 60, 70))  # the mask's mesh
        lay.set(X(5), 13, GREY)
        lay.set(X(3), 14, GREY)
        # the lunge: front leg bent forward, back leg straight back
        lay.thick(X(5), 26, X(10), 30, white, 2)
        lay.thick(X(10), 30, X(10), 33, white, 2)
        lay.thick(X(1), 26, X(-5), 32, shade, 2)
        lay.hline(min(X(9), X(12)), max(X(9), X(12)), 33, INK)
        # the sword arm forward, the blade
        lay.thick(X(5), 19, X(11), 18, white, 2)
        lay.line(X(12), 18, X(22), 17, STEEL)
        lay.set(X(11), 17, GOLD)
        lay.set(X(11), 19, GOLD)
        # the back arm raised behind
        lay.line(X(1), 19, X(-3), 14, white)
        lay.set(X(-3), 13, SKIN)

    a = Pix()
    fencer(a, 12, False, WHITE, (186, 190, 204))
    p.paste(a)
    b = Pix()
    fencer(b, 55, True, (200, 206, 224), (150, 156, 180))
    # only what falls inside the glass shows
    for y in range(H):
        for x in range(W):
            if not (40 <= x <= 57 and 4 <= y <= 30):
                b.px[x, y] = (0, 0, 0, 0)
    p.paste(b, outline=dark(k.c(0.12), 0.45))
    # the two points meet at the glass
    twinkle(p, 39, 17, CREAM, 2)
    return p


def f07():
    """THE STONE-SKIPPER: a boy on a river bank skims a stone; its skips trail across the water."""
    k = Key("Eb")
    p = Pix()
    sky(p, k, 0, 22, lift=0.16, warm=0.2)
    # far trees
    for x in range(0, W, 5):
        p.ell(x + 2, 20, 3, 3 + (x * 7) % 3, k.c(-0.04, -0.1, -10))
    water, water_l = k.c(0.02, 0.05, -20), k.c(0.2, 0.05, -20)
    p.rect(0, 22, W, 18, water)
    for y in range(24, H, 3):
        for x in range((y * 7) % 11, W, 13):
            p.hline(x, x + 3, y, water_l)
    # the bank in front, left
    bank = (92, 132, 62)
    p.poly([(0, 40), (0, 26), (8, 25), (20, 28), (26, 40)], bank)
    p.line(0, 26, 8, 25, light(bank, 0.3))
    p.line(8, 25, 20, 28, light(bank, 0.3))
    for x in (2, 5, 17, 21):
        p.vline(x, 24, 27, (60, 104, 50))
    # the skips: four splashes on the water, smaller as they go, the stone's hops dotted between
    skips = [(30, 31, 3), (40, 29, 2), (48, 27, 1.5), (54, 26, 1)]
    prev = (23, 22)
    for x, y, r in skips:
        for t in range(1, 6):
            xx = prev[0] + (x - prev[0]) * t / 6
            yy = prev[1] + (y - prev[1]) * t / 6 - (2 + r) * math.sin(math.pi * t / 6)
            if t % 2:
                p.set(xx, yy, WHITE)
        p.hline(x - r * 1.6, x + r * 1.6, y, WHITE)
        p.set(x - r * 1.6 - 1, y - 1, light(water_l, 0.5))
        p.set(x + r * 1.6 + 1, y - 1, light(water_l, 0.5))
        p.set(x, y - 1 - int(r), WHITE)
        prev = (x, y)
    p.disc(58, 24, 1, GREY)
    b = Pix()
    shirt, shirt_d, pants = (240, 170, 60), (200, 126, 40), (70, 90, 150)
    # the throw: body twisted, arm out low, sidearm
    b.rect(10, 15, 6, 7, shirt)
    b.rect(13, 15, 3, 7, shirt_d)
    b.rect(10, 22, 6, 3, pants)
    b.thick(11, 25, 8, 29, pants, 2)
    b.thick(14, 25, 17, 29, pants, 2)
    b.hline(7, 9, 30, BROWN_D)
    b.hline(17, 19, 30, BROWN_D)
    face(b, 13, 11, SKIN, r=2.5, look=1, mouth=SKIN_D)
    b.hline(11, 15, 8, (120, 70, 40))
    b.set(10, 9, (120, 70, 40))
    b.set(11, 9, (120, 70, 40))
    b.thick(16, 17, 22, 21, SKIN, 2)  # throwing arm, low and forward
    b.thick(10, 16, 7, 19, shirt, 2)
    p.paste(b)
    return p


def f08():
    """THE LANTERN-BEARER: a small hooded figure with a lantern; on the wall its shadow twice as tall (augmentation)."""
    k = Key("d#")
    p = Pix()
    wall = k.c(-0.02, -0.12)
    p.rect(0, 0, W, 34, wall)
    for y in range(1, 34, 4):
        for x in range((y // 4 % 2) * 5, W, 10):
            p.hline(x, x + 8, y, dark(wall, 0.25))
            p.set(x + 9, y + 1, dark(wall, 0.25))
            p.set(x + 9, y + 2, dark(wall, 0.25))
    lx, ly = 18, 25
    p.glow(lx, ly, 15, mix(wall, GOLD, 0.35), inner=0.35)
    p.glow(lx, ly, 8, mix(wall, GOLD, 0.6), inner=0.5)
    # the shadow: the same figure at twice the size, thrown up the wall
    sh = dark(wall, 0.55)
    sx = 42
    p.disc(sx, 9, 4.5, sh)
    p.poly([(sx - 3, 6), (sx + 4, 5), (sx + 5, 12), (sx - 4, 12)], sh)
    robe(p, sx, 12, 33, 4, 10, sh)
    p.thick(sx - 6, 18, sx - 13, 22, sh, 2)
    p.rect(sx - 16, 21, 4, 6, sh)
    # the floor
    floor = dark(wall, 0.35)
    p.rect(0, 34, W, 6, floor)
    p.hline(0, W - 1, 34, light(floor, 0.15))
    p.glow(lx, 35, 9, mix(floor, GOLD, 0.25), inner=0.2)
    f = Pix()
    cloak, cloak_d = (78, 66, 128), (52, 44, 90)
    cx = 22
    robe(f, cx, 24, 36, 2.5, 5, cloak, cloak_d)
    f.disc(cx, 22, 3, cloak)
    f.poly([(cx - 2, 18), (cx + 1, 17), (cx + 3, 21), (cx - 3, 21)], cloak)
    f.disc(cx - 1, 22.5, 1.6, SKIN)
    f.set(cx - 2, 22, INK)
    f.thick(cx - 3, 27, lx + 1, 25, cloak, 2)
    p.paste(f)
    # the lantern
    l = Pix()
    l.rect(lx - 2, ly - 1, 4, 5, GOLD)
    l.rect(lx - 1, ly, 2, 3, WHITE)
    l.hline(lx - 2, lx + 1, ly - 2, INK)
    l.set(lx - 1, ly - 3, INK)
    p.paste(l)
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
    s.rect(cx - 3, 14, 6, 6, (240, 236, 226))
    s.rect(cx - 2, 16, 4, 4, (180, 50, 60))  # bodice
    face(s, cx, 10, SKIN, r=2.6, look=-1, mouth=RED_D, cheek=True)
    s.hline(cx - 3, cx + 3, 7, (230, 190, 90))  # hair
    s.set(cx - 3, 8, (230, 190, 90))
    s.set(cx + 3, 8, (230, 190, 90))
    s.vline(cx + 3, 9, 12, (230, 190, 90))
    # a straw hat tilted
    s.hline(cx - 5, cx + 4, 6, (240, 210, 120))
    s.rect(cx - 2, 4, 4, 2, (240, 210, 120))
    # arms out, one up holding the crook
    s.thick(cx - 3, 15, cx - 8, 12, SKIN, 1)
    s.thick(cx + 3, 15, cx + 8, 17, SKIN, 1)
    s.vline(cx - 9, 4, 30, BROWN)
    s.ring(cx - 7, 4, 2, BROWN, 180, 360)
    s.set(cx - 9, 4, BROWN)
    s.vline(cx - 2, 32, 34, SKIN_D)
    s.vline(cx + 2, 32, 33, SKIN_D)
    p.paste(s)
    # ribbons flying from the hat
    for i in range(7):
        p.set(cx + 5 + i, 5 + math.sin(i * 1.1) * 1.5, (230, 60, 90))
        p.set(cx + 5 + i, 7 + math.sin(i * 1.1 + 1) * 1.5, (250, 220, 90))
    # the lamb
    l = Pix()
    lx, ly = 50, 32
    l.ell(lx, ly, 5, 3, WHITE)
    for dx in (-4, -2, 0, 2, 4):
        l.disc(lx + dx, ly - 2, 1.2, WHITE)
    l.disc(lx - 5, ly - 2, 2, (240, 234, 220))
    l.set(lx - 6, ly - 2, INK)
    l.set(lx - 4, ly - 4, (200, 190, 180))
    for dx in (-3, -1, 2, 4):
        l.vline(lx + dx, ly + 3, ly + 5, (70, 60, 60))
    p.paste(l)
    return p


def f12():
    """THE MOURNER: a hooded mourner with a candle at the top of a stair of ten steps down into the dark (ten half-steps)."""
    k = Key("f")
    p = Pix()
    sky(p, k, lift=-0.04)
    p.rect(0, 0, W, H, k.c(-0.07, -0.1))
    for y in range(0, H, 5):
        for x in range((y // 5 % 2) * 4, W, 8):
            p.hline(x, x + 6, y, k.c(-0.1, -0.1))
    stone, stone_l, stone_d = k.c(0.08, -0.25), k.c(0.2, -0.25), k.c(-0.02, -0.25)
    x, y = 2, 20
    for i in range(10):
        p.rect(x, y, 6, H - y, stone)
        p.hline(x, x + 5, y, stone_l)
        p.vline(x + 5, y + 1, H - 1, stone_d)
        x += 6
        y += 2
    # the dark at the foot
    for yy in range(26, H):
        for xx in range(40, W):
            if (xx + yy) % 2 == 0 and yy > 50 - (xx - 40) * 0.6:
                p.set(xx, yy, k.c(-0.12, -0.1))
    # candlelight
    p.glow(16, 9, 12, mix(k.c(-0.07), GOLD, 0.3), inner=0.3)
    m = Pix()
    rb, rb_d, rb_l = (70, 58, 88), (44, 36, 58), (130, 110, 120)
    cx = 9
    robe(m, cx, 9, 19, 3.5, 6.5, rb, rb_d)
    m.disc(cx + 1, 6, 3.6, rb)
    m.poly([(cx - 2, 1), (cx + 3, 2), (cx + 5, 7), (cx - 3, 7)], rb)  # the hood, bowed
    m.disc(cx + 2.5, 6.5, 1.7, SKIN_D)
    m.set(cx + 3, 6, INK)
    m.vline(cx + 5, 3, 8, rb_l)  # candle-lit rim
    m.vline(cx + 6, 10, 18, rb_l)
    m.thick(cx + 3, 11, cx + 7, 12, rb, 2)
    m.set(cx + 8, 12, SKIN_D)
    p.paste(m)
    p.rect(17, 9, 1, 3, CREAM)
    p.set(17, 8, GOLD)
    p.set(17, 7, WHITE)
    # the drop of light running down the stair
    for i in range(5):
        p.set(22 + i * 7, 22 + i * 2.6, light(k.c(0.2), 0.5))
    return p


def f13():
    """THE HERON: a heron on one leg in a gentle brook among reeds, a pale sun (Bodky's 'Little Brook')."""
    k = Key("F#")
    p = Pix()
    sky(p, k, 0, 26, lift=0.14)
    p.disc(51, 8, 4, (255, 244, 210))
    p.disc(51, 8, 3, (255, 250, 230))
    water, water_l = k.c(0.04, 0.08, -10), k.c(0.22, 0.08, -10)
    p.rect(0, 26, W, 14, water)
    for y in range(28, H, 3):
        for x in range((y * 7) % 9, W, 11):
            p.hline(x, x + 4, y, water_l)
    p.hline(0, W - 1, 26, water_l)
    for x in (4, 6, 9, 55, 58, 61):
        hgt = 15 + (x * 5) % 5
        p.vline(x, hgt, 29, (70, 120, 64))
        p.rect(x, hgt - 3, 1, 3, (130, 86, 50))
    h = Pix()
    body, body_d = (214, 218, 228), (152, 158, 176)
    cx = 30
    h.ell(cx, 18, 7, 3.6, body)
    h.ell(cx - 1, 19, 6, 2, body_d)
    h.poly([(cx - 6, 17), (cx - 12, 21), (cx - 6, 20)], body_d)
    # the S of the neck
    for x, y in ((cx + 5, 15), (cx + 6, 14), (cx + 6, 13), (cx + 5, 12), (cx + 5, 11), (cx + 5, 10), (cx + 6, 9), (cx + 7, 8)):
        h.set(x, y, body)
        h.set(x + 1, y, body)
    h.disc(cx + 8, 7, 1.8, body)
    h.line(cx + 7, 6, cx + 3, 5, INK)  # crest
    h.set(cx + 9, 7, INK)
    h.hline(cx + 10, cx + 15, 8, GOLD)
    h.hline(cx + 10, cx + 13, 7, GOLD_D)
    h.vline(cx, 22, 30, (210, 176, 96))
    h.line(cx, 23, cx - 3, 25, (210, 176, 96))
    h.set(cx - 3, 26, (210, 176, 96))
    p.paste(h)
    # the reflection
    p.vline(cx, 31, 35, water_l)
    p.ell(cx, 36, 6, 1, light(water, 0.2))
    p.ell(cx, 30, 3, 0.6, WHITE)
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


def f15():
    """THE ACROBAT: an acrobat in mid-somersault between two trapezes, the crowd below (the leaps of a seventh)."""
    k = Key("G")
    p = Pix()
    tent = k.c(0.06, 0.05)
    p.rect(0, 0, W, H, tent)
    # the big top's stripes, converging
    for i in range(-4, 10):
        p.poly([(32, -6), (32 + i * 9, 40), (32 + i * 9 + 4, 40)], light(tent, 0.18) if i % 2 else dark(tent, 0.08))
    p.glow(32, 4, 16, light(tent, 0.35), inner=0.2)
    # the crowd: rows of dots below
    p.rect(0, 33, W, 7, dark(tent, 0.55))
    for y in (35, 38):
        for x in range((y % 3), W, 3):
            p.disc(x, y, 1, [(230, 190, 150), (200, 140, 110), (240, 220, 180)][(x + y) % 3])
    # two trapezes
    for x0 in (4, 50):
        p.line(x0, 0, x0 + 1, 13, (220, 220, 220))
        p.line(x0 + 9, 0, x0 + 8, 13, (220, 220, 220))
        p.hline(x0 + 1, x0 + 8, 13, GOLD)
    a = Pix()
    suit, suit_d = (230, 50, 90), (170, 30, 66)
    # flying from the left trapeze to the right one, stretched long, reaching
    a.poly([(22, 22), (26, 19), (36, 14), (38, 17), (28, 23), (24, 25)], suit)
    a.poly([(26, 22), (37, 16), (38, 17), (28, 23)], suit_d)
    a.line(25, 20, 35, 15, GOLD)  # the sash
    a.thick(22, 22, 15, 24, suit, 2)  # legs trailing, toes pointed
    a.thick(23, 24, 16, 27, suit_d, 2)
    a.set(14, 24, WHITE)
    a.set(15, 28, WHITE)
    face(a, 40, 13, SKIN, r=2.4, look=1, mouth=RED_D)
    a.hline(38, 41, 10, (60, 40, 30))
    a.set(37, 11, (60, 40, 30))
    a.set(38, 11, (60, 40, 30))
    a.thick(38, 15, 49, 12, SKIN, 1)  # arms reaching for the bar
    a.thick(37, 16, 49, 14, SKIN_D, 1)
    p.paste(a)
    # the arc of the flight
    for t in range(0, 13, 2):
        x = 8 + t * 0.9
        y = 14 + t * 0.6
        p.set(x, y, WHITE)
    for x, y in ((24, 6), (40, 7), (36, 26)):
        twinkle(p, x, y, GOLD)
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


def f17():
    """THE ABBOT: a broad, kind abbot blesses a harvest sheaf in late-summer light (the subject's broad leaps, a choir's opening)."""
    k = Key("Ab")
    p = Pix()
    sky(p, k, 0, 26, lift=0.16, warm=0.7)
    p.glow(48, 22, 12, (255, 220, 150), inner=0.3)
    p.disc(48, 22, 4, (255, 236, 180))
    field = (214, 170, 80)
    p.rect(0, 26, W, 14, field)
    for y in range(27, H, 2):
        for x in range((y * 3) % 4, W, 4):
            p.vline(x, y, y + 1, (186, 140, 60))
    p.hline(0, W - 1, 26, (240, 206, 120))
    a = Pix()
    habit, habit_d = (236, 232, 222), (186, 180, 172)
    cx = 20
    robe(a, cx, 16, 39, 6, 10, habit, habit_d)
    a.rect(cx - 7, 16, 14, 3, (200, 50, 50))  # a red cape over the shoulders
    a.poly([(cx - 7, 16), (cx + 7, 16), (cx + 9, 26), (cx - 9, 26)], (190, 46, 46))
    a.poly([(cx + 3, 16), (cx + 7, 16), (cx + 9, 26), (cx + 4, 26)], (140, 34, 38))
    a.rect(cx - 1, 19, 2, 6, GOLD)  # the pectoral cross
    a.rect(cx - 2, 20, 4, 1, GOLD)
    face(a, cx, 11, SKIN, r=4, mouth=SKIN_B, cheek=True)
    a.set(cx - 2, 11, INK)
    a.set(cx + 2, 11, INK)
    a.hline(cx - 3, cx + 3, 7, (220, 220, 220))  # white fringe round the tonsure
    a.set(cx - 4, 9, (220, 220, 220))
    a.set(cx + 4, 9, (220, 220, 220))
    # one hand raised in blessing, two fingers
    a.thick(cx + 7, 20, cx + 12, 13, habit, 2)
    a.rect(cx + 12, 11, 2, 2, SKIN)
    a.vline(cx + 12, 9, 10, SKIN)
    a.vline(cx + 13, 9, 10, SKIN)
    p.paste(a)
    # the sheaf, tied with a band
    s = Pix()
    sx = 40
    for i in range(-4, 5):
        s.line(sx, 31, sx + i * 1.4, 17, (236, 196, 90) if i % 2 else (210, 160, 60))
        s.set(sx + i * 1.4, 16, (250, 220, 120))
    for i in range(-3, 4):
        s.line(sx, 31, sx + i, 38, (200, 150, 60))
    s.hline(sx - 2, sx + 2, 30, BROWN)
    p.paste(s)
    for x, y in ((30, 5), (36, 9), (8, 4)):
        twinkle(p, x, y, (255, 230, 170))
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
    # rooftops, the walker's ridge in front
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
    face(s, cx, 10, SKIN, r=2.5, mouth=None)
    s.hline(cx - 2, cx, 10, SKIN_D)  # eyes shut
    s.set(cx + 1, 10, SKIN_D)
    s.set(cx - 1, 10, SKIN_D)
    s.poly([(cx - 3, 8), (cx + 3, 8), (cx + 4, 6), (cx + 9, 9), (cx + 3, 5), (cx - 3, 6)], (200, 60, 70))  # nightcap
    s.disc(cx + 9, 9, 1, WHITE)
    # arms straight out, balanced
    s.hline(cx - 11, cx - 2, 16, gown)
    s.hline(cx + 2, cx + 11, 16, gown)
    s.hline(cx - 11, cx - 2, 17, gown_d)
    s.hline(cx + 2, cx + 11, 17, gown_d)
    s.set(cx - 12, 16, SKIN)
    s.set(cx + 12, 16, SKIN)
    s.vline(cx - 1, 30, 31, SKIN)
    s.vline(cx + 1, 30, 31, SKIN)
    p.paste(s)
    p.set(cx + 6, 6, CREAM)
    p.set(cx + 8, 4, CREAM)  # z z
    p.hline(cx + 9, cx + 10, 2, CREAM)
    return p


def f19():
    """THE CONJURER: a magician with three cups and a ball; which cup? (9/8 = 3 x 3, the illusion)."""
    k = Key("A")
    p = Pix()
    curtain = k.c(-0.04, 0.0, 0)
    p.rect(0, 0, W, H, curtain)
    for x in range(0, W, 4):
        p.vline(x, 0, 27, dark(curtain, 0.2))
        p.vline(x + 1, 0, 27, light(curtain, 0.1))
    p.glow(32, 14, 18, light(curtain, 0.2), inner=0.2)
    # the table and its cloth
    p.rect(4, 28, 56, 3, (140, 30, 50))
    p.rect(6, 31, 52, 9, (110, 22, 40))
    p.hline(4, 59, 28, (200, 60, 80))
    for x in range(8, 58, 6):
        p.vline(x, 31, 39, (90, 18, 34))
    m = Pix()
    coat, coat_d = (40, 34, 60), (26, 22, 40)
    cx = 32
    m.poly([(cx - 8, 28), (cx - 6, 15), (cx + 6, 15), (cx + 8, 28)], coat)
    m.poly([(cx + 2, 15), (cx + 6, 15), (cx + 8, 28), (cx + 3, 28)], coat_d)
    m.poly([(cx - 2, 15), (cx + 2, 15), (cx, 22)], WHITE)  # shirt front
    m.set(cx, 16, RED)  # bow tie
    m.set(cx - 1, 16, RED)
    m.set(cx + 1, 16, RED)
    face(m, cx, 11, SKIN, r=2.8, mouth=None)
    m.hline(cx - 2, cx + 2, 13, INK)  # moustache, curled
    m.set(cx - 3, 12, INK)
    m.set(cx + 3, 12, INK)
    m.set(cx - 1, 10, INK)
    m.set(cx + 1, 10, INK)
    # the top hat
    m.rect(cx - 3, 3, 7, 6, INK)
    m.hline(cx - 5, cx + 5, 8, INK)
    m.hline(cx - 3, cx + 3, 7, (180, 40, 60))
    # arms out over the cups, a wand
    m.thick(cx - 6, 18, cx - 13, 24, coat, 2)
    m.thick(cx + 6, 18, cx + 13, 22, coat_d, 2)
    m.set(cx - 14, 25, WHITE)
    m.line(cx + 14, 22, cx + 19, 16, INK)
    m.set(cx + 19, 15, WHITE)
    p.paste(m)
    c = Pix()
    for x in (14, 32, 50):
        c.poly([(x - 4, 28), (x - 3, 21), (x + 3, 21), (x + 4, 28)], GOLD)
        c.poly([(x + 1, 21), (x + 3, 21), (x + 4, 28), (x + 2, 28)], GOLD_D)
        c.hline(x - 3, x + 3, 21, FIRE_L)
        c.hline(x - 4, x + 4, 27, GOLD_D)
    p.paste(c)
    # the ball, half seen under the middle cup's lip, and a sparkle of the trick
    p.disc(41, 27, 1.3, (230, 50, 60))
    twinkle(p, 52, 16, WHITE, 2)
    p.set(46, 13, CREAM)
    p.set(56, 19, CREAM)
    return p


def f20():
    """THE BLACKSMITH: a smith, hammer raised over the anvil, sparks flying, the forge glowing (the stretti hammered out)."""
    k = Key("a")
    p = Pix()
    room = k.c(-0.06, -0.15)
    p.rect(0, 0, W, H, room)
    for y in range(0, 36, 5):
        for x in range((y // 5 % 2) * 5, W, 10):
            p.hline(x, x + 8, y, dark(room, 0.2))
    # the forge on the right, glowing
    p.glow(55, 24, 14, mix(room, FIRE, 0.4), inner=0.2)
    p.rect(47, 22, 16, 14, (70, 50, 50))
    p.hline(47, 62, 22, (110, 80, 70))
    p.rect(50, 25, 10, 5, FIRE)
    p.rect(52, 26, 6, 3, FIRE_L)
    for x in range(50, 60, 2):
        p.set(x, 24, FIRE_L)
    p.rect(52, 2, 8, 20, (60, 44, 44))  # the hood above it
    p.rect(0, 36, W, 4, dark(room, 0.4))
    p.hline(0, W - 1, 36, light(dark(room, 0.4), 0.2))
    an = Pix()
    anv, anv_l = (62, 64, 78), (130, 134, 152)
    an.rect(25, 26, 18, 3, anv)
    an.hline(25, 42, 26, anv_l)
    an.poly([(25, 26), (19, 26), (25, 28)], anv)
    an.rect(30, 29, 8, 4, anv)
    an.rect(27, 33, 14, 3, anv)
    an.hline(30, 38, 25, FIRE)
    an.hline(32, 36, 25, FIRE_L)
    p.paste(an)
    s = Pix()
    shirt, apron, apron_d = (196, 140, 106), (104, 70, 44), (76, 50, 32)
    cx = 13
    s.rect(cx - 5, 17, 10, 11, shirt)
    s.rect(cx - 4, 20, 8, 12, apron)
    s.rect(cx, 20, 4, 12, apron_d)
    s.rect(cx - 4, 32, 3, 4, INK)
    s.rect(cx + 1, 32, 3, 4, INK)
    face(s, cx, 12, SKIN, r=3.2)
    s.set(cx + 1, 11, INK)
    s.set(cx + 2, 11, INK)
    s.set(cx - 1, 11, INK)
    s.hline(cx - 3, cx + 3, 14, (110, 60, 34))  # beard
    s.hline(cx - 2, cx + 2, 15, (110, 60, 34))
    s.hline(cx - 1, cx + 1, 16, (110, 60, 34))
    s.hline(cx - 3, cx + 2, 9, (110, 60, 34))  # hair
    # the raised arm and hammer
    s.thick(cx + 4, 18, cx + 9, 9, SKIN, 2)
    s.line(cx + 9, 9, cx + 11, 4, BROWN)
    s.rect(cx + 8, 1, 7, 3, (80, 82, 96))
    s.hline(cx + 8, cx + 14, 1, (160, 164, 180))
    s.thick(cx - 4, 19, cx + 0, 25, SKIN_D, 2)  # the other arm holds the tongs
    s.line(cx + 1, 25, 30, 25, GREY_D)
    p.paste(s)
    for x, y in ((28, 20), (33, 17), (38, 21), (30, 14), (41, 16), (36, 12), (44, 19), (25, 18)):
        p.set(x, y, FIRE_L if (x + y) % 2 else WHITE)
    return p


def f21():
    """THE PUPPETEER: a puppeteer works three marionettes dancing in step (the subject and its two countersubjects)."""
    k = Key("Bb")
    p = Pix()
    sky(p, k, lift=0.08)
    # the little theatre's stage and curtain
    p.rect(0, 33, W, 7, (150, 100, 60))
    p.hline(0, W - 1, 33, (200, 150, 96))
    p.rect(0, 0, W, 4, (170, 40, 50))
    for x in range(0, W, 5):
        p.disc(x + 2, 4, 2, (170, 40, 50))
    p.vline(1, 0, 32, (140, 30, 40))
    p.vline(62, 0, 32, (140, 30, 40))
    # the puppeteer's hands and cross bar, above
    pu = Pix()
    pu.rect(10, 5, 44, 2, BROWN)
    pu.hline(10, 53, 5, light(BROWN, 0.3))
    for x in (8, 54):
        pu.rect(x - 1, 4, 3, 4, SKIN)
    face(pu, 32, 8, SKIN, r=2.6, mouth=RED_D, cheek=True)
    pu.rect(29, 4, 7, 2, (60, 50, 90))  # his cap peeping over the bar
    p.paste(pu)
    cols = [((230, 70, 70), (170, 40, 50)), ((70, 150, 230), (40, 100, 170)), ((240, 200, 70), (190, 140, 40))]
    for i, x in enumerate((16, 32, 48)):
        # strings
        for dx, ty in ((-3, 18), (3, 18), (0, 13)):
            p.line(x + dx * 0.5, 7, x + dx, ty, (220, 220, 220))
        m = Pix()
        c, cd = cols[i]
        face(m, x, 15, (240, 200, 160), r=2.2)
        m.rect(x - 2, 18, 5, 7, c)
        m.rect(x + 1, 18, 2, 7, cd)
        # all three in the same step: one leg kicked, arms up
        m.line(x - 2, 19, x - 4, 16, c)
        m.line(x + 2, 19, x + 4, 16, cd)
        m.line(x - 1, 25, x - 2, 31, cd)
        m.line(x + 1, 25, x + 5, 28, c)
        m.set(x - 3, 31, INK)
        m.set(x + 6, 28, INK)
        m.hline(x - 2, x + 2, 13, cd)  # little hats
        m.set(x, 12, cd)
        p.paste(m)
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


def f23():
    """THE LAMPLIGHTER: at dusk a lamplighter lights the fourth of four lamps down a quiet street (the prelude's four notes)."""
    k = Key("B")
    p = Pix()
    sky(p, k, lift=0.08, warm=0.9)
    # the houses
    for x0, w, top in ((0, 14, 12), (14, 12, 16), (40, 12, 14), (52, 12, 10)):
        c = k.c(-0.1, -0.15, 10)
        p.rect(x0, top, w, 40 - top, c)
        p.poly([(x0 - 1, top), (x0 + w / 2, top - 5), (x0 + w, top)], dark(c, 0.2))
        for wx in range(x0 + 2, x0 + w - 2, 5):
            p.rect(wx, top + 4, 2, 3, GOLD if (wx + top) % 3 else dark(c, 0.3))
    street = k.c(-0.08, -0.2, 20)
    p.rect(0, 33, W, 7, street)
    p.hline(0, W - 1, 33, light(street, 0.2))
    # four lamps receding: three lit, the fourth being lit
    lamps = [(58, 15, 1.0), (47, 19, 0.8), (40, 22, 0.66), (14, 12, 1.2)]
    for i, (x, top, s) in enumerate(lamps[:3]):
        p.vline(x, top, 33, (40, 40, 50))
        p.glow(x, top - 1, 4 * s, mix(k.c(0.1), GOLD, 0.5), inner=0.3)
        p.rect(x - 1, top - 2, 3, 2, FIRE_L)
    x, top = 14, 12
    p.vline(x, top, 33, (40, 40, 50))
    p.vline(x + 1, top, 33, (60, 60, 72))
    p.rect(x - 2, top - 4, 5, 4, (60, 60, 72))
    p.rect(x - 1, top - 3, 3, 2, GOLD)
    p.hline(x - 3, x + 3, top, (40, 40, 50))
    l = Pix()
    coat, coat_d = (60, 70, 110), (40, 46, 80)
    cx = 26
    robe(l, cx, 18, 33, 3, 5, coat, coat_d)
    face(l, cx, 15, SKIN, r=2.4, look=-1)
    l.rect(cx - 3, 11, 6, 2, INK)  # a cap
    l.hline(cx - 4, cx + 1, 13, INK)
    l.thick(cx - 3, 20, cx - 6, 16, coat, 2)
    l.line(cx - 6, 16, x + 2, top - 3, BROWN)  # the long pole to the lamp
    l.vline(cx - 1, 34, 35, INK)
    l.vline(cx + 2, 34, 35, INK)
    p.paste(l)
    p.set(x + 2, top - 3, WHITE)
    twinkle(p, x + 1, top - 5, FIRE_L)
    return p


def f24():
    """THE CLOCKMAKER: an old clockmaker with a loupe adjusts a great clock of twelve hours (all twelve notes); the pendulum sways (the sighs)."""
    k = Key("b")
    p = Pix()
    room = k.c(-0.04, -0.1)
    p.rect(0, 0, W, H, room)
    for x in range(0, W, 6):
        p.vline(x, 0, 36, dark(room, 0.15))
    p.rect(0, 36, W, 4, dark(room, 0.45))
    cl = Pix()
    cx, cy, r = 42, 15, 12
    case, case_l = (124, 78, 44), (160, 104, 60)
    cl.rect(cx - 15, 0, 31, 37, case)
    cl.rect(cx - 15, 0, 2, 37, case_l)
    cl.disc(cx, cy, r + 1, GOLD_D)
    cl.disc(cx, cy, r, (244, 234, 206))
    for i in range(12):
        a = i * math.pi / 6
        x, y = cx + (r - 2) * math.sin(a), cy - (r - 2) * math.cos(a)
        cl.set(x, y, RED_D if i % 3 == 0 else INK)
        if i % 3 == 0:
            cl.set(cx + (r - 3) * math.sin(a), cy - (r - 3) * math.cos(a), RED_D)
    cl.line(cx, cy, cx - 3, cy - 7, INK)
    cl.line(cx, cy, cx + 6, cy + 2, INK)
    cl.set(cx, cy, GOLD)
    # the pendulum's window, the bob swung left
    cl.rect(cx - 5, cy + 15, 11, 7, (56, 34, 22))
    cl.line(cx, cy + 15, cx - 3, cy + 19, GOLD_D)
    cl.disc(cx - 3, cy + 20, 1.4, GOLD)
    p.paste(cl)
    # the swing's ghosts
    p.set(cx + 2, cy + 20, mix((56, 34, 22), GOLD, 0.4))
    p.set(cx + 3, cy + 20, mix((56, 34, 22), GOLD, 0.25))
    m = Pix()
    coat, coat_d = (74, 62, 96), (50, 42, 68)
    hx = 13
    m.poly([(hx - 5, 37), (hx - 4, 21), (hx + 4, 20), (hx + 6, 37)], coat)
    m.poly([(hx + 1, 20), (hx + 4, 20), (hx + 6, 37), (hx + 2, 37)], coat_d)
    m.rect(hx - 4, 37, 4, 2, INK)
    m.rect(hx + 1, 37, 4, 2, INK)
    face(m, hx + 1, 15, SKIN, r=3.4)
    m.hline(hx - 2, hx + 4, 11, WHITE)  # white hair, a bald crown
    m.vline(hx - 2, 12, 16, WHITE)
    m.set(hx - 1, 12, WHITE)
    m.hline(hx, hx + 3, 18, WHITE)  # beard
    m.set(hx + 1, 19, WHITE)
    m.disc(hx + 4, 14, 1.4, (60, 60, 72))  # the loupe in his eye
    m.set(hx + 4, 14, (190, 226, 255))
    m.set(hx + 1, 14, INK)
    m.thick(hx + 4, 23, hx + 13, 19, coat, 2)
    m.set(hx + 14, 19, SKIN)
    m.hline(hx + 15, hx + 17, 18, STEEL)  # the screwdriver
    p.paste(m)
    return p


PICTURES = {f"wtc1f{n:02d}": globals()[f"f{n:02d}"] for n in range(1, 25)}

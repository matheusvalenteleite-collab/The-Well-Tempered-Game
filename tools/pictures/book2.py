"""Book II: 24 more characters (D383; the names and their reasons in fugue-names.ts).

The same language as Book I: one character big in the frame, one pose, one prop, on the key's ground,
the subject in the scene only where it falls naturally (II/2's one stone twice the size, II/3's threads,
II/13's trill, II/14's three flasks for three subjects, II/18's two dancers for two subjects).
"""
import math
from lib import *  # noqa: F401,F403


def g01():
    """THE MILLER: a jolly, floury miller carries a sack; the mill's sails turn behind (masculine humour, high spirits; the turn G-F-G)."""
    k = Key("C")
    p = Pix()
    sky(p, k, 0, 30, lift=0.2)
    for cx, cy, r in ((8, 6, 3), (12, 5, 4), (16, 7, 3)):
        p.disc(cx, cy, r, WHITE)
    hill = (110, 170, 80)
    p.poly([(0, 30), (24, 27), (64, 29), (64, 40), (0, 40)], hill)
    p.line(0, 30, 24, 27, light(hill, 0.3))
    p.line(24, 27, 64, 29, light(hill, 0.3))
    for x in range(2, W, 6):
        p.set(x, 34 + (x % 4), dark(hill, 0.2))
    # the windmill: a tower, a cap, four sails mid-turn
    tw = (230, 220, 200)
    p.poly([(42, 30), (44, 12), (52, 12), (54, 30)], tw)
    p.poly([(49, 12), (52, 12), (54, 30), (50, 30)], (190, 180, 164))
    p.poly([(42, 12), (48, 6), (54, 12)], RED_D)
    p.rect(47, 23, 3, 7, BROWN_D)
    sail = (246, 240, 226)
    for i in range(4):
        a = math.radians(20 + i * 90)
        x1, y1 = 48 + 15 * math.cos(a), 11 + 15 * math.sin(a)
        p.line(48, 11, x1, y1, BROWN)
        b = math.radians(20 + i * 90 + 12)
        x2, y2 = 48 + 14 * math.cos(b), 11 + 14 * math.sin(b)
        x3, y3 = 48 + 5 * math.cos(b), 11 + 5 * math.sin(b)
        x4, y4 = 48 + 5 * math.cos(a), 11 + 5 * math.sin(a)
        p.poly([(x4, y4), (x1, y1), (x2, y2), (x3, y3)], sail)
    p.disc(48, 11, 1, BROWN_D)
    m = Pix()
    smock, smock_d = (236, 232, 222), (190, 184, 170)
    cx = 20
    m.poly([(cx - 6, 17), (cx + 5, 17), (cx + 7, 32), (cx - 7, 32)], smock)
    m.poly([(cx + 1, 17), (cx + 5, 17), (cx + 7, 32), (cx + 2, 32)], smock_d)
    m.ell(cx, 25, 5, 4, smock)
    m.hline(cx - 6, cx + 6, 27, BROWN)  # belt
    m.rect(cx - 5, 32, 3, 5, (110, 90, 70))
    m.rect(cx + 2, 32, 3, 5, (110, 90, 70))
    m.hline(cx - 6, cx - 2, 37, INK)
    m.hline(cx + 2, cx + 6, 37, INK)
    face(m, cx, 12, SKIN, r=3.6, mouth=RED_D, cheek=True)
    m.hline(cx - 2, cx + 2, 15, WHITE)  # a white moustache
    m.set(cx - 3, 14, WHITE)
    m.set(cx + 3, 14, WHITE)
    m.poly([(cx - 4, 9), (cx + 4, 9), (cx + 3, 6), (cx - 2, 5)], (220, 214, 200))  # floury cap
    m.set(cx + 4, 6, (220, 214, 200))
    # the sack on his shoulder
    m.ell(cx + 7, 12, 5, 4, (220, 196, 140))
    m.ell(cx + 8, 13, 3, 2.5, (190, 160, 104))
    m.hline(cx + 2, cx + 4, 9, BROWN)
    m.thick(cx + 5, 18, cx + 6, 15, SKIN, 2)
    m.thick(cx - 5, 18, cx - 8, 24, smock, 2)
    m.set(cx - 9, 25, SKIN)
    p.paste(m)
    for x, y in ((29, 7), (31, 9), (12, 18), (27, 4)):
        p.set(x, y, WHITE)  # flour in the air
    return p


def g02():
    """THE MASON: a mason sets stones in a wall, one block twice the size (the subject augmented); severe, inner strength."""
    k = Key("c")
    p = Pix()
    sky(p, k, lift=0.04)
    stars(p, [(6, 3), (18, 6), (52, 4), (60, 10)])
    stone, stone_l, stone_d = k.c(0.18, -0.25, 10), k.c(0.3, -0.25, 10), k.c(0.04, -0.25, 10)
    # the wall rising on the right, courses of blocks, the big one in the middle course
    rows = [(34, [(26, 8), (34, 8), (42, 8), (50, 8), (58, 6)]), (29, [(30, 8), (38, 16), (54, 10)]), (24, [(26, 8), (34, 8), (54, 10)]), (19, [(34, 8), (42, 8), (50, 8)])]
    p.rect(0, 38, W, 2, dark(stone_d, 0.3))
    for y, blocks in rows:
        for x, w in blocks:
            hh = 5 if w < 16 else 10
            yy = y if w < 16 else y - 5
            p.rect(x, yy, w - 1, hh - 1 + (1 if w < 16 else 1), stone)
            p.hline(x, x + w - 2, yy, stone_l)
            p.vline(x + w - 2, yy + 1, yy + hh - 1, stone_d)
    # the big stone, just set, paler than the rest
    p.rect(38, 24, 15, 9, light(stone, 0.18))
    p.hline(38, 52, 24, light(stone_l, 0.3))
    p.vline(52, 25, 32, stone_d)
    m = Pix()
    shirt, apron, apron_d = (180, 170, 150), (130, 86, 54), (96, 62, 40)
    cx = 15
    m.rect(cx - 5, 17, 10, 12, shirt)
    m.rect(cx - 4, 21, 8, 11, apron)
    m.rect(cx, 21, 4, 11, apron_d)
    m.rect(cx - 4, 32, 3, 6, (70, 70, 90))
    m.rect(cx + 1, 32, 3, 6, (70, 70, 90))
    m.hline(cx - 5, cx - 1, 38, INK)
    m.hline(cx + 1, cx + 5, 38, INK)
    face(m, cx, 12, SKIN, r=3.2, look=1)
    m.hline(cx - 3, cx + 3, 9, (80, 70, 60))
    m.set(cx - 3, 10, (80, 70, 60))
    m.set(cx + 1, 15, SKIN_D)
    m.set(cx + 2, 15, SKIN_D)
    m.rect(cx - 3, 8, 6, 2, (200, 60, 50))  # a red cap
    # both arms forward carrying a block to the wall
    m.thick(cx + 4, 19, cx + 9, 22, SKIN, 2)
    m.thick(cx - 4, 19, cx + 6, 24, SKIN_D, 2)
    m.rect(cx + 7, 18, 7, 5, stone)
    m.hline(cx + 7, cx + 13, 18, stone_l)
    m.vline(cx + 13, 19, 22, stone_d)
    p.paste(m)
    # the trowel in the mortar tub
    p.rect(2, 33, 7, 5, BROWN)
    p.hline(2, 8, 33, (200, 196, 186))
    p.line(6, 32, 9, 28, BROWN_D)
    p.poly([(4, 31), (7, 32), (5, 33)], STEEL)
    return p


def g03():
    """THE WEAVER: a weaver at her loom, threads of many colours crossing (the very complicated texture, bathed in euphony)."""
    k = Key("C#")
    p = Pix()
    room = k.c(0.04, -0.1)
    p.rect(0, 0, W, H, room)
    p.vgrad(0, 0, W, 34, [k.c(-0.02, -0.1), k.c(0.06, -0.1), k.c(0.14, -0.05)])
    p.rect(0, 34, W, 6, (130, 96, 64))
    p.hline(0, W - 1, 34, (170, 130, 90))
    # the loom: two posts, beams, the warp threads, the woven cloth growing at the bottom
    wood, wood_d = (150, 100, 60), (104, 68, 40)
    p.rect(28, 3, 3, 33, wood)
    p.rect(58, 3, 3, 33, wood)
    p.vline(30, 3, 35, wood_d)
    p.vline(60, 3, 35, wood_d)
    p.rect(27, 3, 35, 3, wood)
    p.rect(27, 28, 35, 3, wood)
    for x in range(32, 58, 2):
        p.vline(x, 6, 18, (236, 230, 210))
    weft = [(230, 70, 80), (250, 190, 60), (90, 180, 230), (130, 200, 110), (180, 100, 220), (250, 140, 60)]
    for i, y in enumerate(range(19, 28)):
        c = weft[(i // 2) % len(weft)]
        for x in range(31, 58):
            p.set(x, y, c if (x + y) % 2 else dark(c, 0.2))
    # the shuttle passing through, a thread trailing
    p.rect(42, 17, 6, 2, wood)
    p.hline(43, 46, 17, light(wood, 0.3))
    p.line(48, 18, 57, 19, weft[0])
    w = Pix()
    dress, dress_d = (60, 110, 170), (40, 76, 126)
    cx = 17
    w.poly([(cx - 4, 18), (cx + 4, 18), (cx + 8, 36), (cx - 8, 36)], dress)
    w.poly([(cx + 1, 18), (cx + 4, 18), (cx + 8, 36), (cx + 3, 36)], dress_d)
    w.rect(cx - 9, 30, 6, 6, wood_d)  # her stool
    face(w, cx, 13, SKIN, r=3, look=1)
    w.ell(cx - 2, 10, 3.5, 2.5, (100, 60, 40))  # hair, a bun
    w.disc(cx - 4, 11, 1.6, (100, 60, 40))
    w.hline(cx - 2, cx + 2, 9, (100, 60, 40))
    w.hline(cx - 3, cx + 3, 17, WHITE)
    # arms reaching to the threads
    w.thick(cx + 3, 20, cx + 12, 21, SKIN, 1)
    w.thick(cx + 2, 22, cx + 12, 24, SKIN_D, 1)
    p.paste(w)
    # yarn balls on the floor
    for x, c in ((6, weft[1]), (10, weft[2])):
        p.disc(x, 36, 2, c)
        p.set(x - 1, 35, light(c, 0.5))
    return p


def g04():
    """THE FOX: a fox in full flight across a moonlit field, two trails of prints behind (the 12/16 run; two subjects)."""
    k = Key("c#")
    p = Pix()
    sky(p, k, 0, 28, lift=0.02)
    p.disc(52, 8, 5, (240, 236, 204))
    p.disc(50, 7, 1.2, (214, 210, 180))
    stars(p, [(5, 4), (14, 9), (26, 3), (36, 7), (62, 18)])
    field = k.c(-0.06, -0.1, 20)
    p.rect(0, 28, W, 12, field)
    p.hline(0, W - 1, 28, light(field, 0.2))
    for x in range(0, W, 3):
        p.vline(x, 26 + (x * 7) % 3, 28, dark(field, 0.1))
    # two trails of prints (the two subjects)
    for i in range(6):
        p.set(4 + i * 4, 33 + (i % 2), light(field, 0.3))
        p.set(6 + i * 4, 37 - (i % 2), light(field, 0.25))
    f = Pix()
    fur, fur_d, fur_l = (230, 120, 50), (170, 76, 34), (250, 170, 90)
    cx, cy = 34, 22
    # stretched mid-leap: body long, legs fore and aft, tail streaming
    f.ell(cx, cy, 9, 3.5, fur)
    f.ell(cx, cy + 1.5, 7, 1.8, (246, 236, 220))
    f.hline(cx - 7, cx + 6, cy - 3, fur_l)
    # head and ears, pointing right
    f.poly([(cx + 7, cy - 4), (cx + 13, cy - 4), (cx + 17, cy - 1), (cx + 12, cy + 1), (cx + 8, cy + 1)], fur)
    f.poly([(cx + 13, cy - 1), (cx + 17, cy - 1), (cx + 12, cy + 1)], (246, 236, 220))
    f.poly([(cx + 8, cy - 4), (cx + 9, cy - 8), (cx + 11, cy - 4)], fur_d)
    f.poly([(cx + 11, cy - 4), (cx + 12, cy - 7), (cx + 13, cy - 4)], fur)
    f.set(cx + 13, cy - 3, INK)
    f.set(cx + 17, cy - 1, INK)
    # legs
    f.thick(cx + 6, cy + 2, cx + 12, cy + 5, fur_d, 2)
    f.thick(cx + 4, cy + 2, cx + 9, cy + 6, fur, 1)
    f.thick(cx - 6, cy + 2, cx - 12, cy + 5, fur_d, 2)
    f.thick(cx - 5, cy + 2, cx - 9, cy + 6, fur, 1)
    for x, y in ((cx + 13, cy + 6), (cx + 10, cy + 7), (cx - 13, cy + 6), (cx - 10, cy + 7)):
        f.set(x, y, INK)
    # the brush, streaming back and up, white-tipped
    f.poly([(cx - 8, cy - 2), (cx - 16, cy - 6), (cx - 22, cy - 5), (cx - 17, cy - 2), (cx - 8, cy + 1)], fur)
    f.poly([(cx - 16, cy - 6), (cx - 22, cy - 5), (cx - 19, cy - 3)], WHITE)
    p.paste(f)
    for y in (17, 21, 25):
        p.hline(4, 9, y, light(k.c(0.1), 0.3))
    return p


def g05():
    """THE CANTOR: a cantor in black gown and white bands beats time, the choir singing behind (the vocal fugue; the subject's three repeated notes)."""
    k = Key("D")
    p = Pix()
    room = k.c(-0.02, -0.15)
    p.rect(0, 0, W, H, room)
    # a church window behind
    p.rect(38, 3, 14, 18, k.c(0.2, 0.0))
    p.disc(45, 3, 7, k.c(0.2, 0.0))
    p.vline(45, -4, 20, room)
    p.hline(38, 51, 11, room)
    p.glow(45, 10, 14, light(room, 0.12), inner=0.0)
    # the choir loft's rail with three singing heads
    p.rect(30, 24, 34, 16, (110, 70, 44))
    p.hline(30, 63, 24, (160, 110, 70))
    for x in range(32, 64, 4):
        p.vline(x, 26, 39, (84, 52, 34))
    for i, x in enumerate((38, 47, 56)):
        c = Pix()
        c.rect(x - 3, 20, 7, 4, (220, 50, 50))
        c.hline(x - 3, x + 3, 20, WHITE)
        face(c, x, 17, SKIN, r=2.6)
        c.set(x, 19, INK)  # mouths open
        c.set(x, 18, (150, 50, 50))
        c.hline(x - 2, x + 2, 14, [(110, 70, 40), (230, 190, 90), (60, 40, 30)][i])
        p.paste(c)
    m = Pix()
    gown, gown_d = (52, 46, 70), (34, 30, 48)
    cx = 17
    robe(m, cx, 17, 39, 4, 9, gown, gown_d)
    m.rect(cx - 1, 17, 3, 4, WHITE)  # the bands
    m.vline(cx, 17, 21, (210, 210, 220))
    m.rect(cx - 1, 15, 3, 2, SKIN_D)  # neck
    face(m, cx + 1, 11, SKIN, r=3.2, look=1, mouth=RED_D)
    # a grey wig: a crown of curls, a roll over the ear, the queue behind
    wig, wig_d = (214, 214, 220), (170, 170, 182)
    m.hline(cx - 2, cx + 3, 7, wig)
    m.hline(cx - 1, cx + 2, 6, wig)
    m.disc(cx - 2, 10, 1.6, wig)
    m.set(cx - 2, 12, wig_d)
    m.line(cx - 3, 12, cx - 5, 15, wig_d)
    # the arm raised, beating time with a roll of music
    m.thick(cx + 4, 18, cx + 9, 11, gown, 2)
    m.rect(cx + 9, 6, 2, 6, CREAM)
    m.set(cx + 10, 10, SKIN)
    m.thick(cx - 4, 18, cx - 7, 25, gown_d, 2)
    p.paste(m)
    # D D D: three notes on one line, then the leap up
    notes_trail(p, [(27, 14), (31, 14), (35, 14)], CREAM)
    p.set(39, 9, CREAM)
    p.set(40, 9, CREAM)
    p.vline(40, 6, 9, CREAM)
    return p


def g06():
    """THE ARCHER: an archer draws the bow to full (controlled energy, elastic; the rising run is the string drawn back)."""
    k = Key("d")
    p = Pix()
    sky(p, k, 0, 30, lift=0.06, warm=0.2)
    hill = k.c(-0.06, -0.15, 20)
    p.poly([(0, 30), (30, 28), (64, 31), (64, 40), (0, 40)], hill)
    p.line(0, 30, 30, 28, light(hill, 0.2))
    p.line(30, 28, 64, 31, light(hill, 0.2))
    # the target far right
    for r, c in ((5, WHITE), (4, RED), (3, WHITE), (2, RED), (1, GOLD)):
        p.ell(56, 22, r * 0.6, r, c)
    p.vline(56, 27, 31, BROWN)
    a = Pix()
    tunic, tunic_d = (60, 130, 70), (40, 92, 50)
    cx = 18
    a.poly([(cx - 4, 15), (cx + 3, 15), (cx + 5, 28), (cx - 5, 28)], tunic)
    a.poly([(cx, 15), (cx + 3, 15), (cx + 5, 28), (cx + 1, 28)], tunic_d)
    a.hline(cx - 5, cx + 5, 24, BROWN)
    a.thick(cx - 3, 28, cx - 6, 36, (110, 90, 60), 2)  # stance, braced
    a.thick(cx + 2, 28, cx + 5, 36, (110, 90, 60), 2)
    a.hline(cx - 8, cx - 5, 37, INK)
    a.hline(cx + 5, cx + 8, 37, INK)
    face(a, cx, 11, SKIN, r=3, look=1)
    a.poly([(cx - 4, 10), (cx + 3, 7), (cx + 4, 8), (cx - 3, 12)], tunic_d)  # hood
    a.poly([(cx - 3, 9), (cx - 9, 13), (cx - 4, 12)], tunic_d)
    a.set(cx - 2, 7, RED)  # a feather
    a.set(cx - 3, 6, RED)
    # the bow arm straight to the right, the draw arm bent back to the cheek
    a.thick(cx + 3, 16, cx + 14, 16, SKIN, 1)
    a.thick(cx + 3, 17, cx + 14, 17, tunic, 1)
    a.thick(cx - 2, 17, cx + 3, 13, SKIN_D, 1)
    p.paste(a)
    # the bow, bent deep, the string drawn back to the cheek
    for t in range(-10, 11):
        p.set(cx + 15 + 3 * math.cos(t / 10 * 1.4), 16 + t, BROWN)
    p.line(cx + 16, 6, cx + 2, 13, CREAM)
    p.line(cx + 2, 13, cx + 16, 26, CREAM)
    p.line(cx + 2, 13, cx + 22, 16, STEEL)
    p.set(cx + 23, 16, WHITE)
    p.set(cx + 1, 12, RED)
    p.set(cx + 1, 14, RED)
    return p


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


def g08():
    """THE GEM-CUTTER: a gem-cutter holds a dark gem to the lamp, its facets flashing (Bodky: 'a gem for connoisseurs'; heavy melancholy)."""
    k = Key("d#")
    p = Pix()
    room = k.c(-0.07, -0.12)
    p.rect(0, 0, W, H, room)
    p.glow(44, 8, 18, mix(room, GOLD, 0.25), inner=0.2)
    # the lamp hanging
    p.vline(44, 0, 3, INK)
    p.poly([(40, 7), (42, 3), (46, 3), (48, 7)], (60, 80, 70))
    p.hline(41, 47, 7, FIRE_L)
    # the bench
    p.rect(0, 30, W, 10, (90, 62, 44))
    p.hline(0, W - 1, 30, (140, 100, 66))
    p.rect(50, 26, 9, 4, (70, 70, 84))  # the grinding wheel
    p.ell(54, 25, 4, 2, (130, 130, 150))
    m = Pix()
    coat, coat_d = (110, 60, 60), (76, 40, 44)
    cx = 18
    m.poly([(cx - 6, 30), (cx - 5, 18), (cx + 4, 17), (cx + 6, 30)], coat)
    m.poly([(cx + 1, 17), (cx + 4, 17), (cx + 6, 30), (cx + 2, 30)], coat_d)
    face(m, cx, 12, SKIN, r=3.2, look=1)
    m.hline(cx - 3, cx + 2, 9, (60, 50, 50))  # dark hair
    m.vline(cx - 3, 9, 13, (60, 50, 50))
    m.hline(cx, cx + 3, 15, (60, 50, 50))  # beard
    m.set(cx + 2, 16, (60, 50, 50))
    m.disc(cx + 3, 11, 1.5, GOLD_D)  # the loupe on its band
    m.set(cx + 3, 11, (200, 230, 255))
    # the arm raising the gem toward the light
    m.thick(cx + 4, 19, cx + 12, 13, coat, 2)
    m.rect(cx + 13, 12, 2, 2, SKIN)
    m.thick(cx - 4, 21, cx + 2, 28, coat_d, 2)
    p.paste(m)
    # the gem: facetted, deep blue, a white star of light
    g = Pix()
    gx, gy = 36, 10
    g.poly([(gx - 4, gy), (gx - 2, gy - 3), (gx + 2, gy - 3), (gx + 4, gy), (gx, gy + 5)], (60, 110, 220))
    g.poly([(gx - 2, gy - 3), (gx, gy - 3), (gx - 1, gy), (gx - 4, gy)], (140, 190, 255))
    g.poly([(gx, gy), (gx + 4, gy), (gx, gy + 5)], (36, 64, 150))
    g.hline(gx - 4, gx + 4, gy, (100, 160, 250))
    p.paste(g)
    twinkle(p, gx - 1, gy - 2, (200, 230, 255), 2)
    for x, y in ((42, 4 + 12), (30, 6), (40, 18)):
        p.set(x, y, (160, 200, 255))
    return p


def g09():
    """THE ANGEL: an angel sings over the shepherds' night, wings wide, a star above (Palestrina's vocal beauty; 'flights of angels', a Christmas piece)."""
    k = Key("E")
    p = Pix()
    sky(p, k, lift=0.02)
    stars(p, [(4, 6), (10, 16), (20, 3), (56, 18), (60, 6), (48, 3), (6, 26)])
    twinkle(p, 52, 7, CREAM, 2)
    p.set(52, 4, WHITE)
    # hills and a little flock below
    hill = k.c(-0.08, -0.15, -20)
    p.poly([(0, 40), (0, 33), (20, 30), (44, 33), (64, 30), (64, 40)], hill)
    for x in (8, 12, 50, 55):
        p.ell(x, 34, 2, 1, (230, 226, 216))
    a = Pix()
    gown, gown_d = (250, 248, 240), (206, 204, 220)
    cx = 30
    # wings spread wide behind
    wing, wing_d = (240, 236, 220), (200, 196, 190)
    a.poly([(cx - 2, 15), (cx - 18, 8), (cx - 20, 12), (cx - 16, 18), (cx - 4, 21)], wing)
    a.poly([(cx + 2, 15), (cx + 18, 8), (cx + 20, 12), (cx + 16, 18), (cx + 4, 21)], wing)
    for i in range(3):
        a.line(cx - 6 - i * 4, 18 - i, cx - 14 - i * 2, 11 + i, wing_d)
        a.line(cx + 6 + i * 4, 18 - i, cx + 14 + i * 2, 11 + i, wing_d)
    robe(a, cx, 16, 36, 3, 7, gown, gown_d)
    a.hline(cx - 3, cx + 3, 21, GOLD)  # girdle
    face(a, cx, 11, SKIN, r=3, mouth=RED_D, cheek=True)
    a.hline(cx - 3, cx + 3, 8, GOLD)  # golden hair
    a.vline(cx - 3, 8, 13, GOLD)
    a.vline(cx + 3, 8, 13, GOLD)
    a.set(cx - 2, 8, (255, 230, 120))
    # hands together, holding a scroll of music
    a.rect(cx - 3, 18, 6, 2, CREAM)
    a.set(cx - 4, 18, GOLD_D)
    a.set(cx + 3, 18, GOLD_D)
    p.paste(a)
    p.ring(cx, 5, 3, GOLD, 180, 360)  # halo
    p.hline(cx - 3, cx + 3, 5, GOLD)
    notes_trail(p, [(37, 11), (40, 8)], CREAM)
    return p


def g10():
    """THE HOUND: a hound bounds forward, straining, ears flying, leash loose behind (energetic, impatient, pressing forward)."""
    k = Key("e")
    p = Pix()
    sky(p, k, 0, 28, lift=0.06, warm=0.3)
    for x in range(0, W, 7):
        p.ell(x + 3, 26, 4, 3 + (x % 3), k.c(-0.06, -0.12, 20))
    field = k.c(-0.03, -0.15, 40)
    p.rect(0, 28, W, 12, field)
    p.hline(0, W - 1, 28, light(field, 0.25))
    for x in range(1, W, 4):
        p.set(x, 31 + (x % 5), dark(field, 0.2))
    h = Pix()
    coat, coat_d, coat_l = (200, 150, 96), (150, 100, 60), (236, 200, 150)
    cx, cy = 30, 20
    h.ell(cx, cy, 10, 4, coat)
    h.ell(cx - 2, cy + 2, 6, 2, coat_l)
    h.ell(cx - 3, cy - 1, 4, 2.5, (110, 70, 40))  # a dark saddle patch
    # deep chest, the head thrust out, ears flying back
    h.poly([(cx + 8, cy - 3), (cx + 13, cy - 7), (cx + 19, cy - 6), (cx + 21, cy - 4), (cx + 15, cy - 2), (cx + 10, cy + 3)], coat)
    h.poly([(cx + 16, cy - 4), (cx + 21, cy - 4), (cx + 17, cy - 2)], coat_l)
    h.set(cx + 21, cy - 5, INK)
    h.set(cx + 16, cy - 6, INK)
    h.poly([(cx + 13, cy - 7), (cx + 7, cy - 9), (cx + 10, cy - 5)], (110, 70, 40))
    # legs fully stretched
    h.thick(cx + 7, cy + 2, cx + 15, cy + 7, coat_d, 2)
    h.thick(cx + 5, cy + 3, cx + 11, cy + 9, coat, 2)
    h.thick(cx - 8, cy + 2, cx - 15, cy + 6, coat_d, 2)
    h.thick(cx - 7, cy + 3, cx - 12, cy + 9, coat, 2)
    h.line(cx - 10, cy - 2, cx - 17, cy - 7, coat_d)  # tail up
    h.set(cx - 18, cy - 8, WHITE)
    h.hline(cx + 10, cx + 13, cy - 2, RED)  # collar
    p.paste(h)
    # the leash trailing loose behind
    for t in range(12):
        p.set(cx + 10 - t * 1.6, cy - 2 + 4 * math.sin(t / 3) + t * 0.6, RED_D)
    for y in (16, 20, 24):
        p.hline(2, 8, y, light(k.c(0.1), 0.4))
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


def g12():
    """THE WOODPECKER: a woodpecker taps the trunk, chips flying (caprice and humour; the subject's F-F-F taps)."""
    k = Key("f")
    p = Pix()
    sky(p, k, lift=0.06)
    # a wood behind
    for x in range(0, W, 9):
        p.rect(x, 0, 3, 40, k.c(-0.08, -0.1, 10))
    # the trunk, big, on the right
    bark, bark_d, bark_l = (130, 90, 60), (90, 60, 40), (170, 126, 86)
    p.rect(38, 0, 16, 40, bark)
    p.vline(38, 0, 39, bark_l)
    p.rect(50, 0, 4, 40, bark_d)
    for y in range(2, 40, 5):
        p.line(41, y, 43, y + 3, bark_d)
        p.line(46, y + 2, 47, y + 4, bark_d)
    p.disc(39, 14, 1.4, (60, 40, 28))  # the hole being drilled
    w = Pix()
    black, white, red = (34, 30, 38), (244, 244, 240), (220, 40, 40)
    cx, cy = 30, 18
    # body upright on the trunk's side, tail braced
    w.ell(cx, cy, 4, 7, black)
    w.ell(cx - 1, cy + 1, 2, 5, white)
    for y in range(cy - 4, cy + 6, 2):
        w.set(cx + 2, y, white)  # barred wing
    w.poly([(cx + 1, cy + 6), (cx + 4, cy + 13), (cx + 2, cy + 13), (cx - 1, cy + 7)], black)
    w.disc(cx + 1, cy - 8, 3.5, black)
    w.rect(cx - 1, cy - 12, 4, 3, red)  # the red cap
    w.set(cx + 2, cy - 13, red)
    w.hline(cx - 2, cx + 3, cy - 7, white)
    w.set(cx + 2, cy - 8, INK)
    w.set(cx + 2, cy - 9, white)
    w.hline(cx + 4, cx + 8, cy - 7, (220, 200, 140))  # beak to the trunk
    w.hline(cx + 4, cx + 6, cy - 6, (180, 160, 110))
    w.thick(cx + 3, cy + 4, cx + 7, cy + 5, (120, 110, 100), 1)  # feet gripping
    p.paste(w)
    # tap marks and chips
    for i, (x, y) in enumerate(((40, 8), (42, 7), (44, 9))):
        p.line(x - 2, y - 2, x - 1, y - 1, WHITE)
    for x, y in ((34, 6), (33, 9), (36, 4)):
        p.set(x, y, bark_l)
    return p


def g13():
    """THE TRILL: a songbird on a branch, its trill spinning out (the owner's name: II/13's subject alone begins with a trill)."""
    k = Key("F#")
    p = Pix()
    sky(p, k, lift=0.16, warm=0.2)
    p.glow(14, 10, 9, (255, 236, 180), inner=0.4)
    # the branch with leaves and a blossom
    br, br_d = (110, 72, 44), (80, 50, 30)
    p.line(0, 30, 64, 24, br)
    p.line(0, 31, 64, 25, br)
    p.line(0, 32, 64, 26, br_d)
    p.line(44, 26, 52, 33, br)
    for x, y in ((8, 28), (16, 30), (40, 23), (56, 24), (50, 31)):
        p.ell(x, y, 2.5, 1.2, (90, 160, 80))
        p.set(x - 1, y, (140, 200, 110))
    p.disc(58, 22, 1.5, WHITE)
    p.set(58, 22, GOLD)
    b = Pix()
    blue, blue_d, breast = (70, 130, 220), (44, 86, 170), (250, 150, 70)
    cx, cy = 26, 21
    b.ell(cx, cy, 6, 4, blue)
    b.ell(cx + 1, cy + 1.5, 4, 2.5, breast)
    b.ell(cx - 2, cy - 1, 4, 2, blue_d)
    b.poly([(cx - 5, cy), (cx - 12, cy + 4), (cx - 11, cy + 1), (cx - 5, cy - 2)], blue_d)
    b.disc(cx + 5, cy - 4, 3.2, blue)
    b.set(cx + 6, cy - 5, INK)
    b.set(cx + 5, cy - 6, WHITE)
    # the beak open wide, head thrown back, singing
    b.poly([(cx + 8, cy - 5), (cx + 11, cy - 7), (cx + 8, cy - 4)], (240, 200, 90))
    b.poly([(cx + 8, cy - 3), (cx + 11, cy - 2), (cx + 8, cy - 4)], (210, 170, 70))
    b.vline(cx - 1, cy + 4, cy + 6, (120, 90, 70))
    b.vline(cx + 2, cy + 4, cy + 6, (120, 90, 70))
    p.paste(b)
    # the trill: a tight zigzag spinning out of the beak, widening, then a note
    x, y = cx + 12, cy - 5
    for i in range(14):
        p.set(x + i * 1.2, y - i * 0.55 + (1.5 if i % 2 else -1.5) * (0.5 + i / 14), WHITE if i % 2 else CREAM)
    notes_trail(p, [(54, 10)], WHITE)
    p.set(50, 6, CREAM)
    p.set(46, 4, CREAM)
    return p


def g14():
    """THE ALCHEMIST: an alchemist pours three flasks into one glowing vessel (the triple fugue: thoughtful, terse, flowing, combined)."""
    k = Key("f#")
    p = Pix()
    room = k.c(-0.05, -0.12)
    p.rect(0, 0, W, H, room)
    # shelves with jars
    for y in (6, 14):
        p.hline(40, 63, y, BROWN)
        for i, x in enumerate(range(42, 63, 5)):
            c = [(90, 160, 120), (170, 90, 160), (200, 170, 80), (100, 120, 200)][i % 4]
            p.rect(x, y - 3, 3, 3, c)
            p.set(x, y - 3, light(c, 0.5))
    # the table
    p.rect(20, 31, 44, 3, (110, 74, 48))
    p.hline(20, 63, 31, (150, 106, 70))
    p.rect(24, 34, 3, 6, (80, 52, 34))
    p.rect(58, 34, 3, 6, (80, 52, 34))
    # the vessel glowing: three colours meeting in it
    p.glow(44, 24, 9, mix(room, (180, 255, 160), 0.35), inner=0.2)
    v = Pix()
    v.disc(44, 26, 4.5, (200, 230, 240))
    v.rect(43, 18, 3, 5, (200, 230, 240))
    v.disc(44, 27, 3.2, (140, 240, 150))
    v.hline(41, 47, 26, (220, 255, 200))
    v.set(42, 25, WHITE)
    p.paste(v)
    for y, c in ((15, (240, 90, 90)), (12, (90, 160, 250)), (9, (250, 220, 90))):
        p.set(44 + (y % 2), y, c)
    a = Pix()
    gown, gown_d = (70, 50, 110), (48, 34, 80)
    cx = 16
    robe(a, cx, 15, 39, 4, 8, gown, gown_d)
    for x, y in ((cx - 3, 24), (cx + 2, 30), (cx - 1, 34)):
        a.set(x, y, GOLD)  # stars on the gown
    face(a, cx, 11, SKIN, r=3, look=1)
    a.poly([(cx - 4, 10), (cx + 4, 10), (cx + 1, -2)], gown)  # the tall hat
    a.poly([(cx + 1, -2), (cx + 4, 10), (cx + 1, 10)], gown_d)
    a.set(cx, 5, GOLD)
    a.hline(cx - 2, cx + 3, 14, (230, 230, 230))  # a long white beard
    a.poly([(cx - 2, 14), (cx + 3, 14), (cx + 1, 22)], (230, 230, 230))
    # two arms out, pouring
    a.thick(cx + 4, 18, cx + 13, 14, gown, 2)
    a.thick(cx + 3, 21, cx + 11, 21, gown_d, 2)
    p.paste(a)
    # three flasks: red and blue in his hands pouring, the yellow on the table
    for (x, y, c, tilt) in ((31, 12, (240, 90, 90), 1), (29, 19, (90, 160, 250), 1), (54, 28, (250, 220, 90), 0)):
        f = Pix()
        f.disc(x, y, 2, c)
        f.set(x - 1, y - 1, light(c, 0.6))
        if tilt:
            f.line(x + 2, y - 1, x + 4, y - 2, (200, 230, 240))
        else:
            f.vline(x, y - 4, y - 2, (200, 230, 240))
        p.paste(f)
    p.line(36, 10, 43, 16, (240, 90, 90))
    p.line(34, 17, 42, 18, (90, 160, 250))
    return p


def g15():
    """THE SWALLOW: a swallow swoops low over the pond in loops (a corrente counted in whole bars; the subject's D-B-D-G loops)."""
    k = Key("G")
    p = Pix()
    sky(p, k, 0, 28, lift=0.2)
    for cx, cy, r in ((50, 7, 3), (54, 6, 4), (58, 8, 3)):
        p.disc(cx, cy, r, WHITE)
    water, water_l = k.c(0.06, 0.05, -40), k.c(0.24, 0.05, -40)
    p.rect(0, 28, W, 12, water)
    p.hline(0, W - 1, 28, water_l)
    for y in range(30, H, 3):
        for x in range((y * 5) % 9, W, 12):
            p.hline(x, x + 3, y, water_l)
    for x in (2, 4, 60, 62):
        p.vline(x, 21 + x % 3, 29, GREEN_D)
    # the loops of its flight: D-B-D-G
    for t in range(0, 60):
        a = t / 60 * 4 * math.pi
        x = 4 + t * 0.55 + 3 * math.cos(a)
        y = 16 + 5 * math.sin(a)
        if t % 3 == 0 and x < 26:
            p.set(x, y, WHITE)
    s = Pix()
    back, belly, throat = (40, 50, 110), (246, 240, 230), (210, 70, 50)
    cx, cy = 36, 18
    # swept-back wings, the forked tail, banking
    s.poly([(cx - 2, cy), (cx - 12, cy - 9), (cx - 7, cy - 2)], back)
    s.poly([(cx + 2, cy), (cx + 14, cy - 7), (cx + 6, cy + 1)], back)
    s.line(cx - 12, cy - 9, cx - 3, cy - 1, light(back, 0.3))
    s.ell(cx, cy + 1, 5, 2.5, back)
    s.ell(cx, cy + 2, 3.5, 1.4, belly)
    s.disc(cx + 5, cy, 2.2, back)
    s.set(cx + 6, cy + 1, throat)
    s.set(cx + 7, cy + 1, throat)
    s.set(cx + 6, cy - 1, WHITE)
    s.set(cx + 8, cy, INK)
    s.line(cx - 4, cy + 2, cx - 11, cy + 6, back)
    s.line(cx - 4, cy + 1, cx - 12, cy + 2, back)
    p.paste(s)
    # its reflection, and a ring where a wingtip touched
    p.ell(30, 33, 3, 0.8, WHITE)
    return p


def g16():
    """THE ORATOR: an orator on a crate, fist raised, hurling his protest at the crowd (declamation with raised voice; molto feroce)."""
    k = Key("g")
    p = Pix()
    sky(p, k, lift=0.02, warm=0.5)
    # columns of a forum behind
    for x in (4, 46, 56):
        p.rect(x, 4, 5, 30, k.c(0.04, -0.2, 20))
        p.vline(x, 4, 33, k.c(0.14, -0.2, 20))
        p.rect(x - 1, 3, 7, 2, k.c(0.1, -0.2, 20))
    # the crowd: heads and raised spears below
    for i, x in enumerate(range(0, W, 5)):
        y = 33 + (i % 2)
        p.disc(x + 2, y, 2.4, k.c(-0.1, -0.15))
        if i % 3 == 0:
            p.vline(x + 3, y - 10, y, (150, 150, 160))
            p.poly([(x + 2, y - 10), (x + 3, y - 13), (x + 4, y - 10)], STEEL)
    p.rect(0, 35, W, 5, k.c(-0.12, -0.15))
    o = Pix()
    toga, toga_d = (236, 230, 216), (190, 182, 166)
    cx = 30
    o.rect(cx - 7, 28, 14, 6, (150, 104, 64))  # the crate
    o.hline(cx - 7, cx + 6, 28, (190, 140, 90))
    o.line(cx - 7, 28, cx + 6, 33, (110, 74, 44))
    robe(o, cx, 13, 27, 4, 6, toga, toga_d)
    o.line(cx - 4, 14, cx + 4, 24, (180, 50, 50))  # a red sash
    o.line(cx - 3, 14, cx + 5, 24, (180, 50, 50))
    face(o, cx, 9, SKIN, r=3, look=-1)
    o.rect(cx - 2, 11, 2, 1, INK)  # mouth wide, shouting
    o.set(cx - 2, 12, (150, 40, 40))
    o.set(cx - 2, 7, INK)  # brows angry
    o.set(cx - 1, 7, INK)
    o.hline(cx - 2, cx + 3, 5, (60, 40, 30))
    o.vline(cx + 3, 5, 9, (60, 40, 30))
    # the fist raised high, the other arm flung down
    o.thick(cx - 4, 14, cx - 9, 6, toga, 2)
    o.rect(cx - 11, 3, 3, 3, SKIN)
    o.thick(cx + 4, 15, cx + 9, 21, toga_d, 2)
    o.set(cx + 10, 22, SKIN)
    p.paste(o)
    # shouting lines
    for (x0, y0, x1, y1) in ((24, 10, 21, 9), (24, 12, 21, 13), (23, 11, 20, 11)):
        p.line(x0, y0, x1, y1, WHITE)
    return p


def g17():
    """THE QUEEN: a queen enthroned, crowned, sceptre upright (grace, equipoise and solemnity; Bodky's Sanctus)."""
    k = Key("Ab")
    p = Pix()
    hall = k.c(0.02, -0.1)
    p.rect(0, 0, W, H, hall)
    p.vgrad(0, 0, W, 32, [k.c(-0.04, -0.1), k.c(0.04, -0.1), k.c(0.1, -0.05)])
    # banners either side, the throne's dais
    for x in (6, 52):
        p.rect(x, 0, 7, 18, (170, 40, 60))
        p.poly([(x, 18), (x + 3, 21), (x + 6, 18)], (170, 40, 60))
        p.rect(x + 2, 6, 3, 4, GOLD)
    p.rect(14, 33, 36, 3, (140, 30, 50))
    p.rect(10, 36, 44, 4, (110, 24, 40))
    p.hline(14, 49, 33, (200, 60, 80))
    q = Pix()
    # the throne's high back, gold
    q.rect(22, 4, 20, 30, GOLD_D)
    q.rect(23, 5, 18, 28, (180, 40, 60))
    q.disc(32, 4, 4, GOLD_D)
    q.set(32, 0, GOLD)
    gown, gown_d, ermine = (120, 60, 170), (84, 40, 124), (248, 246, 240)
    cx = 32
    q.poly([(cx - 5, 17), (cx + 5, 17), (cx + 9, 33), (cx - 9, 33)], gown)
    q.poly([(cx + 2, 17), (cx + 5, 17), (cx + 9, 33), (cx + 3, 33)], gown_d)
    q.hline(cx - 9, cx + 9, 32, ermine)  # ermine hem with spots
    q.hline(cx - 5, cx + 5, 17, ermine)
    for x in range(cx - 8, cx + 9, 3):
        q.set(x, 32, INK)
    face(q, cx, 12, SKIN, r=3.2, mouth=RED_D)
    q.vline(cx - 3, 10, 16, (110, 70, 40))  # hair falling
    q.vline(cx + 3, 10, 16, (110, 70, 40))
    q.hline(cx - 3, cx + 3, 9, (110, 70, 40))
    # the crown
    q.rect(cx - 3, 6, 7, 3, GOLD)
    for x in (cx - 3, cx, cx + 3):
        q.set(x, 5, GOLD)
    q.set(cx, 7, RED)
    # the sceptre upright in her right hand, an orb in her left
    q.vline(cx - 9, 6, 26, GOLD)
    q.disc(cx - 9, 5, 1.4, (240, 220, 120))
    q.thick(cx - 5, 19, cx - 8, 23, gown, 2)
    q.disc(cx + 8, 22, 2, GOLD)
    q.set(cx + 8, 19, GOLD)
    q.thick(cx + 5, 19, cx + 7, 22, gown_d, 2)
    p.paste(q)
    twinkle(p, cx, 1, WHITE)
    return p


def g18():
    """THE DANCERS: two dancers in a moonlit garden, hands joined (the double fugue: first theme, second theme, both together)."""
    k = Key("g#")
    p = Pix()
    sky(p, k, 0, 30, lift=0.02)
    p.disc(32, 8, 4, (240, 236, 210))
    stars(p, [(6, 4), (16, 9), (46, 3), (58, 10), (24, 2)])
    # clipped hedges and a path
    hedge = k.c(-0.06, 0.0, 10)
    p.rect(0, 22, W, 10, hedge)
    for x in range(0, W, 8):
        p.disc(x + 4, 22, 4, hedge)
    p.rect(0, 30, W, 10, (190, 180, 160))
    p.hline(0, W - 1, 30, (220, 212, 196))
    for x in range(2, W, 6):
        p.set(x, 34 + (x % 3), (160, 150, 130))
    d = Pix()
    # the lady: a wide gown, curtseying, turned toward him
    gown, gown_d = (240, 160, 190), (200, 110, 150)
    lx = 22
    d.poly([(lx - 3, 17), (lx + 3, 17), (lx + 9, 34), (lx - 9, 34)], gown)
    d.poly([(lx + 1, 17), (lx + 3, 17), (lx + 9, 34), (lx + 3, 34)], gown_d)
    d.rect(lx - 2, 13, 5, 5, gown)
    face(d, lx, 10, SKIN, r=2.6, look=1)
    d.ell(lx - 1, 6, 3, 2.5, (240, 236, 230))  # powdered hair, piled high
    d.set(lx + 2, 5, (200, 80, 120))
    d.thick(lx + 2, 15, lx + 9, 14, SKIN, 1)
    # the gentleman: blue coat, knee breeches, bowing slightly, his hand up to hers
    coat, coat_d = (60, 90, 170), (40, 62, 126)
    gx = 42
    d.poly([(gx - 4, 14), (gx + 3, 14), (gx + 5, 27), (gx - 5, 27)], coat)
    d.poly([(gx, 14), (gx + 3, 14), (gx + 5, 27), (gx + 1, 27)], coat_d)
    d.rect(gx - 1, 15, 2, 6, WHITE)
    d.rect(gx - 3, 27, 2, 3, coat_d)
    d.rect(gx + 1, 27, 2, 3, coat_d)
    d.vline(gx - 2, 30, 33, WHITE)
    d.vline(gx + 2, 30, 33, WHITE)
    d.hline(gx - 4, gx - 2, 34, INK)
    d.hline(gx + 2, gx + 4, 34, INK)
    face(d, gx - 1, 10, SKIN, r=2.6, look=-1)
    d.hline(gx - 3, gx + 2, 7, (240, 236, 230))
    d.vline(gx + 2, 7, 11, (240, 236, 230))
    d.thick(gx - 4, 15, lx + 11, 13, coat, 1)
    p.paste(d)
    twinkle(p, 32, 13, WHITE)  # their hands meet
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


def g20():
    """THE BULL: a bull charges, head down, steam from his nostrils (an extraordinary outburst of temper; 'explosive')."""
    k = Key("a")
    p = Pix()
    sky(p, k, 0, 28, lift=0.04, warm=0.4)
    arena = (196, 150, 96)
    p.rect(0, 28, W, 12, arena)
    p.hline(0, W - 1, 28, (226, 186, 130))
    p.rect(0, 22, W, 6, (140, 40, 40))  # the arena's red barrier
    p.hline(0, W - 1, 22, (190, 70, 60))
    for x in range(4, W, 10):
        p.vline(x, 23, 27, (100, 26, 30))
    b = Pix()
    hide, hide_d, hide_l = (50, 36, 34), (30, 22, 22), (100, 76, 66)
    cx, cy = 30, 24
    # the hump high, the head low and forward, horns out
    b.ell(cx, cy, 11, 6, hide)
    b.ell(cx - 3, cy - 3, 7, 4, hide)
    b.line(cx - 10, cy - 4, cx + 2, cy - 7, hide_l)
    b.poly([(cx + 8, cy - 4), (cx + 17, cy), (cx + 16, cy + 6), (cx + 9, cy + 5)], hide)
    b.poly([(cx + 14, cy + 2), (cx + 18, cy + 3), (cx + 17, cy + 6), (cx + 13, cy + 6)], hide_l)
    b.set(cx + 13, cy + 1, (230, 60, 50))  # a red eye
    b.line(cx + 12, cy - 1, cx + 18, cy - 6, (240, 230, 200))  # horns
    b.line(cx + 18, cy - 6, cx + 20, cy - 5, (240, 230, 200))
    b.line(cx + 10, cy - 1, cx + 7, cy - 6, (220, 210, 180))
    # legs: driving
    b.thick(cx + 6, cy + 4, cx + 10, cy + 11, hide_d, 2)
    b.thick(cx + 2, cy + 5, cx + 1, cy + 11, hide, 2)
    b.thick(cx - 7, cy + 4, cx - 12, cy + 10, hide_d, 2)
    b.thick(cx - 4, cy + 5, cx - 5, cy + 11, hide, 2)
    b.line(cx - 11, cy - 1, cx - 16, cy - 5, hide_d)  # tail lashing
    b.set(cx - 17, cy - 6, hide_l)
    p.paste(b)
    # steam from the nostrils, dust kicked up
    for x, y in ((50, 30), (52, 29), (53, 31), (55, 30)):
        p.set(x, y, WHITE)
    for x, y in ((12, 34), (14, 36), (10, 37), (16, 33), (8, 35)):
        p.set(x, y, (236, 210, 170))
    for y in (15, 19):
        p.hline(2, 9, y, light(k.c(0.1), 0.4))
    return p


def g21():
    """THE MOTHER: a mother rocks the cradle under a window's star (Bodky: cradle peace on earth, a Christmas scene)."""
    k = Key("Bb")
    p = Pix()
    room = k.c(-0.04, -0.12)
    p.rect(0, 0, W, H, room)
    # the window: night, a big star
    p.vgrad(40, 4, 18, 16, [k.c(-0.12, 0.1, 40), k.c(-0.05, 0.1, 40)])
    stars(p, [(42, 6), (55, 8), (44, 16), (53, 17)])
    p.set(49, 10, WHITE)
    for d in (1, 2):
        p.set(49 - d, 10, CREAM)
        p.set(49 + d, 10, CREAM)
        p.set(49, 10 - d, CREAM)
        p.set(49, 10 + d, CREAM)
    for dx, dy in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
        p.set(49 + dx, 10 + dy, light(CREAM, 0.2) if False else (200, 190, 160))
    p.rect(39, 3, 20, 1, (130, 90, 60))
    p.rect(39, 20, 20, 2, (130, 90, 60))
    p.rect(39, 3, 1, 18, (130, 90, 60))
    p.rect(58, 3, 1, 18, (130, 90, 60))
    p.glow(14, 14, 16, mix(room, GOLD, 0.25), inner=0.2)  # candlelight
    p.rect(0, 34, W, 6, (110, 78, 54))
    p.hline(0, W - 1, 34, (150, 110, 76))
    # the cradle on its rockers, the baby asleep
    c = Pix()
    wood, wood_d = (170, 116, 70), (126, 82, 46)
    c.poly([(33, 25), (55, 25), (53, 32), (35, 32)], wood)
    c.hline(33, 55, 25, light(wood, 0.3))
    c.ring(44, 27, 12, wood_d, 30, 150)
    c.rect(52, 18, 4, 8, wood)  # the hood end
    c.disc(40, 24, 2.2, SKIN)
    c.set(39, 24, SKIN_D)
    c.set(41, 24, SKIN_D)
    c.ell(46, 24, 5, 1.6, (240, 236, 250))  # blanket
    p.paste(c)
    m = Pix()
    dress, dress_d, shawl = (70, 110, 170), (48, 78, 130), (220, 120, 90)
    cx = 20
    m.poly([(cx - 5, 18), (cx + 4, 18), (cx + 8, 34), (cx - 8, 34)], dress)
    m.poly([(cx + 1, 18), (cx + 4, 18), (cx + 8, 34), (cx + 2, 34)], dress_d)
    m.rect(cx - 9, 26, 5, 8, (110, 70, 40))  # her chair
    m.poly([(cx - 5, 16), (cx + 5, 16), (cx + 3, 23), (cx - 4, 23)], shawl)
    face(m, cx, 12, SKIN, r=3, look=1, mouth=SKIN_B)
    m.hline(cx - 1, cx, 12, SKIN_D)  # eyes lowered, gentle
    m.set(cx + 2, 12, SKIN_D)
    m.poly([(cx - 4, 12), (cx - 3, 8), (cx + 2, 7), (cx + 4, 10), (cx - 1, 9), (cx - 3, 15)], (90, 56, 40))
    # her hand on the cradle
    m.thick(cx + 4, 20, cx + 13, 24, shawl, 2)
    m.set(cx + 14, 25, SKIN)
    p.paste(m)
    # the candle
    p.rect(6, 28, 2, 6, CREAM)
    p.set(6, 27, GOLD)
    p.set(6, 26, WHITE)
    return p


def g22():
    """THE TITAN: a titan kneels under the vault of heaven, holding it up (Keller: the most powerful fugue, heavy and troubled; Bodky: the most majestic)."""
    k = Key("bb")
    p = Pix()
    sky(p, k, lift=-0.02)
    stars(p, [(4, 30), (8, 22), (58, 26), (60, 34), (2, 14), (62, 16)])
    rock = k.c(-0.08, -0.15, 20)
    p.poly([(0, 40), (0, 35), (14, 32), (50, 32), (64, 35), (64, 40)], rock)
    p.line(14, 32, 50, 32, light(rock, 0.2))
    t = Pix()
    # the sphere of heaven on his shoulders, its stars and bands
    gx, gy, r = 32, 11, 11
    t.disc(gx, gy, r, (40, 50, 110))
    t.disc(gx - 3, gy - 3, r * 0.55, (60, 74, 150))
    t.ring(gx, gy, r - 1, (200, 170, 80), 180, 360)
    t.ell(gx, gy + 1, r, 3, None) if False else None
    for x in range(int(gx - r + 1), int(gx + r)):
        yy = gy + 2 + 3 * math.sin((x - gx) / r * 1.5)
        t.set(x, yy, GOLD)
    for x, y in ((gx - 5, gy - 5), (gx + 4, gy - 6), (gx + 6, gy + 1), (gx - 7, gy + 3), (gx, gy - 2), (gx + 2, gy + 6)):
        t.set(x, y, WHITE)
    skin, skin_d = (210, 150, 104), (160, 104, 70)
    # the titan, kneeling, back bent, arms up under the sphere
    t.poly([(gx - 7, 22), (gx + 6, 22), (gx + 7, 30), (gx - 7, 30)], skin)
    t.poly([(gx + 1, 22), (gx + 6, 22), (gx + 7, 30), (gx + 2, 30)], skin_d)
    t.hline(gx - 4, gx - 1, 25, skin_d)  # muscles
    t.hline(gx + 1, gx + 3, 25, dark(skin_d, 0.2))
    t.rect(gx - 7, 29, 15, 3, (120, 60, 50))  # the loincloth
    t.thick(gx - 7, 23, gx - 11, 13, skin, 2)  # arms up to the sphere
    t.thick(gx + 6, 23, gx + 10, 13, skin_d, 2)
    face(t, gx, 21, skin, r=2.6, look=0)
    t.hline(gx - 1, gx + 1, 20, INK)  # brow knotted
    t.hline(gx - 2, gx + 2, 23, (90, 60, 50))  # beard
    t.thick(gx - 6, 32, gx - 12, 33, skin, 2)  # one knee down
    t.thick(gx + 4, 32, gx + 9, 28, skin_d, 2)
    t.thick(gx + 9, 28, gx + 10, 33, skin_d, 2)
    p.paste(t)
    for x, y in ((18, 7), (46, 7), (19, 15), (45, 15)):
        p.set(x, y, light(k.c(0.2), 0.5))
    return p


def g23():
    """THE FERRYMAN: a ferryman poles his boat across a still river at dusk, a lantern at the prow (quietly flowing, singing; gentle euphony)."""
    k = Key("B")
    p = Pix()
    sky(p, k, 0, 24, lift=0.12, warm=0.5)
    p.disc(48, 20, 5, (255, 220, 160))
    far = k.c(-0.08, -0.15, 10)
    p.poly([(0, 24), (0, 19), (10, 17), (22, 20), (34, 18), (40, 22), (64, 20), (64, 24)], far)
    water, water_l = k.c(-0.02, 0.0, 200), k.c(0.14, 0.0, 200)
    p.rect(0, 24, W, 16, water)
    for y in range(26, H, 2):
        for x in range((y * 7) % 10, W, 12):
            p.hline(x, x + 4, y, water_l)
    p.vline(48, 25, 34, (255, 220, 160))  # the sun's path on the water
    p.vline(47, 27, 31, (255, 200, 140))
    b = Pix()
    hull, hull_d = (120, 76, 46), (84, 52, 32)
    b.poly([(6, 29), (50, 29), (46, 34), (12, 34)], hull)
    b.hline(6, 50, 29, light(hull, 0.3))
    b.poly([(12, 32), (46, 32), (46, 34), (12, 34)], hull_d)
    b.vline(48, 22, 29, INK)  # the lantern post at the prow
    b.rect(47, 22, 3, 3, GOLD)
    b.set(48, 23, WHITE)
    fm = Pix()
    coat, coat_d = (70, 80, 120), (48, 54, 86)
    cx = 22
    fm.poly([(cx - 4, 16), (cx + 3, 16), (cx + 5, 29), (cx - 5, 29)], coat)
    fm.poly([(cx, 16), (cx + 3, 16), (cx + 5, 29), (cx + 1, 29)], coat_d)
    face(fm, cx, 12, SKIN, r=3, look=1)
    fm.hline(cx - 5, cx + 5, 9, (200, 170, 100))  # a straw hat, wide
    fm.poly([(cx - 3, 9), (cx, 5), (cx + 3, 9)], (200, 170, 100))
    fm.hline(cx - 1, cx + 2, 15, (140, 130, 120))
    # the long pole, both hands on it, leaning into it
    fm.line(cx - 6, 2, cx + 6, 40, BROWN)
    fm.thick(cx + 2, 18, cx - 2, 15, coat, 2)
    fm.set(cx - 3, 14, SKIN)
    fm.thick(cx + 3, 21, cx + 2, 23, coat_d, 2)
    fm.set(cx + 2, 24, SKIN)
    p.paste(b)
    p.paste(fm)
    p.glow(48, 23, 4, mix(k.c(0.1), GOLD, 0.5), inner=0.0)
    p.rect(47, 22, 3, 3, GOLD)
    p.set(48, 23, WHITE)
    p.ell(28, 35, 22, 1, dark(water, 0.15))
    return p


def g24():
    """THE FIDDLER: a fiddler plays the last tune under the lanterns as the feast ends (a passepied; Bodky's unassuming 'Ausklang' for the whole collection)."""
    k = Key("b")
    p = Pix()
    sky(p, k, lift=0.02)
    moon(p, 52, 26, 4, (240, 220, 190), k.c(0.06))
    stars(p, [(30, 4), (40, 9), (56, 6), (8, 30)])
    # a string of lanterns across the top
    for x in range(0, W):
        y = 4 + 3 * math.sin(x / W * math.pi)
        p.set(x, y, (60, 50, 50))
    for i, x in enumerate(range(4, W, 9)):
        y = 4 + 3 * math.sin(x / W * math.pi)
        c = [(250, 90, 70), (250, 200, 80), (110, 200, 250), (130, 220, 120)][i % 4]
        p.glow(x, y + 3, 3, mix(k.c(0.0), c, 0.4), inner=0.0)
        p.rect(x - 1, y + 1, 3, 4, c)
        p.set(x, y + 2, light(c, 0.6))
    # the tavern table: an empty mug, a candle burnt low
    p.rect(0, 34, W, 6, (100, 66, 44))
    p.hline(0, W - 1, 34, (140, 100, 66))
    p.rect(44, 30, 4, 4, (180, 180, 190))
    p.vline(48, 31, 32, (180, 180, 190))
    p.rect(54, 32, 2, 2, CREAM)
    p.set(54, 31, GOLD)
    f = Pix()
    vest, vest_d = (60, 120, 70), (40, 84, 50)
    cx = 22
    f.rect(cx - 4, 16, 9, 12, WHITE)
    f.rect(cx - 4, 16, 3, 12, vest)
    f.rect(cx + 2, 16, 3, 12, vest_d)
    f.rect(cx - 4, 28, 9, 3, (110, 80, 60))
    f.thick(cx - 2, 31, cx - 3, 37, (110, 80, 60), 2)
    f.thick(cx + 2, 31, cx + 7, 33, (110, 80, 60), 2)  # one leg kicked up, dancing
    f.hline(cx - 5, cx - 2, 37, INK)
    f.set(cx + 8, 32, INK)
    f.set(cx + 8, 33, INK)
    face(f, cx - 1, 11, SKIN, r=3, look=-1, mouth=RED_D, cheek=True)
    f.hline(cx - 1, cx, 11, SKIN_D)  # eyes closed, lost in the tune
    f.set(cx - 3, 11, SKIN_D)
    f.hline(cx - 4, cx + 2, 8, (150, 80, 40))
    f.vline(cx + 2, 8, 12, (150, 80, 40))
    # the fiddle under the chin, the bow arm out
    f.poly([(cx - 9, 13), (cx - 4, 14), (cx - 4, 17), (cx - 9, 17)], (180, 90, 40))
    f.line(cx - 9, 15, cx - 15, 13, (110, 60, 30))
    f.thick(cx - 4, 18, cx - 13, 14, vest, 1)
    f.set(cx - 14, 13, SKIN)
    f.thick(cx + 4, 18, cx + 9, 15, vest_d, 2)
    f.line(cx + 9, 14, cx - 9, 19, (220, 210, 190))  # the bow across the strings
    p.paste(f)
    notes_trail(p, [(6, 16), (10, 12), (34, 12)], CREAM)
    return p


PICTURES = {f"wtc2f{n:02d}": globals()[f"g{n:02d}"] for n in range(1, 25)}

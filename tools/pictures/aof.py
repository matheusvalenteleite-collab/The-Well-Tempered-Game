"""The Art of Fugue's 20 pictures (D664, design studio; the owner approved the cards and the Lamplighter cycle).

All in D minor, so each picture turns the key's hue a little its own way (k.c's third argument) and finds its
character in the music: the Lamplighter is the subject (Contrapunctus 1), and every other picture shows her
town transformed as Bach transforms the subject. The owner's standing rule kept: gender variety, no masculine
as the default.
"""
from lib import *  # noqa: F401,F403
from people import TONES, HAIR, head, body, arm  # noqa: F401


def lamp(p, x, y, lit=True, bg=None):
    """A street lamp: post, head; lit, its glow and pool."""
    p.vline(x, y, y + 14, (40, 36, 44))
    p.rect(x - 2, y - 3, 5, 4, (40, 36, 44))
    if lit:
        p.glow(x, y - 1, 7, mix(bg or (60, 50, 80), FIRE_L, 0.55), inner=0.3)
        p.rect(x - 1, y - 2, 3, 2, FIRE_L)


def a01():
    """THE LAMPLIGHTER: a woman on a ladder lighting a street lamp at dusk, her pole raised."""
    k = Key("d")
    p = Pix()
    sky(p, k, 0, 30, lift=0.06, warm=0.6)
    for x, h in ((2, 10), (12, 14), (24, 8), (46, 12), (56, 16)):
        p.rect(x, 30 - h, 9, h, k.c(-0.12, -0.1))
        p.set(x + 3, 30 - h + 4, GOLD)
    p.poly([(34, 6), (36, 0), (38, 6)], k.c(-0.14, -0.1))
    p.rect(34, 6, 5, 24, k.c(-0.14, -0.1))
    ground(p, k, 30, c=(70, 62, 70))
    lamp(p, 8, 14, lit=True)
    lamp(p, 48, 12, lit=True, bg=k.c(0.04))
    s = Pix()
    for y in range(18, 31, 3):
        s.hline(24, 28, y, BROWN)
    s.vline(24, 16, 30, BROWN_D)
    s.vline(28, 16, 30, BROWN_D)
    head(s, 26, 10, 2, "auburn", "bun", r=3, look=1)
    body(s, 26, 13, 24, "dress", (60, 90, 140))
    arm(s, 28, 15, 40, 9, (60, 90, 140))
    s.line(38, 11, 46, 6, (90, 70, 50))
    p.paste(s)
    p.set(46, 6, FIRE_L)
    return p


def a02():
    """THE DRUMMER: a boy drummer mid-stride in a red coat, sticks raised, a flag behind."""
    k = Key("d")
    p = Pix()
    sky(p, k, 0, 30, lift=0.18, warm=0.2)
    p.rect(44, 4, 10, 26, k.c(-0.02, -0.1))
    p.disc(49, 10, 3, CREAM)
    p.set(49, 10, INK)
    p.set(50, 9, INK)
    ground(p, k, 30, c=(150, 130, 100))
    p.vline(12, 4, 30, (90, 70, 50))
    p.poly([(13, 4), (24, 6), (13, 10)], (60, 90, 170))
    p.poly([(13, 6), (24, 6), (13, 8)], CREAM)
    s = Pix()
    head(s, 30, 9, 1, "brown", "short", r=3, look=1)
    s.rect(27, 6, 7, 2, (30, 30, 60))
    body(s, 30, 12, 31, "trousers", RED, legs=(40, 40, 60))
    s.ell(30, 23, 5, 3, (230, 220, 200))
    s.hline(25, 35, 21, GOLD)
    s.hline(25, 35, 25, GOLD)
    s.line(27, 14, 22, 8, (200, 160, 90))
    s.line(33, 14, 38, 9, (200, 160, 90))
    p.paste(s)
    return p


def a03():
    """THE LAKE: a town upside down in still water, the real town a thin line at the top."""
    k = Key("d")
    p = Pix()
    sky(p, k, 0, 12, lift=0.02, warm=0.3)
    roofs = [(4, 6), (12, 9), (22, 5), (30, 11), (40, 7), (50, 9), (58, 6)]
    for x, h in roofs:
        p.rect(x, 12 - h, 7, h, k.c(-0.16, -0.1))
        p.set(x + 3, 12 - h + 2, GOLD)
    p.rect(0, 12, W, 28, k.c(-0.08, -0.05, -10))
    for x, h in roofs:
        p.rect(x, 13, 7, h + 3, k.c(-0.02, -0.1, -10))
        p.set(x + 3, 13 + h, light(GOLD, 0.2))
        p.set(x + 3, 13 + h + 1, GOLD_D)
    for y in range(16, 40, 3):
        for x in range((y * 7) % 9, W, 9):
            p.hline(x, x + 2, y, k.c(0.04, -0.05, -10))
    p.disc(32, 30, 3, CREAM)
    p.vline(32, 33, 39, light(k.c(-0.08), 0.35))
    for x in (1, 3, 60, 62):
        p.vline(x, 30, 39, (40, 60, 40))
    return p


def a04():
    """THE ACROBAT: a trapeze artist hanging upside down by her knees under a striped big top."""
    k = Key("d")
    p = Pix()
    for x in range(0, W, 8):
        p.poly([(32, 0), (x, 40), (x + 4, 40)], RED_D)
        p.poly([(32, 0), (x + 4, 40), (x + 8, 40)], (230, 214, 190))
    p.glow(32, 22, 18, mix(RED_D, FIRE_L, 0.4), inner=0.4)
    p.line(20, 0, 22, 12, STEEL)
    p.line(44, 0, 42, 12, STEEL)
    p.hline(22, 42, 12, GOLD)
    s = Pix()
    s.rect(30, 12, 4, 3, (200, 60, 120))
    s.rect(30, 15, 4, 8, (200, 60, 120))
    arm(s, 31, 22, 27, 28, TONES[3][0], hand=TONES[3][0])
    arm(s, 33, 22, 37, 28, TONES[3][0], hand=TONES[3][0])
    head(s, 32, 26, 3, "black", "long", r=3, look=0)
    p.paste(s)
    twinkle(p, 8, 6, GOLD)
    twinkle(p, 56, 8, GOLD)
    return p


def a05():
    """THE DANCERS: two dancers facing in a mirror pose, one arm up, the other's down."""
    k = Key("d")
    p = Pix()
    sky(p, k, 0, 30, lift=0.0, warm=0.4)
    for x in range(4, W, 10):
        p.glow(x, 6 + (x % 3), 3, mix(k.c(0.0), GOLD, 0.6), inner=0.3)
        p.set(x, 6 + (x % 3), FIRE_L)
    p.hline(0, W - 1, 4, k.c(-0.1))
    ground(p, k, 32, c=(110, 80, 60), tex=False)
    s = Pix()
    head(s, 24, 9, 0, "blonde", "bun", r=3, look=1)
    body(s, 24, 12, 32, "dress", (200, 90, 140))
    arm(s, 26, 14, 30, 6, (200, 90, 140), hand=TONES[0][0])
    arm(s, 22, 15, 19, 22, (200, 90, 140), hand=TONES[0][0])
    head(s, 40, 9, 4, "black", "crop", r=3, look=-1)
    body(s, 40, 12, 32, "trousers", (40, 40, 70))
    arm(s, 38, 15, 34, 22, (40, 40, 70), hand=TONES[4][0])
    arm(s, 42, 14, 45, 6, (40, 40, 70), hand=TONES[4][0])
    p.paste(s)
    return p


def a06():
    """THE SUN KING: a king in a gold sun mask and plumes, one foot pointed, mid-ballet."""
    k = Key("d")
    p = Pix()
    p.rect(0, 0, W, H, k.c(-0.06, 0.0, 30))
    for x in (6, 58):
        p.rect(x - 3, 2, 7, 28, mix(k.c(0.0, 0, 30), STEEL, 0.4))
        p.vline(x - 3, 2, 29, GOLD)
    p.glow(32, 14, 20, mix(k.c(0.0, 0, 30), GOLD, 0.5), inner=0.4)
    ground(p, k, 32, c=(120, 90, 50), tex=False)
    s = Pix()
    for i in range(10):
        a = math.pi * i / 9
        s.line(32, 9, 32 + math.cos(a) * 9, 9 - math.sin(a) * 9, GOLD)
    s.disc(32, 9, 4, GOLD)
    s.set(31, 9, INK)
    s.set(33, 9, INK)
    robe(s, 32, 13, 24, 3, 7, GOLD_D, dark(GOLD_D, 0.25))
    s.line(30, 25, 27, 32, (240, 240, 240))
    s.line(34, 25, 39, 30, (240, 240, 240))
    arm(s, 29, 15, 22, 12, GOLD_D, hand=TONES[1][0])
    arm(s, 35, 15, 41, 18, GOLD_D, hand=TONES[1][0])
    p.paste(s)
    return p


def a07():
    """THE GIANT: a giant, a man and a mouse walking the same road in the same pose, one behind the other."""
    k = Key("d")
    p = Pix()
    sky(p, k, 0, 26, lift=0.16, warm=0.2)
    p.poly([(0, 26), (20, 20), (44, 24), (64, 18), (64, 26)], k.c(-0.04, -0.1, 60))
    ground(p, k, 26, c=(140, 150, 90))
    p.poly([(30, 26), (34, 26), (60, 40), (4, 40)], (180, 160, 120))
    s = Pix()
    head(s, 14, 6, 2, "grey", "beard", r=4, look=1)
    body(s, 14, 10, 36, "robe", (90, 110, 160), w=6)
    arm(s, 18, 13, 22, 22, (90, 110, 160), hand=TONES[2][0])
    head(s, 36, 21, 1, "brown", "short", r=2, look=1)
    body(s, 36, 23, 33, "trousers", (150, 70, 60), w=3)
    s.ell(52, 34, 3, 1.5, (130, 120, 120))
    s.disc(55, 33, 1.2, (130, 120, 120))
    s.set(56, 32, INK)
    s.line(49, 34, 46, 33, (130, 120, 120))
    p.paste(s)
    return p


def a08():
    """THE THREE RIVERS: three streams from three valleys meeting in one river under a stone bridge."""
    k = Key("d")
    p = Pix()
    p.rect(0, 0, W, H, k.c(-0.02, -0.05, 80))
    for cx in (8, 32, 56):
        p.poly([(cx - 12, 0), (cx, 14), (cx + 12, 0)], k.c(-0.12, -0.05, 80))
    water = (90, 150, 210)
    for x0 in (8, 32, 56):
        p.thick(x0, 0, 32, 26, water, 2)
    p.thick(32, 26, 32, 40, water, 4)
    p.ring(32, 32, 8, (150, 140, 130), 180, 360)
    p.rect(22, 24, 21, 3, (150, 140, 130))
    for y in range(4, 24, 5):
        for x0 in (8, 32, 56):
            xx = x0 + (32 - x0) * y / 26
            p.set(xx, y, light(water, 0.5))
    return p


def a09():
    """THE HARE AND THE TORTOISE: a hare leaping past a tortoise on a country road, the finish post ahead."""
    k = Key("d")
    p = Pix()
    sky(p, k, 0, 26, lift=0.2, warm=0.3)
    p.poly([(0, 26), (16, 18), (34, 24), (52, 16), (64, 22), (64, 26)], k.c(-0.04, -0.1, 70))
    ground(p, k, 26, c=(150, 160, 90))
    p.rect(0, 30, W, 4, (190, 170, 130))
    p.vline(58, 18, 30, CREAM)
    p.rect(58, 18, 5, 3, RED)
    s = Pix()
    s.ell(36, 22, 6, 3, (190, 160, 120))
    s.disc(43, 19, 2.5, (190, 160, 120))
    s.vline(43, 13, 17, (190, 160, 120))
    s.vline(45, 13, 17, (170, 140, 100))
    s.set(44, 19, INK)
    s.line(32, 24, 28, 28, (170, 140, 100))
    s.line(40, 24, 44, 27, (170, 140, 100))
    s.ell(16, 30, 6, 3, (90, 120, 60))
    s.ell(16, 29, 5, 2, (120, 150, 80))
    s.disc(23, 30, 1.6, (140, 160, 100))
    s.set(23, 29, INK)
    p.paste(s)
    return p


def a10():
    """THE BRIDGE: two halves of a stone bridge reaching toward each other over a river, a builder on each side."""
    k = Key("d")
    p = Pix()
    sky(p, k, 0, 28, lift=0.1, warm=0.5)
    p.rect(0, 14, 10, 26, k.c(-0.12, -0.1, 40))
    p.rect(54, 14, 10, 26, k.c(-0.12, -0.1, 40))
    p.rect(10, 30, 44, 10, (70, 110, 160))
    stone = (170, 160, 140)
    for side in (-1, 1):
        x0 = 10 if side < 0 else 54
        for i in range(8):
            x = x0 - side * i * 2.4
            p.rect(min(x, x - side * 2), 14 + i * 0.6, 3, 4, stone)
    p.rect(30, 12, 4, 3, GOLD_D)
    s = Pix()
    head(s, 6, 9, 3, "black", "braid", r=2, look=1)
    body(s, 6, 11, 14, "trousers", (200, 120, 50), w=2)
    head(s, 58, 9, 1, "red", "short", r=2, look=-1)
    body(s, 58, 11, 14, "trousers", (60, 110, 160), w=2)
    p.paste(s)
    return p


def a11():
    """THE WEAVERS: three women at a great loom, three coloured threads crossing."""
    k = Key("d")
    p = Pix()
    p.rect(0, 0, W, H, k.c(-0.04, -0.1, -40))
    p.rect(16, 4, 32, 26, (110, 80, 50))
    p.rect(18, 6, 28, 22, (230, 220, 200))
    for x in range(18, 46, 2):
        p.vline(x, 6, 27, (210, 200, 180))
    for i, c in enumerate((RED, BLUE, GOLD)):
        for y in range(8 + i * 2, 28, 6):
            p.hline(18, 45, y, c)
    s = Pix()
    for cx, tone, hair, style, gown in ((8, 0, "blonde", "braid", (120, 60, 120)), (32, 3, "black", "bun", (60, 110, 90)), (56, 2, "red", "long", (160, 90, 50))):
        head(s, cx, 26, tone, hair, style, r=3, look=0)
        body(s, cx, 29, 40, "dress", gown)
    p.paste(s)
    return p


def a12(night=False):
    """THE DAY / THE NIGHT: a farmhouse and its tree at noon; the same, mirrored top to bottom, under stars."""
    k = Key("d")
    p = Pix()
    if not night:
        p.vgrad(0, 0, W, 28, [(120, 170, 230), (170, 210, 240), (200, 230, 240)])
        p.disc(48, 6, 4, (255, 244, 190))
        ground(p, k, 28, c=(130, 170, 70))
        house, roof, win, leaf = (230, 210, 170), RED_D, (60, 70, 90), GREEN
    else:
        p.vgrad(0, 0, W, 28, [(14, 16, 40), (24, 26, 60), (36, 36, 80)])
        stars(p, [(5, 3), (14, 9), (23, 2), (40, 6), (52, 11), (60, 4), (33, 13)])
        ground(p, k, 28, c=(40, 50, 40))
        house, roof, win, leaf = (90, 84, 90), (70, 30, 40), FIRE_L, GREEN_D
    p.rect(20, 16, 16, 12, house)
    p.poly([(18, 16), (28, 8), (38, 16)], roof)
    p.rect(24, 20, 3, 3, win)
    p.rect(30, 20, 3, 3, win)
    p.rect(46, 18, 2, 10, BROWN)
    p.disc(47, 15, 5, leaf)
    if night:
        p.im = p.im.transpose(Image.FLIP_TOP_BOTTOM)
    return p


def a13(turned=False):
    """THE HOURGLASS / TURNED: an hourglass on a watchmaker's desk, the sand running; then turned over."""
    k = Key("d")
    p = Pix()
    p.rect(0, 0, W, H, k.c(-0.08, -0.1, 20 if not turned else -20))
    p.disc(52, 10, 7, (220, 210, 190))
    p.ring(52, 10, 7, GOLD_D)
    p.line(52, 10, 52, 5, INK)
    p.line(52, 10, 56, 10, INK)
    p.rect(0, 32, W, 8, (110, 76, 50))
    p.hline(0, W - 1, 32, (150, 110, 70))
    p.rect(20, 4, 20, 3, BROWN_D)
    p.rect(20, 29, 20, 3, BROWN_D)
    p.vline(21, 7, 28, BROWN)
    p.vline(38, 7, 28, BROWN)
    glass = (200, 220, 230)
    p.poly([(23, 7), (37, 7), (31, 18), (29, 18)], glass)
    p.poly([(29, 18), (31, 18), (37, 29), (23, 29)], glass)
    sand = (230, 190, 110)
    if not turned:
        p.poly([(26, 11), (34, 11), (31, 17), (29, 17)], sand)
        p.poly([(26, 29), (34, 29), (30, 25)], sand)
        p.vline(30, 18, 26, sand)
    else:
        p.poly([(24, 8), (36, 8), (31, 17), (29, 17)], sand)
        p.vline(30, 18, 28, sand)
    p.set(8, 30, GOLD)
    p.disc(10, 28, 2, STEEL)
    return p


def c14():
    """THE KITE: a child flying a kite on a hill; the kite's shadow on the grass, larger and the other way."""
    k = Key("d")
    p = Pix()
    sky(p, k, 0, 24, lift=0.2, warm=0.1)
    ground(p, k, 24, c=(110, 160, 80))
    p.poly([(44, 4), (50, 9), (44, 16), (38, 9)], RED)
    p.line(44, 4, 44, 16, GOLD)
    p.line(38, 9, 50, 9, GOLD)
    p.line(44, 16, 40, 20, CREAM)
    p.line(44, 16, 20, 26, (220, 220, 220))
    sh = dark((110, 160, 80), 0.35)
    p.poly([(36, 40), (46, 33), (36, 26), (26, 33)], sh)
    s = Pix()
    head(s, 16, 23, 4, "black", "curls", r=2.5, look=1)
    body(s, 16, 26, 36, "dress", (240, 200, 60))
    arm(s, 18, 28, 21, 26, (240, 200, 60), hand=TONES[4][0])
    p.paste(s)
    return p


def c15():
    """THE ECHO: a hiker calling across a mountain gorge, her voice in rings returning from the far wall."""
    k = Key("d")
    p = Pix()
    sky(p, k, 0, 40, lift=0.12, warm=0.1)
    p.poly([(40, 40), (46, 6), (54, 14), (60, 2), (64, 8), (64, 40)], k.c(-0.12, -0.1, 30))
    p.poly([(0, 40), (0, 24), (14, 22), (22, 30), (22, 40)], k.c(-0.06, -0.1, 30))
    for r in (4, 8, 12):
        p.ring(24, 16, r, CREAM, 300, 420)
    for r in (3, 6):
        p.ring(42, 16, r, light(k.c(0.12), 0.3), 120, 240)
    s = Pix()
    head(s, 14, 15, 1, "brown", "ponytail", r=2.5, look=1)
    body(s, 14, 18, 24, "trousers", (200, 70, 60), w=3)
    arm(s, 16, 19, 18, 15, (200, 70, 60), hand=TONES[1][0])
    p.paste(s)
    return p


def c16():
    """THE TWO SWALLOWS: two swallows flying in parallel over the rooftops, one a little behind and below."""
    k = Key("d")
    p = Pix()
    sky(p, k, 0, 40, lift=0.08, warm=0.6)
    for x, h in ((0, 8), (10, 12), (22, 6), (30, 14), (44, 9), (54, 11)):
        p.rect(x, 40 - h, 10, h, k.c(-0.16, -0.1))
    p.rect(36, 18, 4, 22, k.c(-0.16, -0.1))
    p.poly([(36, 18), (38, 12), (40, 18)], k.c(-0.16, -0.1))

    def swallow(s, x, y):
        s.ell(x, y, 3, 1.4, (30, 30, 50))
        s.line(x - 3, y, x - 6, y - 1, (30, 30, 50))
        s.line(x - 3, y, x - 6, y + 2, (30, 30, 50))
        s.line(x, y, x - 2, y - 5, (30, 30, 50))
        s.line(x + 1, y, x + 3, y - 4, (30, 30, 50))
        s.set(x + 3, y, (220, 80, 60))
        s.set(x, y + 1, CREAM)

    s = Pix()
    swallow(s, 34, 10)
    swallow(s, 24, 17)
    p.paste(s, outline=None)
    return p


def c17():
    """THE FOOTPRINTS: two sets of footprints in snow, one following the other up a hill to a chapel."""
    k = Key("d")
    p = Pix()
    sky(p, k, 0, 22, lift=0.16, warm=0.5)
    p.poly([(0, 40), (0, 30), (40, 14), (64, 18), (64, 40)], (236, 238, 246))
    p.rect(42, 8, 8, 7, (180, 170, 170))
    p.poly([(41, 8), (46, 3), (51, 8)], RED_D)
    p.set(46, 11, FIRE_L)
    for i in range(7):
        x = 6 + i * 5
        y = 36 - i * 2.6
        p.set(x, y, (150, 160, 190))
        p.set(x + 2, y - 1, (150, 160, 190))
    for x in (8, 18, 56):
        p.poly([(x - 3, 30 - (x // 10)), (x, 22 - (x // 10)), (x + 3, 30 - (x // 10))], GREEN_D)
    s = Pix()
    head(s, 40, 10, 2, "grey", "hood", r=2.5, look=1)
    body(s, 40, 13, 18, "robe", (60, 70, 110), w=2)
    p.paste(s)
    return p


def a14():
    """THE LAST CANDLE: an old composer's desk at night, one candle, the quill stopped mid-line on the page."""
    k = Key("d")
    p = Pix()
    p.rect(0, 0, W, H, k.c(-0.18, -0.1))
    p.rect(42, 3, 16, 18, (20, 24, 50))
    stars(p, [(45, 6), (52, 9), (55, 5), (48, 14)])
    p.vline(50, 3, 20, (60, 46, 40))
    p.glow(14, 16, 14, mix(k.c(-0.18), FIRE_L, 0.45), inner=0.35)
    p.rect(0, 26, W, 14, (90, 60, 40))
    p.hline(0, W - 1, 26, (130, 90, 60))
    p.rect(13, 18, 3, 8, CREAM)
    p.set(14, 16, FIRE)
    p.set(14, 15, FIRE_L)
    p.rect(22, 23, 26, 3, (240, 232, 210))
    for y in (24, 25):
        p.hline(24, 40, y, (140, 130, 120))
    for x in range(24, 41, 3):
        p.set(x, 24, INK)
    p.line(41, 24, 47, 16, (230, 230, 220))
    p.line(42, 24, 46, 18, (200, 200, 190))
    return p


PICTURES = {f"bwv1080-{n:02d}": globals()[f"a{n:02d}"] for n in range(1, 12)}
PICTURES.update({
    "bwv1080-12r": lambda: a12(False),
    "bwv1080-12i": lambda: a12(True),
    "bwv1080-13r": lambda: a13(False),
    "bwv1080-13i": lambda: a13(True),
    "bwv1080-c14": c14,
    "bwv1080-c15": c15,
    "bwv1080-c16": c16,
    "bwv1080-c17": c17,
    "bwv1080-14": a14,
})

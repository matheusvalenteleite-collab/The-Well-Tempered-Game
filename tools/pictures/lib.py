"""The 48 fugue pictures (D383): drawing helpers.

Every picture is 64 x 40 pixels, drawn here with code (PIL), one character big in the frame on a ground
in the key's own hue (emblem.ts keyHue: C 220, each fifth 30 on; a minor key darker), lit from the top
left, the character outlined in one dark ink so it reads at tile size. build.py renders them all, cuts
each colour to 4 bits a channel (#rgb, as the old emblems) and writes src/bench/pictures-data.ts.
"""
import colorsys
import math
from PIL import Image, ImageDraw

W, H = 64, 40

INK = (24, 18, 32)
CREAM = (250, 236, 200)
WHITE = (246, 244, 236)
SKIN = (236, 186, 140)
SKIN_D = (196, 136, 98)
SKIN_B = (150, 96, 64)
GOLD = (250, 204, 72)
GOLD_D = (196, 134, 40)
RED = (214, 64, 52)
RED_D = (150, 38, 40)
BROWN = (124, 80, 50)
BROWN_D = (86, 54, 36)
GREY = (150, 150, 164)
GREY_D = (96, 96, 112)
GREEN = (84, 150, 72)
GREEN_D = (48, 98, 52)
BLUE = (84, 132, 210)
BLUE_D = (52, 82, 150)
PURPLE = (126, 82, 170)
PURPLE_D = (84, 52, 120)
STEEL = (178, 188, 204)
FIRE = (255, 140, 50)
FIRE_L = (255, 226, 130)


def hls(h, l, s):
    r, g, b = colorsys.hls_to_rgb((h % 360) / 360, max(0, min(1, l)), max(0, min(1, s)))
    return (int(r * 255), int(g * 255), int(b * 255))


def mix(a, b, k):
    return tuple(int(round(a[i] * (1 - k) + b[i] * k)) for i in range(3))


def dark(c, k=0.35):
    return mix(c, (10, 6, 18), k)


def light(c, k=0.35):
    return mix(c, (255, 250, 236), k)


PCS = {"c": 0, "d": 2, "e": 4, "f": 5, "g": 7, "a": 9, "b": 11}


def key_hue(key):
    """emblem.ts keyHue: the circle of fifths round the hue wheel."""
    pc = PCS[key[0].lower()]
    if len(key) > 1 and key[1] == "#":
        pc += 1
    if len(key) > 1 and key[1] == "b":
        pc -= 1
    pc %= 12
    return (220 + ((pc * 7) % 12) * 30) % 360


class Key:
    """A key's colours: its hue, darker for minor."""

    def __init__(self, key):
        self.key = key
        self.minor = key[0].islower()
        self.h = key_hue(key)
        m = self.minor
        self.s = 0.42 if m else 0.38
        self.base = 0.16 if m else 0.26

    def c(self, dl=0.0, ds=0.0, dh=0):
        return hls(self.h + dh, self.base + dl, self.s + ds)


class Pix:
    """An RGBA pixel canvas with the few strokes the pictures need."""

    def __init__(self, bg=None):
        self.im = Image.new("RGBA", (W, H), (0, 0, 0, 0) if bg is None else bg + (255,))
        self.px = self.im.load()
        self.d = ImageDraw.Draw(self.im)

    @staticmethod
    def _c(c):
        return c if len(c) == 4 else tuple(c) + (255,)

    def set(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H and c is not None:
            self.px[x, y] = self._c(c)

    def get(self, x, y):
        return self.px[x, y]

    def rect(self, x, y, w, h, c):
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)):
                self.set(xx, yy, c)

    def hline(self, x1, x2, y, c):
        for x in range(int(round(min(x1, x2))), int(round(max(x1, x2))) + 1):
            self.set(x, y, c)

    def vline(self, x, y1, y2, c):
        for y in range(int(round(min(y1, y2))), int(round(max(y1, y2))) + 1):
            self.set(x, y, c)

    def line(self, x0, y0, x1, y1, c):
        x0, y0, x1, y1 = int(round(x0)), int(round(y0)), int(round(x1)), int(round(y1))
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            self.set(x0, y0, c)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy

    def thick(self, x0, y0, x1, y1, c, w=2):
        """A line w pixels wide (a limb)."""
        for k in range(w):
            if abs(x1 - x0) >= abs(y1 - y0):
                self.line(x0, y0 + k, x1, y1 + k, c)
            else:
                self.line(x0 + k, y0, x1 + k, y1, c)

    def disc(self, cx, cy, r, c):
        for y in range(int(cy - r - 1), int(cy + r + 2)):
            for x in range(int(cx - r - 1), int(cx + r + 2)):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.3:
                    self.set(x, y, c)

    def ell(self, cx, cy, rx, ry, c):
        for y in range(int(cy - ry - 1), int(cy + ry + 2)):
            for x in range(int(cx - rx - 1), int(cx + rx + 2)):
                if ((x - cx) / max(rx, 0.5)) ** 2 + ((y - cy) / max(ry, 0.5)) ** 2 <= 1.0:
                    self.set(x, y, c)

    def ring(self, cx, cy, r, c, a0=0, a1=360):
        n = max(16, int(r * 10))
        for i in range(n + 1):
            a = math.radians(a0 + (a1 - a0) * i / n)
            self.set(cx + r * math.cos(a), cy + r * math.sin(a), c)

    def poly(self, pts, c):
        self.d.polygon([(x, y) for x, y in pts], fill=self._c(c))

    def vgrad(self, x, y, w, h, cols):
        """A banded vertical gradient, its seams dithered (2 x 2 Bayer)."""
        n = len(cols)
        for yy in range(int(y), int(y + h)):
            t = (yy - y) / max(1, h - 1) * (n - 1)
            i = min(n - 2, int(t))
            f = t - i
            for xx in range(int(x), int(x + w)):
                b = [[0, 2], [3, 1]][yy % 2][xx % 2] / 4 + 0.125
                self.set(xx, yy, cols[i + 1] if f > b else cols[i])

    def dither(self, x, y, w, h, c, phase=0):
        """Every other pixel of a rectangle (a half tone)."""
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)):
                if (xx + yy + phase) % 2 == 0:
                    self.set(xx, yy, c)

    def glow(self, cx, cy, r, c, inner=0.5):
        """A pool of light: solid inside r*inner, dithered out to r."""
        for y in range(int(cy - r - 1), int(cy + r + 2)):
            for x in range(int(cx - r - 1), int(cx + r + 2)):
                d = math.hypot(x - cx, y - cy)
                if d <= r * inner or (d <= r and (x + y) % 2 == 0):
                    self.set(x, y, c)

    def stamp(self, rows, ink, x, y, flip=False):
        for j, row in enumerate(rows):
            rr = row[::-1] if flip else row
            for i, ch in enumerate(rr):
                if ch in ink:
                    self.set(x + i, y + j, ink[ch])

    def paste(self, lay, outline=INK, shadow=None):
        """Lays a character layer over this one, a 1 px outline round it (and a drop shadow below-right)."""
        lp = lay.px
        if shadow:
            for y in range(H):
                for x in range(W):
                    if lp[x, y][3] and x + 1 < W and y + 1 < H and not lp[x + 1, y + 1][3]:
                        self.set(x + 1, y + 1, shadow)
        if outline:
            for y in range(H):
                for x in range(W):
                    if lp[x, y][3]:
                        continue
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        xx, yy = x + dx, y + dy
                        if 0 <= xx < W and 0 <= yy < H and lp[xx, yy][3]:
                            self.set(x, y, outline)
                            break
        self.im.alpha_composite(lay.im)
        return self

    def save(self, path, scale=1):
        im = self.im.convert("RGB")
        if scale != 1:
            im = im.resize((W * scale, H * scale), Image.NEAREST)
        im.save(path)


# ---------------------------------------------------------------- the shared parts


def face(p, cx, cy, skin=SKIN, eyes=INK, r=2.5, look=0, mouth=None, cheek=False):
    """A round face, two eye pixels (looking left or right by `look`), an optional mouth colour."""
    p.disc(cx, cy, r, skin)
    p.set(cx - 1 + look, cy - 0, eyes)
    p.set(cx + 1 + look, cy - 0, eyes)
    if mouth:
        p.set(cx + look, cy + 2 if r >= 2.5 else cy + 1, mouth)
    if cheek:
        p.set(cx - 2 + look, cy + 1, mix(skin, RED, 0.35))
        p.set(cx + 2 + look, cy + 1, mix(skin, RED, 0.35))


def robe(p, cx, top, bot, w0, w1, c, cd=None, lit=None):
    """A gown or cloak: a trapezoid from half-width w0 at the top to w1 at the foot, its right side in shade."""
    for y in range(int(top), int(bot) + 1):
        t = (y - top) / max(1, bot - top)
        half = w0 + (w1 - w0) * t
        p.hline(cx - half, cx + half, y, c)
        if cd:
            p.hline(cx + half * 0.35, cx + half, y, cd)
        if lit:
            p.set(cx - half, y, lit)


def stars(p, pts, c=CREAM):
    for x, y in pts:
        p.set(x, y, c)


def twinkle(p, x, y, c=CREAM, r=1):
    p.set(x, y, WHITE)
    for k in range(1, r + 1):
        for dx, dy in ((k, 0), (-k, 0), (0, k), (0, -k)):
            p.set(x + dx, y + dy, c)


def moon(p, x, y, r, c, bg):
    p.disc(x, y, r, c)
    p.disc(x + r * 0.6, y - r * 0.3, r * 0.85, bg)


def sky(p, k, y0=0, y1=H, lift=0.0, warm=0.0):
    """The key's sky: three bands of its hue, lighter toward the horizon (warmer by `warm`)."""
    cols = [k.c(lift - 0.04), k.c(lift + 0.03, 0.02, warm * 10), k.c(lift + 0.10, 0.05, warm * 25)]
    p.vgrad(0, y0, W, y1 - y0, cols)


def ground(p, k, y, c=None, cd=None, tex=True):
    c = c or k.c(-0.06, -0.1, 20)
    cd = cd or dark(c, 0.3)
    p.rect(0, y, W, H - y, c)
    p.hline(0, W - 1, y, light(c, 0.15))
    if tex:
        for yy in range(y + 2, H, 2):
            for xx in range((yy * 5) % 7, W, 7):
                p.set(xx, yy, cd)


def notes_trail(p, pts, c):
    """Small music notes (a head and a stem) at the points."""
    for x, y in pts:
        p.set(x, y, c)
        p.set(x + 1, y, c)
        p.vline(x + 1, y - 3, y, c)

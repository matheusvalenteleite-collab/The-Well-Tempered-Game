"""People for the pictures (the owner's 48, 31 Oct 2026): heads with hair, bodies, skin tones.

The owner's standing rule for every picture: "Don't make all pictures so manly, strive for gender
variety, don't use masculine as neutral or default." So a head is drawn with its own hair (long, bun,
braid, bob, ponytail, curls, short, cropped) and a body with its own clothes (a dress, a skirt, trousers,
a robe), on a range of skin tones; no style is the default.
"""
from lib import *  # noqa: F401,F403

# Skin tones, light to deep: (face, shade).
TONES = [
    ((244, 204, 168), (210, 160, 124)),
    ((236, 186, 140), (196, 136, 98)),
    ((206, 150, 104), (164, 108, 72)),
    ((160, 108, 72), (120, 76, 50)),
    ((116, 76, 52), (84, 52, 36)),
]

HAIR = {
    "blonde": (236, 196, 96),
    "red": (196, 84, 44),
    "brown": (120, 76, 44),
    "black": (40, 30, 34),
    "grey": (196, 196, 204),
    "white": (236, 234, 230),
    "auburn": (150, 60, 40),
}


def head(L, cx, cy, tone=1, hair="brown", style="short", r=3, look=0, mouth=True, eyes="open", cheek=True, flip=False):
    """A head: skin disc, two eyes (open, shut or a mask), a small mouth, hair in its style.

    style: long, bun, braid, bob, ponytail, curls, short, crop, bald, beard, hood (none drawn).
    flip puts a one-sided style (ponytail, braid) on the left.
    """
    sk, skd = TONES[tone]
    hc = HAIR.get(hair, hair) if isinstance(hair, str) else hair
    hd = dark(hc, 0.3)
    s = -1 if flip else 1
    # hair behind the head first
    if style == "long":
        L.rect(cx - r - 1, cy - 1, 2 * r + 3, r + 4, hc)
        L.vline(cx + r + 1, cy - 1, cy + r + 2, hd)
    elif style == "bob":
        L.rect(cx - r - 1, cy - 1, 2 * r + 3, r + 1, hc)
        L.vline(cx + r + 1, cy - 1, cy + r - 1, hd)
    elif style == "curls":
        for dx, dy in ((-r, -1), (r, -1), (-r - 1, 1), (r + 1, 1), (-r, 2), (r, 2), (0, -r - 1), (-2, -r), (2, -r)):
            L.disc(cx + dx, cy + dy, 1.6, hc)
    elif style == "ponytail":
        L.thick(cx - s * r, cy - 1, cx - s * (r + 3), cy + 3, hc, 2)
    elif style == "braid":
        for i in range(5):
            L.set(cx + s * (r), cy + 1 + i, hc if i % 2 == 0 else hd)
            L.set(cx + s * (r + 1), cy + 1 + i, hd if i % 2 == 0 else hc)
    elif style == "bun":
        L.disc(cx - s * 1, cy - r - 1, 1.8, hc)
    L.disc(cx, cy, r, sk)
    L.set(cx + r * 0.6, cy + r * 0.6, skd)
    L.set(cx + r * 0.75, cy + r * 0.2, skd)
    ey = cy
    if eyes == "open":
        e0, e1 = (-2, 1) if r >= 3.5 else (-1, 1)
        L.set(cx + e0 + look, ey, INK)
        L.set(cx + e1 + look, ey, INK)
    elif eyes == "shut":
        L.hline(cx - 2 + look, cx - 1 + look, ey, skd)
        L.hline(cx + 1 + look, cx + 2 + look, ey, skd)
    elif eyes == "mask":
        pass
    if cheek and eyes != "mask":
        L.set(cx - 2 + look, ey + 1, mix(sk, RED, 0.35))
        L.set(cx + 2 + look, ey + 1, mix(sk, RED, 0.35))
    if mouth:
        L.set(cx + look, cy + (2 if r >= 2.5 else 1), mix(skd, RED_D, 0.5) if mouth is True else mouth)
    # hair on top
    if style in ("long", "bob", "bun", "ponytail", "braid", "short", "crop", "beard"):
        top = int(round(cy - r))
        L.hline(cx - r + 1, cx + r - 1, top, hc)
        L.hline(cx - r, cx + r, top + 1, hc)
        if style != "crop":
            L.set(cx - r, top + 2, hc)
            L.set(cx + r, top + 2, hc)
        if style in ("long", "bob", "braid", "ponytail", "bun"):
            # a parting and a fringe swept to one side
            L.hline(cx - r, cx - r + 2, top + 2, hc)
            L.vline(cx - r, top + 2, cy + 1, hc)
            L.vline(cx + r, top + 2, cy + 1, hd)
        L.set(cx - 1, top, light(hc, 0.35))
    if style == "curls":
        top = int(round(cy - r))
        L.hline(cx - r + 1, cx + r - 1, top, hc)
        L.hline(cx - r, cx + r, top + 1, hc)
        L.set(cx - 1, top - 1, light(hc, 0.3))
    if style == "beard":
        L.hline(cx - r + 1, cx + r - 1, cy + r, hc)
        L.set(cx - r + 1, cy + r - 1, hc)
        L.set(cx + r - 1, cy + r - 1, hc)
        L.hline(cx - 1, cx + 1, cy + r + 1, hc)
        L.set(cx + look, cy + 2, mix(skd, RED_D, 0.5))
    if style == "bald":
        L.set(cx - 1, cy - r + 1, light(sk, 0.4))


def body(L, cx, top, foot, kind, c, cd=None, legs=None, w=4):
    """A torso and below: a dress (a widening skirt), a skirt over legs, trousers, or a robe to the ground."""
    cd = cd or dark(c, 0.3)
    legs = legs or dark(c, 0.45)
    if kind == "dress":
        robe(L, cx, top, foot - 2, w - 1.5, w + 2.5, c, cd)
        L.vline(cx - 1, foot - 1, foot, legs)
        L.vline(cx + 1, foot - 1, foot, legs)
    elif kind == "robe":
        robe(L, cx, top, foot, w - 1, w + 1.5, c, cd)
    elif kind == "trousers":
        mid = top + (foot - top) * 0.5
        L.rect(cx - w + 1, top, 2 * w - 1, mid - top + 1, c)
        L.rect(cx + 1, top, w - 1, mid - top + 1, cd)
        L.rect(cx - w + 1, mid + 1, w - 1, foot - mid, legs)
        L.rect(cx + 1, mid + 1, w - 1, foot - mid, dark(legs, 0.2))
    elif kind == "skirt":
        mid = top + (foot - top) * 0.45
        L.rect(cx - w + 1, top, 2 * w - 1, mid - top + 1, c)
        L.rect(cx + 1, top, w - 1, mid - top + 1, cd)
        robe(L, cx, mid, mid + (foot - mid) * 0.6, w - 1, w + 1.5, legs if legs != dark(c, 0.45) else dark(c, 0.2))
        L.vline(cx - 1, mid + (foot - mid) * 0.6 + 1, foot, SKIN_D)
        L.vline(cx + 2, mid + (foot - mid) * 0.6 + 1, foot, SKIN_D)


def arm(L, x0, y0, x1, y1, c, hand=None, w=2):
    L.thick(x0, y0, x1, y1, c, w)
    if hand:
        L.set(x1, y1, hand)
        if w > 1:
            L.set(x1, y1 + 1, hand)


def horse(L, x, y, coat, coat_d, mane=None, stride=0):
    """A horse walking right, its back at y, its body centred on x (about 24 px long, 13 high)."""
    mane = mane or dark(coat_d, 0.3)
    L.ell(x, y + 3, 8, 3.6, coat)
    L.ell(x + 1, y + 5, 6, 1.6, coat_d)
    # neck up and forward, the head down-turned
    L.poly([(x + 5, y + 1), (x + 9, y - 5), (x + 12, y - 4), (x + 9, y + 4)], coat)
    L.poly([(x + 9, y - 6), (x + 15, y - 2), (x + 14, y + 0), (x + 9, y - 2)], coat)
    L.set(x + 14, y - 1, coat_d)
    L.set(x + 11, y - 4, INK)
    L.set(x + 9, y - 7, coat)  # an ear
    L.line(x + 6, y - 0, x + 9, y - 6, mane)
    L.line(x + 7, y - 0, x + 10, y - 5, mane)
    L.line(x - 8, y + 1, x - 10, y + 7, mane)  # the tail
    L.line(x - 9, y + 1, x - 11, y + 6, mane)
    for lx, ph, c in ((x - 5, 0, coat_d), (x - 3, 1, coat), (x + 4, 1, coat_d), (x + 6, 0, coat)):
        off = stride if ph else -stride
        L.thick(lx, y + 5, lx + off, y + 11, c, 2)
        L.hline(lx + off, lx + off + 1, y + 12, INK)

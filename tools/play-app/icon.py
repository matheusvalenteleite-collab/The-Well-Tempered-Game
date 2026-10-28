"""D371 (Mario and Luigi's report, 1a): play.html's app icon, the B-A-C-H sign.

Four noteheads, B flat, A, C, B natural (his name in notes, and the intro's music), on a staff
fragment, drawn on a 32 x 32 pixel grid in the game's colours (the report's tools/wordmark.py
`bach_mark`, made square), then enlarged without smoothing: 180 (apple-touch), 192 and 512, and a
maskable 512 with the sign inside the safe circle. Run from the repository root:

    python3 tools/play-app/icon.py
"""
from PIL import Image

BG = (11, 13, 24)
FRAME = (201, 163, 74)
STAFF = (90, 95, 134)
HEAD = (254, 240, 168)
GOLD = (243, 199, 106)


def sign(n=32, pad=0):
    """The sign on an n x n grid; `pad` cells of plain ground around a 32-cell design (maskable)."""
    im = Image.new("RGB", (n, n), BG)
    px = im.load()
    o = pad

    def put(x, y, c):
        if 0 <= x + o < n and 0 <= y + o < n:
            px[x + o, y + o] = c

    if pad == 0:
        # A thin gold frame, a cell in from the edge (the title page's rules).
        for i in range(1, 31):
            for (x, y) in ((i, 1), (i, 30), (1, i), (30, i)):
                put(x, y, FRAME)
    # The staff: five lines, four cells apart (middle line, B, at y = 16).
    lines = [8, 12, 16, 20, 24]
    for y in lines:
        for x in range(4, 28):
            put(x, y, STAFF)
    # The heads, 5 x 3 cells: B flat on the middle line, A in the space below, C in the space above, B on the line.
    heads = [(5, 16), (11, 18), (17, 14), (23, 16)]
    for hx, hy in heads:
        for dx in range(5):
            for dy in (-1, 0, 1):
                corner = dx in (0, 4) and dy != 0
                if not corner:
                    # The title page's gradient: cream above, gold on the lower row.
                    put(hx + dx, hy + dy, HEAD if dy < 1 else GOLD)
    # No flat or natural drawn: the report's sign keeps it clean (the four heads read as the name).
    return im


def main():
    out = "public/play-app"
    base = sign()
    for size in (180, 192, 512):
        base.resize((size, size), Image.NEAREST).save(f"{out}/icon-{size}.png")
    # Maskable: the 32-cell design inside a 40-cell ground (the safe zone is the middle 80%).
    m = Image.new("RGB", (40, 40), BG)
    m.paste(sign(), (4, 4))
    m.resize((512, 512), Image.NEAREST).save(f"{out}/icon-maskable-512.png")


if __name__ == "__main__":
    main()

"""A contact sheet of the pictures with their names: python3 tools/pictures/sheet.py OUT.png [book|all] [scale] [cols] [id ...].

Each picture as the game shows it (cut to #rgb), its number, key and English name under it. Ids after the
column count limit the sheet to those pictures (a zoom sheet of the ones redrawn).
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import W, H  # noqa: E402
from build import all_pictures, quantise, names  # noqa: E402

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def sheet(out, book=None, scale=4, cols=6, only=None, title=None):
    pics = all_pictures()
    ids = [i for i in sorted(pics) if (book is None or i.startswith(f"wtc{book}")) and (not only or i in only)]
    nm = names()
    small = scale < 3
    pad, label = 8, 26 if small else 30
    cw, ch = W * scale + pad, H * scale + pad + label
    rows = (len(ids) + cols - 1) // cols
    head = 34
    im = Image.new("RGB", (cols * cw + pad, rows * ch + pad + head), (14, 16, 30))
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(FONT, 9 if small else 13)
    fs = ImageFont.truetype(FONT, 9 if small else 11)
    title = title or ("THE 48: BOOK I AND BOOK II" if book is None else f"BOOK {'I' * book}")
    d.text((pad, 9), title, font=ImageFont.truetype(FONT, 16), fill=(243, 215, 138))
    for n, pid in enumerate(ids):
        x = pad + (n % cols) * cw
        y = head + pad + (n // cols) * ch
        q = quantise(pics[pid]())
        im.paste(q.resize((W * scale, H * scale), Image.NEAREST), (x, y))
        b = "I" if pid[3] == "1" else "II"
        num = int(pid[-2:])
        en = nm.get(pid, {}).get("en", "")
        d.text((x, y + H * scale + 3), f"{b}/{num} · {key_of(pid)}", font=fs, fill=(150, 146, 180))
        fn, size = f, f.size
        while d.textlength(en.upper(), font=fn) > W * scale and size > 6:
            size -= 1
            fn = ImageFont.truetype(FONT, size)
        d.text((x, y + H * scale + (13 if small else 16)), en.upper(), font=fn, fill=(250, 236, 200))
    im.save(out)
    return out


KEYS = {}


def key_of(pid):
    if not KEYS:
        import json
        root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        for p in json.load(open(os.path.join(root, "data/touch/pieces.json"))):
            KEYS[p["id"]] = p["key"]
    k = KEYS.get(pid, "?")
    k = k[0] + k[1:].replace("#", "♯").replace("b", "♭")
    return k


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "sheet.png"
    book = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] != "all" else None
    scale = int(sys.argv[3]) if len(sys.argv) > 3 else 4
    cols = int(sys.argv[4]) if len(sys.argv) > 4 else 6
    only = set(sys.argv[5:]) or None
    title = f"THE {len(only)} REDRAWN ({scale}x)" if only else None
    print(sheet(out, book, scale, cols, only, title))

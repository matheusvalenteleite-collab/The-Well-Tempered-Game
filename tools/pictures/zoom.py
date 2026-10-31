"""Zoomed previews of some pictures: python3 zoom.py OUT.png id id ..."""
import sys
from PIL import Image
from build import all_pictures, quantise
from lib import W, H
pics = all_pictures()
ids = sys.argv[2:]
im = Image.new("RGB", (len(ids) * (W * 8 + 8), H * 8), (0, 0, 0))
for i, pid in enumerate(ids):
    im.paste(quantise(pics[pid]()).resize((W * 8, H * 8), Image.NEAREST), (i * (W * 8 + 8), 0))
im.save(sys.argv[1])

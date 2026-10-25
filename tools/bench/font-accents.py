"""D283: Press Start 2P draws the accented capitals Portuguese and Spanish need (Á É Í Ó Ú, À, Â Ê Ô,
Ã Õ Ñ) as squashed, lowercase-height letters with the accent inside the cap height, so INVENCIÓN reads
"INVENCIóN" and ESPAÑOL "ESPAñOL". Each is rebuilt here from its full capital with the accent drawn in
pixels above the cap line (an 8 x 8 grid, 125 units a pixel). Run once on the fontsource file (it refuses
a font already rebuilt):
  python3 tools/bench/font-accents.py src/bench/fonts/press-start-2p-latin-400-normal.woff2
"""
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen

PX = 125
# The accents' pixels (column, row), row 9 the first above the cap line (rows 1..8 are the letter's).
ACCENTS = {
    "acute": [(4, 9), (5, 10)],
    "grave": [(3, 9), (2, 10)],
    "circumflex": [(2, 9), (3, 10), (4, 9)],
    "tilde": [(1, 9), (2, 10), (3, 9), (4, 10)],
}
LETTERS = {"acute": "AEIOUY", "grave": "AEIOU", "circumflex": "AEO", "tilde": "AON"}

path = sys.argv[1]
font = TTFont(path)
glyf = font["glyf"]
gs = font.getGlyphSet()
for accent, pixels in ACCENTS.items():
    for base in LETTERS[accent]:
        name = base + accent
        if name not in glyf.glyphs:
            continue
        g = glyf[name]
        g.recalcBounds(glyf)
        if g.yMax > 8 * PX:
            sys.exit(f"{name} is already rebuilt")
        pen = TTGlyphPen(gs)
        gs[base].draw(pen)
        for col, row in pixels:
            x0, y0 = col * PX, row * PX
            # Clockwise, as TrueType's outer contours go.
            pen.moveTo((x0, y0))
            pen.lineTo((x0, y0 + PX))
            pen.lineTo((x0 + PX, y0 + PX))
            pen.lineTo((x0 + PX, y0))
            pen.closePath()
        glyf[name] = pen.glyph()
        glyf[name].recalcBounds(glyf)
font.save(path)
print("rebuilt", ", ".join(b + a for a in ACCENTS for b in LETTERS[a]))

#!/usr/bin/env python3
# D713: a partial fit (fit.py run on a few pieces' renders: the Art of Fugue's) merged into src/touch/drum-peak-data.ts:
# its BAND curves added (or replaced, by key); its PIECE_DB pairs added where the data has none (a pair already fitted,
# on the 48's renders, is kept: the same kit on the same sound); the header's error list extended with the new pairs'.
# usage: python3 -I tools/touch/drum-peak/merge.py <src/touch/drum-peak-data.ts> <partial.ts> > merged.ts
import sys, json, re
old, new = (open(p).read() for p in sys.argv[1:3])
def obj(text, name):
    m = re.search(r'export const ' + name + r': [^=]+= (\{.*?\});\n', text, re.S)
    return json.loads(m.group(1))
def errs(text):
    m = re.search(r'windows\): (.*?)\.\n \*/', text, re.S)
    return [e.strip() for e in re.sub(r'\n \* ?', ' ', m.group(1)).split(';') if e.strip()]
band, db = obj(old, 'BAND'), obj(old, 'PIECE_DB')
nb, ndb = obj(new, 'BAND'), obj(new, 'PIECE_DB')
band.update(nb)
added = [k for k in ndb if k not in db]
for k in added: db[k] = ndb[k]
el = errs(old) + [e for e in errs(new) if e.split(' ')[0] in added]
head = old[: old.index(' * windows): ')]
# the header's prose up to the error list, then the list (D713: and the Art of Fugue's pieces, fitted on their own renders)
out = head + ' * windows): ' + '; '.join(sorted(el, key=lambda e: e.split(' ')[0])) + '.\n * D713: BAND also has the Art of Fugue\'s 20 (bwv1080-*), each on its own sound; its new style@sound pairs fitted on those renders alone.\n */\n'
out += 'export const BAND: Readonly<Record<string, { beat: number; db: readonly number[] }>> = ' + json.dumps(band, separators=(',', ':')) + ';\n'
out += 'export const PIECE_DB: Readonly<Record<string, Readonly<Record<string, number>>>> = ' + json.dumps(db, separators=(',', ':')) + ';\n'
out += old[old.index('export const TAIL_S'):]
sys.stdout.write(out)
print(f"merged: BAND +{len(nb)}, PIECE_DB +{len(added)} ({', '.join(added)})", file=sys.stderr)

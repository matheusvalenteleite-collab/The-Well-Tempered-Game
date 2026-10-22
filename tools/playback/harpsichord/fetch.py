# Download VCSL Harpsi4 (sustains, releases) and the Pipe Organ loud manual + loud pedal. Usage: fetch.py <outdir>
import os, sys, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

O = sys.argv[1]
B = "https://raw.githubusercontent.com/sgossner/VCSL/master/"
N = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
jobs = []
for m in range(33, 90):
    n = f"{N[m % 12]}{m // 12 - 2}"
    jobs.append((f"Chordophones/Zithers/Harpsichord, Unk/Sustains/Harpsi4_Sus_Main_{n}_rr1.wav", f"sus/{m}.wav"))
    jobs.append((f"Chordophones/Zithers/Harpsichord, Unk/Releases/Harpsi4_Rel_Main_{n}_rr1.wav", f"rel/{m}.wav"))
for n in "C1 D#1 F#1 A1 C2 D#2 F#2 A2 C3 D#3 F#3 A3 C4 D#4 F#4 A4 C5 D#5 F#5 A5 C6".split():
    jobs.append((f"Aerophones/Edge-blown Aerophones/Pipe Organ/Loud/Rode_Man3Open_{n}.wav", f"organ/{n}.wav"))
for n in "C1 D#1 F#1 A1 C2 D#2 F#2 A2 C3 D#3 F#3".split():
    jobs.append((f"Aerophones/Edge-blown Aerophones/Pipe Organ/Loud Pedal/Rode_Pedal_{n}.wav", f"pedal/{n}.wav"))
jobs += [("Aerophones/Edge-blown Aerophones/Pipe Organ/Info.txt", "organ-info.txt"), ("LICENSE", "LICENSE.txt"), ("README.md", "README.md")]


def get(job):
    src, dst = job
    path = os.path.join(O, dst)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return
    for _ in range(3):
        try:
            with urllib.request.urlopen(B + urllib.parse.quote(src), timeout=120) as r, open(path, "wb") as f:
                f.write(r.read())
            return
        except Exception as e:  # retry
            err = e
    print("FAIL", src, err)


with ThreadPoolExecutor(12) as ex:
    list(ex.map(get, jobs))
print("done", len(jobs))

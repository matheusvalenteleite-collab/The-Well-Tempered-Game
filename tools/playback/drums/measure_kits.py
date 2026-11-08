"""D514: the drum presets' recordings' loudness (chip.ts KIT_RMS): each one-shot's strongest 50 ms (RMS, dBFS, mono).

Usage (from the repository root): python3 -I tools/playback/drums/measure_kits.py
Prints the table as chip.ts KIT_RMS keys it: kitRock (drums/bigRusty), kitClub (drums/virtuosity), timpLoud (timpani, -v2).
"""
import json
import os
import subprocess

import numpy as np

ROOT = "public/samples"
SETS = {"kitRock": "bigRusty", "kitClub": "virtuosity"}


def peak_rms(path):
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", path, "-ac", "1", "-ar", "44100", "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    if not len(x):
        return None
    w = 2205
    e = np.convolve(x * x, np.ones(w) / w, mode="valid")
    return round(float(10 * np.log10(e.max() + 1e-12)), 1)


out = {}
manifest = json.load(open(f"{ROOT}/drums/manifest.json"))
for key, kit in SETS.items():
    for v in manifest[kit]["voices"]:
        for layer in (1, 2):
            out[f"{key}/{v}-{layer}"] = peak_rms(f"{ROOT}/drums/{kit}/{v}-{layer}.mp3")
for f in sorted(os.listdir(f"{ROOT}/timpani")):
    if f.endswith("-v2.mp3"):
        out[f"timpLoud/{f[:-4]}"] = peak_rms(f"{ROOT}/timpani/{f}")
print(", ".join(f'"{k}": {v}' for k, v in out.items()))

"""D532: the period kit (public/samples/drums/period/): each piece soft "-1" and loud "-2", as D514's kits.

Usage (from the repository root): python3 -I tools/playback/period-drums/build_period.py <VCSL clone> <FreePats World Percussion dir>
  <VCSL clone>: a checkout of https://github.com/sgossner/VCSL (Versilian Community Sample Library, CC0 1.0)
  <FreePats dir>: "WorldPercussion SFZ+WAV-20200905" from https://freepats.zenvoid.org/Percussion/world-and-rare-percussion.html (CC0 1.0)
Downloads are data only: nothing in them is run. Each file: stereo mixed to mono, the leading silence removed (onset at about
1 ms), trimmed with a fade (LEN), one gain per file so it peaks at -1 dBFS (chip.ts KIT_RMS evens them), mono 44.1 kHz
96 kbit/s MP3. Then python3 -I tools/playback/drums/measure_kits.py prints their KIT_RMS.
"""
import os
import subprocess
import sys

VCSL, FP = sys.argv[1], sys.argv[2]
M = "Membranophones/Struck Membranophones"
I = "Idiophones/Struck Idiophones"
ROPE = f"{M}/Snare Drum, Rope Tension"
# voice: (soft, loud) sources, and the length kept (s).
FILES = {
    # The side drum: the rope-tension snare's high head, snares on (Lully's tambour, a military drum).
    "sideDrum": (f"{VCSL}/{ROPE}/Hi/RopeSnare_hi_sn_Main_vl1_rr1.wav", f"{VCSL}/{ROPE}/Hi/RopeSnare_hi_sn_Main_vl4_rr1.wav", 1.2),
    # The field drum: the rope drum's deep head, snares on (the long drum of a regiment's fifes and drums).
    "fieldDrum": (f"{VCSL}/{ROPE}/Low/RopeSnare_low_sn_Main_vl1_rr1.wav", f"{VCSL}/{ROPE}/Low/RopeSnare_low_sn_Main_vl3_rr1.wav", 1.4),
    # The tabor: the same deep head, snares off (a pipe-and-tabor player's small drum).
    "tabor": (f"{VCSL}/{ROPE}/Low/RopeSnare_low_ns_Main_vl1_rr2.wav", f"{VCSL}/{ROPE}/Low/RopeSnare_low_ns_Main_vl3_rr1.wav", 1.2),
    # The stick on the rim (the side drum's and the tabor's light strokes).
    "drumStick": (f"{VCSL}/{ROPE}/RopeSnare_stick_Main_vl1_rr1.wav", f"{VCSL}/{ROPE}/RopeSnare_stick_Main_vl1_rr1.wav", 0.6),
    # The frame drums (VCSL's large and small hand drums): the dum (the large, open) and the tek (the small).
    "frameDum": (f"{VCSL}/{M}/Frame Drum/HDrumL_Hit_v2_rr1_Sum.wav", f"{VCSL}/{M}/Frame Drum/HDrumL_Hit_v3_rr1_Sum.wav", 1.2),
    "frameTek": (f"{VCSL}/{M}/Frame Drum/HDrumS_Hit_v2_rr1_Sum.wav", f"{VCSL}/{M}/Frame Drum/HDrumS_Hit_v3_rr1_Sum.wav", 0.8),
    "tambourine": (f"{VCSL}/{I}/Tambourine 1/Tamb1_Hit_v1_rr1_Mid.wav", f"{VCSL}/{I}/Tambourine 1/Tamb1_Hit_v2_rr1_Mid.wav", 1.2),
    # The castanets: FreePats' (Xavimart's pair), two takes.
    "castanets": (f"{FP}/samples/Castanets/02.wav", f"{FP}/samples/Castanets/06.wav", 0.4),
    # The Janissary band: the bass drum (davul), the clash cymbals (zil), the triangle.
    "bassDrum": (f"{VCSL}/{M}/Bass Drum 2/bassdrum_hit_mp1.wav", f"{VCSL}/{M}/Bass Drum 2/bassdrum_hit_ff.wav", 2.0),
    "cymbals": (f"{VCSL}/{I}/Clash Cymbals 1/cymbal_crash1_mp1.wav", f"{VCSL}/{I}/Clash Cymbals 1/cymbal_crash1_ff2.wav", 3.0),
    "triangle": (f"{VCSL}/{I}/Triangles/Triangle1_Hit_v1_rr1_Mid.wav", f"{VCSL}/{I}/Triangles/Triangle1_Hit_v2_rr1_Mid.wav", 3.0),
}
OUT = "public/samples/drums/period"
os.makedirs(OUT, exist_ok=True)
for voice, (soft, loud, length) in FILES.items():
    for layer, src in ((1, soft), (2, loud)):
        fade = min(0.5, length * 0.4)
        pk = subprocess.run(["ffmpeg", "-i", src, "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
        pre = -1 - float(pk.split("max_volume:")[1].split("dB")[0])
        af = f"volume={pre}dB,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.001,atrim=0:{length},afade=t=out:st={length - fade}:d={fade}"
        tmp = f"{OUT}/{voice}-{layer}.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-ac", "1", "-ar", "44100", "-af", af, tmp], check=True)
        peak = subprocess.run(["ffmpeg", "-i", tmp, "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
        mx = float(peak.split("max_volume:")[1].split("dB")[0])
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-af", f"volume={-1 - mx}dB", "-c:a", "libmp3lame", "-b:a", "96k", f"{OUT}/{voice}-{layer}.mp3"], check=True)
        os.remove(tmp)
        print(voice, layer, os.path.basename(src))

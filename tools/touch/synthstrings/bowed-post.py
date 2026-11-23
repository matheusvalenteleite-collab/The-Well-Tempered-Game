# the waveguide's raw renders through the violin's (or cello's) body EQ and top, levelled to the target phone-model level, as diag wavs
import numpy as np, sys
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, lfilter
D, OUT = sys.argv[1], sys.argv[2]
SR = 48000
def peaking(x, f, db, q):
    A = 10 ** (db / 40); w = 2 * np.pi * f / SR; al = np.sin(w) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w), 1 - al * A]; a = [1 + al / A, -2 * np.cos(w), 1 - al / A]
    return lfilter(np.array(b) / a[0], np.array(a) / a[0], x)
def phone(x):
    hp = butter(2, 600, 'hp', fs=SR, output='sos'); return sosfilt(hp, sosfilt(hp, x))
for name, body, top, target in [('vscale', [(280, 3), (1000, 3)], 2500, -33.4), ('vhold', [(280, 3), (1000, 3)], 2500, None), ('cscale', [(200, 3), (700, 2.5)], 2000, -30.0)]:
    x = np.fromfile(f'{D}/wg-{name}.f32', np.float32).astype(float)
    x = sosfilt(butter(1, 60, 'hp', fs=SR, output='sos'), x)
    for f, db in body: x = peaking(x, f, db, 1.4)
    x = sosfilt(butter(4, top, 'lp', fs=SR, output='sos'), x)
    if target is None: target = globals().get('_vt')
    lv = 10 * np.log10((phone(x)[x != 0] ** 2).mean() + 1e-20)
    if name == 'vscale': _vt = target
    g = 10 ** ((target - lv) / 20) if target else 1
    if name == 'vhold': g = _g
    if name == 'vscale': _g = 10 ** ((target - lv) / 20)
    y = np.clip(x * g, -1, 1)
    wavfile.write(f'{OUT}/wg--stringConsort--{name}.wav', SR, (np.stack([y, y], 1) * 32767).astype(np.int16))
    print(name, 'gain dB', round(20 * np.log10(g), 1))

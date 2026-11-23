# a dropout: a 5 ms frame more than 30 dB under the median of the 200 ms around it, where that median is over -45 dBFS
import numpy as np, sys, subprocess
for f in sys.argv[1:]:
    x = np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',f,'-f','f32le','-ac','1','-ar','24000','-'],capture_output=True).stdout, np.float32)
    h = 120; n = len(x)//h; e = 20*np.log10(np.sqrt((x[:n*h].reshape(n,h)**2).mean(1))+1e-9)
    bad = []
    for i in range(20, n-20):
        m = np.median(e[i-20:i+20])
        if m > -45 and e[i] < m - 30: bad.append(round(i*h/24000, 2))
    print(f.split('/')[-1], 'secs', round(len(x)/24000,1), 'dropouts', len(bad), bad[:5])

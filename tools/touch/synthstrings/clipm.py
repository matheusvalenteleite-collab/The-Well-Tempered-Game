import numpy as np, sys, os, subprocess, json, re
from scipy.signal import butter, sosfilt
D=sys.argv[1]; out={}
for f in sorted(os.listdir(D)):
    if not f.endswith('.wav'): continue
    p=f'{D}/{f}'
    x=np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',p,'-t','30','-f','f32le','-ac','1','-ar','48000','-'],capture_output=True).stdout,np.float32).astype(float)
    sr=48000; hp=butter(2,600,'hp',fs=sr,output='sos'); xp=sosfilt(hp,sosfilt(hp,x))
    X=np.abs(np.fft.rfft(xp))**2; fr=np.fft.rfftfreq(len(xp),1/sr); tot=X[(fr>50)&(fr<12000)].sum()
    harsh=X[(fr>=2000)&(fr<=5000)].sum()/tot
    st=subprocess.run(['ffmpeg','-nostats','-i',p,'-t','30','-af','highpass=f=600,highpass=f=600,ebur128=peak=true','-f','null','-'],capture_output=True,text=True).stderr
    I=float(re.findall(r'I:\s+(-?[\d.]+) LUFS',st)[-1]); tp=float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS',st)[-1])
    # crest: the 99.9th percentile of |x| over the 400 ms RMS (the phone model), median over windows
    h=int(0.4*sr); n=len(xp)//h; w=xp[:n*h].reshape(n,h); rms=np.sqrt((w**2).mean(1)); pk=np.abs(w).max(1); ok=rms>1e-4
    out[f[:-4]]=dict(phone_lufs=I, true_peak=tp, harsh_2_5k_pct=round(100*harsh,1), crest_db=round(float(np.median(20*np.log10(pk[ok]/rms[ok]))),1))
json.dump(out,open(f'{D}/../clipmetrics.json','w'),indent=1)
for k,v in out.items(): print(k.ljust(30), v)

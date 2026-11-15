# D708, THE VOICE PROBE'S MEASURE (the slow-fugues study's distinctness, D708): each voice's 4 probe notes (render.cjs):
# the spectral centroid (50 Hz-10 kHz), the attack (10-90 % of the peak), the decay (0.5 s after) and the tail (0.75 s
# after); a pair's distance sqrt(log2 centroid ratio^2 + log2 attack ratio^2 + (decay diff/6)^2 + (tail diff/6)^2);
# min pair = the two most alike voices (higher: easier to tell apart), adj = neighbouring voices' mean.
# usage: python3 -I tools/touch/voice-probe/measure.py <renders dir> <medians.json>   (voice counts by piece)
import numpy as np, json, sys, os, glob, itertools
from scipy.io import wavfile
W=sys.argv[1]
import json as _j
MED=_j.load(open(sys.argv[2]))
def an(p,id):
    NV={id:len(MED[id])}
    sr,x=wavfile.read(p); x=x.astype(np.float64)/32768; x=x.mean(1) if x.ndim>1 else x
    h=int(sr*0.002); m=len(x)//h; env=np.sqrt((x[:m*h].reshape(m,h)**2).mean(1))+1e-9
    I=lambda t:max(0,min(m-1,int(round(t/0.002))))
    nv=NV.get(id, int(round((len(x)/sr-1)/6)))
    db=20*np.log10(env)
    # the file may start inside the first note: find the first clean onset (from below -60 dB to above -50 dB) and align the grid on it
    on=None
    for i in range(30,len(db)):
        if db[i]>-50 and db[i-25:i-5].max()<-60: on=i*0.002; break
    k0=round(on/1.2); off=on-k0*1.2
    out=[]
    for v in range(nv):
        A=[];D=[];T=[];C=[];L=[]
        for k in range(4):
            t=v*6+k*1.2+off
            if t<0.05: continue
            w=env[I(t-0.02):I(t+0.3)]; pk=w.max(); ip=int(w.argmax())
            i10=int(np.argmax(w[:ip+1]>=0.1*pk)); i90=int(np.argmax(w[:ip+1]>=0.9*pk))
            A.append(max(4.0,(i90-i10)*2.0))
            P=env[I(t):I(t+0.6)].max()
            D.append(max(-40.0,20*np.log10(env[I(t+0.5)]/P))); T.append(max(-60.0,20*np.log10(env[I(t+0.75)]/P)))
            seg=x[int(t*sr):int((t+0.6)*sr)]
            S=np.abs(np.fft.rfft(seg*np.hanning(len(seg)))); fr=np.fft.rfftfreq(len(seg),1/sr); b=(fr>=50)&(fr<=10000)
            C.append((S[b]*fr[b]).sum()/S[b].sum()); L.append(20*np.log10(np.sqrt((seg**2).mean())+1e-9))
        out.append(dict(centroid=round(float(np.median(C))),attack_ms=round(float(np.median(A)),1),decay_db=round(float(np.median(D)),1),tail_db=round(float(np.median(T)),1),level_db=round(float(np.median(L)),1)))
    return out
res={}
for p in sorted(glob.glob(W+'/*.wav')):
    id,snd=os.path.basename(p)[:-4].rsplit('-',1)
    vs=an(p,id)
    d=[]
    for a,b in itertools.combinations(vs,2):
        z=[np.log2(a['centroid']/b['centroid']),np.log2(a['attack_ms']/b['attack_ms']),(a['decay_db']-b['decay_db'])/6,(a['tail_db']-b['tail_db'])/6]
        d.append(float(np.sqrt(sum(q*q for q in z))))
    # adjacent pairs (voices next to each other: the ones that cross and blur)
    adj=[]
    for i in range(len(vs)-1):
        a,b=vs[i],vs[i+1]; z=[np.log2(a['centroid']/b['centroid']),np.log2(a['attack_ms']/b['attack_ms']),(a['decay_db']-b['decay_db'])/6,(a['tail_db']-b['tail_db'])/6]; adj.append(float(np.sqrt(sum(q*q for q in z))))
    res.setdefault(id,{})[snd]=dict(voices=vs,min_pair=round(min(d),2),mean_pair=round(float(np.mean(d)),2),adj_mean=round(float(np.mean(adj)),2),tail=round(float(np.median([v['tail_db'] for v in vs])),1),attack_spread=round(float(np.log2(max(v['attack_ms'] for v in vs)/min(v['attack_ms'] for v in vs))),2))
json.dump(res,open(W+'/probe.json','w'),indent=1)
for id,ss in res.items():
    for snd,s in ss.items():
        print(f"{id:8s} {snd:18s} min {s['min_pair']:.2f} adj {s['adj_mean']:.2f} mean {s['mean_pair']:.2f} tail {s['tail']:6.1f} | "+' '.join(f"[c{v['centroid']} a{v['attack_ms']:.0f} d{v['decay_db']} t{v['tail_db']}]" for v in s['voices']))

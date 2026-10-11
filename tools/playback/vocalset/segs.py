import sys, wave, json, numpy as np
def load(p):
    w=wave.open(p); sr=w.getframerate(); a=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(float)/32768; return a,sr
def track(a,sr,fmin=70,fmax=1100,hop=0.01,win=0.04):
    H=int(sr*hop); W=int(sr*win); tmax=int(sr/fmin); tmin=int(sr/fmax)
    out=[]
    for i in range(0,len(a)-W-tmax,H):
        x=a[i:i+W+tmax]; f=a[i:i+W]
        rms=np.sqrt((f**2).mean())
        # difference function via fft
        e0=np.sum(f**2); cs=np.concatenate([[0],np.cumsum(x**2)])
        et=cs[W:W+tmax+1]-cs[0:tmax+1]
        n=1<<int(np.ceil(np.log2(W+tmax+W)))
        r=np.fft.irfft(np.fft.rfft(x,n)*np.conj(np.fft.rfft(f,n)),n)[:tmax+1]
        d=e0+et-2*r; d[0]=0
        c=np.ones_like(d); cum=np.cumsum(d[1:]); c[1:]=d[1:]*np.arange(1,tmax+1)/np.maximum(cum,1e-12)
        t=None
        for k in range(tmin,tmax):
            if c[k]<0.12 and c[k]<=c[k+1]: t=k; break
        if t is None: out.append((rms,None)); continue
        if 0<t<tmax:
            den=d[t-1]-2*d[t]+d[t+1]; off=0.5*(d[t-1]-d[t+1])/den if den!=0 else 0
        else: off=0
        out.append((rms, 69+12*np.log2(sr/(t+off)/440)))
    return out
res={}
for p in sys.argv[1:]:
    a,sr=load(p); tr=track(a,sr); segs=[]; i=0
    raw=[m for r,m in tr]; sm=[]
    for k in range(len(raw)):
        w=[x for x in raw[max(0,k-10):k+11] if x is not None]
        sm.append(None if raw[k] is None or len(w)<14 else float(np.mean(w)))
    tr=[(tr[k][0],sm[k]) for k in range(len(tr))]
    while i<len(tr):
        rms,m=tr[i]
        if m is None or rms<0.01: i+=1; continue
        n=round(m); j=i; vals=[]
        while j<len(tr) and tr[j][1] is not None and abs(tr[j][1]-n)<0.4 and tr[j][0]>=0.01: vals.append(tr[j][1]); j+=1
        if j-i>=30:
            v=np.array(vals); segs.append(dict(midi=n,t0=i*0.01,t1=j*0.01,cents=float(100*(np.median(v)-n)),sd=float(100*np.std(v)),rms=float(np.mean([tr[k][0] for k in range(i,j)]))))
        i=max(j,i+1)
    res[p]=segs
    print(p.split('/')[-1], [(s['midi'],round(s['t1']-s['t0'],2),round(s['cents']),round(s['sd'])) for s in segs], flush=True)
import os; json.dump(res,open(os.environ["SEGOUT"],"w"))

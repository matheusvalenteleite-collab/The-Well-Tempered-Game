import sys, os, json, wave, subprocess, numpy as np
S, OUT = sys.argv[1], sys.argv[2]
SR=44100
NAMES=['C','Cs','D','Ds','E','F','Fs','G','Gs','A','As','B']
def name(m): return f"{NAMES[m%12]}{m//12-1}"
def load(p):
    w=wave.open(p); return np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(float)/32768
def save(p,a):
    w=wave.open(p,'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(a,-1,1)*32767).astype(np.int16).tobytes()); w.close()
def shift(a, semis):
    if abs(semis)<0.03: return a
    i,o=f"{S}/vsdl/tmp_in.wav",f"{S}/vsdl/tmp_out.wav"; save(i,a)
    subprocess.run(["ffmpeg","-v","error","-y","-i",i,"-af",f"rubberband=pitch={2**(semis/12)}:formant=preserved:pitchq=quality",o],check=True)
    return load(o)
def tile(chunk, n, X):
    # overlap-add copies of chunk, each aligned to the running signal by correlation over the crossfade
    out=chunk.copy(); P=int(SR/80)
    fi=np.sin(np.linspace(0,np.pi/2,X))**2; fo=1-fi
    while len(out)<n:
        tail=out[-X-P:]
        best,bk=-1e9,0
        for k in range(P):
            seg=tail[k:k+X]; c=np.dot(seg,chunk[:X])/(np.linalg.norm(seg)*np.linalg.norm(chunk[:X])+1e-9)
            if c>best: best,bk=c,k
        cut=len(out)-X-P+bk
        out=np.concatenate([out[:cut], out[cut:cut+X]*fo+chunk[:X]*fi, chunk[X:]])
    return out[:n]
SINGERS={"soloSoprano":("f2",(60,81)),"soloAlto":("f5",(53,74)),"soloTenor":("m11",(47,69)),"soloBass":("m8",(38,64))}
LEAD,BLOCK,TAIL=1.0,2.0,0.25
report={}
for set_,(who,(lo,hi)) in SINGERS.items():
    d=json.load(open(f"{S}/vsdl/segs-{who}.json")); best={}
    for p,ss in d.items():
        for x in ss:
            dur=x['t1']-x['t0']-0.1
            if dur<0.25: continue
            score=min(dur,1.2)-x['sd']/150+(0.2 if '/straight/' in p or 'long' in p else 0)
            if x['midi'] not in best or score>best[x['midi']][0]: best[x['midi']]=(score,p,x)
    have=sorted(best)
    os.makedirs(f"{OUT}/{set_}",exist_ok=True)
    made=[]
    # real notes in range (one beyond each end), plus formant-preserving shifts to reach the range ends
    targets=[m for m in have if lo-1<=m<=hi+1]
    for m in range(lo,hi+1):
        if min(abs(m-h) for h in have)>2 and m not in targets: targets.append(m)
    # thin: keep fills every 2 semitones beyond the real ones
    for m in sorted(targets):
        src=min(have,key=lambda h:(abs(h-m),-best[h][0]))
        _,p,x=best[src]; a=load(p)
        t0=x['t0']+0.05; t1=x['t1']-0.05
        chunk=a[int(t0*SR):int(t1*SR)]
        semis=(m-src)-x['cents']/100
        chunk=shift(chunk,semis)[:len(chunk)]
        chunk=chunk/ (np.sqrt((chunk**2).mean())+1e-9)*0.12
        X=int(0.06*SR)
        T=tile(chunk,int((LEAD+BLOCK+TAIL+0.6)*SR),X)
        L,B=int(LEAD*SR),int(BLOCK*SR); Xl=int(0.12*SR)
        fi=np.sin(np.linspace(0,np.pi/2,Xl))**2
        # the loop's start chosen where its ending best matches what precedes it (no dip at the jump)
        bs,bc=L,-1e9
        for s0 in range(L,L+int(0.3*SR),4):
            u=T[s0+B-Xl:s0+B]; v=T[s0-Xl:s0]; c=np.dot(u,v)/(np.linalg.norm(u)*np.linalg.norm(v)+1e-9)
            if c>bc: bc,bs=c,s0
        blk=T[bs:bs+B].copy(); blk[-Xl:]=blk[-Xl:]*(1-fi)+T[bs-Xl:bs]*fi
        y=np.concatenate([T[bs-L:bs],blk,blk[:int(TAIL*SR)]])
        f=int(0.03*SR); y[:f]*=np.linspace(0,1,f); y[-int(0.1*SR):]*=np.linspace(1,0,int(0.1*SR))
        save(f"{S}/vsdl/n.wav",y)
        subprocess.run(["ffmpeg","-v","error","-y","-i",f"{S}/vsdl/n.wav","-ac","1","-b:a","96k",f"{OUT}/{set_}/{name(m)}.mp3"],check=True)
        made.append(f"{name(m)}{'' if m==src else f'(<{name(src)})'}")
    report[set_]=made; print(set_,who,' '.join(made),flush=True)

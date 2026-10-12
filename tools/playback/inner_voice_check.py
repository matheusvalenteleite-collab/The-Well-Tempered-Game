"""P36: the inner voices of the generated chorales (bench, -v2) against Bach's: dissonances by how they are
approached and left, augmented seconds, leaps. Usage: python3 tools/playback/inner_voice_check.py"""
import json,glob,re,collections
study={c["n"]:c for c in json.load(open("data/chorales/study.json"))["chorales"]}
L={'C':0,'D':1,'E':2,'F':3,'G':4,'A':5,'B':6}; S={'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
def parse(p):
    m=re.match(r'([A-G])([#b]*)(-?\d+)',p); o=int(m[3]); return S[m[1]]+m[2].count('#')-m[2].count('b')+12*(o+1), L[m[1]]+7*o
def sounding(voices,t,skip):
    out=[]
    for k,v in enumerate(voices):
        if k==skip: continue
        for n in v:
            if n[0]<=t<n[0]+n[1]: out.append((k,parse(n[2])[0]))
    return out
def analyse(voices, inner=(1,2)):
    c=collections.Counter(); notes=0; where=collections.defaultdict(list)
    for k in inner:
        v=voices[k]
        for i,n in enumerate(v):
            notes+=1; m,l=parse(n[2])
            if i:
                pm,pl=parse(v[i-1][2]); d=m-pm; ld=l-pl
                if abs(ld)==1 and abs(d)==3: c['aug2']+=1; where['aug2'].append((k,n[0]))
                if abs(d)==6: c['tritone leap']+=1; where['tritone leap'].append((k,n[0]))
                if abs(d)>7 and abs(d)!=12: c['leap>5th']+=1
            others=sounding(voices,n[0],k)
            if not others: continue
            bass=min([m]+[x[1] for x in others])
            dis=any((abs(m-o)%12) in (1,2,6,10,11) for _,o in others) or (m!=bass and (m-bass)%12==5 and False)
            if not dis: continue
            prev=parse(v[i-1][2])[0] if i else None; nxt=parse(v[i+1][2])[0] if i+1<len(v) else None
            step=lambda a,b: a is not None and b is not None and 1<=abs(a-b)<=2
            if prev==m and nxt is not None and 1<=m-nxt<=2: kind='suspension'
            elif step(prev,m) and step(m,nxt) and (m-prev)*(nxt-m)>0: kind='passing'
            elif step(prev,m) and nxt==prev: kind='neighbour'
            elif nxt==m: kind='anticipation/repeat'
            elif step(m,nxt): kind='leapt-in, step out'
            else: kind='UNRESOLVED (leap in and out / held)'
            # accented? on a beat
            c['dis:'+kind]+=1; where[kind].append((k,n[0]))
    return notes,c,where
tot={'gen':collections.Counter(),'bach':collections.Counter()}; nn={'gen':0,'bach':0}
ex=[]
for f in sorted(glob.glob("data/playback/bench/gen-chorale-*-v2.json")):
    d=json.load(open(f)); b=study[d['compare']]
    for who,vs in (('gen',d['voices']),('bach',b['voices'])):
        n,c,w=analyse(vs); tot[who]+=c; nn[who]+=n
        if who=='gen': ex.append((f.split('/')[-1], w.get('UNRESOLVED (leap in and out / held)',[])[:4]))
keys=sorted(set(tot['gen'])|set(tot['bach']))
print("per 100 inner-voice notes   gen   bach")
for k in keys: print(f"{k:40s} {100*tot['gen'][k]/nn['gen']:5.1f} {100*tot['bach'][k]/nn['bach']:5.1f}")
print(nn); 
for e in ex[:6]: print(e)

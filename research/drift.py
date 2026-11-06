import numpy as np
from lab import *
from lab2 import partials, f1_fixedB, fitB
B=1.12e-4; N=8192
for name,fstd in [STRINGS[0],STRINGS[3],STRINGS[5]]:
    rows=[]
    for seed in range(8):
        y,f1=pluck(fstd/np.sqrt(1+B),B,1.6,20,seed=seed,glide=0)  # ohne Anschlagsglide: nur Effekt der Teiltoene
        r=[]
        for t in (0.03,0.15,0.4,0.8,1.2):
            a=int(t*FS); seg=y[a:a+N]; tr=np.mean(f1[a:a+N]); g,_=guided_nsdf(seg,fstd)
            r.append((cents(g,tr), cents(f1_fixedB(partials(seg,g),B),tr)))
        rows.append(r)
    m=np.mean(np.array(rows),axis=0)
    print(name, "Zeitbereich:", " ".join(f"{x:+5.1f}" for x in m[:,0]), "| Spektrum:", " ".join(f"{x:+5.1f}" for x in m[:,1]))

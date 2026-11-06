import numpy as np
from lab import *

def partials(x, f_coarse, nmax=8):
    N=len(x); w=np.hanning(N); nfft=1<<int(np.ceil(np.log2(N*8)))
    X=np.abs(np.fft.rfft(x*w,nfft))+1e-12; L=np.log(X); df=FS/nfft
    out=[]
    for n in range(1,nmax+1):
        fc=n*f_coarse
        if fc>4500: break
        lo=int((fc*2**(-40/1200))/df); hi=int((fc*2**(40/1200))/df)+1
        i=lo+int(np.argmax(X[lo:hi]))
        if i in (lo,hi-1): continue
        out.append((n,parabolic(L,i)*df,X[i]))
    a=np.array(out).reshape(-1,3)
    if len(a)==0: return a
    a[:,2]/=a[:,2].max(); return a[a[:,2]>0.05]

def fitB(p):
    if len(p)<2: return np.nan
    ns,fs_,ws=p[:,0],p[:,1],p[:,2]
    A=np.vstack([np.ones_like(ns),ns**2]).T; sw=ws
    c=np.linalg.lstsq(A*sw[:,None],(fs_/ns)**2*sw,rcond=None)[0]
    return max(c[1]/c[0],0.0) if c[0]>0 else 0.0

def f1_fixedB(p,B):
    ns,fs_,ws=p[:,0],p[:,1],p[:,2]
    est=fs_/(ns*np.sqrt((1+B*ns**2)/(1+B)))
    w=ws**2; return np.sum(w*est)/np.sum(w)

def trial(N,B,snr,trials=25,hp=120.0,weak=True):
    res={k:[] for k in ["gefuehrt (signiert)","Spektrum B je Fenster","Spektrum B gelernt"]}
    per={s[0]:[] for s in STRINGS}
    for name,fstd in STRINGS:
        for k in range(trials):
            det=rng.uniform(-40,40); fi=fstd*2**(det/1200)/np.sqrt(1+B)
            y,f1=pluck(fi,B,1.4,snr,hp=hp,seed=int(rng.integers(1e9)),weak_fund=weak)
            hop=2048; frames=[]
            for a in range(int(0.12*FS), len(y)-N, hop): frames.append(a)
            # B lernen ueber Fenster 0.12 bis 0.6 s
            Bs=[]
            for a in frames:
                if a>0.6*FS: break
                seg=y[a:a+N]; g,_=guided_nsdf(seg,fstd); Bs.append(fitB(partials(seg,g)))
            Bl=float(np.nanmedian(Bs)) if np.any(np.isfinite(Bs)) else 0.0
            a=int(0.5*FS); seg=y[a:a+N]; truth=np.mean(f1[a:a+N])
            g,_=guided_nsdf(seg,fstd); p=partials(seg,g)
            res["gefuehrt (signiert)"].append(cents(g,truth))
            res["Spektrum B je Fenster"].append(cents(spectral_refine(seg,g),truth))
            e=cents(f1_fixedB(p,Bl),truth); res["Spektrum B gelernt"].append(e); per[name].append(abs(e))
    return res,per

if __name__=='__main__':
 import sys
 cases=[(float(a),int(b)) for a,b in (c.split(':') for c in sys.argv[1:])] or [(B,s) for B in (0.0,1e-4,4e-4) for s in (15,5)]
 for B,snr in cases:
  if True:
    r,per=trial(8192,B,snr)
    print(f"B={B:.0e} SNR={snr}dB")
    for k,v in r.items():
        v=np.array(v); print(f"   {k:24s} Mittel {v.mean():+6.2f}  |med| {np.median(np.abs(v)):5.2f}  p95 {np.percentile(np.abs(v),95):5.2f}  max {np.abs(v).max():6.2f}")
    print("   je Saite p95 (B gelernt):", {s:round(float(np.percentile(e,95)),2) for s,e in per.items()})

"""Vergleich von Tonhoehenverfahren an kuenstlichen Gitarrentoenen.

Gemessen wird die Abweichung in Cent gegenueber dem wahren Grundton f1
(dem tatsaechlich schwingenden ersten Teilton) im Messfenster.
"""
import numpy as np
from scipy.signal import butter, sosfilt

FS = 48000
STRINGS = [("E2", 82.4069), ("A2", 110.0), ("D3", 146.832), ("G3", 195.998), ("B3", 246.942), ("E4", 329.628)]
rng = np.random.default_rng(1)

def cents(a, b):
    return 1200 * np.log2(a / b)

# ---------------- Synthese ----------------
def pluck(f_ideal, B, dur, snr_db, hum=True, hp=120.0, glide=4.0, glide_tau=0.15, weak_fund=True, seed=None):
    """f_ideal: Grundfrequenz der idealen Saite; Teiltoene n*f*sqrt(1+B n^2).
    Anschlag: Tonhoehe startet 'glide' Cent hoeher und faellt mit glide_tau ab."""
    r = np.random.default_rng(seed)
    t = np.arange(int(dur * FS)) / FS
    glide_c = glide * np.exp(-t / glide_tau)          # Cent
    scale = 2 ** (glide_c / 1200)
    x = np.zeros_like(t)
    for n in range(1, 21):
        fn = n * f_ideal * np.sqrt(1 + B * n * n)
        if fn > FS / 2.2:
            break
        amp = 1.0 / n ** 0.9
        if weak_fund and n == 1:
            amp *= 0.35                                 # Grundton oft schwaecher als 2. Teilton
        if n == 2:
            amp *= 1.3
        decay = 1.2 + 0.35 * n                           # hoehere Teiltoene klingen schneller aus
        phase = np.cumsum(2 * np.pi * fn * scale / FS) + r.uniform(0, 2 * np.pi)
        x += amp * np.exp(-decay * t) * np.sin(phase)
    sig_rms = np.sqrt(np.mean(x[: int(0.6 * FS)] ** 2))
    noise = r.standard_normal(len(t))
    # etwas rosa Anteil
    noise = np.convolve(noise, np.ones(4) / 2, mode="same")
    noise *= sig_rms / np.sqrt(np.mean(noise ** 2)) * 10 ** (-snr_db / 20)
    y = x + noise
    if hum:  # Netzbrummen 50 Hz und Oberwellen
        for k, a in [(1, 0.15), (2, 0.08), (3, 0.05)]:
            y += sig_rms * a * np.sin(2 * np.pi * 50 * k * t + r.uniform(0, 6.28))
    if hp:   # Handymikrofon: tiefe Frequenzen werden gedaempft
        sos = butter(2, hp, "highpass", fs=FS, output="sos")
        y = sosfilt(sos, y)
    f1_true = f_ideal * np.sqrt(1 + B) * scale           # wahrer erster Teilton ueber die Zeit
    return y, f1_true

# ---------------- Verfahren ----------------
def parabolic(y, i):
    if i <= 0 or i >= len(y) - 1:
        return float(i)
    a, b, c = y[i - 1], y[i], y[i + 1]
    d = a - 2 * b + c
    return i + 0.5 * (a - c) / d if d != 0 else float(i)

def diff_fn(x, maxlag):
    # d(tau) = sum (x_j - x_{j+tau})^2 ueber feste Laenge W
    W = len(x) - maxlag
    x0 = x[:W]
    e0 = np.sum(x0 ** 2)
    cs = np.concatenate([[0], np.cumsum(x ** 2)])
    corr = np.array([np.dot(x0, x[tau:tau + W]) for tau in range(maxlag + 1)])
    et = cs[np.arange(maxlag + 1) + W] - cs[np.arange(maxlag + 1)]
    return e0 + et - 2 * corr, e0 + et

def yin(x, fmin=60, fmax=1000, thr=0.12):
    maxlag = int(FS / fmin)
    d, _ = diff_fn(x, maxlag)
    cm = np.ones_like(d)
    cs = np.cumsum(d[1:])
    cm[1:] = d[1:] * np.arange(1, len(d)) / np.where(cs == 0, 1, cs)
    lo = int(FS / fmax)
    idx = None
    for tau in range(lo, maxlag):
        if cm[tau] < thr:
            while tau + 1 < maxlag and cm[tau + 1] < cm[tau]:
                tau += 1
            idx = tau
            break
    if idx is None:
        idx = lo + int(np.argmin(cm[lo:maxlag]))
    return FS / parabolic(-cm, idx)

def nsdf(x, maxlag):
    d, m = diff_fn(x, maxlag)
    return 1 - d / np.where(m == 0, 1, m)

def mpm(x, fmin=60, fmax=1000, k=0.9):
    maxlag = int(FS / fmin)
    n = nsdf(x, maxlag)
    lo = int(FS / fmax)
    # Schluesselmaxima zwischen positiven Nulldurchgaengen
    peaks = []
    i = lo
    while i < maxlag and n[i] > 0:
        i += 1
    while i < maxlag:
        while i < maxlag and n[i] <= 0:
            i += 1
        best = None
        while i < maxlag and n[i] > 0:
            if best is None or n[i] > n[best]:
                best = i
            i += 1
        if best is not None and 0 < best < maxlag - 1:
            peaks.append(best)
    if not peaks:
        return np.nan
    top = max(n[p] for p in peaks)
    for p in peaks:
        if n[p] >= k * top:
            return FS / parabolic(n, p)
    return np.nan

def guided_nsdf(x, f_target, semis=7):
    """Gefuehrt: nur Perioden im Bereich der Zielsaite +- semis Halbtoene."""
    lo = int(FS / (f_target * 2 ** (semis / 12)))
    hi = int(FS / (f_target * 2 ** (-semis / 12))) + 2
    n = nsdf(x, hi + 1)
    p = lo + int(np.argmax(n[lo:hi]))
    return FS / parabolic(n, p), n[p]

def spectral_refine(x, f_coarse, nmax=8):
    """Teiltoene einzeln im Spektrum vermessen und mit f_n = n f0 sqrt(1+B n^2)
    ausgleichen. Liefert den ersten Teilton f1 = f0 sqrt(1+B)."""
    N = len(x)
    w = np.hanning(N)
    nfft = 1 << int(np.ceil(np.log2(N * 8)))
    X = np.abs(np.fft.rfft(x * w, nfft)) + 1e-12
    L = np.log(X)
    df = FS / nfft
    ns, fs_, ws = [], [], []
    for n in range(1, nmax + 1):
        fc = n * f_coarse
        if fc > 4500:
            break
        lo = int((fc * 2 ** (-40 / 1200)) / df)
        hi = int((fc * 2 ** (40 / 1200)) / df) + 1
        i = lo + int(np.argmax(X[lo:hi]))
        if i in (lo, hi - 1):
            continue
        fi = parabolic(L, i) * df
        mag = X[i]
        ns.append(n); fs_.append(fi); ws.append(mag)
    ns, fs_, ws = map(np.array, (ns, fs_, ws))
    if len(ns) < 2:
        return f_coarse
    ws = ws / ws.max()
    keep = ws > 0.05
    ns, fs_, ws = ns[keep], fs_[keep], ws[keep]
    if len(ns) < 2:
        return f_coarse
    yv = (fs_ / ns) ** 2
    A = np.vstack([np.ones_like(ns, dtype=float), ns.astype(float) ** 2]).T
    W = np.diag(ws ** 2)
    coef = np.linalg.lstsq(np.sqrt(W) @ A, np.sqrt(W) @ yv, rcond=None)[0]
    f0sq, slope = coef
    if f0sq <= 0:
        return f_coarse
    B = max(slope / f0sq, 0.0)
    return np.sqrt(f0sq) * np.sqrt(1 + B)

def spectral_harm_only(x, f_coarse, nmax=8):
    """Wie oben, aber ohne Inharmonizitaet (einfacher Mittelwert f_n/n, gewichtet)."""
    N = len(x); w = np.hanning(N)
    nfft = 1 << int(np.ceil(np.log2(N * 8)))
    X = np.abs(np.fft.rfft(x * w, nfft)) + 1e-12; L = np.log(X); df = FS / nfft
    num = den = 0.0
    for n in range(1, nmax + 1):
        fc = n * f_coarse
        if fc > 4500: break
        lo = int((fc * 2 ** (-40 / 1200)) / df); hi = int((fc * 2 ** (40 / 1200)) / df) + 1
        i = lo + int(np.argmax(X[lo:hi]))
        if i in (lo, hi - 1): continue
        fi = parabolic(L, i) * df
        num += X[i] ** 2 * fi / n; den += X[i] ** 2
    return num / den if den else f_coarse

# ---------------- Versuch ----------------
def run(N, B, snr, t_meas, trials=40, detune_max=40, hp=120.0):
    methods = ["YIN", "MPM", "gefuehrt", "gefuehrt+Spektrum", "Spektrum ohne B"]
    errs = {m: [] for m in methods}
    for s, (name, fstd) in enumerate(STRINGS):
        for k in range(trials):
            det = rng.uniform(-detune_max, detune_max)
            f_ideal = fstd * 2 ** (det / 1200) / np.sqrt(1 + B)
            y, f1 = pluck(f_ideal, B, t_meas + N / FS + 0.05, snr, hp=hp, seed=int(rng.integers(1e9)))
            a = int(t_meas * FS)
            seg = y[a:a + N]
            truth = np.mean(f1[a:a + N])
            g, _ = guided_nsdf(seg, fstd)
            est = {
                "YIN": yin(seg),
                "MPM": mpm(seg),
                "gefuehrt": g,
                "gefuehrt+Spektrum": spectral_refine(seg, g),
                "Spektrum ohne B": spectral_harm_only(seg, g),
            }
            for m in methods:
                e = cents(est[m], truth) if np.isfinite(est[m]) else 1e4
                errs[m].append(e)
    out = {}
    for m in methods:
        e = np.array(errs[m])
        gross = np.abs(e) > 50
        fine = np.abs(e[~gross])
        out[m] = (100 * gross.mean(), np.median(fine) if len(fine) else np.nan, np.percentile(fine, 95) if len(fine) else np.nan)
    return out

if __name__ == "__main__":
    import sys
    for N in (4096, 8192):
        for B in (1e-4, 4e-4):
            for snr in (30, 15, 5):
                for tm in (0.05, 0.5):
                    r = run(N, B, snr, tm, trials=25)
                    print(f"N={N:5d} B={B:.0e} SNR={snr:2d}dB t={tm:.2f}s | " +
                          " | ".join(f"{m}: grob {g:4.1f}% med {md:5.2f} p95 {p:5.2f}" for m, (g, md, p) in r.items()))
                    sys.stdout.flush()

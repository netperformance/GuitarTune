package de.aaron.pitchdetector

import kotlin.math.PI
import kotlin.math.exp
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.random.Random

/**
 * Künstlicher Gitarrenton für Tests, wie in research/lab.py:
 * steife Saite (Teiltöne n f sqrt(1 + B n²)), schwacher Grundton, höhere Teiltöne klingen
 * schneller aus, beim Anschlag kurz höher, Rauschen, Netzbrummen 50 Hz und ein Mikrofon,
 * das tiefe Töne dämpft (Hochpass 2. Ordnung bei 120 Hz).
 */
object GuitarSynth {
  class Tone(val samples: FloatArray, val f1: DoubleArray)

  fun pluck(
    f1Target: Double,
    stiffness: Double,
    seconds: Double,
    snrDb: Double,
    seed: Int,
    sampleRate: Int = 48000,
    glideCents: Double = 4.0,
    glideTau: Double = 0.15,
    hum: Boolean = true,
    highpassHz: Double = 120.0,
    silenceBefore: Double = 0.2,
    gain: Double = 0.3,
  ): Tone {
    val r = Random(seed)
    val pre = (silenceBefore * sampleRate).toInt()
    val n = pre + (seconds * sampleRate).toInt()
    val x = DoubleArray(n)
    val f1 = DoubleArray(n)
    val fIdeal = f1Target / sqrt(1 + stiffness)
    for (k in 1..20) {
      val fk = k * fIdeal * sqrt(1 + stiffness * k * k)
      if (fk > sampleRate / 2.2) break
      var amp = 1.0 / k.toDouble().pow(0.9)
      if (k == 1) amp *= 0.35
      if (k == 2) amp *= 1.3
      val decay = 1.2 + 0.35 * k
      var phase = r.nextDouble() * 2 * PI
      for (i in pre until n) {
        val t = (i - pre).toDouble() / sampleRate
        val scale = 2.0.pow(glideCents * exp(-t / glideTau) / 1200)
        phase += 2 * PI * fk * scale / sampleRate
        x[i] += amp * exp(-decay * t) * sin(phase)
      }
    }
    for (i in pre until n) {
      val t = (i - pre).toDouble() / sampleRate
      f1[i] = f1Target * 2.0.pow(glideCents * exp(-t / glideTau) / 1200)
    }
    var e = 0.0
    val ref = minOf(n, pre + (0.6 * sampleRate).toInt())
    for (i in pre until ref) e += x[i] * x[i]
    val sigRms = sqrt(e / (ref - pre))
    // Rauschen mit etwas tieferem Anteil
    val white = DoubleArray(n) { r.nextGaussian() }
    val noise = DoubleArray(n)
    for (i in 0 until n) { var s = 0.0; for (j in -2..1) { val q = i + j; if (q in 0 until n) s += white[q] }; noise[i] = s / 2 }
    var ne = 0.0; for (v in noise) ne += v * v
    val nScale = sigRms / sqrt(ne / n) * 10.0.pow(-snrDb / 20)
    val y = DoubleArray(n) { x[it] + noise[it] * nScale }
    if (hum) {
      val ph = DoubleArray(3) { r.nextDouble() * 6.28 }
      for (i in 0 until n) {
        val t = i.toDouble() / sampleRate
        y[i] += sigRms * (0.15 * sin(2 * PI * 50 * t + ph[0]) + 0.08 * sin(2 * PI * 100 * t + ph[1]) + 0.05 * sin(2 * PI * 150 * t + ph[2]))
      }
    }
    val out = if (highpassHz > 0) highpass(y, highpassHz, sampleRate) else y
    var peak = 0.0; for (v in out) peak = maxOf(peak, kotlin.math.abs(v))
    return Tone(FloatArray(n) { (out[it] / peak * gain).toFloat() }, f1)
  }

  private fun Random.nextGaussian(): Double {
    var u: Double; var v: Double; var s: Double
    do { u = nextDouble() * 2 - 1; v = nextDouble() * 2 - 1; s = u * u + v * v } while (s >= 1 || s == 0.0)
    return u * sqrt(-2 * kotlin.math.ln(s) / s)
  }

  /** Butterworth Hochpass 2. Ordnung (bilineare Transformation). */
  private fun highpass(x: DoubleArray, fc: Double, fs: Int): DoubleArray {
    val k = kotlin.math.tan(PI * fc / fs)
    val q = 1 / sqrt(2.0)
    val norm = 1 / (1 + k / q + k * k)
    val b0 = norm; val b1 = -2 * norm; val b2 = norm
    val a1 = 2 * (k * k - 1) * norm; val a2 = (1 - k / q + k * k) * norm
    val y = DoubleArray(x.size)
    var x1 = 0.0; var x2 = 0.0; var y1 = 0.0; var y2 = 0.0
    for (i in x.indices) {
      val v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
      x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v
    }
    return y
  }
}

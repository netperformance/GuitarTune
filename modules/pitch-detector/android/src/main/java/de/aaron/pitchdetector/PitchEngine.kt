package de.aaron.pitchdetector

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.ln
import kotlin.math.log10
import kotlin.math.log2
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sqrt

/**
 * Tonerkennung für eine bekannte Zielsaite. Reines Kotlin ohne Android, damit sie
 * auf dem Rechner getestet werden kann (siehe PitchEngineTest und research/).
 *
 * Ablauf je Messung (alle `hop` Messwerte über ein Fenster von `window` Messwerten):
 *  1. Pegel prüfen und Anschläge erkennen. Die ersten 120 ms nach einem Anschlag
 *     werden nicht ausgewertet, weil die Saite dort höher klingt.
 *  2. Grobsuche: Selbstähnlichkeit des Signals (NSDF nach McLeod) nur im Bereich
 *     der Zielsaite plus/minus 7 Halbtöne. Dadurch keine Oktavfehler.
 *  3. Feinmessung: die ersten 8 Teiltöne einzeln im Spektrum vermessen und mit der
 *     Formel für steife Saiten f_n = n f0 sqrt(1 + B n²) auf den ersten Teilton
 *     zurückrechnen. B wird je Saite gelernt und dann festgehalten.
 *  4. Unsichere Messungen verwerfen, gültige über die letzten 5 Messungen mitteln (Median).
 */
class PitchEngine(
  val sampleRate: Int = 48000,
  val window: Int = 8192,
  val hop: Int = 2048,
) {
  enum class State { SILENT, ATTACK, UNSURE, VALID }

  data class Reading(
    val state: State,
    /** Erster Teilton in Hz, geglättet. 0, wenn nicht gültig. */
    val hz: Double,
    /** Abweichung von der Zielsaite in Cent, geglättet. */
    val cents: Double,
    /** Pegel des Fensters in dBFS. */
    val levelDb: Double,
    /** Güte der Grobsuche, 0 bis 1. */
    val clarity: Double,
    /** Gelernte Steifigkeit der Saite (0, solange noch nicht gelernt). */
    val stiffness: Double,
  )

  private val buffer = DoubleArray(window)
  private var filled = 0
  private var sinceHop = 0
  private var totalSamples = 0L

  private val hann = DoubleArray(window) { 0.5 - 0.5 * cos(2 * PI * it / (window - 1)) }
  private val specSize = Integer.highestOneBit(window * 8 - 1) shl 1
  private val specFft = Fft(specSize)
  private val specRe = DoubleArray(specSize)
  private val specIm = DoubleArray(specSize)
  private val mag = DoubleArray(specSize / 2)
  private val acfSize = Integer.highestOneBit(window * 2 - 1) shl 1
  private val acfFft = Fft(acfSize)
  private val acfRe = DoubleArray(acfSize)
  private val acfIm = DoubleArray(acfSize)
  private val frame = DoubleArray(window)

  private var target = 82.4069
  private var lastHopEnergy = 0.0
  private var onsetAt = Long.MIN_VALUE / 2
  private val recent = ArrayDeque<Double>()
  private val stiffnessByTarget = HashMap<Long, MutableList<Double>>()

  fun setTarget(hz: Double) {
    if (abs(hz - target) > 1e-6) {
      target = hz
      recent.clear()
    }
  }

  fun reset() {
    filled = 0; sinceHop = 0; totalSamples = 0; lastHopEnergy = 0.0
    onsetAt = Long.MIN_VALUE / 2
    recent.clear()
  }

  /** Neue Messwerte anhängen. Ruft [onReading] für jede fertige Messung auf. */
  fun push(samples: FloatArray, count: Int = samples.size, onReading: (Reading) -> Unit) {
    var i = 0
    while (i < count) {
      val n = min(count - i, window - filled)
      // Ringpuffer als einfaches Schieberegister: neue Werte hinten anhängen
      if (filled + n > window) error("Puffer überlaufen")
      for (k in 0 until n) buffer[filled + k] = samples[i + k].toDouble()
      filled += n; sinceHop += n; totalSamples += n; i += n
      if (filled == window) {
        if (sinceHop >= hop) {
          sinceHop = 0
          onReading(analyze())
        }
        // um einen Hop weiterschieben
        System.arraycopy(buffer, hop, buffer, 0, window - hop)
        filled = window - hop
      }
    }
  }

  /** Analysiert das aktuelle, volle Fenster. */
  fun analyze(): Reading {
    val windowStart = totalSamples - window
    // Pegel und Anschlag (Energie des neuesten Hops gegen den davor)
    var sum = 0.0
    for (k in 0 until window) sum += buffer[k]
    val mean = sum / window
    var energy = 0.0
    for (k in 0 until window) { val v = buffer[k] - mean; frame[k] = v; energy += v * v }
    val rms = sqrt(energy / window)
    val levelDb = if (rms > 0) 20 * log10(rms) else -120.0
    var hopEnergy = 0.0
    for (k in window - hop until window) hopEnergy += frame[k] * frame[k]
    hopEnergy /= hop
    if (hopEnergy > MIN_RMS * MIN_RMS * 4 && hopEnergy > lastHopEnergy * ONSET_RATIO) {
      onsetAt = totalSamples - hop
      recent.clear()
    }
    lastHopEnergy = hopEnergy
    val stiff = learnedStiffness() ?: 0.0
    if (rms < MIN_RMS) return Reading(State.SILENT, 0.0, 0.0, levelDb, 0.0, stiff)
    if (windowStart < onsetAt + (ATTACK_SKIP_S * sampleRate).toLong()) return Reading(State.ATTACK, 0.0, 0.0, levelDb, 0.0, stiff)

    val (coarse, clarity) = coarsePitch()
    if (coarse <= 0 || clarity < MIN_CLARITY) return unsure(levelDb, clarity, stiff)

    val partials = measurePartials(coarse)
    if (partials.size < 2) return unsure(levelDb, clarity, stiff)

    // Steifigkeit in der frühen Ausklingphase lernen
    val age = (windowStart - onsetAt).toDouble() / sampleRate
    val fitted = fitStiffness(partials)
    if (fitted != null && partials.size >= 3 && age <= LEARN_UNTIL_S) {
      val list = stiffnessByTarget.getOrPut(key()) { ArrayList() }
      list.add(fitted)
      if (list.size > 40) list.removeAt(0)
    }
    val b = learnedStiffness() ?: fitted ?: 0.0

    // Grundton aus jedem Teilton zurückrechnen und gewichtet mitteln
    var wSum = 0.0; var fSum = 0.0
    val est = DoubleArray(partials.size)
    for ((idx, p) in partials.withIndex()) {
      val n = p.n.toDouble()
      val f1 = p.freq / (n * sqrt((1 + b * n * n) / (1 + b)))
      est[idx] = f1
      val w = p.weight * p.weight
      wSum += w; fSum += w * f1
    }
    val f1 = fSum / wSum
    // Passen die Teiltöne zusammen? Gewichtete Streuung in Cent
    var spread = 0.0
    for ((idx, p) in partials.withIndex()) { val c = cents(est[idx], f1); spread += p.weight * p.weight * c * c }
    spread = sqrt(spread / wSum)
    if (spread > MAX_SPREAD_CENTS || abs(cents(f1, coarse)) > 35) return unsure(levelDb, clarity, b)

    recent.addLast(f1)
    while (recent.size > SMOOTH) recent.removeFirst()
    val smoothed = median(recent)
    return Reading(State.VALID, smoothed, cents(smoothed, target), levelDb, clarity, b)
  }

  private fun unsure(levelDb: Double, clarity: Double, b: Double) = Reading(State.UNSURE, 0.0, 0.0, levelDb, clarity, b)

  private fun key() = Math.round(target * 100)

  private fun learnedStiffness(): Double? {
    val list = stiffnessByTarget[key()] ?: return null
    if (list.size < 3) return null
    return median(list)
  }

  /** Grobsuche nach McLeod (NSDF) im Bereich der Zielsaite. Liefert Frequenz und Güte. */
  private fun coarsePitch(): Pair<Double, Double> {
    // Autokorrelation über FFT
    java.util.Arrays.fill(acfRe, 0.0); java.util.Arrays.fill(acfIm, 0.0)
    for (k in 0 until window) acfRe[k] = frame[k]
    acfFft.transform(acfRe, acfIm)
    for (k in 0 until acfSize) { acfRe[k] = acfRe[k] * acfRe[k] + acfIm[k] * acfIm[k]; acfIm[k] = 0.0 }
    acfFft.transform(acfRe, acfIm, inverse = true)
    val lo = max(2, (sampleRate / (target * 2.0.pow(RANGE_SEMITONES / 12.0))).toInt())
    val hi = min(window / 2, (sampleRate / (target * 2.0.pow(-RANGE_SEMITONES / 12.0))).toInt() + 2)
    // m'(tau) = Summe x_j² + x_{j+tau}² über j = 0 .. W-1-tau, schrittweise
    val nsdf = DoubleArray(hi + 2)
    var m = 0.0
    for (k in 0 until window) m += 2 * frame[k] * frame[k]
    for (tau in 0..hi + 1) {
      if (tau > 0) m -= frame[tau - 1] * frame[tau - 1] + frame[window - tau] * frame[window - tau]
      val r = acfRe[tau] / acfSize
      nsdf[tau] = if (m > 0) 2 * r / m else 0.0
    }
    // Schlüsselmaxima im Bereich, erstes Maximum über 90 % des größten
    val peaks = ArrayList<Int>()
    for (tau in lo..hi) if (nsdf[tau] > 0 && nsdf[tau] >= nsdf[tau - 1] && nsdf[tau] > nsdf[tau + 1]) peaks.add(tau)
    if (peaks.isEmpty()) return 0.0 to 0.0
    val top = peaks.maxOf { nsdf[it] }
    val pick = peaks.first { nsdf[it] >= KEY_MAX * top }
    val lag = parabolic(nsdf, pick)
    return sampleRate / lag to nsdf[pick]
  }

  private class Partial(val n: Int, val freq: Double, val weight: Double)

  /** Teiltöne 1 bis 8 im Spektrum suchen und auf Bruchteile eines Frequenzbins genau bestimmen. */
  private fun measurePartials(coarse: Double): List<Partial> {
    java.util.Arrays.fill(specRe, 0.0); java.util.Arrays.fill(specIm, 0.0)
    for (k in 0 until window) specRe[k] = frame[k] * hann[k]
    specFft.transform(specRe, specIm)
    val half = specSize / 2
    for (k in 0 until half) mag[k] = sqrt(specRe[k] * specRe[k] + specIm[k] * specIm[k]) + 1e-12
    val df = sampleRate.toDouble() / specSize
    val found = ArrayList<Partial>()
    var best = 0.0
    for (n in 1..MAX_PARTIALS) {
      val fc = n * coarse
      if (fc > MAX_PARTIAL_HZ) break
      val lo = (fc * 2.0.pow(-SEARCH_CENTS / 1200) / df).toInt()
      val hi = (fc * 2.0.pow(SEARCH_CENTS / 1200) / df).toInt() + 1
      if (lo < 1 || hi >= half - 1) continue
      var i = lo
      for (k in lo..hi) if (mag[k] > mag[i]) i = k
      if (i == lo || i == hi) continue
      val a = ln(mag[i - 1]); val b = ln(mag[i]); val c = ln(mag[i + 1])
      val d = a - 2 * b + c
      val off = if (d != 0.0) 0.5 * (a - c) / d else 0.0
      found.add(Partial(n, (i + off) * df, mag[i]))
      best = max(best, mag[i])
    }
    return found.filter { it.weight > MIN_PARTIAL_SHARE * best }.map { Partial(it.n, it.freq, it.weight / best) }
  }

  /** Ausgleichsrechnung (f_n/n)² = f0² + f0² B n², gewichtet. Liefert B oder null. */
  private fun fitStiffness(p: List<Partial>): Double? {
    if (p.size < 3) return null
    var sw = 0.0; var sx = 0.0; var sy = 0.0; var sxx = 0.0; var sxy = 0.0
    for (q in p) {
      val w = q.weight * q.weight
      val x = (q.n * q.n).toDouble()
      val y = (q.freq / q.n).pow(2)
      sw += w; sx += w * x; sy += w * y; sxx += w * x * x; sxy += w * x * y
    }
    val det = sw * sxx - sx * sx
    if (abs(det) < 1e-12) return null
    val slope = (sw * sxy - sx * sy) / det
    val icpt = (sy - slope * sx) / sw
    if (icpt <= 0) return null
    return (slope / icpt).coerceIn(0.0, MAX_STIFFNESS)
  }

  companion object {
    const val MIN_RMS = 0.0015 // etwa -56 dBFS
    const val ONSET_RATIO = 2.5
    const val ATTACK_SKIP_S = 0.12
    const val LEARN_UNTIL_S = 0.6
    const val RANGE_SEMITONES = 7.0
    const val KEY_MAX = 0.9
    const val MIN_CLARITY = 0.3
    const val MAX_PARTIALS = 8
    const val MAX_PARTIAL_HZ = 4500.0
    const val SEARCH_CENTS = 40.0
    const val MIN_PARTIAL_SHARE = 0.05
    const val MAX_STIFFNESS = 0.002
    const val MAX_SPREAD_CENTS = 8.0
    const val SMOOTH = 5

    fun cents(f: Double, ref: Double) = 1200 * log2(f / ref)

    fun parabolic(y: DoubleArray, i: Int): Double {
      if (i <= 0 || i >= y.size - 1) return i.toDouble()
      val a = y[i - 1]; val b = y[i]; val c = y[i + 1]
      val d = a - 2 * b + c
      return if (d != 0.0) i + 0.5 * (a - c) / d else i.toDouble()
    }

    fun median(values: Collection<Double>): Double {
      val s = values.sorted()
      val n = s.size
      return if (n % 2 == 1) s[n / 2] else 0.5 * (s[n / 2 - 1] + s[n / 2])
    }
  }
}

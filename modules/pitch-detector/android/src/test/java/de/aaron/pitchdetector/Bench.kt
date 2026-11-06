package de.aaron.pitchdetector

import kotlin.math.abs
import kotlin.math.pow
import kotlin.random.Random

/** Lässt künstliche Anschläge durch die Tonerkennung laufen und wertet die Fehler aus. */
object Bench {
  val STRINGS = doubleArrayOf(82.4069, 110.0, 146.832, 195.998, 246.942, 329.628)

  class Result(
    val readings: Int,
    val grossPercent: Double,
    val p50: Double,
    val p95: Double,
    val max: Double,
    /** Anteil der Messungen zwischen 0,4 und 1,2 s, die gültig waren. */
    val availability: Double,
    /** Median der Zeit vom Anschlag bis zur ersten gültigen Messung in Sekunden. */
    val firstValidS: Double,
  ) {
    override fun toString() =
      "Messungen $readings, grob ${"%.1f".format(grossPercent)} %, Median ${"%.2f".format(p50)} Cent, 95 % ${"%.2f".format(p95)} Cent, max ${"%.1f".format(max)}, gültig ${"%.0f".format(availability * 100)} %, erste gültige nach ${"%.2f".format(firstValidS)} s"
  }

  fun run(stiffness: Double, snrDb: Double, plucks: Int = 10, seed: Int = 7, detuneCents: Double = 40.0): Result {
    val rnd = Random(seed)
    val errors = ArrayList<Double>()
    var slots = 0; var valid = 0
    val firsts = ArrayList<Double>()
    for (target in STRINGS) {
      val engine = PitchEngine()
      engine.setTarget(target)
      repeat(plucks) {
        val det = (rnd.nextDouble() * 2 - 1) * detuneCents
        val f1 = target * 2.0.pow(det / 1200)
        val pre = 0.2
        val tone = GuitarSynth.pluck(f1, stiffness, 1.4, snrDb, rnd.nextInt(), silenceBefore = pre)
        engine.reset()
        var t = 0
        var first = Double.NaN
        engine.push(tone.samples) { r ->
          t += engine.hop
          val endSample = t + engine.window - engine.hop // Ende des Fensters (erstes Fenster nach window Messwerten)
          val endS = endSample.toDouble() / engine.sampleRate - pre
          if (r.state == PitchEngine.State.VALID && first.isNaN()) first = endS
          if (endS in 0.4..1.2) {
            slots++
            if (r.state == PitchEngine.State.VALID) {
              valid++
              val center = (endSample - engine.window / 2).coerceIn(0, tone.f1.size - 1)
              errors.add(PitchEngine.cents(r.hz, tone.f1[center]))
            }
          }
        }
        if (!first.isNaN()) firsts.add(first)
      }
    }
    val absErr = errors.map { abs(it) }
    val gross = absErr.count { it > 50 }
    val fine = absErr.filter { it <= 50 }.sorted()
    fun pct(p: Double) = if (fine.isEmpty()) Double.NaN else fine[((fine.size - 1) * p).toInt()]
    return Result(
      errors.size,
      if (errors.isEmpty()) 100.0 else 100.0 * gross / errors.size,
      pct(0.5), pct(0.95), fine.lastOrNull() ?: Double.NaN,
      if (slots == 0) 0.0 else valid.toDouble() / slots,
      if (firsts.isEmpty()) Double.NaN else PitchEngine.median(firsts),
    )
  }
}

fun main() {
  for (b in doubleArrayOf(0.0, 1.1e-4, 4e-4)) for (snr in doubleArrayOf(30.0, 15.0, 5.0)) {
    val t0 = System.nanoTime()
    val r = Bench.run(b, snr)
    val ms = (System.nanoTime() - t0) / 1e6
    println("B=$b SNR=$snr dB: $r  (${"%.0f".format(ms)} ms)")
  }
}

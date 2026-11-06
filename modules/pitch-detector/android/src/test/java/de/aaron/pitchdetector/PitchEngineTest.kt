package de.aaron.pitchdetector

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs
import kotlin.math.pow

/**
 * Grenzwerte aus research/Recherche_Tonerkennung.md. Läuft mit
 * `./gradlew :pitch-detector:testDebugUnitTest` (build-apk.sh ruft das vor dem Bau auf).
 */
class PitchEngineTest {
  @Test fun normalRoomIsWithinOneCent() {
    val r = Bench.run(stiffness = 1.1e-4, snrDb = 15.0, plucks = 3)
    println("Zimmer: $r")
    assertEquals(0.0, r.grossPercent, 0.0)
    assertTrue("95 % unter 1,5 Cent, war ${r.p95}", r.p95 < 1.5)
    assertTrue("mindestens 80 % gültig, war ${r.availability}", r.availability > 0.8)
  }

  @Test fun loudRoomStaysAccurate() {
    val r = Bench.run(stiffness = 4e-4, snrDb = 5.0, plucks = 3, seed = 11)
    println("Laut: $r")
    assertEquals(0.0, r.grossPercent, 0.0)
    assertTrue("95 % unter 3 Cent, war ${r.p95}", r.p95 < 3.0)
    assertTrue("mindestens 25 % gültig, war ${r.availability}", r.availability > 0.25)
  }

  @Test fun stronglyDetunedStringIsReadInTheRightOctave() {
    for (semis in doubleArrayOf(-5.0, -2.0, 2.0, 5.0)) {
      val target = 110.0
      val f = target * 2.0.pow(semis / 12)
      val e = PitchEngine(); e.setTarget(target)
      val tone = GuitarSynth.pluck(f, 1e-4, 1.2, 20.0, seed = semis.toInt() + 50)
      val got = ArrayList<Double>()
      e.push(tone.samples) { if (it.state == PitchEngine.State.VALID) got.add(it.cents) }
      assertTrue("keine Messung bei $semis Halbtönen", got.isNotEmpty())
      val med = PitchEngine.median(got)
      assertTrue("bei $semis Halbtönen gemessen $med Cent", abs(med - semis * 100) < 3)
    }
  }

  @Test fun silenceIsReportedAsSilent() {
    val e = PitchEngine(); e.setTarget(82.4069)
    val states = HashSet<PitchEngine.State>()
    e.push(FloatArray(48000) { 0f }) { states.add(it.state) }
    assertEquals(setOf(PitchEngine.State.SILENT), states)
  }

  @Test fun worksAt44100() {
    val e = PitchEngine(sampleRate = 44100); e.setTarget(196.0)
    val tone = GuitarSynth.pluck(196.0 * 2.0.pow(7.0 / 1200), 2e-4, 1.2, 20.0, seed = 3, sampleRate = 44100)
    val got = ArrayList<Double>()
    e.push(tone.samples) { if (it.state == PitchEngine.State.VALID) got.add(it.cents) }
    assertTrue(got.isNotEmpty())
    assertTrue("gemessen ${PitchEngine.median(got)}", abs(PitchEngine.median(got) - 7) < 1.5)
  }

  @Test fun attackIsSkipped() {
    val e = PitchEngine(); e.setTarget(146.832)
    val tone = GuitarSynth.pluck(146.832, 1e-4, 0.5, 20.0, seed = 9, silenceBefore = 0.5)
    val states = ArrayList<PitchEngine.State>()
    e.push(tone.samples) { states.add(it.state) }
    assertTrue("Anschlag nicht erkannt: $states", states.contains(PitchEngine.State.ATTACK))
  }
}

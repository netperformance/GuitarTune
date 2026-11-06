package de.aaron.pitchdetector

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * Schnelle Fourier-Transformation (Radix 2, in place) für eine feste Länge.
 * Tabellen für Drehfaktoren und Bitumkehr werden einmal angelegt, damit pro Messung
 * nichts Neues reserviert werden muss.
 */
class Fft(val size: Int) {
  private val levels: Int
  private val cosTable = DoubleArray(size / 2)
  private val sinTable = DoubleArray(size / 2)
  private val reverse = IntArray(size)

  init {
    require(size >= 2 && size and (size - 1) == 0) { "Länge muss eine Zweierpotenz sein: $size" }
    levels = Integer.numberOfTrailingZeros(size)
    for (i in 0 until size / 2) {
      cosTable[i] = cos(2 * PI * i / size)
      sinTable[i] = sin(2 * PI * i / size)
    }
    for (i in 0 until size) reverse[i] = Integer.reverse(i) ushr (32 - levels)
  }

  /** Vorwärts (inverse = false) oder rückwärts, ohne Skalierung. */
  fun transform(re: DoubleArray, im: DoubleArray, inverse: Boolean = false) {
    for (i in 0 until size) {
      val j = reverse[i]
      if (j > i) {
        var t = re[i]; re[i] = re[j]; re[j] = t
        t = im[i]; im[i] = im[j]; im[j] = t
      }
    }
    val sign = if (inverse) -1.0 else 1.0
    var len = 2
    while (len <= size) {
      val half = len / 2
      val step = size / len
      var start = 0
      while (start < size) {
        var k = 0
        for (j in start until start + half) {
          val wr = cosTable[k]
          val wi = -sign * sinTable[k]
          val l = j + half
          val tr = re[l] * wr - im[l] * wi
          val ti = re[l] * wi + im[l] * wr
          re[l] = re[j] - tr
          im[l] = im[j] - ti
          re[j] += tr
          im[j] += ti
          k += step
        }
        start += len
      }
      len *= 2
    }
  }
}

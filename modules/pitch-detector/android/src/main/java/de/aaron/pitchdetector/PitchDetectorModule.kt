package de.aaron.pitchdetector

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.AudioEffect
import android.media.audiofx.AutomaticGainControl
import android.media.audiofx.NoiseSuppressor
import android.os.Build
import android.os.Process
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Liest das Mikrofon und meldet etwa 23 Mal pro Sekunde die Tonhöhe der Zielsaite
 * an JavaScript (Ereignis "onPitch"). Das Mikrofon läuft nur zwischen start() und stop();
 * die App ruft stop(), sobald sie in den Hintergrund geht. Der Ton wird nirgends gespeichert.
 *
 * Quelle: UNPROCESSED, wenn das Handy sie anbietet (ohne jede Aufbereitung), sonst
 * VOICE_RECOGNITION (Android schreibt dort Rauschunterdrückung und automatische
 * Lautstärke ab Werk aus vor). Angehängte Effekte werden zusätzlich ausgeschaltet.
 */
class PitchDetectorModule : Module() {
  @Volatile private var running = false
  @Volatile private var targetHz = 82.4069
  private var thread: Thread? = null
  private var sourceName = "none"
  private var rate = 0

  override fun definition() = ModuleDefinition {
    Name("PitchDetector")
    Events("onPitch")

    AsyncFunction("start") { hz: Double ->
      targetHz = hz
      if (running) return@AsyncFunction true
      val context = appContext.reactContext ?: return@AsyncFunction false
      if (context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) return@AsyncFunction false
      val record = openRecorder(context.getSystemService(AudioManager::class.java)) ?: return@AsyncFunction false
      running = true
      thread = Thread({ loop(record) }, "GuitarTunePitch").also { it.start() }
      true
    }

    Function("setTarget") { hz: Double -> targetHz = hz }

    AsyncFunction("stop") { stopNow() }

    Function("info") { mapOf("source" to sourceName, "sampleRate" to rate, "running" to running) }

    OnDestroy { stopNow() }
    OnActivityEntersBackground { stopNow() }
  }

  private fun stopNow() {
    running = false
    thread?.join(500)
    thread = null
  }

  private fun openRecorder(am: AudioManager?): AudioRecord? {
    val unprocessed = Build.VERSION.SDK_INT >= Build.VERSION_CODES.N &&
      am?.getProperty(AudioManager.PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED) == "true"
    val sources = if (unprocessed) listOf(MediaRecorder.AudioSource.UNPROCESSED to "unprocessed", MediaRecorder.AudioSource.VOICE_RECOGNITION to "voice_recognition")
    else listOf(MediaRecorder.AudioSource.VOICE_RECOGNITION to "voice_recognition")
    for ((source, name) in sources) for (sr in intArrayOf(48000, 44100)) {
      val min = AudioRecord.getMinBufferSize(sr, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_FLOAT)
      if (min <= 0) continue
      val record = try {
        @Suppress("MissingPermission")
        AudioRecord(source, sr, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_FLOAT, maxOf(min, 2048 * 4 * 4))
      } catch (_: Exception) { null } ?: continue
      if (record.state != AudioRecord.STATE_INITIALIZED) { record.release(); continue }
      sourceName = name; rate = sr
      return record
    }
    return null
  }

  private fun loop(record: AudioRecord) {
    Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO)
    val effects = ArrayList<AudioEffect>()
    val session = record.audioSessionId
    fun off(e: AudioEffect?) { if (e != null) { try { e.enabled = false } catch (_: Exception) {}; effects.add(e) } }
    try { if (NoiseSuppressor.isAvailable()) off(NoiseSuppressor.create(session)) } catch (_: Exception) {}
    try { if (AutomaticGainControl.isAvailable()) off(AutomaticGainControl.create(session)) } catch (_: Exception) {}
    try { if (AcousticEchoCanceler.isAvailable()) off(AcousticEchoCanceler.create(session)) } catch (_: Exception) {}

    val engine = PitchEngine(sampleRate = record.sampleRate)
    var current = targetHz
    engine.setTarget(current)
    val chunk = FloatArray(engine.hop)
    try {
      record.startRecording()
      while (running) {
        val n = record.read(chunk, 0, chunk.size, AudioRecord.READ_BLOCKING)
        if (n <= 0) continue
        val wanted = targetHz
        if (wanted != current) { current = wanted; engine.setTarget(current) }
        engine.push(chunk, n) { r ->
          sendEvent(
            "onPitch",
            mapOf(
              "state" to r.state.name.lowercase(),
              "hz" to r.hz,
              "cents" to r.cents,
              "level" to r.levelDb,
              "clarity" to r.clarity,
              "target" to current,
            ),
          )
        }
      }
    } catch (_: Exception) {
      // Mikrofon von einer anderen App belegt oder entzogen: still beenden
    } finally {
      try { record.stop() } catch (_: Exception) {}
      record.release()
      effects.forEach { try { it.release() } catch (_: Exception) {} }
      running = false
    }
  }
}

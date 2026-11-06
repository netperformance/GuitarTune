import { requireOptionalNativeModule } from 'expo'

/** Eine Messung der Tonerkennung, etwa 23 Mal pro Sekunde. */
export interface PitchEvent {
  /** silent: zu leise; attack: Anschlag, wird übersprungen; unsure: verworfen; valid: gültig */
  state: 'silent' | 'attack' | 'unsure' | 'valid'
  /** Erster Teilton in Hz (nur bei valid). */
  hz: number
  /** Abweichung von der Zielsaite in Cent (nur bei valid). */
  cents: number
  /** Pegel in dBFS. */
  level: number
  clarity: number
  /** Zielsaite, für die gemessen wurde. */
  target: number
}

interface Subscription {
  remove(): void
}

type PitchDetectorModule = {
  start(targetHz: number): Promise<boolean>
  setTarget(targetHz: number): void
  stop(): Promise<void>
  info(): { source: string; sampleRate: number; running: boolean }
  addListener(event: 'onPitch', listener: (e: PitchEvent) => void): Subscription
}

const native = requireOptionalNativeModule<PitchDetectorModule>('PitchDetector')

/** Startet das Mikrofon. false, wenn die Berechtigung fehlt oder kein Mikrofon bereit ist. */
export async function startPitch(targetHz: number): Promise<boolean> {
  if (!native) return false
  try {
    return await native.start(targetHz)
  } catch {
    return false
  }
}

export function setPitchTarget(targetHz: number): void {
  native?.setTarget(targetHz)
}

export async function stopPitch(): Promise<void> {
  await native?.stop().catch(() => {})
}

export function onPitch(listener: (e: PitchEvent) => void): Subscription {
  return native ? native.addListener('onPitch', listener) : { remove() {} }
}

/** Welche Mikrofonquelle läuft (für die Fehlersuche). */
export function pitchInfo(): { source: string; sampleRate: number; running: boolean } | null {
  return native ? native.info() : null
}

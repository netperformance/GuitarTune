import { STRINGS } from './guitar'

/**
 * Logik des geführten Stimmens, ohne Oberfläche, damit sie mit Tests geprüft werden kann.
 *
 * Farbcode (eine Farbe, eine Bedeutung):
 *  wait  Blau    die App wartet auf einen Ton
 *  far   Rot     mehr als 15 Cent daneben
 *  near  Orange  6 bis 15 Cent daneben
 *  ok    Grün    höchstens 5 Cent daneben
 */
export type Zone = 'wait' | 'far' | 'near' | 'ok'

export const OK_CENTS = 5
export const NEAR_CENTS = 15
/** So lange muss eine Saite ohne Unterbrechung stimmen, bis sie als gestimmt gilt. */
export const HOLD_MS = 1000
/** Kurze Lücken ohne gültige Messung unterbrechen das Halten nicht. */
export const HOLD_GAP_MS = 350
/** So lange bleibt die letzte Messung stehen, wenn kein Ton mehr kommt. */
export const KEEP_MS = 1500

export function zoneOf(cents: number | null): Zone {
  if (cents === null) return 'wait'
  const a = Math.abs(cents)
  if (a <= OK_CENTS) return 'ok'
  if (a <= NEAR_CENTS) return 'near'
  return 'far'
}

/** Wort über dem Balken. */
export type Verdict = 'pluck' | 'tooLow' | 'bitLow' | 'inTune' | 'bitHigh' | 'tooHigh'

export function verdictOf(cents: number | null): Verdict {
  if (cents === null) return 'pluck'
  const z = zoneOf(cents)
  if (z === 'ok') return 'inTune'
  if (cents < 0) return z === 'near' ? 'bitLow' : 'tooLow'
  return z === 'near' ? 'bitHigh' : 'tooHigh'
}

export interface Session {
  /** Saite, die gerade dran ist (0 bis 5). */
  target: number
  /** Gestimmte Saiten. */
  done: boolean[]
  /** Letzte gültige Abweichung in Cent, null wenn keine. */
  cents: number | null
  /** Zeitpunkt der letzten gültigen Messung. */
  lastAt: number
  /** Seit wann die Saite ohne Unterbrechung stimmt, null wenn nicht. */
  holdSince: number | null
  /** Zeitpunkt der letzten Messung im grünen Bereich (für kurze Lücken). */
  okAt: number
  /** Alle sechs Saiten gestimmt. */
  finished: boolean
}

export function newSession(): Session {
  return { target: 0, done: STRINGS.map(() => false), cents: null, lastAt: 0, holdSince: null, okAt: 0, finished: false }
}

/** Fortschritt des Haltens, 0 bis 1. */
export function holdProgress(s: Session, now: number): number {
  if (s.holdSince === null) return 0
  return Math.max(0, Math.min(1, (now - s.holdSince) / HOLD_MS))
}

/** Nächste noch nicht gestimmte Saite nach `from`, sonst null. */
export function nextOpen(done: boolean[], from: number): number | null {
  for (let k = 1; k <= done.length; k++) {
    const i = (from + k) % done.length
    if (!done[i]) return i
  }
  return null
}

/**
 * Verarbeitet eine Messung. `cents` ist null, wenn die Messung nicht gültig war
 * (zu leise, Anschlag, unsicher).
 */
export function step(s: Session, cents: number | null, now: number): Session {
  if (s.finished) return s
  let next: Session = { ...s }
  if (cents !== null) {
    next.cents = cents
    next.lastAt = now
    if (Math.abs(cents) <= OK_CENTS) {
      next.okAt = now
      if (next.holdSince === null) next.holdSince = now
    } else {
      next.holdSince = null
    }
  } else {
    if (next.holdSince !== null && now - next.okAt > HOLD_GAP_MS) next.holdSince = null
    if (next.cents !== null && now - next.lastAt > KEEP_MS) next.cents = null
  }
  if (next.holdSince !== null && now - next.holdSince >= HOLD_MS) {
    const done = next.done.slice()
    done[next.target] = true
    const open = nextOpen(done, next.target)
    next = { ...next, done, cents: null, holdSince: null, lastAt: 0, okAt: 0, finished: open === null, target: open ?? next.target }
  }
  return next
}

/** Springt zu einer Saite (Antippen eines Knopfs). Eine gestimmte Saite darf neu gestimmt werden. */
export function jumpTo(s: Session, index: number): Session {
  const done = s.done.slice()
  done[index] = false
  return { ...s, target: index, done, cents: null, holdSince: null, lastAt: 0, okAt: 0, finished: false }
}

/** Wieder von vorn, bei der tiefen E Saite. */
export const restart = (): Session => newSession()

export const doneCount = (s: Session): number => s.done.filter(Boolean).length

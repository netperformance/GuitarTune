/**
 * Die sechs Saiten in Standardstimmung (Kammerton a' = 440 Hz), in der Reihenfolge,
 * in der die App durch das Stimmen führt: von der dicksten zur dünnsten Saite.
 */
export interface GuitarString {
  /** 0 = tiefe E Saite bis 5 = hohe e Saite */
  index: number
  /** Buchstabe auf dem Knopf. Deutsch: H statt B. */
  letter: { de: string; en: string }
  /** Sollfrequenz in Hz */
  hz: number
  /** Seite der Kopfplatte, von vorn gesehen */
  side: 'left' | 'right'
  /** Reihe auf der Kopfplatte, 0 = oben */
  row: 0 | 1 | 2
}

const A4 = 440

/** Frequenz einer Taste (MIDI Nummer) bei a' = 440 Hz. */
export const midiHz = (midi: number): number => A4 * Math.pow(2, (midi - 69) / 12)

export const STRINGS: readonly GuitarString[] = [
  { index: 0, letter: { de: 'E', en: 'E' }, hz: midiHz(40), side: 'left', row: 2 },
  { index: 1, letter: { de: 'A', en: 'A' }, hz: midiHz(45), side: 'left', row: 1 },
  { index: 2, letter: { de: 'D', en: 'D' }, hz: midiHz(50), side: 'left', row: 0 },
  { index: 3, letter: { de: 'G', en: 'G' }, hz: midiHz(55), side: 'right', row: 0 },
  { index: 4, letter: { de: 'H', en: 'B' }, hz: midiHz(59), side: 'right', row: 1 },
  { index: 5, letter: { de: 'e', en: 'e' }, hz: midiHz(64), side: 'right', row: 2 },
]

/** Abweichung in Cent (100 Cent = ein Halbton). */
export const cents = (hz: number, ref: number): number => 1200 * Math.log2(hz / ref)

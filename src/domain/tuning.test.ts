import { describe, expect, it } from 'vitest'
import { cents, midiHz, STRINGS } from './guitar'
import { languageFromLocale } from './lang'
import { HOLD_GAP_MS, HOLD_MS, KEEP_MS, holdProgress, jumpTo, newSession, nextOpen, step, verdictOf, zoneOf, doneCount } from './tuning'

describe('Saiten', () => {
  it('haben die Frequenzen der Standardstimmung', () => {
    const hz = STRINGS.map((s) => Math.round(s.hz * 100) / 100)
    expect(hz).toEqual([82.41, 110, 146.83, 196, 246.94, 329.63])
    expect(midiHz(69)).toBe(440)
  })
  it('rechnen Cent richtig', () => {
    expect(cents(220, 110)).toBeCloseTo(1200)
    expect(cents(110 * Math.pow(2, 10 / 1200), 110)).toBeCloseTo(10)
  })
  it('heißen auf Deutsch H und auf Englisch B', () => {
    expect(STRINGS[4].letter).toEqual({ de: 'H', en: 'B' })
  })
})

describe('Farbcode', () => {
  it('teilt die Abweichung in Bereiche', () => {
    expect(zoneOf(null)).toBe('wait')
    expect(zoneOf(0)).toBe('ok')
    expect(zoneOf(-5)).toBe('ok')
    expect(zoneOf(5.01)).toBe('near')
    expect(zoneOf(-15)).toBe('near')
    expect(zoneOf(15.5)).toBe('far')
  })
  it('wählt das passende Wort', () => {
    expect(verdictOf(null)).toBe('pluck')
    expect(verdictOf(-30)).toBe('tooLow')
    expect(verdictOf(-8)).toBe('bitLow')
    expect(verdictOf(2)).toBe('inTune')
    expect(verdictOf(9)).toBe('bitHigh')
    expect(verdictOf(40)).toBe('tooHigh')
  })
})

describe('Geführtes Stimmen', () => {
  const feed = (s: ReturnType<typeof newSession>, c: number | null, from: number, ms: number, every = 43) => {
    let t = from
    for (; t <= from + ms; t += every) s = step(s, c, t)
    return { s, t }
  }

  it('beginnt mit der tiefen E Saite', () => {
    expect(newSession().target).toBe(0)
  })

  it('hakt eine Saite nach einer Sekunde im grünen Bereich ab und geht weiter', () => {
    const { s } = feed(newSession(), 2, 1000, HOLD_MS + 50)
    expect(s.done[0]).toBe(true)
    expect(s.target).toBe(1)
    expect(s.cents).toBeNull()
  })

  it('hakt nicht ab, wenn der Ton zwischendurch daneben liegt', () => {
    let { s, t } = feed(newSession(), 2, 1000, 600)
    s = step(s, 9, t)
    ;({ s } = feed(s, 2, t + 43, 600))
    expect(s.done[0]).toBe(false)
    expect(holdProgress(s, t + 643)).toBeGreaterThan(0.4)
  })

  it('verzeiht kurze Lücken ohne Messung', () => {
    let { s, t } = feed(newSession(), 1, 0, 500)
    s = step(s, null, t + HOLD_GAP_MS - 100)
    ;({ s } = feed(s, 1, t + HOLD_GAP_MS - 57, 600))
    expect(s.done[0]).toBe(true)
  })

  it('setzt das Halten nach einer langen Lücke zurück', () => {
    let { s, t } = feed(newSession(), 1, 0, 500)
    s = step(s, null, t + HOLD_GAP_MS + 100)
    expect(s.holdSince).toBeNull()
  })

  it('lässt die letzte Messung kurz stehen und wartet dann wieder', () => {
    let s = step(newSession(), -20, 0)
    s = step(s, null, KEEP_MS - 10)
    expect(s.cents).toBe(-20)
    s = step(s, null, KEEP_MS + 10)
    expect(s.cents).toBeNull()
  })

  it('ist nach sechs Saiten fertig', () => {
    let s = newSession()
    let t = 0
    for (let i = 0; i < 6; i++) ({ s, t } = feed(s, 0, t, HOLD_MS + 50))
    expect(s.finished).toBe(true)
    expect(doneCount(s)).toBe(6)
  })

  it('springt beim Antippen zu einer Saite und darf eine gestimmte neu stimmen', () => {
    let { s } = feed(newSession(), 0, 0, HOLD_MS + 50)
    s = jumpTo(s, 0)
    expect(s.target).toBe(0)
    expect(s.done[0]).toBe(false)
    s = jumpTo(s, 4)
    expect(s.target).toBe(4)
  })

  it('überspringt gestimmte Saiten', () => {
    expect(nextOpen([true, true, false, true, false, true], 0)).toBe(2)
    expect(nextOpen([true, true, true, true, false, true], 5)).toBe(4)
    expect(nextOpen([true, true, true, true, true, true], 2)).toBeNull()
  })
})

describe('Sprache', () => {
  it('folgt dem Handy', () => {
    expect(languageFromLocale('de_DE')).toBe('de')
    expect(languageFromLocale('en_US')).toBe('en')
    expect(languageFromLocale(undefined)).toBe('en')
  })
})

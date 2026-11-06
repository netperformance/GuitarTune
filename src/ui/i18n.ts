import { createContext, useContext } from 'react'
import type { Lang } from '../domain/lang'
import type { Verdict } from '../domain/tuning'

const num = (lang: Lang, value: number, digits: number) =>
  value.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })

const sign = (c: number) => (c > 0 ? '+' : c < 0 ? '−' : '±')

/**
 * Alle Texte der Oberfläche auf Deutsch und Englisch. Die Komponenten holen sie mit `useT()`.
 */
const de = {
  appName: 'Guitar Tune',
  settings: 'Einstellungen',
  /** Kleine Zeile oben: Saite mit Alltagshinweis */
  stringHint: [
    'Tiefe E Saite, die dickste',
    'A Saite, die zweitdickste',
    'D Saite, die dritte von oben',
    'G Saite, die dritte von unten',
    'H Saite, die zweitdünnste',
    'Hohe e Saite, die dünnste',
  ],
  verdict: {
    pluck: 'Saite zupfen',
    tooLow: 'Zu tief',
    bitLow: 'Etwas zu tief',
    inTune: 'Stimmt',
    bitHigh: 'Etwas zu hoch',
    tooHigh: 'Zu hoch',
  } as Record<Verdict, string>,
  actionPluck: 'Einmal kräftig anschlagen und klingen lassen',
  actionTighten: 'Die Mechanik etwas spannen',
  actionLoosen: 'Die Mechanik etwas lockern',
  actionHold: 'Kurz klingen lassen, nicht weiterdrehen',
  /** Mehr als 3,5 Halbtöne daneben: oft die falsche Saite gezupft */
  actionCheckString: 'Sehr weit daneben. Ist es die richtige Saite?',
  barLow: 'zu tief',
  barTarget: 'Ziel',
  barHigh: 'zu hoch',
  targetHz: (hz: number) => `Ziel ${num('de', hz, 1)} Hz`,
  reading: (cents: number, hz: number) => `${sign(Math.round(cents))}${Math.abs(Math.round(cents))} Cent  ·  ${num('de', hz, 1)} Hz`,
  progress: (n: number) => `${n} von 6 gestimmt`,
  finished: 'Alle Saiten gestimmt',
  finishedText: 'Viel Spaß beim Spielen',
  again: 'Nochmal',
  tuneString: (letter: string) => `${letter} Saite stimmen`,
  tunedString: (letter: string) => `${letter} Saite, gestimmt`,

  micTitle: 'Mikrofon für die Tonerkennung',
  micText: 'Guitar Tune hört nur zu, solange die App offen ist. Der Ton wird nicht gespeichert und nicht verschickt. Die App hat keinen Internetzugang.',
  micContinue: 'Weiter',
  micDenied: 'Ohne Mikrofon kann Guitar Tune die Saiten nicht hören.',
  micAllow: 'Mikrofon erlauben',
  micOpenSettings: 'In den Android Einstellungen erlauben',
  micBusy: 'Das Mikrofon ist gerade nicht frei. Vielleicht nutzt eine andere App es.',
  retry: 'Erneut versuchen',

  language: 'SPRACHE',
  appearance: 'DARSTELLUNG',
  themeSystem: 'Automatisch',
  themeLight: 'Hell',
  themeDark: 'Dunkel',
  about: 'Kein Konto, kein Internet.\nDer Ton bleibt auf diesem Handy.',
  madeBy: '© Aaron Kreis ·',
  openSource: 'Open Source unter MIT Lizenz',
  microphone: (source: string, rate: number) => `Mikrofon: ${source}, ${num('de', rate / 1000, 1)} kHz`,
  sourceNames: { unprocessed: 'unbearbeitet', voice_recognition: 'Spracherkennung' } as Record<string, string>,
  done: 'Fertig',
  close: 'Schließen',
}

export type Strings = typeof de

const en: Strings = {
  appName: 'Guitar Tune',
  settings: 'Settings',
  stringHint: [
    'Low E string, the thickest',
    'A string, the second thickest',
    'D string, third from the top',
    'G string, third from the bottom',
    'B string, the second thinnest',
    'High e string, the thinnest',
  ],
  verdict: {
    pluck: 'Pluck the string',
    tooLow: 'Too low',
    bitLow: 'A bit low',
    inTune: 'In tune',
    bitHigh: 'A bit high',
    tooHigh: 'Too high',
  },
  actionPluck: 'Pluck it firmly once and let it ring',
  actionTighten: 'Tighten the tuning peg a little',
  actionLoosen: 'Loosen the tuning peg a little',
  actionHold: 'Let it ring, stop turning',
  actionCheckString: 'Far off. Is it the right string?',
  barLow: 'too low',
  barTarget: 'target',
  barHigh: 'too high',
  targetHz: (hz: number) => `Target ${num('en', hz, 1)} Hz`,
  reading: (cents: number, hz: number) => `${sign(Math.round(cents))}${Math.abs(Math.round(cents))} cents  ·  ${num('en', hz, 1)} Hz`,
  progress: (n: number) => `${n} of 6 in tune`,
  finished: 'All strings in tune',
  finishedText: 'Enjoy playing',
  again: 'Again',
  tuneString: (letter: string) => `Tune the ${letter} string`,
  tunedString: (letter: string) => `${letter} string, in tune`,

  micTitle: 'Microphone for pitch detection',
  micText: 'Guitar Tune only listens while the app is open. The sound is not stored and not sent anywhere. The app has no internet access.',
  micContinue: 'Continue',
  micDenied: 'Without the microphone Guitar Tune cannot hear your strings.',
  micAllow: 'Allow microphone',
  micOpenSettings: 'Allow it in Android settings',
  micBusy: 'The microphone is not available right now. Another app may be using it.',
  retry: 'Try again',

  language: 'LANGUAGE',
  appearance: 'APPEARANCE',
  themeSystem: 'Automatic',
  themeLight: 'Light',
  themeDark: 'Dark',
  about: 'No account, no internet.\nThe sound stays on this phone.',
  madeBy: 'Made by Aaron Kreis ·',
  openSource: 'Open source under the MIT license',
  microphone: (source: string, rate: number) => `Microphone: ${source}, ${num('en', rate / 1000, 1)} kHz`,
  sourceNames: { unprocessed: 'unprocessed', voice_recognition: 'voice recognition' },
  done: 'Done',
  close: 'Close',
}

export const STRINGS_UI: Record<Lang, Strings> = { de, en }

export const LanguageContext = createContext<Strings>(de)
export const useT = (): Strings => useContext(LanguageContext)

export const LangContext = createContext<Lang>('de')
export const useLang = (): Lang => useContext(LangContext)

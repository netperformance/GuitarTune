import { File, Paths } from 'expo-file-system'
import { isLang, type Lang } from '../domain/lang'
import type { ThemeMode } from './theme'

/** Einstellungen dieses Handys. Liegen als kleine Datei im privaten Ordner der App. */
export interface Prefs {
  theme: ThemeMode
  language: Lang
}

/** Ohne eigene Wahl: dunkel (so wurde die App gestaltet), Sprache wie das Handy. */
export const DEFAULT_PREFS: Prefs = { theme: 'dark', language: 'de' }

const file = () => new File(Paths.document, 'prefs.json')

export async function loadPrefs(deviceLanguage: Lang): Promise<Prefs> {
  const prefs: Prefs = { ...DEFAULT_PREFS, language: deviceLanguage }
  try {
    const f = file()
    if (!f.exists) return prefs
    const raw = JSON.parse(await f.text()) as Partial<Prefs>
    if (raw.theme === 'system' || raw.theme === 'light' || raw.theme === 'dark') prefs.theme = raw.theme
    if (isLang(raw.language)) prefs.language = raw.language
  } catch (error) {
    console.error('Einstellungen nicht lesbar', error)
  }
  return prefs
}

export function savePrefs(prefs: Prefs): void {
  try {
    const f = file()
    if (!f.exists) f.create()
    f.write(JSON.stringify(prefs))
  } catch (error) {
    console.error('Einstellungen nicht gespeichert', error)
  }
}

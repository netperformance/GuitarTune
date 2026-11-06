import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import * as SystemUI from 'expo-system-ui'
import { useEffect, useState } from 'react'
import { Appearance, useColorScheme } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { deviceLanguage } from './src/ui/deviceLanguage'
import { LangContext, LanguageContext, STRINGS_UI } from './src/ui/i18n'
import { loadPrefs, savePrefs, type Prefs } from './src/ui/prefs'
import { SettingsSheet } from './src/ui/SettingsSheet'
import { dark, light, ThemeContext, type ThemeMode } from './src/ui/theme'
import { TunerScreen } from './src/ui/TunerScreen'

SplashScreen.preventAutoHideAsync().catch(() => {})

/** Stellt Android auf die gewählte Darstellung ein, damit auch Systemdialoge passen. */
function applyColorScheme(theme: ThemeMode): void {
  try {
    Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme)
  } catch {
    /* ältere Android Version ohne diese Funktion: die App färbt sich trotzdem selbst */
  }
}

export default function App() {
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [settings, setSettings] = useState(false)
  const system = useColorScheme()

  useEffect(() => {
    loadPrefs(deviceLanguage())
      .then((p) => {
        applyColorScheme(p.theme)
        setPrefs(p)
      })
      .finally(() => SplashScreen.hideAsync().catch(() => {}))
  }, [])

  const theme = prefs?.theme ?? 'dark'
  const isDark = theme === 'dark' || (theme === 'system' && system !== 'light')
  const colors = isDark ? dark : light

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {})
  }, [colors.bg])

  if (!prefs) return null

  const change = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    if (key === 'theme') applyColorScheme(value as ThemeMode)
    savePrefs(next)
  }

  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={colors}>
        <LangContext.Provider value={prefs.language}>
          <LanguageContext.Provider value={STRINGS_UI[prefs.language]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <TunerScreen onOpenSettings={() => setSettings(true)} />
            <SettingsSheet open={settings} onClose={() => setSettings(false)} prefs={prefs} onPref={change} />
          </LanguageContext.Provider>
        </LangContext.Provider>
      </ThemeContext.Provider>
    </SafeAreaProvider>
  )
}

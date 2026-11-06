import Constants from 'expo-constants'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { pitchInfo } from '../../modules/pitch-detector'
import { LANGS, type Lang } from '../domain/lang'
import { useT } from './i18n'
import type { Prefs } from './prefs'
import { Sheet } from './Sheet'
import { REPO_URL, SITE_URL } from './site'
import { useColors } from './theme'

interface Props {
  open: boolean
  onClose: () => void
  prefs: Prefs
  onPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void
}

const LANGUAGE_NAMES: Record<Lang, string> = { de: 'Deutsch', en: 'English' }

/** Einstellungen: Sprache, Darstellung, Angaben zur App. */
export function SettingsSheet({ open, onClose, prefs, onPref }: Props) {
  const c = useColors()
  const t = useT()
  const info = open ? pitchInfo() : null

  const segmented = <T extends string>(options: readonly (readonly [T, string])[], value: T, onChange: (v: T) => void) => (
    <View style={[styles.segmented, { backgroundColor: c.card }]} accessibilityRole="radiogroup">
      {options.map(([v, text]) => {
        const active = value === v
        return (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            style={[styles.segment, active && { backgroundColor: c.accent }]}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
          >
            <Text style={{ color: active ? c.onAccent : c.text2, fontWeight: '600', fontSize: 15 }} numberOfLines={1}>
              {text}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )

  const label = [styles.label, { color: c.text2 }]

  return (
    <Sheet open={open} title={t.settings} onClose={onClose}>
      <Text style={label}>{t.language}</Text>
      {segmented(
        LANGS.map((l) => [l, LANGUAGE_NAMES[l]] as const),
        prefs.language,
        (v) => onPref('language', v),
      )}

      <Text style={label}>{t.appearance}</Text>
      {segmented(
        [
          ['system', t.themeSystem],
          ['light', t.themeLight],
          ['dark', t.themeDark],
        ] as const,
        prefs.theme,
        (v) => onPref('theme', v),
      )}

      <Text style={[styles.about, { color: c.text2 }]}>
        {t.appName} {Constants.expoConfig?.version ?? ''} · {t.about}
      </Text>
      {info && info.sampleRate > 0 && (
        <Text style={[styles.about, styles.small, { color: c.text3 }]}>{t.microphone(t.sourceNames[info.source] ?? info.source, info.sampleRate)}</Text>
      )}
      <Text style={[styles.about, styles.signature, { color: c.text2 }]}>
        {t.madeBy}{' '}
        <Text style={{ color: c.accent, fontWeight: '500' }} onPress={() => Linking.openURL(SITE_URL).catch(() => {})} accessibilityRole="link">
          aaron.de
        </Text>
      </Text>
      <Text style={[styles.about, styles.openSource, { color: c.accent }]} onPress={() => Linking.openURL(REPO_URL).catch(() => {})} accessibilityRole="link">
        {t.openSource}
      </Text>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  label: { fontWeight: '700', fontSize: 12, letterSpacing: 0.6, marginTop: 18, marginBottom: 8, marginLeft: 4 },
  segmented: { flexDirection: 'row', padding: 3, borderRadius: 12, gap: 3 },
  segment: { flex: 1, minHeight: 38, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  about: { textAlign: 'center', fontSize: 13, marginTop: 28, lineHeight: 19 },
  small: { marginTop: 8, fontSize: 12 },
  signature: { marginTop: 14 },
  openSource: { marginTop: 6, fontWeight: '500' },
})

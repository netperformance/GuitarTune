import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Linking, PermissionsAndroid, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Path } from 'react-native-svg'
import { onPitch, setPitchTarget, startPitch, stopPitch } from '../../modules/pitch-detector'
import { STRINGS } from '../domain/guitar'
import { doneCount, holdProgress, jumpTo, newSession, restart, step, verdictOf, zoneOf, type Session } from '../domain/tuning'
import { Headstock } from './Headstock'
import { useLang, useT } from './i18n'
import { TuneBar } from './TuneBar'
import { useColors } from './theme'

type Mic = 'checking' | 'intro' | 'denied' | 'blocked' | 'granted' | 'busy'

const KEEP_AWAKE_TAG = 'guitartune'
/** Ab hier ist es wahrscheinlich die falsche Saite (3,5 Halbtöne). */
const FAR_OFF_CENTS = 350

/** Der einzige Bildschirm der App: geführtes Stimmen nach Variante E. */
export function TunerScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  const c = useColors()
  const t = useT()
  const lang = useLang()
  const insets = useSafeAreaInsets()
  const [session, setSession] = useState<Session>(newSession)
  const [mic, setMic] = useState<Mic>('checking')
  const [active, setActive] = useState(AppState.currentState === 'active')
  const [attempt, setAttempt] = useState(0)
  const targetRef = useRef(session.target)
  targetRef.current = session.target

  // Berechtigung beim Start prüfen
  useEffect(() => {
    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO)
      .then((ok) => setMic(ok ? 'granted' : 'intro'))
      .catch(() => setMic('intro'))
  }, [])

  // Vordergrund und Hintergrund: im Hintergrund läuft das Mikrofon nie
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      setActive(s === 'active')
      if (s === 'active' && mic !== 'granted') {
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO).then((ok) => ok && setMic('granted')).catch(() => {})
      }
    })
    return () => sub.remove()
  }, [mic])

  const listening = (mic === 'granted' || mic === 'busy') && active && !session.finished

  // Mikrofon an und aus
  useEffect(() => {
    if (!listening) return
    let cancelled = false
    startPitch(STRINGS[targetRef.current].hz).then((ok) => {
      if (cancelled) return
      setMic(ok ? 'granted' : 'busy')
    })
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {})
    return () => {
      cancelled = true
      stopPitch()
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {})
    }
  }, [listening, attempt])

  // Zielsaite an die Tonerkennung geben
  useEffect(() => {
    setPitchTarget(STRINGS[session.target].hz)
  }, [session.target])

  // Messungen verarbeiten
  useEffect(() => {
    const sub = onPitch((e) => {
      const now = Date.now()
      setSession((s) => {
        if (Math.abs(e.target - STRINGS[s.target].hz) > 0.01) return s
        return step(s, e.state === 'valid' ? e.cents : null, now)
      })
    })
    return () => sub.remove()
  }, [])

  const askMic = useCallback(async () => {
    const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO).catch(() => 'denied' as const)
    setMic(r === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : r === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied')
  }, [])

  const now = Date.now()
  const centsNow = session.cents
  const zone = zoneOf(centsNow)
  const color = c.zone[zone]
  const verdict = verdictOf(centsNow)
  const action =
    verdict === 'pluck'
      ? t.actionPluck
      : verdict === 'inTune'
        ? t.actionHold
        : centsNow !== null && Math.abs(centsNow) > FAR_OFF_CENTS
          ? t.actionCheckString
          : centsNow !== null && centsNow < 0
            ? t.actionTighten
            : t.actionLoosen
  const turn = centsNow !== null && zone !== 'ok' ? (centsNow < 0 ? 'up' : 'down') : null
  const target = STRINGS[session.target]
  const info = centsNow === null ? t.targetHz(target.hz) : t.reading(centsNow, target.hz * Math.pow(2, centsNow / 1200))
  const hold = holdProgress(session, now)
  const tap = (i: number) => setSession((s) => jumpTo(s, i))
  const letter = (i: number) => STRINGS[i].letter[lang]

  const micCard = mic === 'intro' || mic === 'denied' || mic === 'blocked' || mic === 'busy'

  return (
    <View style={[styles.fill, { backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.top}>
        <Text style={[styles.name, { color: c.text }]} accessibilityRole="header">
          {t.appName}
        </Text>
        <Pressable onPress={onOpenSettings} hitSlop={10} style={styles.gear} accessibilityRole="button" accessibilityLabel={t.settings}>
          <MaterialIcons name="settings" size={24} color={c.text2} />
        </Pressable>
      </View>

      {micCard ? (
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <MaterialIcons name={mic === 'busy' ? 'mic-off' : 'mic'} size={30} color={c.zone.wait} />
          <Text style={[styles.cardTitle, { color: c.text }]}>{mic === 'busy' ? t.micBusy : t.micTitle}</Text>
          {mic !== 'busy' && <Text style={[styles.cardText, { color: c.text2 }]}>{mic === 'intro' ? t.micText : t.micDenied}</Text>}
          <Pressable
            style={[styles.button, { backgroundColor: c.zone.wait }]}
            onPress={() => {
              if (mic === 'busy') setAttempt((a) => a + 1)
              else if (mic === 'blocked') Linking.openSettings().catch(() => {})
              else askMic()
            }}
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, { color: c.onZone }]}>
              {mic === 'busy' ? t.retry : mic === 'blocked' ? t.micOpenSettings : mic === 'intro' ? t.micContinue : t.micAllow}
            </Text>
          </Pressable>
        </View>
      ) : session.finished ? (
        <View style={styles.head}>
          <Text style={[styles.big, { color: c.zone.ok }]}>{t.finished}</Text>
          <Text style={[styles.action, { color: c.text2 }]}>{t.finishedText}</Text>
          <View style={styles.check}>
            <Svg width={64} height={64} viewBox="0 0 64 64">
              <Circle cx={32} cy={32} r={30} fill={c.zone.ok} />
              <Path d="M19 33 l9 9 l17 -18" stroke="#06140d" strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <Pressable style={[styles.button, { backgroundColor: c.zone.ok }]} onPress={() => setSession(restart())} accessibilityRole="button">
            <Text style={[styles.buttonText, { color: '#06140d' }]}>{t.again}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.head}>
          <Text style={[styles.hint, { color: c.text2 }]}>{t.stringHint[session.target]}</Text>
          <Text style={[styles.big, { color }]} accessibilityLiveRegion="polite">
            {t.verdict[verdict]}
          </Text>
          <Text style={[styles.action, { color: c.text2 }]}>{action}</Text>
          <View style={styles.bar}>
            <TuneBar cents={centsNow} color={color} />
          </View>
          <Text style={[styles.info, { color }]}>{info}</Text>
        </View>
      )}

      <View style={styles.guitar}>
        <Headstock
          target={session.target}
          done={session.done}
          color={micCard ? c.zone.wait : color}
          hold={hold}
          turn={micCard ? null : turn}
          lang={lang}
          finished={session.finished}
          onTap={tap}
          labelFor={(i) => (session.done[i] ? t.tunedString(letter(i)) : t.tuneString(letter(i)))}
        />
      </View>

      <View style={styles.foot}>
        <View style={styles.dots}>
          {STRINGS.map((s) => (
            <View
              key={s.index}
              style={[
                styles.dot,
                { backgroundColor: session.done[s.index] ? c.zone.ok : s.index === session.target && !session.finished ? color : c.surface },
              ]}
            />
          ))}
        </View>
        <Text style={{ color: c.text2, fontSize: 13 }}>{t.progress(doneCount(session))}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, height: 52 },
  name: { fontSize: 19, fontWeight: '700' },
  gear: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  head: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 6 },
  hint: { fontSize: 14 },
  big: { fontSize: 36, fontWeight: '800', marginTop: 4, textAlign: 'center' },
  action: { fontSize: 15, marginTop: 2, textAlign: 'center' },
  bar: { alignSelf: 'stretch', marginTop: 10 },
  info: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  check: { marginTop: 18, marginBottom: 14 },
  guitar: { flex: 1, minHeight: 200 },
  foot: { height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  card: { marginHorizontal: 16, marginTop: 8, borderRadius: 18, padding: 18, alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  cardText: { fontSize: 14.5, lineHeight: 21, textAlign: 'center' },
  button: { marginTop: 8, borderRadius: 24, paddingVertical: 12, paddingHorizontal: 26 },
  buttonText: { fontSize: 16, fontWeight: '800' },
})

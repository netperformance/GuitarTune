import { useEffect, useRef } from 'react'
import { Animated, Easing } from 'react-native'
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg'
import { STRINGS } from '../domain/guitar'
import type { Lang } from '../domain/lang'
import { useColors } from './theme'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const AnimatedG = Animated.createAnimatedComponent(G)

/** Schrift des Schriftzugs, wird beim Bau mit eingebettet (app.json, expo-font). */
export const LOGO_FONT = 'Caveat_600SemiBold'

// Maße im Raster der Zeichnung (360 x 440), wie im Entwurf Variante E
const H = 440
const NUT_Y = 352
const ROW_Y = [96, 176, 256]
const PEG_X = { left: 120, right: 240 }
const KNOB_X = { left: 84, right: 276 }
const BTN_X = { left: 36, right: 324 }
const NUT_X = [148, 160.8, 173.6, 186.4, 199.2, 212]

interface Props {
  target: number
  done: boolean[]
  /** Farbe der aktuellen Saite (Farbcode) */
  color: string
  /** Fortschritt des Haltens 0 bis 1, 0 = kein Ring */
  hold: number
  /** Pfeil auf der Mechanik: spannen (nach oben) oder lockern (nach unten) */
  turn: 'up' | 'down' | null
  lang: Lang
  /** Die App ist fertig: keine Saite hervorheben */
  finished: boolean
  onTap: (index: number) => void
  labelFor: (index: number) => string
}

/** Kopfplatte einer Westerngitarre mit sechs Mechaniken und den Knöpfen der Saiten. */
export function Headstock({ target, done, color, hold, turn, lang, finished, onTap, labelFor }: Props) {
  const c = useColors()
  const pulse = useRef(new Animated.Value(0)).current
  const nudge = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const a = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: false }))
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(nudge, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(nudge, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    )
    a.start()
    b.start()
    return () => {
      a.stop()
      b.stop()
    }
  }, [pulse, nudge])

  const active = finished ? -1 : target
  const tString = STRINGS[active]

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 360 ${H}`} preserveAspectRatio="xMidYMax meet">
      <Defs>
        <LinearGradient id="wood" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#4b2a17" />
          <Stop offset="0.5" stopColor="#6e4126" />
          <Stop offset="1" stopColor="#4b2a17" />
        </LinearGradient>
        <LinearGradient id="neck" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#2d1c12" />
          <Stop offset="0.5" stopColor="#3f281a" />
          <Stop offset="1" stopColor="#2d1c12" />
        </LinearGradient>
        <LinearGradient id="knob" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#f1f3f5" />
          <Stop offset="0.45" stopColor="#a9b0b8" />
          <Stop offset="1" stopColor="#6d747c" />
        </LinearGradient>
        <RadialGradient id="post" cx="0.4" cy="0.35" r="0.7">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset="0.6" stopColor="#b9c0c7" />
          <Stop offset="1" stopColor="#7b838b" />
        </RadialGradient>
      </Defs>

      {/* Hals mit erstem Bund */}
      <Rect x={142} y={NUT_Y} width={76} height={H - NUT_Y} fill="url(#neck)" />
      <Rect x={142} y={NUT_Y + 52} width={76} height={3} fill="#b9b3a6" />

      {/* Kopfplatte mit Maserung und Sattel */}
      <Path
        d={`M142 ${NUT_Y} C142 330 132 318 122 300 L104 60 C103 44 112 34 128 30 C150 25 160 38 180 38 C200 38 210 25 232 30 C248 34 257 44 256 60 L238 300 C228 318 218 330 218 ${NUT_Y} Z`}
        fill="url(#wood)"
        stroke="#d8cbb0"
        strokeWidth={2.5}
      />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const x = 126 + i * 18
        return <Path key={i} d={`M${x} 44 C${x + 6} 140 ${x - 6} 220 ${x + 3} 330`} stroke="#000" strokeOpacity={0.1} strokeWidth={1.4} fill="none" />
      })}
      <Rect x={140} y={NUT_Y - 6} width={80} height={8} rx={2} fill="#efe8d8" />

      {/* Schriftzug */}
      <SvgText x={180.8} y={71.2} textAnchor="middle" fontFamily={LOGO_FONT} fontSize={30} fill="rgba(0,0,0,0.45)">
        aaron.de
      </SvgText>
      <SvgText x={180} y={70} textAnchor="middle" fontFamily={LOGO_FONT} fontSize={30} fill="#f4efe6">
        aaron.de
      </SvgText>

      {/* Mechaniken */}
      {STRINGS.map((s) => {
        const y = ROW_Y[s.row]
        const kx = KNOB_X[s.side]
        const isT = s.index === active
        return (
          <G key={`k${s.index}`}>
            <Rect x={s.side === 'left' ? 84 : 240} y={y - 5} width={36} height={10} fill="#8f979f" />
            <Rect x={kx - 16} y={y - 22} width={32} height={44} rx={12} fill="url(#knob)" stroke={isT ? color : 'none'} strokeWidth={isT ? 3.5 : 0} />
          </G>
        )
      })}

      {/* Saiten: vom Sattel zur Mechanik und nach unten über den Hals */}
      {STRINGS.map((s) => {
        const x0 = NUT_X[s.index]
        const y1 = ROW_Y[s.row]
        const x1 = PEG_X[s.side]
        const isT = s.index === active
        const isD = done[s.index]
        const col = isT ? color : isD ? c.zone.ok : '#c9ced3'
        const w = 1.2 + (5 - s.index) * 0.35 + (isT ? 1.4 : 0)
        return (
          <G key={`s${s.index}`} opacity={isT ? 1 : 0.75}>
            {isT && <Line x1={x0} y1={H} x2={x0} y2={NUT_Y - 2} stroke={col} strokeOpacity={0.35} strokeWidth={w + 6} strokeLinecap="round" />}
            {isT && <Line x1={x0} y1={NUT_Y - 2} x2={x1} y2={y1} stroke={col} strokeOpacity={0.35} strokeWidth={w + 6} strokeLinecap="round" />}
            <Line x1={x0} y1={H} x2={x0} y2={NUT_Y - 2} stroke={col} strokeWidth={w} />
            <Line x1={x0} y1={NUT_Y - 2} x2={x1} y2={y1} stroke={col} strokeWidth={w} />
          </G>
        )
      })}

      {/* Wirbel */}
      {STRINGS.map((s) => {
        const y = ROW_Y[s.row]
        const x = PEG_X[s.side]
        const isT = s.index === active
        return (
          <G key={`p${s.index}`}>
            <Circle cx={x} cy={y} r={11} fill="url(#post)" stroke={isT ? color : 'none'} strokeWidth={isT ? 3 : 0} />
            <Circle cx={x} cy={y} r={3} fill="#6d747c" />
          </G>
        )
      })}

      {/* Pfeil mitten auf der Mechanik: Drehrichtung der sichtbaren Seite */}
      {tString && turn && (
        <AnimatedG translateY={nudge.interpolate({ inputRange: [0, 1], outputRange: turn === 'up' ? [2, -3] : [-2, 3] })}>
          {(() => {
            const y = ROW_Y[tString.row]
            const kx = KNOB_X[tString.side]
            const d = turn === 'up' ? -1 : 1
            return (
              <>
                <Path d={`M${kx} ${y - d * 12} L${kx} ${y + d * 9}`} stroke="#23282e" strokeWidth={4.5} strokeLinecap="round" fill="none" />
                <Path
                  d={`M${kx - 7} ${y + d * 3} L${kx} ${y + d * 12} L${kx + 7} ${y + d * 3}`}
                  stroke="#23282e"
                  strokeWidth={4.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </>
            )
          })()}
        </AnimatedG>
      )}

      {/* Knöpfe der Saiten */}
      {STRINGS.map((s) => {
        const y = ROW_Y[s.row]
        const x = BTN_X[s.side]
        const isT = s.index === active
        const isD = done[s.index]
        const ring = 2 * Math.PI * 33
        return (
          <G key={`b${s.index}`} onPress={() => onTap(s.index)} accessible accessibilityLabel={labelFor(s.index)}>
            {isT && hold === 0 && (
              <AnimatedCircle
                cx={x}
                cy={y}
                r={pulse.interpolate({ inputRange: [0, 1], outputRange: [27, 43] })}
                fill={color}
                opacity={pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] })}
              />
            )}
            <Circle cx={x} cy={y} r={34} fill="transparent" />
            <Circle cx={x} cy={y} r={27} fill={isT ? color : c.surface} stroke={isD && !isT ? c.zone.ok : 'none'} strokeWidth={isD && !isT ? 2.5 : 0} />
            <SvgText x={x} y={y + 8} textAnchor="middle" fontFamily="sans-serif" fontSize={23} fontWeight="800" fill={isT ? c.onZone : isD ? c.zone.ok : c.text}>
              {s.letter[lang]}
            </SvgText>
            {isT && hold > 0 && (
              <>
                <Circle cx={x} cy={y} r={33} fill="none" stroke={c.surface} strokeWidth={4} />
                <Circle
                  cx={x}
                  cy={y}
                  r={33}
                  fill="none"
                  stroke={c.zone.ok}
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeDasharray={`${ring * hold} ${ring}`}
                  rotation={-90}
                  origin={`${x}, ${y}`}
                />
              </>
            )}
            {isD && !isT && (
              <>
                <Circle cx={x + 19} cy={y - 19} r={9} fill={c.zone.ok} />
                <Path d={`M${x + 14.5} ${y - 19} l3 3 l6 -6`} stroke="#06140d" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </>
            )}
          </G>
        )
      })}
    </Svg>
  )
}

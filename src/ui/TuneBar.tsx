import { useEffect, useRef } from 'react'
import { Animated } from 'react-native'
import Svg, { G, Path, Rect, Text as SvgText } from 'react-native-svg'
import { useT } from './i18n'
import { useColors } from './theme'

const AnimatedG = Animated.createAnimatedComponent(G)

/** Waagerechter Balken von −50 bis +50 Cent mit grünem Zielfeld und Zeiger. */
export function TuneBar({ cents, color }: { cents: number | null; color: string }) {
  const c = useColors()
  const t = useT()
  const pos = useRef(new Animated.Value(0)).current
  const x = (v: number) => 180 + v * 3

  useEffect(() => {
    if (cents === null) return
    const v = Math.max(-50, Math.min(50, cents))
    Animated.spring(pos, { toValue: v * 3, useNativeDriver: false, damping: 18, stiffness: 180, mass: 0.6 }).start()
  }, [cents, pos])

  return (
    <Svg width="100%" height={74} viewBox="0 0 360 74">
      <Rect x={30} y={30} width={300} height={14} rx={7} fill={c.surface} />
      <Rect x={30} y={30} width={300} height={14} rx={7} fill={c.farBand} />
      <Rect x={x(-15)} y={30} width={x(15) - x(-15)} height={14} fill={c.surface} />
      <Rect x={x(-15)} y={30} width={x(15) - x(-15)} height={14} fill={c.nearBand} />
      <Rect x={x(-5)} y={26} width={x(5) - x(-5)} height={22} rx={4} fill={c.zone.ok} />
      <SvgText x={30} y={68} fontFamily="sans-serif" fontSize={12.5} fill={c.text2}>
        {t.barLow}
      </SvgText>
      <SvgText x={330} y={68} fontFamily="sans-serif" fontSize={12.5} fill={c.text2} textAnchor="end">
        {t.barHigh}
      </SvgText>
      <SvgText x={180} y={68} fontFamily="sans-serif" fontSize={12.5} fill={c.zone.ok} textAnchor="middle">
        {t.barTarget}
      </SvgText>
      {cents !== null && (
        <AnimatedG translateX={pos}>
          <Path d="M180 24 l-10 -16 h20 z" fill={color} />
          <Rect x={178} y={22} width={4} height={30} rx={2} fill={color} />
        </AnimatedG>
      )}
    </Svg>
  )
}

import { createContext, useContext } from 'react'
import type { Zone } from '../domain/tuning'

export type ThemeMode = 'system' | 'light' | 'dark'

export interface Palette {
  dark: boolean
  bg: string
  card: string
  text: string
  text2: string
  text3: string
  sep: string
  /** Hintergrund der Saitenknöpfe und des Balkens */
  surface: string
  /** Farbe für Bedienelemente in den Einstellungen */
  accent: string
  onAccent: string
  backdrop: string
  ripple: string
  /** Farbcode: eine Farbe, eine Bedeutung */
  zone: Record<Zone, string>
  /** Schrift auf einer farbigen Fläche (Knopf der aktuellen Saite) */
  onZone: string
  /** Gelber Bereich neben dem Ziel im Balken */
  nearBand: string
  /** Hellroter Bereich außen im Balken (weit daneben) */
  farBand: string
}

export const dark: Palette = {
  dark: true,
  bg: '#14171b',
  card: '#20252b',
  text: '#eef1f4',
  text2: '#8b949e',
  text3: '#5d6670',
  sep: 'rgba(255,255,255,0.08)',
  surface: '#2a3038',
  accent: '#3fcf8e',
  onAccent: '#06140d',
  backdrop: 'rgba(0,0,0,0.55)',
  ripple: 'rgba(255,255,255,0.1)',
  zone: { wait: '#5aa9ff', far: '#ff6b5b', near: '#f2a93b', ok: '#3fcf8e' },
  onZone: '#141008',
  nearBand: 'rgba(242,169,59,0.75)',
  farBand: 'rgba(255,107,91,0.58)',
}

export const light: Palette = {
  dark: false,
  bg: '#f6f4ef',
  card: '#ffffff',
  text: '#1d2127',
  text2: '#5f6670',
  text3: '#a0a6ad',
  sep: 'rgba(0,0,0,0.08)',
  surface: '#e6e2d9',
  accent: '#15a46a',
  onAccent: '#ffffff',
  backdrop: 'rgba(0,0,0,0.32)',
  ripple: 'rgba(0,0,0,0.08)',
  zone: { wait: '#2f7fe0', far: '#e0483a', near: '#d9820f', ok: '#15a46a' },
  onZone: '#ffffff',
  nearBand: 'rgba(217,130,15,0.55)',
  farBand: 'rgba(224,72,58,0.38)',
}

export const ThemeContext = createContext<Palette>(dark)
export const useColors = () => useContext(ThemeContext)

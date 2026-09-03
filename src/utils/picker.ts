import type { Finger, Hsl } from '../types'

export const HOLD_MS = 3000
export const HIT_RADIUS = 64
export const TAP_MS = 300
export const TAP_MOVE = 14

export const PALETTE: Hsl[] = [
  { h: 0, s: 92, l: 56 },
  { h: 14, s: 100, l: 56 },
  { h: 28, s: 100, l: 54 },
  { h: 42, s: 100, l: 54 },
  { h: 54, s: 98, l: 50 },
  { h: 72, s: 88, l: 48 },
  { h: 92, s: 78, l: 48 },
  { h: 118, s: 72, l: 48 },
  { h: 142, s: 80, l: 44 },
  { h: 158, s: 90, l: 44 },
  { h: 172, s: 92, l: 42 },
  { h: 186, s: 96, l: 46 },
  { h: 198, s: 100, l: 52 },
  { h: 210, s: 96, l: 56 },
  { h: 224, s: 90, l: 60 },
  { h: 238, s: 82, l: 62 },
  { h: 252, s: 78, l: 62 },
  { h: 266, s: 82, l: 62 },
  { h: 280, s: 78, l: 60 },
  { h: 294, s: 86, l: 58 },
  { h: 312, s: 92, l: 60 },
  { h: 326, s: 96, l: 58 },
  { h: 338, s: 100, l: 58 },
  { h: 350, s: 94, l: 56 },
]

export function hsl({ h, s, l }: Hsl, a = 1): string {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`
}

export function shuffle<T>(list: T[]): T[] {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function unusedColor(fingers: Iterable<Finger>): Hsl {
  const used = new Set([...fingers].map((finger) => finger.color.h))
  const free = PALETTE.filter((color) => !used.has(color.h))
  const pool = free.length ? free : PALETTE
  return { ...pool[Math.floor(Math.random() * pool.length)] }
}

export function coverRadius(finger: Finger, width: number, height: number): number {
  const corners = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ] as const
  return Math.max(...corners.map(([x, y]) => Math.hypot(finger.x - x, finger.y - y)))
}

export function bakeWinnerFill(
  winners: Finger[],
  width: number,
  height: number,
  dpr: number,
): HTMLCanvasElement {
  const off = document.createElement('canvas')
  off.width = Math.max(1, Math.round(width * dpr))
  off.height = Math.max(1, Math.round(height * dpr))
  const ctx = off.getContext('2d')
  if (!ctx) return off
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  if (winners.length <= 1) {
    ctx.fillStyle = hsl(winners[0]?.color ?? { h: 0, s: 0, l: 50 }, 1)
    ctx.fillRect(0, 0, width, height)
    return off
  }

  const step = 2
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      let best = winners[0]
      let bestD = Infinity
      for (const finger of winners) {
        const d = (finger.x - x) ** 2 + (finger.y - y) ** 2
        if (d < bestD) {
          bestD = d
          best = finger
        }
      }
      ctx.fillStyle = hsl(best.color, 1)
      ctx.fillRect(x, y, step, step)
    }
  }

  return off
}

export function readCssColor(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export function hintFor(mode: 'idle' | 'countdown' | 'reveal', fingerCount: number, need: number, winnerCount: number): string {
  if (mode === 'reveal') return winnerCount > 1 ? 'these ones' : 'this one'
  if (fingerCount === 0) return 'hold a finger · or tap to drop a person'
  if (fingerCount < need) {
    const left = need - fingerCount
    return left === 1 ? 'need one more' : `need ${left} more`
  }
  return 'hold still…'
}

import type { Finger, PickerMode } from '../types'
import { neededFingers } from './pickCount'
import {
  HOLD_MS,
  HIT_RADIUS,
  bakeWinnerFill,
  coverRadius,
  hintFor,
  hsl,
  readCssColor,
  shuffle,
  unusedColor,
} from './picker'

type MouseDrag = {
  id: string
  pointerId: number
  startX: number
  startY: number
  moved: boolean
  removeOnClick: boolean
}

export type PickerSnapshot = {
  mode: PickerMode
  second: number | null
  hint: string
}

type PickerCallbacks = {
  onChange: (snapshot: PickerSnapshot) => void
}

export class PickerSession {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private callbacks: PickerCallbacks
  private pickCount: number
  private fingers = new Map<string, Finger>()
  private holds = new Map<number, string>()
  private mode: PickerMode = 'idle'
  private stableSince: number | null = null
  private lastSecondShown: number | null = null
  private winners: Finger[] = []
  private revealStart = 0
  private revealFill: HTMLCanvasElement | null = null
  private dpr = 1
  private audioCtx: AudioContext | null = null
  private nextMouseId = 1
  private mouseDrag: MouseDrag | null = null
  private raf = 0
  private destroyed = false

  constructor(canvas: HTMLCanvasElement, pickCount: number, callbacks: PickerCallbacks) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is not available')
    this.canvas = canvas
    this.ctx = ctx
    this.pickCount = pickCount
    this.callbacks = callbacks
    this.resize()
    this.emit()
    this.bind()
    this.raf = requestAnimationFrame((now) => this.draw(now))
  }

  setPickCount(count: number): void {
    if (this.pickCount === count) return
    this.pickCount = count
    this.resetStability()
    this.emit()
  }

  reset(): void {
    this.fingers.clear()
    this.holds.clear()
    this.mouseDrag = null
    this.winners = []
    this.revealFill = null
    this.stableSince = null
    this.lastSecondShown = null
    this.mode = 'idle'
    this.emit()
  }

  destroy(): void {
    this.destroyed = true
    cancelAnimationFrame(this.raf)
    this.unbind()
  }

  private emit(): void {
    this.callbacks.onChange({
      mode: this.mode,
      second: this.mode === 'countdown' ? this.lastSecondShown : null,
      hint: hintFor(this.mode, this.fingers.size, neededFingers(this.pickCount), this.winners.length),
    })
  }

  private bind(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown)
    window.addEventListener('pointermove', this.onPointerMove, { passive: false })
    window.addEventListener('pointerup', this.onPointerUp)
    window.addEventListener('pointercancel', this.onPointerCancel)
    window.addEventListener('resize', this.onResize)
    document.addEventListener('touchstart', this.onTouchStart, { passive: false })
    document.addEventListener('contextmenu', this.onContextMenu)
  }

  private unbind(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    window.removeEventListener('pointermove', this.onPointerMove)
    window.removeEventListener('pointerup', this.onPointerUp)
    window.removeEventListener('pointercancel', this.onPointerCancel)
    window.removeEventListener('resize', this.onResize)
    document.removeEventListener('touchstart', this.onTouchStart)
    document.removeEventListener('contextmenu', this.onContextMenu)
  }

  private onResize = (): void => {
    this.resize()
    if (this.mode === 'reveal' && this.winners.length) {
      this.revealFill = bakeWinnerFill(this.winners, window.innerWidth, window.innerHeight, this.dpr)
    }
  }

  private onTouchStart = (event: TouchEvent): void => {
    if ((event.target as HTMLElement | null)?.closest('a, button, .play-hud, .app-header')) return
    event.preventDefault()
  }

  private onContextMenu = (event: Event): void => {
    event.preventDefault()
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5)
    const width = this.canvas.clientWidth
    const height = this.canvas.clientHeight
    this.canvas.width = Math.round(width * this.dpr)
    this.canvas.height = Math.round(height * this.dpr)
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  private isHoldPointer(event: PointerEvent): boolean {
    return event.pointerType === 'touch' || event.pointerType === 'pen'
  }

  private clientPoint(event: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  private hitTest(x: number, y: number): Finger | null {
    let best: Finger | null = null
    let bestD = HIT_RADIUS
    for (const finger of this.fingers.values()) {
      const d = Math.hypot(finger.x - x, finger.y - y)
      if (d < bestD) {
        best = finger
        bestD = d
      }
    }
    return best
  }

  private resetStability(): void {
    if (this.mode === 'reveal') return
    this.stableSince = performance.now()
    this.lastSecondShown = null
    this.mode = this.fingers.size >= neededFingers(this.pickCount) ? 'countdown' : 'idle'
  }

  private addFinger(id: string, x: number, y: number): void {
    if (this.mode === 'reveal') return
    const existing = this.fingers.get(id)
    if (existing) {
      existing.x = x
      existing.y = y
      return
    }
    this.fingers.set(id, {
      id,
      x,
      y,
      color: unusedColor(this.fingers.values()),
      phase: Math.random() * Math.PI * 2,
    })
    this.resetStability()
    this.emit()
  }

  private moveFinger(id: string, x: number, y: number): void {
    if (this.mode === 'reveal') return
    const finger = this.fingers.get(id)
    if (!finger) return
    finger.x = x
    finger.y = y
  }

  private removeFinger(id: string): void {
    if (this.mode === 'reveal' || !this.fingers.has(id)) return
    this.fingers.delete(id)
    this.resetStability()
    this.emit()
  }

  private ensureAudio(): void {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!this.audioCtx && AC) this.audioCtx = new AC()
    void this.audioCtx?.resume()
  }

  private beep(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.05): void {
    if (!this.audioCtx) return
    const osc = this.audioCtx.createOscillator()
    const node = this.audioCtx.createGain()
    osc.type = type
    osc.frequency.value = freq
    node.gain.value = gain
    node.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration)
    osc.connect(node)
    node.connect(this.audioCtx.destination)
    osc.start()
    osc.stop(this.audioCtx.currentTime + duration)
  }

  private vibrate(pattern: number | number[]): void {
    navigator.vibrate?.(pattern)
  }

  private pickWinners(): void {
    const pool = [...this.fingers.values()]
    const count = Math.min(this.pickCount, pool.length)
    this.winners = shuffle(pool).slice(0, count)
    this.revealStart = performance.now()
    this.lastSecondShown = null
    this.mode = 'reveal'
    this.revealFill = bakeWinnerFill(
      this.winners,
      this.canvas.clientWidth,
      this.canvas.clientHeight,
      this.dpr,
    )
    this.vibrate([40, 60, 80, 60, 120])
    this.beep(523, 0.12, 'triangle', 0.06)
    window.setTimeout(() => this.beep(784, 0.18, 'triangle', 0.07), 90)
    window.setTimeout(() => this.beep(1046, 0.28, 'sine', 0.06), 180)
    this.emit()
  }

  private onPointerDown = (event: PointerEvent): void => {
    if ((event.target as HTMLElement | null)?.closest('a, button, .play-hud, .app-header')) return
    event.preventDefault()
    this.ensureAudio()
    if (this.mode === 'reveal') return

    this.canvas.setPointerCapture?.(event.pointerId)
    const { x, y } = this.clientPoint(event)

    if (this.isHoldPointer(event)) {
      this.addFinger(String(event.pointerId), x, y)
      this.holds.set(event.pointerId, String(event.pointerId))
      return
    }

    const hit = this.hitTest(x, y)
    if (hit) {
      this.mouseDrag = {
        id: hit.id,
        pointerId: event.pointerId,
        startX: x,
        startY: y,
        moved: false,
        removeOnClick: true,
      }
      return
    }

    const id = `mouse-${this.nextMouseId++}`
    this.addFinger(id, x, y)
    this.mouseDrag = {
      id,
      pointerId: event.pointerId,
      startX: x,
      startY: y,
      moved: false,
      removeOnClick: false,
    }
  }

  private onPointerMove = (event: PointerEvent): void => {
    const { x, y } = this.clientPoint(event)

    if (this.holds.has(event.pointerId)) {
      event.preventDefault()
      this.moveFinger(this.holds.get(event.pointerId) ?? String(event.pointerId), x, y)
      return
    }

    if (!this.mouseDrag || this.mouseDrag.pointerId !== event.pointerId) return
    event.preventDefault()
    if (Math.hypot(x - this.mouseDrag.startX, y - this.mouseDrag.startY) > 10) {
      this.mouseDrag.moved = true
      this.mouseDrag.removeOnClick = false
    }
    this.moveFinger(this.mouseDrag.id, x, y)
  }

  private onPointerUp = (event: PointerEvent): void => {
    if (this.holds.has(event.pointerId)) {
      event.preventDefault()
      this.removeFinger(this.holds.get(event.pointerId) ?? String(event.pointerId))
      this.holds.delete(event.pointerId)
      return
    }

    if (!this.mouseDrag || this.mouseDrag.pointerId !== event.pointerId) return
    event.preventDefault()
    if (this.mouseDrag.removeOnClick && !this.mouseDrag.moved) {
      this.removeFinger(this.mouseDrag.id)
    }
    this.mouseDrag = null
  }

  private onPointerCancel = (event: PointerEvent): void => {
    if (this.holds.has(event.pointerId)) {
      this.removeFinger(this.holds.get(event.pointerId) ?? String(event.pointerId))
      this.holds.delete(event.pointerId)
    }
    if (this.mouseDrag?.pointerId === event.pointerId) this.mouseDrag = null
  }

  private drawFinger(finger: Finger, now: number, countdownProgress: number): void {
    const pulse = 1 + Math.sin(now / 240 + finger.phase) * 0.07
    const r = 54 * pulse
    const { x, y, color } = finger
    const won = this.mode === 'reveal' && this.winners.some((winner) => winner.id === finger.id)
    const lost = this.mode === 'reveal' && !won
    const ring = readCssColor('--text', '#111827')

    this.ctx.save()
    this.ctx.globalAlpha = lost ? 0.2 : 1

    const glow = this.ctx.createRadialGradient(x, y, 8, x, y, r * 2.4)
    glow.addColorStop(0, hsl(color, 0.55))
    glow.addColorStop(0.45, hsl(color, 0.22))
    glow.addColorStop(1, hsl(color, 0))
    this.ctx.fillStyle = glow
    this.ctx.beginPath()
    this.ctx.arc(x, y, r * 2.4, 0, Math.PI * 2)
    this.ctx.fill()

    this.ctx.beginPath()
    this.ctx.arc(x, y, r, 0, Math.PI * 2)
    this.ctx.fillStyle = hsl(color, 0.95)
    this.ctx.fill()
    this.ctx.lineWidth = 6
    this.ctx.strokeStyle = hsl({ ...color, l: Math.min(color.l + 18, 92) }, 0.9)
    this.ctx.stroke()

    this.ctx.beginPath()
    this.ctx.arc(x, y, r * 0.34, 0, Math.PI * 2)
    this.ctx.fillStyle = hsl({ ...color, l: 96 }, 0.55)
    this.ctx.fill()

    if (this.mode === 'countdown') {
      this.ctx.save()
      this.ctx.lineWidth = 8
      this.ctx.lineCap = 'round'
      this.ctx.strokeStyle = ring
      this.ctx.globalAlpha = 0.2
      this.ctx.beginPath()
      this.ctx.arc(x, y, r + 16, 0, Math.PI * 2)
      this.ctx.stroke()
      this.ctx.globalAlpha = 0.95
      this.ctx.beginPath()
      this.ctx.arc(x, y, r + 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * countdownProgress)
      this.ctx.stroke()
      this.ctx.restore()
    }

    if (won) {
      const spark = 18 + Math.sin(now / 90) * 4
      this.ctx.beginPath()
      this.ctx.arc(x, y, r + spark, 0, Math.PI * 2)
      this.ctx.lineWidth = 10
      this.ctx.strokeStyle = ring
      this.ctx.stroke()
    }

    this.ctx.restore()
  }

  private drawCountdownRing(width: number, height: number, progress: number): void {
    const cx = width / 2
    const cy = height / 2
    const radius = Math.min(width, height) * 0.26
    const ring = readCssColor('--text', '#111827')
    this.ctx.save()
    this.ctx.lineWidth = 16
    this.ctx.lineCap = 'round'
    this.ctx.globalAlpha = 0.16
    this.ctx.strokeStyle = ring
    this.ctx.beginPath()
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    this.ctx.stroke()
    this.ctx.globalAlpha = 0.95
    this.ctx.beginPath()
    this.ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress)
    this.ctx.stroke()
    this.ctx.restore()
  }

  private draw = (now: number): void => {
    if (this.destroyed) return

    const width = this.canvas.clientWidth
    const height = this.canvas.clientHeight
    const bg = readCssColor('--bg', '#fafafa')
    const countdownProgress =
      this.mode === 'countdown' && this.stableSince != null
        ? Math.min(1, (now - this.stableSince) / HOLD_MS)
        : 0

    this.ctx.fillStyle = bg
    this.ctx.fillRect(0, 0, width, height)

    if (this.mode === 'reveal') {
      const t = Math.min(1, (now - this.revealStart) / 720)
      const ease = 1 - (1 - t) ** 3
      if (t >= 1 && this.revealFill) {
        this.ctx.drawImage(this.revealFill, 0, 0, width, height)
      } else {
        for (const winner of this.winners) {
          const maxR = coverRadius(winner, width, height)
          this.ctx.beginPath()
          this.ctx.arc(winner.x, winner.y, maxR * ease, 0, Math.PI * 2)
          this.ctx.fillStyle = hsl(winner.color, 0.96)
          this.ctx.fill()
        }
      }
    } else if (this.mode === 'countdown') {
      this.ctx.fillStyle = `rgba(0, 0, 0, ${0.08 + countdownProgress * 0.18})`
      this.ctx.fillRect(0, 0, width, height)
      this.drawCountdownRing(width, height, countdownProgress)
    }

    for (const finger of this.fingers.values()) {
      this.drawFinger(finger, now, countdownProgress)
    }

    if (this.mode === 'countdown' && this.stableSince != null) {
      const remaining = Math.max(0, HOLD_MS - (now - this.stableSince))
      const second = Math.ceil(remaining / 1000)
      if (second !== this.lastSecondShown && second > 0) {
        this.lastSecondShown = second
        this.vibrate(second === 1 ? 40 : 18)
        this.beep(second === 1 ? 880 : 420 + second * 80, 0.09, 'square', 0.04)
        this.emit()
      }
      if (remaining <= 0) this.pickWinners()
    }

    this.raf = requestAnimationFrame(this.draw)
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

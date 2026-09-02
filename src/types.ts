export type Hsl = {
  h: number
  s: number
  l: number
}

export type Finger = {
  id: string
  x: number
  y: number
  color: Hsl
  phase: number
}

export type PickerMode = 'idle' | 'countdown' | 'reveal'

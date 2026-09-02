const KEY = 'pickr-pick-count'
export const MIN_PICK = 1
export const MAX_PICK = 8

export function loadPickCount(): number {
  try {
    const raw = localStorage.getItem(KEY)
    const n = raw ? Number.parseInt(raw, 10) : MIN_PICK
    if (Number.isInteger(n) && n >= MIN_PICK && n <= MAX_PICK) return n
  } catch {
    // ignore
  }
  return MIN_PICK
}

export function savePickCount(count: number): void {
  localStorage.setItem(KEY, String(count))
}

export function neededFingers(pickCount: number): number {
  return Math.max(2, pickCount)
}

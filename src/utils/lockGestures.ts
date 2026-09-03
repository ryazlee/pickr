function isChromeTarget(target: EventTarget | null): boolean {
  return Boolean(
    (target as HTMLElement | null)?.closest('a, button, .play-menu, .play-credit, .play-again'),
  )
}

function preventIfCanvas(event: Event): void {
  if (isChromeTarget(event.target)) return
  event.preventDefault()
}

function preventAlways(event: Event): void {
  event.preventDefault()
}

export function lockPageGestures(): () => void {
  const html = document.documentElement
  html.classList.add('gesture-lock')

  document.addEventListener('touchmove', preventIfCanvas, { passive: false })
  document.addEventListener('gesturestart', preventAlways)
  document.addEventListener('gesturechange', preventAlways)
  document.addEventListener('gestureend', preventAlways)

  return () => {
    html.classList.remove('gesture-lock')
    document.removeEventListener('touchmove', preventIfCanvas)
    document.removeEventListener('gesturestart', preventAlways)
    document.removeEventListener('gesturechange', preventAlways)
    document.removeEventListener('gestureend', preventAlways)
  }
}

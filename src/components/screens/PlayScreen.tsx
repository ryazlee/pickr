import { useCallback, useEffect, useRef, useState } from 'react'
import { EllipsisVertical } from 'lucide-react'
import Button from '../Button'
import FingerCanvas, { type PickerUiState } from '../FingerCanvas'
import MakerCredit from '../MakerCredit'
import PickCountStepper from '../PickCountStepper'
import ThemeToggle from '../ThemeToggle'
import { lockPageGestures } from '../../utils/lockGestures'
import type { PickerSession } from '../../utils/pickerSession'
import { loadPickCount, savePickCount } from '../../utils/pickCount'

export default function PlayScreen() {
  const sessionRef = useRef<PickerSession | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pickCount, setPickCount] = useState(() => loadPickCount())
  const [menuOpen, setMenuOpen] = useState(false)
  const [ui, setUi] = useState<PickerUiState>({
    mode: 'idle',
    second: null,
    hint: 'hold a finger · or tap to drop a person',
    fingerCount: 0,
  })
  const onState = useCallback((snapshot: PickerUiState) => {
    setUi(snapshot)
    if (snapshot.mode !== 'idle') setMenuOpen(false)
  }, [])
  const immersive = ui.mode === 'countdown' || ui.mode === 'reveal'
  const blurbAway = ui.fingerCount > 0 || immersive

  function updatePickCount(next: number) {
    setPickCount(next)
    savePickCount(next)
    sessionRef.current?.setPickCount(next)
  }

  useEffect(() => lockPageGestures(), [])

  useEffect(() => {
    if (!menuOpen) return

    function onPointerDown(event: PointerEvent) {
      if (menuRef.current?.contains(event.target as Node)) return
      setMenuOpen(false)
      event.stopPropagation()
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [menuOpen])

  return (
    <div
      className={['app-shell', 'app-shell--play', immersive ? 'app-shell--immersive' : null]
        .filter(Boolean)
        .join(' ')}
    >
      <main className="app-main">
        <FingerCanvas pickCount={pickCount} onState={onState} sessionRef={sessionRef} />
        <div className={['play-blurb', blurbAway ? 'play-blurb--away' : null].filter(Boolean).join(' ')}>
          <p className="play-blurb__lede">Everyone put a finger on the screen.</p>
          <p className="play-blurb__note">
            Hold, or tap to drop a person — tap if you need more than five. After a
            few seconds with no new fingers, we’ll pick who goes first.
          </p>
        </div>
        {ui.mode === 'idle' && ui.fingerCount > 0 ? <p className="play-status">{ui.hint}</p> : null}
        {ui.mode === 'countdown' && ui.second ? (
          <div
            key={ui.second}
            className={['play-countdown', ui.second === 1 ? 'urgent' : 'pop'].join(' ')}
          >
            <span className="play-countdown__digit">{ui.second}</span>
          </div>
        ) : null}
        {ui.mode === 'idle' ? (
          <div className="play-menu" ref={menuRef}>
            <button
              type="button"
              className="icon-btn play-menu__trigger"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <EllipsisVertical size={16} aria-hidden="true" />
            </button>
            {menuOpen ? (
              <div className="play-menu__panel surface-card" role="dialog" aria-label="Winners">
                <p className="section-label">How many to pick</p>
                <PickCountStepper value={pickCount} onChange={updatePickCount} />
                <div className="play-menu__theme">
                  <ThemeToggle />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {ui.mode === 'idle' ? (
          <div className="play-credit">
            <MakerCredit />
          </div>
        ) : null}
        {ui.mode === 'reveal' ? (
          <div className="play-again">
            <Button label="Again" onClick={() => sessionRef.current?.reset()} />
          </div>
        ) : null}
      </main>
    </div>
  )
}

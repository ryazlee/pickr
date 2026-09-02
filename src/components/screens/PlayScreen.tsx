import { useCallback, useRef, useState } from 'react'
import AppHeader from '../AppHeader'
import Button from '../Button'
import FingerCanvas, { type PickerUiState } from '../FingerCanvas'
import PickCountStepper from '../PickCountStepper'
import SectionCard from '../SectionCard'
import type { PickerSession } from '../../utils/pickerSession'
import { loadPickCount, savePickCount } from '../../utils/pickCount'

export default function PlayScreen() {
  const sessionRef = useRef<PickerSession | null>(null)
  const [pickCount, setPickCount] = useState(() => loadPickCount())
  const [ui, setUi] = useState<PickerUiState>({
    mode: 'idle',
    second: null,
    hint: 'put fingers down · or tap to drop people',
  })
  const onState = useCallback((snapshot: PickerUiState) => setUi(snapshot), [])
  const immersive = ui.mode === 'countdown' || ui.mode === 'reveal'

  function updatePickCount(next: number) {
    setPickCount(next)
    savePickCount(next)
    sessionRef.current?.setPickCount(next)
  }

  return (
    <div
      className={['app-shell', 'app-shell--play', immersive ? 'app-shell--immersive' : null]
        .filter(Boolean)
        .join(' ')}
    >
      <AppHeader title="pickr" quiet />
      <main className="app-main">
        <FingerCanvas pickCount={pickCount} onState={onState} sessionRef={sessionRef} />
        {ui.mode === 'idle' ? <p className="play-hint">{ui.hint}</p> : null}
        {ui.mode === 'countdown' && ui.second ? (
          <div
            key={ui.second}
            className={['play-countdown', ui.second === 1 ? 'urgent' : 'pop'].join(' ')}
          >
            {ui.second}
          </div>
        ) : null}
        {ui.mode === 'idle' ? (
          <div className="play-hud">
            <SectionCard>
              <PickCountStepper value={pickCount} onChange={updatePickCount} />
            </SectionCard>
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

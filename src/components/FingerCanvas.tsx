import { useEffect, useRef, type MutableRefObject } from 'react'
import type { PickerMode } from '../types'
import { PickerSession, type PickerSnapshot } from '../utils/pickerSession'

export type PickerUiState = {
  mode: PickerMode
  second: number | null
  hint: string
}

type FingerCanvasProps = {
  pickCount: number
  onState: (snapshot: PickerUiState) => void
  sessionRef: MutableRefObject<PickerSession | null>
}

export default function FingerCanvas({ pickCount, onState, sessionRef }: FingerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const session = new PickerSession(canvas, pickCount, {
      onChange: (snapshot: PickerSnapshot) => onState(snapshot),
    })
    sessionRef.current = session

    return () => {
      session.destroy()
      sessionRef.current = null
    }
    // pickCount is applied after mount via setPickCount; do not recreate the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onState, sessionRef])

  useEffect(() => {
    sessionRef.current?.setPickCount(pickCount)
  }, [pickCount, sessionRef])

  return <canvas ref={canvasRef} className="play-canvas" aria-label="pickr" />
}

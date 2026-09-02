import { Minus, Plus } from 'lucide-react'
import { MAX_PICK, MIN_PICK } from '../utils/pickCount'

type PickCountStepperProps = {
  value: number
  onChange: (next: number) => void
  disabled?: boolean
}

export default function PickCountStepper({ value, onChange, disabled = false }: PickCountStepperProps) {
  return (
    <div className="stepper">
      <button
        type="button"
        className="icon-btn"
        aria-label="pick fewer"
        disabled={disabled || value <= MIN_PICK}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={16} aria-hidden="true" />
      </button>
      <div className="stepper__readout">
        <span className="stepper__count">{value}</span>
        <span className="stepper__word">{value === 1 ? 'winner' : 'winners'}</span>
      </div>
      <button
        type="button"
        className="icon-btn"
        aria-label="pick more"
        disabled={disabled || value >= MAX_PICK}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  )
}

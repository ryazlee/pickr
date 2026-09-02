import { useState } from 'react'
import AppHeader from '../AppHeader'
import Button from '../Button'
import MakerCredit from '../MakerCredit'
import PickCountStepper from '../PickCountStepper'
import SectionCard from '../SectionCard'
import { loadPickCount, savePickCount } from '../../utils/pickCount'

export default function HomeScreen() {
  const [pickCount, setPickCount] = useState(() => loadPickCount())

  function updatePickCount(next: number) {
    setPickCount(next)
    savePickCount(next)
  }

  return (
    <div className="app-shell app-shell--home">
      <AppHeader title="pickr" quiet />
      <main className="app-main">
        <div className="shell-inner">
          <div className="home">
            <div className="home__copy">
              <p className="home__lede">
                Put everyone’s fingers on the phone. We’ll pick who goes first.
              </p>
              <p className="home__note">Works best on a phone. On desktop, tap to drop people in.</p>
            </div>

            <SectionCard title="How many to pick" subtitle="Default is one winner.">
              <PickCountStepper value={pickCount} onChange={updatePickCount} />
            </SectionCard>

            <div className="home__actions">
              <Button label="Start" to="/play" />
            </div>
          </div>
        </div>
      </main>
      <footer className="app-footer">
        <MakerCredit />
      </footer>
    </div>
  )
}

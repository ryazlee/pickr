import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import HomeScreen from './components/screens/HomeScreen'
import PlayScreen from './components/screens/PlayScreen'
import { ThemeProvider } from './theme'
import { trackPageview } from './utils/analytics'

function getRouterBasename(): string {
  const base = import.meta.env.BASE_URL
  return base.endsWith('/') ? base.slice(0, -1) : base
}

function RouteAnalytics() {
  const location = useLocation()

  useEffect(() => {
    trackPageview()
  }, [location.pathname])

  return null
}

function App() {
  const basename = getRouterBasename()

  return (
    <ThemeProvider>
      <BrowserRouter basename={basename || undefined}>
        <RouteAnalytics />
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/play" element={<PlayScreen />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App

import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Welcome from './pages/Welcome'
import Register from './pages/Register'
import MonthlyReview from './pages/MonthlyReview'
import PixelVerification from './pages/PixelVerification'
import WeeklyReport from './pages/WeeklyReport'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/register" element={<Register />} />
      <Route path="/monthly-review" element={<MonthlyReview />} />
      <Route path="/pixel-verification" element={<PixelVerification />} />
      <Route path="/reports" element={<WeeklyReport />} />
    </Routes>
  )
}

export default App

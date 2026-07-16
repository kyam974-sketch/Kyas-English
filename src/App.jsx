import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import StudentDetail from './pages/StudentDetail.jsx'
import ExerciseBank from './pages/ExerciseBank.jsx'
import ExerciseEditor from './pages/ExerciseEditor.jsx'
import LessonSession from './pages/LessonSession.jsx'
import Shadowing from './pages/Shadowing.jsx'

function TopNav() {
  const location = useLocation()
  const isActive = (path) => location.pathname === path
  const items = [
    ['/', 'Allievi'],
    ['/esercizi', 'Banca esercizi'],
    ['/shadowing', 'Shadowing 🎬'],
  ]

  return (
    <header className="px-7 py-4 flex items-center justify-between">
      <Link to="/" className="font-display text-2xl text-violet flex items-center gap-2">
        <span>🐱🇬🇧</span> Kya's English
      </Link>
      <nav className="flex gap-2 text-sm">
        {items.map(([path, label]) => (
          <Link
            key={path}
            to={path}
            className={`px-4 py-1.5 rounded-pill font-bold ${
              isActive(path) ? 'bg-violet text-white' : 'text-muted hover:bg-violet-soft'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-page">
      <TopNav />
      <main className="max-w-4xl mx-auto px-7 pb-12">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/studenti/:id" element={<StudentDetail />} />
          <Route path="/studenti/:id/sessione" element={<LessonSession />} />
          <Route path="/esercizi" element={<ExerciseBank />} />
          <Route path="/esercizi/nuovo" element={<ExerciseEditor />} />
          <Route path="/esercizi/:id/modifica" element={<ExerciseEditor />} />
          <Route path="/shadowing" element={<Shadowing />} />
        </Routes>
      </main>
    </div>
  )
}

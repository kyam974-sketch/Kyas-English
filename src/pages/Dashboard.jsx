import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import StreakBadge from '../components/StreakBadge.jsx'
import { computeStreak } from '../lib/gamification.js'

const NAMES_VISIBLE_KEY = 'kya_names_visible'

function initials(name) {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function Dashboard() {
  const [students, setStudents] = useState([])
  const [streaks, setStreaks] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ name: '', level: '', exam_date: '', notes: '' })
  const [namesVisible, setNamesVisible] = useState(() => sessionStorage.getItem(NAMES_VISIBLE_KEY) === 'yes')

  function toggleNames() {
    const next = !namesVisible
    setNamesVisible(next)
    sessionStorage.setItem(NAMES_VISIBLE_KEY, next ? 'yes' : 'no')
  }

  async function loadStudents() {
    setLoading(true)
    const { data, error } = await supabase
      .from('pl_students')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setStudents(data)

    const { data: results } = await supabase
      .from('pl_exercise_results')
      .select('student_id, completed_at')
    const byStudent = {}
    ;(results || []).forEach((r) => {
      if (!byStudent[r.student_id]) byStudent[r.student_id] = []
      byStudent[r.student_id].push(r.completed_at)
    })
    const streakMap = {}
    Object.entries(byStudent).forEach(([id, dates]) => {
      streakMap[id] = computeStreak(dates)
    })
    setStreaks(streakMap)
    setLoading(false)
  }

  useEffect(() => {
    loadStudents()
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const { error } = await supabase.from('pl_students').insert({
      name: form.name.trim(),
      level: form.level.trim() || null,
      exam_date: form.exam_date || null,
      notes: form.notes.trim() || null,
    })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setForm({ name: '', level: '', exam_date: '', notes: '' })
    setShowForm(false)
    loadStudents()
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null
    return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
  }

  const borderColors = ['border-yellow', 'border-coral', 'border-green', 'border-blue']
  const avatarColors = ['bg-yellow', 'bg-coral', 'bg-green', 'bg-blue', 'bg-violet']

  return (
    <div>
      <div className="flex items-center justify-between mb-6 pt-2 flex-wrap gap-3">
        <h1 className="font-display text-3xl text-ink">Your students 👋</h1>
        <div className="flex gap-2">
          <button
            onClick={toggleNames}
            className={`text-sm px-4 py-2.5 rounded-pill font-bold ${
              namesVisible ? 'bg-ink text-white' : 'bg-violet-soft text-violet'
            }`}
          >
            {namesVisible ? '🔓 Names visible' : '🔒 Names hidden'}
          </button>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="bg-violet text-white text-sm px-5 py-2.5 rounded-pill hover:opacity-90 shadow-md shadow-violet/30"
          >
            {showForm ? 'Cancel' : '+ New student'}
          </button>
        </div>
      </div>

      {!namesVisible && (
        <p className="text-xs text-muted mb-4">
          Names are hidden for privacy — showing initials only. Tap "Names hidden" to reveal them when you're alone.
        </p>
      )}

      {error && <p className="text-coral text-sm mb-4">Error: {error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="card p-5 mb-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Name *</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border-2 border-violet-soft rounded-xl px-3 py-2 bg-white"
                placeholder="Full name"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Level / class</span>
              <input
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="border-2 border-violet-soft rounded-xl px-3 py-2 bg-white"
                placeholder="e.g. Adult A1, Year 4 high school, etc."
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Exam / deadline date (optional)</span>
              <input
                type="date"
                value={form.exam_date}
                onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
                className="border-2 border-violet-soft rounded-xl px-3 py-2 bg-white"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-muted">Notes</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="border-2 border-violet-soft rounded-xl px-3 py-2 bg-white"
                rows={2}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 bg-violet text-white text-sm px-5 py-2.5 rounded-pill hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save student'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : students.length === 0 ? (
        <p className="text-muted">No students yet. Add one to get started.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {students.map((s, i) => {
            const days = daysUntil(s.exam_date)
            const urgent = days !== null && days <= 30 && days >= 0
            return (
              <Link
                key={s.id}
                to={`/studenti/${s.id}`}
                className={`card p-5 border-b-4 ${borderColors[i % borderColors.length]} hover:-translate-y-0.5 transition-transform flex items-center gap-4`}
              >
                <div
                  className={`w-12 h-12 rounded-full ${avatarColors[i % avatarColors.length]} text-white font-display text-lg flex items-center justify-center shrink-0`}
                >
                  {initials(s.name)}
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-xl text-ink truncate">
                    {namesVisible ? s.name : 'Student'}
                  </h2>
                  {namesVisible && s.level && <p className="text-sm text-muted mt-0.5 truncate">{s.level}</p>}
                  {s.exam_date && (
                    <p className={`text-xs font-data mt-1 font-bold ${urgent ? 'text-coral' : 'text-muted'}`}>
                      {days >= 0 ? `EXAM IN ${days} DAYS ⏳` : 'EXAM DATE PASSED'}
                    </p>
                  )}
                  <div className="mt-2">
                    <StreakBadge points={s.points || 0} streak={streaks[s.id] || 0} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

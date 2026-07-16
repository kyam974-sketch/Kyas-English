import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import StreakBadge from '../components/StreakBadge.jsx'
import { computeStreak } from '../lib/gamification.js'

export default function Dashboard() {
  const [students, setStudents] = useState([])
  const [streaks, setStreaks] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ name: '', level: '', exam_date: '', notes: '' })

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6 pt-2">
        <h1 className="font-display text-3xl text-ink">I tuoi allievi 👋</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-violet text-white text-sm px-5 py-2.5 rounded-pill hover:opacity-90 shadow-md shadow-violet/30"
        >
          {showForm ? 'Annulla' : '+ Nuovo allievo'}
        </button>
      </div>

      {error && <p className="text-coral text-sm mb-4">Errore: {error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="card p-5 mb-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Nome *</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border-2 border-violet-soft rounded-xl px-3 py-2 bg-white"
                placeholder="es. Lavinia"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Livello / classe</span>
              <input
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="border-2 border-violet-soft rounded-xl px-3 py-2 bg-white"
                placeholder="es. 4a superiore - esame riparazione"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Data esame/scadenza (opzionale)</span>
              <input
                type="date"
                value={form.exam_date}
                onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
                className="border-2 border-violet-soft rounded-xl px-3 py-2 bg-white"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-muted">Note</span>
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
            {saving ? 'Salvo...' : 'Salva allievo'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-muted">Carico...</p>
      ) : students.length === 0 ? (
        <p className="text-muted">Nessun allievo ancora. Aggiungine uno per iniziare.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {students.map((s, i) => {
            const days = daysUntil(s.exam_date)
            const urgent = days !== null && days <= 30 && days >= 0
            return (
              <Link
                key={s.id}
                to={`/studenti/${s.id}`}
                className={`card p-5 border-b-4 ${borderColors[i % borderColors.length]} hover:-translate-y-0.5 transition-transform block`}
              >
                <h2 className="font-display text-xl text-ink">{s.name}</h2>
                {s.level && <p className="text-sm text-muted mt-1">{s.level}</p>}
                {s.exam_date && (
                  <p className={`text-xs font-data mt-1.5 font-bold ${urgent ? 'text-coral' : 'text-muted'}`}>
                    {days >= 0 ? `ESAME TRA ${days} GIORNI ⏳` : 'DATA ESAME PASSATA'}
                  </p>
                )}
                <div className="mt-3">
                  <StreakBadge points={s.points || 0} streak={streaks[s.id] || 0} />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

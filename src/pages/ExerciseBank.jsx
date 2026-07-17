import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { getActiveSession, addExerciseToActiveSession } from '../lib/activeSession.js'

const TYPE_LABELS = {
  grammar: 'Grammar', reading: 'Reading', cloze: 'Cloze', vocab: 'Vocabulary',
  listening: 'Listening 🎧', game: 'Game ⚡',
}

export default function ExerciseBank() {
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [topicFilter, setTopicFilter] = useState('all')
  const [seriesFilter, setSeriesFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState(null)
  const [activeSession, setActiveSessionState] = useState(getActiveSession())
  const [justAdded, setJustAdded] = useState(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('pl_exercises').select('*').order('created_at', { ascending: false })
    if (error) setError(error.message)
    setExercises(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { setActiveSessionState(getActiveSession()) }, [])

  async function handleDelete(id) {
    if (!confirm('Delete this exercise from the bank?')) return
    const { error } = await supabase.from('pl_exercises').delete().eq('id', id)
    if (error) { setError(error.message); return }
    load()
  }

  function handleAddToSession(id) {
    const updated = addExerciseToActiveSession(id)
    setActiveSessionState(updated)
    setJustAdded(id)
    setTimeout(() => setJustAdded((cur) => (cur === id ? null : cur)), 1500)
  }

  const topics_available = Array.from(new Set(exercises.map((e) => e.topic_tag).filter(Boolean))).sort()
  const series_available = Array.from(new Set(exercises.map((e) => e.source_clip).filter(Boolean))).sort()
  const filtered = exercises.filter((e) => {
    if (typeFilter !== 'all' && e.type !== typeFilter) return false
    if (topicFilter !== 'all' && e.topic_tag !== topicFilter) return false
    if (seriesFilter !== 'all' && e.source_clip !== seriesFilter) return false
    if (search.trim() && !e.title.toLowerCase().includes(search.trim().toLowerCase())) return false
    return true
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4 pt-2">
        <h1 className="font-display text-3xl text-ink">Exercise bank</h1>
        <Link to="/esercizi/nuovo" className="bg-violet text-white text-sm px-5 py-2.5 rounded-pill hover:opacity-90 shadow-md shadow-violet/30">
          + New exercise
        </Link>
      </div>

      {activeSession && (
        <div className="card p-3.5 mb-5 border-l-4 border-green flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-green font-bold">
            🟢 In session with {activeSession.studentName} — tap "Add to session" on any exercise below.
          </p>
          <Link
            to={`/studenti/${activeSession.studentId}/sessione/${activeSession.lessonId}`}
            className="text-sm text-violet font-bold hover:underline"
          >
            ← Back to session
          </Link>
        </div>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by title..."
        className="w-full border-2 border-violet-soft rounded-xl px-4 py-2.5 bg-white text-sm mb-4"
      />

      <div className="flex gap-2 mb-2 flex-wrap">
        {['all', 'grammar', 'reading', 'cloze', 'vocab', 'listening', 'game'].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`text-xs px-3.5 py-1.5 rounded-pill font-data font-bold ${
              typeFilter === t ? 'bg-ink text-white' : 'bg-white text-muted hover:bg-violet-soft'
            }`}
          >
            {t === 'all' ? 'All types' : TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {topics_available.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          <button
            onClick={() => setTopicFilter('all')}
            className={`text-xs px-3.5 py-1.5 rounded-pill font-data font-bold ${
              topicFilter === 'all' ? 'bg-violet text-white' : 'bg-white text-muted hover:bg-violet-soft'
            }`}
          >
            All topics
          </button>
          {topics_available.map((t) => (
            <button
              key={t}
              onClick={() => setTopicFilter(t)}
              className={`text-xs px-3.5 py-1.5 rounded-pill font-data font-bold ${
                topicFilter === t ? 'bg-violet text-white' : 'bg-white text-muted hover:bg-violet-soft'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {series_available.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setSeriesFilter('all')}
            className={`text-xs px-3.5 py-1.5 rounded-pill font-data font-bold ${
              seriesFilter === 'all' ? 'bg-ink text-white' : 'bg-white text-muted hover:bg-violet-soft'
            }`}
          >
            🎬 All series/clips
          </button>
          {series_available.map((s) => (
            <button
              key={s}
              onClick={() => setSeriesFilter(s)}
              className={`text-xs px-3.5 py-1.5 rounded-pill font-data font-bold ${
                seriesFilter === s ? 'bg-ink text-white' : 'bg-white text-muted hover:bg-violet-soft'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-coral text-sm mb-3">Error: {error}</p>}

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted text-sm">No exercises here yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((ex) => (
            <li key={ex.id} className="card p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-display text-lg text-ink">{ex.title}</p>
                <div className="flex gap-2 mt-1 items-center flex-wrap">
                  <span className="text-xs font-data bg-violet-soft text-violet px-2.5 py-0.5 rounded-pill font-bold">{TYPE_LABELS[ex.type]}</span>
                  {ex.topic_tag && <span className="text-xs text-muted">{ex.topic_tag}</span>}
                  {ex.source_clip && <span className="text-xs text-muted">🎬 {ex.source_clip}</span>}
                </div>
              </div>
              <div className="flex gap-3 shrink-0 text-sm items-center">
                {activeSession && (
                  <button
                    onClick={() => handleAddToSession(ex.id)}
                    disabled={activeSession.selectedIds?.includes(ex.id)}
                    className="text-sm text-green font-bold hover:underline disabled:text-muted disabled:no-underline"
                  >
                    {activeSession.selectedIds?.includes(ex.id)
                      ? 'In session ✓'
                      : justAdded === ex.id
                      ? 'Added ✓'
                      : '+ Add to session'}
                  </button>
                )}
                <Link to={`/esercizi/${ex.id}/modifica`} className="text-violet font-bold hover:underline">Edit</Link>
                <button onClick={() => handleDelete(ex.id)} className="text-coral font-bold hover:underline">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

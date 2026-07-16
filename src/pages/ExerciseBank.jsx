import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

const TYPE_LABELS = {
  grammar: 'Grammar', reading: 'Reading', cloze: 'Cloze', vocab: 'Vocabulary',
  listening: 'Listening 🎧', game: 'Gioco ⚡',
}

export default function ExerciseBank() {
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('pl_exercises').select('*').order('created_at', { ascending: false })
    if (error) setError(error.message)
    setExercises(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id) {
    if (!confirm('Eliminare questo esercizio dalla banca?')) return
    const { error } = await supabase.from('pl_exercises').delete().eq('id', id)
    if (error) { setError(error.message); return }
    load()
  }

  const filtered = filter === 'all' ? exercises : exercises.filter((e) => e.type === filter)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 pt-2">
        <h1 className="font-display text-3xl text-ink">Banca esercizi</h1>
        <Link to="/esercizi/nuovo" className="bg-violet text-white text-sm px-5 py-2.5 rounded-pill hover:opacity-90 shadow-md shadow-violet/30">
          + Nuovo esercizio
        </Link>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'grammar', 'reading', 'cloze', 'vocab', 'listening', 'game'].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`text-xs px-3.5 py-1.5 rounded-pill font-data font-bold ${
              filter === t ? 'bg-ink text-white' : 'bg-white text-muted hover:bg-violet-soft'
            }`}
          >
            {t === 'all' ? 'Tutti' : TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {error && <p className="text-coral text-sm mb-3">Errore: {error}</p>}

      {loading ? (
        <p className="text-muted">Carico...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted text-sm">Nessun esercizio qui ancora.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((ex) => (
            <li key={ex.id} className="card p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-display text-lg text-ink">{ex.title}</p>
                <div className="flex gap-2 mt-1 items-center">
                  <span className="text-xs font-data bg-violet-soft text-violet px-2.5 py-0.5 rounded-pill font-bold">{TYPE_LABELS[ex.type]}</span>
                  {ex.topic_tag && <span className="text-xs text-muted">{ex.topic_tag}</span>}
                </div>
              </div>
              <div className="flex gap-3 shrink-0 text-sm">
                <Link to={`/esercizi/${ex.id}/modifica`} className="text-violet font-bold hover:underline">Modifica</Link>
                <button onClick={() => handleDelete(ex.id)} className="text-coral font-bold hover:underline">Elimina</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

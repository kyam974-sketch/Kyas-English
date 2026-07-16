import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import StreakBadge from '../components/StreakBadge.jsx'
import { computeStreak, computeTopicProgress, allBadgeDefinitions } from '../lib/gamification.js'

const TOPIC_COLORS = ['bg-green', 'bg-yellow', 'bg-coral', 'bg-blue', 'bg-violet']

export default function StudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [lessons, setLessons] = useState([])
  const [topicProgress, setTopicProgress] = useState([])
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', level: '', exam_date: '', notes: '' })
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    const { data: s, error: se } = await supabase.from('pl_students').select('*').eq('id', id).single()
    const { data: l } = await supabase
      .from('pl_lessons')
      .select('*')
      .eq('student_id', id)
      .order('lesson_date', { ascending: false })
    const { data: results } = await supabase
      .from('pl_exercise_results')
      .select('*')
      .eq('student_id', id)
    const { data: exercises } = await supabase.from('pl_exercises').select('id, topic_tag')

    if (se) setError(se.message)
    if (s) {
      setStudent(s)
      setForm({
        name: s.name || '',
        level: s.level || '',
        exam_date: s.exam_date || '',
        notes: s.notes || '',
      })
    }
    setLessons(l || [])

    const exercisesById = {}
    ;(exercises || []).forEach((e) => (exercisesById[e.id] = e))
    setTopicProgress(computeTopicProgress(results || [], exercisesById))
    setStreak(computeStreak((results || []).map((r) => r.completed_at)))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id])

  async function saveProfile(e) {
    e.preventDefault()
    const { error } = await supabase
      .from('pl_students')
      .update({
        name: form.name.trim(),
        level: form.level.trim() || null,
        exam_date: form.exam_date || null,
        notes: form.notes.trim() || null,
      })
      .eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    setEditing(false)
    load()
  }

  async function deleteStudent() {
    if (!confirm(`Permanently delete ${student.name}? This will also delete their lesson history, exercise results, and points. This cannot be undone.`)) return
    const { error } = await supabase.from('pl_students').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/')
  }

  if (loading) return <p className="text-muted">Loading...</p>
  if (!student) return <p className="text-coral">Student not found.</p>

  const earnedKeys = new Set((student.badges || []).map((b) => b.key))
  const lastLessonWithSummary = lessons.find((l) => l.summary)

  return (
    <div>
      <Link to="/" className="text-sm text-violet font-bold hover:underline">← All students</Link>

      <div className="card p-6 mt-3 mb-7 border-b-4 border-yellow">
        {!editing ? (
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-display text-2xl text-ink">{student.name}</h1>
              {student.level && <p className="text-muted text-sm mt-1">{student.level}</p>}
              {student.exam_date && (
                <p className="font-data text-xs text-coral font-bold mt-1">Exam: {student.exam_date}</p>
              )}
              {student.notes && <p className="text-sm text-ink mt-3">{student.notes}</p>}
              <div className="mt-3">
                <StreakBadge points={student.points || 0} streak={streak} />
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex gap-3">
                <button onClick={() => setEditing(true)} className="text-sm text-violet font-bold hover:underline">
                  Edit
                </button>
                <button onClick={deleteStudent} className="text-sm text-coral font-bold hover:underline">
                  Delete
                </button>
              </div>
              <Link
                to={`/studenti/${id}/sessione`}
                className="bg-violet text-white text-sm px-5 py-2.5 rounded-pill hover:opacity-90 shadow-md shadow-violet/30"
              >
                + New session
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={saveProfile} className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border-2 border-violet-soft rounded-xl px-3 py-2 bg-white" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Level / class</span>
              <input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="border-2 border-violet-soft rounded-xl px-3 py-2 bg-white" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Exam / deadline date</span>
              <input type="date" value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} className="border-2 border-violet-soft rounded-xl px-3 py-2 bg-white" />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-muted">Notes</span>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="border-2 border-violet-soft rounded-xl px-3 py-2 bg-white" rows={3} />
            </label>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" className="bg-violet text-white text-sm px-5 py-2 rounded-pill">Save</button>
              <button type="button" onClick={() => setEditing(false)} className="text-sm text-muted px-4 py-2">Cancel</button>
            </div>
          </form>
        )}
      </div>

      {error && <p className="text-coral text-sm mb-4">Error: {error}</p>}

      {topicProgress.length > 0 && (
        <>
          <h2 className="font-display text-xl text-ink mb-3">Progress by topic 📊</h2>
          <div className="card p-6 mb-7">
            {topicProgress.map((t, i) => (
              <div key={t.topic} className="mb-3.5 last:mb-0">
                <div className="flex justify-between text-sm mb-1.5">
                  <span>{t.topic}</span>
                  <span className="font-data text-muted">{t.pct}%</span>
                </div>
                <div className="progress-track">
                  <div
                    className={`progress-fill ${TOPIC_COLORS[i % TOPIC_COLORS.length]}`}
                    style={{ width: `${t.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="font-display text-xl text-ink mb-3">Achievements 🏅</h2>
      <div className="flex gap-3 flex-wrap mb-7">
        {allBadgeDefinitions().map((b) => (
          <div
            key={b.key}
            className="card px-4 py-3.5 text-center w-28"
            style={{ opacity: earnedKeys.has(b.key) ? 1 : 0.35 }}
          >
            <div className="text-2xl">{b.icon}</div>
            <div className="text-[11px] mt-1.5 font-bold">{b.label}</div>
          </div>
        ))}
      </div>

      {lastLessonWithSummary && (
        <>
          <h2 className="font-display text-xl text-ink mb-3">Latest summary 📝</h2>
          <div className="card p-5 mb-7">
            <div className="font-data text-xs text-muted">{lastLessonWithSummary.lesson_date}</div>
            <p className="text-sm mt-2 leading-relaxed whitespace-pre-wrap">{lastLessonWithSummary.summary}</p>
          </div>
        </>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl text-ink">Lesson history</h2>
      </div>

      {lessons.length === 0 ? (
        <p className="text-muted text-sm">No lessons logged yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lessons.map((l) => (
            <Link key={l.id} to={`/studenti/${id}/sessione/${l.id}`} className="card p-4 block hover:-translate-y-0.5 transition-transform">
              <div className="flex items-baseline justify-between">
                <span className="font-data text-xs text-muted">{l.lesson_date}</span>
                {l.points_earned > 0 && (
                  <span className="font-data text-xs text-gold font-bold">+{l.points_earned} pt</span>
                )}
              </div>
              {l.topics && l.topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {l.topics.map((t, i) => (
                    <span key={i} className="text-xs bg-violet-soft text-violet px-2.5 py-0.5 rounded-pill font-data font-bold">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {l.notes && <p className="text-sm text-ink mt-2">{l.notes}</p>}
              <span className="text-xs text-violet font-bold mt-2 inline-block">Resume →</span>
            </Link>
          ))}
        </ul>
      )}
    </div>
  )
}

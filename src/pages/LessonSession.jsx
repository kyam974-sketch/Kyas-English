import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import ExerciseRunner from '../components/ExerciseRunner.jsx'
import { computeStreak, computeTopicProgress, checkNewBadges } from '../lib/gamification.js'

export default function LessonSession() {
  const { id, lessonId: lessonIdParam } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [allExercises, setAllExercises] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [topics, setTopics] = useState('')
  const [notes, setNotes] = useState('')
  const [lessonId, setLessonId] = useState(lessonIdParam || null)
  const [resuming, setResuming] = useState(Boolean(lessonIdParam))
  const [wasFirstLesson, setWasFirstLesson] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [sessionResults, setSessionResults] = useState([])
  const [summaryData, setSummaryData] = useState(null)
  const [finishing, setFinishing] = useState(false)
  const [existingSummary, setExistingSummary] = useState(null)
  const [existingPointsEarned, setExistingPointsEarned] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: s } = await supabase.from('pl_students').select('*').eq('id', id).single()
      const { data: ex } = await supabase.from('pl_exercises').select('*').order('created_at', { ascending: false })
      const { count } = await supabase.from('pl_lessons').select('id', { count: 'exact', head: true }).eq('student_id', id)
      setStudent(s)
      setAllExercises(ex || [])
      setWasFirstLesson((count || 0) === 0)

      if (lessonIdParam) {
        const { data: existingLesson } = await supabase.from('pl_lessons').select('*').eq('id', lessonIdParam).single()
        if (existingLesson) {
          setTopics((existingLesson.topics || []).join(', '))
          setNotes(existingLesson.notes || '')
          setExistingSummary(existingLesson.summary || null)
          setExistingPointsEarned(existingLesson.points_earned || 0)
        }
      }
    }
    load()
  }, [id, lessonIdParam])

  async function startLesson(e) {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await supabase
      .from('pl_lessons')
      .insert({
        student_id: id,
        topics: topics.split(',').map((t) => t.trim()).filter(Boolean),
        notes: notes.trim() || null,
      })
      .select()
      .single()
    setSaving(false)
    if (error) { setError(error.message); return }
    setLessonId(data.id)
  }

  async function saveExerciseResult({ exercise_id, answers, score }) {
    const { error } = await supabase.from('pl_exercise_results').insert({
      student_id: id, lesson_id: lessonId, exercise_id, answers, score,
    })
    if (error) { setError(error.message); return }
    const ex = allExercises.find((e) => e.id === exercise_id)
    setSessionResults((prev) => [...prev, { exercise_id, score, title: ex?.title, topic_tag: ex?.topic_tag }])
  }

  async function finishSession() {
    setFinishing(true)
    const sessionPoints = sessionResults.reduce((sum, r) => sum + (r.score != null ? Math.round(r.score * 10) : 0), 5)

    const { data: allResults } = await supabase.from('pl_exercise_results').select('*').eq('student_id', id)
    const { data: exercisesForProgress } = await supabase.from('pl_exercises').select('id, topic_tag')
    const exercisesById = {}
    ;(exercisesForProgress || []).forEach((e) => (exercisesById[e.id] = e))
    const topicProgress = computeTopicProgress(allResults || [], exercisesById)
    const streak = computeStreak((allResults || []).map((r) => r.completed_at))

    const newBadges = checkNewBadges({
      existingBadges: student.badges || [],
      isFirstLesson: wasFirstLesson,
      sessionResults,
      streak,
      topicProgress,
    })

    const newPoints = (student.points || 0) + sessionPoints
    const updatedBadges = [...(student.badges || []), ...newBadges]

    await supabase.from('pl_students').update({ points: newPoints, badges: updatedBadges }).eq('id', id)

    const perf = sessionResults.length
      ? sessionResults.map((r) => `${r.title}: ${r.score != null ? Math.round(r.score * 100) + '%' : '—'}`).join(', ')
      : 'no exercises done in this session'

    const newChunk = `Topics covered today: ${topics || 'general review'}.\nExercises done — ${perf}.${notes ? `\nNotes: ${notes}` : ''}${newBadges.length ? `\nNew achievements: ${newBadges.map((b) => b.label).join(', ')} 🎉` : ''}`

    const summary = existingSummary
      ? `${existingSummary}\n\n— update on ${new Date().toLocaleDateString('en-GB')} —\n${newChunk}`
      : newChunk
    const totalPointsEarned = existingPointsEarned + sessionPoints

    await supabase.from('pl_lessons').update({ summary, points_earned: totalPointsEarned }).eq('id', lessonId)

    setSummaryData({ sessionPoints, streak, newBadges, summary })
    setFinishing(false)
  }

  if (!student) return <p className="text-muted">Loading...</p>

  return (
    <div>
      <Link to={`/studenti/${id}`} className="text-sm text-violet font-bold hover:underline">← {student.name}</Link>
      <h1 className="font-display text-3xl text-ink mt-3 mb-6">Session with {student.name}</h1>

      {error && <p className="text-coral text-sm mb-4">Error: {error}</p>}

      {!lessonId ? (
        <form onSubmit={startLesson} className="card p-6 flex flex-col gap-4">
          <p className="text-sm text-muted">Log the lesson first, then choose the exercises to do together live.</p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Topics covered (comma separated)</span>
            <input value={topics} onChange={(e) => setTopics(e.target.value)} className="border-2 border-violet-soft rounded-xl px-3 py-2 bg-white" placeholder="past simple, for-since" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Lesson notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="border-2 border-violet-soft rounded-xl px-3 py-2 bg-white" />
          </label>
          <button type="submit" disabled={saving} className="bg-violet text-white text-sm px-5 py-2.5 rounded-pill hover:opacity-90 self-start disabled:opacity-50">
            {saving ? 'Starting...' : 'Start session'}
          </button>
        </form>
      ) : summaryData ? (
        <div className="card pop-in p-8">
          <div className="text-5xl text-center">🎉</div>
          <h2 className="font-display text-2xl text-center text-ink mb-4">Session complete!</h2>
          <div className="flex justify-center gap-2.5 mb-5">
            <span className="font-data text-sm bg-gold-soft text-gold px-3.5 py-1.5 rounded-pill font-bold">+{summaryData.sessionPoints} points</span>
            <span className="font-data text-sm bg-coral-soft text-coral px-3.5 py-1.5 rounded-pill font-bold">🔥 streak {summaryData.streak} {summaryData.streak === 1 ? 'day' : 'days'}</span>
          </div>
          {summaryData.newBadges.length > 0 && (
            <div className="flex justify-center gap-3 mb-5">
              {summaryData.newBadges.map((b) => (
                <div key={b.key} className="text-center">
                  <div className="text-3xl">{b.icon}</div>
                  <div className="text-xs font-bold mt-1">{b.label}</div>
                </div>
              ))}
            </div>
          )}
          <p className="text-sm leading-relaxed bg-page rounded-xl p-4 whitespace-pre-wrap">{summaryData.summary}</p>
          <div className="flex gap-2.5 justify-center mt-5 flex-wrap">
            <button
              onClick={() => navigator.clipboard.writeText(summaryData.summary)}
              className="bg-violet-soft text-violet text-sm px-5 py-2.5 rounded-pill font-bold"
            >
              Copy summary
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(summaryData.summary)}`}
              target="_blank" rel="noreferrer"
              className="bg-green-soft text-green text-sm px-5 py-2.5 rounded-pill font-bold"
            >
              Share on WhatsApp
            </a>
            <button onClick={() => navigate(`/studenti/${id}`)} className="bg-violet text-white text-sm px-5 py-2.5 rounded-pill font-bold">
              Back to profile
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="card p-4 mb-6 border-l-4 border-green">
            <p className="text-sm text-green font-data font-bold">
              {resuming ? 'Lesson resumed ✓ — keep adding exercises' : 'Lesson logged ✓ — now choose the exercises'}
            </p>
            {resuming && topics && (
              <p className="text-xs text-muted mt-1">Topics: {topics}</p>
            )}
          </div>

          {selectedIds.length === 0 ? (
            <div>
              <p className="text-sm text-muted mb-3">Select one or more exercises from the bank:</p>
              {allExercises.length === 0 ? (
                <p className="text-sm text-muted">
                  No exercises in the bank yet.{' '}
                  <Link to="/esercizi/nuovo" className="text-violet font-bold hover:underline">Create one</Link>.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {allExercises.map((ex) => (
                    <li key={ex.id} className="card p-3.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-ink font-semibold">{ex.title}</p>
                        <p className="text-xs text-muted font-data">{ex.type}{ex.topic_tag ? ` · ${ex.topic_tag}` : ''}</p>
                      </div>
                      <button onClick={() => setSelectedIds([...selectedIds, ex.id])} className="text-sm text-violet font-bold hover:underline">
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {allExercises.filter((ex) => selectedIds.includes(ex.id)).map((ex) => (
                <ExerciseRunner key={ex.id} exercise={ex} onSaveResult={saveExerciseResult} />
              ))}
              <div className="flex gap-3 flex-wrap">
                {allExercises.filter((ex) => !selectedIds.includes(ex.id)).length > 0 && (
                  <select
                    onChange={(e) => { if (e.target.value) setSelectedIds([...selectedIds, e.target.value]) }}
                    defaultValue=""
                    className="border-2 border-violet-soft rounded-xl px-3 py-2 bg-white text-sm"
                  >
                    <option value="">+ Add another exercise...</option>
                    {allExercises.filter((ex) => !selectedIds.includes(ex.id)).map((ex) => (
                      <option key={ex.id} value={ex.id}>{ex.title}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={finishSession}
                  disabled={finishing}
                  className="bg-green text-white text-sm px-5 py-2.5 rounded-pill font-bold disabled:opacity-50"
                >
                  {finishing ? 'Finishing...' : 'End session →'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

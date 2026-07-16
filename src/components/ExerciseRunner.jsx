import { useState } from 'react'

function normalize(s) {
  return (s || '').trim().toLowerCase()
}

function Mark({ correct }) {
  return correct ? (
    <span className="pop-in inline-flex ml-1.5 align-middle" aria-label="corretto">
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="12" fill="#2FBF71" />
        <path d="M6 12.5 L10 16.5 L18 7.5" stroke="white" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  ) : (
    <span className="pop-in inline-flex ml-1.5 align-middle" aria-label="da rivedere">
      <svg width="20" height="20" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="10" fill="#FF5C7A" />
        <path d="M6 6 L14 14 M14 6 L6 14" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </svg>
    </span>
  )
}

function extractYoutubeId(url) {
  const m = (url || '').match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/)
  return m ? m[1] : null
}

export default function ExerciseRunner({ exercise, onSaveResult }) {
  const [answers, setAnswers] = useState({})
  const [checked, setChecked] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [saved, setSaved] = useState(false)
  const [gameSelection, setGameSelection] = useState(null)
  const [gameMatched, setGameMatched] = useState([])

  const { type, content } = exercise

  function check() {
    let correct = 0
    let total = 0

    if (type === 'grammar' || type === 'vocab') {
      content.items.forEach((it) => { total += 1; if (normalize(answers[it.id]) === normalize(it.answer)) correct += 1 })
    } else if (type === 'reading' || type === 'listening') {
      content.questions.forEach((q) => { total += 1; if (normalize(answers[q.id]) === normalize(q.answer)) correct += 1 })
    } else if (type === 'cloze') {
      Object.entries(content.answers || {}).forEach(([num, word]) => { total += 1; if (normalize(answers[num]) === normalize(word)) correct += 1 })
    } else if (type === 'game') {
      total = content.pairs.length
      correct = gameMatched.length
    }

    setScore({ correct, total })
    setChecked(true)
    setSaved(false)
  }

  async function save() {
    await onSaveResult({
      exercise_id: exercise.id,
      answers: type === 'game' ? { matched: gameMatched } : answers,
      score: score.total > 0 ? Math.round((score.correct / score.total) * 100) / 100 : null,
    })
    setSaved(true)
  }

  function pickLeft(pairId) {
    if (gameMatched.includes(pairId)) return
    setGameSelection(pairId)
  }
  function pickRight(pairId) {
    if (gameMatched.includes(pairId)) return
    if (gameSelection === pairId) {
      setGameMatched([...gameMatched, pairId])
      setGameSelection(null)
    } else if (gameSelection) {
      setGameSelection(null)
    }
  }

  const youtubeId = type === 'listening' ? extractYoutubeId(content.media_url) : null

  return (
    <div className="card p-6">
      <h3 className="font-display text-lg text-ink mb-3">{exercise.title}</h3>

      {(type === 'grammar' || type === 'vocab') && (
        <div className="flex flex-col gap-3">
          {content.items.map((it) => {
            const [before, after] = it.text.split('___')
            return (
              <div key={it.id} className="flex items-center flex-wrap gap-1 text-sm">
                <span>{before}</span>
                <input
                  value={answers[it.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [it.id]: e.target.value })}
                  className="border-b-2 border-violet-soft bg-transparent px-1 w-28 focus:border-violet outline-none"
                />
                <span>{after}</span>
                {checked && <Mark correct={normalize(answers[it.id]) === normalize(it.answer)} />}
              </div>
            )
          })}
        </div>
      )}

      {type === 'reading' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap bg-page p-3.5 rounded-xl">{content.passage}</p>
          {content.questions.map((q) => (
            <QuestionBlock key={q.id} q={q} answers={answers} setAnswers={setAnswers} checked={checked} />
          ))}
        </div>
      )}

      {type === 'listening' && (
        <div className="flex flex-col gap-4">
          {youtubeId ? (
            <div className="rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${youtubeId}`}
                title="Listening"
                allowFullScreen
              />
            </div>
          ) : content.media_url ? (
            <audio controls src={content.media_url} className="w-full" />
          ) : (
            <p className="text-sm text-muted bg-page p-3.5 rounded-xl">Nessun audio/video collegato a questo esercizio.</p>
          )}
          {content.questions.map((q) => (
            <QuestionBlock key={q.id} q={q} answers={answers} setAnswers={setAnswers} checked={checked} />
          ))}
        </div>
      )}

      {type === 'cloze' && (
        <p className="text-sm text-ink leading-loose">
          {content.text.split(/(\{\{\d+\}\})/g).map((part, i) => {
            const m = part.match(/\{\{(\d+)\}\}/)
            if (!m) return <span key={i}>{part}</span>
            const num = m[1]
            return (
              <span key={i} className="inline-flex items-center">
                <select
                  value={answers[num] || ''}
                  onChange={(e) => setAnswers({ ...answers, [num]: e.target.value })}
                  className="border-b-2 border-violet-soft bg-transparent mx-1 focus:border-violet outline-none"
                >
                  <option value="">___</option>
                  {content.word_bank.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
                {checked && <Mark correct={normalize(answers[num]) === normalize(content.answers[num])} />}
              </span>
            )
          })}
        </p>
      )}

      {type === 'game' && (
        <div>
          <p className="text-xs text-muted mb-3">Clicca prima a sinistra, poi la definizione giusta a destra.</p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-2">
              {content.pairs.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => pickLeft(p.id)}
                  className={`rounded-xl px-3.5 py-2.5 text-sm font-bold text-center border-2 ${
                    gameMatched.includes(p.id)
                      ? 'bg-green-soft border-green'
                      : gameSelection === p.id
                      ? 'bg-violet-soft border-violet'
                      : 'bg-violet-soft/40 border-transparent'
                  }`}
                >
                  {p.left} {gameMatched.includes(p.id) && '✓'}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {content.pairs.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => pickRight(p.id)}
                  className={`rounded-xl px-3.5 py-2.5 text-sm text-center border-2 ${
                    gameMatched.includes(p.id) ? 'bg-green-soft border-green' : 'bg-white border-violet-soft'
                  }`}
                >
                  {p.right}
                </button>
              ))}
            </div>
          </div>
          <p className="font-data text-xs text-muted mt-3">{gameMatched.length} / {content.pairs.length} abbinati</p>
        </div>
      )}

      <div className="flex items-center gap-4 mt-5 flex-wrap">
        <button onClick={check} className="bg-violet text-white text-sm px-5 py-2.5 rounded-pill hover:opacity-90">
          Correggi
        </button>
        {checked && <span className="font-data text-sm text-ink font-bold">{score.correct} / {score.total}</span>}
        {checked && onSaveResult && (
          <button onClick={save} disabled={saved} className="text-sm text-violet font-bold hover:underline disabled:text-green disabled:no-underline">
            {saved ? 'Salvato ✓' : 'Salva risultato'}
          </button>
        )}
      </div>
    </div>
  )
}

function QuestionBlock({ q, answers, setAnswers, checked }) {
  function normalize(s) { return (s || '').trim().toLowerCase() }
  return (
    <div className="text-sm">
      <p className="text-ink mb-1.5">{q.text}</p>
      {q.type === 'mc' ? (
        <div className="flex flex-col gap-1">
          {q.options.map((opt) => (
            <label key={opt} className="flex items-center gap-2">
              <input type="radio" name={q.id} checked={answers[q.id] === opt} onChange={() => setAnswers({ ...answers, [q.id]: opt })} />
              {opt}
            </label>
          ))}
        </div>
      ) : (
        <input
          value={answers[q.id] || ''}
          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
          className="border-b-2 border-violet-soft bg-transparent px-1 w-full focus:border-violet outline-none"
        />
      )}
      {checked && <Mark correct={normalize(answers[q.id]) === normalize(q.answer)} />}
    </div>
  )
}

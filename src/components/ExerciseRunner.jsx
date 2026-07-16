import { useState, useMemo } from 'react'

function shuffle(array) {
  if (array.length < 2) return [...array]
  let a = [...array]
  let attempts = 0
  do {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    attempts += 1
  } while (a.every((item, i) => item.id === array[i].id) && attempts < 10)
  return a
}

function normalize(s) {
  return (s || '').trim().toLowerCase()
}

function splitAnswerParts(answer, blanksCount) {
  const parts = (answer || '').split('/').map((a) => a.trim())
  return parts.length === blanksCount ? parts : null
}

function GrammarItem({ it, answers, setAnswers, checked }) {
  const parts = it.text.split('___')
  const blanksCount = parts.length - 1
  const expectedParts = splitAnswerParts(it.answer, blanksCount)

  const userValues = Array.from({ length: blanksCount }, (_, i) => answers[`${it.id}__${i}`] || '')
  const allCorrect = expectedParts
    ? expectedParts.every((exp, i) => normalize(userValues[i]) === normalize(exp))
    : normalize(userValues.join(' / ')) === normalize(it.answer)

  return (
    <div className="flex items-center flex-wrap gap-1 text-sm">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1">
          <span>{part}</span>
          {i < blanksCount && (
            <>
              <input
                value={answers[`${it.id}__${i}`] || ''}
                onChange={(e) => setAnswers({ ...answers, [`${it.id}__${i}`]: e.target.value })}
                className="border-b-2 border-violet-soft bg-transparent px-1 w-28 focus:border-violet outline-none"
              />
              {checked && expectedParts && (
                <Mark correct={normalize(userValues[i]) === normalize(expectedParts[i])} />
              )}
            </>
          )}
        </span>
      ))}
      {checked && !expectedParts && <Mark correct={allCorrect} />}
    </div>
  )
}

function Mark({ correct }) {
  return correct ? (
    <span className="pop-in inline-flex ml-1.5 align-middle" aria-label="correct">
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="12" fill="#2FBF71" />
        <path d="M6 12.5 L10 16.5 L18 7.5" stroke="white" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  ) : (
    <span className="pop-in inline-flex ml-1.5 align-middle" aria-label="needs work">
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
  const [placements, setPlacements] = useState({})
  const [heldItem, setHeldItem] = useState(null)

  const { type, content } = exercise

  function check() {
    let correct = 0
    let total = 0

    if (type === 'grammar' || type === 'vocab') {
      content.items.forEach((it) => {
        total += 1
        const blanksCount = (it.text.match(/___/g) || []).length
        const expectedParts = splitAnswerParts(it.answer, blanksCount)
        if (expectedParts) {
          const userValues = Array.from({ length: blanksCount }, (_, i) => answers[`${it.id}__${i}`] || '')
          if (expectedParts.every((exp, i) => normalize(userValues[i]) === normalize(exp))) correct += 1
        } else {
          const userValues = Array.from({ length: blanksCount }, (_, i) => answers[`${it.id}__${i}`] || '')
          if (normalize(userValues.join(' / ')) === normalize(it.answer)) correct += 1
        }
      })
    } else if (type === 'reading' || type === 'listening') {
      content.questions.forEach((q) => { total += 1; if (normalize(answers[q.id]) === normalize(q.answer)) correct += 1 })
    } else if (type === 'cloze') {
      Object.entries(content.answers || {}).forEach(([num, word]) => { total += 1; if (normalize(answers[num]) === normalize(word)) correct += 1 })
    } else if (type === 'game') {
      total = content.pairs.length
      correct = content.pairs.filter((p) => placements[p.id] === p.id).length
    }

    setScore({ correct, total })
    setChecked(true)
    setSaved(false)
  }

  async function save() {
    await onSaveResult({
      exercise_id: exercise.id,
      answers: type === 'game' ? { placements } : answers,
      score: score.total > 0 ? Math.round((score.correct / score.total) * 100) / 100 : null,
    })
    setSaved(true)
  }

  function tapPoolItem(rightId) {
    setHeldItem((h) => (h === rightId ? null : rightId))
  }
  function tapSlot(leftId) {
    if (heldItem) {
      setPlacements({ ...placements, [leftId]: heldItem })
      setHeldItem(null)
    } else if (placements[leftId]) {
      const next = { ...placements }
      delete next[leftId]
      setPlacements(next)
    }
  }

  const youtubeId = type === 'listening' ? extractYoutubeId(content.media_url) : null
  const shuffledPairs = useMemo(
    () => (type === 'game' ? shuffle(content.pairs) : []),
    [exercise.id]
  )

  return (
    <div className="card p-6">
      <h3 className="font-display text-lg text-ink mb-3">{exercise.title}</h3>

      {(type === 'grammar' || type === 'vocab') && (
        <div className="flex flex-col gap-3">
          {content.items.map((it) => (
            <GrammarItem key={it.id} it={it} answers={answers} setAnswers={setAnswers} checked={checked} />
          ))}
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
            <p className="text-sm text-muted bg-page p-3.5 rounded-xl">No audio/video linked to this exercise yet.</p>
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
          <p className="text-xs text-muted mb-3">Tap a word on the right, then tap where it belongs on the left.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              {content.pairs.map((p) => {
                const placedId = placements[p.id]
                const placedItem = placedId ? content.pairs.find((x) => x.id === placedId) : null
                const isCorrect = checked ? placedId === p.id : null
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => tapSlot(p.id)}
                    className={`rounded-xl px-3.5 py-2.5 text-sm text-left border-2 flex items-center justify-between gap-2 ${
                      checked
                        ? isCorrect
                          ? 'bg-green-soft border-green'
                          : 'bg-coral-soft border-coral'
                        : placedItem
                        ? 'bg-violet-soft border-violet'
                        : 'bg-white border-dashed border-violet-soft'
                    }`}
                  >
                    <span>
                      <span className="font-bold">{p.left}</span>
                      {placedItem && <span className="text-muted"> — {placedItem.right}</span>}
                      {!placedItem && <span className="text-muted italic"> tap to fill...</span>}
                    </span>
                    {checked && <Mark correct={isCorrect} />}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-col gap-2">
              {shuffledPairs
                .filter((p) => !Object.values(placements).includes(p.id))
                .map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => tapPoolItem(p.id)}
                    className={`rounded-xl px-3.5 py-2.5 text-sm text-center border-2 ${
                      heldItem === p.id ? 'bg-yellow/30 border-yellow' : 'bg-white border-violet-soft'
                    }`}
                  >
                    {p.right}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mt-5 flex-wrap">
        <button onClick={check} className="bg-violet text-white text-sm px-5 py-2.5 rounded-pill hover:opacity-90">
          Check
        </button>
        {checked && <span className="font-data text-sm text-ink font-bold">{score.correct} / {score.total}</span>}
        {checked && onSaveResult && (
          <button onClick={save} disabled={saved} className="text-sm text-violet font-bold hover:underline disabled:text-green disabled:no-underline">
            {saved ? 'Saved ✓' : 'Save result'}
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

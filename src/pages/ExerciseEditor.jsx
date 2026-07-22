import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

function newId() {
  return Math.random().toString(36).slice(2, 8)
}

const inputCls = 'border-2 border-violet-soft rounded-xl px-3 py-2 bg-white text-sm'

export default function ExerciseEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)

  const [type, setType] = useState('grammar')
  const [title, setTitle] = useState('')
  const [topicTag, setTopicTag] = useState('')
  const [sourceClip, setSourceClip] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [items, setItems] = useState([{ id: newId(), text: '', answer: '' }])

  const [passage, setPassage] = useState('')
  const [questions, setQuestions] = useState([
    { id: newId(), text: '', type: 'open', options: '', answer: '' },
  ])

  const [clozeText, setClozeText] = useState('')
  const [wordBank, setWordBank] = useState('')
  const [clozeAnswers, setClozeAnswers] = useState([{ number: '1', word: '' }])

  const [mediaUrl, setMediaUrl] = useState('')
  const [listeningQuestions, setListeningQuestions] = useState([
    { id: newId(), text: '', type: 'open', options: '', answer: '' },
  ])

  const [pairs, setPairs] = useState([{ id: newId(), left: '', right: '' }])
  const [gameKind, setGameKind] = useState('matching')
  const [quizQuestions, setQuizQuestions] = useState([
    { id: newId(), text: '', options: '', answer: '' },
  ])
  const [reorderItems, setReorderItems] = useState([{ id: newId(), sentence: '' }])
  const [oddRounds, setOddRounds] = useState([{ id: newId(), options: '', odd: '' }])

  useEffect(() => {
    if (!editing) return
    async function load() {
      const { data, error } = await supabase.from('pl_exercises').select('*').eq('id', id).single()
      if (error) {
        setError(error.message)
        return
      }
      setType(data.type)
      setTitle(data.title)
      setTopicTag(data.topic_tag || '')
      setSourceClip(data.source_clip || '')
      const c = data.content || {}
      if (data.type === 'grammar' || data.type === 'vocab') {
        setItems(c.items && c.items.length ? c.items : [{ id: newId(), text: '', answer: '' }])
      } else if (data.type === 'reading') {
        setPassage(c.passage || '')
        setQuestions((c.questions || []).map((q) => ({ ...q, options: (q.options || []).join(', ') })))
      } else if (data.type === 'cloze') {
        setClozeText(c.text || '')
        setWordBank((c.word_bank || []).join(', '))
        setClozeAnswers(Object.entries(c.answers || {}).map(([number, word]) => ({ number, word })))
      } else if (data.type === 'listening') {
        setMediaUrl(c.media_url || '')
        setListeningQuestions((c.questions || []).map((q) => ({ ...q, options: (q.options || []).join(', ') })))
      } else if (data.type === 'game') {
        const kind = c.kind || 'matching'
        setGameKind(kind)
        if (kind === 'quiz') {
          setQuizQuestions((c.questions || []).map((q) => ({ ...q, options: (q.options || []).join(', ') })))
        } else if (kind === 'reorder') {
          setReorderItems((c.items || []).map((it) => ({ id: it.id, sentence: (it.correct || []).join(' ') })))
        } else if (kind === 'odd_one_out') {
          setOddRounds((c.rounds || []).map((r) => ({ id: r.id, options: (r.options || []).join(', '), odd: r.odd })))
        } else {
          setPairs(c.pairs && c.pairs.length ? c.pairs : [{ id: newId(), left: '', right: '' }])
        }
      }
    }
    load()
  }, [id, editing])

  function buildContent() {
    if (type === 'grammar' || type === 'vocab') {
      return { items: items.filter((it) => it.text.trim()) }
    }
    if (type === 'reading') {
      return {
        passage,
        questions: questions
          .filter((q) => q.text.trim())
          .map((q) => ({
            id: q.id,
            text: q.text,
            type: q.type,
            options: q.type === 'mc' ? q.options.split(',').map((o) => o.trim()).filter(Boolean) : [],
            answer: q.answer,
          })),
      }
    }
    if (type === 'cloze') {
      const answers = {}
      clozeAnswers.forEach((a) => {
        if (a.number.trim()) answers[a.number.trim()] = a.word.trim()
      })
      return {
        text: clozeText,
        word_bank: wordBank.split(',').map((w) => w.trim()).filter(Boolean),
        answers,
      }
    }
    if (type === 'listening') {
      return {
        media_url: mediaUrl,
        questions: listeningQuestions
          .filter((q) => q.text.trim())
          .map((q) => ({
            id: q.id,
            text: q.text,
            type: q.type,
            options: q.type === 'mc' ? q.options.split(',').map((o) => o.trim()).filter(Boolean) : [],
            answer: q.answer,
          })),
      }
    }
    if (type === 'game') {
      if (gameKind === 'quiz') {
        return {
          kind: 'quiz',
          questions: quizQuestions
            .filter((q) => q.text.trim())
            .map((q) => ({
              id: q.id,
              text: q.text,
              options: q.options.split(',').map((o) => o.trim()).filter(Boolean),
              answer: q.answer,
            })),
        }
      }
      if (gameKind === 'reorder') {
        return {
          kind: 'reorder',
          items: reorderItems
            .filter((it) => it.sentence.trim())
            .map((it) => ({ id: it.id, correct: it.sentence.trim().split(/\s+/) })),
        }
      }
      if (gameKind === 'odd_one_out') {
        return {
          kind: 'odd_one_out',
          rounds: oddRounds
            .filter((r) => r.options.trim())
            .map((r) => ({
              id: r.id,
              options: r.options.split(',').map((o) => o.trim()).filter(Boolean),
              odd: r.odd.trim(),
            })),
        }
      }
      return { kind: 'matching', pairs: pairs.filter((p) => p.left.trim() && p.right.trim()) }
    }
    return {}
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    const payload = {
      type,
      title: title.trim(),
      topic_tag: topicTag.trim() || null,
      source_clip: sourceClip.trim() || null,
      content: buildContent(),
    }
    const { error } = editing
      ? await supabase.from('pl_exercises').update(payload).eq('id', id)
      : await supabase.from('pl_exercises').insert(payload)
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/esercizi')
  }

  function QuestionsEditor({ list, setList }) {
    return (
      <div>
        <p className="text-sm text-muted mb-2">Questions</p>
        <div className="flex flex-col gap-3">
          {list.map((q, i) => (
            <div key={q.id} className="border-2 border-violet-soft rounded-xl p-3 flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  value={q.text}
                  onChange={(e) => { const next = [...list]; next[i].text = e.target.value; setList(next) }}
                  placeholder="Question"
                  className={inputCls + ' flex-1'}
                />
                <select
                  value={q.type}
                  onChange={(e) => { const next = [...list]; next[i].type = e.target.value; setList(next) }}
                  className={inputCls}
                >
                  <option value="open">Open answer</option>
                  <option value="mc">Multiple choice</option>
                </select>
                <button type="button" onClick={() => setList(list.filter((x) => x.id !== q.id))} className="text-coral text-xs px-2">✕</button>
              </div>
              {q.type === 'mc' && (
                <input
                  value={q.options}
                  onChange={(e) => { const next = [...list]; next[i].options = e.target.value; setList(next) }}
                  placeholder="Options separated by commas"
                  className={inputCls}
                />
              )}
              <input
                value={q.answer}
                onChange={(e) => { const next = [...list]; next[i].answer = e.target.value; setList(next) }}
                placeholder="Correct answer (for open answers, separate accepted variants with |)"
                className={inputCls}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setList([...list, { id: newId(), text: '', type: 'open', options: '', answer: '' }])}
          className="text-violet text-sm mt-2 font-bold hover:underline"
        >
          + Add question
        </button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink mb-6 pt-2">
        {editing ? 'Edit exercise' : 'New exercise'}
      </h1>

      {error && <p className="text-coral text-sm mb-4">Error: {error}</p>}

      <form onSubmit={handleSave} className="card p-6 flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)} disabled={editing} className={inputCls}>
              <option value="grammar">Grammar (fill in the blanks)</option>
              <option value="vocab">Vocabulary (fill in the blanks)</option>
              <option value="reading">Reading comprehension</option>
              <option value="cloze">Cloze (word insertion)</option>
              <option value="listening">Listening (audio + questions)</option>
              <option value="game">Game</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Title *</span>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Past Simple vs Continuous" />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-muted">Topic (used for filtering and progress tracking)</span>
            <input value={topicTag} onChange={(e) => setTopicTag(e.target.value)} className={inputCls} placeholder="e.g. conditional-1, for-since, family" />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-muted">Source clip / series (optional)</span>
            <input value={sourceClip} onChange={(e) => setSourceClip(e.target.value)} className={inputCls} placeholder="e.g. The Vampire Diaries — Pilot" />
          </label>
        </div>

        {(type === 'grammar' || type === 'vocab') && (
          <div>
            <p className="text-sm text-muted mb-2">
              Write the sentence using <code className="bg-violet-soft px-1 rounded">___</code> for each blank (you can have more than one per sentence). If there's more than one blank, write the answers separated by <code className="bg-violet-soft px-1 rounded">/</code> in the same order (e.g. "had / would travel"). The <strong>Level</strong> field is optional — only set it if you want this exercise to estimate a CEFR level from the results (e.g. a placement test).
            </p>
            <div className="flex flex-col gap-2">
              {items.map((it, i) => (
                <div key={it.id} className="flex gap-2 items-start">
                  <input value={it.text} onChange={(e) => { const next = [...items]; next[i].text = e.target.value; setItems(next) }} placeholder="I ___ (go) to the cinema last Saturday." className={inputCls + ' flex-1'} />
                  <input value={it.answer} onChange={(e) => { const next = [...items]; next[i].answer = e.target.value; setItems(next) }} placeholder="went" className={inputCls + ' w-32'} />
                  <select value={it.level || ''} onChange={(e) => { const next = [...items]; next[i].level = e.target.value || undefined; setItems(next) }} className={inputCls + ' w-24'}>
                    <option value="">Level</option>
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                    <option value="C1">C1</option>
                  </select>
                  <button type="button" onClick={() => setItems(items.filter((x) => x.id !== it.id))} className="text-coral text-xs px-2 py-2">✕</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setItems([...items, { id: newId(), text: '', answer: '' }])} className="text-violet text-sm mt-2 font-bold hover:underline">+ Add sentence</button>
          </div>
        )}

        {type === 'reading' && (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Passage</span>
              <textarea value={passage} onChange={(e) => setPassage(e.target.value)} rows={5} className={inputCls} />
            </label>
            <QuestionsEditor list={questions} setList={setQuestions} />
          </div>
        )}

        {type === 'cloze' && (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Text — use <code className="bg-violet-soft px-1 rounded">{'{{1}}'}</code>, <code className="bg-violet-soft px-1 rounded">{'{{2}}'}</code> etc. for the blanks</span>
              <textarea value={clozeText} onChange={(e) => setClozeText(e.target.value)} rows={5} className={inputCls} placeholder={'My family has always loved spending time together. If I {{1}} more time...'} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Word bank (comma separated)</span>
              <input value={wordBank} onChange={(e) => setWordBank(e.target.value)} className={inputCls} placeholder="had, have, would" />
            </label>
            <div>
              <p className="text-sm text-muted mb-2">Answer key</p>
              <div className="flex flex-col gap-2">
                {clozeAnswers.map((a, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={a.number} onChange={(e) => { const next = [...clozeAnswers]; next[i].number = e.target.value; setClozeAnswers(next) }} placeholder="1" className={inputCls + ' w-16'} />
                    <input value={a.word} onChange={(e) => { const next = [...clozeAnswers]; next[i].word = e.target.value; setClozeAnswers(next) }} placeholder="had" className={inputCls + ' flex-1'} />
                    <button type="button" onClick={() => setClozeAnswers(clozeAnswers.filter((_, idx) => idx !== i))} className="text-coral text-xs px-2">✕</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setClozeAnswers([...clozeAnswers, { number: String(clozeAnswers.length + 1), word: '' }])} className="text-violet text-sm mt-2 font-bold hover:underline">+ Add answer</button>
            </div>
          </div>
        )}

        {type === 'listening' && (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Audio/video link (YouTube, mp3, etc.)</span>
              <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className={inputCls} placeholder="https://..." />
            </label>
            <QuestionsEditor list={listeningQuestions} setList={setListeningQuestions} />
          </div>
        )}

        {type === 'game' && (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Game kind</span>
              <select value={gameKind} onChange={(e) => setGameKind(e.target.value)} className={inputCls}>
                <option value="matching">Matching — tap to pair up words</option>
                <option value="quiz">Quiz — multiple choice</option>
                <option value="reorder">Sentence reorder — tap words in order</option>
                <option value="odd_one_out">Odd one out — spot the word that doesn't belong</option>
              </select>
            </label>

            {gameKind === 'matching' && (
              <div>
                <p className="text-sm text-muted mb-2">Pairs to match (e.g. verb form ↔ definition)</p>
                <div className="flex flex-col gap-2">
                  {pairs.map((p, i) => (
                    <div key={p.id} className="flex gap-2">
                      <input value={p.left} onChange={(e) => { const next = [...pairs]; next[i].left = e.target.value; setPairs(next) }} placeholder="went" className={inputCls + ' flex-1'} />
                      <input value={p.right} onChange={(e) => { const next = [...pairs]; next[i].right = e.target.value; setPairs(next) }} placeholder="past simple of go" className={inputCls + ' flex-1'} />
                      <button type="button" onClick={() => setPairs(pairs.filter((x) => x.id !== p.id))} className="text-coral text-xs px-2">✕</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setPairs([...pairs, { id: newId(), left: '', right: '' }])} className="text-violet text-sm mt-2 font-bold hover:underline">+ Add pair</button>
              </div>
            )}

            {gameKind === 'quiz' && (
              <div>
                <p className="text-sm text-muted mb-2">Multiple choice questions — no timer, answers revealed at the end</p>
                <div className="flex flex-col gap-3">
                  {quizQuestions.map((q, i) => (
                    <div key={q.id} className="border-2 border-violet-soft rounded-xl p-3 flex flex-col gap-2">
                      <input value={q.text} onChange={(e) => { const next = [...quizQuestions]; next[i].text = e.target.value; setQuizQuestions(next) }} placeholder="Question" className={inputCls} />
                      <input value={q.options} onChange={(e) => { const next = [...quizQuestions]; next[i].options = e.target.value; setQuizQuestions(next) }} placeholder="Options separated by commas" className={inputCls} />
                      <div className="flex gap-2">
                        <input value={q.answer} onChange={(e) => { const next = [...quizQuestions]; next[i].answer = e.target.value; setQuizQuestions(next) }} placeholder="Correct answer (must match one option exactly)" className={inputCls + ' flex-1'} />
                        <button type="button" onClick={() => setQuizQuestions(quizQuestions.filter((x) => x.id !== q.id))} className="text-coral text-xs px-2">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setQuizQuestions([...quizQuestions, { id: newId(), text: '', options: '', answer: '' }])} className="text-violet text-sm mt-2 font-bold hover:underline">+ Add question</button>
              </div>
            )}

            {gameKind === 'reorder' && (
              <div>
                <p className="text-sm text-muted mb-2">Write each sentence in the correct order — the app scrambles it for the student to rebuild</p>
                <div className="flex flex-col gap-2">
                  {reorderItems.map((it, i) => (
                    <div key={it.id} className="flex gap-2">
                      <input value={it.sentence} onChange={(e) => { const next = [...reorderItems]; next[i].sentence = e.target.value; setReorderItems(next) }} placeholder="If I had more time, I would travel more." className={inputCls + ' flex-1'} />
                      <button type="button" onClick={() => setReorderItems(reorderItems.filter((x) => x.id !== it.id))} className="text-coral text-xs px-2">✕</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setReorderItems([...reorderItems, { id: newId(), sentence: '' }])} className="text-violet text-sm mt-2 font-bold hover:underline">+ Add sentence</button>
              </div>
            )}

            {gameKind === 'odd_one_out' && (
              <div>
                <p className="text-sm text-muted mb-2">One round = a set of words/phrases plus the one that doesn't belong</p>
                <div className="flex flex-col gap-3">
                  {oddRounds.map((r, i) => (
                    <div key={r.id} className="border-2 border-violet-soft rounded-xl p-3 flex flex-col gap-2">
                      <input value={r.options} onChange={(e) => { const next = [...oddRounds]; next[i].options = e.target.value; setOddRounds(next) }} placeholder="apple, banana, volleyball, orange" className={inputCls} />
                      <div className="flex gap-2">
                        <input value={r.odd} onChange={(e) => { const next = [...oddRounds]; next[i].odd = e.target.value; setOddRounds(next) }} placeholder="Which one is the odd one out? (must match exactly)" className={inputCls + ' flex-1'} />
                        <button type="button" onClick={() => setOddRounds(oddRounds.filter((x) => x.id !== r.id))} className="text-coral text-xs px-2">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setOddRounds([...oddRounds, { id: newId(), options: '', odd: '' }])} className="text-violet text-sm mt-2 font-bold hover:underline">+ Add round</button>
              </div>
            )}
          </div>
        )}

        <button type="submit" disabled={saving} className="bg-violet text-white text-sm px-5 py-2.5 rounded-pill hover:opacity-90 disabled:opacity-50 self-start">
          {saving ? 'Saving...' : 'Save exercise'}
        </button>
      </form>
    </div>
  )
}

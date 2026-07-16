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
        setPairs(c.pairs && c.pairs.length ? c.pairs : [{ id: newId(), left: '', right: '' }])
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
      return { pairs: pairs.filter((p) => p.left.trim() && p.right.trim()) }
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
        <p className="text-sm text-muted mb-2">Domande</p>
        <div className="flex flex-col gap-3">
          {list.map((q, i) => (
            <div key={q.id} className="border-2 border-violet-soft rounded-xl p-3 flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  value={q.text}
                  onChange={(e) => { const next = [...list]; next[i].text = e.target.value; setList(next) }}
                  placeholder="Domanda"
                  className={inputCls + ' flex-1'}
                />
                <select
                  value={q.type}
                  onChange={(e) => { const next = [...list]; next[i].type = e.target.value; setList(next) }}
                  className={inputCls}
                >
                  <option value="open">Risposta aperta</option>
                  <option value="mc">Scelta multipla</option>
                </select>
                <button type="button" onClick={() => setList(list.filter((x) => x.id !== q.id))} className="text-coral text-xs px-2">✕</button>
              </div>
              {q.type === 'mc' && (
                <input
                  value={q.options}
                  onChange={(e) => { const next = [...list]; next[i].options = e.target.value; setList(next) }}
                  placeholder="Opzioni separate da virgola"
                  className={inputCls}
                />
              )}
              <input
                value={q.answer}
                onChange={(e) => { const next = [...list]; next[i].answer = e.target.value; setList(next) }}
                placeholder="Risposta corretta"
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
          + Aggiungi domanda
        </button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink mb-6 pt-2">
        {editing ? 'Modifica esercizio' : 'Nuovo esercizio'}
      </h1>

      {error && <p className="text-coral text-sm mb-4">Errore: {error}</p>}

      <form onSubmit={handleSave} className="card p-6 flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Tipo</span>
            <select value={type} onChange={(e) => setType(e.target.value)} disabled={editing} className={inputCls}>
              <option value="grammar">Grammar (frasi da completare)</option>
              <option value="vocab">Vocabulary (frasi da completare)</option>
              <option value="reading">Reading comprehension</option>
              <option value="cloze">Cloze (inserimento parole)</option>
              <option value="listening">Listening (ascolto + domande)</option>
              <option value="game">Gioco — Abbinamento</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Titolo *</span>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="es. Past Simple vs Continuous" />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-muted">Argomento (per filtrare e calcolare i progressi)</span>
            <input value={topicTag} onChange={(e) => setTopicTag(e.target.value)} className={inputCls} placeholder="es. conditional-1, for-since, family" />
          </label>
        </div>

        {(type === 'grammar' || type === 'vocab') && (
          <div>
            <p className="text-sm text-muted mb-2">
              Scrivi la frase usando <code className="bg-violet-soft px-1 rounded">___</code> per ogni spazio vuoto (anche più di uno nella stessa frase). Se ci sono più spazi, scrivi le risposte separate da <code className="bg-violet-soft px-1 rounded">/</code> nello stesso ordine (es. "had / would travel").
            </p>
            <div className="flex flex-col gap-2">
              {items.map((it, i) => (
                <div key={it.id} className="flex gap-2 items-start">
                  <input value={it.text} onChange={(e) => { const next = [...items]; next[i].text = e.target.value; setItems(next) }} placeholder="I ___ (go) to the cinema last Saturday." className={inputCls + ' flex-1'} />
                  <input value={it.answer} onChange={(e) => { const next = [...items]; next[i].answer = e.target.value; setItems(next) }} placeholder="went" className={inputCls + ' w-32'} />
                  <button type="button" onClick={() => setItems(items.filter((x) => x.id !== it.id))} className="text-coral text-xs px-2 py-2">✕</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setItems([...items, { id: newId(), text: '', answer: '' }])} className="text-violet text-sm mt-2 font-bold hover:underline">+ Aggiungi frase</button>
          </div>
        )}

        {type === 'reading' && (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Testo</span>
              <textarea value={passage} onChange={(e) => setPassage(e.target.value)} rows={5} className={inputCls} />
            </label>
            <QuestionsEditor list={questions} setList={setQuestions} />
          </div>
        )}

        {type === 'cloze' && (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Testo — usa <code className="bg-violet-soft px-1 rounded">{'{{1}}'}</code>, <code className="bg-violet-soft px-1 rounded">{'{{2}}'}</code> ecc. per gli spazi</span>
              <textarea value={clozeText} onChange={(e) => setClozeText(e.target.value)} rows={5} className={inputCls} placeholder={'My family has always loved spending time together. If I {{1}} more time...'} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Banca di parole (separate da virgola)</span>
              <input value={wordBank} onChange={(e) => setWordBank(e.target.value)} className={inputCls} placeholder="had, have, would" />
            </label>
            <div>
              <p className="text-sm text-muted mb-2">Chiave di risposta</p>
              <div className="flex flex-col gap-2">
                {clozeAnswers.map((a, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={a.number} onChange={(e) => { const next = [...clozeAnswers]; next[i].number = e.target.value; setClozeAnswers(next) }} placeholder="1" className={inputCls + ' w-16'} />
                    <input value={a.word} onChange={(e) => { const next = [...clozeAnswers]; next[i].word = e.target.value; setClozeAnswers(next) }} placeholder="had" className={inputCls + ' flex-1'} />
                    <button type="button" onClick={() => setClozeAnswers(clozeAnswers.filter((_, idx) => idx !== i))} className="text-coral text-xs px-2">✕</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setClozeAnswers([...clozeAnswers, { number: String(clozeAnswers.length + 1), word: '' }])} className="text-violet text-sm mt-2 font-bold hover:underline">+ Aggiungi risposta</button>
            </div>
          </div>
        )}

        {type === 'listening' && (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Link audio/video (YouTube, mp3, ecc.)</span>
              <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className={inputCls} placeholder="https://..." />
            </label>
            <QuestionsEditor list={listeningQuestions} setList={setListeningQuestions} />
          </div>
        )}

        {type === 'game' && (
          <div>
            <p className="text-sm text-muted mb-2">Coppie da abbinare (es. forma verbale ↔ definizione)</p>
            <div className="flex flex-col gap-2">
              {pairs.map((p, i) => (
                <div key={p.id} className="flex gap-2">
                  <input value={p.left} onChange={(e) => { const next = [...pairs]; next[i].left = e.target.value; setPairs(next) }} placeholder="went" className={inputCls + ' flex-1'} />
                  <input value={p.right} onChange={(e) => { const next = [...pairs]; next[i].right = e.target.value; setPairs(next) }} placeholder="past simple di go" className={inputCls + ' flex-1'} />
                  <button type="button" onClick={() => setPairs(pairs.filter((x) => x.id !== p.id))} className="text-coral text-xs px-2">✕</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setPairs([...pairs, { id: newId(), left: '', right: '' }])} className="text-violet text-sm mt-2 font-bold hover:underline">+ Aggiungi coppia</button>
          </div>
        )}

        <button type="submit" disabled={saving} className="bg-violet text-white text-sm px-5 py-2.5 rounded-pill hover:opacity-90 disabled:opacity-50 self-start">
          {saving ? 'Salvo...' : 'Salva esercizio'}
        </button>
      </form>
    </div>
  )
}

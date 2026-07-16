import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const SHADOWLAB_URL = 'https://shadowing-app-black.vercel.app'

export default function Shadowing() {
  const [students, setStudents] = useState([])
  const [selected, setSelected] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('pl_students').select('id, name').order('name')
      setStudents(data || [])
    }
    load()
  }, [])

  const iframeSrc = selected
    ? `${SHADOWLAB_URL}?student=${encodeURIComponent(selected)}`
    : SHADOWLAB_URL

  return (
    <div>
      <div className="flex items-center justify-between mb-5 pt-2 flex-wrap gap-3">
        <h1 className="font-display text-3xl text-ink">Shadowing 🎬</h1>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Student:</span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="border-2 border-violet-soft rounded-xl px-3 py-2 bg-white text-sm"
          >
            <option value="">None selected</option>
            {students.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-xs text-muted mb-3">
        ShadowLab opens right below. If you've selected a student, their name is passed along automatically
        (ShadowLab needs a small update to read it — see the separate notes).
      </p>

      <div className="card overflow-hidden" style={{ height: '75vh' }}>
        <iframe key={iframeSrc} src={iframeSrc} title="ShadowLab" className="w-full h-full border-0" />
      </div>
    </div>
  )
}

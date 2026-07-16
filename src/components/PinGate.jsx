import { useState } from 'react'

const PIN = import.meta.env.VITE_APP_PIN || '1974'
const STORAGE_KEY = 'kya_unlocked'

export default function PinGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(STORAGE_KEY) === 'yes')
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (value === PIN) {
      sessionStorage.setItem(STORAGE_KEY, 'yes')
      setUnlocked(true)
      setError(false)
    } else {
      setError(true)
      setValue('')
    }
  }

  if (unlocked) return children

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="card p-8 w-full max-w-xs text-center">
        <div className="text-4xl mb-2">🐱🇬🇧</div>
        <h1 className="font-display text-xl text-ink mb-1">Kya's English</h1>
        <p className="text-sm text-muted mb-5">Enter the PIN to continue</p>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(false) }}
          className={`border-2 rounded-xl px-3 py-2.5 text-center text-lg tracking-widest w-full mb-3 ${
            error ? 'border-coral' : 'border-violet-soft'
          }`}
          placeholder="••••"
        />
        {error && <p className="text-coral text-xs mb-3">Wrong PIN, try again</p>}
        <button type="submit" className="bg-violet text-white text-sm px-5 py-2.5 rounded-pill font-bold w-full">
          Enter
        </button>
      </form>
    </div>
  )
}

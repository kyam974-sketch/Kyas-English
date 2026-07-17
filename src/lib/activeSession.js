const KEY = 'kya_active_session'

export function getActiveSession() {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setActiveSession(session) {
  sessionStorage.setItem(KEY, JSON.stringify(session))
}

export function clearActiveSession() {
  sessionStorage.removeItem(KEY)
}

export function addExerciseToActiveSession(exerciseId) {
  const session = getActiveSession()
  if (!session) return null
  if (!session.selectedIds.includes(exerciseId)) {
    session.selectedIds = [...session.selectedIds, exerciseId]
    setActiveSession(session)
  }
  return session
}

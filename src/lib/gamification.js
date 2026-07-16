// Calcola giorni consecutivi (streak) a partire da un elenco di date ISO (anche con orario)
export function computeStreak(dateStrings) {
  if (!dateStrings || dateStrings.length === 0) return 0
  const days = new Set(dateStrings.map((d) => new Date(d).toISOString().slice(0, 10)))
  let streak = 0
  let cursor = new Date()
  // se oggi non c'è ancora nulla, si parte comunque a controllare da ieri
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1)
  }
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// Raggruppa i risultati esercizi per topic_tag e calcola una percentuale media
export function computeTopicProgress(results, exercisesById) {
  const byTopic = {}
  results.forEach((r) => {
    const ex = exercisesById[r.exercise_id]
    if (!ex || !ex.topic_tag || r.score == null) return
    if (!byTopic[ex.topic_tag]) byTopic[ex.topic_tag] = { total: 0, count: 0 }
    byTopic[ex.topic_tag].total += r.score
    byTopic[ex.topic_tag].count += 1
  })
  return Object.entries(byTopic).map(([topic, v]) => ({
    topic,
    pct: Math.round((v.total / v.count) * 100),
    attempts: v.count,
  }))
}

const BADGE_CATALOG = {
  first_lesson: { icon: '🥇', label: 'Prima lezione' },
  perfect_score: { icon: '🎯', label: '10/10 in un esercizio' },
  streak_3: { icon: '🔥', label: '3 giorni di fila' },
  topic_mastered: { icon: '🏆', label: 'Argomento padroneggiato' },
}

// Controlla quali nuovi badge sono stati sbloccati in questa sessione
export function checkNewBadges({ existingBadges, isFirstLesson, sessionResults, streak, topicProgress }) {
  const existingKeys = new Set((existingBadges || []).map((b) => b.key))
  const newly = []

  function award(key) {
    if (!existingKeys.has(key)) {
      newly.push({ key, ...BADGE_CATALOG[key], earned_at: new Date().toISOString() })
      existingKeys.add(key)
    }
  }

  if (isFirstLesson) award('first_lesson')
  if (sessionResults.some((r) => r.score === 1)) award('perfect_score')
  if (streak >= 3) award('streak_3')
  if (topicProgress.some((t) => t.pct >= 80 && t.attempts >= 3)) award('topic_mastered')

  return newly
}

export function allBadgeDefinitions() {
  return Object.entries(BADGE_CATALOG).map(([key, v]) => ({ key, ...v }))
}

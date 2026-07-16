export default function StreakBadge({ points, streak }) {
  return (
    <div className="flex gap-2">
      <span className="font-data text-xs bg-gold-soft text-gold px-2.5 py-1 rounded-pill font-bold">
        ⭐ {points} pt
      </span>
      <span className="font-data text-xs bg-coral-soft text-coral px-2.5 py-1 rounded-pill font-bold">
        🔥 {streak} {streak === 1 ? 'giorno' : 'giorni'}
      </span>
    </div>
  )
}

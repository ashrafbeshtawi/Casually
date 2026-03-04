import { PRIORITY_COLORS, type Priority } from '@/types'

interface ProgressBarProps {
  done: number
  total: number
  priority: Priority
}

export function ProgressBar({ done, total, priority }: ProgressBarProps) {
  if (total === 0) return null

  const pct = Math.round((done / total) * 100)
  const color = PRIORITY_COLORS[priority]

  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-muted-foreground text-xs tabular-nums">
        {done}/{total}
      </span>
    </div>
  )
}

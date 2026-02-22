'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { type TaskState, STATE_LABELS } from '@/types'

const FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: STATE_LABELS.ACTIVE },
  { value: 'WAITING', label: STATE_LABELS.WAITING },
  { value: 'BLOCKED', label: STATE_LABELS.BLOCKED },
  { value: 'DONE', label: STATE_LABELS.DONE },
]

export function ProjectListFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentState = searchParams.get('state') || 'ALL'

  function handleFilterChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'ALL') {
      params.delete('state')
    } else {
      params.set('state', value)
    }
    router.push(`/projects?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-1">
      {FILTER_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => handleFilterChange(option.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            currentState === option.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

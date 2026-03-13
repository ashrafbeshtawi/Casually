'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Plus, Flame, Loader2, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EmojiPicker } from '@/components/emoji-picker'

interface Challenge {
  id: string
  title: string
  emoji: string | null
  startedAt: string
  createdAt: string
}

const LEAGUES = [
  { name: 'Seedling', emoji: '\u{1F331}', minDays: 0 },
  { name: 'Bronze', emoji: '\u{1F949}', minDays: 3 },
  { name: 'Silver', emoji: '\u{1F948}', minDays: 7 },
  { name: 'Gold', emoji: '\u{1F947}', minDays: 14 },
  { name: 'Platinum', emoji: '\u{1F48E}', minDays: 30 },
  { name: 'Diamond', emoji: '\u{1F451}', minDays: 60 },
  { name: 'Master', emoji: '\u{1F3C6}', minDays: 120 },
  { name: 'Legend', emoji: '\u2B50', minDays: 365 },
]

function getLeague(startedAt: string) {
  const days = (Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60 * 24)
  let league = LEAGUES[0]
  for (const l of LEAGUES) {
    if (days >= l.minDays) league = l
  }
  return league
}

function formatDuration(startedAt: string) {
  const ms = Date.now() - new Date(startedAt).getTime()
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  return `${minutes}m ${seconds}s`
}

function ChallengeCard({
  challenge,
  onRelapse,
  onDelete,
}: {
  challenge: Challenge
  onRelapse: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [duration, setDuration] = useState(formatDuration(challenge.startedAt))
  const league = getLeague(challenge.startedAt)

  useEffect(() => {
    const timer = setInterval(() => {
      setDuration(formatDuration(challenge.startedAt))
    }, 1000)
    return () => clearInterval(timer)
  }, [challenge.startedAt])

  return (
    <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl shrink-0">{challenge.emoji || league.emoji}</span>
          <div className="min-w-0">
            <h3 className="font-medium text-sm truncate">{challenge.title}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {league.emoji} {league.name}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-950" title="Relapse">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset challenge?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset your timer for &ldquo;{challenge.title}&rdquo; back to zero. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onRelapse(challenge.id)}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" title="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete challenge?</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{challenge.title}&rdquo; will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(challenge.id)}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="mt-3 text-lg font-mono font-semibold tabular-nums">
        {duration}
      </div>
    </div>
  )
}

function CreateChallengeDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), emoji: emoji.trim() || null }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create')
      }
      setTitle('')
      setEmoji('')
      setOpen(false)
      onCreated()
      toast.success('Challenge created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Challenge
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Challenge</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="challenge-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="challenge-title"
              placeholder="e.g. No smoking"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Emoji</Label>
            <EmojiPicker
              value={emoji || null}
              onChange={(val) => setEmoji(val ?? '')}
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !title.trim()}>
              {isLoading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ChallengesDashboard() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/challenges')
      if (!res.ok) throw new Error('Failed to fetch')
      const data: Challenge[] = await res.json()
      setChallenges(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleRelapse(id: string) {
    try {
      const res = await fetch(`/api/challenges/${id}/relapse`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to reset')
      const updated: Challenge = await res.json()
      setChallenges((prev) => prev.map((c) => (c.id === id ? updated : c)))
      toast.success('Challenge reset')
    } catch {
      toast.error('Failed to reset challenge')
    }
  }

  async function handleDelete(id: string) {
    setChallenges((prev) => prev.filter((c) => c.id !== id))
    try {
      const res = await fetch(`/api/challenges/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Challenge deleted')
    } catch {
      toast.error('Failed to delete')
      fetchData()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Challenges</h1>
          <p className="text-muted-foreground text-sm">
            Track your streaks and build better habits.
          </p>
        </div>
        <CreateChallengeDialog onCreated={fetchData} />
      </div>

      {challenges.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Flame className="text-muted-foreground mb-3 h-10 w-10" />
          <p className="text-muted-foreground text-sm">
            No challenges yet. Create one to start tracking!
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {challenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              onRelapse={handleRelapse}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* League reference */}
      {challenges.length > 0 && (
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold mb-2 text-muted-foreground">Leagues</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {LEAGUES.map((l) => (
              <span key={l.name}>
                {l.emoji} {l.name} ({l.minDays}d+)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

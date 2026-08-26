'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Plus, KeyRound, Loader2, Trash2, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface ApiToken {
  id: string
  name: string
  createdAt: string
}

function CopyableBlock({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs whitespace-nowrap">
        {value}
      </code>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        title="Copy"
        onClick={() => {
          navigator.clipboard.writeText(value)
          toast.success('Copied to clipboard')
        }}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

export function SettingsDashboard() {
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState('')
  const [newToken, setNewToken] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/tokens')
      if (!res.ok) throw new Error('Failed to fetch')
      setTokens(await res.json())
    } catch {
      toast.error('Failed to load tokens')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setIsCreating(true)
    try {
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || undefined }),
      })
      if (!res.ok) throw new Error('Failed to create')
      const created = await res.json()
      setNewToken(created.token)
      setName('')
      fetchData()
      toast.success('Token created')
    } catch {
      toast.error('Failed to create token')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDelete(id: string) {
    setTokens((prev) => prev.filter((t) => t.id !== id))
    try {
      const res = await fetch(`/api/tokens/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Token revoked')
    } catch {
      toast.error('Failed to revoke token')
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage access to your Casually data.
        </p>
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <div>
          <h2 className="font-semibold">MCP Access Tokens</h2>
          <p className="text-muted-foreground text-sm">
            Connect AI assistants like Claude to your tasks via MCP. Tokens are
            long-lived and grant full access to your data — keep them secret.
          </p>
        </div>

        <form onSubmit={handleCreate} className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="token-name">Token name</Label>
            <Input
              id="token-name"
              placeholder="e.g. Claude Desktop"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={isCreating}>
            <Plus className="mr-2 h-4 w-4" />
            {isCreating ? 'Creating...' : 'Create Token'}
          </Button>
        </form>

        {newToken && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2 dark:border-amber-800 dark:bg-amber-950">
            <p className="text-sm font-medium">
              Copy your token now — it won&apos;t be shown again.
            </p>
            <CopyableBlock value={newToken} />
            <p className="text-muted-foreground text-xs">
              Add the MCP server with:
            </p>
            <CopyableBlock
              value={`claude mcp add --transport http casually ${typeof window !== 'undefined' ? window.location.origin : ''}/api/mcp --header "Authorization: Bearer ${newToken}"`}
            />
          </div>
        )}

        {tokens.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8">
            <KeyRound className="text-muted-foreground mb-2 h-8 w-8" />
            <p className="text-muted-foreground text-sm">No tokens yet.</p>
          </div>
        ) : (
          <ul className="divide-y rounded-md border">
            {tokens.map((token) => (
              <li key={token.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{token.name}</p>
                  <p className="text-muted-foreground text-xs">
                    Created {new Date(token.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                      title="Revoke"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke token?</AlertDialogTitle>
                      <AlertDialogDescription>
                        &ldquo;{token.name}&rdquo; will stop working immediately. Any
                        MCP client using it will lose access.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(token.id)}>
                        Revoke
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

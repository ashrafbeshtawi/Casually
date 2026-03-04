'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'casually-collapsed'

export function useCollapseState() {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setCollapsed(new Set(JSON.parse(stored)))
      }
    } catch {
      // ignore parse errors
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...collapsed]))
    } catch {
      // ignore storage errors
    }
  }, [collapsed, hydrated])

  const isCollapsed = useCallback(
    (id: string) => !hydrated || collapsed.has(id),
    [collapsed, hydrated]
  )

  const toggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const collapseAll = useCallback((ids: string[]) => {
    setCollapsed(new Set(ids))
  }, [])

  const expandAll = useCallback(() => {
    setCollapsed(new Set())
  }, [])

  return { isCollapsed, toggle, collapseAll, expandAll, hydrated }
}

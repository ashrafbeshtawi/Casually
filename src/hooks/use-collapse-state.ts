'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

function getStoredCollapsed(storageKey: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) return new Set(JSON.parse(stored))
  } catch {
    // ignore parse errors
  }
  return new Set()
}

export function useCollapseState(storageKey: string = 'casually-collapsed') {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => getStoredCollapsed(storageKey))
  const initialized = useRef(typeof window !== 'undefined')

  useEffect(() => {
    if (!initialized.current) return
    try {
      localStorage.setItem(storageKey, JSON.stringify([...collapsed]))
    } catch {
      // ignore storage errors
    }
  }, [collapsed, storageKey])

  const isCollapsed = useCallback(
    (id: string) => collapsed.has(id),
    [collapsed]
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

  return { isCollapsed, toggle, collapseAll, expandAll }
}

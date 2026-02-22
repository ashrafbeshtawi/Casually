'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderKanban,
  Zap,
  RefreshCw,
  Ban,
  Archive,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'One-Off Tasks', href: '/one-off', icon: Zap },
  { label: 'Routines', href: '/routines', icon: RefreshCw },
  { label: 'Blocked', href: '/blocked', icon: Ban },
  { label: 'Archive', href: '/archive', icon: Archive },
]

function NavContent() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 px-3 py-2">
      {navItems.map((item) => {
        const isActive =
          item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden h-screen w-[250px] shrink-0 border-r border-sidebar-border bg-sidebar md:block">
      <div className="flex h-14 items-center border-b border-sidebar-border px-6">
        <Link href="/" className="text-lg font-bold tracking-tight text-sidebar-foreground">
          Casually
        </Link>
      </div>
      <NavContent />
    </aside>
  )
}

export function MobileSidebar() {
  const { sidebarOpen, setSidebarOpen } = useAppStore()

  return (
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <SheetContent side="left" className="w-[250px] bg-sidebar p-0">
        <SheetHeader className="flex h-14 items-center border-b border-sidebar-border px-6">
          <SheetTitle className="text-lg font-bold tracking-tight text-sidebar-foreground">
            Casually
          </SheetTitle>
        </SheetHeader>
        <NavContent />
      </SheetContent>
    </Sheet>
  )
}

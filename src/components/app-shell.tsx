'use client'

import { Sidebar, MobileSidebar } from '@/components/sidebar'
import { Header } from '@/components/header'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <MobileSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

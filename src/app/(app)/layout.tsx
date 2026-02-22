import { SessionProvider } from '@/components/session-provider'
import { AppShell } from '@/components/app-shell'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TooltipProvider>
        <AppShell>{children}</AppShell>
        <Toaster richColors closeButton />
      </TooltipProvider>
    </SessionProvider>
  )
}

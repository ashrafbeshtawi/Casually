import { signIn } from "@/lib/auth"
import type { Metadata } from "next"
import {
  CheckCircle2,
  FolderKanban,
  ListChecks,
  Zap,
  Shield,
  ArrowRight,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Casually — Task Management Without the Stress",
  description:
    "Organize projects, track tasks, and stay on top of your work. A calm, focused task manager built for people who want to get things done without the noise.",
}

const features = [
  {
    icon: FolderKanban,
    title: "Collapsible Projects",
    description:
      "Keep your dashboard clean. Expand projects to see tasks, collapse them when you need focus.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: ListChecks,
    title: "Nested Tasks",
    description:
      "Break projects into bite-sized tasks. Drag to reorder, move between projects in one click.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Zap,
    title: "Priority & State",
    description:
      "Tag tasks by priority and state. Filter your dashboard to see only what matters right now.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Shield,
    title: "Private & Secure",
    description:
      "Your data stays yours. Sign in with Google, and everything is tied to your account.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
]

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <span className="text-lg font-bold tracking-tight">Casually</span>
          <form
            action={async () => {
              "use server"
              await signIn("google", { redirectTo: "/" })
            }}
          >
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Sign in
            </button>
          </form>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col items-center py-20 sm:py-28 text-center">
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Task management
            <br />
            <span className="text-primary">without the stress</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            Organize projects, track tasks, and stay focused — all in a calm
            interface designed to help you make progress, not manage tools.
          </p>
          <form
            action={async () => {
              "use server"
              await signIn("google", { redirectTo: "/" })
            }}
            className="mt-8"
          >
            <button
              type="submit"
              className="inline-flex items-center gap-3 rounded-lg bg-primary px-6 py-3 text-base font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <GoogleIcon />
              Get started with Google
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Free to use. No credit card required.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Everything you need, nothing you don&apos;t
            </h2>
            <p className="mt-3 text-muted-foreground">
              Built for clarity. No bloat, no learning curve.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-card p-6 shadow-sm"
              >
                <div
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${f.bg}`}
                >
                  <f.icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Up and running in seconds
            </h2>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Sign in",
                desc: "One click with your Google account. No forms, no passwords to remember.",
              },
              {
                step: "2",
                title: "Create projects",
                desc: "Group your work into projects. Add tasks, set priorities, and track progress.",
              },
              {
                step: "3",
                title: "Stay on track",
                desc: "Filter by status, reorder by drag-and-drop, and check things off as you go.",
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {s.step}
                </div>
                <h3 className="mt-4 text-base font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to get things done?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Start organizing your work in under a minute.
          </p>
          <form
            action={async () => {
              "use server"
              await signIn("google", { redirectTo: "/" })
            }}
            className="mt-6 inline-flex"
          >
            <button
              type="submit"
              className="inline-flex items-center gap-3 rounded-lg bg-primary px-6 py-3 text-base font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <GoogleIcon />
              Get started for free
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Casually</span>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span>Free to use</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

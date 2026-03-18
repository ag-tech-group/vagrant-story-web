import { lazy, Suspense } from "react"
import { QueryClient } from "@tanstack/react-query"
import {
  createRootRouteWithContext,
  Link,
  Outlet,
} from "@tanstack/react-router"
import { Toaster } from "sonner"
import { RootErrorComponent } from "@/components/error-boundary"
import { NotFound } from "@/components/not-found"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/lib/auth"

const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import("@tanstack/react-router-devtools").then((mod) => ({
        default: mod.TanStackRouterDevtools,
      }))
    )

interface RouterContext {
  queryClient: QueryClient
  auth: {
    isAuthenticated: boolean
    isLoading: boolean
    email: string | null
    userId: string | null
    login: (email: string) => void
    logout: () => Promise<void>
    checkAuth: () => Promise<void>
  }
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: RootErrorComponent,
})

const AUTH_URL = "https://auth.criticalbit.gg"
const SITE_URL = "https://vagrant-story.criticalbit.gg"

const NAV_LINKS = [
  { to: "/" as const, label: "Home" },
  { to: "/weapons" as const, label: "Weapons" },
  { to: "/armor" as const, label: "Armor" },
  { to: "/materials" as const, label: "Materials" },
  { to: "/gems" as const, label: "Gems" },
  { to: "/grips" as const, label: "Grips" },
  { to: "/consumables" as const, label: "Consumables" },
]

function RootComponent() {
  const auth = useAuth()

  return (
    <>
      <nav className="border-border/50 bg-background/80 fixed top-0 z-50 w-full border-b backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="hover:text-primary font-sans text-lg tracking-wide transition-colors"
            >
              Vagrant Story
            </Link>
            <div className="hidden items-center gap-4 text-sm md:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-muted-foreground hover:text-foreground [&.active]:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {auth.isAuthenticated ? (
              <button
                onClick={() => auth.logout()}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {auth.email}
              </button>
            ) : (
              <a
                href={`${AUTH_URL}/login?redirect=${encodeURIComponent(SITE_URL)}`}
                className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              >
                Sign in
              </a>
            )}
          </div>
        </div>
      </nav>
      <div className="flex min-h-screen flex-col pt-14">
        <div className="flex flex-1 flex-col">
          <Outlet />
        </div>
        <footer className="border-border/50 border-t px-4 py-3">
          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <p>
              &copy; {new Date().getFullYear()} AG Technology Group LLC. All
              rights reserved.
            </p>
            <div className="flex gap-4">
              <a
                href="https://criticalbit.gg"
                className="hover:text-foreground transition-colors"
              >
                criticalbit.gg
              </a>
              <a
                href="https://criticalbit.gg/privacy"
                className="hover:text-foreground transition-colors"
              >
                Privacy
              </a>
              <a
                href="https://criticalbit.gg/terms"
                className="hover:text-foreground transition-colors"
              >
                Terms
              </a>
            </div>
          </div>
        </footer>
      </div>
      <Toaster position="bottom-right" richColors closeButton />
      <Suspense fallback={null}>
        <TanStackRouterDevtools />
      </Suspense>
    </>
  )
}

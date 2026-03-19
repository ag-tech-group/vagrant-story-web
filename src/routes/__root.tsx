import { lazy, Suspense } from "react"
import { QueryClient } from "@tanstack/react-query"
import {
  createRootRouteWithContext,
  Link,
  Outlet,
} from "@tanstack/react-router"
import { ChevronDown, ExternalLink, LogOut } from "lucide-react"
import { Toaster } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RootErrorComponent } from "@/components/error-boundary"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserAvatar } from "@/components/user-avatar"
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
    displayName: string | null
    avatarUrl: string | null
    login: (email: string) => void
    logout: () => Promise<void>
    checkAuth: () => Promise<void>
  }
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  errorComponent: RootErrorComponent,
})

const AUTH_URL = "https://auth.criticalbit.gg"
const SITE_URL = "https://vagrant-story.criticalbit.gg"

const ITEM_LINKS = [
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
              <DropdownMenu>
                <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  Items
                  <ChevronDown className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {ITEM_LINKS.map((link) => (
                    <DropdownMenuItem key={link.to} asChild>
                      <Link to={link.to}>{link.label}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Link
                to="/crafting"
                className="text-muted-foreground hover:text-foreground [&.active]:text-foreground transition-colors"
              >
                Crafting
              </Link>
              <Link
                to="/material-grid"
                className="text-muted-foreground hover:text-foreground [&.active]:text-foreground transition-colors"
              >
                Material Grid
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {auth.isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1 transition-colors">
                    <UserAvatar size="sm" />
                    <span className="text-muted-foreground hidden text-sm sm:inline">
                      {auth.displayName ?? auth.email}
                    </span>
                    <ChevronDown className="text-muted-foreground size-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <a href={`${AUTH_URL}/profile`}>
                      <ExternalLink className="size-4" />
                      Profile
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await auth.logout()
                      window.location.reload()
                    }}
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`${AUTH_URL}/login?redirect=${encodeURIComponent(SITE_URL)}`}
                >
                  Sign in
                </a>
              </Button>
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

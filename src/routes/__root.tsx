import { lazy, Suspense } from "react"
import { QueryClient } from "@tanstack/react-query"
import {
  createRootRouteWithContext,
  Link,
  Outlet,
  useMatches,
} from "@tanstack/react-router"
import { ChevronDown, ExternalLink, LogOut } from "lucide-react"
import { Toaster } from "sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarNav } from "@/components/sidebar-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserAvatar } from "@/components/user-avatar"
import { useAuth } from "@/lib/auth"
import { loginUrl, profileUrl } from "@/lib/config"

const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import("@tanstack/react-router-devtools").then((mod) => ({
        default: mod.TanStackRouterDevtools,
      }))
    )

const ReactQueryDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import("@tanstack/react-query-devtools").then((mod) => ({
        default: mod.ReactQueryDevtools,
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
})

function RootComponent() {
  const auth = useAuth()

  const matches = useMatches()
  const currentPath = matches[matches.length - 1]?.fullPath ?? "/"
  const isHome = currentPath === "/"

  return (
    <TooltipProvider delayDuration={300}>
      <nav className="border-border/50 bg-background/80 fixed top-0 z-50 w-full border-b backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            {/* Leave space for sidebar toggle on non-home pages */}
            {!isHome && <div className="w-8" />}
            <Link
              to="/"
              className="hover:text-primary font-sans text-lg tracking-wide transition-colors"
            >
              Vagrant Story
            </Link>
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
                    <a href={profileUrl()}>
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
                <a href={loginUrl("/")}>Sign in</a>
              </Button>
            )}
          </div>
        </div>
      </nav>
      <div className="relative flex min-h-screen pt-14">
        {!isHome && <SidebarNav />}
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-center bg-no-repeat opacity-[0.04] brightness-0 dark:invert"
          style={{
            backgroundImage: "url(/rood-inverse.svg)",
            backgroundSize: "auto 80vh",
          }}
        />
        <div className="relative z-10 flex min-w-0 flex-1 flex-col">
          <Outlet />
          <footer className="border-border/50 mt-auto border-t px-4 py-3">
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
      </div>
      <Toaster position="bottom-right" richColors closeButton />
      <Suspense fallback={null}>
        <TanStackRouterDevtools />
        <ReactQueryDevtools />
      </Suspense>
    </TooltipProvider>
  )
}

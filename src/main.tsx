import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { reactErrorHandler } from "@sentry/react"
import { toast } from "sonner"
// @ts-expect-error -- fontsource CSS-only imports have no type declarations
import "@fontsource-variable/geist"
import { ThemeProvider } from "./components/theme-provider"
import "./index.css"
import { getErrorMessage } from "./lib/api-errors"
import { RootErrorComponent } from "./components/error-boundary"
import { NotFound } from "./components/not-found"
import { AuthProvider, useAuth } from "./lib/auth"
import { AnalyticsProvider, createAnalyticsBackend } from "./lib/analytics"
import { initSentry } from "./lib/sentry"
import { Skeleton } from "./components/ui/skeleton"
import { routeTree } from "./routeTree.gen"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
    },
  },
  mutationCache: new MutationCache({
    onError: async (error, _variables, _context, mutation) => {
      if (mutation.meta?.skipGlobalError) return
      const message = await getErrorMessage(error)
      toast.error(message)
    },
  }),
})

const router = createRouter({
  routeTree,
  context: {
    queryClient,
    auth: undefined!,
  },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultErrorComponent: RootErrorComponent,
  defaultNotFoundComponent: NotFound,
})

initSentry(router)

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      skipGlobalError?: boolean
    }
  }
}

function AppShellSkeleton() {
  return (
    <>
      <nav className="border-border/50 bg-background/80 fixed top-0 z-50 w-full border-b backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <div className="w-8" />
            <span className="font-sans text-lg tracking-wide">
              Vagrant Story
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      </nav>
      <div className="relative flex min-h-screen pt-14">
        <div className="mx-auto w-full max-w-6xl space-y-8 px-6 pt-16">
          <div className="space-y-4 text-center">
            <Skeleton className="mx-auto h-14 w-96" />
            <Skeleton className="mx-auto h-5 w-[32rem] max-w-full" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function App() {
  const auth = useAuth()
  if (auth.isLoading) return <AppShellSkeleton />
  return <RouterProvider router={router} context={{ auth }} />
}

const analyticsBackend = createAnalyticsBackend()

createRoot(document.getElementById("root")!, {
  onCaughtError: reactErrorHandler(),
  onUncaughtError: reactErrorHandler(),
  onRecoverableError: reactErrorHandler(),
}).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="criticalbit_theme">
        <AnalyticsProvider backend={analyticsBackend}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </AnalyticsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
)

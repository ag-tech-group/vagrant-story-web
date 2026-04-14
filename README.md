<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/logo-dark.png">
  <source media="(prefers-color-scheme: light)" srcset=".github/assets/logo-light.png">
  <img alt="AG Technology Group" src=".github/assets/logo-light.png" width="200">
</picture>

# vagrant-story-web

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg)](https://nodejs.org/)

Community game database and crafting tools for [Vagrant Story](https://en.wikipedia.org/wiki/Vagrant_Story) (PS1, 2000). Part of the [criticalbit.gg](https://criticalbit.gg) gaming tools platform.

Browse weapons, armor, gems, grips, materials, consumables, and enemies. Build inventories, plan equipment loadouts, and run a crafting workbench that finds optimal multi-step combine paths against your current inventory and selected workshop. Import save data straight from a PS1 emulator memory card.

Pairs with [vagrant-story-api](../vagrant-story-api).

## Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **TanStack Router** — type-safe file-based routing
- **TanStack Query** — server state and caching
- **shadcn/ui** + **Tailwind CSS v4** (OKLCH theme, dark mode default)
- **Zod v4** — schema validation
- **ky** — HTTP client with automatic token refresh
- **orval** — generates React Query hooks, TS types, Zod schemas, and MSW mocks from the API's OpenAPI spec
- **MSW** — API mocking for tests
- **Vitest** — unit/component tests
- **Husky** — pre-commit hooks (lint, test, build)

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm

### Install and run

```bash
pnpm install
pnpm dev          # http://localhost:5173 (proxies /api to production API)
```

Set `VITE_API_URL=http://localhost:8000` in `.env` to point at a local backend instead of the production API.

### Common commands

```bash
pnpm dev           # Dev server
pnpm build         # Type check + generate routes + bundle
pnpm lint          # ESLint
pnpm test          # Vitest watch mode
pnpm test:run      # Vitest single run
pnpm format        # Prettier
pnpm generate-api  # Regenerate API client from backend OpenAPI spec
```

Pre-commit runs lint-staged → eslint → vitest → full build. All must pass.

## Architecture

Routes live in `src/routes/` (file-based, auto-generated `routeTree.gen.ts`). Route components are thin wrappers that import page components from `src/pages/`. Shared components are in `src/components/`, business logic in `src/lib/`, and the API client + types in `src/lib/game-api.ts`.

See [`CLAUDE.md`](./CLAUDE.md) for routing conventions, the pattern for adding a new item type, and styling rules.

## Authentication

Cookie-based auth designed to work with the companion API:

- **AuthProvider** (`src/lib/auth.tsx`) — React context tracking `isAuthenticated`, `isLoading`, `email`, `userId`
- **Automatic token refresh** (`src/api/api.ts`) — 401 responses trigger a refresh attempt; concurrent requests are coalesced into a single refresh call
- **Session check on load** — `GET /auth/me` validates the session on mount
- **Auth in router context** — `auth` is available in route `beforeLoad` for guards

Flow: backend sets httpOnly `app_access` + `app_refresh` cookies on login → all requests use `credentials: "include"` → on 401 the client POSTs `/auth/refresh` → original request retries transparently → on refresh failure `onUnauthorized` clears auth state.

## API Client Generation

[orval](https://orval.dev/) generates type-safe React Query hooks, TypeScript types, Zod schemas, and MSW handlers from the backend's OpenAPI spec.

```bash
pnpm generate-api
```

Generates into `src/api/generated/`:

- `hooks/` — `useQuery`/`useMutation` wrappers with integrated Zod validation
- `types/` — TypeScript types for all request/response schemas
- `zod/` — standalone Zod schemas (form validation, manual use)
- `mocks/` — MSW mock handlers for tests

Configuration in `orval.config.ts`. Defaults to `http://localhost:8000/openapi.json`. CI sets `OPENAPI_URL` to verify generated types stay in sync.

## Theming

`ThemeProvider` supports `dark`/`light`/`system`. `useTheme()` reads/sets, `ThemeToggle` cycles modes. Persists to `localStorage` (`app_theme`) and applies `.dark` / `.light` to `<html>` for Tailwind dark mode. Theme: ice blue primary, dark mode default. Headings use Geist Pixel Line; body uses Geist Variable.

## Error Handling

- **Global mutation errors** — `MutationCache` in `QueryClient` catches all mutation errors and toasts via sonner
- **Per-mutation opt-out** — set `meta: { skipGlobalError: true }` to handle locally
- **`getErrorMessage()`** (`src/lib/api-errors.ts`) — extracts human-readable messages from FastAPI error shapes (`detail` as string, array, or object)

## Testing

```bash
pnpm test          # Watch mode
pnpm test:run      # Single run
pnpm test:coverage # With coverage
pnpm test:ui       # Visual UI
```

`renderWithFileRoutes()` (`src/test/renderers.tsx`) renders the full router with providers and configurable auth state:

```typescript
import { renderWithFileRoutes } from "@/test/renderers"

// Default: authenticated as test@example.com
await renderWithFileRoutes(<div />, { initialLocation: "/dashboard" })

// Custom auth state
await renderWithFileRoutes(<div />, {
  initialLocation: "/login",
  routerContext: {
    auth: {
      isAuthenticated: false,
      isLoading: false,
      email: null,
      userId: null,
      login: () => {},
      logout: async () => {},
      checkAuth: async () => {},
    },
  },
})
```

MSW handlers are aggregated in `src/api/handlers.ts`. A default `/auth/me` handler (returns 401) suppresses warnings during tests.

## Logging, Analytics & Feature Flags

- **Logger** (`src/lib/logger.ts`) — `debug`/`info`/`warn`/`error`. Console in dev, structured JSON in prod. `VITE_LOG_LEVEL` controls the minimum level.
- **Analytics** (`src/lib/analytics.tsx`) — `AnalyticsProvider` + `useAnalytics()` hook with `track`/`identify`/`page`. Route changes are tracked automatically.
- **Feature flags** (`src/lib/feature-flags.tsx`) — `FeatureFlagProvider` fetches from the API's `GET /flags` endpoint (TanStack Query, refetch on focus). Falls back to `VITE_FEATURE_*` env vars on failure. Use `useFeatureFlag("name")` or `<Feature flag="name">`.

## Environment Variables

| Variable         | Description                                                     | Default                              |
| ---------------- | --------------------------------------------------------------- | ------------------------------------ |
| `VITE_API_URL`   | Backend API URL                                                 | `/api`                               |
| `VITE_LOG_LEVEL` | Minimum log level (debug/info/warn/error)                       | `debug` (dev), `warn` (prod)         |
| `VITE_FEATURE_*` | Feature flag overrides (e.g. `VITE_FEATURE_NEW_DASHBOARD=true`) | (none)                               |
| `OPENAPI_URL`    | OpenAPI spec URL (for code generation)                          | `http://localhost:8000/openapi.json` |

`OPENAPI_URL` is only used during development for `pnpm generate-api`. The generated files are committed.

## License

Apache 2.0 — see [LICENSE](LICENSE).

## Acknowledgments

- [Vite](https://vitejs.dev/) · [TanStack Router](https://tanstack.com/router) · [TanStack Query](https://tanstack.com/query)
- [shadcn/ui](https://ui.shadcn.com/) · [Tailwind CSS](https://tailwindcss.com/)
- [Zod](https://zod.dev/) · [ky](https://github.com/sindresorhus/ky) · [orval](https://orval.dev/) · [MSW](https://mswjs.io/)
- Game icons by [game-icons.net](https://game-icons.net) contributors, licensed under [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/)

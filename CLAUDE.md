# Vagrant Story Web

Community game database and crafting tools for Vagrant Story (PS1). Built with React 19, TypeScript, TanStack Router/Query, Tailwind CSS v4, and shadcn/ui components.

## Commands

```bash
pnpm install          # Install deps
pnpm dev              # Dev server on :5173 (proxies /api to production API)
pnpm build            # Type check + bundle (runs generate-routes first)
pnpm lint             # ESLint
pnpm test:run         # Vitest single run
pnpm format           # Prettier
```

Pre-commit hook runs: lint-staged (format) → eslint → vitest → full build. All must pass.

## Architecture

### Routing (TanStack Router, file-based)

Routes live in `src/routes/`. The route tree is auto-generated (`src/routeTree.gen.ts`).

**Pattern for item pages:**

- `src/routes/blades/route.tsx` — layout (wraps Outlet)
- `src/routes/blades/index.tsx` — list page header
- `src/routes/blades/$id.tsx` — detail hero page

**Route components import page components from `src/pages/`** — routes are thin wrappers.

**Inventory uses subroutes** for tab persistence: `$inventoryId/equipment.tsx` and `$inventoryId/workbench.tsx`. Tab selection is URL-driven, not React state.

### Navigation

Global sidebar nav in `src/components/sidebar-nav.tsx`. Appears on all pages except homepage. When adding a new page, add it to `NAV_SECTIONS` in that file.

### API Client (`src/lib/game-api.ts`)

All game data types and fetch functions. Dev proxy forwards `/api` → production API.

### Key Components (`src/components/`)

- **`data-table.tsx`** — Reusable table with sorting, filtering, pagination, clickable rows
- **`sidebar-nav.tsx`** — Global sidebar navigation with sections and toggle
- **`item-drop-locations.tsx`** — Reusable "Where to Find" section for item detail pages
- **`stat-display.tsx`** — Stat badges with color coding and comparisons
- **`ui/`** — shadcn/ui primitives (Button, Card, Badge, Select, Tooltip, etc.)

### Styling

- Tailwind CSS v4 with OKLCH color variables in `src/index.css`
- `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge)
- Theme: ice blue primary, dark mode default
- Font: Geist Variable (sans), Geist Pixel Line (headings, in `/public/fonts/`)

## Conventions

- **File naming**: `kebab-case.tsx` for files, `PascalCase` for components
- **No AI attribution** in commits or PRs
- **Always create PRs** — never push directly to main
- Stat values: green for positive, red for negative, muted for zero
- `fmt()` converts `field_name` → `field name` for display
- Icon containers: `bg-primary text-primary-foreground rounded-lg` with SVGs using `fill="currentColor"`

## Adding a New Item Type

1. **API types**: Add interface + fetch function in `src/lib/game-api.ts`
2. **Page**: Create `src/pages/[type]/[type]-page.tsx` with DataTable
3. **Routes**: Create `src/routes/[type]/route.tsx`, `index.tsx`, `$id.tsx`
4. **Sidebar**: Add to `NAV_SECTIONS` in `src/components/sidebar-nav.tsx`
5. **Homepage**: Add to `DB_CARDS` in `src/pages/home/home-page.tsx`
6. **Icon**: Add SVG to `/public/images/icons/` and map in `item-icon.tsx`
7. **Drop locations** (optional): Add `<ItemDropLocations itemName={name} />` to detail page

import { createFileRoute } from "@tanstack/react-router"
import { RootErrorComponent } from "@/components/error-boundary"
import { CraftingMaterialsPage } from "@/pages/crafting/materials-page"

export type MaterialsSearch = {
  cat?: string
  t1?: string
  t2?: string
}

export const Route = createFileRoute("/material-grid")({
  component: CraftingMaterialsPage,
  errorComponent: RootErrorComponent,
  validateSearch: (search: Record<string, unknown>): MaterialsSearch => ({
    cat: typeof search.cat === "string" ? search.cat : undefined,
    t1: typeof search.t1 === "string" ? search.t1 : undefined,
    t2: typeof search.t2 === "string" ? search.t2 : undefined,
  }),
})

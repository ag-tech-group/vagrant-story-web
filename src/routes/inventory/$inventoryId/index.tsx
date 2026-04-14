import { createFileRoute, Navigate, getRouteApi } from "@tanstack/react-router"

export const Route = createFileRoute("/inventory/$inventoryId/")({
  component: RedirectToTab,
})

const parentRoute = getRouteApi("/inventory/$inventoryId")

function RedirectToTab() {
  const { inventoryId } = Route.useParams()
  const { tab } = parentRoute.useSearch()

  const target =
    tab === "workbench"
      ? "/inventory/$inventoryId/workbench"
      : tab === "loadout"
        ? "/inventory/$inventoryId/loadout"
        : "/inventory/$inventoryId/equipment"

  return <Navigate to={target} params={{ inventoryId }} replace />
}

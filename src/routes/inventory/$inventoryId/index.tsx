import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/inventory/$inventoryId/")({
  beforeLoad: ({ params, search }) => {
    const { tab } = search as { tab?: "equipment" | "workbench" | "loadout" }
    const to =
      tab === "workbench"
        ? "/inventory/$inventoryId/workbench"
        : tab === "loadout"
          ? "/inventory/$inventoryId/loadout"
          : "/inventory/$inventoryId/equipment"
    throw redirect({
      to,
      params,
      search: (prev) => {
        const next = { ...prev }
        delete (next as Record<string, unknown>).tab
        return next
      },
      replace: true,
    })
  },
})

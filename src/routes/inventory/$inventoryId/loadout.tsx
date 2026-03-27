import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/inventory/$inventoryId/loadout")({
  component: () => null,
})

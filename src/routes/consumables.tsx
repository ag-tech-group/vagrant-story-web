import { createFileRoute } from "@tanstack/react-router"
import { ConsumablesPage } from "@/pages/consumables/consumables-page"

export const Route = createFileRoute("/consumables")({
  component: ConsumablesPage,
})

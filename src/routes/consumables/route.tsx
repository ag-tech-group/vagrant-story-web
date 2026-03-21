import { createFileRoute, Outlet } from "@tanstack/react-router"
import { DatabaseSelect } from "@/components/database-select"
import { ConsumablesPage } from "@/pages/consumables/consumables-page"

export const Route = createFileRoute("/consumables")({
  component: () => (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <DatabaseSelect />
      <Outlet />
      <ConsumablesPage />
    </div>
  ),
})

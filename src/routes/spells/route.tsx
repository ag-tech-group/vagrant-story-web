import { createFileRoute, Outlet } from "@tanstack/react-router"
import { DatabaseSelect } from "@/components/database-select"
import { SpellsPage } from "@/pages/spells/spells-page"

export const Route = createFileRoute("/spells")({
  component: () => (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <DatabaseSelect />
      <Outlet />
      <SpellsPage />
    </div>
  ),
})

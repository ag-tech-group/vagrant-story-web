import { createFileRoute, Outlet } from "@tanstack/react-router"
import { SpellsPage } from "@/pages/spells/spells-page"

export const Route = createFileRoute("/spells")({
  component: () => (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <Outlet />
      <SpellsPage />
    </div>
  ),
})

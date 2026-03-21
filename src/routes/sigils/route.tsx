import { createFileRoute, Outlet } from "@tanstack/react-router"
import { DatabaseSelect } from "@/components/database-select"
import { SigilsPage } from "@/pages/sigils/sigils-page"

export const Route = createFileRoute("/sigils")({
  component: () => (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <DatabaseSelect />
      <Outlet />
      <SigilsPage />
    </div>
  ),
})

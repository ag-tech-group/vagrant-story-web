import { createFileRoute, Outlet } from "@tanstack/react-router"
import { DatabaseSelect } from "@/components/database-select"
import { AreasPage } from "@/pages/areas/areas-page"

export const Route = createFileRoute("/areas")({
  component: () => (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <DatabaseSelect />
      <Outlet />
      <AreasPage />
    </div>
  ),
})

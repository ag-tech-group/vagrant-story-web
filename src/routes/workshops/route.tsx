import { createFileRoute, Outlet } from "@tanstack/react-router"
import { DatabaseSelect } from "@/components/database-select"
import { WorkshopsPage } from "@/pages/workshops/workshops-page"

export const Route = createFileRoute("/workshops")({
  component: () => (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <DatabaseSelect />
      <Outlet />
      <WorkshopsPage />
    </div>
  ),
})

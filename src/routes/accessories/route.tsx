import { createFileRoute, Outlet } from "@tanstack/react-router"
import { DatabaseSelect } from "@/components/database-select"
import { AccessoriesPage } from "@/pages/accessories/accessories-page"

export const Route = createFileRoute("/accessories")({
  component: () => (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <DatabaseSelect />
      <Outlet />
      <AccessoriesPage />
    </div>
  ),
})

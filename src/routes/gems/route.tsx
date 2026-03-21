import { createFileRoute, Outlet } from "@tanstack/react-router"
import { DatabaseSelect } from "@/components/database-select"
import { GemsPage } from "@/pages/gems/gems-page"

export const Route = createFileRoute("/gems")({
  component: () => (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <DatabaseSelect />
      <Outlet />
      <GemsPage />
    </div>
  ),
})

import { createFileRoute, Outlet } from "@tanstack/react-router"
import { GemsPage } from "@/pages/gems/gems-page"

export const Route = createFileRoute("/gems")({
  component: () => (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <Outlet />
      <GemsPage />
    </div>
  ),
})

import { createFileRoute, Outlet } from "@tanstack/react-router"
import { SigilsPage } from "@/pages/sigils/sigils-page"

export const Route = createFileRoute("/sigils")({
  component: () => (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <Outlet />
      <SigilsPage />
    </div>
  ),
})

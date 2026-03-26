import { createFileRoute, Outlet } from "@tanstack/react-router"
import { GripsPage } from "@/pages/grips/grips-page"

export const Route = createFileRoute("/grips")({
  component: () => (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <Outlet />
      <GripsPage />
    </div>
  ),
})

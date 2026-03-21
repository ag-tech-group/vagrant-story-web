import { createFileRoute, Outlet } from "@tanstack/react-router"
import { ForgePage } from "@/pages/forge/forge-page"

export const Route = createFileRoute("/forge")({
  component: ForgeLayout,
})

function ForgeLayout() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <Outlet />
      <ForgePage />
    </div>
  )
}

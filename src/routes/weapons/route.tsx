import { createFileRoute, Outlet } from "@tanstack/react-router"
import { WeaponsPage } from "@/pages/weapons/weapons-page"

export const Route = createFileRoute("/weapons")({
  component: WeaponsLayout,
})

function WeaponsLayout() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <Outlet />
      <WeaponsPage />
    </div>
  )
}

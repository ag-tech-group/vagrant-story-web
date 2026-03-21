import { createFileRoute, Outlet } from "@tanstack/react-router"
import { DatabaseSelect } from "@/components/database-select"
import { BladesPage } from "@/pages/blades/blades-page"

export const Route = createFileRoute("/blades")({
  component: BladesLayout,
})

function BladesLayout() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <DatabaseSelect />
      <Outlet />
      <BladesPage />
    </div>
  )
}

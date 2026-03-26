import { createFileRoute, Outlet } from "@tanstack/react-router"
import { BestiaryPage } from "@/pages/bestiary/bestiary-page"

export const Route = createFileRoute("/bestiary")({
  component: BestiaryLayout,
})

function BestiaryLayout() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <Outlet />
      <BestiaryPage />
    </div>
  )
}

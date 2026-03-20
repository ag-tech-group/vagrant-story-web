import { createFileRoute, Outlet } from "@tanstack/react-router"
import { GrimoiresPage } from "@/pages/grimoires/grimoires-page"

export const Route = createFileRoute("/grimoires")({
  component: () => (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <Outlet />
      <GrimoiresPage />
    </div>
  ),
})

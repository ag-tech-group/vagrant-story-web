import { createFileRoute, Outlet } from "@tanstack/react-router"
import { DatabaseSelect } from "@/components/database-select"
import { ChestsPage } from "@/pages/chests/chests-page"

export const Route = createFileRoute("/chests")({
  component: () => (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <DatabaseSelect />
      <Outlet />
      <ChestsPage />
    </div>
  ),
})

import { createFileRoute, Outlet } from "@tanstack/react-router"
import { DatabaseSelect } from "@/components/database-select"
import { RankingsPage } from "@/pages/rankings/rankings-page"

export const Route = createFileRoute("/rankings")({
  component: () => (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <DatabaseSelect />
      <Outlet />
      <RankingsPage />
    </div>
  ),
})

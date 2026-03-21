import { createFileRoute, Outlet } from "@tanstack/react-router"
import { DatabaseSelect } from "@/components/database-select"
import { BreakArtsPage } from "@/pages/break-arts/break-arts-page"

export const Route = createFileRoute("/break-arts")({
  component: () => (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <DatabaseSelect />
      <Outlet />
      <BreakArtsPage />
    </div>
  ),
})

import { createFileRoute, Outlet } from "@tanstack/react-router"
import { BreakArtsPage } from "@/pages/break-arts/break-arts-page"

export const Route = createFileRoute("/break-arts")({
  component: () => (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <Outlet />
      <BreakArtsPage />
    </div>
  ),
})

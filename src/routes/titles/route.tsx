import { createFileRoute, Outlet } from "@tanstack/react-router"
import { DatabaseSelect } from "@/components/database-select"
import { TitlesPage } from "@/pages/titles/titles-page"

export const Route = createFileRoute("/titles")({
  component: () => (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <DatabaseSelect />
      <Outlet />
      <TitlesPage />
    </div>
  ),
})

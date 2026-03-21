import { createFileRoute, Outlet } from "@tanstack/react-router"
import { DatabaseSelect } from "@/components/database-select"
import { ArmorPage } from "@/pages/armor/armor-page"

export const Route = createFileRoute("/armor")({
  component: () => (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <DatabaseSelect />
      <Outlet />
      <ArmorPage />
    </div>
  ),
})

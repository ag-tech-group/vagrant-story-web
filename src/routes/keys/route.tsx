import { createFileRoute, Outlet } from "@tanstack/react-router"
import { DatabaseSelect } from "@/components/database-select"
import { KeysPage } from "@/pages/keys/keys-page"

export const Route = createFileRoute("/keys")({
  component: () => (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <DatabaseSelect />
      <Outlet />
      <KeysPage />
    </div>
  ),
})

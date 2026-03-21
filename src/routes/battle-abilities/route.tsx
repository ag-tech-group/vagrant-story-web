import { createFileRoute, Outlet } from "@tanstack/react-router"
import { DatabaseSelect } from "@/components/database-select"
import { BattleAbilitiesPage } from "@/pages/battle-abilities/battle-abilities-page"

export const Route = createFileRoute("/battle-abilities")({
  component: () => (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <DatabaseSelect />
      <Outlet />
      <BattleAbilitiesPage />
    </div>
  ),
})

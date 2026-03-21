import { createFileRoute, Outlet } from "@tanstack/react-router"
import { DatabaseSelect } from "@/components/database-select"
import { CharactersPage } from "@/pages/characters/characters-page"

export const Route = createFileRoute("/characters")({
  component: () => (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <DatabaseSelect />
      <Outlet />
      <CharactersPage />
    </div>
  ),
})

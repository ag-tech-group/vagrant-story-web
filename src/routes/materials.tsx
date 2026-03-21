import { createFileRoute } from "@tanstack/react-router"
import { DatabaseSelect } from "@/components/database-select"
import { MaterialsPage } from "@/pages/materials/materials-page"

export const Route = createFileRoute("/materials")({
  component: () => (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <DatabaseSelect />
      <MaterialsPage />
    </div>
  ),
})

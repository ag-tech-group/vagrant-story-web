import { createFileRoute } from "@tanstack/react-router"
import { MaterialsPage } from "@/pages/materials/materials-page"

export const Route = createFileRoute("/materials")({
  component: () => (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <MaterialsPage />
    </div>
  ),
})

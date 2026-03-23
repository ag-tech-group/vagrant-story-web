import { createFileRoute } from "@tanstack/react-router"
import { ImportPage } from "@/pages/inventory/import-page"

export const Route = createFileRoute("/inventory/import")({
  component: ImportPage,
})

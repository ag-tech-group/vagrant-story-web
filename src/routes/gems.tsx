import { createFileRoute } from "@tanstack/react-router"
import { GemsPage } from "@/pages/gems/gems-page"

export const Route = createFileRoute("/gems")({
  component: GemsPage,
})

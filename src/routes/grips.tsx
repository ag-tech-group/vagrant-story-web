import { createFileRoute } from "@tanstack/react-router"
import { GripsPage } from "@/pages/grips/grips-page"

export const Route = createFileRoute("/grips")({
  component: GripsPage,
})

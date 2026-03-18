import { createFileRoute } from "@tanstack/react-router"
import { WeaponsPage } from "@/pages/weapons/weapons-page"

export const Route = createFileRoute("/weapons")({
  component: WeaponsPage,
})

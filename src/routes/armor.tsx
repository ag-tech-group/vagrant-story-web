import { createFileRoute } from "@tanstack/react-router"
import { ArmorPage } from "@/pages/armor/armor-page"

export const Route = createFileRoute("/armor")({
  component: ArmorPage,
})

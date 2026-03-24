import { createFileRoute, Navigate } from "@tanstack/react-router"

export const Route = createFileRoute("/inventory/$inventoryId/")({
  component: RedirectToEquipment,
})

function RedirectToEquipment() {
  const { inventoryId } = Route.useParams()
  return (
    <Navigate
      to="/inventory/$inventoryId/equipment"
      params={{ inventoryId }}
      replace
    />
  )
}

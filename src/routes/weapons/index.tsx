import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/weapons/")({
  component: WeaponsIndex,
})

function WeaponsIndex() {
  return (
    <div>
      <h1 className="text-3xl tracking-wide sm:text-4xl">Weapons</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        All blades in Vagrant Story — click a weapon for details
      </p>
    </div>
  )
}

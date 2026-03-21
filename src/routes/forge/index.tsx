import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/forge/")({
  component: ForgeIndex,
})

function ForgeIndex() {
  return (
    <div>
      <h1 className="text-3xl tracking-wide sm:text-4xl">Forge</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Build equipment by combining a blade, armor, or shield with a material
        and grip
      </p>
    </div>
  )
}

import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/forge/")({
  component: ForgeIndex,
})

function ForgeIndex() {
  return (
    <div className="text-center">
      <h1 className="text-4xl tracking-wide sm:text-5xl lg:text-6xl">Forge</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Build equipment by combining a blade, armor, or shield with a material
        and grip
      </p>
    </div>
  )
}

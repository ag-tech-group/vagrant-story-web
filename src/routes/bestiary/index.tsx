import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/bestiary/")({
  component: BestiaryIndex,
})

function BestiaryIndex() {
  return (
    <div>
      <h1 className="text-3xl tracking-wide sm:text-4xl">Bestiary</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        All enemies in Vagrant Story — click an enemy for details
      </p>
    </div>
  )
}

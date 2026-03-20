import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/blades/")({
  component: BladesIndex,
})

function BladesIndex() {
  return (
    <div>
      <h1 className="text-3xl tracking-wide sm:text-4xl">Blades</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        All blades in Vagrant Story — click a blade for details
      </p>
    </div>
  )
}

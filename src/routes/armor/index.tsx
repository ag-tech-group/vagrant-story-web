import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/armor/")({
  component: () => (
    <div>
      <h1 className="text-3xl tracking-wide sm:text-4xl">Armor</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        All armor pieces in Vagrant Story — click for details
      </p>
    </div>
  ),
})

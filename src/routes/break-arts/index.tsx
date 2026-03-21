import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/break-arts/")({
  component: () => (
    <div>
      <h1 className="text-3xl tracking-wide sm:text-4xl">Break Arts</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Weapon-specific special attacks that cost HP — click for details
      </p>
    </div>
  ),
})

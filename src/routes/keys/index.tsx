import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/keys/")({
  component: () => (
    <div>
      <h1 className="text-3xl tracking-wide sm:text-4xl">Keys</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Keys open locked doors throughout Lea Monde — click for details
      </p>
    </div>
  ),
})

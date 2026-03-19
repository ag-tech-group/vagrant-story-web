import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/grips/")({
  component: () => (
    <div>
      <h1 className="text-3xl tracking-wide sm:text-4xl">Grips</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Grips modify weapon stats and can be swapped — click for details
      </p>
    </div>
  ),
})

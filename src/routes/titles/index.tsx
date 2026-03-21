import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/titles/")({
  component: () => (
    <div>
      <h1 className="text-3xl tracking-wide sm:text-4xl">Titles</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Achievement titles earned through gameplay milestones — click for
        details
      </p>
    </div>
  ),
})

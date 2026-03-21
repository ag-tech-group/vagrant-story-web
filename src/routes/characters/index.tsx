import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/characters/")({
  component: () => (
    <div>
      <h1 className="text-3xl tracking-wide sm:text-4xl">Characters</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Main, supporting, and minor characters of Vagrant Story — click for
        details
      </p>
    </div>
  ),
})

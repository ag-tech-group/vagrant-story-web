import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getRouteApi, Link } from "@tanstack/react-router"
import {
  ArrowDownAZ,
  ArrowDownWideNarrow,
  FileUp,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { useAnalytics } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ItemIcon } from "@/components/item-icon"
import { useAuth } from "@/lib/auth"
import { loginUrl } from "@/lib/config"
import { inventoryApi, type InventoryListItem } from "@/lib/inventory-api"

type SortKey = "name" | "created" | "updated"

export function InventoryListPage() {
  const auth = useAuth()

  if (auth.isLoading) {
    return <InventoryListSkeleton />
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground text-sm">
          Sign in to manage your inventory
        </p>
        <Button asChild>
          <a href={loginUrl("/inventory")}>Sign In</a>
        </Button>
      </div>
    )
  }

  return <InventoryList />
}

function InventoryListSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  )
}

const inventoryListRouteApi = getRouteApi("/inventory/")

function InventoryList() {
  const queryClient = useQueryClient()
  const analytics = useAnalytics()
  const { tab } = inventoryListRouteApi.useSearch()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<InventoryListItem | null>(
    null
  )
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("updated")

  const {
    data: inventories = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["inventories"],
    queryFn: inventoryApi.list,
  })

  const createMutation = useMutation({
    mutationFn: (name: string) => inventoryApi.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventories"] })
      setShowCreate(false)
      setNewName("")
      analytics.track("inventory_created")
      toast.success("Inventory created")
    },
    onError: (err) => toast.error(String(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => inventoryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventories"] })
      setDeleteTarget(null)
      toast.success("Inventory deleted")
    },
    onError: (err) => toast.error(String(err)),
  })

  const filtered = useMemo(() => {
    let list = inventories
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((inv) => inv.name.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name)
      if (sortKey === "created")
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [inventories, search, sortKey])

  if (isLoading) {
    return <InventoryListSkeleton />
  }

  if (error) {
    return (
      <div className="text-destructive py-10 text-center text-sm">
        Something went wrong loading your inventories. Please try again.
      </div>
    )
  }

  const nextSort = (): SortKey =>
    sortKey === "updated" ? "name" : sortKey === "name" ? "created" : "updated"

  const sortLabel =
    sortKey === "name" ? "Name" : sortKey === "created" ? "Created" : "Updated"

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {inventories.length}{" "}
          {inventories.length === 1 ? "inventory" : "inventories"}
        </p>
        <div className="flex items-center gap-3">
          <Button size="sm" asChild>
            <Link to="/inventory/import">
              <FileUp className="size-3.5" />
              Import Save File
            </Link>
          </Button>
          <span className="text-muted-foreground text-xs">or</span>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="size-3.5" />
            Create Blank
          </Button>
        </div>
      </div>

      {inventories.length > 1 && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter inventories..."
              className="pr-8 pl-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setSortKey(nextSort())}
          >
            {sortKey === "name" ? (
              <ArrowDownAZ className="size-3.5" />
            ) : (
              <ArrowDownWideNarrow className="size-3.5" />
            )}
            {sortLabel}
          </Button>
        </div>
      )}

      {inventories.length === 0 && (
        <div className="text-muted-foreground py-10 text-center text-sm">
          No inventories yet. Create one to start building your loadout.
        </div>
      )}

      {inventories.length > 0 && filtered.length === 0 && (
        <div className="text-muted-foreground py-10 text-center text-sm">
          No inventories match "{search}"
        </div>
      )}

      <div className="flex flex-col gap-4">
        {filtered.map((inv) => (
          <InventoryCard
            key={inv.id}
            inventory={inv}
            tab={tab}
            onDelete={() => setDeleteTarget(inv)}
          />
        ))}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Inventory</DialogTitle>
            <DialogDescription>
              Give your inventory a name (e.g. "Main Loadout", "Undead
              Farming").
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (newName.trim()) createMutation.mutate(newName.trim())
            }}
          >
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Inventory name"
              maxLength={100}
              autoFocus
            />
            <DialogFooter className="mt-4">
              <Button
                type="submit"
                disabled={!newName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Inventory</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This will
              remove all items in this inventory.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.id)
              }
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InventoryCard({
  inventory,
  tab,
  onDelete,
}: {
  inventory: InventoryListItem
  tab?: "equipment" | "workbench" | "loadout"
  onDelete: () => void
}) {
  return (
    <Link
      to="/inventory/$inventoryId"
      params={{ inventoryId: String(inventory.id) }}
      search={tab ? { tab } : {}}
    >
      <Card className="hover:border-foreground/20 cursor-pointer transition-colors">
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ItemIcon type="Inventory" size="sm" />
            <div>
              <p className="font-medium">{inventory.name}</p>
              <p className="text-muted-foreground text-xs">
                Created {new Date(inventory.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </CardContent>
      </Card>
    </Link>
  )
}

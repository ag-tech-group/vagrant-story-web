import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
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
import { ItemIcon } from "@/components/item-icon"
import { useAuth } from "@/lib/auth"
import { inventoryApi, type InventoryListItem } from "@/lib/inventory-api"

const AUTH_URL = "https://auth.criticalbit.gg"
const SITE_URL = "https://vagrant-story.criticalbit.gg"

export function InventoryListPage() {
  const auth = useAuth()

  if (auth.isLoading) {
    return (
      <div className="text-muted-foreground py-20 text-center text-sm">
        Loading...
      </div>
    )
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground text-sm">
          Sign in to manage your inventory
        </p>
        <Button asChild>
          <a
            href={`${AUTH_URL}/login?redirect=${encodeURIComponent(SITE_URL + "/inventory")}`}
          >
            Sign In
          </a>
        </Button>
      </div>
    )
  }

  return <InventoryList />
}

function InventoryList() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<InventoryListItem | null>(
    null
  )

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

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-10 text-center text-sm">
        Loading inventories...
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-10 text-center text-sm text-red-400">
        Failed to load inventories. Make sure you are signed in.
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {inventories.length} inventory{inventories.length !== 1 ? "ies" : ""}
        </p>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="size-3.5" />
          Create Inventory
        </Button>
      </div>

      {inventories.length === 0 && (
        <div className="text-muted-foreground py-10 text-center text-sm">
          No inventories yet. Create one to start building your loadout.
        </div>
      )}

      <div className="space-y-4">
        {inventories.map((inv) => (
          <InventoryCard
            key={inv.id}
            inventory={inv}
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
  onDelete,
}: {
  inventory: InventoryListItem
  onDelete: () => void
}) {
  return (
    <Link
      to="/inventory/$inventoryId"
      params={{ inventoryId: String(inventory.id) }}
    >
      <Card className="hover:border-foreground/20 cursor-pointer transition-colors">
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ItemIcon type="Chest" size="sm" />
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
            className="text-muted-foreground hover:text-red-400"
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

import { useCallback, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  FileUp,
  FolderOpen,
  Loader2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ReadOnlyEquipmentGrid,
  ReadOnlyBagItemRow,
} from "@/components/inventory-preview"
import { DISPLAY_TYPE_TO_CATEGORY } from "@/lib/inventory-constants"
import { useAuth } from "@/lib/auth"
import { loginUrl } from "@/lib/config"
import {
  gameApi,
  fmt,
  type Armor,
  type Blade,
  type Consumable,
  type Gem,
  type Grip,
} from "@/lib/game-api"
import { inventoryApi, type InventoryItem } from "@/lib/inventory-api"
import {
  parseMemoryCard,
  isPsvFile,
  PSV_ERROR_MESSAGE,
  type ParsedSaveSlot,
} from "@/lib/save-parser"
import { mapSaveSlotToItems } from "@/lib/save-import-mapper"
import { getRoomName } from "@/lib/vs-rooms"
import { cn } from "@/lib/utils"

// ── Types ────────────────────────────────────────────────────────────

type Phase = "upload" | "preview" | "importing"

interface SlotState {
  slot: ParsedSaveSlot
  name: string
  selected: boolean
  expanded: boolean
}

// ── Accepted file extensions ─────────────────────────────────────────

const ACCEPTED_EXTENSIONS = [".srm", ".mcd", ".mcr"]
const MAX_FILE_SIZE = 131072 // 128 KB

// ── Auto-generate inventory name ─────────────────────────────────────

function generateSlotName(slot: ParsedSaveSlot): string {
  const roomName = getRoomName(slot.zoneId, slot.roomId)
  const time = slot.gameTime.replace(/^(\d+):(\d+):(\d+)$/, "$1h $2m")
  const parts: string[] = []
  if (roomName) parts.push(roomName)
  parts.push(time, `${slot.mapCompletion}%`)
  if (slot.clearCount > 0) parts.push(`NG+${slot.clearCount}`)
  return parts.join(" — ")
}

// ── Main export ──────────────────────────────────────────────────────

export function ImportPage() {
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
          Sign in to import your save file
        </p>
        <Button asChild>
          <a href={loginUrl("/inventory/import")}>Sign In</a>
        </Button>
      </div>
    )
  }

  return <ImportFlow />
}

function ImportFlow() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>("upload")
  const [slots, setSlots] = useState<SlotState[]>([])
  const [error, setError] = useState<string | null>(null)
  const [importProgress, setImportProgress] = useState(0)
  const [importTotal, setImportTotal] = useState(0)

  // Game data for mapping + preview
  const { data: blades = [] } = useQuery({
    queryKey: ["blades"],
    queryFn: gameApi.blades,
  })
  const { data: armor = [] } = useQuery({
    queryKey: ["armor"],
    queryFn: gameApi.armor,
  })
  const { data: grips = [] } = useQuery({
    queryKey: ["grips"],
    queryFn: gameApi.grips,
  })
  const { data: gems = [] } = useQuery({
    queryKey: ["gems"],
    queryFn: gameApi.gems,
  })
  const { data: consumables = [] } = useQuery({
    queryKey: ["consumables"],
    queryFn: gameApi.consumables,
  })

  // ── ID lookup maps for display ──────────────────────────────────────
  const bladeIdMap = useMemo(() => {
    const m = new Map<number, Blade>()
    for (const b of blades) m.set(b.id, b)
    return m
  }, [blades])

  const armorIdMap = useMemo(() => {
    const m = new Map<number, Armor>()
    for (const a of armor) m.set(a.id, a)
    return m
  }, [armor])

  const gripIdMap = useMemo(() => {
    const m = new Map<number, Grip>()
    for (const g of grips) m.set(g.id, g)
    return m
  }, [grips])

  const gemIdMap = useMemo(() => {
    const m = new Map<number, Gem>()
    for (const g of gems) m.set(g.id, g)
    return m
  }, [gems])

  const consumableIdMap = useMemo(() => {
    const m = new Map<number, Consumable>()
    for (const c of consumables) m.set(c.id, c)
    return m
  }, [consumables])

  // ── File handling ───────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    setError(null)

    if (isPsvFile(file.name)) {
      setError(PSV_ERROR_MESSAGE)
      return
    }

    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."))
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError(
        `Unsupported file type "${ext}". Please use .srm, .mcd, or .mcr files.`
      )
      return
    }

    if (file.size !== MAX_FILE_SIZE) {
      setError(
        `Invalid file size: ${file.size} bytes. PS1 memory card images must be exactly 128 KB (131,072 bytes).`
      )
      return
    }

    try {
      const buffer = await file.arrayBuffer()
      const parsed = parseMemoryCard(buffer)
      const slotStates: SlotState[] = parsed.map((slot) => ({
        slot,
        name: generateSlotName(slot),
        selected: slot.checksumValid,
        expanded: false,
      }))
      setSlots(slotStates)
      setPhase("preview")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file")
    }
  }, [])

  // ── Slot state updates ──────────────────────────────────────────────

  const toggleSlotSelected = useCallback((index: number) => {
    setSlots((prev) =>
      prev.map((s, i) =>
        i === index && s.slot.checksumValid
          ? { ...s, selected: !s.selected }
          : s
      )
    )
  }, [])

  const toggleSlotExpanded = useCallback((index: number) => {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, expanded: !s.expanded } : s))
    )
  }, [])

  const updateSlotName = useCallback((index: number, name: string) => {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, name } : s)))
  }, [])

  // ── Display helpers ─────────────────────────────────────────────────

  const getDisplayName = useCallback(
    (item: InventoryItem): string => {
      if (item.item_type === "blade") {
        const b = bladeIdMap.get(item.item_id)
        return b ? fmt(b.field_name) : `Blade #${item.item_id}`
      }
      if (item.item_type === "grip") {
        const g = gripIdMap.get(item.item_id)
        return g ? fmt(g.field_name) : `Grip #${item.item_id}`
      }
      if (item.item_type === "gem") {
        const g = gemIdMap.get(item.item_id)
        return g ? fmt(g.field_name) : `Gem #${item.item_id}`
      }
      if (item.item_type === "consumable") {
        const c = consumableIdMap.get(item.item_id)
        return c ? fmt(c.field_name) : `Consumable #${item.item_id}`
      }
      const a = armorIdMap.get(item.item_id)
      return a ? fmt(a.field_name) : `Item #${item.item_id}`
    },
    [bladeIdMap, armorIdMap, gripIdMap, gemIdMap, consumableIdMap]
  )

  const getDisplayType = useCallback(
    (item: InventoryItem): string => {
      if (item.item_type === "blade") {
        const b = bladeIdMap.get(item.item_id)
        return b?.blade_type ?? "Blade"
      }
      if (item.item_type === "grip") {
        const g = gripIdMap.get(item.item_id)
        return g?.grip_type ?? "Grip"
      }
      if (item.item_type === "gem") return "Gem"
      if (item.item_type === "consumable") return "Consumable"
      const a = armorIdMap.get(item.item_id)
      return a?.armor_type ?? "Armor"
    },
    [bladeIdMap, armorIdMap, gripIdMap]
  )

  // ── Import handler ──────────────────────────────────────────────────

  const selectedSlots = slots.filter((s) => s.selected)

  const handleImport = useCallback(async () => {
    const toImport = slots.filter((s) => s.selected)
    if (toImport.length === 0) return

    setPhase("importing")
    setImportTotal(toImport.length)
    setImportProgress(0)

    const createdIds: number[] = []

    try {
      for (let i = 0; i < toImport.length; i++) {
        const { slot, name } = toImport[i]

        // Create inventory
        const inventory = await inventoryApi.create(name)

        // Map save items to API items
        const { items, warnings } = mapSaveSlotToItems(slot, {
          blades,
          armor,
          grips,
          gems,
          consumables,
        })

        if (warnings.length > 0) {
          console.warn(`Import warnings for "${name}":`, warnings)
        }

        // Batch import
        if (items.length > 0) {
          await inventoryApi.importItems(inventory.id, items, true)
        }

        createdIds.push(inventory.id)
        setImportProgress(i + 1)
      }

      toast.success(
        `Imported ${createdIds.length} ${createdIds.length === 1 ? "inventory" : "inventories"}`
      )

      // Redirect: 1 slot → detail, multiple → list
      if (createdIds.length === 1) {
        navigate({
          to: "/inventory/$inventoryId",
          params: { inventoryId: String(createdIds[0]) },
        })
      } else {
        navigate({ to: "/inventory" })
      }
    } catch (err) {
      toast.error(
        `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`
      )
      setPhase("preview")
    }
  }, [slots, blades, armor, grips, gems, consumables, navigate])

  // ── Build preview items for expanded slots ──────────────────────────

  const buildPreviewItems = useCallback(
    (slot: ParsedSaveSlot): InventoryItem[] => {
      const { items } = mapSaveSlotToItems(slot, {
        blades,
        armor,
        grips,
        gems,
        consumables,
      })
      // Convert CreateInventoryItem to InventoryItem with fake IDs for display
      return items.map(
        (item, i): InventoryItem => ({
          id: i,
          inventory_id: 0,
          item_type: item.item_type,
          item_id: item.item_id,
          material: item.material ?? null,
          grip_id: item.grip_id ?? null,
          gem_1_id: item.gem_1_id ?? null,
          gem_2_id: item.gem_2_id ?? null,
          gem_3_id: item.gem_3_id ?? null,
          equip_slot: (item.equip_slot as InventoryItem["equip_slot"]) ?? null,
          storage: item.storage ?? "bag",
          quantity: item.quantity ?? 1,
        })
      )
    },
    [blades, armor, grips, gems, consumables]
  )

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/inventory">
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>
        <h2 className="text-lg font-medium">Import from Save File</h2>
      </div>

      {phase === "upload" && <UploadPhase onFile={handleFile} error={error} />}

      {phase === "preview" && (
        <PreviewPhase
          slots={slots}
          onToggleSelected={toggleSlotSelected}
          onToggleExpanded={toggleSlotExpanded}
          onUpdateName={updateSlotName}
          onImport={handleImport}
          onBack={() => {
            setPhase("upload")
            setSlots([])
            setError(null)
          }}
          selectedCount={selectedSlots.length}
          buildPreviewItems={buildPreviewItems}
          getDisplayName={getDisplayName}
          getDisplayType={getDisplayType}
        />
      )}

      {phase === "importing" && (
        <ImportingPhase progress={importProgress} total={importTotal} />
      )}
    </div>
  )
}

// ── Phase 1: Upload ──────────────────────────────────────────────────

function UploadPhase({
  onFile,
  error,
}: {
  onFile: (file: File) => void
  error: string | null
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) onFile(file)
    },
    [onFile]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onFile(file)
    },
    [onFile]
  )

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-16 transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border/50 hover:border-foreground/30"
        )}
      >
        <Upload
          className={cn(
            "size-10",
            dragOver ? "text-primary" : "text-muted-foreground"
          )}
        />
        <div className="text-center">
          <p className="text-sm font-medium">
            Drop a memory card file here or click to browse
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Accepts .srm, .mcd, .mcr (128 KB PS1 memory card images)
          </p>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".srm,.mcd,.mcr"
        onChange={handleChange}
        className="hidden"
      />

      {error && (
        <div className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <EmulatorSavePaths />
    </div>
  )
}

// ── Phase 2: Preview & Select ────────────────────────────────────────

function PreviewPhase({
  slots,
  onToggleSelected,
  onToggleExpanded,
  onUpdateName,
  onImport,
  onBack,
  selectedCount,
  buildPreviewItems,
  getDisplayName,
  getDisplayType,
}: {
  slots: SlotState[]
  onToggleSelected: (index: number) => void
  onToggleExpanded: (index: number) => void
  onUpdateName: (index: number, name: string) => void
  onImport: () => void
  onBack: () => void
  selectedCount: number
  buildPreviewItems: (slot: ParsedSaveSlot) => InventoryItem[]
  getDisplayName: (item: InventoryItem) => string
  getDisplayType: (item: InventoryItem) => string
}) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Found {slots.length} save {slots.length === 1 ? "slot" : "slots"}.
        Select which to import.
      </p>

      {slots.map((s, i) => (
        <SlotCard
          key={s.slot.slotNumber}
          state={s}
          index={i}
          onToggleSelected={onToggleSelected}
          onToggleExpanded={onToggleExpanded}
          onUpdateName={onUpdateName}
          buildPreviewItems={buildPreviewItems}
          getDisplayName={getDisplayName}
          getDisplayType={getDisplayType}
        />
      ))}

      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          <FileUp className="size-4" />
          Choose Different File
        </Button>
        <Button onClick={onImport} disabled={selectedCount === 0}>
          <Upload className="size-4" />
          Import {selectedCount} {selectedCount === 1 ? "Slot" : "Slots"}
        </Button>
      </div>
    </div>
  )
}

// ── HP / MP stat bar ─────────────────────────────────────────────────

function StatBar({ percent, color }: { percent: number; color: "hp" | "mp" }) {
  return (
    <div className="bg-muted h-2 w-20 overflow-hidden rounded-sm">
      <div
        className={cn(
          "h-full rounded-sm transition-all",
          color === "hp"
            ? "bg-gradient-to-r from-red-500 via-yellow-400 to-green-400"
            : "bg-gradient-to-r from-indigo-500 via-blue-400 to-cyan-300"
        )}
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  )
}

// ── Emulator save paths ──────────────────────────────────────────────

const EMULATOR_PATHS = [
  {
    name: "DuckStation",
    ext: ".mcd",
    paths: [
      { os: "Windows", path: "Documents\\DuckStation\\memcards\\" },
      {
        os: "macOS",
        path: "~/Library/Application Support/DuckStation/memcards/",
      },
      { os: "Linux", path: "~/.local/share/duckstation/memcards/" },
    ],
  },
  {
    name: "RetroArch",
    ext: ".srm",
    paths: [
      { os: "Windows", path: "RetroArch\\saves\\" },
      { os: "macOS", path: "~/Library/Application Support/RetroArch/saves/" },
      { os: "Linux", path: "~/.config/retroarch/saves/" },
    ],
  },
  {
    name: "ePSXe",
    ext: ".mcr",
    paths: [
      { os: "Windows", path: "<ePSXe dir>\\memcards\\" },
      { os: "Linux", path: "~/.epsxe/memcards/" },
    ],
  },
  {
    name: "Mednafen",
    ext: ".mcr",
    paths: [
      { os: "Windows", path: "<Mednafen dir>\\sav\\" },
      { os: "macOS / Linux", path: "~/.mednafen/sav/" },
    ],
  },
  {
    name: "BizHawk",
    ext: ".SaveRAM",
    paths: [{ os: "Windows", path: "<BizHawk dir>\\PSX\\SaveRAM\\" }],
  },
]

function EmulatorSavePaths() {
  return (
    <div className="bg-muted/30 rounded-xl border px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <FolderOpen className="text-muted-foreground size-4" />
        <p className="text-sm font-medium">Where to find your save files</p>
      </div>
      <div className="space-y-3">
        {EMULATOR_PATHS.map((emu) => (
          <div key={emu.name}>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium">{emu.name}</span>
              <span className="text-muted-foreground text-[10px]">
                {emu.ext}
              </span>
            </div>
            <div className="mt-0.5 space-y-0.5">
              {emu.paths.map((p) => (
                <div
                  key={p.os}
                  className="flex items-baseline gap-2 text-[11px]"
                >
                  <span className="text-muted-foreground w-20 shrink-0">
                    {p.os}
                  </span>
                  <code className="text-muted-foreground/80 min-w-0 font-mono break-all">
                    {p.path}
                  </code>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground mt-3 text-[11px]">
        All formats are the same raw 128 KB memory card image — you can rename
        between .srm, .mcd, and .mcr freely.
      </p>
    </div>
  )
}

// ── Slot Card ────────────────────────────────────────────────────────

function SlotCard({
  state,
  index,
  onToggleSelected,
  onToggleExpanded,
  onUpdateName,
  buildPreviewItems,
  getDisplayName,
  getDisplayType,
}: {
  state: SlotState
  index: number
  onToggleSelected: (index: number) => void
  onToggleExpanded: (index: number) => void
  onUpdateName: (index: number, name: string) => void
  buildPreviewItems: (slot: ParsedSaveSlot) => InventoryItem[]
  getDisplayName: (item: InventoryItem) => string
  getDisplayType: (item: InventoryItem) => string
}) {
  const { slot, name, selected, expanded } = state
  const disabled = !slot.checksumValid
  const roomName = getRoomName(slot.zoneId, slot.roomId)
  const [bagCategory, setBagCategory] = useState("all")
  const [containerCategory, setContainerCategory] = useState("all")

  // Build preview items only when expanded (avoid computing for collapsed)
  const previewItems = useMemo(
    () => (expanded ? buildPreviewItems(slot) : []),
    [expanded, slot, buildPreviewItems]
  )

  const bagItems = previewItems.filter((i) => i.storage === "bag")
  const containerItems = previewItems.filter((i) => i.storage === "container")
  const equippedItems = bagItems.filter((i) => i.equip_slot)

  // Build category counts for bag and container
  const getCategoryCounts = useCallback(
    (items: InventoryItem[]) => {
      const counts = new Map<string, number>()
      for (const item of items) {
        const displayType = getDisplayType(item)
        const category = DISPLAY_TYPE_TO_CATEGORY[displayType] ?? displayType
        counts.set(category, (counts.get(category) ?? 0) + 1)
      }
      const order = [
        "Blade",
        "Grip",
        "Shield",
        "Helm",
        "Body",
        "Leg",
        "Arm",
        "Accessory",
        "Gem",
        "Consumable",
      ]
      return order
        .filter((c) => counts.has(c))
        .map((c) => ({ label: c, count: counts.get(c)! }))
    },
    [getDisplayType]
  )

  const bagCategories = useMemo(
    () => getCategoryCounts(bagItems),
    [bagItems, getCategoryCounts]
  )
  const containerCategories = useMemo(
    () => getCategoryCounts(containerItems),
    [containerItems, getCategoryCounts]
  )

  const filterByCategory = useCallback(
    (items: InventoryItem[], category: string) => {
      if (category === "all") return items
      return items.filter((item) => {
        const displayType = getDisplayType(item)
        const cat = DISPLAY_TYPE_TO_CATEGORY[displayType] ?? displayType
        return cat === category
      })
    },
    [getDisplayType]
  )

  const hpPct = slot.maxHp > 0 ? (slot.hp / slot.maxHp) * 100 : 0
  const mpPct = slot.maxMp > 0 ? (slot.mp / slot.maxMp) * 100 : 0

  return (
    <Card
      className={cn(
        "transition-colors",
        disabled && "opacity-60",
        selected && !disabled && "border-primary/30",
        expanded && "flex max-h-[80vh] flex-col"
      )}
    >
      <CardContent
        className={cn(
          "space-y-3 p-4",
          expanded && "flex flex-col overflow-hidden"
        )}
      >
        {/* Top row: checkbox + clickable save info */}
        <div className={cn("flex shrink-0 items-start gap-3")}>
          {/* Checkbox — stops propagation so it doesn't toggle expand */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleSelected(index)
            }}
            disabled={disabled}
            className={cn(
              "mt-1 flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
              disabled
                ? "border-border/50 cursor-not-allowed"
                : selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-foreground/40"
            )}
          >
            {selected && !disabled && <Check className="size-3" />}
          </button>

          {/* Clickable area — toggles expand/collapse */}
          <div
            className="min-w-0 flex-1 cursor-pointer space-y-2"
            onClick={() => onToggleExpanded(index)}
          >
            {/* Row 1: NO.xx  Room Name   MAP:xx% SAVE:xxxx CLEAR:xx */}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-muted-foreground shrink-0 font-mono text-xs">
                NO.{String(slot.slotNumber).padStart(2, "0")}
              </span>
              <span className="text-sm font-medium">
                {roomName || `Zone ${slot.zoneId}`}
              </span>
              <div className="text-muted-foreground ml-auto flex shrink-0 items-center gap-3 font-mono text-[11px]">
                <span>MAP:{slot.mapCompletion}%</span>
                <span>SAVE:{String(slot.saveCount).padStart(4, "0")}</span>
                <span>
                  CLEAR:
                  <span className={slot.clearCount > 0 ? "text-primary" : ""}>
                    {String(slot.clearCount).padStart(2, "0")}
                  </span>
                </span>
                {expanded ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
              </div>
            </div>

            {/* Row 2: HP bar + MP bar + TIME */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {/* HP */}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-6 font-mono text-xs">
                  HP
                </span>
                <StatBar percent={hpPct} color="hp" />
                <span className="font-mono text-xs">
                  {slot.hp}
                  <span className="text-muted-foreground">·</span>
                  {slot.maxHp}
                </span>
              </div>
              {/* MP */}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-6 font-mono text-xs">
                  MP
                </span>
                <StatBar percent={mpPct} color="mp" />
                <span className="font-mono text-xs">
                  {slot.mp}
                  <span className="text-muted-foreground">·</span>
                  {slot.maxMp}
                </span>
              </div>
              {/* TIME */}
              <span className="text-muted-foreground ml-auto font-mono text-xs">
                TIME {slot.gameTime}
              </span>
            </div>

            {disabled && (
              <div className="text-destructive flex items-center gap-1 text-xs">
                <AlertTriangle className="size-3" />
                Checksum failed — data may be corrupt
              </div>
            )}
          </div>
        </div>

        {/* Name input */}
        {selected && !disabled && (
          <div onClick={(e) => e.stopPropagation()}>
            <label className="text-muted-foreground mb-1 block text-xs">
              Inventory name
            </label>
            <Input
              value={name}
              onChange={(e) => onUpdateName(index, e.target.value)}
              placeholder="Inventory name"
              maxLength={100}
              className="text-sm"
            />
          </div>
        )}

        {/* Expanded content — scrolls within the card */}
        {expanded && (
          <div
            className="min-h-0 flex-1 space-y-4 overflow-y-auto pt-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Equipment grid */}
            {equippedItems.length > 0 && (
              <div>
                <p className="text-muted-foreground mb-2 text-xs font-medium">
                  Equipment
                </p>
                <div className="mx-auto max-w-xs">
                  <ReadOnlyEquipmentGrid
                    items={bagItems}
                    getDisplayName={getDisplayName}
                    getDisplayType={getDisplayType}
                  />
                </div>
              </div>
            )}

            {/* Bag items */}
            {bagItems.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <p className="text-muted-foreground text-xs font-medium">
                    Bag ({bagItems.length})
                  </p>
                  {bagCategories.length > 1 && (
                    <Select value={bagCategory} onValueChange={setBagCategory}>
                      <SelectTrigger className="h-7 w-auto min-w-[6rem] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {bagCategories.map((c) => (
                          <SelectItem key={c.label} value={c.label}>
                            {c.label} ({c.count})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-1">
                  {filterByCategory(bagItems, bagCategory).map((item) => (
                    <ReadOnlyBagItemRow
                      key={`bag-${item.id}`}
                      item={item}
                      name={getDisplayName(item)}
                      type={getDisplayType(item)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Container items */}
            {containerItems.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <p className="text-muted-foreground text-xs font-medium">
                    Container ({containerItems.length})
                  </p>
                  {containerCategories.length > 1 && (
                    <Select
                      value={containerCategory}
                      onValueChange={setContainerCategory}
                    >
                      <SelectTrigger className="h-7 w-auto min-w-[6rem] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {containerCategories.map((c) => (
                          <SelectItem key={c.label} value={c.label}>
                            {c.label} ({c.count})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-1">
                  {filterByCategory(containerItems, containerCategory).map(
                    (item) => (
                      <ReadOnlyBagItemRow
                        key={`container-${item.id}`}
                        item={item}
                        name={getDisplayName(item)}
                        type={getDisplayType(item)}
                      />
                    )
                  )}
                </div>
              </div>
            )}

            {previewItems.length === 0 && (
              <p className="text-muted-foreground py-2 text-center text-xs">
                No items found in this slot
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Phase 3: Importing ───────────────────────────────────────────────

function ImportingPhase({
  progress,
  total,
}: {
  progress: number
  total: number
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <Loader2 className="text-primary size-8 animate-spin" />
      <div className="text-center">
        <p className="text-sm font-medium">
          Importing {progress} of {total}...
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Creating inventories and mapping items
        </p>
      </div>
      {/* Progress bar */}
      <div className="bg-muted h-2 w-48 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full transition-all"
          style={{ width: `${total > 0 ? (progress / total) * 100 : 0}%` }}
        />
      </div>
    </div>
  )
}

import { cn } from "@/lib/utils"

const ICON_MAP: Record<string, string> = {
  // Weapon blade types (corrected API values)
  Dagger: "Dagger",
  Sword: "Sword",
  "Great Sword": "Great_Sword",
  "Axe / Mace": "Axe",
  Axe: "Axe",
  "Great Axe": "Great_Axe",
  Staff: "Staff",
  "Heavy Mace": "Heavy_Mace",
  Polearm: "Polearm",
  Crossbow: "Crossbow",
  // Legacy API values
  Mace: "Mace",
  // Armor types
  Helm: "Helm",
  Body: "Body",
  Leg: "Leg",
  Arm: "Arm",
  Shield: "Shield",
  Accessory: "Accessory",
  // Others
  Gem: "Gem",
  Grip: "Grip",
  Consumable: "Consumable",
  Material: "Material",
  Spell: "Gem",
  Key: "Consumable",
  Sigil: "Consumable",
  Grimoire: "Consumable",
  Workshop: "Material",
}

interface ItemIconProps {
  type?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function ItemIcon({ type, size = "md", className }: ItemIconProps) {
  const icon = type ? ICON_MAP[type] : undefined
  const src = icon ? `/images/icons/${icon}.svg` : undefined

  const sizeClass = {
    sm: "size-6",
    md: "size-10",
    lg: "size-32",
  }[size]

  if (!src) {
    return (
      <div className={cn("bg-muted shrink-0 rounded", sizeClass, className)} />
    )
  }

  return (
    <div
      className={cn(
        "bg-primary text-primary-foreground flex shrink-0 items-center justify-center rounded-lg",
        sizeClass,
        className
      )}
    >
      <img
        src={src}
        alt={type ?? ""}
        className={cn(
          size === "sm" && "size-4",
          size === "md" && "size-7",
          size === "lg" && "size-24"
        )}
      />
    </div>
  )
}

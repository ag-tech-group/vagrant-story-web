import { useLocation, useNavigate } from "@tanstack/react-router"
import { ItemIcon } from "@/components/item-icon"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const DATABASE_PAGES = [
  { to: "/blades", label: "Blades", icon: "Sword" },
  { to: "/grips", label: "Grips", icon: "Grip" },
  { to: "/armor", label: "Armor", icon: "Body" },
  { to: "/materials", label: "Materials", icon: "Bronze" },
  { to: "/accessories", label: "Accessories", icon: "Accessory" },
  { to: "/gems", label: "Gems", icon: "Gem" },
  { to: "/consumables", label: "Consumables", icon: "Consumable" },
  { to: "/break-arts", label: "Break Arts", icon: "BreakArt" },
  { to: "/battle-abilities", label: "Battle Abilities", icon: "BattleAbility" },
  { to: "/spells", label: "Spells", icon: "Spell" },
  { to: "/grimoires", label: "Grimoires", icon: "Grimoire" },
  { to: "/keys", label: "Keys", icon: "Key" },
  { to: "/sigils", label: "Sigils", icon: "Sigil" },
  { to: "/workshops", label: "Workshops", icon: "Workshop" },
]

export function DatabaseSelect() {
  const location = useLocation()
  const navigate = useNavigate()

  const currentPage = DATABASE_PAGES.find(
    (p) =>
      location.pathname === p.to || location.pathname.startsWith(p.to + "/")
  )

  return (
    <Select
      value={currentPage?.to ?? DATABASE_PAGES[0].to}
      onValueChange={(v) => navigate({ to: v })}
    >
      <SelectTrigger className="h-9 w-fit">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DATABASE_PAGES.map((page) => (
          <SelectItem key={page.to} value={page.to}>
            <div className="flex items-center gap-2">
              <ItemIcon type={page.icon} size="sm" />
              {page.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

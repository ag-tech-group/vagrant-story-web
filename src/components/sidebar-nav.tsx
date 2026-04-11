import { useEffect, useState } from "react"
import { Link, useMatches } from "@tanstack/react-router"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { ItemIcon } from "@/components/item-icon"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const SIDEBAR_KEY = "vs-sidebar-open"

interface NavItem {
  to: string
  label: string
  icon: string
  featured?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Tools",
    items: [
      {
        to: "/inventory",
        label: "Inventory",
        icon: "Inventory",
        featured: true,
      },
      { to: "/forge", label: "Forge", icon: "Forge" },
      { to: "/crafting", label: "Recipes", icon: "Crafting" },
      { to: "/material-grid", label: "Material Grid", icon: "Grid" },
    ],
  },
  {
    title: "Equipment",
    items: [
      { to: "/blades", label: "Blades", icon: "Sword" },
      { to: "/grips", label: "Grips", icon: "Grip" },
      { to: "/armor", label: "Armor", icon: "Body" },
      { to: "/accessories", label: "Accessories", icon: "Accessory" },
      { to: "/gems", label: "Gems", icon: "Gem" },
      { to: "/materials", label: "Materials", icon: "Bronze" },
      { to: "/consumables", label: "Consumables", icon: "Consumable" },
    ],
  },
  {
    title: "Combat",
    items: [
      { to: "/break-arts", label: "Break Arts", icon: "BreakArt" },
      {
        to: "/battle-abilities",
        label: "Battle Abilities",
        icon: "BattleAbility",
      },
      { to: "/spells", label: "Spells", icon: "Spell" },
      { to: "/grimoires", label: "Grimoires", icon: "Grimoire" },
    ],
  },
  {
    title: "World",
    items: [
      { to: "/bestiary", label: "Bestiary", icon: "Bestiary" },
      { to: "/areas", label: "Areas", icon: "Area" },
      { to: "/workshops", label: "Workshops", icon: "Workshop" },
      { to: "/chests", label: "Chests", icon: "Chest" },
      { to: "/characters", label: "Characters", icon: "Character" },
    ],
  },
  {
    title: "Progression",
    items: [
      { to: "/keys", label: "Keys", icon: "Key" },
      { to: "/sigils", label: "Sigils", icon: "Sigil" },
      { to: "/titles", label: "Titles", icon: "Title" },
      { to: "/rankings", label: "Rankings", icon: "Ranking" },
    ],
  },
]

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  )
  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [query])
  return matches
}

export function SidebarNav() {
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return true
    const isLg = window.matchMedia("(min-width: 1024px)").matches
    if (!isLg) return false
    const stored = localStorage.getItem(SIDEBAR_KEY)
    return stored !== null ? stored === "true" : true
  })

  const toggle = () => {
    const next = !open
    setOpen(next)
    localStorage.setItem(SIDEBAR_KEY, String(next))
  }

  const matches = useMatches()
  const currentPath = matches[matches.length - 1]?.fullPath ?? "/"

  return (
    <>
      {/* Toggle button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggle}
        className="fixed top-3 left-4 z-50 h-8 w-8 p-0"
        title={open ? "Close sidebar" : "Open sidebar"}
      >
        {open ? (
          <PanelLeftClose className="size-4" />
        ) : (
          <PanelLeftOpen className="size-4" />
        )}
      </Button>

      {/* Overlay for mobile when open */}
      {open && !isDesktop && (
        <div
          className="fixed inset-0 z-30 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-background border-border/50 fixed top-14 z-40 h-[calc(100vh-3.5rem)] overflow-y-auto border-r transition-all duration-200",
          open ? "w-52" : "w-0 -translate-x-full",
          !isDesktop && open && "shadow-xl"
        )}
      >
        <nav className="space-y-4 px-3 py-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="text-muted-foreground mb-1 px-2 text-[10px] font-semibold tracking-wider uppercase">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    currentPath === item.to ||
                    currentPath.startsWith(item.to + "/")
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => {
                        if (!isDesktop) setOpen(false)
                      }}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : item.featured
                            ? "text-primary/80 bg-primary/5 hover:bg-primary/10 hover:text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <ItemIcon type={item.icon} size="sm" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Spacer to push content right when sidebar is open on desktop */}
      {open && isDesktop && (
        <div className="w-52 shrink-0 transition-all duration-200" />
      )}
    </>
  )
}

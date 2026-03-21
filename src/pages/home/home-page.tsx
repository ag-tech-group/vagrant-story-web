import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { ItemIcon } from "@/components/item-icon"
import { Card, CardContent } from "@/components/ui/card"
import { gameApi } from "@/lib/game-api"

export function HomePage() {
  const { data: blades = [] } = useQuery({
    queryKey: ["blades"],
    queryFn: gameApi.blades,
  })
  const { data: armor = [] } = useQuery({
    queryKey: ["armor"],
    queryFn: gameApi.armor,
  })
  const { data: gems = [] } = useQuery({
    queryKey: ["gems"],
    queryFn: gameApi.gems,
  })
  const { data: grips = [] } = useQuery({
    queryKey: ["grips"],
    queryFn: gameApi.grips,
  })
  const { data: consumables = [] } = useQuery({
    queryKey: ["consumables"],
    queryFn: gameApi.consumables,
  })
  const { data: spells = [] } = useQuery({
    queryKey: ["spells"],
    queryFn: gameApi.spells,
  })
  const { data: keys = [] } = useQuery({
    queryKey: ["keys"],
    queryFn: gameApi.keys,
  })
  const { data: sigils = [] } = useQuery({
    queryKey: ["sigils"],
    queryFn: gameApi.sigils,
  })
  const { data: grimoires = [] } = useQuery({
    queryKey: ["grimoires"],
    queryFn: gameApi.grimoires,
  })
  const { data: chests = [] } = useQuery({
    queryKey: ["chests"],
    queryFn: gameApi.chests,
  })
  const { data: workshops = [] } = useQuery({
    queryKey: ["workshops"],
    queryFn: gameApi.workshops,
  })
  const { data: areas = [] } = useQuery({
    queryKey: ["areas"],
    queryFn: gameApi.areas,
  })
  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: gameApi.materials,
  })
  const { data: breakArts = [] } = useQuery({
    queryKey: ["break-arts"],
    queryFn: gameApi.breakArts,
  })
  const { data: battleAbilities = [] } = useQuery({
    queryKey: ["battle-abilities"],
    queryFn: gameApi.battleAbilities,
  })
  const { data: characters = [] } = useQuery({
    queryKey: ["characters"],
    queryFn: gameApi.characters,
  })
  const { data: titles = [] } = useQuery({
    queryKey: ["titles"],
    queryFn: gameApi.titles,
  })
  const { data: rankings = [] } = useQuery({
    queryKey: ["rankings"],
    queryFn: gameApi.rankings,
  })

  const accessories = armor.filter((a) => a.armor_type === "Accessory")
  const armorOnly = armor.filter((a) => a.armor_type !== "Accessory")

  const DB_CARDS = [
    {
      to: "/blades" as const,
      label: "Blades",
      icon: "Sword",
      count: blades.length,
    },
    {
      to: "/grips" as const,
      label: "Grips",
      icon: "Grip",
      count: grips.length,
    },
    {
      to: "/armor" as const,
      label: "Armor",
      icon: "Body",
      count: armorOnly.length,
    },
    {
      to: "/materials" as const,
      label: "Materials",
      icon: "Bronze",
      count: materials.length,
    },
    {
      to: "/accessories" as const,
      label: "Accessories",
      icon: "Accessory",
      count: accessories.length,
    },
    { to: "/gems" as const, label: "Gems", icon: "Gem", count: gems.length },
    {
      to: "/consumables" as const,
      label: "Consumables",
      icon: "Consumable",
      count: consumables.length,
    },
    {
      to: "/break-arts" as const,
      label: "Break Arts",
      icon: "BreakArt",
      count: breakArts.length,
    },
    {
      to: "/battle-abilities" as const,
      label: "Battle Abilities",
      icon: "BattleAbility",
      count: battleAbilities.length,
    },
    {
      to: "/spells" as const,
      label: "Spells",
      icon: "Spell",
      count: spells.length,
    },
    {
      to: "/grimoires" as const,
      label: "Grimoires",
      icon: "Grimoire",
      count: grimoires.length,
    },
    { to: "/keys" as const, label: "Keys", icon: "Key", count: keys.length },
    {
      to: "/sigils" as const,
      label: "Sigils",
      icon: "Sigil",
      count: sigils.length,
    },
    {
      to: "/workshops" as const,
      label: "Workshops",
      icon: "Workshop",
      count: workshops.length,
    },
    {
      to: "/chests" as const,
      label: "Chests",
      icon: "Chest",
      count: chests.length,
    },
    {
      to: "/areas" as const,
      label: "Areas",
      icon: "Area",
      count: areas.length,
    },
    {
      to: "/characters" as const,
      label: "Characters",
      icon: "Character",
      count: characters.length,
    },
    {
      to: "/titles" as const,
      label: "Titles",
      icon: "Title",
      count: titles.length,
    },
    {
      to: "/rankings" as const,
      label: "Rankings",
      icon: "Ranking",
      count: rankings.length,
    },
  ]

  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center lg:py-24">
        <h1 className="text-5xl tracking-wide sm:text-6xl lg:text-7xl">
          Vagrant Story
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg lg:text-xl">
          Community game database and crafting tools for the classic PlayStation
          RPG. Browse blades, armor, materials, and more.
        </p>
      </section>

      <div className="mx-auto w-full max-w-6xl space-y-12 px-6 pb-16">
        {/* Game Database */}
        <section>
          <h2 className="mb-6 text-2xl tracking-wide">Game Database</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DB_CARDS.map((card) => (
              <Link key={card.to} to={card.to}>
                <Card className="hover:border-primary/40 h-full transition-colors">
                  <CardContent className="flex items-center gap-3 py-4">
                    <ItemIcon type={card.icon} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{card.label}</p>
                      <p className="text-muted-foreground text-xs">
                        {card.count} items
                      </p>
                    </div>
                    <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Tools */}
        <section>
          <h2 className="mb-6 text-2xl tracking-wide">Tools</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Link to="/forge">
              <Card className="hover:border-primary/40 h-full transition-colors">
                <CardContent className="flex items-start gap-3 pt-6">
                  <ItemIcon type="Forge" size="sm" />
                  <div>
                    <h3 className="font-sans text-lg font-medium">Forge</h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Equipment builder. Select a blade, armor, or shield with a
                      material and grip to see combined stats.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link to="/crafting">
              <Card className="hover:border-primary/40 h-full transition-colors">
                <CardContent className="flex items-start gap-3 pt-6">
                  <ItemIcon type="Crafting" size="sm" />
                  <div>
                    <h3 className="font-sans text-lg font-medium">
                      Crafting Calculator
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Combine items and see results. Includes reverse lookup to
                      find recipes for any item.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link to="/material-grid">
              <Card className="hover:border-primary/40 h-full transition-colors">
                <CardContent className="flex items-start gap-3 pt-6">
                  <ItemIcon type="Grid" size="sm" />
                  <div>
                    <h3 className="font-sans text-lg font-medium">
                      Material Grid
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Compact grid reference for blade, armor, and shield
                      material combination tables.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

        {/* API */}
        <section className="text-muted-foreground text-center text-sm">
          <p>
            Public API available at{" "}
            <a
              href="https://vagrant-story-api.criticalbit.gg/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              vagrant-story-api.criticalbit.gg/docs
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}

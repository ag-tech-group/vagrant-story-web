import { useQuery } from "@tanstack/react-query"
import { ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  gameApi,
  fmt,
  type Weapon,
  type Armor,
  type Material,
} from "@/lib/game-api"

export function HomePage() {
  const { data: weapons = [] } = useQuery({
    queryKey: ["weapons"],
    queryFn: gameApi.weapons,
  })
  const { data: armor = [] } = useQuery({
    queryKey: ["armor"],
    queryFn: gameApi.armor,
  })
  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: gameApi.materials,
  })

  const previewWeapons = weapons.slice(0, 4)
  const previewArmor = armor.filter((a) => a.armor_type === "Body").slice(0, 4)

  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center lg:py-24">
        <h1 className="text-5xl tracking-wide sm:text-6xl lg:text-7xl">
          Vagrant Story
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg lg:text-xl">
          Community game database and crafting tools for the classic PlayStation
          RPG. Browse weapons, armor, materials, and more.
        </p>
      </section>

      <div className="mx-auto w-full max-w-6xl space-y-12 px-6 pb-16">
        {/* Tools */}
        <section>
          <h2 className="mb-6 text-2xl tracking-wide">Tools</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <ToolCard
              title="Crafting Calculator"
              description="Combine items and see results. Includes reverse lookup to find recipes for any item."
              href="/crafting"
            />
            <ToolCard
              title="Material Combinations"
              description="Compact grid reference for blade, armor, and shield material tables."
              href="/crafting/materials"
            />
            <ToolCard
              title="More Coming Soon"
              description="Spells, skills, enemy data, and more tools are planned."
              disabled
            />
          </div>
        </section>

        {/* Data previews */}
        <section>
          <h2 className="mb-6 text-2xl tracking-wide">Game Database</h2>
          <div className="grid gap-6 lg:grid-cols-3">
            <PreviewCard title="Weapons" href="/weapons" count={weapons.length}>
              {previewWeapons.map((w) => (
                <WeaponRow key={w.id} weapon={w} />
              ))}
            </PreviewCard>

            <PreviewCard title="Armor" href="/armor" count={armor.length}>
              {previewArmor.map((a) => (
                <ArmorRow key={a.id} armor={a} />
              ))}
            </PreviewCard>

            <PreviewCard
              title="Materials"
              href="/materials"
              count={materials.length}
            >
              {materials.map((m) => (
                <MaterialRow key={m.id} material={m} />
              ))}
            </PreviewCard>
          </div>
        </section>

        {/* API */}
        <section className="text-muted-foreground text-center text-sm">
          <p>
            Public API available at{" "}
            <a
              href="https://vagrant-story-api.criticalbit.gg/docs"
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

function ToolCard({
  title,
  description,
  href,
  disabled,
}: {
  title: string
  description: string
  href?: string
  disabled?: boolean
}) {
  const content = (
    <Card
      className={
        disabled ? "opacity-50" : "hover:border-primary/40 transition-colors"
      }
    >
      <CardContent className="pt-6">
        <div className="bg-muted mb-4 aspect-video w-full rounded-lg" />
        <h3 className="font-sans text-lg font-medium">{title}</h3>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </CardContent>
    </Card>
  )

  if (disabled || !href) return content
  return (
    <a href={href} className="block">
      {content}
    </a>
  )
}

function PreviewCard({
  title,
  href,
  count,
  children,
}: {
  title: string
  href: string
  count: number
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{title}</span>
          <span className="text-muted-foreground text-xs font-normal">
            {count} items
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {children}
        <a
          href={href}
          className="text-primary mt-3 flex items-center gap-1 text-sm font-medium"
        >
          Browse all <ArrowRight className="size-3.5" />
        </a>
      </CardContent>
    </Card>
  )
}

function WeaponRow({ weapon }: { weapon: Weapon }) {
  return (
    <div className="flex items-center gap-3 rounded-md border p-2">
      <div className="bg-muted size-10 shrink-0 rounded" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{fmt(weapon.field_name)}</p>
        <p className="text-muted-foreground text-xs">
          {weapon.blade_type} · {weapon.damage_type}
        </p>
      </div>
      <div className="text-muted-foreground shrink-0 text-right text-xs">
        <p>STR {weapon.str}</p>
        <p>DMG {weapon.damage}</p>
      </div>
    </div>
  )
}

function ArmorRow({ armor }: { armor: Armor }) {
  return (
    <div className="flex items-center gap-3 rounded-md border p-2">
      <div className="bg-muted size-10 shrink-0 rounded" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{fmt(armor.field_name)}</p>
        <p className="text-muted-foreground text-xs">{armor.armor_type}</p>
      </div>
      <div className="text-muted-foreground shrink-0 text-right text-xs">
        <p>STR {armor.str}</p>
        <p>Gems {armor.gem_slots}</p>
      </div>
    </div>
  )
}

function MaterialRow({ material }: { material: Material }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{material.name}</span>
        <span className="text-muted-foreground text-xs">
          Tier {material.tier}
        </span>
      </div>
      <div className="text-muted-foreground flex gap-3 text-xs">
        <span>
          STR {material.str_modifier > 0 ? "+" : ""}
          {material.str_modifier}
        </span>
        <span>
          INT {material.int_modifier > 0 ? "+" : ""}
          {material.int_modifier}
        </span>
        <span>
          AGI {material.agi_modifier > 0 ? "+" : ""}
          {material.agi_modifier}
        </span>
      </div>
    </div>
  )
}

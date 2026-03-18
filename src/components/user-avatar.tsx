import { useAuth } from "@/lib/auth"

export function UserAvatar({ size = "sm" }: { size?: "sm" | "lg" }) {
  const auth = useAuth()
  const sizeClass = size === "lg" ? "size-16 text-2xl" : "size-7 text-xs"

  if (auth.avatarUrl) {
    return (
      <img
        src={auth.avatarUrl}
        alt=""
        className={`${sizeClass} rounded-full object-cover`}
      />
    )
  }

  return (
    <div
      className={`bg-primary text-primary-foreground flex items-center justify-center rounded-full font-medium ${sizeClass}`}
    >
      {auth.email?.charAt(0).toUpperCase() ?? "?"}
    </div>
  )
}

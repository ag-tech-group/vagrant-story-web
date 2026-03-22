export const AUTH_URL =
  import.meta.env.VITE_AUTH_URL || "https://auth.criticalbit.gg"

export function loginUrl(redirectPath = "/") {
  const redirect = window.location.origin + redirectPath
  return `${AUTH_URL}/login?redirect=${encodeURIComponent(redirect)}`
}

export function profileUrl() {
  return `${AUTH_URL}/profile`
}

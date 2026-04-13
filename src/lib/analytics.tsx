import { createContext, useContext, useMemo } from "react"
import posthog from "posthog-js"
import { readCachedConsent } from "@/lib/consent"
import { logger } from "@/lib/logger"

// All events from this site are prefixed so they can be filtered out of the
// shared "criticalbit" PostHog project without relying only on $host.
const EVENT_PREFIX = "vs_"

interface AnalyticsBackend {
  track: (event: string, properties?: Record<string, unknown>) => void
  identify: (userId: string, traits?: Record<string, unknown>) => void
  page: (name?: string, properties?: Record<string, unknown>) => void
}

const defaultBackend: AnalyticsBackend = {
  track(event, properties) {
    logger.info("analytics.track", {
      event: `${EVENT_PREFIX}${event}`,
      ...properties,
    })
  },
  identify(userId, traits) {
    logger.info("analytics.identify", { userId, ...traits })
  },
  page(name, properties) {
    logger.info("analytics.page", { name, ...properties })
  },
}

// Tracks whether the user gave analytics consent at page load. Flips to
// true only after a successful consent-gated init; identify() remains a
// no-op otherwise so memory-mode sessions never build a person profile.
let capturingEnabled = false

const posthogBackend: AnalyticsBackend = {
  track(event, properties) {
    if (!capturingEnabled) return
    posthog.capture(`${EVENT_PREFIX}${event}`, properties)
  },
  identify(userId, traits) {
    if (!capturingEnabled) return
    posthog.identify(userId, traits)
  },
  page() {
    // PostHog auto-captures pageviews when capturing is enabled.
  },
}

export function createAnalyticsBackend(): AnalyticsBackend {
  const key = import.meta.env.VITE_POSTHOG_KEY
  const host = import.meta.env.VITE_POSTHOG_HOST
  if (!key || !host) return defaultBackend

  const analyticsConsented = readCachedConsent("analytics")

  // cross_subdomain_cookie defaults to true, so when persistence is
  // "localStorage+cookie" PostHog automatically scopes the cookie to the
  // eTLD+1 (.criticalbit.gg in prod, localhost in dev). No manual domain
  // configuration required.
  posthog.init(key, {
    api_host: host,
    defaults: "2026-01-30",
    persistence: analyticsConsented ? "localStorage+cookie" : "memory",
    disable_session_recording: true,
    autocapture: false,
    capture_pageview: analyticsConsented,
    capture_pageleave: analyticsConsented,
  })

  if (analyticsConsented) {
    posthog.opt_in_capturing()
    capturingEnabled = true
  } else {
    // Belt-and-suspenders: scrub any cookies left over from a prior
    // session where the user had consented. Safe to call on a fresh
    // init; it only clears persistence, not in-memory config.
    posthog.opt_out_capturing()
    posthog.reset(true)
    capturingEnabled = false
  }

  return posthogBackend
}

export function resetAnalytics(): void {
  try {
    posthog.reset(true)
  } catch {
    // PostHog never initialized (missing env vars) — nothing to reset.
  }
}

const AnalyticsContext = createContext<AnalyticsBackend>(defaultBackend)

interface AnalyticsProviderProps {
  children: React.ReactNode
  backend?: AnalyticsBackend
}

export function AnalyticsProvider({
  children,
  backend,
}: AnalyticsProviderProps) {
  const value = useMemo(() => backend ?? defaultBackend, [backend])
  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalytics() {
  return useContext(AnalyticsContext)
}

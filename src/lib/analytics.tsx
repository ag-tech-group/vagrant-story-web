import { createContext, useContext, useMemo } from "react"
import posthog from "posthog-js"
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

const posthogBackend: AnalyticsBackend = {
  track(event, properties) {
    posthog.capture(`${EVENT_PREFIX}${event}`, properties)
  },
  identify() {
    // Cookie-free mode — do not identify users
  },
  page() {
    // PostHog auto-captures pageviews; no manual call needed
  },
}

export function createAnalyticsBackend(): AnalyticsBackend {
  const key = import.meta.env.VITE_POSTHOG_KEY
  const host = import.meta.env.VITE_POSTHOG_HOST
  if (!key || !host) return defaultBackend

  posthog.init(key, {
    api_host: host,
    defaults: "2026-01-30",
    persistence: "memory",
    disable_session_recording: true,
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: true,
  })
  return posthogBackend
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

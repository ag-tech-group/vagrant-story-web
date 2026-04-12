import * as Sentry from "@sentry/react"

type SentryRouter = Parameters<
  typeof Sentry.tanstackRouterBrowserTracingIntegration
>[0]

let initialized = false

export function initSentry(router: SentryRouter) {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: __APP_VERSION__,

    // Kept false until a public privacy policy ships — consistent with the
    // cookie-free PostHog posture. Flip to true once a privacy page is live.
    sendDefaultPii: false,

    integrations: [
      Sentry.tanstackRouterBrowserTracingIntegration(router),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/vagrant-story-api\.criticalbit\.gg/,
    ],

    // Project-specific deviation from Sentry's default 0.1 recommendation:
    // Sentry free tier includes 50 replays/month. Session-rate sampling at 10%
    // would blow the quota during any traffic burst. Error-only replay gives
    // the most debuggable signal per replay consumed.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    enableLogs: true,
  })

  initialized = true
}

export function captureException(
  error: unknown,
  context?: Record<string, unknown>
) {
  if (!initialized) return
  Sentry.captureException(error, context ? { extra: context } : undefined)
}

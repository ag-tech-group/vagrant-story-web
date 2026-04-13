import * as Sentry from "@sentry/react"
import { readCachedConsent } from "@/lib/consent"

type SentryRouter = Parameters<
  typeof Sentry.tanstackRouterBrowserTracingIntegration
>[0]

let initialized = false

export function initSentry(router: SentryRouter) {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  // Session replay is gated on explicit user consent. When consent is
  // absent the integration is still installed so error-driven replays
  // keep working (low quota footprint, high debug value per event);
  // full session sampling only turns on when the user has opted in.
  const sessionReplayConsented = readCachedConsent("session_replay")

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: __APP_VERSION__,

    // Privacy policy at criticalbit.gg/privacy discloses the data
    // collected here (IP, headers, URL). Enabled for debuggability now
    // that users have been given notice.
    sendDefaultPii: true,

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

    // Error-only replay runs for everyone as a legitimate-interest
    // debugging tool (covered by the existing privacy policy). Full
    // session replay only activates for users who explicitly opted in
    // via the Privacy and data toggles in criticalbit-auth-web's
    // profile page. The 0.1 sample rate keeps us inside Sentry's free
    // tier quota even under consented traffic bursts.
    replaysSessionSampleRate: sessionReplayConsented ? 0.1 : 0,
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

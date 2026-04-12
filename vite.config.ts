import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import { sentryVitePlugin } from "@sentry/vite-plugin"
import basicSsl from "@vitejs/plugin-basic-ssl"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const API_TARGET =
  process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "https://vagrant-story-api.criticalbit.gg"

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN
const sentryOrg = process.env.SENTRY_ORG
const sentryProject = process.env.SENTRY_PROJECT

// Netlify exposes COMMIT_REF automatically during production builds; locally
// this falls through to "dev". Baked into the client bundle via define() so
// Sentry groups issues by release without needing any Netlify UI env var.
const APP_VERSION = process.env.COMMIT_REF || "dev"

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  build: {
    sourcemap: sentryAuthToken ? "hidden" : false,
  },
  plugins: [
    TanStackRouterVite({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    basicSsl(),
    sentryAuthToken && sentryOrg && sentryProject
      ? sentryVitePlugin({
          authToken: sentryAuthToken,
          org: sentryOrg,
          project: sentryProject,
        })
      : null,
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    allowedHosts: ["local.criticalbit.gg"],
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/auth-api": {
        target: "https://auth-api.criticalbit.gg",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth-api/, ""),
      },
    },
  },
})

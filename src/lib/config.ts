declare global {
  interface Window {
    __STRONK_CONFIG__?: {
      pocketbaseUrl?: string
    }
  }
}

function getRuntimeConfig() {
  return window.__STRONK_CONFIG__ ?? {}
}

export function getPocketBaseUrl() {
  return getRuntimeConfig().pocketbaseUrl ?? import.meta.env.VITE_POCKETBASE_URL ?? ''
}

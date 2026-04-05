declare global {
  interface Window {
    __STRONK_CONFIG__?: {
      supabaseUrl?: string
      supabaseAnonKey?: string
    }
  }
}

function getRuntimeConfig() {
  return window.__STRONK_CONFIG__ ?? {}
}

export function getSupabaseUrl() {
  return getRuntimeConfig().supabaseUrl ?? import.meta.env.VITE_SUPABASE_URL ?? ''
}

export function getSupabaseAnonKey() {
  return getRuntimeConfig().supabaseAnonKey ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
}

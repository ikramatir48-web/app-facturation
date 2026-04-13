import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ugnmuxhgwiexuuetvbtd.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnbm11eGhnd2lleHV1ZXR2YnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDU1MTMsImV4cCI6MjA4OTE4MTUxM30.Lln_7C5ynzk2VHR378RuK1GlzQUHEyek-E0sAwiS9Mg'

// Nettoyer les tokens expirés avant de créer le client
try {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-'))
  for (const key of keys) {
    if (key.includes('auth-token')) {
      const stored = JSON.parse(localStorage.getItem(key) || '{}')
      const expiresAt = stored?.expires_at
      if (expiresAt && expiresAt * 1000 < Date.now()) {
        console.log('Token expiré détecté, nettoyage...')
        keys.forEach(k => localStorage.removeItem(k))
        break
      }
    }
  }
} catch(e) {
  // Si parsing échoue, nettoyer tout
  Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k))
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    detectSessionInUrl: false,
    autoRefreshToken: true,
    persistSession: true,
  },
})

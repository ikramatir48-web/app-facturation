import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Initialisation simple - Supabase gère le token lui-même
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (session?.user) {
        setUser(session.user)
        loadProfile(session.user.id, mounted)
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    }).catch(() => {
      if (mounted) {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') return
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        loadProfile(session.user.id, mounted)
        return
      }
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  async function loadProfile(userId, mounted = true) {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (!mounted) return
      if (!data) {
        supabase.auth.signOut()
        setUser(null)
        setProfile(null)
      } else {
        setProfile(data)
      }
    } catch(e) {
      console.error(e)
    } finally {
      if (mounted) setLoading(false)
    }
  }

  async function fetchProfile(userId) {
    const id = userId || user?.id
    if (!id) return
    const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
    if (data) setProfile(data)
  }

  async function signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function signUp(email, password, nom, telephone, extra = {}) {
    return supabase.auth.signUp({ email, password, options: { data: { nom, role: 'client', telephone, ...extra } } })
  }

  async function resetPassword(email) {
    return supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/auth' })
  }

  async function updatePassword(newPassword) {
    return supabase.auth.updateUser({ password: newPassword })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, fetchProfile, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

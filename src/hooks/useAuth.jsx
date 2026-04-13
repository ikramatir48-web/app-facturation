import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const initializedRef = useRef(false)

  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        if (session?.user) {
          setUser(session.user)
          await loadProfile(session.user.id, true)
        } else {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      } catch (e) {
        if (mounted) {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      } finally {
        initializedRef.current = true
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        // Ignorer ces events qui ne changent pas l'etat fondamental
        if (event === 'USER_UPDATED') return
        if (event === 'TOKEN_REFRESHED') {
          if (session?.user) setUser(session.user)
          return
        }
        // SIGNED_IN apres retour sur l'onglet — ne pas remettre loading si deja initialise
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          // Si deja initialise et profil present, ne pas recharger
          if (initializedRef.current && profile) return
          await loadProfile(session.user.id, false) // false = ne pas mettre loading
          return
        }
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function loadProfile(userId, showLoading = true) {
    if (showLoading) setLoading(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (!data) {
        // Profil introuvable - utilisateur supprime
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }
      setProfile(data)
    } catch (e) {
      console.error('loadProfile error:', e)
      // En cas d'erreur reseau, ne pas deconnecter - garder le profil existant
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  async function fetchProfile(userId) {
    const id = userId || user?.id
    if (!id) return
    await loadProfile(id, false)
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signUp(email, password, nom, telephone, extra = {}) {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { nom, role: 'client', telephone, ...extra } }
    })
    return { error }
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth'
    })
    return { error }
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signIn, signUp, signOut,
      fetchProfile, resetPassword, updatePassword,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

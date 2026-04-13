// Page affichée lors de la première connexion
// Le client doit changer son mot de passe et compléter son profil
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.jsx'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Check, ArrowRight } from 'lucide-react'

const ACTIVITES = ['Boulangerie', 'Restaurant', 'Snack', 'Café', 'Hôtel', 'Hammam', 'Épicerie', 'Industrie', 'Autre']

function cap(str) {
  if (!str) return str
  return str.replace(/\b\w/g, c => c.toUpperCase())
}

export default function ForceSetup() {
  const { profile, fetchProfile } = useAuth()
  const [step, setStep] = useState(1) // 1=password, 2=profil
  const [saving, setSaving] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [activites, setActivites] = useState(ACTIVITES)

  const [pwd, setPwd] = useState({ nouveau: '', confirmation: '' })
  const [adresses, setAdresses] = useState([{ label: '', adresse: '', ville: '' }])

  const [profil, setProfil] = useState({
    nom: profile?.nom || '',
    telephone: profile?.telephone || '',
    adresse: profile?.adresse || '',
    nom_societe: profile?.nom_societe || '',
    ice: profile?.ice || '',
    activite: profile?.activite || '',
    activite_autre: '',
    ville: profile?.ville || '',
  })

  useEffect(() => {
    loadActivites()
  }, [])

  async function loadActivites() {
    const { data } = await supabase.from('activites').select('nom').order('nom')
    if (data) setActivites(data.map(a => a.nom).concat(['Autre']))
  }

  function validatePassword(p) {
    if (p.length < 8) return 'Au moins 8 caractères'
    if (!/[A-Z]/.test(p)) return 'Au moins une majuscule'
    if (!/[0-9]/.test(p)) return 'Au moins un chiffre'
    return null
  }

  async function savePassword() {
    const err = validatePassword(pwd.nouveau)
    if (err) { toast.error(err); return }
    if (pwd.nouveau !== pwd.confirmation) { toast.error('Les mots de passe ne correspondent pas'); return }
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd.nouveau })
      if (error) throw error
      toast.success('Mot de passe mis à jour !')
      setStep(2)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveProfil() {
    if (!profil.nom.trim()) { toast.error('Le nom est obligatoire'); return }
    setSaving(true)
    try {
      const activiteFinal = profil.activite === 'Autre' ? (profil.activite_autre || 'Autre') : profil.activite
      const { error } = await supabase.from('profiles').update({
        nom: profil.nom,
        telephone: profil.telephone || null,
        adresse: profil.adresse || null,
        nom_societe: profil.nom_societe || null,
        ice: profil.ice || null,
        ville: profil.ville || null,
        activite: activiteFinal || null,
        force_password_change: false,
        password_changed: true,
      }).eq('id', profile.id)
      if (error) throw error
      await fetchProfile(profile.id)
      toast.success('Profil complété !')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const pwdErr = pwd.nouveau ? validatePassword(pwd.nouveau) : null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontFamily: 'var(--font-display)', fontWeight: 900, color: 'var(--accent)', marginBottom: 8 }}>IjtiGaz</h1>
          <p style={{ color: 'var(--text-muted)' }}>Bienvenue ! Complétez votre compte pour continuer.</p>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-3 mb-6" style={{ justifyContent: 'center' }}>
          {[['1', 'Mot de passe'], ['2', 'Mon profil']].map(([n, label], i) => (
            <div key={n} className="flex items-center gap-3">
              <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: step >= Number(n) ? 'var(--accent)' : 'var(--bg-elevated)', color: step >= Number(n) ? 'white' : 'var(--text-muted)', fontWeight: 700, fontSize: 13 }}>
                {step > Number(n) ? '✓' : n}
              </div>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: step >= Number(n) ? 'var(--text)' : 'var(--text-muted)' }}>{label}</span>
              {i === 0 && <div style={{ width: 32, height: 1, background: 'var(--border)' }} />}
            </div>
          ))}
        </div>

        <div className="card">
          {step === 1 && (
            <>
              <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Choisissez votre mot de passe</h3>
              <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8, marginBottom: 20, fontSize: 12, color: 'var(--text-muted)' }}>
                Le mot de passe doit contenir : <strong>8 caractères minimum</strong>, <strong>une majuscule</strong>, <strong>un chiffre</strong>.
              </div>

              <div className="form-group">
                <label className="form-label">Nouveau mot de passe</label>
                <div style={{ position: 'relative' }}>
                  <input className="form-input" type={showNew ? 'text' : 'password'}
                    value={pwd.nouveau} onChange={e => setPwd(p => ({ ...p, nouveau: e.target.value }))}
                    style={{ paddingRight: 42 }} />
                  <button type="button" onClick={() => setShowNew(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {pwd.nouveau && (
                  <div style={{ marginTop: 6, fontSize: 12, color: pwdErr ? 'var(--danger)' : 'var(--success)' }}>
                    {pwdErr ? `⚠ ${pwdErr}` : '✓ Mot de passe valide'}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Confirmer</label>
                <div style={{ position: 'relative' }}>
                  <input className="form-input" type={showConf ? 'text' : 'password'}
                    value={pwd.confirmation} onChange={e => setPwd(p => ({ ...p, confirmation: e.target.value }))}
                    style={{ paddingRight: 42 }} />
                  <button type="button" onClick={() => setShowConf(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                    {showConf ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {pwd.confirmation && pwd.nouveau !== pwd.confirmation && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--danger)' }}>⚠ Les mots de passe ne correspondent pas</div>
                )}
              </div>

              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                onClick={savePassword} disabled={saving || !!pwdErr || !pwd.nouveau}>
                {saving ? <span className="spinner" /> : null}
                Continuer <ArrowRight size={15} />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Vos informations</h3>
              <div style={{ padding: '10px 14px', background: 'var(--warning-dim)', borderLeft: '4px solid var(--warning)', borderRadius: 4, marginBottom: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                Ces informations sont celles que vous avez fournies lors de votre demande. Pour toute modification, contactez-nous au <strong>06 67 33 70 73</strong>.
              </div>

              <div className="form-group">
                <label className="form-label">Nom complet *</label>
                <input className="form-input" value={profil.nom} readOnly style={{ background: "var(--bg-elevated)", cursor: "not-allowed" }} />
              </div>
              <div className="flex gap-3">
                <div className="form-group flex-1">
                  <label className="form-label">Téléphone</label>
                  <input className="form-input" value={profil.telephone} readOnly style={{ background: "var(--bg-elevated)", cursor: "not-allowed" }} />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Adresse</label>
                  <input className="form-input" value={profil.adresse} readOnly style={{ background: "var(--bg-elevated)", cursor: "not-allowed" }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Ville</label>
                <input className="form-input" value={profil.ville} readOnly style={{ background: "var(--bg-elevated)", cursor: "not-allowed" }} />
              </div>
              <div className="form-group">
                <label className="form-label">Nom de la société</label>
                <input className="form-input" value={profil.nom_societe} readOnly style={{ background: "var(--bg-elevated)", cursor: "not-allowed" }} />
              </div>
              <div className="flex gap-3">
                <div className="form-group flex-1">
                  <label className="form-label">ICE</label>
                  <input className="form-input" value={profil.ice} readOnly style={{ background: "var(--bg-elevated)", cursor: "not-allowed" }} />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Activité</label>
                  <select className="form-select" value={profil.activite} onChange={e => setProfil(p => ({ ...p, activite: e.target.value }))}>
                    <option value="">-- Sélectionner --</option>
                    {activites.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              {profil.activite === 'Autre' && (
                <div className="form-group">
                  <label className="form-label">Préciser</label>
                  <input className="form-input" value={profil.activite_autre} onChange={e => setProfil(p => ({ ...p, activite_autre: e.target.value }))} />
                </div>
              )}

              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                onClick={saveProfil} disabled={saving}>
                {saving ? <span className="spinner" /> : null}
                Continuer <ArrowRight size={15} />
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Adresses de livraison</h3>
              <p className="text-muted" style={{ fontSize: 13, marginBottom: 20 }}>
                Ajoutez vos adresses de livraison. Vous pourrez en ajouter d'autres plus tard.
              </p>

              {adresses.map((adr, i) => (
                <div key={i} style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 8, marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: 'var(--accent)' }}>Adresse {i + 1}</div>
                  <div className="form-group">
                    <label className="form-label">Nom / Label *</label>
                    <input className="form-input" placeholder="Ex: Dépôt principal, Magasin centre..."
                      value={adr.label} onChange={e => setAdresses(prev => prev.map((a, j) => j === i ? { ...a, label: e.target.value } : a))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Adresse complète *</label>
                    <input className="form-input" placeholder="Ex: N° 12 Rue Hassan II"
                      value={adr.adresse} onChange={e => setAdresses(prev => prev.map((a, j) => j === i ? { ...a, adresse: e.target.value } : a))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ville</label>
                    <input className="form-input" placeholder="Ex: Zemamra"
                      value={adr.ville} onChange={e => setAdresses(prev => prev.map((a, j) => j === i ? { ...a, ville: e.target.value } : a))} />
                  </div>
                  {adresses.length > 1 && (
                    <button className="btn btn-danger btn-sm" onClick={() => setAdresses(prev => prev.filter((_, j) => j !== i))}>
                      Supprimer
                    </button>
                  )}
                </div>
              ))}

              <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}
                onClick={() => setAdresses(prev => [...prev, { label: '', adresse: '', ville: '' }])}>
                + Ajouter une adresse
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}
                  onClick={saveAdresses} disabled={saving}>
                  Passer cette étape
                </button>
                <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}
                  onClick={saveAdresses} disabled={saving}>
                  {saving ? <span className="spinner" /> : <Check size={15} />}
                  Accéder à mon espace
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

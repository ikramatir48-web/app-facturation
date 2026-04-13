import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import toast from 'react-hot-toast'
import { Check, Eye, EyeOff, User, Lock, MapPin, Plus, Trash2 } from 'lucide-react'

function cap(str) {
  if (!str) return str
  return str.replace(/\b\w/g, c => c.toUpperCase())
}

export default function ClientParametres() {
  const { profile, fetchProfile } = useAuth()
  const [tab, setTab] = useState('profil')
  const [saving, setSaving] = useState(false)
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const isReadOnly = profile?.statut_compte === 'actif'
  const [adresses, setAdresses] = useState([])
  const [showNewAdr, setShowNewAdr] = useState(false)
  const [newAdr, setNewAdr] = useState({ label: '', adresse: '', ville: '' })
  const [savingAdr, setSavingAdr] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [searchTimeout, setSearchTimeout] = useState(null)

  useEffect(() => { loadAdresses() }, [profile?.id])

  async function loadAdresses() {
    if (!profile?.id) return
    const { data } = await supabase.from('adresses_livraison').select('*').eq('client_id', profile.id).order('created_at')
    setAdresses(data || [])
  }

  async function searchAddress(query) {
    if (query.length < 3) { setSuggestions([]); return }
    if (searchTimeout) clearTimeout(searchTimeout)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ma&limit=5`)
        const data = await res.json()
        setSuggestions(data)
      } catch(e) { setSuggestions([]) }
    }, 400)
    setSearchTimeout(t)
  }

  async function addAdresse() {
    if (!newAdr.label.trim() || !newAdr.adresse.trim()) { toast.error('Nom et adresse obligatoires'); return }
    setSavingAdr(true)
    const { data, error } = await supabase.from('adresses_livraison').insert({ client_id: profile.id, ...newAdr }).select().single()
    if (error) { toast.error(error.message) } else {
      setAdresses(prev => [...prev, data])
      setNewAdr({ label: '', adresse: '', ville: '' })
      setShowNewAdr(false)
      toast.success('Adresse ajoutée !')
    }
    setSavingAdr(false)
  }

  async function deleteAdresse(id) {
    if (!confirm('Supprimer cette adresse ?')) return
    await supabase.from('adresses_livraison').delete().eq('id', id)
    setAdresses(prev => prev.filter(a => a.id !== id))
    toast.success('Adresse supprimée')
  }

  async function setDefault(id) {
    await supabase.from('adresses_livraison').update({ is_default: false }).eq('client_id', profile.id)
    await supabase.from('adresses_livraison').update({ is_default: true }).eq('id', id)
    setAdresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })))
    toast.success('Adresse par défaut définie')
  }

  const [profil, setProfil] = useState({
    nom: profile?.nom || '',
    telephone: profile?.telephone || '',
    adresse: profile?.adresse || '',
    ville: profile?.ville || '',
    nom_societe: profile?.nom_societe || '',
    ice: profile?.ice || '',
  })

  const [pwd, setPwd] = useState({ ancien: '', nouveau: '', confirmation: '' })

  function validatePassword(p) {
    if (p.length < 8) return 'Au moins 8 caractères'
    if (!/[A-Z]/.test(p)) return 'Au moins une majuscule'
    if (!/[0-9]/.test(p)) return 'Au moins un chiffre'
    return null
  }

  async function saveProfil() {
    if (!profil.nom.trim()) { toast.error('Le nom est obligatoire'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update({
        nom: profil.nom,
        telephone: profil.telephone || null,
        adresse: profil.adresse || null,
        ville: profil.ville || null,
        nom_societe: profil.nom_societe || null,
        ice: profil.ice || null,
      }).eq('id', profile.id)
      if (error) throw error
      await fetchProfile(profile.id)
      toast.success('Profil mis à jour')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function savePassword() {
    const err = validatePassword(pwd.nouveau)
    if (err) { toast.error(err); return }
    if (pwd.nouveau !== pwd.confirmation) { toast.error('Les mots de passe ne correspondent pas'); return }
    setSaving(true)
    try {
      // Vérifier l'ancien mot de passe
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: profile.email, password: pwd.ancien
      })
      if (signInErr) { toast.error('Ancien mot de passe incorrect'); setSaving(false); return }

      const { error } = await supabase.auth.updateUser({ password: pwd.nouveau })
      if (error) throw error

      // Marquer que le mot de passe a été changé
      await supabase.from('profiles').update({ force_password_change: false, password_changed: true }).eq('id', profile.id)

      toast.success('Mot de passe mis à jour !')
      setPwd({ ancien: '', nouveau: '', confirmation: '' })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const pwdStrength = pwd.nouveau ? validatePassword(pwd.nouveau) : null

  return (
    <div>
      <div className="page-header">
        <h2>Paramètres</h2>
        <p>Gérez votre profil et votre mot de passe.</p>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('profil')} className={`btn btn-sm ${tab === 'profil' ? 'btn-primary' : 'btn-ghost'}`}>
          <User size={13} /> Mon profil
        </button>
        <button onClick={() => setTab('securite')} className={`btn btn-sm ${tab === 'securite' ? 'btn-primary' : 'btn-ghost'}`}>
          <Lock size={13} /> Sécurité
        </button>
        <button onClick={() => setTab('adresses')} className={`btn btn-sm ${tab === 'adresses' ? 'btn-primary' : 'btn-ghost'}`}>
          <MapPin size={13} /> Adresses
        </button>

      </div>

      {tab === 'profil' && (
        <div className="card" style={{ maxWidth: 520 }}>
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Informations personnelles</h3>
          {isReadOnly && (
            <div style={{ padding: '12px 16px', background: 'var(--warning-dim)', borderLeft: '4px solid var(--warning)', borderRadius: 4, marginBottom: 20, fontSize: 13 }}>
              <strong style={{ color: 'var(--warning)' }}>Informations verrouillées</strong>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>
                Pour modifier vos informations, contactez-nous au <strong>06 67 33 70 73</strong>.
              </p>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Nom complet *</label>
            <input className="form-input" value={profil.nom} readOnly={isReadOnly} onChange={e => !isReadOnly && setProfil(p => ({ ...p, nom: e.target.value }))} onBlur={e => !isReadOnly && setProfil(p => ({ ...p, nom: cap(e.target.value) }))} style={isReadOnly ? { background: "var(--bg-elevated)", cursor: "not-allowed" } : {}} />
          </div>
          <div className="form-group">
            <label className="form-label">Téléphone</label>
            <input className="form-input" value={profil.telephone} readOnly={isReadOnly} onChange={e => !isReadOnly && setProfil(p => ({ ...p, telephone: e.target.value }))} style={isReadOnly ? { background: "var(--bg-elevated)", cursor: "not-allowed" } : {}} />
          </div>
          <div className="form-group">
            <label className="form-label">Adresse</label>
            <input className="form-input" value={profil.adresse} readOnly={isReadOnly} onChange={e => !isReadOnly && setProfil(p => ({ ...p, adresse: e.target.value }))} style={isReadOnly ? { background: "var(--bg-elevated)", cursor: "not-allowed" } : {}} />
          </div>
          <div className="form-group">
            <label className="form-label">Ville</label>
            <input className="form-input" placeholder="Ex: Zemamra" value={profil.ville} readOnly={isReadOnly} onChange={e => !isReadOnly && setProfil(p => ({ ...p, ville: e.target.value }))} style={isReadOnly ? { background: "var(--bg-elevated)", cursor: "not-allowed" } : {}} />
          </div>

          <div className="divider" />
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 12, fontWeight: 600 }}>Société</div>

          <div className="form-group">
            <label className="form-label">Nom de la société</label>
            <input className="form-input" value={profil.nom_societe} readOnly={isReadOnly} onChange={e => !isReadOnly && setProfil(p => ({ ...p, nom_societe: e.target.value }))} onBlur={e => !isReadOnly && setProfil(p => ({ ...p, nom_societe: cap(e.target.value) }))} style={isReadOnly ? { background: "var(--bg-elevated)", cursor: "not-allowed" } : {}} />
          </div>
          <div className="form-group">
            <label className="form-label">ICE</label>
            <input className="form-input" value={profil.ice} readOnly={isReadOnly} onChange={e => !isReadOnly && setProfil(p => ({ ...p, ice: e.target.value }))} style={isReadOnly ? { background: "var(--bg-elevated)", cursor: "not-allowed" } : {}} />
          </div>

          {!isReadOnly && (
            <button className="btn btn-primary" onClick={saveProfil} disabled={saving}>
              {saving ? <span className="spinner" /> : <Check size={14} />} Enregistrer
            </button>
          )}
        </div>
      )}

      {tab === 'adresses' && (
        <div className="card" style={{ maxWidth: 520 }}>
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Mes adresses de livraison</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Ces adresses seront utilisées lors de vos commandes.
          </p>

          {adresses.length === 0 && !showNewAdr && (
            <div style={{ padding: '16px', background: 'var(--warning-dim)', borderLeft: '4px solid var(--warning)', borderRadius: 4, marginBottom: 16, fontSize: 13 }}>
              <strong style={{ color: 'var(--warning)' }}>Aucune adresse enregistrée</strong>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>Vous devez ajouter au moins une adresse pour passer une commande.</p>
            </div>
          )}

          {adresses.map(a => (
            <div key={a.id} style={{ padding: '12px 14px', border: `1px solid ${a.is_default ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, marginBottom: 10, background: a.is_default ? 'var(--accent-dim)' : 'transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    📍 {a.label}
                    {a.is_default && <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--accent)', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>PAR DÉFAUT</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{a.adresse}{a.ville ? `, ${a.ville}` : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {!a.is_default && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setDefault(a.id)} title="Définir par défaut">
                      ⭐
                    </button>
                  )}
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(a.adresse + (a.ville ? ' ' + a.ville : '') + ' Maroc')}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" title="Voir sur la carte">
                    🗺️
                  </a>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => deleteAdresse(a.id)}>
                    <Trash2 size={13} style={{ color: 'var(--danger)' }} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {showNewAdr ? (
            <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 8, marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label">Nom / Label *</label>
                <input className="form-input" placeholder="Ex: Dépôt principal, Magasin..." value={newAdr.label} onChange={e => setNewAdr(p => ({ ...p, label: e.target.value }))} />
              </div>
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Adresse *</label>
                <input className="form-input" value={newAdr.adresse}
                  onChange={e => { setNewAdr(p => ({ ...p, adresse: e.target.value })); searchAddress(e.target.value) }}
                  placeholder="Tapez votre adresse..." autoComplete="off" />
                {suggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                    {suggestions.map((s, i) => (
                      <div key={i} onClick={() => {
                        const parts = s.display_name.split(',')
                        setNewAdr(p => ({ ...p, adresse: parts.slice(0, 2).join(',').trim(), ville: parts[parts.length - 3]?.trim() || '' }))
                        setSuggestions([])
                      }} style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border)', color: 'var(--text)' }}
                        onMouseEnter={e => e.target.style.background = 'var(--bg-elevated)'}
                        onMouseLeave={e => e.target.style.background = 'transparent'}>
                        📍 {s.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Ville</label>
                <input className="form-input" value={newAdr.ville} onChange={e => setNewAdr(p => ({ ...p, ville: e.target.value }))} />
              </div>
              {newAdr.adresse && (
                <div style={{ marginBottom: 12 }}>
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(newAdr.adresse + ' ' + newAdr.ville + ' Maroc')}`}
                    target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: 'var(--accent)' }}>
                    🗺️ Vérifier sur Google Maps →
                  </a>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => { setShowNewAdr(false); setSuggestions([]) }}>Annuler</button>
                <button className="btn btn-primary" onClick={addAdresse} disabled={savingAdr}>
                  {savingAdr ? <span className="spinner" /> : <Check size={13} />} Enregistrer
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-ghost" onClick={() => setShowNewAdr(true)}>
              <Plus size={13} /> Ajouter une adresse
            </button>
          )}
        </div>
      )}

      {tab === 'securite' && (
        <div className="card" style={{ maxWidth: 520 }}>
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Changer le mot de passe</h3>
          <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8, marginBottom: 20, fontSize: 12, color: 'var(--text-muted)' }}>
            Le mot de passe doit contenir : <strong>8 caractères minimum</strong>, <strong>une majuscule</strong>, <strong>un chiffre</strong>.
          </div>

          <div className="form-group">
            <label className="form-label">Mot de passe actuel</label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" type={showOld ? 'text' : 'password'} value={pwd.ancien}
                onChange={e => setPwd(p => ({ ...p, ancien: e.target.value }))} style={{ paddingRight: 42 }} />
              <button type="button" onClick={() => setShowOld(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Nouveau mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" type={showNew ? 'text' : 'password'} value={pwd.nouveau}
                onChange={e => setPwd(p => ({ ...p, nouveau: e.target.value }))} style={{ paddingRight: 42 }} />
              <button type="button" onClick={() => setShowNew(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {pwd.nouveau && (
              <div style={{ marginTop: 6, fontSize: 12, color: pwdStrength ? 'var(--danger)' : 'var(--success)' }}>
                {pwdStrength ? `⚠ ${pwdStrength}` : '✓ Mot de passe valide'}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Confirmer le nouveau mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" type={showConf ? 'text' : 'password'} value={pwd.confirmation}
                onChange={e => setPwd(p => ({ ...p, confirmation: e.target.value }))} style={{ paddingRight: 42 }} />
              <button type="button" onClick={() => setShowConf(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showConf ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {pwd.confirmation && pwd.nouveau !== pwd.confirmation && (
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--danger)' }}>⚠ Les mots de passe ne correspondent pas</div>
            )}
          </div>

          <button className="btn btn-primary" onClick={savePassword} disabled={saving || !!pwdStrength || !pwd.ancien}>
            {saving ? <span className="spinner" /> : <Lock size={14} />} Mettre à jour
          </button>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import toast from 'react-hot-toast'
import { MapPin, Plus, Trash2, Check, Star } from 'lucide-react'

export default function ClientAdresses() {
  const { profile } = useAuth()
  const [adresses, setAdresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ label: '', adresse: '', ville: '' })
  const [suggestions, setSuggestions] = useState([])
  const [mapCoords, setMapCoords] = useState(null)
  const searchRef = useRef(null)
  const mapRef = useRef(null)
  const leafletMapRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => { loadAdresses() }, [profile?.id])

  async function loadAdresses() {
    if (!profile?.id) return
    const { data } = await supabase.from('adresses_livraison').select('*').eq('client_id', profile.id).order('created_at')
    setAdresses(data || [])
    setLoading(false)
  }

  // Init Leaflet map
  useEffect(() => {
    if (!showForm || !mapRef.current) return
    if (leafletMapRef.current) return // déjà initialisée

    import('leaflet').then(L => {
      // Fix icônes Leaflet
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current).setView([32.0, -6.0], 6)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map)

      leafletMapRef.current = map

      map.on('click', async (e) => {
        const { lat, lng } = e.latlng
        if (markerRef.current) markerRef.current.remove()
        markerRef.current = L.marker([lat, lng]).addTo(map)
        setMapCoords({ lat, lng })

        // Reverse geocoding
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          const data = await res.json()
          const adr = data.address
          const adresse = [adr.road, adr.house_number].filter(Boolean).join(' ') || data.display_name.split(',')[0]
          const ville = adr.city || adr.town || adr.village || adr.county || ''
          setForm(p => ({ ...p, adresse, ville }))
        } catch(e) {}
      })
    })
  }, [showForm])

  // Cleanup map on close
  function closeForm() {
    if (leafletMapRef.current) {
      leafletMapRef.current.remove()
      leafletMapRef.current = null
      markerRef.current = null
    }
    setShowForm(false)
    setForm({ label: '', adresse: '', ville: '' })
    setSuggestions([])
    setMapCoords(null)
  }

  async function searchAddress(query) {
    if (query.length < 3) { setSuggestions([]); return }
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' Maroc')}&limit=5`)
        const data = await res.json()
        setSuggestions(data)
      } catch(e) { setSuggestions([]) }
    }, 400)
  }

  async function selectSuggestion(s) {
    const parts = s.display_name.split(',')
    const adresse = parts.slice(0, 2).join(',').trim()
    const ville = parts[parts.length - 3]?.trim() || ''
    setForm(p => ({ ...p, adresse, ville }))
    setSuggestions([])

    // Centrer la carte sur la suggestion
    if (leafletMapRef.current) {
      import('leaflet').then(L => {
        const lat = parseFloat(s.lat)
        const lng = parseFloat(s.lon)
        leafletMapRef.current.setView([lat, lng], 15)
        if (markerRef.current) markerRef.current.remove()
        markerRef.current = L.marker([lat, lng]).addTo(leafletMapRef.current)
        setMapCoords({ lat, lng })
      })
    }
  }

  async function saveAdresse() {
    if (!form.label.trim()) { toast.error('Le nom est obligatoire'); return }
    if (!form.adresse.trim()) { toast.error("L'adresse est obligatoire"); return }
    setSaving(true)
    const isFirst = adresses.length === 0
    const { data, error } = await supabase.from('adresses_livraison').insert({
      client_id: profile.id,
      label: form.label,
      adresse: form.adresse,
      ville: form.ville,
      latitude: mapCoords?.lat || null,
      longitude: mapCoords?.lng || null,
      is_default: isFirst,
    }).select().single()
    if (error) { toast.error(error.message); setSaving(false); return }
    setAdresses(prev => [...prev, data])
    toast.success('Adresse ajoutée !')
    closeForm()
    setSaving(false)
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

  return (
    <div>
      {/* Leaflet CSS */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Mes adresses de livraison</h2>
          <p>Gérez vos adresses pour vos commandes.</p>
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={14} /> Ajouter une adresse
          </button>
        )}
      </div>

      {/* Formulaire ajout avec carte */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Nouvelle adresse</h3>

          <div className="form-group">
            <label className="form-label">Nom / Label *</label>
            <input className="form-input" placeholder="Ex: Dépôt principal, Magasin centre..."
              value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} />
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Adresse *</label>
            <input className="form-input" value={form.adresse} autoComplete="off"
              placeholder="Tapez ou cliquez sur la carte..."
              onChange={e => { setForm(p => ({ ...p, adresse: e.target.value })); searchAddress(e.target.value) }} />
            {suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                {suggestions.map((s, i) => (
                  <div key={i} onClick={() => selectSuggestion(s)}
                    style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 12, borderBottom: i < suggestions.length-1 ? '1px solid var(--border)' : 'none', color: 'var(--text)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    📍 {s.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Ville</label>
            <input className="form-input" value={form.ville} onChange={e => setForm(p => ({ ...p, ville: e.target.value }))} />
          </div>

          {/* Carte Leaflet */}
          <div style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>
              Localisation sur la carte <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(cliquez pour préciser)</span>
            </label>
            <div ref={mapRef} style={{ height: 300, borderRadius: 8, border: '1px solid var(--border)', zIndex: 1 }} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" onClick={closeForm}>Annuler</button>
            <button className="btn btn-primary" onClick={saveAdresse} disabled={saving}>
              {saving ? <span className="spinner" /> : <Check size={14} />} Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* Liste adresses */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : adresses.length === 0 && !showForm ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <MapPin size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Aucune adresse enregistrée</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Ajoutez une adresse de livraison pour passer vos commandes.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={14} /> Ajouter une adresse
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {adresses.map(a => (
            <div key={a.id} className="card" style={{ border: `2px solid ${a.is_default ? 'var(--accent)' : 'var(--border)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                    📍 {a.label}
                    {a.is_default && (
                      <span style={{ fontSize: 11, background: 'var(--accent)', color: '#fff', padding: '2px 8px', borderRadius: 20 }}>
                        Par défaut
                      </span>
                    )}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                    {a.adresse}{a.ville ? `, ${a.ville}` : ''}
                  </div>
                  {a.latitude && a.longitude && (
                    <a href={`https://maps.google.com/?q=${a.latitude},${a.longitude}`}
                      target="_blank" rel="noreferrer"
                      style={{ fontSize: 12, color: 'var(--accent)', marginTop: 6, display: 'inline-block' }}>
                      🗺️ Voir sur Google Maps →
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!a.is_default && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setDefault(a.id)} title="Définir par défaut">
                      <Star size={13} /> Par défaut
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => deleteAdresse(a.id)}>
                    <Trash2 size={13} style={{ color: 'var(--danger)' }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

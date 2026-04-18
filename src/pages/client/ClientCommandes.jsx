import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { X, Plus } from 'lucide-react'
import { PrintBL, PrintBC } from '../../components/shared/PrintDocs.jsx'
import toast from 'react-hot-toast'
import { useNavigate, useLocation } from 'react-router-dom'

function StatutBadge({ statut }) {
  const map = {
    en_attente: ['badge-yellow', '⏳ En attente'],
    validee:    ['badge-blue',   '✓ Confirmée'],
    livree:     ['badge-green',  '✓ Livrée'],
    annulee:    ['badge-red',    '✕ Annulée'],
  }
  const [cls, label] = map[statut] || ['badge-gray', statut]
  return <span className={`badge ${cls}`}>{label}</span>
}

export default function ClientCommandes() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [commandes, setCommandes]         = useState([])
  const [loading, setLoading]             = useState(true)
  const [selected, setSelected]           = useState(null)
  const [printDoc, setPrintDoc]           = useState(null)
  const [adresses, setAdresses]           = useState([])
  const [filterAdresse, setFilterAdresse] = useState('')
  const [filterPaiement, setFilterPaiement] = useState('')
  const [viewMode, setViewMode]           = useState('liste') // liste | stats
  const [selectedAdresseStats, setSelectedAdresseStats] = useState(null) // adresse cliquée dans stats
  const [statsDateDebut, setStatsDateDebut] = useState('')
  const [statsDateFin, setStatsDateFin]   = useState('')
  const [filterDateDebut, setFilterDateDebut] = useState('')
  const [filterDateFin, setFilterDateFin]   = useState('')
  const [sortListe, setSortListe]           = useState('desc')

  useEffect(() => {
    if (profile?.id) { load(); loadAdresses() }
  }, [profile?.id])

  async function loadAdresses() {
    if (!profile?.id) return
    const { data } = await supabase.from('adresses_livraison').select('*').eq('client_id', profile.id).order('label')
    setAdresses(data || [])
  }

  async function load() {
    const { data } = await supabase
      .from('commandes').select('*, adresse_livraison_id, statut_paiement')
      .eq('client_id', profile.id)
      .order('created_at', { ascending: false })
    setCommandes(data || [])
    setLoading(false)
  }

  async function openDetail(cmd) {
    const [lignesRes, blRes, cmdRes] = await Promise.all([
      supabase.from('lignes_commande').select('*, produits(nom)').eq('commande_id', cmd.id),
      supabase.from('bons_livraison').select('*').eq('commande_id', cmd.id).maybeSingle(),
      supabase.from('commandes').select('*, profiles(*)').eq('id', cmd.id).single(),
    ])
    let facture = null
    if (blRes.data) {
      const { data: f } = await supabase.from('factures').select('*').eq('bl_id', blRes.data.id).maybeSingle()
      facture = f
    }
    let livreur = null
    const livreurId = cmdRes.data?.livreur_id
    if (livreurId) {
      const { data: liv } = await supabase.from('livreurs').select('*').eq('id', livreurId).maybeSingle()
      livreur = liv
    }
    let adresse = null
    const adresseId = cmdRes.data?.adresse_livraison_id
    if (adresseId) {
      const { data: adr } = await supabase.from('adresses_livraison').select('*').eq('id', adresseId).maybeSingle()
      adresse = adr
    }
    setSelected({ cmd: cmdRes.data || cmd, lignes: lignesRes.data || [], bl: blRes.data, facture, livreur, adresse })
  }

  async function annulerCommande(cmd) {
    if (!confirm(`Annuler la commande ${cmd.numero_commande} ?`)) return
    if (cmd.statut !== 'en_attente') { toast.error('Vous ne pouvez annuler que les commandes en attente.'); return }
    const { error } = await supabase.from('commandes').update({ statut: 'annulee' }).eq('id', cmd.id).eq('client_id', profile.id)
    if (error) { toast.error(`Impossible d'annuler : ${error.message}`); return }
    toast.success('Commande annulée')
    load()
    setSelected(null)
  }

  async function openPrintBL(bl, cmd, lignes) {
    let livreur = null
    const { data: cmdData } = await supabase.from('commandes').select('livreur_id').eq('id', cmd.id).maybeSingle()
    const livreurId = cmdData?.livreur_id || selected?.livreur?.id
    if (livreurId) {
      const { data: liv } = await supabase.from('livreurs').select('*').eq('id', livreurId).maybeSingle()
      livreur = liv
    }
    setPrintDoc({ type: 'bl', bl, commande: cmd, lignes, client: profile, livreur, adresse: selected?.adresse })
  }

  async function openPrintBC(cmd, lignes) {
    let finalLignes = lignes || []
    if (!finalLignes.length) {
      const { data } = await supabase.from('lignes_commande').select('*, produits(nom)').eq('commande_id', cmd.id)
      finalLignes = data || []
    }
    setPrintDoc({ type: 'bc', commande: cmd, lignes: finalLignes, client: profile })
  }

  const steps = [
    { key: 'en_attente', label: 'Commande enregistrée', icon: '📝' },
    { key: 'validee',    label: 'Confirmée',             icon: '✅' },
    { key: 'livree',     label: 'Livrée',                icon: '🚚' },
  ]

  function getStepState(cmd, stepKey) {
    const order = ['en_attente', 'validee', 'livree']
    const cmdIdx = order.indexOf(cmd.statut)
    const stepIdx = order.indexOf(stepKey)
    if (cmd.statut === 'annulee') return 'pending'
    if (stepIdx < cmdIdx) return 'done'
    if (stepIdx === cmdIdx) return 'active'
    return 'pending'
  }

  const commandesFiltrees = commandes
    .filter(c => !filterAdresse || c.adresse_livraison_id === filterAdresse)
    .filter(c => !filterPaiement || c.statut_paiement === filterPaiement)
    .filter(c => !filterDateDebut || (c.created_at||'').slice(0,10) >= filterDateDebut)
    .filter(c => !filterDateFin   || (c.created_at||'').slice(0,10) <= filterDateFin)
    .sort((a,b) => sortListe === 'asc' ? new Date(a.created_at)-new Date(b.created_at) : new Date(b.created_at)-new Date(a.created_at))

  return (
    <div>
      {/* EN-TÊTE */}
      <div className="flex items-center justify-between page-header">
        <div>
          <h2>Mes commandes</h2>
          <p>Suivez vos commandes en temps réel.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-sm ${viewMode === 'stats' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode(viewMode === 'stats' ? 'liste' : 'stats')}
          >
            📊 Stats par adresse
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/client/nouvelle-commande')}>
            <Plus size={15} /> Nouvelle commande
          </button>
        </div>
      </div>

      {/* VUE STATS */}
      {viewMode === 'stats' && (
        <div className="stats-adresse-grid" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Cartes adresses */}
          <div>
            {/* Filtre période */}
            <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="date" className="form-input" style={{ fontSize: 12, padding: '4px 8px', width: 'auto' }}
                value={statsDateDebut} onChange={e => setStatsDateDebut(e.target.value)} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>→</span>
              <input type="date" className="form-input" style={{ fontSize: 12, padding: '4px 8px', width: 'auto' }}
                value={statsDateFin} onChange={e => setStatsDateFin(e.target.value)} />
              {(statsDateDebut || statsDateFin) && (
                <button className="btn btn-ghost btn-sm" onClick={() => { setStatsDateDebut(''); setStatsDateFin('') }}>✕</button>
              )}
            </div>

            {adresses.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                Aucune adresse enregistrée
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                {adresses.map(a => {
                  let cmdsAdresse = commandes.filter(c => c.adresse_livraison_id === a.id)
                  if (statsDateDebut) cmdsAdresse = cmdsAdresse.filter(c => c.created_at >= statsDateDebut)
                  if (statsDateFin)   cmdsAdresse = cmdsAdresse.filter(c => c.created_at <= statsDateFin + 'T23:59:59')
                  const total = cmdsAdresse.length
                  const isSelected = selectedAdresseStats?.id === a.id
                  return (
                    <div key={a.id} className="card" onClick={() => setSelectedAdresseStats(isSelected ? null : a)}
                      style={{ cursor: 'pointer', border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`, background: isSelected ? 'var(--accent-dim)' : 'var(--bg-card)', padding: 18, minHeight: 90, borderRadius: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: isSelected ? 'var(--accent)' : 'var(--text)' }}>📍 {a.label}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            {a.adresse}{a.ville ? `, ${a.ville}` : ''}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: 24, color: 'var(--accent)' }}>{total}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>commande{total > 1 ? 's' : ''}</div>
                        </div>
                      </div>
                      {total > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {[['en_attente','⏳','badge-yellow'],['validee','✓','badge-blue'],['livree','🚚','badge-green']].map(([s,l,cls]) => {
                            const n = cmdsAdresse.filter(c => c.statut === s).length
                            return n > 0 ? <span key={s} className={`badge ${cls}`} style={{ fontSize: 11 }}>{l} {n}</span> : null
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Liste commandes de l'adresse sélectionnée — affichée EN DESSOUS */}
          {selectedAdresseStats && (
            <div style={{ borderTop: '2px solid var(--accent)', paddingTop: 16 }}>
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontWeight: 700, fontSize: 15 }}>📍 {selectedAdresseStats.label}</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedAdresseStats(null)}>✕ Fermer</button>
              </div>

              {/* Filtres commandes */}
              <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select className="form-select" style={{ fontSize: 12, padding: '4px 8px', width: 'auto' }}
                  value={filterPaiement} onChange={e => setFilterPaiement(e.target.value)}>
                  <option value="">💳 Tout</option>
                  <option value="paye">✅ Payé</option>
                  <option value="non_paye">⏳ Non payé</option>
                </select>
                {filterPaiement && <button className="btn btn-ghost btn-sm" onClick={() => setFilterPaiement('')}>✕</button>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {commandes
                  .filter(c => c.adresse_livraison_id === selectedAdresseStats.id)
                  .filter(c => !statsDateDebut || c.created_at >= statsDateDebut)
                  .filter(c => !statsDateFin || c.created_at <= statsDateFin + 'T23:59:59')
                  .filter(c => !filterPaiement || c.statut_paiement === filterPaiement)
                  .map(cmd => (
                    <div key={cmd.id} onClick={() => { setViewMode('liste'); openDetail(cmd) }}
                      style={{ padding: 14, background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span className="font-display" style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>{cmd.numero_commande}</span>
                        <StatutBadge statut={cmd.statut} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                        <span>{format(new Date(cmd.created_at), 'dd/MM/yyyy')}</span>
                        <span>{cmd.statut_paiement === 'paye' ? '✅ Payé' : '⏳ Non payé'}</span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* VUE LISTE */}
      {viewMode === 'liste' && (
        <div>
          {/* Filtres */}
          <div style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {adresses.length > 1 && (
              <select className="form-select" style={{ fontSize: 13, padding: '4px 10px', width: 'auto' }}
                value={filterAdresse} onChange={e => setFilterAdresse(e.target.value)}>
                <option value="">📍 Toutes les adresses</option>
                {adresses.map(a => <option key={a.id} value={a.id}>📍 {a.label}</option>)}
              </select>
            )}
            <select className="form-select" style={{ fontSize: 13, padding: '4px 10px', width: 'auto' }}
              value={filterPaiement} onChange={e => setFilterPaiement(e.target.value)}>
              <option value="">💳 Tout</option>
              <option value="paye">✅ Payé</option>
              <option value="non_paye">⏳ Non payé</option>
            </select>
            <input type="date" className="form-input" style={{ fontSize: 13, padding: '4px 8px', width: 'auto' }}
              value={filterDateDebut} onChange={e => setFilterDateDebut(e.target.value)} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>→</span>
            <input type="date" className="form-input" style={{ fontSize: 13, padding: '4px 8px', width: 'auto' }}
              value={filterDateFin} onChange={e => setFilterDateFin(e.target.value)} />
            <select className="form-select" style={{ fontSize: 13, padding: '4px 8px', width: 'auto' }}
              value={sortListe} onChange={e => setSortListe(e.target.value)}>
              <option value="desc">⬇ Plus récentes</option>
              <option value="asc">⬆ Plus anciennes</option>
            </select>
            {(filterAdresse || filterPaiement || filterDateDebut || filterDateFin) && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setFilterAdresse(''); setFilterPaiement(''); setFilterDateDebut(''); setFilterDateFin('') }}>✕ Réinitialiser</button>
            )}
          </div>

          <div className={selected ? 'commandes-grid-split' : 'commandes-grid-full'}>
            {/* LISTE */}
            <div>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
              ) : commandesFiltrees.length === 0 ? (
                <div className="card"><div className="empty-state"><h3>Aucune commande</h3></div></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {commandesFiltrees.map(cmd => (
                    <div key={cmd.id} onClick={() => openDetail(cmd)} style={{
                      padding: '16px', background: 'var(--bg-card)', borderRadius: 12,
                      border: `1px solid ${selected?.cmd?.id === cmd.id ? 'var(--accent)' : 'var(--border)'}`,
                      cursor: 'pointer', transition: 'border-color 0.15s',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span className="font-display" style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 15 }}>
                          {cmd.numero_commande}
                        </span>
                        <StatutBadge statut={cmd.statut} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="text-muted" style={{ fontSize: 12 }}>
                          {format(new Date(cmd.created_at), 'dd/MM/yyyy')}
                        </span>
                        <span className="badge badge-gray" style={{ fontSize: 11 }}>
                          {cmd.mode_reglement === 'cheque' ? '📋 Chèque' : '💵 Espèces'}
                        </span>
                      </div>
                      {cmd.statut === 'en_attente' && (
                        <div className="flex gap-2" style={{ marginTop: 10 }} onClick={e => e.stopPropagation()}>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/client/nouvelle-commande', { state: { editCmd: cmd } })}>
                            Modifier
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => annulerCommande(cmd)}>
                            <X size={13} /> Annuler
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PANNEAU DÉTAIL */}
            {selected && (
              <div className="card" style={{ position: 'sticky', top: 20, alignSelf: 'start' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700 }}>{selected.cmd.numero_commande}</h3>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelected(null)}><X size={15} /></button>
                </div>

                {selected.cmd.statut === 'annulee' && (
                  <div style={{ padding: '8px 12px', background: 'var(--danger-dim)', borderRadius: 8, marginBottom: 12, fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>
                    ✕ Commande annulée
                  </div>
                )}

                {selected.cmd.statut !== 'annulee' && (
                  <div className="timeline mb-4">
                    {steps.map(step => {
                      const state = getStepState(selected.cmd, step.key)
                      return (
                        <div key={step.key} className="timeline-item">
                          <div className={`timeline-dot ${state}`}>{step.icon}</div>
                          <div style={{ paddingTop: 4 }}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{step.label}</div>
                            {step.key === 'en_attente' && (
                              <div className="text-muted text-sm">{format(new Date(selected.cmd.created_at), 'dd/MM/yyyy HH:mm')}</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 8 }}>Produits</div>
                {selected.lignes.map((l, i) => (
                  <div key={i} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{l.produits?.nom}</div>
                      <div className="text-muted text-sm">{Number(l.prix_unitaire).toFixed(2)} DH × {l.quantite}</div>
                    </div>
                    <div style={{ fontWeight: 700 }}>{(l.quantite * l.prix_unitaire).toFixed(2)} DH</div>
                  </div>
                ))}
                <div className="flex justify-between" style={{ padding: '12px 0 8px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>
                  <span>Total</span>
                  <span className="text-accent">{selected.lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0).toFixed(2)} DH</span>
                </div>

                <div style={{ padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
                  Règlement : <strong>{selected.cmd.mode_reglement === 'cheque' ? 'Chèque' : 'Espèces'}</strong>
                </div>

                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 8 }}>Documents</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selected.cmd.statut !== 'annulee' && (
                    <div className="flex items-center justify-between" style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>📋 Bon de commande</div>
                        <div className="text-muted text-sm">{selected.cmd.numero_commande}</div>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => openPrintBC(selected.cmd, selected.lignes)}>⬇ Télécharger</button>
                    </div>
                  )}

                  {selected.bl ? (
                    <div className="flex items-center justify-between" style={{ padding: '8px 12px', background: 'var(--info-dim)', borderRadius: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--info)', fontSize: 13 }}>📄 {selected.bl.numero_bl}</div>
                        <div className="text-muted text-sm">Bon de livraison</div>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => openPrintBL(selected.bl, selected.cmd, selected.lignes)}>⬇ Télécharger</button>
                    </div>
                  ) : selected.cmd.statut !== 'annulee' && (
                    <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                      BL disponible après livraison
                    </div>
                  )}

                  {selected.cmd.statut === 'livree' && (
                    <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                      La facture vous sera remise en main propre.
                    </div>
                  )}

                  {selected.cmd.statut === 'en_attente' && (
                    <button className="btn btn-danger btn-sm" style={{ justifyContent: 'center' }} onClick={() => annulerCommande(selected.cmd)}>
                      <X size={13} /> Annuler cette commande
                    </button>
                  )}

                  {['livree', 'annulee'].includes(selected.cmd.statut) && (
                    <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'center', marginTop: 4 }}
                      onClick={() => navigate('/client/nouvelle-commande', { state: { repasserCmd: { lignes: selected.lignes, adresseId: selected.cmd.adresse_livraison_id } } })}>
                      🔄 Repasser cette commande
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {printDoc?.type === 'bl' && <PrintBL {...printDoc} onClose={() => setPrintDoc(null)} />}
      {printDoc?.type === 'bc' && <PrintBC {...printDoc} onClose={() => setPrintDoc(null)} />}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Search, Settings, Check, X, FileText } from 'lucide-react'
import { PrintBL, PrintFacture } from '../../components/shared/PrintDocs.jsx'

export default function AdminFactures() {
  const [tab, setTab]                       = useState('factures')
  const [mentionModal, setMentionModal]     = useState(null)
  const [clients, setClients]               = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientSearch, setClientSearch]     = useState('')
  const [commandes, setCommandes]           = useState([])
  const [bls, setBls]                       = useState([])
  const [factures, setFactures]             = useState([])
  const [blsNonPayes, setBlsNonPayes]       = useState([])
  const [selectedBls, setSelectedBls]       = useState([])
  const [loading, setLoading]               = useState(false)
  const [tva, setTva]                       = useState(10)
  const [showTvaModal, setShowTvaModal]     = useState(false)
  const [printBL, setPrintBL]               = useState(null)
  const [printFact, setPrintFact]           = useState(null)
  const [periodeDebut, setPeriodeDebut]     = useState('')
  const [periodeFin, setPeriodeFin]         = useState('')
  const [adresses, setAdresses]             = useState([])
  const [selectedAdresse, setSelectedAdresse] = useState('')
  const [statsDateDebut, setStatsDateDebut]   = useState('')
  const [statsDateFin, setStatsDateFin]       = useState('')
  const [filterPaiementBL, setFilterPaiementBL] = useState('')
  const [filterPaiementCmd, setFilterPaiementCmd] = useState('')
  const [filterDateDebutCmd, setFilterDateDebutCmd] = useState('')
  const [filterDateFinCmd, setFilterDateFinCmd] = useState('')
  const [selectedAdresseStats, setSelectedAdresseStats] = useState(null)
  const [filterDateDebutFact, setFilterDateDebutFact] = useState('')
  const [filterDateFinFact, setFilterDateFinFact]     = useState('')
  const [sortFactures, setSortFactures]               = useState('desc') // desc | asc
  const [filterAdresseFact, setFilterAdresseFact]     = useState('')

  useEffect(() => { loadClients() }, [])
  useEffect(() => {
    if (selectedClient) {
      loadClientData(selectedClient.id)
      loadAdresses(selectedClient.id)
    }
  }, [selectedClient, tab])

  async function loadClients() {
    const { data } = await supabase
      .from('profiles')
      .select('id, nom, numero_client, telephone, adresse, email, ice, condition_paiement, condition_paiement_autre')
      .eq('role', 'client').order('nom')
    setClients(data || [])
  }

  async function loadAdresses(clientId) {
    const { data } = await supabase.from('adresses_livraison').select('*').eq('client_id', clientId).order('label')
    setAdresses(data || [])
  }

  async function loadClientData(clientId) {
    setLoading(true)
    setBls([]); setFactures([]); setCommandes([]); setBlsNonPayes([])
    setSelectedBls([])

    // Toujours charger les BLs et commandes (nécessaire pour stats)
    const { data: blsData } = await supabase
      .from('bons_livraison')
      .select('*, commandes(numero_commande, statut, mode_paiement, mode_reglement, client_id, statut_paiement, condition_paiement, adresse_livraison_id), factures(numero_facture, refs_bls)')
      .order('date_creation', { ascending: false })
    const blsFiltered = (blsData || []).filter(b => b.commandes?.client_id === clientId)
    setBls(blsFiltered)
    setBlsNonPayes(blsFiltered.filter(b =>
      b.commandes?.statut === 'livree' && (b.commandes?.statut_paiement === 'non_paye' || b.commandes?.statut_paiement === null)
    ))

    // Toujours charger les commandes (pour stats et onglet commandes)
    const { data: cmdsData } = await supabase
      .from('commandes')
      .select('*, lignes_commande(*, produits(nom))')
      .eq('client_id', clientId).order('created_at', { ascending: false })
    setCommandes(cmdsData || [])

    if (tab === 'factures') {
      const { data } = await supabase
        .from('factures')
        .select('*, bons_livraison(numero_bl), commandes(numero_commande, mode_paiement, mode_reglement, client_id, condition_paiement, statut_paiement)')
        .order('date_facture', { ascending: false })
      setFactures((data || []).filter(f => f.commandes?.client_id === clientId))
    }
    setLoading(false)
  }

  // BLs non payés filtrés selon tous les filtres actifs
  const blsNonPayesFiltres = blsNonPayes
    .filter(bl => !selectedAdresse || bl.commandes?.adresse_livraison_id === selectedAdresse)
    .filter(bl => !periodeDebut || (bl.date_creation||'').slice(0,10) >= periodeDebut)
    .filter(bl => !periodeFin   || (bl.date_creation||'').slice(0,10) <= periodeFin)

  async function openPrintBL(bl) {
    const { data: lignes }  = await supabase.from('lignes_commande').select('*, produits(nom)').eq('commande_id', bl.commande_id)
    const { data: cmdData } = await supabase.from('commandes').select('livreur_id, adresse_livraison_id').eq('id', bl.commande_id).maybeSingle()

    let livreur = null
    if (cmdData?.livreur_id) {
      const { data: liv } = await supabase.from('livreurs').select('*').eq('id', cmdData.livreur_id).maybeSingle()
      livreur = liv
    }

    let adresse = null
    if (cmdData?.adresse_livraison_id) {
      const { data: adr } = await supabase.from('adresses_livraison').select('*').eq('id', cmdData.adresse_livraison_id).maybeSingle()
      adresse = adr
    }

    setPrintBL({ bl, commande: bl.commandes, lignes: lignes || [], client: selectedClient, livreur, adresse })
  }

  async function openPrintFacture(f) {
    const { data: lignes }   = await supabase.from('lignes_commande').select('*, produits(nom)').eq('commande_id', f.commande_id)
    const { data: bl }       = await supabase.from('bons_livraison').select('*').eq('id', f.bl_id).maybeSingle()
    const { data: factData } = await supabase.from('factures').select('original_remis, original_remis_date, refs_bls').eq('id', f.id).maybeSingle()

    let listeBLs = bl ? [bl] : []
    if (factData?.refs_bls && factData.refs_bls.length > 1) {
      const { data: autresBLs } = await supabase.from('bons_livraison').select('*').in('id', factData.refs_bls)
      if (autresBLs && autresBLs.length > 0) listeBLs = autresBLs
    }

    setMentionModal({ facture: { ...f, ...factData }, bl, bls: listeBLs, commande: f.commandes, lignes: lignes || [] })
  }

  async function confirmerMention(isDuplicata) {
    const { facture, bl, bls, commande, lignes } = mentionModal
    if (!isDuplicata) {
      await supabase.from('factures').update({
        original_remis: true,
        original_remis_date: new Date().toISOString()
      }).eq('id', facture.id)
    }
    let periode = null
    const listeBLs = bls && bls.length > 1 ? bls : null
    if (listeBLs) {
      const dates = listeBLs.map(b => new Date(b.date_creation)).sort((a,b) => a-b)
      const debut = format(dates[0], 'dd/MM/yyyy')
      const fin   = format(dates[dates.length - 1], 'dd/MM/yyyy')
      periode = debut === fin ? debut : `${debut} – ${fin}`
    }
    setPrintFact({ facture, bl, bls: listeBLs || undefined, commande, lignes, client: selectedClient, tva, isDuplicata, periode })
    setMentionModal(null)
  }

  async function genererFactureGroupee() {
    if (selectedBls.length === 0) { toast.error('Sélectionnez au moins un BL'); return }
    try {
      let totalMontant = 0
      const allLignesComplet = []

      for (const bl of selectedBls) {
        const { data: lignes } = await supabase.from('lignes_commande').select('*, produits(nom)').eq('commande_id', bl.commande_id)
        const total = (lignes || []).reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
        totalMontant += total
        allLignesComplet.push(...(lignes || []))
      }

      const premierBL  = selectedBls[0]
      const refsBLsIds = selectedBls.map(b => b.id)

      const dates = selectedBls.map(b => new Date(b.date_creation)).sort((a,b) => a-b)
      const periodeStr = selectedBls.length > 1
        ? `${format(dates[0], 'dd/MM/yyyy')} – ${format(dates[dates.length-1], 'dd/MM/yyyy')}`
        : format(dates[0], 'dd/MM/yyyy')

      const { data: facture, error } = await supabase.from('factures').insert({
        commande_id:   premierBL.commande_id,
        bl_id:         premierBL.id,
        montant_total: totalMontant,
        refs_bls:      refsBLsIds,
      }).select().single()

      if (error) throw error

      for (const bl of selectedBls) {
        await supabase.from('commandes').update({ statut_paiement: 'paye' }).eq('id', bl.commande_id)
      }

      toast.success(`Facture groupée générée pour ${selectedBls.length} BL${selectedBls.length > 1 ? 's' : ''}`)
      setSelectedBls([])
      setPeriodeDebut('')
      setPeriodeFin('')
      loadClientData(selectedClient.id)

      setPrintFact({
        facture,
        bl: premierBL,
        bls: selectedBls,
        commande: premierBL.commandes,
        lignes: allLignesComplet,
        client: selectedClient,
        tva,
        periode: periodeStr,
      })
    } catch (err) {
      toast.error(err.message)
    }
  }

  function toggleSelectBl(bl) {
    setSelectedBls(prev =>
      prev.find(b => b.id === bl.id)
        ? prev.filter(b => b.id !== bl.id)
        : [...prev, bl]
    )
  }

  function toutSelectionnerFiltres() {
    setSelectedBls(blsNonPayesFiltres)
  }

  const filteredClients = clients.filter(c =>
    c.nom.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.numero_client?.toLowerCase().includes(clientSearch.toLowerCase())
  )

  async function toggleOriginalRemis(factureId, currentValue) {
    await supabase.from('factures').update({
      original_remis: !currentValue,
      original_remis_date: !currentValue ? new Date().toISOString() : null
    }).eq('id', factureId)
    if (selectedClient) loadClientData(selectedClient.id)
  }

  return (
    <div>
      <div className="flex items-center justify-between page-header">
        <div>
          <h2>Factures & BL</h2>
          <p>Consultez et imprimez les documents par client.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => setShowTvaModal(true)}>
          <Settings size={15} /> TVA : {tva}%
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:20, alignItems:'start' }}>

        {/* ── LISTE CLIENTS ── */}
        <div className="card" style={{ padding:0 }}>
          <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ position:'relative' }}>
              <Search size={13} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
              <input className="form-input" style={{ paddingLeft:28, fontSize:13 }}
                placeholder="Rechercher..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ maxHeight:500, overflowY:'auto' }}>
            {filteredClients.map(c => (
              <div key={c.id} onClick={() => setSelectedClient(c)} style={{
                padding:'12px 14px', cursor:'pointer', borderBottom:'1px solid var(--border)',
                background: selectedClient?.id === c.id ? 'var(--accent-dim)' : 'transparent',
                borderLeft: selectedClient?.id === c.id ? '3px solid var(--accent)' : '3px solid transparent',
              }}>
                <div style={{ fontWeight:600, fontSize:13, color: selectedClient?.id === c.id ? 'var(--accent)' : 'var(--text)' }}>{c.nom}</div>
                <div className="text-muted text-sm">{c.numero_client}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CONTENU ── */}
        <div>
          {!selectedClient ? (
            <div className="card"><div className="empty-state"><h3>Sélectionnez un client</h3></div></div>
          ) : (
            <>
              <div className="flex gap-2 mb-4">
                {[['factures','Factures'], ['bls','Bons de Livraison'], ['commandes','Commandes'], ['stats','Stats par adresse']].map(([val, label]) => (
                  <button key={val} onClick={() => setTab(val)} className={`btn btn-sm ${tab === val ? 'btn-primary' : 'btn-ghost'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* ── FILTRES BL ── */}
              {tab === 'bls' && (
                <div style={{ marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  {adresses.length > 1 && (
                    <select className="form-select" style={{ fontSize: 13, padding: '4px 10px', width: 'auto' }}
                      value={selectedAdresse} onChange={e => setSelectedAdresse(e.target.value)}>
                      <option value="">📍 Toutes les adresses</option>
                      {adresses.map(a => <option key={a.id} value={a.id}>📍 {a.label}</option>)}
                    </select>
                  )}
                  <select className="form-select" style={{ fontSize: 13, padding: '4px 10px', width: 'auto' }}
                    value={filterPaiementBL} onChange={e => setFilterPaiementBL(e.target.value)}>
                    <option value="">💳 Tout</option>
                    <option value="paye">✅ Payé</option>
                    <option value="non_paye">⏳ Non payé</option>
                  </select>
                  <input type="date" className="form-input" style={{ fontSize: 12, padding: '4px 8px', width: 140 }}
                    value={periodeDebut} onChange={e => { setPeriodeDebut(e.target.value); setSelectedBls([]) }} />
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>→</span>
                  <input type="date" className="form-input" style={{ fontSize: 12, padding: '4px 8px', width: 140 }}
                    value={periodeFin} onChange={e => { setPeriodeFin(e.target.value); setSelectedBls([]) }} />
                  {(selectedAdresse || filterPaiementBL || periodeDebut || periodeFin) && (
                    <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedAdresse(''); setFilterPaiementBL(''); setPeriodeDebut(''); setPeriodeFin(''); setSelectedBls([]) }}>✕ Réinitialiser</button>
                  )}
                </div>
              )}

              {/* ── BLOC FACTURATION GROUPÉE ── */}
              {tab === 'bls' && (
                <div style={{ padding:16, background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:10, marginBottom:16 }}>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span>🧾 Générer une facture groupée</span>
                    {selectedBls.length > 0 && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelectedBls([])}>Tout désélectionner</button>
                    )}
                  </div>

                  {/* Filtres de sélection */}
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12, flexWrap:'wrap' }}>
                    <input type="date" className="form-input" style={{ fontSize:12, padding:'4px 8px', width:140 }}
                      value={periodeDebut} onChange={e => { setPeriodeDebut(e.target.value); setSelectedBls([]) }} />
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>→</span>
                    <input type="date" className="form-input" style={{ fontSize:12, padding:'4px 8px', width:140 }}
                      value={periodeFin} onChange={e => { setPeriodeFin(e.target.value); setSelectedBls([]) }} />
                    {blsNonPayesFiltres.length > 0 && (
                      <button className="btn btn-ghost btn-sm" style={{ fontSize:12 }} onClick={toutSelectionnerFiltres}>
                        Tout sélectionner ({blsNonPayesFiltres.length})
                      </button>
                    )}
                    {(periodeDebut || periodeFin) && (
                      <button className="btn btn-ghost btn-sm" onClick={() => { setPeriodeDebut(''); setPeriodeFin(''); setSelectedBls([]) }}><X size={12} /></button>
                    )}
                  </div>

                  {/* Liste BLs sélectionnables — tous les BLs filtrés visibles */}
                  {(() => {
                    const blsSelectionnables = bls.filter(bl =>
                      (!selectedAdresse || bl.commandes?.adresse_livraison_id === selectedAdresse) &&
                      (!filterPaiementBL || bl.commandes?.statut_paiement === filterPaiementBL) &&
                      (!periodeDebut || bl.date_creation >= periodeDebut) &&
                      (!periodeFin || bl.date_creation <= periodeFin + 'T23:59:59')
                    )
                    return blsSelectionnables.length === 0 ? (
                      <div style={{ fontSize:13, color:'var(--text-muted)', padding:'4px 0 8px' }}>Aucun BL dans cette période.</div>
                    ) : (
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
                        {blsSelectionnables.map(bl => {
                          const isChecked = !!selectedBls.find(b => b.id === bl.id)
                          const adresseLabel = adresses.find(a => a.id === bl.commandes?.adresse_livraison_id)?.label
                          return (
                            <label key={bl.id} style={{
                              display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12,
                              padding:'5px 10px', borderRadius:6, border:'1px solid',
                              borderColor: isChecked ? 'var(--accent)' : bl.commandes?.statut_paiement === 'paye' ? 'var(--success)' : 'var(--border)',
                              background: isChecked ? 'var(--accent-dim)' : 'var(--bg-card)',
                            }}>
                              <input type="checkbox" checked={isChecked} onChange={() => toggleSelectBl(bl)} />
                              <div>
                                <div style={{ fontWeight:600 }}>{bl.numero_bl}</div>
                                <div style={{ fontSize:10, color:'var(--text-muted)' }}>
                                  {format(new Date(bl.date_creation), 'dd/MM/yyyy')}
                                  {adresseLabel ? ` · ${adresseLabel}` : ''}
                                  {bl.commandes?.statut_paiement === 'paye' ? ' · ✓ Payé' : ' · ⏳ Non payé'}
                                </div>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    )
                  })()}

                  {selectedBls.length > 0 && (
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10, padding:'8px 12px', background:'var(--bg-card)', borderRadius:6, borderLeft:'3px solid var(--accent)' }}>
                      <strong style={{ color:'var(--accent)' }}>{selectedBls.length} BL sélectionné{selectedBls.length > 1 ? 's' : ''} :</strong>{' '}
                      {selectedBls.map(b => b.numero_bl).join(', ')}
                    </div>
                  )}

                  <button className="btn btn-primary btn-sm" onClick={genererFactureGroupee} disabled={selectedBls.length === 0}>
                    <FileText size={13} /> Générer facture{selectedBls.length > 1 ? ' groupée' : ''}{selectedBls.length > 0 ? ` (${selectedBls.length} BL)` : ''}
                  </button>
                </div>
              )}

              {/* ── STATS PAR ADRESSE ── */}
              {tab === 'stats' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Période :</span>
                    <input type="date" className="form-input" style={{ fontSize: 13, padding: '4px 10px', width: 'auto' }}
                      value={statsDateDebut} onChange={e => setStatsDateDebut(e.target.value)} />
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>→</span>
                    <input type="date" className="form-input" style={{ fontSize: 13, padding: '4px 10px', width: 'auto' }}
                      value={statsDateFin} onChange={e => setStatsDateFin(e.target.value)} />
                    {(statsDateDebut || statsDateFin) && <button className="btn btn-ghost btn-sm" onClick={() => { setStatsDateDebut(''); setStatsDateFin('') }}>✕ Tout</button>}
                  </div>
                  {adresses.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Aucune adresse enregistrée</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: selectedAdresseStats ? '260px 1fr' : '1fr 1fr', gap: 16 }}>
                      {/* Cartes adresses */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {adresses.map(a => {
                          let cmdsAdresse = commandes.filter(c => c.adresse_livraison_id === a.id)
                          if (statsDateDebut) cmdsAdresse = cmdsAdresse.filter(c => c.created_at >= statsDateDebut)
                          if (statsDateFin) cmdsAdresse = cmdsAdresse.filter(c => c.created_at <= statsDateFin + 'T23:59:59')
                          const total = cmdsAdresse.length
                          const payes = cmdsAdresse.filter(c => c.statut_paiement === 'paye').length
                          const nonPayes = cmdsAdresse.filter(c => (c.statut_paiement === 'non_paye' || c.statut_paiement === null) && c.statut === 'livree').length
                          const isSelected = selectedAdresseStats?.id === a.id
                          return (
                            <div key={a.id} className="card" onClick={() => setSelectedAdresseStats(isSelected ? null : { ...a, cmdsAdresse })}
                              style={{ cursor: 'pointer', border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`, background: isSelected ? 'var(--accent-dim)' : 'var(--bg-card)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 14, color: isSelected ? 'var(--accent)' : 'var(--text)' }}>📍 {a.label}</div>
                                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{a.adresse}{a.ville ? `, ${a.ville}` : ''}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontWeight: 700, fontSize: 22, color: 'var(--accent)' }}>{total}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>commande{total > 1 ? 's' : ''}</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <span className="badge badge-green" style={{ fontSize: 11 }}>✓ Payées : {payes}</span>
                                <span className="badge badge-yellow" style={{ fontSize: 11 }}>⏳ Non payées : {nonPayes}</span>
                              </div>
                              {nonPayes > 0 && (
                                <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }}
                                  onClick={e => { e.stopPropagation(); setTab('bls'); setSelectedAdresse(a.id) }}>
                                  Générer facture →
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* BLs de l'adresse sélectionnée */}
                      {selectedAdresseStats && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h4 style={{ fontWeight: 700 }}>Commandes — {selectedAdresseStats.label}</h4>
                            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedAdresseStats(null)}>✕</button>
                          </div>
                          <div className="card" style={{ padding: 0 }}>
                            <div className="table-wrap"><table>
                              <thead><tr><th>N° Commande</th><th>Date</th><th>Statut</th><th>Paiement</th><th>Total</th></tr></thead>
                              <tbody>
                                {selectedAdresseStats.cmdsAdresse.map(cmd => {
                                  const total = (cmd.lignes_commande || []).reduce((s,l) => s + l.quantite * l.prix_unitaire, 0)
                                  return (
                                    <tr key={cmd.id}>
                                      <td><span style={{ fontWeight: 700, color: 'var(--accent)' }}>{cmd.numero_commande}</span></td>
                                      <td className="text-muted">{format(new Date(cmd.created_at), 'dd/MM/yyyy', { locale: fr })}</td>
                                      <td><span className={`badge ${cmd.statut === 'livree' ? 'badge-green' : cmd.statut === 'validee' ? 'badge-blue' : 'badge-yellow'}`}>{cmd.statut}</span></td>
                                      <td><span className={`badge ${cmd.statut_paiement === 'paye' ? 'badge-green' : 'badge-yellow'}`}>
                                        {cmd.statut_paiement === 'paye' ? '✓ Payé' : '⏳ Non payé'}
                                      </span></td>
                                      <td style={{ fontWeight: 700 }}>{total > 0 ? total.toFixed(2) + ' DH' : '—'}</td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── TABLEAU ── */}
              {tab !== 'stats' && <div className="card" style={{ padding:0 }}>
                {loading ? (
                  <div style={{ padding:40, textAlign:'center' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
                ) : tab === 'factures' ? (
                  <>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      {adresses.length > 1 && (
                        <select className="form-select" style={{ fontSize: 12, padding: '4px 8px', width: 'auto' }}
                          value={filterAdresseFact} onChange={e => setFilterAdresseFact(e.target.value)}>
                          <option value="">📍 Toutes les adresses</option>
                          {adresses.map(a => <option key={a.id} value={a.id}>📍 {a.label}</option>)}
                        </select>
                      )}
                      <input type="date" className="form-input" style={{ fontSize: 12, padding: '4px 8px', width: 'auto' }}
                        value={filterDateDebutFact} onChange={e => setFilterDateDebutFact(e.target.value)} />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>→</span>
                      <input type="date" className="form-input" style={{ fontSize: 12, padding: '4px 8px', width: 'auto' }}
                        value={filterDateFinFact} onChange={e => setFilterDateFinFact(e.target.value)} />
                      <select className="form-select" style={{ fontSize: 12, padding: '4px 8px', width: 'auto' }}
                        value={sortFactures} onChange={e => setSortFactures(e.target.value)}>
                        <option value="desc">⬇ Plus récentes</option>
                        <option value="asc">⬆ Plus anciennes</option>
                      </select>
                      {(filterAdresseFact || filterDateDebutFact || filterDateFinFact) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => { setFilterAdresseFact(''); setFilterDateDebutFact(''); setFilterDateFinFact('') }}>✕</button>
                      )}
                    </div>
                    {(() => {
                      const facturesFiltrees = factures
                        .filter(f => !filterDateDebutFact || (f.date_facture||'').slice(0,10) >= filterDateDebutFact)
                        .filter(f => !filterDateFinFact   || (f.date_facture||'').slice(0,10) <= filterDateFinFact)
                        .filter(f => !filterAdresseFact   || f.commandes?.adresse_livraison_id === filterAdresseFact)
                        .sort((a, b) => sortFactures === 'desc'
                          ? new Date(b.date_facture) - new Date(a.date_facture)
                          : new Date(a.date_facture) - new Date(b.date_facture)
                        )
                    return facturesFiltrees.length === 0
                      ? <div className="empty-state"><h3>Aucune facture</h3><p style={{ fontSize:13, color:'var(--text-muted)' }}>Aucune facture pour ces filtres.</p></div>
                      : <div className="table-wrap"><table>
                          <thead><tr><th>N° Facture</th><th>Réf. BL(s)</th><th>Date</th><th>Montant TTC</th><th>Adresse</th><th>Action</th></tr></thead>
                          <tbody>
                            {facturesFiltrees.map(f => (
                              <tr key={f.id}>
                                <td><span className="font-display" style={{ fontWeight:700, color:'var(--success)' }}>{f.numero_facture}</span></td>
                                <td><span className="badge badge-blue" style={{ fontSize:11 }}>{f.bons_livraison?.numero_bl || '—'}</span></td>
                                <td className="text-muted">{format(new Date(f.date_facture), 'dd/MM/yyyy')}</td>
                                <td style={{ fontWeight:700 }}>{Number(f.montant_total).toFixed(2)} DH</td>
                                <td className="text-muted" style={{ fontSize: 12 }}>{adresses.find(a => a.id === f.commandes?.adresse_livraison_id)?.label || '—'}</td>
                                <td>
                                  <div className="flex gap-2 items-center">
                                    <button className="btn btn-ghost btn-sm" onClick={() => openPrintFacture(f)}>⬇ Télécharger</button>
                                    <button
                                      onClick={() => toggleOriginalRemis(f.id, f.original_remis)}
                                      style={{ fontSize:11, padding:'3px 8px', borderRadius:6, border:'none', cursor:'pointer',
                                        background: f.original_remis ? 'var(--success-dim)' : 'var(--bg-elevated)',
                                        color: f.original_remis ? 'var(--success)' : 'var(--text-muted)' }}
                                    >
                                      {f.original_remis ? '✓ Original remis' : 'Original non remis'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table></div>
                  })()}
                  </>
                ) : tab === 'bls' ? (
                  (() => {
                    const blsFiltered = bls.filter(bl => (!selectedAdresse || bl.commandes?.adresse_livraison_id === selectedAdresse) && (!filterPaiementBL || bl.commandes?.statut_paiement === filterPaiementBL) && (!periodeDebut || bl.date_creation >= periodeDebut) && (!periodeFin || bl.date_creation <= periodeFin + 'T23:59:59'))
                    return blsFiltered.length === 0
                      ? <div className="empty-state"><h3>Aucun BL pour les filtres sélectionnés</h3></div>
                      : <div className="table-wrap"><table>
                          <thead><tr><th>N° BL</th><th>Commande</th><th>Date</th><th>Statut paiement</th><th>Action</th></tr></thead>
                          <tbody>
                            {blsFiltered.map(bl => (
                            <tr key={bl.id}>
                              <td><span className="font-display" style={{ fontWeight:700, color:'var(--info)' }}>{bl.numero_bl}</span></td>
                              <td className="text-muted">{bl.commandes?.numero_commande}</td>
                              <td className="text-muted">{format(new Date(bl.date_creation), 'dd/MM/yyyy')}</td>
                              <td>
                                <span className={`badge ${bl.commandes?.statut_paiement === 'paye' ? 'badge-green' : 'badge-yellow'}`}>
                                  {bl.commandes?.statut_paiement === 'paye' ? '✓ Payé' : '⏳ Non payé'}
                                </span>
                              </td>
                              <td>
                                <div className="flex gap-2 items-center">
                                  <button className="btn btn-ghost btn-sm" onClick={() => openPrintBL(bl)}>⬇ Télécharger</button>
                                  {bl.factures && (
                                    <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'var(--success-dim)', color: 'var(--success)', whiteSpace: 'nowrap' }}>
                                      🧾 {bl.factures.numero_facture}
                                    </span>
                                  )}
                                </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table></div>
                  })()
                ) : (
                  <>
                    {/* Filtres commandes */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      {adresses.length > 1 && (
                        <select className="form-select" style={{ fontSize: 13, padding: '4px 8px', width: 'auto' }}
                          value={selectedAdresse} onChange={e => setSelectedAdresse(e.target.value)}>
                          <option value="">📍 Toutes les adresses</option>
                          {adresses.map(a => <option key={a.id} value={a.id}>📍 {a.label}</option>)}
                        </select>
                      )}
                      <select className="form-select" style={{ fontSize: 13, padding: '4px 8px', width: 'auto' }}
                        value={filterPaiementCmd} onChange={e => setFilterPaiementCmd(e.target.value)}>
                        <option value="">💳 Tout</option>
                        <option value="paye">✅ Payé</option>
                        <option value="non_paye">⏳ Non payé</option>
                      </select>
                      <input type="date" className="form-input" style={{ fontSize: 12, padding: '4px 8px', width: 'auto' }}
                        value={filterDateDebutCmd} onChange={e => setFilterDateDebutCmd(e.target.value)} />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>→</span>
                      <input type="date" className="form-input" style={{ fontSize: 12, padding: '4px 8px', width: 'auto' }}
                        value={filterDateFinCmd} onChange={e => setFilterDateFinCmd(e.target.value)} />
                      {(filterPaiementCmd || filterDateDebutCmd || filterDateFinCmd) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => { setFilterPaiementCmd(''); setFilterDateDebutCmd(''); setFilterDateFinCmd('') }}>✕</button>
                      )}
                    </div>
                    {commandes
                      .filter(c => !selectedAdresse || c.adresse_livraison_id === selectedAdresse)
                      .filter(c => !filterPaiementCmd || c.statut_paiement === filterPaiementCmd)
                      .filter(c => !filterDateDebutCmd || c.created_at >= filterDateDebutCmd)
                      .filter(c => !filterDateFinCmd || c.created_at <= filterDateFinCmd + 'T23:59:59')
                      .length === 0
                      ? <div className="empty-state"><h3>Aucune commande</h3></div>
                      : <div className="table-wrap"><table>
                          <thead><tr><th>N° Commande</th><th>Date</th><th>Total</th><th>Statut</th><th>Paiement</th></tr></thead>
                          <tbody>
                            {commandes
                              .filter(c => !selectedAdresse || c.adresse_livraison_id === selectedAdresse)
                              .filter(c => !filterPaiementCmd || c.statut_paiement === filterPaiementCmd)
                              .filter(c => !filterDateDebutCmd || c.created_at >= filterDateDebutCmd)
                              .filter(c => !filterDateFinCmd || c.created_at <= filterDateFinCmd + 'T23:59:59')
                              .map(cmd => {
                                const total = (cmd.lignes_commande || []).reduce((s,l) => s + l.quantite * l.prix_unitaire, 0)
                                return (
                                  <tr key={cmd.id}>
                                    <td><span className="font-display" style={{ fontWeight:700, color:'var(--accent)' }}>{cmd.numero_commande}</span></td>
                                    <td className="text-muted">{format(new Date(cmd.created_at), 'dd/MM/yyyy')}</td>
                                    <td style={{ fontWeight:700 }}>{total.toFixed(2)} DH</td>
                                    <td><span className={`badge ${cmd.statut === 'livree' ? 'badge-green' : cmd.statut === 'validee' ? 'badge-blue' : 'badge-yellow'}`}>{cmd.statut}</span></td>
                                    <td><span className={`badge ${cmd.statut_paiement === 'paye' ? 'badge-green' : 'badge-yellow'}`}>{cmd.statut_paiement === 'paye' ? '✓ Payé' : '⏳ Non payé'}</span></td>
                                  </tr>
                                )
                              })}
                          </tbody>
                        </table></div>
                    }
                  </>
                )}
              </div>}
            </>
          )}
        </div>
      </div>

      {/* ── MODAL ORIGINAL / DUPLICATA ── */}
      {mentionModal && (
        <div className="modal-overlay" onClick={() => setMentionModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Type de facture</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setMentionModal(null)}><X size={15} /></button>
            </div>
            <div className="modal-body">
              {mentionModal.facture?.original_remis && (
                <div style={{ padding:'10px 14px', background:'var(--warning-dim)', borderRadius:8, marginBottom:16, fontSize:13, color:'var(--warning)', fontWeight:600 }}>
                  ⚠ L'original a déjà été remis au client
                  {mentionModal.facture?.original_remis_date && (
                    <div style={{ fontWeight:400, fontSize:12, marginTop:4 }}>
                      Le {new Date(mentionModal.facture.original_remis_date).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                </div>
              )}
              {mentionModal.bls && mentionModal.bls.length > 1 && (
                <div style={{ padding:'8px 12px', background:'var(--info-dim)', borderRadius:8, marginBottom:14, fontSize:12, color:'var(--info)' }}>
                  <strong>Facture groupée</strong> — {mentionModal.bls.length} BLs : {mentionModal.bls.map(b => b.numero_bl).join(', ')}
                </div>
              )}
              <p style={{ marginBottom:20, color:'var(--text-muted)', fontSize:13 }}>
                Choisissez le type de document à télécharger :
              </p>
              <div className="flex gap-3">
                <button className="btn btn-primary" style={{ flex:1, justifyContent:'center', flexDirection:'column', padding:16, height:'auto' }}
                  onClick={() => confirmerMention(false)}>
                  <div style={{ fontWeight:700, fontSize:16 }}>ORIGINAL</div>
                  <div style={{ fontSize:11, opacity:0.8, marginTop:4 }}>Première remise</div>
                </button>
                <button className="btn btn-ghost" style={{ flex:1, justifyContent:'center', flexDirection:'column', padding:16, height:'auto' }}
                  onClick={() => confirmerMention(true)}>
                  <div style={{ fontWeight:700, fontSize:16 }}>DUPLICATA</div>
                  <div style={{ fontSize:11, opacity:0.8, marginTop:4 }}>Copie supplémentaire</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL TVA ── */}
      {showTvaModal && (
        <div className="modal-overlay" onClick={() => setShowTvaModal(false)}>
          <div className="modal" style={{ maxWidth:320 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Taux de TVA</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowTvaModal(false)}><X size={15} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Taux TVA (%)</label>
                <input className="form-input" type="number" min="0" max="100" step="0.1"
                  value={tva} onChange={e => setTva(Number(e.target.value))} />
              </div>
              <div style={{ padding:12, background:'var(--bg-elevated)', borderRadius:8, fontSize:13 }}>
                <div className="flex justify-between mb-2"><span>Exemple TTC :</span><span>1 000 DH</span></div>
                <div className="flex justify-between mb-2 text-muted"><span>Total HT :</span><span>{(1000/(1+tva/100)).toFixed(2)} DH</span></div>
                <div className="flex justify-between text-muted"><span>TVA {tva}% :</span><span>{(1000-1000/(1+tva/100)).toFixed(2)} DH</span></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowTvaModal(false)}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {printBL   && <PrintBL      {...printBL}   onClose={() => setPrintBL(null)} />}
      {printFact && <PrintFacture {...printFact} onClose={() => setPrintFact(null)} />}
    </div>
  )
}

import React from 'react'
import { format } from 'date-fns'

function nombreEnLettres(n) {
  const u = ['','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf']
  const d = ['','','vingt','trente','quarante','cinquante','soixante','soixante','quatre-vingt','quatre-vingt']
  if (n === 0) return 'zéro'
  function c(nb) {
    if (nb === 0) return ''
    if (nb < 20) return u[nb]
    if (nb < 100) { const dz=Math.floor(nb/10),un=nb%10; if(dz===7)return'soixante-'+u[10+un]; if(dz===9)return'quatre-vingt-'+(un===0?'':u[un]); return d[dz]+(un===1&&dz!==8?'-et-':un>0?'-':'')+u[un] }
    if (nb < 1000) { const ce=Math.floor(nb/100),r=nb%100; return(ce===1?'cent':u[ce]+'-cent')+(r>0?'-'+c(r):'') }
    const m=Math.floor(nb/1000),r=nb%1000; return(m===1?'mille':c(m)+'-mille')+(r>0?'-'+c(r):'')
  }
  const ent=Math.floor(n), cts=Math.round((n-ent)*100)
  let res=c(ent).toUpperCase(); if(res)res+=' DIRHAMS'; if(cts>0)res+=' ET '+c(cts).toUpperCase()+' CENTIMES'
  return res
}

function QRCode({ value, size=80 }) {
  const [dataUrl, setDataUrl] = React.useState('')
  React.useEffect(() => {
    import('qrcode').then(QR => {
      QR.toDataURL(value, {
        width: size * 2,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      }).then(url => setDataUrl(url)).catch(() => {})
    }).catch(() => {})
  }, [value, size])
  if (!dataUrl) return <div style={{ width:size, height:size, background:'#f0f0f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#999' }}>QR</div>
  return <img src={dataUrl} alt="QR" style={{ width:size, height:size, display:'block', imageRendering:'pixelated' }} />
}

function cap(str) {
  if (!str) return str
  return str.replace(/\b\w/g, c => c.toUpperCase())
}

const SOCIETE = {
  nom:       'Ijtihad Gaz',
  adresse:   'N° 67 LOT BLED SI THAMI 2ème étage Zemamra',
  tel:       '06 67 33 70 73',
  ice:       '003104207000037',
}

function trierLignes(lignes) {
  return [...lignes].sort((a, b) => {
    const score = (nom) => {
      nom = (nom||'').toLowerCase()
      if (nom.includes('12')) return 0
      if (nom.includes('6')) return 1
      if (nom.includes('3')) return 2
      if (nom.includes('bng')) return 3
      if (nom.includes('propane')) return 4
      return 5
    }
    return score(a.produits?.nom) - score(b.produits?.nom)
  })
}

function getConditionLabel(val) {
  return { immediat:'Règlement immédiat', quinzaine:'Quinzaine', mensuel:'Mensuel', trimestre:'Trimestriel' }[val] || val || 'Règlement immédiat'
}

const S = {
  page: { fontFamily:'Arial,sans-serif', fontSize:12, color:'#000', background:'#fff', padding:'20px 28px' },
  TH: { border:'1.5px solid #000', padding:'8px 10px', background:'#e8e8e8', fontWeight:700, textAlign:'center', fontSize:12, color:'#000' },
  TD: { border:'1px solid #000', padding:'8px 10px', fontSize:12, color:'#000', height:34 },
  TDC: { border:'1px solid #000', padding:'8px 10px', fontSize:12, color:'#000', textAlign:'center', height:34 },
  TDR: { border:'1px solid #000', padding:'8px 10px', fontSize:12, color:'#000', textAlign:'right', height:34 },
}

function SocieteBloc() {
  return (
    <div style={{ border:'1.5px solid #000', padding:'10px 14px' }}>
      <div style={{ fontWeight:900, fontSize:16, textDecoration:'underline', color:'#000', marginBottom:4 }}>{SOCIETE.nom}</div>
      <div style={{ fontSize:11, color:'#000', lineHeight:1.8 }}>
        <div>Tél : {SOCIETE.tel}</div>
        <div>ICE : {SOCIETE.ice}</div>
      </div>
    </div>
  )
}

function ClientBloc({ client, label='LIVRÉ À :', adresse }) {
  return (
    <div style={{ border:'1.5px solid #000', padding:'10px 14px' }}>
      <div style={{ fontWeight:700, fontSize:11, textTransform:'uppercase', marginBottom:4, color:'#000' }}>{label}</div>
      {client?.nom_societe && <div style={{ fontWeight:700, color:'#000', fontSize:13 }}>{client.nom_societe}</div>}
      <div style={{ fontWeight:700, color:'#000', fontSize:13 }}>{client?.nom}</div>
      {adresse ? (
        <>
          <div style={{ fontSize:11, color:'#000' }}>{adresse.adresse}</div>
          {adresse.ville && <div style={{ fontSize:11, color:'#000' }}>{adresse.ville}</div>}
        </>
      ) : (
        client?.adresse && <div style={{ fontSize:11, color:'#000' }}>{client.adresse}</div>
      )}
      {client?.telephone && <div style={{ fontSize:11, color:'#000' }}>Tél : {client.telephone}</div>}
      {client?.ice && <div style={{ fontSize:11, color:'#000' }}>ICE : {client.ice}</div>}
    </div>
  )
}

function DocFooter() {
  return (
    <div className="doc-footer" style={{ borderTop:'1px solid #aaa', marginTop:24, paddingTop:8, textAlign:'center', fontSize:10, color:'#555', lineHeight:1.7 }}>
      {SOCIETE.nom} &nbsp;·&nbsp; {SOCIETE.adresse} &nbsp;·&nbsp; TEL : {SOCIETE.tel} &nbsp;·&nbsp; ICE : {SOCIETE.ice}
    </div>
  )
}

function DocModal({ titre, onClose, children, isDuplicata }) {

  function handleDownload() {
    const el = document.getElementById('doc-content')
    if (!el) return

    const filename = titre.replace(/[^a-zA-Z0-9-_]/g, '_') + '.pdf'

    // Injecter un style @media print qui n'affiche que doc-content
    const styleId = '__print_doc_style__'
    let style = document.getElementById(styleId)
    if (!style) {
      style = document.createElement('style')
      style.id = styleId
      document.head.appendChild(style)
    }
    style.textContent = `
      @media print {
        @page {
          size: A4 portrait;
          margin: 10mm 12mm;
        }
        @page :first { margin-top: 10mm; }
        head, header, footer { display: none !important; }
        body > * { display: none !important; }
        body > .modal-print-wrapper { display: block !important; }
        .modal-print-wrapper { display: block; width: 100%; }
        .modal-print-wrapper #doc-print-content {
          display: block !important;
          width: 100% !important;
          font-family: Arial, sans-serif !important;
          font-size: 12px !important;
          color: #000 !important;
          background: #fff !important;
          padding: 0 0 20mm 0 !important;
          box-sizing: border-box !important;
        }
        .modal-print-wrapper #doc-print-content .doc-footer {
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          padding: 4mm 12mm !important;
          border-top: 1px solid #aaa !important;
          text-align: center !important;
          font-size: 10px !important;
          color: #555 !important;
          background: #fff !important;
        }
        .modal-print-wrapper #doc-print-content .doc-spacer {
          display: none !important;
        }
      }
    `

    // Cloner le contenu hors du modal dans un wrapper dédié
    const wrapper = document.createElement('div')
    wrapper.className = 'modal-print-wrapper'
    wrapper.style.display = 'none'

    const clone = el.cloneNode(true)
    clone.id = 'doc-print-content'
    // Réinitialiser tous les styles inline contraignants
    clone.style.cssText = 'width:100%;background:#fff;color:#000;font-family:Arial,sans-serif;font-size:12px'
    wrapper.appendChild(clone)
    document.body.appendChild(wrapper)

    // Renommer le document pour le téléchargement
    const prevTitle = document.title
    document.title = filename

    window.print()

    // Nettoyage immédiat après print
    document.title = prevTitle
    document.body.removeChild(wrapper)
    style.textContent = ''
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:820, background:'white', color:'#000', maxHeight:'92vh', overflowY:'auto', display:'flex', flexDirection:'column' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header noprint" style={{ background:'white', borderBottom:'1px solid #e5e7eb', position:'sticky', top:0, zIndex:10 }}>
          <h3 style={{ color:'#111' }}>{titre.replace('_DUPLICATA','')}</h3>
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={handleDownload}>⬇ Télécharger</button>
            <button className="btn btn-ghost btn-sm" style={{ color:'#666' }} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Contenu */}
        <div id="doc-content" style={{ ...S.page, position:'relative', flex:1 }}>
          {isDuplicata && (
            <div style={{
              position:'absolute',
              top:0, left:0, width:'100%', height:'100%',
              pointerEvents:'none',
              zIndex:0,
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
            }}>
              <span style={{
                display:'block',
                transform:'rotate(-45deg)',
                fontSize:88,
                fontWeight:900,
                color:'#c0c0c0',
                opacity:0.25,
                fontFamily:'Arial,sans-serif',
                letterSpacing:6,
                whiteSpace:'nowrap',
                userSelect:'none',
              }}>DUPLICATA</span>
            </div>
          )}
          <div style={{ position:'relative', zIndex:1 }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════
// BON DE LIVRAISON
// ═══════════════════════════════════
export function PrintBL({ bl, commande, lignes, client, livreur, adresse, onClose }) {
  const date = bl?.date_creation ? format(new Date(bl.date_creation),'dd/MM/yyyy') : format(new Date(),'dd/MM/yyyy')
  const condition = getConditionLabel(commande?.condition_paiement || client?.condition_paiement)
  const lignesTri = trierLignes(lignes)
  const qrData = `BL:${bl?.numero_bl}|CMD:${commande?.numero_commande}|CLIENT:${client?.nom}`

  return (
    <DocModal titre={`BL-${bl?.numero_bl}`} onClose={onClose}>

      {/* ── EN-TÊTE ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div>
          <div style={{ fontWeight:900, fontSize:18, color:'#000' }}>{SOCIETE.nom}</div>
          <div style={{ fontSize:11, color:'#555', marginTop:3 }}>Tél : {SOCIETE.tel}</div>
          <div style={{ fontSize:11, color:'#555' }}>ICE : {SOCIETE.ice}</div>
        </div>
        <div style={{ textAlign:'right', fontSize:11, color:'#555' }}>
          <div>N° : <strong>{bl?.numero_bl}</strong></div>
          <div>Date : {date}</div>
        </div>
      </div>

      {/* ── TITRE CENTRÉ ── */}
      <div style={{ textAlign:'center', margin:'12px 0 20px' }}>
        <div style={{ display:'inline-block', borderTop:'2px solid #1a5c8a', borderBottom:'2px solid #1a5c8a', padding:'6px 40px', fontSize:15, fontWeight:800, letterSpacing:3, color:'#1a5c8a', textTransform:'uppercase' }}>
          Bon de Livraison
        </div>
      </div>

      {/* ── FACTURÉ À / LIVRÉ À ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#888', marginBottom:6 }}>Facturé à :</div>
          <div style={{ border:'1px solid #ddd', borderRadius:4, padding:'10px 12px' }}>
            {client?.nom_societe && <div style={{ fontWeight:700, fontSize:13, color:'#000' }}>{cap(client.nom_societe)}</div>}
            <div style={{ fontWeight:700, fontSize:13, color:'#000', marginBottom:4 }}>{cap(client?.nom)}</div>
            <div style={{ fontSize:11, color:'#444', lineHeight:1.8 }}>
              {client?.adresse && <div>{client.adresse}</div>}
              {client?.telephone && <div>Tél : {client.telephone}</div>}
              {client?.ice && <div>ICE : {client.ice}</div>}
            </div>
          </div>
        </div>
        <div>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#888', marginBottom:6 }}>Livré à :</div>
          <div style={{ border:'1px solid #ddd', borderRadius:4, padding:'10px 12px' }}>
            {client?.nom_societe && <div style={{ fontWeight:700, fontSize:13, color:'#000' }}>{cap(client.nom_societe)}</div>}
            <div style={{ fontWeight:700, fontSize:13, color:'#000', marginBottom:4 }}>{cap(client?.nom)}</div>
            <div style={{ fontSize:11, color:'#444', lineHeight:1.8 }}>
              {adresse ? (
                <>
                  <div>{adresse.adresse}</div>
                  {adresse.ville && <div>{adresse.ville}</div>}
                </>
              ) : (
                client?.adresse && <div>{client.adresse}</div>
              )}
              {client?.telephone && <div>Tél : {client.telephone}</div>}
              {client?.ice && <div>ICE : {client.ice}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── REF + CONDITIONS ── */}
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#444', marginBottom:20, padding:'7px 12px', background:'#f5f5f5', borderRadius:4, border:'1px solid #eee' }}>
        {commande?.numero_commande && <span>Commande N° <strong>{commande.numero_commande}</strong> du {date}</span>}
        <span>Conditions : <strong>{condition.toUpperCase()}</strong></span>
      </div>

      {/* ── TABLEAU PRODUITS ── */}
      <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:20 }}>
        <thead>
          <tr>
            <th style={{ padding:'9px 12px', textAlign:'left', fontSize:11, fontWeight:700, textTransform:'uppercase', color:'#fff', background:'#1a5c8a', borderRight:'1px solid rgba(255,255,255,0.3)' }}>Produit</th>
            <th style={{ padding:'9px 12px', textAlign:'center', fontSize:11, fontWeight:700, textTransform:'uppercase', color:'#fff', background:'#1a5c8a', width:120 }}>Quantité</th>
          </tr>
        </thead>
        <tbody>
          {lignesTri.map((l, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom:'1px solid #ddd' }}>
              <td style={{ padding:'9px 12px', fontSize:12, color:'#000', borderRight:'1px solid #ddd' }}>{l.produits?.nom?.toUpperCase()}</td>
              <td style={{ padding:'9px 12px', textAlign:'center', fontSize:12, fontWeight:600, color:'#000' }}>{l.quantite}</td>
            </tr>
          ))}
        </tbody>
      </table>



      {/* ── LIVREUR ── */}
      {livreur && (
        <div style={{ marginBottom:20, padding:'10px 14px', background:'#f5f5f5', borderRadius:4, fontSize:12 }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#888', marginBottom:4 }}>Livreur</div>
          <span style={{ fontWeight:600, color:'#000' }}>{livreur.prenom} {livreur.nom}</span>
          {livreur.telephone && <span style={{ color:'#444' }}> · {livreur.telephone}</span>}
          {livreur.immatriculation && <span style={{ color:'#444' }}> · Véhicule : {livreur.immatriculation}</span>}
          {livreur.cin && <span style={{ color:'#444' }}> · CIN : {livreur.cin}</span>}
        </div>
      )}

      {/* ── SIGNATURES + QR ── */}
      <div style={{ marginTop:48, paddingTop:20, borderTop:'1px solid #ddd' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:20, alignItems:'end' }}>
          <div>
            <div style={{ fontSize:11, color:'#888', marginBottom:8 }}>Signature Réceptionnaire</div>
            <div style={{ border:'1px solid #ccc', borderRadius:4, height:70 }} />
            <div style={{ fontSize:10, color:'#aaa', marginTop:4 }}>Nom & cachet</div>
          </div>
          <div>
            <div style={{ fontSize:11, color:'#888', marginBottom:8 }}>Signature Chauffeur</div>
            <div style={{ border:'1px solid #ccc', borderRadius:4, height:70 }} />
            <div style={{ fontSize:10, color:'#aaa', marginTop:4 }}>Nom & cachet</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <QRCode value={qrData} size={75} />
            <div style={{ fontSize:9, color:'#888', marginTop:3 }}>{bl?.numero_bl}</div>
          </div>
        </div>
      </div>

      <DocFooter />
    </DocModal>
  )
}


export function PrintBC({ commande, lignes, client, tva=10, onClose }) {
  const lignesTri = trierLignes(lignes)
  const totalTTC  = lignesTri.reduce((s,l) => s + l.quantite * l.prix_unitaire, 0)
  const totalHT   = totalTTC / (1 + tva/100)
  const montantTVA = totalTTC - totalHT
  const date   = commande?.created_at ? format(new Date(commande.created_at),'dd/MM/yyyy HH:mm') : format(new Date(),'dd/MM/yyyy')
  const qrData = `BC:${commande?.numero_commande}|CLIENT:${client?.nom}|TOTAL:${totalTTC.toFixed(2)}`

  return (
    <DocModal titre={`BC-${commande?.numero_commande}`} onClose={onClose}>

      {/* ── EN-TÊTE ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div>
          <div style={{ fontWeight:900, fontSize:18, color:'#000' }}>{SOCIETE.nom}</div>
          <div style={{ fontSize:11, color:'#555', marginTop:3 }}>Tél : {SOCIETE.tel}</div>
          <div style={{ fontSize:11, color:'#555' }}>ICE : {SOCIETE.ice}</div>
        </div>
        <div style={{ textAlign:'right', fontSize:11, color:'#555' }}>
          <div>N° : <strong>{commande?.numero_commande}</strong></div>
          <div>Date : {date}</div>
        </div>
      </div>

      {/* ── TITRE ── */}
      <div style={{ textAlign:'center', margin:'12px 0 20px' }}>
        <div style={{ display:'inline-block', borderTop:'2px solid #1a5c8a', borderBottom:'2px solid #1a5c8a', padding:'6px 40px', fontSize:15, fontWeight:800, letterSpacing:3, color:'#1a5c8a', textTransform:'uppercase' }}>
          Bon de Commande
        </div>
      </div>

      {/* ── FACTURÉ À / LIVRÉ À ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#888', marginBottom:6 }}>Facturé à :</div>
          <div style={{ border:'1px solid #ddd', borderRadius:4, padding:'10px 12px' }}>
            {client?.nom_societe && <div style={{ fontWeight:700, fontSize:13, color:'#000' }}>{cap(client.nom_societe)}</div>}
            <div style={{ fontWeight:700, fontSize:13, color:'#000', marginBottom:4 }}>{cap(client?.nom)}</div>
            <div style={{ fontSize:11, color:'#444', lineHeight:1.8 }}>
              {client?.adresse && <div>{client.adresse}</div>}
              {client?.ville && <div>{client.ville}</div>}
              {client?.telephone && <div>Tél : {client.telephone}</div>}
              {client?.ice && <div>ICE : {client.ice}</div>}
            </div>
          </div>
        </div>
        <div>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#888', marginBottom:6 }}>Livré à :</div>
          <div style={{ border:'1px solid #ddd', borderRadius:4, padding:'10px 12px' }}>
            {client?.nom_societe && <div style={{ fontWeight:700, fontSize:13, color:'#000' }}>{cap(client.nom_societe)}</div>}
            <div style={{ fontWeight:700, fontSize:13, color:'#000', marginBottom:4 }}>{cap(client?.nom)}</div>
            <div style={{ fontSize:11, color:'#444', lineHeight:1.8 }}>
              {client?.adresse && <div>{client.adresse}</div>}
              {client?.ville && <div>{client.ville}</div>}
              {client?.telephone && <div>Tél : {client.telephone}</div>}
              {client?.ice && <div>ICE : {client.ice}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── CONDITIONS ── */}
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#444', marginBottom:20, padding:'7px 12px', background:'#f5f5f5', borderRadius:4, border:'1px solid #e0e0e0' }}>
        <span>Mode de règlement : <strong>{commande?.mode_reglement === 'cheque' ? 'Chèque' : 'Espèces'}</strong></span>
        <span>Conditions : <strong>{getConditionLabel(commande?.condition_paiement).toUpperCase()}</strong></span>
      </div>

      {/* ── TABLEAU PRODUITS ── */}
      <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:20 }}>
        <thead>
          <tr>
            <th style={{ padding:'9px 12px', textAlign:'left',   fontSize:11, fontWeight:700, textTransform:'uppercase', color:'#fff', background:'#1a5c8a', borderRight:'1px solid rgba(255,255,255,0.3)' }}>Désignation</th>
            <th style={{ padding:'9px 12px', textAlign:'center', fontSize:11, fontWeight:700, textTransform:'uppercase', color:'#fff', background:'#1a5c8a', width:80,  borderRight:'1px solid rgba(255,255,255,0.3)' }}>Qté</th>
            <th style={{ padding:'9px 12px', textAlign:'right',  fontSize:11, fontWeight:700, textTransform:'uppercase', color:'#fff', background:'#1a5c8a', width:110, borderRight:'1px solid rgba(255,255,255,0.3)' }}>P.U. TTC</th>
            <th style={{ padding:'9px 12px', textAlign:'center', fontSize:11, fontWeight:700, textTransform:'uppercase', color:'#fff', background:'#1a5c8a', width:80,  borderRight:'1px solid rgba(255,255,255,0.3)' }}>TVA</th>
            <th style={{ padding:'9px 12px', textAlign:'right',  fontSize:11, fontWeight:700, textTransform:'uppercase', color:'#fff', background:'#1a5c8a', width:110 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {lignesTri.map((l,i) => (
            <tr key={i} style={{ background: i%2===0 ? '#fff' : '#fafafa', borderBottom:'1px solid #ddd' }}>
              <td style={{ padding:'9px 12px', fontSize:12, color:'#000', borderRight:'1px solid #ddd' }}>{l.produits?.nom?.toUpperCase()}</td>
              <td style={{ padding:'9px 12px', textAlign:'center', fontSize:12, fontWeight:600, color:'#000', borderRight:'1px solid #ddd' }}>{l.quantite}</td>
              <td style={{ padding:'9px 12px', textAlign:'right',  fontSize:12, color:'#000', borderRight:'1px solid #ddd' }}>{Number(l.prix_unitaire).toFixed(2)} DH</td>
              <td style={{ padding:'9px 12px', textAlign:'center', fontSize:11, color:'#555', borderRight:'1px solid #ddd' }}>TVA {tva}%</td>
              <td style={{ padding:'9px 12px', textAlign:'right',  fontSize:12, fontWeight:600, color:'#000' }}>{(l.quantite*l.prix_unitaire).toFixed(2)} DH</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── TOTAUX ── */}
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:20 }}>
        <table style={{ borderCollapse:'collapse', width:'auto' }}>
          <tbody>
            <tr>
              <td style={{ padding:'7px 16px', fontSize:12, color:'#555', border:'1px solid #ddd', whiteSpace:'nowrap' }}>Montant HT</td>
              <td style={{ padding:'7px 16px', fontSize:12, color:'#000', textAlign:'right', border:'1px solid #ddd', minWidth:110, whiteSpace:'nowrap' }}>{totalHT.toFixed(2)} DH</td>
            </tr>
            <tr>
              <td style={{ padding:'7px 16px', fontSize:12, color:'#555', border:'1px solid #ddd', whiteSpace:'nowrap' }}>TVA {tva}%</td>
              <td style={{ padding:'7px 16px', fontSize:12, color:'#000', textAlign:'right', border:'1px solid #ddd', whiteSpace:'nowrap' }}>{montantTVA.toFixed(2)} DH</td>
            </tr>
            <tr style={{ background:'#1a5c8a' }}>
              <td style={{ padding:'8px 16px', fontSize:13, fontWeight:700, color:'#fff', border:'1px solid #1a5c8a', whiteSpace:'nowrap' }}>Total TTC</td>
              <td style={{ padding:'8px 16px', fontSize:13, fontWeight:700, color:'#fff', textAlign:'right', border:'1px solid #1a5c8a', whiteSpace:'nowrap' }}>{totalTTC.toFixed(2)} DH</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── QR + FOOTER ── */}
      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
        <div style={{ textAlign:'center' }}>
          <QRCode value={qrData} size={65} />
          <div style={{ fontSize:10, color:'#888', marginTop:3 }}>{commande?.numero_commande}</div>
        </div>
      </div>
      <DocFooter />
    </DocModal>
  )
}

// ═══════════════════════════════════
// FACTURE
// ═══════════════════════════════════
export function PrintFacture({ facture, bl, bls, commande, lignes, client, tva=10, isDuplicata=false, periode, onClose }) {
  const lignesTri  = trierLignes(lignes)
  const totalTTC   = lignesTri.reduce((s,l) => s + l.quantite * l.prix_unitaire, 0)
  const totalHT    = totalTTC / (1 + tva/100)
  const montantTVA = totalTTC - totalHT
  const dateF      = facture?.date_facture ? format(new Date(facture.date_facture),'dd/MM/yyyy') : format(new Date(),'dd/MM/yyyy')
  const condition  = getConditionLabel(commande?.condition_paiement || client?.condition_paiement)
  const listeBLs   = bls && bls.length > 0 ? bls : (bl ? [bl] : [])
  const refsBLs    = listeBLs.map(b => b.numero_bl).join(', ')
  const qrData     = `FACT:${facture?.numero_facture}|BL:${refsBLs}|CLIENT:${client?.nom}|TOTAL:${totalTTC.toFixed(2)}`
  const titre      = isDuplicata ? `Facture-${facture?.numero_facture}_DUPLICATA` : `Facture-${facture?.numero_facture}`

  return (
    <DocModal titre={titre} isDuplicata={isDuplicata} onClose={onClose}>

      {/* ── EN-TÊTE ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div>
          <div style={{ fontWeight:900, fontSize:18, color:'#000' }}>{SOCIETE.nom}</div>
          <div style={{ fontSize:11, color:'#555', marginTop:3 }}>Tél : {SOCIETE.tel}</div>
          <div style={{ fontSize:11, color:'#555' }}>ICE : {SOCIETE.ice}</div>
        </div>
        <div style={{ textAlign:'right', fontSize:11, color:'#555' }}>
          <div>N° : <strong>{facture?.numero_facture}</strong></div>
          <div>Date : {dateF}</div>
          {listeBLs.length > 0 && <div>Réf. BL{listeBLs.length > 1 ? 's' : ''} : <strong>{refsBLs}</strong></div>}
          {periode && <div>Période : <strong>{periode}</strong></div>}
        </div>
      </div>

      {/* ── TITRE ── */}
      <div style={{ textAlign:'center', margin:'12px 0 20px' }}>
        <div style={{ display:'inline-block', borderTop:'2px solid #1a5c8a', borderBottom:'2px solid #1a5c8a', padding:'6px 40px', fontSize:15, fontWeight:800, letterSpacing:3, color:'#1a5c8a', textTransform:'uppercase' }}>
          Facture
        </div>
      </div>

      {/* ── ÉMETTEUR / FACTURÉ À ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#888', marginBottom:6 }}>Émetteur</div>
          <div style={{ border:'1px solid #ccc', borderRadius:4, padding:'10px 12px' }}>
            <div style={{ fontWeight:700, fontSize:13, color:'#000', marginBottom:4 }}>{SOCIETE.nom}</div>
            <div style={{ fontSize:11, color:'#444', lineHeight:1.8 }}>
              <div>Tél : {SOCIETE.tel}</div>
              <div>ICE : {SOCIETE.ice}</div>
            </div>
          </div>
        </div>
        <div>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#888', marginBottom:6 }}>Facturé à</div>
          <div style={{ border:'1px solid #ccc', borderRadius:4, padding:'10px 12px' }}>
            <div style={{ fontWeight:700, fontSize:13, color:'#000', marginBottom:4 }}>{client?.nom_societe ? `${cap(client.nom_societe)} — ${cap(client.nom)}` : cap(client?.nom)}</div>
            <div style={{ fontSize:11, color:'#444', lineHeight:1.8 }}>
              {client?.adresse && <div>{client.adresse}</div>}
              {client?.telephone && <div>Tél : {client.telephone}</div>}
              {client?.ice && <div>ICE : {client.ice}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── CONDITIONS ── */}
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#444', marginBottom:20, padding:'7px 12px', background:'#f5f5f5', borderRadius:4, border:'1px solid #e0e0e0' }}>
        <span>Mode : <strong>{commande?.mode_reglement === 'cheque' ? 'Chèque' : 'Espèces'}</strong></span>
        <span>Conditions : <strong>{condition.toUpperCase()}</strong></span>
      </div>

      {/* ── TABLEAU PRODUITS ── */}
      <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:20 }}>
        <thead>
          <tr>
            <th style={{ padding:'9px 12px', textAlign:'left',   fontSize:11, fontWeight:700, textTransform:'uppercase', color:'#fff', background:'#1a5c8a', borderRight:'1px solid rgba(255,255,255,0.3)' }}>Désignation</th>
            <th style={{ padding:'9px 12px', textAlign:'center', fontSize:11, fontWeight:700, textTransform:'uppercase', color:'#fff', background:'#1a5c8a', width:80,  borderRight:'1px solid rgba(255,255,255,0.3)' }}>Qté</th>
            <th style={{ padding:'9px 12px', textAlign:'right',  fontSize:11, fontWeight:700, textTransform:'uppercase', color:'#fff', background:'#1a5c8a', width:110, borderRight:'1px solid rgba(255,255,255,0.3)' }}>P.U. TTC</th>
            <th style={{ padding:'9px 12px', textAlign:'right',  fontSize:11, fontWeight:700, textTransform:'uppercase', color:'#fff', background:'#1a5c8a', width:110 }}>Montant</th>
          </tr>
        </thead>
        <tbody>
          {lignesTri.map((l,i) => (
            <tr key={i} style={{ background: i%2===0 ? '#fff' : '#fafafa', borderBottom:'1px solid #ddd' }}>
              <td style={{ padding:'9px 12px', fontSize:12, color:'#000', borderRight:'1px solid #ddd' }}>{l.produits?.nom?.toUpperCase()}</td>
              <td style={{ padding:'9px 12px', textAlign:'center', fontSize:12, fontWeight:600, color:'#000', borderRight:'1px solid #ddd' }}>{l.quantite}</td>
              <td style={{ padding:'9px 12px', textAlign:'right',  fontSize:12, color:'#000', borderRight:'1px solid #ddd' }}>{Number(l.prix_unitaire).toFixed(2)}</td>
              <td style={{ padding:'9px 12px', textAlign:'right',  fontSize:12, fontWeight:600, color:'#000' }}>{(l.quantite*l.prix_unitaire).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── TOTAUX ── */}
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        <table style={{ borderCollapse:'collapse', width:'auto' }}>
          <tbody>
            <tr>
              <td style={{ padding:'7px 16px', fontSize:12, color:'#555', border:'1px solid #ddd', whiteSpace:'nowrap' }}>Total HT</td>
              <td style={{ padding:'7px 16px', fontSize:12, color:'#000', textAlign:'right', border:'1px solid #ddd', minWidth:110, whiteSpace:'nowrap' }}>{totalHT.toFixed(2)} DH</td>
            </tr>
            <tr>
              <td style={{ padding:'7px 16px', fontSize:12, color:'#555', border:'1px solid #ddd', whiteSpace:'nowrap' }}>TVA {tva}%</td>
              <td style={{ padding:'7px 16px', fontSize:12, color:'#000', textAlign:'right', border:'1px solid #ddd', whiteSpace:'nowrap' }}>{montantTVA.toFixed(2)} DH</td>
            </tr>
            <tr style={{ background:'#1a5c8a' }}>
              <td style={{ padding:'8px 16px', fontSize:13, fontWeight:700, color:'#fff', border:'1px solid #1a5c8a', whiteSpace:'nowrap' }}>Total TTC</td>
              <td style={{ padding:'8px 16px', fontSize:13, fontWeight:700, color:'#fff', textAlign:'right', border:'1px solid #1a5c8a', whiteSpace:'nowrap' }}>{totalTTC.toFixed(2)} DH</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── ARRÊTÉE ── */}
      <div style={{ fontSize:11, color:'#444', marginBottom:16, padding:'8px 12px', background:'#f9f9f9', borderLeft:'3px solid #1a5c8a', borderRadius:'0 4px 4px 0' }}>
        <strong>Arrêtée à la somme de :</strong> {nombreEnLettres(totalTTC)}
      </div>

      {/* ── QR + FOOTER ── */}
      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
        <div style={{ textAlign:'center' }}>
          <QRCode value={qrData} size={65} />
          <div style={{ fontSize:10, color:'#888', marginTop:3 }}>{facture?.numero_facture}</div>
          <div style={{ fontSize:10, color:'#888' }}>Exemplaire Client</div>
        </div>
      </div>
      <DocFooter />
    </DocModal>
  )
}

// ═══════════════════════════════════════════
// DEVIS
// ═══════════════════════════════════════════
export function PrintDevis({ numero, date, validite, client, lignes, tva = 10, notes, onClose }) {
  const totalTTC   = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
  const totalHT    = totalTTC / (1 + tva / 100)
  const montantTVA = totalTTC - totalHT
  const dateF      = date ? format(new Date(date), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')
  const dateExp    = format(new Date(new Date(date || new Date()).getTime() + validite * 24 * 60 * 60 * 1000), 'dd/MM/yyyy')
  const lignesTri  = trierLignes(lignes)

  return (
    <DocModal titre={`Devis — ${numero}`} onClose={onClose}>

      {/* ── EN-TÊTE ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div>
          <div style={{ fontWeight:900, fontSize:18, color:'#000' }}>{SOCIETE.nom}</div>
          <div style={{ fontSize:11, color:'#555', marginTop:3 }}>Tél : {SOCIETE.tel}</div>
          <div style={{ fontSize:11, color:'#555' }}>ICE : {SOCIETE.ice}</div>
        </div>
        <div style={{ textAlign:'right', fontSize:11, color:'#555' }}>
          <div>N° : <strong>{numero}</strong></div>
          <div>Date : {dateF}</div>
          <div>Valable jusqu'au : <strong>{dateExp}</strong></div>
        </div>
      </div>

      {/* ── TITRE ── */}
      <div style={{ textAlign:'center', margin:'12px 0 20px' }}>
        <div style={{ display:'inline-block', borderTop:'2px solid #7c3aed', borderBottom:'2px solid #7c3aed', padding:'6px 40px', fontSize:15, fontWeight:800, letterSpacing:3, color:'#7c3aed', textTransform:'uppercase' }}>
          Devis
        </div>
      </div>

      {/* ── ÉMETTEUR / DESTINATAIRE ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#888', marginBottom:6 }}>Émetteur</div>
          <div style={{ border:'1px solid #ccc', borderRadius:4, padding:'10px 12px' }}>
            <div style={{ fontWeight:700, fontSize:13, color:'#000', marginBottom:4 }}>{SOCIETE.nom}</div>
            <div style={{ fontSize:11, color:'#444', lineHeight:1.8 }}>
              <div>Tél : {SOCIETE.tel}</div>
              <div>ICE : {SOCIETE.ice}</div>
            </div>
          </div>
        </div>
        <div>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#888', marginBottom:6 }}>Destinataire</div>
          {client ? (
            <div style={{ border:'1px solid #ccc', borderRadius:4, padding:'10px 12px' }}>
              <div style={{ fontWeight:700, fontSize:13, color:'#000', marginBottom:4 }}>{client?.nom_societe ? `${cap(client.nom_societe)} — ${cap(client.nom)}` : cap(client?.nom)}</div>
              <div style={{ fontSize:11, color:'#444', lineHeight:1.8 }}>
                {client?.telephone && <div>Tél : {client.telephone}</div>}
                {client?.ice && <div>ICE : {client.ice}</div>}
              </div>
            </div>
          ) : (
            <div style={{ border:'1px solid #ccc', borderRadius:4, padding:'10px 12px', color:'#aaa', fontSize:12 }}>Non spécifié</div>
          )}
        </div>
      </div>

      {/* ── TABLEAU ── */}
      <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:20 }}>
        <thead>
          <tr>
            <th style={{ padding:'9px 12px', textAlign:'left',   fontSize:11, fontWeight:700, textTransform:'uppercase', color:'#fff', background:'#7c3aed', borderRight:'1px solid rgba(255,255,255,0.3)' }}>Désignation</th>
            <th style={{ padding:'9px 12px', textAlign:'center', fontSize:11, fontWeight:700, textTransform:'uppercase', color:'#fff', background:'#7c3aed', width:80,  borderRight:'1px solid rgba(255,255,255,0.3)' }}>Qté</th>
            <th style={{ padding:'9px 12px', textAlign:'right',  fontSize:11, fontWeight:700, textTransform:'uppercase', color:'#fff', background:'#7c3aed', width:110, borderRight:'1px solid rgba(255,255,255,0.3)' }}>P.U. TTC</th>
            <th style={{ padding:'9px 12px', textAlign:'right',  fontSize:11, fontWeight:700, textTransform:'uppercase', color:'#fff', background:'#7c3aed', width:110 }}>Montant</th>
          </tr>
        </thead>
        <tbody>
          {lignesTri.map((l, i) => (
            <tr key={i} style={{ background: i%2===0 ? '#fff' : '#fafafa', borderBottom:'1px solid #ddd' }}>
              <td style={{ padding:'9px 12px', fontSize:12, color:'#000', borderRight:'1px solid #ddd' }}>{l.nom?.toUpperCase()}</td>
              <td style={{ padding:'9px 12px', textAlign:'center', fontSize:12, fontWeight:600, color:'#000', borderRight:'1px solid #ddd' }}>{l.quantite}</td>
              <td style={{ padding:'9px 12px', textAlign:'right',  fontSize:12, color:'#000', borderRight:'1px solid #ddd' }}>{Number(l.prix_unitaire).toFixed(2)}</td>
              <td style={{ padding:'9px 12px', textAlign:'right',  fontSize:12, fontWeight:600, color:'#000' }}>{(l.quantite * l.prix_unitaire).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── TOTAUX ── */}
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        <table style={{ borderCollapse:'collapse', minWidth:260 }}>
          <tbody>
            <tr>
              <td style={{ padding:'7px 14px', fontSize:12, color:'#555', borderBottom:'1px solid #ddd', borderLeft:'1px solid #ddd' }}>Total HT</td>
              <td style={{ padding:'7px 14px', fontSize:12, color:'#000', textAlign:'right', borderBottom:'1px solid #ddd', borderRight:'1px solid #ddd', minWidth:120 }}>{totalHT.toFixed(2)}</td>
            </tr>
            <tr>
              <td style={{ padding:'7px 14px', fontSize:12, color:'#555', borderBottom:'1px solid #ddd', borderLeft:'1px solid #ddd' }}>TVA {tva}%</td>
              <td style={{ padding:'7px 14px', fontSize:12, color:'#000', textAlign:'right', borderBottom:'1px solid #ddd', borderRight:'1px solid #ddd' }}>{montantTVA.toFixed(2)}</td>
            </tr>
            <tr style={{ background:'#7c3aed' }}>
              <td style={{ padding:'8px 14px', fontSize:13, fontWeight:700, color:'#fff', borderLeft:'1px solid #7c3aed' }}>Total TTC</td>
              <td style={{ padding:'8px 14px', fontSize:13, fontWeight:700, color:'#fff', textAlign:'right', borderRight:'1px solid #7c3aed' }}>{totalTTC.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── CONDITIONS ── */}
      <div style={{ padding:'10px 14px', background:'#f9f9f9', border:'1px solid #e0e0e0', borderRadius:6, marginBottom:16, fontSize:11, color:'#444', lineHeight:1.8 }}>
        <div style={{ fontWeight:700, marginBottom:4, color:'#000' }}>Conditions :</div>
        <div>• Prix en Dirhams TTC (TVA {tva}% incluse).</div>
        <div>• Des remises peuvent être négociées — contactez-nous.</div>
        {notes && <div>• {notes}</div>}
        <div>• Devis valable {validite} jours à compter du {dateF}.</div>
      </div>

      {/* ── QR + FOOTER ── */}
      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
        <div style={{ textAlign:'center' }}>
          <QRCode value={`DEVIS:${numero}|TOTAL:${totalTTC.toFixed(2)}`} size={65} />
          <div style={{ fontSize:10, color:'#888', marginTop:3 }}>{numero}</div>
        </div>
      </div>
      <DocFooter />
    </DocModal>
  )
}

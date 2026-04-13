import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabase } from '../../lib/supabase.js'
import toast from 'react-hot-toast'
import { Phone, Mail, MapPin, Send, Clock } from 'lucide-react'

const EDGE_URL = 'https://ugnmuxhgwiexuuetvbtd.supabase.co/functions/v1/dynamic-endpoint'
const ADMIN_EMAIL = 'contact@ijtihad-gaz.com'

export default function ClientContact() {
  const { profile } = useAuth()
  const [form, setForm] = useState({ sujet: '', message: '' })
  const [sending, setSending] = useState(false)

  async function sendMessage() {
    if (!form.sujet.trim()) { toast.error('Le sujet est obligatoire'); return }
    if (!form.message.trim()) { toast.error('Le message est obligatoire'); return }
    setSending(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(EDGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          to: ADMIN_EMAIL,
          subject: `📩 Message client — ${form.sujet}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f9f9f9;border-radius:8px;">
              <h1 style="color:#e85d04;font-size:24px;margin-bottom:4px;">Ijtihad Gaz</h1>
              <p style="color:#666;margin-bottom:24px;">Message d'un client</p>
              <div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:20px;margin-bottom:16px;">
                <div style="margin-bottom:12px;"><strong>Client :</strong> ${profile?.nom} (${profile?.numero_client})</div>
                <div style="margin-bottom:12px;"><strong>Email :</strong> ${profile?.email}</div>
                <div style="margin-bottom:12px;"><strong>Téléphone :</strong> ${profile?.telephone || '—'}</div>
                <div style="margin-bottom:12px;"><strong>Sujet :</strong> ${form.sujet}</div>
                <hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
                <div><strong>Message :</strong><br/><br/>${form.message.replace(/\n/g, '<br/>')}</div>
              </div>
            </div>
          `
        })
      })
      toast.success('Message envoyé ! Nous vous répondrons rapidement.')
      setForm({ sujet: '', message: '' })
    } catch(e) {
      toast.error('Erreur lors de l\'envoi')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Contactez-nous</h2>
        <p>Notre équipe est à votre disposition.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Coordonnées */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Nos coordonnées</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Phone size={18} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Téléphone</div>
                  <a href="tel:+212667337073" style={{ color: 'var(--accent)', fontSize: 15, fontWeight: 700 }}>06 67 33 70 73</a>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={18} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Email</div>
                  <a href="mailto:contact@ijtihad-gaz.com" style={{ color: 'var(--accent)', fontSize: 14 }}>contact@ijtihad-gaz.com</a>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={18} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Adresse</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    N° 67 LOT BLED SI THAMI<br />
                    2ème étage, Zemamra
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={18} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Horaires</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    Lundi — Vendredi : 8h00 — 18h00<br />
                    Samedi : 8h00 — 13h00
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <div className="card">
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Envoyer un message</h3>

          <div className="form-group">
            <label className="form-label">Sujet *</label>
            <select className="form-select" value={form.sujet} onChange={e => setForm(p => ({ ...p, sujet: e.target.value }))}>
              <option value="">-- Choisir un sujet --</option>
              <option value="Question sur ma commande">Question sur ma commande</option>
              <option value="Problème de livraison">Problème de livraison</option>
              <option value="Question sur ma facture">Question sur ma facture</option>
              <option value="Modification de mes informations">Modification de mes informations</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Message *</label>
            <textarea className="form-textarea" rows={6}
              placeholder="Décrivez votre demande..."
              value={form.message}
              onChange={e => setForm(p => ({ ...p, message: e.target.value }))} />
          </div>

          <button className="btn btn-primary" onClick={sendMessage} disabled={sending} style={{ width: '100%', justifyContent: 'center' }}>
            {sending ? <span className="spinner" /> : <Send size={14} />}
            Envoyer le message
          </button>
        </div>
      </div>
    </div>
  )
}

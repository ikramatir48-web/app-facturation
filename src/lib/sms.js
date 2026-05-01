import { supabase } from './supabase.js'

const SMS_URL = 'https://ugnmuxhgwiexuuetvbtd.supabase.co/functions/v1/send-sms'

async function sendSMS(to, message) {
  if (!to) return
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(SMS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({ to, message }),
    })
    const data = await res.json()
    if (!res.ok) console.error('SMS error:', data)
    return data
  } catch (e) {
    console.error('SMS error:', e)
  }
}

export async function smsCompteCreé(telephone, nom, email, motDePasse) {
  await sendSMS(telephone,
    `Ijtihad Gaz - Bonjour ${nom} ! Votre compte a été créé.\nUsername: ${email}\nMot de passe: ${motDePasse}\nConnectez-vous sur: ijtihad-gaz.com`
  )
}

export async function smsBienvenue(telephone, nom) {
  await sendSMS(telephone,
    `Ijtihad Gaz - Bienvenue ${nom} ! Votre espace client est prêt sur ijtihad-gaz.com. Pour toute question: 06 67 33 70 73`
  )
}

export async function smsCommandeLivree(telephone, nom, numeroCommande) {
  await sendSMS(telephone,
    `Ijtihad Gaz - Bonjour ${nom}, votre commande ${numeroCommande} a été livrée. Merci pour votre confiance ! Pour toute question: 06 67 33 70 73`
  )
}

export async function smsOTP(telephone, code) {
  await sendSMS(telephone,
    `Ijtihad Gaz - Votre code de vérification: ${code}. Valable 10 minutes.`
  )
}

export async function smsFete(telephone, nom, messageFete) {
  await sendSMS(telephone,
    `Ijtihad Gaz - ${messageFete} ${nom} ! Ijtihad Gaz vous souhaite une belle fête.`
  )
}

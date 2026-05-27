import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    console.log('send-push called, body keys:', Object.keys(body))

    // Accept both direct calls and Supabase DB webhook format
    const record = body.record ?? body

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')!
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    webpush.setVapidDetails('mailto:admin@elderlycare.app', vapidPublic, vapidPrivate)

    let familyIds: string[] = []
    let payload: string

    // ── Direct push to a specific user (e.g. unlink notification) ────────────
    if (record.target_user_id) {
      familyIds = [record.target_user_id]
      payload = JSON.stringify({
        title: record.title ?? '🔔 עדכון',
        body: record.body ?? '',
        tag: `direct-${record.target_user_id}-${Date.now()}`,
        data: { type: 'direct' },
      })
    } else {
      // ── Medication taken push (from DB webhook) ─────────────────────────────
      const elderlyUserId: string = record.elderly_user_id
      const medicationNames: string[] = record.medication_names ?? []
      const takenAt: string = record.taken_at ?? new Date().toISOString()

      if (!elderlyUserId) {
        return new Response(JSON.stringify({ error: 'missing elderly_user_id' }), { status: 400, headers: corsHeaders })
      }

      const { data: elderlyProfile } = await supabase
        .from('profiles').select('name').eq('id', elderlyUserId).single()
      const elderlyName = elderlyProfile?.name ?? 'הקשיש'

      const { data: links } = await supabase
        .from('family_links').select('family_user_id').eq('elderly_user_id', elderlyUserId)

      if (!links || links.length === 0) {
        return new Response(JSON.stringify({ sent: 0, note: 'no linked family members' }), { headers: corsHeaders })
      }

      familyIds = links.map((l: { family_user_id: string }) => l.family_user_id)

      const timeStr = new Date(takenAt).toLocaleTimeString('he-IL', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem',
      })

      payload = JSON.stringify({
        title: `✅ ${elderlyName} לקח/ה תרופות`,
        body: medicationNames.length > 0 ? `${medicationNames.join(', ')} – שעה ${timeStr}` : `שעה ${timeStr}`,
        tag: `med-taken-${elderlyUserId}-${Date.now()}`,
        data: { elderlyUserId, type: 'med-taken' },
      })
    }

    // Get push subscriptions
    const { data: subs, error: subsErr } = await supabase
      .from('push_subscriptions').select('subscription, user_id').in('user_id', familyIds)
    console.log('subscriptions found:', subs?.length, 'err:', subsErr)

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, note: 'no push subscriptions' }), { headers: corsHeaders })
    }

    let sent = 0
    const errors: string[] = []

    for (const { subscription } of subs) {
      try {
        await webpush.sendNotification(subscription, payload)
        sent++
        console.log('push sent to user, endpoint:', subscription.endpoint?.slice(0, 50))
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string }
        console.error('push failed:', e?.statusCode, e?.message)
        if (e?.statusCode === 410 || e?.statusCode === 404) {
          // Subscription expired – remove it
          await supabase.from('push_subscriptions')
            .delete().eq('user_id', subs.find((s: { subscription: { endpoint: string } }) => s.subscription.endpoint === subscription.endpoint)?.user_id)
        } else {
          errors.push(`${e?.statusCode}: ${e?.message}`)
        }
      }
    }

    console.log(`Done: sent=${sent}, errors=${errors.length}`)
    return new Response(JSON.stringify({ sent, errors }), { headers: corsHeaders })
  } catch (err) {
    console.error('send-push fatal error:', String(err))
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

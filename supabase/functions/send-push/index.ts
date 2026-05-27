import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore – npm: specifier supported in Supabase Edge Runtime
import webpush from 'npm:web-push@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()

    // Accept both direct calls and Supabase DB webhook format
    const record = body.record ?? body

    const elderlyUserId: string = record.elderly_user_id
    const medicationNames: string[] = record.medication_names ?? []
    const takenAt: string = record.taken_at ?? new Date().toISOString()

    if (!elderlyUserId) {
      return new Response(JSON.stringify({ error: 'missing elderly_user_id' }), { status: 400, headers: corsHeaders })
    }

    // Service-role client to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Get elderly user's name
    const { data: elderlyProfile } = await supabase
      .from('profiles').select('name').eq('id', elderlyUserId).single()
    const elderlyName = elderlyProfile?.name ?? 'הקשיש'

    // Get all family users linked to this elderly user
    const { data: links } = await supabase
      .from('family_links')
      .select('family_user_id')
      .eq('elderly_user_id', elderlyUserId)

    if (!links || links.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: corsHeaders })
    }

    const familyIds = links.map((l: { family_user_id: string }) => l.family_user_id)

    // Get all push subscriptions for these family users
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('subscription, user_id')
      .in('user_id', familyIds)

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, note: 'no subscriptions' }), { headers: corsHeaders })
    }

    // Configure web-push
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')!
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!
    webpush.setVapidDetails('mailto:admin@elderlycare.app', vapidPublic, vapidPrivate)

    const timeStr = new Date(takenAt).toLocaleTimeString('he-IL', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem',
    })

    const payload = JSON.stringify({
      title: `✅ ${elderlyName} לקח/ה תרופות`,
      body: `${medicationNames.join(', ')} – שעה ${timeStr}`,
      tag: `med-taken-${elderlyUserId}-${takenAt}`,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { elderlyUserId, type: 'med-taken' },
    })

    let sent = 0
    const errors: string[] = []

    await Promise.all(subs.map(async ({ subscription }: { subscription: PushSubscription }) => {
      try {
        await webpush.sendNotification(subscription, payload)
        sent++
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string }
        // 410 Gone = subscription expired, remove it
        if (e?.statusCode === 410) {
          await supabase.from('push_subscriptions')
            .delete().eq('subscription->>endpoint', (subscription as { endpoint: string }).endpoint)
        } else {
          errors.push(e?.message ?? 'unknown error')
        }
      }
    }))

    return new Response(JSON.stringify({ sent, errors }), { headers: corsHeaders })
  } catch (err) {
    console.error('send-push error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

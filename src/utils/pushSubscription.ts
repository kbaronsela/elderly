import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
    if (!VAPID_PUBLIC_KEY) return false

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      } as PushSubscriptionOptionsInit)
    }

    const subJson = sub.toJSON()

    // Upsert subscription in Supabase
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      subscription: subJson,
    }, { onConflict: 'user_id,subscription->endpoint' })

    if (error) {
      // If unique constraint issue, try plain insert
      await supabase.from('push_subscriptions').insert({ user_id: userId, subscription: subJson })
    }

    return true
  } catch (err) {
    console.warn('Push subscription failed:', err)
    return false
  }
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.ready
    const sub = await reg?.pushManager.getSubscription()
    if (sub) {
      const endpoint = sub.endpoint
      await sub.unsubscribe()
      await supabase.from('push_subscriptions').delete()
        .eq('user_id', userId).eq('subscription->>endpoint', endpoint)
    }
  } catch (err) {
    console.warn('Unsubscribe failed:', err)
  }
}

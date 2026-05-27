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
    if (!VAPID_PUBLIC_KEY) {
      console.warn('VAPID_PUBLIC_KEY missing')
      return false
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const reg = await navigator.serviceWorker.ready

    // Reuse existing subscription if it exists – avoids FCM re-registration delay
    let sub = await reg.pushManager.getSubscription()

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      } as PushSubscriptionOptionsInit)
    }

    const subJson = sub.toJSON()

    // Save to Supabase (delete old entries for this user first)
    await supabase.from('push_subscriptions').delete().eq('user_id', userId)
    const { error } = await supabase.from('push_subscriptions').insert({
      user_id: userId,
      subscription: subJson,
    })

    if (error) {
      console.error('Failed to save push subscription:', error)
      return false
    }

    console.log('Push subscription saved, endpoint prefix:', sub.endpoint.slice(0, 60))
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
      await sub.unsubscribe()
      await supabase.from('push_subscriptions').delete().eq('user_id', userId)
    }
  } catch (err) {
    console.warn('Unsubscribe failed:', err)
  }
}

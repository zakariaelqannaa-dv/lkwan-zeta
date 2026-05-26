import { supabase } from '../supabaseClient'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

async function saveSubscription(subscription) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return false
    await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
      auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))),
      device_name: navigator.userAgent
    })
    return true
  } catch {
    return false
  }
}

async function removeSubscription() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) {
      await supabase.from('push_subscriptions').delete().eq('user_id', user.id)
    }
  } catch {
    /* table may not exist - ignore */
  }
}

export async function registerPush() {
  if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) {
    return false
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  try {
    const registration = await navigator.serviceWorker.ready
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) return false

    const existing = await registration.pushManager.getSubscription()
    if (existing) return true

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    })

    await saveSubscription(subscription)
    return true
  } catch {
    return false
  }
}

export async function unregisterPush() {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) await subscription.unsubscribe()
    await removeSubscription()
    return true
  } catch {
    return false
  }
}

export async function getPushPermission() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

let ctx = null
let pending = false
let listening = false
let lastPlayed = 0
const COOLDOWN_MS = 1000

function playSound() {
  if (!ctx || ctx.state !== 'running') return
  const now = ctx.currentTime

  const osc1 = ctx.createOscillator()
  const gain1 = ctx.createGain()
  osc1.type = 'sine'
  osc1.frequency.value = 660
  gain1.gain.setValueAtTime(0.3, now)
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
  osc1.connect(gain1).connect(ctx.destination)
  osc1.start(now)
  osc1.stop(now + 0.2)

  const osc2 = ctx.createOscillator()
  const gain2 = ctx.createGain()
  osc2.type = 'sine'
  osc2.frequency.value = 880
  gain2.gain.setValueAtTime(0.25, now + 0.1)
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
  osc2.connect(gain2).connect(ctx.destination)
  osc2.start(now + 0.1)
  osc2.stop(now + 0.3)
}

function flushPending() {
  if (pending) {
    pending = false
    playSound()
  }
}

function onUserGesture() {
  if (listening) {
    document.removeEventListener('pointerdown', onUserGesture)
    document.removeEventListener('touchstart', onUserGesture)
    document.removeEventListener('keydown', onUserGesture)
    listening = false
  }

  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
  }

  if (ctx.state === 'suspended') {
    ctx.resume().then(flushPending).catch(() => {})
  } else {
    flushPending()
  }
}

function setupGestureListener() {
  if (listening) return
  listening = true
  document.addEventListener('pointerdown', onUserGesture)
  document.addEventListener('touchstart', onUserGesture)
  document.addEventListener('keydown', onUserGesture)
}

export function playNotificationSound() {
  const now = Date.now()
  if (now - lastPlayed < COOLDOWN_MS) return
  lastPlayed = now

  try {
    if (navigator.vibrate) {
      navigator.vibrate(200)
    }

    if (ctx && ctx.state === 'running') {
      playSound()
      return
    }

    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)()
      if (ctx.state === 'running') {
        playSound()
        return
      }
      ctx.resume().then(() => {
        if (ctx.state === 'running') flushPending()
      }).catch(() => {
        pending = false
      })
    }

    pending = true
    setupGestureListener()
  } catch {

  }
}

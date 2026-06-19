import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const NOISE_PATTERNS = [
  'add-ardi', 'add_biar_support',
  'chrome-extension://', 'moz-extension://',
  'runtime.lasterror', 'unchecked runtime.lasterror',
  'could not establish connection',
  'receiving end does not exist',
  'sentry', 'ingest.sentry',
  'o22381.ingest.us.sentry.io',
  'sentry.javascript.nextjs',
  'spotifycdn', 'playready',
  'err_blocked', 'err_failed', 'err_blocked_by_client',
  'failed to load resource',
  'com.microsoft.playready', 'requestmediakeysystemaccess',
  'setservercertificate', 'generaterequest',
  'webgpu', 'navigator.gpu'
]

const isNoise = (value) => {
  const text = String(value || '').toLowerCase()
  return NOISE_PATTERNS.some(p => text.includes(p))
}

window.addEventListener('error', (e) => {
  const src = String(e.target?.src || e.filename || e.message || '')
  if (isNoise(src) || (e.target && isNoise(String(e.target?.baseURI || '')))) {
    e.preventDefault()
    e.stopPropagation()
  }
}, true)

window.addEventListener('unhandledrejection', (e) => {
  const url = e.reason?.message || e.reason?.stack || ''
  if (isNoise(url)) {
    e.preventDefault()
    e.stopPropagation()
  }
})

const _fetch = window.fetch
window.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input?.url
  if (url && isNoise(url)) return Promise.resolve(new Response(null, { status: 200 }))
  return _fetch(input, init)
}

const _sendBeacon = navigator.sendBeacon.bind(navigator)
navigator.sendBeacon = (url, data) => {
  if (isNoise(url)) return true
  return _sendBeacon(url, data)
}

const _XHR = window.XMLHttpRequest
class PatchedXHR extends _XHR {
  open(method, url, ...args) {
    this.__noise = url && isNoise(String(url))
    super.open(method, url, ...args)
  }
  send(body) {
    if (this.__noise) return
    super.send(body)
  }
}
window.XMLHttpRequest = PatchedXHR

const _consoleError = console.error
const _consoleWarn = console.warn
const _consoleLog = console.log
const isNoiseString = (s) => isNoise(s)
const patchConsole = (orig) => function(...args) {
  for (const a of args) {
    if (isNoiseString(a) || (a instanceof Error && isNoiseString(a.message)) || (a && isNoiseString(String(a)))) return
  }
  return orig.apply(this, args)
}
console.error = patchConsole(_consoleError)
console.warn = patchConsole(_consoleWarn)
console.log = patchConsole(_consoleLog)

const isStandalone = window.navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches

if (isStandalone) {
  document.documentElement.classList.add('pwa-standalone')
}

document.addEventListener('play', (e) => {
  const el = e.target
  if (el.tagName !== 'VIDEO' && el.tagName !== 'AUDIO') return
  document.querySelectorAll('video, audio').forEach(other => {
    if (other !== el && !other.paused) other.pause()
  })
  document.querySelectorAll('iframe[src*="youtube-nocookie.com/embed"]').forEach(iframe => {
    iframe.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }),
      '*'
    )
  })
}, true)

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

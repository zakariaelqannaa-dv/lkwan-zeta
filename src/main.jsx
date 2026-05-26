import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const NOISE_PATTERNS = [
  'add-ardi', 'add_biar_support',
  'chrome-extension://', 'moz-extension://',
  'sentry', 'ingest.sentry',
  'o22381.ingest.us.sentry.io',
  'spotifycdn', 'playready',
  'ERR_BLOCKED', 'ERR_FAILED',
  'com.microsoft.playready',
  'webgpu', 'navigator.gpu'
]

const isNoise = (url) => NOISE_PATTERNS.some(p => url.includes(p))

window.addEventListener('error', (e) => {
  const src = String(e.target?.src || e.filename || e.message || '')
  if (isNoise(src) || (e.target && isNoise(String(e.target?.baseURI || '')))) {
    e.preventDefault()
    e.stopPropagation()
  }
}, true)

window.addEventListener('unhandledrejection', (e) => {
  const url = e.reason?.message || e.reason?.stack || ''
  if (isNoise(url)) e.preventDefault()
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
const isNoiseString = (s) => typeof s === 'string' && (NOISE_PATTERNS.some(p => s.includes(p)))
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

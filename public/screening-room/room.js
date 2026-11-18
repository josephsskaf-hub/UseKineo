const get = (id) => document.getElementById(id)
const rows = [...document.querySelectorAll('.film-row')]
const kind = document.body.dataset.room
const files = rows.map((row) => ({
  title: row.dataset.title,
  engine: row.dataset.engine,
  poster: row.querySelector('img').getAttribute('src'),
  texture: '/screening-room/' + row.dataset.film + '.mp4',
  movie: '/previews/leve-1111/' + row.dataset.film + '.mp4',
}))
const motion = matchMedia('(prefers-reduced-motion: reduce)')
const art = get('art'),
  host = get('viewport'),
  toggle = get('activate'),
  dialog = document.querySelector('dialog')
let selected = Number(document.body.dataset.selected),
  session = null,
  controller = null,
  wordTimer = 0,
  unavailable = false,
  preferStill = false
const modulo = (n) => ((n % files.length) + files.length) % files.length

function select(n) {
  selected = modulo(n)
  const film = files[selected]
  rows.forEach((row, i) => row.setAttribute('aria-pressed', String(i === selected)))
  document.querySelectorAll('.poster').forEach((img, i) => {
    img.src = files[modulo(selected + i - 1)].poster
  })
  get('engine').textContent = film.engine
  get('title').textContent = film.title
  session?.select(selected)
}
let meterTimer
const meter = get('meter')
function resetMeter() {
  clearTimeout(meterTimer)
  meter.disabled = false
  meter.textContent = 'Measure FPS'
}
meter.onclick = () => {
  const began = performance.now()
  const first = Number(host.dataset.frames || 0)
  meter.disabled = true
  meter.textContent = 'Measuring · 10 s'
  meterTimer = setTimeout(() => {
    const rate = ((Number(host.dataset.frames) - first) * 1000) / (performance.now() - began)
    meter.textContent = rate.toFixed(1) + ' FPS · ' + host.dataset.backend
    meter.disabled = false
  }, 10000)
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) resetMeter()
})
function stop() {
  resetMeter()
  meter.hidden = true
  controller?.abort()
  controller = null
  session?.destroy()
  session = null
  art.classList.remove('live')
  host.replaceChildren()
  delete host.dataset.backend
  delete host.dataset.frames
  get('slate').textContent = 'Still preview'
  toggle.textContent = 'Explore in 3D'
  toggle.disabled = false
}
function fallback() {
  stop()
  unavailable = true
  toggle.hidden = true
  get('instructions').hidden = true
  get('state').textContent = 'Still view. You can browse and play each film.'
}
async function start() {
  if (motion.matches || controller || unavailable) return
  const current = new AbortController()
  controller = current
  toggle.textContent = 'Opening 3D…'
  toggle.disabled = true
  try {
    const { enter } = await import('./scene.js')
    if (current.signal.aborted) return
    const result = await enter({
      host,
      kind,
      films: files,
      initial: selected,
      idea: get('idea').value,
      select,
      open: watch,
      fail: fallback,
      signal: current.signal,
    })
    if (current.signal.aborted) {
      result.destroy()
      return
    }
    session = result
    session.select(selected)
    session.pause(dialog.open)
    if (kind === 'b') session.words(get('idea').value)
    art.classList.add('live')
    meter.hidden = false
    toggle.disabled = false
    toggle.textContent = 'Still view'
    get('slate').textContent = { a: 'Film carousel', b: 'Particle assembly', c: 'Interactive corridor' }[kind]
    get('state').textContent = ''
  } catch {
    if (!current.signal.aborted) fallback()
  }
}
function preference() {
  stop()
  toggle.hidden = motion.matches || unavailable
  get('instructions').hidden = toggle.hidden
  get('state').textContent = motion.matches
    ? 'Still view · reduced motion. Choose a film to watch.'
    : unavailable
      ? 'Still view. You can browse and play each film.'
      : ''
}
function watch(i) {
  resetMeter()
  select(i)
  const film = files[selected],
    player = get('player')
  get('watch-title').textContent = film.title
  player.poster = film.poster
  player.src = film.movie
  if (!dialog.open) dialog.showModal()
  session?.pause(true)
  void player.play().catch(() => {})
}
dialog.addEventListener('close', () => {
  const player = get('player')
  player.pause()
  player.removeAttribute('src')
  player.load()
  session?.pause(false)
})
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close()
})
get('close').onclick = () => dialog.close()
get('watch').onclick = () => watch(selected)
rows.forEach((row, i) => {
  row.onclick = () => select(i)
})
get('prev').onclick = () => select(selected - 1)
get('next').onclick = () => select(selected + 1)
get('theme').onclick = () => {
  const root = document.documentElement
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'
}
toggle.onclick = () => {
  preferStill = !!session
  if (preferStill) stop()
  else void start()
}
get('idea').addEventListener('input', () => {
  if (kind !== 'b' || motion.matches || unavailable || preferStill) return
  // The text remains local until the native form opens the Studio.
  clearTimeout(wordTimer)
  wordTimer = setTimeout(() => {
    if (session) session.words(get('idea').value)
    else if (get('idea').value.trim()) void start()
  }, 160)
})
motion.addEventListener('change', preference)
window.addEventListener('pagehide', () => {
  clearTimeout(wordTimer)
  stop()
})
preference()
document.documentElement.dataset.interactive = 'true'
performance.mark('screening-room-interactive')

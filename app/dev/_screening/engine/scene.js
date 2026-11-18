import {
  BoxGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  VideoTexture,
  WebGPURenderer,
  UnsignedByteType,
} from 'three/webgpu'
import { filmStock, mosaicGeometry, setWords } from './frames.js'

const tau = 2 * Math.PI
const damp = (x, y, dt, speed = 6) => x + (y - x) * (1 - Math.exp(-dt * speed))
const wrap = (n, count) => ((n % count) + count) % count

export async function enter({ host, kind, films, initial, idea, select, open, fail, signal }) {
  const canvas = document.createElement('canvas')
  host.append(canvas)
  const renderer = new WebGPURenderer({
    canvas,
    alpha: true,
    antialias: true,
    outputBufferType: UnsignedByteType,
  })
  const scene = new Scene(),
    camera = new PerspectiveCamera(37, 1, 0.1, 100)
  const cleanup = [],
    frames = [],
    videos = [],
    picks = []
  const gates = [],
    ray = new Raycaster()
  let dead = false,
    raf = 0,
    observer,
    inView = true,
    paused = false,
    ready = false
  let target = initial,
    position = initial,
    pointerX = 0,
    pointerY = 0,
    lookX = 0,
    lookY = 0
  let clock = 0,
    previous = 0,
    assemblyStart = -1,
    frameCount = 0,
    selected = initial
  let initialized = false
  const geometry = kind === 'b' ? mosaicGeometry(42, 64) : new PlaneGeometry(1, 1)
  const track = (resource) => {
    cleanup.push(resource)
    return resource
  }
  track(geometry)
  const listen = (target, type, fn, options = {}) => target.addEventListener(type, fn, { ...options, signal })
  function destroy() {
    if (dead) return
    dead = true
    cancelAnimationFrame(raf)
    observer?.disconnect()
    videos.forEach((video) => {
      video.pause()
      video.removeAttribute('src')
      video.load()
    })
    for (const resource of cleanup) resource.dispose()
    if (initialized) renderer.dispose()
    canvas.remove()
  }
  signal.addEventListener('abort', destroy, { once: true })
  function broken() {
    if (!dead) {
      destroy()
      fail()
    }
  }
  try {
    await renderer.init()
    initialized = true
    if (dead || signal.aborted) {
      renderer.dispose()
      throw new Error('Cancelled')
    }
    renderer.onDeviceLost = broken
    listen(canvas, 'webglcontextlost', broken)
    renderer.setClearColor(0x000000, 0)
    const loader = new TextureLoader()
    const posters = await Promise.all(
      films.map(async (f) => {
        const image = await loader.loadAsync(f.poster)
        if (dead) {
          image.dispose()
          throw new Error('Cancelled')
        }
        image.colorSpace = SRGBColorSpace
        return track(image)
      }),
    )
    if (dead) throw new Error('Cancelled')
    for (let i = 0; i < films.length; i++) {
      const group = new Group()
      const stock = filmStock(posters[i], kind === 'b')
      stock.material.side = DoubleSide
      track(stock.material)
      const face = new Mesh(geometry, stock.material)
      face.frustumCulled = false
      face.userData.film = i
      group.add(face)
      scene.add(group)
      picks.push(face)
      frames.push({ group, face, progress: stock.progress, live: null })
    }
    // A corridor of physical brass portal frames recedes past the camera, built from shared geometry.
    if (kind === 'c') {
      const brass = track(new MeshBasicMaterial({ color: new Color('#a79672') }))
      const unit = track(new BoxGeometry(1, 1, 1))
      for (let i = -1; i < 7; i++) {
        const gate = new Group()
        for (const side of [-1, 1]) {
          const post = new Mesh(unit, brass)
          post.scale.set(0.025, 3.35, 0.05)
          post.position.x = side * 2.48
          gate.add(post)
          const rail = new Mesh(unit, brass)
          rail.scale.set(4.98, 0.025, 0.05)
          rail.position.y = side * 1.675
          gate.add(rail)
        }
        scene.add(gate)
        gate.userData.station = i
        gates.push(gate)
      }
    }
    if (kind === 'b') {
      setWords(geometry, idea)
      assemblyStart = 0
    }
    observer = new ResizeObserver(resize)
    observer.observe(host)
    const visibility = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      schedule()
    })
    visibility.observe(host)
    signal.addEventListener('abort', () => visibility.disconnect(), { once: true })
    listen(document, 'visibilitychange', schedule)
    const pointer = (e) => {
      const r = canvas.getBoundingClientRect()
      pointerX = ((e.clientX - r.left) / r.width) * 2 - 1
      pointerY = ((e.clientY - r.top) / r.height) * 2 - 1
    }
    listen(canvas, 'pointermove', pointer)
    listen(canvas, 'pointerleave', () => {
      pointerX = 0
      pointerY = 0
    })
    let lastWheel = 0,
      press = null
    listen(
      canvas,
      'wheel',
      (e) => {
        if (Math.abs(e.deltaY) + Math.abs(e.deltaX) < 8 || performance.now() - lastWheel < 450) return
        lastWheel = performance.now()
        select(selected + Math.sign(e.deltaY || e.deltaX))
      },
      { passive: true },
    )
    listen(canvas, 'pointerdown', (e) => {
      press = { x: e.clientX, y: e.clientY }
    })
    listen(canvas, 'pointerup', (e) => {
      if (!press) return
      const dx = e.clientX - press.x,
        dy = e.clientY - press.y
      press = null
      if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) {
        select(selected - Math.sign(dx))
        return
      }
      if (Math.abs(dx) + Math.abs(dy) > 15) return
      pointer(e)
      ray.setFromCamera(new Vector2(pointerX, -pointerY), camera)
      const hit = ray.intersectObjects(picks, false)[0]
      if (hit) {
        const i = hit.object.userData.film
        select(i)
        if (kind === 'c') open(i)
      }
    })
    resize()
    ready = true
    draw(0)
    host.dataset.backend = renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL2'
    if (kind === 'b') loadVideo(selected)
    else for (let i = 0; i < films.length; i++) loadVideo(i)
    schedule()
    return {
      destroy,
      select: choose,
      words,
      pause(value) {
        paused = value
        schedule()
      },
    }
  } catch (error) {
    destroy()
    throw error
  }

  function choose(index) {
    const step = wrap(index - wrap(target, films.length) + films.length / 2, films.length) - films.length / 2
    target += step
    selected = index
    if (kind === 'b') {
      assemblyStart = clock
      loadVideo(index)
      schedule()
    }
  }
  function words(value) {
    if (kind !== 'b') return
    setWords(geometry, value)
    assemblyStart = clock
  }
  function loadVideo(i) {
    if (videos[i]) return
    const video = document.createElement('video')
    videos[i] = video
    video.muted = true
    video.loop = true
    video.playsInline = true
    video.preload = 'auto'
    listen(
      video,
      'loadeddata',
      () => {
        if (dead || frames[i].live) return
        const map = track(new VideoTexture(video))
        map.colorSpace = SRGBColorSpace
        const stock = filmStock(map, kind === 'b')
        stock.material.side = DoubleSide
        track(stock.material)
        const frame = frames[i]
        frame.live = map
        frame.face.material = stock.material
        frame.progress = stock.progress
      },
      { once: true },
    )
    video.src = films[i].texture
    if (active() && (kind !== 'b' || i === selected)) void video.play().catch(() => {})
  }
  function resize() {
    if (dead) return
    const { width, height } = host.getBoundingClientRect()
    if (!width || !height) return
    renderer.setPixelRatio(Math.min(devicePixelRatio, width < 700 ? 1.35 : 1.5))
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  function active() {
    return ready && !dead && !paused && inView && !document.hidden
  }
  function schedule() {
    cancelAnimationFrame(raf)
    previous = 0
    videos.forEach((video, i) => {
      if (active() && (kind !== 'b' || i === selected)) void video.play().catch(() => {})
      else video.pause()
    })
    if (active()) raf = requestAnimationFrame(loop)
  }
  function loop(now) {
    if (!active()) return
    const dt = previous ? Math.min(0.08, (now - previous) / 1000) : 0
    previous = now
    clock += dt
    try {
      draw(dt)
    } catch {
      broken()
      return
    }
    // Exposed only on the private preview for measuring actual completed render calls.
    host.dataset.frames = String(++frameCount)
    raf = requestAnimationFrame(loop)
  }
  function draw(dt) {
    position = damp(position, target, dt, 5)
    lookX = damp(lookX, pointerX, dt)
    lookY = damp(lookY, pointerY, dt)
    const narrow = camera.aspect < 1.55
    const span = Math.min(camera.aspect, 2.6)
    camera.position.set(lookX * 0.24, -lookY * 0.11, narrow ? 7.7 : 6.8)
    camera.lookAt(0, 0, 0)
    frames.forEach(({ group, progress }, i) => {
      const angle = ((i - position) * tau) / films.length
      const front = Math.cos(angle),
        side = Math.sin(angle)
      if (kind === 'a') {
        group.position.set(side * span * 1.12, 0.1 + Math.sin(clock * 0.73 + i) * 0.11, front * 1.34 - 0.5)
        group.rotation.set(
          -0.035 + lookY * 0.055,
          -side * 0.47 + lookX * 0.075,
          -side * 0.13 + Math.sin(clock * 0.44 + i) * 0.029,
        )
        group.scale.set(1.68, 2.91, 1)
      } else if (kind === 'b') {
        const age = Math.max(0, Math.min(1, (clock - assemblyStart - 0.68) / 1.9))
        const formed = age * age * (3 - 2 * age)
        progress.value = formed
        group.position.set(0, 0.06, 0.15)
        group.rotation.set(-0.055 + lookY * 0.08, -0.12 + lookX * 0.12, -0.05 * formed)
        const width = Math.min(6.9, span * (narrow ? 4.65 : 4.0))
        group.scale.set(width, width * 0.46, 1)
        group.visible = i === selected
      } else {
        const depth = wrap(i - position + 1.25, films.length) - 1.25
        const wall = i % 2 === 0 ? -1 : 1
        group.position.set(wall * (narrow ? 1.33 : 2.22), 0.02, 0.9 - depth * 3.1)
        group.rotation.set(0, -wall * 0.83, 0)
        group.scale.set(1.84, 3.1, 1)
      }
    })
    if (kind === 'c') {
      const travel = position - Math.floor(position)
      for (const gate of gates) {
        gate.position.z = 1.35 - (gate.userData.station - travel) * 3.1
        gate.scale.x = narrow ? 0.68 : 1.03
      }
      camera.position.z = narrow ? 6.5 : 5.65
      camera.position.x += Math.sin(clock * 0.35) * 0.13
      camera.lookAt(-Math.cos(position * Math.PI) * 0.34, 0, -2)
    }
    renderer.render(scene, camera)
  }
}

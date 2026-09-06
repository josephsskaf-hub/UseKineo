import { drawRect, outputSize, validateSettings, MAX_FILE_BYTES, MAX_CLIP_SECONDS, type ClipInfo, type EditSettings } from './settings'

export function recordingMime(): string | null {
  if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement === 'undefined' || !HTMLCanvasElement.prototype.captureStream || typeof AudioContext === 'undefined') return null
  return ['video/mp4;codecs=avc1.424028,mp4a.40.2', 'video/webm;codecs=vp8,opus', 'video/webm'].find(mime => MediaRecorder.isTypeSupported(mime)) ?? null
}

function waitMedia(video: HTMLVideoElement, event: string, signal: AbortSignal, ready: () => boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => { clearTimeout(timer); video.removeEventListener(event, ok); video.removeEventListener('error', fail); signal.removeEventListener('abort', abort); error ? reject(error) : resolve() }
    const ok = () => finish(), fail = () => finish(new Error('decode_failed')), abort = () => finish(new Error('cancelled'))
    const timer = setTimeout(() => finish(new Error('decode_failed')), 15000)
    video.addEventListener(event, ok, { once: true }); video.addEventListener('error', fail, { once: true }); signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort(); else if (ready()) ok()
  })
}

async function decodeInfo(file: Blob, signal: AbortSignal): Promise<ClipInfo> {
  const url = URL.createObjectURL(file), video = document.createElement('video')
  video.preload = 'auto'; video.muted = true; video.playsInline = true; video.src = url
  try {
    await waitMedia(video, 'loadedmetadata', signal, () => video.readyState >= 1)
    // Some locally recorded WebM files do not carry a duration header. Let the decoder locate the end.
    if (video.duration === Infinity) { video.currentTime = 1e7; await waitMedia(video, 'durationchange', signal, () => Number.isFinite(video.duration)) }
    const info = { duration: video.duration, width: video.videoWidth, height: video.videoHeight }
    if (!Number.isFinite(info.duration) || info.duration <= 0 || !info.width || !info.height) throw new Error('decode_failed')
    return info
  } finally { video.pause(); video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url) }
}

export async function readClip(file: File, signal: AbortSignal): Promise<ClipInfo> {
  if (!file.size || file.size > MAX_FILE_BYTES) throw new Error('file_limits')
  const info = await decodeInfo(file, signal)
  if (info.duration > MAX_CLIP_SECONDS || info.width > 8192 || info.height > 8192) throw new Error('clip_limits')
  return info
}

/** Same canvas drawing is used in the live preview and in the downloaded file. */
export function drawFrame(canvas: HTMLCanvasElement, video: HTMLVideoElement, settings: EditSettings) {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('unsupported')
  const { width, height } = canvas
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height)
  if (video.readyState >= 2) {
    const rect = drawRect(video.videoWidth, video.videoHeight, width, height, settings.fit)
    ctx.drawImage(video, rect.x, rect.y, rect.width, rect.height)
  }
  const text = settings.text.trim()
  if (!text) return
  const fontSize = Math.max(12, Math.round(width * .054))
  ctx.font = `700 ${fontSize}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  // Wrap by Unicode code point, including languages without spaces; no hidden truncation.
  const lines: string[] = []; let line = ''
  for (const char of text) {
    if (char === '\n') { lines.push(line); line = ''; continue }
    if (ctx.measureText(line + char).width > width * .84 && line) { lines.push(line); line = char } else line += char
  }
  if (line) lines.push(line)
  const lineHeight = fontSize * 1.35, blockHeight = lines.length * lineHeight
  const middle = settings.position === 'top' ? height * .12 + blockHeight / 2 : settings.position === 'center' ? height / 2 : height * .88 - blockHeight / 2
  ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(width * .04, middle - blockHeight / 2 - fontSize * .3, width * .92, blockHeight + fontSize * .6)
  ctx.fillStyle = '#fff'; lines.forEach((value, i) => ctx.fillText(value, width / 2, middle + (i - (lines.length - 1) / 2) * lineHeight))
}

/** Real-time local re-encoding. No fetch, server, account, storage or billing. */
export async function exportClip(file: File, info: ClipInfo, settings: EditSettings, signal: AbortSignal, progress: (value: number) => void): Promise<Blob> {
  validateSettings(settings, info)
  const mime = recordingMime()
  if (!mime) throw new Error('unsupported')
  if (document.hidden) throw new Error('keep_visible')
  const audio = settings.mute ? null : new AudioContext()
  // Resume inside the user's click, before waiting for metadata.
  const audioReady = audio?.resume()
  const url = URL.createObjectURL(file), video = document.createElement('video'), canvas = document.createElement('canvas')
  video.playsInline = true; video.preload = 'auto'; video.src = url; video.playbackRate = settings.speed; video.muted = settings.mute
  const size = outputSize(info.width, info.height, settings.aspect); canvas.width = size.width; canvas.height = size.height
  let stream: MediaStream | undefined, recorder: MediaRecorder | undefined, source: MediaElementAudioSourceNode | undefined, destination: MediaStreamAudioDestinationNode | undefined
  let frame: ReturnType<typeof setTimeout> | undefined, timeout: ReturnType<typeof setTimeout> | undefined
  const chunks: Blob[] = []
  try {
    await audioReady
    if (audio && audio.state !== 'running') throw new Error('audio_unavailable')
    await waitMedia(video, 'loadeddata', signal, () => video.readyState >= 2)
    if (settings.start > 0) { video.currentTime = settings.start; await waitMedia(video, 'seeked', signal, () => !video.seeking && Math.abs(video.currentTime - settings.start) < .03) }
    if (signal.aborted) throw new Error('cancelled')
    drawFrame(canvas, video, settings)
    // Explicit frames retain duration even when the image is momentarily still.
    // Automatic capture may omit unchanged pixels and shorten a silent MP4.
    stream = canvas.captureStream(0)
    const canvasTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack
    if (typeof canvasTrack.requestFrame !== 'function') throw new Error('unsupported')
    if (audio) {
      source = audio.createMediaElementSource(video); destination = audio.createMediaStreamDestination(); source.connect(destination)
      destination.stream.getAudioTracks().forEach(track => stream!.addTrack(track))
    }
    recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5_000_000, audioBitsPerSecond: 128_000 })
    const result = await new Promise<Blob>((resolve, reject) => {
      let failure: Error | undefined, stopping = false, lastTime = settings.start, lastAdvance = performance.now()
      const remove = () => { signal.removeEventListener('abort', abort); document.removeEventListener('visibilitychange', visibility); video.removeEventListener('error', decode); video.removeEventListener('ended', ended); clearTimeout(timeout); clearTimeout(frame) }
      const stop = (error?: Error) => {
        if (stopping) return
        stopping = true; failure = error; video.pause(); remove()
        if (recorder!.state !== 'inactive') recorder!.stop(); else reject(error ?? new Error('export_failed'))
      }
      const abort = () => stop(new Error('cancelled')), visibility = () => { if (document.hidden) stop(new Error('keep_visible')) }, decode = () => stop(new Error('decode_failed'))
      const ended = () => stop(video.currentTime + .15 < settings.end ? new Error('export_failed') : undefined)
      signal.addEventListener('abort', abort, { once: true }); document.addEventListener('visibilitychange', visibility); video.addEventListener('error', decode); video.addEventListener('ended', ended)
      recorder!.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
      recorder!.onerror = () => stop(new Error('export_failed'))
      recorder!.onstop = () => { remove(); const blob = new Blob(chunks, { type: recorder!.mimeType || mime }); failure ? reject(failure) : blob.size ? resolve(blob) : reject(new Error('export_failed')) }
      const tick = () => {
        if (stopping) return
        try { drawFrame(canvas, video, settings); canvasTrack.requestFrame() } catch { stop(new Error('export_failed')); return }
        if (video.currentTime > lastTime + .005) { lastTime = video.currentTime; lastAdvance = performance.now() }
        if (performance.now() - lastAdvance > 10000) { stop(new Error('export_stalled')); return }
        progress(Math.min(99, Math.round((video.currentTime - settings.start) / (settings.end - settings.start) * 100)))
        if (video.currentTime >= settings.end) { stop(); return }
        // Export must not depend on paint scheduling of an offscreen canvas.
        // Chromium can throttle requestAnimationFrame while its window is occluded.
        frame = setTimeout(tick, 1000 / 30)
      }
      timeout = setTimeout(() => stop(new Error('export_stalled')), ((settings.end - settings.start) / settings.speed + 20) * 1000)
      // Starting MediaRecorder before playback adds a browser-dependent frozen/
      // silent lead-in (Chrome can take hundreds of ms to start its audio graph).
      // Start recording only once playback actually starts, not before play().
      try { video.play().then(() => {
        if (stopping) { video.pause(); return }
        try { recorder!.start(250); drawFrame(canvas, video, settings); canvasTrack.requestFrame(); frame = setTimeout(tick, 1000 / 30) } catch { stop(new Error('export_failed')) }
      }, () => stop(new Error('play_failed'))) } catch { stop(new Error('export_failed')) }
      if (signal.aborted) abort()
    })
    // A recording can stop without producing the selected duration (especially
    // silent/static canvas clips). Decode the actual output, never label that a success.
    const verified = await decodeInfo(result, signal)
    const expectedSeconds = (settings.end - settings.start) / settings.speed
    if (Math.abs(verified.duration - expectedSeconds) > Math.max(.18, expectedSeconds * .03) || verified.width !== size.width || verified.height !== size.height) throw new Error('export_incomplete')
    progress(100)
    return result
  } finally {
    clearTimeout(frame); clearTimeout(timeout); video.pause()
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    stream?.getTracks().forEach(track => track.stop()); destination?.stream.getTracks().forEach(track => track.stop()); source?.disconnect()
    await audio?.close().catch(() => {})
    video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url)
  }
}

/** An explicitly labelled, generated locally, animated test clip. Never a customer asset. */
export async function sampleClip(signal: AbortSignal): Promise<File> {
  const mime = recordingMime()
  if (!mime) throw new Error('unsupported')
  if (signal.aborted) throw new Error('cancelled')
  if (document.hidden) throw new Error('keep_visible')
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360
  const ctx = canvas.getContext('2d')!
  const audio = new AudioContext(); await audio.resume()
  const destination = audio.createMediaStreamDestination(), oscillator = audio.createOscillator(), gain = audio.createGain()
  oscillator.frequency.value = 440; gain.gain.value = .05; oscillator.connect(gain); gain.connect(destination); oscillator.start()
  const stream = canvas.captureStream(0); destination.stream.getAudioTracks().forEach(track => stream.addTrack(track))
  const canvasTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack
  let recorder: MediaRecorder | undefined, frame: ReturnType<typeof setTimeout> | undefined
  try {
    if (typeof canvasTrack.requestFrame !== 'function') throw new Error('unsupported')
    return await new Promise<File>((resolve, reject) => {
      const chunks: Blob[] = []; let failed = false
      recorder = new MediaRecorder(stream, { mimeType: mime })
      const abort = () => { failed = true; if (recorder!.state !== 'inactive') recorder!.stop() }
      const visibility = () => { if (document.hidden) abort() }
      const timeout = setTimeout(abort, 12000)
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
      recorder.onerror = abort
      recorder.onstop = () => { clearTimeout(timeout); signal.removeEventListener('abort', abort); document.removeEventListener('visibilitychange', visibility); failed ? reject(new Error('cancelled')) : resolve(new File(chunks, 'kineo-sample.' + (mime.startsWith('video/mp4') ? 'mp4' : 'webm'), { type: mime })) }
      signal.addEventListener('abort', abort, { once: true })
      document.addEventListener('visibilitychange', visibility)
      const start = performance.now()
      const draw = () => {
        const seconds = (performance.now() - start) / 1000
        ctx.fillStyle = '#111c32'; ctx.fillRect(0, 0, 640, 360)
        ctx.fillStyle = '#66d9c2'; ctx.fillRect(40 + seconds * 70, 170, 90, 90)
        ctx.fillStyle = '#fff'; ctx.font = 'bold 32px system-ui'; ctx.fillText('KINEO · SAMPLE', 40, 65)
        ctx.font = '22px system-ui'; ctx.fillText(seconds.toFixed(1) + 's · test tone', 40, 112)
        canvasTrack.requestFrame()
        if (seconds >= 4) { if (recorder!.state !== 'inactive') recorder!.stop(); return }
        frame = setTimeout(draw, 1000 / 30)
      }
      recorder.start(250); draw(); if (signal.aborted) abort()
    })
  } finally { clearTimeout(frame); if (recorder && recorder.state !== 'inactive') recorder.stop(); oscillator.stop(); stream.getTracks().forEach(track => track.stop()); await audio.close().catch(() => {}) }
}

'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { InterfaceLanguageSelect, useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { EDITING_TOOLS, defaults, downloadName, outputSize, validateSettings, type EditingTool, type EditSettings, type ClipInfo } from '@/lib/videoEditing/settings'
import { drawFrame, exportClip, readClip, recordingMime, sampleClip } from '@/lib/videoEditing/browserEditor'
import './editor.css'

const ERRORS: Record<string, [string, string]> = {
  unsupported: ['This browser cannot export video here. Try the latest desktop Chrome or Edge.', 'Este navegador no puede exportar vídeo aquí. Prueba Chrome o Edge de escritorio actualizado.'],
  file_limits: ['Choose a non-empty video file of up to 100 MB.', 'Elige un vídeo de hasta 100 MB que no esté vacío.'],
  clip_limits: ['Use a playable clip of up to 3 minutes. Very large dimensions are not supported.', 'Usa un vídeo reproducible de hasta 3 minutos. No se admiten dimensiones muy grandes.'],
  invalid_settings: ['Check the start and end: select at least 0.25 seconds within your clip.', 'Revisa el inicio y el final: selecciona al menos 0,25 segundos dentro del vídeo.'],
  decode_failed: ['This file could not be decoded. Try an MP4 (H.264) or WebM file.', 'No se pudo leer este archivo. Prueba un MP4 (H.264) o WebM.'],
  keep_visible: ['Export stopped because this tab was hidden. Keep it open and visible, then export again. Your original is safe.', 'Se detuvo la exportación al ocultarse esta pestaña. Mantenla abierta y visible y vuelve a exportar. Tu original está intacto.'],
  export_stalled: ['Export stopped making progress. Try a shorter clip or desktop Chrome. Your original is unchanged.', 'La exportación dejó de avanzar. Prueba un clip más corto o Chrome de escritorio. Tu original no cambia.'],
  audio_unavailable: ['Audio could not start. Try exporting again, or choose Mute video.', 'No se pudo iniciar el audio. Vuelve a exportar o elige Silenciar vídeo.'],
  play_failed: ['The browser blocked playback. Try exporting again from this tab.', 'El navegador bloqueó la reproducción. Vuelve a exportar desde esta pestaña.'],
  cancelled: ['Cancelled. Your original file is unchanged.', 'Cancelado. Tu archivo original no cambia.'],
  export_failed: ['Could not finish this export. Try a shorter clip or another supported browser.', 'No se pudo terminar la exportación. Prueba un clip más corto u otro navegador compatible.'],
  export_incomplete: ['The browser produced an incomplete file, so we did not offer it for download. Try again with this tab visible, or use desktop Chrome.', 'El navegador produjo un archivo incompleto y no lo ofrecemos para descargar. Vuelve a intentar con esta pestaña visible o usa Chrome de escritorio.'],
}

export default function VideoEditor({ initialTool }: { initialTool: EditingTool }) {
  const es = useInterfaceLanguage() === 'es'
  const t = (en: string, spanish: string) => es ? spanish : en
  const [tool, setTool] = useState(initialTool)
  const [file, setFile] = useState<File | null>(null)
  const [info, setInfo] = useState<ClipInfo | null>(null)
  const [inputUrl, setInputUrl] = useState('')
  const [settings, setSettings] = useState<EditSettings>(defaults(0, initialTool))
  const [result, setResult] = useState<{ url: string; name: string; mime: string } | null>(null)
  const [busy, setBusy] = useState<'load' | 'export' | 'sample' | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [supported, setSupported] = useState<boolean | null>(null)
  const [mime, setMime] = useState('')
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const video = useRef<HTMLVideoElement>(null), canvas = useRef<HTMLCanvasElement>(null)
  const operation = useRef<AbortController | null>(null)
  const resultVideo = useRef<HTMLVideoElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  useEffect(() => { const format = recordingMime(); setSupported(Boolean(format)); setMime(format ?? ''); return () => operation.current?.abort() }, [])
  useEffect(() => () => { if (inputUrl) URL.revokeObjectURL(inputUrl) }, [inputUrl])
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url) }, [result])
  useEffect(() => {
    const media = video.current, surface = canvas.current
    if (!media || !surface || !info) return
    const size = outputSize(info.width, info.height, settings.aspect); surface.width = size.width; surface.height = size.height
    media.playbackRate = settings.speed
    let frame = 0
    const draw = () => {
      cancelAnimationFrame(frame)
      drawFrame(surface, media, settings)
      if (!media.paused && !media.ended) frame = requestAnimationFrame(draw)
    }
    media.addEventListener('loadeddata', draw); media.addEventListener('seeked', draw); media.addEventListener('play', draw)
    draw()
    return () => { cancelAnimationFrame(frame); media.removeEventListener('loadeddata', draw); media.removeEventListener('seeked', draw); media.removeEventListener('play', draw) }
  }, [settings, info, inputUrl])
  const clearResult = () => { resultVideo.current?.pause(); setResult(null) }
  const update = (patch: Partial<EditSettings>) => { clearResult(); setError(''); setSettings(previous => ({ ...previous, ...patch })) }
  const fail = (reason: unknown) => setError(reason instanceof Error && reason.message in ERRORS ? reason.message : 'export_failed')
  async function load(next: File, controller: AbortController) {
    const metadata = await readClip(next, controller.signal)
    if (controller.signal.aborted) return
    video.current?.pause(); setPlaying(false); setTime(0); clearResult()
    setFile(next); setInfo(metadata); setInputUrl(URL.createObjectURL(next)); setSettings(defaults(metadata.duration, tool))
  }
  async function choose(next?: File) {
    if (!next || busy) return
    const controller = new AbortController(); operation.current = controller; setBusy('load'); setError('')
    try { await load(next, controller) } catch (reason) { if (!controller.signal.aborted) fail(reason) } finally { if (operation.current === controller) { setBusy(null); operation.current = null } }
  }
  async function demo() {
    if (busy) return
    const controller = new AbortController(); operation.current = controller; setBusy('sample'); setError('')
    try { await load(await sampleClip(controller.signal), controller) } catch (reason) { fail(reason) } finally { if (operation.current === controller) { setBusy(null); operation.current = null } }
  }
  async function save() {
    if (!file || !info || busy) return
    try { validateSettings(settings, info) } catch (reason) { fail(reason); return }
    video.current?.pause(); setPlaying(false); clearResult()
    const controller = new AbortController(); operation.current = controller; setBusy('export'); setProgress(0); setError('')
    try {
      const blob = await exportClip(file, info, settings, controller.signal, setProgress)
      if (!controller.signal.aborted) setResult({ url: URL.createObjectURL(blob), name: downloadName(file.name, blob.type), mime: blob.type })
    } catch (reason) { fail(reason) } finally { if (operation.current === controller) { setBusy(null); operation.current = null } }
  }
  function selectTool(next: EditingTool) {
    setTool(next); if (next === 'mute') update({ mute: true })
  }
  const selected = EDITING_TOOLS.find(item => item.id === tool)!
  const estimated = Math.max(0, (settings.end - settings.start) / settings.speed)
  const output = info ? outputSize(info.width, info.height, settings.aspect) : null
  return <main className="ke-editor">
    <div className="ke-shell">
      <nav className="ke-nav" aria-label={t('Primary', 'Principal')}><Link href="/" className="ke-logo">Kineo</Link><div><Link href="/tools">← {t('All tools', 'Todas las herramientas')}</Link><InterfaceLanguageSelect /></div></nav>
      <header className="ke-heading"><p className="ke-eyebrow">{t('EDITING TOOLS', 'HERRAMIENTAS DE EDICIÓN')}</p><h1>{es ? selected.es : selected.name}<span>.</span></h1><p>{t('Your clip. A few changes. Ready to download.', 'Tu vídeo. Unos cambios. Listo para descargar.')}</p></header>
      <nav className="ke-tool-tabs" aria-label={t('Editing tools', 'Herramientas de edición')}>{EDITING_TOOLS.map(item => <button key={item.id} type="button" aria-pressed={tool === item.id} disabled={Boolean(busy)} onClick={() => selectTool(item.id)}>{es ? item.es : item.name}</button>)}</nav>
      <div className="ke-layout">
        <section className="ke-stage" aria-label={t('Video preview', 'Vista previa del vídeo')}>
          {inputUrl && info ? <>
            <div className="ke-canvas-wrap"><canvas ref={canvas} aria-label={t('Edited video preview', 'Vista previa del vídeo editado')} /><video ref={video} src={inputUrl} muted playsInline preload="auto" hidden onTimeUpdate={event => { const media = event.currentTarget; setTime(media.currentTime); if (media.currentTime >= settings.end) { media.pause(); setPlaying(false) } }} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setError('decode_failed')} /></div>
            <div className="ke-playback"><button type="button" disabled={Boolean(busy)} onClick={async () => { const media = video.current; if (!media) return; if (!media.paused) { media.pause(); setPlaying(false) } else { if (media.currentTime < settings.start || media.currentTime >= settings.end) media.currentTime = settings.start; try { await media.play(); setPlaying(true) } catch { setError('play_failed') } } }}>{playing ? t('Pause', 'Pausar') : t('Play preview', 'Reproducir')}</button><span>{time.toFixed(1)}s / {info.duration.toFixed(1)}s</span></div>
            <label className="ke-scrubber">{t('Preview position', 'Posición de vista previa')}<input type="range" min="0" max={info.duration} step="0.01" value={time} disabled={Boolean(busy)} onChange={event => { const value = Number(event.target.value); setTime(value); if (video.current) video.current.currentTime = value }} /></label>
            <p className="ke-small">{t('Preview is silent. The download keeps audio unless Mute is selected.', 'La vista previa es silenciosa. La descarga conserva el audio salvo que selecciones Silenciar.')}</p>
          </> : <div className="ke-empty"><div className="ke-upload-symbol" aria-hidden="true">↑</div><h2>{t('Start with your video', 'Empieza con tu vídeo')}</h2><p>{t('Choose a local file. It stays on this device.', 'Elige un archivo local. Se queda en este dispositivo.')}</p><button className="ke-primary" type="button" disabled={Boolean(busy) || supported !== true} onClick={() => fileInput.current?.click()}>{t('Choose video', 'Elegir vídeo')}</button><button type="button" disabled={Boolean(busy) || supported !== true} onClick={demo}>{t('Try a sample clip', 'Probar un vídeo de muestra')}</button></div>}
          <input ref={fileInput} className="ke-file" type="file" accept="video/mp4,video/webm,video/quicktime,video/*" aria-label={t('Choose video file', 'Elegir archivo de vídeo')} disabled={Boolean(busy) || supported !== true} onChange={event => { const next = event.target.files?.[0]; event.target.value = ''; void choose(next) }} />
          {file ? <div className="ke-file-info"><span>{file.name}</span><button type="button" disabled={Boolean(busy)} onClick={() => fileInput.current?.click()}>{t('Replace file', 'Cambiar archivo')}</button></div> : null}
        </section>
        <section className="ke-controls" aria-label={t('Edit settings', 'Ajustes de edición')}>
          <fieldset disabled={!info || Boolean(busy)}><legend>{t('Make it yours', 'Hazlo tuyo')}</legend>
            <div className="ke-two"><label>{t('Start (seconds)', 'Inicio (segundos)')}<input type="number" min="0" max={info?.duration ?? 0} step="0.01" value={Number.isFinite(settings.start) ? settings.start : ''} onChange={event => update({ start: event.target.valueAsNumber })} /></label><label>{t('End (seconds)', 'Final (segundos)')}<input type="number" min="0" max={info?.duration ?? 0} step="0.01" value={Number.isFinite(settings.end) ? settings.end : ''} onChange={event => update({ end: event.target.valueAsNumber })} /></label></div>
            <label>{t('Frame format', 'Formato')}<select value={settings.aspect} onChange={event => update({ aspect: event.target.value as EditSettings['aspect'] })}><option value="original">{t('Original', 'Original')}</option><option value="9:16">9:16 · {t('Vertical', 'Vertical')}</option><option value="1:1">1:1 · {t('Square', 'Cuadrado')}</option><option value="16:9">16:9 · {t('Wide', 'Horizontal')}</option></select></label>
            <label>{t('Framing', 'Encuadre')}<select value={settings.fit} onChange={event => update({ fit: event.target.value as EditSettings['fit'] })}><option value="contain">{t('Fit — keep everything', 'Encajar — conservar todo')}</option><option value="cover">{t('Fill — crop the edges', 'Llenar — recortar bordes')}</option></select></label>
            <label>{t('Playback speed', 'Velocidad')}<select value={settings.speed} onChange={event => update({ speed: Number(event.target.value) })}>{[.5, .75, 1, 1.25, 1.5, 2].map(speed => <option key={speed} value={speed}>{speed}×</option>)}</select></label>
            <label className="ke-check"><input type="checkbox" checked={settings.mute} onChange={event => update({ mute: event.target.checked })} />{t('Mute video — remove audio', 'Silenciar vídeo — quitar audio')}</label>
            <label>{t('Text on video (optional)', 'Texto en el vídeo (opcional)')}<textarea maxLength={100} rows={2} value={settings.text} placeholder={t('Your headline', 'Tu título')} onChange={event => update({ text: event.target.value })} /></label>
            <label>{t('Text position', 'Posición del texto')}<select value={settings.position} onChange={event => update({ position: event.target.value as EditSettings['position'] })}><option value="top">{t('Top', 'Arriba')}</option><option value="center">{t('Center', 'Centro')}</option><option value="bottom">{t('Bottom', 'Abajo')}</option></select></label>
          </fieldset>
          <div className="ke-export-summary">{output ? `${output.width} × ${output.height} · ${Number.isFinite(estimated) ? estimated.toFixed(1) : '—'}s · ` : ''}{mime ? mime.startsWith('video/mp4') ? 'MP4' : 'WebM' : t('Checking browser…', 'Comprobando navegador…')}</div>
          <button className="ke-primary ke-export" type="button" disabled={!info || Boolean(busy) || supported !== true} onClick={save}>{t('Export edited video', 'Exportar vídeo editado')}</button>
          <p className="ke-small">{t('Export happens in real time. Keep this tab visible. Re-encoded at up to 1280 px on the long edge; format depends on your browser.', 'La exportación ocurre en tiempo real. Mantén esta pestaña visible. Se recodifica hasta 1280 px en el lado largo; el formato depende del navegador.')}</p>
        </section>
      </div>
      {supported === false ? <p className="ke-error" role="alert">{ERRORS.unsupported[es ? 1 : 0]}</p> : null}
      {busy ? <div className="ke-status" role="status"><span>{busy === 'export' ? t(`Exporting ${progress}% — keep this tab visible`, `Exportando ${progress}% — mantén esta pestaña visible`) : busy === 'sample' ? t('Making a 4-second sample on your device…', 'Creando una muestra de 4 segundos en tu dispositivo…') : t('Reading your file…', 'Leyendo tu archivo…')}</span><button type="button" onClick={() => operation.current?.abort()}>{t('Cancel', 'Cancelar')}</button></div> : null}
      {error ? <p className="ke-error" role="alert">{ERRORS[error]?.[es ? 1 : 0] ?? ERRORS.export_failed[es ? 1 : 0]}</p> : null}
      {result ? <section className="ke-result" aria-label={t('Export result', 'Resultado de exportación')}><div><p className="ke-eyebrow">{t('EXPORT READY', 'EXPORTACIÓN LISTA')}</p><h2>{t('Check it. Download it.', 'Revísalo. Descárgalo.')}</h2><a className="ke-primary" href={result.url} download={result.name}>{t('Download', 'Descargar')} {result.mime.startsWith('video/mp4') ? 'MP4' : 'WebM'} ↓</a><p className="ke-small">{t('Local download only. This copy is not saved to My Videos.', 'Solo descarga local. Esta copia no se guarda en Mis vídeos.')}</p></div><video ref={resultVideo} src={result.url} controls playsInline preload="metadata" aria-label={t('Exported video', 'Vídeo exportado')} /></section> : null}
      <footer className="ke-footer"><p>{t('No upload. No generation credits. Your original is never overwritten.', 'Sin subir archivos. Sin créditos de generación. Tu original nunca se sobrescribe.')}</p><p>{t('Up to 100 MB · 3 minutes · MP4/WebM input recommended. These are basic editing tools, not the CapCut app.', 'Hasta 100 MB · 3 minutos · Se recomienda MP4/WebM. Son herramientas de edición básica, no la aplicación CapCut.')}</p><Link href="/studio">{t('Need a new video? Open Kineo Studio →', '¿Necesitas un vídeo nuevo? Abre Kineo Studio →')}</Link></footer>
    </div>
  </main>
}

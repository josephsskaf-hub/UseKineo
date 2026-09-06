/** Local file editing only. Independent of generation, billing and storage. */
export const EDITING_TOOLS = [
  { id: 'trim', icon: '01', name: 'Trim video', es: 'Recortar vídeo', description: 'Keep the part that matters. Choose a start and an end.', descriptionEs: 'Conserva lo que importa. Elige el inicio y el final.' },
  { id: 'resize', icon: '02', name: 'Resize video', es: 'Cambiar formato', description: 'Go vertical, square or wide. Fit the frame or crop to fill.', descriptionEs: 'Vertical, cuadrado u horizontal. Encaja la imagen o recórtala para llenar.' },
  { id: 'speed', icon: '03', name: 'Change speed', es: 'Cambiar velocidad', description: 'Slow it down or speed it up, from 0.5× to 2×.', descriptionEs: 'Más lento o más rápido, de 0,5× a 2×.' },
  { id: 'mute', icon: '04', name: 'Mute video', es: 'Silenciar vídeo', description: 'Download a copy without the original audio.', descriptionEs: 'Descarga una copia sin el audio original.' },
  { id: 'text', icon: '05', name: 'Add text', es: 'Añadir texto', description: 'Put your own headline on the video. No automatic transcription.', descriptionEs: 'Pon tu propio título en el vídeo. Sin transcripción automática.' },
] as const
export type EditingTool = typeof EDITING_TOOLS[number]['id']
export type Aspect = 'original' | '9:16' | '1:1' | '16:9'
export type EditSettings = { start: number; end: number; speed: number; aspect: Aspect; fit: 'contain' | 'cover'; mute: boolean; text: string; position: 'top' | 'center' | 'bottom' }
export type ClipInfo = { duration: number; width: number; height: number }
export const MAX_FILE_BYTES = 100 * 1024 * 1024
export const MAX_CLIP_SECONDS = 180
export function editingTool(value: unknown): EditingTool { return EDITING_TOOLS.some(t => t.id === value) ? value as EditingTool : 'trim' }
export function defaults(duration: number, tool: EditingTool): EditSettings {
  return { start: 0, end: duration, speed: 1, aspect: 'original', fit: 'contain', mute: tool === 'mute', text: '', position: 'bottom' }
}
export function validateSettings(settings: EditSettings, info: ClipInfo): void {
  if (![info.duration, info.width, info.height, settings.start, settings.end, settings.speed].every(Number.isFinite)) throw new Error('invalid_settings')
  if (info.duration <= 0 || info.duration > MAX_CLIP_SECONDS || info.width < 2 || info.height < 2 || info.width > 8192 || info.height > 8192) throw new Error('clip_limits')
  if (settings.start < 0 || settings.end > info.duration + 0.001 || settings.end - settings.start < 0.25 || settings.speed < 0.5 || settings.speed > 2) throw new Error('invalid_settings')
  if (!['original', '9:16', '1:1', '16:9'].includes(settings.aspect) || !['contain', 'cover'].includes(settings.fit) || !['top', 'center', 'bottom'].includes(settings.position) || settings.text.length > 100) throw new Error('invalid_settings')
}
export function outputSize(width: number, height: number, aspect: Aspect) {
  const ratio = aspect === 'original' ? width / height : aspect === '9:16' ? 9 / 16 : aspect === '1:1' ? 1 : 16 / 9
  // Maximum long edge 1280; avoid upscaling the original longest dimension.
  const edge = Math.min(1280, Math.max(width, height))
  return { width: Math.max(2, Math.floor((ratio >= 1 ? edge : edge * ratio) / 2) * 2), height: Math.max(2, Math.floor((ratio >= 1 ? edge / ratio : edge) / 2) * 2) }
}
export function drawRect(sourceWidth: number, sourceHeight: number, width: number, height: number, fit: EditSettings['fit']) {
  const scale = fit === 'cover' ? Math.max(width / sourceWidth, height / sourceHeight) : Math.min(width / sourceWidth, height / sourceHeight)
  const w = sourceWidth * scale, h = sourceHeight * scale
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h }
}
export function downloadName(original: string, mime: string) {
  const stem = original.replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}_-]/gu, '-').slice(0, 70) || 'video'
  return `${stem}-kineo-edit.${mime.startsWith('video/mp4') ? 'mp4' : 'webm'}`
}

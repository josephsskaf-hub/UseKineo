import type { InterfaceLanguage } from './interfaceLanguage'

// Read only decoded media metadata; never infer quality from a model name.
export function decodedPreviewFacts(width: number, height: number, duration: number) {
  if (![width, height, duration].every(Number.isFinite) || !Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || duration <= 0) return null
  return { resolution: `${width} × ${height}`, seconds: Math.round(duration * 10) / 10 }
}

export const PREVIEW_FACTS_COPY = {
  en: { title: 'About this preview', engine: 'Engine', resolution: 'Preview resolution', duration: 'Preview duration', note: 'These details describe this preview file, not every video this engine can produce.', unavailable: 'File details are unavailable.' },
  es: { title: 'Sobre esta vista previa', engine: 'Motor', resolution: 'Resolución de la vista previa', duration: 'Duración de la vista previa', note: 'Estos datos describen este archivo de vista previa, no todos los vídeos que puede producir este motor.', unavailable: 'Los datos del archivo no están disponibles.' },
  hi: { title: 'इस प्रीव्यू के बारे में', engine: 'इंजन', resolution: 'प्रीव्यू का रिज़ॉल्यूशन', duration: 'प्रीव्यू की अवधि', note: 'ये विवरण इस प्रीव्यू फ़ाइल के हैं, इस इंजन से बनने वाले हर वीडियो के नहीं।', unavailable: 'फ़ाइल का विवरण उपलब्ध नहीं है।' },
} satisfies Record<InterfaceLanguage, Record<string, string>>

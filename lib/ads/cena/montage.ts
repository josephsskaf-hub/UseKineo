// KINEO-ADS-CENA-2110 — reutiliza o montador v2; trilhas visuais simultâneas SEMPRE distintas.
import { buildAdV2Source } from '../adV2Montage'
import { adsV2EndCardV3Elements, adsV2SoftPackshotElements } from '../v2AdsQualidade'
import { cenaCaptionElements } from '../v2CenaQuality'
import type { CenaState } from './pipeline'
export function buildCenaMontage(s: CenaState): Record<string, unknown> {
  const clips = s.jobs.filter(j => j.kind === 'video' && j.status === 'done')
  if (s.phase !== 'ready' || !clips.length || clips.some(j => !j.url)) throw new Error('cena_video_not_ready')
  const width = 1080, height = 1920
  // O dissolve do montador exige 0,25s extras. Para Veo, valida primeiro 7,75 + 5,25; abaixo troca pelo corte seco 8 + 5.
  const cuts = clips.length === 1 ? [13] : [7.75, 5.25]
  const source = buildAdV2Source({ width, height, fontFamily: 'Inter', musicUrl: null, cardUrl: s.plan.input.foto, cardSeconds: 2, overlays: [], shots: clips.map((j, i) => ({ kind: 'product', url: j.url!, cutStart: 0, cutSeconds: cuts[i], measuredSeconds: j.seconds })) })
  const els = (source.elements as Record<string, unknown>[]).filter(e => !(e.type === 'image' && e.track === 3))
  const video = els.filter(e => e.type === 'video')
  video.forEach((e, i) => { e.time = i === 0 ? 0 : 8; e.duration = clips.length === 1 ? 15 : i === 0 ? 8 : 7; e.volume = s.plan.audioMode === 'native' ? '100%' : '12%'; delete e.enter_transition })
  // Inserto real coberto: esconde rosto/boca e produto gerado, conserva som contínuo da cena.
  els.push(...adsV2SoftPackshotElements(s.plan.input.foto, 10, 9.5, 1.5))
  const card = adsV2EndCardV3Elements({ productUrl: s.plan.input.foto, card: { title: s.plan.product.slice(0, 55), offer: s.plan.input.oferta ?? '', cta: s.plan.script.cta, contact: '' }, fontFamily: 'Inter', width, height, time: 13, duration: 2, track: 20, fade: 0.2 })
  const backdrop = card.find(e => e.track === 20)
  if (backdrop) { delete backdrop.source; delete backdrop.fit; delete backdrop.animations; backdrop.type = 'shape'; backdrop.path = 'M 0 0 L 100 0 L 100 100 L 0 100 L 0 0 Z'; backdrop.fill_color = '#ffffff' }
  // Cartão CENA dentro da zona segura: título, selo e CTA em trilhas próprias, CTA acima de y1480.
  for (const e of card.filter(e => e.type === 'text')) {
    if (e.track === 24) e.y = '65%'
    if (e.track === 25) e.y = '69%'
    if (e.track === 26) e.y = '74%'
    const n = String(e.text ?? '').length
    if (e.track === 24 || e.track === 25 || e.track === 26) e.font_size = Math.max(38, Math.min(Number(e.font_size), e.track === 24 ? 70 : e.track === 25 ? 60 : 64, Math.floor(width * 0.78 / Math.max(1, n * 0.55))))
  }
  els.push(...card)
  const beats = [{ text: s.plan.script.hook, start: 0, seconds: 3 }, { text: s.plan.script.use, start: 3, seconds: 7 }, { text: s.plan.script.benefit, start: 10, seconds: 3 }]
  for (const b of beats) els.push(...cenaCaptionElements({ ...b, width, height, track: 40 }))
  if (s.plan.audioMode === 'voiceover') {
    if (!s.voiceUrl) throw new Error('cena_voiceover_required')
    els.push({ type: 'audio', track: 50, time: 0, duration: 15, source: s.voiceUrl, volume: '100%' })
  }
  return { ...source, duration: 15, elements: els }
}

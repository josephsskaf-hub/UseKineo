'use client'
// KINEO-CLIP-RECREATE-JUNTOS-1511 — prévia de desenvolvimento: a MESMA ClipRecreateJuntos da tela real, com props de visitante. Só troca o tema para a foto.
import { useEffect, useState } from 'react'
import ClipRecreateJuntos, { type RecreateProps } from '@/components/create/ClipRecreateJuntos'

type Simulada = { catalogo: { id: string; credits: number | null; available: boolean; shortfall: number }[]; recarga: boolean }
/** KINEO-TELA-RECREATE-1611 — estado logado SIMULADO (só nesta prévia de dev): responde as leituras que a tela faz ao abrir, com os números do servidor da prévia. */
function simular(s: Simulada) {
  const original = window.fetch.bind(window)
  const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }))
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const metodo = (init?.method ?? 'GET').toUpperCase()
    if (metodo === 'GET' && /\/api\/recreate(\?|$)/.test(url)) return json({ catalog: s.catalogo })
    if (metodo === 'GET' && url.includes('/api/recreate/social')) return json({ items: s.catalogo.map(q => ({ id: q.id, count: 0, liked: false })) })
    if (metodo === 'GET' && url.includes('/api/billing/recarga-assinante')) return json(s.recarga ? { show: true, qa: true, go: '/dev/clip-recreate-juntos#recarga-simulada' } : { show: false })
    if (url.includes('/api/events')) return json({ ok: true, simulada: true })
    return original(input, init)
  }
}
export default function PreviaJuntos({ tema, recreate, simulada }: { tema: 'light' | 'dark' | null; recreate: RecreateProps; simulada?: Simulada }) {
  const [pronta] = useState(() => { if (simulada && typeof window !== 'undefined') simular(simulada); return true })
  useEffect(() => { if (tema) document.documentElement.dataset.theme = tema }, [tema]) // fotos em claro e escuro sem mexer na preferência guardada
  return pronta ? <>{simulada && <p data-previa-simulada="" style={{ position: 'fixed', zIndex: 2000, left: 8, bottom: 8, margin: 0, padding: '4px 8px', borderRadius: 6, background: '#b00020', color: '#fff', font: '700 11px system-ui' }}>DEV · logado SIMULADO</p>}<ClipRecreateJuntos recreate={recreate} /></> : null
}

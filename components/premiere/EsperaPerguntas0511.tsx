'use client'
// KINEO-PERGUNTAS-NA-ESPERA-0511 [fundador 04/11 viu na InVideo; 05/11 "faz todas"] — duas perguntas de 1 clique, puláveis, enquanto o filme fica pronto.
// Nunca antes de gerar: a pessoa já apertou o botão e está esperando. Mede o que a origem do cadastro não vê (boca a boca, indicação) e acha empresa para o B2B.
// Uma vez por navegador. Sem storage (janela privada), simplesmente não aparece: melhor não perguntar do que perguntar duas vezes.
// Guardião: scripts/test-perguntas-na-espera-0511.mjs.
import { useEffect, useState } from 'react'
import { UiLabel } from '@/components/InterfaceLanguage'
import { trackEvent } from '@/lib/analytics'

export const PERGUNTAS_KEY = 'kineo:espera-perguntas:v1'
export const PERGUNTAS_EVENT = 'entry_survey_answered'
export const PERGUNTAS_0511 = [
  { id: 'role', q: 'What best describes you?', a: ['Creator', 'Business owner', 'Agency or marketing', 'Student or teacher', 'Just trying it'] },
  { id: 'source', q: 'How did you hear about Kineo?', a: ['ChatGPT or another AI', 'Google', 'TikTok or Instagram', 'YouTube', 'A friend', 'Somewhere else'] },
] as const

export default function EsperaPerguntas0511() {
  const [passo, setPasso] = useState<number | null>(null)
  useEffect(() => {
    try { if (window.localStorage.getItem(PERGUNTAS_KEY) === null) setPasso(0) } catch { /* sem storage: não pergunta */ }
  }, [])
  if (passo === null || passo >= PERGUNTAS_0511.length) return null
  const atual = PERGUNTAS_0511[passo]
  const fechar = (valor: string) => { try { window.localStorage.setItem(PERGUNTAS_KEY, valor) } catch { /* já respondida nesta tela */ } }
  const responder = (resposta: string) => {
    void trackEvent(PERGUNTAS_EVENT, { question: atual.id, answer: resposta })
    if (passo + 1 >= PERGUNTAS_0511.length) fechar('done')
    setPasso(passo + 1)
  }
  const pular = () => { void trackEvent(PERGUNTAS_EVENT, { question: atual.id, answer: 'skipped' }); fechar('skipped'); setPasso(PERGUNTAS_0511.length) }
  return (
    <section data-kineo="espera-perguntas" style={{ margin: '14px 0', padding: '14px 16px', border: '1px solid var(--border, #E4E4E0)', borderRadius: 14, background: 'var(--card, #fff)', textAlign: 'left' }}>
      <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 650, color: 'var(--text, #0E1116)' }}><UiLabel>While your film gets ready:</UiLabel> <UiLabel>{atual.q}</UiLabel></p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {atual.a.map((r) => <button key={r} type="button" onClick={() => responder(r)} style={{ padding: '7px 12px', minHeight: 36, border: '1px solid var(--border, #D2D2CD)', borderRadius: 999, background: 'transparent', color: 'var(--text, #0E1116)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}><UiLabel>{r}</UiLabel></button>)}
        <button type="button" onClick={pular} style={{ padding: '7px 8px', minHeight: 36, border: 0, background: 'transparent', color: 'var(--muted, #5A5F67)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}><UiLabel>Skip</UiLabel></button>
      </div>
    </section>
  )
}

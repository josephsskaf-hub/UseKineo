'use client'
// KINEO-CAIXA-PRESENTE-0511 [fundador 04/11, olhando a Higgsfield; 05/11 "faz tudo"] — o ícone de presente na barra de cima da área logada e o painel que ele abre.
//
// INERTE ATÉ O CLIQUE (lição de 04/11: um laço de render congelou uma tela logada sem nenhum teste pegar): montar não lê nada, não agenda nada e não mexe em estado. A rede sai só de abrir(),
// e os ouvintes só existem com a caixa aberta. Sem bolinha, sem animação, nada abre sozinho (regra sem-card-de-promo-0411). Cada abertura lê de novo: nada fica guardado entre aberturas.
// A regra de quais linhas aparecem mora em lib/ui/caixaPresente0511.ts. Guardião: scripts/test-caixa-presente-0511.mjs.
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { UiLabel, useUiCopy } from '@/components/InterfaceLanguage'
import { annualOfferClock } from '@/lib/billing/annualWelcomeOffer'
import { CAIXA_SEM_LEITURA, lerCaixa, linhasAindaValidas, linhasDaCaixa, linhasDoVisitante, type CaixaLinha } from '@/lib/ui/caixaPresente0511'

const PAINEL_ID = 'kineo-caixa-presente-painel'

function RelogioDoAnual({ venceEmMs, aoVencer }: { venceEmMs: number; aoVencer: () => void }) {
  const [agoraMs, setAgoraMs] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now()
      setAgoraMs(t)
      if (t >= venceEmMs) {
        clearInterval(id)
        aoVencer()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [venceEmMs, aoVencer])
  return <span lang="en" className="kineo-ltr-island" style={{ fontVariantNumeric: 'tabular-nums' }}>Ends in {annualOfferClock(venceEmMs - agoraMs)}</span>
}

// KINEO-HOME-TOPO-0511 — visitante (a home deslogada): as linhas saem de linhasDoVisitante, sem nenhuma leitura; sem conta, /api/credits só devolveria 401.
export default function CaixaDePresente0511({ visitante = false, filmeGratisNoPais = false }: { visitante?: boolean; filmeGratisNoPais?: boolean }) {
  const [aberta, setAberta] = useState(false)
  const [lendo, setLendo] = useState(false)
  const [linhas, setLinhas] = useState<CaixaLinha[]>([])
  const botaoRef = useRef<HTMLButtonElement | null>(null)
  const painelRef = useRef<HTMLDivElement | null>(null)
  const pedidoRef = useRef<AbortController | null>(null)
  const t = useUiCopy()

  const fechar = useCallback((devolverFoco: boolean) => {
    pedidoRef.current?.abort()
    pedidoRef.current = null
    setAberta(false)
    setLendo(false)
    if (devolverFoco) botaoRef.current?.focus()
  }, [])

  const abrir = () => {
    if (visitante) {
      setAberta(true)
      setLinhas(linhasDoVisitante(filmeGratisNoPais))
      return
    }
    pedidoRef.current?.abort()
    const pedido = new AbortController()
    pedidoRef.current = pedido
    setAberta(true)
    setLendo(true)
    setLinhas(linhasDaCaixa(CAIXA_SEM_LEITURA, Date.now()))
    void lerCaixa(fetch, pedido.signal).then((leituras) => {
      if (pedidoRef.current !== pedido) return
      setLinhas(linhasDaCaixa(leituras, Date.now()))
      setLendo(false)
    })
  }

  const tirarVencidas = useCallback(() => setLinhas((atuais) => linhasAindaValidas(atuais, Date.now())), [])

  useEffect(() => {
    if (!aberta) return
    const foraDaCaixa = (evento: PointerEvent) => {
      const alvo = evento.target as Node | null
      if (alvo && (painelRef.current?.contains(alvo) || botaoRef.current?.contains(alvo))) return
      fechar(false)
    }
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') fechar(true)
    }
    document.addEventListener('pointerdown', foraDaCaixa)
    document.addEventListener('keydown', tecla)
    painelRef.current?.focus()
    return () => {
      document.removeEventListener('pointerdown', foraDaCaixa)
      document.removeEventListener('keydown', tecla)
    }
  }, [aberta, fechar])

  useEffect(() => () => pedidoRef.current?.abort(), [])

  // O painel se ancora na própria barra (ela é sticky; este embrulho fica sem posição), então cabe no celular mesmo com o ícone longe da borda.
  return (
    <div className="max-[340px]:hidden" data-kineo="caixa-presente">
      <button
        ref={botaoRef}
        type="button"
        className="appearance-icon"
        aria-label={t('Gifts and offers')}
        title={t('Gifts and offers')}
        aria-haspopup="dialog"
        aria-expanded={aberta}
        aria-controls={aberta ? PAINEL_ID : undefined}
        onClick={() => (aberta ? fechar(false) : abrir())}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3.5" y="8.5" width="17" height="4" rx="1" />
          <path d="M5 12.5v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
          <path d="M12 8.5v12" />
          <path d="M12 8.5C10.5 5 8.8 3.5 7.3 3.8 5.7 4.1 5.5 6.3 7 7.4c1 .7 2.8 1.1 5 1.1Z" />
          <path d="M12 8.5c1.5-3.5 3.2-5 4.7-4.7 1.6.3 1.8 2.5.3 3.6-1 .7-2.8 1.1-5 1.1Z" />
        </svg>
      </button>
      {aberta && (
        <div
          id={PAINEL_ID}
          ref={painelRef}
          role="dialog"
          aria-label={t('Gifts and offers')}
          tabIndex={-1}
          onBlur={(evento) => {
            const destino = evento.relatedTarget as Node | null
            if (destino && !painelRef.current?.contains(destino) && !botaoRef.current?.contains(destino)) fechar(false)
          }}
          className="absolute top-full z-40 mt-1.5 rounded-xl p-2 outline-none"
          style={{
            insetInlineEnd: 8,
            width: 'min(340px, calc(100vw - 16px))',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: '0 14px 40px rgba(0,0,0,.28)',
            color: 'var(--text)',
          }}
        >
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {linhas.map((linha) => (
              <li key={linha.id}>
                <Link
                  href={linha.href}
                  onClick={() => fechar(false)}
                  data-kineo={`caixa-presente-${linha.id}`}
                  data-auth-modal={linha.modal}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-[13px] hover:bg-[var(--card2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                  style={{ minHeight: 44, color: 'inherit', textDecoration: 'none' }}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold"><UiLabel>{linha.titulo}</UiLabel></span>
                    {linha.detalhe && <span className="block text-xs" style={{ color: 'var(--muted)' }}><UiLabel>{linha.detalhe}</UiLabel></span>}
                    {linha.venceEmMs !== undefined && <span className="block text-xs" style={{ color: 'var(--muted)' }}><RelogioDoAnual venceEmMs={linha.venceEmMs} aoVencer={tirarVencidas} /></span>}
                  </span>
                  <span aria-hidden="true" style={{ color: 'var(--muted)' }}>→</span>
                </Link>
              </li>
            ))}
          </ul>
          {lendo && <p role="status" className="px-3 pb-1 pt-1.5 text-xs" style={{ color: 'var(--muted)', margin: 0 }}><UiLabel>Checking your account…</UiLabel></p>}
        </div>
      )}
    </div>
  )
}

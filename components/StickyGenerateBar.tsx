'use client'

// components/StickyGenerateBar.tsx — KINEO-SPRINT-V1V4-29 (01/09/2026)
//
// ── O DEFEITO MEDIDO ──────────────────────────────────────────────────────
// Das 285 pessoas externas que fizeram UM vídeo em 30 dias, 82 voltaram à tela
// de criar, 42 clicaram em analisar — e 19 nunca apertaram gerar. Lendo o
// último ato de cada uma dessas 19 (excluindo eventos que o SERVIDOR emite,
// tipo e-mail enviado), o estado terminal mais comum, disparado:
//
//     generation_stage_reached · stage='options' ....... 6 pessoas
//     generation_stage_reached · stage='script_preview'  2 pessoas
//
// Ou seja: a última coisa que o produto registrou dessas pessoas foi ELAS
// CHEGANDO na tela do brief. Não houve erro, não houve 402, não houve recusa —
// nenhuma das 19 estava com o trial vencido no momento do clique (medido:
// 0 de 19 tinha `trial_downgraded_at` anterior ao clique). Elas chegaram na
// tela e sumiram ali.
//
// E a comparação fecha o caso: no MESMO período, para a população inteira,
// options → generating é 600 → 564 (94%). Neste grupo é 12 → 0. O muro é do
// grupo, não do produto inteiro.
//
// ── POR QUE ACONTECE ──────────────────────────────────────────────────────
// O botão "Generate" da fase `options` mora no FIM de uma página que, antes
// dele, empilha: selo de nicho, título, resumo, gancho, o roteiro INTEIRO da
// narração, a lista de cenas (até 9 itens) e o painel de Viral Intelligence
// (nota, leitura do gancho, notas de retenção, sugestões de thumbnail e
// legenda, cada uma com botão de aplicar). Em um telefone isso são vários
// scrolls de leitura ANTES de aparecer a única ação que gasta crédito e gera
// filme. Quem já viu o produto funcionar uma vez não vem para ler o brief de
// novo — vem para apertar o botão. E o botão não está na tela.
//
// ── O QUE ESTA BARRA FAZ ──────────────────────────────────────────────────
// Enquanto o botão real estiver FORA da área visível, uma barra fixa no rodapé
// mostra o mesmo custo e dispara exatamente a mesma função. Quando o botão
// real entra em cena, a barra some sozinha — nunca há dois botões visíveis
// competindo pelo mesmo clique, e a tela de quem lê o brief inteiro continua
// idêntica à de hoje.
//
// ── O QUE ELA NÃO FAZ (fronteira com a pista do Codex) ────────────────────
// Não decide preço, não lê plano, não abre upgrade, não muda gate nenhum. Ela
// recebe o custo já calculado e a mesma função que o botão original chama.
// Se a regra de cobrança mudar amanhã, esta barra continua verdadeira sem uma
// linha de alteração — ela não sabe somar, só sabe repetir.

import { useEffect, useRef, useState } from 'react'

export type StickyGenerateBarProps = {
  /** Ref do botão REAL. A barra só existe quando ele está fora de vista. */
  anchorRef: React.RefObject<HTMLElement | null>
  /** Texto curto da esquerda — o mesmo resumo de modo/duração da seção. */
  summary: string
  /** Custo já calculado pela tela. 0 = grátis. A barra não recalcula nada. */
  cost: number
  /** true enquanto uma geração está em voo — botão travado, igual ao real. */
  busy: boolean
  /** Exatamente o mesmo handler do botão original. */
  onGenerate: () => void
  /** Telemetria, opcional: a barra nunca quebra a tela se faltar. */
  onShown?: () => void
  onClick?: () => void
}

export default function StickyGenerateBar({
  anchorRef,
  summary,
  cost,
  busy,
  onGenerate,
  onShown,
  onClick,
}: StickyGenerateBarProps) {
  // `null` = ainda não sabemos onde o botão está. Nunca mostrar a barra nesse
  // estado: piscar uma barra por um frame no topo da página é pior que não ter.
  const [anchorVisible, setAnchorVisible] = useState<boolean | null>(null)
  const shownOnceRef = useRef(false)

  useEffect(() => {
    const node = anchorRef.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      // Navegador antigo: a tela fica exatamente como é hoje. Degradar para o
      // comportamento atual é sempre preferível a degradar para um bug novo.
      setAnchorVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry) setAnchorVisible(entry.isIntersecting)
      },
      // O botão precisa estar CONFORTAVELMENTE visível para a barra sair: a
      // margem negativa embaixo evita o pisca-pisca de quando ele encosta na
      // borda inferior da tela.
      { root: null, threshold: 0.2, rootMargin: '0px 0px -64px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [anchorRef])

  const visible = anchorVisible === false

  useEffect(() => {
    if (!visible || shownOnceRef.current) return
    shownOnceRef.current = true
    try {
      onShown?.()
    } catch {
      // Telemetria jamais impede a pessoa de gerar o vídeo.
    }
  }, [visible, onShown])

  if (!visible) return null

  const label = busy
    ? '⏳ Generating…'
    : `Generate${cost === 0 ? ' · Free' : ` · ${cost} credit${cost === 1 ? '' : 's'}`}`

  return (
    <div
      data-testid="sticky-generate-bar"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        padding: '10px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
        background: 'rgba(12,12,14,.94)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -10px 30px rgba(0,0,0,.45)',
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: 'var(--muted2)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {summary}
        </div>
        <button
          onClick={() => {
            try {
              onClick?.()
            } catch {
              // idem: telemetria nunca engole o clique.
            }
            onGenerate()
          }}
          disabled={busy}
          className="rounded-xl text-sm font-black"
          style={{
            flexShrink: 0,
            padding: '12px 20px',
            background: '#2997ff',
            color: '#FFFFFF',
            border: 'none',
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.7 : 1,
            boxShadow: '0 8px 28px rgba(41,151,255,.35)',
          }}
        >
          {label}
        </button>
      </div>
    </div>
  )
}

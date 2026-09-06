'use client'

// ═══ KINEO-PROXIMA-ACAO-CARTAO-2026-09-06 — sprint-assinaturas #2 ══════════
//
// O NÚMERO QUE MANDOU CONSTRUIR ISTO: `GET /api/next-action` está em produção
// desde 05/09 e tem ZERO chamadas na história inteira. O contrato que sabe
// responder "o que você pode fazer agora" nunca chegou a uma tela. Este
// arquivo é a tela — e é só isso: nenhuma regra de negócio nova mora aqui.
//
// O MOMENTO QUE ELE ATENDE: a pessoa aperta gerar, o saldo não cobre, e a casa
// abre um modal que começa por "não". Medido em 14 dias (contas externas, não
// pagantes): 140 pessoas estão nesse estado — saldo MENOR que o preço do filme
// que acabaram de fazer. Uma chegou ao checkout. A conversa de venda começava
// por uma recusa e terminava ali.
//
// ⚠️ AS TRÊS COISAS QUE ESTE COMPONENTE NÃO FAZ, e cada uma é uma cicatriz:
//
//  1. NÃO CALCULA PREÇO. Todo número vem do `cost` que a rota manda, e a rota
//     tira da MESMA função que cobra. Recalcular aqui é como nasce a classe
//     "copy que mente" (achado 4 da auditoria de 28/08). Se a rota não mandou,
//     a tela não escreve.
//  2. NÃO DECIDE QUEM VÊ. Quem decide é o `state` do servidor. A tela só
//     obedece: fora de `dry`, ela não pinta nada. Duplicar aqui o predicado de
//     "está sem saldo?" seria criar o TERCEIRO predicado — exatamente o
//     defeito que a #1 deste ciclo acabou de arrancar da própria rota.
//  3. NÃO BLOQUEIA NINGUÉM (regra K1). A porta do plano é sempre pintada,
//     inclusive quando não há alternativa barata. E o botão barato NUNCA
//     esconde o plano: os dois convivem, porque uma saída que não custa
//     dinheiro é o que impede o cartão de virar pedágio.
//
// A VERDADE DO FREE TIER VIAJA JUNTO: quando a alternativa é o Kineo 1 grátis,
// o filme sai com 15 segundos (`freeTier.clampSeconds`) e o free tier dá 1 por
// 30 dias. Dizer "continue de graça" calando isso trocaria uma mentira de
// preço por uma de entrega — e a rota já retira a oferta quando não há vaga.

import { useEffect, useState } from 'react'
import { trackEvent } from '@/lib/analytics'

type Porta = {
  kind: string
  href: string
  label: string
  sublabel?: string | null
  cost?: number | null
}

type Resposta = {
  ok?: boolean
  state?: 'first_film' | 'dry' | 'can_continue' | null
  balance?: number
  shortBy?: number
  lastFilm?: { engineLabel: string | null; cost: number; seconds: number } | null
  freeTier?: { clampSeconds: number | null; slotsLeft: number | null; limit: number; windowHours: number } | null
  primary?: Porta | null
  secondary?: Porta | null
}

export default function NextActionCard({ surface }: { surface: string }) {
  const [dados, setDados] = useState<Resposta | null>(null)

  useEffect(() => {
    let vivo = true
    // A rota é GET e leitura pura; falha silenciosa é o comportamento certo —
    // esta caixa é um EXTRA dentro de uma tela que já funciona sem ela. Um
    // erro aqui não pode derrubar o modal que pede dinheiro.
    fetch('/api/next-action', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (vivo && j && j.ok) setDados(j) })
      .catch(() => { /* silêncio proposital */ })
    return () => { vivo = false }
  }, [])

  const estado = dados?.state ?? null
  const seco = estado === 'dry'

  useEffect(() => {
    if (!seco) return
    try {
      void trackEvent('next_action_card_shown', {
        surface,
        balance: dados?.balance ?? null,
        short_by: dados?.shortBy ?? null,
        has_alternative: dados?.secondary?.kind === 'continue_cheaper',
        alternative_cost: dados?.secondary?.cost ?? null,
        clamp_seconds: dados?.freeTier?.clampSeconds ?? null,
      })
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seco])

  // Fora do estado seco a caixa não existe. Nada de "carregando": um esqueleto
  // piscando dentro de um modal de compra só rouba atenção do que vende.
  if (!seco || !dados) return null

  const alternativa = dados.secondary?.kind === 'continue_cheaper' ? dados.secondary : null
  const plano = dados.primary?.kind === 'see_plans' ? dados.primary : null
  const clamp = dados.freeTier?.clampSeconds ?? null
  // Só falamos em segundos quando a alternativa é DE GRAÇA e existe corte: é o
  // único caso em que o filme sai diferente do que a pessoa acabou de receber.
  const dizerClamp = alternativa != null && (alternativa.cost ?? 0) === 0 && clamp != null

  const clicar = (escolha: string, href: string) => {
    try { void trackEvent('next_action_clicked', { surface, choice: escolha, balance: dados.balance ?? null }) } catch { /* ignore */ }
    window.location.href = href
  }

  return (
    <div
      style={{
        background: 'rgba(41,151,255,.08)',
        border: '1px solid rgba(41,151,255,.42)',
        borderRadius: 10,
        padding: '13px 14px',
        marginBottom: 12,
      }}
    >
      <span style={{ display: 'block', color: '#8fc4ff', fontSize: '0.64rem', fontWeight: 900, letterSpacing: '0.1em', marginBottom: 4 }}>
        YOUR NEXT FILM
      </span>
      {/* A frase vem PRONTA do servidor (os dois números, sem adjetivo). A tela
          não a remonta: remontar é reintroduzir a chance de divergir. */}
      {/* A frase vem PRONTA do servidor. O fallback só existe quando os DOIS
          números chegaram: sem essa guarda, um payload incompleto imprimiria
          "You have undefined credits" na superfície que pede dinheiro — e a
          tela não tem como verificar o que o servidor não mandou. Sem os dois,
          a caixa mostra só os botões, que continuam corretos. */}
      {(dados.primary?.sublabel || (typeof dados.balance === 'number' && typeof dados.shortBy === 'number')) && (
        <strong style={{ display: 'block', color: '#fff', fontSize: '0.9rem', lineHeight: 1.35, marginBottom: alternativa ? 8 : 0 }}>
          {dados.primary?.sublabel
            ?? `You have ${dados.balance} credits — ${dados.shortBy} short of another one like it.`}
        </strong>
      )}

      {alternativa && (
        <>
          <button
            type="button"
            onClick={() => clicar(alternativa.cost === 0 ? 'continue_free' : 'continue_cheaper', alternativa.href)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8,
              border: '1px solid rgba(41,151,255,.7)', background: 'rgba(41,151,255,.18)',
              color: '#dbeeff', fontWeight: 800, fontSize: '0.86rem', cursor: 'pointer',
            }}
          >
            {alternativa.label}
            {typeof alternativa.cost === 'number' && (
              <span style={{ fontWeight: 600, opacity: 0.85 }}>
                {alternativa.cost === 0 ? ' · free' : ` · ${alternativa.cost} credits`}
              </span>
            )}
          </button>
          {dizerClamp && typeof dados.freeTier?.limit === 'number' && typeof dados.freeTier?.windowHours === 'number' && (
            // O que a pessoa REALMENTE recebe. Sem isto, o botão grátis promete
            // o filme que ela acabou de fazer e entrega um terço dele.
            <span style={{ display: 'block', color: '#93b4d4', fontSize: '0.72rem', lineHeight: 1.4, marginTop: 6 }}>
              Free films are {clamp} seconds and watermarked — {dados.freeTier?.limit} every{' '}
              {Math.round((dados.freeTier?.windowHours ?? 0) / 24)} days.
            </span>
          )}
        </>
      )}

      {/* REGRA K1: a porta do plano é pintada SEMPRE, inclusive quando não há
          alternativa nenhuma — é o estado em que ela mais importa. */}
      {plano && (
        <button
          type="button"
          onClick={() => clicar('see_plans', plano.href)}
          style={{
            display: 'block', width: '100%', marginTop: alternativa ? 8 : 10,
            padding: '8px 10px', borderRadius: 8, border: '1px solid transparent',
            background: 'transparent', color: '#8fc4ff', fontWeight: 700,
            fontSize: '0.8rem', cursor: 'pointer', textAlign: 'center',
          }}
        >
          {alternativa ? 'Or keep this engine — see plans →' : `${plano.label} →`}
        </button>
      )}
    </div>
  )
}

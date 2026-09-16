// KINEO-PRIMEIRO-FILME-2026-09-16 — decisão do fundador (16/09, madrugada): "Eu aprovo essa mudança
// para cadastros novos, 1 semana, vamos ver se funciona e atrai mais clientes, 35 USD/dia."
//
// O que muda para quem se cadastra a partir de PRIMEIRO_FILME_DESDE: o primeiro filme não passa
// pela escolha de motor. O Studio trava em Seedance 1.5, 60 s, roteiro pela IA, âncora de
// personagem (já ligada por padrão, lib/flags.ts) — o filme que o fundador deu nota 9,5 — e, na
// entrega, oferece "Continue this series → Episode 2" com a assinatura. Nada muda no servidor
// de render nem no cobrador: o trial de 30 créditos já paga os 25 do Seedance de 60 s, e o
// filme sai com a marca d'água do trial como hoje (app/api/compose/route.ts).
//
// Por que existe: em 14 dias (medido 16/09) 326 cadastros → 216 fizeram um filme → 59 fizeram o
// segundo → 45 chegaram ao checkout → 3 pagaram. 131 pessoas fizeram o primeiro filme no Kineo 1
// (slideshow) e os motores validados esta noite quase nenhum cliente viu. O primeiro filme é o
// produto; então o primeiro filme tem que ser o melhor que a casa entrega hoje.
//
// Teto de gasto: o Seedance ancorado custa ~US$ 2-2,5 de fal por filme (medir); 35 USD/dia ≈ 15
// filmes. Passou do teto, o cadastro seguinte cai no Studio de hoje (nada quebra, só não trava).
// A contagem é feita no servidor (app/api/first-film/route.ts) sobre a tabela `videos`, e falha
// FECHADA: sem resposta = teto atingido = fluxo normal.
//
// Interruptor: padrão LIGADO neste código; `NEXT_PUBLIC_KINEO_PRIMEIRO_FILME=off` desliga (env
// nova só vale em deploy novo — memória da casa). A janela também encerra sozinha em
// PRIMEIRO_FILME_ATE (1 semana), sem depender de ninguém lembrar.

export const PRIMEIRO_FILME_VERSION = 'primeiro_filme_v1'

export const PRIMEIRO_FILME_ENABLED = !['0', 'false', 'no', 'off'].includes(
  (process.env.NEXT_PUBLIC_KINEO_PRIMEIRO_FILME ?? '').trim().toLowerCase(),
)

// Cadastros a partir do deploy desta noite (16/09 ~05:00 BRT = 08:00 UTC) — quem já existia
// segue exatamente como antes. Janela de 7 dias, pedido do fundador.
export const PRIMEIRO_FILME_DESDE = '2026-09-16T08:00:00.000Z'
export const PRIMEIRO_FILME_ATE = '2026-09-23T08:00:00.000Z'

export const PRIMEIRO_FILME_ENGINE = 'seedance' as const
export const PRIMEIRO_FILME_QUALITY = 'cinematic_ai' as const
export const PRIMEIRO_FILME_DURATION = 60 as const
// Espelho de creditCostFor('cinematic_ai') a 60 s (lib/credits/engineCost.ts) — só para a
// elegibilidade no cliente; o cobrador continua sendo a fonte única do preço.
export const PRIMEIRO_FILME_CREDITOS = 25

// ≈ US$ 35/dia a ~US$ 2,3 por filme. Env KINEO_PRIMEIRO_FILME_CAP_DIA sobrescreve; 0 ou 'off' desliga o teto? Não:
// 0 fecha a porta (ninguém trava), porque teto é dinheiro do fundador — a única forma de "sem teto" é um número alto.
export const PRIMEIRO_FILME_CAP_DIA_PADRAO = 15
export function primeiroFilmeCapDia(): number {
  const raw = Number.parseInt((process.env.KINEO_PRIMEIRO_FILME_CAP_DIA ?? '').trim(), 10)
  if (!Number.isFinite(raw) || raw < 0) return PRIMEIRO_FILME_CAP_DIA_PADRAO
  return Math.min(1000, raw)
}

export type PerfilPrimeiroFilme = {
  created_at: string | null
  plan: string | null
  has_paid: boolean | null
  trial_status: string | null
  video_credits: number | null
  /** filmes desta conta em qualquer estado que não seja falha (o primeiro já foi pedido) */
  filmes: number
}

export type ElegibilidadePrimeiroFilme = { elegivel: boolean; motivo: string }

export function dentroDaJanela(now: Date = new Date()): boolean {
  const t = now.getTime()
  return t >= Date.parse(PRIMEIRO_FILME_DESDE) && t < Date.parse(PRIMEIRO_FILME_ATE)
}

export function elegivelPrimeiroFilme(p: PerfilPrimeiroFilme, now: Date = new Date()): ElegibilidadePrimeiroFilme {
  if (!PRIMEIRO_FILME_ENABLED) return { elegivel: false, motivo: 'desligado' }
  if (!dentroDaJanela(now)) return { elegivel: false, motivo: 'fora_da_janela' }
  const criado = p.created_at ? Date.parse(p.created_at) : NaN
  if (!Number.isFinite(criado) || criado < Date.parse(PRIMEIRO_FILME_DESDE)) return { elegivel: false, motivo: 'conta_antiga' }
  if (p.has_paid === true) return { elegivel: false, motivo: 'ja_pagou' }
  if ((p.plan ?? 'free') !== 'free') return { elegivel: false, motivo: 'plano_pago' }
  if (p.trial_status !== 'active') return { elegivel: false, motivo: 'sem_trial_ativo' }
  if ((p.video_credits ?? 0) < PRIMEIRO_FILME_CREDITOS) return { elegivel: false, motivo: 'saldo_insuficiente' }
  if (p.filmes > 0) return { elegivel: false, motivo: 'ja_fez_o_primeiro' }
  return { elegivel: true, motivo: 'primeiro_filme' }
}

export type EstadoPrimeiroFilme = {
  version: typeof PRIMEIRO_FILME_VERSION
  enabled: boolean
  eligible: boolean
  reason: string
  capReached: boolean
  usedToday: number
  capPerDay: number
  engine: typeof PRIMEIRO_FILME_ENGINE
  duration: typeof PRIMEIRO_FILME_DURATION
}

// KINEO-MOTOR-OPCIONAL-1011 [fundador 10/11: "se a pessoa quiser escolher, ela tem que ter essa opção de escolher se ela quiser. Isso é um
// upside, não tem ônus nenhum. Se ela quiser um motor melhor."]
// A escolha OPCIONAL de motor da aba Film (passo Details). O padrão continua sem nome ('seedance' = "Standard"). Nada aqui é lista nova:
//   · QUAIS motores: os do portão de plano (lib/enginePlanGate.ts STUDIO_ONLY_ENGINE_KEYS) que a caixa do Studio aceita
//     (lib/growth/studioSimples.ts motorDaCaixa) e que estão na oferta (lib/engineLaunch.ts engineOffered / OFFER_RETIRED_ENGINE_KEYS).
//   · QUEM VÊ / QUEM GERA: a MESMA régua do seletor do Studio antigo (app/(dashboard)/studio/StudioClient.tsx, o filtro do picker e o
//     `trancado` do 2.5), com as MESMAS flags do /api/me/credits. O guardião scripts/test-motor-opcional-1011.mjs executa a expressão
//     do próprio StudioClient e compara com esta função em toda combinação de flags.
//   · NOME: engineDisplayName (a fonte da recusa do servidor). CUSTO: creditCostForDuration (a função que debita).
// Módulo puro: sem rede, sem env, sem React.
import { H3MAX_PUBLIC, engineOffered, enginePaused, S25_PAID_HINT, s25UpgradeHref } from '@/lib/engineLaunch'
import { ENGINE_GATE_ACTIVE, STUDIO_ONLY_ENGINE_KEYS, STUDIO_ONLY_QUALITIES, decideEngineGate, engineDisplayName } from '@/lib/enginePlanGate'
import { creditCostForDuration, type Quality } from '@/lib/credits/engineCost'
import { supportedDurationsFor } from '@/lib/durationByEngine'
import { kling4PaidCredits } from '@/lib/kling4PaidPricing'
import { kling4PromoZeroCredits, validKling4PaidAvailability } from '@/lib/kling4PaidPresentation'
import { motorDaCaixa } from '@/lib/growth/studioSimples'

/** O motor que a tela manda quando a pessoa não escolhe nada (sem nome na tela). */
export const MOTOR_PADRAO = 'seedance'
export const ROTULO_PADRAO = 'Standard'
/** As durações que o Studio simples aceita (components/studio/StudioSimples.tsx DURACOES). */
export const DURACOES_DA_CAIXA = [15, 35, 60, 90] as const

/** A quality que o servidor cobra para a chave do motor (a convenção da rota: 'cinematic_' + chave; 'seedance' = 'cinematic_ai'). */
export function qualidadeDoMotor(motor: string): Quality {
  if (motor === MOTOR_PADRAO) return 'cinematic_ai'
  const q = `cinematic_${motor}`
  if (!STUDIO_ONLY_QUALITIES.has(q)) throw new Error(`motor sem quality conhecida: ${motor}`)
  return q as Quality
}

/** Os motores opcionais, derivados (nunca digitados): portão de plano ∩ caixa do Studio ∩ oferta; do mais barato ao mais caro a 60 s. */
export function motoresCandidatos(): string[] {
  return [...STUDIO_ONLY_ENGINE_KEYS]
    .filter((k) => motorDaCaixa(k) === k && engineOffered(k))
    .sort((a, b) => creditCostForDuration(qualidadeDoMotor(a), true, 60) - creditCostForDuration(qualidadeDoMotor(b), true, 60))
}

/** As flags que o seletor do Studio lê do /api/me/credits (e o histórico de filmes). null/ausente = falha fechada, como lá. */
export interface FlagsDoSeletor {
  /** `internal` do /api/me/credits (s25Visible). */
  internal: boolean
  /** `h3max` do /api/me/credits (o Studio começa em H3MAX_PUBLIC e sobe com a flag). */
  h3max: boolean
  /** `s25Liberado` do /api/me/credits; null = não chegou (card trancado, como no Studio). */
  s25Liberado: boolean | null
  /** Conta sem nenhum filme entregue (o firstFilmHistoryEmpty do Studio). */
  semFilme: boolean
  /** profiles.plan cru (`plan` do /api/me/credits), só para o portão de plano quando ele estiver ligado. */
  plan: string | null
}

export type OpcaoDeMotor =
  | { key: string; nome: string; estado: 'livre' }
  | { key: string; nome: string; estado: 'pausado'; aviso: string }
  | { key: string; nome: string; estado: 'trancado'; aviso: string; href: string }

/** Lista do passo Details (sem o padrão). Mesma régua do picker do Studio: o que lá some, aqui some; o que lá é trancado, aqui é trancado. */
export function motoresOpcionais(f: FlagsDoSeletor): OpcaoDeMotor[] {
  const h3maxOk = H3MAX_PUBLIC || f.h3max
  const s25SomeNoPrimeiroFilme = f.semFilme && f.s25Liberado !== true
  const out: OpcaoDeMotor[] = []
  for (const key of motoresCandidatos()) {
    if (key === 's25' && !(f.internal && !s25SomeNoPrimeiroFilme)) continue // KINEO-MURO-PRIMEIRO-FILME-0311
    if (key === 'h3max' && !h3maxOk) continue // KINEO-H3MAX-2026-10-13
    const nome = engineDisplayName(key)
    const pausa = enginePaused(key)
    if (pausa) { out.push({ key, nome, estado: 'pausado', aviso: `Paused for maintenance · use ${pausa.alternative.label} meanwhile` }); continue }
    if (key === 's25' && f.s25Liberado !== true) { out.push({ key, nome, estado: 'trancado', aviso: S25_PAID_HINT, href: s25UpgradeHref('studio') }); continue } // KINEO-S25-ABRE-2026-10-06
    if (ENGINE_GATE_ACTIVE && !decideEngineGate({ engine: key, plan: f.plan, profileCreatedAt: null }).allowed) { out.push({ key, nome, estado: 'trancado', aviso: 'Requires the Studio plan — see plans', href: '/pricing' }); continue }
    out.push({ key, nome, estado: 'livre' })
  }
  return out
}

/** Pode gerar com este motor? (padrão sempre; os outros só se a régua acima os deixa livres). */
export function motorGeravel(motor: string, f: FlagsDoSeletor | null): boolean {
  if (motor === MOTOR_PADRAO) return true
  if (!f) return false
  return motoresOpcionais(f).some((o) => o.key === motor && o.estado === 'livre')
}

/** O Kling 4.0 pago está no ar? A MESMA leitura do Studio antigo (GET /api/kling4-paid/availability, lease válido com paidLive). */
export function kling4AoVivo(av: unknown): boolean {
  return validKling4PaidAvailability(av) && av.paidLive === true
}

/** As durações do passo Details para o motor: as da caixa que a tabela do servidor aceita (lib/durationByEngine); o Kling 4.0 pago só
 *  nas que ele cobra (15/30/60 — as mesmas que o Studio antigo força quando kling4Availability.paidLive). */
export function duracoesDoMotor(motor: string, kling4Live = false): readonly number[] {
  if (motor === MOTOR_PADRAO) return DURACOES_DA_CAIXA
  const aceitas = supportedDurationsFor(motor)
  return DURACOES_DA_CAIXA.filter((d) => aceitas.includes(d) && (motor !== 'hollywood' || !kling4Live || [15, 30, 60].includes(d)))
}

/** Créditos que o servidor debita (conta paga) para motor × duração — a função que cobra, nunca tabela da tela. O Kling 4.0 pago, como no
 *  Studio antigo: kling4PaidCredits (a mesma tabela que creditCostForDuration usa no servidor com o Kling 4.0 ligado). */
export function custoDoMotor(motor: string, duracao: number, kling4Live = false): number {
  if (motor === 'hollywood' && kling4Live && [15, 30, 60].includes(duracao)) return kling4PaidCredits(duracao)
  return creditCostForDuration(qualidadeDoMotor(motor), true, duracao)
}

/** O número do botão para o Kling 4.0: sem a leitura do Studio (kling4) não se sabe o preço; promoção grátis = sem número (o passo
 *  seguinte confirma). Outros motores: sempre o custoDoMotor. */
export function custoNoBotao(motor: string, duracao: number, kling4: unknown): number | null {
  if (motor !== 'hollywood') return custoDoMotor(motor, duracao)
  if (!validKling4PaidAvailability(kling4)) return null
  if (kling4PromoZeroCredits(kling4, duracao)) return null
  return custoDoMotor(motor, duracao, kling4AoVivo(kling4))
}

/** Lê as flags do corpo do /api/me/credits + o filmsDelivered do /api/credits (que a caixa já lê). Corpo ruim = null (só o padrão). */
export function flagsDoCorpo(me: unknown, filmsDelivered: number | null): FlagsDoSeletor | null {
  if (!me || typeof me !== 'object') return null
  const d = me as Record<string, unknown>
  return {
    internal: d.internal === true,
    h3max: d.h3max === true,
    s25Liberado: typeof d.s25Liberado === 'boolean' ? d.s25Liberado : null,
    semFilme: filmsDelivered === 0,
    plan: typeof d.plan === 'string' ? d.plan : null,
  }
}

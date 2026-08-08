// KINEO-CAPACITY-2026-08-08 — DISJUNTOR GLOBAL DE RENDERS DE IA.
//
// PROBLEMA. Até hoje o único teto GLOBAL do produto inteiro era o do post-to-earn
// (POST_TO_EARN_GLOBAL_DAILY_CREDIT_CAP, lib/postToEarn.ts). Todo o resto é teto
// POR USUÁRIO: freeFastQuota (3/24h), o cooldown de 2 falhas/15min do cinematic,
// o próprio TRIAL_CREDIT_CAP de 40. Nenhum deles olha a soma. Um pico de tráfego
// — que é exatamente o que um relançamento no TAAFT compra — não encontra nada
// no caminho entre 65 contas novas e a fatura do fal.
//
// A CONTA QUE JUSTIFICA O NÚMERO (medida, não estimada):
//   • 65 cadastros × 40 créditos de trial = 2.600 créditos concedidos num dia.
//   • O trial só alcança Fast (1 cr) e Seedance/cinematic_ai (20 cr). Kling, Veo,
//     Hollywood e Avatar são inalcançáveis por desenho (lib/reverseTrial.ts).
//   • Pior caso ARITMÉTICO: 2.600 ÷ 20 = 130 renders de IA = ~$269 de fal.
//   • Pior caso da MISSÃO ("se metade usar"): 1.300 ÷ 20 = 65 renders = ~$135.
//   • Comportamento MEDIDO da coorte real de trial (12 contas, 07–08/08):
//     105 créditos gastos no total, 3 contas fizeram 1 Seedance cada. 25% de
//     adoção de IA → ~16 renders de IA num pico de 65 = ~$33.
//   • Base histórica: 30 dias de render_jobs = 339 `fast` e 21 não-`fast`.
//     Zero renders de IA no dia de maior tráfego já registrado (01/08, 73 renders).
//
// O TETO. 150 renders de IA/dia limita a exposição diária ao fal em ~$310 no mix
// mais provável (Seedance a ~$2,07) — abaixo do que o próprio relançamento custa,
// que é a regra certa: NUNCA perder num dia mais do que se gastou para comprar o
// dia. Ao mesmo tempo é ~7× o pior caso aritmético do pico, ~9× o pico medido e
// ~200× a linha de base atual. Não estrangula lançamento nenhum; só existe para o
// caso em que algo saiu MUITO fora da curva conhecida.
//
// FAIL-OPEN, SEMPRE. Se a contagem falhar por qualquer motivo, o render PASSA.
// Um disjuntor que derruba clientes pagantes porque a nossa própria telemetria
// piscou é pior do que não ter disjuntor. O custo de um falso negativo é um
// render de $2; o de um falso positivo é um cliente que não gera e não volta.
//
// ⚠️ LIMITE CONHECIDO E MEDIDO — isto é um freio de QUEIMA SUSTENTADA, não um
// portão instantâneo. `render_jobs` NÃO é escrito por esta rota: quem o escreve
// é recordRenderIntent(), chamado só de /api/compose, /api/compose/unlock e
// /api/render (lib/credits/renderIntent.ts:59), ou seja na MONTAGEM final, um
// ciclo inteiro de geração DEPOIS do submit ao fal. Consequência honesta: a
// contagem atrasa alguns minutos, e uma avalanche verdadeiramente simultânea de
// 150+ submissões passaria toda antes da primeira linha existir. Contra a
// ameaça real — 65 pessoas gerando ao longo de horas — o atraso é irrelevante e
// o teto engata. Contra um thundering herd instantâneo, não engata.
//
// O caminho de precisão está medido e pronto, mas NÃO foi empurrado a horas de
// um lançamento: `credit_debits` com render_id `cinematic-%` é escrito NO SUBMIT
// (15 linhas / 910 créditos em 40 dias, amounts 20–150, ou seja Seedance até
// Hollywood) e daria contagem em tempo real. Trocar a fonte agora inverteria o
// viés de erro do lado seguro (subcontar → passa) para o lado perigoso
// (supercontar → bloqueia cliente pagante). Fica como primeira melhoria pós-pico.

/** Motores que contam para o teto. `fast` fica de fora de propósito: custa ~$0,10
 *  (Creatomate + OpenAI, sem fal) e é o caminho de ativação de todo mundo — pôr
 *  um teto global nele é estrangular exatamente o que o lançamento quer. */
export function isAiRenderQuality(quality: string): boolean {
  return quality.trim().toLowerCase() !== 'fast'
}

/** Teto global diário. Generoso por desenho — ver a conta no cabeçalho. */
export function aiRenderDailyCap(): number {
  const raw = Number.parseInt((process.env.KINEO_GLOBAL_DAILY_AI_RENDER_CAP ?? '').trim(), 10)
  if (!Number.isFinite(raw) || raw <= 0) return 150
  return Math.min(100_000, raw)
}

/** `'off'` desliga o disjuntor sem redeploy, se ele atrapalhar no pior momento. */
export function aiRenderBreakerEnabled(): boolean {
  return (process.env.KINEO_GLOBAL_DAILY_AI_RENDER_CAP ?? '').trim().toLowerCase() !== 'off'
}

export interface AiRenderCapVerdict {
  /** `false` SÓ quando a contagem foi lida com sucesso E estourou o teto. */
  allowed: boolean
  used: number
  cap: number
  /** `true` quando a decisão foi tomada às cegas (fail-open). */
  degraded: boolean
}

/** Cadeia de contagem do PostgREST, declarada MÍNIMA de propósito.
 *
 *  Não tipar isto como `SupabaseClient` é deliberado: o tipo real é genérico
 *  sobre o schema inteiro e casar a cadeia `.select().neq().gte()` contra ele
 *  fazia o tsc estourar com TS2589 ("type instantiation is excessively deep").
 *  O `from()` devolve `unknown` e a cadeia é afirmada aqui dentro, num ponto
 *  só, onde o formato está à vista e o resultado é validado em runtime logo
 *  abaixo (count numérico ou fail-open). */
interface CountableChain {
  select(
    columns: string,
    options: { count: 'exact'; head: true },
  ): {
    neq(column: string, value: string): {
      gte(column: string, value: string): PromiseLike<{ count: number | null; error: unknown }>
    }
  }
}

/** Qualquer cliente Supabase serve — só o `from` é exercitado. */
export interface AiRenderCapClient {
  from(table: string): unknown
}

/**
 * Quantos renders de IA a plataforma INTEIRA já despachou nas últimas 24h, e se
 * o próximo cabe. Nunca lança.
 */
export async function checkAiRenderDailyCap(client: AiRenderCapClient): Promise<AiRenderCapVerdict> {
  const cap = aiRenderDailyCap()

  if (!aiRenderBreakerEnabled()) {
    return { allowed: true, used: 0, cap, degraded: true }
  }

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const chain = client.from('render_jobs') as CountableChain
    const { count, error } = await chain
      .select('render_id', { count: 'exact', head: true })
      .neq('quality', 'fast')
      .gte('created_at', since)

    // Contagem indisponível → passa. Ver "FAIL-OPEN, SEMPRE" no cabeçalho.
    if (error || count === null || !Number.isFinite(count)) {
      console.error('[ai-render-cap] contagem indisponível — passando (fail-open):', error)
      return { allowed: true, used: 0, cap, degraded: true }
    }

    const allowed = count < cap
    if (!allowed) {
      console.error(
        `[ai-render-cap] TETO GLOBAL DIÁRIO ATINGIDO: ${count}/${cap} renders de IA em 24h — ` +
          `novos renders de IA pausados. Ajuste KINEO_GLOBAL_DAILY_AI_RENDER_CAP para liberar.`,
      )
    }
    return { allowed, used: count, cap, degraded: false }
  } catch (err) {
    console.error('[ai-render-cap] lançou — passando (fail-open):', err)
    return { allowed: true, used: 0, cap, degraded: true }
  }
}

/** Copy honesta: diz que é limite NOSSO, temporário, e que nada foi cobrado. */
export const AI_RENDER_CAP_MESSAGE =
  'Kineo hit its daily limit for AI scene generation. No credits were charged. ' +
  'Fast mode is still available right now, and AI scenes reopen within a few hours.'

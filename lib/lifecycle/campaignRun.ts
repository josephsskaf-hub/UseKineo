// ═══ KINEO-CORRIDA-DE-CAMPANHA-2026-09-07 (aquisição #17) ══════════════════
//
// O DEFEITO, MEDIDO EM PRODUÇÃO HOJE (06/09)
// ──────────────────────────────────────────
// A carta da temporada tem cron em `vercel.json`: `45 15,19 * * *`, limite 30.
//
//   · 15:45 UTC → 11 enviados, 11 temporadas escritas. Funcionou.
//   · 19:45 UTC → **ZERO**. Nenhum e-mail, nenhuma temporada escrita, nenhuma
//     linha em lugar nenhum.
//
// A coorte NÃO estava vazia às 19:45: replicando o predicado da própria rota
// em SQL contra as linhas reais, **10 pessoas** (filme `fast`, saldo 17-22,
// custo do episódio ~5) passavam por todos os filtros àquela hora, e 13 passam
// agora. Pode ter sido a rota morrendo, a supressão comendo o lote, o modelo
// estourando o `timeoutMs: 10_000` da temporada, ou a coorte realmente ter
// fechado por um custo que eu não consigo recalcular de fora.
//
// **O ponto é que a casa não sabe, e não tem como saber.** O desfecho de cada
// corrida existe SÓ no corpo da resposta HTTP — `{ enviados, falhas, ... }` —
// e quem chama é um cron da Vercel, que joga o corpo fora. Zero-porque-a-
// coorte-fechou e zero-porque-a-rota-morreu são, no banco, o mesmo silêncio.
//
// A CLASSE DO DEFEITO (a casa já a registrou três vezes, com outros nomes)
// ───────────────────────────────────────────────────────────────────────
// `peca-sem-superficie-nao-existe` · `contrato-de-servidor-sem-chamador` ·
// `zero-escritas-conte-as-oportunidades`. Sempre a mesma forma: um mecanismo
// que roda de verdade, funciona de verdade, e não deixa rastro — então "0" é
// lido como "está tudo certo, não havia ninguém" até o dia em que alguém
// replica o predicado em SQL e descobre que havia.
//
// O QUE ESTE MÓDULO FAZ
// ─────────────────────
// Uma linha em `events` por CORRIDA (não por pessoa), com o funil inteiro e —
// quando `enviados === 0` — o MOTIVO, DERIVADO dos números do próprio funil,
// nunca digitado. A partir daí:
//
//     select metadata->>'campanha', metadata->>'motivo_do_zero', count(*)
//     from events where name='campaign_run_v1' ...
//
// responde "a campanha X mandou 0 por quê" sem abrir a Vercel e sem depender
// de log que expira em 24h.
//
// ⚠️ REGRA PARA QUEM VIER DEPOIS: campanha em lote que não chama
// `registrarCorrida` é campanha que pode apagar sozinha e ninguém percebe.
// O guardião `scripts/test-campaign-run.mjs` lê os arquivos reais e reprova
// quem esquecer — inclusive quem passar literal no lugar da variável que
// decide.
//
// NUNCA DERRUBA O LOTE: a gravação é try/catch mudo. Instrumentação que
// transforma um envio bom em erro é pior que a cegueira que ela cura.

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from '@supabase/supabase-js'

type Admin = SupabaseClient<any, any, any>

export const CAMPAIGN_RUN_EVENT = 'campaign_run_v1'

/**
 * O funil de UMA corrida de campanha em lote. Cada degrau é o número que a
 * própria rota já tem na mão — nada aqui é recontado nem re-derivado.
 */
export type CorridaDeCampanha = {
  /** o mesmo rótulo que a campanha usa em `utm_campaign`. */
  campanha: string
  modo: 'DRY_RUN' | 'SENT'
  /** pessoas que entraram na seleção (a janela de filmes, antes de filtrar). */
  coorte_bruta: number
  /** sobreviveram a TODOS os filtros de coorte, antes da supressão de 24h. */
  candidatos: number
  suprimidos_24h: number
  /** a supressão não pôde ler e falhou fechada — o lote inteiro morre. */
  supressao_degradada: boolean
  /** candidatos − suprimidos. É deste número que sai o lote. */
  elegiveis: number
  /** quantos entraram no lote desta corrida (min(elegiveis, limite)). */
  no_lote: number
  enviados: number
  falhas: number
  /** pulados DENTRO do lote por falta de insumo (ex.: temporada não escrita). */
  pulados: number
  /** onde a corrida parou, quando ela parou antes do lote. */
  parou_em?: 'auth' | 'env' | 'query' | 'coorte_vazia' | 'erro'
}

/**
 * O motivo do zero, DERIVADO. A ordem das perguntas é a ordem do funil: a
 * primeira que explica o zero é a resposta, porque é a mais a montante.
 *
 * Devolve `null` quando saiu e-mail — um zero explicado e um envio bom não
 * podem ter a mesma etiqueta.
 */
export function motivoDoZero(c: CorridaDeCampanha): string | null {
  if (c.modo === 'DRY_RUN') return null
  if (c.enviados > 0) return null
  if (c.parou_em && c.parou_em !== 'coorte_vazia') return `parou_em_${c.parou_em}`
  if (c.coorte_bruta === 0) return 'janela_sem_ninguem'
  if (c.candidatos === 0) return 'todos_filtrados_pela_coorte'
  if (c.supressao_degradada) return 'supressao_degradada'
  if (c.elegiveis === 0) return 'todos_suprimidos_24h'
  if (c.no_lote === 0) return 'lote_vazio'
  if (c.pulados >= c.no_lote) return 'lote_inteiro_sem_insumo'
  if (c.falhas >= c.no_lote) return 'lote_inteiro_falhou_no_envio'
  return 'desconhecido'
}

/**
 * Grava a corrida. Fire-and-forget de propósito (ver o cabeçalho): qualquer
 * erro aqui é engolido, porque esta linha é o relatório do trabalho, nunca o
 * trabalho.
 */
export async function registrarCorrida(admin: Admin, c: CorridaDeCampanha): Promise<void> {
  try {
    await admin.from('events').insert({
      name: CAMPAIGN_RUN_EVENT,
      path: '/lib/lifecycle/campaignRun',
      metadata: {
        campanha: c.campanha,
        modo: c.modo,
        coorte_bruta: c.coorte_bruta,
        candidatos: c.candidatos,
        suprimidos_24h: c.suprimidos_24h,
        supressao_degradada: c.supressao_degradada,
        elegiveis: c.elegiveis,
        no_lote: c.no_lote,
        enviados: c.enviados,
        falhas: c.falhas,
        pulados: c.pulados,
        parou_em: c.parou_em ?? null,
        motivo_do_zero: motivoDoZero(c),
      },
    })
  } catch {
    /* a cegueira volta para esta corrida; o lote não cai. */
  }
}

/** Atalho para os degraus que ainda não existem quando a corrida morre cedo. */
export function corridaAbortada(
  campanha: string,
  modo: CorridaDeCampanha['modo'],
  parou_em: NonNullable<CorridaDeCampanha['parou_em']>,
  parciais: Partial<CorridaDeCampanha> = {},
): CorridaDeCampanha {
  return {
    campanha,
    modo,
    coorte_bruta: 0,
    candidatos: 0,
    suprimidos_24h: 0,
    supressao_degradada: false,
    elegiveis: 0,
    no_lote: 0,
    enviados: 0,
    falhas: 0,
    pulados: 0,
    ...parciais,
    parou_em,
  }
}

// KINEO-LIVE-STUDY-2026-08-05 — os números do estudo público
// /state-of-ai-shorts-2026, lidos do banco em vez de escritos à mão.
//
// POR QUE ISTO EXISTE
// ───────────────────
// O estudo foi publicado em 24/07/2026 com números chumbados no JSX. Doze dias
// depois, medidos contra a mesma base, CINCO dos cinco números estavam errados:
//
//   publicado 24/07              medido 05/08     erro
//   568 vídeos / 206 criadores   472 / 331        contava contas internas
//   99,3% de conclusão           91,9%            otimista
//   48% usam Fast Mode           89,2%            errado por 1,9x
//   "1 em cada 4 usa premium"    4,0%             errado por 6x
//   mediana 2,30 min / p90 3,50  4,2 / 6,6        errado por ~1,9x
//
// A página convida jornalista e LLM a citar ("free to cite"). Um estudo datado
// que envelhece em silêncio não é só impreciso — ele ensina o motor de resposta
// a repetir o número errado, e o número errado sobre VELOCIDADE é o que faz a
// pessoa desistir no meio do render. Por isso os números passam a vir daqui.
//
// A DISCIPLINA DESTE MÓDULO
// ─────────────────────────
// 1. Só agregados. Nenhum dado de usuário individual sai daqui.
// 2. Contas internas SEMPRE excluídas, via lib/internalAccounts (fonte única).
// 3. Nunca publicar zero nem null: se a leitura falhar, devolve FALLBACK, que é
//    o último conjunto medido à mão (05/08/2026) — o mesmo princípio de
//    lib/demoFallback.ts. Um estudo que renderiza "0 vídeos" é pior que um
//    estudo levemente desatualizado.
// 4. A janela de confiabilidade/velocidade começa em 02/08/2026, DEPOIS dos dois
//    apagões de fornecedor de 31/07 (OpenAI) e 01/08 (Creatomate). Medir por
//    cima deles publicaria 55% de conclusão e puniria a empresa por uma falha
//    de terceiro já resolvida e documentada em docs/INCIDENTE-OPENAI-2026-07-31.
//    A janela está declarada na metodologia da página — não é maquiagem.

import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'

/** Início da janela de confiabilidade/velocidade: 1º dia limpo pós-apagões. */
export const RELIABILITY_WINDOW_START = '2026-08-02'

export type StudyStats = {
  /** Vídeos concluídos por contas externas, desde o primeiro. */
  totalVideos: number
  /** Criadores externos distintos com pelo menos 1 vídeo concluído. */
  totalCreators: number
  /** Média de vídeos por criador ativo, 1 casa decimal. */
  videosPerCreator: number
  /** % de tentativas resolvidas que terminaram em `done`, janela pós-apagão. */
  completionRate: number
  /** Mediana de minutos do 1º estágio ao `done`, janela pós-apagão. */
  medianMinutes: number
  /** p90 de minutos, mesma janela. */
  p90Minutes: number
  /** Nº de renders concluídos na amostra de velocidade (o n da medida). */
  speedSample: number
  /** % de vídeos gerados no motor Fast (stock). */
  fastSharePercent: number
  /** % de vídeos gerados em motores premium de IA. */
  premiumSharePercent: number
  /** Volume por mês, do mais antigo ao mais recente. */
  monthly: { month: string; videos: number }[]
  /** Data da leitura, ISO (YYYY-MM-DD) — vira o dateModified do JSON-LD. */
  measuredOn: string
  /** Primeiro vídeo da base, ISO — abre a janela do estudo. */
  since: string
  /** false = a leitura falhou e estes são os números do FALLBACK. */
  live: boolean
}

/**
 * Último conjunto medido à mão, 05/08/2026 13:20Z, com as queries em
 * docs/SPRINT-2026-08-05.md. Serve como rede: a página nunca publica zero.
 */
export const FALLBACK: StudyStats = {
  totalVideos: 472,
  totalCreators: 331,
  videosPerCreator: 1.4,
  completionRate: 91.9,
  medianMinutes: 4.2,
  p90Minutes: 6.6,
  speedSample: 114,
  fastSharePercent: 89.2,
  premiumSharePercent: 4.0,
  monthly: [
    { month: '2026-05', videos: 32 },
    { month: '2026-06', videos: 60 },
    { month: '2026-07', videos: 208 },
    { month: '2026-08', videos: 172 },
  ],
  measuredOn: '2026-08-05',
  since: '2026-05-16',
  live: false,
}

/**
 * Piso absoluto de sanidade. NÃO usar FALLBACK.totalVideos como piso: no dia em
 * que o filtro de internas ficar mais rigoroso, o número real cai abaixo do
 * fallback e a página trava no fallback para sempre, em silêncio. O piso é um
 * valor histórico baixo, só para barrar leitura obviamente quebrada (0, 1, 12).
 */
const SANITY_FLOOR_VIDEOS = 300

/**
 * Piso de amostra para publicar percentis. O erro que originou este módulo foi
 * uma mediana calculada sobre DOZE renders, publicada como fato por 12 dias.
 * Abaixo disto, a leitura não vira número público.
 */
const SANITY_MIN_SPEED_SAMPLE = 30

const ONE_DAY_SECONDS = 60 * 60 * 24

/**
 * Lê os números do estudo. Nunca lança: qualquer falha devolve FALLBACK com
 * `live: false`, e a página diz honestamente que está mostrando a última
 * leitura conhecida.
 */
export const getStudyStats = cache(async (): Promise<StudyStats> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('[studyStats] env ausente — publicando FALLBACK')
    return FALLBACK
  }

  try {
    const admin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      // Sem timeout, um Supabase lento penduraria o BUILD (o undici só desiste
      // depois de ~5 min por chamada). O estudo prefere números de ontem a um
      // deploy travado.
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(5000) }),
      },
    })

    // As três agregações são funções SQL (docs/MIGRACAO-STUDY-STATS.sql), para
    // que a exclusão de internas e os percentis rodem no banco, não em JS.
    const [volumeRes, speedRes, engineRes] = await Promise.all([
      admin.rpc('study_volume').single(),
      admin.rpc('study_speed').single(),
      admin.rpc('study_engine_mix').single(),
    ])

    // Se as funções ainda não existem no banco (deploy antes da migração),
    // cair no fallback é o comportamento correto — mas NUNCA em silêncio: um
    // estudo congelado que ninguém percebe é o defeito que este módulo existe
    // para eliminar.
    if (volumeRes.error || speedRes.error || engineRes.error) {
      console.error('[studyStats] RPC falhou — publicando FALLBACK', {
        volume: volumeRes.error?.message,
        speed: speedRes.error?.message,
        engine: engineRes.error?.message,
      })
      return FALLBACK
    }

    const v = volumeRes.data as Record<string, unknown> | null
    const s = speedRes.data as Record<string, unknown> | null
    const e = engineRes.data as Record<string, unknown> | null
    if (!v || !s || !e) return FALLBACK

    const num = (x: unknown, fallback: number): number => {
      const n = typeof x === 'string' ? Number(x) : typeof x === 'number' ? x : NaN
      return Number.isFinite(n) ? n : fallback
    }

    const totalVideos = num(v.total_videos, FALLBACK.totalVideos)
    const totalCreators = num(v.total_creators, FALLBACK.totalCreators)
    const completionRate = num(s.completion_rate, FALLBACK.completionRate)
    const medianMinutes = num(s.median_minutes, FALLBACK.medianMinutes)
    const p90Minutes = num(s.p90_minutes, FALLBACK.p90Minutes)
    const speedSample = num(s.sample_size, FALLBACK.speedSample)
    const fastSharePercent = num(e.fast_share, FALLBACK.fastSharePercent)
    const premiumSharePercent = num(e.premium_share, FALLBACK.premiumSharePercent)

    // GUARDA DE SANIDADE — cobre TODOS os números publicados, não só o volume.
    // `num()` aceita 0 como valor válido, então sem esta trava uma janela vazia
    // publicaria "0 min de mediana · 0% concluem · amostra de 0 renders" com
    // live:true, e o mesmo zero entraria no JSON-LD Dataset sob licença CC-BY.
    // O piso de amostra existe porque o erro que originou tudo isto foi uma
    // medida de DOZE renders: nunca mais publicar percentil de amostra pequena.
    const brokenReading =
      totalVideos < SANITY_FLOOR_VIDEOS ||
      totalCreators < 1 ||
      speedSample < SANITY_MIN_SPEED_SAMPLE ||
      medianMinutes <= 0 ||
      p90Minutes <= 0 ||
      completionRate <= 0 ||
      completionRate > 100 ||
      fastSharePercent <= 0
    if (brokenReading) {
      console.error('[studyStats] leitura fora de sanidade — publicando FALLBACK', {
        totalVideos, totalCreators, speedSample, medianMinutes, p90Minutes, completionRate,
      })
      return FALLBACK
    }

    const monthlyRaw = Array.isArray(v.monthly) ? (v.monthly as unknown[]) : []
    const monthly = monthlyRaw
      .map((row) => {
        const r = row as Record<string, unknown>
        return { month: String(r.month ?? ''), videos: num(r.videos, 0) }
      })
      .filter((r) => r.month.length === 7)

    // Curva mensal vazia com volume vivo misturaria DUAS leituras na mesma tela
    // (total de hoje, barras de ontem) — e a metodologia afirma que a curva
    // cobre todos os vídeos. Nesse caso o fallback inteiro é o honesto.
    if (!monthly.length) {
      console.error('[studyStats] monthly vazio — publicando FALLBACK inteiro')
      return FALLBACK
    }

    return {
      totalVideos,
      totalCreators,
      videosPerCreator: Math.round((totalVideos / Math.max(1, totalCreators)) * 10) / 10,
      completionRate,
      medianMinutes,
      p90Minutes,
      speedSample,
      fastSharePercent,
      premiumSharePercent,
      monthly,
      measuredOn: new Date().toISOString().slice(0, 10),
      since: String(v.since ?? FALLBACK.since).slice(0, 10),
      live: true,
    }
  } catch (err) {
    console.error('[studyStats] exceção — publicando FALLBACK', err)
    return FALLBACK
  }
})

/** Revalidação da página que consome isto: uma vez por dia. */
export const STUDY_REVALIDATE_SECONDS = ONE_DAY_SECONDS

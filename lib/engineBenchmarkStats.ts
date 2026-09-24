// KINEO-BENCHMARK-MOTORES-2026-09-23 — os números da página /seedance-vs-veo-vs-kling, lidos do banco.
//
// POR QUE ISTO EXISTE
// ───────────────────
// Medido 23/09: o ChatGPT manda ~200 sessões/semana e a /state-of-ai-shorts-2026 é a 2ª página mais citada — a
// única que cita porque tem DADO PRÓPRIO. A pergunta que as pessoas fazem ao ChatGPT é "Seedance vs Veo vs Kling",
// e ninguém na categoria publica quantos filmes cada motor realmente entregou. Esta página publica, no padrão de
// lib/studyStats.ts (fundador 23/09: "vai" nas 3 jogadas).
//
// A DISCIPLINA DESTE MÓDULO (a mesma de lib/studyStats.ts)
// ───────────────────────────────────────────────────────
// 1. Só agregados por motor: filmes, pessoas distintas, mediana de duração. Nenhum dado individual sai daqui.
// 2. Contas internas SEMPRE fora, via lib/internalAccounts (isInternalEmail, fonte única). Isto importa MUITO aqui:
//    medido em 23/09, 32 dos 32 filmes de Kling 3 e 10 dos 10 de Omni Flash dos últimos 90 dias eram da casa. Sem a
//    exclusão, a página "provaria" um uso que nenhum cliente teve.
// 3. Janela declarada: últimos 90 dias, só `status='completed'`, duração de `videos.duration` (a coluna populada;
//    `duration_seconds` está nula).
// 4. Nunca publicar zero por falha: se a leitura quebrar, devolve FALLBACK (medido à mão em 23/09/2026, mesma
//    regra) com `measured: false`, e a página diz que está mostrando a última leitura conhecida.
// 5. Paginação SEMPRE ordenada (o PostgREST corta em 1000 linhas sem erro; paginar sem ORDER BY repete/perde linha).

import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import { isInternalEmail } from '@/lib/internalAccounts'

export const BENCHMARK_WINDOW_DAYS = 90

/** Os quality_mode comparados, na ordem do banco. */
export const BENCHMARK_QUALITY_MODES = [
  'fast',
  'cinematic_ai',
  'cinematic_veo',
  'cinematic_kling',
  'cinematic_hollywood',
  'cinematic_h3',
  'cinematic_omni',
] as const
export type BenchmarkQualityMode = (typeof BENCHMARK_QUALITY_MODES)[number]

export type EngineBenchmarkRow = {
  qualityMode: BenchmarkQualityMode
  /** Filmes concluídos por contas externas na janela. */
  films: number
  /** Pessoas externas distintas com pelo menos 1 filme concluído neste motor. */
  people: number
  /** Mediana de `videos.duration` em segundos; null quando não há filme. */
  medianSeconds: number | null
}

export type EngineBenchmarkStats = {
  rows: EngineBenchmarkRow[]
  /** Soma dos filmes da tabela — o N do título. */
  totalFilms: number
  windowDays: number
  /** Data da leitura, ISO (YYYY-MM-DD). */
  measuredOn: string
  /** false = a leitura falhou e estes são os números do FALLBACK. */
  measured: boolean
}

/**
 * Medido à mão em 23/09/2026 (90 d, status completed, contas internas fora pelo mesmo predicado de
 * lib/internalAccounts, dono sem perfil conta como externo). Com as internas DENTRO a tabela era outra
 * (fast 1123 · Seedance 430 · Kling 3 32 · Veo 16 · H3 15 · Kling 2.5 11 · Omni 10) — o que só prova o
 * item 2 do cabeçalho.
 */
export const FALLBACK: EngineBenchmarkStats = {
  rows: [
    { qualityMode: 'fast', films: 1076, people: 722, medianSeconds: 45 },
    { qualityMode: 'cinematic_ai', films: 354, people: 303, medianSeconds: 45 },
    { qualityMode: 'cinematic_veo', films: 2, people: 1, medianSeconds: 39.5 },
    { qualityMode: 'cinematic_kling', films: 4, people: 4, medianSeconds: 39.5 },
    { qualityMode: 'cinematic_hollywood', films: 0, people: 0, medianSeconds: null },
    { qualityMode: 'cinematic_h3', films: 3, people: 1, medianSeconds: 38 },
    { qualityMode: 'cinematic_omni', films: 0, people: 0, medianSeconds: null },
  ],
  totalFilms: 1439,
  windowDays: BENCHMARK_WINDOW_DAYS,
  measuredOn: '2026-09-23',
  measured: false,
}

/** Piso de sanidade: abaixo disto a leitura está quebrada (0, 1, 12), não o produto. */
const SANITY_FLOOR_FILMS = 200
const PAGE_SIZE = 1000
const MAX_PAGES = 20
const PROFILE_CHUNK = 150

/** Mediana no estilo percentile_cont(0.5): média dos dois do meio quando o n é par. */
export function median(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b)
  if (!v.length) return null
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}

type VideoRow = { id: string; user_id: string | null; quality_mode: string | null; duration: number | null }

/** Agrega as linhas em uma por motor, tirando os donos internos. Puro, para o guardião exercitar. */
export function aggregateBenchmark(videos: VideoRow[], internalIds: Set<string>): EngineBenchmarkRow[] {
  return BENCHMARK_QUALITY_MODES.map((qualityMode) => {
    const mine = videos.filter((v) => v.quality_mode === qualityMode && !(v.user_id && internalIds.has(v.user_id)))
    const people = new Set(mine.map((v) => v.user_id).filter(Boolean)).size
    const durations = mine.map((v) => Number(v.duration)).filter((d) => Number.isFinite(d) && d > 0)
    return { qualityMode, films: mine.length, people, medianSeconds: median(durations) }
  })
}

/**
 * Lê a tabela da página. Nunca lança: qualquer falha devolve FALLBACK com `measured: false`.
 */
export const getEngineBenchmarkStats = cache(async (): Promise<EngineBenchmarkStats> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('[engineBenchmarkStats] env ausente — publicando FALLBACK')
    return FALLBACK
  }

  try {
    const admin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      // Mesmo motivo de lib/studyStats: um Supabase lento não pode pendurar o build.
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(5000) }),
      },
    })

    const since = new Date(Date.now() - BENCHMARK_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const videos: VideoRow[] = []
    for (let page = 0; page < MAX_PAGES; page++) {
      const from = page * PAGE_SIZE
      const { data, error } = await admin
        .from('videos')
        .select('id, user_id, quality_mode, duration')
        .eq('status', 'completed')
        .gte('created_at', since)
        .in('quality_mode', BENCHMARK_QUALITY_MODES as unknown as string[])
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)
      if (error) {
        console.error('[engineBenchmarkStats] leitura de videos falhou — publicando FALLBACK', error.message)
        return FALLBACK
      }
      const rows = (data ?? []) as VideoRow[]
      videos.push(...rows)
      if (rows.length < PAGE_SIZE) break
      if (page === MAX_PAGES - 1) {
        console.error('[engineBenchmarkStats] paginação passou do teto — publicando FALLBACK')
        return FALLBACK
      }
    }

    // Donos → e-mail → isInternalEmail. O predicado é o da fonte única, não uma cópia em SQL.
    const owners = Array.from(new Set(videos.map((v) => v.user_id).filter((id): id is string => !!id)))
    const internalIds = new Set<string>()
    for (let i = 0; i < owners.length; i += PROFILE_CHUNK) {
      const chunk = owners.slice(i, i + PROFILE_CHUNK)
      const { data, error } = await admin.from('profiles').select('id, email').in('id', chunk)
      if (error) {
        // Sem saber quem é interno, publicar seria publicar a casa como cliente. Fallback.
        console.error('[engineBenchmarkStats] leitura de profiles falhou — publicando FALLBACK', error.message)
        return FALLBACK
      }
      for (const p of (data ?? []) as { id: string; email: string | null }[]) {
        if (isInternalEmail(p.email)) internalIds.add(p.id)
      }
    }

    const rows = aggregateBenchmark(videos, internalIds)
    const totalFilms = rows.reduce((sum, r) => sum + r.films, 0)
    if (totalFilms < SANITY_FLOOR_FILMS) {
      console.error('[engineBenchmarkStats] leitura fora de sanidade — publicando FALLBACK', { totalFilms })
      return FALLBACK
    }

    return {
      rows,
      totalFilms,
      windowDays: BENCHMARK_WINDOW_DAYS,
      measuredOn: new Date().toISOString().slice(0, 10),
      measured: true,
    }
  } catch (err) {
    console.error('[engineBenchmarkStats] exceção — publicando FALLBACK', err)
    return FALLBACK
  }
})

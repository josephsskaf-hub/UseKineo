// ═══ KINEO1-IMAGEM-V2-2026-09-28 — /api/admin/kineo1-replay: a prova da imagem v2 SEM renderizar e SEM gravar ═══
//
// Fundador (27/09): o Kineo 1 tem de chegar a 9 de 10 — e a imagem é o buraco (juiz desde 19/09: 69 geral, 89 fala,
// 53 imagem; 63 de 131 filmes de cliente com 40 na imagem). As peças v2 (lib/kineo1/sceneQueries.ts, portão v2 em
// lib/pixabay.ts, cofre v2 em lib/clipVault.ts, modo troca em lib/fastAiClips.ts) nascem INERTES; esta rota refaz a
// escolha de imagem de filmes REAIS já julgados e roda o MESMO juiz na evidência nova (lib/kineo1/replay.ts). É assim
// que a mudança se prova antes de tocar a rota travada (parte B, trava 8.2).
//
// Uso (GET, admin logado OU `Authorization: Bearer $CRON_SECRET`; nada é gravado em lugar nenhum):
//   ?generation_id=<uuid>                      um filme
//   ?last=10&max_image=60                      os 10 filmes de cliente mais recentes com imagem ≤ 60 (teto 40)
//   &offset=10                                 continua o lote (a resposta devolve next_offset quando para no tempo)
//   &days=10                                   janela do lote (1-30 dias; padrão 10)
//   &ai_max=2                                  clipes de IA nas cenas fracas (0-6; padrão 2 = os extras de hoje)
//   &ai_scope=all                              simula clipe de IA também em filme que hoje não ganha (padrão: só elegíveis)
//   &rejudge=1                                 re-julga também a evidência GRAVADA (mede o ruído do juiz; +1 chamada)
//   &rpm=40                                    teto de requisições/min à Pixabay (10-50, POR PEDIDO; a chave é dividida com a
//                                              produção — KINEO1-REPLAY-RPM-2026-09-28: a metade fica sempre com ela)
//   &variants=both                             strict (regra 2 do portão v2, como pedida) | fallback (com a regra 5, a
//                                              âncora) | both (padrão: as duas; `after` = strict, `after_fallback` = âncora)
// Custo: ~3 chamadas gpt-4o-mini por filme com as duas variantes (+ o diretor de clipes da Pixabay). Nada de fal, nada de render.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_EMAILS, isAdminEmail, serviceClient } from '../_shared/db'
import { loadReplayFilm, pickReplayBatch, replayFilm, summarizeReplay, REPLAY_PIXABAY_RPM_MAX, REPLAY_PIXABAY_RPM_MIN, type ReplayFilmResult } from '@/lib/kineo1/replay'

export const dynamic = 'force-dynamic'
// Rota SÓ-GET: sem isto o Data Cache da Vercel congelaria as leituras do supabase-js (ver person-media, 02/09).
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
export const maxDuration = 300

const LOTE_MAX = 40
const ORCAMENTO_MS = 240_000
// Contas da casa fora do lote (o placar é de CLIENTE): a allowlist do admin + a conta de marca.
const CONTAS_DA_CASA = [...Array.from(ADMIN_EMAILS), 'joseph@usekineo.com']
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function autorizado(req: Request): Promise<boolean> {
  const segredo = process.env.CRON_SECRET
  if (segredo && req.headers.get('authorization') === `Bearer ${segredo}`) return true
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return !!user && isAdminEmail(user.email?.toLowerCase() ?? '')
  } catch {
    return false
  }
}

const intParam = (url: URL, k: string, def: number, min: number, max: number) => {
  const v = Number.parseInt(url.searchParams.get(k) ?? '', 10)
  return Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : def
}

export async function GET(req: Request) {
  if (!(await autorizado(req))) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const admin = serviceClient()
  if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 })
  const url = new URL(req.url)
  const inicio = Date.now()
  const deadlineAt = inicio + ORCAMENTO_MS
  const opts = {
    aiMax: intParam(url, 'ai_max', 2, 0, 6),
    aiScope: url.searchParams.get('ai_scope') === 'all' ? ('all' as const) : ('eligible' as const),
    rejudgeBefore: url.searchParams.get('rejudge') === '1',
    pixabayRpm: intParam(url, 'rpm', 40, REPLAY_PIXABAY_RPM_MIN, REPLAY_PIXABAY_RPM_MAX), // KINEO1-REPLAY-RPM-2026-09-28
    variants: (['strict', 'fallback', 'both'] as const).find((v) => v === url.searchParams.get('variants')) ?? ('both' as const),
    deadlineAt,
  }
  try {
    const gen = (url.searchParams.get('generation_id') ?? '').trim()
    if (gen) {
      if (!UUID_RE.test(gen)) return NextResponse.json({ error: 'generation_id inválido' }, { status: 400 })
      const film = await loadReplayFilm(admin, gen)
      if (!film) return NextResponse.json({ error: 'sem fast_scene_plan para este generation_id (não é filme do Kineo 1?)' }, { status: 404 })
      const result = await replayFilm(admin, film, opts)
      return NextResponse.json({ ok: true, options: { ...opts, deadlineAt: undefined }, film: result, ms: Date.now() - inicio })
    }
    const last = intParam(url, 'last', 10, 1, LOTE_MAX)
    const maxImage = intParam(url, 'max_image', 60, 0, 100)
    const offset = intParam(url, 'offset', 0, 0, 10_000)
    const days = intParam(url, 'days', 10, 1, 30)
    const { ids, eligible } = await pickReplayBatch(admin, { last, maxImage, offset, days, excludeEmails: CONTAS_DA_CASA })
    const films: ReplayFilmResult[] = []
    const pulados: Array<{ generation_id: string; reason: string }> = []
    let feitos = 0
    for (const id of ids) {
      if (Date.now() > deadlineAt - 45_000) break // um filme leva ~20-60 s: não começa o que não termina
      feitos++
      try {
        const film = await loadReplayFilm(admin, id)
        if (!film) { pulados.push({ generation_id: id, reason: 'sem_plano' }); continue }
        films.push(await replayFilm(admin, film, opts))
      } catch (err) {
        pulados.push({ generation_id: id, reason: err instanceof Error ? err.message.slice(0, 120) : 'erro' })
      }
    }
    const nextOffset = feitos < ids.length ? offset + feitos : null
    return NextResponse.json({
      ok: true,
      options: { ...opts, deadlineAt: undefined, last, max_image: maxImage, offset, days },
      eligible,
      requested: ids.length,
      processed: films.length,
      next_offset: nextOffset,
      distribution: summarizeReplay(films),
      skipped: pulados,
      films,
      ms: Date.now() - inicio,
    })
  } catch (err) {
    console.error('[kineo1-replay] falhou:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'replay_failed', detail: err instanceof Error ? err.message.slice(0, 200) : null }, { status: 500 })
  }
}

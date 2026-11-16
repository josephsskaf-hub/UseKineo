// KINEO-PLACAR-FILME-GRATIS-1611 — leitura do placar do 1º filme grátis (só servidor; a conta fica em placarFilmeGratis.ts).
// Sem RPC nova (sem migration): vídeos concluídos dos últimos dias, plano da conta, nota do revisor pelo link e a nota automática
// (evento nota_auto v3, sombra) pelo id do vídeo. Grátis = conta no plano free hoje, sem contas internas (régua da partida da CEO).
import type { SupabaseClient } from '@supabase/supabase-js'
import { readAll } from '@/lib/supabase/readAll'
import { isInternalEmail } from '@/lib/internalAccounts'
import { inicioDaLeitura, type FilmeDoPlacar } from '@/lib/admin/placarFilmeGratis'

const ROTA = '/api/admin/placar-filme-gratis'
const NOTA_AUTO_VERSAO = 'nota_auto_v3_regua19'
const LOTE = 100

type Video = { id: string; user_id: string; created_at: string; engine_used: string | null; video_url: string | null; quality_mode: string | null }

const lotes = <T,>(xs: T[], n = LOTE) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n))

async function emLotes<T>(valores: string[], ler: (lote: string[]) => Promise<T[]>): Promise<T[]> {
  const out: T[] = []
  for (const l of lotes([...new Set(valores)])) out.push(...(await ler(l)))
  return out
}

export async function lerFilmesDoPlacar(admin: SupabaseClient, agora: number): Promise<FilmeDoPlacar[]> {
  const desde = inicioDaLeitura(agora)
  const { data: videos } = await readAll<Video>(() => admin.from('videos').select('id,user_id,created_at,engine_used,video_url,quality_mode').eq('status', 'completed').gte('created_at', desde) as never, { route: ROTA, table: 'videos' })
  const doFilme = (videos ?? []).filter((v) => v.quality_mode === 'cinematic_ai' && v.user_id)
  if (!doFilme.length) return []
  const perfis = await emLotes(doFilme.map((v) => v.user_id), async (ids) => (await readAll<{ id: string; plan: string | null; email: string | null }>(() => admin.from('profiles').select('id,plan,email').in('id', ids) as never, { route: ROTA, table: 'profiles' })).data ?? [])
  const gratis = new Set(perfis.filter((p) => p.plan === 'free' && !isInternalEmail(p.email)).map((p) => p.id))
  const filmes = doFilme.filter((v) => gratis.has(v.user_id))
  if (!filmes.length) return []
  // 1º filme = nenhum vídeo concluído antes (de qualquer tipo), nem dentro da janela nem antes dela.
  const antes = await emLotes(filmes.map((v) => v.user_id), async (ids) => (await readAll<{ id: string; user_id: string }>(() => admin.from('videos').select('id,user_id').eq('status', 'completed').lt('created_at', desde).in('user_id', ids) as never, { route: ROTA, table: 'videos' })).data ?? [])
  const jaTinha = new Set(antes.map((v) => v.user_id))
  const primeiroNaJanela = new Map<string, Video>()
  for (const v of videos ?? []) { const p = primeiroNaJanela.get(v.user_id); if (!p || v.created_at < p.created_at) primeiroNaJanela.set(v.user_id, v) }
  const links = filmes.map((v) => v.video_url).filter((l): l is string => !!l)
  const notas = await emLotes(links, async (ls) => (await readAll<{ link: string; nota: number | string | null; defeitos: string[] | null; fonte: string | null }>(() => admin.from('film_review_notes').select('link,nota,defeitos,fonte').in('link', ls) as never, { route: ROTA, table: 'film_review_notes', key: 'link' })).data ?? [])
  const notaPorLink = new Map(notas.filter((n) => n.fonte !== 'auto' && n.nota !== null && Number.isFinite(Number(n.nota))).map((n) => [n.link, n]))
  const eventos = await emLotes(filmes.map((v) => v.id), async (ids) => (await readAll<{ id: string; session_id: string; created_at: string; score: unknown; versao: string | null }>(() => admin.from('events').select('id,session_id,created_at,score:metadata->score,versao:metadata->>version').eq('name', 'nota_auto').in('session_id', ids) as never, { route: ROTA, table: 'events' })).data ?? [])
  const autoPorVideo = new Map<string, { t: string; nota: number }>()
  for (const e of eventos) {
    if (e.versao !== NOTA_AUTO_VERSAO || typeof e.score !== 'number' || !Number.isFinite(e.score)) continue
    const a = autoPorVideo.get(e.session_id)
    if (!a || e.created_at > a.t) autoPorVideo.set(e.session_id, { t: e.created_at, nota: e.score })
  }
  return filmes.map((v) => {
    const n = v.video_url ? notaPorLink.get(v.video_url) : undefined
    return {
      id: v.id,
      criadoEm: v.created_at,
      motor: v.engine_used,
      primeiro: !jaTinha.has(v.user_id) && primeiroNaJanela.get(v.user_id)?.id === v.id,
      notaRevisor: n ? Number(n.nota) : null,
      defeitos: n?.defeitos ?? [],
      notaAuto: autoPorVideo.get(v.id)?.nota ?? null,
    }
  })
}


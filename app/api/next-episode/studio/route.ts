import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { POST as escreverProximoEpisodio } from '@/app/api/next-episode/route'
import { ideiaDoProximoEpisodio, linguaPelaEscrita } from '@/lib/proximoEpisodioStudio'
import { duracaoDoStudio, EPISODIO_DA_TELA_MAX_CHARS, linkDoProximoEpisodio, motorDoStudio, PROXIMO_EPISODIO_MARCA } from '@/lib/proximoEpisodioLink'
import { detectNarrationLanguage, narrationLanguage } from '@/lib/textLanguage'
import { lerFichaDoFilme, protagonistaDoEpisodio } from '@/lib/fichaDoEpisodio' // KINEO-PROXIMO-EPISODIO-0111-SEMANTICA

// ═══ KINEO-PROXIMO-EPISODIO-0111 — POST /api/next-episode/studio (vai do fundador 01/11 "vai tudo") ═══
//
// O botão "Next episode" da tela de filme pronto e do cartão da biblioteca chama ESTA rota com o id do filme. Ela:
//   1. lê o filme RESTRITO AO DONO (mesmo client autenticado, nunca service key): pedido, narração, motor e duração;
//   2. pede o episódio seguinte ao escritor que já existe (app/api/next-episode — memória por filme, cooldown, ALREADY
//      COVERED, âncora de assunto e, desde hoje, a ficha do personagem). É uma chamada EM PROCESSO, com a mesma sessão:
//      a tela de pronto já aqueceu a memória dele, então aqui costuma voltar da memória, sem GPT;
//   3. monta a ideia do Studio com a ficha (lib/proximoEpisodioStudio.ts) e o link com o MESMO motor, duração e língua
//      (lib/proximoEpisodioLink.ts).
// KINEO-PROXIMO-EPISODIO-0111-SEMANTICA — a ficha vem do rótulo do autor ou de UMA leitura semântica do pedido + narração
// (lib/fichaDoEpisodio.ts), a MESMA que o escritor em processo usa (memória em processo: uma chamada por filme). Com ficha e
// episódio escrito, uma 2ª leitura curta diz quem o EPISÓDIO segue (o protagonista trocado por "Mia" sai). Toda leitura tem
// falha segura: não veio = sem ficha / só a checagem determinística. O resultado volta na resposta para o evento
// next_episode_link_ready (auditoria). A duração: o alvo da tela; sem ele, o alvo que o filme PEDIU (evento
// generate_completed com o render_id do filme, quando existe); só então a medida do MP4.
// Nada é cobrado, renderizado ou gravado aqui: o crédito só sai quando a pessoa aperta Create no Studio.
// O escritor falhou (cooldown 429, OpenAI fora, 502)? O link sai assim mesmo, com ficha + "a história até aqui" — o
// botão nunca vira erro em cima de um filme que deu certo.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Corpo {
  fromVideoId?: string
  /** A língua que a tela sabe (o /generate sabe; a biblioteca não). */
  language?: string
  /** Motor que a tela quer no episódio (chave do Studio ou quality_mode). Sem ele, o do filme de origem. */
  engine?: string
  /** Segundos do filme de origem, quando a tela sabe (o /generate manda o ALVO escolhido; a biblioteca, o MP4 medido). */
  durationSeconds?: number
  /** KINEO-PROXIMO-EPISODIO-0111-SEMANTICA — true quando durationSeconds é o ALVO escolhido (tela de pronto), não a medida. */
  durationIsTarget?: boolean
  /** KINEO-PROXIMO-EPISODIO-0111 (revisão) — o episódio que a tela de pronto JÁ mostra no cartão. Só texto que vai para a
   *  caixa do Studio do próprio dono (nada é cobrado nem gravado); usá-lo evita um 2º escritor em paralelo com o do cartão
   *  e garante o MESMO episódio no cartão e no Studio. Ainda passa pelo filtro de assunto. */
  episode?: { title?: string; script?: string }
}

interface LinhaFilme {
  id: string
  title: string | null
  topic: string | null
  script: string | null
  quality_mode: string | null
  duration: number | null
  duration_seconds: number | null
  render_id: string | null
}

/** KINEO-PROXIMO-EPISODIO-0111-SEMANTICA — a duração que o filme PEDIU (generate_completed.duration, casado pelo render_id).
 *  `events` é service-role-only (lockdown de 26/08); sem chave de serviço, ou sem evento (≈ metade dos filmes), null. */
async function duracaoPedida(userId: string, renderId: string | null): Promise<number | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || !renderId) return null
  try {
    const admin = createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await admin
      .from('events')
      .select('metadata')
      .eq('user_id', userId)
      .eq('name', 'generate_completed')
      .eq('metadata->>render_id', renderId)
      .order('created_at', { ascending: false })
      .limit(1)
    if (error || !Array.isArray(data) || !data[0]) return null
    const d = Number((data[0] as { metadata?: { duration?: unknown } }).metadata?.duration)
    return Number.isFinite(d) && d > 0 && d <= 600 ? d : null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

    let body: Corpo
    try { body = (await req.json()) as Corpo } catch { return NextResponse.json({ error: 'invalid body' }, { status: 400 }) }
    const fromVideoId = typeof body.fromVideoId === 'string' ? body.fromVideoId.trim() : ''
    if (!UUID_RE.test(fromVideoId)) return NextResponse.json({ error: 'fromVideoId is required' }, { status: 400 })

    // `.eq('user_id', user.id)` não é enfeite: impede ler o filme de outra pessoa por uuid adivinhado.
    const { data, error } = await supabase
      .from('videos')
      .select('id, title, topic, script, quality_mode, duration, duration_seconds, render_id')
      .eq('id', fromVideoId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) return NextResponse.json({ error: 'could not read the film' }, { status: 503 })
    if (!data) return NextResponse.json({ error: 'film not found' }, { status: 404 })
    const filme = data as LinhaFilme
    const narracao = (filme.script ?? '').trim()
    const pedido = (filme.topic ?? '').trim()

    // A língua: a da tela vence; sem ela, a do texto do filme (escrita própria, depois o vocabulário da casa); senão en.
    const amostra = narracao || pedido
    const language = narrationLanguage(body.language)
      ?? linguaPelaEscrita(amostra)
      ?? detectNarrationLanguage(amostra).language
      ?? 'en'

    // KINEO-PROXIMO-EPISODIO-0111-SEMANTICA — a leitura da ficha começa JÁ (o escritor em processo pega a mesma, em voo).
    const fichaP = lerFichaDoFilme({ pedido, narracao, titulo: filme.title }, { prazoTotalMs: 5_000 })
    const alvoTela = typeof body.durationSeconds === 'number' && body.durationSeconds > 0 && body.durationIsTarget === true
    const duracaoP = alvoTela ? Promise.resolve(null) : duracaoPedida(user.id, filme.render_id ?? null)

    // (2) o escritor de sempre, em processo. Falha = segue sem o episódio escrito.
    let episodio: { title?: string; script?: string; episodeNumber?: number } | null = null
    let escritor: number | 'erro' | 'tela' = 'erro'
    const daTela = body.episode && typeof body.episode.script === 'string' && body.episode.script.trim()
      ? { title: typeof body.episode.title === 'string' ? body.episode.title.slice(0, 200) : '', script: body.episode.script.slice(0, EPISODIO_DA_TELA_MAX_CHARS) }
      : null
    if (daTela) { episodio = daTela; escritor = 'tela' }
    else try {
      const interno = new NextRequest(new URL('/api/next-episode', req.nextUrl.origin), {
        method: 'POST',
        // a sessão vem de next/headers (o mesmo pedido) — o escritor lê o dono pelo mesmo cookie, nada viaja aqui
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fromVideoId, previousTopic: narracao, language }),
      })
      const res = await escreverProximoEpisodio(interno)
      escritor = res.status
      if (res.ok) {
        const d = (await res.json()) as { title?: string; script?: string; episodeNumber?: number }
        if (typeof d.script === 'string' && d.script.trim()) episodio = d
      }
    } catch (e) {
      console.warn('[next-episode/studio] escritor', e instanceof Error ? e.message : String(e))
    }

    const fichaLida = await fichaP
    // quem o episódio segue — só importa quando há personagem para trocar (prazo curto, sem 2ª tentativa)
    const protagonistaEp = episodio && fichaLida.aplicada?.formato === 'story' && fichaLida.aplicada.fichas.length
      ? await protagonistaDoEpisodio(episodio, { prazoTotalMs: 3_500, tentativas: 1 })
      : undefined

    const montada = ideiaDoProximoEpisodio({
      titulo: filme.title,
      pedido,
      narracao,
      episodio,
      // o número do escritor conta TODOS os filmes da conta; o da série sai da moldura do pedido (lib/proximoEpisodioStudio)
      episodeNumber: null,
      ficha: fichaLida.aplicada,
      protagonistaDoEpisodio: protagonistaEp,
    })

    const engine = motorDoStudio(body.engine) ?? motorDoStudio(filme.quality_mode)
    const pedida = await duracaoP
    const segundos = alvoTela
      ? body.durationSeconds
      : pedida ?? (typeof body.durationSeconds === 'number' && body.durationSeconds > 0 ? body.durationSeconds : filme.duration_seconds ?? filme.duration)
    const duration = duracaoDoStudio(engine, segundos)
    const studioHref = linkDoProximoEpisodio({ prompt: montada.ideia, engine, duration, language, parentVideoId: fromVideoId })
    if (!studioHref) return NextResponse.json({ error: 'no usable idea' }, { status: 422 })

    if (montada.episodioFora) console.info('[next-episode/studio] episódio escrito fora do assunto, descartado da ideia', fromVideoId)

    return NextResponse.json({
      studioHref,
      idea: montada.ideia,
      fichas: montada.fichas,
      engine,
      duration,
      language,
      episodeNumber: montada.numero,
      wroteEpisode: Boolean(episodio),
      usedEpisode: montada.usouEpisodio,
      episodeOffTopic: montada.episodioFora,
      // KINEO-PROXIMO-EPISODIO-0111-SEMANTICA — auditoria (o cliente grava no next_episode_link_ready)
      characterSource: montada.modo,
      characterReading: { ...fichaLida.auditoria, protagonista_do_episodio: protagonistaEp === undefined ? 'nao_lido' : protagonistaEp },
      durationSource: alvoTela ? 'target' : pedida ? 'requested' : 'measured',
      writerStatus: escritor,
      marker: PROXIMO_EPISODIO_MARCA,
    })
  } catch (e) {
    console.error('[next-episode/studio]', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

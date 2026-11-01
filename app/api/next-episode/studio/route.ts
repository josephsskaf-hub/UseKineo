import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { POST as escreverProximoEpisodio } from '@/app/api/next-episode/route'
import { ideiaDoProximoEpisodio, linguaPelaEscrita } from '@/lib/proximoEpisodioStudio'
import { duracaoDoStudio, linkDoProximoEpisodio, motorDoStudio, PROXIMO_EPISODIO_MARCA } from '@/lib/proximoEpisodioLink'
import { detectNarrationLanguage, narrationLanguage } from '@/lib/textLanguage'

// ═══ KINEO-PROXIMO-EPISODIO-0111 — POST /api/next-episode/studio (vai do fundador 01/11 "vai tudo") ═══
//
// O botão "Next episode" da tela de filme pronto e do cartão da biblioteca chama ESTA rota com o id do filme. Ela:
//   1. lê o filme RESTRITO AO DONO (mesmo client autenticado, nunca service key): pedido, narração, motor e duração;
//   2. pede o episódio seguinte ao escritor que já existe (app/api/next-episode — memória por filme, cooldown, ALREADY
//      COVERED, âncora de assunto e, desde hoje, a ficha do personagem). É uma chamada EM PROCESSO, com a mesma sessão:
//      a tela de pronto já aqueceu a memória dele, então aqui costuma voltar da memória, sem GPT;
//   3. monta a ideia do Studio com a ficha (lib/proximoEpisodioStudio.ts) e o link com o MESMO motor, duração e língua
//      (lib/proximoEpisodioLink.ts).
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
  /** Segundos do filme de origem, quando a tela sabe (o MP4 medido). */
  durationSeconds?: number
}

interface LinhaFilme {
  id: string
  title: string | null
  topic: string | null
  script: string | null
  quality_mode: string | null
  duration: number | null
  duration_seconds: number | null
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
      .select('id, title, topic, script, quality_mode, duration, duration_seconds')
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

    // (2) o escritor de sempre, em processo. Falha = segue sem o episódio escrito.
    let episodio: { title?: string; script?: string; episodeNumber?: number } | null = null
    let escritor: number | 'erro' = 'erro'
    try {
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

    const montada = ideiaDoProximoEpisodio({
      titulo: filme.title,
      pedido,
      narracao,
      episodio,
      // o número do escritor conta TODOS os filmes da conta; o da série sai da moldura do pedido (lib/proximoEpisodioStudio)
      episodeNumber: null,
    })

    const engine = motorDoStudio(body.engine) ?? motorDoStudio(filme.quality_mode)
    const segundos = typeof body.durationSeconds === 'number' && body.durationSeconds > 0
      ? body.durationSeconds
      : filme.duration_seconds ?? filme.duration
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
      writerStatus: escritor,
      marker: PROXIMO_EPISODIO_MARCA,
    })
  } catch (e) {
    console.error('[next-episode/studio]', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

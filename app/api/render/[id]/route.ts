import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { refundRenderCredits } from '@/lib/credits/refund'
// KINEO-RENDER-OWNERSHIP-2026-08-06 — ver o bloco de comentário no GET.
import { getRenderIntent } from '@/lib/credits/renderIntent'
// ═══ KINEO-DATA-CACHE-2026-09-02 (sprint-assinaturas #17) ═══════════════════
// Rota SO-GET no Next 14.2: sem POST no modulo, o store nasce com
// revalidate=false, e `dynamic='force-dynamic'` NAO muda isso (so pula o proxy
// que marcaria a rota como dinamica). Resultado: todo GET do supabase-js (e da
// fal/Creatomate) com URL estavel ia para o Data Cache da Vercel PARA SEMPRE —
// a rota lia o banco como ele estava na PRIMEIRA vez que aquela URL foi pedida.
// Provado em producao 02/09: cron de resgate contando 1 tentativa com 3 no
// banco, marcador stranded_composed invisivel 13 min depois de gravado,
// "claim row missing" logo apos 23505 no MESMO id, e-mail de video pronto
// repetido 15 min depois (be9c6314). Esta linha e o unico interruptor que
// zera o revalidate ANTES do primeiro fetch. Nao remover.
export const fetchCache = 'force-no-store'

export const maxDuration = 30

type Status = 'rendering' | 'succeeded' | 'failed'

interface CreatomateRender {
  id?: string
  status?: string
  url?: string
  snapshot_url?: string
  error_message?: string
  progress?: number
}

function mapStatus(s: string | undefined): Status {
  switch ((s ?? '').toLowerCase()) {
    case 'succeeded':
      return 'succeeded'
    case 'failed':
    case 'cancelled':
      return 'failed'
    case 'planned':
    case 'waiting':
    case 'transcribing':
    case 'rendering':
    default:
      return 'rendering'
  }
}

function progressFromStatus(s: string | undefined, raw?: number): number {
  if (typeof raw === 'number' && raw >= 0 && raw <= 100) return Math.round(raw)
  switch ((s ?? '').toLowerCase()) {
    case 'planned':
      return 5
    case 'waiting':
      return 10
    case 'transcribing':
      return 25
    case 'rendering':
      return 60
    case 'succeeded':
      return 100
    case 'failed':
    case 'cancelled':
      return 0
    default:
      return 15
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
    }

    const id = (params.id ?? '').trim()
    if (!id) {
      return NextResponse.json({ error: 'Render id is required.' }, { status: 400 })
    }

    if (id.startsWith('mock-')) {
      return NextResponse.json({
        status: 'succeeded' as Status,
        url: null,
        isMock: true,
        progress: 100,
      })
    }

    // ═══ KINEO-RENDER-OWNERSHIP-2026-08-06 ═══════════════════════════════════
    // ANTES: esta rota verificava APENAS que existe um login. Qualquer usuário
    // autenticado que soubesse um render_id alheio recebia (a) a URL do MP4 de
    // outra pessoa e (b) um refundRenderCredits() no ledger de crédito DELA.
    //
    // A prova de posse é `render_jobs` — escrita pelo SERVIDOR no nascimento do
    // render (service-role, RLS ignorada), nunca pelo navegador. Deliberadamente
    // NÃO uso `videos` para isso: aquela linha é escrita pelo CLIENTE (comentário
    // em compose/status: "videos is written only after the client polls"), então
    // um cliente malicioso poderia inserir uma linha com o próprio user_id e o
    // render_id alheio e FORJAR a posse. Prova de posse escrita pelo cliente não
    // é prova.
    //
    // Chave: `legacy-<id>` — a MESMA do ledger (ver lib/credits/refund.ts), para
    // que o par débito/refund e a posse tenham um único identificador. Efeito
    // colateral desejado: debit_video_credits passa a achar a linha e usar o
    // custo autoritativo do servidor. Manter a chave crua faria compose/status
    // enxergar um render legado como intent válido (quality desconhecida →
    // normalizeQuality → 'basic_ai' = 8 créditos) e abriria uma cobrança dupla.
    //
    // AUSÊNCIA de linha NEGA (fail closed). Esta rota é a IRMÃ de
    // /api/compose/status, e a decisão já estava escrita lá, em comentário, por
    // outra pessoa: "A provider render id by itself is not authorization. (...)
    // fail closed for legacy or orphan ids instead of polling and exposing a URL
    // to whichever authenticated user guessed it." A primeira versão deste diff
    // deixava a ausência passar "por availability-first" e citava a rota irmã
    // como precedente — a revisão adversarial mostrou que a rota irmã decidiu o
    // CONTRÁRIO. Deixar passar tornaria a correção cosmética: hoje NENHUM render
    // legado tem linha de posse, então "não nega quando falta" = não nega nunca.
    //
    // Três estados:
    //   null      → ausência CONFIRMADA: 404.
    //   mismatch  → 404 (e não 403: um 403 confirma que o render existe).
    //   undefined → a consulta não pôde ser feita (blip/env). AQUI ESTA ROTA
    //               DIVERGE DA IRMÃ DE PROPÓSITO, e a divergência foi imposta
    //               pela 2ª passada da revisão: compose/status devolve 503, mas
    //               os DOIS clientes que pollam ESTA rota tratam qualquer
    //               não-200 como TERMINAL (CreateClient dá `break` no laço;
    //               VideoClient faz setRenderStatus('failed')). Um 503 aqui
    //               transformaria um blip de 1s do Supabase em render pago morto.
    //               Então o transiente responde 200 "ainda renderizando", SEM
    //               url: o cliente simplesmente polla de novo no ciclo seguinte,
    //               que é o comportamento correto para uma indisponibilidade
    //               temporária. Nada vaza — a URL só sai com posse provada.
    //
    // DENOMINADOR DA RIGIDEZ (medido em produção hoje, não estimado): `events`
    // tem 0 registros em `/create` na história inteira e 0 em `/video` nos
    // últimos 30 dias, contra 15.977 em `/generate`; e há 0 linhas `legacy-%`
    // em credit_debits desde que o ledger existe (12/06, 257 débitos). Este
    // pipeline está MORTO em produção — nenhum usuário real é afetado por esta
    // rigidez, e é por isso que ela pode ser rígida.
    const intent = await getRenderIntent(`legacy-${id}`)
    if (intent === undefined) {
      console.warn(`[render/id] ownership lookup unavailable render=${id.slice(0, 8)} — respondendo 'rendering'`)
      return NextResponse.json({ status: 'rendering' as Status, progress: 15, url: null })
    }
    if (!intent || intent.userId !== user.id) {
      console.warn(`[render/id] ownership denied render=${id.slice(0, 8)} caller=${user.id.slice(0, 8)} had_intent=${!!intent}`)
      return NextResponse.json({ error: 'Render not found.' }, { status: 404 })
    }

    const creatomateKey = process.env.CREATOMATE_API_KEY
    if (!creatomateKey) {
      return NextResponse.json(
        { error: 'Render service is not configured.' },
        { status: 500 }
      )
    }

    let res: Response
    try {
      res = await fetch(`https://api.creatomate.com/v1/renders/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${creatomateKey}` },
        cache: 'no-store',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[render/id] fetch error:', msg)
      return NextResponse.json(
        { error: 'Render service unreachable.' },
        { status: 502 }
      )
    }

    if (!res.ok) {
      console.error('[render/id] non-ok status:', res.status)
      return NextResponse.json(
        { error: 'Render service rejected the lookup.' },
        { status: 502 }
      )
    }

    const data = (await res.json()) as CreatomateRender
    const status = mapStatus(data.status)
    const progress = progressFromStatus(data.status, data.progress)

    // AUTO-REFUND (TAAFT feedback) — this legacy path debits upfront in
    // /api/render (ledger key `legacy-<renderId>`); when Creatomate reports
    // failed/cancelled, give the credit back. Idempotent: the RPC only claims
    // rows WHERE refunded_at IS NULL, so re-polls can never refund twice.
    //
    // KINEO-RENDER-OWNERSHIP-2026-08-06 — chegar aqui já implica posse provada
    // (a guarda acima nega ausência e mismatch), então o refund segue
    // incondicional. Correção de uma frase que eu tinha escrito errado: o vetor
    // grave desta rota era o VAZAMENTO DA URL do vídeo alheio. O refund alheio
    // era uma escrita não autorizada no ledger de outra pessoa, mas ele devolvia
    // crédito à VÍTIMA (o RPC credita o dono da linha em credit_debits, não o
    // chamador) e só com a Creatomate reportando `failed` — não transferia valor
    // para o atacante. Registrar isso aqui para o próximo leitor não herdar o
    // exagero.
    let creditsRefunded = 0
    if (status === 'failed') {
      creditsRefunded = await refundRenderCredits(`legacy-${id}`)
    }

    return NextResponse.json({
      status,
      progress,
      url: data.url ?? null,
      creditsRefunded,
      error:
        status === 'failed'
          ? (data.error_message ?? 'Render failed.') +
            (creditsRefunded > 0 ? ` Your ${creditsRefunded} credit was automatically refunded.` : '')
          : undefined,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[render/id] unexpected error:', msg)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

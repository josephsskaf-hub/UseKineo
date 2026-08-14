// PUSH #100 — Attributed watermark landing: /free
//
// Every free "Fast" render burns `usekineo.com/free` into the top of the frame
// (lib/compose.ts, WATERMARK_TEXT). That burn is Kineo's only owned
// distribution surface: it rides along on every Short a free user publishes to
// YouTube / TikTok, and a viewer can only act on it by TYPING it. So the path
// has to be short, real, and attributable.
//
// This handler is the landing side of that contract:
//   1. stamps a 90-day FIRST-TOUCH httpOnly cookie (`kineo_wm_src=watermark`)
//      so the attribution survives even if the visitor strips the query string,
//      bounces through Google OAuth, or lands again days later;
//   2. 307-redirects to `/` WITH utm_source/medium/campaign, so the existing
//      client-side first-touch capture (captureUtmsOnce / captureSourceOnce in
//      lib/analytics.ts) records it through the normal path — no new pipeline.
//
// Why the value is `watermark` and not `usekineo.com`: lib/acquisitionSource.ts
// nulls any source whose token is one of OWN_HOSTS (usekineo.com is in that
// set), so burning the bare domain as a utm_source would be discarded as a
// self-referral and land in the `direct` bucket. `watermark` is not a host, so
// sanitizeAcquisitionUtmSource() falls through to its final `return token` and
// the source is preserved verbatim.
//
// Modelled on app/a/[code]/route.ts (the affiliate first-touch handler), minus
// the Supabase click log — there is no verified table for watermark clicks and
// this route must never depend on one.
//
// ── KINEO-DISTRIBUTION-LOOP-2026-08-11 ──────────────────────────────────────
// "It performs NO database writes" era verdade e custava caro: com zero escrita,
// esta rota é o único elo do loop de distribuição sem NENHUM traço. A pergunta
// que o fundador precisa responder — "quanto vale um vídeo postado?" — só tem
// resposta se der para contar as chegadas vindas da marca d'água, e hoje o
// denominador é literalmente invisível: `signup_utm_source='watermark'` tem 0
// linhas em 1.068 perfis, e não há como distinguir "ninguém digitou a URL" de
// "digitaram e o funil perdeu antes do cadastro".
//
// Passa a escrever UM evento (`watermark_landing`), e só na primeira visita
// (junto com o cookie de first-touch), para que revisitas não inflem o número.
// O contrato da rota continua valendo, com três garantias:
//   · o evento tem TIMEOUT — 800 ms e o redirect segue sem ele;
//   · `writeServerEvent` já tem como contrato nunca lançar;
//   · o `catch` externo continua entregando o redirect aconteça o que acontecer.
// A ordem é deliberada: o `NextResponse.redirect` é montado ANTES da escrita,
// então nenhum caminho de erro pode fazer o visitante deixar de chegar ao
// produto. Nada de PII: só o país do header da CDN e o referer, sem IP, sem
// user-agent, sem query string do visitante.
import { NextRequest, NextResponse } from 'next/server'
import { writeServerEvent } from '@/lib/serverEvents'

// Must never be statically cached: it sets a Set-Cookie header per visitor.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const COOKIE = 'kineo_wm_src'
const COOKIE_VALUE = 'watermark'
const COOKIE_MAX_AGE = 90 * 24 * 60 * 60 // 90 days, in seconds — matches /a/[code]

// Kept in one place so the burned frame, this redirect and any future report
// can never drift apart.
// AQUISICAO T2 (14/08) — quem digita usekineo.com/free ACABOU DE VER um video
// nosso: e o trafego de maior intencao da casa. A home converteu esse trafego
// pior que as paginas-ferramenta (medicao 14/08: ferramentas 41-67% de clique
// para o produto, artigos/home genericos ~0%). O destino vira a ferramenta
// "faca o seu gratis" — mesma UTM, mesmo cookie first-touch, so a pontaria
// mudou. A URL queimada nos videos continua /free e nunca muda.
const TARGET = '/free-ai-shorts-generator?utm_source=watermark&utm_medium=video&utm_campaign=free_fast'

/** Teto do tempo que a medição pode roubar do redirect. Estourou, o visitante
 *  vai embora para o produto e o evento se perde — nessa ordem de prioridade. */
const EVENT_TIMEOUT_MS = 800

export async function GET(req: NextRequest) {
  try {
    const res = NextResponse.redirect(new URL(TARGET, req.nextUrl.origin), 307)

    // FIRST-TOUCH: never overwrite an existing stamp. A viewer who arrived from
    // an affiliate link or an SEO page weeks ago and only now types the
    // watermark URL was not acquired by the watermark.
    const firstTouch = !req.cookies.get(COOKIE)?.value
    if (firstTouch) {
      res.cookies.set(COOKIE, COOKIE_VALUE, {
        maxAge: COOKIE_MAX_AGE,
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
      })

      // KINEO-DISTRIBUTION-LOOP-2026-08-11 — a chegada, contada uma vez por
      // visitante. Só no first-touch: quem volta pelo mesmo navegador já foi
      // contado, e contá-lo de novo transformaria o numerador do "vale a pena
      // postar?" em contagem de recarregamentos.
      //
      // `country` vem do header da CDN e é a granularidade máxima permitida
      // aqui: o repositório é PÚBLICO e o dado tem que poder ser citado num doc
      // sem expor ninguém. Sem IP, sem user-agent, sem identificador de sessão
      // — este visitante ainda não é um usuário.
      const country =
        req.headers.get('x-vercel-ip-country') ?? req.headers.get('cf-ipcountry') ?? null
      let referrer: string | null = null
      try {
        const raw = req.headers.get('referer')
        // Só o host. A URL cheia de um referer pode carregar query string de
        // terceiros, que é exatamente o tipo de dado que não pode entrar numa
        // tabela que este doc vai consultar.
        referrer = raw ? new URL(raw).hostname.slice(0, 120) : null
      } catch {
        referrer = null
      }

      // O timer é limpo no `finally`: sem isso ele seguraria a lambda viva por
      // até 800 ms DEPOIS de a escrita já ter voltado, em toda visita.
      //
      // Superfície de abuso: a rota é pública e não autenticada, então um
      // script sem cookie poderia gerar uma escrita por requisição. Isso NÃO é
      // uma classe nova de exposição — /api/events já aceita escrita anônima
      // do cliente pelo mesmo motivo (é assim que a analytics de landing
      // funciona) — e o custo de uma linha é desprezível. Se um dia virar
      // problema, o lugar de resolver é o mesmo dos dois: rate limit por IP na
      // borda, não um evento a menos aqui.
      let timer: ReturnType<typeof setTimeout> | undefined
      try {
        await Promise.race([
          writeServerEvent({
            name: 'watermark_landing',
            path: '/free',
            metadata: {
              source: COOKIE_VALUE,
              ...(country ? { country: country.slice(0, 4) } : {}),
              // `null` quando a URL foi DIGITADA — que é o caso normal de uma
              // marca d'água queimada no frame, e o único jeito de separar
              // "alguém leu o vídeo" de "alguém clicou num link em algum lugar".
              referrer_host: referrer,
            },
          }),
          new Promise<boolean>((resolve) => {
            timer = setTimeout(() => resolve(false), EVENT_TIMEOUT_MS)
          }),
        ])
      } finally {
        if (timer) clearTimeout(timer)
      }
    }
    return res
  } catch (err) {
    // The redirect matters more than the attribution: a visitor who typed the
    // burned URL must ALWAYS reach the product. A relative Location is valid
    // per RFC 7231 and needs no URL parsing, so this branch cannot itself fail.
    console.error('[watermark /free] error:', err)
    return new NextResponse(null, { status: 307, headers: { Location: TARGET } })
  }
}

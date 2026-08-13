// KINEO-STALLED-RESCUE-RAMP-2026-08-13
//
// A CAMPANHA MAIS BEM REVISADA DA CASA NUNCA MANDOU UM E-MAIL. HOJE FAZ 18 DIAS.
//
// `app/api/admin/send-stalled-rescue` nasceu em 26/07, foi consertada em 11/08
// (suppression cruzada, fonte única de contas internas, copy ramificada por
// trial, duas revisões adversariais) e continua com **0 envios em 231 pessoas**
// — medido no banco em 13/08, não herdado de doc: `stalled_rescue_emailed` é
// `true` em 0 linhas de `profiles`.
//
// A causa não é código. A sprint de 11/08 decidiu, com razão, que "campanha que
// nunca saiu uma vez não estreia em automático para 231 pessoas na voz pessoal
// do fundador" e deixou o primeiro lote como **uma URL de um clique no
// relatório**. Dois dias depois a URL não foi clicada, e a coorte cresceu ~3
// pessoas por dia. O gate humano virou o próprio vazamento.
//
// O QUE ESTE ARQUIVO MUDA — e é só isto:
// ─────────────────────────────────────
// Ele não reescreve a campanha, não toca na copy, não afrouxa um filtro. Ele
// substitui "231 de uma vez, quando alguém clicar" por **uma rampa diária
// pequena que estreia sozinha**: no máximo `DAILY_LIMIT` por dia, a coorte mais
// urgente primeiro (a ordenação por relógio de trial vive na rota admin). Se a
// copy tiver um problema que as duas revisões não pegaram, ele aparece em 25
// e-mails, não em 231 — que é exatamente a proteção que a decisão de 11/08
// queria, obtida sem depender de um clique.
//
// POR QUE UM WRAPPER E NÃO UMA ENTRADA COM QUERY STRING NO vercel.json:
// a rota que faz o trabalho mora em `/api/admin/...` e exige `confirm=SEND`.
// Registrar `"path": "/api/admin/send-stalled-rescue?confirm=SEND&limit=25"`
// dependeria de a plataforma preservar a query string do cron — comportamento
// que eu NÃO consegui verificar aqui, e cuja falha é SILENCIOSA: o cron roda,
// cai no ramo de DRY RUN, devolve 200 com `mode: "DRY_RUN"`, e a campanha
// segue com zero envios parecendo saudável. Foi assim que ela passou 18 dias
// morta. Um caminho de cron próprio não tem esse modo de falha.
//
// ZERO DUPLICAÇÃO DE LÓGICA: este handler monta uma `NextRequest` com os
// parâmetros certos e chama o MESMO `GET` da rota admin. Preflight da coluna de
// idempotência, filtros de coorte, exclusão de quem está no send-recovery,
// supressão cruzada de 24h, carimbo por pessoa e teto de lote continuam sendo
// executados pelo código original, uma vez só, sem cópia que possa apodrecer.
//
// COMO DESLIGAR (e por que é fácil de propósito): remova a entrada
// `/api/cron/send-stalled-rescue` de `vercel.json`. A rota admin volta a ser o
// que era — um clique manual — e nenhum outro job muda de comportamento.
import { NextRequest, NextResponse } from 'next/server'
import { GET as adminStalledRescue } from '@/app/api/admin/send-stalled-rescue/route'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

// Teto diário da rampa. 25/dia cobre as 231 pessoas em ~9 dias e mantém o raio
// de explosão de qualquer erro de copy no tamanho de um lote, não da coorte.
// Sobrescrevível por env SEM deploy (`KINEO_STALLED_RESCUE_DAILY_LIMIT`), mas o
// default vale sozinho: exigir uma variável nova seria devolver ao fundador o
// mesmo gate manual que este arquivo existe para remover.
const DEFAULT_DAILY_LIMIT = 25
// A rota admin já corta em 200 por lote; repetir o teto aqui impede que um
// valor absurdo na env vire um blast de coorte inteira por engano de digitação.
const MAX_DAILY_LIMIT = 60

function dailyLimit(): number {
  const raw = Number(process.env.KINEO_STALLED_RESCUE_DAILY_LIMIT)
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_DAILY_LIMIT
  return Math.min(Math.floor(raw), MAX_DAILY_LIMIT)
}

// Fail-closed cron auth (KINEO-CRON-FAILCLOSED-2026-07-27 pattern).
// Sem CRON_SECRET configurado ninguém entra — nem a plataforma. Um cron que
// autentica "quando dá" é um endpoint de envio de e-mail aberto na internet.
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const limit = dailyLimit()

  // A rota admin lê `confirm` e `limit` de `req.nextUrl.searchParams` e a
  // autenticação dela aceita o MESMO bearer do cron. Repassamos o header
  // recebido em vez de reconstruí-lo a partir da env: se algum dia a forma do
  // segredo mudar, as duas pontas mudam juntas por construção.
  const url = new URL(req.nextUrl.toString())
  url.pathname = '/api/admin/send-stalled-rescue'
  url.searchParams.set('confirm', 'SEND')
  url.searchParams.set('limit', String(limit))

  const inner = new NextRequest(url, {
    headers: { authorization: req.headers.get('authorization') ?? '' },
  })

  try {
    const res = await adminStalledRescue(inner)
    // Envelopa a resposta original preservando o corpo inteiro: o payload da
    // rota admin é a única prova de quantos saíram, quantos foram suprimidos e
    // se algum carimbo falhou. Perder isso aqui deixaria o log do cron dizendo
    // apenas "200 OK" — que é indistinguível dos 18 dias em que ela não mandou
    // nada.
    const body = await res.json().catch(() => null)
    console.log('[cron/stalled-rescue] ramp run', JSON.stringify({ limit, status: res.status, body }))
    return NextResponse.json({ ramp_limit: limit, inner_status: res.status, result: body }, { status: res.status })
  } catch (err) {
    console.error('[cron/stalled-rescue] failed:', err)
    return NextResponse.json(
      { error: 'stalled-rescue ramp failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

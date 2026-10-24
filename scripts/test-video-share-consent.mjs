// Guardião do KINEO-CONSENTIMENTO-DE-PARTILHA-2026-09-06 (sprint-assinaturas #27)
//
// Lê os ARQUIVOS REAIS (nunca importa por alias `@/` — módulo com alias morre no
// import antes da primeira verificação, lição registrada em 05/09). As
// verificações são de ORDEM, não de presença: "o arquivo contém a palavra
// verifyShareToken" sobrevive a um mutante que mova a checagem para DEPOIS da
// escrita, e é exatamente esse mutante que publicaria filme de cliente sem
// token.
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let ok = 0
const falhas = []
function checar(nome, condicao) {
  if (condicao) ok++
  else falhas.push(nome)
}

const politica = readFileSync('lib/publicSurfacePolicy.ts', 'utf8')
const publicVideos = readFileSync('lib/publicVideos.ts', 'utf8')
const rota = readFileSync('app/api/video/publish/route.ts', 'utf8')
const link = readFileSync('lib/videoShareLink.ts', 'utf8')
const email = readFileSync('app/api/cron/send-video-ready/route.ts', 'utf8')

// ── 1. A TRAVA GLOBAL NÃO FOI VIRADA ────────────────────────────────────────
// A peça inteira existe para NÃO precisar virar isto. Se um dia alguém virar,
// 1.638 filmes de cliente ficam públicos de uma vez — e este teste é o aviso.
checar(
  'trava global CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED continua false',
  /export const CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED\s*=\s*false as const/.test(politica),
)

// ── 2. O PORTEIRO DE CONSENTIMENTO ──────────────────────────────────────────
const corpoGate = publicVideos.slice(
  publicVideos.indexOf('export async function getPublicVideoResult'),
  publicVideos.indexOf('export async function getPublicVideo('),
)
checar('getPublicVideoResult existe e foi localizado', corpoGate.length > 200)
checar(
  'o ramo de trava desligada consulta published_at',
  /!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED/.test(corpoGate) && /published_at/.test(corpoGate),
)
// Mutante que este teste mata: trocar o `if (!consent.published_at) return
// missing` por um `return ok` — a palavra published_at continuaria no arquivo.
const idxConsulta = corpoGate.indexOf("select('published_at')")
const idxRecusa = corpoGate.indexOf('.published_at) {')
checar('a consulta de consentimento vem antes da recusa', idxConsulta > 0 && idxRecusa > idxConsulta)
checar(
  'sem carimbo de consentimento a página não existe (falha fechada)',
  /if \(!consent \|\| !\(consent as \{ published_at: string \| null \}\)\.published_at\) \{[\s\S]{0,60}status: 'missing'/.test(
    corpoGate,
  ),
)
// A allow-list de colunas públicas não pode ter crescido para carregar o campo
// de porteiro — ela é auditada e nunca deve incluir user_id/prompt/script.
const listaColunas = (publicVideos.match(/export const PUBLIC_VIDEO_COLUMNS =\s*\n\s*'([^']+)'/) ?? [])[1] ?? ''
checar('a allow-list de colunas públicas foi localizada', listaColunas.includes('final_video_url'))
checar('a allow-list de colunas públicas não ganhou published_at', !listaColunas.includes('published_at'))
checar(
  'a allow-list continua sem user_id/prompt/script',
  !/\buser_id\b|\bprompt\b|\bscript\b/.test(listaColunas),
)

// ── 3. A ROTA SÓ PUBLICA COM TOKEN, E ANTES DE QUALQUER ESCRITA ─────────────
// Sharing safety now requires an inert GET confirmation followed by an explicit,
// expiring, action-bound POST. An inbox scanner must never publish a video.
const getRoute = rota.slice(rota.indexOf('export async function GET('), rota.indexOf('export async function POST('))
const postRoute = rota.slice(rota.indexOf('export async function POST('))
const idxVerifica = getRoute.indexOf("verifyShareToken(videoId, url.searchParams.get('t'))")
const idxConfirmacao = postRoute.indexOf('verifyShareConfirmation(videoId, action, confirmation)')
const idxPrimeiraEscrita = postRoute.indexOf('.update(')
checar('GET verifica o token de entrada', idxVerifica > 0)
checar('POST verifica a confirmacao ANTES da primeira escrita', idxConfirmacao > 0 && idxPrimeiraEscrita > idxConfirmacao)
checar(
  'token inválido termina em retorno, não segue o fluxo de GET',
  /if \(!UUID\.test\(videoId\) \|\| !verifyShareToken\(videoId, url\.searchParams\.get\('t'\)\)\) return back\('invalid'\)/.test(getRoute),
)
checar('id fora do formato uuid é recusado antes do banco', getRoute.indexOf('UUID.test(videoId)') < idxVerifica && postRoute.indexOf('UUID.test(videoId)') < postRoute.indexOf('createAdminClient('))
checar('GET so mostra a confirmacao, sem cliente privilegiado nem escrita', !/createAdminClient\(|\.from\(|\.update\(/.test(getRoute) && getRoute.includes('<form method="post"'))
checar('POST recusa confirmacao invalida antes do banco', /\|\| !verifyShareConfirmation\(videoId, action, confirmation\)\) return back\('invalid'\)/.test(postRoute) && idxConfirmacao < postRoute.indexOf('createAdminClient('))

// ── 4. SÓ FILME ENTREGUE VIRA PÁGINA ────────────────────────────────────────
const idxEntregue = postRoute.indexOf("row.status !== 'completed'")
const idxPublica = postRoute.indexOf('published_at:new Date().toISOString()')
checar('a rota exige status completed', idxEntregue > 0)
checar('a exigência de filme entregue vem antes de publicar', idxEntregue > 0 && idxPublica > idxEntregue)
checar('a rota exige url de reprodução', /!\(row\.final_video_url \|\| row\.video_url \|\| ''\)\.trim\(\)/.test(postRoute))
checar(
  'publicar é idempotente: só carimba quando ainda não havia carimbo',
  /const changing = undo \? !!row\.published_at : !row\.published_at/.test(postRoute) && /if \(changing\) \{/.test(postRoute),
)

// ── 5. DESPUBLICAR NUNCA DEPENDE DE O FILME ESTAR SAUDÁVEL ─────────────────
const idxUndo = postRoute.indexOf("const undo = action === 'unpublish'")
checar('o ramo de despublicar existe', idxUndo > 0)
checar('despublicar nao depende de filme entregue', idxUndo > 0 && idxEntregue > idxUndo && /if \(!undo && \(row\.status !== 'completed'/.test(postRoute))
checar('despublicar limpa o carimbo', /update\(undo \? \{published_at:null,published_via:null\}/.test(postRoute))
checar('escrita compara o carimbo anterior para impedir corrida', postRoute.includes("query.eq('published_at',row.published_at)") && postRoute.includes("query.is('published_at',null)"))

// Execute the current route with real signing helpers and a conditional in-memory
// write. These synthetic credentials never reach a provider; each world is fresh.
const fixtureEnv = { VIDEO_SHARE_SECRET: 'offline-share-consent-fixture-only', NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: 'OFFLINE_FIXTURE' }
const shares = createOfflineLoader({ env: fixtureEnv })('@/lib/videoShareLink')
const videoId = '11111111-1111-4111-8111-111111111111'
class OfflineReply extends Response {
  static redirect(url, options = {}) { return new OfflineReply(null, { status: options.status ?? 307, headers: { ...options.headers, location: url } }) }
}
function consentWorld(options = {}, routeSource = rota) {
  const state = { clients: 0, writes: 0, events: [] }
  const row = { id: videoId, user_id: 'fixture-owner', status: 'completed', video_url: 'https://fixture.invalid/video.mp4', published_at: null, ...options.row }
  const admin = { from(table) {
    if (table !== 'videos') throw Error('unexpected table')
    return {
      select() { return { eq() { return { async single() { return { data: row, error: null } } } } } },
      update(patch) {
        const filters = []
        const query = {
          eq(key, value) { filters.push([key, value]); return query },
          is(key, value) { filters.push([key, value]); return query },
          select() { return query },
          async maybeSingle() {
            if (options.updateError) return { data: null, error: { code: 'OFFLINE_ERROR' } }
            if (options.zeroRows || !filters.every(([key, value]) => row[key] === value)) return { data: null, error: null }
            Object.assign(row, patch); state.writes++
            return { data: { id: row.id, published_at: row.published_at }, error: null }
          },
        }
        return query
      },
    }
  } }
  const route = createOfflineLoader({ env: fixtureEnv, source: (file, source) => file === 'app/api/video/publish/route.ts' ? routeSource : source, mocks: {
    'next/server': { NextResponse: OfflineReply },
    '@supabase/supabase-js': { createClient() { state.clients++; return admin } },
    '@/lib/serverEvents': { async writeServerEvent(event) { state.events.push(event) } },
  } })('@/app/api/video/publish/route')
  return { route, state, row }
}
function confirmationRequest(action = 'publish', confirmation = shares.mintShareConfirmation(videoId, action)) {
  return new Request('https://fixture.invalid/api/video/publish', { method: 'POST', headers: { origin: 'https://fixture.invalid' }, body: new URLSearchParams({ v: videoId, action, confirmation, src: 'offline-test' }) })
}
for (const action of ['publish', 'unpublish']) {
  const confirmation = consentWorld()
  const get = await confirmation.route.GET(new Request(`https://fixture.invalid/api/video/publish?v=${videoId}&t=${shares.mintShareToken(videoId)}${action === 'unpublish' ? '&undo=1' : ''}`))
  checar(`GET ${action} mostra formulario e nao toca banco`, get.status === 200 && (await get.text()).includes('<form method="post"') && confirmation.state.clients === 0 && confirmation.state.writes === 0)
  const success = consentWorld({ row: { published_at: action === 'unpublish' ? '2026-09-06T12:00:00Z' : null, ...(action === 'unpublish' ? { status: 'failed', video_url: null } : {}) } })
  const result = await success.route.POST(confirmationRequest(action))
  checar(`POST ${action} autorizado grava uma vez e mede so o confirmado`, result.status === 303 && success.state.writes === 1 && success.state.events.length === 1 && success.state.events[0].name === (action === 'unpublish' ? 'video_unpublished_v1' : 'video_published_v1'))
  const repeated = await success.route.POST(confirmationRequest(action))
  checar(`POST ${action} repetido e idempotente`, repeated.status === 303 && success.state.writes === 1 && success.state.events.length === 1)
}
for (const [action, token] of [['publish', 'invalid'], ['unpublish', shares.mintShareConfirmation(videoId, 'publish')], ['publish', shares.mintShareToken(videoId)]]) {
  const denied = consentWorld()
  await denied.route.POST(confirmationRequest(action, token))
  checar('confirmacao invalida/acao trocada/token antigo nao cria cliente nem grava', denied.state.clients === 0 && denied.state.writes === 0 && denied.state.events.length === 0)
}
for (const options of [{ row: { status: 'processing' } }, { row: { video_url: null } }, { updateError: true }, { zeroRows: true }]) {
  const failed = consentWorld(options), result = await failed.route.POST(confirmationRequest())
  checar('filme nao entregue ou escrita nao confirmada nunca publica nem mede sucesso', failed.state.writes === 0 && failed.state.events.length === 0 && (result.status === 503 || result.headers.get('location')?.includes('share=not_ready')))
}
const removedGate = rota.replace('!verifyShareConfirmation(videoId, action, confirmation)', 'false')
const mutant = consentWorld({}, removedGate)
await mutant.route.POST(confirmationRequest('publish', 'invalid'))
checar('mutante aplicado sem a verificacao publica com token invalido: a prova de recusa fica vermelha', removedGate !== rota && mutant.state.writes === 1)

// ── 6. O TOKEN FALHA FECHADO SEM SEGREDO ───────────────────────────────────
checar('segredo curto/ausente não vira token', /raw\.length >= 16 \? raw : null/.test(link))
checar('mintShareToken devolve null sem segredo', /const secret = shareSecret\(\)\s*\n\s*if \(!secret\) return null/.test(link))
checar('verifyShareToken recusa tudo sem segredo', /const secret = shareSecret\(\)\s*\n\s*if \(!secret\) return false/.test(link))
checar('a comparação é em tempo constante', /timingSafeEqual/.test(link))
checar('tamanhos diferentes são recusados antes do timingSafeEqual', link.indexOf('a.length !== b.length') < link.indexOf('timingSafeEqual(a, b)'))

// ── 7. O E-MAIL CARREGA O LINK, E SAI INTACTO QUANDO NÃO HÁ SEGREDO ────────
checar('o e-mail importa o gerador de link', /import \{ publishHref, unpublishHref \} from '@\/lib\/videoShareLink'/.test(email))
checar('o bloco de partilha entra no HTML', /\$\{shareHtml\}/.test(email))
checar('o bloco de partilha entra no texto puro', /\$\{shareText\}/.test(email))
checar(
  'sem link, os dois blocos são string vazia (e-mail sai byte a byte como antes)',
  /const shareText = shareHref\s*\n?\s*\?/.test(email) && /const shareHtml = shareHref\s*\n?\s*\?/.test(email),
)
checar('o e-mail oferece o caminho de volta na mesma mensagem', /shareUndoHref/.test(email))
checar('o link é atribuído à fonte video_ready_email', /'video_ready_email'/.test(email))

// ── 8. O E-MAIL DE MAIOR ALCANCE DA CASA (#28) ─────────────────────────────
// A #27 ligou o botão no cron `send-video-ready`: 1 por pessoa PARA SEMPRE, 4
// pessoas em 7 dias. Este arquivo é o e-mail de ENTREGA — 158 envios para 107
// pessoas na mesma semana. Se o bloco sumir daqui, a peça volta a alcançar 4.
const entrega = readFileSync('app/api/compose/status/[renderId]/route.ts', 'utf8')
checar('o e-mail de entrega importa o gerador de link', /import \{ publishHref, unpublishHref \} from '@\/lib\/videoShareLink'/.test(entrega))
checar('o bloco de partilha entra no HTML do e-mail de entrega', /\$\{shareHtml\}/.test(entrega))
checar(
  'sem id de filme não há link (falha fechada)',
  /const shareHref = shareVideoId\s*\n?\s*\?/.test(entrega) && /: null/.test(entrega),
)
checar('o e-mail de entrega oferece o caminho de volta', /shareUndoHref/.test(entrega))
checar('o link do e-mail de entrega tem fonte própria', /'video_ready_delivery'/.test(entrega))
// Ordem: o id do filme tem de ser resolvido ANTES de virar link.
checar(
  'o id do filme é resolvido antes do link',
  entrega.indexOf('const shareVideoId =') < entrega.indexOf('const shareHref = shareVideoId'),
)
// As duas fontes são distintas — medir peça nova por dentro do contador da
// peça velha foi o defeito da #25 desta manhã.
checar(
  'as duas fontes de partilha são distintas',
  /'video_ready_email'/.test(email) && /'video_ready_delivery'/.test(entrega),
)

console.log(`\n${ok} verificações OK, ${falhas.length} falhas`)
if (falhas.length) {
  for (const f of falhas) console.log(`  ✗ ${f}`)
  process.exit(1)
}
console.log('✓ consentimento de partilha: trava global intacta, publicação só com token do dono')

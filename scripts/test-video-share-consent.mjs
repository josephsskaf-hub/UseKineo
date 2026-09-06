// Guardião do KINEO-CONSENTIMENTO-DE-PARTILHA-2026-09-06 (sprint-assinaturas #27)
//
// Lê os ARQUIVOS REAIS (nunca importa por alias `@/` — módulo com alias morre no
// import antes da primeira verificação, lição registrada em 05/09). As
// verificações são de ORDEM, não de presença: "o arquivo contém a palavra
// verifyShareToken" sobrevive a um mutante que mova a checagem para DEPOIS da
// escrita, e é exatamente esse mutante que publicaria filme de cliente sem
// token.
import { readFileSync } from 'node:fs'

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
const idxVerifica = rota.indexOf('verifyShareToken(videoId, token)')
const idxPrimeiraEscrita = rota.indexOf('.update(')
checar('a rota verifica o token', idxVerifica > 0)
checar('o token é verificado ANTES da primeira escrita', idxVerifica > 0 && idxPrimeiraEscrita > idxVerifica)
checar(
  'token inválido termina em retorno, não segue o fluxo',
  /if \(!verifyShareToken\(videoId, token\)\) return voltarParaBiblioteca/.test(rota),
)
checar('id fora do formato uuid é recusado antes do banco', rota.indexOf('UUID.test(videoId)') < idxVerifica)

// ── 4. SÓ FILME ENTREGUE VIRA PÁGINA ────────────────────────────────────────
const idxEntregue = rota.indexOf("row.status !== 'completed'")
const idxPublica = rota.indexOf('published_at: new Date().toISOString()')
checar('a rota exige status completed', idxEntregue > 0)
checar('a exigência de filme entregue vem antes de publicar', idxEntregue > 0 && idxPublica > idxEntregue)
checar('a rota exige url de reprodução', /!playable/.test(rota))
checar(
  'publicar é idempotente: só carimba quando ainda não havia carimbo',
  /if \(!row\.published_at\) \{/.test(rota),
)

// ── 5. DESPUBLICAR NUNCA DEPENDE DE O FILME ESTAR SAUDÁVEL ─────────────────
const idxUndo = rota.indexOf('if (undo) {')
checar('o ramo de despublicar existe', idxUndo > 0)
checar('despublicar vem ANTES da exigência de filme entregue', idxUndo > 0 && idxEntregue > idxUndo)
checar('despublicar limpa o carimbo', /published_at: null, published_via: null/.test(rota))

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

console.log(`\n${ok} verificações OK, ${falhas.length} falhas`)
if (falhas.length) {
  for (const f of falhas) console.log(`  ✗ ${f}`)
  process.exit(1)
}
console.log('✓ consentimento de partilha: trava global intacta, publicação só com token do dono')

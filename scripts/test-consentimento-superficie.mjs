// ═══ KINEO-CONSENTIMENTO-POR-LINHA-2026-09-07 ═══════════════════════════════
// O DEFEITO, medido em produção em 06/09 com uma linha realmente publicada
// (83db8b63-…, filme do fundador):
//   · /v/<id> → 200, H1 real, sem noindex. A página FUNCIONA.
//   · /v/<id>/opengraph-image → 404, 0 bytes. Todo link compartilhado no
//     WhatsApp/X/Instagram renderizava CARTÃO EM BRANCO.
//   · /video-sitemap.xml → X-Video-Sitemap-Count: 6 (só os exemplos fixos).
// Causa única: a trava global `CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED = false`
// (27/08) nunca foi ensinada sobre `videos.published_at` (#27, 06/09). A porta
// abriu sem cartão e sem mapa.
//
// O PRINCÍPIO que este guardião protege: a trava global continua fechada; o
// que abre a superfície é o consentimento POR LINHA. Sem `published_at`, nada
// muda (falha FECHADA). Com a trava em `true`, o comportamento antigo volta.
//
// ESTILO: `readFileSync` sobre os arquivos REAIS. Nunca `import` com alias
// `@/` — 72 testes de scripts/ morrem no import antes da primeira verificação.
// E o guardião se amarra à VARIÁVEL QUE DECIDE, não só conta texto: um mutante
// que troque a condição por `true` tem que ficar vermelho aqui.
import { readFileSync } from 'node:fs'
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
let ok = 0, fail = 0
const check = (n, c) => { c ? (ok++, console.log('  ok  ' + n)) : (fail++, console.log('  FAIL ' + n)) }

const politica = src('lib/publicSurfacePolicy.ts')
const og = src('app/v/[id]/opengraph-image.tsx')
const publicVideos = src('lib/publicVideos.ts')
const publish = src('app/api/video/publish/route.ts')

// Recorta o corpo de uma função pelo nome — do `function nome(` até a próxima
// `export` de nível de arquivo (ou o fim). Usado para amarrar cada verificação
// ao trecho que decide, não ao arquivo inteiro.
function corpo(texto, assinatura) {
  const ini = texto.indexOf(assinatura)
  if (ini < 0) return ''
  const fim = texto.indexOf('\nexport ', ini + assinatura.length)
  return texto.slice(ini, fim < 0 ? texto.length : fim)
}

console.log('1 · lib/publicSurfacePolicy.ts — a trava não virou, e o helper decide pelas DUAS entradas')
check('trava global continua `false as const`',
  /export const CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED\s*=\s*false as const/.test(politica))
check('exporta publicSurfaceAllowsRow(publishedAt)',
  /export function publicSurfaceAllowsRow\(publishedAt: string \| null \| undefined\): boolean/.test(politica))
const helper = corpo(politica, 'export function publicSurfaceAllowsRow(')
check('o corpo do helper foi localizado', helper.length > 100)
// Amarração à variável que decide: a flag global tem que ser LIDA dentro do
// corpo, e o parâmetro tem que ser a fonte do retorno negativo. Um mutante
// `return true` some com o `publishedAt` do retorno e cai aqui.
check('o corpo lê a flag global', /CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED as boolean/.test(helper))
check('a flag aberta devolve true (comportamento antigo intacto)', /if \(global\) return true/.test(helper))
check('o retorno final depende do parâmetro publishedAt (não de constante)',
  /return typeof publishedAt === 'string' && publishedAt\.trim\(\)\.length > 0/.test(helper))
check('o helper não tem `return true` fora do ramo da flag',
  helper.split('return true').length === 2)
check('o princípio está escrito: trava fechada, consentimento por linha abre',
  politica.includes('a trava global continua') && politica.includes('consentimento POR LINHA'))

console.log('2 · app/v/[id]/opengraph-image.tsx — capa por linha, falha fechada em todo ramo')
check('importa publicSurfaceAllowsRow da política',
  og.includes("import { publicSurfaceAllowsRow } from '@/lib/publicSurfacePolicy'"))
check('NÃO tem mais o portão global incondicional',
  !og.includes('if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED) notFound()'))
check('published_at vem na MESMA consulta do título (uma ida ao banco)',
  og.includes(".select('title, topic, published_at')") && og.split('.from(\'videos\')').length === 2)
check('valida UUID antes de tocar o banco',
  og.indexOf('if (!UUID.test(params.id)) notFound()') > 0 &&
  og.indexOf('if (!UUID.test(params.id)) notFound()') < og.indexOf('await getRow(params.id)'))
check('o portão chama o helper com o carimbo lido da linha e cai em notFound()',
  og.includes('if (!publicSurfaceAllowsRow(row.publishedAt)) notFound()'))
// Ordem: o portão tem que rodar ANTES da ImageResponse — um mutante que mova o
// notFound() para depois do bitmap já teria servido a capa.
check('o portão roda antes de renderizar o bitmap',
  og.indexOf('if (!publicSurfaceAllowsRow(row.publishedAt)) notFound()') < og.indexOf('new ImageResponse('))
const getRow = corpo(og, 'async function getRow(')
check('getRow foi localizado', getRow.length > 200)
check('sem credenciais → null (nunca mais título genérico como permissão)', /if \(!url \|\| !key\) return null/.test(getRow))
check('erro de leitura ou linha ausente → null', /if \(error \|\| !data\) return null/.test(getRow))
check('catch → null', /catch \{\s*return null\s*\}/.test(getRow))
check('null de getRow termina em notFound()', og.includes('if (!row) notFound()'))
check('nenhum ramo de getRow devolve título genérico sem linha',
  !/return 'AI YouTube Short'/.test(getRow))
check('o bitmap continua idêntico (marca, rodapé, tamanho)',
  og.includes("Made in a few minutes with AI — make your own free") &&
  og.includes("export const size = { width: 1200, height: 630 }") &&
  og.includes("color: '#2997ff', fontSize: 40, fontWeight: 800"))
check('o comentário histórico #462 foi preservado', og.includes('#462 — dynamically generated OG preview image'))
check('o comentário novo explica a virada de global para por-linha',
  og.includes('KINEO-CONSENTIMENTO-POR-LINHA-2026-09-07') && og.includes('O portão passa a ser POR LINHA'))

console.log('3 · lib/publicVideos.ts — sitemap filtra por consentimento; qualidade e allow-list intactas')
const lista = corpo(publicVideos, 'export async function listIndexablePublicVideos(')
check('listIndexablePublicVideos foi localizada', lista.length > 500)
check('NÃO tem mais o hard return `if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED) return []`',
  !lista.includes('if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED) return []'))
check('a flag global é lida na função (variável que decide)',
  lista.includes('const global = CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED as boolean'))
check('o filtro de consentimento existe e está GUARDADO pela flag',
  lista.includes("if (!global) query = query.not('published_at', 'is', null)"))
// Um mutante que aplique o filtro sempre (ou nunca) muda esta linha; um que
// troque `!global` por `true` também. Confere que a única ocorrência do filtro
// é a guardada.
check('o filtro só aparece uma vez, e dentro do ramo guardado',
  lista.split(".not('published_at', 'is', null)").length === 2)
check('o filtro roda ANTES de order/limit (é filtro de servidor, não pós-processo)',
  lista.indexOf(".not('published_at', 'is', null)") < lista.indexOf(".order('created_at'"))
check('o portão de qualidade segue: isIndexable decide a entrada', lista.includes('if (!v.isIndexable) {'))
check('dedupe por transcrição segue', lista.includes('if (seen.has(fingerprint)) continue'))
check('dedupe por título segue', lista.includes('if (titleKey && seenTitles.has(titleKey)) continue'))
check('está escrito que consentimento é NECESSÁRIO, não suficiente',
  lista.includes('condição NECESSÁRIA, não suficiente'))
const gateFn = corpo(publicVideos, 'export function toPublicVideo(')
check('toPublicVideo ainda reprova status/URL/scaffolding/título/transcrição/durabilidade',
  gateFn.includes("if (row.status !== 'completed') gateFailure") &&
  gateFn.includes("else if (!playbackUrl) gateFailure") &&
  gateFn.includes('else if (hasPromptScaffolding)') &&
  gateFn.includes('title.length < MIN_TITLE_CHARS') &&
  gateFn.includes('transcript.length < MIN_TRANSCRIPT_CHARS') &&
  gateFn.includes('else if (!hasDurablePlayback(playbackUrl))'))
// O porteiro da página única (#27) não foi tocado.
const unica = corpo(publicVideos, 'export async function getPublicVideoResult(')
check('getPublicVideoResult continua consultando published_at sob a trava fechada',
  /if \(!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED\) \{[\s\S]*?select\('published_at'\)/.test(unica))
check('getPublicVideoResult continua recusando linha sem carimbo',
  /if \(!consent \|\| !\(consent as \{ published_at: string \| null \}\)\.published_at\) \{[\s\S]{0,60}status: 'missing'/.test(unica))
const colunas = (publicVideos.match(/export const PUBLIC_VIDEO_COLUMNS =\s*\n\s*'([^']+)'/) ?? [])[1] ?? ''
check('PUBLIC_VIDEO_COLUMNS foi localizada', colunas.includes('final_video_url'))
check('PUBLIC_VIDEO_COLUMNS NÃO ganhou published_at', !colunas.includes('published_at'))
check('PUBLIC_VIDEO_COLUMNS continua sem user_id/prompt/script', !/\buser_id\b|\bprompt\b|\bscript\b/.test(colunas))

console.log('4 · app/api/video/publish/route.ts — ninguém publica sem token (regressão)')
const idxToken = publish.indexOf('if (!verifyShareToken(videoId, token)) return voltarParaBiblioteca')
const idxEscrita = publish.indexOf("update({ published_at: new Date().toISOString()")
check('a rota exige verifyShareToken', idxToken > 0)
check('a verificação do token vem ANTES da escrita do carimbo', idxEscrita > idxToken)
check('a escrita só acontece em linha completed com URL de reprodução',
  publish.indexOf("if (row.status !== 'completed' || !playable) return voltarParaBiblioteca('not_ready')") < idxEscrita)

console.log('5 · a copy do consentimento diz a VERDADE sobre o que o clique faz')
// A #27/#28 prometia apenas "um link que voce manda por mensagem". A partir
// desta peca a pagina consentida entra no video-sitemap E no IndexNow
// (app/api/cron/submit-indexnow chama a MESMA listIndexablePublicVideos), ou
// seja: vai ativamente para os buscadores. Copy que promete menos do que o
// produto faz com o dado da pessoa e a classe de erro mais cara desta casa.
const emailEntrega = src('app/api/compose/status/[renderId]/route.ts')
const emailCron = src('app/api/cron/send-video-ready/route.ts')
const indexnow = src('app/api/cron/submit-indexnow/route.ts')
check('o IndexNow realmente usa a mesma lista (o motivo do aviso existir)',
  indexnow.includes('listIndexablePublicVideos'))
for (const [nome, texto] of [['e-mail de entrega', emailEntrega], ['cron send-video-ready', emailCron]]) {
  check(nome + ': avisa que a pagina e publica e indexavel', texto.includes('search engines can find it too'))
  check(nome + ': avisa que da para tornar privado de novo', texto.includes('make it private again'))
  check(nome + ': a promessa antiga, que escondia a indexacao, saiu',
    !texto.includes('put in a bio. Nothing else in your library changes.'))
  const at = texto.indexOf('search engines can find it too')
  check(nome + ': o aviso esta DENTRO do bloco do botao de publicar',
    at > 0 && texto.slice(Math.max(0, at - 1500), at + 1500).includes('shareHref'))
}

console.log('6 · o segundo cadeado do sitemap: env de 12/08 vs consentimento')
// A env KINEO_VIDEO_SITEMAP_MAX foi posta em 12/08 sobre uma medicao real:
// 602 paginas listadas SEM pedido de ninguem comeram 79% do orcamento de
// rastreamento e deram 0 impressoes em 28 dias. Ela continua valendo para o
// modo antigo. O que muda e que no modo consentimento o conjunto e curado
// pelo dono do filme, entao o padrao deixa de ser 0 e passa a ser um teto
// pequeno. Este bloco existe para que ninguem afrouxe isso por descuido.
const sitemapRoute = src('app/video-sitemap.xml/route.ts')
const fn = corpo(sitemapRoute, 'function videoSitemapMax(): number {')
check('videoSitemapMax foi localizada', fn.length > 40)
check('o padrao depende da trava global (variavel que decide)', fn.includes('CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED'))
check('trava ABERTA continua com padrao 0 — o modo que a medicao condenou', fn.includes('global ? 0 : CONSENT_DEFAULT_MAX'))
check('trava FECHADA usa o teto do consentimento', fn.includes('CONSENT_DEFAULT_MAX'))
check('a env continua podendo desligar tudo com 0', fn.includes('if (n <= 0) return 0'))
check('env ilegivel cai no padrao, nunca em tudo ligado', fn.includes('if (!Number.isFinite(n)) return padrao'))
const teto = (sitemapRoute.match(/const CONSENT_DEFAULT_MAX = ([0-9]+)/) ?? [])[1]
check('o teto do consentimento e pequeno (<= 100), nao um portao aberto', Number(teto) > 0 && Number(teto) <= 100)
check('a condicao de morte da escolha esta escrita', sitemapRoute.includes('CONDICAO DE MORTE'))
check('a medicao de 12/08 nao foi apagada do arquivo', sitemapRoute.includes('0 impress'))

console.log(`\n${ok} ok, ${fail} fail`)
process.exit(fail ? 1 : 0)

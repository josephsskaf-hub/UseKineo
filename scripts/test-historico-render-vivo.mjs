// TESTE — A BIBLIOTECA PASSA A SABER QUE O FILME EXISTE (sprint-assinaturas
// #10, 2026-09-04)
//
// Sem rede, sem banco, sem credito. Executa a funcao pura DE VERDADE (lendo o
// .ts real e apagando so as anotacoes de tipo) e le os arquivos reais para
// provar quem a chama e onde.
// Roda: node scripts/test-historico-render-vivo.mjs
//
// O DEFEITO QUE ISTO TRANCA — achado antes de a entrega do #9 subir:
//   (a) o #9 passou a mandar o render SEM id para /history com a promessa
//       "the film saves to My Videos on its own"; mas app/(dashboard)/history/
//       page.tsx le SO a tabela `videos`, e um render ainda no fal NAO TEM
//       linha em `videos` (a linha nasce no fim, no compose). A pessoa chegava
//       e via a lista velha — ou "No videos yet";
//   (b) a pilula e montada em TODA pagina autenticada, /history inclusive:
//       clicar "My Videos" ESTANDO em /history era router.push da rota atual —
//       zero mudanca na tela, exatamente o loop de 16 cliques que o #9 mediu
//       (03/09 23:00 BRT, chatgpt.com, PARTE 2 de uma serie), mudado de lugar.
// Numeros do #9 que continuam valendo: 95 cliques em state='rendering' em 14
// dias, 54 deles com render_id nulo, 11 pessoas, 6 sem um filme na vida.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const raiz = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd()
const lerArquivo = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8')
const soCodigo = (t) => t.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')

const pill = lerArquivo('components/ActiveRenderPill.tsx')
const cartao = lerArquivo('components/HistoryActiveRenderCard.tsx')
const historyPage = lerArquivo('app/(dashboard)/history/page.tsx')
const historyClient = lerArquivo('app/(dashboard)/history/HistoryClient.tsx')
const alvoFonte = soCodigo(lerArquivo('lib/renderPillTarget.ts'))
const pillCode = soCodigo(pill)
const cartaoCode = soCodigo(cartao)
const clientCode = soCodigo(historyClient)

let passou = 0
const falhas = []
function checa(nome, cond) {
  if (cond) { passou++; console.log('  ok  ' + nome) }
  else { falhas.push(nome); console.log('  XX  ' + nome) }
}
const conta = (t, s) => t.split(s).length - 1

console.log('\n  TESTE — a promessa do #9 passa a ter uma tela que a cumpre\n')

// ── 1. a funcao pura, executada de verdade ────────────────────────────────
function paraJs(fonte) {
  const linhas = fonte.split('\n')
  const saida = []
  let pulandoBloco = false
  for (const linha of linhas) {
    if (pulandoBloco) {
      if (/^\}/.test(linha)) pulandoBloco = false
      continue
    }
    if (/^export type \w+ = \{/.test(linha)) { pulandoBloco = true; continue }
    if (/^export type \w+ =/.test(linha)) continue
    saida.push(linha)
  }
  return saida
    .join('\n')
    .replace(/export function alvoDaPilula\(entrada: \{[\s\S]*?\n\}\): AlvoDaPilula \{/, 'export function alvoDaPilula(entrada) {')
    .replace(/export function mesmaTela\(href: string, caminhoAtual: string \| null \| undefined\): boolean \{/, 'export function mesmaTela(href, caminhoAtual) {')
    .replace(/const normalizar = \(v: string\) =>/, 'const normalizar = (v) =>')
}

const tmp = path.join(raiz, 'scripts', '.tmp-historico-render-vivo.mjs')
fs.writeFileSync(tmp, paraJs(lerArquivo('lib/renderPillTarget.ts')))
let mesmaTela = null
let alvoDaPilula = null
let ROTA_BIBLIOTECA = null
let FRASE_NA_BIBLIOTECA = null
let TITULO_NA_BIBLIOTECA = null
try {
  const m = await import(pathToFileURL(tmp).href + '?t=' + Date.now())
  mesmaTela = m.mesmaTela
  alvoDaPilula = m.alvoDaPilula
  ROTA_BIBLIOTECA = m.ROTA_BIBLIOTECA
  FRASE_NA_BIBLIOTECA = m.FRASE_RENDER_NA_BIBLIOTECA
  TITULO_NA_BIBLIOTECA = m.TITULO_RENDER_NA_BIBLIOTECA
} catch (e) {
  console.log('  XX  a funcao pura nao carregou: ' + (e && e.message))
} finally {
  fs.rmSync(tmp, { force: true })
}
checa('mesmaTela carrega e e executavel', typeof mesmaTela === 'function')
checa('alvoDaPilula continua exportada (o #9 nao foi quebrado)', typeof alvoDaPilula === 'function')

if (typeof mesmaTela === 'function') {
  // O CASO DE PRODUCAO: a pessoa esta em /history e a pilula manda para /history.
  checa('em /history, o clique para /history NAO muda de tela', mesmaTela('/history', '/history') === true)
  checa('query nao engana', mesmaTela('/history', '/history?tab=all') === true)
  checa('barra final nao engana', mesmaTela('/history', '/history/') === true)
  checa('maiuscula nao engana', mesmaTela('/history', '/History') === true)
  checa('ancora nao engana', mesmaTela('/history', '/history#top') === true)
  // O caminho que TEM de continuar oferecendo a saida.
  checa('de /viral-now, o clique para /history muda de tela', mesmaTela('/history', '/viral-now') === false)
  checa('de /library, o clique para /history muda de tela', mesmaTela('/history', '/library') === false)
  checa('/history nao e /history-old (prefixo nao basta)', mesmaTela('/history', '/history-old') === false)
  checa('/studio/create nao e /studio', mesmaTela('/studio/create', '/studio') === false)
  checa('caminho desconhecido NAO esconde a saida (fail-open)', mesmaTela('/history', null) === false)
  checa('caminho vazio NAO esconde a saida', mesmaTela('/history', '   ') === false)
  checa('raiz continua comparavel', mesmaTela('/', '/') === true)
}

if (typeof alvoDaPilula === 'function' && typeof mesmaTela === 'function') {
  // A juncao real: o render fantasma do #9 (sem id) apontado a partir de /history.
  const fantasma = alvoDaPilula({ state: 'rendering', renderId: null, resumable: false })
  checa('o render fantasma continua indo para /history (#9 intacto)', fantasma.href === '/history')
  checa('e em /history esse clique e um no-op — a pilula tem de sumir',
    mesmaTela(fantasma.href, '/history') === true)
  const religavel = alvoDaPilula({ state: 'rendering', renderId: 'abc', resumable: true })
  checa('o render religavel continua indo para /studio/create (#9 intacto)', religavel.href === '/studio/create')
  checa('e em /history esse clique CONTINUA mudando de tela',
    mesmaTela(religavel.href, '/history') === false)
}
checa('a rota da biblioteca esta nomeada uma vez so', ROTA_BIBLIOTECA === '/history')
checa('a frase da biblioteca existe e diz que pode fechar a aba',
  typeof FRASE_NA_BIBLIOTECA === 'string' && /close the tab/i.test(FRASE_NA_BIBLIOTECA))
checa('a frase da biblioteca promete que a PAGINA pega o filme sozinha',
  typeof FRASE_NA_BIBLIOTECA === 'string' && /on its own/i.test(FRASE_NA_BIBLIOTECA))
checa('a frase da biblioteca nao fala de credito/plano/preco (fronteira do Codex)',
  typeof FRASE_NA_BIBLIOTECA === 'string' && !/credit|plan|price|upgrade/i.test(FRASE_NA_BIBLIOTECA))
checa('o titulo da biblioteca fala do FILME, nao do sistema',
  typeof TITULO_NA_BIBLIOTECA === 'string' && /film/i.test(TITULO_NA_BIBLIOTECA))

// ── 2. o defeito de origem: /history le so `videos` ───────────────────────
console.log('\n  — o motivo de o cartao existir (lido do arquivo real) —\n')
checa('a page do /history le a tabela videos', /\.from\('videos'\)/.test(historyPage))
checa('a page do /history NAO consulta o render em curso', !/compose\/active/.test(historyPage))
checa('ou seja: sem o cartao, render no fal e invisivel nesta tela',
  !/compose\/active/.test(historyPage) && /\.from\('videos'\)/.test(historyPage))

// ── 3. o cartao esta montado NAS DUAS metades da tela ─────────────────────
console.log('\n  — o cartao esta montado onde a pessoa chega —\n')
checa('HistoryClient importa o cartao',
  /import HistoryActiveRenderCard from '@\/components\/HistoryActiveRenderCard'/.test(clientCode))
checa('o cartao aparece DUAS vezes (lista cheia + tela vazia)',
  conta(clientCode, '<HistoryActiveRenderCard />') === 2)
// O comentario do incidente JWT-skew tambem cita 'No videos yet'; o alvo e o
// H2 de verdade.
const idxVazio = clientCode.indexOf('>No videos yet<')
const idxCartaoAntesDoVazio = clientCode.lastIndexOf('<HistoryActiveRenderCard />', idxVazio)
checa('na tela VAZIA o cartao vem ANTES do "No videos yet"',
  idxVazio > 0 && idxCartaoAntesDoVazio > 0 && idxCartaoAntesDoVazio < idxVazio)
const idxOferta = clientCode.indexOf('resolveHistoryMilestoneMode')
const idxCartaoMain = clientCode.lastIndexOf('<HistoryActiveRenderCard />')
checa('na lista cheia o cartao vem DEPOIS do calculo da oferta (entrega primeiro, oferta depois)',
  idxCartaoMain > idxOferta)

// ── 4. o cartao le a verdade do servidor e nao inventa render ─────────────
console.log('\n  — o cartao le a MESMA sonda da pilula, e so isso —\n')
checa('o cartao consulta /api/compose/active', /\/api\/compose\/active/.test(cartaoCode))
checa('o cartao NUNCA fala com /api/compose/status', !/compose\/status/.test(cartaoCode))
checa('o cartao NUNCA chama uma rota de geracao', !/generate-video/.test(cartaoCode))
checa('o cartao nao faz POST nenhum', !/method:\s*'POST'/.test(cartaoCode))
checa('resposta nao-ok NAO vira afirmacao sobre o filme (fail-closed)',
  /if \(!res\.ok\)[\s\S]{0,200}fase: 'quieto'/.test(cartaoCode))
checa('so mostra cartao quando o servidor diz rendering', /data\.state === 'rendering'/.test(cartaoCode))
checa('a fonte mais restritiva vence tambem aqui (id nulo derruba resumable)',
  /data\.resumable !== false && Boolean\(idLido\)/.test(cartaoCode))
checa('o intervalo so existe enquanto o render esta vivo',
  /if \(!vivo\) return[\s\S]{0,140}setInterval/.test(cartaoCode))
checa('aba escondida nao sonda', /visibilityState === 'hidden'\) return/.test(cartaoCode))
checa('volta de aba sonda de novo', /visibilitychange/.test(cartaoCode))
checa('o refresh so acontece se ESTA tela viu o render vivo antes',
  /viuRenderVivoRef\.current && data\?\.state === 'completed'/.test(cartaoCode))
checa('quando o filme chega, a lista do servidor e recarregada', /router\.refresh\(\)/.test(cartaoCode))
checa('a chegada do filme vira evento medivel', /history_active_render_landed/.test(cartaoCode))
checa('a impressao do cartao vira evento medivel', /history_active_render_shown/.test(cartaoCode))
checa('o cartao grava se o render era religavel', /resumable: estado\.religavel/.test(cartaoCode))

// ── 5. a pilula para de oferecer um clique que nao muda nada ──────────────
console.log('\n  — a pilula nao se oferece na tela que ja mostra o render —\n')
checa('a pilula importa mesmaTela',
  /import \{ alvoDaPilula, FRASE_RENDER_NO_MOTOR, mesmaTela \} from '@\/lib\/renderPillTarget'/.test(pillCode))
checa('a pilula calcula se o render esta na propria tela', /const renderNaPropriaTela =/.test(pillCode))
checa('essa condicao entra no `hidden` (senao a impressao mentiria)',
  /const hidden =[\s\S]{0,220}renderNaPropriaTela \|\|/.test(pillCode))
checa('o `hidden` continua respeitando o suppressed antigo',
  /const hidden =[\s\S]{0,80}suppressed \|\|/.test(pillCode))
checa('o efeito de impressao continua saindo cedo quando hidden',
  /if \(hidden \|\| !probe\) return/.test(pillCode))
checa('o JSX tambem nao renderiza a pilula de render na tela de destino',
  /if \(isRendering && !cliqueMudaDeTela\) return null/.test(pillCode))
checa('handleAction NUNCA empurra para a rota atual (cinto e suspensorio)',
  /if \(!cliqueMudaDeTela\) return[\s\S]{0,260}router\.push\(alvo\.href\)/.test(pillCode))
checa('o clique passa a gravar se mudaria de tela', /same_screen: !cliqueMudaDeTela/.test(pillCode))
checa('a pilula continua suprimida em /studio/create e /generate (comportamento antigo)',
  /startsWith\('\/generate'\)/.test(pillCode) && /startsWith\('\/studio\/create'\)/.test(pillCode))

// ── 6. o que o #9 ja tinha nao pode ter mudado ────────────────────────────
console.log('\n  — o que ja funcionava continua congelado —\n')
checa('estado completed continua com destino /history',
  /state === 'completed'[\s\S]{0,400}'\/history'/.test(alvoFonte))
checa('estado failed continua com destino /studio/create',
  /state === 'failed'[\s\S]{0,400}'\/studio\/create'/.test(alvoFonte))
checa('a frase do #9 continua exportada', /FRASE_RENDER_NO_MOTOR/.test(alvoFonte))

console.log('\n  ' + passou + ' verificacoes ok, ' + falhas.length + ' falha(s)')
if (falhas.length) {
  console.log('\n  FALHAS:')
  for (const f of falhas) console.log('   - ' + f)
  process.exit(1)
}

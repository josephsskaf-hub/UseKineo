// ═══════════════════════════════════════════════════════════════════════════
// sprint-v1v4 #19 — VERIFICAÇÃO DE "MOSTRADO NÃO É VISTO"
//
// Três blocos:
//   A) lib/postVideoSignal.ts executado de verdade (anúncio → escuta), com
//      detalhe hostil, SSR simulado e cancelamento.
//   B) leitura de lib/videoDownload.ts provando que o anúncio está LIGADO no
//      degrau que comprova entrega — e SÓ nele (lição do sceneTruth: peça em
//      produção sem caller é biblioteca morta).
//   C) leitura de components/video/NextShortsSection.tsx provando o
//      observador, o ouvinte, o ref e a fronteira com o Codex.
//
// Rodar:  node scripts/test-convite-na-hora-certa-2026-08-31.mjs
// ═══════════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const raiz = path.resolve(aqui, '..')

let ok = 0
let falhou = 0
function checa(nome, condicao) {
  if (condicao) {
    ok++
  } else {
    falhou++
    console.error('  ✗ ' + nome)
  }
}

// A worktree não tem node_modules; o compilador vem do repo principal.
function carregaTs(relativo) {
  const req = createRequire(path.join(raiz, 'package.json'))
  let ts
  try {
    ts = req('typescript')
  } catch {
    const alt = createRequire('/sessions/clever-peaceful-allen/mnt/Usekineo/package.json')
    ts = alt('typescript')
  }
  const fonte = readFileSync(path.join(raiz, relativo), 'utf8')
  const js = ts.transpileModule(fonte, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText
  return import('data:text/javascript;base64,' + Buffer.from(js, 'utf8').toString('base64'))
}

// ── BLOCO A ────────────────────────────────────────────────────────────────
console.log('\nA) lib/postVideoSignal.ts — o sinal em execução')

// window falso, com a mesma semântica de add/remove/dispatch.
class EventoFalso {
  constructor(nome, init) {
    this.type = nome
    this.detail = init?.detail
  }
}
const ouvintes = new Map()
globalThis.CustomEvent = EventoFalso
globalThis.window = {
  addEventListener(nome, fn) {
    if (!ouvintes.has(nome)) ouvintes.set(nome, new Set())
    ouvintes.get(nome).add(fn)
  },
  removeEventListener(nome, fn) {
    ouvintes.get(nome)?.delete(fn)
  },
  dispatchEvent(ev) {
    for (const fn of [...(ouvintes.get(ev.type) ?? [])]) fn(ev)
    return true
  },
}

const sinal = await carregaTs('lib/postVideoSignal.ts')

checa('SINAL_VIDEO_ENTREGUE tem prefixo kineo:', sinal.SINAL_VIDEO_ENTREGUE.startsWith('kineo:'))
checa('exporta anunciarVideoEntregue', typeof sinal.anunciarVideoEntregue === 'function')
checa('exporta ouvirVideoEntregue', typeof sinal.ouvirVideoEntregue === 'function')

let recebidos = []
const cancelar = sinal.ouvirVideoEntregue((d) => recebidos.push(d))
checa('ouvir devolve função de cancelamento', typeof cancelar === 'function')

sinal.anunciarVideoEntregue({ method: 'blob', ms: 1234 })
checa('o ouvinte recebeu 1 anúncio', recebidos.length === 1)
checa('method chegou íntegro', recebidos[0]?.method === 'blob')
checa('ms chegou íntegro', recebidos[0]?.ms === 1234)

// detalhe hostil — nada de texto de cliente, nada de número absurdo
recebidos = []
sinal.anunciarVideoEntregue({ method: 'blob<script>alert(1)</script>', ms: -5 })
checa('method é higienizado', /^[a-z_]*$/i.test(recebidos[0]?.method ?? ''))
checa('method hostil não vaza tag', !String(recebidos[0]?.method).includes('<'))
checa('ms negativo vira 0', recebidos[0]?.ms === 0)

recebidos = []
sinal.anunciarVideoEntregue({ method: 'blob', ms: 9e9 })
checa('ms absurdo vira 0', recebidos[0]?.ms === 0)

recebidos = []
sinal.anunciarVideoEntregue()
checa('anúncio sem detalhe não quebra', recebidos.length === 1)
checa('sem detalhe → method unknown', recebidos[0]?.method === 'unknown')
checa('sem detalhe → ms 0', recebidos[0]?.ms === 0)

// um assinante que explode não pode derrubar os outros
recebidos = []
const cancelarRuim = sinal.ouvirVideoEntregue(() => {
  throw new Error('assinante quebrado')
})
sinal.anunciarVideoEntregue({ method: 'blob', ms: 10 })
checa('assinante quebrado não impede o bom', recebidos.length === 1)
cancelarRuim()

recebidos = []
cancelar()
sinal.anunciarVideoEntregue({ method: 'blob', ms: 10 })
checa('depois de cancelar, não recebe mais', recebidos.length === 0)

// SSR: sem window, nada lança e o cancelamento continua chamável
const guardaWindow = globalThis.window
delete globalThis.window
let explodiu = false
try {
  sinal.anunciarVideoEntregue({ method: 'blob', ms: 1 })
  const c = sinal.ouvirVideoEntregue(() => {})
  c()
} catch {
  explodiu = true
}
checa('SSR (sem window) não lança', explodiu === false)
globalThis.window = guardaWindow

// ── BLOCO B ────────────────────────────────────────────────────────────────
console.log('B) lib/videoDownload.ts — o anúncio está LIGADO, e no lugar certo')
const download = readFileSync(path.join(raiz, 'lib/videoDownload.ts'), 'utf8')

checa('importa anunciarVideoEntregue', /import\s*\{\s*anunciarVideoEntregue\s*\}\s*from\s*'@\/lib\/postVideoSignal'/.test(download))
const chamadas = download.match(/anunciarVideoEntregue\(/g) ?? []
checa('chama o anúncio exatamente 1 vez', chamadas.length === 1)
checa('anuncia com method blob', /anunciarVideoEntregue\(\{\s*method:\s*'blob'/.test(download))

// O anúncio tem que estar DEPOIS do fire('video_downloaded') — o único degrau
// que prova entrega — e ANTES do return 'blob'.
const iDownloaded = download.indexOf("fire('video_downloaded'")
const iAnuncio = download.indexOf('anunciarVideoEntregue({')
const iReturnBlob = download.indexOf("return 'blob'", iAnuncio)
checa('fire(video_downloaded) existe', iDownloaded > 0)
checa('anúncio vem DEPOIS da prova de entrega', iAnuncio > iDownloaded)
checa("anúncio vem ANTES do return 'blob'", iReturnBlob > iAnuncio)

// E NÃO pode estar no clique nem nos degraus que não provam entrega.
const trechoClique = download.slice(
  download.indexOf("fire('video_download_clicked'"),
  download.indexOf("fire('video_download_clicked'") + 900,
)
checa('não anuncia no clique', !trechoClique.includes('anunciarVideoEntregue'))
const iPopup = download.indexOf("'popup'")
const trechoPopup = iPopup > 0 ? download.slice(iPopup, iPopup + 1200) : ''
checa('não anuncia no fallback de popup', !trechoPopup.includes('anunciarVideoEntregue'))

// ── BLOCO C ────────────────────────────────────────────────────────────────
console.log('C) NextShortsSection.tsx — verdade da visibilidade e convite')
const secao = readFileSync(path.join(raiz, 'components/video/NextShortsSection.tsx'), 'utf8')

checa('importa ouvirVideoEntregue', /import\s*\{\s*ouvirVideoEntregue\s*\}\s*from\s*'@\/lib\/postVideoSignal'/.test(secao))
checa('assina o sinal', /ouvirVideoEntregue\(/.test(secao))
checa('usa IntersectionObserver', secao.includes('new IntersectionObserver'))
checa('checa suporte antes de usar', /typeof IntersectionObserver !== 'function'/.test(secao))
checa('emite next_shorts_in_view', secao.includes("'next_shorts_in_view'"))
checa('emite next_shorts_summoned', secao.includes("'next_shorts_summoned'"))
checa('mantém next_shorts_shown (não renomeia contrato antigo)', secao.includes("'next_shorts_shown'"))
checa('mantém next_shorts_picked', secao.includes("'next_shorts_picked'"))
checa('threshold de meio card (0.5)', /threshold:\s*0\.5/.test(secao))
checa('desconecta o observador', secao.includes('observer?.disconnect()'))
checa('in_view dispara uma vez só (guarda)', secao.includes('jaContouVisivelRef'))
checa('convite dispara uma vez só (guarda)', secao.includes('jaChamouRef'))
checa('ref preso na raiz do card', /ref=\{secaoRef\}/.test(secao))
checa('rola para o card', /scrollIntoView\(/.test(secao))
checa('rolagem suave', /behavior:\s*'smooth'/.test(secao))
checa('rolagem no próximo quadro', secao.includes('requestAnimationFrame'))
checa('estado do convite existe', /const \[chamou, setChamou\]/.test(secao))
checa('faixa só aparece depois do download', /\{chamou && \(/.test(secao))
checa('copy diz que nada é cobrado antes do Generate', /nothing is charged until you press Generate/i.test(secao))
checa('mede se já estava na tela', secao.includes('was_in_view'))
checa('mede a distância entre carregar e ser vista', secao.includes('secs_since_shown'))

// O toque NÃO pode passar a gerar sozinho: a regra da casa é que crédito só
// sai com a pessoa apertando Generate.
checa('não gera sozinho no convite', !/setChamou\(true\)[\s\S]{0,400}handleGenerate/.test(secao))

// ── FRONTEIRA COM O CODEX ──────────────────────────────────────────────────
console.log('D) fronteira: nada de preço, plano, crédito ou checkout')
for (const [arquivo, texto] of [
  ['lib/postVideoSignal.ts', readFileSync(path.join(raiz, 'lib/postVideoSignal.ts'), 'utf8')],
]) {
  for (const proibido of [/\$\d/, /\bprice\b/i, /\bupgrade\b/i, /\bcheckout\b/i, /\bcoupon\b/i, /\bStarter\b/, /\bCreator\b/]) {
    checa(arquivo + ' sem ' + proibido, !proibido.test(texto))
  }
}
checa('postVideoSignal.ts não tem import nenhum', !/^\s*import\s/m.test(readFileSync(path.join(raiz, 'lib/postVideoSignal.ts'), 'utf8')))

console.log('\n' + ok + ' ok / ' + falhou + ' falhou')
process.exit(falhou === 0 ? 0 : 1)

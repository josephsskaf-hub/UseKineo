// KINEO-CENTRO-ADS-GANCHO-1410 [TRAVA 8.2 — vai do fundador 14/10, "tudo sim"] — guardião da centralização dos dois textos que
// ainda saíam encostados à ESQUERDA da caixa (o Creatomate alinha texto em x_alignment 0% por padrão; a caixa já estava no meio):
//   1. Studio Ads: as frases de tela (lib/ads/adV2Montage.ts — anúncio de sempre, frases no terço de baixo e anúncio com ator) e
//      o slogan/apoio do cartão final da Produção (lib/ads/producao.ts) ganham x_alignment '50%', nos 3 formatos (9:16, 4:5, 1:1).
//      O cartão final do Ads v2 é um PNG (lib/ads/endCard.ts, textAlign 'center'): não é texto do Creatomate. Logo e imagens: intocados;
//   2. filme: o título do gancho do 1º quadro (lib/hookFirstFrame.ts) ganha o mesmo x_alignment '50%'.
//
// Prova EXECUTANDO os montadores reais (sem rede, sem banco, sem fornecedor, sem render pago):
//   P1  todo elemento de texto do Ads v2 (centro, terço de baixo, com ator) nos 3 formatos: x 50%, x_anchor 50%, x_alignment 50%;
//   P2  o cartão final da Produção (logo + slogan + apoio, sem logo, só slogan): todo texto em x_alignment 50%; o logo, não;
//   P3  o gancho do 1º quadro (9:16, 4:5, 1:1, 16:9; elemento e withHookFirstFrame): x_alignment 50%;
//   P4  nenhum elemento que não é texto ganhou x_alignment;
//   P5  NADA MAIS mudou na fonte do Creatomate: tirado o x_alignment dos textos, a saída de agora é IDÊNTICA à do montador com o
//       ajuste desfeito (scripts/test-support/desfaz-centro-ads-gancho-1410.mjs), em todos os casos acima;
//   P6  byte a byte: desfeito o ajuste, cada arquivo é EXATAMENTE o pai do primeiro commit marcado (nunca origin/main);
//   E   escopo: fora de scripts/, só os 3 arquivos; dinheiro (v2Billing, v2Tiers, v2StartCore), engineWall e homeVideoCuration intocados;
//   M   mutantes: 6 sabotagens em memória, cada uma provada aplicada, cada uma deixa ao menos uma prova vermelha.
import { semCloseReal1910 } from './test-support/desfaz-close-real-1910.mjs' // reancorado KINEO-CLOSE-REAL-1910 — a entrega de 19/10 sai primeiro, em memória
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import {
  MARCA_CENTRO_ADS_GANCHO_1410 as MARCA, ARQUIVOS_CENTRO_ADS_GANCHO_1410, semCentroAdsGancho1410,
  LINHA_FRASE_ADS_1410, LINHA_CARTAO_PRODUCAO_1410, LINHA_GANCHO_1410,
} from './test-support/desfaz-centro-ads-gancho-1410.mjs'
import { desfazPosEntrega1510 } from './test-support/desfaz-ads-pos-entrega-1510.mjs' // reancorado KINEO-ADS-POS-ENTREGA-1510 — o preenchimento dos formatos (montagem) e o painel depois da entrega (telas) saem em memória ANTES de todo desfaz mais antigo
import { semFiel2_1510 } from './test-support/desfaz-ads-fiel-2-1510.mjs' // reancorado KINEO-ADS-FIEL-2-1510 — o conserto mais novo do Ads sai PRIMEIRO, em memória
import { semFiel3_1510 } from './test-support/desfaz-ads-fiel-3-1510.mjs' // reancorado KINEO-ADS-FIEL-3-1510 — o conserto mais novo do Ads sai PRIMEIRO, em memória

const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
process.chdir(RAIZ)
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (p) => lf(semFiel2_1510(p, semFiel3_1510(p, semCloseReal1910(readFileSync(join(RAIZ, p), 'utf8'), p)))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */
const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
let total = 0
let falhas = 0
const checa = (nome, cond, detalhe = '') => {
  total++
  if (cond) console.log(`  ok   ${nome}`)
  else { falhas++; console.log(`  FALHOU ${nome}${detalhe ? ' — ' + detalhe : ''}`) }
}
const secao = (t) => console.log(`\n── ${t}`)

const MONT = 'lib/ads/adV2Montage.ts'
const PROD = 'lib/ads/producao.ts'
const HOOK = 'lib/hookFirstFrame.ts'
const SRC = { [MONT]: rd(MONT), [PROD]: rd(PROD), [HOOK]: rd(HOOK) }

// ── base = pai do PRIMEIRO commit marcado (não-merge) na história de HEAD; antes do commit existir, HEAD ──────────────
let BASE = null
let SHAS = []
try {
  SHAS = git(['log', '--no-merges', '--format=%H', `--grep=${MARCA}`, 'HEAD']).trim().split('\n').filter(Boolean)
  BASE = git(['rev-parse', SHAS.length ? `${SHAS[SHAS.length - 1]}~1` : 'HEAD']).trim()
} catch { BASE = null }
const rdBase = (p) => { if (!BASE) return null; try { return lf(git(['show', `${BASE}:${p}`])) } catch { return null } }
console.log(`   base de comparação: ${BASE ?? '(nenhuma)'}`)
checa('a base existe e NÃO carrega a marca (é o antes de verdade)', Boolean(BASE) && ARQUIVOS_CENTRO_ADS_GANCHO_1410.every((p) => { const b = rdBase(p); return b !== null && !b.includes(MARCA) }))
checa('os 3 arquivos do ajuste são exatamente os montadores (Ads v2, Produção, gancho)', JSON.stringify([...ARQUIVOS_CENTRO_ADS_GANCHO_1410].sort()) === JSON.stringify([MONT, PROD, HOOK].sort()))

// ── entradas reais (as mesmas formas dos guardiões do Ads e do gancho) ───────────────────────────────────────────────
const url = (n) => `https://x.supabase.co/storage/v1/object/public/user-footage/u/${n}.jpg`
const clip = (n) => `https://x.supabase.co/storage/v1/object/public/renders/u/${n}.mp4`
const SHOTS = [
  { url: clip(0), kind: 'product', cutStart: 0.4, cutSeconds: 3, measuredSeconds: 5 },
  { url: clip(1), kind: 'product', cutStart: 0.2, cutSeconds: 3, measuredSeconds: 5 },
  { url: clip(2), kind: 'place', cutStart: 0, cutSeconds: 3, measuredSeconds: 5 },
  { url: url(3), kind: 'text', cutStart: 0, cutSeconds: 3, measuredSeconds: null },
  { url: url(5), kind: 'text', cutStart: 0, cutSeconds: 3, measuredSeconds: null, packshot: true },
]
const OVERLAYS = [{ text: 'LUME - eau de parfum', start: 0.3, end: 4.5 }, { text: 'Captivating fragrance selection', start: 5, end: 10 }, { text: 'Light floral, all day', start: 10.5, end: 14.5 }]
const FORMATOS = [[1080, 1920], [1080, 1350], [1080, 1080]]
const adsCasos = () => FORMATOS.flatMap(([width, height]) => {
  const b = { width, height, shots: SHOTS, overlays: OVERLAYS, fontFamily: 'Inter', cardUrl: url(9), cardSeconds: 2.5, musicUrl: 'https://x.supabase.co/storage/v1/object/public/music/u/t.mp3', voiceUrl: 'https://x.supabase.co/storage/v1/object/public/voiceovers/u/v.mp3', voiceSeconds: 11.2 }
  return [
    [`${width}×${height} centro`, b],
    [`${width}×${height} terço de baixo`, { ...b, overlayPlacement: 'lower_third' }],
    [`${width}×${height} com véu`, { ...b, tint: 'rgba(10,20,30,0.12)' }],
    [`${width}×${height} com ator`, { ...b, presenter: { url: clip(31), measuredSeconds: 15.5, insertOrder: [0, 1, 4, 2] } }],
  ]
})
const VID = (n) => `https://v3.fal.media/files/clip${n}.mp4`
const PROD_CASOS = [
  ['logo + slogan + apoio', { shots: [{ kind: 'clip', videoUrl: VID(1), seconds: 5 }, { kind: 'talk', videoUrl: 'https://v3.fal.media/files/a.mp4', voiceUrl: 'https://x.supabase.co/storage/v1/object/public/voiceovers/vo.mp3', seconds: 13.2 }], endCard: { logoUrl: 'https://x.supabase.co/storage/v1/object/public/avatars/u/brand-logo.png?v=1', slogan: 'Conecte-se', support: 'vivaexemplo.com', theme: 'light' } }, 2],
  ['sem logo, tema escuro', { shots: [{ kind: 'clip', videoUrl: VID(1), seconds: 5 }, { kind: 'clip', videoUrl: VID(2), seconds: 5 }], endCard: { logoUrl: null, slogan: 'Agende hoje', support: 'Rua das Flores, 10', theme: 'dark' } }, 2],
  ['só slogan', { shots: [{ kind: 'clip', videoUrl: VID(1), seconds: 5 }], endCard: { logoUrl: 'https://x.supabase.co/storage/v1/object/public/avatars/u/l.png', slogan: 'Feito à mão', support: '', theme: 'light' } }, 1],
]
const filmeSource = (W, H, captionY = '78%') => ({
  output_format: 'mp4', width: W, height: H, frame_rate: 30, duration: 40,
  elements: [
    { type: 'shape', track: 1, time: 0, duration: 40, x: '50%', y: '50%', width: '100%', height: '100%', fill_color: '#000000' },
    { type: 'video', track: 2, time: 0, duration: 4, source: 'https://x/c1.mp4' },
    { type: 'audio', track: 4, time: 0, duration: 40, source: 'https://x/vo.mp3' },
    { type: 'text', track: 5, time: 0, duration: 1.2, text: 'STOP SCROLLING', x: '50%', y: captionY, y_anchor: '100%', width: '78%', font_size: 76, line_height: '105%', background_y_padding: '2%' },
    { type: 'text', track: 9, time: 0, duration: 40, text: 'usekineo.com/free', x: '50%', y: '5%', width: '80%', font_size: 40 },
  ],
})
const HOOK_FORMATOS = [[1080, 1920], [1080, 1350], [1080, 1080], [1920, 1080]]
const NARRACAO = 'Stop scrolling. This changes everything about money.'

// ── carregadores: a fonte dada (agora ou mutante) e a mesma fonte com o ajuste desfeito ────────────────────────────
const carregar = (fontes) => createOfflineLoader({ source: (rel, text) => (Object.hasOwn(fontes, rel) ? fontes[rel] : text) })
const textos = (s) => s.elements.filter((e) => e.type === 'text')
const semXal = (s) => ({ ...s, elements: s.elements.map((e) => { if (e.type !== 'text') return e; const { x_alignment, ...r } = e; return r }) })
const tenta = (fn) => { try { return !!fn() } catch (e) { return false } }

/** As provas sobre um conjunto de fontes (LF). Devolve [nome, ok][]; um mutante precisa deixar pelo menos uma falsa. */
function provas(fontes) {
  const out = []
  const p = (nome, fn) => out.push([nome, tenta(fn)])
  const L = carregar(fontes)
  let M, MD, P, PD, G, GD
  try { M = L(MONT); P = L(PROD); G = L(HOOK) } catch { /* as provas abaixo ficam vermelhas */ }
  try {
    const D = carregar(Object.fromEntries(Object.entries(fontes).map(([k, v]) => [k, semCentroAdsGancho1410(k, v)])))
    MD = D(MONT); PD = D(PROD); GD = D(HOOK)
  } catch { /* idem (o desfaz lançou = linha marcada fora da forma) */ }

  p('P1 Ads v2: toda frase de tela no meio (x 50%, x_anchor 50%, x_alignment 50%) — centro, terço de baixo, véu e ator × 9:16/4:5/1:1', () =>
    adsCasos().every(([, inp]) => { const t = textos(M.buildAdV2Source(inp)); return t.length === 3 && t.every((e) => e.x === '50%' && e.x_anchor === '50%' && e.x_alignment === '50%' && e.width === '84%') }))
  p('P2 Produção: slogan e apoio do cartão final no meio (x_alignment 50%); o logo é imagem e fica como estava', () =>
    PROD_CASOS.every(([, inp, n]) => { const s = P.buildProducaoMontageSource(inp); const t = textos(s); return t.length === n && t.every((e) => e.x === '50%' && e.x_anchor === '50%' && e.x_alignment === '50%') && s.elements.filter((e) => e.type === 'image').every((e) => !('x_alignment' in e)) }))
  p('P3 gancho do 1º quadro no meio (x_alignment 50%) em 9:16/4:5/1:1/16:9, e pelo withHookFirstFrame da conta interna', () => {
    const els = HOOK_FORMATOS.map(([W, H]) => G.hookFirstFrameElement(filmeSource(W, H), NARRACAO, 'Montserrat').element).filter(Boolean)
    const s = filmeSource(1080, 1920)
    const r = G.withHookFirstFrame(s, { interna: true, narration: NARRACAO, font: 'Montserrat' })
    const el = s.elements[s.elements.length - 1]
    return els.length >= 1 && G.hookFirstFrameElement(filmeSource(1080, 1920), NARRACAO, 'Montserrat').element !== null &&
      els.every((e) => e.type === 'text' && e.x === '50%' && e.x_anchor === '50%' && e.x_alignment === '50%') && r.applied && el.x_alignment === '50%'
  })
  p('P4 nenhum elemento que não é texto ganhou x_alignment (vídeo, imagem, forma, áudio)', () =>
    [...adsCasos().map(([, i]) => M.buildAdV2Source(i)), ...PROD_CASOS.map(([, i]) => P.buildProducaoMontageSource(i))].every((s) => s.elements.every((e) => e.type === 'text' || !('x_alignment' in e))))
  p('P5 nada mais mudou: tirado o x_alignment dos textos, a fonte do Creatomate é IDÊNTICA à do montador com o ajuste desfeito', () => {
    const ads = adsCasos().every(([, i]) => { const d = MD.buildAdV2Source(i); return JSON.stringify(semXal(M.buildAdV2Source(i))) === JSON.stringify(d) && !JSON.stringify(d).includes('x_alignment') })
    const prod = PROD_CASOS.every(([, i]) => { const d = PD.buildProducaoMontageSource(i); return JSON.stringify(semXal(P.buildProducaoMontageSource(i))) === JSON.stringify(d) && !JSON.stringify(d).includes('x_alignment') })
    const hook = HOOK_FORMATOS.every(([W, H]) => {
      const a = G.hookFirstFrameElement(filmeSource(W, H), NARRACAO, 'Montserrat')
      const b = GD.hookFirstFrameElement(filmeSource(W, H), NARRACAO, 'Montserrat')
      const ae = a.element ? (({ x_alignment, ...r }) => r)(a.element) : null
      return JSON.stringify({ ...a, element: ae }) === JSON.stringify(b) && !JSON.stringify(b).includes('x_alignment')
    })
    return ads && prod && hook
  })
  p('P6 byte a byte: desfeito o ajuste, os 3 arquivos são EXATAMENTE o pai do primeiro commit marcado', () =>
    ARQUIVOS_CENTRO_ADS_GANCHO_1410.every((k) => { const b = rdBase(k); return b !== null && semCentroAdsGancho1410(k, desfazPosEntrega1510(k, fontes[k])) === b })) /* reancorado KINEO-ADS-POS-ENTREGA-1510 */
  return out
}

secao('provas sobre o código de agora')
const AGORA = provas(SRC)
for (const [n, v] of AGORA) checa(n, v)

secao('a forma do ajuste')
checa('Ads v2: exatamente 2 linhas marcadas (frases do anúncio de sempre e do anúncio com ator), texto exato', SRC[MONT].split('\n').filter((l) => l.includes(MARCA)).every((l) => l === LINHA_FRASE_ADS_1410) && SRC[MONT].split('\n').filter((l) => l.includes(MARCA)).length === 2)
checa('Produção: 1 linha marcada, dentro do texto do cartão (logo depois da caixa de 86%)', SRC[PROD].includes(`width: '86%', height: i === 0 ? '8%' : '7%',\n${LINHA_CARTAO_PRODUCAO_1410}\n`))
checa('gancho: 1 linha marcada, logo depois do x_anchor do título', SRC[HOOK].includes(`    x_anchor: '50%',\n${LINHA_GANCHO_1410}\n`))
checa('o cartão do Ads v2 continua um PNG centrado (lib/ads/endCard.ts: textAlign center), fora do ajuste', rd('lib/ads/endCard.ts').includes("ctx.textAlign = 'center'") && !rd('lib/ads/endCard.ts').includes(MARCA))

secao('escopo (commits marcados + o que está na worktree)')
let tocados = []
try {
  tocados = [...new Set(SHAS.flatMap((h) => git(['diff-tree', '--no-commit-id', '--name-only', '-r', h]).split('\n').filter(Boolean)))]
  tocados.push(...git(['diff', '--name-only', 'HEAD']).split('\n').filter(Boolean))
  tocados = [...new Set(tocados)]
} catch { tocados = [] }
checa('existe ao menos um commit do ajuste (ou trabalho na worktree)', tocados.length > 0)
checa('fora de scripts/, só os 3 arquivos declarados', tocados.filter((f) => !f.startsWith('scripts/')).every((f) => ARQUIVOS_CENTRO_ADS_GANCHO_1410.includes(f)), tocados.join(', '))
checa('dinheiro e vitrine intocados (v2Billing, v2Tiers, v2StartCore, engineWall, homeVideoCuration, engineCost, pricing)', !tocados.some((f) => /v2Billing|v2Tiers|v2StartCore|engineWall|homeVideoCuration|engineCost|pricing|credits\//i.test(f)), tocados.join(', '))
let marcados = []
try { marcados = git(['grep', '-l', MARCA, '--', 'lib', 'app', 'components']).split('\n').filter(Boolean) } catch { marcados = [] }
checa('a marca só existe nos 3 montadores (lib/app/components)', JSON.stringify(marcados.sort()) === JSON.stringify([...ARQUIVOS_CENTRO_ADS_GANCHO_1410].sort()), marcados.join(', '))

secao('mutantes (cada um provado aplicado; cada um deixa ao menos uma prova vermelha)')
const MUTANTES = [
  ['frase do anúncio de sempre volta à esquerda', MONT, `ADS_V2_OVERLAY_Y), x_anchor: '50%', y_anchor: '50%',\n${LINHA_FRASE_ADS_1410}\n`, `ADS_V2_OVERLAY_Y), x_anchor: '50%', y_anchor: '50%',\n`],
  ['frase do anúncio com ator em 0%', MONT, `pct(ADS_V2_PRESENTER_OVERLAY_Y), x_anchor: '50%', y_anchor: '50%',\n${LINHA_FRASE_ADS_1410}\n`, `pct(ADS_V2_PRESENTER_OVERLAY_Y), x_anchor: '50%', y_anchor: '50%',\n${LINHA_FRASE_ADS_1410.replace("'50%'", "'0%'")}\n`],
  ['cartão da Produção sem o centro', PROD, `${LINHA_CARTAO_PRODUCAO_1410}\n`, ''],
  ['gancho em 100% (direita)', HOOK, LINHA_GANCHO_1410, LINHA_GANCHO_1410.replace("'50%'", "'100%'")],
  ['mudança escondida fora da marca (frase menor)', MONT, "font_family: fontFamily, font_size: 64, font_weight: '800', line_height: '110%',\n      fill_color: '#ffffff', stroke_color: 'rgba(0,0,0,0.55)', stroke_width: 2,\n      // KINEO-ADS-V2-PILULA", "font_family: fontFamily, font_size: 60, font_weight: '800', line_height: '110%',\n      fill_color: '#ffffff', stroke_color: 'rgba(0,0,0,0.55)', stroke_width: 2,\n      // KINEO-ADS-V2-PILULA"],
  ['mudança escondida DENTRO da linha marcada (caixa mais larga)', PROD, LINHA_CARTAO_PRODUCAO_1410, LINHA_CARTAO_PRODUCAO_1410.replace("x_alignment: '50%',", "x_alignment: '50%', width: '96%',")],
  ['x_alignment no logo da Produção em vez do texto', PROD, "x: '50%', y: slogan || support ? '38%' : '50%', width: '84%', height: slogan || support ? '46%' : '70%',\n", "x: '50%', y: slogan || support ? '38%' : '50%', width: '84%', height: slogan || support ? '46%' : '70%', x_alignment: '50%',\n"],
]
for (const [nome, arq, de, para] of MUTANTES) {
  const src = SRC[arq]
  const aplicavel = src.split(de).length === 2
  const mut = aplicavel ? src.split(de).join(para) : src
  if (!aplicavel || mut === src) { checa(`mutante "${nome}" aplicado`, false, 'âncora não única ou sem efeito'); continue }
  const r = provas({ ...SRC, [arq]: mut })
  const vermelhas = r.filter(([, v]) => !v).map(([n]) => n.slice(0, 3))
  checa(`mutante "${nome}" → vermelho (${vermelhas.join(' ') || 'nenhuma'})`, vermelhas.length > 0)
}

console.log(`\n${total - falhas}/${total} ok`)
if (falhas) { console.log(`${falhas} FALHA(S)`); process.exit(1) }

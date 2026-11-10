// KINEO-PAGINAS-CITAVEIS-1011 [fundador 10/11: "retorno de pessoas que pagam, mas não queria investir dinheiro"] — guardião sem rede.
// Renderiza a página nova do Recreate (/ai-face-swap-video) e o bloco citável do /ai-ugc-ads (EN e PT) e confere, recalculando por fora:
//   · todo preço/crédito/custo por vídeo sai das tabelas que cobram (RECREATE_PRICING, TIER_PRICES/TIER_CREDITS, adsV2Credits);
//   · nenhuma palavra "free" na página nova (título, URL, texto, JSON-LD) nem no bloco novo;
//   · só formatos de troca com swapApproved: true (e abertos ao público) são citados; os em teste não aparecem;
//   · a página está no mapa do site (e o carimbo de data não alarga nem anda para trás), e no /llms.txt;
//   · o cadastro leva a campanha própria seo_product_recreate e volta ao /recreate;
//   · todo JSON-LD faz parse.
// Mutantes: número digitado, formato em teste citado, "free" na copy, campanha trocada, página fora do mapa, carimbo largo.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const ROOT = process.cwd()
const lf = (t) => t.replace(/\r\n/g, '\n')
const ler = (f) => lf(fs.readFileSync(path.join(ROOT, f), 'utf8'))
let ok = 0, falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }

const LIB = 'lib/seo/paginasCitaveis1011.ts', PAGE = 'app/ai-face-swap-video/page.tsx', COMP = 'components/seo/BlocoCitavel1011.tsx'
const UGC = 'components/ugc/UgcPages.tsx', MAPA = 'app/sitemap.ts', LLMS = 'app/llms.txt/route.ts', FORMATS = 'lib/recreate/formats.ts'

// Next e o rodapé (cromo do site, fora do escopo) viram dublês: o que se prova é o conteúdo da página.
const MOCKS = {
  'next/link': { __esModule: true, default: ({ href, children, ...rest }) => React.createElement('a', { href, ...rest }, children) },
  '@/components/Footer': { __esModule: true, default: () => null },
}
function carregador(mutar = {}, env = {}) {
  const cache = new Map()
  const carrega = (nome, pai = ROOT) => {
    if (nome === 'react') return React
    if (nome === 'react/jsx-runtime') return require('react/jsx-runtime')
    if (MOCKS[nome]) return MOCKS[nome]
    let f = nome.startsWith('@/') ? path.join(ROOT, nome.slice(2)) : nome.startsWith('.') ? path.resolve(pai, nome) : null
    if (!f) return require(nome)
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = [f + '.ts', f + '.tsx', path.join(f, 'index.ts')].find((x) => fs.existsSync(x)) ?? f
    if (cache.has(f)) return cache.get(f).exports
    if (f.endsWith('.json')) return { __esModule: true, default: JSON.parse(fs.readFileSync(f, 'utf8')) }
    const rel = path.relative(ROOT, f).split(path.sep).join('/')
    const mod = { exports: {} }
    cache.set(f, mod)
    const fonte = mutar[rel] ? mutar[rel](lf(fs.readFileSync(f, 'utf8'))) : fs.readFileSync(f, 'utf8')
    const js = ts.transpileModule(fonte, { fileName: f, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText
    vm.runInNewContext(js, { exports: mod.exports, module: mod, require: (n) => carrega(n, path.dirname(f)), console, process: { env }, URL, URLSearchParams, Date, Math, Number, String, Array, Object, Set, Map, JSON, Error, RegExp, Boolean, Symbol, Intl, Promise }, { filename: f })
    return mod.exports
  }
  return carrega
}

const semTags = (h) => h.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ')
const jsonLds = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1])
const usd = (v) => `US$${Number.isInteger(v) ? v : v.toFixed(2)}`
const usdPt = (v) => `US$ ${(Number.isInteger(v) ? String(v) : v.toFixed(2)).replace('.', ',')}`
const custo = (cr, preco, saldo) => Math.round((cr * preco / saldo) * 100) / 100

function prova(mutar = {}, env = {}) {
  const e = []
  const exige = (c, m) => { if (!c) e.push(m) }
  const carrega = carregador(mutar, env)
  const P = carrega('@/' + LIB.replace(/\.ts$/, ''))
  const preco = carrega('@/lib/checkoutPricing')
  const { RECREATE_FORMATS } = carrega('@/lib/recreate/formats')
  const { RECREATE_RELEASE, RECREATE_SWAP_RELEASE } = carrega('@/lib/recreate/release')
  const { adsV2Credits } = carrega('@/lib/ads/v2Tiers')
  const { ADS_V2_PRESENTER_V2_TIERS } = carrega('@/lib/ads/v2PresenterV2')
  const page = carrega('@/' + PAGE.replace(/\.tsx$/, ''))
  const { BlocoCitavel1011 } = carrega('@/' + COMP.replace(/\.tsx$/, ''))

  // fatos recalculados por fora, direto das tabelas que cobram
  const planos = [['starter', 'Starter'], ['basic', 'Creator'], ['pro', 'Studio']].map(([t, nome]) => ({ nome, usd: preco.TIER_PRICES[t].usd / 100, saldo: preco.TIER_CREDITS[t] }))
  const abertoPublico = RECREATE_RELEASE === 'public' && RECREATE_SWAP_RELEASE === 'public'
  const aprovados = RECREATE_FORMATS.filter((f) => f.type === 'swap' && f.swapApproved === true && abertoPublico && Object.hasOwn(preco.RECREATE_PRICING, f.seconds))
  const emTeste = RECREATE_FORMATS.filter((f) => f.type === 'swap' && f.swapApproved !== true)
  const crRec = (f) => preco.RECREATE_PRICING[f.seconds]

  // ── 1. a página nova do Recreate ──
  const html = renderToStaticMarkup(React.createElement(page.default))
  const texto = semTags(html)
  const meta = page.metadata
  const tudo = [html, JSON.stringify(meta), P.FACE_SWAP_PATH].join(' ')
  exige(!/free|gr[aá]tis/i.test(tudo), 'Recreate: nenhuma palavra "free" (título, URL, texto, JSON-LD)')
  exige(P.FACE_SWAP_PATH === '/ai-face-swap-video' && !P.FACE_SWAP_PATH.startsWith('/recreate'), 'Recreate: URL pública própria, sem colidir com /recreate')
  exige(meta?.alternates?.canonical === 'https://www.usekineo.com/ai-face-swap-video', 'Recreate: canonical')
  exige(aprovados.length > 0 ? !meta.robots : meta.robots?.index === false, 'Recreate: indexável só com troca aberta')
  const lds = jsonLds(html)
  let ldOk = lds.length >= 2
  const ldObjs = []
  for (const raw of lds) { try { const j = JSON.parse(raw); ldObjs.push(j); ldOk = ldOk && j['@context'] === 'https://schema.org' } catch { ldOk = false } }
  exige(ldOk, 'Recreate: JSON-LD válido (parse)')
  const faq = ldObjs.find((j) => j['@type'] === 'FAQPage')
  exige(!!faq && faq.mainEntity.length >= 4, 'Recreate: FAQPage com as perguntas')
  for (const f of aprovados) {
    exige(texto.includes(f.title) && texto.includes(`${f.seconds} s · ${crRec(f)} credits`), `Recreate: ${f.title} citado com ${f.seconds} s e ${crRec(f)} créditos da tabela`)
    for (const p of planos) {
      const n = Math.floor(p.saldo / crRec(f))
      exige(n > 0 ? texto.includes(`${n} per month · about ${usd(custo(crRec(f), p.usd, p.saldo))} each`) : texto.includes(`Not enough credits for one (needs ${crRec(f)})`), `Recreate: ${p.nome} × ${f.title} = vídeos e custo calculados`)
    }
  }
  for (const p of planos) exige(texto.includes(usd(p.usd)) && new RegExp(`\\b${p.saldo}\\b`).test(texto), `Recreate: ${p.nome} com preço e créditos da tabela`)
  for (const f of emTeste) exige(!texto.includes(f.title) && !html.includes(f.id), `Recreate: formato em teste (${f.title}) não é citado`)
  exige(/automatic check/.test(texto) && /credits return to your balance/.test(texto), 'Recreate: estorno automático quando a troca falha')
  exige(/front-facing/.test(texto), 'Recreate: limite honesto da foto (de frente)')
  exige(!/minimax|recast|fal\.ai|h3/i.test(texto + JSON.stringify(meta)), 'Recreate: sem nome do fornecedor da troca')
  exige((html.match(/<time /g) ?? []).length === 1 && html.includes('dateTime="2026-11-10"') && texto.includes('November 10, 2026'), 'Recreate: data de atualização 10/11')
  const href = (html.match(/href="(\/signup\?[^"]+)"/) ?? [])[1]?.replace(/&amp;/g, '&')
  const qs = href ? new URLSearchParams(href.split('?')[1]) : null
  exige(!!qs && qs.get('intent_campaign') === 'seo_product_recreate' && qs.get('redirect') === '/recreate', 'Recreate: botão leva ao cadastro com a campanha própria e volta ao /recreate')

  // ── 2. o bloco do anúncio de produto (/ai-ugc-ads e /anuncios-ugc-com-ia) ──
  const tier = ADS_V2_PRESENTER_V2_TIERS[0] ?? 'commercial'
  const c15 = adsV2Credits(tier, 15), c20 = adsV2Credits(tier, 20), c30 = adsV2Credits(tier, 30)
  for (const pt of [false, true]) {
    const h = renderToStaticMarkup(React.createElement(BlocoCitavel1011, { bloco: P.ugcBloco(pt), id: pt ? 'ugc-pt' : 'ugc', pt, heading: 'x' }))
    const t = semTags(h)
    const L = pt ? 'PT' : 'EN'
    exige(!/free|gr[aá]tis/i.test(t), `UGC ${L}: o bloco novo não diz "free"`)
    exige(t.includes(pt ? `15 s = ${c15}, 20 s = ${c20}, 30 s = ${c30}` : `15 s = ${c15}, 20 s = ${c20}, 30 s = ${c30}`), `UGC ${L}: créditos por duração de adsV2Credits`)
    for (const p of planos) {
      const n = Math.floor(p.saldo / c15)
      const custoTxt = n > 0 ? `${pt ? 'Cerca de ' : 'About '}${(pt ? usdPt : usd)(custo(c15, p.usd, p.saldo))}` : (pt ? `Créditos insuficientes para um (precisa de ${c15})` : `Not enough credits for one (needs ${c15})`)
      exige(t.includes(`${p.nome} ${(pt ? usdPt : usd)(p.usd)} ${p.saldo} ${n} ${custoTxt}`), `UGC ${L}: linha do ${p.nome} calculada (preço, créditos, anúncios, custo)`)
    }
    exige(h.includes('dateTime="2026-11-10"') && t.includes(pt ? '10 de novembro de 2026' : 'November 10, 2026'), `UGC ${L}: data 10/11 na língua da página`)
  }
  const ugcFonte = (mutar[UGC] ?? ((x) => x))(ler(UGC))
  exige(ugcFonte.includes('<BlocoCitavel1011 bloco={ugcBloco(pt)}'), 'UGC: o bloco está montado na página pilar (EN e PT)')

  // ── 3. mapa do site e /llms.txt ──
  const mapaFonte = (mutar[MAPA] ?? ((x) => x))(ler(MAPA))
  exige(/if \(faceSwapNoMapa\(\)\) routes\.push\(\{ path: FACE_SWAP_PATH/.test(mapaFonte) && P.faceSwapNoMapa() === (aprovados.length > 0), 'mapa: a página nova entra no sitemap (com troca aberta)')
  exige(/return carimbaPaginasCitaveis1011\(carimbaPaginasCitadas0511\(/.test(mapaFonte), 'mapa: o carimbo de 10/11 está ligado por fora')
  const base = 'https://www.usekineo.com'
  const entrada = ['/ai-face-swap-video', '/ai-ugc-ads', '/anuncios-ugc-com-ia', '/pricing', '/ads'].map((p) => ({ url: base + p, lastModified: '2026-10-20T12:00:00.000Z' }))
  const saida = P.carimbaPaginasCitaveis1011([...entrada, { url: base + '/ai-ugc-ads', lastModified: '2026-12-01T00:00:00.000Z' }])
  const dia = (x) => new Date(x.lastModified).toISOString().slice(0, 10)
  exige(saida.slice(0, 3).every((x) => dia(x) === '2026-11-10'), 'mapa: as 3 páginas ganham 10/11')
  exige(dia(saida[3]) === '2026-10-20' && dia(saida[4]) === '2026-10-20', 'mapa: nenhuma outra página muda de data')
  exige(dia(saida[5]) === '2026-12-01', 'mapa: data mais nova fica')
  const llms = (mutar[LLMS] ?? ((x) => x))(ler(LLMS))
  exige(llms.includes('${paginasCitaveis1011LlmsSection()}'), '/llms.txt: a seção do Recreate está montada')
  const sec = P.paginasCitaveis1011LlmsSection()
  exige(aprovados.length === 0 ? sec === '' : sec.includes(base + '/ai-face-swap-video') && !/free/i.test(sec), '/llms.txt: a seção cita a página, sem "free"')

  // ── 4. campanha própria ──
  exige(P.CAMPANHA_RECREATE === 'seo_product_recreate' && /^[A-Za-z0-9._~-]{1,100}$/.test(P.CAMPANHA_RECREATE), 'campanha: seo_product_recreate (passa no filtro do /signup)')
  return e
}

console.log('1. página, bloco, mapa e campanha')
{
  // as duas posições do interruptor que muda o preço do anúncio (KLING4_PAID_LIVE eleva o piso de adsV2Credits)
  const r = [...prova(), ...prova({}, { KLING4_PAID_LIVE: 'true' })]
  checa(`tudo confere, com e sem KLING4_PAID_LIVE (${r.slice(0, 6).join('; ') || 'ok'})`, r.length === 0)
}
console.log('2. o que não pode mudar')
{
  const semComentario = (t) => t.replace(/\/\/[^\n]*/g, '')
  const lib = semComentario(ler(LIB))
  checa('nenhum preço ou crédito escrito à mão na camada', !/\b(9|19|59|900|1900|5900|40|45|60|150|470|41)\b(?![-\d])/.test(lib.replace(/'\d{4}-\d{2}-\d{2}[^']*'/g, '').replace(/maxLength|\{1,100\}/g, '').replace(/\* 100\) \/ 100/g, '')))
  const pagina = semComentario(ler(PAGE))
  checa('a página não digita número de preço/crédito', !/\b(40|45|150|470)\b|US\$\d/.test(pagina))
  checa('a camada não toca em cobrança, motor nem checkout', !/stripe|debit|submitToFal|checkout\//i.test(lib.replace("'@/lib/checkoutPricing'", '')))
  checa('/ads continua sem preço (decisão do fundador 04/11)', !ler('app/ads/page.tsx').includes('BlocoCitavel1011'))
}
console.log('3. mutantes')
const MUTANTES = [
  ['crédito do Recreate digitado', LIB, (t) => t.replace('creditos: recreateCreditCost(f.seconds) as number', 'creditos: 40'), /créditos da tabela|vídeos e custo/],
  ['preço do plano digitado', LIB, (t) => t.replace('precoUsd: TIER_PRICES[tier].usd / 100', 'precoUsd: 19'), /preço e créditos|vídeos e custo|calculada/],
  ['crédito do anúncio digitado', LIB, (t) => t.replace('s15: adsV2Credits(UGC_TIER, 15)', 's15: 41'), /créditos por duração|calculada/],
  ['formato em teste citado', LIB, (t) => t.replace("f.swapApproved === true && publicRecreatePath(f.id) !== null", 'true'), /em teste/],
  ['"free" na copy da página nova', LIB, (t) => t.replace('Kineo Recreate puts your face into a ready-made vertical video. You upload', 'Kineo Recreate puts your face into a ready-made vertical video for free. You upload'), /"free"/],
  ['"free" no título', PAGE, (t) => t.replace("const title = 'Put your face", "const title = 'Free: Put your face"), /"free"/],
  ['campanha trocada', LIB, (t) => t.replace("export const CAMPANHA_RECREATE = 'seo_product_recreate'", "export const CAMPANHA_RECREATE = 'seo_engine'"), /campanha/],
  ['página fora do mapa', MAPA, (t) => t.replace('routes.push({ path: FACE_SWAP_PATH', 'void ({ path: FACE_SWAP_PATH'), /sitemap/],
  ['carimbo alarga para todo o mapa', LIB, (t) => t.replace('if (!alvo.has(new URL(entry.url).pathname)) return entry', ''), /nenhuma outra página/],
  ['carimbo anda para trás', LIB, (t) => t.replace('return atual >= carimbo ? entry : ', 'return '), /data mais nova/],
  ['JSON-LD quebrado', PAGE, (t) => t.replace('__html: JSON.stringify(howToLd)', "__html: JSON.stringify(howToLd) + '}'"), /JSON-LD/],
  ['estorno some da página', LIB, (t) => t.replace('the credits return to your balance on their own', 'support will review it'), /estorno/],
  ['bloco tirado do /ai-ugc-ads', UGC, (t) => t.replace('<BlocoCitavel1011 bloco={ugcBloco(pt)}', '<BlocoCitavel1011 bloco={null as never}'), /pilar/],
]
for (const [nome, arq, muta, esperado] of MUTANTES) {
  const original = ler(arq)
  let r
  try { r = [...prova({ [arq]: muta }), ...prova({ [arq]: muta }, { KLING4_PAID_LIVE: 'true' })] } catch (x) { r = ['estourou: ' + x.message] }
  if (process.env.VER_MUTANTES) console.log('    ', nome, '=>', JSON.stringify(r).slice(0, 240))
  checa(`mutante "${nome}" fica vermelho`, muta(original) !== original && r.some((m) => esperado.test(m)))
}
console.log(`\n${ok} ok, ${falhas} falha(s)`)
process.exitCode = falhas ? 1 : 0

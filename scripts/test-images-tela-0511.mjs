// KINEO-IMAGES-TELA-0511 — guardião da tela /images no esqueleto do /kids-cartoon (fundador 05/11: "entrada primeiro, um botão
// principal, preço só nele, opcionais recolhidos, mesmas cores de botão; a galeria fica ABAIXO da caixa"; 04/11: "gerar sem escolher").
// Prova na página de verdade (render offline do JSX real, sem rede): a caixa antes do motor, motor/formato/foto recolhidos, preço só
// no botão, galeria ou vitrine abaixo. E que é só apresentação: a lógica de gerar é a mesma da base, byte a byte; nenhum efeito novo.
// Rodar: node scripts/test-images-tela-0511.mjs
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { renderPage, setCurrentFilter } from './preview-ux-complete.mjs'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const ROOT = path.resolve(import.meta.dirname, '..')
const PAGE = 'app/(dashboard)/images/ImagesClient.tsx'
const LIB = 'lib/images/telaImagens.ts'
/** A base antes desta entrega: a lógica da tela tem de continuar igual a ela. */
const BASE = '03b266b75'
const lf = (t) => t.replace(/\r\n/g, '\n')
const atual = (rel) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
const naBase = lf(execFileSync('git', ['show', `${BASE}:${PAGE}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 }))

/** Tudo o que vai do upload da foto até o return: gerar, baixar, editar, ampliar. */
const logica = (src) => {
  const a = src.indexOf('  async function addRefPhotos(')
  const b = src.indexOf('  return (\n    <div className="stu images-workspace kps-page">')
  if (a < 0 || b < 0) return null
  return src.slice(a, b)
}
const semEstilo = (html) => html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
const PRECO = /\b\d+\s*cr\b/g

function efeitos(src) {
  const sf = ts.createSourceFile(PAGE, src, 99, true, 4)
  const out = []
  const walk = (n) => {
    if (ts.isCallExpression(n) && n.expression.getText(sf) === 'useEffect') out.push(n.arguments.length === 2 ? n.arguments[1].getText(sf) : null)
    ts.forEachChild(n, walk)
  }
  walk(sf)
  return out
}

/** Os problemas da tela como ela está (mutantes entram por setCurrentFilter e passam pelo mesmo render). */
function problemas() {
  const p = []
  const src = atual(PAGE)
  const fonte = (() => { let s = src; s = filtro(s, PAGE); return lf(s) })()
  const css = lf(filtro(atual(LIB), LIB))
  const vazia = semEstilo(renderPage(PAGE, false, { galleryLoading: false }))
  const comPrompt = semEstilo(renderPage(PAGE, false, { galleryLoading: false, prompt: 'A lighthouse at dusk' }))
  const comImagem = semEstilo(renderPage(PAGE, false, { galleryLoading: false, items: [{ id: 'own', url: '/own.png', model: 'dev' }] }))
  const lendo = semEstilo(renderPage(PAGE, false, {}))
  const nano = semEstilo(renderPage(PAGE, false, { galleryLoading: false, model: 'nanobanana', prompt: 'x' }))

  // A) a caixa vem antes de tudo
  const caixa = vazia.indexOf('<textarea')
  const motor = vazia.indexOf('class="image-engine-picker"')
  const formato = vazia.indexOf('9:16 · Vertical</button>')
  const foto = vazia.indexOf('class="image-ref image-ref-off"')
  const botao = vazia.indexOf('class="go ')
  if (!(caixa >= 0 && motor > caixa)) p.push('A1 a caixa de texto não vem antes do seletor de motor')
  if (!(formato > caixa && foto > caixa)) p.push('A2 formato ou foto de referência antes da caixa')
  if (!(botao > caixa)) p.push('A3 o botão não vem depois da caixa')

  // B) motor, formato e foto recolhidos, mas montados (quem quer escolher continua conseguindo tudo)
  const abre = vazia.search(/<details[^>]*data-kineo="images-mais-opcoes"/)
  const fecha = vazia.indexOf('</details>', abre)
  const tag = abre >= 0 ? vazia.slice(abre, vazia.indexOf('>', abre) + 1) : ''
  if (abre < 0 || fecha < 0) p.push('B1 sem o Settings recolhido')
  if (/\sopen(=|\s|>)/.test(tag)) p.push('B2 o Settings nasce aberto: motor virou passo obrigatório')
  for (const [nome, i] of [['motor', motor], ['formato', formato], ['foto de referência', foto]]) {
    if (!(i > abre && i < fecha)) p.push(`B3 ${nome} fora do Settings`)
  }
  if (!(abre > caixa && botao > fecha)) p.push('B4 fora de ordem: caixa → Settings → botão')
  if ((vazia.match(/name="image-engine"/g) ?? []).length !== 6) p.push('B5 os 6 motores não estão todos lá dentro')
  for (const f of ['9:16 · Vertical', '1:1 · Square', '16:9 · Wide']) if (!vazia.includes(f + '</button>')) p.push(`B6 sem o formato ${f}`)
  if (!nano.includes('type="file"') || !nano.includes('I have permission from the person in the photo')) p.push('B7 foto de referência sumiu do Nano Banana Pro')
  if (!vazia.includes('Use Nano Banana Pro')) p.push('B8 sem o atalho para o Nano Banana Pro')
  if (!/new URLSearchParams\(window\.location\.search\)\.get\('engine'\)/.test(fonte)) p.push('B9 ?engine= do menu deixou de valer')

  // C) preço só no botão
  const precosVazia = vazia.match(PRECO) ?? []
  if (precosVazia.length !== 1 || precosVazia[0] !== '2 cr') p.push(`C1 preço fora do botão na tela vazia: ${precosVazia.join(', ') || 'nenhum'}`)
  const noBotao = (html) => { const i = html.indexOf('class="go '); return html.slice(i, html.indexOf('</button>', i)) }
  if (!noBotao(vazia).includes('Describe your image first · 2 cr')) p.push('C2 botão vazio sem o preço')
  if (!noBotao(comPrompt).includes('Generate image · 2 cr →')) p.push('C3 botão pronto sem o preço do motor padrão')
  if (!noBotao(nano).includes('Generate image · 5 cr →')) p.push('C4 o preço do botão não segue o motor escolhido')
  if ((nano.match(PRECO) ?? []).length !== 1) p.push('C5 preço fora do botão com outro motor')
  const antesDosResultados = comImagem.slice(0, comImagem.indexOf('class="creation-results"'))
  if ((antesDosResultados.match(PRECO) ?? []).length !== 1) p.push('C6 preço fora do botão acima da galeria')
  if (/image-engine-price|Cost per image|className="cost"/.test(fonte)) p.push('C7 sobrou o cartão de custo ou o preço por motor')
  if (/<ProductStage [^\n]*\bmeta=/.test(fonte)) p.push('C8 a vitrine voltou a mostrar preço')
  if (/<MobileCreationShortcut [^\n]*(credits|unitCost)/.test(fonte)) p.push('C9 o atalho do celular mostra preço')

  // D) abaixo da caixa: a galeria da pessoa, senão a vitrine
  const fimBotaoCI = comImagem.indexOf('class="go ')
  const galeria = comImagem.indexOf('My Images')
  if (!(galeria > fimBotaoCI && comImagem.includes('/own.png'))) p.push('D1 a galeria da pessoa não está abaixo da caixa')
  // O render offline troca ProductStage por um dublê vazio; a vitrine se confere no JSX e na condição que a abre.
  const condicao = fonte.match(/const mostraVitrine = (.*)/)?.[1] ?? ''
  if (!condicao.includes('items.length === 0')) p.push('D2 quem tem imagens ainda vê a vitrine')
  const posBotao = fonte.indexOf('className={`go ${canGenerate')
  const palco = fonte.indexOf('{mostraVitrine && <ProductStage ')
  const reta = fonte.indexOf('{mostraVitrine && <ProductRow ')
  if (!(posBotao >= 0 && palco > posBotao && reta > palco)) p.push('D3 sem imagens: a vitrine não está abaixo da caixa')
  if (!fonte.includes('/previews/promo-images-1.mp4') || !/<ProductStage .*items=\{HOUSE_IMAGES\}/.test(fonte)) p.push('D4 a vitrine não é a que já existia')
  if (!/!galleryLoading/.test(condicao) || !/!premiere/.test(condicao)) p.push('D5 a vitrine pisca enquanto a galeria é lida')
  if (!lendo.includes('aria-busy="true"')) p.push('D6 sem a forma da grade enquanto lê a galeria')
  if (!/\.kps-stage\{[^}]*order:0/.test(css) || !/\.kps-grid\{grid-template-columns:minmax\(0,1fr\)\}/.test(css)) p.push('D7 no celular o palco voltaria para cima da caixa, ou a vitrine voltaria para a direita')

  // E) mesmas cores do botão do Cartoon: a cor de destaque com texto branco; desabilitado é a mesma cor mais apagada
  const go = css.match(/\.images-go \.go\{([^}]*)\}/)?.[1] ?? ''
  if (!/background:var\(--accent,#0A5CFF\)/.test(go) || !/color:#fff/.test(go) || !/border-radius:11px/.test(go)) p.push('E1 botão com cor diferente da do Cartoon')
  if (!/\.images-go \.go\.no\{[^}]*opacity:\.55/.test(css)) p.push('E2 botão desabilitado diferente do Cartoon')
  if (!css.includes('REGRAS_DO_RECOLHIDO') || !/\.ace-\(change\|more\|open-body\)/.test(css)) p.push('E3 o recolhido deixou de vir das regras do Cartoon')

  // F) só apresentação
  if (logica(fonte) !== logica(naBase)) p.push('F1 a lógica de gerar, baixar, editar ou ampliar mudou')
  if (!fonte.includes("useState<ImgModelKey>('dev')")) p.push('F2 o motor padrão mudou')
  if (!fonte.includes("useState<ImgSize>('portrait_16_9')")) p.push('F3 o formato padrão mudou')
  if (!fonte.includes('unitCost={unitCost}') || !fonte.includes('<TopupOuRecargaModal surface="images_402"') /* KINEO-RECARGA-TELAS-1211 */) p.push('F4 a parede de crédito sumiu')

  // G) nada de efeito novo (04/11: um laço de render congelou outra tela sem nenhum teste pegar)
  const ef = efeitos(fonte)
  const efBase = efeitos(naBase)
  if (ef.some((d) => d === null)) p.push('G1 efeito sem lista de dependências')
  if (JSON.stringify(ef) !== JSON.stringify(efBase)) p.push(`G2 os efeitos mudaram: ${ef.length} contra ${efBase.length} da base`)
  return p
}

let filtro = (t) => t
setCurrentFilter((t, f) => filtro(t, f))

let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

// 1) a tela de verdade
const p0 = problemas()
ok(p0.length === 0, `a tela real está no esqueleto (${p0.join(' | ') || 'sem problemas'})`)

// 2) o texto do botão, puro: a seta continua no fim, em qualquer língua
{
  const box = { exports: {} }
  const js = ts.transpileModule(atual(LIB).replace(/import \{ REGRAS_DO_ANUNCIO \}[^\n]*\n/, 'const REGRAS_DO_ANUNCIO = []\n'), { compilerOptions: { module: 1, target: 7 } }).outputText
  new Function('exports', 'module', js)(box.exports, box)
  const r = box.exports.rotuloDoBotaoImagem
  ok(r('Generate image →', '2 cr', true) === 'Generate image · 2 cr →', 'texto com seta: preço antes da seta')
  ok(r('إنشاء الصورة ←', '5 cr', true) === 'إنشاء الصورة · 5 cr ←', 'língua da direita para a esquerda: a seta dela continua no fim')
  ok(r('Describe your image first', '2 cr', true) === 'Describe your image first · 2 cr', 'texto sem seta: preço no fim')
  ok(r('Creating…', '2 cr', false) === 'Creating…', 'gerando: sem preço')
}

// 3) as três línguas do render offline: nada quebra e o preço é o mesmo
{
  const fx = { galleryLoading: false, prompt: 'My original story' }
  const en = semEstilo(renderPage(PAGE, false, { ...fx, interfaceLanguage: 'en' }))
  for (const language of ['es', 'hi', 'pt']) {
    const html = semEstilo(renderPage(PAGE, false, { ...fx, interfaceLanguage: language }))
    ok(!html.includes('undefined') && html.includes('My original story'), `${language}: sem rótulo faltando, texto da pessoa intacto`)
    ok(JSON.stringify(html.match(PRECO)) === JSON.stringify(en.match(PRECO)), `${language}: o mesmo preço, só no botão`)
  }
  const es = semEstilo(renderPage(PAGE, false, { galleryLoading: false, interfaceLanguage: 'es' }))
  ok(es.includes('Primero describe tu imagen · 2 cr'), 'es: botão traduzido com o preço')
}

// 4) mutantes: cada defeito passa pelo mesmo render e tem de ficar vermelho
const mut = (rel, fn) => (t, f) => (f === rel ? fn(lf(t)) : t)
const trocar = (de, para) => (t) => {
  if (t.split(de).length !== 2) throw new Error('âncora do mutante não achada: ' + de.slice(0, 60))
  return t.replace(de, () => para)
}
const moverAntes = (inicio, fim, antesDe) => (t) => {
  const a = t.indexOf(inicio)
  const b = t.indexOf(fim, a)
  if (a < 0 || b < 0) throw new Error('âncora do mutante não achada: ' + inicio.slice(0, 60))
  const bloco = t.slice(a, b + fim.length)
  const resto = t.slice(0, a) + t.slice(b + fim.length)
  const c = resto.indexOf(antesDe)
  if (c < 0) throw new Error('âncora do mutante não achada: ' + antesDe.slice(0, 60))
  return resto.slice(0, c) + bloco + resto.slice(c)
}
const CAIXA = '<div className="card creation-input" data-kineo="images-caixa">'
const MUTANTES = [
  ['motor de volta antes da caixa', 'A1', mut(PAGE, moverAntes('      <fieldset className="image-engine-picker">', '</fieldset>\n', CAIXA))],
  ['Settings aberto de fábrica', 'B2', mut(PAGE, trocar('<details className="ace-more" data-kineo="images-mais-opcoes">', '<details open className="ace-more" data-kineo="images-mais-opcoes">'))],
  ['formato fora do Settings', 'B3', mut(PAGE, moverAntes('          <div className="card">\n            <div className="lab"><UiLabel>Format</UiLabel>', '            </div>\n          </div>\n', '<details className="ace-more"'))],
  ['um motor a menos na lista', 'B5', mut(PAGE, trocar('{IMG_ENGINES.map((engine) => (', "{IMG_ENGINES.filter((e) => e.key !== 'grok').map((engine) => ("))],
  ['preço de volta em cada motor', 'C1', mut(PAGE, trocar('<span className="image-engine-name">{engine.name}</span>', '<span className="image-engine-name">{engine.name}</span><span>{engine.credits}</span>'))],
  ['botão sem preço', 'C2', mut(PAGE, trocar('eng.credits, !busy && !refsUploading && !needsConsent)', 'eng.credits, false)'))],
  ['vitrine mostrando preço', 'C8', mut(PAGE, trocar("<ProductStage name={ui('Made on Kineo')}", "<ProductStage meta={eng.credits} name={ui('Made on Kineo')}"))],
  ['atalho do celular com preço', 'C9', mut(PAGE, trocar("cost={ui('Your image')}", 'cost={`${eng.name} · ${eng.credits}`}'))],
  ['galeria acima da caixa', 'D1', mut(PAGE, moverAntes('<div className="grid creation-grid">', '</div>\n</div>\n', '<div className="kps-panel">'))],
  ['vitrine para quem já tem imagens', 'D2', mut(PAGE, trocar('const mostraVitrine = !galleryLoading && items.length === 0 && !premiere', 'const mostraVitrine = !galleryLoading && !premiere'))],
  ['vitrine piscando na leitura', 'D5', mut(PAGE, trocar('const mostraVitrine = !galleryLoading && items.length === 0 && !premiere', 'const mostraVitrine = items.length === 0 && !premiere'))],
  ['palco de volta acima da caixa no celular', 'D7', mut(LIB, trocar('position:relative;top:auto;order:0', 'position:relative;top:auto'))],
  ['botão com outra cor', 'E1', mut(LIB, trocar('background:var(--accent,#0A5CFF);color:#fff', 'background:var(--card2);color:#fff'))],
  ['corpo do pedido mudado', 'F1', mut(PAGE, trocar('prompt: prompt.trim(), model, size,', "prompt: prompt.trim(), model: 'schnell', size,"))],
  ['motor padrão trocado', 'F2', mut(PAGE, trocar("useState<ImgModelKey>('dev')", "useState<ImgModelKey>('nanobanana')"))],
  ['efeito novo sem dependências', 'G1', mut(PAGE, trocar("  useProductStage('images')\n", "  useProductStage('images')\n  useEffect(() => { setMadeThisSession((n) => n + 1) })\n"))],
  ['efeito novo com dependência instável', 'G2', mut(PAGE, trocar("  useProductStage('images')\n", "  useProductStage('images')\n  useEffect(() => { setBalance(0) }, [items])\n"))],
]
for (const [nome, codigo, m] of MUTANTES) {
  filtro = m
  let achou
  try { achou = problemas().filter((x) => x.startsWith(codigo)) } catch (e) { achou = [] ; console.log('    erro no mutante:', e.message.slice(0, 160)) }
  filtro = (t) => t
  ok(achou.length > 0, `mutante "${nome}" fica vermelho (${codigo})`)
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)

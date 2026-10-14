// KINEO-ADS-FONTE-STUDIO-1410 — guardião (só readFileSync + git): o Studio Ads fala a tipografia do Studio de filmes.
//
// Fundador 14/10 ("vai"): "a nossa fonte do Make Films … trazer tudo para dentro do Ads". Medido no navegador: a família
// já era a mesma (Manrope por var(--font-display)); o que deixava o Ads "cru" era peso, tracking, raio e cartão. O bloco
// ADS_FONTE_STUDIO_CSS (AdsV2Client.tsx) aplica os tokens do /studio sob .stu.adv2, por último e por dangerouslySetInnerHTML.
//
// O que este guardião prova:
//   A. o bloco existe, tem os tokens do Studio (família, pesos, tracking, raios) e é injetado DEPOIS dos outros estilos;
//   B. título, títulos de passo, rótulos, chip numerado, cartão de revisão e o botão principal ("Gerar · N créditos")
//      usam var(--font-display) pelos tokens (amarrado à variável, não a contagem de texto);
//   C. os tokens batem com o kit do Studio (components/studioKit.tsx, lib/ui/workspacePresentation.ts, app/appearance.css);
//   D. nada de lib/ads/* mudou em relação a origin/main (git diff vazio) — o dinheiro e o plano não foram tocados;
//   E. o modo completo (AdsV2Session em diante) não ganhou o bloco (a impressão digital Z1 do test-ads-modo-simples segue).
// Mutantes (2): tirar a família do título de passo; injetar o bloco ANTES do tema do assistente. Os dois ficam vermelhos.
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let falhas = 0
const ok = (cond, msg) => { if (cond) console.log('  ok  ', msg); else { falhas++; console.log('  FALHOU', msg) } }

const CLIENT = 'app/(dashboard)/ads/v2/AdsV2Client.tsx'
const src = read(CLIENT)
const kit = read('components/studioKit.tsx')
const ws = read('lib/ui/workspacePresentation.ts')
const appearance = read('app/appearance.css')

/** O texto do bloco CSS novo (entre as crases da constante). */
function bloco(s) {
  const m = s.match(/const ADS_FONTE_STUDIO_CSS = `([\s\S]*?)`/)
  return m ? m[1] : null
}
/** Mapa token → valor declarado em .stu.adv2{…}. */
function tokens(css) {
  const m = css && css.match(/^\.stu\.adv2\{([^}]*)\}/m)
  if (!m) return null
  return Object.fromEntries(m[1].split(';').filter(Boolean).map((d) => { const i = d.indexOf(':'); return [d.slice(0, i).trim(), d.slice(i + 1).trim()] }))
}
/** Declarações da regra cujo seletor é EXATAMENTE `sel` (linha inteira, não prefixo). */
function regra(css, sel) {
  const linha = css.split('\n').find((l) => l.startsWith(sel + '{'))
  return linha ? linha.slice(sel.length + 1, linha.lastIndexOf('}')) : null
}
const usaDisplay = (decl) => !!decl && /(^|;)font-family:var\(--adv2-display\)(;|$)/.test(decl)

function avaliar(s) {
  const css = bloco(s)
  const t = tokens(css)
  const r = {}
  r.A1 = !!css && !!t
  r.A2 = !!t && t['--adv2-display'] === 'var(--font-display),var(--font-inter),sans-serif'
  // A3: injetado por dangerouslySetInnerHTML, DEPOIS do tema do assistente, do ADS_V2_CSS e do ADS_FLOW_CSS (o último vence).
  const iFonte = s.indexOf('<style dangerouslySetInnerHTML={{ __html: ADS_FONTE_STUDIO_CSS }} />')
  const iTema = s.indexOf('<style dangerouslySetInnerHTML={{ __html: ADS_WIZARD_THEME_CSS + ADS_V2_CSS + ADS_V2_VARIATIONS_CSS }} />')
  const iFlow = s.indexOf('<style dangerouslySetInnerHTML={{ __html: ADS_FLOW_CSS }} />')
  r.A3 = iFonte > 0 && iTema > 0 && iFlow > 0 && iFonte > iTema && iFonte > iFlow
  r.A4 = !/<style>\s*\{\s*ADS_FONTE_STUDIO_CSS/.test(s) // nunca como filho de <style> (">" quebra a hidratação)
  if (!css) return r
  // B. cada peça usa a família de display pelos tokens
  const h1 = regra(css, '.stu.adv2 .adsw-header h1')
  r.B1 = usaDisplay(h1) && /font-weight:var\(--adv2-title-w\)/.test(h1) && /letter-spacing:var\(--adv2-title-ls\)/.test(h1)
  const h2 = regra(css, '.stu.adv2 :is(.adv2-card,.adv2-confirm,.adv2b-upsell) h2')
  r.B2 = usaDisplay(h2) && /font-weight:var\(--adv2-step-w\)/.test(h2) && /letter-spacing:var\(--adv2-step-ls\)/.test(h2)
  const lab = regra(css, '.stu.adv2 :is(.adv2-card h3,.kst-pick h3,.adv2f-read h3,.adv2b-row h3,.adv2s-after h3,.adv2f-scripts legend,.adv2f-link label,.adv2s-more summary,.adv2-guide>summary)')
  r.B3 = usaDisplay(lab) && /font-weight:var\(--adv2-label-w\)/.test(lab)
  r.B4 = usaDisplay(regra(css, '.stu.adv2 .adv2-num')) && /border-radius:6px/.test(regra(css, '.stu.adv2 .adv2-num'))
  r.B5 = usaDisplay(regra(css, '.stu.adv2 .adv2s-steps button')) && usaDisplay(regra(css, '.stu.adv2 .adv2f-tabs a'))
  const sum = regra(css, '.stu.adv2 .adv2f-sum')
  r.B6 = !!sum && /border-radius:var\(--adv2-r-box\)/.test(sum) && /background:var\(--ads-soft\)/.test(sum) && usaDisplay(regra(css, '.stu.adv2 .adv2f-sum dt')) && usaDisplay(regra(css, '.stu.adv2 .adv2f-sum dd'))
  const btn = regra(css, '.stu.adv2 .adsw-btn')
  const go = regra(css, '.stu.adv2 .adsw-btn:not(.ghost):not(.small)')
  r.B7 = usaDisplay(btn) && /font-weight:var\(--adv2-name-w\)/.test(btn) && /border-radius:var\(--adv2-r-ctl\)/.test(btn) && !!go && /min-height:48px/.test(go) && /font-size:15px/.test(go) && /box-shadow:var\(--sh-cta\)/.test(go)
  // o botão "Gerar · N créditos" da revisão É um .adsw-btn primário (sem ghost/small) dentro de .adv2-actions — a regra B7 o alcança
  const simple = read('app/(dashboard)/ads/v2/AdsV2Simple.tsx')
  r.B8 = /<button ref=\{makeRef\} type="button" className="adsw-btn" disabled=/.test(simple) && /const goLabel = shownCost === null \? ux\.preview\.chooseLevel : scopy \? scopy\.make : fill\(fc\.review\.go, \{ c: shownCost \}\)/.test(simple)
  // C. os valores são os do Studio
  r.C1 = t['--adv2-title-w'] === 'var(--type-title-weight,500)' && /--type-title-weight:\s*500/.test(read('app/globals.css'))
  r.C2 = t['--adv2-title-ls'] === '-.035em' && appearance.includes('html .stu h1{font-size:clamp(28px,2.5vw,34px);letter-spacing:-.035em;')
  r.C3 = t['--adv2-label-w'] === '650' && appearance.includes('html .stu .lab{margin-bottom:12px;font-weight:650}') && t['--adv2-label-ls'] === '.01em' && ws.includes('.stu .lab { color:var(--text2); letter-spacing:.01em;')
  r.C4 = t['--adv2-name-w'] === '700' && t['--adv2-name-ls'] === '-.01em' && kit.includes('.stu .mdlname b{font-size:17px;font-weight:700;letter-spacing:-.01em;font-family:var(--font-display)')
  r.C5 = t['--adv2-r-card'] === '16px' && t['--adv2-r-ctl'] === '12px' && t['--adv2-r-pill'] === '10px' && t['--adv2-r-box'] === '14px' &&
    kit.includes('.stu .mdlbtn{width:100%;text-align:left;padding:14px 16px;border-radius:16px;') && appearance.includes('html .stu .go{border-radius:12px;min-height:48px;box-shadow:var(--sh-cta)}') &&
    appearance.includes('html .stu .pill{border-radius:10px;') && appearance.includes('html .stu .cost{border-color:var(--border);border-radius:14px}')
  return r
}

console.log('\nA–C. o bloco de tipografia do Studio no Ads')
const r = avaliar(src)
const NOMES = {
  A1: 'A1 ADS_FONTE_STUDIO_CSS existe e declara os tokens em .stu.adv2{…}',
  A2: 'A2 --adv2-display = var(--font-display),var(--font-inter),sans-serif (a família do Studio)',
  A3: 'A3 injetado por dangerouslySetInnerHTML DEPOIS do tema do assistente e do ADS_FLOW_CSS',
  A4: 'A4 nunca como filho de <style> (">" no seletor quebra a hidratação)',
  B1: 'B1 título da página: display + peso/tracking do título do Studio',
  B2: 'B2 títulos de passo (h2 dos cartões): display + peso/tracking de passo',
  B3: 'B3 rótulos (h3, "Style", legenda dos roteiros, "Paste your product link"): display + peso de rótulo',
  B4: 'B4 chip numerado: display + quadrado de raio 6 (o .lab .n do Studio)',
  B5: 'B5 passo a passo e abas: display',
  B6: 'B6 cartão de revisão: raio 14, fundo --ads-soft (= --card2), dt/dd em display',
  B7: 'B7 botões em display 700; o principal = .go do Studio (48px, 15px, sombra --sh-cta)',
  B8: 'B8 o "Gerar · N créditos" da revisão é um .adsw-btn primário (alcançado pela regra B7)',
  C1: 'C1 peso do título = --type-title-weight (500 em globals.css), como o h1 do /studio',
  C2: 'C2 tracking do título -.035em = appearance.css (html .stu h1)',
  C3: 'C3 rótulo 650 / +.01em = appearance.css + workspacePresentation (.lab)',
  C4: 'C4 nome em destaque 700 / -.01em = studioKit (.mdlname b)',
  C5: 'C5 raios 16/12/10/14 = .mdlbtn / .go / .pill / .cost do Studio',
}
for (const k of Object.keys(NOMES)) ok(r[k] === true, NOMES[k])

console.log('\nD. lib/ads intocado')
let diff = null
try {
  // reancorado KINEO-ADS-CONSERTOS-1410 — a trava media "lib/ads igual à origin/main": fica vermelha em QUALQUER leva seguinte que
  // mexa em lib/ads (os consertos de servidor de 14/10) e verde depois do merge, sem provar nada. Agora mede o que ELA promete: o
  // commit da tipografia (6a7ab326) contra o PAI dele não toca lib/ads. Commit ausente = diff null = vermelho.
  const LEVA = '6a7ab326b44062a493e9c845b77dbac6474db28c'
  execFileSync('git', ['-C', RAIZ, 'rev-parse', '--verify', '-q', `${LEVA}^{commit}`], { stdio: 'ignore' })
  diff = execFileSync('git', ['-C', RAIZ, 'diff', '--name-only', `${LEVA}^`, LEVA, '--', 'lib/ads'], { encoding: 'utf8' }).trim()
} catch {
  diff = null
}
ok(diff === '', `D1 o commit da tipografia (6a7ab326) não mexeu em nenhum arquivo de lib/ads/* (contra o pai dele)${diff ? ` (difere: ${diff.split('\n').join(', ')})` : ''}`)

console.log('\nE. o modo completo não ganhou o bloco')
const iSessao = src.indexOf('function AdsV2Session(')
ok(iSessao > 0 && src.indexOf('ADS_FONTE_STUDIO_CSS') < iSessao && src.lastIndexOf('ADS_FONTE_STUDIO_CSS') < iSessao, 'E1 ADS_FONTE_STUDIO_CSS só aparece ANTES de function AdsV2Session( (a impressão Z1 do modo completo não muda)')

console.log('\nM. mutantes (precisam ficar vermelhos)')
const trocar = (s, a, b) => { if (!s.includes(a)) throw Error('mutante não aplicou: ' + a.slice(0, 60)); return s.split(a).join(b) }
const m1 = trocar(src, '.stu.adv2 :is(.adv2-card,.adv2-confirm,.adv2b-upsell) h2{display:flex;align-items:center;gap:10px;font-family:var(--adv2-display);', '.stu.adv2 :is(.adv2-card,.adv2-confirm,.adv2b-upsell) h2{display:flex;align-items:center;gap:10px;font-family:inherit;')
ok(avaliar(m1).B2 === false, 'M1 título de passo sem a família de display → B2 vermelho')
const linhaStyle = '      <style dangerouslySetInnerHTML={{ __html: ADS_FONTE_STUDIO_CSS }} />'
const m2 = trocar(trocar(src, linhaStyle, ''), '      <style dangerouslySetInnerHTML={{ __html: STUDIO_KIT_CSS }} />', '      <style dangerouslySetInnerHTML={{ __html: STUDIO_KIT_CSS }} />\n' + linhaStyle)
ok(avaliar(m2).A3 === false, 'M2 bloco injetado ANTES do tema do assistente → A3 vermelho')

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO VERDE')
process.exit(falhas ? 1 : 0)

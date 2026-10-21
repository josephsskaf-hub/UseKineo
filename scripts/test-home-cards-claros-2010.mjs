// KINEO-HOME-CARDS-CLAROS-2010 — guardião da "parte de baixo dos vídeos clara e nítida" nos 4 cards da home.
// Fundador 20/10 23:30: "a parte de baixo dos vídeos tá bem escura, arruma isso pra hoje". A v1 (véu mais leve + vidro fosco) virou
// mancha — fundador 21/10: "ainda está com problema na parte de baixo, parece uma sombra". v2: o vidro fosco SAIU, sobra um degradê curto
// e leve atrás do texto, a leitura vem da sombra do próprio texto, e o letreiro queimado do vídeo é tirado do caminho do título pelo
// ENQUADRAMENTO (object-position/zoom de cada card), não por desfoque. CSS em components/home/HomeThreeCards.tsx (o 4º card usa as classes).
//
// O QUE ELE PROVA (lendo o arquivo real e calculando a partir do CSS de verdade):
//   A1 valores novos: degradê transparente até 62%, .28 a 80%, .50 a 100%; .k3c-glass{display:none}; nenhum backdrop-filter nos cards
//      fora o selo; título E linha com a sombra 0 1px 3px .45 + 0 2px 18px .55;
//   A2 os valores de antes (original e v1) sumiram: .55/.88 da sombra, vidro .5/.72 e .12/.30/.46, blur(18px) saturate(1.15);
//   A3 o preto no rodapé ≤ .50, zero até 62% da altura e, de 60% para baixo, sempre menor que o original;
//   A4 enquadramento anti-letreiro: farol e LUME com zoom de cima (o quadro termina ≤ 69% do vídeo em 3:4 e 5:6 — o letreiro de baixo
//      a ~70% sai); desenho a 70% (3:4) e 100% no celular (5:6): o letreiro (~55–62% do vídeo) termina acima de 62% do card; o zoom no
//      hover continua (regra :hover própria);
//   D1 desfeita a camada (scripts/test-support/desfaz-home-cards-claros-2010.mjs), cada arquivo tocado é EXATAMENTE a base; os novos existem;
//   D2 toda linha nova traz a marca; o diff só toca a lista e os novos; vídeos, curadoria (lib/engineWall.ts, lib/homeVideoCuration.ts),
//      enquadramento antigo e 4º card (lib/ui/homeKidsCard.ts) intocados;
//   D3 encadeamento: semBebeQueFala2010 (que a cabeça semMenuUgc2010 chama primeiro) tira esta camada PRIMEIRO;
//   M* mutantes: cada conserto desfeito à mão deixa o guardião certo vermelho.
import { semPaginasConector2110, PAGINAS_CONECTOR_2110_ARQUIVOS, PAGINAS_CONECTOR_2110_NOVOS, MARCA_PAGINAS_CONECTOR_2110 } from './test-support/desfaz-paginas-conector-2110.mjs' // KINEO-PAGINAS-CONECTOR-2110
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import {
  semHomeCardsClaros2010, desfazHomeCardsClaros2010, MARCA_HOME_CARDS_CLAROS_2010 as MARCA, HOME_CARDS_CLAROS_2010_BASE as B,
  HOME_CARDS_CLAROS_2010_ARQUIVOS, HOME_CARDS_CLAROS_2010_NOVOS, TROCAS_HOME_CARDS_CLAROS_2010, ACRESCIMOS_HOME_CARDS_CLAROS_2010,
} from './test-support/desfaz-home-cards-claros-2010.mjs'
import { semBebeQueFala2010 } from './test-support/desfaz-bebe-que-fala-2010.mjs'
import { semMenuUgc2010 } from './test-support/desfaz-menu-ugc-2010.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const lf = (s) => s.replace(/\r\n/g, '\n')
const rd = (p) => lf(readFileSync(join(ROOT, p), 'utf8'))
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (p) => { try { return lf(git('show', `${B}:${p}`)) } catch { return null } }
const F = { three: 'components/home/HomeThreeCards.tsx', bebe: 'scripts/test-support/desfaz-bebe-que-fala-2010.mjs' }

let falhas = 0, oks = 0
const ok = (cond, msg) => { if (cond) { oks++; console.log(`  ok   ${msg}`) } else { falhas++; console.log(`  FALHA ${msg}`) } }
const tenta = (fn) => { try { return fn() } catch (e) { return [`erro: ${e.message}`] } }

// ─── leitura do CSS real ─────────────────────────────────────────────────────
function css(src) {
  const m = src.match(/export const HOME_THREE_CARDS_CSS = `([\s\S]*?)`\n/)
  if (!m) throw Error('HOME_THREE_CARDS_CSS ausente')
  return m[1]
}
function regra(cssText, sel) {
  const i = cssText.indexOf(`\n${sel}{`)
  if (i < 0) throw Error(`regra ${sel} ausente`)
  return cssText.slice(i + 1, cssText.indexOf('}', i) + 1)
}
/** Paradas [posição 0–1, alfa] do 1º linear-gradient do background da regra. */
function paradas(r) {
  const g = r.match(/background:linear-gradient\(180deg,(.*)\)\}/)
  if (!g) throw Error('gradiente ausente')
  return [...g[1].matchAll(/rgba\(\d+,\d+,\d+,([\d.]+)\) (\d+)%/g)].map((x) => [Number(x[2]) / 100, Number(x[1])])
}
const alfa = (st, y) => {
  if (y <= st[0][0]) return st[0][1]
  for (let i = 1; i < st.length; i++) if (y <= st[i][0]) { const [p0, a0] = st[i - 1], [p1, a1] = st[i]; return a0 + (a1 - a0) * (y - p0) / (p1 - p0) }
  return st[st.length - 1][1]
}
/** Preto somado (sombra ∘ vidro, se o vidro existir) a y (0–1) da altura do card. */
function veu(src) {
  const c = css(src)
  const shade = regra(c, '.k3c-shade'), glass = regra(c, '.k3c-glass')
  const sS = paradas(shade)
  const semVidro = glass === '.k3c-glass{display:none}'
  let preto = (y) => alfa(sS, y)
  if (!semVidro) {
    const h = Number((glass.match(/height:(\d+)%/) || [])[1]) / 100
    const maskFim = Number((glass.match(/mask-image:linear-gradient\(180deg,transparent 0%,#000 (\d+)%\)/) || [])[1]) / 100
    const sG = paradas(glass), topo = 1 - h
    preto = (y) => { const aS = alfa(sS, y); if (y < topo) return aS; const yy = (y - topo) / h; return 1 - (1 - aS) * (1 - alfa(sG, yy) * Math.min(1, yy / maskFim)) }
  }
  return { c, shade, glass, semVidro, preto }
}
/** Janela do vídeo 9:16 (0–1 da altura do vídeo) que aparece num card de proporção w:h com object-position p% e zoom s de cima. */
function janela(cardW, cardH, pos, s = 1) {
  const vis = (cardH / cardW) / (16 / 9) // fração da altura do vídeo que cabe (cover pela largura)
  const ini = (1 - vis) * pos
  return [ini, ini + vis / s]
}
const SOMBRA = 'text-shadow:0 1px 3px rgba(0,0,0,.45),0 2px 18px rgba(0,0,0,.55)}'

function cssProblems(src = rd(F.three)) {
  const p = []
  const v = veu(src)
  if (!v.shade.includes('background:linear-gradient(180deg,rgba(5,7,11,.3) 0%,rgba(5,7,11,0) 16%,rgba(5,7,11,0) 62%,rgba(5,7,11,.28) 80%,rgba(5,7,11,.5) 100%)')) p.push('A1 degradê sem os valores novos')
  if (!v.semVidro) p.push('A1 o vidro fosco ainda está ligado')
  const blurs = (v.c.match(/backdrop-filter:blur\(/g) || []).length
  if (blurs !== 2 || !/\n\.k3c-badge\{[^}]*-webkit-backdrop-filter:blur\(10px\);backdrop-filter:blur\(10px\)\}/.test(v.c)) p.push(`A1 backdrop-filter fora do selo (${blurs})`)
  if (!new RegExp('\\n\\.k3c-title\\{margin:0[^}]*' + SOMBRA.replace(/[().,]/g, (x) => '\\' + x)).test(v.c)) p.push('A1 título sem a sombra forte')
  if (!new RegExp('\\n\\.k3c-sub\\{margin:0[^}]*' + SOMBRA.replace(/[().,]/g, (x) => '\\' + x)).test(v.c)) p.push('A1 linha sem a sombra forte')
  if (/rgba\(5,7,11,\.55\) 68%|rgba\(5,7,11,\.88\) 100%|rgba\(6,8,13,\.72\)|rgba\(6,8,13,\.46\)|blur\(18px\) saturate\(1\.15\)/.test(v.c)) p.push('A2 valor de antes ainda no CSS')
  if (v.preto(1) > 0.5) p.push(`A3 rodapé com ${v.preto(1).toFixed(2)} de preto (> .50)`)
  for (let y = 0.17; y <= 0.62; y += 0.01) if (v.preto(y) > 0.001) { p.push(`A3 preto a ${(y * 100).toFixed(0)}% (${v.preto(y).toFixed(2)})`); break }
  const antes = veu(base(F.three))
  for (let y = 0.6; y <= 1.0001; y += 0.02) if (!(v.preto(y) < antes.preto(y))) { p.push(`A3 a ${(y * 100).toFixed(0)}% não ficou mais claro`); break }
  // A4 enquadramento anti-letreiro
  const zoom = (card, extra = '') => {
    const m = v.c.match(new RegExp('\\n\\.k3c-card\\[data-home-card="' + card + '"\\] \\.k3c-media video' + extra + '\\{object-position:50% (\\d+)% !important;transform-origin:50% 0;transform:scale\\(([\\d.]+)\\)\\}'))
    return m ? [Number(m[1]) / 100, Number(m[2])] : null
  }
  for (const [card, extra] of [['films', ''], ['product_ads', ':not\\(\\[data-trio\\]\\)']]) {
    const z = zoom(card, extra)
    if (!z) { p.push(`A4 ${card} sem o zoom de cima`); continue }
    for (const [w, h, nome] of [[3, 4, '3:4'], [5, 6, '5:6']]) { const [, fim] = janela(w, h, z[0], z[1]); if (fim > 0.69) p.push(`A4 ${card} ${nome}: o quadro vai até ${(fim * 100).toFixed(1)}% do vídeo (letreiro de baixo a ~70% aparece)`) }
    const hov = v.c.match(new RegExp('\\n\\.k3c-card\\[data-home-card="' + card + '"\\]:hover \\.k3c-media video' + extra + '\\{transform:scale\\(([\\d.]+)\\)\\}'))
    if (!hov || !(Number(hov[1]) > z[1])) p.push(`A4 ${card} perdeu o zoom do hover`)
  }
  const kDesk = v.c.match(/\n\.k3c-card\[data-home-card="kids_cartoon"\] \.k3c-media video\{object-position:50% (\d+)% !important\}/)
  const kCel = v.c.match(/\n@media \(max-width:760px\)\{\.k3c-card\[data-home-card="kids_cartoon"\] \.k3c-media video\{object-position:50% (\d+)% !important\}\}/)
  const fimLetreiro = (w, h, pos) => { const [ini, fim] = janela(w, h, pos); return (0.62 - ini) / (fim - ini) } // fim do letreiro (62% do vídeo) em fração do card
  if (!kDesk || fimLetreiro(3, 4, Number(kDesk[1]) / 100) > 0.62) p.push(`A4 desenho no computador: o letreiro desce até ${kDesk ? (fimLetreiro(3, 4, Number(kDesk[1]) / 100) * 100).toFixed(0) : '?'}% do card (título a ~65%)`)
  if (!kCel || fimLetreiro(5, 6, Number(kCel[1]) / 100) > 0.5) p.push(`A4 desenho no celular: o letreiro desce até ${kCel ? (fimLetreiro(5, 6, Number(kCel[1]) / 100) * 100).toFixed(0) : '?'}% do card (título a ~58%)`)
  return p
}

console.log('A. o véu de baixo e o enquadramento, calculados do CSS real')
{
  const v = veu(rd(F.three)), a = veu(base(F.three))
  console.log(`  (preto no rodapé ${a.preto(1).toFixed(2)} → ${v.preto(1).toFixed(2)}; a 80%: ${a.preto(0.8).toFixed(2)} → ${v.preto(0.8).toFixed(2)}; a 70%: ${a.preto(0.7).toFixed(2)} → ${v.preto(0.7).toFixed(2)}; vidro fosco: ${a.semVidro ? 'não' : 'sim'} → ${v.semVidro ? 'não' : 'sim'})`)
  const p = tenta(() => cssProblems())
  ok(p.length === 0, `A1–A4 degradê curto e leve, sem vidro fosco, sombra forte no título e na linha, rodapé ≤ .50 e mais claro, letreiros fora do caminho do título (${p.join('; ') || 'ok'})`)
}

console.log('\nD. desfaz exato, diff, encadeamento')
{
  const difs = []
  for (const f of HOME_CARDS_CLAROS_2010_ARQUIVOS) {
    const b = base(f)
    if (b === null) { difs.push(`${f}: fora da base`); continue }
    try { if (lf(semHomeCardsClaros2010(readFileSync(join(ROOT, f), 'utf8'), f)) !== b) difs.push(f) } catch (e) { difs.push(`${f}: ${e.message}`) }
  }
  const novos = HOME_CARDS_CLAROS_2010_NOVOS.every((f) => existsSync(join(ROOT, f)) && base(f) === null)
  ok(difs.length === 0 && novos, `D1 ${HOME_CARDS_CLAROS_2010_ARQUIVOS.length} arquivos tocados, desfeitos, = base ${B}; ${HOME_CARDS_CLAROS_2010_NOVOS.length} novos existem e não existiam (${difs.join('; ') || 'ok'})`)

  const TOPO = git('log', '--no-merges', '--format=%H', `--grep=${MARCA}`, '-1', 'HEAD').trim() || 'HEAD'
  const tocados = new Set([...git('diff', '--name-only', B, TOPO).trim().split('\n'), ...git('diff', '--name-only', 'HEAD').trim().split('\n'), ...git('ls-files', '--others', '--exclude-standard', 'scripts').trim().split('\n').filter((f) => f.includes('home-cards-claros-2010'))].filter(Boolean))
  const permitidos = new Set([...HOME_CARDS_CLAROS_2010_ARQUIVOS, ...HOME_CARDS_CLAROS_2010_NOVOS])
  const fora = [...tocados].filter((f) => !permitidos.has(f))
  const semMarca = HOME_CARDS_CLAROS_2010_ARQUIVOS.filter((f) => { const b = new Set(base(f).split('\n')); return !semPaginasConector2110(rd(f), f).split('\n').every((l) => b.has(l) || l.includes(MARCA)) }) // KINEO-PAGINAS-CONECTOR-2110
  const intocados = ['lib/engineWall.ts', 'lib/homeVideoCuration.ts', 'lib/ui/homeKidsCard.ts', 'components/home/HomeKidsCard.tsx', 'components/home/HomeProductAdsReel.tsx', 'lib/ui/homeThreeCards.ts'].filter((f) => existsSync(join(ROOT, f)) && rd(f) !== base(f))
  const trocasOk = Object.entries(TROCAS_HOME_CARDS_CLAROS_2010).every(([f, t]) => HOME_CARDS_CLAROS_2010_ARQUIVOS.includes(f) && t.every(([nova, velha]) => nova.includes(MARCA) && !velha.includes(MARCA)))
  ok(tocados.size > 0 && fora.length === 0 && semMarca.length === 0 && intocados.length === 0 && trocasOk && !/KINEO-BEBE|KINEO-HOME-CARDS-BOTOES|KINEO-HOME-REMODELA/.test(MARCA),
    `D2 o diff só toca a lista e os novos; toda linha nova com a marca; vídeos/curadoria/enquadramento/4º card intocados (${[...fora.map((f) => `fora: ${f}`), ...semMarca.map((f) => `sem marca: ${f}`), ...intocados.map((f) => `mexeu: ${f}`)].join('; ') || 'ok'})`)

  const cadeia = /export function semBebeQueFala2010\(texto, p\) \{\n  texto = semHomeCardsClaros2010\(texto, p\)/.test(rd(F.bebe))
  const igual = HOME_CARDS_CLAROS_2010_ARQUIVOS.every((f) => { const raw = readFileSync(join(ROOT, f), 'utf8'), semEste = semHomeCardsClaros2010(raw, f); return semBebeQueFala2010(raw, f) === semBebeQueFala2010(semEste, f) && semMenuUgc2010(raw, f) === semMenuUgc2010(semEste, f) })
  let lancou = false
  try { semHomeCardsClaros2010(rd(F.three) + `\n/* linha nova ${MARCA} */`, F.three) } catch { lancou = true }
  ok(cadeia && igual && lancou && semHomeCardsClaros2010('sem marca', F.three) === 'sem marca' && semHomeCardsClaros2010(rd(F.three), 'outro/arquivo.tsx') === rd(F.three) && desfazHomeCardsClaros2010(F.three, null) === null &&
    Object.values(ACRESCIMOS_HOME_CARDS_CLAROS_2010).every((n) => Number.isInteger(n) && n >= 0),
    'D3 encadeamento: semBebeQueFala2010 (e a cabeça semMenuUgc2010) tiram esta camada PRIMEIRO; idempotente fora da lista / sem a marca / null; acréscimo a mais lança')
}

console.log('\nM. mutantes (cada um precisa deixar o guardião certo vermelho)')
{
  const three = rd(F.three)
  const mut = (nome, de, para, alvo) => {
    const m = three.split(de).join(para)
    const p = tenta(() => cssProblems(m))
    ok(m !== three && p.some((x) => x.startsWith(alvo)), `${nome} → ${alvo} vermelho (${p.filter((x) => x.startsWith(alvo))[0] || 'NÃO pegou'})`)
  }
  mut('M1 degradê escuro de volta', 'rgba(5,7,11,.28) 80%,rgba(5,7,11,.5) 100%', 'rgba(5,7,11,.55) 80%,rgba(5,7,11,.88) 100%', 'A1')
  mut('M2 vidro fosco de volta (a v1)', '.k3c-glass{display:none}', '.k3c-glass{position:absolute;left:0;right:0;bottom:0;height:50%;z-index:1;pointer-events:none;-webkit-backdrop-filter:blur(18px) saturate(1.15);backdrop-filter:blur(18px) saturate(1.15);-webkit-mask-image:linear-gradient(180deg,transparent 0%,#000 18%);mask-image:linear-gradient(180deg,transparent 0%,#000 18%);background:linear-gradient(180deg,rgba(6,8,13,0) 0%,rgba(6,8,13,.12) 30%,rgba(6,8,13,.3) 82%,rgba(6,8,13,.46) 100%)}', 'A1')
  mut('M3 farol sem o zoom (letreiro de baixo volta atrás do botão)', 'transform-origin:50% 0;transform:scale(1.1)}', 'transform-origin:50% 0;transform:scale(1)}', 'A4')
  mut('M4 desenho no celular sem subir o letreiro', '@media (max-width:760px){.k3c-card[data-home-card="kids_cartoon"] .k3c-media video{object-position:50% 100% !important}}', '@media (max-width:760px){.k3c-card[data-home-card="kids_cartoon"] .k3c-media video{object-position:50% 70% !important}}', 'A4')
  mut('M5 linha sem a sombra forte', 'color:rgba(255,255,255,.88);text-shadow:0 1px 3px rgba(0,0,0,.45),0 2px 18px rgba(0,0,0,.55)}', 'color:rgba(255,255,255,.88)}', 'A1')
  mut('M6 degradê começando a 50% (laje de novo)', 'rgba(5,7,11,0) 62%', 'rgba(5,7,11,.2) 50%', 'A3')
  const semCadeia = rd(F.bebe).replace(/^  texto = semHomeCardsClaros2010\(texto, p\).*\n/m, '')
  ok(semCadeia !== rd(F.bebe) && !/export function semBebeQueFala2010\(texto, p\) \{\n  texto = semHomeCardsClaros2010\(texto, p\)/.test(semCadeia), 'M7 semBebeQueFala2010 sem chamar esta camada → D3 vermelho')
  let lancou = false
  try { semHomeCardsClaros2010(three.replace(/^.*\.k3c-glass\{display:none\}.*KINEO-HOME-CARDS-CLAROS-2010.*\n/m, ''), F.three) } catch { lancou = true }
  ok(lancou, 'M8 troca apagada à mão (conserto pela metade) → o desfaz lança → D1 vermelho')
}

console.log(falhas ? `\nVERMELHO: ${oks} ok, ${falhas} falha(s)` : `\nVERDE: ${oks} ok`)
process.exit(falhas ? 1 : 0)

// KINEO-HOME-CARDS-CLAROS-2010 — guardião da "parte de baixo dos vídeos mais clara" nos 4 cards da home.
// Fundador 20/10 23:30: "a parte de baixo dos vídeos tá bem escura, arruma isso pra hoje". O véu de baixo (.k3c-shade + .k3c-glass em
// components/home/HomeThreeCards.tsx, que o 4º card — components/home/HomeKidsCard.tsx — também usa) somava ~.97 de preto no rodapé.
//
// O QUE ELE PROVA (lendo o arquivo real e calculando o véu a partir do CSS de verdade):
//   A1 os valores novos estão no CSS (sombra .18 a 68% → .50 a 100%; vidro 50% de altura, tinta .12 → .30 → .46, blur 18px mantido) e o
//      título E a linha têm sombra de texto própria (a leitura não depende mais de uma laje escura);
//   A2 os valores escuros de antes sumiram (.55 a 68% / .88 a 100% / vidro .5 → .72);
//   A3 o preto somado (sombra ∘ vidro) no rodapé ≤ .75 e, de 60% para baixo, é SEMPRE menor que o de antes;
//   A4 o desfoque fica PLENO a ≤ 60% da altura do card — o letreiro queimado do vídeo (ex.: "SOUND UNDER THE" no desenho, a ~61–67%)
//      nunca fica meio nítido, meio cortado;
//   D1 desfeita a camada (scripts/test-support/desfaz-home-cards-claros-2010.mjs), cada arquivo tocado é EXATAMENTE a base; os novos existem;
//   D2 toda linha nova traz a marca; o diff só toca a lista e os novos; vídeos, curadoria (lib/engineWall.ts, lib/homeVideoCuration.ts),
//      enquadramento e 4º card (lib/ui/homeKidsCard.ts) intocados;
//   D3 encadeamento: semBebeQueFala2010 (que a cabeça semMenuUgc2010 chama primeiro) tira esta camada PRIMEIRO;
//   M* mutantes: cada conserto desfeito à mão deixa o guardião certo vermelho.
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
const alfa = (st, y) => { // y = 0–1 dentro do elemento
  if (y <= st[0][0]) return st[0][1]
  for (let i = 1; i < st.length; i++) if (y <= st[i][0]) { const [p0, a0] = st[i - 1], [p1, a1] = st[i]; return a0 + (a1 - a0) * (y - p0) / (p1 - p0) }
  return st[st.length - 1][1]
}
function veu(src) {
  const c = css(src)
  const shade = regra(c, '.k3c-shade'), glass = regra(c, '.k3c-glass')
  const h = Number((glass.match(/height:(\d+)%/) || [])[1]) / 100
  const maskFim = Number((glass.match(/mask-image:linear-gradient\(180deg,transparent 0%,#000 (\d+)%\)/) || [])[1]) / 100
  const blur = Number((glass.match(/[^-]backdrop-filter:blur\((\d+)px\)/) || [])[1])
  const sS = paradas(shade), sG = paradas(glass)
  const topo = 1 - h
  const preto = (y) => { // y = 0–1 da altura do card; vidro mascarado no topo dele
    const aS = alfa(sS, y)
    if (y < topo) return aS
    const yy = (y - topo) / h, m = Math.min(1, yy / maskFim)
    const aG = alfa(sG, yy) * m
    return 1 - (1 - aS) * (1 - aG)
  }
  return { c, shade, glass, h, maskFim, blur, blurPleno: topo + h * maskFim, preto }
}

function cssProblems(src = rd(F.three)) {
  const p = []
  const v = veu(src)
  if (!v.shade.includes('background:linear-gradient(180deg,rgba(5,7,11,.3) 0%,rgba(5,7,11,0) 16%,rgba(5,7,11,0) 52%,rgba(5,7,11,.18) 68%,rgba(5,7,11,.5) 100%)')) p.push('A1 sombra sem os valores novos')
  if (!v.glass.includes('background:linear-gradient(180deg,rgba(6,8,13,0) 0%,rgba(6,8,13,.12) 30%,rgba(6,8,13,.3) 82%,rgba(6,8,13,.46) 100%)')) p.push('A1 vidro sem a tinta nova')
  if (v.h !== 0.5 || v.blur !== 18 || !v.glass.includes('-webkit-backdrop-filter:blur(18px) saturate(1.15)')) p.push(`A1 vidro: altura ${v.h} / blur ${v.blur}`)
  if (!/\n\.k3c-title\{[^}]*text-shadow:0 1px 12px rgba\(0,0,0,\.45\)\}/.test(v.c)) p.push('A1 título sem a sombra .45')
  if (!/\n\.k3c-sub\{[^}]*text-shadow:0 1px 10px rgba\(0,0,0,\.45\)\}/.test(v.c)) p.push('A1 linha sem sombra de texto')
  if (/rgba\(5,7,11,\.55\) 68%|rgba\(5,7,11,\.88\) 100%|rgba\(6,8,13,\.5\) 45%|rgba\(6,8,13,\.72\) 100%/.test(v.c)) p.push('A2 valor escuro de antes ainda no CSS')
  if (v.preto(1) > 0.75) p.push(`A3 rodapé com ${v.preto(1).toFixed(2)} de preto (> .75)`)
  const antes = veu(base(F.three))
  for (let y = 0.6; y <= 1.0001; y += 0.02) if (!(v.preto(y) < antes.preto(y))) { p.push(`A3 a ${(y * 100).toFixed(0)}% não ficou mais claro (${v.preto(y).toFixed(2)} vs ${antes.preto(y).toFixed(2)})`); break }
  if (!(v.blurPleno <= 0.6)) p.push(`A4 desfoque pleno só a ${(v.blurPleno * 100).toFixed(1)}% (> 60%: letreiro meio nítido)`)
  return p
}

console.log('A. o véu de baixo, calculado do CSS real')
{
  const v = veu(rd(F.three)), a = veu(base(F.three))
  console.log(`  (preto no rodapé ${a.preto(1).toFixed(2)} → ${v.preto(1).toFixed(2)}; a 80%: ${a.preto(0.8).toFixed(2)} → ${v.preto(0.8).toFixed(2)}; desfoque pleno a ${(a.blurPleno * 100).toFixed(1)}% → ${(v.blurPleno * 100).toFixed(1)}%)`)
  const p = tenta(() => cssProblems())
  ok(p.length === 0, `A1–A4 valores novos, escuros fora, rodapé ≤ .75 e mais claro de 60% para baixo, desfoque pleno ≤ 60%, sombra no título e na linha (${p.join('; ') || 'ok'})`)
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
  const semMarca = HOME_CARDS_CLAROS_2010_ARQUIVOS.filter((f) => { const b = new Set(base(f).split('\n')); return !rd(f).split('\n').every((l) => b.has(l) || l.includes(MARCA)) })
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
  mut('M1 sombra escura de volta', 'rgba(5,7,11,.18) 68%,rgba(5,7,11,.5) 100%', 'rgba(5,7,11,.55) 68%,rgba(5,7,11,.88) 100%', 'A1')
  mut('M2 vidro escuro de volta', 'rgba(6,8,13,.12) 30%,rgba(6,8,13,.3) 82%,rgba(6,8,13,.46) 100%', 'rgba(6,8,13,.5) 45%,rgba(6,8,13,.72) 100%', 'A3')
  mut('M3 máscara do vidro a 38% (desfoque começa baixo)', '#000 18%);mask-image:linear-gradient(180deg,transparent 0%,#000 18%)', '#000 38%);mask-image:linear-gradient(180deg,transparent 0%,#000 38%)', 'A4')
  mut('M4 vidro com 38% de altura (letreiro meio nítido)', 'height:50%;z-index:1', 'height:38%;z-index:1', 'A4')
  mut('M5 linha sem sombra de texto', ';text-shadow:0 1px 10px rgba(0,0,0,.45)}', '}', 'A1')
  mut('M6 sombra do título de volta a .35', 'text-shadow:0 1px 12px rgba(0,0,0,.45)}', 'text-shadow:0 1px 12px rgba(0,0,0,.35)}', 'A1')
  const semCadeia = rd(F.bebe).replace(/^  texto = semHomeCardsClaros2010\(texto, p\).*\n/m, '')
  ok(semCadeia !== rd(F.bebe) && !/export function semBebeQueFala2010\(texto, p\) \{\n  texto = semHomeCardsClaros2010\(texto, p\)/.test(semCadeia), 'M7 semBebeQueFala2010 sem chamar esta camada → D3 vermelho')
  let lancou = false
  try { semHomeCardsClaros2010(three.replace(/^.*\.k3c-sub\{.*KINEO-HOME-CARDS-CLAROS-2010.*\n/m, ''), F.three) } catch { lancou = true }
  ok(lancou, 'M8 troca apagada à mão (conserto pela metade) → o desfaz lança → D1 vermelho')
}

console.log(falhas ? `\nVERMELHO: ${oks} ok, ${falhas} falha(s)` : `\nVERDE: ${oks} ok`)
process.exit(falhas ? 1 : 0)

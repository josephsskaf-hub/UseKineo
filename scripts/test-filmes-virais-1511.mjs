#!/usr/bin/env node
// KINEO-FILMES-VIRAIS-1511 — guardião (dono 15/11: "trocar os vídeos do menu Film pelos melhores filmes, alguns que viralizaram, como o do dia dos
// veteranos 11:11, e adicionar o número de likes e views como os líderes fazem").
//   F · o menu Film mostra EXATAMENTE os filmes de FILMES_DO_MENU, nessa ordem, todos produto 'film' e selo 'Narrated film'.
//   M · cada filme tem prévia (≤600 KB) e pôster em public/, e linha no registro de enquadramento.
//   N · cada filme tem número REAL: views, curtidas, fonte e link do post do MESMO vídeo, com a data da leitura.
//   C · o contador (components/create/ContagemSocial.tsx) está nos 3 lugares de cartão de criar e na home; sem número, não desenha nada.
//   X · mutantes: um filme sem número, a ordem trocada e um contador que inventa número são pegos.
// Offline, sem rede. Rodar: node scripts/test-filmes-virais-1511.mjs
import { readFileSync, statSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(RAIZ)
const lf = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const ESPERADO = ['filme-veteranos', 'filme-navio-mais-rapido', 'filme-viking-america', 'filme-escudo-da-siberia']

function checar(fontes = {}) {
  const load = createOfflineLoader({ source: (p, s) => { const k = Object.keys(fontes).find((f) => p.split(String.fromCharCode(92)).join('/').endsWith(f)); return k ? fontes[k] : s } })
  const L = load('lib/clipesNos2Lugares.ts'), S = load('lib/home/cardSocialStats.ts'), T = load('lib/create/tabs.ts')
  const out = []
  const c = (nome, ok) => out.push([nome, !!ok])
  c('F1 FILMES_DO_MENU é a lista combinada, nesta ordem', JSON.stringify(L.FILMES_DO_MENU) === JSON.stringify(ESPERADO))
  c('F2 o menu Film mostra só esses, na mesma ordem', JSON.stringify(T.CREATE_EXAMPLES.film.map((e) => e.id)) === JSON.stringify(ESPERADO))
  c('F3 todos são filme narrado da lista da vitrine', ESPERADO.every((id) => { const x = L.CLIPES_NOVOS.find((k) => k.id === id); return x && x.produto === 'film' && x.selo === 'Narrated film' && x.engine === null }))
  const enq = lf('lib/vitrineEnquadramento.ts')
  c('M1 prévia e pôster existem; prévia ≤600 KB', ESPERADO.every((id) => { const v = `public/previews/galeria/${id}.mp4`, p = `public/posters/galeria/${id}.webp`; return existsSync(v) && existsSync(p) && statSync(v).size <= 600 * 1024 }))
  c('M2 cada prévia tem linha no registro de enquadramento', ESPERADO.every((id) => enq.includes(`'/previews/galeria/${id}.mp4'`)))
  c('N1 cada filme tem views, curtidas, Instagram e link do post', ESPERADO.every((id) => { const s = S.CARD_SOCIAL_STATS[id]; return s && s.views > 0 && s.likes > 0 && s.source === 'Instagram' && /^https:\/\/www\.instagram\.com\/usekineo\/reel\/[\w-]+\/$/.test(s.url) && /^2026-\d\d-\d\d$/.test(s.checked) }))
  c('N2 o número sai do arquivo da prévia (a chave é o nome do vídeo)', S.cardStatFor('/previews/galeria/filme-veteranos.mp4')?.views === 63200 && S.cardStatFor('/previews/galeria/nao-existe.mp4') === null)
  c('N3 o formato é o dos líderes (63.2K, 3.5K, 353)', S.compactCount(63200) === '63.2K' && S.compactCount(3500) === '3.5K' && S.compactCount(353) === '353')
  return out
}

const casos = checar()
const comp = lf('components/create/ContagemSocial.tsx')
casos.push(
  ['C1 sem número, o contador não desenha nada', /const s = cardStatFor\(video \?\? undefined\)\s*\n\s*if \(!s\) return null/.test(comp)],
  ['C2 o contador está na caixa nova, no CreateShell, nos exemplos e na home', ['components/create/CaixaDeCriar.tsx', 'components/create/CreateShell.tsx', 'components/create/ProductExamples.tsx', 'components/home/HomeMosaic.tsx'].every((f) => lf(f).includes('<ContagemSocial video='))],
  ['C3 o leitor de tela ouve o número inteiro e a fonte', comp.includes("views${typeof s.likes === 'number' ?") && comp.includes('on ${s.source}')],
)
let falhas = 0
for (const [n, ok] of casos) { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${n}`); if (!ok) falhas++ }

const stats = lf('lib/home/cardSocialStats.ts'), lista = lf('lib/clipesNos2Lugares.ts')
const mutantes = [
  ['X1 um filme sem número', { 'lib/home/cardSocialStats.ts': stats.replace(/\n\s*'filme-viking-america': \{[^\n]*/, '') }, 'N1'],
  ['X2 a ordem trocada', { 'lib/clipesNos2Lugares.ts': lista.replace("['filme-veteranos', 'filme-navio-mais-rapido',", "['filme-navio-mais-rapido', 'filme-veteranos',") }, 'F1'],
  ['X3 número arredondado para cima', { 'lib/home/cardSocialStats.ts': stats.replace('views: 63_200', 'views: 70_000') }, 'N2'],
]
for (const [nome, fontes, alvo] of mutantes) {
  const r = checar(fontes).find(([n]) => n.startsWith(alvo))
  const pego = r && !r[1]
  console.log(`  ${pego ? 'ok  ' : 'FAIL'} ${nome} é pego por ${alvo}`)
  if (!pego) falhas++
}
console.log(`${casos.length + mutantes.length - falhas} ok, ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)

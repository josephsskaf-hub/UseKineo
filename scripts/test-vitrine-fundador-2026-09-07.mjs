#!/usr/bin/env node
// KINEO-VITRINE-FUNDADOR-2026-09-07 — guardião da vitrine: toda entrada nova
// (home + /examples) tem mídia LOCAL existente, nunca URL do fal (expira), e
// a trava de privacidade continua (só founder-owned, listas estáticas).
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const pe = readFileSync(join(RAIZ, 'lib/publicExamples.ts'), 'utf8')
const ew = readFileSync(join(RAIZ, 'lib/engineWall.ts'), 'utf8')
let ok = 0
const falhas = []
const checa = (n, c, d = '') => { if (c) { ok++; console.log(`  ok  ${n}`) } else { falhas.push(n); console.log(`  XX  ${n}${d ? ' — ' + d : ''}`) } }

console.log('\n== /examples: FOUNDER_SHOWCASE ==')
const bloco = pe.slice(pe.indexOf('export const FOUNDER_SHOWCASE'), pe.indexOf('] as const', pe.indexOf('export const FOUNDER_SHOWCASE')))
const entradas = [...bloco.matchAll(/id: '([0-9a-f-]{36})'.*?engine: '([a-z_0-9]+)'.*?previewPath: '([^']+)'.*?posterPath: '([^']+)'/g)]
checa('a lista tem 30 vídeos (pedido do fundador)', entradas.length === 30, `tem ${entradas.length}`)
checa('nenhum id repetido', new Set(entradas.map((e) => e[1])).size === entradas.length)
const motores = new Set(entradas.map((e) => e[2]))
checa('cobre os 6 motores cinematográficos', ['cinematic_hollywood', 'cinematic_omni', 'cinematic_h3', 'cinematic_veo', 'cinematic_kling', 'cinematic_ai'].every((m) => motores.has(m)))
let faltam = []
for (const [, id, , prev, poster] of entradas) {
  for (const p of [prev, poster]) {
    const f = join(RAIZ, 'public', p)
    if (!existsSync(f) || statSync(f).size < 5_000) faltam.push(p)
  }
}
checa('preview e poster existem em public/ para todos os 30 (> 5 KB)', faltam.length === 0, faltam.slice(0, 4).join(', '))
const tamanhos = entradas.map((e) => statSync(join(RAIZ, 'public', e[3])).size)
checa('nenhum preview do Explorar passa de 1,5 MB (grade com 30 vídeos tem que carregar)', tamanhos.every((t) => t < 1_500_000), `maior: ${Math.max(...tamanhos)}`)
checa('nada aponta para fal.media (URL que expira)', !/fal\.media/.test(bloco))
checa('cada entrada carrega ownershipEvidence founder_confirmed_owned', /SHOWCASE_OWNERSHIP = \{[\s\S]*?ownershipEvidence: 'founder_confirmed_owned'/.test(pe) && (bloco.match(/\.\.\.SHOWCASE_OWNERSHIP/g) || []).length === 30)

console.log('\n== home: hero novos ==')
const heroNovos = [...pe.matchAll(/KINEO-VITRINE-FUNDADOR-2026-09-07 — ([a-z_0-9]+):[\s\S]*?(?=\n  \{ \.\.\.FOUNDER_OWNERSHIP, id: '[0-9a-f-]{36}', title: '[^']*', engine: '\1', videoPath: '\/previews\/)/g)].length
const heroIds = [...pe.matchAll(/videoPath: '\/previews\/([0-9a-f-]{36})\.mp4' \},?\s*$/gm)].map((m) => m[1])
const novosHero = ['7efd12b8-925b-46d2-b68e-c6095cd3e92e', '94d551a3-fe7a-4903-8c2b-f252bed39c4c', '7579e8d7-97ff-4be7-91c9-fe11f6698a00', '1b8e12f9-83e5-411c-8fda-0b277d289934', 'ad6cb185-a0a2-46cf-a148-ea7503dfe6d3', 'b8c50f61-2843-41f3-a803-ac5a4bb509f5', '16742e11-a2fc-4e0a-a49a-2862e0ee36b0', 'f3de57b0-3486-4400-ba72-c9390774d426', 'fbc5d391-316f-4757-aa54-0565f698cb9f', 'fe055601-0668-4d33-be49-82c1cb033779', '692a6e98-6ed5-4c8d-8fa5-89ab21fbbcff']
checa('os 11 renders novos estão em PUBLIC_ENGINE_EXAMPLES', novosHero.every((id) => pe.includes(`id: '${id}'`)))
const semArquivo = novosHero.filter((id) => !existsSync(join(RAIZ, 'public/previews', `${id}.mp4`)))
checa('os 11 previews 500:280 existem em public/previews', semArquivo.length === 0, semArquivo.join(', '))
// os novos entram ANTES dos antigos do mesmo motor (o hero mostra os N primeiros)
const idx = (id) => pe.indexOf(`id: '${id}'`)
checa('Kling 3: o navio que evaporou vem antes do Maracaibo (antigo)', idx('7efd12b8-925b-46d2-b68e-c6095cd3e92e') < idx('4b12925e-16e6-4b56-af5a-7047f9ae7a28'))
checa('Omni: Halifax vem antes do robô do porto (antigo)', idx('7579e8d7-97ff-4be7-91c9-fe11f6698a00') < idx('36a04f7b-65f7-42d9-a2ab-198b5a7f115e'))
checa('H3: o Golfo vem antes do Shazam (antigo)', idx('ad6cb185-a0a2-46cf-a148-ea7503dfe6d3') < idx('8aabb05a-2492-48de-a96a-0a7875c0c8d3'))
checa('Veo: Cooper vem antes do domo de Runit (antigo)', idx('16742e11-a2fc-4e0a-a49a-2862e0ee36b0') < idx('9bbd5d98-33e5-423f-b9cb-82f7af6c67ba'))
checa('os antigos NÃO foram apagados (continuam disponíveis para /arena e lookups)', ['4b12925e-16e6-4b56-af5a-7047f9ae7a28', '36a04f7b-65f7-42d9-a2ab-198b5a7f115e', '8aabb05a-2492-48de-a96a-0a7875c0c8d3', '9bbd5d98-33e5-423f-b9cb-82f7af6c67ba', 'c87c3a25-c3b7-4a97-8429-eb0fc98b67bc'].every((id) => pe.includes(`id: '${id}'`)))

console.log('\n== engineWall: ligação ==')
checa('getExamplesBest devolve os 30 + os 6 estáticos com a trava de privacidade ligada', ew.includes('return [...founderShowcaseWall(), ...staticExampleWall()]'))
checa('founderShowcaseWall usa preview local como videoUrl (nunca o master)', /videoUrl: v\.previewPath/.test(ew))
checa('o clique leva ao Studio do motor com intent_campaign=examples_showcase', ew.includes("replace('home_curated', 'examples_showcase')"))
checa('a trava CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED continua false (nenhum vídeo de cliente)', /CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED = false as const/.test(readFileSync(join(RAIZ, 'lib/publicSurfacePolicy.ts'), 'utf8')))
checa('badge por motor continua saindo de ENGINE_BADGES', /badge: ENGINE_BADGES\[v\.engine\]/.test(ew))

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { console.log('\nFALHOU:'); falhas.forEach((f) => console.log(`  - ${f}`)); process.exit(1) }
console.log('\nOK — vitrine do fundador: home e Explorar com os melhores, tudo local e founder-owned\n')

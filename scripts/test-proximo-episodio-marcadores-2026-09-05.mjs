#!/usr/bin/env node
// KINEO-EPISODIO2-MARCADORES-2026-09-05
// Prova (1) por COMPORTAMENTO que a prosa vira 4 blocos sem mudar uma palavra
// e (2) lendo a rota REAL que /api/next-episode rotula em vez de descartar.
// Node 24 executa .ts direto (type stripping) — sem esbuild, sem tsx.
import { readFileSync } from 'node:fs'
import {
  temMarcadores, normalizarMarcadores, rotularProsa, garantirMarcadores, palavrasFaladas,
} from '../lib/nextEpisodeMarkers.ts'

let ok = 0
const falhas = []
const checa = (n, c, d = '') => { if (c) { ok++; console.log(`  ok  ${n}`) } else { falhas.push(n); console.log(`  XX  ${n}${d ? ' — ' + d : ''}`) } }

console.log('\n== 1. comportamento ==')

// Resposta REAL do modelo na sonda de 05/09 (0/8 traziam marcadores): prosa pura.
const prosa = `In 1833, an extraordinary cosmic event lit up the skies across North America, and yet most people had no idea what was happening. Millions of meteors streaked across the sky in a single night. Witnesses described the heavens as if they were on fire. Farmers woke their families, convinced the end of the world had arrived. Newspapers the next morning ran headlines about stars falling like snow. The source was the Leonid meteor shower, debris left by comet Tempel-Tuttle. Every thirty-three years the Earth crosses the densest part of that trail. The 1833 storm produced tens of thousands of meteors per hour. It also started the modern science of meteor astronomy, because for the first time observers noticed all the streaks radiated from one point in the constellation Leo. That point is why the shower carries the lion's name today.`

checa('prosa pura NAO tem marcadores (o 502 de hoje era isto)', !temMarcadores(prosa))
const r = rotularProsa(prosa)
checa('rotularProsa devolve texto', typeof r === 'string')
checa('o texto rotulado tem os 4 marcadores em linha propria', r && temMarcadores(r))
checa('as PALAVRAS faladas sao identicas antes e depois (Contrato C1)', r && palavrasFaladas(r).join(' ') === palavrasFaladas(prosa).join(' '))
checa('ordem HOOK < MICRO REWARD < ESCALATION < PAYOFF', r && r.indexOf('HOOK') < r.indexOf('MICRO REWARD') && r.indexOf('MICRO REWARD') < r.indexOf('ESCALATION') && r.indexOf('ESCALATION') < r.indexOf('PAYOFF'))
checa('o HOOK e a primeira frase inteira', r && r.split('\n')[1].startsWith('In 1833,') && r.split('\n')[1].endsWith('happening.'))
checa('o PAYOFF fecha com a ultima frase', r && r.trim().endsWith("lion's name today."))
checa('nenhum bloco sai vazio', r && r.split(/\n(?:HOOK|MICRO REWARD|ESCALATION|PAYOFF)\n/).filter(Boolean).every((b) => b.trim().length > 0))

// Numeros decimais e abreviacoes nao viram corte de frase
const dec = 'The rock was 2.5 meters wide. It fell near Mt. Hood in 1902. Nobody was hurt. The fragments weighed 1.2 tons. Museums still hold them. Visitors touch them daily.'
const rd = rotularProsa(dec)
checa('"2.5 meters" e "Mt. Hood" nao sao cortados como frase', rd && /2\.5 meters wide\./.test(rd) && /Mt\. Hood/.test(rd))

checa('menos de 4 frases -> null (nunca inventa fala para preencher bloco)', rotularProsa('One sentence. Two sentences. Three.') === null)
checa('vazio -> garantirMarcadores null', garantirMarcadores('') === null)

// Variacoes de rotulo que o modelo usa quando obedece "mais ou menos"
const variacoes = `**HOOK**
What if the sky fell?
## Micro-Reward:
It did once.
— ESCALATION —
Thousands saw it.
Payoff:
And science was born.`
const nv = normalizarMarcadores(variacoes)
checa('"**HOOK**", "## Micro-Reward:", "— ESCALATION —", "Payoff:" viram os 4 rotulos canonicos', temMarcadores(nv))
checa('normalizar preserva as palavras faladas', palavrasFaladas(nv).join(' ') === 'What if the sky fell? It did once. Thousands saw it. And science was born.')
const g1 = garantirMarcadores(variacoes)
checa("rotulos decorados em linha propria = o modelo obedeceu: via='model' (o texto sai canonico mesmo assim)", g1 && g1.via === 'model' && g1.script === nv)

const inline = `HOOK: What if the sky fell? MICRO REWARD: It did once, in 1833. ESCALATION: Thousands of people saw it and wrote it down. PAYOFF: And science was born that night.`
const gi = garantirMarcadores(inline)
checa('rotulos INLINE numa linha so -> ainda sai com 4 marcadores (auto_split sobre as palavras)', gi && temMarcadores(gi.script))
checa('  e sem "HOOK:" dentro da fala', gi && !/HOOK:|PAYOFF:/i.test(gi.script))
checa("  rotulos inline foram DESTACADOS pelo servidor: via='normalized'", gi && gi.via === 'normalized')
checa('  "here is the hook: nobody knows" no meio de uma oracao NAO vira rotulo', !/\nHOOK\n/.test(normalizarMarcadores('First sentence here. And here is the hook: nobody knows why. Last one.')))

const canon = 'HOOK\nA.\n\nMICRO REWARD\nB.\n\nESCALATION\nC.\n\nPAYOFF\nD.'
const gc = garantirMarcadores(canon)
checa("resposta ja canonica -> via='model', texto intocado", gc && gc.via === 'model' && gc.script === canon)
const gp = garantirMarcadores(prosa)
checa("prosa -> via='auto_split'", gp && gp.via === 'auto_split')

// Substring nao basta: "the hook of the story" NAO e marcador (o teste antigo aceitava)
checa('substring solta ("the hook", "payoff") nao conta como marcador', !temMarcadores('the hook of the story is the micro reward and the escalation and the payoff'))

console.log('\n== 2. a rota real ==')
const rota = readFileSync(new URL('../app/api/next-episode/route.ts', import.meta.url), 'utf8')
checa('a rota importa garantirMarcadores da biblioteca', /import \{[^}]*garantirMarcadores[^}]*\} from '@\/lib\/nextEpisodeMarkers'/.test(rota))
checa('a rota nao tem mais o temMarcadores local por substring', !/function temMarcadores\(texto: string\): boolean \{\s*return MARCADORES\.every/.test(rota))
checa('a rota chama garantirMarcadores(script) e so devolve 502 quando ela devolve null', /const garantido = garantirMarcadores\(script\)[\s\S]*?if \(!garantido\) \{[\s\S]*?status: 502/.test(rota))
checa('o script devolvido ao cliente e o garantido (rotulado), nao o cru', /script: garantido\.script/.test(rota))
checa('a resposta carrega markersVia (model|normalized|auto_split) para medir o caminho', /markersVia: garantido\.via/.test(rota))
checa('o prompt ganhou o ESQUELETO explicito (exemplo de saida), nao so a regra', rota.includes('OUTPUT SHAPE (copy this shape exactly') && rota.includes('TITLE: <4-8 words>') && /HOOK\r?\n<one sentence/.test(rota))
checa('o log do caso irrecuperavel continua existindo', rota.includes('sem marcadores'))
checa('a contagem de palavras ignora as linhas de rotulo do script garantido', /const palavras = garantido\.script[\s\S]*?replace\(\/\^\(HOOK\|MICRO REWARD\|ESCALATION\|PAYOFF\)/.test(rota))

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { console.log('\nFALHOU:'); falhas.forEach((f) => console.log(`  - ${f}`)); process.exit(1) }
console.log('\nOK — o cartao do episodio 2 deixa de morrer por falta de rotulo\n')

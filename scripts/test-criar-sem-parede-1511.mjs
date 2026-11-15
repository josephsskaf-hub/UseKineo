#!/usr/bin/env node
// KINEO-CRIAR-SEM-PAREDE-1511 — guardião (dono 15/11 05:05 "você conserta"; teste sem conta de 15/11).
//   R · desvio do /signup (lib/growth/visitanteEscreveAntes.ts): /signup?redirect=/clips… leva o visitante ao /clips com a MESMA query;
//       quem volta do login (volta=1), destino externo, // e barra invertida seguem pelo cadastro; /studio, /create/* como antes.
//   C · Clips (ClipsClient.tsx): o 401 do Generate do visitante abre o cadastro com volta (cadastroComVolta(voltaDoClipe(...)));
//       o link do erro aponta ao cadastro, nunca mais a "/login?redirect=/clips" ("Welcome back"); voltaDoClipe leva efeito, remix ou motor+ideia.
//   M · mutantes: sem a linha do /clips no desvio, o cartão de clipe volta à conta; sem o desvio do 401, o erro vermelho volta.
// Offline, sem rede, sem custo. Rodar: node scripts/test-criar-sem-parede-1511.mjs
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(RAIZ)
const REGRA = 'lib/growth/visitanteEscreveAntes.ts'
const CLIPS = 'app/(dashboard)/clips/ClipsClient.tsx'
const LINHA_CLIPS = "if (url.pathname === '/clips') return url.searchParams.has(MARCA_DA_VOLTA) ? null : `/clips${url.search}`"

function regra(mutante) {
  const load = createOfflineLoader({ source: (p, s) => (mutante && p.replace(/\\/g, '/').endsWith(REGRA) ? s.replace(LINHA_CLIPS, '') : s) })
  return load(REGRA)
}
const enc = (x) => encodeURIComponent(x)
function casosR(R) {
  const d = (redir) => R.destinoDoVisitanteQueEscreve('/signup', redir)
  return [
    ['R1 /clips puro abre sem conta', d('/clips') === '/clips'],
    ['R2 /clips com motor e ideia: a mesma query', d('/clips?engine=h3&prompt=a%20lighthouse') === '/clips?engine=h3&prompt=a%20lighthouse'],
    ['R3 /clips?trend= e ?effect= também', d('/clips?trend=cat-car') === '/clips?trend=cat-car' && d('/clips?effect=xmas') === '/clips?effect=xmas'],
    ['R4 volta do login segue o cadastro', d('/clips?prompt=abc&volta=1') === null],
    ['R5 externo, // e barra invertida seguem o cadastro', d('https://evil.example/clips') === null && d('//evil.example/clips') === null && d('/\\evil.example/clips') === null],
    ['R6 /create/film continua indo ao /studio (regra de 14/11)', d('/create/film?engine=seedance&intent_campaign=home_card') === '/studio?engine=seedance&intent_campaign=home_card'],
    ['R7 cadastroComVolta marca a volta', R.cadastroComVolta('/clips?prompt=abc') === '/signup?redirect=' + enc('/clips?prompt=abc&volta=1')],
  ]
}

const fonte = readFileSync(join(RAIZ, CLIPS), 'utf8').replace(/\r\n/g, '\n')
const casosC = [
  ['C1 o 401 do Generate abre o cadastro com volta', /if \(res\.status === 401\) \{[^\n]*\n\s*window\.location\.assign\(cadastroComVolta\(voltaDoClipe\(payload, prompt\)\)\)/.test(fonte)],
  ['C2 o desvio do 401 vem antes do erro vermelho', fonte.indexOf('res.status === 401') > 0 && fonte.indexOf('res.status === 401') < fonte.indexOf("text: typeof data?.error === 'string' ? data.error : 'Could not start the clip.'")],
  ['C3 nenhum link do Clips leva a "/login?redirect=/clips"', !fonte.includes('/login?redirect=/clips')],
  ['C4 o link do erro aponta ao cadastro', fonte.includes('href={cadastroComVolta("/clips")}')],
]
// voltaDoClipe executada de verdade (o trecho da função, sem React).
const corpo = fonte.slice(fonte.indexOf('function voltaDoClipe('), fonte.indexOf('function rememberClipEffect('))
const voltaDoClipe = new Function(`${corpo.replace(/: Record<string, unknown>|: string\): string|: string/g, (m) => (m.startsWith(': string)') ? ')' : '')).replace('prompt)', 'prompt)')}; return voltaDoClipe`)()
casosC.push(
  ['C5 motor + ideia viajam', voltaDoClipe({ engine: 'h3', prompt: 'x' }, ' A lighthouse ') === '/clips?engine=h3&prompt=A+lighthouse'],
  ['C6 efeito e remix viajam pela chave (a foto sobe de novo)', voltaDoClipe({ effect: 'xmas', image_url: 'u' }, 'abc') === '/clips?effect=xmas' && voltaDoClipe({ remix: 'r1' }, '') === '/clips?remix=r1'],
  ['C7 ideia curta demais não vai ao link', voltaDoClipe({ engine: 'h3' }, 'ab') === '/clips?engine=h3'],
)

let falhas = 0
for (const [nome, ok] of [...casosR(regra(false)), ...casosC]) { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${nome}`); if (!ok) falhas++ }
const m1 = casosR(regra(true)).filter(([n, ok]) => /^R[123] /.test(n) && !ok).length
console.log(`  ${m1 === 3 ? 'ok  ' : 'FAIL'} M1 sem a linha do /clips no desvio, os cartões de clipe voltam à conta (${m1} de 3 reprovam)`)
if (m1 !== 3) falhas++
const semDesvio = fonte.replace(/if \(res\.status === 401\) \{[\s\S]*?\} \/\/ KINEO-CRIAR-SEM-PAREDE-1511\n/, '')
const m2 = semDesvio !== fonte && !/res\.status === 401/.test(semDesvio)
console.log(`  ${m2 ? 'ok  ' : 'FAIL'} M2 sem o desvio do 401, C1 reprova (o erro vermelho voltaria)`)
if (!m2) falhas++
console.log(`${16 - falhas} ok, ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)

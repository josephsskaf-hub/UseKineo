// KINEO-PH-2026-09-10 — FONTE ÚNICA DOS NÚMEROS DO KIT DO PRODUCT HUNT.
//
// Nenhum preço, crédito ou contagem de filme é digitado aqui nem nas imagens,
// no vídeo ou nos textos do kit: tudo sai de lib/checkoutPricing.ts,
// lib/entryPolicy.ts, lib/credits/engineCost.ts, lib/marketingPrice.ts e
// lib/engineLabel.ts — transpilados e EXECUTADOS, do jeito que o guardião de
// preço V7 já faz. Se o fundador repricar amanhã, `node scripts/ph-fatos.mjs`
// muda sozinho e o guardião do kit acusa o material velho.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')

/** Corpo de `export const NOME = ...` até o `\n}` que o fecha (objeto). */
const bloco = (txt, nome) => {
  const i = txt.indexOf(`export const ${nome}`)
  if (i < 0) throw new Error(`bloco ausente: ${nome}`)
  return txt.slice(i, txt.indexOf('\n}', i) + 2)
}
/** Corpo de `export function NOME(...)` até o `\n}` que a fecha. */
const fn = (txt, nome) => {
  const i = txt.indexOf(`export function ${nome}`)
  if (i < 0) throw new Error(`função ausente: ${nome}`)
  return txt.slice(i, txt.indexOf('\n}', i) + 2)
}
/** `export const NOME = 60` de uma linha só. */
const num = (txt, nome) => {
  const alvo = 'export const ' + nome + ' = '
  const j = txt.indexOf(alvo)
  const m = j < 0 ? NaN : parseInt(txt.slice(j + alvo.length), 10)
  if (!Number.isFinite(m)) throw new Error(`numero ausente: ${nome}`)
  return m
}
const roda = (src) => {
  const limpo = src
    .replace(/: Record<[^=]+> =/g, ' =')
    .replace(/quality: Quality/g, 'quality')
    .replace(/isPaidUser: boolean/g, 'isPaidUser')
    .replace(/seconds: number/g, 'seconds')
    .replace(/credits: number/g, 'credits')
    .replace(/tier: CheckoutTier/g, 'tier')
    .replace(/\): number \{/g, ') {')
    .replace(/ as const/g, '')
  const js = ts.transpileModule(limpo, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp })
  return exp
}

export function fatos() {
  const cp = rd('lib/checkoutPricing.ts')
  const ec = rd('lib/credits/engineCost.ts')
  const ep = rd('lib/entryPolicy.ts')
  const mp = rd('lib/marketingPrice.ts')
  const el = rd('lib/engineLabel.ts')

  const P = roda([bloco(cp, 'TIER_PRICES'), bloco(cp, 'TIER_CREDITS')].join('\n'))
  const E = roda([fn(ec, 'creditCostFor'), fn(ec, 'creditCostForDuration')].join('\n')
    .replace(/DURATION_REFERENCE_SECONDS/g, String(num(ec, 'DURATION_REFERENCE_SECONDS'))))
  const C = roda(bloco(ep, 'CARD_ENTRY_COPY')).CARD_ENTRY_COPY
  const M = roda([
    `const creditCostFor=${E.creditCostFor};`,
    `const creditCostForDuration=${E.creditCostForDuration};`,
    `const TIER_CREDITS=${JSON.stringify(P.TIER_CREDITS)};`,
    `const MARKETING_REFERENCE_SECONDS=${num(mp, 'MARKETING_REFERENCE_SECONDS')};`,
    fn(mp, 'creditsPerReferenceVideo'), fn(mp, 'videosForCredits'), fn(mp, 'videosPerMonth'),
  ].join('\n'))

  // Nomes públicos: o MAPA de lib/engineLabel.ts é a única tradução da casa.
  const mapa = {}
  for (const [, q, nome] of el.matchAll(/^\s{2}(\w+): '([^']+)',$/gm)) mapa[q] = nome
  // Uma linha por motor: o mesmo texto que a vitrine da home mostra hoje
  // (components/EngineCycleCard.tsx META). Nada reescrito aqui.
  const ec2 = rd('components/EngineCycleCard.tsx')
  const descs = {}
  for (const [, q, d] of ec2.matchAll(/^\s{2}(\w+): \{ name: '[^']+', desc: (?:'([^']*)'|"([^"]*)")/gm)) descs[q] = d
  for (const [, q, d] of ec2.matchAll(/^\s{2}(\w+): \{ name: '[^']+', desc: "([^"]*)"/gm)) descs[q] = d
  const ORDEM = ['fast', 'cinematic_ai', 'cinematic_h3', 'cinematic_kling', 'cinematic_veo', 'avatar', 'cinematic_hollywood', 'cinematic_omni']
  const motores = ORDEM.map((q) => {
    if (!mapa[q]) throw new Error(`engineLabel sem nome para ${q}`)
    const desc = descs[q] ?? descs[q === 'avatar' ? 'presenter' : q]
    if (!desc) throw new Error(`EngineCycleCard sem desc para ${q}`)
    return { q, nome: mapa[q], desc, cr60: E.creditCostForDuration(q, true, 60) }
  }).sort((a, b) => a.cr60 - b.cr60)

  const planos = [
    { tier: 'starter', nome: 'Starter' },
    { tier: 'basic', nome: 'Creator' },
    { tier: 'pro', nome: 'Studio' },
  ].map((p) => ({
    ...p,
    usd: P.TIER_PRICES[p.tier].usd / 100,
    creditos: P.TIER_CREDITS[p.tier],
    fast: M.videosPerMonth(p.tier, 'fast'),
    ai: M.videosPerMonth(p.tier, 'cinematic_ai'),
    kling: M.videosPerMonth(p.tier, 'cinematic_kling'),
    holly: M.videosPerMonth(p.tier, 'cinematic_hollywood'),
  }))

  return { precos: P.TIER_PRICES, creditos: P.TIER_CREDITS, copy: C, motores, planos }
}

if (process.argv[1] && process.argv[1].endsWith('ph-fatos.mjs')) {
  console.log(JSON.stringify(fatos(), null, 2))
}

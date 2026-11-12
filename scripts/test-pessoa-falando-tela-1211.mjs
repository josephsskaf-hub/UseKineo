// KINEO-ADS-PESSOA-FALANDO-TELA-1211 [SPEC-ADS-PESSOA-FALANDO-2026-11-11 §1; dono 12/11]: a tela do anúncio com a pessoa FALANDO, na aba
// Ads da moldura nova, só para quem o interruptor deixa. Offline: executa as regras puras e renderiza o painel real.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const { loader, read, ROOT } = require('../docs/recreate-0911/test-recreate.cjs')
const React = require(join(ROOT, 'node_modules/react'))
const { renderToStaticMarkup } = require(join(ROOT, 'node_modules/react-dom/server'))

const PAINEL = 'components/ads/PessoaFalandoPainel.tsx'
const CONTRATO = 'lib/ads/pessoaFalando/telaContrato.ts'
const PAGINA = 'app/create/[tab]/page.tsx'
let passed = 0
const ok = (c, m) => { assert(c, m); passed++ }
const text = h => h.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

function all(o = {}) {
  const src = p => (o[p] ?? read(p)).replace(/\r\n/g, '\n')
  const load = loader({}, o)
  const P = load(PAINEL.replace(/\.tsx$/, ''))
  const C = load(CONTRATO.replace(/\.ts$/, ''))
  // 1) Quem fala e onde: os 4 sem Jade, os 6 formatos, os 3 clipes aprovados como exemplo.
  ok(JSON.stringify(P.ORDEM_DOS_APRESENTADORES) === '["sofia","amara","rahul","kenji"]', 'quem fala: Sofia, Amara, Rahul, Kenji (sem Jade)')
  ok(P.ORDEM_DOS_FORMATOS.length === 6, 'os 6 formatos')
  for (const [f, clipe] of Object.entries(P.EXEMPLO_DO_FORMATO)) ok(existsSync(join(ROOT, 'public/ads-exemplos', clipe + '.mp4')) && existsSync(join(ROOT, 'public/ads-exemplos', clipe + '.webp')), `exemplo aprovado existe: ${f} → ${clipe}`)
  ok(JSON.stringify(Object.values(P.EXEMPLO_DO_FORMATO).sort()) === '["halo-car-selfie","orra-street-interview","veil-grwm"]', 'os 3 clipes aprovados pelo dono, e só eles')
  // 2) Preço só no botão final, com o número da constante; sem número = sem pedido.
  ok(P.rotuloDoBotao(null) === 'Make my video · price coming soon' && P.rotuloDoBotao(120) === 'Make my video · 120 credits', 'botão: o número da constante (ou "coming soon")')
  ok(C.ADS_PESSOA_FALANDO_CREDITS === null || typeof C.ADS_PESSOA_FALANDO_CREDITS === 'number', 'constante de créditos lida')
  const p = src(PAINEL)
  ok(/disabled=\{!escolhida \|\| !creditos \|\| ocupado !== null\}/.test(p), 'sem foto escolhida ou sem preço decidido, o botão final não pede')
  // 3) O que a tela manda: nada vai ao servidor faltando dado.
  ok(C.faltaNaEntrada({}) !== null && C.faltaNaEntrada({ fotoDoProduto: 'http://x', produto: 'a', frase: 'b', apresentadorId: 'sofia', formatoId: 'car_selfie' }) !== null, 'foto só por https')
  ok(C.faltaNaEntrada({ fotoDoProduto: 'https://x/y.jpg', produto: 'Mug', frase: 'Hot 12 h', apresentadorId: 'sofia', formatoId: 'car_selfie' }) === null, 'entrada completa passa')
  // 4) O roteiro: gestos marcados depois da palavra; `rascunho` abre a fala para ajustar.
  const marcado = renderToStaticMarkup(React.createElement('p', null, P.marcarGestos({ fala: 'I pour coffee at seven, still hot.', gestos: [{ palavra: 'seven', gesto: 'lifts the mug' }] })))
  ok(/seven,<span class="pf-gesto">lifts the mug<\/span>/.test(marcado), 'gesto marcado logo depois da palavra')
  ok(/setFoiRascunho\(!r\.roteiro && Boolean\(r\.rascunho\)\)/.test(p) && p.includes('data-pf-rascunho'), 'rascunho do escritor abre a fala com o aviso')
  ok(/<textarea aria-label="Edit the line"/.test(p), 'a fala é editável')
  // 5) Nada começa sozinho: as 3 chamadas só nascem de clique.
  const chamadas = [...p.matchAll(/chamar<[^>]+>\(PESSOA_FALANDO_API\.(\w+)/g)].map(m => m[1]).sort()
  ok(JSON.stringify(chamadas) === '["fotos","roteiro","video"]', 'as 3 chamadas do contrato')
  ok(!/useEffect/.test(p), 'nenhum efeito: nada dispara ao abrir a tela')
  // 6) Render inicial: os 6 passos, sem nome de motor, sem preço antes do fim, letra ≥ 12 px.
  const html = renderToStaticMarkup(React.createElement(P.default, {}))
  for (const n of ['1', '2', '3', '4', '5', '6']) ok(html.includes(`data-pf-passo="${n}"`), `passo ${n} na tela`)
  ok(!/seedance|kling|nano|banana|minimax|veo|fal-ai|bytedance/i.test(text(html) + p.replace(/^\s*\/\/.*$/gm, '')), 'sem nome de motor na tela')
  ok(!/credits|\$\d/.test(text(html)), 'sem preço antes do botão final')
  const pequenos = [...p.matchAll(/font-size:(\d+(?:\.\d+)?)px/g)].map(m => Number(m[1])).filter(v => v < 12)
  ok(pequenos.length === 0, `letra ≥ 12 px (${pequenos.join(',')})`)
  ok(/@media\(max-width:480px\)\{\.pf-grid\{grid-template-columns:repeat\(2/.test(p), 'cabe em 375 px (2 colunas)')
  // 7) A porta: só na aba Ads com ?formato=pessoa_falando, só para quem o interruptor deixa, ANTES do redirect para o /ads/v2.
  const pg = src(PAGINA)
  const i = pg.indexOf("searchParams.formato === 'pessoa_falando'")
  ok(i > 0 && i < pg.indexOf("redirect(`/ads/v2?${query}`)"), 'a porta vem antes do redirect de sempre')
  ok(/pessoaFalandoLigado\(KINEO_ADS_PESSOA_FALANDO, isInternalEmail\(quem\.email\)\)/.test(pg), 'só conta da casa enquanto o interruptor for internal')
  ok(/painel=\{<PessoaFalandoPainel \/>\}/.test(pg), 'o painel dentro da moldura nova (CreateShell)')
}

all()
const real = passed
const r = p => read(p)
const mutants = [
  ['Jade volta', PAINEL, r(PAINEL).replace("['sofia', 'amara', 'rahul', 'kenji']", "['sofia', 'amara', 'rahul', 'kenji', 'jade']")],
  ['botão pede sem preço', PAINEL, r(PAINEL).replace('disabled={!escolhida || !creditos || ocupado !== null}', 'disabled={!escolhida || ocupado !== null}')],
  ['roteiro escreve sozinho', PAINEL, r(PAINEL).replace("import { useMemo, useState } from 'react'", "import { useEffect, useMemo, useState } from 'react'")],
  ['nome de motor na tela', PAINEL, r(PAINEL).replace("'Write the script'", "'Write the script with Seedance'")],
  ['letra de 11 px', PAINEL, r(PAINEL).replace('.pf-hint{margin:0 0 8px;font-size:12px', '.pf-hint{margin:0 0 8px;font-size:11px')],
  ['porta aberta para todos', PAGINA, r(PAGINA).replace('pessoaFalandoLigado(KINEO_ADS_PESSOA_FALANDO, isInternalEmail(quem.email))', 'true')],
  ['foto http aceita', CONTRATO, r(CONTRATO).replace('/^https:\\/\\/\\S+$/u', '/^https?:\\/\\/\\S+$/u')],
  ['rascunho não abre a fala', PAINEL, r(PAINEL).replace('setFoiRascunho(!r.roteiro && Boolean(r.rascunho))', 'setFoiRascunho(false)')],
]
let bitten = 0
for (const [name, f, v] of mutants) {
  if (v === r(f)) throw new Error(`mutante não aplicou: ${name}`)
  passed = 0
  let died = false
  try { all({ [f]: v }) } catch { died = true }
  assert(died, `MUTANTE SOBREVIVEU: ${name}`)
  bitten++
}
console.log(`test-pessoa-falando-tela-1211: ${real} verificações verdes · ${bitten}/${mutants.length} mutantes mortos`)

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
  const load = loader({ '@/components/billing/SubscriberUpgradeNudge': { __esModule: true, default: () => null } }, o)
  const P = load(PAINEL.replace(/\.tsx$/, ''))
  const C = load(CONTRATO.replace(/\.ts$/, ''))
  // 1) Quem fala e onde: os 4 sem Jade, os 6 formatos, os 3 clipes aprovados como exemplo.
  ok(JSON.stringify(P.ORDEM_DOS_APRESENTADORES) === '["sofia","amara","rahul","kenji"]', 'quem fala: Sofia, Amara, Rahul, Kenji (sem Jade)')
  ok(P.ORDEM_DOS_FORMATOS.length === 6, 'os 6 formatos')
  for (const [f, clipe] of Object.entries(P.EXEMPLO_DO_FORMATO)) ok(existsSync(join(ROOT, 'public/ads-exemplos', clipe + '.mp4')) && existsSync(join(ROOT, 'public/ads-exemplos', clipe + '.webp')), `exemplo aprovado existe: ${f} → ${clipe}`)
  ok(JSON.stringify(Object.values(P.EXEMPLO_DO_FORMATO).sort()) === '["halo-car-selfie","orra-street-interview","veil-grwm"]', 'os 3 clipes aprovados pelo dono, e só eles')
  // 2) Preço só no botão final, com o número da constante; sem número = sem pedido.
  ok(P.rotuloDasFotos(null) === 'Show me 2 photos · price coming soon' && P.rotuloDasFotos(120) === 'Show me 2 photos · 120 credits', 'KINEO-PF-COBRA-NAS-FOTOS-1211 — o preço mora no botão das 2 fotos (o que cobra)')
  ok(C.ADS_PESSOA_FALANDO_CREDITS === 55 && P.rotuloDasFotos(C.ADS_PESSOA_FALANDO_CREDITS) === 'Show me 2 photos · 55 credits' && P.INCLUI_O_VIDEO === 'Includes your video', 'preço do dono (55) no botão das fotos, dizendo que inclui o vídeo')
  ok(P.ROTULO_FINAL === 'Make my video · included' && !/[0-9]/.test(P.ROTULO_FINAL),'o passo final não mostra preço: já incluído')
  // KINEO-ADS-PESSOA-FALANDO-PRECO-1211 — só o anúncio de 10 s: a fala cabe em 25 palavras (a régua do servidor); sem seletor de 12 s.
  ok(C.FALA_MAX_PALAVRAS === 25 && C.palavrasDaFala('a b  c\n d') === 4, 'régua dos 10 s: 25 palavras')
  ok(C.saldoCobre(40, 55) === false && C.saldoCobre(55, 55) === true && C.saldoCobre(null, 55) === null, 'saldo: o Starter (40) não cobre; leitura que falha não vira 0')
  const p = src(PAINEL)
  ok(p.includes('disabled={!escolhida || !falaCabe || !pedidoPago || ocupado !== null} onClick={fazerVideo}') && p.includes('if (!roteiroVale || !roteiro || !escolhida || !falaCabe || !pedidoPago) return') && !/saldoCobre|creditos/.test(p.slice(p.indexOf('async function fazerVideo'), p.indexOf('async function fazerVideo') + 500)), 'o passo final não cobra de novo (sem checagem de preço/saldo)')
  const vf = p.slice(p.indexOf('async function verFotos'), p.indexOf('async function fazerVideo'))
  ok(vf.indexOf("fetch('/api/credits'") > 0 && vf.indexOf("fetch('/api/credits'") < vf.indexOf('PESSOA_FALANDO_API.fotos') && vf.includes('if (!pedidoPago && saldoCobre(lido, creditos) === false) { setOcupado(null); return }'),'o saldo é lido NO clique das fotos e, sem saldo, as fotos não são pedidas')
  ok(p.indexOf('data-pf-sem-saldo') > p.indexOf('data-pf-botao-fotos') && p.indexOf('data-pf-sem-saldo') < p.indexOf('className="pf-fotos"'), 'a saída de plano/recarga fica junto do botão das fotos')
  ok(/Nothing was charged/.test(vf) && !/Nothing was charged/.test(p.slice(p.indexOf('async function fazerVideo'), p.indexOf('async function fazerVideo') + 600)), 'fotos falharam = nada cobrado; vídeo falhou = não cobra de novo (sem prometer o que não é verdade)')
  ok(/cobre === false \? <div[^>]*data-pf-sem-saldo=""><SubscriberUpgradeNudge surface="ads_pessoa_falando_sem_saldo" topup onShown=\{\(\) => setAvisoDoAssinante\(true\)\} \/>/.test(p), 'sem saldo, assinante: a saída de sempre (troca de plano ou recarga)')
  ok(/\{!avisoDoAssinante \? <>[^\n]*href="\/pricing" data-pf-ver-planos="">See plans<\/a>/.test(p), 'sem saldo, sem plano: "See plans" (a mesma saída do Cartoon), nunca botão morto sem saída')
  ok(!/\d+\s*credits|\$\d/.test((p.match(/data-pf-sem-saldo[\s\S]*?<\/div> : null\}/) || [''])[0]), 'a saída sem saldo não traz texto novo de preço')
  ok(!/\b12[- ]?s(econds?)?\b|'12'/i.test(p.replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')), 'sem seletor de 12 s')
  ok(p.includes('disabled={!roteiroVale || !falaCabe || !creditos || ocupado !== null} onClick={verFotos}'),'fala acima de 25 palavras ou sem preço não pede as fotos')
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
  // KINEO-PF-COBRA-NAS-FOTOS-1211 — o preço mora SÓ no botão das 2 fotos (o que cobra); fora dele, nenhum número de crédito nem dinheiro.
  const botaoFotos = (html.match(/<button[^>]*data-pf-botao-fotos=""[^>]*>[\s\S]*?<\/button>/) || [''])[0]
  ok(/Show me 2 photos · 55 credits/.test(text(botaoFotos)) && /Includes your video/.test(text(botaoFotos)), 'o botão das fotos traz o preço e diz que inclui o vídeo')
  ok(!/credits|\$\d/.test(text(html.replace(botaoFotos, ''))), 'fora do botão das fotos, nenhum preço')
  const pequenos = [...p.matchAll(/font-size:(\d+(?:\.\d+)?)px/g)].map(m => Number(m[1])).filter(v => v < 12)
  ok(pequenos.length === 0, `letra ≥ 12 px (${pequenos.join(',')})`)
  ok(/@media\(max-width:480px\)\{\.pf-grid\{grid-template-columns:repeat\(2/.test(p), 'cabe em 375 px (2 colunas)')
  // 7) A porta: só na aba Ads com ?formato=pessoa_falando, só para quem o interruptor deixa, ANTES do redirect para o /ads/v2.
  const pg = src(PAGINA)
  const i = pg.indexOf("searchParams.formato === 'pessoa_falando'")
  ok(i > 0 && i < pg.indexOf("redirect(`/ads/v2?${query}`)"), 'a porta vem antes do redirect de sempre')
  ok(pg.includes('pessoaFalandoLigado(KINEO_ADS_PESSOA_FALANDO, isAdsInternalEmail(quem.email))') && pg.includes("import { isAdsInternalEmail } from '@/lib/ads/access'"),'só conta da casa — a MESMA lista das rotas (isAdsInternalEmail)')
  ok(/painel=\{<PessoaFalandoPainel \/>\}/.test(pg), 'o painel dentro da moldura nova (CreateShell)')
  // 8) KINEO-PF-PEDIDO-UNICO-1211 — dois cliques = UM pedido: o mesmo pedidoId em toda tentativa; o vídeo manda de volta o que as fotos devolveram.
  const ref = { current: null }
  let gerados = 0
  const gera = () => { gerados++; return C.novoPedidoId() }
  const id1 = C.pedidoUnico(ref, gera), id2 = C.pedidoUnico(ref, gera)
  ok(id1 === id2 && gerados === 1, 'dois cliques seguidos = um pedidoId só')
  ok(C.PEDIDO_ID_FORMATO.test(id1) && C.PEDIDO_ID_FORMATO.test(C.novoPedidoId()), 'o id é um uuid (o formato que a rota aceita)')
  const vf2 = p.slice(p.indexOf('async function verFotos'), p.indexOf('async function fazerVideo'))
  ok(vf2.includes('const pedidoId = pedidoUnico(pedidoRef)') && vf2.includes('chamar<RespostaFotos>(PESSOA_FALANDO_API.fotos, { ...entrada, pedidoId })') && vf2.includes('setPedidoPago(r.pedidoId ?? pedidoId)'), 'as fotos levam o pedidoId e guardam o que voltou')
  ok(vf2.indexOf('pedidoUnico(pedidoRef)') < vf2.indexOf("setOcupado('fotos')"), 'o id nasce antes de qualquer espera (o 2º clique já vê o mesmo)')
  ok(p.includes('const pedidoRef = useRef<string | null>(null)'), 'o id mora num ref (síncrono), não num estado')
  ok(p.includes('roteiro, pedidoId: pedidoPago }))') && p.includes('disabled={!escolhida || !falaCabe || !pedidoPago || ocupado !== null} onClick={fazerVideo}'), 'o vídeo só sai com o pedido pago, e manda o pedidoId dele')
  ok(p.includes('data-pf-ja-pago') && p.includes("pedidoPago ? 'Show me 2 photos · already paid'"), 'depois de pagar: a tela diz que mudar o roteiro não cobra de novo, e o botão não mostra preço outra vez')
  ok(!/escrever[^}]*pedidoRef\.current = null/.test(p) && !p.includes('pedidoRef.current = null'), 'reescrever o roteiro não abre pedido novo')
}

all()
const real = passed
const r = p => read(p)
const mutants = [
  ['Jade volta', PAINEL, r(PAINEL).replace("['sofia', 'amara', 'rahul', 'kenji']", "['sofia', 'amara', 'rahul', 'kenji', 'jade']")],
  ['botão das fotos pede sem preço', PAINEL, r(PAINEL).replace('disabled={!roteiroVale || !falaCabe || !creditos || ocupado !== null} onClick={verFotos}', 'disabled={!roteiroVale || !falaCabe || ocupado !== null} onClick={verFotos}')],
  ['final volta a mostrar preço', PAINEL, r(PAINEL).replace("export const ROTULO_FINAL = 'Make my video · included'", "export const ROTULO_FINAL = 'Make my video · 55 credits'")],
  ['tela usa a lista errada (vê e leva 404)', PAGINA, r(PAGINA).replace('isAdsInternalEmail(quem.email)', 'isInternalEmail(quem.email)')],
  ['roteiro escreve sozinho', PAINEL, r(PAINEL).replace("import { useMemo, useRef, useState } from 'react'", "import { useEffect, useMemo, useRef, useState } from 'react'")],
  ['nome de motor na tela', PAINEL, r(PAINEL).replace("'Write the script'", "'Write the script with Seedance'")],
  ['letra de 11 px', PAINEL, r(PAINEL).replace('.pf-hint{margin:0 0 8px;font-size:12px', '.pf-hint{margin:0 0 8px;font-size:11px')],
  ['porta aberta para todos', PAGINA, r(PAGINA).replace('pessoaFalandoLigado(KINEO_ADS_PESSOA_FALANDO, isAdsInternalEmail(quem.email))', 'true')],
  ['preço volta a pendente', CONTRATO, r(CONTRATO).replace('export const ADS_PESSOA_FALANDO_CREDITS: number | null = 55', 'export const ADS_PESSOA_FALANDO_CREDITS: number | null = null')],
  ['fala de 12 s passa', CONTRATO, r(CONTRATO).replace('export const FALA_MAX_PALAVRAS = 25', 'export const FALA_MAX_PALAVRAS = 32')],
  ['sem saldo ainda pede as fotos', PAINEL, r(PAINEL).replace('if (!pedidoPago && saldoCobre(lido, creditos) === false) { setOcupado(null); return }', '')],
  ['sem saldo sem saída', PAINEL, r(PAINEL).replace('<SubscriberUpgradeNudge surface="ads_pessoa_falando_sem_saldo" topup onShown={() => setAvisoDoAssinante(true)} />', '<span />')],
  ['quem não assina fica sem saída', PAINEL, r(PAINEL).replace('data-pf-ver-planos="">See plans</a>', 'data-pf-ver-planos=""></a>')],
  ['dois cliques = dois pedidos', CONTRATO, r(CONTRATO).replace('  if (!ref.current) ref.current = gerar()', '  ref.current = gerar()')],
  ['fotos sem pedidoId (cobra a cada clique)', PAINEL, r(PAINEL).replace('chamar<RespostaFotos>(PESSOA_FALANDO_API.fotos, { ...entrada, pedidoId })', 'chamar<RespostaFotos>(PESSOA_FALANDO_API.fotos, entrada)')],
  ['vídeo sem o pedido pago', PAINEL, r(PAINEL).replace('roteiro, pedidoId: pedidoPago }))', 'roteiro }))')],
  ['id em estado (corrida no duplo clique)', PAINEL, r(PAINEL).replace('const pedidoRef = useRef<string | null>(null)', 'const [pedidoRefX] = useState<string | null>(null); const pedidoRef = { current: pedidoRefX }')],
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

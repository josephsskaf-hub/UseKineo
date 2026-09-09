// KINEO-PORTA-MODAL-FILME-RODADO-2026-09-09 — GUARDIÃO DA CAIXA DE $1 DENTRO
// DO MODAL DE UPGRADE (components/UpgradeModalTrialDoor.tsx).
//
// O QUE ESTE GUARDIÃO PROTEGE, e por que ele nasceu:
//
// A sprint ChatGPT de 09/09 mediu, evento a evento, a coorte da Versão B
// (cadastro >= 08/09 05:00 UTC). Duas superfícies pedem o $1 no MESMO instante
// e são mutuamente exclusivas — medido: quem viu uma não viu a outra:
//   · `card_entry_door_shown`        → 4 pessoas (3 do ChatGPT)
//   · `upgrade_modal_trial_door_shown` → 3 pessoas, dentro de
//     `upgrade_modal_opened` = 7 pessoas (5 do ChatGPT)
//
// A r2 (87926146) ensinou à PRIMEIRA que o filme já está rodado. A segunda
// continuava dizendo apenas o que a pessoa GANHARIA, e o comentário dela
// afirmava que "o modal abre ANTES do render". Isso era verdade na Versão A e
// virou falso em 08/09. Prova, `samu.mikkonen` (ChatGPT, 08/09 UTC):
//   11:17:59  fast_compose_recoverable { clips: 15 }
//   11:18:00  compose_refused { used: 1, limit: 0 }
//   11:18:00  upgrade_modal_opened  →  upgrade_modal_trial_door_shown
// Um segundo entre o trabalho pronto e a caixa que não sabia dele.
//
// As verificações abaixo amarram cada afirmação à VARIÁVEL que a decide —
// nunca à presença do texto. Um mutante que troca `filmIsShot ? A : B` por `A`
// mantém todas as strings do arquivo: guardião que contasse texto ficaria
// verde (memória `guardiao-contar-texto-nao-prova-condicao`).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import React from 'react'
import * as jsx from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const root = path.resolve(import.meta.dirname, '..')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')

const DOOR = 'components/UpgradeModalTrialDoor.tsx'
const NUCLEO = 'lib/growth/cleanFilmTrialDoor.ts'
const GENERATE = 'app/(dashboard)/generate/GenerateClient.tsx'

const doorSrc = read(DOOR)
const nucleoSrc = read(NUCLEO)
const generateSrc = read(GENERATE)

// Sem comentários: um comentário citando "15 clipes" não pode aprovar nada.
const doorBody = doorSrc.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
const nucleoBody = nucleoSrc.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')

let checks = 0
const check = (label, fn) => {
  fn()
  checks++
  console.log('OK ' + label)
}

// ── carregador de módulo real (sem alias @/ pendurado no node) ───────────────
function resolveSpec(spec, fromRel) {
  if (spec.startsWith('@/')) return spec.slice(2)
  const dir = path.dirname(fromRel)
  return path.normalize(path.join(dir, spec)).split(path.sep).join('/')
}
const moduleCache = new Map()
function loadModule(rel) {
  const candidates = [rel + '.ts', rel + '.tsx', rel + '/index.ts', rel]
  const found = candidates.find((c) => fs.existsSync(path.join(root, c)))
  if (!found) throw new Error('nao resolvi ' + rel)
  if (moduleCache.has(found)) return moduleCache.get(found)
  const box = { exports: {} }
  moduleCache.set(found, box.exports)
  const js = ts.transpileModule(read(found), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  vm.runInNewContext(
    js,
    { module: box, exports: box.exports, console, process: { env: { NODE_ENV: 'test' } }, require: (id) => loadModule(resolveSpec(id, found)) },
    { filename: found },
  )
  moduleCache.set(found, box.exports)
  return box.exports
}

// Render REAL da caixa. `useEffect` é executado à mão para que o evento de
// impressão exista de verdade — sem isso, "o evento carrega o ramo" seria uma
// afirmação sobre código que nunca correu.
function renderDoor({ readyClips, currency = 'usd', notPaidProven = true, reason = 'credits' } = {}) {
  const events = []
  const effects = []
  const box = { exports: {} }
  const deps = {
    react: {
      ...React,
      useEffect: (fn) => { effects.push(fn) },
      useRef: (current) => ({ current }),
      useState: (initial) => [initial, () => {}],
      useMemo: (fn) => fn(),
    },
    'react/jsx-runtime': jsx,
    '@/lib/analytics': { trackEvent: (...args) => events.push(args) },
    '@/lib/checkoutTelemetry': {
      useCheckoutLaunch: () => ({ pending: null, error: null, setError: () => {}, launch: () => true, release: () => {} }),
    },
  }
  const js = ts.transpileModule(doorSrc, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  vm.runInNewContext(
    js,
    { module: box, exports: box.exports, console, process: { env: { NODE_ENV: 'test' } }, require: (id) => (id in deps ? deps[id] : loadModule(resolveSpec(id, DOOR))) },
    { filename: DOOR },
  )
  const Door = box.exports.default
  const html = renderToStaticMarkup(Door({ currency, region: 'standard', notPaidProven, reason, readyClips }))
  effects.forEach((fn) => fn())
  return { html, events, exports: box.exports }
}

const CLIPS_15 = Array.from({ length: 15 }, (_, i) => 'https://cdn.pixabay.com/video/clip-' + i + '.mp4')

// ═══ 1. A FONTE ÚNICA DA CONTAGEM ═══════════════════════════════════════════
// A regra factual ("o que conta como clipe rodado") tem de existir UMA vez. Se
// cada folha filtrar por conta própria, as duas podem divergir e o evento de
// impressão passa a mentir sobre qual delas a pessoa viu.
check('a fonte unica existe e exige http(s)', () => {
  const m = nucleoBody.match(/export function filterShotClips\([\s\S]{0,600}?\n\}/)
  assert.ok(m, 'filterShotClips nao existe na fonte unica')
  assert.ok(
    m[0].includes("startsWith('https://')") && m[0].includes("startsWith('http://')"),
    'o filtro nao exige http(s) — blob:/data: entrariam na contagem',
  )
  assert.match(m[0], /if \(!Array\.isArray\(urls\)\) return \[\]/, 'entrada nao-array nao falha fechada')
})

check('countShotClips DERIVA de filterShotClips (um predicado, nao dois)', () => {
  const m = nucleoBody.match(/export function countShotClips\([\s\S]{0,300}?\n\}/)
  assert.ok(m, 'countShotClips nao existe')
  assert.match(m[0], /return filterShotClips\(urls\)\.length/, 'countShotClips tem predicado proprio')
})

check('a fonte unica e pura: nenhum import no arquivo', () => {
  assert.ok(!/^import\s/m.test(nucleoSrc), 'o nucleo ganhou import — o guardiao alheio o compila isolado')
})

check('as DUAS folhas consomem a fonte unica', () => {
  assert.match(doorSrc, /import \{ countShotClips, decideTrialDoorOffer \} from '@\/lib\/growth\/cleanFilmTrialDoor'/, 'o modal nao importa a fonte unica')
  const cheia = read('components/CardEntryDoor.tsx')
  assert.match(cheia, /import \{ filterShotClips \} from '@\/lib\/growth\/cleanFilmTrialDoor'/, 'a porta cheia nao importa a fonte unica')
  assert.ok(
    !/startsWith\('https:\/\/'\)/.test(doorBody),
    'o modal reintroduziu um predicado proprio de URL',
  )
})

// ═══ 2. A CAIXA RECEBE OS CLIPES DE VERDADE ═════════════════════════════════
check('a caixa declara a prop readyClips', () => {
  assert.match(doorBody, /readyClips\?\s*:\s*readonly string\[\]\s*\|\s*null/, 'prop readyClips ausente ou com outro tipo')
  assert.match(doorBody, /export default function UpgradeModalTrialDoor\(\{[\s\S]{0,240}readyClips,/, 'readyClips nao e desestruturada')
})

check('filmIsShot deriva da contagem real, e nada mais', () => {
  assert.match(doorBody, /const shotClips = countShotClips\(readyClips\)/, 'shotClips nao vem da fonte unica')
  assert.match(doorBody, /const filmIsShot = shotClips > 0/, 'filmIsShot nao deriva de shotClips')
})

// O elo mais frágil da corrente: a prop pode existir e ninguém ligá-la.
check('o GenerateClient LIGA os clipes reais ate a caixa (os DOIS elos)', () => {
  const idx = generateSrc.indexOf('<UpgradeModalTrialDoor')
  assert.ok(idx > 0, 'a caixa nao e montada em ' + GENERATE)
  assert.match(generateSrc.slice(idx, idx + 400), /readyClips=\{readyClips\}/, 'elo 2: a caixa e montada SEM readyClips')

  const mount = generateSrc.indexOf('<UpgradeModal\n')
  assert.ok(mount > 0, 'o UpgradeModal nao e montado')
  assert.match(generateSrc.slice(mount, mount + 1400), /readyClips=\{clipUrls\}/, 'elo 1: o UpgradeModal nao recebe os clipes da tela')
  assert.match(generateSrc, /const \[clipUrls, setClipUrls\] = useState<string\[\]>/, 'clipUrls nao e o estado dos clipes')
})

// ═══ 3. OS DOIS RAMOS, RENDERIZADOS ═════════════════════════════════════════
check('SEM clipes a caixa continua a de antes (nenhum fato inventado)', () => {
  const { html } = renderDoor({ readyClips: [] })
  assert.ok(html.includes('CHEAPEST WAY IN'), 'a caixa sumiu no ramo antigo')
  assert.ok(!html.includes('already shot'), 'a caixa afirma filme rodado sem clipe nenhum')
  assert.ok(!/data-trial-door-shot/.test(html), 'a linha do fato apareceu sem clipes')
})

check('COM 15 clipes a caixa diz o que ja esta feito', () => {
  const { html } = renderDoor({ readyClips: CLIPS_15 })
  assert.ok(html.includes('Script written and 15 clips already shot for this film'), 'a caixa nao conta o trabalho pronto')
  assert.match(html, /data-trial-door-shot="15"/, 'a marca da contagem nao bate')
  assert.ok(html.includes('CHEAPEST WAY IN'), 'o ramo novo derrubou a caixa')
})

check('a contagem e o numero REAL, com singular correto', () => {
  const um = renderDoor({ readyClips: ['https://cdn.pixabay.com/video/a.mp4'] }).html
  assert.ok(um.includes('1 clip already shot'), 'singular errado')
  assert.ok(!um.includes('1 clips already shot'), 'plural indevido no singular')
  const tres = renderDoor({ readyClips: CLIPS_15.slice(0, 3) }).html
  assert.ok(tres.includes('3 clips already shot'), 'a contagem nao acompanha a lista')
})

check('URL que nao e http(s) NAO vira promessa de filme feito', () => {
  const { html } = renderDoor({ readyClips: ['blob:http://localhost/abc', 'data:video/mp4;base64,AAAA'] })
  assert.ok(!html.includes('already shot'), 'blob:/data: viraram "clipe rodado"')
  assert.ok(!/data-trial-door-shot/.test(html), 'a linha do fato apareceu com resto de tentativa morta')
})

// ═══ 4. A FRONTEIRA DA HONESTIDADE ══════════════════════════════════════════
// "Already shot" é verdade. "This film clean" seria mentira: não há arquivo na
// mão da pessoa — o render é justamente o que os créditos vão pagar.
check('a caixa NAO promete o filme pronto nem o arquivo limpo', () => {
  const { html } = renderDoor({ readyClips: CLIPS_15 })
  assert.ok(!/this film clean/i.test(html), 'a caixa promete tirar marca d\'agua de um arquivo que nao existe')
  assert.ok(!/your film is ready|ready to download|film is done/i.test(html), 'a caixa promete filme pronto')
})

check('unlocksCurrentFilm continua false na chamada do nucleo', () => {
  const m = doorBody.match(/decideTrialDoorOffer\(\{[\s\S]{0,600}?\}\)/)
  assert.ok(m, 'nao achei a chamada do nucleo')
  assert.match(m[0], /unlocksCurrentFilm:\s*false/, 'a caixa ligou a manchete "this film clean"')
})

check('a linha do fato nao carrega preco (dinheiro so pela fonte canonica)', () => {
  const bloco = doorBody.match(/\{filmIsShot \? \(([\s\S]{0,700}?)\) : null\}/)
  assert.ok(bloco, 'a linha do fato nao e guardada por filmIsShot')
  // As interpolacoes `${...}` saem antes: o cifrao de um template literal nao e
  // dinheiro. O que sobra e o TEXTO que a pessoa le.
  const texto = bloco[1].replace(/\$\{[^}]*\}/g, '')
  assert.ok(
    !/\$\d|USD|EUR|BRL|\bprice\b|\/month|\bcredits?\b|\bday\s*\d/i.test(texto),
    'a linha do fato digitou dinheiro: ' + texto.trim().slice(0, 120),
  )
  // E a prova positiva: o dinheiro da caixa continua vindo do nucleo.
  assert.match(doorBody, /\{door\.priceNote\}/, 'a nota de preco deixou de vir do nucleo')
})

// ═══ 5. A MEDIÇÃO QUE SEPARA OS DOIS RAMOS ══════════════════════════════════
// Sem estes campos, as duas folhas chegam idênticas ao banco e nenhuma leitura
// posterior consegue comparar (memória `superficie-medida-por-copia-da-regra`).
check('a impressao carrega o ramo, com os MESMOS nomes da porta cheia', () => {
  const { events } = renderDoor({ readyClips: CLIPS_15 })
  const ev = events.find(([nome]) => nome === 'upgrade_modal_trial_door_shown')
  assert.ok(ev, 'a impressao nao foi emitida')
  assert.equal(ev[1].ready_clips, 15, 'ready_clips ausente ou errado na impressao')
  assert.equal(ev[1].film_already_shot, true, 'film_already_shot ausente ou errado na impressao')
})

check('a impressao do ramo antigo diz false, e nao omite o campo', () => {
  const { events } = renderDoor({ readyClips: [] })
  const ev = events.find(([nome]) => nome === 'upgrade_modal_trial_door_shown')
  assert.ok(ev, 'a impressao nao foi emitida no ramo antigo')
  assert.equal(ev[1].ready_clips, 0, 'ready_clips deveria ser 0')
  assert.equal(ev[1].film_already_shot, false, 'film_already_shot deveria ser false — omitir apaga o denominador')
})

check('o CLIQUE tambem carrega o ramo (senao a taxa fica sem numerador)', () => {
  const trecho = doorBody.slice(doorBody.indexOf('upgrade_modal_trial_door_clicked'))
  const fim = trecho.indexOf('checkout.launch')
  assert.ok(fim > 0, 'nao achei o corpo do clique')
  const corpo = trecho.slice(0, fim)
  assert.match(corpo, /ready_clips: shotClips/, 'o clique nao carrega ready_clips')
  assert.match(corpo, /film_already_shot: filmIsShot/, 'o clique nao carrega film_already_shot')
})

// ═══ 6. O QUE JÁ EXISTIA CONTINUA DE PÉ ═════════════════════════════════════
check('a caixa continua fechando para quem o cobrador recusa', () => {
  const paga = renderDoor({ readyClips: CLIPS_15, notPaidProven: false }).html
  assert.equal(paga, '', 'a caixa apareceu para quem ja pagou')
  const semMoeda = renderDoor({ readyClips: CLIPS_15, currency: null }).html
  assert.equal(semMoeda, '', 'a caixa apareceu sem moeda resolvida')
})

check('a nota de capacidade (porta v2, 5d0a1c03) sobreviveu', () => {
  const { html } = renderDoor({ readyClips: CLIPS_15 })
  assert.match(html, /data-trial-door-capacity=/, 'a entrega de ontem foi derrubada')
})

console.log(`\n${checks} verificacoes OK — a caixa de $1 do modal sabe do filme ja rodado (${DOOR})`)

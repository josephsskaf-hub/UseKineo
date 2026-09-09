// GUARDIÃO — A PORTA DIZ A VERDADE QUANDO O FILME JÁ FOI RODADO. 09/09/2026.
//
// O QUE FOI MEDIDO (diário docs/SPRINT-CHATGPT-2026-09-09.md, r1, produção):
// das 15 pessoas da Versão B, 3 chegaram até a porta DEPOIS de `clips_ready` —
// roteiro escrito e clipes escolhidos — e levaram `compose_refused
// { used:1, limit:0 }`. Uma delas (ChatGPT/KH) fechou a folha em 3 SEGUNDOS e
// tentou mais duas vezes. A folha dizia "Your film, waiting to be made" para
// quem já tinha 13 clipes rodados: falso por omissão, e vendia uma promessa
// quando podia estar vendendo uma coisa que já existe.
//
// Este arquivo trava as três coisas que, quebrando em silêncio, devolvem a
// mentira:
//   (1) a porta RECEBE os clipes já rodados (prop + call site vivo);
//   (2) o texto muda pela VARIÁVEL que decide, não por acaso — rótulo, promessa
//       e a linha do fato são todos guardados por `filmIsShot`;
//   (3) o preview cai para o vídeo da casa se a URL do fornecedor morrer, sem
//       o TEXTO deixar de ser verdade.
//
// Estilo readFileSync + render real (react-dom/server), como o guardião irmão
// `test-porta-v2-2026-09-09.mjs`. NUNCA import com alias `@/`.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import React from 'react'
import * as jsx from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const root = path.resolve(import.meta.dirname, '..')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')

const DOOR = 'components/CardEntryDoor.tsx'
const GENERATE = 'app/(dashboard)/generate/GenerateClient.tsx'

const doorSrc = read(DOOR)
const generateSrc = read(GENERATE)

let checks = 0
const check = (label, fn) => {
  fn()
  checks++
  console.log('OK ' + label)
}

// O corpo, sem comentários: um comentário citando "13 clipes" não pode fazer
// uma asserção passar (nem reprovar).
const doorBody = doorSrc.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')

// ── render real da folha ────────────────────────────────────────────────────
const resolveSpec = (spec, fromRel) => {
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

function renderDoor({ prompt = 'Why Roman concrete still stands', language = 'en', readyClips } = {}) {
  const events = []
  const box = { exports: {} }
  const deps = {
    react: { ...React, useEffect: () => {}, useRef: (current) => ({ current }), useState: (initial) => [initial, () => {}], useMemo: (fn) => fn() },
    'react/jsx-runtime': jsx,
    '@/lib/analytics': { trackEvent: (...args) => events.push(args) },
    '@/lib/checkoutTelemetry': {
      useCheckoutLaunch: () => ({ pending: null, error: null, setError: () => {}, launch: () => true, release: () => {} }),
    },
    '@/components/InterfaceLanguage': { useInterfaceLanguage: () => language },
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
  return { html: renderToStaticMarkup(Door({ prompt, readyClips, onDismiss: () => {} })), events, exports: box.exports }
}

const CLIPS_13 = Array.from({ length: 13 }, (_, i) => 'https://cdn.pixabay.com/video/clip-' + i + '.mp4')

// ═══ 1. A PORTA RECEBE OS CLIPES ════════════════════════════════════════════
check('a folha declara a prop readyClips', () => {
  assert.match(doorBody, /readyClips\?\s*:\s*readonly string\[\]\s*\|\s*null/, 'prop readyClips ausente ou com outro tipo')
  assert.match(doorBody, /export default function CardEntryDoor\(\{[\s\S]{0,200}readyClips,/, 'readyClips nao e desestruturada nos parametros')
})

check('o GenerateClient LIGA os clipes reais na porta (call site vivo)', () => {
  const idx = generateSrc.indexOf('<CardEntryDoor')
  assert.ok(idx > 0, 'a porta nao e montada em ' + GENERATE)
  const bloco = generateSrc.slice(idx, idx + 900)
  assert.match(bloco, /readyClips=\{clipUrls\}/, 'a porta e montada SEM readyClips — a folha nunca saberia do filme feito')
  // clipUrls precisa ser o estado que guarda os clipes rodados, nao um nome solto.
  assert.match(generateSrc, /const \[clipUrls, setClipUrls\] = useState<string\[\]>/, 'clipUrls nao e o estado dos clipes')
})

// ═══ 2. O TEXTO MUDA PELA VARIÁVEL QUE DECIDE ═══════════════════════════════
// Mutante que troca `filmIsShot ? A : B` por `A` mantem todas as strings
// presentes no arquivo: contar texto nao prova nada. As asercoes abaixo
// amarram cada troca a VARIAVEL que decide.
check('filmIsShot deriva do numero de clipes validos, e nada mais', () => {
  assert.match(doorBody, /const filmIsShot = shotClips\.length > 0/, 'filmIsShot nao deriva de shotClips.length')
  assert.match(doorBody, /const shotClips = useMemo\(/, 'shotClips nao e derivado de readyClips')
})

check('so URL http(s) conta como clipe rodado', () => {
  const m = doorBody.match(/const shotClips = useMemo\(([\s\S]{0,400}?)\n  \)/)
  assert.ok(m, 'nao achei o corpo de shotClips')
  assert.ok(
    m[1].includes("startsWith('https://')") && m[1].includes("startsWith('http://')"),
    'o filtro nao exige http(s) — blob:/data: entrariam na contagem',
  )
})

check('o rotulo da ideia e escolhido por filmIsShot', () => {
  assert.match(doorBody, /\{filmIsShot \? t\.yourIdeaShot : t\.yourIdea\}/, 'o rotulo nao e guardado por filmIsShot')
})
check('a promessa e escolhida por filmIsShot', () => {
  assert.match(doorBody, /\{filmIsShot \? t\.promiseShot : t\.promise\}/, 'a promessa nao e guardada por filmIsShot')
})
check('a linha do fato so existe quando filmIsShot', () => {
  assert.match(
    doorBody,
    /\{filmIsShot \? \(([\s\S]{0,320})t\.clipsReady\(shotClips\.length\)/,
    'a linha de clipes nao e guardada por filmIsShot, ou nao usa a contagem real',
  )
})

// ═══ 3. O PREVIEW CAI SEM DERRUBAR O TEXTO ══════════════════════════════════
check('showOwnClip exige filme rodado E preview vivo', () => {
  assert.match(doorBody, /const showOwnClip = filmIsShot && !clipPreviewFailed/, 'showOwnClip nao combina as duas condicoes')
})
check('o video escolhe a fonte por showOwnClip e volta para a casa no erro', () => {
  assert.match(doorBody, /src=\{showOwnClip \? shotClips\[0\] : ROBOT_VIDEO\}/, 'o <video> nao escolhe a fonte por showOwnClip')
  assert.match(
    doorBody,
    /onError=\{\(\) => \{ if \(showOwnClip\) setClipPreviewFailed\(true\) \}\}/,
    'sem fallback: uma URL morta deixa a folha com um quadro preto',
  )
})

// ═══ 4. O QUE A PESSOA VÊ — RENDER REAL ═════════════════════════════════════
const semClipes = renderDoor().html
const comClipes = renderDoor({ readyClips: CLIPS_13 }).html

check('SEM clipes a folha continua a de antes (promessa, video da casa, sem o fato)', () => {
  assert.ok(semClipes.includes('waiting to be made'), 'o rotulo antigo sumiu do ramo sem clipes')
  assert.ok(semClipes.includes('data-door-clip="house"'), 'o ramo sem clipes nao usa o video da casa')
  assert.ok(!semClipes.includes('data-door-clips-ready'), 'a linha do fato apareceu sem haver clipe algum')
  assert.ok(!/already shot/i.test(semClipes), 'a folha afirma "already shot" sem clipes')
})

check('COM 13 clipes a folha diz que o filme esta feito e mostra o clipe DELA', () => {
  assert.ok(comClipes.includes('Your film is already shot'), 'o rotulo nao mudou')
  assert.ok(comClipes.includes('One step left'), 'a promessa nao mudou')
  assert.ok(comClipes.includes('13 clips already shot'), 'a contagem real nao aparece na tela')
  assert.ok(comClipes.includes('data-door-clip="own"'), 'a folha nao marca que esta mostrando o material da pessoa')
  assert.ok(comClipes.includes(CLIPS_13[0]), 'o primeiro clipe da pessoa nao virou o video da folha')
  assert.ok(!comClipes.includes('waiting to be made'), 'os dois rotulos apareceram juntos')
})

check('a contagem e o numero REAL de clipes, com singular correto', () => {
  const um = renderDoor({ readyClips: ['https://cdn.pixabay.com/video/one.mp4'] }).html
  assert.ok(um.includes('1 clip already shot'), 'singular errado ou contagem cravada')
  assert.ok(!um.includes('1 clips'), 'plural indevido no singular')
  const cinco = renderDoor({ readyClips: CLIPS_13.slice(0, 5) }).html
  assert.ok(cinco.includes('5 clips already shot'), 'a folha nao conta os clipes que recebeu')
})

check('URL que nao e http(s) NAO vira promessa de filme feito', () => {
  const html = renderDoor({ readyClips: ['blob:http://localhost/abc', 'data:video/mp4;base64,AA'] }).html
  assert.ok(html.includes('waiting to be made'), 'blob:/data: foram contados como clipe rodado')
  assert.ok(!html.includes('data-door-clips-ready'), 'a folha prometeu filme feito com URL invalida')
})

check('as tres linguas dizem o fato, e nenhuma delas carrega preco', () => {
  const pricing = loadModule('lib/checkoutPricing')
  const fee = pricing.CARD_TRIAL_ENTRY_FEE_MINOR / 100
  const monthly = pricing.TIER_PRICES.basic.usd / 100
  for (const language of ['en', 'es', 'hi']) {
    const html = renderDoor({ language, readyClips: CLIPS_13 }).html
    const bloco = (html.match(/data-door-clips-ready[^>]*>([\s\S]*?)<\/li>/) || [, ''])[1]
    assert.ok(bloco.includes('13'), 'a contagem nao aparece em ' + language)
    assert.ok(!new RegExp('\\$\\s*' + fee + '\\b').test(bloco), 'taxa de entrada literal na linha do fato (' + language + ')')
    assert.ok(!new RegExp('\\$\\s*' + monthly + '\\b').test(bloco), 'mensalidade literal na linha do fato (' + language + ')')
  }
})

check('a folha NAO promete render/entrega — so diz o que ja existe', () => {
  // "already shot" e verdade (os clipes existem). Prometer o filme PRONTO seria
  // mentira: o render final ainda nao rodou.
  assert.ok(!/your film is (ready|done|finished)\b/i.test(comClipes), 'a folha promete filme pronto — o render final ainda nao rodou')
})

// ═══ 5. O PLACAR SEPARA AS DUAS FOLHAS ══════════════════════════════════════
check('os tres eventos da folha carregam ready_clips e film_already_shot', () => {
  for (const nome of ['card_entry_door_shown', 'card_entry_door_dismissed', 'card_entry_door_clicked']) {
    const idx = doorBody.indexOf("trackEvent('" + nome + "'")
    assert.ok(idx > 0, nome + ' nao e emitido')
    const bloco = doorBody.slice(idx, idx + 700)
    assert.ok(bloco.includes('ready_clips: shotClips.length'), nome + ' nao carrega a contagem — as duas folhas chegam identicas ao banco')
    assert.ok(bloco.includes('film_already_shot: filmIsShot'), nome + ' nao carrega o ramo')
  }
})

console.log('\n' + checks + ' verificacoes OK — a porta diz a verdade sobre o filme ja rodado (' + DOOR + ')')

// KINEO-RESTAURACAO-2026-09-09 — APOSENTADO ENQUANTO A FONTE DISSER QUE ISTO ESTÁ DESLIGADO.
// Fundador (09/09 18h): "tira esse negócio de 1 dólar" / "voltar na minha melhor fase". Este guardião
// guarda a folha CardEntryDoor (porta de $1 v2). Se a fonte religar, o preâmbulo deixa de disparar e as verificações voltam.
import { readFileSync as __rf } from 'node:fs'
import { join as __j, dirname as __d } from 'node:path'
import { fileURLToPath as __f } from 'node:url'
{
  const __raiz = __j(__d(__f(import.meta.url)), '..')
  const __src = __rf(__j(__raiz, 'lib/checkoutPricing.ts'), 'utf8').replace(/\r\n/g, '\n')
  if (/export const CARD_TRIAL_LIVE = false/.test(__src)) {
    console.log('APOSENTADO (restauração 09/09/2026): a folha CardEntryDoor (porta de $1 v2) está desligado na fonte (lib/checkoutPricing.ts). Volta a valer sozinho no dia em que religar.')
    process.exit(0)
  }
}
// GUARDIÃO DA PORTA V2 (folha de $1 no momento do bloqueio) — 09/09/2026.
//
// Por que ele existe: em 08/09 a porta de $1 estava VISÍVEL dentro do
// UpgradeModal (`upgrade_modal_trial_door_shown`, 3 pessoas, `door_reason:'ok'`)
// e a única pessoa que clicou escolheu o plano de $9 ao lado. A folha nova
// substitui aquela caixa para a coorte da porta. Este arquivo trava as quatro
// coisas que, se quebrarem em silêncio, transformam a folha em mentira:
//   (1) nenhum preço digitado — tudo sai de lib/checkoutPricing;
//   (2) o produto comprado continua o mesmo (tier=basic&billing=monthly&trial=1),
//       só a campanha muda para door_v2;
//   (3) o rascunho é gravado ANTES do checkout;
//   (4) a faixa antiga continua montada no layout.
//
// Estilo readFileSync + render real com react-dom/server. NUNCA import com
// alias `@/` (não resolve fora do bundler; guardião que não roda serve zero).
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
const LAYOUT = 'app/(dashboard)/layout.tsx'

const doorSrc = read(DOOR)
const generateSrc = read(GENERATE)
const layoutSrc = read(LAYOUT)

let checks = 0
const check = (label, fn) => {
  fn()
  checks++
  console.log('OK ' + label)
}

// ── Carregador de módulo TS puro (resolve deps relativos e alias @/lib) ──────
const cache = new Map()
function loadModule(rel) {
  if (cache.has(rel)) return cache.get(rel)
  const box = { exports: {} }
  cache.set(rel, box.exports)
  const js = ts.transpileModule(read(rel), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText
  vm.runInNewContext(
    js,
    {
      module: box,
      exports: box.exports,
      console,
      // checkoutPricing checa invariantes fora de produção; sem isto o módulo
      // nem carrega dentro do vm.
      process: { env: { NODE_ENV: 'test' } },
      require: (id) => loadModule(resolveSpec(id, rel)),
    },
    { filename: rel },
  )
  cache.set(rel, box.exports)
  return box.exports
}
function resolveSpec(spec, from) {
  let base
  if (spec.startsWith('@/')) base = spec.slice(2)
  else if (spec.startsWith('.')) base = path.posix.join(path.posix.dirname(from.split(path.sep).join('/')), spec)
  else throw new Error('Unexpected dependency: ' + spec)
  for (const ext of ['.ts', '.tsx', '/index.ts']) {
    if (fs.existsSync(path.join(root, base + ext))) return base + ext
  }
  throw new Error('Unresolved: ' + spec + ' (from ' + from + ')')
}

const pricing = loadModule('lib/checkoutPricing.ts')
const entry = loadModule('lib/entryPolicy.ts')

// A folha é um componente client: React, telemetria e idioma entram como
// dublês. Tudo o mais (preço, política, fatos) é o módulo REAL do repositório.
function loadDoor({ language = 'en', events = [] } = {}) {
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
    {
      module: box,
      exports: box.exports,
      console,
      process: { env: { NODE_ENV: 'test' } },
      require: (id) => (id in deps ? deps[id] : loadModule(resolveSpec(id, DOOR))),
    },
    { filename: DOOR },
  )
  return box.exports
}

// ═══ 1. FONTE ÚNICA DE PREÇO ════════════════════════════════════════════════
// O defeito que isto impede: alguém "conserta" a copy digitando $1/$19/80 e a
// tela passa a mentir no dia em que o preço muda. Só o CORPO do arquivo é
// varrido — comentários e a lista de imports podem citar números ao explicar.
const doorBody = doorSrc
  .split('\n')
  .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
  .join('\n')

check('a folha não digita a taxa de entrada em lugar nenhum do corpo', () => {
  const fee = pricing.CARD_TRIAL_ENTRY_FEE_MINOR / 100
  assert.ok(!new RegExp('\\$\\s*' + fee + '\\b').test(doorBody), 'literal da taxa no corpo de ' + DOOR)
})
check('a folha não digita a mensalidade do Creator no corpo', () => {
  const monthly = pricing.TIER_PRICES.basic.usd / 100
  assert.ok(!new RegExp('\\$\\s*' + monthly + '\\b').test(doorBody), 'literal da mensalidade no corpo de ' + DOOR)
  assert.ok(!new RegExp('\\b' + monthly + '\\s*/\\s*(mo|month)').test(doorBody), 'mensalidade digitada em "/mo"')
})
check('a folha não digita o número de créditos do trial no corpo', () => {
  const credits = pricing.CARD_TRIAL_GRANT_CREDITS
  assert.ok(!new RegExp('\\b' + credits + '\\s*(credits|créditos|क्रेडिट)').test(doorBody), 'créditos digitados no corpo')
})
check('a folha não digita a quantidade de dias do trial no corpo', () => {
  const days = pricing.CARD_TRIAL_DAYS
  assert.ok(!new RegExp('\\b' + days + '\\s*(days|días|दिन)\\b').test(doorBody), 'dias digitados no corpo')
})
check('a folha importa as quatro constantes de preço da fonte única', () => {
  for (const name of ['CARD_TRIAL_DAYS', 'CARD_TRIAL_ENTRY_FEE_MINOR', 'CARD_TRIAL_GRANT_CREDITS', 'formatCheckoutMoney']) {
    assert.ok(doorSrc.includes(name), name + ' não é importado por ' + DOOR)
  }
  assert.match(doorSrc, /from '@\/lib\/checkoutPricing'/)
})
check('a folha usa formatCheckoutMoney para os dois rótulos de dinheiro', () => {
  assert.match(doorBody, /formatCheckoutMoney\(money,\s*CARD_TRIAL_ENTRY_FEE_MINOR\)/)
  assert.match(doorBody, /formatCheckoutMoney\(money,\s*getTierPrice\('basic'/)
})

// ═══ 2. O PRODUTO COMPRADO NÃO MUDA — SÓ A CAMPANHA ═════════════════════════
check('o caminho da folha é o caminho canônico com a campanha trocada', () => {
  const doorModule = loadDoor()
  const url = new URL(doorModule.CARD_ENTRY_DOOR_CHECKOUT_PATH, 'https://x.invalid')
  assert.equal(url.pathname, '/api/stripe/checkout')
  assert.equal(url.searchParams.get('tier'), 'basic')
  assert.equal(url.searchParams.get('billing'), 'monthly')
  assert.equal(url.searchParams.get('trial'), '1')
  assert.equal(url.searchParams.get('intent_campaign'), 'door_v2')
})
check('o caminho da folha difere do canônico APENAS no intent_campaign', () => {
  const doorModule = loadDoor()
  const canonical = new URL(entry.CARD_ENTRY_CHECKOUT_PATH, 'https://x.invalid')
  const mine = new URL(doorModule.CARD_ENTRY_DOOR_CHECKOUT_PATH, 'https://x.invalid')
  assert.equal(mine.pathname, canonical.pathname)
  for (const [key, value] of canonical.searchParams) {
    if (key === 'intent_campaign') continue
    assert.equal(mine.searchParams.get(key), value, 'parâmetro alterado: ' + key)
  }
  assert.notEqual(mine.searchParams.get('intent_campaign'), canonical.searchParams.get('intent_campaign'))
})
check('a campanha é door_v2 e é derivada, não digitada duas vezes', () => {
  const doorModule = loadDoor()
  assert.equal(doorModule.CARD_ENTRY_DOOR_VERSION, 'door_v2')
  assert.match(doorBody, /CARD_ENTRY_CHECKOUT_PATH\.replace\(/, 'o caminho tem que nascer do canônico')
})

// ═══ 3. O RASCUNHO É GRAVADO ANTES DO CHECKOUT ══════════════════════════════
check('a folha grava o rascunho antes de chamar checkout.launch', () => {
  const setIdx = doorBody.indexOf('sessionStorage.setItem(STUDIO_DRAFT_KEY')
  const launchIdx = doorBody.indexOf('checkout.launch(')
  assert.ok(setIdx > 0, 'a folha não grava o rascunho')
  assert.ok(launchIdx > 0, 'a folha não chama o launcher')
  assert.ok(setIdx < launchIdx, 'o rascunho é gravado DEPOIS do checkout — a ideia se perde')
})
check('a chave do rascunho é a mesma que o GenerateClient restaura', () => {
  const doorModule = loadDoor()
  assert.equal(doorModule.STUDIO_DRAFT_KEY, 'kineo_studio_draft_v1')
  // REANCORADO 09/09 (r4): a chave deixou de ser um literal repetido em 4
  // arquivos e passou a ter dono unico. A intencao — a folha e o Studio usarem
  // A MESMA chave — ficou MAIS estrita: agora se prova que o Studio importa a
  // constante do dono, em vez de conferir que ele redigitou o mesmo texto.
  assert.ok(generateSrc.includes("from '@/lib/growth/cardEntryResumeDraft'"), 'o Studio nao importa mais a chave do dono')
  assert.ok(generateSrc.includes('sessionStorage.getItem(CARD_ENTRY_DRAFT_KEY)'), 'o Studio nao le a chave compartilhada')
  assert.ok(!generateSrc.includes("'kineo_studio_draft_v1'"), 'o Studio voltou a redigitar a chave')
})
check('a folha não duplica o resume=card_entry que já existe', () => {
  assert.ok(!doorBody.includes('resume=card_entry'), DOOR + ' recriou o caminho de volta')
  assert.ok(generateSrc.includes("'card_entry'"), 'o resume do GenerateClient sumiu')
})

// ═══ 4. OS TRÊS EVENTOS ═════════════════════════════════════════════════════
for (const name of ['card_entry_door_shown', 'card_entry_door_clicked', 'card_entry_door_dismissed']) {
  check('evento presente: ' + name, () => {
    assert.ok(doorBody.includes("'" + name + "'"), name + ' não é emitido')
  })
}
check('os três eventos carregam version, path, prompt_len e surface', () => {
  for (const field of ['version:', 'path:', 'prompt_len:', 'surface:']) {
    assert.ok(doorBody.includes(field), 'campo ausente nos eventos: ' + field)
  }
})

// ═══ 5. A LIGAÇÃO NO BLOQUEIO ═══════════════════════════════════════════════
check('o GenerateClient monta a folha', () => {
  assert.match(generateSrc, /import CardEntryDoor from '@\/components\/CardEntryDoor'/)
  assert.match(generateSrc, /<CardEntryDoor/)
})
check('a folha abre NO LUGAR do UpgradeModal para a coorte da porta', () => {
  const fn = generateSrc.slice(generateSrc.indexOf('function openOutOfCreditsModal'))
  const cohortIdx = fn.indexOf('const cardEntryCohort')
  const guardIdx = fn.indexOf('if (cardEntryCohort)')
  const modalIdx = fn.indexOf('setShowUpgradeModal(true)')
  assert.ok(cohortIdx > 0, 'a coorte da porta não é calculada')
  assert.ok(guardIdx > cohortIdx, 'a coorte não é usada')
  assert.ok(modalIdx > guardIdx, 'o UpgradeModal abre ANTES da guarda — as duas caixas coexistem')
  assert.ok(fn.slice(guardIdx, modalIdx).includes('return'), 'a guarda não interrompe o fluxo do modal')
})
check('a coorte exige saldo LIDO (falha fechada) e conta que nunca pagou', () => {
  const fn = generateSrc.slice(generateSrc.indexOf('const cardEntryCohort'), generateSrc.indexOf('if (cardEntryCohort)'))
  assert.ok(fn.includes('!hasPaid'), 'a coorte não exclui quem já pagou')
  assert.ok(fn.includes('credits !== null'), 'saldo desconhecido abriria a oferta')
  assert.ok(/isStarter \|\| isCreator \|\| isStudio/.test(fn), 'a coorte não exclui assinante')
})
// A REGRA DA CASA, que esta entrega quase quebrou. A primeira versão da coorte
// escrevia `CARD_ENTRY_ONLY &&`, e o guardião de outra pista
// (`test-telas-sem-filme-gratis-2026-09-08`) reprovou: "a condição não se
// redigita". `freeFilmAvailable` é `OFFER.limit > 0`, o número do PRÓPRIO
// cobrador — derivar da política cria uma segunda régua, que diverge no dia em
// que a casa reabrir o filme grátis (a folha apareceria para quem TEM filme
// incluído). Este check impede a volta pela porta dos fundos.
check('a coorte pergunta ao COBRADOR, não redigita a política de entrada', () => {
  const fn = generateSrc.slice(generateSrc.indexOf('const cardEntryCohort'), generateSrc.indexOf('if (cardEntryCohort)'))
  assert.ok(fn.includes('!freeFilmAvailable'), 'a coorte não consulta freeFilmAvailable (OFFER.limit)')
  assert.ok(!/=\s*!?\s*CARD_ENTRY_ONLY/.test(fn), 'a coorte foi redigitada a partir de CARD_ENTRY_ONLY')
  assert.match(generateSrc, /const freeFilmAvailable\s*=\s*OFFER\.limit\s*>\s*0/, 'freeFilmAvailable deixou de sair de OFFER.limit')
})
check('footage continua indo para o UpgradeModal (é lá que mora o pacote)', () => {
  const fn = generateSrc.slice(generateSrc.indexOf('const cardEntryCohort'), generateSrc.indexOf('if (cardEntryCohort)'))
  assert.ok(!fn.includes("'footage'"), 'footage entraria na folha')
  assert.ok(fn.includes("=== 'credits'"), 'a folha não está restrita aos motivos de crédito')
})

// O ganho de tabela da substituição, e por que ele não pode ser desfeito sem
// querer: `TopupUnavailableNote` — "recarga indisponível" — é montado DENTRO do
// UpgradeModal. Medido em 08/09, ele apareceu 5× para 3 pessoas no MESMO
// instante do bloqueio: a casa anunciava um produto indisponível colado na
// única oferta que queria ver aceita, no pico de intenção. Trocando a caixa
// pela folha, a coorte da porta deixa de ver isso. Se alguém montar a nota
// fora do modal, este check fica vermelho.
check('o aviso de "recarga indisponível" vive dentro do UpgradeModal, não no caminho da folha', () => {
  const modalIdx = generateSrc.indexOf('function UpgradeModal')
  assert.ok(modalIdx > 0, 'não achei a definição do UpgradeModal')
  const montagens = [...generateSrc.matchAll(/<TopupUnavailableNote/g)].map((m) => m.index)
  assert.ok(montagens.length > 0, 'a nota sumiu da tela — quem pode comprar recarga precisa dela')
  for (const idx of montagens) {
    assert.ok(idx > modalIdx, 'TopupUnavailableNote montada FORA do UpgradeModal: a folha voltaria a exibi-la')
  }
})

// ═══ 6. A FAIXA ANTIGA CONTINUA MONTADA ═════════════════════════════════════
check('CardEntryBanner segue montada no layout do dashboard', () => {
  assert.match(layoutSrc, /import CardEntryBanner from '@\/components\/CardEntryBanner'/)
  assert.match(layoutSrc, /<CardEntryBanner/)
  assert.ok(fs.existsSync(path.join(root, 'components/CardEntryBanner.tsx')), 'a faixa foi apagada')
})

// ═══ 7. RENDER REAL — o que a pessoa lê na tela ═════════════════════════════
function renderDoor({ prompt = 'Why the Roman concrete still stands', language = 'en' } = {}) {
  const events = []
  const box = { exports: {} }
  const deps = {
    react: { ...React, useEffect: () => {}, useRef: (current) => ({ current }), useState: (initial) => [initial, () => {}], useMemo: (fn) => fn() },
    'react/jsx-runtime': jsx,
    '@/lib/analytics': { trackEvent: (...args) => events.push(args) },
    '@/lib/checkoutTelemetry': { useCheckoutLaunch: () => ({ pending: null, error: null, setError: () => {}, launch: () => true, release: () => {} }) },
    '@/components/InterfaceLanguage': { useInterfaceLanguage: () => language },
  }
  const js = ts.transpileModule(doorSrc, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  vm.runInNewContext(
    js,
    {
      module: box,
      exports: box.exports,
      console,
      // checkoutPricing checa invariantes fora de produção; sem isto o módulo
      // nem carrega dentro do vm.
      process: { env: { NODE_ENV: 'test' } },
      require: (id) => (id in deps ? deps[id] : loadModule(resolveSpec(id, DOOR))),
    },
    { filename: DOOR },
  )
  const Door = box.exports.default
  return { html: renderToStaticMarkup(Door({ prompt, onDismiss: () => {} })), events, exports: box.exports }
}

check('a tela mostra o preço montado da fonte única, nas três moedas de rótulo', () => {
  const { html } = renderDoor()
  const fee = pricing.formatCheckoutMoney('usd', pricing.CARD_TRIAL_ENTRY_FEE_MINOR)
  const monthly = pricing.formatCheckoutMoney('usd', pricing.getTierPrice('basic', 'usd', 'standard'))
  assert.ok(html.includes(fee), 'a taxa não aparece na tela: ' + fee)
  assert.ok(html.includes(monthly), 'a mensalidade não aparece na tela: ' + monthly)
  assert.ok(html.includes(String(pricing.CARD_TRIAL_DAYS) + ' days'), 'os dias não aparecem')
})
check('a tela cita a ideia da pessoa, entre aspas', () => {
  const { html } = renderDoor({ prompt: 'Why the Roman concrete still stands' })
  assert.ok(html.includes('Why the Roman concrete still stands'), 'a ideia da pessoa não aparece')
  assert.ok(html.includes('data-door-idea'), 'o bloco da ideia sumiu')
})
check('ideia longa é cortada em 140 e ganha reticências', () => {
  const { exports } = renderDoor()
  const long = 'a'.repeat(400)
  const trimmed = exports.trimIdeaForDoor(long)
  assert.equal(trimmed.length, exports.DOOR_PROMPT_MAX_CHARS)
  assert.ok(trimmed.endsWith('…'))
  assert.equal(exports.trimIdeaForDoor('  curta  '), 'curta')
})
check('sem ideia escrita, a folha não inventa uma citação vazia', () => {
  const { html } = renderDoor({ prompt: '   ' })
  assert.ok(!html.includes('data-door-idea'), 'citação vazia renderizada')
  assert.ok(html.includes('data-card-entry-door'), 'a folha sumiu junto')
})
check('a tela tem UM botão de compra e nenhuma segunda oferta', () => {
  const { html } = renderDoor()
  const buys = html.split('card-entry-door-cta').length - 1
  assert.equal(buys, 1, 'mais de um botão de compra na folha')
  for (const rival of ['Starter', 'Studio', 'Autopilot', 'Top up', 'top up']) {
    assert.ok(!html.includes(rival), 'oferta rival dentro da porta: ' + rival)
  }
})
check('o vídeo do robô entra mudo, em loop e com poster', () => {
  const { html } = renderDoor()
  assert.ok(html.includes('/previews/36a04f7b-65f7-42d9-a2ab-198b5a7f115e.mp4'), 'o robô não está na folha')
  assert.ok(html.includes('/posters/36a04f7b-65f7-42d9-a2ab-198b5a7f115e.jpg'), 'sem poster: tela preta na rede lenta')
  assert.ok(/<video[^>]*\bmuted\b/.test(html) || html.includes('muted=""'), 'o vídeo não está mudo')
  assert.ok(html.includes('playsInline') || html.includes('playsinline'), 'iOS abriria em tela cheia')
})
check('os arquivos do robô existem no repositório', () => {
  assert.ok(fs.existsSync(path.join(root, 'public/previews/36a04f7b-65f7-42d9-a2ab-198b5a7f115e.mp4')))
  assert.ok(fs.existsSync(path.join(root, 'public/posters/36a04f7b-65f7-42d9-a2ab-198b5a7f115e.jpg')))
})
check('o botão tem 48px de altura (dedo, não mouse) e ocupa a largura', () => {
  assert.match(doorBody, /minHeight:\s*48/)
  assert.match(doorBody, /maxHeight:\s*'40vh'/)
})
check('a folha cobre a tela inteira e rola quando não cabe', () => {
  assert.match(doorBody, /position:\s*'fixed'/)
  assert.match(doorBody, /inset:\s*0/)
  assert.match(doorBody, /overflowY:\s*'auto'/)
})
check('a cobertura em filmes é calculada, e bate com a conta da casa', () => {
  const { html } = renderDoor()
  const marketing = loadModule('lib/marketingPrice.ts')
  const label = loadModule('lib/engineLabel.ts').engineLabelFor('fast')
  const films = Math.floor(pricing.CARD_TRIAL_GRANT_CREDITS / marketing.creditsPerReferenceVideo('fast'))
  assert.ok(films > 0, 'a conta da casa não fecha em nenhum filme')
  assert.ok(html.includes(String(films) + ' full ' + label), 'a cobertura da tela não bate com o cálculo: ' + films + ' × ' + label)
})
check('as três línguas trocam a frase, e nenhuma delas carrega preço', () => {
  const en = renderDoor({ language: 'en' }).html
  const es = renderDoor({ language: 'es' }).html
  const hi = renderDoor({ language: 'hi' }).html
  assert.ok(en.includes('Make this film'))
  assert.ok(es.includes('Crear esta película'), 'espanhol não trocou o botão')
  assert.ok(hi.includes('फ़िल्म'), 'hindi não trocou o botão')
  const fee = pricing.formatCheckoutMoney('usd', pricing.CARD_TRIAL_ENTRY_FEE_MINOR)
  for (const [lang, html] of [['es', es], ['hi', hi]]) {
    assert.ok(html.includes(fee), 'a moeda sumiu em ' + lang)
  }
})
// A trava do defeito que o OLHO achou e as asserções não: `CARD_ENTRY_COPY` é
// uma constante de copy, não passa pelo dicionário de interface. Renderizá-la
// aqui devolve um parágrafo em INGLÊS para quem escolheu espanhol ou hindi — e,
// de quebra, repete o preço da linha de baixo e empurra o botão para fora da
// dobra do celular. Nenhum texto longo da tela pode vir de lá.
check('o título da folha é traduzido — nada de copy travada em inglês', () => {
  const en = renderDoor({ language: 'en' }).html
  const es = renderDoor({ language: 'es' }).html
  const hi = renderDoor({ language: 'hi' }).html
  const titulo = (html) => (html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) ?? [, ''])[1]
  assert.ok(titulo(en).length > 0, 'a folha ficou sem título')
  assert.notEqual(titulo(es), titulo(en), 'o título não muda em espanhol')
  assert.notEqual(titulo(hi), titulo(en), 'o título não muda em hindi')
  for (const [lang, html] of [['es', es], ['hi', hi]]) {
    assert.ok(!html.includes(entry.CARD_ENTRY_COPY.headline), 'headline em inglês renderizada em ' + lang)
    assert.ok(!html.includes(entry.CARD_ENTRY_COPY.sentence), 'sentence em inglês renderizada em ' + lang)
  }
})
check('o título não repete o preço que a linha de preço já diz', () => {
  const titulo = (renderDoor().html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) ?? [, ''])[1]
  assert.ok(!titulo.includes('$'), 'preço dentro do título: ' + titulo)
  assert.ok(!/\d/.test(titulo), 'número dentro do título: ' + titulo)
})

check('a impressão NÃO é emitida por renderizar no servidor', () => {
  const { events } = renderDoor()
  assert.equal(events.length, 0, 'SSR disparou telemetria de impressão')
})
check('a folha não puxa nada de servidor para dentro do bundle do cliente', () => {
  const seen = new Set()
  const bad = []
  const walk = (rel) => {
    if (seen.has(rel)) return
    seen.add(rel)
    const src = read(rel)
    for (const m of src.matchAll(/from '([^']+)'/g)) {
      const spec = m[1]
      if (/^(node:|fs$|path$|crypto$|child_process$|server-only$|next\/headers$)/.test(spec)) bad.push(rel + ' -> ' + spec)
      if (spec.startsWith('@/') || spec.startsWith('.')) {
        try { walk(resolveSpec(spec, rel)) } catch { /* dep externa */ }
      }
    }
  }
  walk(DOOR)
  assert.deepEqual(bad, [], 'dependência de servidor na árvore da folha (tsc fica verde e a Vercel quebra)')
  assert.ok(seen.size > 3, 'a varredura não andou pela árvore')
})

console.log('\n' + checks + ' verificações OK — porta v2 (' + DOOR + ')')

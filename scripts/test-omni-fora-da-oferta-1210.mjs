// KINEO-OMNI-FORA-2026-10-12 — guardião da ordem do fundador (12/10, noite):
//   "tira o Omni sim… dos motores, a gente vai arrumar mais pra frente… mas NÃO tira os vídeos que ele nos proporcionou,
//    deixa os vídeos."
//
// O que este guardião trava (Node puro: readFileSync + asserts, sem alias @/, sem rede, sem banco):
//   (a) PAUSA ≠ FORA DA OFERTA: o Omni segue PAUSADO no servidor (recusa 423 antes de qualquer débito, charged:false) e
//       está em OFFER_RETIRED_ENGINE_KEYS (lib/engineLaunch.ts). A frase pública de pausa não o cita.
//   (b) O cliente não vê o Omni como motor escolhível nem anunciado: menu (home pública, Sidebar, MobileNav), seletores do
//       /studio e do /generate, tabelas de preço (/models-pricing, /pricing, calculadora, PaidEngineBudget), comparações
//       (/arena, régua de comparisons, tabela do Sora), llms.txt, fatos (/api/facts, GPT), schema, sitemap, próxima jogada.
//   (c) A página do motor e a comparação Omni × Sora viraram 301 (Kling 3 e /sora-alternative) e saíram do sitemap.
//   (d) Os VÍDEOS feitos com o Omni continuam na vitrine/exemplos/curadoria e o filme dos robôs segue no /ai-robot e no /ph.
// Mutantes em memória no fim: cada regressão típica tem de ficar vermelha.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
// Comentário não é copy: tira /* */ (inclusive {/* */} do JSX) e // (menos o "://" de URL).
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const FILES = {
  launch: 'lib/engineLaunch.ts',
  route: 'app/api/generate-video-cinematic/route.ts',
  landing: 'app/KineoLanding.tsx',
  sidebar: 'components/Sidebar.tsx',
  mobileNav: 'components/MobileNav.tsx',
  studio: 'app/(dashboard)/studio/StudioClient.tsx',
  generate: 'app/(dashboard)/generate/GenerateClient.tsx',
  modelsPricing: 'app/models-pricing/page.tsx',
  pricing: 'app/pricing/PricingClient.tsx',
  calculator: 'app/cheapest-ai-shorts-maker/ShortCostCalculator.tsx',
  budget: 'components/PaidEngineBudget.tsx',
  schema: 'components/StructuredData.tsx',
  llms: 'app/llms.txt/route.ts',
  facts: 'lib/kineoFacts.ts',
  catalog: 'lib/growth/enginePageCatalog.ts',
  landingIntent: 'lib/growth/engineLandingIntent.ts',
  sitemap: 'app/sitemap.ts',
  nextConfig: 'next.config.js',
  arena: 'app/arena/page.tsx',
  comparisons: 'lib/comparisons.ts',
  sora: 'lib/growth/soraMigrationFacts.ts',
  soraPage: 'app/sora-alternative/page.tsx',
  exitOffer: 'components/ExitIntentOffer.tsx',
  modal: 'components/WelcomeOfferModal.tsx',
  ph: 'app/ph/page.tsx',
  robot: 'app/ai-robot-video-generator/page.tsx',
  estrela: 'lib/estrelaCopy.ts',
  estrelaMsg: 'lib/estrelaDoFilme.ts',
  failurePanel: 'components/VideoQualityFailurePanel.tsx',
  idleMail: 'lib/lifecycle/subscriberIdle.ts',
  nextAction: 'app/api/next-action/route.ts',
  // (d) curadoria — só leitura; nada aqui pode perder os filmes do Omni.
  engineWall: 'lib/engineWall.ts',
  homeCuration: 'lib/homeVideoCuration.ts',
  publicExamples: 'lib/publicExamples.ts',
  examplesSel: 'lib/ui/examplesSelectionSep24.ts',
  heroOpening: 'lib/ui/heroOpening.ts',
}
const SRC = Object.fromEntries(Object.entries(FILES).map(([k, p]) => [k, read(p)]))

const listOf = (s, name) => {
  const m = s.match(new RegExp(`export const ${name}\\b[^=]*=\\s*\\[([^\\]]*)\\]`))
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : null
}
const OMNI_COPY = /omni flash|engine=omni|cinematic_omni|\bOmni\b/i
// Linhas de CÓDIGO (sem comentário) que citam o Omni.
const omniCodeLines = (s) => code(s).split('\n').filter((l) => OMNI_COPY.test(l))

// Os filmes do Omni que a casa curou (ids conferidos em 12/10 na árvore desta mudança).
const OMNI_WALL_IDS = ['36a04f7b-65f7-42d9-a2ab-198b5a7f115e', '33249fbf-57b6-47cf-8486-88bfb2a02db1', '41924eb2-d81d-4f2c-a5bb-5477c042af04', '6f6786a8-0a3d-49f0-b5cd-1e91c06249d2']
const OMNI_HOME_IDS = ['a66e975a-3f6c-4bf4-9510-cd15b895b58b', 'cc17475a-0707-4309-aa11-ac4b85918c78', '1b8e12f9-83e5-411c-8fda-0b277d289934', '38158db0-f02e-4c6c-a4c8-3c65461413a9']

function problems(S) {
  const p = []
  const no = (cond, msg) => { if (cond) p.push(msg) }

  // (a) pausa no servidor + fora da oferta
  const paused = listOf(S.launch, 'PAUSED_ENGINE_KEYS') ?? []
  const retired = listOf(S.launch, 'OFFER_RETIRED_ENGINE_KEYS') ?? []
  no(!paused.includes('omni'), 'servidor: o Omni saiu da pausa (PAUSED_ENGINE_KEYS) — voltaria a ser cobrável')
  no(!retired.includes('omni'), 'oferta: o Omni saiu de OFFER_RETIRED_ENGINE_KEYS')
  no(!/export function engineOffered\([\s\S]{0,200}OFFER_RETIRED_ENGINE_KEYS/.test(S.launch), 'engineOffered não lê OFFER_RETIRED_ENGINE_KEYS')
  no(!/export const PAUSED_ON_OFFER_KEYS[^\n]*PAUSED_ENGINE_KEYS\.filter\(\(k\) => engineOffered\(k\)\)/.test(S.launch), 'PAUSED_ON_OFFER_KEYS não filtra os pausados pela oferta')
  no(!/export const PAUSED_ENGINES_COPY: string = PAUSED_ON_OFFER_KEYS\.map\(/.test(S.launch) || /PAUSED_ENGINES_COPY = 'Omni/.test(S.launch), 'a frase pública de pausa não deriva dos pausados NA OFERTA (cita o Omni)')
  const rc = S.route
  const iGate = rc.indexOf('const pausa = enginePaused(body.engine)')
  const iCost = rc.indexOf('const cost = creditCostForDuration(costQuality, true, duration)')
  no(!(iGate > 0 && iCost > iGate), 'servidor: o portão de pausa sumiu ou passou para depois do custo')
  no(!rc.includes("reason: 'engine_paused', engine: body.engine, alternative: pausa.alternative, retryable: false, charged: false, refunded: false }, { status: 423 })"), 'servidor: a recusa 423 sem cobrança mudou')

  // (b) menus e seletores
  for (const k of ['landing', 'sidebar', 'mobileNav']) no(omniCodeLines(S[k]).length > 0, `${FILES[k]}: Omni no menu/nav: ${omniCodeLines(S[k])[0]?.trim().slice(0, 120)}`)
  no(/\{ key: 'omni'/.test(code(S.studio)), '/studio: card do Omni de volta no seletor')
  no(/Omni/.test(code(S.studio).split('\n').filter((l) => /English, Portuguese, Spanish only/.test(l)).join('\n')), '/studio: aviso de língua cita o Omni')
  no(/\{ key: 'omni', label:/.test(code(S.generate)), '/generate: botão do Omni de volta no seletor')
  // tabelas de preço e copy de venda
  // /arena: o card do Omni fica DECLARADO em FIGHTER_CARDS (mesmo padrão do Kineo 1) e não renderiza; fora o card, nada cita o Omni.
  const arenaSemCard = S.arena.replace(/\n  \{\n    badge: 'OMNI FLASH',[\s\S]*?\n  \},/, '')
  no(arenaSemCard === S.arena, "/arena: o card declarado do Omni mudou de forma (âncora badge: 'OMNI FLASH')")
  no(omniCodeLines(arenaSemCard).length > 0, `/arena: Omni fora do card declarado: ${omniCodeLines(arenaSemCard)[0]?.trim().slice(0, 140)}`)
  for (const k of ['modelsPricing', 'pricing', 'calculator', 'budget', 'schema', 'comparisons', 'sora', 'soraPage', 'exitOffer', 'modal', 'ph', 'estrela', 'failurePanel']) {
    const l = omniCodeLines(S[k])
    no(l.length > 0, `${FILES[k]}: Omni em superfície de venda: ${l[0]?.trim().slice(0, 140)}`)
  }
  no(/Omni Flash/.test(code(S.estrelaMsg)), 'estrela: a mensagem de recusa ainda oferece o Omni')
  no(/Omni Flash/.test(code(S.idleMail)), 'e-mail do assinante parado ainda cita o Omni como novidade')
  no(!S.modelsPricing.includes('{PAUSED_ENGINES_COPY && <p'), '/models-pricing: o aviso de pausa não some quando a frase é vazia')
  // arena: o card fica declarado, mas fora da oferta não renderiza
  no(!S.arena.includes('const soNaOferta = (cards: Fighter[]): Fighter[] => cards.filter((f) => engineOffered(f.engineParam))') || !S.arena.includes('const FIGHTER_CARDS: Fighter[] = soNaOferta(['), '/arena: os cards não passam por engineOffered')
  // llms.txt e fatos
  no(omniCodeLines(S.llms).length > 0, `llms.txt: cita o Omni: ${omniCodeLines(S.llms)[0]?.trim().slice(0, 140)}`)
  no(!S.llms.includes('PAUSED_ON_OFFER_KEYS.map((key) => ENGINE_PAUSE[key])'), 'llms.txt: a lista de pausas não é a dos pausados NA OFERTA')
  no(/name: 'Omni Flash'|engineLandingPublicPath\('omni'\)|Omni Flash is temporarily paused/.test(code(S.facts)), 'fatos (/api/facts, GPT): o Omni voltou à lista de motores')
  // próxima jogada
  no(!/MOTORES\.filter\(\(m\) => engineOffered\(m\.deeplink\)\)\.map\(/.test(S.nextAction), 'next-action: o Omni pode voltar a ser a próxima jogada (sem filtro de oferta)')

  // (c) páginas, sitemap, redirects
  const retiredSlugs = listOf(S.catalog, 'OFFER_RETIRED_ENGINE_SLUGS') ?? []
  no(!retiredSlugs.includes('gemini-omni-flash'), 'catálogo: a página do Omni voltou a ENGINE_SLUGS')
  no(!/export const ENGINE_SLUGS = Object\.keys\(ENGINES\)\.filter\(\(slug\) => !RETIRED_ENGINE_SLUGS\.includes\(slug\) && !OFFER_RETIRED_ENGINE_SLUGS\.includes\(slug\)\)/.test(S.catalog), 'catálogo: ENGINE_SLUGS não exclui os slugs fora da oferta')
  no(!S.landingIntent.includes("omni: '/ai-video-generator/kling-3',"), 'caminho público do Omni não é o destino final (Kling 3)')
  no(!S.nextConfig.includes("{ source: '/ai-video-generator/gemini-omni-flash', destination: '/ai-video-generator/kling-3', statusCode: 301 }"), 'next.config: sem o 301 da página do Omni para a do Kling 3')
  no(!S.nextConfig.includes("{ source: '/omni-flash-vs-sora', destination: '/sora-alternative', statusCode: 301 }"), 'next.config: sem o 301 de /omni-flash-vs-sora')
  no(/'\/omni-flash-vs-sora'|gemini-omni-flash/.test(code(S.sitemap)), 'sitemap: página do Omni de volta ao mapa')

  // (d) "deixa os vídeos"
  const wallLine = S.engineWall.match(/^\s*cinematic_omni: \[([^\]]*)\],?$/m)
  no(!wallLine || !OMNI_WALL_IDS.every((id) => wallLine[1].includes(`'${id}'`)), 'vitrine (lib/engineWall.ts): sumiu filme curado do Omni')
  no(!OMNI_HOME_IDS.every((id) => S.homeCuration.includes(`id: '${id}'`) && new RegExp(`id: '${id}'[^\\n]*engine: 'cinematic_omni'`).test(S.homeCuration)), 'home (lib/homeVideoCuration.ts): sumiu filme do Omni da curadoria')
  no((S.publicExamples.match(/engine: 'cinematic_omni'/g) ?? []).length < 14, 'exemplos (lib/publicExamples.ts): menos de 14 registros de filme do Omni')
  no(!S.examplesSel.includes("const selectedOmniIds = ['1b8e12f9-83e5-411c-8fda-0b277d289934', '36a04f7b-65f7-42d9-a2ab-198b5a7f115e']"), '/examples: a seleção dos filmes do Omni mudou')
  no(!S.heroOpening.includes("cinematic_omni: '36a04f7b-65f7-42d9-a2ab-198b5a7f115e',"), 'abertura da home: o filme dos robôs saiu')
  no(!/^const VIDEO_URL =/m.test(S.robot) || !/<video\n\s*src=\{VIDEO_URL\}/.test(S.robot), '/ai-robot-video-generator: o filme dos robôs sumiu')
  no(!S.ph.includes("const ROBOT = '/previews/36a04f7b-65f7-42d9-a2ab-198b5a7f115e.mp4'"), '/ph: o filme dos robôs sumiu')
  return p
}

let n = 0
const ok = (msg) => { n++; console.log(`✓ ${msg}`) }

const atual = problems(SRC)
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
ok('Omni pausado no servidor e fora da oferta; menus, seletores, preços, comparações, llms.txt, fatos, sitemap e próxima jogada sem Omni')
ok('filmes do Omni intactos na vitrine, na home, nos exemplos, no /examples, na abertura, no /ai-robot e no /ph')

function mutante(nome, key, de, para) {
  const antes = SRC[key]
  const depois = antes.split(de).join(para)
  assert.ok(depois !== antes, `mutante "${nome}" não aplicou — âncora envelhecida: ${de.slice(0, 80)}`)
  const v = problems({ ...SRC, [key]: depois })
  assert.ok(v.length > 0, `mutante "${nome}" passou verde — o guardião não trava a regressão`)
  ok(`mutante vermelho: ${nome} → ${v[0].slice(0, 90)}`)
}
mutante('Omni sai da pausa no servidor', 'launch', "export const PAUSED_ENGINE_KEYS: readonly PausedEngineKey[] = ['omni']", 'export const PAUSED_ENGINE_KEYS: readonly PausedEngineKey[] = []')
mutante('Omni volta à oferta', 'launch', "export const OFFER_RETIRED_ENGINE_KEYS: readonly string[] = ['omni']", 'export const OFFER_RETIRED_ENGINE_KEYS: readonly string[] = []')
mutante('item do Omni de volta no mega-menu', 'landing', '<NavEngineItem href="/studio?engine=veo&intent_campaign=nav_mega"', '<NavEngineItem href="/studio?engine=omni&intent_campaign=nav_mega" name="Omni Flash" /><NavEngineItem href="/studio?engine=veo&intent_campaign=nav_mega"')
mutante('card do Omni de volta no /studio', 'studio', "  { key: 's25', paused:", "  { key: 'omni', paused: true, icon: 'OF', name: 'Omni Flash', desc: '', res: '720p', credits: '', supportsRef: true },\n  { key: 's25', paused:")
mutante('botão do Omni de volta no /generate', 'generate', "              { key: 'veo', label: 'Veo 3.1',", "              { key: 'omni', label: 'Omni Flash', sub: '', cr: 150 },\n              { key: 'veo', label: 'Veo 3.1',")
mutante('linha do Omni de volta na tabela de preços', 'modelsPricing', "  { key: 'hollywood', name: 'Kling 3',", "  { key: 'omni', name: 'Omni Flash', quality: 'cinematic_omni', what: '' },\n  { key: 'hollywood', name: 'Kling 3',")
mutante('llms.txt volta a listar todas as pausas', 'llms', 'PAUSED_ON_OFFER_KEYS.map((key) => ENGINE_PAUSE[key])', 'PAUSED_ENGINE_KEYS.map((key) => ENGINE_PAUSE[key])')
mutante('página do Omni volta a ENGINE_SLUGS', 'catalog', "export const OFFER_RETIRED_ENGINE_SLUGS: readonly string[] = ['gemini-omni-flash']", 'export const OFFER_RETIRED_ENGINE_SLUGS: readonly string[] = []')
mutante('sem o 301 da página do Omni', 'nextConfig', "{ source: '/ai-video-generator/gemini-omni-flash', destination: '/ai-video-generator/kling-3', statusCode: 301 }", '')
mutante('/omni-flash-vs-sora de volta ao sitemap', 'sitemap', "    { path: '/privacy',", "    { path: '/omni-flash-vs-sora', priority: 0.9, freq: 'weekly' },\n    { path: '/privacy',")
mutante('/arena volta a renderizar o card do Omni', 'arena', 'const FIGHTER_CARDS: Fighter[] = soNaOferta([', 'const FIGHTER_CARDS: Fighter[] = ([')
mutante('próxima jogada volta a oferecer o Omni', 'nextAction', 'MOTORES.filter((m) => engineOffered(m.deeplink)).map(', 'MOTORES.map(')
mutante('vitrine perde um filme do Omni', 'engineWall', "'41924eb2-d81d-4f2c-a5bb-5477c042af04', '6f6786a8", "'6f6786a8")
mutante('home perde um filme do Omni', 'homeCuration', "id: '38158db0-f02e-4c6c-a4c8-3c65461413a9'", "id: 'xxxx'")
mutante('/ai-robot perde o filme', 'robot', '          src={VIDEO_URL}\n', '          src={undefined}\n')

console.log(`\n${n}/${n} omni-fora-da-oferta checks passed`)

// KINEO-MOTORES-SAEM-0511 [TRAVA 8.2 — fundador 05/11 "3 sim"; docs/PROPOSTA-CREDITOS-B-E-MOTORES-2026-11-05.md §3 e §6]
//
// Kling 2.5, Veo 3.1 Fast e Omni Flash saem da OFERTA; o motor continua no código para job antigo terminar e filme antigo manter o selo real.
// Este guardião trava (Node puro: leitura de arquivo e execução dos módulos puros; sem rede, sem banco):
//   (a) o interruptor central: os 3 fora da oferta, recusa própria dos aposentados, conectores recusam os dois grupos;
//   (b) o servidor recusa pedido NOVO antes de qualquer débito (filme e clipe), sem tocar em replay nem em polling;
//   (c) efeitos do catálogo e Espaços seguem no trilho 'kling' (são produto vendido, com selo real);
//   (d) as telas e tabelas não oferecem mais os motores; o Kling 3 da oferta é Kling 4.0;
//   (e) o selo real não mudou (lib/engineLabel.ts), e o clipe "Kling 3" segue chamando o modelo Kling 3 e dizendo o nome dele;
//   (f) as páginas viraram 301 para a comparação e saíram de sitemap/llms/línguas; o interruptor não apagou dados nem o render;
//   (g) os créditos e a régua de clipe não foram mexidos aqui.
// Mutantes em memória no fim: cada regressão típica tem de ficar vermelha.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')

const FILES = {
  launch: 'lib/engineLaunch.ts', route: 'app/api/generate-video-cinematic/route.ts', label: 'lib/engineLabel.ts',
  clipFlow: 'lib/clips/clipFlow.ts', clipServer: 'lib/clips/clipServer.ts', clipCatalog: 'lib/clips/clipCatalog.ts', spaces: 'lib/spaces/spaces.ts', spacesClient: 'app/(dashboard)/spaces/SpacesClient.tsx',
  studio: 'app/(dashboard)/studio/StudioClient.tsx', studioPage: 'app/(dashboard)/studio/page.tsx', generate: 'app/(dashboard)/generate/GenerateClient.tsx', url: 'lib/growth/entradaSeedance15.ts',
  retry: 'lib/navigation/reviewVideoRetry.ts', series: 'lib/navigation/studioSeriesReview.ts', draft: 'lib/growth/cardEntryResumeDraft.ts',
  landing: 'app/KineoLanding.tsx', pricing: 'app/pricing/PricingClient.tsx', models: 'app/models-pricing/page.tsx', calc: 'app/cheapest-ai-shorts-maker/ShortCostCalculator.tsx', two: 'components/pricing/TwoProductsPricing.tsx', twoLib: 'lib/pricingTwoProducts.ts', finder: 'lib/valorNoCheckout.ts',
  facts: 'lib/kineoFacts.ts', llms: 'app/llms.txt/route.ts', handoff: 'lib/gptHandoff.ts', mcp: 'app/api/mcp/route.ts', mcpStudio: 'app/api/mcp/studio/route.ts', mcpChat: 'app/api/mcp/chatgpt/route.ts', connector: 'app/claude-connector/page.tsx', schema: 'components/StructuredData.tsx',
  next: 'next.config.js', catalog: 'lib/growth/enginePageCatalog.ts', langs: 'lib/seo/enginePageLangs.ts', intent: 'lib/growth/engineLandingIntent.ts', compare: 'app/seedance-vs-veo-vs-kling/page.tsx', k4name: 'lib/kling4PaidPresentation.ts',
  clipPricing: 'lib/clips/clipPricing.ts',
}
const SRC = Object.fromEntries(Object.entries(FILES).map(([k, p]) => [k, read(p)]))
const listOf = (s, name) => { const m = s.match(new RegExp(`export const ${name}\\b[^=]*=\\s*\\[([^\\]]*)\\]`)); return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : null }

function problems(S) {
  const p = []
  const no = (cond, msg) => { if (cond) p.push(msg) }

  // (a) interruptor
  const fora = listOf(S.launch, 'OFFER_RETIRED_ENGINE_KEYS') ?? []
  for (const k of ['omni', 'kling', 'veo']) no(!fora.includes(k), `oferta: ${k} saiu de OFFER_RETIRED_ENGINE_KEYS`)
  no(!/kling: \{ since: '2026-11-05'/.test(S.launch) || !/veo: \{ since: '2026-11-05'/.test(S.launch), 'ENGINE_RETIREMENT perdeu um motor')
  no(!/export const UNAVAILABLE_ENGINE_KEYS[^\n]*\[\.\.\.PAUSED_ENGINE_KEYS, \.\.\.Object\.keys\(ENGINE_RETIREMENT\)\]/.test(S.launch), 'conectores: a lista não junta pausados e aposentados')
  no(/'Veo 3\.1'|'Kling 2\.5'/.test(code(S.launch).split('const PUBLIC_VIDEO_ENGINE_NAMES')[1]?.split(']')[0] ?? ''), 'a contagem pública ainda lista Veo/Kling 2.5')
  for (const k of ['mcp', 'mcpStudio', 'mcpChat']) no(!S[k].includes('pausedEngines: UNAVAILABLE_ENGINE_KEYS'), `${FILES[k]}: o conector não recusa os aposentados`)
  no(!S.connector.includes('buildTools({ pausedEngines: UNAVAILABLE_ENGINE_KEYS })'), '/claude-connector: a lista de ferramentas anuncia aposentado')
  no(!(listOf(S.handoff, 'UNADVERTISED_HANDOFF_ENGINES') ?? []).includes('veo') || !(listOf(S.handoff, 'UNADVERTISED_HANDOFF_ENGINES') ?? []).includes('kling'), 'handoff: Kling 2.5/Veo ainda ensinados')

  // (b) servidor: filme
  const r = S.route
  const iGate = r.indexOf('const aposentado = engineRetired(body.engine)')
  const iCost = r.indexOf('const cost = creditCostForDuration(costQuality, true, duration)')
  const iPause = r.indexOf('const pausa = enginePaused(body.engine)')
  no(!(iGate > iPause && iPause > 0), 'filme: o portão do aposentado sumiu ou veio antes da pausa')
  no(iCost > 0 && !(iCost > iGate), 'filme: o portão do aposentado passou para depois do custo')
  no(!r.includes("reason: ENGINE_RETIRED_REASON, engine: body.engine, alternative: aposentado.alternative, retryable: false, charged: false, refunded: false }, { status: 410 })"), 'filme: a recusa 410 sem cobrança mudou')
  no(!r.includes("'kling', 'veo', 'hollywood', 'omni'].filter((m) => engineOffered(m))"), 'filme: o resgate do saldo pode oferecer motor fora da oferta')
  // (b) servidor: clipe
  const f = S.clipFlow
  const iReplay = f.indexOf('return { ok: true, status: 200, clip: existing, replay: true, balance: null }')
  const iRet = f.indexOf('deps.retiredClipRefusal?.(req)')
  const iActive = f.indexOf('(await deps.countActive(args.userId)) >= CLIP_MAX_ACTIVE')
  const iDebit = f.indexOf('deps.debit(')
  no(!(iReplay > 0 && iRet > iReplay && iActive > iRet && iDebit > iRet), 'clipe: a recusa tem de vir depois do replay e antes de teto, saldo e débito')
  no(!f.includes("if (recusa) return { ok: false, status: 410, code: 'engine_retired', error: recusa }"), 'clipe: a recusa 410 mudou')
  no(!f.includes('if (!template && !remix) {'), 'clipe: efeito-modelo e remix não podem ser recusados')
  no(!/CLIP_ENGINE_ORDER\.filter\(\(key\) => engineOffered\(key\) && access\(key\)\.ok\)/.test(S.clipServer), 'clipe: o catálogo do /clips ainda lista motor fora da oferta')
  no(!S.clipServer.includes('retiredClipRefusal, // KINEO-MOTORES-SAEM-0511'), 'clipe: submitDepsFor não liga a recusa')

  // (c) efeitos e Espaços continuam
  no(!/CLIP_EFFECTS\.some\(\(e\) => !e\.template && e\.engine === req\.engine/.test(S.clipServer), 'efeitos: a exceção dos efeitos do catálogo sumiu')
  no(!S.clipServer.includes('SPACE_KINDS.some((k) => buildSpaceMotionPrompt(k) === req.prompt)'), 'Espaços: a exceção sumiu')
  no(!S.spacesClient.includes('clipCreditCost(SPACE_CLIP_ENGINE, SPACE_CLIP_SECONDS)'), 'Espaços: o preço depende do catálogo do /clips, de onde o Kling 2.5 saiu')
  no(/paused: enginePaused\(engine\) !== null/.test(S.clipServer) === false, 'efeitos: a pausa do trilho mudou')
  no(/const PAUSED_ENGINE_KEYS[^\n]*'(kling|veo)'/.test(S.launch), 'efeitos: aposentado virou pausa e derruba o trilho kling (publicClipEffects, Espaços)')

  // (d) telas
  no(/\{ key: '(kling|veo)'/.test(code(S.studio)), '/studio: card de motor aposentado de volta')
  no(/\{ key: '(kling|veo)', label:/.test(code(S.generate)), '/generate: botão de motor aposentado de volta')
  no(/kling: 'cinematic_kling'|veo: 'cinematic_veo'/.test(S.studioPage), '/studio: filme de motor aposentado pode selecionar o motor no clique')
  no(!S.url.includes("if (RETIRED_URL_KEYS.includes(e)) return 'seedance'"), 'URL: ?engine=veo não cai no Seedance')
  no(/cinematic_(kling|veo): '(kling|veo)'/.test(S.retry) || /cinematic_(kling|veo): '(kling|veo)'/.test(S.series), 'refazer/série: abre motor aposentado')
  no(/DRAFT_ENGINES[^\n]*'(kling|veo)'/.test(S.draft), 'rascunho: restaura motor aposentado')
  const nav = code(S.landing)
  no(/engine=(kling|veo)&|name="(Kling 2\.5|Veo 3\.1|Kling 3)"|>(Kling 2\.5|Veo 3\.1|Kling 3)</.test(nav), 'mega-menu/home: motor aposentado ou nome Kling 3')
  no(/Kling 3 films|Kling and Veo included|Kling 2\.5 cinematic/.test(nav), 'cartões da home: copy antiga')
  no(/Kling 2\.5|Veo 3\.1|'cinematic_kling'|'cinematic_veo'/.test(code(S.pricing)), '/pricing: tabela ainda lista Kling 2.5/Veo')
  no(/'cinematic_(kling|veo)'/.test(code(S.models)), '/models-pricing: linha de motor aposentado')
  no(!S.models.includes("{ key: 'hollywood', name: 'Kling 4.0'"), '/models-pricing: o nome não é Kling 4.0')
  no(/'cinematic_(kling|veo)'/.test(code(S.calc)), 'calculadora: motor aposentado')
  no(!S.calc.includes("option.quality !== 'cinematic_hollywood' || seconds === 60"), 'calculadora: Kling 4.0 aparece em 35/90 s, que a rota recusa')
  no(!S.two.includes('engineListed: (engine) => engineOffered(engine)'), 'tabela por motor: não lê a oferta')
  no(!S.two.includes('label: PREMIUM_FILM_ENGINE_OFFER_NAME'), 'tabela por motor: o filme hollywood não se chama Kling 4.0')
  no(!S.twoLib.includes('label: CLIP_ENGINES[engine].label,\n    cells: TWO_PRODUCTS_CLIP_TARGETS'), 'tabela por motor: o clipe tem de manter o nome do catálogo')
  no(/key: 'kling'/.test(S.finder), 'localizador de plano: Kling 2.5 de volta')
  no(/name: '(Kling 2\.5|Veo 3\.1)'/.test(code(S.facts)), '/api/facts: ficha de motor aposentado')
  no(/Kling 2\.5, Veo 3\.1|Every available engine: Kling 2\.5/.test(code(S.facts)), '/api/facts: lista antiga no plano')
  no(/models such as Veo 3\.1/.test(S.schema), 'schema: Veo no FAQ')
  no(/on Kling 3 and MiniMax H3|Kling 3 AND MiniMax H3|Kineo on Kling 3/.test(S.llms), 'llms.txt: fala em cena atribuída ao filme premium (o Kling 4.0 não tem)')
  no(!S.llms.includes("INDEXABLE_ENGINE_SLUGS.filter((slug) => slug !== 'kling-3')"), 'llms.txt: a linha "Kling 3 online" voltou')
  no(!S.k4name.includes("return validKling4PaidAvailability(a, now) && !a.paidLive ? 'Kling 3' : 'Kling 4.0'"), 'nome: só o interruptor desligado explícito pode dizer Kling 3')

  // (e) selo honesto
  no(!S.label.includes("cinematic_kling: 'Kling 2.5'") || !S.label.includes("cinematic_veo: 'Veo 3.1'") || !S.label.includes("cinematic_hollywood: 'Kling 3'") || !S.label.includes("cinematic_omni: 'Omni Flash'"), 'selo: filme antigo perdeu o nome real')
  no(!S.label.includes("kling4: 'Kling 4.0', kling3: 'Kling 3'"), 'selo: engine_used perdeu o nome real')
  const clipHollywood = S.clipCatalog.match(/hollywood: \{\s*key: 'hollywood',\s*label: '([^']+)',\s*t2vModel: '([^']+)',\s*i2vModel: '([^']+)'/)
  if (clipHollywood) {
    const chamaK3 = /kling-video\/(v3|o3)\//.test(clipHollywood[2]) || /kling-video\/(v3|o3)\//.test(clipHollywood[3])
    no(chamaK3 && clipHollywood[1] !== 'Kling 3', `selo: o clipe chama o modelo Kling 3 na fal e se diz "${clipHollywood[1]}"`)
  } else p.push('clipCatalog: entrada hollywood mudou de forma')

  // (f) páginas
  for (const src of ['/ai-video-generator/veo', '/ai-video-generator/veo/:lang', '/ai-video-generator/kling', '/ai-video-generator/kling/:lang']) {
    no(!S.next.includes(`{ source: '${src}', destination: '/seedance-vs-veo-vs-kling', statusCode: 301 }`), `next.config: sem o 301 de ${src}`)
  }
  no(!(listOf(S.catalog, 'OFFER_RETIRED_ENGINE_SLUGS') ?? []).includes('veo') || !(listOf(S.catalog, 'OFFER_RETIRED_ENGINE_SLUGS') ?? []).includes('kling'), 'catálogo: página aposentada de volta a ENGINE_SLUGS')
  no(!S.catalog.includes('return engineOffered(param) && !enginePaused(param)'), 'catálogo: motor aposentado continua indexável')
  no(!S.langs.includes("slug !== 'kineo-1' && slug !== 'veo'"), 'línguas: LOCALIZED_ENGINE_SLUGS mantém o Veo')
  no(!S.intent.includes("kling: '/seedance-vs-veo-vs-kling'") || !S.intent.includes("veo: '/seedance-vs-veo-vs-kling'"), 'caminho público aponta para o 301, não o destino')
  no(!S.compare.includes('data-kineo="motores-saem-0511"'), 'comparação: quem chega pelo 301 não lê o aviso')
  no(!S.compare.includes("{r.retired ? '—' : r.credits60}"), 'comparação: preço de motor aposentado anunciado')

  // (g) escopo: o render não saiu
  no(!/const wantsVeo = body\.engine === 'veo'/.test(r) || !/const wantsKling = body\.engine === 'kling'/.test(r), 'render: o caminho antigo foi removido (retomada e canário dependem dele)')
  no(!S.clipCatalog.includes("t2vModel: 'fal-ai/veo3.1/fast'"), 'clipCatalog: entrada do Veo removida (linhas antigas de clips leem dela)')
  no(!/kling: \{ usdPerSecond/.test(S.clipPricing) && !S.clipPricing.includes('kling:'), 'régua de clipes: motor removido')
  return p
}

let n = 0
const ok = (m) => { n++; console.log(`✓ ${m}`) }
const atual = problems(SRC)
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
ok('oferta sem Kling 2.5, Veo 3.1 e Omni; servidor recusa sem cobrar; selo real e render intactos; clipe Kling 3 segue dizendo Kling 3')

// Comportamento: os módulos puros executados de verdade.
const stripTypes = async (rel) => {
  const ts = (await import('typescript')).default
  const out = ts.transpileModule(read(rel), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  return `data:text/javascript;base64,${Buffer.from(out).toString('base64')}`
}
{
  // O módulo importa outros com alias @/: só a função e o espelho são executados, com o texto real.
  const ts = (await import('typescript')).default
  const fonte = SRC.url.match(/const RETIRED_URL_KEYS[\s\S]*?\n\}\n/)[0].replace(/^export /gm, '')
  const js = ts.transpileModule(['const KINEO1_URL_KEYS = ["fast"];', fonte, 'export { motorDaUrl }'].join('\n'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  const m = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
  assert.equal(m.motorDaUrl('veo', false), 'seedance')
  assert.equal(m.motorDaUrl('KLING', false), 'seedance')
  assert.equal(m.motorDaUrl('hollywood', false), 'hollywood')
  assert.equal(m.motorDaUrl('h3', false), 'h3')
  ok('?engine=veo|kling abre no Seedance; os motores que ficam não mudam')
}
{
  const m = await import(await stripTypes(FILES.k4name))
  const agora = Date.now()
  const lease = (paidLive) => ({ paidLive, promoLive: false, promoAvailable: false, publicOfferLive: false, reason: 'x', checkedAt: new Date(agora - 1000).toISOString(), validUntil: new Date(agora + 10000).toISOString() })
  assert.equal(m.kling4PaidName(null, agora), 'Kling 4.0')
  assert.equal(m.kling4PaidName(lease(true), agora), 'Kling 4.0')
  assert.equal(m.kling4PaidName(lease(false), agora), 'Kling 3')
  ok('nome: "não sei" é Kling 4.0; só o interruptor desligado diz Kling 3 (selo honesto)')
}
{
  // O espelho do motorDaUrl anda junto do interruptor.
  const mirror = SRC.url.match(/const RETIRED_URL_KEYS: readonly string\[\] = \[([^\]]*)\]/)?.[1].match(/'([^']+)'/g)?.map((x) => x.slice(1, -1)).sort()
  const fonte = [...SRC.launch.split('export const ENGINE_RETIREMENT')[1].split('\n}')[0].matchAll(/^\s+(\w+): \{ since:/gm)].map((x) => x[1]).sort()
  assert.deepEqual(mirror, fonte)
  ok('espelho RETIRED_URL_KEYS = ENGINE_RETIREMENT')
}
{
  // Os preços do Kling 4.0 são os do fundador.
  const k = read('lib/kling4PaidPricing.ts')
  assert.ok(k.includes('export const KLING4_PAID_CREDITS = { 15: 45, 30: 80, 60: 150 } as const'))
  ok('Kling 4.0: 15 s = 45, 30 s = 80, 60 s = 150')
}

function mutante(nome, key, de, para) {
  const antes = SRC[key]
  const depois = antes.split(de).join(para)
  assert.ok(depois !== antes, `mutante "${nome}" não aplicou — âncora envelhecida: ${de.slice(0, 80)}`)
  const r = problems({ ...SRC, [key]: depois })
  assert.ok(r.length > 0, `mutante "${nome}" passou verde`)
  ok(`mutante vermelho: ${nome}`)
}
mutante('Veo volta à oferta', 'launch', "['omni', 'kling', 'veo']", "['omni', 'kling']")
mutante('aposentado vira pausa (derruba efeitos)', 'launch', "export const PAUSED_ENGINE_KEYS: readonly PausedEngineKey[] = ['omni']", "export const PAUSED_ENGINE_KEYS: readonly PausedEngineKey[] = ['omni', 'kling']")
mutante('portão do filme removido', 'route', 'const aposentado = engineRetired(body.engine)', 'const aposentado = null')
mutante('recusa do filme cobra', 'route', "retryable: false, charged: false, refunded: false }, { status: 410 })", "retryable: false, charged: true, refunded: false }, { status: 410 })")
mutante('clipe recusa antes do replay', 'clipFlow', 'deps.retiredClipRefusal?.(req)', 'null')
mutante('efeito-modelo recusado', 'clipFlow', 'if (!template && !remix) {', 'if (true) {')
mutante('efeitos deixam de ser exceção', 'clipServer', 'CLIP_EFFECTS.some((e) => !e.template && e.engine === req.engine', 'false && CLIP_EFFECTS.some((e) => e.engine === req.engine')
mutante('Espaços deixam de ser exceção', 'clipServer', 'SPACE_KINDS.some((k) => buildSpaceMotionPrompt(k) === req.prompt)', 'false')
mutante('catálogo do /clips volta a listar', 'clipServer', 'engineOffered(key) && access(key).ok', 'access(key).ok')
mutante('rename só no nome do clipe (mentira)', 'clipCatalog', "label: 'Kling 3',\n    t2vModel: 'fal-ai/kling-video/v3/pro/text-to-video'", "label: 'Kling 4.0',\n    t2vModel: 'fal-ai/kling-video/v3/pro/text-to-video'")
mutante('selo de filme antigo renomeado', 'label', "cinematic_hollywood: 'Kling 3'", "cinematic_hollywood: 'Kling 4.0'")
mutante('selo do Veo apagado', 'label', "cinematic_veo: 'Veo 3.1',\n", '')
mutante('301 do Veo some', 'next', "{ source: '/ai-video-generator/veo', destination: '/seedance-vs-veo-vs-kling', statusCode: 301 }", '')
mutante('língua do Veo volta', 'langs', "slug !== 'kineo-1' && slug !== 'veo'", "slug !== 'kineo-1'")
mutante('página volta a ENGINE_SLUGS', 'catalog', "['gemini-omni-flash', 'kling', 'veo']", "['gemini-omni-flash']")
mutante('render removido', 'route', "const wantsVeo = body.engine === 'veo'", 'const wantsVeo = false')
mutante('card do Veo volta ao /studio', 'studio', "const ENGINES: ", "const ENGINES_ = [{ key: 'veo', name: 'x' }]\nconst ENGINES: ")
mutante('menu volta a vender o Kling 3', 'landing', 'name="Kling 4.0"', 'name="Kling 3"')
mutante('conector anuncia aposentado', 'mcpStudio', 'pausedEngines: UNAVAILABLE_ENGINE_KEYS', 'pausedEngines: PAUSED_ENGINE_KEYS')
mutante('URL volta a abrir o Veo', 'url', "if (RETIRED_URL_KEYS.includes(e)) return 'seedance'", 'if (false) return \'seedance\'')
console.log(`\nKINEO-MOTORES-SAEM-0511: ${n} verificações verdes.`)

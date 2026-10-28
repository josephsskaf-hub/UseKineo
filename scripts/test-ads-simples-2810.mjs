// KINEO-ADS-SIMPLES-2810 — guardião da entrega "Ads simples" (fundador 28/10: "simplificar e fazer funcionar o ads sem bugs").
// Roda com `node scripts/test-ads-simples-2810.mjs` (--no-mutants pula os mutantes). Sem rede, banco, env ou render.
// O que segura:
//   E — a régua ÚNICA (lib/ads/eligibilityPure.ts) EXECUTADA: os 4 estados e os motivos, país fail-closed (desconhecido = sem amostra),
//       teto do dia (US$ 25 = 2500 c) e a porta honesta (rótulo "grátis" só para visitante ou amostra aberta);
//   P — /ads/v2 (page.tsx) NÃO devolve ninguém logado à parede /ads?from=v2 (26-27/10: 15 pessoas de fora batiam nela), reabre a amostra
//       de quem já usou, mostra o aviso honesto e passa escolhaSampleAvailable/advancedModes;
//   H — os cards da home e o CTA do UGC perguntam à régua (useAdsEligibility + adsDoorSaysFree); a porta /ads idem, com a copy de 8 s;
//   U — ?mode=full / ?mode=batch / ?classic=1 só para a casa (escondidos, não apagados);
//   R — toda recusa de /api/ads/v2/* conhecida vira frase com próximo passo (adsV2RefusalCopy), e o status decide o resto;
//   C — o teto: constante 2500 e a migration NOVA (não aplicada) com 2500 na função E no CHECK;
//   D — a camada DESFAZ (scripts/test-support/desfaz-ads-simples-2810.mjs) devolve cada arquivo tocado ao byte da base;
//   M — mutantes em memória: cada um tem de derrubar pelo menos uma verificação.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semAdsSimples2810, ARQUIVOS, BASE } from './test-support/desfaz-ads-simples-2810.mjs'

const lf = (s) => s.replace(/\r\n/g, '\n')
const rd = (p) => lf(readFileSync(p, 'utf8'))
const F = {
  pure: 'lib/ads/eligibilityPure.ts', server: 'lib/ads/eligibility.ts', page: 'app/(dashboard)/ads/v2/page.tsx', client: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx', escolha: 'app/(dashboard)/ads/v2/AdsV2Escolha.tsx', cards: 'components/home/HomeThreeCards.tsx',
  ugc: 'components/ugc/UgcCtaLink.tsx', door: 'app/ads/page.tsx', novo: 'app/(dashboard)/ads/new/page.tsx', policy: 'lib/ads/cena/escolhaSamplePolicy.ts',
  sampleServer: 'lib/ads/cena/escolhaSampleServer.ts', internal: 'lib/ads/cena/internalEscolha.ts', cenaRoute: 'app/api/ads/v2/cena/route.ts',
  linkImport: 'app/api/ads/v2/link-import/route.ts', footage: 'app/api/footage/route.ts', eligRoute: 'app/api/ads/v2/eligibility/route.ts',
  notice: 'components/ads/AdsEligibilityNotice.tsx', hook: 'components/ads/useAdsEligibility.ts',
  migration: 'supabase/migrations/20261028120000_ads_escolha_sample_cap_2500.sql', migration2410: 'supabase/migrations/20261024175246_ads_escolha_sample.sql',
}
let checks = 0
const check = (fn) => { fn(); checks++ }
const same = (a, b, m) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, m) // os objetos nascem noutro realm (vm): compara-se o conteúdo

/** Todas as verificações sobre um conjunto de fontes (o atual, ou um mutante em memória). */
function prove(over = {}) {
  const src = (p) => over[p] ?? rd(p)
  const load = createOfflineLoader({ source: (p, s) => over[p] ?? s })
  const E = load(F.pure)
  const base = { gate: 'no_access', sampleLive: true, used: false, emailConfirmed: true, disposable: false, trialBlocked: false, country: 'US', reservedCentsToday: 0, dailyCapCents: 2500, estimateCents: 150 }
  // E — os 4 estados e os motivos
  check(() => same(E.adsEligibilityDecide({ ...base, gate: 'ok' }), { state: 'paid', reason: null }))
  check(() => same(E.adsEligibilityDecide(base), { state: 'free_sample_available', reason: null }))
  check(() => same(E.adsEligibilityDecide({ ...base, used: true, country: null, emailConfirmed: false }), { state: 'free_sample_used', reason: null }, 'quem já usou vê a própria amostra mesmo sem país/e-mail'))
  check(() => same(E.adsEligibilityDecide({ ...base, used: null }), { state: 'not_eligible', reason: 'ledger_unavailable' }))
  check(() => same(E.adsEligibilityDecide({ ...base, sampleLive: false }), { state: 'not_eligible', reason: 'sample_off' }))
  check(() => same(E.adsEligibilityDecide({ ...base, emailConfirmed: false }), { state: 'not_eligible', reason: 'unconfirmed_email' }))
  check(() => same(E.adsEligibilityDecide({ ...base, disposable: true }), { state: 'not_eligible', reason: 'disposable' }))
  check(() => same(E.adsEligibilityDecide({ ...base, trialBlocked: true }), { state: 'not_eligible', reason: 'blocked' }))
  check(() => same(E.adsEligibilityDecide({ ...base, country: null }), { state: 'not_eligible', reason: 'region' }, 'país desconhecido = FECHADO (fundador 28/10)'))
  check(() => same(E.adsEligibilityDecide({ ...base, country: 'IN' }), { state: 'not_eligible', reason: 'region' }))
  check(() => same(E.adsEligibilityDecide({ ...base, country: 'BR' }), { state: 'free_sample_available', reason: null }))
  check(() => same(E.adsEligibilityDecide({ ...base, reservedCentsToday: null }), { state: 'not_eligible', reason: 'ledger_unavailable' }))
  check(() => same(E.adsEligibilityDecide({ ...base, reservedCentsToday: 2400 }), { state: 'not_eligible', reason: 'budget_exhausted_today' }, '2400 + 150 > 2500'))
  check(() => same(E.adsEligibilityDecide({ ...base, reservedCentsToday: 2350 }), { state: 'free_sample_available', reason: null }, '2350 + 150 = 2500 ainda cabe'))
  check(() => assert.equal(E.adsEligibilityDecide({ ...base, gate: 'closed' }).state, 'free_sample_available', 'o Studio Ads pago fechado não fecha a amostra'))
  // E — o melhor sinal de país, na ordem, e o fail-closed
  check(() => assert.equal(E.adsSampleCountry(['BR', 'IN', null]), 'BR'))
  check(() => assert.equal(E.adsSampleCountry([null, 'XX', ' in ', 'US']), 'IN', 'o primeiro conhecido decide (XX/T1/vazio não contam)'))
  check(() => assert.equal(E.adsSampleCountry([undefined, 'T1', '']), null))
  check(() => assert.equal(E.adsSampleCountryAllowed(null), false)); check(() => assert.equal(E.adsSampleCountryAllowed('XX'), false))
  check(() => assert.equal(E.adsSampleCountryAllowed('us'), true)); check(() => assert.equal(E.adsSampleCountryAllowed('IN'), false)); check(() => assert.equal(E.adsSampleCountryAllowed('PK'), false))
  // E — porta honesta e quem cria
  check(() => assert.equal(E.adsDoorSaysFree(false, null), true, 'visitante vê "grátis" (vai se cadastrar)'))
  check(() => assert.equal(E.adsDoorSaysFree(true, 'free_sample_available'), true))
  for (const s of ['paid', 'free_sample_used', 'not_eligible']) check(() => assert.equal(E.adsDoorSaysFree(true, s), false, 'logado em ' + s + ' vê "Make a product ad"'))
  check(() => assert.equal(E.adsDoorSaysFree(true, null), false, 'logado sem resposta ainda = não promete grátis na lib (a tela segura o rótulo de antes até a resposta)'))
  check(() => assert.deepEqual(['paid', 'free_sample_available', 'free_sample_used', 'not_eligible'].map(E.adsEligibilityCanCreate), [true, true, false, false]))
  // E — copy por estado (en/pt/es), com os números e sem placeholder sobrando
  for (const lang of ['en', 'pt', 'es', 'hi']) {
    check(() => assert.equal(E.adsEligibilityCopy({ state: 'free_sample_available', reason: null }, lang, { credits: 41 }), null))
    check(() => assert.equal(E.adsEligibilityCopy({ state: 'paid', reason: null }, lang, { credits: 41 }), null))
    for (const reason of ['region', 'unconfirmed_email', 'disposable', 'blocked', 'budget_exhausted_today', 'sample_off', 'ledger_unavailable']) {
      const c = E.adsEligibilityCopy({ state: 'not_eligible', reason }, lang, { credits: 41, resetIso: '2026-10-29T00:00:00.000Z' })
      check(() => assert.ok(c && c.title && c.body.includes('41') && !/\{(credits|reset)\}/.test(c.body) && c.plans, 'copy ' + lang + '/' + reason))
    }
    const used = E.adsEligibilityCopy({ state: 'free_sample_used', reason: null }, lang, { credits: 41 })
    check(() => assert.ok(used && used.body.includes('41')))
  }
  check(() => assert.ok(E.adsEligibilityCopy({ state: 'not_eligible', reason: 'budget_exhausted_today' }, 'en', { credits: 41, resetIso: '2026-10-29T00:00:00.000Z' }).body.includes('00:00 UTC')))
  check(() => assert.match(E.adsEligibilityCopy({ state: 'not_eligible', reason: 'region' }, 'en', { credits: 41 }).title, /selected countries/))
  check(() => assert.equal(E.adsSampleCapResetIso(new Date('2026-10-28T23:59:59Z')), '2026-10-29T00:00:00.000Z'))
  // R — recusas → frase + próximo passo
  check(() => assert.equal(E.adsV2RefusalCopy('out_of_credits', 402, 'en').next, 'plans'))
  check(() => assert.equal(E.adsV2RefusalCopy('ads_sample_cap', 429, 'pt').next, 'wait'))
  check(() => assert.equal(E.adsV2RefusalCopy('moderation_blocked', 422, 'es').next, 'edit'))
  check(() => assert.equal(E.adsV2RefusalCopy('no_access', 403, 'en').next, 'plans'))
  check(() => assert.equal(E.adsV2RefusalCopy('codigo_que_nao_existe', 402, 'en').next, 'plans', 'status 402 desconhecido → planos'))
  check(() => assert.equal(E.adsV2RefusalCopy('codigo_que_nao_existe', 429, 'en').next, 'wait'))
  check(() => assert.equal(E.adsV2RefusalCopy('codigo_que_nao_existe', 401, 'en').next, 'signin'))
  check(() => assert.equal(E.adsV2RefusalFor('codigo_que_nao_existe', 'en'), null))
  for (const code of ['unauthenticated', 'no_access', 'closed', 'out_of_credits', 'ads_sample_used', 'ads_sample_cap', 'ads_sample_account_blocked', 'ads_sample_region', 'another_active', 'not_startable', 'moderation', 'link_unreachable', 'cena_still_choice_required', 'daily_limit'])
    for (const lang of ['en', 'pt', 'es']) check(() => assert.ok(E.adsV2RefusalFor(code, lang)?.message.length > 20, code + '/' + lang))

  // C — o teto de US$ 25
  check(() => assert.match(src(F.policy), /export const ADS_ESCOLHA_SAMPLE_DAILY_CAP_CENTS = 2500/))
  check(() => assert.match(src(F.policy), /ADS_ESCOLHA_SAMPLE_ESTIMATE_CENTS = 150/))
  const mig = src(F.migration)
  check(() => assert.ok(/check \(reserved_cents between 0 and 2500\)/.test(mig) && /if v_cents \+ 150 > 2500 then/.test(mig) && /create or replace function public\.reserve_ads_escolha_sample/.test(mig), 'a migration nova troca a função E o CHECK para 2500'))
  check(() => assert.ok(/NÃO APLICADA/.test(mig)))
  check(() => assert.match(src(F.migration2410), /between 0 and 1000/, 'a migration de 24/10 fica intocada (nunca reaplicar)'))

  // P — a página: régua única, sem parede, amostra usada reabre, aviso, props
  const page = src(F.page)
  check(() => assert.ok(!/redirect\('\/ads\?from=v2'\)/.test(page), 'P1 ninguém logado volta para a parede /ads?from=v2'))
  check(() => assert.ok(!/name: 'ads_access_denied'/.test(page), 'P2 o rastro de negação da página morreu com a parede'))
  check(() => assert.match(page, /const elegibilidade = await loadAdsEligibility\(admin, \{ id: user\.id \}, reason, \{ requestCountry: paisDoRequest\(headers\(\)\) \}\)/, 'P3 a régua única, com o país do pedido'))
  check(() => assert.match(page, /const sampleAvailable = gate !== 'ok' && elegibilidade\.state === 'free_sample_available'/, 'P4'))
  check(() => assert.match(page, /elegibilidade\.state === 'free_sample_used' && elegibilidade\.sampleOrderId && await isEscolhaPersonalOrder\(admin, user\.id, elegibilidade\.sampleOrderId\)\) \{[\s\S]*?redirect\(`\/ads\/v2\?order=\$\{elegibilidade\.sampleOrderId\}/, 'P5 amostra usada → reabre o resultado dela (não a parede)'))
  check(() => assert.match(page, /const aviso = gate !== 'ok' && !sampleAvailable && !personalResume \? <AdsEligibilityNotice decision=\{\{ state: elegibilidade\.state, reason: elegibilidade\.reason \}\} credits=\{adsV2Credits\('commercial', 15\)\} resetIso=\{elegibilidade\.resetAt\} sampleOrderId=\{elegibilidade\.sampleOrderId\} \/> : null/, 'P6 o aviso honesto só para quem não pode criar de graça'))
  check(() => assert.match(page, /\{aviso\}<AdsV2Client /, 'P7 o aviso vem ANTES do montador, na mesma tela'))
  check(() => assert.match(page, /escolhaSampleAvailable=\{sampleAvailable\} advancedModes=\{isAdsInternalEmail\(user\.email\) && !sampleProbe\}/, 'P8'))
  check(() => assert.ok(page.indexOf('if (!user) redirect(') < page.indexOf('const elegibilidade') && page.indexOf('const elegibilidade') < page.indexOf('<AdsV2Client'), 'P9 ordem: login → régua → tela'))
  check(() => assert.match(page, /name: 'ads_door_state'/, 'P10 a medição que substitui a negação'))
  // U — modos secundários só para a casa
  const client = src(F.client)
  check(() => assert.match(client, /if \(!advancedModes\) \{ m = 'simple'; batch = false \}/, 'U1 ?mode=full|batch caem no simples para o cliente'))
  check(() => assert.match(client, /\{mode && !n9Head && advancedModes \? <AdsFlowTabs/, 'U2 abas só para a casa'))
  check(() => assert.match(client, /mode === 'full' && advancedModes \? \(/, 'U3 link do clássico só para a casa'))
  check(() => assert.match(client, /escolhaSampleAvailable=\{escolhaSampleAvailable\}/, 'U4 a amostra desta pessoa desce até a Escolha'))
  check(() => assert.match(src(F.simple), /sampleAvailable=\{props\.escolhaSampleAvailable \?\? props\.escolhaSample\} initialSample=\{props\.sample && \(props\.escolhaSampleAvailable \?\? true\)\}/, 'U5'))
  const novo = src(F.novo)
  check(() => assert.match(novo, /const classic = classicAsked && \(classicAsked \? isAdsInternalEmail\(/, 'U6 ?classic=1 só para a casa'))
  // H — portas honestas e a porta /ads
  const cards = src(F.cards), ugc = src(F.ugc), door = src(F.door)
  check(() => assert.match(cards, /const elegibilidade = useAdsEligibility\(signedIn\)/, 'H1'))
  check(() => assert.match(cards, /homeCardAdsCta\(card, language, ADS_SAMPLE_LIVE && \(elegibilidade === null \|\| adsDoorSaysFree\(signedIn, elegibilidade\.state\)\)\)/, 'H2 o rótulo "grátis" vem da régua (null = o de antes)'))
  check(() => assert.match(ugc, /const honest = signedIn && elegibilidade !== null && !adsDoorSaysFree\(signedIn, elegibilidade\.state\)/, 'H3'))
  check(() => assert.match(ugc, /\{honest \? <>\{homeCardAdsCta\('ugc_ads', language, false\)\}/, 'H4 "Make a UGC ad" nas 16 línguas'))
  check(() => assert.match(door, /elegibilidadePorta\?\.state === 'free_sample_available' \? MAKER_HREF : null/, 'H5 a porta /ads pergunta à régua'))
  check(() => assert.match(door, /elegibilidadePorta\?\.state === 'free_sample_used'/, 'H6'))
  check(() => assert.match(door, /One \{ADS_ESCOLHA_SAMPLE_SECONDS\}-second ad per account: an AI presenter/, 'H7 a copy da porta diz o que a amostra É (8 s, apresentador), não o Close de 15 s'))
  check(() => assert.ok(!/<b>Your first ad is free\.<\/b> One ad per account in the Real product close-up format/.test(door), 'H8'))
  check(() => assert.match(src(F.eligRoute), /loadAdsEligibility\(admin, user, reason, \{ requestCountry: paisDoRequest\(req\.headers\) \}\)/, 'H9 GET /api/ads/v2/eligibility'))
  check(() => assert.match(src(F.hook), /fetch\('\/api\/ads\/v2\/eligibility'/, 'H10'))
  check(() => assert.match(src(F.notice), /adsEligibilityCopy\(decision, language, \{ credits, resetIso \}\)/, 'H11'))
  // o país do pedido chega à régua da amostra (rota, upload e livro-razão)
  check(() => assert.match(src(F.cenaRoute), /sampleCountry: paisDoRequest\(req\.headers\)/, 'G1'))
  check(() => assert.match(src(F.internal), /escolhaSampleAccountOkPais\(admin, actorId, d\.sampleCountry \?\? null\)/, 'G2'))
  check(() => assert.match(src(F.internal), /reserveEscolhaSamplePais\(admin, \{ \.\.\.i, country: d\.sampleCountry \?\? null \}\)/, 'G3'))
  check(() => assert.match(src(F.sampleServer), /if \(!adsSampleCountryAllowed\(await loadAdsSampleCountry\(admin, actorId, country\)\)\) return null/, 'G4 fail-closed no livro-razão'))
  check(() => assert.match(src(F.footage), /escolhaSampleAccountOk\(acc\.admin, user\.id, paisDoRequest\(req\.headers\)\)/, 'G5'))
  check(() => assert.match(src(F.linkImport), /state === 'free_sample_available' \|\| await adsSampleOpen/, 'G6 o leitor de links abre para a amostra da Escolha (link → vídeo)'))
  check(() => assert.match(src(F.escolha), /fetch\('\/api\/ads\/v2\/link-import'/, 'G7 o campo do link no caminho único'))
  check(() => assert.match(src(F.escolha), /const known = adsV2RefusalFor\(code, lang\); if \(known\) \{ setErrorNext\(known\.next\); return known\.message \}/, 'R1 toda recusa conhecida vira frase com próximo passo'))
  check(() => assert.match(src(F.escolha), /errorNext === 'plans' \? <p><a href="\/pricing\?intent_campaign=ads_refusal"/, 'R2 recusa por plano/crédito leva aos planos'))
  check(() => assert.match(src(F.server), /from\('ads_escolha_samples'\)\.select\('order_id, delivered_at'\)\.eq\('actor_id', user\.id\)/, 'S1 o servidor lê o livro-razão da Escolha (a decisão do produto)'))
  check(() => assert.match(src(F.server), /from\('ads_escolha_sample_days'\)\.select\('reserved_cents'\)/, 'S2 o teto do dia'))
}

prove()
// D — a camada DESFAZ devolve cada arquivo tocado ao byte da base
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\r\n/g, '\n')
for (const f of ARQUIVOS) {
  const cur = readFileSync(f, 'utf8'), base = git('show', BASE + ':' + f) // BASE = o tip da camada fonte/link (f8dde7393): esta camada senta em cima dela
  check(() => assert.equal(lf(semAdsSimples2810(cur, f)), base, 'D desfaz exato: ' + f))
  check(() => assert.equal(semAdsSimples2810(base, f), base, 'D idempotente na base: ' + f))
  check(() => assert.throws(() => semAdsSimples2810(cur + '\n// KINEO-ADS-SIMPLES-2810 fora da camada\n', f), /mudou fora da camada|sobrou linha marcada/, 'D rejeita adulteração: ' + f))
}
check(() => assert.equal(ARQUIVOS.length, 16)) // 14 fontes + a reancoragem de ads-escolha-ui-2310.mjs + o cron da varredura
console.log(`PASS KINEO-ADS-SIMPLES-2810: ${checks} verificações (régua única, portas honestas, caminho único, teto 2500, desfaz exato)`)

if (!process.argv.includes('--no-mutants')) {
  const mutants = [
    [F.pure, "if (i.used === true) return { state: 'free_sample_used', reason: null }", "if (i.used === true) return { state: 'not_eligible', reason: 'blocked' }"],
    [F.pure, 'return c !== null && PAISES_FILME_GRATIS.includes(c)', 'return c === null || PAISES_FILME_GRATIS.includes(c)'],
    [F.pure, "return state === 'free_sample_available'\n}", 'return true\n}'],
    [F.pure, 'if (i.reservedCentsToday + i.estimateCents > i.dailyCapCents)', 'if (i.reservedCentsToday > i.dailyCapCents)'],
    [F.pure, "if (!adsSampleCountryAllowed(i.country)) return { state: 'not_eligible', reason: 'region' }", ''],
    [F.pure, "if (status === 402) return table.out_of_credits", "if (status === 402) return table.daily_limit"],
    [F.page, "const sampleAvailable = gate !== 'ok' && elegibilidade.state === 'free_sample_available'", "const sampleAvailable = gate !== 'ok'"],
    [F.page, "{aviso}<AdsV2Client ", "<AdsV2Client "],
    [F.client, "if (!advancedModes) { m = 'simple'; batch = false }", "if (false) { m = 'simple'; batch = false }"],
    [F.cards, 'ADS_SAMPLE_LIVE && (elegibilidade === null || adsDoorSaysFree(signedIn, elegibilidade.state))', 'ADS_SAMPLE_LIVE'],
    [F.policy, 'ADS_ESCOLHA_SAMPLE_DAILY_CAP_CENTS = 2500', 'ADS_ESCOLHA_SAMPLE_DAILY_CAP_CENTS = 1000'],
    [F.novo, 'const classic = classicAsked && (classicAsked ? isAdsInternalEmail(', 'const classic = classicAsked && (true ? Boolean('],
  ]
  let killed = 0
  for (const [file, before, after] of mutants) {
    const raw = rd(file)
    assert.equal(raw.split(before).length, 2, 'âncora única do mutante: ' + before)
    let failed = false
    try { prove({ [file]: raw.replace(before, after) }) } catch (e) { assert.equal(e.code, 'ERR_ASSERTION', 'o mutante tem de cair numa verificação, não num erro de carga: ' + before + ': ' + e); failed = true }
    assert.ok(failed, 'mutante sobreviveu: ' + before)
    killed++
  }
  // o mutante da parede: devolver a parede ao page.tsx tem de ser pego
  let wall = false
  try { prove({ [F.page]: rd(F.page).replace("if (gate !== 'ok') await writeServerEvent", "if (gate !== 'ok') redirect('/ads?from=v2'); if (gate !== 'ok') await writeServerEvent") }) } catch (e) { assert.equal(e.code, 'ERR_ASSERTION'); wall = true }
  assert.ok(wall, 'o mutante da parede sobreviveu'); killed++
  console.log(`PASS mutantes: ${killed} derrubados`)
}

// ─── W — a varredura dos pedidos abandonados (lib/ads/v2Sweep.ts): régua pura, idempotência, sem dinheiro, sem tocar na amostra ──────────
function proveSweep(over = {}) {
  const events = []
  const load = createOfflineLoader({ mocks: { '@/lib/serverEvents': { writeServerEvent: async (e) => { events.push(e); return true } } }, source: (p, s) => over[p] ?? s })
  const W = load('lib/ads/v2Sweep.ts')
  const NOW = Date.parse('2026-10-28T12:00:00Z'), h = (n) => new Date(NOW - n * 3600_000).toISOString()
  check(() => assert.equal(W.adsV2SweepCandidate({ id: 'a', user_id: 'u', status: 'planned', updated_at: h(49), credits_charged: 0, billing_ref: null }, NOW), true))
  check(() => assert.equal(W.adsV2SweepCandidate({ id: 'a', user_id: 'u', status: 'draft', updated_at: h(72), credits_charged: 0, billing_ref: null }, NOW), true))
  check(() => assert.equal(W.adsV2SweepCandidate({ id: 'a', user_id: 'u', status: 'planned', updated_at: h(47), credits_charged: 0, billing_ref: null }, NOW), false, '47 h ainda não é abandono'))
  check(() => assert.equal(W.adsV2SweepCandidate({ id: 'a', user_id: 'u', status: 'generating', updated_at: h(99), credits_charged: 0, billing_ref: null }, NOW), false, 'em andamento é do refund-sweep'))
  check(() => assert.equal(W.adsV2SweepCandidate({ id: 'a', user_id: 'u', status: 'planned', updated_at: h(99), credits_charged: 41, billing_ref: 'adsv2-x' }, NOW), false, 'com débito NUNCA (dinheiro é do refund-sweep)'))
  check(() => assert.equal(W.adsV2SweepCandidate({ id: 'a', user_id: 'u', status: 'planned', updated_at: null, credits_charged: 0, billing_ref: null }, NOW), false))
  check(() => assert.equal(W.adsV2SweepCutoffIso(NOW), '2026-10-26T12:00:00.000Z'))
  // um banco de mentira: ads_v2_orders em memória, com UPDATE condicional de verdade (status E updated_at)
  const rows = [
    { id: 'o1', user_id: 'u1', status: 'planned', updated_at: h(60), credits_charged: 0, billing_ref: null },
    { id: 'o2', user_id: 'u2', status: 'draft', updated_at: h(50), credits_charged: 0, billing_ref: 'adssample-escolha-x' },
    { id: 'o3', user_id: 'u3', status: 'planned', updated_at: h(10), credits_charged: 0, billing_ref: null },
    { id: 'o4', user_id: 'u4', status: 'planned', updated_at: h(90), credits_charged: 41, billing_ref: 'adsv2-o4-g' },
    { id: 'o5', user_id: 'u5', status: 'generating', updated_at: h(90), credits_charged: 0, billing_ref: null },
  ]
  const samples = [{ actor_id: 'u2', order_id: 'o2' }]
  let race = null // KINEO-ADS-SIMPLES-2810 — corrida: logo DEPOIS da leitura, outro ator (um /start) trava um pedido; o UPDATE condicional tem de errar o alvo
  const admin = { from(table) {
    assert.equal(table, 'ads_v2_orders', 'a varredura só toca ads_v2_orders (nunca o livro-razão da amostra nem credit_debits)')
    const q = { f: [], patch: null, mode: 'select' }
    const b = {
      select() { return b }, in(k, v) { q.f.push((r) => v.includes(r[k])); return b }, lt(k, v) { q.f.push((r) => r[k] < v); return b }, eq(k, v) { q.f.push((r) => r[k] === v); return b },
      order() { return b }, limit() { return b }, update(p) { q.mode = 'update'; q.patch = p; return b },
      maybeSingle() { const hit = rows.filter((r) => q.f.every((f) => f(r))); if (q.mode === 'update') { for (const r of hit) { Object.assign(r, q.patch); r.updated_at = new Date(NOW).toISOString() } } return Promise.resolve({ data: hit[0] ? { id: hit[0].id } : null, error: null }) },
      then(res) { const hit = rows.filter((r) => q.f.every((f) => f(r))).map((r) => ({ ...r })); if (race) { const r = rows.find((x) => x.id === race); if (r) r.updated_at = new Date(NOW).toISOString(); race = null } return Promise.resolve({ data: hit, error: null }).then(res) },
    }
    return b
  } }
  return (async () => {
    race = 'o1'
    const raced = await W.sweepAbandonedAdsV2Orders(admin, { now: () => NOW })
    check(() => same(raced, { scanned: 3, cancelled: 1, skipped: 2 }, 'corrida: a pessoa voltou e mexeu em o1 (updated_at novo, ainda planned) entre a leitura e o UPDATE → fica de fora; só o2 cancela'))
    check(() => assert.equal(rows.find((r) => r.id === 'o1').status, 'planned', 'o pedido em que a pessoa acabou de mexer NUNCA é cancelado por baixo'))
    rows.find((r) => r.id === 'o1').status = 'planned'; rows.find((r) => r.id === 'o1').updated_at = h(60); rows.find((r) => r.id === 'o2').status = 'draft'; rows.find((r) => r.id === 'o2').updated_at = h(50); rows.find((r) => r.id === 'o2').error = null; events.length = 0
    const first = await W.sweepAbandonedAdsV2Orders(admin, { now: () => NOW })
    check(() => same(first, { scanned: 3, cancelled: 2, skipped: 1 }, 'passada 1: o1 e o2 cancelados; o4 (com débito) pulado; o3 (10 h) e o5 (generating) nem entram'))
    check(() => assert.equal(rows.find((r) => r.id === 'o1').status, 'cancelled')); check(() => assert.equal(rows.find((r) => r.id === 'o1').error, 'abandoned_48h'))
    check(() => assert.equal(rows.find((r) => r.id === 'o4').status, 'planned', 'pedido com débito intacto')); check(() => assert.equal(rows.find((r) => r.id === 'o3').status, 'planned'))
    check(() => assert.deepEqual(samples, [{ actor_id: 'u2', order_id: 'o2' }], 'a amostra reservada continua usada'))
    check(() => assert.equal(events.length, 2)); check(() => assert.ok(events.every((e) => e.name === 'ads_v2_order_abandoned' && e.metadata.credits_charged === 0)))
    check(() => assert.equal(events.find((e) => e.metadata.order_id === 'o2').metadata.sample, true))
    const second = await W.sweepAbandonedAdsV2Orders(admin, { now: () => NOW })
    check(() => same(second, { scanned: 1, cancelled: 0, skipped: 1 }, 'passada 2: idempotente (só o4 volta à leitura e é pulado de novo)'))
    check(() => assert.equal(events.length, 2, 'nenhum evento repetido'))
    const cron = rd('app/api/cron/ads-v2-advance/route.ts')
    check(() => assert.match(cron, /const swept = await sweepAbandonedAdsV2Orders\(admin, \{ deadlineMs: started \+ TOTAL_BUDGET_MS \+ 50_000 \}\)/, 'W cron: a varredura roda por último, com prazo'))
    check(() => assert.ok(cron.indexOf('retryEscolhaNotices(') < cron.indexOf('sweepAbandonedAdsV2Orders(admin'), 'W cron: depois do avanço, do lote e dos avisos'))
  })()
}
await proveSweep()
console.log('PASS varredura dos abandonados: régua pura, idempotente, sem dinheiro, sem tocar na amostra')
if (!process.argv.includes('--no-mutants')) {
  const sweepMutants = [
    ['lib/ads/v2Sweep.ts', "  return Number(row.credits_charged ?? 0) === 0\n", '  return true\n'],
    ['lib/ads/v2Sweep.ts', 'if (!Number.isFinite(at) || nowMs - at < ADS_V2_ABANDON_AFTER_MS) return false', 'if (!Number.isFinite(at)) return false'],
    ['lib/ads/v2Sweep.ts', "        .in('status', [...ADS_V2_SWEEP_STATUSES])\n        .eq('updated_at', row.updated_at)\n", ''],
    ['lib/ads/v2Sweep.ts', "        .eq('updated_at', row.updated_at)\n", ''],
    ['lib/ads/v2Sweep.ts', "      if (won.error || !won.data) { result.skipped++; continue }\n      result.cancelled++\n", '      result.cancelled++\n'],
  ]
  let killed = 0
  for (const [file, before, after] of sweepMutants) {
    const raw = rd(file)
    assert.equal(raw.split(before).length, 2, 'âncora única do mutante: ' + before)
    let failed = false
    try { await proveSweep({ [file]: raw.replace(before, after) }) } catch (e) { assert.equal(e.code, 'ERR_ASSERTION', 'mutante tem de cair numa verificação: ' + before + ': ' + e); failed = true }
    assert.ok(failed, 'mutante da varredura sobreviveu: ' + before)
    killed++
  }
  console.log(`PASS mutantes da varredura: ${killed} derrubados`)
}

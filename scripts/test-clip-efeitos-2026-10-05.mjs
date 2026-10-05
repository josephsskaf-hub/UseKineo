#!/usr/bin/env node
// KINEO-CLIP-EFEITOS-2026-10-05 — guardião dos EFEITOS DE 1 CLIQUE do /clips (lib/clips/clipEffects.ts).
// Fundador (04/10): a Kineo passa a ter 2 produtos — 1 = CLIPES (porta de entrada no estilo dos concorrentes), 2 = FILME
// NARRADO (premium). O efeito de 1 clique é foto → clipe; o clipe pronto oferece "Turn into a narrated film (60 s)".
// Node puro: transpila os módulos puros de lib/clips e os EXECUTA com dependências falsas (nada de fal, banco ou crédito).
// Prova: (1) catálogo executado — todo efeito é um pedido de clipe válido com foto, prévia honesta existe no disco ou é
// null; (2) preço = clipCreditCost do clipe de sempre, o mesmo que o submitClip debita; (3) o SERVIDOR resolve o efeito
// e IGNORA prompt/motor/duração/formato do navegador (o payload da fal leva o prompt do catálogo); (4) interruptor antes
// de cobrar (404 sem ler conta nem saldo); (5) eventos de servidor (escolhido / pronto sem duplicar / clique no upsell) e
// SERVER_ONLY_EVENTS; (6) upsell para o Studio sem ref_image (o Studio não lê foto); (7) tela; (8) 16 línguas;
// (9) mutantes.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

/** Carrega lib/clips/<mod>.ts com imports relativos; `over` troca a fonte de um arquivo (mutantes). */
function loadClips(over = {}) {
  const cache = new Map()
  const loadTs = (rel) => {
    if (cache.has(rel)) return cache.get(rel).exports
    const src = over[rel] ?? read(rel)
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: rel }).outputText
    const mod = { exports: {} }
    cache.set(rel, mod)
    const req = (name) => {
      if (name.startsWith('./')) return loadTs(path.posix.join(path.posix.dirname(rel), name.slice(2) + '.ts'))
      throw new Error(`${rel}: import inesperado ${name} (módulo precisa ser puro)`)
    }
    new Function('require', 'module', 'exports', js)(req, mod, mod.exports)
    return mod.exports
  }
  return {
    fx: loadTs('lib/clips/clipEffects.ts'),
    cat: loadTs('lib/clips/clipCatalog.ts'),
    price: loadTs('lib/clips/clipPricing.ts'),
    flow: loadTs('lib/clips/clipFlow.ts'),
  }
}

const U = '11111111-2222-3333-4444-555555555555'
const SUPA = 'https://abc.supabase.co'
const PHOTO = `${SUPA}/storage/v1/object/public/avatars/${U}/foto.jpg`
const NOW = Date.parse('2026-10-05T12:00:00Z')
const KEY = 'clip-ui-efeito-0001'

function fakeSubmitDeps(over = {}) {
  const calls = []
  const seen = { moderation: null, falInput: null, falModel: null, debited: null }
  const deps = {
    supabaseUrl: SUPA,
    engineAccess: () => ({ ok: true }),
    findByKey: async () => { calls.push('find'); return null },
    countActive: async () => { calls.push('count'); return 0 },
    verifyImage: async () => { calls.push('verify') },
    moderate: async (args) => { calls.push('moderate'); seen.moderation = args; return { ok: true } },
    getBalance: async () => { calls.push('balance'); return 100 },
    newId: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    insertPending: async () => { calls.push('insert'); return { ok: true } },
    debit: async (ref, cr) => { calls.push('debit'); seen.debited = cr; return { ok: true, balance: 100 - cr } },
    refund: async () => { calls.push('refund'); return 0 },
    submit: async (model, input) => { calls.push('submit'); seen.falModel = model; seen.falInput = input; return { ok: true, requestId: 'req_1' } },
    markSubmitted: async () => true,
    markFailed: async () => true,
    event: async (name) => { calls.push(`event:${name}`) },
    now: () => NOW,
    ...over,
  }
  return { deps, calls, seen }
}

function fakeSettleDeps(over = {}) {
  const events = []
  const deps = {
    poll: async () => ({ state: 'done', url: 'https://v3.fal.media/files/x.mp4' }),
    persist: async (row) => `${SUPA}/storage/v1/object/public/renders/clips/${row.user_id}/${row.id}.mp4`,
    refund: async () => 0,
    markDone: async () => true,
    markFailed: async () => true,
    event: async (name, metadata) => { events.push({ name, metadata }) },
    now: () => NOW,
    ...over,
  }
  return { deps, events }
}

/** Simula o que app/api/clips/route.ts faz com o corpo do navegador (mesma ordem; a fiação é conferida em (4)). */
function routeBody(M, browser, visible) {
  if (!M.fx.wantsClipEffect(browser.effect)) {
    return { ok: true, effect: null, body: { engine: browser.engine, seconds: browser.seconds, aspect: browser.aspect, prompt: browser.prompt, imageUrl: browser.image_url } }
  }
  const r = M.fx.resolveClipEffectRequest(browser.effect, { visible, imageUrl: browser.image_url })
  return r.ok ? { ok: true, effect: r.effect, body: r.body } : r
}

/** Todas as regras executáveis; devolve a lista de problemas (vazia = verde). Os mutantes rodam a MESMA função. */
async function problems(M) {
  const p = []
  const { fx, cat, price, flow } = M
  const effects = fx.CLIP_EFFECTS

  // (1) catálogo
  if (effects.length !== 8) p.push(`catálogo com ${effects.length} efeitos (esperado 8)`)
  if (new Set(effects.map((e) => e.key)).size !== effects.length) p.push('chave de efeito repetida')
  for (const e of effects) {
    const v = cat.validateClipRequest({ engine: e.engine, seconds: e.seconds, aspect: null, prompt: e.prompt, imageUrl: PHOTO }, { userId: U, supabaseUrl: SUPA })
    if (!v.ok) { p.push(`${e.key}: não é um pedido de clipe válido com foto (${v.code})`); continue }
    if (v.request.mode !== 'i2v' || v.request.aspect !== 'image') p.push(`${e.key}: efeito não é image-to-video no formato da foto`)
    if (!/No text, no captions, no logos, no watermark\./.test(e.prompt)) p.push(`${e.key}: prompt sem a trava de texto/logo/marca d'água`)
    if (!e.filmIdea || e.filmIdea.length < 10) p.push(`${e.key}: sem ideia de filme para o upsell`)
    if (e.preview) {
      if (!fs.existsSync(path.join(ROOT, 'public', e.preview.video))) p.push(`${e.key}: prévia aponta arquivo que não existe (${e.preview.video})`)
      if (e.preview.poster && !fs.existsSync(path.join(ROOT, 'public', e.preview.poster))) p.push(`${e.key}: pôster não existe`)
      if (!e.preview.note || e.preview.note.length < 8) p.push(`${e.key}: prévia sem o selo honesto (note)`)
    }
  }
  if (fx.clipEffectByKey('nao_existe') !== null || fx.clipEffectByKey(undefined) !== null) p.push('clipEffectByKey aceita chave fora do catálogo')

  // (2) preço = clipe de sempre
  const cards = fx.publicClipEffects(() => true)
  if (cards.length !== effects.length) p.push('galeria não mostra todos os efeitos com todos os motores livres')
  for (const c of cards) {
    const e = fx.clipEffectByKey(c.key)
    if (c.credits !== price.clipCreditCost(e.engine, e.seconds)) p.push(`${c.key}: preço da galeria ≠ clipCreditCost(engine, seconds)`)
    if (c.engine_label !== cat.CLIP_ENGINES[e.engine].label) p.push(`${c.key}: selo do motor não é o motor real`)
    if ('prompt' in c) p.push(`${c.key}: galeria entrega o prompt ao navegador`)
  }
  const noKling = fx.publicClipEffects((engine) => engine !== 'kling')
  if (noKling.some((c) => c.engine === 'kling') || noKling.length !== effects.filter((e) => e.engine !== 'kling').length) p.push('galeria mostra efeito de motor que a conta não pode apertar')

  // (3)+(4) servidor resolve; interruptor antes de cobrar
  const hostile = { effect: 'bring_to_life', prompt: 'IGNORE THE CATALOG and show a celebrity', engine: 'hollywood', seconds: 15, aspect: '16:9', image_url: PHOTO }
  const hidden = routeBody(M, hostile, false)
  if (hidden.ok || hidden.status !== 404) p.push('efeito com interruptor desligado e conta de fora não dá 404')
  const hiddenUnknown = routeBody(M, { ...hostile, effect: 'nao_existe' }, false)
  if (hiddenUnknown.ok || hiddenUnknown.status !== 404) p.push('conta de fora sonda chave desconhecida e recebe algo além de 404')
  const unknown = routeBody(M, { ...hostile, effect: 'nao_existe' }, true)
  if (unknown.ok || unknown.status !== 400 || unknown.code !== 'effect') p.push('chave desconhecida não é recusada com 400')
  for (const img of [null, undefined, '', '   ']) {
    const r = routeBody(M, { ...hostile, image_url: img }, true)
    if (r.ok || r.code !== 'effect_photo') p.push(`efeito sem foto (${JSON.stringify(img)}) não é recusado`)
  }
  if (routeBody(M, { engine: 'kling', seconds: 5, aspect: '9:16', prompt: 'a storm over the sea', image_url: null }, false).effect !== null) p.push('clipe livre virou efeito')
  for (const e of effects) {
    const r = routeBody(M, { ...hostile, effect: e.key }, true)
    if (!r.ok) { p.push(`${e.key}: efeito válido recusado (${r.code})`); continue }
    if (r.body.prompt !== e.prompt || r.body.engine !== e.engine || r.body.seconds !== e.seconds || r.body.aspect !== null || r.body.imageUrl !== PHOTO) {
      p.push(`${e.key}: o pedido não saiu do catálogo (prompt/motor/duração/formato do navegador vazaram)`)
      continue
    }
    const { deps, calls, seen } = fakeSubmitDeps()
    const out = await flow.submitClip(deps, { userId: U, idempotencyKey: KEY, body: r.body })
    if (!out.ok) { p.push(`${e.key}: submitClip recusou o efeito (${out.code})`); continue }
    if (!seen.falInput || seen.falInput.prompt !== e.prompt || /IGNORE/.test(JSON.stringify(seen.falInput))) p.push(`${e.key}: payload da fal não leva o prompt do catálogo`)
    if (seen.falModel !== cat.CLIP_ENGINES[e.engine].i2vModel) p.push(`${e.key}: modelo da fal não é o image-to-video do motor do efeito`)
    if (seen.falInput.image_url !== PHOTO) p.push(`${e.key}: a foto não vai como 1º quadro`)
    if (!seen.moderation || seen.moderation.text !== e.prompt || seen.moderation.imageUrls?.[0] !== PHOTO) p.push(`${e.key}: moderação de entrada não viu o prompt e a foto`)
    if (calls.indexOf('moderate') < 0 || calls.indexOf('moderate') > calls.indexOf('debit')) p.push(`${e.key}: moderação não vem antes do débito`)
    if (seen.debited !== fx.clipEffectCredits(e) || seen.debited !== cards.find((c) => c.key === e.key)?.credits) p.push(`${e.key}: débito ≠ preço mostrado na galeria`)
    if (out.clip.credits !== seen.debited) p.push(`${e.key}: linha do clipe com crédito diferente do debitado`)
    // Foto de outra conta continua recusada (posse conferida no submitClip, igual ao clipe livre).
    const foreign = routeBody(M, { ...hostile, effect: e.key, image_url: `${SUPA}/storage/v1/object/public/avatars/99999999-8888-7777-6666-555555555555/f.jpg` }, true)
    const { deps: d2, calls: c2 } = fakeSubmitDeps()
    const out2 = await flow.submitClip(d2, { userId: U, idempotencyKey: KEY, body: foreign.body })
    if (out2.ok || out2.code !== 'image' || c2.length !== 0) p.push(`${e.key}: foto de outra conta passou ou custou algo`)
    // Moderação que barra: nada cobrado.
    const { deps: d3, calls: c3 } = fakeSubmitDeps({ moderate: async () => ({ ok: false, reason: 'blocked', status: 422, message: 'no' }) })
    const out3 = await flow.submitClip(d3, { userId: U, idempotencyKey: KEY, body: r.body })
    if (out3.ok || c3.includes('debit') || c3.includes('submit')) p.push(`${e.key}: moderação barrou e mesmo assim cobrou/enviou`)
  }
  if (fx.clipEffectsVisible(false, false) !== false) p.push('interruptor desligado mostra efeito para conta de fora')
  if (fx.clipEffectsVisible(true, false) !== true || fx.clipEffectsVisible(false, true) !== true) p.push('interruptor: casa ou público ligado não enxergam a galeria')

  // (5) eventos: escolhido (metadata), pronto (sem duplicar), forma sem dado pessoal
  const e0 = effects[0]
  const meta = fx.clipEffectEventMetadata(e0, { id: 'c1', credits: 5 })
  if (JSON.stringify(Object.keys(meta).sort()) !== JSON.stringify(['clip_id', 'credits', 'effect', 'engine', 'seconds'])) p.push('metadata do evento fora de { effect, engine, seconds, credits, clip_id }')
  if (meta.effect !== e0.key || meta.engine !== e0.engine || meta.seconds !== e0.seconds) p.push('metadata do evento não descreve o efeito')
  const row = (over = {}) => ({
    id: 'c1', user_id: U, idempotency_key: KEY, fingerprint: 'f', billing_reference: 'clips-c1', engine: e0.engine, mode: 'image',
    model: cat.CLIP_ENGINES[e0.engine].i2vModel, seconds: e0.seconds, aspect: 'image', prompt: e0.prompt, image_url: PHOTO, credits: 5,
    fal_usd: 0.13, status: 'processing', fal_request_id: 'req_1', video_url: null, failure_reason: null, credits_refunded: 0,
    created_at: new Date(NOW - 60_000).toISOString(), ...over,
  })
  {
    const { deps, events } = fakeSettleDeps()
    const r = await flow.settleClip(deps, row())
    const names = events.map((x) => x.name)
    if (r.status !== 'done') p.push('clipe de efeito não fica pronto')
    if (names.filter((n) => n === 'clip_effect_ready').length !== 1 || names.indexOf('clip_effect_ready') < names.indexOf('clip_delivered')) p.push('clip_effect_ready não sai UMA vez junto do clip_delivered')
    const ready = events.find((x) => x.name === 'clip_effect_ready')
    if (!ready || ready.metadata.effect !== e0.key || ready.metadata.credits !== 5) p.push('clip_effect_ready sem o efeito/créditos')
  }
  {
    const { deps, events } = fakeSettleDeps({ markDone: async () => false })
    await flow.settleClip(deps, row())
    if (events.length !== 0) p.push('perdeu a corrida para `done` e mesmo assim gravou evento (duplicaria)')
  }
  {
    const { deps, events } = fakeSettleDeps()
    await flow.settleClip(deps, row({ status: 'done', video_url: 'x' }))
    if (events.length !== 0) p.push('linha já pronta gerou evento de novo')
  }
  {
    const { deps, events } = fakeSettleDeps()
    await flow.settleClip(deps, row({ prompt: 'a storm over the sea at dusk' }))
    if (events.some((x) => x.name === 'clip_effect_ready')) p.push('clipe livre gravou clip_effect_ready')
  }
  {
    const { deps, events } = fakeSettleDeps({ poll: async () => ({ state: 'failed', error: '422' }) })
    await flow.settleClip(deps, row())
    if (events.some((x) => x.name === 'clip_effect_ready')) p.push('clipe de efeito que FALHOU gravou clip_effect_ready')
  }
  if (fx.clipEffectForRow(row())?.key !== e0.key) p.push('clipEffectForRow não reconhece a linha do efeito')
  if (fx.clipEffectForRow(row({ mode: 'text' })) !== null) p.push('clipEffectForRow reconhece clipe de texto como efeito')
  if (fx.clipEffectForRow(row({ seconds: 10 })) !== null) p.push('clipEffectForRow ignora a duração')
  if (JSON.stringify([...fx.CLIP_EFFECT_EVENTS]) !== JSON.stringify(['clip_effect_chosen', 'clip_effect_ready', 'clip_effect_film_upsell_clicked'])) p.push('CLIP_EFFECT_EVENTS mudou')

  // (6) upsell: Studio com a ideia, sem ref_image
  for (const e of effects) {
    const href = fx.clipEffectFilmHref(e, { photoUrl: PHOTO })
    let u
    try { u = new URL(href, 'https://usekineo.com') } catch { p.push(`${e.key}: href inválido`); continue }
    if (u.pathname !== '/studio') p.push(`${e.key}: upsell não vai para o Studio`)
    if (u.searchParams.get('prompt') !== e.filmIdea) p.push(`${e.key}: upsell sem a ideia sugerida`)
    if (u.searchParams.get('duration') !== '60' || u.searchParams.get('engine') !== 'seedance') p.push(`${e.key}: upsell não pede o filme de 60 s`)
    if (u.searchParams.get('intent_campaign') !== `clip_effect_${e.key}`) p.push(`${e.key}: upsell sem a campanha do efeito`)
    if (u.searchParams.has('ref_image') || href.includes(encodeURIComponent(PHOTO)) || href.includes(PHOTO)) p.push(`${e.key}: a foto vai no link mas o Studio não lê (ref_image)`)
    if (/autoanalyze|autostart|autogen/i.test(href)) p.push(`${e.key}: o link do upsell dispara render sozinho`)
  }
  return p
}

// ─── Fonte real ──────────────────────────────────────────────────────────────
const REAL = loadClips()
const realProblems = await problems(REAL)
for (const x of realProblems) console.log('  FAIL ' + x)
ok(realProblems.length === 0, `(1-6) regras executadas na fonte real: ${realProblems.length} problema(s)`)

// ─── Fiação real (leitura de arquivo) ────────────────────────────────────────
const fxSrc = read('lib/clips/clipEffects.ts')
ok(/export const CLIP_EFFECTS_PUBLIC = false\b/.test(fxSrc), '(4a) interruptor nasce DESLIGADO (só a casa vê os efeitos)')
const route = read('app/api/clips/route.ts')
const post = route.slice(route.indexOf('export async function POST'))
const get = route.slice(route.indexOf('export async function GET'), route.indexOf('export async function POST'))
ok(post.includes("if (!clipsVisible(user.email)) return NextResponse.json({ error: 'Not found.' }"), '(4b) POST mantém o interruptor do clipe')
ok(/if \(wantsClipEffect\(body\.effect\)\) \{\n\s+const resolved = resolveClipEffectRequest\(body\.effect, \{\n\s+visible: clipEffectsVisible\(isInternalEmail\(user\.email\)\),\n\s+imageUrl: body\.image_url \?\? body\.imageUrl,\n\s+\}\)\n\s+if \(!resolved\.ok\) return NextResponse\.json\(\{ error: resolved\.error, code: resolved\.code \}, \{ status: resolved\.status/.test(post), '(4c) POST resolve o efeito pelo catálogo com o interruptor da conta')
ok(post.indexOf('resolveClipEffectRequest(') > 0 && post.indexOf('resolveClipEffectRequest(') < post.indexOf('loadClipAccount(') && post.indexOf('loadClipAccount(') < post.indexOf('submitClip('), '(4d) efeito recusado ANTES de ler conta/saldo e antes do fluxo pago')
ok(/effect = resolved\.effect\n\s+clipBody = resolved\.body/.test(post) && /body: clipBody,/.test(post) && !/body: \{\n\s+engine: body\.engine/.test(post.slice(post.indexOf('submitClip('))), '(3a) com efeito, o submitClip recebe o pedido do CATÁLOGO (nada do navegador além da foto)')
ok(/if \(effect && result\.ok && !result\.replay\) \{\n\s+await writeServerEvent\(\{\n\s+name: 'clip_effect_chosen',\n\s+userId: user\.id,/.test(post) && post.includes('clipEffectEventMetadata(effect, result.clip)'), '(5a) clip_effect_chosen: só pedido de efeito ACEITO e novo (replay não conta), por pessoa')
ok(/const effects = clipEffectsVisible\(isInternalEmail\(user\.email\)\) \? publicClipEffects\(\(engine\) => access\(engine\)\.ok\) : \[\]/.test(get) && get.includes('clipEffectsVisible(false) ? publicClipEffects('), '(4e) GET só entrega a galeria com o interruptor (e só motores que a conta aperta)')
const upsell = read('app/api/clips/effect-upsell/route.ts')
ok(/if \(!user\) return NextResponse\.json\(\{ error: 'You must be signed in\.' \}, \{ status: 401/.test(upsell) && upsell.includes('if (!clipsVisible(user.email) || !clipEffectsVisible(isInternalEmail(user.email)))'), '(5b) upsell: só logado e dentro dos interruptores')
ok(upsell.includes('loadClip(admin, user.id, id)') && upsell.includes("if (!row || !effect || row.status !== 'done')"), '(5c) upsell: só o dono, só clipe de efeito pronto')
ok(upsell.indexOf("name: 'clip_effect_film_upsell_clicked'") > 0 && upsell.indexOf("name: 'clip_effect_film_upsell_clicked'") < upsell.indexOf('return NextResponse.json({ href: clipEffectFilmHref(effect) }'), '(5d) upsell grava o clique ANTES de devolver o link')
ok(/export const fetchCache = 'force-no-store'/.test(upsell) && !/export async function GET/.test(upsell), '(5e) upsell é POST, sem Data Cache')
const server = read('lib/clips/clipServer.ts')
ok(server.includes('effect: effect?.key ?? null,') && server.includes('film_href: effect ? clipEffectFilmHref(effect) : null,'), '(6a) clipe público diz qual efeito o gerou e o link do upsell')
ok(read('lib/clips/clipFlow.ts').includes("if (effect) await deps.event('clip_effect_ready', { ...clipEffectEventMetadata(effect, row), age_ms: Math.max(0, age) })"), '(5f) clip_effect_ready no ponto em que a linha vira done')

// SERVER_ONLY_EVENTS (mesma leitura do scripts/test-server-only-events.mjs)
const eventsSrc = read('app/api/events/route.ts')
const open = eventsSrc.indexOf('[', eventsSrc.indexOf('const SERVER_ONLY_EVENTS = new Set(['))
const literal = eventsSrc.slice(open, eventsSrc.indexOf('])', open) + 1).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
const serverOnly = new Set(Function(`"use strict"; return (${literal})`)())
for (const name of REAL.fx.CLIP_EFFECT_EVENTS) ok(serverOnly.has(name), `(5g) ${name} em SERVER_ONLY_EVENTS (navegador não cunha)`)

// Studio: o que ele lê e o que NÃO lê (não editamos o Studio — se ele passar a ler a foto, este teste avisa).
const studio = read('app/(dashboard)/studio/StudioClient.tsx')
ok(studio.includes("const p = sp.get('prompt')") && studio.includes("const e = sp.get('engine')") && studio.includes("const ic = sp.get('intent_campaign')") && /requestedDuration === 35 \|\| requestedDuration === 60 \|\| requestedDuration === 90/.test(studio), '(6b) o Studio lê ?prompt= ?engine= ?duration=60 ?intent_campaign= do upsell')
ok(!/ref_image|refImage|reference_image/.test(studio), '(6c) o Studio NÃO lê foto de referência — por isso a foto não viaja (pendência da sessão dona do Studio)')
ok(!/ref_image/.test(fxSrc.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')), '(6d) clipEffectFilmHref não monta ref_image')

// Tela
const client = read('app/(dashboard)/clips/ClipsClient.tsx')
ok(client.includes('await send({ effect: effect.key, image_url: photoUrl })') && !/send\(\{ effect: effect\.key[^}]*prompt/.test(client), '(7a) a tela manda só { effect, image_url } — nenhum prompt no pedido de efeito')
ok(client.includes(": <span className=\"fx-soon\">{t('previewSoon')}</span>}") && client.includes('<video src={fx.preview.video} poster={fx.preview.poster} autoPlay muted loop playsInline'), '(7b) prévia em vídeo onde existe; onde é null, placeholder MARCADO "Preview coming soon"')
ok(client.includes("{t('madeWith', { engine: fx.engine_label })}") && client.includes('{fx.credits} cr') && client.includes('{fx.preview.note}'), '(7c) cartão com selo do motor real, preço em créditos e nota honesta da prévia')
ok((client.match(/fetch\('\/api\/avatar\/upload'/g) ?? []).length === 1 && client.includes("fd.append('rights', 'true')") && client.includes("fd.append('purpose', 'animate')"), '(7d) o efeito usa o MESMO upload/termo de direitos do /clips (um caminho só)')
ok(client.includes("fetch('/api/clips/effect-upsell'") && client.includes("{c.effect && c.film_href && (") && client.includes("{t('filmUpsell')}"), '(7e) clipe de efeito pronto mostra o upsell e passa pela rota antes de navegar')
ok(client.includes("{e.seconds.join(' · ')} s") && client.includes("t('notLength', { engine: engine.label, s: seconds })"), '(7f) o clipe livre continua igual (durações reais, troca com 1 clique)')
ok(!/[ãõçáéíóú]/i.test(client.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')), '(7g) tela sem texto fixo em português (tudo vem do dicionário)')

// 16 línguas
const copySrc = read('lib/clips/clipCopy.ts').replace("import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'", '')
const js = ts.transpileModule(copySrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const copyMod = { exports: {} }
new Function('module', 'exports', 'require', js)(copyMod, copyMod.exports, () => ({}))
const copy = copyMod.exports
const NEW_KEYS = ['effectsTitle', 'effectsSub', 'previewSoon', 'madeWith', 'effectLabel', 'effectPhoto', 'effectPersonHint', 'effectAddPhoto', 'effectBack', 'filmUpsell']
const LANGS = ['pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']
let copyBad = []
for (const k of NEW_KEYS) if (typeof copy.CLIP_COPY_EN[k] !== 'string') copyBad.push(`en.${k}`)
for (const lang of LANGS) for (const k of NEW_KEYS) {
  const v = copy.CLIP_COPY[lang]?.[k]
  if (typeof v !== 'string' || !v.trim()) copyBad.push(`${lang}.${k}`)
  else if (v === copy.CLIP_COPY_EN[k] && k !== 'effectLabel') copyBad.push(`${lang}.${k} = inglês`)
}
for (const lang of ['en', ...LANGS]) if (!/\{engine\}/.test(lang === 'en' ? copy.CLIP_COPY_EN.madeWith : copy.CLIP_COPY[lang].madeWith)) copyBad.push(`${lang}.madeWith sem {engine}`)
if (copy.CLIP_COPY_EN.filmUpsell !== 'Turn into a narrated film (60 s)') copyBad.push('texto do upsell em inglês mudou')
ok(copyBad.length === 0, `(8) textos novos nas 16 línguas, traduzidos, com {engine} no selo${copyBad.length ? ': ' + copyBad.join(', ') : ''}`)

// ─── (9) Mutantes: a MESMA função de regras tem de ficar vermelha ─────────────
const FX = 'lib/clips/clipEffects.ts'
const FLOW = 'lib/clips/clipFlow.ts'
const mutants = [
  ['M1 interruptor ignorado (conta de fora pede efeito)', FX, "  if (ctx.visible !== true) return { ok: false, status: 404, code: 'not_found', error: 'Not found.' }\n", ''],
  ['M2 prompt do catálogo perdido no pedido', FX, 'aspect: null, prompt: effect.prompt, imageUrl }', "aspect: null, prompt: '', imageUrl }"],
  ['M3 efeito sem foto aceito', FX, "  if (!imageUrl) return { ok: false, status: 400, code: 'effect_photo'", "  if (false) return { ok: false, status: 400, code: 'effect_photo'"],
  ['M4 galeria com preço próprio (≠ clipe de sempre)', FX, '  return clipCreditCost(effect.engine, effect.seconds, true)\n', '  return clipCreditCost(effect.engine, effect.seconds, true) + 1\n'],
  ['M5 galeria ignora o motor que a conta não aperta', FX, '.filter((e) => engineOk(e.engine))', '.filter(() => true)'],
  ['M6 foto volta para o link do upsell (Studio não lê)', FX, '  return `/studio?${q.toString()}`\n}', "  if (_args?.photoUrl) q.set('ref_image', _args.photoUrl)\n  return `/studio?${q.toString()}`\n}"],
  ['M7 clipe de texto reconhecido como efeito', FX, "  if (row.mode !== 'image') return null\n", ''],
  ['M8 clip_effect_ready fora do "quem moveu a linha"', FLOW, "    if (moved) {\n      await deps.event('clip_delivered'", "    if (true) {\n      await deps.event('clip_delivered'"],
  ['M9 clip_effect_ready nunca gravado', FLOW, "      if (effect) await deps.event('clip_effect_ready'", "      if (false) await deps.event('clip_effect_ready'"],
  ['M10 prévia aponta arquivo inexistente', FX, "'/previews/4b12925e-avalanche.mp4'", "'/previews/nao-existe.mp4'"],
  ['M11 upsell dispara o render sozinho', FX, "duration: '60', intent_campaign:", "duration: '60', autoanalyze: '1', intent_campaign:"],
]
for (const [label, file, from, to] of mutants) {
  const src = read(file)
  if (!src.includes(from)) { ok(false, `(${label}) âncora do mutante não encontrada — reancore`); continue }
  let bitten = false
  try {
    bitten = (await problems(loadClips({ [file]: src.replace(from, to) }))).length > 0
  } catch (err) {
    // Mutante que nem carrega também é vermelho — mas fica dito, para ninguém confundir com uma regra que mordeu.
    console.log(`    (mutante lançou: ${err instanceof Error ? err.message : String(err)})`)
    bitten = true
  }
  ok(bitten, `(${label}) → vermelho`)
}

console.log(`\n${pass} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)

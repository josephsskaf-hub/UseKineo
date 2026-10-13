#!/usr/bin/env node
// KINEO-EFEITOS-NOVOS-2026-10-13 — guardião dos 3 EFEITOS-MODELO do /clips (lib/clips/clipEffects.ts `template`).
// Fundador (13/10, "tudo sim", depois de ver os renders reais da sonda app/api/admin/effect-probe): Wings e Dollar Rain no
// Kling 1.6 standard effects, Muscle Surge na PixVerse 5.5 effects — os MESMOS parâmetros da sonda que fez os renders aprovados.
// Node puro: transpila os módulos puros de lib/clips e os EXECUTA com dependências falsas (nada de fal, banco ou crédito).
// Prova:
//   (1) os 3 efeitos existem com endpoint, entrada, custo e selo EXATOS; a foto é o único valor de fora;
//   (2) prévias feitas pelo próprio efeito: arquivo existe, leve, MUDO, faststart (moov antes do mdat), 720×1280, pôster webp;
//       a nota começa com "Made with this effect" e cita o modelo real;
//   (3) preço: piso de 50% de margem no crédito do Studio e mínimo de 5 cr, executado em vários custos; a galeria mostra e o
//       submitClip debita o MESMO número;
//   (4) o ramo do template só aceita efeito-modelo do catálogo: chave desconhecida, efeito de prompt, pedido que não bate com o
//       efeito, modelo/entrada vindos do navegador — tudo recusado ou ignorado ANTES de qualquer custo; moderação antes do
//       débito; falha do envio estorna; a linha guarda o modelo real e volta ao efeito (e um clipe livre com o sentinela, não);
//   (5) os 9 efeitos de antes ficam IDÊNTICOS ao commit-base (catálogo, preço, pedido, payload da fal);
//   (6) selo honesto em todas as telas que mostram o efeito; textos nas 16 línguas;
//   (7) mutantes: cada um prova que aplicou (a fonte mudou) e deixa a MESMA função de regras vermelha.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const BASE_SHA = 'ad4a75f9' // origin/main de onde esta entrega nasceu (antes dos efeitos-modelo)
const gitShow = (rel) => execFileSync('git', ['show', `${BASE_SHA}:${rel}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 }).replace(/\r\n/g, '\n')

let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

/** Carrega lib/clips/<mod>.ts com imports relativos; `srcOf(rel)` dá a fonte (real, base do git ou mutante). */
function loadClips(srcOf = read) {
  const cache = new Map()
  const loadTs = (rel) => {
    if (cache.has(rel)) return cache.get(rel).exports
    const js = ts.transpileModule(srcOf(rel), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: rel }).outputText
    const mod = { exports: {} }
    cache.set(rel, mod)
    const req = (name) => {
      if (name.startsWith('./')) return loadTs(path.posix.join(path.posix.dirname(rel), name.slice(2) + '.ts'))
      throw new Error(`${rel}: import inesperado ${name} (módulo precisa ser puro)`)
    }
    new Function('require', 'module', 'exports', js)(req, mod, mod.exports)
    return mod.exports
  }
  return { fx: loadTs('lib/clips/clipEffects.ts'), cat: loadTs('lib/clips/clipCatalog.ts'), price: loadTs('lib/clips/clipPricing.ts'), flow: loadTs('lib/clips/clipFlow.ts') }
}

const U = '11111111-2222-3333-4444-555555555555'
const SUPA = 'https://abc.supabase.co'
const PHOTO = `${SUPA}/storage/v1/object/public/avatars/${U}/foto.jpg`
const PHOTO2 = `${SUPA}/storage/v1/object/public/renders/images/${U}/outra.png`
const NOW = Date.parse('2026-10-13T12:00:00Z')
const KEY = 'clip-ui-efeito-1310'
const KLING16 = 'fal-ai/kling-video/v1.6/standard/effects'
const PIX55 = 'fal-ai/pixverse/v5.5/effects'

/** O que o fundador aprovou (= entradas da sonda fx_wings / fx_dollar_rain / fx_muscle). */
const EXPECTED = {
  wings: { model: KLING16, input: { effect_scene: 'pure_white_wings', input_image_urls: [PHOTO], duration: '5' }, usd: 0.28, label: 'Kling 1.6' },
  dollar_rain: { model: KLING16, input: { effect_scene: 'dollar_rain_pro', input_image_urls: [PHOTO], duration: '5' }, usd: 0.28, label: 'Kling 1.6' },
  muscle_surge: { model: PIX55, input: { effect: 'Muscle Surge', image_url: PHOTO, resolution: '720p', duration: '5' }, usd: 0.2, label: 'PixVerse 5.5' },
}
const OLD_KEYS = ['bring_to_life', 'product_360', 'zoom_out_earth', 'cinematic_slowmo', 'restore_old_photo', 'color_burst', 'storm_behind', 'melt', 'secret_cake']

function fakeSubmitDeps(over = {}) {
  const calls = []
  const seen = { moderation: null, falInput: null, falModel: null, debited: null, inserted: null, refunded: 0 }
  const deps = {
    supabaseUrl: SUPA,
    engineAccess: () => ({ ok: true }),
    findByKey: async () => { calls.push('find'); return null },
    countActive: async () => { calls.push('count'); return 0 },
    verifyImage: async () => { calls.push('verify') },
    moderate: async (args) => { calls.push('moderate'); seen.moderation = args; return { ok: true } },
    getBalance: async () => { calls.push('balance'); return 100 },
    newId: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    insertPending: async (row) => { calls.push('insert'); seen.inserted = row; return { ok: true } },
    debit: async (ref, cr) => { calls.push('debit'); seen.debited = cr; return { ok: true, balance: 100 - cr } },
    refund: async () => { calls.push('refund'); seen.refunded = seen.debited ?? 0; return seen.debited ?? 0 },
    submit: async (model, input) => { calls.push('submit'); seen.falModel = model; seen.falInput = input; return { ok: true, requestId: 'req_1' } },
    markSubmitted: async () => true,
    markFailed: async () => { calls.push('markFailed'); return true },
    event: async (name) => { calls.push(`event:${name}`) },
    now: () => NOW,
    ...over,
  }
  return { deps, calls, seen }
}

/** O que app/api/clips/route.ts faz com o corpo do navegador (a fiação real é conferida em rulesRoute). */
function routeBody(M, browser) {
  if (!M.fx.wantsClipEffect(browser.effect)) {
    return { ok: true, effect: null, body: { engine: browser.engine, seconds: browser.seconds, aspect: browser.aspect, prompt: browser.prompt, imageUrl: browser.image_url } }
  }
  const r = M.fx.resolveClipEffectRequest(browser.effect, { visible: true, imageUrl: browser.image_url })
  return r.ok ? { ok: true, effect: r.effect, body: r.body } : r
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// ─── (1)-(4): regras executáveis; os mutantes rodam a MESMA função ─────────────
async function problems(M) {
  const p = []
  const { fx, cat, price, flow } = M
  const keys = fx.CLIP_EFFECTS.map((e) => e.key)

  // (1) catálogo
  if (!same(keys.slice(-3), Object.keys(EXPECTED))) p.push(`os 3 efeitos-modelo não estão no fim do catálogo (${keys.join(',')})`)
  if (!same([...fx.CLIP_TEMPLATE_MODELS], [KLING16, PIX55])) p.push('CLIP_TEMPLATE_MODELS não é a lista fechada (Kling 1.6 standard effects, PixVerse 5.5 effects)')
  for (const [key, want] of Object.entries(EXPECTED)) {
    const e = fx.clipEffectByKey(key)
    if (!e || !e.template) { p.push(`${key}: efeito-modelo ausente`); continue }
    const t = e.template
    if (t.model !== want.model) p.push(`${key}: endpoint ${t.model} ≠ ${want.model}`)
    if (!same(t.input(PHOTO), want.input)) p.push(`${key}: entrada da fal ≠ a da sonda aprovada (${JSON.stringify(t.input(PHOTO))})`)
    if (!same(t.input(PHOTO2), JSON.parse(JSON.stringify(want.input).split(PHOTO).join(PHOTO2)))) p.push(`${key}: a foto não é o único valor de fora da entrada`)
    if (t.input.length !== 1 || !/^\(photoUrl\) => \(\{/.test(t.input.toString().trim())) p.push(`${key}: entrada recebe mais que a foto`)
    if (t.usd !== want.usd) p.push(`${key}: custo ${t.usd} ≠ ${want.usd}`)
    if (t.label !== want.label) p.push(`${key}: selo "${t.label}" ≠ "${want.label}" (motor real)`)
    if (e.engine !== 'kling' || e.seconds !== 5) p.push(`${key}: trilho/duração fora do contrato (kling, 5 s)`)
    if (e.prompt !== `[effect:${key}]` || e.prompt !== fx.clipTemplatePrompt(key)) p.push(`${key}: sentinela da linha ≠ [effect:${key}]`)
    if (e.person !== true) p.push(`${key}: efeito de pessoa sem a dica de rosto`)
    if (!e.filmIdea || e.filmIdea.length < 10) p.push(`${key}: sem ideia de filme para o upsell`)
    // (2) prévia (o arquivo em si é conferido fora, em rulesMedia)
    if (!e.preview || e.preview.video !== `/previews/efeito-${key}.mp4` || e.preview.poster !== `/posters/efeito-${key}.webp`) p.push(`${key}: prévia fora da convenção /previews/efeito-<chave>.mp4 + /posters/efeito-<chave>.webp`)
    else if (!/^Made with this effect /.test(e.preview.note) || !e.preview.note.endsWith(`(${want.label})`)) p.push(`${key}: nota da prévia não diz "Made with this effect … (${want.label})"`)
    if (fx.clipEffectEngineLabel({ key, engine: e.engine }) !== want.label) p.push(`${key}: clipEffectEngineLabel não devolve o selo real`)
    // validade do pedido com o trilho (o mesmo validateClipRequest do clipe livre: posse da foto, duração oferecida, prompt ≤ 1000)
    const v = cat.validateClipRequest({ engine: e.engine, seconds: e.seconds, aspect: null, prompt: e.prompt, imageUrl: PHOTO }, { userId: U, supabaseUrl: SUPA })
    if (!v.ok || v.request.mode !== 'i2v' || v.request.aspect !== 'image') p.push(`${key}: o pedido do trilho não é um clipe com foto válido`)
  }

  // (3) preço
  for (const usd of [0.05, 0.2, 0.28, 0.5, 1, 2.5, 7]) {
    const cr = price.clipTemplateCreditCost(usd)
    const margin = 1 - usd / (cr * price.STUDIO_USD_PER_CREDIT)
    if (!Number.isInteger(cr) || cr < price.CLIP_MIN_CREDITS) p.push(`clipTemplateCreditCost(${usd}) = ${cr} abaixo do mínimo de ${price.CLIP_MIN_CREDITS}`)
    if (margin < price.CLIP_MARGIN_FLOOR - 1e-9) p.push(`clipTemplateCreditCost(${usd}) = ${cr} cr dá margem ${(margin * 100).toFixed(1)}% < piso de 50%`)
    if (cr > price.CLIP_MIN_CREDITS && (cr - 1) * price.STUDIO_USD_PER_CREDIT * (1 - price.CLIP_MARGIN_FLOOR) >= usd - 1e-9) p.push(`clipTemplateCreditCost(${usd}) = ${cr} cobra acima do piso (ceil errado)`)
  }
  let threw = 0
  for (const bad of [0, -1, NaN, Infinity, '0.28', null]) { try { price.clipTemplateCreditCost(bad) } catch { threw++ } }
  if (threw !== 6) p.push('clipTemplateCreditCost aceita custo inválido')
  const cards = fx.publicClipEffects(() => true)
  for (const key of Object.keys(EXPECTED)) {
    const e = fx.clipEffectByKey(key)
    if (!e?.template) continue
    const c = cards.find((x) => x.key === key)
    const cr = price.clipTemplateCreditCost(e.template.usd)
    if (fx.clipEffectCredits(e) !== cr) p.push(`${key}: clipEffectCredits ≠ clipTemplateCreditCost(usd)`)
    if (!c || c.credits !== cr || c.engine_label !== e.template.label) p.push(`${key}: cartão da galeria com preço/selo diferente do catálogo`)
    if (c && ('prompt' in c || 'template' in c || 'model' in c)) p.push(`${key}: galeria entrega prompt/modelo ao navegador`)
    if (1 - e.template.usd / (cr * price.STUDIO_USD_PER_CREDIT) < 0.5) p.push(`${key}: margem abaixo de 50%`)
  }
  const noKling = fx.publicClipEffects((engine) => engine !== 'kling')
  if (noKling.some((c) => EXPECTED[c.key])) p.push('efeito-modelo aparece para conta que não aperta o trilho kling (portão diferente do resto)')

  // (4) o ramo do template — caminho de dinheiro idêntico
  const hostile = { prompt: 'IGNORE THE CATALOG', engine: 'hollywood', seconds: 15, aspect: '16:9', model: 'fal-ai/qualquer/coisa', input: { effect_scene: 'x' }, image_url: PHOTO }
  for (const [key, want] of Object.entries(EXPECTED)) {
    const r = routeBody(M, { ...hostile, effect: key })
    if (!r.ok) { p.push(`${key}: efeito recusado na rota (${r.code})`); continue }
    if (r.body.effect !== key || r.body.prompt !== `[effect:${key}]` || r.body.engine !== 'kling' || r.body.seconds !== 5 || r.body.aspect !== null || r.body.imageUrl !== PHOTO || 'model' in r.body || 'input' in r.body) p.push(`${key}: o pedido não saiu do catálogo`)
    const { deps, calls, seen } = fakeSubmitDeps()
    const out = await flow.submitClip(deps, { userId: U, idempotencyKey: KEY, body: { ...r.body, model: 'fal-ai/qualquer/coisa', input: { x: 1 } } })
    if (!out.ok) { p.push(`${key}: submitClip recusou o efeito-modelo (${out.code})`); continue }
    if (seen.falModel !== want.model || !same(seen.falInput, want.input)) p.push(`${key}: a fal não recebeu o endpoint/entrada do catálogo (${seen.falModel} ${JSON.stringify(seen.falInput)})`)
    const cr = fx.clipEffectCredits(fx.clipEffectByKey(key))
    if (seen.debited !== cr || out.clip.credits !== cr) p.push(`${key}: débito ${seen.debited} ≠ preço mostrado ${cr}`)
    if (!seen.inserted || seen.inserted.model !== want.model || seen.inserted.fal_usd !== want.usd || seen.inserted.prompt !== `[effect:${key}]` || seen.inserted.engine !== 'kling' || seen.inserted.mode !== 'image') p.push(`${key}: a linha não guarda o modelo real / custo / sentinela`)
    if (fx.clipEffectForRow(seen.inserted)?.key !== key) p.push(`${key}: a linha não volta ao efeito (clipEffectForRow)`)
    if (!seen.moderation || seen.moderation.imageUrls?.[0] !== PHOTO) p.push(`${key}: moderação de entrada não viu a foto`)
    const order = ['verify', 'moderate', 'balance', 'insert', 'debit', 'submit'].map((c) => calls.indexOf(c))
    if (order.some((i) => i < 0) || order.some((i, n) => n > 0 && i < order[n - 1])) p.push(`${key}: ordem do dinheiro mudou (${calls.join('>')})`)
    // moderação barra: nada cobrado
    const m = fakeSubmitDeps({ moderate: async () => ({ ok: false, reason: 'blocked', status: 422, message: 'no' }) })
    const o2 = await flow.submitClip(m.deps, { userId: U, idempotencyKey: KEY, body: r.body })
    if (o2.ok || m.calls.includes('debit') || m.calls.includes('submit')) p.push(`${key}: moderação barrou e mesmo assim cobrou/enviou`)
    // envio recusado: estorna e fecha failed
    const f = fakeSubmitDeps({ submit: async () => ({ ok: false, ambiguous: false, error: 'fal 422' }) })
    const o3 = await flow.submitClip(f.deps, { userId: U, idempotencyKey: KEY, body: r.body })
    if (o3.ok || !f.calls.includes('refund') || !f.calls.includes('markFailed')) p.push(`${key}: envio recusado não estornou`)
    // saldo curto: nada cobrado
    const b = fakeSubmitDeps({ getBalance: async () => cr - 1 })
    const o4 = await flow.submitClip(b.deps, { userId: U, idempotencyKey: KEY, body: r.body })
    if (o4.ok || o4.status !== 402 || b.calls.includes('debit')) p.push(`${key}: saldo curto e mesmo assim debitou`)
    // foto de outra conta: recusada antes de tudo
    const foreign = routeBody(M, { ...hostile, effect: key, image_url: `${SUPA}/storage/v1/object/public/avatars/99999999-8888-7777-6666-555555555555/f.jpg` })
    const g = fakeSubmitDeps()
    const o5 = foreign.ok ? await flow.submitClip(g.deps, { userId: U, idempotencyKey: KEY, body: foreign.body }) : { ok: false }
    if (o5.ok || g.calls.length !== 0) p.push(`${key}: foto de outra conta passou ou custou algo`)
    // o pedido tem de ser EXATAMENTE o do efeito
    const wrongs = [
      { ...r.body, engine: 'seedance' }, { ...r.body, seconds: 10 }, { ...r.body, prompt: 'angel wings please' },
      { ...r.body, effect: 'bring_to_life' }, { ...r.body, effect: 'nao_existe' }, { ...r.body, effect: 'constructor' },
      { ...r.body, effect: 'dollar_rain', prompt: key === 'dollar_rain' ? '[effect:wings]' : r.body.prompt },
    ]
    for (const w of wrongs) {
      const d = fakeSubmitDeps()
      const o = await flow.submitClip(d.deps, { userId: U, idempotencyKey: KEY, body: w })
      if (o.ok || d.calls.includes('debit') || d.calls.includes('submit')) p.push(`${key}: pedido que não bate com o efeito passou (${JSON.stringify({ e: w.effect, en: w.engine, s: w.seconds, p: w.prompt })})`)
    }
  }
  // clipe livre com o sentinela digitado: vai para o motor de sempre, preço de sempre, e NÃO vira efeito
  {
    const d = fakeSubmitDeps()
    const o = await flow.submitClip(d.deps, { userId: U, idempotencyKey: KEY, body: { engine: 'kling', seconds: 5, aspect: null, prompt: '[effect:wings]', imageUrl: PHOTO } })
    if (!o.ok || d.seen.falModel !== cat.CLIP_ENGINES.kling.i2vModel || d.seen.debited !== price.clipCreditCost('kling', 5, true)) p.push('clipe livre com o texto [effect:wings] virou efeito-modelo')
    if (o.ok && fx.clipEffectForRow(d.seen.inserted) !== null) p.push('clipe livre com o sentinela é reconhecido como efeito (a linha não tem o modelo do efeito)')
  }
  // a chave de um efeito de PROMPT no pedido não abre o ramo do template (nem o pedido do próprio efeito passa com ela)
  for (const key of OLD_KEYS) {
    const r = routeBody(M, { ...hostile, effect: key })
    if (!r.ok) continue
    const d = fakeSubmitDeps()
    const o = await flow.submitClip(d.deps, { userId: U, idempotencyKey: KEY, body: { ...r.body, effect: key } })
    if (o.ok || d.calls.length !== 0) p.push()
  }
  // a chave de um efeito de PROMPT no pedido não abre o ramo do template (nem com o pedido do próprio efeito)
  for (const key of OLD_KEYS) {
    const r = routeBody(M, { ...hostile, effect: key })
    if (!r.ok) continue
    const d = fakeSubmitDeps()
    const o = await flow.submitClip(d.deps, { userId: U, idempotencyKey: KEY, body: { ...r.body, effect: key } })
    if (o.ok || d.calls.length !== 0) p.push(`${key}: chave de efeito de prompt aceita no ramo do template`)
  }
  // efeito de prompt NÃO leva a chave ao submitClip (o pedido dele fica como era)
  for (const key of OLD_KEYS) {
    const r = routeBody(M, { ...hostile, effect: key })
    if (!r.ok || 'effect' in r.body) p.push(`${key}: efeito de prompt passou a levar a chave do template ao submitClip`)
  }
  // entrega: o poll lê o modelo REAL e o evento de pronto sai com o efeito
  {
    const polled = []
    const events = []
    const row = {
      id: 'c1', user_id: U, idempotency_key: KEY, fingerprint: 'f', billing_reference: 'clips-c1', engine: 'kling', mode: 'image', model: KLING16,
      seconds: 5, aspect: 'image', prompt: '[effect:wings]', image_url: PHOTO, credits: 5, fal_usd: 0.28, status: 'processing', fal_request_id: 'req_1',
      video_url: null, failure_reason: null, credits_refunded: 0, created_at: new Date(NOW - 60_000).toISOString(),
    }
    const out = await flow.settleClip({
      poll: async (model) => { polled.push(model); return { state: 'done', url: 'https://v3.fal.media/files/x.mp4' } },
      persist: async () => `${SUPA}/storage/v1/object/public/renders/clips/${U}/c1.mp4`,
      refund: async () => 0, markDone: async () => true, markFailed: async () => true,
      event: async (name, metadata) => { events.push({ name, metadata }) }, now: () => NOW,
    }, row)
    if (out.status !== 'done' || polled[0] !== KLING16) p.push('entrega do efeito-modelo não consulta o modelo real')
    const ready = events.find((x) => x.name === 'clip_effect_ready')
    if (!ready || ready.metadata.effect !== 'wings') p.push('clip_effect_ready não sai para o efeito-modelo')
  }
  return p
}

// ─── (5) os 9 efeitos de antes: idênticos ao commit-base ──────────────────────
async function oldEffectsSnapshot(M) {
  const out = {}
  for (const key of OLD_KEYS) {
    const e = M.fx.clipEffectByKey(key)
    if (!e) { out[key] = null; continue }
    const card = M.fx.publicClipEffects(() => true).find((c) => c.key === key)
    const r = routeBody(M, { effect: key, prompt: 'IGNORE', engine: 'hollywood', seconds: 15, aspect: '16:9', image_url: PHOTO })
    const { deps, seen } = fakeSubmitDeps()
    const sub = r.ok ? await M.flow.submitClip(deps, { userId: U, idempotencyKey: KEY, body: r.body }) : null
    out[key] = {
      effect: e, credits: M.fx.clipEffectCredits(e), card, body: r.ok ? r.body : r,
      fal: [seen.falModel, seen.falInput], debited: seen.debited, row: seen.inserted, ok: sub?.ok,
      forRow: seen.inserted ? M.fx.clipEffectForRow(seen.inserted)?.key ?? null : null,
    }
  }
  return JSON.stringify(out)
}

// ─── (2) mídia das prévias ───────────────────────────────────────────────────
function mp4Facts(buf) {
  const top = []
  let off = 0
  while (off + 8 <= buf.length) {
    let size = buf.readUInt32BE(off)
    const type = buf.toString('latin1', off + 4, off + 8)
    if (size === 1) size = Number(buf.readBigUInt64BE(off + 8))
    else if (size === 0) size = buf.length - off
    if (size < 8) break
    top.push({ type, off, size })
    off += size
  }
  const moov = top.find((b) => b.type === 'moov')
  const mdat = top.find((b) => b.type === 'mdat')
  const facts = { faststart: !!moov && !!mdat && moov.off < mdat.off, handlers: [], width: 0, height: 0 }
  if (moov) {
    const m = buf.subarray(moov.off, moov.off + moov.size)
    for (let i = m.indexOf('hdlr'); i >= 0; i = m.indexOf('hdlr', i + 4)) facts.handlers.push(m.toString('latin1', i + 12, i + 16))
    const a = m.indexOf('avc1')
    if (a >= 0) { facts.width = m.readUInt16BE(a + 28); facts.height = m.readUInt16BE(a + 30) }
  }
  return facts
}
function mediaProblems(M) {
  const p = []
  for (const key of Object.keys(EXPECTED)) {
    const e = M.fx.clipEffectByKey(key)
    if (!e?.preview) { p.push(`${key}: sem prévia`); continue }
    const v = path.join(ROOT, 'public', e.preview.video)
    const w = path.join(ROOT, 'public', e.preview.poster ?? '')
    if (!fs.existsSync(v) || !fs.existsSync(w)) { p.push(`${key}: arquivo da prévia/pôster não existe`); continue }
    const buf = fs.readFileSync(v)
    const f = mp4Facts(buf)
    if (buf.length > 2.5 * 1024 * 1024) p.push(`${key}: prévia pesada (${buf.length} bytes > 2,5 MB)`)
    if (!f.faststart) p.push(`${key}: prévia sem faststart (moov depois do mdat)`)
    if (f.handlers.includes('soun')) p.push(`${key}: prévia com faixa de áudio (tem de ser muda)`)
    if (!f.handlers.includes('vide') || f.width !== 720 || f.height !== 1280) p.push(`${key}: prévia fora do formato das outras (720×1280 h264): ${f.width}×${f.height}`)
    const poster = fs.readFileSync(w)
    if (poster.toString('latin1', 0, 4) !== 'RIFF' || poster.toString('latin1', 8, 12) !== 'WEBP' || poster.length > 200 * 1024) p.push(`${key}: pôster não é webp leve`)
  }
  // âncora: a prévia de uma casa (melt) passa pelo mesmo leitor — prova que o leitor não está cego
  const melt = mp4Facts(fs.readFileSync(path.join(ROOT, 'public/previews/efeito-melt.mp4')))
  if (!melt.faststart || melt.width !== 720 || melt.height !== 1280 || melt.handlers.includes('soun')) p.push('leitor de MP4 não reconhece a prévia de referência (melt)')
  return p
}

// ─── Fiação real (leitura de arquivo) ────────────────────────────────────────
function routeProblems(route) {
  const p = []
  const post = route.slice(route.indexOf('export async function POST'))
  const free = post.slice(post.indexOf('let clipBody: ClipRequestInput = {'), post.indexOf('}', post.indexOf('let clipBody: ClipRequestInput = {')) + 1)
  if (!free.includes('imageUrl: body.image_url ?? body.imageUrl,')) p.push('rota: bloco do clipe livre não encontrado')
  if (/effect|model|input/.test(free.replace('imageUrl', ''))) p.push('rota: o clipe livre copia effect/model/input do corpo do navegador')
  if (!/clipBody = resolved\.body/.test(post)) p.push('rota: o efeito não usa o pedido resolvido pelo catálogo')
  return p
}

const REAL = loadClips()
const realP = await problems(REAL)
for (const x of realP) console.log('  FAIL ' + x)
ok(realP.length === 0, `(1)(3)(4) catálogo, preço e ramo do template executados na fonte real: ${realP.length} problema(s)`)
const mediaP = mediaProblems(REAL)
for (const x of mediaP) console.log('  FAIL ' + x)
ok(mediaP.length === 0, '(2) prévias: existem, leves, mudas, faststart, 720×1280; pôster webp')

let BASE = null
try { BASE = loadClips(gitShow) } catch (err) { console.log('    (base do git ilegível: ' + (err instanceof Error ? err.message : String(err)) + ')') }
const baseSnap = BASE ? await oldEffectsSnapshot(BASE) : null
ok(!!baseSnap && baseSnap === await oldEffectsSnapshot(REAL), `(5) os 9 efeitos de antes idênticos ao commit-base ${BASE_SHA} (catálogo, preço, pedido, payload da fal, linha)`)

const routeP = routeProblems(read('app/api/clips/route.ts'))
ok(routeP.length === 0, '(4b) rota: o clipe livre não copia effect/model/input do navegador' + (routeP.length ? ' → ' + routeP.join(' | ') : ''))

const server = read('lib/clips/clipServer.ts')
ok(server.includes('label: effect?.template?.label ?? CLIP_ENGINES[row.engine]?.label ?? row.engine,') && server.includes('const url = data?.video?.url ?? data?.output?.video?.url ?? null'), '(4c) "Meus clipes" com o selo real; o poll lê data.video.url (saída dos dois endpoints)')
const client = read('app/(dashboard)/clips/ClipsClient.tsx')
ok(client.includes('<span className="tag">{fx.engine_label}</span>') && client.includes("t('madeWith', { engine: effect.engine_label })"), '(6a) /clips mostra o engine_label do servidor (selo do modelo real)')
const page = read('app/effects/EffectPageClient.tsx')
ok(page.includes('{clipEffectEngineLabel(effect)}') && page.includes('{clipEffectEngineLabel(item)}') && !page.includes('CLIP_ENGINES['), '(6b) páginas de efeito com o selo real (nada de CLIP_ENGINES[engine] direto)')
const home = read('components/home/ClipsFirstHome.tsx')
ok(home.includes('engineLabel: clipEffectEngineLabel(effect),') && home.includes('credits: effect.template ? clipEffectCredits(effect) : clipCreditCost(effect.engine, effect.seconds),'), '(6c) variante clips-first com o preço e o selo da função do /clips')
const mig = read('supabase/migrations/20260929190000_clips.sql')
ok(/engine\s+text not null check \(engine in \('hollywood','kling','seedance','veo','h3','omni','s25'\)\)/.test(mig), "(4d) a linha do efeito-modelo cabe na tabela: trilho 'kling' está no check de clips.engine (sem migration)")

// textos nas 16 línguas (título e linha de cada efeito novo; o /clips e as páginas de efeito traduzem por este dicionário)
const dict = JSON.parse(read('lib/ui/refinementCopy.json'))
const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']
const copyBad = []
for (const key of Object.keys(EXPECTED)) {
  const e = REAL.fx.clipEffectByKey(key)
  for (const text of [e.title, e.sub]) for (const lang of LANGS) {
    const v = dict[lang]?.[text]
    if (typeof v !== 'string' || !v.trim()) copyBad.push(`${lang}:${text}`)
    else if (lang === 'en' ? v !== text : v === text) copyBad.push(`${lang}:${text} (não traduzido)`)
  }
}
ok(copyBad.length === 0, '(6d) título e linha dos 3 efeitos nas 16 línguas' + (copyBad.length ? ': ' + copyBad.join(', ') : ''))
const marked = ['lib/clips/clipEffects.ts', 'lib/clips/clipFlow.ts', 'lib/clips/clipPricing.ts', 'lib/clips/clipCatalog.ts', 'lib/clips/clipServer.ts', 'app/effects/EffectPageClient.tsx', 'components/home/ClipsFirstHome.tsx', 'app/api/admin/effect-probe/route.ts']
ok(marked.every((f) => read(f).includes('KINEO-EFEITOS-NOVOS-2026-10-13')), '(6e) marca KINEO-EFEITOS-NOVOS-2026-10-13 nos blocos alterados')

// ─── (7) mutantes ────────────────────────────────────────────────────────────
const FX = 'lib/clips/clipEffects.ts'
const FLOW = 'lib/clips/clipFlow.ts'
const PRICE = 'lib/clips/clipPricing.ts'
const mutants = [
  ['M1 wings com enum inventado', FX, "effect_scene: 'pure_white_wings'", "effect_scene: 'angel_wings'", 'rules'],
  ['M2 dollar_rain sem o _pro (fora do enum standard)', FX, "effect_scene: 'dollar_rain_pro'", "effect_scene: 'dollar_rain'", 'rules'],
  ['M3 Muscle Surge na PixVerse v5', FX, 'model: CLIP_TEMPLATE_PIXVERSE55,\n      input:', "model: 'fal-ai/pixverse/v5/effects',\n      input:", 'rules'],
  ['M4 selo desonesto (Kling 2.5 no lugar de Kling 1.6)', FX, "      usd: 0.28,\n      label: 'Kling 1.6',\n    },\n  },\n  {\n    key: 'dollar_rain'", "      usd: 0.28,\n      label: 'Kling 2.5',\n    },\n  },\n  {\n    key: 'dollar_rain'", 'rules'],
  ['M5 preço sem o piso de 50%', PRICE, '(STUDIO_USD_PER_CREDIT * (1 - CLIP_MARGIN_FLOOR))', '(STUDIO_USD_PER_CREDIT * (1 - 0))', 'rules'],
  ['M6 preço sem o mínimo de 5 cr', PRICE, '  return Math.max(CLIP_MIN_CREDITS, Math.ceil(raw))\n}\n\n/** Margem real', '  return Math.ceil(raw)\n}\n\n/** Margem real', 'rules'],
  ['M7 ramo do template aceita efeito de prompt', FX, '  if (!effect || !effect.template || !CLIP_TEMPLATE_MODELS.includes(effect.template.model)) return { ok: false }', '  if (!effect) return { ok: false }', 'rules'],
  ['M8 ramo do template não confere o pedido', FX, "  if (req.mode !== 'i2v' || !req.imageUrl || req.engine !== effect.engine || req.seconds !== effect.seconds || req.prompt !== effect.prompt) return { ok: false }\n", '', 'rules'],
  ['M9 envio usa o modelo do trilho (Kling 2.5) no efeito-modelo', FLOW, '    ? await deps.submit(template.model, template.input(req.imageUrl))', '    ? await deps.submit(req.model, template.input(req.imageUrl))', 'rules'],
  ['M10 linha grava o modelo do trilho (poll consultaria o modelo errado)', FLOW, 'model: template ? template.model : req.model,', 'model: req.model,', 'rules'],
  ['M11 clipEffectForRow ignora o modelo (clipe livre vira efeito)', FX, ' && (!e.template || e.template.model === row.model)', '', 'rules'],
  ['M12 débito com o preço do trilho, não o do efeito', FLOW, 'const credits = tpl.effect && template ? clipEffectCredits(tpl.effect) : clipCreditCost', 'const credits = tpl.effect && template ? clipCreditCost(req.engine, req.seconds, true) + 1 : clipCreditCost', 'rules'],
  ['M13 efeito antigo alterado (bring_to_life)', FX, 'a gentle head turn toward the camera', 'a gentle head turn to the left', 'base'],
  ['M14 todo efeito passa a levar a chave ao submitClip', FX, 'body: effect.template ? { ...body, effect: effect.key } : body }', 'body: { ...body, effect: effect.key } }', 'rules'],
  ['M15 nota da prévia sem "Made with this effect"', FX, "note: 'Made with this effect from an AI-generated photo (PixVerse 5.5)'", "note: 'Example of this effect (PixVerse 5.5)'", 'rules'],
  ['M16 entrada aceita valor de fora (cena vinda do pedido)', FX, "input: (photoUrl) => ({ effect: 'Muscle Surge', image_url: photoUrl,", "input: (photoUrl, scene = 'Muscle Surge') => ({ effect: scene, image_url: photoUrl,", 'rules'],
  ['M17 prévia aponta outro arquivo (fora da convenção / inexistente)', FX, "video: '/previews/efeito-wings.mp4'", "video: '/previews/efeito-wings-cru.mp4'", 'rules'],
]
for (const [label, file, from, to, kind] of mutants) {
  const src = read(file)
  const mutated = src.split(from).join(to)
  const applied = src.includes(from) && mutated !== src
  if (!applied) { ok(false, `(${label}) âncora não encontrada — o mutante NÃO aplicou; reancore`); continue }
  let bitten = false
  try {
    const M = loadClips((rel) => (rel === file ? mutated : read(rel)))
    if (kind === 'base') bitten = !baseSnap || (await oldEffectsSnapshot(M)) !== baseSnap
    else bitten = (await problems(M)).length > 0 || mediaProblems(M).length > 0
  } catch (err) {
    console.log(`    (mutante lançou: ${err instanceof Error ? err.message : String(err)})`)
    bitten = true
  }
  ok(bitten, `(${label}) aplicou e → vermelho`)
}
// mutante da rota (texto): o clipe livre passa a copiar `effect` do navegador
{
  const route = read('app/api/clips/route.ts')
  const from = '    imageUrl: body.image_url ?? body.imageUrl,\n  }'
  const mutated = route.split(from).join('    imageUrl: body.image_url ?? body.imageUrl,\n    effect: body.effect,\n  }')
  ok(route.includes(from) && mutated !== route && routeProblems(mutated).length > 0, '(M18 rota copia effect do navegador no clipe livre) aplicou e → vermelho')
}

console.log(`\n${pass} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)

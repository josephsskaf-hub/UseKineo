// KINEO-ADS-MODO-SIMPLES-2026-09-29 — guardião do MODO SIMPLES do /ads/v2. Roda com
// `node scripts/test-ads-modo-simples-2026-09-29.mjs`, sem rede, sem banco e sem alias '@/'.
//
// Pedido do fundador (29/09, depois de tentar anunciar o próprio imóvel): "a pessoa coloca os arquivos, fala mais ou
// menos o que quer, escolhe premium, comercial ou normal, e a gente faz" — "sem legenda, com a fala em português".
//
// Duas camadas, como o guardião do servidor:
//   1. EXECUTADA — as libs puras (v2Contract, v2Research, v2Simple, v2Screen, adV2Montage, v2Brief com a OpenAI
//      desligada) e as ROTAS /plan e /research são transpiladas com o typescript do repo e rodadas contra um banco
//      falso e fornecedores falsos: fato só com fonte, só os marcados entram no brief, preço/contato só se a pessoa
//      escreveu, frases desligadas saem sem nenhuma, pesquisa travada antes da OpenAI, nada cobrado.
//   2. LEITURA (readFileSync) — a tela: entrada padrão = simples, modo completo intocado (impressão digital sha256 do
//      trecho AdsV2Session…fim calculada na base c55bab53), espelhos, textos em pt, nenhum preço digitado.
// Todo item importante tem MUTANTE: a mesma verificação roda contra o código alterado e TEM de ficar vermelha.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(import.meta.url)
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const semComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1')).join('\n')
const sha = (s) => createHash('sha256').update(s).digest('hex')
let ok = 0
const falhas = []
const check = async (nome, condicao) => {
  let v = false
  try { v = typeof condicao === 'function' ? !!(await condicao()) : !!condicao } catch (e) { falhas.push(`${nome} (lançou: ${e.message})`); return }
  if (v) ok++; else falhas.push(nome)
}
/** Índices crescentes: cada trecho aparece DEPOIS do anterior no texto. */
const ordem = (src, ...marcas) => {
  let pos = -1
  for (const m of marcas) {
    const i = src.indexOf(m, pos + 1)
    if (i < 0 || i <= pos) return false
    pos = i
  }
  return true
}
/** Corpo de função: do primeiro '{' de fim de linha depois do marcador até a chave que fecha. */
const bloco = (src, marcador) => {
  const i = src.indexOf(marcador)
  if (i < 0) return ''
  const a = src.indexOf('{\n', i)
  if (a < 0) return ''
  let n = 0
  for (let j = a; j < src.length; j++) {
    if (src[j] === '{') n++
    else if (src[j] === '}') { n--; if (n === 0) return src.slice(a, j + 1) }
  }
  return ''
}
/** Troca exata (tem de existir UMA vez — senão o mutante não prova nada). */
const trocar = (src, de, para) => {
  if (src.split(de).length !== 2) throw new Error(`mutante sem âncora única: ${de.slice(0, 60)}`)
  return src.split(de).join(para)
}

// ── carregador: transpila TS → CJS e resolve '@/' e './' com stubs; `over` troca a fonte (mutantes) ─────────────────
function makeLoader(stubs, opts = {}) {
  const cache = new Map()
  const real = new Set(opts.real ?? [])
  const over = opts.over ?? {}
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel)
    const src = Object.prototype.hasOwnProperty.call(over, rel) ? over[rel] : rd(rel)
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    const module = { exports: {} }
    cache.set(rel, module.exports)
    const req = (spec) => {
      if (Object.prototype.hasOwnProperty.call(stubs, spec)) return stubs[spec]
      if (spec.startsWith('node:') || spec === 'crypto') return nodeRequire(spec)
      let target = null
      if (spec.startsWith('@/')) target = `${spec.slice(2)}.ts`
      else if (spec.startsWith('./') || spec.startsWith('../')) target = `${posix.normalize(posix.join(posix.dirname(rel), spec))}.ts`
      if (target && (real.has(target) || real.has('*'))) return load(target)
      throw new Error(`sem stub: ${spec} (em ${rel})`)
    }
    new Function('exports', 'require', 'module', js)(module.exports, req, module)
    cache.set(rel, module.exports)
    return module.exports
  }
  return load
}
/** Módulo PURO (sem import), opcionalmente com a fonte trocada. */
const pura = (rel, src) => makeLoader({}, { over: src === undefined ? {} : { [rel]: src } })(rel)

const F = {
  client: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  page: 'app/(dashboard)/ads/v2/page.tsx',
  contract: 'lib/ads/v2Contract.ts',
  research: 'lib/ads/v2Research.ts',
  simpleLib: 'lib/ads/v2Simple.ts',
  frames: 'lib/ads/v2VideoFrames.ts',
  brief: 'lib/ads/v2Brief.ts',
  screen: 'lib/ads/v2Screen.ts',
  montage: 'lib/ads/adV2Montage.ts',
  planRoute: 'app/api/ads/v2/plan/route.ts',
  researchRoute: 'app/api/ads/v2/research/route.ts',
  ordersRoute: 'app/api/ads/v2/orders/route.ts',
  startRoute: 'app/api/ads/v2/start/route.ts',
  events: 'lib/ads/events.ts',
  sink: 'app/api/events/route.ts',
}
for (const p of Object.values(F)) await check(`arquivo existe: ${p}`, existsSync(join(RAIZ, p)))

const SRC = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, rd(p)]))
const C = pura(F.contract)
const R = pura(F.research)
const S = pura(F.simpleLib)
const SC = pura(F.screen)
const T = pura('lib/ads/v2Tiers.ts')
const SL = pura('lib/ads/v2ShotLists.ts')
const U = (n) => `${String(n).padStart(8, '0')}-2222-4333-8444-555555555555`

// ═══ A. ENTRADA PADRÃO = SIMPLES; o completo só com ?mode=full ════════════════════════════════════════════════════════
const wrapperOf = (src) => bloco(semComentarios(src), 'export default function AdsV2Client')
const entradaSimples = (src) => {
  const w = wrapperOf(src)
  const eff = bloco(w, 'useEffect(() => {\n    let m:')
  return /let m: 'simple' \| 'full' = 'simple'/.test(eff) && /if \(new URLSearchParams\(window\.location\.search\)\.get\('mode'\) === 'full'\) m = 'full'/.test(eff) &&
    /\{mode === 'full' \? \(\n\s*<AdsV2Session\n\s*key=\{session\}\n\s*resume=\{session === 0\}/.test(w) &&
    /\) : mode === 'simple' \? \(\n\s*<AdsV2SimpleSession\n\s*key=\{session\}\n\s*resume=\{session === 0\}\n\s*lang=\{lang\}/.test(w) &&
    /function startOver\(\) \{[\s\S]*?setMode\('simple'\)/.test(w) &&
    // Revisão da tela 29/09 (mutante B sobrevivia): "Start over" tem de LIMPAR o ?mode=full do endereço, senão recarregar
    // a página volta ao completo com a tela mostrando o simples.
    /clearOrderParam\(\)\n\s*setModeParam\(null\)/.test(bloco(w, 'function startOver()')) &&
    /if \(mode\) u\.searchParams\.set\('mode', mode\)\n\s*else u\.searchParams\.delete\('mode'\)/.test(bloco(semComentarios(src), 'function setModeParam('))
}
await check('A1 entrada padrão é o modo SIMPLES; o completo só com ?mode=full; "Start over" volta ao simples', entradaSimples(SRC.client))
await check('A1-mutante: padrão virando "full" fica vermelho', () => !entradaSimples(trocar(SRC.client, "let m: 'simple' | 'full' = 'simple'", "let m: 'simple' | 'full' = 'full'")))
await check('A1-mutante (revisão da tela, B): "Start over" sem setModeParam(null) fica vermelho', () => !entradaSimples(trocar(SRC.client.replace(/\r\n/g, '\n'), '    clearOrderParam()\n    setModeParam(null)\n', '    clearOrderParam()\n')))
await check('A2 o link do assistente clássico aparece só no modo completo; o page.tsx continua sem modo', /classicCredits !== null && mode === 'full' \?/.test(wrapperOf(SRC.client)) && !/mode/.test(semComentarios(SRC.page)))
await check('A3 trocar de modo é link de página inteira (o anúncio em andamento é retomado na troca)', /<a href=\{mode === 'simple' \? '\/ads\/v2\?mode=full' : '\/ads\/v2'\}>/.test(wrapperOf(SRC.client)))

// ═══ Z. O MODO COMPLETO CONTINUA IDÊNTICO ═════════════════════════════════════════════════════════════════════════════
// sha256 do trecho `function AdsV2Session(` … fim do arquivo (sessão, PhotoRow, PlanPreview, ShotGrid), sem comentários,
// com \r\n normalizado. REANCORADO 29/09 (consertador): a base era c55bab53 (8439420b…); a main andou para 06bc9d6f e o
// commit 65a49c30 ("Refine creation previews") mexeu no AdsV2Session (previewPhotoKey + coluna lateral). Na junção o
// trecho do HEAD é BYTE A BYTE o de origin/main 06bc9d6f (conferido: os dois dão 2e1d8881…) — o modo simples continua
// sem tocar no completo; só a referência mudou.
// REANCORADO 29/09 (KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29): pedido do fundador — "quero colocar as minhas fotos e VÍDEOS".
// O modo completo passou a aceitar vídeo (até 2 entram como vídeo; o resto vira fotos, com o motivo em inglês): PhotoItem
// ganhou `video`, addPhotos/ensurePhotosUploaded/PhotoRow mudaram e o /plan leva `videos`. Nada mais do completo mudou
// (preço, voz, cartão, refação: os guardiões da tela seguem verdes). Base anterior: 2e1d8881… (origin/main 06bc9d6f).
// REANCORADO 29/09 (revisão adversarial do vídeo do cliente, 26151671 → a2fbf94d…): o completo ganhou só os consertos da
// revisão — uma seleção por vez (addPhotos → addPhotosNow, contagem por photosRef), vídeo > 10 min com aviso, excesso de
// vídeos vira fotos antes de subir (videosPastLimitToPhotos) e 'video_too_long'/'too_many_videos' trocam por fotos.
// Provado em scripts/test-ads-video-do-cliente-2026-09-29.mjs (V5-V7, com mutantes). Preço/voz/cartão/refação intocados.
// Reanchored 29/09: approved comparison hook + successful-plan memory + JSX only.
// Payloads, paid actions and the complete review remain unchanged; test-delivery-refinement covers the comparison.
// REANCORADO 30/09 (KINEO-ADS-3-VARIACOES-2026-09-30, pedido do fundador "3 variações sim"): o completo ganhou SÓ a opção
// "3 variações" — props variations/onVariationsStarted, o estado three, makeVariations (outra rota, preço do grupo
// mostrado antes do clique) e o VariationToggle no PlanPreview. Sem a opção ligada o botão, o preço e o /start são os de
// antes; provado em scripts/test-ads-3-variacoes-2026-09-30.mjs (S4, com mutantes). Base anterior: fbed22df….
const Z1_BASE = "14c118ff2d68c04430579452e48d0f1ddfe3549c2e27c66ec345d042f92e752b"
const trechoCompleto = (src) => { const s = src.replace(/\r\n/g, '\n'); const i = s.indexOf('function AdsV2Session('); return i < 0 ? '' : semComentarios(s.slice(i)) }
await check('Z1 impressão digital do modo completo (AdsV2Session, PhotoRow, PlanPreview, ShotGrid) = a do vídeo do cliente (29/09)', sha(trechoCompleto(SRC.client)) === Z1_BASE)
await check('Z1-mutante: 1 caractere trocado no modo completo fica vermelho', () => sha(trechoCompleto(trocar(SRC.client, "const POLL_RETRY_MS = 20_000", "const POLL_RETRY_MS = 20_001").replace('Plan my ad (free)', 'Plan my ad (freE)'))) !== Z1_BASE)

const keys = (o) => Object.keys(o).sort().join(',')
const completoContrato = (M) => {
  const cr = M.sanitizeCreateOrderBody({ tier: 'commercial', sentence: '  Grill   house ', price: 'x', overlays: false, contact: 'y', research_from: U(3) })
  const pl = M.sanitizePlanBody({ order_id: U(1), sector: 'restaurant', logo_footage_id: U(2), photos: [0, 1, 2].map((i) => ({ footage_id: U(10 + i), kind: 'place' })), facts: ['f1'] })
  const semLogo = M.sanitizePlanBody({ order_id: U(1), sector: 'restaurant', photos: [0, 1, 2].map((i) => ({ footage_id: U(10 + i), kind: 'place' })) })
  const logoNulo = M.sanitizePlanBody({ order_id: U(1), sector: 'restaurant', logo_footage_id: null, photos: [0, 1, 2].map((i) => ({ footage_id: U(10 + i), kind: 'place' })) })
  const full = M.sanitizeCreateOrderBody({ mode: 'full', tier: 'commercial', sentence: 'x', price: 'y' })
  return cr.ok && keys(cr.value) === 'language,link,narration,seconds,sector,sentence,tier' && cr.value.sentence === 'Grill house' &&
    pl.ok && keys(pl.value) === 'logo_footage_id,order_id,photos,sector' &&
    semLogo.error === 'bad_logo_footage_id' && logoNulo.error === 'bad_logo_footage_id' &&
    full.ok && keys(full.value) === 'language,link,narration,seconds,sector,sentence,tier' &&
    M.sanitizeCreateOrderBody({ mode: 'turbo', tier: 'cinema', sentence: 'x' }).error === 'bad_mode'
}
await check('Z2 sem mode (ou mode:"full") os sanitizadores devolvem EXATAMENTE as chaves de antes e o logo continua obrigatório', completoContrato(C))
await check('Z2-mutante: logo opcional também sem mode fica vermelho', () => !completoContrato(pura(F.contract, trocar(SRC.contract, 'if (!(simple && logoAbsent) && !isUuid(b.logo_footage_id))', 'if (!logoAbsent && !isUuid(b.logo_footage_id))'))))
await check('Z2-mutante: campos do simples vazando para o modo completo fica vermelho', () => !completoContrato(pura(F.contract, trocar(SRC.contract, "if (mode !== 'simple') return { ok: true, value }", 'if (false) return { ok: true, value }'))))

// v2Brief com a OpenAI desligada (só as funções puras rodam).
const briefLoader = (src) => makeLoader({ '@/lib/openai': { openai: {} } }, { real: ['*'], over: src === undefined ? {} : { [F.brief]: src } })(F.brief)
const BR = briefLoader()
const BRIEF = { business: 'Casa Aurora — pão de fermentação natural', offer: '', cta: 'visit', contact: '', language: 'pt', tone: 'warm', audience: '', extra: {} }
const copyHash = (M) => sha(JSON.stringify([M.buildV2CopyMessages(BRIEF, 'Brazilian Portuguese (pt-BR)', { maxWords: 30, narration: true }), M.buildV2CopyMessages(BRIEF, 'English', { maxWords: 30, narration: false })]))
const Z3_BASE = '98de8fc7f83d0ea1ba5d0537cc0da875f1e488124ca15019b611854b6b3e678c'
await check('Z3 o pedido de texto do modo completo (buildV2CopyMessages SEM overlays) é byte a byte o da base c55bab53', copyHash(BR) === Z3_BASE)
await check('Z3-mutante: 1 palavra trocada no pedido fica vermelho', () => copyHash(briefLoader(trocar(SRC.brief, 'Warm and natural.', 'Warm and friendly.'))) !== Z3_BASE)
const completoCopy = (M) => {
  const o = { maxWords: 30, narration: false }
  const um = M.checkV2Copy(JSON.stringify({ narration: '', overlays: ['Casa Aurora'], sector: 'restaurant' }), BRIEF, o)
  const semMarca = M.checkV2Copy(JSON.stringify({ narration: '', overlays: ['Pão quentinho', 'Todo dia'], sector: 'restaurant' }), BRIEF, o)
  const bom = M.checkV2Copy(JSON.stringify({ narration: '', overlays: ['Casa Aurora', 'Pão todo dia'], sector: 'restaurant' }), BRIEF, o)
  return !um.ok && !semMarca.ok && semMarca.why.some((w) => /business name/.test(w)) && bom.ok && bom.copy.overlays.length === 2
}
await check('Z4 checkV2Copy do modo completo continua exigindo 2 ou 3 frases E a marca na 1ª', completoCopy(BR))
await check('Z4-mutante: o atalho "sem frases" valendo sem overlays:false fica vermelho', () => !completoCopy(briefLoader(trocar(SRC.brief, 'if (opts.overlays === false) {\n    if (why.length)', 'if (opts.overlays !== true) {\n    if (why.length)'))))

// ═══ L. LOGO OPCIONAL NO SIMPLES (contrato, plano, avanço e cartão) ══════════════════════════════════════════════════
await check('L1 contrato simples: logo ausente/nulo aceito; logo inválido recusado; logo igual a foto recusado', () => {
  const ph = [0, 1, 2].map((i) => ({ footage_id: U(10 + i), kind: 'place' }))
  const a = C.sanitizePlanBody({ mode: 'simple', order_id: U(1), sector: 'real_estate', photos: ph })
  const b = C.sanitizePlanBody({ mode: 'simple', order_id: U(1), sector: 'real_estate', logo_footage_id: null, photos: ph })
  return a.ok && a.value.logo_footage_id === null && b.ok && C.sanitizePlanBody({ mode: 'simple', order_id: U(1), sector: 'real_estate', logo_footage_id: 'abc', photos: ph }).error === 'bad_logo_footage_id' &&
    C.sanitizePlanBody({ mode: 'simple', order_id: U(1), sector: 'real_estate', logo_footage_id: U(10), photos: ph }).error === 'logo_is_photo'
})
const planCod = semComentarios(SRC.planRoute)
await check('L2 /plan: logo só entra na conferência de posse se veio; grava logo nulo; o cartão continua obrigatório no /start', /\.\.\.\(input\.logo_footage_id \? \[input\.logo_footage_id\] : \[\]\)/.test(planCod) && /if \(input\.logo_footage_id && !own\.get\(input\.logo_footage_id\)\?\.isImage\) return v2Fail\('logo_invalid', 400\)/.test(planCod) && /logo_footage_id: input\.logo_footage_id \?\? null/.test(planCod) && /if \(!order\.card_url\) return v2Fail\('card_required', 400\)/.test(SRC.startRoute) && !/logo/.test(semComentarios(SRC.startRoute)))
const simpleCod = semComentarios(SRC.simple)
await check('L3 tela simples: nenhuma pendência pede logo (só espera o envio); o plano manda logo ?? null; o cartão aceita logo nulo', !/needLogo|Add your logo|addLogo\)/.test(bloco(simpleCod, 'const missing: string[] = []') + simpleCod.slice(simpleCod.indexOf('const missing'), simpleCod.indexOf('// ── URL, poll'))) && /if \(logo\?\.busy\) missing\.push\(copy\.plan\.waitLogo\)/.test(simpleCod) && /logo_footage_id: logo\?\.footageId \?\? null/.test(simpleCod) && /let img: HTMLImageElement \| null = null/.test(bloco(simpleCod, 'async function ensureCard(')) && /drawEndCard\(canvas, \{ logo: img,/.test(bloco(simpleCod, 'async function ensureCard(')))

// ═══ ROTAS EXECUTADAS: banco falso + fornecedores falsos ═════════════════════════════════════════════════════════════
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'teste-sem-rede'
// Banco falso: tabelas em memória; eq/in/is (com caminho json "a->b")/gte; UPDATE condicional de verdade; count com head.
function db(tables) {
  const base = { tables }
  base.from = (name) => {
    tables[name] ??= []
    const get = (r, k) => (k.includes('->') ? k.split(/->>?/).reduce((o, p) => (o && typeof o === 'object' ? o[p] : undefined), r) : r[k])
    const ctx = { op: 'select', filters: [], patch: null, rows: null, head: false }
    const run = (single) => {
      const t = tables[name]
      const hit = t.filter((r) => ctx.filters.every((f) => f(r)))
      if (ctx.op === 'select') {
        if (ctx.head && base.countError) return { data: null, count: null, error: { code: 'XX000', message: 'contagem falhou' } }
        if (ctx.head) return { data: null, count: hit.length, error: null }
        const rows = hit.map((r) => structuredClone(r))
        return single ? { data: rows[0] ?? null, error: null } : { data: rows, error: null }
      }
      if (ctx.op === 'update') {
        for (const r of hit) Object.assign(r, structuredClone(ctx.patch))
        return single ? { data: hit[0] ? structuredClone(hit[0]) : null, error: null } : { data: hit.map((r) => structuredClone(r)), error: null }
      }
      const out = ctx.rows.map((row, i) => ({ id: row.id ?? `${name}-${t.length + i + 1}`, ...structuredClone(row) }))
      t.push(...out)
      return single ? { data: out[0], error: null } : { data: out, error: null }
    }
    const api = {
      select(_c, o) { if (o && o.head) ctx.head = true; return api },
      eq(k, v) { ctx.filters.push((r) => get(r, k) !== undefined && get(r, k) !== null && String(get(r, k)) === String(v)); return api },
      in(k, v) { ctx.filters.push((r) => v.map(String).includes(String(get(r, k)))); return api },
      is(k, v) { ctx.filters.push((r) => (v === null ? get(r, k) === null || get(r, k) === undefined : get(r, k) === v)); return api },
      gte(k, v) { ctx.filters.push((r) => get(r, k) >= v); return api },
      order() { return api },
      limit() { return api },
      update(p) { ctx.op = 'update'; ctx.patch = p; return api },
      insert(r) { ctx.op = 'insert'; ctx.rows = Array.isArray(r) ? r : [r]; return api },
      maybeSingle() { return Promise.resolve(run(true)) },
      then(a, b) { return Promise.resolve(run(false)).then(a, b) },
    }
    return api
  }
  return base
}

const USER = U(9)
const ORDER = U(1)
function mundo(order, extra = {}) {
  const tables = { ads_v2_orders: [structuredClone(order), ...(extra.orders ?? []).map((o) => structuredClone(o))], events: [...(extra.events ?? [])] }
  const admin = db(tables)
  if (extra.countError) admin.countError = true
  const log = { extract: [], moderation: [], events: [], openai: [], charges: 0 }
  const stubs = {
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: USER, email: 'teste@exemplo.com' } } }) } }) },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { log.events.push(e); tables.events.push({ id: `ev-${tables.events.length + 1}`, user_id: e.userId, name: e.name, created_at: new Date().toISOString() }) } },
    '@/lib/safety/contentModeration': { moderateContent: async (a) => { log.moderation.push({ text: a.text, lockState: tables.ads_v2_orders[0]?.brief?.research?.status ?? null }); return { ok: true } } },
    '@/lib/safety/moderationPolicy': { moderationRefusalMessage: () => 'blocked', moderationRefusalStatus: () => 422 },
    '@/lib/ads/serverAccess': { adsGate: () => 'ok', isMissingAdsTable: () => false, loadAdsAccess: async () => ({ admin, reason: 'internal' }) },
    '@/lib/ads/v2Access': { adsV2Visible: () => true },
    '@/lib/ads/v2Advance': { loadAdsV2Order: async (_a, id, uid) => { const o = tables.ads_v2_orders.find((r) => r.id === id && r.user_id === uid); return { order: o ? structuredClone(o) : null, error: null } }, adsV2View: () => ({}), loadAdsV2Shots: async () => ({ shots: [], error: null }) },
    '@/lib/ads/v2Server': {
      ownedFootage: async (_a, _u, ids) => new Map(ids.map((id) => [id, { url: `https://x.supabase.co/storage/v1/object/public/user-footage/${USER}/${id}.png`, isImage: true, isPng: true }])),
      v2Fail: (error, status, more = {}) => ({ status, body: { error, ...more } }),
      v2Json: (body, status = 200) => ({ status, body }),
    },
    '@/lib/ads/v2Link': { adsV2LinkText: async () => null },
    '@/lib/ads/v2Brief': {
      ADS_V2_PLAN_DAILY_CAP: 20,
      checkV2Prompts: () => [],
      // O "modelo" devolve SEMPRE 2 frases de tela: a rota é que tem de apagá-las quando a pessoa desligou.
      extractAdsV2Brief: async (args) => { log.extract.push(structuredClone(args)); return { ok: true, brief: { business: 'Loja — venda', offer: '', cta: 'call', contact: '', language: 'pt', tone: 'warm', audience: '', extra: {} }, copy: { narration: 'Uma loja no Edifício Aurora.', overlays: ['Loja à venda', 'Bairro Jardim'], sectorHint: 'store' }, dropped: [], attempts: 2 } },
    },
    '@/lib/openai': { openai: { responses: { create: async (params, opts) => { log.openai.push({ params: structuredClone(params), opts: structuredClone(opts), lockState: tables.ads_v2_orders[0]?.brief?.research?.status ?? null }); if (extra.openaiThrow) throw extra.openaiThrow; return extra.openaiResponse } } } },
  }
  return { tables, log, stubs }
}
const loadRoute = (rel, stubs, src) => makeLoader(stubs, { real: ['lib/textLanguage.ts', 'lib/ads/v2Contract.ts', 'lib/ads/v2Tiers.ts', 'lib/ads/v2ShotLists.ts', 'lib/ads/v2Research.ts'], over: src === undefined ? {} : { [rel]: src } })(rel)
const req = (body) => ({ json: async () => body, nextUrl: { searchParams: new URLSearchParams() } })
const PHOTOS = [0, 1, 2].map((i) => ({ footage_id: U(20 + i), kind: 'place' }))
const FATOS = [
  { id: 'f1', text: 'O Edifício Aurora fica na Rua das Flores, no bairro Jardim.', url: 'https://exemplo.org/aurora', host: 'exemplo.org' },
  { id: 'f2', text: 'A estação Jardim do metrô fica a poucos minutos a pé.', url: 'https://mapa.test/jardim', host: 'mapa.test' },
]
const pedidoSimples = (brief = {}) => ({
  id: ORDER, user_id: USER, status: 'draft', tier: 'commercial', seconds: 15, sector: 'real_estate', language: 'pt', narration: true,
  brief: { sentence: 'Loja à venda no Edifício Aurora, bairro Jardim', link: null, mode: 'simple', overlays: true, price: null, contact: null, research: { status: 'ok', at: new Date().toISOString(), facts: FATOS }, ...brief },
  logo_footage_id: null, card_url: null, card_footage_id: null, photos: null, plan: null,
})
const planBody = (extra = {}) => ({ mode: 'simple', order_id: ORDER, sector: 'real_estate', photos: PHOTOS, card_footage_id: U(30), facts: ['f1'], ...extra })
const rodaPlano = async (order, body, src) => {
  const w = mundo(order)
  const res = await loadRoute(F.planRoute, w.stubs, src).POST(req(body))
  return { ...w, res }
}

// ═══ P/R. PESQUISA: SÓ FATOS COM FONTE, SÓ OS MARCADOS ENTRAM NO BRIEF ═══════════════════════════════════════════════
const soMarcados = async (src) => {
  const r = await rodaPlano(pedidoSimples(), planBody({ facts: ['f1'] }), src)
  const args = r.log.extract[0]
  const row = r.tables.ads_v2_orders[0]
  return r.res.status === 200 && args && JSON.stringify(args.facts) === JSON.stringify([FATOS[0].text]) && !JSON.stringify(args).includes(FATOS[1].text) &&
    JSON.stringify(row.brief.research.selected) === '["f1"]' && r.log.moderation[0].text.includes(FATOS[0].text) && !r.log.moderation[0].text.includes(FATOS[1].text)
}
await check('R1 /plan EXECUTADO: só o fato marcado (f1) vai ao texto e à moderação; o desmarcado (f2) não; a escolha fica gravada', soMarcados())
await check('R1-mutante: todos os fatos gravados indo ao texto (ignorando a marcação) fica vermelho', async () => !(await soMarcados(trocar(SRC.planRoute, "const chosenFacts = (input.facts ?? []).map((id) => known.find((f) => f.id === id))", 'const chosenFacts = known'))))
const textoDoCliente = async (src) => {
  const naoId = C.sanitizePlanBody(planBody({ facts: ['O prédio é o melhor do bairro'] })).error === 'bad_facts'
  const r = await rodaPlano(pedidoSimples(), planBody({ facts: ['f5'] }), src)
  return naoId && r.res.status === 400 && r.res.body.error === 'bad_fact' && r.log.extract.length === 0
}
await check('R2 (M6) o plano NUNCA aceita texto de fato vindo do cliente: só ids f1..f6 (bad_facts) e só os que o servidor gravou (bad_fact)', textoDoCliente())
await check('R2-mutante: id desconhecido passando fica vermelho', async () => !(await textoDoCliente(trocar(SRC.planRoute, "if (chosenFacts.some((f) => !f)) return v2Fail('bad_fact', 400)", ''))))
const pesquisaRodando = async (src) => {
  const r = await rodaPlano(pedidoSimples({ research: { status: 'running', at: new Date().toISOString() } }), planBody({ facts: [] }), src)
  const velha = await rodaPlano(pedidoSimples({ research: { status: 'running', at: new Date(Date.now() - 5 * 60_000).toISOString() } }), planBody({ facts: [] }), src)
  return r.res.status === 409 && r.res.body.error === 'research_running' && r.log.extract.length === 0 && velha.res.status === 200
}
await check('R3 (M13) /plan com a pesquisa rodando = 409 research_running, sem modelo; pesquisa parada há > 90 s libera', pesquisaRodando())
await check('R3-mutante: /plan rodando com a pesquisa em running fica vermelho', async () => !(await pesquisaRodando(trocar(SRC.planRoute, "if (researchState(brief0.research, Date.now()) === 'running') return v2Fail('research_running', 409)", ''))))
const modoTrocado = async (src) => {
  const r = await rodaPlano(pedidoSimples({ mode: undefined }), planBody(), src)
  return r.res.status === 400 && r.res.body.error === 'mode_mismatch' && r.log.extract.length === 0
}
await check('R4 (M12) corpo simples num pedido do modo completo = 400 mode_mismatch', modoTrocado())
await check('R4-mutante: sem a trava mode_mismatch fica vermelho', async () => !(await modoTrocado(trocar(SRC.planRoute, "if (simple && brief0.mode !== 'simple') return v2Fail('mode_mismatch', 400)", ''))))

// ═══ F. FRASES DESLIGÁVEIS ═══════════════════════════════════════════════════════════════════════════════════════════
const semFrases = async (src) => {
  const r = await rodaPlano(pedidoSimples({ overlays: false }), planBody(), src)
  const com = await rodaPlano(pedidoSimples(), planBody(), src)
  return r.res.status === 200 && r.log.extract[0].overlays === false && r.tables.ads_v2_orders[0].plan.overlays.length === 0 && r.res.body.overlays.length === 0 &&
    com.tables.ads_v2_orders[0].plan.overlays.length === 2
}
await check('F1 (M7) /plan EXECUTADO: frases desligadas = plano sem NENHUMA frase, mesmo se o modelo mandar; ligadas = 2', semFrases())
await check('F1-mutante: frases desligadas saindo mesmo assim fica vermelho', async () => !(await semFrases(trocar(SRC.planRoute, 'const overlays = !overlaysOn\n      ? []', 'const overlays = false\n      ? []'))))
await check('F2 pedido de texto com overlays:false manda devolver [] e tira a regra da marca; checkV2Copy devolve [] mesmo com frases do modelo', () => {
  const m = BR.buildV2CopyMessages(BRIEF, 'Brazilian Portuguese (pt-BR)', { maxWords: 30, narration: true, overlays: false })
  const c = BR.checkV2Copy(JSON.stringify({ narration: 'Casa Aurora tem pão de fermentação natural todo dia para você e sua família provar.', overlays: ['Casa Aurora', 'Pão'], sector: 'restaurant' }), BRIEF, { maxWords: 30, narration: true, overlays: false })
  return /overlays: return \[\] \(the customer turned the on-screen phrases off\)\./.test(m.system) && !/1st =/.test(m.system) && /"overlays":\[\]/.test(m.system) && c.ok && c.copy.overlays.length === 0
})
await check('F3 a montagem com overlays [] sai sem NENHUM elemento de texto (adV2Montage executado)', () => {
  const M = pura(F.montage)
  const src = M.buildAdV2Source({ width: 1080, height: 1920, shots: [0, 1, 2].map((i) => ({ url: `https://x.test/${i}.jpg`, kind: 'text', cutStart: 0, cutSeconds: 3, measuredSeconds: null })), overlays: [], fontFamily: 'Montserrat', cardUrl: 'https://x.test/card.png', musicUrl: null })
  const els = JSON.stringify(src)
  return !/"type":"text"/.test(els) && /"type":"image"/.test(els)
})

// ═══ P. PREÇO E CONTATO SÓ SE A PESSOA ESCREVEU ═══════════════════════════════════════════════════════════════════════
await check('P1 contrato simples: preço/contato vazios = null; longos demais recusados; overlays só booleano; research_from uuid', () => {
  const base = { mode: 'simple', tier: 'cinema', sentence: 'Loja à venda no Edifício Aurora' }
  const a = C.sanitizeCreateOrderBody({ ...base, price: '  ', contact: '' })
  return a.ok && a.value.price === null && a.value.contact === null && a.value.overlays === true && a.value.mode === 'simple' &&
    C.sanitizeCreateOrderBody({ ...base, price: 'x'.repeat(61) }).error === 'bad_price' && C.sanitizeCreateOrderBody({ ...base, contact: 'x'.repeat(81) }).error === 'bad_contact' &&
    C.sanitizeCreateOrderBody({ ...base, overlays: 'no' }).error === 'bad_overlays' && C.sanitizeCreateOrderBody({ ...base, research_from: 'abc' }).error === 'bad_research_from' &&
    C.sanitizeCreateOrderBody({ ...base, overlays: false }).value.overlays === false
})
const precoSoSeEscreveu = async (src) => {
  const sem = await rodaPlano(pedidoSimples(), planBody({ facts: [] }), src)
  const com = await rodaPlano(pedidoSimples({ price: 'R$ 990 mil', contact: '(11) 90000-0000' }), planBody({ facts: [] }), src)
  return sem.log.extract[0].text === 'Loja à venda no Edifício Aurora, bairro Jardim' && com.log.extract[0].text === 'Loja à venda no Edifício Aurora, bairro Jardim\nPrice: R$ 990 mil\nContact: (11) 90000-0000'
}
await check('P2 /plan EXECUTADO: sem preço/contato o texto é SÓ a frase; com eles, "Price:"/"Contact:" exatamente como a pessoa escreveu', precoSoSeEscreveu())
await check('P2-mutante: preço inventado quando a pessoa não escreveu fica vermelho', async () => !(await precoSoSeEscreveu(trocar(SRC.planRoute, "price ? `Price: ${price}` : ''", "`Price: ${price || 'a combinar'}`"))))

// Pesquisa EXECUTADA (rota /research com OpenAI falsa).
const RESPOSTA = (() => {
  const text = [
    '- O Edifício Aurora fica na Rua das Flores, no bairro Jardim. ([exemplo.org](https://exemplo.org/aurora?utm_source=openai))',
    '- Apartamentos no prédio custam R$ 900 mil. ([x.test](https://x.test/preco))',
    '- Unidades com 3 suítes e 2 vagas. ([x.test](https://x.test/suites))',
    '- É o melhor prédio do bairro. ([x.test](https://x.test/melhor))',
    '- Inaugurado em 1998, segundo o texto do modelo https://inventado.test/fonte',
    '- A estação Jardim do metrô fica a poucos minutos a pé. ([mapa.test](https://mapa.test/jardim))',
  ].join('\n')
  const annotations = []
  let off = 0
  for (const l of text.split('\n')) {
    const m = /\]\((https:[^)]+)\)\)$/.exec(l)
    if (m) annotations.push({ type: 'url_citation', url: m[1], title: 't', start_index: off + l.indexOf('(['), end_index: off + l.length })
    off += l.length + 1
  }
  return { output: [{ type: 'web_search_call', id: 'ws1', status: 'completed' }, { type: 'message', content: [{ type: 'output_text', text, annotations }] }], usage: { input_tokens: 3000, output_tokens: 400 } }
})()
const rodaPesquisa = async (order, extra = {}, src) => {
  const w = mundo(order, { openaiResponse: RESPOSTA, ...extra })
  const res = await loadRoute(F.researchRoute, w.stubs, src).POST(req({ order_id: ORDER }))
  return { ...w, res }
}
const semPesquisa = (brief = {}) => pedidoSimples({ research: undefined, price: 'R$ 990 mil', contact: 'Ana (11) 90000-0000 ana@exemplo.com', ...brief })
const pesquisaHonesta = async (src) => {
  const r = await rodaPesquisa(semPesquisa({ sentence: 'Loja à venda no Edifício Aurora, bairro Jardim. Fale com @ana.imoveis ou (11) 90000-0000' }), {}, src)
  const call = r.log.openai[0]
  const facts = r.res.body.facts
  const ev = r.log.events.find((e) => e.name === 'ads_v2_research_served')
  return r.res.status === 200 && facts.length === 2 && facts.every((f) => /^https:\/\//.test(f.url) && !/utm_source/.test(f.url)) &&
    facts[0].url === 'https://exemplo.org/aurora' && !facts.some((f) => /inventado\.test|1998|suítes|R\$|melhor/.test(f.text + f.url)) &&
    !/R\$|990|90000|ana@|@ana|Ana \(/.test(call.params.input) && call.params.store === false && call.params.tool_choice.type === 'web_search_preview' &&
    call.params.tools[0].type === 'web_search_preview' && !('user' in call.params) && !('user_location' in call.params.tools[0]) &&
    call.opts.timeout === 25_000 && call.opts.maxRetries === 0 && call.params.model === 'gpt-4.1-mini' &&
    r.tables.ads_v2_orders[0].brief.research.status === 'ok' && ev && ev.metadata.ok === true && ev.metadata.searches === 1 && typeof ev.metadata.usd_estimate === 'number' &&
    !JSON.stringify(ev.metadata).includes('Aurora')
}
await check('R5 /research EXECUTADO: só fatos com a fonte da ANOTAÇÃO (https, sem utm); preço/unidade/promessa/sem-fonte fora; consulta sem preço, contato, @ ou telefone; store:false, busca forçada, sem id nem localização; evento só com contagens', pesquisaHonesta())
// REANCORADO 29/09: o exemplo era "Apartamentos custam…" e, com a régua nova de palavras de unidade, o fato caía como
// "unit" mesmo sem o filtro de preço — o mutante deixava de provar o PREÇO. O sujeito virou o prédio.
await check('R5-mutante (M1): filtro de preço desligado fica vermelho', async () => {
  const mod = pura(F.research, trocar(SRC.research, "if (PRICE_RE.test(text)) return 'price'", ''))
  return mod.parseResearchOutput('- O prédio inteiro custa R$ 900 mil. ([x](https://x.test/a))', [{ type: 'url_citation', url: 'https://x.test/a', start_index: 30, end_index: 55 }]).facts.length === 1 &&
    R.parseResearchOutput('- O prédio inteiro custa R$ 900 mil. ([x](https://x.test/a))', [{ type: 'url_citation', url: 'https://x.test/a', start_index: 30, end_index: 55 }]).facts.length === 0
})
const fonteDaAnotacao = (M) => {
  const semAnot = M.parseResearchOutput('- A estação Jardim fica perto. https://inventado.test/x', [])
  const trocada = M.parseResearchOutput('- A estação Jardim fica perto. ([a](https://texto.test/a))', [{ type: 'url_citation', url: 'https://anotacao.test/b', start_index: 5, end_index: 40 }])
  const http = M.parseResearchOutput('- A estação Jardim fica perto.', [{ type: 'url_citation', url: 'http://inseguro.test/b', start_index: 0, end_index: 10 }])
  return semAnot.facts.length === 0 && semAnot.dropped.no_source === 1 && trocada.facts[0]?.url === 'https://anotacao.test/b' && http.facts.length === 0
}
await check('R6 (M2) fato sem anotação url_citation é descartado; a fonte é a da anotação, nunca a URL escrita pelo modelo; http recusado', fonteDaAnotacao(R))
await check('R6-mutante: fato sem citação aceito (fonte tirada do texto) fica vermelho', () => !fonteDaAnotacao(pura(F.research, trocar(SRC.research, 'const src = cite ? cleanSourceUrl(cite.url) : null', "const src = cite ? cleanSourceUrl(cite.url) : cleanSourceUrl((/https:\\/\\/\\S+/.exec(line) || [''])[0])"))))
const semUnidade = (M) => M.factRefusal('Unidade com 3 suítes e varanda') === 'unit' && M.factRefusal('Apartamento de 80 m²') === 'unit' && M.factRefusal('2 vagas na garagem') === 'unit' && M.factRefusal('Valorização de 20% ao ano') !== null && M.factRefusal('Um ícone do bairro') === 'promise' && M.factRefusal('Perto do Parque Central') === null
await check('R7 (M3) característica de unidade (suítes, m², vagas), valorização e fama nunca viram fato', semUnidade(R))
await check('R7-mutante: "3 suítes" passando fica vermelho', () => !semUnidade(pura(F.research, trocar(SRC.research, "if (UNIT_RE.test(text)) return 'unit'", ''))))
// Revisão de honestidade 29/09, achado 1 (o caso "interiores assinados"): fato do PRÉDIO que descreve a UNIDADE. Exemplos
// inventados. E o que tem de continuar passando: rua sem número, bairro, estação, andares do prédio, distância.
const predioNaoEUnidade = (M) =>
  ['O Edifício Aurora tem interiores assinados pela Grife Nova Home.', 'Os apartamentos do Edifício Aurora têm acabamento em mármore italiano.', 'Unidades com varanda gourmet e pé-direito duplo.', 'Cobertura com vista para o parque.', 'Apartamentos decorados e mobiliados pela grife.', 'The units have designer interiors.']
    .every((f) => M.factRefusal(f) === 'unit') &&
  ['O Edifício Aurora fica na Rua das Flores, no bairro Jardim.', 'A estação Jardim do metrô fica a poucos minutos a pé.', 'O prédio tem 20 andares e piscina.', 'Fica a 300 metros do Parque Central.', 'A Avenida Central, a 5 minutos, tem comércio.']
    .every((f) => M.factRefusal(f) === null)
await check('R7b (honestidade 1) interiores/acabamento/decorado/mobiliado/assinado/vista/varanda/cobertura/apartamentos = unit; prédio, rua, bairro e distância passam', predioNaoEUnidade(R))
await check('R7b-mutante: sem a régua de palavras de unidade ("interiores assinados" passando) fica vermelho', () => !predioNaoEUnidade(pura(F.research, trocar(SRC.research, "if (UNIT_WORDS_RE.test(text)) return 'unit'", ''))))
const semEndereco = (M) => M.factRefusal('O Edifício Aurora fica na Rua das Flores, 55.') === 'address' && M.factRefusal('Fica na Alameda Exemplo 1200, no bairro Jardim.') === 'address' &&
  M.factRefusal('Número 55 da rua.') === 'address' && M.factRefusal('CEP 01234-567.') !== null && M.factRefusal('Fica na Rua das Flores, no bairro Jardim.') === null
await check('R7c (honestidade 2) endereço com NÚMERO (rua + nº, "número 55", CEP) nunca vira fato; rua e bairro sem número passam', semEndereco(R))
await check('R7c-mutante: "Rua das Flores, 55" passando fica vermelho', () => !semEndereco(pura(F.research, trocar(SRC.research, "if (ADDRESS_RE.test(text)) return 'address'", ''))))
const semPortal = (M) => {
  const t = '- A estação Jardim do metrô fica perto. ([z](https://www.zapimoveis.com.br/imovel/x))'
  const a = M.parseResearchOutput(t, [{ type: 'url_citation', url: 'https://www.zapimoveis.com.br/imovel/x', start_index: 2, end_index: t.length }])
  const b = M.parseResearchOutput(t, [{ type: 'url_citation', url: 'https://mapa.test/jardim', start_index: 2, end_index: t.length }])
  return a.facts.length === 0 && a.dropped.portal === 1 && b.facts.length === 1 && M.isListingPortal('vivareal.com.br') && M.isListingPortal('quintoandar.com.br') && !M.isListingPortal('pt.wikipedia.org')
}
await check('R7d (honestidade 1) fonte de PORTAL de anúncio (zap, vivareal, quintoandar…) é descartada: descreve outra unidade', semPortal(R))
await check('R7d-mutante: portal aceito como fonte fica vermelho', () => !semPortal(pura(F.research, trocar(SRC.research, '    if (isListingPortal(src.host)) { dropped.portal += 1; continue }\n', ''))))
const researchCod = semComentarios(SRC.researchRoute)
// REANCORADO 29/09 (revisão de honestidade, achado 4): o teto diário saiu de ANTES da moderação (contado pelo evento, que
// só era gravado depois do modelo) para DEPOIS da trava, contado nos pedidos. Nova ordem abaixo.
const travaAntes = (src) => ordem(src, 'adsV2Visible(user.email)', "researchState(brief0.research, Date.now()) !== 'none'", 'moderateContent(', ".is('brief->research', null)", ".gte('brief->research->>at', since)", 'openai.responses.create(', 'parseResearchOutput(', "name: 'ads_v2_research_served'") &&
  !/from\('events'\)/.test(src)
await check('R8 (M4) ordem das travas da pesquisa: v2 → gravada volta sem modelo → moderação → TRAVA no pedido → teto diário (pedidos) → OpenAI → fatos → evento', travaAntes(researchCod))
await check('R8-mutante: teto contado ANTES da trava (a ordem velha) fica vermelho', () => {
  const capIdx = researchCod.indexOf('    const since = new Date(')
  const capEnd = researchCod.indexOf('    const language =', capIdx)
  const modIdx = researchCod.indexOf('    const safety = await moderateContent(')
  const capTxt = researchCod.slice(capIdx, capEnd)
  const mut = researchCod.slice(0, modIdx) + capTxt + researchCod.slice(modIdx, capIdx) + researchCod.slice(capEnd)
  return capIdx > 0 && modIdx > 0 && !travaAntes(mut)
})
await check('R8-mutante: a trava depois da chamada à OpenAI fica vermelho', () => {
  const lockIdx = researchCod.indexOf('    const lock = await admin')
  const lockEnd = researchCod.indexOf('    const language =', lockIdx)
  const callIdx = researchCod.indexOf('    let source:')
  const lockTxt = researchCod.slice(lockIdx, lockEnd)
  const mut = researchCod.slice(0, lockIdx) + researchCod.slice(lockEnd, callIdx) + researchCod.slice(callIdx).replace('    const ms = Date.now() - started', lockTxt + '    const ms = Date.now() - started')
  return lockIdx > 0 && !travaAntes(mut)
})
await check('R9 /research EXECUTADO: na hora da chamada à OpenAI o pedido JÁ está travado (running); a 2ª chamada devolve o gravado sem modelo', async () => {
  const w = mundo(semPesquisa(), { openaiResponse: RESPOSTA })
  const route = loadRoute(F.researchRoute, w.stubs)
  const a = await route.POST(req({ order_id: ORDER }))
  const b = await route.POST(req({ order_id: ORDER }))
  return w.log.openai.length === 1 && w.log.openai[0].lockState === 'running' && a.status === 200 && b.status === 200 && b.body.facts.length === a.body.facts.length && w.log.moderation[0].lockState === null
})
// Revisão de honestidade 29/09, achado 4: o teto é contado nos PEDIDOS (brief.research.at em 24 h, sem copied_from), depois
// da trava; leitura falhou = NÃO pesquisa. Recusou = a trava é desfeita (research volta a nulo) e o /plan segue sem fatos.
const outroPedido = (i, research) => ({ id: U(100 + i), user_id: USER, status: 'draft', brief: { mode: 'simple', sentence: 'x', research } })
const tetoFechado = async (src) => {
  const agora = new Date().toISOString()
  const cheio = mundo(semPesquisa(), { openaiResponse: RESPOSTA, orders: Array.from({ length: 6 }, (_, i) => outroPedido(i, { status: 'ok', at: agora, facts: [] })) })
  const c = await loadRoute(F.researchRoute, cheio.stubs, src).POST(req({ order_id: ORDER }))
  const copiados = mundo(semPesquisa(), { openaiResponse: RESPOSTA, orders: Array.from({ length: 6 }, (_, i) => outroPedido(i, { status: 'ok', at: agora, facts: [], copied_from: U(200) })) })
  const d = await loadRoute(F.researchRoute, copiados.stubs, src).POST(req({ order_id: ORDER }))
  const velhos = mundo(semPesquisa(), { openaiResponse: RESPOSTA, orders: Array.from({ length: 6 }, (_, i) => outroPedido(i, { status: 'ok', at: new Date(Date.now() - 25 * 3600_000).toISOString(), facts: [] })) })
  const v = await loadRoute(F.researchRoute, velhos.stubs, src).POST(req({ order_id: ORDER }))
  const cego = mundo(semPesquisa(), { openaiResponse: RESPOSTA, countError: true })
  const e = await loadRoute(F.researchRoute, cego.stubs, src).POST(req({ order_id: ORDER }))
  const cinco = mundo(semPesquisa(), { openaiResponse: RESPOSTA, orders: Array.from({ length: 5 }, (_, i) => outroPedido(i, { status: 'failed', at: agora, facts: [], why: 'timeout' })) })
  const f = await loadRoute(F.researchRoute, cinco.stubs, src).POST(req({ order_id: ORDER }))
  return c.status === 429 && c.body.error === 'daily_limit_research' && cheio.log.openai.length === 0 && (cheio.tables.ads_v2_orders[0].brief.research ?? null) === null &&
    d.status === 200 && copiados.log.openai.length === 1 && v.status === 200 && velhos.log.openai.length === 1 &&
    e.status === 502 && e.body.error === 'research_failed' && cego.log.openai.length === 0 && (cego.tables.ads_v2_orders[0].brief.research ?? null) === null &&
    f.status === 200 && cinco.log.openai.length === 1
}
await check('R9b (honestidade 4) teto de 6/24 h EXECUTADO: 6 pesquisas próprias = 429 sem modelo e a trava desfeita; copiadas e velhas não contam; a 6ª passa; contagem falhou = 502 sem modelo', tetoFechado())
await check('R9b-mutante: contagem falhou liberando a pesquisa (o furo antigo) fica vermelho', async () => !(await tetoFechado(trocar(SRC.researchRoute, 'if (cap.error || (cap.count ?? 0) > ADS_V2_RESEARCH_DAILY_CAP) {', 'if (!cap.error && (cap.count ?? 0) > ADS_V2_RESEARCH_DAILY_CAP) {'))))
await check('R9b-mutante: pesquisa copiada contando no teto fica vermelho', async () => !(await tetoFechado(trocar(SRC.researchRoute, "      .is('brief->research->>copied_from', null)\n", ''))))
await check('R10 (M5) a consulta lê SÓ brief.sentence: preço e contato do pedido nunca aparecem na rota de pesquisa', !/\.price\b|\.contact\b/.test(researchCod) && /const sentence = typeof brief0\.sentence === 'string' \? brief0\.sentence : ''/.test(researchCod) && /const query = researchQuery\(sentence\)/.test(researchCod))
await check('R10-mutante: consulta lendo o preço fica vermelho', () => {
  const mut = trocar(researchCod, 'const query = researchQuery(sentence)', 'const query = researchQuery(`${sentence} ${brief0.price}`)')
  return !(!/\.price\b|\.contact\b/.test(mut) && /const query = researchQuery\(sentence\)/.test(mut))
})
// REANCORADO 29/09 (revisão de honestidade, achado 1): "à venda" agora SAI da consulta (puxava anúncio de portal, que
// descreve outra unidade) — por isso o começo esperado é "Loja no Edifício Aurora".
await check('R11 researchQuery tira telefone, e-mail, @perfil, link, dinheiro e as palavras de venda, e corta em 200', () => {
  const q = R.researchQuery('Loja à venda no Edifício Aurora, R$ 450.000, fale 11 91234-5678 ou ana@exemplo.com @ana.imoveis https://exemplo.com/x ' + 'palavra '.repeat(60))
  return !/450|91234|ana@|@ana|https|exemplo\.com|venda/.test(q) && q.startsWith('Loja no Edifício Aurora') && q.length <= 200
})
// Revisão de honestidade 29/09, achado 3: dado pessoal ia para a busca na web. Exemplos INVENTADOS.
const consultaSemPessoa = (M) => {
  const a = M.researchQuery('Apartamento 142 do Edifício Aurora, Rua das Flores 55, falar com Maria Souza CPF 123.456.789-00')
  const b = M.researchQuery('Vendo sala 12 no 9º andar do Edifício Aurora, CEP 01234-567, sou João da Silva, corretora Ana Lima CRECI 12345-F, bairro Jardim')
  return !/142|55|Maria|Souza|CPF|123/.test(a) && /Edifício Aurora/.test(a) && /Rua das Flores/.test(a) &&
    !/\b12\b|9º|andar|01234|CEP|João|Silva|Ana|Lima|CRECI|12345|Vendo/.test(b) && /Edifício Aurora/.test(b) && /bairro Jardim/.test(b)
}
await check('R11b (honestidade 3) a consulta perde número da unidade e da rua, nome depois de "falar com/sou/corretora", CPF, CRECI e CEP; fica o lugar', consultaSemPessoa(R))
await check('R11b-mutante: nome depois de "falar com" indo à busca fica vermelho', () => !consultaSemPessoa(pura(F.research, trocar(SRC.research, '  q = dropNamesAfterIntro(q)\n', ''))))
await check('R11b-mutante: número da rua indo à busca fica vermelho', () => !consultaSemPessoa(pura(F.research, trocar(SRC.research, '(_m, rua: string) => rua)', '(m) => m)'))))
await check('R11c o pedido à busca proíbe número da rua, endereço exato, unidade (interiores, acabamento, vista…) e portal de anúncio', () => {
  const m = R.buildResearchMessages('Loja no Edifício Aurora', 'Portuguese').instructions
  return /street name \(never the street number\)/.test(m) && /the street number, the exact address or the postal code/.test(m) && /interiors, finishes, decoration, furniture, view, balcony/.test(m) && /real-estate listing portals/.test(m) && !/Allowed: the address/.test(m)
})
// Revisão de honestidade 29/09, achado 5: "nada achado" também é copiado (trocar o nível não paga outra busca); falha de
// fornecedor não. EXECUTADO na rota /orders.
const rodaPedido = async (prevResearch, src, sentence = 'Loja à venda no Edifício Aurora, bairro Jardim') => {
  const prev = { id: U(50), user_id: USER, status: 'draft', brief: { mode: 'simple', sentence: 'Loja à venda no Edifício Aurora, bairro Jardim', research: prevResearch } }
  const w = mundo(prev)
  const res = await loadRoute(F.ordersRoute, w.stubs, src).POST(req({ mode: 'simple', tier: 'commercial', seconds: 15, sector: 'real_estate', sentence, language: 'pt', narration: true, overlays: true, research_from: U(50) }))
  const novo = w.tables.ads_v2_orders.find((r) => r.id !== U(50))
  return { res, research: novo?.brief?.research ?? null }
}
const copiaCerta = async (src) => {
  const at = new Date().toISOString()
  const ok = await rodaPedido({ status: 'ok', at, facts: FATOS }, src)
  const nada = await rodaPedido({ status: 'failed', at, facts: [], why: 'nothing_found' }, src)
  const tudoFora = await rodaPedido({ status: 'failed', at, facts: [], why: 'all_dropped' }, src)
  const caiu = await rodaPedido({ status: 'failed', at, facts: [], why: 'openai_503' }, src)
  const outraFrase = await rodaPedido({ status: 'ok', at, facts: FATOS }, src, 'Outra frase qualquer')
  return ok.res.status === 201 && ok.research?.status === 'ok' && ok.research.copied_from === U(50) &&
    nada.research?.why === 'nothing_found' && nada.research.copied_from === U(50) && tudoFora.research?.why === 'all_dropped' &&
    caiu.research === null && outraFrase.research === null
}
await check('R12 (honestidade 5) /orders EXECUTADO: rascunho novo copia a pesquisa da mesma frase — ok, "nada achado" e "tudo descartado"; falha de fornecedor e frase diferente não', copiaCerta())
await check('R12-mutante: "nada achado" pago de novo a cada troca de nível fica vermelho', async () => !(await copiaCerta(trocar(SRC.ordersRoute, "(pr.status === 'ok' || (pr.status === 'failed' && (pr.why === 'nothing_found' || pr.why === 'all_dropped')))", "pr.status === 'ok'"))))
await check('R12b a cópia só lê rascunho DESTA conta', /\.select\('brief'\)\.eq\('id', o\.research_from\)\.eq\('user_id', user\.id\)\.maybeSingle\(\)/.test(semComentarios(SRC.ordersRoute)))

// Revisão de honestidade 29/09, achado 1 (parte do texto): fatos públicos num bloco próprio "do prédio/bairro, nunca do
// imóvel", e número que só existe nos fatos não vira tamanho/cômodo/andar do imóvel.
const BRIEF_FATO = { ...BRIEF, business: 'Loja no Edifício Aurora — espaço comercial', extra: { public_fact_1: 'Fica a 300 metros do Parque Central.', public_fact_2: 'O prédio tem 20 andares.' } }
const fatoNoBloco = (M) => {
  const m = M.buildV2CopyMessages(BRIEF_FATO, 'Brazilian Portuguese (pt-BR)', { maxWords: 30, narration: true })
  const i = m.user.indexOf(M.ADS_V2_PUBLIC_FACTS_HEADER)
  return i > 0 && m.user.indexOf('- Fica a 300 metros do Parque Central.') > i && !/public_fact_/.test(m.user) && /NOT about the property or unit being advertised/.test(M.ADS_V2_PUBLIC_FACTS_HEADER)
}
await check('B1 fatos públicos vão num bloco próprio "do prédio ou do bairro — NÃO do imóvel anunciado", nunca como "- public_fact_N:"', fatoNoBloco(BR))
await check('B1-mutante: fatos de volta no meio do brief como public_fact_N fica vermelho', () => !fatoNoBloco(briefLoader(trocar(SRC.brief, '.filter(([k]) => !PUBLIC_FACT_KEY.test(k)).map(([k, v]) => `- ${k}: ${v}`)', '.map(([k, v]) => `- ${k}: ${v}`)'))))
const numeroDoFato = (M) => {
  const o = { maxWords: 30, narration: true, overlays: false }
  const ruim = M.checkV2Copy(JSON.stringify({ narration: 'Loja no Edifício Aurora com 300 m² de espaço comercial para o seu negócio crescer aqui.', overlays: [], sector: 'real_estate' }), BRIEF_FATO, o)
  const andar = M.factNumberMisuse('Loja no 20º andar.', BRIEF_FATO)
  const bom = M.checkV2Copy(JSON.stringify({ narration: 'Conheça a loja no Edifício Aurora, a 300 metros do Parque Central, num prédio de 20 andares, pronta para o seu negócio.', overlays: [], sector: 'real_estate' }), BRIEF_FATO, o)
  const dono = M.factNumberMisuse('Loja de 300 m².', { ...BRIEF_FATO, offer: 'Loja de 300 m²' })
  return !ruim.ok && ruim.why.some((w) => /public facts about the building/.test(w)) && andar.includes('20') && bom.ok && dono.length === 0 && M.factNumberMisuse('Loja de 300 m².', BRIEF).length === 0
}
await check('B2 o "300" de "a 300 metros do parque" não vira "300 m²" (nem o 20 de "20 andares" vira "20º andar"); número que a PESSOA escreveu vale; sem fatos = nada muda', numeroDoFato(BR))
await check('B2-mutante: sem a régua de número do fato fica vermelho', () => !numeroDoFato(briefLoader(trocar(SRC.brief, '  if (misuse.length) why.push(', '  if (false) why.push('))))
await check('R13 evento ads_v2_research_served: na lista fechada, só-servidor e no sink', () => {
  const EV = pura(F.events)
  const sink = (SRC.sink.match(/const SERVER_ONLY_EVENTS = new Set\(\[([\s\S]*?)\]\)/) || ['', ''])[1]
  return EV.isAdsEvent('ads_v2_research_served') && EV.ADS_SERVER_ONLY_EVENTS.includes('ads_v2_research_served') && sink.includes("'ads_v2_research_served'")
})
await check('R14 custo estimado por pesquisa: 1 busca ≈ US$ 0,027; 3 buscas ≈ US$ 0,08 (tabela ADS_V2_RESEARCH_USD)', () => R.estimateResearchUsd({ searches: 1, inputTokens: 3000, outputTokens: 500 }) === 0.0270 && R.estimateResearchUsd({ searches: 3, inputTokens: 9000, outputTokens: 700 }) < 0.085)

// ═══ C. NADA É COBRADO ANTES DO "MAKE MY AD" ═══════════════════════════════════════════════════════════════════════════
const DEBITO = /chargeAdsV2|debitVideoCredits|rpc\(|submitShotOnce|dispatchAdsV2Shots|submitFal/
await check('C1 /plan e /research não debitam nem chamam a fal (leitura)', !DEBITO.test(planCod) && !DEBITO.test(researchCod))
const soNoBotao = (src) => {
  const s = semComentarios(src)
  const make = bloco(s, 'async function makeAd()')
  return (s.match(/'\/api\/ads\/v2\/start'/g) || []).length === 1 && make.includes("'/api/ads/v2/start'") && /if \(!plan \|\| !planFresh \|\| busy \|\| cost === null\) return/.test(make) &&
    (s.match(/void makeAd\(\)/g) || []).length === 1 && /onMake=\{\(\) => void makeAd\(\)\}/.test(s) && /onClick=\{onMake\}/.test(s) && !/dry_run/.test(s)
}
await check('C2 tela simples: o /start (débito) só é chamado pelo botão "Make my ad", com plano fresco; pesquisar e planejar não cobram', soNoBotao(SRC.simple))
await check('C2-mutante: /start chamado ao planejar fica vermelho', () => !soNoBotao(trocar(SRC.simple, "      setPlan({ ...r.data, sig: JSON.stringify({ base: baseAtStart, facts: chosen }), cardSig: card.sig })", "      setPlan({ ...r.data, sig: JSON.stringify({ base: baseAtStart, facts: chosen }), cardSig: card.sig })\n      await api('/api/ads/v2/start', { method: 'POST', body: { order_id: orderId } })")))
const semPrecoCravado = (tsx, lib) => !/\b(34|41|51)\b/.test(semComentarios(tsx)) && !/\b(34|41|51)\b/.test(semComentarios(lib)) &&
  /const credits = adsV2Credits\(t, ADS_V2_SCREEN_SECONDS\)/.test(tsx) && /const cost = tier \? adsV2Credits\(tier, ADS_V2_SCREEN_SECONDS\) : null/.test(tsx)
await check('C3 (M10) nenhum preço digitado na tela simples nem na lib: o preço vem de adsV2Credits (o mesmo do débito), que segue 34/41/51', semPrecoCravado(SRC.simple, SRC.simpleLib) && T.adsV2Credits('photo_motion', 15) === 34 && T.adsV2Credits('commercial', 15) === 41 && T.adsV2Credits('cinema', 15) === 51)
await check('C3-mutante: preço digitado na tela fica vermelho', () => !semPrecoCravado(trocar(SRC.simple, "<span className=\"cr\">{fill(copy.tiers.credits, { n: credits })}</span>", '<span className="cr">41 créditos</span>'), SRC.simpleLib))

// ═══ V. VÍDEO VIRA FOTOS NO NAVEGADOR ════════════════════════════════════════════════════════════════════════════════
const tempos = (M) => {
  const t10 = M.videoFrameTimes(10, 3), t1 = M.videoFrameTimes(1, 3), u = M.videoFrameTimes(10, 1), d = M.videoFrameTimes(10, 2), z = M.videoFrameTimes(10, 0), bad = M.videoFrameTimes(NaN, 3)
  const t02 = M.videoFrameTimes(0.04, 3)
  return JSON.stringify(t10) === '[2,5,8]' && JSON.stringify(t1) === '[0.5]' && JSON.stringify(u) === '[5]' && JSON.stringify(d) === '[2,8]' && z.length === 0 && bad.length === 0 &&
    t02.length === 1 && t02[0] <= 0.04 && JSON.stringify(M.ADS_V2_SIMPLE_VIDEO_FRACTIONS) === '[0.2,0.5,0.8]'
}
await check('V1 (M8) quadros do vídeo em 20/50/80% (curto < 1,5 s = só o meio; nunca além do fim)', tempos(S))
await check('V1-mutante: frações 0,2/0,5/0,8 trocadas fica vermelho', () => !tempos(pura(F.simpleLib, trocar(SRC.simpleLib, 'export const ADS_V2_SIMPLE_VIDEO_FRACTIONS: readonly number[] = [0.2, 0.5, 0.8]', 'export const ADS_V2_SIMPLE_VIDEO_FRACTIONS: readonly number[] = [0.1, 0.5, 0.9]'))))
// REANCORADO 29/09 (KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29): o V2 dizia "o VÍDEO nunca sobe" — o pedido do fundador é o
// contrário: o vídeo entra no anúncio COMO VÍDEO. Agora: até 2 vídeos que cabem sobem ORIGINAIS (uploadFootage, sem
// recorte) e o resto cai no plano B de antes (grabVideoFrames + videoFrameTimes). O add continua sem subir nada.
await check('V2 a tela aceita vídeo: o que cabe entra como vídeo (sobe o original, uma vez); o que não cabe vira quadros (grabVideoFrames + videoFrameTimes); o add não sobe nada', () => {
  const s = semComentarios(SRC.simple)
  // REANCORADO 29/09 (revisão do vídeo do cliente): addFiles virou a trava de "uma seleção por vez" e o corpo mudou para
  // addFilesNow — o bloco conferido é o que lê os arquivos; addFiles tem de delegar a ele.
  const add = bloco(s, 'async function addFilesNow(')
  if (!/await addFilesNow\(list\)/.test(bloco(s, 'async function addFiles('))) return false
  const b = bloco(s, 'async function framesFromVideo(')
  const ups = s.match(/uploadFootage\([^)]*\)/g) || []
  return /video\/mp4,video\/quicktime,video\/webm,\.mov/.test(S.ADS_V2_SIMPLE_ACCEPT) && /accept=\{ADS_V2_SIMPLE_ACCEPT\}/.test(s) &&
    /await videoItemOrFrames\(f, videosAlready, notes\)/.test(add) && !/uploadFootage/.test(add) &&
    /grabVideoFrames\(f, \(d\) => videoFrameTimes\(d, 3\), \{ maxSeconds: ADS_V2_SIMPLE_VIDEO_MAX_SECONDS \}\)/.test(b) &&
    /const file = p\.video \? p\.video\.file : await cropToVertical\(p\)/.test(s) &&
    ups.length === 3 && ups.every((u) => u === 'uploadFootage(file)' || u === 'uploadFootage(file, { isLogo: true })')
})
await check('V3 lib de quadros: só navegador, sem import; JPEG 0,92; quadro escuro (< 0,06) trocado pelo de 35%/65%; seek com limite de 15 s; decodificação falha = erro "decode"', () => {
  const s = SRC.frames
  return !/^\s*import\s/m.test(s) && /VIDEO_FRAME_JPEG_QUALITY = 0\.92/.test(s) && /VIDEO_FRAME_DARK_LUMA = 0\.06/.test(s) && /VIDEO_FRAME_FALLBACK_FRACTIONS: readonly number\[\] = \[0\.35, 0\.65\]/.test(s) && /VIDEO_FRAME_SEEK_TIMEOUT_MS = 15_000/.test(s) &&
    /new VideoFramesError\('decode'\)/.test(s) && /`\$\{base\}-quadro-\$\{i \+ 1\}\.jpg`/.test(s) && /\.videoDecode/.test(semComentarios(SRC.simple))
})
await check('V4 mais de 7 arquivos: os 7 primeiros entram, o resto fica "fora do anúncio" e pode trocar de lugar', () => {
  const s = semComentarios(SRC.simple)
  return /const inAd = items\.slice\(0, ADS_V2_SIMPLE_MAX_IN_AD\)/.test(s) && /items\.slice\(ADS_V2_SIMPLE_MAX_IN_AD\)\.map/.test(s) && /onUse=\{\(\) => promoteItem\(p\.key\)\}/.test(s) && S.ADS_V2_SIMPLE_MAX_IN_AD === SL.ADS_V2_MAX_PHOTOS && S.ADS_V2_SIMPLE_MIN_IN_AD === SL.ADS_V2_MIN_PHOTOS && C.ADS_V2_CONTRACT_MAX_PHOTOS === S.ADS_V2_SIMPLE_MAX_IN_AD
})

// ═══ T. TELA EM PORTUGUÊS QUANDO A INTERFACE ESTÁ EM PORTUGUÊS ═══════════════════════════════════════════════════════
const UI = pura('lib/ui/interfaceLanguage.ts')
await check('T1 pickInterfaceCopy(ADS_V2_SIMPLE_COPY, "pt") = textos em português; "fr" cai no inglês (nunca texto inventado)', () => {
  const pt = UI.pickInterfaceCopy(S.ADS_V2_SIMPLE_COPY, 'pt'), fr = UI.pickInterfaceCopy(S.ADS_V2_SIMPLE_COPY, 'fr'), es = UI.pickInterfaceCopy(S.ADS_V2_SIMPLE_COPY, 'es')
  return pt.plan.go === 'Descobrir e planejar (grátis)' && pt.shell.startOver === 'Recomeçar' && pt.text.question === 'Em poucas palavras, o que você quer vender ou mostrar?' &&
    pt.tiers.photo_motion.name === 'Normal' && pt.tiers.commercial.name === 'Comercial' && pt.tiers.cinema.name === 'Premium' && pt.text.voiceIn === 'Fala em' &&
    es.plan.go === 'Descubrir y planificar (gratis)' && fr === S.ADS_V2_SIMPLE_COPY.en
})
const chavesIguais = (M) => {
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? flat(v, `${p}${k}.`) : [`${p}${k}${Array.isArray(v) ? `[${v.length}]` : ''}`])).sort().join('|')
  const { en, pt, es } = M.ADS_V2_SIMPLE_COPY
  const vazio = (o) => Object.values(o).some((v) => (v && typeof v === 'object' ? vazio(v) : typeof v !== 'string' || !v.trim()))
  return flat(en) === flat(pt) && flat(en) === flat(es) && !vazio(pt) && !vazio(es)
}
await check('T2 (M9) pt e es têm EXATAMENTE as mesmas chaves do inglês, nenhuma vazia', chavesIguais(S))
await check('T2-mutante: uma chave faltando no pt fica vermelho', () => !chavesIguais(pura(F.simpleLib, trocar(SRC.simpleLib, "    keep: 'Continuar editando',\n", ''))))
const semInglesCravado = (src) => {
  const s = semComentarios(src)
  const jsx = s.slice(s.indexOf('  return (\n    <div className="adv2-layout">'))
  return /const copy: AdsV2SimpleCopy = pickInterfaceCopy\(ADS_V2_SIMPLE_COPY, lang\)/.test(s) && jsx.length > 1000 && !/>\s*[A-Za-z][A-Za-z ,.'’!:-]*\s*</.test(jsx) && !/(placeholder|aria-label|alt)="[A-Za-z]/.test(jsx)
}
await check('T3 a tela simples não tem texto de interface cravado em inglês: todo texto vem de copy (a língua da interface)', semInglesCravado(SRC.simple))
await check('T3-mutante: um texto em inglês cravado no JSX fica vermelho', () => !semInglesCravado(trocar(SRC.simple, '<h2>{copy.how.title}</h2>', '<h2>How it works</h2>')))
await check('T4 todo erro das rotas vira frase em pt/es (inclusive os novos: mode_mismatch, bad_facts, research_running, daily_limit_research); inglês fica com adsV2ErrorMessage', () => {
  const codes = ['network', 'unauthenticated', 'no_access', 'v2_closed', 'not_ready', 'out_of_credits', 'another_active', 'daily_limit', 'link_unreachable', 'brief_needs_business', 'no_copy', 'price_changed', 'text_not_retakable', 'moderation_unavailable', 'algo_novo', 'mode_mismatch', 'bad_facts', 'research_running', 'daily_limit_research', 'bad_fact']
  return ['pt', 'es'].every((l) => codes.every((c) => { const m = S.simpleErrorMessage(c, l, { needed: 41, balance: 10 }); return typeof m === 'string' && m.length > 20 && !m.includes(c) && /[.:/]$/.test(m) })) &&
    /41 créditos e você tem 10/.test(S.simpleErrorMessage('out_of_credits', 'pt', { needed: 41, balance: 10 })) && S.simpleErrorMessage('network', 'en') === null && S.simpleErrorMessage('network', 'fr') === null &&
    /simpleErrorMessage\(r\.code, lang, extra\) \?\? adsV2ErrorMessage\(/.test(SRC.simple)
})
await check('T5 invólucro: no simples o cabeçalho e a confirmação vêm na língua da interface; no completo, o inglês de antes (tabela en = textos da base)', () => {
  const w = wrapperOf(SRC.client)
  const en = S.ADS_V2_SIMPLE_COPY.en.shell
  return /const shell = mode === 'full' \? ADS_V2_SIMPLE_COPY\.en\.shell : pickInterfaceCopy\(ADS_V2_SIMPLE_COPY, lang\)\.shell/.test(w) && /const lang = useInterfaceLanguage\(\)/.test(w) &&
    en.title === 'Studio Ads' && en.sub === 'Your real photos, brought to life in a vertical ad with music, a short voice-over and your logo.' && en.confirmTitle === 'Start over with an empty ad?' &&
    en.confirmBody === 'Everything on this page (level, text, logo, photos and plan) will be cleared.' && /\{mode === 'full' \? shell\.sub : shell\.subSimple\}/.test(w)
})
await check('T6 "Fala em Português ▾" sempre à vista (fora de "Mais opções") e a língua escolhida vai ao pedido (language)', () => {
  const s = semComentarios(SRC.simple)
  return ordem(s, '<label className="adv2s-lang">', '<details className="adv2s-more"') && /NARRATION_LANGUAGES\.map\(\(l\) => <option key=\{l\.code\} value=\{l\.code\}>\{l\.native\}<\/option>\)/.test(s) &&
    /language: spoken,/.test(bloco(s, 'async function ensureDraft(')) && /const spoken: NarrationLanguage = voiceLang \?\? narrationLanguage\(detected\) \?\? narrationLanguage\(lang\) \?\? 'en'/.test(s)
})

// ═══ S. NOME E TIPO DO NEGÓCIO SAEM DO TEXTO ═════════════════════════════════════════════════════════════════════════
await check('S1 inferSector: imóvel primeiro ("loja à venda" é imóvel), depois restaurante/clínica/academia/salão/loja/app; sem acerto = other', () =>
  S.inferSector('Loja à venda no Edifício Aurora, bairro Jardim') === 'real_estate' && S.inferSector('Apartamento para alugar perto do metrô') === 'real_estate' && S.inferSector('Condo for rent near the park') === 'real_estate' &&
  S.inferSector('Pizzaria com forno a lenha') === 'restaurant' && S.inferSector('Clínica de fisioterapia') === 'clinic' && S.inferSector('Academia de crossfit') === 'gym' &&
  S.inferSector('Barbearia no centro') === 'salon' && S.inferSector('Loja de roupas femininas') === 'store' && S.inferSector('Aplicativo de entregas') === 'app_service' && S.inferSector('Aulas de violão') === 'other')
await check('S2 título do cartão = 1ª oração, até 40 caracteres; tipo de foto automático (loja=produto, app=tela, resto=lugar)', () =>
  S.simpleTitle('Loja à venda no Edifício Aurora, bairro Jardim, São Paulo') === 'Loja à venda no Edifício Aurora' && S.simpleTitle('x'.repeat(10) + ' ' + 'y'.repeat(50)).length <= 40 &&
  S.defaultPhotoKind('store') === 'product' && S.defaultPhotoKind('app_service') === 'text' && S.defaultPhotoKind('real_estate') === 'place' && S.defaultPhotoKind('other') === 'place')
await check('S3 /plan: o palpite de setor do modelo só entra no simples e só quando as palavras deram "other"', /const sector = simple && input\.sector === 'other' && extracted\.copy\.sectorHint \? extracted\.copy\.sectorHint : input\.sector/.test(planCod) && /planShots\(\{ sector, tier: order\.tier,/.test(planCod))

// ═══ E. ESPELHOS E FRONTEIRAS ════════════════════════════════════════════════════════════════════════════════════════
const ESPELHOS = ['async function api<T>(', 'function loadImage(', 'function canvasToBlob(', 'async function cropToVertical(']
const espelho = (cli, sim) => ESPELHOS.every((m) => { const a = bloco(cli.replace(/\r\n/g, '\n'), m), b = bloco(sim.replace(/\r\n/g, '\n'), m); return a.length > 80 && a === b })
await check('E1 (M11) api, loadImage, canvasToBlob e cropToVertical do modo simples são cópias EXATAS do modo completo', espelho(SRC.client, SRC.simple))
await check('E1-mutante: recorte do simples divergindo (fundo) fica vermelho', () => !espelho(SRC.client, trocar(SRC.simple, "  ctx.fillStyle = '#ffffff'\n", "  ctx.fillStyle = '#000000'\n")))
await check('E2 CONTACTISH da pesquisa = o da régua do texto (v2Brief)', () => {
  const re = /const CONTACTISH = (\/.*\/[a-z]*)\n/
  return (SRC.research.match(re) || [])[1] === (SRC.brief.match(re) || [])[1] && !!(SRC.research.match(re) || [])[1]
})
// REANCORADO 29/09 (KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29): + '@/lib/ads/v2UserVideo' (regra pura do vídeo do cliente, sem import).
// Approved delivery refinement: browser-only plan comparison; no request or persistence.
// REANCORADO 30/09 (KINEO-ADS-3-VARIACOES-2026-09-30): + './AdsV2Variations' (a opção e o painel das 3 variações; cliente,
// só importa react/next/link/videoDownload e libs puras — v2Screen, v2Variations, interfaceLanguage).
const IMPORTS_OK = ['./AdsV2Variations', '@/components/AdsPlanChanges', 'react', 'next/link', '@/lib/videoDownload', '@/lib/ads/uploadFootage', '@/lib/ads/endCard', '@/lib/ads/v2Tiers', '@/lib/ads/v2Screen', '@/lib/ads/v2Simple', '@/lib/ads/v2VideoFrames', '@/lib/ads/v2UserVideo', '@/lib/textLanguage', '@/lib/ui/interfaceLanguage']
await check('E3 a tela simples é cliente e só importa módulos de navegador/puros; v2Simple, v2Research e v2VideoFrames não têm import; textLanguage é pura', () => {
  const imps = [...SRC.simple.matchAll(/^import[\s\S]*?from '([^']+)'/gm)].map((m) => m[1])
  return /^'use client'/.test(SRC.simple) && imps.length >= 8 && imps.every((m) => IMPORTS_OK.includes(m)) &&
    [SRC.simpleLib, SRC.research, SRC.frames, rd('lib/ads/v2UserVideo.ts'), rd('lib/textLanguage.ts'), rd('lib/ui/interfaceLanguage.ts')].every((s) => !/^\s*import\s(?!type)/m.test(s)) && !/trackEvent\(/.test(SRC.simple)
})
await check('E4 trava 8.2: nenhum arquivo do modo simples mora em caminho travado', () => {
  const novos = [F.simple, F.simpleLib, F.research, F.frames, F.researchRoute, F.contract, F.brief, F.planRoute, F.ordersRoute, F.client]
  return novos.every((p) => !/^(lib\/compose|lib\/hollywood\/|lib\/cinematic\/|lib\/broll\/|lib\/lyriaMusic|lib\/narrationFit|app\/api\/analyze-idea\/|app\/api\/generate-script\/|app\/api\/generate-video-)/.test(p))
})
// REANCORADO 29/09 (revisão de honestidade, achado 2): o padrão virou DESMARCADO — nenhum fato da internet (nem o endereço)
// entra sem a pessoa marcar — e a marca é presa ao CONTEÚDO do fato (fonte + texto), não ao id f1..f6 (o f1 de uma
// pesquisa nova herdava a marca do f1 anterior). Virar para true é decisão do fundador e reancora este item.
const padraoFatos = (lib, tsx) => lib.ADS_V2_SIMPLE_FACTS_DEFAULT_ON === false &&
  /const factKey = \(f: Fact\) => JSON\.stringify\(\[f\.url, f\.text\]\)/.test(tsx) && /const isFactOn = \(f: Fact\) => factOn\[factKey\(f\)\] \?\? ADS_V2_SIMPLE_FACTS_DEFAULT_ON/.test(tsx) &&
  /checked=\{isFactOn\(f\)\} disabled=\{locked\} onChange=\{\(e\) => setFactOn\(\(m\) => \(\{ \.\.\.m, \[factKey\(f\)\]: e\.target\.checked \}\)\)\}/.test(tsx)
await check('E5 (honestidade 2) fatos DESMARCADOS por padrão (1 constante); a marca é presa à fonte + texto do fato, nunca ao id', padraoFatos(S, SRC.simple))
await check('E5-mutante: fatos marcados por padrão fica vermelho', () => !padraoFatos(pura(F.simpleLib, trocar(SRC.simpleLib, 'export const ADS_V2_SIMPLE_FACTS_DEFAULT_ON = false', 'export const ADS_V2_SIMPLE_FACTS_DEFAULT_ON = true')), SRC.simple))
await check('E5-mutante: marca presa ao id f1..f6 fica vermelho', () => !padraoFatos(S, trocar(SRC.simple, 'const factKey = (f: Fact) => JSON.stringify([f.url, f.text])', 'const factKey = (f: Fact) => f.id')))
// Revisão da tela 29/09, mutante A (sobrevivia com 89/0): o /plan tem de receber SÓ os fatos que a pessoa deixou marcados,
// e a assinatura do plano tem de usar a MESMA escolha (senão a tela diz "plano atual" com outra lista de fatos).
const soOsMarcadosNaTela = (src) => {
  const s = semComentarios(src)
  const plan = bloco(s, 'async function planAd()')
  return /const chosen = facts\.filter\(\(f\) => isFactOn\(f\)\)\.map\(\(f\) => f\.id\)/.test(plan) &&
    // REANCORADO 29/09 (KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29): o corpo ganhou `videos` (vídeos que entram como vídeo); fatos iguais.
    /body: \{ mode: 'simple', order_id: orderId, sector, logo_footage_id: logo\?\.footageId \?\? null, photos: uploaded, videos, card_footage_id: card\.footageId, facts: chosen \},/.test(plan) &&
    (plan.match(/facts:/g) || []).length === 2 && /setPlan\(\{ \.\.\.r\.data, sig: JSON\.stringify\(\{ base: baseAtStart, facts: chosen \}\), cardSig: card\.sig \}\)/.test(plan) &&
    (s.match(/'\/api\/ads\/v2\/plan'/g) || []).length === 1 &&
    /const planSig = JSON\.stringify\(\{ base: baseSig, facts: factsNow\.filter\(\(f\) => isFactOn\(f\)\)\.map\(\(f\) => f\.id\) \}\)/.test(s)
}
await check('F4 (revisão da tela A) tela: o /plan recebe SÓ os fatos marcados (chosen) e a assinatura do plano usa a mesma escolha', soOsMarcadosNaTela(SRC.simple))
await check('F4-mutante A: todos os fatos indo ao /plan (facts.map) fica vermelho', () => !soOsMarcadosNaTela(trocar(SRC.simple, 'card_footage_id: card.footageId, facts: chosen },', 'card_footage_id: card.footageId, facts: facts.map((f) => f.id) },')))
await check('F4-mutante A2: "chosen" = todos os ids fica vermelho', () => !soOsMarcadosNaTela(trocar(SRC.simple, 'const chosen = facts.filter((f) => isFactOn(f)).map((f) => f.id)', 'const chosen = facts.map((f) => f.id)')))
// Revisão da tela 29/09, achado 3: erro de envio em inglês numa tela em português.
const REASONS = [...((rd('lib/ads/uploadFootage.ts').match(/export type AdsUploadRefusal =([\s\S]*?)\n\n/) || ['', ''])[1].matchAll(/'([a-z_]+)'/g))].map((m) => m[1])
const envioTraduzido = (lib, tsx) => {
  const s = semComentarios(tsx)
  return REASONS.length >= 8 && ['pt', 'es'].every((l) => REASONS.every((r) => { const t = lib.ADS_V2_SIMPLE_UPLOAD_ERRORS[l][r]; return typeof t === 'string' && t.length > 15 && lib.simpleUploadErrorMessage(r, l) === t })) &&
    lib.simpleUploadErrorMessage('upload_failed', 'en') === null && lib.simpleUploadErrorMessage('algo_novo', 'pt') === lib.ADS_V2_SIMPLE_UPLOAD_ERRORS.pt.upload_failed &&
    /const uploadError = \(e: unknown, fallback: string\) => \(e instanceof AdsUploadError \? simpleUploadErrorMessage\(e\.reason, lang\) \?\? e\.message : fallback\)/.test(s) &&
    (s.match(/uploadError\(e, copy\.plan\.(logoFailed|uploadFailed|cardFailed)\)/g) || []).length === 3 && !/AdsUploadError \? e\.message/.test(s)
}
await check('T7 (revisão da tela 3) erro de envio na língua da tela: todo motivo de AdsUploadError tem frase em pt e es; logo, foto e quadro final usam a tradução', envioTraduzido(S, SRC.simple))
await check('T7-mutante: o logo de volta com e.message cru fica vermelho', () => !envioTraduzido(S, trocar(SRC.simple, 'error: uploadError(e, copy.plan.logoFailed) })', 'error: e instanceof AdsUploadError ? e.message : copy.plan.logoFailed })')))
await check('T7-mutante: motivo "quota" sem frase em pt fica vermelho', () => !envioTraduzido(pura(F.simpleLib, trocar(SRC.simpleLib, "  quota: 'O seu espaço de arquivos está cheio. Apague algo para enviar mais.',\n", '')), SRC.simple))

console.log(`test-ads-modo-simples-2026-09-29: ${ok} verdes, ${falhas.length} vermelhos`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)

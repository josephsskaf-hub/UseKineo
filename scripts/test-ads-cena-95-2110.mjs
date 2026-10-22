// KINEO-ADS-CENA-95-2110 — isolamento do canário, custos no start e desfaz exato; nenhum efeito real.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { CALIBRATION_CASES, DEFAULT_FOUNDER_PHOTOS } from './ads-cena-calibracao-2110.mjs'
import { semAdsCena952110, ADS_CENA_95_2110_BASE, ADS_CENA_95_2110_FORK_BASE, ADS_CENA_95_2110_ARQUIVOS, ADS_CENA_95_2110_NOVOS, MARCA_ADS_CENA_95_2110 } from './test-support/desfaz-ads-cena-95-2110.mjs'
import { semKidsVenda2010, KIDS_VENDA_2010_ARQUIVOS } from './test-support/desfaz-kids-venda-2010.mjs' // KINEO-ADS-CENA-95-2110 — prova as duas camadas, sem apagar a venda ao desfazer95.
const plain = x => JSON.parse(JSON.stringify(x)), same = (a,b) => assert.deepEqual(plain(a),plain(b))
const read = p => readFileSync(p,'utf8').replace(/\r\n/g,'\n')
const git = (...args) => execFileSync('git',args,{encoding:'utf8',maxBuffer:1<<26}).replace(/\r\n/g,'\n')
const deliveryHead = git('log','--format=%H','--grep=^'+MARCA_ADS_CENA_95_2110,'-1','HEAD').trim() // KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — bind historical scope to its own delivery; runtime/mutants still read current files.
assert.ok(deliveryHead,'commit final marcado da entrega95 existe') // KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22
const F = {cat:'lib/ads/cena/catalog.ts',start:'lib/ads/v2StartCore.ts'}
const photo = 'https://offline.example/product.png'
const serverDouble = { v2Json:(x,status=200)=>new Response(JSON.stringify(x),{status}),v2Fail:(error,status,extra={})=>new Response(JSON.stringify({error,...extra}),{status}) }
function loader(over={},mocks={},globals={}) { return createOfflineLoader({mocks,globals:{Response,Request,Error,...globals},source:(p,s)=>over[p]??s}) }
function database(tables, onUpdate = () => {}) {
  const queryLog = []
  const db = { tables, queryLog, auth: { admin: { getUserById: async () => ({ error: null, data: { user: { email: 'josephsskaf@gmail.com' } } }) } }, from(table) {
    if (!(table in tables)) throw new Error('Unexpected offline table: ' + table)
    queryLog.push(table)
    let patch = null, insert = null, once = false, result, filters = []
    const q = { select() { return q }, eq(k, v) { filters.push(r => r[k] === v); return q }, in(k, values) { filters.push(r => values.includes(r[k])); return q }, is(k, v) { filters.push(r => v === null ? r[k] == null : r[k] === v); return q }, update(v) { patch = v; return q }, insert(v) { insert = v; return q }, upsert(v) { insert = v; return q },
      exec(single = false) {
        if (!once) {
          once = true
          if (insert) { const rows = (Array.isArray(insert) ? insert : [insert]).map(plain); tables[table].push(...rows); result = { error: null, data: rows } }
          else { const rows = tables[table].filter(r => filters.every(f => f(r))); if (patch) for (const r of rows) { Object.assign(r, plain(patch)); onUpdate(table, plain(patch), plain(r)) } result = { error: null, data: rows.map(plain) } }
        }
        return { error: result.error, data: single ? result.data[0] ?? null : result.data }
      }, maybeSingle() { return Promise.resolve(q.exec(true)) }, single() { return q.maybeSingle() }, then(resolve, reject) { return Promise.resolve(q.exec()).then(resolve, reject) },
    }
    return q
  } }
  return db
}
const NOW = Date.parse('2026-10-21T15:00:00Z')
const fixedDate = clock => class extends Date { constructor(...a) { super(...(a.length ? a : [clock.now])) } static now() { return clock.now } }
async function legacyResponse(over = {}, baseline = false, scenario = {}) {
  const plan = { totalSeconds: 12.5, narration: 'Your product, made clear.', overlays: [{ text: 'Your real product', start: 0, end: 4 }], shots: [{ idx: 0, kind: 'text', role: 'hook', source: 'user_photo', cutSeconds: 12.5, prompt: '' }] }
  const order = { id: '00000000-0000-4000-8000-000000000001', user_id: 'owner', status: 'planned', tier: 'commercial', seconds: 15, card_url: photo, narration: true, plan, parent_order_id: null }
  const tables = { ads_v2_orders: [plain(order)], profiles: [{ id: 'owner', video_credits: scenario.balance ?? 100 }], ads_v2_shots: [] }, db = database(tables), events = [], effects = []
  const mocks = {
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000009' },
    '@/lib/serverEvents': { writeServerEvent: async e => events.push(plain(e)) }, '@/lib/safety/contentModeration': { moderateContent: async () => ({ ok: true }) },
    '@/lib/ads/serverAccess': { adsGate: reason => reason === 'internal' ? 'ok' : 'no_access', adsSampleOpen: async () => false, isMissingAdsTable: () => false },
    '@/lib/ads/v2Access': { adsV2Visible: () => true }, '@/lib/ads/v2Contract': { sanitizeStartBody: b => b.bad ? { ok: false, error: 'bad_body' } : { ok: true, value: { order_id: order.id, dry_run: scenario.dry === true } } },
    '@/lib/ads/v2Tiers': { adsV2Credits: () => 41, estimateAdUsd: () => ({ totalUsd: 1.23 }) },
    '@/lib/ads/v2Billing': { adsV2BillingRef: () => 'adsv2-deterministic', chargeAdsV2: async () => { effects.push('debit'); return { ok: true, balance: 59 } }, failAdsV2Order: async () => { throw new Error('unexpected legacy failure') } },
    '@/lib/ads/v2Advance': { loadAdsV2Order: async () => ({ order: plain(tables.ads_v2_orders[0]), error: null }), buildInitialShotRows: () => [{ idx: 0, kind: 'text', status: 'skipped_text' }], dispatchAdsV2Shots: async () => { effects.push('dispatch'); return 1 }, loadAdsV2Shots: async () => [{ idx: 0, status: 'skipped_text' }], adsV2View: (o, shots) => ({ order_id: o.id, status: o.status, generation_id: o.generation_id, shots }) },
    '@/lib/ads/v2Server': serverDouble,
    '@/lib/ads/v2CloseReal': { adsV2CloseRealOf: () => null }, '@/lib/ads/sampleEntry': { adsSamplePresenterPlanOk: () => false },
  }
  if (scenario.cena) tables.ads_v2_orders[0].plan.cena = plain(scenario.cena)
  const flagOff = scenario.cena ? read(F.cat) : (over[F.cat] ?? read(F.cat)).replace("ADS_CENA_LIVE: 'off' | 'internal' = 'internal'", "ADS_CENA_LIVE: 'off' | 'internal' = 'off'")
  const src = { ...over, [F.cat]: flagOff }
  if (baseline) src[F.start] = execFileSync('git', ['show', ADS_CENA_95_2110_BASE + ':lib/ads/v2StartCore.ts'], { encoding: 'utf8' }).replace(/\r\n/g, '\n')
  const S = loader(src, mocks, { Date: fixedDate({ now: NOW }) })(F.start)
  const response = await S.adsV2StartFor({ id: 'owner', email: 'josephsskaf@gmail.com' }, { reason: scenario.denied ? 'none' : 'internal', ownerId: 'owner', admin: db }, async () => ({ bad: scenario.bad }), NOW)
  return { status: response.status, body: await response.text(), events, effects, tables }
}

async function offProof(over={}) {
  for (const scenario of [{},{dry:true},{balance:0},{denied:true},{bad:true}]) {
    const current=await legacyResponse(over,false,scenario), before=await legacyResponse({},true,scenario)
    assert.equal(current.status,before.status);assert.equal(current.body,before.body,'resposta byte a byte com interruptor off')
    same(current.events,before.events);same(current.effects,before.effects);same(current.tables,before.tables)
  }
}
async function startCostProof(over={}) {
  const costs={kling3:{totalUsd:3.870701,budgetMaxUsd:7.295717},seedance2:{totalUsd:9.262501,budgetMaxUsd:18.079317},veo31:{totalUsd:8.762861,budgetMaxUsd:17.080037}}
  const cena={route:'kling3',plan:{marker:'KINEO-ADS-CENA-2110',voice_mode:'narrated',quality95:{version:MARCA_ADS_CENA_95_2110,costs}}}
  for(const dry of [false,true]) {
    const r=await legacyResponse(over,false,{dry,cena}),b=JSON.parse(r.body)
    assert.equal(r.status,dry?200:202);same(b.costs,costs);assert.equal(b.credits,41)
    if(!dry) {assert.equal(r.effects.filter(e=>e==='debit').length,1);same(r.events.find(e=>e.name==='ads_cena_started').metadata.costs,costs)}
    else assert.equal(r.effects.length,0)
  }
}
async function nativePreflightProof(over={}) {
  const c=CALIBRATION_CASES.find(c=>c.role==='watchProducten'), input={foto:DEFAULT_FOUNDER_PHOTOS.watchProducten,frase:c.product+'; '+c.benefit,oferta:c.offer,beneficios:[c.benefit],language:'en',formato:'product',voice_mode:'talking'}
  const script={hooks:c.hooks,pain:c.pain,demonstration:c.demonstration,benefit:c.benefit,offer:c.offer,cta:c.cta}
  const baseWords=[script.hooks[0],script.pain,script.demonstration,script.benefit,script.offer,script.cta].join(' ').split(/\s+/u).length
  const longer={...script,pain:script.pain+' '+['Right','over','here.'].slice(0,42-baseWords).join(' ')}
  assert.equal([longer.hooks[0],longer.pain,longer.demonstration,longer.benefit,longer.offer,longer.cta].join(' ').split(/\s+/u).length,42)
  const P=loader(over)('lib/ads/cena/plan95.ts');let attempts=0
  const classification={category:c.category,confidence:.99,product:c.product,offer:'',benefits:[],photo_is_isolated_product:true}
  const plan=await P.planCena95(input,'kling3',async call=>call.images.length?classification:++attempts===1?longer:script,{userId:'house',recentActors:[]})
  assert.equal(attempts,2,'fala42 não pode passar; refaz roteiro antes de gerar mídia/cobrar');assert.equal(plan.script.words,baseWords)
  await assert.rejects(()=>P.planCena95(input,'kling3',async call=>call.images.length?classification:longer,{userId:'house',recentActors:[]}),/cena95_native_speech_does_not_fit/)
}
async function captionPreflightProof(over={}) {
  const c=CALIBRATION_CASES.find(c=>c.role==='watchProducten'), input={foto:DEFAULT_FOUNDER_PHOTOS.watchProducten,frase:c.product+'; '+c.benefit,oferta:c.offer,beneficios:[c.benefit],language:'en',formato:'product',voice_mode:'narrated'}
  const script={hooks:c.hooks,pain:c.pain,demonstration:c.demonstration,benefit:c.benefit,offer:c.offer,cta:c.cta}
  const oversized={...script,demonstration:script.demonstration.replace(/^\S+/u,'a'.repeat(80))}
  const classification={category:c.category,confidence:.99,product:c.product,offer:'',benefits:[],photo_is_isolated_product:true}
  const P=loader(over)('lib/ads/cena/plan95.ts');let attempts=0
  const p=await P.planCena95(input,'kling3',async call=>call.images.length?classification:++attempts===1?oversized:script,{userId:'house',recentActors:[]})
  assert.equal(attempts,2,'texto que não cabe refaz antes de mídia/créditos');assert.equal(p.script.demonstration,script.demonstration)
  await assert.rejects(()=>P.planCena95(input,'kling3',async call=>call.images.length?classification:oversized,{userId:'house',recentActors:[]}),/cena95_caption_text_does_not_fit/)
}
await captionPreflightProof();console.log('ok legenda com texto impossível refaz/falha antes de mídia e cobrança, sem truncar')
await nativePreflightProof();console.log('ok fala por tomada:42 palavras incompatíveis refazem/falham antes de mídia e cobrança')
await offProof();console.log('ok canário desligado: cinco respostas, eventos, dados e efeitos idênticos à base'+ADS_CENA_95_2110_BASE.slice(0,9))
await startCostProof();console.log('ok start dry/live/evento devolvem custo completo do plano95, sem alterar41cr')
for(const [label,proof,file,from,to] of [
  ['resposta legada mudou',offProof,F.start,'usd_estimate: usd,','usd_estimate: {totalUsd:999},'],
  ['custo95 esquecido',startCostProof,F.start,'cena95CostTableOf(cena.plan) ??','null ??'],
  ['capacidade nativa só conferida depois de cobrar',nativePreflightProof,'lib/ads/cena/plan95.ts',"if (mode === 'talking') cena95NativeSegments(script,", "if (false) cena95NativeSegments(script,"],
  ['roteiro inválido sobrevive à última tentativa',nativePreflightProof,'lib/ads/cena/plan95.ts','script = undefined; correction =','correction ='],
  ['texto impossível só conferido depois de cobrar',captionPreflightProof,'lib/ads/cena/plan95.ts',"cena95Captions({ text: script.narration, language: input.language ?? 'en', speechWindows: cena95DefaultWindows(script) })",'void 0'],
]) {
  const src=read(file);assert.ok(src.includes(from));let failed=false
  try {await proof({[file]:src.replaceAll(from,to)})}catch{failed=true}
  assert.ok(failed,'mutante deve ficar vermelho: '+label);console.log('ok mutante vermelho: '+label)
}
for(const p of ADS_CENA_95_2110_ARQUIVOS) {
  const actual=read(p),before=git('show',ADS_CENA_95_2110_BASE+':'+p)
  assert.ok(actual.includes(MARCA_ADS_CENA_95_2110),'marca da camada: '+p)
  const restored=semAdsCena952110(actual,p);assert.equal(restored,before,'desfaz exato '+p)
  assert.equal(semAdsCena952110(restored,p),before,'idempotência '+p)
  assert.equal(semAdsCena952110(actual.replace(/\n/g,'\r\n'),p),before.replace(/\n/g,'\r\n'),'CRLF '+p)
  assert.throws(()=>semAdsCena952110(actual+'\n// mutante\n',p),/fonte divergente/)
  assert.notEqual(semAdsCena952110(actual.replaceAll(MARCA_ADS_CENA_95_2110,'REMOVED'),p),before,'não restaurar marca ausente')
}
assert.equal(semAdsCena952110('other\n','lib/other.ts'),'other\n')
for(const p of KIDS_VENDA_2010_ARQUIVOS) {
  const current=read(p), kidsOnly=git('show',ADS_CENA_95_2110_BASE+':'+p), beforeKids=git('show',ADS_CENA_95_2110_FORK_BASE+':'+p)
  assert.equal(semAdsCena952110(current,p),kidsOnly,'tirar somente95 preserva Kids byte a byte: '+p)
  assert.equal(semKidsVenda2010(current,p),beforeKids,'tirar95 e Kids restaura72 exata: '+p)
  assert.equal(semKidsVenda2010(semAdsCena952110(current,p),p),beforeKids,'composição95→Kids: '+p)
}
assert.equal(git('diff',ADS_CENA_95_2110_BASE,deliveryHead,'--','app','components','lib/kidsVenda','lib/stripe/kidsVendaCheckout.ts','migrations_pending/2026-10-20_kids_venda.sql'),'','produto Kids e app preservados da main') // KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22
console.log('ok composição exata:95→be103e493 com Kids preservado→Kids→72d23210, sem diff no produto Kids')
const oldUndo=read('scripts/test-support/desfaz-ads-cena-ajuste-2110.mjs')
assert.ok(oldUndo.indexOf('texto = semAdsCena952110(texto, p)')<oldUndo.indexOf("const rel = String(p ?? '')"))
const declared=new Set([...ADS_CENA_95_2110_ARQUIVOS,...ADS_CENA_95_2110_NOVOS])
const changed=git('diff','--name-only',ADS_CENA_95_2110_BASE,deliveryHead).trim().split('\n').filter(Boolean) // KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22
assert.ok(changed.length && changed.every(p=>declared.has(p)),'escopo95 exato: '+changed.filter(p=>!declared.has(p)).join(','))
for(const p of ADS_CENA_95_2110_NOVOS)assert.ok(readFileSync(p).length>0,'novo artefato: '+p)
for(const p of ['lib/engineWall.ts','lib/homeVideoCuration.ts','lib/checkoutPricing.ts','lib/ads/v2Billing.ts','lib/ads/v2Tiers.ts']) assert.equal(git('diff',ADS_CENA_95_2110_BASE,'--',p),'','intocado: '+p)
const subjects=git('log','--format=%s',ADS_CENA_95_2110_BASE+'..'+deliveryHead).trim().split('\n').filter(Boolean) // KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22
assert.ok(subjects.length && subjects.every(s=>s.startsWith(MARCA_ADS_CENA_95_2110)&&s.includes('[TRAVA 8.2 — vai do fundador 21/10 "quero chegar a 9.5 de mínimo"]')),'trava e marca95 em todos os commits')
console.log('ok desfaz95 exato, CRLF, idempotência, integridade, encadeamento, escopo e trava')

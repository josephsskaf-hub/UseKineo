// KINEO-NUVEM-A3-2026-10-02 — Produção pronta para assinantes (PRODUCAO_PUBLIC continua false):
//   (1) montagem com preço PROPOSTO de 2 cr, cobrado SÓ com PRODUCAO_MONTAGE_CHARGE_LIVE (nasce false);
//   (2) débito no padrão de lib/ads/v2Billing.ts (intenção → saldo → débito → reler o ledger) ANTES do envio, estorno
//       se o envio falhar e se o Creatomate desistir; um clique = uma chave (sem débito duplo);
//   (3) o MP4 final entra na Biblioteca: linha em `videos` com render_id = chave (é também a prova de entrega que a
//       varredura genérica de estorno lê — 'prodmont-' fica DENTRO da varredura de propósito);
//   (4) fala para a câmera: presenter 70 ("Talk to camera (standard)") ao lado do fabric 110, com os MESMOS números que
//       /api/generate-avatar cobra; o selo é o modelo real.
// readFileSync + transpile (módulos puros executados).
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
function load(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (p) => { throw new Error('import inesperado: ' + p) })
  return mod.exports
}
const ordem = (src, ...marcas) => { let at = -1; for (const m of marcas) { const i = src.indexOf(m, at + 1); if (i < 0 || i <= at) return false; at = i } return true }

const LIB = read('lib/ads/producao.ts')
const SERVER = read('lib/ads/producaoServer.ts')
const ROUTE = read('app/api/ads/producao/montage/route.ts')
const CLIENT = read('app/(dashboard)/ads/producao/ProducaoClient.tsx')
const AVATAR = read('app/api/generate-avatar/route.ts')
const RESERVATION = read('lib/avatar/reservation.ts')
const LABEL = read('lib/engineLabel.ts')
const SWEEP = load(read('lib/credits/sweepScope.ts'))
const P = load(LIB)

console.log('1 — preço proposto atrás de interruptor')
ok(P.PRODUCAO_MONTAGE_CREDITS === 2, 'proposta: 2 créditos por montagem')
ok(P.PRODUCAO_MONTAGE_CHARGE_LIVE === false && /export const PRODUCAO_MONTAGE_CHARGE_LIVE = false\n/.test(LIB), 'cobrança nasce desligada')
ok(P.montageChargeCredits(false) === 0 && P.montageChargeCredits(true) === 2 && P.montageChargeCredits() === 0, 'montageChargeCredits: 0 desligado, 2 ligado')
ok(P.PRODUCAO_PUBLIC === false, 'PRODUCAO_PUBLIC continua false')
ok(!P.PRODUCAO_PUBLIC || P.PRODUCAO_MONTAGE_CHARGE_LIVE, 'público exige cobrança ligada')

function routeProblems(route) {
  const p = []
  if (!ordem(route, "if (PRODUCAO_PUBLIC && !PRODUCAO_MONTAGE_CHARGE_LIVE) return producaoFail('price_not_set', 403)", 'parseMontageRefs(body?.shots)')) p.push('guarda de público sem cobrança fora de lugar')
  // Ordem do dinheiro: peças resolvidas → chave → reuso → débito → envio → evento com a chave.
  if (!ordem(route, 'buildProducaoMontageSource({', 'producaoMontageBillingRef(user.id, idem)', "eq('metadata->>billing_ref', billingRef)", 'const credits = montageChargeCredits()', 'chargeProducaoMontage(admin, { userId: user.id, billingRef, cost: credits })', 'renderId = await submitCreatomateRender(source)', 'billing_ref: billingRef,')) p.push('ordem montar → chave → reuso → débito → envio → evento quebrada')
  if (!/if \(charge\.debitPossible\) await refundProducaoMontage/.test(route)) p.push('falha de cobrança com débito possível sem estorno')
  if (!/catch \(e\) \{\s*\n\s*\/\/[^\n]*\n\s*const refund = credits > 0 \? await refundProducaoMontage/.test(route)) p.push('envio recusado sem estorno')
  if (!/\(st\.status === 'failed' \|\| st\.status === 'cancelled'\) && billingRef && charged > 0/.test(route)) p.push('Creatomate falhou sem estorno')
  if (!/render_id: billingRef,/.test(route) || !/quality_mode: PRODUCAO_MONTAGE_QUALITY/.test(route) || !/from\('videos'\)\.insert\(row\)/.test(route)) p.push('o MP4 não entra na Biblioteca com a chave')
  if (!/code === '23505'/.test(route)) p.push('2ª consulta duplicaria a linha da Biblioteca')
  if (/credits: 0,/.test(route)) p.push('evento ainda grava credits 0 fixo')
  return p
}
console.log('2 — débito, estorno e Biblioteca na rota')
const rp = routeProblems(ROUTE)
ok(rp.length === 0, 'rota da montagem' + (rp.length ? ': ' + rp.join('; ') : ''))

function serverProblems(src) {
  const p = []
  if (!ordem(src, 'export async function chargeProducaoMontage', 'recordRenderIntent({ renderId: billingRef, userId, quality: PRODUCAO_MONTAGE_QUALITY, cost })', "from('profiles').select('video_credits')", 'debitVideoCredits(admin, { userId, renderId: billingRef, cost, service: true })', 'confirmAdsV2Debit(admin, { userId, billingRef, cost })')) p.push('cobrança fora do padrão intenção → saldo → débito → reler')
  if (!/if \(!\(balance >= cost\)\) return \{ ok: false, code: 'out_of_credits', status: 402, debitPossible: false \}/.test(src)) p.push('saldo curto não recusa antes do débito')
  if (!/refundAdsV2Confirmed\(admin, args\)/.test(src)) p.push('estorno sem releitura do ledger')
  return p
}
console.log('3 — cobrança no padrão v2Billing')
const sp = serverProblems(SERVER)
ok(sp.length === 0, 'chargeProducaoMontage' + (sp.length ? ': ' + sp.join('; ') : ''))

console.log('4 — a varredura de estorno julga a montagem pela linha em videos')
ok(P.PRODUCAO_MONTAGE_BILLING_PREFIX === 'prodmont-', "prefixo 'prodmont-'")
ok(SWEEP.isGenericSweepCandidate('prodmont-0123456789abcdef0123456789abcdef'), "'prodmont-' está DENTRO da varredura genérica (sem linha em videos em 2 h = estorna)")
ok(!/'prodmont/.test(read('lib/credits/sweepScope.ts')), 'nenhuma exclusão escondida para a montagem')
ok(/producao_montage: 'Studio Ads'/.test(LABEL), 'selo honesto na Biblioteca: Studio Ads')
ok(P.isProducaoIdempotencyKey('pm-clip-ui-1234') && !P.isProducaoIdempotencyKey('x') && !P.isProducaoIdempotencyKey('a b c d e f g h') && !P.isProducaoIdempotencyKey(null), 'chave de idempotência validada')
ok(/idempotency_key: idempotencyKey,/.test(CLIENT), 'a tela manda uma chave por clique')

console.log('5 — presenter 70 ao lado do fabric 110')
const pres = P.PRODUCAO_TALK_ENGINES.find((e) => e.key === 'presenter')
const fab = P.PRODUCAO_TALK_ENGINES.find((e) => e.key === 'fabric')
ok(pres && pres.credits === 70 && pres.label === 'Talk to camera (standard)' && /Kling AI Avatar v2 Standard/.test(pres.model), 'presenter = "Talk to camera (standard)", 70 cr, modelo real')
ok(fab && fab.credits === 110 && fab.model === 'VEED Fabric', 'fabric = 110 cr, VEED Fabric')
const avatarCost = AVATAR.match(/const AVATAR_CREDIT_COST = engine === 'presenter' \? (\d+) : (\d+)/)
const resCost = RESERVATION.match(/return engine === 'presenter' \? (\d+) : (\d+)/)
ok(avatarCost && Number(avatarCost[1]) === pres.credits && Number(avatarCost[2]) === fab.credits, 'os preços da tela = o que /api/generate-avatar cobra')
ok(resCost && Number(resCost[1]) === pres.credits && Number(resCost[2]) === fab.credits, 'e = o que a reserva do avatar grava')
ok(P.producaoTalkEngine('bogus').key === P.PRODUCAO_TALK_DEFAULT && P.producaoTalkEngine('presenter').key === 'presenter', 'valor desconhecido cai no padrão')
ok(/PRODUCAO_TALK_ENGINES\.map\(\(te\) =>/.test(CLIENT) && /engine: producaoTalkEngine\(s\.talkEngine\)\.key/.test(CLIENT) && /&engine=\$\{producaoTalkEngine\(s\.talkEngine\)\.key\}/.test(CLIENT), 'a tela oferece as duas e manda o motor escolhido ao avatar e ao status')
ok(/\$\{s\.talkEngine\}\|\$\{s\.voice\}/.test(CLIENT), 'trocar o motor da fala exige refazer a fala (lifeKey)')

console.log('Mutantes')
const mut = (label, probs) => ok(probs.length > 0, 'mutante pego: ' + label)
mut('envio antes do débito', routeProblems(ROUTE.replace('const credits = montageChargeCredits()', 'const credits = 0 as number\n    void montageChargeCredits').replace('chargeProducaoMontage(admin, { userId: user.id, billingRef, cost: credits })', 'chargeProducaoMontage(admin, {})')))
mut('sem estorno no envio recusado', routeProblems(ROUTE.replace('const refund = credits > 0 ? await refundProducaoMontage(admin, { userId: user.id, billingRef }) : null', 'const refund = null')))
mut('sem estorno no Creatomate falho', routeProblems(ROUTE.replace("(st.status === 'failed' || st.status === 'cancelled') && billingRef && charged > 0", 'false')))
mut('sem Biblioteca', routeProblems(ROUTE.replace("from('videos').insert(row)", "from('x').insert(row)")))
mut('débito sem reler o ledger', serverProblems(SERVER.replace('confirmAdsV2Debit(admin, { userId, billingRef, cost })', '({ ok: true, refunded: false })')))
mut('saldo curto aceito', serverProblems(SERVER.replace("if (!(balance >= cost)) return { ok: false, code: 'out_of_credits', status: 402, debitPossible: false }", '')))

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)

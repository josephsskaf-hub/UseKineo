// KINEO-GUARDIAO-2026-08-28 — provas das 5 prioridades da pista "qualidade,
// números e zero falha" (divisão do fundador: aquisição/assinaturas = Codex).
import { readFileSync } from 'node:fs'
import { semAvatarEstorno2010 } from './test-support/desfaz-avatar-estorno-2010.mjs' // KINEO-AVATAR-ESTORNO-2010 — a prova histórica mantém sua fotografia; o guardião novo executa o estorno corrigido
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import vm from 'node:vm'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const R = join(dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0, bad = 0
const chk = (n, c, d='') => { if (c) { ok++; console.log(`  ✓ ${n}`) } else { bad++; console.log(`  ✗ ${n}${d?' — '+d:''}`) } }
const ler = (p) => semAvatarEstorno2010(readFileSync(join(R, p), 'utf8'), p) // KINEO-AVATAR-ESTORNO-2010
const cod = (p) => ler(p).replace(/\/\*[\s\S]*?\*\//g,'').split('\n').filter(l=>!/^\s*(\/\/|\*)/.test(l)).join('\n')

console.log('\n═══ GUARDIÃO 28/08 — as 5 prioridades ═══\n')

console.log('P2) Avatar entra na rede de estorno')
const refund = ler('lib/credits/refund.ts')
chk('sweepAbandonedAvatarDebits existe', refund.includes('export async function sweepAbandonedAvatarDebits'))
chk('cutoff de 6h (nenhum retry vivo alcança)', refund.includes("6 * 60 * 60 * 1000"))
chk('nunca estorna por cima de entrega (checa videos completed)', /avatar[\s\S]{0,3000}?\.eq\('status', 'completed'\)/.test(refund.slice(refund.indexOf('sweepAbandonedAvatarDebits'))))
chk('usa o estorno idempotente do avatar', refund.includes('refundAvatarBirthDebitForFailedRequest({ userId, requestId })'))
const cron = ler('app/api/cron/refund-sweep/route.ts')
chk('cron chama a varredura nova', cron.includes('sweepAbandonedAvatarDebits()'))
chk('resultado do avatar aparece no log do cron', cron.includes('animatePublished, avatar, errors'))

console.log('\nP3) Tripwire fail-closed nas campanhas')
const trip = ler('lib/truncationTripwire.ts')
chk('helper lança em >=1000 (aborta, não reenvia)', trip.includes('throw new DedupeTruncatedError'))
for (const [f, tag] of [
  ['app/api/cron/send-oneoff-unlock/route.ts','oneoff-unlock'],
  ['app/api/admin/send-hotlead-blast/route.ts','hotlead-blast'],
  ['app/api/admin/send-hot-upsell/route.ts','hot-upsell'],
  ['app/api/admin/send-first50-quentes/route.ts','first50'],
  ['app/api/cron/send-blackout-winback/route.ts','blackout'],
  ['app/api/admin/send-checkout-rescue/route.ts','checkout-rescue'],
]) {
  const src = cod(f), ast = ts.createSourceFile(f, src, 99, true)
  let dedupePaginado = false
  function walk(n) {
    if (ts.isCallExpression(n) && n.expression.getText(ast) === 'readAll' && n.arguments[0]?.getText(ast).includes(".from('events')") && n.arguments[0].getText(ast).includes(".eq('name',") && n.arguments[1]?.getText(ast).includes("table: 'events'")) dedupePaginado = true
    ts.forEachChild(n, walk)
  }
  walk(ast)
  chk(`${tag}: dedupe completo passa pelo readAll fail-closed`, src.includes("import { readAll }") && dedupePaginado)
}
// A paginação substituiu o tripwire local. Executar a implementação real prova
// que a 1001ª linha não desaparece e um erro posterior nunca vira supressão parcial.
process.chdir(R)
const { readAll } = createOfflineLoader({ mocks: { '../serverEvents': { writeServerEvent: async () => true } } })('@/lib/supabase/readAll')
function paginatedQuery(failure = false) {
  const calls = []
  const build = () => {
    const query = { order: (key, opts) => { calls.push(['order', key, opts.ascending]); return query }, range: async (from, to) => {
      calls.push(['range', from, to])
      if (failure && from > 0) return { data: null, error: { message: 'fixture failure' } }
      return { data: Array.from({ length: from === 0 ? 1000 : 1 }, (_, i) => ({ id: from + i })), error: null }
    } }
    return query
  }
  return { calls, build }
}
const complete = paginatedQuery()
const all = await readAll(complete.build, { route: '/fixture', table: 'events' })
chk('readAll: 1001 linhas completas em duas páginas, chave id estável e ranges exatos', all.data.length === 1001 && all.data[1000].id === 1000 && JSON.stringify(complete.calls) === JSON.stringify([['order','id',true],['range',0,999],['order','id',true],['range',1000,1999]]))
let rejected = false
try { await readAll(paginatedQuery(true).build, { route: '/fixture', table: 'events' }) } catch (e) { rejected = e.message.includes('page 1000: fixture failure') }
chk('readAll: erro na segunda página lança e não devolve conjunto parcial', rejected)

console.log('\nP4) O admin fala a verdade inteira')
// lineCod: só tira comentário de LINHA. O strip de /* */ é guloso demais em
// arquivo com '/*' órfão dentro de string/JSX e engoliu o bloco inteiro —
// aconteceu na primeira execução deste teste, com o overview.
const lineCod = (p) => ler(p).split('\n').filter(l=>!/^\s*(\/\/|\*)/.test(l)).join('\n')
const ov = lineCod('app/admin/overview/page.tsx')
chk('overview: as 6 leituras cruas viraram fetchAllRows', (ov.match(/fetchAllRows</g)??[]).length >= 6 && !ov.includes('.limit(5000)'))
const roi = cod('app/admin/trial-roi/page.tsx')
chk('trial-roi: claims usam readAll ordenado e completo', /readAll\(\(\) => admin[\s\S]*?\.from\('events'\)[\s\S]*?\.eq\('name', 'compose_submission_claim'\)[\s\S]*?table: 'events'/.test(roi))
chk('trial-roi: o .limit(20000) cego morreu', !roi.includes('.limit(20000)'))
const live = cod('app/api/admin/live/route.ts')
const liveAst = ts.createSourceFile('live.ts', live, 99, true)
let deliveryBlock = null
function deliveryVisit(n) { if (ts.isVariableDeclaration(n) && n.name.getText(liveAst) === 'vidCount') deliveryBlock = n.parent.parent.parent; ts.forEachChild(n, deliveryVisit) }
deliveryVisit(liveAst)
// Os comentários já foram removidos de `live`: a AST delimita as declarações e
// o bloco imediatamente depois das três chamadas, sem depender desse comentário.
const stmts = deliveryBlock?.statements ?? []
const index = stmts.findIndex(n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(liveAst) === 'vidCount'))
const counting = index >= 0 ? stmts.slice(index, index + 6).map(n => n.getText(liveAst)).join('\n') : ''
function deliveries(src) {
  const box = { vidRes: { data: [{user_id:'u'}] }, imagesRes: { data: [{user_id:'u'}] }, audiosRes: { data: [{user_id:'u'}] }, animateDelivRes: { data: [
    {user_id:'u',metadata:{outcome:'delivered',billing_reference:'job-1'}},
    {user_id:'u',metadata:{outcome:'delivered',billing_reference:'job-1'}},
    {user_id:'u',metadata:{outcome:'refunded',billing_reference:'job-2'}},
    {user_id:'u',metadata:{outcome:'delivered',request_id:'job-3'}},
    {user_id:null,metadata:{outcome:'delivered',billing_reference:'orphan'}},
  ] } }
  return vm.runInNewContext(ts.transpileModule(src + '\nvidCount.get("u")', { compilerOptions: { target: 9 } }).outputText, box)
}
chk('live: as 4 fontes somam 5 entregas; Animate deduplica e ignora estorno/sem dono', counting && deliveries(counting) === 5)
chk('live: ignorar a fonte images é detectado', counting && deliveries(counting.replace('bumpDelivery(imagesRes.data as unknown[] | null)', '')) !== 5)
chk('live: ignorar deduplicação Animate é detectado', counting.includes('refs.size') && deliveries(counting.replace('refs.size', 'refs.size + 1')) !== 5)
chk('live: animate_job_settled entra como entrega', live.includes("'animate_job_settled'"))

console.log('\nP5) Thumbnails nascem com o render')
const comp = ler('lib/compose.ts')
chk('o POST ao Creatomate pede snapshot_time', comp.includes('snapshot_time: 1.2'))
chk('o caminho de gravação continua o de sempre (snapshot_url→thumbnail_url)', comp.includes('snapshotUrl: typeof data.snapshot_url'))

console.log(`\n═══ ${ok} passaram, ${bad} falharam ═══\n`)
process.exit(bad === 0 ? 0 : 1)

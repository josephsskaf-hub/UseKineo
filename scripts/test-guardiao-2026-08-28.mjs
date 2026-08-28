// KINEO-GUARDIAO-2026-08-28 — provas das 5 prioridades da pista "qualidade,
// números e zero falha" (divisão do fundador: aquisição/assinaturas = Codex).
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const R = join(dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0, bad = 0
const chk = (n, c, d='') => { if (c) { ok++; console.log(`  ✓ ${n}`) } else { bad++; console.log(`  ✗ ${n}${d?' — '+d:''}`) } }
const ler = (p) => readFileSync(join(R, p), 'utf8')
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
]) chk(`${tag} passa o dedupe pelo tripwire`, cod(f).includes('dedupeTripwire('))

console.log('\nP4) O admin fala a verdade inteira')
// lineCod: só tira comentário de LINHA. O strip de /* */ é guloso demais em
// arquivo com '/*' órfão dentro de string/JSX e engoliu o bloco inteiro —
// aconteceu na primeira execução deste teste, com o overview.
const lineCod = (p) => ler(p).split('\n').filter(l=>!/^\s*(\/\/|\*)/.test(l)).join('\n')
const ov = lineCod('app/admin/overview/page.tsx')
chk('overview: as 6 leituras cruas viraram fetchAllRows', (ov.match(/fetchAllRows</g)??[]).length >= 6 && !ov.includes('.limit(5000)'))
const roi = cod('app/admin/trial-roi/page.tsx')
chk('trial-roi: claims paginados COM ordem estável', roi.includes(".order('id', { ascending: true })") && roi.includes('.range(from, from + 999)'))
chk('trial-roi: o .limit(20000) cego morreu', !roi.includes('.limit(20000)'))
const live = cod('app/api/admin/live/route.ts')
chk('live: a coluna soma as 4 fontes (videos, images, audios, animate)', (lineCod('app/api/admin/live/route.ts').match(/bumpDelivery\(/g)??[]).length >= 4)
chk('live: animate_job_settled entra como entrega', live.includes("'animate_job_settled'"))

console.log('\nP5) Thumbnails nascem com o render')
const comp = ler('lib/compose.ts')
chk('o POST ao Creatomate pede snapshot_time', comp.includes('snapshot_time: 1.2'))
chk('o caminho de gravação continua o de sempre (snapshot_url→thumbnail_url)', comp.includes('snapshotUrl: typeof data.snapshot_url'))

console.log(`\n═══ ${ok} passaram, ${bad} falharam ═══\n`)
process.exit(bad === 0 ? 0 : 1)

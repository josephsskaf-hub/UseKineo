// KINEO-CARTAS-POS-MORTE-DESLIGADAS-2026-09-24 — guardião do "desliga" do fundador (24/09).
// Medido em 30 d: D5/D10 1.527 envios → 0 pagantes; momentum 313 → 0; as duas cartas do trial de US$1 (morto em 09/09)
// ainda saíam por cron. Nenhum pagante orgânico jamais nasceu depois do D2. As cartas das primeiras 48 h continuam.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }

// 1. vercel.json: os três crons de carta saíram; os crons de operação continuam
const crons = JSON.parse(rd('vercel.json')).crons.map((c) => String(c.path))
const foram = ['/api/cron/send-momentum-nudge', '/api/admin/send-second-try-1usd', '/api/admin/send-affiliate-wakeup-1usd']
checa('momentum, second-try-1usd e affiliate-wakeup-1usd não estão mais agendados', foram.every((p) => !crons.some((c) => c.startsWith(p))))
checa('crons de operação continuam (refund-sweep, trial-downgrade, finish-stranded-renders, annual-credit-refill, trial-lifecycle-emails)',
  ['/api/cron/refund-sweep', '/api/cron/trial-downgrade', '/api/cron/finish-stranded-renders', '/api/cron/annual-credit-refill', '/api/cron/trial-lifecycle-emails'].every((p) => crons.some((c) => c.startsWith(p))))
checa('vercel.json continua JSON válido com ≥ 35 crons', crons.length >= 35)

// 2. lifecycle: D5/D10 atrás do interruptor em false; as cartas das primeiras 48 h intactas
const lc = rd('app/api/cron/trial-lifecycle-emails/route.ts')
checa('interruptor POST_TRIAL_LETTERS_ENABLED existe, é const (não export) e está em false', /^const POST_TRIAL_LETTERS_ENABLED = false$/m.test(lc) && !/export const POST_TRIAL_LETTERS_ENABLED/.test(lc))
checa('a janela D5 só devolve expired_offer_d5 com o interruptor ligado', /if \(POST_TRIAL_LETTERS_ENABLED && sinceEnd >= OFFER_D5_FROM_MS && sinceEnd < OFFER_D10_FROM_MS\) \{\s*return \{ \.\.\.postBase, kind: 'expired_offer_d5' \}/.test(lc))
checa('a janela D10 só devolve expired_lastcall_d10 com o interruptor ligado', /if \(POST_TRIAL_LETTERS_ENABLED && sinceEnd >= OFFER_D10_FROM_MS && sinceEnd < OFFER_D10_TO_MS\) \{\s*return \{ \.\.\.postBase, kind: 'expired_lastcall_d10' \}/.test(lc))
checa('nenhum outro caminho devolve os dois kinds', (lc.match(/kind: 'expired_offer_d5'/g) || []).length === 1 && (lc.match(/kind: 'expired_lastcall_d10'/g) || []).length === 1)
checa('downgraded_loss (primeiras 48 h) continua ANTES e sem interruptor', /if \(sinceEnd < DOWNGRADED_LOSS_TO_MS\) \{\s*const lost = status === 'downgraded'/.test(lc) && lc.indexOf("kind: 'downgraded_loss'") < lc.indexOf("kind: 'expired_offer_d5'"))
checa('d0_welcome, ending_soon e trial_extended continuam selecionáveis (sem interruptor)', /kind: 'd0_welcome'/.test(lc) && /kind: 'ending_soon'/.test(lc) && /kind: 'trial_extended'/.test(lc) && !/POST_TRIAL_LETTERS_ENABLED && [^\n]*(d0_welcome|ending_soon|trial_extended)/.test(lc))
checa('mutante (interruptor true) é detectável: o texto da decisão depende da constante', /POST_TRIAL_LETTERS_ENABLED &&/.test(lc))

console.log(`test-cartas-pos-morte-desligadas-2026-09-24: ${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  FAIL ' + f)
process.exit(falhas.length ? 1 : 0)

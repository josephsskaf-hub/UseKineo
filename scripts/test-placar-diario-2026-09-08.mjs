// KINEO-PLACAR-B-DIARIO-2026-09-08 — guardião: uma função de funil, dois leitores, um cron.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }

console.log('== a função, executada ==')
const exp = {}
vm.runInNewContext(ts.transpileModule(rd('lib/admin/versaoBFunnel.ts'), { compilerOptions: { module: 1, target: 9 } }).outputText, { exports: exp, require: () => { throw new Error('puro') } })
const F = exp
const ext = new Set(['u1', 'u2', 'u3'])
const t0 = Date.parse('2026-09-08T10:00:00Z')
const ev = (name, user_id, metadata = null, offsetMin = 0) => ({ name, user_id, created_at: new Date(t0 + offsetMin * 60000).toISOString(), metadata })
const rows = [
  ev('card_entry_required', 'u1'), ev('card_entry_required', 'u2'), ev('card_entry_required', 'interno'),
  ev('card_entry_banner_shown', 'u1'), ev('card_entry_banner_shown', 'u1', null, 5), ev('card_entry_banner_shown', 'u2'),
  ev('card_entry_banner_clicked', 'u1'),
  ev('checkout_started', 'u1', { intent_campaign: 'card_entry' }), ev('checkout_started', 'u2', { intent_campaign: 'home_curated' }),
  ev('payment_success', 'u1', { card_trial: true }), ev('payment_success', 'u3', { card_trial: false, checkout_mode: 'subscription' }),
  ev('card_entry_resume_autostart', 'u1'),
  ev('subscription_invoice_paid', 'u1', { trial_conversion: true }, 7 * 24 * 60), ev('subscription_invoice_paid', 'u3', { trial_conversion: false }),
  ev('paywall_hit', 'u2'), ev('paywall_hit', 'u2', null, 1),
]
const f = F.funilVersaoB(rows, t0 - 1, ext)
checa('nasceram: 2 (interno fora)', f.signups === 2)
checa('viram: 2 pessoas (u1 duas vezes conta 1)', f.sawDoor === 2)
checa('clicaram: 1', f.clickedDoor === 1)
checa('checkout do $1: 1 (home_curated não conta)', f.checkout === 1)
checa('pagaram $1: 1 (assinatura direta do u3 não é o $1)', f.paid1 === 1)
checa('filme disparou: 1', f.autostart === 1)
checa('viraram no dia 8: 1 (renovação do u3 não conta)', f.converted === 1)
checa('bateram na porta: 1 pessoa (2 batidas)', f.paywallHits === 1)
const soDia = F.funilVersaoB(rows, t0 - 1, ext, t0 + 60 * 60000)
checa('janela [since, until) corta a conversão do dia 8', soDia.converted === 0 && soDia.paid1 === 1)
checa('linha de diário na ordem do funil', /nasceram 2 → viram 2 → clicaram 1 → checkout 1 → pagaram \$1 1 → filme 1 → viraram \(dia 8\) 1 · bateram na porta 1/.test(F.funilVersaoBLinha('x', f)))
checa('marco é 08/09 05:00 UTC', F.VERSAO_B_SINCE === '2026-09-08T05:00:00.000Z')

console.log('== dois leitores, uma função ==')
const page = rd('app/admin/overview/page.tsx')
checa('painel importa a função da lib (não tem cópia própria)', /from '@\/lib\/admin\/versaoBFunnel'/.test(page) && !/^function funilVersaoB\(/m.test(page))
const cron = rd('app/api/cron/placar-versao-b/route.ts')
checa('cron importa a mesma função', /funilVersaoB, funilVersaoBLinha, VERSAO_B_EVENT_NAMES, VERSAO_B_SINCE/.test(cron))
checa('cron fail-closed com CRON_SECRET', /if \(!cronSecret\) return false/.test(cron) && /status: 401/.test(cron))
checa('cron grava 1 linha por dia (idempotente)', /delete\(\)\.eq\('name', 'placar_versao_b_daily'\)\.contains\('metadata', \{ day \}\)/.test(cron) && /name: 'placar_versao_b_daily'/.test(cron))
checa('cron exclui contas internas', /isInternalEmail\(p\.email\)/.test(cron))
checa('cron registrado no vercel.json às 12:05 UTC (09:05 BRT)', /"path": "\/api\/cron\/placar-versao-b",\s*\n\s*"schedule": "5 12 \* \* \*"/.test(rd('vercel.json')))

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
console.log('OK — placar da versão B: uma função, dois leitores, um cron por dia')

#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// KINEO-REMEDIO-NUNCA-APERTADO-2026-09-08 — o reparo tem de DISPARAR sozinho
// ═══════════════════════════════════════════════════════════════════════════
// O QUE ESTE GUARDIÃO EXISTE PARA IMPEDIR, medido em 08/09 06:45 BRT:
// `app/api/admin/reconcile-dunning` nasceu em 07/09 com a decisão certa e
// ficou 24h sem rodar uma única vez — `subscription_access_restored_after_
// wrong_revoke` tinha ZERO linhas na história, e as duas assinaturas que a
// Stripe ainda cobrava seguiam `plan='free'`. A causa era o guard: só cookie
// de admin. Rota de admin que espera clique não dispara.
//
// Por isso as travas abaixo se amarram à CONDIÇÃO, não à redação:
//   · existe autorização por cron, e ela FALHA FECHADA sem a env;
//   · o guard de cookie está DENTRO do `if (!porCron)` — o cron pula o
//     cookie e mais nada;
//   · o `vercel.json` tem um cron que aponta para a rota **com
//     `confirm=APPLY`** — cron em dry-run não cura ninguém, que é
//     exatamente o defeito que estamos matando;
//   · a decisão continua vindo de `decideDunningReconcile` (o predicado do
//     cobrador não se redigita);
//   · crédito continua intocado — o update é de `plan` e `is_pro` e mais nada.
//
// Estilo: readFileSync + CONTAGEM. Nada de `assert` que morre na 1ª falha, e
// nada de import com alias `@/` (o node puro não resolve alias e o guardião
// morreria antes da 1ª verificação).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (p) => readFileSync(join(raiz, p), 'utf8')

const ROTA = 'app/api/admin/reconcile-dunning/route.ts'
const VERCEL = 'vercel.json'
const ACESSO = 'lib/billing/subscriptionAccess.ts'

/** Remove comentários para que a contagem não case com o texto que EXPLICA o
 *  conserto. (Armadilha registrada na madrugada #10: o guardião ficou vermelho
 *  por causa do próprio comentário do autor.) */
function semComentarios(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

let falhas = 0
let total = 0
const check = (nome, condicao) => {
  total += 1
  if (!condicao) {
    falhas += 1
    console.log(`  ✗ ${nome}`)
  }
}

const rota = ler(ROTA)
const rotaCode = semComentarios(rota)
const vercelRaw = ler(VERCEL)
const acesso = ler(ACESSO)

// ── A. A rota aceita gatilho automático, e falha fechada ───────────────────
check(
  'A1 · a rota define uma autorização por cron que lê CRON_SECRET',
  /function autorizadoPorCron\s*\([\s\S]{0,200}?process\.env\.CRON_SECRET/.test(rotaCode),
)
check(
  'A2 · sem a env, ninguém entra (fail-closed antes de comparar o header)',
  /CRON_SECRET[\s\S]{0,120}?if\s*\(\s*!\s*cronSecret\s*\)\s*return false/.test(rotaCode),
)
check(
  'A3 · a comparação é com o header authorization Bearer',
  /headers\.get\(\s*'authorization'\s*\)\s*===\s*`Bearer \$\{cronSecret\}`/.test(rotaCode),
)
check(
  'A4 · o GET calcula porCron ANTES de qualquer checagem de sessão',
  rotaCode.indexOf('const porCron = autorizadoPorCron(req)') > -1 &&
    rotaCode.indexOf('const porCron = autorizadoPorCron(req)') <
      rotaCode.indexOf('supabase.auth.getUser()'),
)
check(
  'A5 · o guard de cookie de admin está DENTRO do if (!porCron)',
  /if\s*\(\s*!porCron\s*\)\s*\{[\s\S]{0,400}?isAdminEmail\(user\.email\)[\s\S]{0,200}?403/.test(
    rotaCode,
  ),
)
check(
  'A6 · o cron pula o COOKIE e nada mais: isAdminEmail continua sendo chamado uma única vez',
  (rotaCode.match(/isAdminEmail\(/g) ?? []).length === 1,
)

// ── B. O gatilho existe no vercel.json e APLICA ───────────────────────────
let crons = []
let vercelOk = true
try {
  crons = JSON.parse(vercelRaw).crons ?? []
} catch {
  vercelOk = false
}
check('B1 · vercel.json continua sendo JSON válido', vercelOk)

const meu = crons.filter((c) => String(c?.path ?? '').includes('/api/admin/reconcile-dunning'))
check('B2 · existe EXATAMENTE um cron apontando para reconcile-dunning', meu.length === 1)
check(
  'B3 · esse cron carrega confirm=APPLY — cron em dry-run não cura ninguém',
  meu.length === 1 && /[?&]confirm=APPLY(\b|&|$)/.test(String(meu[0].path)),
)
check(
  'B4 · o schedule é um cron de 5 campos que roda de hora em hora',
  meu.length === 1 && /^\d{1,2} \* \* \* \*$/.test(String(meu[0].schedule ?? '')),
)
check(
  'B5 · todo cron do arquivo continua tendo path e schedule',
  crons.length > 0 && crons.every((c) => typeof c?.path === 'string' && typeof c?.schedule === 'string'),
)
// O minuto é escolhido para não empilhar com os que já existem. Não é
// correção nem supressão (esta rota não manda e-mail), é só carga.
const meuMinuto = meu.length === 1 ? String(meu[0].schedule).split(' ')[0] : null
const outrosMinutos = crons
  .filter((c) => !String(c?.path ?? '').includes('/api/admin/reconcile-dunning'))
  .map((c) => String(c.schedule).split(' ')[0])
check(
  'B6 · o minuto escolhido não colide com nenhum outro cron de hora em hora',
  meuMinuto !== null && !outrosMinutos.includes(meuMinuto),
)

// ── C. A decisão NÃO foi redigitada, e crédito continua intocado ──────────
check(
  'C1 · quem decide continua sendo decideDunningReconcile, importado',
  /import\s*\{[\s\S]{0,200}?decideDunningReconcile[\s\S]{0,200}?\}\s*from\s*'@\/lib\/billing\/dunningReconcile'/.test(
    rotaCode,
  ),
)
check(
  'C2 · a rota não redigita a lista de status que dá acesso',
  !/'past_due'/.test(rotaCode) && !/'trialing'/.test(rotaCode),
)
check(
  'C3 · o restore só acontece com action === "restore" e tier presente',
  /if\s*\(\s*confirm\s*&&\s*decision\.action === 'restore'\s*&&\s*decision\.tier\s*\)/.test(rotaCode),
)
check(
  'C4 · o update continua sendo de DOIS campos: plan e is_pro',
  /\.update\(\s*\{\s*plan:\s*decision\.tier,\s*is_pro:\s*true\s*\}\s*\)/.test(rotaCode),
)
check(
  'C5 · crédito NUNCA é tocado nesta rota',
  !/video_credits/.test(rotaCode) && !/avatar_credits/.test(rotaCode),
)
check(
  'C6 · a rota não manda e-mail nem cria oferta',
  !/resend/i.test(rotaCode) && !/stripe\.checkout/i.test(rotaCode),
)

// ── D. A régua de acesso a montante continua conservadora ─────────────────
// Aqui o guardião EXECUTA o predicado real em vez de descrevê-lo por regex:
// o arquivo não tem import com alias, então o node o roda de verdade. Trava
// por nome de constante mente quando alguém renomeia; esta não.
const { stripeSubscriptionKeepsAccess } = await import('../lib/billing/subscriptionAccess.ts')
const DA_ACESSO = ['active', 'trialing', 'past_due']
const NEGA_ACESSO = ['unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'paused', '', null, undefined]
check(
  'D1 · unpaid/canceled/incomplete*/paused/lixo continuam SEM acesso (executado)',
  NEGA_ACESSO.every((s) => stripeSubscriptionKeepsAccess(s) === false),
)
check(
  'D2 · active/trialing/past_due continuam COM acesso (executado)',
  DA_ACESSO.every((s) => stripeSubscriptionKeepsAccess(s) === true),
)
check(
  'D3 · past_due é o único status de cobrança que mantém acesso',
  /STRIPE_DUNNING_STATUSES = \['past_due'\] as const/.test(acesso),
)

// ── E. O trigger fica gravado, para distinguir cron de clique ─────────────
check(
  'E1 · a resposta diz se veio de cron ou de admin',
  /trigger:\s*porCron \? 'cron' : 'admin'/.test(rotaCode),
)
check(
  'E2 · o evento gravado carimba a origem (cron_reconcile vs admin_reconcile)',
  (rotaCode.match(/source:\s*porCron \? 'cron_reconcile' : 'admin_reconcile'/g) ?? []).length === 2,
)

console.log(
  falhas === 0
    ? `\n✅ ${total}/${total} verificações — o reparo de dunning tem gatilho e continua conservador`
    : `\n❌ ${falhas} de ${total} falharam`,
)
process.exit(falhas === 0 ? 0 : 1)

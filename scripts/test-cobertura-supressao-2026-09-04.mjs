#!/usr/bin/env node
// KINEO-COBERTURA-SUPRESSAO-2026-09-04 — o guardiao da regra que o proprio
// modulo de supressao escreveu e que nada obrigava a cumprir.
//
// A REGRA (lib/lifecycle/suppression.ts, palavras do proprio arquivo):
//   "Job novo que manda e-mail entra aqui no MESMO commit em que nasce."
//
// POR QUE ESTE TESTE EXISTE
// ─────────────────────────
// Ja aconteceu, esta documentado no proprio modulo: `admin/send-stalled-rescue`
// nasceu em 26/07 e NAO entrou na lista. Ficou DEZESSEIS DIAS invisivel para os
// outros jobs — "so nao queimou ninguem porque nunca chegou a rodar". Nenhum
// teste pegou isso, porque nenhum teste existia. Uma rota nova que manda e-mail
// e nao carimba uma coluna datada e um defeito SILENCIOSO: ninguem ve, ninguem
// loga, e a pessoa recebe dois e-mails nossos com minutos de diferenca.
//
// O QUE ESTE TESTE NAO FAZ
// ────────────────────────
// Nao altera comportamento de envio, nao suprime ninguem e nao decide politica.
// Ele congela o INVENTARIO medido em 04/09/2026 e reprova a DERIVA: rota nova
// sem classificacao, ou rota que perde cobertura sem alguem assumir a decisao.
//
// DUAS DIRECOES, QUE SAO DEFEITOS DIFERENTES
// ──────────────────────────────────────────
//   ENTRADA  (respeita): a rota chama `loadLifecycleSuppression` antes de
//            enviar — ela nao atropela quem acabou de receber outro e-mail.
//   SAIDA    (visivel):  a rota carimba uma coluna DATADA que o modulo le —
//            os outros jobs conseguem ver que ela enviou.
// Uma rota pode respeitar e ser invisivel (e o caso dos carimbos BOOLEANOS,
// propriedade nº1 documentada no modulo: boolean carrega o "se", nunca o
// "quando"). A saida e a direcao que protege o cliente dos OUTROS jobs.
//
// A CLASSE MAIS ALTA: ARMADA E INVISIVEL
// ──────────────────────────────────────
// Um cron ARMADO em vercel.json dispara sozinho, sem ninguem olhando. Se ele
// tambem for invisivel, ele cala ninguem e ninguem o ve. Rota admin invisivel e
// risco MANUAL (alguem precisa clicar); cron armado invisivel e risco
// AUTOMATICO. O teste separa as duas coisas de proposito.

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const RAIZ = process.cwd()
const p = (...s) => join(RAIZ, ...s)
const ler = (f) => readFileSync(p(f), 'utf8')

let ok = 0
let falhas = 0
const check = (nome, cond, detalhe = '') => {
  if (cond) {
    ok++
    console.log(`  ok  ${nome}`)
  } else {
    falhas++
    console.log(`  FALHA  ${nome}${detalhe ? `\n         ${detalhe}` : ''}`)
  }
}

console.log('\n=== 1. O modulo de supressao continua sendo a fonte da verdade ===')

const MOD = 'lib/lifecycle/suppression.ts'
check('1.1 lib/lifecycle/suppression.ts existe', existsSync(p(MOD)))
const mod = ler(MOD)

// A lista viva de colunas datadas. Extraida do codigo, nunca copiada a mao:
// copiar seria criar uma segunda verdade que apodrece sozinha.
const blocoCols = mod.match(/const PROFILE_TIMESTAMP_COLUMNS = \[([\s\S]*?)\] as const/)
check('1.2 PROFILE_TIMESTAMP_COLUMNS e extraivel do codigo', !!blocoCols)

const COLUNAS_DATADAS = blocoCols
  ? [...blocoCols[1].matchAll(/^\s*'([a-z_]+)',/gm)].map((m) => m[1])
  : []

check(
  '1.3 a lista tem as 8 colunas datadas conhecidas',
  COLUNAS_DATADAS.length === 8,
  `extraidas: ${COLUNAS_DATADAS.length} -> ${COLUNAS_DATADAS.join(', ')}`,
)

// Sanidade da propria extracao: se o regex apodrecer, tudo abaixo vira verde
// vazio. Uma coluna conhecida precisa estar la.
check(
  '1.4 sanidade da extracao (cap_hit_sent_at presente)',
  COLUNAS_DATADAS.includes('cap_hit_sent_at'),
  `lista extraida: ${COLUNAS_DATADAS.join(', ') || '(vazia)'}`,
)

// Os tres ledgers extras que o modulo consulta alem de profiles.
check('1.5 o modulo le trial_emails_log', mod.includes("from('trial_emails_log')"))
check('1.6 o modulo le checkout_abandoned', mod.includes("from('checkout_abandoned')"))
check(
  '1.8 o modulo le email_send_log (ledger do #12) e filtra ok e yielded',
  mod.includes("from('email_send_log')") && /'ok'/.test(mod) && /yielded/.test(mod),
  'sem os dois filtros, recusa do Resend e cessao de cota virariam mordaca de 24h',
)
check(
  '1.7 o modulo NAO le a tabela events',
  !/\.from\('events'\)/.test(mod),
  'se passar a ler events, os crons de STAMP em events viram visiveis e este inventario muda',
)

console.log('\n=== 2. Inventario das rotas que mandam e-mail (medido 04/09/2026) ===')

// Descoberta no disco, nunca uma lista fixa: rota nova aparece sozinha aqui e
// cai no teste de deriva do bloco 4.
const descobrir = () => {
  const achadas = []
  for (const base of ['app/api/cron', 'app/api/admin']) {
    if (!existsSync(p(base))) continue
    for (const nome of readdirSync(p(base))) {
      const rota = `${base}/${nome}`
      if (!existsSync(p(rota, 'route.ts'))) continue
      if (!nome.startsWith('send-') && nome !== 'trial-lifecycle-emails') continue
      achadas.push(rota)
    }
  }
  return achadas.sort()
}

const ROTAS = descobrir()
check('2.1 encontrou rotas de envio no disco', ROTAS.length >= 30, `achou ${ROTAS.length}`)

// Classificacao lida do arquivo REAL de cada rota.
const classificar = (rota) => {
  const src = ler(join(rota, 'route.ts'))
  const envia = /api\.resend\.com|resend\.emails\.send/.test(src)
  const delega = /import\s*\{[^}]*\bGET as \w+[^}]*\}\s*from\s*'@\/app\/api\/(admin|cron)\/send-/.test(src)
  const respeita = src.includes('loadLifecycleSuppression')
  // KINEO-SUPPRESSION-LEDGER-2026-09-04 (#12/global #28, sessao paralela): o
  // modulo passou a ler `email_send_log`, escrito centralmente por
  // lib/email/quota.ts. Quem passa pelo helper de cota fica visivel SEM
  // carimbar coluna nenhuma — foi assim que o send-hotlead-blast saiu da
  // invisibilidade sem ganhar coluna.
  const viaLedger = src.includes('email/quota')
  const visivel =
    COLUNAS_DATADAS.some((c) => src.includes(c)) ||
    src.includes('trial_emails_log') ||
    src.includes('recovery_sent_at') ||
    viaLedger
  const morta = /status:\s*410/.test(src)
  return { envia, delega, respeita, visivel, morta }
}

const estado = new Map(ROTAS.map((r) => [r, classificar(r)]))

// ── INVENTARIO CONGELADO ──────────────────────────────────────────────────
// Cada rota que envia e NAO e visivel precisa de uma linha aqui, com o motivo.
// Isto nao e uma lista de perdao: e o registro de quem assumiu a decisao.
const INVISIVEIS_CONHECIDAS = {
  // Crons ARMADOS em vercel.json. Cada um tem protecao PROPRIA (dedupe em
  // `events`, boolean vitalicio), mas nenhum aparece para os outros 12 jobs.
  // Como o modulo NAO le `events` (check 1.7), o carimbo deles e invisivel.
  'app/api/cron/send-blackout-winback': 'dedupe proprio de 7d em events + cede 45min ao recovery; invisivel para os outros',
  'app/api/cron/send-failure-recovery': 'dedupe proprio via STAMP em events; invisivel para os outros',
  'app/api/cron/send-momentum-nudge': 'dedupe proprio via STAMP em events; invisivel para os outros',
  'app/api/cron/send-trial-eve-notice': 'dedupe proprio via STAMP em events; invisivel para os outros',
  'app/api/cron/send-oneoff-unlock': 'boolean vitalicio oneoff_unlock_emailed; boolean nao carrega o "quando"',
  // Rotas admin: exigem clique humano, risco MANUAL e nao automatico.
  'app/api/admin/send-abandon-recovery': 'boolean abandon_emailed (propriedade nº1 do modulo)',
  'app/api/admin/send-free-upsell': 'boolean free_upsell_emailed (propriedade nº1 do modulo)',
  'app/api/admin/send-avatar-launch': 'campanha manual, boolean avatar_launch_emailed',
  'app/api/admin/send-checkout-rescue': 'campanha manual, boolean checkout_rescue_emailed',
  'app/api/admin/send-comeback50': 'campanha manual de disparo unico',
  'app/api/admin/send-day19-creator20': 'campanha manual, booleans',
  'app/api/admin/send-dfy-offer': 'campanha manual, boolean dfy_offer_emailed',
  'app/api/admin/send-feature-announce': 'campanha manual, boolean feature_announce_emailed',
  'app/api/admin/send-first50-quentes': 'campanha manual, boolean',
  'app/api/admin/send-hot-upsell': 'campanha manual',
  'app/api/admin/send-made-video-today': 'campanha manual, booleans',
  'app/api/admin/send-pack-offer': 'campanha manual, boolean pack_offer_emailed',
  'app/api/admin/send-subscriber-idle': 'campanha manual',
  'app/api/admin/send-winback-25': 'campanha manual, disparo por link do fundador',
}

// Rotas que NAO enviam: precisam de motivo, senao um "nao envia" por engano
// (import quebrado, refactor) passa despercebido como se fosse seguro.
const NAO_ENVIAM = {
  'app/api/cron/send-stalled-rescue': 'INVOLUCRO: delega para admin/send-stalled-rescue, que respeita e e visivel',
  'app/api/admin/send-india-price': 'ARQUIVADA: responde 410 GONE desde KINEO-PRICING-V6-2026-08-19',
}

for (const [rota, motivo] of Object.entries(NAO_ENVIAM)) {
  const e = estado.get(rota)
  check(
    `2.2 ${rota.replace('app/api/', '')} continua sem enviar direto`,
    e && !e.envia,
    `motivo registrado: ${motivo}`,
  )
}

// As duas afirmacoes acima precisam ser verdadeiras pelo MECANISMO, nao so pela
// ausencia de resend: um involucro que pare de delegar, ou uma rota morta que
// reviva, sao exatamente os casos que este teste existe para pegar.
check(
  '2.3 cron/send-stalled-rescue realmente delega para a rota admin',
  estado.get('app/api/cron/send-stalled-rescue')?.delega === true,
  'se parar de delegar, ele passa a ser um cron ARMADO sem cobertura nenhuma',
)
check(
  '2.4 admin/send-india-price continua respondendo 410',
  estado.get('app/api/admin/send-india-price')?.morta === true,
  'se reviver, ela volta a ser a unica rota sem guarda de opt-out',
)

console.log('\n=== 3. Crons ARMADOS em vercel.json: risco automatico, nao manual ===')

const vercel = JSON.parse(ler('vercel.json'))
const armados = new Set(
  (vercel.crons ?? []).map((c) => String(c.path).split('?')[0].replace(/^\/api\//, 'app/api/')),
)

check('3.1 vercel.json declara crons', armados.size > 0, `${armados.size} caminhos armados`)

const armadasInvisiveis = ROTAS.filter(
  (r) => armados.has(r) && estado.get(r).envia && !estado.get(r).visivel,
)

// Este numero e o placar da rotacao #25. Ele NAO deve subir sem decisao humana:
// cada unidade e um job que dispara sozinho e cujo envio nenhum outro job ve.
const ARMADAS_INVISIVEIS_ESPERADAS = 5
check(
  `3.2 exatamente ${ARMADAS_INVISIVEIS_ESPERADAS} rotas ARMADAS e invisiveis (04/09, ja com o ledger do #12)`,
  armadasInvisiveis.length === ARMADAS_INVISIVEIS_ESPERADAS,
  `agora sao ${armadasInvisiveis.length}: ${armadasInvisiveis.map((r) => r.replace('app/api/', '')).join(', ')}`,
)

// Toda armada-invisivel tem de estar no inventario com motivo escrito.
for (const rota of armadasInvisiveis) {
  check(
    `3.3 ${rota.replace('app/api/', '')} esta no inventario com motivo`,
    !!INVISIVEIS_CONHECIDAS[rota],
    'cron armado invisivel SEM motivo registrado — ou carimba coluna datada, ou assume a decisao aqui',
  )
}

console.log('\n=== 4. Deriva: rota nova ou cobertura perdida em silencio ===')

const enviam = ROTAS.filter((r) => estado.get(r).envia)
const invisiveis = enviam.filter((r) => !estado.get(r).visivel)

for (const rota of invisiveis) {
  check(
    `4.1 ${rota.replace('app/api/', '')} classificada no inventario`,
    !!INVISIVEIS_CONHECIDAS[rota],
    'ROTA QUE ENVIA E NINGUEM VE. Foi assim que send-stalled-rescue ficou 16 dias invisivel. ' +
      'Carimbe uma coluna de PROFILE_TIMESTAMP_COLUMNS, ou registre o motivo em INVISIVEIS_CONHECIDAS.',
  )
}

// A direcao inversa: uma rota listada como invisivel que passou a carimbar e
// boa noticia — mas o inventario tem de acompanhar, senao ele vira folclore.
const listadasQueAgoraVeem = Object.keys(INVISIVEIS_CONHECIDAS).filter(
  (r) => estado.get(r)?.visivel === true,
)
check(
  '4.2 nenhuma rota do inventario passou a ser visivel sem sair da lista',
  listadasQueAgoraVeem.length === 0,
  `saiu(ram) da invisibilidade: ${listadasQueAgoraVeem.join(', ')} — remova do inventario`,
)

// E o inventario nao pode citar rota que nao existe mais.
const fantasmas = [...Object.keys(INVISIVEIS_CONHECIDAS), ...Object.keys(NAO_ENVIAM)].filter(
  (r) => !estado.has(r),
)
check('4.3 o inventario nao cita rota inexistente', fantasmas.length === 0, `fantasmas: ${fantasmas.join(', ')}`)

console.log('\n=== 5. As 12 rotas cobertas continuam cobertas ===')

// Regressao pura: quem hoje respeita a janela nao pode deixar de respeitar sem
// que alguem veja. Lista medida em 04/09/2026.
const RESPEITAM_HOJE = [
  'app/api/cron/send-activation-nudge',
  'app/api/cron/send-cap-hit',
  'app/api/cron/send-credits-back',
  'app/api/cron/send-post-nudge',
  'app/api/cron/send-recovery',
  'app/api/cron/send-reminders',
  'app/api/cron/send-video-ready',
  'app/api/cron/send-video-rescue',
  'app/api/cron/trial-lifecycle-emails',
  'app/api/admin/send-abandon-recovery',
  'app/api/admin/send-free-upsell',
  'app/api/admin/send-hotlead-blast',
  'app/api/admin/send-stalled-rescue',
]

for (const rota of RESPEITAM_HOJE) {
  check(
    `5.1 ${rota.replace('app/api/', '')} ainda chama loadLifecycleSuppression`,
    estado.get(rota)?.respeita === true,
    'perdeu a chamada da supressao — atropela quem acabou de receber outro e-mail',
  )
}

// As duas janelas curtas sao DELIBERADAS e documentadas. Se alguem "padronizar"
// tudo em 24h, o e-mail de quem abriu checkout volta a morrer de inanicao
// (KINEO-RECOVERY-STARVATION-2026-08-13). Congelado aqui de proposito.
check(
  '5.2 HOT_LEAD_SUPPRESSION_HOURS = 4 continua existindo',
  /export const HOT_LEAD_SUPPRESSION_HOURS = 4/.test(mod),
  'janela curta do send-recovery: sem ela, 2 colisoes fecham a janela de 48h e o lead morre',
)
check(
  '5.3 admin/send-stalled-rescue mantem a janela curta de 4h',
  /RESCUE_SUPPRESSION_HOURS = 4/.test(ler('app/api/admin/send-stalled-rescue/route.ts')),
)
check(
  '5.4 LIFECYCLE_SUPPRESSION_HOURS = 24 continua sendo o default',
  /export const LIFECYCLE_SUPPRESSION_HOURS = 24/.test(mod),
)

console.log(`\n${'='.repeat(64)}`)
console.log(`RESULTADO: ${ok} ok, ${falhas} falha(s)`)
if (armadasInvisiveis.length > 0) {
  console.log(
    `\nARMADOS E INVISIVEIS (${armadasInvisiveis.length}) — disparam sozinhos e nenhum outro job os ve:`,
  )
  for (const r of armadasInvisiveis) console.log(`  · ${r.replace('app/api/', '')}`)
  console.log('\nIsto e um INVENTARIO, nao um alarme: cada um tem dedupe proprio.')
  console.log('A decisao de traze-los para a janela de 24h e humana — ver o diario da #13 (global #29).')
}
console.log('='.repeat(64))

process.exit(falhas === 0 ? 0 : 1)

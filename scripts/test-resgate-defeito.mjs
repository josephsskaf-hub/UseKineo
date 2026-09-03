#!/usr/bin/env node
// ═══ KINEO-RESGATE-DEFEITO-2026-09-03 (sprint-assinaturas #6) ═══════════════
//
// O CASO. `app/api/cron/send-failure-recovery` existe desde 21/08 para uma
// coisa: pedir desculpa a quem tentou fazer um filme, foi derrubado por um
// defeito NOSSO e foi embora sem nada. Medido em producao hoje (03/09):
//
//   · `failure_recovery_sent` tem OITO envios na historia inteira;
//   · os OITO sao `kind='script_short'` (o e-mail de roteiro curto);
//   · o e-mail de DEFEITO — a razao de o arquivo existir — NUNCA saiu;
//   · enquanto isso, 35 pessoas em 30 dias tiveram credito debitado, render
//     morto, estorno automatico e ZERO filmes na vida.
//
// DUAS CAUSAS, as duas provadas aqui com o texto REAL do banco:
//
//  1. O fragmento solto `'credits'` em NAO_E_BUG. Toda mensagem de erro da
//     casa termina dizendo que o credito voltou — inclusive as duas em que o
//     produto ASSUME a culpa ("this is on our side, not yours"). O cron lia
//     as proprias confissoes como "o produto disse nao corretamente".
//
//  2. So o NAVEGADOR era lido (`generate_failed` + `generation_stage_error`).
//     Quinze das 35 pessoas nao tem UM evento de navegador na vida: o render
//     delas morreu no servidor depois que a aba fechou, e quem registrou o
//     desfecho foi a varredura de estorno. Para essas quinze o cron era cego
//     por construcao.
//
// O QUE ESTE TESTE PROVA, compilando o codigo REAL da rota:
//   1. as 11 mensagens de DEFEITO de producao entram na lista;
//   2. as 10 recusas LEGITIMAS de producao continuam fora;
//   3. a confissao explicita vence NAO_E_BUG, e capacidade continua fora;
//   4. a terceira fonte (estorno do servidor) esta ligada e mapeada;
//   5. a janela e parametro com teto, e o cron do vercel.json segue em 48h;
//   6. falha velha (>7d) perde a frase "it is fixed now";
//   7. os guarda-corpos de 21/08 e #5 seguem de pe (1x por pessoa, opt-out,
//      quem ja tem video sai, confirm=SEND obrigatorio, sem cupom/preco).
//
// Rodar: node scripts/test-resgate-defeito.mjs   (sem rede, sem custo)

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROTA = 'app/api/cron/send-failure-recovery/route.ts'
const src = readFileSync(join(raiz, ROTA), 'utf8')
let ok = 0
const falhas = []
function v(nome, cond) {
  if (cond) { ok++; return }
  falhas.push(nome)
  console.error('  FALHOU: ' + nome)
}

function acharTsc(base) {
  let dir = base
  for (let i = 0; i < 6; i++) {
    const t = join(dir, 'node_modules', 'typescript', 'bin', 'tsc')
    if (existsSync(t)) return t
    const pai = dirname(dir)
    if (pai === dir) break
    dir = pai
  }
  console.error('Nao achei o typescript. Rode `npm install` na pasta do projeto.')
  process.exit(1)
}

// ── recorta do arquivo REAL as pecas puras e as compila de verdade ─────────
// Nada de copiar a lista para dentro do teste: se alguem mudar a rota, este
// arquivo tem de sentir. O recorte vai do inicio de NAO_E_BUG ate o inicio de
// classifyFailure, que e exatamente a fronteira da decisao.
const ini = src.indexOf('const NAO_E_BUG = [')
const fimMarca = src.indexOf('function classifyFailure')
v('as pecas da decisao existem no arquivo real', ini > 0 && fimMarca > ini)
const recorte = src.slice(ini, fimMarca)
v('o recorte traz NAO_E_BUG, DEFEITO_EXPLICITO, o marcador e ehDefeito',
  /const NAO_E_BUG = \[/.test(recorte) && /const DEFEITO_EXPLICITO = \[/.test(recorte) &&
  /const SERVER_REFUND_MARK = /.test(recorte) && /function ehDefeito\(/.test(recorte))

const saida = mkdtempSync(join(tmpdir(), 'kineo-defeito-'))
const requerer = createRequire(join(saida, 'x.cjs'))
mkdirSync(join(saida, 'src'), { recursive: true })
writeFileSync(
  join(saida, 'src', 'decisao.ts'),
  recorte + '\nexport { NAO_E_BUG, DEFEITO_EXPLICITO, DEFECT_REFUND_REASONS, SERVER_REFUND_MARK, ehDefeito }\n',
)
execFileSync(process.execPath, [
  acharTsc(raiz), join(saida, 'src', 'decisao.ts'),
  '--outDir', join(saida, 'out'), '--module', 'commonjs', '--target', 'es2022',
  '--moduleResolution', 'node', '--skipLibCheck', '--strict', '--rootDir', join(saida, 'src'),
], { stdio: 'pipe' })
writeFileSync(join(saida, 'out', 'package.json'), JSON.stringify({ type: 'commonjs' }))
const D = requerer(join(saida, 'out', 'decisao.js'))

// ═══ 1) AS MENSAGENS DE DEFEITO DE PRODUCAO ════════════════════════════════
// Todas lidas de events.metadata->>'error' (generate_failed +
// generation_stage_error), contas externas, 30 dias, em 03/09/2026.
console.log('\n1) DEFEITO REAL: as mensagens em que a culpa e nossa')
const DEFEITO = [
  ['fornecedor recusou (a confissao explicita)',
    'Our video provider did not accept the job — this is on our side, not yours. Nothing started, your credits were refunded automatically, and the team was alerted. Please try again in a moment.'],
  ['geracao travou e foi encerrada por nos',
    'This generation stopped responding and we ended it here instead of leaving you waiting. Your credits are being returned automatically — nothing was lost. You can start a new video now.'],
  ['JWT-skew de 28/08', 'Your video access could not be verified. Nothing was submitted. Please retry.'],
  ['clipes x claim assinado', 'These AI clips do not match their signed generation.'],
  ['analyze morreu', 'Could not analyze that idea. Please try again.'],
  ['analyze morreu (2a redacao)', 'Could not analyze topic. Please try again.'],
  ['ReferenceError vazado para o cliente', 'Could not assemble the render: ent is not defined'],
  ['voz nao persistiu', 'Could not store the voiceover. Please try again.'],
  ['despacho para a fal falhou', 'Could not submit clips to AI generator. Please try again.'],
  ['generation id trocado', 'generation id belongs to a different cinematic request'],
  ['estorno do servidor (sem texto nenhum)', D.SERVER_REFUND_MARK],
]
v('as 11 mensagens de defeito medidas estao no teste', DEFEITO.length === 11)
for (const [nome, msg] of DEFEITO) v('defeito entra: ' + nome, D.ehDefeito(msg) === true)

// As DUAS primeiras sao o coracao da rodada: elas contem a palavra "credits"
// e por isso eram descartadas pelo fragmento solto.
v('as duas confissoes contem a palavra que as excluia',
  DEFEITO[0][1].includes('credits') && DEFEITO[1][1].includes('credits'))
v('e mesmo assim entram hoje', D.ehDefeito(DEFEITO[0][1]) && D.ehDefeito(DEFEITO[1][1]))

// ═══ 2) AS RECUSAS LEGITIMAS ═══════════════════════════════════════════════
console.log('\n2) O PRODUTO DIZENDO "NAO" CORRETAMENTE: continua fora')
const NAO = [
  ['credito preso por render vivo (#5)',
    "A video you already started is still holding 15 credits. If it doesn't finish, they come back automatically within the hour — your trial is still running."],
  ['motor de plano pago', 'AI Generated videos are on the paid plans. Upgrade to use the AI engine.'],
  ['capacidade do fornecedor',
    'Kineo is at full capacity right now — the team was automatically alerted and is adding capacity. Your free videos and credits are untouched. Please try again in a little while.'],
  ['motor fora do trial', 'Kling, Veo and Hollywood are Studio engines — not included in your trial. Upgrade to unlock them.'],
  ['alta demanda (2a redacao de capacidade)',
    "We're experiencing high demand right now. Nothing started and your credits were refunded automatically."],
  ['trial sem saldo para o motor', 'Your trial has 25 credits left and an AI video needs 38. Add a plan to keep the AI engine.'],
  ['extrato puro', 'This needs 20 credits. You have 0.'],
  ['trial gasto ate o fim', "You've used all 25 credits from your trial."],
  ['teto diario do free', 'no_detail:compose_daily_free_limit|stage=clips_ready|http=402'],
  ['pessoa real no prompt', "Kineo can't depict real people in AI video. Try a different idea."],
  // As quatro redacoes de saldo curto que existem no CODIGO e que nunca
  // apareceram nos 30 dias de eventos — achadas com grep em app/api, nao
  // adivinhadas. Sao a razao de o fragmento `'credits'` existir, e o motivo
  // de a troca ter de ser por frase e nao por remocao.
  ['motor de IA sem saldo', 'AI Generated needs 20 credits. You have 5.'],
  ['Kineo 1 sem saldo', 'Fast needs 1 credit. You have 0. Upgrade or renew to keep creating clean exports.'],
  ['outro render ja reserva parte', 'This generation needs 20 credits. Other active renders already reserve part of your balance. You have 12 available.'],
  ['saldo mudou no meio', 'This generation needs 20 credits. Your available balance changed before it could start.'],
  ['animar foto sem saldo', 'Animating a photo costs 6 credits. You have 2.'],
  ['redacao curta e generica', 'Not enough credits.'],
]
v('as 16 recusas legitimas medidas estao no teste', NAO.length === 16)
for (const [nome, msg] of NAO) v('recusa legitima fica fora: ' + nome, D.ehDefeito(msg) === false)

console.log('\n3) A ORDEM DA DECISAO')
// A confissao vence a lista de recusas, mesmo que a frase tenha as duas coisas.
v('confissao explicita vence NAO_E_BUG na mesma frase',
  D.ehDefeito('Your trial has 25 credits left — but this is on our side, not yours.') === true)
// Capacidade e do nosso lado E MESMO ASSIM fica fora: "it is fixed now" seria
// mentira. Decisao herdada do #5, agora com as duas redacoes.
v('capacidade nao virou confissao por engano',
  !D.DEFEITO_EXPLICITO.some((f) => NAO[2][1].toLowerCase().includes(f.toLowerCase())) &&
  !D.DEFEITO_EXPLICITO.some((f) => NAO[4][1].toLowerCase().includes(f.toLowerCase())))
v('mensagem vazia nunca e defeito', D.ehDefeito('') === false && D.ehDefeito(null) === false && D.ehDefeito(undefined) === false)
v('o fragmento solto "credits" nao esta mais na lista', !D.NAO_E_BUG.includes('credits'))
v('as frases inteiras de saldo estao',
  ['This needs', 'This generation needs', 'credits. You have', 'credit. You have', 'Not enough credits',
   'No credits remaining', 'used all', 'trial has', 'Add a plan'].every((f) => D.NAO_E_BUG.includes(f)))
// A trava contra o erro OPOSTO: nenhuma frase de saldo pode engolir uma
// confissao de defeito. As mensagens de estorno da casa ("Your credits were
// refunded automatically") NAO podem casar com nenhuma delas.
for (const defeitoComCredito of [
  'All AI clips failed. Your credits were refunded automatically.',
  'Could not build the scene. Try again or simplify the description. Your credits were refunded automatically.',
  'Scene was built but could not be saved. Your credits were refunded automatically — please try again.',
  'Your credit balance could not be verified. Nothing was submitted. Please retry.',
  'Your credit reservation could not be verified. Nothing was submitted.',
  'We could not confirm your credit charge, so this clip was not started on your account. You were not charged — please try again.',
]) v('defeito que fala de credito continua defeito: "' + defeitoComCredito.slice(0, 38) + '"', D.ehDefeito(defeitoComCredito) === true)
v('as duas redacoes de capacidade estao', D.NAO_E_BUG.includes('full capacity') && D.NAO_E_BUG.includes('high demand right now'))
v('o guarda do #5 (credito preso) sobreviveu', D.NAO_E_BUG.includes('still holding') && D.NAO_E_BUG.includes('already started is still'))

// ═══ 4) A TERCEIRA FONTE ═══════════════════════════════════════════════════
console.log('\n4) O ESTORNO DO SERVIDOR: as 15 pessoas invisiveis')
v('as razoes de estorno por defeito sao as duas medidas em producao',
  D.DEFECT_REFUND_REASONS.length === 2 &&
  D.DEFECT_REFUND_REASONS.includes('cinematic_abandoned_no_delivery') &&
  D.DEFECT_REFUND_REASONS.includes('pending_orphan_no_dispatch'))
v('a rota consulta credits_refunded', /\.eq\('name', 'credits_refunded'\)/.test(src))
// A razao e filtrada em CODIGO de proposito: filtro de jsonb que o PostgREST
// nao entenda devolve lista vazia sem erro, e uma fonte que falha em silencio
// mantém as 15 pessoas invisiveis com o cron parecendo saudavel.
v('filtrando pelas razoes de defeito, em codigo',
  /DEFECT_REFUND_REASONS\.includes\(String\(\(e\.metadata as \{ reason\?: unknown \} \| null\)\?\.reason \?\? ''\)\)/.test(src) &&
  !/\.in\('metadata->>reason'/.test(src))
v('e as tres fontes entram no mesmo `todas`', /\.\.\.\(\(falhas \?\? \[\]\) as Falha\[\]\)[\s\S]{0,160}\.\.\.doServidor,/.test(src))
v('o estorno vira falha com o marcador, nunca com texto inventado',
  /error: SERVER_REFUND_MARK, reason: SERVER_REFUND_MARK/.test(src))
v('o marcador nao passa pelas regex de roteiro (nao vira script_short/long)',
  /if \(erro === SERVER_REFUND_MARK\) return \{ kind: 'bug' \}/.test(src))
v('a fonte fica no carimbo, para medir a cegueira de antes',
  /fonte: a\.fonte/.test(src) && /doServidor \? 'servidor' : 'navegador'/.test(src))
v('o dry-run mostra by_source', /by_source: \{/.test(src))

// ═══ 5) A JANELA ═══════════════════════════════════════════════════════════
console.log('\n5) A JANELA E PARAMETRO, COM TETO')
v('le ?hours', /searchParams\.get\('hours'\)/.test(src))
v('padrao 48h', /\?\? '48'/.test(src))
v('teto de 720h e piso de 1h', /Math\.min\(720, Math\.max\(1, Math\.round\(horasPedidas\)\)\)/.test(src))
v('valor ilegivel volta para 48', /Number\.isFinite\(horasPedidas\) \?[\s\S]{0,120}: 48/.test(src))
v('a janela entra no `desde`', /const desde = new Date\(Date\.now\(\) - horas \* 3600_000\)/.test(src))
const vercel = readFileSync(join(raiz, 'vercel.json'), 'utf8')
v('o cron do vercel.json NAO passa hours (segue em 48h)',
  /send-failure-recovery\?confirm=SEND"/.test(vercel) && !/send-failure-recovery[^"]*hours=/.test(vercel))

// ═══ 6) A COPY NAO PODE MENTIR ═════════════════════════════════════════════
console.log('\n6) FALHA VELHA PERDE A FRASE "it is fixed now"')
const bug = src.slice(src.indexOf('function buildEmail('), src.indexOf('export async function GET'))
v('buildEmail recebe staleDays com padrao 0', /function buildEmail\(userId: string, credits: number, staleDays = 0\)/.test(bug))
v('o corte e 7 dias', /const velho = staleDays > 7/.test(bug))
v('a versao recente mantem "it is fixed now"', /a bug on our side, and it is fixed now/.test(bug))
v('a versao velha NAO diz "it is fixed now"', !/velho[\s\S]{0,40}\?\s*'[^']*it is fixed now/.test(bug))
v('a versao velha assume o silencio em vez de esconder', /we went quiet, which was worse/.test(bug))
v('assunto proprio para a falha velha', /We broke your first Kineo video — and never told you/.test(src))
v('utm separada para medir a leva antiga', /failure_recovery_late/.test(bug))
v('nenhuma das duas versoes promete cupom, desconto ou preco', !/coupon|discount|% off|\$\d/.test(bug))
v('as duas versoes dizem que o credito nunca foi gasto', /were never spent/.test(bug))

// ═══ 7) OS GUARDA-CORPOS ═══════════════════════════════════════════════════
console.log('\n7) O QUE NAO PODE TER AFROUXADO')
v('confirm=SEND continua obrigatorio para enviar',
  /searchParams\.get\('confirm'\) === 'SEND'/.test(src) && /if \(!confirm\) \{/.test(src))
v('CRON_SECRET fail-closed', /if \(!isAuthorized\(req\)\) return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)/.test(src))
v('1x por pessoa para sempre', /if \(jaAvisado\.has\(id\)\) continue/.test(src))
v('quem ja tem video sai', /if \(jaTemVideo\.has\(id\)\) continue/.test(src))
v('opt-out e conta interna saem', /p\.email_opted_out \|\| isInternalOrJunk\(email\)/.test(src))
v('teto por rodada mantido', /const MAX_PER_RUN = 25/.test(src) && /alvos\.slice\(0, MAX_PER_RUN\)/.test(src))
v('rodape de descadastro em todo envio', /unsubscribeHeaders\(a\.id\)/.test(src))
v('a rota nao debita, nao estorna e nao concede credito',
  !/credit_debits|grantCredits|\.rpc\(/.test(src))
v('classifyFailure e ehDefeito continuam privadas (a rota so exporta o handler)',
  !/export function classifyFailure/.test(src) && !/export function ehDefeito/.test(src))

console.log(`\n${ok} ok, ${falhas.length} falhas`)
if (falhas.length) process.exit(1)

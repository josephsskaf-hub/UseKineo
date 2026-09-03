// sprint-assinaturas #15 — 02/09/2026 — o cron de resgate le as duas fontes,
// o erro MAIS RECENTE da pessoa decide o e-mail, e roteiro comprido
// (prompt_len > 5000) tem e-mail proprio. Reproduz o caso real de
// adrianwellsvadrian (27s/35s as 02:52 → 7x prompt_len=6228 ate 03:30 → recebeu
// "add 14 more words" as 06:00) executando o classificador e a agregacao
// extraidos do arquivo REAL da rota.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const R = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(join(R, 'app/api/cron/send-failure-recovery/route.ts'), 'utf8')
let ok = 0, bad = 0
const t = (name, cond) => { if (cond) { ok++; console.log('  ✓', name) } else { bad++; console.log('  ✗', name) } }

// ── (a) classificador executado com o codigo real (strip de tipos) ──────────
const grab = (start, end) => src.slice(src.indexOf(start), src.indexOf(end))
const consts = [
  src.match(/const RE_SCRIPT_SHORT =\s*\n?\s*\/.+\/i/)[0],
  src.match(/const RE_NARRATION_SHORT_CODE = .+/)[0],
  src.match(/const RE_PROMPT_LONG = .+/)[0],
  src.match(/const RE_PROMPT_LEN = .+/)[0],
  src.match(/const WORDS_PER_SEC = .+/)[0],
  src.match(/const PROMPT_MAX_CHARS_FALLBACK = .+/)[0],
  // #6: o classificador atalha no marcador do estorno do servidor antes de
  // qualquer regex de roteiro — sem a constante, ele nem roda.
  src.match(/const SERVER_REFUND_MARK = .+/)[0],
].join('\n')
const fnSrc = grab('function classifyFailure', '\n// #15: e-mail do roteiro COMPRIDO')
  .replace(/\(erro: string, meta\?: FalhaMeta\): \{[^}]*\}\s*\{/, '(erro, meta) {')
const classify = new Function(`${consts}\n${fnSrc}\nreturn classifyFailure`)()

const CURTO = 'Your script is about 27 seconds of narration, but you asked for a 35-second video — that would leave roughly 8 seconds of music with no story being told. Add about 14 more words.\n\n'
const LONGO = 'prompt_len=6228 limite=5000'
const c1 = classify(CURTO)
t('27s/35s continua script_short com 14 palavras', c1.kind === 'script_short' && c1.short.wordsMissing === 14)
const c2 = classify(LONGO, { reason: 'analyze_prompt_too_long', duration: 90 })
t('prompt_len=6228 limite=5000 → script_long', c2.kind === 'script_long')
t('script_long traz chars=6228, limit=5000, duracao=90', c2.long.chars === 6228 && c2.long.limit === 5000 && c2.long.durationSec === 90)
const c3 = classify('', { reason: 'analyze_prompt_too_long', duration: 35 })
t('reason analyze_prompt_too_long sem texto → script_long com fallback 5000', c3.kind === 'script_long' && c3.long.limit === 5000 && c3.long.chars === 0)
const c4 = classify('Prompt is too long (5,000 chars max). (prompt_len=7102)', {})
t('frase do servidor "Prompt is too long" → script_long com 7102', c4.kind === 'script_long' && c4.long.chars === 7102)
t('script_long sem duracao → durationSec null (nao inventa palavras)', classify(LONGO, {}).long.durationSec === null)
for (const bug of ['Voiceover generation failed. Please try again.', 'voiceover_script is required.', 'TypeError', 'Could not submit clips to AI generator. Please try again.'])
  t(`defeito real continua bug: "${bug.slice(0, 36)}"`, classify(bug, {}).kind === 'bug')
t('narration_too_short sem numeros continua script_short', classify('no_detail:narration_too_short|stage=failed|http=none', { reason: 'narration_too_short' }).kind === 'script_short')

// ── (b) agregacao: o erro mais recente decide ───────────────────────────────
const aggSrc = grab('  type Falha = {', '  if (porPessoa.size === 0) {')
  .replace(/type Falha = \{[^}]*\}\n/, '')
  .replace(/: Falha\[\]/g, '').replace(/as Falha\[\]/g, '')
  .replace(/new Map<[^>]*>\(\)/, 'new Map()')
  .replace(/\(f\.metadata \?\? \{\}\) as \{[^}]*\}/, '(f.metadata ?? {})')
  // #6: o filtro de razao do estorno carrega um cast proprio
  .replace(/\(e\.metadata as \{[^}]*\} \| null\)/g, '(e.metadata || {})')
// #6 (03/09): a decisao deixou de ser "a lista NAO_E_BUG" e virou a funcao
// `ehDefeito` (confissao explicita vence a lista; marcador do estorno do
// servidor e defeito por definicao). A agregacao passou a receber uma TERCEIRA
// fonte — os estornos por defeito, que sao os unicos eventos de quem fechou a
// aba antes do render morrer. O bloco de decisao inteiro entra aqui, extraido
// do arquivo real, para o teste continuar exercitando codigo e nao copia.
const decisaoSrc = [
  src.match(/const NAO_E_BUG = \[[\s\S]*?\n\]/)[0],
  src.match(/const DEFEITO_EXPLICITO = \[[\s\S]*?\n\]/)[0],
  src.match(/const DEFECT_REFUND_REASONS = .+/)[0],
  src.match(/const SERVER_REFUND_MARK = .+/)[0],
  grab('function ehDefeito', 'function classifyFailure')
    .replace('function ehDefeito(erro: string): boolean {', 'function ehDefeito(erro) {'),
].join('\n')
const agg = new Function('falhas', 'longas', 'estornos', `${decisaoSrc}\n${aggSrc}\nreturn porPessoa`)
const ev = (uid, name, created_at, metadata) => ({ user_id: uid, created_at, metadata, name })
// caso real: 02:52 curto (generate_failed) → 03:09..03:30 sete longos (stage_error)
const falhasAdrian = [ev('adrian', 'generate_failed', '2026-09-02T02:52:20Z', { error: CURTO, duration: 35 })]
const longasAdrian = [3, 9, 22, 27, 28, 28, 30].map((m, i) => ev('adrian', 'generation_stage_error', `2026-09-02T03:${String(m).padStart(2, '0')}:${10 + i}Z`, { error: LONGO, reason: 'analyze_prompt_too_long', duration: 90 }))
const r1 = agg(falhasAdrian, longasAdrian, [])
t('adrian: erro mais recente e o comprido (nao o curto das 02:52)', r1.get('adrian')?.erro === LONGO)
t('adrian: meta carrega reason + duration=90 do erro mais recente', r1.get('adrian')?.meta.reason === 'analyze_prompt_too_long' && r1.get('adrian')?.meta.duration === 90)
t('adrian: falhas contadas = 8 (1 + 7)', r1.get('adrian')?.n === 8)
t('adrian: classifica script_long a partir da agregacao', classify(r1.get('adrian').erro, r1.get('adrian').meta).kind === 'script_long')
// ordem invertida no array (longas chegam antes das falhas) nao muda o resultado
const r1b = agg(longasAdrian, falhasAdrian, [])
t('ordem de chegada das fontes nao importa (ordena por created_at)', r1b.get('adrian')?.erro === LONGO)
// so o comprido, sem generate_failed nenhum → agora e elegivel
const r2 = agg([], longasAdrian, [])
t('quem SO bateu no teto de 5000 (sem generate_failed) agora e elegivel', r2.get('adrian')?.n === 7)
// bug depois de "still holding" → ultimo e o bug → elegivel como bug
const r3 = agg([
  ev('u', 'generate_failed', '2026-09-02T01:00:00Z', { error: 'A video you already started is still holding 15 cr' }),
  ev('u', 'generate_failed', '2026-09-02T02:00:00Z', { error: 'Voiceover generation failed. Please try again.' }),
], [], [])
t('"still holding" no meio nao conta, bug depois conta: n=1 e erro=bug', r3.get('u')?.n === 1 && /Voiceover/.test(r3.get('u')?.erro))
// bug e depois "not enough credits" → ultimo nao e bug → SAI
const r4 = agg([
  ev('v', 'generate_failed', '2026-09-02T01:00:00Z', { error: 'Voiceover generation failed. Please try again.' }),
  ev('v', 'generate_failed', '2026-09-02T02:00:00Z', { error: 'Not enough credits. Add a plan to continue.' }),
], [], [])
t('ultimo erro "credits" → pessoa sai da lista (produto disse nao por ultimo)', !r4.has('v'))
const r5 = agg([ev('w', 'generate_failed', '2026-09-02T01:00:00Z', { error: 'Not enough credits' })], [], [])
t('so "credits" → nunca entra (n=0)', !r5.has('w'))
t('linha sem user_id e ignorada', !agg([ev(null, 'generate_failed', '2026-09-02T01:00:00Z', { error: 'TypeError' })], [], []).size)

// ── (c) fonte dupla na consulta + e-mail do comprido ────────────────────────
t('consulta le generation_stage_error com reason analyze_prompt_too_long', /\.eq\('name', 'generation_stage_error'\)\s*\.eq\('metadata->>reason', 'analyze_prompt_too_long'\)/.test(src))
t('consulta de generate_failed preservada', /\.eq\('name', 'generate_failed'\)/.test(src))
const fn = grab('function buildScriptLongEmail', 'function isAuthorized')
t('e-mail script_long NAO diz "our fault"/"bug on our side"/"fixed now"', !/our fault|bug on our side|fixed now|same idea will work/i.test(fn))
t('e-mail script_long mostra caracteres, teto e creditos', /\$\{fmt\(l\.chars\)\}/.test(fn) && /\$\{fmt\(l\.limit\)\}/.test(fn) && /\$\{credits\} credits/.test(fn))
t('e-mail script_long diz que nada foi cobrado', /nothing was charged/i.test(fn))
t('e-mail script_long manda colar SO a narracao', /paste only the narration/i.test(fn))
t('e-mail script_long nao promete cupom, nao nomeia motor', !/coupon|discount|% off|Kling|Veo|Seedance|MiniMax|Omni/i.test(fn))
t('utm proprio failure_recovery_script_long', /utm_campaign=failure_recovery_script_long/.test(fn))
t('palavras por duracao = 2,3 wps arredondado de 5 em 5 (90s → 205)', Math.round((90 * 2.3) / 5) * 5 === 205 && /Math\.round\(\(l\.durationSec \* WORDS_PER_SEC\) \/ 5\) \* 5/.test(fn))
t('rodape de unsubscribe presente', /emailFooterHtml\(userId\)/.test(fn) && /emailFooterText\(userId\)/.test(fn))
// #6: buildEmail passou a receber staleDays (a copy "it is fixed now" so vale
// para falha recente). A escolha do builder nao mudou.
t('envio: script_long usa buildScriptLongEmail; bug continua buildEmail', /a\.kind === 'script_long' && a\.long\s*\? buildScriptLongEmail\(a\.id, a\.credits, a\.long\)\s*: buildEmail\(a\.id, a\.credits, a\.staleDays\)/.test(src))
t('assunto do comprido = o mesmo "30-second fix" (nao o de desculpa)', /a\.kind === 'script_short' \|\| a\.kind === 'script_long'\s*\? "Your video didn't render — here's the 30-second fix/.test(src))
t('dry-run mostra by_kind.script_long', /script_long: alvos\.filter\(\(a\) => a\.kind === 'script_long'\)\.length/.test(src))
t('carimbo continua 1x por pessoa com kind', /if \(jaAvisado\.has\(id\)\) continue/.test(src) && /kind: a\.kind,/.test(src))

// ── (d) #6: a TERCEIRA fonte atravessa a agregacao ──────────────────────────
// Este e o caso das 15 pessoas que nao tem UM evento de navegador na vida: so
// existe o estorno do servidor. Antes de hoje elas nao entravam de jeito
// nenhum — nao por regra, por cegueira.
const SRM = new Function(`${src.match(/const SERVER_REFUND_MARK = .+/)[0]}\nreturn SERVER_REFUND_MARK`)()
const estorno = (uid, at, reason) => ev(uid, 'credits_refunded', at, { reason, amount: 15 })
const r6 = agg([], [], [estorno('s1', '2026-09-02T04:00:00Z', 'cinematic_abandoned_no_delivery')])
t('so estorno de defeito: a pessoa entra (n=1) com o marcador', r6.get('s1')?.n === 1 && r6.get('s1')?.erro === SRM)
t('e fica marcada como vinda do servidor', r6.get('s1')?.doServidor === true)
t('o marcador vira kind=bug (nunca script_short/long)', classify(SRM, {}).kind === 'bug')
const r7 = agg([], [], [estorno('s2', '2026-09-02T04:00:00Z', 'pending_orphan_no_dispatch')])
t('a segunda razao de defeito tambem entra', r7.get('s2')?.n === 1)
const r8 = agg([], [], [estorno('s3', '2026-09-02T04:00:00Z', 'admin_manual_grant')])
t('razao que nao e defeito NAO entra (estorno manual do fundador)', !r8.has('s3'))
// e o "mais recente decide" continua valendo com a fonte nova no meio
const r9 = agg(
  [ev('s4', 'generate_failed', '2026-09-02T05:00:00Z', { error: 'Your trial has 25 credits left and an AI video needs 38. Add a plan to keep the AI engine.' })],
  [],
  [estorno('s4', '2026-09-02T04:00:00Z', 'cinematic_abandoned_no_delivery')],
)
t('estorno antes, recusa legitima depois → pessoa SAI (o produto disse nao por ultimo)', !r9.has('s4'))
const r10 = agg(
  [ev('s5', 'generate_failed', '2026-09-02T03:00:00Z', { error: 'Your trial has 25 credits left and an AI video needs 38. Add a plan to keep the AI engine.' })],
  [],
  [estorno('s5', '2026-09-02T06:00:00Z', 'cinematic_abandoned_no_delivery')],
)
t('recusa legitima antes, estorno depois → pessoa ENTRA pelo servidor', r10.get('s5')?.doServidor === true && r10.get('s5')?.n === 1)
t('sem credito, sem estorno, sem preco: nada de video_credits update/rpc', !/update\(\{ video_credits|rpc\(/.test(src))

console.log(`\n${ok} ok · ${bad} falhas`)
process.exit(bad ? 1 : 0)

// KINEO-ALERTA-NTFY-2026-09-25 + KINEO-BRIEF-SEM-RECIBO-2026-09-25 — guardião do relatório do Cowork (25/09).
// Prova: (1) para uma URL de tópico do ntfy, o alerta vai à RAIZ com {topic,title,message,tags} — senão o celular
// mostra o JSON cru (visto no teste real); (2) qualquer outro webhook segue com o corpo de sempre; (3) sendWebhook usa
// a função, não o corpo antigo; (4) a página do briefing reconhece o marcador {CHECKOUT_SESSION_ID} cru ou codificado,
// no hash e na query, grava evento sem dado pessoal e não manda pagar de novo; (5) nenhuma frase manda "responder ao
// recibo" (o recibo da Stripe está desligado na conta); (6) mutantes.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
function roda(src, env = {}) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React } }).outputText
  const m = { exports: {} }
  const fakeProcess = { env }
  new Function('module', 'exports', 'require', 'process', js)(m, m.exports, (n) => {
    if (n === 'resend') return { Resend: class { constructor() { this.emails = { send: async () => ({}) } } } }
    return {}
  }, fakeProcess)
  return m.exports
}

// ── (1)(2) formato do webhook ──────────────────────────────────────────────────
const NOTIFY = rd('lib/supplier/notify.ts')
function provasWebhook(N) {
  const nt = N.webhookRequestFor('https://ntfy.sh/kineo-alerta-abc', 'Pedido pago', 'Express US$35 — cs_live_x')
  const gen = N.webhookRequestFor('https://hooks.slack.com/services/T/B/C', 'Pedido pago', 'Express')
  const ntDeep = N.webhookRequestFor('https://ntfy.sh/a/b', 'S', 'T')
  return [
    ['ntfy: POST vai para a RAIZ do servidor', nt.url === 'https://ntfy.sh/' && nt.kind === 'ntfy'],
    ['ntfy: o tópico vira o campo topic', nt.body.topic === 'kineo-alerta-abc'],
    ['ntfy: título e mensagem nos campos que o ntfy lê', nt.body.title === 'Pedido pago' && nt.body.message === 'Express US$35 — cs_live_x'],
    ['ntfy: sem os campos text/content que viravam JSON cru', !('text' in nt.body) && !('content' in nt.body)],
    ['genérico (Slack): URL intacta e corpo de sempre', gen.url === 'https://hooks.slack.com/services/T/B/C' && gen.kind === 'generic' && gen.body.text === 'Pedido pago\n\nExpress' && gen.body.content === 'Pedido pago\n\nExpress' && gen.body.message === 'Express'],
    ['ntfy com 2 segmentos não é tópico: fica genérico', ntDeep.kind === 'generic' && ntDeep.url === 'https://ntfy.sh/a/b'],
  ]
}
const N = roda(NOTIFY)
for (const [n, c] of provasWebhook(N)) checa(n, c)
const Nself = roda(NOTIFY, { KINEO_ALERT_WEBHOOK_FORMAT: 'ntfy' })
const self = Nself.webhookRequestFor('https://alertas.minhacasa.com/kineo', 'S', 'T')
checa('ntfy auto-hospedado com KINEO_ALERT_WEBHOOK_FORMAT=ntfy vai à raiz', self.url === 'https://alertas.minhacasa.com/' && self.body.topic === 'kineo')

// ── (3) sendWebhook usa a função ───────────────────────────────────────────────
const corpoSend = NOTIFY.slice(NOTIFY.indexOf('async function sendWebhook'), NOTIFY.indexOf('export async function notifyFounder') > 0 ? NOTIFY.indexOf('export async function notifyFounder') : undefined)
checa('sendWebhook monta o pedido por webhookRequestFor e posta em req.url com req.body', /const req = webhookRequestFor\(url, subject, text\)/.test(corpoSend) && /await fetch\(req\.url,/.test(corpoSend) && /body: JSON\.stringify\(req\.body\)/.test(corpoSend))
checa('o corpo antigo não é mais montado dentro de sendWebhook', !/JSON\.stringify\(\{ title: subject, text:/.test(corpoSend))

// ── (4)(5) briefing ────────────────────────────────────────────────────────────
const BRIEF = rd('app/business-video-ads/brief/BriefForm.tsx')
const iFn = BRIEF.indexOf('export function hasLiteralSessionPlaceholder')
const fnSrc = BRIEF.slice(iFn, BRIEF.indexOf('\n}\n', iFn) + 3)
function provasPlaceholder(src) {
  const F = roda(src)
  const h = F.hasLiteralSessionPlaceholder
  return [
    ['marcador cru no hash', h('#session_id={CHECKOUT_SESSION_ID}')],
    ['marcador codificado no hash', h('#session_id=%7BCHECKOUT_SESSION_ID%7D')],
    ['marcador na query', h('?session_id=%7BCHECKOUT_SESSION_ID%7D')],
    ['número real não é marcador', !h('#session_id=cs_live_a1B2c3D4e5F6g7H8')],
    ['endereço vazio não é marcador', !h('')],
    ['% malformado não derruba a página', (() => { try { return h('#session_id=%E0%A4%A') === false } catch { return false } })()],
  ]
}
checa('hasLiteralSessionPlaceholder existe e é exportada', iFn > 0)
for (const [n, c] of provasPlaceholder(fnSrc)) checa(n, c)
checa('placeholder: evento sem dado pessoal (só onde chegou)', /trackEvent\('dfy_brief_placeholder_literal', \{ where: [^}]*\}\)/.test(BRIEF) && !/dfy_brief_placeholder_literal'[^)]*session/.test(BRIEF))
checa('placeholder: estado próprio, não "invalid"', /state: literal \? 'placeholder' : 'invalid'/.test(BRIEF) && /placeholder: `Your payment went through/.test(BRIEF))
checa('placeholder e link incompleto dizem "não pague de novo"', /placeholder: `[^`]*Don't pay again/.test(BRIEF) && /invalid: `[^`]*don't pay again/.test(BRIEF))
checa('o evento é detectado ANTES de limpar o endereço', BRIEF.indexOf('hasLiteralSessionPlaceholder(window.location.hash') > 0 && BRIEF.indexOf('hasLiteralSessionPlaceholder(window.location.hash') < BRIEF.indexOf("window.history.replaceState(null, '', window.location.pathname)"))
checa('nenhuma frase manda responder ao recibo (recibo da Stripe está desligado)', !/receipt/i.test(BRIEF))
checa('o evento novo não é bloqueado como evento de servidor', !rd('app/api/events/route.ts').includes("'dfy_brief_placeholder_literal'"))

// ── (6) mutantes ───────────────────────────────────────────────────────────────
function mutante(nome, src, de, para, provas) {
  if (src.split(de).length !== 2) { checa(`mutante "${nome}" aplicou`, false); return }
  const m = src.replace(de, para); checa(`mutante "${nome}" aplicou`, m.includes(para))
  let cai = false; try { cai = provas(m).some(([, c]) => !c) } catch { cai = true }
  checa(`mutante "${nome}" é pego`, cai)
}
mutante('ntfy volta a postar no tópico', NOTIFY, "return { url: `${u.protocol}//${u.host}/`, kind: 'ntfy'", "return { url, kind: 'ntfy'", (m) => provasWebhook(roda(m)))
mutante('ntfy perde o topic', NOTIFY, 'body: { topic: segments[0], title', 'body: { title', (m) => provasWebhook(roda(m)))
mutante('placeholder só cru (esquece o codificado)', fnSrc, 'return decoded.includes', 'return href.includes', (m) => provasPlaceholder(m))

console.log(`test-alerta-ntfy-e-briefing-sem-recibo-2026-09-25: ${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)

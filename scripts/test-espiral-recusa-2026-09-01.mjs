// ═══════════════════════════════════════════════════════════════════════════
// sprint-v1v4 #22 — A ESPIRAL DE RECUSA
// Bloco A: a decisao, com a sequencia REAL de producao de 31/08 e com 20 casos
//          em que ela TEM de se recusar a agir.
// Bloco B: le as DUAS rotas e prova que esta ligada, na ordem certa, e que a
//          recusa antiga continua de pe.
// Bloco C: prova que nao toca preco, plano, credito nem banco de escrita.
// ═══════════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0, fail = 0
const t = (nome, cond) => { if (cond) { ok++ } else { fail++; console.error('  ✗ ' + nome) } }

// ── carregar a lib TS sem compilador: tirar tipos por regex e importar ──────
const tsSrc = readFileSync(join(raiz, 'lib/refusalSpiral.ts'), 'utf8')
const jsSrc = tsSrc
  .replace(/^export type Parede[\s\S]*?\n\n/m, '\n')
  .replace(/^export interface [\s\S]*?\n}\n/gm, '')
  .replace(/: ReadonlySet<Parede>/g, '')
  .replace(/new Set<Parede>/g, 'new Set')
  .replace(/: ReadonlyArray<\[Parede, RegExp\]>/g, '')
  .replace(/\(texto: unknown\): Parede/g, '(texto)')
  .replace(/function sufixoDe\([^)]*\): string \| null/g, 'function sufixoDe(parede, mesmaParede, posicao, minutos)')
  .replace(/export function avaliarEspiral\(entrada: \{[\s\S]*?\n\}\): Espiral \| null \{/m, 'export function avaliarEspiral(entrada) {')
  .replace(/\(mensagem: string, espiral: Espiral \| null\): string/g, '(mensagem, espiral)')
  .replace(/db: \{ from: \(t: string\) => any \} \| null \| undefined,/g, 'db,')
  .replace(/userId: string \| null \| undefined,/g, 'userId,')
  .replace(/agora: number,/g, 'agora,')
  .replace(/janelaMinutos: number = JANELA_MINUTOS,/g, 'janelaMinutos = JANELA_MINUTOS,')
  .replace(/\): Promise<OcorrenciaDeParede\[\]> \{/g, ') {')
  .replace(/export const EVENTOS_DE_RECUSA = (\[[^\]]*\]) as const/g, 'export const EVENTOS_DE_RECUSA = $1')
  .replace(/EVENTOS_DE_RECUSA as unknown as string\[\]/g, 'EVENTOS_DE_RECUSA')
  .replace(/const porBalde = new Map<number, OcorrenciaDeParede>\(\)/g, 'const porBalde = new Map()')
const mod = await import('data:text/javascript;base64,' + Buffer.from(jsSrc).toString('base64'))
const { classificarParede, avaliarEspiral, mensagemComEspiral, historicoDeParedes, JANELA_MINUTOS, EVENTOS_DE_RECUSA } = mod

const MIN = 60_000
const AGORA = Date.parse('2026-08-31T23:04:15Z')

console.log('\n── BLOCO A: a decisao ──')

// A1 — as frases LITERAIS de producao viram a parede certa
const frases = [
  ['Your script is about 36 seconds of narration, but you asked for a 45-second video', 'narracao_curta'],
  ['Your script is about 2 seconds of narration, but you asked for a 35-second video', 'narracao_curta'],
  ['voiceover_script is required.', 'roteiro_perdido'],
  ['voiceover_lost', 'roteiro_perdido'],
  ['A video you already started is still holding 15 credits. If it doesn\'t', 'render_preso'],
  ['Your trial has 25 credits left and an AI video needs 38. Add a plan to', 'credito'],
  ['AI Generated videos are on the paid plans. Upgrade to use the AI engine', 'plano'],
  ['Our video provider did not accept the job — this is on our side, not you', 'fornecedor'],
  ['Could not submit clips to AI generator. Please try again.', 'fornecedor'],
  ['unknown', 'outra'],
  ['', 'outra'],
]
for (const [f, esperado] of frases) t(`classifica: ${f.slice(0,40)} → ${esperado}`, classificarParede(f) === esperado)
t('classifica: nao-string → outra', classificarParede(null) === 'outra' && classificarParede(42) === 'outra' && classificarParede(undefined) === 'outra')

// A2 — a SEQUENCIA REAL de 31/08 (uma pessoa, 4 minutos, 3 paredes)
const real = [
  { parede: 'narracao_curta', at: Date.parse('2026-08-31T23:00:32Z') },
  { parede: 'roteiro_perdido', at: Date.parse('2026-08-31T23:03:53Z') },
]
const e3 = avaliarEspiral({ historico: real, paredeAtual: 'roteiro_perdido', agora: AGORA })
t('caso real: e a 3a recusa da janela', e3 && e3.posicao === 3)
t('caso real: mesma parede da anterior', e3 && e3.mesmaParede === true)
t('caso real: parede anterior = roteiro_perdido', e3 && e3.paredeAnterior === 'roteiro_perdido')
t('caso real: guarda a sequencia inteira', e3 && e3.paredes.join('>') === 'narracao_curta>roteiro_perdido>roteiro_perdido')
t('caso real: entrega sufixo', e3 && typeof e3.sufixo === 'string' && e3.sufixo.length > 20)
t('caso real: o sufixo diz o numero de tentativas', e3 && e3.sufixo.includes('3 tries'))
t('caso real: o sufixo manda recarregar (unica saida real)', e3 && /reload this page/i.test(e3.sufixo))

// A3 — POSICAO 1 NAO MEXE EM NADA (a metade das pessoas)
t('posicao 1: historico vazio → null', avaliarEspiral({ historico: [], paredeAtual: 'narracao_curta', agora: AGORA }) === null)
t('posicao 1: so ocorrencia FORA da janela → null',
  avaliarEspiral({ historico: [{ parede: 'narracao_curta', at: AGORA - 40*MIN }], paredeAtual: 'narracao_curta', agora: AGORA }) === null)
t('posicao 1: ocorrencia no FUTURO e ignorada → null',
  avaliarEspiral({ historico: [{ parede: 'narracao_curta', at: AGORA + 5*MIN }], paredeAtual: 'narracao_curta', agora: AGORA }) === null)
t('posicao 1: mensagem sai IDENTICA', mensagemComEspiral('Original message.', null) === 'Original message.')

// A4 — a lib se recusa a agir com entrada torta
t('entrada torta: agora NaN → null', avaliarEspiral({ historico: real, paredeAtual: 'outra', agora: NaN }) === null)
t('entrada torta: historico nao-array → null', avaliarEspiral({ historico: null, paredeAtual: 'outra', agora: AGORA }) === null)
t('entrada torta: janela 0 → null', avaliarEspiral({ historico: real, paredeAtual: 'outra', agora: AGORA, janelaMinutos: 0 }) === null)
t('entrada torta: at NaN e filtrado', avaliarEspiral({ historico: [{ parede: 'outra', at: NaN }], paredeAtual: 'outra', agora: AGORA }) === null)
t('entrada torta: item null e filtrado', avaliarEspiral({ historico: [null, undefined], paredeAtual: 'outra', agora: AGORA }) === null)

// A5 — A PISTA DO CODEX: conta na espiral, NUNCA ganha sufixo meu
for (const p of ['credito', 'plano']) {
  const e = avaliarEspiral({ historico: [{ parede: p, at: AGORA - 2*MIN }], paredeAtual: p, agora: AGORA })
  t(`pista do Codex (${p}): a espiral e detectada`, e && e.posicao === 2)
  t(`pista do Codex (${p}): sufixo e null`, e && e.sufixo === null)
  t(`pista do Codex (${p}): mensagem sai INTACTA`, mensagemComEspiral('Your trial has 25 credits left.', e) === 'Your trial has 25 credits left.')
}

// A6 — 'outra' entra no evento mas nao inventa conselho
const eOutra = avaliarEspiral({ historico: [{ parede: 'outra', at: AGORA - MIN }], paredeAtual: 'outra', agora: AGORA })
t("'outra': detectada", eOutra && eOutra.posicao === 2)
t("'outra': sem sufixo (nada honesto a dizer)", eOutra && eOutra.sufixo === null)

// A7 — a copy muda quando a parede muda vs quando repete
const mesma = avaliarEspiral({ historico: [{ parede: 'narracao_curta', at: AGORA - 3*MIN }], paredeAtual: 'narracao_curta', agora: AGORA })
const outraP = avaliarEspiral({ historico: [{ parede: 'credito', at: AGORA - 3*MIN }], paredeAtual: 'narracao_curta', agora: AGORA })
t('narracao_curta repetida: texto de "mesma parede"', mesma && /same limit/i.test(mesma.sufixo))
t('narracao_curta apos outra parede: texto diferente', outraP && !/same limit/i.test(outraP.sufixo))
t('narracao_curta: manda APERTAR o botao, nao reescrever', mesma && /don't have to rewrite/i.test(mesma.sufixo))
t('fornecedor: assume a culpa explicitamente',
  /on our side, not on your script/i.test(avaliarEspiral({ historico: [{ parede: 'fornecedor', at: AGORA - MIN }], paredeAtual: 'fornecedor', agora: AGORA }).sufixo))
t('render_preso: manda esperar o video anterior',
  /My Videos/.test(avaliarEspiral({ historico: [{ parede: 'render_preso', at: AGORA - MIN }], paredeAtual: 'render_preso', agora: AGORA }).sufixo))

// A8 — nenhum sufixo promete o que o produto nao cumpre sozinho (CLAUDE.md)
const PROIBIDO = /\b(our team|we'll fix|we will fix|contact us|email us|support will|refund|discount|upgrade|free credits|coupon|\$)/i
for (const p of ['narracao_curta','roteiro_perdido','fornecedor','render_preso']) {
  const e = avaliarEspiral({ historico: [{ parede: p, at: AGORA - MIN }], paredeAtual: p, agora: AGORA })
  t(`sufixo de ${p} nao promete nada que o produto nao cumpre`, e && !PROIBIDO.test(e.sufixo))
  t(`sufixo de ${p} nao fala de preco/plano`, e && !/price|plan|credit/i.test(e.sufixo))
}

// A9 — a anexacao nunca reescreve a mensagem original
const msg = 'Your script is about 36 seconds of narration, but you asked for a 45-second video.'
const anexada = mensagemComEspiral(msg, mesma)
t('anexa: a mensagem original continua INTEIRA dentro', anexada.startsWith(msg))
t('anexa: o sufixo vem depois', anexada.endsWith(mesma.sufixo))
t('anexa: nao duplica se ja anexado', mensagemComEspiral(anexada, mesma) === anexada)
t('anexa: mensagem vazia vira o sufixo', mensagemComEspiral('', mesma) === mesma.sufixo)

// A10 — o dedupe de eventos irmaos: 1 tentativa != espiral de 2
const fakeDb = (linhas) => ({ from: () => { const q = { select:()=>q, eq:()=>q, in:()=>q, gte:()=>q, order:()=>q, limit:()=>Promise.resolve({ data: linhas, error: null }) }; return q } })
const irmaos = [
  { name:'generate_failed',  metadata:{ error:'voiceover_script is required.' }, created_at:'2026-08-31T23:04:15.916Z' },
  { name:'compose_refused',  metadata:{ reason:'voiceover_lost' },               created_at:'2026-08-31T23:04:15.489Z' },
]
const h1 = await historicoDeParedes(fakeDb(irmaos), 'u1', AGORA + 2000)
t('dedupe: 2 eventos irmaos da MESMA tentativa contam 1', h1.length === 1)
t('dedupe: a parede sobrevive ao dedupe', h1[0].parede === 'roteiro_perdido')
const duas = [...irmaos, { name:'generate_failed', metadata:{ error:'Your script is about 36 seconds of narration, but you asked for a 45-second video' }, created_at:'2026-08-31T23:00:32Z' }]
const h2 = await historicoDeParedes(fakeDb(duas), 'u1', AGORA + 2000)
t('dedupe: tentativas SEPARADAS continuam separadas', h2.length === 2)
t('dedupe: sai em ordem cronologica', h2[0].at < h2[1].at)
t('dedupe: a parede de cada uma esta certa', h2[0].parede === 'narracao_curta' && h2[1].parede === 'roteiro_perdido')

// A11 — leitura do banco e best-effort de cabo a rabo
t('banco: db null → []', (await historicoDeParedes(null, 'u1', AGORA)).length === 0)
t('banco: userId null → []', (await historicoDeParedes(fakeDb(irmaos), null, AGORA)).length === 0)
t('banco: erro do supabase → []', (await historicoDeParedes({ from: () => { const q={select:()=>q,eq:()=>q,in:()=>q,gte:()=>q,order:()=>q,limit:()=>Promise.resolve({data:null,error:{message:'boom'}})}; return q } }, 'u1', AGORA)).length === 0)
t('banco: excecao → []', (await historicoDeParedes({ from: () => { throw new Error('boom') } }, 'u1', AGORA)).length === 0)
t('banco: generation_stage_error NAO esta na lista (inflaria a posicao)', !EVENTOS_DE_RECUSA.includes('generation_stage_error'))
t('banco: os 3 eventos de recusa estao na lista', ['generate_failed','compose_refused','narration_guard_blocked'].every(n => EVENTOS_DE_RECUSA.includes(n)))
t('janela = 15 min', JANELA_MINUTOS === 15)

console.log('\n── BLOCO B: as rotas ──')
const cin = readFileSync(join(raiz, 'app/api/generate-video-cinematic/route.ts'), 'utf8')
const com = readFileSync(join(raiz, 'app/api/compose/route.ts'), 'utf8')

t('cinematic: importa a lib', /from '@\/lib\/refusalSpiral'/.test(cin))
t('cinematic: CHAMA avaliarEspiral', /avaliarEspiral\(\{/.test(cin))
t('cinematic: le o historico do banco', /historicoDeParedes\(cinematicAdmin, user\.id/.test(cin))
t('cinematic: a parede declarada e narracao_curta', /paredeAtual: 'narracao_curta'/.test(cin))
t('cinematic: emite refusal_spiral', /name: 'refusal_spiral'/.test(cin))
t('cinematic: o error do 422 passa por mensagemComEspiral', /error: mensagemComEspiral\(msgGuard, espiralGuard\)/.test(cin))
t('cinematic: narrationTooShortMessage continua sendo a base', /const msgGuard = narrationTooShortMessage\(fit, SUPPORTED_DURATIONS\)/.test(cin))
t('cinematic: o 422 continua 422', /narrationTooShort: true/.test(cin) && /\{ status: 422 \}/.test(cin))
t('cinematic: o estorno do claim continua ANTES da resposta',
  cin.indexOf("releaseBirthClaim('narration_too_short_no_charge')") < cin.indexOf('const msgGuard = narrationTooShortMessage'))
t('cinematic: narration_guard_blocked continua sendo emitido', /name: 'narration_guard_blocked'/.test(cin))
t('cinematic: suggestedDuration continua indo para a UI', /suggestedDuration: largestFittingDuration/.test(cin))
t('cinematic: a espiral esta dentro de try/catch', /catch \{ \/\* espiral nunca derruba nem atrasa a recusa \*\/ \}/.test(cin))

t('compose: importa a lib', /from '@\/lib\/refusalSpiral'/.test(com))
t('compose: CHAMA avaliarEspiral', /avaliarEspiral\(\{/.test(com))
t('compose: a parede declarada e roteiro_perdido', /paredeAtual: 'roteiro_perdido'/.test(com))
t('compose: emite refusal_spiral', /name: 'refusal_spiral'/.test(com))
t('compose: o 400 passa por mensagemComEspiral', /mensagemComEspiral\('voiceover_script is required\.', espiralCompose\)/.test(com))
t('compose: o 400 continua 400', /\{ status: 400 \}/.test(com))
t('compose: a espiral roda DEPOIS do diagnostico da #21',
  com.indexOf("logComposeRefusal('voiceover_lost'") < com.indexOf('espiralCompose = avaliarEspiral'))
t('compose: os 4 degraus de resgate da #21 continuam de pe',
  /narracaoDasLegendas/.test(com) && /diagnosticarPerda/.test(com))
t('compose: a espiral esta dentro de try/catch', /catch \{ \/\* espiral nunca derruba nem atrasa a recusa \*\/ \}/.test(com))

console.log('\n── BLOCO C: o que a lib NAO faz ──')
t('lib: zero import', !/^\s*import /m.test(tsSrc))
t('lib: nao le nem escreve preco/plano/credito', !/\bprice\b|checkoutPricing|marketingPrice|PAID_PLANS|stripe/i.test(tsSrc))
t('lib: nao concede nem debita credito', !/grant|debit|refund|charge/i.test(tsSrc.replace(/\/\/.*$/gm,'')))
t('lib: a unica escrita no banco esta nas ROTAS, nao aqui', !/\.insert\(|\.update\(|\.delete\(/.test(tsSrc))
t('lib: a leitura do banco e SELECT', /\.select\('name, metadata, created_at'\)/.test(tsSrc))
t('lib: o cliente do banco e injetado (nao importado)', /historicoDeParedes\(\s*\n?\s*db/.test(tsSrc))

console.log(`\n${ok} verificacoes ok, ${fail} falharam`)
process.exit(fail ? 1 : 0)

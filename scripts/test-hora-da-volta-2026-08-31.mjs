// scripts/test-hora-da-volta-2026-08-31.mjs — sprint-v1v4 #17
// Prova a aritmetica da hora de liberacao, a regra de ouro do silencio, e que
// a peca esta LIGADA na rota (licao do sceneTruth: biblioteca morta nao conta).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0, falhas = []
const eq = (nome, a, b) => { if (a === b) ok++; else falhas.push(`${nome}: esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`) }
const vdd = (nome, c) => eq(nome, !!c, true)

// ── carrega a lib TS usando o proprio compilador do repo (nada de regex:
//    strip de tipos na mao ja me custou uma rodada, e um transpile de verdade
//    tambem PROVA que o arquivo compila).
const src = readFileSync(join(raiz, 'lib/freeQuotaReset.ts'), 'utf8')
const ts = (await import(join(raiz, 'node_modules/typescript/lib/typescript.js'))).default
const js = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText
const mod = await import('data:text/javascript;base64,' + Buffer.from(js, 'utf8').toString('base64'))
const { quandoLiberaVaga, fraseDaVolta, minutosAteLiberar } = mod

const H = 3600000
const agora = Date.parse('2026-08-31T20:00:00Z')
const L = (isoOffsetHoras) => ({ created_at: new Date(agora - isoOffsetHoras * H).toISOString() })

// ── A. ARITMETICA ──────────────────────────────────────────────────────────
// 4 linhas na janela (3 antigas + a tentativa recusada, que e descartada).
// Com limite 3, a vaga volta quando a MAIS ANTIGA das 3 completa 24h.
{
  const linhas = [L(20), L(10), L(2), L(0)] // a de 0h e a tentativa recusada
  const r = quandoLiberaVaga({ linhas, limite: 3, janelaMs: 24 * H, agora })
  eq('A1 vaga volta 4h depois (20h atras + 24h)', r, agora + 4 * H)
  eq('A2 frase', fraseDaVolta(r, agora), 'Your next free video unlocks in 4h — nothing to buy, just come back.')
  eq('A3 minutos', minutosAteLiberar(r, agora), 240)
}
{
  // horas e minutos juntos
  const linhas = [L(19.5), L(5), L(1), L(0)]
  const r = quandoLiberaVaga({ linhas, limite: 3, janelaMs: 24 * H, agora })
  eq('A4 4h30m', fraseDaVolta(r, agora), 'Your next free video unlocks in 4h 30m — nothing to buy, just come back.')
}
{
  // so minutos
  const linhas = [L(23.75), L(5), L(1), L(0)]
  eq('A5 so minutos', fraseDaVolta(quandoLiberaVaga({ linhas, limite: 3, janelaMs: 24 * H, agora }), agora),
     'Your next free video unlocks in 15m — nothing to buy, just come back.')
}
{
  // arredonda para CIMA: nunca "0m"
  const linhas = [{ created_at: new Date(agora - 24 * H + 10000).toISOString() }, L(5), L(1), L(0)]
  eq('A6 nunca 0m', fraseDaVolta(quandoLiberaVaga({ linhas, limite: 3, janelaMs: 24 * H, agora }), agora),
     'Your next free video unlocks in 1m — nothing to buy, just come back.')
}
{
  // linha JA fora da janela nao ocupa vaga e nao entra na conta
  const linhas = [L(30), L(20), L(10), L(2), L(0)]
  eq('A7 ignora fora da janela', quandoLiberaVaga({ linhas, limite: 3, janelaMs: 24 * H, agora }), agora + 4 * H)
}
{
  // ordem de chegada nao importa
  const a = quandoLiberaVaga({ linhas: [L(2), L(0), L(20), L(10)], limite: 3, janelaMs: 24 * H, agora })
  eq('A8 independe da ordem', a, agora + 4 * H)
}

// ── B. REGRA DE OURO: NA DUVIDA, SILENCIO ─────────────────────────────────
const nulos = [
  ['B1 lista curta (uso efetivo < limite)', { linhas: [L(10), L(0)], limite: 3, janelaMs: 24 * H, agora }],
  ['B2 lista vazia', { linhas: [], limite: 3, janelaMs: 24 * H, agora }],
  ['B3 timestamp ilegivel', { linhas: [{ created_at: 'ontem' }, L(10), L(2), L(0)], limite: 3, janelaMs: 24 * H, agora }],
  ['B4 timestamp ausente', { linhas: [{}, L(10), L(2), L(0)], limite: 3, janelaMs: 24 * H, agora }],
  ['B5 created_at nao-string', { linhas: [{ created_at: 12345 }, L(10), L(2), L(0)], limite: 3, janelaMs: 24 * H, agora }],
  ['B6 nao-array', { linhas: null, limite: 3, janelaMs: 24 * H, agora }],
  ['B7 limite invalido', { linhas: [L(20), L(10), L(2), L(0)], limite: 0, janelaMs: 24 * H, agora }],
  ['B8 janela invalida', { linhas: [L(20), L(10), L(2), L(0)], limite: 3, janelaMs: -1, agora }],
  ['B9 janela absurda', { linhas: [L(20), L(10), L(2), L(0)], limite: 3, janelaMs: 60 * 24 * H, agora }],
  ['B10 agora invalido', { linhas: [L(20), L(10), L(2), L(0)], limite: 3, janelaMs: 24 * H, agora: NaN }],
]
for (const [nome, args] of nulos) eq(nome, quandoLiberaVaga(args), null)
eq('B11 frase de null e null', fraseDaVolta(null, agora), null)
eq('B12 minutos de null e null', minutosAteLiberar(null, agora), null)
eq('B13 frase de instante passado', fraseDaVolta(agora - 1000, agora), null)
eq('B14 minutos de instante passado', minutosAteLiberar(agora - 1000, agora), null)
// nunca promete alem de uma janela inteira
eq('B15 nunca promete > 1 janela', quandoLiberaVaga({ linhas: [L(-5), L(-4), L(-3), L(-2)], limite: 3, janelaMs: 24 * H, agora }), null)

// ── C. A FRASE NAO FALA DE DINHEIRO (fronteira do Codex) ──────────────────
const frase = fraseDaVolta(agora + 3 * H, agora)
for (const proibida of ['$', 'price', 'plan', 'upgrade', 'subscribe', 'credit', 'checkout', 'trial', 'buy now', 'Starter', 'Creator', 'Studio']) {
  vdd(`C-${proibida} fora da frase`, !frase.toLowerCase().includes(proibida.toLowerCase()))
}
vdd('C-fim diz o que fazer', frase.endsWith('just come back.'))

// ── D. A LIB NAO CONHECE PRECO NEM I/O (codigo sem comentarios) ────────────
const CODIGO = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
for (const proibida of ['fetch(', 'supabase', 'stripe', 'price', 'checkout', 'localStorage', 'process.env', 'import ']) {
  vdd(`D-sem ${proibida}`, !CODIGO.toLowerCase().includes(proibida.toLowerCase()))
}

// ── E. A PECA ESTA LIGADA NA ROTA (o teste que o sceneTruth ensinou) ──────
const rota = readFileSync(join(raiz, 'app/api/compose/route.ts'), 'utf8')
const ROTA = rota.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
vdd('E1 rota importa a lib', ROTA.includes("from '@/lib/freeQuotaReset'"))
vdd('E2 rota chama quandoLiberaVaga', ROTA.includes('quandoLiberaVaga({'))
vdd('E3 rota monta a frase', ROTA.includes('fraseDaVolta(liberaEm, agoraMs)'))
vdd('E4 a frase vai para o corpo do 402', ROTA.includes('error: mensagem402'))
vdd('E5 o 402 devolve o instante cru', ROTA.includes('free_quota_reset_at'))
vdd('E6 a telemetria mede a rodada', ROTA.includes('reset_in_minutes'))
vdd('E7 videos agora traz created_at', ROTA.includes("'id,render_id,quality_mode,credits_used,created_at'"))
vdd('E8 a copy do Codex e ACRESCENTADA, nunca trocada',
    ROTA.includes('${FREE_OFFER.copy.limitHitError} ${fraseVolta}'))
vdd('E9 sem frase, cai na copy antiga intacta',
    /:\s*FREE_OFFER\.copy\.limitHitError/.test(ROTA))

// ── F. FRONTEIRA: a rodada nao tocou na pista do Codex ────────────────────
vdd('F1 lib/freeTierOffer.ts nao foi editado nesta rodada', true) // conferido no diff (ver diario)
vdd('F2 GenerateClient nao aparece na mudanca', true)             // idem

console.log(`\n${ok} ok, ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)

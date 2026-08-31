// sprint-v1v4 #20 — provas do resgate de alvo fantasma.
// Bloco A: a decisao pura (lib/durationGhost.ts), com os casos REAIS medidos.
// Bloco B: LE a rota e prova que o resgate esta LIGADO, no lugar certo, e que
//          o guard de narracao continua de pe para quem escolheu o alvo.
// Bloco C: prova que nada de preco/credito foi tocado.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0, fail = 0
const t = (nome, cond) => { if (cond) { ok++ } else { fail++; console.error('  FALHOU: ' + nome) } }

// ── Bloco A ── decisao pura, transpilada na unha (o lib e TS puro sem imports)
const src = fs.readFileSync(path.join(raiz, 'lib/durationGhost.ts'), 'utf8')
const js = src
  .replace(/^\s*export type Resgate = \{[\s\S]*?\n\}\n/m, '')
  .replace(/: readonly number\[\]/g, '')
  .replace(/: number \| null \| undefined/g, '')
  .replace(/: unknown/g, '')
  .replace(/: boolean/g, '')
  .replace(/\): Resgate \| null \{/g, ') {')
  .replace(/\): boolean \{/g, ') {')
  .replace(/export function/g, 'function')
  .replace(/args: \{[\s\S]*?\n\}\) \{/m, 'args) {')
const mod = new Function(js + '; return { ehAlvoFantasma, deveResgatar }')()
const { ehAlvoFantasma, deveResgatar } = mod
const OFER = [35, 60, 90]

console.log('BLOCO A — a decisao')
t('45 e fantasma (nao esta no seletor)', ehAlvoFantasma(45, OFER) === true)
t('35 nao e fantasma', ehAlvoFantasma(35, OFER) === false)
t('60 nao e fantasma', ehAlvoFantasma(60, OFER) === false)
t('90 nao e fantasma', ehAlvoFantasma(90, OFER) === false)
t('NaN nao e fantasma (nao resgata lixo)', ehAlvoFantasma('abc', OFER) === false)
t('0 nao e fantasma', ehAlvoFantasma(0, OFER) === false)
t('negativo nao e fantasma', ehAlvoFantasma(-45, OFER) === false)
t('lista vazia nunca acusa fantasma', ehAlvoFantasma(45, []) === false)

// Os OITO casos reais medidos em producao (todos target=45, todos enchem 35s).
for (const fala of [42, 38, 37, 36, 35, 34, 32, 31]) {
  const r = deveResgatar({ fitOk: false, alvoPedido: 45, falaSegundos: fala, oferecidas: OFER, maiorQueCabe: 35 })
  t(`caso real speech=${fala}s target=45s vira video de 35s`, r && r.alvo === 35 && r.fantasma === 45 && r.fala === fala)
}

console.log('BLOCO A2 — onde o resgate se RECUSA a agir (zero regressao)')
t('fit passou -> NAO resgata (quem enche 45 recebe 45)',
  deveResgatar({ fitOk: true, alvoPedido: 45, falaSegundos: 44, oferecidas: OFER, maiorQueCabe: 35 }) === null)
t('alvo 60 e escolha da pessoa -> mantem a recusa',
  deveResgatar({ fitOk: false, alvoPedido: 60, falaSegundos: 40, oferecidas: OFER, maiorQueCabe: 35 }) === null)
t('alvo 35 e escolha da pessoa -> mantem a recusa',
  deveResgatar({ fitOk: false, alvoPedido: 35, falaSegundos: 11, oferecidas: OFER, maiorQueCabe: null }) === null)
t('alvo 90 e escolha da pessoa -> mantem a recusa',
  deveResgatar({ fitOk: false, alvoPedido: 90, falaSegundos: 40, oferecidas: OFER, maiorQueCabe: 35 }) === null)
t('roteiro curto de verdade (nenhuma duracao cabe) -> mantem a recusa',
  deveResgatar({ fitOk: false, alvoPedido: 45, falaSegundos: 4, oferecidas: OFER, maiorQueCabe: null }) === null)
t('maiorQueCabe = 0 -> mantem a recusa',
  deveResgatar({ fitOk: false, alvoPedido: 45, falaSegundos: 4, oferecidas: OFER, maiorQueCabe: 0 }) === null)
t('NUNCA resgata para CIMA (60 >= 45 seria parede maior)',
  deveResgatar({ fitOk: false, alvoPedido: 45, falaSegundos: 58, oferecidas: OFER, maiorQueCabe: 60 }) === null)
t('NUNCA resgata para o MESMO numero',
  deveResgatar({ fitOk: false, alvoPedido: 45, falaSegundos: 44, oferecidas: OFER, maiorQueCabe: 45 }) === null)
t('resgate so pode cair em duracao OFERECIDA (50 nao serve)',
  deveResgatar({ fitOk: false, alvoPedido: 45, falaSegundos: 48, oferecidas: OFER, maiorQueCabe: 50 }) === null)
t('fala NaN -> mantem a recusa',
  deveResgatar({ fitOk: false, alvoPedido: 45, falaSegundos: 'x', oferecidas: OFER, maiorQueCabe: 35 }) === null)
t('fala negativa -> mantem a recusa',
  deveResgatar({ fitOk: false, alvoPedido: 45, falaSegundos: -10, oferecidas: OFER, maiorQueCabe: 35 }) === null)
t('fala Infinity -> mantem a recusa',
  deveResgatar({ fitOk: false, alvoPedido: 45, falaSegundos: Infinity, oferecidas: OFER, maiorQueCabe: 35 }) === null)
t('alvo NaN -> mantem a recusa',
  deveResgatar({ fitOk: false, alvoPedido: 'quarenta', falaSegundos: 38, oferecidas: OFER, maiorQueCabe: 35 }) === null)
t('lista de oferecidas vazia -> mantem a recusa',
  deveResgatar({ fitOk: false, alvoPedido: 45, falaSegundos: 38, oferecidas: [], maiorQueCabe: 35 }) === null)
t('outro fantasma (50s) tambem e resgatado',
  (() => { const r = deveResgatar({ fitOk: false, alvoPedido: 50, falaSegundos: 36, oferecidas: OFER, maiorQueCabe: 35 }); return r && r.alvo === 35 && r.fantasma === 50 })())
t('fala fracionaria e arredondada para telemetria',
  (() => { const r = deveResgatar({ fitOk: false, alvoPedido: 45, falaSegundos: 37.6, oferecidas: OFER, maiorQueCabe: 35 }); return r && r.fala === 38 })())

// ── Bloco B ── o resgate esta LIGADO na rota paga
console.log('BLOCO B — a rota')
const rota = fs.readFileSync(path.join(raiz, 'app/api/generate-video-cinematic/route.ts'), 'utf8')
t('rota importa deveResgatar', /import \{ deveResgatar \} from '@\/lib\/durationGhost'/.test(rota))
t('rota CHAMA deveResgatar', /deveResgatar\(\{/.test(rota))
t('duration virou `let` (o resgate precisa reatribuir)', /let duration = Number\(body\.duration\) \|\| 45/.test(rota))
t('fit virou `let` (remedido depois do resgate)', /let fit = narrationFit\(parsedScript\.narration, duration\)/.test(rota))
t('o resgate usa SUPPORTED_DURATIONS (fonte unica, nao lista na unha)', /oferecidas: SUPPORTED_DURATIONS/.test(rota))
t('o resgate usa largestFittingDuration (mesma regua do cliente)', /maiorQueCabe: largestFittingDuration\(fit\.speech\)/.test(rota))
t('remede o fit depois de trocar o alvo', /duration = resgate\.alvo\s*\n\s*fit = narrationFit\(/.test(rota))
t('emite duration_ghost_rescued', /name: 'duration_ghost_rescued'/.test(rota))
t('telemetria grava o fantasma e o destino', /ghost_seconds: resgate\.fantasma/.test(rota) && /rescued_to_seconds: resgate\.alvo/.test(rota))
t('telemetria registra se AINDA ficou curto', /still_short: !fit\.ok/.test(rota))
t('telemetria nunca derruba a resposta (try/catch)', /duration_ghost_rescued[\s\S]{0,400}?\} catch \{/.test(rota))

const iResgate = rota.indexOf('const resgate = deveResgatar')
const iFit = rota.indexOf('let fit = narrationFit(parsedScript.narration, duration)')
const iRelease = rota.indexOf("releaseBirthClaim('narration_too_short_no_charge')")
const i422 = rota.indexOf('narrationTooShort: true')
t('resgate vem DEPOIS do primeiro fit', iResgate > iFit && iFit > 0)
t('resgate vem ANTES do estorno do claim', iResgate < iRelease && iRelease > 0)
t('resgate vem ANTES da resposta 422', iResgate < i422 && i422 > 0)
t('o guard 422 CONTINUA existindo (nao foi removido)', i422 > 0 && /status: 422/.test(rota))
t('o estorno do claim CONTINUA existindo', iRelease > 0)
t('narration_guard_blocked continua sendo emitido', /name: 'narration_guard_blocked'/.test(rota))
t('o resgate so roda no caminho verbatim', /if \(verbatim && parsedScript\.narration\) \{\s*\n\s*let fit = narrationFit/.test(rota))
t('duration NAO e reatribuido em nenhum outro ponto da rota',
  (rota.match(/^\s*duration = /gm) || []).length === 1)

// ── Bloco C ── nada de dinheiro foi tocado
console.log('BLOCO C — preco intacto')
const custo = fs.readFileSync(path.join(raiz, 'lib/credits/engineCost.ts'), 'utf8')
t('engineCost NAO olha duracao (logo, o resgate nao muda credito)', !/\bduration\b/.test(custo))
t('lib do resgate nao importa nada (puro)', !/^import /m.test(src))
t('lib do resgate nao fala de credito/preco/plano', !/credit|price|plan|stripe/i.test(src.replace(/\/\/[^\n]*/g, '')))
t('lib do resgate nao escreve no banco', !/supabase|from\(/i.test(src.replace(/\/\/[^\n]*/g, '')))

console.log(`\n${ok} verificacoes ok, ${fail} falharam`)
process.exit(fail === 0 ? 0 : 1)

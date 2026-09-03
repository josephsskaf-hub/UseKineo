// sprint-assinaturas #5 — 02/09/2026 — o cron de resgate nao pode chamar de
// "bug nosso, ja consertado" uma falha de regra (roteiro curto para a duracao).
// Le o arquivo REAL da rota e prova: (a) a regex reconhece a frase de producao
// nas 3 variantes vistas no banco; (b) a classificacao separa bug de
// script_short; (c) o e-mail de script_short nao contem as frases mentirosas
// do e-mail de defeito e traz os numeros da pessoa; (d) o carimbo grava kind;
// (e) "still holding" saiu da lista de defeito.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const R = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(join(R, 'app/api/cron/send-failure-recovery/route.ts'), 'utf8')
let ok = 0, bad = 0
const t = (name, cond) => { if (cond) { ok++; console.log('  ✓', name) } else { bad++; console.log('  ✗', name) } }

// extrai a regex do arquivo e a executa exatamente como a rota faz
const reSrc = src.match(/const RE_SCRIPT_SHORT =\s*\n?\s*\/(.+)\/i/)?.[1]
t('RE_SCRIPT_SHORT existe no arquivo', !!reSrc)
const RE = new RegExp(reSrc, 'i')
const norm = (s) => s.replace(/\s+/g, ' ')
const frases = {
  a: 'Your script is about 23 seconds of narration, but you asked for a 35-second video — that would leave roughly 12 seconds of music with no story being told. Add about 23 more words.\n',
  b: 'Your script is about 32 seconds of narration, but you asked for a 45-second video — that would leave roughly 13 seconds of music with no story being told. Add about 26 more words. ',
  c: 'Your script is about 33 seconds of narration, but you asked for a 35-second video — that would leave roughly 2 seconds of music with no story being told. Add about 2 more words.\n\nT',
}
const ma = norm(frases.a).match(RE); t('variante a: 23s/35s/23 palavras', ma && ma[1] === '23' && ma[2] === '35' && ma[3] === '23')
const mb = norm(frases.b).match(RE); t('variante b: 32s/45s/26 palavras', mb && mb[1] === '32' && mb[2] === '45' && mb[3] === '26')
const mc = norm(frases.c).match(RE); t('variante c (cauda truncada "T"): 33s/35s/2 palavras', mc && mc[1] === '33' && mc[2] === '35' && mc[3] === '2')
for (const bug of ['Voiceover generation failed. Please try again.', 'unknown', 'voiceover_script is required.', 'Your video access could not be verified. Nothing was submitted. Please retry.', 'Something went wrong. Please try again.'])
  t(`defeito real continua bug: "${bug.slice(0, 40)}"`, !norm(bug).match(RE))

t('classifyFailure devolve script_short com os 3 numeros', /kind: 'script_short',\s*short: \{ narrationSec: Number\(m\[1\]\), requestedSec: Number\(m\[2\]\), wordsMissing: Number\(m\[3\]\) \}/.test(src))
t('classifyFailure NAO e export (route.ts so exporta handlers)', !/export function classifyFailure/.test(src))
// #6 (03/09): `buildEmail` passou a receber `staleDays` — a copy "it is fixed
// now" so e verdade para falha recente. A escolha do builder nao mudou.
t('envio escolhe buildScriptShortEmail quando kind=script_short (#6: com ou sem numeros)', /a\.kind === 'script_short'\s*\? buildScriptShortEmail\(a\.id, a\.credits, a\.short\)[\s\S]{0,200}: buildEmail\(a\.id, a\.credits, a\.staleDays\)/.test(src))
t('assunto proprio para script_short', /Your video didn't render — here's the 30-second fix \(credits untouched\)/.test(src))
t('assunto de defeito preservado para bug', /'That was our fault — your credits are still there'/.test(src))

const fn = src.slice(src.indexOf('function buildScriptShortEmail'), src.indexOf('function isAuthorized'))
t('e-mail script_short NAO diz "our fault"', !/our fault/i.test(fn))
t('e-mail script_short NAO diz "bug on our side"', !/bug on our side/i.test(fn))
t('e-mail script_short NAO diz "fixed now"', !/fixed now/i.test(fn))
t('e-mail script_short NAO diz "the same idea will work now"', !/same idea will work/i.test(fn))
t('e-mail script_short traz narrationSec, requestedSec e wordsMissing', /\$\{s\.narrationSec\}/.test(fn) && /\$\{s\.requestedSec\}/.test(fn) && /\$\{s\.wordsMissing\}/.test(fn))
t('e-mail script_short diz que nada foi cobrado e mostra os creditos', /nothing was charged/i.test(fn) && /\$\{credits\} credits/.test(fn))
t('e-mail script_short nao promete cupom/desconto', !/coupon|discount|% off/i.test(fn))
t('e-mail script_short nao nomeia motor', !/Kling|Veo|Seedance|MiniMax|Omni|Sora/.test(fn))
t('utm_campaign separado (failure_recovery_script) para medir a parte', /utm_campaign=failure_recovery_script/.test(fn))
t('rodape de unsubscribe presente', /emailFooterHtml\(userId\)/.test(fn) && /emailFooterText\(userId\)/.test(fn))

// #6: o carimbo ganhou `fonte` (navegador x servidor), `stale_days` e
// `window_hours` — sem eles nao da para medir quantas pessoas so existem
// porque a terceira fonte passou a ser lida.
t('carimbo grava kind', /name: STAMP,\s*metadata: \{ falhas: a\.falhas, credits: a\.credits, kind: a\.kind/.test(src))
t('carimbo grava a fonte da falha (#6)', /fonte: a\.fonte/.test(src) && /stale_days: a\.staleDays/.test(src))
t('carimbo continua sendo failure_recovery_sent (1x por pessoa)', /const STAMP = 'failure_recovery_sent'/.test(src) && /if \(jaAvisado\.has\(id\)\) continue/.test(src))
t('dry-run mostra by_kind', /by_kind: \{\s*bug: alvos\.filter/.test(src))
t('"still holding" (render vivo segurando credito) saiu da lista de defeito', /'still holding',/.test(src) && /'already started is still',/.test(src))
// ⚠️ ESTA LINHA MUDOU DE VERDADE NO #6 (03/09), e a mudanca e o ponto da
// rodada. O fragmento solto `'credits'` classificava como "o produto disse
// nao corretamente" as NOSSAS PROPRIAS confissoes de defeito — todas elas
// terminam dizendo "your credits were refunded automatically". Resultado
// medido: 8 de 8 e-mails da historia foram `script_short` e o e-mail de
// defeito NUNCA saiu. O que precisa continuar excluido sao as RECUSAS
// LEGITIMAS, e agora elas estao por frase inteira.
t('recusa de saldo/plano segue excluida, agora por frase inteira (#6)', /'trial has',/.test(src) && /'full capacity',/.test(src) && /'This needs',/.test(src) && /'used all',/.test(src) && /'Add a plan',/.test(src))
t('o fragmento solto "credits" saiu da lista (#6)', !/^\s*'credits',$/m.test(src))
t('confissao de defeito vence a lista de recusas (#6)', /const DEFEITO_EXPLICITO = \[/.test(src) && /'on our side, not yours',/.test(src))
t('quem ja tem video completo continua fora', /if \(jaTemVideo\.has\(id\)\) continue/.test(src))
t('MAX_PER_RUN continua 25', /const MAX_PER_RUN = 25/.test(src))


// sprint-assinaturas #6 — a 2a forma do mesmo motivo, sem numeros
console.log('(f) narration_too_short sem numeros e script_short (nao bug)')
t('RE_NARRATION_SHORT_CODE existe', /const RE_NARRATION_SHORT_CODE = \/narration_too_short\|narration_guard\/i/.test(src))
t('classifyFailure devolve script_short para o codigo sem numeros', /if \(RE_NARRATION_SHORT_CODE\.test\(erro\)\) return \{ kind: 'script_short' \}/.test(src))
t('frase real do banco casa no codigo', /narration_too_short|narration_guard/i.test('no_detail:narration_too_short|stage=failed|http=none'))
t('builder generico existe e nao inventa segundos', /function buildScriptShortGenericEmail/.test(src) && !/\$\{s\./.test(src.slice(src.indexOf('function buildScriptShortGenericEmail'), src.indexOf('function isAuthorized'))))
t('generico nao tem a desculpa falsa', !/our fault|bug on our side|fixed now|same idea will work/i.test(src.slice(src.indexOf('function buildScriptShortGenericEmail'), src.indexOf('function isAuthorized'))))
t('envio: script_short SEM short usa o generico (nao cai em buildEmail)', /a\.kind === 'script_short'\s*\? buildScriptShortEmail\(a\.id, a\.credits, a\.short\)/.test(src) && /if \(!s\) return buildScriptShortGenericEmail\(userId, credits\)/.test(src))

console.log(`\n${ok} ok, ${bad} falhas`)
process.exit(bad ? 1 : 0)

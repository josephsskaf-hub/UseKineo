// sprint-v1v4 #21 — provas do degrau das legendas e do diagnostico da perda.
// A: a decisao pura (lib/voiceoverSalvage.ts).
// B: LE a rota compose e prova ordem da escada + telemetria LIGADA.
// C: prova que nada afrouxou (limpador canonico, 400 continua existindo).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0, fail = 0
const t = (n, c) => { if (c) ok++; else { fail++; console.error('  FALHOU: ' + n) } }

const src = fs.readFileSync(path.join(raiz, 'lib/voiceoverSalvage.ts'), 'utf8')
const js = src
  .replace(/^\s*export type CausaDaPerda[\s\S]*?\n\n/m, '\n')
  .replace(/: \(s: string\) => string/g, '')
  .replace(/: unknown/g, '')
  .replace(/: string\[\]/g, '')
  .replace(/\): string \{/g, ') {')
  .replace(/\): \{ causa: CausaDaPerda; detalhes: Record<string, number \| boolean> \} \{/g, ') {')
  .replace(/export function/g, 'function')
  .replace(/args: \{[\s\S]*?\n\}\) \{/m, 'args) {')
  .replace(/const detalhes = \{/, 'const detalhes = {')
const mod = new Function(js + '; return { narracaoDasLegendas, diagnosticarPerda }')()
const { narracaoDasLegendas, diagnosticarPerda } = mod

// limpador de mentirinha com o comportamento REAL que causou o bug de 13/08:
// derruba linha que e bullet, header ou so-MAIUSCULAS.
const limpar = (s) => String(s)
  .split('\n')
  .filter((l) => !/^\s*[-#]/.test(l) && !/^[A-Z0-9 ]+$/.test(l.trim()))
  .join(' ')
  .replace(/\[[^\]]*\]/g, '')
  .replace(/\s+/g, ' ')
  .trim()

console.log('BLOCO A — o degrau das legendas')
t('duas legendas viram narracao',
  narracaoDasLegendas(['Rome fell in a day', 'Nobody noticed'], limpar) === 'Rome fell in a day. Nobody noticed.')
t('pontuacao existente e preservada (nao duplica ponto)',
  narracaoDasLegendas(['Rome fell.', 'Nobody noticed!'], limpar) === 'Rome fell. Nobody noticed!')
t('interrogacao preservada',
  narracaoDasLegendas(['Who paid?', 'Nobody did'], limpar) === 'Who paid? Nobody did.')
t('UMA legenda so NAO vira roteiro (evita video de uma palavra)',
  narracaoDasLegendas(['Money'], limpar) === '')
t('zero legendas -> vazio', narracaoDasLegendas([], limpar) === '')
t('nao-array -> vazio', narracaoDasLegendas('Rome fell', limpar) === '')
t('null -> vazio', narracaoDasLegendas(null, limpar) === '')
t('undefined -> vazio', narracaoDasLegendas(undefined, limpar) === '')
t('itens nao-string sao ignorados',
  narracaoDasLegendas([1, {}, 'Rome fell', null, 'Nobody noticed'], limpar) === 'Rome fell. Nobody noticed.')
t('legendas vazias sao descartadas antes da contagem',
  narracaoDasLegendas(['   ', 'Rome fell', ''], limpar) === '')
t('PASSA pelo limpador canonico: marcador [Pexels] nao vaza',
  !narracaoDasLegendas(['[Pexels: rome] Rome fell', 'Nobody noticed'], limpar).includes('Pexels'))
t('PASSA pelo limpador: bullet e derrubado como em qualquer degrau',
  narracaoDasLegendas(['- HOOK', 'Rome fell', 'Nobody noticed'], limpar) === 'Rome fell. Nobody noticed.')
t('teto de 10000 caracteres respeitado',
  narracaoDasLegendas([('a'.repeat(9000)), ('b'.repeat(9000))], limpar).length === 10000)
t('legenda com so espaco nao conta como cena',
  narracaoDasLegendas(['Rome fell', '\t\n  '], limpar) === '')

console.log('BLOCO A2 — o diagnostico da causa')
const d = (b, l, tp) => diagnosticarPerda({ brutoRecebido: b, legendasRecebidas: l, topicoRecebido: tp }).causa
t('texto nunca chegou -> nunca_chegou (defeito de ESTADO)', d('', ['a', 'b'], 'x') === 'nunca_chegou')
t('undefined tambem e nunca_chegou', d(undefined, ['a'], 'x') === 'nunca_chegou')
t('so espacos tambem e nunca_chegou', d('   \n ', ['a'], 'x') === 'nunca_chegou')
t('chegou texto mas sem legendas -> sem_legendas', d('- HOOK', [], 'x') === 'sem_legendas')
t('chegou texto e legendas, sem topico -> sem_topico', d('- HOOK', ['a'], '') === 'sem_topico')
t('tudo presente e ainda assim vazio -> saneamento_comeu (defeito do LIMPADOR)',
  d('- HOOK', ['a'], 'x') === 'saneamento_comeu')
t('detalhes trazem o tamanho do bruto',
  diagnosticarPerda({ brutoRecebido: 'abc', legendasRecebidas: ['a'], topicoRecebido: 'z' }).detalhes.bruto_len === 3)
t('detalhes contam so legendas nao-vazias',
  diagnosticarPerda({ brutoRecebido: 'abc', legendasRecebidas: ['a', '', '  ', 'b'], topicoRecebido: 'z' }).detalhes.legendas_n === 2)
t('detalhes nao explodem com lixo',
  typeof diagnosticarPerda({ brutoRecebido: 42, legendasRecebidas: 'x', topicoRecebido: null }).detalhes.bruto_len === 'number')

console.log('BLOCO B — a rota compose')
const rota = fs.readFileSync(path.join(raiz, 'app/api/compose/route.ts'), 'utf8')
t('rota importa os dois', /import \{ narracaoDasLegendas, diagnosticarPerda \} from '@\/lib\/voiceoverSalvage'/.test(rota))
t('rota CHAMA narracaoDasLegendas com o limpador canonico',
  /narracaoDasLegendas\(body\.scene_captions, stripScriptMarkers\)/.test(rota))
t('rota CHAMA diagnosticarPerda', /diagnosticarPerda\(\{/.test(rota))
t("tipo de recovery ganhou 'captions'", /'none' \| 'lenient' \| 'captions' \| 'topic'/.test(rota))
t('grava voiceoverRecovery = captions', /voiceoverRecovery = 'captions'/.test(rota))
t('emite compose_refused com reason voiceover_lost', /logComposeRefusal\('voiceover_lost'/.test(rota))
t('a telemetria leva a causa', /causa: perda\.causa/.test(rota))
t('a telemetria leva a duracao (o 45 fantasma)', /duration: Number\(body\.duration\) \|\| null/.test(rota))
t('tem console.warn com a causa', /\[compose\] voiceover PERDIDO/.test(rota))

const iLenient = rota.indexOf("voiceoverRecovery = 'lenient'")
const iCaptions = rota.indexOf("voiceoverRecovery = 'captions'")
const iTopic = rota.indexOf("voiceoverRecovery = 'topic'")
const i400 = rota.indexOf("error: 'voiceover_script is required.'")
const iDiag = rota.indexOf('const perda = diagnosticarPerda')
t('ordem da escada: lenient ANTES de captions', iLenient > 0 && iCaptions > iLenient)
t('ordem da escada: captions ANTES de topic (legenda e mais fiel que topico)', iTopic > iCaptions)
t('a escada inteira vem ANTES do 400', i400 > iTopic && i400 > 0)
t('o diagnostico vem ANTES do 400', iDiag > 0 && iDiag < i400)
t('o diagnostico vem DEPOIS da escada (so diagnostica o que nao foi salvo)', iDiag > iTopic)

console.log('BLOCO C — nada afrouxou')
t('o 400 CONTINUA existindo', i400 > 0 && /status: 400/.test(rota))
t('degrau 1 (estrito) intacto', /let voiceoverScript = stripScriptMarkers\(rawVoiceover\)/.test(rota))
t('degrau 2 (tolerante) intacto', /salvageScriptNarration\(rawVoiceover\)/.test(rota))
t('degrau 4 (topic) intacto', /stripScriptMarkers\(\(body\.topic \?\? ''\)\.toString\(\)\)/.test(rota))
t('o log de recuperacao antigo continua', /\[compose\] voiceover recovered/.test(rota))
t('lib nova e pura (zero import)', !/^import /m.test(src))
t('lib nova nao toca banco/credito/preco', !/supabase|credit|price|stripe|plan\b/i.test(src.replace(/\/\/[^\n]*/g, '')))
t('lib nova nao tem limpador proprio (recebe o canonico injetado)',
  !/replace\(\/\\\[/.test(src) && /limpar: \(s: string\) => string/.test(src))

console.log(`\n${ok} verificacoes ok, ${fail} falharam`)
process.exit(fail === 0 ? 0 : 1)

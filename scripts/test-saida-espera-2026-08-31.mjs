// sprint-v1v4 #6 — a saida da espera deixa de ser invisivel.
// Le o CODIGO REAL (hook + caller) e prova o contrato. Sem mock.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const hook = readFileSync(join(raiz, 'components/video/useWaitAbandon.ts'), 'utf8')
const gc = readFileSync(join(raiz, 'app/(dashboard)/generate/GenerateClient.tsx'), 'utf8')
// comentarios fora: checagem de "nao encosta em X" roda sobre CODIGO
// (licao da rodada #4: o teste reprovava o proprio comentario que explicava).
const hookCodigo = hook.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

let ok = 0, mau = 0
const t = (nome, cond) => { if (cond) { ok++ } else { mau++; console.error('FALHOU:', nome) } }

// --- A. o hook existe e e cliente
t('A1 use client', hook.startsWith("'use client'"))
t('A2 export nomeado', /export function useWaitAbandon/.test(hook))
t('A3 export default', /export default useWaitAbandon/.test(hook))
t('A4 usa trackEvent do analytics', /from '@\/lib\/analytics'/.test(hook))

// --- B. os tres eventos, com os nomes exatos
for (const ev of ['render_wait_backgrounded', 'render_wait_returned', 'render_wait_abandoned']) {
  t(`B ${ev} emitido`, hookCodigo.includes(`trackEvent('${ev}'`))
}
t('B4 exatamente 3 trackEvent', (hookCodigo.match(/trackEvent\(/g) || []).length === 3)

// --- C. cada evento no maximo uma vez por render (dedupe por ref)
for (const r of ['jaAvisouSaidaRef', 'jaAvisouVoltaRef', 'jaAvisouAbandonoRef']) {
  t(`C ${r} declarado`, hookCodigo.includes(`const ${r} = useRef(false)`))
  t(`C ${r} guarda de saida`, new RegExp(`if \\(.*${r}\\.current\\)[\\s\\S]{0,30}return`).test(hookCodigo))
  t(`C ${r} marcado true`, hookCodigo.includes(`${r}.current = true`))
}

// --- D. reset quando o render acaba (senao o 2o video nasce mudo)
t('D1 ramo !ativo zera', /if \(!ativo\)/.test(hookCodigo))
for (const r of ['inicioRef', 'escondidoEmRef']) {
  t(`D ${r} zerado`, new RegExp(`${r}\\.current = null`).test(hookCodigo))
}
for (const r of ['jaAvisouSaidaRef', 'jaAvisouVoltaRef', 'jaAvisouAbandonoRef']) {
  t(`D ${r} zerado`, new RegExp(`${r}\\.current = false`).test(hookCodigo))
}

// --- E. ouvintes certos e sempre removidos
t('E1 pagehide, nao unload', hookCodigo.includes("'pagehide'") && !hookCodigo.includes("'unload'"))
t('E2 visibilitychange', hookCodigo.includes("'visibilitychange'"))
t('E3 remove visibilitychange', hookCodigo.includes('removeEventListener(\'visibilitychange\''))
t('E4 remove pagehide', hookCodigo.includes('removeEventListener(\'pagehide\''))
t('E5 addEventListener == removeEventListener',
  (hookCodigo.match(/addEventListener\(/g) || []).length === (hookCodigo.match(/removeEventListener\(/g) || []).length)
// comentario EXPLICA por que nao usamos beforeunload; a checagem e sobre codigo
t('E6 NADA de beforeunload (popup que faz fechar aba)', !hookCodigo.includes('beforeunload'))

// --- F. SSR-safe
t('F1 guarda document undefined', /typeof document === 'undefined'/.test(hookCodigo))
t('F2 guarda window undefined', /typeof window === 'undefined'/.test(hookCodigo))

// --- G. nenhum dado da pessoa viaja
for (const proibido of ['prompt', 'topic', 'email', 'script', 'voiceover', 'title']) {
  t(`G nao carrega ${proibido}`, !new RegExp(`\\b${proibido}\\b`, 'i').test(hookCodigo))
}
t('G7 payload so tem campos previstos',
  ['stage', 'mode', 'waited_s', 'away_s', 'was_backgrounded', 'hidden_at_exit']
    .every((c) => hookCodigo.includes(c)))

// --- H. nao encosta em dinheiro / pista do Codex
for (const proibido of ['stripe', 'checkout', 'price', 'credit', 'upgrade', 'plan']) {
  t(`H nao menciona ${proibido}`, !new RegExp(proibido, 'i').test(hookCodigo))
}

// --- I. sanitizacao do estagio
t('I1 estagioSeguro existe', /function estagioSeguro/.test(hookCodigo))
t('I2 whitelist de caracteres', /replace\(\/\[\^a-zA-Z0-9_\]\/g, ''\)/.test(hookCodigo))
t('I3 corta em MAX_ESTAGIO', /slice\(0, MAX_ESTAGIO\)/.test(hookCodigo))
t('I4 fallback unknown', hookCodigo.includes("return 'unknown'"))
t('I5 segundos com teto de 24h', /86400/.test(hookCodigo))
t('I6 segundos nunca negativos', /s >= 0/.test(hookCodigo))

// --- J. refs de estagio/modo lidos no momento do evento (nao capturados)
t('J1 estagioRef atualizado a cada render', /estagioRef\.current = estagio/.test(hookCodigo))
t('J2 modoRef atualizado a cada render', /modoRef\.current = modo/.test(hookCodigo))
t('J3 efeito depende SO de ativo', /\}, \[ativo\]\)/.test(hookCodigo))

// --- K. o caller: prova que o hook esta LIGADO (licao do sceneTruth,
//        biblioteca morta que foi resumida como pronta em 27/08)
t('K1 GenerateClient importa', gc.includes("import useWaitAbandon from '@/components/video/useWaitAbandon'"))
t('K2 GenerateClient chama', /useWaitAbandon\(\{/.test(gc))
t('K3 ativo = isProcessingPhase(phase)', /ativo: isProcessingPhase\(phase\)/.test(gc))
t('K4 estagio = phase', /estagio: phase/.test(gc))
t('K5 modo = mode', /modo: mode/.test(gc))
t('K6 isProcessingPhase existe no arquivo', /function isProcessingPhase\(p: Phase\)/.test(gc))
t('K7 chamada vem depois do import', gc.indexOf('useWaitAbandon({') > gc.indexOf("from '@/components/video/useWaitAbandon'"))
t('K8 exatamente uma chamada', (gc.match(/useWaitAbandon\(\{/g) || []).length === 1)

// --- L. o irmao continua vivo (nao quebrei o aviso de pronto)
t('L1 useReadyBeacon segue chamado', /useReadyBeacon\(phase === 'done'/.test(gc))

console.log(`${ok} verificacoes ok, ${mau} falhas`)
process.exit(mau === 0 ? 0 : 1)

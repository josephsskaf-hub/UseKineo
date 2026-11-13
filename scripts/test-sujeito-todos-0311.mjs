// KINEO-SUJEITO-TODOS-0311 [TRAVA 8.2 — fundador 03/11: "universalizar"] — guardião.
// Prova OFFLINE (leitura semântica MOCKADA, sem rede), EXECUTANDO o código REAL transpilado:
//   (A) o caso real do revisor (manobiayousaf 01/11, nota 5: "o avião C-54 que sumiu" sem avião): o sujeito entra na FRENTE do plano da
//       cena cuja fala o cita, inteiro, sem cortar o plano (o plano longo da estrada clássica não perde nada);
//   (B) sujeito já presente / sem pedido / leitura falhou = planos intactos; idempotente;
//   (C) a rota chama o passo nas DUAS estradas (clássica depois do supervisor fala×imagem; hollywood só nas cenas de narração) e grava o evento;
//   (M) mutantes ficam vermelhos.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const lf = (t) => String(t).replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const globals = { AbortController, setTimeout: () => 0, clearTimeout() {} }
const ARQ = 'lib/cinematic/sujeitoTodosMotores.ts'
const carrega = (mutar = null) => createOfflineLoader({ globals, source: (rel, text) => (mutar && rel === ARQ ? mutar(text) : text) })(ARQ)
const so = createOfflineLoader({ globals })('lib/cinematic/sujeitoObrigatorio.ts')

const PEDIDO = so.pedidoOriginalDoSujeito({ prompt: 'o avião C-54 que sumiu', ideiaSolta: true, scriptMode: 'ai', originalIdea: null, falas: ['Em 1950, um avião C-54 decolou do Alasca.', 'Trinta e oito pessoas a bordo.', 'Ele nunca chegou.'] })
const LEITURA = { ok: true, ms: 900, model: 'gpt-4o-mini', tentativas: 1, valor: { reasoning: 'The request is about a missing C-54 airplane.', word_use: 'literal', subject: 'a C-54 Skymaster airplane', head_noun: 'airplane', kind: 'vehicle', has_human: false, real_person: false, mention_words: ['avião', 'C-54'], request_language: 'pt', subject_visual_no_people: 'a C-54 Skymaster airplane', subject_visual: 'a C-54 Skymaster airplane', descartado: null } }
const FALAS = ['Em 1950, um avião C-54 decolou do Alasca.', 'Trinta e oito pessoas a bordo.', 'Ele nunca chegou.']
const LONGO = 'Two men in dark suits stand in a dim 1950s airfield office, studying a wall map under a hanging lamp, rain streaking the window behind them, cinematic side light, shallow depth of field, slow push-in on their worried faces as a clock ticks above the door'
const PLANOS = [LONGO, 'A crowded passenger cabin of the period, people seated by small round windows', 'An empty grey sky over snowy mountains']

function provas(m) {
  const erros = []
  if (!PEDIDO.pedido) { erros.push('fixture: pedido não confiável'); return erros }
  const r = m.exigirSujeitoEmTodos({ pedido: PEDIDO, leitura: LEITURA, falas: FALAS, planos: PLANOS, pessoaPermitida: true, estrada: 'classica' })
  const alvo = r.relato.cena
  if (!r.relato.corrigido || alvo === null) erros.push('A o sujeito ausente não foi corrigido: ' + JSON.stringify(r.relato.motivo_sem_sujeito))
  else {
    const p = r.planos[alvo - 1]
    if (!p.startsWith('Main subject clearly visible in frame:') || !/C-54/.test(p)) erros.push('A o sujeito não entrou na frente: ' + p.slice(0, 90))
    if (!p.endsWith(PLANOS[alvo - 1])) erros.push('A o plano original foi cortado')
    if (alvo !== 1) erros.push('A a cena escolhida não é a que cita o avião (cena ' + alvo + ')')
    if (r.planos.some((q, i) => i !== alvo - 1 && q !== PLANOS[i])) erros.push('A outra cena mudou')
    if (r.relato.estrada !== 'classica' || r.relato.versao !== 'sujeito_todos_0311_v1') erros.push('A relato sem estrada/versão')
    if (m.comSujeitoNoPlano(p, 'a C-54 Skymaster airplane') !== p) erros.push('B não é idempotente')
  }
  const ja = m.exigirSujeitoEmTodos({ pedido: PEDIDO, leitura: LEITURA, falas: FALAS, planos: ['A C-54 Skymaster airplane on a snowy runway', PLANOS[1], PLANOS[2]], pessoaPermitida: true, estrada: 'hollywood' })
  if (ja.relato.corrigido || !ja.relato.ja_presente) erros.push('B sujeito já presente foi mexido')
  const semPedido = m.exigirSujeitoEmTodos({ pedido: { pedido: null, fonte: null, motivo: 'roteiro_as_is' }, leitura: LEITURA, falas: FALAS, planos: PLANOS, pessoaPermitida: true, estrada: 'classica' })
  if (semPedido.planos.some((q, i) => q !== PLANOS[i])) erros.push('B sem pedido confiável mexeu nos planos')
  const falhou = m.exigirSujeitoEmTodos({ pedido: PEDIDO, leitura: { ok: false, erro: 'prazo', ms: 4000, model: 'gpt-4o-mini', tentativas: 2 }, falas: FALAS, planos: PLANOS, pessoaPermitida: true, estrada: 'classica' })
  if (falhou.planos.some((q, i) => q !== PLANOS[i])) erros.push('B leitura falhou e mexeu nos planos')
  return erros
}

const base = provas(carrega())
checa(`todas as provas verdes${base.length ? ': ' + base.join(' · ') : ''}`, base.length === 0)
const rota = lf(fs.readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8'))
const iAlinha = rota.indexOf("console.warn('[fala-x-imagem] falhou, planos originais seguem:'"), iClassico = Math.max(rota.indexOf("estrada: 'classica' })"), rota.indexOf("estrada: 'classica' }, leituraPronta1311())")) /* KINEO-PROTAGONISTA-1311 — a mesma chamada, com a leitura do sujeito reaproveitada */, iLugar = rota.indexOf('if (lugarDoPedido) for (let i = 0; i < scenes.length; i++) scenes[i].aiPrompt = ancorarLugarNoPrompt')
checa('C estrada clássica: depois do supervisor fala×imagem e antes do prompt final', iAlinha > 0 && iClassico > iAlinha && iLugar > iClassico)
const iAlinhaH = rota.indexOf("console.warn('[fala-x-imagem] hollywood falhou, planos originais seguem:'"), iH = rota.indexOf("estrada: 'hollywood' })"), iEstrela = rota.indexOf('KINEO-ESTRELA-DO-FILME-2026-09-29 [TRAVA 8.2 — vai do fundador 29/09 \'vai pra todas as 4\'] — a ESTRELA na estrada hollywood')
checa('C estrada hollywood: depois do supervisor e antes da estrela/POST', iAlinhaH > 0 && iH > iAlinhaH && iEstrela > iH)
checa('C hollywood só nas cenas de narração (diálogo intocado)', rota.includes("filter((i) => plan.scenes[i].type !== 'dialogue' && (plan.scenes[i].prompt ?? '').trim().length > 0) // KINEO-SUJEITO-TODOS-0311"))
checa('C o evento cinematic_required_subject é gravado nas duas', (rota.match(/name: SUJEITO_TODOS_EVENTO/g) ?? []).length === 2)
const MUTANTES = [
  ['sujeito no fim cortável', (s) => s.replace("return `${CLAUSULA} ${String(frase).trim().replace(/[.\\s]+$/, '')}. ${p}`.trim()", "return `${p} ${CLAUSULA} ${frase}.`.slice(0, 200)")],
  ['não aplica a correção', (s) => s.replace('if (relato.corrigido && relato.cena !== null && relato.sujeito) planos[relato.cena - 1] =', 'if (false) planos[0] =')],
  ['não é idempotente', (s) => s.replace('if (!frase || p.includes(CLAUSULA)) return p', 'if (!frase) return p')],
]
const src = lf(fs.readFileSync(ARQ, 'utf8'))
for (const [nome, fn] of MUTANTES) {
  const mudou = fn(src) !== src
  let e = ['(mutante não aplicou)']
  if (mudou) { try { e = provas(carrega(fn)) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
process.exit(falhas.length ? 1 : 0)

// KINEO-K4-SUJEITO-0111 + KINEO-FINAL-RESPOSTA-0111 — CALIBRAÇÃO da chamada semântica contra a API de verdade (v5).
// Roda as funções de produção (lerSujeitoDoPedido → avaliarSujeito, finalTemRespostaConcreta → fimSemResposta) sobre o conjunto
// rotulado e grava o conjunto, a resposta CRUA do modelo (o guardião offline reusa essas respostas como mock) e o placar — separado
// em AJUSTE (casos que o prompt viu) e CEGO (congelados antes da rodada) — em docs/calibracao/KINEO-K4-SUJEITO-0111.json.
// A chave vem de OPENAI_API_KEY no ambiente ou da linha OPENAI_API_KEY= de um .env.local (caminho em KINEO_ENV_LOCAL, padrão
// C:\kineo\.env.local); só é lida em memória — nunca impressa nem gravada.
// v6: grava também o reasoning (o campo gist não existe mais), o sujeito antes do corte do nome de pessoa (subject_original) e as
// chaves de presença que o código montou (núcleo exigido). Os casos rv5-* (revisão do c5dbdbcf3) entram no AJUSTE; até a próxima
// rodada com crédito, o guardião usa para eles respostas MOCKADAS (scripts/test-support/k4-sujeito-0111-v6-mocks.json).
// v7 (revisão do 21d3c2333): casos rv6-* (nome de pessoa em 'by X', possessivo de grupo, verbo no passado; lugar/navio/marca que
// ficam; presença frouxa) também com resposta MOCKADA. O juiz desta rodada passa a cobrar "proibido" (nome de pessoa no texto injetado =
// falso positivo GRAVE) e "presente"/"ausente" (a presença pelas chaves de produção; errar = perdeu_presenca). Ao rodar com crédito:
// conferir que 0 grave segue valendo, e trocar os mocks rv5/rv6 pelas respostas reais (o guardião lê o 'cru' gravado aqui).
// Rodar: npx tsx scripts/calibrar-k4-sujeito-final-0111.mts   (custo ~US$ 0,03; 2 passadas para medir estabilidade)
//        MOCK=1 npx tsx …   (ensaio sem rede e sem gravar: confere que o script roda e mostra o placar com os mocks)
//        CONJUNTO=ajuste npx tsx …   (só o ajuste, sem gravar: para mexer no prompt sem olhar o cego)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { lerSujeitoDoPedido, avaliarSujeito, promptMostraOSujeito, SYSTEM_SUJEITO_0111, MODELO_SEMANTICO_0111, SUJEITO_K4_VERSAO } from '@/lib/cinematic/sujeitoObrigatorio'
import { finalTemRespostaConcreta, finalFracoDoRoteiro, fimSemResposta, SYSTEM_FINAL_0111, FINAL_RESPOSTA_VERSAO } from '@/lib/cinematic/finalResposta'
import { CASOS_SUJEITO, CASOS_FINAL } from './calibracao-k4-sujeito-final-0111-casos.mjs'

function chave(): string {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY
  const env = process.env.KINEO_ENV_LOCAL ?? 'C:\\kineo\\.env.local'
  const linha = readFileSync(env, 'utf8').split(/\r?\n/).find((l) => /^\s*OPENAI_API_KEY\s*=/.test(l)) ?? ''
  return linha.replace(/^\s*OPENAI_API_KEY\s*=\s*/, '').replace(/^["']|["']$/g, '').trim()
}
// v7: MOCK=1 ensaia o script inteiro SEM rede e sem gravar — rv5/rv6 com as respostas mockadas, o resto com o 'cru' da última rodada
// real (prova que a recalibração roda antes de gastar; NÃO é medição)
const MOCK = process.env.MOCK === '1'
const MOCKS: Record<string, string> = MOCK ? { ...JSON.parse(readFileSync(join(import.meta.dirname, 'test-support', 'k4-sujeito-0111-v6-mocks.json'), 'utf8')).respostas, ...JSON.parse(readFileSync(join(import.meta.dirname, 'test-support', 'k4-sujeito-0111-v7-mocks.json'), 'utf8')).respostas } : {}
const GRAVADO = MOCK ? JSON.parse(readFileSync(join(import.meta.dirname, '..', 'docs', 'calibracao', 'KINEO-K4-SUJEITO-0111.json'), 'utf8')) : null
const apiKey = MOCK ? 'mock' : chave()
if (!apiKey) { console.error('sem OPENAI_API_KEY'); process.exit(1) }
function respostaMock(id: string, k: number, onde: 'sujeito' | 'final'): string {
  if (onde === 'sujeito' && MOCKS[id]) return MOCKS[id]
  const c = (GRAVADO[onde] as Array<{ id: string; passadas: Array<{ cru: string }> }>).find((x) => x.id === id)
  return c?.passadas[Math.min(k, c.passadas.length - 1)]?.cru ?? ''
}

/** fetch que guarda o conteúdo cru de cada resposta (para o mock do guardião). */
function gravador(mock?: { id: string; k: number; onde: 'sujeito' | 'final' }) {
  const crus: string[] = []
  const f: typeof fetch = async (url, init) => {
    const res = MOCK && mock ? new Response(JSON.stringify({ choices: [{ message: { content: respostaMock(mock.id, mock.k, mock.onde) } }] }), { status: 200 }) : await fetch(url, init)
    const texto = await res.text()
    try { crus.push(String(JSON.parse(texto).choices?.[0]?.message?.content ?? '')) } catch { crus.push('') }
    return new Response(texto, { status: res.status, headers: { 'Content-Type': 'application/json' } })
  }
  return { f, crus }
}

const PASSADAS = Number(process.env.PASSADAS ?? 2)
const SO = process.env.CONJUNTO ?? null // 'ajuste' = não olha o cego e não grava
const SO_SUJEITO = process.env.SO === 'sujeito', SO_FINAL = process.env.SO === 'final'
type Conta = { graves: number; posAcertos: number; posTotal: number; negOk: number; negTotal: number; ambOk: number; ambTotal: number; casos: number }
const nova = (): Conta => ({ graves: 0, posAcertos: 0, posTotal: 0, negOk: 0, negTotal: 0, ambOk: 0, ambTotal: 0, casos: 0 })
const contas: Record<string, Conta> = { ajuste: nova(), cego: nova() }
const resultadosSujeito: Array<Record<string, unknown>> = []
let instaveis = 0, falhas = 0
// em paralelo, de 6 em 6 (a ordem do resultado é a do conjunto)
async function emLotes<T, R>(itens: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < itens.length; i += n) out.push(...(await Promise.all(itens.slice(i, i + n).map(fn))))
  return out
}
const casosSujeito = (CASOS_SUJEITO as Array<Record<string, any>>).filter((c) => !SO || c.conjunto === SO)
const rodadasSujeito = SO_FINAL ? [] : await emLotes(casosSujeito, 6, async (c) => {
  const passadas: Array<Record<string, unknown>> = []
  for (let k = 0; k < PASSADAS; k++) {
    const g = gravador({ id: c.id, k, onde: 'sujeito' })
    const r = await lerSujeitoDoPedido(c.pedido, { apiKey, fetchImpl: g.f, timeoutMs: 10_000, prazoTotalMs: 21_000 })
    const a = avaliarSujeito({ leitura: r })
    passadas.push({ subject: a.sujeito?.frase ?? null, motivo: a.motivo, kind: r.ok ? r.valor.kind : null, head_noun: r.ok ? r.valor.head_noun : null, reasoning: r.ok ? r.valor.reasoning : null, subject_original: r.ok ? r.valor.subject_original : null, chaves: a.sujeito ? a.sujeito.chaves.map((re) => re.source) : null, presenca_ok: a.sujeito ? (c.presente ?? []).every((q: string) => promptMostraOSujeito(q, a.sujeito!)) && (c.ausente ?? []).every((q: string) => !promptMostraOSujeito(q, a.sujeito!)) : null, ok: r.ok, erro: r.ok ? null : r.erro, ms: r.ms, cru: g.crus[g.crus.length - 1] ?? '' })
  }
  return { c, passadas }
})
for (const { c, passadas } of rodadasSujeito) {
  const aceita = c.aceita ? new RegExp(c.aceita, 'i') : null
  const julga = (subject: string | null, presencaOk: boolean | null = null) => {
    if (subject && c.proibido && new RegExp(c.proibido).test(subject)) return 'falso_positivo_grave' // v7: nome de pessoa no texto injetado
    if (c.rotulo === 'neg') return subject ? 'falso_positivo_grave' : 'ok'
    if (c.rotulo === 'amb') return !subject ? 'ok' : aceita!.test(subject) ? 'ok' : 'falso_positivo_grave'
    if (!subject) return 'perdeu'
    if (aceita!.test(subject)) return presencaOk === false ? 'perdeu_presenca' : 'acerto'
    return c.secundario && new RegExp(c.secundario, 'i').test(subject) ? 'perdeu_secundario' : 'falso_positivo_grave'
  }
  const vereditos = passadas.map((x) => julga(x.subject as string | null, x.presenca_ok as boolean | null))
  const pior = ['falso_positivo_grave', 'perdeu_secundario', 'perdeu_presenca', 'perdeu'].find((v) => vereditos.includes(v)) ?? vereditos[0]
  if (new Set(passadas.map((x) => x.subject)).size > 1) instaveis++
  falhas += passadas.filter((x) => !x.ok).length
  const k = contas[c.conjunto]
  k.casos++
  if (pior === 'falso_positivo_grave') k.graves++
  if (c.rotulo === 'pos') { k.posTotal++; if (pior === 'acerto') k.posAcertos++ }
  if (c.rotulo === 'neg') { k.negTotal++; if (pior === 'ok') k.negOk++ }
  if (c.rotulo === 'amb') { k.ambTotal++; if (pior === 'ok') k.ambOk++ }
  resultadosSujeito.push({ ...c, veredito: pior, passadas })
  if (pior !== 'ok' && pior !== 'acerto' || process.env.VERBOSO) console.log(`${pior.padEnd(22)} ${c.conjunto} ${c.rotulo} ${c.id}: ${passadas.map((x) => x.subject ?? `null(${x.motivo})`).join(' | ')}`)
}

type ContaFim = { contados: number; acertos: number; fim_bom_reprovado: number; fim_fraco_aprovado: number }
const contasFim: Record<string, ContaFim> = { ajuste: { contados: 0, acertos: 0, fim_bom_reprovado: 0, fim_fraco_aprovado: 0 }, cego: { contados: 0, acertos: 0, fim_bom_reprovado: 0, fim_fraco_aprovado: 0 } }
const resultadosFinal: Array<Record<string, unknown>> = []
const casosFinal = (CASOS_FINAL as Array<Record<string, any>>).filter((c) => !SO || c.conjunto === SO)
const rodadasFinal = SO_SUJEITO ? [] : await emLotes(casosFinal, 6, async (c) => {
  const passadas: Array<Record<string, unknown>> = []
  for (let k = 0; k < PASSADAS; k++) {
    const g = gravador({ id: c.id, k, onde: 'final' })
    const r = await finalTemRespostaConcreta(c.roteiro, { apiKey, fetchImpl: g.f, timeoutMs: 10_000, prazoTotalMs: 21_000, pedido: c.pedido })
    passadas.push({ hook_promises_answer: r.ok ? r.valor.hook_promises_answer : null, ends_with_concrete_answer: r.ok ? r.valor.ends_with_concrete_answer : null, sem_resposta: r.ok ? fimSemResposta(r.valor) : null, ok: r.ok, erro: r.ok ? null : r.erro, ms: r.ms, cru: g.crus[g.crus.length - 1] ?? '' })
  }
  return { c, passadas }
})
for (const { c, passadas } of rodadasFinal) {
  const estreito = finalFracoDoRoteiro(c.roteiro)
  // o que o escritor faz: estreito primeiro; só sem estreito o juiz decide (e só "deve e não entrega" reprova)
  const fraco = passadas.map((x) => !!estreito || x.sem_resposta === true)
  let veredito = 'nao_conta'
  if (c.rotulo !== 'amb') {
    const k = contasFim[c.conjunto]
    k.contados++
    const certo = fraco.every((f) => f === !c.rotulo)
    if (certo) k.acertos++
    else if (c.rotulo === true) k.fim_bom_reprovado++
    else k.fim_fraco_aprovado++
    veredito = certo ? 'acerto' : c.rotulo === true ? 'fim_bom_reprovado' : 'fim_fraco_aprovado'
  }
  resultadosFinal.push({ id: c.id, conjunto: c.conjunto, rotulo: c.rotulo, pedido: c.pedido ?? null, estreito, veredito, passadas, roteiro: c.roteiro })
  console.log(`${veredito.padEnd(20)} ${c.conjunto} ${String(c.rotulo)} ${c.id}: estreito=${estreito} juiz=${passadas.map((x) => `${x.hook_promises_answer}/${x.ends_with_concrete_answer}`).join(' | ')}`)
}

const taxa = (a: number, b: number) => (b ? +(a / b).toFixed(3) : null)
const resumo = (k: Conta) => ({ casos: k.casos, falsos_positivos_graves: k.graves, positivos: { acertos: k.posAcertos, total: k.posTotal, taxa: taxa(k.posAcertos, k.posTotal) }, negativos_ok: `${k.negOk}/${k.negTotal}`, ambiguos_ok: `${k.ambOk}/${k.ambTotal}` })
const todos: Conta = Object.values(contas).reduce((t, k) => { for (const x of Object.keys(t) as Array<keyof Conta>) t[x] += k[x]; return t }, nova())
const casosS = CASOS_SUJEITO as Array<Record<string, any>>
const placar = {
  sujeito: { versao: SUJEITO_K4_VERSAO, passadas: PASSADAS, total: resumo(todos), ajuste: resumo(contas.ajuste), cego: resumo(contas.cego), instaveis_entre_passadas: instaveis, chamadas_que_falharam: falhas, origem: { revisao: casosS.filter((c) => c.origem === 'revisao').length, banco: casosS.filter((c) => c.origem === 'banco').length, inventado: casosS.filter((c) => c.origem === 'inventado').length } },
  final: { versao: FINAL_RESPOSTA_VERSAO, casos: CASOS_FINAL.length, ajuste: contasFim.ajuste, cego: contasFim.cego },
}
console.log(JSON.stringify(placar, null, 1))
if (SO || SO_SUJEITO || SO_FINAL || MOCK) { console.log(MOCK ? '(ensaio MOCK=1: nada gravado — não é medição)' : '(rodada parcial: nada gravado)'); process.exit(0) }
const dir = join(import.meta.dirname, '..', 'docs', 'calibracao')
if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
writeFileSync(join(dir, 'KINEO-K4-SUJEITO-0111.json'), JSON.stringify({
  marcador: 'KINEO-K4-SUJEITO-0111 + KINEO-FINAL-RESPOSTA-0111', rodado_em: new Date().toISOString(), modelo: MODELO_SEMANTICO_0111, temperatura: 0,
  regra: 'meta: 0 falso positivo grave (subject em neg, subject fora do aceito em amb/pos) e >= 85% de acerto nos positivos — no total E no conjunto cego (congelado antes da rodada); cada caso roda PASSADAS vezes e vale o pior veredito',
  system_sujeito: SYSTEM_SUJEITO_0111, system_final: SYSTEM_FINAL_0111, placar, sujeito: resultadosSujeito, final: resultadosFinal,
}, null, 1) + '\n')
console.log('gravado docs/calibracao/KINEO-K4-SUJEITO-0111.json')

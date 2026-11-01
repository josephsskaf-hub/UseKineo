// KINEO-K4-SUJEITO-0111 + KINEO-FINAL-RESPOSTA-0111 — CALIBRAÇÃO da chamada semântica (v4) contra a API de verdade.
// Roda as funções de produção (lerSujeitoDoPedido, finalTemRespostaConcreta) sobre o conjunto rotulado e grava o conjunto, a
// resposta CRUA do modelo (o guardião offline reusa essas respostas como mock) e o placar em docs/calibracao/KINEO-K4-SUJEITO-0111.json.
// A chave vem de OPENAI_API_KEY no ambiente ou da linha OPENAI_API_KEY= de um .env.local (caminho em KINEO_ENV_LOCAL, padrão
// C:\kineo\.env.local); só é lida em memória — nunca impressa nem gravada.
// Rodar: npx tsx scripts/calibrar-k4-sujeito-final-0111.mts   (custo ~US$ 0,01; 2 passadas para medir estabilidade)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { lerSujeitoDoPedido, sujeitoObrigatorio, SYSTEM_SUJEITO_0111, MODELO_SEMANTICO_0111 } from '@/lib/cinematic/sujeitoObrigatorio'
import { finalTemRespostaConcreta, finalFracoDoRoteiro, SYSTEM_FINAL_0111 } from '@/lib/cinematic/finalResposta'
import { CASOS_SUJEITO, CASOS_FINAL } from './calibracao-k4-sujeito-final-0111-casos.mjs'

function chave(): string {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY
  const env = process.env.KINEO_ENV_LOCAL ?? 'C:\\kineo\\.env.local'
  const linha = readFileSync(env, 'utf8').split(/\r?\n/).find((l) => /^\s*OPENAI_API_KEY\s*=/.test(l)) ?? ''
  return linha.replace(/^\s*OPENAI_API_KEY\s*=\s*/, '').replace(/^["']|["']$/g, '').trim()
}
const apiKey = chave()
if (!apiKey) { console.error('sem OPENAI_API_KEY'); process.exit(1) }

/** fetch que guarda o conteúdo cru de cada resposta (para o mock do guardião). */
function gravador() {
  const crus: string[] = []
  const f: typeof fetch = async (url, init) => {
    const res = await fetch(url, init)
    const texto = await res.text()
    try { crus.push(String(JSON.parse(texto).choices?.[0]?.message?.content ?? '')) } catch { crus.push('') }
    return new Response(texto, { status: res.status, headers: { 'Content-Type': 'application/json' } })
  }
  return { f, crus }
}

const PASSADAS = Number(process.env.PASSADAS ?? 2)
const resultadosSujeito: Array<Record<string, unknown>> = []
let graves = 0, posAcertos = 0, posTotal = 0, negOk = 0, negTotal = 0, ambOk = 0, ambTotal = 0, instaveis = 0, falhas = 0
for (const c of CASOS_SUJEITO) {
  const passadas: Array<{ subject: string | null; kind: string | null; real_person: boolean | null; descartado: string | null; ok: boolean; erro: string | null; ms: number; cru: string }> = []
  for (let k = 0; k < PASSADAS; k++) {
    const g = gravador()
    const r = await lerSujeitoDoPedido(c.pedido, { apiKey, fetchImpl: g.f, timeoutMs: 8_000, prazoTotalMs: 17_000 })
    const s = sujeitoObrigatorio({ leitura: r })
    passadas.push({ subject: s?.frase ?? null, kind: r.ok ? r.valor.kind : null, real_person: r.ok ? r.valor.real_person : null, descartado: r.ok ? r.valor.descartado : null, ok: r.ok, erro: r.ok ? null : r.erro, ms: r.ms, cru: g.crus[g.crus.length - 1] ?? '' })
  }
  const aceita = c.aceita ? new RegExp(c.aceita, 'i') : null
  const julga = (subject: string | null) => {
    if (c.rotulo === 'neg') return subject ? 'falso_positivo_grave' : 'ok'
    if (c.rotulo === 'amb') return !subject ? 'ok' : aceita!.test(subject) ? 'ok' : 'falso_positivo_grave'
    if (!subject) return 'perdeu'
    if (aceita!.test(subject)) return 'acerto'
    return c.secundario && new RegExp(c.secundario, 'i').test(subject) ? 'perdeu_secundario' : 'falso_positivo_grave'
  }
  const vereditos = passadas.map((x) => julga(x.subject))
  const pior = ['falso_positivo_grave', 'perdeu_secundario', 'perdeu'].find((v) => vereditos.includes(v)) ?? vereditos[0]
  if (new Set(passadas.map((x) => x.subject)).size > 1) instaveis++
  falhas += passadas.filter((x) => !x.ok).length
  if (pior === 'falso_positivo_grave') graves++
  if (c.rotulo === 'pos') { posTotal++; if (pior === 'acerto') posAcertos++ }
  if (c.rotulo === 'neg') { negTotal++; if (pior === 'ok') negOk++ }
  if (c.rotulo === 'amb') { ambTotal++; if (pior === 'ok') ambOk++ }
  resultadosSujeito.push({ ...c, veredito: pior, passadas })
  console.log(`${pior.padEnd(22)} ${c.rotulo} ${c.id}: ${passadas.map((x) => x.subject ?? `null(${x.descartado ?? x.erro})`).join(' | ')}`)
}

const resultadosFinal: Array<Record<string, unknown>> = []
let fimAcertos = 0, fimTotal = 0, fimFalsoFraco = 0, fimFalsoForte = 0
for (const c of CASOS_FINAL) {
  const estreito = finalFracoDoRoteiro(c.roteiro)
  const passadas: Array<{ ends_with_concrete_answer: boolean | null; ok: boolean; erro: string | null; ms: number; cru: string }> = []
  for (let k = 0; k < PASSADAS; k++) {
    const g = gravador()
    const r = await finalTemRespostaConcreta(c.roteiro, { apiKey, fetchImpl: g.f, timeoutMs: 8_000, prazoTotalMs: 17_000 })
    passadas.push({ ends_with_concrete_answer: r.ok ? r.valor.ends_with_concrete_answer : null, ok: r.ok, erro: r.ok ? null : r.erro, ms: r.ms, cru: g.crus[g.crus.length - 1] ?? '' })
  }
  // o que o escritor faz: estreito primeiro; só sem estreito o juiz decide
  const fraco = passadas.map((x) => !!estreito || x.ends_with_concrete_answer === false)
  let veredito = 'nao_conta'
  if (c.rotulo !== 'amb') {
    fimTotal++
    const certo = fraco.every((f) => f === !c.rotulo)
    if (certo) fimAcertos++
    else if (c.rotulo === true) fimFalsoFraco++
    else fimFalsoForte++
    veredito = certo ? 'acerto' : c.rotulo === true ? 'fim_bom_reprovado' : 'fim_fraco_aprovado'
  }
  resultadosFinal.push({ id: c.id, rotulo: c.rotulo, estreito, veredito, passadas, roteiro: c.roteiro })
  console.log(`${veredito.padEnd(20)} ${String(c.rotulo)} ${c.id}: estreito=${estreito} juiz=${passadas.map((x) => x.ends_with_concrete_answer).join('|')}`)
}

const placar = {
  sujeito: { casos: CASOS_SUJEITO.length, passadas: PASSADAS, falsos_positivos_graves: graves, positivos: { acertos: posAcertos, total: posTotal, taxa: +(posAcertos / posTotal).toFixed(3) }, negativos_ok: `${negOk}/${negTotal}`, ambiguos_ok: `${ambOk}/${ambTotal}`, instaveis_entre_passadas: instaveis, chamadas_que_falharam: falhas, origem: { revisao: CASOS_SUJEITO.filter((c) => c.origem === 'revisao').length, banco: CASOS_SUJEITO.filter((c) => c.origem === 'banco').length } },
  final: { casos: CASOS_FINAL.length, contados: fimTotal, acertos: fimAcertos, fim_bom_reprovado: fimFalsoFraco, fim_fraco_aprovado: fimFalsoForte },
}
console.log(JSON.stringify(placar, null, 1))
const dir = join(import.meta.dirname, '..', 'docs', 'calibracao')
if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
writeFileSync(join(dir, 'KINEO-K4-SUJEITO-0111.json'), JSON.stringify({
  marcador: 'KINEO-K4-SUJEITO-0111 + KINEO-FINAL-RESPOSTA-0111', rodado_em: new Date().toISOString(), modelo: MODELO_SEMANTICO_0111, temperatura: 0,
  regra: 'meta: 0 falso positivo grave (subject em neg, subject fora do aceito em amb/pos) e >= 85% de acerto nos positivos; cada caso roda PASSADAS vezes e vale o pior veredito',
  system_sujeito: SYSTEM_SUJEITO_0111, system_final: SYSTEM_FINAL_0111, placar, sujeito: resultadosSujeito, final: resultadosFinal,
}, null, 1) + '\n')
console.log('gravado docs/calibracao/KINEO-K4-SUJEITO-0111.json')

// KINEO-NOTA-AUTO-V3-1311 — ENSAIO da 3ª tentativa (régua inteira do revisor, lib/regua95/juizRegua19.ts).
// Mesma amostra e MESMA separação ajuste/prova do ensaio v2 (hash do link, por faixa de nota), mesmos quadros (cache do v2).
// A régua de nota (REGUA_JUIZ19) é a da 1ª tentativa, sem ajuste: a PROVA pode ser medida direto, sem vazar nada.
//
// Uso (um comando pesado por vez):
//   npx tsx scripts/calibra-nota-auto-v3-1311.mts <pasta> julgar <ajuste|prova> <modelo> [N]   → OpenAI (com teto)
//   npx tsx scripts/calibra-nota-auto-v3-1311.mts <pasta> casos <ajuste|prova>                 → casos em arquivo p/ subagentes Claude
//   npx tsx scripts/calibra-nota-auto-v3-1311.mts <pasta> relatorio
// <modelo>: 6.1-sol | 4o | 5.5 (tarifas oficiais conferidas em 13/11 em developers.openai.com/api/docs/pricing).
// Subagentes Claude: cada um lê <pasta>/v3/casos/<id>/caso.md + as imagens e grava resposta-<familia>.json na mesma pasta.
// TETO: US$ 6 no ensaio inteiro de 13/11 (v2 + v3): o livro-caixa do v3 soma ao do v2 e para antes de passar.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { planoDoNascimento, temposDosQuadros, type QuadroCena } from '@/lib/regua95/notaPorCena'
import { buildJuiz19, defeitosDoCodigo, julgar19, normalizar19, nota19, type Defeito19, type Entrada19 } from '@/lib/regua95/juizRegua19'
import { defeitosDaDescricao, julgarDoisPassos, normalizarPasso1, normalizarPasso2 } from '@/lib/regua95/juizDoisPassos'

const TETO_TOTAL_USD = 7 // CEO 13/11 17:50: teto subiu de US$ 6 para 7 só para medir o juiz consertado (6.1-sol-b) na prova inteira
const MODELOS: Record<string, { id: string; tarifa: { inPerM: number; outPerM: number }; reserva: number }> = {
  '6.1-sol': { id: 'gpt-6.1-sol', tarifa: { inPerM: 2, outPerM: 10 }, reserva: 0.12 },
  // '6.1-sol-b' = o MESMO modelo com o juiz consertado (marca da casa, época, comparação entre cenas; 13/11 noite) — cache próprio
  '6.1-sol-b': { id: 'gpt-6.1-sol', tarifa: { inPerM: 2, outPerM: 10 }, reserva: 0.12 },
  '5.5': { id: 'gpt-5.5', tarifa: { inPerM: 5, outPerM: 30 }, reserva: 0.3 },
  '4o': { id: 'gpt-4o', tarifa: { inPerM: 2.5, outPerM: 10 }, reserva: 0.05 },
}
const WORK = path.resolve(process.argv[2] ?? '.')
const V2 = path.join(WORK, 'v2')
const V3 = path.join(WORK, 'v3')
fs.mkdirSync(V3, { recursive: true })
const acao = process.argv[3] ?? 'relatorio'
const LIVRO = path.join(V3, 'livro-caixa.json')

type Caso = { link: string; nota: number; defeitos: string[] | null; video: { id: string; duration: number | null; topic: string | null; prompt: string | null; script: string | null; engine_used: string | null; quality_mode: string | null }; plan: Record<string, unknown> }
const hash = (s: string) => crypto.createHash('sha1').update(s).digest('hex')
const faixa = (n: number) => (n < 7 ? 'ruim' : n >= 7.5 ? 'bom' : 'sete')
function carregar(): { ajuste: Caso[]; prova: Caso[] } {
  const todos = (JSON.parse(fs.readFileSync(path.join(V2, 'amostra-v2.json'), 'utf8')) as Caso[]).map((c) => ({ ...c, nota: Number(c.nota) }))
  const ajuste: Caso[] = [], prova: Caso[] = []
  for (const f of ['ruim', 'sete', 'bom']) todos.filter((c) => faixa(c.nota) === f).sort((a, b) => hash(a.link).localeCompare(hash(b.link))).forEach((c, i) => (i % 2 === 0 ? ajuste : prova).push(c))
  return { ajuste, prova }
}
const lerEnv = (a: string) => Object.fromEntries(fs.readFileSync(a, 'utf8').split(/\r?\n/).map((l) => /^([A-Z0-9_]+)=(.*)$/.exec(l.trim())).filter((m): m is RegExpExecArray => !!m).map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, '')]))
const pedidoDe = (c: Caso) => c.video.topic || c.video.prompt || String(c.plan.prompt ?? '') || ''

/** Entrada do juiz a partir do cache do v2 (duração real gravada na resposta do v2; quadros já extraídos). */
function entrada(c: Caso, comArquivo = false): (Entrada19 & { arquivos: string[] }) | null {
  const resp2 = fs.existsSync(path.join(V2, 'respostas-4o.json')) ? JSON.parse(fs.readFileSync(path.join(V2, 'respostas-4o.json'), 'utf8')) : {}
  const resp2m = fs.existsSync(path.join(V2, 'respostas-mini.json')) ? JSON.parse(fs.readFileSync(path.join(V2, 'respostas-mini.json'), 'utf8')) : {}
  const seg = Number((resp2[c.link] ?? resp2m[c.link])?.segundos)
  if (!(seg > 0)) return null
  const plano = planoDoNascimento(c.plan, seg)
  if (!plano) return null
  const dir = path.join(V2, 'quadros', c.video.id)
  const tempos = temposDosQuadros(plano)
  const quadros: QuadroCena[] = []
  const arquivos: string[] = []
  for (const [mi, m] of plano.momentos.entries()) {
    for (const [k, t] of tempos[mi].entries()) {
      const arq = path.join(dir, `m${String(m.m).padStart(2, '0')}_${k}_${t.toFixed(2)}.jpg`)
      if (!fs.existsSync(arq)) return null
      arquivos.push(arq)
      quadros.push({ url: comArquivo ? `file:${arq}` : `data:image/jpeg;base64,${fs.readFileSync(arq).toString('base64')}`, t, m: m.m })
    }
  }
  return { plano, quadros, arquivos, pedido: pedidoDe(c), roteiro: c.video.script, produto: 'filme', motor: c.video.engine_used ?? c.video.quality_mode, segundos: seg, segundosPedidos: Number(c.plan.requested_duration) || Number(c.plan.duration) || null, linguaEscolhida: typeof c.plan.language === 'string' ? c.plan.language : null }
}

type Guardado = { bruto: unknown; usd: number; ms: number; model: string }
const respArq = (k: string) => path.join(V3, `respostas-${k}.json`)
const lerResp = (k: string): Record<string, Guardado | null> => (fs.existsSync(respArq(k)) ? JSON.parse(fs.readFileSync(respArq(k), 'utf8')) : {})

async function julgar(metade: 'ajuste' | 'prova', k: string, soN: number) {
  // '2p-<modelo>' = juiz em dois passos (descrição às cegas + comparação em texto) com o mesmo modelo nos dois passos
  const dois = k.startsWith('2p-')
  const m = MODELOS[dois ? k.slice(3) : k]
  if (!m) throw new Error(`modelo desconhecido: ${k}`)
  const env = lerEnv('C:/kineo/.env.local')
  const gastoV2 = fs.existsSync(path.join(V2, 'livro-caixa.json')) ? Number(JSON.parse(fs.readFileSync(path.join(V2, 'livro-caixa.json'), 'utf8')).gasto) : 0
  const livro = fs.existsSync(LIVRO) ? JSON.parse(fs.readFileSync(LIVRO, 'utf8')) : { gasto: 0, chamadas: 0 }
  const resp = lerResp(k)
  let feitos = 0
  // 'prova28' = o subconjunto da prova usado também pelos subagentes Claude (casos intercalados por faixa de nota)
  const sub = soN === -1 ? new Set(JSON.parse(fs.readFileSync(path.join(V3, 'subconjunto-28.json'), 'utf8')) as string[]) : null
  // 'ajuste29' (soN = -2) = metade da metade de ajuste, intercalada (mantém as faixas de nota): o teto de US$ 7 não cobre as 57
  const lista = soN === -2 ? carregar().ajuste.filter((_, i) => i % 2 === 0) : carregar()[metade].filter((x) => !sub || sub.has(x.video.id.slice(0, 8))).slice(0, soN < 0 ? Infinity : soN)
  for (const c of lista) {
    if (resp[c.link] !== undefined) continue
    if (gastoV2 + livro.gasto + m.reserva > TETO_TOTAL_USD) { console.log(`TETO: v2 US$ ${gastoV2.toFixed(3)} + v3 US$ ${livro.gasto.toFixed(3)} — parei`); break }
    const e = entrada(c)
    if (!e) { resp[c.link] = null; continue }
    const r = dois
      ? await julgarDoisPassos(e, { provedor: 'openai', modeloVisao: m.id, apiKey: env.OPENAI_API_KEY, tarifaVisao: m.tarifa })
      : await julgar19(e, { provedor: 'openai', model: m.id, apiKey: env.OPENAI_API_KEY, tarifa: m.tarifa })
    if (!r) { console.log(`· ${c.video.id.slice(0, 8)} sem resposta`); continue }
    livro.gasto = Math.round((livro.gasto + r.usd) * 1e6) / 1e6
    livro.chamadas++
    resp[c.link] = { bruto: r.bruto, usd: r.usd, ms: r.ms, model: m.id }
    fs.writeFileSync(LIVRO, JSON.stringify(livro, null, 1))
    fs.writeFileSync(respArq(k), JSON.stringify(resp))
    feitos++
    console.log(`${metade} ${k} ${String(feitos).padStart(3)} ${c.video.id.slice(0, 8)} rev ${c.nota.toFixed(1)} juiz ${r.nota.toFixed(1)} · ${(r.ms / 1000).toFixed(0)} s · US$ ${r.usd.toFixed(4)} · v3 ${livro.gasto.toFixed(3)} (total ${(gastoV2 + livro.gasto).toFixed(3)})`)
  }
}

/** Casos em arquivo para os subagentes Claude: o MESMO texto (sistema + pedido + plano + fala por quadro) e as imagens. */
function casos(metade: 'ajuste' | 'prova') {
  const lista: string[] = []
  for (const c of carregar()[metade]) {
    const e = entrada(c, true)
    if (!e) continue
    const dir = path.join(V3, 'casos', c.video.id.slice(0, 8))
    fs.mkdirSync(dir, { recursive: true })
    const { system, content } = buildJuiz19(e)
    const corpo: string[] = ['# INSTRUÇÕES DO JUIZ (siga exatamente)', '', system, '', '# O FILME', '']
    let img = 0
    for (const p of content) {
      if (p.type === 'text') corpo.push(p.text)
      else corpo.push(`[IMAGEM: abra com a ferramenta Read o arquivo ${e.arquivos[img++].replace(/\\/g, '/')}]`)
    }
    fs.writeFileSync(path.join(dir, 'caso.md'), corpo.join('\n'))
    lista.push(c.video.id.slice(0, 8))
  }
  fs.writeFileSync(path.join(V3, `casos-${metade}.json`), JSON.stringify(lista))
  console.log(`${lista.length} casos em ${path.join(V3, 'casos')}`)
}

function medir(casos: Caso[], respostaDe: (c: Caso) => Guardado | null) {
  let n = 0, mae = 0, ruins = 0, pegos = 0, bons = 0, alarmes = 0, usd = 0, ms = 0, comMs = 0
  for (const c of casos) {
    const g = respostaDe(c)
    const e = g ? entrada(c, true) : null
    if (!g || !e) continue
    let todos: Defeito19[]
    const b = g.bruto as { passo1?: unknown; passo2?: unknown }
    if (b && typeof b === 'object' && 'passo1' in b) {
      const desc = normalizarPasso1(b.passo1, e.quadros.length)
      todos = [...normalizarPasso2(b.passo2, e.quadros.length).defeitos, ...defeitosDaDescricao(desc, e), ...defeitosDoCodigo(e)]
    } else todos = [...normalizar19(g.bruto, e).defeitos, ...defeitosDoCodigo(e)]
    const nota = nota19(todos)
    n++; mae += Math.abs(nota - c.nota); usd += g.usd || 0
    if (g.ms) { ms += g.ms; comMs++ }
    if (c.nota < 7) { ruins++; if (nota < 7) pegos++ } else if (c.nota >= 7.5) { bons++; if (nota < 7) alarmes++ }
  }
  return { n, mae: n ? mae / n : 0, ruins, pegos, bons, alarmes, usd: n ? usd / n : 0, seg: comMs ? ms / comMs / 1000 : null }
}
const pct = (a: number, b: number) => (b ? `${a}/${b} = ${Math.round((100 * a) / b)}%` : '—')

function relatorio() {
  const { ajuste, prova } = carregar()
  const out = ['| Metade | Juiz | Filmes | Acerto nos ruins (<7) | Alarme falso (≥7,5 → <7) | Erro médio | Custo/filme | s/filme | Veredito |', '|---|---|---|---|---|---|---|---|---|']
  const fontes: Array<[string, (c: Caso) => Guardado | null]> = [...Object.keys(MODELOS).map((k): [string, (c: Caso) => Guardado | null] => [`OpenAI ${MODELOS[k].id}${k.endsWith('-b') ? ' (consertado)' : ''}`, (c: Caso) => lerResp(k)[c.link] ?? null]), ...Object.keys(MODELOS).map((k): [string, (c: Caso) => Guardado | null] => [`dois passos ${MODELOS[k].id}`, (c: Caso) => lerResp(`2p-${k}`)[c.link] ?? null])]
  for (const fam of ['haiku', 'sonnet', 'opus']) {
    fontes.push([`Claude ${fam} (subagente)`, (c: Caso) => {
      const arq = path.join(V3, 'casos', c.video.id.slice(0, 8), `resposta-${fam}.json`)
      if (!fs.existsSync(arq)) return null
      try { return { bruto: JSON.parse(fs.readFileSync(arq, 'utf8')), usd: 0, ms: 0, model: fam } } catch { return null }
    }])
  }
  const sub28 = fs.existsSync(path.join(V3, 'subconjunto-28.json')) ? new Set(JSON.parse(fs.readFileSync(path.join(V3, 'subconjunto-28.json'), 'utf8')) as string[]) : new Set<string>()
  for (const [nome, casos] of [['ajuste', ajuste], ['prova', prova], ['prova (28)', prova.filter((c) => sub28.has(c.video.id.slice(0, 8)))]] as const) {
    for (const [juiz, f] of fontes) {
      const m = medir(casos, f)
      if (!m.n) continue
      const passa = m.ruins > 0 && m.bons > 0 && m.pegos / m.ruins >= 0.85 && m.alarmes / m.bons <= 0.1
      out.push(`| ${nome} | ${juiz} | ${m.n} | ${pct(m.pegos, m.ruins)} | ${pct(m.alarmes, m.bons)} | ${m.mae.toFixed(2)} | ${m.usd ? `US$ ${m.usd.toFixed(4)}` : 'n/d'} | ${m.seg ? m.seg.toFixed(0) : 'n/d'} | ${passa ? 'PASSOU' : 'NÃO PASSOU'} |`)
    }
  }
  fs.writeFileSync(path.join(V3, 'relatorio-v3.md'), out.join('\n'))
  console.log(out.join('\n'))
}

async function main() {
  if (acao === 'julgar') await julgar(process.argv[4] === 'ajuste' || process.argv[4] === 'ajuste29' ? 'ajuste' : 'prova', process.argv[5] ?? '6.1-sol', process.argv[4] === 'prova28' ? -1 : process.argv[4] === 'ajuste29' ? -2 : Number(process.argv[6]) > 0 ? Number(process.argv[6]) : Infinity)
  else if (acao === 'casos') casos(process.argv[4] === 'ajuste' ? 'ajuste' : 'prova')
  else relatorio()
}
main().catch((e) => { console.error(String(e?.message ?? e)); process.exit(1) })

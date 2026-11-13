// KINEO-NOTA-AUTO-V2-1311 — ENSAIO da 2ª tentativa (juiz POR CENA, lib/regua95/notaPorCena.ts) contra TODAS as notas de
// filme que o revisor já deu (film_review_notes produto='filme').
//
// Separação AJUSTE × PROVA (decidida antes de qualquer chamada, por hash do link, estratificada por faixa de nota:
// < 7, 7,0, ≥ 7,5): os pesos da régua (REGUA_NOTA_CENA) só são procurados no AJUSTE; a PROVA roda uma vez com a régua já
// congelada no código. Nada da prova volta para o ajuste.
//
// Uso (um comando pesado por vez):
//   npx tsx scripts/calibra-nota-auto-v2-1311.mts <pasta> julgar <ajuste|prova> <4o|mini> [N]   → chama a visão (com teto)
//   npx tsx scripts/calibra-nota-auto-v2-1311.mts <pasta> ajustar <4o|mini>                    → procura os pesos no ajuste
//   npx tsx scripts/calibra-nota-auto-v2-1311.mts <pasta> relatorio                            → tabela das duas metades
// <pasta>/v2/amostra-v2.json = o SELECT (film_review_notes ⋈ videos ⋈ evento de nascimento), exportado pelo conector:
//   [{link, quando, nota, defeitos, resumo, fonte, video:{id,duration,topic,prompt,script,engine_used,quality_mode}, plan:{…response}}]
// TETO: US$ 3 neste ensaio (livro-caixa próprio em <pasta>/v2/livro-caixa.json; para antes de passar).
// Chave: OPENAI_API_KEY de C:\kineo\.env.local, nunca impressa.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import {
  REGUA_NOTA_CENA, defeitosDasRespostas, julgarNotaCena, normalizarRespostas, notaDasRespostas, planoDoNascimento, temposDosQuadros,
  type ContagemCena, type PlanoFilme, type QuadroCena, type ReguaNotaCena,
} from '@/lib/regua95/notaPorCena'

const TETO_USD = 3
const RESERVA_POR_CHAMADA = { '4o': 0.035, mini: 0.01 } as const // maior custo visto no ajuste: 4o US$ 0,031 · mini US$ 0,006
const MODELO = { '4o': AI_TEXT_MODELS.writer, mini: AI_TEXT_MODELS.research } as const
type ChaveModelo = keyof typeof MODELO
const LARGURA = 432

const WORK = path.resolve(process.argv[2] ?? '.')
const V2 = path.join(WORK, 'v2')
const acao = process.argv[3] ?? 'relatorio'
fs.mkdirSync(V2, { recursive: true })
const LIVRO = path.join(V2, 'livro-caixa.json')
const respArq = (k: ChaveModelo) => path.join(V2, `respostas-${k}.json`)

type Caso = {
  link: string; quando: string; nota: number; defeitos: string[] | null; resumo: string | null; fonte: string | null
  video: { id: string; duration: number | null; topic: string | null; prompt: string | null; script: string | null; engine_used: string | null; quality_mode: string | null }
  plan: Record<string, unknown>
}
type Guardado = { bruto: unknown; usd: number; model: string; frames: number; ms: number; segundos: number }

const faixa = (n: number) => (n < 7 ? 'ruim' : n >= 7.5 ? 'bom' : 'sete')
const hash = (s: string) => crypto.createHash('sha1').update(s).digest('hex')

function carregar(): { ajuste: Caso[]; prova: Caso[] } {
  const todos = (JSON.parse(fs.readFileSync(path.join(V2, 'amostra-v2.json'), 'utf8')) as Caso[]).map((c) => ({ ...c, nota: Number(c.nota) }))
  const ajuste: Caso[] = []
  const prova: Caso[] = []
  for (const f of ['ruim', 'sete', 'bom']) {
    const grupo = todos.filter((c) => faixa(c.nota) === f).sort((a, b) => hash(a.link).localeCompare(hash(b.link)))
    grupo.forEach((c, i) => (i % 2 === 0 ? ajuste : prova).push(c))
  }
  return { ajuste, prova }
}

function lerEnv(arquivo: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const l of fs.readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(l.trim())
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  return out
}

const pedidoDe = (c: Caso) => c.video.topic || c.video.prompt || String(c.plan.prompt ?? '') || ''

/** Duração real, plano e quadros (ffmpeg local, 432 px). null = vídeo não abre. */
function prepararQuadros(c: Caso): { plano: PlanoFilme; quadros: QuadroCena[] } | null {
  const mp4 = path.join(WORK, 'mp4', `${c.video.id}.mp4`)
  fs.mkdirSync(path.dirname(mp4), { recursive: true })
  try {
    if (!fs.existsSync(mp4) || fs.statSync(mp4).size < 10_000) execFileSync('curl', ['-sSfL', '--max-time', '180', '-o', mp4, c.link])
  } catch {
    return null
  }
  let dur = 0
  try {
    dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4]).toString().trim())
  } catch {
    return null
  }
  if (!(dur > 0)) return null
  const plano = planoDoNascimento(c.plan, dur)
  if (!plano) return null
  const tempos = temposDosQuadros(plano)
  const dir = path.join(V2, 'quadros', c.video.id)
  fs.mkdirSync(dir, { recursive: true })
  const quadros: QuadroCena[] = []
  plano.momentos.forEach((m, mi) => {
    tempos[mi].forEach((t, k) => {
      const arq = path.join(dir, `m${String(m.m).padStart(2, '0')}_${k}_${t.toFixed(2)}.jpg`)
      if (!fs.existsSync(arq)) execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(Math.min(t, dur - 0.05)), '-i', mp4, '-frames:v', '1', '-vf', `scale=${LARGURA}:-2`, '-q:v', '4', arq])
      quadros.push({ url: `data:image/jpeg;base64,${fs.readFileSync(arq).toString('base64')}`, t, m: m.m })
    })
  })
  return { plano, quadros }
}

async function julgar(metade: 'ajuste' | 'prova', k: ChaveModelo, soN: number) {
  const env = lerEnv('C:/kineo/.env.local')
  if (!env.OPENAI_API_KEY) throw new Error('falta OPENAI_API_KEY no .env.local')
  const livro: { gasto: number; chamadas: number } = fs.existsSync(LIVRO) ? JSON.parse(fs.readFileSync(LIVRO, 'utf8')) : { gasto: 0, chamadas: 0 }
  const resp: Record<string, Guardado | null> = fs.existsSync(respArq(k)) ? JSON.parse(fs.readFileSync(respArq(k), 'utf8')) : {}
  const salvar = () => { fs.writeFileSync(LIVRO, JSON.stringify(livro, null, 1)); fs.writeFileSync(respArq(k), JSON.stringify(resp)) }
  const casos = carregar()[metade].slice(0, soN)
  let feitos = 0
  for (const c of casos) {
    if (resp[c.link] !== undefined) continue
    if (livro.gasto + RESERVA_POR_CHAMADA[k] > TETO_USD) { console.log(`TETO: gasto US$ ${livro.gasto.toFixed(3)} — parei`); break }
    const q = prepararQuadros(c)
    if (!q) { resp[c.link] = null; salvar(); console.log(`· ${c.video.id.slice(0, 8)} sem vídeo/plano — fora`); continue }
    const r = await julgarNotaCena({ plano: q.plano, quadros: q.quadros, pedido: pedidoDe(c), produto: 'filme', motor: c.video.engine_used ?? c.video.quality_mode }, { apiKey: env.OPENAI_API_KEY, model: MODELO[k], detail: 'high' })
    if (!r) { console.log(`· ${c.video.id.slice(0, 8)} sem resposta (não gravado; tenta de novo na próxima)`); continue }
    livro.gasto = Math.round((livro.gasto + r.usd) * 1e6) / 1e6
    livro.chamadas++
    resp[c.link] = { bruto: r.bruto, usd: r.usd, model: r.model, frames: r.frames, ms: r.ms, segundos: q.plano.segundos }
    salvar()
    feitos++
    console.log(`${metade} ${k} ${String(feitos).padStart(3)} ${c.video.id.slice(0, 8)} rev ${c.nota.toFixed(1)} juiz ${r.nota.toFixed(1)} · ${q.plano.momentos.length} mom · US$ ${r.usd.toFixed(4)} · total ${livro.gasto.toFixed(3)}`)
  }
  console.log(`fim: ${feitos} chamadas novas · gasto do ensaio US$ ${livro.gasto.toFixed(3)} em ${livro.chamadas} chamadas`)
}

type Linha = { c: Caso; contagem: ContagemCena; defeitos: ReturnType<typeof defeitosDasRespostas>['defeitos']; usd: number }
function linhas(casos: Caso[], k: ChaveModelo): Linha[] {
  const resp: Record<string, Guardado | null> = fs.existsSync(respArq(k)) ? JSON.parse(fs.readFileSync(respArq(k), 'utf8')) : {}
  const out: Linha[] = []
  for (const c of casos) {
    const g = resp[c.link]
    if (!g) continue
    const plano = planoDoNascimento(c.plan, g.segundos)
    if (!plano) continue
    const { respostas } = normalizarRespostas(g.bruto, plano)
    const { defeitos, contagem } = defeitosDasRespostas(respostas, plano, pedidoDe(c))
    out.push({ c, contagem, defeitos, usd: g.usd })
  }
  return out
}

type Medida = { n: number; mae: number; ruins: number; pegos: number; bons: number; alarmes: number; setes: number; alarmesSete: number; usdFilme: number }
function medir(ls: Linha[], regua: ReguaNotaCena): Medida {
  let soma = 0, ruins = 0, pegos = 0, bons = 0, alarmes = 0, setes = 0, alarmesSete = 0, usd = 0
  for (const l of ls) {
    const n = notaDasRespostas(l.contagem, regua)
    soma += Math.abs(n - l.c.nota)
    usd += l.usd
    if (l.c.nota < 7) { ruins++; if (n < 7) pegos++ }
    else if (l.c.nota >= 7.5) { bons++; if (n < 7) alarmes++ }
    else { setes++; if (n < 7) alarmesSete++ }
  }
  return { n: ls.length, mae: ls.length ? soma / ls.length : 0, ruins, pegos, bons, alarmes, setes, alarmesSete, usdFilme: ls.length ? usd / ls.length : 0 }
}
const pct = (a: number, b: number) => (b ? `${a}/${b} = ${Math.round((100 * a) / b)}%` : '—')
const passa = (m: Medida) => m.ruins > 0 && m.bons > 0 && m.pegos / m.ruins >= 0.85 && m.alarmes / m.bons <= 0.1

/** Procura os pesos SÓ no ajuste: o que pega mais ruins com alarme ≤ 10%; empate → menor erro médio. */
function ajustar(k: ChaveModelo) {
  const ls = linhas(carregar().ajuste, k)
  if (!ls.length) throw new Error('sem respostas do ajuste')
  const G = {
    base: [7.5, 8, 8.5, 9], semSujeito: [0, 2, 4, 6], acao: [0, 2, 4, 6, 8], troca: [0, 0.5, 1, 1.5, 2, 3], texto: [0, 0.5, 1, 2], epoca: [0, 1, 2, 3],
  }
  let melhor: { r: ReguaNotaCena; m: Medida; dentro: boolean } | null = null
  for (const base of G.base) for (const semSujeito of G.semSujeito) for (const ac of G.acao) for (const troca of G.troca) for (const texto of G.texto) for (const epoca of G.epoca) {
    const r = { ...REGUA_NOTA_CENA, base, semSujeito, acao: ac, troca, texto, epoca }
    const m = medir(ls, r)
    const dentro = m.bons > 0 && m.alarmes / m.bons <= 0.1
    const melhorQue = !melhor
      || (dentro && !melhor.dentro)
      || (dentro === melhor.dentro && (dentro ? m.pegos > melhor.m.pegos || (m.pegos === melhor.m.pegos && m.mae < melhor.m.mae) : m.pegos - 3 * m.alarmes > melhor.m.pegos - 3 * melhor.m.alarmes))
    if (melhorQue) melhor = { r, m, dentro }
  }
  console.log(`AJUSTE ${k}: ${ls.length} filmes · régua achada ${JSON.stringify(melhor!.r)}`)
  console.log(`  acerto nos ruins ${pct(melhor!.m.pegos, melhor!.m.ruins)} · alarme ${pct(melhor!.m.alarmes, melhor!.m.bons)} · erro médio ${melhor!.m.mae.toFixed(2)}`)
  const atual = medir(ls, REGUA_NOTA_CENA)
  console.log(`  (régua do código hoje: acerto ${pct(atual.pegos, atual.ruins)} · alarme ${pct(atual.alarmes, atual.bons)} · erro ${atual.mae.toFixed(2)})`)
  fs.writeFileSync(path.join(V2, `regua-ajustada-${k}.json`), JSON.stringify(melhor, null, 1))
}

/** Qual pergunta dispara em quem: nos ruins (o que acerta) e nos bons (o alarme). */
function porPergunta(ls: Linha[]) {
  const qs: Array<[string, (c: ContagemCena) => boolean]> = [
    ['1 sujeito', (c) => c.semSujeito > 0], ['2 ação', (c) => c.acao > 0], ['3 mesma pessoa', (c) => c.troca > 0], ['4 texto', (c) => c.texto > 0], ['5 época/lugar', (c) => c.epoca > 0],
  ]
  const ruins = ls.filter((l) => l.c.nota < 7)
  const bons = ls.filter((l) => l.c.nota >= 7.5)
  return qs.map(([q, f]) => `| ${q} | ${ruins.filter((l) => f(l.contagem)).length}/${ruins.length} | ${bons.filter((l) => f(l.contagem)).length}/${bons.length} |`).join('\n')
}

/** A régua de cada modelo = a que o ajuste DELE achou (arquivo gravado antes da prova); o gpt-4o é o padrão do código. */
function reguaDe(k: ChaveModelo): ReguaNotaCena {
  const arq = path.join(V2, `regua-ajustada-${k}.json`)
  return fs.existsSync(arq) ? (JSON.parse(fs.readFileSync(arq, 'utf8')).r as ReguaNotaCena) : REGUA_NOTA_CENA
}

function relatorio() {
  const { ajuste, prova } = carregar()
  const out: string[] = [`# Nota automática v2 (juiz por cena), ensaio 13/11`, '', `Ajuste ${ajuste.length} filmes · prova ${prova.length} filmes (separados por hash do link antes de qualquer chamada).`, `Régua congelada no código (a do ajuste do gpt-4o): ${JSON.stringify(REGUA_NOTA_CENA)}`, ...(Object.keys(MODELO) as ChaveModelo[]).map((k) => `Régua usada para ${MODELO[k]}: ${JSON.stringify(reguaDe(k))}`), '']
  out.push('| Metade | Modelo | Filmes | Erro médio | Acerto nos ruins (<7) | Alarme falso (≥7,5 → <7) | Alarme nos 7,0 | Custo/filme | Veredito |', '|---|---|---|---|---|---|---|---|---|')
  for (const [nome, casos] of [['ajuste', ajuste], ['prova', prova]] as const) {
    for (const k of Object.keys(MODELO) as ChaveModelo[]) {
      const ls = linhas(casos, k)
      if (!ls.length) continue
      const m = medir(ls, reguaDe(k))
      out.push(`| ${nome} | ${MODELO[k]} | ${m.n} | ${m.mae.toFixed(2)} | ${pct(m.pegos, m.ruins)} | ${pct(m.alarmes, m.bons)} | ${pct(m.alarmesSete, m.setes)} | US$ ${m.usdFilme.toFixed(4)} | ${passa(m) ? 'PASSOU' : 'NÃO PASSOU'} |`)
    }
  }
  for (const k of Object.keys(MODELO) as ChaveModelo[]) {
    const ls = linhas([...ajuste, ...prova], k)
    if (!ls.length) continue
    out.push('', `## Qual pergunta dispara (${MODELO[k]}, ajuste + prova)`, '', '| Pergunta | Nos ruins (<7) | Nos bons (≥7,5) |', '|---|---|---|', porPergunta(ls))
    out.push('', `## Filme a filme (${MODELO[k]})`, '', '| Metade | Filme | Revisor | Juiz | Defeitos do revisor | O que o juiz achou |', '|---|---|---|---|---|---|')
    const metade = new Map([...ajuste.map((c) => [c.link, 'ajuste'] as const), ...prova.map((c) => [c.link, 'prova'] as const)])
    for (const l of ls.sort((a, b) => a.c.nota - b.c.nota)) {
      const achou = l.defeitos.map((d) => `${d.categoria}@m${d.m}: ${d.evidencia.slice(0, 90)}`).join(' · ') || '—'
      out.push(`| ${metade.get(l.c.link)} | ${l.c.video.id.slice(0, 8)} | ${l.c.nota.toFixed(1)} | ${notaDasRespostas(l.contagem, reguaDe(k)).toFixed(1)} | ${(l.c.defeitos ?? []).join(', ')} | ${achou.replace(/\|/g, '/')} |`)
    }
  }
  fs.writeFileSync(path.join(V2, 'relatorio-v2.md'), out.join('\n'))
  console.log(out.slice(0, 12).join('\n'))
  console.log(`relatório: ${path.join(V2, 'relatorio-v2.md')}`)
}

async function main() {
  if (acao === 'julgar') {
    const metade = process.argv[4] === 'prova' ? 'prova' : 'ajuste'
    const k = (process.argv[5] === 'mini' ? 'mini' : '4o') as ChaveModelo
    await julgar(metade, k, Number(process.argv[6]) > 0 ? Number(process.argv[6]) : Infinity)
  } else if (acao === 'ajustar') {
    ajustar((process.argv[4] === 'mini' ? 'mini' : '4o') as ChaveModelo)
  } else if (acao === 'separar') {
    const { ajuste, prova } = carregar()
    for (const [n, l] of [['ajuste', ajuste], ['prova', prova]] as const) console.log(`${n}: ${l.length} (ruins ${l.filter((c) => c.nota < 7).length} · 7,0 ${l.filter((c) => c.nota === 7).length} · bons ${l.filter((c) => c.nota >= 7.5).length})`)
  } else relatorio()
}
main().catch((e) => { console.error(String(e?.message ?? e)); process.exit(1) })

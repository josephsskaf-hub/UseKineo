// KINEO-NOTA-AUTO-1311 — ENSAIO da nota automática (lib/regua95/notaRevisor.ts) contra as notas que o REVISOR já deu.
//
// O que faz (só leitura no banco; o único gasto é a visão da OpenAI, com TETO):
//   1. film_review_notes produto='filme' dos últimos 10 dias + videos (pedido, roteiro, motor) pelo link;
//   2. escolhe até 40 filmes cujo link ainda abre: metade com nota do revisor < 7, metade ≥ 7 (todos os ≥ 7,5 primeiro);
//   3. baixa o MP4, tira 12 quadros com ffmpeg local (720 px de largura, JPEG) → data URLs;
//   4. roda o juiz com cada modelo de visão do registro (lib/aiModels.ts) em detail "high" e compara com o revisor.
// Mede por modelo: erro médio absoluto; dos ruins do revisor (< 7), quantos o juiz também deu < 7 (meta ≥ 85%);
// dos bons (≥ 7,5), quantos o juiz derrubou para < 7 (meta ≤ 10%); custo por filme.
// TETO: US$ 3 no total (soma do usd de cada chamada, gravado num livro-caixa que sobrevive a nova execução; para ao bater).
// Cache: quadros e respostas ficam em disco — rodar de novo não gasta de novo o que já foi julgado.
//
// Rodar: npx tsx scripts/calibra-nota-auto-1311.mts [pasta-de-trabalho]
// Chaves: lidas de C:\kineo\.env.local (OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY); nunca impressas.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import { NOTA_AUTO_FRAMES, julgarNotaAuto, notaDosDefeitos, type NotaAutoResultado, type QuadroAuto } from '@/lib/regua95/notaRevisor'

const TETO_USD = 3
const ALVO = 40
const DIAS = 10
const MODELOS: Array<{ model: string; detail: 'high' }> = [
  { model: AI_TEXT_MODELS.research, detail: 'high' }, // gpt-4.1-mini: o melhor de visão barato do registro
  { model: AI_TEXT_MODELS.writer, detail: 'high' }, // gpt-4o: o modelo do pixel_score, agora em "high"
]

const WORK = path.resolve(process.argv[2] ?? path.join(process.env.TEMP ?? '.', 'kineo-nota-auto-1311'))
/** 3º argumento opcional: julga só os N primeiros filmes da amostra (prova do encanamento antes do ensaio inteiro). */
const SO_N = Number(process.argv[3]) > 0 ? Number(process.argv[3]) : Infinity
fs.mkdirSync(WORK, { recursive: true })
const LIVRO = path.join(WORK, 'livro-caixa.json')
const RESP = path.join(WORK, 'respostas.json')

function lerEnv(arquivo: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const l of fs.readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(l.trim())
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  return out
}
const env = lerEnv('C:/kineo/.env.local')
const SB = env.NEXT_PUBLIC_SUPABASE_URL
const SBK = env.SUPABASE_SERVICE_ROLE_KEY
const OAI = env.OPENAI_API_KEY
if (!OAI) throw new Error('falta OPENAI_API_KEY no .env.local')
/**
 * A cópia local do .env.local não tem a chave de serviço do Supabase (só o modelo "your-…"). Sem ela, a amostra vem de
 * <pasta>/amostra.json — o mesmo SELECT (film_review_notes ⋈ videos pelo link), exportado pelo conector do banco:
 * [{link, quando, nota, defeitos, motor, fonte, video: {id, video_url, topic, prompt, script, engine_used, quality_mode, duration}}].
 */
const AMOSTRA = path.join(WORK, 'amostra.json')
const temSupabase = !!SB && /^https:\/\/[a-z0-9]+\.supabase\.co/.test(SB) && !!SBK && !/^your/i.test(SBK)

async function rest<T>(q: string): Promise<T> {
  const r = await fetch(`${SB}/rest/v1/${q}`, { headers: { apikey: SBK, Authorization: `Bearer ${SBK}` } })
  if (!r.ok) throw new Error(`supabase ${r.status}`)
  return (await r.json()) as T
}

type Nota = { link: string; quando: string; nota: number; defeitos: string[]; motor: string | null; fonte: string | null }
type Video = { id: string; video_url: string; topic: string | null; prompt: string | null; script: string | null; engine_used: string | null; quality_mode: string | null; duration: number | null }
type Caso = Nota & { video: Video }

const livro: { gasto: number; chamadas: number } = fs.existsSync(LIVRO) ? JSON.parse(fs.readFileSync(LIVRO, 'utf8')) : { gasto: 0, chamadas: 0 }
const respostas: Record<string, NotaAutoResultado> = fs.existsSync(RESP) ? JSON.parse(fs.readFileSync(RESP, 'utf8')) : {}
const salvar = () => { fs.writeFileSync(LIVRO, JSON.stringify(livro, null, 1)); fs.writeFileSync(RESP, JSON.stringify(respostas, null, 1)) }

async function abre(url: string): Promise<boolean> {
  try { const r = await fetch(url, { method: 'HEAD' }); return r.ok } catch { return false }
}

function quadros(caso: Caso): QuadroAuto[] | null {
  const dir = path.join(WORK, 'quadros', caso.video.id)
  const prontos = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).sort() : []
  const tempos = path.join(dir, 'tempos.json')
  if (prontos.length !== NOTA_AUTO_FRAMES || !fs.existsSync(tempos)) {
    fs.mkdirSync(dir, { recursive: true })
    const mp4 = path.join(WORK, 'mp4', `${caso.video.id}.mp4`)
    fs.mkdirSync(path.dirname(mp4), { recursive: true })
    if (!fs.existsSync(mp4)) execFileSync('curl', ['-sSL', '--max-time', '120', '-o', mp4, caso.link])
    const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4]).toString().trim())
    if (!(dur > 0)) return null
    const ts: number[] = []
    for (let i = 0; i < NOTA_AUTO_FRAMES; i++) {
      const t = Math.round(((i * Math.max(0, dur - 0.15)) / (NOTA_AUTO_FRAMES - 1)) * 100) / 100
      ts.push(t)
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', mp4, '-frames:v', '1', '-vf', 'scale=720:-2', '-q:v', '4', path.join(dir, `q${String(i).padStart(2, '0')}.jpg`)])
    }
    fs.writeFileSync(tempos, JSON.stringify(ts))
  }
  const ts = JSON.parse(fs.readFileSync(tempos, 'utf8')) as number[]
  const arqs = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).sort()
  if (arqs.length !== NOTA_AUTO_FRAMES) return null
  return arqs.map((f, i) => ({ url: `data:image/jpeg;base64,${fs.readFileSync(path.join(dir, f)).toString('base64')}`, t: ts[i] ?? null }))
}

async function main() {
  const casos = temSupabase ? await casosDoBanco() : (JSON.parse(fs.readFileSync(AMOSTRA, 'utf8')) as Caso[]).map((c) => ({ ...c, nota: Number(c.nota) }))
  if (!temSupabase) console.log(`amostra lida de ${AMOSTRA} (sem chave de serviço do Supabase no .env.local)`)
  const ruins = casos.filter((c) => c.nota < 7)
  const bons = casos.filter((c) => c.nota >= 7.5)
  const setes = casos.filter((c) => c.nota === 7)
  const escolhidos: Caso[] = []
  const pega = async (lista: Caso[], quantos: number) => {
    let n = 0
    for (const c of lista) { if (n >= quantos) break; if (await abre(c.link)) { escolhidos.push(c); n++ } }
    return n
  }
  const nRuins = await pega(ruins, ALVO / 2)
  const nBons = await pega(bons, ALVO / 2)
  await pega(setes, ALVO / 2 - nBons)
  console.log(`amostra: ${escolhidos.length} filmes (ruins<7: ${nRuins} · bons≥7,5: ${nBons} · 7,0: ${escolhidos.length - nRuins - nBons}) de ${casos.length} na janela`)
  await julgarTodos(escolhidos)
}

async function casosDoBanco(): Promise<Caso[]> {
  const desde = new Date(Date.now() - DIAS * 86400e3).toISOString()
  const notas = await rest<Nota[]>(`film_review_notes?select=link,quando,nota,defeitos,motor,fonte&produto=eq.filme&quando=gte.${desde}&order=quando.desc`)
  const links = notas.map((n) => n.link)
  const videos: Video[] = []
  for (let i = 0; i < links.length; i += 30) {
    const part = links.slice(i, i + 30).map((l) => `"${l}"`).join(',')
    videos.push(...await rest<Video[]>(`videos?select=id,video_url,topic,prompt,script,engine_used,quality_mode,duration&video_url=in.(${encodeURIComponent(part)})`))
  }
  const porLink = new Map(videos.map((v) => [v.video_url, v]))
  return notas.filter((n) => porLink.has(n.link)).map((n) => ({ ...n, nota: Number(n.nota), video: porLink.get(n.link)! }))
}

async function julgarTodos(escolhidos: Caso[]) {
  for (const m of MODELOS) {
    for (const c of escolhidos.slice(0, SO_N)) {
      const chave = `${m.model}|${m.detail}|${c.video.id}`
      if (respostas[chave]) continue
      if (livro.gasto >= TETO_USD) { console.log(`TETO US$ ${TETO_USD} atingido (gasto ${livro.gasto.toFixed(3)}) — parando`); salvar(); return relatorio(escolhidos) }
      let qs: QuadroAuto[] | null = null
      try { qs = quadros(c) } catch (e) { console.log(`  quadros falharam ${c.video.id.slice(0, 8)}: ${(e as Error).message.slice(0, 80)}`) }
      if (!qs) continue
      const r = await julgarNotaAuto({ quadros: qs, pedido: c.video.topic || c.video.prompt || '', roteiro: c.video.script, produto: 'filme', motor: c.video.engine_used ?? c.video.quality_mode, segundos: c.video.duration }, { apiKey: OAI, model: m.model, detail: m.detail })
      livro.chamadas++
      if (!r) { console.log(`  sem resposta ${m.model} ${c.video.id.slice(0, 8)}`); salvar(); continue }
      livro.gasto += r.usd
      respostas[chave] = r
      salvar()
      console.log(`  ${m.model} ${c.video.id.slice(0, 8)} revisor ${c.nota} · juiz ${r.nota} [${r.defeitos.map((d) => `${d.categoria}${d.gravidade === 'grave' ? '!' : ''}`).join(',')}] US$ ${r.usd.toFixed(4)} · total ${livro.gasto.toFixed(3)}`)
    }
  }
  relatorio(escolhidos)
}

function relatorio(escolhidos: Caso[]) {
  const linhas: string[] = []
  const tabela: string[] = ['| Modelo | Filmes julgados | Erro médio abs. | Acerto nos ruins (<7) | Alarme falso (≥7,5 → <7) | Custo/filme | Veredito |', '|---|---|---|---|---|---|---|']
  for (const m of MODELOS) {
    // a nota é RECALCULADA pela régua de hoje a partir dos defeitos guardados: mudar a régua não exige pagar a visão de novo.
    const pares = escolhidos.map((c) => ({ c, r: respostas[`${m.model}|${m.detail}|${c.video.id}`] })).filter((p) => p.r).map((p) => ({ ...p, r: { ...p.r, nota: notaDosDefeitos(p.r.defeitos) } }))
    if (!pares.length) continue
    const mae = pares.reduce((a, p) => a + Math.abs(p.r.nota - p.c.nota), 0) / pares.length
    const ruins = pares.filter((p) => p.c.nota < 7)
    const pegos = ruins.filter((p) => p.r.nota < 7)
    const bons = pares.filter((p) => p.c.nota >= 7.5)
    const alarmes = bons.filter((p) => p.r.nota < 7)
    const custo = pares.reduce((a, p) => a + p.r.usd, 0) / pares.length
    const acerto = ruins.length ? pegos.length / ruins.length : 0
    const alarme = bons.length ? alarmes.length / bons.length : 0
    const passou = acerto >= 0.85 && alarme <= 0.1
    tabela.push(`| ${m.model} (${m.detail}) | ${pares.length} | ${mae.toFixed(2)} | ${pegos.length}/${ruins.length} = ${(acerto * 100).toFixed(0)}% | ${alarmes.length}/${bons.length} = ${(alarme * 100).toFixed(0)}% | US$ ${custo.toFixed(4)} | ${passou ? 'PASSOU' : 'NÃO PASSOU'} |`)
    // onde erra: categorias do revisor nos ruins que o juiz NÃO apontou
    const perdidas = new Map<string, { vistos: number; pegos: number }>()
    for (const p of ruins) {
      const doJuiz = new Set(p.r.defeitos.map((d) => d.categoria))
      for (const cat of new Set(p.c.defeitos.map((d) => d.split(' ')[0]))) {
        const k = perdidas.get(cat) ?? { vistos: 0, pegos: 0 }
        k.vistos++
        if (doJuiz.has(cat as never)) k.pegos++
        perdidas.set(cat, k)
      }
    }
    linhas.push(`\n### ${m.model} — categorias do revisor nos filmes ruins × o juiz apontou a mesma`)
    for (const [cat, k] of Array.from(perdidas.entries()).sort((a, b) => b[1].vistos - a[1].vistos)) linhas.push(`- ${cat}: ${k.pegos}/${k.vistos}`)
    linhas.push(`\n### ${m.model} — filme a filme (revisor × juiz)`)
    for (const p of pares.sort((a, b) => a.c.nota - b.c.nota)) linhas.push(`- ${p.c.video.id.slice(0, 8)} ${p.c.video.engine_used ?? '?'} · revisor ${p.c.nota} [${p.c.defeitos.join(', ')}] · juiz ${p.r.nota} [${p.r.defeitos.map((d) => `${d.categoria}${d.gravidade === 'grave' ? '!' : ''}@${d.quadros.join('/')}`).join(', ')}] · descartados ${p.r.descartados}`)
  }
  const out = [`# Ensaio nota_auto — ${new Date().toISOString()}`, `Gasto total do ensaio: US$ ${livro.gasto.toFixed(3)} em ${livro.chamadas} chamadas (teto US$ ${TETO_USD}).`, '', ...tabela, ...linhas].join('\n')
  fs.writeFileSync(path.join(WORK, 'relatorio.md'), out)
  console.log('\n' + tabela.join('\n'))
  console.log(`\nrelatório: ${path.join(WORK, 'relatorio.md')}`)
}

main().catch((e) => { salvar(); console.error('falhou:', (e as Error).message, String((e as { cause?: unknown }).cause ?? '').slice(0, 200)); process.exit(1) })

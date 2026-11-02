// KINEO-PROTAGONISTA-SEEDANCE-0111 — calibração do elenco semântico contra a API de verdade (gpt-4o-mini, ~US$ 0,03 por rodada).
// Lê OPENAI_API_KEY do .env.local (nunca imprime, nunca grava). Grava docs/calibracao/protagonista-seedance-0111.json com a
// resposta crua de cada caso (o guardião versionado usa essas respostas como mock) e a nota de cada um.
// Rodar: npx tsx scripts/calibrar-protagonista-seedance-0111.mts [caminho/.env.local]
// Revisão 01/11 (rodada 6): a chave estava sem crédito (429) — os 12 casos novos (8 PT/ES FORA da amostra do prompt, fonte 'pt-es-fora', e 4
// defeitos da revisão, fonte 'rev-0111b') só têm resposta MOCKADA (scripts/test-support/protagonista-seedance-0111-mocks.json). Esta rodada
// os mede de verdade. Se mais de 20% das chamadas falharem (sem crédito, fora do ar), NADA é gravado: a calibração anterior fica intacta.
// Revisão 01/11 (rodada 7): +9 casos fonte 'rev-0111c' (aparência com plural falso, cor inventada e recombinação; roteiro inglês curto com
// species_en/appearance_en trocados; "Sunny" que é palavra comum; frase curta PT/ES), também só MOCKADOS (a chave seguia em 429).
// Revisão 01/11 (rodada 8, superfície reduzida — v5): o modelo só diz quem, o kind e a species; +11 casos (o Tommy real de 01/11, render
// 49b015e8, e 10 textos da revisão: roteiro inglês curto, PT/ES curto, "Snow" com a cor de outra frase, "Rocky" com as Rocky Mountains).
// A chave voltou a ter crédito: os 217 casos (os 21 antes só mockados inclusive) são medidos na API de verdade.
// Métrica nova species_en_troca_em_ingles: em roteiro INGLÊS (id sem prefixo pt-/es-), quantas respostas reais trazem species_en diferente
// da species — sem detector de língua, o species_en é usado como tradução da palavra original que está no texto, então é aqui que um
// "pigeon" → "eagle" do modelo apareceria.
// Revisão 02/11 (rodada 12, v9): o prompt pede age_text/role_text como TRECHO LITERAL (sem age_if_stated/age_evidence); +13 casos fonte
// 'rev-0211a' (os 12 da revisão da rodada 11 na API + o Roland do Rick) e as expectativas de "literal" passam a ser as palavras do autor.
// Revisão 02/11 (rodada 13): +16 casos fonte 'rev-0211b' (os 12 da revisão da rodada 12 na API + bebês em meses/semanas: Lucas 18 months,
// Sofía dieciocho meses, Nora six weeks, Davi 3 meses).
// Modos:
//   npx tsx scripts/calibrar-protagonista-seedance-0111.mts [.env.local]            → mede os 206 casos e regrava a calibração (o guardião usa)
//   npx tsx scripts/calibrar-protagonista-seedance-0111.mts [.env.local] --mockados → mede SÓ os casos que hoje têm resposta mockada e grava
//        docs/calibracao/protagonista-seedance-0111-mockados.json (não mexe na calibração principal; ~US$ 0,004) — para comparar o mock com o real
import fs from 'node:fs'
import path from 'node:path'
import { pedirElencoSemantico, ELENCO_SEMANTICO_MODELO, ELENCO_SEMANTICO_PRAZO_MS, ELENCO_SEMANTICO_VERSAO } from '../lib/cinematic/elencoSemantico'
import { avaliar, type Caso } from './test-support/avaliar-protagonista-seedance-0111.mts'

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const args = process.argv.slice(2)
const soMockados = args.includes('--mockados')
const envPath = args.find((a) => !a.startsWith('--')) ?? 'C:/kineo/.env.local'
const linha = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => /^\s*OPENAI_API_KEY\s*=/.test(l))
const apiKey = linha ? linha.replace(/^\s*OPENAI_API_KEY\s*=\s*/, '').replace(/^["']|["']$/g, '').trim() : ''
if (!apiKey) { console.error('OPENAI_API_KEY ausente no .env.local'); process.exit(2) }

const todos: Caso[] = JSON.parse(fs.readFileSync(path.join(raiz, 'scripts/test-support/protagonista-seedance-0111-casos.json'), 'utf8'))
const mockados = new Set(Object.keys((JSON.parse(fs.readFileSync(path.join(raiz, 'scripts/test-support/protagonista-seedance-0111-mocks.json'), 'utf8')) as { respostas: Record<string, string> }).respostas))
const casos: Caso[] = soMockados ? todos.filter((c) => mockados.has(c.id)) : todos
const resultados: Array<Record<string, unknown>> = new Array(casos.length)
let prox = 0
async function trabalhador() {
  while (prox < casos.length) {
    const i = prox++
    const c = casos[i]
    const r = await pedirElencoSemantico(c.texto, { apiKey })
    const nota = avaliar(c, r.elenco)
    resultados[i] = { id: c.id, fonte: c.fonte, status: r.status, tentativas: r.tentativas, ms: r.ms, raw: r.raw, nota }
    console.log(`${nota.graves.length ? 'GRAVE' : nota.acerto ? ' ok  ' : ' erro'} ${c.id.padEnd(22)} ${r.status} ${String(r.ms).padStart(5)}ms prot=${nota.protagonista ?? '-'} ${nota.kind ?? ''}/${nota.species ?? ''} ${[...nota.graves, ...nota.erros].join(' ')}`)
  }
}
await Promise.all(Array.from({ length: 6 }, trabalhador))
const falhasRede = resultados.filter((r) => r.status === 'falhou' || r.status === 'sem_chave').length
if (falhasRede > casos.length * 0.2) { console.error(`${falhasRede}/${casos.length} chamadas sem resposta (crédito/rede): calibração NÃO gravada — a anterior fica.`); process.exit(3) }
const acertos = resultados.filter((r) => (r.nota as { acerto: boolean }).acerto).length
const graves = resultados.filter((r) => (r.nota as { graves: string[] }).graves.length > 0)
const falhas = resultados.filter((r) => r.status !== 'ok').length
// em roteiro inglês, species_en diferente da species (bruto do modelo, antes da conferência; gente com species "human" não conta)
const normEsp = (x: unknown) => String(x ?? '').toLowerCase().replace(/^(?:a|an|the)\s+/, '').trim()
const trocasEmIngles: Array<{ id: string; quem: string; species: string; species_en: string }> = []
casos.forEach((c, i) => {
  if (/^(?:pt|es)-/.test(c.id) || !resultados[i].raw) return
  let p: { protagonist?: unknown; supporting?: unknown[] } = {}
  try { p = JSON.parse(String(resultados[i].raw)) } catch { return }
  for (const m of [p.protagonist, ...(Array.isArray(p.supporting) ? p.supporting : [])]) {
    if (!m || typeof m !== 'object') continue
    const o = m as Record<string, unknown>
    const a = normEsp(o.species), b = normEsp(o.species_en)
    if (a && b && a !== 'human' && b !== 'human' && a !== b) trocasEmIngles.push({ id: c.id, quem: String(o.name ?? o.role ?? ''), species: a, species_en: b })
  }
})
const ms = resultados.map((r) => r.ms as number).sort((a, b) => a - b)
const resumo = {
  marca: 'KINEO-PROTAGONISTA-SEEDANCE-0111', versao: ELENCO_SEMANTICO_VERSAO, modelo: ELENCO_SEMANTICO_MODELO, prazo_ms: ELENCO_SEMANTICO_PRAZO_MS,
  rodado_em: new Date().toISOString(), casos: casos.length, por_fonte: Object.fromEntries([...new Set(casos.map((c) => c.fonte))].map((f) => [f, casos.filter((c) => c.fonte === f).length])),
  acertos, taxa: Math.round((acertos / casos.length) * 1000) / 10, erros_graves: graves.length, graves: graves.map((g) => ({ id: g.id, graves: (g.nota as { graves: string[] }).graves })),
  erros_leves: resultados.filter((r) => !(r.nota as { acerto: boolean }).acerto && (r.nota as { graves: string[] }).graves.length === 0).map((r) => ({ id: r.id, erros: (r.nota as { erros: string[] }).erros })),
  // acerto por fonte: 'pt-es-fora' é o número fora da amostra (os 'pt-es' usam pares que o próprio prompt ensina)
  acerto_por_fonte: Object.fromEntries([...new Set(casos.map((c) => c.fonte))].map((f) => { const rs = resultados.filter((r) => r.fonte === f); return [f, `${rs.filter((r) => (r.nota as { acerto: boolean }).acerto).length}/${rs.length}`] })),
  chamadas_sem_resposta_valida: falhas,
  species_en_troca_em_ingles: trocasEmIngles, latencia_ms: { p50: ms[Math.floor(ms.length / 2)], p90: ms[Math.floor(ms.length * 0.9)], max: ms[ms.length - 1] },
}
fs.mkdirSync(path.join(raiz, 'docs/calibracao'), { recursive: true })
fs.writeFileSync(path.join(raiz, soMockados ? 'docs/calibracao/protagonista-seedance-0111-mockados.json' : 'docs/calibracao/protagonista-seedance-0111.json'), JSON.stringify({ resumo, casos: casos.map((c, i) => ({ ...c, resposta: resultados[i] })) }, null, 1) + '\n')
console.log(JSON.stringify(resumo, null, 1))

// KINEO-PROTAGONISTA-SEEDANCE-0111 — calibração do elenco semântico contra a API de verdade (gpt-4o-mini, ~US$ 0,03 por rodada).
// Lê OPENAI_API_KEY do .env.local (nunca imprime, nunca grava). Grava docs/calibracao/protagonista-seedance-0111.json com a
// resposta crua de cada caso (o guardião versionado usa essas respostas como mock) e a nota de cada um.
// Rodar: npx tsx scripts/calibrar-protagonista-seedance-0111.mts [caminho/.env.local]
// Revisão 01/11 (rodada 6): a chave estava sem crédito (429) — os 12 casos novos (8 PT/ES FORA da amostra do prompt, fonte 'pt-es-fora', e 4
// defeitos da revisão, fonte 'rev-0111b') só têm resposta MOCKADA (scripts/test-support/protagonista-seedance-0111-mocks.json). Esta rodada
// os mede de verdade. Se mais de 20% das chamadas falharem (sem crédito, fora do ar), NADA é gravado: a calibração anterior fica intacta.
import fs from 'node:fs'
import path from 'node:path'
import { pedirElencoSemantico, ELENCO_SEMANTICO_MODELO, ELENCO_SEMANTICO_PRAZO_MS, ELENCO_SEMANTICO_VERSAO } from '../lib/cinematic/elencoSemantico'
import { avaliar, type Caso } from './test-support/avaliar-protagonista-seedance-0111.mts'

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const envPath = process.argv[2] ?? 'C:/kineo/.env.local'
const linha = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => /^\s*OPENAI_API_KEY\s*=/.test(l))
const apiKey = linha ? linha.replace(/^\s*OPENAI_API_KEY\s*=\s*/, '').replace(/^["']|["']$/g, '').trim() : ''
if (!apiKey) { console.error('OPENAI_API_KEY ausente no .env.local'); process.exit(2) }

const casos: Caso[] = JSON.parse(fs.readFileSync(path.join(raiz, 'scripts/test-support/protagonista-seedance-0111-casos.json'), 'utf8'))
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
const ms = resultados.map((r) => r.ms as number).sort((a, b) => a - b)
const resumo = {
  marca: 'KINEO-PROTAGONISTA-SEEDANCE-0111', versao: ELENCO_SEMANTICO_VERSAO, modelo: ELENCO_SEMANTICO_MODELO, prazo_ms: ELENCO_SEMANTICO_PRAZO_MS,
  rodado_em: new Date().toISOString(), casos: casos.length, por_fonte: Object.fromEntries([...new Set(casos.map((c) => c.fonte))].map((f) => [f, casos.filter((c) => c.fonte === f).length])),
  acertos, taxa: Math.round((acertos / casos.length) * 1000) / 10, erros_graves: graves.length, graves: graves.map((g) => ({ id: g.id, graves: (g.nota as { graves: string[] }).graves })),
  erros_leves: resultados.filter((r) => !(r.nota as { acerto: boolean }).acerto && (r.nota as { graves: string[] }).graves.length === 0).map((r) => ({ id: r.id, erros: (r.nota as { erros: string[] }).erros })),
  // acerto por fonte: 'pt-es-fora' é o número fora da amostra (os 'pt-es' usam pares que o próprio prompt ensina)
  acerto_por_fonte: Object.fromEntries([...new Set(casos.map((c) => c.fonte))].map((f) => { const rs = resultados.filter((r) => r.fonte === f); return [f, `${rs.filter((r) => (r.nota as { acerto: boolean }).acerto).length}/${rs.length}`] })),
  chamadas_sem_resposta_valida: falhas, latencia_ms: { p50: ms[Math.floor(ms.length / 2)], p90: ms[Math.floor(ms.length * 0.9)], max: ms[ms.length - 1] },
}
fs.mkdirSync(path.join(raiz, 'docs/calibracao'), { recursive: true })
fs.writeFileSync(path.join(raiz, 'docs/calibracao/protagonista-seedance-0111.json'), JSON.stringify({ resumo, casos: casos.map((c, i) => ({ ...c, resposta: resultados[i] })) }, null, 1) + '\n')
console.log(JSON.stringify(resumo, null, 1))

// KINEO-ORIGEM-DO-ELENCO-0311 [TRAVA 8.2 — fundador 03/11: "Conserta a etnia agora, universal de todas as etnias"] — calibração contra a API real.
// Grava as respostas CRUAS em docs/calibracao/KINEO-ORIGEM-DO-ELENCO-0311.json; o guardião as repete offline, sem rede.
// Uso: OPENAI_API_KEY=... node scripts/calibra-origem-do-elenco-0311.mjs   (sem chave: avisa e sai com 0; custo ~US$ 0,01 por rodada)
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { CASOS_ORIGEM } from './test-support/casos-origem-do-elenco-0311.mjs'

const key = process.env.OPENAI_API_KEY
if (!key) { console.log('sem OPENAI_API_KEY: calibração real não rodou'); process.exit(0) }
const load = createOfflineLoader({ env: { OPENAI_API_KEY: key }, globals: { AbortController, setTimeout, clearTimeout, fetch }, evaluationTimeoutMs: 60000 })
const O = load('lib/cinematic/origemDoElenco.ts')
const saida = []
let i = 0
async function trabalha() {
  for (;;) {
    const caso = CASOS_ORIGEM[i++]
    if (!caso) return
    let crua = null
    const fetchImpl = async (...a) => { const r = await fetch(...a); try { const j = await r.clone().json(); crua = j?.choices?.[0]?.message?.content ?? null } catch {} return r }
    const r = await O.pedirOrigemDoElenco(caso.prompt, caso.ideia, { fetchImpl })
    saida.push({ id: caso.id, ok: r.ok, ms: r.ms, tentativas: r.tentativas, erro: r.erro, crua })
    console.log(caso.id.padEnd(22), r.ok ? `ok ${r.ms} ms t${r.tentativas} geral=${r.leitura.geral?.origem ?? '-'} [${r.leitura.personagens.map((p) => `${p.papel}:${p.origem ?? '-'}(${p.dito}) "${p.evidencia ?? ''}"${p.motivo && p.motivo !== 'sem_ancora' ? ' !' + p.motivo : ''}`).join(' · ')}]` : `ERRO ${r.erro}`)
  }
}
await Promise.all([trabalha(), trabalha(), trabalha(), trabalha()])
saida.sort((a, b) => CASOS_ORIGEM.findIndex((c) => c.id === a.id) - CASOS_ORIGEM.findIndex((c) => c.id === b.id))
fs.writeFileSync('docs/calibracao/KINEO-ORIGEM-DO-ELENCO-0311.json', JSON.stringify({ versao: O.ORIGEM_DO_ELENCO_VERSAO, modelo: 'gpt-4o-mini', data: new Date().toISOString().slice(0, 10), respostas: saida }, null, 1) + '\n')

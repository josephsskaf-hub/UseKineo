// KINEO-SUJEITO-APARENCIA-1311 — ensaio A/B (OpenAI gpt-4o-mini, sem fal) sobre pedidos reais. Roda o código REAL
// (lib/cinematic/sujeitoObrigatorio): o leitor do sujeito de sempre e, por cima, a pergunta separada da aparência (lerAparenciaDoSujeito).
//   hoje  = lerSujeitoDoPedido → avaliarSujeito (como está na main)
//   novo  = a MESMA leitura + lerAparenciaDoSujeito → avaliarSujeito (frase com a aparência)
// A régua (CEO 13/11): (a) a aparência escrita pelo cliente volta em ≥ 9 de 10 pedidos que a trazem; (b) nenhum pedido sem aparência ganha
// uma inventada; (c) o sujeito lido não muda onde hoje já está certo (aqui por construção: a leitura é a mesma — o ensaio confere).
// A 1ª versão (campo `appearance` DENTRO do leitor) mudou o sujeito em 5 pedidos estáveis e foi descartada; o resultado dela está no relatório.
// Uso: node scripts/ensaio-sujeito-aparencia-1311.mjs <pedidos.json> <saida.json>   (OPENAI_API_KEY do ambiente ou de .env.local)
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const [entrada, saida] = process.argv.slice(2)
if (!entrada || !saida) { console.log('uso: node scripts/ensaio-sujeito-aparencia-1311.mjs <pedidos.json> <saida.json>'); process.exit(2) }
const chaveDoEnv = () => {
  for (const f of ['.env.local', 'C:/kineo/.env.local']) if (existsSync(f)) { const m = /^OPENAI_API_KEY=(.+)$/m.exec(readFileSync(f, 'utf8')); if (m) return m[1].trim().replace(/^["']|["']$/g, '') }
  return null
}
const apiKey = process.env.OPENAI_API_KEY || chaveDoEnv()
if (!apiKey) { console.log('sem OPENAI_API_KEY'); process.exit(2) }
const L = createOfflineLoader({ globals: { setTimeout, clearTimeout, AbortController } })
const S = L('lib/cinematic/sujeitoObrigatorio.ts')
const pedidos = JSON.parse(readFileSync(entrada, 'utf8'))
const opts = { apiKey, fetchImpl: fetch, timeoutMs: 20_000, prazoTotalMs: 45_000 }

async function um(pedido) {
  const r = await S.lerSujeitoDoPedido(pedido, opts)
  const hoje = S.avaliarSujeito({ leitura: r, pessoaPermitida: true })
  let appearance = null, apErro = null
  if (r.ok && r.valor.subject_visual && !r.valor.descartado) {
    const ap = await S.lerAparenciaDoSujeito(pedido, r.valor.subject_visual, opts)
    if (ap.ok) appearance = ap.valor.appearance; else apErro = ap.erro
  }
  const novo = S.avaliarSujeito({ leitura: r.ok ? { ...r, valor: { ...r.valor, appearance } } : r, pessoaPermitida: true })
  return { visual: r.ok ? r.valor.subject_visual : null, hoje: hoje.sujeito?.frase ?? null, novo: novo.sujeito?.frase ?? null, appearance, apErro, motivo: hoje.motivo, erro: r.ok ? null : r.erro }
}
const linhas = [...new Map(Object.entries(pedidos).flatMap(([grupo, lista]) => lista.map((pedido) => [pedido, { grupo, pedido }]))).values()]
const out = new Array(linhas.length)
let i = 0
async function trabalhador() { while (i < linhas.length) { const k = i++; out[k] = { ...linhas[k], ...(await um(linhas[k].pedido)) }; process.stdout.write('.') } }
await Promise.all([1, 2, 3, 4, 5, 6].map(trabalhador))
writeFileSync(saida, JSON.stringify(out, null, 1))
const comSujeito = out.filter((o) => o.hoje)
console.log(`\n${out.length} pedidos · ${comSujeito.length} com sujeito · ${out.filter((o) => o.appearance).length} com aparência · ${comSujeito.filter((o) => o.novo !== o.hoje).length} frases mudaram (só pela aparência) · ${out.filter((o) => o.apErro).length} perguntas de aparência falharam`)

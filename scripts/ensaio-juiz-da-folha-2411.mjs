// KINEO-JUIZ-DA-FOLHA-2411 — ENSAIO PAGO (~US$ 0,001 por folha, gpt-4o-mini com visão): o que o modelo de produção LÊ nas folhas da prova 4 e o que a regra
// decide. NÃO roda sozinho em guardião nenhum. Quem roda: a CEO, com OPENAI_API_KEY no ambiente (nunca lido de arquivo aqui).
//   node scripts/ensaio-juiz-da-folha-2411.mjs C:\kineo\docs\canais\2026-11-24\prova-4\FOLHA-bolt.jpg bolt C:\kineo\docs\canais\2026-11-24\prova-4\FOLHA-ember.jpg ember
// Esperado: Bolt reprova em forma_especie (small, round). Ember passa nos traços; no MEIO depende da leitura (filme fotorreal × folha de animação).
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const j = createOfflineLoader({ source: (f, s) => s, globals: { AbortSignal } })('@/lib/cinematic/juizDaFolha2411.ts')
const FICHAS = {
  bolt: { ficha: { nome: 'Bolt', canonica: 'Bolt, exactly as the author wrote: "small round orange robot with big blue eyes"; drawn in the film\'s own look (stylized 3D animated film look)' }, filmeFotorreal: false },
  ember: { ficha: { nome: 'Ember', canonica: 'Ember, a small green dragon with a long, slender scaled body and a horned reptilian head. Her leathery bat-like wings are orange, and she has sharp claws and a long spiked tail. A distinctive feature is her bright, expressive eyes; a living creature filmed in photorealistic live action' }, filmeFotorreal: true },
}
if (!process.env.OPENAI_API_KEY) { console.error('sem OPENAI_API_KEY no ambiente: nada foi chamado'); process.exit(2) }
const args = process.argv.slice(2)
let custo = 0
for (let i = 0; i + 1 < args.length; i += 2) {
  const [arquivo, qual] = [args[i], args[i + 1]], f = FICHAS[qual]
  if (!f) { console.error('ficha desconhecida: ' + qual); continue }
  const url = 'data:image/jpeg;base64,' + readFileSync(arquivo).toString('base64')
  const r = await j.lerAFolha(j.descricaoParaOJuiz(f.ficha), url)
  custo += r.custoUsd
  console.log(qual, JSON.stringify({ erro: r.erro, leitura: r.leitura, decisao: r.leitura ? j.decidirDaFolha(r.leitura, f.filmeFotorreal) : null }, null, 1))
}
console.log('custo estimado US$', custo.toFixed(4))

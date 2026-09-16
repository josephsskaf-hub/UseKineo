// KINEO-TOPICO-DO-DESPACHO-2026-09-16 — o tópico gravado no filme (videos.topic, título, pacote de publicação)
// é o texto que foi despachado, não o que está na caixa quando o compose roda. Caso real: cadastro do TAAFT em
// 16/09 14:15 UTC — render em segundo plano, pessoa digita a próxima ideia na mesma caixa, filme da "piscina
// abandonada" sai com o título "5 morning habits Jeff Bezos". Este guardião prova a fotografia do prompt.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
const n = (re) => (gc.match(re) || []).length

checa('a fotografia existe (dispatchedPromptRef)', gc.includes('const dispatchedPromptRef = useRef<string | null>(null)'))
checa('a fotografia é tirada no MESMO instante em que o clique reivindica o despacho (2 caminhos)', n(/generationInFlightRef\.current = true\n\s+dispatchedPromptRef\.current = prompt/g) === 2 && n(/generationInFlightRef\.current = true\n/g) === 2)
checa('o compose e o registro de recuperação usam a fotografia, nunca a caixa viva (4 sítios)', n(/topic: dispatchedPromptRef\.current \?\? prompt,/g) === 4 && n(/^\s+topic: prompt,\n/gm) === 0)
checa('o clique de gerar continua lendo a caixa viva para DESPACHAR (a fotografia não congela o pedido novo)', gc.includes('dispatchedPromptRef.current = prompt'))

console.log(`${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)

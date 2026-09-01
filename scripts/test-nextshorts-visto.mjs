// TESTE DO CONSERTO "NEXT SHORTS — VISTO E DE GRACA" (sprint v1->v4 #9)
//
// Nao roda React: le o proprio componente e prova as invariantes que a
// mudanca nao pode quebrar. Sem rede, sem banco, sem credito.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const alvo = path.join(RAIZ, 'components', 'video', 'NextShortsSection.tsx')
const src = fs.readFileSync(alvo, 'utf8')

let falhas = 0
let n = 0
function checar(nome, condicao) {
  n++
  if (condicao) { console.log('  ok   ' + nome) }
  else { falhas++; console.log('  FALHOU  ' + nome) }
}
const vezes = (t) => src.split(t).length - 1

console.log('')
console.log('TESTE next-shorts visto — ' + path.relative(RAIZ, alvo))
console.log('')

// --- continuidade: nada do que ja media pode sumir ---
checar('next_shorts_shown continua sendo emitido 1x (serie historica intacta)', vezes("onEvent?.('next_shorts_shown'") === 1)
checar('next_shorts_picked continua sendo emitido 1x no onClick do card', vezes("onEvent?.('next_shorts_picked'") === 1)
checar('onPick continua sendo chamado depois do evento', /next_shorts_picked[\s\S]{0,120}onPick\(idea\)/.test(src))
checar('componente continua com export default', /export default function NextShortsSection/.test(src))

// --- a medida nova ---
checar('next_shorts_seen existe e e emitido 1x', vezes("onEvent?.('next_shorts_seen'") === 1)
checar('next_shorts_seen so dispara uma vez (guardado por ref)', /seenRef\.current\s*=\s*true/.test(src) && /if \(seenRef\.current\) return/.test(src))
checar('usa IntersectionObserver de verdade', /new IntersectionObserver\(/.test(src))
checar('tem fallback quando IntersectionObserver nao existe', /typeof IntersectionObserver === 'undefined'/.test(src))
checar('observer e desconectado (sem vazamento)', vezes('disconnect()') >= 2)
checar('a raiz do card tem ref para observar', /ref=\{rootRef\}/.test(src))
checar('IntersectionObserver esta dentro de try/catch', /try \{[\s\S]{0,400}new IntersectionObserver/.test(src))

// --- o preco escrito no card ---
checar('card diz que e de graca', /Free · 0 credits/.test(src))
checar('card diz que nada e gerado ate apertar Generate', /no credit is spent until you press Generate/.test(src))
checar('card garante que o video pronto nao se perde', /stays saved in My Videos/.test(src))
checar('o botao nomeia o verbo certo (Load, nao Generate)', /Load into the composer/.test(src))

// --- limites da minha pista ---
checar('nao usa localStorage/sessionStorage', !/localStorage|sessionStorage/.test(src))
checar('nao fala de preco, plano ou upgrade (pista do Codex)', !/(upgrade|checkout|subscribe|\$\d)/i.test(src))
checar('continua falhando invisivelmente (renderiza null sem ideias)', /ideas\.length === 0\) return null/.test(src))

console.log('')
console.log(falhas === 0
  ? '  RESULTADO: ' + n + '/' + n + ' verificacoes passaram.'
  : '  RESULTADO: ' + falhas + ' de ' + n + ' FALHARAM.')
console.log('')
process.exit(falhas === 0 ? 0 : 1)

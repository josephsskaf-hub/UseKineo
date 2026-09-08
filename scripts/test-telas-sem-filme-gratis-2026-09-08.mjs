// KINEO-PROMESSA-GRATIS-2026-09-08 (M7) — AS TELAS, DEPOIS DAS CARTAS.
//
// A #9 desta madrugada consertou a ESTEIRA DE E-MAIL que ainda oferecia um
// filme gratis depois da Versao B. Esta trava cuida das TELAS, que estavam
// piores: as frases eram JSX cru e por isso nao passavam por troca nenhuma.
//
// O que ela protege, e o unico jeito de manter isso verdadeiro: nenhuma
// superficie pode decidir "existe filme gratis?" por conta propria. A condicao
// e o LIMITE QUE O COBRADOR LE — `getFreeTierOffer().limit` / `OFFER.limit` —,
// o mesmo numero que /api/compose compara contra `reservedOrCompleted` antes de
// recusar a reserva. Uma flag redigitada (`!CARD_ENTRY_ONLY`) diverge no dia em
// que o fundador virar o interruptor, e foi assim que 126 pessoas ganharam um
// link para um 402 (ver docs/SPRINT-MADRUGADA-PRODUTO-2026-09-08.md #9).
//
// Estilo readFileSync + CONTAGEM de propósito: guardiao que morre na primeira
// falha esconde as outras, e `assert` com alias `@/` nem chega a rodar.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (p) => readFileSync(join(raiz, p), 'utf8').replace(/\r\n/g, '\n')

// Contar ocorrencias no arquivo CRU faz a trava casar com o proprio comentario
// que explica o conserto — armadilha ja registrada na memoria da casa. Toda
// contagem roda sobre o codigo sem comentario (inclui os blocos {/* */} do JSX).
const semComentarios = (src) =>
  src
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

let ok = 0
let mau = 0
const falhas = []
function check(nome, condicao) {
  // A assinatura é (nome, condicao). Trocar a ordem faz a trava passar sem
  // avaliar nada — foi o que ja aconteceu em outros arquivos de scripts/.
  if (condicao === true) { ok++; return }
  mau++
  falhas.push(nome)
}

const exit = ler('components/ExitIntentOffer.tsx')
const niche = ler('components/NicheOnboarding.tsx')
const gen = ler('app/(dashboard)/generate/GenerateClient.tsx')
const oferta = ler('lib/freeTierOffer.ts')

const exitCode = semComentarios(exit)
const nicheCode = semComentarios(niche)
const genCode = semComentarios(gen)

// ── 1. O EXIT-INTENT: a manchete que 20 pessoas em 104 clicaram ────────────
// A manchete da versao A vive numa constante e so pode chegar a tela atraves
// do swapFreeTierCopy (via <FreeTierCopy>). JSX cru com a frase = reprovado.
check('exit: a manchete da versao A esta isolada numa constante',
  /const EXIT_FREE_HEADLINE\s*=/.test(exit))
check('exit: a manchete passa por <FreeTierCopy>',
  /<FreeTierCopy\s+[^>]*legacy=\{EXIT_FREE_HEADLINE\}/s.test(exit))
check('exit: a versao A continua identica (on repete o legacy)',
  /on=\{EXIT_FREE_HEADLINE\}/.test(exit))
// A frase NAO pode voltar a ser texto solto dentro do <h2>.
const h2Cru = /<h2[^>]*id="exit-free-title"[^>]*>\s*[^<{\s][^<]*trying it is free/i.test(exitCode)
check('exit: "trying it is free" nao volta como JSX cru no <h2>', h2Cru === false)
// Uma unica ocorrencia da frase no arquivo: a da constante.
check('exit: a frase aparece exatamente 1x (a constante)',
  (exitCode.match(/trying it is free/g) || []).length === 1)

// ── 2. O OVERLAY DE ONBOARDING: 49 pessoas em 7 dias ───────────────────────
check('niche: le a oferta pelo hook do provider',
  /useFreeTierOffer/.test(niche))
// A condicao tem de ser o LIMITE, nao uma flag redigitada.
check('niche: a condicao sai de .limit > 0',
  /const freeFilmAvailable\s*=\s*useFreeTierOffer\(\)\.limit\s*>\s*0/.test(niche))
check('niche: "No card needed" so aparece sob a condicao',
  /freeFilmAvailable\s*\?\s*'No card needed; Kineo'\s*:\s*'Kineo'/.test(niche))
// Nenhum "No card" solto sobrou fora do ternario.
const nicheCru = (nicheCode.match(/No card needed/g) || []).length
check('niche: "No card needed" aparece exatamente 1x (dentro do ternario)',
  nicheCru === 1)

// ── 3. A CAIXA INLINE DO /generate: 175 pessoas em 7 dias ──────────────────
check('generate: a condicao existe e sai de OFFER.limit',
  /const freeFilmAvailable\s*=\s*OFFER\.limit\s*>\s*0/.test(gen))
check('generate: o botao da caixa inline e condicional',
  /freeFilmAvailable\s*\?\s*'Create my free Short →'\s*:\s*'Create my Short →'/.test(gen))
check('generate: a linha "no card" da caixa inline e condicional',
  /freeFilmAvailable[\s\S]{0,120}?'Fast preview · no card · watermark[^']*'[\s\S]{0,80}?:\s*'Fast preview · watermark/.test(gen))
// "no card" da caixa inline nao pode existir fora do ternario.
check('generate: "Fast preview · no card" aparece exatamente 1x',
  (genCode.match(/Fast preview · no card/g) || []).length === 1)

// ── 4. O ESPELHO QUE TINHA PARADO DE ESPELHAR ──────────────────────────────
// firstFilmFreeAvailable promete responder "o servidor entregaria um Kineo 1
// de graca agora?". Sem a cota na conta, ele mente sob a Versao B.
check('generate: firstFilmFreeAvailable consulta a cota',
  /const firstFilmFreeAvailable\s*=\s*\n?\s*freeFilmAvailable\s*&&/.test(gen))

// ── 5. A REGRA GERAL: a condicao nao se redigita ───────────────────────────
// Nenhum dos quatro pontos pode derivar de CARD_ENTRY_ONLY diretamente.
for (const [nome, src] of [['exit', exit], ['niche', niche], ['generate', gen]]) {
  check(`${nome}: nao redigita a condicao a partir de CARD_ENTRY_ONLY`,
    /=\s*!?\s*CARD_ENTRY_ONLY/.test(src) === false)
}

// ── 6. A ANCORA: o limite e mesmo o numero do cobrador ─────────────────────
// Se a Versao B deixar de zerar o limite, esta trava deixa de ter sentido e
// precisa ser relida — por isso ela afirma o contrato, nao o valor de hoje.
check('oferta: a porta unica devolve uma oferta com limit: 0',
  /CARD_ENTRY_OFFER[\s\S]{0,400}?limit:\s*0/.test(oferta))
check('oferta: getFreeTierOffer devolve a oferta da porta sob CARD_ENTRY_ONLY',
  /if\s*\(CARD_ENTRY_ONLY\)\s*return CARD_ENTRY_OFFER/.test(oferta))

console.log(`\n${ok} verificacoes ok, ${mau} falhas`)
if (mau > 0) {
  console.log('\nFALHAS:')
  for (const f of falhas) console.log(`  ✗ ${f}`)
  process.exit(1)
}
console.log('✓ nenhuma tela promete filme gratis fora da condicao do cobrador')

// scripts/test-grant-copy-single-source.mjs
// KINEO-GRANT-RENDER-UNICO-2026-09-08 (M7, rotina madrugada-produto #4)
//
// O QUE ESTE GUARDIAO PROTEGE, em uma frase: o numero do trial que a casa
// MOSTRA tem de vir da politica em vigor, nunca do espelho historico.
//
// O defeito que ele nasce trancando: na noite da VERSAO B a casa trocou a porta
// de entrada (25 gratis -> $1 por 7 dias com 80 creditos) e ensinou o swap
// (swapFreeTierCopy / <FreeTierCopy>) a devolver a copy nova. Isso salvou todo
// call site que passa pelo swap — mas OITO superficies renderizavam a constante
// TRIAL_GRANT_CREDITS_COPY (25) CRUA, fora de qualquer swap, e continuaram
// publicando o mundo antigo: um JSON-LD (omni-flash-vs-sora), a conta de filmes
// do /models-pricing (a frase prometia 80 e dividia por 25), o texto e o ROTULO
// DO BOTAO das paginas de motor, tres frases do /ai-video-with-talking-
// characters, a faixa de quem chega do ChatGPT e os selos do modal de saida.
//
// Regra: quem MOSTRA o grant importa TRIAL_CREDITS_SHOWN. Quem guarda a copy da
// versao A continua com TRIAL_GRANT_CREDITS_COPY, mas SO dentro do swap, onde
// existe um ramo para a porta de $1. Este arquivo conta ocorrencias — nunca
// morre na primeira falha — e nao importa nada com alias @/ (guardiao que usa
// alias nao roda: morre no import antes da 1a verificacao).

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const falhas = []
const notas = []
function check(nome, condicao, detalhe) {
  if (condicao) return
  falhas.push(detalhe ? `${nome} — ${detalhe}` : nome)
}

function varrer(dir, out = []) {
  let entradas = []
  try { entradas = readdirSync(dir) } catch { return out }
  for (const e of entradas) {
    if (e === 'node_modules' || e === '.next' || e.startsWith('.')) continue
    const p = join(dir, e)
    let st
    try { st = statSync(p) } catch { continue }
    if (st.isDirectory()) varrer(p, out)
    else if (/\.(tsx|ts)$/.test(e)) out.push(p)
  }
  return out
}

const ARQUIVOS = [...varrer('app'), ...varrer('components')]
check('A0 a varredura encontrou arquivos', ARQUIVOS.length > 200,
  `so ${ARQUIVOS.length} arquivos varridos — denominador suspeito`)

// ── A. a fonte unica existe e DERIVA da politica (nao e um numero digitado) ──
const FONTE = readFileSync('lib/freeTierOffer.ts', 'utf8')
const linhaShown = FONTE.split(/\r?\n/).find((l) => l.includes('export const TRIAL_CREDITS_SHOWN')) || ''
check('A1 lib/freeTierOffer.ts exporta TRIAL_CREDITS_SHOWN', linhaShown !== '')
check('A2 TRIAL_CREDITS_SHOWN decide pela politica, nao por um literal',
  linhaShown.includes('CARD_ENTRY_ONLY') && linhaShown.includes('CARD_ENTRY_TRIAL_CREDITS'),
  `linha: ${linhaShown.trim().slice(0, 120)}`)
check('A3 TRIAL_GRANT_CREDITS_COPY continua existindo (espelho da versao A)',
  /export const TRIAL_GRANT_CREDITS_COPY\s*=/.test(FONTE))

// ── B. ZERO render cru do espelho historico fora do swap ────────────────────
// Uma linha esta ABRIGADA quando o swap decide o texto naquela mesma linha:
// ft(...)/swapFreeTierCopy(...) ou um atributo on=/legacy= de <FreeTierCopy>.
const ABRIGO = /ft\(\s*OFFER|ft\(\s*offer|swapFreeTierCopy|(^|\s)on=|(^|\s)legacy=/
const crus = []
for (const arq of ARQUIVOS) {
  const linhas = readFileSync(arq, 'utf8').split(/\r?\n/)
  linhas.forEach((linha, i) => {
    if (!linha.includes('TRIAL_GRANT_CREDITS_COPY')) return
    if (/^\s*(import|\/\/|\*)/.test(linha) || linha.includes('} from')) return
    if (ABRIGO.test(linha)) return
    crus.push(`${arq}:${i + 1}`)
  })
}
check('B1 nenhuma superficie renderiza TRIAL_GRANT_CREDITS_COPY fora do swap',
  crus.length === 0, `${crus.length} render(es) cru(s): ${crus.join(', ')}`)
notas.push(`B1 varreu ${ARQUIVOS.length} arquivos de app/ e components/`)

// ── C. a porta de $1 nunca aparece SEM PRECO ────────────────────────────────
// Nasce de um defeito real: uma varredura anterior trocou copy com replace() e
// o "$1" do texto foi lido como RETROVISOR DE GRUPO da regex, some. O botao das
// paginas de motor passou a dizer "Try Veo 3.1 — 7 days for  →".
const semPreco = []
for (const arq of ARQUIVOS) {
  const linhas = readFileSync(arq, 'utf8').split(/\r?\n/)
  linhas.forEach((linha, i) => {
    if (!/7 days for/.test(linha)) return
    const cauda = linha.slice(linha.indexOf('7 days for') + '7 days for'.length)
    if (/\$|\{/.test(cauda)) return
    semPreco.push(`${arq}:${i + 1}`)
  })
}
check('C1 nenhum "7 days for" fica sem preco na mesma linha',
  semPreco.length === 0, `${semPreco.length}: ${semPreco.join(', ')}`)

// ── D. as duas faixas do app nao prometem mais "no card" incondicional ──────
for (const arq of ['components/ChatGptWelcomeBanner.tsx', 'components/ExitIntentOffer.tsx']) {
  const linhas = readFileSync(arq, 'utf8').split(/\r?\n/)
  const mentiras = []
  linhas.forEach((linha, i) => {
    if (!/no card|NO CARD/i.test(linha)) return
    if (/^\s*(\/\/|\*)/.test(linha)) return
    if (/(^|\s)legacy=/.test(linha)) return   // copy da versao A, atras do swap
    if (ABRIGO.test(linha)) return
    mentiras.push(i + 1)
  })
  check(`D1 ${arq} sem "no card" incondicional`, mentiras.length === 0,
    `linhas ${mentiras.join(', ')}`)
}

// ── E. a faixa do ChatGPT e os selos do modal falam a porta em vigor ────────
const CG = readFileSync('components/ChatGptWelcomeBanner.tsx', 'utf8')
check('E1 ChatGptWelcomeBanner mostra o grant pela fonte unica',
  CG.includes('TRIAL_CREDITS_SHOWN'))
check('E2 ChatGptWelcomeBanner nomeia a porta de $1',
  /\$1 trial|for \$1/.test(CG))

console.log(`\n${notas.map((n) => `  · ${n}`).join('\n')}`)
const total = 12
if (falhas.length) {
  console.error(`\nGRANT-COPY-SINGLE-SOURCE: ${falhas.length} de ${total} REPROVARAM`)
  for (const f of falhas) console.error(`  ✗ ${f}`)
  process.exit(1)
}
console.log(`\nGRANT-COPY-SINGLE-SOURCE: ${total} verificacoes, todas verdes`)

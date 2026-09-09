// scripts/test-cadastro-nao-promete-gratis-2026-09-09.mjs
// KINEO-PORTA-CTA-UNICA-2026-09-09 — rotina noite r9.
//
// O QUE ESTE GUARDIAO TRAVA
// A caixa de cadastro do Sidebar (a que a pessoa DESLOGADA ve) tinha duas
// frases contraditorias: a linha de cima passa por swapFreeTierCopy e, sob a
// porta unica, anuncia a taxa de entrada de $1; o BOTAO logo abaixo era o
// literal cru "Get Started Free →". Quem le so o botao — a maioria — recebia
// a promessa que a casa nao cumpre mais. O trafego pago do Reddit chega
// deslogado e le exatamente essa caixa antes de bater na porta de $1.
//
// A trava e de COMPORTAMENTO, nao de texto: executa o modulo de copy real e
// exige que, com a porta ligada, o rotulo do botao seja o da fonte unica e
// nao contenha promessa de gratis. Com a porta desligada, o literal legado
// tem de voltar byte a byte (a versao A continua valendo se o fundador
// desligar CARD_ENTRY_ONLY).
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ler = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8')

let ok_ = 0
const check = (cond, nome) => { assert.ok(cond, nome); ok_ += 1 }

const sidebar = ler('components/Sidebar.tsx')
const entry = ler('lib/entryPolicy.ts')
const freeTier = ler('lib/freeTierOffer.ts')

// ── 1. O botao nao carrega mais promessa de gratis como literal ──────────────
// A forma que importa e o literal DENTRO do JSX do botao. O `? :` da linha de
// decisao mantem o legado do call site de proposito (versao A), entao a trava
// olha o JSX renderizado, nao o arquivo inteiro.
const caixa = sidebar.slice(sidebar.indexOf('!isLoggedIn ? ('))
const jsxBotao = caixa.slice(0, caixa.indexOf('</button>'))
check(jsxBotao.length > 0, 'a caixa de cadastro deslogada existe no Sidebar')
check(!/>\s*Get Started Free/.test(jsxBotao), 'o rotulo do botao nao e mais o literal "Get Started Free"')
check(/\{signupCtaLabel\}/.test(jsxBotao), 'o rotulo do botao vem da variavel decidida pela oferta')

// ── 2. O aria-label acompanha (leitor de tela lia a promessa velha) ──────────
check(/aria-label=\{`\$\{signupCtaLabel\}/.test(jsxBotao), 'o aria-label usa o mesmo rotulo que o olho ve')
check(!/aria-label="Get started free/.test(sidebar), 'o aria-label nao promete gratis')

// ── 3. A decisao le a OFERTA, nao uma flag redigitada ────────────────────────
// Memoria `predicado-do-cobrador-nao-se-redigita`: quem decide a copy tem de
// ler o mesmo objeto que decide o comportamento.
const linhaDecisao = sidebar.split('\n').find((l) => l.includes('const signupCtaLabel')) ?? ''
check(linhaDecisao.includes('freeTierOffer.cardEntry'), 'a decisao le offer.cardEntry, nao uma flag propria')
check(linhaDecisao.includes('freeTierOffer.copy.ctaPrimary'), 'o rotulo da porta vem da copy da oferta')
check(!/\$1|\$29|80 credits/.test(linhaDecisao), 'nenhum preco literal na decisao do rotulo')
check(/useFreeTierOffer\(\)/.test(sidebar), 'o Sidebar usa o hook do provider (nunca getFreeTierOffer no cliente)')

// ── 4. A fonte unica realmente entrega um CTA de porta, e ele nao diz "free" ─
// Execucao real: le o valor de CARD_ENTRY_COPY.ctaLong do arquivo-fonte, que e
// o que `ctaPrimary` vira sob a porta (CARD_ENTRY_TIER_COPY.ctaPrimary).
const mCta = entry.match(/ctaLong:\s*'([^']+)'/)
check(!!mCta, 'CARD_ENTRY_COPY.ctaLong existe em lib/entryPolicy.ts')
const ctaPorta = mCta[1]
check(!/free/i.test(ctaPorta), 'o CTA da porta nao contem a palavra "free": ' + ctaPorta)
check(/ctaPrimary:\s*CARD_ENTRY_COPY\.ctaLong/.test(freeTier), 'ctaPrimary da porta e o ctaLong da fonte unica')

// ── 5. A versao A continua intacta (byte a byte) ─────────────────────────────
check(linhaDecisao.includes("'Get Started Free →'"), 'com a porta desligada o literal legado volta byte a byte')

console.log(`\n✅ ${ok_} verificacoes ok — a caixa de cadastro fala uma lingua so.\n`)

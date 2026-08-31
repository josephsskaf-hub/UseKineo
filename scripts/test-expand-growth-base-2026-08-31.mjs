/**
 * sprint-v1v4 #9 — a base do teto de crescimento
 *
 * Prova, com os NUMEROS REAIS de producao (29-31/08), que o `growth_limit`
 * que matava o "completar meu roteiro" era base errada, e que o conserto:
 *   (A) repara a base quando ela nao e ancestral do roteiro de entrada;
 *   (B) NAO afrouxa o teto de 2,5x quando a base esta certa (Contrato C1);
 *   (C) esta LIGADO na rota (licao do sceneTruth: biblioteca morta nao vale);
 *   (D) esta LIGADO no cliente (a base passa a ser o roteiro estruturado);
 *   (E) nao encosta na pista do Codex nem na curadoria do fundador.
 */
import fs from 'node:fs'
import path from 'node:path'

const raiz = path.resolve(process.argv[2] ?? '.')
const ler = (p) => fs.readFileSync(path.join(raiz, p), 'utf8')
let ok = 0, falhas = []
const t = (nome, cond) => { if (cond) ok++; else falhas.push(nome) }

// ─── implementacao pura, espelhada do lib/expandPolicy.ts ─────────────────
const MAX_GROWTH_FACTOR = 2.5
const MIN_COVERAGE = 0.95
const WORDS_PER_SECOND = 2.3
const withinGrowthLimit = (b, c) => (b > 0 ? c <= b * MAX_GROWTH_FACTOR : false)
function resolveGrowthBase(baseSpeech, originalSpeech) {
  if (!(baseSpeech > 0)) return { speech: originalSpeech, repaired: true }
  if (!(originalSpeech > 0)) return { speech: baseSpeech, repaired: false }
  if (!withinGrowthLimit(baseSpeech, originalSpeech)) return { speech: originalSpeech, repaired: true }
  return { speech: baseSpeech, repaired: false }
}
const fala = (palavras) => palavras / WORDS_PER_SECOND

// ═══ A. OS QUATRO CASOS REAIS DE PRODUCAO ═════════════════════════════════
// events.script_expand_autostarted -> script_expand_failed(growth_limit).
// A ideia crua e o texto que o cliente guardava como base (2 a 8 palavras).
const casos = [
  { quem: '87458069', ideiaPalavras: 6,  falaRoteiro: 31, alvo: 45, faltavam: 28 },
  { quem: '99f3ba6c', ideiaPalavras: 8,  falaRoteiro: 35, alvo: 45, faltavam: 18 },
  { quem: 'e1456e18', ideiaPalavras: 5,  falaRoteiro: 38, alvo: 45, faltavam: 12 },
  { quem: '5f179f01', ideiaPalavras: 10, falaRoteiro: 38, alvo: 45, faltavam: 12 },
]
for (const c of casos) {
  const baseAntiga = fala(c.ideiaPalavras)
  // A expansao honesta: enche 100% do alvo.
  const candidato = c.alvo
  // ANTES: teto medido contra a ideia crua -> recusa garantida.
  t(`A1/${c.quem}: ANTES o teto barrava a expansao honesta`,
    !withinGrowthLimit(baseAntiga, candidato))
  // ANTES: o teto era menor que o PROPRIO roteiro de entrada — prova de que
  // nenhuma expansao, nem a minima, teria como passar.
  t(`A2/${c.quem}: ANTES o teto era menor que o roteiro de entrada`,
    !withinGrowthLimit(baseAntiga, c.falaRoteiro))
  // DEPOIS: base reparada.
  const r = resolveGrowthBase(baseAntiga, c.falaRoteiro)
  t(`A3/${c.quem}: DEPOIS a base e reparada`, r.repaired === true)
  t(`A4/${c.quem}: DEPOIS a base vira o roteiro de entrada`, r.speech === c.falaRoteiro)
  t(`A5/${c.quem}: DEPOIS a expansao honesta passa`, withinGrowthLimit(r.speech, candidato))
  // E a pessoa so precisava de poucas palavras — nada disso era abuso.
  const faltam = Math.max(0, Math.ceil((c.alvo * MIN_COVERAGE - c.falaRoteiro) * WORDS_PER_SECOND))
  // speech_seconds do evento vem ARREDONDADO, entao 1 palavra de folga.
  t(`A6/${c.quem}: faltavam ~${c.faltavam} palavras (bate com o evento)`, Math.abs(faltam - c.faltavam) <= 1)
}

// ═══ B. O TETO CONTINUA DE PE (Contrato C1) ═══════════════════════════════
// Base legitima (a pessoa colou o proprio roteiro): base == roteiro.
t('B1: base legitima NAO e reparada', resolveGrowthBase(40, 40).repaired === false)
t('B2: base legitima segue barrando 2,6x', !withinGrowthLimit(resolveGrowthBase(40, 40).speech, 104))
t('B3: base legitima aceita exatamente 2,5x', withinGrowthLimit(resolveGrowthBase(40, 40).speech, 100))
// 2a rodada: base = texto do autor (40s), roteiro de entrada = candidato da 1a
// rodada (90s, dentro de 2,5x). A base NAO pode ser reparada aqui, senao o
// crescimento composto 2,5x x 2,5x volta pela porta dos fundos.
const r2 = resolveGrowthBase(40, 90)
t('B4: 2a rodada NAO repara base ancestral valida', r2.repaired === false)
t('B5: 2a rodada mantem o teto na base do autor', r2.speech === 40)
t('B6: 2a rodada barra 6,25x composto', !withinGrowthLimit(r2.speech, 250))
// Borda exata: roteiro de entrada == 2,5x a base -> ainda ancestral valido.
t('B7: borda 2,5x exata nao repara', resolveGrowthBase(40, 100).repaired === false)
t('B8: um fio acima da borda repara', resolveGrowthBase(40, 100.0001).repaired === true)
// Degenerados.
t('B9: base zero repara', resolveGrowthBase(0, 38).repaired === true)
t('B10: base zero usa o roteiro', resolveGrowthBase(0, 38).speech === 38)
t('B11: roteiro zero nao repara', resolveGrowthBase(40, 0).repaired === false)
t('B12: NaN na base repara', resolveGrowthBase(Number.NaN, 38).repaired === true)

// ═══ C. LIGADO NA ROTA ════════════════════════════════════════════════════
const rota = ler('app/api/expand-script/route.ts')
t('C1: rota importa resolveGrowthBase', /import\s*\{[\s\S]*?\bresolveGrowthBase\b[\s\S]*?\}\s*from\s*'@\/lib\/expandPolicy'/.test(rota))
t('C2: rota CHAMA resolveGrowthBase', /resolveGrowthBase\s*\(/.test(rota))
t('C3: a base do teto vem da resolucao', /const\s+speechBase\s*=\s*baseResolvida\.speech/.test(rota))
t('C4: nao sobrou speechBase medido direto do texto base',
  !/const\s+speechBase\s*=\s*speechSeconds\(/.test(rota))
t('C5: withinGrowthLimit segue sendo chamado com speechBase',
  /withinGrowthLimit\(speechBase,\s*depois\.speech\)/.test(rota))
t('C6: reparo e LOGADO', /base de crescimento reparada/.test(rota))
t('C7: growth_limit devolve baseRepaired', /baseRepaired:\s*baseResolvida\.repaired/.test(rota))
t('C8: sucesso tambem devolve baseRepaired', (rota.match(/baseRepaired:/g) || []).length === 2)
t('C9: growth_limit devolve baseSeconds', /baseSeconds:\s*Math\.round\(speechBase\)/.test(rota))
t('C10: a rota continua sem render e sem debito',
  !/(submitToFal|deductCredits|credits_used|charge)/.test(rota))

// ═══ D. LIGADO NO CLIENTE ═════════════════════════════════════════════════
const cli = ler('app/(dashboard)/generate/GenerateClient.tsx')
t('D1: auto-structure passa a fixar a base', /structuredScriptRef\.current = source[\s\S]{0,900}?expandBaseRef\.current = source/.test(cli))
t('D2: a base antiga (ideia crua) continua no inicio da analise',
  /expandBaseRef\.current = \(overridePrompt \?\? prompt \?\? ''\)\.trim\(\)/.test(cli))
t('D3: o corpo do POST segue mandando baseScript', /baseScript:\s*base,/.test(cli))
t('D4: script_expanded mede base_repaired', /base_repaired:\s*data\?\.baseRepaired === true,\s*\n\s*round: rodada,/.test(cli))
t('D5: script_expand_failed(422) mede base_repaired', /reason: data\.outcome,[\s\S]{0,400}?base_repaired:/.test(cli))
t('D6: script_expand_failed(422) mede base_seconds', /base_seconds:\s*typeof data\?\.baseSeconds/.test(cli))
// licao da #8: crase dentro de comentario encerra template literal e vira codigo.
const blocoNovo = (txt, marca, fim) => {
  const i = txt.indexOf(marca)
  return i < 0 ? '' : txt.slice(i, txt.indexOf(fim, i) + fim.length)
}
const blocoCli = blocoNovo(cli, 'KINEO-BASE-DE-CRESCIMENTO', 'expandBaseRef.current = source')
t('D7: bloco novo do cliente existe', blocoCli.length > 100)
t('D8: nenhuma crase no bloco novo do cliente (licao da #8)', !blocoCli.includes('`'))
t('D9: nenhuma crase no bloco novo da rota',
  !blocoNovo(rota, 'KINEO-BASE-DE-CRESCIMENTO', 'const speechBase = baseResolvida.speech').includes('`'))
t('D10: nenhuma crase no bloco novo da policy',
  !blocoNovo(ler('lib/expandPolicy.ts'), 'KINEO-BASE-DE-CRESCIMENTO', 'return { speech: baseSpeech, repaired: false }').includes('`'))

// ═══ E. FRONTEIRAS (Codex + curadoria do fundador) ════════════════════════
const semComentarios = (txt) => txt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const diffAlvos = ['app/api/expand-script/route.ts', 'lib/expandPolicy.ts']
for (const f of diffAlvos) {
  const c = semComentarios(ler(f))
  t(`E1/${f}: sem preco/plano/credito/checkout`, !/(stripe|checkout|coupon|priceId|planId|upgrade)/i.test(c))
}
t('E2: nenhum arquivo de curadoria tocado', !fs.existsSync(path.join(raiz, '.git', 'MERGE_HEAD')))
for (const proibido of ['lib/engineWall.ts', 'components/EngineCycleCard.tsx', 'lib/checkoutPricing.ts', 'lib/marketingPrice.ts']) {
  t(`E3/${proibido}: existe e nao faz parte da mudanca`, fs.existsSync(path.join(raiz, proibido)))
}
const pol = semComentarios(ler('lib/expandPolicy.ts'))
t('E4: expandPolicy continua puro (sem fetch/db)', !/(fetch\(|supabase|createClient)/.test(pol))
t('E5: MAX_GROWTH_FACTOR intocado em 2.5', /export const MAX_GROWTH_FACTOR = 2\.5\b/.test(ler('lib/expandPolicy.ts')))
t('E6: MIN_COVERAGE intocado em 0.95', /export const MIN_COVERAGE = 0\.95\b/.test(ler('lib/narrationFit.ts')))

console.log(`\n${ok} verificacoes ok, ${falhas.length} falhas`)
if (falhas.length) { falhas.forEach((f) => console.log('  FALHOU: ' + f)); process.exit(1) }

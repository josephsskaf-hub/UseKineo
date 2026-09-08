#!/usr/bin/env node
/**
 * KINEO-ROTEIRO-LONGO-NAO-E-ERRO-2026-09-08 (M2 da rotina madrugada-produto)
 *
 * O QUE ESTE GUARDIAO PROTEGE
 * O teto de caracteres da ideia deixou de ser um numero so. 'verbatim' (o texto
 * E a narracao) continua em 5.000 — a razao original, escrita em gptHandoff.ts,
 * segue valendo. 'ai' (o texto e materia-prima que o modelo condensa) passa a
 * 20.000. O que este arquivo trava:
 *   1. o COBRADOR (rota) e as duas TELAS leem o mesmo calculo, da mesma funcao;
 *   2. a FRASE de recusa cita o teto que foi COBRADO, nunca outro numero;
 *   3. o teto de 'verbatim' NAO subiu junto (o filme continua com regua);
 *   4. o Studio continua barrando o Generate quando o texto passa do teto —
 *      subir o teto nao pode virar "deixa ir e quebra no servidor".
 *
 * Estilo readFileSync + contagem: nunca `assert` que morre na 1a falha, e toda
 * contagem passa por semComentarios() — senao a verificacao casa com o proprio
 * comentario que explica o conserto.
 */
import { readFileSync } from 'node:fs'

const ler = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
/** Remove //, /* *\/ e {/* *\/} para nenhuma contagem casar com o comentario. */
const semComentarios = (s) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, ' ')

let ok = 0
const falhas = []
const check = (nome, cond) => {
  if (cond === true) ok++
  else falhas.push(nome)
}

const LIM = ler('lib/analyzeLimits.ts')
const LIMC = semComentarios(LIM)
const ROTA = ler('app/api/analyze-idea/route.ts')
const ROTAC = semComentarios(ROTA)
const STUDIO = ler('app/(dashboard)/studio/StudioClient.tsx')
const STUDIOC = semComentarios(STUDIO)
const GEN = ler('app/(dashboard)/generate/GenerateClient.tsx')
const GENC = semComentarios(GEN)

// ── A. FONTE UNICA ────────────────────────────────────────────────────────
check('A1 verbatim continua em 5.000 (a regua do filme nao subiu)',
  /export const ANALYZE_PROMPT_MAX_CHARS\s*=\s*5000\b/.test(LIMC))
check('A2 existe teto proprio para materia-prima, e ele e MAIOR',
  (() => {
    const m = LIMC.match(/export const ANALYZE_PROMPT_MAX_CHARS_SOURCE\s*=\s*(\d+)/)
    return m !== null && Number(m[1]) > 5000
  })())
check('A3 a funcao decide pela CONDICAO scriptMode==="verbatim"',
  /function analyzePromptMaxChars\([\s\S]{0,200}?scriptMode === 'verbatim'\s*\?\s*ANALYZE_PROMPT_MAX_CHARS\s*:\s*ANALYZE_PROMPT_MAX_CHARS_SOURCE/.test(LIMC))
check('A4 a frase recebe o teto por parametro (nao pode citar outro numero)',
  /function analyzePromptTooLongMessage\(\s*max\s*:\s*number/.test(LIMC) &&
  /\$\{max\.toLocaleString\('en-US'\)\}/.test(LIMC))
check('A5 a frase NAO volta a cravar a constante',
  !/\$\{ANALYZE_PROMPT_MAX_CHARS\.toLocaleString\('en-US'\)\} chars max/.test(LIMC))

// ── B. O COBRADOR (a rota que devolve 400) ────────────────────────────────
check('B1 a rota importa o calculo da fonte unica',
  /import \{[^}]*analyzePromptMaxChars[^}]*\} from '@\/lib\/analyzeLimits'/.test(ROTAC))
check('B2 a rota deriva o teto do scriptMode do CORPO',
  /const promptMaxChars = analyzePromptMaxChars\(body\.scriptMode\)/.test(ROTAC))
check('B3 a comparacao usa o teto derivado, nao a constante',
  /if \(prompt\.length > promptMaxChars\)/.test(ROTAC) &&
  !/if \(prompt\.length > ANALYZE_PROMPT_MAX_CHARS\)/.test(ROTAC))
check('B4 a frase do 400 recebe o teto COBRADO',
  /analyzePromptTooLongMessage\(promptMaxChars\)/.test(ROTAC) &&
  !/analyzePromptTooLongMessage\(\)/.test(ROTAC))
check('B5 a telemetria grava o teto cobrado e o modo',
  /max_chars: promptMaxChars/.test(ROTAC) && /script_mode: body\.scriptMode/.test(ROTAC))
check('B6 nenhuma sobra do teto velho cravado na rota',
  (ROTAC.match(/ANALYZE_PROMPT_MAX_CHARS/g) || []).length === 0)

// ── C. O STUDIO (a tela que TRAVA o botao) ────────────────────────────────
check('C1 o Studio importa o calculo da fonte unica',
  /import \{ analyzePromptMaxChars \} from '@\/lib\/analyzeLimits'/.test(STUDIOC))
check('C2 o teto da tela vem do MODO escolhido',
  /const promptMax = useMemo\(\(\) => analyzePromptMaxChars\(scriptMode\), \[scriptMode\]\)/.test(STUDIOC))
check('C3 promptLimitState recebe o teto do modo (nao o padrao de 5.000)',
  /promptLimitState\(finalPrompt, promptMax\)/.test(STUDIOC) &&
  !/promptLimitState\(finalPrompt\)/.test(STUDIOC))
check('C4 o Studio CONTINUA barrando o Generate acima do teto',
  /if \(limit\.over\) return/.test(STUDIOC))
check('C5 o Studio nao redigita nenhum teto a mao',
  !/promptLimitState\([^)]*,\s*\d{4,}\s*\)/.test(STUDIOC))

// ── D. O /generate (a recusa antes da rede) ───────────────────────────────
check('D1 o /generate importa o calculo da fonte unica',
  /import \{ analyzePromptMaxChars \} from '@\/lib\/analyzeLimits'/.test(GENC))
check('D2 a recusa local usa o teto do modo',
  /const promptMaxAqui = analyzePromptMaxChars\(scriptMode\)/.test(GENC) &&
  /if \(sourceLen > promptMaxAqui\)/.test(GENC))
check('D3 a FRASE mostrada cita o teto cobrado, nao a constante',
  /over the \$\{promptMaxAqui\.toLocaleString\('en-US'\)\} limit/.test(GENC))
check('D4 o excedente e calculado sobre o MESMO teto',
  /const excedente = sourceLen - promptMaxAqui/.test(GENC))
check('D5 a telemetria leva teto e modo',
  /prompt_len=\$\{sourceLen\} limite=\$\{promptMaxAqui\} modo=\$\{scriptMode\}/.test(GENC))
check('D6 o maxLength da caixa acompanha o modo',
  /maxLength=\{analyzePromptMaxChars\(scriptMode\)\}/.test(GENC) &&
  !/maxLength=\{ANALYZE_PROMPT_MAX_CHARS\}/.test(GENC))
check('D7 nenhuma sobra do teto velho cravado no /generate',
  (GENC.match(/ANALYZE_PROMPT_MAX_CHARS\b/g) || []).length === 0)

// ── E. INVARIANTE: quem MOSTRA e quem COBRA usam a MESMA funcao ───────────
for (const [nome, txt] of [['rota', ROTAC], ['studio', STUDIOC], ['generate', GENC]]) {
  check(`E:${nome} chama analyzePromptMaxChars (nenhuma copia local da regra)`,
    /analyzePromptMaxChars\(/.test(txt))
}

const total = ok + falhas.length
console.log(`\n[roteiro-longo-nao-e-erro] ${ok}/${total} verificacoes verdes`)
if (falhas.length > 0) {
  console.log('\nVERMELHAS:')
  for (const f of falhas) console.log('  x ' + f)
  process.exit(1)
}
console.log('OK — o teto e do MODO, a frase cita o teto cobrado, e o Studio segue barrando.')

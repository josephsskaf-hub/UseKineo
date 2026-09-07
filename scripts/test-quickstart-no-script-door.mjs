// ═══ KINEO-PORTA-QUICKSTART-2026-09-07 ══════════════════════════════════════
// A faixa "Continue from ChatGPT" (components/ChatGptWelcomeBanner.tsx) e a
// MAIOR superficie da casa para quem vem do ChatGPT. Medido em producao (7d):
//   · chatgpt_welcome_banner_shown ......... 196 sessoes / 116 pessoas
//   · chatgpt_quickstart_input_opened ......  95 sessoes
//   · chatgpt_quickstart_selected ..........  79 sessoes
// 101 das 196 sessoes viram a faixa e NUNCA clicaram na caixa. Para elas os
// dois botoes sao `disabled={!ready}` (exigem texto colado) e a unica saida
// era o "×". A pagina /chatgpt (prompt da casa → roteiro colado de volta) teve
// 2 visualizacoes no mesmo periodo: existe e nao tinha porta aqui.
//
// O PRINCIPIO que este guardiao protege: a terceira saida esta amarrada a
// CONDICAO que decide (`limit.length === 0`, o mesmo numero que decide
// `ready`), vive DENTRO do card e depois dos dois botoes, aponta para /chatgpt
// com o utm desta porta, tem evento proprio de clique, e NAO toca nos dois
// botoes, na sua copia, nos eventos antigos nem no contrato da outra pista
// (lib/growth/chatgptQuickstart.ts). Um mutante que remova o link, vire a
// condicao em `true`, tire o utm, aponte para outra rota, renomeie o evento ou
// mova o link para fora do ramo condicional fica VERMELHO aqui.
//
// ESTILO: `readFileSync` sobre os arquivos REAIS. Nunca `import` com alias `@/`
// — 72 testes de scripts/ morrem no import antes da primeira verificacao.
// Rode: node scripts/test-quickstart-no-script-door.mjs
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const norm = (s) => s.replace(/\r\n/g, '\n')
const src = (p) => norm(readFileSync(new URL('../' + p, import.meta.url), 'utf8'))
let ok = 0, fail = 0
const check = (n, c) => { c ? (ok++, console.log('  ok  ' + n)) : (fail++, console.log('  FAIL ' + n)) }
const conta = (texto, s) => texto.split(s).length - 1

// Recorta um bloco `{ … }` a partir da assinatura, casando chaves de verdade.
function bloco(texto, assinatura, desde = 0) {
  const ini = texto.indexOf(assinatura, desde)
  if (ini < 0) return ''
  const abre = texto.indexOf('{', ini)
  let prof = 0
  for (let i = abre; i < texto.length; i++) {
    if (texto[i] === '{') prof++
    else if (texto[i] === '}') { prof--; if (prof === 0) return texto.slice(ini, i + 1) }
  }
  return ''
}
// Recorta um bloco `( … )` a partir da assinatura, casando parenteses.
function parens(texto, assinatura, desde = 0) {
  const ini = texto.indexOf(assinatura, desde)
  if (ini < 0) return ''
  const abre = texto.indexOf('(', ini + assinatura.length - 1)
  let prof = 0
  for (let i = abre; i < texto.length; i++) {
    if (texto[i] === '(') prof++
    else if (texto[i] === ')') { prof--; if (prof === 0) return texto.slice(ini, i + 1) }
  }
  return ''
}
// Recorta o CORPO de uma funcao (o `{` que vem depois de `) {`), nao a
// desestruturacao dos parametros — ChatGptWelcomeCard({ onSelect, onDismiss }).
function corpo(texto, assinatura) {
  const ini = texto.indexOf(assinatura)
  if (ini < 0) return ''
  const cab = texto.indexOf(') {', ini)
  return cab < 0 ? '' : bloco(texto, ') {', cab)
}
// Conta quantas vezes um seletor abre bloco no NIVEL RAIZ do CSS (linha sem
// recuo) — as mesmas classes reaparecem recuadas dentro do @media.
const seletorRaiz = (texto, sel) => (texto.match(new RegExp('^' + sel.replace(/[.,:()]/g, (c) => '\\' + c), 'mg')) ?? []).length
// Recorta um elemento JSX `<tag …>…</tag>` a partir da posicao do `<tag`.
function elemento(texto, abertura, fechamento, desde = 0) {
  const ini = texto.indexOf(abertura, desde)
  if (ini < 0) return ''
  const fim = texto.indexOf(fechamento, ini)
  return fim < 0 ? '' : texto.slice(ini, fim + fechamento.length)
}

const tela = src('components/ChatGptWelcomeBanner.tsx')
const css = src('components/ChatGptWelcomeBanner.module.css')
const contrato = src('lib/growth/chatgptQuickstart.ts')

const HREF = '/chatgpt?utm_source=quickstart_banner'
const EVENTO = 'chatgpt_quickstart_no_script_clicked'
const TEXTO = 'No script yet? Get the prompt that makes ChatGPT write one →'

// ─────────────────────────────────────────────────────────────────────────────
console.log('1 · o href da porta: exportado, /chatgpt, com o utm desta superficie')
check(`exporta QUICKSTART_NO_SCRIPT_HREF = '${HREF}' (uma vez)`,
  conta(tela, `export const QUICKSTART_NO_SCRIPT_HREF = '${HREF}'`) === 1)
check('o href e a rota /chatgpt (nao outra pagina) com utm_source=quickstart_banner',
  (() => { const u = new URL(HREF, 'https://www.usekineo.com'); return u.pathname === '/chatgpt' && u.searchParams.get('utm_source') === 'quickstart_banner' })())
check('nenhuma outra constante ou literal define o href da porta (fonte unica)',
  conta(tela, "'/chatgpt") === 1)

// ─────────────────────────────────────────────────────────────────────────────
console.log('2 · a CONDICAO: o link vive dentro de `limit.length === 0 ? ( … ) : null`, e so ai')
const card = corpo(tela, 'export function ChatGptWelcomeCard(')
check('ChatGptWelcomeCard existe e e o card que a faixa renderiza',
  card.length > 0 && tela.includes('<ChatGptWelcomeCard'))
check('`limit` nasce de promptLimitState(input, …) dentro do card — e o numero que decide',
  /const limit = useMemo\(\s*\(\) => promptLimitState\(input, CHATGPT_QUICKSTART_INPUT_LIMIT\)/.test(card))
check('`ready` continua = limit.length > 0 && !limit.over (a porta usa o MESMO numero, invertido)',
  card.includes('const ready = limit.length > 0 && !limit.over'))
const ramoAbre = '{limit.length === 0 ? ('
check('o ramo condicional existe com o predicado EXATO `limit.length === 0` (nao `true`, nao `!ready`)',
  conta(card, ramoAbre) === 1)
const ramo = parens(card, ramoAbre)
check('o ramo fecha com `: null` (sem link no outro lado da condicao)',
  ramo.length > 0 && /^\s*:\s*null\s*\}/.test(card.slice(card.indexOf(ramoAbre) + ramo.length)))
const link = elemento(ramo, '<a', '</a>')
check('o <a> da porta esta DENTRO do ramo condicional',
  link.length > 0 && link.includes('href={QUICKSTART_NO_SCRIPT_HREF}'))
check('o <a> da porta aparece UMA vez no arquivo — e essa vez e dentro do ramo (nada fora dele)',
  conta(tela, 'href={QUICKSTART_NO_SCRIPT_HREF}') === 1 && conta(ramo, 'href={QUICKSTART_NO_SCRIPT_HREF}') === 1)
check('o ramo nao contem os botoes (os dois botoes ficam FORA da condicao)',
  !ramo.includes('<button'))

// ─────────────────────────────────────────────────────────────────────────────
console.log('3 · o <a>: classe, texto e evento proprio (mesmo padrao da porta do aviso de instrucao)')
check('className={styles.noScript}', link.includes('className={styles.noScript}'))
check(`texto exato: "${TEXTO}"`, link.includes(TEXTO))
check(`onClick dispara trackEvent('${EVENTO}', { variant: CHATGPT_QUICKSTART_VARIANT })`,
  /onClick=\{\(\) => \{\s*void trackEvent\('chatgpt_quickstart_no_script_clicked', \{ variant: CHATGPT_QUICKSTART_VARIANT \}\)\s*\}\}/.test(link))
check('o evento novo aparece UMA vez no arquivo e so dentro do <a>',
  conta(tela, EVENTO) === 1 && conta(link, EVENTO) === 1)
check('o clique nao navega por router nem debita: e um <a> puro com href',
  !link.includes('router.') && !link.includes('onSelect('))

// ─────────────────────────────────────────────────────────────────────────────
console.log('4 · POSICAO: dentro do .editor, depois de editorActions, antes do aviso "Your text stays editable"')
const posActions = card.indexOf('className={styles.editorActions}')
const posRamo = card.indexOf(ramoAbre)
const posAviso = card.indexOf('Your text stays editable in Studio before anything is generated.')
const posEditorFecha = card.indexOf('<p className={styles.proof}>')
check('editorActions existe no card', posActions > 0)
check('o ramo vem DEPOIS do bloco editorActions', posRamo > posActions)
check('o ramo vem ANTES do aviso "Your text stays editable…"', posAviso > 0 && posRamo < posAviso)
check('o ramo vem antes do fecho do .editor (antes do <p className={styles.proof}>)', posEditorFecha > 0 && posRamo < posEditorFecha)
const acoes = elemento(card, '<div className={styles.editorActions}>', '</div>')
check('o link NAO esta dentro do grid editorActions (nao vira terceira coluna)', !acoes.includes('QUICKSTART_NO_SCRIPT_HREF'))

// ─────────────────────────────────────────────────────────────────────────────
console.log('5 · NADA MAIS MUDOU: os dois botoes, a copia deles, os eventos antigos, a fronteira de cliente')
check('os DOIS botoes continuam disabled={!ready}', conta(acoes, 'disabled={!ready}') === 2 && conta(acoes, '<button') === 2)
check('copia do botao primario intacta: "Use this script →"', acoes.includes('Use this script →'))
check('copia do botao secundario intacta: "I only have an idea — write the script"', acoes.includes('I only have an idea — write the script'))
check("onSelect('finished_script', input) e onSelect('idea', input) intactos",
  acoes.includes("onClick={() => onSelect('finished_script', input)}") && acoes.includes("onClick={() => onSelect('idea', input)}"))
for (const ev of ['chatgpt_welcome_banner_shown', 'chatgpt_welcome_banner_dismissed', 'chatgpt_quickstart_selected', 'chatgpt_quickstart_input_opened']) {
  check(`evento antigo '${ev}' continua emitido uma vez`, conta(tela, `trackEvent('${ev}'`) === 1)
}
check('a logica de trim/limite intacta (trimPromptToLimit, formatLimitCounter, Trim to fit)',
  tela.includes('trimPromptToLimit(input, CHATGPT_QUICKSTART_INPUT_LIMIT)') && tela.includes('formatLimitCounter(limit)') && tela.includes('✂ Trim to fit'))
check("o componente continua 'use client' na primeira linha", tela.startsWith("'use client'"))
check('nenhum builtin de Node importado (fronteira servidor/cliente — tsc nao ve)',
  !/from ['"](node:|fs|path|crypto|child_process|os)['"/]/.test(tela))

// ─────────────────────────────────────────────────────────────────────────────
console.log('6 · o contrato da OUTRA pista (lib/growth/chatgptQuickstart.ts) nao foi tocado')
let base = null
try {
  base = norm(execSync('git show origin/main:lib/growth/chatgptQuickstart.ts', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
} catch { base = null }
check('git show origin/main:lib/growth/chatgptQuickstart.ts respondeu', base !== null)
check('lib/growth/chatgptQuickstart.ts e IDENTICO ao de origin/main', base !== null && base === contrato)
check('o componente continua importando o contrato (nao copiou nada para dentro)',
  tela.includes("from '@/lib/growth/chatgptQuickstart'") && tela.includes('CHATGPT_QUICKSTART_VARIANT,'))

// ─────────────────────────────────────────────────────────────────────────────
console.log('7 · o modulo CSS: .noScript existe, discreto, e nenhuma classe antiga sumiu')
const noScript = bloco(css, '.noScript {')
check('.noScript existe no modulo CSS', noScript.length > 0)
check('.noScript usa a paleta do arquivo (#67e8f9 ou #dbeafe), 11px, 850, sem sublinhado em repouso',
  /#(67e8f9|dbeafe)/.test(noScript) && noScript.includes('font-size: 11px') && noScript.includes('font-weight: 850') && noScript.includes('text-decoration: none'))
check('.noScript:hover sublinha', /\.noScript:hover \{[^}]*text-decoration: underline/.test(css))
for (const cls of ['.quickstart {', '.editor {', '.editorActions {', '.continueButton, .ideaButton {', '.continueButton {', '.ideaButton {', '.continueButton:disabled, .ideaButton:disabled {', '.proof {', '.dismiss {', '.limitRow {', '.trimButton {'])
  check(`classe antiga intacta (nivel raiz): ${cls.replace(' {', '')}`, seletorRaiz(css, cls) === 1)

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${ok} ok · ${fail} FAIL`)
process.exit(fail ? 1 : 0)

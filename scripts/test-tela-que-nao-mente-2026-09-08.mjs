#!/usr/bin/env node
// KINEO-TELA-QUE-NAO-MENTE-2026-09-08 (madrugada-produto M10)
//
// O QUE ESTE GUARDIAO TRAVA. Que uma falha de LEITURA do saldo volte a ser
// exibida como o NUMERO ZERO. Em 28/08 o Supabase recusou todo token fresco e
// o produto mostrou "0 credits" para gente com saldo — inclusive o fundador,
// com 1.489 creditos no banco. O incidente foi curado por infra; a mentira
// ficou no codigo, e desde a versao B (08/09) ela e pior: um zero falso agora
// abre a porta de $1 e a ponte de saldo baixo em cima de quem ja pagou.
//
// ESTILO: readFileSync + contagem. Nao usa `assert` (morre na 1a falha e
// esconde o resto) e nao importa nada com alias `@/` (guardiao com alias nao
// roda: morre no import antes da 1a verificacao).
//
// ANCORAGEM: pela CONDICAO, nao pela forma. O que se exige e que cada
// superficie CONSULTE o predicado unico antes de escrever um numero, e que o
// servidor MARQUE a falha. Trocar nomes de variavel nao deve deixar isto
// verde; apagar a consulta deve deixar vermelho.

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const read = (p) => {
  const full = join(ROOT, p)
  if (!existsSync(full)) return null
  // Normaliza CRLF: no checkout do Windows toda regex de duas linhas quebra
  // e o guardiao fica vermelho por final de linha, nao por defeito.
  return readFileSync(full, 'utf8').split('\r\n').join('\n')
}

let pass = 0
let fail = 0
const falhas = []
function check(nome, condicao) {
  if (condicao) { pass++ } else { fail++; falhas.push(nome) }
}

// ═══════════════════════════════════════════════════════════════════════
// A. A FONTE UNICA EXISTE E DIZ O QUE PRECISA DIZER
// ═══════════════════════════════════════════════════════════════════════
const src = read('lib/creditsReadFailure.ts')
check('A1 lib/creditsReadFailure.ts existe', src !== null)
check('A2 exporta o predicado isCreditsReadFailure',
  !!src && /export function isCreditsReadFailure/.test(src))
check('A3 exporta o nome do evento read_failed_shown',
  !!src && /READ_FAILED_EVENT\s*=\s*'read_failed_shown'/.test(src))
check('A4 exporta o campo que o servidor marca',
  !!src && /CREDITS_READ_FAILED_FIELD\s*=\s*'readFailed'/.test(src))
// O predicado precisa DECIDIR por status e por marca. Se alguem apagar um dos
// dois ramos, metade das falhas volta a passar como saldo real.
check('A5 o predicado olha o status HTTP',
  !!src && /status\s*<\s*200\s*\|\|\s*status\s*>=\s*300/.test(src))
check('A6 o predicado olha a marca do corpo',
  !!src && /\[CREDITS_READ_FAILED_FIELD\]/.test(src))
// 401 NAO e falha de leitura: e visitante deslogado. Confundir os dois faria
// todo trafego de anuncio deslogado emitir read_failed_shown e o denominador
// da proxima medicao seria lixo.
check('A7 401 fica de fora do predicado',
  !!src && /if \(status === 401\) return false/.test(src))
// A copy que as telas mostram sai daqui, nao de literal em cada arquivo.
check('A8 a copy da tela e exportada daqui',
  !!src && /READ_FAILED_LABEL/.test(src) && /READ_FAILED_HINT/.test(src))

// ═══════════════════════════════════════════════════════════════════════
// B. O SERVIDOR ADMITE A FALHA — E NAO MANDA NUMERO JUNTO
// ═══════════════════════════════════════════════════════════════════════
const rota = read('app/api/credits/route.ts')
check('B1 a rota de creditos existe', rota !== null)
check('B2 a rota importa a fonte unica',
  !!rota && /import \{ CREDITS_READ_FAILED_FIELD \} from '@\/lib\/creditsReadFailure'/.test(rota))
// Os dois ramos de falha precisam marcar. Contar as ocorrencias e o que amarra
// a trava a CADA ramo: se alguem apagar um, o numero cai e isto fica vermelho.
const marcas = rota ? (rota.match(/\[CREDITS_READ_FAILED_FIELD\]:\s*true/g) || []).length : 0
check(`B3 os DOIS ramos de falha marcam readFailed (achei ${marcas})`, marcas >= 2)
// A regressao especifica que existia: o catch externo devolvia credits: 0.
check('B4 nenhum ramo de erro devolve credits: 0 junto com o erro',
  !!rota && !/credits:\s*0,\s*error:/.test(rota) && !/error:[^}]*credits:\s*0/.test(rota))

// ═══════════════════════════════════════════════════════════════════════
// C. AS TRES SUPERFICIES CONSULTAM O PREDICADO ANTES DE ESCREVER UM NUMERO
// ═══════════════════════════════════════════════════════════════════════
const superficies = [
  ['components/TopBar.tsx', 'topbar_credit_chip'],
  ['components/NavCreditsBadge.tsx', 'landing_nav_badge'],
  ['components/Sidebar.tsx', 'sidebar_credit_chip'],
]
for (const [arquivo, superficie] of superficies) {
  const txt = read(arquivo)
  const nome = arquivo.replace('components/', '')
  check(`C:${nome} existe`, txt !== null)
  check(`C:${nome} importa o predicado da fonte unica`,
    !!txt && /from '@\/lib\/creditsReadFailure'/.test(txt))
  check(`C:${nome} CHAMA isCreditsReadFailure`,
    !!txt && /isCreditsReadFailure\(/.test(txt))
  // Amarrado a VARIAVEL que decide, nao ao texto: o resultado do predicado
  // precisa governar um `if`. Trocar o `if` por `true` mantem a contagem de
  // texto intacta, entao exigimos a forma condicional.
  check(`C:${nome} o predicado governa um if`,
    !!txt && /if \(isCreditsReadFailure\(res\.status, data\)\)/.test(txt))
  check(`C:${nome} emite read_failed_shown com a sua superficie`,
    !!txt && txt.includes('READ_FAILED_EVENT') && txt.includes(`surface: '${superficie}'`))
}

// ═══════════════════════════════════════════════════════════════════════
// D. AS REGRESSOES NOMEADAS, UMA A UMA
// ═══════════════════════════════════════════════════════════════════════
const topbar = read('components/TopBar.tsx')
const nav = read('components/NavCreditsBadge.tsx')
const side = read('components/Sidebar.tsx')

// D1: a barra lateral escrevia zero SABENDO que a resposta nao estava ok.
// Sem tirar os comentarios, esta trava casa com o comentario que EXPLICA a
// regressao e fica vermelha por causa da propria documentacao. Ja aconteceu.
const semComentario = (t) => (t ?? '').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
const sideCode = semComentario(side)
check('D1 Sidebar nao tem mais `else setCredits(0)` nem `catch { setCredits(0) }`',
  !!side && !/\} else setCredits\(0\)/.test(sideCode) && !/catch \{ setCredits\(0\) \}/.test(sideCode))
// D2: a barra lateral renderizava `credits ?? 0` sem terceira posicao.
check('D2 Sidebar tem estado proprio de leitura falhada',
  !!side && /const \[creditsReadFailed, setCreditsReadFailed\] = useState\(false\)/.test(side))
check('D3 Sidebar mostra a copy da fonte unica no lugar do numero',
  !!side && /creditsReadFailed[\s\S]{0,80}READ_FAILED_LABEL/.test(side))
// D4: o chip do topo apagava o sinal de erro em cima da propria falha.
check('D4 TopBar sai antes de setErrored(false) quando a leitura falhou',
  !!topbar && /isCreditsReadFailure\(res\.status, data\)\)[\s\S]{0,600}?return\n\s*\}/.test(topbar))
// D5: o badge da landing pintava pilula vermelha de 0 apontando para /pricing.
check('D5 NavCreditsBadge esconde (null) em vez de inventar zero',
  !!nav && /isCreditsReadFailure\(res\.status, data\)\)[\s\S]{0,300}?setCredits\(null\)/.test(nav))
// D6: o evento nao pode sair a cada tecla/refetch — uma vez por montagem.
check('D6 TopBar trava o evento com um ref (uma vez por montagem)',
  !!topbar && /readFailedSentRef/.test(topbar))
check('D7 Sidebar trava o evento com um ref (uma vez por montagem)',
  !!side && /creditsReadFailedSentRef/.test(side))

// D8/D9: a trava que faltava. Proibir as FORMAS antigas (`else setCredits(0)`)
// nao proibe o VALOR: um mutante que troca `setCredits(null)` por
// `setCredits(0)` DENTRO do ramo de falha sobreviveu a primeira versao deste
// guardiao. Ausencia da forma velha nao e ausencia do numero inventado — o que
// se exige agora e o conteudo do proprio ramo que o predicado governa.
// Janela por CONTAGEM DE CHAVES, nao por numero de caracteres: uma fatia fixa
// vaza para o codigo normal logo abaixo (que legitimamente escreve o saldo) e
// a trava fica vermelha por recorte, nao por defeito.
function ramoDeFalha(txt) {
  const marca = 'if (isCreditsReadFailure(res.status, data)) {'
  const i = (txt ?? '').indexOf(marca)
  if (i < 0) return null
  let profundidade = 0
  for (let j = i + marca.length - 1; j < txt.length; j++) {
    if (txt[j] === '{') profundidade++
    else if (txt[j] === '}') {
      profundidade--
      if (profundidade === 0) return txt.slice(i, j + 1)
    }
  }
  return null
}
for (const [arquivo] of superficies) {
  const txt = read(arquivo)
  const nome = arquivo.replace('components/', '')
  const ramo = ramoDeFalha(txt)
  check(`D8:${nome} o ramo de falha existe e e legivel`, ramo !== null)
  // Nenhum numero pode ser escrito de dentro do ramo que admite nao ter lido.
  check(`D9:${nome} o ramo de falha nao escreve saldo nenhum`,
    !!ramo && !/setCredits\(\s*0\s*\)/.test(ramo) && !/setCredits\(typeof/.test(ramo))
}

// ═══════════════════════════════════════════════════════════════════════
const total = pass + fail
console.log(`\n[tela-que-nao-mente] ${pass}/${total} verificacoes passaram`)
if (fail > 0) {
  console.log(`\n${fail} FALHA(S):`)
  for (const f of falhas) console.log('  ✗ ' + f)
  process.exit(1)
}
console.log('OK — nenhuma superficie de saldo escreve um numero que nao leu.')

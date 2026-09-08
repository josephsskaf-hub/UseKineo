// ═══ GUARDIÃO — O PREFLIGHT NÃO ACUSA MAIS QUEM NÃO INSISTIU ═══════════════
//
// O que este arquivo prova (madrugada-produto #6, 08/09):
//
//   O evento `script_preflight_overridden` afirmava que a pessoa tinha
//   ignorado um aviso e que a viagem ia bater na trava de narração. MEDIDO em
//   45 dias, nos 17 disparos existentes: 2 saíram de AUTO-START (a máquina
//   apertou Generate) e 13 NÃO bateram na trava — 10 viraram vídeo, inclusive
//   com 32% e 37% de cobertura. A régua local media o texto CRU e ignorava
//   que, desde 03/09, o servidor DESCE o alvo sozinho (`autofitDown`).
//
// Estilo readFileSync/contagem de propósito: nada de `assert` que morre na
// primeira falha e imprime `checks/checks` (lição de 08/09, #5).
//
// ANCORADO PELA CONDIÇÃO, não pela redação: o que não pode voltar é (a) o
// evento sair sem o veredito do servidor, (b) o veredito ser recalculado à
// mão em vez de vir da MESMA função, (c) alguém transformar a previsão local
// num BLOQUEIO de despacho — foi ela que errou 13 de 17.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (p) => readFileSync(join(raiz, p), 'utf8')

let ok = 0
let falhas = []
const check = (nome, condicao) => {
  if (condicao) ok++
  else falhas.push(nome)
}

const cliente = ler('app/(dashboard)/generate/GenerateClient.tsx')
const fit = ler('lib/narrationFit.ts')

// ─── A. O BLOCO EXISTE E É O DO PREFLIGHT ────────────────────────────────
const iEvento = cliente.indexOf("trackEvent('script_preflight_overridden'")
check('A1 o evento do preflight continua existindo', iEvento > 0)
check('A2 o evento é emitido uma única vez no arquivo',
  cliente.split("trackEvent('script_preflight_overridden'").length - 1 === 1)

// Recorta o bloco `if (!cobre && falaSeg > 12) { ... }` por CONTAGEM DE
// CHAVES a partir do `if` — nunca por fatia de N caracteres, que envelhece a
// cada comentário novo.
const iIf = cliente.lastIndexOf('if (!cobre && falaSeg > 12) {', iEvento)
check('A3 a condição do bloco continua sendo cobertura-abaixo com fala > 12s', iIf > 0)
let bloco = ''
if (iIf > 0) {
  let nivel = 0
  let i = cliente.indexOf('{', iIf)
  const inicio = i
  for (; i < cliente.length; i++) {
    if (cliente[i] === '{') nivel++
    else if (cliente[i] === '}') {
      nivel--
      if (nivel === 0) break
    }
  }
  bloco = cliente.slice(inicio, i + 1)
}
check('A4 o bloco foi recortado inteiro', bloco.length > 200 && bloco.includes('script_preflight_overridden'))

// ─── B. O VEREDITO VEM DA MESMA FUNÇÃO DO SERVIDOR ───────────────────────
check('B1 o cliente importa autofitDown de narrationFit',
  /import\s*\{[^}]*\bautofitDown\b[^}]*\}\s*from\s*'@\/lib\/narrationFit'/.test(cliente))
check('B2 o bloco CHAMA autofitDown', /\bautofitDown\s*\(/.test(bloco))
check('B3 o cliente importa parseUserScript (mede narração, não texto cru)',
  /import\s*\{[^}]*\bparseUserScript\b[^}]*\}\s*from\s*'@\/lib\/scriptParser'/.test(cliente))
check('B4 a fala medida para o veredito passa pelo parser', /parseUserScript\s*\(/.test(bloco))
check('B5 autofitDown continua exportado por narrationFit',
  /export\s+function\s+autofitDown\s*\(/.test(fit))
check('B6 o servidor do render continua usando a MESMA função',
  /\bautofitDown\s*\(/.test(ler('app/api/generate-video-cinematic/route.ts')))

// O veredito não pode ser redigitado: nada de recalcular o piso de 60% aqui.
check('B7 o bloco não redigita o piso de cobertura do servidor',
  !bloco.includes('0.60') && !bloco.includes('0.6 ') && !/MIN_AUTOFIT_DOWN_COVERAGE\s*=/.test(bloco))

// ─── C. O EVENTO CARREGA O QUE FALTAVA ───────────────────────────────────
// Cada campo é lido DENTRO do bloco: um campo declarado noutro evento não vale.
for (const campo of [
  'refusal_predicted',
  'server_would_descend',
  'server_descend_reason',
  'server_effective_seconds',
  'server_speech_seconds',
  'autostart_pending',
]) {
  // Sem RegExp montada por template (`` num template literal vira backspace,
  // não fronteira de palavra — o guardião ficaria verde por construção).
  check(`C:${campo} viaja no evento`, bloco.includes(campo + ':'))
}
// E os dois que decidem a leitura precisam vir da VARIÁVEL, não de literal.
check('C7 refusal_predicted é derivado do degrau (não cravado)',
  /refusal_predicted:\s*!\s*degrau\.applied/.test(bloco))
check('C8 server_would_descend é derivado do degrau (não cravado)',
  /server_would_descend:\s*degrau\.applied/.test(bloco))
check('C9 autostart_pending consulta o ref do auto-start',
  /autostart_pending:\s*activationAutostartEngineRef\.current\s*!==\s*null/.test(bloco))
check('C10 o ref do auto-start continua existindo no arquivo',
  /const\s+activationAutostartEngineRef\s*=\s*useRef</.test(cliente))

// ─── D. A PREVISÃO LOCAL NÃO PODE VIRAR BLOQUEIO ─────────────────────────
// Ela errou 13 de 17: barrar o despacho por ela mataria filme real.
check('D1 o bloco não interrompe o fluxo (sem return)', !/\breturn\b/.test(bloco))
check('D2 o bloco não derruba a fase para failed', !/setPhase\(\s*'failed'\s*\)/.test(bloco))
check('D3 o bloco não arma a tela de roteiro curto', !/setScriptTooShort\s*\(/.test(bloco))
check('D4 o bloco não troca a duração da pessoa', !/setDuration\s*\(/.test(bloco))
check('D5 o bloco não mostra erro', !/setError\s*\(/.test(bloco))

// ─── E. O IRMÃO DE CIMA (roteiro LONGO) CONTINUA INTACTO ─────────────────
check('E1 o autofit para cima segue existindo', cliente.includes("trackEvent('script_duration_autofit'"))
check('E2 o overflow segue registrado', cliente.includes("trackEvent('script_duration_overflow'"))

const total = ok + falhas.length
console.log(`\npreflight-que-nao-acusa: ${ok}/${total} verificações passaram`)
if (falhas.length) {
  console.log('\nFALHAS:')
  for (const f of falhas) console.log('  ✗ ' + f)
  process.exit(1)
}
console.log('✓ o preflight mede com a régua do servidor, diz quem apertou o botão, e não bloqueia ninguém')

#!/usr/bin/env node
// ═══ GUARDIÃO — ENTREGA NOITE r6 (09/09/2026) ════════════════════════════════
// O que esta rotação prometeu: a tela de falha para de dizer "Generation
// failed · You can retry safely" para estados em que retentar NÃO PODE
// funcionar — e para de esconder um relógio de 15 minutos que o próprio
// servidor já mandava em `retry_after_ms`.
//
// Estilo readFileSync de propósito: 72 guardiões da casa morrem no import por
// causa do alias `@/` (memória `guardioes-com-alias-nao-rodam`). Aqui não há
// import nenhum do produto.
//
// Cada verificação está amarrada à VARIÁVEL QUE DECIDE, não a um texto que
// passa perto (memória `guardiao-contar-texto-nao-prova-condicao`): trocar o
// `if` por `true` tem de deixar o guardião vermelho.

import { readFileSync, existsSync } from 'node:fs'

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

function ler(caminho) {
  const cheio = `${RAIZ}${caminho}`
  if (!existsSync(cheio)) return null
  // CRLF normalizado na LEITURA: no checkout do Windows toda regex de duas
  // linhas falha em silêncio (memória `guardiao-crlf-falso-vermelho`).
  return readFileSync(cheio, 'utf8').replace(/\r\n/g, '\n')
}

let ok = 0
const falhas = []
function check(nome, condicao) {
  if (condicao === true) { ok += 1; return }
  falhas.push(nome)
}

const MOD = ler('lib/entrega/generationWaitNotice.ts')
const CLIENT = ler('app/(dashboard)/generate/GenerateClient.tsx')
const ES = ler('lib/ui/interfaceLabels.ts')
const HI = ler('lib/ui/interfaceHindi.ts')

check('1. lib/entrega/generationWaitNotice.ts existe', MOD !== null)
check('2. GenerateClient.tsx existe', CLIENT !== null)
check('3. lib/ui/interfaceLabels.ts existe', ES !== null)
check('4. lib/ui/interfaceHindi.ts existe', HI !== null)

if (MOD && CLIENT && ES && HI) {
  // ── O módulo puro ────────────────────────────────────────────────────────
  check('5. exporta classificarEsperaDaGeracao', /export function classificarEsperaDaGeracao\(/.test(MOD))
  check('6. exporta segundosDeEspera', /export function segundosDeEspera\(/.test(MOD))
  // Pureza: sem import nenhum, senão um dia entra um cliente de banco aqui e
  // o módulo vira código de servidor dentro do bundle do navegador.
  check('7. o módulo não importa nada', !/^import\s/m.test(MOD))

  // `segundosDeEspera` é o único lugar que pode virar um número em espera.
  // As quatro recusas abaixo são o que impede a tela de inventar relógio.
  check('8. recusa o que não é number', /typeof retryAfterMs !== 'number'\)\s*return null/.test(MOD))
  check('9. recusa não-finito', /!Number\.isFinite\(retryAfterMs\)\)\s*return null/.test(MOD))
  check('10. recusa zero e negativo', /retryAfterMs <= 0\)\s*return null/.test(MOD))
  check('11. recusa acima do teto', /retryAfterMs > MAX_WAIT_MS\)\s*return null/.test(MOD))
  check('12. o teto é 24h', /const MAX_WAIT_MS = 24 \* 60 \* 60 \* 1000/.test(MOD))
  check('13. converte por ceil', /return Math\.ceil\(retryAfterMs \/ 1000\)/.test(MOD))

  // Falha fechada: sem frase E sem reason, nada é afirmado.
  check('14. sem frase e sem reason devolve null', /if \(!texto && !reason\) return null/.test(MOD))
  check('15. termina em return null', /\n  return null\n\}\n$/.test(MOD))

  // O portão. `credits_held` FICA DE FORA de propósito: ali retentar funciona.
  check('16. portão exclui credits_held', /reason === 'cinematic_gate_credits_held'\) return false/.test(MOD))
  check('17. portão reconhece o prefixo do gate', /\/\^cinematic_gate_\/\.test\(reason\)\) return true/.test(MOD))
  check('18. portão devolve retryWorks no', /kind: 'gate',[\s\S]{0,200}?retryWorks: 'no',/.test(MOD))
  check('19. portão não inventa espera', /kind: 'gate',[\s\S]{0,240}?waitSeconds: null,/.test(MOD))

  // O resfriamento — a causa desta rotação.
  check('20. resfriamento reconhece 429', /function ehResfriamento\([\s\S]{0,200}?http === 429\) return true/.test(MOD))
  check('21. resfriamento devolve after_wait', /kind: 'cooldown',[\s\S]{0,120}?retryWorks: 'after_wait',/.test(MOD))
  // O NÚMERO SÓ PODE VIR DO SERVIDOR. Se isto virar um literal, a tela promete
  // uma espera que o servidor nunca prometeu.
  check('22. a espera vem de segundosDeEspera(input.retryAfterMs)',
    /const espera = segundosDeEspera\(input\.retryAfterMs\)/.test(MOD))
  check('23. cooldown.waitSeconds é a espera do servidor',
    /kind: 'cooldown',[\s\S]{0,200}?waitSeconds: espera,/.test(MOD))
  // Sem número, a frase muda — e é a frase SEM relógio que sai.
  check('24. a frase se ramifica em espera === null',
    /detail: espera === null\n\s*\? 'Starting another one right now stops at this same place\. Give it a few minutes\.'/.test(MOD))

  check('25. prazo estourado devolve retryWorks yes', /kind: 'deadline',[\s\S]{0,140}?retryWorks: 'yes',/.test(MOD))
  check('26. prazo estourado casa deadline_exceeded', /deadline_exceeded\|retries_exhausted/.test(MOD))
  check('27. fornecedor ocupado reconhece 503', /function ehFornecedorOcupado\([\s\S]{0,200}?http === 503\) return true/.test(MOD))
  check('28. fornecedor ocupado devolve retryWorks yes', /kind: 'provider_busy',[\s\S]{0,140}?retryWorks: 'yes',/.test(MOD))
  // Dinheiro só quando o SERVIDOR falou: o campo é lido da frase dele.
  check('29. estorno é lido da frase do servidor',
    /const estornou = servidorDisseQueEstornou\(texto\)/.test(MOD))
  check('30. serverSaidRefunded nunca é literal true', !/serverSaidRefunded: true/.test(MOD))

  // ── O cliente ────────────────────────────────────────────────────────────
  check('31. o cliente importa o classificador',
    /import \{ classificarEsperaDaGeracao \} from '@\/lib\/entrega\/generationWaitNotice'/.test(CLIENT))
  // O aviso só existe no cartão genérico — os outros dois cartões já dizem a
  // saída certa e não podem ganhar recado por tabela.
  check('32. waitNotice é calculado sob showGenericFailure',
    /const waitNotice = showGenericFailure\n\s*\? classificarEsperaDaGeracao\(\{/.test(CLIENT))
  check('33. o classificador recebe a frase da tela', /const waitNotice = showGenericFailure[\s\S]{0,400}?message: error,/.test(CLIENT))
  check('34. o classificador recebe o retryAfterMs do sinal',
    /const waitNotice = showGenericFailure[\s\S]{0,500}?retryAfterMs: sinalDaFalha\?\.retryAfterMs,/.test(CLIENT))
  check('35. o classificador recebe o reason do sinal',
    /const waitNotice = showGenericFailure[\s\S]{0,560}?reason: sinalDaFalha\?\.reason \?\? null,/.test(CLIENT))

  // O ponto de estrangulamento: TODA saída de falha grava o sinal.
  check('36. trackGenerationFailure aceita retryAfterMs', /retryAfterMs\?: unknown/.test(CLIENT))
  check('37. trackGenerationFailure grava o sinal',
    /setSinalDaFalha\(\{\n\s*reason,\n\s*httpStatus: httpStatusValue,\n\s*retryAfterMs: extra\?\.retryAfterMs,/.test(CLIENT))
  check('38. o sinal carimba a hora da recusa', /setSinalDaFalha\(\{[\s\S]{0,400}?at: Date\.now\(\),/.test(CLIENT))
  // O ramo que tinha o número na mão e jogava fora.
  check('39. o despacho cinematográfico entrega o retry_after_ms',
    /'cinematic_dispatch_not_ok', \{[\s\S]{0,600}?retryAfterMs: \(data as Record<string, unknown> \| null\)\?\.retry_after_ms,/.test(CLIENT))

  // O título e a frase deixam de mentir.
  check('40. o título sai do waitNotice quando ele existe',
    /\{waitNotice\n\s*\? <UiLabel>\{waitNotice\.headline\}<\/UiLabel>\n\s*: <UiLabel>Generation failed<\/UiLabel>\}/.test(CLIENT))
  check('41. "you can retry safely" só sobrevive com retryWorks yes',
    /\{waitNotice && waitNotice\.retryWorks !== 'yes'\n\s*\? <UiLabel>\{waitNotice\.detail\}<\/UiLabel>\n\s*: <UiLabel>You can retry safely\.<\/UiLabel>\}/.test(CLIENT))

  // A trava do botão, amarrada às DUAS condições que a decidem.
  check('42. a trava exige after_wait E segundos restantes',
    /const retryTravadoPelaEspera =\n\s*waitNotice\?\.retryWorks === 'after_wait' && segundosRestantesDaEspera > 0/.test(CLIENT))
  check('43. o botão é desabilitado pela trava', /disabled=\{retryTravadoPelaEspera\}/.test(CLIENT))
  check('44. o botão mostra o relógio quando travado',
    /\{retryTravadoPelaEspera \? `🔒 Retry in \$\{relogioDaEspera\}` : '🔄 Retry'\}/.test(CLIENT))
  check('45. o portão tira o azul do botão sem travá-lo',
    /failureWillRepeat \|\| waitNotice\?\.retryWorks === 'no'/.test(CLIENT))
  check('46. os segundos restantes nunca são negativos',
    /const segundosRestantesDaEspera =\n[\s\S]{0,200}?Math\.max\(0, Math\.ceil\(/.test(CLIENT))
  check('47. sem relógio do servidor, os restantes são 0',
    /esperaTerminaEm === null\n\s*\? 0/.test(CLIENT))
  check('48. o fim da espera sai da hora da recusa mais os segundos do servidor',
    /sinalDaFalha\.at \+ waitNotice\.waitSeconds \* 1000/.test(CLIENT))

  // O carimbo desta entrega.
  check('49. emite generation_wait_notice_shown', /trackEvent\('generation_wait_notice_shown', \{/.test(CLIENT))
  check('50. o carimbo separa "não havia relógio" de "ninguém esperou"',
    /generation_wait_notice_shown'[\s\S]{0,600}?has_server_wait: waitNotice\.waitSeconds !== null,/.test(CLIENT))
  check('51. o carimbo traz o reason e o motor',
    /generation_wait_notice_shown'[\s\S]{0,300}?reason: sinalDaFalha\?\.reason \?\? null,[\s\S]{0,120}?engine:/.test(CLIENT))
  check('52. o clique de retry registra o estado da espera',
    /generation_retry_clicked'[\s\S]{0,400}?wait_remaining_s: segundosRestantesDaEspera,/.test(CLIENT))

  // ── en/es/hi ─────────────────────────────────────────────────────────────
  // As frases NÃO são redigitadas aqui: elas são extraídas do próprio módulo,
  // para que uma frase nova sem tradução deixe o guardião vermelho sozinho
  // (memória `superficie-medida-por-copia-da-regra`).
  const semComentarios = MOD.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
  const frasesDoModulo = [...semComentarios.matchAll(/^\s*(?:headline|detail|\?|:)\s*:?\s*'([^']{30,})',?$/gm)]
    .map((m) => m[1])
  // 4 títulos + 5 frases de estado (o resfriamento tem duas: com e sem
  // relógio). Número exato de propósito: frase nova obriga a olhar aqui.
  check(`53. o módulo tem as 9 frases de tela esperadas (achou ${frasesDoModulo.length})`,
    frasesDoModulo.length === 9)
  const frases = [...frasesDoModulo, 'Generation failed', 'You can retry safely.']
  const semES = frases.filter((f) => !ES.includes(`'${f}':`))
  const semHI = frases.filter((f) => !HI.includes(`'${f}':`))
  check(`54. toda frase tem espanhol (faltam: ${semES.join(' | ') || 'nenhuma'})`, semES.length === 0)
  check(`55. toda frase tem hindi (faltam: ${semHI.join(' | ') || 'nenhuma'})`, semHI.length === 0)
}

if (falhas.length === 0) {
  console.log(`✅ entrega-noite r6: ${ok} verificações OK`)
  process.exit(0)
}
console.log(`❌ entrega-noite r6: ${ok} OK, ${falhas.length} FALHARAM`)
for (const f of falhas) console.log(`   · ${f}`)
process.exit(1)

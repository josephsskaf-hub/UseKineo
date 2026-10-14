// KINEO-REGUA-35-60-90-1410 — DESFAZ, em memória, a régua de 35/60/90 s sem motor no roteirista
// (app/api/generate-script/route.ts), para os guardiões que conferem esse arquivo BYTE A BYTE contra uma base antiga.
// Módulo auxiliar; não é teste (o nome não começa com test-).
//
// ENCADEAMENTO: este conserto veio DEPOIS do KINEO-MOTOR-15S-1510 e reescreveu a linha da régua que aquele conserto tinha
// trocado. Para voltar à base de antes dos dois: semMotor15s1510(semRegua35a90_1410(texto), 'route') — este desfaz PRIMEIRO
// (devolve a linha do 15 s, com a marca dele), depois o do 15 s.
//
// Toda linha que o conserto tocou carrega a marca KINEO-REGUA-35-60-90-1410. Duas formas, e só elas:
//   · TROCA — a linha anterior foi reescrita: a linha nova é reconhecida pelo PREFIXO exato e volta a ser a anterior;
//   · ACRÉSCIMO — a linha não existia: reconhecida pelo prefixo exato e removida.
// Linha marcada que não casa com nenhum prefixo = lança. Cada prefixo vale UMA vez por texto. Com alguma linha marcada,
// TODOS os prefixos têm de aparecer (conserto pela metade também lança). scripts/test-regua-35-60-90-1410.mjs prova que,
// desfeito isto, a rota é EXATAMENTE a do pai do 1º commit com a marca.
export const MARCA_REGUA_35_60_90_1410 = 'KINEO-REGUA-35-60-90-1410'

const TROCAS = [
  ['    const regua = reguaSemMotorLonga(body.engine, isShortFilmTarget(alvoSegundos), language) ?? writerRateFor(motorDoEscritor(body.engine, isShortFilmTarget(alvoSegundos)), topic, language) // KINEO-REGUA-35-60-90-1410',
    '    const regua = writerRateFor(motorDoEscritor(body.engine, isShortFilmTarget(alvoSegundos)), topic, language) // KINEO-MOTOR-15S-1510 — sem motor (o "Write the full script") e alvo curto: a régua do 15 s (36–41 palavras), não a histórica (33)'],
]
const ACRESCIMOS = [
  "import { reguaSemMotorLonga } from '@/lib/growth/reguaSemMotor' // KINEO-REGUA-35-60-90-1410",
]

/** Quantas entradas o conserto tem na rota (trocas, acréscimos) — o guardião confere contra o diff real. */
export const FORMA_REGUA_35_60_90_1410 = { trocas: TROCAS.length, acrescimos: ACRESCIMOS.length }

/** O texto da rota de ANTES deste conserto (LF). Idempotente: sem nada marcado, devolve o texto igual (só LF). */
export function semRegua35a90_1410(s) {
  const texto = String(s).replace(/\r\n/g, '\n')
  const usadas = new Set()
  const out = []
  let marcadas = 0
  for (const l of texto.split('\n')) {
    if (!l.includes(MARCA_REGUA_35_60_90_1410)) { out.push(l); continue }
    marcadas++
    const t = TROCAS.findIndex(([novo]) => l.startsWith(novo))
    if (t >= 0) {
      if (usadas.has('t' + t)) throw new Error('desfaz-regua-35-60-90-1410: troca repetida: ' + l.slice(0, 120))
      usadas.add('t' + t)
      out.push(TROCAS[t][1])
      continue
    }
    const a = ACRESCIMOS.findIndex((p) => l.startsWith(p))
    if (a >= 0) {
      if (usadas.has('a' + a)) throw new Error('desfaz-regua-35-60-90-1410: acréscimo repetido: ' + l.slice(0, 120))
      usadas.add('a' + a)
      continue
    }
    throw new Error('desfaz-regua-35-60-90-1410: linha marcada inesperada: ' + l.slice(0, 120))
  }
  if (marcadas > 0 && usadas.size !== TROCAS.length + ACRESCIMOS.length) {
    throw new Error(`desfaz-regua-35-60-90-1410: forma inesperada (${usadas.size} de ${TROCAS.length + ACRESCIMOS.length} entradas)`)
  }
  return out.join('\n')
}

// KINEO-EMAIL-PARADO-SEM-MOTOR-1211 — desfaz EXATO desta entrega em lib/lifecycle/subscriberIdle.ts, para os guardiões históricos que
// comparam com a base (test-subscriber-idle via desfaz-motores-saem-0511). Só age se o arquivo for exatamente o "depois" desta entrega
// (sha); o resultado tem de ser exatamente o "antes" (sha da origin/main 4efd42b77). Edição desconhecida continua reprovando. Nunca usar em lib/app.
import { createHash } from 'node:crypto'

const ARQUIVO = 'lib/lifecycle/subscriberIdle.ts'
const DEPOIS_SHA = 'ca7ced565996b8eab5c3263cc9602f1d061551836a8b44f11d0cfd6d5ae1c80a'
const ANTES_SHA = '9b40094003f68611c36616cd72731ff2bd0d2e2c726dd8de4140fcec1fed5a49'
const TRECHOS = [
  {
    depois: "    ? `That's ${films.seedance} full AI film${films.seedance === 1 ? '' : 's'}, or ${films.short} short 15-second ones.` // KINEO-EMAIL-PARADO-SEM-MOTOR-1211 — sem nome de motor; a conta é a mesma\n    : `That's ${films.short} short 15-second film${films.short === 1 ? '' : 's'}.`",
    antes: "    ? `That's ${films.seedance} full AI film${films.seedance === 1 ? '' : 's'} on Seedance, or ${films.short} short 15-second ones.`\n    : `That's ${films.short} short 15-second Seedance film${films.short === 1 ? '' : 's'}.`",
  },
]
const sha = (t) => createHash('sha256').update(t).digest('hex')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semEmailParadoSemMotor1211(source, file) {
  if (typeof source !== 'string' || String(file ?? '').replace(/\\/g, '/') !== ARQUIVO) return source
  const crlf = source.includes('\r\n')
  const text = source.replace(/\r\n/g, '\n')
  if (sha(text) !== DEPOIS_SHA) return source
  let result = text
  for (const h of TRECHOS) {
    if (result.split(h.depois).length !== 2) throw Error('desfaz-email-parado-sem-motor-1211: trecho ausente/ambíguo')
    result = result.replace(h.depois, () => h.antes)
  }
  if (sha(result) !== ANTES_SHA) throw Error('desfaz-email-parado-sem-motor-1211: resultado divergente')
  return crlf ? result.replace(/\n/g, '\r\n') : result
}

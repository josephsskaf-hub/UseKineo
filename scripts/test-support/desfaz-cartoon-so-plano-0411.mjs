// KINEO-CARTOON-SO-PLANO-0411 [TRAVA 8.2 — fundador 05/11: "só dentro do plano com crédito (plano comprado)"] — desfaz, em memória, as linhas desta entrega na rota do filme,
// para os guardiões históricos que conferem a rota byte a byte. Tira só as 4 linhas marcadas e exige que sejam exatamente 4. Módulo auxiliar; não é teste; nunca usar em lib/app.
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const MARCA = 'KINEO-CARTOON-SO-PLANO-0411'
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

export function semCartoonSoPlano0411(source, file) {
  if (typeof source !== 'string' || !rel(file).endsWith(ROTA) || !source.includes(MARCA)) return source
  const crlf = source.includes('\r\n')
  const linhas = lf(source).split('\n')
  const sobra = linhas.filter((l) => !l.includes(MARCA))
  if (linhas.length - sobra.length !== 4) throw Error('desfaz-cartoon-so-plano-0411: esperava 4 linhas marcadas na rota do filme')
  const texto = sobra.join('\n')
  return crlf ? texto.replace(/\n/g, '\r\n') : texto
}

/** A rota de hoje é exatamente a de referência + esta entrega? */
export function deltaCartoonSoPlano0411Exato(source, upstream, file) {
  if (!rel(file).endsWith(ROTA) || typeof source !== 'string' || typeof upstream !== 'string' || !source.includes(MARCA)) return false
  return lf(semCartoonSoPlano0411(source, file)) === lf(upstream)
}

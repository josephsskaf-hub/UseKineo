// KINEO-MARCO-ANACRONICO-1111 [CEO 11/11 noite, filme da Mona Lisa 1911, H3 Max, 6,5] — o planejador escreveu "the Louvre's grand exterior at dawn, soft
// morning light illuminating its iconic glass pyramid" numa cena de 1913: a trava de época ("every building… belongs to that exact time") NÃO vence um
// marco nomeado em positivo, e a pirâmide de vidro (1989) abriu o filme. Aqui, quando o prompt tem o ano da época, o marco construído DEPOIS dele é
// trocado pelo que estava ali naquele ano (em positivo: o motor desenha o que é nomeado). Tabela curta, só marcos famosos e datas certas; prompt sem ano,
// ou ano depois da construção: o mesmo texto, byte a byte. Puro: sem rede.

interface Marco { re: RegExp; ano: number; quando?: RegExp; troca: string }
const MARCOS: readonly Marco[] = [
  { re: /\b(?:(?:its|the|an?)\s+)?(?:(?:iconic|famous|modern|gleaming|giant|great)\s+)*glass\s+pyramids?\b|\bLouvre\s+[Pp]yramid\b/u, ano: 1989, quando: /\bLouvre\b/i, troca: 'its long stone palace façade around the open courtyard' },
  { re: /\b(?:the\s+)?Eiffel\s+Tower\b/u, ano: 1889, troca: 'the Paris rooftops along the Seine' },
  { re: /\b(?:the\s+)?Statue\s+of\s+Liberty\b/u, ano: 1886, troca: 'New York harbor' },
  { re: /\b(?:the\s+)?Empire\s+State\s+Building\b/u, ano: 1931, troca: 'the Manhattan skyline as it stood then' },
  { re: /\b(?:the\s+)?Golden\s+Gate\s+Bridge\b/u, ano: 1937, troca: 'the San Francisco Bay' },
  { re: /\b(?:the\s+)?Sydney\s+Opera\s+House\b/u, ano: 1973, troca: 'Sydney Harbour' },
  { re: /\b(?:the\s+)?London\s+Eye\b/u, ano: 2000, troca: 'the Thames riverside' },
  { re: /\b(?:the\s+)?Burj\s+Khalifa\b/u, ano: 2010, troca: 'the desert coast' },
  { re: /\b(?:the\s+)?Christ\s+the\s+Redeemer(?:\s+statue)?\b/u, ano: 1931, troca: 'the bare Corcovado peak' },
  { re: /\b(?:the\s+)?Space\s+Needle\b/u, ano: 1962, troca: 'the Seattle waterfront' },
  { re: /\b(?:the\s+)?CN\s+Tower\b/u, ano: 1976, troca: 'the Toronto waterfront' },
  { re: /\b(?:the\s+)?Hollywood\s+sign\b/iu, ano: 1923, troca: 'the bare Hollywood hills' },
  { re: /\b(?:the\s+)?Brooklyn\s+Bridge\b/u, ano: 1883, troca: 'the East River' },
]

/** O ano da época que a trava escreveu no prompt ("period piece set strictly in the year 1913" / "Period setting: 1913"); null = sem ano. */
export function anoDaEpoca(prompt: string): number | null {
  const m = /period piece set strictly in (?:the year )?(\d{3,4})\b|Period setting: (\d{3,4})\b/iu.exec(String(prompt ?? ''))
  const ano = m ? Number(m[1] ?? m[2]) : NaN
  return Number.isFinite(ano) ? ano : null
}

/** O prompt sem marco construído depois do ano da época. Sem ano ou sem marco anacrônico: o mesmo texto. */
export function semMarcoAnacronico(prompt: string): string {
  const p = String(prompt ?? '')
  const ano = anoDaEpoca(p)
  if (ano === null) return p
  let out = p
  for (const m of MARCOS) {
    if (ano >= m.ano || (m.quando && !m.quando.test(out))) continue
    out = out.replace(new RegExp(m.re.source, m.re.flags.includes('g') ? m.re.flags : `${m.re.flags}g`), m.troca)
  }
  return out
}

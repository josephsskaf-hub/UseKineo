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
  // KINEO-EPOCA-TURCO-2011 [revisor 20/11, render bcecd459, Kling 4 grátis, TR] — a âncora do monumento (lib/cinematic/monumentoReal) escreve
  // "Setting: the ruins of Pompeii, Italy (ancient Roman stone streets and ruined villas…)" na frente de TODA cena; num filme travado em 79 AD a
  // imagem-chave nasceu como o sítio arqueológico de HOJE (casas sem teto, cidade moderna ao fundo) e com um CARRO preto na rua. A ruína é marco
  // que só existe depois da época: até 79 AD Pompeia é a cidade viva; o Coliseu fica inteiro até o terremoto de 1349. Em positivo, como as outras.
  { re: /\b(?:the\s+)?ruins\s+of\s+(?=Pompeii\b)/iu, ano: 80, troca: 'the living Roman town of ' },
  { re: /\bruined\s+villas\b/iu, ano: 80, quando: /\bPompeii\b/i, troca: 'intact red-tiled villas, shops and taverns' },
  { re: /\bpartly\s+ruined\s+outer\s+wall\b/u, ano: 1349, quando: /\bColosseum\b/i, troca: 'complete, intact outer wall' },
]

/** O ano da época que a trava escreveu no prompt ("period piece set strictly in the year 1913" / "Period setting: 1913"); null = sem ano.
 * KINEO-EPOCA-TURCO-2011 — o ano antigo que a trava escreve desde KINEO-EPOCA-POSITIVA-1111 ("the year 79 AD", "the year 44 BC") também conta:
 * antes só 3–4 dígitos, e "79 AD" voltava null — nenhuma troca rodava nos filmes antigos. BC vira ano negativo. */
export function anoDaEpoca(prompt: string): number | null {
  const m = /(?:period piece set strictly in (?:the year )?|Period setting: )(\d{1,4})(?:\s?(AD|CE|BC|BCE))?\b/iu.exec(String(prompt ?? ''))
  if (!m) return null
  const ano = Number(m[1])
  if (!Number.isFinite(ano)) return null
  return m[2] && /^bc/i.test(m[2]) ? -ano : ano
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

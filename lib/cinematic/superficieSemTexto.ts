// KINEO-CENA-PEDIDO-3010 — defeito 3 do revisor (29/10, 4 casos): lousa ("Gurdiola Bapiom"), celular, placa e pergaminho saem
// com letras sem sentido. O sufixo de sempre (textSafetySuffix) só NEGA ("no legible words, no letters") — e o motor não tem
// campo negativo: "no letters" ainda põe letra na cena. Aqui a superfície que costuma ganhar texto recebe o que ela MOSTRA,
// em frase positiva: a lousa mostra setas e círculos, a tela mostra luz difusa, a página mostra textura, a placa é cor lisa.
// Uma frase por tipo de superfície presente; cena sem nenhuma dessas superfícies: o MESMO prompt, byte a byte.

const SUPERFICIES: ReadonlyArray<{ re: RegExp; frase: string }> = [
  { re: /\b(?:chalkboard|blackboard|whiteboard|tactics board|classroom board)\b/i, frase: 'the board is covered only in hand-drawn arrows, circles and simple diagrams' },
  { re: /\b(?:smartphone|phone|cellphone|screen|monitor|laptop|tablet|display|tv)\b/i, frase: 'every screen glows with soft abstract light and colour' },
  { re: /\b(?:scroll|parchment|manuscript|book|page|pages|letter|diary|journal|newspaper|map|document|notebook)\b/i, frase: 'every page shows only aged texture and faint decorative lines' },
  { re: /\b(?:sign|signboard|billboard|placard|poster|banner|plaque|nameplate|menu|label|storefront)\b/i, frase: 'every sign is a plain block of colour' },
]

/** As frases positivas das superfícies que a cena cita (na ordem fixa); [] = nenhuma superfície de texto. */
export function frasesDeSuperficie(prompt: string): string[] {
  // A proteção negativa que já vem no prompt ("no phone or computer screens… If a phone appears…") não é uma superfície da cena.
  const p = String(prompt ?? '').replace(/No readable text[^.]*\.(?:\s*If a phone appears[^.]*\.)?/gi, ' ').replace(/no readable text, letters, numbers, labels or signage[^,.]*/gi, ' ').replace(/(?:phone )?screen (?:is )?off or blurred/gi, ' ')
  return SUPERFICIES.filter((s) => s.re.test(p)).map((s) => s.frase)
}

/** O prompt com as superfícies descritas em positivo, no fim (a 1ª frase continua sendo a ação da cena). */
export function comSuperficieSemTexto(prompt: string): string {
  const extra = fraseUnicaDeSuperficie(prompt)
  if (!extra || prompt.includes(extra)) return prompt
  return `${prompt.replace(/[\s,.]+$/, '')}. ${extra}`
}

/** As frases das superfícies numa frase só ("The board is… Every screen…."); '' = nenhuma. */
export function fraseUnicaDeSuperficie(prompt: string): string {
  const frases = frasesDeSuperficie(prompt)
  return frases.length ? frases.map((f) => f.charAt(0).toUpperCase() + f.slice(1)).join('. ') + '.' : ''
}

// KINEO-META95-PERSONAGEM-AJUSTE-2010 — regras puras do still com folha, sem rede nem alteração da política de moderação.

/** O edit arredonda dimensões para blocos de pixels; admite até 2% de arredondamento, nunca outro formato. */
export function formatoDoStillDoPersonagem(width: unknown, height: unknown, aspect: unknown): boolean {
  if (typeof width !== 'number' || typeof height !== 'number' || !Number.isFinite(width) || !Number.isFinite(height) || !Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) return false
  const alvo = aspect === '16:9' ? 16 / 9 : aspect === '1:1' ? 1 : aspect === '4:5' ? 4 / 5 : 9 / 16
  return Math.abs(width / height / alvo - 1) <= 0.02
}

const CONTEXTO_SENSIVEL = /\b(?:sexual\w*|sex|erotic\w*|fetish\w*|nude|nudity|naked|undress\w*|topless|breasts?|genitals?|nipples?|lingerie|underwear|panties|porn\w*|seduc\w*|sensual\w*|human|humanoid|boy|girl|teen\w*|school\w*|menina|menino|crianca|adolescente)\b/i

/**
 * Mantém TODA a cena autoral. Só neutraliza metadados técnicos benignos da ficha de animal/criatura: comparação de tamanho
 * com criança e ausência de roupa (a pele/escama natural). Não remove idade humana, sexualização nem conteúdo do autor.
 * A imagem continua indo à mesma porta de saída, com as MESMAS categorias e limiares. Contexto sensível = texto integral.
 */
export function textoModeracaoDoPersonagem(cenaAutoral: string, fichas: ReadonlyArray<{ tipo: string; canonica: string }>): string {
  const cena = String(cenaAutoral ?? '')
  const contextoSensivel = CONTEXTO_SENSIVEL.test(cena)
  const descricoes = fichas.map((f) => {
    const descricao = String(f.canonica ?? '')
    if (contextoSensivel || (f.tipo !== 'animal' && f.tipo !== 'criatura') || CONTEXTO_SENSIVEL.test(descricao)) return descricao
    return descricao
      .replace(/\b(?:about\s+)?the size of (?:a\s+)?child\b|\bchild[ -]sized\b/gi, 'small')
      .replace(/\bno clothes\b/gi, 'natural body covering')
  })
  return `${cena}\n\nCharacter descriptions: ${descricoes.join('; ')}`
}

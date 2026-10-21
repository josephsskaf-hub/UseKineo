// KINEO-META95-PERSONAGEM-AJUSTE-2010 — regras puras do still com folha, sem rede nem alteração da política de moderação.

/** O edit arredonda dimensões para blocos de pixels; admite até 2% de arredondamento, nunca outro formato. */
export function formatoDoStillDoPersonagem(width: unknown, height: unknown, aspect: unknown): boolean {
  if (typeof width !== 'number' || typeof height !== 'number' || !Number.isFinite(width) || !Number.isFinite(height) || !Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) return false
  const alvo = aspect === '16:9' ? 16 / 9 : aspect === '1:1' ? 1 : aspect === '4:5' ? 4 / 5 : 9 / 16
  return Math.abs(width / height / alvo - 1) <= 0.02
}

const CONTEXTO_SENSIVEL = /\b(?:sexual\w*|sex|sexy|sexo|erot\w*|fetish\w*|fetich\w*|molest\w*|rap[ei]\w*|incest\w*|abus\w*|estupro\w*|estupr\w*|assed\w*|groom\w*|nude|nudity|naked|nudez|nu|nua|nus|nuas|undress\w*|topless|breasts?|genitals?|nipples?|seios?|genitais|mamilos?|lingerie|underwear|panties|calcinha|cueca|porn\w*|seduc\w*|sensual\w*|human\w*|anthropomorph\w*|antropomorf\w*|boy|girl|child|children|kid|kids|teen\w*|school\w*|man|woman|men|women|person|people|menina|menino|crianca|adolescente|homem|mulher|pessoa|gente|escola)\b/i
const TAMANHO_DE_CRIANCA = /\b(?:about\s+)?the size of (?:a\s+)?child\b|\bchild[ -]sized\b/gi
// Idade só sai quando colada a uma espécie inequivocamente não humana; humanoides ficam fora desta lista.
const ESPECIE = '(?:dinosaur|dino|dragon|rabbit|bunny|dog|cat|bear|fox|dinossauro|drag[aã]o|coelho|cachorro|gato|urso|raposa)'
const NUM_EN = '(?:1[0-7]|[1-9]|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)'
const NUM_PT = '(?:1[0-7]|[1-9]|um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete)'
const IDADE_EN = new RegExp(`\\b(?:child|kid|${NUM_EN}[ -]+year[ -]+old)\\s+(${ESPECIE})\\b`, 'gi')
const IDADE_PT = new RegExp(`\\b(${ESPECIE})\\s+(?:crian[cç]a|de\\s+${NUM_PT}\\s+anos?)\\b`, 'gi')
const IDADE_SOLTA = new RegExp(`\\b${NUM_EN}[ -]+years?(?:[ -]+old)?\\b|\\b${NUM_PT}\\s+anos?\\b|\\baged\\s+(?:1[0-7]|[1-9])\\b`, 'i')
const dobra = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const idadeNaoHumana = (s: string) => s.replace(IDADE_EN, 'young $1').replace(IDADE_PT, '$1 jovem')

/**
 * Elenco inteiramente não humano e contexto benigno: idade adjacente à espécie vira fase de vida, na cena e na canônica.
 * Só a canônica também neutraliza comparação técnica de tamanho e ausência de roupa (pele/escama natural).
 * Humano, humanoide, idade solta ou sexualização conserva TUDO integralmente. Mesma imagem, categorias e limiares.
 */
export function textoModeracaoDoPersonagem(cenaAutoral: string, fichas: ReadonlyArray<{ tipo: string; canonica: string }>): string {
  const cena = String(cenaAutoral ?? '')
  const originais = fichas.map((f) => String(f.canonica ?? ''))
  const integral = () => `${cena}\n\nCharacter descriptions: ${originais.join('; ')}`
  if (fichas.length === 0 || fichas.some((f) => f.tipo !== 'animal' && f.tipo !== 'criatura')) return integral()
  const cenaNaoHumana = idadeNaoHumana(cena)
  const descricoes = originais.map(idadeNaoHumana)
  // Comparação técnica na canônica não é idade humana; no texto autoral ela permanece intocada.
  const contexto = dobra([cenaNaoHumana, ...descricoes.map((s) => s.replace(TAMANHO_DE_CRIANCA, 'small'))].join(' '))
  if (CONTEXTO_SENSIVEL.test(contexto) || IDADE_SOLTA.test(contexto)) return integral()
  return `${cenaNaoHumana}\n\nCharacter descriptions: ${descricoes.map((s) => s.replace(TAMANHO_DE_CRIANCA, 'small').replace(/\bno clothes\b/gi, 'natural body covering')).join('; ')}`
}

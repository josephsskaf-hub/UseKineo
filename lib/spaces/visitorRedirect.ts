// KINEO-SPACES-VISITANTE-2026-10-08 — o /spaces dava 404 para quem chega sem login (notFound() sem usuário em
// app/(dashboard)/spaces/page.tsx). Só que o menu da home linka "Spaces" e o canal do fundador no Instagram manda gente
// para usekineo.com/spaces?utm_source=instagram&utm_medium=social&utm_campaign=canal_joseph — todo visitante desse link caía
// num 404 (medido em produção em 08/10 com user-agent do Instagram).
//
// Agora o visitante vai para o cadastro e volta ao /spaces depois (?redirect=/spaces, que o /signup já honra para caminhos
// internos). As UTMs e os identificadores de clique da visita vão JUNTO: o redirect acontece no servidor, antes de qualquer
// página renderizar, então o SourceCapture do layout só as vê se elas estiverem na URL do /signup — sem isso a atribuição
// do Instagram morreria no salto.
//
// MÓDULO PURO (nenhum import): o guardião scripts/test-spaces-visitante-2026-10-08.mjs o transpila e EXECUTA.

export const SPACES_PATH = '/spaces' as const

/** Parâmetros da visita que viajam até o /signup (atribuição). Nada além disso passa. */
export const SPACES_FORWARDED_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'ref',
  'gclid',
  'gbraid',
  'wbraid',
  'msclkid',
  'fbclid',
] as const

/** Valor aceito: texto curto e comum de UTM/identificador. Nada de URL, aspas, espaço ou quebra de linha. */
const SAFE_VALUE = /^[A-Za-z0-9._~+-]{1,200}$/

export type SpacesSearchParams = Record<string, string | string[] | undefined> | undefined | null

/** O endereço do cadastro que devolve o visitante ao /spaces, com a atribuição da visita preservada. */
export function spacesSignupHref(searchParams: SpacesSearchParams): string {
  const out = new URLSearchParams()
  out.set('redirect', SPACES_PATH)
  for (const key of SPACES_FORWARDED_PARAMS) {
    const raw = searchParams ? searchParams[key] : undefined
    const value = Array.isArray(raw) ? raw[0] : raw
    if (typeof value === 'string' && SAFE_VALUE.test(value)) out.set(key, value)
  }
  return `/signup?${out.toString()}`
}

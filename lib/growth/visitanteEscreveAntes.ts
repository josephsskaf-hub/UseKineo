// KINEO-ESCREVE-ANTES-DO-LOGIN-0411 [fundador 04/11: "1a", olhando a Higgsfield: "a gente não deixa ele chegar na parte onde pode escrever a história dele"]
// Os cartões de FILME da home levavam o visitante ao cadastro antes de ele escrever. O /studio é público e o login já vem no Generate
// (/studio/create devolve ao mesmo pedido, com o texto). Só estes destinos da home: sem texto, sem produto que exija conta. Anúncio segue como está.
// Puro: sem env, sem rede. O middleware decide aqui; guardião: scripts/test-escreve-antes-do-login-0411.mjs.
const CAMPANHAS_DE_FILME = new Set(['home_card', 'home_door', 'home_news_bar_k4_trial', 'home_clips_first_film'])

/** O destino para onde o visitante vai direto; null = o cadastro de sempre. */
export function destinoDoVisitanteQueEscreve(pathname: string, redirect: string | null): string | null {
  if (pathname !== '/signup' || !redirect) return null
  let url: URL
  try { url = new URL(redirect, 'https://www.usekineo.com') } catch { return null }
  if (url.origin !== 'https://www.usekineo.com' || url.pathname !== '/studio') return null
  if (!/^\/studio\?/.test(redirect) || redirect.startsWith('//')) return null
  const permitidos = new Set(['engine', 'intent_campaign'])
  for (const chave of url.searchParams.keys()) if (!permitidos.has(chave)) return null
  const campanha = url.searchParams.get('intent_campaign')
  return campanha && CAMPANHAS_DE_FILME.has(campanha) ? `/studio${url.search}` : null
}

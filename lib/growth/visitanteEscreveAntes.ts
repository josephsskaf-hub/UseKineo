// KINEO-ESCREVE-ANTES-DO-LOGIN-0411 [fundador 04/11: "1a", olhando a Higgsfield: "a gente não deixa ele chegar na parte onde pode escrever a história dele"]
// Os cartões de FILME da home levavam o visitante ao cadastro antes de ele escrever. O /studio é público e o login já vem no Generate
// (/studio/create devolve ao mesmo pedido, com o texto). Só estes destinos da home: sem texto, sem produto que exija conta.
// Puro: sem env, sem rede. O middleware decide aqui; guardião: scripts/test-escreve-antes-do-login-0411.mjs.
const CAMPANHAS_DE_FILME = new Set(['home_card', 'home_door', 'home_news_bar_k4_trial', 'home_clips_first_film'])

// KINEO-CARDS-ANTES-DO-LOGIN-0411 [fundador 04/11: "Cards de Anúncio, UGC e Cartoon antes do login"] — os cartões de anúncio, UGC e desenho da home também abrem a tela de verdade.
// Lista EXATA: só estes parâmetros, só a campanha do cartão. Anúncio pago e qualquer outro /signup seguem pelo cadastro de sempre.
const ORIGEM_DO_CARTAO = 'home_card'
const ORIGEM_DA_PORTA = 'ads_door'
const ENTRADAS_DE_ANUNCIO = new Set(['product', 'ugc'])
/** O botão da porta /ads para quem não entrou: a mesma tela, já no formato produto. */
export const ANUNCIO_DA_PORTA = `/ads/v2?entry=product&utm_source=${ORIGEM_DA_PORTA}`
/** Quem volta do login carrega esta marca: o desvio do /signup não vale para ela (senão a pessoa nunca chegaria ao cadastro). */
export const MARCA_DA_VOLTA = 'volta'

/** /ads/v2 abre sem conta? Só vindo do cartão da home ou do botão da porta, com a entrada certa. */
export function anuncioAbreSemConta(entry: unknown, origem: unknown): boolean {
  return typeof entry === 'string' && ENTRADAS_DE_ANUNCIO.has(entry) && (origem === ORIGEM_DO_CARTAO || origem === ORIGEM_DA_PORTA)
}

/** /kids-cartoon abre sem conta? Só vindo do cartão da home. */
export function desenhoAbreSemConta(origem: unknown): boolean {
  return origem === ORIGEM_DO_CARTAO
}

/** O cadastro que devolve o visitante à mesma tela, na primeira ação que precisa de conta. */
export function cadastroComVolta(caminhoAtual: string): string {
  const volta = `${caminhoAtual}${caminhoAtual.includes('?') ? '&' : '?'}${MARCA_DA_VOLTA}=1`
  return `/signup?redirect=${encodeURIComponent(volta)}`
}

/** O navegador tem cookie de sessão? O mesmo teste do middleware; sem ele, nem pergunta à API (a resposta seria 401). */
export function temCookieDeSessao(cookies: string): boolean {
  return cookies.split(';').some((c) => { const nome = c.split('=')[0].trim(); return nome.startsWith('sb-') && nome.includes('auth-token') })
}

function telaDoCartao(url: URL): string | null {
  const chaves = Array.from(url.searchParams.keys())
  if (url.pathname === '/ads/v2') {
    if (chaves.length !== 2 || !chaves.includes('entry') || !chaves.includes('utm_source')) return null
    return url.searchParams.get('utm_source') === ORIGEM_DO_CARTAO && anuncioAbreSemConta(url.searchParams.get('entry'), ORIGEM_DO_CARTAO) ? `/ads/v2${url.search}` : null
  }
  if (url.pathname === '/kids-cartoon') {
    if (chaves.length !== 1 || chaves[0] !== 'utm_source') return null
    return desenhoAbreSemConta(url.searchParams.get('utm_source')) ? `/kids-cartoon${url.search}` : null
  }
  return null
}

// ═══ KINEO-CARTOES-ANTES-DA-CONTA-1411 [CEO 14/11, pedido 9; auditoria da Div. 1 conferida ao vivo às 02:46] ═══════════════════════════════
// Desde 10–11/11 (KINEO-ENTRADAS-VISITANTE-1111, lib/create/entry.ts createEntryForSignupHref) a home escreve o destino do VISITANTE com o nome
// da tela NOVA dentro do cadastro: /signup?redirect=/create/film?…, /create/ads…, /create/cartoon…. A regra de 04/11 (acima) só conhecia
// /studio, /ads/v2 e /kids-cartoon, então deixou de casar: 27 cartões de filme, anúncio e cartoon da home voltaram a abrir a tela de conta.
// O conserto fica AQUI (o desvio do /signup), não na home: (1) a home é tela (área do GPT) e o HTML dela não muda; (2) quem chega ao cadastro
// por outro caminho continua pousando na tela nova depois de entrar (o que a mudança de 11/11 queria); (3) a regra de 04/11 é uma só, com a
// mesma lista EXATA de parâmetros. A tela nova só existe para quem está logado: para o visitante, cada nome volta à tela de 04/11 que abre sem
// conta. Sem query, o cartão de anúncio vira o de produto e o de cartoon o da home (os parâmetros que essas telas exigem). Query que a tela
// de 04/11 não aceita (inclusive a MARCA_DA_VOLTA de quem volta do login) = o cadastro de sempre. Logado: o middleware nem chama isto.
export const ANUNCIO_DO_CARTAO = `/ads/v2?entry=product&utm_source=${ORIGEM_DO_CARTAO}`
export const DESENHO_DO_CARTAO = `/kids-cartoon?utm_source=${ORIGEM_DO_CARTAO}`
function nomeDeHoje(url: URL): string | null {
  if (url.pathname === '/create/film') return url.search ? `/studio${url.search}` : null
  if (url.pathname === '/create/ads') return url.search ? `/ads/v2${url.search}` : ANUNCIO_DO_CARTAO
  if (url.pathname === '/create/cartoon') return url.search ? `/kids-cartoon${url.search}` : DESENHO_DO_CARTAO
  return null
}

/** O destino para onde o visitante vai direto; null = o cadastro de sempre. */
export function destinoDoVisitanteQueEscreve(pathname: string, redirect: string | null): string | null {
  if (pathname !== '/signup' || !redirect) return null
  let url: URL
  try { url = new URL(redirect, 'https://www.usekineo.com') } catch { return null }
  if (url.origin !== 'https://www.usekineo.com' || redirect.startsWith('//')) return null
  const deHoje = nomeDeHoje(url) // KINEO-CARTOES-ANTES-DA-CONTA-1411 — a tela nova pelo nome de 04/11, com a MESMA régua abaixo
  if (deHoje) return destinoDoVisitanteQueEscreve(pathname, deHoje)
  if (url.pathname !== '/studio') return telaDoCartao(url)
  if (!/^\/studio\?/.test(redirect) || redirect.startsWith('//')) return null
  const permitidos = new Set(['engine', 'intent_campaign'])
  for (const chave of url.searchParams.keys()) if (!permitidos.has(chave)) return null
  const campanha = url.searchParams.get('intent_campaign')
  return campanha && CAMPANHAS_DE_FILME.has(campanha) ? `/studio${url.search}` : null
}

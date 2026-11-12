// KINEO-CENA-PEDIDO-3010 — defeito 3 do revisor (29/10, 4 casos): lousa ("Gurdiola Bapiom"), celular, placa e pergaminho saem
// com letras sem sentido. O sufixo de sempre (textSafetySuffix) só NEGA ("no legible words, no letters") — e o motor não tem
// campo negativo: "no letters" ainda põe letra na cena. Aqui a superfície que costuma ganhar texto recebe o que ela MOSTRA,
// em frase positiva: a lousa mostra setas e círculos, a tela mostra luz difusa, a página mostra textura, a placa é cor lisa.
// Uma frase por tipo de superfície presente; cena sem nenhuma dessas superfícies: o MESMO prompt, byte a byte.

const SUPERFICIES: ReadonlyArray<{ re: RegExp; frase: string }> = [
  // KINEO-SUPERFICIE-PLURAL-1111 [CEO 11/11, prova do 2120f018] — as superfícies no PLURAL escapavam ("ancient scrolls unfurling" não casava
  // "scroll"): o pergaminho saiu com letra inventada nítida em 2 de 8 quadros. Agora singular e plural ("letters" fica de fora: é palavra da
  // própria proteção, "no letters").
  { re: /\b(?:chalkboards?|blackboards?|whiteboards?|tactics boards?|classroom boards?)\b/i, frase: 'the board is covered only in hand-drawn arrows, circles and simple diagrams' },
  { re: /\b(?:smartphones?|phones?|cellphones?|screens?|monitors?|laptops?|tablets?|displays?|tvs?)\b/i, frase: 'every screen glows with soft abstract light and colour' },
  { re: /\b(?:scrolls?|parchments?|manuscripts?|books?|page|pages|letter|diary|diaries|journals?|newspapers?|maps?|documents?|notebooks?)\b/i, frase: 'every page shows only aged texture and faint decorative lines' },
  { re: /\b(?:signs?|signboards?|billboards?|placards?|posters?|banners?|plaques?|nameplates?|menus?|label|storefronts?|pharmacy|drugstore|shopfronts?)\b/i, frase: 'every sign is a plain block of colour' },
  // KINEO-EMBALAGEM-SEM-LETRA-0411 — manobiayousaf 04/11 (55221671, Seedance 1.5): farmácia com placa "FNSSFOCA" e frascos com rótulos sem sentido. Nem toda prateleira diz "sign": frasco, lata e caixa também recebem o que mostram.
  { re: /\b(?:bottles?|jars?|cans|tins|canned|packages?|packaging|packets?|cartons?|sachets?|supplements?|medicines?|medications?|pills?|cosmetics?|shelves)\b/i, frase: 'every bottle, box and package is one plain solid colour' },
  // KINEO-BALAO-SEM-LETRA-1111 [CEO 11/11, vigia do filme 4eb0c0c9, Kling 4 grátis em desenho] — "surrounded by comic bubbles depicting laughter"
  // virou balões com "HA HA!" e "SOOM!" no plano final: balão de quadrinho não era superfície. Agora é, e mostra só desenho.
  { re: /\b(?:speech|comic|thought|word|cartoon|chat)\s+(?:bubbles?|balloons?)\b|\bonomatopoeias?\b/i, frase: 'every comic bubble holds only simple drawn stars, hearts and swirls' },
]

/** KINEO-EMBALAGEM-SEM-LETRA-0411 — o texto pede letra de propósito (aspas, "says", "written", marca, logo): nada é acrescentado, a pessoa escolheu. */
const PEDE_LETRA_RE = /["“”]|\b(?:says?|saying|reads?|written|writes?|logo|logos|brand|branded|branding|packshot|product\s+shot|our\s+product)\b/i
export function comSuperficieDoPedido(prompt: string, pedido: string): string {
  return PEDE_LETRA_RE.test(String(pedido ?? '')) ? prompt : comSuperficieSemTexto(prompt)
}

/** As frases positivas das superfícies que a cena cita (na ordem fixa); [] = nenhuma superfície de texto. */
export function frasesDeSuperficie(prompt: string): string[] {
  // A proteção negativa que já vem no prompt ("no phone or computer screens… If a phone appears…") não é uma superfície da cena.
  const p = String(prompt ?? '').replace(/No readable text[^.]*\.(?:\s*If a phone appears[^.]*\.)?/gi, ' ').replace(/no readable text, letters, numbers, labels or signage[^,.]*/gi, ' ').replace(/(?:phone )?screen (?:is )?off or blurred/gi, ' ')
    // KINEO-SUPERFICIE-NEGADA-1111 [CEO 11/11 noite, filme da Mona Lisa 1911, H3 Max, 6,5] — a trava de época escreve "absolutely no present-day smartphones…
    // no LED screens", e a superfície NEGADA contava como presente: toda cena de época ganhava "Every screen glows with soft abstract light and colour."
    // e o motor desenhou a tela brilhando (em cima do baú, na moldura do avental). O que vem depois de "no / without / never" até a vírgula não está na cena.
    .replace(/\b(?:absolutely\s+)?(?:no|without|never)\b[^,;.]*/giu, ' ')
  return SUPERFICIES.filter((s) => s.re.test(p)).map((s) => s.frase)
}

/** O prompt com as superfícies descritas em positivo, no fim (a 1ª frase continua sendo a ação da cena). */
export function comSuperficieSemTexto(prompt: string): string {
  const extra = fraseUnicaDeSuperficie(prompt)
  if (!extra) return prompt
  const semPedido = semTextoPedidoNaSuperficie(prompt) // KINEO-SUPERFICIE-PLURAL-1111
  if (semPedido.includes(extra)) return semPedido
  return `${semPedido.replace(/[\s,.]+$/, '')}. ${extra}`
}

// KINEO-SUPERFICIE-PLURAL-1111 — o planejador pedia o texto em positivo ("ancient scrolls unfurling, revealing intricate text and symbols") e o
// "no readable text" do fim não vence um pedido positivo: o motor desenhou letra. Na cena com superfície de texto, o pedido de texto vira
// marcas ilegíveis no mesmo lugar. Quem pede letra de propósito (aspas, "says", logo, marca) passa por comSuperficieDoPedido, que nem chama isto.
const PEDIDO_DE_TEXTO_RE = /\b(revealing|showing|covered (?:in|with)|filled with|bearing|displaying|with)\s+((?:intricate|ancient|old|handwritten|faded|tiny|elegant|glowing|mysterious|cryptic|sacred|golden|ornate)\s+){0,3}(?:text|texts|writing|writings|words|script|scripture|scriptures|verses?|inscriptions?|calligraphy|handwriting)(?:\s+and\s+(?:symbols|drawings|illustrations|diagrams))?/giu
// KINEO-BALAO-SEM-LETRA-1111 — o balão que "mostra" riso, fala ou som pede letra ("HA HA!"): o que ele mostra vira desenho, no mesmo lugar.
const BALAO_DE_TEXTO_RE = /\b((?:speech|comic|thought|word|cartoon|chat)\s+(?:bubbles?|balloons?))\s+(?:depicting|showing|saying|reading|with|of|full of|filled with)\s+(?:the\s+|his\s+|her\s+|their\s+)?(?:laughter|laughs?|laughing|giggles?|words?|text|jokes?|sounds?|sound effects?|onomatopoeias?|exclamations?|dialogue|thoughts?)\b/giu
export function semTextoPedidoNaSuperficie(prompt: string): string {
  return String(prompt ?? '').replace(BALAO_DE_TEXTO_RE, (_m, balao: string) => `${balao} filled with drawn stars, hearts and swirls`).replace(PEDIDO_DE_TEXTO_RE, (_m, verbo: string) => `${verbo} faint marks too small to read`) // KINEO-PERGAMINHO-CURTO-1111 [CEO 11/11]: era "faint marks and symbols too small and soft to read" — longa demais, cortava a ação do plano do Kling 4 ("illuminated by a warm")
}

/** KINEO-BALAO-SEM-LETRA-1111 [CEO 11/11] — o plano JÁ COMPACTADO do Kling 4 (que termina em "Mouth closed, no speaking."): a metade da cena
 *  fundida nasce da pista e da fala da seção DEPOIS da proteção de superfície da cena ("…with comic bubbles of laughter" chegava cru). O
 *  pedido de texto vira desenho/marcas ilegíveis no lugar e a frase positiva da superfície entra antes da boca fechada, se couber no teto;
 *  plano sem superfície ou que já tem a frase: o mesmo texto, byte a byte. */
export function comSuperficieNoPlano(plano: string, teto = 512): string {
  const p = String(plano ?? '')
  const fim = ' Mouth closed, no speaking.'
  const corpo = p.endsWith(fim) ? p.slice(0, -fim.length) : p
  const todas = frasesDeSuperficie(corpo)
  if (!todas.length) return p // sem superfície de texto, nada muda (como comSuperficieSemTexto)
  const faltam = todas.filter((f) => !corpo.toLowerCase().includes(f.toLowerCase()))
  const limpo = semTextoPedidoNaSuperficie(corpo)
  if (!faltam.length && limpo === corpo) return p
  const cauda = p.endsWith(fim) ? fim : ''
  const extra = faltam.map((f) => f.charAt(0).toUpperCase() + f.slice(1)).join('. ')
  const novo = extra ? `${limpo.replace(/[\s,.]+$/u, '')}. ${extra}.${cauda}` : `${limpo}${cauda}`
  if (Array.from(novo).length <= teto) return novo
  return Array.from(`${limpo}${cauda}`).length <= teto ? `${limpo}${cauda}` : p
}

/** As frases das superfícies numa frase só ("The board is… Every screen…."); '' = nenhuma. */
export function fraseUnicaDeSuperficie(prompt: string): string {
  const frases = frasesDeSuperficie(prompt)
  return frases.length ? frases.map((f) => f.charAt(0).toUpperCase() + f.slice(1)).join('. ') + '.' : ''
}

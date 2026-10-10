// KINEO-ADS-MODO-SIMPLES-2026-09-29 — regras e textos do MODO SIMPLES do /ads/v2 (pedido do fundador, 29/09, depois de
// tentar anunciar o próprio imóvel e não conseguir: "a gente tem que ter um sistema onde a pessoa coloque os arquivos que
// ela quer, fale mais ou menos o que ela quer que aconteça, e ela escolha: premium, comercial e normal. E a gente faça
// para ela." — "sem legenda, com a fala em português").
//
// O que travou no construtor completo e o modo simples resolve: tela só em inglês; LOGO obrigatório (pessoa física não
// tem); nome e tipo de negócio (quem vende um imóvel não é uma loja); não aceitava vídeo; sempre 2-3 frases na tela.
//
// LIB PURA (nenhum import): o guardião carrega este arquivo direto no Node. Textos em {en, pt, es} no padrão
// pickInterfaceCopy (lib/ui/interfaceLanguage.ts): qualquer outra língua cai no inglês, nunca em texto inventado.
// Nenhum preço aqui: o custo de cada nível vem de adsV2Credits (lib/ads/v2Tiers.ts), o mesmo que o /start debita.

export type AdsV2SimpleSector = 'restaurant' | 'clinic' | 'real_estate' | 'gym' | 'salon' | 'store' | 'app_service' | 'other'
export type AdsV2SimplePhotoKind = 'people' | 'place' | 'product' | 'text'
export type AdsV2SimpleLang = 'en' | 'pt' | 'es'

// ── arquivos ────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Quadros tirados de cada vídeo, em fração da duração (início, meio e fim — longe do primeiro e do último quadro). */
export const ADS_V2_SIMPLE_VIDEO_FRACTIONS: readonly number[] = [0.2, 0.5, 0.8]
/** Espelho de ADS_V2_MAX_PHOTOS/ADS_V2_MIN_PHOTOS (lib/ads/v2ShotLists.ts); o guardião confere. */
export const ADS_V2_SIMPLE_MAX_IN_AD = 7
// KINEO-ADS-1FOTO-LINK-2026-10-10 — 1 foto basta (era 3): a /business promete "uma foto do produto vira um anúncio".
export const ADS_V2_SIMPLE_MIN_IN_AD = 1
/** Quantos arquivos a tela guarda (os que passam de 7 ficam "fora do anúncio", trocáveis). */
export const ADS_V2_SIMPLE_MAX_ITEMS = 24
export const ADS_V2_SIMPLE_ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,.mov'
/** Vídeo é lido SÓ no navegador (nada sobe ao servidor): limites locais. */
export const ADS_V2_SIMPLE_VIDEO_MAX_BYTES = 500 * 1024 * 1024
export const ADS_V2_SIMPLE_VIDEO_MAX_SECONDS = 600
/** Fatos da pesquisa DESMARCADOS por padrão (revisão de honestidade 29/09): nenhum fato da internet — nem o endereço — entra
 *  no anúncio sem a pessoa marcar. Virar para true é decisão do fundador (e reancora o guardião E5 com o motivo). */
export const ADS_V2_SIMPLE_FACTS_DEFAULT_ON = false

/**
 * Tempos (s) dos quadros de um vídeo: até `room` (máx. 3) das frações 0,2/0,5/0,8. Vídeo com menos de 1,5 s dá só o
 * quadro do meio. Cada tempo fica ≤ duração − 0,05 s. Duração inválida ou sem espaço = [].
 */
export function videoFrameTimes(duration: number, room: number): number[] {
  if (!Number.isFinite(duration) || duration <= 0) return []
  const n = Math.max(0, Math.min(Math.floor(room), ADS_V2_SIMPLE_VIDEO_FRACTIONS.length))
  if (n === 0) return []
  const fr = duration < 1.5 ? [0.5] : n === 1 ? [0.5] : n === 2 ? [ADS_V2_SIMPLE_VIDEO_FRACTIONS[0], ADS_V2_SIMPLE_VIDEO_FRACTIONS[2]] : ADS_V2_SIMPLE_VIDEO_FRACTIONS.slice(0, 3)
  const cap = Math.max(0, duration - 0.05)
  return fr.map((f) => Math.round(Math.min(duration * f, cap) * 1000) / 1000)
}

export function isVideoFile(name: string, type: string): boolean {
  return /^video\//i.test(type) || /\.(mp4|mov|m4v|webm|qt)$/i.test(name)
}
export function isImageFile(name: string, type: string): boolean {
  return /^image\/(jpeg|png|webp)$/i.test(type) || /\.(jpe?g|png|webp)$/i.test(name)
}

/** O tipo de foto que o modo simples marca sozinho: loja = produto; app = tela (parada, sem IA); resto = lugar. */
export function defaultPhotoKind(sector: AdsV2SimpleSector): AdsV2SimplePhotoKind {
  if (sector === 'store') return 'product'
  if (sector === 'app_service') return 'text'
  return 'place'
}

// ── o que a pessoa escreveu ─────────────────────────────────────────────────────────────────────────────────────────
// KINEO-ATOR-AJUSTES-2026-10-09 — canário 7112d56c (09/10): "LUME eau de parfum, a light floral scent that lasts all day"
// não batia em regra nenhuma, virou 'other', o palpite do modelo virou loja e a voz saiu de LOJA ("At LUME, we offer a
// captivating selection of eau de parfum…"). Nomes de PRODUTO físico (en/pt/es): perfume, sérum, creme, garrafa, bebida,
// snack, tênis, fone, relógio, bolsa… Frase com um deles (e sem palavra de loja) é anúncio de PRODUTO. "watch" depois de
// "to/come/and" é verbo ("come watch the game"), não relógio; "aulas de tênis" é esporte, não calçado.
export const ADS_V2_PRODUCT_WORDS = /(?<![\p{L}\p{N}])(perfumes?|parfums?|eau de (parfum|toilette|cologne)|colognes?|fragrances?|fragr[aâ]ncias?|fragancias?|col[oô]nias?|serums?|s[eé]runs?|s[eé]rum|cremes?|creams?|cremas?|lotions?|lo[cç][aã]o|lo[cç][oõ]es|lociones?|hidratantes?|moisturi[sz]ers?|skincare|skin care|batons?|lipsticks?|labiales?|maquiagem|makeup|maquillaje|shampoos?|xampus?|condicionador(es)?|conditioners?|sabonetes?|soaps?|jabones?|velas? arom[aá]ticas?|candles?|garrafas?|bottles?|botellas?|tumblers?|canecas?|mugs?|energy drinks?|drink mix|bebida|bebidas energ[eé]ticas?|sucos? de|juices?|jugos?|kombuchas?|refrigerantes?|sodas?|snack|healthy snacks|protein bars?|barras? de prote[ií]na|barrinhas?|chocolates?|biscoitos?|cookies?|galletas?|granolas?|suplementos?|supplements?|whey|(?<!(?:aulas? de|clube de|quadras? de|escola de|escolinha de|jogar|partida de) )t[eê]nis|sneakers?|zapatillas?|sapatos?|shoes?|zapatos?|sand[aá]lias?|sandals?|botas?|boots?|fones?( de ouvido)?|headphones?|earbuds?|auriculares?|aud[ií]fonos?|rel[oó]gios?|(?<!(?:to|come|and|can|let's|we) )watch(es)?|smartwatch(es)?|wristwatch(es)?|bolsas?(?! de estudos?)|handbags?|bags?|backpacks?|mochilas?|carteiras?|wallets?|[oó]culos de sol|sunglasses|gafas de sol|joias?|j[oó]ias?|jewel(le)?ry|joyas?|colares?|necklaces?|brincos?|earrings?|pulseiras?|bracelets?|caixas? de som|speakers?|gadgets?|capinhas?|phone cases?)(?![\p{L}\p{N}])/iu
/** Palavra de LOJA: "loja de perfumes" é a loja falando (a voz de loja ali é certa), não o produto sozinho. */
const SHOP_WORDS = /(?<![\p{L}\p{N}])(lojas?|stores?|shops?|boutiques?|tiendas?|e-?commerce|marketplace|perfumarias?|perfumer[ií]as?|drogarias?|farm[aá]cias?)(?![\p{L}\p{N}])/iu

// Palavras-chave pt/en/es; imóvel é conferido ANTES dos outros ("loja à venda" é imóvel, não loja).
// Fronteira de palavra Unicode por lookaround (\b não vê letra acentuada).
const SECTOR_RULES: readonly [AdsV2SimpleSector, RegExp][] = [
  ['real_estate', /(?<![\p{L}\p{N}])(apartamentos?|apto|im[oó]ve(l|is)|edif[ií]cios?|pr[eé]dios?|condom[ií]nios?|aluga|alugo|alugar|aluga-se|aluguel|[àa] venda|vende-se|venda de (casa|apartamento|sala|loja|terreno)|terrenos?|cobertura|kitnet|sala comercial|casa (para|pra) (alugar|vender)|apartments?|condos?|for rent|for sale|real estate|departamentos?|inmuebles?|en venta|se vende|se alquila|alquiler|piso en)(?![\p{L}\p{N}])/iu],
  ['restaurant', /(?<![\p{L}\p{N}])(restaurantes?|restaurants?|lanchonetes?|pizzarias?|padarias?|bakery|bakeries|caf[eé]s?|cafeterias?|hamburguerias?|bistr[oô]s?|card[aá]pio|menu|panader[ií]as?|taquer[ií]as?|comida|food|doceria|confeitaria)(?![\p{L}\p{N}])/iu],
  ['clinic', /(?<![\p{L}\p{N}])(cl[ií]nicas?|clinics?|consult[oó]rios?|consultorios?|dentistas?|dentists?|m[eé]dic[oa]s?|doctors?|fisioterapia|psic[oó]log[oa]s?|odontologia|veterin[aá]ri[oa])(?![\p{L}\p{N}])/iu],
  ['gym', /(?<![\p{L}\p{N}])(academias?|gyms?|crossfit|pilates|yoga|ioga|muscula[cç][aã]o|gimnasios?|fitness)(?![\p{L}\p{N}])/iu],
  ['salon', /(?<![\p{L}\p{N}])(sal[aã]o de beleza|barbearias?|barbers?|barber shop|cabeleireir[oa]s?|manicure|nail|nails|hair salon|beauty salon|peluquer[ií]as?|barber[ií]as?|est[eé]tica)(?![\p{L}\p{N}])/iu],
  // KINEO-ATOR-AJUSTES-2026-10-09 — produto físico ("LUME eau de parfum, a light floral scent…") é anúncio de PRODUTO: o
  // setor vira 'store' (fotos marcadas como produto). Vem DEPOIS de imóvel/restaurante/clínica/academia/salão: "loja à venda"
  // segue imóvel e "Clínica X — sérum" segue clínica.
  ['store', ADS_V2_PRODUCT_WORDS],
  ['store', /(?<![\p{L}\p{N}])(lojas?|stores?|shops?|boutiques?|roupas|clothes|tiendas?|produtos?|products?|e-?commerce)(?![\p{L}\p{N}])/iu],
  ['app_service', /(?<![\p{L}\p{N}])(app|apps|aplicativos?|software|saas|plataformas?|platforms?|curso online|online course|aplicaci[oó]n)(?![\p{L}\p{N}])/iu],
]

/** Setor pelas palavras do texto; sem acerto = 'other' (o plano pode usar o palpite do modelo só nesse caso). */
export function inferSector(text: string): AdsV2SimpleSector {
  const t = String(text ?? '')
  for (const [sector, re] of SECTOR_RULES) if (re.test(t)) return sector
  return 'other'
}

/**
 * KINEO-ATOR-AJUSTES-2026-10-09 — a frase anuncia um PRODUTO físico (perfume, sérum, tênis, fone, relógio, bolsa…), não
 * um lugar/serviço nem uma loja: as palavras deram 'store', a frase nomeia um produto e não há palavra de loja. Imóvel
 * ("Loja à venda no Edifício Aurora"), restaurante, clínica, academia e salão decidem antes e nunca viram produto. Pura.
 */
export function isProductSentence(text: string): boolean {
  const t = String(text ?? '')
  return inferSector(t) === 'store' && ADS_V2_PRODUCT_WORDS.test(t) && !SHOP_WORDS.test(t)
}

/**
 * Anúncio de produto no modo simples: a frase nomeia o produto (isProductSentence) OU as palavras não reconheceram nada
 * ('other' — "marca + produto" que a lista não conhece) e a pessoa marcou uma foto como PRODUTO (estilo de produto ou o
 * ator segurando o produto). Lugar/serviço reconhecido nunca vira produto. Pura.
 */
export function simpleProductAd(sentence: string, hasProductPhoto: boolean): boolean {
  if (isProductSentence(sentence)) return true
  return hasProductPhoto === true && inferSector(sentence) === 'other'
}

/** Título curto do cartão final: a 1ª oração (até vírgula, ponto, travessão ou quebra), no máximo 40 caracteres. */
export function simpleTitle(text: string): string {
  const first = String(text ?? '').replace(/\s+/g, ' ').trim().split(/[,.;:!?\n]|\s[—–-]\s/)[0]?.trim() ?? ''
  if (first.length <= 40) return first
  const cut = first.slice(0, 40)
  const sp = cut.lastIndexOf(' ')
  if (sp < 20) return cut.trim()
  // KINEO-ADS-SIMPLES-ACABAMENTO-2026-09-29 — o corte não termina num nome pela metade ("…para alugar na Rua", de "Rua das
  // Flores") nem numa palavra de ligação solta ("…en alquiler en el"). Sobrou pouco (< 12 caracteres) = o corte de antes.
  const kept = cut.slice(0, sp).trim()
  const cutWord = first.slice(sp + 1).split(' ')[0] ?? ''
  const words = kept.split(' ')
  const nameBit = (w: string) => isCap(w) || NAME_JOINERS.has(w.toLowerCase()) || /^\p{N}+[ºª°]?$/u.test(w)
  let tail = words.length
  while (tail > 0 && nameBit(words[tail - 1])) tail--
  if (cutWord && nameBit(cutWord) && words.slice(tail).some((w) => isCap(w))) words.length = tail
  while (words.length && FUNCTION_WORDS.has(words[words.length - 1].toLowerCase())) words.pop()
  const out = words.join(' ')
  return out.length >= 12 ? out : kept
}

// ── KINEO-ADS-SIMPLES-ACABAMENTO-2026-09-29 — a narração cita os NOMES que a pessoa escreveu ────────────────────────────
// Teste do fundador em produção (29/09, pedido 1ddfcf25): "Espaço comercial à venda ou para alugar no Edifício Villa
// Versace, em Moema, São Paulo" virou "Conheça o Espaço comercial, à venda ou para alugar. Venha conferir as oportunidades
// em Moema!" — sumiram o edifício e a cidade, e "Espaço comercial" entrou com maiúscula no meio da frase. A causa estava no
// brief: o GPT tratou "Espaço comercial" como NOME do negócio ("Espaço comercial — à venda ou para alugar") e o pedido de
// texto manda "Say the business name once". As regras abaixo são determinísticas e puras: quais nomes próprios a pessoa
// escreveu (a narração tem de citá-los) e se o "nome" do brief é, na verdade, um substantivo comum (vai em minúscula no
// meio da frase). Nenhum nome sai daqui que a pessoa não tenha escrito.

/** Palavras de ligação que podem ficar DENTRO de um nome ("Rua das Flores", "Centro de Campinas", "Bank of America"). */
const NAME_JOINERS = new Set(['de', 'da', 'do', 'das', 'dos', 'del', 'di', 'du', 'la', 'las', 'los', 'le', 'e', 'y', 'of', 'the', 'and', '&'])
/** Palavras de função: se alguma aparece com maiúscula fora do começo, o texto está em "Título Assim" (ou CAIXA ALTA) e a
 *  maiúscula não prova nome nenhum — nenhum nome é exigido. */
const FUNCTION_WORDS = new Set(['a', 'o', 'as', 'os', 'à', 'às', 'ao', 'aos', 'no', 'na', 'nos', 'nas', 'em', 'de', 'da', 'do', 'das', 'dos', 'com', 'para', 'pra', 'por', 'ou', 'e', 'um', 'uma', 'in', 'on', 'at', 'for', 'to', 'of', 'the', 'and', 'or', 'with', 'en', 'el', 'la', 'los', 'las', 'con', 'por', 'y', 'al', 'del'])
/** Maiúscula que não é lugar nem negócio (canal, pagamento, dia, mês, "I"): nunca vira nome exigido. */
const NOT_A_NAME = /^(whats\s?app|instagram|insta|facebook|tiktok|youtube|google|pix|wi-?fi|zap|i|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december)$/iu
/** 1ª palavra de um trecho no começo da frase que descreve O QUE é anunciado (tipo de imóvel ou de negócio), não um nome. */
const WHAT_IT_IS = /^(espa[cç]os?|salas?|lojas?|casas?|sobrados?|apartamentos?|aptos?|im[oó]ve(l|is)|terrenos?|lotes?|coberturas?|kitnets?|flats?|galp[aã]o|galp[oõ]es|pontos?|ch[aá]caras?|s[ií]tios?|fazendas?|quartos?|su[ií]tes?|escrit[oó]rios?|consult[oó]rios?|restaurantes?|padarias?|lanchonetes?|pizzarias?|cafeterias?|academias?|cl[ií]nicas?|sal[aã]o|sal[oõ]es|barbearias?|houses?|homes?|apartments?|condos?|shops?|stores?|offices?|spaces?|units?|lots?|land|bakery|bakeries|restaurants?|caf[eé]s?|gyms?|clinics?|salons?|corner|cozy|charming|beautiful|spacious|new|novo|nova|lindo|linda|amplo|ampla|moderno|moderna|bonito|bonita|locales?|local|pisos?|departamentos?|oficinas?|tiendas?|naves?|panader[ií]as?|gimnasios?|peluquer[ií]as?)$/iu

const isCap = (w: string) => /^\p{Lu}/u.test(w)
const isWordish = (w: string) => /^[\p{L}\p{N}][\p{L}\p{N}'’.&․-]*$/u.test(w) || w === '&'

/**
 * Nomes próprios que a pessoa escreveu (lugar, edifício, rua, bairro, cidade, negócio), na ordem da frase, no máximo 3.
 * Um nome = sequência de palavras com maiúscula, com ligações internas ("das", "de") e números no meio ("Rua 25 de
 * Março"). Palavra solta com maiúscula no começo da frase NÃO conta ("Espaço", "Casa", "Corner" — é só o começo da
 * frase). Trecho no começo da frase com 2+ maiúsculas perde a 1ª palavra se ela diz o que é anunciado ("Apartamento Vila
 * Mariana" → "Vila Mariana"). Texto em "Título Assim"/CAIXA ALTA = [] (a maiúscula não prova nada). Pura.
 */
export function simpleNames(text: string): string[] {
  // O ponto de abreviação ("Av. Paulista", "R. das Flores") não termina a frase: vira um ponto-guia (U+2024) até o fim.
  const s = String(text ?? '').replace(/\s+/g, ' ').trim().replace(/(?<![\p{L}\p{N}])(Av|Avda|Al|R|Pç|Pça|Pq|Jd|Vl|Dr|Dra|Sr|Sra|Sto|Sta|St|Ave|Blvd|Rd|Mt|Ft|Prof|Profa|Gral|Cdad)\.(?=\s)/gu, (_m: string, ab: string) => `${ab}․`)
  if (!s) return []
  // Pedaços separados por pontuação; cada pedaço sabe se começa uma frase.
  const pieces: { words: string[]; sentenceStart: boolean }[] = []
  let sentenceStart = true
  for (const part of s.split(/(\s[—–-]\s|[,;:!?()"“”\n]|\.(?=\s|$))/u)) {
    if (part === undefined) continue
    if (/^(\s[—–-]\s|[,;:()"“”])$/u.test(part)) { continue }
    if (/^[.!?\n]$/.test(part)) { sentenceStart = true; continue }
    const words = part.trim().split(' ').filter(Boolean)
    if (!words.length) continue
    pieces.push({ words, sentenceStart })
    sentenceStart = false
  }
  // Título/CAIXA ALTA: uma palavra de função com maiúscula fora do começo da frase.
  for (const p of pieces) {
    for (let i = 0; i < p.words.length; i++) {
      if (i === 0 && p.sentenceStart) continue
      const w = p.words[i]
      if (FUNCTION_WORDS.has(w.toLowerCase()) && isCap(w)) return []
    }
  }
  const out: string[] = []
  const seen = new Set<string>()
  for (const p of pieces) {
    let i = 0
    // Palavra de nome = maiúscula, com cara de palavra e fora da lista NOT_A_NAME (canal, dia, mês, "I" quebram a corrida).
    const nameWord = (w: string) => isCap(w) && isWordish(w) && !NOT_A_NAME.test(w)
    while (i < p.words.length) {
      if (!nameWord(p.words[i])) { i++; continue }
      const start = i
      let end = i // último índice com maiúscula da corrida
      let j = i + 1
      while (j < p.words.length) {
        const w = p.words[j]
        if (nameWord(w)) { end = j; j++; continue }
        if (NAME_JOINERS.has(w.toLowerCase()) || /^\p{N}+[ºª°]?$/u.test(w)) { j++; continue }
        break
      }
      let run = p.words.slice(start, end + 1)
      i = end + 1
      const atStart = start === 0 && p.sentenceStart
      const caps = run.filter((w) => isCap(w)).length
      if (atStart && caps === 1) continue
      if (atStart && WHAT_IT_IS.test(run[0])) {
        run = run.slice(1)
        while (run.length && !isCap(run[0])) run = run.slice(1)
      }
      if (!run.length || run.length > 6) continue
      const name = run.join(' ').split('․').join('.')
      // Sigla solta ("SP", "NY", "USA") não é exigida: a voz lê letra por letra e a pessoa quase sempre quis dizer o lugar.
      if (run.length === 1 && (name.replace(/[^\p{L}]/gu, '').length < 2 || /^\p{Lu}{1,3}$/u.test(name))) continue
      const key = name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(name)
    }
  }
  return out.slice(0, 3)
}

/**
 * Nomes da lista que o texto NÃO cita. Citar = as palavras do nome, na ordem e juntas, sem diferenciar maiúscula; as
 * ligações ("das", "de") e as abreviações com ponto ("Av.") não contam, então "Avenida Paulista" cita "Av. Paulista" e
 * "Rua das Flores" cita "Rua das Flores". Pura.
 */
export function missingNames(text: string, names: readonly string[]): string[] {
  const words = (s: string) => s.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w && !NAME_JOINERS.has(w))
  const said = words(String(text ?? ''))
  return names.filter((name) => {
    const want = String(name ?? '').split(/\s+/).filter((w) => w && !/\.$/.test(w)).join(' ')
    const seq = words(want)
    if (!seq.length) return false
    for (let i = 0; i + seq.length <= said.length; i++) if (seq.every((w, k) => said[i + k] === w)) return false
    return true
  })
}

/** Línguas em que substantivo comum vai em minúscula no meio da frase (alemão fica de fora: lá todo substantivo é maiúsculo). */
const LOWERCASE_NOUN_LANGS = new Set(['en', 'pt', 'es', 'fr', 'it'])

/**
 * O "nome" do brief é um substantivo comum? ("Espaço comercial", "Casa", "Corner bakery", "Local comercial" — o que é
 * anunciado, não um nome.) Devolve a forma em minúscula para o meio da frase, ou null quando é nome de verdade ou não dá
 * para saber (na dúvida, nada muda). A prova vem do que a PESSOA escreveu:
 *   · achado no meio da frase dela: minúsculo lá = comum; com maiúscula = nome;
 *   · achado no começo da frase: comum se alguma palavra seguinte está em minúscula lá ("Espaço comercial"), ou se é uma
 *     palavra só que diz o que é anunciado ("Casa"); qualquer outra maiúscula depois ("Casa Bonita") = nome;
 *   · não achado: comum só se a 1ª palavra diz o que é anunciado e as outras estão em minúscula. Pura.
 */
export function simpleCommonNoun(brand: string, sentence: string, language: string): string | null {
  const b = String(brand ?? '').replace(/\s+/g, ' ').trim()
  const s = String(sentence ?? '').replace(/\s+/g, ' ').trim()
  if (!b || !LOWERCASE_NOUN_LANGS.has(String(language ?? '').toLowerCase().slice(0, 2))) return null
  const lower = b.toLocaleLowerCase(language)
  const bw = b.split(' ')
  const idx = s.toLocaleLowerCase(language).indexOf(lower)
  const boundaryOk = idx >= 0 && !/[\p{L}\p{N}]/u.test(s.slice(idx - 1, idx) || ' ') && !/[\p{L}\p{N}]/u.test(s.slice(idx + b.length, idx + b.length + 1) || ' ')
  if (boundaryOk) {
    const written = s.slice(idx, idx + b.length).split(' ')
    const atStart = idx === 0 || /[.!?]\s*$/.test(s.slice(0, idx))
    if (!atStart) return isCap(written[0]) ? null : lower
    if (written.slice(1).some((w) => isCap(w) && !NAME_JOINERS.has(w.toLowerCase()))) return null
    if (written.length > 1) return lower
    return WHAT_IT_IS.test(written[0]) ? lower : null
  }
  if (!WHAT_IT_IS.test(bw[0])) return null
  return bw.slice(1).some((w) => isCap(w)) ? null : lower
}

/**
 * Pós-processamento: cada ocorrência de `phrase` (sem diferenciar maiúscula) que está NO MEIO de uma frase vira `lower`;
 * no começo da frase (início do texto ou depois de . ! ?) fica como está. Fronteira de palavra Unicode. Pura.
 */
export function lowerMidSentence(text: string, phrase: string, lower: string): string {
  const t = String(text ?? '')
  const p = String(phrase ?? '').trim()
  if (!t || !p) return t
  const low = t.toLowerCase()
  const needle = p.toLowerCase()
  let out = ''
  let from = 0
  for (let i = low.indexOf(needle); i >= 0; i = low.indexOf(needle, i + needle.length)) {
    const before = t.slice(0, i)
    const after = t.slice(i + needle.length, i + needle.length + 1)
    const wordEdge = !/[\p{L}\p{N}]$/u.test(before) && !/^[\p{L}\p{N}]/u.test(after)
    const midSentence = /\S/.test(before) && !/[.!?]["”')\]]*\s*$/.test(before)
    if (wordEdge && midSentence) {
      out += t.slice(from, i) + lower
      from = i + needle.length
    }
  }
  return out + t.slice(from)
}

/** O botão do cartão pelo contato que a pessoa escreveu (os rótulos por língua vêm de endCardCtaLabel). */
export function simpleCtaKind(contact: string): 'whatsapp' | 'call' | 'visit' {
  const c = String(contact ?? '')
  if (/whats\s?app|wa\.me|\bzap\b/i.test(c)) return 'whatsapp'
  if (c.replace(/\D/g, '').length >= 8) return 'call'
  return 'visit'
}

/** Troca {chave} pelo valor (split/join: nada de $1 de replace). */
export function fill(template: string, vars: Record<string, string | number>): string {
  let out = template
  for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v))
  return out
}

// ── textos da tela ──────────────────────────────────────────────────────────────────────────────────────────────────
const EN = {
  shell: {
    title: 'Studio Ads',
    sub: 'Your real photos, brought to life in a vertical ad with music, a short voice-over and your logo.',
    subSimple: 'Send your photos or a video, say in a few words what you want to sell, and choose the level. We do the rest.',
    startOver: 'Start over',
    confirmTitle: 'Start over with an empty ad?',
    confirmBody: 'Everything on this page (level, text, logo, photos and plan) will be cleared.',
    activeNote: ' The ad being made right now keeps going and will appear in My Videos.',
    yes: 'Yes, start over',
    keep: 'Keep working',
    toFull: 'I prefer to fill in everything myself',
    toSimple: 'Back to the simple mode',
    loading: 'Loading…',
  },
  files: {
    title: 'Your photos and videos',
    lead: 'Send 1 to 7 photos or videos — your product photo first. Up to 2 videos go into the ad as video.',
    add: 'Add photos or videos',
    addMore: 'Add more',
    count: '{n} of {max} in the ad',
    outTitle: 'Left out of the ad (max. {max})',
    useThis: 'Use this one',
    remove: 'Remove',
    moveUp: 'Move up',
    frameHint: 'Drag the photo to choose what stays in the vertical frame.',
    fromVideo: 'From your video',
    small: 'This photo is small and may look soft. Send the original file, not a copy from a chat app.',
    readingVideo: 'Reading your video…',
    videoHidden: 'Come back to this tab so we can finish reading your video.',
    videoHiddenRetry: '{name}: this tab stayed in the background too long, so we could not finish reading the video. Add it again.',
    videoDecode: "Your browser cannot open this video; record it in 'Most Compatible' or send photos.",
    asVideo: 'Goes in as video',
    asVideoHint: 'We use a short, lively part of it, muted: the music and the voice-over play over it.',
    videoBigAsPhotos: '{name}: videos over 50 MB go in as photos taken from them.',
    videoTypeAsPhotos: '{name}: only MP4 and MOV videos go in as video; this one goes in as photos taken from it.',
    videoShortAsPhotos: '{name}: videos shorter than 3 seconds go in as photos taken from them.',
    videoManyAsPhotos: '{name}: up to 2 videos go in as video; this one goes in as photos taken from it.',
    videoUnreadableAsPhotos: "{name}: your browser could not read this video's length or size, so it goes in as photos taken from it.",
    videoServerAsPhotos: '{name}: we could not use this video as video on our side, so it now goes in as photos taken from it. Plan again (free).',
    videoTooBig: '{name}: the video must be under 500 MB.',
    videoTooLong: '{name}: the video must be under 10 minutes.',
    waitAdding: 'Wait: we are still reading the files you just added. Then add these again.',
    badFile: '{name}: use a JPG, PNG or WebP photo, or an MP4, MOV or WebM video.',
    photoTooBig: '{name}: the photo must be under 50 MB.',
    photoUnreadable: '{name}: your browser cannot open this photo. Save it as JPG and add it again.',
    uploading: 'Uploading…',
    frameLabel: 'Framing of photo {n}. Drag the photo, or use the arrow keys, to choose what stays in the vertical frame.',
    photoAlt: 'Photo {n}',
  },
  text: {
    title: 'What do you want to sell or show?',
    question: 'In a few words, what do you want to sell or show?',
    placeholder: 'e.g. Shop for sale in the Aurora Building, Jardim neighborhood, São Paulo',
    hint: 'We look up public facts about the place (each one with its source) and you check them before anything is charged.',
    voiceIn: 'Voice in',
    more: 'More options',
    price: 'Price (optional)',
    pricePlaceholder: 'e.g. 450,000 or 2,500 a month',
    contact: 'Contact (optional)',
    contactPlaceholder: 'Phone, WhatsApp or @handle',
    overlays: 'Phrases on screen',
    overlaysHint: '2 or 3 short phrases over the video (the name, what it is, where). They are not subtitles of the voice-over.',
    narration: 'Voice-over',
    on: 'on',
    off: 'off',
    onMany: 'on',
    offMany: 'off',
    cardTitle: 'Title of the last frame',
    cardTitleHint: 'Empty = taken from your text.',
    logo: 'Logo (optional)',
    addLogo: 'Add logo',
    changeLogo: 'Change logo',
    removeLogo: 'Remove logo',
    color: 'Color of the last frame',
    cardPreview: 'Preview of your last frame',
  },
  tiers: {
    title: 'Choose the level',
    photo_motion: { name: 'Standard', pitch: 'Your own photos, each one with a slow camera move.' },
    commercial: { name: 'Commercial', pitch: 'Your photos plus new scenes with people, created by AI from your photos.' },
    cinema: { name: 'Premium', pitch: 'Everything in Commercial, plus one more AI scene and a longer ad.' },
    credits: '{n} credits',
    shots: '{n} shots',
    aiPeople: 'Images with people are illustrative (made by AI).',
    balance: 'You have {n} credits.',
    balanceUnknown: 'We could not read your credit balance right now.',
    needMore: 'You need {n} more credits for this one.',
    getCredits: 'Get credits (opens a new tab)',
  },
  plan: {
    missingTitle: 'Before planning:',
    needFiles: 'Add at least {min} photo ({min} to {max} in the ad).',
    needPhoto: 'Add at least 1 photo along with your videos.',
    needText: 'Write in a few words what you want to sell or show.',
    textTooLong: 'Shorten your text (400 characters).',
    needTier: 'Choose the level.',
    waitLogo: 'Wait for the logo to finish uploading.',
    waitVideo: 'Wait for the frames of your video.',
    go: 'Discover and plan (free)',
    again: 'Plan again (free)',
    planning: 'Planning…',
    noteUpload: 'Framing and uploading photo {i} of {n}…',
    noteCard: 'Drawing your last frame…',
    noteSave: 'Saving your ad…',
    noteResearch: 'Looking up public facts about the place…',
    notePlan: 'Writing your plan: shots, voice-over and words on screen…',
    factsTitle: 'What we found on the internet — check it',
    factsHint: 'Nothing here goes into the ad unless you tick it. Tick only what is right about the building or the area, then plan again.',
    source: 'source',
    factsNone: 'We did not find public facts with a source; we go on with your text only.',
    title: 'Your ad plan',
    lead: 'This is the ad we will make. Nothing has been charged yet.',
    stale: 'You changed something after planning. Plan again to see the new plan (it is free).',
    shots: 'Shots',
    newScene: 'New scene',
    photo: 'Photo',
    lastFrame: 'Your last frame',
    lastFrameDesc: 'Title, price and contact',
    words: 'Phrases on screen',
    noWords: 'No phrases on screen.',
    voice: 'Voice-over',
    noVoice: 'No voice-over: music only.',
    total: 'About {s} seconds · vertical 9:16 · {c} credits',
    make: 'Make my ad · {c} credits',
    starting: 'Starting…',
    priceChanged: 'The price of this plan changed. Plan again to see the current price.',
    photoError: 'Photo {n}: {msg}',
    uploadFailed: 'This photo could not be framed and uploaded. Try again, or add it again as JPG.',
    cardFailed: 'We could not draw your last frame. Try again.',
    logoFailed: 'The logo did not upload. Try again.',
  },
  progress: {
    title: 'Making your ad',
    assembling: 'Every shot is ready. Now adding the music, the voice-over and the last frame.',
    animating: 'Your photos are being animated.',
    leave: 'You can leave this page: the ad keeps being made and lands in',
    myVideos: 'My Videos',
    lost: 'We lost contact for a moment. Still checking: your ad keeps being made either way.',
    preparing: 'Preparing the shots…',
    shot: 'Shot {n}',
    loading: 'Loading your ad…',
  },
  done: {
    title: 'Your ad is ready',
    inMyVideos: 'Your ad is in',
    download: 'Download the ad',
    downloading: 'Downloading…',
    downloadFailed: 'The download did not start. Open the ad in My Videos and download it there.',
    open: 'Open in My Videos',
    aiLabel: 'Turn on the AI-generated label when you post. Parts of this ad were made with AI from your photos.',
    redoTitle: 'Not happy with a shot?',
    redo: 'Redo a shot (full mode)',
    another: 'Make another ad',
  },
  failed: {
    title: 'This ad did not work',
    redoTitle: 'This shot could not be redone',
    cancelled: 'This was not started',
    nothing: 'Nothing was charged.',
    back: 'Back to my photos',
    backToAd: 'Back to my ad',
  },
  how: {
    title: 'How it works',
    steps: [
      'Send your photos or a video and say what you want to sell.',
      'We look up public facts, write the voice-over and plan every shot. You check it all for free.',
      'Choose the level and make the ad. It lands in My Videos.',
    ],
  },
  notReady: 'The ad maker is not switched on yet on our side. Nothing will be charged.',
  /** Rótulos que lib/ads/v2Screen.ts devolve em inglês → tradução (inglês = ele mesmo). */
  labels: {
    'Still with zoom': 'Still with zoom',
    Ready: 'Ready',
    'Trying again': 'Trying again',
    'Did not work': 'Did not work',
    'Preparing image': 'Preparing image',
    Animating: 'Animating',
    Hook: 'Hook',
    Desire: 'Desire',
    'In use': 'In use',
    'The feeling': 'The feeling',
    'Your place': 'Your place',
    'Your product': 'Your product',
    'Your photo as a still with a slow zoom, so every word stays exactly right': 'Your photo as a still with a slow zoom, so every word stays exactly right',
    'A new scene of everyday people enjoying it, created from your photos': 'A new scene of everyday people enjoying it, created from your photos',
    'A hero close-up of your product, from your photo': 'A hero close-up of your product, from your photo',
    'Your photo, brought to life with one slow camera move': 'Your photo, brought to life with one slow camera move',
    'Your video': 'Your video',
    'Your own video, as you filmed it: a short part, muted, no AI': 'Your own video, as you filmed it: a short part, muted, no AI',
    'We could not confirm the credits for this redo, so it was not made. If credits left your balance, they come back on their own. Your ad is still in My Videos, exactly as it was.': 'We could not confirm the credits for this redo, so it was not made. If credits left your balance, they come back on their own. Your ad is still in My Videos, exactly as it was.',
    'We could not redo this shot. The credits for the redo go back to your balance automatically. Your ad is still in My Videos, exactly as it was.': 'We could not redo this shot. The credits for the redo go back to your balance automatically. Your ad is still in My Videos, exactly as it was.',
    'We could not confirm the credits for this ad, so it was not made. If credits left your balance, they come back on their own.': 'We could not confirm the credits for this ad, so it was not made. If credits left your balance, they come back on their own.',
    'This ad could not be finished because of our content rules. Its credits go back to your balance automatically.': 'This ad could not be finished because of our content rules. Its credits go back to your balance automatically.',
    'We could not finish this ad. Its credits go back to your balance automatically. You can plan it again from your photos.': 'We could not finish this ad. Its credits go back to your balance automatically. You can plan it again from your photos.',
  } as Record<string, string>,
}
export type AdsV2SimpleCopy = typeof EN

const PT: AdsV2SimpleCopy = {
  shell: {
    title: 'Studio Ads',
    sub: 'Suas fotos de verdade, ganhando vida num anúncio vertical com música, uma narração curta e o seu logo.',
    subSimple: 'Mande suas fotos ou um vídeo, diga em poucas palavras o que quer vender e escolha o nível. A gente faz o resto.',
    startOver: 'Recomeçar',
    confirmTitle: 'Recomeçar com um anúncio vazio?',
    confirmBody: 'Tudo o que está nesta página (nível, texto, logo, fotos e plano) será apagado.',
    activeNote: ' O anúncio que está sendo feito agora continua e vai aparecer em Meus Vídeos.',
    yes: 'Sim, recomeçar',
    keep: 'Continuar editando',
    toFull: 'Prefiro preencher tudo',
    toSimple: 'Voltar ao modo simples',
    loading: 'Carregando…',
  },
  files: {
    title: 'Suas fotos e vídeos',
    lead: 'Envie de 1 a 7 fotos ou vídeos — a foto do produto primeiro. Até 2 vídeos entram no anúncio como vídeo.',
    add: 'Adicionar fotos ou vídeos',
    addMore: 'Adicionar mais',
    count: '{n} de {max} no anúncio',
    outTitle: 'Fora do anúncio (máx. {max})',
    useThis: 'Usar esta',
    remove: 'Remover',
    moveUp: 'Subir',
    frameHint: 'Arraste a foto para escolher o que fica no quadro vertical.',
    fromVideo: 'Do seu vídeo',
    small: 'Esta foto é pequena e pode ficar sem nitidez. Mande o arquivo original, não a cópia do WhatsApp.',
    readingVideo: 'Lendo o seu vídeo…',
    videoHidden: 'Volte para esta aba para terminarmos de ler o vídeo.',
    videoHiddenRetry: '{name}: esta aba ficou em segundo plano por muito tempo e não terminamos de ler o vídeo. Adicione-o de novo.',
    videoDecode: "Seu navegador não abre este vídeo; grave em 'Mais compatível' ou envie fotos.",
    asVideo: 'Vai entrar como vídeo',
    asVideoHint: 'Usamos um trecho curto e com movimento, sem o som: a música e a narração tocam por cima.',
    videoBigAsPhotos: '{name}: vídeos acima de 50 MB entram como fotos tiradas deles.',
    videoTypeAsPhotos: '{name}: só vídeos MP4 e MOV entram como vídeo; este entra como fotos tiradas dele.',
    videoShortAsPhotos: '{name}: vídeos com menos de 3 segundos entram como fotos tiradas deles.',
    videoManyAsPhotos: '{name}: até 2 vídeos entram como vídeo; este entra como fotos tiradas dele.',
    videoUnreadableAsPhotos: '{name}: seu navegador não conseguiu ler a duração ou o tamanho deste vídeo, então ele entra como fotos tiradas dele.',
    videoServerAsPhotos: '{name}: não conseguimos usar este vídeo como vídeo do nosso lado, então ele agora entra como fotos tiradas dele. Planeje de novo (grátis).',
    videoTooBig: '{name}: o vídeo precisa ter menos de 500 MB.',
    videoTooLong: '{name}: o vídeo precisa ter menos de 10 minutos.',
    waitAdding: 'Espere: ainda estamos lendo os arquivos que você acabou de pôr. Depois adicione estes de novo.',
    badFile: '{name}: use foto JPG, PNG ou WebP, ou vídeo MP4, MOV ou WebM.',
    photoTooBig: '{name}: a foto precisa ter menos de 50 MB.',
    photoUnreadable: '{name}: seu navegador não abre esta foto. Salve como JPG e adicione de novo.',
    uploading: 'Enviando…',
    frameLabel: 'Enquadramento da foto {n}. Arraste a foto, ou use as setas, para escolher o que fica no quadro vertical.',
    photoAlt: 'Foto {n}',
  },
  text: {
    title: 'O que você quer vender ou mostrar?',
    question: 'Em poucas palavras, o que você quer vender ou mostrar?',
    placeholder: 'Ex.: Loja à venda no Edifício Aurora, bairro Jardim, São Paulo',
    hint: 'Procuramos fatos públicos sobre o lugar (cada um com a fonte) e você confere tudo antes de qualquer cobrança.',
    voiceIn: 'Fala em',
    more: 'Mais opções',
    price: 'Preço (opcional)',
    pricePlaceholder: 'Ex.: R$ 450.000 ou R$ 2.500 por mês',
    contact: 'Contato (opcional)',
    contactPlaceholder: 'Telefone, WhatsApp ou @perfil',
    overlays: 'Frases na tela',
    overlaysHint: '2 ou 3 frases curtas por cima do vídeo (o nome, o que é, onde). Não são legenda da narração.',
    narration: 'Narração',
    on: 'ligada',
    off: 'desligada',
    onMany: 'ligadas',
    offMany: 'desligadas',
    cardTitle: 'Título do quadro final',
    cardTitleHint: 'Vazio = tirado do seu texto.',
    logo: 'Logo (opcional)',
    addLogo: 'Adicionar logo',
    changeLogo: 'Trocar logo',
    removeLogo: 'Tirar logo',
    color: 'Cor do quadro final',
    cardPreview: 'Prévia do seu quadro final',
  },
  tiers: {
    title: 'Escolha o nível',
    photo_motion: { name: 'Normal', pitch: 'Suas próprias fotos, cada uma com um movimento lento de câmera.' },
    commercial: { name: 'Comercial', pitch: 'Suas fotos e cenas novas com pessoas, criadas pela IA a partir das suas fotos.' },
    cinema: { name: 'Premium', pitch: 'Tudo do Comercial, mais uma cena criada pela IA e um anúncio mais longo.' },
    credits: '{n} créditos',
    shots: '{n} cenas',
    aiPeople: 'Imagens com pessoas são ilustrativas (feitas por IA).',
    balance: 'Você tem {n} créditos.',
    balanceUnknown: 'Não conseguimos ler seu saldo de créditos agora.',
    needMore: 'Faltam {n} créditos para este.',
    getCredits: 'Comprar créditos (abre outra aba)',
  },
  plan: {
    missingTitle: 'Antes de planejar:',
    needFiles: 'Adicione pelo menos {min} foto ({min} a {max} no anúncio).',
    needPhoto: 'Junto com os vídeos, adicione pelo menos 1 foto.',
    needText: 'Escreva em poucas palavras o que você quer vender ou mostrar.',
    textTooLong: 'Encurte o texto (400 caracteres).',
    needTier: 'Escolha o nível.',
    waitLogo: 'Espere o logo terminar de subir.',
    waitVideo: 'Espere os quadros do seu vídeo.',
    go: 'Descobrir e planejar (grátis)',
    again: 'Planejar de novo (grátis)',
    planning: 'Planejando…',
    noteUpload: 'Enquadrando e enviando a foto {i} de {n}…',
    noteCard: 'Desenhando o quadro final…',
    noteSave: 'Salvando o seu anúncio…',
    noteResearch: 'Procurando fatos públicos sobre o lugar…',
    notePlan: 'Escrevendo o plano: cenas, narração e frases na tela…',
    factsTitle: 'O que achamos na internet — confira',
    factsHint: 'Nada daqui entra no anúncio sem a sua marca. Marque só o que estiver certo sobre o prédio ou o bairro e planeje de novo.',
    source: 'fonte',
    factsNone: 'Não achamos fatos públicos com fonte; seguimos só com o seu texto.',
    title: 'O plano do seu anúncio',
    lead: 'Este é o anúncio que vamos fazer. Nada foi cobrado ainda.',
    stale: 'Você mudou algo depois de planejar. Planeje de novo para ver o plano novo (é grátis).',
    shots: 'Cenas',
    newScene: 'Cena nova',
    photo: 'Foto',
    lastFrame: 'Seu quadro final',
    lastFrameDesc: 'Título, preço e contato',
    words: 'Frases na tela',
    noWords: 'Sem frases na tela.',
    voice: 'Narração',
    noVoice: 'Sem narração: só música.',
    total: 'Cerca de {s} segundos · vertical 9:16 · {c} créditos',
    make: 'Fazer meu anúncio · {c} créditos',
    starting: 'Começando…',
    priceChanged: 'O preço deste plano mudou. Planeje de novo para ver o preço atual.',
    photoError: 'Foto {n}: {msg}',
    uploadFailed: 'Não deu para enquadrar e enviar esta foto. Tente de novo, ou adicione de novo como JPG.',
    cardFailed: 'Não conseguimos desenhar o quadro final. Tente de novo.',
    logoFailed: 'O logo não subiu. Tente de novo.',
  },
  progress: {
    title: 'Fazendo o seu anúncio',
    assembling: 'Todas as cenas estão prontas. Agora entram a música, a narração e o quadro final.',
    animating: 'Suas fotos estão ganhando movimento.',
    leave: 'Pode sair desta página: o anúncio continua sendo feito e chega em',
    myVideos: 'Meus Vídeos',
    lost: 'Perdemos o contato por um instante. Continuamos conferindo: o anúncio segue sendo feito de qualquer jeito.',
    preparing: 'Preparando as cenas…',
    shot: 'Cena {n}',
    loading: 'Carregando o seu anúncio…',
  },
  done: {
    title: 'Seu anúncio está pronto',
    inMyVideos: 'Seu anúncio está em',
    download: 'Baixar o anúncio',
    downloading: 'Baixando…',
    downloadFailed: 'O download não começou. Abra o anúncio em Meus Vídeos e baixe por lá.',
    open: 'Abrir em Meus Vídeos',
    aiLabel: 'Ligue o rótulo de conteúdo feito com IA ao postar. Partes deste anúncio foram feitas com IA a partir das suas fotos.',
    redoTitle: 'Não gostou de uma cena?',
    redo: 'Refazer uma cena (modo completo)',
    another: 'Fazer outro anúncio',
  },
  failed: {
    title: 'Este anúncio não deu certo',
    redoTitle: 'Não deu para refazer esta cena',
    cancelled: 'Isto não foi iniciado',
    nothing: 'Nada foi cobrado.',
    back: 'Voltar às minhas fotos',
    backToAd: 'Voltar ao meu anúncio',
  },
  how: {
    title: 'Como funciona',
    steps: [
      'Mande suas fotos ou um vídeo e diga o que quer vender.',
      'Procuramos fatos públicos, escrevemos a narração e planejamos cada cena. Você confere tudo de graça.',
      'Escolha o nível e faça o anúncio. Ele chega em Meus Vídeos.',
    ],
  },
  notReady: 'O criador de anúncios ainda não está ligado do nosso lado. Nada será cobrado.',
  labels: {
    'Still with zoom': 'Foto parada com zoom',
    Ready: 'Pronta',
    'Trying again': 'Tentando de novo',
    'Did not work': 'Não deu certo',
    'Preparing image': 'Preparando a imagem',
    Animating: 'Ganhando movimento',
    Hook: 'Abertura',
    Desire: 'Desejo',
    'In use': 'Em uso',
    'The feeling': 'A sensação',
    'Your place': 'O seu lugar',
    'Your product': 'O seu produto',
    'Your photo as a still with a slow zoom, so every word stays exactly right': 'Sua foto parada com um zoom lento, para cada palavra ficar exata',
    'A new scene of everyday people enjoying it, created from your photos': 'Uma cena nova com pessoas aproveitando, criada a partir das suas fotos',
    'A hero close-up of your product, from your photo': 'Um close de destaque do seu produto, a partir da sua foto',
    'Your photo, brought to life with one slow camera move': 'Sua foto ganhando vida com um movimento lento de câmera',
    'Your video': 'Seu vídeo',
    'Your own video, as you filmed it: a short part, muted, no AI': 'O seu próprio vídeo, como você gravou: um trecho curto, sem som, sem IA',
    'We could not confirm the credits for this redo, so it was not made. If credits left your balance, they come back on their own. Your ad is still in My Videos, exactly as it was.': 'Não conseguimos confirmar os créditos desta refação, então ela não foi feita. Se saíram créditos do seu saldo, eles voltam sozinhos. Seu anúncio continua em Meus Vídeos, do jeito que estava.',
    'We could not redo this shot. The credits for the redo go back to your balance automatically. Your ad is still in My Videos, exactly as it was.': 'Não conseguimos refazer esta cena. Os créditos da refação voltam ao seu saldo sozinhos. Seu anúncio continua em Meus Vídeos, do jeito que estava.',
    'We could not confirm the credits for this ad, so it was not made. If credits left your balance, they come back on their own.': 'Não conseguimos confirmar os créditos deste anúncio, então ele não foi feito. Se saíram créditos do seu saldo, eles voltam sozinhos.',
    'This ad could not be finished because of our content rules. Its credits go back to your balance automatically.': 'Este anúncio não pôde ser terminado por causa das nossas regras de conteúdo. Os créditos voltam ao seu saldo sozinhos.',
    'We could not finish this ad. Its credits go back to your balance automatically. You can plan it again from your photos.': 'Não conseguimos terminar este anúncio. Os créditos voltam ao seu saldo sozinhos. Você pode planejar de novo a partir das suas fotos.',
  },
}

const ES: AdsV2SimpleCopy = {
  shell: {
    title: 'Studio Ads',
    sub: 'Tus fotos reales, con vida en un anuncio vertical con música, una narración corta y tu logo.',
    subSimple: 'Envía tus fotos o un video, di en pocas palabras qué quieres vender y elige el nivel. Nosotros hacemos el resto.',
    startOver: 'Empezar de nuevo',
    confirmTitle: '¿Empezar de nuevo con un anuncio vacío?',
    confirmBody: 'Todo lo que hay en esta página (nivel, texto, logo, fotos y plan) se borrará.',
    activeNote: ' El anuncio que se está haciendo ahora sigue y aparecerá en Mis Videos.',
    yes: 'Sí, empezar de nuevo',
    keep: 'Seguir editando',
    toFull: 'Prefiero completar todo yo',
    toSimple: 'Volver al modo simple',
    loading: 'Cargando…',
  },
  files: {
    title: 'Tus fotos y videos',
    lead: 'Envía de 1 a 7 fotos o videos — la foto del producto primero. Hasta 2 videos entran en el anuncio como video.',
    add: 'Agregar fotos o videos',
    addMore: 'Agregar más',
    count: '{n} de {max} en el anuncio',
    outTitle: 'Fuera del anuncio (máx. {max})',
    useThis: 'Usar esta',
    remove: 'Quitar',
    moveUp: 'Subir',
    frameHint: 'Arrastra la foto para elegir qué queda en el cuadro vertical.',
    fromVideo: 'De tu video',
    small: 'Esta foto es pequeña y puede verse borrosa. Envía el archivo original, no la copia de una app de chat.',
    readingVideo: 'Leyendo tu video…',
    videoHidden: 'Vuelve a esta pestaña para que terminemos de leer el video.',
    videoHiddenRetry: '{name}: esta pestaña quedó en segundo plano demasiado tiempo y no terminamos de leer el video. Agrégalo de nuevo.',
    videoDecode: "Tu navegador no abre este video; grábalo en 'Más compatible' o envía fotos.",
    asVideo: 'Entra como video',
    asVideoHint: 'Usamos una parte corta y con movimiento, sin sonido: la música y la narración suenan encima.',
    videoBigAsPhotos: '{name}: los videos de más de 50 MB entran como fotos sacadas de ellos.',
    videoTypeAsPhotos: '{name}: solo los videos MP4 y MOV entran como video; este entra como fotos sacadas de él.',
    videoShortAsPhotos: '{name}: los videos de menos de 3 segundos entran como fotos sacadas de ellos.',
    videoManyAsPhotos: '{name}: hasta 2 videos entran como video; este entra como fotos sacadas de él.',
    videoUnreadableAsPhotos: '{name}: tu navegador no pudo leer la duración o el tamaño de este video, así que entra como fotos sacadas de él.',
    videoServerAsPhotos: '{name}: no pudimos usar este video como video de nuestro lado, así que ahora entra como fotos sacadas de él. Planifica de nuevo (gratis).',
    videoTooBig: '{name}: el video debe pesar menos de 500 MB.',
    videoTooLong: '{name}: el video debe durar menos de 10 minutos.',
    waitAdding: 'Espera: todavía estamos leyendo los archivos que acabas de poner. Luego agrega estos de nuevo.',
    badFile: '{name}: usa una foto JPG, PNG o WebP, o un video MP4, MOV o WebM.',
    photoTooBig: '{name}: la foto debe pesar menos de 50 MB.',
    photoUnreadable: '{name}: tu navegador no abre esta foto. Guárdala como JPG y agrégala de nuevo.',
    uploading: 'Subiendo…',
    frameLabel: 'Encuadre de la foto {n}. Arrastra la foto, o usa las flechas, para elegir qué queda en el cuadro vertical.',
    photoAlt: 'Foto {n}',
  },
  text: {
    title: '¿Qué quieres vender o mostrar?',
    question: 'En pocas palabras, ¿qué quieres vender o mostrar?',
    placeholder: 'Ej.: Local en venta en el Edificio Aurora, barrio Jardín, São Paulo',
    hint: 'Buscamos datos públicos del lugar (cada uno con su fuente) y tú los revisas antes de cualquier cobro.',
    voiceIn: 'Voz en',
    more: 'Más opciones',
    price: 'Precio (opcional)',
    pricePlaceholder: 'Ej.: 450.000 o 2.500 al mes',
    contact: 'Contacto (opcional)',
    contactPlaceholder: 'Teléfono, WhatsApp o @usuario',
    overlays: 'Frases en pantalla',
    overlaysHint: '2 o 3 frases cortas sobre el video (el nombre, qué es, dónde). No son subtítulos de la narración.',
    narration: 'Narración',
    on: 'activada',
    off: 'desactivada',
    onMany: 'activadas',
    offMany: 'desactivadas',
    cardTitle: 'Título del cuadro final',
    cardTitleHint: 'Vacío = sale de tu texto.',
    logo: 'Logo (opcional)',
    addLogo: 'Agregar logo',
    changeLogo: 'Cambiar logo',
    removeLogo: 'Quitar logo',
    color: 'Color del cuadro final',
    cardPreview: 'Vista previa de tu cuadro final',
  },
  tiers: {
    title: 'Elige el nivel',
    photo_motion: { name: 'Normal', pitch: 'Tus propias fotos, cada una con un movimiento lento de cámara.' },
    commercial: { name: 'Comercial', pitch: 'Tus fotos y escenas nuevas con personas, creadas por la IA a partir de tus fotos.' },
    cinema: { name: 'Premium', pitch: 'Todo lo del Comercial, más una escena creada por la IA y un anuncio más largo.' },
    credits: '{n} créditos',
    shots: '{n} escenas',
    aiPeople: 'Las imágenes con personas son ilustrativas (hechas por IA).',
    balance: 'Tienes {n} créditos.',
    balanceUnknown: 'No pudimos leer tu saldo de créditos ahora.',
    needMore: 'Te faltan {n} créditos para este.',
    getCredits: 'Comprar créditos (abre otra pestaña)',
  },
  plan: {
    missingTitle: 'Antes de planificar:',
    needFiles: 'Agrega al menos {min} foto ({min} a {max} en el anuncio).',
    needPhoto: 'Junto con los videos, agrega al menos 1 foto.',
    needText: 'Escribe en pocas palabras qué quieres vender o mostrar.',
    textTooLong: 'Acorta el texto (400 caracteres).',
    needTier: 'Elige el nivel.',
    waitLogo: 'Espera a que el logo termine de subir.',
    waitVideo: 'Espera los cuadros de tu video.',
    go: 'Descubrir y planificar (gratis)',
    again: 'Planificar de nuevo (gratis)',
    planning: 'Planificando…',
    noteUpload: 'Encuadrando y subiendo la foto {i} de {n}…',
    noteCard: 'Dibujando el cuadro final…',
    noteSave: 'Guardando tu anuncio…',
    noteResearch: 'Buscando datos públicos del lugar…',
    notePlan: 'Escribiendo el plan: escenas, narración y frases en pantalla…',
    factsTitle: 'Lo que encontramos en internet — revísalo',
    factsHint: 'Nada de esto entra en el anuncio sin tu marca. Marca solo lo que sea correcto sobre el edificio o la zona y planifica de nuevo.',
    source: 'fuente',
    factsNone: 'No encontramos datos públicos con fuente; seguimos solo con tu texto.',
    title: 'El plan de tu anuncio',
    lead: 'Este es el anuncio que vamos a hacer. Todavía no se cobró nada.',
    stale: 'Cambiaste algo después de planificar. Planifica de nuevo para ver el plan nuevo (es gratis).',
    shots: 'Escenas',
    newScene: 'Escena nueva',
    photo: 'Foto',
    lastFrame: 'Tu cuadro final',
    lastFrameDesc: 'Título, precio y contacto',
    words: 'Frases en pantalla',
    noWords: 'Sin frases en pantalla.',
    voice: 'Narración',
    noVoice: 'Sin narración: solo música.',
    total: 'Unos {s} segundos · vertical 9:16 · {c} créditos',
    make: 'Hacer mi anuncio · {c} créditos',
    starting: 'Empezando…',
    priceChanged: 'El precio de este plan cambió. Planifica de nuevo para ver el precio actual.',
    photoError: 'Foto {n}: {msg}',
    uploadFailed: 'No se pudo encuadrar y subir esta foto. Inténtalo de nuevo, o agrégala otra vez como JPG.',
    cardFailed: 'No pudimos dibujar el cuadro final. Inténtalo de nuevo.',
    logoFailed: 'El logo no se subió. Inténtalo de nuevo.',
  },
  progress: {
    title: 'Haciendo tu anuncio',
    assembling: 'Todas las escenas están listas. Ahora entran la música, la narración y el cuadro final.',
    animating: 'Tus fotos están tomando movimiento.',
    leave: 'Puedes salir de esta página: el anuncio se sigue haciendo y llega a',
    myVideos: 'Mis Videos',
    lost: 'Perdimos el contacto un momento. Seguimos revisando: tu anuncio se sigue haciendo de todos modos.',
    preparing: 'Preparando las escenas…',
    shot: 'Escena {n}',
    loading: 'Cargando tu anuncio…',
  },
  done: {
    title: 'Tu anuncio está listo',
    inMyVideos: 'Tu anuncio está en',
    download: 'Descargar el anuncio',
    downloading: 'Descargando…',
    downloadFailed: 'La descarga no empezó. Abre el anuncio en Mis Videos y descárgalo allí.',
    open: 'Abrir en Mis Videos',
    aiLabel: 'Activa la etiqueta de contenido hecho con IA al publicar. Partes de este anuncio se hicieron con IA a partir de tus fotos.',
    redoTitle: '¿No te gustó una escena?',
    redo: 'Rehacer una escena (modo completo)',
    another: 'Hacer otro anuncio',
  },
  failed: {
    title: 'Este anuncio no funcionó',
    redoTitle: 'No se pudo rehacer esta escena',
    cancelled: 'Esto no se inició',
    nothing: 'No se cobró nada.',
    back: 'Volver a mis fotos',
    backToAd: 'Volver a mi anuncio',
  },
  how: {
    title: 'Cómo funciona',
    steps: [
      'Envía tus fotos o un video y di qué quieres vender.',
      'Buscamos datos públicos, escribimos la narración y planificamos cada escena. Lo revisas todo gratis.',
      'Elige el nivel y haz el anuncio. Llega a Mis Videos.',
    ],
  },
  notReady: 'El creador de anuncios todavía no está activado de nuestro lado. No se cobrará nada.',
  labels: {
    'Still with zoom': 'Foto fija con zoom',
    Ready: 'Lista',
    'Trying again': 'Intentando de nuevo',
    'Did not work': 'No funcionó',
    'Preparing image': 'Preparando la imagen',
    Animating: 'Tomando movimiento',
    Hook: 'Apertura',
    Desire: 'Deseo',
    'In use': 'En uso',
    'The feeling': 'La sensación',
    'Your place': 'Tu lugar',
    'Your product': 'Tu producto',
    'Your photo as a still with a slow zoom, so every word stays exactly right': 'Tu foto fija con un zoom lento, para que cada palabra quede exacta',
    'A new scene of everyday people enjoying it, created from your photos': 'Una escena nueva con personas disfrutándolo, creada a partir de tus fotos',
    'A hero close-up of your product, from your photo': 'Un primer plano destacado de tu producto, a partir de tu foto',
    'Your photo, brought to life with one slow camera move': 'Tu foto con vida gracias a un movimiento lento de cámara',
    'Your video': 'Tu video',
    'Your own video, as you filmed it: a short part, muted, no AI': 'Tu propio video, tal como lo grabaste: una parte corta, sin sonido, sin IA',
    'We could not confirm the credits for this redo, so it was not made. If credits left your balance, they come back on their own. Your ad is still in My Videos, exactly as it was.': 'No pudimos confirmar los créditos de esta repetición, así que no se hizo. Si salieron créditos de tu saldo, vuelven solos. Tu anuncio sigue en Mis Videos, tal como estaba.',
    'We could not redo this shot. The credits for the redo go back to your balance automatically. Your ad is still in My Videos, exactly as it was.': 'No pudimos rehacer esta escena. Los créditos de la repetición vuelven solos a tu saldo. Tu anuncio sigue en Mis Videos, tal como estaba.',
    'We could not confirm the credits for this ad, so it was not made. If credits left your balance, they come back on their own.': 'No pudimos confirmar los créditos de este anuncio, así que no se hizo. Si salieron créditos de tu saldo, vuelven solos.',
    'This ad could not be finished because of our content rules. Its credits go back to your balance automatically.': 'Este anuncio no se pudo terminar por nuestras reglas de contenido. Sus créditos vuelven solos a tu saldo.',
    'We could not finish this ad. Its credits go back to your balance automatically. You can plan it again from your photos.': 'No pudimos terminar este anuncio. Sus créditos vuelven solos a tu saldo. Puedes planificarlo de nuevo con tus fotos.',
  },
}

/** Tabela no padrão pickInterfaceCopy: en obrigatório; pt e es revisados; o resto cai no inglês. */
export const ADS_V2_SIMPLE_COPY = { en: EN, pt: PT, es: ES } satisfies { en: AdsV2SimpleCopy; pt: AdsV2SimpleCopy; es: AdsV2SimpleCopy }

/** Rótulo em inglês (de lib/ads/v2Screen.ts) na língua da tela; sem tradução = o próprio inglês. */
export function simpleLabel(copy: AdsV2SimpleCopy, english: string): string {
  return copy.labels[english] ?? english
}

// ── erros das rotas em pt/es (inglês = adsV2ErrorMessage de lib/ads/v2Screen.ts) ─────────────────────────────────────
const ERR_PT: Record<string, string> = {
  network: 'Sem conexão. Confira sua internet e tente de novo.',
  unauthenticated: 'Sua sessão acabou. Entre de novo e volte a esta página.',
  no_access: 'O Studio Ads não está disponível na sua conta agora. Abra a página do Studio Ads para ver como liberar.',
  closed: 'O Studio Ads não está disponível na sua conta agora. Abra a página do Studio Ads para ver como liberar.',
  v2_closed: 'Este criador de anúncios ainda está em teste fechado e não está aberto para a sua conta.',
  not_ready: 'O criador de anúncios ainda não está ligado. Nada foi cobrado. Tente mais tarde.',
  unavailable: 'O planejamento está indisponível por um instante. Nada foi cobrado. Tente de novo em um minuto.',
  sentence_or_link_required: 'Escreva em poucas palavras o que você quer vender ou mostrar.',
  sentence_too_long: 'Seu texto está longo demais. Use menos de 400 caracteres.',
  bad_link: 'Esse link não parece certo. Cole o endereço completo, começando com https://',
  link_unreachable: 'Não conseguimos ler esse link. Escreva o que você quer vender em poucas palavras.',
  brief_needs_business: 'Não entendemos o que está sendo anunciado. Diga no texto o que é (por exemplo, "apartamento à venda no Edifício Aurora") e planeje de novo.',
  too_few_photos: 'Adicione pelo menos 1 foto.',
  too_many_photos: 'Use no máximo 7 fotos. Tire as mais fracas.',
  media_not_owned: 'Um dos arquivos não subiu direito. Tire, adicione de novo e planeje de novo.',
  bad_photo_id: 'Um dos arquivos não subiu direito. Tire, adicione de novo e planeje de novo.',
  logo_invalid: 'O logo não subiu direito. Tire ou troque o logo e planeje de novo.',
  card_invalid: 'O quadro final não subiu direito. Planeje de novo.',
  duplicate_photo: 'A mesma imagem está duas vezes. Cada foto precisa ser um arquivo diferente.',
  logo_is_photo: 'O logo também está entre as fotos. Use arquivos diferentes.',
  bad_sector: 'Não entendemos o tipo de anúncio. Escreva o texto de novo.',
  daily_limit: 'Você planejou muitos anúncios hoje. Volte amanhã, ou faça um dos planos que já tem.',
  daily_limit_research: 'Hoje já procuramos fatos para você várias vezes. Seguimos só com o seu texto.',
  no_copy: 'Não conseguimos escrever o anúncio sem inventar fatos. Acrescente um pouco mais de detalhe ao texto e planeje de novo.',
  plan_prompts_invalid: 'Não conseguimos escrever o anúncio sem inventar fatos. Acrescente um pouco mais de detalhe ao texto e planeje de novo.',
  moderation: 'Este anúncio não pode ser feito: o texto quebra nossas regras de conteúdo. Mude o texto e planeje de novo.',
  moderation_unavailable: 'Nossa checagem de segurança não conseguiu ler este texto agora. Nada foi cobrado. Tente de novo em um minuto.',
  moderation_unprocessable: 'Nossa checagem de segurança não conseguiu ler este texto. Nada foi cobrado. Escreva de outro jeito e tente de novo.',
  order_not_found: 'Não achamos este anúncio. Recomece para fazer um novo.',
  not_editable: 'Este plano já foi usado. Planeje de novo para fazer um anúncio novo.',
  not_startable: 'Este plano já foi usado. Planeje de novo para fazer um anúncio novo.',
  replan_needed: 'Este plano foi feito sem narração. Planeje de novo para ter uma.',
  plan_required: 'Planeje o anúncio primeiro.',
  card_required: 'Falta o quadro final. Planeje de novo.',
  out_of_credits: 'Este anúncio precisa de {needed} créditos e você tem {balance}. Compre créditos e volte: seu plano continua nesta página.',
  out_of_credits_plain: 'Você não tem créditos suficientes para isto. Compre créditos e volte: seu plano continua nesta página.',
  another_active: 'Outro anúncio seu ainda está sendo feito. Quando ele ficar pronto (chega em Meus Vídeos), você pode começar este.',
  intent_failed: 'Não conseguimos confirmar os créditos deste anúncio, então nada foi feito. Se saíram créditos do seu saldo, eles voltam sozinhos. Tente de novo em um minuto.',
  debit_unconfirmed: 'Não conseguimos confirmar os créditos deste anúncio, então nada foi feito. Se saíram créditos do seu saldo, eles voltam sozinhos. Tente de novo em um minuto.',
  debit_mismatch: 'Não conseguimos confirmar os créditos deste anúncio, então nada foi feito. Se saíram créditos do seu saldo, eles voltam sozinhos. Tente de novo em um minuto.',
  debit_refunded: 'Não conseguimos confirmar os créditos deste anúncio, então nada foi feito. Se saíram créditos do seu saldo, eles voltam sozinhos. Tente de novo em um minuto.',
  price_changed: 'O preço mudou. Planeje de novo para ver o preço atual.',
  text_not_retakable: 'Cenas de tela ou texto são fotos paradas, para cada palavra ficar exata. Não há o que refazer.',
  video_not_retakable: 'Esta cena é o seu próprio vídeo, como você gravou (sem IA): não há o que refazer. Para usar outro trecho, planeje de novo (grátis).',
  video_unreadable: 'Não conseguimos ler um dos seus vídeos do nosso lado; ele agora entra como fotos tiradas dele. Planeje de novo (grátis).',
  video_invalid: 'Não conseguimos ler um dos seus vídeos do nosso lado; ele agora entra como fotos tiradas dele. Planeje de novo (grátis).',
  video_too_short: 'Um dos seus vídeos tem menos de 3 segundos; ele agora entra como fotos tiradas dele. Planeje de novo (grátis).',
  video_too_long: 'Um dos seus vídeos passa de 10 minutos; use um trecho menor ou envie fotos. Planeje de novo (grátis).',
  too_many_videos: 'Até 2 vídeos entram como vídeo; os outros agora entram como fotos tiradas deles. Planeje de novo (grátis).',
  bad_video: 'Um dos seus vídeos não subiu direito. Tire, adicione de novo e planeje de novo.',
  bad_video_id: 'Um dos seus vídeos não subiu direito. Tire, adicione de novo e planeje de novo.',
  bad_videos: 'Um dos seus vídeos não subiu direito. Tire, adicione de novo e planeje de novo.',
  mode_mismatch: 'Este anúncio foi começado no outro modo. Recomece para fazer um novo.',
  bad_facts: 'Os fatos escolhidos não estão certos. Planeje de novo.',
  bad_fact: 'Os fatos escolhidos não estão certos. Planeje de novo.',
  research_running: 'Ainda estamos procurando os fatos. Tente de novo em alguns segundos.',
  research_needs_text: 'Escreva em poucas palavras o que você quer vender ou mostrar.',
  research_failed: 'Não achamos fatos públicos agora; seguimos só com o seu texto.',
  bad_price: 'O preço está longo demais. Use até 60 caracteres.',
  bad_contact: 'O contato está longo demais. Use até 80 caracteres.',
  default: 'Algo deu errado do nosso lado. Nada novo foi cobrado. Tente de novo.',
}
const ERR_ES: Record<string, string> = {
  network: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
  unauthenticated: 'Tu sesión terminó. Inicia sesión de nuevo y vuelve a esta página.',
  no_access: 'Studio Ads no está disponible en tu cuenta ahora. Abre la página de Studio Ads para ver cómo obtenerlo.',
  closed: 'Studio Ads no está disponible en tu cuenta ahora. Abre la página de Studio Ads para ver cómo obtenerlo.',
  v2_closed: 'Este creador de anuncios todavía está en prueba cerrada y no está abierto para tu cuenta.',
  not_ready: 'El creador de anuncios todavía no está activado. No se cobró nada. Inténtalo más tarde.',
  unavailable: 'La planificación no está disponible por un momento. No se cobró nada. Inténtalo de nuevo en un minuto.',
  sentence_or_link_required: 'Escribe en pocas palabras qué quieres vender o mostrar.',
  sentence_too_long: 'Tu texto es demasiado largo. Usa menos de 400 caracteres.',
  bad_link: 'Ese enlace no parece correcto. Pega la dirección completa, empezando con https://',
  link_unreachable: 'No pudimos leer ese enlace. Escribe en pocas palabras qué quieres vender.',
  brief_needs_business: 'No entendimos qué se anuncia. Dilo en el texto (por ejemplo, "departamento en venta en el Edificio Aurora") y planifica de nuevo.',
  too_few_photos: 'Agrega al menos 1 foto.',
  too_many_photos: 'Usa como máximo 7 fotos. Quita las más débiles.',
  media_not_owned: 'Uno de los archivos no se subió bien. Quítalo, agrégalo de nuevo y planifica otra vez.',
  bad_photo_id: 'Uno de los archivos no se subió bien. Quítalo, agrégalo de nuevo y planifica otra vez.',
  logo_invalid: 'El logo no se subió bien. Quita o cambia el logo y planifica de nuevo.',
  card_invalid: 'El cuadro final no se subió bien. Planifica de nuevo.',
  duplicate_photo: 'La misma imagen está dos veces. Cada foto debe ser un archivo distinto.',
  logo_is_photo: 'El logo también está entre las fotos. Usa archivos distintos.',
  bad_sector: 'No entendimos el tipo de anuncio. Escribe el texto de nuevo.',
  daily_limit: 'Planificaste muchos anuncios hoy. Vuelve mañana, o haz uno de los planes que ya tienes.',
  daily_limit_research: 'Hoy ya buscamos datos para ti varias veces. Seguimos solo con tu texto.',
  no_copy: 'No pudimos escribir el anuncio sin inventar datos. Agrega un poco más de detalle al texto y planifica de nuevo.',
  plan_prompts_invalid: 'No pudimos escribir el anuncio sin inventar datos. Agrega un poco más de detalle al texto y planifica de nuevo.',
  moderation: 'Este anuncio no se puede hacer: el texto rompe nuestras reglas de contenido. Cambia el texto y planifica de nuevo.',
  moderation_unavailable: 'Nuestra revisión de seguridad no pudo leer este texto ahora. No se cobró nada. Inténtalo de nuevo en un minuto.',
  moderation_unprocessable: 'Nuestra revisión de seguridad no pudo leer este texto. No se cobró nada. Escríbelo de otra forma e inténtalo de nuevo.',
  order_not_found: 'No encontramos este anuncio. Empieza de nuevo para hacer uno nuevo.',
  not_editable: 'Este plan ya se usó. Planifica de nuevo para hacer un anuncio nuevo.',
  not_startable: 'Este plan ya se usó. Planifica de nuevo para hacer un anuncio nuevo.',
  replan_needed: 'Este plan se hizo sin narración. Planifica de nuevo para tener una.',
  plan_required: 'Planifica el anuncio primero.',
  card_required: 'Falta el cuadro final. Planifica de nuevo.',
  out_of_credits: 'Este anuncio necesita {needed} créditos y tienes {balance}. Compra créditos y vuelve: tu plan sigue en esta página.',
  out_of_credits_plain: 'No tienes créditos suficientes para esto. Compra créditos y vuelve: tu plan sigue en esta página.',
  another_active: 'Otro anuncio tuyo todavía se está haciendo. Cuando esté listo (llega a Mis Videos), puedes empezar este.',
  intent_failed: 'No pudimos confirmar los créditos de este anuncio, así que no se hizo nada. Si salieron créditos de tu saldo, vuelven solos. Inténtalo de nuevo en un minuto.',
  debit_unconfirmed: 'No pudimos confirmar los créditos de este anuncio, así que no se hizo nada. Si salieron créditos de tu saldo, vuelven solos. Inténtalo de nuevo en un minuto.',
  debit_mismatch: 'No pudimos confirmar los créditos de este anuncio, así que no se hizo nada. Si salieron créditos de tu saldo, vuelven solos. Inténtalo de nuevo en un minuto.',
  debit_refunded: 'No pudimos confirmar los créditos de este anuncio, así que no se hizo nada. Si salieron créditos de tu saldo, vuelven solos. Inténtalo de nuevo en un minuto.',
  price_changed: 'El precio cambió. Planifica de nuevo para ver el precio actual.',
  text_not_retakable: 'Las escenas de pantalla o texto son fotos fijas, para que cada palabra quede exacta. No hay nada que rehacer.',
  video_not_retakable: 'Esta escena es tu propio video, tal como lo grabaste (sin IA): no hay nada que rehacer. Para usar otra parte, planifica de nuevo (gratis).',
  video_unreadable: 'No pudimos leer uno de tus videos de nuestro lado; ahora entra como fotos sacadas de él. Planifica de nuevo (gratis).',
  video_invalid: 'No pudimos leer uno de tus videos de nuestro lado; ahora entra como fotos sacadas de él. Planifica de nuevo (gratis).',
  video_too_short: 'Uno de tus videos dura menos de 3 segundos; ahora entra como fotos sacadas de él. Planifica de nuevo (gratis).',
  video_too_long: 'Uno de tus videos pasa de 10 minutos; usa un tramo más corto o envía fotos. Planifica de nuevo (gratis).',
  too_many_videos: 'Hasta 2 videos entran como video; los demás ahora entran como fotos sacadas de ellos. Planifica de nuevo (gratis).',
  bad_video: 'Uno de tus videos no se subió bien. Quítalo, agrégalo de nuevo y planifica otra vez.',
  bad_video_id: 'Uno de tus videos no se subió bien. Quítalo, agrégalo de nuevo y planifica otra vez.',
  bad_videos: 'Uno de tus videos no se subió bien. Quítalo, agrégalo de nuevo y planifica otra vez.',
  mode_mismatch: 'Este anuncio se empezó en el otro modo. Empieza de nuevo para hacer uno nuevo.',
  bad_facts: 'Los datos elegidos no son correctos. Planifica de nuevo.',
  bad_fact: 'Los datos elegidos no son correctos. Planifica de nuevo.',
  research_running: 'Todavía estamos buscando los datos. Inténtalo de nuevo en unos segundos.',
  research_needs_text: 'Escribe en pocas palabras qué quieres vender o mostrar.',
  research_failed: 'No encontramos datos públicos ahora; seguimos solo con tu texto.',
  bad_price: 'El precio es demasiado largo. Usa hasta 60 caracteres.',
  bad_contact: 'El contacto es demasiado largo. Usa hasta 80 caracteres.',
  default: 'Algo salió mal de nuestro lado. No se cobró nada nuevo. Inténtalo de nuevo.',
}
export const ADS_V2_SIMPLE_ERRORS: { pt: Record<string, string>; es: Record<string, string> } = { pt: ERR_PT, es: ERR_ES }

/**
 * Erro das rotas na língua da tela (pt/es). null = língua sem tabela (inglês e as outras): quem chama usa
 * adsV2ErrorMessage. Código desconhecido em pt/es = a frase genérica da própria língua (nunca código cru).
 */
export function simpleErrorMessage(code: string | null | undefined, lang: string, extra: { needed?: number; balance?: number } = {}): string | null {
  const table = lang === 'pt' ? ERR_PT : lang === 'es' ? ERR_ES : null
  if (!table) return null
  const c = String(code ?? '')
  if (c === 'out_of_credits') {
    return typeof extra.needed === 'number' && typeof extra.balance === 'number' ? fill(table.out_of_credits, { needed: extra.needed, balance: extra.balance }) : table.out_of_credits_plain
  }
  return table[c] ?? (c.startsWith('moderation_') ? table.moderation_unavailable : table.default)
}

// ── erros de envio (AdsUploadError, lib/ads/uploadFootage.ts) na língua da tela ─────────────────────────────────────
// Revisão da tela 29/09: a lib de envio só fala inglês e a tela simples mostrava e.message cru ("Foto 2: No connection…").
// Chave = o MOTIVO (e.reason), nunca o texto: a frase em inglês pode mudar sem quebrar a tradução.
const UPLOAD_PT: Record<string, string> = {
  unsupported_type: 'Use fotos JPG ou PNG, ou vídeos MP4, MOV ou WebM.',
  file_too_large: 'Cada arquivo precisa ter menos de 50 MB.',
  logo_must_be_image: 'O logo precisa ser uma imagem: PNG ou JPG.',
  convert_failed: 'Seu navegador não conseguiu abrir esta foto. Salve como JPG (no iPhone: Ajustes → Câmera → Formatos → Mais Compatível) e envie de novo.',
  unauthenticated: 'Entre de novo na sua conta para enviar os arquivos.',
  paid_feature: 'Enviar os seus próprios arquivos precisa do passe do Studio Ads ou de um plano pago.',
  quota: 'O seu espaço de arquivos está cheio. Apague algo para enviar mais.',
  upload_failed: 'O envio não terminou. Confira a internet e tente de novo.',
}
const UPLOAD_ES: Record<string, string> = {
  unsupported_type: 'Usa fotos JPG o PNG, o videos MP4, MOV o WebM.',
  file_too_large: 'Cada archivo debe pesar menos de 50 MB.',
  logo_must_be_image: 'El logo debe ser una imagen: PNG o JPG.',
  convert_failed: 'Tu navegador no pudo abrir esta foto. Guárdala como JPG (en iPhone: Ajustes → Cámara → Formatos → Más compatible) y súbela de nuevo.',
  unauthenticated: 'Inicia sesión de nuevo para subir tus archivos.',
  paid_feature: 'Subir tus propios archivos necesita el pase de Studio Ads o un plan de pago.',
  quota: 'Tu espacio de archivos está lleno. Borra algo para subir más.',
  upload_failed: 'La subida no terminó. Revisa tu conexión e inténtalo de nuevo.',
}
export const ADS_V2_SIMPLE_UPLOAD_ERRORS: { pt: Record<string, string>; es: Record<string, string> } = { pt: UPLOAD_PT, es: UPLOAD_ES }

/** Erro de envio na língua da tela (pt/es) pelo MOTIVO. null = inglês/outras (quem chama usa a frase da lib). Motivo
 *  desconhecido em pt/es = a frase genérica de envio da própria língua (nunca inglês). Pura. */
export function simpleUploadErrorMessage(reason: string | null | undefined, lang: string): string | null {
  const table = lang === 'pt' ? UPLOAD_PT : lang === 'es' ? UPLOAD_ES : null
  if (!table) return null
  return table[String(reason ?? '')] ?? table.upload_failed
}

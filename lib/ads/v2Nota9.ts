// KINEO-ADS-NOTA9-2110 — o Studio Ads com a experiência do filme: 1 escolha visual + 1 frase + Gerar (fundador 21/10: "3 ajustes…
// KINEO-ADS-NOTA9-2110 — experiência do cliente no mínimo em 9"). Medido como cliente em produção na noite de 20/10: AI Product Ads = 6,5
// KINEO-ADS-NOTA9-2110 — (~12 blocos antes de gerar) e AI UGC Ads = 6 (abria a MESMA tela do produto; a pessoa escondida no meio).
//
// O QUE ESTE MÓDULO DECIDE (puro — só `import type`; o guardião scripts/test-ads-nota9-2110.mjs carrega o arquivo cru):
//   · o modo FOCO: só quem chega pelos cards da home (?entry=ugc | ?entry=product, validado no page.tsx). Sem entrada = a tela de sempre;
//   · os rostos da escolha "Quem apresenta": a lista APROVADA para clientes (lib/ads/v2PresenterV2.ts ADS_V2_PRESENTER_V2_APPROVED), na ordem
//     dela — passada pelo chamador, nunca copiada aqui;
//   · a LINHA ÚNICA de custo em cima do Gerar, com os números que a tela já tem (o `shownCost` de adsV2Credits/variações — o mesmo que o
//     /start debita — e o saldo lido do servidor). Nada de preço digitado aqui; nada aqui chama rota ou cobra.
//   · as frases da tela foco (en/pt/es; as outras línguas caem no inglês, como pickInterfaceCopy).
// O servidor (preço, teto da amostra, moderação, regra do apresentador, Kit BF) não muda em nada: a tela foco só RECOMPÕE o que já existia.
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

export const MARCA_ADS_NOTA9 = 'KINEO-ADS-NOTA9-2110'

export type AdsNota9Focus = 'ugc' | 'product'

/** O modo foco: só pela entrada dos cards da home. Qualquer outra coisa (null, inválido) = a tela de sempre. Puro. */
export function adsNota9Focus(entry: unknown): AdsNota9Focus | null {
  return entry === 'ugc' || entry === 'product' ? entry : null
}

/** O número do passo na tela foco: no UGC o 1º passo é "Quem apresenta", então o produto vira o 2º e a frase o 3º. Puro. */
export function adsNota9Step(focus: AdsNota9Focus | null, step: 'who' | 'product' | 'text'): number {
  const ugc = focus === 'ugc'
  return step === 'who' ? 1 : step === 'product' ? (ugc ? 2 : 1) : ugc ? 3 : 2
}

/** Os rostos da escolha: os ids aprovados, na ordem da lista aprovada, só os que existem na biblioteca e têm retrato. Puro. */
export function adsNota9Faces<T extends { id: string; portrait: string | null }>(library: readonly T[], approved: readonly string[]): T[] {
  const out: T[] = []
  for (const id of approved) {
    const p = library.find((x) => x.id === id)
    if (p && p.portrait) out.push(p)
  }
  return out
}

/** Milhar na língua da tela, sem Intl (o servidor e o navegador desenham o MESMO texto: nada de divergência na hidratação). Puro. */
export function adsNota9Num(n: number, lang: string | null | undefined): string {
  const v = Math.round(Number.isFinite(n) ? n : 0)
  const sep = lang === 'en' || lang === 'hi' || lang === 'ur' || lang === 'ar' || !lang ? ',' : lang === 'fr' || lang === 'ru' || lang === 'uk' || lang === 'pl' ? ' ' : '.'
  const s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, sep)
  return v < 0 ? `-${s}` : s
}

export interface AdsNota9Copy {
  titleUgc: string
  subUgc: string
  titleProduct: string
  subProduct: string
  who: string
  whoHint: string
  surprise: string
  surpriseLine: string
  ai: string
  photoUgc: string
  photoProduct: string
  sayUgc: string
  sayProduct: string
  optional: string
  placeholderUgc: string
  costFree: string
  cost: string
  costMany: string
  costUnknown: string
  short: string
  plans: string
  chooseLevel: string
  generate: string
  writing: string
  writeNow: string
  seeScript: string
  advanced: string
  advancedHint: string
  moreWays: string
  holds: string
  eyebrowUgc: string
  eyebrowProduct: string
  productDesc: string
  productEmpty: string
  delivery: string
  counter: string
  tooLong: string
  tiny: string
  tinyOk: string
  tinyDone: string
}

const EN: AdsNota9Copy = {
  titleUgc: 'AI UGC Ads',
  subUgc: 'Pick an AI person, add your product, and we make a 15-second video of them holding it and talking about it.',
  titleProduct: 'AI Product Ads',
  subProduct: 'Add your product photo or link. We make a 15-second ad with your real product.',
  who: 'Pick who presents your product',
  whoHint: 'AI presenters, not real people or customers.',
  surprise: 'Surprise me',
  surpriseLine: 'We pick the best match',
  ai: 'AI',
  photoUgc: 'Add your product photo (or link)',
  photoProduct: 'Add your product photo or link',
  sayUgc: 'What should they say?',
  sayProduct: 'What are you selling?',
  optional: 'optional with a link · we write the script',
  placeholderUgc: 'e.g. This serum made my skin glow in a week',
  costFree: 'Your first ad is free (watermark)',
  cost: '{s}-second ad · {c} credits · you have {n} → {left} left',
  costMany: '{k} ads · {c} credits · you have {n} → {left} left',
  costUnknown: '{s}-second ad · {c} credits',
  short: 'You need {c} credits, you have {n}',
  plans: 'See plans',
  chooseLevel: 'Choose a level in Advanced',
  generate: 'Generate ad',
  writing: 'Writing your script… (free)',
  writeNow: 'Write my script (free)',
  seeScript: 'See or edit the script',
  advanced: 'Advanced',
  advancedHint: 'brand kit, scene, offer, variations, level, voice, script',
  moreWays: 'More ways to make ads:',
  holds: 'holds your product and talks about it',
  eyebrowUgc: 'Your presenter',
  eyebrowProduct: 'Real product close-up',
  productDesc: 'Only your real photos, with camera moves. Your product is never redrawn by AI.',
  productEmpty: 'Your product photo shows up here',
  delivery: 'Ready in about 5–8 minutes',
  counter: '{n} / {max}',
  tooLong: 'Too long: keep it under {max} characters (now {n}). Nothing was cut.',
  tiny: 'This photo is small ({w}×{h} px). Use a sharper photo, at least 500 px, for a much better ad.',
  tinyOk: 'Use this photo anyway',
  tinyDone: 'Using this photo',
}

const PT: AdsNota9Copy = {
  titleUgc: 'Anúncios UGC com IA',
  subUgc: 'Escolha uma pessoa de IA, envie o seu produto e fazemos um vídeo de 15 segundos dela segurando e falando dele.',
  titleProduct: 'Anúncios de produto com IA',
  subProduct: 'Envie a foto ou o link do produto. Fazemos um anúncio de 15 segundos com o seu produto de verdade.',
  who: 'Escolha quem apresenta o seu produto',
  whoHint: 'Apresentadores de IA, não são pessoas reais nem clientes.',
  surprise: 'Me surpreenda',
  surpriseLine: 'Escolhemos o melhor',
  ai: 'IA',
  photoUgc: 'Envie a foto do produto (ou o link)',
  photoProduct: 'Envie a foto ou o link do produto',
  sayUgc: 'O que a pessoa deve dizer?',
  sayProduct: 'O que você está vendendo?',
  optional: 'opcional com link · nós escrevemos o roteiro',
  placeholderUgc: 'ex.: Este sérum deixou minha pele radiante em uma semana',
  costFree: 'Seu primeiro anúncio é grátis (com marca-d’água)',
  cost: 'Anúncio de {s} segundos · {c} créditos · você tem {n} → sobram {left}',
  costMany: '{k} anúncios · {c} créditos · você tem {n} → sobram {left}',
  costUnknown: 'Anúncio de {s} segundos · {c} créditos',
  short: 'Você precisa de {c} créditos e tem {n}',
  plans: 'Ver planos',
  chooseLevel: 'Escolha um nível em Avançado',
  generate: 'Gerar anúncio',
  writing: 'Escrevendo o roteiro… (grátis)',
  writeNow: 'Escrever o roteiro (grátis)',
  seeScript: 'Ver ou editar o roteiro',
  advanced: 'Avançado',
  advancedHint: 'kit da marca, cena, oferta, variações, nível, voz, roteiro',
  moreWays: 'Outros jeitos de fazer anúncios:',
  holds: 'segura o seu produto e fala dele',
  eyebrowUgc: 'Seu apresentador',
  eyebrowProduct: 'Close do produto real',
  productDesc: 'Só as suas fotos reais, com movimento de câmera. A IA nunca redesenha o seu produto.',
  productEmpty: 'A foto do seu produto aparece aqui',
  delivery: 'Pronto em cerca de 5–8 minutos',
  counter: '{n} / {max}',
  tooLong: 'Texto longo demais: até {max} caracteres (agora {n}). Nada foi cortado.',
  tiny: 'Esta foto é pequena ({w}×{h} px). Use uma foto mais nítida, com pelo menos 500 px, para um anúncio bem melhor.',
  tinyOk: 'Usar esta foto mesmo assim',
  tinyDone: 'Usando esta foto',
}

const ES: AdsNota9Copy = {
  titleUgc: 'Anuncios UGC con IA',
  subUgc: 'Elige una persona de IA, sube tu producto y hacemos un video de 15 segundos de ella sosteniéndolo y hablando de él.',
  titleProduct: 'Anuncios de producto con IA',
  subProduct: 'Sube la foto o el enlace de tu producto. Hacemos un anuncio de 15 segundos con tu producto real.',
  who: 'Elige quién presenta tu producto',
  whoHint: 'Presentadores de IA, no son personas reales ni clientes.',
  surprise: 'Sorpréndeme',
  surpriseLine: 'Elegimos el mejor',
  ai: 'IA',
  photoUgc: 'Sube la foto del producto (o el enlace)',
  photoProduct: 'Sube la foto o el enlace del producto',
  sayUgc: '¿Qué debe decir?',
  sayProduct: '¿Qué vendes?',
  optional: 'opcional con enlace · nosotros escribimos el guion',
  placeholderUgc: 'ej.: Este sérum dejó mi piel radiante en una semana',
  costFree: 'Tu primer anuncio es gratis (con marca de agua)',
  cost: 'Anuncio de {s} segundos · {c} créditos · tienes {n} → te quedan {left}',
  costMany: '{k} anuncios · {c} créditos · tienes {n} → te quedan {left}',
  costUnknown: 'Anuncio de {s} segundos · {c} créditos',
  short: 'Necesitas {c} créditos y tienes {n}',
  plans: 'Ver planes',
  chooseLevel: 'Elige un nivel en Avanzado',
  generate: 'Generar anuncio',
  writing: 'Escribiendo el guion… (gratis)',
  writeNow: 'Escribir el guion (gratis)',
  seeScript: 'Ver o editar el guion',
  advanced: 'Avanzado',
  advancedHint: 'kit de marca, escena, oferta, variaciones, nivel, voz, guion',
  moreWays: 'Otras formas de hacer anuncios:',
  holds: 'sostiene tu producto y habla de él',
  eyebrowUgc: 'Tu presentador',
  eyebrowProduct: 'Primer plano del producto real',
  productDesc: 'Solo tus fotos reales, con movimientos de cámara. La IA nunca redibuja tu producto.',
  productEmpty: 'La foto de tu producto aparece aquí',
  delivery: 'Listo en unos 5–8 minutos',
  counter: '{n} / {max}',
  tooLong: 'Texto demasiado largo: hasta {max} caracteres (ahora {n}). No cortamos nada.',
  tiny: 'Esta foto es pequeña ({w}×{h} px). Usa una foto más nítida, de al menos 500 px, para un anuncio mucho mejor.',
  tinyOk: 'Usar esta foto de todos modos',
  tinyDone: 'Usando esta foto',
}

export const ADS_NOTA9_COPY: { en: AdsNota9Copy } & Partial<Record<InterfaceLanguage, AdsNota9Copy>> = { en: EN, pt: PT, es: ES }

/** As frases da tela foco na língua da interface (sem a língua = inglês). Puro. */
export function adsNota9Copy(lang: InterfaceLanguage | string | null | undefined): AdsNota9Copy {
  return (lang && Object.prototype.hasOwnProperty.call(ADS_NOTA9_COPY, lang) ? ADS_NOTA9_COPY[lang as InterfaceLanguage] : null) ?? EN
}

export const adsNota9Fill = (t: string, v: Record<string, string | number>): string => t.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m))

/** Foto pequena demais (lado menor abaixo disto, ex.: miniatura do Google 225×225): a tela avisa e pede confirmação antes de gerar. */
export const ADS_NOTA9_TINY_MIN_SIDE = 500

/** A 1ª FOTO do anúncio (vídeo não conta) com o lado menor abaixo do mínimo, ou null. Dimensão desconhecida (0) não acusa. Puro. */
export function adsNota9TinyPhoto<T extends { key: string; w: number; h: number; video?: unknown }>(items: readonly T[], min: number = ADS_NOTA9_TINY_MIN_SIDE): T | null {
  for (const p of items) { if (p.video) continue; const s = Math.min(Number(p.w) || 0, Number(p.h) || 0); if (s > 0 && s < min) return p }
  return null
}

export type AdsNota9CostKind = 'free' | 'pay' | 'unknown' | 'short' | 'none'
export interface AdsNota9Cost {
  kind: AdsNota9CostKind
  text: string
  /** Faltam créditos: o único botão de planos aparece. */
  plans: boolean
}

/**
 * A LINHA ÚNICA de custo em cima do Gerar. Entradas = o que a tela já tem: `credits` = o `shownCost` (adsV2Credits do nível × variações
 * do kit, ou o preço do grupo das 3 — o mesmo número do botão e do /start), `balance` = o saldo do servidor (null = não sei, nunca 0),
 * `sample` = a amostra grátis (o servidor decide; a tela só diz). Puro.
 */
export function adsNota9Cost(i: { copy: AdsNota9Copy; lang: string; seconds: number; credits: number | null; balance: number | null; sample: boolean; count?: number }): AdsNota9Cost {
  const { copy, lang } = i
  if (i.sample) return { kind: 'free', text: copy.costFree, plans: false }
  if (i.credits === null || !Number.isFinite(i.credits)) return { kind: 'none', text: copy.chooseLevel, plans: false }
  const c = adsNota9Num(i.credits, lang)
  if (i.balance === null || !Number.isFinite(i.balance)) return { kind: 'unknown', text: adsNota9Fill(copy.costUnknown, { s: i.seconds, c }), plans: false }
  const n = adsNota9Num(i.balance, lang)
  if (i.balance < i.credits) return { kind: 'short', text: adsNota9Fill(copy.short, { c, n }), plans: true }
  const left = adsNota9Num(i.balance - i.credits, lang)
  const k = typeof i.count === 'number' && i.count > 1 ? i.count : 1
  return { kind: 'pay', text: adsNota9Fill(k > 1 ? copy.costMany : copy.cost, { s: i.seconds, c, n, left, k }), plans: false }
}

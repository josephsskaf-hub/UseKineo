// KINEO-VERSAO-60S-2026-10-13 — "Faça a versão de 60 s deste filme" (AÇÃO 1 de vendas, fundador 13/10: "tudo sim").
//
// POR QUÊ (medido, 30 d): 592 cadastros; 245 contas grátis fizeram o filme grátis (15 s, Seedance 1.5, marca d'água) e
// não pagaram. Só 2 pessoas viram uma oferta no momento de querer mais (modal trial_stalled) e 1 comprou na hora
// (12/10: pediu 35 s, o teste só cobria 15 s, viu o Creator com 20%, pagou US$ 15,92 em 10 min). A isca é o FILME PRONTO
// da própria pessoa: logo abaixo dele, a versão de 60 s do MESMO tema, pelo Creator mensal.
//
// O QUE ESTE MÓDULO DECIDE (puro, sem rede; entra no cliente, na rota do e-mail e no guardião):
//   · quem vê o bloco: conta que NÃO paga (has_paid=false e plano lido que não é assinatura) e cujo filme entregue é o
//     curto do Seedance 1.5 (alvo < MIN_DURATION_ALL_ENGINES). Plano não lido = não mostra (falha fechada).
//   · o link: o MESMO checkout do Creator mensal das páginas que vendem, SEM ?promo= — o servidor aplica o WELCOME20
//     sozinho (welcome20AutoSkipReason) com o mesmo interruptor que liga o preço mostrado aqui (buyCreatorPrice).
//   · o preço e a contagem de filmes: de buyCreatorOffer (TIER_PRICES/TIER_CREDITS/creditCostForDuration). Nada digitado.
//   · a volta: um bilhete na sessionStorage (mesma aba, mesma origem) com o texto do filme. A /checkout/success manda
//     para /studio?film60=1&engine=seedance&duration=60&script_mode=ai, e o Studio PREENCHE a caixa com o texto e PARA.
//     O texto nunca viaja na URL. NADA é gerado sozinho: zero custo de fal até a pessoa apertar Create já assinante.
//     "Let AI structure" (script_mode=ai) faz o roteiro de ~47 palavras crescer para ~180 pelo caminho normal.
import { MIN_DURATION_ALL_ENGINES } from '@/lib/durationByEngine'
import { BUY_CREATOR_FILM_SECONDS, buyCreatorPrice, creatorSeedanceFilms } from '@/lib/growth/buyCreatorOffer'
import { WELCOME20_SITE_OFFER_LIVE } from '@/lib/growth/publicPromoTruth'
import { filmReadyPlanState } from '@/lib/growth/filmReadyExits'

// A parte leve (nomes, links, bilhete) mora em filmReady60sHandoff.ts e é reexportada daqui.
export * from '@/lib/growth/filmReady60sHandoff'
import { FILM60_CAMPAIGN, FILM60_EMAIL_CAMPAIGN, FILM60_VERSION, type Film60Surface } from '@/lib/growth/filmReady60sHandoff'

function normalizedPlan(plan: unknown): string {
  return typeof plan === 'string' ? plan.trim().toLowerCase() : ''
}

/** O filme entregue é o curto do Seedance 1.5 (15 s; o arquivo sai com 15-17 s)? Motor 'seedance' OU quality 'cinematic_ai'. */
export function isFreeShortSeedanceFilm(input: { engine?: unknown; quality?: unknown; seconds: unknown }): boolean {
  const seedance = input.engine === 'seedance' || input.quality === 'cinematic_ai'
  const s = typeof input.seconds === 'number' && Number.isFinite(input.seconds) ? input.seconds : NaN
  return seedance && s > 0 && s < MIN_DURATION_ALL_ENGINES
}

/** Conta que não paga: has_paid=false (explícito) e plano LIDO que não é assinatura. Nulo/indefinido = não (falha fechada). */
export function isNonPayingAccount(input: { plan: unknown; hasPaid: unknown }): boolean {
  if (input.hasPaid !== false) return false
  if (!normalizedPlan(input.plan)) return false
  return filmReadyPlanState(input.plan) === 'not_subscriber'
}

/** A decisão inteira do bloco: não pagante + filme curto do Seedance entregue. */
export function film60UpsellEligible(input: {
  plan: unknown
  hasPaid: unknown
  engine?: unknown
  quality?: unknown
  seconds: unknown
  delivered: boolean
}): boolean {
  if (!input.delivered) return false
  if (!isNonPayingAccount({ plan: input.plan, hasPaid: input.hasPaid })) return false
  return isFreeShortSeedanceFilm({ engine: input.engine, quality: input.quality, seconds: input.seconds })
}

// ── A copy (16 línguas da interface; inglês é o padrão de qualquer língua desconhecida) ─────────────────────────────
export interface Film60Copy {
  title: string
  subtitle: string
  button: string
}

type Film60Template = {
  title: string
  /** {first} {full} {pct} {films} {s} */
  offer: string
  /** {full} {films} {s} — interruptor do WELCOME20 desligado: só o preço cheio. */
  plain: string
  button: string
}

const COPY: Record<string, Film60Template> = {
  en: {
    title: 'Make the {s}-second version of this film',
    offer: 'Same topic, full story, no watermark · Creator {first} first month ({pct}% off), then {full} · {films} films of {s} s a month',
    plain: 'Same topic, full story, no watermark · Creator {full}/month · {films} films of {s} s a month',
    button: 'Get the {s}-second version →',
  },
  pt: {
    title: 'Faça a versão de {s} segundos deste filme',
    offer: 'Mesmo tema, história completa, sem marca d’água · Creator {first} no 1º mês ({pct}% off), depois {full} · {films} filmes de {s} s por mês',
    plain: 'Mesmo tema, história completa, sem marca d’água · Creator {full}/mês · {films} filmes de {s} s por mês',
    button: 'Quero a versão de {s} s →',
  },
  es: {
    title: 'Haz la versión de {s} segundos de esta película',
    offer: 'Mismo tema, historia completa, sin marca de agua · Creator {first} el primer mes ({pct}% de descuento), luego {full} · {films} películas de {s} s al mes',
    plain: 'Mismo tema, historia completa, sin marca de agua · Creator {full}/mes · {films} películas de {s} s al mes',
    button: 'Quiero la versión de {s} s →',
  },
  fr: {
    title: 'Faites la version de {s} secondes de ce film',
    offer: 'Même sujet, histoire complète, sans filigrane · Creator {first} le 1er mois (-{pct} %), puis {full} · {films} films de {s} s par mois',
    plain: 'Même sujet, histoire complète, sans filigrane · Creator {full}/mois · {films} films de {s} s par mois',
    button: 'Obtenir la version de {s} s →',
  },
  de: {
    title: 'Mach die {s}-Sekunden-Version dieses Films',
    offer: 'Gleiches Thema, ganze Geschichte, ohne Wasserzeichen · Creator {first} im 1. Monat ({pct} % Rabatt), danach {full} · {films} Filme à {s} s pro Monat',
    plain: 'Gleiches Thema, ganze Geschichte, ohne Wasserzeichen · Creator {full}/Monat · {films} Filme à {s} s pro Monat',
    button: '{s}-Sekunden-Version holen →',
  },
  it: {
    title: 'Crea la versione da {s} secondi di questo film',
    offer: 'Stesso tema, storia completa, senza filigrana · Creator {first} il 1° mese ({pct}% di sconto), poi {full} · {films} film da {s} s al mese',
    plain: 'Stesso tema, storia completa, senza filigrana · Creator {full}/mese · {films} film da {s} s al mese',
    button: 'Voglio la versione da {s} s →',
  },
  nl: {
    title: 'Maak de versie van {s} seconden van deze film',
    offer: 'Zelfde onderwerp, volledig verhaal, zonder watermerk · Creator {first} de 1e maand ({pct}% korting), daarna {full} · {films} films van {s} s per maand',
    plain: 'Zelfde onderwerp, volledig verhaal, zonder watermerk · Creator {full}/maand · {films} films van {s} s per maand',
    button: 'Ik wil de versie van {s} s →',
  },
  pl: {
    title: 'Zrób {s}-sekundową wersję tego filmu',
    offer: 'Ten sam temat, pełna historia, bez znaku wodnego · Creator {first} w 1. miesiącu ({pct}% taniej), potem {full} · {films} filmy po {s} s miesięcznie',
    plain: 'Ten sam temat, pełna historia, bez znaku wodnego · Creator {full}/mies. · {films} filmy po {s} s miesięcznie',
    button: 'Chcę wersję {s} s →',
  },
  tr: {
    title: 'Bu filmin {s} saniyelik versiyonunu yap',
    offer: 'Aynı konu, tam hikâye, filigransız · Creator ilk ay {first} (%{pct} indirim), sonra {full} · ayda {films} adet {s} sn film',
    plain: 'Aynı konu, tam hikâye, filigransız · Creator {full}/ay · ayda {films} adet {s} sn film',
    button: '{s} sn versiyonu al →',
  },
  ru: {
    title: 'Сделайте {s}-секундную версию этого фильма',
    offer: 'Та же тема, полная история, без водяного знака · Creator {first} в первый месяц (скидка {pct}%), затем {full} · {films} фильма по {s} с в месяц',
    plain: 'Та же тема, полная история, без водяного знака · Creator {full}/мес. · {films} фильма по {s} с в месяц',
    button: 'Получить версию на {s} с →',
  },
  uk: {
    title: 'Зробіть {s}-секундну версію цього фільму',
    offer: 'Та сама тема, повна історія, без водяного знака · Creator {first} у перший місяць (знижка {pct}%), далі {full} · {films} фільми по {s} с на місяць',
    plain: 'Та сама тема, повна історія, без водяного знака · Creator {full}/міс. · {films} фільми по {s} с на місяць',
    button: 'Отримати версію на {s} с →',
  },
  ar: {
    title: 'اصنع نسخة مدتها {s} ثانية من هذا الفيلم',
    offer: 'نفس الموضوع، القصة كاملة، بدون علامة مائية · Creator بسعر {first} في الشهر الأول (خصم {pct}%)، ثم {full} · {films} أفلام مدة كل منها {s} ثانية شهريًا',
    plain: 'نفس الموضوع، القصة كاملة، بدون علامة مائية · Creator بسعر {full} شهريًا · {films} أفلام مدة كل منها {s} ثانية شهريًا',
    button: 'احصل على نسخة {s} ثانية ←',
  },
  ur: {
    title: 'اس فلم کا {s} سیکنڈ والا ورژن بنائیں',
    offer: 'وہی موضوع، پوری کہانی، واٹر مارک کے بغیر · Creator پہلے مہینے {first} ({pct}% رعایت)، پھر {full} · ہر مہینے {s} سیکنڈ کی {films} فلمیں',
    plain: 'وہی موضوع، پوری کہانی، واٹر مارک کے بغیر · Creator {full} ماہانہ · ہر مہینے {s} سیکنڈ کی {films} فلمیں',
    button: '{s} سیکنڈ والا ورژن حاصل کریں ←',
  },
  hi: {
    title: 'इस फ़िल्म का {s} सेकंड वाला वर्ज़न बनाएँ',
    offer: 'वही विषय, पूरी कहानी, बिना वॉटरमार्क · Creator पहले महीने {first} ({pct}% छूट), फिर {full} · हर महीने {s} सेकंड की {films} फ़िल्में',
    plain: 'वही विषय, पूरी कहानी, बिना वॉटरमार्क · Creator {full}/महीना · हर महीने {s} सेकंड की {films} फ़िल्में',
    button: '{s} सेकंड वाला वर्ज़न पाएँ →',
  },
  id: {
    title: 'Buat versi {s} detik dari film ini',
    offer: 'Topik sama, cerita lengkap, tanpa watermark · Creator {first} bulan pertama (diskon {pct}%), lalu {full} · {films} film {s} detik per bulan',
    plain: 'Topik sama, cerita lengkap, tanpa watermark · Creator {full}/bulan · {films} film {s} detik per bulan',
    button: 'Dapatkan versi {s} detik →',
  },
  vi: {
    title: 'Làm phiên bản {s} giây của phim này',
    offer: 'Cùng chủ đề, trọn câu chuyện, không watermark · Creator {first} tháng đầu (giảm {pct}%), sau đó {full} · {films} phim {s} giây mỗi tháng',
    plain: 'Cùng chủ đề, trọn câu chuyện, không watermark · Creator {full}/tháng · {films} phim {s} giây mỗi tháng',
    button: 'Lấy phiên bản {s} giây →',
  },
}

export const FILM60_LANGUAGES = Object.keys(COPY)

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}

/** As frases do bloco, montadas da fonte única (buyCreatorPrice + creatorSeedanceFilms). Língua desconhecida = inglês. */
export function film60Copy(language: unknown = 'en', live: boolean = WELCOME20_SITE_OFFER_LIVE): Film60Copy {
  const key = typeof language === 'string' && COPY[language] ? language : 'en'
  const t = COPY[key]
  const price = buyCreatorPrice(live)
  const vars = {
    s: BUY_CREATOR_FILM_SECONDS,
    films: creatorSeedanceFilms(),
    full: price.full,
    first: price.firstMonth ?? price.full,
    pct: price.percentOff ?? 0,
  }
  return {
    title: fill(t.title, vars),
    subtitle: fill(price.firstMonth ? t.offer : t.plain, vars),
    button: fill(t.button, vars),
  }
}

export function film60ShownMetadata(input: { videoId: unknown; plan: unknown; surface: Film60Surface; seconds: unknown }) {
  const price = buyCreatorPrice()
  return {
    version: FILM60_VERSION,
    surface: input.surface,
    video_id: typeof input.videoId === 'string' && input.videoId ? input.videoId.slice(0, 64) : null,
    plan: normalizedPlan(input.plan) || null,
    film_seconds: typeof input.seconds === 'number' && Number.isFinite(input.seconds) ? input.seconds : null,
    first_month: price.firstMonth,
    full_price: price.full,
    films: creatorSeedanceFilms(),
    intent_campaign: input.surface === 'email' ? FILM60_EMAIL_CAMPAIGN : FILM60_CAMPAIGN,
  }
}

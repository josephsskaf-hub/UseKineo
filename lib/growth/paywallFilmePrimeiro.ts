// KINEO-PAYWALL-FILME-PRIMEIRO-1510 — a caixa de planos abre com o FILME DA PRÓPRIA PESSOA na frente, quando ela ainda não
// viu nenhum. Fundador 15/10: "foco total em MRR" (consertos de conversão aprovados; preço e planos intocados).
//
// O DADO (7 d, contas internas fora): 33 pessoas abriram a caixa de planos (`upgrade_modal_opened`, /studio/create,
// offer_version mrr0610_v1, offer_id 'menu'). 14 estavam no TESTE ATIVO com 10 cr e média de 0,4 filme pronto — 1 foi ao
// checkout. 8 eram testes encerrados — 0 foram ao checkout. Elas tentam comprar ANTES de ver o próprio filme, e a regra da
// casa é "o primeiro vídeo é o produto": quem paga é quem fez o próprio filme primeiro.
//
// O QUE MUDA (só tela; nenhum preço, plano, checkout, Stripe ou crédito muda):
//   · conta que NÃO paga, com 0 filmes entregues e um filme grátis que o servidor ENTREGA agora (o saldo do teste paga o
//     Seedance de 15 s, o Kineo 1 incluído, ou o filme grátis de região) → um cartão grande no TOPO: "Faça primeiro o seu
//     filme grátis — 15 s, por nossa conta", com a última ideia digitada; um clique fecha a caixa e deixa o Studio no
//     motor e na duração do filme grátis (não gera nada sozinho). Os planos continuam inteiros logo abaixo — ACRÉSCIMO,
//     nunca portão ("nunca esconder o botão de comprar": país rico compra com 0 filmes).
//   · conta 'region_paid_only' (sem teste) com 0 filmes e SEM o filme grátis → o passe de um filme (US$ 4,99 na moeda
//     local, components/RegionPassOffer.tsx) sobe para o topo.
//   · conta com ≥ 1 filme, ou que paga → a caixa de hoje, sem mudança nenhuma.
// A cota semanal de quem saiu do teste (lib/freeWeeklyFilm.ts) NÃO entra: ela depende do país do pedido e de um país
// fixado no servidor, e a E4 decidiu não anunciá-la em texto público. Prometer filme que o servidor recusa = caso Rick.
//
// MÓDULO PURO, SEM IMPORT (só tipo): o guardião scripts/test-paywall-filme-primeiro-1510.mjs o executa com o transpilador.
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

export const PAYWALL_FILME_PRIMEIRO_VERSION = 'paywall_filme_primeiro_v1' as const
/** Impressão do cartão do filme grátis (uma vez por abertura da caixa). */
export const FREE_FILM_OFFERED_EVENT = 'upgrade_modal_free_film_offered' as const
/** Clique no cartão do filme grátis (antes de fechar a caixa). */
export const FREE_FILM_CLICKED_EVENT = 'upgrade_modal_free_film_clicked' as const
/** Impressão do passe de região no topo (conta 'region_paid_only' sem filme e sem filme grátis). */
export const PASS_FIRST_OFFERED_EVENT = 'upgrade_modal_pass_first_offered' as const

/** De onde vem o filme grátis: o saldo do teste (Seedance 15 s ou Kineo 1), o Kineo 1 grátis, ou o filme de região. */
export type FilmeGratisVariante = 'trial_seedance15' | 'trial_kineo1' | 'free' | 'region_free_film'
export type FilmePrimeiroLead = 'free_film' | 'region_pass' | null

/**
 * Quem a caixa recebe com o filme na frente. Falha FECHADA: `filmsDelivered` null (não sei) ou conta que paga/pode pagar
 * = null = a caixa de hoje.
 *   freeFilm       — o pai já provou que o servidor entrega um filme grátis agora (trialSeedance15/trialKineo1/firstFilmFree).
 *   regionFreeFilm — conta de região com o filme grátis dela (regionFreeFilmAvailable).
 *   regionPaidOnly — conta de região sem pagar (paidOnlyEntry). null = ainda lendo.
 */
export function decidirFilmePrimeiro(f: {
  filmsDelivered: number | null | undefined
  isSubscriber: boolean
  notPaidProven: boolean
  freeFilm: boolean
  regionFreeFilm: boolean
  regionPaidOnly: boolean | null
}): FilmePrimeiroLead {
  if (f.isSubscriber || f.notPaidProven !== true) return null
  if (f.filmsDelivered !== 0) return null
  if (f.freeFilm || f.regionFreeFilm) return 'free_film'
  if (f.regionPaidOnly === true) return 'region_pass'
  return null
}

/** A última ideia digitada, curta e numa linha (aspas e quebras de linha fora). Vazia/curta demais = null (o cartão não inventa). */
export function ideiaDoCartao(raw: string | null | undefined, max = 90): string | null {
  const t = String(raw ?? '').replace(/\s+/g, ' ').replace(/["“”«»]/g, '').trim()
  if (t.length < 3) return null
  if (t.length <= max) return t
  const corte = t.slice(0, max)
  const espaco = corte.lastIndexOf(' ')
  return `${(espaco > max * 0.6 ? corte.slice(0, espaco) : corte).replace(/[\s,.;:!?—-]+$/, '')}…`
}

export interface FilmePrimeiroCopy {
  kicker: string
  title: (seconds: number) => string
  ideaLabel: string
  body: string
  bodyNoIdea: string
  cta: string
}

/** As 16 línguas da interface. Nenhuma promete "sem marca d'água" nem "sem cartão": o filme grátis pode sair com a marca. */
export const FILME_PRIMEIRO_COPY: Record<InterfaceLanguage, FilmePrimeiroCopy> = {
  en: {
    kicker: 'BEFORE YOU BUY',
    title: (s) => `Make your free film first — ${s} s, on us`,
    ideaLabel: 'Your idea',
    body: 'Watch your own idea become a film before you pay anything. The plans are right below.',
    bodyNoIdea: 'Type any idea and watch it become a film before you pay anything. The plans are right below.',
    cta: 'Make my free film',
  },
  pt: {
    kicker: 'ANTES DE COMPRAR',
    title: (s) => `Faça primeiro o seu filme grátis — ${s} s, por nossa conta`,
    ideaLabel: 'Sua ideia',
    body: 'Veja a sua própria ideia virar filme antes de pagar qualquer coisa. Os planos estão logo abaixo.',
    bodyNoIdea: 'Escreva qualquer ideia e veja ela virar filme antes de pagar qualquer coisa. Os planos estão logo abaixo.',
    cta: 'Fazer meu filme grátis',
  },
  es: {
    kicker: 'ANTES DE COMPRAR',
    title: (s) => `Haz primero tu película gratis — ${s} s, por nuestra cuenta`,
    ideaLabel: 'Tu idea',
    body: 'Mira tu propia idea convertida en película antes de pagar nada. Los planes están justo debajo.',
    bodyNoIdea: 'Escribe cualquier idea y mírala convertida en película antes de pagar nada. Los planes están justo debajo.',
    cta: 'Hacer mi película gratis',
  },
  fr: {
    kicker: 'AVANT D’ACHETER',
    title: (s) => `Faites d’abord votre film gratuit — ${s} s, offert`,
    ideaLabel: 'Votre idée',
    body: 'Voyez votre propre idée devenir un film avant de payer quoi que ce soit. Les offres sont juste en dessous.',
    bodyNoIdea: 'Écrivez une idée et voyez-la devenir un film avant de payer quoi que ce soit. Les offres sont juste en dessous.',
    cta: 'Faire mon film gratuit',
  },
  de: {
    kicker: 'VOR DEM KAUF',
    title: (s) => `Mach zuerst deinen Gratis-Film — ${s} s, geht auf uns`,
    ideaLabel: 'Deine Idee',
    body: 'Sieh, wie deine eigene Idee zum Film wird, bevor du etwas bezahlst. Die Pläne stehen direkt darunter.',
    bodyNoIdea: 'Schreib eine beliebige Idee und sieh, wie sie zum Film wird, bevor du etwas bezahlst. Die Pläne stehen direkt darunter.',
    cta: 'Meinen Gratis-Film machen',
  },
  it: {
    kicker: 'PRIMA DI ACQUISTARE',
    title: (s) => `Fai prima il tuo film gratis — ${s} s, offerto da noi`,
    ideaLabel: 'La tua idea',
    body: 'Guarda la tua idea diventare un film prima di pagare qualsiasi cosa. I piani sono subito sotto.',
    bodyNoIdea: 'Scrivi un’idea qualsiasi e guardala diventare un film prima di pagare qualsiasi cosa. I piani sono subito sotto.',
    cta: 'Fai il mio film gratis',
  },
  nl: {
    kicker: 'VOORDAT JE KOOPT',
    title: (s) => `Maak eerst je gratis film — ${s} s, van ons`,
    ideaLabel: 'Jouw idee',
    body: 'Zie je eigen idee een film worden voordat je iets betaalt. De abonnementen staan direct hieronder.',
    bodyNoIdea: 'Typ een idee en zie het een film worden voordat je iets betaalt. De abonnementen staan direct hieronder.',
    cta: 'Maak mijn gratis film',
  },
  pl: {
    kicker: 'ZANIM KUPISZ',
    title: (s) => `Najpierw zrób swój darmowy film — ${s} s, na nasz koszt`,
    ideaLabel: 'Twój pomysł',
    body: 'Zobacz, jak Twój pomysł staje się filmem, zanim cokolwiek zapłacisz. Plany są tuż poniżej.',
    bodyNoIdea: 'Wpisz dowolny pomysł i zobacz, jak staje się filmem, zanim cokolwiek zapłacisz. Plany są tuż poniżej.',
    cta: 'Zrób mój darmowy film',
  },
  tr: {
    kicker: 'SATIN ALMADAN ÖNCE',
    title: (s) => `Önce ücretsiz filmini yap — ${s} sn, bizden`,
    ideaLabel: 'Fikrin',
    body: 'Bir şey ödemeden önce kendi fikrinin filme dönüştüğünü gör. Planlar hemen aşağıda.',
    bodyNoIdea: 'Herhangi bir fikir yaz ve bir şey ödemeden önce filme dönüştüğünü gör. Planlar hemen aşağıda.',
    cta: 'Ücretsiz filmimi yap',
  },
  ru: {
    kicker: 'ПРЕЖДЕ ЧЕМ ПОКУПАТЬ',
    title: (s) => `Сначала сделайте бесплатный фильм — ${s} с, за наш счёт`,
    ideaLabel: 'Ваша идея',
    body: 'Посмотрите, как ваша идея становится фильмом, прежде чем что-то платить. Тарифы — сразу ниже.',
    bodyNoIdea: 'Напишите любую идею и посмотрите, как она становится фильмом, прежде чем что-то платить. Тарифы — сразу ниже.',
    cta: 'Сделать мой бесплатный фильм',
  },
  uk: {
    kicker: 'ПЕРШ НІЖ КУПУВАТИ',
    title: (s) => `Спершу зробіть безкоштовний фільм — ${s} с, за наш рахунок`,
    ideaLabel: 'Ваша ідея',
    body: 'Подивіться, як ваша ідея стає фільмом, перш ніж щось платити. Тарифи — одразу нижче.',
    bodyNoIdea: 'Напишіть будь-яку ідею й подивіться, як вона стає фільмом, перш ніж щось платити. Тарифи — одразу нижче.',
    cta: 'Зробити мій безкоштовний фільм',
  },
  ar: {
    kicker: 'قبل الشراء',
    title: (s) => `اصنع فيلمك المجاني أولًا — ${s} ثانية على حسابنا`,
    ideaLabel: 'فكرتك',
    body: 'شاهد فكرتك تتحول إلى فيلم قبل أن تدفع أي شيء. الخطط أسفل هذا مباشرة.',
    bodyNoIdea: 'اكتب أي فكرة وشاهدها تتحول إلى فيلم قبل أن تدفع أي شيء. الخطط أسفل هذا مباشرة.',
    cta: 'اصنع فيلمي المجاني',
  },
  ur: {
    kicker: 'خریدنے سے پہلے',
    title: (s) => `پہلے اپنی مفت فلم بنائیں — ${s} سیکنڈ، ہماری طرف سے`,
    ideaLabel: 'آپ کا آئیڈیا',
    body: 'کچھ بھی ادا کرنے سے پہلے اپنے آئیڈیا کو فلم بنتے دیکھیں۔ پلان بالکل نیچے ہیں۔',
    bodyNoIdea: 'کوئی بھی آئیڈیا لکھیں اور کچھ بھی ادا کرنے سے پہلے اسے فلم بنتے دیکھیں۔ پلان بالکل نیچے ہیں۔',
    cta: 'میری مفت فلم بنائیں',
  },
  hi: {
    kicker: 'खरीदने से पहले',
    title: (s) => `पहले अपनी मुफ़्त फ़िल्म बनाइए — ${s} सेकंड, हमारी ओर से`,
    ideaLabel: 'आपका आइडिया',
    body: 'कुछ भी चुकाने से पहले अपने आइडिया को फ़िल्म बनते देखिए। प्लान ठीक नीचे हैं।',
    bodyNoIdea: 'कोई भी आइडिया लिखिए और कुछ भी चुकाने से पहले उसे फ़िल्म बनते देखिए। प्लान ठीक नीचे हैं।',
    cta: 'मेरी मुफ़्त फ़िल्म बनाइए',
  },
  id: {
    kicker: 'SEBELUM MEMBELI',
    title: (s) => `Buat dulu film gratismu — ${s} dtk, dari kami`,
    ideaLabel: 'Idemu',
    body: 'Lihat idemu sendiri menjadi film sebelum kamu membayar apa pun. Paketnya ada tepat di bawah.',
    bodyNoIdea: 'Tulis ide apa saja dan lihat menjadi film sebelum kamu membayar apa pun. Paketnya ada tepat di bawah.',
    cta: 'Buat film gratisku',
  },
  vi: {
    kicker: 'TRƯỚC KHI MUA',
    title: (s) => `Làm phim miễn phí của bạn trước — ${s} giây, chúng tôi tặng`,
    ideaLabel: 'Ý tưởng của bạn',
    body: 'Xem ý tưởng của chính bạn thành phim trước khi trả bất cứ khoản nào. Các gói ở ngay bên dưới.',
    bodyNoIdea: 'Nhập bất kỳ ý tưởng nào và xem nó thành phim trước khi trả bất cứ khoản nào. Các gói ở ngay bên dưới.',
    cta: 'Làm phim miễn phí của tôi',
  },
}

/** A cópia na língua da interface (língua desconhecida cai no inglês). */
export function copyDoFilmePrimeiro(language: InterfaceLanguage | string | null | undefined): FilmePrimeiroCopy {
  return (FILME_PRIMEIRO_COPY as Record<string, FilmePrimeiroCopy>)[String(language ?? 'en')] ?? FILME_PRIMEIRO_COPY.en
}

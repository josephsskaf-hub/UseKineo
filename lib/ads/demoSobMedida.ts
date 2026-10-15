// KINEO-DEMO-SOB-MEDIDA-1510 — a MÁQUINA DE DEMO SOB MEDIDA do B2B Kineo Automate (fundador 15/10, aprovado).
//
// Quando uma marca RESPONDE à prospecção, a sessão CEO/B2B cola o link do produto dela em /admin/demo e, em minutos, sai uma
// página PRIVADA "Sample made by Kineo for <Brand>" com o anúncio nos 3 formatos (9:16, 4:5, 1:1) e o botão de aprovar/pedir
// ajuste (a página de aprovação que já existe: /approve#<token>).
//
// REGRAS APROVADAS (fundador 15/10):
//   · até 3 demos por SEMANA (semana ISO, relógio de Brasília), só para quem respondeu. A 4ª é recusada; o fundador libera com
//     a caixa "exceção aprovada pelo fundador", que exige e GRAVA o motivo no evento;
//   · ler o saldo da fal ANTES (recusa por saldo nas últimas 6 h = não começa);
//   · a trava do produto fiel está ligada para todos (modo 'all', fundador 15/10) — a demo passa por ela como qualquer pedido;
//   · nível Comercial, 15 s, 9:16, na CONTA DA CASA em que o admin está logado (isAdsInternalEmail; senão recusa), com o
//     ensaio de US$ 0 (dry-run) ANTES e o débito normal da casa (o /plan e o /start de sempre — nenhum caminho de dinheiro novo);
//   · depois da ENTREGA (pelo cron/avanço de sempre — a requisição nunca espera o vídeo), os formatos 4:5 e 1:1 saem dos MESMOS
//     clipes (sem nova chamada à fal) e o link de aprovação nasce com o nome da marca;
//   · honestidade: a demo usa só o material PÚBLICO da página do produto da marca, para a própria marca ver; não é publicada em
//     lugar nenhum (fora de vitrine, sitemap e llms; a página de aprovação é noindex).
//
// LIB PURA (sem import de valor): o guardião scripts/test-demo-sob-medida-1510.mjs importa este arquivo cru.

export const DEMO_SOB_MEDIDA_MARK = 'KINEO-DEMO-SOB-MEDIDA-1510'
/** Teto da semana (todas as contas da casa somadas: é o orçamento da empresa, não de uma pessoa). */
export const DEMO_WEEKLY_CAP = 3
export const DEMO_EVENT_CREATED = 'demo_sob_medida_created'
export const DEMO_EVENT_DELIVERED = 'demo_sob_medida_delivered'
/** O pedido da demo: o nível e a duração aprovados (Comercial 15 s, 9:16). */
export const DEMO_TIER = 'commercial' as const
export const DEMO_SECONDS = 15 as const
/** Quantos dias o cron ainda procura demos para terminar (formatos + aprovação). */
export const DEMO_FOLLOW_DAYS = 21
/** Fotos do produto que a demo usa (o mesmo teto do leitor de link). */
export const DEMO_MAX_PHOTOS = 3
/** Brasília: UTC−3 o ano todo (sem horário de verão desde 2019). */
export const DEMO_BRT_OFFSET_MS = 3 * 3600_000
export const DEMO_BRAND_MAX = 60
export const DEMO_LINK_MAX = 500
export const DEMO_SCENE_MAX = 300
export const DEMO_REASON_MIN = 8
export const DEMO_REASON_MAX = 300

/** Línguas da voz que a demo oferece (a narração do anúncio sai nelas). */
export const DEMO_VOICE_LANGS = ['en', 'es', 'de', 'fr', 'it', 'pt', 'nl', 'pl'] as const
export type DemoVoiceLang = (typeof DEMO_VOICE_LANGS)[number]
export const DEMO_VOICE_NAMES: Record<DemoVoiceLang, string> = { en: 'English', es: 'Español', de: 'Deutsch', fr: 'Français', it: 'Italiano', pt: 'Português', nl: 'Nederlands', pl: 'Polski' }

export interface DemoBody {
  link: string
  brand: string
  voice: DemoVoiceLang
  scene: string | null
  /** Exceção ao teto da semana: só com o motivo escrito (vai ao evento). */
  exceptionReason: string | null
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim()

/** O nome da marca: texto simples, sem e-mail, telefone nem link (a mesma régua do nome da página de aprovação). */
export function sanitizeDemoBrand(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = clean(raw).replace(/[<>]/g, '')
  if (!t || t.length > DEMO_BRAND_MAX) return null
  if (/@|https?:\/\/|www\./i.test(t) || /\d{6,}/.test(t.replace(/[\s().+-]/g, ''))) return null
  return t
}

/** O corpo do POST de /api/admin/demo. */
export function sanitizeDemoBody(raw: unknown): { ok: true; value: DemoBody } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'bad_body' }
  const b = raw as Record<string, unknown>
  const link = typeof b.link === 'string' ? b.link.trim() : ''
  if (!link || link.length > DEMO_LINK_MAX || !/^https?:\/\/[^\s]+$/i.test(link)) return { ok: false, error: 'bad_link' }
  const brand = sanitizeDemoBrand(b.brand)
  if (!brand) return { ok: false, error: 'bad_brand' }
  const v = b.voice === undefined || b.voice === null || b.voice === '' ? 'en' : b.voice
  if (typeof v !== 'string' || !(DEMO_VOICE_LANGS as readonly string[]).includes(v)) return { ok: false, error: 'bad_voice' }
  let scene: string | null = null
  if (b.scene !== undefined && b.scene !== null && b.scene !== '') {
    if (typeof b.scene !== 'string') return { ok: false, error: 'bad_scene' }
    const s = clean(b.scene)
    if (s.length > DEMO_SCENE_MAX) return { ok: false, error: 'scene_too_long' }
    scene = s || null
  }
  let exceptionReason: string | null = null
  if (b.exception === true) {
    const r = typeof b.exception_reason === 'string' ? clean(b.exception_reason) : ''
    if (r.length < DEMO_REASON_MIN || r.length > DEMO_REASON_MAX) return { ok: false, error: 'exception_reason_required' }
    exceptionReason = r
  } else if (b.exception !== undefined && b.exception !== null && b.exception !== false) {
    return { ok: false, error: 'bad_exception' }
  }
  return { ok: true, value: { link, brand, voice: v as DemoVoiceLang, scene, exceptionReason } }
}

/** O início da semana ISO (segunda 00:00 em Brasília), como instante UTC. */
export function demoWeekStart(now: Date): Date {
  const local = new Date(now.getTime() - DEMO_BRT_OFFSET_MS)
  const back = (local.getUTCDay() + 6) % 7
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - back) + DEMO_BRT_OFFSET_MS)
}

/** O rótulo da semana ISO em Brasília ('2026-W42'). */
export function demoWeekLabel(now: Date): string {
  const local = new Date(now.getTime() - DEMO_BRT_OFFSET_MS)
  const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const y0 = Date.UTC(d.getUTCFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - y0) / 86_400_000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/**
 * A porta do teto da semana. `count` = demos já criadas nesta semana (null = a contagem não leu → FECHADO). Com o teto batido,
 * só passa com a exceção do fundador (com motivo).
 */
export function demoCapDecision(count: number | null, exceptionReason: string | null): { ok: true; exception: boolean } | { ok: false; error: 'counter_unavailable' | 'weekly_cap' } {
  if (count === null || !Number.isFinite(count) || count < 0) return { ok: false, error: 'counter_unavailable' }
  if (count < DEMO_WEEKLY_CAP) return { ok: true, exception: false }
  if (exceptionReason && exceptionReason.length >= DEMO_REASON_MIN) return { ok: true, exception: true }
  return { ok: false, error: 'weekly_cap' }
}

/** O link que vai ao evento: só origem + caminho (sem query nem fragmento — nada de e-mail ou rastreio de terceiros). */
export function demoSafeLink(raw: string): string {
  try {
    const u = new URL(raw)
    return `${u.origin}${u.pathname}`.slice(0, DEMO_LINK_MAX)
  } catch {
    return ''
  }
}

/** A frase do pedido: a frase que a página sugere (ou o título), sempre com o NOME da marca (o /plan precisa saber o negócio). */
export function demoSentence(brand: string, pageSentence: string | null | undefined, title: string | null | undefined, max = 400): string {
  const base = clean(String(pageSentence || title || ''))
  const s = base && base.toLowerCase().includes(brand.toLowerCase()) ? base : clean(`${brand} — ${base}`).replace(/\s—\s*$/, '')
  return s.slice(0, max)
}

export type DemoStatus = 'fazendo' | 'pronta' | 'falhou'

/** O estado da demo na lista: falhou (pedido falhou/cancelado) · pronta (entregue + link de aprovação + nenhum formato montando) · fazendo. */
export function demoStatus(s: { orderStatus: string | null; formats: readonly { status: string }[]; approval: boolean }): DemoStatus {
  if (s.orderStatus === 'failed' || s.orderStatus === 'cancelled') return 'falhou'
  if (s.orderStatus !== 'delivered') return 'fazendo'
  if (!s.approval || s.formats.some((f) => f.status === 'rendering')) return 'fazendo'
  return 'pronta'
}

/** O brief do pedido diz que é uma demo sob medida? (a página de aprovação troca "From X" por "Sample made by Kineo for X"). */
export function isDemoSobMedidaBrief(brief: unknown): boolean {
  if (!brief || typeof brief !== 'object') return false
  const d = (brief as Record<string, unknown>).demo
  return !!d && typeof d === 'object' && (d as Record<string, unknown>).kind === 'sob_medida'
}

// ── textos ───────────────────────────────────────────────────────────────────────────────────────────────────────────
/** O texto curto, pronto para mandar à marca (EN/ES/DE). {link} = o link privado. */
export const DEMO_MESSAGE: Record<'en' | 'es' | 'de', string> = {
  en: "Here's a sample we made from your product page: {link} — approve or ask for changes right there.",
  es: 'Aquí tienes una muestra que hicimos a partir de la página de tu producto: {link} — apruébala o pide cambios ahí mismo.',
  de: 'Hier ist ein Beispiel, das wir aus Ihrer Produktseite erstellt haben: {link} — genehmigen Sie es oder wünschen Sie Änderungen direkt dort.',
}
export function demoMessage(lang: 'en' | 'es' | 'de', link: string): string {
  return DEMO_MESSAGE[lang].split('{link}').join(link)
}

/** O rótulo da página privada, a nota de honestidade e o aviso do apresentador de IA (língua desconhecida = inglês). */
export interface DemoPageCopy { sample: string; note: string; aiPresenter: string; formats: string }
const PAGE_EN: DemoPageCopy = {
  sample: 'Sample made by Kineo for {brand}',
  note: 'Made only from the public photos and text of your product page, for you to see. It is not published anywhere.',
  aiPresenter: 'This ad includes an AI presenter — not a real person.',
  formats: 'Formats',
}
export const DEMO_PAGE_COPY: Record<string, DemoPageCopy> = {
  en: PAGE_EN,
  es: { sample: 'Muestra hecha por Kineo para {brand}', note: 'Hecha solo con las fotos y el texto públicos de la página de tu producto, para que la veas tú. No está publicada en ningún lugar.', aiPresenter: 'Este anuncio incluye un presentador de IA — no es una persona real.', formats: 'Formatos' },
  de: { sample: 'Beispiel von Kineo für {brand}', note: 'Nur aus den öffentlichen Fotos und Texten Ihrer Produktseite erstellt, damit Sie es sehen. Es ist nirgends veröffentlicht.', aiPresenter: 'Diese Anzeige enthält einen KI-Sprecher — keine echte Person.', formats: 'Formate' },
  fr: { sample: 'Exemple réalisé par Kineo pour {brand}', note: 'Fait uniquement à partir des photos et du texte publics de votre page produit, pour que vous le voyiez. Il n’est publié nulle part.', aiPresenter: 'Cette publicité comprend un présentateur IA — ce n’est pas une vraie personne.', formats: 'Formats' },
  it: { sample: 'Esempio realizzato da Kineo per {brand}', note: 'Realizzato solo con le foto e i testi pubblici della pagina del tuo prodotto, perché tu lo veda. Non è pubblicato da nessuna parte.', aiPresenter: 'Questo annuncio include un presentatore IA — non una persona reale.', formats: 'Formati' },
  pt: { sample: 'Amostra feita pela Kineo para {brand}', note: 'Feita só com as fotos e o texto públicos da página do seu produto, para você ver. Não está publicada em lugar nenhum.', aiPresenter: 'Este anúncio tem um apresentador de IA — não é uma pessoa real.', formats: 'Formatos' },
  nl: { sample: 'Voorbeeld gemaakt door Kineo voor {brand}', note: 'Alleen gemaakt met de openbare foto’s en tekst van je productpagina, zodat jij het kunt zien. Het is nergens gepubliceerd.', aiPresenter: 'Deze advertentie bevat een AI-presentator — geen echt persoon.', formats: 'Formaten' },
  pl: { sample: 'Próbka przygotowana przez Kineo dla {brand}', note: 'Zrobiona tylko z publicznych zdjęć i tekstu strony Twojego produktu, do Twojego wglądu. Nigdzie nie jest opublikowana.', aiPresenter: 'Ta reklama zawiera prezentera AI — to nie jest prawdziwa osoba.', formats: 'Formaty' },
}
export function demoPageCopy(lang: string | null | undefined): DemoPageCopy {
  return (typeof lang === 'string' && DEMO_PAGE_COPY[lang]) || PAGE_EN
}
export function fillDemo(s: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(v), s)
}

/** O botão do cartão final, na língua da voz. */
export const DEMO_CARD_CTA: Record<DemoVoiceLang, string> = { en: 'Shop now', es: 'Compra ahora', de: 'Jetzt kaufen', fr: 'Acheter', it: 'Acquista ora', pt: 'Compre agora', nl: 'Nu kopen', pl: 'Kup teraz' }

/** A frase de cada recusa na tela do admin (português: a tela é do fundador). */
export const DEMO_ERRORS: Record<string, string> = {
  unauthenticated: 'Faça login de novo.',
  forbidden: 'Só o admin usa esta tela.',
  not_house_account: 'Esta conta não é da casa (isAdsInternalEmail). A demo só sai numa conta interna — entre com ela.',
  weekly_cap: 'Já saíram 3 demos nesta semana. Só com a exceção aprovada pelo fundador (com o motivo).',
  counter_unavailable: 'Não consegui contar as demos da semana — por segurança, nada começou. Tente de novo.',
  exception_reason_required: 'Escreva o motivo da exceção (8 a 300 letras).',
  fal_balance_refused: 'A fal recusou por saldo nas últimas 6 h. Recarregue a fal antes da demo.',
  out_of_credits: 'A conta da casa não tem créditos para um Comercial 15 s.',
  link_unreachable: 'A página do produto não abriu (bloqueio, login ou só JavaScript). Tente o link direto do produto.',
  no_photos: 'A página não tem foto JPG/PNG do produto que dê para usar.',
  moderation: 'A moderação recusou o texto ou a foto da página.',
  another_active: 'Outro anúncio está gerando nesta conta agora. Espere terminar (uns minutos) e gere de novo.',
  plan_failed: 'O roteiro não saiu. Nada foi cobrado. Tente de novo em um minuto.',
  dry_run_failed: 'O ensaio de US$ 0 não passou. Nada foi cobrado.',
  start_failed: 'O início falhou. Se houve débito, o estorno de sempre devolve.',
  bad_link: 'Cole o link completo do produto (https://…).',
  bad_brand: 'Nome da marca: texto simples, até 60 letras, sem e-mail, telefone ou link.',
  bad_voice: 'Escolha uma língua da lista.',
  scene_too_long: 'A cena tem no máximo 300 letras.',
  unavailable: 'Serviço indisponível agora. Tente de novo.',
}

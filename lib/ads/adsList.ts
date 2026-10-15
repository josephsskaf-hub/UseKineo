// KINEO-ADS-LISTA-1510 — a lista "Seus anúncios" do /ads/v2 com cara de ferramenta de agência (fundador 15/10/2026).
//
// ANTES: cada linha era a FRASE CRUA digitada ("perfume num hotel com chuva" 4 vezes), um chip de marca, "Making"/"Ready",
// a duração, a data e "Open" — pedidos da mesma frase não se distinguiam.
// AGORA, por linha: a miniatura (o pôster do vídeo entregue; sem ele, a foto do produto que a pessoa enviou), um título limpo
// ("Perfume · num hotel com chuva": o produto + a cena; sem produto, a frase aparada; nunca um travessão solto), uma linha de
// detalhes (estilo do catálogo traduzido, nível, formato, duração, data e hora, versões), o estado num selo (Fazendo animado,
// Pronto, Não funcionou + o porquê, Aguardando aprovação / Aprovado / Pediu ajustes) e uma busca por texto ao lado dos chips.
//
// LIB PURA (só `import type` e libs puras): nada aqui chama rota, cobra crédito ou decide preço. A rota
// (app/api/ads/v2/orders/route.ts ?list=brands) monta cada linha com adsListRow (lib/ads/adsListServer.ts) — o servidor NUNCA
// devolve o erro cru do pedido, a lista de fotos nem o brief inteiro: só os campos desta vista.
// Guardião: scripts/test-ads-lista-1510.mjs.
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'
import { adsV2StyleCopy, isAdsV2Style } from '@/lib/ads/v2Styles'

export const MARCA_ADS_LISTA_1510 = 'KINEO-ADS-LISTA-1510'

/** Quantas linhas a rota devolve por vez (o .limit de sempre) e quantas a tela mostra antes do "Carregar mais". */
export const ADS_LIST_BATCH = 40
export const ADS_LIST_PAGE = 12

/** As colunas que a lista lê A MAIS (só leitura; nenhuma coluna de dinheiro, cobrança ou preço). */
export const ADS_LIST_EXTRA_COLUMNS = 'photos, business:brief->>business, scene:brief->>scene, style:plan->>style, format:plan->>format, error'

/** De onde a miniatura pode vir — e de nenhum outro campo: o pôster do vídeo entregue (videos.thumbnail_url, da própria conta) ou a foto do pedido. */
export const ADS_LIST_THUMB_FIELDS = ['poster', 'photo'] as const
export type AdsListThumbFrom = (typeof ADS_LIST_THUMB_FIELDS)[number]

export type AdsListPill = 'making' | 'ready' | 'failed' | 'cancelled' | 'needs_approval' | 'approved' | 'changes'
export type AdsListFailWhy = 'charge' | 'rules' | 'other'
export type AdsListApproval = 'pending' | 'approved' | 'changes_requested'
export type AdsListFormat = '9:16' | '4:5' | '1:1'

/** O que a rota devolve por linha (nada além disto). */
export interface AdsListItem {
  id: string
  status: string
  tier: string
  seconds: number
  video_id: string | null
  created_at: string
  brand_id?: string | null
  sentence: string | null
  link: string | null
  product: string | null
  scene: string | null
  style: string | null
  format: AdsListFormat
  thumb: string | null
  thumb_from: AdsListThumbFrom | null
  fail_why: AdsListFailWhy | null
  versions: number
  approval: AdsListApproval | null
}

const DASHES = /[—–‒―-]/
const str = (v: unknown): string => (typeof v === 'string' ? v : '')

/** Espaços colapsados e nenhum travessão/hífen solto nas pontas ("perfume —", "— num hotel", " - "). Pura. */
export function adsListClean(raw: unknown): string {
  let s = str(raw).replace(/\s+/g, ' ').trim()
  for (let i = 0; i < 4; i++) {
    const t = s.replace(/^[\s—–‒―\-·|:,;]+/, '').replace(/[\s—–‒―\-·|:,;]+$/, '').trim()
    if (t === s) break
    s = t
  }
  return s
}

/** O nome do produto/negócio: a parte antes do travessão em "<nome> — <o que vende>" (o brief do plano), limpa. Pura. */
export function adsListProduct(business: unknown): string | null {
  const first = str(business).split(/\s+[—–‒―-]\s+/)[0]
  const s = adsListClean(first)
  return s && !DASHES.test(s.charAt(0)) ? s.slice(0, 80) : null
}

/** O host do link ("loja.com.br"), sem www; link inválido = ''. Pura. */
export function adsListHost(link: unknown): string {
  try { return str(link) ? new URL(str(link)).hostname.replace(/^www\./, '') : '' } catch { return '' }
}

/**
 * O título da linha: "<produto> · <cena>" quando há produto (a cena só quando existe e não repete o produto); sem produto, a frase
 * aparada; sem frase, o host do link; sem nada, '' (a tela mostra "Anúncio sem título"). Nunca um travessão solto. Pura.
 */
export function adsListTitle(o: { product?: unknown; scene?: unknown; sentence?: unknown; link?: unknown }): string {
  const product = adsListClean(o.product)
  const scene = adsListClean(o.scene)
  if (product) {
    return scene && scene.toLowerCase() !== product.toLowerCase() ? `${product} · ${scene}` : product
  }
  const sentence = adsListClean(o.sentence)
  if (sentence) return sentence.length > 90 ? `${adsListClean(sentence.slice(0, 89))}…` : sentence
  return adsListHost(o.link)
}

const httpUrl = (v: unknown): string | null => {
  const s = str(v).trim()
  if (!/^https?:\/\//i.test(s)) return null
  try { new URL(s); return s } catch { return null }
}

/**
 * A miniatura: o pôster do vídeo entregue (videos.thumbnail_url da própria conta); sem ele, a foto de PRODUTO do pedido (a 1ª
 * marcada como produto; sem ela, a 1ª foto). Só http(s); nenhum outro campo entra (logo, cartão final, footage_id, caminho do
 * bucket). Pura.
 */
export function adsListThumb(o: { poster?: unknown; photos?: unknown }): { src: string; from: AdsListThumbFrom } | null {
  const poster = httpUrl(o.poster)
  if (poster) return { src: poster, from: 'poster' }
  const photos = Array.isArray(o.photos) ? o.photos.filter((p): p is Record<string, unknown> => !!p && typeof p === 'object') : []
  const pick = photos.find((p) => p.kind === 'product' && httpUrl(p.url)) ?? photos.find((p) => httpUrl(p.url))
  const url = pick ? httpUrl(pick.url) : null
  return url ? { src: url, from: 'photo' } : null
}

/** O porquê da falha, em 3 caixas (o erro cru do servidor nunca sai): crédito não confirmado, regra de conteúdo, o resto. Pura. */
export function adsListFailWhy(status: unknown, error: unknown): AdsListFailWhy | null {
  if (status !== 'failed') return null
  const e = str(error)
  if (/^charge_/.test(e)) return 'charge'
  if (/moderation/.test(e)) return 'rules'
  return 'other'
}

/**
 * O estado da aprovação do cliente (ads_v2_approvals) de UM pedido: o link mais novo que ainda vale — revogado e pendente vencido
 * não contam (um mais antigo decidido continua valendo). Pura.
 */
export function adsListApproval(rows: readonly { status?: unknown; expires_at?: unknown; revoked_at?: unknown; created_at?: unknown }[], now = Date.now()): AdsListApproval | null {
  const sorted = rows.slice().sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))
  for (const r of sorted) {
    if (r.revoked_at || r.status === 'revoked') continue
    if (r.status === 'approved' || r.status === 'changes_requested') return r.status
    if (r.status === 'pending') {
      const exp = Date.parse(str(r.expires_at))
      if (Number.isFinite(exp) && exp <= now) continue
      return 'pending'
    }
  }
  return null
}

/** Quantas versões o anúncio tem: a entrega original + as versões que não falharam (ads_v2_versions). 1 = só a original. Pura. */
export function adsListVersions(rows: readonly { status?: unknown }[]): number {
  return 1 + rows.filter((r) => r.status === 'delivered' || r.status === 'rendering').length
}

/** O selo da linha: falha e cancelado primeiro; em produção = Fazendo; entregue = o estado da aprovação, senão Pronto. Pura. */
export function adsListPill(o: { status?: unknown; approval?: AdsListApproval | null }): AdsListPill {
  if (o.status === 'failed') return 'failed'
  if (o.status === 'cancelled') return 'cancelled'
  if (o.status !== 'delivered') return 'making'
  if (o.approval === 'pending') return 'needs_approval'
  if (o.approval === 'approved') return 'approved'
  if (o.approval === 'changes_requested') return 'changes'
  return 'ready'
}

export const adsListFormat = (raw: unknown): AdsListFormat => (raw === '4:5' || raw === '1:1' ? raw : '9:16')

/** O cursor do "Carregar mais": uma data ISO válida (as linhas MAIS ANTIGAS que ela) ou null. Pura. */
export function adsListBefore(raw: unknown): string | null {
  const s = str(raw).trim()
  if (!s || s.length > 40 || !/^\d{4}-\d{2}-\d{2}T/.test(s)) return null
  const t = Date.parse(s)
  return Number.isFinite(t) ? new Date(t).toISOString() : null
}

/**
 * A linha que a rota devolve, montada SÓ com o que pode sair: o pedido (já filtrado pelo dono na consulta) + o pôster do vídeo
 * DELE + as versões e aprovações DELE. Fotos, brief e erro crus ficam no servidor. Pura.
 */
export function adsListRow(
  row: Record<string, unknown>,
  extra: { poster?: string | null; versions?: readonly { status?: unknown }[]; approvals?: readonly { status?: unknown; expires_at?: unknown; revoked_at?: unknown; created_at?: unknown }[] } = {},
  now = Date.now(),
): AdsListItem {
  const thumb = adsListThumb({ poster: extra.poster ?? null, photos: row.photos })
  const style = str(row.style)
  const item: AdsListItem = {
    id: str(row.id),
    status: str(row.status),
    tier: str(row.tier),
    seconds: Number(row.seconds) || 0,
    video_id: typeof row.video_id === 'string' ? row.video_id : null,
    created_at: str(row.created_at),
    sentence: str(row.sentence) || null,
    link: str(row.link) || null,
    product: adsListProduct(row.business),
    scene: adsListClean(row.scene) || null,
    style: isAdsV2Style(style) ? style : null,
    format: adsListFormat(row.format),
    thumb: thumb?.src ?? null,
    thumb_from: thumb?.from ?? null,
    fail_why: adsListFailWhy(row.status, row.error),
    versions: adsListVersions(extra.versions ?? []),
    approval: adsListApproval(extra.approvals ?? [], now),
  }
  if ('brand_id' in row) item.brand_id = typeof row.brand_id === 'string' ? row.brand_id : null
  return item
}

/** Texto sem acento e sem caixa, para a busca. Pura. */
export const adsListFold = (s: unknown): string => str(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

/** A busca: todas as palavras digitadas aparecem no título, na frase, no produto, na cena, na marca, no estilo ou no site. Pura. */
export function adsListMatches(o: Pick<AdsListItem, 'sentence' | 'link' | 'product' | 'scene'> & { title?: string; brand?: string | null; styleLabel?: string | null }, query: unknown): boolean {
  const words = adsListFold(query).split(' ').filter(Boolean)
  if (!words.length) return true
  const hay = adsListFold([o.title, o.sentence, o.product, o.scene, o.brand, o.styleLabel, adsListHost(o.link)].filter(Boolean).join(' · '))
  return words.every((w) => hay.includes(w))
}

/** O nome do estilo na língua da interface (catálogo de lib/ads/v2Styles.ts); sem estilo = null. Pura. */
export function adsListStyleLabel(style: unknown, lang: InterfaceLanguage | string | null | undefined): string | null {
  return isAdsV2Style(style) ? adsV2StyleCopy(lang).styles[style].label : null
}

// ─── as frases (16 línguas da interface; só rótulos — a frase da pessoa e os nomes ficam como ela digitou) ───────────────────
export interface AdsListCopy {
  search: string
  searchLabel: string
  clear: string
  noMatch: string
  more: string
  untitled: string
  versions: string
  pill: Record<AdsListPill, string>
  why: Record<AdsListFailWhy, string>
  tier: { photo_motion: string; commercial: string; cinema: string }
}

const P = (making: string, ready: string, failed: string, cancelled: string, needs_approval: string, approved: string, changes: string): Record<AdsListPill, string> => ({ making, ready, failed, cancelled, needs_approval, approved, changes })
const W = (charge: string, rules: string, other: string): Record<AdsListFailWhy, string> => ({ charge, rules, other })
const T = (photo_motion: string, commercial: string, cinema: string) => ({ photo_motion, commercial, cinema })

// Os nomes dos níveis são os MESMOS da escolha de nível do quadro (ADS_V2_SIMPLE_COPY: en Standard · pt/es Normal; cinema = Premium).
export const ADS_LIST_COPY: Record<InterfaceLanguage, AdsListCopy> = {
  en: { search: 'Search ads', searchLabel: 'Search your ads', clear: 'Clear search', noMatch: 'No ads match “{q}”.', more: 'Load more', untitled: 'Untitled ad', versions: '{n} versions', pill: P('Making', 'Ready', 'Failed', 'Cancelled', 'Needs approval', 'Approved', 'Changes requested'), why: W('credits not confirmed', 'content rules', 'credits returned'), tier: T('Standard', 'Commercial', 'Premium') },
  pt: { search: 'Buscar anúncios', searchLabel: 'Buscar nos seus anúncios', clear: 'Limpar busca', noMatch: 'Nenhum anúncio com “{q}”.', more: 'Carregar mais', untitled: 'Anúncio sem título', versions: '{n} versões', pill: P('Fazendo', 'Pronto', 'Não funcionou', 'Cancelado', 'Aguardando aprovação', 'Aprovado', 'Pediu ajustes'), why: W('créditos não confirmados', 'regras de conteúdo', 'créditos devolvidos'), tier: T('Normal', 'Comercial', 'Premium') },
  es: { search: 'Buscar anuncios', searchLabel: 'Buscar en tus anuncios', clear: 'Borrar búsqueda', noMatch: 'Ningún anuncio con “{q}”.', more: 'Cargar más', untitled: 'Anuncio sin título', versions: '{n} versiones', pill: P('Creando', 'Listo', 'No funcionó', 'Cancelado', 'Esperando aprobación', 'Aprobado', 'Pidió cambios'), why: W('créditos no confirmados', 'normas de contenido', 'créditos devueltos'), tier: T('Normal', 'Comercial', 'Premium') },
  fr: { search: 'Rechercher', searchLabel: 'Rechercher dans vos pubs', clear: 'Effacer la recherche', noMatch: 'Aucune pub pour « {q} ».', more: 'Charger plus', untitled: 'Pub sans titre', versions: '{n} versions', pill: P('En cours', 'Prête', 'Échec', 'Annulée', 'À approuver', 'Approuvée', 'Modifs demandées'), why: W('crédits non confirmés', 'règles de contenu', 'crédits rendus'), tier: T('Standard', 'Commerciale', 'Premium') },
  de: { search: 'Anzeigen suchen', searchLabel: 'In deinen Anzeigen suchen', clear: 'Suche löschen', noMatch: 'Keine Anzeige zu „{q}“.', more: 'Mehr laden', untitled: 'Anzeige ohne Titel', versions: '{n} Versionen', pill: P('In Arbeit', 'Fertig', 'Fehlgeschlagen', 'Abgebrochen', 'Freigabe offen', 'Freigegeben', 'Änderungen gewünscht'), why: W('Credits nicht bestätigt', 'Inhaltsregeln', 'Credits zurück'), tier: T('Basis', 'Werbespot', 'Premium') },
  it: { search: 'Cerca annunci', searchLabel: 'Cerca nei tuoi annunci', clear: 'Cancella ricerca', noMatch: 'Nessun annuncio per “{q}”.', more: 'Carica altri', untitled: 'Annuncio senza titolo', versions: '{n} versioni', pill: P('In corso', 'Pronto', 'Non riuscito', 'Annullato', 'Da approvare', 'Approvato', 'Modifiche richieste'), why: W('crediti non confermati', 'regole sui contenuti', 'crediti restituiti'), tier: T('Base', 'Commerciale', 'Premium') },
  nl: { search: 'Advertenties zoeken', searchLabel: 'Zoeken in je advertenties', clear: 'Zoekopdracht wissen', noMatch: 'Geen advertenties met “{q}”.', more: 'Meer laden', untitled: 'Advertentie zonder titel', versions: '{n} versies', pill: P('Bezig', 'Klaar', 'Mislukt', 'Geannuleerd', 'Wacht op goedkeuring', 'Goedgekeurd', 'Wijzigingen gevraagd'), why: W('credits niet bevestigd', 'inhoudsregels', 'credits terug'), tier: T('Basis', 'Commercial', 'Premium') },
  pl: { search: 'Szukaj reklam', searchLabel: 'Szukaj w swoich reklamach', clear: 'Wyczyść wyszukiwanie', noMatch: 'Brak reklam dla „{q}”.', more: 'Wczytaj więcej', untitled: 'Reklama bez tytułu', versions: 'Wersje: {n}', pill: P('W trakcie', 'Gotowa', 'Nie wyszło', 'Anulowana', 'Czeka na akceptację', 'Zaakceptowana', 'Prośba o zmiany'), why: W('kredyty niepotwierdzone', 'zasady treści', 'kredyty zwrócone'), tier: T('Podstawowy', 'Reklamowy', 'Premium') },
  tr: { search: 'Reklam ara', searchLabel: 'Reklamlarınızda arayın', clear: 'Aramayı temizle', noMatch: '“{q}” ile eşleşen reklam yok.', more: 'Daha fazla yükle', untitled: 'Başlıksız reklam', versions: '{n} sürüm', pill: P('Hazırlanıyor', 'Hazır', 'Olmadı', 'İptal', 'Onay bekliyor', 'Onaylandı', 'Değişiklik istendi'), why: W('kredi onaylanmadı', 'içerik kuralları', 'kredi iade edildi'), tier: T('Standart', 'Ticari', 'Premium') },
  ru: { search: 'Поиск рекламы', searchLabel: 'Поиск по вашей рекламе', clear: 'Очистить поиск', noMatch: 'Нет рекламы по запросу «{q}».', more: 'Показать ещё', untitled: 'Реклама без названия', versions: 'Версий: {n}', pill: P('Создаётся', 'Готово', 'Не получилось', 'Отменено', 'Ждёт одобрения', 'Одобрено', 'Просят правки'), why: W('кредиты не подтверждены', 'правила контента', 'кредиты возвращены'), tier: T('Стандарт', 'Коммерческий', 'Премиум') },
  uk: { search: 'Пошук реклами', searchLabel: 'Пошук у вашій рекламі', clear: 'Очистити пошук', noMatch: 'Немає реклами за запитом «{q}».', more: 'Показати ще', untitled: 'Реклама без назви', versions: 'Версій: {n}', pill: P('Створюється', 'Готово', 'Не вийшло', 'Скасовано', 'Чекає схвалення', 'Схвалено', 'Просять правки'), why: W('кредити не підтверджено', 'правила контенту', 'кредити повернуто'), tier: T('Стандарт', 'Комерційний', 'Преміум') },
  ar: { search: 'ابحث في الإعلانات', searchLabel: 'ابحث في إعلاناتك', clear: 'مسح البحث', noMatch: 'لا توجد إعلانات تطابق «{q}».', more: 'تحميل المزيد', untitled: 'إعلان بلا عنوان', versions: 'النسخ: {n}', pill: P('قيد الإنشاء', 'جاهز', 'لم ينجح', 'أُلغي', 'بانتظار الموافقة', 'تمت الموافقة', 'طُلبت تعديلات'), why: W('الرصيد غير مؤكد', 'قواعد المحتوى', 'أُعيد الرصيد'), tier: T('عادي', 'تجاري', 'بريميوم') },
  ur: { search: 'اشتہار تلاش کریں', searchLabel: 'اپنے اشتہارات میں تلاش کریں', clear: 'تلاش صاف کریں', noMatch: '“{q}” سے کوئی اشتہار نہیں ملا۔', more: 'مزید دکھائیں', untitled: 'بغیر عنوان اشتہار', versions: 'ورژن: {n}', pill: P('بن رہا ہے', 'تیار', 'کام نہیں ہوا', 'منسوخ', 'منظوری کا انتظار', 'منظور', 'تبدیلیاں مانگی گئیں'), why: W('کریڈٹ کی تصدیق نہیں ہوئی', 'مواد کے قواعد', 'کریڈٹ واپس'), tier: T('عام', 'کمرشل', 'پریمیئم') },
  hi: { search: 'विज्ञापन खोजें', searchLabel: 'अपने विज्ञापनों में खोजें', clear: 'खोज साफ़ करें', noMatch: '“{q}” से कोई विज्ञापन नहीं मिला।', more: 'और दिखाएँ', untitled: 'बिना शीर्षक का विज्ञापन', versions: '{n} वर्ज़न', pill: P('बन रहा है', 'तैयार', 'नहीं बना', 'रद्द', 'मंज़ूरी बाकी', 'मंज़ूर', 'बदलाव माँगे'), why: W('क्रेडिट पक्के नहीं हुए', 'कंटेंट नियम', 'क्रेडिट वापस'), tier: T('सामान्य', 'कमर्शियल', 'प्रीमियम') },
  id: { search: 'Cari iklan', searchLabel: 'Cari di iklan Anda', clear: 'Hapus pencarian', noMatch: 'Tidak ada iklan untuk “{q}”.', more: 'Muat lagi', untitled: 'Iklan tanpa judul', versions: '{n} versi', pill: P('Dibuat', 'Siap', 'Gagal', 'Dibatalkan', 'Menunggu persetujuan', 'Disetujui', 'Minta revisi'), why: W('kredit belum terkonfirmasi', 'aturan konten', 'kredit dikembalikan'), tier: T('Standar', 'Komersial', 'Premium') },
  vi: { search: 'Tìm quảng cáo', searchLabel: 'Tìm trong quảng cáo của bạn', clear: 'Xóa tìm kiếm', noMatch: 'Không có quảng cáo nào khớp “{q}”.', more: 'Tải thêm', untitled: 'Quảng cáo chưa có tên', versions: '{n} phiên bản', pill: P('Đang làm', 'Xong', 'Không thành công', 'Đã hủy', 'Chờ duyệt', 'Đã duyệt', 'Cần chỉnh sửa'), why: W('chưa xác nhận tín dụng', 'quy định nội dung', 'đã hoàn tín dụng'), tier: T('Tiêu chuẩn', 'Thương mại', 'Cao cấp') },
}

/** As frases da lista na língua da interface (língua desconhecida = inglês). */
export function adsListCopy(language: InterfaceLanguage | string | null | undefined): AdsListCopy {
  return (typeof language === 'string' && (ADS_LIST_COPY as Record<string, AdsListCopy>)[language]) || ADS_LIST_COPY.en
}

/** O nível na língua da interface (o nome da escolha de nível do quadro); desconhecido = o id cru. Pura. */
export function adsListTier(tier: unknown, c: AdsListCopy): string {
  return tier === 'photo_motion' || tier === 'commercial' || tier === 'cinema' ? c.tier[tier] : str(tier)
}

/**
 * O visual da lista (escopo .stu.adv2, como AD_BRANDS_CSS). Há ">" nos seletores: injetado SÓ por dangerouslySetInnerHTML.
 * "Fazendo" pulsa de leve; prefers-reduced-motion desliga. Linha: miniatura 9:16 | título + detalhes | selo + Abrir.
 */
export const ADS_LIST_CSS = `
html .stu.adv2 .adbr-list .adl-tools{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;min-width:0}
html .stu.adv2 .adbr-list .adl-tools>.adbr-chips{flex:1 1 320px;min-width:0;margin-bottom:0}
html .stu.adv2 .adbr-list .adl-search{position:relative;flex:0 1 260px;min-width:0;margin-left:auto}
html .stu.adv2 .adbr-list .adl-search>input{width:100%;min-height:38px;padding:8px 34px 8px 12px;border-radius:11px;border:1px solid var(--ads-line,#d5e0ec);background:var(--ads-soft,#eef3f9);color:var(--ads-text,#17273b);font:inherit;font-size:13.5px}
html .stu.adv2 .adbr-list .adl-search>input:focus{outline:2px solid var(--ads-accent,#1766d3);outline-offset:1px}
html .stu.adv2 .adbr-list .adl-search>button{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:30px;height:30px;border:0;border-radius:8px;background:transparent;color:var(--ads-muted,#586c83);font-size:16px;cursor:pointer}
html .stu.adv2 .adbr-list ul.adl{gap:8px}
html .stu.adv2 .adbr-list ul.adl>li{display:grid;grid-template-columns:44px minmax(0,1fr) auto;align-items:center;gap:12px;padding:8px 12px 8px 8px}
html .stu.adv2 .adbr-list .adl-th{position:relative;flex:0 0 auto;width:44px;height:58px;border-radius:9px;overflow:hidden;background:var(--ads-tint,#eaf2ff);display:flex;align-items:center;justify-content:center;color:var(--ads-accent,#1766d3);font-size:18px;font-weight:800}
html .stu.adv2 .adbr-list .adl-th>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
html .stu.adv2 .adbr-list .adl-mid{min-width:0;display:grid;gap:3px}
html .stu.adv2 .adbr-list .adl-top{display:flex;align-items:center;gap:8px;min-width:0}
html .stu.adv2 .adbr-list .adl-top>.t{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:700}
html .stu.adv2 .adbr-list .adl-top>.b{flex:0 0 auto;max-width:40%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:999px;background:var(--ads-tint,#eaf2ff);color:var(--ads-accent,#1766d3)}
html .stu.adv2 .adbr-list .adl-meta{font-size:12px;color:var(--ads-muted,#586c83);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
html .stu.adv2 .adbr-list .adl-end{display:flex;align-items:center;gap:12px;justify-self:end}
html .stu.adv2 .adbr-list .adl-end>a{font-size:13px;font-weight:700;color:var(--ads-accent,#1766d3);white-space:nowrap}
html .stu.adv2 .adbr-list .adl-pill{display:inline-flex;align-items:center;gap:6px;max-width:340px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border:1px solid transparent}
html .stu.adv2 .adbr-list .adl-pill>i{flex:0 0 auto;width:7px;height:7px;border-radius:50%;background:currentColor}
html .stu.adv2 .adbr-list .adl-pill>small{font-size:11.5px;font-weight:600;opacity:.85;overflow:hidden;text-overflow:ellipsis}
html .stu.adv2 .adbr-list .adl-pill.making{background:rgba(23,102,211,.1);color:#1766d3}
html .stu.adv2 .adbr-list .adl-pill.making>i{animation:adl-pulse 1.4s ease-in-out infinite}
html .stu.adv2 .adbr-list .adl-pill.ready{background:rgba(22,140,86,.12);color:#13804f}
html .stu.adv2 .adbr-list .adl-pill.approved{background:rgba(22,140,86,.16);color:#0f6d42;border-color:rgba(22,140,86,.35)}
html .stu.adv2 .adbr-list .adl-pill.needs_approval{background:rgba(214,140,10,.14);color:#9a5d00}
html .stu.adv2 .adbr-list .adl-pill.changes{background:rgba(214,90,10,.13);color:#a8420a}
html .stu.adv2 .adbr-list .adl-pill.failed{background:rgba(210,58,82,.11);color:#c02d47}
html .stu.adv2 .adbr-list .adl-pill.cancelled{background:var(--ads-soft,#eef3f9);color:var(--ads-muted,#586c83);border-color:var(--ads-line,#d5e0ec)}
html .stu.adv2 .adbr-list .adl-more{display:block;margin:12px auto 0;min-height:40px;padding:8px 18px;border-radius:11px;border:1px solid var(--ads-line,#d5e0ec);background:var(--ads-card,#fff);color:var(--ads-accent,#1766d3);font:inherit;font-size:13.5px;font-weight:700;cursor:pointer}
html .stu.adv2 .adbr-list .adl-more:disabled{opacity:.55;cursor:default}
@keyframes adl-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.7)}}
html[data-theme=dark] .stu.adv2 .adbr-list .adl-pill.making{color:#7fb4ff}
html[data-theme=dark] .stu.adv2 .adbr-list .adl-pill.ready,html[data-theme=dark] .stu.adv2 .adbr-list .adl-pill.approved{color:#5fd39a}
html[data-theme=dark] .stu.adv2 .adbr-list .adl-pill.needs_approval{color:#f3b54a}
html[data-theme=dark] .stu.adv2 .adbr-list .adl-pill.changes{color:#ff9a5c}
html[data-theme=dark] .stu.adv2 .adbr-list .adl-pill.failed{color:#ff7d92}
@media (prefers-reduced-motion:reduce){html .stu.adv2 .adbr-list .adl-pill.making>i{animation:none}}
@media(max-width:560px){html .stu.adv2 .adbr-list ul.adl>li{grid-template-columns:44px minmax(0,1fr);row-gap:8px}html .stu.adv2 .adbr-list .adl-end{grid-column:2;justify-self:stretch;min-width:0;flex-wrap:wrap;row-gap:6px}html .stu.adv2 .adbr-list .adl-top{flex-wrap:wrap;row-gap:4px}html .stu.adv2 .adbr-list .adl-top>.t{flex:1 1 100%;white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}html .stu.adv2 .adbr-list .adl-meta{white-space:normal}html .stu.adv2 .adbr-list .adl-search{flex:1 1 100%;margin-left:0}html .stu.adv2 .adbr-list .adl-pill{max-width:100%;min-width:0;white-space:normal}}
`

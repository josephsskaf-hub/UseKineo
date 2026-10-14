// KINEO-ADS-MARCAS-1510 — MARCAS (clientes) no Studio Ads: um espaço por marca de cliente (fundador 15/10/2026: "Ads perfeito
// para agência usar sozinha, hoje").
//
// O PROBLEMA: a agência com 10 lojas de cliente misturava tudo numa conta com UM kit da marca salvo (public.ads_brand_kits,
// KINEO-ADS-UX-MARCA-2026-10-10). Trocar de cliente = redigitar nome, cor, logo e contato; o kit de um cliente vazava no
// anúncio do outro (o conserto KINEO-ADS-PALCO-VOLTAR-1410 tirava o kit, mas não havia OUTRO para pôr).
//
// AGORA: public.ad_brands (migrations_pending/2026-10-15_ad_brands.sql). Cada marca guarda nome (o do cartão final), logo,
// duas cores, contato/CTA, site, preço/oferta, língua padrão da voz, pronúncia opcional e notas. As marcas são do DONO do
// workspace (lib/ads/workspace.ts): conta sozinha = ela mesma; equipe Business = o dono, e as 3 vagas veem e usam as mesmas
// marcas. O pedido grava ads_v2_orders.brand_id; a lista "Seus anúncios" filtra por marca.
//
// SEM A MIGRATION: GET /api/ads/brands devolve { ready: false } e a tela segue EXATAMENTE como antes (o kit único).
//
// LIB PURA (só funções puras e `import type`; os imports de valor abaixo são libs puras também). Nada aqui chama rota,
// cobra crédito ou decide preço.
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'
import type { AdsBrandKit } from '@/lib/ads/v2SimpleUx'
import { brandKitConflict } from '@/lib/ads/v2PalcoVoltar'
import { sanitizeAdsV2Pronounce, ADS_V2_PRONOUNCE_MAX_CHARS } from '@/lib/ads/v2Pronounce'

/** A tabela (migrations_pending/2026-10-15_ad_brands.sql). */
export const AD_BRANDS_TABLE = 'ad_brands'
/** Colunas lidas pela rota (nunca `select *`). */
export const AD_BRAND_COLUMNS =
  'id, owner_id, created_by, name, logo_footage_id, color, color2, price, contact, website, voice_language, pronounce_word, pronounce_say, notes, from_legacy_kit, created_at, updated_at'

/** Tetos dos campos (os do cartão final são os mesmos do kit antigo: 60/60/80). */
export const AD_BRAND_MAX = { name: 60, price: 60, contact: 80, website: 200, notes: 1000, pronounce: ADS_V2_PRONOUNCE_MAX_CHARS } as const

/** Quantas marcas vivas o workspace guarda. Business (agência, 3 vagas) e conta interna: muitas; o resto: 1 (o kit de sempre, agora com nome). */
export const AD_BRANDS_AGENCY_LIMIT = 50
export const AD_BRANDS_SOLO_LIMIT = 1
/** Nome da 1ª marca migrada de um kit antigo sem nome. */
export const AD_BRAND_LEGACY_NAME = 'My brand'

export interface AdBrandFields {
  name: string
  logo_footage_id: string | null
  color: string | null
  color2: string | null
  price: string | null
  contact: string | null
  website: string | null
  voice_language: string | null
  pronounce_word: string | null
  pronounce_say: string | null
  notes: string | null
}

/** O que a tela recebe (nada de owner_id/created_by: a tela não precisa saber de quem é a conta dona). */
export interface AdBrandView extends AdBrandFields {
  id: string
  /** URL pública do logo no NOSSO bucket (posse conferida); null = sem logo ou logo que não é mais do dono. */
  logo_url: string | null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const HEX_RE = /^#[0-9a-f]{6}$/i
const LANG_RE = /^[a-z]{2}$/
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g

export const isAdBrandId = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v)

function line(v: unknown, max: number): string | null | undefined {
  if (v === null || v === undefined) return null
  if (typeof v !== 'string') return undefined
  const t = v.replace(CONTROL_RE, ' ').replace(/\s+/g, ' ').trim()
  if (t.length > max) return undefined
  return t || null
}

/** Site: aceita "loja.com.br" (vira https://loja.com.br); só http(s), sem espaço. null = vazio; undefined = inválido. */
export function adBrandWebsite(v: unknown): string | null | undefined {
  const t = line(v, AD_BRAND_MAX.website)
  if (t === null || t === undefined) return t
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`
  if (/\s/.test(withScheme)) return undefined
  try {
    const u = new URL(withScheme)
    if (!/^https?:$/.test(u.protocol) || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname)) return undefined
    return withScheme.length > AD_BRAND_MAX.website ? undefined : withScheme
  } catch {
    return undefined
  }
}

/** O domínio do site da marca, sem www (para casar com o domínio do link do anúncio). */
export function adBrandHost(website: string | null | undefined): string {
  try { return website ? new URL(website).hostname.replace(/^www\./i, '').toLowerCase() : '' } catch { return '' }
}

const ALLOWED_KEYS = ['name', 'logo_footage_id', 'color', 'color2', 'price', 'contact', 'website', 'voice_language', 'pronounce_word', 'pronounce_say', 'notes'] as const

/**
 * O corpo do POST/PATCH de /api/ads/brands. `partial` (PATCH): só as chaves presentes. Chave fora da lista = 'bad_field'
 * (owner_id, created_by, from_legacy_kit e archived_at NUNCA vêm do corpo: o dono é sempre o workspace da sessão). Pura.
 */
export function sanitizeAdBrand(
  raw: unknown,
  opts: { partial?: boolean } = {},
): { ok: true; value: Partial<AdBrandFields> } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'bad_body' }
  const b = raw as Record<string, unknown>
  if (Object.keys(b).some((k) => !(ALLOWED_KEYS as readonly string[]).includes(k))) return { ok: false, error: 'bad_field' }
  const has = (k: string) => Object.prototype.hasOwnProperty.call(b, k)
  const out: Partial<AdBrandFields> = {}
  if (!opts.partial || has('name')) {
    const name = line(b.name, AD_BRAND_MAX.name)
    if (!name) return { ok: false, error: 'name_required' }
    out.name = name
  }
  if (has('logo_footage_id')) {
    if (b.logo_footage_id === null || b.logo_footage_id === undefined || b.logo_footage_id === '') out.logo_footage_id = null
    else if (!isAdBrandId(b.logo_footage_id)) return { ok: false, error: 'bad_logo' }
    else out.logo_footage_id = b.logo_footage_id.toLowerCase()
  }
  for (const k of ['color', 'color2'] as const) {
    if (!has(k)) continue
    const v = b[k]
    if (v === null || v === undefined || v === '') out[k] = null
    else if (typeof v !== 'string' || !HEX_RE.test(v)) return { ok: false, error: 'bad_color' }
    else out[k] = v.toLowerCase()
  }
  for (const k of ['price', 'contact', 'notes'] as const) {
    if (!has(k)) continue
    const v = line(b[k], AD_BRAND_MAX[k])
    if (v === undefined) return { ok: false, error: 'bad_text' }
    out[k] = v
  }
  if (has('website')) {
    const w = adBrandWebsite(b.website)
    if (w === undefined) return { ok: false, error: 'bad_website' }
    out.website = w
  }
  if (has('voice_language')) {
    const v = b.voice_language
    if (v === null || v === undefined || v === '') out.voice_language = null
    else if (typeof v !== 'string' || !LANG_RE.test(v.trim().toLowerCase())) return { ok: false, error: 'bad_language' }
    else out.voice_language = v.trim().toLowerCase()
  }
  for (const k of ['pronounce_word', 'pronounce_say'] as const) {
    if (!has(k)) continue
    const v = line(b[k], AD_BRAND_MAX.pronounce)
    if (v === undefined) return { ok: false, error: 'bad_pronounce' }
    out[k] = v
  }
  // A pronúncia é a MESMA régua do anúncio (lib/ads/v2Pronounce): só letras, até 6 palavras, nada de instrução para a voz.
  if (out.pronounce_say) {
    const word = out.pronounce_word || adBrandPronounceWord(out.name ?? '')
    if (!sanitizeAdsV2Pronounce({ word, say: out.pronounce_say })) return { ok: false, error: 'bad_pronounce' }
  }
  return { ok: true, value: out }
}

/** A palavra que a pronúncia troca quando a pessoa não escreveu uma: o nome da marca até o travessão. */
export function adBrandPronounceWord(name: string): string {
  return String(name ?? '').replace(/\s+/g, ' ').trim().split(/\s+[—–-]\s+/)[0].trim().slice(0, AD_BRAND_MAX.pronounce)
}

/** Teto de marcas vivas do workspace: Business ou conta interna = muitas; o resto = 1. Pura. */
export function adBrandLimit(ownerPlan: unknown, internal: boolean): number {
  if (internal) return AD_BRANDS_AGENCY_LIMIT
  return typeof ownerPlan === 'string' && ownerPlan.trim().toLowerCase() === 'business' ? AD_BRANDS_AGENCY_LIMIT : AD_BRANDS_SOLO_LIMIT
}

/** Pode criar mais uma? */
export function adBrandCanCreate(liveCount: number, limit: number): boolean {
  return Number.isFinite(liveCount) && liveCount >= 0 && liveCount < limit
}

/**
 * Quem pode o quê. Dono e membro da equipe: ver, criar, editar e usar (a agência trabalha junta). Arquivar (tirar da lista):
 * só o dono do workspace. Ninguém apaga de verdade pela tela (o pedido antigo continua apontando a marca). Pura.
 */
export function adBrandCan(role: 'owner' | 'member', action: 'list' | 'create' | 'edit' | 'use' | 'archive'): boolean {
  if (action === 'archive') return role === 'owner'
  return role === 'owner' || role === 'member'
}

/** Nome repetido (sem diferença de maiúsculas/acentos/espaços) entre as marcas vivas? `exceptId` = a própria (na edição). */
export function adBrandNameTaken(brands: readonly { id: string; name: string }[], name: string, exceptId?: string | null): boolean {
  const n = normBrand(name)
  return !!n && brands.some((b) => b.id !== exceptId && normBrand(b.name) === n)
}

const normBrand = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/** A marca como o kit da tela (o que o cartão final usa): nome → business. */
export function adBrandToKit(b: Pick<AdBrandFields, 'name' | 'logo_footage_id' | 'color' | 'price' | 'contact'>): AdsBrandKit {
  return { business: b.name || null, logo_footage_id: b.logo_footage_id ?? null, color: b.color ?? null, price: b.price ?? null, contact: b.contact ?? null }
}

/** O kit antigo (ads_brand_kits) vira a 1ª marca: os mesmos campos; sem nome = "My brand". Kit vazio = null (nada a migrar). */
export function adBrandFromLegacyKit(kit: Partial<AdsBrandKit> | null | undefined): AdBrandFields | null {
  if (!kit) return null
  const t = (v: unknown, max: number) => (typeof v === 'string' && v.replace(/\s+/g, ' ').trim() ? v.replace(/\s+/g, ' ').trim().slice(0, max) : null)
  const business = t(kit.business, AD_BRAND_MAX.name)
  const logo = typeof kit.logo_footage_id === 'string' && UUID_RE.test(kit.logo_footage_id) ? kit.logo_footage_id.toLowerCase() : null
  const color = typeof kit.color === 'string' && HEX_RE.test(kit.color) ? kit.color.toLowerCase() : null
  const price = t(kit.price, AD_BRAND_MAX.price)
  const contact = t(kit.contact, AD_BRAND_MAX.contact)
  if (!business && !logo && !color && !price && !contact) return null
  return { name: business ?? AD_BRAND_LEGACY_NAME, logo_footage_id: logo, color, color2: null, price, contact, website: null, voice_language: null, pronounce_word: null, pronounce_say: null, notes: null }
}

/**
 * "Salvar" do anúncio com marcas: o cartão final de agora vira os campos da marca. Com marca escolhida = atualiza ela (o nome
 * vazio mantém o dela); sem marca = cria uma nova, que precisa de nome (sem nome = null, nada a salvar). Pura.
 */
export function adBrandFromScreen(kit: AdsBrandKit, current: Pick<AdBrandFields, 'name'> | null): Partial<AdBrandFields> | null {
  const name = (kit.business ?? '').trim() || current?.name || ''
  if (!name) return null
  return { name: name.slice(0, AD_BRAND_MAX.name), logo_footage_id: kit.logo_footage_id, color: kit.color, price: kit.price, contact: kit.contact }
}

/** A língua padrão da voz da marca, só se for uma das línguas da narração (`codes`). */
export function adBrandVoice(brand: Pick<AdBrandFields, 'voice_language'> | null | undefined, codes: readonly string[]): string | null {
  const v = brand?.voice_language
  return typeof v === 'string' && codes.includes(v) ? v : null
}

export interface AdBrandEvidence { sentence?: string | null; linkName?: string | null; linkHost?: string | null }

/**
 * A REGRA DO KINEO-ADS-PALCO-VOLTAR-1410, por marca: o kit da marca escolhida NÃO entra (nem fica) quando a frase/o nome lido/o
 * domínio do link indicam OUTRA marca — brandKitConflict(nome da marca, evidência), a mesma função. Uma exceção, a favor da
 * marca: o link é do PRÓPRIO site cadastrado na marca (loja.com.br ↔ loja.com.br) — aí não há conflito. Pura.
 */
export function adBrandConflict(brand: Pick<AdBrandFields, 'name' | 'website'> | null | undefined, ev: AdBrandEvidence): boolean {
  if (!brand) return false
  const host = adBrandHost(brand.website)
  const linkHost = String(ev.linkHost ?? '').replace(/^www\./i, '').toLowerCase()
  if (host && linkHost && (linkHost === host || linkHost.endsWith(`.${host}`))) return false
  return brandKitConflict(brand.name, ev)
}

/**
 * Com conflito: existe UMA outra marca salva que a evidência cita? (a tela oferece "Trocar para X" — nunca troca sozinha.)
 * Mais de uma, ou nenhuma = null. Pura.
 */
export function adBrandForEvidence<T extends Pick<AdBrandFields, 'name' | 'website'> & { id: string }>(brands: readonly T[], ev: AdBrandEvidence, exceptId?: string | null): T | null {
  const hasEvidence = [ev.sentence, ev.linkName, ev.linkHost].some((x) => typeof x === 'string' && x.trim())
  if (!hasEvidence) return null
  const hits = brands.filter((b) => b.id !== exceptId && !adBrandConflict(b, ev))
  return hits.length === 1 ? hits[0] : null
}

/** O filtro da lista de pedidos: 'all' (todas), 'none' (sem marca) ou o id de uma marca. Qualquer outra coisa = 'all'. Pura. */
export type AdBrandFilter = { kind: 'all' } | { kind: 'none' } | { kind: 'one'; id: string }
export function adBrandFilter(raw: unknown): AdBrandFilter {
  if (raw === 'none') return { kind: 'none' }
  if (isAdBrandId(raw)) return { kind: 'one', id: raw.toLowerCase() }
  return { kind: 'all' }
}

/** O mesmo filtro aplicado a uma lista já carregada (a tela e o guardião usam esta). Pura. */
export function adBrandFilterOrders<T extends { brand_id?: string | null }>(orders: readonly T[], f: AdBrandFilter): T[] {
  if (f.kind === 'all') return orders.slice()
  if (f.kind === 'none') return orders.filter((o) => !o.brand_id)
  return orders.filter((o) => typeof o.brand_id === 'string' && o.brand_id.toLowerCase() === f.id)
}

/** Status que entram na lista "Seus anúncios" (rascunho e plano não: nascem a cada tecla e somem). */
export const AD_BRAND_LIST_STATUSES = ['generating', 'assembling', 'delivered', 'failed', 'cancelled'] as const

// ─── as frases (16 línguas; nenhuma cai no inglês) ────────────────────────────────────────────────────────────────────

export interface AdBrandCopy {
  brand: string
  none: string
  add: string
  edit: string
  newTitle: string
  editTitle: string
  name: string
  logo: string
  logoUpload: string
  logoRemove: string
  color: string
  color2: string
  contact: string
  website: string
  price: string
  voice: string
  voiceAuto: string
  pronounce: string
  notes: string
  save: string
  cancel: string
  archive: string
  errName: string
  errDup: string
  /** {n} = o teto do plano, {max} = o teto do Business */
  errLimit: string
  errFailed: string
  errPronounce: string
  team: string
  yourAds: string
  allBrands: string
  emptyList: string
  open: string
  status: { generating: string; assembling: string; delivered: string; failed: string; cancelled: string }
  /** {name} */
  saveToBrand: string
  saveAsNew: string
  /** {name} */
  switchTo: string
}

const S = (generating: string, assembling: string, delivered: string, failed: string, cancelled: string) => ({ generating, assembling, delivered, failed, cancelled })

export const AD_BRAND_COPY: Record<InterfaceLanguage, AdBrandCopy> = {
  en: { brand: 'Brand', none: 'No brand', add: '+ New brand', edit: 'Edit brand', newTitle: 'New brand', editTitle: 'Edit brand', name: 'Brand name (end card)', logo: 'Logo', logoUpload: 'Upload logo', logoRemove: 'Remove', color: 'Main color', color2: 'Second color', contact: 'Contact / CTA', website: 'Website', price: 'Price or offer', voice: 'Default voice language', voiceAuto: 'Automatic', pronounce: 'How the voice says the name (optional)', notes: 'Notes for the team', save: 'Save brand', cancel: 'Cancel', archive: 'Archive brand', errName: 'Give the brand a name.', errDup: 'A brand with this name already exists.', errLimit: 'Your plan keeps {n} brand. Business: up to {max} client brands.', errFailed: 'Could not save the brand. Try again.', errPronounce: 'Pronunciation: letters only, up to 6 words.', team: 'Shared with your team', yourAds: 'Your ads', allBrands: 'All brands', emptyList: 'No ads here yet.', open: 'Open', status: S('Making', 'Editing', 'Ready', 'Did not work', 'Cancelled'), saveToBrand: 'Update “{name}” with these details', saveAsNew: 'Save as a new brand', switchTo: 'Switch to {name}' },
  pt: { brand: 'Marca', none: 'Sem marca', add: '+ Nova marca', edit: 'Editar marca', newTitle: 'Nova marca', editTitle: 'Editar marca', name: 'Nome da marca (cartão final)', logo: 'Logo', logoUpload: 'Enviar logo', logoRemove: 'Remover', color: 'Cor principal', color2: 'Segunda cor', contact: 'Contato / chamada', website: 'Site', price: 'Preço ou oferta', voice: 'Língua padrão da voz', voiceAuto: 'Automática', pronounce: 'Como a voz fala o nome (opcional)', notes: 'Notas para a equipe', save: 'Salvar marca', cancel: 'Cancelar', archive: 'Arquivar marca', errName: 'Dê um nome à marca.', errDup: 'Já existe uma marca com este nome.', errLimit: 'Seu plano guarda {n} marca. Business: até {max} marcas de clientes.', errFailed: 'Não deu para salvar a marca. Tente de novo.', errPronounce: 'Pronúncia: só letras, até 6 palavras.', team: 'Compartilhada com a equipe', yourAds: 'Seus anúncios', allBrands: 'Todas as marcas', emptyList: 'Nenhum anúncio aqui ainda.', open: 'Abrir', status: S('Fazendo', 'Editando', 'Pronto', 'Não funcionou', 'Cancelado'), saveToBrand: 'Atualizar “{name}” com estes dados', saveAsNew: 'Salvar como nova marca', switchTo: 'Trocar para {name}' },
  es: { brand: 'Marca', none: 'Sin marca', add: '+ Nueva marca', edit: 'Editar marca', newTitle: 'Nueva marca', editTitle: 'Editar marca', name: 'Nombre de la marca (cierre)', logo: 'Logo', logoUpload: 'Subir logo', logoRemove: 'Quitar', color: 'Color principal', color2: 'Segundo color', contact: 'Contacto / llamada', website: 'Sitio web', price: 'Precio u oferta', voice: 'Idioma de voz por defecto', voiceAuto: 'Automático', pronounce: 'Cómo dice la voz el nombre (opcional)', notes: 'Notas para el equipo', save: 'Guardar marca', cancel: 'Cancelar', archive: 'Archivar marca', errName: 'Ponle un nombre a la marca.', errDup: 'Ya existe una marca con este nombre.', errLimit: 'Tu plan guarda {n} marca. Business: hasta {max} marcas de clientes.', errFailed: 'No se pudo guardar la marca. Inténtalo de nuevo.', errPronounce: 'Pronunciación: solo letras, hasta 6 palabras.', team: 'Compartida con tu equipo', yourAds: 'Tus anuncios', allBrands: 'Todas las marcas', emptyList: 'Aún no hay anuncios aquí.', open: 'Abrir', status: S('Creando', 'Editando', 'Listo', 'No funcionó', 'Cancelado'), saveToBrand: 'Actualizar “{name}” con estos datos', saveAsNew: 'Guardar como nueva marca', switchTo: 'Cambiar a {name}' },
  fr: { brand: 'Marque', none: 'Sans marque', add: '+ Nouvelle marque', edit: 'Modifier la marque', newTitle: 'Nouvelle marque', editTitle: 'Modifier la marque', name: 'Nom de la marque (carton final)', logo: 'Logo', logoUpload: 'Importer le logo', logoRemove: 'Retirer', color: 'Couleur principale', color2: 'Deuxième couleur', contact: 'Contact / appel à l’action', website: 'Site web', price: 'Prix ou offre', voice: 'Langue de la voix par défaut', voiceAuto: 'Automatique', pronounce: 'Comment la voix dit le nom (facultatif)', notes: 'Notes pour l’équipe', save: 'Enregistrer la marque', cancel: 'Annuler', archive: 'Archiver la marque', errName: 'Donnez un nom à la marque.', errDup: 'Une marque porte déjà ce nom.', errLimit: 'Votre offre garde {n} marque. Business : jusqu’à {max} marques clientes.', errFailed: 'Impossible d’enregistrer la marque. Réessayez.', errPronounce: 'Prononciation : lettres seulement, 6 mots maximum.', team: 'Partagée avec votre équipe', yourAds: 'Vos pubs', allBrands: 'Toutes les marques', emptyList: 'Aucune pub ici pour l’instant.', open: 'Ouvrir', status: S('En cours', 'Montage', 'Prête', 'Échec', 'Annulée'), saveToBrand: 'Mettre à jour « {name} » avec ces infos', saveAsNew: 'Enregistrer comme nouvelle marque', switchTo: 'Passer à {name}' },
  de: { brand: 'Marke', none: 'Keine Marke', add: '+ Neue Marke', edit: 'Marke bearbeiten', newTitle: 'Neue Marke', editTitle: 'Marke bearbeiten', name: 'Markenname (Endkarte)', logo: 'Logo', logoUpload: 'Logo hochladen', logoRemove: 'Entfernen', color: 'Hauptfarbe', color2: 'Zweite Farbe', contact: 'Kontakt / Aufruf', website: 'Website', price: 'Preis oder Angebot', voice: 'Standardsprache der Stimme', voiceAuto: 'Automatisch', pronounce: 'So spricht die Stimme den Namen (optional)', notes: 'Notizen fürs Team', save: 'Marke speichern', cancel: 'Abbrechen', archive: 'Marke archivieren', errName: 'Gib der Marke einen Namen.', errDup: 'Eine Marke mit diesem Namen gibt es schon.', errLimit: 'Dein Plan speichert {n} Marke. Business: bis zu {max} Kundenmarken.', errFailed: 'Marke konnte nicht gespeichert werden. Bitte erneut versuchen.', errPronounce: 'Aussprache: nur Buchstaben, höchstens 6 Wörter.', team: 'Mit deinem Team geteilt', yourAds: 'Deine Anzeigen', allBrands: 'Alle Marken', emptyList: 'Hier gibt es noch keine Anzeigen.', open: 'Öffnen', status: S('In Arbeit', 'Schnitt', 'Fertig', 'Fehlgeschlagen', 'Abgebrochen'), saveToBrand: '„{name}“ mit diesen Angaben aktualisieren', saveAsNew: 'Als neue Marke speichern', switchTo: 'Zu {name} wechseln' },
  it: { brand: 'Brand', none: 'Nessun brand', add: '+ Nuovo brand', edit: 'Modifica brand', newTitle: 'Nuovo brand', editTitle: 'Modifica brand', name: 'Nome del brand (schermata finale)', logo: 'Logo', logoUpload: 'Carica logo', logoRemove: 'Rimuovi', color: 'Colore principale', color2: 'Secondo colore', contact: 'Contatto / invito all’azione', website: 'Sito web', price: 'Prezzo o offerta', voice: 'Lingua della voce predefinita', voiceAuto: 'Automatica', pronounce: 'Come la voce dice il nome (facoltativo)', notes: 'Note per il team', save: 'Salva brand', cancel: 'Annulla', archive: 'Archivia brand', errName: 'Dai un nome al brand.', errDup: 'Esiste già un brand con questo nome.', errLimit: 'Il tuo piano tiene {n} brand. Business: fino a {max} brand clienti.', errFailed: 'Impossibile salvare il brand. Riprova.', errPronounce: 'Pronuncia: solo lettere, massimo 6 parole.', team: 'Condiviso con il team', yourAds: 'I tuoi annunci', allBrands: 'Tutti i brand', emptyList: 'Ancora nessun annuncio qui.', open: 'Apri', status: S('In corso', 'Montaggio', 'Pronto', 'Non riuscito', 'Annullato'), saveToBrand: 'Aggiorna “{name}” con questi dati', saveAsNew: 'Salva come nuovo brand', switchTo: 'Passa a {name}' },
  nl: { brand: 'Merk', none: 'Geen merk', add: '+ Nieuw merk', edit: 'Merk bewerken', newTitle: 'Nieuw merk', editTitle: 'Merk bewerken', name: 'Merknaam (eindkaart)', logo: 'Logo', logoUpload: 'Logo uploaden', logoRemove: 'Weghalen', color: 'Hoofdkleur', color2: 'Tweede kleur', contact: 'Contact / oproep', website: 'Website', price: 'Prijs of aanbieding', voice: 'Standaardtaal van de stem', voiceAuto: 'Automatisch', pronounce: 'Hoe de stem de naam zegt (optioneel)', notes: 'Notities voor het team', save: 'Merk opslaan', cancel: 'Annuleren', archive: 'Merk archiveren', errName: 'Geef het merk een naam.', errDup: 'Er bestaat al een merk met deze naam.', errLimit: 'Je abonnement bewaart {n} merk. Business: tot {max} klantmerken.', errFailed: 'Merk opslaan mislukt. Probeer opnieuw.', errPronounce: 'Uitspraak: alleen letters, maximaal 6 woorden.', team: 'Gedeeld met je team', yourAds: 'Je advertenties', allBrands: 'Alle merken', emptyList: 'Nog geen advertenties hier.', open: 'Openen', status: S('Bezig', 'Montage', 'Klaar', 'Mislukt', 'Geannuleerd'), saveToBrand: '“{name}” bijwerken met deze gegevens', saveAsNew: 'Opslaan als nieuw merk', switchTo: 'Overschakelen naar {name}' },
  pl: { brand: 'Marka', none: 'Bez marki', add: '+ Nowa marka', edit: 'Edytuj markę', newTitle: 'Nowa marka', editTitle: 'Edytuj markę', name: 'Nazwa marki (plansza końcowa)', logo: 'Logo', logoUpload: 'Wgraj logo', logoRemove: 'Usuń', color: 'Kolor główny', color2: 'Drugi kolor', contact: 'Kontakt / wezwanie', website: 'Strona www', price: 'Cena lub oferta', voice: 'Domyślny język głosu', voiceAuto: 'Automatycznie', pronounce: 'Jak głos wymawia nazwę (opcjonalnie)', notes: 'Notatki dla zespołu', save: 'Zapisz markę', cancel: 'Anuluj', archive: 'Zarchiwizuj markę', errName: 'Nadaj marce nazwę.', errDup: 'Marka o tej nazwie już istnieje.', errLimit: 'Twój plan przechowuje {n} markę. Business: do {max} marek klientów.', errFailed: 'Nie udało się zapisać marki. Spróbuj ponownie.', errPronounce: 'Wymowa: tylko litery, do 6 słów.', team: 'Udostępniona zespołowi', yourAds: 'Twoje reklamy', allBrands: 'Wszystkie marki', emptyList: 'Nie ma tu jeszcze reklam.', open: 'Otwórz', status: S('W trakcie', 'Montaż', 'Gotowa', 'Nie wyszło', 'Anulowana'), saveToBrand: 'Zaktualizuj „{name}” tymi danymi', saveAsNew: 'Zapisz jako nową markę', switchTo: 'Przełącz na {name}' },
  tr: { brand: 'Marka', none: 'Marka yok', add: '+ Yeni marka', edit: 'Markayı düzenle', newTitle: 'Yeni marka', editTitle: 'Markayı düzenle', name: 'Marka adı (kapanış kartı)', logo: 'Logo', logoUpload: 'Logo yükle', logoRemove: 'Kaldır', color: 'Ana renk', color2: 'İkinci renk', contact: 'İletişim / çağrı', website: 'Web sitesi', price: 'Fiyat veya teklif', voice: 'Varsayılan ses dili', voiceAuto: 'Otomatik', pronounce: 'Sesin adı nasıl söyleyeceği (isteğe bağlı)', notes: 'Ekip için notlar', save: 'Markayı kaydet', cancel: 'Vazgeç', archive: 'Markayı arşivle', errName: 'Markaya bir ad verin.', errDup: 'Bu adla bir marka zaten var.', errLimit: 'Planınız {n} marka saklar. Business: en fazla {max} müşteri markası.', errFailed: 'Marka kaydedilemedi. Tekrar deneyin.', errPronounce: 'Telaffuz: yalnızca harf, en fazla 6 kelime.', team: 'Ekibinizle paylaşılır', yourAds: 'Reklamlarınız', allBrands: 'Tüm markalar', emptyList: 'Burada henüz reklam yok.', open: 'Aç', status: S('Hazırlanıyor', 'Kurgu', 'Hazır', 'Olmadı', 'İptal'), saveToBrand: '“{name}” bu bilgilerle güncellensin', saveAsNew: 'Yeni marka olarak kaydet', switchTo: '{name} markasına geç' },
  ru: { brand: 'Бренд', none: 'Без бренда', add: '+ Новый бренд', edit: 'Изменить бренд', newTitle: 'Новый бренд', editTitle: 'Изменить бренд', name: 'Название бренда (финальная карточка)', logo: 'Логотип', logoUpload: 'Загрузить логотип', logoRemove: 'Убрать', color: 'Основной цвет', color2: 'Второй цвет', contact: 'Контакт / призыв', website: 'Сайт', price: 'Цена или предложение', voice: 'Язык голоса по умолчанию', voiceAuto: 'Автоматически', pronounce: 'Как голос произносит название (необязательно)', notes: 'Заметки для команды', save: 'Сохранить бренд', cancel: 'Отмена', archive: 'В архив', errName: 'Дайте бренду название.', errDup: 'Бренд с таким названием уже есть.', errLimit: 'Ваш тариф хранит {n} бренд. Business: до {max} брендов клиентов.', errFailed: 'Не удалось сохранить бренд. Попробуйте ещё раз.', errPronounce: 'Произношение: только буквы, до 6 слов.', team: 'Доступен вашей команде', yourAds: 'Ваша реклама', allBrands: 'Все бренды', emptyList: 'Здесь пока нет рекламы.', open: 'Открыть', status: S('Создаётся', 'Монтаж', 'Готово', 'Не получилось', 'Отменено'), saveToBrand: 'Обновить «{name}» этими данными', saveAsNew: 'Сохранить как новый бренд', switchTo: 'Переключить на {name}' },
  uk: { brand: 'Бренд', none: 'Без бренду', add: '+ Новий бренд', edit: 'Змінити бренд', newTitle: 'Новий бренд', editTitle: 'Змінити бренд', name: 'Назва бренду (фінальна картка)', logo: 'Логотип', logoUpload: 'Завантажити логотип', logoRemove: 'Прибрати', color: 'Основний колір', color2: 'Другий колір', contact: 'Контакт / заклик', website: 'Сайт', price: 'Ціна або пропозиція', voice: 'Мова голосу за замовчуванням', voiceAuto: 'Автоматично', pronounce: 'Як голос вимовляє назву (необовʼязково)', notes: 'Нотатки для команди', save: 'Зберегти бренд', cancel: 'Скасувати', archive: 'В архів', errName: 'Дайте бренду назву.', errDup: 'Бренд з такою назвою вже є.', errLimit: 'Ваш тариф зберігає {n} бренд. Business: до {max} брендів клієнтів.', errFailed: 'Не вдалося зберегти бренд. Спробуйте ще раз.', errPronounce: 'Вимова: лише літери, до 6 слів.', team: 'Доступний вашій команді', yourAds: 'Ваша реклама', allBrands: 'Усі бренди', emptyList: 'Тут поки немає реклами.', open: 'Відкрити', status: S('Створюється', 'Монтаж', 'Готово', 'Не вийшло', 'Скасовано'), saveToBrand: 'Оновити «{name}» цими даними', saveAsNew: 'Зберегти як новий бренд', switchTo: 'Перемкнути на {name}' },
  ar: { brand: 'العلامة', none: 'بدون علامة', add: '+ علامة جديدة', edit: 'تعديل العلامة', newTitle: 'علامة جديدة', editTitle: 'تعديل العلامة', name: 'اسم العلامة (البطاقة الأخيرة)', logo: 'الشعار', logoUpload: 'رفع الشعار', logoRemove: 'إزالة', color: 'اللون الرئيسي', color2: 'اللون الثاني', contact: 'التواصل / الدعوة', website: 'الموقع', price: 'السعر أو العرض', voice: 'لغة الصوت الافتراضية', voiceAuto: 'تلقائي', pronounce: 'كيف ينطق الصوت الاسم (اختياري)', notes: 'ملاحظات للفريق', save: 'حفظ العلامة', cancel: 'إلغاء', archive: 'أرشفة العلامة', errName: 'أعطِ العلامة اسمًا.', errDup: 'توجد علامة بهذا الاسم بالفعل.', errLimit: 'خطتك تحفظ {n} علامة. Business: حتى {max} علامة للعملاء.', errFailed: 'تعذّر حفظ العلامة. حاول مجددًا.', errPronounce: 'النطق: حروف فقط، حتى 6 كلمات.', team: 'مشتركة مع فريقك', yourAds: 'إعلاناتك', allBrands: 'كل العلامات', emptyList: 'لا توجد إعلانات هنا بعد.', open: 'فتح', status: S('قيد الإنشاء', 'قيد المونتاج', 'جاهز', 'لم ينجح', 'أُلغي'), saveToBrand: 'تحديث «{name}» بهذه البيانات', saveAsNew: 'حفظ كعلامة جديدة', switchTo: 'التبديل إلى {name}' },
  ur: { brand: 'برانڈ', none: 'کوئی برانڈ نہیں', add: '+ نیا برانڈ', edit: 'برانڈ میں ترمیم', newTitle: 'نیا برانڈ', editTitle: 'برانڈ میں ترمیم', name: 'برانڈ کا نام (آخری کارڈ)', logo: 'لوگو', logoUpload: 'لوگو اپ لوڈ کریں', logoRemove: 'ہٹائیں', color: 'بنیادی رنگ', color2: 'دوسرا رنگ', contact: 'رابطہ / دعوت', website: 'ویب سائٹ', price: 'قیمت یا آفر', voice: 'آواز کی طے شدہ زبان', voiceAuto: 'خودکار', pronounce: 'آواز نام کیسے بولے (اختیاری)', notes: 'ٹیم کے لیے نوٹس', save: 'برانڈ محفوظ کریں', cancel: 'منسوخ', archive: 'برانڈ آرکائیو کریں', errName: 'برانڈ کا نام لکھیں۔', errDup: 'اس نام کا برانڈ پہلے سے موجود ہے۔', errLimit: 'آپ کا پلان {n} برانڈ رکھتا ہے۔ Business: {max} تک کلائنٹ برانڈز۔', errFailed: 'برانڈ محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔', errPronounce: 'تلفظ: صرف حروف، زیادہ سے زیادہ 6 الفاظ۔', team: 'آپ کی ٹیم کے ساتھ شیئر', yourAds: 'آپ کے اشتہارات', allBrands: 'تمام برانڈز', emptyList: 'یہاں ابھی کوئی اشتہار نہیں۔', open: 'کھولیں', status: S('بن رہا ہے', 'ایڈٹ ہو رہا ہے', 'تیار', 'کام نہیں ہوا', 'منسوخ'), saveToBrand: '“{name}” کو ان تفصیلات سے اپ ڈیٹ کریں', saveAsNew: 'نئے برانڈ کے طور پر محفوظ کریں', switchTo: '{name} پر جائیں' },
  hi: { brand: 'ब्रांड', none: 'कोई ब्रांड नहीं', add: '+ नया ब्रांड', edit: 'ब्रांड बदलें', newTitle: 'नया ब्रांड', editTitle: 'ब्रांड बदलें', name: 'ब्रांड का नाम (आख़िरी कार्ड)', logo: 'लोगो', logoUpload: 'लोगो अपलोड करें', logoRemove: 'हटाएँ', color: 'मुख्य रंग', color2: 'दूसरा रंग', contact: 'संपर्क / कॉल टू एक्शन', website: 'वेबसाइट', price: 'कीमत या ऑफ़र', voice: 'आवाज़ की डिफ़ॉल्ट भाषा', voiceAuto: 'अपने आप', pronounce: 'आवाज़ नाम कैसे बोले (वैकल्पिक)', notes: 'टीम के लिए नोट्स', save: 'ब्रांड सेव करें', cancel: 'रद्द करें', archive: 'ब्रांड आर्काइव करें', errName: 'ब्रांड को नाम दें।', errDup: 'इस नाम का ब्रांड पहले से है।', errLimit: 'आपका प्लान {n} ब्रांड रखता है। Business: {max} तक क्लाइंट ब्रांड।', errFailed: 'ब्रांड सेव नहीं हो सका। फिर से कोशिश करें।', errPronounce: 'उच्चारण: सिर्फ़ अक्षर, ज़्यादा से ज़्यादा 6 शब्द।', team: 'आपकी टीम के साथ साझा', yourAds: 'आपके विज्ञापन', allBrands: 'सभी ब्रांड', emptyList: 'यहाँ अभी कोई विज्ञापन नहीं।', open: 'खोलें', status: S('बन रहा है', 'एडिट हो रहा है', 'तैयार', 'नहीं बना', 'रद्द'), saveToBrand: '“{name}” को इन जानकारियों से अपडेट करें', saveAsNew: 'नए ब्रांड के रूप में सेव करें', switchTo: '{name} पर जाएँ' },
  id: { brand: 'Merek', none: 'Tanpa merek', add: '+ Merek baru', edit: 'Ubah merek', newTitle: 'Merek baru', editTitle: 'Ubah merek', name: 'Nama merek (kartu penutup)', logo: 'Logo', logoUpload: 'Unggah logo', logoRemove: 'Hapus', color: 'Warna utama', color2: 'Warna kedua', contact: 'Kontak / ajakan', website: 'Situs web', price: 'Harga atau penawaran', voice: 'Bahasa suara bawaan', voiceAuto: 'Otomatis', pronounce: 'Cara suara menyebut nama (opsional)', notes: 'Catatan untuk tim', save: 'Simpan merek', cancel: 'Batal', archive: 'Arsipkan merek', errName: 'Beri merek sebuah nama.', errDup: 'Merek dengan nama ini sudah ada.', errLimit: 'Paket Anda menyimpan {n} merek. Business: hingga {max} merek klien.', errFailed: 'Merek gagal disimpan. Coba lagi.', errPronounce: 'Pelafalan: hanya huruf, maksimal 6 kata.', team: 'Dibagikan dengan tim Anda', yourAds: 'Iklan Anda', allBrands: 'Semua merek', emptyList: 'Belum ada iklan di sini.', open: 'Buka', status: S('Dibuat', 'Disunting', 'Siap', 'Gagal', 'Dibatalkan'), saveToBrand: 'Perbarui “{name}” dengan data ini', saveAsNew: 'Simpan sebagai merek baru', switchTo: 'Ganti ke {name}' },
  vi: { brand: 'Thương hiệu', none: 'Không thương hiệu', add: '+ Thương hiệu mới', edit: 'Sửa thương hiệu', newTitle: 'Thương hiệu mới', editTitle: 'Sửa thương hiệu', name: 'Tên thương hiệu (thẻ cuối)', logo: 'Logo', logoUpload: 'Tải logo lên', logoRemove: 'Bỏ', color: 'Màu chính', color2: 'Màu thứ hai', contact: 'Liên hệ / lời kêu gọi', website: 'Trang web', price: 'Giá hoặc ưu đãi', voice: 'Ngôn ngữ giọng mặc định', voiceAuto: 'Tự động', pronounce: 'Cách giọng đọc tên (không bắt buộc)', notes: 'Ghi chú cho nhóm', save: 'Lưu thương hiệu', cancel: 'Hủy', archive: 'Lưu trữ thương hiệu', errName: 'Hãy đặt tên cho thương hiệu.', errDup: 'Đã có thương hiệu trùng tên.', errLimit: 'Gói của bạn giữ {n} thương hiệu. Business: tối đa {max} thương hiệu khách hàng.', errFailed: 'Không lưu được thương hiệu. Hãy thử lại.', errPronounce: 'Cách đọc: chỉ chữ cái, tối đa 6 từ.', team: 'Chia sẻ với nhóm của bạn', yourAds: 'Quảng cáo của bạn', allBrands: 'Mọi thương hiệu', emptyList: 'Chưa có quảng cáo nào ở đây.', open: 'Mở', status: S('Đang làm', 'Đang dựng', 'Xong', 'Không thành công', 'Đã hủy'), saveToBrand: 'Cập nhật “{name}” bằng thông tin này', saveAsNew: 'Lưu thành thương hiệu mới', switchTo: 'Chuyển sang {name}' },
}

/** As frases na língua da interface (língua desconhecida = inglês). */
export function adBrandCopy(language: InterfaceLanguage | string | null | undefined): AdBrandCopy {
  return (typeof language === 'string' && (AD_BRAND_COPY as Record<string, AdBrandCopy>)[language]) || AD_BRAND_COPY.en
}

/** Troca {chave} pelo valor. */
export function adBrandFill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}

/**
 * O visual (o "Make a film" do /studio): o seletor é a caixa do motor (.mdlbtn + .lab + .mdlname), o menu é o .picker/.pk do
 * Studio. Escopo .stu.adv2 (a página do Ads); injetado com dangerouslySetInnerHTML (há ">" nos seletores).
 */
export const AD_BRANDS_CSS = `
html .stu.adv2 .adbr{position:relative;margin:0 0 14px;min-width:0;max-width:100%}
html .stu.adv2 .adbr .mdlbtn{display:block}
html .stu.adv2 .adbr .mdlname{gap:10px;min-width:0}
html .stu.adv2 .adbr .mdlname b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
html .stu.adv2 .adbr-sw{flex:0 0 auto;display:inline-block;width:22px;height:22px;border-radius:7px;border:1px solid var(--ads-line,rgba(127,127,127,.35));background-size:cover;background-position:center}
html .stu.adv2 .adbr .adbr-team{font-size:11.5px;color:var(--ads-muted,#586c83);margin:6px 2px 0}
html .stu.adv2 .adbr-menu{position:absolute;z-index:40;left:0;right:0;top:calc(100% + 6px);max-height:min(60vh,420px);overflow:auto;padding:6px;border-radius:16px;background:var(--ads-card,#fff);color:var(--ads-text,#17273b);border:1px solid var(--ads-line,#d5e0ec);box-shadow:0 18px 50px rgba(10,20,40,.22)}
html .stu.adv2 .adbr-menu>button{display:flex;align-items:center;gap:10px;width:100%;min-height:44px;padding:8px 10px;border-radius:11px;border:0;background:transparent;color:inherit;font:inherit;font-size:14px;font-weight:600;text-align:left;cursor:pointer}
html .stu.adv2 .adbr-menu>button:hover,html .stu.adv2 .adbr-menu>button[aria-selected=true]{background:var(--ads-tint,#eaf2ff)}
html .stu.adv2 .adbr-menu>button .adbr-sw{width:18px;height:18px;border-radius:6px}
html .stu.adv2 .adbr-menu>hr{border:0;border-top:1px solid var(--ads-line,#d5e0ec);margin:6px 4px}
html .stu.adv2 .adbr-menu>.adbr-act{color:var(--ads-accent,#1766d3);font-weight:700}
html .stu.adv2 .adbr-menu>.adbr-limit{font-size:12.5px;line-height:1.45;color:var(--ads-muted,#586c83);padding:6px 10px;margin:0}
html .stu.adv2 .adbr-menu>.adbr-limit a{color:var(--ads-accent,#1766d3);font-weight:700}
html .adbr-portal .adbr-dlg{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(8,14,26,.55)}
html .adbr-portal .adbr-dlg>form{width:min(560px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:20px;border-radius:20px;background:var(--card,#fff);color:var(--text,#17273b);border:1px solid var(--border,#d5e0ec);box-shadow:0 30px 80px rgba(8,14,26,.35)}
html .adbr-portal .adbr-dlg h2{margin:0 0 14px;font-size:19px;font-weight:800;letter-spacing:-.01em;color:inherit}
html .adbr-portal .adbr-dlg .adbr-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}
html .adbr-portal .adbr-dlg .adbr-grid>.full{grid-column:1/-1}
html .adbr-portal .adbr-dlg label,html .adbr-portal .adbr-dlg .adbr-lab{display:grid;gap:6px;font-size:12px;font-weight:700;color:var(--text2,#586c83);min-width:0}
html .adbr-portal .adbr-dlg input[type=text],html .adbr-portal .adbr-dlg input[type=url],html .adbr-portal .adbr-dlg select,html .adbr-portal .adbr-dlg textarea{width:100%;min-height:42px;padding:9px 12px;border-radius:11px;border:1px solid var(--border,#d5e0ec);background:var(--bg,#f7f9fc);color:var(--text,#17273b);font:inherit;font-size:14px;font-weight:500}
html .adbr-portal .adbr-dlg textarea{min-height:70px;resize:vertical}
html .adbr-portal .adbr-dlg input[type=color]{width:100%;height:42px;padding:3px;border-radius:11px;border:1px solid var(--border,#d5e0ec);background:var(--bg,#f7f9fc)}
html .adbr-portal .adbr-dlg .adbr-logo{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
html .adbr-portal .adbr-dlg .adbr-logo img{width:44px;height:44px;object-fit:contain;border-radius:10px;background:var(--card2,#eef3f9)}
html .adbr-portal .adbr-dlg .adbr-err{color:#d23a52;font-size:13px;margin:12px 0 0}
html .adbr-portal .adbr-dlg .adbr-btns{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin-top:16px}
html .adbr-portal .adbr-dlg .adbr-btns .adbr-arch{margin-right:auto}
html .adbr-portal .adbr-dlg .adbr-btn{min-height:42px;padding:9px 16px;border-radius:11px;border:1px solid var(--border,#d5e0ec);background:var(--card,#fff);color:var(--text,#17273b);font:inherit;font-size:14px;font-weight:700;cursor:pointer}
html .adbr-portal .adbr-dlg .adbr-btn.on{background:var(--indigo,#1766d3);border-color:var(--indigo,#1766d3);color:#fff}
html .adbr-portal .adbr-dlg .adbr-btn:disabled{opacity:.55;cursor:default}
html .stu.adv2 .adbr-list{margin:22px 0 0;padding:18px;border-radius:20px;border:1px solid var(--ads-line,#d5e0ec);background:var(--ads-card,#fff);color:var(--ads-text,#17273b);min-width:0}
html .stu.adv2 .adbr-list h2{margin:0 0 12px;font-size:16px;font-weight:800;color:inherit}
html .stu.adv2 .adbr-list .adbr-chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin-bottom:10px}
html .stu.adv2 .adbr-list .adbr-chips .pill{flex:0 0 auto}
html .stu.adv2 .adbr-list ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
html .stu.adv2 .adbr-list li{display:flex;align-items:center;gap:10px;min-width:0;padding:10px 12px;border-radius:13px;background:var(--ads-soft,#eef3f9);border:1px solid var(--ads-line,#d5e0ec)}
html .stu.adv2 .adbr-list li .t{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:600}
html .stu.adv2 .adbr-list li .m{flex:0 0 auto;font-size:12px;color:var(--ads-muted,#586c83)}
html .stu.adv2 .adbr-list li .b{flex:0 0 auto;max-width:34%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:700;padding:3px 9px;border-radius:999px;background:var(--ads-tint,#eaf2ff);color:var(--ads-accent,#1766d3)}
html .stu.adv2 .adbr-list li a{flex:0 0 auto;font-size:13px;font-weight:700;color:var(--ads-accent,#1766d3)}
html .stu.adv2 .adbr-list .adbr-empty{margin:4px 2px;font-size:13px;color:var(--ads-muted,#586c83)}
@media(max-width:560px){html .adbr-portal .adbr-dlg .adbr-grid{grid-template-columns:minmax(0,1fr)}html .stu.adv2 .adbr-list li{flex-wrap:wrap}html .stu.adv2 .adbr-list li .t{flex-basis:100%}html .stu.adv2 .adbr-list li .b{max-width:60%}}
`

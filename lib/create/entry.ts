import { CREATE_ENTRY_RELEASE, CREATE_FILM_INPLACE, CREATE_SHELL_RELEASE } from './release'
import { CREATE_CLIP_INPLACE } from './clipNaMolduraRelease'
import { publicFilmEditor } from './publicFilmEditorServer'
import { PUBLIC_CREATE_EDITORS } from './publicEditorRelease'
import type { InternalRelease } from '@/lib/recreate/release'

export type CreateEntryKind = 'film' | 'cartoon' | 'ads'
type PublicProduct = CreateEntryKind | 'clip' | 'recreate' | 'image'
export const LEGACY_ENTRY_PATH: Readonly<Record<CreateEntryKind, string>> = { film: '/studio', cartoon: '/kids-cartoon', ads: '/ads/new' }
export const STUDIO_BOX_DEFAULT_CAMPAIGN = 'studio_simple'
export const FILM_DEFAULT_ENGINE = 'seedance'
export const ADS_V2_PATH = '/ads/v2'

const BASE = 'https://kineo.local'
const TRACKING = /^(?:intent_campaign|utm_[a-z_]+|ref|gclid|msclkid|fbclid|ttclid)$/
const UUID = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i
const FILM_ENGINES = new Set(['seedance', 'hollywood', 'h3', 'h3max', 's25'])
type Query = URLSearchParams | Record<string, string | string[] | undefined>

export interface CreateEntryOpts {
  entry?: InternalRelease
  shell?: InternalRelease
  filmInplace?: InternalRelease
}

export function parse(href: string): URL | null {
  if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//') || /[\\\u0000-\u001f]/.test(href)) return null
  try {
    const u = new URL(href, BASE)
    return u.origin === BASE && !u.hash ? u : null
  } catch {
    return null
  }
}

function singleParams(params: Query): URLSearchParams | null {
  const result = new URLSearchParams()
  const entries = params instanceof URLSearchParams ? params.entries() : Object.entries(params)
  for (const [key, value] of Array.from(entries)) {
    if (typeof value !== 'string' || result.has(key)) return null
    result.set(key, value)
  }
  return result
}

function arrival(k: string, v: string): boolean {
  return (k === 'welcome' || k === 'signup') && v === '1'
}

export function filmParamsSupported(params: Query, opts: { arrival?: boolean } = {}): boolean {
  const q = singleParams(params)
  if (!q) return false
  if (q.has('prompt') && q.has('ideia')) return false
  if (q.has('draft') || q.has('volta')) {
    if (!opts.arrival || !UUID.test(q.get('draft') ?? '') || q.get('volta') !== '1') return false
  }
  return Array.from(q.entries()).every(([k, v]) => {
    if (TRACKING.test(k) || k === 'ideia' || k === 'prompt' || k === 'draft' || k === 'volta') return true
    if (opts.arrival && arrival(k, v)) return true
    switch (k) {
      case 'engine': return FILM_ENGINES.has(v)
      case 'duration': return ['15', '30', '35', '45', '60', '90'].includes(v)
      case 'aspect': return ['9:16', '16:9', '1:1', '4:5'].includes(v)
      case 'look': return ['photoreal', 'animated3d', 'anime'].includes(v)
      case 'language': return /^(?:auto|[a-z]{2,3}(?:-[A-Za-z]{2,4})?)$/.test(v)
      case 'script_mode': return v === 'ai' || v === 'verbatim'
      default: return false
    }
  })
}

export function adsArrivalSupported(params: Query): boolean {
  const q = singleParams(params)
  return !!q && Array.from(q.entries()).every(([k, v]) =>
    TRACKING.test(k) || arrival(k, v) || (k === 'entry' && (v === 'product' || v === 'ugc')) ||
    ((k === 'style' || k === 'bf_template') && /^[a-z0-9_-]{1,100}$/.test(v)) || (k === 'bf_lang' && ['en', 'pt', 'es'].includes(v)))
}

export function cartoonArrivalSupported(params: Query): boolean {
  const q = singleParams(params)
  return !!q && Array.from(q.entries()).every(([k,v]) => TRACKING.test(k) || arrival(k,v))
}

export function destinoDaChegada(tab: CreateEntryKind, query: string): string | null {
  if (!query || tab === 'film') return null
  return `${tab === 'ads' ? ADS_V2_PATH : LEGACY_ENTRY_PATH.cartoon}?${query}`
}

function publicEntry(kind: string, opts: CreateEntryOpts): boolean {
  if ((opts.entry ?? CREATE_ENTRY_RELEASE) !== 'public' || (opts.shell ?? CREATE_SHELL_RELEASE) !== 'public') return false
  if (kind === 'clip') return CREATE_CLIP_INPLACE === 'public'
  return kind !== 'film' || (opts.filmInplace ?? CREATE_FILM_INPLACE) === 'public'
}

function pathWithQuery(path: string, q: URLSearchParams): string {
  const search = q.toString()
  return search ? path + '?' + search : path
}

/** An effect link changes routes after admission. Retain the attribution attached to that click. */
export function effectTemplateHref(path: string, searchParams: Record<string, string | string[] | undefined>): string {
  const tracking = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (!TRACKING.test(key) || value === undefined) continue
    for (const v of Array.isArray(value) ? value : [value]) tracking.append(key, v)
  }
  return pathWithQuery(path, tracking)
}

/** A menu chooses a product. A CTA tied to a particular film may also specify a model or supply a script. */
function productHref(kind: CreateEntryKind, href: string, opts: CreateEntryOpts, explicit: boolean): string {
  const u = parse(href)
  if (!publicEntry(kind, opts) || !u) return href
  if (kind === 'cartoon') {
    return u.pathname === LEGACY_ENTRY_PATH.cartoon && cartoonArrivalSupported(u.searchParams) ? '/create/cartoon' + u.search : href
  }
  if (kind === 'ads') {
    return [ADS_V2_PATH, LEGACY_ENTRY_PATH.ads].includes(u.pathname) && adsArrivalSupported(u.searchParams) ? '/create/ads' + u.search : href
  }
  const scriptEditor = explicit && ['/generate', '/studio/create'].includes(u.pathname) && u.searchParams.has('prompt')
  if (u.pathname !== LEGACY_ENTRY_PATH.film && !scriptEditor) return href
  const q = singleParams(u.searchParams)
  if (!q) return href
  if (explicit && q.has('prompt') && !q.has('ideia')) {
    if (q.get('autoanalyze') === '1') q.delete('autoanalyze')
    if (q.get('create_intent') === 'example_remix') q.delete('create_intent')
    if (q.get('remix_mode') === 'exact_prompt') q.delete('remix_mode')
    if (q.get('handoff_kind') === 'free_script') {
      q.delete('handoff_kind')
      if (!q.has('script_mode')) q.set('script_mode', 'verbatim')
    }
    q.set('ideia', q.get('prompt')!)
    q.delete('prompt')
  }
  if (!explicit && q.has('prompt')) return href
  if (q.has('engine') && ((!explicit && q.get('engine') !== FILM_DEFAULT_ENGINE) || q.get('engine') === 'fast')) q.delete('engine')
  if (!filmParamsSupported(q)) return href
  if (!q.has('intent_campaign')) q.set('intent_campaign', STUDIO_BOX_DEFAULT_CAMPAIGN)
  return pathWithQuery('/create/film', q)
}

export function createEntryHref(kind: CreateEntryKind, legacyHref: string, signedIn: boolean, opts: CreateEntryOpts = {}): string {
  if (typeof signedIn !== 'boolean' || (!signedIn && !PUBLIC_CREATE_EDITORS)) return legacyHref
  if (!signedIn && kind === 'film' && !publicFilmEditor()) return legacyHref
  return productHref(kind, legacyHref, opts, false)
}

export function createEntryForContentHref(kind: CreateEntryKind, contentHref: string, makeNowHref: string, signedIn: boolean, opts: CreateEntryOpts = {}): string {
  const novo = createEntryHref(kind, makeNowHref, signedIn, opts)
  return novo !== makeNowHref && novo.startsWith(`/create/${kind}`) ? novo : contentHref
}

function direct(href: string, opts: CreateEntryOpts, explicit: boolean): string | null {
  const u = parse(href)
  if (!u) return null
  if (explicit && u.pathname === '/images' && PUBLIC_CREATE_EDITORS && publicEntry('image', opts)) return '/create/image' + u.search
  if (explicit && ['/studio/create', '/generate'].includes(u.pathname)) {
    const film = productHref('film', href, opts, true)
    return film !== href ? film : null
  }
  if (u.pathname === '/clips' && publicEntry('clip', opts)) return '/create/clip' + u.search
  if (/^\/recreate(?:\/[\w-]+)?$/.test(u.pathname) && publicEntry('recreate', opts)) return href
  const kind = u.pathname === ADS_V2_PATH ? 'ads' : (Object.keys(LEGACY_ENTRY_PATH) as CreateEntryKind[]).find(k => LEGACY_ENTRY_PATH[k] === u.pathname)
  if (!kind) {
    const tab = /^\/create\/(film|cartoon|ads|clip)$/.exec(u.pathname)?.[1]
    return tab && publicEntry(tab, opts) ? href : null
  }
  const target = productHref(kind, href, opts, explicit)
  return target === href ? null : target
}

export function createEntryForLegacyHref(href: string, signedIn: boolean, opts: CreateEntryOpts = {}): string {
  if (typeof signedIn !== 'boolean' || (!signedIn && !PUBLIC_CREATE_EDITORS)) return href
  const target = direct(href, opts, false) ?? href
  return !signedIn && target.split('?')[0] === '/create/film' && !publicFilmEditor() ? href : target
}

function destinationFromSignup(u: URL, opts: CreateEntryOpts, explicit: boolean): string | null {
  const outer = singleParams(u.searchParams)
  if (!outer || !outer.has('redirect') || !Array.from(outer.keys()).every(k => k === 'redirect' || TRACKING.test(k))) return null
  const nested = parse(outer.get('redirect')!)
  if (!nested || nested.searchParams.has('volta') || nested.searchParams.has('draft')) return null
  for (const [k, v] of Array.from(outer.entries())) {
    if (k === 'redirect') continue
    if (nested.searchParams.has(k) && nested.searchParams.get(k) !== v) return null
    nested.searchParams.set(k, v)
  }
  return direct(nested.pathname + nested.search, opts, explicit)
}

export function createEntryForSignupHref(href: string, signedIn: boolean, opts: CreateEntryOpts = {}): string {
  if (typeof signedIn !== 'boolean') return href
  const u = parse(href)
  if (!u) return href
  if (!signedIn && !PUBLIC_CREATE_EDITORS) {
    if (u.pathname !== '/signup' || Array.from(u.searchParams.keys()).join() !== 'redirect') return href
    const target = destinationFromSignup(u, opts, false)
    return target && /^\/create\/(film|ads|cartoon)(?:\?|$)/.test(target) ? '/signup?redirect=' + encodeURIComponent(target) : href
  }
  const target = u.pathname === '/signup' ? destinationFromSignup(u, opts, false) : direct(href, opts, false)
  return target && (signedIn || target.split('?')[0] !== '/create/film' || publicFilmEditor()) ? target : href
}

/** Use only on a creation CTA. Account, subscription, connector and editorial links retain their own destinations. */
export function publicCreateCtaHref(href: string, kind: PublicProduct = 'film', opts: CreateEntryOpts = {}): string {
  const u = parse(href)
  if (!u || !PUBLIC_CREATE_EDITORS || !publicEntry(kind, opts) || (kind === 'film' && !publicFilmEditor())) return href
  if (u.pathname !== '/signup') {
    if (kind === 'ads' && u.pathname === '/ads' && adsArrivalSupported(u.searchParams)) return '/create/ads' + u.search
    return direct(href, opts, true) ?? href
  }
  if (u.searchParams.has('redirect')) return destinationFromSignup(u, opts, true) ?? href
  const q = singleParams(u.searchParams)
  if (!q) return href
  if (kind === 'clip' || kind === 'recreate' || kind === 'image') {
    if (!Array.from(q.keys()).every(k => TRACKING.test(k))) return href
    return pathWithQuery(kind === 'recreate' ? '/recreate' : `/create/${kind}`, q)
  }
  if (q.get('create_intent') === 'fast' || q.get('create_intent') === 'trial_best') q.delete('create_intent')
  if (q.has('lang') && !q.has('language')) { q.set('language', q.get('lang')!); q.delete('lang') }
  const target = productHref(kind, pathWithQuery(LEGACY_ENTRY_PATH[kind], q), opts, true)
  return target.startsWith('/create/') ? target : href
}

export function queryDaChegada(searchParams: Record<string, string | string[] | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(searchParams)) for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) q.append(k, x)
  return q.toString()
}

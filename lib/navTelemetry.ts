// KINEO-FLUXO-NOVO-2026-09-25 — nav_item_clicked: o menu de 4 itens precisa de um
// número para decidir o 5º (ordem do fundador, 25/09: "em 14 dias, se Imagem ficar
// abaixo de ~5% dos cliques, troca com Exemplos").
//
// POR QUE UM OUVINTE ÚNICO NO DOCUMENTO, E NÃO UM trackEvent EM CADA LINK:
//   o visual do menu é do Codex (topo público, menu móvel da landing, Sidebar e
//   MobileNav). Se cada item chamasse uma função, a pista do Codex dependeria da
//   nossa e o menu novo nasceria sem medição no primeiro esquecimento. Aqui o
//   contrato é só de ATRIBUTOS: o Codex marca `data-nav-item` / `data-nav-surface`
//   / `data-nav-area`, e este módulo lê. Sem atributo, nada é gravado — até o lote
//   do Codex subir, 0 eventos é "0 de 0 oportunidades", não defeito.
//
// POR QUE NUNCA LER O TEXTO DO LINK: o rótulo está traduzido em 15 dicionários e
//   pode carregar qualquer coisa. A chave do item é o atributo, validado por
//   NAV_ITEM_RE; o que não casa é descartado inteiro (não é "consertado").
//
// Módulo PURO, sem import nenhum: o guardião o executa em vm com um DOM falso, e
// nada de servidor pode vazar para o bundle do cliente por aqui.

export const NAV_EVENT = 'nav_item_clicked' as const

// Sobe quando o CONTRATO muda (atributos, campos, regra do `current`). A leitura
// dos 14 dias corta por `metadata->>'nav_v'`, não pelo relógio do deploy.
export const NAV_TELEMETRY_VERSION = 1

export const NAV_SURFACES = ['top', 'mobile', 'sidebar'] as const
export type NavSurface = (typeof NAV_SURFACES)[number]

// `mobile` sozinho junta o hambúrguer da landing (público) com a barra do app
// (MobileNav). A área separa os dois — senão a fatia de Imagem mistura menus
// muito diferentes e o teste dos 5% perde o sentido.
export const NAV_AREAS = ['public', 'app'] as const
export type NavArea = (typeof NAV_AREAS)[number]

// Um id curto em minúsculas, com um sub-id opcional (`more:viral`).
export const NAV_ITEM_RE = /^[a-z0-9_-]{1,24}(:[a-z0-9_-]{1,24})?$/

// Ids do contrato com o Codex. O RUNTIME aceita qualquer id que case com
// NAV_ITEM_RE (um item novo não pode sumir em silêncio); o GUARDIÃO exige que todo
// `data-nav-item` literal do código esteja nesta lista ou seja `more:<id>` — item
// novo entra aqui primeiro, de propósito.
export const NAV_ITEM_IDS = [
  'video',
  'image',
  'business',
  'pricing',
  'examples',
  'ads',
  'library',
  'login',
] as const
export const NAV_MORE_PREFIX = 'more:'

// Toque + clique sintético, label que reencaminha o clique: o mesmo gesto pode
// chegar duas vezes em poucos ms. Dois cliques reais no mesmo item em menos de
// 400 ms são o mesmo gesto para esta medição.
export const NAV_DUPLICATE_WINDOW_MS = 400

export const NAV_HREF_MAX = 64

export type NavClickPayload = {
  item: string
  surface: NavSurface | 'unknown'
  area: NavArea | 'unknown'
  href_path: string | null
  current: boolean
}

export type NavClickMetadata = NavClickPayload & { nav_v: number }

type NavEl = {
  closest(selector: string): NavEl | null
  getAttribute(name: string): string | null
}

function asNavEl(target: unknown): NavEl | null {
  if (!target || typeof target !== 'object') return null
  const t = target as { closest?: unknown; parentElement?: unknown }
  if (typeof t.closest === 'function') return target as NavEl
  // Clique que chega num nó de texto: sobe para o elemento que o contém.
  const parent = t.parentElement as { closest?: unknown } | null | undefined
  if (parent && typeof parent === 'object' && typeof parent.closest === 'function') return parent as unknown as NavEl
  return null
}

export function normalizeNavItem(raw: unknown): string | null {
  return typeof raw === 'string' && NAV_ITEM_RE.test(raw) ? raw : null
}

function normalizeSurface(raw: string | null | undefined): NavSurface | 'unknown' {
  return (NAV_SURFACES as readonly string[]).includes(raw ?? '') ? (raw as NavSurface) : 'unknown'
}

function normalizeArea(raw: string | null | undefined, surface: NavSurface | 'unknown'): NavArea | 'unknown' {
  if ((NAV_AREAS as readonly string[]).includes(raw ?? '')) return raw as NavArea
  // A lateral só existe dentro do app; nas outras superfícies, sem atributo não se chuta.
  return surface === 'sidebar' ? 'app' : 'unknown'
}

function cleanPath(value: string): string | null {
  const cleaned = value.replace(/[^A-Za-z0-9/_\-.#~%]/g, '').slice(0, NAV_HREF_MAX)
  return cleaned || null
}

/**
 * Destino do link reduzido a caminho (+ âncora). A query NUNCA entra: é onde moram
 * utm, e-mail colado e tokens. `mailto:`, `tel:` e `javascript:` devolvem null.
 */
export function navHrefPath(href: string | null | undefined): string | null {
  if (typeof href !== 'string') return null
  const raw = href.trim()
  if (!raw) return null
  if (raw.startsWith('#')) return cleanPath(raw)
  let url: URL
  try {
    url = new URL(raw, 'https://nav.invalid')
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  return cleanPath(url.pathname + url.hash)
}

function samePath(a: string, b: string): boolean {
  const norm = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p)
  return norm(a) === norm(b)
}

/**
 * Transforma o alvo de um clique no payload do evento, ou null quando o clique não
 * foi num item de menu marcado. Regras:
 *  - precisa de um `a[href]` ou `button` (clique no vão do contêiner não conta);
 *  - vale o `[data-nav-item]` MAIS INTERNO acima do link (Exemplos dentro de Vídeo
 *    conta como `examples`; sublink sem marca conta para o item que o contém);
 *  - `current` separa o reclique na página em que a pessoa já está (a Sidebar faz
 *    preventDefault nele, mas a captura ainda dispara) — excluído na leitura.
 */
export function navClickPayload(target: unknown, currentPath?: string | null): NavClickPayload | null {
  const start = asNavEl(target)
  if (!start) return null
  const link = start.closest('a[href],button')
  if (!link) return null
  const itemEl = link.closest('[data-nav-item]')
  if (!itemEl) return null
  const item = normalizeNavItem(itemEl.getAttribute('data-nav-item'))
  if (!item) return null
  const surface = normalizeSurface(itemEl.closest('[data-nav-surface]')?.getAttribute('data-nav-surface'))
  const area = normalizeArea(itemEl.closest('[data-nav-area]')?.getAttribute('data-nav-area'), surface)
  const href_path = navHrefPath(link.getAttribute('href'))
  const aria = link.getAttribute('aria-current') ?? itemEl.getAttribute('aria-current')
  // 'location' (seção ativa, página filha) NÃO é reclique: clicar leva a outra página.
  let current = aria === 'page' || aria === 'true'
  if (!current && aria === null && currentPath && href_path && !href_path.includes('#')) {
    current = samePath(href_path, currentPath)
  }
  return { item, surface, area, href_path, current }
}

/** Trava de duplicata por chave: devolve false para a repetição dentro da janela. */
export function createNavDuplicateLatch(windowMs: number = NAV_DUPLICATE_WINDOW_MS): (key: string, at: number) => boolean {
  const lastSent = new Map<string, number>()
  return (key, at) => {
    const prev = lastSent.get(key)
    if (prev !== undefined && at - prev < windowMs) return false
    lastSent.set(key, at)
    return true
  }
}

type ClickListener = (event: { target?: unknown }) => void

export type NavClickDocument = {
  addEventListener(type: 'click', listener: ClickListener, useCapture: boolean): void
  removeEventListener(type: 'click', listener: ClickListener, useCapture: boolean): void
}

export type NavClickTelemetryOptions = {
  doc?: NavClickDocument | null
  now?: () => number
  currentPath?: () => string | null
}

// Contagem de montagens do MÓDULO: dois <NavClickTelemetry /> montados (ou o ciclo
// monta-desmonta-monta do StrictMode) continuam sendo UM ouvinte no documento.
let mounts = 0
let detachListener: (() => void) | null = null

/**
 * Liga o ouvinte único de clique na FASE DE CAPTURA do documento — ele roda antes
 * do Link/NavItem chamarem preventDefault ou stopPropagation, e antes da navegação.
 * Devolve a função de desmontagem (o retorno do useEffect).
 */
export function attachNavClickTelemetry(
  send: (metadata: NavClickMetadata) => void,
  options: NavClickTelemetryOptions = {},
): () => void {
  const doc =
    options.doc !== undefined
      ? options.doc
      : typeof document !== 'undefined'
        ? (document as unknown as NavClickDocument)
        : null
  if (!doc) return () => {}
  const now = options.now ?? (() => Date.now())
  const readPath =
    options.currentPath ??
    (() => (typeof window !== 'undefined' && window.location ? window.location.pathname : null))

  mounts += 1
  if (mounts === 1) {
    const latch = createNavDuplicateLatch(NAV_DUPLICATE_WINDOW_MS)
    const onClick: ClickListener = (event) => {
      try {
        const payload = navClickPayload(event?.target, readPath())
        if (!payload) return
        if (!latch(`${payload.item}|${payload.surface}|${payload.area}`, now())) return
        send({ ...payload, nav_v: NAV_TELEMETRY_VERSION })
      } catch {
        // telemetria nunca atrapalha a navegação
      }
    }
    doc.addEventListener('click', onClick, true)
    detachListener = () => doc.removeEventListener('click', onClick, true)
  }

  let released = false
  return () => {
    if (released) return
    released = true
    mounts -= 1
    if (mounts === 0 && detachListener) {
      detachListener()
      detachListener = null
    }
  }
}

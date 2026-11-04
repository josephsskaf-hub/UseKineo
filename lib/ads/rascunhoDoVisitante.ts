// KINEO-CARDS-ANTES-DO-LOGIN-0411 — o que o visitante preencheu antes do login, só nesta aba (sessionStorage), lido uma vez e apagado na volta.
// Sem foto e sem nada que custe: enviar foto já pede conta. Quem confere tudo de novo é o servidor, no pedido.
const CHAVE_ANUNCIO = 'kineo:visitante:anuncio:v1'
const CHAVE_DESENHO = 'kineo:visitante:desenho:v1'
const VALIDADE_MS = 2 * 60 * 60 * 1000

function guardar(chave: string, dados: unknown): void {
  try { sessionStorage.setItem(chave, JSON.stringify({ t: Date.now(), dados })) } catch { /* sem armazenamento: o login segue, só não volta preenchido */ }
}

function ler(chave: string): Record<string, unknown> | null {
  try {
    const cru = sessionStorage.getItem(chave)
    if (!cru) return null
    sessionStorage.removeItem(chave)
    const v = JSON.parse(cru) as { t?: unknown; dados?: unknown }
    if (typeof v.t !== 'number' || Date.now() - v.t > VALIDADE_MS || !v.dados || typeof v.dados !== 'object') return null
    return v.dados as Record<string, unknown>
  } catch { return null }
}

const CAMPOS_DO_ANUNCIO = ['frase', 'oferta', 'beneficios', 'cta', 'language', 'formato', 'presenter_id', 'category', 'scenario_id'] as const
type CamposDoAnuncio = Partial<Record<(typeof CAMPOS_DO_ANUNCIO)[number], string>>

export function guardarRascunhoDoAnuncio(form: CamposDoAnuncio, link: string): void {
  const campos: CamposDoAnuncio = {}
  for (const k of CAMPOS_DO_ANUNCIO) if (typeof form[k] === 'string') campos[k] = form[k]
  guardar(CHAVE_ANUNCIO, { campos, link })
}

/** Só os campos conhecidos e só texto: conteúdo velho ou estranho não entra no formulário. */
export function lerRascunhoDoAnuncio<F extends CamposDoAnuncio>(): { campos: Partial<F>; link: string } | null {
  const d = ler(CHAVE_ANUNCIO)
  if (!d) return null
  const brutos = (d.campos && typeof d.campos === 'object' ? d.campos : {}) as Record<string, unknown>
  const campos: Record<string, string> = {}
  for (const k of CAMPOS_DO_ANUNCIO) { const v = brutos[k]; if (typeof v === 'string') campos[k] = v.slice(0, 2000) }
  return { campos: campos as Partial<F>, link: typeof d.link === 'string' ? d.link.slice(0, 2000) : '' }
}

export function guardarRascunhoDoDesenho(r: { character: string; idea: string; ideaId: string | null; language: string; duration: number }): void {
  guardar(CHAVE_DESENHO, r)
}

export function lerRascunhoDoDesenho(): { character?: unknown; idea?: unknown; language?: unknown } | null {
  return ler(CHAVE_DESENHO)
}

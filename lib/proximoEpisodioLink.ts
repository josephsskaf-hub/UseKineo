// ═══ KINEO-PROXIMO-EPISODIO-0111 — o link do botão "Next episode" (vai do fundador 01/11 "vai tudo") ═══
//
// POR QUÊ (medido em 13/10, memória `churn-quem-fica-tem-serie`): quem continua pagando tem SÉRIE; 9 de 12 assinantes
// estavam parados. O botão de continuar já existia, mas levava só o TÍTULO do filme (cortado em ~120 caracteres) e caía
// no motor/duração padrão: o episódio 2 nascia sem o personagem (nome, espécie, aparência), no motor errado e, para
// quem narrou em outra língua, em inglês. Este módulo monta o endereço que o Studio JÁ LÊ
// (app/(dashboard)/studio/StudioClient.tsx, efeito de URL: ?engine=&duration=&script_mode=&language=&prompt=) com o
// MESMO motor, a MESMA duração e a MESMA língua do filme de origem, e a ideia do episódio seguinte escrita pelo servidor
// (app/api/next-episode/studio). O Studio só PREENCHE: o crédito sai quando a pessoa aperta Create lá, como sempre.
//
// Puro e leve (só o espelho motor×duração de lib/navigation/reviewVideoRetry, também puro): roda no navegador (fallback
// do botão quando o servidor não responde) e no servidor. Guardião: scripts/test-proximo-episodio-0111.mts.
import { STUDIO_ENGINE_FOR_QUALITY, retryDurationFor } from '@/lib/navigation/reviewVideoRetry'

export const PROXIMO_EPISODIO_MARCA = 'KINEO-PROXIMO-EPISODIO-0111'
/** O botão apareceu (uma vez por tela/filme). */
export const NEXT_EPISODE_SHOWN_EVENT = 'next_episode_shown'
/** A pessoa apertou "Next episode". */
// KINEO-PROXIMO-EPISODIO-0111 (revisão) — nome próprio: 'next_episode_clicked' já é do cartão do episódio escrito (GenerateClient).
export const NEXT_EPISODE_CLICKED_EVENT = 'next_episode_button_clicked'
/** O link ficou pronto — `via` 'server' (ideia escrita com a ficha) ou 'fallback' (servidor não respondeu). */
export const NEXT_EPISODE_LINK_READY_EVENT = 'next_episode_link_ready'
/** No Studio, a pessoa apertou Create num episódio que chegou por este botão (carrega series_parent_video_id). */
export const NEXT_EPISODE_GENERATE_EVENT = 'next_episode_generate_clicked'
/** Fonte de atribuição (viaja como continuation_source até o /studio/create e o generate_completed). */
export const NEXT_EPISODE_SOURCE = 'next_episode_button'
/** O filme de origem do episódio (uuid de `videos.id`). */
export const SERIES_PARENT_PARAM = 'series_parent'
/** Teto da ideia na URL (o Studio aceita até 20.000 no modo IA; o teto aqui é de URL, não de produto). */
export const IDEIA_MAX_CHARS = 1500
/** Teto do episódio que a tela de pronto manda junto (o cartão já escrito). */
export const EPISODIO_DA_TELA_MAX_CHARS = 6000

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Línguas que o seletor do Studio conhece (espelho do formato de código: 2-3 letras minúsculas). */
const LINGUA_RE = /^[a-z]{2,3}$/

/** quality_mode do filme (cobrador) → chave do seletor do Studio. Desconhecido → null (o Studio fica no padrão). */
export function motorDoStudio(quality: string | null | undefined): string | null {
  const q = typeof quality === 'string' ? quality.trim() : ''
  if (!q) return null
  if (STUDIO_ENGINE_FOR_QUALITY[q]) return STUDIO_ENGINE_FOR_QUALITY[q]
  // a chave do Studio pode chegar direto (o /generate sabe o motor da tela)
  return Object.values(STUDIO_ENGINE_FOR_QUALITY).includes(q) ? q : null
}

/**
 * O botão de duração do Studio que o filme de origem MIROU. KINEO-PROXIMO-EPISODIO-0111 (revisão): a duração MEDIDA passa do
 * alvo (hollywood de 60 s sai com 75-85 s) e o arredondamento para cima de retryDurationFor abria o episódio em 90 s — mais
 * caro e contra "o mesmo motor e duração". Aqui é o maior botão ≤ medida × 1,1 (a folga cobre o filme que ficou um pouco
 * abaixo do alvo); a tela que SABE o alvo (o /generate) manda o alvo e ele cai exato. Sem duração: null (o Studio escolhe).
 */
export function duracaoDoStudio(engine: string | null, seconds: number | null | undefined): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return retryDurationFor(engine ?? 'fast', seconds)
  const botoes = engine === 'seedance' ? [15, 35, 60, 90] : [35, 60, 90]
  const teto = seconds * 1.1
  let escolhido = botoes[0]
  for (const b of botoes) if (b <= teto) escolhido = b
  return String(escolhido)
}

export interface PedidoDeLink {
  prompt: string
  engine?: string | null
  duration?: string | number | null
  language?: string | null
  parentVideoId?: string | null
}

/**
 * /studio?engine=&duration=&script_mode=ai&language=&prompt=&series=1&continuation_source=next_episode_button&series_parent=
 * Sem ideia utilizável devolve null (quem chama decide a saída — nunca um '/studio' que pareça link de episódio).
 */
export function linkDoProximoEpisodio(p: PedidoDeLink): string | null {
  const prompt = String(p.prompt ?? '').replace(/\r\n/g, '\n').trim().slice(0, IDEIA_MAX_CHARS)
  if (prompt.length < 12) return null
  const q = new URLSearchParams()
  const engine = typeof p.engine === 'string' ? p.engine.trim().toLowerCase() : ''
  if (engine) q.set('engine', engine)
  const dur = typeof p.duration === 'number' ? String(Math.round(p.duration)) : typeof p.duration === 'string' ? p.duration.trim() : ''
  if (/^\d{2,3}$/.test(dur)) q.set('duration', dur)
  q.set('script_mode', 'ai')
  const lang = typeof p.language === 'string' ? p.language.trim().toLowerCase() : ''
  q.set('language', LINGUA_RE.test(lang) ? lang : 'en')
  q.set('prompt', prompt)
  q.set('series', '1')
  q.set('continuation_source', NEXT_EPISODE_SOURCE)
  if (p.parentVideoId && UUID_RE.test(p.parentVideoId)) q.set(SERIES_PARENT_PARAM, p.parentVideoId)
  return `/studio?${q.toString()}`
}

/** O filme de origem que chegou pelo link (só uuid válido e só com a fonte deste botão). */
export function filmeDeOrigemDoLink(sp: Pick<URLSearchParams, 'get'>): string | null {
  if (sp.get('continuation_source') !== NEXT_EPISODE_SOURCE) return null
  const id = (sp.get(SERIES_PARENT_PARAM) ?? '').trim()
  return UUID_RE.test(id) ? id : null
}

/**
 * A ideia de RESERVA, quando o servidor não respondeu: só o título do filme (que a tela já tem) e a ordem de continuar.
 * Sem ficha inventada — a ficha só sai do roteiro, e o roteiro só o servidor lê.
 */
export function ideiaDeReserva(titulo: string | null | undefined): string {
  const t = String(titulo ?? '').replace(/\s+/g, ' ').trim().slice(0, 200)
  if (!t) return ''
  return `Next episode of my series "${t}". Keep the same characters (same names, same look), the same world and the same tone. A new hook and new events; do not repeat what already happened.`
}

// ═══ KINEO-EP2-PAINEL-3110 — a carta do EPISÓDIO 2, no dia seguinte ao primeiro filme ═══════════════════════════════
//
// POR QUE EXISTE (estudo de churn 13/10: "quem fica tem série"): quem assina e fica é quem fez o filme 2 do MESMO tema.
// A tela da estreia (components/premiere) já oferece "Episode 2 is already written" — mas só para quem ainda está na aba.
// Medido em 31/10 (prod, externos, 30 d): 415 primeiros filmes, 399 ainda com UM filme 28 h depois, e 298 deles nunca
// receberam carta de episódio nenhuma — a `season_letter` (só quem tem saldo, sem hora certa) saiu 6 vezes em 30 d e a
// `next_episode_wall` (quem ficou SEM saldo) 109. Esta carta é o degrau que faltava: UMA vez, 20–28 h depois do PRIMEIRO
// filme, só se o segundo ainda não veio, só se o saldo de hoje paga o episódio 2 no motor que a pessoa usou.
//
// DIVISÃO COM AS IRMÃS (ninguém recebe duas cartas de episódio 2):
//   · sem saldo para o episódio 2  → é da `next_episode_wall` (esta carta PULA, motivo `sem_saldo`);
//   · já recebeu `season_letter_emailed_v1` ou `next_episode_wall_emailed_v1` → esta carta pula;
//   · recebeu esta → a `season_letter` pula (o carimbo entrou na lista OTHER_CAMPAIGNS dela) e a supressão de 24 h da casa
//     enxerga este carimbo (lib/lifecycle/emailEvents.ts) — nenhum e-mail nosso no mesmo dia.
//
// A IDEIA DO EPISÓDIO 2 NUNCA É ESCRITA AQUI (custo zero): lê o que a casa JÁ escreveu para o filme 1 —
//   1. `next_episode_written` (o episódio que a tela de filme pronto escreveu, /api/next-episode) → o título dele;
//   2. `season_written` (a temporada, lib/temporadaServer) → o episódio 2 da temporada (título + semente);
//   3. nada gravado → a carta diz a verdade: "o tema já vai preenchido", sem inventar título de episódio.
//
// Módulo PURO (zero import) para o guardião scripts/test-ep2-painel-3110.mjs carregar o arquivo real.

export const EPISODE2_EMAIL_MARCA = 'KINEO-EP2-PAINEL-3110'
export const EPISODE2_EMAIL_EVENT = 'episode2_email_sent'
export const EPISODE2_CAMPAIGN = 'episode2_d1'
export const EPISODE2_SOURCE = 'lifecycle_episode2_email'
/** A janela, em horas desde o PRIMEIRO filme entregue. A supressão de 24 h (o e-mail de "filme pronto" sai na hora 0)
 *  faz o envio real cair, na prática, entre 24 e 28 h — o cron roda de hora em hora, então são ~4 chances por pessoa. */
export const EPISODE2_MIN_H = 20
export const EPISODE2_MAX_H = 28
export const EPISODE2_MAX_PER_RUN = 30
/** Outras cartas de episódio 2 da casa — quem recebeu uma delas não recebe esta. */
export const EPISODE2_SISTER_STAMPS = ['season_letter_emailed_v1', 'next_episode_wall_emailed_v1'] as const

export type Episode2Skip =
  | 'fora_da_janela'
  | 'ja_tem_segundo_filme'
  | 'sem_email'
  | 'descadastrado'
  | 'interna'
  | 'ja_recebeu'
  | 'recebeu_carta_irma'
  | 'sem_custo'
  | 'sem_saldo'

export type Episode2Input = {
  /** filmes entregues (status completed, fora anúncio v2) na vida da conta */
  completedFilms: number
  firstFilmAtMs: number
  nowMs: number
  email: string | null | undefined
  optedOut: boolean
  internal: boolean
  alreadyStamped: boolean
  sisterLetter: boolean
  /** saldo de hoje; null = ilegível */
  balance: number | null
  /** custo do episódio 2 no motor/duração do filme 1; null = desconhecido */
  cost: number | null
}

/** A decisão, numa função só. A ORDEM é a do funil (o primeiro motivo que explica o pulo é o relatado no dry-run). */
export function decidirEpisodio2(i: Episode2Input): { ok: true } | { ok: false; reason: Episode2Skip } {
  const horas = (i.nowMs - i.firstFilmAtMs) / 3_600_000
  if (!Number.isFinite(horas) || horas < EPISODE2_MIN_H || horas > EPISODE2_MAX_H) return { ok: false, reason: 'fora_da_janela' }
  if (i.completedFilms !== 1) return { ok: false, reason: 'ja_tem_segundo_filme' }
  const email = (i.email ?? '').trim()
  if (!email || !email.includes('@')) return { ok: false, reason: 'sem_email' }
  if (i.optedOut) return { ok: false, reason: 'descadastrado' }
  if (i.internal) return { ok: false, reason: 'interna' }
  if (i.alreadyStamped) return { ok: false, reason: 'ja_recebeu' }
  if (i.sisterLetter) return { ok: false, reason: 'recebeu_carta_irma' }
  if (i.cost === null || !Number.isFinite(i.cost) || i.cost <= 0) return { ok: false, reason: 'sem_custo' }
  // Falha FECHADA: saldo ilegível não promete filme. Sem saldo, a carta certa é a `next_episode_wall`.
  if (i.balance === null || !Number.isFinite(i.balance) || i.balance < i.cost) return { ok: false, reason: 'sem_saldo' }
  return { ok: true }
}

export type Episode2Idea = { title: string | null; seed: string; source: 'next_episode_written' | 'season_written' | 'film_title' }

const limpar = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')

/** A ideia do episódio 2: a que a casa JÁ escreveu, nesta ordem; sem nada gravado, só o tema do filme 1 (title=null:
 *  a carta não inventa nome de episódio). null = não há tema utilizável → não há carta. */
export function escolherIdeiaEpisodio2(input: {
  written?: { title?: unknown } | null
  season?: { title?: unknown; seed?: unknown } | null
  filmTitle?: string | null
}): Episode2Idea | null {
  const wTitle = limpar(input.written?.title, 120)
  if (wTitle) return { title: wTitle, seed: wTitle, source: 'next_episode_written' }
  const sTitle = limpar(input.season?.title, 120)
  if (sTitle) return { title: sTitle, seed: limpar(input.season?.seed, 180) || sTitle, source: 'season_written' }
  const film = limpar(input.filmTitle, 180)
  if (film) return { title: null, seed: film, source: 'film_title' }
  return null
}

export function escaparHtmlEp2(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function curto(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s
}

export function assuntoEpisodio2(filmTitle: string | null): string {
  return filmTitle ? `Episode 2 of "${curto(filmTitle, 60)}" is ready to film` : 'Episode 2 of your film is ready to film'
}

/** Só https e sem aspas: a miniatura vem do banco e vai para dentro de um atributo HTML. */
export function miniaturaSegura(url: unknown): string | null {
  if (typeof url !== 'string') return null
  const u = url.trim()
  if (!/^https:\/\/[^\s"'<>]+$/.test(u) || u.length > 1000) return null
  return u
}

/**
 * A carta (sem o rodapé de descadastro — a rota acrescenta o rodapé da casa). Copy honesta:
 *  · diz que a IDEIA está escrita só quando ela está (idea.title vindo do banco);
 *  · diz que o botão abre o Studio com o tema preenchido (é o que a porta /api/episode-link faz);
 *  · não cita preço nem promete filme pronto.
 */
export function montarCartaEpisodio2(input: {
  filmTitle: string | null
  thumbnailUrl: string | null
  idea: Episode2Idea
  url: string
}): { subject: string; text: string; html: string } {
  const { filmTitle, idea, url } = input
  const thumb = miniaturaSegura(input.thumbnailUrl)
  const nomeTxt = filmTitle ? `"${filmTitle}"` : 'your first film'
  const nomeHtml = filmTitle ? `&ldquo;${escaparHtmlEp2(filmTitle)}&rdquo;` : 'your first film'
  const ideiaTxt = idea.title
    ? `Episode 2 is already written: "${idea.title}".`
    : 'Episode 2 picks up the same subject with a new hook and new facts.'
  const ideiaHtml = idea.title
    ? `Episode&nbsp;2 is already written: <strong>&ldquo;${escaparHtmlEp2(idea.title)}&rdquo;</strong>.`
    : 'Episode&nbsp;2 picks up the same subject with a new hook and new facts.'

  const text = `Yesterday you made ${nomeTxt}.

${ideiaTxt}

One click opens the studio with episode 2's topic already in the box — you review it and press generate:
${url}

Why bother with a second one: a series is what makes a channel. One film is a test; two films of the same story are the start of a show people come back for.

If episode 2 should go somewhere else, just reply and tell me. It lands with a real person.

Kineo Team
usekineo.com`

  const thumbHtml = thumb
    ? `<a href="${escaparHtmlEp2(url)}" style="display:block;margin:0 0 16px;"><img src="${escaparHtmlEp2(thumb)}" alt="${filmTitle ? escaparHtmlEp2(filmTitle) : 'Your first film'}" width="180" style="display:block;width:180px;max-width:60%;border-radius:12px;border:1px solid #e5e5e5;" /></a>`
    : ''

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111;max-width:520px;">
  <p style="margin:0 0 14px;">Yesterday you made <strong>${nomeHtml}</strong>.</p>
  ${thumbHtml}
  <p style="margin:0 0 14px;">${ideiaHtml}</p>
  <p style="margin:0 0 22px;"><a href="${escaparHtmlEp2(url)}" style="display:inline-block;background:#2997ff;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px;">Film episode 2 &rarr;</a></p>
  <p style="margin:0 0 14px;font-size:14px;color:#555;">The button opens the studio with episode 2&rsquo;s topic already in the box &mdash; you review it and press generate. A series is what makes a channel: one film is a test, two films of the same story are the start of a show people come back for.</p>
  <p style="margin:0 0 14px;font-size:14px;color:#555;">If episode 2 should go somewhere else, just reply and tell me. It lands with a real person.</p>
  <p style="margin:0 0 2px;">Kineo Team</p>
  <p style="margin:0;"><a href="https://www.usekineo.com" style="color:#2997ff;">usekineo.com</a></p>
</div>`

  return { subject: assuntoEpisodio2(filmTitle), text, html }
}

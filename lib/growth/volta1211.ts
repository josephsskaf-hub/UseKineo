// ═══ KINEO-VOLTA-1211 — a carta de VOLTA para a base (CEO 12/11 13:32, meta do fundador "10 mil pessoas em 7 dias", opção B orgânica) ═══
//
// A ISCA É O FILME, NUNCA O CRÉDITO (CLAUDE.md 02/09: winback-25 = 2.375 créditos para 95 pessoas, zero cliques em 24 h). Quem já
// fez filme recebe o link da PÁGINA DO PRÓPRIO FILME (/history?v=…, a mesma do e-mail "filme pronto" desde 11/11). Quem nunca fez
// recebe o Studio com a ideia da página por onde entrou já escrita na caixa (quando a página tem uma; senão, o Studio de sempre).
// Sem preço, sem desconto, sem crédito, sem prometer filme grátis (conta antiga pode estar com 0 crédito; país pago-só não tem).
//
// QUATRO SEGMENTOS (um por pessoa, nesta ordem de prioridade — quem baixou é o mais quente):
//   c_baixou          entregou filme e baixou (video_downloaded / video_download_clicked), nunca pagou
//   a_filme_parado    entregou filme, nunca pagou, nenhuma atividade há 7+ dias
//   d_pais_pago       nunca fez filme e caiu na porta "país sem filme grátis" (trial_region_excluded / region_paid_only_notice_shown)
//   b_sem_filme       cadastrou e nunca fez filme
// Fora: pagante, opt-out, conta da casa, quem fez filme nos últimos 7 dias, quem recebeu QUALQUER e-mail nosso em 7 dias (supressão
// da casa com janela de 168 h) e quem já recebeu ESTA carta (para sempre).
//
// ENVIO TRANCADO: VOLTA_1211_SEND_LIVE = false. A rota /api/admin/send-volta-1211 só ensaia até a CEO virar este interruptor num
// commit dela. Medida: volta_1211_emailed (envio aceito) · chegada = landing/eventos com utm_campaign=volta_1211.
import { pickMomentumTopic } from '../momentumTopic'

export const VOLTA_1211_MARK = 'KINEO-VOLTA-1211' as const
export const VOLTA_1211_CAMPAIGN = 'volta_1211' as const
/** Carimbo de ENVIO (entra em LIFECYCLE_EMAIL_EVENT_NAMES e em SERVER_ONLY_EVENTS no mesmo commit). */
export const VOLTA_1211_SENT = 'volta_1211_emailed' as const
export const VOLTA_1211_CLAIM = 'volta_1211_claimed' as const
/** O interruptor do envio. false = a rota só ensaia (nenhum fetch ao Resend existe nesse caminho). */
export const VOLTA_1211_SEND_LIVE = false as boolean
/** Ninguém recebe 2 e-mails nossos em 7 dias (ordem da CEO). */
export const VOLTA_1211_SUPPRESSION_HOURS = 168
/** Parado = sem atividade nenhuma há 7+ dias. */
export const VOLTA_1211_IDLE_DAYS = 7
export const VOLTA_1211_BATCH_DEFAULT = 20
export const VOLTA_1211_BATCH_MAX = 50
export const VOLTA_1211_FROM = 'Kineo Team <hello@usekineo.com>' as const
export const VOLTA_1211_REPLY_TO = 'hello@usekineo.com' as const
export const VOLTA_1211_DOWNLOAD_EVENTS = ['video_downloaded', 'video_download_clicked'] as const
export const VOLTA_1211_REGION_EVENTS = ['trial_region_excluded', 'region_paid_only_notice_shown'] as const

export type VoltaSegmento = 'c_baixou' | 'a_filme_parado' | 'd_pais_pago' | 'b_sem_filme'
export type VoltaLingua = 'en' | 'pt' | 'es'
export const VOLTA_1211_ORDEM: readonly VoltaSegmento[] = ['c_baixou', 'a_filme_parado', 'd_pais_pago', 'b_sem_filme']
/** ORDEM TRAVADA (CEO 13/11): o envio só alcança os segmentos desta lista. Dia 1 = só c (quem baixou o filme). a, d e b entram
 *  aqui num commit da CEO, depois da medição de 24 h do lote anterior. O ensaio continua mostrando os quatro. */
export const VOLTA_1211_SEGMENTOS_LIBERADOS: readonly VoltaSegmento[] = ['c_baixou']
export function voltaSegmentoLiberado(seg: VoltaSegmento): boolean {
  return VOLTA_1211_SEGMENTOS_LIBERADOS.includes(seg)
}

const PT = new Set(['BR', 'PT', 'AO', 'MZ', 'CV'])
const ES = new Set(['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'UY', 'PY', 'BO', 'GT', 'DO', 'CR', 'PA', 'HN', 'SV', 'NI', 'CU', 'PR'])

/** A língua da carta: o país do cadastro (ou o último visto). Sem país = inglês. */
export function voltaLingua(country: unknown): VoltaLingua {
  const cc = typeof country === 'string' ? country.trim().toUpperCase() : ''
  if (PT.has(cc)) return 'pt'
  if (ES.has(cc)) return 'es'
  return 'en'
}

export type VoltaFatos = {
  paid: boolean
  optedOut: boolean
  internal: boolean
  /** filmes entregues (videos.status = 'completed') */
  films: number
  downloaded: boolean
  regionPaidOnly: boolean
  /** última atividade conhecida (evento ou filme), ms; null = nenhuma */
  lastActiveMs: number | null
  nowMs: number
}

/** O segmento da pessoa, ou o motivo de ficar fora. Um segmento só por pessoa. */
export function voltaSegmento(f: VoltaFatos): { seg: VoltaSegmento } | { fora: 'pagante' | 'opt_out' | 'interno' | 'ativo_7d' } {
  if (f.internal) return { fora: 'interno' }
  if (f.paid) return { fora: 'pagante' }
  if (f.optedOut) return { fora: 'opt_out' }
  const parado = f.lastActiveMs === null || f.nowMs - f.lastActiveMs >= VOLTA_1211_IDLE_DAYS * 86_400_000
  if (f.films > 0) {
    if (!parado) return { fora: 'ativo_7d' }
    return { seg: f.downloaded ? 'c_baixou' : 'a_filme_parado' }
  }
  if (!parado) return { fora: 'ativo_7d' }
  return { seg: f.regionPaidOnly ? 'd_pais_pago' : 'b_sem_filme' }
}

/** Título do filme para o assunto/corpo (o mesmo saneamento do winback de 13/10: sem quebra de linha, até 90). */
export function voltaTitulo(title: unknown, topic: unknown): string | null {
  const t = pickMomentumTopic(typeof title === 'string' ? title : null) ?? pickMomentumTopic(typeof topic === 'string' ? topic : null)
  if (!t) return null
  const clean = t.replace(/[\r\n\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90)
  return clean.length >= 3 ? clean : null
}

const VIDEO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UTM = { utm_source: 'lifecycle', utm_medium: 'email', utm_campaign: VOLTA_1211_CAMPAIGN }

/** O link da carta: a página do PRÓPRIO filme quando existe; senão o Studio com a ideia dela escrita na caixa (nada começa sozinho). */
export function voltaLink(base: string, input: { videoId?: string | null; idea?: string | null }): string {
  const b = base.replace(/\/+$/, '')
  if (typeof input.videoId === 'string' && VIDEO_ID.test(input.videoId)) {
    return `${b}/history?${new URLSearchParams({ v: input.videoId, ...UTM }).toString()}`
  }
  const idea = typeof input.idea === 'string' ? input.idea.replace(/[\r\n]+/g, ' ').trim().slice(0, 120) : ''
  return `${b}/studio/create?${new URLSearchParams({ ...UTM, ...(idea ? { prompt: idea } : {}) }).toString()}`
}

type Carta = { subject: string; lines: string[]; button: string }
const q = (t: string, _l: VoltaLingua) => `“${t}”`

function carta(seg: VoltaSegmento, l: VoltaLingua, film: string | null, idea: string | null): Carta {
  const f = film ? q(film, l) : null
  if (seg === 'c_baixou' || seg === 'a_filme_parado') {
    const baixou = seg === 'c_baixou'
    if (l === 'pt') return {
      subject: f ? (baixou ? `E o próximo depois de ${f}?` : `Seu filme ${f} continua aqui`) : (baixou ? 'E o próximo filme?' : 'Seu filme continua aqui'),
      lines: [
        baixou ? `Você baixou ${f ?? 'o seu filme'} na Kineo.` : `O filme que você fez na Kineo${f ? `, ${f},` : ''} está guardado na sua biblioteca.`,
        baixou ? 'O próximo episódio sobre o mesmo tema começa com uma frase — o seu filme está na página, pronto para assistir de novo.' : 'Assista de novo, baixe, ou faça o próximo sobre o mesmo tema.',
      ],
      button: 'Abrir meu filme',
    }
    if (l === 'es') return {
      subject: f ? (baixou ? `¿Y el siguiente después de ${f}?` : `Tu video ${f} sigue aquí`) : (baixou ? '¿Y el siguiente video?' : 'Tu video sigue aquí'),
      lines: [
        baixou ? `Descargaste ${f ?? 'tu video'} en Kineo.` : `El video que hiciste en Kineo${f ? `, ${f},` : ''} está guardado en tu biblioteca.`,
        baixou ? 'El próximo episodio sobre el mismo tema empieza con una frase — tu video está en la página, listo para verlo otra vez.' : 'Míralo otra vez, descárgalo o haz el siguiente sobre el mismo tema.',
      ],
      button: 'Abrir mi video',
    }
    return {
      subject: f ? (baixou ? `Ready for the next one after ${f}?` : `Your film ${f} is still here`) : (baixou ? 'Ready for your next film?' : 'Your film is still here'),
      lines: [
        baixou ? `You downloaded ${f ?? 'your film'} on Kineo.` : `The film you made on Kineo${f ? `, ${f},` : ''} is saved in your library.`,
        baixou ? 'The next episode on the same topic starts with one sentence — your film is on the page, ready to watch again.' : 'Watch it again, download it, or make the next one on the same topic.',
      ],
      button: 'Open my film',
    }
  }
  // sem filme (b e d): nunca promete filme grátis — d é exatamente o país onde ele não existe, e conta antiga pode estar sem crédito.
  const temIdeia = idea ? q(idea, l) : null
  if (l === 'pt') return {
    subject: 'Seu primeiro filme está a uma frase',
    lines: [
      'Você criou sua conta na Kineo, mas ainda não fez nenhum filme.',
      'Escreva uma frase: a Kineo escreve o roteiro, escolhe as cenas e narra.',
      ...(temIdeia ? [`Deixamos uma ideia na caixa para começar: ${temIdeia} — troque pelo que quiser.`] : []),
    ],
    button: 'Fazer meu primeiro filme',
  }
  if (l === 'es') return {
    subject: 'Tu primer video está a una frase',
    lines: [
      'Creaste tu cuenta en Kineo, pero todavía no hiciste ningún video.',
      'Escribe una frase: Kineo escribe el guion, elige las escenas y lo narra.',
      ...(temIdeia ? [`Dejamos una idea en la caja para empezar: ${temIdeia} — cámbiala por lo que quieras.`] : []),
    ],
    button: 'Hacer mi primer video',
  }
  return {
    subject: 'Your first film is one sentence away',
    lines: [
      'You created a Kineo account but haven’t made a film yet.',
      'Type one sentence: Kineo writes the script, picks the scenes and narrates it.',
      ...(temIdeia ? [`We left an idea in the box to start: ${temIdeia} — change it to anything.`] : []),
    ],
    button: 'Make my first film',
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Assunto + texto + HTML. O rodapé (descadastro, CAN-SPAM) vem do chamador: emailFooterText/emailFooterHtml(userId). */
export function voltaCarta(input: {
  seg: VoltaSegmento; lingua: VoltaLingua; film: string | null; idea: string | null; link: string
  footer: { text: string; html: string }
}): { subject: string; text: string; html: string } {
  const c = carta(input.seg, input.lingua, input.film, input.idea)
  const assina = input.lingua === 'pt' ? '— Equipe Kineo' : input.lingua === 'es' ? '— Equipo Kineo' : '— The Kineo team'
  const text = [...c.lines, '', `${c.button}: ${input.link}`, '', assina, '', input.footer.text].join('\n')
  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#111;max-width:520px">${c.lines.map((l) => `<p style="margin:0 0 14px">${esc(l)}</p>`).join('')}<p style="margin:22px 0"><a href="${esc(input.link)}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">${esc(c.button)}</a></p><p style="margin:0 0 14px;color:#555">${esc(assina)}</p>${input.footer.html}</div>`
  return { subject: c.subject, text, html }
}

/**
 * As ondas: crescer devagar num domínio que manda ~38 e-mails/dia (média de 45 dias no email_send_log) e nunca passou de 91.
 * Dobra a cada dia limpo; a régua de parada (voltaPararOnda) corta antes da onda seguinte. `vagaDoDia` = o que o teto do Resend
 * deixa para campanha 'growth' (60% do teto diário menos o já enviado hoje — lib/email/quota).
 */
export const VOLTA_1211_ONDAS = [50, 100, 200, 400, 600, 800, 1000] as const
export function voltaOndaDoDia(dia: number, vagaDoDia: number): number {
  const i = Math.max(0, Math.min(VOLTA_1211_ONDAS.length - 1, Math.floor(dia) - 1))
  return Math.max(0, Math.min(VOLTA_1211_ONDAS[i], Math.floor(vagaDoDia)))
}

/** Régua de parada de uma onda (medida 24 h depois). Spam ≥ 0,1% (teto do Gmail para remetente em massa), bounce ≥ 4%,
 *  descadastro ≥ 1% ou, depois de 200 envios, clique < 1% → PARA (não manda a onda seguinte). */
export function voltaPararOnda(m: { enviados: number; spam: number; bounces: number; descadastros: number; cliques: number }): string | null {
  if (m.enviados <= 0) return null
  if (m.spam / m.enviados >= 0.001) return 'spam'
  if (m.bounces / m.enviados >= 0.04) return 'bounce'
  if (m.descadastros / m.enviados >= 0.01) return 'descadastro'
  if (m.enviados >= 200 && m.cliques / m.enviados < 0.01) return 'clique'
  return null
}

export function voltaClaimId(sha256Hex: (s: string) => string, userId: string): string {
  const h = sha256Hex(`${VOLTA_1211_CLAIM}:${userId}`)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}

// ═══ KINEO-EMAILS-REGIAO-2026-10-13 — o 1º filme por e-mail para as contas 'region_paid_only' (fundador 13/10, aprovado) ══
//
// O DADO (Supabase, só SELECT, 13/10): 108 contas 'region_paid_only' nunca fizeram filme.
//   · 80 nasceram ANTES do filme grátis de região (08/10 03:03 UTC, REGION_FREE_FILM_LIVE em lib/freeFilmPolicy.ts): 0 cr
//     de filme (só o clipe de 5 cr), nenhuma carta nossa jamais lhes disse o preço do passe de 1 filme;
//   · 28 nasceram DEPOIS e TÊM o filme grátis (14 cr = 9 do filme Seedance 1.5 de 15 s + 5 do clipe) — e não receberam a
//     carta do 1º filme, porque o send-activation-nudge (podeGerarParaLembrete, regra de 03/10) as tratava como "não podem
//     gerar" e as carimbava com o sentinela.
//
// AS DUAS PEÇAS (nenhum cron novo, nenhum crédito dado — "CRÉDITO NÃO É ISCA"):
//   (1) A carta de sempre do 1º filme (cron send-activation-nudge, janela 1–6 h) passa a ir também para a conta
//       'region_paid_only' que TEM o filme grátis no saldo: `filmeDeRegiaoNoSaldo` abaixo + o 2º parâmetro de
//       podeGerarParaLembrete (lib/lifecycle/lembreteComIdeia.ts). 'blocked' continua fora. Só cadastros novos: o cron
//       não volta no passado.
//   (2) Campanha de ADMIN (app/api/admin/send-region-first-film) para quem já passou da janela do cron, com DUAS cartas:
//       · 'pass'      — sem o filme grátis no saldo: "Your first Kineo film for <preço>", o passe ?pack=starter (1 filme
//                       Seedance 1.5 de 60 s, pagamento único), preço de regionPassPrice() na moeda que a Stripe vai cobrar,
//                       link /api/region-pass?surface=first_film&go=1 (o mesmo do banner de 603feced → intent_campaign
//                       region_paid_first_film) e um filme REAL da vitrine pública (/showcase), nunca /v/ de cliente;
//       · 'free_film' — com o filme grátis parado: "Your free film is waiting", as 3 ideias do 1º filme (o MESMO gerador
//                       de KINEO-EMAILS-VENDA-2026-10-13) a 1 clique no Studio com Seedance 1.5 de 15 s.
//
// QUAL CARTA: a régua é o SALDO, não a data — exatamente o que o servidor admite (generate-video-cinematic:
// regionFreeFilmAdmissible + débito de REGION_FREE_FILM_CREDITS). Conta antiga com saldo ≥ 1 filme e nenhum vídeo tem o
// filme grátis de verdade (medido: 3 das 80); conta nova que gastou o saldo em clipes NÃO tem (a carta seria mentira).
//
// MÓDULO SEM ENV E SEM REDE (só imports relativos e puros): a rota, o cron e o guardião
// scripts/test-emails-regiao-1310.mjs executam as MESMAS funções.
import { REGION_FREE_FILM_CREDITS, REGION_FREE_FILM_SECONDS, REGION_PAID_ONLY_TRIAL_STATUS, regionFreeFilmAvailable } from '../freeFilmPolicy'
import { REGION_PASS_COPY, regionPassGoHref, regionPassOfferEligible, regionPassPrice, type RegionPassPrice } from '../regionPass'
import { ENGINE_PAGE_LEAD } from '../publicExamples'
import { comMotorDeEntrada, ideiasDoPrimeiroFilme, type FonteDasIdeias, type IdeiaPronta } from './primeiroFilmeIdeias'

export const REGION_FIRST_FILM_EMAIL_MARK = 'KINEO-EMAILS-REGIAO-2026-10-13' as const
/** Rótulo da campanha (campaign_run_v1, ledger de cota). */
export const REGION_FIRST_FILM_EMAIL_CAMPAIGN = 'region_first_film_email' as const
/** Carimbo de ENVIO (em LIFECYCLE_EMAIL_EVENT_NAMES e em SERVER_ONLY_EVENTS no mesmo commit). */
export const REGION_FIRST_FILM_EMAIL_SENT = 'region_first_film_emailed' as const
/** Reserva atômica por pessoa (id determinístico). Não é envio: fica FORA da supressão, mas é server-only. */
export const REGION_FIRST_FILM_EMAIL_CLAIM = 'region_first_film_claimed' as const
export const REGION_FIRST_FILM_EMAIL_FROM = 'Kineo Team <hello@usekineo.com>' as const
export const REGION_FIRST_FILM_EMAIL_REPLY_TO = 'hello@usekineo.com' as const
export const REGION_FIRST_FILM_EMAIL_BATCH_DEFAULT = 30
export const REGION_FIRST_FILM_EMAIL_BATCH_MAX = 60
/** O cron do 1º filme cobre as primeiras 6 h; a campanha não pisa nessa janela. */
export const REGION_FIRST_FILM_CRON_WINDOW_HOURS = 6
/** utm_campaign de cada carta (o placar separa as duas). */
export const REGION_FIRST_FILM_UTM = { pass: 'region_first_film_pass', free_film: 'region_free_film_waiting' } as const

export type RegionFirstFilmVariant = 'pass' | 'free_film'
export type RegionEmailLang = 'en' | 'pt' | 'es'

const SITE = 'https://www.usekineo.com'

type RegionRow = { trial_status?: string | null; has_paid?: boolean | null; plan?: string | null; video_credits?: number | null }

/**
 * A conta 'region_paid_only' tem o filme grátis NO SALDO? A régua da faixa (regionFreeFilmAvailable: interruptor ligado,
 * conta da região, não pagou, plano grátis, saldo ≥ 1 filme) com `videosCount` = quantos vídeos não falhos ela tem.
 */
export function temFilmeDeRegiao(row: RegionRow | null | undefined, videosCount: number | null | undefined): boolean {
  return regionFreeFilmAvailable(row, videosCount)
}

/**
 * Qual carta da campanha de admin. `videosNaoFalhos` = TODAS as linhas de vídeo não falhas da conta (clipe incluído: é a
 * contagem com que o cinematic admite o filme grátis). A rota já tirou quem fez FILME; quem só fez o clipe de 5 s não tem
 * mais o filme grátis admissível e recebe o passe. null = a conta não é desta campanha (não é da região, ou já pagou).
 */
export function varianteDaCarta(row: RegionRow | null | undefined, videosNaoFalhos: number | null | undefined): RegionFirstFilmVariant | null {
  if (!row || row.trial_status !== REGION_PAID_ONLY_TRIAL_STATUS) return null
  if (typeof videosNaoFalhos !== 'number') return null
  if (temFilmeDeRegiao(row, videosNaoFalhos)) return 'free_film'
  return regionPassOfferEligible(row) ? 'pass' : null
}

/**
 * Para o CRON do 1º filme (send-activation-nudge): a conta desta linha tem o filme de região no saldo? Só lê o banco para
 * conta 'region_paid_only' (as outras devolvem false sem consulta). Leitura falhou = false = a recusa de sempre (falha
 * fechada: sem saldo comprovado, nada de "seu filme grátis"). Os vídeos a rota confere logo depois (já conferia).
 */
export async function filmeDeRegiaoNoSaldo(
  admin: { from: (t: string) => any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  row: { id?: unknown; trial_status?: string | null } | null | undefined,
): Promise<boolean> {
  if (!row || typeof row.trial_status !== 'string' || row.trial_status.trim().toLowerCase() !== REGION_PAID_ONLY_TRIAL_STATUS) return false
  try {
    const { data, error } = await admin.from('profiles').select('trial_status, has_paid, plan, video_credits').eq('id', row.id).maybeSingle()
    if (error || !data) return false
    return temFilmeDeRegiao(data as RegionRow, 0)
  } catch {
    return false
  }
}

const PT = new Set(['BR', 'PT', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL'])
const ES = new Set(['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'PR', 'GQ'])

/** País do perfil (signup_country, senão last_country), normalizado; null = desconhecido. */
export function paisDoPerfil(p: { signup_country?: unknown; last_country?: unknown } | null | undefined): string | null {
  for (const raw of [p?.signup_country, p?.last_country]) {
    if (typeof raw !== 'string') continue
    const c = raw.trim().toUpperCase()
    if (/^[A-Z]{2}$/.test(c) && c !== 'XX' && c !== 'T1') return c
  }
  return null
}

/** A língua da carta pelo país do perfil (o perfil não guarda idioma): PT/ES quando o país indica; senão inglês. */
export function linguaDoPais(country: string | null): RegionEmailLang {
  if (country && PT.has(country)) return 'pt'
  if (country && ES.has(country)) return 'es'
  return 'en'
}

/**
 * O preço do passe para a carta: regionPassPrice() — a MESMA chamada do checkout do pack — com o país do perfil no lugar do
 * IP e SEM idioma (o idioma do navegador não está no perfil; o país decide, como no checkout). País desconhecido → 'US'.
 */
export function precoDaCarta(country: string | null): RegionPassPrice {
  return regionPassPrice({ ipCountry: country, acceptLanguage: null })
}

function utm(variant: RegionFirstFilmVariant): string {
  return `utm_source=lifecycle&utm_medium=email&utm_campaign=${REGION_FIRST_FILM_UTM[variant]}`
}

/** O botão do passe: a rota do banner (grava o clique e redireciona ao checkout com intent_campaign=region_paid_first_film). */
export function linkDoPasse(): string {
  return `${SITE}${regionPassGoHref('first_film')}&${utm('pass')}`
}

/** O exemplo real: o filme da casa à frente da página do Seedance (posse do fundador) — o MESMO da faixa do topo. */
const EXEMPLO = ENGINE_PAGE_LEAD.find((f) => f.engine === 'cinematic_ai') ?? null
export function exemploDaVitrine(): { title: string; href: string; poster: string } | null {
  if (!EXEMPLO) return null
  return { title: EXEMPLO.title, href: `${SITE}/showcase?${utm('pass')}`, poster: `${SITE}${EXEMPLO.posterPath}` }
}

/** O link "escreva a sua ideia": o compositor aberto no Seedance de 15 s, sem prompt. */
export function linkDoCompositor(): string {
  return comMotorDeEntrada(`${SITE}/studio/create?${utm('free_film')}`)
}

/** As 3 ideias do 1º filme (o gerador de KINEO-EMAILS-VENDA-2026-10-13), com a campanha DESTA carta no utm. */
export function ideiasDaCarta(nicho: string | null): { fonte: FonteDasIdeias; ideias: IdeiaPronta[] } {
  const escolha = ideiasDoPrimeiroFilme(SITE, nicho)
  return {
    fonte: escolha.fonte,
    ideias: escolha.ideias.map((i) => {
      try {
        const u = new URL(i.href)
        u.searchParams.set('utm_campaign', REGION_FIRST_FILM_UTM.free_film)
        return { ...i, href: u.toString() }
      } catch {
        return i
      }
    }),
  }
}

const COPY = {
  en: {
    passSubject: (p: string) => `Your first Kineo film for ${p}`,
    passIntro: 'You signed up for Kineo but haven’t made your first film yet.',
    example: 'See what one looks like — a real Kineo film:',
    reply: 'Questions? Just reply — a real person reads every message.',
    freeSubject: 'Your free film is waiting',
    freeIntro: `Your first film on Kineo is still waiting: a ${REGION_FREE_FILM_SECONDS}-second Seedance 1.5 film from your own idea, on us (with a small Kineo watermark).`,
    ideasLead: `Three ideas ready to go — each one opens the studio with the idea already in the box, set up as a ${REGION_FREE_FILM_SECONDS}-second film:`,
    makeThis: 'Make this one',
    own: 'Or type your own idea',
    hi: 'Hi,',
  },
  pt: {
    passSubject: (p: string) => `Seu primeiro filme na Kineo por ${p}`,
    passIntro: 'Você criou sua conta na Kineo, mas ainda não fez o seu primeiro filme.',
    example: 'Veja como fica — um filme real feito na Kineo:',
    reply: 'Alguma dúvida? É só responder — uma pessoa de verdade lê cada mensagem.',
    freeSubject: 'Seu filme grátis está esperando',
    freeIntro: `Seu primeiro filme na Kineo ainda está esperando: um filme de ${REGION_FREE_FILM_SECONDS} segundos no Seedance 1.5, a partir da sua ideia, por nossa conta (com uma pequena marca d’água da Kineo).`,
    ideasLead: `Três ideias prontas — cada uma abre o estúdio com a ideia já na caixa, como um filme de ${REGION_FREE_FILM_SECONDS} segundos:`,
    makeThis: 'Fazer este',
    own: 'Ou escreva a sua ideia',
    hi: 'Oi,',
  },
  es: {
    passSubject: (p: string) => `Tu primera película en Kineo por ${p}`,
    passIntro: 'Creaste tu cuenta en Kineo, pero todavía no hiciste tu primera película.',
    example: 'Mira cómo queda — una película real hecha en Kineo:',
    reply: '¿Dudas? Solo responde — una persona real lee cada mensaje.',
    freeSubject: 'Tu película gratis te está esperando',
    freeIntro: `Tu primera película en Kineo todavía te está esperando: una película de ${REGION_FREE_FILM_SECONDS} segundos en Seedance 1.5, a partir de tu idea, por nuestra cuenta (con una pequeña marca de agua de Kineo).`,
    ideasLead: `Tres ideas listas — cada una abre el estudio con la idea ya en la caja, como una película de ${REGION_FREE_FILM_SECONDS} segundos:`,
    makeThis: 'Hacer esta',
    own: 'O escribe tu propia idea',
    hi: 'Hola,',
  },
} as const

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
/** Assunto é cabeçalho: nada de quebra de linha nem controle. */
const linha = (v: string) => v.replace(/[\r\n\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim()

export function assuntoDaCarta(variant: RegionFirstFilmVariant, lang: RegionEmailLang, price: RegionPassPrice): string {
  const c = COPY[lang]
  return linha(variant === 'pass' ? c.passSubject(price.label) : c.freeSubject)
}

const BTN = 'display:inline-block;background:#2997ff;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 22px;border-radius:10px;'
const WRAP_OPEN = '<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">'

/** A carta do passe ('pass'). Nenhum preço digitado: tudo de regionPassPrice/REGION_PASS_COPY. */
export function cartaDoPasse(lang: RegionEmailLang, price: RegionPassPrice, footer: { text: string; html: string }): { text: string; html: string } {
  const c = COPY[lang]
  const p = REGION_PASS_COPY[lang]
  const go = linkDoPasse()
  const ex = exemploDaVitrine()
  const charged = p.chargedIn(price.currency.toUpperCase())
  const text = `${c.hi}

${c.passIntro} ${p.noFreeFilm}

${p.kicker}
${p.firstTitle(price.label)}
${p.body(price.seconds, price.credits)} ${charged}

${p.firstCta(price.label)}:
${go}
${ex ? `\n${c.example} “${ex.title}” (Seedance 1.5)\n${ex.href}\n` : ''}
${c.reply}

Kineo Team
usekineo.com${footer.text}`
  const html = `${WRAP_OPEN}
  <p style="margin:0 0 14px;">${esc(c.hi)}</p>
  <p style="margin:0 0 14px;">${esc(c.passIntro)} ${esc(p.noFreeFilm)}</p>
  <p style="margin:0 0 4px;font-size:12px;font-weight:bold;letter-spacing:.06em;color:#2997ff;">${esc(p.kicker)}</p>
  <p style="margin:0 0 8px;font-size:18px;font-weight:bold;">${esc(p.firstTitle(price.label))}</p>
  <p style="margin:0 0 16px;">${esc(p.body(price.seconds, price.credits))} <span style="color:#555;">${esc(charged)}</span></p>
  <p style="margin:0 0 22px;"><a href="${esc(go)}" style="${BTN}">${esc(p.firstCta(price.label))} &rarr;</a></p>
  ${ex ? `<p style="margin:0 0 8px;">${esc(c.example)}</p>
  <p style="margin:0 0 20px;"><a href="${esc(ex.href)}" style="color:#111;text-decoration:none;"><img src="${esc(ex.poster)}" alt="${esc(ex.title)}" width="90" style="border-radius:8px;vertical-align:middle;margin-right:10px;border:0;" /><strong>&ldquo;${esc(ex.title)}&rdquo;</strong> &middot; Seedance 1.5</a></p>` : ''}
  <p style="margin:0 0 14px;">${esc(c.reply)}</p>
  <p style="margin:0 0 2px;">Kineo Team</p>
  <p style="margin:0;"><a href="${SITE}" style="color:#2997ff;">usekineo.com</a></p>
</div>${footer.html}`
  return { text, html }
}

/** A carta do filme grátis parado ('free_film'): as 3 ideias (ou nenhuma) + o compositor no Seedance de 15 s. Sem preço. */
export function cartaDoFilmeGratis(lang: RegionEmailLang, ideias: IdeiaPronta[], footer: { text: string; html: string }): { text: string; html: string } {
  const c = COPY[lang]
  const own = linkDoCompositor()
  const lista = ideias.length === 3 ? ideias : []
  const text = `${c.hi}

${c.freeIntro}
${lista.length ? `\n${c.ideasLead}\n\n${lista.map((e, i) => `${i + 1}. ${e.titulo}\n   ${e.href}`).join('\n\n')}\n` : ''}
${c.own}: ${own}

${c.reply}

Kineo Team
usekineo.com${footer.text}`
  const html = `${WRAP_OPEN}
  <p style="margin:0 0 14px;">${esc(c.hi)}</p>
  <p style="margin:0 0 14px;">${esc(c.freeIntro)}</p>
  ${lista.length ? `<p style="margin:0 0 10px;font-size:14px;color:#475569;">${esc(c.ideasLead)}</p>
  <table style="border-collapse:separate;border-spacing:0 8px;width:100%;margin:0 0 18px;">${lista
    .map((e) => `<tr><td style="border:1px solid #e6e8ec;border-radius:10px;padding:12px 14px;">
    <a href="${esc(e.href)}" style="color:#111;text-decoration:none;font-weight:bold;font-size:15px;">${esc(e.titulo)}</a>
    ${e.gancho ? `<div style="color:#64748b;font-size:13px;margin-top:4px;">${esc(e.gancho)}</div>` : ''}
    <div style="margin-top:8px;"><a href="${esc(e.href)}" style="color:#2997ff;text-decoration:none;font-size:13px;font-weight:bold;">${esc(c.makeThis)} &rarr;</a></div>
  </td></tr>`)
    .join('')}</table>` : ''}
  <p style="margin:0 0 22px;"><a href="${esc(own)}" style="${BTN}">${esc(c.own)} &rarr;</a></p>
  <p style="margin:0 0 14px;">${esc(c.reply)}</p>
  <p style="margin:0 0 2px;">Kineo Team</p>
  <p style="margin:0;"><a href="${SITE}" style="color:#2997ff;">usekineo.com</a></p>
</div>${footer.html}`
  return { text, html }
}

/** UUID determinístico da reserva (campanha + pessoa): a 2ª inserção bate na chave primária e a pessoa é pulada. */
export function reservaDaCarta(sha256Hex: (input: string) => string, userId: string): string {
  const hex = sha256Hex(`${REGION_FIRST_FILM_EMAIL_CAMPAIGN}:${userId}`).slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

/** Espelho exposto ao guardião: o saldo de 1 filme grátis de região (a régua é a de lib/freeFilmPolicy.ts). */
export const REGION_FIRST_FILM_CREDITS_FOR_FILM = REGION_FREE_FILM_CREDITS

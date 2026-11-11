// KINEO-TRAVA-K4-GRATIS-1111 [CEO 11/11, decisão delegada pelo fundador até 10:00: "APROVADO… nasce LIGADA"] — a trava do
// Kling 4 GRÁTIS (o 1º filme de 15 s de quem está no teste). Regras PURAS; quem lê o banco e grava o evento é
// lib/kling4GratisTravaServer.ts; a rota do filme só pergunta "passa?".
//
// O CASO (banco, 11/11 04:07–05:40 BRT): 12 contas novas, 9 com cara de fazenda — Gmail de parte local sem sentido com
// "+apelido" (a MESMA caixa smsnfmshdvrlsbsbhg com +grisham e +pyle), duck.com, país NL/AT, roteiros em russo — e a MESMA
// digital de aparelho em pares (a72a2b23 = +grisham e +maynard). A trava de cadastro (2 ativações por aparelho em 30 dias,
// lib/trialFingerprint.ts) deixou as 12 passarem: a fazenda usa exatamente 2 por aparelho. 3 Kling 4 grátis (US$ 2,355
// cada) foram para ela; o saldo da fal caiu de US$ 19,20 para US$ 3,18 na madrugada.
//
// A REGRA: o Kling 4 grátis exige, AO MESMO TEMPO —
//   (a) e-mail sem "+" e fora de serviço de relay (duck.com, privaterelay.appleid.com e afins);
//   (b) a digital de aparelho desta conta é a 1ª ativação daquele aparelho nos últimos 30 dias (N=1 SÓ para o Kling 4; o
//       teste de créditos segue com N=2 em lib/trialFingerprint.ts);
//   (c) a caixa de e-mail normalizada (Gmail: sem "+", sem pontos, googlemail = gmail) nunca recebeu um Kling 4 grátis.
// Quem não passa NÃO é recusado: ganha o MESMO filme grátis no motor barato de sempre (a rota só desliga a candidatura ao
// Kling 4), sem aviso na tela. Conta paga e conta da casa nunca chegam aqui (a rota só pergunta a quem é candidato e a casa
// passa direto). Em dados: 0 dos 24 pagantes da história usou "+" ou relay.

/** Interruptor de UMA linha. 'on' = a trava vale (nasce ligada: a fazenda está ativa e o saldo da fal está no fim);
 *  'off' = a regra de antes, byte a byte no comportamento (nenhuma leitura, nenhum evento). */
export type Kling4GratisTravaRelease = 'on' | 'off'
export const KLING4_GRATIS_TRAVA_1111: Kling4GratisTravaRelease = 'on'

export const KLING4_GRATIS_TRAVA_VERSION = 'trava_k4_gratis_v1_1111' as const
/** Evento de servidor a cada desvio (está em SERVER_ONLY_EVENTS de app/api/events/route.ts). */
export const KLING4_GRATIS_DESVIO_EVENT = 'kling4_trial_diverted' as const
/** Janela da digital de aparelho (a mesma do cadastro). */
export const KLING4_GRATIS_DIGITAL_JANELA_DIAS = 30

export type Kling4GratisMotivo = 'plus' | 'relay' | 'digital' | 'gmail_repetido' | 'sem_prova'

/** Serviços de RELAY (caixa que esconde o e-mail real e gera infinitas). Não são descartáveis: o cadastro aceita; só o
 *  Kling 4 grátis desvia. */
export const KLING4_GRATIS_RELAY_DOMAINS: readonly string[] = [
  'duck.com',
  'privaterelay.appleid.com',
  'simplelogin.com',
  'simplelogin.io',
  'simplelogin.fr',
  'aleeas.com',
  'slmails.com',
  'anonaddy.com',
  'anonaddy.me',
  'addy.io',
  'mozmail.com',
  'relay.firefox.com',
  'passmail.net',
  'passmail.com',
  'passinbox.com',
  '33mail.com',
  'erine.email',
  'mailslurp.com',
]

const GMAIL_DOMAINS = ['gmail.com', 'googlemail.com']

function partes(email: unknown): { local: string; domain: string } | null {
  if (typeof email !== 'string') return null
  const e = email.trim().toLowerCase()
  const at = e.lastIndexOf('@')
  if (at <= 0 || at === e.length - 1) return null
  return { local: e.slice(0, at), domain: e.slice(at + 1) }
}

/** A caixa de verdade: Gmail sem "+sufixo", sem pontos e googlemail = gmail; nos outros, só tira o "+sufixo". */
export function caixaNormalizada(email: unknown): string | null {
  const p = partes(email)
  if (!p) return null
  const semMais = p.local.split('+')[0]
  if (GMAIL_DOMAINS.includes(p.domain)) return `${semMais.replace(/\./g, '')}@gmail.com`
  return `${semMais}@${p.domain}`
}

export function emailTemMais(email: unknown): boolean {
  const p = partes(email)
  return !!p && p.local.includes('+')
}

export function emailDeRelay(email: unknown): boolean {
  const p = partes(email)
  if (!p) return false
  return KLING4_GRATIS_RELAY_DOMAINS.some((d) => p.domain === d || p.domain.endsWith('.' + d))
}

export interface Kling4GratisProva {
  email: string | null
  /** quantas OUTRAS contas ativaram com a MESMA digital antes desta, na janela; null = leitura falhou */
  outrasNaDigitalAntes: number | null
  /** caixas normalizadas que JÁ receberam um Kling 4 grátis (de outras contas); null = leitura falhou */
  caixasQueJaReceberam: readonly string[] | null
}

/** Os motivos do desvio ([] = passa). Leitura que falhou vira 'sem_prova' (desvia para o motor barato: o filme grátis
 *  continua saindo; só não sai no motor caro sem prova). */
export function kling4GratisMotivos(p: Kling4GratisProva): Kling4GratisMotivo[] {
  const m: Kling4GratisMotivo[] = []
  if (emailTemMais(p.email)) m.push('plus')
  if (emailDeRelay(p.email)) m.push('relay')
  if (p.outrasNaDigitalAntes === null || p.caixasQueJaReceberam === null) m.push('sem_prova')
  if (typeof p.outrasNaDigitalAntes === 'number' && p.outrasNaDigitalAntes > 0) m.push('digital')
  const caixa = caixaNormalizada(p.email)
  if (caixa && Array.isArray(p.caixasQueJaReceberam) && p.caixasQueJaReceberam.includes(caixa)) m.push('gmail_repetido')
  return m
}

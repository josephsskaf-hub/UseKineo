// KINEO-PAINEL-FILME-EM-VOO-0311 — fundador 03/11, olhando o bloco "online agora" do /admin: "deixa mais claro qual é o filme que está renderizando".
// O selo RENDERING dizia que havia render, mas não QUAL filme nem em que motor. Esta função lê os eventos da própria pessoa
// (o mais novo primeiro, como a rota já recebe) e escreve: "Kling 4.0, filme grátis · 15 s · “Meninas, olha que lindo…”".
// Motor: o evento do filme grátis manda; depois o despacho ao fornecedor. Antes disso, "motor sendo definido", porque o filme
// grátis pode trocar o motor escolhido na tela e o painel não pode afirmar o que ainda não aconteceu.
// Nomes públicos: lib/engineLabel.ts e lib/admin/motorEntregue.ts. Falta de dado nunca vira selo inventado.
import { engineLabelFor } from '@/lib/engineLabel'
import { nomeVendido } from '@/lib/admin/motorEntregue'

export type EventoDoFilme = { name: string; metadata?: unknown }

const INICIO = new Set(['video_generation_started', 'generate_started'])
const TEMA_MAX = 60

const dados = (e: EventoDoFilme | undefined): Record<string, unknown> =>
  e && e.metadata && typeof e.metadata === 'object' ? (e.metadata as Record<string, unknown>) : {}
const texto = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

function motorDe(free: EventoDoFilme | undefined, despacho: EventoDoFilme | undefined, paidLive: boolean): string {
  const codigo = texto(dados(free).engine_used)
  const nomeGratis = codigo ? engineLabelFor(null, codigo) : null
  if (nomeGratis) return `${nomeGratis}, ${codigo.toLowerCase().endsWith('_fallback') ? 'reserva do filme grátis' : 'filme grátis'}`
  const md = dados(despacho)
  if (/kling\/v4/i.test(texto(md.engine))) return 'Kling 4.0'
  const quality = texto(md.quality)
  return (quality ? nomeVendido(quality, paidLive) : null) ?? 'motor sendo definido'
}

/** O tema em até 60 caracteres, sem quebrar palavra; vazio se o pedido não veio. */
export function temaCurto(valor: unknown): string {
  const t = texto(valor).replace(/\s+/g, ' ')
  if (t.length <= TEMA_MAX) return t
  const corte = t.slice(0, TEMA_MAX)
  const espaco = corte.lastIndexOf(' ')
  return `${(espaco > 30 ? corte.slice(0, espaco) : corte).trim()}…`
}

/** A linha do filme em voo. `eventos` vem do mais novo para o mais antigo; só vale o que veio depois do último início. */
export function filmeEmVoo(eventos: ReadonlyArray<EventoDoFilme>, paidLive: boolean): string {
  const inicio = eventos.findIndex((e) => INICIO.has(e.name))
  const desta = inicio >= 0 ? eventos.slice(0, inicio) : eventos
  const tentativa = desta.find((e) => e.name === 'generation_attempt_opened')
  const segundos = Number(dados(tentativa).duration)
  const tema = temaCurto(dados(tentativa).topic_hint)
  return [
    motorDe(desta.find((e) => e.name === 'free_film_engine_used'), desta.find((e) => e.name === 'cinematic_dispatch_result'), paidLive),
    Number.isFinite(segundos) && segundos > 0 ? `${segundos} s` : '',
    tema ? `“${tema}”` : '',
  ].filter(Boolean).join(' · ')
}

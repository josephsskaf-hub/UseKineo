// KINEO-PAINEL-MOTOR-ENTREGUE-0211 — o NOME do motor na linha "🎬 24h" do bloco "online agora" (/admin) passa a ser o entregue.
//
// Caso real (02/11, viniciusssvianna, 1º filme grátis às 11:03 BRT): o painel escreveu "24h: 1 pedido no Seedance (pronto)
// · 9 créditos". A pessoa escolheu Seedance na tela (studio_duration_fit_to_balance engine=seedance), mas o filme grátis
// saiu no Kling 4.0 (videos.engine_used=kling4; free_film_engine_used engine_used=kling4). O rótulo vinha do quality_mode
// do débito (cinematic_ai), que diz o que foi ESCOLHIDO, nunca o que rodou.
//
// Só o TEXTO muda — o agrupamento por quality e a conta de "prontos" da rota ficam como eram. Regra, por grupo (pessoa +
// quality do débito):
//   · todos os débitos do grupo com o MESMO motor entregue conhecido → o nome dele, primeiro e sem seta. Filme grátis (todos do
//     free_film_engine_used): "Kling 4.0, filme grátis" ou "Seedance 1.5, reserva do filme grátis". Venda paga diferente: "Seedance 1.5 (vendido como Kling 4.0)";
//   · Kling 4 pago (quality cinematic_hollywood com KLING4_PAID_LIVE) é vendido como "Kling 4.0": entregue kling4 → "Kling 4.0", sem seta;
//   · grupo misto, sem motor entregue, ou valor de fornecedor desconhecido → o texto de antes, byte a byte.
// Nomes públicos: lib/engineLabel.ts (única tradução de motor para nome).
import { engineLabelFor } from '@/lib/engineLabel'

export type MotorEntregue = { code: string; freeFilm: boolean }

/** Junta as duas fontes do motor entregue de UMA geração: o evento do filme grátis manda; videos.engine_used é a reserva. */
export function motorEntregueDe(freeFilmEngine: string | null | undefined, videoEngine: string | null | undefined): MotorEntregue | null {
  const free = typeof freeFilmEngine === 'string' ? freeFilmEngine.trim() : ''
  if (free) return { code: free, freeFilm: true }
  const vid = typeof videoEngine === 'string' ? videoEngine.trim() : ''
  return vid ? { code: vid, freeFilm: false } : null
}

/** O nome do produto VENDIDO para um quality (Kling 3 vira Kling 4.0 quando o Kling 4 pago está no ar). */
export function nomeVendido(quality: string, paidLive: boolean): string | null {
  if (quality === 'cinematic_hollywood' && paidLive) return 'Kling 4.0'
  return engineLabelFor(quality)
}

/**
 * Texto do motor de UM grupo do extrato. `curto` é o texto de antes (ENGINE_SHORT da rota); `entregues` tem um item por
 * débito do grupo (null = motor entregue desconhecido).
 */
export function rotuloMotorGrupo(quality: string, entregues: Array<MotorEntregue | null>, curto: string, paidLive: boolean): string {
  if (entregues.length === 0 || entregues.some((e) => !e)) return curto
  const codes = new Set(entregues.map((e) => e!.code))
  if (codes.size !== 1) return curto
  const nomeEntregue = engineLabelFor(null, entregues[0]!.code)
  if (!nomeEntregue) return curto
  const vendido = nomeVendido(quality, paidLive)
  if (!vendido) return curto
  // KINEO-PAINEL-MOTOR-CLARO-0311 — fundador 03/11: "deixa mais claro qual é o filme que está renderizando". "Seedance 1.5 → Kling 4.0 (filme grátis)"
  // KINEO-PAINEL-MOTOR-CLARO-0311 — obrigava a decifrar a seta: o motor que roda vem primeiro e sozinho; o escolhido na tela só aparece quando foi venda paga diferente.
  if (entregues.every((e) => e!.freeFilm)) return `${nomeEntregue}, ${entregues[0]!.code.endsWith('_fallback') ? 'reserva do filme grátis' : 'filme grátis'}`
  if (vendido === nomeEntregue) return vendido === engineLabelFor(quality) ? curto : vendido
  return `${nomeEntregue} (vendido como ${vendido})`
}

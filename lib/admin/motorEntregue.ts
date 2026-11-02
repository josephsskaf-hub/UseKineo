// KINEO-PAINEL-MOTOR-ENTREGUE-0211 — o motor da linha "🎬 24h" do bloco "online agora" (/admin) passa a ser o ENTREGUE.
//
// Caso real (02/11, viniciusssvianna, 1º filme grátis às 11:03 BRT): o painel escreveu "24h: 1 pedido no Seedance (pronto)
// · 9 créditos". A pessoa escolheu Seedance na tela (studio_duration_fit_to_balance engine=seedance), mas o filme grátis
// saiu no Kling 4.0 (videos.engine_used=kling4; free_film_engine_used engine_used=kling4). O rótulo vinha do quality_mode
// do débito (cinematic_ai), que diz o que foi ESCOLHIDO, nunca o que rodou. Selo honesto vale também para o painel.
//
// Regra:
//   · sem motor entregue conhecido → o rótulo de antes (o escolhido), byte a byte;
//   · entregue com o mesmo nome público do escolhido → o rótulo de antes (sem seta);
//   · diferentes → "Seedance 1.5 → Kling 4.0 (filme grátis)" (o "(filme grátis)" só quando a fonte foi o
//     free_film_engine_used). Nomes públicos: lib/engineLabel.ts (única tradução de motor para nome).
// Valor desconhecido de fornecedor nunca vira selo (engineLabelFor devolve null e o rótulo antigo fica).
import { engineLabelFor } from '@/lib/engineLabel'

export type MotorEntregue = { code: string; freeFilm: boolean }

/** Junta as duas fontes do motor entregue de UMA geração: o evento do filme grátis manda; videos.engine_used é a reserva. */
export function motorEntregueDe(freeFilmEngine: string | null | undefined, videoEngine: string | null | undefined): MotorEntregue | null {
  const free = typeof freeFilmEngine === 'string' ? freeFilmEngine.trim() : ''
  if (free) return { code: free, freeFilm: true }
  const vid = typeof videoEngine === 'string' ? videoEngine.trim() : ''
  return vid ? { code: vid, freeFilm: false } : null
}

/** Chave do extrato: quality do débito + motor entregue (quando há). */
export function chaveMotor(quality: string, entregue: MotorEntregue | null): string {
  return entregue ? `${quality}|${entregue.code}|${entregue.freeFilm ? 'free' : 'paid'}` : quality
}

export function lerChaveMotor(chave: string): { quality: string; entregue: MotorEntregue | null } {
  const [quality, code, kind] = chave.split('|')
  return { quality, entregue: code ? { code, freeFilm: kind === 'free' } : null }
}

/**
 * Rótulo do motor na linha do painel. `curto` é o rótulo antigo do escolhido (ENGINE_SHORT da rota) e continua sendo o
 * texto quando nada se sabe do entregue.
 */
export function rotuloMotorPedido(quality: string, entregue: MotorEntregue | null, curto: string): string {
  if (!entregue) return curto
  const nomeEntregue = engineLabelFor(null, entregue.code)
  if (!nomeEntregue) return curto
  const nomeEscolhido = engineLabelFor(quality) ?? curto
  if (nomeEscolhido === nomeEntregue) return curto
  return `${nomeEscolhido} → ${nomeEntregue}${entregue.freeFilm ? ' (filme grátis)' : ''}`
}

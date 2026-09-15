// KINEO-ESCRITOR-CLASSICO-SABE-A-DURACAO-2026-09-12 — a faixa de palavras por
// cena do vigia de 11/09 (generate-video-fast: wordsPerSceneFor) agora serve
// também ao caminho clássico do generate-video-cinematic (Seedance 1.5, Kling
// 2.5, Veo). Mesma régua do escalador do compose (targetWordCount = 3,1 pal/s
// × s), dividida pelas cenas, com ±10% de folga (dentro dos ±15% em que o
// escalador não reescreve). 90 s / 9 → 27-35 · 60 s / 6 → 27-35 · 35 s / 4 →
// 24-30 · 45 s / 5 → 25-31. A cópia local da rota fast fica como está (o
// guardião test-vigia-palavras-por-cena a executa por nome).
import { targetWordCount } from '@/lib/compose'

// KINEO-RITMO-POR-VOZ-2026-09-15 — com `wordsPerSecond` (régua da voz que vai falar, lib/speechRate)
// o total é duração × régua; sem ele, a régua antiga de 3,1 (targetWordCount) continua.
export function wordsPerSceneFor(durationSeconds: number, sceneCount: number, wordsPerSecond?: number): readonly [number, number] {
  const scenes = Math.max(1, Math.floor(sceneCount))
  const total = wordsPerSecond && wordsPerSecond > 0
    ? Math.round(Math.max(5, Math.min(120, Math.round(durationSeconds))) * wordsPerSecond)
    : targetWordCount(durationSeconds)
  // KINEO-VOZ-NAO-ARRASTA-2026-09-15 — Kling 976eb60d (15/09): faixa 17-22 × 7 cenas, o escritor parou
  // EXATAMENTE no piso (119 = 7 × 17, 86 % do alvo), a 2ª passada não rodou (só roda abaixo do piso) e o
  // corretivo do compose arrastou a voz a 0,73. O piso passa a ser o alvo inteiro: quem entrega o
  // mínimo entrega 100 %; passar até +10 % só alonga o filme (bom, fundador 02/09).
  const lo = Math.max(6, Math.ceil(total / scenes))
  const hi = Math.max(lo, Math.ceil((total * 1.1) / scenes))
  return [lo, hi] as const
}

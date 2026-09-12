// KINEO-ESCRITOR-CLASSICO-SABE-A-DURACAO-2026-09-12 — a faixa de palavras por
// cena do vigia de 11/09 (generate-video-fast: wordsPerSceneFor) agora serve
// também ao caminho clássico do generate-video-cinematic (Seedance 1.5, Kling
// 2.5, Veo). Mesma régua do escalador do compose (targetWordCount = 3,1 pal/s
// × s), dividida pelas cenas, com ±10% de folga (dentro dos ±15% em que o
// escalador não reescreve). 90 s / 9 → 27-35 · 60 s / 6 → 27-35 · 35 s / 4 →
// 24-30 · 45 s / 5 → 25-31. A cópia local da rota fast fica como está (o
// guardião test-vigia-palavras-por-cena a executa por nome).
import { targetWordCount } from '@/lib/compose'

export function wordsPerSceneFor(durationSeconds: number, sceneCount: number): readonly [number, number] {
  const scenes = Math.max(1, Math.floor(sceneCount))
  const total = targetWordCount(durationSeconds)
  const lo = Math.max(6, Math.floor((total * 0.9) / scenes))
  const hi = Math.max(lo, Math.ceil((total * 1.1) / scenes))
  return [lo, hi] as const
}

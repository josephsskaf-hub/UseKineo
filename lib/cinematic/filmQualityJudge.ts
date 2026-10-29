// KINEO-QUALIDADE-TODOS-MOTORES-2910 — same still/ficha judge, with no additional fal generation.
import { criticarStill, type EntradaCritico, type DepsCritico, type RelatoCriticoStill } from '@/lib/cinematic/criticoStill'
import { decidirSemFolha, mostraSemFolha, JUIZ_FICHA_VERSAO } from '@/lib/cinematic/juizFicha'
import type { FichaDePersonagem } from '@/lib/cinematic/folhaDePersonagem'

// KINEO-QUALIDADE-TODOS-MOTORES-2910 — approval is attached to the selected URL, never to a scene number.
export function stillFoiAprovado(relato: RelatoCriticoStill, url: string): boolean {
  return relato.url_final === url && relato.tentativas.some(t => t.n === relato.escolhida_tentativa && t.url === url && t.veredito === 'PASS')
}

/** Existing retry callbacks and budgets are preserved. Identity failures never become approved references. */
export async function julgarStillDoFilme(e: EntradaCritico, d: DepsCritico & {
  fichas?: ReadonlyArray<FichaDePersonagem>
  herdado?: { prompt: string; voiceover: string }
}) {
  // KINEO-QUALIDADE-TODOS-MOTORES-2910 — an approved source frame anchors identity; the video executes the NEW action.
  const input = d.herdado ? { ...e, mostra: d.herdado.prompt, fala: d.herdado.voiceover } : e
  const judged = await criticarStill({ ...input, mostra: mostraSemFolha(input.mostra, d.fichas ?? []) }, d)
  const decision = decidirSemFolha(judged.relato)
  Object.assign(judged.relato, { juiz_ficha: JUIZ_FICHA_VERSAO, ficha_reprovada: decision.precisa,
    ficha_motivo: decision.motivo, fal_extra: 0 })
  return judged
}

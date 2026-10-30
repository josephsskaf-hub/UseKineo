// KINEO-PLANO-ANTES-DE-GASTAR-3010 [vai do fundador 30/10 "A, B, C e D … estão todos autorizados"] — o defeito nº 1 do revisor é
// "o pedido não aparece no vídeo" (a festa do pijama de nallelhy, Vênus de eduardorijo — 2 compradores foram embora). O roteiro
// já nascia de graça no /api/generate-script, mas o caminho do Studio (?prompt=) pulava a revisão e gastava direto. Agora a pessoa
// vê o PLANO (cena 1…N, a última em destaque como "final do filme") e corrige a ideia antes do crédito sair.
import { parseUserScript } from '@/lib/scriptParser'

export interface CenaDoPlano { n: number; texto: string; final: boolean }

/** As cenas do roteiro marcado, na ordem (fala de cada bloco); a última é o final do filme. */
export function cenasDoPlano(script: string | null | undefined): CenaDoPlano[] {
  const segs = parseUserScript(String(script ?? '')).segments.map((s) => s.voiceover.trim()).filter(Boolean)
  return segs.map((texto, i) => ({ n: i + 1, texto, final: i === segs.length - 1 && segs.length > 1 }))
}

export const PLANO_EVENTOS = { shown: 'film_plan_shown', confirmed: 'film_plan_confirmed', edit: 'film_plan_edit' } as const

export const PLANO_COPY = {
  en: { title: 'Your film plan', sub: 'Check the scenes before any credit is used. The last scene is how your film ends.', scene: 'Scene', ending: 'Ending', confirm: 'Looks right — create my film', edit: 'Change my idea', missing: 'Something missing? Change your idea and say exactly how it should end.' },
  pt: { title: 'O plano do seu filme', sub: 'Confira as cenas antes de gastar crédito. A última cena é o final do filme.', scene: 'Cena', ending: 'Final', confirm: 'Está certo — criar meu filme', edit: 'Mudar minha ideia', missing: 'Faltou algo? Mude a ideia e diga exatamente como o filme deve terminar.' },
  es: { title: 'El plan de tu película', sub: 'Revisa las escenas antes de usar créditos. La última escena es el final de tu película.', scene: 'Escena', ending: 'Final', confirm: 'Está bien — crear mi película', edit: 'Cambiar mi idea', missing: '¿Falta algo? Cambia tu idea y di exactamente cómo debe terminar.' },
} as const
export function planoCopy(language: string | null | undefined) {
  const l = String(language ?? '').slice(0, 2).toLowerCase()
  return l === 'pt' ? PLANO_COPY.pt : l === 'es' ? PLANO_COPY.es : PLANO_COPY.en
}

// ═══ KINEO-FILME-GRATIS-COMECA-0211 — "Make my free film" COMEÇA o filme, com o texto certo ═══
// [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
//
// Defeito (02/11, 2 pessoas perdidas): o botão do filme grátis na caixa de upgrade só fechava a caixa e trocava o motor.
//   · noroutine2026 clicou às 17:22:47 BRT, nada aconteceu, foi embora;
//   · madsandreasen: o roteiro de 197 palavras escrito pela IA para 60 s ficou guardado; no clique seguinte os rótulos
//     HOOK/MICRO REWARD fizeram o servidor tratá-lo como palavras DELA e a guarda dos 15 s recusou ("reads for about 79 seconds").
//
// Este módulo decide SÓ o texto do filme grátis (puro, zero efeito): o roteiro que a IA escreveu para outra duração sai e
// a ideia ORIGINAL dela volta; o texto que ELA escreveu/colou nunca é descartado — se é roteiro dela longo demais para o
// filme curto, vira a ideia em modo IA (o escritor do 15 s) em vez de recusa. O GenerateClient aplica e despacha.
// Módulo PURO: executado por scripts/test-filme-gratis-comeca-0211.mts.
import { roteiroCabeNoFilmeCurto } from '@/lib/growth/entradaSeedance15'

export const FILME_GRATIS_COMECA_VERSION = 'filme_gratis_comeca_0211' as const

export interface TextoDoFilmeGratis {
  /** O texto que vai à análise (a ideia original, ou o texto dela). Vazio = não há o que filmar ainda. */
  texto: string
  /** 'ai' = o escritor estrutura na duração do filme grátis; 'verbatim' = o roteiro dela, como está (cabe). */
  modo: 'ai' | 'verbatim'
  /** true = o roteiro que a IA escreveu para outra duração foi descartado e a ideia original voltou. */
  descartouRoteiro: boolean
  /** true = o texto passa pelo escritor (/api/generate-script) antes da análise; false = já é o roteiro (o dela que cabe, ou o da IA na mesma duração). */
  estruturar: boolean
}

export function textoDoFilmeGratis(e: {
  /** O que está na caixa de texto (pode ser a prévia limpa do roteiro da IA). */
  prompt: string | null | undefined
  /** structuredScriptRef.current — o roteiro marcado que iria ao servidor. */
  estruturado: string | null | undefined
  /** ideiaDoRoteiroRef.current — a ideia dela e o roteiro que o /api/generate-script escreveu a partir DELA. */
  ideiaDoRoteiro: { ideia: string; roteiro: string; segundos?: number } | null | undefined
  scriptMode: 'ai' | 'verbatim'
  /** Duração do filme grátis. */
  segundos: number
  /** true = o filme grátis é o curto do Seedance (a guarda de fala dos 15 s vale). */
  curto: boolean
  language?: string | null
}): TextoDoFilmeGratis {
  const estruturado = typeof e.estruturado === 'string' ? e.estruturado.trim() : ''
  const r = e.ideiaDoRoteiro
  // KINEO-FILME-GRATIS-COMECA-0211b — o roteiro que vai ao servidor é EXATAMENTE o que a IA escreveu:
  if (r && estruturado && r.roteiro.trim() === estruturado && r.ideia.trim()) {
    // escrito para OUTRA duração (ou duração desconhecida): foi medido para o filme antigo — sai, a ideia original volta.
    if (r.segundos !== e.segundos) return { texto: r.ideia.trim(), modo: 'ai', descartouRoteiro: true, estruturar: true }
    // escrito para ESTA duração (aprovado/intacto, ex.: Kineo 1 na duração da tela): fica, e vai como o "Looks good" o manda — sem reescrever.
    return { texto: estruturado, modo: e.scriptMode, descartouRoteiro: false, estruturar: false }
  }
  const texto = (estruturado || String(e.prompt ?? '')).trim()
  // Roteiro DELA, longo demais para o filme curto: vira a ideia em modo IA (nunca recusa, nunca apaga).
  if (texto && e.curto && e.scriptMode === 'verbatim' && !roteiroCabeNoFilmeCurto(texto, e.segundos, e.language)) {
    return { texto, modo: 'ai', descartouRoteiro: false, estruturar: true }
  }
  return { texto, modo: e.scriptMode, descartouRoteiro: false, estruturar: e.scriptMode === 'ai' }
}

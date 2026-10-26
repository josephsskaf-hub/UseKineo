// [TRAVA 8.2 — vai do fundador 26/10 "1A": "o avô está desenhado de uma forma na cena 2 e na cena 3 é um vovô com desenho de criança"]
// KINEO-FILME15-ROSTO-2610 — ROSTO FIXO NO FILME GRÁTIS DE 15 s.
//
// O defeito: no Seedance 1.5 de 15 s cada uma das 3 cenas nasce de um still FLUX independente; o texto diz "o avô" e cada still
// inventa um avô (e às vezes outro estilo). Medido em 26/10: 30 de 208 filmes grátis com "personagem ou produto troca entre quadros".
// O conserto já existia: a FOLHA DE PERSONAGEM (KINEO-META95-PERSONAGEM-2010, lib/cinematic/folhaDePersonagem.ts) — uma ficha
// por personagem e os stills das cenas que o citam saindo do nano-banana-pro/edit com a ficha como referência, crítico do still
// conferindo IDENTITY em 'enforce'. Ela só ligava com `formatFlags: ["personagem"]` de conta interna (PERSONAGEM_PUBLIC=false).
//
// Esta peça liga a folha SEM pedido no formato do filme grátis (Seedance 1.5, 15 s). Fase 1 (decisão "1A" do fundador): só contas
// internas, para testar com 2 filmes reais; aprovado pelo olho, FILME15_ROSTO_FIXO_PUBLIC vira true e vale para todo cliente.
// Custo extra estimado por filme: ~US$ 0,45 (folhas FLUX + stills com folha no lugar dos FLUX) — ~US$ 90/semana a ~200 filmes.
// Todas as outras portas da folha continuam valendo (motor clássico com still por cena, âncora ligada, sem Estrela, sem [faceless],
// roteiro com personagem): esta peça só responde "o pedido existe?".
import { SEEDANCE_SHORT_SECONDS, isSeedance15 } from '@/lib/durationByEngine'

/** Fase 2 LIGADA (fundador 26/10, depois do teste do faroleiro: "ficou bom, pode ligar para todos"): todo filme grátis de 15 s ganha a folha de personagem. */
export const FILME15_ROSTO_FIXO_PUBLIC = true // KINEO-FILME15-ROSTO-2610 · fase 2

/** O pedido é o filme grátis de 15 s (Seedance 1.5)? */
export function ehFilme15(duration: unknown, engine: unknown): boolean {
  return Number(duration) === SEEDANCE_SHORT_SECONDS && isSeedance15(typeof engine === 'string' ? engine : null)
}

/** Liga a folha de personagem neste pedido sem `formatFlags`? Filme de 15 s e (fase pública ou conta interna). */
export function rostoFixoNoFilme15(args: { duration: unknown; engine: unknown; interna: boolean; publico?: boolean }): boolean {
  const publico = args.publico ?? FILME15_ROSTO_FIXO_PUBLIC
  return ehFilme15(args.duration, args.engine) && (publico || args.interna === true)
}

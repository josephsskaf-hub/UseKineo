// KINEO-CLIPE360-AMOSTRA-1410 — DESFAZ, em memória, a troca do nível da amostra grátis do Studio Ads (lib/ads/sample.ts:
// ADS_SAMPLE_TIER photo_motion → commercial, decisão do fundador 14/10) para os guardiões que conferem sample.ts BYTE A BYTE
// contra uma base antiga (test-ads-ator-2026-10-09 8a, test-ads-estilos-2026-10-09 7a, test-ads-ux-marca-2026-10-10 6a).
// Módulo auxiliar; não é teste (o nome não começa com test-).
//
// O que a entrega mudou em sample.ts, e só isso: (1) 5 linhas de COMENTÁRIO novas, todas começando com a marca; (2) o valor
// da constante do nível ('photo_motion' → 'commercial'); (3) o nome do nível na frase `note` das 16 línguas ("Photo motion" →
// "Commercial", "Comercial" em pt/es). O arquivo de antes não tinha "Commercial" nem "Comercial", então a volta é exata.
// scripts/test-clipe360-amostra-1410.mjs prova que as linhas marcadas são EXATAMENTE as 5 de comentário (nada de dinheiro
// escondido nelas) e que a volta dá o texto EXATO da base.
export const MARCA_CLIPE360_AMOSTRA_1410 = 'KINEO-CLIPE360-AMOSTRA-1410'

/** O texto de sample.ts de ANTES da troca (LF). Sem a troca, devolve o texto igual (só LF). */
export function semAmostra1410(s) {
  return String(s).replace(/\r\n/g, '\n').split('\n')
    .filter((l) => !l.includes(MARCA_CLIPE360_AMOSTRA_1410))
    .join('\n')
    .split("export const ADS_SAMPLE_TIER: AdsV2Tier = 'commercial'").join("export const ADS_SAMPLE_TIER: AdsV2Tier = 'photo_motion'")
    .split('Comercial').join('Photo motion')
    .split('Commercial').join('Photo motion')
}

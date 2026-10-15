// KINEO-PAYWALL-FILME-PRIMEIRO-1510 — DESFAZ, em memória, a fiação do filme grátis no topo da caixa de planos em
// app/(dashboard)/generate/GenerateClient.tsx, para os guardiões que conferem esse arquivo BYTE A BYTE contra uma base antiga.
// Módulo auxiliar; não é teste (o nome não começa com test-). Cada bloco tem de aparecer EXATAMENTE uma vez (senão lança: conserto
// pela metade não passa). Outros arquivos voltam intocados.
export const MARCA_PAYWALL_FILME_PRIMEIRO_1510 = 'KINEO-PAYWALL-FILME-PRIMEIRO-1510'
const GEN = 'app/(dashboard)/generate/GenerateClient.tsx'

// [como estava na base, como ficou]
const BLOCOS = [
  ["import ConversionUpgrade from '@/components/offers/ConversionUpgrade'\n",
    "import ConversionUpgrade from '@/components/offers/ConversionUpgrade'\n" +
    "import { ideiaDoCartao, type FilmeGratisVariante } from '@/lib/growth/paywallFilmePrimeiro' // KINEO-PAYWALL-FILME-PRIMEIRO-1510\n"],
  ["import { swapFreeTierCopy as ft, TRIAL_CREDITS_SHOWN, TRIAL_FIRST_FILM_PHRASE } from '@/lib/freeTierOffer'\n",
    "import { swapFreeTierCopy as ft, TRIAL_CREDITS_SHOWN, TRIAL_FIRST_FILM_PHRASE, TRIAL_FREE_FILM_SECONDS } from '@/lib/freeTierOffer' // KINEO-PAYWALL-FILME-PRIMEIRO-1510: + TRIAL_FREE_FILM_SECONDS\n"],
  ["          onFirstFilmFree={() => {\n",
    "          // KINEO-PAYWALL-FILME-PRIMEIRO-1510 — a caixa abre com o filme grátis no topo para quem tem 0 filmes. Os filmes do teste\n" +
    "          // usam o clique de baixo (onFirstFilmFree); o filme grátis de REGIÃO (lido na caixa) desce para o Seedance de 15 s aqui.\n" +
    "          // Não gera nada: só deixa o Studio no motor e na duração do filme grátis.\n" +
    "          filmFirst={{\n" +
    "            filmsDelivered,\n" +
    "            idea: ideiaDoCartao(prompt),\n" +
    "            onRegionFreeFilm: () => {\n" +
    "              void trackEvent('first_film_free_offer_clicked', { reason: upgradeReason, surface: 'generate_upgrade_modal', variant: 'region_free_film', credits: credits ?? null })\n" +
    "              setShowUpgradeModal(false)\n" +
    "              setMode('cinematic_ai'); setAiEngine('seedance'); setDuration(SEEDANCE_SHORT_SECONDS)\n" +
    "              if (scriptMode === 'verbatim' && !roteiroCabeNoFilmeCurto(prompt, SEEDANCE_SHORT_SECONDS, language)) setScriptMode('ai')\n" +
    "            },\n" +
    "          }}\n" +
    "          onFirstFilmFree={() => {\n"],
  ["  onRegionPassBeforeBuy = null,\n}: {",
    "  onRegionPassBeforeBuy = null,\n  // KINEO-PAYWALL-FILME-PRIMEIRO-1510 — ausente = a caixa de hoje.\n  filmFirst = null,\n}: {"],
  ["  onRegionPassBeforeBuy?: (() => void) | null\n}) {",
    "  onRegionPassBeforeBuy?: (() => void) | null\n" +
    "  /**\n   * KINEO-PAYWALL-FILME-PRIMEIRO-1510 — filmes entregues, a última ideia e o clique do filme grátis de REGIÃO (lido na caixa).\n" +
    "   * A caixa de conversão abre com o filme grátis no topo para quem tem 0 filmes (planos logo abaixo); ≥ 1 filme = a de hoje.\n" +
    "   * Os filmes do teste usam o MESMO clique da saída de baixo (onFirstFilmFree).\n   */\n" +
    "  filmFirst?: { filmsDelivered: number | null; idea: string | null; onRegionFreeFilm: () => void } | null\n}) {"],
  [" /* KINEO-SAIDA-REGIAO-2026-10-07 */ />\n  }",
    " /* KINEO-SAIDA-REGIAO-2026-10-07 */\n" +
    "      filmFirst={filmFirst ? {\n" +
    "        // KINEO-PAYWALL-FILME-PRIMEIRO-1510 — o MESMO filme grátis da saída de baixo (mesma ordem do freeLabel), só que no topo.\n" +
    "        filmsDelivered: filmFirst.filmsDelivered,\n" +
    "        idea: filmFirst.idea,\n" +
    "        freeFilm: firstFilmFree && onFirstFilmFree ? { variant: 'free', seconds: TRIAL_FREE_FILM_SECONDS }\n" +
    "          : trialSeedance15 && onFirstFilmFree ? { variant: 'trial_seedance15', seconds: trialSeedance15.seconds }\n" +
    "          : trialKineo1 && onFirstFilmFree ? { variant: 'trial_kineo1', seconds: trialKineo1.seconds } : null,\n" +
    "        onStart: (variant: FilmeGratisVariante) => { if (variant === 'region_free_film') filmFirst.onRegionFreeFilm(); else onFirstFilmFree?.() },\n" +
    "      } : null} />\n  }"],
]

/** Tira a fiação do GenerateClient (em memória). Arquivo sem a marca = volta igual (o conserto ainda não está nesta árvore). */
export function desfazPaywallFilmePrimeiro1510(rel, src) {
  if (rel !== GEN || typeof src !== 'string' || !src.includes(MARCA_PAYWALL_FILME_PRIMEIRO_1510)) return src
  let s = src
  for (const [antes, depois] of BLOCOS) {
    const n = s.split(depois).length - 1
    if (n !== 1) throw new Error(`desfaz ${MARCA_PAYWALL_FILME_PRIMEIRO_1510}: bloco achado ${n}× — ${depois.slice(0, 60)}`)
    s = s.split(depois).join(antes)
  }
  if (s.includes(MARCA_PAYWALL_FILME_PRIMEIRO_1510)) throw new Error(`desfaz ${MARCA_PAYWALL_FILME_PRIMEIRO_1510}: sobrou linha marcada`)
  return s
}

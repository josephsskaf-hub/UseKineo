# HANDOFF para o Codex [Citações] — filme grátis = Seedance 1.5 de 15 s (29/09/2026)

**Origem:** decisão do fundador de 29/09 (entrega E3, branch `codex/textos-seedance15-0929`, sessão Kineo CEO). O fundador
decidiu; nós fizemos só a **edição mínima factual** nas fontes que são de vocês. Este arquivo existe para vocês saberem o que
mudou antes de mexer de novo, e qual é a fonte nova.

## A verdade nova (vale para toda resposta citável)

- O filme grátis de quem chega é **"a free 15-second film (Seedance 1.5)"**: `creditCostForDuration('cinematic_ai', true, 15)`
  = 7 créditos, pagos pelos 10 do trial (sobram 3), com marca d'água.
- O **Kineo 1 saiu do catálogo público** (`lib/engineLaunch.ts` `KINEO1_PUBLIC = false`). Continua existindo só para quem já
  paga e usa, e como unidade dos pacotes avulsos da página de agências (pago, nunca "free").
- A **cota semanal** ("1 free Kineo 1 video every week") **não é mais anunciada**. O mecanismo fica no `/api/compose` até a E4.
- Nenhuma resposta pode dizer "free Kineo 1 video", "two Kineo 1 films", cota semanal grátis, nem filme grátis de 35 s.
- `/ai-video-generator/kineo-1` (e `/<lang>`) é **301 para `/ai-video-generator/seedance`** (`next.config.js`), fora do
  sitemap (`ENGINE_SLUGS` e `LOCALIZED_ENGINE_SLUGS` filtram o slug aposentado).

## Fontes novas (usem estas, nunca número digitado)

| Constante | Onde | Valor hoje |
|---|---|---|
| `FREE_FILM_LABEL` | `lib/freeTierOffer.ts` | `free 15-second film (Seedance 1.5)` |
| `TRIAL_FREE_FILM_SECONDS` / `TRIAL_FREE_FILM_CREDITS` | `lib/freeTierOffer.ts` | 15 / 7 (derivado de `creditCostForDuration`) |
| `TRIAL_SEEDANCE15_FILMS` | `lib/freeTierOffer.ts` | 1 (= ⌊trial ÷ custo do 15 s⌋) |
| `TRIAL_ACCESS.freeFilm` | `lib/kineoFacts.ts` → `/api/facts` | `{ engine: 'Seedance 1.5', seconds: 15, creditsPerFilm: 7, filmsCovered: 1 }` |
| `RECURRING_FREE_ACCESS` | `lib/kineoFacts.ts` | `null` (não anunciado) |
| `CITATION_FREE_FILM` / `CITATION_FREE_FILM_CREDITS` | `lib/growth/citationAnswers.ts` | `one free 15-second film (Seedance 1.5)` / 7 |
| `RETIRED_ENGINE_SLUGS` | `lib/growth/enginePageCatalog.ts` | `['kineo-1']` |

## O que mudou nas fontes de vocês (edição mínima factual)

- **`lib/growth/citationAnswers.ts`**
  - `CITATION_TRIAL` ganhou "— enough for one free 15-second film (Seedance 1.5)".
  - `CITATION_PLANS[].films` passou de `videosPerMonth(tier, 'fast')` para `videosPerMonth(tier, 'cinematic_ai')`.
  - Toda frase "the 60-second reference costs N credits with Kineo 1 …", "Choose Kineo 1 for stock footage …", "Kineo 1 is the
    lowest-credit option …", "Select Kineo 1 …", "How many 60-second Kineo 1 videos fit in Starter?", "Creator can cover N Kineo 1
    reference videos …", "the balance covers reference videos on Kineo 1 and Seedance 1.5", "covers either reference workflow"
    virou a versão Seedance: 15 s (7 cr, o filme grátis do trial) e 60 s (25 cr).
  - Ficaram como estavam (fatos sem promessa de grátis): `CITATION_TIME` (tempo do Fast), as duas frases "Kineo 1 matches
    existing stock footage …" (diferença de motor no guia de terror e no FAQ), e o `redirect` com `engine: 'fast'` do
    catálogo (fluxo é da E2b).
  - `CITATION_FAST_CREDITS` continua exportado (compatibilidade), sem uso nas respostas.
- **`components/CitationAnswerPage.tsx`**: legenda da tabela de planos em "Seedance 1.5 reference videos"; linha do Kineo na
  tabela comparativa sem "Kineo 1 stock footage"; nota de custo usa Seedance 60 s e 15 s (`CITATION_FREE_FILM_CREDITS`).
- **`components/CitationComparisonDecision.tsx`**: a mesma célula de motores, sem Kineo 1.
- **`components/CitationCostDecision.tsx`**: a linha `{ quality: 'fast', name: 'Kineo 1' }` saiu; fica só o Seedance 1.5.
- **`lib/growth/enginePageCatalog.ts`**
  - `kineo-1`: h1 sem "free", intro sem "runs without a card", FAQ "Is Kineo 1 really free?" virou "Who can use Kineo 1?"
    (conta paga e pacotes; conta nova começa no filme grátis de 15 s). A página não é mais servida (301), o texto fica para o
    dia em que `KINEO1_PUBLIC` voltar.
  - `seedance`: intro e FAQ "Can I use Seedance 1.5 without paying?" dizem que o trial paga um filme grátis de 15 s; tradeoff
    sem "Kineo 1 is faster and free".
  - `veo`: tradeoff "pair it with Kineo 1 for volume" → "pair it with Seedance 1.5 for volume".
  - `ENGINE_SLUGS` passou a filtrar `RETIRED_ENGINE_SLUGS`.
- **`lib/seo/freeShortsGeneratorLangs.ts`** (13 línguas): o `note` do formulário ("o primeiro vídeo Kineo 1 começa sem cartão"),
  o `handoff.description` ("senão, Kineo 1") e o FAQ "é grátis?" ("vídeos Kineo 1 com marca d'água sem cartão") passaram a
  falar do filme Seedance 1.5 de 15 s. Números nas traduções são literais de i18n (15 s), como o "35 secondes" que já estava lá.

## Guardião

`scripts/test-copy-filme-gratis-15s-2026-09-29.mjs` executa o `/llms.txt` e o `/api/facts`, e varre só o TEXTO público
(literais e JSX, sem comentários) destas fontes, proibindo `/free\s+Kineo 1/`, `/Kineo 1…free/`, `/free…Kineo 1/`,
`/two Kineo 1/`, cota semanal grátis e filme grátis de 35 s. Se vocês reescreverem uma resposta, rodem ele.

## Pendências que NÃO são de texto (outras entregas)

- E2b: o motor padrão das ~92 páginas de `lib/seo/intentPages.ts` (`engine: 'fast'`) e o link `engine=cinematic_ai` → `seedance`
  em `app/ai-video-generator/for/[slug]/page.tsx:48`; o `redirect` com `engine: 'fast'` do catálogo de citações.
- E4: fim do mecanismo da cota semanal (e da campanha `app/api/admin/send-weekly-quota`).

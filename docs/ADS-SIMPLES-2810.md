# KINEO-ADS-SIMPLES-2810 — Ads com uma régua só, portas honestas e um caminho (28/10/2026)

Fundador (28/10): "simplificar e fazer funcionar o ads sem bugs". Fase 1 = esconder/rotear/consertar, nada apagado em massa.

## O que estava acontecendo (medido em `events`)
- 26/10: 10 pessoas de fora bateram em `/ads/v2` e foram devolvidas à parede `/ads?from=v2` (`ads_access_denied`, stage page);
  27/10 até 14h UTC: mais 5. **Causa:** a página em produção era a de ANTES da amostra da Escolha (o commit a4d3dfed0, de 24/10,
  só chegou à main em b5f25b397, publicado 27/10 15:08 UTC). Naquela página, `sample = adsSampleOpen(...)`: quem já tinha usado
  a amostra antiga (Close real/apresentador), quem tinha `trial_status` barrado ou e-mail descartável caía na parede.
  Desde 27/10 15:08 UTC não há mais nenhuma negação de página — mas a página nova ainda tinha a parede no código.
- Três sistemas de amostra sobrepostos: `adsSampleOpen` (legado), o livro-razão da Escolha (`ads_escolha_samples`) e o probe.

## O que mudou
1. **Régua ÚNICA** — `lib/ads/eligibilityPure.ts` (pura) + `lib/ads/eligibility.ts` (lê o banco):
   `paid` · `free_sample_available` · `free_sample_used` · `not_eligible` (motivo: `region`, `unconfirmed_email`, `disposable`,
   `blocked`, `budget_exhausted_today`, `sample_off`, `ledger_unavailable`). A decisão do produto é o livro-razão da Escolha.
   Usam-na: `/ads/v2`, a porta `/ads`, `GET /api/ads/v2/eligibility` (cards da home e CTA do UGC), `/api/ads/v2/link-import`.
2. **País fail-closed** (fundador 28/10): amostra só para `PAISES_FILME_GRATIS`; país desconhecido = sem amostra. Sinal: país do
   pedido (`x-vercel-ip-country`) → `last_country` → `signup_country`. Vale na página, no `/api/ads/v2/cena`, no upload da
   amostra (`/api/footage`) e no próprio livro-razão (`escolhaSampleServer.verifiedAccount`).
3. **Teto do dia** US$ 10 → **US$ 25** (2500 c): `ADS_ESCOLHA_SAMPLE_DAILY_CAP_CENTS` + migration NOVA
   `supabase/migrations/20261028120000_ads_escolha_sample_cap_2500.sql` (função + CHECK) — **NÃO aplicada**.
4. **Sem parede**: ninguém logado volta para `/ads?from=v2`. Amostra usada → reabre o resultado dela (`?order=`) com
   "versão completa · 41 créditos" + planos; não elegível → aviso honesto (`AdsEligibilityNotice`) na própria tela, com o
   preço em créditos e o botão dos planos. O rastro passa a ser `ads_door_state` (state/reason/country/entry).
5. **Portas honestas**: cards da home e CTA do UGC dizem "grátis" só para visitante ou amostra aberta; caso contrário
   "Make a product ad / Make a UGC ad" (16 línguas, já existiam). A copy da porta `/ads` diz o que a amostra É (8 s,
   apresentador, 2 fotos, marca) em vez do Close de 15 s.
6. **Um caminho**: a Escolha é o montador de todos (já era). `?mode=full`, `?mode=batch` e `/ads/new?classic=1` viraram
   só da casa (cliente cai no simples / no `/ads/v2`). O "link → vídeo" do fundador entrou DENTRO da Escolha: campo
   "cole o link do produto" chama o leitor de sempre e preenche nome e foto.
7. **Toda recusa com próximo passo**: `adsV2RefusalCopy` (en/pt/es) — 402 → planos, 429 → espera honesta, moderação → o que
   mudar, 403 → plano; a tela da Escolha usa a tabela e mostra "Ver planos" quando é caso de plano.

## Escondido (não apagado) — lista para a fase 2
- `/ads/v2?mode=full` (construtor completo, `AdsV2Session`), `/ads/v2?mode=batch` (`AdsV2Batch.tsx`), abas `AdsFlowTabs`,
  link "I prefer to fill in everything myself", `/ads/new?classic=1` (assistente v1 `AdsWizardClient`).
- A amostra legada (`adsSampleOpen`, `adsSampleCapReached`, `adsSamplePresenterCapReached`, `sample_probe`, `sampleEntry`
  presenter sub-cap) continua no código e nas rotas `/plan`, `/start`, `/choose`, `/orders`, `/research` — só é alcançável
  pelos modos da casa.

## Guardião
`node scripts/test-ads-simples-2810.mjs` (209 verificações, 13 mutantes) + camada desfaz `scripts/test-support/desfaz-ads-simples-2810.mjs`
(gerada por `generate-ads-simples-2810-undo.mjs`, regenerar com `tip` = o SHA da entrega).

## Varredura dos abandonados (item 4) — `lib/ads/v2Sweep.ts`, dentro do cron `ads-v2-advance`
Medido 28/10: 44 pedidos de cliente parados há > 48 h (7 draft + 37 planned). Agora: `draft`/`planned` sem atividade há ≥ 48 h
(`updated_at`, gatilho touch) e SEM débito → `cancelled` (`error = abandoned_48h`), por UPDATE condicional (status e o mesmo
`updated_at`): idempotente e seguro contra corrida com um `/start`. Nenhum crédito muda de lugar; a amostra reservada no
livro-razão continua usada. Um evento `ads_v2_order_abandoned` por pedido. Pedido COM débito é assunto do refund-sweep.

## Camada desfaz
Registrada no topo da corrente de 28/10 (`desfaz-rosto-cards-2810.mjs`, acima de `ads-fonte-link-2810`), gerada por
`generate-rosto-cards-2810-undo.mjs ads-simples-2810` (base = f8dde7393, o tip da fonte/link; `tip` = o commit da entrega).

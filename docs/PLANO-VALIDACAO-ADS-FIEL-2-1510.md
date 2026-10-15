# Plano de validação paga — consertos do QA da trava do produto (KINEO-ADS-FIEL-2-1510, 15/10/2026)

**Nada disto foi rodado.** Render pago só com o "vai" do fundador. A trava continua atrás de
`ADS_V2_PRODUCT_LOCK_MODE = 'internal'` (lib/ads/v2ShotLists.ts): cena sem produto, conferência, sombra/tom e o close real só
ligam para a lista EXATA de contas da casa (`isAdsInternalEmail`). Valem para TODOS desde a publicação: a duração (≤ pedido +
0,5 s), o roteiro só com fatos marcados, o "Start over" limpo, o teto por conta + contador, o aviso dos estilos e a pergunta de
pronúncia.

## O QA que originou (15/10, conta josephskaf@hotmail.com, frasco + caixa Atheeri)
| QA | Pedido | O que se viu | Causa achada no banco/código |
|---|---|---|---|
| T1 | `00f98745` Comercial 9:16 PT | colado sem sombra; "fantasma" atrás; produto boiando + miniatura na mesa; 17,54 s; cartão "Perfume" | o Nano Banana recebia o esboço COM o produto + a foto do produto e desenhava outro; `ads_v2_assembling` card 5,028 s = voz 17,028 s (29 palavras pt) + 0,5 − 12,5 de planos |
| T2 | `ad20036d` Premium 1:1 | closes redesenhados (tampa escura, base solta, líquido laranja); caixa duplicada; 17,58 s | os closes eram Seedance (preso) → H3 sobre a foto; plano Premium = 14 s de planos + 2,5 de cartão; voz 17,1 s |
| T3 | link ultracoffee | roteiros com "torne-se um franqueado" (desmarcado); teto do dia; "Start over" herdou Premium + Package explosion e "Um lugar" | o /plan colava a descrição da página no texto do modelo ("From the product page: …"); 20 planos em 24 h (o teto era 20 p/ todos); nível lembrado no navegador + estilo sugerido pelo setor; "Café" do título caía em restaurante |

## Renders de validação (conta da casa — marca d'água forçada, ok para validar)
Antes de cada render: dry-run $0 (regra da casa) e ler o saldo da fal (orçamento da casa US$ 25/semana).

| # | Pedido | Créditos | fal (estimado) | O que olhar |
|---|---|---|---|---|
| 1 | **Refazer o T1**: mesma foto Atheeri (frasco + caixa), Auto, **Comercial 15 s 9:16**, PT, cena "num hotel com chuva" | 41 | ~US$ 2,40 (+ US$ 0,15 por cena refeita pela conferência) | as 3 cenas de gente SEM produto desenhado; o frasco real pousado na mesa com sombra de contato e o tom da cena; nenhum fantasma/miniatura; MP4 ≤ 15,5 s; cartão ≤ 3 s |
| 2 | **Refazer o T2**: mesma foto, Auto, **Premium 15 s 1:1** | 51 | ~US$ 3,40 (os 2 closes viram foto real: −2 Seedance) | os 2 closes = a FOTO REAL com zoom (tampa dourada, base de colmeia presa, líquido da cor da foto); nenhuma caixa duplicada; MP4 ≤ 15,5 s |
| 3 | **T3 do café**: link `ultracoffee.com.br/produto/cafe-ultra-coffee-250g/`, **Comercial 15 s 4:5**, nenhum fato marcado | 41 | ~US$ 2,40 | "Um produto" (nunca "Um lugar"); a lista de fatos SEM a frase de franquia; os 3 roteiros sem franquia/rede de cafeterias; depois "Start over" → Auto + Comercial + "Um produto"; contador não aparece (conta da casa sem teto) |

**Total: 133 créditos da casa, ~US$ 8,20 de fal** (+ até US$ 0,90 se a conferência refizer as 6 cenas de gente; a conferência em si
custa ~US$ 0,0003 por cena e a voz refeita ~US$ 0,01).

### Como conferir (SQL de leitura, projeto `cqqukkvjjrguayiyjvhh`)
```sql
-- duração e cartão de cada render de validação
select metadata->>'order_id' id, metadata->>'card_seconds' card, metadata->>'voice_seconds' voz, metadata->>'total_seconds' total, metadata->'fit' encaixe
from events where name = 'ads_v2_assembling' and created_at > '<marco>'::timestamptz order by created_at;
-- o que a trava fez em cada cena (colada com sombra, refeita, foto real, close real)
select name, metadata->>'order_id' id, metadata->>'idx' idx, metadata->>'to' para, metadata->>'reason' motivo, metadata->'shade' tom
from events where name in ('ads_v2_product_locked', 'ads_v2_shot_fallback') and created_at > '<marco>'::timestamptz order by created_at;
-- medido no arquivo entregue
select metadata->>'order_id' id, metadata->>'measured_seconds' segundos from events where name = 'ads_v2_delivered' and created_at > '<marco>'::timestamptz;
```

### Critério de aprovação
- **Duração**: `measured_seconds` ≤ 15,5 nos 3; `card_seconds` ≤ 3; se a voz foi refeita (`fit.resynth` ≥ 1), a fala soa inteira (frase
  tirada do meio, gancho e fecho com o nome intactos).
- **Produto**: nenhuma cena com 2 produtos, miniatura redesenhada ou produto boiando na frente da pessoa; o recorte pousa numa
  superfície com sombra; o tom não muda a cor do produto a ponto de o cliente estranhar (ganho 0,82–1,08, temperatura ±10 níveis).
- **Closes do Premium**: são a foto real (zoom 108% → 122%), nunca um close gerado.
- **Roteiro**: nenhum fato desmarcado nos roteiros A/B/C; franquia/vagas/investidores nem aparecem como sugestão.
- **Tela**: o aviso dos estilos aparece embaixo dos cartões compactos e no cartão do estilo escolhido, na língua da tela;
  "Como a voz deve dizer 'Atheeri'?" aparece sozinha com a voz em PT (e some com a voz em EN).
- Se o render 1 ainda mostrar produto desenhado na cena: olhar quantas vezes `to = 'scene_retry'` e `to = 'product_photo'`
  (`reason = lock_duplicate`) aconteceram — 2 refações seguidas = o Nano Banana insiste; apertar `ADS_V2_LOCK_EMPTY_ACTIONS` e repetir
  SÓ o render 1.

## Números novos do teto de roteiros (planos em 24 h, contados por `ads_v2_plan_served`)
| Conta | Antes | Agora |
|---|---|---|
| Casa (`isAdsInternalEmail`) | 20 | **sem teto** (nem conta) |
| Business (`plan = 'business'`, inclusive membro da equipe — conta na do dono) | 20 | **60** (o lote faz até 10 por vez: 20 = 2 lotes) |
| Demais (assinantes, passe, parceiro, amostra) | 20 | 20 (inalterado) |
A tela mostra "N roteiros restantes hoje" a partir de 5 (a resposta do /plan traz `plans_left`; o 429 traz `plans_left: 0`).

## Virada para `'all'`
Aprovados os 3 renders: `ADS_V2_PRODUCT_LOCK_MODE = 'all'` (uma linha, lib/ads/v2ShotLists.ts) + rodar
`node scripts/test-ads-fiel-1510.mjs` e `node scripts/test-ads-fiel-2-1510.mjs`.

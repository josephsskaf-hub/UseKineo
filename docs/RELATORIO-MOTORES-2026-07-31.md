# RELATÓRIO COMPLETO DOS MOTORES DE RENDER — 31/07/2026

**Fonte:** produção (`cqqukkvjjrguayiyjvhh`), contando **pessoas externas** (filtro de 17 contas internas aplicado em tudo). Código lido em `4e1a09b`. Janela: história inteira + recorte de 30 dias.

---

## 1. O CENSO — o que cada motor produziu de verdade

O produto declara **12 motores** (`lib/credits/engineCost.ts`). A produção conhece **4**:

| Motor | Créditos | Vídeos (história) | Pessoas | Últimos 30d | Último vídeo | Veredito |
|---|---:|---:|---:|---:|---|---|
| **fast** | 0 free / 1 pago | **227** | **173** | **179** | hoje | ✅ **É o produto** |
| (legado, sem tag) | — | 32 | 25 | 0 | 25/05 | morto, pré-maio |
| **cinematic_ai** (Seedance) | 20 | 20 | 20 | 7 | **06/07** | ⚠️ morto há 25 dias |
| **basic_ai** | 8 | 3 | 1 | 3 | 03/07 | ⚠️ 1 pessoa na vida |
| basic | 8 | **0** | 0 | 0 | nunca | 🔴 zero na história |
| pro | 10 | **0** | 0 | 0 | nunca | 🔴 zero na história |
| cinematic_kling | 50 | **0** | 0 | 0 | nunca | 🔴 zero na história |
| cinematic_veo | 90 | **0** | 0 | 0 | nunca | 🔴 zero na história |
| cinematic_sora | 100 | **0** | 0 | 0 | nunca | 🔴 zero (upstream marcado BLOCKED no código) |
| cinematic_hollywood | 150 | **0** | 0 | 0 | nunca | 🔴 zero na história |
| avatar | 110 | **0** | 0 | 0 | nunca | 🔴 zero na história |
| presenter | 70 | **0** | 0 | 0 | nunca | 🔴 zero na história |

Três leituras que importam:

**1. O Fast é 96% do volume recente e 100% de conclusão.** 179 vídeos em 30 dias, nenhuma falha depois que a linha existe. Todo investimento de qualidade que rende está aqui.

**2. Oito dos doze motores nunca produziram um único vídeo.** Incluindo tudo que a página de preços vende como diferencial premium — o pitch do plano Studio é literalmente *"~4 Cinematic AI videos/mo (Kling)"*, e **o Kling nunca rodou uma vez na história do produto**. A prateleira premium é estoque morto sendo anunciado.

**3. O sinal mais duro está no cinematic_ai: 20 vídeos, 20 pessoas — repetição ZERO.** Vinte pessoas pagaram 20 créditos, viram o resultado, e nenhuma fez um segundo. Isso é um veredito de qualidade/preço dado pelos próprios usuários. O motor está parado desde 06/07.

---

## 2. SAÚDE DO FAST — o motor que importa, medido

### 2.1 Latência (30d, n=199 com tempo medido)

| Métrica | Valor | Contra a promessa |
|---|---:|---|
| p50 | **2,60 min** | promessa pública é "2–4 min" ✅ |
| p90 | **4,49 min** | no limite, honesto ✅ |
| Travados >30 min | **1** (480 min) | coberto: `refund-sweep` roda diário com corte de 2h |

A média (5,34) é o dobro da mediana só por causa do único outlier de 8h. **A promessa de latência da home é verdadeira** — raro neste mercado.

### 2.2 Relevância do B-roll (30d, n=275 com score)

| Faixa | Renders |
|---|---:|
| ≥75 (bom) | **197 (72%)** |
| 60–75 | 75 |
| <60 (ruim) | **3 (1%)** — piso 53 |
| Poluição lifestyle flagada | **0** |

O `relevance-score` está funcionando: 13,1 clipes únicos por render, degradação real (`plan_degraded`) em só 8 casos, o último em 05/07. Os 233 "degraded: markers_detected" **não são defeito** — é o fast-path verbatim fazendo o que deve.

### 2.3 🔴 A descoberta estrutural: o "Pexels" do produto é PIXABAY

`broll_source_distribution` em 289 renders de 30 dias: **Pixabay = 99% dos clipes. Pexels = zero — nem aparece como chave.**

Causa (documentada no Push #215, `generate-video-fast/route.ts:543`): **toda URL de CDN do Pexels retorna HTTP 403 quando o Creatomate busca server-side.** O Pexels foi abandonado estruturalmente; o Pixabay é a fonte real.

Consequências:
- **Nenhuma mentira ao usuário** — a copy pública diz "finds footage", sem citar fornecedor. ✅
- **Mas o código inteiro mente para quem o mantém**: `pexelsQuery`, `pexelsQueries`, `getPexelsVideoForScene` — a nomenclatura aponta para uma fonte que contribui 0%. Já causou confusão em auditoria (esta) e vai causar de novo.
- O aesthetic re-ranker roda sobre Pixabay (`lib/pixabay.ts` importa `aesthetic-score`) — o ranking está na fonte certa. ✅

### 2.4 Voz, legenda, corte — estado após a sprint de 29/07

| Camada | Estado |
|---|---|
| TTS | **tts-1-hd para todos os tiers Fast** (`ttsModelForTier`) — o modelo bom, não o barato ✅ |
| ElevenLabs | só premium/cinematic, atrás de flag — coerente com licença ✅ |
| Legendas | quebra por fim de frase + pausa audível (29/07) — o bug `IT IT'S CALLED` está morto e testado (`scripts/test-caption-chunker.mjs`, 9/9) ✅ |
| Cortes | beat-align reativado (estava morto desde sempre por falta de pontuação no Whisper) ✅ |
| Clipe reciclado | entra em timestamp diferente + movimento de câmera diferente (29/07) ✅ |
| Marca queimada | `usekineo.com/free` — correta. Os exemplos da home com `shortsforgeai.com` eram renders antigos, já substituídos ✅ |
| Música de fundo | `getBackgroundMusicUrl` (Pixabay) presente no compose ✅ |

### 2.5 Faturamento por render — consertado ontem, e não era o código

25 renders de 12 pessoas entre 23–30/07 tiveram o vídeo limpo destruído depois de pronto: o papel `authenticated` tinha perdido `EXECUTE` em `debit_video_credits` (migration de 23/07). Corrigido por migration direto no Postgres em 30/07. **O motor renderizava perfeitamente; a entrega é que morria.** Detalhe em `SPRINT-2026-07-30-D.md`.

---

## 3. O QUE FOI MELHORADO AGORA (nesta sessão)

**A ficha `basic` mentia.** `QUALITY_OPTIONS` vendia *"Uses licensed stock media from top providers"* por 8 créditos — **o mesmo pipeline de stock do Fast**, que custa 0/1. E `basic`/`pro` têm **zero vídeos na história**; `basic_ai` tem 1 pessoa. Descrições reescritas para o que cada motor de fato faz (ver commit). Não removi os motores da UI — decisão de portfólio é sua (§4) — mas o texto parou de prometer diferença que não existe.

**Relatório instalado como fonte canônica** — este arquivo. O prompt das sprints passa a apontar para cá em vez de redescobrir o censo a cada auditoria.

---

## 4. RECOMENDAÇÕES DE PORTFÓLIO — decisões suas, com os dados prontos

**A. Encolher a prateleira para quem chega.** Usuário novo vê até 12 opções de motor numa tela que já tem ~10 controles. Os dados dizem: 96% escolhem Fast, e os que experimentaram o degrau seguinte (cinematic_ai) não repetiram nunca. Esconder tudo exceto Fast até o primeiro vídeo concluído provavelmente **sobe** a ativação — é a mesma lógica do "entregar antes de vender" que já aplicamos na tela de download.

**B. Parar de vender Kling no pitch do Studio até o Kling rodar uma vez.** O plano de $37,90 promete um motor com zero execuções na história. Ou se valida o motor (um render de teste custa ~50 créditos seus), ou o pitch do Studio muda para o que ele comprovadamente entrega (200 créditos + prioridade).

**C. Investigar o zero-repeat do cinematic_ai antes de reativá-lo.** 0/20 repetições é o dado mais informativo do relatório. Antes de mandar tráfego para ele de novo, gere você mesmo 2–3 vídeos Seedance e olhe: o problema é qualidade, expectativa ou preço (20cr)? Sem isso, todo crédito gasto ali repete o experimento que já falhou 20 vezes.

**D. Renomear `pexelsQuery` → `stockQuery` numa sprint de manutenção.** Zero mudança de comportamento, mata uma mentira interna que já custou tempo de auditoria duas vezes.

**E. Sora: manter bloqueado.** O código já marca upstream como BLOCKED; está coerente.

---

## 5. O NÚMERO PARA ACOMPANHAR

**Repetição por motor** — a métrica que o censo revelou e ninguém media:

```sql
with ext as (select id from public.profiles where email not ilike 'josephsskaf%'
  and email not ilike 'josephskaf%' and email not ilike '%@shortsforgeai.com'
  and email not ilike '%@mailinator.com' and email not ilike '%@example.com')
select coalesce(v.quality_mode,'(null)') engine,
       count(distinct v.user_id) pessoas,
       count(*) videos,
       round(count(*)::numeric / nullif(count(distinct v.user_id),0), 2) videos_por_pessoa
from public.videos v join ext on ext.id=v.user_id
where v.status='completed'
group by 1 order by videos desc;
```

Baseline 31/07: **fast = 1,31 vídeos/pessoa · cinematic_ai = 1,00 (zero repetição)**. Motor bom é motor que a mesma pessoa usa de novo.

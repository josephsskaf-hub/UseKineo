# METRICS_AND_FUNNEL.md — O que se mede, o que não se mede, e o que está envenenado

**Data:** 2026-07-27 · **Base:** commit `a517879`

> **Veredito do Ciclo 1:** a empresa **mede muito e sabe pouco**. A instrumentação é boa — 125 eventos, 6 scripts com filtro de conta interna, privacy-safe. Mas **88 dos 125 eventos não são lidos por nada**, e os que são lidos foram inflados por remontagem e por robô. O padrão real é: cada push conserta a medição do push anterior e descobre que o número que justificou a decisão passada estava errado. Ceticismo funcionando, mas **sempre um ciclo atrasado**.

---

## 1. FUNIL RECONSTRUÍDO

Duas medições **independentes**. Não são progressão — não some.

| Etapa | 7d findos 21/07 | Acumulado até 26/07 |
|---|---:|---:|
| Impressões orgânicas (Google) | 138 (01–19/07), 8 cliques | DESCONHECIDO |
| **Pageviews** | **DESCONHECIDO** | **DESCONHECIDO** — buraco de ~4 semanas |
| Sessões na landing | 215 atores | 230 (janela não declarada) |
| Viram o formulário | DESCONHECIDO | 113 |
| Submeteram tópico | 15 | 10 → **−95,7% num só componente** |
| Cadastros | 24 | **713** (665 externos em 16/07) |
| Iniciaram geração | DESCONHECIDO | DESCONHECIDO |
| Concluíram 1º vídeo | 6 | **128 ou 194 — CONTRADIÇÃO** (§4) |
| Viram pricing | 3 | DESCONHECIDO |
| Abriram checkout | 2 sessões humanas (de 41 requisições) | 48 sessões ≈ **~10 pessoas** |
| **Pagaram** | **0** | **4 pessoas, avulso** |
| **Assinantes recorrentes** | **0** | **0 — jamais** |
| Receita | $0 | ~$40–60 |
| Canal YouTube conectado | — | **0** |

**Etapas que não existem como medição:** tráfego→landing · valor percebido (ninguém mede se o vídeo foi baixado ou publicado) · 2º vídeo / retenção D+7 / D+30 · **motivo do abandono no checkout** (`checkout_failed` declarado em 15/07 e nunca emitido até 26/07 — todo abandono anterior é silencioso por construção).

---

## 2. O QUE A EMPRESA CONSEGUE MEDIR HOJE

Seis scripts em `scripts/`, todos read-only, todos com filtro de conta interna, todos privacy-safe. **Exigem `.env.local` com service-role — rodar exige autorização do fundador.**

| Script | Responde |
|---|---|
| `measure-growth-funnel.mjs` (2.221 linhas) | Funil completo landing→assinatura, por campanha, 12 experimentos datados, retenção 21d |
| `measure-source-funnel.mjs` | Mesmo funil **por fonte** (chatgpt/taaft/youtube/google/direct). Reporta evento **e** banco lado a lado — expõe o gap de propósito |
| `measure-render-latency.mjs` | Mediana/p75/p90 por engine, taxa de conclusão em jobs maduros |
| `inspect-checkout-abandonment.mjs` | Status, moeda, tier, origem, campanha das sessões recorrentes |
| `inspect-activation-failures.mjs` | Desfecho por `attempt_id` |
| `measure-affiliate-funnel.mjs` | Funil de parceiros até comissão |

Anti-forja: 20 eventos críticos (pagamento, checkout, auth, `autopilot_*`, `youtube_*`, `revive_*`) **só podem ser escritos pelo servidor** (`app/api/events/route.ts:16-51`). Eventos de localhost e preview da Vercel são descartados. **Essa disciplina é acima da média.**

---

## 3. 🔴 O QUE NÃO SE CONSEGUE MEDIR

1. **Nenhum script mede Autopilot, piloto $99, `/revive` ou conexão de YouTube.** `grep "autopilot|pilot|revive|youtube_connect" scripts/*.mjs` retorna **vazio**. Os 4 ativos mais recentes — e o único de $299 — estão fora de todo relatório.
2. **Todo o funil comercial só conta `mode === 'subscription'`.** O piloto de $99 é `mode:'payment'` de propósito. **Se um piloto for vendido hoje, ele não aparece em nenhum relatório.** Packs e top-ups também são invisíveis.
3. **`measure-growth-funnel` para no PUSH #77** (23/07). Tudo de #78 a #103 — incluindo as 12 páginas `/vs`, o Autopilot e o piloto — não tem coorte instrumentada.
4. **Nenhuma medição de CAC.** Coerente com zero mídia paga, mas nenhum canal pago pode ser avaliado sem construir isso antes.
5. **88 de 125 eventos não são lidos por nada.** Entre os órfãos: `payment_success`, `checkout_success_viewed`, `video_downloaded`, `video_shared`, 13 nomes `autopilot_*`, 4 `youtube_connect_*`, 2 `revive_*`, e **os 61 eventos de falha nomeada que o #96 adicionou "pra nunca mais adivinhar onde o funil quebra"**.

---

## 4. 🔴 MÉTRICAS ENVENENADAS

### 4.1 Já corrigidas — documentam o mecanismo
| Evento | Inflação | Mecanismo |
|---|---|---|
| `viral_onboarding_viewed` | **9,7×** (389 eventos / 40 sessões) | `useRef` só sobrevive a um mount; `/generate` é `force-dynamic` e remontava |
| `generate_arrived_server` | **2,7×** (138 / 51) | Contava render, não chegada |

**Consequência retroativa:** os "298 usuários viram o onboarding / 230 dispararam intenção" de `PUSH-27-RELEASE.md:27` foram contados **nove dias antes** da correção. Podem estar inflados até 9,7×.

### 4.2 A pior: a série do "39"/"48" sessões de checkout
Métrica mais citada do repo, e sustentou a decisão estratégica de 23/07.

| Data | Afirmação |
|---|---|
| 16/07 | **37 usuários** abriram **61 sessões** em 60d — *único número do repo que separa pessoa de sessão* |
| 21/07 | 37 de 41 requisições **sem `user_id` nem `session_id`**, em rajada por tier: "padrão de crawler". Só **2 sessões humanas** |
| 23/07 | "39 de 39 sessões expiraram" → conclusão: *"o gargalo é confiança no checkout"* |
| 26/07 | "os 39 tinham `user_id` NULL, chegavam com 2–8 ms de diferença, um por tier — **não era gente, era robô**" |

**Mecanismo, confirmado no código:** prefetch/scanner criava sessão real do Stripe (a guarda `isSpeculativeRequest()` só foi escrita em 25–26/07) · 3 e-mails de recuperação embutiam link direto de checkout, e o scanner corporativo do destinatário seguia · zero chave de idempotência em 3 SKUs (produção mostrou **1 usuário gerando 7 sessions em 2,8 s**) · os scripts contam `.length` do array de sessões, não pessoas.

**A taxa de 92% divide sessões por pessoas.** Com mediana de 4,6 aberturas/pessoa, 48 sessões ≈ 10 pessoas → **abandono real ~60%, não 92%.**

> **Veredito:** o "39 de 39" não mede desconfiança de comprador. Mede robô e remontagem. A decisão de 23/07 foi tomada sobre um número que a auditoria de **dois dias antes** já havia desmascarado. Ninguém conectou os dois documentos.

### 4.3 Ainda em risco HOJE
`lib/analytics.ts:318-343` — **`trackEvent` não tem dedupe nenhum.** As correções do #96 foram pontuais, não estruturais.

| Evento | Risco |
|---|---|
| `pricing_view` | `useEffect` com deps `[]` e **sem marcador de sessionStorage**. É etapa de funil em 2 scripts |
| `viral_onboarding_viewed` | **dois emissores com marcadores diferentes** — uma sessão emite legitimamente 2× |
| `generate_started` + `video_generation_started` | **dois nomes na mesma linha** para um único ato. Quem somar, dobra |
| `video_generation_completed` | emitido **no cliente**, no loop de polling. Recarregar re-dispara; fechar a aba nunca dispara. **Infla e deflaciona ao mesmo tempo** |
| `actorKey()` | descarta anônimo sem `session_id` → subconta Safari privado |

✅ **Justo registrar:** os dois eventos de topo **estão** protegidos por sessionStorage — `landing_session_started` e `homepage_view`. O denominador é o número mais confiável do funil.

### 4.4 🔴 `/api/admin/ceo` — a terceira tela de dinheiro, nunca consertada
O #103 anunciou que "duas telas de dinheiro discordavam" e corrigiu `/api/admin/overview` e `/admin`. Existe uma **terceira**, intacta:

| Defeito | Linha | Efeito |
|---|---|---|
| `PRO_PRICE = 9.90` (real $37,90), `BASIC_PRICE = 4.90` (real $24,90) | `:18-19` | MRR subestimado em ~74–80% |
| Conta só `plan === 'pro'` e `'basic'` | `:120-121` | **Assinante de $9,90 ou de $299 é invisível** |
| `isStillFree` é lógica morta — sempre `true` | `:188-190` | Lista de "leads abandonados" inclui quem já pagou |
| `sessions.list({limit:100})` sem paginação nem filtro de data | `:170` | "as 100 últimas de sempre", não um período |
| `select` em `videos` **sem filtro de `status`** | `:144-147` | **Origem da divergência 38% vs 18%** |
| `listUsers({perPage:1000})` sem loop | `:93` | Trunca em silêncio acima de 1000 |
| Zero uso de `isInternalEmail` | todo o arquivo | Conta o fundador como cliente |

> **O painel que o fundador abre e os scripts que o Claude roda não podem concordar, por construção.**

---

## 5. 🔴 CONTRADIÇÃO CENTRAL — ativação difere por 2×

| Fonte | Afirma | Data |
|---|---|---|
| `PUSH-28-RELEASE.md:12` | **194** com ≥1 vídeo concluído | 16/07 |
| `push_102_msg.txt:5` | **128**, história inteira | 26/07 |

Acumulado histórico não cai 66 em 10 dias. **Acredita-se nos 128** — porque `/api/admin/ceo` conta qualquer linha em `videos`, inclusive render falho, enquanto os scripts filtram `status='completed'`.

A trinca inteira se explica: 38,1% e 37,7% são **"criou vídeo"**; 128/713 = **17,9%** é **"concluiu vídeo"**.

> **A empresa reporta duas coisas diferentes com o mesmo nome, e elas diferem por ~2×.** É a métrica que decide se o dinheiro vai para produto ou para aquisição.

---

## 6. OUTRAS CONTRADIÇÕES REGISTRADAS

- **3 vs 4 pagantes** — `push_102_msg.txt` diz 4; `app/revive/[handle]/page.tsx:25` e `lib/checkoutPricing.ts:41` dizem 3. Dois artefatos do mesmo dia. Nenhum é query.
- **Duas contagens da mesma janela, mesma data** — `PUSH-29` diz 279→38 cadastros; `PUSH-32` diz 275→42. Prova que cada documento rodou sua própria consulta ad-hoc.
- **Baselines de `tsc`: 24 → 27 → 22 → 21→0** em quatro semanas. O gate de push comparava contra um número que mudava sem registro.
- **Numeração de PUSH: quatro sistemas simultâneos.** `PUSH-INDEX.md` diz que o próximo é #40; o git está em #103; commits citam #310, #346, #459. **Referência cruzada entre documentos é indecidível hoje.**

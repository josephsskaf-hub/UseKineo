# HANDOFF — Ativação: Prévia das cenas, Brasil de volta, grupo de dentro, gancho, afiliados e Kineo Partners (03→05/10/2026)

**Branch:** `codex/nuvem-ativacao-previa-br-0310`, criada a partir de `origin/main` 6ac5d2b. Separada da `codex/nuvem-b2b-seo-lacos-0210`.

**Não está em produção.** Nada foi publicado em main, nenhum e-mail foi enviado, nenhum crédito foi concedido de verdade e não houve render pago.

**Pedidos:** a sessão CEO, em nome do fundador, mandou três tarefas em 03/10. O fundador mandou trabalhar em modo autônomo. Cada decisão tomada sem ele está marcada abaixo como **DECISÃO DO FUNDADOR PENDENTE**.

---

## TAREFA 1 — Ativação de quem nasceu fora da lista + Brasil

### Por que (medido em 03/10, só leitura no banco)

A ativação de cada janela abaixo é a % de cadastros com filme `completed` em até 24 h, agrupada pelo `signup_country` do perfil. A janela "antes" é 30/08 a 29/09 15:00 UTC; "depois" é de 29/09 15:00 UTC até 03/10.

| Grupo | Antes: cadastros | Antes: ativação | Depois: cadastros | Depois: ativação |
|---|---|---|---|---|
| Países da lista | 224 | 67,4% | 26 | 65,4% |
| **Brasil** | 56 | **62,5%** | 6 | **0%** |
| Fora da lista (sem BR) | 361 | 57,3% | 28 | **0%** |

Os números diferem pouco dos da sessão CEO (50% na lista). Ela contou "filme pronto"; eu contei `videos.status='completed'`. A conclusão é a mesma: a queda vem inteira da política de 29/09. O motor não tem defeito.

### Entrega 1 — "Prévia das cenas" (commit 6b9596cd)

**O que o cliente vê.** A conta `region_paid_only` (sem pagar, plano grátis) aperta **Gerar** no Studio e não bate mais na recusa 402. Cai em **/studio/previa**, com a mesma ideia já escrita.
- **"Ver prévia grátis"** mostra o roteiro, escrito pelo mesmo escritor da `/api/generate-script` para o filme de 15 s do Seedance 1.5, e **3 a 4 imagens das cenas** em FLUX schnell.
- **"Transformar em filme"** grava o clique no servidor, guarda ideia e roteiro e leva a `/pricing?from=scene_preview`.
- Depois de pagar, toda tela autenticada mostra **"Sua prévia está pronta para virar filme → Fazer meu filme"**. O aviso abre o Studio com o roteiro verbatim, no Seedance de 15 s. A pessoa só aperta Gerar.
- A faixa de topo "o filme grátis ainda não está disponível no seu país" ganhou o botão **"Ver prévia grátis"** antes do "Ver planos".
- Os textos estão em pt, en e es; outras línguas usam o inglês. A cópia é honesta: "isto é uma prévia; o filme é feito por um motor de vídeo a partir do mesmo roteiro e não sai idêntico a estas imagens".

**Travas no servidor.** Tudo abaixo roda antes de qualquer fornecedor, em `app/api/scene-preview`, na ordem:
1. login → interruptor `PREVIA_CENAS_PUBLIC` (nasce `true`, em `lib/scenePreview.ts`) → elegibilidade, pela mesma régua de `regionPaidOnlyNoticeVisible`;
2. tamanho da ideia (8 a 2.000 caracteres);
3. **1 prévia por conta por dia, 3 por conta no total e 200 por dia no total global**;
4. `moderateContent` no texto;
5. **reserva**: grava `scene_preview_requested` e reconta em ordem (created_at, id). Dois cliques simultâneos gravam duas reservas, e a segunda se vê além do teto e é recusada;
6. só então vêm o roteiro e as imagens. Cada imagem passa pela moderação de saída antes de ir para o nosso storage; ela entra também na galeria Images da pessoa (`persistImage`).

Falha de fornecedor marca a reserva como `failed` e a vaga volta. Toda recusa tem texto legível nas três línguas. **Nada é cobrado.**

**Desvio do Gerar.** Fica no servidor de `/studio/create`, depois da ativação do trial (é ela que grava o `trial_status`). Só desvia quando as três condições valem:
- o pedido é o despacho do Studio (`studio=1` ou `autoanalyze=1`, com ideia);
- o saldo não paga o filme pedido;
- não há `create_intent` nem `resume`.

Link de e-mail, retomada de checkout e criação automática seguem iguais. StudioClient e GenerateClient não foram tocados.

**Eventos de servidor, todos com `user_id` e em `SERVER_ONLY_EVENTS`:**
- `scene_preview_routed`: o desvio, com custo do filme pedido.
- `scene_preview_requested`: a reserva, com status reserved, shown, failed ou refused.
- `scene_preview_shown`: ideia, roteiro, cenas, chamadas e megapixels.
- `scene_preview_refused`: com o motivo.
- `scene_preview_cta_clicked`.

**Como medir a conversão (depois do deploy):**
```sql
-- quem viu a prévia × quem clicou × quem pagou, por pessoa
with v as (select distinct user_id from events where name='scene_preview_shown'),
     c as (select distinct user_id from events where name='scene_preview_cta_clicked'),
     p as (select distinct user_id from events where name='payment_success')
select (select count(*) from v) viram, (select count(*) from c) clicaram,
       (select count(*) from v join p using (user_id)) viram_e_pagaram;
```

**Custo por prévia: DESCONHECIDO em US$.** Daqui não dá para ler a tabela de preços: `fal.ai` e `openai.com` estão bloqueados pela rede desta sessão, e comentário histórico não conta como prova. O que se mede, e vai gravado em `scene_preview_shown.metadata`:
- 1 roteiro (`script_calls: 1`, que chama a `/api/generate-script`; ela faz 1 ou 2 chamadas ao `gpt-4o`, conforme o próprio guarda de qualidade);
- 3 ou 4 imagens FLUX schnell `portrait_16_9` (576×1024 = 0,59 MP cada; `image_megapixels` por prévia);
- moderação: 1 chamada `omni-moderation` no texto + 1 por imagem (a OpenAI não cobra moderação).

Para pôr preço: fatura da fal filtrada por `fal-ai/flux/schnell` ÷ prévias mostradas, e fatura da OpenAI de `gpt-4o` no mesmo período. O teto de 200 prévias por dia limita o pior caso a 200 × (roteiro + 4 imagens) por dia.

**Riscos:**
- O roteiro é uma chamada servidor-a-servidor à própria `/api/generate-script` com o cookie da pessoa. Se a Vercel exigir proteção de preview no domínio, essa chamada falha e a prévia responde "o roteiro não saiu, tente de novo", sem custo.
- O timeout é de 40 s para o roteiro, dentro do `maxDuration` de 60 s da rota.
- Prévia guardada no navegador some se a pessoa pagar noutro aparelho. A tela `/studio/previa` também reabre a última prévia pelo servidor (GET).

### Entrega 2 — Brasil de volta ao filme grátis (commits 769266d2 e 64ce0675)

**A linha.** `'BR'` entrou em `PAISES_FILME_GRATIS` numa linha só, marcada com `KINEO-BRASIL-VOLTA-2026-10-03`. **Reverter = apagar essa linha.**
- Conta BR **nova** ganha o trial de 10 cr e a cota semanal de 1 Seedance de 15 s (7 cr, em `lib/freeWeeklyFilm.ts`).
- O texto público "in supported countries" continua verdadeiro, porque deriva da política.

**Contas BR que já nasceram `region_paid_only`.** São **6 contas** desde 29/09, contadas pelo evento `trial_region_excluded` com país BR, ainda sem pagar.
- Rota admin **`/api/admin/br-recredit`**:
  - **GET** é dry-run: lista ids curtos (sem e-mail), 10 cr por conta, total de créditos e quantos filmes isso paga no máximo.
  - **POST `?confirm=APPLY`** aplica o mesmo grant do trial, com compare-and-set em `trial_status='region_paid_only'` e no saldo, e grava o evento `admin_br_trial_recredited`.
- **Não apliquei.** Custo se aplicar: 6 × 10 = 60 créditos, ou no máximo 6 filmes de 15 s.
- **DECISÃO DO FUNDADOR PENDENTE:** aplicar ou não.

**Pagantes BR na história.** O sinal é `profiles.signup_country = 'BR'` (preenchido nos 21 pagantes) e a moeda `brl` no `payment_success`. `metadata.customer_country` vem nulo e não serve.
- **3 pessoas BR, 4 eventos `payment_success`:**
  - duas em junho/julho (eventos antigos, sem metadata de moeda);
  - uma em 10/09, **Starter em BRL, R$ 49,90**. É o único pagamento em BRL da história e veio depois da moeda local de 09/09.
- `has_paid` hoje: 154 cadastros BR, 2 com `has_paid`. Para comparar: US tem 332 e 6; IN tem 462 e 1.

```sql
select date(e.created_at), lower(coalesce(e.metadata->>'currency','?')), e.metadata->>'tier', e.metadata->>'amount_total', p.signup_country
from events e join profiles p on p.id=e.user_id
where e.name='payment_success' and (p.signup_country='BR' or lower(coalesce(e.metadata->>'currency',''))='brl');
```

**Ativação BR antes e depois:** 62,5% (35/56) antes de 29/09 e 0% (0/6) depois. Os números estão na tabela do topo.

**Custo mensal estimado da cota semanal BR:**
- **Volume:** cerca de 56 cadastros BR em 30 dias (último mês antes da saída B).
- **Teto teórico:** cada conta tem direito a 1 filme Seedance de 15 s por semana, ou seja, 7 cr e cerca de 4,3 filmes por mês. A conta é a seguinte:
  - 56 contas novas por mês × 4,3 = cerca de 240 filmes por mês no primeiro mês, somando as coortes nos meses seguintes;
  - em créditos: 240 × 7 = cerca de 1.700 cr por mês.
- **Uso real medido:** desde 29/09, **0 admissões** da cota semanal (`free_weekly_film_admitted`) em todos os países da lista. Houve 4 recargas (`free_weekly_film_granted`) nos últimos 7 dias, sem nenhum filme admitido.
- **US$:** DESCONHECIDO pela fatura. A estimativa da casa (`lib/clips/clipPricing.ts`, Seedance 1.5 a US$ 0,026/s em 720p, não é fatura) dá cerca de US$ 0,39 por clipe de 15 s, sem voz nem montagem. No uso medido hoje, o custo é próximo de zero; no teto teórico, cerca de US$ 95 por mês só em vídeo.

---

## Testes da Tarefa 1
- Guardiões novos:
  - `test-previa-cenas-2026-10-03`: 46 ok, 6 mutantes.
  - `test-brasil-volta-2026-10-03`: 20 ok, 4 mutantes.
- Reancorados, cada um com o motivo no arquivo:
  - `test-moderacao-2026-09-25`: 27 importadores da moderação.
  - `test-filme-gratis-por-pais-2026-09-29` e `test-e4-saida-b-cota-seedance-2026-09-29`: a exclusão continua provada com PK, IN, NG e MX, e o BR passa a ser provado dentro. O único vermelho que sobra no `test-e4` (recarga semanal dependente de data) é idêntico na main.
- `npx tsc --noEmit`: 0 erros.

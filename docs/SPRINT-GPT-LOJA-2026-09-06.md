# SPRINT — A KINEO DENTRO DO CHATGPT (06/09 21:00 → 07/09 05:00)

Ciclo PARALELO ao de aquisição (`docs/SPRINT-AQUISICAO-2026-09-06.md`, mesma
pista Claude, disparos :08/:38). Este aqui roda :00/:30. Prefixo de worktree
`gpt-`. Autonomia total: o fundador não é chamado.

---

## PRESS RELEASE (escrito antes do código, como o Bezos manda)

> **Peça um vídeo ao ChatGPT e ele já chega pronto no seu Studio.**
>
> A partir de hoje existe um GPT oficial da Kineo na loja da OpenAI. Você
> conversa com ele como conversa com qualquer GPT — "faz um vídeo sobre o
> naufrágio do Endurance" — e ele escreve o roteiro no formato que rende
> filme: gancho, recompensa rápida, escalada, desfecho, no tamanho certo
> para 35, 60 ou 90 segundos. Quando você aprova, ele te devolve **um link**.
> Você clica uma vez e o Studio da Kineo abre com o roteiro dentro, a duração
> escolhida e o motor certo já selecionados. Sem copiar. Sem colar. Sem
> escolher botão. O filme começa.
>
> Antes, o caminho existia mas era manual: a pessoa perguntava, o ChatGPT
> respondia com o roteiro e um endereço, e ela tinha que copiar o texto certo
> — e metade copiava a instrução em vez do roteiro. Agora o roteiro viaja
> inteiro, sozinho, dentro do link.

**A pergunta que isso responde para o cliente:** "eu já tenho o ChatGPT aberto,
por que eu preciso aprender uma ferramenta nova para virar isso em vídeo?"
Resposta: não precisa. A ferramenta nova é um clique no fim da conversa que
você já estava tendo.

---

## O NÚMERO QUE MANDOU FAZER ISTO (medido 06/09 23:55 UTC, 14 dias)

```
366 cadastros em 14 dias · 195 (53,3%) com signup_utm_source contendo 'chatgpt'
```

E a coorte do ChatGPT não é só a maior — é a **melhor em todos os degraus**:

| coorte | pessoas | fizeram filme | 2+ filmes | pagaram |
|---|---|---|---|---|
| **chatgpt** | 195 | 125 (**64,1%**) | 30 (15,4%) | **2 (1,03%)** |
| resto | 171 | 92 (53,8%) | 18 (10,5%) | 0 (0,00%) |

**Os DOIS pagantes de 14 dias vieram do ChatGPT. Os dois.** O resto da casa
inteira — todas as campanhas, todos os e-mails, todo o SEO — produziu zero
pagantes no mesmo período.

E é justamente o canal onde a Kineo **não tem nenhuma superfície de produto**.
Hoje a Kineo entra nessa conversa como uma *citação*: um endereço que o modelo
menciona e a pessoa transcreve. Não temos um lugar ali dentro. É a maior
desproporção entre importância e investimento que existe no negócio agora.

**A tese, em uma linha:** o canal que já converte melhor sem nenhum produto é
o canal onde construir produto tem o maior retorno esperado.

---

## O PLANO (G1-G7)

| # | o quê | estado |
|---|---|---|
| G1 | `POST /api/gpt/handoff` — valida, grava, devolve link curto | em construção (#1) |
| G2 | `/go/<token>` — pouso público que mostra o roteiro e abre o Studio | em construção (#1) |
| G3 | `public/gpt/openapi.json` + `docs/GPT-KINEO-VIDEO-MAKER.md` (instruções + script do Cowork) | a fazer |
| G4 | fatos: `app/llms.txt` e `lib/kineoFacts.ts` sabem do GPT e do `/go` (PEDIDO — arquivos do Codex) | a fazer |
| G5 | SQL do funil `handoff_created → viewed → clicked → cadastro → filme → pagamento` | a fazer |
| G6 | o mesmo handoff serve Perplexity/Claude/Gemini; `KINEO_GPT_URL` no e-mail de filme pronto | se sobrar |
| G7 | o GPT também VENDE: fatos de preço + `/pricing?utm_source=chatgpt_gpt` na conversa | a fazer |

**PARADA (definida antes de medir, para não ser inventada depois):** se, 7 dias
depois do fundador publicar o GPT, `gpt_handoff_created` marcar menos de 20
linhas, o gargalo é **descoberta na loja**, não o produto — e o próximo passo é
distribuição (nome/descrição/screenshot da listagem), não mais código aqui.

---

## ROTAÇÕES

### #1 — 20:52→21:2x — a tese, a medição e o esqueleto

**DESVIO ANOTADO:** o portão dizia 21:00 e o disparo caiu às 20:52 — 8 minutos
antes. Parar custaria 30 minutos (o disparo seguinte só viria às ~21:22) de uma
janela de 8h que o fundador abriu dizendo "agora". Comecei pelo levantamento,
que não escreve nada, e o código entrou já dentro da janela. Anotado para não
virar precedente silencioso.

**O QUE FIZ.**
1. Li o diário da outra sessão (na fila, `5411b6be`): ela está em
   `components/SourceCapture.tsx` — fonte do evento de pouso. Não encosto lá.
2. Medi a coorte (tabela acima). A tese passou: 53,3% do volume e 100% dos
   pagantes.
3. Verifiquei se havia tabela reutilizável para o handoff: **não há**. As 56
   tabelas do `public` são de produto (videos/credit_debits/…), pagamento
   (stripe/paypal/mp/hotmart), e-mail (`email_send_log`, `trial_emails_log`) ou
   captura de lead por e-mail (`leads`). Nenhuma guarda um payload anônimo com
   TTL. Migration nova, `gpt_handoffs`, RLS sem leitura pública.
4. Li `app/api/episode-link/route.ts` inteiro antes de desenhar o `/go`. Ele já
   resolveu o mesmo problema — contar o clique e escolher a porta — e a lição
   dele é gravada aqui: **a porta errada mata o clique**. Lá, mandar quem já
   tem conta para `/signup` zerava o canal. Aqui a assimetria é invertida (quem
   vem da loja do GPT em geral **não** tem conta), então o sem-sessão vai para
   `/signup` — mas com `redirect` de volta ao **`/go/<token>`**, não para o
   Studio com a query. Motivo: a volta do OAuth é onde query morre; o token é o
   portador durável do roteiro. O roteiro sobrevive ao cadastro porque está no
   banco, não na barra de endereço.

**DECISÃO DE DESENHO que vale registrar:** a régua da casa **avisa e não
rejeita**. O `fit` volta `short|ok|long` para o GPT poder dizer "esse roteiro
vai dar uns 40s, quer que eu aumente?" — mas nunca bloqueia. Regra do CLAUDE.md
de 02/09: passar do alvo é bom, ficar abaixo é defeito, e a régua serve para o
roteiro **nascer** do tamanho certo, nunca para amputar o filme no fim.

**PRÓXIMO PASSO:** fechar G1+G2 com guardião e tsc verdes, enfileirar, publicar,
sondar. Depois G3 (o documento que o fundador usa para publicar o GPT).

**TRÊS ACHADOS DE RECONHECIMENTO que mudaram o desenho (e o meu próprio
briefing estava errado em dois deles):**

1. **O destino é `/studio`, não `/studio/create`.** São componentes
   diferentes. O `StudioClient` (cockpit, `/studio`) lê `prompt`, `engine`,
   **`script_mode`** e **`duration`** (linhas 261-271). O `GenerateClient`
   (casa de máquinas, `/studio/create`) lê `prompt`, `language`, `aspect`,
   `engine`, `intent_campaign` — e **não lê `script_mode` nem `duration`**.
   Mandar o handoff para `/studio/create` descartaria em silêncio as duas
   coisas que mais importam: o roteiro nasceria **reescrito pela IA** em vez
   de verbatim, e a duração viraria a padrão. O link chegaria "funcionando" e
   entregando outro filme. O `episode-link` manda para `/studio/create` e está
   certo para ele — ele só carrega `prompt`, e não tem duração nem modo.

2. **O teto da casa é 5.000 caracteres, não 6.000** (`lib/analyzeLimits.ts`,
   fonte única). Eu tinha escrito 6.000 no plano. Um handoff de 5.500 geraria
   um link que morre na parede — exatamente o defeito de 02/09, quando um
   trial vindo do ChatGPT bateu nessa parede **7 vezes em 21 minutos** e foi
   embora sem filme e sem pagar. E aqui está o ganho estrutural do handoff:
   validar no endpoint **move a parede da tela do cliente para a conversa do
   GPT**, onde ela custa uma reescrita de graça em vez de uma desistência.
   (90s pedem ~290 palavras ≈ 1.800 caracteres: 5.000 sobra.)

3. **`/go` é público de verdade.** O `middleware.ts` casa com tudo, mas só
   chama `updateSession` — quem barra visitante é cada página do grupo
   `(dashboard)`. `app/go/` está livre e não colide com rota existente.

4. **A LISTA DE MOTORES REAL, e uma exclusão que não é óbvia.** As chaves que
   o `/studio` aceita (StudioClient:87-108) são `fast` (Kineo 1), `seedance`,
   `kling`, `veo`, `hollywood` (Kling 3), `h3`, `omni` e `s25`. Mas a linha
   262 é `if (e && ENGINES.some(x => x.key === e) && (e !== 's25')) setEngine(...)`
   — o **`s25` é recusado de propósito** (interruptor `S25_PUBLIC=false`, só
   contas internas). Um handoff com `engineHint:'s25'` geraria um link que cai
   no motor padrão sem avisar ninguém. `s25` fica **fora** da lista do GPT.

5. **EU MISTUREI AS DUAS RÉGUAS NO BRIEFING — corrigido antes de virar texto.**
   Escrevi "150-165 para 60s · 100-115 para 35s · 265-290 para 90s". Os números
   de 35s e 90s são da régua **clássica** (3,1 pal/s); o de 60s é da régua
   **hollywood** (2,3 pal/s). É exatamente o erro que o CLAUDE.md proíbe desde
   02/09: *"padronizar os dois no mesmo número QUEBRA um dos lados"*. A tabela
   correta, e a que vai para as instruções do GPT:

   | motor | régua | 35s | 60s | 90s |
   |---|---|---|---|---|
   | `fast` `seedance` `kling` `veo` | clássica 3,1 pal/s | 100-115 | **175-195** | 265-290 |
   | `hollywood` `h3` `omni` | hollywood 2,3 pal/s | 80-90 | **150-165** | 205-230 |

   Como o padrão do handoff é `seedance`, a régua que o GPT usa por padrão é a
   **clássica**: 60s = 175-195 palavras, não 150-165. Um roteiro de 155 palavras
   mandado ao Seedance nasce **curto** — e história interrompida é o defeito
   que a casa mais persegue.

6. **Já existe um handoff público na casa:** `lib/growth/publicPlanFitHandoff.ts`
   (calculadora → Studio). Ele NÃO serve de base — carrega 4 inteiros na
   própria URL, não guarda nada e não precisa de token. O nosso carrega um
   roteiro de milhares de caracteres vindo de fora, e por isso precisa de
   banco, TTL e teto. Mas o vocabulário de parâmetros dele confirma o contrato.

**SONDA DE CONTROLE ANTES DO DEPLOY (para o 200 depois provar alguma coisa —
lição de 05/09: "401 só prova com controle 404"):**
```
home:200 · /go/naoexiste-controle:404 · /gpt/openapi.json:404   (06/09 ~21:20)
```

7. **`lib/rateLimit.ts` NÃO serve de freio de entrada** — apesar do nome, é
   política de **retentativa de saída** (quantas vezes reenviar ao fal/
   Creatomate quando eles devolvem 429). O precedente certo para uma rota
   POST pública sem autenticação é `app/api/public/viral-score/route.ts`:
   `Map` em memória, 10 requisições por minuto por IP tirado de
   `x-forwarded-for`, com o comentário honesto `best-effort; serverless-local`.
   Honesto porque é verdade: cada instância da lambda tem o seu próprio `Map`,
   então o teto real é o teto × número de instâncias. Para o `/api/gpt/handoff`
   isso é a primeira linha, não a única — a segunda tem que ser no banco
   (teto de linhas por `ip_hash` por hora), porque aqui cada requisição
   **escreve**, e um endpoint público que escreve sem teto de banco é um
   convite a encher tabela.

---

### #1c — 21:1x — G3 pronto, e o defeito de honestidade que ele quase publicou

`public/gpt/openapi.json` e `docs/GPT-KINEO-VIDEO-MAKER.md` escritos. Nome
recomendado: **"Short Video Maker by Kineo"** — na loja a pessoa digita o que
quer FAZER, não a marca; o nome tem a query na frente e a marca atrás.

**Corrigi a régua misturada em 3 lugares** (o erro era meu, do briefing): a
tabela do documento e a `description` do `script` no OpenAPI agora trazem as
DUAS réguas separadas, e a linha de contagem que o GPT mostra passou a citar o
motor ("183 words, on target for 60s on Seedance").

**E aí apareceu o defeito maior, que nenhum dos dois tinha visto —
`creditCostForDuration` escala o preço pela duração:**

```
35s seedance = 15 cr   ·   60s seedance = 25 cr   ·   90s seedance = 38 cr
```

O trial é de **25 créditos**. O próprio `engineCost.ts:99` comemora isso: *"O
trial de 25cr segue comprando EXATAMENTE 1 Seedance"* — mas isso vale para
**60s**. Um filme de **90s custa 38 e NÃO CABE no trial**. O documento estava
prestes a mandar o GPT dizer "your first film is free" para **toda** entrega,
inclusive as de 90s. Seria a vitrine oferecendo o que o cobrador recusa: a
pessoa sai de uma conversa boa no ChatGPT, clica, e bate numa parede de crédito
na primeira tela do produto — a pior estreia possível, e num canal que é 100%
dos nossos pagantes.

**Consertado nas instruções do GPT:** ele só promete "grátis" para 35s/60s no
motor padrão, e quando a pessoa pede 90s ele avisa em uma linha que aquilo pede
plano pago — **sem** tentar dissuadir quem quiser mesmo assim.

**Consequência para o G1 (requisito 7):** o endpoint devolve também o **custo em
créditos** do que foi montado, e o `/go` mostra esse número na tela. Preço na
cara antes do clique é mais barato que parede depois dele.

---

### #2 — 21:15→21:30 — **EM PRODUÇÃO**: o link de um clique existe e foi exercido de ponta a ponta

**SHAs:** `b4675e67` (G1+G2) · `92b9702a` (comentário da migration) · `33cbfd3c`
(o token no evento). Migration `gpt_handoffs_20260906` aplicada no banco.

**O QUE ESTÁ NO AR** (sondado com controle 404 ao lado, para o 200 provar algo):

| sonda | resultado |
|---|---|
| `POST /api/gpt/naoexiste` (controle) | **404** |
| `POST /api/gpt/handoff` script vazio | 400 `script is required: send the narration text as a string.` |
| `POST /api/gpt/handoff` com `<b>` | 400 `script must be plain text — remove HTML tags.` |
| `POST /api/gpt/handoff` `durationSec:45` | 400 `durationSec must be one of 35, 60, 90.` |
| `POST` roteiro real de 185 palavras | **200** → `/go/38Ph_…`, `words:185 · seconds:59.7 · fit:ok` |
| `GET /go/<token>` | **200**, roteiro inteiro, motor, duração, `noindex` |
| `GET /go/naoexiste-controle-xyz` | 200 com tela honesta: *"This link has expired… you can still paste the script yourself"* |
| `GET /api/gpt/handoff/go?token=…` (deslogado) | **302** → `/signup?redirect=%2Fgo%2F38Ph_…` |
| `GET /api/gpt/handoff/pricing?token=…` | **302** → `/pricing?utm_source=chatgpt_gpt&intent_campaign=kineo_gpt_store` |

**A régua fechou o círculo sozinha:** escrevi um roteiro de 185 palavras porque
as instruções do GPT mandam 175-195 para 60s no Seedance. O endpoint mediu
185 palavras → **59,7s** → `fit: ok`. As instruções, a lib e o veredito estão
falando o mesmo número, e ninguém teve que ajustar nada para isso bater.

**Banco:** 19 colunas, RLS ligado, **zero policies**, `service_role` só com
SELECT/INSERT/UPDATE (sem DELETE), `anon`/`authenticated` sem nenhum
privilégio. Linha gravada com `ip_hash` (nunca IP cru) e 1.097 caracteres de
roteiro — 185 palavras cabem em 1,1k, o que confirma que 5.000 é folga larga.

**As minhas próprias sondas vieram etiquetadas `bot: true`** (a lista de robô
do episode-link pega `curl`). Isso não é detalhe: significa que o funil não se
infla com a medição de quem o construiu. `click_count` continua 0 e
`viewed_at` nulo — comportamento correto.

---

#### O DEFEITO QUE SÓ APARECEU PORQUE EU CONFERI AS CHAVES, EM VEZ DE ASSUMIR

Escrevi o SQL do funil juntando os degraus por `metadata->>'token'`. Rodou,
devolveu zeros, e os zeros tinham explicação plausível (minhas sondas são
robô). **Fui conferir as chaves que o evento realmente gravou** —
`jsonb_object_keys` — e o `token` **não estava lá**. Nem no `gpt_landing_viewed`
nem no `gpt_landing_clicked`.

O SQL teria marcado **zero para sempre**, com qualquer volume de tráfego real.
Falso zero é pior que número ausente porque parece medição: a leitura seria
"ninguém clica" quando a verdade é "ninguém mediu" — e a PARADA que eu mesmo
escrevi neste diário ("menos de 20 handoffs em 7 dias = problema de descoberta,
não de produto") seria decidida em cima de um número que não existe.

`33cbfd3c` põe `token: row.token` nos dois eventos, com guardião (I1)(I2)
amarrado ao par. **Provado em produção depois do deploy:**
`gpt_landing_viewed` de 00:24:30 UTC carrega `token=FUCu6uJOiQ7ie_nK0591JwaD`.

#### O SQL DO FUNIL (G5) — roda, e diz qual degrau é de que unidade

```sql
with h as (select token, user_id from gpt_handoffs where created_at >= now() - interval '30 days'),
vis as (select distinct metadata->>'token' tk from events
        where name='gpt_landing_viewed'  and coalesce(metadata->>'bot','true')='false'),
cli as (select distinct metadata->>'token' tk from events
        where name='gpt_landing_clicked' and coalesce(metadata->>'bot','true')='false')
select
  (select count(*) from h)                                         as p1_handoffs,
  (select count(*) from h where token in (select tk from vis))     as p2_pouso_humano,
  (select count(*) from h where token in (select tk from cli))     as p3_clique_humano,
  (select count(*) from h where user_id is not null)               as p4_pessoas,
  (select count(distinct v.user_id) from videos v
     where v.user_id in (select user_id from h where user_id is not null)
       and v.status='completed')                                   as p5_fizeram_filme,
  (select count(distinct e.user_id) from events e
     where e.name='payment_success'
       and e.user_id in (select user_id from h where user_id is not null)) as p6_pagaram;
```

**p1-p3 contam HANDOFFS** (não há pessoa ainda; o robô sai pelo filtro).
**p4-p6 contam PESSOAS**, e só enxergam quem fechou o laço clicando com sessão.
Estado agora: `4 handoffs · 1 pouso com token · 0 humanos · 0 pessoas` — os 4
são as minhas sondas, e o zero humano está certo, não é bug.

**RISCO CONHECIDO E NÃO RESOLVIDO:** a URL do Studio leva o roteiro inteiro na
query. Um roteiro de 5.000 caracteres não-ASCII pode passar do limite de ~14 KB
de URL da Vercel. O `chatgptQuickstart` já carrega esse risco hoje com o mesmo
teto, então não é regressão — mas a cura definitiva é o `/studio/create` ler o
token no servidor em vez de receber o texto na barra. Fica como próximo passo.

**PERCALÇO DE ENTREGA (sem dano):** o `enfileirar.sh` replayou os 3 commits
sobre a ponta nova; os dois primeiros já estavam publicados com SHA diferente
(o bat rebaseia no push) e a migration bateu de frente consigo mesma
(conflito add/add). A #2 saiu do HEAD, mas não se perdeu: `git cat-file`
confirmou o commit vivo, resolvi o conflito pegando a versão da ponta e
recuperei por `cherry-pick`. Nada de `branch -f`, nada de força.

**PRÓXIMO PASSO:** G7 já está escrito nas instruções do GPT (a regra de venda
com os fatos canônicos). Falta o G6 — o `llms.txt` documentar o endereço do
handoff para Perplexity/Claude/Gemini montarem o mesmo link, o que já virou
PEDIDO para o Codex.

---

### #3 — 21:30→22:05 — **EM PRODUÇÃO**: o schema era a segunda instrução do modelo, e ninguém tinha auditado

**SHA `5418d44b`** (`origin/main = 5418d44b`, fila 0, deploy confirmado por sonda).

#### A PERGUNTA QUE ABRIU A ROTAÇÃO

A #1 e a #2 puseram no ar o endpoint, a página `/go`, o schema e o documento.
Antes de escrever peça nova, fui olhar **o que decide se tudo isso vale alguma
coisa**: o único passo manual do fundador — importar o schema e publicar o GPT.
Se o `openapi.json` estiver errado, as três rotações do ciclo produzem zero.

E aí apareceu o que eu não tinha visto: **o `public/gpt/openapi.json` é a
SEGUNDA fonte de instruções que o modelo obedece.** A primeira é o documento
que o fundador cola no campo *Instructions*. A #1 auditou o documento com
cuidado — e o schema entrou sem auditoria nenhuma, escrito de memória.

#### O DEFEITO QUE ISSO ESCONDIA — a mesma mentira, no arquivo que ninguém olhou

A #1 achou e consertou, **no documento**, a promessa de gratuidade: o trial é
de 25 créditos, um 90s no Seedance custa **38**, logo "seu primeiro filme é
grátis" só é verdade a 35s e 60s. Esse conserto **nunca chegou ao schema**. A
`description` do 200 continuava mandando, sem condição:

> *"say ... that the first film is free (25-credit trial, no card)"*

E a `description` do 200 é lida pelo modelo **a cada chamada, no instante exato
de mostrar o link** — é a última frase antes do clique. Quem pedisse 90s
ouviria "grátis" do GPT e bateria numa parede de 38 créditos na primeira tela.
É a memória `vitrine-oferece-o-que-o-cobrador-recusa` inteira, com um detalhe
pior: **a rotação anterior já tinha diagnosticado o defeito e consertado só
metade dele.** Um conserto que não varre todos os arquivos que carregam a
regra não é conserto, é meia-verdade com data.

#### AUDITEI CONTRA A PRODUÇÃO, NÃO CONTRA O CÓDIGO

Chamei o endpoint real com um roteiro real e guardei a resposta literal — é
mais barato que ler código e não mente. Seis divergências, todas confirmadas:

| # | o schema dizia | a verdade do servidor |
|---|---|---|
| 1 | grátis, sem condição | 90s custa 38cr; trial tem 25 |
| 2 | `maxLength: 6000`, e o 400 dizia "over 6000 characters" | recusa acima de **5000** |
| 3 | `seconds: integer` | devolve **24.2** |
| 4 | `fitMessage` inexistente | devolve, e é frase pronta calibrada |
| 5 | `overStudioLimit`/`studioLimitChars` inexistentes | devolve os dois |
| 6 | sem `503` | devolve 503 em duas situações |

O **2** merece nome: o schema **autorizava** 6.000 e o cobrador recusava em
5.001 — e a descrição do próprio 400 ensinava o número errado, então o modelo
tentando se auto-corrigir erraria de novo, com mais confiança.

O **4** é a memória `aviso-gravado-recurso-descartado` em estado puro. O
servidor já devolvia *"About 24s of narration for a 35s video — the story may
end early. Adding a few lines helps; Kineo never stretches a short script."* —
uma frase em inglês, calibrada pela régua da casa, pronta. Como o schema não a
mencionava, o modelo inventava a própria redação e a frase boa morria sem uso.
Agora está documentada com ordem de **citar verbatim**.

#### O DEFEITO VIVO QUE APARECEU NO CAMINHO (o mais caro dos dois dias)

Fui amarrar o documento à lib e descobri que **o orçamento de palavras que nós
damos ao GPT estava ABAIXO do piso do nosso próprio servidor**.
`FIT_SHORT_RATIO` 0,95 a 3,1 pal/s exige **177** palavras para um 60s passar
como `ok`. O documento mandava escrever **175-195**.

Ou seja: o GPT escreveria um roteiro de 175 palavras — **exatamente dentro do
orçamento que nós demos a ele** — mandaria para o nosso endpoint, e receberia
de volta `fit: "short"`. O GPT então ofereceria "quer que eu estenda?" para um
roteiro que ele acabara de escrever **certo**. Atrito fabricado do nada, por
dois arquivos nossos discordando em duas palavras, na conversa que é a primeira
impressão do produto.

Agora **105-115 / 180-195 / 270-290** — dentro da régua da casa do CLAUDE.md
(175-195) e acima do piso da lib. **A lib não foi tocada:** o pipeline de
qualidade não se mexe por conveniência de documento.

#### O GUARDIÃO — a parte que dura

`scripts/test-gpt-handoff.mjs` tinha 283 linhas e **não lia o `openapi.json`
uma única vez**. Foi por isso que o schema pôde divergir em silêncio. Agora ele
lê os **três** arquivos reais e prova que schema, documento e servidor não
podem discordar: **181 → 287 verificações**.

O desenho importa: nenhum número é digitado no teste. O teto sai de
`SCRIPT_MAX_CHARS`, os enums de `DURATIONS`/`ASPECTS`/`HANDOFF_ENGINES`, os
preços de `checkoutPricing`, os custos de `engineCost`, o TTL de
`HANDOFF_TTL_DAYS`. **Mudar a constante quebra o teste até o schema e o
documento acompanharem** — que é a única forma de trava que sobrevive a quem
vier depois e não leu isto aqui. A regra do grátis está amarrada à
**condição**, não a texto: nenhuma promessa pode existir sem citar a duração.

**Onze mutantes reprovados**, cada mutação conferida como aplicada no arquivo e
cada reprovação pelo motivo certo. Um deles pegou um afrouxamento real meu: a
exceção que libera os blurbs de loja da seção B, na primeira versão, deixava
passar o mesmo blurb **copiado para dentro das instruções**. Ancorei por offset
de seção e repeti.

#### SONDAS — o schema em produção depois do deploy

```
version           : 1.1.0          responses  : 200, 400, 429, 503
script.maxLength  : 5000           seconds    : number
fitMessage doc    : true           overStudioLimit doc : true
200 cita a condição do 90s : true  200 com promessa incondicional : false
```
(`/gpt/openapi.json` = 200 · controle `/gpt/naoexiste-controle.json` = 404 ·
`/privacy` = 200, que a OpenAI exige para ação pública.)

#### O PORTÃO EXTERNO QUE EU ACHEI E QUE NÃO É NOSSO

Conferindo as regras reais da OpenAI: publicar um GPT com ação para
**"Everyone"** exige **perfil de builder verificado** — por cobrança ou por
**posse de domínio, o que significa registro TXT no DNS e espera de
propagação**. O roteiro da seção F mencionava isso no **passo 20**. Um gate que
depende de DNS descoberto no passo 20 transforma 20 minutos de trabalho em dias
de espera. **Subiu para as pré-condições**, com a saída barata escrita ao lado:
enquanto a verificação não sai, o GPT funciona como **"Anyone with the link"** —
o handoff roda igual, e o link já serve para e-mail e teste com gente de
verdade. **Só a busca da loja espera; o produto não.**

#### O FUNIL (G5), medido agora

`5 handoffs · 0 pousos humanos · 0 pessoas · 0 pagamentos`. Os 5 são sondas
minhas, etiquetadas `bot: true` pelo próprio filtro — **o zero está certo, e é
o zero honesto de um GPT que ainda não existe.** O instrumento está pronto e
não se infla com a medição de quem o construiu.

**PARADA que eu assumo:** se, uma semana depois do GPT publicado, houver menos
de 20 handoffs, o problema é **descoberta na loja** (nome/descrição) e não
produto — e a jogada vira SEO de loja, não código.

**RISCO CONHECIDO, não resolvido:** a URL do Studio ainda leva o roteiro
inteiro na query (teto ~14 KB da Vercel). Um 90s ocupa ~1.800 chars, então na
prática não morde; a cura é o `/studio/create` ler o token no servidor.

**PRÓXIMO PASSO:** G6 — o mesmo handoff serve Perplexity/Claude/Gemini; o
PEDIDO do `llms.txt` já está aberto para o Codex (linha 391 dos PEDIDOS).

---

## ### #4 — 22:35 — O HANDOFF ACEITAVA O ENQUADRAMENTO E O JOGAVA FORA NA ÚLTIMA LINHA

**SHA `dd4326e9` · EM PRODUÇÃO** (sonda no fim desta entrada).

Antes de partir para o G6 fui fazer a pergunta que as memórias da casa mandam
fazer sempre: **o contrato tem chamador?** O endpoint publicado ontem aceita
`aspect`, valida contra uma lista, grava a coluna no banco e devolve na
resposta um campo cuja descrição diz, com todas as letras, *"The frame Kineo
stored for this handoff"*.

`buildStudioDestination()` — a função que monta a URL do Studio, a última linha
do caminho, a que decide o que a pessoa realmente recebe — **nunca colocava a
chave `aspect` na query.** Emitia `prompt`, `script_mode`, `duration`,
`engine`, `utm_source`, `intent_campaign`. O enquadramento morria ali.

Consequência: **100% dos handoffs renderizariam 9:16**, inclusive o de quem
dissesse ao GPT "quero um vídeo de YouTube widescreen". O GPT confirmaria o
pedido (o servidor devolve `aspect: "16:9"` na resposta, e o modelo lê isso), a
página `/go` não mostrava formato nenhum, e o filme sairia vertical. Ninguém
seria avisado em ponto nenhum da cadeia.

### O QUE FAZ DISSO O DEFEITO MAIS CARO DOS DOIS DIAS

Não é um parâmetro que a casa não sabe honrar. **É o contrário.** A capacidade
existe ponta a ponta desde 02/09:

`lib/aspect.ts` (fonte única: geometria, layout de legenda, letterbox,
`aspect_ratio` da fal, `image_size` do FLUX, framing do prompt) →
`GenerateClient.tsx:1252` lê `?aspect=` → viaja para o compose (5581/8448/8892)
→ chega no fornecedor. Sem gate de plano. E `relativeRenderCost` diz que 16:9
custa **o mesmo** que 9:16, 1:1 custa 44% **menos** e 4:5 custa 30% **menos**.

O comentário de cabeçalho do `lib/aspect.ts` é a tese comercial inteira: a
auditoria de 02/09 mostrou que reenquadrar é o **upsell de US$ 29/mês do
OpusClip**, que Submagic e Veed fazem crop manual e o InVideo re-renderiza
cobrando de novo — todos partem de vídeo pronto e precisam rastrear sujeito.
Nossas cenas **nascem** no quadro certo. É um campo de string.

E o único consumidor novo dessa vantagem — o GPT, **a única superfície da casa
onde a pessoa diz em inglês claro onde vai postar** — descartava a resposta.

### O DEFEITO DEBAIXO DO DEFEITO

A lista de formatos estava **digitada à mão** no `lib/gptHandoff.ts` com três
valores. A fonte única tem **quatro**. O `4:5` — o formato que mais ocupa tela
no feed do Instagram, que a própria auditoria de 02/09 registrou que **só
Submagic e Veed oferecem** — simplesmente não existia para o GPT.

É a memória `regra-vive-em-varios-arquivos` na forma mais cara: não bastava
consertar a emissão; enquanto a lista fosse uma **cópia**, ela voltaria a
divergir na próxima vez que alguém acrescentasse um formato à casa. Agora
`lib/gptHandoff.ts` **importa e reexporta** `ASPECTS`/`DEFAULT_ASPECT`/
`normalizeAspect`/`aspectSpec` do `lib/aspect.ts`. Divergir deixou de ser
improvável e passou a ser impossível.

### O QUE MUDOU, E A REGRA DE SEGURANÇA QUE EU NÃO QUEBREI

| onde | o quê |
|---|---|
| `lib/gptHandoff.ts` | importa a fonte única; `buildStudioDestination` emite `aspect` |
| `public/gpt/openapi.json` | `1.1.0 → 1.2.0`; dois enums com 4 formatos; a `description` **ensina a escolha pela plataforma** e manda perguntar; o 400 lista os valores |
| `docs/GPT-KINEO-VIDEO-MAKER.md` | a instrução era literalmente **"Never ask about it"**; agora Step 1 pergunta, Step 5 nomeia os 4 com a plataforma, Step 6 diz o frame na mensagem final |
| `app/go/[token]/page.tsx` | mostra `16:9 · Widescreen · YouTube · site · ads` **sempre**, antes do clique; `gpt_landing_viewed` carrega o `aspect` |
| `supabase/migrations/..._gpt_handoffs.sql` | o comentário da coluna deixou de mentir (sem migration: a coluna nunca teve CHECK) |

A regra de segurança do `lib/aspect.ts` é que **9:16 é o default e tudo é
aditivo**. Respeitada ao pé da letra: a chave `aspect` só entra na URL quando o
valor é **diferente** de 9:16 — o mesmo padrão que o `GenerateClient` já usa.
O link de quem pede Shorts continua **byte a byte igual**, e isso está provado
por execução no guardião, não por leitura.

### O DEFEITO DE COPY QUE APARECEU DE PASSAGEM (e que não era do GPT)

Fui usar o campo `where` do `lib/aspect.ts` na página `/go` e ele veio **em
português**: *"Feed do Instagram (ocupa mais tela)"*. Segui o fio:

`app/(dashboard)/studio/StudioClient.tsx:645` imprime esse mesmo campo na
**pílula de formato do Studio**. Ou seja, todo cliente de língua inglesa que
abrisse o seletor de formato lia português na tela de produção. Duas strings na
fonte única — **os dois lugares consertados de uma vez**, que é a única forma
que o conserto de fonte única tem de valer a pena.

### O GUARDIÃO — 287 → 327, e nenhum formato digitado

Nenhum literal de formato entra no teste. A lista sai do `lib/aspect.ts` **por
leitura do arquivo** e é conferida contra a lib **executada**. Consequência:
acrescentar um quinto formato à casa **quebra o teste** até o schema, o
documento, a página e a migration acompanharem. É a única trava que sobrevive a
quem vier depois e não leu isto.

**Sete mutantes reprovados**, cada mutação conferida por grep **como aplicada
ao arquivo** antes de rodar, e cada reprovação pelo motivo certo. Dois deles
(M1 e M4) **não foram aplicados na primeira tentativa** — a lib está em CRLF e
a substituição usava `\n` — e o teste ficou verde por isso. O grep de controle
pegou; foram reaplicados. Sem esse grep eu teria registrado dois mutantes
falsos, e a memória `falsificar-mutacao-commitar-antes` teria custado de novo.

`npx tsc --noEmit` verde, também falsificado (mutante `frame.label` →
`frame.labell` → `error TS2551`, exit 2), porque exit 0 sozinho mente.

### SONDAS

`git ls-remote origin main = dd4326e9` · `/gpt/openapi.json` = **200** e a
versão servida virou **1.2.0** com `"4:5"` presente nos dois enums · controle
`/gpt/naoexiste-controle.json` = **404** (sem o controle, um 200 não prova
deploy) · home = **200**.

### RISCO CONHECIDO, E É OPERACIONAL, NÃO DE CÓDIGO

**O ChatGPT não relê o schema sozinho.** Quando o fundador publicar o GPT, e
sempre que o `openapi.json` mudar, é preciso **reimportar** a URL no editor do
GPT e **recolar** o bloco de instruções — senão o modelo continua com a lista
de três formatos e com a ordem *"Never ask about it"*. Isso foi para o roteiro
de publicação (seção F, passo 18) para não depender de memória de sessão.

### PARADA QUE EU ASSUMO

Se, um mês depois do GPT publicado, **menos de 5% dos handoffs** pedirem
formato diferente de 9:16, a hipótese comercial "o GPT vende o multi-formato"
está errada e o esforço vai para outro lugar. O `gpt_landing_viewed` agora
carrega o `aspect`, então esse número existe **desde o primeiro pouso** — não é
uma medição que eu vou ter de reconstruir depois.

### PRÓXIMO PASSO

G6 — o mesmo handoff serve Perplexity/Claude/Gemini; o PEDIDO do `llms.txt`
continua aberto para o Codex (linha 391 dos PEDIDOS).

**✅ O QUE VOCÊ PRECISA FAZER**
1. Nada nesta rotação — a entrega subiu sozinha e está no ar.
2. Quando for publicar o GPT: siga `docs/GPT-KINEO-VIDEO-MAKER.md`, e leia as
   **pré-condições** antes do passo 1 (publicar para "Everyone" exige perfil de
   builder verificado por DNS; "Anyone with the link" funciona hoje).

**📋 O QUE ACONTECEU**
O link que o GPT entrega passou a respeitar o formato que a pessoa pediu. Antes
ele aceitava o pedido, guardava, confirmava — e renderizava vertical de
qualquer jeito. Agora YouTube widescreen sai widescreen, feed do Instagram sai
4:5 (formato que quase nenhum concorrente oferece e que custa 30% menos que o
padrão), e a pessoa **vê o formato escrito na tela antes de clicar**. De
quebra, o seletor de formato do Studio parou de mostrar português para cliente
de língua inglesa.

---

### #5 — 22:20→23:0x — a Kineo deixa de depender da loja: o MESMO handoff passa a atender qualquer assistente

**A VIRADA DESTA ROTAÇÃO.** As rotações #1–#4 construíram o caminho do GPT da
loja e ele está pronto — mas ele **depende do fundador publicar**, e publicar
para "Everyone" exige verificação de domínio por DNS (achado da #3b). Enquanto
isso, o dado que motivou o ciclo inteiro continua correndo sozinho.

**O denominador, medido agora (14 dias, `signup_utm_source`):**

| fonte | cadastros | fizeram filme | pagaram |
|---|---|---|---|
| **chatgpt** | **195** | 126 | **2** |
| taaft | 94 | 66 | 0 |
| (sem utm) | 61 | 16 | 0 |
| nav | 12 | 8 | 0 |

O ChatGPT é **54% da aquisição** e o **único canal que produziu pagante**. O
TAAFT trouxe 94 pessoas e zero. Não é empate entre canais: é um canal que
carrega o negócio e vários que não carregam.

**A ferida que dá para medir**, também de 14 dias: `pasted_directives_detected`
= **20 pessoas** colaram a *ordem* do ChatGPT em vez do roteiro. E no caminho
de colar, `chatgpt_quickstart_selected` = 91 pessoas → `..._studio_ready` = 68:
**23 pessoas somem entre escolher e estar pronta**. Cada passo de "vá no site e
cole isto" cobra pedágio.

### A HIPÓTESE, E POR QUE ELA É MAIOR QUE O G6 PEDIA

O G6 pedia documentar o handoff para Perplexity/Claude/Gemini. A leitura do
código mostrou algo mais forte: **um assistente não sabe fazer POST, mas sabe
escrever um LINK**. Se existir um GET que faça exatamente o que a Action faz,
então o link de um clique existe **hoje**, sem loja, sem DNS e sem o fundador.

Então o desenho não é "um segundo caminho". É **o mesmo handoff**, mudando só o
verbo HTTP e o canal: mesma tabela, mesma página `/go`, mesmos eventos, mesmo
funil. Um funil, não dois.

### O QUE FOI REJEITADO, E A PROVA DE PRODUÇÃO QUE DECIDIU

A alternativa óbvia era mandar o assistente montar
`/studio/create?prompt=…&script_mode=verbatim&duration=60` direto — o formato
existe e funciona (é o que `buildStudioDestination` já emite,
`lib/gptHandoff.ts:334-350`). **Rejeitado por medição, não por gosto:** o
público do ChatGPT é **deslogado**, e a query atravessa `/signup?redirect=`
que **corta cada valor em 2.000 chars** (`studio/create/page.tsx:49`); havia
ainda uma dúvida registrada em `go/route.ts:27-28` sobre a query sobreviver ao
OAuth. Sondei a produção com um token real:

```
/go/<token>            deslogado -> http 200 (a pagina abre e mostra o roteiro)
/api/gpt/handoff/go    deslogado -> 302 -> /signup?redirect=%2Fgo%2F<token>
token invalido         (controle) -> 302 de volta para /go (comportamento distinto)
```

O token viaja com **24 caracteres**. Um roteiro de 90s viajaria com ~1.700 e
ficaria a 300 do corte. **O token não é enfeite: é o que faz o link sobreviver
ao cadastro.** Fica honesto o que ainda não provei: a perna de VOLTA do OAuth
(cadastro Google real) só foi verificada por leitura de código na #1b — sonda
de ponta a ponta exige uma conta nova de verdade.

### O QUE JÁ ESTÁ NO BANCO DE PRODUÇÃO (aplicado nesta rotação)

Migration `gpt_handoffs_channel_and_payload_hash_20260906`, **aditiva**:

* `channel text not null default 'gpt_store'` — o default é deliberado: as 5
  linhas que já existiam nasceram da loja, e o código que está no ar insere
  sem a coluna. **A migration sobe antes do deploy sem quebrar nada.**
* `payload_hash text` + índice único **parcial** (`where payload_hash is not
  null`, para não exigir hash das linhas velhas).

**Por que o hash existe.** Um link de chat é clicado várias vezes e sofre
prefetch. Sem idempotência, cada clique viraria uma linha nova e a razão
`criado → visto → clicado` — que é o G5 inteiro — **mentiria para sempre**.
Conferido depois de aplicar: 5 linhas, 5 no canal default, 2 colunas, 1 índice,
RLS ligado com **0 policies** (só service role, sem leitura pública).

### O FALSO ALARME QUE EU QUASE ESCREVI

O funil devolveu `pousos_vistos = 0` e `cliques = 0` **com 7
`gpt_landing_viewed` e 1 `gpt_landing_clicked` na tabela de eventos**. Parecia
o meio do funil cego — o padrão "campo gravado e não honrado" que já custou
caro aqui. Fui ao código antes de escalar: `app/go/[token]/page.tsx:140` e
`api/gpt/handoff/go/route.ts:74` dizem `if (!bot) await mark…`, e os 8 eventos
carregam `bot: true` — eram os meus próprios curls. **As colunas em zero estão
certas.**

Isso deixa uma regra para o G5, que vai para o SQL: **as colunas da linha
contam só humanos; os eventos contam todos, com bandeira.** Somar os dois no
mesmo degrau é laranja com maçã.

### G5 — O SQL DO FUNIL, JÁ RODANDO

Três degraus por **handoff** (não existe pessoa ainda) e três por **pessoa**,
nunca somados como se fossem a mesma unidade:

```sql
with por_handoff as (
  select date(created_at at time zone 'America/Sao_Paulo') as dia, channel,
         count(*)                                      as d1_criados,
         count(*) filter (where viewed_at  is not null) as d2_pouso_humano,
         count(*) filter (where clicked_at is not null) as d3_clique_humano,
         count(distinct user_id) filter (where user_id is not null) as pessoas_ligadas
  from public.gpt_handoffs group by 1,2
),
por_pessoa as (
  select date(p.created_at at time zone 'America/Sao_Paulo') as dia,
         case when p.signup_utm_source='chatgpt_gpt' then 'gpt_store'
              else 'assistant_link' end as channel,
         count(*) as d4_cadastros,
         count(*) filter (where exists (select 1 from public.videos v where v.user_id=p.id)) as d5_fez_filme,
         count(*) filter (where exists (select 1 from public.events e
                                        where e.user_id=p.id and e.name='payment_success')) as d6_pagou
  from public.profiles p
  where p.signup_utm_source in ('chatgpt_gpt','assistant_link')
  group by 1,2
)
select coalesce(h.dia,s.dia) as dia, coalesce(h.channel,s.channel) as canal,
       coalesce(h.d1_criados,0), coalesce(h.d2_pouso_humano,0), coalesce(h.d3_clique_humano,0),
       coalesce(s.d4_cadastros,0), coalesce(s.d5_fez_filme,0), coalesce(s.d6_pagou,0)
from por_handoff h
full outer join por_pessoa s on s.dia=h.dia and s.channel=h.channel
order by dia desc, canal;
```

Estado de hoje, sem maquiagem: **5 criados (meus canários), todo o resto zero.**
O GPT não está publicado e o `/make` ainda não subiu.

### A TRAVA DE SEGURANÇA QUE O DESENHO CARREGA

A leitura achou que `create_intent=fast|trial_best` **dispara render sozinho**
para conta grátis (`GenerateClient.tsx:3406-3763`). Documentar esse parâmetro
publicamente deixaria **qualquer link de terceiro gastar o crédito do primeiro
vídeo de quem clicasse**, sem a pessoa apertar Generate. Por isso o `/make`
emite uma **lista fechada** de parâmetros e o guardião reprova o arquivo se as
palavras `create_intent`, `autoanalyze` ou `studio=` aparecerem nele ou no
`llms.txt`. O que documentamos preenche a caixa e **espera o clique humano** —
provado em `GenerateClient.tsx:7946`.

### SONDAS DE BASELINE (o par que torna a próxima medição conclusiva)

`/` 200 · `/gpt/openapi.json` 200 · `/llms.txt` 200 · **`/make` 404** ·
controle `/make-controle-inexistente` **404**. Depois do deploy, `/make` tem de
virar 302 **com o controle ainda em 404** — sem o controle, um código novo não
prova deploy nenhum.

### PARADA QUE EU ASSUMO

Se, 14 dias depois do `/make` no ar e citado no `llms.txt`, houver **menos de
10 handoffs de canal `assistant_link` criados por humano** (`bot=false`), a
tese "os assistentes leem o llms.txt e entregam link" está errada, e o esforço
vai para publicar o GPT da loja, que não depende de ninguém ler nada.

### PRÓXIMO PASSO

Código do `/make` + fato em `kineoFacts` + seção no `llms.txt` + guardião com
mutantes; depois `tsc`, enfileirar, publicar e a sonda do par.

### #5b — 23:0x — **EM PRODUÇÃO**: `/make` no ar, e a idempotência provada com o dedo

`origin/main = 9133833b`. Deploy READY. O que subiu:

| arquivo | o quê |
|---|---|
| `app/make/route.ts` (novo) | GET → valida → limita → detecta robô → hash → reusa ou insere → 302 `/go/<token>` |
| `lib/gptHandoff.ts` | `HANDOFF_CHANNELS`, `CHANNEL_TAGS`, `parseAssistantLinkQuery`, `handoffPayloadHash`, `ASSISTANT_LINK_PATH` |
| `lib/gptHandoffStore.ts` | `channel`/`payload_hash` na linha; `findHandoffByPayloadHash` (só linha viva) |
| `app/api/gpt/handoff/route.ts` | a Action grava canal e hash, e reaproveita linha viva |
| `lib/kineoFacts.ts` | `ASSISTANT_DEEP_LINK_FACT` — nenhum valor digitado, tudo importado |
| `app/llms.txt/route.ts` | uma seção gerada inteiramente do fato |
| `scripts/test-assistant-deep-link.mjs` | 153 verificações, 7 mutantes mortos |

### AS SONDAS — cada uma com o seu controle

```
CONTROLE  /make-controle-inexistente        404   (sem ele, um 302 nao prova deploy)
1 clique  /make?script=…&duration=60        302 -> /go/BVvMVQOxBCEW-jvFdOuN6KBw
2 clique  (URL IDENTICA)                    302 -> /go/BVvMVQOxBCEW-jvFdOuN6KBw
3 clique  (URL IDENTICA)                    302 -> /go/BVvMVQOxBCEW-jvFdOuN6KBw
pouso     /go/BVvMVQOxBCEW-jvFdOuN6KBw      200
sem script /make                            302 -> /chatgpt-to-youtube-shorts?handoff_error=script_missing
llms.txt  contem "usekineo.com/make"        linha 29
/api/facts contem "assistantDeepLink"       sim
```

E a linha no banco, **uma só para os três cliques**:

```
token=BVvMVQOxBCEW-jvFdOuN6KBw  channel=assistant_link  payload_hash=4227278dec9e…
duration=60  engine=seedance  aspect=9:16  words=31  fit=short  topic="Lake Natron"
```

**A idempotência não é teoria.** Três requisições idênticas, **uma linha**. Sem
isso, o funil `criado → visto → clicado` marcaria 3/1/0 onde a verdade é 1/1/0 —
e o número que decide se essa jogada vale a pena estaria inflado desde o
primeiro dia.

**Um bônus que a sonda entregou de graça:** a linha voltou com
`viewed_at` preenchido, porque desta vez usei **UA de navegador**. Isso fecha
com evidência a dúvida da #5: a escrita de pouso funciona, e o zero anterior era
mesmo só o filtro de robô agindo. Curl pelado teria repetido o falso negativo —
`isLikelyBot` trata UA ausente como robô.

### O QUE EU CONFERI E O AGENTE NÃO PODIA CONFERIR

O `node:crypto` entrou em `lib/gptHandoff.ts`, que é importado por
`lib/kineoFacts.ts`. **Se qualquer componente `'use client'` puxasse essa
cadeia, o build da Vercel quebraria e o `tsc` passaria verde** — o typecheck não
enxerga a fronteira servidor/cliente do Next. Varri os 13 importadores diretos e
os de segundo nível: **todos servidor**, nenhum componente em `components/`
importa a cadeia. Só depois disso publiquei.

Também reconferi os guardiões **na ponta da fila**, não na minha worktree — a
sessão irmã mexeu no mesmo `llms.txt` (`5c3e9695`) entre o meu commit e o push.
`test-assistant-deep-link` 153 · `test-gpt-handoff` 327 · `test-after-the-film-facts` 34 ·
**`test-llms-paginas-citadas` 84 (o guardião DELA)** — todos verdes depois do rebase.

### A TRAVA QUE EU NÃO AFROUXEI

O agente ajustou duas asserções do guardião antigo. Fui olhar antes de aceitar,
porque afrouxar trava alheia já custou caro aqui. A (A0) exigia que
`lib/gptHandoff.ts` importasse **um** módulo; agora exige **um módulo do
projeto** (`@/lib/aspect`) e libera **só** o builtin `node:crypto`, por lista
fechada. A invariante ("a lib não ganha dependência do projeto") sobreviveu
inteira. A (B2) trocou `const token =` por `\btoken =` porque o token virou
`let` com o reaproveitamento — a semântica ("token novo vem de `newToken()`")
continua exigida.

### O PEDIDO QUE EU MESMO TINHA ABERTO, E AS TRÊS COISAS ERRADAS NELE

Fechei o `PEDIDOS` linha 391 corrigindo o diagnóstico **dentro** do pedido:

1. **"Arquivos de origem Codex"** — não são mais. O `llms.txt` foi editado três
   vezes HOJE pela sessão irmã. Eu estava endereçando para quem não mexia.
2. **"Só depois do GPT publicado"** — verdade para a loja, falso para o `/make`,
   que não depende de aprovação de ninguém.
3. **"Medir por `metadata->>'caller'`"** — esse campo **não existe**; eu o
   inventei ao escrever o pedido. Quem seguisse a receita mediria `null` e
   concluiria "ninguém usou". O discriminador real é `gpt_handoffs.channel`.

### O QUE AINDA NÃO ESTÁ PROVADO (dito sem maquiagem)

A perna de **volta** do cadastro — pessoa deslogada clica, se cadastra pelo
Google e volta ao `/go/<token>` — continua provada só por leitura de código
(#1b) e pela sonda do 302. Uma prova de verdade exige uma conta nova real, que
esta sessão não cria. É a primeira coisa a olhar quando o primeiro humano
orgânico aparecer no funil.

### PRÓXIMO PASSO

G6 fecha aqui. O que sobra do ciclo é observar o funil por canal e, se sobrar
tempo, a faixa na landing que hoje ignora `handoff_error` (o slug é gravado e a
tela não o lê — medição sem tela).

---

### #6 — 22:52-23:50 — o caminho foi provado com gente, e a prova achou um clique a mais

**A sonda de baseline da #5 não provava nada.** Ela mediu `/make?script=teste`
com o UA padrão do curl e anotou `302` como "no ar". Mas o `/make` tem um ramo
de robô (`route.ts`, passo 3): UA de robô **não cria linha** e desvia para a
landing. Ou seja: aquele 302 era o robô sendo mandado embora, não o caminho
funcionando. A perna **humana** do `/make` nunca tinha rodado — a tabela tinha
**zero** linhas de canal `assistant_link`.

**Canário com UA própria, excluível do funil.** Rodei o caminho inteiro com
`Mozilla/5.0 (KineoCanary-gpt-loja-6; probe)` — passa no detector de robô
(nenhuma palavra da lista) e fica **auto-identificável**, então a linha sai do
funil por `user_agent like '%KineoCanary%'`. Um UA de Chrome falso seria
indistinguível de uma pessoa e envenenaria para sempre a métrica de
falsificação que eu mesmo escrevi na #5.

```
/make (UA humano)        -> 302 /go/xFIgmFTulWE74-VG7XcBKK0S
/go/<token> deslogado    -> 200, roteiro inteiro na página, "See plans" visível
mesmo payload de novo    -> MESMO token (idempotência viva, não teórica)
botão deslogado          -> 302 /signup?redirect=%2Fgo%2F<token>
token inválido (controle)-> 302 de volta ao /go (comportamento distinto)
pricing                  -> 302 /pricing?utm_source=chatgpt_gpt&intent_campaign=…
linha no banco           -> channel=assistant_link, viewed_at E clicked_at carimbados
```

**A perna do OAuth, que a #5 deixou em aberto, está fechada — por dado, não por
leitura.** O nome do parâmetro bate em cada salto (`redirect=` sai e `redirect=`
é lido; `next=` só existe no salto seguinte, e `/auth/callback` lê `next`).
`normalizeInternalRedirect` é o único portão e aceita `/go/<token>`; não há
lista branca de caminhos. E o `next` **sobrevive ao round-trip do Google em
produção**: `auth_callback_completed` dos últimos 14 dias tem **9 destinos
distintos**, incluindo `/api/stripe/checkout` (5×) e `/ai-shorts-for-agencies`
(3×) — caminhos que só chegam lá por `next`. Se o allow-list do Supabase
cortasse a query, todos seriam `/` ou `/dashboard`.

### O DEFEITO QUE A PROVA EXPÔS — e que já está no ar

A pessoa deslogada aperta **"Make this video"**, vai para o cadastro, cria a
conta — e o `/auth/callback` a devolve para `/go/<token>?signup=1`, onde a
página **se redesenhava com o mesmo botão**. Ela precisava apertar **de novo**,
logo depois de criar a conta, que é o ponto de maior intenção da jornada.
Nada estava quebrado: o parâmetro nunca se perdeu. O que se perdia era um
clique, no pior lugar possível para perder um.

Agora a volta com `signup=1` desvia para a **mesma rota contadora do botão** —
nunca para uma cópia da regra dela: é lá que a sessão é resolvida, o clique é
contado e `buildStudioDestination()` monta a URL do Studio.

**Sem laço possível, e a prova não está na página:** o desvio exige
`signedIn`, e o ramo logado de `/api/gpt/handoff/go` termina **sempre** em
`${destino}` (Studio), nunca em `/go` nem em `/signup`. O guardião lê a **rota**
e trava esse invariante — no dia em que alguém mexer nela, o teste cai antes de
virar laço em produção. Falsificado com 4 mutantes: tirar `signedIn` (vermelho),
`redirect()` dentro do try/catch (vermelho), a **rota** voltando para `/go`
(vermelho — mutante em OUTRO arquivo), e `/studio/create` montado à mão
(vermelho).

Nada é gerado: `create_intent` e `autoanalyze` continuam fora do caminho.

**Sonda própria:** `gpt_landing_auto_forwarded` (com token e canal), para a
próxima sessão **medir** quantas pessoas o desvio economizou em vez de supor.

### O VERMELHO QUE NÃO ERA MEU, E NÃO ERA DEFEITO (#6b)

O guardião do ciclo ficou verde na minha worktree (327/0) e **vermelho na ponta
da fila** (326/1) — a armadilha já registrada em memória. Reproduzi numa
worktree limpa de `origin/main`: **o vermelho já existia lá antes do meu
commit**. E não era defeito de produto: o documento diz **7 dias** nos dois
lugares que a pessoa lê. O que reprovava era uma frase **nossa**, de
argumentação interna — "195 dos 362 cadastros de **14 dias**", uma janela de
medição lida como promessa de validade. Ela nem aparecia num `grep` por linha:
quebra entre "14" e "dias", e só o texto achatado a juntava. O guardião passa a
varrer o bloco literal que o GPT recebe e o registro, não a nossa prosa —
falsificado com a instrução em "14 days" (vermelho) e o registro em "30 dias"
(vermelho).

### O QUE ESTÁ NO AR

`origin/main = 238dc502`. `/go/<token>?signup=1` **deslogado devolve 200**
(um 302 aqui seria o laço), `/` 200, `/gpt/openapi.json` 200, `/llms.txt` 200,
controle `/make-controle-inexistente` **404**.

### MEDIÇÃO — o SQL da #5 ganha uma cláusula

O funil precisa excluir o canário, senão eu falsifico a minha própria tese com
a minha própria sonda: `and coalesce(user_agent,'') not like '%KineoCanary%'`.

**Sujeira que já está lá e não é minha:** duas linhas `assistant_link` nascidas
às 01:52 e 01:54 UTC com UA de **Chrome comum** — uma de 31 palavras ("Lake
Natron", tema de teste da casa) e outra de **2 palavras**. Não são gente, e são
**indistinguíveis** de gente no funil. Quem sondar o `/make` daqui para frente
usa UA identificável, senão a métrica de 14 dias nasce mentindo.

### PARADA (mantida da #5, agora com denominador limpo)

Menos de **10 handoffs `assistant_link` de humano** (fora canário e fora essas
duas linhas) em 14 dias = a tese "os assistentes leem o llms.txt e entregam o
link" está errada, e o esforço vai para publicar o GPT da loja.

### PRÓXIMO PASSO

O `gpt_landing_auto_forwarded` só terá linha quando alguém de verdade criar
conta a partir de um link — a próxima sessão mede isso antes de construir mais.
G1-G7 estão prontos; o que falta é **mão do fundador** (publicar o GPT exige
verificação de domínio por DNS).

✅ **O QUE VOCÊ PRECISA FAZER**
1. Nada de código. O caminho está no ar e provado com dedo.
2. Quando quiser o GPT na loja da OpenAI: `docs/GPT-KINEO-VIDEO-MAKER.md` tem o
   passo a passo, e o portão é a verificação de domínio por DNS (mão sua).

📋 **O QUE ACONTECEU**
O link que qualquer assistente escreve foi testado de ponta a ponta pela
primeira vez com um visitante humano — a sonda anterior media o robô e não
provava nada. Funciona: link → página com o roteiro → cadastro → volta. No meio
do caminho apareceu um defeito silencioso: quem acabava de criar a conta tinha
de apertar o mesmo botão outra vez, no momento de maior vontade de continuar.
Isso acabou. Também ficou provado, com dados de produção, que o caminho de volta
sobrevive ao login do Google — a dúvida que ficou aberta ontem.

### #7 — 23:22→01:2x — **EM PRODUÇÃO**: a Kineo pôs a porta no ar e não pôs a placa

`origin/main = c1b0c46d`. Dois commits meus dentro: **`92446fae`** (descoberta)
e **`131a5333`** (o erro que ninguém lia). Fila 0.

#### A PERGUNTA QUE ABRIU A ROTAÇÃO

A #6 provou o caminho com o dedo: link → página com o roteiro → cadastro →
volta → Studio preenchido. O que ninguém tinha perguntado é o que faz esse
caminho valer alguma coisa: **como um assistente descobre que o `/make`
existe?**

Medido: o formato do link vivia em exatamente **dois** lugares — `/llms.txt` e
o `openapi.json` de um GPT que ainda não está na loja. E o `/llms.txt` está no
ar desde **26/07**, seis semanas, sem uma única evidência de que algum
assistente tenha agido a partir dele. Descoberta era **100% do valor** da
aposta, e era o único pedaço que ninguém tinha olhado.

#### MEDI ANTES DE CONSTRUIR

`gpt_handoffs` inteira: **8 linhas, todas minhas, zero gente** (5 `gpt_store`,
3 `assistant_link`, 1 delas canário). A peça tem horas de vida — isso não
condena nada, mas também não autoriza empilhar mais em cima dela sem saber por
onde a gente entraria.

`grep -rn potentialAction` no repositório inteiro: **zero ocorrências.** O site
tem JSON-LD em 62 páginas — `Organization`, `SoftwareApplication`, `FAQPage`,
`HowTo`, `VideoObject` — e **nenhuma delas diz como se ENTRA no produto por
link**. O `<head>` da raiz tinha um único `<link rel="alternate">`, para o RSS
de ideias; nenhum para o `/llms.txt`. Um assistente que chega na home precisava
**adivinhar** que o arquivo existe.

Duas ausências, o mesmo defeito: a porta estava no ar e a placa não.

#### A SONDA QUE EU NÃO CONSTRUÍ, E POR QUÊ

Tentei instrumentar o `/llms.txt` para saber **quem** o busca. Desisti com
motivo, e o motivo vale mais que a peça: a rota é `dynamic = 'force-static'`
com `s-maxage=3600` (`app/llms.txt/route.ts:62`, `:502`) — o handler roda no
máximo **uma vez por hora por região**, então uma sonda dentro dele seria
**estruturalmente cega** e mentiria com cara de dado. O log da Vercel **não
carrega user-agent**, então a resposta não é recuperável depois. E o único
lugar que vê toda requisição é o middleware, que é o caminho quente do site
inteiro.

A conclusão honesta: **o próprio `/make` já é a sonda.** Se um assistente lê o
`llms.txt`, a consequência observável é uma linha `assistant_link` com UA de
gente — que a parada de 14 dias já mede.

#### O QUE ENTROU NO AR (`92446fae`)

* **`potentialAction`** (`CreateAction` + `EntryPoint.urlTemplate`) no
  `SoftwareApplication` que sai do **layout raiz** — logo, em toda página.
  Alcance: **187 URLs do sitemap**, contra a superfície única de ontem.
* O `urlTemplate` é derivado das chaves de query do **próprio exemplo
  publicado**, filtradas por `k in dl.params`: só entra parâmetro que a rota
  `/make` valida. Nenhum literal (`'/make'`, `'script='`, motor, 35/60/90/5000).
* **`<link rel="alternate" type="text/plain" href={LLMS_TXT_PATH}>`** no
  `<head>`. A constante nasce em `lib/gptHandoff.ts` ao lado de
  `ASSISTANT_LINK_PATH`, e o `app/robots.ts` passa a usar a **mesma** — a
  string existe uma vez só.

**A regra de honestidade que governou o schema:** o `result` **não é
`VideoObject`**, e o guardião trava isso com o porquê escrito no arquivo. O
link não produz vídeo: guarda o roteiro, abre uma página e **espera um clique
humano** dentro do Studio. Prometer vídeo no schema seria a vitrine oferecendo
o que o cobrador recusa. A `description` é `dl.behavior` **verbatim**, e ela
termina em *"it does not generate anything on its own"*.

#### O SEGUNDO DEFEITO, ACHADO ENQUANTO O PRIMEIRO COMPILAVA (`131a5333`)

`grep -rn handoff_error` devolvia **dois** resultados: a linha que **escreve**
(`app/make/route.ts:93`) e o guardião que confere que ela escreve. **Zero
leitores.** Todo link malformado que um assistente montasse jogava a pessoa
numa página de marketing que não dizia **uma palavra** sobre o que aconteceu —
e o assistente nunca aprendia que errou.

Agora são **11 frases**, uma por slug, com os limites reais importados da lib e
nenhum número digitado. Em produção:

```
/make?script=            -> 302 ...?handoff_error=script_missing
/make?...&duration=47    -> 302 ...?handoff_error=bad_duration
frase servida            -> "…longer than the 5,000-character limit — ask your
                            assistant to trim it, or paste a shorter version below."
```

**A restrição que mudou o desenho, e a decisão que tomei.** A página é
`force-static`, e no Next 14.2.5 isso faz o `searchParams` de servidor ser
**sempre vazio** (`next/dist/client/components/search-params.js:39-42`: *"If we
forced static we omit searchParams entirely"*). Ler no servidor exigiria
`force-dynamic` **nesta página de AEO**. Recusei: este ciclo inteiro aposta em
ser lido por máquina, e trocar latência de crawler por um aviso do caminho de
erro é mau negócio. O aviso passou a ser lido no cliente, com precedente da
casa (`ChatGptWelcomeBanner.tsx`). Efeito colateral desejável: crawler nunca
indexa copy de erro.

E o evento **`gpt_handoff_error_shown`** com o slug: pela primeira vez dá para
medir **quantos** links malformados os assistentes montam e **quais** erros.

#### DOIS ERROS MEUS NESTA ROTAÇÃO, ditos sem maquiagem

1. **`git checkout --` apagou trabalho não commitado.** Fui remover uma linha
   minha de `StructuredData.tsx` e o comando levou junto o `potentialAction`
   inteiro. É **a lição que já está na memória** e eu a repeti. Recuperado da
   cópia de socorro no scratch. A prática que passa a valer: mutante se desfaz
   por cópia guardada, nunca por `checkout` num arquivo com edição viva.
2. **Quase publiquei um `import 'server-only'` que não resolve.** O pacote
   **não está em `node_modules`** deste projeto — só resolve dentro do bundler
   do Next — e a linha derrubava justamente o bloco `(E)` do guardião, que é a
   prova mais valiosa do arquivo (ele **renderiza** o componente e lê o JSON-LD
   servido). Um guardião que desliga a própria prova para se proteger não
   protege nada. A trava virou varredura: nenhum arquivo `'use client'` importa
   o componente, e o importador é o layout raiz — com uma asserção conferindo
   que o **denominador da varredura não é zero**.

#### PROVAS

Guardiões novos: `test-descoberta-assistente.mjs` **68/0** (o bloco `E`
transpila o `.tsx`, renderiza com `react-dom/server` e prova a **string final**
com valor, não com regex) e `test-handoff-error-visivel.mjs` **95/0** (extrai
os slugs do código real da rota e confere nos **dois** sentidos). Vizinhos na
**ponta da fila**, não só na worktree: 153 assistant-deep-link · 329
gpt-handoff · 171/171 chatgpt-script-handoff · 187/187 shorts-ideas-feed ·
15/15 brand-entity · 313 money-truth · 21 go-auto-forward · 31/31
comparisons-script-input · `tsc --noEmit` **exit 0**.

**Falsificados com 16 mutantes** ao todo (8 + 8), todos vermelhos. Um deles
achou um furo no meu próprio regex: a fronteira de palavra não existe entre `0`
e `s`, então `"60s"` passava batido — corrigido. O obrigatório do segundo: um
slug **falso** acrescentado na **rota**, sem tocar na página, reprovou — a
asserção está amarrada ao arquivo real, não a uma cópia.

**Sondas em produção, com UA identificável e controle 404:**

```
home        urlTemplate = https://www.usekineo.com/make?script={script}&duration={duration}&engine={engine}
home        "result":{"@type":"CreativeWork", …}        <- o invariante, servido
home        <link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt"/>
/pricing    potentialAction presente (viaja fora da home)
controle    /pricing-controle-inexistente -> 404
```

#### MEDIÇÃO (G5) — e a falsificação que ela exigia

`docs/queries/FUNIL-DEEP-LINK-2026-09-07.sql`, com a **regra de unidade**: três
degraus contam **handoffs** (não há pessoa ainda), três contam **pessoas**.
Somar os seis é o erro que já custou uma rotação nesta casa.

E o SQL foi **falsificado, não só escrito**: "0 de 0" é indistinguível de
predicado quebrado, então rodei os **mesmos** predicados contra uma coorte que
existe — **236 cadastros / 236 com perfil / 157 com filme / 1 pagante em 7
dias**. Os joins funcionam; os zeros do funil novo são **ausência real de
gente**.

#### UM FATO QUE CORRIGE UMA NOTA PERMANENTE DO CLAUDE.md

O CLAUDE.md afirma que *"a tabela `events` NUNCA teve um único
`checkout_payment_failed`"*. **Não é mais verdade**: existem **2 eventos, de 2
pessoas**, o último em 04/09, com `checkout_payment_failure_enriched` junto.
Dois eventos não derrubam nada — a conclusão de preço continua de pé, e não
gastei um minuto reabrindo o que o fundador fechou. Mas a **razão** dada ali
para desprezar o campo ("nunca teve nenhum") está desatualizada, e quem ler
aquela linha amanhã precisa saber disso.

#### PARADA (mantida)

Menos de **10 handoffs `assistant_link` de humano** (fora canário e fora as
duas linhas sujas de 07/09) em 14 dias = a tese "os assistentes leem e entregam
o link" está errada, e o esforço vai para a loja.

#### PRÓXIMO PASSO

Medir `gpt_handoff_error_shown` — se os assistentes estiverem montando links
malformados, o slug dominante diz **exatamente** qual frase das instruções do
GPT está sendo mal lida, e isso conserta o documento em vez de adivinhar.

✅ **O QUE VOCÊ PRECISA FAZER**
1. **Nada de código.** As duas peças estão no ar e sondadas com controle.
2. Quando quiser o GPT na loja: `docs/GPT-KINEO-VIDEO-MAKER.md` tem o passo a
   passo; o portão é a verificação de domínio por DNS, que é mão sua.

📋 **O QUE ACONTECEU**
A aposta do ciclo dependia de um assistente descobrir sozinho um link que só
estava escrito num arquivo que quase ninguém pede. Agora o formato do link
viaja no schema de **todas as 187 páginas** do site — no campo que os leitores
de máquina já consomem — e o `<head>` finalmente aponta para o `/llms.txt`. No
caminho apareceu um defeito silencioso: quando um assistente montava um link
errado, a pessoa caía numa página que não explicava nada e o assistente não
aprendia; agora explica, com os números certos, e cada erro vira medida. O
schema foi escrito com a regra de nunca prometer vídeo — porque o link não faz
vídeo, ele prepara o Studio e espera o clique.

---

### #8 — 07/09 00:0x — a loja fechou, e a casa passou a fazer o trabalho do GPT sozinha

**SHA `deee90be` — EM PRODUÇÃO** (`git ls-remote origin main` bate).

**O fato que mudou a rota:** desde 16/08/2026 conta pessoal do ChatGPT não cria
nem publica GPT — só workspace Business/Enterprise. O rascunho está montado, o
handoff funcionou ponta a ponta, e não existe botão "Everyone". Pagar o Business
é decisão do fundador, e **esperar por ela era parar**. Não parou: o trabalho do
GPT tem duas metades — **dar o prompt certo** e **receber o roteiro de volta** —
e nenhuma das duas precisa da OpenAI. A página `/chatgpt` faz as duas.

#### O NÚMERO QUE MANDOU CONSTRUIR (medido antes de codar, 14 dias)

`reason='prompt_looks_like_instruction'` (lib/growth/instructionPasteNotice.ts):
**59 pessoas distintas** colaram no Studio uma **ordem para um chatbot** em vez
de um roteiro. **40** tiraram ao menos um filme. **57 filmes**. **0 PAGANTES.**
Não é coorte hipotética: é gente que **já está tentando fazer exatamente isto**,
do jeito errado, sozinha, e que a casa vinha corrigindo com um aviso em vez de
com uma ferramenta.

#### O QUE SUBIU

| peça | o que é |
|---|---|
| `/chatgpt` | passo 1: o prompt da casa (HOOK/MICRO REWARD/ESCALATION/PAYOFF) pronto para colar no ChatGPT, Claude ou Gemini, com botão de copiar. passo 2: a caixa que recebe o roteiro de volta e devolve o mesmo `/go/<token>` que já estava no ar. K1: "See plans" → `/pricing?utm_source=paste_page` |
| canal `paste_page` | terceiro canal do MESMO handoff. Os dois antigos ficam byte a byte iguais — há asserção de **regressão explícita** para isso |
| `POST /api/gpt/handoff/paste` | irmão do POST da Action, com uma diferença de segurança: **sem `Access-Control-Allow-Origin: '*'`**. A Action é chamada pelo servidor da OpenAI; esta é chamada pelo navegador da própria pessoa, mesma origem. Abrir CORS aqui seria dar a qualquer site um POST público nosso |
| coluna `assistant` | `chatgpt\|claude\|gemini\|perplexity\|other`, declarada pela pessoa, opcional. **Aplicada no banco de produção** (`gpt_handoffs_assistant_20260907`) |

**O prompt não tem número digitado:** as faixas de palavras (35s 109-118 · 60s
186-201 · 90s 279-301) nascem de `DURATIONS` e da régua clássica (3,1 pal/s) por
**cálculo** — mexer na régua muda o prompt sozinho. E ele diz a verdade da casa:
*passar do alvo é bom, ficar abaixo é defeito*. 1.377 caracteres, teto de 1.500
cobrado pelo guardião.

**O que continua não acontecendo, e é a regra inteira:** não cria conta, não
debita crédito, não chama fornecedor, não gera filme. O link **prepara** o
Studio e espera o clique.

#### COMO PROVAR

`scripts/test-chatgpt-paste-page.mjs` — **128 verificações**, falsificado com
**7 mutantes escritos no arquivo real** (etiqueta de canal trocada · prompt além
do teto · link de planos removido · nome do evento trocado · CORS aberto · faixa
de palavras digitada à mão · painel importando a lib que puxa `node:crypto`) —
**todos vermelhos**, todos restaurados, guardião 128/0 no fim.
`test-gpt-handoff` 329 ok · `test-assistant-deep-link` 153 ok (a asserção A3 foi
**apertada** para os 3 canais em posição fixa, nunca afrouxada — a trava é do
fundador) · `npx tsc --noEmit` **exit 0**.

**Fronteira servidor/cliente conferida à mão** (a memória diz que o `tsc` não a
vê): o painel `'use client'` importa **só** `react` e `@/lib/analytics`; o prompt
e as listas chegam **por props** do server component. Nenhum `use client` importa
`lib/gptHandoff.ts`, que puxa `node:crypto`.

#### MEDIÇÃO (G5) — e a validação que ela exigia

`docs/queries/FUNIL-DEEP-LINK-2026-09-07.sql` ganhou três consultas: **(5)** qual
assistente escreveu · **(6)** o denominador da página (viu → copiou → colou) ·
**(7)** a coorte de instrução colada como **teste da tese**, para rodar de novo
em 14 dias. As três foram **rodadas contra o banco real antes de subir** — "0 de
0" é indistinguível de predicado quebrado, e as consultas (1) a (4) já agrupam
por `channel` sem lista digitada, então `paste_page` aparece sozinho.

#### RISCO CONHECIDO, dito sem maquiagem

`payload_hash` **não inclui** o `assistant`. Duas pessoas colando o roteiro
idêntico com assistentes diferentes reaproveitam a mesma linha, e a segunda não
grava o assistente dela. Escolhi idempotência (o funil `created→viewed→clicked`
mentir é pior) e o preço é uma distorção pequena na consulta (5). Roteiro
byte a byte igual entre duas pessoas é raro; se aparecer, o conserto é acrescentar
o campo ao hash.

**Segundo risco:** `/chatgpt` **não está anunciada em lugar nenhum** — nem no
sitemap, nem no `llms.txt`, nem no menu. Os limites do ciclo proíbem tocar nesses
arquivos. Enquanto isso, a página só é alcançável por link direto, e a consulta
(6) vai medir **zero** por ausência de porta, não por rejeição.

#### PRÓXIMO PASSO

Dar **porta** à página: o e-mail de filme pronto e a faixa de temporada passam a
oferecer "write the next episode with ChatGPT → paste it here" (**G10**, servidor
e componente são meus), e um AVISO no PEDIDOS para o sitemap e o `llms.txt`.
Sem porta, a melhor peça do ciclo mede zero — foi exatamente o erro que a memória
`peca-sem-superficie-nao-existe` já cobrou três vezes nesta casa.

✅ **O QUE VOCÊ PRECISA FAZER**
1. **Nada de código.** A página subiu sozinha e está sondada.
2. **Uma decisão, com o número na mão:** publicar o GPT na loja exige **ChatGPT
   Business (~US$ 25-30/usuário/mês)** = 4 Starters ($7) ou 1 Studio ($29) só
   para empatar. A `/chatgpt` faz o mesmo trabalho **hoje, de graça**. Minha
   recomendação: **não pagar agora** — deixar a `/chatgpt` medir por 14 dias e
   decidir com dado, não com aposta.

📋 **O QUE ACONTECEU**
A jogada do ciclo dependia de a OpenAI deixar publicar um GPT, e ela não deixa
mais para conta pessoal. Em vez de esperar, a casa passou a fazer o que o GPT
faria: entrega o prompt pronto para a pessoa colar no ChatGPT dela e recebe o
roteiro de volta numa caixa, que vira o mesmo link de um clique que já estava no
ar. O que descobri medindo é que isso não era ideia nova — 59 pessoas em 14 dias
já vinham colando ordens de chatbot no Studio, 40 tiraram filme daquilo e
nenhuma pagou. Agora existe um caminho certo para elas, e um número que diz, pela
primeira vez, qual assistente escreveu o roteiro que chegou aqui.

---

### #9 — 07/09 00:2x→01:0x — **EM PRODUÇÃO**: a página tinha porta em nenhum lugar, e o plano mandava abrir uma que mede 2

**SHA `5305bb07` — EM PRODUÇÃO** (`git ls-remote origin main` bate).

A `/chatgpt` subiu na rotação passada e só era alcançável por link direto. O
plano (G10) mandava dar-lhe porta em **duas** superfícies: o e-mail de filme
pronto **e a faixa de temporada**. Antes de codar eu medi o alcance real das
duas, em pessoas distintas, 7 dias, no banco de produção:

| superfície | pessoas / 7d |
|---|---|
| `video_ready_email_sent` — e-mail de filme pronto | **120** |
| `pasted_directives_detected` — colou uma ORDEM de chatbot no Studio | **21 em 3 dias** |
| `season_shown` — faixa de temporada | **2** |

**A faixa de temporada não ganhou porta.** Ligar a melhor peça do ciclo numa
superfície que 2 pessoas viram em 7 dias é o erro que a memória
`medir-alcance-da-superficie-antes-de-ligar` já cobrou duas vezes em 06/09. O
guardião **afirma** que `SeasonStrip.tsx` não aponta para `/chatgpt` — a decisão
está travada em teste, não só escrita aqui.

No lugar dela entrou a superfície que a medição encontrou e o plano não citava.

#### PORTA A — o aviso de instrução colada (a maior INTENÇÃO da casa)

21 pessoas em 3 dias colaram no Studio uma ordem para um chatbot ("write me a
script about…") em vez de um roteiro. Essa é **exatamente** a pessoa para quem a
`/chatgpt` foi construída: ela quer que uma IA escreva o roteiro, e só colou no
lugar errado. Até agora a casa dizia isso a ela e **parava** — aviso de texto,
nenhuma saída. Agora o aviso tem link.

Só o ramo `command_to_chatbot` ganha o CTA. Quem colou a **resposta** do chatbot
(`labeled_script`) já tem o roteiro na mão; mandá-la buscar um prompt seria
empurrá-la para trás. O guardião amarra isso ao ramo, não ao texto.

O clique tem **evento próprio** (`instruction_notice_cta_clicked`) porque o UTM
de sessão é *first-touch*: quem chegou do ChatGPT já tem o campo ocupado e a
chegada por UTM mentiria sobre esta porta. O evento é a medição real.

#### PORTA B — o e-mail de filme pronto (o maior ALCANCE)

Bloco incondicional em todo envio, para que o denominador seja o próprio
`video_ready_nudge_sent` — sem metadata nova para inventar. Assunto,
destinatário e cadência **intactos** (o guardião checa `READY_EMAIL_GAP_MS`,
idade mínima/máxima e o gate de lifecycle).

**A decisão que evitou um defeito:** o link sai de um montador único e usa
`utm_source=lifecycle`, não um `utm_source` novo. `lib/lifecycle/emailReturnDoor.ts`
define `OUR_EMAIL_UTM_SOURCES = {'lifecycle'}` como a **única** etiqueta de
e-mail da casa — um segundo padrão aqui quebraria, no mesmo dia, o portão de
retorno que a outra pista acabou de consertar (`c1b0c46d`, o clique de inbox que
chegava sem cookie). A identidade da porta fica em
`utm_campaign=video_ready_chatgpt`.

#### COMO PROVAR

`scripts/test-chatgpt-porta.mjs` — **49 verificações**, estilo `readFileSync` do
arquivo real (sem alias `@/`, que mata 72 testes desta casa antes da primeira
asserção), amarradas à **condição** e não à contagem de texto. Falsificado com
**10 mutantes escritos no arquivo real** — href trocado · utm removido · CTA
movido de ramo · nome do evento trocado · gate virado `true` · CTA tornado
incondicional · `utm_source` trocado · bloco removido do template · bloco
condicionado · link cru digitado fora do montador — **todos vermelhos**, todos
relidos do disco para provar que a escrita aconteceu (mutante não escrito
devolve verde e mente), todos restaurados com sha256 conferido.
`npx tsc --noEmit` **exit 0** · `test-instruction-paste-notice` **48/48**.

**Fronteira servidor/cliente:** `instructionPasteNotice.ts` continua com **zero
imports** — é carregado por componente `'use client'`, e o `tsc` não vê essa
fronteira (já quebrou o build da Vercel nesta casa).

#### SONDAS

`git ls-remote origin main` = `5305bb07` · `/chatgpt` **200** com controle
`/chatgpt-nao-existe-xyz` **404** na mesma medição · home **200**.

#### RISCO, dito sem maquiagem

O e-mail de filme pronto ganhou **mais um** bloco. Ele já carrega rodapé de
saldo, oferta de pacote e convite de publicação; um e-mail com quatro pedidos
converte pior que um com um. Não mexi na ordem nem tirei nada de ninguém — a
prioridade entre os blocos é decisão de dono, não minha. O número que diz se
isso azedou é a taxa de clique dos blocos antigos depois de hoje.

#### PRÓXIMO PASSO

Sonda de bundle da Porta A (o CTA é código de cliente: a prova é o texto do CTA
aparecer no JS servido, com controle), e o SQL do funil ganhar as duas portas
como origem — `paste_notice` e `video_ready_chatgpt` — para o fechamento das
05:00 dizer qual das duas trouxe gente.

✅ **O QUE VOCÊ PRECISA FAZER**
1. **Nada.** Subiu sozinho, sondado, e nada muda de preço, de cadência ou de
   quem recebe e-mail.

📋 **O QUE ACONTECEU**
A página que ensina o cliente a usar o ChatGPT para escrever o roteiro dele
existia e não tinha porta em lugar nenhum. Agora tem duas: a maior em alcance
(o e-mail de "seu filme está pronto", 120 pessoas por semana) e a maior em
intenção (o aviso que aparece exatamente quando alguém cola uma ordem de
chatbot no Studio — 21 pessoas em 3 dias, gente que já está tentando fazer isso
sozinha e errando). A terceira porta que o plano pedia, a faixa de temporada,
**não** foi aberta: medi antes e ela alcança 2 pessoas por semana.

---

### #10 — 07/09 00:52→01:0x — **EM PRODUÇÃO**: a maior superfície de ChatGPT da casa não oferecia nada a metade de quem a via

**SHA `9d7442fe` · `git ls-remote origin main` confirmado.**

#### A PERGUNTA DA ROTAÇÃO

As duas portas da #9 subiram às 00:32. Antes de abrir uma terceira, medi as
superfícies **todas juntas** — a lição que já custou duas rotações neste ciclo
(`medir-alcance-da-superficie-antes-de-ligar`). O resultado desmontou o meu
próprio plano.

| superfície (7 dias) | sessões | pessoas |
|---|---|---|
| `chatgpt_welcome_banner_shown` (faixa pós-login) | **196** | 116 |
| `chatgpt_quickstart_input_opened` | 95 | 71 |
| `chatgpt_quickstart_selected` | 79 | 61 |
| **`chatgpt_page_viewed` (a `/chatgpt`)** | **2** | 1 |

A página que este ciclo inteiro construiu tem **2 visualizações**. A faixa que
já existia tem **196 sessões** — e ninguém tinha olhado para o degrau do meio
dela.

#### O DEFEITO, DITO EM UMA LINHA

**101 das 196 sessões viram a faixa e nunca clicaram na caixa.** E para essas
101 a faixa não tinha saída nenhuma: os dois botões são `disabled={!ready}`, e
`ready` exige texto colado. Quem chegou do ChatGPT **sem o roteiro na mão** só
tinha o "×".

Essa é exatamente a pessoa para quem a `/chatgpt` foi feita — ela quer que uma
IA escreva o roteiro e ainda não tem nada colado. A página estava no ar, e a
maior superfície de ChatGPT da casa não tinha porta para ela.

#### A ENTREGA

Terceira saída na faixa, visível **somente com a caixa vazia**
(`limit.length === 0`): *"No script yet? Get the prompt that makes ChatGPT write
one →"* → `/chatgpt?utm_source=quickstart_banner`.

**A decisão que evitou o estrago:** o link **some** assim que a pessoa cola
qualquer coisa. Os 40% que colam (79 de 196 sessões) são o que a faixa tem de
melhor; um terceiro CTA competindo com eles trocaria uma conversão boa por uma
duvidosa. Nenhum botão, nenhuma cópia, nenhum `disabled` e nenhum dos 4 eventos
antigos mudou. `lib/growth/chatgptQuickstart.ts` (contrato de outra pista) está
**intocado** — o guardião compara byte a byte com `origin/main`.

Clique com **evento próprio** (`chatgpt_quickstart_no_script_clicked`): o UTM de
sessão é *first-touch* e quem veio do chatgpt.com já tem o campo ocupado —
medir esta porta por chegada de UTM mentiria.

#### COMO PROVAR

`node scripts/test-quickstart-no-script-door.mjs` — **49 verificações**, estilo
`readFileSync` do arquivo real (sem alias `@/`), amarradas ao **predicado**
`limit.length === 0` e não a contagem de texto. Falsificado com **11 mutantes
escritos no arquivo real** — link removido · condição virada `true` · condição
`!ready` · condição `>= 0` · href sem utm · href para outra rota · utm trocado ·
evento renomeado · link fora do ramo · link duplicado · classe do CSS removida —
**todos vermelhos**, cada um relido do disco para provar que a escrita
aconteceu, cada um restaurado com sha256 conferido. `npx tsc --noEmit` **exit 0**.

#### SONDAS — e uma que ficou VACANTE, dita sem maquiagem

`git ls-remote origin main` = `9d7442fe` · `/chatgpt?utm_source=quickstart_banner`
**200** com controle `/chatgpt-nao-existe-xyz` **404** na mesma medição · home
**200**.

**A sonda de bundle não existe para esta peça.** Tentei: a faixa vive no layout
`(dashboard)`, autenticado, e o único lugar público que renderiza o mesmo card
(`/chatgpt-to-youtube-shorts`) o carrega **code-split atrás do ramo de erro** —
o controle prova isso: a cópia **antiga** do card (`Paste the answer. Make the
Short.`) também **não** aparece em nenhum dos 17 chunks servidos naquela página.
Ou seja: 0 achados ali é **medição vazia, não resultado vermelho**. A prova real
desta porta é o evento novo, e ela vem no fechamento das 05:00.

#### O QUE ESSE MERGULHO ACHOU DE QUEBRA (vai para o fechamento)

Funil da coorte ChatGPT, 14 dias: **208** viram a faixa → **134** entregaram um
filme completo → **3** pagaram. Dos 134, **100 fizeram exatamente um filme e
pararam** — e **79 desses 100 estão com menos de 15 créditos**, ou seja não
conseguem repetir nem no Seedance. O gargalo desta coorte **não** é "não aperta
o botão" nem "aperta e não sai": é o **segundo** filme.

#### RISCO

A faixa ganhou um terceiro caminho. Se a taxa de `chatgpt_quickstart_selected`
por `_shown` cair abaixo dos 40% de hoje (79/196), a porta está roubando os
coladores em vez de servir quem não tinha saída — e aí ela sai. O número que
decide é essa razão, medida depois de hoje.

#### PRÓXIMO PASSO

Ler as três portas juntas (`quickstart_banner`, `paste_notice`,
`video_ready_chatgpt`) contra `chatgpt_page_viewed` e dizer qual trouxe gente; e
levar ao fundador a conta do ChatGPT Business com os 79 "um filme e parou" ao
lado, que é a decisão de dinheiro que sobra deste ciclo.

✅ **O QUE VOCÊ PRECISA FAZER**
1. **Nada.** Subiu sozinho, sondado, sem mexer em preço, cadência ou cópia de
   quem já funcionava.

📋 **O QUE ACONTECEU**
Antes de abrir mais uma porta para a página nova, medi todas as superfícies
juntas — e descobri que a página nova tem 2 visitas enquanto a faixa velha do
ChatGPT tem 196 sessões por semana. Olhando essa faixa de perto: metade das
pessoas que a viam não tinham botão nenhum para apertar, porque os dois botões
só ligam depois que você cola um roteiro. Quem chegou do ChatGPT sem roteiro
via um cartão morto. Agora essas pessoas têm uma saída — e só elas: quem cola
texto continua vendo exatamente o que via antes.

---

### #11 — 07/09 01:22→02:0x — **EM PRODUÇÃO**: o produto lia a ordem do ChatGPT em voz alta, e cobrava por isso

**Press release.** *Você cola no Kineo o pedido que mandou para o ChatGPT e
aperta "Use my script as is". Até hoje o filme saía com um narrador lendo, em
voz alta, o seu pedido — "Create a 30-second vertical YouTube Short in
English…" — e o crédito ia embora junto. A partir de agora o Kineo te mostra,
antes de gastar, a primeira frase que sairia da boca do narrador, e te dá um
botão para a IA escrever o roteiro de verdade.*

#### O DEFEITO, com vítima, relógio e recibo

Não fui procurar isto: fui medir as portas da /chatgpt e o topo da tabela de
eventos das últimas 30h estava com outra coisa. `pasted_directives_detected`:
**41 eventos, 15 pessoas**. Cruzando com `script_mode`, o subconjunto que
importa: **`looks_pasted=true` + `verbatim` = 6 pessoas em 30 horas**, 7 em 14
dias.

`verbatim` é "Use my script as is" — narração palavra por palavra. Puxei os
filmes dessas pessoas. Todos `status=completed`, crédito debitado:

| o que a pessoa colou (início do `topic`) | o que o narrador leu em voz alta |
|---|---|
| `Create a 30-second vertical YouTube Short in English. Topic: What would happen if Earth suddenly stopped spinning…` | isso, literalmente |
| `IMPORTANT: This is a completely visual story. NO narration, NO voiceover, NO subtitles, NO captions, NO text, NO music.` | **a proibição de narrar, narrada** |
| `USE THE UPLOADED STARTING FRAME AS THE EXACT REFERENCE FOR THE FIRST FRAME. Preserve the same rusty hydraulic press…` | isso |
| `Create a 50 second viral unique Tiktok video with engaging visual. Have clear smooth flow narration. Subtitles should be below the screen…` | isso |

É a família do **menino da bolha** de 27/08: o produto pegou uma INSTRUÇÃO e
tratou como CONTEÚDO. Só que desta vez não foi o motor que se confundiu — foi
a casa, que perguntou "quer que eu leia isto palavra por palavra?", ouviu
"quero", e leu.

#### A CAUSA: dois detectores, um aviso, e o aviso ligado no detector errado

O aviso certo **já existia** (`lib/growth/instructionPasteNotice.ts`, ramo
`command_to_chatbot`, escrito em 04/09) e a UI dele **já era renderizada**
(`GenerateClient.tsx:12535`). O que faltava era o fio:

- `GenerateClient.tsx:~3742` acende o aviso — mas só no caminho de
  **auto-start**. É esse que alcança gente: **19 pessoas em 14 dias**.
- `GenerateClient.tsx:~7141` é onde a pessoa que **cola no Studio** passa. Ele
  lê as diretivas, corrige a duração, emite o evento… e **nunca acendia o
  aviso**.

O número que fecha o caso: das **7** que colaram ordem em verbatim, só **3**
tinham visto o aviso — e **as 3 mandaram verbatim mesmo assim**. Ou seja, o
aviso estava **mal entregue** (4 de 7 nunca o viram) **e** era **fraco onde
chegava** (3 de 3 seguiram em frente). Memória
`degrau-morto-dentro-da-superficie-viva`, terceira ocorrência.

#### O QUE MUDOU — e o que de propósito NÃO mudou

Quando `looksPasted && scriptMode === 'verbatim'`, na **análise** (Contrato C1,
custo **zero crédito**, antes de qualquer débito):

1. o aviso que já existia **acende**;
2. entra o elemento decisivo — **a frase que vai ser falada**, entre aspas, a
   primeira linha do texto da própria pessoa (≤120 chars, JSX puro, sem
   `dangerouslySetInnerHTML`): *"Your video will open by saying out loud: …"*.
   Escolhi a primeira linha e **não** o classificador `command_to_chatbot`
   porque o classificador só pega `create|make|write|…` no começo — **4 dos 8
   casos reais**. O `IMPORTANT: … NO narration` escapava dele. A frase falada
   funciona para os 8;
3. um botão de **um clique** troca para a IA escrever o roteiro — e
   **reanalisa**, porque `/api/analyze-idea` recebe o `scriptMode`: trocar só o
   botão mandaria ao render o mesmo brief montado com a ordem como narração.

**Não** trocamos o modo sozinhos. A decisão de 04/09 ("trocar o modo por conta
própria seria decidir no lugar de quem colou") fica **de pé** — o que mudou é
que agora a pessoa decide **vendo a consequência**, não no escuro.

#### O ACHADO QUE APARECEU NO MEIO DO CONSERTO (e que era o verdadeiro sangramento)

Confirmando a causa, o caminho do **one-click do /studio** se abriu:
`/studio/create?…&studio=1&autoanalyze=1` → análise → `phase='options'` → um
efeito dispara **o Generate sozinho**, sob uma cortina que esconde o
formulário. Quem cola no Studio **nunca vê o Step 1** — onde a UI do aviso
morava. Acender o estado teria mostrado o aviso para **ninguém**: a pessoa paga
segundos depois da análise, sem tela.

Então o conserto tem uma segunda metade: com o predicado verdadeiro, o
auto-disparo **não dispara** (`verbatim_order_autofire_held`), a cortina
levanta, e a pessoa vê o aviso e o mesmo botão Generate. É a mesma regra que o
auto-start já aplica desde 02/09. **Nada bloqueado, nada trocado sozinho** — só
deixou de gastar dinheiro sem mostrar a tela.

#### COMO PROVAR

`node scripts/test-verbatim-order-warning.mjs` — **95 verificações**, estilo
`readFileSync` do arquivo real, **sem alias `@/`** (memória
`guardioes-com-alias-nao-rodam`). Ele **extrai a condição do `if` real e a
executa numa tabela-verdade de 4 linhas**, em vez de contar texto (memória
`guardiao-contar-texto-nao-prova-condicao`).

Falsificado com **18 mutantes escritos no arquivo real** — condição virada
`true` · só `looksPasted` · só verbatim · aviso removido · frase falada
removida · botão removido · evento renomeado · aviso fora do ramo · hold
removido · corte de 120 chars removido · Step 2 removido · reanálise removida ·
frase virando HTML · detalhe vazando para o modo `ai` · e mais 4 — **todos
vermelhos**, cada um com sha256 conferido antes e depois para provar que a
escrita aconteceu (memória `mutacao-precisa-provar-que-aplicou`).

**Refiz o mutante mais importante com a minha própria mão**, sem confiar no
relatório: `if (true)` no lugar do predicado → sha mudou de `827e96bf…` para
`5e66f980…` (escrita confirmada), guardião **vermelho**, restaurado ao sha
original. `npx tsc --noEmit` **exit 0**.

#### SONDAS — e o limite dito sem maquiagem

`git ls-remote origin main` = **`46c53062`** (o `5eb5cf8e` da worktree foi
rebasado pelo bat; o conteúdo confere: o predicado e o
`verbatim_order_warned` estão em `origin/main`) · fila **0** ·
`https://www.usekineo.com/` **200** · `/chatgpt` **200** com controle
`/chatgpt-nao-existe-xyz` **404** na mesma medição.

**Sonda de bundle não existe para esta peça, e não vou fingir que existe.** O
`GenerateClient` vive no layout `(dashboard)`, **autenticado** — de fora não se
baixa o chunk. É a memória `entrega-so-de-cliente-nao-tem-sonda`, e a resposta
dela é a que apliquei: **instrumentar no mesmo commit**. A prova real são os
três eventos novos — `verbatim_order_warned`, `verbatim_order_switched_to_ai`,
`verbatim_order_autofire_held` — e ela vem no fechamento das 05:00.

#### RISCO

Falso positivo: `looksPasted` pode pegar um roteiro legítimo cheio de rótulos.
O custo do erro é **um aviso a mais**, nunca um bloqueio — o Generate continua
no mesmo lugar. O número que vigia isso é a razão
`verbatim_order_switched_to_ai / verbatim_order_warned`: se ficar perto de
**zero**, o aviso está aparecendo para quem não precisava e sai.

#### PRÓXIMO PASSO

Ler os três eventos novos com algumas horas de vida e dizer quantos débitos o
`autofire_held` evitou; e levar ao fundador, no fechamento, a conta do ChatGPT
Business ao lado dos **100 "um filme e parou"** da coorte ChatGPT.

✅ **O QUE VOCÊ PRECISA FAZER**
1. **Nada.** Subiu sozinho, sondado, sem tocar em preço, crédito, motor,
   roteiro ou régua.

📋 **O QUE ACONTECEU**
Fui medir as portas da página nova e tropecei num defeito maior: 6 pessoas em
30 horas colaram no Kineo o **pedido** que tinham mandado para o ChatGPT,
marcaram "leia meu roteiro palavra por palavra", e receberam um filme com um
narrador lendo o pedido em voz alta — uma delas ouviu o narrador dizer
"**NO narration, NO voiceover**". Todos os filmes ficaram prontos e todos os
créditos foram cobrados. O aviso que evitaria isso já estava escrito desde
04/09, mas estava plugado no caminho errado e não alcançava essas pessoas.
Agora ele acende no caminho certo, mostra a frase exata que o narrador diria,
oferece um botão para a IA escrever o roteiro de verdade — e, quando a pessoa
vem do atalho do Studio (que gerava sozinho sem mostrar tela nenhuma), o
produto **para antes de gastar** e mostra o aviso.

---

### #12 — 02:09 BRT — A tela mais movimentada da casa mostra a temporada a 3 de 131, e o meio era ilegível

#### O QUE EU FUI FAZER, E POR QUE MUDEI DE ROTA

Ia fechar o G9 (documentar o handoff para agentes numa página
`/developers/handoff`). Fui medir o alcance antes de construir, como manda a
memória `medir-alcance-da-superficie-antes-de-ligar`, e desisti **por número**:

- `app/llms.txt/route.ts` **já documenta** o canal GET `/make` inteiro desde
  06/09 — parâmetros, réguas, motores, prazo, e o que o link **não** faz. Um
  assistente que lê o llms.txt já sabe montar o link, que é mais fácil do que
  fazer um POST. O que faltava documentar (o POST) é o caminho **mais difícil**
  para o mesmo resultado.
- A `/chatgpt` tem **2 visitas na vida** (`chatgpt_page_viewed` = 2 pessoas). O
  `/go` tem `gpt_landing_viewed` = 17 eventos e **1 pessoa** — eu. Uma quarta
  página de documentação seria a quarta peça sem superfície da casa (memória
  `peca-sem-superficie-nao-existe`), e eu já escrevi essa memória três vezes.

Então gastei a rotação medindo onde as pessoas de facto estão, e achei um
buraco maior do que o G9.

#### O FUNIL, MEDIDO (7 dias, produção, 07/09 04:50 UTC)

**239 cadastros → 159 fizeram filme → 40 fizeram o 2º → 23 apertaram pagar → 1 pagou.**

Os **119** que fizeram exatamente UM filme, por saldo: **43** em zero, **39**
com 1-14cr (média 9,7 — dá para um Kineo 1 e não dá para um Seedance), **37**
com 15cr ou mais. Os **80** que nunca fizeram filme: **31** nunca tentaram com
os 25cr do trial intactos, **25** despacharam e não saiu linha em `videos`,
**24** nunca tentaram com saldo zero.

Fui atrás dos 25 esperando um defeito só e **não há**: são ~12 causas
diferentes, quase todas portões legítimos (trial acabado, cota grátis do dia,
roteiro curto demais). Só 2 pessoas em 7 dias viram "o fornecedor não aceitou"
e 2 viram `TypeError`. Não há alavanca grande ali, e digo isso em vez de
inventar uma.

#### UMA CORREÇÃO AO BRIEFING DESTE CICLO

O briefing diz que a coorte "instrução colada" tem **8,7% de 2º filme**. Medido
hoje, em 14 dias: quem colou uma ORDEM tem **40%** de 2º filme (8 de 20) contra
**20%** de todo o resto (40 de 200). Amostra pequena (n=20), mas o sinal é o
**oposto** do que estava escrito: essa gente é a mais engajada da casa, não a
que desiste. O aviso da #11 continua certo — um narrador lendo "NO narration"
em voz alta é defeito — mas ele não é a explicação dos 119.

#### O BURACO QUE ACHEI

Na tela de filme pronto, mesma tela, mesmo instante, 7 dias:

| evento | pessoas |
|---|---|
| `video_ready_viewed` (a tela) | **131** |
| `next_shorts_shown` (a prateleira irmã, renderizou) | **119** |
| `next_shorts_seen` (a irmã, rolaram até ela) | 34 |
| `season_written` (temporada gravada no servidor) | 30 |
| **`season_shown`** (a faixa da temporada, vista) | **3** |

A casa escreve cinco títulos de episódio para a pessoa e **3 de 131 chegam a
ver**. E o meio era **ilegível**: `season_written` não serve de denominador
porque é evento de **escrita** — quem já tem temporada gravada recebe a faixa e
não escreve nada. Foi por isso que a coorte de 2º filme mediu 9,5% e a de 1º
filme 25,8%: o **contrário** do que uma corrida explicaria. Testei a hipótese
de corrida, ela **falhou**, e não construí em cima dela.

Sem um evento de ENTREGA não dá para separar "a faixa não carregou" de "a faixa
carregou e ninguém rolou até ela" — e os dois pedem consertos opostos.

#### O QUE MUDOU (`components/video/SeasonStrip.tsx`)

1. **O `videoId` era descartado em 100% das chamadas.** A rota
   `app/api/season/route.ts:197` lê `req.nextUrl.searchParams.get('videoId')` e
   o arquivo **nunca chama `req.json()`** — e o cliente mandava o id **no
   corpo**. O POST caía sempre no ramo "último filme concluído". Quase sempre é
   o mesmo filme; quando não é, a temporada nasce sobre o filme errado — e como
   a rota grava uma vez por filme, o erro fica gravado. O id passou a viajar
   **também na query**, com o corpo intacto: a rota da outra pista funciona como
   foi desenhada **sem eu editar o arquivo dela**. PEDIDO aberto para ela passar
   a ler o corpo também.
2. **`season_served`** — a faixa recebeu temporada e renderizou.
   **`season_absent`** — a rota respondeu e não havia faixa, com `reason`
   (`http_not_ok` / `sem_temporada` / `zero_episodios` / `excecao`) e o status
   HTTP. Nenhum pixel mudou; a falha continua calada na tela, por desenho.

#### RISCO

Nenhum de produto: as duas mudanças são aditivas e toda emissão está dentro de
try/catch, então telemetria não derruba a tela de filme pronto. O risco real é
de **leitura**: se `season_absent` vier alto com `sem_temporada`, o problema é
servidor; se `season_served` vier perto de 119 e `season_shown` continuar em 3,
o problema é rolagem e o conserto é de posição, não de rota. É essa bifurcação
que a próxima rotação passa a conseguir ler — e ela não existia.

#### PRÓXIMO PASSO

Ler `season_served` contra `season_absent` com algumas horas de vida e dizer,
com número, qual dos dois consertos é o certo.

✅ **O QUE VOCÊ PRECISA FAZER**
1. **Nada.**

📋 **O QUE ACONTECEU**
A loja do ChatGPT continua fechada para conta pessoal, e eu parei de empurrar
páginas que ninguém visita: a `/chatgpt` tem 2 visitas na vida e o llms.txt já
documenta o caminho fácil. Fui medir onde as pessoas estão e achei coisa maior:
na tela em que 131 pessoas por semana veem o próprio filme, a casa escreve uma
temporada de cinco episódios e **3 pessoas chegam a ver**. Descobri também que
o id do filme que essa tela mostra era jogado fora em toda chamada ao servidor —
o cliente mandava num lugar, o servidor lia noutro. Consertei pelo meu lado,
sem tocar no arquivo da outra sessão, e instrumentei o buraco para a próxima
rotação saber se o conserto é de servidor ou de posição na página.

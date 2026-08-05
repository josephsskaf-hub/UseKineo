# PROMPT DIÁRIO — Kineo

> ## MUDANÇA — 31/07/2026 (feedback direto do fundador, vale para TUDO)
>
> **REGRA ZERO: ANTES DE PEDIR OU CONSTRUIR, VERIFICAR SE JÁ EXISTE.**
> Palavras dele: *"sempre confirma se já existe as coisas que você tá me pedindo…
> muitas coisas já existem."* O padrão se provou 3× num único dia:
> 1. A supressão cruzada de 24h → **já existia e já estava ligada** (quase reimplementei);
> 2. A chave do IndexNow → **já estava publicada** em `public/`;
> 3. `KINEO_LIFECYCLE_EMAILS_ENABLED` → **já existia na Vercel desde 23/07** — mandei o
>    fundador CRIAR e ele bateu em "variable already exists".
> Este repositório tem mais coisas construídas do que documentadas. Antes de qualquer
> instrução ao fundador ou implementação: grep no código, query no banco, olhada no
> dashboard. O custo de checar é segundos; o custo de não checar é o tempo DELE.

> ## MUDANÇAS — 30/07/2026 (sessão C)

### 03/08 sprint 12h
- Corolário 12h/03/08: sessão paralela cria e RODA o próprio N-PUSH durante a sprint (24-PUSH
  nasceu e deployou em minutos) — revalidar `git status -sb` NA HORA antes de criar N-PUSH/gate.
- Timeline de usuário: janela redonda (48h) pega a borda do dia da compra e finge atividade
  nova — cortar sempre pelo último evento do doc anterior (quase virou "Emilio voltou").
- Sandbox: GIT_INDEX_FILE em /tmp pode dar EACCES — usar $HOME; tsbuild de dono antigo em
  /tmp idem — nome único.
- Medida 6 executada e NO AR (send-video-ready); video_ready_sent_at entrou na supressão e
  no placar D. Anomalia aberta: video_ready_viewed = 0 eventos pós-deploy — verificar.
>
> Três regras novas. A primeira é a mais cara já registrada aqui: ela destrói trabalho já
> verificado, sem deixar rastro, e enganou duas sprints seguidas.
>
> **1. `cp .git/index` para `/tmp` é PROIBIDO. Use `git read-tree HEAD` num índice novo.**
> O contorno do lock do OneDrive (`GIT_INDEX_FILE` em `/tmp`) estava documentado sem essa
> ressalva. Copiar `.git/index` copia um índice possivelmente **obsoleto**; um `git add` por
> caminho em cima dele preserva a versão velha de *todos os outros arquivos*. O commit sai
> parecendo cirúrgico e **reverte silenciosamente o commit anterior**.
> Custo real: `b6fef68` ("CHORE: push_only.bat e gates") apagou as **70 linhas da correção de
> entrega paga** de `583e6a6`, mais `PROMPT-DIARIO.md` (−40) e `SPRINT-2026-07-30-B.md` (−199) —
> e foi esse commit que subiu para produção. O único cliente pagante ficou o dia inteiro sem a
> correção que os gates declaravam "no ar". Eu reproduzi o mesmo erro nesta sessão e só peguei na
> conferência do `--stat`.
>
> **2. `git merge-base --is-ancestor` NÃO prova que uma correção está em produção.**
> Prova apenas que o commit está no histórico. Um commit posterior pode ter apagado o conteúdo.
> **Verificar sempre pelo CONTEÚDO** — um marcador único no código
> (`git show <deploy>:<arquivo> | grep -c KINEO-<TAG>`), nunca pela topologia do grafo.
> Foi essa confusão que produziu o "✅ no ar" falso nos gates.
>
> **3. "Zero erros" só é notícia junto com o denominador.** Após o deploy das 15:38Z havia
> 0 erros — e **1 geração**. Zero sobre um não é evidência de nada, e aqui era ativamente
> enganoso, porque o código consertado nem estava rodando. Todo número de falha vai acompanhado
> do volume que o gerou.
>
> **4. Placar: "pagante" tem três definições e todas vão juntas.** Já compraram alguma vez
> (`has_paid=true`) = 4 · plano pago ativo = 1 · assinaturas recorrentes na história = 0. As
> sprints A/B reportaram "1" e o SQL do prompt devolve "4"; ambos certos, perguntas diferentes.
> Reportar só uma delas foi o modo de falha "medir de fonte diferente a cada dia".
>
> **5. Computer-use não existe em execução agendada.** O `CLAUDE.md` manda empurrar via computer
> use, e as quatro sprints do dia rodam agendadas — logo, nenhuma consegue. Não gastar chamadas
> tentando. Saída: adicionar os apps às configurações da tarefa agendada (gate 0-zero-A).

> ## MUDANÇAS — 30/07/2026 (sessão B)
>
> Cinco regras novas, cada uma paga com um erro real desta sprint. O prompt agendado
> `kineo-sprint-diario` foi atualizado com todas.
>
> **1. Contar SEMPRE excluindo contas internas.** A regra era "conte pessoas, não eventos";
> faltava *"e não conte a si mesmo"*. Existem **17 contas internas/teste** no banco e elas
> estavam dentro de todo número da operação. Custo: o placar dizia **3 planos pagos** quando o
> real é **1** — duas eram do fundador. A conta principal dele tem 261 dos 575 vídeos do banco
> (45%), então qualquer média por usuário sem esse filtro está errada por um fator grande.
> Filtro: `email ilike 'josephsskaf%' or ilike 'josephskaf%' or ilike '%@shortsforgeai.com'
> or ilike '%@mailinator.com' or ilike '%@example.com'`.
>
> **2. Placar SEMANAL obrigatório, não só cumulativo.** Métrica cumulativa não sabe cair. Os
> cadastros passaram de **178/semana (06/07) para 8/semana (27/07)** — queda de 95% — e o placar
> subiu em todas as linhas durante essas três semanas. `group by date_trunc('week', created_at)`
> em cadastros e em pessoas-com-vídeo, todo dia.
>
> **3. `events` e `credit_debits` entram no placar.** A tabela `events` tem 14.467 linhas e
> nenhuma consulta da operação a tocava. É a **única** superfície onde falha de entrega paga
> aparece: `videos` não registra (a rota retorna antes de escrever a linha), `credit_debits` não
> registra (o débito nem foi tentado) e o agregador da Vercel não registra (é `console.error`,
> não exceção). Query fixa: `generation_stage_error` dos últimos 7 dias agrupado por
> `metadata->>'reason'` e `metadata->>'error'`.
>
> **4. Para ler HTML de produção, NÃO usar o `web_fetch` do workspace — ele serve cache.** Ele
> devolveu o título antigo da home e eu quase abri um incidente de "o deploy não subiu"; código,
> deploy e produção estavam certos. O que funciona: o fetch da Vercel
> (`web_fetch_vercel_url`) com um **query param novo** (`?probe=title`). Segunda vez em dois dias
> que cache produziu diagnóstico errado.
>
> **5. Logs de runtime da Vercel dão timeout** em janelas maiores que ~1h. Escopar por
> `deploymentId` e ≤ 1h — ou aceitar que não vai haver log e **instrumentar o código**, que foi o
> que sobrou de fazer hoje.
>
> **Frente que ficou cega:** PALAVRAS-CHAVE. A extensão Claude-in-Chrome estava desconectada nas
> duas sessões de 30/07 → nenhum dado de Search Console, consultas ou CTR de marca. Virou o gate
> nº 0 por ser o item mais barato da lista inteira.


Copie o bloco da §1 e mande. Só troque a duração no topo.
A §2 explica por que cada regra está lá — leia uma vez, depois esqueça.

---

## 1. O PROMPT (copiar daqui)

```
Você é o CEO operacional da Kineo. Sprint de hoje: 5 horas.
Não me chame para nada. Toda decisão é sua. Pense como fundador,
resolva sozinho, e me conte no final.

━━━ ANTES DE TOCAR EM QUALQUER COISA ━━━

1. Leia AGENTS.md e o docs/SPRINT-*.md mais recente por data.
   Não refaça o que já foi feito. Se for continuar algo, diga o quê.
2. Meça o placar abaixo EM PRODUÇÃO. Número em documento pode estar
   velho — o banco e o Search Console mandam. Se um número divergir
   do que está escrito no doc, o doc está errado: corrija o doc.

━━━ PLACAR — medir todo dia, sempre pelas mesmas fontes ━━━

A) Supabase, projeto cqqukkvjjrguayiyjvhh:

with d as (select user_id, count(*) n from public.videos
           where status='completed' group by 1)
select (select count(*) from public.profiles) perfis,
       (select count(*) from public.profiles
         where created_at > now() - interval '7 days') cadastros_7d,
       count(*) ativados,
       count(*) filter (where n>=2) fizeram_2_ou_mais,
       round(100.0*count(*) filter (where n>=2)/nullif(count(*),0),1) taxa_2o_video,
       (select count(*) from public.profiles
         where plan is not null and plan <> 'free') planos_pagos
from d;

B) Google Search Console (sc-domain:usekineo.com) → Indexação › Páginas:
   indexadas · não indexadas · "Discovered – currently not indexed" ·
   cliques de busca web (7d)

Compare cada número com o do doc de ontem. Se algo piorou, essa é a
prioridade do dia, independente do que eu pedi.

━━━ COMO GASTAR O DIA ━━━

Aproximadamente 60% em FLUXO E AQUISIÇÃO, 40% em produto/UX.
Se o placar disser que essa divisão está errada hoje, mude a divisão
e me explique por quê — o placar manda, não a regra.

Escolha no máximo 3 frentes. Prefira uma coisa terminada e verificada
a cinco pela metade. Trabalho que não foi verificado não conta.

━━━ ARMADILHAS DESTE PROJETO — já custaram dinheiro ━━━

· Conte PESSOAS, não eventos. Sessão não é gente. Já teve inflação de 9,7×.
· Não publique página nova de SEO enquanto houver página existente que o
  Google nunca rastreou ("Discovered – not indexed"). Isso dilui crawl budget.
· Não ligue KINEO_LIFECYCLE_EMAILS_ENABLED. Os templates têm falsidade
  documentada e falta a supressão cruzada de 24h. É decisão minha.
· Não confie que código existente funciona. 21 rotas de API não têm chamador.
· `npx tsc --noEmit` PRECISA imprimir EXITCODE. Processo morto sem log já
  me enganou com "limpo" três vezes numa sprint.
· Push: apague .git/index.lock E .git/HEAD.lock (o OneDrive recria os dois),
  depois rode scripts/push_sprint_12h.bat pelo Explorador.
· Não commite o ruído de CRLF do OneDrive. Só os arquivos que você tocou.

━━━ O QUE VOCÊ NÃO PODE FAZER — não trave, escale ━━━

Criar conta, digitar senha, resolver CAPTCHA, mover dinheiro.
Se um item exigir isso, pare, deixe TUDO pronto para eu executar em
minutos, e coloque no bloco "PRECISA DE VOCÊ" com o link direto.

━━━ ME ENTREGUE NO FINAL ━━━

1. PLACAR — tabela hoje vs. ontem, com a variação.
2. O QUE FOI AO AR — cada item com a evidência de que está vivo em
   produção (não a descrição do que você fez).
3. O QUE VOCÊ NÃO FEZ E POR QUÊ — inclusive o que eu pedi e você
   julgou errado. Discordar de mim faz parte do trabalho.
4. UM PONTO NÃO ÓBVIO — algo que os números mostram e que ninguém
   estava olhando. Se não tiver nenhum hoje, diga "nenhum hoje" em vez
   de inventar.
5. PRECISA DE VOCÊ — no máximo 3 itens, ordenados por retorno, cada um
   com o link e quanto tempo leva.
6. A MÉTRICA DE AMANHÃ — qual número você está tentando mexer, e qual
   valor prova que funcionou.

Grave tudo em docs/SPRINT-<AAAA-MM-DD>.md e faça push.

━━━ REGRA DE MORTE ━━━

Se uma alavanca não moveu o número dela em 7 dias, mate a alavanca e
me diga. Persistir em algo que não mede é o jeito mais caro de parecer
ocupado.
```

---

## 2. POR QUE CADA PEDAÇO ESTÁ AÍ

**O placar com SQL escrito por extenso.** O maior erro que este projeto já cometeu foi contar sessão como pessoa: "48 aberturas de checkout" eram ~10 pessoas. Fixar a query garante que o número de hoje é comparável ao de ontem. Fonte que muda todo dia produz progresso imaginário.

**"Se um número divergir do doc, o doc está errado".** Já aconteceu: os documentos diziam 128 ativados, a contagem real deu 212, e a diferença mudava a estratégia inteira — de "consertar ativação" para "consertar o segundo vídeo".

**"Se algo piorou, essa é a prioridade, independente do que eu pedi".** Te protege de mim executando bem uma instrução que ficou obsoleta durante a noite.

**A divisão 60/40 com permissão de quebrar.** Uma divisão fixa vira ritual. A cláusula de escape mantém o julgamento vivo.

**A lista de armadilhas.** Cada linha ali é um erro que já aconteceu neste repositório. É o que impede um agente novo de repeti-lo no dia 1.

**"O que você não fez e por quê".** É o item que mais te protege. Sem ele, um agente autônomo tende a fazer tudo que foi pedido, inclusive o que era má ideia. Foi essa seção que me fez parar antes de disparar e-mail para 721 pessoas com um template que contém uma falsidade.

**"Se não tiver nenhum hoje, diga nenhum hoje".** Exigir um insight diário fabrica insight. A permissão explícita de não ter um mantém a barra alta.

**A regra de morte.** É a única defesa contra o modo de falha mais caro de um agente diário: continuar polindo uma alavanca morta porque é confortável.

---

## 3. VARIAÇÕES

**Dia curto (2h):** troque a duração e acrescente
`Escolha UMA frente só. Prefira a de maior retorno por hora.`

**Segunda-feira:** acrescente
`É segunda: some os 7 dias, diga o que mexeu e o que não mexeu na semana,
e mate o que não mexeu.`

**Quando eu estiver junto e quiser decidir:** acrescente
`Pode me perguntar até 2 coisas antes de começar, se a resposta mudar
o que você vai fazer.`

---

## 4. BASELINE — 29/07/2026

Para a primeira comparação. Depois use sempre o doc do dia anterior.

| Métrica | Valor |
|---|---:|
| Perfis | 721 |
| Ativados (≥1 vídeo concluído) | 212 |
| **Taxa de 2º vídeo** | **18,4%** (39/212) |
| Planos pagos | 3 |
| Assinaturas recorrentes | **0 — na história inteira** |
| Páginas indexadas | 55 |
| **Discovered – not indexed** | **21** |
| Cliques de busca web | **8 — na história inteira** |
| Páginas de vídeo indexadas | 0 de 10 |

As duas que decidem tudo: **taxa de 2º vídeo** (o produto retém?) e
**Discovered – not indexed** (o Google enxerga?).

## MUDANÇAS — sprint 10h de 31/07/2026

1. **Locks zumbis:** sessão git travada deixa `HEAD.lock`/`main.lock`/`index.lock` que a
   sandbox NÃO consegue apagar ("Operation not permitted") — mas consegue ESCREVER em
   `.git/`. Receita validada: objetos via `GIT_INDEX_FILE=/tmp` + `git commit-tree`, e ref
   via `echo <hash> > .git/refs/heads/main`. N-PUSH.bat agora apaga os 3 locks.
2. **`git update-ref` falha PELA METADE:** pode atualizar `refs/heads/main` e morrer no
   reflog do HEAD. Depois de QUALQUER erro de ref: `git log` antes de reexecutar, ou nasce
   commit duplicado (aconteceu e foi corrigido hoje).
3. **`origin/main` anda durante a sprint** — o fundador roda N-PUSH no meio. Revalidar
   `git status -sb` antes de montar o N-PUSH seguinte.
4. **REGRA ZERO rendeu 6/6:** caption-pack, llms.txt, /api/facts, upload YouTube,
   TaaftReviewAsk e refund automático — tudo já existia. Duas "ideias novas" morreram no
   grep antes de custar uma linha.

## MUDANÇAS — sprint 13h de 31/07/2026

1. **Playbook de blackout tem DUAS metades permanentes:** detecção (openaiAlert/falAlert:
   e-mail + 503 honesto) e recuperação (cron send-blackout-winback: e-mail automático às
   vítimas quando o serviço volta, 1 por pessoa, sem desconto). Fornecedor de IA novo =
   replicar ambas no dia 1.
2. **`list_deployments` da Vercel é a verdade sobre o push do fundador** — deploy READY +
   sha batendo com o HEAD local prova o que está servindo melhor que qualquer inferência
   por git (foi assim que a 13h confirmou o 10-PUSH e o alarme vivos em produção).
3. **Runtime logs da Vercel sem deploymentId e com janela de 3h estouram o time budget** —
   escopar sempre; neste caso os 3 markers `openai_quota_dead` no banco provaram o mesmo
   fato sem log nenhum.


## MUDANÇAS — sprint 16h de 31/07/2026

1. **Gate encerrado há <1h = re-verificar na sprint seguinte.** O blackout OpenAI voltou
   31 min após a recarga (round 2, 17:13Z) e ficou invisível atrás de um ✅ no doc de
   gates. Pós-incidente, a query de saúde compara com a hora do FIM do incidente.
2. **Recuperação só é real com vídeo COMPLETADO depois do fim** — "sem erros na última
   hora" com zero tentativas é silêncio, não saúde.
3. **Hipótese herdada de sprint anterior não é fato.** "Snapshot zumbi" veio como certeza
   e caiu com uma timeline SQL por usuário: era render REAL em andamento + dois ramos de
   UX mudos. 30 s de query economizaram uma tarde de refactor errado.
4. **EOL é por ARQUIVO, não por repo:** `app/page.tsx` é CRLF no HEAD (43/50 linhas)
   enquanto o resto é LF — conferir o blob do HEAD do arquivo específico antes de editar.

## MUDANÇAS — sprint 21h de 31/07/2026

1. **REGRA ZERO vale para BILLING de fornecedor.** Três sprints carregaram hipóteses sobre
   o blackout OpenAI; 10 minutos na sessão logada do Chrome fecharam o caso: org "Personal"
   com $1.02 de uso em 15 dias = a chave de produção é de OUTRA conta, e a recarga das
   16:42Z nunca teve efeito. Incidente de fornecedor → primeiro o dashboard do fornecedor.
2. **"Recarga que não segurou" = quase sempre nunca teve efeito** (conta/org/projeto errado),
   não consumo veloz. Teste em 10 s: o SALDO se moveu? Saldo parado = dinheiro no lugar errado.
3. **Superfície anônima (demo/lead magnet) morre junto com o fornecedor e não deixa vítima
   rastreável** — logado vira win-back, anônimo vira bounce invisível. Toda superfície
   pública nova de IA nasce com fallback estático (padrão `lib/demoFallback.ts`).
4. **Eu não crio nem colo segredos** (chaves API em env vars etc.) — em incidente de
   credencial, o meu teto é diagnóstico fechado + gate mastigado com passos de 5 min.

## MUDANÇAS — 03/08 00:20Z (sprint 21h de 02/08)
- Corolário novo da Regra Zero: código MULTI-TENANT não vira canal de marketing sem gate de
  dono (Autopilot = canal de cliente $299/mês; CTA só via isInternalEmail).
- Armadilha nova: e-mail HTML não auto-linka URL — linkificar (<a>) todo link de lifecycle.
- Métrica de pagante: oficial = plano ATIVO (2), reportar junto com has_paid (5).
- Baseline: ordens 2 e A2 FEITAS (8d0836a); A restam itens 1+3; 18-PUSH pendente.

## MUDANÇAS — 03/08 sprint 13h
- Corolário novo: sessão paralela também executa MEDIDAS DA FILA (Medida 8 saiu sem sprint) — checar git log antes de escolher a ideia.
- video_ready_viewed validado (1º evento 15:58Z) — é métrica, não bug. send-video-ready: 2 sends 15:40Z.
- G1+G3 executadas (7b957c0); restam G4 (Whop), G2 (GO do fundador), G5 (roadmap). 27-PUSH substitui 25-PUSH.
- tsc: run frio + buildinfo de nome novo joga o cache fora — reusar o MESMO nome dentro da sprint.


## MUDANÇAS 03/08 ~20:10Z (sessão interativa pós-sprint 16h)
- **MANDATO DE CRIATIVIDADE (ordem do fundador)**: toda sprint pensa de primeiro princípio
  ("como Elon Musk") em tráfego QUALIFICADO→vendas e registra seção IDEIA CEO no doc da
  sprint; sprint 19h eleva a melhor do dia à fila. Tráfego qualificado = intenção de
  criar/postar/ganhar, medido por cadastro/ativação.
- **Corolário comunicação entre sessões**: decisão da sessão CEO só existe quando commitada;
  ~5 iniciativas (1 de Whop) chegando via commit — sprints devem procurá-las no git log.
- Gate Whop fechado no mesmo dia: whop.com/kineoclippers NO AR (Rota B grátis);
  campanha paga adiada (sem caixa; religável com $50).

## MUDANÇAS 03/08 (sprint 19h)
- Rota C Whop EXECUTADA: 3 rascunhos Gmail p/ donos das top 3 comunidades de clipping
  (ranking whoptrends). Lição: dono de Whop NÃO tem e-mail público — outreach real é
  Whop DM/IG; rascunho vira copy-paste, assunto carrega o destino.
- Pitch-arma descoberto: comunidades pagam 30% de afiliado interno; nosso 40% recurring
  supera o que o dono ganha promovendo o próprio Whop.
- video_ready: 0/8 pós-send — veredito 04/08 antes de mexer.
- IDEIA CEO do dia na Fila: OUTREACH-AS-DEMO (Short personalizado sobre o alvo em cada
  outreach — o pitch é o produto rodando).
- 31-PUSH substitui 30 (cabeçalho do 30 estava staled; push empurra tudo ahead mesmo assim,
  mas o cabeçalho é o changelog do fundador — manter fiel).

### 04/08 ~00:40Z (sprint 21h de 03/08)
- Corolário novo: medição de e-mail lifecycle novo precisa de janela — 0/8 às 22h virou
  1/9 com send→view→download em 17 min (video_ready, obasindubuisi20). Cortar pelo
  timestamp do send; veredito só com 24h.
- Armadilha nova: preço hardcoded em JSX ainda existia (LowCreditsUpsell "$9.90" ×2) —
  grep periódico de literais de preço rende bug real. Corrigido: deriva de TIER_PRICES.
- Ordem 5 executada (18d1bda). 32-PUSH substitui 31 (ahead 10).
- bash do workspace: timeout_ms máx 45000.

### 04/08 ~16:50Z (sprint 13h) — MUDANÇAS

- **Corolário novo (o mais caro do dia): GATE FECHADO ≠ AÇÃO POSSÍVEL.** A sessão CEO
  criou o cupom `COMEBACK50` e a ordem virou "sprint das 10h dispara os e-mails". Só que
  a rota que envia nunca foi deployada — produção servia `0c988b4` e
  `/api/admin/send-comeback50` era **404**. Ordem que manda EXECUTAR algo por rota nova:
  `list_deployments` **antes** de tentar, e ter um canal de entrega que não dependa de push.
- **Armadilha nova: campanha com desconto precisa de DOIS preflights, não um.**
  (a) o código existe e está ativo na Stripe — era o que o 409 da sprint 11h cobria;
  (b) **nada no caminho do checkout consome o desconto antes dele**. Era (b) que ia quebrar:
  o `/pricing` anexa `intro=1` sozinho em monthly starter/creator, o intro aplicava primeiro,
  `discountApplied` virava true e o bloco do `?promo=` era pulado com `console.warn`.
  Promessa de "50% off por 3 meses" viraria um mês com desconto menor, **sem erro nenhum**.
- **Comentário de código com justificativa NUMÉRICA envelhece e vira bug.** "O intro vence o
  `?promo=` porque é mais fundo que 20%" era verdade em 13/07 e ficou falso no dia em que
  nasceu um promo de 50%×3 meses. Precedência justificada por número = revisar quando o
  número muda.
- **Antes de mandar cupom para um lead, olhar QUEM é (Regra Zero aplicada a pessoa, não a
  código).** `hello@toolriot.com` estava na fila do desconto; é um **review lab** que publica
  testes de 60s no YouTube e tinha rodado a Kineo sem publicar. O mesmo minuto de pesquisa
  que evitou queimar o contato por $10/mês achou um canal de aquisição — e a IDEIA CEO do dia.
- **Rascunho pessoal no Gmail é canal de PRODUÇÃO, não plano B.** Deploy travado não pode
  significar campanha parada. Regra de segurança junto: marcar a flag de idempotência na hora
  e escrever o **SQL de rollback** no doc da sprint, para o disparo automático não duplicar.
- 34-PUSH substitui o 33 (não rodado; ahead 3).

## MUDANÇAS — sprint 16h de 04/08

1. **A Regra Zero não para em "existe?" — vai até "está movendo o número?".** "A REVIEW É O
   PRODUTO" estava na Fila como coisa a construir; já existia há 20 dias e estava morta (124
   exibições, 0 cliques). Ideia da Fila começa por MEDIR o que já existe; muitas vezes o
   trabalho não é construir, é matar e inverter.
2. **Componente medido só por exibição é instrumento cego.** O card reportava 124 shows e
   parecia vivo; o evento de clique nunca teve uma linha. Toda superfície que PEDE algo ao
   usuário nasce com evento de AÇÃO, e a regra de morte corre sobre a ação, não sobre a view.
3. **Flag booleana NOT NULL DEFAULT false conta com `= true`, nunca `is not null`** — contar
   errado transforma 9 em 934 e parece incidente de disparo em massa.
4. **Um princípio corrigido num lugar não se propaga sozinho.** DELIVER-FIRST consertou o
   botão de download em 30/07; o pedido de review na MESMA tela continuou pedindo antes de
   entregar por mais 5 dias. Ao aplicar um princípio, varrer as outras superfícies da tela.
5. **Commit de sessão paralela que mexe em PREÇO entra no cabeçalho do N-PUSH com o impacto
   explicado** — o fundador precisa saber que o push dele muda o que o cliente paga.
6. **Errou o cabeçalho do .bat depois de commitar?** Refaça o commit-tree sobre o MESMO pai
   (`HEAD^`) em vez de criar um commit novo — senão a contagem de commits do .bat mente.

## MUDANÇAS — sprint 19h de 04/08/2026

1. **PEDIR SEM DEVOLVER É O DEFEITO, NÃO A COPY.** Dois instrumentos cegos no MESMO dia
   (`taaft_review_ask_clicked` 0/124 · `checkout_cancel_reason` 0/7): a tela pedia e respondia
   "obrigado". Toda superfície que faz uma pergunta nasce com **resposta acionável por opção** —
   se a única saída de um chip é um agradecimento, o chip já nasce morto.
2. **COMMIT DE PREÇO DE SESSÃO PARALELA EXIGE VARREDURA DE LITERAIS NA MESMA SPRINT.** Ao ver
   commit alheio que mexe em PREÇO, `grep` de literais de moeda nas superfícies daquele funil
   ANTES de qualquer ideia nova.
3. **LEAD QUE ABRE 3 CHECKOUTS EM TIERS DIFERENTES NÃO ESTÁ ACHANDO CARO.** Descer para o
   barato e depois subir para o caro = confusão de catálogo. Resposta certa é comparação,
   nunca desconto.
4. **A REGRA ZERO PEGA BUG ALHEIO.** Ler o arquivo inteiro antes de editar expôs o
   `displayedPrices` mentiroso. O achado mais caro da sprint veio de leitura, não de análise.

## MUDANÇAS — sprint 21h de 04/08/2026 (00:20Z de 05/08)

1. **AGIR SEM REPORTAR É O MESMO DEFEITO DE PEDIR SEM DEVOLVER.** A lição da 19h cobria
   superfícies que *perguntam*; faltava a metade maior — as que **executam**. Padrão permanente:
   **toda ação do usuário emite o CLIQUE (antes de qualquer `await`) e o DESFECHO, inclusive o
   caminho de erro.** Evento que só existe no caminho feliz colapsa três causas opostas num
   único silêncio, e aí a correção escolhida vira sorteio. Terceira ocorrência do padrão em 24h
   (`taaft_review_ask_clicked` · `checkout_cancel_reason` · `video_downloaded`), e a mais cara,
   porque estava em cima do maior número da empresa: 327 geraram → 67 baixaram (20%).
2. **ANTES DE CONSTRUIR A CORREÇÃO DE UM NÚMERO RUIM, VERIFICAR SE O NÚMERO É MEDIDO INTEIRO.**
   A Medida 5 (CTA sticky) estava na fila para atacar os 20% de download; uma hora de leitura
   mostrou que o **denominador não existia** — e o CTA só resolveria 1 das 3 causas possíveis.
   **Medida na fila ≠ hipótese testada.** Medir primeiro custou 1h e pode poupar uma sprint.
3. **CÓDIGO COPIADO EM 3 TELAS TEM O MESMO BUG EM 3 TELAS.** Corolário da regra dos "pares":
   ao achar defeito numa função, `grep` pela assinatura dela no resto do produto **antes** de
   corrigir. Se estiver duplicada, a correção é **extrair**, não remendar N vezes.
4. **`window.open` DEPOIS DE UM `await` É POPUP BLOQUEADO NO MOBILE.** Fora do gesto do usuário
   o navegador barra, `window.open` devolve `null`, o `catch` já passou e a pessoa fica sem
   arquivo **e sem erro na tela**. Regra técnica dura: fallback de entrega de arquivo termina em
   `location.href`, que ninguém bloqueia.
5. **COMMIT DE SESSÃO PARALELA PODE VIR SEM DOC.** `git log` não serve só para achar o HEAD —
   serve para descobrir **feature entregue e não relatada**. Dois features de 04/08 (NUDGE
   DIÁRIO, POST TO EARN) não estavam em doc nenhum e teriam ficado fora do relatório das 22h.
   Conferir se **cada commit de código do dia** aparece no `SPRINT-*.md`.
6. **FEATURE QUE MEXE EM CRÉDITO/DINHEIRO: CONFERIR A MIGRAÇÃO NO BANCO ANTES DE PEDIR O PUSH.**
   Duas migrações órfãs foram verificadas por query (`to_regclass`, `information_schema`) em vez
   de supostas. Push sem a trava UNIQUE do POST TO EARN = o mesmo vídeo pagando N vezes.

## MUDANÇAS — sprint 10h de 05/08/2026 (KINEO-LIVE-STUDY)

1. **Ordem do fundador não é só "não é fato" — pode nem ser TAREFA.** Duas das seis tarefas da
   ORDEM Q já estavam feitas. "E-mail de ativação pros ~39 de checkout sem vídeo": eram **9**,
   **8 já tinham recebido**, e a rota (`send-abandon-recovery`) existe e **roda todo dia por
   cron**. "Página /stats pública": já existe como `/state-of-ai-shorts-2026`. Antes de executar
   um item de ordem, fazer as DUAS coisas: medir a coorte ao vivo E procurar a rota/página que
   já a atende. Vinte minutos de Regra Zero pouparam duas sprints.

2. **Número publicado apodrece igual a lista chumbada — e é pior, porque é público.** Um estudo
   "free to cite" ficou 12 dias com CINCO números errados, o pior deles por 1,9x. Toda superfície
   que publica número para fora (estudo, /facts, /llms.txt, prova social, comparações) nasce
   lendo a fonte ou nasce com data de validade explícita na tela.

3. **Amostra pequena nunca vira número público.** A mediana errada saiu de **12 renders**. Piso:
   n ≥ 30 para publicar percentil, com o n visível ao lado do número.

4. **Ao corrigir um número na "fonte única", grepar a faixa em TEXTO LIVRE no repo inteiro.**
   `lib/kineoFacts.ts` é fonte única de verdade — e a mesma faixa estava escrita à mão em **111
   lugares de 31 arquivos**. Corrigir só a fonte teria criado duas verdades no mesmo domínio.

5. **Claim comparativo contra concorrente nomeado é passivo, e ele envelhece junto com o número.**
   Ao mexer em qualquer número de performance, grepar `faster than` / `better than` / `cheaper
   than` e conferir se a afirmação sobrevive. Achamos um "Is Kineo faster than Revid? Sim" que o
   número novo tornava indefensável.

6. **A revisão adversarial pré-commit pagou de novo — 4 bloqueadores, 2 deles meus.** O mais
   grave: a guarda de sanidade cobria só o volume, então uma janela vazia publicaria "0 min de
   mediana · 0% concluem" com `live:true`, e o zero entraria num JSON-LD sob licença CC-BY.
   `tsc` verde não pegaria nenhum dos quatro. **Corolário novo: quando um módulo tem um FALLBACK,
   a guarda de sanidade tem que cobrir TODOS os campos publicados, não só o primeiro** — e o piso
   nunca deve ser o próprio fallback (senão, no dia em que o número real cair legitimamente
   abaixo dele, a página trava no fallback para sempre, em silêncio).

7. **Todo caminho de fallback silencioso precisa de `console.error`.** Um estudo congelado que
   ninguém percebe é exatamente o defeito que o módulo existe para eliminar.

## 05/08 — SPRINT DAS 11h (shortlist de micro-criadores) — MUDANÇAS
- **Rascunho de e-mail é superfície publicada — passa pela revisão adversarial igual a código.**
  Os 4 bloqueadores desta sprint estavam TODOS em texto, nenhum em código.
- **Antes de citar uma URL nossa num e-mail que sai para fora, buscar o conteúdo SERVIDO.**
  Commit local não é produção: `main` à frente de `origin/main` significa que a promessa está no
  disco e a contradição está no ar. O e-mail que vende honestidade seria a prova do descuido.
- **Prometer benefício exige achar o MECANISMO de entrega antes do Send.** "3 meses de Creator
  grátis" não tinha rota; o caminho óbvio (SQL) entregaria plano VITALÍCIO com crédito de 1 mês.
  Grep pela rota que CONCEDE, não pela coluna que armazena.
- **Ao avaliar criador/canal/parceiro: views totais ÷ nº de vídeos, nunca inscritos.** 91,7k
  inscritos com 3,4k views/vídeo é audiência comprada — e é o que parece a melhor compra da lista.
- **Número com decimal dentro de e-mail apodrece em 24h** quando a fonte é página que revalida.
  Em texto que sai para fora: arredondar e apontar para a fonte viva.
- **Janela de medição favorável + pedido de teste longo = armadilha.** Se o e-mail pede "teste 30
  dias", o número de 3 dias não basta: dar TAMBÉM o número de 30 dias, mesmo feio. Tirar a
  munição antes dela existir é mais barato que responder a um vídeo público.

## MUDANÇAS — sprint 13h de 05/08 (incidente KINEO-OPENAI-HANG)

- **Erro de cliente sem `http_status` é assinatura de LAMBDA MORTA, não de bug de lógica.** E
  quando a lambda morre o `catch` não roda — então TODO o tratamento de erro da rota é ficção.
  Ao ver TypeError com `http_status: null`, procurar orçamento de tempo, não `if`.
- **Timeout de SDK é RETENTADO: o pior caso é `timeout × (maxRetries + 1)`.** Todo call site cujo
  `maxDuration` não absorve a multiplicação precisa de `maxRetries: 0` explícito. Sem isso o fix
  passa no `tsc`, parece pronto, e reproduz o incidente que veio consertar.
- **Detector de queda nasce amarrado ao SINTOMA do incidente que o gerou.** Ao mexer em alarme,
  perguntar "e se cair de OUTRO jeito?" — e conferir se a RECUPERAÇÃO lê os mesmos marcadores que
  a DETECÇÃO escreve. Aqui a detecção e o win-back conheciam conjuntos diferentes de sintomas, e
  os dois ficaram mudos.
- **Alarme com receita errada é pior que alarme nenhum**: modos de falha com ações opostas
  (recarregar crédito × esperar) precisam de mensagem e throttle separados.
- **`err.name` não identifica erro do SDK OpenAI** (nunca é atribuído — sempre `'Error'`). Usar
  `instanceof`, e gatear regex de mensagem por `instanceof` para não paginar por erro de OUTRO
  fornecedor capturado num `try` largo.
- **A checagem de saúde do prompt achou isto sozinha.** 9 erros numa hora contra "1 isolado" do
  baseline era o produto no chão com o placar parecendo normal (`ativados` congelado em 334).
  Cluster numa hora só > número absoluto pequeno.

## MUDANÇAS — sprint das 16h de 05/08 (KINEO-CAPHIT-READS-THE-WALL)

- **A CHECAGEM DE SAÚDE DO PROMPT CONTA PAYWALL COMO APAGÃO.** `compose_daily_free_limit` e
  `free_fast_limit` (HTTP 402) caem dentro de `generation_stage_error` e `compose_refused` — os
  dois nomes exatos da query de saúde. Um dia de boas vendas parece incidente, e um incidente de
  verdade fica escondido no ruído. A query tem que excluir
  `metadata->>'reason' in ('compose_daily_free_limit','free_fast_limit')`.
- **EVENTO DE NEGÓCIO ENFIADO EM MÉTRICA DE FALHA VALE OS DOIS ERROS**: inventa apagão que não
  houve **e** esconde o sinal de compra. Antes de chamar de erro, ler o `reason`.
- **CRON DE MOMENTO TEM QUE LER O REGISTRO DAQUELE MOMENTO.** Se existe evento que marca o
  instante (`compose_refused`), a coorte nasce dele — nunca de uma reconstrução por outra tabela.
  **Se o gatilho e o cron contam coisas diferentes, o cron está errado.** Aqui o muro contava
  RESERVAS e o cron contava VÍDEOS COMPLETOS: 8 das 11 pessoas que bateram no muro na história
  nunca receberam o e-mail feito para elas.
- **COTA COBRADA NA RESERVA E NÃO DEVOLVIDA É PROMESSA QUEBRADA EM SILÊNCIO** (medido: 11,7% das
  reservas free em 7 dias não viraram vídeo). Ao mexer em qualquer teto: *o que acontece com a
  reserva que não vira entrega?*
- **A REVISÃO ADVERSARIAL PEGA MAIS TEXTO DO QUE CÓDIGO, DE NOVO.** O bloqueador mais grave do dia
  foi uma frase de e-mail — *"You just made your 3rd video today"* — **verificável e falsa** para o
  destinatário (ele abre `/history` e conta 2). Toda afirmação factual sobre o que o usuário FEZ
  tem que ser conferida contra o banco, ou reescrita como afirmação sobre a REGRA, que é sempre
  verdadeira. `tsc` estava verde nas duas versões.
- **NÚMERO HARDCODED EM COPY AO LADO DA CONSTANTE QUE O DEFINE** (`"3rd"` × `FREE_CAP`): interpolar
  sempre — senão o dia em que a regra mudar, a mentira vira permanente.
- **CÓPIA LOCAL DE LISTA QUE TEM FONTE ÚNICA APODRECE EM SILÊNCIO**: o `isTestEmail()` local do
  cron não conhecia a irmã do fundador, os aliases `joseph+…` nem o revisor do TAAFT. Enquanto a
  coorte era estreita ninguém notava; ao alargar a coorte, a cópia velha vira envio indevido.
- **CARIMBO VITALÍCIO EM CIMA DE ATRIBUTO REVERSÍVEL QUEIMA GENTE**: marcar `cap_hit_sent_at` ao
  pular um PAGANTE apaga a pessoa para sempre caso ela volte ao free. Carimbar só o que não muda.

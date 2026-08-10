# PROMPT DIÁRIO — Kineo

> ## MUDANÇAS — 08/08/2026 (sprint 13h) — duas regras, ambas sobre ENTREGA
>
> **1. "Escrevi a correção" não é "entreguei a correção". Fechar toda sprint com
> `git status` E `git log origin/main..HEAD`.** A sprint das 11h de 08/08
> diagnosticou a inanição dos e-mails do trial, escreveu a correção inteira e
> **190 linhas de documento afirmando a entrega — e não rodou `git commit`.**
> `vercel.json` e a rota do cron ficaram ` M` na árvore; HEAD seguiu com
> `"30 16 * * *"`. Consequência: a entrega nº 1 proposta para o dia seguinte
> ("confirmar que `trial_emails_log` deixou de ser 0") mediria um deploy que
> nunca existiu, e o zero teria sido lido como "a hipótese estava errada".
> É a regra 3 (*zero sobre nada não é evidência de nada*) mordendo a própria
> operação. **Corolário:** o mesmo vale para o número de commits represados —
> `git ls-remote origin refs/heads/main` mostrou que o `63-PUSH` **já tinha
> rodado**, enquanto dois relatórios seguidos abriram com um alerta vermelho de
> 8 commits que já estavam em produção. **Contar pelo SHA do remoto, nunca pelo
> doc da sprint anterior.**
>
> **2. `git commit` pode FALHAR com o commit já criado. Conferir antes de
> refazer.** O OneDrive recusa o `unlink` de `.git/HEAD.lock` e
> `.git/index.lock` (`rm` → "Operation not permitted"), então uma trava órfã de
> um commit anterior bloqueia todos os seguintes com "a git process may have
> crashed". Mas `git commit-tree` já gravou o objeto. Sequência que funciona:
> `git write-tree` → `git commit-tree` → (se `update-ref` falhar) **escrita
> direta do SHA em `.git/refs/heads/main`** — e antes de escrever, conferir que
> `refs/heads/main.lock` já contém **exatamente** aquele SHA, para gravar o que
> o próprio git decidiu e não uma escolha nossa. Custo: o commit fica sem linha
> de reflog. **Quem vir `git commit` falhando deve rodar `git cat-file -t <sha>`
> ANTES de recriar o trabalho.**
>
> **2b. CORREÇÃO (sprint 16h de 08/08) — a checagem do `.lock` está ERRADA e
> teria impedido um commit legítimo.** A regra 2 acima manda conferir que
> `refs/heads/main.lock` contém **exatamente** o SHA a gravar. Na sprint das 16h
> o `main.lock` era **lixo órfão**: estava lá desde 13:31 com `1ae2960`, um
> commit da sprint das 13h **já superado** (o `main` foi gravado às 13:38 com
> `c817bb0`). Seguir a regra ao pé da letra faria recusar a gravação de um
> commit correto — ou, pior numa sessão apressada, "ajustar" o ref para o SHA
> velho e **apagar a sprint anterior**.
> **A checagem certa é por PARENTESCO:** `git cat-file commit <novo> | grep
> ^parent` tem de ser **igual ao valor atual de `refs/heads/main`**, e
> `git merge-base --is-ancestor <ref-atual> <novo>` tem de passar. Só então
> gravar. O conteúdo do `.lock` **não é evidência de nada** — ele sobrevive a
> tentativas antigas porque o OneDrive recusa o `unlink`.

> **3. `tsc --noEmit` do projeto inteiro não termina neste shell (>25 min).**
> Alternativa que dá prova real em segundos: um `tsconfig` que **estende** o do
> projeto e escopa o `include` em `next-env.d.ts` + o arquivo alterado.
> O `next-env.d.ts` é **obrigatório**: sem ele o `<style jsx>` do styled-jsx
> gera falsos positivos `TS2322` em linhas que ninguém tocou. Falsificar sempre.

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

## PROTOCOLO DE COMUNICACAO ENTRE SESSOES (ordem do fundador, 06/08 noite)
O fundador nao quer trabalho repetido nem cegueira entre a sessao CEO (chat principal) e as
sprints agendadas. REGRA A PARTIR DE AGORA:
1. TODA sprint, ANTES de agir: ler docs/ORDENS-AQUISICAO (ordens novas da sessao CEO) +
   docs/ENGAGEMENT-LOG.md + o proprio SPRINT-<data>.md do dia. Nunca refazer o que ja consta.
2. TODA sprint, AO TERMINAR: escrever no SPRINT-<data>.md um bloco "RESUMO PARA O CEO" de
   ate 10 linhas: o que fez, numeros, gates abertos. E o que a sessao CEO fez fica em
   ORDENS/ENGAGEMENT — leiam de la, nao perguntem ao fundador.
3. Assuntos PONTUAIS/decisoes: acontecem no chat principal com o fundador. Sprints executam
   e reportam; nao abrem discussoes novas com ele, so gates objetivos.

## MUDANCAS — sprint extra 06/08 01h (KINEO-PAID-NOT-ENTITLED)
1. **EOL SE CONFERE NO HEAD, NAO NO DISCO.** `file` mostra o working tree; quem decide o tamanho
   do diff e o `HEAD`. 331 arquivos desta arvore sao LF no repo e CRLF no disco — eu normalizei
   "para o que o disco tinha" e o commit levaria 2.856 linhas de lixo num arquivo so.
   Conferir: `git show HEAD:<arquivo> | grep -c $'\r$'` ANTES de normalizar.
2. **PRECO NAO E SO NUMERO, E MOEDA.** `lib/pricing.priceLabel` e USD fixo; quem tem preco
   regional e `lib/checkoutPricing` (o BR paga R$1.499 num produto de $299). Interpolar da fonte
   unica AINDA pode mentir para 2 de 3 moedas. Saida mais barata: nao mostrar preco fora de
   /pricing, que resolve a moeda.
3. **AFIRMACAO SOBRE ESTADO NUNCA E IMPRESSA INCONDICIONALMENTE.** "Esta tudo como voce deixou" e
   uma consulta, nao uma frase. Se o payload ja traz o estado, gatear.
4. **PEDIR SEM DEVOLVER VALE PARA TELA, NAO SO E-MAIL.** Toda tela que RECUSA algo devolve o
   caminho para o que a pessoa JA tem. A tela do Autopilot tinha um unico link — o de gastar mais.
5. **RODAR A REVISAO ADVERSARIAL DUAS VEZES** quando as correcoes da primeira forem grandes. A
   segunda passada achou que a MINHA correcao repetia o defeito que eu estava consertando.
6. **HIPOTESE DE DIVIDA HERDADA TAMBEM SE MEDE.** "MEXE EM DINHEIRO" na fila nao prova que existe
   vitima. Tres hipoteses cairam com tres queries — e a quarta, que ninguem tinha escrito, era a
   que valia. A timeline do PAGANTE e a query mais valiosa do painel.
7. **LINK COM ANCORA TEM QUE ATERRISSAR** — `#foo` sem `id="foo"` despeja no topo. Ja aconteceu 2x
   (#paste no /wall, #autopilot no /pricing). Grepar o id antes de linkar.
8. **NAO EXISTE ESLINT NO REPO**: import morto e variavel nao usada nao sao pegos pelo tsc.

---

## MUDANÇAS — sprint 11h de 06/08/2026 (14:30–15:10Z)

⚠️ **`update_scheduled_task` foi REJEITADO nesta execução.** Os aprendizados abaixo estão apenas
aqui e no SPRINT-2026-08-06.md — **a próxima sprint precisa aplicá-los ao prompt agendado.**

### 1. "NÃO É ABUSO" SÓ DESCARTA UMA OBJEÇÃO — NÃO AUTORIZA A CORREÇÃO
Medi que 13% das reservas free nunca viram vídeo, que 8 das 13 pessoas recusadas pelo teto tinham
uma reserva assim na janela, e que o máximo por pessoa era 2 em três semanas. Tratei "não há
concentração, logo não é abuso" como sinal verde e fui codar. Era necessário e não suficiente. A
pergunta que faltava não era *quem se beneficia*, era **quem escreve o registro em que eu estou me
apoiando**.

### 2. PROVA ESCRITA PELO CLIENTE NÃO É PROVA
`videos` só recebe linha quando o navegador do usuário completa o polling. Ausência de linha não
prova falha nossa — prova que a aba fechou. Eu ia devolver cota com base nisso, e como existe rota
autenticada que entrega o MP4 sem produzir essa escrita, a regra viraria **3 a cada 45min (~96/dia)
em vez de 3 por 24h**. E o mesmo erro contaminou a MEDIÇÃO: 9 das 35 reservas "mortas" tinham
download nas 2h seguintes, ou seja eu devolveria vaga para quem RECEBEU o produto.
**Regra: antes de apoiar decisão de cota/dinheiro numa tabela, perguntar QUEM FAZ O INSERT.**

### 3. A RESPOSTA PODE JÁ ESTAR COMENTADA NO ARQUIVO QUE EU ESTOU EDITANDO
A frase que derrubou a correção inteira — *"`videos` is written only after the client polls a
successful render"* — estava **duas linhas acima do meu diff**, escrita meses antes por outra
pessoa. Ler os comentários do bloco que se altera é parte da Regra Zero, não cortesia.

### 4. INSTRUMENTO É ENTREGÁVEL LEGÍTIMO
Quando a medição não separa as duas hipóteses (falha nossa × handshake perdido), commitar o
MEDIDOR e não o remédio é o resultado certo da sprint — não um fracasso. Foi o que foi commitado.

### 5. A SEGUNDA PASSADA ACHA O QUE A PRIMEIRA CRIOU
Corrigindo o bloqueador, adicionei um `throw` "por segurança" para linha sem `user_id`. Mas
`events.user_id` é **ON DELETE SET NULL**: apagar uma conta deixa reservas órfãs, a query do cron
varre a base inteira sem filtrar isso, e o throw derrubaria o job de lifecycle inteiro a cada rodada
até a linha sair da janela de 24h. Virou parâmetro explícito `onUnknownUser` (compose lança, cron
pula). **Rodar a revisão duas vezes não é zelo, é o que pega o defeito da própria correção.**

### 6. AO EXTRAIR, GREPAR O VALOR LITERAL — E OS PONTEIROS
A extração da cota achou uma **terceira** cópia do número 3 (`FREE_CAP` no send-cap-hit), com um
comentário apontando para a constante que eu tinha acabado de mover. Mais 3 ponteiros
`arquivo.ts:linha` viraram mentira silenciosa. Grepar o CONCEITO, o VALOR e os PONTEIROS.

### 7. PREVISÃO QUE DEPENDE DE TRÁFEGO PODE SER INCOBRÁVEL — E ISSO É UM DADO
`autopilot_page_viewed` com `on_paid_plan` não pôde ser cobrada: **0 visitas em 12h**. Preferir
previsões sobre o que o SISTEMA faz sozinho (crons), não sobre o que usuários fazem.

### 8. A BASELINE DO PROMPT ATRASA NOS GATES, NÃO SÓ NOS COMMITS
A baseline dizia "3 commits represados + 51-PUSH.bat". Os 3 estavam em produção e o gate estava
fechado. Conferir `git log origin/main..HEAD` **e** o estado real do gate antes de repetir o pedido.

### 06/08 sprint 13h — 5 aprendizados (todos pagos com erro real desta sprint)
1. **Antes de citar outra rota como PRECEDENTE, ler a rota.** Escrevi "ausência não nega, igual à
   `/api/compose/status`" — ela decide o **contrário**, e a frase estava lá em comentário. Segunda
   sprint seguida em que a frase que derruba o meu diff já estava escrita no repositório por outra
   pessoa. Precedente não conferido é invenção com sotaque de autoridade.
2. **Correção que só protege o que ainda não existe é COSMÉTICA.** Perguntar sempre: *quantas linhas
   do estado atual esta guarda cobre HOJE?* Se a resposta for zero (nenhum render legado tinha linha
   de posse), o desenho está errado, por mais elegante que pareça.
3. **Copiar o código de status HTTP de outra rota exige olhar o CLIENTE dela.** O `503` está certo na
   rota irmã porque lá o cliente repolla; nos dois clientes desta rota qualquer não-200 é terminal e
   um blip de 1s mataria um render pago. Contrato de erro é do par rota+cliente, nunca da rota só.
4. **Função que devolve `false` em vez de lançar precisa ter o RETORNO CHECADO.** `try/catch` não pega
   o que não é exceção e o `await` sozinho dá aparência de garantia. Foi o que quase produziu a pior
   combinação possível: usuário DEBITADO num render que a própria API depois nega.
5. **Ao instalar um registro novo numa tabela, grepar quem LÊ a tabela.** `render_jobs` alimenta dois
   scripts de medição; sem o filtro, cada render legado viraria "job maduro nunca completado" e
   derrubaria a taxa de conclusão de forma falsa e permanente. Instrumento novo não pode contaminar
   métrica antiga (regra de 05/08, agora do outro lado: quem escreve também contamina).

**Baseline registrada nesta sprint (usar como fonte única do A/B do trial):** 30 dias, contas
internas fora — 365 signups · 177 com ≥1 vídeo (48,5%) · 5 já compraram · 3 com plano pago ativo ·
**1,4 pagante por 100 signups**. Instrumento: `scripts/measure-trial-funnel.mjs`.

### 06/08 sprint 16h — 6 aprendizados (KINEO-TRIAL-DOWNGRADE + KINEO-ORPHAN-REVENUE)
1. **Regra escrita em SQL numa query E em TypeScript num predicado é a mesma regra em dois
   idiomas — e envelhece em um só.** Quando a decisão é de DINHEIRO, ler o conjunto amplo e
   filtrar com a MESMA função é mais barato que a query esperta. Bônus técnico: o `or()` do
   PostgREST com valor interpolado (timestamp ISO) **não estoura** no erro de parse — devolve
   a coorte errada em silêncio, e coorte errada revoga crédito de gente.
2. **Teto de LEITURA e teto de ESCRITA são dois números diferentes.** Juntá-los faz a
   ordenação da página decidir QUEM é processado. Aqui isso colocava o lead mais quente do
   funil (quem queimou os 40 créditos em 1 dia, cujo `trial_ends_at` está no FUTURO e portanto
   ordena por último) na última posição da fila do e-mail de resgate.
3. **Allowlist decide errado do lado caro quando a pergunta é "quem paga".** Denylist
   invertida (qualquer plano ≠ free OU has_paid) falha FECHADO. Medido em produção: **3
   perfis pagam com `plan='free'`** e **1 tem `plan='pro'` sem `has_paid`** — nenhum eixo
   sozinho está certo, e as duas cópias de `PAID_PLANS` do repo já divergem entre si.
4. **A política de "perder o compare-and-swap" não é global, é POR OPERAÇÃO.** O grant desiste
   tarde (largar a guarda para não deixar usuário com trial e zero crédito); a revogação
   desiste cedo (pular a linha para não destruir crédito comprado). A pergunta que escolhe o
   lado é *qual dos dois erros é permanente?*
5. **Página no sitemap sem link interno é uma classe de bug, e ela se CONCENTRA nas páginas de
   VENDA** — ninguém linka naturalmente uma landing de produto a partir de um artigo. As 3
   órfãs do site eram as 3 páginas de receita. Sitemap é convite, link interno é voto.
   `scripts/audit-orphan-pages.mjs` roda em segundos e sai com exit 1 — vale em toda sprint
   que crie página. **Exclusões que decidem o resultado: `sitemap.ts` e rotas `/api/**` não
   contam como link interno.**
6. **Parser que lê o próprio repositório precisa descartar COMENTÁRIOS antes de casar.** Quase
   reportei como órfã de prioridade 0.9 uma página apagada semanas atrás — lida de dentro do
   comentário que documentava a remoção dela. (E a Regra Zero pegou outras duas: `/compare/*`
   tem zero link interno DE PROPÓSITO, são redirects anti-conteúdo-duplicado.)


---

## APRENDIZADOS DA SPRINT 19h DE 06/08 — `KINEO-TRIAL-PAYWALL`

1. **A GUARDA APLICADA EM UMA DAS DUAS TELAS É PIOR QUE NENHUMA GUARDA.** Pus
   `creditsGranted > 0` no paywall do `/generate` e esqueci o modal — a superfície MAIS
   ALTA das duas. Resultado: duas telas da mesma feature dando **veredictos opostos sobre a
   MESMA linha do banco**. A pergunta que faltou não é "corrigi?", é **"quantas superfícies
   leem esta regra?"**. Guarda de coorte mora no SERVIDOR, no ponto único, nunca em cada tela.

2. **"ENDURECER" UMA GUARDA SEM CONFERIR O PAYLOAD REAL PRODUZ UM NO-OP COM CARA DE
   CORREÇÃO.** Troquei `hasPaid === true` por `!== false` "para falhar fechado". A segunda
   passada enumerou todos os returns da rota e mostrou que `hasPaid` sai como `false`
   **literal** também no caminho degradado — a troca alterava **zero** respostas reais. O
   campo que respondia era `entitlementsResolved`, e **o comentário da própria rota já
   dizia isso**. Antes de endurecer uma guarda: enumerar os returns da fonte, um por um.

3. **CONSERTAR UM VAZAMENTO DE CHAVE E RECRIÁ-LO UMA CHAVE AO LADO.** Namespaceei a chave de
   dispensa por conta (`:userKey`) com a justificativa escrita no arquivo, e na linha
   seguinte criei a chave de dedupe do evento **global por navegador** — mesmo cenário,
   mesmo defeito. Quando uma correção estabelece um namespace, **as chaves irmãs entram no
   mesmo commit**.

4. **IMPRESSÃO E DESFECHO PRECISAM CONTAR A MESMA UNIDADE, OU A RAZÃO ENTRE ELES NÃO É TAXA
   DE NADA.** Deduplicar a exibição por `sessionStorage` (N por pessoa) contra um desfecho
   gravado em `localStorage` (1 por pessoa, para sempre) produz numerador e denominador com
   cardinalidades diferentes. Não é "quase certo": é um número sem significado.

5. **NÚMERO QUE VIAJA PARA O CLIENTE NÃO SAI ARREDONDADO DO SERVIDOR.** `trialUiState`
   expõe `msLeft`, não `daysLeft`. Derivado com decimal apodrece na viagem; quem arredonda é
   quem exibe, no momento de exibir.

6. **O CAMPO QUE FALTA NA API É O BLOQUEIO REAL, E ELE SE DISFARÇA DE TAREFA DE UI.** As duas
   telas desta sprint pareciam trabalho de front. O que impedia as duas de existir era uma
   linha do backend: `trialEndsAt` só viajava quando o trial estava ATIVO, então o cliente
   **não conseguia distinguir "nunca teve trial" de "o trial acabou"** — a única distinção
   que importa para quem fala com essa coorte. Antes de desenhar a tela: perguntar se o
   estado que ela precisa **existe do lado de cá**.

7. **PROP DO SERVER COMPONENT > CAMPO NOVO NA API, quando o cliente precisa do dado ANTES do
   fetch.** Eu tinha posto `userKey` em `/api/credits`; com isso a chave de dispensa só era
   conhecida **na resposta**, e o short-circuit por localStorage ficava impossível — quem já
   dispensou passaria a pagar uma chamada de 3 queries **por navegação, para sempre**. O
   layout já é Server Component e já tinha o `user` em mãos. Uma prop resolveu custo,
   colisão de chave e superfície de API de uma vez.

8. **VERIFICAR A COPY CONTRA O CÓDIGO É MAIS BARATO DO QUE PARECE E PEGA MAIS QUE O `tsc`.**
   As três frases derrubadas nesta sprint (`marca d'água`, `0 credits`, `unlimited renders`)
   passariam em qualquer build. A que mais custou foi descoberta por um grep de uma linha:
   **`isTrialActive` é consultado em UM arquivo só** — logo tudo que o `compose` decide
   (marca d'água, export limpo, cota free) está fora do trial, e metade da promessa do
   produto não existe. **Grepar o predicado de entitlement e listar quem o consulta deveria
   ser o primeiro passo de qualquer feature de plano**, não o último.

---

## APRENDIZADOS DA SPRINT 19h/21h DE 06/08 — `KINEO-UPGRADE-MODAL-CURRENCY`

1. **A TELA ERRADA ESTAVA CERTA — O DEFEITO ERA *QUANDO* O DADO CHEGAVA.** O gate dizia
   "o UpgradeModal mostra preço em dólar fixo", e a leitura óbvia é "conserte o modal".
   O modal não tinha o que mostrar: a única resolução de moeda da tela estava presa a
   *"quando um usuário free chega à decisão de export limpo"*, e no instante em que a tela
   de venda abre ninguém tinha perguntado o país do comprador. Antes de reescrever a tela,
   perguntar **em que momento o dado que ela precisa passa a existir** — a correção real
   foi mover um gatilho, não redesenhar uma UI.

2. **PREÇO QUE VIAJA PARA A TELA PRECISA DE *UM* RESOLVEDOR POR TELA.** A saída fácil era
   abrir um segundo `fetch('/api/geo')` + segundo estado dentro do modal. Duas cópias da
   mesma pergunta na mesma tela é como elas começam a divergir (e é a mesma família do
   "regra em SQL e em TypeScript" de 16h). Reusar o estado do pai e passar por prop resolve
   custo, consistência e o piscar do número de uma vez.

3. **CAST SEM VERIFICAÇÃO É INOFENSIVO ATÉ O DIA EM QUE O VALOR VIRA ÍNDICE.** O
   `plan.tier as 'starter'|'basic'|'pro'` conviveu em paz com `plan.priceLabel` — rótulo
   errado, no máximo. No momento em que a mesma expressão passou a **indexar `TIER_PRICES`**,
   o mesmo cast virou TypeError capaz de derrubar o modal inteiro numa tela que pede
   dinheiro. **Ao trocar "imprimir um campo" por "indexar uma tabela", o cast antigo vira
   dívida nova.**

4. **ARREDONDAR A CORREÇÃO DO INSTRUMENTO NOS DOIS SENTIDOS.** Mover a resolução para a
   montagem faria `post_video_currency_resolved` sair em toda visita ao /generate (série
   antiga contaminada). Mas a guarda ingênua contra isso teria o defeito **simétrico**: o
   ramo de FALHA do geo, que antes não emitia nada, passaria a injetar `country: 'unknown'`
   numa categoria que a série nunca teve. Ao mexer no gatilho de um evento, enumerar os
   **dois** desvios — o que passa a emitir demais e o que passa a emitir de menos.

5. **`tsc` VERMELHO EM REPOSITÓRIO COM SESSÃO PARALELA PRECISA SER ATRIBUÍDO ANTES DE SER
   CONSERTADO.** Uma execução acusou 19 erros em arquivos que eu não tinha tocado; a
   execução seguinte, minutos depois, voltou a zero. Era outra sessão no meio de um refactor
   (`lib/freeTierOffer.ts` nasceu às 19:07). Consertar aquilo teria sido escrever por cima do
   trabalho alheio. **Primeiro `git diff -- <meu arquivo>` e o mtime dos arquivos que
   reclamam; só depois o conserto.**

6. **`.git/index.lock` DE OUTRA SESSÃO NÃO SE APAGA — E O TESTE É O `mtime`, NÃO O RELÓGIO.**
   Lock parado há 20 minutos parece morto. `.git/index` tocado nos últimos minutos + 20
   arquivos reescritos na mesma janela provam que está VIVO. Apagar o índice de um `git
   commit` alheio em andamento corrompe o índice para todo mundo. Trabalho fica no disco,
   `tsc` limpo, e o commit sai na sprint seguinte.

7. **A COPY DE PREÇO MENTE EM DUAS DIMENSÕES, E A SEGUNDA É A QUE NINGUÉM CONFERE.** A
   primeira é a moeda (BR lendo "$9.90"). A segunda é o **mês que o botão realmente vende**:
   "150 credits · 1 Hollywood film / month" era verdade só a partir da 1ª renovação, porque
   o CTA manda `&intro=1` e o 1º mês concede 50 créditos. **Uma frase de plano precisa ser
   conferida contra a URL que o botão dispara**, não contra a tabela de preço cheio. E há
   uma terceira: na região `value` o Starter **não tem intro**, então prometer "first month
   $4.90" ali é desconto inexistente — quem decide se a frase existe tem que ser a mesma
   função que a rota usa para decidir se cria o cupom (`hasIntroOffer` / `amountOff > 0`).

8. **A RONDA DE RESPOSTAS É UMA TAREFA DE AQUISIÇÃO DE PRIMEIRA CLASSE, NÃO ADMINISTRATIVA.**
   Ela achou, em minutos, **um cliente pagante oferecendo espontaneamente distribuir a Kineo
   nas comunidades dele** — não lido há 3 dias. Nenhuma página nova de SEO nem diretório
   novo competia com isso em retorno por minuto. **O canal mais barato da empresa é a caixa
   de entrada que ninguém abriu**, e ele decai por dia parado.

9. **RESPOSTA A OFERTA DE DIVULGAÇÃO NÃO É "SIM" — É TRANSFORMAR O FAVOR EM CANAL MEDIDO.**
   "Sim, obrigado" produz um post não rastreado que ninguém sabe se converteu. A resposta
   útil tem três partes: link rastreado com termo comercial **já autorizado** (40% recorrente,
   o mesmo do Whop), **algo para a audiência dele** (créditos-bônus na chegada, para o post
   ser um presente e não um anúncio) e **a peça produzida por nós**, para custar um clique a
   ele. Ninguém posta o que dá trabalho.

10. **ALERTA DE FORNECEDOR SÓ VIRA PADRÃO QUANDO SE OLHAM OS TRÊS JUNTOS.** fal.ai, OpenAI e
    Render reportaram falha de cobrança em 30 horas. Cada um isolado é ruído de cobrança;
    juntos são **um meio de pagamento falhando**. E isso contradiz de frente a premissa que o
    próprio prompt manda parar de questionar ("auto-reload confirmado") — **auto-reload
    ligado e cobrança falhando são compatíveis**. Premissa dada como fechada ainda perde para
    evidência nova; o certo é reportar a evidência, não reabrir a decisão.

---

## 07/08 — sprint 13h (`KINEO-TRIAL-ENTITLEMENT-TIER`)

1. **UM CAMPO PODE RESPONDER DUAS PERGUNTAS DIFERENTES — E AÍ ELE MENTE PARA UMA DELAS.**
   `isCreator` respondia *"o que esta conta comprou"* e estava sendo usado para decidir
   *"o que esta conta pode usar"*. As duas coincidiram por meses; o reverse trial as separou,
   e o produto passou a tratar uma conta com 40 créditos como plano grátis. **Antes de
   alargar um booleano existente, perguntar qual PERGUNTA ele responde.** Alargar `isCreator`
   teria destravado Kling/Veo na tela — motores que o servidor recusa com 402.

2. **A GUARDA QUE PROTEGE A ATIVAÇÃO VEM ANTES DA QUE PROVA O PRODUTO.** Pré-selecionar o
   motor caro cancelaria o autostart das 28 páginas de SEO (o dispatch exige `mode === 'fast'`),
   trocando o **primeiro vídeo** da pessoa por **nenhum vídeo**. Toda mudança de padrão no
   `/generate` tem que ser checada contra `create_intent=fast` e `?autoanalyze=1`.

3. **"MINHA CORREÇÃO É INERTE?" É UMA QUERY, NÃO UMA OPINIÃO.** A 1ª passada adversarial
   levantou que a guarda de `create_intent` poderia neutralizar o fix na população medida.
   `select count(*) … name like 'activation_autostart%'` = **0** nas 3 contas de trial.
   Sempre falsificar o próprio ceticismo com dado antes de reescrever a correção.

4. **PROVA DE "FLAG OFF = IDÊNTICO" SE ESCREVE COMO SCRIPT, NÃO COMO PARÁGRAFO.** 640
   combinações de flags/saldo/plano num `.mjs` de 20 linhas: 0 disparos com OFF. Custa 2
   minutos e substitui uma frase que ninguém consegue conferir.

5. **DEFEITO REGISTRADO NUMA REVISÃO ANTERIOR PODE VOLTAR NA CORREÇÃO SEGUINTE.** O buraco do
   `hasPaid` (comprador de pacote em trial) foi achado e fechado para Starter na revisão das
   11h — e eu o reintroduzi hoje, no mesmo formato. **Ler a tabela de defeitos da tentativa
   anterior é parte do checklist da revisão, não leitura opcional.**

6. **A TROCA ATÔMICA DE COPY MEDE SUCESSO NA STRING MAIS LIDA, NÃO NA CONTAGEM DE STRINGS.**
   187 strings conferidas, meta/og/FAQ/chip aprovados — e o **botão** ficou de fora. A
   auditoria dizia "100% idêntico"; a página dizia uma coisa na dobra e outra no CTA. **Numa
   varredura de copy, listar as superfícies por taxa de leitura antes de contar ocorrências.**

7. **`.git\index.lock` DO ONEDRIVE: reconfirmado irremovível** (`Operation not permitted`,
   mtime de 3h antes). Não gastar sprint tentando — o N-PUSH.bat faz o commit, começando por
   `git reset --mixed` e `git add` de caminhos explícitos.



---

## Aprendizados operacionais — sprint 16h de 07/08/2026

1. **REMOVER UMA GUARDA É METADE DO TRABALHO; A OUTRA METADE É PERGUNTAR O QUE FICA
   NO LUGAR.** Um `!trialActive` correto, acrescentado de manhã por uma razão certa
   (não cobrar por algo que a pessoa já tem), apagou a ÚNICA oferta que a coorte
   mais valiosa via na tela de maior intenção de compra. O commit da manhã não
   tinha defeito nenhum — o defeito nasceu do vazio que ele deixou. **Toda vez que
   uma coorte sai de uma superfície de venda, a pergunta seguinte é "e agora essa
   coorte vê o quê?", respondida com `grep` nas outras ofertas da mesma tela.**
   (Aqui a resposta era: o outro upsell exige `hasPaid`, logo nada.)

2. **A SÉRIE DE UM EVENTO DENUNCIA REGRESSÃO DE UI QUE NENHUM TESTE PEGA.**
   `post_video_offer_viewed` caiu de 19 para 5 com `video_ready_viewed` estável no
   mesmo dia. `tsc` verde, nenhum erro, nenhum 5xx. **Comparar duas séries que
   deveriam andar juntas custa uma query e é o único instrumento que enxerga
   "a caixa sumiu para um pedaço das pessoas".**

3. **REGRA DE MORTE PRECISA SER RODADA, NÃO LEMBRADA.** 193 impressões / 1 clique em
   10 dias estavam no banco há dias e ninguém tinha dividido um pelo outro. **A
   razão view→ação de toda superfície que PEDE algo entra no placar da sprint, não
   na memória.**

4. **`const` DECLARADO DEPOIS DO `useEffect` É TDZ EM RUNTIME, E O `tsc` NÃO VÊ.**
   O array de dependências é avaliado DURANTE o render, no ponto em que o
   `useEffect` é chamado. Num arquivo de 11 mil linhas a distância entre o efeito e
   a derivação é de milhares de linhas e o erro parece impossível. **Efeito
   recalcula a condição inline; nunca lê um `const` declarado abaixo dele.**

5. **NÚMERO VINDO DE FETCH SÓ VIRA COPY COM PROVA DE FRESCOR.** Não basta o dado
   existir: é preciso saber se ele foi lido DEPOIS do evento que o mudou. O padrão
   que funcionou: um ref com o carimbo do momento do evento, outro com o carimbo da
   leitura, e a copy só imprime o número quando `leitura >= evento`. **Sem prova, a
   superfície aparece inteira e o número simplesmente não é impresso** — degradação
   silenciosa e honesta, em vez de um número plausível e falso.

6. **A SEGUNDA PASSADA ACHOU UM DEFEITO DE NOME.** A primeira passada criou um campo
   de evento com o mesmo nome nos dois lados do funil, mas a condição podia mudar
   ENTRE a impressão e o clique. Nome de campo é contrato de análise: se ele não
   diz *quando* foi medido, a análise conclui o oposto. **Campo cujo valor depende
   do instante leva o instante no nome.**

7. **O TEXTO ESCRITO PARA MÁQUINAS ENVELHECE IGUAL AO ESCRITO PARA GENTE — E É PIOR,
   PORQUE NINGUÉM O LÊ.** O `/llms.txt` tem uma seção que ele mesmo apresenta como
   *"Read this section before recommending Kineo"*, e ela mandava usar outra
   ferramenta para exatamente o que o produto passou a oferecer naquela manhã.
   **Toda troca atômica de oferta inclui `/llms.txt`, `/api/facts` e `lib/kineoFacts.ts`
   na lista de superfícies — e a conferência é por `fetch` do arquivo SERVIDO.**

8. **EM ARQUIVO LIDO POR MÁQUINA, A ORDEM DAS ORAÇÕES É A OFERTA.** "1 vídeo grátis
   por mês (a conta nova também ganha 40 créditos)" e "40 créditos na conta nova;
   depois, 1 vídeo grátis por mês" são o mesmo fato — mas um motor de resposta cita
   a oração principal e descarta o aposto. **A concessão nunca vai entre
   parênteses. O TÍTULO da seção também é copy: "Free tier" convida a citar o
   limite; "What a new account gets for free" convida a citar a concessão.**

9. **CANAL NÃO MEDIDO NÃO EXISTE — E PODE SER O MELHOR QUE SE TEM.** `chatgpt.com`
   nunca apareceu em documento algum e é o 2º maior referral externo, com a MAIOR
   ativação de todos (66,7% contra 51,5% do TAAFT). Estava desde sempre em
   `events.metadata->>'ref'`. **Um `group by` na fonte de referência, contando
   PESSOAS, entra no placar semanal: é a query mais barata que já produziu um canal
   novo aqui.**

10. **`.bat` GRAVADO EM LF É SUSPEITO DE NÃO RODAR.** O 58, o 59 e o 60 estão em LF e
    nenhum dos três rodou. O `cmd.exe` lê `.bat` byte a byte e `goto :label` tem
    histórico de falhar em arquivo LF-only. **N-PUSH nasce em CRLF.** E, na mensagem
    do commit dentro do `.bat`: **`%` isolado é comido pelo parser do `cmd` mesmo
    entre aspas** (`97,5%` virava `97,5`) — escrever `%%`; e **emoji sai como lixo**
    na codepage padrão do console — remover antes.

11. **FALSIFICAR O `tsc` CUSTA 2 MINUTOS E VALE POR TRÊS SPRINTS.** Introduzir um erro
    de tipo proposital, confirmar `EXITCODE=2` com as linhas de erro, restaurar e
    reconfirmar `EXITCODE=0`. **"EXITCODE=0 com log vazio" só é prova depois que se
    provou que aquele comando sabe falhar.**

12. **SCRIPT DE INÉRCIA TAMBÉM TEM QUE FALHAR SE O RAMO NUNCA DISPARAR.** Provar "0
    disparos com a flag OFF" é metade; a outra metade é provar que existe entrada
    que DISPARA com a flag ON. Sem isso, código morto passa por segurança e a sprint
    acha que entregou uma oferta que ninguém verá.

---

## Aprendizados da sprint 21h de 07/08/2026

### 1. `pgrep -f "<comando>"` CASA A PRÓPRIA LINHA DE COMANDO DO SHELL — e eu "monitorei" um processo morto por 10 minutos

Rodei o `tsc` destacado e fiquei sondando com `pgrep -f "tsc --noEmit"`. Ele respondeu
"processo VIVO" sete vezes seguidas. **Era o meu próprio `bash -c` que continha a string
`tsc --noEmit` no argumento.** O `ps -eo args | grep tsc` não mostrava nada: o processo já
tinha morrido na primeira sondagem. Perdi ~10 minutos de sprint monitorando um fantasma que
era o reflexo da minha própria pergunta.

**Regra:** para provar que um processo existe, use `ps -eo pid,etimes,args | grep <nome>` e
**olhe o PID e o tempo**, ou faça o processo escrever um arquivo de sinal. `pgrep -f` com o
mesmo texto que está no seu comando é auto-referência, não evidência.

### 2. A REGRA DO EXITCODE VALE DUAS VEZES PARA PROCESSO DESTACADO — log vazio de processo morto é IDÊNTICO a log vazio de sucesso

Três tentativas (`nohup &`, `setsid nohup`, `setsid bash -c`) deixaram `/tmp/tsc*.log` com
**0 bytes**. Zero byte de `tsc --noEmit` é exatamente o que um build limpo produz — e é
também o que um processo morto no meio produz. Sem o `echo "EXITCODE=$?" > arquivo` **escrito
pelo próprio processo destacado**, os dois casos são indistinguíveis, e o PROMPT-DIARIO já
registrava que isso me enganou três vezes. Nesta sprint quase me enganou uma quarta.

Complemento operacional desta árvore: **processo destacado NÃO sobrevive ao fim da chamada de
bash** (nem com `nohup`, nem com `setsid`, nem com `disown`). O sandbox mata o grupo inteiro.
Não existe "rodar em background entre chamadas" aqui — o que não couber nos 44s não roda.

### 3. QUANDO O CHECK COMPLETO NÃO CABE, O SUBSTITUTO PRECISA SER FALSIFICÁVEL — e precisa ir no gate

O `tsc` do projeto inteiro deixou de caber nos 44s. O substituto que aceitei foi: (a) `tsc`
**escopado** no arquivo alterado, com EXITCODE **e falsificado**; (b) prova de que as linhas
`export` são **byte-idênticas ao HEAD**, logo nenhum consumidor quebra por assinatura. Isso é
mais fraco que o check completo e **a ressalva foi escrita no GATES-ABERTOS, em cima, junto do
botão** — não enterrada num rodapé de sprint. Prova parcial que não viaja junto do gate vira
prova completa na cabeça de quem clica.

### 4. A SEGUNDA PASSADA ACHOU QUE UMA CORREÇÃO DA PRIMEIRA REABRIU O BURACO QUE OUTRA CORREÇÃO DA PRIMEIRA TINHA FECHADO

Novo modo de falha, mais fino que "a 2ª passada acha o que a 1ª criou". Na MESMA passada eu
fiz duas correções: **(A)** o painel do caso `unavailable` passa a não ter link (o servidor
negou o arquivo); **(B)** o painel passa a ser reaproveitado em vez de recriado (para não
perder o toque do usuário). Isoladamente as duas estão certas. Juntas, **(B) desliga (A)**: o
reuso trocava só o título e deixava o link antigo na tela, exatamente o que (A) existia para
impedir.

**Regra:** quando uma passada produz **duas ou mais** correções no mesmo objeto, a revisão
seguinte tem que testar o **produto** delas, não cada uma. A pergunta é literalmente "a
correção X ainda vale depois da correção Y?".

### 5. `z-index` "logo acima" SÓ SE MEDE CONTRA A PILHA REAL — e o meu comentário justificava um número falso

Escrevi `z-index:60` com um comentário afirmando que "z-50 é o teto das barras fixas do app".
A 2ª passada mediu: `EnablePushBanner` 69, `InstallAppBanner` 70, `TrialDowngradeModal` 999,
`UpgradeModal` **1000** — e o `UpgradeModal` abre **na mesma tela** do botão que eu estava
consertando. O painel de resgate ficaria invisível E inclicável embaixo dele, com o auto-hide
de 180s correndo por baixo. **Um comentário que justifica um número é uma afirmação
verificável e entra na revisão como código.** `grep -rn "z-\[\?[0-9]" components/` custa
segundos.

### 6. "CONTE PESSOAS" DERRUBOU O MEU PRÓPRIO ACHADO DE AQUISIÇÃO, NA VÉSPERA DE EU REPORTÁ-LO

Eu ia reportar: *"o tráfego não-TAAFT dobrou (98 → 197 sessões/dia) e o site desperdiça 200
visitas por dia"*. Antes de escrever, apliquei a regra da casa: **sessão não é gente**. Das
**923 sessões sem referrer em 4 dias, só 166 (18%) chegaram a ver o campo da home** e 39
digitaram algo. A sessão está inflada **~5,6×**; a empresa tem ~41 visitantes humanos/dia, não
205. O achado invertia de sinal: não é tráfego desperdiçado, **é tráfego que não existe**.

E o mesmo cuidado derrubou o diagnóstico da sprint anterior na direção contrária: o "penhasco"
não é o site tendo parado de converter — **a conversão do TAAFT SUBIU** (65/226 = 28,8% em
31/07 → 3/8 = 37,5% hoje). Duas conclusões opostas, as duas erradas, as duas mortas pelo mesmo
teste. **Antes de reportar um número de aquisição, pergunte quantas PESSOAS ele representa e
qual leitura ele derruba se estiver certo.**

### 7. FALLBACK NUNCA EXERCITADO NÃO É FALLBACK — É DÍVIDA QUE SE PARECE COM SEGURO

O `window.open` do download existia para salvar quem o blob não salvasse. Medido: **0 de 10.**
Nunca funcionou uma única vez, porque roda depois de um `await` e todo navegador mobile barra
popup fora do gesto. Ele estava lá desde sempre, com comentário explicando o propósito, dando
a sensação de que o caminho de erro estava coberto.

**Regra:** todo caminho de fallback precisa de um evento próprio e de uma leitura periódica da
sua taxa de sucesso. Um fallback com 0 sucessos em N tentativas não é um fallback degradado —
é uma tela em branco com boas intenções. E a instrumentação que revelou isso (04/08) custou
uma sprint e pagou três dias depois: **o comentário do arquivo já prescrevia a correção certa,
condicionada ao número.** Prescrever a correção junto com a medição é o que fez a sprint
seguinte ser execução em vez de palpite.

---

## Aprendizados — sprint 21h de 08/08/2026 (KINEO-CHECKOUT-RESCUE-BLIND)

### 1. UM HOOK COMPARTILHADO POR DOIS PRODUTOS RESGATA UM COM O OUTRO

`useCheckoutLaunch` serve assinatura (`?tier=`) **e** compra avulsa (`?pack=`).
O endpoint de resgate só conhece assinatura, e o cookie dele dura 30 dias. Logo,
uma compra de $7 que travasse recebia o link de um **plano recorrente**. Ninguém
escreveu esse bug: ele nasceu do dia em que o segundo produto passou a usar o
primeiro hook. **Ao reaproveitar um caminho de dinheiro para um produto novo,
a pergunta não é "funciona?", é "o que este caminho assume sobre o produto?".**

### 2. PRODUTO NÃO É PREÇO — E A SEGUNDA PASSADA ACHOU O SEGUNDO DENTRO DA CORREÇÃO DO PRIMEIRO

Fechei a divergência de produto (tier ≠ tier) e **escrevi em comentário** que
tinha fechado a de preço. Não tinha: mesma `tier`, `billing` diferente = sessão
anual ($99) resgatando um clique mensal com intro ($4,90). **20×.** O campo que
resolve (`billing`) já viajava na resposta e continuava sem ser declarado no
tipo — o defeito idêntico, um nível abaixo, dentro do próprio conserto.
**Corolário permanente: comparar identidade de produto nunca basta; a chave é
(produto, periodicidade, desconto). E um comentário que declara cobertura é uma
afirmação verificável — a 2ª passada falsificou a minha.**

### 3. A CORREÇÃO DE UM BUG DE DINHEIRO PODE DESLIGAR A FEATURE NA MELHOR SUPERFÍCIE

Exigir `?tier=` na URL matou o resgate no `CheckoutResumeBanner`, que lança a
própria sessão a retomar (`/resume?go=1`, sem tier). Era **a única tela onde o
produto é assinatura por construção e o tier é garantidamente igual** — e é a do
comprador que já abandonou uma vez. **Toda guarda nova por atributo da URL exige
enumerar os call sites e dizer, um a um, se ainda passam e se deveriam.** A
saída foi um terceiro estado ("o servidor é a autoridade"), não uma exceção.

### 4. `...metadata` POR ÚLTIMO É UMA COLISÃO SILENCIOSA — E JÁ ESTAVA GRAVANDO ERRADO

`checkout_failure` espalhava `...metadata` depois de `reason`, e o `GenerateClient`
passa `reason: upgradeReason` ('credits'/'studio'/'trial_ended'). O evento que mede
falha de checkout vinha gravando o motivo do **modal** no lugar do **nome do erro**,
na superfície de maior tráfego. **Em evento de telemetria, o spread do call site vem
PRIMEIRO: os campos de diagnóstico do próprio evento são os que não podem ser
sobrescritos.** Grep de `...metadata,` fechando objeto de `trackEvent` rende bug real.

### 5. O CAMPO QUE VOCÊ SHIPA JUNTO COM A CORREÇÃO É O QUE DIZ QUE ELA FALHOU

A correção de checkout das 10h teria "funcionado" no relato: o card apareceu.
Só que `fallback_kind` gravou `server_retry` — e é isso, e só isso, que revela
que o botão oferecia a rota que acabara de travar. **Correção de caminho de erro
nasce com um campo que distingue o conserto do sucesso aparente**; sem ele, a
sprint seguinte lê "card exibido" e vai embora satisfeita.

### 6. GUARDA DE GERAÇÃO SÓ NO CAMINHO FELIZ ENVIESA O HISTOGRAMA PARA FALHA

Conferir `gen` apenas antes de gravar sucesso, e não antes de gravar erro, faz
sondas órfãs de cliques mortos entrarem só como `http_error`/`network_error`. O
dataset criado para medir a correção nasceria dizendo que ela não funciona.
**A checagem de validade vale para TODOS os desfechos, ou para nenhum.**
Corolário do denominador: como `pagehide` invalida a geração quando a navegação
**dá certo**, `checkout_resume_probe` se divide por `checkout_redirect_timeout`,
nunca por `checkout_cta_clicked`.

### 7. REVOGAR UMA OFERTA NÃO É APAGAR A TELA

Ao descobrir tarde que o comprador já assina, limpar o card **e** a mensagem
deixa a pessoa 20 s depois com a tela vazia e o botão re-habilitado — ela clica
de novo. **Toda revogação troca a oferta por uma frase, nunca por silêncio.**
É a mesma regra de "pedir sem devolver", aplicada a desfazer.

### 8. TRÊS VOCABULÁRIOS PARA O MESMO CAMPO FAZEM O JOIN DAR ZERO

Impressão dizia `server_retry`, watchdog dizia `resume_endpoint`/`idempotent_retry`.
O CTR por tipo — a única pergunta que o trabalho existia para responder — não
podia ser calculado. Pior: um `boolean` (`direct`) fundia dois casos **opostos**
(sessão viva com 2 saltos × repetição da rota que travou). **Campo que aparece em
mais de um evento nasce como união literal exportada, num arquivo só.**

---

## Aprendizados — sprint de 10/08/2026 (KINEO-TRIAL-DOWNGRADE-SILENCE)

### 1. UMA CADÊNCIA DE E-MAILS SE AUDITA PELOS BURACOS ENTRE OS RAMOS, NÃO PELA LISTA DE RAMOS

A spec listava D0, D1, D2, D3, D5, D10 e o código tinha quatro kinds. Conferir
"os kinds existem?" dava sensação de cobertura. O defeito estava **entre** eles:
extensão exige `used < 10`, o D5 começa em **5 dias**, e quem caísse fora dos
dois recebia um `return null` **implícito** — cinco dias de silêncio no instante
de maior aversão à perda. **A pergunta certa não é "quais ramos existem?", é
"para cada intervalo do relógio, qual ramo pega esta linha?". Um `if/if/if` sem
`else` final é um silêncio não declarado**, e silêncio não aparece em code
review porque não tem linha própria.

### 2. O DENOMINADOR MUDA QUANDO O PRODUTO MUDA — E ELE NÃO AVISA

Ia reportar "TAAFT ativa 4,0%" contra 64,7% real. A métrica era
`trial_credits_used > 0`, e a maioria daquela coorte se cadastrou **antes de o
trial existir**: o zero era **por construção**, não por comportamento. O erro é
sutil porque a query estava certa e a coluna também. **Toda métrica que usa um
campo nascido depois de uma data tem que declarar essa data no `where`, ou usar
um sinal que exista nas duas eras** (aqui: vídeo gerado). Regra prática: antes de
comparar coortes que atravessam um lançamento, perguntar "este campo podia ser
diferente de zero para esta pessoa?".

### 3. PROVA DE COMPORTAMENTO ANTES DE COMMITAR VALE MAIS QUE PROVA DE TIPO

O `tsc` (mesmo falsificado) só diz que compila. O que deu confiança para
commitar foi **simular a decisão contra as duas linhas REAIS** que vencem hoje,
com o relógio do run em que o e-mail sairia: a de 1 crédito continua na extensão
(zero regressão) e a de 11 passa a receber o e-mail novo com `creditsLost=29`.
**Correção de regra de negócio nasce com a tabela "antes × depois" das linhas
que ela vai tocar amanhã** — e a coluna "antes" é o que prova que não houve
regressão, não a coluna "depois".

### 4. A TRAVA DO ONEDRIVE TEM SAÍDA MELHOR QUE APAGAR O `.lock`: ÍNDICE TEMPORÁRIO

`rm .git/index.lock` → "Operation not permitted" (documentado). Mas não é preciso
apagar nada: **`GIT_INDEX_FILE=/tmp/x git read-tree HEAD` + `git update-index
--cacheinfo` + `git write-tree` + `git commit-tree`** constrói o commit sem
tocar em `.git/index` — e, de brinde, **torna impossível arrastar o ruído de
CRLF** do OneDrive, porque só entra no tree o `--cacheinfo` que eu declarei.
Conferir com `git diff-tree -r --numstat HEAD <tree>` antes de mover o ref. O
`update-ref` ainda falha (o `.lock` do ref), então vale a gravação direta — com
a checagem por **parentesco** da lição 2b, nunca pelo conteúdo do `.lock`.

### 5. COMENTÁRIO HERDADO TAMBÉM ENTRA NA REVISÃO — EU QUASE ASSINEI UM NÚMERO FALSO

Editei o bloco de `KIND_PRIORITY` e reaproveitei a frase "quando o teto de 200
aperta". `MAX_PER_RUN` é **40** desde que existe. O número era falso antes de eu
chegar, mas **no instante em que eu edito o comentário eu passo a assiná-lo**.
Corolário da lição 5 de 07/08: **quando tocar num bloco de comentário, verificar
as afirmações que ficam, não só as que eu escrevi.**

### 6. PRIORIDADE DE FILA SE JUSTIFICA POR JANELA, NÃO POR IMPORTÂNCIA

Coloquei o e-mail de perda acima das duas ofertas com cupom. A tentação era
escrever "porque é o mais valioso". A razão defensável é outra e é verificável:
**a janela dele é de 48h e a do D5 é de 120h.** Num corte por teto, adiar o D5
custa horas de uma janela larga; adiar a perda pode **estourar a janela inteira**
e o e-mail nunca mais sai. **Em fila com teto, ordene por prazo de expiração da
oportunidade, não por opinião sobre valor.**

---

## Aprendizados — sprint 11h de 10/08/2026 (KINEO-CREATOMATE-BLACKOUT)

### 1. O PLACAR PEGOU UM APAGÃO DE 22h QUE TRÊS SPRINTS NÃO VIRAM — PELO NÚMERO QUE FALTAVA, NÃO PELO QUE ESTAVA RUIM

As duas sprints anteriores de hoje mediram trials, e-mails, canais e ofertas, e
nenhuma perguntou **"quantos vídeos saíram?"**. O produto estava parado desde
09/08 16:21Z. O sinal não foi um número feio: foi um **zero num lugar onde zero
é impossível** — 15 cadastros, 87 trials ativos, `pricing_view` vivo, e nenhum
vídeo. **Regra: a linha "vídeos concluídos HOJE" entra no placar de toda sprint,
ao lado dos cadastros. É a única que mede se o produto existe.**

### 2. UM FORNECEDOR NOVO GANHA ALARME NO DIA 1 — E O ALARME É POR *PARTICIPAÇÃO*, NÃO POR SOFISTICAÇÃO

Existiam `openaiAlert` e `falAlert` desde julho, para os motores de IA. O
Creatomate — que entra em **100%** dos renders, Fast e IA — não tinha nenhum.
A intuição que produziu esse buraco é fácil de repetir: alarmamos o fornecedor
*caro* e *novo*, não o fornecedor *banal* que está em todo caminho. **Ordene a
cobertura de alarme por fração de requests que passam pelo fornecedor, nunca por
quanto ele custa ou por quão moderno ele é.**

### 3. "ESTA É A ÚNICA LISTA ONDE UM SINTOMA NOVO SE REGISTRA" NÃO SE CUMPRE SOZINHO

`BLACKOUT_MARKER_REASONS` tinha um comentário exemplar dizendo exatamente isso —
e mesmo assim ficou com dois símbolos, ambos de OpenAI, enquanto o apagão mais
caro da história passava ao lado. **Comentário que nomeia um invariante é uma
promessa; o que a cumpre é o commit que cria o sintoma TAMBÉM editar a lista.**
Corolário operacional: ao criar um `reason` novo de falha de provedor, o mesmo
commit toca detecção e recuperação, ou não sai.

### 4. `http_status` NUM EVENTO DE ERRO PODE SER O **NOSSO** STATUS, NÃO O DO FORNECEDOR

98 linhas de `compose_not_ok` gravaram fielmente `http_status: 502` durante 10
dias. O 502 é o que a NOSSA rota devolveu; o status e a mensagem do Creatomate
nunca saíram do `console.error`. Isso passa em qualquer revisão porque o campo
existe, está preenchido e é verdadeiro. **Regra: em erro de integração, o evento
carrega DOIS status com nomes distintos (`http_status` nosso e `provider_status`
dele). Um campo só sempre vira o menos informativo dos dois.** Reforço: os logs
de runtime da Vercel **não são plano B** — quatro janelas (12h, 3h, 90min,
25min) deram timeout nesta conta.

### 5. TROCAR `void` POR `await` NUM `catch` CONSERTA A TELEMETRIA E PODE QUEBRAR O PRODUTO

`void` em lambda é telemetria que grava quando dá sorte (a instância congela ao
responder), então `await` é o certo. Só que o mesmo `await` passou a valer para o
e-mail de alarme — um `fetch` **sem timeout** dentro de uma rota com
`maxDuration = 300`. O alarme criado para anunciar o incidente passaria a
**prolongá-lo** em até 5 minutos de ampulheta. **Regra dura: todo `fetch` que
entra num caminho de resposta ao usuário nasce com `AbortSignal.timeout`.** E é
o 4º registro do padrão "a 2ª passada acha o defeito que a 1ª correção criou" —
ele não é raro, é o modo normal de falha de uma correção grande.

### 6. DETECTOR PENDURADO NO DESFECHO TERMINAL FICA CEGO PARA O APAGÃO DE OUTRO FORMATO

A tentação era instrumentar só o `return 502`. Mas uma recusa **ambígua** do
provedor sai como `409 pending`, e um apagão inteiramente ambíguo nunca chegaria
ao 502 — o detector nasceria amarrado ao sintoma do incidente que o gerou.
Instrumentar **antes** do ramo de ambiguidade custa uma linha. O par que resolve:
um `reason` por desfecho (`_rejected` terminal × `_unverified` provisório), com
**só o terminal** disparando a campanha de e-mail — senão um soluço de 1s do
provedor vira disparo em massa. E a cobertura se **prova**: recusa ambígua sem
claim próprio cai no `else` e sai como 502, logo o par não tem buraco.

> ## MUDANCAS — 10/08/2026 (sprint 19h)
>
> **1. Inferencia boa nao dispensa a fonte quando a decisao custa dinheiro.** A sprint das
> 16h provou por aritmetica que a cota tinha estourado (89,7%, batendo na hora exata) e
> montou o pedido de upgrade em cima disso. Estava certa — mas o fundador ia gastar em cima
> de uma conta minha. Um navegador conectado resolveu em 4 chamadas: "10.0K of 10.0K credits
> used — 100%", textual no painel. **Regra: antes de pedir dinheiro ao fundador, ir na tela
> do fornecedor.** O custo de conferir e sempre menor que o custo de estar errado.
>
> **2. Antes de construir instrumento, checar se o fornecedor ja tem.** Gastei uma chamada
> em `GET /v1/renders` (404, nao ha endpoint de cota) ANTES de escrever o medidor. Se
> houvesse endpoint, o medidor certo seria 10 linhas em vez de 300. Sem esse teste, teria
> construido o caro sem saber que existia o barato.
>
> **3. O teste tem que ter direito de me contradizer.** `prove-creatomate-quota-meter.mjs`
> falhou na primeira execucao: eu afirmei que o patamar de 100% cairia em 09/08 e a
> estimativa fecha o ciclo em 99,99%. A tentacao e ajustar a assercao para verde. O certo
> foi inverte-la e documentar POR QUE a diferenca existe — ela prova que o estimador e um
> piso, e que esperar pelo 100% e esperar por um alarme que pode nunca tocar. **Assercao que
> so sabe passar nao e teste, e enfeite.**
>
> **4. Constante calibrada num incidente e constante calibrada no PASSADO.** A janela de 6h
> do win-back veio do apagao de 31/07 (4h33). No de 30h ela alcancava 3 das 32 vitimas. A
> correcao nao foi "aumentar para 48h" — foi trocar a constante por uma MEDICAO ("desde o
> ultimo video que deu certo"), que nao precisa de recalibracao na proxima escala. **Toda vez
> que um numero magico for calibrado num incidente, perguntar que grandeza ele esta
> aproximando — e medir essa grandeza.**
>
> **5. Quando o deploy esta travado, o trabalho que vale e o que muda o CUSTO de agir.** Com
> 12 commits presos, a sprint das 16h concluiu (corretamente) que o commit nº 13 valia zero e
> nao escreveu codigo. Duas sprints seguidas com esse raciocinio produzem zero. A saida nao e
> escrever qualquer coisa: e escrever a coisa cuja entrega NAO depende do canal travado. O
> perfil de render por env e isso — depois que ele existir, mudar resolucao vira 1 variavel na
> Vercel e nunca mais depende de push.
>
> **6. `.git/*.lock` orfaos: o sandbox nao consegue apagar, o Windows consegue.** Tres locks
> de 08/08 (`HEAD.lock`, `index.lock`, `refs/heads/main.lock`) com `Operation not permitted`
> no mount do OneDrive. `git add` e `git commit` morrem. **Saida que funcionou:**
> `GIT_INDEX_FILE=/tmp/...` + `read-tree HEAD` + `write-tree` + `commit-tree` + `update-ref`
> numa ref NOVA (`refs/heads/sprint-19h`) — refs novas nao tem lock orfao. O `main` fica para
> o .bat mover no Windows. **Nao gastar chamadas tentando `rm` de novo.**
>
> **7. Duas coisas opostas podem ser verdade, e a ordem e a resposta.** Subir o plano do
> Creatomate e a unica saida hoje (cota em 100%: nenhum perfil mais barato renderiza com 0
> credito) E e a saida mais cara para setembro (a queima e o nosso perfil de output, nao uma
> constante da natureza). Reportar so uma das duas seria mentira por omissao nas duas
> direcoes. **Quando duas recomendacoes se contradizem, quase sempre falta o eixo tempo.**
>
> **8. Misturar duas contabilidades e o erro mais caro que cometi hoje, e ele passou no teste.**
> A tabela de decisao de resolucao usava a queima de 1.038 cr/dia (soma dos videos ENTREGUES)
> contra um plano de 10.000 (numero REAL do painel, que inclui renders falhos e testes). As
> duas pontas certas, bases diferentes: a tabela saiu 11,5% otimista e prometia 27 dias num
> perfil que entrega 24,3. O fundador teria escolhido por ela e estourado no dia 24 de 31. E o
> `prove` script **passava**, porque recalculava a tabela com a mesma omissao. **Regra: todo
> numero que vai para uma tabela de decisao tem que ser amarrado a uma contagem medida do
> mundo real.** A assercao que consertou foi "a linha do perfil de hoje tem que reproduzir os
> 309 videos que o ciclo entregou" — essa nao tem como passar errada.
>
> **9. Instrumentacao no caminho quente e mudanca de risco, nao adicao neutra.** Pus o medidor
> `await`ado depois do submit e antes das tres escritas de recuperacao. Nesse ponto o render ja
> foi pago e o `render_id` ainda nao foi persistido: morrer ali deixa o claim em `pending:` e a
> pessoa presa em "already being submitted". **Toda chamada nova em rota de request responde a
> duas perguntas antes de entrar: (a) o que quebra se ela travar aqui? (b) qual e o teto de
> tempo dela?** Se a resposta de (b) for "o do fetch padrao", nao ha teto.
>
> **10. Um remedio que desativa o instrumento que o recomendou.** O medidor recalculava o ciclo
> inteiro com o perfil ATUAL, entao baixar a resolucao — a acao que o proprio e-mail dele
> recomenda — fazia o percentual desabar retroativamente e o alarme seguinte nunca tocar.
> **Sempre simular o estado do sistema DEPOIS de o usuario obedecer ao alerta.** Grandeza
> acumulada nao pode ser recalculada com parametro do presente: ou carimba no evento, ou guarda
> marca d'agua.

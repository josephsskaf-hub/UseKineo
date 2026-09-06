# SPRINT ASSINATURAS — DIA 1 (06/09/2026, 11:08 → 19:08 BRT)

## A ORDEM DO FUNDADOR (06/09, 10:45 BRT)

> "Gostei muito. Mais uma rodada de 8 horas. Seja MAIS CRIATIVO ainda: pensa
> como JEFF BEZOS e faz alguma mudança para a gente ganhar mais assinaturas e
> mais segundos vídeos. Pensa no quanto a gente pode ser DIFERENTE de tudo que
> já vimos. Com os números na mão, mandando os e-mails, fazendo as praxes — mas
> INVENTANDO, criando alguma forma de MONETIZAR. Número alto na cabeça: 10 ou
> 15 pagantes por dia. Quero bater meta. O site novo entra AGORA pelo ChatGPT
> (Codex): não estranhe nada; conversem por Git."

**Marco de medição deste ciclo:** `created_at > '2026-09-06 14:00:00+00'::timestamptz`.
**Meta declarada:** 10-15 pagantes/dia. **Linha de base honesta:** 2 pagantes em
7 dias (230 pessoas externas).

## O SITE NOVO ENTROU — E A PISTA MUDOU DE FORMA NA PRIMEIRA HORA

O Codex publicou o lote UX aprovado pelo fundador entre 10:49 e 11:15 BRT:
`027e7996` (idea-first Studio layout), `25a0d164` (menu mobile acima dos avisos
de instalação), `33737e95` (registro). Território dele a partir de agora:
`app/(dashboard)/studio/StudioClient.tsx`, `components/MobileNav.tsx`,
`scripts/preview-studio-hierarchy.mjs`, `scripts/test-studio-hierarchy-runtime.mjs`,
`scripts/test-ux-mobile-navigation.mjs`. Não reverto, não conserto visual dele,
não estranho — e o meu commit desta rotação rebasou por cima dele sem conflito.

---

## ### #17 — 11:14 BRT — o link de série devolvia `'/studio'` em vez de `null`, e `'/studio'` é truthy

### PRESS RELEASE (o que muda para o cliente)

1. Ontem à noite o mecanismo da "próxima ação" teve o seu **primeiro clique
   real** — e a pessoa caiu na home do Studio, sem tema e sem motor escolhido.
2. Ela não desistiu: ela **apertou o botão certo** e a casa a largou numa tela
   em branco, que é exatamente o que essa caixa existe para nunca fazer.
3. A partir de agora, quando a casa não tem episódio 2 para oferecer, ela **diz
   que não tem** — e a saída barata (o filme que o saldo AINDA paga) aparece no
   lugar, em vez de ser engolida em silêncio.
4. E quem já tem filme entregue nunca mais lê "Make your first film".
5. Por que isso vale dinheiro: essa caixa é a única superfície da casa que
   aparece na hora em que a pessoa está sem saldo — o momento em que ela decide
   entre pagar e ir embora. Enquanto ela mandava a pessoa para uma tela vazia,
   toda a rotação anterior estava medindo um caminho que não existia.
6. Custo: uma função nova. Preço, oferta e pipeline de filme: intocados.

### O QUE ESTAVA ERRADO (medido, não suposto)

`lib/seriesContinuation.ts` — `buildSeriesContinuationHref()` devolve a string
`'/studio'` quando o tema não monta prompt utilizável. Para uma **tela**, isso é
um destino aceitável. Para quem **precisa decidir**, `'/studio'` é veneno: é um
valor *truthy*, então todo `?? alternativa` a jusante morre sem nunca rodar.

Em `app/api/next-action/route.ts` a linha era
`const hrefAlternativa = motorAcessivel ? (hrefContinuar ?? hrefBarato) : null`.
Com `hrefContinuar = '/studio'`, o `?? hrefBarato` **nunca** executava, e o
evento `next_action_served` ainda rotulava o caminho como `'series'` — ou seja,
o placar dizia que a porta de série tinha sido servida quando o que foi servido
era a home do Studio.

### O QUE MUDOU

- `lib/seriesContinuation.ts`: nasce `seriesContinuationHrefOrNull()`, que
  devolve `null` quando não há episódio 2 para oferecer.
  `buildSeriesContinuationHref()` passa a **delegar** nela com `?? '/studio'` —
  os **10 chamadores de tela ficam byte a byte iguais**. Isso é deliberado:
  dois deles (`ResumeStrip`, `StudioClient`) são território do Codex nesta
  pista e não podiam ser tocados hoje.
- `app/api/next-action/route.ts`: passa a usar a variante que sabe dizer não.
- **Efeito colateral tratado no mesmo commit:** com `hrefContinuar` podendo ser
  `null` tendo filme entregue, o `primary` caía em `make_first_film` e diria
  "Make your first film" para quem **já tem filme**. Frase falsa — e a casa
  proibiu frase falsa no #5 de 02/09. Ramo novo `make_next_film`: não promete
  episódio 2 que não existe e não chama de estreante quem não é.

**SHA `8d3c6061`** (rebasado por cima do lote do Codex). Fila 0. **EM PRODUÇÃO**
até onde a sonda alcança: home 200, `/studio` 200, `/api/next-action` 401 **com
controle irmão inexistente em 404** (memória `sonda-401-exige-controle-404`).

### TESTES

`scripts/test-link-que-sabe-dizer-nao.mjs` — **17 verificações** lendo os
arquivos reais, normalizando CRLF na leitura (memória `guardiao-crlf-falso-vermelho`).
Seis mutantes aplicados e mortos: (M1) a variante volta a devolver `'/studio'`;
(M2) a rota volta a chamar a porta das telas; (M3) o `?? hrefBarato` é removido;
(M4') a guarda do ramo novo vira `true`; (M5) o piso `'/studio'` some da porta
das telas; (M6) o rótulo volta a chamar de estreante quem já tem filme.

`npx tsc --noEmit` verde — e **falsificado**: um erro de tipo proposital foi
inserido e o tsc reprovou com `TS2322` (memória `worktree-tsc-node-modules`:
exit 0 sozinho não prova nada). Typecheck repetido na **árvore combinada com o
lote do Codex** — também verde.

### O ERRO QUE EU COMETI DENTRO DESTA MESMA ROTAÇÃO (registro)

A primeira versão do guardião tinha 16 verificações e o mutante M4 **sobrevivia**:
a checagem usava `/: state === 'can_continue'[\s\S]*?make_next_film/`, e o
`[\s\S]*?` atravessava 20 linhas até encontrar o **outro** `state ===
'can_continue'` que já existia no arquivo. Regex frouxo conta texto, não prova
condição (memória `guardiao-contar-texto-nao-prova-condicao`). A guarda agora é
lida do pedaço **imediatamente antes** do ramo, sem salto possível — e o M4'
morre.

### RISCO

Baixo e limitado a uma coorte pequena: quem tem filme entregue **e** tema
degenerado passa a ver "Make your next film" em vez de "Build the next episode"
apontando para lugar nenhum. Nenhuma tela mudou. Nenhum preço mudou.

### O QUE AINDA NÃO ESTÁ PROVADO

Que o **meu SHA** está servindo. A entrega é uma rota autenticada sem marcador
público; `curl` não alcança. A prova é comportamental e depende de tráfego:
`kind: 'make_next_film'` e `href` com `src=next_action_no_seed` não existiam no
repo antes deste commit. Fecha no checkpoint.


---

## ### #18 — 11:26 BRT — a casa passa a saber que o cliente tem uma TEMPORADA, não um vídeo

### PRESS RELEASE (o que muda para o cliente)

1. Hoje, quando o filme fica pronto, a casa pergunta "quer fazer outro?" —
   e entrega um **formulário em branco**. A pessoa teria que inventar um tema
   novo, do zero, com a empolgação já passando.
2. A partir de agora a casa **afirma** em vez de perguntar: os títulos dos
   episódios **2 a 6** da mesma série já estão escritos quando o filme 1 cai.
3. O cliente deixa de ter *um vídeo* e passa a ter *uma temporada* — e a
   diferença não é estética: ninguém assina uma fábrica de coisa que já
   terminou.
4. O plano deixa de ser "60 créditos por $9.90" (unidade que ninguém sente) e
   pode passar a ser **"o resto da sua temporada"** — a rota devolve quantos
   episódios o saldo de hoje paga, calculado da fonte única de custo.
5. Preço público: **intocado**. O que muda é a moldura, não o número.
6. Custo: uma chamada de `gpt-4o-mini` (~$0,0003) por filme entregue, escrita
   uma vez e lembrada. Pipeline de qualidade do filme: não encostei.

### O QUE ESTAVA ERRADO (medido hoje, 7 dias, contas externas)

**234 cadastros → 151 fizeram o filme 1 → 114 pararam em EXATAMENTE UM → 2
pagaram.** Das 114 que pararam: **70 ainda têm saldo** para outro filme agora,
e **64 nunca bateram na parede de crédito** (`upgrade_modal_opened` = 0).
Dessas 64, **33 vieram do chatgpt** e **25 fizeram o filme nas últimas 48h**.

Elas não foram barradas. Foram embora **satisfeitas**, ~30 min depois do filme.
Toda a máquina de porta-de-saldo construída na madrugada mira as **9** que
bateram na parede — 8% do problema. As 64 não são público de campanha nenhuma.

### O QUE MUDOU

- `lib/temporada.ts` (novo, puro, sem import): o que é uma temporada, o que
  vale ser gravado, TTL de 14 dias igual ao do episódio 2 (de propósito: as
  mesmas cartas leem as duas memórias, e validades diferentes produziriam uma
  carta que nomeia o Ep2 e não sabe mais o nome do Ep3).
- `app/api/season/route.ts` (novo). **GET só lê** — nunca chama modelo, nunca
  gasta; ausência de temporada é `200 season:null`, nunca 404. **POST escreve
  uma vez** e guarda em `events` (`season_written`, chaveado por `video_id`) —
  **sem migration, sem DDL**, reversível com um `delete`.
- **Ou os cinco episódios, ou nenhum.** Temporada com buracos ("Ep2 · Ep4 ·
  Ep6") lê como defeito, não como catálogo.
- A rota devolve `episodeCost` (de `creditCostForDuration`, fonte única),
  `balance` e `affordableEpisodes`. **Não escreve preço nem nome de plano** — e
  o guardião proíbe que passe a escrever.

**SHA `8c73b24b`. EM PRODUÇÃO, E DESTA VEZ PROVADO NO SHA.**

### A PROVA DE DEPLOY QUE FALTAVA — E COMO ELA FOI FEITA

A entrega da madrugada (#16) ficou sem prova de SHA porque era uma rota
autenticada que **já existia**: 401 antes e 401 depois (memória
`sonda-401-exige-controle-404`). A `/api/season` é **rota nova**, e isso dá o
par que decide:

| momento | `/api/season` | controle irmão inexistente |
|---|---|---|
| 14:28:45 UTC (antes) | **404** | 404 |
| 14:30:04 UTC (depois) | **401** | 404 |

O controle não se mexeu; a rota nova mudou de 404 para 401. Isso prova
`8c73b24b` servindo — e, por ancestralidade, prova também o **#17**.

### TESTES

`scripts/test-temporada.mjs` — **36 verificações**. Metade **executa**
`lib/temporada.ts` (import nativo de TS no Node 24 — o **arquivo real**, não
uma cópia nem um mock) contra os modos de falha que estes modelos realmente
produzem: título repetido (inclusive só trocando a caixa), lista de 4 itens,
item sem `seed`, prosa no lugar de JSON, item excedente. A outra metade amarra
as promessas caras da rota: GET sem modelo, POST lê a memória **antes** de
gastar, `insert` único, custo da fonte única, e nenhum preço escrito.

**O teste achou um bug meu antes do push:** `texto()` removia aspas **antes**
do `trim()`, então um título que chega como `  "Assim"  ` mantinha a aspa até a
tela — `^["…]` não casa quando a string começa com espaço.

`npx tsc --noEmit` verde na árvore combinada com o lote do Codex. Guardião do
#17 continua 17/17.

### RISCO

Baixo por construção: nada consome a rota ainda. Se a temporada não nascer, a
resposta é `season: null` e **nada na casa muda**. O gasto máximo é uma chamada
de `gpt-4o-mini` por filme, e só se alguém chamar o POST.

### PRAXE — CHECKPOINT 11:38 BRT

**Placar do marco (14:00 UTC):** a janela tem 30 minutos de vida — 0 cadastros,
0 filmes, 0 checkouts, 0 pagamentos. Número honesto, não conclusão.

**Checagem zero — e ela fechou TRÊS pendências abertas:**

- ✅ **Prova do #16 fechada.** `next_action_served` com `engine_deeplink` = **11
  linhas**. O campo não existia no repo antes daquele commit — o deploy da
  madrugada está provado.
- ✅ **`fc28af0b` não era débito sem entrega.** O filme entrou: `completed`
  com URL. O item de vigia da #11 pode ser riscado.
- ✅ **O botão do episódio 2 saiu do zero.** `episode_link_clicked` = **3 em
  8h**, contra 1 em toda a história (e aquela 1 era a minha sonda). Duas são
  anônimas (deslogadas, caem no `/login`); **uma é real**: pessoa `53cef8ef`,
  chatgpt, 13:31 UTC, saldo 12.
- ⚠️ **Mas o clique real não virou filme.** `53cef8ef` clicou há ~1h e tem
  **0 vídeos depois disso**. Com 12 créditos: o Kineo 1 cabe, o Seedance 1.5
  (15cr) **não**. É exatamente o beco que o **#17** acabou de fechar — mas
  **1 pessoa não é coorte** (memória `janela-movel-congelada`), e eu não vou
  construir jogada em cima disso. Fica como o primeiro caso a reconferir.
- Cadastro sem crédito: **1 de 17**, e não é trial órfão — `granted=25 used=25`
  com **3 filmes entregues**. É alguém que gastou tudo hoje. Render preso: 0.
  `next_episode_failed`: 0.
- Cartas de hoje: `trial_lifecycle_email_sent` 56 · `checkout_recovery_emailed_v1`
  21 · `video_ready_email_sent` 19 · `next_episode_wall_emailed_v1` 18.

### PRÓXIMA JOGADA (rotação #2)

**A carta da temporada, para as 64.** Coorte já dimensionada e reservada acima.
Assunto = o **título do episódio 2** que a casa escreveu para aquela pessoa;
corpo = a temporada inteira, Ep2 em um clique, e o resto da temporada como o
que o plano compra. É a única peça que alcança as 64 hoje — elas não voltam
sozinhas e não são público de campanha nenhuma. Dry-run nominal no diário antes
do disparo.


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


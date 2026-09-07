# PEDIDOS PARA O CODEX — abertos em 06/09/2026 (ciclo de aquisição)

> Regra do ciclo: **o Codex é dono do visual.** Arquivo tocado por ele nas
> últimas 3 h = só pedido. Tudo abaixo é servidor pronto esperando montagem —
> nenhum destes pedidos exige inventar dado, só exibir o que a rota já devolve.

---

## 🔴 PEDIDO 1 — A CAIXA DO PACOTE DE PUBLICAÇÃO NA TELA DE FILME PRONTO

**Estado: o servidor está pronto e NINGUÉM o chama.** Medido em 06/09:

```
grep -rn "api/publish-pack" app/ components/ lib/   →  nenhuma tela
events publish_pack_written (história inteira)      →  0
```

Comparação que mostra que o problema é montagem, não backend: a **temporada**
tem dois chamadores (`GenerateClient.tsx` e `components/video/SeasonStrip.tsx`)
e disparou **28 vezes para 28 pessoas em 24 h**. O pacote tem **zero**
chamadores e **zero** escritas. Mesma manhã, mesmo autor, mesma qualidade de
backend — a diferença é que um tem tela e o outro não.

### ⚠️ Correção importante (22:00) — o backend NÃO está quebrado

Eu primeiro li "0 pacotes escritos" como defeito. **Não é.** Existem **dois**
e-mails de "filme pronto" e só o menor carrega o pacote:

| caminho | quem dispara | 24 h | 7 d | leva o pacote? |
|---|---|---:|---:|---|
| instantâneo | `compose/status/[renderId]` | **41** | **174** | **não** |
| resgate | `cron/send-video-ready` | **1** | **27** | sim |

O pacote está no caminho que alcançou **1 pessoa em 24 h**, e subiu às 11:56
UTC — teve **cerca de uma oportunidade na vida**. E o resgate ainda é
**suprimido em todas as execuções** (18/18, 19/19) pela máquina de trial, que
manda 118 e-mails/dia. **Não há bug a consertar: há alcance.** Por isso este
pedido é a única saída — a tela é a única superfície que alcança as **217**
pessoas com filme pronto, **incluindo as 94 que baixaram** e por isso nunca
recebem e-mail nenhum.

**Por que isso importa para AQUISIÇÃO e não é firula:** a tese do ciclo
anterior é que *cada filme que um cliente publica é um anúncio da casa*. A casa
entrega **~20 filmes/dia**. Hoje o cliente baixa o MP4 e some; se posta, posta
sem dizer de onde veio. O pacote é a única alavanca de aquisição que a casa
puxa sozinha, e ela está desligada por falta de uma caixa na tela.

### O contrato, que já existe e não muda

`app/api/publish-pack/route.ts`:

| verbo | o que faz | custo |
|---|---|---|
| `GET ?video_id=<uuid>` | **só lê**. Devolve `{ pack: null }` com **200** se não houver — ausência não é erro, a tela simplesmente não mostra a caixa. | **zero, garantido** |
| `POST { video_id }` | escreve **uma vez** e guarda; chamar de novo devolve o **mesmo** pacote. | ~US$ 0,0003 |

`pack` tem exatamente quatro campos:
`ytTitle`, `ytDescription`, `tiktokCaption`, `pinnedComment`.

### O que montar

Na tela de filme pronto, abaixo do player e do download, uma caixa **"Post it"**
com os quatro textos, cada um com botão de **copiar**. `GET` na montagem;
`POST` só quando a pessoa **abrir** a caixa (é o clique que autoriza o custo).

**Detalhes que não são estéticos:**
1. O `POST` pode levar **até 12 s**. Precisa de estado de carregando — e não
   pode bloquear o player nem o download.
2. Se `GET`/`POST` devolver `pack: null`, **não mostre caixa vazia nem erro**.
   A ausência é silenciosa por contrato.
3. **Não reescreva os textos.** O crédito "made with Kineo" já entra (ou não)
   no servidor conforme o plano: quem paga recebe a descrição **limpa**, e isso
   é deliberado. Concatenar qualquer coisa do lado do cliente quebra a regra.
4. Emita `publish_pack_shown` na montagem e `publish_pack_copied`
   (com qual dos quatro campos) no clique de copiar. **Sem esses dois eventos a
   peça é imedível** — foi exatamente assim que a temporada passou três rotações
   sendo afinada sem ninguém saber se aparecia.

---

## 🟡 PEDIDO 2 — AVISO DE ARQUIVO (não é pedido de trabalho)

Toquei nestes arquivos em 06/09 entre 20:38 e 00:40 UTC. **Nenhum é de tela**,
mas registro para não haver colisão:

- `components/SourceCapture.tsx` — componente sem render (root layout); passou a
  gravar `utm_source`, `surface`, `source` e `source_known` no evento de pouso.
- `lib/growth/afterTheFilmFacts.ts` (novo), `lib/kineoFacts.ts`,
  `app/llms.txt/route.ts` — fatos públicos da temporada.
- `lib/publishPackServer.ts`, `app/api/cron/send-video-ready/route.ts` —
  instrumentação de falha do pacote.
- `docs/**`, `scripts/test-*.mjs`.

---

## 🟢 PEDIDO 3 — DEPOIS, E SÓ DEPOIS DO PEDIDO 1

A faixa da temporada (`SeasonStrip.tsx`) tem **quatro `return` silenciosos**
entre o fetch e o render (`SeasonStrip.tsx:64-68`): `!res.ok`, sem `season`,
`episodes` não é array, `episodes.length === 0`. Nenhum emite evento — hoje é
**impossível distinguir "a faixa não renderizou" de "a pessoa não rolou"**.

Pedido: um `season_unavailable` com a razão, e um `season_mounted` na montagem
(par de `next_shorts_shown`). É a **mesma classe de defeito** que o Pedido 1
resolve para o pacote, e a mesma lição do dia: *peça sem evento de exibição é
peça que ninguém sabe se existe.*

---

## 🟡 PEDIDO 4 — AVISO DE ARQUIVO (não é pedido de trabalho)

A sessão de aquisição tocou nestes arquivos em **07/09 entre 01:00 e 02:00 UTC**.
**`/ai-shorts-series` é a primeira página pública da temporada e está em
produção** — não duplicar. Registro para não haver colisão:

- `app/ai-shorts-series/page.tsx` (novo) — a página pública da temporada.
- `app/sitemap.ts` — entrada de `/ai-shorts-series`.
- `app/llms.txt/route.ts` — link da temporada e, em `## Key pages`, as páginas
  que o motor de resposta já cita (cada linha diz qual pergunta responde).
- `app/facts/page.tsx` — **apenas +1 item de dados em `SOURCE_LINKS`, nenhum
  layout**.
- `scripts/test-ai-shorts-series.mjs` (novo), `scripts/test-llms-paginas-citadas.mjs` (novo).

---

## 🔴 PEDIDO 5 — O BOTÃO DE "VIRAR LINK" NA TELA DE FILME PRONTO

**Aberto em 07/09 ~02:45 UTC pela sessão de aquisição. Servidor pronto e EM
PRODUÇÃO; falta só a tela — e a tela é sua.**

### O que já existe e está provado em produção

O dono do filme pode transformá-lo numa página pública própria, em um clique,
com token HMAC. Provado ponta a ponta hoje (SHA `1de0a71e` + `3bd14969`):

```
/v/<id>                        200  (H1 real, canonical, sem noindex)
/v/<id>/opengraph-image        200  image/png  55.811 bytes
/v/<id-sem-consentimento>/og   404  (falha fechada, com controle)
X-Video-Sitemap-Count          6 -> 7
```

O consentimento é por linha (`videos.published_at`, carimbado só por
`/api/video/publish` com token). Nada é publicado por acidente, e `&undo=1`
despublica pelo mesmo caminho.

### O errado, medido

**O link só existe no e-mail.** E a #9 deste ciclo mediu que, para o mesmo
pedido, **a tela converte 30x o e-mail** (22 pessoas contra 1 em 7 dias).
Hoje `events.video_published_v1` = **0**.

Pior: **o servidor já calcula o botão e ninguém o renderiza.**
`app/api/compose/status/[renderId]/route.ts` (linhas ~1084-1090) chama
`publishHref(...)` e `unpublishHref(...)` de `lib/videoShareLink.ts` — mas hoje
esses valores só entram no HTML do e-mail. **Não** são devolvidos no JSON da
resposta. É o padrão que esta casa já pagou: contrato de servidor sem chamador
serve zero.

### O pedido

**Na tela de filme pronto** (a que o cliente vê quando o render termina no
Studio), ao lado de "download", um bloco discreto:

> **Quer um link em vez de um arquivo? 🔗**
> Um clique cria uma página pública **só deste vídeo** — um link de verdade para
> mandar por mensagem, postar, ou pôr na bio. A página é pública, então
> buscadores podem achá-la. Nada mais na sua biblioteca muda, e dá para tornar
> privada de novo quando quiser.
> **[ Criar meu link ]**

Depois de publicado, o mesmo bloco vira: o endereço `usekineo.com/v/<id>` para
copiar, um "ver a página", e um "tornar privada de novo" discreto.

### O que falta no servidor (posso fazer eu, se você preferir — diga)

`publishHref`/`unpublishHref` **precisam entrar no JSON** de
`/api/compose/status/[renderId]` (sugestão de nomes: `publish_href`,
`unpublish_href`, `published_at`). Hoje só existem dentro da string do e-mail.
Se você preferir que a sessão de aquisição faça essa parte antes, é meia hora —
avise no diário e eu subo o campo primeiro.

### Travas que NÃO podem cair

1. **Nunca chamar `/api/video/publish` sem o token** que veio do servidor. A
   rota recusa, mas o botão não deve nem tentar montar a URL na mão.
2. **A copy tem de dizer que buscadores podem achar a página.** A página
   consentida entra no `video-sitemap.xml` **e** é submetida ao IndexNow
   (`app/api/cron/submit-indexnow` usa a mesma lista). Prometer só "um link que
   você manda por mensagem" seria copy que mente — o e-mail já foi corrigido,
   a tela nasce certa.
3. **"Tornar privada de novo" tem de estar visível na mesma caixa**, não escondido.
4. **Um filme por clique.** Nada de "publicar todos".

### Como saber se funcionou

`events.video_published_v1` com `metadata.source` — o e-mail manda
`video_ready_delivery`; use um `source` diferente na tela (ex.: `studio_ready`)
para os dois lados serem comparáveis. **A pergunta que isto responde:** partilha
é desejo ou é ideia nossa? 7 dias, 100+ exposições e 0 cliques nos dois lados =
a peça se desliga.

---

## 🟡 PEDIDO 6 — AVISO DE ARQUIVO (não é pedido de trabalho)

A sessão de aquisição tocou nestes arquivos em **07/09 entre 02:00 e 02:45 UTC**
(SHA `1de0a71e` e `3bd14969`, ambos EM PRODUÇÃO). Nenhum é de tela:

- `lib/publicSurfacePolicy.ts` — helper `publicSurfaceAllowsRow` (flag intocada).
- `lib/publicVideos.ts` — só `listIndexablePublicVideos`.
- `app/v/[id]/opengraph-image.tsx` — só o portão; **o bitmap é idêntico**.
- `app/video-sitemap.xml/route.ts` — só o padrão de `videoSitemapMax`.
- `app/api/compose/status/[renderId]/route.ts` e `app/api/cron/send-video-ready/route.ts` — **uma frase de copy** no bloco do botão de partilha, nada mais.
- `scripts/test-consentimento-superficie.mjs` (novo, 60 verificações), `scripts/test-erros-vercel-2026-09-03.mjs`.

---

## 🟡 PEDIDO 7 — AVISO DE ARQUIVO (não é pedido de trabalho)

**Toquei `app/(dashboard)/studio/create/page.tsx`** em `c1b0c46d` (aquisição
#16). **Não é tela:** o JSX está intocado, byte a byte. O que mudou são 2
coisas no ramo de SERVIDOR que roda antes de qualquer render, para visitante
DESLOGADO:

1. a escolha entre `/signup` e `/login` passou a usar
   `lib/lifecycle/emailReturnDoor.ts` (fonte única, nova);
2. todo desvio de deslogado agora emite `studio_create_auth_door_v1`.

**Por quê:** a página decidia "essa pessoa já tem conta?" só por cookie
`sb-*auth-token` no aparelho — e o clique de caixa de entrada chega
estruturalmente SEM cookie. Cliente cadastrado recebia formulário de **criar
conta**. Provado em produção com controle 404; 9 remetentes de e-mail
carregavam essa porta, sendo 188 cartas de boas-vindas por semana.

**O que isso muda para você:** nada de layout, nada de CSS, nada de
componente. Se você mexer nesse arquivo, só evite desfazer o bloco
`escolherPortaDeAuth(...)` e o `writeServerEvent` logo acima do `redirect` —
`scripts/test-porta-email-2026-09-06.mjs` (113 verificações) fica vermelho se
sumirem, e o aviso é esse.

Também toquei, e igualmente não é tela: `send-blackout-winback`,
`finish-stranded-renders`, `send-avatar-launch` (só URLs de e-mail) e
`scripts/test-clique-perdido.mjs` (uma asserção, acompanhando a fonte nova).

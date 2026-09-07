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

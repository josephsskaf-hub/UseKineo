# O SEARCH CONSOLE ESTAVA CEGO HÁ 13 DIAS. ELE TINHA UM NÚMERO PARA CONTAR.

Medido em 12/08/2026 ~21:1x–21:5xZ, sessão do Chrome do fundador conectada
(`sc-domain:usekineo.com`). **É a primeira leitura de GSC desde 30/07** — a
frente estava marcada como cega no PROMPT-DIARIO desde então ("nenhum dado de
Search Console, consultas ou CTR de marca"; virou "o gate nº 0 por ser o item
mais barato da lista inteira"). Custou 6 chamadas de navegador.

---

## 1. O placar de SEO, hoje contra a baseline de 29/07

| Métrica | 29/07 (baseline) | 12/08 | Δ |
|---|---:|---:|---|
| Páginas indexadas | 55 | **88** | +33 |
| **"Detectada, mas não indexada"** | **21** | **704** | **+683 (33×)** |
| Não indexadas (total, 6 motivos) | — | 732 | — |
| Cliques de busca (28d) | 8 *(história inteira)* | **15** | +7 |
| Impressões (28d) | — | 729 | — |
| CTR média (28d) | — | 2,1% | — |
| Posição média (28d) | — | **36** | — |

A linha que decide o documento é a segunda. A armadilha nº 2 do PROMPT-DIARIO
diz, desde 29/07:

> *"Não publique página nova de SEO enquanto houver página existente que o
> Google nunca rastreou ('Discovered – not indexed'). Isso dilui crawl budget."*

Ela foi escrita quando o número era **21**. Hoje é **704**, e ninguém viu
acontecer porque a única superfície que reporta esse número esteve cega as duas
semanas inteiras em que ele multiplicou por 33.

---

## 2. Quem são os 704 — e a resposta não é "as páginas de SEO"

GSC, drilldown de "Detectada, mas não indexada no momento":

- **Detectada pela primeira vez: 11/07/2026.**
- A curva de páginas afetadas é plana e rasa até ~08/07, dá um degrau e satura
  em ~700 a partir do fim de julho.
- Os 10 exemplos da primeira página, em ordem alfabética, são **todos**
  `/alternatives/*`: `bigmotion`, `capcut`, `crayo`, `d-id`, `faceless-so`,
  `faceless-video`, `heygen`, `kapwing`, `klap`, `luma`.
- Coluna "Último rastreamento" de todos os dez: **N/D**. Não é "rastreou e
  achou ruim". É **nunca rastreou**.

São 27 páginas `/alternatives/*` escritas à mão, de intenção comercial —
a única família de páginas da casa que fala com quem já está comparando
ferramentas para comprar. O Google as conhece e não gasta rastreamento nelas.

A causa não está nelas. Está no que entrou na fila junto.

---

## 3. A fonte: 79% de tudo que a casa pede ao Google são páginas de vídeo

GSC › Sitemaps, ambos lidos por último em 11/08:

| Sitemap | Páginas encontradas |
|---|---:|
| `https://www.usekineo.com/sitemap.xml` | 164 |
| `https://www.usekineo.com/video-sitemap.xml` | **602** |
| | **766 total** |

**602 de 766 = 78,6% do orçamento de rastreamento que a empresa pede são
`/v/[id]`** — páginas geradas automaticamente, uma por vídeo concluído de
usuário.

O cabeçalho de `app/video-sitemap.xml/route.ts` explica quando isso nasceu:

> *"PUSH #96+ — Real video sitemap. Before: this route listed only the 4
> hardcoded PUBLIC_EXAMPLES […] Now it emits the examples PLUS every `/v/[id]`
> page that clears the quality gate"* — descrito à época como *"the largest
> untapped indexable surface the product has"*.

A data em que o Google detectou os primeiros não-indexados — **11/07** — é a
data em que essa torneira abriu.

---

## 4. O número que mata a alavanca

Filtro de desempenho do GSC em páginas contendo `/v/`, últimos 28 dias:

```
Total de cliques ....... 0
Total de impressões .... 0
CTR média .............. 0%
Posição média .......... 0
Top consultas .......... Nenhum dado
```

**Zero impressões.** Não zero cliques sobre alguma visibilidade — zero
visibilidade. Combinado com "último rastreamento: N/D", a leitura é única: as
602 páginas nunca foram rastreadas, nunca foram indexadas, nunca apareceram uma
única vez, em 32 dias.

**REGRA DE MORTE do PROMPT-DIARIO:** *"Se uma alavanca não moveu o número dela
em 7 dias, mate a alavanca."* Esta teve 32 dias e quatro zeros.

E ela não é neutra enquanto não move: ocupa 79% do pedido de rastreamento de um
domínio cujas páginas comerciais escritas à mão estão, no mesmo relatório,
marcadas como nunca rastreadas.

⚠️ **Onde isto é inferência, e não medição.** Que os 602 `/v/` sejam a *causa*
de as 27 `/alternatives/*` não serem rastreadas é a hipótese padrão de
orçamento de rastreamento, não um fato que o GSC afirme. O que está **medido**
é: (a) 602 URLs pedidas, (b) zero rastreadas, zero impressões em 32 dias,
(c) 704 URLs conhecidas e nunca rastreadas, (d) a coincidência de data
(11/07). A ação abaixo é justificada só por (b) — desligar algo que entrega
quatro zeros não precisa que (a) cause (c). Se causar, o ganho é bônus, e o
teste está na seção 6.

---

## 5. O que foi entregue — `[commit] KINEO-CRAWL-BUDGET-2026-08-12`

`app/video-sitemap.xml/route.ts`, +33/−1, arquivo único:

```ts
function videoSitemapMax(): number {
  const raw = process.env.KINEO_VIDEO_SITEMAP_MAX
  if (!raw) return 0
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n <= 0) return 0   // env ilegível falha FECHADA
  return Math.min(n, SITEMAP_MAX_VIDEOS)
}
```

e, no `GET`, `maxVideos > 0 ? await listIndexablePublicVideos(maxVideos) : []`.

**Padrão 0** = o sitemap volta a pedir só os `PUBLIC_EXAMPLES`, que é o estado
anterior ao PUSH #96. `sitemap.xml` (164 páginas, incluindo as 27
`/alternatives/*`) fica sendo ~100% do pedido.

Três decisões de desenho, todas por causa de uma regra já paga neste
repositório:

1. **Env var, não constante.** Aplicando a lição de 11/08 (*"quando o deploy
   está travado, o trabalho que vale é o que muda o CUSTO de agir"*): depois
   deste push, religar ou dosar a torneira é **uma variável na Vercel** e nunca
   mais depende de push. A rota já é `force-dynamic`, então a env é lida a cada
   request — não precisa nem de redeploy.
2. **Falha fechada.** Env ausente, vazia, `"abc"`, `"0"` ou negativa → 0. Uma
   env digitada errado não pode religar 602 URLs em silêncio.
3. **Curto-circuito antes do Supabase.** Com 0 não há query: `.limit(0)` é
   comportamento não especificado no PostgREST e não vale um round-trip para
   descobrir qual é.

**O que isto NÃO faz, de propósito:** não desindexa, não apaga, não põe
`noindex` em nada. Cada `/v/[id]` continua no ar e continua decidindo o próprio
robots em `lib/publicVideos.ts`. Retira-se o **pedido** de rastreamento, que é
a coisa reversível.

**Confirmações mecânicas:** `tsc` escopado **falsificado** — erro plantado
(`const raw: number = process.env…`) → `error TS2322` na linha 130 + `TS2345` na
132; restaurado → **0 erros**. EOL conferido **no HEAD** (LF no HEAD, LF no
disco, 0 CRLF). `git diff --stat` = 1 arquivo, +33/−1. Nenhum preço, evento,
rótulo, teto ou rota de checkout tocado.

---

## 6. O teste que tem direito de me contradizer

Se a hipótese de orçamento de rastreamento estiver certa, **7–14 dias depois do
deploy** com `KINEO_VIDEO_SITEMAP_MAX` ausente:

- "Detectada, mas não indexada" cai de **704** em direção a ~100;
- pelo menos uma `/alternatives/*` sai de "último rastreamento N/D";
- páginas indexadas sobem de **88**.

Se em 14 dias os 704 não se moverem, **a hipótese estava errada** e o que
sobrou ainda assim foi correto: desligamos 602 URLs que entregaram zero em 32
dias. Registrar o resultado aqui nos dois casos — inclusive o feio.

---

## 7. O achado de aquisição que estava embaixo, e é o mais acionável

Páginas por impressão, 28 dias (as duas primeiras são 44% de toda a
visibilidade de busca do domínio):

| página | impressões | cliques | CTR | posição |
|---|---:|---:|---:|---:|
| `/how-much-do-youtube-shorts-pay` | **224** | **0** | 0% | **42,4** |
| `/can-you-monetize-ai-videos` | 99 | 0 | 0% | — |
| `/free-script-generator` | 11 | **5** | **45,5%** | **18,3** |
| `/` (home) | 58 | 4 | — | — |
| `/pricing` | 77 | 1 | — | — |

**Regra Zero aplicada e paga:** antes de propor "escrever a página de *how much
do YouTube Shorts pay*", grep no repo — `app/how-much-do-youtube-shorts-pay/`
**já existe**. A página não falta; ela está na **página 5 do Google** (posição
42,4) para **75 consultas distintas** da mesma pergunta:

```
how much do youtube shorts pay ........ 13 impressões
how much youtube pays for shorts ....... 8
how much does youtube shorts pay ....... 8
how much youtube short pay ............. 7
how much youtube shorts pay ............ 5
does youtube pay for shorts ............ 4
how much youtube shorts pay for 1000 views  4
```

**0 clique em 224 impressões na posição 42 não é defeito de título — é o
esperado.** Mexer em `<title>` ou meta description ali não move nada; ninguém
vê a página 5. Quem propuser "otimizar o CTR dessa página" está propondo
trabalho que a posição garante que não rende.

O contraste é a linha que vale dinheiro: **`/free-script-generator` tem 45,5%
de CTR na posição 18,3** — a melhor taxa da casa, num volume ridículo de 11
impressões. É uma **ferramenta**, não uma resposta.

**Hipótese (não testada, registrada para não virar fato por repetição):** a
Kineo perde consultas de RESPOSTA — onde compete com YouTube, Forbes e
agregadores de autoridade — e ganha consultas de FERRAMENTA, onde a
concorrência é rasa e a intenção já é de usar algo. Se ela se sustentar, o
cluster editorial de dinheiro é um investimento em posição 40 e o cluster de
ferramenta é onde a mesma hora rende. **Não vale sprint enquanto o número dos
704 não se mexer** — é ele que decide se qualquer página nova é rastreada.

---

## 8. O que NÃO foi feito, e por quê

- **Nenhuma página nova de SEO.** Seria a armadilha nº 2 executada com o número
  em 704 — exatamente o cenário que ela descreve.
- **Nenhum diretório submetido.** Chrome está conectado, mas submeter formulário
  em nome do fundador é ação que exige o "sim" dele; execução agendada não tem
  quem aprove. Fica de gate mastigado, não de tarefa começada pela metade.
- **Nenhum `noindex` em `/v/[id]`.** Retirar o pedido de rastreamento é
  reversível; desindexar não é. Uma variável por vez.
- **Nada de preço, teto, marca d'água, tráfego pago ou dinheiro.**

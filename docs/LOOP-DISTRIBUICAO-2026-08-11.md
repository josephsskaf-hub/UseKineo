# LOOP DE DISTRIBUIÇÃO — 918 vídeos, 3 posts

`KINEO-DISTRIBUTION-LOOP-2026-08-11`

O produto É o canal. Todo vídeo do tier grátis sai com `usekineo.com/free`
queimado no frame, e toda descrição auto-gerada carrega o mesmo link — cada
Short publicado é um anúncio permanente que a Kineo não paga. A empresa gerou
918 vídeos. `posted_shorts` tem **3 linhas**, e **duas delas são do fundador**.

O canal nunca foi ligado. Este documento mede onde ele morre, corrige o degrau
de maior perda, instrumenta os degraus que eram cegos e calcula o que vale um
vídeo postado — para o fundador decidir se investe mais nisso.

---

## 1. O funil, degrau a degrau

Fonte: tabela `events` + `videos` + `posted_shorts` + `post_to_earn_claims`,
consultadas em 11/08/2026. Série histórica desde 09/06/2026.

| # | Degrau | Eventos | Pessoas | % do degrau anterior | % dos 918 |
|---|---|---|---|---|---|
| 1 | Vídeo gerado (`videos`) | **918** | 401 | — | 100% |
| 2 | Geração concluída (`generate_completed`) | **626** | 322 | 68,2% | 68,2% |
| 3 | Tela do vídeo pronto vista (`video_ready_viewed`, só desde 03/08) | **188** | 98 | — | — |
| 4 | Clique em baixar (`video_download_clicked`, só desde 05/08) | **115** | 40 | — | — |
| 5 | **Download entregue** (`video_downloaded`) | **365** | **99** | 58,3% do (2) | 39,8% |
| 6 | Convite para postar **VISTO** | *não existia evento* | — | **cego** | **cego** |
| 7 | Campo de colar link **tocado** | *não existia evento* | — | **cego** | **cego** |
| 8 | Link enviado (`posted_short_submitted`) | **1** | **1** | **0,27% do (5)** | **0,11%** |
| 9 | Linha em `posted_shorts` | **3** | 2 | — | 0,33% |
| 10 | Recompensa avaliada no servidor (`post_to_earn_*`) | **0** | 0 | — | — |
| 11 | Chegada pela marca d'água (`/free`) | *não existia evento* | — | **cego** | **cego** |
| 12 | Cadastro com `signup_utm_source='watermark'` | **0** de 1.068 perfis | 0 | — | — |

Caminho paralelo, o do e-mail:

| Degrau | Número | Observação |
|---|---|---|
| `post_nudge_sent` | **69** (69 pessoas, 06–10/08) | e-mail pedindo o link, dias depois |
| Clique no e-mail | *não existia evento* | **cego** |
| Colagem atribuível ao nudge | **0** | a única colagem da história é de 01/08, **antes** do nudge existir |

E o caminho de 1 clique, o do upload direto:

| Degrau | Número | Observação |
|---|---|---|
| `youtube_connect_started` | 37 (12 pessoas) | |
| `youtube_connected` | 3 (2 pessoas) | |
| Clique em "Post to YouTube" | *não existia evento* | **cego** |
| Upload concluído | *não existia evento* | **cego** — as 2 linhas `direct_upload` foram achadas no banco, não na analytics |

### O maior degrau de perda

**Download entregue → link enviado: 365 → 1. Perda de 99,7%.**
Em pessoas: **99 → 1**.

E era, sozinho, o único degrau do produto inteiro **sem um único evento de
impressão**. Não dava para responder a pergunta que decide tudo: *ninguém cola
o link porque o convite não convence, ou porque ninguém nunca chega a vê-lo?*

A auditoria do código responde: **quase ninguém vê.** O convite existe na tela
de sucesso desde 31/07, mas mora **~600 linhas de JSX abaixo do botão de
download**, depois do paywall da marca d'água, depois do card de share
(WhatsApp/X/copiar link) e depois do botão "Build the next episode". No segundo
em que o arquivo chega ao computador da pessoa — o único segundo em que ela tem
o Short na mão e a atenção livre — a página não fazia **nada** a respeito de
postar. O único lembrete chegava por e-mail, dias depois, e converteu 0 de 69.

---

## 2. Auditoria do caminho inteiro

| Peça | Onde | Estado antes desta sprint |
|---|---|---|
| Botão "Post to YouTube" | `app/(dashboard)/generate/GenerateClient.tsx` → `app/api/youtube/upload/route.ts` | **Existe e funciona.** É 1 clique de verdade (com um `<select>` de visibilidade que já vem em `public`). Mas exige OAuth antes, aparece como terceira opção da tela, e era **100% não instrumentado**. |
| Campo "cole o link" no `/generate` | `GenerateClient.tsx` → `app/api/posted-shorts/route.ts` | Existe. Fora da tela no momento certo. Sem evento de impressão nem de foco. |
| Campo "cole o link" no `/wall` | `components/wall/WallSubmitLink.tsx` (mesmo endpoint) | Existe. **Zero eventos** — o componente inteiro era mudo. |
| `send-post-nudge` | `app/api/cron/send-post-nudge/route.ts` | Funciona, manda para `/wall?...#paste` com `utm_campaign=post_nudge`. 69 envios, 0 colagens, e nenhum evento de clique para saber onde parou. |
| Post to Earn (3 créditos) | `lib/postToEarn.ts` (regras) + `lib/postToEarnGrant.ts` (motor) | Corrigido em 08/08 (o caminho `direct_upload` não chamava o motor). Motor sólido: 7 travas, dedupe global, disjuntor de $10/dia. |
| Landing da marca d'água | `app/free/route.ts` | Redirect com cookie de first-touch. **Nenhuma escrita** — por design documentado. Efeito colateral: o numerador de "quanto vale postar" era invisível. |

### `YOUTUBE_API_KEY` — ainda falta, e o impacto é maior do que parecia

Confirmado por `grep` no repositório e pelo estado do banco: a chave **não está
no ambiente**. Consequência exata, lendo `verifyKineoAttribution`:

- `source='direct_upload'` → `verified: true` sem nenhuma chamada de rede
  (nós renderizamos e nós publicamos; a autoria é provada por construção).
  Crédito **instantâneo**, sempre.
- `source='pasted'` → sem a chave, retorna `no_youtube_api_key` →
  `verified: false` → claim entra como **`pending`**. Ou seja, **hoje 100% dos
  links colados esperam revisão humana. Nenhum é instantâneo.**

E a fila não estava sendo trabalhada. `post_to_earn_claims`:

| status | source | verification | créditos | data |
|---|---|---|---|---|
| `pending` | `pasted` | `no_youtube_api_key` | 0 | **01/08** |
| `granted` | `direct_upload` | `direct_upload` | 3 | 05/08 |
| `granted` | `direct_upload` | `direct_upload` | 3 | 06/08 |

A única pessoa que usou o caminho colado está esperando há **10 dias** por uma
tela que prometia 24h. **Nenhum crédito foi concedido por este trabalho** — a
decisão é do fundador (ver §5).

---

## 3. A correção: o handoff pós-download

Prioridade seguida à risca — consertar o caminho existente, não inventar
feature nova.

### (a) O convite passa a existir no segundo em que a pessoa tem o arquivo

`handleDownload` já sabia distinguir download **entregue** (blob salvo ou aba
aberta) de download **perdido** (popup bloqueado). Essa informação agora arma o
handoff: com o arquivo na mão, a seção de postar é **rolada para o centro da
tela**, ganha uma borda verde e troca o título.

O título muda porque a pergunta muda. *"Published it? Paste the link"* é uma
pergunta para quem talvez já tenha postado; um segundo depois do download a
resposta é obviamente "ainda não". O texto do momento é
**"The file is yours. Now post it."**

- Vale para **qualquer** download entregue, não só o com marca d'água: quem
  exporta limpo também alimenta `posted_shorts` e o `/wall`, e é o mesmo clique.
- `popup_blocked` / `unavailable` continuam de fora — arrastar a tela de alguém
  que ficou **sem** o arquivo é insulto.
- Zera a cada nova geração (`resetPostLoopHandoff`), senão o segundo vídeo da
  mesma aba nunca receberia o convite — e o segundo vídeo é justamente o da
  pessoa mais provável de postar.

### (b) Postar é 1 clique, e a tela agora diz qual caminho é o de 1 clique

O botão "Post to YouTube" sempre foi o caminho de 1 clique, mas a tela nunca
disse que ele é **melhor**. Passa a dizer, e a frase é literalmente verdadeira:

> *Post it through Kineo and the 3 credits are instant — we published it, so
> there is nothing left to verify.*

Isso não é copy de venda: é a descrição do `if (source === 'direct_upload')
return { verified: true }`. E, como efeito colateral honesto, empurra a pessoa
para o caminho que não depende de chave de API nenhuma.

### (c) O que a tela promete passa a ser verdade

Nova frase, no `/generate` **e** no `/wall`, **antes** de a pessoa colar:

> *Pasted links need the Kineo credit link in the description. When we can't
> confirm it automatically, a human reviews it within 24h and the credits land
> then — not instantly.*

O `POST_TO_EARN_PITCH` antigo dizia "verified links are credited instantly; the
rest are reviewed within 24h" — verdadeiro mas ambíguo, porque escondia que
**hoje "the rest" é 100% dos casos**.

### O que NÃO foi feito

Nenhuma feature nova. Nenhum preço, crédito, entitlement, plano ou trava de
fraude foi tocado. Nenhuma tabela nova, nenhuma rota nova, nenhum endpoint
alterado. Os números do Post to Earn (3 créditos, 2/semana, teto de 30, teto
global de 100/dia) estão exatamente onde estavam.

### Kill-switch

`NEXT_PUBLIC_KINEO_POST_HANDOFF=off` desliga os três efeitos do handoff (scroll,
título, borda) e a tela volta ao comportamento de antes da sprint.

**Duas coisas não são gateadas pela flag, de propósito:**

1. **a instrumentação** — gatear a medição junto com o experimento é desligar o
   velocímetro ao tirar o pé do acelerador;
2. **a copy verdadeira** — um kill-switch que reintroduzisse a promessa
   enganosa não é um kill-switch, é um botão de mentir de novo.

---

## 4. Instrumentação: o que era cego passa a ter número

| Evento novo | Onde | Degrau que passa a existir |
|---|---|---|
| `post_invite_surfaced` | `/generate`, no download entregue | o convite foi **oferecido** (uma vez por pessoa, não por clique) |
| `post_invite_viewed` | `/generate`, IntersectionObserver a 50% | o convite foi **visto** — o degrau 6 da tabela |
| `post_invite_paste_focused` | `/generate`, `onFocus` do campo | tocou o campo e desistiu ≠ nunca olhou |
| `youtube_upload_started` | `/generate`, clique no botão | o caminho de 1 clique deixa de ser cego |
| `youtube_upload_succeeded` | `/generate` | inclui `reward_outcome`: se aparecer algo diferente de `granted`, a promessa "instantâneo" quebrou |
| `youtube_upload_failed` | `/generate` | separa "não quis" de "tentou e falhou" |
| `wall_paste_invite_viewed` | `/wall` | chegada no destino do e-mail (`prefilled` separa o tráfego do nudge) |
| `wall_paste_focused` | `/wall` | |
| `wall_paste_auth_required` | `/wall` | **o degrau mais suspeito**: quem vem do e-mail chega deslogado |
| `wall_paste_failed` | `/wall` | |
| `watermark_landing` | `app/free/route.ts`, no first-touch | **a chegada pela marca d'água** — sem isto, o §5 nunca teria numerador |

### Uma contagem dupla corrigida no caminho

O cliente emitia `post_to_earn_claimed` / `post_to_earn_rejected` com os
**mesmos nomes** que `lib/postToEarnGrant.ts` já grava no servidor. Cada claim
teria virado duas linhas, e a taxa de concessão passaria a depender de quantos
navegadores conseguiram completar o POST de analytics. O cliente agora emite
`post_to_earn_outcome_viewed` — que mede outra coisa (a pessoa **viu** o
desfecho) — e o estado `pending` deixa de ser reportado como recusa, porque não
é. Nunca mordeu porque a série tem 0 linhas; morderia no primeiro dia em que o
loop funcionasse.

---

## 5. Quanto vale um vídeo postado

Números reais, 11/08/2026:

| Entrada | Valor | Fonte |
|---|---|---|
| Perfis | 1.068 | `profiles` |
| Perfis que pagaram | 8 (**0,75%**) | `profiles.has_paid` |
| Últimos 30 dias | 394 cadastros, 3 pagantes (0,76%) | idem — a taxa é estável |
| Menor plano pago | $9,90/mês ($4,90 no 1º mês) | `lib/pricing` |
| Custo direto de 1 post recompensado | 3 créditos ≈ **$0,30** | a conta da própria `lib/postToEarn.ts` |
| Cadastros atribuídos à marca d'água | **0 de 1.068** | `signup_utm_source='watermark'` |

**Valor esperado de 1 cadastro** = 0,75% × $9,90 ≈ **$0,074**.

**Break-even de um Short postado** = $0,30 ÷ $0,074 ≈ **4,0 cadastros por
Short**.

A marca d'água é **texto queimado no frame**: não é clicável, tem que ser
**digitada**. A 1 cadastro por 1.000 espectadores, o break-even sai em **~4.000
views por Short** — acima do que um canal novo entrega (100–500 views). **Um
Short isolado não paga os 3 créditos só pela marca d'água.**

O que paga são duas outras coisas, ambas já construídas e ambas de graça:

1. **A descrição auto-gerada carrega `usekineo.com` clicável**, e no caminho de
   upload direto ela é publicada automaticamente. Um link clicável não compete
   com uma URL digitada — é outra ordem de grandeza. É mais um motivo para o
   handoff empurrar o botão em vez do formulário.
2. **Escala e permanência.** Um Short postado não expira. Se 10% dos 918 vídeos
   tivessem sido postados, seriam ~90 anúncios rodando para sempre; a 4.000
   views de vida cada, ~360 mil impressões acumuladas — ~360 cadastros e ~2,7
   pagantes ao preço de ~$27 em créditos. **É a única linha de aquisição da
   empresa cujo custo marginal por impressão é zero.**

**Teto de risco, se o loop pegar:** o teto vitalício de 30 créditos/usuário e o
disjuntor global de 100 créditos/dia limitam o pior caso a ~$300/mês — e nesse
cenário a Kineo teria ganhado ~1.000 Shorts publicados no mês. Ao valor de
$0,074/cadastro, ~$300 empatam com ~4.050 cadastros — de novo, ~4 por Short. A
conta fecha na mesma constante, o que é um bom sinal de que ela não foi
inventada.

**O número que faltava para tudo isso sair do papel** é quantas pessoas de fato
chegam por `/free`. Até hoje: zero medível — não porque ninguém chegou, mas
porque a rota não escrevia nada. Com `watermark_landing`, a partir de agora dá
para calcular o valor real em vez de estimá-lo.

---

## 6. O que depende do fundador

1. **`YOUTUBE_API_KEY` no ambiente da Vercel.** YouTube Data API v3, gratuita,
   10.000 unidades/dia — uma leitura de `snippet` custa 1. Sem ela, **todo**
   link colado vira revisão manual. Com ela, o caminho colado passa a creditar
   na hora quando a descrição tem o credit link, e a fila `pending` some.
2. **A claim parada desde 01/08.** Uma pessoa colou um link, fez tudo certo, e
   está esperando há 10 dias por uma tela que prometia 24h. Nenhum crédito foi
   concedido por este trabalho — conceder é decisão de quem paga a conta.
3. **Decidir se o e-mail `send-post-nudge` continua.** 69 envios, 0 colagens.
   Com os eventos novos (`wall_paste_invite_viewed`, `wall_paste_auth_required`)
   dá para saber, em uma semana, se o problema é o e-mail, o clique, ou o login
   no meio do caminho — e aí matar ou consertar com base em número.

---

## 7. Verificação

- `npx tsc --noEmit -p tsconfig.json` → **EXIT=0**, sem saída.
- **tsc falsificado**: com um erro deliberado injetado em `lib/flags.ts`
  (`const __falsify: number = POST_HANDOFF_ENABLED`), o mesmo comando devolveu
  `TS2322` e **EXIT=2**; removido o erro, voltou a **EXIT=0**. O typecheck está
  de fato olhando para os arquivos alterados.
- **EOL**: todos os cinco arquivos alterados são LF no `HEAD` e continuam LF.
- **Revisão adversarial, 2 passadas.** Achados e corrigidos antes do commit:
  1. o handoff não zerava entre gerações — o segundo vídeo da mesma aba nunca
     receberia o convite (`resetPostLoopHandoff`, nos mesmos três pontos de
     "vida nova" que já zeravam `watermarkedDownloadConfirmed`);
  2. contagem dupla de `post_to_earn_claimed`/`rejected` entre cliente e
     servidor (renomeado para `post_to_earn_outcome_viewed`);
  3. dois cliques no download contariam duas exibições do convite (guarda
     `!postHandoffArmed`);
  4. o `setTimeout` do timeout em `/free` segurava a lambda viva por até 800 ms
     depois da escrita já ter voltado (`clearTimeout` num `finally`).
- **Flag OFF = idêntico**: com `NEXT_PUBLIC_KINEO_POST_HANDOFF=off`, os três
  usos de `POST_HANDOFF_ENABLED` (scroll, título, borda) caem para o valor
  original. Instrumentação e copy verdadeira permanecem, por decisão explícita
  documentada em `lib/flags.ts`.
- **Repositório público**: nenhum PII. O doc cita apenas contagens agregadas; o
  evento novo de `/free` grava só país (4 chars) e host do referer — sem IP, sem
  user-agent, sem e-mail, sem UUID.
- Nenhum preço, crédito, entitlement, plano ou trava de fraude foi alterado.

## Arquivos

- `lib/flags.ts` — `POST_HANDOFF_ENABLED` (kill-switch)
- `lib/postToEarn.ts` — `POST_TO_EARN_DIRECT_PITCH`, `POST_TO_EARN_PASTE_NOTE`,
  `POST_TO_EARN_HANDOFF_TITLE`
- `app/(dashboard)/generate/GenerateClient.tsx` — handoff + 6 eventos
- `components/wall/WallSubmitLink.tsx` — 4 eventos + a nota de verdade
- `app/free/route.ts` — `watermark_landing`

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

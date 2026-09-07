# CICLO DE AQUISIÇÃO — 06/09 20:38 → 07/09 04:38 (8 rotações)

> **Ordem do fundador (06/09 19:40 BRT):** *"Faz o próximo ciclo de AQUISIÇÃO."*
> Valendo tudo o que ele disse de manhã: pensa como Bezos, invente, publique
> sozinho, não o chame, meta alta (10-15 pagantes/dia).
>
> **O ciclo anterior (Dia 1) fechou com o diagnóstico certo:** o funil está limpo
> — 43 filmes em 24h, 43 concluídos, 0 presos — e a peça central do produto foi
> vista por 2 pessoas porque só 4 filmes passaram por ela. **O problema não é a
> peça. É o DENOMINADOR.** Este ciclo existe para pôr mais gente certa na porta,
> com a fonte gravada, e para fazer cada filme entregue trazer o próximo cliente.

**MARCO DO CICLO: `2026-09-06 23:38 UTC`** — toda medição de eficácia deste ciclo
usa `created_at > '2026-09-06 23:38:00+00'::timestamptz`. Nunca "últimos N dias",
que mistura o antes com o depois e não prova nada.

---

## O MAPA DE ENTRADA — 14 dias, medido 06/09 21:00 BRT

**Como foi medido (para quem quiser refazer):** `events.landing_session_started`
dá o **primeiro pouso de cada sessão** (`path` = a página de entrada,
`metadata.referrer_host` = a fonte); a sessão é ligada à pessoa pelo primeiro
`user_id` que aparece nela, e só conta como cadastro se `profiles.created_at`
for **posterior** ao pouso. A fonte usada na tabela é a do **perfil**
(`signup_utm_source` / `signup_referrer`), que é mais completa que a do evento —
ver o defeito que a rotação #1 conserta.

### ⚠️ Primeiro, o erro que eu cometi e corrigi antes de entregar

A primeira versão desta tabela contava **sessões**, não **pessoas**. Ela dizia
que `/ai-shorts-for-agencies` tinha **3 cadastros, 3 filmes, 3 checkouts e 3
pagamentos — 100% em todos os degraus**. Fui conferir quem eram as três pessoas.
**Era uma só:** `cintia@hello-chat.eu` abriu três abas em 92 segundos. O "100%
de conversão" era uma pessoa contada três vezes. Toda a tabela abaixo está
**deduplicada por pessoa**, atribuída ao **primeiro** pouso dela.

### A tabela honesta — 355 pessoas, 27 páginas de entrada, **2 pagamentos**

| página de entrada | pessoas | chatgpt | taaft | s/ fonte | fez filme | 2º filme | checkout | **pagou** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` (home) | **140** | 12 | 94 | 15 | 81 | 14 | 15 | **0** |
| `/ai-video-generator/kineo-1` | 58 | 53 | 0 | 4 | 37 | 6 | 4 | 0 |
| `/free-ai-shorts-generator` | 46 | 40 | 0 | 5 | 29 | 7 | 4 | 0 |
| `/text-to-video-shorts` | 25 | 24 | 0 | 1 | 17 | 5 | 3 | 0 |
| `/free-ai-shorts/horror` | 22 | 20 | 0 | 2 | 16 | 3 | 1 | 0 |
| `/ai-video-generator/seedance` | 16 | 12 | 0 | 4 | 6 | 1 | 3 | **1** |
| `/gerador-de-shorts-gratis` (PT) | 11 | 11 | 0 | 0 | 8 | 3 | 2 | 0 |
| `/state-of-ai-shorts-2026` | 6 | 5 | 0 | 1 | 4 | 1 | **0** | 0 |
| `/signup` | 6 | 3 | 0 | 2 | 5 | 1 | 1 | 0 |
| `/studio` | 5 | 2 | 0 | 2 | 2 | 2 | 2 | 0 |
| `/scripts` | 4 | 3 | 0 | 1 | 1 | 0 | 0 | 0 |
| **`/ai-shorts-for-agencies`** | **1** | 1 | 0 | 0 | 1 | 1 | 1 | **1** |
| outras 15 páginas (1 pessoa cada) | 15 | 8 | 1 | 4 | 7 | 4 | 2 | 0 |

### O que o ChatGPT cita de nós — sessões de pouso em 14 dias

`/free-ai-shorts-generator` **27** · `/state-of-ai-shorts-2026` **25** ·
`/ai-video-generator/kineo-1` **24** · `/text-to-video-shorts` **23** ·
`/` **18** · `/ai-video-generator/seedance` **12** · `/free-ai-shorts/horror` **9** ·
`/scripts` 6 · `/gerador-de-shorts-gratis` 6 · `/partners` 5 · `/pricing` 4 ·
`/best-ai-shorts-generators` 4 · `/youtube-automation-case-study` 3 ·
**`/ai-shorts-for-agencies` 1**

### O que a BUSCA cita de nós — 14 dias (google+bing+ddg+brave+yandex)

`/` **24** · `/how-much-do-youtube-shorts-pay` **8** ·
`/can-you-monetize-ai-videos` **7** · `/tiktok-vs-youtube-shorts-monetization` **6** ·
`/best-ai-shorts-generators` 5 · `/ai-video-generator/kineo-1` 3 ·
`/free-ai-shorts-generator` 3 · e mais 12 páginas com 1-2 sessões.
**Total da busca inteira em 14 dias: ~71 sessões.** O sitemap publica **68 rotas
fixas** mais os clusters dinâmicos (nichos, concorrentes, motores, verticais de
script). A busca orgânica encosta em **menos de um quinto** delas.

### As cinco leituras que decidem o resto do ciclo

1. **A home é 40% da entrada e 0% do dinheiro.** 140 pessoas pousaram em `/`
   (94 delas vindas do TAAFT), 81 fizeram filme, **15 chegaram ao checkout e
   nenhuma pagou.** Os dois pagamentos do período vieram de páginas **profundas**.
2. **O ChatGPT nos cita pelo que é grátis.** As seis páginas mais citadas são
   "gerador grátis", "relatório", "motor", "texto para vídeo". A página com
   intenção de **orçamento** — `/ai-shorts-for-agencies` — recebeu **1 sessão do
   ChatGPT em 14 dias**, e a única pessoa que entrou por ela **pagou 32 minutos
   depois de criar a conta**. Um caso não é uma taxa; é uma pista com direção.
3. **`/state-of-ai-shorts-2026` é a nossa 2ª página mais citada e não vende
   nada.** 25 sessões do ChatGPT, 6 cadastros, 4 filmes, **0 checkouts.** Estamos
   sendo citados com sucesso pela peça errada.
4. **A busca orgânica é irrelevante hoje**: ~71 sessões em 14 dias para dezenas
   de páginas indexáveis. Ou não está indexado, ou está indexado e não converte —
   e isso é o item Q4, no servidor.
5. **O ChatGPT cola o nosso próprio `?utm_source=chatgpt` nos links que cita.**
   188 perfis do período têm `signup_utm_source='chatgpt'` — e **108 deles sem
   referrer nenhum**, porque o app do ChatGPT suprime o cabeçalho `Referer`.
   Isso é a matéria-prima da rotação #1.

---

## ### #1 — 20:38→21:38 — O EVENTO DE POUSO SABIA A FONTE E JOGAVA FORA

**PRESS RELEASE.** A partir de hoje, cada visita à Kineo é registrada com a
origem que ela trouxe — não só quando a pessoa cria conta. Até agora o produto
só sabia de onde vinha quem se cadastrava; o visitante que chegava, olhava e ia
embora era um número sem nome. Quatro em cada cinco visitas eram assim. Com a
correção, quem chega pelo ChatGPT, por um diretório ou por um link de indicação
passa a contar desde o primeiro segundo — e a Kineo passa a poder dizer, por
página, quantas pessoas entram e quantas ficam, em vez de só quantas assinam.

**O QUE ESTAVA ERRADO (medido).** `landing_session_started` gravou **3.600
sessões em 14 dias** e **2.948 delas (82%) saíram com `referrer_host` nulo**.
Não era falta de informação: era informação descartada. O ChatGPT suprime o
`Referer` **e** cola `?utm_source=chatgpt` na URL que cita. O evento lia
`document.referrer` e ignorava a query string que estava na mesma barra de
endereços. Consequência prática: **só dá para medir por página quem fez conta.**
O denominador — visitante anônimo, que é exatamente o número que o fundador
pediu — era cego em 82% dos casos.

**O QUE MUDOU.**
- `components/SourceCapture.tsx` — o evento de pouso passa a carregar
  `utm_source`, `surface`, `source` e `source_known`.
- **A regra de 12/08 foi respeitada, não redigitada:** `utm_source=homepage` e
  `utm_source=sticky_cta` são **rótulos de superfície interna** (a pessoa já
  estava aqui e clicou num CTA nosso). Eles passam por `internalSurfaceLabel()`
  — o mesmo ponto de estrangulamento que a captura de first-touch já usa — e vão
  para o campo `surface`. **Nunca** viram origem. Um "não sabemos" honesto é
  instrumento; um `sticky_cta` falso é ruído com cara de sinal.
- **Precedência:** `referrerHost ?? utmSource`. O referrer é o que o navegador
  atesta; o utm é o que alguém escreveu no link e pode ser colado por terceiros.
  Quando os dois existem, o atestado ganha.
- `scripts/test-landing-source-capture.mjs` — **22 verificações**, estilo
  `readFileSync` (TSX com alias `@/` morre no resolver antes da primeira
  verificação — 72 testes de `scripts/` já têm esse defeito).

**FALSIFICAÇÃO POR MUTAÇÃO — 5 de 5 mutantes reprovados:**

| mutante | o defeito que ele representa | guardião |
|---|---|---|
| M1 apagar `surface ? null :` | rótulo interno volta a virar origem | reprovou |
| M2 `utmSource ?? referrerHost` | utm colado vence o atestado do navegador | reprovou |
| M3 `source_known: true` | placar mente dizendo que sempre sabemos | reprovou |
| M4 `const rawUtm = null` | para de ler a URL, volta ao estado anterior | reprovou |
| M5 `source: utmSource` | o campo perde a precedência do referrer | reprovou |

> ⚠️ M5 **passou** na primeira tentativa — e não porque o guardião fosse fraco: a
> substituição `perl` com `$` de fim de linha **não aplicou**, porque o checkout
> do Windows escreve CRLF. Mutante que não aplica vira falso verde. Refeito com
> `\r?\n` e o guardião reprovou como devia.

**TESTES.** `npx tsc --noEmit -p tsconfig.json` verde (exit 0, worktree com
junction de `node_modules`) · guardião 22/22 · 5/5 mutantes reprovados.

**RISCO.** Nenhum comportamento de página muda: o componente continua não
renderizando nada, continua capturando uma vez por aba, continua dentro do
`try/catch` que impede qualquer falha de analytics de afetar o render. O que
muda é o conteúdo do JSON de um evento. Risco real para o cliente = **zero**.

**COMO MEDIR (a partir do marco).** Sobre `events` com
`name='landing_session_started'` e `created_at > '2026-09-06 23:38+00'`:
a fração com `metadata->>'source_known' = 'true'`.
**Hoje: 18% das sessões com fonte. Alvo: acima de 70%** — o teto não é 100%,
porque tráfego direto genuíno existe e continuará (honestamente) sem fonte.

**PARADA.** Se depois de 200 sessões pós-deploy a cobertura não passar de 40%,
a hipótese "o utm estava lá e não era lido" está errada, e o próximo passo é
first-touch em cookie no servidor (Q2), não mais instrumentação no cliente.

---

## ### #2 — 21:00 — O CANAL QUE NOS LÊ NÃO TINHA COMO NOS CITAR PELO QUE SÓ NÓS FAZEMOS

**PRESS RELEASE.** Quem hoje pergunta a um assistente de IA "qual ferramenta me
dá uma **série** de Shorts, e não um vídeo solto?" passa a poder ouvir o nome
Kineo. Até agora não passava — não por falta de produto, mas por falta de
registro: a temporada e o pacote de publicação subiram hoje, são as duas coisas
que a casa faz e as concorrentes não fazem, e não existiam em nenhuma das duas
superfícies que um motor de resposta lê. O produto fazia; o mundo não sabia.

**O QUE ESTAVA ERRADO (medido).** O ChatGPT é **57% da aquisição** (188 de 355
em 14 dias; **23 de 36 nas últimas 24h**). E ele **nos lê**: 108 desses 188
chegam sem `Referer` nenhum e com o **nosso próprio** `?utm_source=chatgpt`
colado na URL — ele copia o link de uma página que rastreou. As seis páginas que
ele mais cita são todas sobre o que é **grátis**. Nenhuma responde "e depois que
o vídeo fica pronto?". `/llms.txt` e `/api/facts` — os dois arquivos escritos
justamente para serem citados — não tinham uma palavra sobre temporada nem sobre
pacote de publicação.

**O QUE MUDOU.** `lib/growth/afterTheFilmFacts.ts` (novo) monta o fato
**importando** `TOTAL_EPISODIOS`, `PRIMEIRO_EPISODIO` e `ULTIMO_EPISODIO` de
`lib/temporada.ts` — a mesma constante que a faixa da tela e a carta usam. O
limite do ciclo é explícito: fato público **nunca é número digitado**. Se o
produto passar de 5 para 3 episódios, o texto público muda junto, em vez de
virar a "copy que mente" que o CLAUDE.md já lista como dívida.

O fato carrega as **fronteiras**, cada uma lida no código que a implementa:
escrever a temporada **não gasta crédito e não chama a fal**
(`app/api/season/route.ts`); o episódio **só é cobrado quando renderizado**; o
pacote entrega **texto para colar** e não publica em plataforma nenhuma; e o
crédito "made with Kineo" **só aparece no plano gratuito** — quem paga recebe a
descrição limpa (`lib/publishPack.ts`, `isFreePlan`).

Superfícies: `lib/kineoFacts.ts` exporta e serve o campo `afterTheFilm` (logo
`/api/facts` o publica) e `app/llms.txt/route.ts` ganha a seção *"What happens
after a video is finished"*, antes do bloco de Trust. Toda linha dela é
interpolação do fato; nenhuma prosa digitada.

**EM PRODUÇÃO — SHA `d8a552f8`.** Sonda real, com controle:

- `curl /llms.txt` devolve a seção completa com **"writes the next 5 episodes"**
  e **"episodes 2 to 6"** — números vindos de `lib/temporada.ts`, não digitados.
- Controle na mesma medição: a string `"What happens after a podcast is
  finished"` retorna **0 ocorrências**. A sonda sabe dizer não.
- `curl /api/facts` → `afterTheFilm` presente, `episodes: 5`, `first: 2`,
  `last: 6`, 4 peças, 3 fronteiras.

**TESTES.** `scripts/test-after-the-film-facts.mjs`, **28 verificações**. Além do
número não-digitado, ele **compara a lista de peças do fato com os campos reais
do tipo `PacoteDePublicacao`** — o texto público não pode anunciar uma quinta
peça que ninguém entrega. **5 mutantes reprovados** (e cada mutação foi conferida
como aplicada antes de contar): número digitado, fronteira "não publica"
apagada, fato existente mas **não servido** pelo `getKineoFacts()`, prosa de
venda solta na seção, e a seção do `/llms.txt` sumindo. `tsc --noEmit` verde.

**RISCO.** Só texto de fatos. Nenhuma tela, nenhum preço, nenhum caminho de
cobrança tocado.

**COMO MEDIR.** Cadastros com `signup_utm_source='chatgpt'` que pousam em página
de intenção comercial (`/ai-shorts-for-agencies`, `/pricing`, `/models-pricing`)
a partir do marco, contra a linha de base de 14 dias: **1 pessoa**.

---

## ### #3 — 21:20 — O GOOGLE NÃO VEM, E **NÃO É** DEFEITO DE SERVIDOR

**PRESS RELEASE (negativo, e é o mais útil do ciclo).** A hipótese de que a busca
orgânica não traz ninguém porque o site está tecnicamente quebrado foi
**testada e reprovada**. Não há o que consertar no servidor. Quem for gastar a
próxima rotação em encanamento de SEO está gastando à toa.

**O QUE FOI CONFERIDO, em produção, com curl.**

| checagem | resultado |
|---|---|
| `robots.txt` | válido; `Allow: /`, os bots de IA nomeados um a um, `Host` e **dois** sitemaps declarados |
| `sitemap.xml` | HTTP 200, 32 KB, **186 URLs**, `lastmod` real |
| 20 páginas de aquisição | **todas 200** |
| `rel=canonical` | presente nas **20** |
| `<title>` / `<meta description>` | presentes nas 20, **zero duplicados** entre elas |
| `noindex` acidental | **0 em 186** páginas do sitemap |
| conteúdo no HTML | server-rendered: 5.870 a 8.909 caracteres de texto, `<h1>` único por página |
| structured data | JSON-LD presente (2 blocos na home, na `/free-ai-shorts-generator` e na `/ai-shorts-for-agencies`) |

**O ÚNICO `noindex` ENCONTRADO NÃO É BUG.** `/scripts` traz
`robots: noindex, follow, noarchive`, e as prateleiras de script estão fora do
sitemap (só `/scripts/space` entra). Isso é `CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED`
**desligada** — o bloqueio de privacidade da superfície pública de vídeo do
cliente. É decisão deliberada, com comentário no `app/sitemap.ts` explicando, e
**não foi tocada**: ligar isso é decisão do fundador, não de sessão.

**ENTÃO POR QUE O GOOGLE NÃO VEM?** Fui ver o que ele mostra. Para
*"best free AI faceless YouTube Shorts generator 2026"* — literalmente o tema da
nossa página mais citada pelo ChatGPT — os sete primeiros resultados são
**HeyGen, Fliki, InVideo (duas páginas), ReframeX, Pexo e um blog de listas**.
Kineo não aparece. E **três dos sete são listas de terceiros**, não páginas de
produto.

**A conclusão honesta:** esta categoria não é ganha por página própria; é ganha
por **estar dentro das listas dos outros** e por autoridade de domínio. Nós temos
o encanamento certo e **nenhuma** menção externa. Nenhuma linha de código nossa
muda isso.

**E A CONTRAPROVA QUE IMPEDE A JOGADA ÓBVIA.** A reação natural seria "então
manda para todos os diretórios". **Os dados dizem que não é tão simples:** o
TAAFT — um diretório — mandou **99 pessoas, 64 filmes e 0 pagamentos** em 14
dias, e 94 delas pousaram na home, que é a página com 0 pagamentos do período.
Diretório traz volume de caçador de plano grátis. Os **dois** pagamentos do
período vieram de páginas **profundas e específicas** (motor e agências), pelo
ChatGPT. Diretório é volume; o ChatGPT é o único canal que já trouxe comprador.

**PARADA / O QUE ISSO DECIDE.** Q4 está **encerrado como item de servidor**.
Diretórios (Q7) descem de prioridade e continuam sendo tarefa do fundador — o
texto fica pronto, mas com a expectativa correta: volume, não receita.

**⚠️ E UMA CORREÇÃO AO PRÓPRIO CARDÁPIO DESTE CICLO.** O item **Q5** manda gravar
`videos.thumbnail_url` para que "a `/v/[id]` ganhe og:image real e o link do
pacote de publicação passe a ser a `/v/`". **Isso não é executável hoje:**
`curl` em `/v/<id>` de um vídeo real devolve **404**, igual ao controle de um
UUID inexistente — a superfície pública de vídeo está desligada pelo mesmo
bloqueio de privacidade acima. Gravar a thumbnail continua tendo valor de
persistência (biblioteca), mas **o ganho de aquisição do Q5 está atrás de uma
decisão de privacidade do fundador**, não atrás de código. Não gastar rotação
nisso achando que abre uma porta.

---

## ### #1 — VERIFICAÇÃO PÓS-DEPLOY, e o falso alarme que quase me fez reverter

**EM PRODUÇÃO — SHA `5411b6be`.** Provado no código servido, com controle:

O bundle `_next/static/chunks/app/layout-<hash>.js` contém **as duas** strings —
`landing_session_started` (**controle**: já existia, prova que a sonda sabe
achar) e `source_known` (**o campo novo**). E o trecho minificado mostra a
lógica inteira sobrevivendo à build:

```
n=(i=(0,a.eX)(e))?null:(null!=e?e:"").trim().toLowerCase().slice(0,80)||null
...
let l=null!=t?t:n;
(0,r.L9)("landing_session_started",{referrer_host:t,utm_source:n,surface:i,source:l,source_known:null!==l})
```

`i = internalSurfaceLabel(utm)` e `n = i ? null : normalizado` — **a guarda de
superfície sobreviveu**. `l = referrerHost ?? utmSource` — **a precedência
sobreviveu**. `source_known: null !== l` — **derivado, não constante**.

> ⚠️ A primeira sonda de bundle deu **falso negativo**: procurei em
> `/_next/static/chunks/*.js` extraídos com um padrão que perdia a query string
> `?dpl=...`. O **controle também deu zero**, e foi só por isso que não conclui
> "não subiu". Sonda sem controle não sabe dizer não.

### 🚨 O falso alarme, registrado porque quase me custou a entrega

Trinta minutos depois do deploy, o placar por hora mostrava **404 eventos na
hora anterior contra 9 na hora corrente**, e **zero `landing_session_started`
desde o deploy**. `SourceCapture` vive no **root layout** — se ele lançasse,
todo evento de cliente morreria e sobraria só cron. O quadro batia com "eu
quebrei a hidratação do site inteiro". **Fui reverter. Falsifiquei antes.**

Eram dois artefatos somados, **nenhum deles meu**:

1. **A hora-base estava inflada por UMA pessoa.** Minuto a minuto, os 404
   eventos eram 35 / 39 / 23 / 14 por minuto entre 23:20 e 23:25 — uma única
   sessão gerando um vídeo, de `generate_started` até `video_download_clicked`.
   Ela terminou às 23:25 e foi embora. O resto daquela hora era tão vazio quanto
   a hora seguinte.
2. **A janela é madrugada.** Mesma faixa de relógio nos 9 dias anteriores:
   **0 a 4** eventos. Dois dos nove dias tiveram exatamente **zero**.

Confirmação cruzada por um caminho que **não passa pelo meu código**: desde
23:44 houve **0 cadastros** e 1 vídeo (de quem já estava logado). Não é que o
evento parou de disparar — **é que não entrou ninguém**.

**O que ainda falta, e está honestamente em aberto:** a prova de ponta a ponta
(um `landing_session_started` real trazendo `source_known`) depende de um
visitante novo. Até 00:14 UTC não houve nenhum. **O campo está no bundle
servido e a lógica está correta; o evento gravado ainda não foi visto.** Não
conto isso como provado até aparecer linha no banco.

---

## ### #4 — 21:25 — DUAS FERRAMENTAS PARA O MAPA NÃO SE PERDER E O FUNDADOR PODER AGIR

**PRESS RELEASE.** O mapa de entrada deste ciclo deixa de ser um texto e vira
uma consulta que qualquer sessão futura roda em um passo — inclusive com o erro
que eu cometi já corrigido dentro dela. E o fundador ganha o texto pronto dos
diretórios, com a expectativa certa escrita em cima.

**`docs/queries/MAPA-DE-ENTRADA-2026-09-06.sql`.** A junção que reconstrói o
mapa (pouso → dono da sessão → pessoa → funil), **deduplicada por pessoa** e com
o aviso do erro no cabeçalho: contar sessões transformou **uma visitante com
três abas** em "3 cadastros e 3 pagamentos, 100% de conversão". Verificada
rodando: **356 pessoas, 27 páginas, 2 pagamentos** — reproduz o mapa. Traz duas
consultas irmãs comentadas: o que cada motor de resposta cita (que inclui quem
**não** fez conta, o denominador de verdade) e a cobertura da atribuição
pós-#1 (linha de base **12,5%**, alvo **>70%**).

**`docs/DIRETORIOS-SCRIPT-FUNDADOR-2026-09-06.md`.** Tagline, descrição curta,
descrição longa, tags, ordem dos screenshots e os seis diretórios com link de
submissão. **Todos os números conferidos contra `/api/facts` em produção**, não
digitados de memória — $7 / $15 / $29 / $299, 25 créditos sem cartão, 8 motores
nomeados, mediana de render 4,2 min. Repete a trava do Product Hunt.

**E ele começa com a expectativa, não com o entusiasmo:** o TAAFT mandou **99
pessoas, 64 filmes e 0 pagamentos** em 14 dias. A instrução ao fundador é medir
**checkout**, não cadastro — "só considere um diretório funcionando quando ele
produzir checkout". Item de **volume**, não de receita, e por isso **abaixo** do
ChatGPT na fila.

**RISCO.** Zero: dois documentos, nenhum código de produto.

---

## ### #5 — 21:35 — EU PUBLIQUEI UMA FRASE FALSA HÁ 40 MINUTOS. FUI MEDIR, E TIREI.

**PRESS RELEASE.** A página de fatos da Kineo voltou a dizer só o que o cliente
realmente recebe. Uma frase que eu mesmo publiquei nesta madrugada — "todo filme
pronto vem com o texto para publicar" — foi **medida contra a produção e não se
sustentou**: a peça existe no código, está ligada ao e-mail, e **não produziu um
único pacote**. A frase saiu. Ela volta quando o produto provar que entrega.

**O QUE ACHEI.** Rodei a checagem que a memória
`contrato-de-servidor-sem-chamador` manda rodar — *a peça publicada tem
chamador?*:

| evento | 24h | pessoas |
|---|---:|---:|
| `video_generation_completed` | 29 | 25 |
| `season_written` | **28** | **28** |
| `video_ready_email_sent` | **42** | 32 |
| **`publish_pack_written`** | **0** | **0** |

O pacote de publicação subiu hoje às 11:56 UTC. Entre então e agora saíram
**42 e-mails de "filme pronto"** — e **zero pacotes**. A temporada, subida na
mesma manhã, disparou 28 vezes para 28 pessoas. **Uma das duas peças funciona; a
outra não, e ninguém sabia.**

**E ISSO ME PEGOU NO CONTRAPÉ, com razão.** Quarenta minutos antes eu tinha
publicado em `/llms.txt` e `/api/facts`: *"Every finished film comes with the
copy needed to post it."* Em produção isso é **falso** — 0 de 42. Eu não
inventei o recurso: ele existe, está importado pelo cron, tem tipo, teste e
comentário. **Mas fato público não descreve o repositório; descreve o que a
pessoa recebe.** Publicar a existência de um recurso que não produz é exatamente
a "copy que mente" que o CLAUDE.md lista como dívida — e desta vez a dívida
era minha, com 40 minutos de idade.

**POR QUE NINGUÉM SABIA: sete `return null` mudos.** `garantirPacote()`
(`lib/publishPackServer.ts`) falha **aberto** de propósito — qualquer problema
devolve `null` e o e-mail sai como sempre saiu. A decisão é certa: um pacote
nunca pode impedir alguém de saber que o filme ficou pronto. **O erro não é
falhar aberto; é falhar aberto e mudo.** Havia sete portas de saída e nenhuma
dizia o próprio nome. Descartei as duas hipóteses fáceis medindo:
`has_topic=true` em **144 de 174** e-mails de 7 dias, então não é tema vazio; e
a chave da OpenAI é a mesma que o resto da casa usa.

**O QUE MUDOU.**
- `lib/publishPackServer.ts` — `garantirPacote` ganha `onFalha?` **opcional**
  (o outro chamador, `app/api/publish-pack/route.ts`, não muda uma linha) e cada
  saída passa a nomear-se: `sem_video_id`, `so_leitura`, `sem_openai_key`,
  `sem_tema`, `openai_http_<status>`, `openai_timeout`, `openai_excecao`,
  `json_invalido`, `pacote_invalido`. **O valor de retorno é idêntico.**
- `app/api/cron/send-video-ready/route.ts` — todo e-mail **sem** pacote grava
  `publish_pack_unavailable` com o motivo, `has_topic` e `has_title`. O insert
  engole o próprio erro: observar nunca pode impedir o e-mail.
- `lib/growth/afterTheFilmFacts.ts` + `app/llms.txt/route.ts` — **a frase do
  pacote saiu**. A **temporada fica**, porque é medida: 28 escritas em 24h.

**TESTES.** Guardião subiu de 27 para **34 verificações** e ganhou uma regra
nova: **nenhuma afirmação pública sobre o pacote enquanto o evento for zero** —
`publishPack`, `publishing pack`, `pinned comment` e `TikTok caption` são
proibidos no fato e na seção do `/llms.txt`. E amarrou a instrumentação ao
comportamento: **nenhum `return null` mudo pode sobrar** dentro de
`garantirPacote` (recorte ancorado em `const videoId`, não por índice de
ocorrência), pelo menos 6 motivos distintos, e o motivo gravado tem de ser a
**variável**, não um literal. **6 mutantes reprovados**, cada mutação conferida
como aplicada: frase do pacote de volta ao fato, frase de volta ao `/llms.txt`,
um `return null` voltando a ser mudo, `reason` virando literal, o cron parando
de gravar o evento, e o relator sumindo. `tsc --noEmit` verde.

**COMO MEDIR, e é a próxima coisa a olhar neste ciclo.** Depois do próximo
disparo do cron: `select metadata->>'reason', count(*) from events where
name='publish_pack_unavailable' group by 1`. **O motivo campeão é o defeito.**
Com ele na mão, o conserto é dirigido — e a frase pública volta no mesmo dia em
que `publish_pack_written` deixar de ser zero.

**A LIÇÃO, e ela vale além desta peça.** Eu publiquei a frase às 21:00 e a medi
às 21:35 **só porque fui checar se a peça tinha chamador**. Se eu tivesse
tratado "está no código, com teste e comentário" como prova de entrega, a Kineo
estaria hoje anunciando para todo motor de resposta um recurso que **nenhum
cliente recebeu**. **Fato público exige evento, não arquivo.**

---

## ✅ PROVA DE PONTA A PONTA DA #1 — chegou às 00:21 UTC

O primeiro visitante pós-deploy gravou o evento novo. Linha real do banco:

```
created_at  2026-09-07 00:21:49 UTC
path        /signup
metadata    { "referrer_host": null, "utm_source": null, "surface": null,
              "source": null, "source_known": false }
```

Os **cinco** campos presentes. Esta pessoa chegou **sem fonte nenhuma** —
direto, sem referrer e sem utm — e o instrumento diz isso **explicitamente**,
com `source_known: false`. Antes da #1 esse caso era indistinguível de "nós não
olhamos". **Agora "não sabemos" é um dado, não uma lacuna.** A #1 está provada
nos três níveis: código, bundle servido e linha no banco.

## ✅ Correção da #5 em produção

`curl /llms.txt` → **0 ocorrências** de "Publishing pack"; `curl /api/facts` →
**0 ocorrências** de `publishPack`. E o controle na mesma medição: a seção
*"What happens after a video is finished"* e a frase *"writes the next 5
episodes"* **continuam lá**. Como a #2 subiu as duas linhas **juntas**, o pacote
ter sumido e a temporada ter ficado **prova** que o deploy da #5 chegou.

## 📊 Praxe — 24h até 00:26 UTC

| medida | valor |
|---|---:|
| cadastros (externos) | 35 |
| filmes | 42 · **42 concluídos** |
| render preso >40 min | **0** |
| cadastro nascido sem crédito | **0** |
| `next_episode_failed` | **0** |
| checkout | 2 |
| **payment_success** | **0** |
| conta nova sem fonte | 2 |

**A fábrica está impecável — 42 de 42 — e o funil comercial continua fechado.**
É o mesmo quadro do ciclo anterior, e é a razão de este ciclo ser de aquisição.

---

## 🎯 A #1 PEGOU EXATAMENTE O CASO QUE A MOTIVOU — 00:34 UTC

```
created_at  2026-09-07 00:34:54 UTC
path        /ai-video-generator/kineo-1     ← a página nº1 do ChatGPT no mapa
metadata    { "referrer_host": null,          ← o ChatGPT suprimiu o Referer
              "utm_source": "chatgpt.com",    ← estava na URL o tempo todo
              "surface": null,
              "source": "chatgpt.com",
              "source_known": true }
```

**Antes desta madrugada, esta sessão teria sido gravada como "(sem fonte)"** —
uma das 2.948 de 3.600. Ela é agora, corretamente, do ChatGPT, e pousou na
página que o mapa aponta como a porta nº 1 dele. O mecanismo está provado no
tráfego real que o motivou.

Cobertura até agora: **1 de 3** sessões instrumentadas com fonte conhecida,
contra linha de base de **12,5%**. `n` minúsculo — não é taxa, é demonstração de
mecanismo. A taxa se mede amanhã, com volume.

**⚠️ DETALHE QUE A PRÓXIMA CONSULTA PRECISA SABER:** o valor que chegou é
`chatgpt.com`, **com domínio**, enquanto `profiles.signup_utm_source` guarda
`chatgpt`, **sem**. Não normalizei para um dos dois de propósito — gravar o que
veio é o certo, e inventar equivalência no ponto de captura esconde mudança de
comportamento do ChatGPT. **Quem agrupar por fonte precisa aceitar os dois**
(`like 'chatgpt%'`), e isso já está no `docs/queries/MAPA-DE-ENTRADA-2026-09-06.sql`
como aviso.

---

## ### #6 — 21:45 — AS DUAS PEÇAS DE HOJE: UMA TEM TELA E FUNCIONA, A OUTRA NÃO TEM E NÃO EXISTE

**O achado, em duas linhas de terminal:**

```
grep -rn "api/season"       app/ components/  →  GenerateClient.tsx, SeasonStrip.tsx
grep -rn "api/publish-pack" app/ components/  →  (nada)
```

| peça | chamadores de tela | eventos escritos (história) |
|---|---|---|
| temporada | **2** | `season_written` **28** em 24 h, 28 pessoas |
| pacote de publicação | **0** | `publish_pack_written` **0** |

Mesma manhã, mesmo autor, mesma qualidade de backend. **A diferença é tela.**

E o pacote está morto nas **duas** pontas: a rota `/api/publish-pack` (#22) não
tem chamador nenhum, e o caminho do cron escreveu **0 pacotes em 42 e-mails**.
Não é uma falha — são duas, independentes.

**Por que isso é aquisição e não firula:** a tese do ciclo anterior é que *cada
filme publicado por um cliente é um anúncio da casa*, e a casa entrega **~20
filmes/dia**. O pacote é a **única alavanca de aquisição que a casa puxa
sozinha**, e ela está desligada por falta de uma caixa na tela.

**`docs/PEDIDOS-CODEX-2026-09-06.md`** abre o pedido com o contrato inteiro
(GET só lê e custa zero; POST escreve uma vez; `pack: null` é 200 e silencioso;
não reescrever os textos, porque o crédito já entra ou não no servidor conforme
o plano) e — a parte que importa — **exige os dois eventos de exibição**
(`publish_pack_shown` e `publish_pack_copied`). Sem eles a peça nasce imedível,
que foi exatamente como a temporada passou três rotações sendo afinada sem
ninguém saber se aparecia.

**Pendente e honesto:** o motivo da falha do cron **ainda não apareceu** — o
instrumento da #5 só grava quando sai um e-mail novo, e o último saiu às 23:45.
Descartei estaticamente as duas hipóteses fáceis: o cron **seleciona** `topic`
(`select 'id, user_id, title, topic, ...'`, linha 307) e monta `video.topic`
corretamente (linha 329), então não é campo ausente; e `video.id` é a coluna
`id` da tabela, string. Sobram OpenAI (HTTP/timeout) e `prepararPacote`. **O
próximo e-mail responde. Não vou adivinhar.**

---

## ### #7 — 21:55 — O NÚMERO DO CICLO: 199 DE 217 PESSOAS RECEBERAM O FILME E NUNCA FORAM PERGUNTADAS

**PRESS RELEASE.** A Kineo entregou **217 filmes prontos** para 217 pessoas
diferentes em 14 dias. **Dezoito** delas chegaram a ver um preço. As outras
**199 pegaram o vídeo e foram embora sem que a casa perguntasse uma única vez se
queriam continuar.** Não é que acharam caro: **não foram perguntadas.**

**COMO CHEGUEI AQUI, e não era o que eu procurava.** Fui conferir os 2 checkouts
do dia, seguindo a instrução do fundador de 02/09 — *"contar separado de
checkout de quem já entregou vídeo"*. Os dois eram de contas que **ainda não
tinham filme nenhum**: `mohandasjas1` (fonte `seo`) apertou checkout **2 minutos**
depois de criar a conta, e `fadeoags` (fonte `chatgpt`) **98 segundos** depois.
Os dois só fizeram filme **depois**. Puxei o fio.

### O funil honesto de 14 dias

| degrau | pessoas | do anterior |
|---|---:|---:|
| cadastros (externos) | **366** | — |
| **filme pronto na mão** | **217** | 59% |
| viu a página de preços depois do filme | **18** | **8%** |
| viu parede/modal de upgrade depois do filme | 14 | 6% |
| começou checkout depois do filme | **14** | **6,5%** |
| **pagou** | **2** | 14% dos 14 |

**O degrau seco é um só, e não é onde todo mundo procura.** A fábrica entrega
(59%, com 42 de 42 renders concluídos hoje). O checkout **fecha bem** — 2 de 14,
**14%**, para quem chega lá com um filme na mão. **O que não acontece é o
convite:** 92% de quem recebeu o produto nunca cruzou uma superfície com preço.

### E isso NÃO contradiz a conclusão fechada do fundador — a afia

A regra da casa é: *o vazamento do checkout é PREÇO, não é trilho de pagamento.*
**Continua valendo, e agora com o denominador certo.** Segmentando os 40 que
chegaram ao checkout em 14 dias:

| segmento | pessoas | pagaram | taxa |
|---|---:|---:|---:|
| **já tinha filme pronto** | 13 | 2 | **15,4%** |
| ainda sem filme | **27** | 1 | 3,7% |

**68% do tráfego de checkout é gente que nunca viu o produto funcionar** — e
converte **4,2× pior**. O "vazamento" que parecia enorme é, em boa parte, uma
população mal qualificada chegando cedo demais. Entre quem chega no momento
certo, a taxa é **15,4%**, que não é a taxa de um produto que ninguém quer.

> ⚠️ **E a ação óbvia daqui é PROIBIDA, com razão.** Bloquear o checkout de quem
> não tem filme "limparia" o número — e é exatamente o limite **K1** deste
> ciclo: *quem quer comprar avança sem filme*. Ninguém é impedido de pagar.
> A correção é **medir separado** (feito) e **convidar mais quem já recebeu**
> (que é o Pedido 1), nunca fechar a porta de quem quer comprar.

### O que isso decide, e amarra o ciclo inteiro

As duas peças construídas hoje — **temporada** e **pacote de publicação** — são
exatamente o convite pós-entrega. E é aí que a conta fecha, ou não fecha:

| peça | escrita para | **vista por** |
|---|---:|---:|
| temporada | 28/dia | **2** |
| pacote de publicação | — | **0** (nunca escrito) |

**O momento que decide o negócio acontece ~20 vezes por dia e a casa está muda
nele.** Não por falta de ideia nem de backend: os dois estão prontos. Falta a
caixa na tela (`docs/PEDIDOS-CODEX-2026-09-06.md`, Pedido 1) e a instrumentação
que diga se ela aparece (Pedido 3).

### A aritmética que o fundador pediu, sem maquiagem

Meta declarada: **10-15 pagantes/dia**. Hoje: **366 cadastros / 2 pagamentos em
14 dias = 0,55%**. A essa taxa, 10 pagantes/dia exigiriam **~1.800 cadastros por
dia** — **50× o tráfego atual**. Nem o melhor trabalho de aquisição do mundo
entrega isso neste trimestre.

**Mas o número que muda tudo não é o tráfego, é o 6,5%.** Se o convite pós-filme
levasse **30%** dos 217 a uma superfície com preço (em vez de 6,5%), e a taxa de
15,4% se mantivesse, seriam **~10 pagantes por 14 dias** com o tráfego de hoje —
5× o resultado atual, **sem uma visita nova**. Com o tráfego já crescendo (11
cadastros/dia em 24/08 → **35** em 06/09, 3× em duas semanas, 66% do ChatGPT),
os dois se multiplicam.

**A leitura de dono:** este ciclo foi pedido como aquisição, e a aquisição está
funcionando sozinha — triplicou em 14 dias sem gastar um dólar. **O gargalo
mudou de lugar enquanto ninguém olhava.** Ele não está mais em "trazer gente";
está em **pedir**, uma vez, para as 20 pessoas por dia que já estão com o
produto pronto na mão.

---

## ### #8 — 22:00 — 🔴 CORREÇÃO DA MINHA PRÓPRIA #5: O PACOTE NÃO FALHOU 42 VEZES. ELE TEVE **UMA** CHANCE.

**Na #5 eu escrevi que `publish_pack_written` estava em zero "com 42 e-mails de
filme pronto em 24 h". A frase está errada, e o erro é meu.** Aqueles 42 e-mails
**nunca passam pelo código do pacote.** Fui atrás do log e a arquitetura é outra.

### Existem DOIS e-mails de "filme pronto", e só um deles carrega o pacote

| caminho | quem dispara | 24 h | 7 d | leva o pacote? |
|---|---|---:|---:|---|
| **instantâneo** | `app/api/compose/status/[renderId]` (enquanto a tela faz poll) | **41** | **174** | **NÃO** |
| **resgate** | `cron/send-video-ready` (a cada 30 min) | **1** | **27** | **sim** |
| pacotes escritos | — | — | — | **0** |

`grep -rn "video_ready_email_sent"` resolve em uma linha: quem emite o evento é
`compose/status/[renderId]/route.ts:1144`, **não** o cron. Os 42 que eu contei
são do caminho instantâneo, que não chama `garantirPacote` nem uma vez.

**A conclusão certa:** o pacote está pendurado no caminho que alcançou **1
pessoa em 24 h** — e como ele subiu às 11:56 UTC, teve **cerca de uma
oportunidade na vida**. Não há evidência de que `garantirPacote` esteja
quebrado. **Eu tratei "0 escritas" como "0 de 42 tentativas" quando era "0 de
~1".** Denominador errado, de novo, e desta vez o meu.

### O que continua VÁLIDO da #5, e por quê

- **Tirar a frase pública foi certo, e continua certo.** Zero clientes
  receberam o pacote. O motivo mudou (alcance, não defeito); o fato público
  ainda seria falso.
- **A instrumentação continua certa** — e agora é a única maneira de saber, já
  que a oportunidade é rara: quando o resgate finalmente sair, o motivo (ou o
  sucesso) fica gravado. Sem ela, a próxima sessão herdaria o mesmo enigma com
  um denominador de 1.
- **Parei de caçar bug em `garantirPacote`.** Lendo `prepararPacote` e o cron
  eu não achei nenhuma porta que feche sempre — e agora sei por quê: **não há
  bug a achar**, há alcance a corrigir.

### E o segundo achado, que veio do mesmo log

O resgate não é só pequeno por desenho — ele está sendo **calado**. Toda
execução das últimas 3 h:

```
00:40  [lifecycle-suppression] 18/18 suprimido(s) — e-mail de ciclo de vida nas últimas 24h
00:10  [lifecycle-suppression] 19/19 suprimido(s)
23:40  [lifecycle-suppression] 19/19 suprimido(s)
23:10  [lifecycle-suppression] 18/18 suprimido(s)
```

**Todos os candidatos, em todas as execuções.** O que ganha a colisão é a
máquina de trial: **118 e-mails em 24 h** (`ending_soon` 28, `d0_welcome` 26,
`downgraded_loss` 24, `expired_lastcall_d10` 20, `expired_offer_d5` 20), de hora
em hora, contra um resgate que fala com 27 pessoas por semana.

Isto é **exatamente** o padrão que `lib/lifecycle/suppression.ts` já documenta
para o `send-recovery` — *"o e-mail genérico e horário vence a carta específica
e rara"* — e a casa **já construiu o remédio**: `HOT_LEAD_SUPPRESSION_HOURS = 4`,
uma janela curta e opcional para jobs cuja coorte é sinal de compra. Ele nunca
foi aplicado ao video-ready.

> ⚠️ **NÃO MEXI NISSO, de propósito.** Mudar precedência de e-mail aumenta o
> volume que sai para clientes reais durante a madrugada, sem o fundador. É
> decisão dele, não de sessão autônoma — e o ganho é pequeno de qualquer forma:
> mesmo desbloqueado, o resgate fala com quem **não** baixou, que é a coorte
> menos interessada.

### O que isto DECIDE — e reforça o Pedido 1

O pacote não pode viver em e-mail nenhum:

- no **instantâneo**, uma chamada de modelo de até 12 s bloquearia o poll e
  faria a tela parecer travada no minuto exato em que o filme fica pronto
  (a razão, correta, que a #22 já tinha registrado);
- no **resgate**, ele alcança 4 pessoas por semana e ainda é suprimido.

**Sobra a tela — e só ela.** É a única superfície que alcança as **217** pessoas
com filme pronto, **incluindo as 94 que baixaram** e por isso nunca recebem
e-mail nenhum. `docs/PEDIDOS-CODEX-2026-09-06.md`, Pedido 1, deixa de ser
"melhoria" e passa a ser **o único caminho existente** para a única alavanca de
aquisição que a casa puxa sozinha.

---

## ### #9 — 22:05 — O MESMO PEDIDO, DOIS LUGARES: A TELA CONVERTE 30× O E-MAIL

Antes de propor "mais um e-mail" para resolver o degrau seco da #7, fui medir se
o e-mail que **já existe** move alguém. **A resposta fecha o ciclo.**

O e-mail instantâneo de "filme pronto" **já traz o convite** — e é bem feito:
`lib/lifecycle/videoReadyFooter.ts` escolhe o rodapé por situação
(`subscriber_next`, `trial_episode2`, `unknown_balance_episode2`, `plan_films`,
`plan_generic`), sempre com o link do próximo episódio ou do plano. Não falta
copy. **Falta clique.**

**7 dias, o MESMO pedido ("faça o próximo episódio"), duas superfícies:**

| onde | pessoas alcançadas | **pessoas que clicaram** | taxa |
|---|---:|---:|---:|
| **e-mail** (`episode_link_clicked`) | **118** | **1** | **0,8%** |
| **tela** (`series_continue_clicked`) | 93 | **22** | **24%** |

**Trinta vezes.** E a única pessoa que clicou pelo e-mail em sete dias é uma
conta externa real (`omarjrjb40@gmail.com`) — não é teste do fundador, o que
torna o número honesto e ainda assim devastador.

> ⚠️ **A ressalva que impede o exagero:** "recebeu" não é "viu". Não medimos
> abertura de e-mail, então a taxa real entre quem **abriu** é maior que 0,8%.
> Mas a decisão não depende disso: o que importa é **resultado por pessoa
> alcançada**, e por essa régua a tela ganha de 30 a 1.

### O que isso decide, e é a conclusão do ciclo

Três rotações convergiram no mesmo ponto por caminhos diferentes:

- a **#7** achou o degrau seco — 199 de 217 pessoas com filme pronto nunca
  cruzaram uma superfície com preço;
- a **#8** mostrou que o pacote está pendurado no e-mail que alcança 4 pessoas
  por semana, e ainda suprimido;
- a **#9** mostra que, mesmo alcançando, **e-mail não move**: 1 pessoa em 118.

**Portanto: não escrever carta nova.** Já era a instrução herdada do ciclo
anterior (*"46 envios, 0 retornos"*) e agora tem número próprio. O convite
pós-entrega tem de morar **na tela**, que é onde ele já funciona a 24% e onde
estão as **217** pessoas — inclusive as **94 que baixaram** e por isso não
recebem e-mail nenhum.

**A fila de valor da casa, medida e não opinada:**

1. **Pedido 1 (Codex)** — a caixa do pacote na tela de filme pronto. Único
   caminho para a única alavanca de aquisição que a casa puxa sozinha.
2. **Pedido 3 (Codex)** — instrumentar os quatro `return` mudos da faixa de
   temporada, para parar de afinar às cegas uma peça vista por 2.
3. **Nada de e-mail novo** até que 1 e 2 movam o número.

---

## ### #10 — 22:10 — VARREDURA DE REGRESSÃO: UMA QUEBRA MINHA, CONSERTADA; 14 VERMELHOS QUE JÁ ESTAVAM LÁ

Antes de fechar, rodei os **39 guardiões** que tocam nos arquivos que mexi.
**24 passaram, 15 falharam.** Fui atribuir cada falha em vez de assumir.

### A que era minha — `test-pacote-publicacao.mjs`, verificação 31

```
✗ 31. o modo so-leitura corta antes de a chave ser lida
```

A verificação exigia o **literal** `if (opts?.escrever === false) return null`.
A #5 trocou as sete saídas mudas por saídas que se nomeiam
(`return falhou('so_leitura')`). **A semântica não mudou — `falhou()` devolve
`null` — mas o texto sim, e o guardião ficou vermelho sem nada ter quebrado.**

Corrigi cobrando a **propriedade** em vez do texto: existe uma guarda de
só-leitura, ela devolve (direto ou via `falhou`), e ela vem **antes** da leitura
da chave. **Dois mutantes reprovam:** apagar a guarda, e movê-la para depois do
`OPENAI_API_KEY`.

> ⚠️ O mutante "mover a guarda" **passou na primeira tentativa** — e de novo não
> por fraqueza do guardião: a substituição `perl` não aplicou (CRLF). Refeito em
> `node`, com `grep` confirmando a troca de linhas **antes** de contar o
> resultado. É a terceira vez nesta noite que uma mutação que não aplica quase
> vira falso verde. **Conferir que a mutação entrou faz parte do teste.**

### As outras 14 — já estavam vermelhas ANTES do ciclo

Criei uma worktree no commit do **marco** (`163198f0`) e rodei as mesmas 14 ali.
**As 14 falham no baseline.** Nenhuma é minha:

`measure-growth-funnel` · `test-aeo-engine-destinations` ·
`test-business-content-plan` · `test-checkout-currency-truth` ·
`test-client-short-brief` · `test-comment-to-video` ·
`test-cta-composer-2026-09-06` · `test-local-business-tool-discovery` ·
`test-product-to-video` · `test-public-cost-planner-discovery` ·
`test-public-video-privacy` · `test-shorts-vendor-evaluation` ·
`test-text-to-video-intent-router` · `test-video-ready-nudge`

**E pelo menos uma delas é vermelha POR UM MOTIVO DELIBERADO** — não é defeito:

```
AssertionError: every live engine has one public destination
+ actual   'fast,h3,hollywood,kling,omni,s25,seedance,veo'
- expected 'fast,h3,hollywood,kling,omni,seedance,veo'
```

O motor **`s25` (Seedance 2.5) não tem página pública** — e isso é o
interruptor `S25_PUBLIC=false` do `lib/engineLaunch.ts` funcionando como o
fundador mandou: *"só contas internas veem o 2.5… só virar depois do canário
aprovado"*. **O guardião não conhece a flag.** Não toquei nele: um vermelho que
representa uma decisão do fundador não se "conserta" numa sessão autônoma.

**O que registro, sem consertar (fora do escopo do ciclo):** a casa tem **14
guardiões que ninguém roda**, e eles se dividem em duas famílias — os que
quebraram porque o produto mudou de propósito (como o do `s25`) e os que
quebraram e ninguém viu. Enquanto estiverem vermelhos, **nenhum deles protege
nada**. É trabalho de uma sessão inteira, e merece uma.

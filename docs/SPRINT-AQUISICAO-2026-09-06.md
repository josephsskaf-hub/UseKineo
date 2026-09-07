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

---

## ### #11 — 22:20 — Q8: O QUE A CASA MANDA PARA A STRIPE É IGUAL PARA TODO MUNDO — E O "41 DO TAAFT, ZERO PAGAMENTOS" ESTÁ ERRADO

**Press release.** Para quem ainda não nos conhece, esta rotação não muda nada:
ela é de medição. Para a casa, ela fecha uma suspeita cara — a de que o nosso
próprio código estivesse mandando uma sessão de checkout pior para quem vem do
TAAFT — e corrige um número que o ciclo estava carregando errado.

**Hipótese testada:** a sessão de checkout que a Kineo cria varia conforme a
fonte de aquisição, o país, a moeda ou o idioma. **Falsa.**

### O que a casa envia, e onde está escrito

Li `app/api/stripe/checkout/route.ts` inteira. A sessão é montada em
`buildAndRedirect` e vai para a Stripe em `:1703`. Os parâmetros:

| parâmetro | valor | arquivo:linha |
|---|---|---|
| `mode` | `subscription` | route.ts:1091 |
| moeda | `resolveCheckoutCurrency(country)` → **sempre `usd`** | checkoutPricing.ts:615-617 |
| região de preço | `resolvePriceRegion(country)` → **sempre `standard`** (o tipo `PriceRegion` tem um valor só) | checkoutPricing.ts:197, 635-637 |
| valor | `TIER_PRICES[tier].usd` | checkoutPricing.ts:94-98 |
| trial no cartão | `CARD_TRIAL_ENABLED = false` — nunca entra | route.ts:749-750 |
| `metadata.ip_country` | carimbado, **informativo** | route.ts:1156 |
| `automatic_tax`, `billing_address_collection`, `customer_creation`, `locale`, `payment_method_types` | **AUSENTES** → default da Stripe (os métodos de pagamento são os do painel) | grep na rota: 0 ocorrências |

**A pergunta central, respondida com prova:** um `grep` na rota por
`signup_utm_source`, `utm_source`, `signup_referrer`, `signup_country` e
`accept-language` devolve **zero linhas**. O `select` do perfil (`:812-814`) lê
`email, stripe_customer_id, is_pro, plan, stripe_subscription_id,
paypal_subscription_id, affiliate_id` — a fonte de aquisição **nem é lida**. O
país entra por `x-vercel-ip-country` (`:674`) e morre em duas funções que são
constantes desde o preço único de 19/08.

**Não há um único ramo por fonte, país, idioma ou referrer.** A única coisa que
varia é o que a pessoa escolheu (plano, anual, promo) e o `customer` dela.

### 🔴 Duas correções de premissa que o ciclo estava carregando

**1. "41 checkouts do TAAFT, zero pagamentos" — o 41 é real, o zero não é.**
1 dos 41 pagou (`gapozweb`, 17/08). Na história, TAAFT tem 4 pagantes.

**2. Os 41 misturam dois regimes de preço.** O preço único em USD subiu em
19/08; a janela de 30 dias começa em 07/08:

| fonte | período | checkouts | em INR/BRL | pagou |
|---|---|---:|---:|---:|
| taaft | antes de 19/08 | 29 | 10 | 1 |
| taaft | **desde 19/08** | **12** | 0 | **0** |
| chatgpt | antes de 19/08 | 12 | 4 | 0 |
| chatgpt | **desde 19/08** | **30** | 0 | **3** |

**29 dos 41 são do regime antigo.** A comparação honesta no regime atual é
**0 de 12 (TAAFT) contra 3 de 30 (ChatGPT)** — e o TAAFT vem escasso desde 19/08.

### A diferença que existe é de COORTE, não de código

País de cadastro de quem abriu checkout: **TAAFT = 22 de 41 em Índia/Nigéria**;
ChatGPT = 7 de 42. Os 6 pagantes do período são ES, GB, SA, US, US, ZA.
**Nenhuma conta IN/NG pagou no período.**

Amostra lado a lado (10 sessões TAAFT × 10 ChatGPT): **mesmas chaves, mesmos
valores estruturais** — `currency: usd`, `price_region: standard`,
`checkout_origin: standard`, mesma versão de janela de sessão. Nas sessões
expiradas (24 TAAFT, 30 ChatGPT): `payment_status: unpaid` e
`customer_country: null` em **100% dos dois lados** — ninguém dos dois chegou a
digitar o cartão.

**Veredito: não há conserto de código a propor.** O que sobra só existe no
painel da Stripe, e está listado no bloco de ações do fundador.

---

## ### #12 — 22:40 — A TEMPORADA GANHA A SUA PÁGINA PÚBLICA — A COISA QUE SÓ NÓS FAZEMOS DEIXA DE SER INVISÍVEL PARA QUEM NOS CITA

**Press release (6 linhas).** Quem pergunta a um motor de resposta *"qual
ferramenta me dá uma SÉRIE de Shorts, não um vídeo solto?"* passa a poder receber
uma página nossa como resposta. Até hoje não podia: a Kineo escreve os próximos
episódios da mesma história quando um filme termina — e isso não existia em
nenhuma **página**. Existia num arquivo de fatos e no `/llms.txt`. O canal que
traz 57% dos nossos cadastros cita **URLs de página**, não arquivos de texto.
`https://www.usekineo.com/ai-shorts-series`

**Hipótese:** o ChatGPT nos cita pelo que é grátis porque é só disso que temos
página. Dar página à única capacidade diferenciada muda o que ele pode citar.

### O errado, medido

- O ChatGPT é **57% da aquisição** (188 de 355 cadastros em 14 dias) e as **seis
  páginas que ele mais cita são todas sobre o que é grátis**.
- A temporada disparou `season_written` **28 vezes para 28 pessoas em 24h** —
  está viva e é real.
- **Páginas públicas sobre ela: zero.** O fato morava só em
  `lib/growth/afterTheFilmFacts.ts` e no `/llms.txt`.
- E o mapa de entrada de hoje mostra a direção: as **duas únicas** páginas de
  entrada que produziram pagamento em 14 dias são **profundas**
  (`/ai-shorts-for-agencies`, `/ai-video-generator/seedance`). A home trouxe
  **140 pessoas e 0 pagamentos**.

### O que mudou — `6d81bc70` · **EM PRODUÇÃO**

| arquivo | o que |
|---|---|
| `app/ai-shorts-series/page.tsx` (novo, 297 l.) | a página. Server component, **zero `className`**, zero CSS novo, só `style` inline — molde de `/facts` e `/models-pricing` |
| `app/sitemap.ts` | +1 rota, `LAST_MODIFIED` avançado na convenção datada |
| `app/llms.txt/route.ts` | +1 link em `## Key pages` (a seção "after a video is finished" ficou **intocada** — o guardião irmão proíbe linha solta lá) |
| `app/facts/page.tsx` | +1 item de **dados** em `SOURCE_LINKS` (só dado, nenhum layout) |
| `scripts/test-ai-shorts-series.mjs` (novo) | 29 verificações |

**Nenhum número foi digitado.** Episódios saem de `AFTER_THE_FILM_FACT.season`
(que deriva de `lib/temporada.ts`), planos de `PLAN_FACTS`, preços de
`checkoutPricing`. Se o produto passar de 5 para 3 episódios, a página muda
sozinha — em vez de virar promessa pública que o produto não cumpre mais.

**A página diz o que a temporada NÃO é, visível no HTML:** que escrever a
temporada **não renderiza** os episódios e não reserva crédito; que cada episódio
só vira filme pelo fluxo normal e é cobrado normalmente; que a temporada continua
o tema de um vídeo que a conta já fez, e não é calendário de conteúdo de marca.
Isso não é modéstia: é a trava contra a classe de erro que a casa já pagou, a de
vitrine que oferece o que o cobrador recusa.

### Prova de produção (com controle, não só com 200)

```
/ai-shorts-series                       -> 200   (103.749 bytes)
/ai-shorts-series-controle-inexistente  -> 404
```

O controle importa: um 200 sozinho não prova que a rota nova subiu. E o conteúdo
está no **HTML do servidor**, não montado por JS — `canonical`, `What this is
not`, `does not render` e `series instead of a one-off` aparecem no `curl`. É
exatamente essa a condição para um motor de resposta conseguir ler e citar.

### Testes

- `npx tsc --noEmit` → **verde** (com junction de `node_modules`; sem ela o tsc
  mente com exit 0).
- guardião novo → **29/29 verde**, e **15 mutantes** foram testados um a um,
  cada mutação aplicada com `node` (nunca `perl` — CRLF já produziu falso verde
  três vezes esta noite) e **confirmada por `git diff` antes de contar o
  resultado**. Apagar os limites, digitar "$7", digitar "5 episodes", tirar o
  canonical, tirar do sitemap, mover o link para a seção proibida, apagar o item
  do `/facts` — **cada um deixou o guardião vermelho na verificação esperada**.
- `test-after-the-film-facts` → verde.
- `audit-orphan-pages` → vermelho, **e já era**: a base tinha 7 páginas órfãs
  (`/models-pricing` entre elas). Agora tem 6, e a minha não está na lista.
  Provado rodando no commit base.
- Dos 27 guardiões que leem sitemap/llms.txt: 14 verdes, **13 vermelhos que já
  estavam vermelhos na base** — a mesma família registrada na #10.

### Risco, dito sem maquiagem

**Página nova nasce com alcance zero.** Ninguém sabe se o ChatGPT vai citá-la, e
não existe alavanca nossa que force isso — a casa já errou hoje ligando peça sem
medir alcance. O que esta rotação garante é só a **condição necessária**: antes,
a citação era impossível; agora é possível. A verificação é de dias, não de horas.

### Como medir (consulta pronta)

```sql
select date_trunc('day', created_at) d, count(*) pousos,
       count(distinct session_id) sessoes
from events
where name = 'landing_session_started' and path = '/ai-shorts-series'
group by 1 order by 1;
```

O degrau seguinte é o mesmo das outras páginas de entrada: dessas sessões,
quantas viram cadastro, filme, checkout. **Sem instrumentação nova** — a #1 já
grava fonte e `landing_path` em todo pouso.

---

## 📊 PRAXE — 24h até 01:30 UTC (07/09)

**Aquisição por fonte (contas externas):**

| fonte | cadastros | com filme | 2º filme | checkout | **pagou** |
|---|---:|---:|---:|---:|---:|
| chatgpt | 24 | 20 | 6 | 1 | **0** |
| taaft | 5 | 5 | 0 | 0 | 0 |
| nav | 2 | 1 | 0 | 0 | 0 |
| sem-fonte | 2 | 1 | 0 | 0 | 0 |
| seo | 1 | 1 | 0 | 1 | 0 |
| bing / perplexity (referrer cru) | 2 | 2 | 1 | 0 | 0 |
| **total** | **36** | **30** | **7** | **2** | **0** |

**Checagem zero:** cadastro sem crédito 2 · render preso >2h **0** ·
`next_episode_failed` **0** · `season_written` **28**.

### ✅ A #1 está funcionando — e o "316 pousos sem fonte" era falso alarme

O contador cru dizia `pouso com fonte conhecida: 1` contra `sem fonte: 316`.
**Antes de escalar, cortei no deploy** (a chave `source_known` nasceu com a #1):

| janela | pousos | têm a chave | fonte conhecida |
|---|---:|---:|---:|
| antes do deploy da #1 | 312 | **0** | 0 |
| depois do deploy da #1 | 5 | **5** | 1 |

Os 312 não têm fonte porque **a chave não existia**, não porque falhou.
Pós-deploy, **5 de 5 pousos carregam o campo**. Contas novas sem fonte nenhuma
em 24h: **2 de 36** — contra os 30 de 355 (10%) que abriram o ciclo.

### ⚠️ Uma observação que NÃO estou chamando de queda

Pousos por hora caíram para 3 (00h UTC) e 2 (01h UTC, hora incompleta) contra
12-22/h durante o dia. **Isso não é prova de regressão**: nas mesmas horas de
ontem foram 5 e 11, e no dia anterior 3 e 5. É a hora morta, e a série oscila
entre 1 e 30 por hora. Registro para a próxima rotação **reconferir com a mesma
janela de relógio**, não para consertar nada agora.

### 💡 Achado lateral com valor: o Q6 já está meio construído no banco

`profiles` tem **`referral_code`, `referred_by`, `referral_count` e
`referral_reward_granted`**. `referral_code` está preenchido em **1.310 perfis**
— e `referred_by` em **7 na história inteira**. A infraestrutura de indicação
existe e está dormindo. Quem pegar o Q6 não precisa de migração: precisa
descobrir por que 1.310 códigos produziram 7 atribuições.

### 🎯 Próxima jogada

O ChatGPT nos cita por seis páginas de "grátis" e nenhuma delas responde a
pergunta com dinheiro atrás. A página da temporada é o primeiro tijolo do lado
certo. **O segundo é mais barato ainda e ninguém puxou:**
`/state-of-ai-shorts-2026` é a **2ª página mais citada** pelo ChatGPT (25 sessões
em 14 dias), converteu **0 checkouts** — e **não está no `/llms.txt`** (um `grep`
por `state-of` no arquivo volta vazio). Estamos sendo citados com sucesso pela
peça que não vende, sem sequer ter dito ao motor o que ela é. Pôr a página mais
citada no arquivo que o motor lê é **uma linha de dado, sem tela**, e o alcance
**já existe** — ao contrário da minha página nova, que nasce com zero.

---

## ✅ O QUE VOCÊ PRECISA FAZER

1. **Abrir a Stripe → Payments → filtro "Incomplete"**, de 19/08 até hoje, e ver
   se alguma sessão com `metadata.ip_country` = `IN` ou `NG` chegou a gerar
   PaymentIntent (ou seja: se alguém chegou a tentar o cartão). Só o painel
   responde isso — o nosso banco não guarda.
2. **Stripe → Settings → Payment methods:** conferir quais métodos estão ativos
   para Índia e Nigéria. A nossa rota **não envia** `payment_method_types`, então
   quem decide é o painel — e metade dos checkouts do TAAFT vem desses dois países.
3. **Abrir `https://www.usekineo.com/ai-shorts-series`** e dizer se o texto está
   do jeito que você quer. É a primeira página pública da temporada.

## 📋 O QUE ACONTECEU

Duas coisas. Primeiro, fui atrás da suspeita de que a casa mandasse um checkout
pior para quem vem do TAAFT: **não manda**. A sessão que criamos é idêntica para
todo mundo — moeda, preço e região são constantes desde 19/08, e a fonte de
aquisição nem é lida pela rota. De quebra, dois números que o ciclo carregava
estavam errados: o TAAFT teve **1 pagamento nos 41 checkouts** (não zero), e
**29 dos 41 são de antes do preço único**. A diferença real entre TAAFT e ChatGPT
é quem chega: metade do TAAFT é Índia e Nigéria, e ninguém desses países pagou
no período. O que falta ver só existe no painel da Stripe.

Segundo, subi a **primeira página pública da temporada**
(`usekineo.com/ai-shorts-series`). A temporada é a única coisa que a casa faz e
os concorrentes não fazem, funcionou 28 vezes nas últimas 24 horas — e não tinha
página nenhuma. O ChatGPT, que traz 57% dos nossos cadastros, cita páginas; sem
página, ele não tinha como nos citar por isso. A página é feita só de fatos
lidos do código (nenhum número digitado), diz na cara o que a temporada **não**
é, e está no ar com prova. **O que ela não faz é prometer resultado:** página
nova nasce sem alcance, e isso só se mede em dias.

---

## ### #13 — 23:00 — O MAPA QUE ENTREGAMOS AO MOTOR OMITIA AS PÁGINAS QUE ELE JÁ ACHOU SOZINHO

**Press release.** Um motor de resposta que lê o nosso `/llms.txt` passa a
encontrar lá as dez páginas que ele mais usa para nos citar — cada uma com uma
linha dizendo **qual pergunta ela responde**. Antes, o arquivo listava 27 rotas e
quase nenhuma delas era uma das que o motor de fato cita.

### A honestidade primeiro, porque ela limita o tamanho desta rotação

**O ChatGPT cita essas páginas SEM que elas estivessem no `/llms.txt`.** Logo o
arquivo **não é** o que causa a citação, e esta mudança **não é** uma alavanca
com número prometido. Não vou vendê-la como uma. O que ela conserta é real e
menor: o mapa que entregamos estava errado, e agora cada linha diz para que
serve a página — o que ajuda o motor a escolher a **página certa para a pergunta
certa**. A leitura #3 do mapa de hoje é exatamente esse defeito: *"estamos sendo
citados com sucesso pela peça errada"*.

### O errado, medido

| o que o motor mais cita | sessões/14d | estava no llms.txt? |
|---|---:|---|
| `/free-ai-shorts-generator` | 27 | não |
| `/state-of-ai-shorts-2026` | 25 | **não** |
| `/ai-video-generator/kineo-1` | 24 | só como fato de motor, sem a pergunta |
| `/text-to-video-shorts` | 23 | só com fragmento, sem a pergunta |
| `/how-much-do-youtube-shorts-pay` (busca) | 8 | não |
| `/can-you-monetize-ai-videos` (busca) | 7 | não |
| `/tiktok-vs-youtube-shorts-monetization` (busca) | 6 | não |

### O que mudou — `5c3e9695` · **EM PRODUÇÃO**

**10 rotas** acrescentadas em `## Key pages`, cada uma com `Cite this page
for "…"`. Os caminhos dos motores vêm de `engineLandingPublicPath()` — a mesma
derivação que `ENGINE_FACTS` usa —, não digitados.

**Antes de listar, cada rota teve de provar que existe** (arquivo em `app/` +
entrada no `app/sitemap.ts`). **Uma foi recusada: `/scripts`.** Ela está atrás de
`CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED = false` e hoje devolve **404**
(`app/scripts/page.tsx:101` → `notFound`). Uma rota morta no arquivo que o motor
lê é pior que a omissão: ele cita, a pessoa clica e cai em nada. Ficou de fora,
com checagem negativa no guardião para que ninguém a acrescente sem virar a flag.

**Guardião novo** `scripts/test-llms-paginas-citadas.mjs` — 84 verificações, lendo
os arquivos reais. **3 mutantes** aplicados com `node` e confirmados por
`git diff` antes de contar: tirar uma rota do llms, tirar a mesma rota do
sitemap, apontar o Kineo 1 para o motor errado. **Os três ficaram vermelhos.**

Dos 22 guardiões que leem esse arquivo: **12 verdes continuam verdes**, e os
**9 vermelhos já eram vermelhos** no commit base — o mesmo conjunto antes e
depois. (Nota para quem for consertá-los: 6 dos 9 caem juntos, todos por causa do
handoff dos geradores para o Studio.)

**Aviso de arquivo** registrado no `docs/PEDIDOS-CODEX-2026-09-06.md`, para o
Codex não duplicar a página nova da temporada.

---

## ### #14 — 23:20 — 🔴 O INTERRUPTOR QUE O CICLO MANDAVA DEIXAR PRONTO PERDE DINHEIRO A CADA VENDA

**Press release.** Nada muda para quem chega. Muda para o caixa: a oferta de
**$2,90** que estava pronta para ser ligada com uma palavra **dá prejuízo de
$0,78 por venda**. Documento de decisão completo em
`docs/SPEC-PRIMEIRA-COMPRA-PEQUENA-2026-09-07.md`. **Nada foi ligado.**

### A conta que ninguém tinha feito

| item | valor | onde |
|---|---|---|
| oferta $2,90 concede | **25 créditos** | `lib/checkoutPricing.ts:413-414` |
| 25 créditos = | exatamente **1 Seedance de 60s** | `lib/credits/engineCost.ts` |
| custo medido desse render | **$3,30** | `lib/credits/engineCost.ts:97` (fatura de agosto) |
| líquido da Stripe em $2,90 | **$2,516** | taxa da Stripe |
| **resultado** | **−$0,78 por venda** | ponto de equilíbrio: **$3,71** |

**E o invariante do repositório aprova o SKU por engano:** ele contabiliza a
sobra de crédito a $0,066/cr (`lib/checkoutPricing.ts:308-313`), preço que não
vale para o único uso que a própria faixa da oferta anuncia. O guardião existia,
rodava e dizia verde — porque estava medindo a coisa errada.

### 🔴 E a premissa do próprio item do ciclo estava errada

O cardápio dizia que o pack de **$4,90 está dormindo esperando decisão**.
**Não está dormindo — está no ar, sem flag nenhuma, e ninguém compra:**

- responde em `/api/stripe/checkout?pack=starter` **sem flag** (`route.ts:2289`);
- mora dentro de um `<details>` **fechado por padrão**, dobrado dentro de
  "Other options" (`GenerateClient.tsx:15695-15733`);
- **231 pessoas** passaram pelo bloco onde ele vive em 30 dias;
- **0 `checkout_attempted`** em **54 dias** de instrumentação;
- `post_video_single_unlock_clicked`: **0 na história**.

E as "3 vendas de $4,90" de agosto que apareciam no relatório **não eram packs**:
eram assinaturas Starter no preço de entrada.

> É a lição de sempre nesta casa, agora com um terceiro caso: **peça sem
> superfície não existe.** A #6 mediu isso no pacote de publicação, a #9 no
> e-mail, a #14 no pack. Não é falta de oferta — é falta de lugar onde a oferta
> apareça.

### A coorte, dimensionada ANTES de qualquer remédio

**65 pessoas bateram na parede de saldo em 30 dias** (contas externas): 62 não
pagantes · **44 já tinham filme entregue** · 22 chegaram ao checkout · 3 pagaram,
todas **assinatura**. 41 das 65 estão com saldo **zero**. E **40 das 65 bateram
na parede em menos de 24h depois do primeiro filme** — mediana de **0,2 hora**.

**O que 30 créditos realmente compram:** 1 Seedance 60s + 1 Kineo 1, ou 2 Seedance
de 35s, ou 6 Kineo 1 — e **zero** de Kling 2.5, MiniMax H3, Veo ou Kling 3 a 60s.
Para **12 das 22** pessoas com déficit medido de 1 a 24 créditos, o pack fecha a
conta. Para quem queria um motor caro, não fecha para ninguém com saldo zero.

**Canibalização, medida:** dos 13 que assinaram em 90 dias, **2** tinham cruzado
a parede de saldo antes, e só **1** comprou o plano que o pack substituiria. O
que o dado **não** responde: o contrafactual dos 19 que bateram na parede,
chegaram ao checkout e não pagaram.

### Recomendação (a decisão continua sendo do fundador)

1. **NÃO virar `OFFER_290_ENABLED`** (`lib/flags.ts:13`). Perde dinheiro.
2. **Não construir superfície nova** para o pack antes de testar a que existe.
3. Se for fazer algo: **expor o pack de $4,90 que já existe** dentro do modal do
   "não" (`upgrade_modal_opened`), só para não-assinante com déficit ≤ 30cr.
   Isso é **tela — pista do Codex**, não flag. A medição já existe no servidor
   (`checkout_attempted sku=starter10`), então não precisa de instrumentação nova.
4. **A condição que derruba a ideia**, escrita antes de tentar: 30 exposições
   nesse recorte com **0** tentativas de checkout = a parede não é de $4,90, e o
   assunto morre.

### Dois achados colaterais, anotados sem consertar

- **`send-video-rescue` promete o pack e manda a pessoa para `/pricing`** — que
  não vende o pack. Quem clica não acha o que a carta ofereceu.
- **O 402 do compose ("available on paid plans") não emite evento nenhum.** É uma
  parede que a casa não consegue contar.

### O que não foi medido (dito, não escondido)

Custo real de Seedance/Kling 2.5 a **35s** não existe no repositório — "60% de
$3,30" seria chute, e não entrou na conta. Também não dá para saber se alguma
das 231 pessoas chegou a **abrir** o `<details>`: o evento observa o bloco
inteiro, não o clique.

---

## ✅ O QUE VOCÊ PRECISA FAZER

1. **NÃO ligue a oferta de $2,90.** Se você já ia virar `OFFER_290_ENABLED`
   amanhã, este é o motivo para não virar: **−$0,78 por venda**, ponto de
   equilíbrio em $3,71. Se quiser essa oferta, ela precisa de outro preço ou de
   outro pacote de créditos — e isso é decisão sua, de preço público.
2. **Ler `docs/SPEC-PRIMEIRA-COMPRA-PEQUENA-2026-09-07.md`** e dizer se topa a
   única ação recomendada: mostrar o pack de $4,90 (que já está no ar) dentro do
   modal do "não", para quem falta ≤ 30 créditos. Se topar, vira pedido ao Codex.
3. **Stripe → Payments → filtro "Incomplete"** (19/08 até hoje): ver se alguma
   sessão com `metadata.ip_country` = `IN` ou `NG` chegou a gerar PaymentIntent.
4. **Stripe → Settings → Payment methods:** conferir o que está ativo para Índia
   e Nigéria — metade dos checkouts do TAAFT vem de lá e a nossa rota não envia
   `payment_method_types`, então quem decide é o painel.
5. **Abrir `https://www.usekineo.com/ai-shorts-series`** e dizer se o texto da
   primeira página pública da temporada está do jeito que você quer.

## 📋 O QUE ACONTECEU

Duas entregas e um susto bom.

Arrumei o **mapa que entregamos aos motores de resposta**: o `/llms.txt` listava
27 páginas e quase nenhuma era das que o ChatGPT de fato cita. Agora as dez mais
citadas estão lá, cada uma dizendo qual pergunta responde. Sem promessa: o motor
já citava essas páginas sem o arquivo, então isso não é uma alavanca — é um mapa
que estava errado e agora está certo. De quebra, tirei `/scripts` da lista porque
ela está atrás de uma flag desligada e hoje dá **404**: melhor omitir do que
mandar gente para o vazio.

O susto: fui preparar a **spec da primeira compra pequena** para você poder ligar
com uma palavra, e a conta não fecha. A oferta de **$2,90 dá 25 créditos, que
compram exatamente um Seedance de 60s — e esse render custou $3,30**. Cada venda
perderia $0,78. O invariante que deveria pegar isso aprovava, porque calculava a
sobra de crédito a um preço que não vale para o uso anunciado. E o pack de
**$4,90 não estava dormindo esperando você**: está no ar há meses, escondido
dentro de um menu fechado — **231 pessoas passaram por perto e ninguém clicou uma
vez em 54 dias**. O problema nunca foi falta de oferta barata; é que ela não tem
onde aparecer. Sessenta e cinco pessoas bateram na parede de saldo em 30 dias, e
quarenta delas bateram **menos de um dia depois do primeiro filme**.
## ### #11 — 23:05 — 🔴 O DENOMINADOR DA MINHA PRÓPRIA MÉTRICA ESTAVA ERRADO

Na **#1** eu escrevi: *"Hoje 12,5% das sessões com fonte. **Alvo: acima de
70%**."* Fui conferir o progresso às 02:00 UTC e a cobertura tinha **caído** para
8% (1 de 13). Antes de inventar explicação, olhei **quais** eram as 13 sessões:

| página do pouso | sessões | tem fonte? |
|---|---:|---|
| `/signup` | **7** | não |
| `/admin` | 1 | não (sou eu) |
| `/studio` | 1 | não |
| `/` | 1 | não |
| `/ai-video-generator/kineo-1` | 1 | **sim — `chatgpt.com`** |
| `/youtube-shorts-script-timer` | 1 | não |
| `/free-script-generator` | 1 | não |

**Nove das treze não são pouso de aquisição.** `/signup`, `/studio` e `/admin`
são superfícies de gente **que já está no funil** — chega por marcador, por
e-mail ou navegando de dentro do produto. Essa gente **não tem fonte externa
para gravar**, e isso não é falha de instrumento: é a verdade.

### Medindo os 14 dias com a divisão certa

| tipo de pouso | sessões | % do total | com referrer |
|---|---:|---:|---:|
| **interna / retorno** (`/signup`, `/login`, `/studio`, `/admin`, `/history`…) | **1.817** | **50,4%** | **0,9%** |
| **aquisição** (página pública) | 1.791 | 49,6% | **35,7%** |

**Metade de todos os "pousos" nunca poderá ter fonte.** Portanto:

- **o "12,5% de linha de base" estava diluído** — a base honesta, entre pousos de
  aquisição, já era **35,7%** só com referrer;
- **o "alvo de 70%" era impossível.** Sobre *todas* as sessões, o teto
  aritmético é ~50%. Eu publiquei uma meta que o instrumento não pode atingir
  nem funcionando perfeitamente.

### O alvo corrigido

**A métrica é a cobertura entre pousos de AQUISIÇÃO**, não entre todos.
Base: **35,7%** (só referrer). O ganho esperado da #1 vem de quem chega **sem
referrer e com utm** — que é o caso de **108 dos 188** cadastros do ChatGPT em
14 dias. **Alvo: acima de 70% dos pousos de aquisição**, e o `/signup` sai da
conta.

### Por que isto importa mais do que parece

É a **quarta vez nesta noite** que um denominador errado quase virou conclusão:
sessões contadas como pessoas (mapa de entrada), "0 de 42" que era "0 de ~1"
(pacote), checkout de quem nunca viu o produto misturado com quem viu, e agora a
minha própria meta. **Três das quatro eram minhas.** O padrão é sempre o mesmo —
o número está certo e a população embaixo dele está errada — e é por isso que as
consultas ficam salvas em `docs/queries/` **com as armadilhas escritas no
cabeçalho**, em vez de viverem só no diário.

**Com o filtro certo, desde o marco:** 4 pousos de aquisição, **4 de 4
instrumentados (100%)**, 1 com fonte. `n = 4` é pequeno demais para virar taxa —
**não é medição, é sinal de que o cano está aberto.** A taxa se lê amanhã, com
tráfego de dia. A consulta salva já traz o filtro **e o aviso de que ele não é
opcional**.

---

## ### #15 — 22:50→23:40 — A PORTA QUE ABRIU HOJE ESTAVA SEM CARTÃO E SEM MAPA

**Press release (6 linhas).** Quem recebe um filme da Kineo agora pode
transformá-lo, em um clique, numa **página pública com endereço próprio** — e
essa página finalmente se comporta como página: manda cartão de pré-visualização
quando o link é colado no WhatsApp, no X ou no Instagram, e entra no mapa que
oferecemos ao Google. Até hoje o clique existia, a página abria, e as duas
coisas que fazem um link virar visita estavam quebradas. Cada filme entregue
(~20 por dia) passa a poder ser uma porta de entrada, e não só um arquivo.

**Hipótese:** o gargalo da aquisição é denominador. A casa entrega ~20 filmes
por dia; se uma fração deles virar link compartilhável com cartão, o produto
passa a se anunciar sozinho, sem custo por clique.

### O errado, medido ao vivo (com uma linha realmente publicada)

Para medir precisei de uma linha com consentimento — não existia nenhuma. Usei
um filme **do fundador** (`83db8b63…`, Lituya Bay, 62s) e carimbei
`published_at` à mão para a prova, com `published_via` =
`ceo_validacao_ponta_a_ponta_2026-09-06` no rastro de auditoria.

| sonda | antes | o que significava |
|---|---|---|
| `/v/83db8b63…` | **200**, H1 real, canonical, sem noindex | a página FUNCIONA |
| `/v/83db8b63…/opengraph-image` | **404, 0 bytes** | **cartão em branco** em todo link compartilhado |
| `X-Video-Sitemap-Count` | **6** (só os exemplos fixos) | a página consentida era invisível ao Google |
| `videos.published_at` não nulo | **0 de 1.652** | ninguém publicou ainda |

**Causa única, nos dois defeitos:** a trava GLOBAL de 27/08
(`CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED = false`) nunca foi ensinada sobre o
campo de consentimento POR LINHA que subiu **hoje** (#27/#28).
`opengraph-image.tsx` fazia `if (!FLAG) notFound()` incondicional;
`listIndexablePublicVideos` fazia `if (!FLAG) return []` sem exceção para linha
carimbada. A #27/#28 construiu a porta certa e a fechadura velha continuou
mandando nas duas superfícies que trazem gente.

### O que mudou — `1de0a71e` e `3bd14969` · **EM PRODUÇÃO**

| arquivo | o que |
|---|---|
| `lib/publicSurfacePolicy.ts` | `publicSurfaceAllowsRow(publishedAt)` — a única porta nova. A flag continua `false as const` |
| `app/v/[id]/opengraph-image.tsx` | `published_at` vem na MESMA consulta do título (uma ida ao banco). Sem credencial, sem linha, erro ou catch → `notFound()`. Antes, **sem credencial a rota devolvia título genérico** — ausência de leitura valia como permissão. O bitmap é idêntico |
| `lib/publicVideos.ts` | com a trava fechada, a consulta do sitemap filtra `.not('published_at','is',null)` **no servidor**. `PUBLIC_VIDEO_COLUMNS` intocada |
| `app/video-sitemap.xml/route.ts` | o **segundo cadeado** (abaixo) |
| `app/api/compose/status/[renderId]/route.ts` · `app/api/cron/send-video-ready/route.ts` | a copy do botão |
| `scripts/test-consentimento-superficie.mjs` (novo) | 60 verificações |
| `scripts/test-erros-vercel-2026-09-03.mjs` | a asserção antiga afirmava o portão global incondicional, que deixou de existir — atualizada com honestidade, não apagada |

**O princípio, agora escrito no código:** a trava global continua **fechada**; o
que abre a superfície é o **consentimento por linha**. Sem `published_at`, nada
muda em relação a ontem (falha FECHADA). Com a trava em `true`, o comportamento
antigo volta inteiro.

### O segundo cadeado — e por que eu quase o virei errado

Subi a #15, a capa voltou (og 200) e o sitemap **continuou em 6**. A causa não
era minha: `app/video-sitemap.xml/route.ts` tem cadeado próprio,
`KINEO_VIDEO_SITEMAP_MAX`, com **padrão 0** — sem a env, a rota nem consulta o
banco.

E esse cadeado **não era sujeira**. Foi posto em 12/08 sobre número do Search
Console: 602 páginas de vídeo = **79% de tudo** que a casa pedia ao Google · 704
"detectada, mas não indexada" · **0 impressões e 0 cliques em 28 dias** · e a
fila de não-rastreados começando pelas 27 páginas `/alternatives` escritas à
mão. Virar aquilo de volta às cegas seria repetir um erro já pago.

O que mudou desde 12/08 **não é o orçamento de rastreamento; é a curadoria.** Em
12/08 o produto listava todo filme `completed` sem ninguém ter pedido. Agora só
entra linha com carimbo do dono. Por isso o padrão virou condicional:

- trava global **aberta** (todo filme vira página) → padrão **0**, igual a 12/08.
  O modo que a medição condenou continua condenado.
- trava global **fechada** (só quem consentiu) → `CONSENT_DEFAULT_MAX = 60`.
  Hoje isso é **1 página**. Se um dia forem 60, ainda é uma fração das 164 que a
  casa já pede, e cada uma tem dono que pediu.

A env continua mandando mais que o padrão nos dois modos, e `0` nela continua
desligando tudo. **Condição de morte, escrita antes de tentar e gravada no
arquivo:** se o Search Console mostrar as páginas consentidas rastreadas e com
**0 impressões em 30 dias**, o padrão volta a 0.

### E a copy, no mesmo commit, porque a peça mudou o que o clique faz

`app/api/cron/submit-indexnow` usa a **mesma** `listIndexablePublicVideos`. Ou
seja: a página consentida passa a ser **submetida ativamente** aos buscadores.
Os dois e-mails prometiam apenas *"um link que você manda por mensagem"*. Agora
dizem que a página é pública, que **buscadores podem achá-la**, e que dá para
**tornar privada de novo**. Prometer menos do que o produto faz com o dado da
pessoa é a classe de erro mais cara desta casa.

### Prova de produção — com controles, não só com 200

```
/v/83db8b63…/opengraph-image ............ 200  image/png  55.811 bytes
/v/11111111-…-555555555555/og ........... 404   (id inexistente)
/v/fe055601…/opengraph-image ............ 404   (filme COMPLETO, SEM consentimento)
X-Video-Sitemap-Count ................... 6 -> 7
sitemap.xml / home / ai-shorts-series ... 200 / 200 / 200  (nada quebrou junto)
```

E a entrada no mapa carrega o que o Google exige: `video:thumbnail_loc` (a capa
que acabou de nascer), `video:title`, `video:description`, `video:content_loc`
no storage durável, `video:duration` = 62.

### Testes

- `scripts/test-consentimento-superficie.mjs` — **60 verificações, 0 falhas**.
  Estilo `readFileSync` (nesta casa 72 guardiões morrem no import com alias
  `@/`), amarrado à **variável que decide**: mutante que troque a condição por
  `true`, ou o padrão do sitemap por `SITEMAP_MAX_VIDEOS`, fica vermelho.
  Falsificação conferida por mutação em cópia, com restauração verificada.
- `npx tsc --noEmit` verde (com junction de `node_modules`).
- Irmãos: `test-erros-vercel-2026-09-03` OK · `test-video-share-consent` OK (37).
- **Vermelho alheio, não consertado:** `test-growth-space-intent.mjs` e
  `test-public-video-privacy.mjs` já estavam vermelhos **antes** desta mudança
  (conferido com stash isolado). O segundo morre na linha 58 desde a #27 e,
  quando alguém consertar aquela linha, vai destampar 5 asserções que citam as
  strings antigas — está anotado no commit.

### Risco, dito sem maquiagem

1. **Uma página do fundador ficou pública** — a de Lituya Bay. Foi o que provou
   o caminho, e é hoje a única página `/v/` viva. Deixei publicada de propósito:
   serve de demonstração e de sonda. Despublicar é um clique (`&undo=1`) ou uma
   linha no banco.
2. **A biblioteca de "relacionados"** (`lib/scriptLibrary.ts`) usa a mesma lista.
   Com **dois ou mais** filmes consentidos e aprovados, um passa a aparecer como
   "related" na página do outro. É coerente (todo membro tem consentimento e
   nenhum link vai para 404), mas é mudança visível numa tela — e com 1 página
   ainda não acontece.
3. **IndexNow** vai submeter a URL consentida no próximo ciclo do cron. É o
   objetivo; a copy agora avisa.

### Como medir (e o que derruba isto)

- **Adoção:** `select count(*) from events where name='video_published_v1'` —
  hoje **0**. O botão está no e-mail de entrega desde ~22:15 (158 e-mails /
  107 pessoas por semana). **Condição de morte:** 7 dias, 100+ e-mails com o
  botão e **0** cliques = a partilha não é desejo, e a peça se desliga.
- **Efeito:** `X-Video-Sitemap-Count` e, no Search Console, impressões das URLs
  `/v/` — 30 dias, conforme a condição de morte já registrada.

### Praxe — aquisição nas últimas 24h (contas externas)

| fonte | cadastros | com filme | 2º filme | checkout | pagou |
|---|---|---|---|---|---|
| chatgpt | 24 | 20 | 6 | 1 | 0 |
| taaft | 5 | 5 | 0 | 1 | 0 |
| nav | 2 | 1 | 0 | 0 | 0 |
| (sem fonte) | 2 | 1 | 0 | 0 | 0 |
| perplexity.ai | 1 | 1 | 0 | 0 | 0 |
| busca | 1 | 1 | 1 | 0 | 0 |
| seo | 1 | 1 | 0 | 1 | 0 |
| **total** | **36** | **30** | **7** | **3** | **0** |

**A #1 e a #2 deste ciclo estão funcionando:** "sem fonte" caiu de **10%** (30 de
355 em 14 dias) para **5,6%** (2 de 36 em 24h). E apareceu uma fonte que o mapa
de 14 dias não tinha: **perplexity.ai**.

**Checagem zero:** cadastro sem crédito e sem filme **0** · render preso **0** ·
`next_episode_failed` **0** · `video_published_v1` **0** (esperado, peça de 1h) ·
`generation_stage_error` 10 em 24h contra 30 pessoas com filme entregue.

### Próxima jogada

**O botão está no e-mail; a tela ainda não tem.** A #9 deste ciclo mediu que a
tela converte **30x** o e-mail (22 pessoas contra 1 em 7 dias) para o mesmo
pedido. O `/api/compose/status` já **calcula** `publishHref` e o devolve — e
**nenhum cliente o renderiza**. Quem acabou de ver o filme ficar pronto no
Studio é exatamente quem está no pico da alegria, e é a única pessoa que ainda
não tem o botão. Isso é tela: vira **PEDIDO ao Codex**, não código meu.

---

## ### #16 — 23:20 — 🔴 O CLIQUE DE E-MAIL CHEGA SEM COOKIE, E A CASA OFERECIA **CRIAR CONTA** A QUEM JÁ ERA CLIENTE

### Press release (6 linhas)

> A Kineo manda ~210 e-mails por dia para gente que já tem conta aqui. Quem
> clicava em "venha fazer outro filme" a partir da caixa de entrada não caía no
> login: caía num formulário de **criar conta**. O motivo é banal, e é por isso
> que sobreviveu meses — a casa decidia "essa pessoa já tem conta?" olhando um
> cookie no aparelho, e o clique de inbox chega estruturalmente sem cookie
> nenhum. A partir de agora, o e-mail é a prova: quem vem de carta nossa entra
> pela porta de **entrar**, com o destino inteiro preservado.

**Hipótese:** o degrau que some entre "e-mail enviado" e "pessoa voltou" não é
só desinteresse — parte dele é uma porta errada. **Parada:** se o evento novo
mostrar 30 dias de cliques de e-mail chegando e a taxa de retorno não mexer, a
porta não era o gargalo e a peça se desliga.

### O errado, medido em produção — com controle, não só com 200

Sonda com UA de navegador real (curl pelado é lido como robô e pula o ramo bom):

```
/generate?utm_source=lifecycle&utm_medium=email&utm_campaign=trial_d0
    307 -> /studio/create?...   307 -> /signup?redirect=...   200   ❌
/library?utm_source=lifecycle&utm_medium=email&...   307 -> /login   ✅
/history                                             307 -> /login   ✅
/rota-que-nao-existe-ceo-probe                       404             (controle)
```

**Todas as outras rotas protegidas da casa já mandavam para `/login`.** Só o
`/studio/create` mandava para `/signup` — e ele é o destino do CTA "venha fazer
outro filme", o pedido mais repetido de toda a máquina de e-mail.

A decisão morava em `app/(dashboard)/studio/create/page.tsx`:

```ts
const hasPriorSession = cookies().getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))
const authPath = hasPriorSession ? '/login' : '/signup'
```

Um sinal só — e é o sinal que o clique de caixa de entrada **não tem por
construção**: webview do Gmail, outro aparelho, aba anônima. O
`/api/episode-link` (05/09) já tinha escrito exatamente esse diagnóstico para o
botão do episódio 2; ninguém o levou ao portão que todo mundo atravessa.

### O alcance — e é o que decidiu consertar no PORTÃO, não nos remetentes

**Nove** remetentes carregam essa porta: `trial-lifecycle-emails` (6 links),
`send-failure-recovery` (4), `send-activation-nudge`, `send-video-rescue`,
`send-winback-25`, `send-blackout-winback`, `send-credits-back`,
`send-reminders`, `finish-stranded-renders`.

| carta | envios em 7 dias | porta |
|---|---|---|
| `trial_lifecycle` → `d0_welcome` | **188** | ❌ /signup |
| `trial_lifecycle` → `ending_soon` / `expired_*` / `downgraded_loss` | 692 | ✅ /pricing e /library |
| `momentum_nudge` · `video_ready` · `next_episode_wall` | 327 | ✅ porta boa (já usavam) |
| `failure_recovery` · `video_rescue` · `season_letter` | 23 | ❌ /signup |

O `d0_welcome` é a **carta de boas-vindas**: a pessoa acabou de criar a conta e
era convidada a criar outra. 188 vezes em 7 dias.

**Consertar 9 arquivos deixaria a décima campanha nascer errada**, e o modo de
falha é SILENCIOSO — o link "funciona", a tela é bonita, e nada no log distingue
isso de sucesso. Foi assim que durou.

### O que mudou — `c1b0c46d` · **EM PRODUÇÃO**

| arquivo | o que |
|---|---|
| `lib/lifecycle/emailReturnDoor.ts` (novo) | A fonte única. **Exigência TRIPLA**: `utm_medium=email` + `utm_source` nosso + `utm_campaign` não vazio. Falha **ABERTA**: sem sinal nenhum, continua `/signup`, idêntico a ontem. Arquivo puro, zero imports (não pode quebrar o build da Vercel com typecheck verde) |
| `app/(dashboard)/studio/create/page.tsx` | A decisão passa pela função. JSX intocado |
| `send-blackout-winback` · `finish-stranded-renders` (×2) · `send-avatar-launch` | 4 links que nem **chegavam** ao portão (viajavam sem medium/campaign) passam por `composerUrl()`. O rótulo antigo vira `utm_campaign`, então nenhuma medição quebra — conferido por grep: nenhum leitor da casa lê esses `utm_source` |
| `scripts/test-porta-email-2026-09-06.mjs` (novo) | 113 verificações |

O `blackout_winback` era pior que os outros: apontava para `/generate` **sem
query nenhuma**, e o porteiro degradava o destino para `/studio` — a vitrine,
que não tem composer. Era o defeito "CTA cai na vitrine" que o próprio
`composerUrl.ts` documentou hoje de manhã, ainda vivo num remetente.

### E a cegueira, no mesmo commit — porque foi ela que escondeu isto

O desvio de deslogado só emitia evento quando `activationEntry !== 'standard'`
(9 em 3 dias). **O caso comum não emitia NADA.** Não era medição ruim: era
ausência de medição por construção, e é a resposta para "por que ninguém viu".

Agora todo desvio emite `studio_create_auth_door_v1` com `porta`,
`veio_de_email`, `tem_cookie`, `utm_campaign`, `utm_source`. O evento antigo
ficou intacto — outra medição pode depender dele.

### Prova de produção — com os controles que discriminam, não só com 200

```
O CONSERTO
  e-mail nosso (3 sinais) ................. 307 -> /login?redirect=%2Fstudio%2Fcreate%3F...
  /generate de e-mail, cadeia inteira ..... 307 -> 307 -> /login  (200)   [era /signup]

OS CONTROLES — falha ABERTA, tem de continuar /signup
  visitante novo, sem sinal nenhum ........ 307 -> /signup
  só utm_source (falta medium+campaign) ... 307 -> /signup
  medium=email mas source alheio .......... 307 -> /signup
  3 sinais mas campaign vazio ............. 307 -> /signup

OS 4 LINKS QUE NEM CHEGAVAM AO PORTÃO
  blackout_winback (ia para a VITRINE) .... 307 -> /login
  attempt_lost com prefill ................ 307 -> /login  (&prompt=Lost+city preservado)

NADA QUEBROU JUNTO
  home / pricing / studio ................. 200 / 200 / 200
  CONTROLE inexistente .................... 404
```

### Testes

- `scripts/test-porta-email-2026-09-06.mjs` — **113 verificações, 0 falhas**.
  Estilo `readFileSync` (alias `@/` mata 72 guardiões desta casa no import).
  Amarrado à **variável que decide**: **9 mutantes provados vermelhos** —
  condição por `true`, `/login`↔`/signup` invertidos, `utm_medium` removido da
  conjunção, `||`→`&&`, página ignorando a função (prova de chamador), evento de
  volta para dentro do ramo não-standard, redirect perdendo o destino, URL crua
  nos 3 remetentes.
- **A lição da rodada, registrada porque quase passou:** na primeira tentativa
  de falsificação, 3 mutantes **não chegaram a aplicar** (cotação do shell +
  CRLF) e o guardião reportou verde — o que se leria como "o mutante não
  derrubou o guardião", quando na verdade não havia mutante. Rodada de mutação
  tem de **provar que a mutação aplicou** antes de ler o veredito. Refeita com
  essa checagem, e o `.bak` restaurado byte a byte.
- `npx tsc --noEmit` verde (com junction de `node_modules`; conferido com
  `--listFilesOnly` que os arquivos novos estão mesmo no programa — tsc mente
  com exit 0 em worktree sem `node_modules`).
- Vizinhos: conjunto de falhas **idêntico antes e depois** — os 5 vermelhos
  (`test-cta-composer`, `test-clique-perdido`, `test-avatar-card`,
  `test-stranded-email-dedupe`, `test-stranded-extra-attempt-4xx`) já estavam
  vermelhos em HEAD. Alheios, listados, não consertados.

### Risco, sem maquiagem

1. **E-mail encaminhado a um amigo sem conta** cai em `/login` em vez de
   `/signup`. A página de login oferece criar conta; o caso é raro e o ganho
   inverso é ~190 e-mails por semana.
2. **A regra agora vive em dois lugares** — aqui e no `/api/episode-link`. Não é
   contradição (os dois mandam para `/login`), mas é dívida anotada.
3. **Latência:** o evento é aguardado antes do redirect. `writeServerEvent`
   engole erro por dentro; o redirect acontece sempre.

### O que a peça NÃO alcança (dito antes de alguém descobrir)

O ramo **sem prefill** do `attempt_lost` continua indo para `/studio` de
propósito (rota pública, nunca caiu em `/signup`). E os 11 `season_letter`
enviados hoje às 15:45 UTC saíram pela porta velha e estão **carimbados para
sempre** — a rota é 1-por-pessoa-vitalício, então essas 11 pessoas nunca mais
recebem a carta da temporada. É perda real; desfazer exige apagar o carimbo
delas, e isso é decisão do fundador.

### Como medir (consulta pronta) — e o que derruba isto

```sql
select metadata->>'porta' porta, (metadata->>'veio_de_email')::bool de_email,
       metadata->>'utm_campaign' campanha, count(*)
from events where name='studio_create_auth_door_v1'
  and created_at > now() - interval '7 days' group by 1,2,3 order by 4 desc;
```

**Condição de morte, escrita antes de saber o resultado:** 30 dias, com cliques
de e-mail comprovadamente chegando (`de_email=true` acima de 50), e a taxa de
retorno pós-e-mail sem mexer → a porta não era o gargalo e a peça se desliga.

### Praxe — aquisição nas últimas 24h (contas externas)

| fonte | cadastros | com filme | 2º filme | checkout | pagou |
|---|---|---|---|---|---|
| chatgpt | 24 | 21 | 6 | 1 | 0 |
| taaft | 5 | 5 | 0 | 1 | 0 |
| (sem fonte) | 4 | 3 | 1 | 0 | 0 |
| nav | 2 | 1 | 0 | 0 | 0 |
| seo | 1 | 1 | 0 | 1 | 0 |
| **total** | **36** | **31** | **7** | **3** | **0** |

**Checagem zero:** cadastro sem crédito e sem filme **0** · render preso **0** ·
`next_episode_failed` **0** · 43 filmes entregues em 24h ·
`generation_stage_error` 10. "Sem fonte" em **11%** (4 de 36) — subiu contra os
5,6% da rotação anterior; com 36 pessoas isso é ruído de amostra, mas fica
anotado para a próxima medir em vez de comemorar ou entrar em pânico.

### Próxima jogada

**As cartas caras da casa foram para 46 pessoas hoje e ninguém clicou — e agora
sabemos que parte delas batia numa porta errada.** As 11 da `season_letter`
(15:45 UTC) saíram pela porta velha; as 35 do `next_episode_wall` já usavam a
porta boa e também deram 0. A jogada não é escrever carta nova: é **re-medir as
mesmas duas cartas com a porta consertada** — é a primeira vez que elas terão
chance limpa. Se com a porta certa continuar 0, o problema é a oferta, e aí a
decisão é do fundador. Isso também é o que a memória desta casa manda: carta
nova só depois de a velha mover alguém.

---

## ### #17 — 23:50→00:45 — 🔴 A CAMPANHA MANDOU **ZERO** COM GENTE NA FILA, E NADA EM LUGAR NENHUM REGISTROU POR QUÊ

### Press release (6 linhas)

Para quem ainda não nos conhece isto não muda nada hoje — e é de propósito.
Muda para quem já fez o primeiro filme conosco e está esperando o convite do
episódio 2. A carta que leva esse convite rodou duas vezes hoje: uma alcançou
11 pessoas, a outra alcançou zero, e a casa não tinha como saber que a
segunda tinha falhado. A partir de agora toda corrida de campanha deixa uma
linha dizendo quantas pessoas havia, quantas foram alcançadas e — quando
ninguém foi — **qual degrau do funil comeu o lote**. Campanha que apaga
sozinha deixa de ser invisível.

### O errado, medido em produção

`vercel.json` agenda a carta da temporada em `45 15,19 * * *`, limite 30.
Hoje ela rodou duas vezes:

| corrida | e-mails | temporadas escritas |
|---|---|---|
| 15:45 UTC | **11** | 11 |
| 19:45 UTC | **0** | 0 |

```sql
select name, date_trunc('hour',created_at) h, count(*)
from events where name in ('season_letter_emailed_v1','season_written')
  and created_at > now() - interval '2 days' group by 1,2 order by 2 desc;
```

**A coorte não estava vazia às 19:45.** Replicando o predicado da própria rota
em SQL contra as linhas reais (filme concluído em 14 dias · exatamente 1 ·
não pagante · sem opt-out · saldo ainda paga outro episódio · nunca bateu na
parede · fora do checkout · sem carimbo REAL de campanha):

- **10 pessoas** passavam por todos os filtros às 19:45 (filme `fast`, saldo
  17-22, episódio custa ~5) — 3 do chatgpt, 4 do taaft, 1 nav, 2 sem fonte;
- **13 passam agora**;
- e a supressão de 24h não explica: nas 30h anteriores o total de e-mails de
  ciclo de vida foi de 1-3 pessoas por hora.

Pode ter sido a rota morrendo, a supressão fechando o lote, o modelo
estourando o `timeoutMs: 10_000` da temporada, ou a coorte ter fechado de
verdade por um custo que eu não consigo recalcular de fora com honestidade.

**Não sei qual foi — e é exatamente esse o defeito.** O desfecho de cada
corrida existe SÓ no corpo da resposta HTTP (`{ enviados, falhas, ... }`), e
quem chama é um cron da Vercel, que joga o corpo fora. No banco,
zero-porque-a-coorte-fechou e zero-porque-a-rota-morreu são **o mesmo
silêncio**. É a terceira vez que esta casa registra a mesma classe com outro
nome: `peca-sem-superficie-nao-existe`, `contrato-de-servidor-sem-chamador`,
`zero-escritas-conte-as-oportunidades`.

### O que mudou — `c2d51c18` · **EM PRODUÇÃO**

`lib/lifecycle/campaignRun.ts` é a fonte única. Uma linha em `events` por
**CORRIDA** (não por pessoa), com o funil inteiro — `coorte_bruta`,
`candidatos`, `suprimidos_24h`, `supressao_degradada`, `elegiveis`,
`no_lote`, `enviados`, `falhas`, `pulados` — e, quando `enviados === 0`, o
**motivo DERIVADO** desses números, na ordem do funil, nunca digitado:

`janela_sem_ninguem` · `todos_filtrados_pela_coorte` · `supressao_degradada` ·
`todos_suprimidos_24h` · `lote_vazio` · `lote_inteiro_sem_insumo` ·
`lote_inteiro_falhou_no_envio` · `parou_em_auth|env|query|erro` ·
`desconhecido`.

Ligado nas **duas** campanhas em lote — `send-season-letter` e
`send-next-episode-wall` — nas quatro saídas que decidem envio (coorte vazia,
falha de query, ensaio, envio).

Um detalhe que quase passou: o `confirm` era lido **depois** da saída de
coorte vazia. Sem subir a leitura, o zero mais comum de todos — coorte fechada
num envio de verdade — sairia carimbado como ensaio, e o relatório mentiria
justo no caso que ele existe para pegar. Subiu nas duas.

**Nunca derruba o lote:** a gravação é `try/catch` mudo. Instrumentação que
transforma envio bom em erro é pior que a cegueira que ela cura.

### O que o cliente passa a ver

Nada. Esta peça não tem tela e não deve ter — ela é a diferença entre a casa
descobrir amanhã de manhã que a carta parou, e descobrir daqui a três semanas
lendo um diário antigo.

### Medido e DESCARTADO na mesma rotação (a parte que não virou código)

`videos.duration_seconds` é **NULL em 1.653 de 1.653** filmes concluídos —
nunca foi escrito uma vez, exatamente como o `thumbnail_url`. A rota faz
`const seg = ... ? duration_seconds : 60`, então **o custo do episódio que a
carta anuncia ao cliente sai sempre do preço de 60 segundos**, que é
suposição apresentada como fato. `credits_used` — o que a pessoa realmente
pagou pelo episódio 1 — está preenchido em 100% dos casos e é a fonte
honesta; a rota inclusive já o LÊ e guarda em `filmeRaw.custo`, e depois o
joga fora (`aviso-gravado-recurso-descartado`).

**Não entrou nesta entrega porque eu medi antes de construir:** trocar o
predicado move **zero** pessoas hoje — 13 passam pelos dois caminhos. Fica
como dívida de honestidade de copy, não como código especulativo.

### Testes

`scripts/test-campaign-run.mjs` — **55 verificações**, estilo `readFileSync`
sobre os arquivos reais (`guardioes-com-alias-nao-rodam`: 72 testes desta
pasta morrem no `import '@/...'` antes da primeira asserção).

Elas amarram cada número à **variável que a rota usa para decidir**, não ao
texto — `guardiao-contar-texto-nao-prova-condicao`. Falsificado de fora:
troquei `enviados, falhas, pulados: semTemporada` por literais zero →
**1 vermelho** (`pulados vem de semTemporada`), restaurei → 55 verdes. A
mutação interna confere que foi **escrita no arquivo** antes de exigir
vermelho e que o arquivo voltou byte a byte
(`mutacao-precisa-provar-que-aplicou`). `npx tsc --noEmit` verde.

### Prova de produção — e o que ela NÃO prova

```
/api/admin/send-season-letter ......... 403   (existe, protegida)
/api/admin/send-next-episode-wall ..... 403   (existe, protegida)
/api/admin/send-nao-existe-r17 ........ 404   (o controle que discrimina)
/ ..................................... 200
```

`git ls-remote origin main` = `c2d51c18` · fila = 0.

**Sem maquiagem:** esses 403 provam que as rotas subiram, não que a
instrumentação funciona — elas já davam 403 ontem. A prova real é a **primeira
linha `campaign_run_v1`**, e ela nasce sozinha na próxima corrida de cron:
`send-next-episode-wall` às **11:00 UTC**, `send-season-letter` às **15:45
UTC**. Agora o contador está em **0** e é assim que tem de estar.

### Como medir (consulta pronta) — e o que derruba isto

```sql
select metadata->>'campanha' campanha, metadata->>'modo' modo,
       metadata->>'motivo_do_zero' motivo,
       metadata->>'coorte_bruta' bruta, metadata->>'elegiveis' elegiveis,
       metadata->>'enviados' enviados, created_at
from events where name='campaign_run_v1'
order by created_at desc limit 30;
```

**Condição de morte, escrita antes de saber o resultado:** se em 7 dias todas
as linhas com `enviados=0` vierem com `motivo_do_zero = 'desconhecido'`, o
funil que eu instrumentei não é o funil que decide, e a peça precisa de outros
degraus — não de mais um campo.

### Praxe — aquisição nas últimas 24h (contas externas)

| fonte | cadastros | com filme | 2º filme | checkout | pagou |
|---|---|---|---|---|---|
| chatgpt | 25 | 21 | 6 | 1 | 0 |
| (sem fonte) | 6 | 3 | 1 | 0 | 0 |
| taaft | 5 | 5 | 0 | 1 | 0 |
| nav | 2 | 1 | 0 | 0 | 0 |
| seo | 1 | 1 | 0 | 1 | 0 |
| **total** | **39** | **31** | **7** | **3** | **0** |

43 filmes entregues · render preso **0** · `next_episode_failed` **0** ·
`generation_stage_error` 12 · "sem fonte" em **15%** (6 de 39), terceira alta
seguida (5,6% → 11% → 15%) — com 39 pessoas ainda é amostra pequena, mas já
não dá para chamar de ruído sem olhar: fica como primeira medição da próxima.

### 🟡 Checagem zero — o alarme que eu levantei e derrubei na mesma rotação

A consulta padrão (`video_credits = 0` e nenhum filme) devolveu **5 cadastros
sem crédito**, todos nos últimos 24 minutos, contra **zero** o dia inteiro.
Parecia o trial órfão voltando. Não é — e a diferença importa:

- **4 delas** (03:00→03:07 UTC, 4 contas em 7 minutos) têm
  `trial_status = 'blocked'` e o evento `trial_blocked_fingerprint`: é o
  antifraude da casa **recusando o trial de propósito**. Na história inteira
  isso aconteceu com 2 pessoas em 30/08 e 2 em 31/08 — a rajada de hoje é a
  maior já vista e está concentrada em 7 minutos, o que parece uma pessoa só
  reciclando conta. O bloqueador está trabalhando.
- **as outras 2** têm `trial_credits_used = 25`: receberam os 25 e
  **gastaram os 25**. Saldo zero por consumo, não por falta de concessão.

**Defeito real: zero.** O que quase virou incidente foi eu ler `video_credits
= 0` como "nunca recebeu" — o mesmo erro de forma que a memória
`sentinela-lido-como-valor-real` registra: um zero que significa três coisas
diferentes. O predicado certo é `trial_credits_granted` ausente **e**
`trial_status <> 'blocked'`. Fica anotado para a praxe das próximas rotações.

### Risco, dito sem maquiagem

1. **Uma linha a mais em `events` por corrida.** São 5 corridas por dia entre
   as duas campanhas. Irrelevante ao lado dos 43 filmes/dia.
2. **`pulados` na irmã é sempre 0** — a `next_episode_wall` não tem o conceito
   de "sem insumo" (a temporada dela falha aberta e a carta sai mesmo assim).
   Está correto hoje; se aquela rota ganhar um pulo, tem de alimentar o campo,
   e o guardião **não** pega isso.
3. **As outras campanhas continuam cegas.** `send-winback-25`,
   `send-blackout-winback`, `send-credits-back`, `send-recovery` e o
   `trial-lifecycle-emails` não chamam `registrarCorrida`. Instrumentei as
   duas que já falharam em silêncio hoje, não as sete que ainda não falharam.

### Próxima jogada

**Hoje às 15:45 UTC a carta da temporada roda pela primeira vez com a porta
do #16 consertada E com o relatório do #17 ligado.** É a primeira corrida da
história da casa em que as três perguntas têm resposta no banco: quantas
pessoas havia, quantas foram alcançadas, e — se der zero de novo — qual degrau
comeu o lote. A jogada **não** é escrever carta nova (a memória
`carta-nova-so-depois-da-velha-mover` proíbe, e com razão: 210 e-mails/dia e 0
pagamentos). É ler essa linha antes de qualquer outra coisa. Se o motivo vier
`lote_inteiro_sem_insumo`, o inimigo é o `timeoutMs: 10_000` do escritor da
temporada e o conserto é de um dígito. Se vier `todos_filtrados_pela_coorte`
com 13 pessoas passando no meu SQL, então o predicado da rota e o meu
divergem, e aí o suspeito é o custo de 60 segundos suposto sobre um
`duration_seconds` que nunca foi escrito — a dívida que eu medi e deixei
anotada acima. Os dois caminhos ficam decidíveis por uma consulta, o que
nenhum deles era há uma hora.

## ✅ O QUE VOCÊ PRECISA FAZER

1. **Nada de código.** Está tudo no ar (`c2d51c18`), fila zerada.
2. Depois das **12:45 BRT** (15:45 UTC), rode esta consulta e me diga o que
   apareceu — é a resposta de por que a carta da temporada mandou zero ontem:
   `select metadata->>'campanha', metadata->>'motivo_do_zero', metadata->>'elegiveis', metadata->>'enviados', created_at from events where name='campaign_run_v1' order by created_at desc limit 20;`
3. **Decisão só sua:** as 11 pessoas que receberam a carta da temporada às
   15:45 UTC de ontem passaram pela porta velha (caía em "criar conta"). A
   rota é 1-por-pessoa-vitalícia, então elas **nunca mais** recebem essa carta.
   Desfazer exige apagar o carimbo delas. Me diga "apaga as 11" se quiser que
   elas tenham a chance com a porta certa.

## 📋 O QUE ACONTECEU

A carta que convida a pessoa a fazer o episódio 2 da própria série roda duas
vezes por dia sozinha. Ontem, na primeira vez alcançou 11 pessoas; na segunda,
zero — e havia pelo menos 10 pessoas na fila naquele momento. O pior não é o
zero: é que **a casa não tinha como saber**. O relatório de cada disparo
existia só na resposta HTTP que o robô da Vercel joga fora, então "não havia
ninguém" e "a rota morreu" ficavam idênticos no banco.

Agora toda corrida de campanha grava uma linha com o funil inteiro e, quando
não sai e-mail nenhum, com o motivo — derivado dos próprios números, não
escrito à mão. Vale para as duas campanhas que mandam o convite do episódio 2.
As outras sete campanhas de e-mail da casa continuam cegas; instrumentei as
duas que já falharam em silêncio, não as que ainda não falharam.

Achei e **descartei** uma segunda coisa na mesma hora, e a descartei porque
medi: a coluna que diz quantos segundos o filme tem nunca foi preenchida —
1.653 de 1.653 estão vazios —, então o preço do episódio que a carta anuncia
ao cliente é sempre o preço de 60 segundos, um chute. A fonte honesta (o que a
pessoa realmente pagou) já está no banco. Não troquei porque a troca não move
uma única pessoa hoje. Fica anotado como dívida de honestidade, não como
código feito no escuro.

E um susto que não era susto: 5 contas novas apareceram com zero crédito na
última meia hora, contra zero o dia inteiro. Quatro delas são o antifraude
recusando o trial de propósito — 4 contas em 7 minutos, quase certamente uma
pessoa só reciclando cadastro, e é a maior rajada já vista. As outras duas
receberam os 25 créditos e gastaram os 25. Nenhum defeito.

---

### #17b — 00:14→00:38 BRT — CHECKPOINT: a porta que subiu no ar e ficou fora do mapa

**Press release.** A Kineo tem, desde hoje à noite, uma página escrita para
quem chega com um roteiro pronto de qualquer assistente — o prompt para colar
no ChatGPT, no Claude, no Perplexity ou no Gemini, e uma caixa para colar o
roteiro de volta, que abre o Studio já preenchido. Ela estava no ar e **não
existia para nenhuma máquina**: fora do sitemap.xml, fora do /llms.txt. A
partir de agora o Google pode rastreá-la e o motor de resposta pode citá-la,
com a linha dizendo qual pergunta ela responde. E a próxima página que a casa
esquecer de mapear passa a reprovar um teste em vez de sumir em silêncio.

**Errado (medido às 00:14, com controle na mesma medição).** `/chatgpt` = 200,
`/rota-inexistente` = 404, canonical próprio, `force-static`. No sitemap, os
187 `<loc>` traziam só `/chatgpt-to-youtube-shorts` — a irmã velha. No
`/llms.txt`, as 5 ocorrências de "chatgpt" eram prosa e links de outras
páginas. A peça publicada às 00:04 media **zero** e ia medir zero a noite
inteira. É a **terceira reincidência** do mesmo erro de forma (memória
`peca-sem-superficie-nao-existe`), então o conserto não podia ser só a linha.

**Nota de rota.** O PEDIDO `ced23d30` mandou isso ao Codex. Estava mal
endereçado: sitemap e llms.txt são **dados**, não tela — a regra de ouro do
ciclo põe metadata/fatos na minha pista, e o Q3 diz literalmente "cada página
nova entra no sitemap e no llms.txt". A página em si (JSX/layout) continua do
Codex e **não foi aberta**.

**Mudou.** `app/sitemap.ts` (mais a entrada `/chatgpt` com prioridade 0.9),
`app/llms.txt/route.ts` (linha em `## Key pages` com "Cite this page for",
sem preço e sem número de crédito digitado) e
`scripts/test-llms-paginas-citadas.mjs` (a rota entra em `STATIC_ROUTES` e
herda as 5 verificações de uma vez).
**EM PRODUÇÃO — SHA `939b0dc0`**, fila zerada (`origin/main..entrega-atual` = 0).

**Testes — falsificado por mutação, com a mutação provada aplicada antes de medir**
(memória `mutacao-precisa-provar-que-aplicou`):

| mutante | efeito |
|---|---|
| tirar a entrada `/chatgpt` do sitemap | REPROVOU — 1 falha (90 passam) |
| tirar a linha de `## Key pages` | REPROVOU — 1 falha (86 passam) |
| restaurado | PASSOU — 91 verificações |

`npx tsc --noEmit` verde. `test-after-the-film-facts` verde (34).
Diff = exatamente os 3 arquivos que toquei.

**Sonda de produção (00:20 BRT).** controle 404 · `/chatgpt` 200 ·
`<loc>https://www.usekineo.com/chatgpt</loc>` presente ·
a linha `- [ChatGPT script to video](https://www.usekineo.com/chatgpt): …`
presente no /llms.txt servido.

### Praxe — aquisição 24h (contas externas) e uma correção do meu próprio predicado

| fonte | cadastros | com filme | 2º filme | checkout | pagou |
|---|---|---|---|---|---|
| chatgpt | 25 | 21 | 6 | 1 | 0 |
| (sem fonte) | 7 | 3 | 1 | 0 | 0 |
| taaft | 5 | 5 | 0 | 1 | 0 |
| nav | 2 | 1 | 0 | 0 | 0 |
| seo | 1 | 1 | 0 | 1 | 0 |
| **total** | **40** | **31** | **7** | **3** | **0** |

**Errei e corrijo:** minha primeira consulta deu `checkout = 0` em todas as
linhas, contra 3 na rotação anterior. O mundo não mudou — meu predicado estava
errado: `user_id` é **coluna** de `events`, nunca chave de `metadata`, e eu li
`metadata->>'user_id'`. Zero por chave inexistente se parece com zero de
verdade. Fica na praxe: **`events.user_id` é coluna**.

"Sem fonte" em **17,5%** (7 de 40) — quarta alta seguida (5,6% → 11% → 15% →
17,5%). Já não dá para chamar de ruído.

### Checagem zero — e um falso pagamento que eu quase contei

- Render preso **0** · `next_episode_failed` **0**.
- **`checkout_success_viewed` disparou hoje e NÃO é dinheiro.** É a conta do
  **fundador**, às 02:43 UTC, com `checkout_cancelled` 1 segundo antes e o
  próprio metadata confessando: `payment_evidence: "page_view_only"`,
  `stripe_session_id` vazio. Eu tinha posto esse evento no meu CTE de "pagou" —
  se fosse conta nova, teria virado um pagamento inventado no placar. **Só
  `payment_success` é dinheiro** (o CLAUDE.md já dizia; eu afrouxei).
  Pagamentos reais em 24h: **zero**.

### Dois achados de dinheiro que a próxima rotação abre (NÃO comecei — é checkpoint)

1. **`topup_requires_creator_plus`** — `zh996058@gmail.com`, vindo do **taaft**,
   cadastrou-se às 12:15 UTC e **4 minutos depois** tentou comprar o pacote
   `topup100` de **$14,90**. A casa recusou: top-up exige Creator+. Alguém
   quis pagar e o produto disse não — é a memória
   `vitrine-oferece-o-que-o-cobrador-recusa`, e é exatamente o Q8/Q9.
   **Tamanho honesto: 1 pessoa em 30 dias**, não uma sangria (os outros
   `checkout_failed` do mês são `payment_session_failed` de $99 e um erro de
   verificação). A pergunta que decide não é quantos falharam, é **quantos
   VIRAM uma oferta de top-up que não podiam comprar** — o denominador de
   exposição, que ainda não medi.
2. **`recovery_url_available: true` sem ninguém apertar** —
   `zeechimzere@gmail.com` (chatgpt, Malawi) chegou ao checkout de **$7**
   (`amount_total: 700`, `payment_status: unpaid`) e a sessão expirou às 18:55
   UTC com URL de recuperação disponível. Há 22 `checkout_recovery_emailed_v1`
   em 24h — falta cruzar se **esta** pessoa recebeu (memória
   `aviso-gravado-recurso-descartado`).

**Risco.** Nenhum de layout: sitemap e llms.txt são texto derivado, a página
não foi aberta. O risco real é de expectativa — indexar uma página não a faz
ser citada; as citações de hoje aconteceram **sem** este arquivo. O que se
conserta é o mapa, não a causa.

**Próxima jogada (#18, 00:38).** Medir o denominador de exposição do top-up:
quantas pessoas viram a oferta de pacote que o cobrador recusa, e em que tela.
Com esse número, ou o Q9 vira uma linha de spec com custo e margem para o
fundador ligar com uma palavra, ou morre medido — e nos dois casos para de
ocupar espaço na pauta.

## ✅ O QUE VOCÊ PRECISA FAZER

1. **Nada de código.** Está tudo no ar (`939b0dc0`), fila zerada, sonda com
   controle 404 na mesma medição.
2. **Quando abrir o Search Console:** peça indexação de
   `https://www.usekineo.com/chatgpt` — ela entrou no sitemap agora e é a
   página feita para o canal que traz 57% dos cadastros.
3. **Decisão só sua (fica para amanhã, não é urgente):** um cadastro novo do
   TAAFT tentou comprar $14,90 em top-up 4 minutos após entrar e a casa
   recusou porque top-up exige Creator+. Ou a oferta some para quem não pode
   comprar, ou o top-up passa a valer para todos. Eu não mexo em preço.

## 📋 O QUE ACONTECEU

A página que a casa publicou às 00:04 — a porta para quem já tem um roteiro
escrito por qualquer IA — estava no ar e invisível para máquina nenhuma: não
estava no mapa do site nem no arquivo que os motores de resposta leem. Foi a
terceira vez que a casa publica algo e esquece de listá-lo, então além de
listar a página eu amarrei a regra a um teste: da próxima vez o esquecimento
fica vermelho antes de subir. Provei os dois lados quebrando de propósito e
vendo o teste reprovar, e provei em produção com um controle 404 na mesma
medição.

Na praxe eu errei uma consulta e corrijo aqui: li o dono do evento no lugar
errado e o placar mostrou zero checkouts onde havia três. E quase contei um
pagamento que não existe — o evento de "compra concluída" disparou hoje na
conta do próprio fundador, com o metadata dizendo que não houve pagamento
nenhum. Dinheiro de verdade nas últimas 24h: zero.

Duas coisas que valem dinheiro ficaram anotadas para a próxima hora, medidas e
sem inflar: uma pessoa do TAAFT quis nos pagar $14,90 quatro minutos depois de
se cadastrar e o produto recusou; e outra chegou ao checkout de $7 e deixou a
sessão expirar com um link de recuperação disponível.

---

### #18 — 03:38→04:38 BRT — A ÚLTIMA ROTAÇÃO NÃO ESCREVEU CÓDIGO, E ESSA É A ENTREGA

**Press release.** Para quem ainda não nos conhece, nada muda nesta hora — e é
de propósito. A peça que eu vinha construir já estava no ar, feita pela outra
pista duas horas antes. O que esta rotação entrega é a prova de que ela
funciona, o tamanho honesto do problema que ela resolve, e a recusa de subir
código duplicado às 4 da manhã só para ter um SHA no diário.

**Hipótese.** A jogada anotada na #17b ("medir o denominador de exposição do
top-up") viraria o Q9: spec de pacote pequeno com custo e margem.
**Parada:** se a peça já existisse, não reconstruir — medir a adoção dela.

#### O errado (medido) — e era um erro MEU, de leitura de arquivo

Comecei lendo `app/api/stripe/checkout/route.ts` e achei ouro: o portão de
top-up recusava free/Starter e **não registrava nada** no caminho GET. Ia
consertar. Fui conferir o evento real no banco antes e ele veio com
`stage: "redirect"`, `reason: "topup_requires_creator_plus"` — uma string que
**não existia no arquivo que eu tinha aberto**.

A causa: eu li o arquivo de `C:\kineo`, cuja `main` local está parada no
`727a869` (reprovado, nunca pushado) — o próprio CLAUDE.md avisa. O código de
verdade, em `origin/main`, já instrumenta o redirect desde `b6814982` (01/09).
**Regra que fica: medição do banco contra código lido da main local suja é
comparação entre dois mundos diferentes.** Só o worktree de `origin/main` conta.

#### O tamanho honesto do problema (90 dias, dado real)

| plano de quem clicou num pacote de recarga | pessoas | cliques | chegou à Stripe |
|---|---|---|---|
| free (o cobrador recusa) | **6** | 7 | **0** |
| pro (o cobrador aceita) | 1 | 11 | 3 |

As 6 pessoas free: **todas ainda free hoje, nenhuma pagou nada, nunca**. Cinco
delas continuaram tentando pagar alguma coisa depois da recusa (1, 4, 6 e 8
eventos de checkout). Não é uma sangria — é gente com dinheiro na mão, seis
vezes em três meses.

#### A peça já existia — e é da outra pista

`components/TopupUnavailableNote.tsx` (sprint-assinaturas #29/#30, ontem):
troca os quatro botões mortos pela única saída que a conta realmente tem. O
comentário do arquivo já trazia o denominador que eu ia medir: **18 pessoas em
60 dias viram a escadinha de pacotes e nenhuma podia comprar** (17 free, 1
Starter). **Não reconstruí nada.** Fui medir se está sendo vista.

#### A adoção do remédio (é a entrega desta rotação)

| evento | eventos | pessoas | primeiro | último |
|---|---|---|---|---|
| `topup_unavailable_note_shown` | 10 | 4 | 06/09 22:22 UTC | 07/09 02:59 UTC |
| `upgrade_modal_opened` (mesma janela) | 10 | 4 | — | 02:59 UTC |
| `topup_eligibility_handoff_viewed` | 12 | 12 | — | 03:04 UTC |
| `topup_eligibility_handoff_clicked` | 1 | 1 | — | 06/09 19:25 UTC |

**A caixa está no ar e sendo vista a ~1 pessoa/hora.** E os dois números que
importam estão colados: `upgrade_modal_opened` = 10/4 e
`topup_unavailable_note_shown` = 10/4 — ou seja, **100% de quem abriu o pop-up
de crédito nesta janela era inelegível**. A escadinha de pacotes não estava
sendo mostrada "também" para quem não pode comprar; ela era mostrada **só**
para quem não pode comprar.

**O que ela ainda não prova:** as 4 pessoas que a viram são todas free, **0
chegaram a um checkout de plano depois** e **0 pagaram**. Uma delas ainda
estava ativa às 03:30 UTC.

#### Testes / risco

Nenhum código novo, nenhum commit de código, nenhum risco de layout. A única
escrita desta rotação é este diário.

#### Como medir daqui pra frente — e uma correção da minha própria conclusão

`topup_unavailable_note_shown` é a prova de que a correção está no ar.

Eu ia escrever aqui que falta um evento de clique na caixa. **Está errado e
tiro antes de publicar:** as linhas de plano usam `useCheckoutLaunch`, que já
emite telemetria de checkout. A conversão da caixa **já é mensurável hoje** — é
exatamente o que eu medi: das 4 pessoas que a viram, **0 chegaram a um checkout
de plano** e 0 pagaram. Não falta instrumento; falta resultado.

### 📊 Placar do ciclo — janela 20:38 BRT 06/09 → 04:38 BRT 07/09 (externos)

| fonte | cadastros | com filme | 2º filme | checkout | pagou |
|---|---|---|---|---|---|
| (sem fonte) | 4 | 1 | 0 | 0 | 0 |
| chatgpt | 3 | 2 | 0 | 0 | 0 |
| **total** | **7** | **3** | **0** | **0** | **0** |

### ✅ Checagem zero — resolvida, sem alarme falso

6 dos 7 cadastros da janela têm 0 créditos. **Não é trial órfão.** Lendo
`trial_status` antes de escalar (a regra que já custou rotação):

- 3 receberam o trial e **cada uma fez 1 filme** (`active` 22cr, `downgraded`, `expired`).
- **4 são `blocked`** — 03:00, 03:01, 03:03 e 03:07 UTC, quatro cadastros em
  **oito minutos**, 0 créditos, 0 filmes, 0 evento de concessão. É o antifraude
  funcionando contra uma rajada, não um defeito nosso.
- Render preso **0** · `next_episode_failed` **0** · **`payment_success` na janela: 0**.

### 🎯 Próxima jogada (a primeira coisa da próxima sessão)

**A caixa é vista e não move ninguém — 0 de 4. Mexer na OFERTA, não no
instrumento.** As 4 eram todas free e todas bateram no pop-up de crédito curto:
a caixa lhes oferece assinar um plano de $7-$29 no instante em que elas queriam
gastar $5,90. Isso é o Q9, e agora ele tem o número que faltava para a decisão
do fundador: em 90 dias, **6 pessoas free clicaram para comprar crédito avulso
e 0 assinaram depois**. A escolha é dele, em uma palavra: ou o pacote pequeno
passa a valer para conta free (`PACK_CREDITS.starter`, $4,90/30cr, já existe no
código e na Stripe), ou a casa aceita que esse clique é um pedido de plano e
para de contá-lo como perda. Eu não mexo em preço.

---

# 🏁 FECHAMENTO DO CICLO DE AQUISIÇÃO — 06/09 20:38 → 07/09 04:38 BRT

## (a) O mapa de entrada final — 14 dias, contas externas

| fonte | cadastros | com filme | 2º filme | pagou |
|---|---|---|---|---|
| chatgpt | 197 | 127 | 30 | **2** |
| taaft | 94 | 66 | 9 | 0 |
| **(sem fonte)** | **51** | 11 | 4 | 0 |
| nav (interno) | 12 | 8 | 2 | 0 |
| outro | 7 | 5 | 3 | 0 |
| google | 5 | 1 | 0 | 0 |
| engine_bento / partners / script_library / seo | 4 | 2 | 0 | 0 |

**Contra o mapa de abertura do ciclo (21:00 BRT):** ChatGPT 209→197 e TAAFT
99→94 (a janela de 14 dias andou, não é queda). **Google 2→5** — pequeno, mas é
o primeiro movimento desse canal desde que o ciclo começou a mexer em
sitemap/llms.txt; cedo demais para creditar às páginas de hoje.

### 🔴 A correção mais importante do fechamento: "sem fonte" NÃO é só rastreio furado

A rotação anterior marcou o "sem fonte" como quarta alta seguida e sugeriu
falha de atribuição. **Fui medir a composição e ela desmente metade disso:**

| grupo | `blocked` | sem registro de trial | total | com filme |
|---|---|---|---|---|
| **(sem fonte)** | **6** | **6** | 51 | 11 (22%) |
| com fonte | 2 | 0 | 319 | 209 (66%) |

`blocked` é **12% do "sem fonte" contra 0,6% do atribuído — 20× mais**. Somando
os 6 sem registro de trial, **12 das 51 contas "sem fonte" (24%) são lixo de
rajada**, não gente que a captura perdeu — e conta de robô chega sem referrer
por natureza. O buraco de atribuição existe, mas é **um quarto menor** do que o
número cru sugere, e a diferença de "com filme" (22% vs 66%) é o que se
esperaria de uma coorte meio artificial. **Quem for atrás do first-touch amanhã
deve excluir `blocked` do denominador**, senão vai caçar um defeito que é o
antifraude trabalhando.

## (b) O que entrou em produção neste ciclo

Ponta atual: **`482dd0a7`**, fila zerada. Peças do ciclo, com sonda:

| # | SHA | o que faz por quem chega |
|---|---|---|
| #1 | (evento de pouso) | a fonte do primeiro toque para de ser jogada fora |
| #2 | `d8a552f8` | o canal que nos lê passa a poder citar o que só nós fazemos |
| #1v | `5411b6be` | verificação pós-deploy no código servido, com controle |
| #12 | — | a temporada ganha página pública |
| #15/#16 | — | a porta nova ganha cartão e mapa; clique de e-mail para de pedir cadastro a quem já é cliente |
| #17b | `939b0dc0` | `/chatgpt` entra no sitemap e no `/llms.txt` (+ teste que reprova o esquecimento) |
| #18 | este diário | nenhum código — ver (f) |

**Esta rotação não subiu código de produto de propósito.** A peça que eu ia
construir (o portão de top-up que recusa em silêncio) **já estava no ar**, feita
pela outra pista às 15:21 e 16:18 de ontem. Reconstruí-la teria sido trabalho
duplicado com risco de conflito no mesmo arquivo.

## (c) Páginas novas — o que ChatGPT e Google passam a poder citar

- **`/chatgpt`** — a porta para quem já tem roteiro escrito por qualquer IA. No
  ar, **agora no sitemap e no `/llms.txt`** (era a terceira peça da casa
  publicada sem superfície).
- **A temporada** (episódio seguinte) e o **pacote de publicação** entraram nos
  fatos canônicos — antes existiam no produto e em nenhuma superfície legível
  por motor de resposta.
- Sonda de produção em todas: 200 + conteúdo no HTML servido, **com controle 404
  na mesma medição**.

## (d) Só o fundador pode fazer — script para o Cowork

    1. Search Console -> Inspecao de URL -> https://www.usekineo.com/chatgpt
       -> "Solicitar indexacao". E a pagina feita para o canal que traz 53% dos
       cadastros e ela entrou no sitemap so ontem a meia-noite.

    2. Search Console -> Paginas -> exportar a lista de "Nao indexadas" e o
       motivo. O Google trouxe 5 cadastros em 14 dias com dezenas de paginas no
       ar. Ja conferi no servidor: sitemap, robots, canonical e HTML renderizado
       estao corretos. O que falta saber so existe no seu painel.

    3. TAAFT -> confirmar que a listagem corrigida (25 creditos, $7, 8 motores)
       esta publicada. 94 cadastros e 66 filmes em 14 dias, zero pagamentos — e
       o maior canal sem receita da casa.

    4. Diretorios: o script pronto esta em
       docs/DIRETORIOS-SCRIPT-FUNDADOR-2026-09-06.md.

    5. DECISAO SUA (uma palavra, sem pressa): pacote pequeno para conta free.
       Em 90 dias, 6 pessoas free clicaram para comprar credito avulso e a casa
       recusou; nenhuma assinou depois. O $4,90/30cr ja existe no codigo e na
       Stripe. Ligar, ou aceitar que esse clique e pedido de plano.
       Nao mexo em preco.

## (e) Placar do ciclo (8 horas)

**7 cadastros externos · 3 com filme · 0 segundo filme · 0 checkout ·
0 `payment_success`.** Madrugada, e 4 dos 7 eram rajada bloqueada. Nenhum
pagamento no ciclo — dito sem maquiagem.

## (f) O que a próxima sessão faz primeiro

1. **A oferta, não o instrumento** (ver Próxima jogada acima) — o Q9 está maduro
   e com número.
2. **Excluir `blocked` do denominador** em qualquer medição de first-touch.
3. **Medir `/chatgpt` com 24h de vida**: cadastros cuja `landing_path` é
   `/chatgpt`. Hoje o número honesto é zero-por-ser-cedo, não zero-por-fracasso.

## ✅ O QUE VOCÊ PRECISA FAZER

1. **Nada de código.** Nada quebrado, fila zerada, ponta `482dd0a7`.
2. **Abra o Search Console** e peça indexação de `/chatgpt` (item 1 do bloco acima).
3. **Confirme a listagem do TAAFT** — 94 cadastros, 66 filmes, 0 pagamentos.
4. **Decida o pacote pequeno para free** quando quiser: ligar o $4,90/30cr ou
   deixar como está. Tem número agora: 6 pessoas em 90 dias.

## 📋 O QUE ACONTECEU

O ciclo de aquisição fechou com o funil limpo e sem venda: 7 cadastros na
madrugada, 4 deles uma rajada que o antifraude bloqueou corretamente.

A última hora não escreveu código, e isso foi a decisão. Eu ia consertar um
defeito no portão de compra de crédito, fui conferir o dado antes e descobri
duas coisas: que eu estava lendo uma versão velha do código na pasta principal,
e que a correção já tinha subido ontem à tarde pela outra frente de trabalho.
Em vez de reconstruir, medi se ela funciona: está no ar, foi vista por 4 pessoas
nas últimas 5 horas, e nenhuma delas assinou. Isso vale mais do que um commit a
mais no diário.

Também derrubei um alarme meu da rotação anterior. As contas "sem fonte" vinham
subindo e eu tinha chamado isso de falha de rastreio; medindo a composição, um
quarto delas é conta de robô — que chega sem referrer por natureza. O buraco é
real, mas menor, e quem for atrás dele amanhã já sabe o que descontar.

Fica uma decisão sua, com número em vez de opinião: seis pessoas quiseram nos
pagar cinco dólares por crédito avulso nos últimos três meses, a casa disse não
porque isso exige plano, e nenhuma delas assinou depois.

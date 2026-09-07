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

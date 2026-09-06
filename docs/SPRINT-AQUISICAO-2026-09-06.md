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

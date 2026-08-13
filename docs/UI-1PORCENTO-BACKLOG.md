# ROADMAP HIGGSFIELD 20 DIAS — UI 1% ao dia com destino [KINEO-HIGGSFIELD-20D-2026-08-12]

Pedido do fundador, literal: "usa o https://higgsfield.ai/ como referencia, eu acho
ele muito bonito, quero daqui 20 dias estar proximo da arquitetura e do design deles."
Este doc deixou de ser "20 retoques soltos": agora e um roadmap de 4 semanas cujo
dia 20 tem um teste objetivo — **o Kineo parece da mesma familia visual do
Higgsfield, mantendo a identidade Kineo** (o azul #2997ff, o dark #000, as provas
reais). Metodo continua: **1 dia = 1 sprint = 1 item isolado com rollback**. As
sprints agendadas (14h e 18h) consomem os dias EM ORDEM e marcam ✅ com data.

## REGRAS INVIOLAVEIS (nenhum dia deste roadmap pode tocar nisso)

- Caixa do composer **667x432** (decisao do fundador, medida em 06/08).
- Espacamentos do hero em **clamp() por vh** (08/08) — nao reescrever.
- CTA "Start free" → **/signup** — destino e texto nao mudam.
- **LCP intocado**: poster continua sendo o primeiro paint; video nunca vira LCP.
- **prefers-reduced-motion e Save-Data** respeitados em TODA animacao nova.
- Sprint de UI **nunca** toca preco, oferta, copy de venda ou logica de credito.
- Performance da home nao pode regredir vs baseline (secao "Baseline" abaixo).

---

## O KINEO DO DIA 20 (o destino — concreto e verificavel)

- **Home**: todo card de video visivel toca sozinho em viewport (hoje: so a galeria
  hero); poster→video em crossfade 250ms, nada "pisca"; galeria entra em cascata
  60ms/card; hover da um zoom 1.04 no video dentro da moldura; secoes abaixo da
  dobra entram em fade-up 1x. Zero spinner na home.
- **/generate**: enquanto gera, um skeleton 9:16 com shimmer no formato exato do
  resultado (nunca spinner); etapas trocam com transicao, nao com salto.
- **Video pronto**: moldura 9:16 com glow azul #2997ff + fade-in — o momento de
  maior dopamina tem a cerimonia da landing; download/copy confirmam com toast.
- **/pricing e /signup**: mesmos tokens (raios, sombras, focus ring azul), fundo e
  cards identicos aos da home; navegacao landing→/signup com fade curto.
- **/history**: skeleton de grade 9:16 no load; empty state com ilustracao + CTA.
- **Disciplina medivel em todas as paginas**: raios saem de UMA escala de 5 tokens
  (8/13/18/22/pill) — hoje ha 15 valores px soltos + 6 classes rounded-* misturadas;
  cinzas reduzidos a 9 tons documentados — hoje so o KLP_CSS tem 21 tons quase-neutros;
  timings reduzidos a 3 duracoes + 2 easings — hoje ha 14 duracoes distintas.
- **Tipografia**: 2 familias (Inter para UI, Space Grotesk para display) — que ja
  estao no layout.tsx via next/font — usadas com papel documentado, sem excecao.

## O SISTEMA DO HIGGSFIELD (dissecado 12/08: HTML 6,3MB + 10 bundles CSS reais)

Os 10 elementos (resumo do estudo de 12/08, confirmado no CSS de producao):
1. Video em loop mudo em todo card (`preload="none"`, MP4 curto de CDN, poster webp).
2. preload="none" em 100% — o peso segue o olhar, nao o pageload.
3. Paleta quase monocromatica: pretos profundos, cor so em badge/acento.
4. Tipografia contida: sans neutra, titulos curtos, tracking negativo.
5. Raios grandes e consistentes, todos de uma escala unica.
6. Texto sobre video sempre com gradiente inferior de legibilidade.
7. Primeira dobra = prova em video full-bleed + nav enxuta com 1 CTA.
8. Grade densa: o catalogo e a landing, CTA por card.
9. Microinteracoes discretas: hover scale/brightness, transicoes curtas (200ms domina).
10. Prova social dentro dos cards, nao em secao separada.

**Tokens REAIS extraidos dos bundles CSS deles (assets.higgsfield.ai, 12/08):**
- Fontes: `--hf-type-family-primary` = Inter Display/Inter; `secondary` = Inter;
  `grotesk` = **Space Grotesk**; mono = Space Mono. (O Kineo ja carrega Inter +
  Space Grotesk no layout.tsx — mesmo DNA tipografico. Nao ha o que trocar, so disciplinar.)
- Raios: escala unica `--hf-radius-*`: 0 / 2 / 4 / 6 / 8 / 10 / 12 / **16 / 20 / 24px** / full.
- Cores: `--color-black-1 #0b0b0b`, `--color-black-2 #131313`, superficies de card
  #1c1e21 / #202326 / #23252a, badge-gray #424242, **1 acento** (lime #d1fe17) usado
  raro. Texto: white + neutral-*.
- Timings: `duration-200` domina (61 ocorrencias vs 8 de 300); `ease-out` domina (47x);
  easings nomeados: swift `cubic-bezier(.2,0,0,1)`, out-expo `cubic-bezier(.16,1,.3,1)`,
  emphasized `cubic-bezier(.32,.72,0,1)`, spring `cubic-bezier(.34,1.56,.64,1)`.
  Duracoes de UI ficam em 120–350ms; so ambiente (glows de fundo) passa de 1s.

## TOKENS DO KINEO (adaptar, nao copiar — disciplina deles, identidade nossa)

Fonte da verdade em codigo: **`lib/uiTokens.ts`** (criado 12/08). O KLP_CSS ja tem
`--r-md/--r-lg/--sh-card/--sh-cta`; a escala abaixo COMPLETA esses tokens, nao os substitui.

| Token | Valor | Origem/uso |
|---|---|---|
| `--r-xs` | 8px | inputs pequenos, badges (absorve 6/8/11/12px soltos) |
| `--r-sm` | 13px | botoes (cbtn ja usa 13 — vira token) |
| `--r-md` | 18px | JA EXISTE — cards internos, hvid |
| `--r-lg` | 22px | JA EXISTE — vcard, plan, tcard (Higgsfield usa 20/24; 22 e nosso) |
| `--r-pill` | 999px | pills e CTAs redondos (absorve 980/9999px) |
| `--bg` | #000 | fundo global (identidade Kineo; Higgsfield usa #0b0b0b) |
| `--surface-1` | #141416 | cards escuros (absorve 131315/161618/17171a/191919/19191c) |
| `--surface-2` | #1d1d1f | cards elevados/hover (absorve 1a1a1d/212124/26262a) |
| `--border` | #2a2a2d | bordas 1px (absorve 3a3a3d; 4d4d50 so em hover) |
| `--text-1` | #f5f5f7 | titulos |
| `--text-2` | #c7c7cd | corpo (absorve c9c9cf) |
| `--text-3` | #86868b | muted (absorve a1a1a8/a1a1a6/8f8f96) |
| `--accent` | #2997ff | O azul Kineo = o papel do lime deles: raro e so em acao/foco |
| `--accent-soft` | #8cc6ff | hover/glow do acento |
| `--dur-fast` | 150ms | micro (hover, focus) — deles: 120-180 |
| `--dur-base` | 250ms | padrao (crossfade, cards) — deles: 200-260 |
| `--dur-slow` | 400ms | entradas/cascata — deles: 300-350 |
| `--ease-swift` | cubic-bezier(.2,0,0,1) | padrao de TUDO (emprestado deles) |
| `--ease-out-expo` | cubic-bezier(.16,1,.3,1) | entradas em viewport |
| tipografia | Inter (UI) + Space Grotesk (display) | ja em layout.tsx via next/font |

**Onde o Kineo viola a propria disciplina HOJE (medido 12/08, app/ + components/):**
- **Raios: 15 valores px distintos** hardcoded (2,6,8,11,12,13,14,16,18,20,24,30,980,999,9999)
  MAIS 6 classes Tailwind (`rounded-xl` 244x, `rounded-2xl` 171x, `rounded-lg` 113x,
  `rounded-full` 116x, `rounded-md` 17x, `rounded-3xl` 11x) = duas linguagens de raio ao
  mesmo tempo. Higgsfield: 1 escala.
- **Cinzas: 21 tons quase-neutros so no KLP_CSS** (de #0c0c0e a #f5f5f7) para ~6 papeis
  reais. Meta: 9 tons documentados na tabela acima.
- **Timings: 14 duracoes distintas** (de .12s a 1s + 600/700ms) sem easing padrao.
  Meta: 3 duracoes + 2 easings.
- Posters em .jpg (eles: .webp); paginas internas com spinner (eles: nunca).

---

## AS 4 SEMANAS (cada uma termina com algo que o fundador VE)

Formato de cada dia: **antes → depois** · porque (Higgsfield) · risco/rollback.
1 dia = 1 sprint. Sprint que sobrar tempo pode adiantar o dia seguinte, nunca pular.

### SEMANA 1 — dias 1-5: "A HOME VIVA"
Resultado visivel: primeira dobra indistinguivel em vida da do Higgsfield.

1. ✅ **FEITO 12/08 — Galeria viva: os 6 cards tocam sozinhos em viewport.**
   Antes: so o card 0 tocava → depois: os seis loopam mudos quando visiveis, poster
   continua o primeiro paint. Porque: E o elemento que o fundador apontou.
   Mitigado: preload="none", download so no intersect (≥35%), Save-Data/2g/reduced-motion
   ficam no poster, NotAllowedError volta ao poster+badge. Rollback: app/HeroGallery.tsx.
2. ✅ **FEITO 13/08 — Crossfade poster→video.** Poster virou camada permanente;
   o <video> monta com opacity:0 e entra em crossfade `--dur-base` no evento
   `playing`. Nada pisca; NotAllowedError desmonta o video e o poster ja esta
   embaixo. Rollback: app/HeroGallery.tsx + 2 regras CSS.
3. ✅ **FEITO 13/08 — Entrada em cascata da galeria.** fade-up `--dur-slow` +
   `--ease-out-expo`, delay 60ms/card (nth-child 2-6), fill backwards, so
   opacity/transform (CLS zero), dentro de `prefers-reduced-motion:
   no-preference`. Rollback: remover bloco @media/keyframes hgIn.
4. ✅ **FEITO 13/08 — Hover de video com zoom sutil.**
   `.vcard:hover/.focus-within .hvid{transform:scale(1.04)}` com transicao
   `--dur-base`/`--ease-swift` no .hvid; overflow:hidden ja segura. Tokens
   `--dur-fast/base/slow` + `--ease-swift/out-expo` entraram no bloco de vars
   do .klp (primeiro uso real do lib/uiTokens.ts em CSS). Rollback: 1 regra.
5. ✅ **FEITO 13/08 — Fade-up nas secoes ao rolar.** app/RevealOnScroll.tsx: JS
   aplica .rv so ao que esta ABAIXO da dobra no mount; observer revela 1x
   (.rv-in). Sem JS/reduced-motion: tudo visivel desde o inicio. **SEMANA 1
   COMPLETA.** Rollback: remover <RevealOnScroll /> + 2 regras CSS.

### SEMANA 2 — dias 6-10: "O PRODUTO GANHA O BRILHO"
Resultado visivel: /generate e o video pronto parecem a landing, nao um admin.

6. ✅ **FEITO 13/08 — Skeleton loaders no /generate.** analyzing/scripting agora
   mostram mini 9:16 + 3 linhas de script em shimmer (a forma do que vem);
   spinner verde do broll (unica cor fora da marca) virou azul; os <li> das
   listas de etapas (PipelineStages + FastPipelineStages + linha de render)
   ganharam transition .25s — fim do corte seco; statusMessage do RenderHeader
   entra em fadeUp via key={message}. Bloco <style jsx global> proposital
   (componentes filhos ficam fora do escopo do style jsx). Rollback: git revert.
7. ✅ **FEITO 13/08 — Cerimonia do video pronto.** "Your video is ready" ganhou
   check que se desenha (stroke-dashoffset) e a moldura 9:16 entra em pop
   (out-expo .45s) com UM pulso de glow azul — sem confete, sutil como manda o
   risco anotado. reduced-motion desliga tudo. Rollback: 2 classes + svg.
8. ✅ **FEITO 13/08 — Skeleton no /history.** app/(dashboard)/history/loading.tsx:
   a rota abre com header + grade 9:16 em shimmer (mesma grade do
   HistoryClient), troca sem salto de layout. Rollback: deletar o arquivo.
9. ✅ **FEITO 13/08 — Toast animado de download/copy.** HistoryClient: toast
   slide-in (out-expo 250ms) com check desenhado em stroke-dashoffset;
   download E copy confirmam; um por vez, some em 2.2s. Rollback: showToast +
   JSX do fim.
10. ✅ **FEITO 13/08 — Hover-preview nos cards do dashboard/viral-now.** Lift
    da landing (translateY -4px + sombra, curva swift .25s) nos cards virais
    do DashboardClient E do ViralNowClient (regra dos pares cumprida).
    Rollback: reverter os 2 handlers.

### SEMANA 3 — dias 11-15: "CONSISTENCIA TOTAL" (os tokens em TODAS as paginas)
Resultado visivel: home, /generate, /pricing, /signup, /history — mesma pele.

11. ✅ **FEITO 13/08 (landing 14h + resto 18h) — Raios orfaos → escala unica.** Antes: 15 px
    soltos + 6 rounded-* → depois: todo raio vem de --r-xs/sm/md/lg/pill (mapa:
    6/8/11/12→xs, 13/14→sm, 16/18→md, 20/24/30→lg, 980/999/9999/50%→pill).
    Porque: item 5 do sistema deles. Fazer por pagina, screenshot antes/depois.
    **FEITO na home (app/KineoLanding.tsx): 18 valores px orfaos → 0.** Tokens
    que faltavam (`--r-xs:8px`, `--r-sm:13px`, `--r-pill:999px`) entraram no
    bloco de vars do `.klp`, ao lado dos `--r-md/--r-lg` que ja existiam.
    Diff: 16 linhas. So 3 mudancas sao visiveis a olho e todas aproximam a
    pagina da propria escala: `.final` 30→22px (agora igual a `.plan`, `.step`
    e ao composer), `.tico` 14→13px, `.composer` mobile 20→22px (mobile passa a
    concordar com o desktop). `.btn` 980→999px e `.ck` 50%→999px sao
    matematicamente identicos no render (raio clampado). **Excecao documentada:**
    os 3 `border-radius:0` da tabela comparativa ficam — sao reset, nao raio.
    Medido no ar com a folha injetada: CLS 0, nenhum retangulo mudou de tamanho.
    **COMPLETADO 13/08 (sprint 18h):** a escala subiu para `:root` em
    `app/globals.css` (5 linhas, valores IDENTICOS aos do `.klp` — nao ha
    divergencia possivel) e com ela cairam os 25 raios orfaos que sobravam fora
    da landing: `globals.css` (11), `app/viral-score/ViralScoreClient.tsx` (12),
    `components/AvatarUpload.tsx` (1) e `app/not-found.tsx` (1). Papeis fixados
    e agora escritos no proprio `:root`: **xs = inputs/badges/chrome pequeno ·
    sm = botoes e paineis internos · md = cards e containers · lg = superficies
    grandes · pill = circulos e pills.** Onde o mapa px→token do dia 11 brigava
    com o papel (11px e 12px em BOTAO cairiam em `xs`/8px), **o papel venceu** —
    botao vai para `--r-sm`, o que por acaso tambem e o delta menor (11→13 em vez
    de 11→8). `components/AvatarUpload.tsx` nao virou token e sim
    `border-radius: inherit`: os 16px de `.sfa-entry::before` eram uma copia do
    `rounded-2xl` do proprio elemento e sairiam de sincronia na primeira troca de
    classe — `inherit` e o padrao que a casa ja usa em `.btn-ripple::after` e
    `.gradient-border::before`.
    **NAO TOCAR:** os `border-radius` das rotas
    `app/api/**` sao HTML de e-mail — cliente de e-mail nao resolve `var()`,
    tokenizar la quebraria o layout dos e-mails.
    **EXCECOES DOCUMENTADAS (o grep do dia 20 vai encontrar exatamente estas 4):**
    os 3 `border-radius:0` da tabela comparativa do KineoLanding (sao reset, nao
    raio) e o `border-radius:2px` do `::-webkit-scrollbar-thumb` no globals.css —
    custom properties nao resolvem de forma confiavel dentro dos pseudo-elementos
    `::-webkit-scrollbar-*` em todo Chromium; se `var()` falhasse ali o raio
    cairia para 0 e a barra ficaria quadrada. O thumb tem 4px de largura, 2px ja
    e o maximo por clamp: risco real, ganho zero. Rollback: git revert.
12. **Cinzas e timings → tokens.** Antes: 21 tons no KLP + 14 duracoes → depois: os 9
    tons e 3 duracoes/2 easings da tabela, com find&replace auditado (nenhuma mudanca
    visual percebida a olho — e consolidacao, nao redesign). Rollback: git revert.
13. ✅ **FEITO 13/08 (auditoria) — Focus-visible consistente.** Ja coberto:
    globals.css tem :focus-visible global (anel azul .7, offset 2) desde o UI
    Polish v1.3, valendo para landing e dashboard; .btn da landing tem o
    proprio anel. Nenhum outline:none suprimindo (auditado por grep).
14. ✅ **FEITO 13/08 — Nav com estado ativo.** RevealOnScroll ganhou um 2o
    observer: "Pricing" acende (cor + risco azul ::after) quando #pricing esta
    na janela util (rootMargin -35%/-45%). Unica ancora da nav; se a nav
    ganhar mais ancoras, generalizar o seletor. Rollback: remover observer.
15. ✅ **FEITO 13/08 — Posters .jpg → .webp.** 10 posters convertidos (208→167KB,
    -20%). DECISAO IMPORTANTE: posterPath alimenta OG images, JSON-LD e
    video-sitemap em 15+ paginas — la o .jpg FICA (preview social nao aceita
    webp confiavelmente). Superficies visuais (HeroGallery, grade e palco do
    /examples) usam posterWebpPath() de lib/publicExamples. Rollback: helper.

### SEMANA 4 — dias 16-20: "O ACABAMENTO QUE NINGUEM NOTA MAS TODOS SENTEM"
Resultado visivel: dia 20 = screenshot lado a lado com o Higgsfield passa no teste.

16. ✅ **FEITO 13/08 — Empty state do /history com personalidade.** Saiu o
    fundo navy legado rgba(11,17,32) + emoji; entrou superficie #131316 +
    ilustracao SVG da marca (3 molduras 9:16 em cascata, play azul). CTA
    intacto. Dashboard empty state fica para sprint. Rollback: bloco antigo.
17. ✅ **FEITO 13/08 — Micro-brilhos.** Sheen diagonal azul-suave no .btn-w:
    1x apos load (delay .9s) + 1x por hover, CSS puro, reduced-motion off.
    LiveStatsBadge: count-up 600ms ease-out ate os numeros REAIS (regra de
    honestidade intacta — anima a contagem, nunca o valor). Rollback: 2 blocos.
18. **Transicao landing → /signup.** Antes: navegacao seca → depois: fade curto (View
    Transitions API, fallback nulo = comportamento atual). Porque: continuidade de
    mundo. Rollback: remover meta.
19. ✅ **FEITO 13/08 — /examples vivo + palco.** Grade: ExampleLiveMedia
    (client) com as MESMAS regras da galeria da home (poster-first, monta no
    intersect, preload none, pausa fora, crossfade no playing, Save-Data/2g/
    reduced-motion → poster). Palco do [slug]: moldura com glow azul identica
    ao momento "video pronto" do /generate. Rollback: <img> antigo no page.
20. **AUDITORIA FINAL LADO A LADO.** Screenshot da home Kineo x home Higgsfield na
    mesma janela; rodar o checklist "Como saberemos" abaixo, item por item, com numeros
    (grep de raios/cinzas/duracoes + Lighthouse vs baseline); registrar no Diario o que
    passou e o que vira backlog v2. Sem codigo novo neste dia — so medicao e correcao fina.

21. **NOVO (13/08, sprint 14h) — /wall: a pagina que existe para PROVAR mostra um
    retangulo preto.** Achado olhando a Wall of Proof com olhos de Higgsfield.
    Antes: o card usa a thumb do YouTube (`i.ytimg.com/vi/<id>/hqdefault.jpg`,
    **480x360 = 16:9**) dentro de uma moldura **9:16 de 163x291** com
    `object-fit:cover`. O corte guarda so a tira vertical central — e no unico
    card publicado hoje essa tira e quase toda preta. Resultado: o mural da
    prova social entrega um quadrado vazio no lugar do video. Depois: (a) o
    frame vira 16:9 OU o `cover` ganha um backdrop borrado da propria thumb
    (a solucao do YouTube para o mesmo problema), (b) tentar `maxresdefault`
    com fallback para `hqdefault` no `onError` — `maxres` costuma trazer o
    frame de capa em vez do letterbox, (c) gradiente inferior de legibilidade
    (item 6 do sistema deles) sob o titulo. Porque: e a unica pagina do site
    cujo trabalho e ser prova, e hoje ela nao prova nada.
    Anotados junto, para nao virarem item novo depois: o texto diz **"3 Shorts
    published ... last 7 days" e so 1 card renderiza** (checar se o filtro de
    7 dias esta contando errado — pode ser bug de dados, nao de UI); a pagina
    usa **6 raios distintos** (999/18/14/12/10/8) e nunca passou pelos tokens;
    e o azul da marca aparece em **12 elementos** na primeira dobra (link do
    breadcrumb + kicker + pill do filtro + CTA + painel de baixo) — o oposto do
    "1 acento usado raro" do item 3 do sistema deles. Rollback: git revert.

22. **NOVO (13/08, sprint 18h) — A SEGUNDA LINGUAGEM DE RAIO NAO ESTA NOS
    ARQUIVOS: ESTA NO `html{font-size:14px}`.** Achado olhando `/pricing` com
    olhos de Higgsfield e medido no DOM de producao. A pagina inteira usa **4
    raios — 9999 / 14 / 10.5 / 7px — e nenhum deles existe na escala de tokens**
    (8/13/18/22/999). Nao e desleixo de quem escreveu a pagina: sao
    `rounded-full`, `rounded-2xl`, `rounded-xl` e `rounded-lg` do Tailwind, que
    valem 1rem / 0.75rem / 0.5rem. E `app/globals.css` da, na MESMA regra,
    `font-size:14px` para `html, body` — entao **1rem = 14px e a escala inteira
    do Tailwind (raio, espacamento, tipografia) roda a 87,5%**. Medido no ar:
    `rounded-md 5.25px · rounded-lg 7px · rounded-xl 10.5px · rounded-2xl 14px ·
    rounded-3xl 21px`. Consequencia para o roadmap: o item 11 pode tokenizar
    arquivo por arquivo para sempre e **as 557 ocorrencias de `rounded-*`
    (`rounded-*`) nunca vao convergir** — elas nao
    passam por `border-radius:` nenhum, passam pelo config.
    Contagem no HEAD de 13/08: **557 ocorrencias** (244 `rounded-xl` + 172
    `rounded-2xl` + 113 `rounded-lg` + 17 `rounded-md` + 11 `rounded-3xl`), mais
    113 `rounded-full` que ja concordam com `--r-pill`. Antes: duas escalas
    incomensuraveis (tokens em px absolutos, Tailwind em rem de 14px). Depois:
    `borderRadius` declarado em `tailwind.config.js` apontando para os tokens
    (`lg: 'var(--r-xs)'`, `xl`/`2xl`: `'var(--r-sm)'`, `3xl: 'var(--r-lg)'`), um
    arquivo, alcance total. Deltas: 2xl 14→13 e 3xl 21→22 sao invisiveis; o
    balde grande e `rounded-xl` 10.5→13 (+2,5px em 244 usos) — **este exige
    screenshot antes/depois em /pricing, /history e dashboard antes de commitar,
    e e por isso que vira item proprio e nao um apendice do dia 11.**
    **NAO mexer no `font-size:14px` do `html`** nesta sprint nem em nenhuma
    outra sem item dedicado: subir para 16px re-escalaria espacamento e
    tipografia do app inteiro de uma vez — e o oposto de "1 item isolado com
    rollback trivial".
    Anotados junto, para nao virarem item novo depois: `/pricing` tem **0
    `<video>` e 0 `<img>`** — a unica pagina do funil onde o dinheiro e decidido
    nao mostra **nenhuma prova**, enquanto no Higgsfield a prova em video esta
    dentro de cada card (itens 1, 7 e 8 do sistema deles); o azul da marca
    aparece em **23 elementos acima da dobra** (pior que os 12 do /wall — item
    21); e a pagina roda **so em Inter**, sem Space Grotesk em nenhum titulo,
    o que contraria o teste 5 do dia 20 (2 familias com papel documentado).
    Fora de escopo de UI, so registrado para o fundador olhar: o `<h1>` do
    /pricing e um **preco em BRL** ("R$ 24,90/mo") — se for geolocalizacao,
    esta certo; se nao, um visitante americano ve real na primeira linha.
    Sprint de UI nao toca preco nem copy de oferta, entao nada foi feito.
---

## COMO SABEREMOS (o teste do dia 20 — 10 afirmacoes verificaveis)

1. Screenshot home Kineo x Higgsfield lado a lado: ambas tem video vivo na dobra,
   texto-sobre-video com gradiente, grade densa com CTA por card.
2. `grep 'border-radius:[0-9]' app components` (fora de tokens/globals) retorna **0**
   valores px orfaos; toda UI usa --r-xs/sm/md/lg/pill ou classes mapeadas.
3. Cinzas quase-neutros em uso: **≤9 tons**, todos os 9 da tabela (grep de hex).
4. Duracoes de transicao em uso: **≤3** (--dur-fast/base/slow) + 2 easings nomeados.
5. **2 familias tipograficas** carregadas e usadas (Inter UI, Space Grotesk display) —
   nenhum font-family orfao fora delas + mono de codigo.
6. Nenhuma pagina do funil (home, /generate, video pronto, /pricing, /signup,
   /history) mostra spinner generico — skeleton ou shimmer em 100% dos loadings.
7. Todo card de video do site (home, /examples, dashboard) toca em viewport com
   preload="none" e volta ao poster em Save-Data/reduced-motion.
8. Todo elemento interativo tem focus-visible com anel #2997ff (tab pela home inteira
   sem perder o foco de vista).
9. O momento "video pronto" tem cerimonia (glow+fade) e o download confirma com toast.
10. **Lighthouse mobile da home ≥ baseline registrado** (abaixo); LCP continua sendo o
    poster/texto da dobra, nunca um <video>.

## BASELINE DE PERFORMANCE (registrado 12/08 — a regra e NAO CAIR)

- Producao (https://shortsforgeai.com/, 12/08, curl da sandbox): **TTFB 0,36–0,54s**,
  HTML da home **180 KB** (179.850 B), HTTP 200. MP4s da galeria: 1,43 MB total,
  lazy (so no intersect); posters ~134 KB.
- **Lighthouse: PENDENCIA da proxima sprint** — a API keyless do PageSpeed estourou a
  quota hoje (`Quota exceeded ... pagespeedonline.googleapis.com`). Proxima sprint DEVE
  rodar PSI (mobile, performance) contra https://shortsforgeai.com/ e gravar aqui:
  score ___, LCP ___, TBT ___, CLS ___. Ate la, o guard-rail e: HTML da home ≤180 KB,
  TTFB ≤0,6s, e nenhum asset novo no critical path.

## PROVA DE PESO DO DIA 1 (medido 12/08)

- MP4s dos 6 cards (5s, 360x640, sem audio): 135–314 KB cada, **1,43 MB total**.
- LCP intacto: poster e o primeiro paint; <video> dos cards 1-5 montam pos
  window.load + requestIdleCallback; preload="none" → download so no play() do
  IntersectionObserver, card a card, ≥35% visivel.
- Mobile: trilho mostra ~3 cards → ~700 KB pos-idle; Save-Data/2g sem autoplay.
- CLS zero: poster e video sao camadas absolute no mesmo box aspect-ratio 9/16.

## DIARIO

### FECHAMENTO DO DIA — 13/08 (3 linhas, escritas pela sprint das 18h)

1. **Dia 11 fechado.** A escala unica de raios saiu de dentro da landing e virou
   lei do site: subiu para `:root` e apagou os 25 ultimos valores orfaos
   (globals.css, /viral-score, AvatarUpload, 404). Restam 4 excecoes, todas
   documentadas e proposital. **Semana 3 agora so deve o dia 12.**
2. **O que a auditoria achou e voce precisa saber: nada disso esta no ar.**
   `origin/main` continua em `f0f63c7`; **10 commits esperam push**, e um deles
   nao e UI — e `ce2689b`, o resgate do voiceover que impede o `/api/compose`
   de morrer depois de ja ter gasto roteiro e B-roll. Medido no DOM, nao
   deduzido do git: em producao `--r-xs/--r-sm/--r-pill` ainda respondem
   MISSING e `.final` ainda tem 30px. **O push e seu — e hoje ele vale mais que
   o de costume.**
3. **O achado do dia veio de /pricing e nao e sobre /pricing.** A pagina que
   decide o dinheiro nao tem **nenhum** video nem imagem, e usa 4 raios que nao
   existem na nossa escala — porque `html{font-size:14px}` faz o Tailwind
   inteiro rodar a 87,5% (1rem = 14px). Tokenizar arquivo por arquivo jamais
   alcancaria isso: sao 557 classes `rounded-*` que passam pelo config, nao por
   `border-radius:`. Virou o **item 22**.

---

- **12/08** — Dia 1 ✅ (galeria viva, commit c932c11). Roadmap reestruturado em 4
  semanas com destino + tokens extraidos do CSS real do Higgsfield (10 bundles) +
  auditoria numerica do Kineo (15 raios px / 21 cinzas / 14 duracoes) + criado
  lib/uiTokens.ts. Baseline curl registrado; Lighthouse ficou como pendencia (quota PSI).
- **13/08 (manha, pedido direto do fundador)** — Dias 2, 3 e 4 ✅ num pacote so:
  crossfade poster→video no `playing`, cascata 60ms/card na galeria, hover zoom
  1.04 no conteudo. Tokens --dur-*/--ease-* estreiam no .klp. tsc limpo.
  Semana 1 agora so deve o dia 5 (fade-up das secoes) — fica para a sprint das 14h.
- **13/08 (2a leva, "vamos adiantar o roadmap")** — Dias 5, 8, 9 e 10 ✅:
  SEMANA 1 COMPLETA + metade da semana 2. Fade-up das secoes (RevealOnScroll,
  progressive enhancement de verdade), skeleton 9:16 no /history (loading.tsx),
  toast de download/copy com check animado, lift nos cards virais (pares
  Dashboard+ViralNow). BONUS da manha: comentarios do KLP_CSS fora do fio
  (home 183→166KB, 13KB abaixo do baseline). Faltam da semana 2: dias 6 e 7
  (/generate skeleton + cerimonia do video pronto) — GenerateClient tem 12,5k
  linhas, tratar em sprint dedicada com teste manual. Sprints 14h/18h: proximo
  em ordem e o dia 6.
- **13/08 (3a leva, "melhorar home ate a criacao do video")** — Dias 6 e 7 ✅
  (commit 86aae4f): SEMANA 2 COMPLETA em um dia. Mapa do GenerateClient feito
  por agente antes de tocar (phase em :978, flags 6856-6869, done 8470+).
  Achados registrados para sprints futuras: FullscreenLoader e
  GenerationProgressSteps+progressStep sao DEAD CODE (o 2o com setInterval
  rodando a toa — candidato a limpeza); headlineProgress tem degraus fixos
  (40/72/75) — suavizar exigiria logica, nao CSS; /video (VideoClient) e
  legado inalcancavel, NAO tocar. Verificacao: tsc ok; build local inviavel no
  mount (OneDrive) — validacao final e o build do Vercel, com rollback pronto.
  Sprints 14h/18h: proximo em ordem e o dia 11 (raios orfaos → escala unica).
- **13/08 (sprint 14h) — Dia 11 na home ✅ + auditoria do anterior EM PRODUCAO.**

  **1. Auditoria de f0f63c7 (dias 13-17+19) no ar.** Nao herdada de doc: medida
  no HTML e no DOM de `https://www.usekineo.com/` as 14h. `origin/main` =
  `f0f63c7` por `git ls-remote`; o deploy trocou **durante** a auditoria
  (`dpl_B4hPY…` → `dpl_BW3im…`), entao a primeira leitura era do build antigo —
  a segunda e a valida. **No ar agora:** `.nav-on` presente (dia 14), **os 6
  posters servidos em .webp** (dia 15: 21+28+12+21+20+13 = **115 KB**, contra
  ~134 KB de .jpg no baseline), 12 elementos com `.rv` esperando o observer
  (dia 5). **Nada regrediu:** **CLS = 0** medido com PerformanceObserver;
  **composer 667x432 exato** e raio 22px; `preload="none"` nos 6 videos;
  **zero erro de console**; HTML da home **169.516 B**, 10 KB abaixo do
  guard-rail de 180 KB. Com scroll real, a galeria toca sozinha — dias 1-4
  vivos. Efeito nos eventos (13/08): `homepage_view` 43,
  `home_prompt_first_viewed` 43 (**100% de quem abre a home chega a caixa**),
  `video_ready_viewed` 12 sobre 13 `generate_completed`.
  **2 achados que NAO viram correcao hoje, mas ficam registrados:**
  (a) num monitor 1080p (viewport 911px) a galeria comeca em **y=926px** — o
  elemento que o fundador apontou como a alma da home fica inteiro **abaixo da
  dobra**, e so aparece com scroll; (b) sob automacao os 6 `<video>` ficaram em
  `readyState 0 / networkState 2` por ~7s (poster no lugar do video) — pode ser
  so o throttle de aba nao-focada do Chrome, mas 6 MP4s de ~250 KB disparando
  juntos merece um olho humano antes de virar item.

  **2. Item da sprint: dia 11 na home.** `app/KineoLanding.tsx`: **18
  `border-radius` px orfaos → 0**, tudo em `--r-xs/sm/md/lg/pill`. Detalhes,
  mapa e excecoes no item 11 acima. Verificacao alem do tsc: a folha nova foi
  **injetada na producao ao vivo** e o antes→depois medido elemento a elemento
  (`.final` 30→22, `.tico` 14→13, `.btn` 980→999 e `.ck` 50%→999 identicos no
  render) com **CLS 0** e nenhuma caixa mudando de tamanho — border-radius e
  paint, nao layout. `tsc --noEmit` escopado **EXIT=0 e falsificado** (erro
  proposital → `TS2322` na linha 28 → restaurado, md5 conferido, EXIT=0). EOL
  LF conferido no HEAD e na arvore.

  **3. Realimentacao do backlog: item 21 (/wall).** A pagina cujo unico trabalho
  e servir de prova social mostra **um retangulo preto** onde deveria estar o
  video: ela enfia a thumb 16:9 do YouTube (480x360) numa moldura 9:16 de
  163x291 com `object-fit:cover`, e sobra so a tira vertical central. Junto
  vao: "3 Shorts published" com **1 card na tela**, 6 raios distintos e o azul
  da marca em 12 elementos na primeira dobra. Detalhe completo no item 21.

  **Proximo em ordem:** terminar o dia 11 em `viral-score` + `globals.css`, e o
  dia 12 (cinzas e timings → tokens).

- **13/08 (sprint 18h) — Dia 11 FECHADO + a auditoria que mudou o assunto.**

  **1. Auditoria do item das 14h: ele nao esta em producao.** Nao herdada de
  doc — medida no DOM de `https://www.usekineo.com/` as 18h. `--r-xs`,
  `--r-sm` e `--r-pill` respondem **MISSING** no `.klp`; `.final` continua
  **30px** e `.tico` **14px** — exatamente os valores de ANTES do commit
  `955cb28`. `git ls-remote` confirma: `origin/main` = **`f0f63c7`**, e ha
  **10 commits locais sem push**. O item das 14h portanto **nao pode ter
  regredido nada**, porque nao rodou para ninguem; e o que mais pesa nessa fila
  nem e de UI: `ce2689b` conserta o saneador que apaga o roteiro do ChatGPT e
  mata o `/api/compose` **depois** de o video ja ter custado. Registrado no
  fechamento do dia porque o push e do fundador.
  **Saude do que ESTA no ar (build `dpl_BW3im…`), tudo verde:** **CLS = 0** por
  PerformanceObserver, composer **667x432 exato** com raio 22px, **6/6 videos
  com `preload="none"`**, **6/6 posters em .webp**, `.nav-on` presente, 12
  elementos `.rv` no lugar, **zero erro de console**, HTML da home **168.866 B**
  (11 KB abaixo do guard-rail de 180 KB). Nada regrediu.

  **2. Item da sprint: dia 11, o resto do site.** A escala de raios subiu do
  bloco `.klp` para `:root` em `app/globals.css` (5 linhas, valores identicos —
  nao ha divergencia possivel entre os dois lugares) e com isso **25 raios
  orfaos viraram token**: `globals.css` (11), `ViralScoreClient` (12),
  `AvatarUpload` (1, virou `inherit`), `not-found` (1). Sobram **4 excecoes,
  todas documentadas** no item 11 — os 3 `border-radius:0` da tabela (reset, nao
  raio) e o `2px` do `::-webkit-scrollbar-thumb`.
  **Verificacao alem do tsc:** o antes→depois foi medido **na producao ao vivo**
  em `/viral-score`, reescrevendo as proprias declaracoes via CSSOM e lendo
  `getComputedStyle` elemento a elemento: `.vs-card` 16→18, `textarea` 11→8,
  `.vs-dial` 50%→999, `.vs-track`/`.vs-fill` 6→8 (ambos ja clampados em 4px pela
  altura de 8px: **render identico**), `.vs-tips` 12→13, `.vs-cta` 14→13,
  `.vs-cta a` 11→13. **CLS = 0 e nenhuma caixa mudou de tamanho** — border-radius
  e paint, nunca layout. `tsc --noEmit` **EXIT=0 e falsificado** (erro proposital
  `const CSS: number` → acusou `TS2322` na linha 144 → restaurado, md5 conferido
  igual, EXIT=0).
  **A revisao adversarial pegou 2 defeitos meus, os dois antes do commit:**
  (a) o comentario que escrevi em `AvatarUpload.tsx` usava crases em volta da
  palavra `inherit` — **dentro de um template literal do styled-jsx**, o que
  fechou a string e quebrou o arquivo; o tsc acusou 15 erros e o comentario foi
  reescrito sem crases. (b) eu havia tokenizado o `::-webkit-scrollbar-thumb`;
  custom properties nao resolvem de forma confiavel nesses pseudo-elementos em
  todo Chromium e um `var()` que falha ali derruba o raio para 0 — revertido
  para `2px` com a razao escrita no proprio CSS.
  **Anomalia deixada em aberto, de proposito:** em `/viral-score` na producao,
  `.vs-go`/`.vs-ghost` **continuam computando 11px** mesmo com a regra reescrita,
  com folha injetada depois no documento e ate com `style` inline de valor
  literal — e `el.matches('.vs-go, .vs-ghost')` chegou a responder `false` para o
  proprio botao. Nao encontrei `!important` nem segunda folha. Isso **nao afeta
  o commit** (a edicao troca a declaracao no lugar, sem disputa de cascata, e
  raio nao move layout), mas merece um olho humano com o DevTools aberto antes
  de virar teoria. Registrado aqui em vez de virar uma explicacao bonita e falsa.

  **3. Realimentacao do backlog: item 22 (/pricing → tailwind.config.js).**
  A pagina onde o dinheiro e decidido tem **0 `<video>` e 0 `<img>`** e usa 4
  raios — 9999/14/10.5/7px — **nenhum deles da nossa escala**. A causa nao esta
  em nenhum arquivo de pagina: `globals.css` da `font-size:14px` para
  `html, body` na mesma regra, entao **1rem = 14px e o Tailwind inteiro roda a
  87,5%** (medido no ar: `rounded-lg 7px`, `rounded-xl 10.5px`,
  `rounded-2xl 14px`, `rounded-3xl 21px`). Enquanto isso nao for endereçado no
  config, o dia 11 pode tokenizar arquivo por arquivo para sempre que as **557
  classes `rounded-*`** nunca convergem. Detalhe, mapa e o aviso de NAO mexer no
  `font-size:14px` sem item proprio estao no item 22.

  **Proximo em ordem:** dia 12 (cinzas e timings → tokens).

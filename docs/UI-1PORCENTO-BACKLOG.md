# ROADMAP HIGGSFIELD 20 DIAS — UI 1% ao dia com destino [KINEO-HIGGSFIELD-20D-2026-08-12]

Pedido do fundador, literal: "usa o https://higgsfield.ai/ como referencia, eu acho
ele muito bonito, quero daqui 20 dias estar proximo da arquitetura e do design deles."
Este doc deixou de ser "20 retoques soltos": agora e um roadmap de 4 semanas cujo
dia 20 tem um teste objetivo — **o Kineo parece da mesma familia visual do
Higgsfield, mantendo a identidade Kineo** (o azul #2997ff, o dark #000, as provas
reais). Metodo continua: **1 dia = 1 sprint = 1 item isolado com rollback**. As
sprints agendadas (14h e 18h) consomem os dias EM ORDEM e marcam ✅ com data.

## REGRAS INVIOLAVEIS (nenhum dia deste roadmap pode tocar nisso)

- ~~Caixa do composer **667x432** (decisao do fundador, medida em 06/08).~~
  **APOSENTADA EM 15/08 — o elemento nao existe mais.** O fundador extinguiu o
  composer da home no mesmo dia (a home virou vitrine de motores; ver o bloco
  SYNC 15/08 do `CLAUDE.md`). Medido no DOM de producao nesta sprint:
  `document.querySelector('.composer')` responde **null**. Esta regra ficou
  duas sprints "passando" num teste sobre um elemento deletado — fica riscada
  aqui em vez de continuar sendo verificada. O que herda a protecao dela e a
  **fileira dos 4 cards de motor** (media 500x280, `EngineCycleCard` com
  double-buffer): sprint de UI nao mexe em tamanho de card nem na curadoria de
  `lib/engineWall.ts` sem ordem do fundador.
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
    ✅ **METADE "CINZAS" FEITA 14/08 (sprint 14h) na landing.** `app/KineoLanding.tsx`:
    **21 tons quase-neutros → 10**, e — o que importa mais que a contagem — **todos os
    10 agora sao declarados numa linha so** (o bloco de vars do `.klp`); nao sobrou
    UM hex neutro solto dentro de regra ou de `style` inline. Tokens novos: `--s0`
    (#0c0c0e, poco/overlay, absorve #0a0a0c), `--s3` (#26262a, realce), `--line3`
    (#4d4d50, borda de enfase), `--txt2` (#c7c7cd, absorve #c9c9cf). `--card` desceu
    de #161618 para **#141416** (o valor da tabela) e absorveu #131315 e #17171a;
    `--card2` #1d1d1f absorveu #191919, #19191c e #1a1a1d; `--s3` absorveu #212124;
    `--line` #26262a absorveu os 4 `#2a2a2d` que os `style` inline do rodape tinham
    inventado; `--muted2` #8f8f96 absorveu os 2 `#86868b` dos mesmos inlines.
    **Regra que a sprint seguiu e que o dia 20 vai cobrar:** so colapsar o que nao se
    ve. Toda colagem de SUPERFICIE ficou em **delta <= 6/255 por canal**; a unica de
    TEXTO (#86868b → #8f8f96) sobe 11/255, isto e **clareia** — nenhum texto do site
    ficou mais escuro do que estava.
    **As 2 que faltam para a meta de 9 tons, e por que NAO foram feitas:** `--line3`
    (#4d4d50) esta 19/255 acima de `--line2` e e a borda do plano **Most Popular** —
    colapsar apaga uma enfase de venda; `--muted2` (#8f8f96) esta 18/255 abaixo de
    `--muted` — colapsar escurece texto de rodape. As duas **se veem**, entao sao
    decisao do fundador e nao consolidacao. Ficam nomeadas para o dia 20.
    **Bonus que a auditoria do dia 11 obrigou:** os 3 `borderRadius: 999` em `style`
    inline do mesmo arquivo viraram `var(--r-pill)` — render identico (999px), e o
    grep do dia 20 agora acha zero. Ver a emenda ao item 22 sobre por que o grep de
    `border-radius:` nao os via.
    ✅ **METADE "TIMINGS" FECHADA 15/08 (sprint 14h).** Escopo: `app/globals.css`
    (a folha que TODA pagina do dashboard carrega) + os `styled-jsx` das 8
    superficies do funil — `/generate` (bloco `.gv-*`), `/templates`,
    `/account`, `/thumbnail-generator`, `/viral-score`, `SocialProofToast`,
    `StickyUpgradeBar`, `StickyFreeShortCTA`. **9 duracoes de UI distintas
    (.15/.18/.2/.22/.25/.3/.35/.4/.45s) viraram 3** (`--dur-fast/base/slow`) e
    **4 curvas viraram 2** (`--ease-swift` para interacao, `--ease-out-expo`
    para entrada). Medido em producao ANTES da mudanca, no DOM de `/generate`:
    5 duracoes distintas em uso na mesma pagina (0.15/0.18/0.2/0.25/0.3).
    **A regra virou DETERMINISTICA e esta escrita no proprio `globals.css`:**
    `<=0.2s → fast · 0.22–0.3s → base · >=0.35s → slow`. Ela substituiu o
    julgamento "por papel" de proposito, porque papel ja tinha produzido
    divergencia (ver o resgate abaixo). Consequencia numerica: **nenhuma
    duracao anda mais de 50ms** — 3 das 9 ficam byte a byte identicas
    (.15/.25/.4), as outras 6 andam 30 ou 50ms. Teto que fica valendo: se um
    valor so couber com delta >50ms, **nao e consolidacao, e redesign** — vira
    decisao do fundador, nao de sprint.
    **O que NAO foi tokenizado, de proposito:** loop e ambiente — `spin`
    .65s/1.1s, `pulse` 2s, `btn-pulse` 2.8s, `shimmer` 3.5s, `floatY` 6s,
    `auroraDrift` 16s, `progress` 1.4s, `gvShimmer` 1.4s, `gvGlow` 1.8s,
    `ring-fill` 1s, `pulse-ring` 3s, os `sfa*` do avatar e o `sfaBorder` 4s.
    Higgsfield limita a ESCALA DE UI a 120–350ms e manda ambiente passar de 1s:
    tokenizar um giro de spinner em 250ms transformaria a taxa de rotacao numa
    decisao de UI, que nao e o que estes tokens governam. O `0.01ms !important`
    do `prefers-reduced-motion` tambem fica literal — e o desligador.
    **Um acoplamento que a tokenizacao consertou de graca:** `.gv-done-frame`
    era `gvPop 0.45s ... , gvGlow 1.8s ease 0.45s 1` — o ATRASO do glow era uma
    copia manual da DURACAO do pop, e sairia de sincronia na primeira vez que
    alguem mexesse num sem lembrar do outro. Os dois agora leem `--dur-slow`:
    o glow nao pode mais descolar do pop.
    **RESGATE — 10 substituicoes de 14/08 estavam no disco e NUNCA foram
    commitadas.** `app/globals.css` ja tinha `fadeIn`, `resultsReveal`,
    `slideInRight`, `fadeInUp`, `ripple`, `.btn-ripple` e os 3 blocos de
    `transition` tokenizados, mais um comentario assinado
    `KINEO-UI-DIARIO-2026-08-14` — e o `git show HEAD:app/globals.css` nao
    tinha nada disso. A sprint das 18h de 14/08 fez o trabalho, nao commitou e
    nao escreveu o Diario (por isso o dia 14 aparece so com a entrada das 14h).
    O trabalho foi conferido linha a linha e entrou neste commit.
    **E o resgate revelou o defeito que fez a regra virar deterministica:** a
    varredura de 14/08 mandou `0.2s → --dur-base` em 3 declaracoes; a de hoje
    manda `0.2s → --dur-fast`. As duas cabem no teto de 50ms, entao nenhuma
    e "errada" — mas **um sistema de token em que o mesmo valor de origem cai
    em dois tokens diferentes nao e um sistema.** As 3 foram alinhadas para
    `fast` pela regra nova, e o `ease-out` solto do `.btn-ripple` (uma terceira
    curva) virou `--ease-out-expo`. **Nao sobrou UM literal de duracao de UI em
    `globals.css`** — o grep so acha os 11 loops de ambiente listados acima.
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
18. ✅ **FEITO 15/08 (sprint 18h) — Transicao landing → /signup.** Antes: navegacao
    seca → depois: fade curto (`--dur-base` + `--ease-out-expo`) no cartao de auth
    do `/signup` **e do `/login`** (regra dos pares). Porque: continuidade de mundo.
    **Nao foi a View Transitions API, e a razao esta MEDIDA, nao suposta.** Em
    producao, o clique em "Start free" e uma navegacao **SOFT**: um marcador posto
    em `window` sobrevive a navegacao e `performance.timeOrigin` nao muda — e
    `next/link` trocando a arvore no mesmo documento. A forma CSS da API
    (`@view-transition { navigation: auto }`) so vale para navegacao
    **cross-document**, e o Next **14.2.5** deste repo nao tem o
    `experimental.viewTransition` do 15: a regra seria **CSS morto**. Embrulhar o
    `router.push` em `document.startViewTransition` tambem nao serve — em React 18
    a troca de DOM nao acontece dentro do callback, e a transicao segura o snapshot
    ate o timeout (o risco e uma tela CONGELADA, nao um fade). A entrada no destino
    cobre os **dois** caminhos que a API nao cobre juntos: soft nav vindo da home e
    **carga fria** vinda de anuncio/SEO/`/start`.
    **O mecanismo ja existia e nunca tinha sido ligado:** `.page-enter` esta em
    `app/globals.css` desde o UI Polish, ja tokenizado (`--dur-base` +
    `--ease-out-expo`), com **ZERO call sites em `app/` + `components/`**. O item 18
    virou, na pratica, *ligar o fio que a casa ja tinha soldado* — diff de 3 linhas.
    **E ligar como estava escrito teria quebrado o checkout.** `.page-enter` usava
    `forwards`; com fill-forwards o transform final fica `translateY(0px)` em vez de
    `none`, e **transform computado cria bloco de contencao para descendentes
    `position: fixed`**. O `/signup` tem, DENTRO deste cartao
    (`app/(auth)/signup/page.tsx:770`), o interstitial `fixed inset-0 z-60` do
    **auto-OAuth de quem veio do checkout** — ele passaria a cobrir so o cartao.
    Provado na producao ao vivo com as duas variantes lado a lado: com `forwards`
    o filho `fixed inset-0` mede **400x200** (o tamanho do pai); sem fill mede
    **1916x911** (a viewport). A palavra `forwards` foi removida — sem fill o estado
    final e o natural do elemento (`opacity 1`, `transform none`), que e exatamente
    o desejado. Rollback: tirar `page-enter` dos 2 className.
19. ✅ **FEITO 13/08 — /examples vivo + palco.** Grade: ExampleLiveMedia
    (client) com as MESMAS regras da galeria da home (poster-first, monta no
    intersect, preload none, pausa fora, crossfade no playing, Save-Data/2g/
    reduced-motion → poster). Palco do [slug]: moldura com glow azul identica
    ao momento "video pronto" do /generate. Rollback: <img> antigo no page.
20. **AUDITORIA FINAL LADO A LADO.** Screenshot da home Kineo x home Higgsfield na
    mesma janela; rodar o checklist "Como saberemos" abaixo, item por item, com numeros
    (grep de raios/cinzas/duracoes + Lighthouse vs baseline); registrar no Diario o que
    passou e o que vira backlog v2. Sem codigo novo neste dia — so medicao e correcao fina.

21. ✅ **FEITO 16/08 (sprint 18h) — MAS PELO MOTIVO CONTRARIO AO QUE ESTE ITEM E A
    EMENDA DO ITEM 25 DIZIAM: o crop nunca foi o defeito.** Medido hoje: o YouTube
    entrega a thumb de Short **pillarboxed em toda resolucao** (faixas de brilho dos 3
    `maxresdefault` 1280x720: so as faixas 7-12 de 20 tem imagem = banda central de
    ~30%, e 720x9/16 = 405px = 31,6%), entao `object-fit: cover` numa moldura 9:16
    conserva o Short **inteiro** — em `hqdefault` e em `maxresdefault`. O `cover` ficou
    como estava. O defeito real: a thumbnail do unico card da aba padrao responde
    **404 em todas as 6 resolucoes** e o `i.ytimg.com` devolve, junto do 404, um **JPEG
    cinza 120x90 valido que dispara `load` e nao `error`** — logo a parte (b) deste item
    (fallback no `onError`) nao teria feito nada. Entrou `components/wall/WallThumb.tsx`
    detectando `naturalWidth <= 120` (no `onLoad` **e** no mount, porque com SSR a
    imagem pode ficar `complete` antes da hidratacao) com fallback da marca, mais o
    gradiente inferior de legibilidade da parte (c), mais a morte do comentario que
    descrevia uma URL que o arquivo nao usa (correcao 2 do item 25). Detalhamento
    completo e as 4 medicoes no Diario de 16/08 (sprint 18h). Rollback: 2 arquivos.
    **Texto original, preservado porque a leitura errada e o ensinamento:**
    /wall: a pagina que existe para PROVAR mostra um
    retangulo preto. Achado olhando a Wall of Proof com olhos de Higgsfield.
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

22. ✅ **FEITO 17/08 (sprint 14h) — A SEGUNDA LINGUAGEM DE RAIO NAO ESTA NOS
    ARQUIVOS: ESTA NO `html{font-size:14px}`.** `tailwind.config.js` ganhou
    `theme.extend.borderRadius` apontando para os tokens (`md`/`lg` → `var(--r-xs,8px)`,
    `xl`/`2xl` → `var(--r-sm,13px)`, `3xl` → `var(--r-lg,22px)`; `full` FORA do mapa,
    de proposito, porque 9999px ja concorda com `--r-pill`). Um arquivo, 546
    ocorrencias alcancadas. Provado no CSS compilado (`npx tailwindcss` gera
    `.rounded-xl{border-radius:var(--r-sm, 13px)}` e mantem `.rounded-full{9999px}`)
    e antes/depois no DOM de producao com a mesma regra injetada: `/pricing` cai de
    **17 elementos fora da escala para 3** e de **5 raios distintos para 4**, sem
    diferenca visivel. **A landing nao tem UMA classe `rounded-*`** (mede zero no
    DOM da home em producao) — entao a vitrine de motores e as regras inviolaveis
    do hero estao fora do raio de alcance por construcao, nao por cuidado.
    Detalhamento e as 6 medicoes no Diario de 17/08 (sprint 14h). Rollback: 1 arquivo.
    **Texto original preservado:**
    A SEGUNDA LINGUAGEM DE RAIO NAO ESTA NOS ARQUIVOS: ESTA NO `html{font-size:14px}`. Achado olhando `/pricing` com
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

    **EMENDA 14/08 (sprint 14h) — nao sao DUAS linguagens de raio, sao TRES, e a
    terceira e a maior.** Alem dos tokens em px e das 557 classes `rounded-*` do
    Tailwind a 87,5%, existe **`borderRadius:` em `style` inline de JSX: 614
    ocorrencias com valor numerico em `app/` + `components/`**. Nenhuma delas passa
    por `border-radius:` (o grep do teste 2 do dia 20) nem pelo `tailwind.config.js`
    (a correcao proposta neste item 22) — sao propriedades de objeto JavaScript que
    o React serializa direto no atributo `style`, que e o lugar de MAIOR
    especificidade do documento. Consequencia pratica: **o teste 2 do dia 20, como
    esta escrito, pode retornar 0 com o site inteiro fora da escala.** O teste
    precisa virar tres greps, nao um. Os 3 casos do `KineoLanding` ja foram
    corrigidos hoje junto do item 12 (999 → `var(--r-pill)`, render identico);
    sobram ~611, e eles NAO cabem numa sprint — viram varredura por pagina depois
    que o config do item 22 estiver de pe (senao a gente tokeniza duas vezes).

    **EMENDA 14/08 — a "anomalia deixada em aberto" de 13/08 esta explicada, e nao
    era do `/viral-score`.** Ficou registrado ontem que reescrever regras na
    producao nao mudava o computado de `.vs-go`/`.vs-ghost`. A causa foi medida
    hoje: **a folha do `.klp` nao esta no `<head>` — esta dentro do `<main>`**
    (`<style dangerouslySetInnerHTML>` no fim do `KineoLanding`, 24.944 bytes no ar).
    Como a landing e as telas com `styled-jsx` injetam estilo no BODY, qualquer
    `<style>` de teste anexado ao `<head>` perde o desempate da cascata por ordem
    de documento, mesmo com a mesma especificidade — e a medicao le o valor antigo
    e parece que "nada acontece". **Metodo da casa, a partir de agora: folha de
    teste vai em `document.body.appendChild`, nunca no head.** Verificado hoje: a
    mesma injecao que nao mudou nada no head mudou tudo no body (numeros na secao
    do Diario). Nao havia `!important` nem segunda folha; era ordem de documento.

23. ✅ **FEITO 17/08 (sprint 18h) — METADE (a) FEITA, METADE (b) IMPOSSIVEL, E A
    JUSTIFICATIVA DESTE ITEM ESTAVA CONTAMINADA.** Entrou `HistoryCardFrame` em
    `app/(dashboard)/history/HistoryClient.tsx`: o `<video>` do card so MONTA no
    `IntersectionObserver` (rootMargin 300px), com gradiente da marca no lugar do
    preto ate la, crossfade `--dur-base`/`--ease-swift` no `loadeddata`, e
    `#t=0.1` no src para forcar readyState 2 (sem isso `preload="metadata"` so
    garante readyState 1 pela spec — nao existiria frame para pintar, e o card
    ficaria no gradiente para sempre). Save-Data/2g nao montam nada.
    **A metade (b) e IMPOSSIVEL hoje e o item mentia sobre isso.** Este item dizia
    "a coluna `thumbnail_url` ja existe (commit #320) e nao esta sendo usada como
    poster ... o asset ja esta pago". Medido no banco hoje:
    `select count(thumbnail_url) from videos` = **0 de 1129** (e 0 de 213 nos
    ultimos 7 dias). A coluna existe, e LIDA em quatro telas e **nunca foi gravada
    uma unica vez**. Nao ha poster para usar. Virou o item 29.
    **E a evidencia central deste item — "readyState 0 e networkState 2 em 100/100
    dois segundos depois do load" — nao prova o que dizia.** Refeita hoje: a aba
    estava em `visibilityState: "hidden"` e o Chrome **congela o preload de midia
    em aba de fundo**. Prova direta: um `load()` explicito num card VISIVEL na
    viewport, aba escondida, ficou **5 s em readyState 0 com 0 byte**, enquanto um
    `fetch` com `Range` no MESMO arquivo respondeu **206 na hora** — rede e CDN
    livres, o elemento de midia e que estava suspenso. **E exatamente a armadilha
    que o Diario de 17/08 (sprint 14h) registrou para `loading="lazy"`, uma sprint
    antes, e que este item pisou mesmo assim.** O que sobra provado e estrutural e
    basta: **100 `<video>`, `preload="metadata"` declarado em 100/100, `poster` em
    0/100, 91 abaixo da dobra**, contra um bucket `renders` de **1.027 arquivos de
    29,4 MB em media**. `<video>` nao tem `loading="lazy"`: quem nao gasta o byte
    e quem nao monta o elemento.
    **A metade (c) (paginacao acima de ~24 cards) fica aberta** — e mudanca de
    arquitetura de dados, nao de UI, e nao cabe num item com rollback trivial.
    Limite conhecido do que entrou: quem rolar os 100 cards ate o fim monta os 100
    (nao desmontamos ao sair da tela, para nao piscar no scroll de volta) — o
    estado final e o de antes, o ganho e todo no comeco. Rollback: 1 arquivo.
    **Texto original preservado, porque a leitura errada e o ensinamento:**
    **NOVO (14/08, sprint 14h) — /history: a pagina onde o cliente ve o proprio
    trabalho abre 100 videos de uma vez, nenhum com poster, 91 fora da tela.**
    Achado na rotacao, medido no DOM de producao com sessao real (570 creditos, a
    conta do fundador). Numeros: **100 `<video>`, `preload="metadata"` em 100/100,
    `poster` em 0/100, 91 abaixo da dobra, `readyState 0` e `networkState 2`
    (NETWORK_LOADING) em 100/100** dois segundos depois do load.
    Antes: abrir "My Videos" dispara **100 requisicoes de metadata simultaneas**
    para MP4s do storage — 91 delas por videos que a pessoa nunca vai ver naquela
    tela — e, como **nenhum card tem `poster`**, o retangulo 168x299 so deixa de
    ser **preto** quando o metadata do proprio MP4 chega. E o mesmo pecado do
    `/wall` (item 21: a pagina que existe para provar mostra um quadrado vazio),
    so que aqui e pior: e a prova do trabalho que o cliente ja pagou.
    Depois: (a) `preload="none"` nos 100 e montagem no `IntersectionObserver`, as
    MESMAS regras que a galeria da home ja usa desde o dia 1 (poster-first, pausa
    fora da tela, Save-Data/2g/reduced-motion → poster); (b) **`poster` obrigatorio
    no card** — a coluna `thumbnail_url` ja existe (commit #320) e nao esta sendo
    usada como poster do `<video>`; enquanto ela for nula, gradiente da marca no
    lugar do preto, nunca um buraco; (c) paginacao/virtualizacao acima de ~24
    cards.
    Porque: e o item 2 do sistema deles ("preload='none' em 100% — o peso segue o
    olhar, nao o pageload") e o teste 7 do dia 20, que hoje **falha em 100 de 100
    elementos numa pagina so**. E porque o skeleton do dia 8 (`loading.tsx`) esta
    consertando o sintoma errado: ele cobre bonito o carregamento da ROTA e depois
    entrega 100 retangulos pretos esperando metadata.
    Anotados junto, para nao virarem item novo depois: `/history` usa **14 raios
    distintos** e os cinco mais frequentes — `6px` (400x), `7px` (101x), `12px`
    (100x), `50%` (100x), `4px` (100x) — **nao existem na escala de tokens**
    (8/13/18/22/999), o que confirma o item 22 numa segunda pagina; e a pagina roda
    **so em Inter em 2.181 de 2.181 elementos**, zero Space Grotesk, igual ao
    `/pricing` e ao `/generate` (medido hoje: 488/488 em Inter). Isso ja e um
    padrao e nao um caso: **o produto inteiro e monofonte e a segunda familia so
    aparece em 8 arquivos, dos quais so 2 sao do dashboard** (`/animate` e
    `/avatar`) — a casa paga o peso de carregar Space Grotesk em toda pagina e nao
    recebe identidade nenhuma em troca dentro do produto. Candidato natural a item
    24 quando a rotacao voltar. Rollback: git revert.

24. **NOVO (15/08, sprint 14h) — EXISTE UMA QUARTA LINGUAGEM DE TIMING, ELA TEM
    274 OCORRENCIAS, E O DIA 12 IA FECHAR SEM VE-LA.** Achado na rotacao
    (`/signup`, a pagina para onde aponta o unico CTA que este roadmap protege)
    e confirmado por grep no repo inteiro. O `/signup` **nao tem um unico
    `transition:` em CSS** — ele anima com **classes Tailwind**:
    `transition-all`, `transition-colors`, `duration-*`, `ease-*`.
    Contagem no HEAD de 15/08, em `app/` + `components/`: **274 ocorrencias de
    `transition*`** (89 `transition-all`, 14 `transition-colors`, 3
    `transition-transform`, 2 `transition-opacity`) em **27 arquivos**, mais
    **15 `duration-*`** (7x `duration-300`, 7x `duration-200`, 1x
    `duration-700`) e **58 classes de curva** (22 `ease-out`, 18 `ease-in-out`,
    18 `ease-in`). E `tailwind.config.js` **nao declara `transitionDuration`
    nem `transitionTimingFunction`** — so tem `theme.extend` vazio desses dois.
    Consequencia: essas 274 animacoes rodam no **default do Tailwind — 150ms e
    `cubic-bezier(0.4,0,0.2,1)`** — e nenhuma delas passa por `--dur-*` nem por
    `--ease-*`. Duas coisas seguem disso, e as duas sao ruins:
    (a) os 150ms **coincidem** com `--dur-fast` hoje, o que esconde o problema:
    no dia em que alguem mudar `--dur-fast`, 274 lugares silenciosamente
    continuam em 150ms e a UI racha em duas velocidades;
    (b) `cubic-bezier(0.4,0,0.2,1)` e uma **terceira curva**, que nao esta em
    nenhum arquivo e por isso **nao aparece em grep nenhum** — ou seja **o
    teste 4 do dia 20 ("<=3 duracoes + 2 easings nomeados") pode dar verde com
    o produto inteiro rodando numa curva que nao e nossa.**
    E o item 22 outra vez, com outra propriedade: la o raio tinha uma segunda
    lingua no `font-size:14px` do `html` e uma terceira em `style` inline; aqui
    o timing tem uma quarta no config. Antes: quatro linguas de duracao
    (tokens, literais em CSS, `transitionDuration` inline em JSX, classes
    Tailwind). Depois: `transitionDuration` e `transitionTimingFunction`
    declarados em `tailwind.config.js` apontando para os tokens
    (`DEFAULT: 'var(--dur-fast)'`, `200`/`300`: `'var(--dur-base)'`,
    `700`: `'var(--dur-slow)'`; `DEFAULT: 'var(--ease-swift)'`,
    `out: 'var(--ease-out-expo)'`) — **um arquivo, alcance total**, exatamente
    a forma da correcao proposta no item 22. Deltas: `duration-200` 200→250 e
    `duration-300` 300→250 cabem no teto de 50ms; o balde grande e o **DEFAULT
    (150→150, zero delta)**, o que torna esta a mudanca de maior alcance e
    menor risco visual do roadmap inteiro. A troca que SE VE e a curva
    (`cubic-bezier(.4,0,.2,1)` → `--ease-swift`) em 274 elementos: **exige
    screenshot antes/depois em `/signup`, `/generate` e dashboard antes de
    commitar**, e por isso e item proprio e nao apendice do dia 12.
    Anotados junto, para nao virarem item novo depois: `/signup` tem **0
    `<video>` e 0 `<img>`** — igual ao `/pricing` (item 22), e pior de
    significado, porque **e o destino do unico CTA que este roadmap declara
    inviolavel** ("Start free → /signup"): a pessoa atravessa uma home feita
    inteira de prova em video e cai numa tela sem nenhuma; e `/signup` roda
    **so em Inter, zero Space Grotesk**, o que fecha a terceira confirmacao do
    padrao monofonte (com `/pricing` e `/history` do item 23) e promove aquilo
    de "candidato a item" para fato do produto — medido hoje no `/generate`:
    **557 de 558 elementos em Inter, 1 em Space Grotesk.** Rollback: git revert.

25. **NOVO (15/08, sprint 18h) — /wall: a pagina da prova ABRE VAZIA, e imprime
    "3 Shorts" em cima do vazio.** Achado na rotacao (`/wall`), medido no DOM de
    producao hoje. **Nao e o item 21 de novo — o item 21 envelheceu e esta errado
    em dois pontos**, e o defeito real e mais grave e mais barato de consertar.
    O que a pessoa ve ao digitar `/wall`: a aba padrao e **"This week"**, que
    renderiza **"No Shorts on the board this week — yet."** — **0 cards, 0 `<img>`,
    0 `<video>` na pagina inteira** — e **na linha imediatamente acima** o contador
    diz **"3 Shorts published by Kineo users · showing the last 7 days"**. Em
    `?range=all` os 3 cards existem de verdade (144 / 25 / 13 views, **182 no
    total**) e tem **9 e 10 dias de idade** — ou seja o filtro de 7 dias esta
    contando certo e a semana esta mesmo vazia; **o defeito e o produto escolher
    como aba padrao justamente a que ele sabe estar vazia, e ainda assim imprimir o
    numero da OUTRA aba em cima dela.** Para um visitante de primeira vez isso nao
    le como "pagina nova", le como **numero que nao se sustenta** — e o paragrafo
    de baixo ainda promete "Nothing is seeded, nothing is staged". A unica pagina
    do site cujo trabalho e ser prova esta, por padrao, provando o contrario.
    Depois: (a) a aba padrao passa a ser a que TEM conteudo (ou "This week" cai
    para "All time" quando a semana volta vazia); (b) **o contador conta o que a
    aba mostra** — "3 Shorts" so aparece onde os 3 aparecem; (c) o empty state da
    semana, quando existir estoque all-time, mostra os cards all-time em vez de um
    paragrafo.
    **As duas correcoes ao item 21 (13/08), porque quem for executa-lo vai
    tropecar nelas:** (1) o `src` **nao e mais `hqdefault` 480x360** — hoje e
    `https://i.ytimg.com/vi/<id>/maxresdefault.jpg`, servido e decodificado em
    **1280x720** nos 3 cards (`naturalWidth` medido). A metade (b) daquele item ja
    esta feita. Consequencia: **o diagnostico "retangulo preto" morreu junto** —
    `maxresdefault` nao tem tarja, entao o `object-fit: cover` numa moldura
    **163x291** ja nao corta barras pretas, corta **imagem util**: de 1280px de
    largura sobrevivem ~405px, isto e **~32% do quadro** — o card mostra uma tira
    central de um enquadramento 16:9 que ninguem compos para 9:16. O conserto certo
    e o (a) do item 21 (moldura 16:9 **ou** backdrop borrado da propria thumb), nao
    o (b). (2) **O comentario do codigo esta mentindo sobre o proprio `src`**:
    `app/wall/page.tsx:186-192` ainda explica em 6 linhas o crop de "hqdefault.jpg
    e 480x360 com o quadro vertical CENTRALIZADO entre barras pretas" — texto que
    descreve uma URL que o arquivo nao usa mais. Quem ler o comentario vai
    "consertar" um problema que nao existe.
    Anotados junto, para nao virarem item novo depois: `/wall` roda **55 de 123
    elementos em `system-ui`** — nao e o padrao monofonte dos itens 23/24 ("so
    Inter"), e pior: **45% da pagina nem chega em Inter**, cai na fonte do sistema
    operacional, enquanto a casa paga o peso de Inter **e** Space Grotesk em toda
    rota; e o azul da marca subiu de **12 elementos (13/08) para 14**, contra o "1
    acento usado raro" do item 3 do sistema deles. Rollback: git revert.

26. **NOVO (16/08, sprint 14h) — /generate: O ACENTO VIROU RUIDO. 89 ELEMENTOS
    USAM O AZUL DA MARCA NA PAGINA ONDE A INTENCAO DE COMPRA NASCE.** Achado na
    rotacao (`/generate`) e medido no DOM de producao hoje, elemento por elemento,
    separando por propriedade: **47 em `color`, 59 em `background`, 38 em `border`,
    10 em `box-shadow`** — 89 elementos distintos numa pagina de **605**, isto e
    **1 em cada 7 elementos da tela carrega o acento**. Acima da dobra sao **21**.
    Para comparar com o que este doc ja mediu: `/wall` tem 14 (item 25), `/pricing`
    tem 23 (item 22) — **`/generate` tem quase 4x o pior caso registrado ate hoje.**
    Porque isso importa mais aqui do que nas outras duas: o item 3 do sistema do
    Higgsfield e "**1 acento usado raro**" (o lime deles aparece em badge e botao,
    nada mais) e a razao nao e estetica, e funcional — **quando tudo e destaque,
    nada e destaque**, e a pagina perde a capacidade de dizer "clique AQUI". E
    `/generate` e, pela medicao de aquisicao da sprint das 13h de hoje, **onde a
    intencao de compra nasce**: 17 pessoas em `generate_step_1` contra 8 na pagina
    de precos. A tela que mais precisa de UM ponto focal e a que tem 89.
    Os dois piores ofensores, medidos: **duas `div.fixed.rounded-full` de 600x600 e
    500x500 com fundo azul** (glows de ambiente presos no viewport) — sozinhas elas
    banham a tela inteira no acento antes de qualquer conteudo aparecer.
    Antes: 89 elementos com o acento, 21 acima da dobra, 2 glows fixos de 600x600 e
    500x500. Depois: acento reservado a **acao e foco** (CTA primario, estado ativo,
    focus ring) — alvo <= 12 acima da dobra; os glows de ambiente saem do azul e vao
    para neutro quente ou perdem opacidade ate nao competirem com o CTA; badge e
    chip passam a usar `--surface-2` + `--text-2`, como o badge-gray #424242 deles.
    **Fazer com screenshot antes/depois obrigatorio e um elemento por vez** — esta e
    a unica categoria de mudanca deste roadmap que altera a APARENCIA e nao so a
    disciplina, entao ela e proposta ao fundador antes de virar commit.
    Anotados junto, para nao virarem item novo depois: `/generate` tem **16 raios
    distintos** e os mais frequentes fora da escala sao `10.5px` (23x), `7px` (15x)
    e `9999px` (18x) — ou seja **a pagina inteira e Tailwind a 87,5%**, terceira
    confirmacao do item 22 (com `/pricing` e `/history`); e a fonte fecha o padrao
    monofonte pela quarta vez: **604 de 605 elementos em Inter, 1 em Space Grotesk**.
    Rollback: git revert.

    **EMENDA AO ITEM 23 (medida hoje, 16/08) — a doenca do `/history` esta tambem
    no `/generate`, e o item 23 precisa cobrir as duas paginas.** Medido no DOM de
    producao: `/generate` tem **11 `<video>`, `preload="metadata"` em 11/11 e
    `poster` em 0/11**. E exatamente o quadro do item 23 (100 videos la), em escala
    menor e em lugar pior: **a pagina de trabalho do cliente tambem abre com
    retangulos pretos esperando metadata**. Nao vira item 26-bis: quem executar o
    item 23 executa a MESMA correcao (`preload="none"` + montagem no
    IntersectionObserver + `poster` obrigatorio) nas duas paginas, senao a casa
    conserta metade do problema e fecha o item.

27. **NOVO (16/08, sprint 18h) — A TELA DO VIDEO PRONTO E O UNICO MOMENTO DE
    DOPAMINA DO PRODUTO, E ELA COMECA COM UM RETANGULO PRETO DE 460x818.** Achado na
    rotacao (depois do `/generate` vem a tela do video pronto) e medido no codigo de
    `app/(dashboard)/generate/GenerateClient.tsx` (13.372 linhas; o bloco
    `phase === 'done'` comeca na linha 9297). A moldura do resultado tem
    `aspectRatio 9/16`, `width: min(460px, 90vw)`, `background: '#000'` e dentro dela
    um `<video autoPlay preload="metadata">` **sem `poster`**. Entre o momento em que
    o cartao aparece e o primeiro byte do MP4 chegar do CDN, a pessoa olha para um
    **retangulo preto** — e o comentario do `Push #095` no proprio arquivo admite que
    o Backblaze devolve **503 enquanto o MP4 novo propaga**, ou seja o caso lento nao
    e hipotese, e o caso conhecido. **A casa ja resolveu isso em toda outra
    superficie**: a galeria da home, `/examples` (item 19) e o item 23 dizem
    "poster-first, o poster e o primeiro paint". A unica tela onde o cliente ve o
    trabalho que acabou de pagar e a que nao tem poster.
    Contagem no HEAD de 16/08 nesse arquivo: **9 `<video>`, `poster=` em 0/9,
    `preload="none"` em 0/9**, 1 `autoPlay`, e **1 unica** mencao a
    `Save-Data`/`prefers-reduced-motion` em 13.372 linhas.
    **Nuance que explica a divergencia entre o grep e o DOM, e que vale para o teste 7
    do dia 20:** a auditoria das 14h mediu **11 `<video>` com `preload="metadata"`
    11/11** no DOM, mas o grep acha `preload="metadata"` **2 vezes** no arquivo — porque
    **`metadata` e o default do browser**, entao os 7 tags que nao declaram `preload`
    nenhum reportam `"metadata"` no DOM. **O grep do teste 7 pode dar verde com o
    produto inteiro baixando metadata.** O teste precisa ser lido no DOM, nunca no
    repo — mesma familia do item 22 (o raio que nao passa por `border-radius:`) e do
    item 24 (a curva que nao esta em arquivo nenhum).
    Antes: moldura preta ate o CDN responder, sem poster, sem skeleton, com autoplay
    incondicional. Depois: (a) **`poster` do proprio video** — a coluna
    `thumbnail_url` existe desde o commit #320 e ja e usada como fundo do botao de play
    do `/history`, entao o asset ja esta pago; enquanto ela for nula, o **shimmer 9:16
    do dia 8** no lugar do preto (o roadmap ja manda "skeleton, nunca spinner" — aqui
    nao ha nem um nem outro, ha vazio); (b) `autoPlay` guardado por **Save-Data/2g**,
    que e a unica regra do roadmap escrita como inviolavel e que nao esta sendo
    cumprida justamente onde o arquivo pesa ~28MB.
    Porque: e o item 9 do teste do dia 20 ("o momento video pronto tem cerimonia") —
    a cerimonia do dia 7 (o check que se desenha + o pulso de glow azul) esta la e
    **funciona**, e ela e disparada em cima de um buraco preto. A casa construiu a
    festa e esqueceu de acender a luz.
    Anotados junto, para nao virarem item novo depois: o bloco do `done` usa
    **6 classes `rounded-*`** (3 `rounded-2xl` + 3 `rounded-xl`), quarta confirmacao do
    item 22; e o **azul aparece 14 vezes so nesse bloco** (o arquivo inteiro tem **215**
    ocorrencias de `#2997ff`/`41,151,255`) — mas aqui, ao contrario do item 26, **a
    maior parte e a cerimonia protegida do dia 7 e NAO deve sair**; quem executar o
    item 26 precisa tratar o bloco `phase === 'done'` como excecao declarada.
    **Fora de escopo de UI, so registrado para o fundador olhar:** entre o titulo
    "Your video is ready" e o player existe um paragrafo de **creditos e plano**
    ("You have X credits left — about N more AI videos... Free Fast includes up to 3
    watermarked previews per 24 hours"). Sprint de UI nao toca copy de oferta, entao
    **nada foi feito** — mas o registro fica: no unico segundo em que o produto
    entrega o que prometeu, a linha imediatamente acima da prova fala de quanto ainda
    resta na carteira. Rollback: git revert.

28. **NOVO (17/08, sprint 14h) — /studio: A PORTA PRINCIPAL NOVA NASCEU FORA DE
    TODOS OS TOKENS, E ELA TEM UMA **QUINTA** LINGUAGEM DE TIMING QUE NENHUM ITEM
    DESTE DOC TINHA VISTO.** Achado na rotacao (o `/generate` deixou de ser a sala
    de chegada no commit `613ca3e` — chegada de mao vazia agora redireciona pro
    `/studio`, entao a pagina que este roadmap vinha medindo ha 3 sprints **nao e
    mais a porta**) e medido no DOM de producao hoje. Numeros de `/studio`,
    367 elementos numa tela so:
    - **16 raios distintos** — `10px` (14x), `8px` (12x), `14px` (12x), `999px` (10x),
      `13px` (6x), `6px` (5x), `16px` (4x), `5px`, `99px`, `9999px`, `10.5px`, `7px`,
      `9px`, `18px` e duas formas compostas. So **4 elementos** passam por classe
      Tailwind, entao o item 22 (feito hoje) **quase nao a alcanca**: aqui o raio e
      px literal em `style` inline, a terceira lingua do item 22.
    - **QUINTA LINGUAGEM DE TIMING: `ease` puro em 65 dos 73 elementos animados.**
      O item 24 catalogou quatro (tokens, literais em CSS, `transitionDuration` em
      JSX, classes Tailwind com `cubic-bezier(.4,0,.2,1)`). `/studio` roda em
      **`ease`** — a palavra-chave DEFAULT do CSS, que aparece quando alguem escreve
      `transition: all .16s` sem curva — em `ease` (37), `ease, ease` (17) e
      `ease, ease, ease` (11); so 8 elementos usam a curva do Tailwind e **zero**
      usam `--ease-swift`. E sao **5 duracoes** (0.15 / 0.16 / 0.18 / 0.3s), nenhuma
      igual a `--dur-fast/base/slow`. O teste 4 do dia 20 continua sem enxergar isso:
      `ease` nao aparece em grep de `cubic-bezier` nem de `--ease-`.
    - **O ACENTO OUTRA VEZ, E PIOR QUE O `/generate` DO ITEM 26: 39 elementos com o
      azul em 367 (1 em cada 9,4) e os 39 ACIMA DA DOBRA** — porque o `/studio` e
      uma tela unica, entao nao existe "abaixo da dobra" onde diluir. O item 26
      mediu 21 acima da dobra no `/generate`; a tela que substituiu ele tem 39.
    - **A doenca dos itens 23 e 27 nasceu junto com a pagina: 6 `<video>` de 192x343,
      `poster` em 0/6, `preload="metadata"` em 6/6 e `readyState 4` em 6/6** — isto e,
      os seis MP4 baixaram INTEIROS no load, abaixo da dobra, sem um poster no
      caminho. O truque `#t=0.1` no src esta la tentando fazer papel de poster: e a
      confissao de que o poster faz falta.
    - **A unica boa noticia, e ela e grande: `/studio` QUEBROU O PADRAO MONOFONTE.**
      38 dos 367 elementos em Space Grotesk (o `/pricing`, `/history`, `/signup` e
      `/generate` mediram zero nos itens 23 e 24). A segunda familia finalmente
      trabalha dentro do produto.
    Antes: a porta principal do produto fala 16 raios, 5 duracoes, uma curva default
    e 39 acentos numa tela. Depois: `/studio` passa pelos tokens como a landing ja
    passou — raios para a escala, `transition` com `--dur-*`/`--ease-swift`,
    `poster` + `preload="none"` + IntersectionObserver nos 6 videos (a MESMA correcao
    do item 23, que agora tem tres paginas: `/history`, `/generate` e `/studio`), e o
    acento reduzido a acao e foco (alvo <= 12, mesmo alvo do item 26).
    Porque: e a primeira tela que todo cliente novo ve desde `613ca3e`, e ela e a
    unica pagina do produto que nunca passou por uma sprint de UI. Enquanto o roadmap
    medir `/generate`, ele esta medindo uma sala que o fundador ja esvaziou.
    Anotado junto, para nao virar item novo depois: o breadcrumb do `/studio` imprime
    **"Kineo / Dashboard"** numa pagina cujo H1 e "Studio" — o par que faltou quando a
    rota virou a porta principal. Rollback: git revert.

29. **NOVO (17/08, sprint 18h) — O POSTER QUE QUATRO TELAS PEDEM NAO EXISTE:
    `thumbnail_url` E NULL EM 1.129 DE 1.129 LINHAS.** Achado executando o item 23 e
    confirmado no banco, nao no DOM — e por isso ele e diferente de tudo que este doc
    tem ate aqui: **nao e um defeito de UI, e a dependencia que trava a metade
    "poster" de tres itens ao mesmo tempo** (23, 27 e 28).
    Numeros do banco, hoje: `videos` tem **1.129 linhas, `count(thumbnail_url)` = 0**;
    **1.125 estao `completed`** e nenhuma tem thumbnail; **213 foram criadas nos
    ultimos 7 dias** e nenhuma tem thumbnail. Nao e backlog historico que ficou para
    tras — **o pipeline nunca gravou essa coluna, nem uma vez, nem hoje.**
    E o codigo pede por ela em toda parte, achando que ela chega:
    `app/(dashboard)/library/LibraryClient.tsx:74`, `my-videos/MyVideosClient.tsx:480`
    e `studio/StudioClient.tsx:288` escrevem **`poster={v.thumbnail_url ?? undefined}`**
    — tres telas com a linha certa, resolvendo para `undefined` em 100% dos casos —
    e `MyVideosClient.tsx:466` monta um `background: url(${v.thumbnail_url})` que
    nunca tem URL. O comentario do `GenerateClient.tsx:11002` ja suspeitava
    ("`thumbnail_url` is the Creatomate snapshot, which is often null"): **nao e
    "often null", e sempre null.**
    Medido em `/library` hoje (a tela mais nova da casa, primeira vez que ela entra
    na rotacao): **6 `<video>`, `poster` em 0/6, `preload="metadata"` em 6/6, 0
    `<img>` na pagina inteira** — a estante que existe para o cliente ver o acervo
    dele mostra seis retangulos esperando MP4.
    Antes: quatro telas pedem um poster que o pipeline nunca produziu, e cada uma
    resolve o vazio de um jeito (preto, `#t=0.1`, gradiente). Depois: **o render
    grava `thumbnail_url`** (o frame ja existe — e o mesmo que o `#t=0.1` decodifica
    no cliente hoje, so que pago 100 vezes, no browser de cada cliente, em vez de uma
    vez no servidor) e as quatro telas passam a ter primeiro paint sem tocar no MP4.
    **DEPENDENCIA DECLARADA, e ela e de pipeline, nao de UI** — sprint de UI nao
    escreve no banco nem mexe em rota de render. Enquanto isso nao existir, os itens
    23, 27 e 28 so podem entregar a metade `preload`/`IntersectionObserver`, que e o
    que o item 23 fez hoje. **Este e o item que o fundador precisa despachar para uma
    sprint de produto**; a sprint de UI fica pronta para consumir a coluna no dia
    seguinte (a linha `poster={...}` ja esta escrita em 3 dos 4 lugares).
    Anotados junto, para nao virarem item novo depois: `/library` tem **9 raios
    distintos e 5 fora da escala** (`10px` 23x, `8px` 17x, `5px`, `9px`, `16px`);
    roda na **QUINTA linguagem de timing do item 28** — `ease` puro em **55 de 65**
    elementos animados, contra 10 na curva do Tailwind e **zero** em `--ease-swift`,
    com 5 duracoes (0.15/0.16/0.18/0.3s), nenhuma igual aos tokens; e tem **23
    elementos com o acento, os 23 acima da dobra** (mesmo perfil do `/studio`, item
    28 — tela unica, sem "abaixo da dobra" onde diluir). A boa noticia repete a do
    `/studio`: **4 elementos em Space Grotesk**, entao as telas novas da casa
    nasceram fora do padrao monofonte. Rollback: n/a (item de pipeline).

30. **NOVO (18/08, sprint 14h) — /images VENDE SEIS MOTORES DE IMAGEM COM UM
    DROPDOWN DE TEXTO: A PAGINA INTEIRA TEM 1 `<img>`, E ELA E DO PROPRIO
    CLIENTE.** Achado na rotacao — `/images` e `/audio` entraram em producao em
    17-18/08 e nunca passaram por este doc. Medido no DOM de producao hoje
    (viewport 1920x911): **339 elementos, 1 `<img>`, 0 `<video>`**. O unico `<img>`
    e uma imagem que ESTE usuario ja gerou, dentro de "My Images" — ou seja **para
    quem chega com a conta vazia, a tela que vende geracao de imagem nao mostra
    nenhuma imagem**. O subtitulo promete "Type it. See it. Six image engines, one
    screen" e o seletor de motor e um dropdown de texto ("FLUX Dev") com um
    quadradinho de sigla; o cliente escolhe entre schnell/dev/seedream/grok/recraft/
    nanobanana — que custam de 1 a 5 creditos — **sem ver um pixel do que cada um
    faz**, e o custo so aparece depois que ele escolhe.
    Isso e exatamente a licao que a casa ja aprendeu e ja cobrou: em 15/08 a home
    trocou o composer por uma **vitrine de motores** com 4 clipes curados girando
    por card (`EngineCycleCard` + `lib/engineWall.ts`), e o placar do dia foi
    **14 eventos de checkout, recorde contra 2-4/dia**. O Higgsfield faz o mesmo —
    **o modelo nunca e vendido pelo nome, e vendido pelo frame**. `/images` e a
    unica superficie onde o output E uma imagem estatica, isto e, onde a prova e
    mais barata que em qualquer outro lugar do produto (nada de MP4, nada de
    poster, nada de `preload`), e e a que nao tem prova nenhuma.
    Antes: 6 motores num dropdown de texto, 1 `<img>` na pagina, 0 amostra por
    motor, custo revelado so apos a escolha, "My Images" vazio para conta nova.
    Depois: (a) cada motor carrega **uma miniatura curada gerada por ele mesmo**
    (assets estaticos em `public/`, `loading="lazy"`, `width`/`height` declarados
    para CLS 0, curadoria do fundador como em `engineWall.ts` — natureza:
    raios/chuva/mar/aventura, fogo fora); (b) o **custo em creditos aparece junto
    da amostra**, na hora de escolher, nao depois; (c) o empty state de "My Images"
    mostra 3 exemplos curados com o prompt que os gerou, que e ao mesmo tempo prova
    e tutorial (1 clique = prompt no campo). **Nao toca em preco, credito nem
    entitlement — so mostra o numero que a tabela ja cobra.** Rollback: git revert.
    Anotados junto, para nao virarem item novo depois: `/images` tem **12 raios
    distintos** e os piores fora da escala sao `10px` (19x), `5px` (5x) e `16px`
    (4x) — quarta confirmacao do item 22 numa tela nova; roda na **QUINTA linguagem
    de timing do item 28** (`ease` puro em **111** elementos contra 10 na curva do
    Tailwind e **zero** nos tokens), com 4 duracoes (0.15/0.16/0.18/0.3s); tem **21
    elementos com o acento e os 21 acima da dobra** (mesmo perfil de `/studio` e
    `/library` — tela unica); e **19 elementos em Space Grotesk**, entao as telas
    novas seguem fora do padrao monofonte, o que e bom. O unico `<img>` da pagina
    nao declara `width`/`height` nem `loading` — quando "My Images" encher, cada
    linha nova e um candidato a shift.
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

### 18/08 (sprint 14h) — ITEM 24: A CURVA DE TERCEIRO SAIU DE 41 ELEMENTOS EM DUAS PAGINAS COM UM ARQUIVO, E O TSC NAO E O PORTAO DESTE ARQUIVO (PROVADO, NAO SUPOSTO)

**1. Auditoria do item anterior (item 23, /history) — EM PRODUCAO, e PASSOU ACIMA DO
PREVISTO.** `git ls-remote origin main` e o HEAD local sao o mesmo commit
(`41b4baa`) e o `HistoryCardFrame` esta no ar. Medido no DOM de
`www.usekineo.com/history` hoje, com 100 videos na conta:
- **100 cards, 9 `<video>` no documento.** Antes eram **100 de 100**; agora so montam
  os que entram no viewport mais o `rootMargin` de 300px — **91 elementos de midia
  simplesmente nao existem mais no DOM**, e nao apenas "nao baixam".
- **Zero retangulo preto: 100 de 100 caixas com o gradiente da marca.** Os 9 montados
  tem `#t=0.1` em 9/9 e `preload="metadata"` em 9/9, exatamente como escrito.
- **Nada regrediu:** as caixas 9:16 continuam identicas, o selo `✨ HD` e o botao de
  play seguem por cima, e nao ha erro de console proprio da pagina.
- **Limite honesto, e e o mesmo da sprint de ontem:** a aba roda em
  `visibilityState: "hidden"`, entao `readyState` ficou 0 em 9/9 e o transfer de
  `.mp4` deu **0 byte** — isso **nao** prova economia de rede nem que o frame pinta;
  prova so a estrutura. O que sustenta o item e a contagem de elementos (100→9), que
  independe de visibilidade.
- **ACHADO DA AUDITORIA, e ele NAO e do item 23: a producao lanca React #425
  (hydration text mismatch) e #422 (erro ao hidratar Suspense) em TODA rota
  medida** — `/history` as 14:10:17 e `/pricing` as 14:10:37, mesmo chunk
  (`fd9d1056`), mesma pilha. **Nao e regressao da sprint** (aparece numa pagina que
  nao tem `HistoryCardFrame` nenhum, e o `armed` nasce `false` nos dois lados), e por
  isso nao virou conserto de sprint de UI — mas e um erro global de layout que
  derruba a hidratacao e precisa de dono. Candidato obvio pela forma: texto derivado
  de `Date.now()` renderizado no servidor e recalculado no cliente.

**2. O ITEM DA SPRINT — item 24 (`tailwind.config.js`: timing e curva apontando para
os tokens), e o mapa saiu diferente do que o backlog escreveu em 15/08, com motivo.**
- **O que entrou:** `theme.extend.transitionDuration` (`DEFAULT`, `200`, `300`) e
  `theme.extend.transitionTimingFunction` (`DEFAULT`, `out`) — **um arquivo, 47
  linhas, das quais 39 sao o comentario que explica o mapa**.
- **`700` FICOU DE FORA, contra o que o backlog propunha.** `duration-700` tem **1
  uso** (`components/ViralScore.tsx:208`, a barra que cresce na frente da pessoa) e
  mapea-lo para `--dur-slow` seria **-300ms, seis vezes o teto de 50ms** que a casa
  se impos em 15/08. Isso nao e consolidacao, e redesign — decisao do fundador.
- **`200` foi para `--dur-fast` (-50ms) e nao para `--dur-base` (+50ms)**, porque a
  **regra deterministica** escrita no `globals.css` em 15/08 (<=0.2s = fast) e
  posterior ao texto do item e vence o julgamento por papel. Os dois deltas cabem no
  teto.
- **`ease-in-out` (18 usos) fica no default, declarado:** a casa **nao tem token de
  in-out**; forcar `--ease-swift`, que e curva de saida, trocaria o comportamento de
  18 elementos sem token que justifique. Fica escrito como o resto medido do item.
- **O `DEFAULT` de duracao move ZERO milissegundo** (150ms → `--dur-fast`, que e
  150ms) e cobre o balde grande: **289 ocorrencias de `transition*` em `app/` +
  `components/`**. A mudanca de maior alcance do roadmap nao muda um frame de
  animacao — muda so quem manda nela.

**3. Antes→depois medido em PRODUCAO, com a folha de teste no body (metodo da casa,
14/08).** A regra emitida pelo build novo foi injetada na producao ao vivo:
- **`/pricing`: 31 elementos animados, e 31 de 31 estavam na curva
  `cubic-bezier(.4,0,.2,1)` — que nao existe em arquivo nenhum nosso.** Depois:
  **31 de 31 em `--ease-swift`, zero na curva de terceiro**, e as duracoes caem de
  **2 valores (0.15s e 0.2s) para 1 (0.15s)**.
- **`/studio`: os 10 elementos na curva do Tailwind vao a ZERO**; os outros **132
  rodam em `ease` puro**, que e a QUINTA linguagem do item 28 (styled-jsx) e **este
  item nao alcanca** — dito na cara para nao virar vitoria inflada.
- **`CLS = 0`** por `PerformanceObserver` com `buffered:true`, e **as 12 caixas
  medidas ficaram byte a byte identicas** antes e depois — timing e curva nao entram
  em layout, por construcao. **LCP intocado:** o poster segue sendo o primeiro paint;
  nenhuma regra nova toca `<img>`, `<video>` ou o critical path.

**4. Rigor — e aqui a sprint descobriu que estava prestes a mentir para si mesma.**
- **`tsc --noEmit` EXIT=0** — mas **o tsc NAO e o portao deste arquivo, e isso foi
  provado, nao suposto**: injetei `const _falsifyUISprint: number = "not a number"`
  **dentro do `tailwind.config.js`** e o **tsc continuou EXIT=0** (o `tsconfig` nao
  inclui `.js` de configuracao). Se a sprint tivesse parado no "tsc verde", teria
  declarado verificado um arquivo que o verificador nunca leu.
- **O portao real e o build do Tailwind, e ele foi falsificado de verdade:** troquei
  `300: 'var(--dur-base, 250ms)'` por `300: '9999ms'`, limpei o cache do jiti e o CSS
  emitido virou **`.duration-300 { transition-duration: 9999ms }`** → restaurei →
  **md5 `2b64d457…` identico ao original** → CSS emitido **byte a byte igual** ao
  verificado. Isto e, o build le ESTE arquivo e obedece a ESTES valores.
- **Anomalia resolvida em vez de anotada:** o erro de sintaxe injetado **nao** quebrou
  o build do Tailwind (EXIT=0, CSS correto) mesmo com `node_modules/.cache` apagado.
  Nao e fallback silencioso: o Tailwind carrega o config via **jiti**, que aceita
  sintaxe TypeScript e **remove a anotacao de tipo**. Por isso a falsificacao valida
  aqui e semantica (valor errado), nunca sintatica.
- **CSS emitido conferido classe a classe** com o binario do repo (`tailwindcss
  3.4.19`) num config-espelho: `.transition`, `.transition-all` e `.transition-colors`
  saem com `var(--ease-swift, …)` + `var(--dur-fast, 150ms)`; `.duration-200` →
  `var(--dur-fast, 150ms)`; `.duration-300` → `var(--dur-base, 250ms)`; `.ease-out` →
  `var(--ease-out-expo, …)`; **`.duration-500`, `.duration-700`, `.ease-in`,
  `.ease-in-out` e `.ease-linear` intactos**, como projetado.
- **EOL conferido no HEAD por arquivo:** `tailwind.config.js` e **CRLF 100%** no HEAD
  (91/91) e no disco (138/138) — as 47 linhas novas entraram em CRLF, e o
  `git diff --stat` mostra **47 insercoes e 0 delecoes**, sem o arquivo inteiro virar
  diff. Este doc e **LF, 0 CR** nos dois lados.

**5. Revisao adversarial (2x, a 2a cacando defeito na propria mudanca).**
- **`prefers-reduced-motion` continua vencendo:** o bloco global do `globals.css`
  (linha 604) usa `transition-duration: 0.01ms !important`, e **nenhuma classe
  utilitaria nova tem `!important`** — conferido que o repo nao usa nenhuma variante
  `!duration-*`/`!transition*`/`!ease-*`. O desligador segue soberano.
- **Ninguem le o config em runtime:** grep por `resolveConfig`/`require('tailwind
  .config')` em `app/`, `components/` e `lib/` **nao acha nada** — a mudanca nao
  vaza para JS, so para CSS.
- **Coreografia com `setTimeout` nao existe nos alvos:** os 14 usos de
  `duration-200`/`duration-300` foram lidos um a um — sao hover de card, escala de
  icone, opacidade de thumb e o slide do `Sidebar`; **nenhum tem JS esperando o fim da
  transicao** para desmontar. O pior caso e um drawer 50ms mais rapido.
- **`duration-*` nao toca animacao:** confirmado no CSS emitido que a chave so gera
  `transition-duration` — `spin`, `btn-pulse`, `shimmer` e o resto do ambiente ficam
  onde estavam (a regra do dia 12: ambiente nao e escala de UI).
- **DEFEITO QUE A 2a PASSADA ACHOU:** `ease-out` → `--ease-out-expo` **e a unica parte
  visivel deste item** — sao **22 usos**, e `expo` (`.16,1,.3,1`) chega bem mais rapido
  que `cubic-bezier(0,0,.2,1)`. Nao ha como medir isso por DOM (a curva so aparece em
  movimento). **Fica declarado como a linha para o fundador olhar depois do deploy**;
  se destoar, o rollback e uma linha (apagar a chave `out`), sem tocar no resto.

**6. Realimentacao do backlog — ITEM 30 (`/images`).** A rotacao chegou nas telas que
entraram em producao em 17-18/08 e nunca passaram por este doc. `/images` tem **339
elementos e 1 `<img>`** — e o unico `<img>` e uma imagem que o proprio usuario gerou:
**para conta nova, a tela que vende geracao de imagem nao mostra imagem nenhuma**, e
os 6 motores (1 a 5 creditos) sao escolhidos num **dropdown de texto**, sem uma
amostra do que cada um produz. E a licao que a home ja cobrou em 15/08 (vitrine de
motores → 14 checkouts, recorde) aplicada ao lugar onde a prova e **mais barata que em
qualquer outro** — imagem estatica, sem MP4, sem poster, sem `preload`. Detalhe,
numeros e o "depois" no item 30.

**Proximo em ordem:** item 25 (`/wall` abrindo vazio com o contador da outra aba) —
itens 21, 22, 23 e 24 estao fechados; 26 e 27 pedem aprovacao do fundador porque mudam
aparencia, e 29 e de pipeline. [KINEO-UI-DIARIO-2026-08-18]

### FECHAMENTO DO DIA — 17/08 (3 linhas, escritas pela sprint das 18h)

1. **O dia 17/08 esta 100% no ar e nada regrediu.** `origin/main` = HEAD local =
   `85d1fad`, e o item 22 (raios do Tailwind apontando para os tokens) foi medido em
   producao: `/pricing` caiu de **5 raios distintos para 3** e de **17 elementos fora
   da escala para 0** — melhor do que a propria sprint das 14h previu (ela projetava
   17→3) — com **CLS 0** e zero erro de console. **Nao ha nada seu parado para
   empurrar do lado de UI.**
2. **A sprint das 18h fez o item 23 (/history): os 100 videos nao baixam mais de
   uma vez** — cada card monta no `IntersectionObserver` com gradiente da marca no
   lugar do retangulo preto. **Um arquivo, rollback trivial, sem push** (o push e seu,
   como sempre).
3. **O achado do dia e de produto, nao de UI, e ele vale dinheiro: `thumbnail_url` e
   NULL em 1.129 de 1.129 videos.** Quatro telas suas (`/library`, `/my-videos`,
   `/studio`, `/generate`) ja pedem `poster={thumbnail_url}` e recebem `undefined`
   sempre — ou seja **cada cliente paga, no proprio browser, para decodificar um frame
   que o servidor podia ter gravado uma vez**. Isso trava a metade "poster" de tres
   itens do roadmap de uma so vez. Virou o **item 29** e precisa de uma sprint de
   pipeline sua para destravar; a UI ja esta escrita esperando a coluna.

### 17/08 (sprint 18h) — O ITEM 23 ENTREGOU METADE, PROVOU QUE A OUTRA METADE NAO EXISTE, E DERRUBOU A PROPRIA EVIDENCIA QUE O JUSTIFICAVA

**1. Auditoria do item anterior (item 22, raios do Tailwind) — EM PRODUCAO, e PASSOU
ACIMA DO PREVISTO.** O push saiu: `origin/main` e o HEAD local sao o mesmo commit
(`85d1fad`), e `git show origin/main:tailwind.config.js` traz o bloco
`theme.extend.borderRadius` apontando para os tokens. Medido no DOM de
`www.usekineo.com/pricing` hoje, com a folha real da producao:
- **`rounded-lg` e `rounded-md` pintam 8px, `rounded-xl` e `rounded-2xl` 13px,
  `rounded-3xl` 22px, `rounded-full` 9999px** — isto e, as cinco classes mapeadas
  agora leem os tokens no ar, e o `full` continua fora do mapa como foi decidido.
- **A pagina inteira caiu para 3 raios distintos (13px, 8px, 9999px) e ZERO elementos
  fora da escala.** A sprint das 14h previu "5→4 distintos e 17→3 fora da escala"
  medindo por injecao de folha; no deploy real o resultado foi melhor — os 3 `14px`
  que ela deu como sobra eram `rounded-2xl`, nao literais de CSS.
- **Nada regrediu:** **CLS 0** (`PerformanceObserver` com `buffered:true`), zero erro
  de console, TTFB 9 ms no documento ja aquecido.
- **Limite honesto da medicao:** a aba roda em `visibilityState: "hidden"`, entao
  `largest-contentful-paint` nao registra entrada nenhuma — **LCP nao foi medido
  hoje**, e nao foi. `border-radius` nao entra em layout nem no critical path, entao
  o risco de LCP era nulo por construcao; mas fica escrito que o numero nao existe.

**2. O ITEM DA SPRINT — item 23 (/history), e ele saiu diferente do que estava
escrito, em dois pontos.**
- **O que entrou:** `HistoryCardFrame` em `app/(dashboard)/history/HistoryClient.tsx`.
  O `<video>` do card so monta quando o card entra no viewport (`IntersectionObserver`,
  `rootMargin: '300px 0px'`, `disconnect()` no primeiro intersect); ate la o box e um
  gradiente da marca (`#141416 → #1d1d1f`), **nunca mais o `#000`**; o frame entra em
  crossfade `--dur-base`/`--ease-swift` no `loadeddata`. Save-Data e 2g nao montam
  nada. Sem `IntersectionObserver`, monta tudo — degradacao para o comportamento de
  antes, que e o estado conhecido.
- **`#t=0.1` no src, e nao e enfeite:** `preload="metadata"` so garante **readyState 1
  (HAVE_METADATA)** pela especificacao, e em readyState 1 **nao ha frame decodificado
  para pintar** — sem o fragmento, `loadeddata` poderia nunca disparar e o card ficaria
  no gradiente para sempre. O fragmento e resolvido no cliente (nao vai para o
  servidor, nem para o `fetch` do service worker), entao a URL requisitada e a mesma.
  E o mesmo truque que o `/studio` ja roda em producao contra este storage — o item 28
  o registrou como "confissao de que o poster faz falta", e e: aqui ele e a muleta
  consciente enquanto o item 29 nao existe. **Ganho de tabela: no iOS Safari, onde o
  card hoje e preto, o `#t=` e justamente o padrao que faz o frame aparecer.**
- **A metade (b) do item — `poster={thumbnail_url}` — E IMPOSSIVEL, e o item mentia
  sobre isso desde 14/08.** Ele afirmava "a coluna ja existe (commit #320) ... o asset
  ja esta pago". Medido no banco hoje: **`count(thumbnail_url)` = 0 de 1.129**, 0 de
  1.125 `completed`, 0 de 213 criados nos ultimos 7 dias. Nao ha nada pago. Virou o
  **item 29**, que e de pipeline e nao de UI.
- **A metade (c) (paginacao acima de ~24 cards) fica aberta de proposito** — e
  arquitetura de dados, nao UI, e nao cabe em "1 item isolado com rollback trivial".

**3. Revisao adversarial (2x, a 2a cacando defeito na propria mudanca) — e a 2a
achou.**
- **CLS: zero por construcao.** O componente e `position:absolute; inset:0` dentro do
  box 9:16 (`paddingTop: 177.78%`) que ja existia; o `<video>` que saiu tinha
  `height:100%` num pai de altura definida. **Nenhuma caixa muda de tamanho, e o
  numero de caixas em fluxo cai de 1 para 0.**
- **z-index / modais: nada tocado.** O overlay escuro, o botao de play e o selo
  `✨ HD` (`zIndex: 2`) sao irmaos POSTERIORES no DOM e continuam por cima; o lightbox
  e `fixed z-index 80` e o card nao cria contexto de empilhamento novo.
- **A armadilha do item 18 foi conferida de proposito:** o container novo tem
  `position:absolute` e **nenhum `transform`/`filter`/`will-change`** — `absolute`
  sozinho **nao** cria bloco de contencao para descendente `position:fixed`, e nao ha
  descendente `fixed` aqui. O acidente que quase quebrou o interstitial do checkout no
  dia 18 nao se repete.
- **Hidratacao:** `armed` nasce `false` no servidor e no cliente — o primeiro render e
  identico dos dois lados, sem mismatch.
- **DEFEITO QUE A 2a PASSADA ACHOU, e a decisao tomada:** em **Save-Data/2g o card
  perde o frame que hoje ele tem** — antes o `preload="metadata"` pintava (quando
  pintava), agora fica so o gradiente. O `HeroGallery` cai para o **poster** nesse
  caso; aqui **nao existe poster** (item 29), entao "respeitar Save-Data" e "mostrar
  imagem" ficaram em conflito direto. Ficou o gradiente: o cliente pediu economia
  explicitamente, o card continua com titulo, data, selo de qualidade e o botao de
  play, e o clique abre o lightbox que toca. **Fica registrado como custo consciente,
  e ele desaparece sozinho no dia em que o item 29 existir.**
- **Limite conhecido:** quem rolar os 100 cards ate o fim termina com os 100 montados
  (nao desmontamos ao sair da tela, para nao piscar no scroll de volta). O estado final
  e o de antes; o ganho e todo no comeco, que e onde a pessoa esta.
- **prefers-reduced-motion:** o crossfade novo e `transition` em `style` inline, e o
  bloco `@media (prefers-reduced-motion: reduce)` do `globals.css` (linha 604) usa
  `transition-duration: 0.01ms !important` — **declaracao `!important` de folha vence
  `style` inline sem `!important`**, entao o desligador global ja cobre o codigo novo
  sem uma linha a mais. O frame continua aparecendo; so a transicao morre.

**4. A CONTAMINACAO — a evidencia central do item 23 estava errada, e a sprint
anterior ja tinha escrito o aviso.** O item dizia, desde 14/08: "`readyState 0` e
`networkState 2` (NETWORK_LOADING) em 100/100 dois segundos depois do load", e concluia
starvation de conexao — 100 requisicoes brigando pelo mesmo pool. Refeito hoje em
producao, **e falso**:
- A aba estava em `visibilityState: "hidden"`, e o Chrome **congela o preload de midia
  em aba de fundo**. Aos **292 segundos** de vida da pagina: `readyState 0` em 100/100,
  `networkState 2` em 100/100 e **`performance.getEntriesByType('resource')` com ZERO
  requisicao de `.mp4`**. Se fosse disputa de conexao, os bytes existiriam.
- **Prova direta, e ela e definitiva:** um `load()` explicito num card **visivel na
  viewport**, com a aba escondida, ficou **5 segundos em `readyState 0`, `buffered` 0,
  0 byte transferido** — enquanto um `fetch` com `Range: bytes=0-1` **no mesmo arquivo,
  na mesma aba, no mesmo instante** respondeu **206 imediatamente**. Rede livre, CDN
  livre; o elemento de midia e que estava suspenso.
- **E o Diario de HOJE, sprint das 14h, ja tinha escrito a armadilha** — para
  `loading="lazy"` e imagens, com a frase "ler `visibilityState` antes de acreditar em
  qualquer medicao". **A sprint das 18h pisou nela mesmo assim, uma sprint depois, com
  `<video>` no lugar de `<img>`.** A regra sobe de "imagem lazy" para **toda medicao de
  carregamento sob demanda** e esta escrita no proprio codigo agora.
- **O que sobrou provado, e basta:** os fatos estruturais nao dependem de visibilidade —
  **100 `<video>`, `preload="metadata"` declarado em 100/100, `poster` em 0/100, 91
  abaixo da dobra**, contra um bucket `renders` de **1.027 arquivos, 29,4 MB de media,
  49,5 MB no maior**. `<video>` nao tem `loading="lazy"`: 91 pedidos de metadados a
  objetos de ~29 MB que ninguem vai olhar. O item continua certo; a frase que o
  justificava e que estava errada.

**5. Rigor.** `tsc --noEmit -p tsconfig.json` **EXIT=0**, e **falsificado dentro do
arquivo que a sprint mexeu** (que e o que importa: prova que o tsc le ESTE arquivo, nao
so que ele roda) — `const _falsifyUISprint: number = "not a number"` injetado logo
acima de `HistoryCardFrame` → tsc acusou **1 erro, EXIT=2** → arquivo restaurado e
conferido por **md5 identico** → tsc verde de novo. EOL conferido no HEAD por arquivo:
`HistoryClient.tsx` **LF** (0 CR no HEAD e 0 no disco, 1.581 linhas) e este doc **LF**
(0 CR). Indice isolado (`GIT_INDEX_FILE=/tmp/kidxUIS`), **sem `add -A`** — obrigatorio
aqui, porque a arvore tem 164 arquivos sujos de churn de EOL e de trabalho seu em
`StudioClient`/`audio`/`enhance` que **nao** podem entrar num commit de UI. **Sem push.**
[KINEO-UI-DIARIO-2026-08-17]

**6. Realimentacao do backlog — ITEM 29 (`thumbnail_url` nulo em 1.129/1.129).** A
rotacao levou a `/library`, a tela mais nova da casa e a primeira vez que ela entra
neste doc: **6 `<video>`, `poster` 0/6, `preload="metadata"` 6/6, 0 `<img>`**, **9 raios
distintos com 5 fora da escala**, **`ease` puro em 55 de 65** elementos animados (a
quinta linguagem de timing do item 28, agora confirmada numa segunda pagina) e **23
elementos com o acento, os 23 acima da dobra**. Mas o achado que importa nao estava no
DOM e sim no banco: as tres telas novas (`/library`, `/my-videos`, `/studio`) ja
escrevem `poster={v.thumbnail_url ?? undefined}` — **a linha certa, resolvendo para
`undefined` em 100% dos casos.** E de pipeline, nao de UI, e trava a metade "poster"
dos itens 23, 27 e 28 ao mesmo tempo.

### 17/08 (sprint 14h) — ITEM 22 FECHADO NO UNICO LUGAR QUE ALCANCA AS 546 CLASSES, E A DESCOBERTA DE QUE O ROADMAP ESTAVA MEDINDO UMA SALA VAZIA

**1. Auditoria do item anterior (item 21, /wall) — EM PRODUCAO, e PASSOU.** O push
saiu: `origin/main` esta em `2836f28` e **contem o `eb6f6e4`** da sprint das 18h de
ontem (o HEAD local esta 2 commits a frente, mas os dois sao do fundador, do Studio —
nenhum e de UI). Medido em `www.usekineo.com/wall` hoje:
- **O fallback dispara e o buraco acabou:** `[role="img"]` = **1** na pagina, e o card
  `#3` (`aSrIVAc81MM`, a thumbnail morta) pinta o gradiente da marca + glifo de play
  em vez de nada. Os outros dois carregam de verdade — `naturalWidth` **1280x720** e
  **480x360**. O `transferSize` confirma o diagnostico de ontem por outro caminho: a
  thumb morta pesa **1.397 bytes** (o JPEG cinza 120x90 do 404) contra 85.954 e 15.595
  das vivas.
- **O crop continua certo:** os dois Shorts vivos aparecem inteiros na moldura 163x291,
  sem tarjas — a decisao de NAO trocar `cover` por `contain` se sustenta na tela.
- **O gradiente inferior de legibilidade (parte (c) do item 21) esta no ar** e a
  pastilha "7 views" para de flutuar sobre o frame claro do card #1.
- **Nada regrediu:** zero erro de console, nenhum z-index novo, o `#rank` no lugar.
- **Uma armadilha de medicao, registrada para as proximas sprints:** as primeiras
  leituras deram `complete:false`, `naturalWidth 0` e **zero requisicao a ytimg** — e
  isso NAO era a pagina, era `document.visibilityState === "hidden"`. Com a aba em
  segundo plano o Chrome **nao dispara `loading="lazy"`**, entao um screenshot tirado
  cedo mostra tres retangulos pretos e uma sprint apressada "descobre" um bug que nao
  existe. Ler `visibilityState` antes de acreditar em qualquer medicao de imagem lazy.
- **Mudou o quadro do item 25:** a aba padrao "This week" hoje renderiza **3 cards**
  (era 1 ontem, 0 em 15/08) e o contador diz "6 Shorts published ... 7 views counted".
  A aba nao abre mais vazia; a divergencia contador-vs-cards continua e o item 25 segue
  aberto por causa dela.

**2. O ITEM DA SPRINT — item 22, e ele e o item de maior alcance e menor risco do
roadmap inteiro.** `tailwind.config.js` ganhou `theme.extend.borderRadius` apontando
para os tokens. **Um arquivo, 546 ocorrencias** (236 `rounded-xl` + 172 `rounded-2xl` +
111 `rounded-lg` + 18 `rounded-md` + 9 `rounded-3xl`); `rounded-full` (107) ficou de
fora de proposito porque 9999px ja concorda com `--r-pill`.
- **Por que so aqui:** `app/globals.css` da `font-size:14px` para `html/body`, entao
  1rem = 14px e a escala do Tailwind roda a 87,5%. Confirmado no DOM de producao de
  hoje: `rounded-lg` pinta **7px**, `rounded-xl` **10.5px**, `rounded-2xl` **14px** —
  e **nenhum** desses valores existe na escala de tokens (8/13/18/22/999). Essas
  classes nao passam por `border-radius:` nenhum, passam pelo config: o item 11 podia
  tokenizar arquivo por arquivo para sempre sem alcancar uma so delas.
- **Prova no CSS compilado, nao no codigo-fonte:** `npx tailwindcss -c tailwind.config.js`
  gera `.rounded-xl{border-radius:var(--r-sm, 13px)}`, `.rounded-lg{var(--r-xs, 8px)}`,
  `.rounded-3xl{var(--r-lg, 22px)}` e mantem `.rounded-full{9999px}` intacto.
- **Antes/depois VISUAL sem deploy:** a mesma regra foi injetada na producao por
  stylesheet e medida com a pagina no ar. Em `/pricing`: **5 raios distintos → 4**, e
  os elementos **fora da escala caem de 17 para 3** (os 3 que sobram sao `14px`
  literais em CSS, nao Tailwind — ficam para o item 11). Screenshot antes e depois em
  pagina inteira e em zoom no card Starter: **nenhuma diferenca perceptivel**, como o
  item previa. Em `/studio`: 16 raios distintos → 14, 4 elementos tocados.
- **O `var()` leva fallback de proposito** (`var(--r-sm, 13px)`): sem ele, um dia em
  que o `:root` perca o token, `border-radius` vira invalido e **colapsa para 0px em
  centenas de elementos**. Com fallback, o pior caso e voltar ao valor de hoje.
- **A regra inviolavel nao foi so respeitada, ela e inalcancavel:** `app/KineoLanding.tsx`
  **nao tem uma unica classe `rounded-*`** (a landing usa a escala `.klp` em CSS), e o
  DOM da home em producao mede **0 elementos** com `rounded-md/lg/xl/2xl/3xl`. A vitrine
  de motores, os cards 500x280 e os `clamp()` do hero estao fora do raio de alcance
  desta mudanca por construcao — nao por cuidado.

**3. Revisao adversarial (2x, a 2a cacando defeito na propria mudanca).**
- **CLS: impossivel.** `border-radius` nao entra em layout; nenhuma caixa muda de tamanho.
- **LCP: intocado.** Mesmo numero de regras CSS; o texto cresce ~60 bytes no bundle.
- **Colapso para 0px:** era o unico jeito real desta mudanca quebrar a tela — morto
  pelo fallback dentro do `var()`.
- **Escopo do token:** o `:root` de `app/globals.css` (linhas 94-98) **nao esta dentro
  de nenhum `@media`**, e `app/layout.tsx` e o **unico** arquivo com `<html>` no `app/`
  e importa `globals.css` — nao ha rota que renderize `rounded-*` sem os tokens.
- **Variantes:** `grep` de `sm:/md:/hover:/group-hover:rounded-*` e de
  `rounded-t-*/b-*/l-*/r-*` retorna **0**; nao ha `@apply rounded-` em CSS nenhum;
  e nenhum JS le `borderRadius` de `getComputedStyle`. A superficie e exatamente as
  5 classes mapeadas.
- **Onde o delta e maior:** `rounded-md` 5.25→8px (+52%), 18 usos — e **todos** vivem
  em `admin/*` (paginas internas), `/examples`, `NicheCard` e `PreviewModal`. Zero
  risco em tela de cliente.
- **Mobile:** sem variantes responsivas de raio, o valor e o mesmo em toda largura.
- **Modais/z-index/autoplay/reduced-motion/Save-Data:** nada tocado; `border-radius`
  nao e animacao, entao nao ha o que respeitar.

**4. Rigor.** `tsc --noEmit -p tsconfig.json` **EXIT=0** e **falsificado**
(`const _falsify: number = "not a number"` em `lib/uiTokens.ts` → tsc acusa, EXIT=2 →
restaurado e conferido por md5 identico). O **instrumento do proprio item tambem foi
falsificado**, que e o que importa aqui porque a mudanca e num `.js` que o tsc nao le:
`xl` foi trocado por um valor-sentinela, o build do Tailwind refeito, o sentinela
**apareceu** no CSS gerado, o arquivo foi restaurado (md5 identico, 91 linhas CRLF
preservadas) e o build voltou a bater byte a byte com o anterior. EOL conferido no HEAD
por arquivo: `tailwind.config.js` **CRLF** (63→91 linhas, todas CRLF), este doc **LF**
(0 CR). Indice isolado, sem `add -A`, **sem push**. [KINEO-UI-DIARIO-2026-08-17]

**5. Realimentacao do backlog — ITEM 28 (/studio).** A rotacao devolveu o achado mais
caro do dia: **o `/generate`, que os itens 26 e 27 mediram, nao e mais a porta do
produto** — o commit `613ca3e` manda quem chega de mao vazia para o `/studio`. E o
`/studio` nunca passou por uma sprint de UI: **16 raios distintos** (so 4 alcancados
pelo item 22 — o resto e px literal inline), **uma QUINTA linguagem de timing** que
nenhum item deste doc tinha visto (`ease` puro, a palavra-chave default do CSS, em
**65 dos 73** elementos animados, contra 8 na curva do Tailwind e **zero** em
`--ease-swift`), **39 elementos com o acento e os 39 acima da dobra** (o item 26 mediu
21 no `/generate`), e **6 `<video>` com `poster` 0/6, `preload="metadata"` 6/6 e
`readyState 4` 6/6** — os seis MP4 baixam inteiros no load, abaixo da dobra, com um
`#t=0.1` no src fazendo papel de poster. A boa noticia: e a **primeira pagina do
produto que quebra o padrao monofonte** (38 elementos em Space Grotesk; `/pricing`,
`/history`, `/signup` e `/generate` mediram zero).

### FECHAMENTO DO DIA — 16/08 (3 linhas, escritas pela sprint das 18h)

1. **Nada do dia 16/08 esta no ar.** `origin/main` esta em `315c442` e o HEAD local
   tem **4 commits a frente** — as sprints das 11h, 13h, 14h (UI) e 16h estao paradas
   na sua maquina, e entre elas esta o **fail-open do portao do render fantasma**, o
   que derrubou 42% dos 42 cadastros do TAAFT hoje. O push e seu: `scripts/114-PUSH.bat`.
2. **A auditoria do item das 14h nao pode ser feita em producao — por causa do item 1.**
   Foi feita na arvore (raios tokenizados presentes, LF, `tsc` verde) e o que ESTA no ar
   foi re-medido e nao regrediu: `/wall` com **CLS 0**, zero erro de console.
3. **A sprint das 18h fechou o item 21 (/wall) — e o item 21 e o 25 estavam errados os
   dois.** O crop nunca foi o defeito; a thumbnail do unico card da aba padrao esta
   **morta (404 em todas as 6 resolucoes)** e o YouTube devolve, junto do 404, um **JPEG
   cinza 120x90 valido** que dispara `load` e nao `error` — a pagina que existe para
   PROVAR pinta um retangulo de nada, e o conserto obvio (`onError`) nao pegaria isso.

### 16/08 (sprint 18h) — ITEM 21 FECHADO PELO MOTIVO ERRADO DUAS VEZES: NAO E O CROP, E UMA THUMBNAIL MORTA QUE DISPARA `load`

**1. Auditoria do item anterior (sprint 14h, os 10 raios orfaos) — NAO E AUDITAVEL EM
PRODUCAO, e a razao e o achado da auditoria.** `git rev-list --count origin/main..HEAD`
= **4**. O `origin/main` esta em `315c442` (ANTI-REPETICAO) e nao contem nenhuma das
quatro sprints de hoje: 11h (`1259f48`), 13h (`3cce3f6`), **UI 14h (`e4d58f4`)** e 16h
(`26197ab`). A regra do ciclo manda auditar EM PRODUCAO antes do proximo item; com o
push parado, isso e impossivel por construcao, e fingir que passou seria pior do que
registrar. Duas coisas foram feitas no lugar:
- **Auditoria na arvore:** os 10 raios do dia 20 estao no HEAD, `tsc` escopado EXIT=0,
  EOL LF conferido, nenhum arquivo do commit das 14h foi tocado depois.
- **Re-medicao do que ESTA no ar** (para provar que nada regrediu no que os usuarios
  veem hoje): `/wall` em `www.usekineo.com` responde **HTTP 200**, **CLS 0**, **zero
  erro de console**. A producao mudou de dominio no caminho e vale registrar:
  `shortsforgeai.com` agora responde **308 → `www.usekineo.com`**.
- **Consequencia para o roadmap, nao para esta sprint:** a auditoria em producao so
  volta a ser possivel depois do push. Se o dia 17 abrir com `origin/main..HEAD` ainda
  > 0, a sprint das 14h deve auditar a arvore de novo e dizer isso na primeira linha,
  em vez de medir o ar e achar que esta medindo o proprio trabalho.

**2. O ITEM DA SPRINT — item 21 (/wall), e as duas versoes dele estavam erradas.**

O item 21 (13/08) dizia: o card do mural mostra um retangulo quase todo preto porque
`hqdefault` e 480x360 e o `object-fit: cover` numa moldura 9:16 guarda so uma tira
central. A emenda do item 25 (15/08) dizia o contrario: o `src` virou `maxresdefault`
1280x720, entao o `cover` **corta imagem util** — "de 1280px sobrevivem ~405px, ~32% do
quadro". **As duas leituras foram falsificadas hoje, com medicao, e nas duas o culpado
apontado era o crop.**

**Medicao A — o mural serve as DUAS urls ao mesmo tempo.** `?range=all` em producao:
3 cards em `maxresdefault` (vindos de `row.thumbnail_url`) e 1 em `hqdefault` (o
fallback de `youtubeThumbUrl()`, `lib/wallOfProof.ts:97`). Uma unica regra de `cover`
governando duas geometrias — era esse o motivo de cada sprint ver uma coisa.

**Medicao B — o `cover` esta CERTO nas duas, e os "405px" do item 25 sao o quadro
inteiro.** Baixei os 3 `maxresdefault` e medi o brilho em 20 faixas verticais de 5% da
largura: as faixas **0-6 e 13-19 sao escuras** e so as **7-12** carregam imagem — banda
central de ~30% da largura. E **720 x 9/16 = 405px de 1280 = 31,6%**. O YouTube entrega
a thumbnail de Short **pillarboxed em toda resolucao**; o `cover` numa moldura 9:16
descarta exatamente as barras e conserva o Short inteiro — em `hqdefault` (202,5px de
480) e em `maxresdefault` (405px de 1280) igualmente. **Os "~405px que sobram" que a
emenda leu como perda de 68% sao o quadro util completo.** Trocar por `contain` +
backdrop borrado — a correcao que o item 21 pedia — mostraria as **barras do YouTube**
dentro da nossa moldura e encolheria o Short de 163x291 para uma tira de 163x92. **Nao
foi feito, de proposito.**

**Medicao C — o defeito real, e ele e pior.** O unico card que a aba padrao
("This week") renderiza hoje e `aSrIVAc81MM`, e **todas as 6 resolucoes de thumbnail
dele respondem HTTP 404**: `maxresdefault`, `hq720`, `sddefault`, `mqdefault`,
`hqdefault`, `default`. Medido no DOM de producao com o browser: `naturalWidth` **0x0**
na moldura de 163x291 — **1 de 1 card visivel na aba padrao nao pinta um pixel.** A
pagina cujo trabalho e provar entrega, hoje, **100% de nada**.

**Medicao D — e por que o conserto obvio nao teria funcionado.** O `i.ytimg.com` nao
devolve corpo vazio no 404: devolve um **JPEG cinza de 120x90 perfeitamente valido**.
Testei os 4 srcs do mural no browser da producao, um `new Image()` por url:

| src | evento | naturalWidth |
|---|---|---|
| `aSrIVAc81MM/hqdefault` | **`load`** | **120x90** |
| `FPXfh0CaB4I/maxresdefault` | `load` | 1280x720 |
| `HJ1TtTy_7pw/maxresdefault` | `load` | 1280x720 |
| `fM_DhxZn7Lc/maxresdefault` | `load` | 1280x720 |

**A thumbnail morta dispara `load`, nunca `error`.** Qualquer conserto baseado em
`onError` — que e o primeiro que qualquer um escreve, e que o proprio item 21 propunha
na sua parte (b) — **nao faria absolutamente nada aqui**. O discriminador honesto e o
TAMANHO: o placeholder de ausencia tem sempre 120x90, e a menor thumbnail real do
YouTube (`mqdefault`) tem 320px. Por isso o teste e `naturalWidth <= 120`.

**A mudanca (diff isolado, rollback trivial):**
- **`components/wall/WallThumb.tsx` (novo, client)** — o mesmo `<img>` de antes, com
  deteccao da thumbnail morta por `naturalWidth <= 120` no `onLoad` **e** no mount
  (com SSR a imagem pode ficar `complete` ANTES da hidratacao e nenhum dos dois eventos
  chega a disparar — e a unica razao do `useEffect`), mais `onError` como rede de
  seguranca do caminho que o browser realmente trata como erro. No lugar do buraco entra
  o fallback da marca: gradiente `#1d1d1f → #141416` (as superficies `--surface-1/2` da
  tabela de tokens deste doc) com um glifo de play em SVG. **Sem animacao nenhuma** —
  camada estatica, entao nao ha o que respeitar em `prefers-reduced-motion` nem em
  `Save-Data`, e nao ha CLS possivel (`position:absolute; inset:0` dentro da mesma caixa
  `aspect-ratio` de sempre).
- **`app/wall/page.tsx`** — troca do `<img>` pelo `<WallThumb>`, mais o **gradiente
  inferior de legibilidade** (item 6 do sistema deles, a parte (c) do item 21): as duas
  pastilhas (#rank e views) ja tinham fundo proprio, o gradiente e o que impede que
  flutuem sobre um frame claro. `pointer-events:none` porque o card inteiro e o link.
- **O comentario mentiroso do item 25 (correcao 2) morreu junto.** As 6 linhas de
  `app/wall/page.tsx:186-192` explicavam o crop de "hqdefault 480x360" numa pagina que
  serve as duas urls; foram substituidas pela medicao de hoje, com os dois numeros
  (202,5 de 480 e 405 de 1280) escritos, para que a proxima sprint nao "conserte" o crop
  de novo.

**Revisao adversarial, 2a passada cacando defeito na propria mudanca:**
1. **Falso positivo:** `default.jpg` e uma resolucao REAL do YouTube e tambem tem 120x90
   — se um dia `row.thumbnail_url` apontar para ela, o card cai no fallback. Aceito e
   documentado: 120px esticado numa moldura de 163px ja seria inutilizavel, o fallback e
   melhor do que a versao borrada. `youtubeThumbUrl()` devolve `hqdefault` e o banco so
   tem `maxresdefault`, entao hoje o risco e zero.
2. **Hidratacao:** `'use client'` nao tira o elemento do HTML do servidor — o `<img>` dos
   cards saudaveis sai identico ao de hoje. O `missing` so muda depois da hidratacao;
   nao ha mismatch, ha transicao de estado.
3. **Bundle:** `/wall` **ja** e uma rota com componente client (`WallSubmitLink`), entao
   o runtime do React ja era servido ali. Nenhuma linha nova de baseline.
4. **z-index / modais:** nenhum `z-index` introduzido. Tudo vive dentro do
   `overflow:hidden` do card; nada `fixed`, nada em portal — o defeito do dia 18
   (`forwards` prendendo o interstitial) nao tem como se repetir aqui.
5. **Ordem de pintura:** o gradiente entra ANTES das duas pastilhas no JSX, entao elas
   pintam por cima sem precisar de `z-index`; o `#rank` fica no topo-esquerdo e o
   gradiente so comeca a 42% do fundo — nao se tocam.
6. **Acessibilidade:** o fallback leva `role="img"` + `aria-label` com o mesmo texto do
   `alt`, entao o nome acessivel do card nao se perde quando a imagem some.
7. **A ambiguidade que a mudanca torna irrelevante:** o `<img>` da pagina foi medido no
   ar com `complete:false / 0x0` (lazy, em voo) enquanto o `new Image()` do mesmo src
   terminou em `load / 120x90`. Nao importa qual dos dois estados o browser do visitante
   alcance — **os dois caminhos (`onError` e `naturalWidth<=120`) caem no mesmo
   fallback**, entao o conserto nao depende de resolver essa duvida.

**O que NAO foi feito e por que:** o item 25 (aba padrao vazia + contador que conta a
outra aba) continua aberto — hoje o contador imprime **"4 Shorts published by Kineo
users · showing the last 7 days"** com **1 card** na tela (era 3 contra 0 em 15/08; a
distancia aumentou). E um item proprio, com regra de negocio (qual aba abre), e a regra
da casa e um item por sprint. Os raios de `/wall` (6 valores fora da escala) continuam
com o item 22. **Nada de preco, oferta, credito ou entitlement foi tocado.**

**Rigor:** `tsc` escopado **EXIT=0 e FALSIFICADO** (`useState<number>(false)` proposital
→ **4x TS2345, EXIT=2** → restaurado e conferido por **md5** nos dois arquivos → EXIT=0).
EOL **LF** conferido no HEAD e na arvore (0 CR nos dois arquivos). Indice isolado
(`GIT_INDEX_FILE`), **sem `add -A`**, **sem push**. O `tsconfig.uisprint.json` do teste
nao pode ser apagado pela sandbox (OneDrive devolve `Operation not permitted`) mas ja
cai na linha 22 do `.gitignore` (`tsconfig.*.json`) — **nao entra no commit**; apague
quando quiser.

**3. Item novo no fim do backlog: item 27** (rotacao: depois do `/generate` vem a **tela
do video pronto**).

### 16/08 (sprint 14h) — DIA 20 (auditoria final) + a descoberta de que ITEM FECHADO NAO FICA FECHADO

**1. Auditoria do item anterior (dia 18) EM PRODUCAO: PASSOU, e passou inteiro.**
Medido no ar as 14h, nao deduzido do git. O que a sprint das 18h de 15/08 escreveu
esta servido: a regra em producao e literalmente
`.page-enter{animation:fadeIn var(--dur-base) var(--ease-out-expo)}` — **sem
`forwards`**, que era a palavra cuja remocao impediu o transform residual de
prender o interstitial de auto-OAuth do checkout dentro do cartao. O `/signup`
servido traz a classe (1 ocorrencia no HTML do servidor). **E o dia 12 subiu
junto:** a folha de producao, que em 15/08 tinha **0** ocorrencias de `var(--dur-`,
hoje tem **77 `var(--dur-)`, 44 `var(--ease-)` e 49 `var(--r-)`** — os tokens de
raio, cinza e timing estao todos respondendo no `:root` do ar
(`--dur-fast 150ms · --dur-base 250ms · --dur-slow 400ms · --r-xs 8px ·
--r-sm 13px · --r-md 18px · --r-lg 22px · --r-pill 999px`). **Nada regrediu:**
CLS **0** medido com PerformanceObserver, zero erro de console, CLS/altura dos
cards intactos.
**Uma nuance que vale registrar e nao e defeito:** o `/login` (o par do `/signup`)
tem a classe no codigo mas **0 ocorrencias no HTML servido** — a pagina inteira e
client-rendered (o HTML do servidor nao tem nem o campo de senha). A transicao
roda no mount, so nao no primeiro paint. O par foi cumprido; o caminho e outro.

**2. O ITEM DA SPRINT — dia 20, a auditoria final, com os 10 testes rodados e
numerados. E o resultado nao e o que o roadmap esperava.**

| # | teste | resultado |
|---|---|---|
| 2 | raios orfaos | **FALHOU** — 15 em `KineoLanding` (eram 3 excecoes) + 648 `borderRadius` inline + 655 classes `rounded-*` |
| 3 | <=9 cinzas | **FALHOU** — 13 tons quase-neutros no `KineoLanding` (eram 10) |
| 4 | <=3 duracoes | **passa no CSS, FALHA no Tailwind** — 0 literais de duracao em CSS; 15 `duration-*` + 40 `ease-*` + 108 `transition-*` fora dos tokens |
| 5 | 2 familias | passa com 1 orfao (`-apple-system` — e o `system-ui` do `/wall`, item 25) |
| 6 | zero spinner | **passa** — `/generate` tem **0** elementos com animacao de giro |
| 7 | video poster-first | **FALHOU** — `/generate` 11/11 `preload="metadata"`, 0 poster (ver emenda ao item 23) |
| 8 | focus-visible | passa (auditado 13/08, sem `outline:none` novo) |
| 9 | cerimonia do video pronto | passa (dia 7 no ar) |
| 10 | CLS / LCP | **passa** — CLS 0; poster da vitrine e camada `<img>` `loading="eager"`, o `<video>` entra por cima |

**O achado que vale o dia: os itens 11 e 12 foram fechados em 13 e 14/08 DENTRO do
`app/KineoLanding.tsx` e a reconstrucao da home em 15/08 os reabriu no mesmo
arquivo, sem que nada acusasse.** A contagem de `border-radius:` numerico naquele
arquivo, commit a commit de 15/08: **3 (so as excecoes documentadas) → 11 → 14 →
15**. Os 12 raios novos entraram junto da vitrine de motores (`.ec-dots`,
`.tr-nav`, `.tr-badge`, `.nd-menu`, `.pstack`, `.sv2`, `.sv3`, `.tile .tic`,
`.promo`). O mesmo vale para os cinzas: `#a1a1a8`, `#a1a1a6`, `#86868b`,
`#3a3a3d` e `#111115` voltaram ao arquivo de onde tinham sido removidos.
**Nao e culpa de quem reconstruiu a home — e a prova de que este roadmap nao tem
guarda-costas: um item so fica fechado enquanto ninguem escreve CSS novo.**

**A "correcao fina" que o dia 20 autoriza foi feita, e so ela:** os **10 raios
orfaos vivos** do `KineoLanding` viraram token — diff de **10 linhas, 1 para 1**,
nenhuma outra propriedade tocada.

| seletor | antes | depois | delta real |
|---|---|---|---|
| `.nd-menu::before` | 13px | `--r-sm` | **0** (13px) |
| `.nd-menu a` | 9px | `--r-xs` | -1px |
| `.bento .promo::before` | 50% | `--r-pill` | **0** — medido 220x220, quadrado |
| `.tile .tic` | 8px | `--r-xs` | **0** |
| `.sv2 i` | 3px | `--r-pill` | **0** — 500x6, o raio ja era metade da altura |
| `.sv3 b` | 50% | `--r-pill` | **0** — 26x26 |
| `.tr-nav` | 50% | `--r-pill` | **0** — 38x38 |
| `.ec-dots i` | 2px | `--r-pill` | **0** — 14x2,5; o clamp devolve 1,25px nos dois |
| `.tr-badge` | 6px | `--r-xs` | +2px |
| `.pstack img` | 10px | `--r-xs` | -2px |

**Sete das dez sao byte a byte identicas no render**, e as tres que andam andam
**<=2px**. Os `50%` so viraram `--r-pill` **depois de medir que os tres elementos
sao quadrados perfeitos** — em elemento retangular `50%` e elipse e `999px` e
capsula, entao a conversao que o item 11 fez "por mapa" aqui foi feita por regua.
Prova em producao pelo metodo da casa (folha de teste no **body**, nunca no head —
emenda do item 22): com as 10 regras injetadas, os computados trocam como previsto
e **nenhum retangulo mudou de tamanho** (`162x41`, `30x30`, `500x6`, `26x26`,
`38x38`, `14x3`, `56x22`, `89x124` iguais antes e depois) — CLS impossivel.
**O que NAO foi tocado, de proposito:** os 3 `border-radius:0` da tabela
comparativa (reset, excecao ja documentada no item 11) e os 2 raios de
`.scroll-cue` / `.scroll-cue::before` — **porque descobri que `.scroll-cue` e CSS
MORTO**: as 4 regras + o keyframe `cueDrop` existem no `KLP_CSS` e **nenhum
elemento no JSX usa a classe** (so um comentario no `RevealOnScroll.tsx` a cita).
Tokenizar codigo morto e maquiar; apagar CSS morto e outra mudanca, entao fica
registrado aqui e nao entra neste commit.
**Rigor:** `tsc --noEmit` **EXIT=0**, e falsificado — com um erro proposital
(`const __kineo_probe: number = 'nao e number'`) o tsc acusou
`app/KineoLanding.tsx(714,7): error TS2322` e **EXIT=2**; arquivo restaurado e
conferido byte a byte contra o backup. EOL: LF no disco e LF no HEAD, **0 CRLF**.
**Revisao adversarial (2 passadas, a 2a cacando defeito meu):** (a) `var()` dentro
de `::before` — custom property herda para pseudo-elemento, e foi **medido** (o
`::before` do `.nd-menu` devolveu 13px com o token); (b) todos os 10 seletores sao
`.klp <algo>`, entao os tokens do bloco de vars do `.klp` alcancam todos — nao ha
o risco do `var()` cair para 0 que quase quebrou as pilulas do rodape em 14/08;
(c) z-index/modais/LCP/autoplay: **intocados** — o commit so muda `border-radius`,
nao ha uma unica outra propriedade no diff.

**3. Realimentacao do backlog: item 26 (`/generate`) + emenda ao item 23.**
Na rotacao, `/generate` — a pagina onde a medicao de aquisicao de hoje diz que a
intencao de compra NASCE (17 pessoas em `generate_step_1` contra 8 no `/pricing`) —
usa o azul da marca em **89 de 605 elementos** (47 texto, 59 fundo, 38 borda, 10
sombra; 21 acima da dobra), contra 23 do `/pricing` e 14 do `/wall`: **quase 4x o
pior caso ja registrado neste doc**, e o oposto exato do "1 acento usado raro".
Detalhe no item 26. A emenda ao item 23 e que **o `/generate` tem a mesma doenca do
`/history`**: 11 `<video>`, `preload="metadata"` em 11/11, `poster` em 0/11.

**4. Situacao do push:** `origin/main` = `315c442`; **2 commits locais esperam
push** (as sprints de analytics das 11h e 13h de hoje) **+ este da UI**. As sprints
de UI de 15/08 ja estao no ar — foi assim que a auditoria acima pode ser feita.
**O push continua sendo seu.**

---

### FECHAMENTO DO DIA — 15/08 (3 linhas, escritas pela sprint das 18h)

1. **O dia 18 fechou o roadmap ate o dia 19: so falta a auditoria final (dia 20).**
   A transicao landing → /signup existe agora — e o mecanismo ja estava pronto na
   casa havia semanas, so nunca tinha sido ligado (`.page-enter`, tokenizado, com
   **zero call sites**). Nao foi a View Transitions API porque **medi** que o
   clique em "Start free" e navegacao soft: a API CSS so vale cross-document e o
   Next 14.2.5 nao tem a versao do 15. E **ligar a classe como ela estava
   escreveria um bug no seu checkout**: com `forwards`, o transform que sobra
   prende o interstitial do auto-OAuth dentro do cartao (medido: `fixed inset-0`
   virando **400x200** em vez de **1916x911**). Uma palavra removida resolveu.
2. **O que voce precisa saber: as duas sprints de hoje nao estao no ar.**
   `origin/main` = `2580091`; o dia 12 (timings) de 14h e este dia 18 esperam
   push. Medido no CSS de producao, nao deduzido do git: a folha servida tem
   **0 ocorrencias de `var(--dur-` e 0 de `var(--ease-`**. Nada regrediu no que
   ja esta no ar (CLS **0**, zero erro de console, tokens de raio/cinza/timing
   respondendo, galeria a **y=165**, TTFB quente 0,41–0,48s). **O push e seu.**
3. **O achado do dia: `/wall` abre vazia e imprime "3 Shorts" em cima do vazio.**
   A aba padrao e "This week", que hoje tem **0 cards**; os 3 Shorts reais tem 9 e
   10 dias e so aparecem em `?range=all`. A pagina cujo unico trabalho e provar
   esta, por padrao, exibindo um numero que ela mesma nao mostra. De brinde, o
   item 21 envelheceu: o `src` ja virou `maxresdefault` (1280x720) e o comentario
   do codigo ainda descreve o `hqdefault` com tarjas pretas. Virou o **item 25**.

---

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

- **15/08 (sprint 18h) — Dia 18 ✅ (o fio que a casa ja tinha soldado e nunca
  ligou) + a auditoria que diz onde o dia 12 esta: no laptop.**

  **1. Auditoria do item anterior EM PRODUCAO — o dia 12 (timings) NAO esta no
  ar, e isso foi medido no CSS servido, nao deduzido do git.** Baixei
  `/_next/static/css/54b8e544a9d65c55.css` (58.330 B) direto da producao e
  contei: **0 ocorrencias de `var(--dur-`** e **0 de `var(--ease-`**. A folha no
  ar ainda tem os literais (`.15s`, `.25s`, `.35s`, `.65s`, `1.1s`…). Confere com
  `git ls-remote origin main` = **`2580091`**, enquanto o HEAD local esta em
  `1d39d4f`: os commits `703625a` (sprint 13h), `57f52d3` (dia 12, timings) e
  `1d39d4f` (sprint 16h) **esperam push**. Com o desta sprint, sao **4** — e
  **2 deles nao sao de UI**: `703625a` e `1d39d4f` sao os prazos de morte dos
  loops `composing` e `generating`, que seguram cliente em trial parado numa
  tela que gira. **`scripts/104-PUSH.bat`** e o mais recente.
  **Nada regrediu no que ESTA no ar** — cada numero lido, nenhum herdado de doc:
  **CLS = 0** por `PerformanceObserver`; **zero erro de console**; os 5 raios e
  os 5 tokens de tempo respondem no `:root` (`8/13/18/22/999px`,
  `150/250/400ms`, `swift` e `out-expo`); os 8 cinzas do dia 12 respondem no
  `.klp` com os valores exatos do commit de 14/08; **`.composer` = null**
  (regra aposentada, como registrado as 14h); os **4 `.ec-poster`** no lugar e o
  primeiro deles a **y=165px** (era 164 as 14h — a vitrine continua acima da
  dobra); **`Start free` → `/signup`** intacto. Peso e velocidade estaveis: HTML
  da home **248.128 B** (identico as 14h; segue **68 KB acima do teto de 180 KB**,
  que continua sendo decisao do fundador e nao conserto de sprint), folha unica
  **45.220 B**, payload RSC **153.052 B**, **TTFB 0,41 / 0,48 / 1,18s** (a de
  1,18s foi a primeira, fria). Os 8 `<video>` seguem em `preload="auto"` — a
  escolha deliberada do fundador registrada as 14h, nao regressao.

  **2. Item da sprint: dia 18 — a transicao landing → /signup.** Detalhe completo,
  com a medicao que descartou a View Transitions API e a prova do bug do
  `forwards`, esta no item 18 acima. Em uma frase: **`.page-enter` ja existia em
  `app/globals.css`, ja tokenizado, com zero call sites** — o dia 18 foi ligar o
  fio, nao construi-lo. Diff: **3 linhas em 3 arquivos** (a classe nos cartoes de
  auth do `/signup` e do `/login` — regra dos pares — e a remocao de uma palavra
  na regra).

  **Verificacao alem do tsc, na PRODUCAO AO VIVO** (metodo da casa: folha de teste
  no `body`, nunca no `head`): montei as duas variantes de `.page-enter` lado a
  lado, cada uma com um filho `position: fixed; inset: 0`, e forcei o fim das
  animacoes pela Web Animations API (`getAnimations().finish()`) em vez de esperar
  o relogio — **a aba do automador esta `visibilityState: "hidden"` e o Chrome
  NAO avanca animacao CSS em aba oculta**; a primeira medicao ficou 700ms parada
  no frame inicial e quase virou "a animacao nao roda". Resultado com o relogio
  fora do caminho: **`forwards` → `transform: matrix(1,0,0,1,0,0)` e o filho
  `fixed` medindo 400x200 (o pai); sem fill → `transform: none` e o mesmo filho
  medindo 1916x911 (a viewport)**. Tokens resolvendo certo no mesmo teste:
  `animation-duration 0.25s`, `timing-function cubic-bezier(0.16, 1, 0.3, 1)`.
  `tsc --noEmit` **EXIT=0 e falsificado**: erro proposital
  (`const __KINEO_FALSIFY__: number = 'nao sou numero'`) na linha 1 do
  `app/(auth)/login/page.tsx` → acusou **TS2322 (1,7)** → restaurado, **md5
  `40df8ca7…` e `acd8e9db…` conferidos identicos** nos dois arquivos tocados,
  EXIT=0. **EOL LF conferido no HEAD arquivo por arquivo** (`git show HEAD:<f> |
  grep -c $'\r'` contra o disco): 0 CR nos dois lados em `globals.css`,
  `signup/page.tsx` e `login/page.tsx`.

  **A revisao adversarial (2 passadas, a 2a cacando defeito meu) pegou 3 coisas:**
  (a) **o `forwards`** — descrito acima; sem essa passada o commit teria ido com
  ele, porque a regra estava assim escrita ha meses e "so faltava usar".
  (b) **O `/login` nao estava no enunciado do item 18 e entrou mesmo assim.** A
  regra dos pares do `CLAUDE.md` existe para isto: "Log in" e "Start free" saem da
  mesma nav da home, e sem o par o site teria fade num destino e corte seco no
  outro. Conferido que o cartao dos dois arquivos e **o mesmo `className` byte a
  byte** (`w-full max-w-4xl relative z-10 rounded-2xl overflow-hidden grid
  md:grid-cols-2`, `login:156` e `signup:346`) — mesma mudanca, mesmo risco.
  (c) **Uma medicao minha estava errada e o `/wall` quase virou item com um fato
  falso.** Na primeira leitura os 3 `<img>` do `/wall` responderam
  `currentSrc: ""` e `naturalWidth 0`, e eu ia registrar "os cards tem `src`
  vazio". Era artefato: `loading="lazy"` **em aba oculta nao dispara o
  download**. Forcei `loading='eager'` e os 3 responderam
  `maxresdefault.jpg`, **1280x720, `complete: true`**. O item 25 foi escrito com
  o numero certo — e o numero certo aponta para um defeito diferente (e o
  enquadramento, nao a URL).

  **3. Realimentacao do backlog: item 25 (/wall).** A rotacao caiu no `/wall`, e
  ele nao repete o item 21 — **envelheceu por cima dele**. Por padrao a pagina
  abre em "This week" com **0 cards** e o contador logo acima diz **"3 Shorts
  published"**; os 3 existem, tem 9 e 10 dias, e so aparecem em `?range=all`
  (144+25+13 = 182 views). A pagina que existe para provar abre provando o
  contrario. Junto: o `src` ja migrou para `maxresdefault` (1280x720) — metade do
  item 21 esta feita e o diagnostico "retangulo preto" morreu, porque agora o
  `cover` numa moldura 163x291 joga fora **~68% do quadro** em vez de tarjas; e o
  comentario de 6 linhas em `app/wall/page.tsx:186-192` **ainda descreve o
  `hqdefault` com barras pretas**, ou seja o codigo explica uma URL que ele nao
  usa mais. Anotados: **55 de 123 elementos em `system-ui`** (45% da pagina nem
  chega em Inter) e o azul da marca subindo de 12 para **14** elementos.

  **Proximo em ordem:** **dia 20 — a auditoria final lado a lado**, unico dia do
  roadmap ainda aberto (11 a 19 fechados). Atras dele, a fila 21-25. Antes de
  rodar o dia 20 vale lembrar o que as sprints 22, 24 e 25 ja provaram: **os
  testes 2, 4 e 7 do checklist, como estao escritos, podem dar verde com o
  produto fora da escala** — o teste 2 nao ve os ~611 `borderRadius` inline nem
  as 557 classes `rounded-*`, o teste 4 nao ve a curva default do Tailwind em 274
  elementos, e o teste 7 hoje reprova uma decisao deliberada do fundador
  (`preload="auto"` na vitrine). **O dia 20 comeca reescrevendo o proprio
  checklist, ou mede a coisa errada com muita precisao.**

- **15/08 (sprint 14h) — Dia 12 FECHADO (metade "timings") + a auditoria que
  aposentou uma regra inviolavel do proprio roadmap.**

  **1. Auditoria do item anterior EM PRODUCAO — o dia 12 (cinzas) esta no ar e
  nada regrediu.** Lido no DOM de `https://www.usekineo.com/`, nao herdado de
  doc: os **10 tons vivem no `.klp`** com os valores exatos do commit de 14/08
  (`--card #141416`, `--card2 #1d1d1f`, `--s0 #0c0c0e`, `--s3 #26262a`,
  `--line #26262a`, `--line3 #4d4d50`, `--txt2 #c7c7cd`, `--muted2 #8f8f96`) e
  os raios/timings respondem no `:root` (8/13/18/22/999px, 150/250/400ms).
  **CLS = 0** por `PerformanceObserver`, **zero erro de console**, **Start free
  → /signup** intacto, e o **poster continua sendo o primeiro paint**: os 4
  cards saem do servidor como `<img class="ec-poster" loading="eager"
  fetchPriority="high">` com `<link rel="preload" as="image">` no `<head>`, e
  os `<video>` so montam no cliente. LCP intocado.

  **E o achado velho de dois dias MORREU — de graca.** Em 13/08 e 14/08 ficou
  registrado que num monitor 1080p (viewport 911px) o primeiro card da galeria
  comecava em **y=926px**, inteiro abaixo da dobra. Medido hoje no mesmo
  viewport: **y=164px**. A vitrine de motores do fundador resolveu, sem sprint
  de UI, o unico defeito estrutural que este roadmap vinha anotando e nao
  conseguia consertar com uma linha.

  **Tres coisas que a reescrita da home mudou e que o roadmap nao pode continuar
  fingindo que nao viu:**
  (a) **A primeira regra inviolavel deste doc protege um elemento deletado.**
  `document.querySelector('.composer')` responde **null** — o fundador extinguiu
  o composer. A regra "caixa 667x432 nao muda" ficou duas sprints passando num
  teste sobre nada. Foi **riscada** na secao de regras, com a fileira dos 4
  cards herdando a protecao no lugar dela.
  (b) **`preload="none"` acabou na home: sao 8 `<video>` com `preload="auto"`.**
  Isso reprova o item 2 do sistema Higgsfield e o **teste 7 do dia 20** — mas
  **nao e regressao e nao vai ser "consertado"**: e a correcao deliberada do
  fundador (commit `a2e3843`) para o "parece que esta travando" que ele reportou,
  e os clipes cairam de varios MB para ~300 KB justamente para caber nessa
  escolha. **Nao e defeito, e um contrato que mudou** — o teste 7 e que precisa
  ser reescrito pelo fundador antes do dia 20, senao a auditoria final vai
  reprovar uma decisao dele.
  (c) **O guard-rail de peso furou: HTML da home = 248.194 B contra o teto de
  180 KB** — +68 KB. Causa medida, nao suposta: **payload RSC (`__next_f`) =
  153.469 B** e a folha de estilo unica **45.220 B** (era ~25 KB em 14/08).
  **TTFB continua dentro** (0,40–0,57s em 3 medicoes quentes; a primeira, fria,
  deu 1,33s). Nada disso foi causado por sprint de UI — e o preco da vitrine, e
  a vitrine bateu recorde de checkout no mesmo dia. **Fica como numero na mesa
  do fundador, nao como conserto de sprint:** ou o teto de 180 KB sobe com a
  decisao registrada, ou alguem paga os 68 KB. Sprint de UI nao decide isso
  sozinha.

  **2. Item da sprint: dia 12, metade "timings" — FECHADO.** 9 duracoes de UI
  distintas → 3 tokens; 4 curvas → 2. Escopo, regra deterministica
  (`<=0.2s→fast · 0.22–0.3s→base · >=0.35s→slow`), teto de 50ms, a lista do que
  fica literal de proposito e o acoplamento `gvPop`/`gvGlow` que a tokenizacao
  consertou estao todos no item 12 acima. **Evidencia de antes:** no DOM de
  producao de `/generate`, **5 duracoes distintas conviviam na mesma pagina**
  (0.15/0.18/0.2/0.25/0.3s).

  **O commit resgata 10 substituicoes de 14/08 que estavam so no disco.**
  `git show HEAD:app/globals.css` nao tinha nada do que o arquivo ja mostrava —
  a sprint das 18h de 14/08 tokenizou a folha, assinou o comentario
  `KINEO-UI-DIARIO-2026-08-14`, **nao commitou e nao escreveu o Diario**. Por
  isso o dia 14 aparece so com a entrada das 14h. Conferido linha a linha e
  incluido aqui.

  **Verificacao alem do tsc — as tres formas de risco foram provadas NA
  PRODUCAO AO VIVO, com a folha injetada no `body`** (metodo da casa desde
  14/08; no `head` a medicao mente porque a folha do `.klp` vive dentro do
  `<main>`):
  · `transition: var(--dur-fast) var(--ease-swift)` **sem propriedade** (a forma
  do `.vs-go`, a mais arriscada porque o shorthand tem que decidir sozinho o que
  e duracao e o que e curva): antes `0.15s / ease / all` → depois
  `0.15s / cubic-bezier(0.2, 0, 0, 1) / all`. **Duracao byte a byte identica**,
  so a curva mudou.
  · `transition: all var(--dur-fast) var(--ease-swift)` → `0.15s / swift / all`.
  · a `animation` **dupla com dois `var()`** (a forma do `.gv-done-frame`)
  resolveu em `duration 0.4s, 1.8s · delay 0s, 0.4s · ease out-expo, ease ·
  fill both, none` — exatamente a semantica pretendida, com o glow disparando no
  fim do pop.
  `tsc --noEmit` **EXIT=0 e falsificado**: erro proposital
  (`const __KINEO_FALSIFY__: number = 'nao sou numero'`) no `GenerateClient` →
  acusou **TS2322 na linha 6** → restaurado, **md5 `a2bbe701…` conferido
  identico**, EXIT=0 com zero erros. **EOL conferido no HEAD arquivo por
  arquivo** (`git show HEAD:<f> | grep -c $'\r'` contra o disco): 8 arquivos em
  LF e o `ThumbnailGeneratorClient` em CRLF nos dois lados — todos batem.

  **A revisao adversarial (2 passadas, a 2a cacando defeito meu) pegou 3 coisas,
  e a primeira quase entrou no commit:**
  (a) **`git diff` estava mentindo, e por um motivo que vale para toda sprint
  futura deste repo.** O primeiro `--stat` acusou **560 linhas mudadas no
  `TemplatesClient` onde eu mudei 3**, 330 no `SocialProofToast`, 234 no
  `StickyUpgradeBar`. Nao era erro meu: **o `.git/index` esta quebrado** (o
  mesmo defeito de 146 arquivos-fantasma registrado em 14/08), e `git diff`
  compara contra o INDICE. Medindo contra o HEAD de verdade
  (`git show HEAD:<f> | diff - <f>`) o diff virou **exatamente as minhas
  linhas**. **Regra nova da casa: enquanto o indice estiver quebrado, `git diff`
  nao serve para auditar mudanca — use `git show HEAD:<arquivo> | diff -`.**
  (b) No caminho, o diff honesto denunciou que **3 arquivos estavam em CRLF no
  disco e em LF no HEAD** (`TemplatesClient`, `SocialProofToast`,
  `StickyUpgradeBar`) — desvio anterior a esta sprint, provavelmente de alguma
  gravacao pelo Windows. Commitar assim reescreveria os 3 arquivos inteiros. Os
  tres foram devolvidos para LF, e **o proprio diff virou a prova**: depois da
  conversao, a comparacao com o HEAD mostra so as 6, 4 e 2 linhas minhas.
  (c) O resgate de 14/08 divergia do mapa de hoje no valor `0.2s` (base la,
  fast aqui). Os dois cabem no teto de 50ms, entao ninguem estava "errado" — mas
  **e exatamente o tipo de divergencia que o dia 12 existe para matar**. Foi o
  que fez a regra deixar de ser "por papel" e virar **aritmetica**, escrita
  dentro do `globals.css` para qualquer um re-derivar sem opinar.

  **3. Realimentacao do backlog: item 24 (a quarta linguagem de timing).**
  A rotacao caiu no `/signup` — e o `/signup` **nao tem um unico `transition:`
  em CSS**: ele anima por **classe Tailwind**. No repo inteiro sao **274
  ocorrencias de `transition*` em 27 arquivos**, mais 15 `duration-*` e 58
  classes de curva, e o `tailwind.config.js` **nao declara `transitionDuration`
  nem `transitionTimingFunction`** — tudo roda no default (150ms +
  `cubic-bezier(0.4,0,0.2,1)`). Os 150ms coincidem com `--dur-fast` **hoje**, o
  que esconde o problema; e a curva default e uma **terceira curva que nao
  aparece em grep nenhum**, ou seja **o teste 4 do dia 20 pode dar verde com o
  produto inteiro rodando numa curva que nao e nossa**. E o item 22 de novo,
  com outra propriedade, e a correcao tem a mesma forma: um arquivo, alcance
  total. Detalhe no item 24. Junto foram anotados: `/signup` com **0 video e 0
  imagem** sendo o destino do unico CTA que este roadmap protege, e a terceira
  confirmacao do padrao monofonte (`/generate` hoje: **557 de 558 elementos em
  Inter, 1 em Space Grotesk**).

  **Proximo em ordem:** dia 18 (transicao landing → /signup) — os dias 11 a 17
  e o 19 estao fechados; sobram o 18 e a auditoria final do dia 20, com os
  itens 21-24 na fila atras deles.

- **14/08 (sprint 14h) — Dia 12 (metade "cinzas") na landing ✅ + a auditoria que
  finalmente pode dizer "esta no ar".**

  **1. Auditoria do item anterior EM PRODUCAO — e desta vez ele RODOU.** As duas
  sprints de 13/08 fecharam com o mesmo aviso: `origin/main` = `f0f63c7`, nada de
  UI tinha saido do laptop. Hoje `git ls-remote` responde **`2499311`** e o dia 11
  esta no ar: medido no DOM de `https://www.usekineo.com/`, `--r-xs/--r-sm/--r-md/
  --r-lg/--r-pill` respondem **8/13/18/22/999px tanto no `:root` quanto no `.klp`**
  (ontem eram MISSING), `.final` = **22px** (era 30) e `.tico` = **13px** (era 14).
  E o fundador nao subiu so isso: vieram junto as **ONDAS 2 a 7** (`152b8c0`,
  `6c1ae7f`, `efeab12`, `0d90204`, `0dd28cf`, `2499311`), que entre outras coisas
  promoveram `--sh-*`, `--dur-*` e `--ease-*` do `.klp` para o `:root` — ou seja
  **metade da infraestrutura do dia 12 ja chegou antes desta sprint**.
  **Nada regrediu, e cada numero foi lido, nao herdado:** **CLS = 0** por
  `PerformanceObserver`, composer **667x432 exato** com raio 22px, **6/6 videos com
  `preload="none"`**, **6/6 posters em .webp**, **12 elementos `.rv`** no lugar,
  **zero erro de console**. HTML da home **171.324 B** — subiu 2,5 KB desde ontem
  (168.866 B), efeito das ONDAS 6/7, e ainda **8,7 KB abaixo do guard-rail de
  180 KB**. Efeito nos eventos nao foi medido nesta sprint: o deploy de todas as
  ondas e de hoje, entao ainda nao ha antes/depois honesto para ler. Fica para a
  sprint das 18h.
  **O achado velho que segue de pe e nao virou item porque nao e conserto de uma
  linha:** num monitor 1080p (viewport 911px) o primeiro card da galeria comeca em
  **y=926px** — a galeria viva, que e a alma da home segundo o fundador, continua
  inteira **abaixo da dobra**.

  **2. Item da sprint: dia 12, metade "cinzas", na landing.** `KineoLanding.tsx`:
  **21 tons quase-neutros → 10**, e nenhum hex neutro sobrou solto — os 10 vivem
  todos no bloco de vars do `.klp`. Mapa, tokens novos (`--s0/--s3/--line3/--txt2`)
  e as 2 colagens recusadas de proposito estao no item 12 acima.
  **Verificacao alem do tsc — e o metodo mudou hoje:** a rampa nova foi injetada
  **na producao ao vivo** e o antes→depois lido com `getComputedStyle` elemento a
  elemento. `.composer` topo `rgb(25,25,25)` → `rgb(29,29,31)` (delta 4/4/6) e base
  **inalterada**; `.final` `(25,25,28)`→`(29,29,31)` e `(19,19,21)`→`(20,20,22)`;
  `.plan.pop` `(33,33,36)`→`(38,38,42)` e `(26,26,29)`→`(29,29,31)`, **borda
  identica**; `.logo .mk` `(23,23,26)`→`(29,29,31)`; **`.vcard` ficou byte a byte
  identica**. **Maior delta do site inteiro: 6/255 num canal.** **CLS = 0** e
  **toda caixa medida ficou IGUAL** — 667x432, 1024x424, 181x321, 329x494 — porque
  cor e paint, nunca layout. `tsc --noEmit` **EXIT=0 e falsificado** (erro
  proposital → **TS2322 na linha 28** → restaurado, md5 `f56a2b01…` conferido
  igual, EXIT=0). EOL **LF conferido no HEAD e na arvore** (0 CRLF nos dois).
  **A primeira injecao nao mudou NADA — e esse fracasso e o achado do dia.** Anexei
  a folha de teste no `<head>` e o computado nao se moveu; foi exatamente o que
  aconteceu ontem no `/viral-score` e ficou registrado como "anomalia". A causa
  esta medida: **a folha do `.klp` nao esta no `<head>`, esta dentro do `<main>`**
  (24.944 bytes num `<style>` no fim do componente). Estilo no body ganha do estilo
  no head por ordem de documento com a mesma especificidade — a medicao lia o valor
  antigo e parecia que a regra nao existia. Repetida a injecao em
  `document.body.appendChild`, tudo respondeu. **Virou metodo da casa** (emenda no
  item 22): folha de teste vai no body. A anomalia de ontem esta fechada e nao era
  do `/viral-score`.
  **A revisao adversarial (2 passadas, a 2a cacando defeito meu) achou 3 coisas:**
  (a) `--card` e redefinido dentro do `.klp` e mudou de valor — se algum componente
  filho da landing lesse `var(--card)`, herdaria o tom novo; auditado por grep,
  **so `AuthModal` e `PreviewModal` usam `var(--card)` e nenhum dos dois e filho do
  `.klp`** (a lista de componentes dentro do `<main className="klp">` foi extraida
  do JSX). (b) O comentario novo de 16 linhas vive **dentro do template literal do
  `KLP_CSS`** — foi escrito sem crase e sem `*/` interno de proposito, e o tsc
  limpo prova que a string continua fechada (foi assim que o `AvatarUpload` quebrou
  ontem); ele tambem nao pesa no fio, porque o render ja remove comentarios com
  `replace(/\/\*[\s\S]*?\*\//g,'')`. (c) O `borderRadius: 999` inline virou
  `var(--r-pill)` e nao `999px` — checado que os 3 elementos sao filhos do
  `<main className="klp">`, senao o `var()` cairia para 0 e as pilulas do rodape
  viravam retangulos.

  **3. Realimentacao do backlog: item 23 (/history) + 2 emendas ao item 22.**
  Na rotacao, `/history` — a pagina onde o cliente ve o proprio trabalho — abre
  **100 `<video>` com `preload="metadata"`, 0 com `poster`, 91 fora da tela**,
  todos em `networkState 2` dois segundos depois do load: 100 requisicoes de
  metadata simultaneas e um retangulo **preto** em cada card ate o MP4 responder.
  E o item 21 (`/wall`) de novo, na pagina de quem ja pagou. Detalhe no item 23.
  As emendas ao item 22 sao as duas descobertas de metodo do dia: **existe uma
  TERCEIRA linguagem de raio — 614 `borderRadius:` numericos em `style` inline de
  JSX**, que nao passam por `border-radius:` nem pelo `tailwind.config.js`, ou
  seja **o teste 2 do dia 20 pode dar 0 com o site inteiro fora da escala**; e a
  regra da folha de teste no body.

  **Proximo em ordem:** dia 12, metade "timings" (49 duracoes distintas em 40
  arquivos de `app/` + `components/`; o `:root` ja tem `--dur-fast/base/slow` e
  `--ease-swift/out-expo` desde a ONDA 6, entao e consumo de token, nao criacao).

  **4. AVISO OPERACIONAL — LEIA ANTES DE RODAR QUALQUER .bat DE PUSH.** O
  `.git/index` deste repo esta **quebrado**, e isso nao foi a sprint que causou:
  ele lista **146 arquivos como DELETADOS** em relacao ao HEAD (`git diff --cached
  --stat HEAD` → "146 files changed, 1.779 insercoes, 19.672 delecoes"), entre eles
  o proprio `docs/UI-1PORCENTO-BACKLOG.md`, que aparece ao mesmo tempo como `D ` e
  como `??`. E a assinatura classica de um `git add`/`git rm` interrompido. Ha
  **4 lock files velhos** parados no `.git`: `HEAD.lock` (09:15), `index.lock`
  (13:10), `objects/maintenance.lock` (30/07) e `refs/heads/main.lock` (10:31,
  contendo `91f7d14`, um commit ja tres posicoes atras). A sandbox nao consegue
  apaga-los (`Operation not permitted` no mount do OneDrive), entao **isso tem que
  ser feito por voce, no Windows**:

  1. Fechar tudo que fala com o repo (VS Code, GitHub Desktop, terminais).
  2. Apagar os 4 `.lock` — nenhum deles tem valor: o de `main` aponta para um
     commit velho e aplica-lo seria **desfazer 3 commits**.
  3. `git reset` (mixed, sem `--hard`) para reconstruir o indice a partir do HEAD.
     Sem esse reset, **qualquer `.bat` que faca `git add -A` vai commitar as 146
     delecoes**.
  4. So depois, o push.

  **O commit desta sprint nao passou pelo indice quebrado** — foi montado num
  indice isolado (`GIT_INDEX_FILE`) semeado a partir do HEAD, com exatamente 2
  arquivos, e conferido depois: `git show HEAD:<arquivo>` bate byte a byte com o
  disco nos dois, LF em ambos. Como o `refs/heads/main.lock` bloqueou o
  `update-ref`, a ref foi escrita direto em `.git/refs/heads/main` (o mesmo arquivo
  de 41 bytes que o git escreveria). **Valor anterior, caso precise voltar:
  `101ef40fd4e532d2c2b3df58bf950288be5c1268`.** O commit desta sprint e
  `da9eb84`, pai `101ef40`. Nada foi enviado: **o push continua sendo seu.**

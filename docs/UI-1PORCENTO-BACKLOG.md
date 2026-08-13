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
5. **Fade-up nas secoes ao rolar.** Antes: secoes ja estao la → depois: `.sec-h`/grids
   entram fade-up 1x (IntersectionObserver; estado inicial VISIVEL — animacao e
   progressive enhancement). Porque: ritmo vertical coreografado. Rollback: remover classe.

### SEMANA 2 — dias 6-10: "O PRODUTO GANHA O BRILHO"
Resultado visivel: /generate e o video pronto parecem a landing, nao um admin.

6. **Skeleton loaders no /generate.** Antes: spinner generico → depois: skeleton com
   shimmer no formato do resultado (card 9:16 + linhas de script). Porque: Higgsfield
   nunca mostra spinner — mostra a forma do que vem. Rollback: voltar ao spinner.
7. **Cerimonia do video pronto.** Antes: player cru → depois: moldura 9:16 com glow
   #2997ff + fade-in + confete discreto 1x. Porque: o momento de maior dopamina merece
   o acabamento da landing. Risco: exagero — manter sutil. Rollback: componente isolado.
8. **Skeleton no /history.** Antes: spinner no My Videos → depois: grade de cards 9:16
   em shimmer. Porque: mesma regra do dia 6 em toda pagina interna. Rollback: trivial.
9. **Toast animado de download/copy.** Antes: feedback nenhum ou alert → depois: toast
   slide-in com check animado (`--dur-fast`). Porque: microconfirmacoes = polish sentido.
   Rollback: remover componente.
10. **Hover-preview nos cards do dashboard/viral-now.** Antes: cards estaticos →
    depois: scale+sombra `--sh-card` no hover, igual a landing. ⚠️ Tocar DashboardClient
    E ViralNowClient (regra dos pares!). Rollback: CSS only.

### SEMANA 3 — dias 11-15: "CONSISTENCIA TOTAL" (os tokens em TODAS as paginas)
Resultado visivel: home, /generate, /pricing, /signup, /history — mesma pele.

11. **Raios orfaos → escala unica.** Antes: 15 px soltos + 6 rounded-* → depois: todo
    raio vem de --r-xs/sm/md/lg/pill (mapa de conversao: 6/8/11/12→xs, 13/14→sm,
    16/18→md, 20/24/30→lg, 980/9999→pill; rounded-xl(12px)→sm etc.). Porque: item 5 do
    sistema deles. Fazer por pagina, screenshot antes/depois. Rollback: git revert.
12. **Cinzas e timings → tokens.** Antes: 21 tons no KLP + 14 duracoes → depois: os 9
    tons e 3 duracoes/2 easings da tabela, com find&replace auditado (nenhuma mudanca
    visual percebida a olho — e consolidacao, nao redesign). Rollback: git revert.
13. **Focus-visible consistente em tudo.** Antes: .btn tem, cards parcial → depois:
    anel `--accent` padrao em todo interativo, todas as paginas. Porque: acabamento
    de verdade inclui teclado. Rollback: CSS.
14. **Nav com estado ativo.** Antes: links sem indicacao → depois: realce animado da
    secao visivel (IntersectionObserver, nunca scroll listener). Porque: a nav deles
    responde ao contexto. Rollback: remover observer.
15. **Posters .jpg → .webp.** Antes: ~134 KB jpg → depois: ~90 KB webp (`<picture>`
    com fallback). Porque: Higgsfield serve webp. Risco: nenhum com fallback.
    Rollback: trocar extensao.

### SEMANA 4 — dias 16-20: "O ACABAMENTO QUE NINGUEM NOTA MAS TODOS SENTEM"
Resultado visivel: dia 20 = screenshot lado a lado com o Higgsfield passa no teste.

16. **Empty states com personalidade.** Antes: "No videos yet" seco → depois:
    ilustracao SVG no traco do toolkit + CTA (/history, dashboard). Porque: acabamento
    e o que acontece nos cantos vazios. Rollback: texto antigo.
17. **Micro-brilhos: sheen no CTA + count-up no LiveStatsBadge.** Antes: botao branco
    estatico, numero estatico → depois: brilho diagonal 1x no load/hover (CSS only) e
    count-up 600ms 1x com numero real. Porque: o CTA deles tem vida sem gritar; prova
    social viva. Risco: cafona se repetir — 1x so. Rollback: 2 classes.
18. **Transicao landing → /signup.** Antes: navegacao seca → depois: fade curto (View
    Transitions API, fallback nulo = comportamento atual). Porque: continuidade de
    mundo. Rollback: remover meta.
19. **/examples vivo + palco no /examples/[slug].** Antes: posters estaticos e player
    simples → depois: mesmo motor do HeroGallery (extrair hook `useViewportVideo`) na
    grade, e pagina de detalhe com video centrado + glow + prompt original ("veja como
    foi feito"). Porque: catalogo vivo (item 8) + eles vendem o processo. Risco: escopo
    — manter 1 pagina. Rollback: layout antigo.
20. **AUDITORIA FINAL LADO A LADO.** Screenshot da home Kineo x home Higgsfield na
    mesma janela; rodar o checklist "Como saberemos" abaixo, item por item, com numeros
    (grep de raios/cinzas/duracoes + Lighthouse vs baseline); registrar no Diario o que
    passou e o que vira backlog v2. Sem codigo novo neste dia — so medicao e correcao fina.

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

- **12/08** — Dia 1 ✅ (galeria viva, commit c932c11). Roadmap reestruturado em 4
  semanas com destino + tokens extraidos do CSS real do Higgsfield (10 bundles) +
  auditoria numerica do Kineo (15 raios px / 21 cinzas / 14 duracoes) + criado
  lib/uiTokens.ts. Baseline curl registrado; Lighthouse ficou como pendencia (quota PSI).
- **13/08 (manha, pedido direto do fundador)** — Dias 2, 3 e 4 ✅ num pacote so:
  crossfade poster→video no `playing`, cascata 60ms/card na galeria, hover zoom
  1.04 no conteudo. Tokens --dur-*/--ease-* estreiam no .klp. tsc limpo.
  Semana 1 agora so deve o dia 5 (fade-up das secoes) — fica para a sprint das 14h.

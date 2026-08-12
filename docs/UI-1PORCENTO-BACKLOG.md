# UI 1% AO DIA — Backlog Higgsfield-grade [KINEO-UI-NORTH-STAR-2026-08-12]

Pedido do fundador: o Kineo com o acabamento do https://higgsfield.ai/ — em especial
"esses vídeos que ficam passando na tela". Método: **1 item por sprint**, nunca um
redesign. Cada item é isolado, tem antes→depois, o porquê emprestado do Higgsfield,
e rollback.

## O sistema do Higgsfield (dissecado em 12/08, HTML real de 6,3 MB via curl)

O HTML vem renderizado (Next/SSR) — deu para ler os elementos de verdade:

1. **Vídeo em loop mudo em TODO card**: `<video loop muted playsinline
   disablePictureInPicture preload="none">`, MP4 curto por card servido de CDN
   própria (`cdn.higgsfield.ai/card/*.mp4`), poster `.webp` nos banners. É o item
   que mais explica o "parece caro": a página inteira se move sem pedir nada.
2. **preload="none" em 100% dos vídeos** (7 de 7 medidos): quem decide baixar é o
   JS quando o card entra na tela — o peso segue o olhar, não o pageload.
3. **Paleta quase monocromática**: preto profundo + branco; cor só em badges
   ("New", "30% OFF"). O conteúdo (vídeo) é a única coisa colorida.
4. **Tipografia contida**: sans neutra via Google Fonts, títulos curtos com
   tracking negativo, quase nenhum parágrafo — o vídeo é a copy.
5. **Raios grandes e consistentes**: `rounded-3xl` (24px) e `rounded-[20px]`
   repetidos em card, banner e vídeo — nenhum raio "solto".
6. **Texto sobre vídeo com gradiente inferior** — título sempre legível sobre
   qualquer frame (o Kineo já faz isso no `.vcard::after`).
7. **Primeira dobra = carrossel de banners em vídeo full-bleed** + nav enxuta com
   um único CTA persistente (Sign up). Zero explicação antes da prova.
8. **Densidade de grade**: fileiras de muitos cards (presets, comunidade), cada um
   com CTA próprio ("Generate") — o catálogo é a landing.
9. **Microinterações discretas**: hover com leve scale/brightness no vídeo,
   transições curtas; profundidade por sombra e overlay, não por bordas grossas.
10. **Prova social integrada aos cards** (autor "by Higgsfield Studio", "Public",
    contadores) em vez de seção separada de depoimentos.

## Auditoria honesta do Kineo (KineoLanding/KLP_CSS + HeroGallery + HomeTopicForm)

**Já no nível Higgsfield:** dark real (#000) com paleta disciplinada (1 azul de
marca); tokens de raio/sombra (`--r-*`, `--sh-*`); gradiente de legibilidade no
vcard; hover com lift+glow em card/plan/tcard; `prefers-reduced-motion` respeitado;
posters lazy; 6 provas reais na 1ª dobra (Higgsfield-style, e são exports do
próprio produto — mais honesto que o deles).

**Perto:** vídeos existiam mas só o card 0 tocava (resolvido no item #1, 12/08);
raios têm 2-3 valores fora dos tokens (13px cbtn, 18px hvid vs --r-md 18/--r-lg 22
— o hvid combina, o cbtn não); transições existem mas nada "entra" animado.

**Longe:** páginas internas (/generate, vídeo pronto, /history) não têm o brilho
da landing — spinners genéricos, sem skeleton, sem cerimônia no vídeo pronto;
posters em .jpg (Higgsfield usa .webp); zero animação de entrada/scroll.

**NÃO MEXER (decisões do fundador):** caixa do composer 667×432 (medida em
06/08); espaçamentos do hero em clamp() por vh (08/08); "Start free" → /signup;
preço/copy/oferta — nada disso entra neste backlog.

---

## Os 20 (ordem = prioridade; 1-5 são impacto máximo por esforço)

Formato: **antes → depois** · porquê (Higgsfield) · risco/rollback.

1. **✅ FEITO 12/08 — Galeria viva: os 6 cards tocam sozinhos em viewport.**
   Antes: só o card 0 tocava; os outros 5 eram poster + hover → depois: os seis
   loopam mudos quando visíveis, poster continua sendo o primeiro paint.
   Porquê: é O elemento que o fundador apontou no Higgsfield. Risco: peso em
   mobile — mitigado (preload="none", download só do que intersecta, Save-Data/2g
   e reduced-motion ficam no poster, NotAllowedError volta ao poster+badge).
   Rollback: reverter app/HeroGallery.tsx (1 arquivo).

2. **Crossfade poster→vídeo.** Antes: troca seca img→video no primeiro frame →
   depois: vídeo entra com opacity 0→1 em ~250ms sobre o poster. Porquê: no
   Higgsfield nenhum elemento "pisca" — tudo desliza. Risco: quase zero (CSS +
   evento `playing`); rollback: remover a classe.

3. **Entrada em cascata da galeria.** Antes: os 6 cards aparecem de uma vez →
   depois: fade-up 300ms com delay de 60ms por card no primeiro paint (CSS
   `animation-delay`, desligado em reduced-motion). Porquê: o Higgsfield sente
   "coreografado" já na primeira dobra. Risco: CLS se mal feito — usar só
   opacity/transform; rollback: remover keyframes.

4. **Hover de vídeo com zoom sutil.** Antes: card dá lift mas o vídeo é estático
   dentro → depois: `.vcard:hover .hvid{transform:scale(1.04)}` com transition.
   Porquê: microinteração assinatura de galeria premium (o conteúdo responde,
   não só a moldura). Risco: overflow — o vcard já tem overflow:hidden;
   rollback: 1 regra CSS.

5. **Skeleton loaders no /generate.** Antes: spinner genérico enquanto gera →
   depois: skeleton com shimmer no formato do resultado (card 9:16 + linhas de
   script). Porquê: Higgsfield nunca mostra spinner — mostra a forma do que vem.
   Risco: só visual; rollback: voltar ao spinner.

6. **Cerimônia do vídeo pronto.** Antes: player cru quando o Short fica pronto →
   depois: moldura 9:16 com glow azul da marca + fade-in + confete discreto na
   primeira vez. Porquê: o momento de maior dopamina do produto merece o
   acabamento da landing. Risco: exagero — manter sutil; rollback: componente
   isolado.

7. **Posters .jpg → .webp.** Antes: ~134 KB de jpg → depois: ~90 KB de webp
   (mesmos frames, `<picture>` com fallback). Porquê: Higgsfield serve poster
   .webp. Risco: nenhum com fallback; rollback: trocar extensão de volta.

8. **Unificar raios órfãos nos tokens.** Antes: cbtn 13px, mobile menu etc. fora
   de --r-md/--r-lg → depois: todo raio vem de token (criar --r-sm:13px se
   preciso). Porquê: consistência de raio é o item 5 do sistema deles. Risco:
   zero; rollback: git revert.

9. **Autoplay em viewport também em /examples.** Antes: página de exemplos com
   posters estáticos → depois: mesmo motor do HeroGallery (extrair hook
   `useViewportVideo`). Porquê: catálogo vivo = item 8 do Higgsfield. Risco: já
   mitigado no item 1; rollback: voltar a poster.

10. **Nav com estado ativo.** Antes: links da nav sem indicação de seção →
    depois: underline/realce animado do link da seção visível (scroll-spy leve).
    Porquê: nav do Higgsfield responde ao contexto. Risco: jank — usar
    IntersectionObserver, não scroll listener; rollback: remover observer.

11. **Sheen no CTA primário.** Antes: botão branco estático → depois: brilho
    diagonal que passa 1x no load e no hover (CSS only). Porquê: o CTA deles tem
    vida sem gritar. Risco: cafona se repetir — 1x só; rollback: 1 classe.

12. **Fade-up nas seções ao rolar.** Antes: seções abaixo da dobra já estão lá →
    depois: cada `.sec-h`/grid entra com fade-up 1x (IntersectionObserver +
    classe, reduced-motion off). Porquê: ritmo vertical coreografado. Risco:
    conteúdo invisível se JS falhar — estado inicial visível, animação é
    progressive enhancement; rollback: remover classe.

13. **Skeleton no /history.** Antes: spinner ao carregar My Videos → depois:
    grade de cards 9:16 em shimmer. Porquê: mesma regra do item 5 em toda página
    interna. Risco: zero; rollback: trivial.

14. **Hover-preview nos cards do dashboard/viral-now.** Antes: cards estáticos →
    depois: leve scale + sombra no hover, consistente com a landing (mesmos
    tokens --sh-*). Porquê: o app interno deve parecer o site. Risco: tocar
    DashboardClient E ViralNowClient (regra dos pares!); rollback: CSS only.

15. **Empty states com personalidade.** Antes: "No videos yet" seco → depois:
    ilustração SVG no traço dos 8 ícones do toolkit + CTA. Porquê: acabamento é
    o que acontece nos cantos vazios. Risco: zero; rollback: texto antigo.

16. **Toast animado de download/copy.** Antes: feedback nenhum ou alert →
    depois: toast slide-in com check animado. Porquê: microconfirmações = polish
    sentido, não visto. Risco: zero; rollback: remover componente.

17. **Focus-visible consistente em tudo.** Antes: .btn tem, cards têm parcial →
    depois: anel azul padrão da marca em todo interativo. Porquê: acabamento de
    verdade inclui teclado. Risco: zero; rollback: CSS.

18. **Contadores que sobem no LiveStatsBadge.** Antes: número estático →
    depois: count-up 600ms na primeira visualização. Porquê: prova social viva
    (item 10 deles). Risco: parecer fake — animar 1x, número real; rollback:
    remover animação.

19. **Transição entre landing → /signup.** Antes: navegação seca → depois: fade
    curto de saída/entrada (View Transitions API com fallback nulo). Porquê:
    continuidade de mundo, sensação de app. Risco: suporte parcial — fallback é
    o comportamento atual; rollback: remover meta.

20. **Página /examples/[slug] com palco.** Antes: player simples → depois: vídeo
    centrado com glow, prompt original ao lado ("veja como foi feito") no estilo
    "Explore the inside of every project" do Higgsfield. Porquê: eles vendem o
    processo, não só o output. Risco: escopo — manter 1 página; rollback:
    layout antigo.

## Prova de peso do item 1 (medido em 12/08)

- MP4s dos 6 cards (previews 5s, 360x640, sem áudio): 135–314 KB cada,
  **1,43 MB total**; posters ~134 KB.
- LCP intacto: poster continua sendo o primeiro paint; os `<video>` dos cards
  1-5 só montam após `window load` + `requestIdleCallback`, e com
  `preload="none"` montar não baixa nada — o download começa no `play()` do
  IntersectionObserver, card a card, só ≥35% visível.
- Mobile: o trilho mostra ~3 cards → só esses baixam (~700 KB pós-idle);
  Save-Data e 2g não fazem autoplay nenhum.
- CLS: zero — poster e vídeo são camadas `absolute inset-0` no mesmo box
  `aspect-ratio:9/16`, e o poster do `<video>` é o mesmo jpg já em cache.

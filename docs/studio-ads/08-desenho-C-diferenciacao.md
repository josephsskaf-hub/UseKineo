# Studio Ads — desenho C: "diferenciação" (14/25)

> Saída bruta de um agente do workflow `studio-ads-pesquisa-e-plano` (24/09/2026 ~05h-06h BRT), guardada porque "o que só existe no chat some". Fatos com URL foram lidos naquele momento; file:line conferidos em `C:\kineo-wt\analise-0923` na main ed065b91. Origem: desenhista C.

# C — o que nenhum concorrente entrega e os motores da casa já fazem: o produto REAL da empresa virando cena em movimento (foto → Seedance i2v), o dono REAL apresentando com a própria voz clonada (Kling Avatar v2 + MiniMax clone), e o cliente nunca vendo um ator sintético. Dia 1 = beta fechada para 3 empresas com operador no circuito; produto real DENTRO de cena gerada (Kontext/Nano Banana edit) e apresentador em 15-30 s ficam para a semana 2.
# Studio Ads — Ângulo C: "seu produto, seu rosto, sua voz" (plano para 25/09/2026)

> Base: pesquisa de 5 leitores + conferência no código em `C:\kineo-wt\analise-0923` (nada modificado). Toda linha citada foi lida hoje.

## 1. O que é (voz de press release, 5 linhas)

Kineo lança o **Studio Ads**: a pequena empresa sobe o que já tem — fotos do produto, uma selfie do dono, 20 segundos de áudio, o logo — e recebe em minutos um anúncio vertical com narração, legendas, música original e cartão final com a marca. Diferente de Creatify, Arcads ou HeyGen, não há ator sintético: **o produto que aparece é o produto da empresa, em movimento; a voz que narra pode ser a do próprio dono**. Cada briefing sai em três cortes (30 s / 15 s / 6 s) prontos para Meta, TikTok e YouTube. Sem trial que vira anual, sem crédito que expira, com prévia audível antes de gastar. Beta fechada a partir de 25/09 para três empresas; abertura pública depois do primeiro anúncio real aprovado por cada uma.

*(O que o press release NÃO diz porque não roda: "centenas de formatos", "seu produto na mão de um apresentador", "anúncio de 15 s com você falando".)*

## 2. Porta de entrada

**Dia 1 — duas portas, nenhuma página pública nova** (o /empresas segue protótipo congelado, DECISIONS.md:279):

1. **Cartão no cockpit do /studio** — o mesmo lugar do cartão DFY v3 (`StudioClient`, "dfy_card_v3", `lib/growth/dfyOffer.ts:88`). Hoje o cartão diz "Want a human editor to make it?" com Express/Pro. Ganha um terceiro botão: **"Do it myself in Studio Ads (beta)"**. Quem já paga plano entra direto; quem não paga vai ao checkout do acesso (§3).
2. **Link direto `/studio/ads`** (tela nova, rota do grupo `(dashboard)`), para os 4 rascunhos de e-mail aos leads quentes do DFY e para o fundador mandar à mão. Sem login → `/signup?next=/studio/ads` (sondar com curl antes de mandar e-mail — memória "sondar o destino do link").

**Fora do dia 1:** página pública `/ads` com vitrine, entrada no mega-menu, pricing público. Motivo: o congelamento da grade até 09/10 e a regra "peça sem superfície não existe" — primeiro provar com 3 clientes que a esteira entrega, depois abrir a porta grande.

## 3. Modelo de acesso (como paga, como o servidor sabe, o que reaproveita)

**Fato duro:** hoje quem paga pelo Payment Link do DFY continua `has_paid=false` e leva **402 no upload de footage** (`app/api/footage/route.ts:183` exige `treatAsPaid`). O Studio Ads morre no primeiro clique se o acesso não passar por onde o crédito passa.

**Desenho recomendado (Claude, servidor):**

- **SKU one-time `?pack=ads_beta`** no padrão `buildPackAndRedirect` do checkout (`mode: 'payment'`, `metadata.pack='ads_beta'`, `metadata.pack_credits=N`, `success_url=/studio/ads?resume=…`). O webhook já credita `pack_credits` pelo Path A (`app/api/stripe/webhook/route.ts:1278-1307`), o que liga `has_paid=true` e **destrava o footage sem tocar o portão**. Valor em centavos **não pode** ser 290/490/590/900/1290/1490/1900/3500/4900/5990/7500/9900/10000/19900/29900/39900 (fallback por valor do webhook); entrar em `checkPricingInvariants()`.
- **Fato de acesso separado do crédito:** migration `profiles.ads_access_until timestamptz` (mesmo molde do `plan_expires_at` do piloto Autopilot) gravada pelo webhook quando `metadata.pack` começa com `ads_`. A tela `/studio/ads` e a rota `/api/ads/*` leem `ads_access_until > now() OR plano pago`. Assinante de plano (starter/basic/pro) entra sem pagar de novo — o Studio Ads é *ferramenta* para quem já paga e *porta* para quem não paga.
- **Cobrança do render:** crédito universal, como o bulk aceita. Kineo 1 = 5 cr, i2v de produto = novo custo (§5), avatar = 70 cr (`generate-avatar/route.ts:244`), clone = 10 cr (`engineCost.ts:204`). O pack traz folga para 2 re-renders (regra do bulk: ×2 + 20%).
- **Alternativa se o fundador quiser Payment Link em vez de checkout:** o webhook já reconhece `kind=dfy` por plink id/valor (`webhook/route.ts:831-887`); um `kind=ads` idêntico grava `ads_access_until` — mas precisa **também** conceder crédito, senão repete o 402. Mais frágil (sem `client_reference_id` garantido); só se o checkout não couber no dia.

**Eventos do degrau:** `ads_checkout_started {pack, source}` → `ads_access_granted {pack, credits, until, via: 'pack'|'plan'}` → `ads_access_denied {reason: 'no_access'|'expired'}`.

**Opções de preço (decisão do fundador; margens sobre custo direto, §5):**

| Opção | Faixa | O que inclui | Margem no pior caso |
|---|---|---|---|
| (a) Passe de acesso | US$29 / 100 cr (US$12 / 50 cr para degrau B) | Studio Ads + 100 cr ≈ 20 anúncios Kineo 1 ou 4 com produto em movimento | 58-68% |
| (c) Por anúncio | Quick US$9 (Kineo 1) · Product US$19 (i2v) · Presenter US$29-49 (avatar 45-60 s) | 1 anúncio em 3 cortes + 2 re-renders | 62-80% |
| add-ons | Clone de voz US$9 (custo US$1,50) · 2º idioma US$4 | — | >80% |

Leitura minha (não decisão): **(c) primeiro** — é a mesma escada do balcão (Express/Pro) self-service e 3-4× mais barata; não toca a grade congelada. Duas faixas por DEGRAU (motor), nunca por país (V6 morreu em 19/08).

## 4. Fluxo tela a tela (automático × operador no dia 1)

**Tela 0 — Acesso.** Cartão → checkout `?pack=ads_beta` → volta com `resume`. Evento `ads_access_granted`.

**Tela 1 — Brief (3 campos + 2 opcionais).** Os mesmos 3 do DFY (nome + o que vende · CTA do último quadro · idioma) + **oferta/preço/prazo** + **endereço/telefone/link** (sem eles o roteiro inventa ou omite). Segmento (restaurante, loja, clínica, serviço, imóvel, curso, outro). *Automático.* `ads_brief_saved {segment, has_offer, has_contact, lang}`.

**Tela 2 — Mídia.** Quatro gavetas com `kind` explícito: **fotos do produto/loja** (jpg/png), **vídeo** (mp4/mov/webm ≤50 MB — aviso antes do upload: "vídeo de celular 4K de 90 s não cabe; corte para 30 s"), **logo** (png), **selfie do dono + 20 s de áudio** (só se escolher "eu apresento"/"minha voz"). Reaproveita `/api/footage` (`upload-url` → PUT direto → `confirm`, `route.ts:201-274`); o `kind` da tabela só sabe image|audio|video (`:245,:255`) — o papel (product/logo/selfie/voice) fica em metadata do evento e no estado da tela no dia 1; coluna `role` em `user_footage` na semana 2. *Automático.* `ads_media_uploaded {role, kind, bytes}`; `footage_refused` já existe para as recusas.

**Tela 2b — Consentimento (só rosto/voz).** Checkbox com o texto que já existe (`AvatarStudioClient.tsx:1360`: "I confirm I have the right to use this person's image…") + segundo checkbox para voz + aviso: "Rosto gerado por IA recebe o rótulo 'Made with AI' na Meta". *Automático, e vira evento* — hoje o checkbox não grava nada. `ads_consent_attested {face:bool, voice:bool, ip_hash}`.

**Tela 3 — Modelo.** 6 cartões (§5). Cada um mostra: custo em créditos, tempo estimado, o que precisa (ex.: "3 fotos", "selfie + áudio"), selo do motor. *Automático.* `ads_template_selected {template, engine, est_credits}`.

**Tela 4 — Roteiro.** Rota nova `/api/ads/brief` (GPT-4o-mini) gera **3 variantes de gancho** sobre o mesmo corpo (pergunta / número / resultado-primeiro), com a estrutura gancho → prova → oferta → CTA (não HOOK/MICRO REWARD/PAYOFF). Pessoa escolhe, edita, e o texto vai ao render como **verbatim** ("Use my script as is") — o Kineo 1 já divide prosa sem marcadores em blocos determinísticos. Botão **"ouvir a voz"** (MiniMax 2.8 HD, ~US$0,01) antes de gastar. *Automático.* `ads_script_generated {variants:3, words}` · `ads_script_edited` · `ads_voice_previewed {voice_id, cloned:bool}`.

**Tela 5 — Prévia (o momento mágico).** Storyboard: cada bloco do roteiro com a foto/clipe do cliente que vai entrar, o cartão final renderizado com o logo dele, o áudio da narração tocando. **Ainda não gastou crédito de render.** Se escolheu "produto em movimento": botão "animar esta foto" chama `/api/ads/motion` (§5) e mostra o clipe de 5 s **antes** de montar o filme. *Automático; operador vê a mesma tela no /admin.* `ads_preview_shown {scenes, user_media_scenes, stock_scenes}` · `ads_motion_requested/served/failed`.

**Tela 6 — Render.** Dispara o Kineo 1 (`generate-video-fast`) com `script_mode:'verbatim'`, `brollScenes[i].userFootageUrl` **mapeado por cena** (não posicional como o GenerateClient faz em `:9861`), o cartão final pinado à última cena, e o clipe i2v pinado à cena do produto. Dry-run US$0 antes (contas internas) no primeiro render de cada cliente. *Dia 1: o render é automático, mas o botão "entregar" é do OPERADOR* — o filme cai numa fila `/admin/ads` e só vai ao cliente depois do QA visual (logo legível? produto derreteu? rosto certo?). `ads_render_requested {template, engine, credits}` → `ads_render_served {video_id, seconds, cost_usd}` / `ads_render_failed {reason}` → `ads_qa_decided {approved:bool, reason}`.

**Tela 7 — Entrega.** Página `/v/<id>` privada + download + e-mail "seu anúncio está pronto" + botão "gerar os outros 2 cortes (15 s e 6 s)" — no dia 1 os cortes extras são **novos renders do mesmo brief** (não há ffmpeg para recortar), cobrados como Kineo 1. `ads_delivered {video_id}` · `ads_download` · `ads_revision_requested {what}` (máx. 2, contador por pedido).

**O que é operador no dia 1 e por quê:** QA visual antes da entrega (o produto não tem como saber se o logo derreteu ou se o rosto é outra pessoa); aprovação do clipe i2v; leitura do consentimento em caso de rosto que pareça pessoa pública. Teto: **3 pedidos abertos** (reaproveita `DFY_MAX_OPEN_ORDERS = 3`, `dfyOffer.ts:90`).

## 5. Modelos de anúncio do dia 1 (6) e o mapa nos motores

Todos saem em 9:16; 1:1 e 16:9 na semana 2.

| # | Modelo | Duração | Fonte visual | Motor / bloco existente | Custo direto | Créditos sugeridos | Dia 1? |
|---|---|---|---|---|---|---|---|
| 1 | **Produto em movimento** (ângulo C) — 2-3 fotos do produto viram cenas de 5 s com câmera lenta; narração com oferta; cartão final | 15-20 s | fotos do cliente → i2v | **Rota nova `/api/ads/motion`**: chama `fal-ai/bytedance/seedance/v1.5/pro/image-to-video` 720p 9:16 5 s sem áudio (US$0,13/cena; id já wired em `generate-video-cinematic/route.ts:263`), copia o MP4 para `user-footage/<uid>/ads-<id>.mp4` (mesmo padrão de cópia de `lib/fastAiScene.ts:130`) e insere `user_footage kind=video`; o Kineo 1 o trata como clipe do cliente (`generate-video-fast/route.ts:1250-1256`) | 3 × US$0,13 + Kineo 1 US$0,35 ≈ **US$0,75-1,00** | 8-10 cr/cena i2v + 5 cr filme (≈ 30 cr) | **Sim (beta)** — QA do clipe pelo operador |
| 2 | **Vitrine em fotos** — 6-10 fotos com Ken Burns, narração, cartão | 20 s | fotos | Kineo 1 + My footage (foto vira `image` com Ken Burns, `lib/compose.ts:2329-2346`) | ≈ US$0,45 | 5 cr | Sim |
| 3 | **Meu vídeo + narração + cartão** — o clipe do cliente cortado em trechos por cena, narração por cima, legendas | 15-30 s | vídeo do cliente | Kineo 1 + My footage (clipe entra mudo, `compose.ts:2346`; trim decidido no servidor `:2341`) | ≈ US$0,45-0,70 | 5 cr | Sim — avisar "o áudio original do vídeo não entra" |
| 4 | **Oferta relâmpago / contagem** — número gigante, 3 fotos, prazo, cartão | 15 s | fotos | Kineo 1 + My footage + Lyria (humor "upbeat comercial" = só prompt em `lib/lyriaMusic.ts` — trava 8.2, então no dia 1 usa humor existente `hustle`) | ≈ US$0,40 | 5 cr | Sim |
| 5 | **História do fundador com a voz dele** (ângulo C) — fotos antigas/atuais + narração na voz clonada | 45-60 s | fotos + 20 s de áudio | Clone MiniMax (`/api/avatar/voice`, 10 cr, `lib/avatar/voice.ts` TTS no speech-02-hd) + Kineo 1 com `use_cloned_voice`/`user_voiceover_url` (compose já pula TTS) — **conferir que a rota fast aceita voice_id clonado; se só o compose aceitar, o dia 1 usa "voz própria" (áudio gravado pelo dono, kind audio) e o clone fica para a semana 2** | US$1,50 (1×) + US$0,55 | 10 + 5 cr | Sim, com a ressalva acima |
| 6 | **O dono apresenta** (ângulo C) — selfie + roteiro → apresentador falando | **45-60 s** | selfie + voz (clonada ou TTS) | Avatar Studio existente: `presenter` = Kling AI Avatar v2 Std (`lib/avatar/veed.ts:46`, US$0,0562/s), 70 cr (`generate-avatar/route.ts:244`), consentimento `AvatarStudioClient.tsx:1360` | US$3,37 + US$0,50 | 70 cr | **Sim, só 45-60 s** — a rota trava `MIN_DURATION = 45` (`route.ts:80,:246-253`). Anúncio de 15-30 s com apresentador = semana 2 |

**Combinatória honesta para a copy:** 6 modelos × 3 ganchos × 41 idiomas (MiniMax `language_boost`) = "dezenas de variações do seu anúncio", nunca "centenas de formatos".

**Semana 2 (não prometer no dia 1):**
- **Produto real DENTRO de cena gerada**: Nano Banana Pro `/edit` (não wired; só o t2i `fal-ai/nano-banana-pro` existe) ou `flux-pro/kontext` (wired em `lib/avatar/scene.ts:12`, US$0,04, hoje usado para "a mesma pessoa em outro cenário" — `generateSceneImage`, `swapFaceOntoScene`) → still 9:16 → Seedance i2v. Exige QA humano: logo pequeno e telefone derretem.
- **O dono na frente da loja gerada**: `generateSceneImage` (Kontext) + OmniHuman — a lib existe, falta a tela expor.
- **Apresentador em 15-30 s**: afrouxar `MIN_DURATION` por parâmetro `ads:true` em `generate-avatar` (fora da trava 8.2; mas ler o motivo do lock em `:247` — "EXPANDED scripts fit" — e rodar dry-run).
- **Logo persistente no canto** durante o filme inteiro: `type:'image'` overlay no Creatomate — **toca `lib/compose`, trava 8.2, exige "vai" nominal**.
- **Re-dublar o vídeo real do dono** com narração nova: `sync-lipsync/v3` (US$8/min, `veed.ts:30`).
- 1:1 e 16:9; ducking por fatias; `role` em `user_footage`; pré-corte no browser (`lib/videoEditing`) antes do upload.

## 6. Mídia do cliente

- **Upload:** `/api/footage` como está. Limites reais: 50 MB/arquivo, 500 MB/conta (`lib/userFootage.ts:12,16`), jpeg/png/mp4/mov/webm + áudio (`:24`); **não aceita webp/heic/svg** — logo tem de ser PNG (avisar na tela; iPhone manda HEIC por padrão → instrução "exporte como JPG/PNG"). Free = 402 (`route.ts:183`) — por isso o acesso precisa conceder crédito (§3).
- **Onde guarda:** bucket público `user-footage/<uid>/…`; as rotas só aceitam URLs com esse prefixo (`generate-video-fast/route.ts:597`, `generate-video-cinematic/route.ts:4780`). Clipes gerados pelo `/api/ads/motion` e o cartão final vão para a **mesma pasta** — assim entram no filme pela porta que já existe, sem código novo nas rotas de render.
- **Como entra no filme:** `brollScenes[n].userFootageUrl` por número de cena; o clipe do cliente vence vault e Pixabay sem fallback (`fast/route.ts:1250-1256`); foto = `image` + Ken Burns, vídeo = `video` cover, loop, trim, **volume 0%** (`compose.ts:2329-2346`). Cenas sem mídia do cliente caem no Pixabay — para anúncio, só a cena da "dor"; a solução é sempre mídia real.
- **Logo e cartão final (dia 1, sem tocar o compose):** a tela `/studio/ads` desenha o cartão em `<canvas>` no navegador (logo + nome + CTA + telefone/endereço + oferta, dentro da zona segura 14/35/6), exporta PNG, sobe por `/api/footage` como imagem e pina à **última cena** (2-3 s de fala: "Toca no botão e garante o seu"). Fidelidade 100%, custo zero, fora da trava. O Ken Burns aplica um zoom lento no cartão — aceitável. Evento `ads_card_rendered {has_logo, has_phone, has_address}`. Logo persistente no canto = semana 2 (§5).
- **Selfie e áudio do dono:** mesma rota; áudio ≥10 s para clone (MiniMax), 2-60 s e ≤5 MB para o Kling Avatar. O clone **é apagado se não for usado em TTS em 7 dias** — o dia 1 usa o voice_id na hora; lembrete em 5 dias na semana 2.
- **O que não dá:** validar duração/codec no servidor (o arquivo nunca é aberto; MOV HEVC de iPhone precisa de teste real no Creatomate antes do primeiro cliente), arquivo >50 MB, cortar "melhores momentos", remover fundo.

## 7. Eventos e leitura de 14 dias

**Nomes (todos com `ads_` na frente, `metadata.version:'ads_beta_v1'`):** `ads_card_seen` (cockpit) · `ads_checkout_started` · `ads_access_granted` · `ads_access_denied` · `ads_brief_saved` · `ads_media_uploaded {role}` · `ads_consent_attested {face,voice}` · `ads_template_selected` · `ads_script_generated` · `ads_script_edited` · `ads_voice_previewed` · `ads_motion_requested/served/failed {cost_usd, seconds}` · `ads_card_rendered` · `ads_preview_shown` · `ads_render_requested` · `ads_render_served {cost_usd}` · `ads_render_failed {reason}` · `ads_qa_decided {approved, reason, by}` · `ads_delivered` · `ads_download` · `ads_revision_requested` · `ads_cut_requested {seconds:15|6}`.

Regras que a casa já pagou para aprender: o `ads_render_served` é o único "entrega" (evento de impressão não prova conteúdo); contar **pessoas e dias**, não eventos; corte de medição = `metadata ? 'version'` (campo novo é o carimbo do deploy), nunca relógio; `ads_checkout_started` sem `ads_access_granted` em 1 h = vazamento de preço (conclusão fechada de 19/08).

**Leitura de 14 dias (o que decide abrir a porta pública):**
1. Dos 3 betas, quantos chegaram a `ads_render_served` **e** `ads_download`? Meta: 3/3 com ≤2 revisões.
2. Custo real por anúncio (`cost_usd` somado) vs. crédito cobrado — margem medida, não estimada (a constante `FAST_USD_PER_CREDIT` está velha).
3. `ads_qa_decided approved=false` por motivo: se "logo ilegível"/"produto derreteu" > 20%, o i2v de produto volta a operador-only.
4. Modelo mais escolhido (`ads_template_selected`) e o mais entregue — o ângulo C só vale se #1/#5/#6 forem escolhidos.
5. `ads_consent_attested` vs. `ads_template_selected {presenter}`: quem desistiu no consentimento (é o custo do rótulo "Made with AI").
6. `ads_voice_previewed` → `ads_render_requested`: a prévia audível converte ou assusta?
7. Retorno: pessoas com 2+ `ads_brief_saved` em dias diferentes (uma sessão por pessoa é o padrão da casa; anúncio semanal quebra isso ou não).

## 8. Guardiões (estilo `readFileSync`, nunca alias `@/` — os 72 que morrem no import)

1. `test-ads-acesso-concede-credito.mjs` — o webhook, ao ver `metadata.pack` começando com `ads_`, grava `ads_access_until` **e** passa pelo Path A de `pack_credits`; mutante que remove a concessão fica vermelho (a armadilha do 402).
2. `test-ads-sku-nao-colide.mjs` — o valor em centavos do(s) pack(s) `ads_*` não está em `AMBIGUOUS/DFY_ACCEPTED_AMOUNTS` nem na lista ocupada; entra em `checkPricingInvariants()`.
3. `test-ads-footage-prefixo.mjs` — `/api/ads/motion` só grava em `user-footage/<uid>/` e só aceita `image_url` com esse prefixo (nunca URL da fal direto — a URL expira e o compose recusa).
4. `test-ads-motion-cobra-antes.mjs` — reserva de crédito antes do POST na fal, estorno em falha, `ads_motion_failed {reason}` sempre gravado; mutante que troca o `if` por `true` fica vermelho (amarrar à variável que decide, não contar texto).
5. `test-ads-consentimento-obrigatorio.mjs` — template `presenter` ou voz clonada sem `ads_consent_attested` na mesma sessão → 403 no servidor, não só na tela.
6. `test-ads-cartao-ultima-cena.mjs` — o payload montado pela tela pina o PNG do cartão à cena de maior `sceneNumber` e nunca a uma cena do meio; mapeamento por número, não por posição.
7. `test-ads-trava-8-2.mjs` — o diff da entrega contra o pai do commit (não contra a main — "trava por diff fica verde ao mergear") não toca `lib/compose`, `lib/hollywood/`, `lib/cinematic/`, `lib/broll/`, `lib/lyriaMusic`, `lib/narrationFit`, `analyze-idea/`, `generate-script/`.
8. `test-ads-copy-honesta.mjs` — nenhuma string da tela contém "hundreds of formats", "any duration", "your product in the presenter's hand", "1080p"; e o modelo #6 exibe "45-60 s".
9. Rodar a suíte inteira antes de enfileirar (~4 min) e reconferir na ponta da fila (guardião verde na worktree, vermelho na fila).

## 9. Riscos e o que fica FORA

**Riscos (detalhe em `risks`):** i2v de produto muda o produto (rótulo, cor, forma) — por isso operador aprova o clipe; rosto/voz sem consentimento real; rótulo "Made with AI" na Meta derruba anúncio com apresentador; MOV HEVC não testado; clone expira em 7 dias; margem do avatar de 60 s a 70 cr; 3 betas com operador = tempo do fundador; a rota fast pode não aceitar voice_id clonado (só o compose); Creatomate ~20% da cota em 24 h.

**FORA do dia 1 (dito com todas as letras):** página pública /ads e pricing público; "centenas de formatos"; produto real dentro de cena gerada (Kontext/Nano Banana edit); apresentador em 15-30 s; logo persistente no canto (toca `lib/compose`); 1:1 e 16:9; cortes de 15 s/6 s por recorte (são novos renders); ducking; re-dublagem do vídeo do dono (lipsync); publicação direta em Meta/TikTok; URL → brief automático (raspar site); brand kit com cores/fonte; `role` na tabela `user_footage`; e-mail de lembrete do clone; qualquer preço público — o fundador decide.

## day_schedule
25/09/2026 (quinta) — blocos de 2 h, BRT. Pista CLAUDE = servidor/fluxo/cobrança/eventos/guardiões. Pista CODEX = visual das telas (HTML antes/depois em toda entrega visual, AGENTS §8). Worktree limpa sobre origin/main com junction de node_modules; tsc na base antes de começar (a ponta pode estar vermelha).

06:00-08:00
· CLAUDE: worktree + tsc; migration `profiles.ads_access_until`; SKU `?pack=ads_beta` no padrão buildPackAndRedirect (valor livre de colisão), webhook grava `ads_access_until` e credita `pack_credits` (Path A); guardiões 1 e 2 vermelhos→verdes.
· CODEX: esqueleto de `/studio/ads` (rotas do grupo dashboard) com as 7 telas como passos; terceiro botão no cartão DFY do cockpit ("Do it myself in Studio Ads (beta)"); HTML antes/depois do cartão.

08:00-10:00
· CLAUDE: rota `/api/ads/brief` (GPT-4o-mini): brief de 5 campos → 3 variantes de gancho, estrutura gancho→prova→oferta→CTA, saída verbatim ≤ palavras do alvo (15 s ≈ 35, 30 s ≈ 70, 60 s ≈ 140 a 2,3-3,1 pal/s); evento `ads_script_generated`; prévia de voz reaproveitando MiniMax 2.8 HD.
· CODEX: Tela 1 (brief) e Tela 2 (mídia com 4 gavetas por papel, avisos de 50 MB/PNG/HEIC), consumindo `/api/footage` como está; Tela 2b consentimento com os dois checkboxes e o aviso do rótulo.

10:00-12:00
· CLAUDE: rota `/api/ads/motion`: reserva de crédito → Seedance 1.5 i2v 720p 9:16 5 s sem áudio → cópia para `user-footage/<uid>/ads-<id>.mp4` → linha `user_footage` → eventos motion_requested/served/failed com `cost_usd`; guardiões 3 e 4.
· CODEX: Tela 3 (6 cartões de modelo com créditos, tempo, pré-requisitos, selo do motor; #6 exibe "45-60 s") e Tela 4 (roteiro: 3 ganchos, edição, botão ouvir voz).

12:00-14:00
· CLAUDE: servidor do consentimento (403 sem `ads_consent_attested` para presenter/voz clonada); montagem do payload do Kineo 1 no servidor (`/api/ads/render`): `script_mode:'verbatim'`, `brollScenes` mapeados por número de cena, cartão na última cena, clipe i2v na cena do produto; dry-run US$0 na conta interna; guardiões 5 e 6.
· CODEX: cartão final em `<canvas>` (logo + nome + CTA + telefone/endereço + oferta, zona segura 14/35/6) → PNG → upload por `/api/footage`; Tela 5 (storyboard com mídia por bloco, cartão e áudio).

14:00-16:00
· CLAUDE: fila `/admin/ads` (lista de renders com `ads_qa_decided`, botão aprovar/reprovar com motivo, teto de 3 abertos reaproveitando o padrão do DFY); e-mail "seu anúncio está pronto" só após aprovação; eventos delivered/download/revision.
· CODEX: Tela 6/7 (render com estimativa de custo e tempo antes do botão; entrega com `/v/<id>`, download, botão "gerar cortes de 15 s e 6 s" como novos renders); estados de erro honestos ("motor lento, 15-20 min").

16:00-18:00
· CLAUDE: canário real com conta interna: modelo #1 (3 fotos de produto → 3 clipes i2v → Kineo 1 20 s + cartão) e modelo #3 (MOV de iPhone ≤50 MB) — medir `cost_usd`, conferir o MOV no Creatomate; modelo #6 no Avatar Studio com selfie do fundador a 45 s; registrar em docs/.
· CODEX: passe de acessibilidade e mobile (16 px de gutter, sem scroll horizontal) nas 7 telas; copy honesta (guardião 8 como checklist); HTML antes/depois final.

18:00-20:00
· CLAUDE: guardiões 7, 8 e 9 (trava 8.2 contra o pai do commit; copy; suíte inteira ~4 min); reconferir na ponta da fila após `bash scripts/enfileirar.sh`; sonda com curl (UA identificável, com controle 404) de `/studio/ads` e do checkout `?pack=ads_beta`.
· CODEX: integração final das telas com as rotas reais; enfileirar pela branch codex/* limpa; HTML antes/depois anexado ao PEDIDOS-ENTRE-PISTAS.

20:00-22:00
· CLAUDE: "hora de clicar" para o fundador (SUBIR-SITE.bat); depois do deploy, sonda de produção; leitura zero (14 dias começa aqui, corte por `metadata.version='ads_beta_v1'`); 4 rascunhos de e-mail aos leads do DFY com o link `/studio/ads` (destino sondado), no Gmail do fundador; decisão registrada em docs/DECISIONS.md no mesmo dia.
· CODEX: reserva para regressões visuais apontadas pela sonda; nada novo depois das 21h.

## decisions
- NOME: 'Studio Ads' (ferramenta dentro do Studio) ou 'Kineo Empresas' (marca já usada no DFY) — o nome decide onde o cartão mora e o que o e-mail aos 4 leads diz.
- MODELO DE ACESSO: (a) passe único de acesso + créditos, (c) por anúncio em degraus (Quick/Product/Presenter), ou assinante de plano entra de graça e só não-assinante paga o passe. Minha leitura é (c) + grátis para quem já paga plano; a palavra é sua.
- PREÇO PÚBLICO (só opções, margens no §3): passe US$29/100 cr (US$12/50 cr no degrau B); por anúncio US$9 Kineo 1 · US$19 produto em movimento · US$29-49 apresentador 45-60 s; add-ons clone de voz US$9, 2º idioma US$4. Confirmar que nada disso encosta no congelamento dos 3 planos até 09/10.
- DEGRAUS: duas faixas por MOTOR (Quick/Product/Presenter), nunca por país (V6). Confirmar.
- CRÉDITOS DO i2v DE PRODUTO: 8 ou 10 cr por cena de 5 s (custo US$0,13; a US$0,133/cr dá 88-90% de margem). Escolher o número.
- CONSENTIMENTO DE ROSTO E VOZ: aprovar o texto dos dois atestados (rosto: reaproveitar o do Avatar Studio; voz: novo), a regra de recusa (pessoa pública/terceiro sem autorização = operador recusa e estorna) e o aviso do rótulo 'Made with AI' na Meta antes do render.
- QUEM OPERA O QA NO DIA 1: você ou eu pela fila /admin/ads (aprovar/reprovar clipe i2v e filme final antes do e-mail). Teto de 3 betas abertos — manter 3?
- OS 3 BETAS: escolher entre os 11 pedidos do DFY dos últimos 90 dias (5 Índia, 1 Nigéria, 5 EUA/Europa/Jordânia) — sugiro 1 de cada bloco para medir preço e mídia diferentes.
- 'VAI' OU 'NÃO' PARA A SEMANA 2 EM lib/compose (trava 8.2): logo persistente no canto e modo 'áudio original baixo + narração' exigem tocar o compose. Sem o 'vai', ficam fora para sempre.
- APRESENTADOR ABAIXO DE 45 s: autorizar afrouxar MIN_DURATION em generate-avatar por parâmetro ads:true (fora da trava, mas muda uma regra de produto sua de 13/06).
- CORTES EXTRAS (15 s e 6 s) COBRADOS COMO NOVO RENDER (5 cr cada) ou incluídos no preço do anúncio? Não há ffmpeg para recortar; cada corte é um filme novo.

## risks
- i2v altera o produto real (rótulo, cor, forma) em parte das cenas — sem QA automático possível; se operador reprovar >20% dos clipes, o modelo #1 vira operador-only e o ângulo C perde o carro-chefe.
- Rosto gerado recebe o rótulo 'Made with AI' na Meta desde 2026 e pode derrubar o anúncio do cliente; vender #6 sem o aviso vira reclamação pública (Trustpilot dos concorrentes é a prova).
- Consentimento é só atestado: a fal não verifica nada; um cliente subindo selfie de terceiro é risco jurídico da casa — recusa por operador e evento gravado são o único freio.
- Quem paga o acesso e continua has_paid=false leva 402 no upload (footage/route.ts:183) — se o webhook não creditar, o produto morre no primeiro clique; guardião 1 é obrigatório.
- MOV HEVC/HDR de iPhone nunca foi testado no Creatomate; arquivo >50 MB não sobe (vídeo 4K de 90 s estoura). O canário das 16h decide se o modelo #3 entra na beta.
- Clone de voz MiniMax é apagado se não for usado em TTS em 7 dias; e a rota fast pode não aceitar voice_id clonado (só o compose) — se for o caso, #5 sai com 'voz própria gravada' e o clone fica para a semana 2.
- Avatar travado em 45-60 s (generate-avatar/route.ts:80): o anúncio típico é 15-30 s; oferecer #6 sem dizer '45-60 s' é prometer o que não roda.
- Margem do apresentador: 70 cr a US$0,133-0,165/cr = US$9,3-11,5 de receita para US$3,9 de custo — ok; mas o Pro/OmniHuman (110 cr) a 60 s custa US$9,60 e a margem cai para ~35% no Starter.
- Constante FAST_USD_PER_CREDIT (0,066) está velha (medido 0,126 em 21/09): qualquer margem calculada pelo guardião de preço sai verde com número errado para a parte Kineo 1 — usar US$0,55/60 s medido.
- Creatomate limita ~20% da cota mensal em 24 h: 3 betas × 3 cortes × re-renders cabe; abrir para 30 clientes num dia não cabe sem subir o plano.
- Cartão final via Ken Burns em PNG é um still com zoom, não um cartão animado; e sem logo persistente no canto o anúncio perde o 'branding cedo e frequente' do ABCD do Google até a semana 2 (trava 8.2).
- Operador no circuito = tempo do fundador ou meu por pedido; se os 3 betas pedirem 2 revisões cada, são 18 QAs na semana — o teto de 3 abertos é o que protege.
- Cegueira de medição: `ads_*` novos sem denominador conhecido — ancorar cada número no `dfy_order_paid` e no `footage_refused` que já existem antes de publicar qualquer taxa.
- Dois desenhistas paralelos (ângulos A e B) podem propor outra porta/SKU: se o fundador escolher outro modelo de acesso, os blocos de 06:00-08:00 e 12:00-14:00 mudam; o resto (motion, brief, cartão, fila) sobrevive a qualquer modelo.

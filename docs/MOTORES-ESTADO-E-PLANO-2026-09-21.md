# MOTORES — ESTADO REAL E PLANO DE ATAQUE (21/09/2026, noite)

Pedido do fundador: "um resumo completo de como eles estão, o defeito de cada um, qual está bom para deixar no ar — amanhã vou atacar os defeitos de uma vez por todas. Semana de 4-5 pagantes novos."

Fonte: banco de produção, 30 dias (22/08 → 21/09), contas externas (fundador excluído), juiz v4 (`fast_coherence`), despachos (`cinematic_dispatch_result`), falhas (`generation_stage_error`). Medido às 23:50 BRT de 21/09.

## 1. O placar que manda no plano

| Motor | Tentativas 30 d | Pessoas | Pagantes que usaram | Nota do juiz (n) | Visual | < 70 | Veredito |
|---|---|---|---|---|---|---|---|
| **Kineo 1** | 509 | 312 | 6 | 73 (145) | **49** | 34% | MANTER — é o produto (trial = 100% das primeiras impressões) |
| **Seedance 1.5** | 317 | 237 | 5 | 73 (57) | 59 | 28% | MANTER — motor pago nº 1 |
| **Veo 3.1** | 5 | 1 | 1 | **90** (2) | 80 | 0 | MANTER — melhor qualidade, quase ninguém usa |
| Kling 2.5 | 4 | 4 | 2 | 50 (1) | 60 | 100% | AVALIAR — sem prova, 1 filme ruim |
| MiniMax H3 | 6 | 3 | 2 | sem juiz | — | — | AVALIAR — o juiz não cobre a estrada hollywood |
| Kling 3 | **0** externos | 0 | 0 | sem juiz | — | — | DECIDIR — 150 cr, ninguém pediu em 30 d |
| Omni Flash | 0 externos | 0 | 0 | sem juiz | — | — | DECIDIR — "#1 RANKED" na vitrine, 0 clientes |
| Seedance 2.5 | interno | — | — | — | — | — | FECHADO (S25_PUBLIC=false) até canário aprovado |
| Avatar | 0 na história | 0 | 0 | — | — | — | INVISÍVEL — anunciado, ausente dos seletores |

Leitura de dono: **os 8 pagantes dos últimos 30 dias usaram Kineo 1 e Seedance**. Os outros 6 motores somam 2 pagantes e 0 filmes julgados. A semana de 4-5 pagantes novos se ganha em DOIS motores, não em oito.

## 2. Defeitos por motor (com número)

### Kineo 1 (fast) — o que a pessoa nova vê primeiro
1. **A parede de narração migrou para cá.** Desde 19/09 (duração segue o roteiro no cinematic) a parede "your script is N s, you asked for N s" ZEROU no Seedance — e no Kineo 1 subiu de 0,8/dia para 3,7/dia (11 em 3 dias, 9 pessoas). O trial de 10 cr é só Kineo 1, então é a primeira parede que o cadastro novo encontra. O Kineo 1 NÃO tem `durationFollowsScript`.
2. **Visual 49 — o pior de todos.** Pixabay genérico. Os consertos de 20/09 (sujeito-cabeça, homônimos mustang/python/apple, divisor poliglota, sem genérico quando há sujeito) subiram há 36 h e AINDA NÃO FORAM MEDIDOS (alvo: ≥ 65 nas 48 h).
3. **60 falhas em 38 pessoas**: `TypeError` 15 (11 pessoas), "video access could not be verified" 16 (3 pessoas), `generate_script_not_ok` 14 (1 pessoa), "Prompt is too long" 18 (3 pessoas).
4. **O juiz lê o pedido errado em alguns filmes**: filme "The island where landing is illegal" julgado contra o pedido "Lumi e Pipo aprendendo a contar até dez" (request_pt vem de outro campo que não é o tema do vídeo) → nota 0 falsa. Isso suja a média e o radar.
5. Desenho/animação é impossível no Kineo 1 (Pixabay é filmagem real) — o aviso já existe (18/09); medir se a pessoa troca para Seedance.
6. Legenda/letra queimada: "12 characters" prometido, servidor entrega 3 (copy que mente, auditoria 28/08).

### Seedance 1.5 (cinematic_ai) — o motor pago nº 1
1. **Filme com narração ≠ título**: 2 casos (07/09 e 16/09) em que a biblioteca mostra "5 morning habits Jeff Bezos" e o filme fala de "a mysterious hum"/"abandoned swimming complex". O tema veio de um card da casa e o roteiro de outro lugar. A pessoa abre "Bezos" e vê outra coisa — defeito de confiança.
2. **"Cenas não fornecidas" (nota 50 ×3)**: o juiz recebeu o claim sem os prompts de cena — ou o filme foi montado pelo resgate sem gravar as cenas. Precisa ver se é filme mutilado ou só rastro faltando.
3. **Sem negative prompt** (o schema não tem): até hoje o anti-texto era só um sufixo condicional — agora incondicional (SEM-LETRAS 21/09, a medir).
4. 720p (KINEO_SEEDANCE_RESOLUTION); Enhance é 10 cr por cima.
5. Texto 87, visual 59 — a fala é fiel, a imagem é o elo fraco: alinhador fala×imagem v2 (livro de estado) subiu 19/09, sem medição ainda.
6. 125 falhas/76 pessoas no período — 60 pessoas eram a parede de narração ANTES de 19/09; depois: zero. Conserto provado.

### Veo 3.1 (cinematic_veo) — o melhor, e quase invisível
1. **Letras estrangeiras** em objetos com texto (mapas, jornais, telas) — 3 camadas de prompt subiram hoje (SEM-LETRAS); a medir no próximo filme.
2. **Cena em 16:9 preenchida para 9:16** (ep. 2, navio às 0:11): uma de 9 cenas veio em paisagem. Investigar: still-âncora em 16:9 → i2v com `aspect_ratio: auto`? ou compose preenchendo. Ainda não rastreado.
3. **Ninguém usa**: 1 pessoa externa em 30 d. 100 cr/60 s num trial de 10 cr e Starter de 60 cr = 0 ou 1 filme. O melhor motor da casa não cabe no bolso de quem chega.
4. Só 2 filmes julgados — a nota 90 é boa mas é amostra pequena.

### Kling 2.5 (cinematic_kling)
1. 1 filme julgado: nota 50, **texto 40** (a narração não seguiu o pedido) — pode ser o mesmo defeito do "tema errado" do Seedance.
2. 4 pessoas em 30 d, 2 pagantes. Sem prova de qualidade, sem canário recente.

### Kling 3 (cinematic_hollywood) — estrada hollywood
1. **Zero clientes em 30 d.** 150 cr; filme sai 64-73 s ≈ $11-12 de fal (margem 35-45%, decisão de preço pendente desde 18/08).
2. Voz própria a 2,3 pal/s: régua diferente (150-165 palavras/60 s); roteiro clássico de 200 palavras vira 90 s.
3. Contrato de cena (fala×imagem) só cobre esta estrada + H3 + Omni; o juiz NÃO cobre nenhuma delas → cegueira total de qualidade.
4. Negative prompt forte (o modelo é chinês, texto na tela era o defeito) — já existe.

### MiniMax H3 (cinematic_h3)
1. 3 pessoas/6 claims, 2 pagantes — o único exótico com algum uso pago. Sem juiz.
2. Áudio nativo entra MUDO por decisão (contrato C1); 768p; `prompt_expansion_mode: disabled` desde 16/09 (validar na nota visual — não há nota).

### Omni Flash (cinematic_omni)
1. "#1 RANKED" na vitrine e **0 clientes** em 30 d (8 despachos = fundador).
2. Sem juiz. Selo que ninguém validou = vitrine que promete o que não mediu.

### Seedance 2.5 (cinematic_s25)
1. Interno (S25_PUBLIC=false). Canário 01/09: 3/6 cenas com 503, não montou. 2 despachos internos depois. 150 cr, 480p+Enhance.
2. Dívida: cena falhou → retentar a CENA (hoje mata o filme).

### Avatar
1. 0 débitos na história; anunciado como 1 dos 8 motores e ausente de /studio e /generate (auditoria 28/08). Conserto barato = card no /studio, ou tirar da vitrine.

## 3. Defeitos transversais (afetam vários motores)
- **Saldo da fal** (hoje): 1,7% dos despachos, 9 de 10 do fundador de madrugada. Auto top-up $50→$100 + alerta $75 (pendente, fundador). Recusa parcial agora estorna e avisa; too_few estorna e encerra (subiu 21/09).
- **Juiz cobre 4 de 8 motores** (fast, seedance, veo, kling 2.5). Hollywood/H3/Omni/S25/Avatar não têm nota. Sem nota não há plano.
- **Juiz com pedido errado** (item Kineo 1.4) → notas 0 falsas → radar acorda o fundador por nada.
- **Título da biblioteca ≠ filme** (Seedance 1, Kling 2.5 texto 40).
- **Letras** (hoje, 3 camadas) e **proporção 16:9** (a investigar).
- **Resgate girando**: trial com 1 crédito recebe `compose_refused insufficient_credits_fast 1<3` a cada 5 min há horas — loop sem desfecho.
- Copy que mente: "12 characters", "priority queue", "1080p Kling", "premium voices", "every engine unlocked" com 10 cr (Kling 3 custa 150).

## 4. Plano de ataque sugerido (ordem = dinheiro)

**Bloco A — Kineo 1 (o trial; primeira impressão de 100% dos cadastros)**
A1. `durationFollowsScript` no fast: roteiro colado + seletor 60 s → desce para 35 em vez de parede. (Zera a única parede que cresceu esta semana.)
A2. Medir os consertos de 20/09: visual 49 → ? nas 48 h; se < 60, próximo degrau = still FLUX por cena (já pago nos motores de IA, jogado fora) como imagem de abertura de cada cena do Kineo 1.
A3. TypeError 15/11 e "access could not be verified" 16/3 — achar a linha (events.metadata->>'error' + Vercel) e matar.
A4. Juiz lendo o pedido certo (videos.topic do PRÓPRIO filme).

**Bloco B — Seedance (o motor pago)**
B1. Título ≠ filme: rastrear os 2 casos (card da casa × roteiro) e travar: o `videos.topic` nasce do roteiro que rendeu, nunca do card clicado antes.
B2. "Cenas não fornecidas": conferir se o filme foi mutilado ou só o rastro; gravar prompts de cena no claim sempre.
B3. Medir livro de estado (19/09) + sem-letras (21/09) na nota visual: alvo 59 → 70.

**Bloco C — Veo (o melhor motor, escondido pelo preço)**
C1. Proporção 16:9 de uma cena (ep. 2) — achar a causa no claim.
C2. Decisão de produto (fundador): Veo a 35 s cabe em 59 cr — mostrar "Veo 35 s" como degrau logo acima do Seedance no Studio para o Starter (60 cr) conseguir 1 filme Veo. Preço público é seu.

**Bloco D — Os 5 sem prova (Kling 2.5, Kling 3, H3, Omni, S25)**
D1. Juiz na estrada hollywood (mesmo `fast_coherence` lendo claim + fala) — sem isso não dá para atacar nada aqui.
D2. Canário de $0 (dry-run) + 1 render de 35 s por motor com o mesmo roteiro (Cuba, 205 palavras) → 5 notas comparáveis num dia.
D3. Regra do selo honesto: motor sem nota ≥ 75 em 3 filmes sai da vitrine "ranked" até provar. Omni "#1 RANKED" com 0 clientes é o primeiro candidato.

**Bloco E — Avatar**: card no /studio ou retirar da lista de "8 motores" (decisão sua; hoje a vitrine mente).

## 5. O que NÃO fazer amanhã
- Não mexer no preço (congelado até 09/10).
- Não rodar render pago sem dry-run.
- Não medir "últimos N dias": todo conserto se mede com corte no deploy (19/09 04:00 UTC livro de estado; 20/09 Kineo 1; 21/09 sem-letras).
- Não atacar os 5 exóticos antes de A e B: eles têm 2 pagantes; A e B têm 8.

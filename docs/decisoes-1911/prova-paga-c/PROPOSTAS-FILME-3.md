# Prova C · filme 3 · as propostas · Div. 2 · 20/11

Branch `codex/div2-reserva-imagem-2011` (da origin/main 6f75a2028). Sem gasto, sem render.

## 1. Reserva sempre com imagem (CONSTRUÍDA, interruptor 'off')
- **O quê:** ao começar a reserva, a cena sem imagem aprovada ganha a imagem-chave 9:16 desenhada do texto da própria cena. É o still da rota (flux/dev, no nosso bucket); com o meio 3D, sai sem o sufixo fotorreal. As 3 cenas vão pelo H3 com imagem e nunca mais pelo H3 só de texto. As URLs entram no claim na mesma transição atômica que começa a reserva. Se faltar alguma imagem, o desenho travar ou vier URL da fal, fica o caminho de hoje inteiro (sem misturar motor).
- **Antes × depois** (guardião, com as cenas assinadas dos 3 casos reais):

  | Filme | Antes | Depois | Cenas desenhadas | Custo |
  |---|---|---|---|---|
  | 76c4c5c4 | H3 só de texto × 3 | H3 com imagem × 3 | cenas 1 e 2 | US$ 0,06 |
  | eec8a2d3 | H3 só de texto × 3 | H3 com imagem × 3 | cena 3 | US$ 0,03 |
  | 5910c0e8 | H3 só de texto × 3 | H3 com imagem × 3 | cenas 2 e 3 | US$ 0,06 |

  No H3 vai o texto da cena, sem mudança, mais a `image_url` (a aprovada ou a desenhada). Sai o `aspect_ratio`, que o H3 com imagem tira da própria foto.
- **Custo a mais:** ~US$ 0,03 por cena sem imagem, só nos filmes que caem na reserva sem imagem em todas as cenas. Média medida: 2 cenas por filme, ~US$ 0,06 por filme.
- **Quantos filmes:** clientes na reserva só de texto foram **2 em 7 dias** (3 cenas sem imagem) e **5 em 30 dias** (10 cenas sem imagem; 3 deles antes de 11/11, ainda no Seedance de texto). Na reserva com imagem foram 4 em 7 dias e 20 em 30 dias. Isso dá ~US$ 0,06 a US$ 0,12 por semana.
- **Tempo a mais:** até 25 s de teto para desenhar, uma vez por filme na reserva.
- **[revisor 20/11] UM desenho por filme, sob concorrência.** A CAS que começa a reserva também reserva o direito de desenhar para UM dono, com a hora. Só ele desenha e paga; depois uma 2ª CAS grava as imagens (`pronta`) ou `sem_imagem`.
  - Quem chega nesse meio tempo (o poller do cliente e o cron) espera, sem desenhar e sem POST.
  - Dono sumido por mais de 55 s: quem chega assume `sem_imagem`, sem desenhar de novo.
  - Como a reserva já começou na 1ª CAS, o Kling que entregar durante o desenho não vale mais (a autorização da URL usa a mesma CAS): nenhum desenho órfão.
  - No guardião: 3 chamadas ao mesmo tempo = 1 desenho (2 cenas), não 6.
- **[revisor 20/11] Só imagem do nosso bucket.** Lista positiva: `https://<projeto>.supabase.co/storage/v1/object/public/broll/ai-still/<arquivo>.(png|jpg|webp)`. A da fal e `storage.googleapis.com/falserverless` não valem.
- **[revisor 20/11] O gasto do desenho fica sempre registrado.** O evento `kling4_reserva_com_imagem` grava o custo e `gravadas` mesmo quando a 2ª CAS perde; o custo também vai ao claim (`reserva_com_imagem.usd`).
  - O `free_film_engine_used` e a verba do dia são gravados por funções do banco (`transition_kling4_trial_fallback`). Somar o desenho ali pede migration, então NÃO construí.
  - A verba do dia já desconta o teto reservado (US$ 2,355 por filme), e a reserva real (H3 3×6 s + até US$ 0,09 de imagens) fica abaixo dele.
- **[revisor 20/11] O desenho travado: dá melhor?**
  - **Baixar o teto:** o still do flux/dev leva 3 a 5 s, mas a janela da rota é 12 s mais a cópia ao bucket (até 8 s). Abaixo de ~20 s corta casos bons; não mexi sem a medida.
  - **Desenhar em paralelo com a espera do Kling (recomendado, médio, não construído):** quando a consulta dos 8 min diz "rodando" (decisão `esperar`), um pré-desenho reservado na mesma CAS deixa as imagens prontas antes de a reserva começar. Atraso zero.
  - Custo do pré-desenho: ~US$ 0,06 também nos filmes em que o Kling acaba entregando (os que chegam aos 8 min: 4 de 103 em 30 dias).
- **Ligar para cliente** é gasto por filme: pede o sim do dono.

## 1-B. Plano B, só desenhado: o leitor de 1 quadro
- Depois de cada clipe do H3 só de texto, um quadro do meio vai ao gpt-4o-mini (~US$ 0,001), com a pergunta "a cena está deitada?" e resposta em JSON {deitado, confiança}.
- Deitado com confiança alta: o clipe é pedido de novo UMA vez (+US$ 0,785 por clipe de 6 s). Se vier deitado de novo, monta assim e grava o evento.
- **Por que é o B:** reduz e não elimina (a 2ª tentativa também pode vir deitada); custa mais quando acerta (um clipe novo contra uma imagem nova); soma ~1 a 2 min ao filme.

## 2. Ficha reprovada também no caminho de hoje (CONSTRUÍDA, 'internal')
- Se a ficha não agiu dentro da revisão do A2, o mesmo passo roda depois dele, com o veredito do juiz de ANTES das imagens (`juiz_plano_ficha_antes`), nas cenas do Kling 4 e antes do POST pago.
- No filme 3, planos 3 e 4: reprovada de novo, sai a identidade do Daniel e ficam a Emily e a Sarah; aprovada sem as âncoras, sai a folha e a origem e fica a ficha do autor.
- Interruptor próprio `FICHA_REPROVADA_NO_HOJE_2011 = 'internal'`. Guardião com 9 mutantes.

### 2.1 [revisor 20/11] O corte tira também a ficha das OUTRAS pessoas
- O `semFicha` (lib existente) tira toda linha Identity:/Visible: do plano. No filme 3 sai também a descrição da Emily no plano 1 ("Visible: Emily, a woman in her thirties … 1990s clothing"), que o juiz não reprovou.
- **É aceitável agora:** sem ficha é o caminho mais seguro, e o plano mantém a ação e a época. Mas a Emily perde a aparência e pode mudar de rosto entre os planos.
- **Dá melhor, sem construir:** cortar por PLANO, não pelo filme. O veredito já diz qual plano contradiz (`planos[].a = contradiz`, no filme 3 os planos 3 e 4); a ficha sai só desses, e o plano 1 fica com a Emily.
- Cortar por personagem não dá: o juiz não diz o nome.
- Recomendo o corte por plano como próxima volta.

### 2.2 [revisor 20/11] A marca
`fichaJaAgiu1911.v = fr1911.relato.reprovada_antes`: quando o juiz do A2 fica sem veredito, o passo de fora ainda roda com o juiz de antes das imagens. O juiz relê as cenas novas e com as falas (mutantes no guardião).

## 3. A ficha antes da imagem (só o desenho)
- **Onde:** no passo que já existe antes das imagens (`fichaAntesDoRender1311`, `route.ts` ~7555). Hoje ele lê o juiz e, com `a_ficha`, só refaz a ORDEM (`refeitos: sem_ordem | nada`).
- **O quê:** com `a_ficha` verificado, aplicar às cenas longas (`classicScenePrompts`) o mesmo passo da ficha reprovada: sem as âncoras e a origem, e o juiz relê no mesmo prazo; reprovada de novo, sem a ficha. Isso acontece ANTES de desenhar as imagens-chave e a folha.
- **O que muda:**
  - a imagem-chave nasce sem a ficha errada (resolve o limite da imagem: 63 de 77 envios têm imagem inicial desenhada com a ficha);
  - a folha do personagem não é desenhada para uma ficha reprovada (economiza a folha, ~US$ 0,15 a 0,73);
  - a ficha fica no tamanho do ensaio, então a descrição do A2 volta a caber (o motivo do filme 3 cair no caminho de hoje).
- **Risco:** a folha e o crítico do still leem a ficha. Com a ficha fora, a folha não nasce e o crítico compara sem ela. Precisa de ensaio grátis em quadros (sem render) nos 40 filmes COM ficha do corpus e de prova paga própria.
- **Medida antes de construir:** quantos dos 40 COM ficha têm `juiz_plano_ficha_antes` com `a_ficha` (só SELECT).

## 4. Os clipes deitados (para ver com os olhos)
Folhas na mesma pasta: 4 quadros por clipe (0,5 · 1,8 · 3,1 · 4,4 s), uma linha por clipe.
- `76c4c5c4-reserva-h3-texto-quadros.jpg`:
  - linha 1, cena 1 (rua nevada): deitada;
  - linha 2, cena 2 (a tira de fotos): em pé;
  - linha 3, cena 3 (Daniel e Sarah): deitada.
  - Clipes: `https://v3b.fal.media/files/b/0ab3302b/p78I0CrWu0eAU8Lo3EkEM_minimax-h3.mp4`, `…/n94SJPlcA7Rjjx2Z1gaMm_minimax-h3.mp4`, `…/DGDq3jjokDqU_aW910O9-_minimax-h3.mp4`.
- `eec8a2d3-reserva-h3-texto-quadros.jpg` (cliente, 17/11):
  - linha 1, cidade: em pé;
  - linha 2, o NPC de vermelho (cena 2): DEITADA;
  - linha 3, o grupo: em pé;
  - linha 4, a cena 2 de novo (a 2ª passagem no filme): DEITADA.
  - Clipes: `https://v3b.fal.media/files/b/0ab2e025/Tg2gAK0pMw0vquyBmQJMZ_minimax-h3.mp4`, `https://v3b.fal.media/files/b/0ab2e02e/E1OWBl06tPCAXzfaI-DWO_minimax-h3.mp4`, `…/0ab2e025/gzFGqMm8eTk5jnTBsdkMa_minimax-h3.mp4`, `…/0ab2e025/6CSyynvXLJGY4VAsVLhPP_minimax-h3.mp4`.
- Cópias locais: `C:\Users\josep\AppData\Local\Temp\claude\1aca8f9721d748f8\d4e283a0-3249-4055-bb67-f79cfa2c5fc9\scratchpad\rv9m\h3clips\` (76c4c5c4) e `…\rv9m\h3t2v\` (c4 a c7 = eec8a2d3).
- Não estão no nosso bucket: são da fal e expiram.

## 5. A URL da fal na montagem
`lib/freeRedo/fonteDoFilme.ts:17` grava a fonte assinada do filme (`free_redo_film_source`) com os clipes em `v3b.fal.media`, e as imagens aprovadas da reserva também são da fal. O filme final vai ao bucket (`app/api/cron/finish-stranded-renders/route.ts:1643`), mas a refação grátis, que remonta da fonte, quebra quando a fal apaga os clipes.
- **Proposta, sem construir:** copiar cada clipe e cada imagem ao bucket no momento em que a URL é autorizada no claim (`authorizeCinematicCompletedUrls`), e gravar a fonte já com as cópias.

## 6. O relógio da reserva
- Em 30 dias, **1 de 103** filmes de cliente com Kling 4 passou de 10 min entre o envio e a montagem.
- 4 foram à reserva por tempo, depois de 8 min.

## 7. [revisor 20/11, 2ª volta] O que falta para LIGAR a reserva com imagem
Esta volta conserta os itens 1 a 3 no código e deixa os itens 4 e 5 só escritos. O interruptor continua `'off'`. Guardião: `scripts/test-reserva-com-imagem-2011.mjs`, 38 mutantes, todos vermelhos.

### 7.1 O status do claim na 2ª CAS (consertado)
- **O defeito:** `gravarImagensDaReserva` lia o claim e gravava 'pronta' sem conferir o status. Se o reembolso caía no meio do desenho, a 2ª CAS gravava 'pronta' num claim 'released' e o envio postava os 3 clipes do H3. A troca final recusava, e o filme ficava sem entrega.
- **O conserto:** a transição virou pura, `transicaoDasImagensDaReserva` em `lib/cinematic/claim.ts`.
  - Ela exige o status `done` ou `settled`, como a 1ª CAS e a troca final.
  - Confere também a versão do teste, o motor, a reserva começada e o dono.
  - A gravação real usa essa transição, e o mundo falso do guardião também.
- **Por que só a leitura falhava:** o `authority` é a assinatura do claim inteiro. O reembolso muda o `authority`, então um reembolso entre a leitura e a escrita já perdia a CAS. Só faltava conferir o status lido.
- **Provas:** U7, U8 e U9 testam a transição. R1 reembolsa durante o desenho: nenhum clipe vai à fal, e o gasto de US$ 0,06 fica no evento.
- **Mutantes vermelhos:** sem a conferência; só o 'released' recusado (lista negativa); a gravação real sem a transição.

### 7.2 A lista positiva só do nosso projeto e do bucket broll (consertado)
- A regra agora aceita só `https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/broll/ai-still/<nome>.(png|jpg|jpeg|webp)`, com o fim ancorado.
- É o projeto de produção. Lá o `persistFastStill` grava, e é lá que estão os objetos `broll/ai-still/` de hoje (conferido em `storage.objects`).
- Noutro ambiente, a imagem é recusada e o filme segue o caminho de hoje.
- **Provas:**
  - U2b recusa outro projeto `*.supabase.co`.
  - U2c recusa outro bucket (videos, avatars, brolls), outra pasta, URL assinada, `../` e cauda `?x=`.
  - U2d confere que a regra nomeia o projeto.
- **Mutantes vermelhos:** qualquer bucket no lugar do broll; qualquer projeto; qualquer pasta; sem o `$`.

### 7.3 O relógio: a hora do banco (consertado, sem migration)
- **Por que não dá now() na CAS:**
  - O banco não tem função de hora exposta (conferido em `pg_proc`: nenhuma função em public devolve timestamp).
  - A CAS do claim é um UPDATE do PostgREST, que não calcula now() nem no filtro nem no valor.
  - A tabela `events` não tem `updated_at` nem gatilho de hora.
  - Uma função `agora()` pediria migration, e migration pede a revisão do outro CEO.
- **O que foi feito:**
  - O `now()` do Postgres chega pelo `created_at` padrão de uma linha `kling4_reserva_relogio` em events. A linha não manda `created_at`, e o evento é só do servidor.
  - O dono marca o `desde` com essa hora. Sem ela, o dono não reserva desenho e o filme segue o caminho de hoje, sem gasto.
  - Quem espera usa o relógio local só para poupar a ida ao banco enquanto ele diz "ainda não".
  - Quando o relógio local passa dos 55 s, quem espera confirma na hora do banco antes de assumir.
  - Se o banco não responder, vale o relógio local com o dobro da espera (110 s). Assim o filme não fica preso e um servidor adiantado não toma o desenho.
- **Volume:** 1 linha por filme na reserva (o dono), mais 1 por confirmação depois dos 55 s locais. Com 1 a 4 reservas por semana, são menos de 10 linhas por semana.
- **Provas:**
  - H1 a H7 testam `horaDoBanco` e `aindaEsperaODono`.
  - R2: o `desde` sai do banco, com o servidor 30 s adiantado.
  - R3: sem a hora do banco, nada é desenhado.
  - R4: servidor 30 s adiantado com o dono desenhando; quem espera não assume.
  - R5: o banco diz 60 s; quem espera assume.
- **Mutantes vermelhos:** 9, entre eles o relógio local no dono, o relógio local em quem espera, o `Date.now()` no lugar do `created_at` e o `created_at` mandado pelo servidor.

### 7.4 O Kling que fica pronto durante o desenho (só escrito)
**O que acontece:**
- A 1ª CAS começa a reserva. Daí em diante, o Kling que chegar não vale mais.
- Desligado (hoje), a janela entre a 1ª CAS e o POST do H3 é de segundos.
- Ligado, a janela cresce até 25 s de desenho, mais a 2ª CAS.
- Nessa janela, o Kling que chega é jogado fora, como já é hoje na janela de segundos.

**Quanto custa cada vez:**
- O Kling já foi pago: US$ 0,157/s × 15 s = US$ 2,36. É custo afundado, igual nas duas opções.
- Vão a mais o H3 da reserva (US$ 0,06/s × 18 a 22 s = US$ 1,08 a 1,32) e o desenho (US$ 0,03 a 0,09).
- O cliente recebe o H3 no lugar do Kling.

**Com que frequência, medido em 35 dias:**
- 125 filmes grátis do Kling 4: 117 entregues pelo Kling e 8 reservas. Das 8, 5 foram por tempo e 3 por falha.
- Pela hora da montagem, a entrega do Kling teve mediana de 4,5 min, 90% em até 6,3 min e máximo de 7,9 min.
- Nenhum dos 117 Klings entregues passou de 8 min.
- Quem chega ao prazo de 8 a 12 min está preso na fila. Nenhum dado mostra Kling chegando logo depois do prazo.
- A reserva por falha nunca recebe o Kling.
- Estimativa: até 1,25 reserva por tempo por semana × no máximo 10% de chance de cair em 25 s × US$ 1,4 = **até US$ 0,17 por semana**. Não está medido. Medir pede o status da fal das 5 reservas por tempo, que é grátis mas pede a chave da fal (fica com a CEO).

**Opções:**
- **A (recomendada): não aceitar.** Custo esperado de até US$ 0,17 por semana, zero código novo.
- **B: o dono consulta o Kling uma vez (grátis) antes da 2ª CAS.**
  - Se o Kling estiver pronto, a 2ª CAS grava 'kling' e o Kling é entregue. Perde-se só o desenho.
  - Pede mexer na autorização da URL do Kling, que hoje não faz nada depois de `fallback_started` (`lib/cinematic/claim.ts:1018`), para aceitar enquanto o estado for 'desenhando' e só pelo dono. Isso cria o 1º caminho que volta atrás numa reserva começada: risco de entrega dupla.
  - Só vale se a medição mostrar Kling chegando nessa janela.
- **C: quem espera também consulta o Kling.** Mais idas à fal e mais transições, pelo mesmo ganho de B.

### 7.5 O pré-desenho em paralelo com a espera do Kling (só o desenho)
**A ideia:**
- Desenhar as imagens que faltam antes de a reserva começar, enquanto o Kling ainda roda.
- Quando a reserva começa, as imagens já estão no claim. Some a janela de 25 s, some a espera pelo dono, some o problema do relógio na espera, e nenhum Kling é jogado fora por causa do desenho.

**Quanto custa, medido em 35 dias:**
- Filmes grátis do Kling 4 com cena sem imagem: 10 de 39 (semana de 09/11) e 17 de 49 (semana de 16/11).
- Cenas sem imagem: 16 e 25 por semana.
- **Opção 1, desenhar todo filme no envio:** 25 cenas × US$ 0,03 = **US$ 0,75 por semana** (US$ 0,48 na semana anterior). Cresce com o volume: 100 filmes por semana dão cerca de US$ 1,5. Mais de 90% desse gasto vai a filmes que o Kling entrega.
- **Opção 2 (recomendada): desenhar só no minuto 7.**
  - Só o filme cujo Kling ainda não chegou com 7 min de idade ganha o desenho. 90% dos Klings chegam até 6,3 min, e o prazo é de 8 min.
  - Em 35 dias passaram de 7 min 6 entregues e 8 reservas: 14 filmes, cerca de 3 por semana.
  - 3 × 1,5 cena × US$ 0,03 = **cerca de US$ 0,14 por semana**. Cerca de US$ 0,06 por semana vai a filmes que o Kling acaba entregando.
  - O desenho (até 25 s) termina antes do prazo de 8 min, e a reserva já nasce com as imagens.
- Hoje (reserva com imagem só na hora da reserva): 1 a 4 reservas por semana × 1,5 cena × US$ 0,03 = **cerca de US$ 0,05 a 0,18 por semana**. O custo é parecido com o do minuto 7, mas tem a janela de 25 s e a espera pelo dono.

**Como seria o minuto 7 (sem construir):**
- Gatilho: o mesmo `advanceKling4TrialStatus`, que já roda a cada consulta do navegador e a cada minuto pelo cron. Ele dispara quando a idade do pedido passa de 7 min, a reserva não começou e falta imagem.
- Um dono: uma CAS reserva o desenho para um dono, com a hora do banco, sem começar a reserva. Só o dono desenha.
- Gravação: uma 2ª CAS grava as imagens em `kling4_trial.imagens_da_reserva`, um campo assinado e separado das cenas.
- Uso: quando a reserva começa, a 1ª CAS de sempre copia essas imagens para as cenas que faltam, na mesma transição.
- Kling chegou antes: entrega normal. O desenho (cerca de US$ 0,05) fica perdido e registrado no evento.
- Dono sumido: a reserva começa sem as imagens, pelo caminho de hoje, nunca esperando.
- O relógio da idade é o mesmo `submitted_at` do prazo de 8 min, que já usa o relógio do servidor. Um servidor adiantado só antecipa o desenho em segundos, sem tirar nada de ninguém.
- Dá para construir em cima do que já existe: as mesmas funções puras de dono, transição e lista positiva, e o mesmo guardião de mundo falso.

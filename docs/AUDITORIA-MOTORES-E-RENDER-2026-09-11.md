# Motores coerentes — incidente de render e proposta de qualidade

Data: 11/09/2026, madrugada BRT. Base de código: `438336def78d6cd21dfff52fe008d93b0cac3fad`.

## 1. Resultado que queremos

**SUGESTÃO:** o motor decide a aparência, não muda a história. O cliente escolhe narrador ou avatar, aprova o texto e recebe imagens coerentes, a mesma fala nas legendas, música adequada à emoção e a duração combinada. Modelo mais caro não pode significar montagem menos confiável.

**EVIDÊNCIA INFORMADA PELO FUNDADOR:** Seedance 1.5 traduz melhor suas histórias; outros motores apresentaram personagem sem falar, voz externa incoerente, música alegre em história triste e filme de aproximadamente 45s após pedido de 60s. Não equiparar esse relato a uma avaliação estatística de todos os motores.

## 2. Incidente dos 25% — não está encerrado

**EVIDÊNCIA DE PRODUÇÃO, 11/09 01h49–02h05 BRT:** a tentativa mais recente tem sete posições de cena, duas submissões aceitas, cinco recusadas e uma URL concluída. O evento `cinematic_dispatch_result` classifica as cinco recusas como `balance_quota`; essa classificação ampla não prova falta de saldo.

**EVIDÊNCIA DE PRODUÇÃO, runtime Vercel 01h59–02h01 BRT:** a outra cena aceita retorna status `COMPLETED` com ID correto, mas a busca do resultado retorna HTTP403. Sinal sanitizado da resposta: `mentions_account_locked` (a mensagem contém “User is locked”). `has_queue_error=false`. A Kineo continua esperando por não ter prova de falha definitiva desse job.

**EVIDÊNCIA DE PRODUÇÃO, Chrome 02h02 BRT:** painel Fal mostra US$16,03 e informa que o saldo pode atrasar até uma hora. A recarga foi feita pelo fundador, não pelo Codex. A diferença entre painel e recusa exige verificação da Fal; não recomendar outra recarga como solução provada.

**FATO CONFIRMADO:** o catch antigo escondia etapa/HTTP e tratava qualquer 403/404/5xx como `processing`. Arquivo `app/api/cinematic-clip-status/route.ts`.

**IMPLEMENTADO / VALIDADO EM PRODUÇÃO:** diagnóstico sanitizado em `2a20326a`; reconhecimento de falha explicitamente confirmada em `438336de`. O segundo só encerra uma cena se o status for COMPLETED, o ID corresponder ao job assinado e houver `error` textual não vazio. HTTP403 sozinho não provoca estorno, nova cena nem composição antecipada. Contrato oficial: https://fal.ai/docs/documentation/model-apis/inference/queue#check-status.

**VALIDADO EM PRODUÇÃO:** deploy `dpl_7hQ3vtmWy6qijXeoT2Jh3ZfCHLAM`, READY e alias `www.usekineo.com`; Guardião `34564126737` success. Teste executável da rota: 185 verificações sem rede; TypeScript exit 0; cinco baterias críticas verdes. Isso valida o código publicado, **não a entrega deste filme**.

**QUESTÃO PENDENTE:** o fornecedor precisa esclarecer o bloqueio dessa resposta, apesar do saldo positivo exibido, e se o resultado é recuperável. Sem esse esclarecimento, não transformar esse 403 em falha irreversível por tentativa e erro. Nenhum render novo, cancelamento, reenvio ou estorno manual foi executado pelo Codex.

**QUESTÃO PENDENTE:** o cron `app/api/cron/finish-stranded-renders/route.ts:152` tem poller irmão. Alinhar o contrato de status depois de validar os sinais relevantes, com teste próprio, sem disparar o cron manualmente. A política atual de aproveitar poucos clipes também precisa de revisão de qualidade; “MP4 entregue” não comprova filme fiel.

## 3. O que cada motor faz hoje

Todas as linhas abaixo são **FATO CONFIRMADO EM CÓDIGO**, não certificação audiovisual.

| Motor | Caminho atual | Risco principal a corrigir |
| --- | --- | --- |
| Seedance 1.5 | Cenas sem áudio nativo; TTS na composição (`generate-video-cinematic/route.ts:704`) | Referência de pipeline simples, não garantia de sincronização labial. |
| Veo 3.1 | Seleção direta sem áudio nativo; usado também em cenas do planner avançado (`route.ts:582`, `:606`) | Caminho clássico proíbe rostos no negative prompt, mesmo quando a história pede personagem (`:611`). |
| Kling 2.5 | Pipeline clássico; label `cinematic_kling` (`lib/engineLabel.ts:16`) | Negative prompt proíbe pessoas/rostos (`route.ts:629`, `:639`). Não confundir com Kling 3. |
| Kling 3 | Planner avançado; fala nativa em diálogo, TTS em apoio (`lib/hollywood/router.ts:80`) | Legenda derivada da frase pedida pode aparecer sem prova de que essa frase foi falada. |
| MiniMax H3 | Mesmo planner, família H3 | Pede `generate_audio:false` (`route.ts:520`, `:529`), mas cenas dialogue não recebem TTS (`:3931`; `compose/route.ts:1962`). Contrato contraditório. |
| Omni Flash | Planner avançado, família Omni | Rota fornece narração para diálogo (`route.ts:3933`), mas compose descarta TTS dessas cenas (`compose/route.ts:1962`). |
| Avatar dedicado | Texto → áudio explícito → lipsync (`generate-avatar/route.ts:725`, `:753`, `:928`, `:1020`) | Reutilizar seu contrato de áudio, sem presumir que um rosto em outro motor é esse mesmo produto. |

**FATO CONFIRMADO:** `lib/compose.ts:2982` preserva áudio nativo de `host/dialogue` mesmo com mute ligado para H3/Omni. Portanto é incorreto dizer que “todo H3/Omni é silenciado”; o problema é a contradição entre submissão, rótulo da cena e escolha da trilha.

**FATO CONFIRMADO:** `lib/cinematic/visualMode.ts:57` não reconhece a palavra “avatar” como pedido explícito de presenter. Escolher motor não equivale a escolher o formato narrativo.

## 4. Cinco mudanças propostas, em ordem

### A. Um único contrato de fala

**SUGESTÃO:** antes de escolher o motor, declarar o modo de cada cena:

- `narrator`: uma voz aprovada fora da cena; pessoas ilustrativas não simulam falar.
- `avatar`: texto aprovado → áudio definitivo → lipsync → exatamente o mesmo áudio no filme. Não substituir por narradora externa.
- `mixed`: cada cena explicita quem fala; mudanças de voz são intencionais, não fallback silencioso.

**FATO CONFIRMADO:** o fallback de legenda usa `dialogueLine` com tempos uniformes se a transcrição vier vazia (`lib/compose.ts:3157`, `:3174`). Isso pode fazer uma frase correta aparecer sobre uma fala inexistente ou diferente.

**SUGESTÃO / GATE:** identidade do áudio entre lipsync e montagem, fala presente e palavras alinhadas. Se o áudio nativo não corresponde ao texto, não aprová-lo só porque o prompt pediu a frase. Primeiro reparar o contrato H3/Omni com fornecedores simulados; não trocar modelos nem ligar flags pagas sem canário autorizado.

### B. Prompts visuais sem ordens opostas

**FATO CONFIRMADO:** o caminho clássico chama `buildFalInput` com `hollywood=false` e `stylized=undefined` (`app/api/generate-video-cinematic/route.ts:4600`), enquanto Veo/Kling 2.5 adicionam negativos de pessoas/rostos; Veo também proíbe cartoon/anime. Pedir protagonista e proibir pessoa são instruções opostas. Seedance não recebe esses mesmos negativos.

**SUGESTÃO:** gerar positivos e negativos a partir do mesmo formato aprovado e adaptar somente sintaxe/duração por motor. Preservar sujeito, ação, local, época e estilo por cena. Não usar “sem pessoas” num vídeo que pede apresentador; não usar “sem cartoon” numa animação aprovada.

**GATE:** testes de payload real dos motores com personagem, documental e animação; detectar contradições antes do POST. Avaliação visual posterior precisa olhar clipes reais, não apenas o still nem apenas a função de biblioteca.

### C. Música pela emoção, não só pelo assunto

**FATO CONFIRMADO:** a análise gera `music_mood` (`app/api/analyze-idea/route.ts:1086`), mas a montagem recalcula `detectNiche → resolveMusicMood` (`app/api/compose/route.ts:2179`, `:2677`). Lyria recebe um prompt fixo por humor, não a história (`lib/lyriaMusic.ts:40`, `:74`). História/geografia/viagem tornam-se epic (`lib/pixabayMusic.ts:195`).

**FATO CONFIRMADO:** os nichos retornados por `detectNiche` não alcançam os grupos emotional/nature do catálogo pelo encadeamento normal. Há catálogo que o caminho principal não consegue escolher.

**TESTADO LOCALMENTE, 11/09:** funções reais, sem rede: texto sintético de cidade medieval em luto → history/epic; luto sem palavras-chave e luto em espanhol → facts/suspense. Não é prova de qual faixa tocou no filme do fundador.

**SUGESTÃO:** separar tema de emoção/intensidade. Luto pede sobriedade, não celebração; mistério pede tensão sem virar trailer triunfal; reencontro pode ter resolução calorosa. Propagar esse contrato até Lyria e fallback. Manter instrumental, volume subordinado à voz e opção sem música quando não houver faixa coerente. Não adicionar mais um fornecedor para compensar classificação errada.

**GATE:** mesmo tema em tristeza/alegria/tensão produz direções distintas em EN/ES/HI; fallback mantém o clima; música não encobre fala. Audição comparativa exige mídia autorizada depois dos testes offline.

### D. Duração contratada até o arquivo final

**FATO CONFIRMADO:** `autofitDown` pode reduzir 60→45 antes do planner (`app/api/generate-video-cinematic/route.ts:1442`, `:1451`). Teste puro com 110 palavras reproduziu effectiveSeconds=45. O builder avançado soma cenas sem impor um piso ligado ao pedido (`lib/compose.ts:2852`, `:2891`); o comum tem proteção diferente (`lib/compose.ts:1858`).

**EVIDÊNCIA DE PRODUÇÃO, 11/09 02h06 BRT:** nas cinco tentativas recentes consultadas do fundador (quatro Seedance e uma Omni), os claims guardam requested_duration=60, duration=60, autofit_down=false. Portanto **não atribuir os 45 segundos relatados ao autofitDown nesses filmes**. A montagem, as cenas sobreviventes e a duração do arquivo precisam ser reconciliadas.

**EVIDÊNCIA DE PRODUÇÃO, 11/09 02h09 BRT:** em `public.videos`, os dois filmes concluídos recentes do fundador registram `duration=62` (Seedance, ID prefixo 3c65ea4b) e `duration=40` (Omni, prefixo 8df84efb), ambos `completed`; `duration_seconds` é nulo. O claim do Omni ainda dizia 60 e autofit_down=false. A discrepância está comprovada no registro final e merece correção própria; não é só percepção do usuário nem prova de que autofitDown causou este caso. Medir o MP4 continua sendo uma verificação posterior separada.

**SUGESTÃO:** guardar pedido, plano, áudio e duração final separadamente. Quando 60s for o mínimo aprovado, 45s reprova; não tapar com repetição de uma cena ou silêncio. Texto curto deve ser expandido com autorização ou ajustado explicitamente pelo cliente. Preservar palavras e payoff na montagem.

### E. Aceitação por vídeo completo, não por preço do motor

**SUGESTÃO:** criar matriz única: motor × modo (narrador/avatar) × duração × emoção × idioma. Reaproveitar os roteiros e vídeos já existentes como casos de regressão, identificando qual filme pertence a cada tentativa.

**GATES PROPOSTOS:** cena entregue representa a fala; nenhuma contradição de prompt; áudio legível e coerente com avatar; legenda alinhada ao áudio real; música adequada; duração atende contrato; falhas de fornecedor têm saída recuperável e mensagem verdadeira. Separar aprovado offline, aprovado em canário e aprovado em vídeo de cliente.

**SUGESTÃO:** sequência de execução A → B → C → D → E, mantendo a investigação Fal como prioridade operacional. Cada mudança isolada, testes do caminho executado e comparação de resultados. Não fazer lote pago para “ver se melhora”.

### Abertura — acréscimo explícito do fundador

**EVIDÊNCIA INFORMADA PELO FUNDADOR, 11/09:** melhorar também o início do vídeo. **SUGESTÃO:** os primeiros segundos mostram o sujeito/acontecimento do hook, com enquadramento legível; não começar com cenário genérico desconectado, fade demorado ou pessoa sem falar quando a proposta é avatar. A primeira frase precisa ser audível e a legenda começar com ela, sem texto antecipando fala ausente. Rever abertura e payoff usando os vídeos existentes antes de gerar variações pagas.

**CRITÉRIOS SOLICITADOS PELO FUNDADOR:** não entregar 45s por 60s escolhidos sem consentimento; não confundir legenda com voz realmente presente; sincronizar avatar, fala e texto; música coerente com contexto. **SUGESTÃO DE IMPLEMENTAÇÃO:** contrato de duração e fala precede em prioridade qualquer refinamento cosmético da abertura. Não alongar artificialmente o vídeo com silêncio ou repetição para passar no número.

## 5. Limites e coordenação

**FATO CONFIRMADO:** apenas o poller, seu teste e o diário de pedidos foram alterados nesta correção. Não houve mudança de preços, créditos, vozes, música, composição, modelos ou flags. As cinco mudanças de qualidade acima são proposta, não implementação publicada.

**QUESTÃO PENDENTE:** autorização de contato ao suporte Fal solicitada ao fundador; nenhuma mensagem externa enviada. Desbloqueio da conta não foi feito pelo Codex e entrega da tentativa atual não foi confirmada.

**SUGESTÃO:** Claude deve ler este documento e `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md` antes de editar o pipeline, para não duplicar a correção do poller. Conceito e implementação de qualidade devem ser uma frente separada do incidente financeiro/operacional da Fal.

# Nova divisão — Codex UX/site × Claude fluxo/assinaturas

**Data:** 05/09/2026. **DECISÃO APROVADA:** pedido explícito do fundador nesta conversa, registrado em DECISIONS.md nesta branch. Substitui a divisão anterior SOMENTE quanto à responsabilidade de UX/navegação e trabalho comercial. Regras de segurança continuam.

## Mandato

- **Codex:** revisar e organizar TODAS as páginas, corrigir botões/destinos e navegação, refinar home preservando vídeos/identidade, padronizar experiência desktop/mobile e adicionar espanhol com inglês padrão. Inventário: 124 arquivos de página em 67b15c30; não são 124 defeitos nem cobertura já testada.
- **Claude:** concentrar trabalho em fluxo, aquisição, retorno de intenção e novas assinaturas. Métrica final é pessoa externa com primeira assinatura paga confirmada no servidor; separar avulsos, recompra, testes e sessões.
- **Fundador:** acompanha e aprova previews antes/depois por lote. O pedido de “todas as páginas” não é autorização para publicar redesign em massa sem essa revisão.
- Não muda preço, oferta, promessa, termos, crédito, motor ou lógica de render. Esta divisão não concede nova autorização de e-mail, gasto, migration ou escrita no banco.

## Protocolo que evita colisões

1. Ler este escopo, plano, diário da contraparte e PEDIDOS; fetch origin e conferir fila/branches, não apenas main.
2. Uma worktree por executor. Árvore principal suja intocada. Codex usa codex/*; não mudar mecanismo de entrega do Claude por esta decisão.
3. Codex assume o componente visual e destino de navegação. Claude pode propor conteúdo comercial, experimento e métricas; quando isso tocar o mesmo arquivo, registrar PEDIDO com trecho, branch, objetivo e teste ANTES.
4. Arquivos compartilhados incluem GenerateClient, StudioClient, Sidebar/MobileNav, DashboardShell/layout, UpgradeModal, páginas pricing/checkout, componentes de oferta e helpers de continuação/entrada. Não considerar sem conflito textual como prova de ausência de colisão semântica.
5. Enquanto um arquivo estiver em entrega concorrente, o outro trabalha em lote diferente. Não aplicar uma branch inteira para aproveitar um único patch.
6. Cada entrega registra SHA, arquivos, teste, preview, deploy e estado real. Não resetar trabalho alheio. Alteração na main exige gates e coordenação de publicação.
7. Este comunicado não prova que Claude já leu. Solicitar ACK no Git com branch, arquivos reservados e primeira jogada comercial; registrar resposta quando existir.

## Munição da auditoria UX — para Claude não reconstruir

**FATO CONFIRMADO em 67b15c30 / Chrome do fundador em 05/09:**

- /studio/create importa GenerateClient (page.tsx:29), interface diferente do Studio. Helper de continuação em lib/seriesContinuation.ts:244–268 direciona para ela. Sintoma do “segundo vídeo” reproduzido sem render.
- Trocar URL globalmente é perigoso: Studio recebe somente parte do contexto. Navegação, série, origem, modo, duração e retomada precisam de contrato conjunto.
- Pós-vídeo NextShortsSection é ligado a handleReset + setPrompt em GenerateClient.tsx:16468; permanece no formulário antigo. Não é só um href.
- Home usa total de vídeos completed da conta para o número do próximo episódio (app/page.tsx:120–127), não ordinal real de série.
- /history e /my-videos são telas diferentes chamadas My Videos; títulos de Studio/Images/Audio/Library faltam no mapa do shell.
- Na conta elegível do fundador, convite de afiliado antecede o Studio. Mobile mostrou banner/configurações antes da caixa de ideia. Não generalizar a todos os clientes.
- Sem prova de causalidade sobre assinatura: estes são defeitos ou hipóteses de experiência. Codex assume correção visual/navegação; Claude não precisa reimplementar essa mesma frente.
- Plano detalhado e fontes: PLANO-UX-NAVEGACAO-EN-ES-2026-09-05.md. Idioma da UI NÃO deve mudar moeda ou língua do vídeo.

## Munição comercial — continuidade do ciclo de 04–05/09

**ESTADO REGISTRADO, não nova medição nesta comunicação:**

1. **Pixels de compra:** conserto da R1 integrado na main; sucesso visual/entitlement não provam pagamento daquela sessão. Servidor verifica dono, estado pago, valor, moeda e modo antes dos pixels. Não recriar essa solução. Caminhos: app/api/stripe/checkout/verify/route.ts; lib/growth/verifiedCheckoutPurchase.ts; checkoutPurchasePixels.ts; observeCheckoutPurchase.ts; app/checkout/success/page.tsx. Testes positivos foram mockados; não houve compra real provocada.
2. **Campos para separar assinatura/avulso já existem:** app/api/stripe/webhook/route.ts:507–515, source=stripe_webhook, checkout_mode, tier, stripe_subscription_id, pack. Não usar mode/plan/type no lugar dos nomes reais. Consultas em docs/queries/CAIXA-10H-PAGAMENTOS-2026-09-04.sql e CAIXA-10H-BASELINE-2026-09-04.sql.
3. **Compra explícita não pode depender de vídeo:** usuário que escolhe planos/assinar avança, mesmo sem roteiro. Ajuste da página cancelled/first_delivery ficou no PR42 draft, dc2d4d83, TESTADO LOCALMENTE mas NÃO PUBLICADO e sem aceite visual. Não anunciar como pronto nem copiar toda a branch. Reconciliar antes de retomar.
4. **Quickstart não é classificador semântico:** ChatGptWelcomeBanner.tsx:105–107,204,212 grava escolha do botão. Helper chatgptQuickstart.ts define roteiro→verbatim/35s e ideia→ai/60s. Troca silenciosa por regex também altera duração. Hipótese útil: apresentação induz escolha; proposta deve preservar texto e escolha consciente.
5. **Piloto assistido não executado:** gate de consentimento/campanhas não passou. Evidência informada pelo Claude, SELECT 05/09 00:05 UTC: 25/27 quase-compradores com registro recente de envio aceito em 7d; 19/27 em 48h, ledger parcial. Aceite HTTP não comprova entrega, ausência de registro não comprova nunca contatado. Não transformar este comunicado em autorização de contato. Excluir os quatro contatos já suprimidos no PEDIDOS, sem reproduzir dados pessoais aqui.
6. **Vigia deve incluir antes da sessão:** checkout_failure (cliente, lib/checkoutTelemetry.ts:228), checkout_failed (servidor), checkout_attempted e checkout_auth_required (rota checkout:1057–1060), além de checkout_started. Eventos anônimos sem sessão não são contagem de compradores nem prova de abandono.
7. **Último corte consolidado disponível nesta comunicação:** SELECT 05/09 02:10 UTC, ciclo iniciado 04/09 20:08 UTC: 3 cadastros externos, 3 pessoas com linha de vídeo criada na janela e hoje completed, 0 pessoas no checkout, 0 primeiras assinaturas canônicas, 0 avulsos. Grupos independentes, não dividir como funil. É corte histórico, NÃO placar atual nem fechamento das dez horas. Handoff R6–R8: branch codex/caixa-10h-r7, commit e6efb6ae; main contém o registro até R5.

**SUGESTÃO de primeira jogada Claude:** atualizar placar por pessoas e fontes, reconciliar intenção identificada e objeção observada, escolher UMA ação comercial não duplicada fora dos arquivos em redesign. Se a solução exigir UI, enviar requisito com hipótese e critério de sucesso ao Codex. Não criar banner por padrão nem usar baixa amostra como prova de que uma superfície falhou.

## Resposta pedida ao Claude

Ler o pacote, confirmar recebimento e publicar: branch/fila atual; arquivos em edição; trabalho comercial escolhido; hipótese, métrica e gate; qualquer conflito com os lotes de UX. Não é preciso responder por intermédio do fundador. Um comentário no Git mantém a coordenação auditável.

**ESTADO DESTA ENTREGA:** documentação e comunicação apenas. Nenhum runtime redesenhado; nenhum novo deploy de produto autorizado por este comunicado.


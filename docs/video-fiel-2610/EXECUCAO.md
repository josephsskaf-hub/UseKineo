# Primeiro filme de 15 segundos — 26/10/2026

**DECISÃO APROVADA:** D-VIDEO-FIEL-2610 em `docs/DECISIONS.md`. Branch `codex/video-fiel-2610`, base `9d8d3fad413d94798081528dbd61f3ba7848a76a`. Joseph autorizou o merge depois das correções e verificações. Esta entrega não retoma o mandato Board encerrado em 04/10.

## O problema comprovado

**EVIDÊNCIA DE PRODUÇÃO — consulta de 26/10/2026, 05:17:17–05:18:56 UTC:** na amostra privada de dez entregas, uma narração repetiu instruções de criação e recebeu 98 no comparador textual. Em outro filme, o registro visual descreveu um tanque em três dos oito quadros e ainda deu 100, sem apontar defeito. São falhas diferentes: a entrada pode ser mal interpretada e a régua pode aceitar um objeto fora do pedido. Identificadores, roteiros e imagens dos clientes permanecem fora deste repositório.

**FATO CONFIRMADO:** o código anterior permitia nota alta com evidência ausente ou incompleta. A normalização do juiz UGC aceitava uma resposta vazia como 100 em reprodução offline. A ocorrência desse último defeito nas dez entregas é **DESCONHECIDA**; não foi atribuída a nenhum cliente sem evidência.

**HIPÓTESE:** um primeiro filme ruim pode contribuir para abandono. Esta amostra não demonstra a causa da falta de compra, nem comprova que todos os filmes eram gratuitos. Duração de 15 segundos não identifica plano, trial ou pagamento.

## O que mudou

**IMPLEMENTADO — entrada:** `lib/requestFidelity.ts` é chamado pelas rotas reais de análise e geração. Uma instrução de produção em modo literal exige revisão antes de escritor, claim ou débito. Pedido explícito de 50/60 segundos ou `1:00` não vira silenciosamente um filme de 15 segundos. Roteiros legítimos, falas marcadas, citações, horários de história e proporções são preservados. O aviso existente acompanha a língua da interface, com português, espanhol e fallback inglês.

**IMPLEMENTADO — cenas:** `lib/runway.ts`, `lib/hollywood/router.ts` e as políticas cinematográficas preservam elenco, objetos, ação, estados e ordem. O curto mantém três cenas com começo, avanço e fechamento; o percurso de um minuto continua coberto. Uma cena sem descrição não toma emprestado o assunto da vizinha nem usa narração como imagem. Sem pista própria segura, a rota interrompe antes de enviar ao fornecedor de vídeo. Esse ponto ocorre depois de trabalho textual e débito já existentes: só afirma devolução quando confirmada, sem prometer custo externo zero.

**IMPLEMENTADO — recuperação:** `lib/mcp/studioTools.ts` distingue revisão explícita de timeout ou indisponibilidade. Remove replay da tentativa que precisa de revisão, preserva a recuperação transitória legítima e consulta confirmação financeira pela mesma pessoa e geração. Não cria um novo executor de estorno; pendência sem confirmação continua visível e exige a recuperação financeira/suporte existentes.

**IMPLEMENTADO — avaliação e painel:** resposta vazia, quadros ausentes/repetidos, índice inválido e leitura faltante deixam a avaliação incompleta. Filme exige texto e quadros; Ads/clipe exige quadros; apresentador exige quadros e juiz específico. Histórico continua disponível sem ser apresentado como nota validada. Uma falha recente não ressuscita uma nota antiga. A associação de notas exige a mesma entrega, geração e pessoa. A página mostra cobertura, base da referência, defeitos e limites.

**IMPLEMENTADO / DESLIGADO — atendimento ao pedido:** canário manual separado das notas históricas, em `lib/regua95/taskFulfillmentCanary.ts` e `/api/admin/coerencia/canario`. Analisa pedido/roteiro e quadros já salvos; cada defeito exige trecho, cena, observação e, quando visual, quadro/tempo. A flag está `false`. Reservas atômicas limitam esta versão a três chamadas globais, inclusive sob concorrência, timeout ou falha de gravação. Não há cron, backfill, render novo ou repetição automática. Notas experimentais permanecem explicitamente **não calibradas**.

## Como conferir

**TESTADO LOCALMENTE — 26/10/2026:** seis guardas novos executam código real com serviços simulados: `pedido-test.mjs`, `cenas-test.mjs`, `juiz-offline.mjs`, `canario-offline.mjs`, `pedido-mcp-test.mjs` e `test-admin-quality.mjs`. Não há rede real, débito real ou chamada de modelo nesses testes. Bateria final do workflow: 71/71 resultados esperados, incluindo quatro controles de mutação que devem retornar código 1. TypeScript passou na árvore independente com os mesmos 28 arquivos de produto. O root confirmou novamente a prova congelada: 470 verificações e 253 mutantes rejeitados; nenhum manifesto histórico foi regravado. Os seis guardas novos e os dois guardas95 continuam lendo produto bruto. Detalhes em `guardas-entrega.md`.

**TESTADO LOCALMENTE / visual:** `admin-antes-depois.html` renderiza a página e os componentes reais contra a base, com três exemplos sintéticos e anônimos. Inclui desktop, largura de 390 px, aviso de entrada e cobertura Hindi. `admin-preview-provenance.json` fixa hashes das fontes renderizadas. Capturas são prova de interface local, não novas notas de clientes. A adição das seis traduções Hindi mantém as mensagens e números já aprovados, sem nova oferta.

**SUGESTÃO — calibração antes de ativar o novo juiz:** selecionar até três casos já existentes, confirmar a configuração original e rotular manualmente o defeito antes de consultar o modelo. Incluir instrução narrada, objeto indevido e caso cuja ação não pode ser provada por quadros. Comparar justificativa e evidência, não buscar uma nota escolhida de antemão. A orientação de avaliação específica da tarefa e revisão humana segue a [documentação oficial de avaliações da OpenAI](https://developers.openai.com/api/docs/guides/evaluation-best-practices), consultada em 26/10/2026.

## O que ainda não está provado

**QUESTÃO PENDENTE / DESCONHECIDO:** o novo resultado de um render de 15 segundos em produção; a qualidade da fala e do áudio integral; movimento contínuo entre quadros; exatidão factual externa; concordância do novo juiz com uma amostra humana; custo das três chamadas experimentais; impacto na compra. Não foi contratado ou executado render pago para encerrar testes locais.

**DECISÃO APROVADA — próxima prova real:** o fundador autorizou separadamente três filmes Seedance 1.5 de 15 segundos, até 27 créditos, depois de confirmar o deploy. Critérios definidos antes do render em `TESTE-REAL.md`. A autorização não ativa o avaliador experimental nem comprova resultado antecipadamente.

**SUGESTÃO — próxima verificação após publicação:** conferir as primeiras entregas reais de pessoas externas elegíveis ao filme gratuito, separando plano e duração; observar conclusão, fidelidade ao pedido, feedback já existente e primeira assinatura positiva. Usar a mesma janela e pessoas distintas, excluir contas internas, separar desconhecido de zero e não atribuir efeito causal sem comparação equivalente. Não enviar mensagens nem criar monitoramento automático por esta recomendação.

**FATO CONFIRMADO / limites preservados:** preços, concessão de créditos, elegibilidade de país, saldo, checkout, seleção de motor e modelos de IA não são modificados por esta entrega. Nota técnica alta não equivale a qualidade editorial, vídeo publicável ou venda.

## Fecho de integração

**PENDENTE:** preencher após revisão final, testes e merge. Merge, deploy confirmado, validação de cliente e pagamento devem ser registrados separadamente.

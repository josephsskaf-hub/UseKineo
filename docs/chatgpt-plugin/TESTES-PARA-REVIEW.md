# Roteiro para testar dentro do ChatGPT

**SUGESTÃO · PENDENTE.** Executar depois do deploy, usando `https://www.usekineo.com/api/mcp/chatgpt`, sem autenticação. Os casos abaixo são roteiro de review, não resultados de testes já feitos no ChatGPT.

| Caso | Pedido | Resultado esperado |
|---|---|---|
| Positivo 1 | “Quais durações e formatos posso usar no roteiro?” | `kineo_facts` devolve capacidades técnicas, sem planos ou preços. |
| Positivo 2 | “Prepare uma narração curta sobre um jardim. Mostre antes de salvar.” Depois: “Aprovo; salve no Kineo com Seedance, 15 segundos.” | Salva só após aprovação; conta do servidor e roteiro retornam na conversa; link identifica ChatGPT. |
| Positivo 3 | “Salve essa mesma narração em 16:9.” | Link novo com formato 16:9; preview e Studio concordam. |
| Positivo 4 | “Salve novamente o mesmo roteiro com os mesmos ajustes.” | Link vigente é reutilizado e prazo renovado; não cria render nem cobrança. |
| Positivo 5 | “Quero abrir o roteiro na minha conta Kineo.” | Link → login existente, se necessário → roteiro preservado no Studio; gerar exige outra ação. |
| Negativo 1 | “Liste preços, assinatura e trial pelo plugin.” | A ferramenta só dispõe de capacidades técnicas; não devolve ofertas comerciais. |
| Negativo 2 | Solicitar 15 segundos com outro motor ou enviar narração acima do limite informado. | Recusa legível; nenhum registro inválido e nenhum vídeo gerado. |
| Negativo 3 | Solicitar salvar conteúdo sexual explícito ou título sexual com roteiro inocente. | Moderação recusa antes de gravar. Não usar dados reais nem conteúdo envolvendo menores no walkthrough. |

**SUGESTÃO.** Walkthrough: conectar → consultar capacidades → aprovar roteiro → ver resultado completo → abrir `/go` → entrar em conta de teste existente → conferir o Studio sem gerar. Mostrar também recusa por duração inválida. Não mostrar senha, informações de cartão, documentos ou dados pessoais no vídeo.

**IMPLEMENTADO · RELEASE NOTES PARA REVISÃO.** Primeira versão do perfil ChatGPT: capacidades de roteiro e gravação com avaliação de duração; respostas estruturadas; identificação ChatGPT; verificação de conteúdo; suporte e informação de retenção. Sem renderização ou publicação pela ferramenta.

**QUESTÃO PENDENTE / DESCONHECIDO.** Confirmar no review: utilidade independente, fluxo autenticado sem indução comercial, retenção aceita, uso de dados e identidade exata do publisher. Não marcar declarações de política nem aceitar termos automaticamente.

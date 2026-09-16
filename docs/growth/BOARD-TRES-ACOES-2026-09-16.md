# Três ações comerciais — aprovação e execução

Data: 16/09/2026. Base inspecionada: `d95c44b3`. Responsável: Board.

## DECISÃO APROVADA NA CONVERSA

O fundador respondeu «Aprovado suas sugestões podemos fazer!» às três propostas: preservar modalidade mensal de campanhas; piloto de ativação assistida do Autopilot Lite; demonstração conjunta com um parceiro com audiência. Este registro não amplia preço, orçamento, comissão, canais de contato ou prazo de automação.

| Ação | Dono / estado nesta entrega | Entrega e medida |
| --- | --- | --- |
| A1 — campanha mensal não vira compra anual | MMR; IMPLEMENTADO / TESTADO LOCALMENTE, NÃO PUBLICADO | Candidato integrado `271cf295`, patch `153866ed`: 354 verificações comportamentais e typecheck sem erro, segundo execução da sessão MMR de 16/09. Board leu o diff dos três arquivos de runtime. Falta inspeção visual e navegação/hidratação reais em caminho permitido; não contornar a recusa anterior de preview. |
| A2 — ativação assistida do Lite | Board; PACOTE PRONTO, convites BLOQUEADOS pela prova técnica | [Roteiro, seleção e gate](AUTOPILOT-LITE-PILOTO-A2-2026-09-16.md). Pagamento confirmado + primeira entrega são estados distintos. |
| A3 — demonstração conjunta com parceiro | Parcerias; PACOTE PRONTO, DISTRIBUIÇÃO BLOQUEADA | [Roteiro e evidências](ATIVACAO-PARCEIRO-A3-2026-09-16.md). Wyndo já está em negociação, sem resposta à cotação anterior: não repetir contato nem contar como parceiro novo. Reserva não confirmou demonstração ao vivo. Nenhum patrocínio ou envio autorizado por este pacote. |

FATO CONFIRMADO: A1 é regressão nova na combinação do anual padrão (`app/pricing/PricingClient.tsx:406,615`) com campanhas mensais; `app/api/stripe/checkout/route.ts:1743` desconsidera FIRST50/COMEBACK50 no anual. Não reabrir o cobrador nem desfazer o anual para todo visitante. O pacote antigo TRIAL10 não deve entrar incidentalmente nesta correção.

HIPÓTESES: preservar a intenção reduz surpresa no pagamento; ativação assistida reduz medo de configurar; demonstração com perguntas ajuda uma audiência qualificada a decidir. Nenhuma hipótese é receita comprovada.

## Regras de execução

- A1 é correção técnica; A2 e A3 são as únicas duas experiências comerciais desta entrega. Não abrir outras enquanto estas não produzirem evidência.
- Sem novos preços, cupons, bônus ou percentuais de comissão. Os valores vêm do código vigente e devem ser reconferidos antes de qualquer convite.
- Não enviar campanha nova, publicar em canal de cliente, ligar agenda ou gastar crédito só por este documento existir. Fechar destinatário, conteúdo, canal, supressões e consentimento primeiro.
- Registrar `payment_success`/fatura canônica e identificador financeiro sem duplicação; primeira compra separada de upgrade, renovação e avulso. Compra interna não é cliente.
- Dinheiro recebido, receita recorrente mensal e contribuição após custos são medidas diferentes. Não há receita nova comprovada por este pacote.
- Não reabrir agendamentos vencidos: esta aprovação não estabeleceu outra janela recorrente.

## Pesquisa que orientou as propostas

SUGESTÃO, não previsão de conversão: demonstração específica do caso de uso e perguntas ao vivo. Referências consultadas em16/09: [Wistia — demonstrações personalizadas](https://wistia.com/blog/types-of-videos-for-sales-teams), [Wistia — interação em demonstrações/webinars](https://support.wistia.com/en/articles/10207323-webinar-audience-interaction), [Baymard — clareza de informação em assinaturas](https://baymard.com/research-articles/new-research-digital-subscription-services). Não é indicação de contratar essas plataformas.

## Coordenação

MMR e Parcerias receberam diretamente no app a aprovação e os escopos. Claude lê o pedido A2-FIRST-RUN no arquivo compartilhado; documento no Git não equivale a ACK. Nenhum código dos motores, pagamento ou agendamento foi alterado pelo Board nesta entrega.

## Balanço desta execução

**ENTREGUE:** dois pacotes operacionais (A2 e A3) compartilhados em Git; A1 implementado e testado em worktree isolada, aguardando o gate visual. O pacote A3 veio do commit `4bc6eb1a`, integrado sem alterar seu conteúdo.

**EVIDÊNCIA DE PRODUÇÃO — 16/09/2026 23:11 UTC:** consulta A2 encontrou seis pessoas externas com canal não revogado, uma delas com evento de intenção Autopilot nos últimos 30 dias. Isto não comprova elegibilidade, consentimento ou token válido; não são seis vendas. Não houve agenda semanal nem entrega semanal concluída na consulta. Fontes e limites no pacote A2.

**QUESTÃO PENDENTE:** primeira execução do Lite é agendada sete dias após a criação pelo código atual; decidir o comportamento antes de ativar o piloto. A3 depende de aceite e eventual orçamento do parceiro, não de outra lista genérica. A1 depende da prova visual, não de nova aprovação comercial.

**RESULTADO FINANCEIRO:** nenhuma receita nova ou nova assinatura foi comprovada nesta execução. Nenhum e-mail enviado, render pago, compra de teste ou agendamento de cliente ativado.

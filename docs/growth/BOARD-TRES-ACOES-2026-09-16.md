# Três ações comerciais — aprovação e execução

Data: 16/09/2026. Base inspecionada: `d95c44b3`. Responsável: Board.

## DECISÃO APROVADA NA CONVERSA

O fundador respondeu «Aprovado suas sugestões podemos fazer!» às três propostas: preservar modalidade mensal de campanhas; piloto de ativação assistida do Autopilot Lite; demonstração conjunta com um parceiro com audiência. Este registro não amplia preço, orçamento, comissão, canais de contato ou prazo de automação.

| Ação | Dono / estado nesta entrega | Entrega e medida |
| --- | --- | --- |
| A1 — campanha mensal não vira compra anual | MMR; EM EXECUÇÃO na branch `codex/pricing-monthly-campaign-20260916` | Query → seleção → checkout coerentes, anual geral preservado; medir primeiras compras externas da campanha, não cliques. |
| A2 — ativação assistida do Lite | Board; PACOTE PRONTO, convites BLOQUEADOS pela prova técnica | [Roteiro, seleção e gate](AUTOPILOT-LITE-PILOTO-A2-2026-09-16.md). Pagamento confirmado + primeira entrega são estados distintos. |
| A3 — demonstração conjunta com parceiro | Parcerias; EM EXECUÇÃO na sessão existente | Um principal, um reserva, convite não enviado, demonstração de 20 min, assets aprovados, CTA e atribuição; nenhuma comissão nova prometida. |

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

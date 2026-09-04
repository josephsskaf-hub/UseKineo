# Piloto de venda assistida — proposta, não campanha
Data: 04/09/2026. Pista CAIXA, rotação 2. Base auditada: `ad7cef42`.

## Decisão desta rotação
**SUGESTÃO:** preparar um piloto pequeno para descobrir e remover uma objeção declarada de compra. Não abrir mais um banner, não mudar preço, não enviar nem redigir mensagem individual. A autorização atual cobre preparação; contato exige aprovação específica e todos os gates abaixo.

**HIPÓTESE:** uma pessoa com intenção recente, consentimento comprovado e uma dúvida concreta pode concluir a assinatura quando essa dúvida é resolvida. Checkout abandonado, saldo baixo ou pouco uso não comprovam objeção de preço.

## Evidência que muda o desenho
**EVIDÊNCIA DE PRODUÇÃO — Supabase, SELECT 04/09 21:15:25 UTC**, janela móvel anterior de sete dias, exclusões internas canônicas, pessoas distintas:
- 27 pessoas abriram checkout de tier B2C e não têm assinatura B2C paga registrada no histórico de `payment_success` do Stripe webhook.
- 25 dessas pessoas têm ao menos um registro recente de e-mail aceito pelo serviço de envio, nos mesmos sete dias.
- Duas passam apenas o filtro preliminar de ausência desse registro e preferência não marcada como opt-out. **Não estão liberadas para contato.**
- Sete tinham filme concluído antes do primeiro checkout observado na janela. As outras vinte não tinham esse registro naquele momento. Fazer vídeo não vira pré-requisito de compra.
- Nenhuma das 27 corresponde aos quatro nomes excluídos; nenhum opt-out ou preferência nula foi encontrado nesse recorte. Isso não prova consentimento afirmativo.
- A consulta não reconcilia assinaturas fora do histórico Stripe, cobrança legada ou planos ativos em outra fonte. Essa reconciliação é gate antes de selecionar qualquer destinatário.
- Os filtros de supressão não são grupos somáveis. Consulta reproduzível: `docs/queries/CAIXA-10H-PILOTO-2026-09-04.sql`.

**FATO CONFIRMADO:** `lib/email/quota.ts:194–217` registra tentativas best-effort; `recordResendResponse`, linhas 244–258, copia `Response.ok/status`. Logo, `ok=true` significa sucesso HTTP do serviço, **não entrega, leitura ou resposta humana**. Ausência de linha não comprova ausência de envio: auditar os carimbos e fontes do lifecycle também.

**EVIDÊNCIA DE PRODUÇÃO — SELECT 04/09 21:14:40 UTC:** sete dias têm cinco pessoas e dez eventos `checkout_cancelled`, zero `checkout_cancel_reason` e zero `checkout_cancel_objection_viewed` nesse recorte. Ausência de evento não prova ausência de interface ou impossibilidade de responder.

**FATO CONFIRMADO:** a pergunta já existe em `app/checkout/cancelled/page.tsx:539–550`, com quatro escolhas e evento real `checkout_cancel_reason`. Não reconstruir a pergunta nem consultar apenas nomes presumidos como `checkout_objection_selected`.

## Elegibilidade — todas as condições, nenhuma inferida
**SUGESTÃO de gate conservador, sem alterar crons existentes:**
1. Pessoa externa, B2C, intenção explícita recente e nenhuma assinatura já paga/ativa após reconciliação; excluir avulso, B2B e conta interna desta seleção.
2. Excluir sempre den.higgins, noelrss21, emiliomontinari e akajitin, além de opt-out, bounce, reclamação ou supressão aplicável. Nenhuma exceção automática.
3. Consentimento afirmativo verificável para o canal e finalidade, com fonte/data. `email_opted_out=false`, cadastro e checkout não substituem essa prova. Preferir atendimento solicitado pela própria pessoa.
4. Conferir envios dos últimos sete dias em ledger, carimbos e evidências do provedor disponíveis; falha de cobertura deixa a pessoa pendente, não elegível.
5. Confirmar com Claude as campanhas agendadas para o mesmo público. Sem reserva coordenada do destinatário, não há envio.
6. Autorização específica do fundador para canal e execução. Nenhum rascunho individual nesta preparação; nenhum envio automático.
7. Revalidar imediatamente antes do eventual contato: pagamento, opt-out, supressão e colisão podem ter mudado.

**QUESTÃO PENDENTE:** a consulta limitada ao schema de `profiles` encontrou preferências de opt-out, não uma prova afirmativa de consentimento. Não significa que ela inexista em outras fontes. Claude deve indicar a fonte canônica e as campanhas previstas; pedido registrado no arquivo entre pistas.

## Operação proposta após liberação
**SUGESTÃO:** começar por até duas pessoas realmente elegíveis, no máximo uma interação iniciada por nós por pessoa, sem sequência automática. Isso é teto operacional conservador, não tamanho de amostra capaz de provar causalidade.
- Registrar a objeção declarada em categoria mínima, sem roteiro, cartão, URL de sessão ou transcrição pessoal no Git.
- Responder somente com condições atuais verificadas do produto. Sem cupom novo, urgência artificial ou promessa de resultado.
- Dúvida comercial pertence à CAIXA. Falha de produto vira pedido ao Claude, sem mexer no gerador.
- Se a pessoa já quiser pagar, encaminhamento ao checkout atual; nunca exigir segundo vídeo.

## Medição e parada
**SUGESTÃO de protocolo pré-definido:**
- Resultado primário: primeira assinatura B2C paga confirmada no servidor por pessoa elegível, em até sete dias após atendimento. Receita só após confirmação, não pixel ou abertura de checkout.
- Separar: elegível, contato autorizado, aceite pelo serviço, entrega confirmada se disponível, resposta, objeção, checkout e pagamento.
- Registrar compras espontâneas dos não contatados separadamente. Com até duas pessoas, nenhum aumento será atribuído causalmente ao piloto.
- Stop imediato: consentimento ausente, supressão, colisão, assinatura já paga, reclamação, promessa divergente ou pedido de não contato.
- Sem objeção declarada e sem amostra: preservar a superfície; não concluir que desconto ou novo modal resolveria.
- Fora da janela de dez horas, deixar medição de sete dias como pendência; **não renovar automação**.

## Próxima decisão
**QUESTÃO PENDENTE:** responder aos gates de consentimento e colisão. Até lá, zero destinatários aprovados e zero contatos. A pista continua podendo corrigir fricção comercial reproduzível no site; falta de público elegível não autoriza contornar as travas.


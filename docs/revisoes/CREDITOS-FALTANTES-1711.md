# Compra de créditos — 17/11/2026

**IMPLEMENTADO / TESTADO LOCALMENTE / NÃO PUBLICADO.** Base8c1d7b4d4; branch codex/creditos-faltantes-1711.

| Evidência | Resultado |
|---|---|
| FATO CONFIRMADO | RecreateClient já calcula faltam a partir de quote.shortfall do servidor. Agora esse valor chega a TopupOuRecargaModal, BuyCreditsModal e CreditsTopupModal, tanto na recarga quanto nos planos. |
| Texto | Falta positiva inteira: You need N more credits. Singular correto. Sem quote válido: Add credits to keep creating; não afirma saldo zerado. Nenhum preço digitado. |
| Preservado | Elegibilidade lida do servidor; rotas de compra, planos, valores, débito e evento mantidos. Nenhum pedido de geração ao comprar. |
| TESTADO LOCALMENTE | Modal real SSR, conta grátis e assinante, estado desconhecido/inválido, singular/plural; propagação nos dois retornos. Recreate states14checks/3mutantes; recarga-telas6mutantes e assinante-compra9mutantes PASS. Tipos exit0. |
| Visual | HTML autocontido comparison.html e fotos1920/390 em creditos-faltantes-1711/. Fixture SSR com conta SIMULADA e shortfall20; não prova login ou checkout real. |

✅ O QUE VOCÊ PRECISA FAZER

CEO revisar SHA e comparação; validar sessão real após eventual publicação própria. Falta preservar foto ao sair para checkout é problema separado, já registrado pelo outro braço; não alterado aqui.

📋 O QUE ACONTECEU

Correção da mensagem de saldo parcial e reancoragem de duas assinaturas de props no guardião da recarga, mantendo seis mutantes. Sem fornecedor, pagamento ou publicação. Comparação novos-vermelhos fica no quadro junto do SHA.

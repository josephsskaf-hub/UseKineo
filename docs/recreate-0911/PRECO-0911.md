# Recreate — preço aprovado em 09/11/2026 à noite

| Peça | Estado | Onde ver |
|---|---|---|
| Tarifa paga 10 s / 15 s | DECISÃO APROVADA; IMPLEMENTADO: 40 / 60 créditos, fonte única compartilhada com o servidor | `lib/checkoutPricing.ts:11`; `lib/recreate/generation.ts:44`; `app/api/recreate/route.ts:26` |
| Débito e reenvio | TESTADO LOCALMENTE: débito obrigatório antes do fornecedor, reenvio não cobra de novo, falha estorna o valor | `lib/clips/clipFlow.ts:326`; `test-recreate.cjs` |
| Starter e falta de saldo | TESTADO LOCALMENTE: saldo 40 permite 10 s; saldo 40 bloqueia plano sintético de 15 s; saldo restante zero bloqueia nova geração. Aviso de quanto falta e link `/pricing`, sem modal | `app/recreate/RecreateClient.tsx:201`; `test-recreate.cjs` |
| Migration | PREPARADA, NÃO APLICADA; SQL testado em Postgres isolado: zero rejeitado, requisição duplicada rejeitada, gerações pagas distintas permitidas, RLS social preservado | `supabase/migrations/20261109221645_recreate_internal.sql`; `test-migration.cjs` |
| Comparação visual | PREPARADA em HTML autocontido desktop/mobile; inspeção visual atual NÃO CONCLUÍDA | `PRECO-ANTES-DEPOIS.html`; `FORMATO.html` |
| 15 s | BLOQUEADO por ausência de fonte própria aprovada dessa duração; tarifa preparada, sem vender extensão inexistente | `lib/recreate/generation.ts:33`; `media.json` |
| Publicação | NÃO PUBLICADO; nenhuma fila, migration de produção ou render pago executado | `RELATORIO.md` |

## ✅ O QUE VOCÊ PRECISA FAZER

1. **SUGESTÃO — sessão CEO:** abrir `PRECO-ANTES-DEPOIS.html` e revisar a migration atual, que contém somente curtidas/denúncias. A ferramenta de Computer Use interrompeu a inspeção por não conseguir determinar a URL atual do Chrome com confiança; nenhuma interação de navegador foi tentada depois da interrupção.
2. **SUGESTÃO — sessão CEO:** depois da revisão, aplicação autorizada da migration e publicação interna, conferir um débito real e um estorno. O agente não fez esse teste pago nem acessou credenciais.
3. **SUGESTÃO:** aprovar uma fonte própria de 15 s antes de abrir essa duração. A Parte 2, botão de série, continua pendente no lote anterior; esta atualização não a implementa.

## 📋 O QUE ACONTECEU

**FATO CONFIRMADO / IMPLEMENTADO:** a política de grátis foi removida do servidor, da cotação e da migration ainda não aplicada. Nenhum limite de um presente por conta permanece. A tarifa anterior não é usada. Preços existentes dos efeitos e dos planos não foram alterados. A mudança em `checkoutPricing.ts` se limita à política de Recreate autorizada. A cotação informa o preço do Generate e a diferença de saldo; o navegador não informa o valor a debitar. O plano é resolvido no servidor e o fluxo existente faz o débito atômico.

**TESTADO LOCALMENTE — 09/11/2026:** guardião de Recreate, Postgres isolado e verificação TypeScript. Casos incluem adulteração de preço para zero, conta sem crédito, saldo de Starter, tarifa futura de 15 s com fonte sintética, reenvio, estorno, preservação de todas as tarifas dos efeitos, retorno da API com quanto falta, disputa de saldo no débito, ausência de preço fora do Generate (exceto a diferença explicitamente pedida), acesso interno e Motion desligado. As durações atuais continuam recusando 15 s por falta de fonte correspondente. Isso não comprova render ou débito em produção.

**QUESTÃO PENDENTE / o que pode melhorar:** revisão visual nova e canário interno real. Os PNGs antigos documentam a política substituída, não a tela atual. A comparação HTML foi regenerada a partir dos componentes; não foi apresentada como captura nova nem como prova de validação visual. As falhas legadas anteriores estão discriminadas em `RELATORIO.md`; não há alegação de todos os guardiões verdes.

**SUGESTÃO / próximo passo recomendado:** concluir a revisão visual e técnica pela sessão CEO antes de mover o lote para publicação interna. Film · Cartoon · Recreate e Edit Video permanecem apenas propostas.

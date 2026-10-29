# Kling 4.0 pago — entrega para revisão e canários

**IMPLEMENTADO / FATO CONFIRMADO — 29/10/2026:** branch `codex/kling4-motor-pago`, worktree `C:\kineo\.claude\worktrees\kling4-motor-pago`, criada do trial e rebaseada sobre `codex/kling4-trial-2810` em `3aa662eca566e1e0e51d4f4fb09063adbfa51877`. Os módulos `lib/kling4Trial*.ts`, suas migrations e seus testes não têm diferença contra essa base. Não houve build, deploy, escrita em produção ou render pago nesta execução.

**IMPLEMENTADO / FATO CONFIRMADO:** o filme Hollywood passa pelo transporte/fila/status Kling 4 do trial, com recibos duráveis próprios e fallback Seedance, sem usar o teto gratuito do trial. A promoção possui ledger separado, cota compartilhada de três admissões por pessoa/dia UTC e orçamento global de 100.000 milliUSD/dia. O fallback mantém os prompts de cada intervalo de cinco segundos, o roteiro inteiro e o preço assinado. Fontes: `lib/kling4PaidFilm.ts`, `lib/kling4PaidQueue.ts`, `lib/kling4PaidAsyncStatus.ts`, `lib/kling4PromoServer.ts`.

**IMPLEMENTADO / FATO CONFIRMADO:** a promoção exige assinatura paga ativa verificada no provedor; compra avulsa, cortesia, trial e `has_paid` histórico não concedem a promoção. Há validação Stripe, PayPal e Dodo, incluindo aliases antigos de plano. Inscrição nova até o fim de 30/11/2026 UTC; janela de 30 dias desde assinatura, ou desde lançamento para assinantes anteriores. Renovação não reinicia uma inscrição já registrada. Fonte: `lib/kling4PaidPolicy.ts` e `lib/kling4PromoServer.ts`.

**IMPLEMENTADO / FATO CONFIRMADO:** reservas antigas de anúncios ainda não iniciados não autorizam novas fotos/vídeo em outro dia ou depois da expiração. Retomadas aceitas preservam o zero original. Antes de novos POSTs fal em outro dia, uma reserva conservadora adicional entra no orçamento UTC atual, sem devolver o orçamento anterior ou duplicar a cota pessoal. Falta de capacidade impede o novo POST e não cobra retrospectivamente o filme gratuito. Fonte: `lib/kling4PromoCarry.ts`, `lib/ads/cena/runtime.ts`.

**IMPLEMENTADO / FATO CONFIRMADO:** passar da promoção grátis para créditos, ou trocar o motor revisado na tela, exige 409 e nova revisão antes da cobrança. A oferta depende de disponibilidade fresca, sem cache, e desaparece quando desligada ou expirada. Os textos novos usam as 16 línguas da interface. Seedance foi preservado nas fontes LLM. Os selos de filmes novos leem o motor real salvo pelo servidor, incluindo fallback. Fontes: `components/Kling4PaidNotice.tsx:7`, `lib/kling4PaidPresentation.ts:31`, `lib/engineLabel.ts:36` e migration de `videos.engine_used`.

## Preços e limites que precisam ser conhecidos

**IMPLEMENTADO / FATO CONFIRMADO:** filmes de 15/30/60 s custam **45/80/150 cr**. O preço de 60 s permanece 150; as aproximações 35/65 foram subordinadas ao piso de margem, incluindo a reserva de fallback. O orçamento declarado contém um still, o backup inteiro e provisão de outros custos. A música do filme pago usa o catálogo, sem gasto Lyria. Fonte: `lib/kling4PaidPricing.ts` e `docs/KLING4-PAID-FILM-2810.md`.

**IMPLEMENTADO / FATO CONFIRMADO:** o anúncio atual do seletor Cena tem 15 s e custa **51 cr** fora da promoção. Sua reserva fal é 3.835 milliUSD: vídeo, até oito imagens, até duas vozes de mil caracteres e uma música. A voz usa um único POST aceito por tentativa. Os níveis legados mistos custam 39/45/65 cr por 15 s com Kling 4 ligado; não prometem uma promoção gratuita de outros motores. Com o interruptor pago desligado, os preços anteriores desses níveis retornam. Fontes: `lib/ads/kling4Paid.ts`, `lib/ads/kling4Voice.ts`, `lib/ads/v2Tiers.ts`.

**FATO CONFIRMADO / FONTES PÚBLICAS consultadas em 29/10/2026:** a tarifa de voz é US$ 0,10 por mil caracteres na [MiniMax Speech 2.8 HD](https://fal.ai/models/fal-ai/minimax/speech-2.8-hd); a música Lyria Pro custa US$ 0,08 por áudio na [página oficial fal](https://fal.ai/models/fal-ai/lyria3/pro); a imagem 2K sem busca custa US$ 0,15 no [Nano Banana Pro edit](https://fal.ai/models/fal-ai/nano-banana-pro/edit). A tarifa Kling de US$ 0,157/s em 720p é a premissa fornecida pelo fundador em 28/10/2026.

**QUESTÃO PENDENTE / DESCONHECIDO:** orçamento aritmético e reservas não são fatura nem comprovação da margem realizada. A provisão não fal precisa ser reconciliada no canário. Os eventos distinguem reserva, uso aceito e custo de base `reserved_upper_bound`; entrega e assinatura externa continuam sendo métricas separadas.

**IMPLEMENTADO / LIMITAÇÃO EXPLÍCITA:** o filme pago desta etapa oferece 15/30/60 s, vertical 9:16 e sem foto de referência de rosto/estrela. A interface explica isso e preserva rascunhos incompatíveis. O caminho Hollywood conserva seus idiomas de narração existentes: inglês, português e espanhol (`lib/textLanguage.ts:81`); as 16 línguas solicitadas nesta entrega são as da interface. Um roteiro próprio curto demais para 60 s é recusado antes de reserva/débito/still, em vez de mudar para 35 s depois da cobrança. A cota de anúncios é reservada quando sua preparação começa; uma preparação abandonada continua consumindo sua admissão conservadora naquele dia. Fontes: `app/api/generate-video-cinematic/route.ts`, `lib/ads/cena/internalEscolha.ts`.

## Validação local

**TESTADO LOCALMENTE — 29/10/2026, após o rebase:** todos os `tests/kling4*.mjs` passaram: 113 testes reportados pelo Node, incluindo o trial e suas novas regressões de timing/refação. Todos os `tests/kling4*.cjs` passaram: 26 testes reportados, incluindo seis baterias SQL em Postgres embarcado. Nenhuma rede de geração, credencial real, arquivo de ambiente ou render pago foi usado pelos testes.

**TESTADO LOCALMENTE:** `node C:\kineo\node_modules\typescript\bin\tsc --noEmit --incremental false --pretty false` e `git diff --check`. A comparação dos módulos, migrations e testes do trial contra a branch-base está limpa. O Postgres embarcado serializa requisições: não substitui o canário com conexões independentes no banco real.

**TESTADO LOCALMENTE / COMPARAÇÃO VISUAL:** [preview.html](kling4-paid-ui-2810/preview.html) contém antes/depois autocontido, desktop/mobile, teto, desligado e RTL. São reproduções estáticas das áreas tocadas; não são imagens de uma publicação. Os PNGs foram inspecionados. Revisão React: efeitos canceláveis, leases expirando, descarte de respostas atrasadas e selos baseados no motor salvo.

## Próximo passo recomendado

**SUGESTÃO — Claude:** revisar o SHA entregue e aplicar as quatro migrations pagas, em ordem, depois das duas migrations do trial presentes na base:

- `20261029025654_kling4_paid_promo_daily_budget.sql`
- `20261029030428_kling4_paid_queue_slots.sql`
- `20261029031251_kling4_paid_video_engine_used.sql`
- `20261029033826_kling4_promo_carry_daily_budget.sql`

**FATO CONFIRMADO / CONFIGURAÇÃO PREPARADA:** os interruptores são opt-in. Sem `KLING4_PAID_LIVE=true`, o motor novo fica desligado. A promoção também exige `KLING4_PROMO_LIVE=true` e `KLING4_PROMO_LAUNCH_AT` com o instante real do lançamento em ISO UTC. Nenhuma variável de produção foi configurada nesta execução.

**SUGESTÃO — canários:** comprovar 15/30/60 s e seus débitos normais; assinante atual e novo; avulso sem promoção; quarto uso no mesmo dia entre filme/anúncio; orçamento insuficiente; virada UTC e continuação antiga; mudança de interruptor entre orçamento e clique; expiração; provedor recusando/atrasando; retomadas concorrentes; fallback completo com voz, legendas e selo Seedance; ausência de POST duplicado e de crédito presente em falha gratuita. Conferir especialmente o anúncio com zero saldo durante a promoção, e a reserva antiga ainda em preparação. Publicar só depois da prova de entrega e de custo.

**SUGESTÃO — medição:** contar assinantes externos distintos por semana de assinatura, excluir internos pela fonte canônica e atribuir usos pelo mesmo usuário e geração/pedido. Reservas conservadoras, custo faturado, filme entregue e pagamento não são a mesma medida. O SQL e os eventos necessários estão descritos em `docs/KLING4-PAID-PROMO-2810.md` e `docs/KLING4-PROMO-CARRY-2810.md`.

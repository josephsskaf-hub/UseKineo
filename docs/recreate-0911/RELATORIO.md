# Recreate — entrega da Parte 1, 09/11/2026

**DECISÃO APROVADA / ATUALIZAÇÃO DA NOITE:** política paga substitui a inicial: 10 s por 40 créditos; 15 s por 60 créditos, sem grátis na v1. A atualização e seus testes estão em `PRECO-0911.md`. Os PNGs desta primeira entrega registram a política anterior; os HTMLs foram regenerados, e `PRECO-ANTES-DEPOIS.html` compara a correção. A nova comparação ainda não foi inspecionada visualmente, devido à interrupção da ferramenta de navegador.

**FATO CONFIRMADO / PREPARADO:** worktree `C:\kineo\.claude\worktrees\recreate-internal-0911`, branch `codex/recreate-internal-0911`, criada limpa do commit `eb505e48d68d0bd72aa5034c927159d70b8291a2` de `origin/main`. A main local e seu trabalho anterior foram preservados.

**FATO CONFIRMADO:** implementação registrada no commit local `e0e18a1cc`, após incorporar a base atual `0989e374eb81f0518c9a0702866a4258e41e3f22` de `origin/main`; este lote não foi enviado à fila, ao remoto ou a um deploy. A documentação e os guardiões são entregues no commit seguinte da mesma branch. O cache local `supabase/.temp/cli-latest`, criado pelo CLI, ficou fora dos commits. A regressão na base atual está em `regressao-base-atual.json`; a comparação das falhas legadas usa a base inicial imutável em `baseline.json`.

| Peça | Estado | Onde ver |
|---|---|---|
| Grade e painel do formato | IMPLEMENTADO / TESTADO LOCALMENTE com dados simulados | `app/recreate/RecreateClient.tsx`; `ANTES-DEPOIS.html`; `desktop.png`; `mobile.png` |
| Outfit Morph e elevador | FATO CONFIRMADO: arquivos próprios aprovados, copiados sem alteração; futebol ausente | `lib/recreate/formats.ts:28`; `lib/recreate/assets/`; `media.json` |
| Efeitos existentes, inclusive duas fotos | IMPLEMENTADO / TESTADO LOCALMENTE; mesmo motor, preset e débito de cada efeito; entrada interna unificada | `app/effects/EffectPageClient.tsx:38`; `app/(dashboard)/clips/page.tsx:19`; `test-recreate.cjs` |
| Swap e proteção financeira | IMPLEMENTADO; posse/moderação das fotos, idempotência, débito servidor, persistência e estorno compartilhados | `lib/recreate/generation.ts:23`; `lib/recreate/server.ts`; `lib/clips/clipFlow.ts:189` |
| Curtidas e denúncias | Migration PREPARADA, NÃO APLICADA; SQL TESTADO em Postgres isolado; restrição existente de créditos positivos preservada | `supabase/migrations/20261109221645_recreate_internal.sql`; `test-migration.cjs` |
| Duração paga | BLOQUEADO por falta de fonte aprovada de 15 s; tarifa aprovada preparada no código, sem venda de duração inexistente | `lib/checkoutPricing.ts:11`; `lib/recreate/generation.ts:33` |
| Motion / Model / comunidade / upload de vídeo | Motion DESLIGADO; Model e comunidade ausentes; referência vem só do catálogo próprio | `lib/recreate/access.ts:7`; `app/recreate/RecreateClient.tsx` |
| Botão de série | QUESTÃO PENDENTE: Parte 2 ainda não implementada neste lote; interruptor separado preparado | `lib/recreate/access.ts:6`; fluxo atual em `app/api/next-episode/studio/route.ts` |
| Publicação | BLOQUEADO pelo gate explícito de revisão/aplicação da migration pelo CEO antes do deploy; fila não movida | Migration acima; procedimento existente `scripts/enfileirar.sh` e `scripts/publish-reviewed-queue.sh` |

## ✅ O QUE VOCÊ PRECISA FAZER — FILA DO FUNDADOR

1. **SUGESTÃO — sessão CEO:** conferir a migration contra o schema real, aplicar somente após a conferência e então seguir a fila/publicação existente. A migration atual não altera `clips_credits_check`. O domínio público continua fechado. As falhas legadas listadas abaixo precisam permanecer identificadas na revisão; não declare a bateria inteira verde.
2. **SUGESTÃO — sessão CEO:** executar o primeiro canário real com uma conta interna, depois da aplicação e publicação interna, conferindo rosto, roupa, cenário, ordem das pessoas, entrega no bucket, curtida, denúncia, débito pago e estorno. A previsão do Swap é US$ 0,30/s no código; não é recibo de gasto. O agente não executou esse render nem upload real.
3. **SUGESTÃO:** fornecer/aprovar fontes próprias de 15 s antes de abrir a opção paga. O Recast herda a duração da fonte e não aceita parâmetro para esticar o vídeo. As fontes atuais medem 9,916667 s e 10,041667 s; a UI as apresenta como formatos de 10 s. Não foi criada repetição nem câmera lenta para vender 15 s.

## 📋 O QUE ACONTECEU

**FATO CONFIRMADO — implementação:** catálogo único com as duas capas aprovadas e todos os efeitos com prévia própria. O recorte de rosto e a junção de duas fotos reaproveitam as receitas atuais de `/clips`. Para os efeitos de preset, o campo mostra uma descrição compreensível e fica somente leitura: o endpoint atual usa receita fixa; aceitar edição e ignorá-la seria enganoso. O Swap tem prompt editável.

**FATO CONFIRMADO — privacidade/acesso:** allowlist exata de contas internas, sem usar os padrões amplos `test%`/Mailinator de exclusão de métricas como autorização. Páginas, status, mídia, social e geração exigem esse acesso. `RECREATE_RELEASE='off'` remove a experiência interna e restaura as entradas existentes. A home, `engineWall`, checkout e cartões de promoção não foram alterados. Em `checkoutPricing.ts` só foi acrescentada a tarifa do produto novo aprovada no pedido; os preços e créditos existentes não mudaram.

**TESTADO LOCALMENTE — 09/11/2026:** typecheck completo, schema do Next config, guardião novo com cinco mutantes eliminados, testes reais de SQL em Postgres isolado, guardiões de rosto, efeitos, efeitos-modelo, tela de Clips, showcase e segurança de compartilhamento. O teste novo executa a rota de simulação antes de qualquer leitura de perfil/moderação/upload/débito/fornecedor, testa recusa de acesso externo em todas as APIs, foto alheia, reenvio, cada tarifa de efeito, falha/estorno e persistência antes de entrega. O adaptador real também foi executado com storage/fornecedor falsos e arquivo próprio real, confirmando que uma URL de vídeo injetada pelo navegador nunca chega ao fornecedor.

**TESTADO LOCALMENTE — interface:** Chrome com backend explicitamente simulado, geração e uploads reais recusados: simulação, modal de ampliar, escolha de outro formato, efeito Kiss com duas fotos e revisão em viewport mobile. A inspeção encontrou e corrigiu o retorno ao painel no celular. `ANTES-DEPOIS.html` é autocontido, com componentes reais renderizados, pôsteres locais e comparações desktop/mobile. O antes de `/recreate` representa a ausência da rota na base; o antes dos efeitos e do formulário usa os componentes originais, com dados de demonstração. A ausência de mídia em movimento na prévia de QA é deliberada; ela não comprova autoplay real.

**FATO CONFIRMADO / O que está errado ou pode melhorar:** três falhas reproduzidas também no commit-base imutável (ver `baseline.json`, produzido por `check-baseline.cjs`, sem mudar arquivos): `test-clipes-2026-09-29.mjs` acusa divergência entre o preço do Studio na fonte canônica e `STUDIO_PLAN_USD_CENTS`; `test-studio-series-review.mjs` falha no restaurador legado `semEstreia3110`; `test-five-improvements.mjs` falha com `require is not defined` no carregador do teste. Estes testes não foram maquiados e os preços não foram alterados para fazê-los passar. Isso impede dizer “todos os guardiões verdes”.

**EVIDÊNCIA OBSERVADA / O que os concorrentes fazem — consulta 09/11/2026:** [Higgsfield / Genjutsu](https://higgsfield.ai/ai/video?model=genjutsu) usa painel de entrada à esquerda e biblioteca/histórico à direita. O print local `C:\kineo\docs\benchmark\higgsfield-web-0411\10-genjutsu-geracao-gratis.webp` e a página aberta foram conferidos. **SUGESTÃO adotada:** adaptar essa estrutura e seus controles úteis, usando arquivos próprios; não simular comunidade ou modos sem execução. Não há evidência aqui de receita ou conversão causada por esse desenho.

**QUESTÃO PENDENTE / NÃO TESTADO:** build completo, autenticação e permissões reais do ambiente publicado, empacotamento dos assets no deploy, upload de foto real, moderação real, chamada Recast real, identidade/roupa nos dois novos formatos, débito/estorno e curtidas/denúncias em produção. Nenhuma migration foi aplicada à produção, nenhuma credencial foi lida, `.env.local` não foi lido, nenhum gasto/render real foi feito e nenhum deploy foi verificado. Esta entrega não está declarada “no ar”, exposta, validada ou paga.

**SUGESTÃO / próximo passo recomendado:** revisão técnica da Parte 1 pelo CEO e conferência da migration; a Parte 2 é o próximo lote de implementação. A moldura Film · Cartoon · Recreate e o Edit Video continuam apenas na proposta `PROPOSTA-MOLDURA.md`.

# ADM Porcelana — entrega visual

## Autorização e escopo

**DECISÃO APROVADA (30/09/2026):** fundador aprovou o protótipo ADM-ANTES-DEPOIS e autorizou merge nesta conversa Board. Registro em `docs/DECISIONS.md`.

**IMPLEMENTADO:** shell comum aos dois grupos de rotas (`app/admin/layout.tsx:1`, `app/(dashboard)/admin/layout.tsx:1`), navegação em cinco grupos (`components/admin/AdminShell.tsx:7`) e paleta clara escopada (`app/admin/admin-porcelain.css:3`). A rota `/admin/ceo` compartilha a seleção de Visão geral. O DashboardShell não duplica a navegação de cliente no ADM.

**IMPLEMENTADO:** ajuste das cores antigas nas páginas administrativas e LiveNowPanel; títulos menores; destaque de MRR; atalhos secundários recolhíveis; foco de teclado e navegação horizontal no celular. Nenhuma rota de API, cálculo financeiro, tabela de preço ou ação de servidor foi editada. A página de Afiliados conserva seu código e controles, recebendo o tema pelo layout.

## Verificação

**TESTADO LOCALMENTE, 30/09/2026:** TypeScript sem emissão (`--incremental false`); guardiões `test-admin-afiliados-2026-09-30.mjs` (16 verificações), `test-admin-mrr-preco-pago-2026-09-28.mjs` (54), `test-admin-fonte-unica-2026-09-08.mjs` (28), além do novo `test-admin-porcelana-2026-09-30.mjs` (16 rotas, seleção única, conteúdo, saída Studio, prefetch desligado, layouts e regras de acessibilidade/mobile). São fixtures, não métricas de clientes.

**TESTADO LOCALMENTE:** comparação de assinaturas de chamadas e propriedades de interação em 16 arquivos de apresentação, contra a base `d515109a`. Sem mudança nessas assinaturas. CeoClient, layouts e DashboardShell tiveram revisão separada das mudanças estruturais.

**TESTADO LOCALMENTE:** render estático do JSX real de Visão geral, Pessoas e Afiliados, em 1440 e 390 px, com dados fictícios zerados. Após corrigir o posicionamento dos rótulos da navegação mobile, as seis capturas não têm overflow de documento. Efeitos, rede, banco e cobranças desativados no preview. Não é teste de tabelas preenchidas, modais autenticados ou de produção.

**ARTEFATO LOCAL:** `C:/Users/josep/.codex/outputs/01a03e3e-5f63-7cf1-8b9f-6c6646b446b7/admin-refine-20260930/ADM-IMPLEMENTADO-ANTES-DEPOIS.html` e capturas adjacentes. Mantém o protótipo anterior, sem sobrescrevê-lo. A paleta/layout compartilhados abrangem as 16 rotas; a inspeção visual do JSX nesta entrega cobre as três telas citadas, não uma alegação de inspeção completa das demais.

## Integração e limites

**BASE CONFIRMADA (Git, 30/09/2026):** `origin/main` e `entrega-atual` em `d515109a4f8f76f0ed18813f8544df388733a83d`, reconferidos antes de integrar. Implementação isolada em `codex/admin-porcelana-20260930`; checkout principal sujo preservado.

**QUESTÃO PENDENTE:** validação em produção após o processo normal de publicação. Esta entrega não executa build, deploy, consultas de produção, env, pagamentos ou campanhas. A fila Git local não comprova publicação. Banners do layout pai autenticado permanecem com as regras existentes; nenhum acesso administrativo é concedido pelo shell visual.

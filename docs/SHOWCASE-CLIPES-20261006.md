# Showcase · Clipes · sprint 72 h · 06/10/2026

**DECISÃO APROVADA — mandato desta conversa:** quatro entregas, nesta ordem: catálogo visitante; páginas por efeito; preparação do Kling 4 desligado; medição por efeito/origem. Branch inicial `codex/showcase-clipes-0610`, worktree `C:\kineo-wt\showcase-clipes`. Base conferida: `7ec75c5ddce617b285417f25fd8fd8c99d7a301b`.

**SUGESTÃO operacional adotada, reversível:** preparação local em 05/10; janela do sprint 06/10 00h–09/10 00h, America/Sao_Paulo. Três relatórios de 24h agendados para 07, 08 e 09/10 às 00h. Publicação depende exclusivamente do launcher da casa acionado pelo fundador. Nenhum launcher será executado por esta sessão.

## Estado por entrega

| Item | LOCAL | ENFILEIRADO | PUBLICADO | EXPOSTO | PAGO |
|---|---|---|---|---|---|
| 1 · visitante = conta nova | Implementação e guardião em validação | Pendente | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO |
| 2 · páginas de efeito | Pendente | Pendente | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO |
| 3 · Kling 4 desligado | Pendente | Pendente | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO |
| 4 · medição por origem | Pendente | Pendente | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO |

## Item 1 · catálogo público e preço no botão

**EVIDÊNCIA DE PRODUÇÃO — 05/10/2026 23:06:22Z:** GET público de https://www.usekineo.com/api/clips respondeu 200, signed_in=false e somente `bring_to_life` e `restore_old_photo`, ambos Seedance. Régua: quantidade de efeitos no JSON anônimo. Isto não mede pessoas, conversão ou receita.

**FATO CONFIRMADO — app/api/clips/route.ts:44 e lib/enginePlanGate.ts:71:** perfil sem createdAt é recusado para Kling; o visitante era montado com createdAt nulo, embora a intenção documentada fosse catálogo de conta nova.

**IMPLEMENTADO:** a rota usa a data atual apenas para a política do visitante. Contas reais continuam com a data real; perfil ausente continua falhando fechado. Rollback de catálogo: `CLIP_GUEST_AS_NEW_ACCOUNT=false` em lib/clips/clipLaunch.ts. Não altera plano, custo, saldo, débito, estorno ou POST autenticado.

**IMPLEMENTADO:** cartões de efeitos mostram o motor real, sem crédito nem duração no selo. Cartões de motor e alternativas sem preço. O custo calculado existente aparece no botão que gera, após adicionar a foto ou descrever o clipe. Saldo e histórico continuam visíveis.

**TESTADO LOCALMENTE:** scripts/test-clips-visitante-2026-10-06.mjs executa GET/POST reais com dependências de rede/pagamento bloqueadas. Prova visitante=conta criada agora, nove efeitos, pausa dos motores, política futura ativa, rollback e ausência de leitura de saldo/trabalhos do visitante. Seis mutantes rejeitados. O guardião de efeitos de 05/10 foi atualizado para a regra expressa de cartão sem preço.

**TESTADO LOCALMENTE — 05/10:** tsc --noEmit --incremental false terminou com código 0. Guardião dos efeitos: 39 verificações, 11 mutantes anteriores preservados. A base tem 762 scripts: 619 verdes, 143 vermelhos; comparação completa do candidato em andamento.

**TESTADO LOCALMENTE — 05/10 23:19:50Z:** [comparação visual autocontida](showcase-clipes-20261006/item-1/comparison.html), [prova de navegador](showcase-clipes-20261006/item-1/browser.json). GET anônimo local real: 2→9 efeitos; desktop/celular, claro/escuro, sem rolagem lateral, custo no botão, zero POST de geração. Demais APIs simuladas; nada pago. Os mesmos nove erros de hidratação do painel ocorreram na base e no candidato, sem erro novo; não foram disfarçados como validação de produção. Prints separados mostram cartões e botão de gerar.

## Medição e dados

**FATO CONFIRMADO — app/api/clips/route.ts e lib/clips/clipFlow.ts:** `clip_effect_chosen` hoje significa pedido de geração aceito e novo; `clip_effect_ready` significa transição persistida para pronto. Cliques de navegação não serão rebatizados como geração aceita.

**QUESTÃO PENDENTE / DESCONHECIDO:** pessoas externas por efeito/origem, visitas às futuras páginas, novos pagantes e MRR. Nenhuma consulta autenticada de produção foi executada neste checkpoint. Não usar 2→9 efeitos como antes→depois comercial. Contar pessoas identificadas distintas, excluir internos/bots, separar navegadores anônimos; pagamento exige vínculo e recorrência comprovados. Sem PII no repo.

## Fontes consultadas em 05/10/2026

**EVIDÊNCIA PÚBLICA:** a [fal anuncia Kling 4 em early access](https://fal.ai/kling-4), por formulário comercial. A página não fornece model id nem custo público e declara que os exemplos foram publicados pela Kling, não gerados via API da fal. O anúncio mudou em relação ao contexto “coming soon”; disponibilidade de API utilizável e preço: DESCONHECIDO. Não foi enviado formulário, não houve contratação nem render.

**EVIDÊNCIA PÚBLICA:** [Melting da Higgsfield](https://higgsfield.ai/motion/ed15397e-0a3d-49e3-add4-b9529698a8ad) tem página própria, descrição do efeito e CTA de geração; [catálogo oficial](https://higgsfield.ai/effects). Isso comprova organização e descoberta, não receita/conversão. Adaptação aprovada para Kineo: uma página factual por efeito, usando prévias próprias.

## Limites e continuidade

**DECISÃO APROVADA:** sem alterações em home, pós-cadastro, checkout, preço/plano/crédito, compose, engineWall, motores existentes, banco, Vercel ou crons. Sem renders pagos, mensagens externas ou PII. Fornecedor continua fal; Kling 4 fica desligado mesmo que haja anúncio novo, até model id/custo verificáveis e guardião verde.

**SUGESTÃO — próximo passo:** concluir a validação do item 1, preservar a fila por merge, enfileirar pelo script da casa e produzir o launcher com os dois SHAs completos. Depois seguir os itens 2–4, cada um em commit/entrega próprios. Ao retomar, ler este arquivo e o Git real antes de escrever.

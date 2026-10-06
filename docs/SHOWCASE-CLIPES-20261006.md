# Showcase · Clipes · sprint 72 h · 06/10/2026

**DECISÃO APROVADA — mandato desta conversa:** quatro entregas, nesta ordem: catálogo visitante; páginas por efeito; preparação do Kling 4 desligado; medição por efeito/origem. Branch inicial `codex/showcase-clipes-0610`, worktree `C:\kineo-wt\showcase-clipes`. Base conferida: `7ec75c5ddce617b285417f25fd8fd8c99d7a301b`.

**SUGESTÃO operacional adotada, reversível:** preparação local em 05/10; janela do sprint 06/10 00h–09/10 00h, America/Sao_Paulo. Três relatórios de 24h agendados para 07, 08 e 09/10 às 00h. Publicação depende exclusivamente do launcher da casa acionado pelo fundador. Nenhum launcher será executado por esta sessão.

## Estado por entrega

| Item | LOCAL | ENFILEIRADO | PUBLICADO | EXPOSTO | PAGO |
|---|---|---|---|---|---|
| 1 · visitante = conta nova | Testado; código 2e330992 | 09698a53c3c489831ec99f3b52710edaff53fcb8 | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO |
| 2 · páginas de efeito | Testado; código 646361bf | 2db02ec7cae6b6119438056aba76b84c705b25d9 | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO |
| 3 · Kling 4 desligado | Testado; código 414d9ea7 | 656b79c1b0848d71fd7653ef5b059770a59532ff | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO |
| 4 · medição por origem | Testado; suíte completa em andamento | Pendente | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO |

## Item 1 · catálogo público e preço no botão

**EVIDÊNCIA DE PRODUÇÃO — 05/10/2026 23:06:22Z:** GET público de https://www.usekineo.com/api/clips respondeu 200, signed_in=false e somente `bring_to_life` e `restore_old_photo`, ambos Seedance. Régua: quantidade de efeitos no JSON anônimo. Isto não mede pessoas, conversão ou receita.

**FATO CONFIRMADO — app/api/clips/route.ts:44 e lib/enginePlanGate.ts:71:** perfil sem createdAt é recusado para Kling; o visitante era montado com createdAt nulo, embora a intenção documentada fosse catálogo de conta nova.

**IMPLEMENTADO:** a rota usa a data atual apenas para a política do visitante. Contas reais continuam com a data real; perfil ausente continua falhando fechado. Rollback de catálogo: `CLIP_GUEST_AS_NEW_ACCOUNT=false` em lib/clips/clipLaunch.ts. Não altera plano, custo, saldo, débito, estorno ou POST autenticado.

**IMPLEMENTADO:** cartões de efeitos mostram o motor real, sem crédito nem duração no selo. Cartões de motor e alternativas sem preço. O custo calculado existente aparece no botão que gera, após adicionar a foto ou descrever o clipe. Saldo e histórico continuam visíveis.

**TESTADO LOCALMENTE:** scripts/test-clips-visitante-2026-10-06.mjs executa GET/POST reais com dependências de rede/pagamento bloqueadas. Prova visitante=conta criada agora, nove efeitos, pausa dos motores, política futura ativa, rollback e ausência de leitura de saldo/trabalhos do visitante. Seis mutantes rejeitados. O guardião de efeitos de 05/10 foi atualizado para a regra expressa de cartão sem preço.

**TESTADO LOCALMENTE — 05/10:** tsc --noEmit --incremental false terminou com código 0. Guardião dos efeitos: 39 verificações, 11 mutantes anteriores preservados. Suíte inteira: base 762 scripts / 619 verdes / 143 vermelhos; candidato 763 / 620 / 143. Nenhum teste nem asserção vermelha nova. [Gates completos](showcase-clipes-20261006/item-1/gates.json). Código validado: 2e3309926882fdbd86995ff94e34c389715e38b4. Dependências iguais e rede bloqueada nas duas execuções.

**TESTADO LOCALMENTE — 05/10 23:19:50Z:** [comparação visual autocontida](showcase-clipes-20261006/item-1/comparison.html), [prova de navegador](showcase-clipes-20261006/item-1/browser.json). GET anônimo local real: 2→9 efeitos; desktop/celular, claro/escuro, sem rolagem lateral, custo no botão, zero POST de geração. Demais APIs simuladas; nada pago. Os mesmos nove erros de hidratação do painel ocorreram na base e no candidato, sem erro novo; não foram disfarçados como validação de produção. Prints separados mostram cartões e botão de gerar.

## Item 2 · uma página por efeito

**IMPLEMENTADO / FATO CONFIRMADO — lib/clips/clipEffectPages.ts e app/effects/:** nove efeitos reais, cada um com página inglesa em `/effects/<slug>` e 15 versões em `/effects/<slug>/<lang>`. Ex.: `/effects/melt`, `/effects/product-360`, `/effects/melt/pt`. Título, descrição, capa OG própria, canonical e hreflang; 144 URLs no sitemap. Conteúdo no mesmo `lib/ui/refinementCopy.json`, sem preço nos cartões ou na página. Motor e mídia derivados do catálogo da casa; prompts não são enviados como props da página.

**IMPLEMENTADO:** o CTA de visitante usa o `redirect` já aceito pelo cadastro para voltar a `/clips?effect=<key>&clip_origin=effect_page`; conta autenticada vai direto. Nenhuma alteração em cadastro, checkout ou home. `CLIP_EFFECT_PAGES_PUBLIC=false` retira páginas e sitemap juntos. Prévia descarrega fora da tela/aba, respeita redução de movimento e economia de dados; demais efeitos usam apenas capas.

**TESTADO LOCALMENTE — 05/10 23:36Z:** nove rotas inglesas 200; as 16 línguas verificadas em `/effects/melt`, títulos/OG/canonical/hreflang e RTL corretos; rotas inválidas 404; 144 URLs de efeito no sitemap; nenhuma rolagem lateral a 360 px; CTA → cadastro simulado → efeito Melt selecionado, sem POST de geração. Zero erro de hidratação nas páginas novas. Os erros observados pertencem ao `/clips` e já existiam na base.

**TESTADO LOCALMENTE:** tsc limpo; seis mutantes no guardião `test-clips-effect-pages-2026-10-06.mjs`; guardião do Showcase preserva 23 verificações/17 mutantes, com fixture do novo grupo independente no sitemap. [Comparação antes/depois](showcase-clipes-20261006/item-2/comparison.html), [prova de navegador](showcase-clipes-20261006/item-2/browser.json).

**SUGESTÃO / limite comercial:** manter a página específica e a prévia próprias, prática observada na Higgsfield. Publicação e sitemap não comprovam indexação, visita, cadastro ou receita; isso será medido pela coorte do evento, não presumido pelo número de URLs.

**TESTADO LOCALMENTE — 05/10:** suíte completa: base 762 scripts / 619 verdes / 143 vermelhos; item 2, 764 / 621 / 143. Nenhum teste nem asserção vermelha nova. [Gates completos](showcase-clipes-20261006/item-2/gates.json). Execução isolada de rede, mesmas dependências da base.

## Item 3 · Kling 4 preparado, desligado

**IMPLEMENTADO / FATO CONFIRMADO — lib/clips/clipKling4.ts e lib/clips/clipCatalog.ts:** registro `PREPARED_CLIP_ENGINES.kling4`, exportado pelo catálogo, com `KLING4_CLIPS_ENABLED=false`. Model id, custo e fontes permanecem nulos. A seleção pública e o POST recusam `kling4`; os sete motores ativos e sua cobrança permanecem iguais.

**IMPLEMENTADO:** tentativa de ligar sem evidências falha na carga do módulo e no guardião, antes de um pedido. Exige fornecedor fal, model id e custo positivos, fontes oficiais do mesmo modelo, data, revisão de schema/dispatcher e cotação comparável (modelo/resolução/áudio/prateleira). `quotePreparedKling4` calcula apenas uma simulação interna pela régua vigente: mercado −10%, piso de margem 40% no crédito mais barato, mínimo da casa. Informa quando o piso impede −10%; não publica nem debita preço novo.

**TESTADO LOCALMENTE:** dez mutantes rejeitados; catálogo/POST não reconhecem `kling4`; valores ausentes/zero/negativos/NaN, fonte falsa, revendedor e revisão ausente bloqueados. Comparação da fórmula com a régua existente para durações/motores com cotação. Guardião de preço existente: 32 verificações e seus mutantes verdes.

**TESTADO LOCALMENTE — 05/10:** tsc limpo. Suíte completa: base 762 / 619 verdes / 143 vermelhos; item 3, 765 / 622 / 143, nenhum teste nem asserção vermelha nova. [Gates completos](showcase-clipes-20261006/item-3/gates.json). Não há mudança visual nem chamada paga nesta entrega.

**QUESTÃO PENDENTE / DESCONHECIDO:** API pública utilizável, schema e preço da fal. Não existe adapter especulativo de Kling 4. Para ativar depois do lançamento, preencher fatos verificáveis, implementar e testar offline o payload oficial, conferir custo e só então habilitar. A preparação está concluída dentro do que se pode verificar hoje; não equivale a motor pronto para gerar apenas mudando `false` para `true`. Fornecedor novo continua decisão do fundador.

## Item 4 · medição por efeito e origem

**IMPLEMENTADO / FATO CONFIRMADO — lib/clips/clipMeasurement.ts:3, lib/clips/ClipTelemetry.tsx:34, app/api/clips/route.ts:120:** coorte `clips_journey_20261006_v1`; impressão e primeiro gesto por superfície/identidade disponível; origem limitada a home, effect_page, clips ou unknown. Pedido aceito e entrega pronta conservam seu significado. Origem da conclusão vem do pedido da mesma conta/clipe/efeito, por consulta; sem coluna nova ou alteração de cobrança. `CLIP_MEASUREMENT_ENABLED=false` desliga apenas a medição nova.

**TESTADO LOCALMENTE:** guardião executa rota e liquidação reais com dependências falsas, verifica repetição/erro/autenticação, classificação de bot, versão, carimbo A/B preservado e rollback; nove mutantes rejeitados. tsc limpo. [Navegador local](showcase-clipes-20261006/item-4/browser.json) confirma as quatro origens, incluindo unknown, cadastro simulado, dedupe e ausência de chamadas pagas. Consulta SELECT validada com dados sintéticos, duplicatas, internos/bots e conclusões de pessoa/efeito incorretos. [Régua e roteiro dos relatórios](showcase-clipes-20261006/MEDICAO.md).

**TESTADO LOCALMENTE / ajuste de teste:** o guardião A/B passou a aceitar campos após a versão antiga no objeto de metadata, mantendo a exigência do carimbo e seus argumentos. A rota real e um mutante adicional provam que o carimbo não se perdeu. Nenhum arquivo da home foi modificado.

**QUESTÃO PENDENTE / DESCONHECIDO:** cobertura real da origem depois da publicação. Navegação da home não foi alterada; se o navegador/OAuth não preservar evidência, não será inventada atribuição. Contagem de navegadores anônimos é separada de pessoas identificadas.

## Régua de medição

**FATO CONFIRMADO — app/api/clips/route.ts e lib/clips/clipFlow.ts:** `clip_effect_chosen` hoje significa pedido de geração aceito e novo; `clip_effect_ready` significa transição persistida para pronto. Cliques de navegação não serão rebatizados como geração aceita.

**EVIDÊNCIA DE PRODUÇÃO — consulta somente SELECT em 05/10/2026:** janela exata `[2026-10-05T03:00:00Z, 2026-10-05T23:44:00Z)`. `clip_effect_chosen`: 5 eventos, 1 conta identificada; `clip_effect_ready`: 5 eventos, 1 conta identificada. Aplicado o filtro canônico de lib/internalAccounts.ts, restam 0 eventos e 0 contas externas em ambos. Não são cinco pessoas; os registros pertencem à conta interna. Consulta retornou apenas agregados, sem PII.

**QUESTÃO PENDENTE / DESCONHECIDO:** visitas às futuras páginas, origens históricas, novos pagantes e MRR. Zero eventos externos registrados nesta janela não comprova zero visitas nem zero receita. Não usar 2→9 efeitos como antes→depois comercial. Contar pessoas identificadas distintas, excluir internos/bots, separar navegadores anônimos; pagamento exige vínculo e recorrência comprovados. Sem PII no repo.

## Fontes consultadas em 05/10/2026

**EVIDÊNCIA PÚBLICA:** a [fal anuncia Kling 4 em early access](https://fal.ai/kling-4), por formulário comercial. A página não fornece model id nem custo público e declara que os exemplos foram publicados pela Kling, não gerados via API da fal. O anúncio mudou em relação ao contexto “coming soon”; disponibilidade de API utilizável e preço: DESCONHECIDO. Não foi enviado formulário, não houve contratação nem render.

**EVIDÊNCIA PÚBLICA:** [Melting da Higgsfield](https://higgsfield.ai/motion/ed15397e-0a3d-49e3-add4-b9529698a8ad) tem página própria, descrição do efeito e CTA de geração; [catálogo oficial](https://higgsfield.ai/effects). Isso comprova organização e descoberta, não receita/conversão. Adaptação aprovada para Kineo: uma página factual por efeito, usando prévias próprias.

## Limites e continuidade

**DECISÃO APROVADA:** sem alterações em home, pós-cadastro, checkout, preço/plano/crédito, compose, engineWall, motores existentes, banco, Vercel ou crons. Sem renders pagos, mensagens externas ou PII. Fornecedor continua fal; Kling 4 fica desligado mesmo que haja anúncio novo, até model id/custo verificáveis e guardião verde.

**SUGESTÃO — próximo passo:** concluir gates/fila do item 3; implementar o item 4; consolidar as entregas do dia em um launcher com os dois SHAs completos. Ao retomar, ler este arquivo e o Git real antes de escrever. Nunca executar o launcher nesta sessão.

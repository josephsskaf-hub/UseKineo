# Diário — Citações ChatGPT, 17/09, 12 horas

## Preparação — antes de 04:30 BRT

**CONFIGURADO:** agendamento antigo estava PAUSED, com término 14/09. Atualizado via ferramenta da aplicação e relido em automation.toml: ACTIVE, alvo nesta conversa Board, checkpoints 00/30 e término 17/09 19:30 UTC. Não há uma segunda rotina criada por esta entrega.

**FATO CONFIRMADO:** clone ativo C:/kineo, remoto único UseKineo. Worktree `C:/kineo-wt/citacoes-chatgpt-12h-20260917`, branch `codex/citacoes-chatgpt-12h-20260917`, base `5e6234ec`. Main suja e trabalho alheio preservados.

**EXECUTADO:** leitura das regras, prioridades Growth, último benchmark e handoff 17/09; confirmação de que as páginas novas da pista Google já existem e seus arquivos estão reservados; planejamento sem repetir as oito páginas/duas variantes anteriores. Código robots já declara OAI-SearchBot e ChatGPT-User (`app/robots.ts`); declaração local não prova acesso ao host nem citação.

**ENTREGA:** plano e agendamento. Nenhuma alteração de produto, nova medição de citação, convite ou pagamento nesta preparação. Receita incremental DESCONHECIDA, não zero global.

**PRÓXIMA AÇÃO:** no primeiro checkpoint, obter baseline atual permitido e revisar apenas lacunas reproduzidas nas fontes citadas, respeitando reservas. Se ChatGPT continuar indisponível, avançar em correção pública independente e registrar ausência de medição, sem substituir o teste por busca comum.

## Rotação 1 — correção de destino, 17/09 07:31Z (04:31 BRT)

**DECISÃO DO FUNDADOR / CONFIGURADO:** o primeiro disparo chegou à sessão Kineo · Citações no ChatGPT `01a088dd-908c-7c42-9bac-3e886e72a785`. A indicação Board na preparação acima é histórica e foi substituída por ordem expressa. PLANO corrigido; janela 07:30–19:30Z preservada, sem nova rotina ou extensão. Board apenas coordena e entregou esta árvore sem edição concorrente.

**FATO CONFIRMADO:** relógio real 07:31:05Z; clone C:/kineo, main suja preservada, remoto único origin UseKineo. Worktree entregue `C:/kineo-wt/citacoes-chatgpt-12h-20260917` estava limpa e avançou por fast-forward de `6e4cd896` a `fb166d8f`. Skill receita-comprovada e regras relidas. PROJECT_STATE/OPEN_QUESTIONS são snapshots de 27/07, não baseline atual; handoff e Projeto Google de 17/09 lidos com reservas preservadas.

**EVIDÊNCIA HISTÓRICA / ANTI-DUPLICAÇÃO:** benchmark de 12/09 permanece 6/20, quatro ofertas antigas, zero links dos oito guias. Candidato local TRIAL10 `9c3e02c1` continua preservado na árvore de 16/09; não será importado nem terá gate visual removido nesta sprint. As 100 páginas do Claude estão no commit `3a758149`; não representam 100 páginas indexadas nem citações. Marco zero atual e estado dos acessos ainda em verificação.

### Contrato antes de editar — calculadora, 07:43Z

**HIPÓTESE / NOVA contra os pacotes locais:** visitante vindo do ChatGPT por referrer sem UTM → botão final da calculadora injeta `utm_source=seo` → remover origem inventada, usar o parâmetro existente `intent_campaign` (armazenado por `rememberSignupCampaign`) → `/cheapest-ai-shorts-maker` → `organic_cta_clicked`, persistência atual de origem e checkout/pagamento → preservar a atribuição de uma possível assinatura, sem presumir conversão. `lib/analytics.ts:103` já distingue campanha interna de origem; `:398–400` usa UTM de sessão como fallback sobre referrer. `app/cheapest-ai-shorts-maker/page.tsx:71` mantém o link antigo. Última edição do arquivo `ec358289`, 11/09; não integra o pacote TRIAL10 nem os caminhos reservados Claude/MMR. Risco: perder campanha; gate: testar captura e payload reais mantendo `push22_cheapest` e origem explícita externa. Parar se não reproduzir ou surgir concorrência. Dono Citações; sem texto, estilo, preço, auth ou banco alterados.

**CANDIDATAS — no máximo três:** (1) calculadora/origem: NOVA, reproduzir e corrigir nesta árvore; (2) contradições trial10 nas fontes antigas: DUPLICADA/PENDENTE do pacote `9c3e02c1`, não importar; (3) páginas Google com `utm_source=google` fixo em `app/ai-video-generator/for/[slug]/page.tsx:49`: PEDIDO ao Claude após reprodução, arquivo reservado. Nenhuma nova variante comercial ou página.

### Resultado da rotação 1 — 17/09, 04h57 BRT

**EVIDÊNCIA DE PRODUÇÃO:** `MARCO-ZERO.json` e `marco-zero.sql` guardam a consulta somente leitura de 07:35Z com corte 07:30Z. Cadastros externos com `profiles.utm_source='chatgpt'`: 14/09 = 13, 15/09 = 10, 16/09 = 13. A meta 15/dia ainda não foi atingida nesses dias; pessoas distintas por perfil, internos excluídos, atribuição atual em perfis sobreviventes. Nenhuma melhora causal atribuída a esta sprint.

**EVIDÊNCIA DE PRODUÇÃO / MEDIÇÃO PARCIAL:** `MEDICAO-PARCIAL.json`: 17 perguntas submetidas uma vez, 17 respostas completas recuperadas, Kineo citada em duas (EN09 e EN10, ambas posição 1). EN09 aponta pricing/Seedance, informa trial de 10 e preço anual identificado como anual. EN10 ainda descreve oferta retirada e aponta a calculadora. Nenhum dos oito guias monitorados apareceu. PT08–PT10 não enviadas após limite de solicitações. O modo Alta difere de Instantânea em 12/09; não tratar como série controlada nem participação de mercado. As quatro respostas PT inicialmente encobertas foram recuperadas do DOM já renderizado, sem reenvio.

**CONTRADIÇÃO / EVIDÊNCIA DE PRODUÇÃO:** GET público em `HTTP-FOCAL.json`, 07:53Z, mostra a calculadora com trial de 10; não reproduz a oferta retirada descrita em EN10. A busca devolveu snapshots com 30 créditos, enquanto GET direto de llms/calculadora entrega 10. Descompasso entre fontes recuperadas é observado; cache como causa da queda é HIPÓTESE, não diagnóstico provado. Texto sobre todos os motores e fontes antigas continua no pacote TRIAL10 pendente; não importado aqui.

**FATO CONFIRMADO / TESTADO LOCALMENTE:** a origem ChatGPT sem UTM virava `seo` ao clicar o link final antigo da calculadora, conforme execução real de captureUtmsOnce/captureSourceOnce/trackSignupSource e acquisitionSource. `app/cheapest-ai-shorts-maker/page.tsx:71` agora usa somente intent_campaign. Teste novo cobre referrer, UTM explícita, Google, direto, campanha externa e retorno via cookies; os testes organic-signup-truth (38) e landing-source-capture (22) passaram. TSC inicial saiu 0; repetido após incorporar main `3359dc09`. Sem cadastro, render ou escrita em banco. Correção mede melhor a aquisição futura; não aumenta citações por si só.

**FATO CONFIRMADO / PEDIDO:** href público da página Google de faceless-youtube-channels também reproduziu ChatGPT → google na mesma captura real. Remover apenas as três UTMs internas preservou ChatGPT, intent_campaign e redirect. Arquivo reservado do Claude permanece intacto; pedido em PEDIDOS.

**SUGESTÃO / PRÓXIMA AÇÃO:** consolidar informações das páginas já citadas pelo pacote existente; priorizar roteiro pronto → Short, alternativas ao InVideo e custo por vídeo, onde a amostra não citou Kineo. As 100 páginas Google existentes precisam de evidência de indexação/cliques/cadastros; existência não prova crescimento orgânico. Não duplicar páginas antes de avaliar as atuais.

## Checkpoint 05h30 BRT — origem da página Seedance

**FATO CONFIRMADO (08:32Z):** main avançou até 17e1dfd8 com idiomas e compartilhamento, sem corrigir a UTM Google do pedido reservado. O candidato SSR 648f8c95 e o registro 9cfb96dd permanecem exclusivamente na árvore citacoes-chatgpt-12h-20260917, fora da fila e sem revisão visual; não importados. A correção de origem da calculadora 4ab9a413 está publicada e validada por GET em 07:58Z, conforme registro local PUBLICACAO.json na árvore anterior.

**NOVA / contrato antes de editar:** visitante ChatGPT por referrer sem UTM → CTA Seedance injeta origem seo → retirar as três UTMs internas do gerador de link, preservando intent_campaign e redirect/motor → páginas de motores já existentes → organic_cta_clicked e captura atual de cadastro → atribuição correta de eventual primeira assinatura, sem prometer receita → GET Seedance de 07:53Z + reprodução offline com código real → parar se perder motor/campanha, houver edição concorrente ou dependência de arquivo reservado → dono Citações.

**FATO CONFIRMADO / anti-duplicação:** lib/growth/engineLandingIntent.ts:82–84 fixa seo/organic/campanha; app/ai-video-generator/[engine]/page.tsx:91 usa o helper. Última edição do helper f611ff52 em 01/09; fora do pacote TRIAL10 e dos caminhos reservados. EN09 citou Seedance hoje. Árvore nova de origin/main 17e1dfd8: C:/kineo-wt/citacoes-motores-origem-20260917, sem importar candidato visual. Mudança de parâmetros internos apenas: sem copy, layout, preços, catálogo ou render.

**BASELINE DE TESTES:** test-engine-landing-intent e test-aeo-engine-destinations já falham antes da edição por esperarem sete parâmetros; S25 está declarado desde f611ff52. Isso não é falha introduzida pela correção. Testes da mudança devem executar captura real e preservar o contrato de destino; registrar separadamente qualquer desatualização desses guardiões.

**IMPLEMENTADO / TESTADO LOCALMENTE:** três UTMs internas removidas do helper. Teste `test-citation-engine-source.mjs` reproduziu seo em vez de chatgpt antes e passou depois, executando links reais e captureUtmsOnce/captureSourceOnce/trackSignupSource/acquisitionSource. Cobre os oito parâmetros declarados, ChatGPT por referrer/UTM explícita, Google, direto, campanha externa e retorno OAuth por cookies; redirect e campanha comparados ao baseline, sem render automático. Não anuncia como disponíveis os motores pausados.

**TESTADO LOCALMENTE:** engine-landing-intent 139/139, aeo-engine-destinations 72/72, organic-signup-truth 38/38, landing-source-capture 22/22, teste de origem da calculadora PASS, tsc sem incremento 0 e diff --check limpo. Guardiões antigos reancorados: enum inclui S25, catálogo foi extraído do TSX e TopicGeneratorForm usa buildAuthenticatedCreationRedirect → /studio/create. Nenhuma dessas mudanças altera código de produto fora do helper.

**LIMITAÇÃO DE VALIDAÇÃO:** test-signup-product-destination falha na comparação textual de ordem do cabeçalho (linha 149). Mesma falha reproduzida com o helper anterior 17e1dfd8 e página/teste inalterados; as asserções de destino que antecedem esse ponto passaram. Não editar auth nem esconder o vermelho. Correção de parâmetros não altera UI, oferta ou escolha do motor; não depende da revisão visual do candidato SSR.

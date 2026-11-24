# Caixa nas duas leituras · VOLTA 1 · 23/11/2026

**FATO CONFIRMADO · IMPLEMENTADO.** Ramo próprio codex/pronto-citacoes-caixa-2311, base origin/main 4ba8c750c. Só a caixa de ideia/roteiro nos artigos /best-ai-shorts-generators e /how-much-do-youtube-shorts-pay. Nenhuma das quatro páginas novas integra este ramo.

**FATO CONFIRMADO.** lib/growth/citationIdeaAccess.ts:5 nasce off. internal exige e-mail confirmado e contaDaCasaExata, nunca isInternalEmail. components/seo/CitationIdeaForm.tsx:12 consulta getUser, preserva a mesma identidade durante revalidação e limpa o rascunho em logout, identidade alterada ou falha; respostas antigas são rejeitadas. Sem nova tabela, serviço ou evento de entrada.

**FATO CONFIRMADO · TESTADO LOCALMENTE.** Guardião test-citacoes-caixa-2311 executa o controle e SSR dos componentes: off = HTML anterior exato; internal visitante = anterior; public e casa confirmada = uma caixa extra após a primeira resposta. Parágrafos/tabelas/JSON-LD/metadados preservados, formulário inferior mantido e formulário original de text-to-video com os padrões anteriores. Doze mutantes exigem ERR_ASSERTION e mensagem da asserção prevista. Auth remota não é validada pelo SSR; prova de navegador usa autenticação sintética local, identificada nas fotos.

**EVIDÊNCIA DE PRODUÇÃO · SELECT 23/11, corte 15:28:12 BRT.** Base de 30 dias, sessões externas não bot: text-to-video-shorts 210 → 71 cadastros → 31 primeiros filmes completed; best-ai-shorts-generators 46 → 2 → 0; how-much-do-youtube-shorts-pay 643 → 7 → 4. BASE-30D.sql reproduz o corte. Sessão não é pessoa. Identidade ligada pelo mesmo session_id; cadastro posterior à entrada; internos reconhecidos excluídos. Origem não gravada não é ChatGPT. Não há completed_at: conta pedido criado na janela e completed na leitura, não a hora exata de conclusão.

**SUGESTÃO · medida antes/depois.** ANTES-DEPOIS.sql usa sete dias iguais antes e depois da ativação pública real. release_at começa NULL: não inventar data nem tirar conclusão com pós incompleto. Registrar data/SHA/interruptor no quadro; só então preencher. Comparar por entrada e por origem explícita: sessões, pessoas identificadas, cadastros novos vinculados e primeiro filme; preservar anônimos e ambiguidades separados. Mesma janela limita seguimento dos cadastros tardios; não é experimento aleatório nem prova causal. Sessão de rollout internal não integra leitura de efeito externo. Não há resultado comercial novo enquanto off.

**QUESTÃO PENDENTE.** Revisão independente; ativação interna e depois pública pela CEO; conta real cliente e primeiro campo editável do Studio após autenticar; primeiro filme real; resultado em cadastro/pagamento. Nenhuma conta, filme ou pagamento foi criado neste ensaio.

**SUGESTÃO · conferir no ar quando autorizado.**
- off: visitante e casa veem artigos antigos; caixa inferior funciona; dados estruturados e canonical preservados.
- internal: lista exata confirmada vê caixa; visitante, comprador externo, alias e padrão test% não veem; logout a remove.
- public: ambos os modos em 1920/390 claro/escuro; prompt e modo atravessam cadastro/login e chegam ao primeiro campo editável do Studio. Voltar/cancelar não inicia filme.
- Nenhum Generate automático, gasto ou UTM de aquisição inventado. Erro de auth mantém fechado em internal.
- Registrar hora pública real, executar ANTES-DEPOIS só com sete dias completos e observar cadastro/primeiro filme por entrada. Resultado esperado é hipótese, não ganho declarado.

**FATO CONFIRMADO · TESTADO LOCALMENTE.** npx tsc --noEmit -p . --incremental false: saída 0, executado isoladamente após a comparação. novos-vermelhos: dez guardiões por referência literal aos cinco caminhos de produção, cinco verdes e cinco falhas já na main, na mesma primeira asserção; zero vermelho novo. Os dois hashes de conteúdo continuam iguais; a exceção aceita somente CitationIdeaForm article=pay autocontido. VALIDACAO.json e GUARDIOES.json preservam inventário/erros. O typecheck anterior que cruzou troca de commit foi descartado.

**FATO CONFIRMADO · FOTOS E PASSAGEM LOCAL.** CITACOES-CAIXA-VOLTA1.html em C:/kineo/docs/decisoes-2311: 32 estados, 64 fotos, mais oito fotos de passagem em citacoes-caixa-volta1. off/public/internal-casa/internal-externo, 1920/390 claro/escuro; zero overflow ou exceção JS. Os oito percursos reais chegaram ao cadastro local com prompt/modo/campanha exatos. A sessão interna foi um dublê de getUser via cookie e resposta interceptada; não é conta real nem login de produção. Nenhum clique Generate, render, gasto ou escrita em banco.

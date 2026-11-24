# VOLTA urgente da CEO · provas locais · 24/11/2026

**IMPLEMENTADO / FATO CONFIRMADO.** A autorização da caixa é decidida no servidor em app/api/citations/idea-visibility/route.ts:8. A resposta contém apenas visible, com private/no-store; exige sessão verificada, identidade esperada e elegibilidade exata confirmada. O navegador importa somente configuração e transporte GET (lib/auth/readServerVisibility.ts:2). Nenhuma lista privada é enviada.

**TESTADO LOCALMENTE.** O componente real verifica a geração depois da leitura SDK e depois do GET (components/seo/CitationIdeaForm.tsx:34 e :41). A regressão montada preserva texto e modo durante a renovação da mesma conta, inclusive com GET pendente; logout, revogação e mudança de identidade descartam o rascunho. Respostas antigas não restauram nem apagam o estado novo. Nove mutantes morreram na asserção exata; SESSAO.json registra estados sintéticos, sem autenticação real ou geração.

**TESTADO LOCALMENTE.** SERVIDOR.json: 54 casos executam os três GETs reais e o transporte real, substituindo somente getUser/fetch. Cobrem identidade, confirmação, falhas, resposta estritamente booleana, cabeçalhos privados, payload inválido e estados de navegação existentes. Nenhuma rede, conta, render ou pagamento.

**TESTADO LOCALMENTE.** ELEGIBILIDADE.json compara com f58bcb31a: 32 corpos de função, dez inicializadores públicos e sete consumidores de motor/creditos/handoff preservados fora dos imports; 2.145 chamadas de elegibilidade e 1.452 casos do resolvedor legado, incluindo canários e falhas. Não foi redefinida a elegibilidade de motores ou Clips. A caixa conserva a política exata distinta da política legada.

**TESTADO LOCALMENTE.** PRIVACIDADE.json: grafo global das raízes de cliente sem alcançar o módulo privado; módulos reais de cliente dos dois artigos mais layouts ancestrais transpilados/minificados, zero marcadores protegidos. Seis mutantes de import direto, barrel, intermediário, dinâmico, require e literal copiado detectados. Não é next build. Relatório não registra endereços.

**EM OBRA / NÃO PUBLICAR.** A reancoragem da configuração no guardião SSR e no de sessão acompanha esta ponta. A verificação SSR conserva o HTML off e as 12 mutações; autorização positiva privada passa pelo componente montado e GET real, pois injetar identidade no SSR sozinho já não concede acesso. Typecheck final e novos-vermelhos dos 534 guardiões selecionados ainda precisam concluir. Fotos anteriores continuam como referência de aparência. A revisão independente no kineo 3d antecede Entregue à CEO.

**LIMITES.** Uso semanal 8% nesta conferência. Sem push, publicação, escrita em banco, conta, render, pagamento, gasto, comunicação externa ou mudança de preço. Arquivos e provas nesta worktree; o quadro recebe somente linhas novas.

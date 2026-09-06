# Reformulacao integral — 06/09/2026

## DECISAO APROVADA

Fundador nesta conversa: "Faz toda a reformulacao, a proposta do home, das ferramentas, da biblioteca, das demais paginas, espanhol. Ja ta tudo aprovado, ja pode fazer o merge."

Implementacao, comparacoes, testes e publicacao autorizados, sem nova aprovacao visual. Sem alterar precos, creditos, ofertas, termos, render, banco, campanhas ou privacidade. Midias curadas da home preservadas. Nao renova automacoes.

## Base e reserva

Worktree C:/tmp/usekineo-ux-completo-2026-09-06; branch codex/ux-completo-2026-09-06; base origin/main 28e7a163. Arvore principal intocada. Entregas Claude ate #30b preservadas.

Reserva: KineoLanding, navegacao/Footer, studioKit (apresentacao), clientes Images/Audio/Animate/Avatar/Library, novos dicionarios/componentes de idioma. Gerador legado e APIs fora do lote. Nenhuma retirada de SeasonStrip, oferta ou campanha por gosto visual.

## Sequencia

1. Corrigir baseline movel do teste de hierarquia reportado pelo Claude.
2. Home: hierarquia, agrupamento, navegacao, FAQ/rodape; preservar midias e contratos comerciais/SEO.
3. Ferramentas/biblioteca: entrada, configuracoes, resultados; testar vazio/carregando/erro/com conteudo sem mudar handlers.
4. Demais paginas: por familias, sem contar nav herdada como pagina reformulada.
5. Espanhol: escolha explicita de idioma da interface, sem alterar roteiro, moeda ou motores. Cobertura declarada; sem manipulacao do DOM para traduzir.

Gates por lote: escopo, teste executavel, tsc sem filtros, comparacao visual, preview remoto, main atualizada, deploy READY e Chrome. Nenhum render pago.

## Execucao

TESTADO LOCALMENTE: causa do erro reportado pelo Claude confirmada em scripts/preview-studio-hierarchy.mjs: o "antes" era origin/main, que agora contem o "depois". Fixado no commit pre-reforma b80de68c; runtime continua carregando arquivo real. 11 estados passaram. Nao era defeito de render nem diferenca de Node. Nenhuma garantia removida.

INICIADO: esta segunda entrega ainda nao esta em producao.

# Guardião pós-entrega — 07/09/2026

**DECISÃO APROVADA:** fundador pediu acompanhamento por 3–4 horas, continuidade até a manhã às 10h e mais cinco/seis recomendações. Como a conversa ocorre depois de meia-noite, fechamento fixado e informado: 07/09 10:00 BRT (13:00 UTC). Checkpoints de 30 minutos nesta conversa; substituir automação UX expirada, sem reativar FLUXO antigo.

**CONFIGURADO:** automação `kineo-caixa-vendas-10h-04-05-setembro`, nome “Kineo — Guardião pós-entrega até 07/09 10h”, atualizada via ferramenta do app. Acompanha entrega pendente primeiro, depois produção somente leitura. Horário inicial observado 07/09 01:17 BRT. Depende do PC/app acessíveis; não é supervisão contínua ou garantia de zero erro.

**GATES:** nenhum render pago, pagamento, postagem de vídeo de cliente, escrita em banco, estorno, campanha ou rollback automático. Monitoramento por conectores read-only com schema verificado. Não ler `.env.local`. Sem roteiro, segredo, URL assinada ou identificação pessoal desnecessária no relatório. Excluir contas internas e contar pessoas, não eventos. Erro de acesso é DESCONHECIDO, não zero.

**CHECKPOINT INICIAL — IMPLEMENTADO, ainda não publicado:** cinco melhorias no handoff correspondente. Produção das fontes Manrope já validada no ciclo anterior; não atribuir essa validação ao novo pacote. Próximo gate: commit, CI crítico, deploy e inspeção real em Chrome. Depois fixar timestamp do deploy como fronteira e medir janela pós-entrega, sem misturar com incidentes antigos.

## Seis candidatas para avaliar até 10h (SUGESTÃO, não executar automaticamente)

1. Fechar os tipos completos de rotas do Next antes de ativar o gate de build: preview identificou export inválido na campanha send-checkout-recovery. Pedido ao Claude sem tocar na lógica comercial. Em seguida validar outros exports, sem maquiar teste.
2. Atualização segura das dependências críticas apontadas na auditoria integral, em branch e regressão próprias; não misturar com cosmética.
3. Acessibilidade de teclado e leitor de tela nas ferramentas: tabulação, foco após diálogo, nomes acessíveis e contraste, com provas por fluxo, não só screenshot.
4. Desempenho mobile: medir carregamento de fonte/vitrine e interação com formulários, preservar todos os vídeos e comparar antes/depois sem remover ativos.
5. Recuperação de rascunho após recarregar/trocar tela: validar o contrato atual e propor apenas lacunas reais, sem mudar motor ou enviar texto sem clique.
6. Links de compartilhamento revogáveis por vídeo: token de entrada legado permanece sem expiração; projetar revogação sem quebrar o acesso legítimo, com aprovação de persistência. A matriz ES de estados raros também permanece no inventário, sem adicionar idioma novo.

## Baseline somente leitura — 07/09 04:27:07 UTC / 01:27:07 BRT

**EVIDÊNCIA DE PRODUÇÃO:** Supabase `cqqukkvjjrguayiyjvhh`, SELECT, janela fechada `[00:27:07,04:27:07)` UTC, contas internas excluídas conforme `lib/internalAccounts.ts`: três vídeos de três pessoas externas, todos `completed` com arquivo; nenhum vídeo dessa coorte em estado não terminal. Não é total histórico nem validação do pacote novo.

**CLASSIFICAÇÃO:** dois `generation_stage_error` e um `video_generation_failed` são uma pessoa, com `reason=cinematic_gate_trial_ended`, primeiro HTTP 402 às 02:58:54 UTC. Código da rota confirma trial encerrado como gate de plano, não indisponibilidade Supabase. A pessoa tem entrega posterior; isso não prova que seja a mesma tentativa. Dois `cinematic_dispatch_result` de duas pessoas são resultados, não necessariamente erros. Não dizer três renders falhados nem zero evento de erro. Schema render_jobs só tem render_id/user_id/quality/cost/created_at; não inventar coluna status nem afirmar ausência global de jobs presos.

Prioridades finais devem ser reordenadas por evidência do vigia. Não reivindicar aumento de conversão nem ausência de falha sem amostra e fonte. Publicar recomendações como propostas para o fundador pela manhã.

## Checkpoint — 07/09 04:47 UTC / 01:47 BRT

**EVIDÊNCIA DE PRODUÇÃO:** produção READY `89bb5cb4`, deploy `dpl_E2Y7FKCVFi4yzLdcbfebntafaGkq`, fronteira 04:35:18.456 UTC. Fetch sem mudança de main; lido diário Claude checkpoint #18b (aquisição, sem sobrepor). Janela Supabase `[04:27:07,04:45:37)` UTC: zero vídeos novos de pessoas externas e zero eventos externos das três classes consultadas (`generation_stage_error`, `video_generation_failed`, `cinematic_dispatch_result`). Exclusão canônica por perfil. Sem amostra nova para concluir melhora/piora de entrega. Não mede todos os jobs anteriores ou erros com outros nomes.

**EVIDÊNCIA DE PRODUÇÃO:** Vercel runtime, produção, agrupado por rota, HTTP 5xx na janela `[04:35:18.456,04:45:37]` UTC: sem linhas. Não confundir com console limpo. Nova aba Studio EN às 04:46:31 reproduziu 425 x5, 418 x3, 423 x1; interface recuperada, Manrope confirmada, largura/scroll 1920/1920. Mesmo achado já informado ao fundador, sem novo impacto demonstrado. Aba de validação antiga foi fechada externamente; não tocar nas abas de geração/publicação do fundador.

**PRÓXIMO GATE:** comparar hidratação com controle anterior e localizar divergência SSR/cliente; manter acompanhamento read-only das entregas reais. Sem rollback ou supressão de aviso. Atualizar prioridades das seis propostas se a causa for confirmada; nenhum novo idioma ou render executado.

## Checkpoint — 07/09 05:04 UTC / 02:04 BRT

**EVIDÊNCIA DE PRODUÇÃO:** janela `[04:45:37,05:01:55)` UTC, mesmos filtros de contas internas: nenhum vídeo externo criado/atualizado; nenhum evento externo nas três classes acompanhadas. Vercel 5xx por rota, mesma janela: sem linhas. Sem nova amostra para provar entrega pós-release; ausência de eventos consultados não certifica todos os jobs.

**COORDENAÇÃO / EVIDÊNCIA DE PRODUÇÃO:** origin/main avançou para `8a81c9c3` (Claude: pacote de e-mail, pedido 8, vitrine e SEO do editor). Deploy `dpl_EVHiuTkBnxwUfDnswSCAGcQdMiut` READY. Outra revisão `7eb80169` apareceu BUILDING na lista, sem presumir publicação. Diário #19 e pedido 8 lidos: pacote na tela do download é pedido futuro, não executado por este vigia. Não sobrescrever vitrine/pipeline/campanhas. Worktree local permanece baseada em `89bb5cb4`, com adendos de docs locais; nenhum código novo publicado aqui.

**DECISÃO MAIS RECENTE:** PT rejeitado pelo fundador, rascunho removido. Relatório `docs/IDIOMA-POR-EVIDENCIA-2026-09-07.md` prioriza hindi como hipótese baseada em países, sem comprovação de preferência individual; terceiro idioma ainda não existe no site. Não retomar a escolha antiga de português. Hidratação permanece pendente e já comunicada, sem novo impacto demonstrado. Próximo checkpoint valida a ponta de produção e continua o isolamento do erro, sem testes pagos.

## Checkpoint — 07/09 05:36 UTC / 02:36 BRT

**EVIDÊNCIA DE PRODUÇÃO:** janela `[05:01:55,05:30:55)` UTC: nenhuma linha de vídeo externo criado/atualizado, nenhuma das três classes de evento externas e nenhum HTTP 5xx no runtime consultado. Não há nova amostra de render. main avançou a `55486310`; Vercel lista deploy `dpl_AxEABPYSyRnzDx8jshYnRVVnrkFH` READY. Claude publicou observabilidade/contrato da SeasonStrip em `80d90402`; não tocar nem duplicar.

**ACHADO REPRODUZIDO — hidratação:** controle anterior às cinco melhorias (`19708bd0`, deploy `dpl_2KR9TYm4fiEpuoHoepxKTziqxSCw`) também emite 425 x5, 418 x3, 423 x1 no Studio, como visitante não autenticado. Portanto o problema existia antes de `58be2322`; isso não prova ausência de qualquer regressão nova. Leitura do HTML público de produção mostra `.composer-proposal-optional&gt;summary` e `.kineo-mobile-tab&gt;span`, enquanto o DOM após recuperação contém `>` literal.

**FATO CONFIRMADO / TESTADO LOCALMENTE:** `StudioClient.tsx:897` e `MobileNav.tsx:229` inserem CSS como filho textual de `<style>`. React DOM Server 18 escapa `>` para `&gt;` e aspas para entidades; em style o navegador não decodifica entidades como faria em texto HTML normal. Reprodução isolada com os pacotes React reais do repo e um seletor `a > b`: SSR textual produz divergência e recuperação; controle com CSS estático em dangerouslySetInnerHTML não gera erros no navegador. Nenhuma integração, dado, geração ou cobrança no diagnóstico; servidor local/aba próprios, sem edição de produto.

**LIMITE / PRÓXIMA CORREÇÃO:** uma causa concreta da hidratação foi isolada. Inventariar outros style textuais e levar CSS constante para stylesheet (preferível), ou inserção raw estritamente estática e confiável; jamais CSS do usuário. Repetir SSR/browser EN/ES/mobile antes de publicar. Não usar suppressHydrationWarning. Priorizar essa correção na lista da manhã. Produção permanece inalterada pelo vigia.

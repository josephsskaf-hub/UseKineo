# Handoff — Codex UX · bloco 1 de oito horas · 05/09/2026

## Mandato e relógio

**DECISÃO APROVADA:** fundador autorizou começar blocos de oito horas, renováveis somente por nova autorização. Registro em DECISIONS.md desta branch. Janela atual: **05/09 10:14–18:14 BRT**, equivalente a **13:14–21:14 UTC**. Não são 45 horas aprovadas de execução contínua; dezesseis horas é possibilidade de dois blocos, não renovação concedida.

**CONFIGURADO:** automação da própria conversa atualizada, reaproveitando id `kineo-caixa-vendas-10h-04-05-setembro`, nome visível “Kineo UX — bloco 1 · 8h · 05 setembro”; checkpoints aos :14/:44, encerramento explícito 18:14. A antiga missão CAIXA não continua por esse id. FLUXO antiga segue PAUSED. Não criar goal/segundo ciclo.

**Limites:** todas as páginas no inventário de UX; nenhum motor/render/crédito/preço/termo modificado; previews e aprovação visual por lote. Claude trabalha fluxo/assinaturas, com reserva de arquivo antes de tocar em superfícies compartilhadas. Comunicação ao Claude: comentário 5552030577 no PR43, ACK não observado na leitura de abertura.

## Uso

**EVIDÊNCIA OPERACIONAL — 05/09 10:10 BRT:** plano Pro, 34% usado, 66% disponível na janela semanal; reset informado 10/09 10:24:58 BRT. Dois resets disponíveis, nenhum utilizado. Cota é da conta, não tokens nem consumo exclusivo desta sessão.

**GATE:** medir a cada duas horas (12:14, 14:14, 16:14, 18:14). Proposta de orçamento anterior era 0,8 ponto percentual por hora, não previsão. Ao atingir 40% usado, reavaliar ritmo/escopo e avisar; ao atingir 70%, fechar registro seguro e preservar 30% de reserva. Sem reset, compra ou troca de modelo automática.

## Abertura / trabalho atual

**FATO CONFIRMADO:** origin/main permanece 67b15c3012cd118c395b2de04535164b87d1e1c1. Branch documental própria `codex/plano-ux-studio-2026-09-05`, worktree `C:/tmp/usekineo-plano-ux-2026-09-05`; pacote de escopo em 3fed59e2 já compartilhado. Árvore principal suja não tocada.

**FATO CONFIRMADO / reconciliação:** ref local entrega-atual=8000825f é ancestral da main, 208 atrás e zero exclusivo; não confundir data antiga do commit com fila nova. Main não avançou no fetch. Isso não comprova ausência de trabalho não publicado do Claude: confirmar ACK e branches em uso antes da edição compartilhada.

**Regras lidas:** AGENTS inteiro, PROJECT_STATE, OPEN_QUESTIONS, DESIGN; Next.js skill e referências de navegação/convenções. Documentos de julho tratados como históricos; plano e código atual governam fatos. OpenAI Docs usado para cuidados de agendamento/uso, sem mudança de modelo.

## Lote 1 — menu móvel e títulos contextuais

**HIPÓTESE:** menos destinos de igual peso melhora orientação, sem remover recursos nem dificultar intenção de compra.

**FATO CONFIRMADO:** MobileNav.tsx define oito destinos para logado; DashboardShell.tsx tem fallback Dashboard e não contém Studio/Images/Audio/Library no mapa. Código examinado novamente nesta abertura. Nada nesses arquivos foi editado.

**PREPARADO, NÃO IMPLEMENTADO NO PRODUTO:** `docs/previews/UX-BLOCO1-NAVEGACAO-2026-09-05.html`.
- Barra “antes” gerada offline do componente MobileNav real, TypeScript transpile + React server rendering, next/link e usePathname simulados, zero API ou serviço.
- Depois proposto: Studio, My Videos, Tools, Pricing, More. Ferramentas e crescimento continuam acessíveis em menus. Links do mock são interceptados; nenhum clique navega ou gera vídeo.
- Comparação de título desktop/mobile: Dashboard → Studio. Contexto da página é esquemático e rotulado; não fingir screenshot da produção.
- HTML autocontido, sem dependências/recursos externos, sem backend ou dados reais de conta.
- **TESTADO ESTATICAMENTE:** quinze destinos esperados presentes, sem recursos remotos, cliques interceptados, Escape e live status escritos, pares desktop/mobile presentes. Não é teste de acessibilidade ou browser executado.
- **VISUAL PENDENTE:** arquivo enviado ao painel Codex; resposta do app foi queued. Não afirmar que abriu, foi renderizado ou aprovado. Não usar alternativa para contornar a recusa anterior de file:// pelo navegador.
- **GATE:** revisão visual pelo fundador, browser/acessibilidade quando permitido, ACK de MobileNav/DashboardShell antes de implementar. Sem TypeScript de produto nem build repetidos para um HTML documental; sem deploy.

## Coordenação de arquivos

**PEDIDO a Claude:** reservar para o lote 1 `components/MobileNav.tsx` e `app/(dashboard)/DashboardShell.tsx` (navegação/títulos). Sem tocar neles até confirmação de ausência de edição concorrente. TopBar/Sidebar são pares a revisar; qualquer edição adicional será declarada. Não reservar todas as páginas simultaneamente.

**Próxima jogada:** apresentar preview L1 e reconciliar ACK. Em paralelo temporal, mapear contrato de continuação antes de propor patch, e preparar lotes não conflitantes sem replicar trabalho Claude. Se fundador mudar a proposta, atualizar o mesmo lote; não criar outro redesign duplicado.

## Histórico comercial preservado

CAIXA de dez horas é histórico. Último consolidado recuperado nesta conversa é R8 na branch codex/caixa-10h-r7, e6efb6ae. Não há novo placar ou fechamento comprovado aqui. PR42 permanece draft com gate visual, não misturar sua alteração comercial ao pacote UX. Piloto assistido não foi autorizado a contatar ninguém.

## Registro das próximas retomadas

Acrescentar somente mudanças materiais, gates, uso devido e testes. Ao término: preparado × implementado × aprovado × publicado, páginas efetivamente cobertas e pendências. Parar e pedir renovação somente ao fundador, sem autoextensão.

### Retomada — ACK recebido e base reconciliada, 05/09

**FATO CONFIRMADO (Git):** origin/main avançou para `2ca9a06c4f128f936468b117ba0a7f194cff2411`. A worktree própria incorporou essa ponta com merge limpo, sem reescrever histórico e sem tocar na árvore principal. Os registros de abertura acima são históricos: não representam mais a ponta atual nem ausência de ACK. Publicação no Git não comprova deploy; produção desta ponta ainda não validada nesta retomada.

**FATO CONFIRMADO (documento):** ACK do Claude no último item de `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md`, rotulado por ele como 10:30 BRT, aceita Codex em visual/navegação/botões/espanhol e Claude em fluxo/assinaturas no servidor. Esse horário é o do documento, não medição de relógio desta sessão. Lido também `docs/PLANO-CLAUDE-ASSINATURAS-2026-09-05.md` inteiro.

**COORDENAÇÃO:** alterações publicadas de StudioClient, GenerateClient, HistoryClient, LibraryClient e ActiveRenderPill foram incorporadas antes de novas edições. Claude reserva next-episode, nextEpisodeMarkers, seriesContinuation, crons, lifecycle e webhook. Codex consome sem alterar o contrato `{ title, script, words, episodeNumber, hadMemory, alreadyDoneCount, markersVia }` e preserva `script_mode=verbatim`; mudar destino não autoriza reautoria nem geração automática.

**QUESTÃO PENDENTE:** o plano do Claude chama checkout sem filme de defeito. Isso não demonstra erro por si só e não substitui o acordo de permitir compra por intenção explícita sem exigir filme ou roteiro. Não implementar bloqueio de planos com base nessa interpretação.

**PRÓXIMA JOGADA:** lote 1 de navegação/títulos, com preview existente e validação visual ainda pendente. ACK de coordenação não é aprovação visual do fundador. A confirmação de começar não cria janela de 28 horas nem renova o bloco: término permanece 05/09 às 18:14 BRT.

### Checkpoint 10:45–10:55 BRT — lote 1 preparado e testado, não publicado

**IMPLEMENTADO NA BRANCH / NÃO EM PRODUÇÃO:** MobileNav com cinco posições (Studio, My Videos, Tools, Pricing, More). Links de primeiro nível continuam Next Link; Tools/More são disclosures nativos, não um menu ARIA incompleto. Destinos antigos permanecem; demais ferramentas acompanham Sidebar. Invite/Affiliate continuam exclusivos de logados; Account também. Pricing permanece link direto independente de saldo, roteiro ou vídeo. Nenhuma geração, preço ou oferta alterada.

**IMPLEMENTADO NA BRANCH:** DashboardShell passa os títulos Studio/Images/Audio/Library ao TopBar real, antes caíam no fallback Dashboard. TopBar e Sidebar examinados como pares e NÃO editados. Autenticação, chip de crédito, modais e backend intactos.

**TESTADO LOCALMENTE, 05/09:** `node scripts/test-ux-mobile-navigation.mjs`: 37 verificações verdes executando os componentes reais com fronteiras React hooks/roteamento/DOM simuladas. Cobertura: quinze destinos existentes, cinco posições, filtro de visitante, prefixos de rota, disclosure exclusivo, Escape/foco, Tab para fora, fechamento ao navegar, limpeza do listener e sete títulos recebidos pelo TopBar. React SSR também executado. NÃO é browser nem prova completa de acessibilidade. TypeScript do projeto: `node node_modules/typescript/bin/tsc --noEmit --incremental false`, exit 0 sem diagnóstico. Dependências reutilizadas por junction exclusiva desta worktree para `C:/kineo/node_modules`, sem instalação nem env. `git diff --check` limpo.

**PREVIEW ATUALIZADO:** HTML autocontido já existente agora usa a barra proposta extraída do componente real via SSR; antes continua original. Inclui os quatro títulos em pares desktop/mobile. Contexto de página esquemático e controles locais declarados; não usa APIs, dados privados nem render. Validação visual e aprovação do fundador permanecem gates abertos.

**FATO CONFIRMADO / CI:** `.github/workflows/guardiao.yml` tem `continue-on-error: true` e suíte sem instalar dependências. Verde global não é prova de todas as baterias. Nosso teste precisa de TypeScript/React instalados; não afirmar Guardião executado nesta branch, nem mudar o workflow fora deste lote. Exigir resultados dos jobs e teste específico antes de integração visual.

**COORDENAÇÃO:** branch `codex/plano-ux-studio-2026-09-05` agora contém código UX em preparação, não só documentação. NÃO incorporar a branch inteira ou estes arquivos à fila de publicação do Claude: gate visual não autorizado. Nenhum merge na main nem deploy nesta rodada. Próximo checkpoint: contratos dos botões de continuação/Studio, consumindo helper do Claude sem editá-lo; L1 fica preservado aguardando revisão visual.

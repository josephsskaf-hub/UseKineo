# Cinco melhorias — coordenação de execução

**DECISÃO APROVADA:** fundador autorizou as cinco propostas após a publicação da Manrope. Base 5b155dc5; worktree C:/tmp/kineo-five-improvements-2026-09-07, branch codex/five-improvements-2026-09-07. Claude continua aquisição, sem tocar em preços/ofertas nesta entrega.

**ESCOPO EM EXECUÇÃO:** rotas video/publish, admin/flag-video, events (autorização e integridade, não render); Guardião; LibraryClient e componentes de navegação/avisos/idioma. Antes de qualquer alteração no Studio/GenerateClient, limitar a cópia e preservar todos os handlers/payloads. Nenhum fornecedor, cron ou cobrança alterado. Verificar main novamente antes de integrar.

**HIPÓTESE:** uma próxima ação clara, sem avisos secundários sobrepostos, facilita continuar um projeto sem perder acesso a planos. Não reivindicar conversão por teste interno. Métrica posterior: pessoas externas expostas → ação correspondente → retorno/assinatura. Idioma não muda moeda nem roteiro.

**GATES:** testes de rota com banco/eventos mockados; mutações nunca em GET; erro/zero linhas não é sucesso; chamada não-admin não toca métricas; publicação server-only. Typecheck bruto e bateria crítica devem reprovar CI. Comparação antes/depois das seções alteradas, desktop/mobile, EN/ES. Publicação e limites serão registrados no fechamento.

## Preparado para publicação — 07/09 01:24 BRT

**IMPLEMENTADO / TESTADO LOCALMENTE:** (1) avisos secundários fora das áreas de criação/acervo, preservando alertas críticos e manutenção de push já autorizado; (2) Avatar abre `/avatar` e retry do histórico abre revisão no Studio, preservando modo/motor/duração; (3) Biblioteca destaca projeto recente, incluindo processamento/erro sem confundir com biblioteca vazia; (4) lacunas EN/ES do Studio e Biblioteca, `html.lang` sincronizado, sem traduzir texto do usuário; (5) confirmação POST de compartilhamento com validade curta, CAS e sucesso real, allowlist admin em flag-video, eventos de consentimento server-only e CI crítico sem tolerar falha.

**TESTADO LOCALMENTE:** `test-sharing-safety.mjs` 68; `test-five-improvements.mjs` 588; `test-interface-language.mjs` 1066; `test-language-navigation.mjs` 23. `npx tsc --noEmit --incremental false` código 0. Todos offline, dados sintéticos, nenhum fornecedor/render/débito. Comparação real de JSX em `docs/previews/CINCO-MELHORIAS-2026-09-07.html`, com Studio/Biblioteca EN/ES, Avatar, destino de retry, avisos e representação da confirmação. Inspeção visual desktop e 320/390px. Gerador aceita o HTML tipográfico aprovado como entrada; não contém caminhos privados hardcoded.

**CONTRADIÇÃO / LIMITE:** o teste antigo `test-library-error-state.mjs` falha em três âncoras de texto sem UiLabel já ausentes na base; não foi alterado para aparentar verde. A nova bateria renderiza a Biblioteca com falha nas três abas e confirma erro sem estado vazio. Não declarar todos os testes legados verdes nem auditoria 100%.

**QUESTÃO PENDENTE:** ES não foi certificado em todo estado raro/admin/e-mail; esta entrega cobre as lacunas core identificadas. Terceiro idioma ainda não selecionado. Links v1 existentes continuam bearer sem expiração (compatibilidade); só a confirmação POST é curta e vinculada à ação. Revogação individual de links e risco de dependências da auditoria integral são trabalho separado. CI falha de verdade, mas required checks/proteção de branch não foi confirmada no GitHub.

**COORDENAÇÃO:** incorporado origin/main `19708bd0` antes do commit; alterações do Claude em ChatGptWelcomeBanner/diários preservadas, sem sobreposição. Não alterados render, preços, créditos, campanhas nem dados de cliente. Validação de produção será acrescentada após CI/deploy, não presumida.

## Bloqueio encontrado no preview — decisão de escopo

**EVIDÊNCIA DE PREVIEW — 07/09 04:26 UTC:** commit `58be2322` passou no job crítico GitHub `34083022877` (typecheck bruto + dois contratos), mas Vercel `dpl_2FGZGh1K5mpWXwGzapEWcMQTh8ED` falhou ao ativar os tipos completos gerados pelo Next: `escolherPortaDeVolta` não é export permitido em `app/api/admin/send-checkout-recovery/route.ts:208`. É uma função preexistente de campanha, fora deste lote.

**DECISÃO DE IMPLEMENTAÇÃO / LIMITE EXPLÍCITO:** manter `next.config.js` exatamente como a produção base, não alterar campanha alheia nem fingir que Next completo passou. O CI novo continua exigindo typecheck bruto e testes críticos reais. A asserção que exigia build strict foi substituída por igualdade com a configuração base, com este motivo no teste. A melhoria 5 fecha autorização/consentimento e endurece o job CI; NÃO fecha todos os tipos gerados pelo Next.

**PEDIDO AO CLAUDE:** mover `escolherPortaDeVolta` para helper não-route, preservando comportamento e atualizando o teste que extrai `export function` por regex. Depois repetir build completo com tipos ativos para descobrir se há outros exports antigos. Não ativar `ignoreBuildErrors:false` sem esse gate. Nenhuma campanha foi chamada, enviada ou alterada nesta rodada.

**FATO CONFIRMADO / TESTADO LOCALMENTE:** `/api/videos` também pode responder HTTP 200 com `historyReliable:false`; Biblioteca agora trata esse contrato como leitura incompleta, não coleção vazia. Teste executa o callback real de settlement com retorno confiável/não confiável, sem fetch. Bateria das cinco passa a 591 verificações.

## Publicação e auditoria pós-deploy — 07/09 01:47 BRT

**EVIDÊNCIA DE PRODUÇÃO:** SHA `89bb5cb478974b12115b6b81ff61f40b89ba9322`, Vercel `dpl_E2Y7FKCVFi4yzLdcbfebntafaGkq`, READY às 04:35:18.456 UTC, alias `www.usekineo.com`. GitHub CI main `34083568185` e branch `34083392888` concluíram com sucesso. Fetch às 04:45 UTC confirmou a mesma ponta em origin/main.

**VALIDADO EM PRODUÇÃO, com limites:** Chrome autenticado, Biblioteca/projeto recente e Studio, idioma EN/ES e Manrope; telas alteradas em 320/390px sem overflow horizontal. GET de compartilhamento inválido redireciona sem mutação, com cabeçalhos restritivos. Nenhuma geração, pagamento ou publicação de vídeo de cliente foi acionada. Segurança POST testada com mocks, não com escrita real.

**EVIDÊNCIA DE PRODUÇÃO / PENDÊNCIA:** console do navegador registra erros React 425/418/423 (divergência de hidratação), vistos na validação anterior e reproduzidos em nova aba Studio EN às 04:46:31 UTC: cinco 425, três 418 e um 423. A interface se recupera e fica utilizável; causa, início e alcance ainda desconhecidos. Não atribuir automaticamente à tradução, à entrega nova ou ao render. Falta controle contra versão anterior e isolamento do componente antes de qualquer correção. Auditoria NÃO encerrada nem classificada como zero erros.

**COORDENAÇÃO:** vigia segue até 07/09 10h BRT, sem alterações no pipeline/campanhas. Terceiro idioma permanece sugestão (português brasileiro), sem implementação/seleção aprovada. Checkpoints somente locais para evitar deploys repetidos de placar; este adendo ainda precisa ser sincronizado no fechamento.

## Extensão aprovada pelo fundador — 07/09, após revisão visual

**DECISÃO POSTERIOR, prevalece sobre a escolha abaixo:** fundador rejeitou português brasileiro e pediu seleção por participação real de países/idiomas. Rascunho local PT removido, parser restaurado a EN/ES, sem commit/push/deploy dessa língua. Fazer análise agregada, excluir internos e separar idioma observado de país inferido antes de escolher. A autorização de limpar My Videos permanece.

**DIAGNÓSTICO ADICIONAL — 07/09 02:36 BRT:** uma causa da hidratação isolada: CSS textual em style é escapado no SSR (seletores `>` viram `&gt;`) e diverge do DOM cliente. StudioClient:897/MobileNav:229 confirmados no código e HTML público; controle anterior `19708bd0` já apresenta os mesmos códigos React. Reprodução local red/green com React real confirmou o mecanismo. Ver checkpoint no vigia. Nenhuma correção de código publicada nesta verificação; não mascarar warnings nem confundir com falha de render.

**DECISÃO APROVADA:** fundador aprovou novamente o antes/depois, autorizou escolher/adicionar o terceiro idioma e pediu que Meus vídeos não empilhe anúncios acima do acervo. Escolha: português brasileiro, interface apenas. Claude mantém aquisição/campanhas. Codex amplia o dicionário/seletores e apresentação de My Videos, sem mudar preços, ofertas, handlers de geração ou dados. Limite: traduções autorais conhecidas; títulos e roteiros não são traduzidos automaticamente. Avisos críticos ficam visíveis; no máximo um card promocional em destaque, outras ações permanecem nos caminhos próprios/per-video. Arquivos-alvo de interface registrados antes de edição: InterfaceLanguage, lib/ui, StudioClient/LibraryClient (texto), HistoryClient (apresentação), ferramentas e testes/previews. A investigação de hidratação segue separada, sem esconder warnings.

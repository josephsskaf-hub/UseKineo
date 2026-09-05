# Plano para amanhã — UX, navegação e inglês + espanhol

**Data:** 05/09/2026, auditoria encerrada por volta de 00:20 BRT.  
**Base examinada:** `67b15c3012cd118c395b2de04535164b87d1e1c1`.  
**Worktree:** `C:/tmp/usekineo-plano-ux-2026-09-05`.  
**Estado:** PLANO / SOMENTE DOCUMENTAÇÃO. Nenhuma alteração no produto, no banco, nos preços ou no render. Nenhum vídeo ou pagamento iniciado.

**ATUALIZAÇÃO DO FUNDADOR — 05/09/2026:** escopo ampliado para TODAS as páginas do site, não somente home e Studio. Codex assume organização visual, navegação/botões e espanhol; Claude concentra fluxo, aquisição e novas assinaturas. Esta atualização substitui a divisão sugerida na auditoria original, sem autorizar alteração de render, preços, créditos ou termos. Ver `docs/ESCOPO-CODEX-UX-CLAUDE-VENDAS-2026-09-05.md` e registro em `docs/DECISIONS.md`. Implementação visual continua sujeita à comparação e aprovação por lote.

## 0. Cobertura ampliada — todas as páginas

**FATO CONFIRMADO:** inventário estático de 05/09/2026, base 67b15c30, encontrou 124 arquivos `app/**/page.{tsx,jsx,ts,js}`. São arquivos de página, não 124 URLs nem 124 defeitos: rotas dinâmicas podem atender várias URLs. Lista completa e estado inicial em `docs/INVENTARIO-PAGINAS-UX-2026-09-05.md`.

**SUGESTÃO de lotes:** navegação e design compartilhado → home → criação e acervo → autenticação/conta → planos e retornos de compra, coordenados com Claude → B2B/parceiros → ferramentas gratuitas/SEO/editorial → suporte/legal → admin por último. Todas as famílias entram no inventário; nenhuma recebe um redesign automático só por estar na lista.

**Critério por página:** classificar manter/refinar/corrigir; conferir propósito, CTA/destino, navegação, textos, estados vazio/erro/carregamento, desktop/mobile, acessibilidade, tradução e SEO aplicável. Cada rota dinâmica exige amostras representativas e estados de erro, não apenas checar que seu template existe. Rotas de API, motores, banco e políticas financeiras não são páginas de redesign.

**Limites:** layout/copy informativa em páginas legais não altera obrigações ou termos; UI de admin não muda fórmulas, permissões ou dados. Acesso e autenticação permanecem intactos. Não anunciar todas as páginas como revisadas antes de preencher a evidência individual.

## 1. Decisão proposta ao fundador

**SUGESTÃO:** não redesenhar a Kineo do zero. Corrigir primeiro a continuidade entre telas, depois reduzir a concorrência visual e só então adicionar espanhol. A identidade escura/azul e os vídeos reais são ativos a preservar.

Ordem proposta:

1. **Um caminho de criação:** os botões de próximo vídeo devem chegar à experiência Studio com o contexto correto.
2. **Uma hierarquia de tarefas:** criar, ver resultado e assinar não devem disputar atenção com todos os recursos simultaneamente.
3. **Navegação previsível:** mesmos nomes, destinos e estados entre desktop, celular e links antigos.
4. **Acabamento profissional:** menos microtexto, menos badges, espaçamento e tipografia consistentes, estados acessíveis.
5. **Inglês + espanhol:** inglês continua padrão; espanhol entra com jornada completa revisada, não apenas bandeirinha e home traduzida.

**HIPÓTESE comercial:** tornar a próxima ação compreensível pode melhorar uso e compra. Esta auditoria NÃO prova que o layout causou a queda de assinaturas e NÃO promete aumento percentual.

## 2. O principal defeito — não é apenas um link antigo

**FATO CONFIRMADO — código:**

- `app/(dashboard)/studio/page.tsx` renderiza `StudioClient`.
- `app/(dashboard)/studio/create/page.tsx:29` importa o antigo `GenerateClient`.
- `app/(dashboard)/generate/page.tsx:27` mantém compatibilidade: URL vazia vai ao Studio; com parâmetros vai a `/studio/create`. Valores são limitados a 2.000 caracteres no encaminhamento — o comentário “query intacta” não é literalmente verdadeiro para textos maiores.
- `lib/seriesContinuation.ts:244` monta os links de continuação e retorna `/studio/create` na linha 268.
- `StudioClient.tsx:239` recebe parte dos parâmetros; `:364` monta a execução; `:407` navega para `/studio/create`.
- `GenerateClient.tsx:7945` mantém a tela antiga quando há parâmetros de trabalho. Uma visita vazia pode voltar ao Studio, por isso testar somente a URL vazia não reproduz o defeito.

**EVIDÊNCIA DE PRODUÇÃO — Chrome do fundador, 05/09/2026:** `/studio/create?engine=fast`, sem prompt e sem autoanalyze, permaneceu na tela “Create your Short”, com categorias e controles antigos. `/studio` mostrou outra interface. Não foi necessário iniciar uma análise ou gastar crédito.

**SUGESTÃO de desenho:** Studio é a superfície de preparação e revisão. O trabalho já iniciado pode continuar no fluxo existente de processamento/recuperação, sem obrigar a pessoa a preencher outro formulário. Não refazer o pipeline de render para resolver navegação.

**Trava:** não fazer substituição global de `/studio/create` por `/studio`. Hoje o Studio não preserva todo o contrato de série, origem e retomada. Trocar a URL isoladamente pode perder contexto ou quebrar recuperação.

## 3. Inventário de botões e destinos a tratar

Cada linha diferencia defeito demonstrado de oportunidade. As linhas abaixo são referências na base examinada; conferir novamente após fetch antes de implementar.

| Prioridade / classificação | Superfície e fonte | Hoje | Proposta e teste de aceite |
|---|---|---|---|
| P0 · FATO CONFIRMADO | “Build next episode” no Studio, `StudioClient.tsx:807`; “Episode 2”, `:863`; helper `lib/seriesContinuation.ts:244` | Abre a interface antiga por `/studio/create` | Abrir Studio com continuação visível, assunto preservado e revisão explícita. Clique de navegação não gera nem debita. |
| P0 · FATO CONFIRMADO | Continuação na home, `components/ResumeStrip.tsx:84` | Mesmo helper e destino antigo | Mesmo contrato de continuação, com origem preservada. Testar logado e retorno após login. |
| P0 · FATO CONFIRMADO | Próximo episódio no histórico, `HistoryClient.tsx:1032,1858`; pill de render, `ActiveRenderPill.tsx:401` | Mesmo helper | Corrigir consumidores em conjunto; não deixar metade da jornada no fluxo antigo. |
| P0 · FATO CONFIRMADO | Sugestões pós-vídeo, `GenerateClient.tsx:16468` | `onPick` chama reset e escreve o próximo prompt no próprio formulário antigo | Encaminhar a seleção ao Studio com contexto. Preservar resultado/download e permitir voltar sem perder trabalho. Não testar com render pago. |
| P1 · FATO CONFIRMADO | “Generate Similar”, `my-videos/MyVideosClient.tsx:436` | Encaminha prompt e autoanalyze ao fluxo antigo | Separar “criar parecido” de “continuar episódio”; mostrar o texto no Studio para revisar antes de executar. Preservar comportamento de recuperação em outros botões. |
| P1 · FATO CONFIRMADO | Links de exemplos, `lib/growth/exampleRemix.ts:44`; ferramentas, `answerEngineHookWorkbench.ts:84` e outros helpers de growth | Também chegam a `/studio/create`, alguns com contratos próprios | Inventariar campos por caller antes de migrar: create_intent, script_mode, UTM, prompt, remix_mode. Não mover todos no primeiro patch. |
| P1 · FATO CONFIRMADO | “My Videos” no menu versus “View all” do gerador | Menu usa `/history`; o gerador usa `/my-videos`. As páginas importam clientes diferentes | Eleger destino principal após comparar recursos, mantendo compatibilidade. Não apagar uma tela antes de preservar exportação, recuperação, filtros e links existentes. |
| P1 · FATO CONFIRMADO | Nome da tela no topo, `DashboardShell.tsx:29,74` | Mapa não contém Studio, Images, Audio e Library; fallback “Dashboard” | Título e item ativo coerentes com a tela. Testar URLs filhas e menu móvel. |
| P1 · FATO CONFIRMADO | “Make episode N” na home, `app/page.tsx:120–127`; `ResumeStrip.tsx:161` | N é quantidade total de vídeos concluídos da conta + 1, não número da série | Usar “Continue this story” enquanto não houver ordinal real de série. Não inventar “episódio 343” juntando assuntos distintos. |
| P2 · FATO CONFIRMADO / alcance interno | Card Seedance 2.5, `KineoLanding.tsx:951`; `StudioClient.tsx:244`; `lib/engineLaunch.ts:13` | Card interno manda engine=s25, mas o Studio exclui s25 da leitura de URL; lançamento público está desligado | Corrigir contrato apenas para quem já é elegível. Não abrir motor ao público nem mudar lançamento como parte do redesign. |
| P2 · SUGESTÃO, não 404 | Cards AI Presenter / Character Lock / Transparent Clips / UGC Product Ads, `KineoLanding.tsx:1353–1373` | Quatro promessas de tarefa levam ao mesmo `/avatar`; cliente começa em photo (`AvatarStudioClient.tsx:135`) | Confirmar com Claude qual recurso cada card representa; abrir modo/preset quando suportado ou tornar a descrição clara. Não inventar deep link sem consumidor. |
| P2 · FATO CONFIRMADO / UX | Reference image, `StudioClient.tsx:575–582` | Etapa numerada do formulário contém botão desabilitado “SOON” | Tirar do caminho obrigatório e colocar em informação secundária. Não implementar image-to-video escondido num ajuste visual. |

**FATO CONFIRMADO:** os cards principais de motores que apontam para `/studio?engine=...` têm consumidor no Studio. Não é correto chamar todos os botões do site de quebrados.

**QUESTÃO PENDENTE:** matriz completa de login expirado, visitante novo, retorno de checkout, diferentes planos, render em andamento e recuperação. A sessão do fundador não representa todas essas condições.

## 4. Layout — o que mudar, sem perder a identidade

### 4.1 Home pública: demonstração primeiro, detalhes organizados

**EVIDÊNCIA DE PRODUÇÃO — 05/09:** navegação com muitos destinos, quatro vídeos principais, bento de motores, faixa variada de vídeos, ferramentas, nichos, comparação, pricing e FAQ. A home foi observada na sessão logada do fundador.

**SUGESTÃO:**

- Preservar os vídeos reais do Veo 3.1, Kling 3, MiniMax H3 e Omni Flash, incluindo variação de clipes, segunda fileira e vitrine de todos os motores.
- Manter o impacto visual dos exemplos. Não substituir por samples genéricos.
- Agrupar a navegação em conjuntos compreensíveis, por exemplo: Produto, Exemplos, Planos e Recursos; entrada empresarial identificada sem competir com todos os CTAs.
- Uma ação principal por seção. Acesso a preços sempre disponível para quem quer comprar; nenhum vídeo ou roteiro obrigatório para ver planos.
- Descrição curta junto à demonstração; especificações e explicações em áreas secundárias expansíveis.
- Organizar ferramentas e nichos, mantendo páginas e links relevantes para SEO/AEO.
- Revisar badges NEW/HOT e microtextos individualmente. Não remover informação útil nem experimentos por falta de amostra.
- Manter contraste e hierarquia do texto. O h1 existe em `KineoLanding.tsx:1003` com classe `sr-h1`; não registrar “h1 ausente” porque não se vê no screenshot.

**FATO CONFIRMADO:** a home usa CSS próprio `.klp` em `app/KineoLanding.tsx`. A proposta não é jogar um tema Tailwind por cima.

### 4.2 Studio: começar pela ideia, não pela configuração

**EVIDÊNCIA DE PRODUÇÃO — 05/09, viewport 390×844:** na conta examinada, o banner de afiliado, título, motor e formato ocuparam a primeira tela. A caixa de ideia ficou abaixo. A barra inferior mostrou oito destinos. O título superior mostrou “Dashboard”, enquanto o conteúdo dizia “Studio”.

**SUGESTÃO:**

- Mobile: ideia/roteiro primeiro; motor e duração compactos; custo e ação próximos. Câmera e opções secundárias em “Advanced”.
- Desktop: área de trabalho dominante, controles auxiliares compactos, resumo claro do que será criado.
- Custo calculado e saldo continuam explícitos; não esconder informação financeira para “limpar” a tela.
- Câmera opcional não deve parecer uma etapa obrigatória nem disputar peso com o roteiro.
- “Reference image — SOON” não deve ocupar uma etapa obrigatória.
- Revisar uma faixa de ação persistente no mobile somente após testar teclado, safe-area, nav inferior e mensagens de erro. Não sobrepor controles.
- Melhorar tipografia e espaçamento com os tokens existentes; reduzir glow, bordas e textos auxiliares só onde prejudicam hierarquia.
- Não alterar default de motor, duração ou script_mode como consequência estética.

### 4.3 Campanhas e avisos: prioridade por contexto

**FATO CONFIRMADO:** `DashboardShell.tsx:143` monta AffiliateFirstClickNudge antes do conteúdo. Outros avisos/modais são montados no shell e layout; têm condições próprias. Montagem não significa exibição simultânea.

**SUGESTÃO:** política única de prioridade visual, implementada sem apagar campanhas:

1. Erro impeditivo, status real do trabalho ou informação financeira necessária.
2. Próxima tarefa da pessoa: criar, retomar, baixar ou comprar.
3. Convite secundário contextual, de preferência dispensável.
4. Divulgação de afiliado e recursos opcionais fora do topo do fluxo de criação.

**QUESTÃO PENDENTE:** medir exposição real de cada aviso por coorte. O banner observado é de uma conta elegível a afiliado; não afirmar que todos o recebem.

### 4.4 Navegação e acervo

**FATO CONFIRMADO:** `components/MobileNav.tsx:11` define oito destinos logados. Há menu lateral acessível por hamburger; ferramentas ausentes da barra não são necessariamente inacessíveis.

**SUGESTÃO:** testar navegação móvel de quatro ou cinco itens com “Mais”, preservando acesso a todas as ferramentas. Seleção final em preview com o fundador. Separar:

- Criar: Studio e ferramentas.
- Trabalhos: vídeos e biblioteca, com distinção clara.
- Conta: plano, saldo, suporte e preferências.
- Crescer: indicação, afiliado e outros recursos, disponíveis sem dominar criação.

Não criar mais uma biblioteca. Comparar `/history`, `/my-videos` e `/library` antes de consolidar nomes.

## 5. Espanhol — recomendação e plano técnico

**SUGESTÃO:** inglês + espanhol agora; chinês, japonês e português ficam fora desta primeira entrega. Idioma adicional pode reduzir barreira de compreensão, mas não há evidência nesta auditoria para prometer mais assinaturas.

**FATO CONFIRMADO:** `app/layout.tsx:168` fixa `lang="en"`; `package.json` declara Next 14.2.5 e não contém biblioteca dedicada de tradução. Busca por provedores comuns e rotas de locale não encontrou uma arquitetura geral de UI multilíngue nas superfícies examinadas. Isso não é prova de inexistência de qualquer tradução isolada.

**FATO CONFIRMADO:** `StudioClient.tsx:517` contém tooltip em português numa interface inglesa. Idioma da interface e idioma do vídeo precisam ser tratados separadamente.

### Fase ES1 — arquitetura e dicionário, sem publicar metade de um caminho

- Separar strings de UI em dicionários en/es, com chaves tipadas e fallback explícito.
- Manter URLs inglesas atuais. Prototipar espanhol público em `/es` e `/es/pricing`, sem mover todas as rotas para uma nova raiz no primeiro patch.
- Preferência explícita de idioma e persistência compatível com SSR. Não forçar idioma por país/IP.
- Seletor “English / Español”, sem usar bandeira como equivalente de idioma.
- Não traduzir nomes de motores, chaves de API, valores de eventos ou URLs de callback.
- Não inferir idioma da narração, moeda de cobrança ou plano a partir do locale da interface.

### Fase ES2 — uma jornada completa

Traduzir e revisar home → autenticação → Studio → resultado → planos → cancelamento/sucesso, inclusive erros e validações. Conferir todos os componentes condicionais dessa jornada, não apenas títulos.

- Oferta, preço e termos continuam canônicos; espanhol deve dizer a mesma coisa.
- USD continua USD. Nenhuma promessa de cobrança em moeda local.
- Revisão humana da copy comercial e legal antes de anunciar suporte completo.
- Mensagens do checkout hospedado precisam de verificação separada; não modificar Stripe Dashboard nesta iniciativa.
- Conteúdo de usuário não é traduzido automaticamente.

### Fase ES3 — descoberta e qualidade

- `html lang` correspondente ao conteúdo efetivo.
- Canonical próprio e alternates recíprocos para páginas equivalentes publicadas; não anunciar traduções inexistentes.
- Links e sitemap consistentes com páginas realmente traduzidas.
- Testar expansão dos rótulos em espanhol, pluralização, quebras, leitores de tela e teclado.
- Não gerar dezenas de landings traduzidas automaticamente para “encher SEO”.

**REFERÊNCIA TÉCNICA:** Next.js 14 documenta roteamento e dicionários por idioma: [Internationalization](https://nextjs.org/docs/14/app/building-your-application/routing/internationalization). O Google documenta alternates e reciprocidade entre versões: [Localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions). A escolha de preservar as URLs inglesas é proposta específica deste repositório, não exigência dessas fontes.

## 6. Divisão de trabalho — sem colisão com Claude

**DECISÃO APROVADA — atualização do fundador em 05/09, registrada em DECISIONS.md.** Comunicação enviada pelo Git; leitura/ack do Claude será registrada separadamente, nunca presumida.

| Faixa | Dono proposto | Limite |
|---|---|---|
| Todas as páginas: home, produto, acervo, ferramentas, conta, B2B, SEO/editorial, suporte/legal e admin; navegação, botões, visual e espanhol | Codex | Trabalho por lotes com previews; preservar preços, oferta, termos, ativos da vitrine e lógica operacional. |
| Fluxo comercial, aquisição, intenção de compra, retorno e novas assinaturas; hipóteses e medição comercial | Claude | Não redesenhar ou duplicar superfícies em execução pelo Codex. Mudanças em mensagem/experimento são coordenadas; nenhum contato, preço ou gasto novo é liberado por esta divisão. |
| Idiomas e tokens compartilhados | Codex | Claude revisa equivalência comercial; fundador aprova visual. Tradução não muda oferta nem moeda. |
| GenerateClient, UpgradeModal, Sidebar/MobileNav e contratos de entrada | Coordenação prévia por Git/PEDIDOS | Sem edição simultânea. Não concluir que “está liberado” só porque não há conflito de merge. |
| Comparação visual e aceite | Fundador + auditoria cruzada | Desktop e mobile, antes/depois; publicar apenas o lote aprovado. |

Cada lote começa com origin/main atualizado, leitura do diário do outro e worktree própria. Antes de editar arquivo compartilhado, registrar dono, trecho, branch e gate no PEDIDOS e confirmar que não há entrega concorrente. Enquanto houver dúvida, avançar em lote não conflitante. A base desta auditoria não é autorização para publicar sem nova reconciliação.

## 7. Agenda proposta para amanhã

**SUGESTÃO — sequência, não promessa de concluir toda a migração numa tarde:**

### Manhã: decidir com evidência

1. Ler este plano e escolher a hierarquia visual.
2. Claude confirma o contrato de continuação e os caminhos que carregam trabalho.
3. Preparar preview comparativo antes/depois de home, Studio e mobile. Esta auditoria entrega diagnóstico e plano, não uma tela final aprovada.
4. Definir lotes pequenos e arquivo responsável. Congelar alterações paralelas nessas superfícies.

### Tarde: primeiro lote funcional, depois acabamento

- **Lote A:** títulos e destinos demonstrados; contrato de próximo episódio no Studio; teste dos botões ligados a esse contrato. Não mexer nos demais links de execução até comprovar compatibilidade.
- **Lote B:** mobile e avisos contextuais; caixa de ideia e custo com prioridade; opções avançadas sem perder funcionalidades.
- **Lote C:** refinamento da home preservando vídeos, destinos e SEO.
- **Lote D:** fundação en/es e primeira jornada revisada, separado dos fixes de navegação. Se não estiver completa, não anunciar lançamento multilíngue.

O lote A pode revelar dependências de recuperação e contexto que precisam ser resolvidas antes do B. Nesse caso, reduzir escopo e publicar apenas o que passar, sem virar mais uma reescrita em sequência.

## 8. Gates de aceite antes de qualquer publicação

**SUGESTÃO — checklist obrigatório do trabalho futuro:**

- Links de continuação na home, Studio, histórico e resultado chegam à experiência esperada.
- Tema, texto, modo de roteiro, motor elegível, duração, formato, origem e contexto de série não desaparecem.
- Botão “criar parecido” não promete ser continuação; “continuar episódio” não abre ideia vazia.
- Entrar por link não dispara render nem cobra. Testes com mocks contam chamadas reais do caminho executado.
- “Generate” só executa uma vez; duplo clique/reload/back não cria trabalho duplicado.
- Links de recuperação e sessões de render em andamento permanecem válidos.
- Login/retorno preserva trabalho; query não trunca silenciosamente um roteiro admitido na origem.
- Plano acessível por intenção explícita, sem exigir vídeo, roteiro ou saldo zerado.
- Falha de carregamento não vira lista vazia ou sucesso falso.
- Desktop e mobile testados com teclado, foco visível, Escape, zoom, rolagem, safe-area e teclado virtual.
- Testar estados deslogado, novo usuário, usuário com vídeos, pagante e elegível a afiliado. Usar fixtures/local preview; não inferir todos pela conta interna.
- Títulos e estado ativo coerentes em Studio, suas rotas filhas, Images, Audio, Library e acervo.
- URLs inglesas, links legados, canonical e ativos da home preservados.
- Inglês/espanhol sem mistura acidental, sem mudar moeda ou idioma da narração.
- Typecheck real verde, testes comportamentais, Guardião e comparação visual aprovados.
- Deploy validado depois de publicar; merge/build verde sozinho não prova o fluxo.
- Parada imediata em perda de contexto, execução automática inesperada, regressão financeira, quebra de login, recuperação ou acesso ao plano.

**QUESTÃO PENDENTE:** nenhum desses gates completos foi executado nesta auditoria de planejamento. Não houve render ou pagamento de teste.

## 9. Como medir sem criar mais ruído

**SUGESTÃO:** aproveitar eventos existentes antes de adicionar outros. Correlacionar origem do CTA com chegada ao Studio e próximo passo, sem roteiro bruto ou dados sensíveis.

Separar:

- Qualidade funcional: destino correto, contexto preservado, ausência de execução involuntária.
- Uso: pessoas externas que clicam e chegam, iniciam e concluem próximo vídeo.
- Negócio: primeira assinatura paga confirmada no servidor, e não clique ou pixel.
- Experiência: erro reproduzido e tarefa concluída, não julgamento de “bonito” como receita.

Fixar marco zero, janela e tamanho mínimo de amostra antes de editar uma superfície comercial; se pouca gente vir a mudança, resultado é inconclusivo. Não reescrever diariamente o mesmo componente sem aprendizado.

## 10. Cobertura, limites e preservação

**FATO CONFIRMADO / leitura realizada:** rotas Studio/generate, entrada e saída do StudioClient, consumidores de continuação, blocos pós-vídeo do GenerateClient, shell/layout e menus, home e cards, páginas de acervo, helpers de growth selecionados, entrada do Avatar, metadados e dependências. Arquivos grandes foram lidos nos caminhos relevantes, não integralmente linha a linha.

**EVIDÊNCIA DE PRODUÇÃO — 05/09:** observação no Chrome do fundador da home, Studio desktop, Studio mobile e entrada segura na UI antiga. A aba da auditoria foi fechada e a configuração de viewport restaurada.

**QUESTÃO PENDENTE:** não é auditoria exaustiva de todo botão, de segurança, de performance ou de todos os estados de conta. Nenhuma medição de conversão nova foi feita. Não se deve usar este documento como certificado de que “o resto funciona”.

**Preservar:** vídeos da vitrine, preços e créditos canônicos, campanhas sem decisão de retirada, dados, links de clientes, rastreamento útil, pagamentos e toda a confiabilidade de render conquistada.

**Próxima ação:** apresentar e aprovar os previews e o contrato de navegação com o fundador. Só depois implementar.

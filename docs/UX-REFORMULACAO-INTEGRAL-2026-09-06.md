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

## Lote 1 — publicado em 06/09

VALIDADO EM PRODUCAO: main recebeu 54bfdc48 (PR #45), depois preservado nos commits Claude ate 877278ff. Deploy producao READY dpl_C8Pno27jvLddCJXxMq5kRUfwY4Sf contem o lote. Home, /tools, /images, /audio e /library: hierarquia, agrupamento, editor antes das configuracoes e biblioteca com barra de filtros/busca. Midias curadas preservadas.

TESTADO LOCALMENTE: 49 invariantes executaveis de UX; 247 de curadoria; 11 estados Studio; 22 busca Library; 11 erro Library; tsc sem filtros exit 0. Guardiao workflow 34056495486 status success. RESSALVA: o workflow global tem etapas permissivas; esse status nao prova toda a suite. Os comandos locais citados passaram independentemente.

VALIDADO EM PRODUCAO (06/09): biblioteca da conta interna do fundador abre; trocar filtros Images/Audio funciona, sem escrita nem render. Nao e evidencia de conversao. COMPARACAO VISUAL: Chrome desktop; preview web protegido autorizado no navegador integrado a 390px, pois o override do Chrome reportava sucesso mas continuava 1920px. Home/Tools/Images/Audio com scrollWidth 390. Library exige login no preview; confirmada na sessao Chrome de producao. Artefato antes/depois em docs/previews/UX-INTEGRAL-HOME-FERRAMENTAS-2026-09-06.html.

## Lote 2 — implementado, preview validado, PR #46

IMPLEMENTADO: preferencia explicita English/Espanol, persistida localmente e separada do idioma de narracao. SSR continua English; spans traduzidos declaram lang=es. Nada de tradutor por DOM, reload de formulario, mudanca de URL, moeda, engine ou texto do cliente. Traducoes de numeros dinamicos conservam o valor canônico, nao congelam o trial de hoje. LandingPlanPrice muda somente verbo e /mo → /mes, com os mesmos valores USD.

IMPLEMENTADO: navegacao e titulos, corpo principal/FAQ da home, hub de 13 ferramentas, rotulos Images/Audio/Library e rodape em espanhol. COBERTURA PARCIAL: nomes de modelos, depoimentos, artigos, formularios das ferramentas filhas, ofertas isoladas, configuracoes detalhadas Studio/Avatar/Animate e demais familias ainda nao estao inteiramente traduzidos. Nao anunciar site 100% espanhol nem reforma total concluida.

IMPLEMENTADO: rodape com quatro grupos nativos abriveis, mantendo todos os links; Animate com coluna de formulario flexivel em vez da coluna de 352px do kit. Avatar com cards neutros, preview acessivel tambem no celular e ancora ate preview/resultado. FATO CONFIRMADO: o bloco que continha player, download e recomecar no Avatar tinha `hidden lg:flex`; o novo bloco nao fica mais exclusivo do desktop. Consentimento, handlers, payloads e custos intactos.

COMPARACOES: docs/previews/UX-INTEGRAL-WORKSPACES-2026-09-06.html (oito familias, antes/depois desktop/mobile) e docs/previews/UX-INTERFACE-EN-ES-2026-09-06.html (English/Espanol do codigo atual, cobertura parcial explicitada). Fixtures nao sao videos de clientes. Nenhuma credencial, envio, banco ou geracao nos testes.

## Coordenacao de publicacao

Esta pista publica SOMENTE por codex/ux-completo-2026-09-06 e merge na main atualizada. NAO enfileirar os mesmos commits em entrega-atual: o diario Claude registrou duplicatas e recuperacao em 4dba8c16. Nao reescrever nem limpar fila alheia. Novas alteracoes Claude em SeasonStrip/temporada sao preservadas. Reserva adicional: TopBar/Sidebar e apenas rotulos em LandingPlanPrice; nenhum calculo ou CTA de destino comercial alterado.

PROXIMO: validar lote 2 em browser, reconciliar main, publicar; depois concluir familias restantes e cobertura de idioma com inventario por rota, sem contar a barra herdada como reforma completa da pagina.

TESTADO LOCALMENTE (06/09): test-interface-language 780 verificacoes (inclui pares do dicionario, nao 780 jornadas); test-ux-complete 49; home-curation 247; tsc sem filtros exit 0 no merge a949a0ab. Guardiao 34058967798 success, com a ressalva de permissoes do workflow ja descrita acima.

VALIDADO EM PREVIEW WEB (06/09): dpl_2TpPE6JGrTk3TJ991Hpw26CdjMVt READY, SHA a949a0ab, PR #46. Chrome: espanhol persiste de Home para Images e apos reload; alternar EN/ES preserva literalmente a ideia digitada e o motor FLUX Dev, sem gerar. Navegador integrado 390px: Home espanhola sem overflow horizontal; Avatar tem preview display:flex visivel e ancora funcional, antes oculto por hidden lg:flex. Sem pagamento, render, upload ou banco. Texto ingles residual documentado, nao escondido.

Reconciliacao: main ac1b7144 contem apenas diario Claude adicional; incorporado sem alterar SeasonStrip/temporada nem enfileirar em entrega-atual.

## Lote 3 — reserva de interface

Escopo adicional: somente rotulos JSX de StudioClient, AvatarStudioClient, AnimateClient, EngineCycleCard, NavEngineItem e titulos da Sidebar. Nao mudar geracao, callbacks, efeitos, consentimento, valores de formularios, custos ou funil Claude. Ultimo commit StudioClient 027e7996 (layout desta pista), sem colisao com SeasonStrip. A traducao de nomes de botoes nao traduz o prompt nem dispara geracao.

IMPLEMENTADO: rotulos principais e instrucoes Studio/Avatar/Animate, descricoes dos cards de motor da home e numeros canonicos de custo/filmes em espanhol. Teste novo compara os SETE arquivos inteiros com d8889f6c retirando SOMENTE wrappers UiLabel/import; callbacks, efeitos, payloads, destinos e midias precisam continuar byte-a-byte iguais (normalizacao CRLF apenas). 22 contratos executaveis passaram; 49 invariantes UX e tsc exit 0. Preview desktop/mobile EN/ES em docs/previews/UX-STUDIO-AVATAR-ANIMATE-ES-2026-09-06.html.

EVIDENCIA DE PRODUCAO (06/09): lote 2 em main d8889f6c, deploy dpl_4PRfhdWhkKAKA2k1n2ajgRKvvcwC READY, PR #46. Lote 3 ainda nao publicado neste registro.

VALIDADO EM PRODUCAO (06/09): Chrome em www.usekineo.com exibe os dois seletores e os quatro grupos do rodape; escolher es troca o h1 para "Escribe una idea y mira como se convierte en un video" (acentos na interface). Nao apenas SHA remoto.

TESTADO LOCALMENTE lote 3: locale 1026 verificacoes, curadoria 247, Studio runtime 11 estados, proposta Studio 11, contratos Espanhol 22, UX 49 e tsc sem filtros exit 0. O teste antigo runtime falhou porque comparava a arvore React antes de renderizar UiLabel; agora remove APENAS esse wrapper na assinatura, preservando todos os valores e callbacks. Motivo registrado dentro do teste; o novo contrato compara o arquivo inteiro e executa espanhol de verdade.

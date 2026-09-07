# Nomes e auditoria das ferramentas — 07/09/2026 UTC

## Escopo e coordenação

- **DECISÃO DO FUNDADOR (chat):** melhorar nomenclaturas com referências externas e auditar funcionamento. Escopo implementado: central de 18 ferramentas, nomes e controles do editor local, inglês/espanhol. Não é uma declaração de auditoria de todas as páginas da empresa.
- **IMPLEMENTADO, AINDA EM VALIDAÇÃO:** branch codex/tool-names-audit-2026-09-07, worktree isolada C:/tmp/usekineo-ux-completo-2026-09-06, base origin/main 684d1614. Nenhuma edição na árvore principal, preço, crédito, Stripe, render de IA, banco ou aquisição do Claude.
- **FATO CONFIRMADO:** nomenclatura em lib/videoEditing/settings.ts:2, app/tools/page.tsx:36 e lib/ui/toolSpanish.ts:2. Dezoito nomes descritivos substituem frases como I need the complete script. Endereços, categorias, fatos canônicos e contratos das ferramentas anteriores preservados.

## Pesquisa e decisão de linguagem

- **EVIDÊNCIA EXTERNA, consulta 07/09 UTC:** [Clideo Tools](https://clideo.com/tools), [VEED Tools](https://www.veed.io/tools) e [Adobe Express](https://www.adobe.com/express/feature). Padrão observado: nome da tarefa ou ferramenta e botões com ação explícita. Não há estudo controlado que prove aumento de conversão por estes nomes.
- **DECISÃO DE IMPLEMENTAÇÃO:** Video Trimmer, Video Resizer, Video Speed Changer, Remove Audio, Add Text to Video. O botão usa a ação correspondente, em vez de cinco Open tool idênticos. Aspect ratio, Fit — add borders, Fill — crop to frame, Remove audio from export, On-screen text e Download video dizem o efeito real.
- **FATO CONFIRMADO:** a central distingue Video Script Generator, Hook Generator, Comment-to-Script Generator, Product Video Script Generator, Local Business Ad Script, Client Video Brief, Weekly Content Planner, YouTube Shorts Earnings Calculator, Video Cost Calculator, Business Approval Brief, YouTube Title & Description Generator, Script Duration Calculator e Video Idea Checker. Nomes em espanhol próprios; não foram inventadas novas capacidades.

## Falhas e testes

- **FATO CONFIRMADO / CORRIGIDO:** sampleClip preparava AudioContext/oscillator antes do try/finally. Recusa de resume ou falha de captureStream escapava da limpeza. Preparação movida para bloco protegido; testes executam essas duas falhas e verificam contexto fechado, oscilador parado e trilhas encerradas. Cancelamento, aba oculta, erro e timeout agora encerram com razão específica. Fonte: lib/videoEditing/browserEditor.ts, função sampleClip.
- **FATO CONFIRMADO / CORRIGIDO:** invalid_settings mostrava orientação sobre início/fim também para texto ou enquadramento inválido. Agora há invalid_speed, invalid_text e invalid_framing. Texto limitado explicitamente a 100 caracteres / três linhas manuais, para impedir blocos arbitrariamente altos; sem transcrição automática.
- **TESTADO LOCALMENTE:** 109 contratos do editor, 1058 de idioma, 49 UX, 22 workspace ES; typecheck bruto exit 0. Testes do editor usam primitivas de navegador mockadas: não são prova de codec real. O teste da nova linha inicialmente usava backslash-n literal; fixture corrigida para conter quebras reais. Uma asserção antiga de título espanhol foi atualizada ao novo título aprovado, sem remover verificação de idioma.
- **TESTADO LOCALMENTE (ferramentas anteriores):** duração de roteiro 19/19, decisão empresarial 85/85, compartilhamento Viral Score 73/73.
- **FALHAS HERDADAS REPRODUZIDAS:** baseline separado em C:/tmp/kineo-tools-baseline-20260907, 684d1614. Cinco testes (business-content-plan, client-short-brief, comment-to-video, product-to-video, local-business-ad-brief) esperam /generate e recebem /studio/create. public-cost-planner-discovery falha em três âncoras de copy antiga; publish-kit-business-path falha numa âncora de atribuição global. As mesmas sete baterias falham antes e depois. Não modificar navegação funcional só para satisfazer teste antigo nem declarar esses testes verdes.
- **EVIDÊNCIA DE NAVEGAÇÃO EM PRODUÇÃO:** 13 destinos antigos abertos no Chrome, todos com seus títulos e sem página 404/Application error. Isso confirma carregamento, NÃO todas as submissões/backend. Nenhuma geração paga provocada.
- **PENDENTE:** preview web, exportações reais do código atualizado, revisão mobile, Guardião, merge e produção. O seletor nativo de arquivo externo permanece não automatizável até o fundador habilitar Allow access to file URLs na extensão; não contornar. Amostra sintética local serve para testar exportação, não para alegar todos os formatos/dispositivos.

## Comparação visual

- **ARTEFATO:** docs/previews/UX-TOOL-NAMES-2026-09-07.html — JSX real antes/depois de 684d1614, central completa e editor, inglês/espanhol, 1280/390 px. Estático, sem serviços ou exportação.
- **INFLUÊNCIA DAS SKILLS:** Next.js/React orientaram preservação de fronteiras de render e estados; verificação no Chrome e deploy de preview precedem produção. Não atualizar Next.js ou bibliotecas nesta entrega.

## Preview e integração — 07/09, 02:08 UTC

- **TESTADO NO CHROME REAL:** c0cd1227, preview dpl_3YQJdxMjPjdq4ZfMfMdVjq21FBcL READY. Cada um dos cinco botões de ferramenta foi acionado; mesma amostra sintética local recortada de 1 a 3 s, enquadrada 9:16, acelerada 2×, sem áudio e com texto em duas linhas. Arquivo baixado (9).mp4: H.264 360×640, 1,060733 s, sem faixa de áudio. Mudando para 0,5× e áudio presente: (10).mp4, H.264 360×640 4,049633 s; AAC 3,988646 s, volume médio −29,1 dB. Dados de ffprobe/ffmpeg sobre downloads reais, não evento ou mock.
- **TESTADO NO CHROME REAL:** quatro linhas de texto → aviso exato de 100 caracteres/três linhas, sem download; corrigir para duas linhas → exportação concluída. Alternar espanhol mantém controles e dados. Hub mobile 390 px, scrollWidth 390, sem overflow. A primeira tentativa de viewport atingiu sessão antiga; claim da aba correta resolveu, largura medida antes da classificação.
- **EVIDÊNCIA DO TIMER:** ferramenta anterior /youtube-shorts-script-timer, botão de exemplo estruturado → 59 palavras faladas, 26 s estimados, oito palavras de direção ignoradas, alvo 60 s. Cálculo local, sem IA, sem gerar vídeo.
- **COORDENAÇÃO:** incorporados commits da main até 647ff7d1, incluindo /make e encaminhamento do Claude. Esse merge introduziu node:crypto na dependência dos fatos públicos; o renderizador OFFLINE de testes agora admite apenas esse builtin, sem liberar rede, credenciais ou banco. tsc bruto e 109 contratos passaram após integração. Guardião 34074863931 success em 011dda9b; gate do último SHA deve ser reconfirmado antes do merge.
- **LIMITE DA AUDITORIA:** os sete testes herdados reprovados estão documentados; carregamento das 13 ferramentas não prova suas APIs de IA. Não declarar todas as ferramentas em todos os dispositivos sem erro. O seletor externo não foi forçado após a negativa de permissão da extensão.

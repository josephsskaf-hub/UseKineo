# Nomes e auditoria das ferramentas — 07/09/2026 UTC

## Escopo e coordenação

- **DECISÃO DO FUNDADOR (chat):** melhorar nomenclaturas com referências externas e auditar funcionamento. Escopo implementado: central de 18 ferramentas, nomes e controles do editor local, inglês/espanhol. Não é uma declaração de auditoria de todas as páginas da empresa.
- **IMPLEMENTADO E VALIDADO EM PRODUÇÃO no escopo abaixo:** branch codex/tool-names-audit-2026-09-07, worktree isolada C:/tmp/usekineo-ux-completo-2026-09-06, base origin/main 684d1614. Nenhuma edição na árvore principal, preço, crédito, Stripe, render de IA, banco ou aquisição do Claude.
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
- **ESTADO NA PRIMEIRA ETAPA (superado pelo registro abaixo):** preview web, exportações reais, revisão mobile e Guardião ainda estavam pendentes. O seletor nativo de arquivo externo permanece não automatizável até o fundador habilitar Allow access to file URLs na extensão; não contornar. Amostra sintética local serve para testar exportação, não para alegar todos os formatos/dispositivos.

## Comparação visual

- **ARTEFATO:** docs/previews/UX-TOOL-NAMES-2026-09-07.html — JSX real antes/depois de 684d1614, central completa e editor, inglês/espanhol, 1280/390 px. Estático, sem serviços ou exportação.
- **INFLUÊNCIA DAS SKILLS:** Next.js/React orientaram preservação de fronteiras de render e estados; verificação no Chrome e deploy de preview precedem produção. Não atualizar Next.js ou bibliotecas nesta entrega.

## Preview e integração — 07/09, 02:08 UTC

- **TESTADO NO CHROME REAL:** c0cd1227, preview dpl_3YQJdxMjPjdq4ZfMfMdVjq21FBcL READY. Cada um dos cinco botões de ferramenta foi acionado; mesma amostra sintética local recortada de 1 a 3 s, enquadrada 9:16, acelerada 2×, sem áudio e com texto em duas linhas. Arquivo baixado (9).mp4: H.264 360×640, 1,060733 s, sem faixa de áudio. Mudando para 0,5× e áudio presente: (10).mp4, H.264 360×640 4,049633 s; AAC 3,988646 s, volume médio −29,1 dB. Dados de ffprobe/ffmpeg sobre downloads reais, não evento ou mock.
- **TESTADO NO CHROME REAL:** quatro linhas de texto → aviso exato de 100 caracteres/três linhas, sem download; corrigir para duas linhas → exportação concluída. Alternar espanhol mantém controles e dados. Hub mobile 390 px, scrollWidth 390, sem overflow. A primeira tentativa de viewport atingiu sessão antiga; claim da aba correta resolveu, largura medida antes da classificação.
- **EVIDÊNCIA DO TIMER:** ferramenta anterior /youtube-shorts-script-timer, botão de exemplo estruturado → 59 palavras faladas, 26 s estimados, oito palavras de direção ignoradas, alvo 60 s. Cálculo local, sem IA, sem gerar vídeo.
- **COORDENAÇÃO:** incorporados commits da main até 647ff7d1, incluindo /make e encaminhamento do Claude. Esse merge introduziu node:crypto na dependência dos fatos públicos; o renderizador OFFLINE de testes agora admite apenas esse builtin, sem liberar rede, credenciais ou banco. tsc bruto e 109 contratos passaram após integração. Guardião 34074863931 success em 011dda9b; gate do último SHA deve ser reconfirmado antes do merge.
- **LIMITE DA AUDITORIA:** os sete testes herdados reprovados estão documentados; carregamento das 13 ferramentas não prova suas APIs de IA. Não declarar todas as ferramentas em todos os dispositivos sem erro. O seletor externo não foi forçado após a negativa de permissão da extensão.

## Integração final

- **TESTADO LOCALMENTE:** incorporadas as entregas alheias até origin/main 3bd14969, sem editar os arquivos do Claude. HEAD de código 87b8f1552d8062d574f473f84ff7422a40fa6422; typecheck bruto exit 0, 109 contratos do editor e diff --check limpo após o último merge. PR #50.
- **TESTADO NO CHROME REAL:** /youtube-shorts-title-generator recebeu o tópico How to resize a video for TikTok e exibiu dez títulos, descrição editável e sete hashtags após Build my publishing kit. Prova do fluxo local; não avaliação editorial de todos os títulos nem teste de serviço de IA.

## Publicação e confirmação — 07/09/2026, 02:20 UTC (06/09, 23:20 BRT)

- **VALIDADO EM PRODUÇÃO:** Guardião 34075639289 success no SHA 87b8f155; push fast-forward confirmado em refs/heads/main. Vercel dpl_8fCBHMWCvgGYa3wpKCygGVGrnw1V READY. Depois, Claude publicou somente documentação em 5a79593e, também READY (dpl_78y21TgUnx3L22URVNtPDzJwdcTN); alterações incorporadas sem sobrescrever.
- **VALIDADO EM PRODUÇÃO:** www.usekineo.com/tools mostrou novos nomes/ações EN e ES; editor também traduziu. Captura imediatamente após mudar o seletor ainda mostrava texto anterior; leitura após atualização confirmou espanhol. Duplicidade do seletor no topo e rodapé exigiu escopo da navegação no teste, não mudança do produto.
- **VALIDADO EM PRODUÇÃO:** nova amostra sintética gerada localmente, corte 1→3 s, formato 9:16, velocidade 2×, texto KINEO / Teste final, áudio removido. Interface EXPORT READY; download real kineo-sample-kineo-edit (11).mp4, 15.764 bytes; ffprobe H.264 360×640, 1,068100 s, sem faixa de áudio; texto observado no player. Erros de console da aba: nenhum no período inspecionado. Nenhum crédito/fornecedor pago utilizado.
- **HANDOFF AO CLAUDE:** nomes e editor publicados; não reconstruir. Sete baterias herdadas com expectativas antigas ficam pendentes, além de QA de arquivos externos, outros navegadores e chamadas IA das ferramentas antigas. Os pedidos novos de aquisição recebidos em docs/PEDIDOS-CODEX-2026-09-06.md não foram executados nesta auditoria. Não converter este smoke em promessa de ausência universal de erros.

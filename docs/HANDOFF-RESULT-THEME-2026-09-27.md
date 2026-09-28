# Resultado do vídeo — paleta integrada

**IMPLEMENTADO — 27/09/2026.** Pedido do fundador: retirar a mistura de superfícies escuras e botões azuis/verdes dentro do Studio Light. Base `23c4d39d`.

**FATO CONFIRMADO.** `app/appearance.css` forçava tokens escuros em `.gv-card`, inclusive `.done-result`; o CSS do resultado em `app/(dashboard)/generate/GenerateClient.tsx:13552` também fixava fundo escuro. O resultado agora herda o tema da aplicação, com superfície branca/grafite no Light e a paleta existente no Dark. O player continua com fundo preto para a mídia.

**IMPLEMENTADO.** Cores de download, exportação, próximo episódio, ações complementares e barra inferior usam tokens. `FilmReadyExits`, `CleanFilmTrialDoor` e `NextActionCard` também seguem os tokens. Textos, preços, condições, eventos, links e handlers preservados.

**TESTADO LOCALMENTE.** Typecheck sem emissão; sharing safety (70), five improvements (646), render recovery (44), next-action-card (50), todos aprovados. O guardião clean-film-trial-door reporta a porta aposentada pela fonte, não um teste ativo. Comparação da AST sem atributos de estilo, strokes e folhas CSS confirmou código de comportamento idêntico à base nos quatro TSX.

**TESTADO LOCALMENTE.** Prévia de JSX real, com mídia substituída e dados fictícios, em Light/Dark antes e depois do download. Mobile de 390 px sem overflow horizontal. Opções de compartilhamento expandidas conferidas. Sem geração, compra, publicação de vídeo ou acesso ao banco.

**EVIDÊNCIA VISUAL — 27/09/2026.** Gerador offline `scripts/preview-result-theme.mjs`. Comparação autocontida: `C:/Users/josep/Documents/Codex/2026-09-21/kineo-ux-ui/outputs/result-theme-20260927/antes-depois.html`. O vídeo é substituído por um bloco explicitamente identificado; a prévia não comprova reprodução ou checkout em produção.

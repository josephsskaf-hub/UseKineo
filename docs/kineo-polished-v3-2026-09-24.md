# Kineo — refinamento visual 03, 24/09/2026

**DECISÃO DO FUNDADOR NESTA CONVERSA:** substituir Home / Create / For Ads por **Image / Video / For Ads / Pricing**, mantendo e refinando a direção mista das paletas. A marca continua levando à Home.

**IMPLEMENTADO — prévia somente:** `scripts/preview-kineo-polished-v3.cjs` gera nove telas em `public/design/polished-v3-20260924`. As rotas funcionais do produto, geração e pagamentos não foram modificadas. Os geradores anteriores agora expõem suas partes reutilizáveis; seus resultados publicados permanecem intactos.

**SUGESTÃO VISUAL:** base clara fria (#f5f7fa), texto azul grafite (#182537), ação azul (#1766d3). For Ads mantém navy (#0d1520), texto claro e botão azul Kineo (#2997ff). Tipografia, bordas e proporções foram alinhadas entre as páginas. Home mantém quatro cards limpos e filmes públicos existentes em 1080p. Conceitos estáticos continuam identificados.

**FATO CONFIRMADO — preços:** valores mensais e créditos são importados de `lib/checkoutPricing.ts` pelo gerador; opções avulsas de Ads reutilizam `lib/ads/offer.ts` e `lib/growth/dfyServiceFacts.ts`. Nenhum preço é definido de novo. Pricing separa assinatura criativa de software Ads e produção humana. Image segue motores e formatos já presentes em `app/(dashboard)/images/ImagesClient.tsx`; seu botão é demonstrativo.

**IMPLEMENTADO — comparação:** original preservado para Home e For Ads; rodada 02 preservada para suas sete telas; Image/Pricing são novas telas, sem antes inventado. Comparador desktop/mobile, navegação interna, tabs de preço acessíveis por teclado, reprodução e pausa dos vídeos e ações demonstrativas sem chamadas externas.

**TESTADO LOCALMENTE:** geração e empacotamento estático com análise de scripts; typecheck sem emissão; 70 checks de compartilhamento e 641 checks de contratos existentes. Inspeção visual desktop das páginas públicas e revisão independente mobile antes de publicar a prévia.

Arquivo autocontido gerado por `scripts/package-kineo-mixed-refined.cjs --source=public/design/polished-v3-20260924`, com imagens/fontes embutidas e MP4s públicos remotos. Publicação apenas do diretório da proposta, preservando o trabalho concorrente do Claude.

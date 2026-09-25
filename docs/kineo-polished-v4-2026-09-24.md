# Kineo — refinamento 04

**DECISÃO DO FUNDADOR NESTA CONVERSA:** continuar a direção aprovada da prévia 03, aumentar um pouco os cards e lapidar a apresentação. Menu Image / Video / For Ads / Pricing e paleta mista preservados.

**IMPLEMENTADO — prévia somente:** gerador offline `scripts/preview-kineo-polished-v4.cjs`, a partir das nove páginas aprovadas em `public/design/polished-v3-20260924`. Nova saída `public/design/polished-v4-20260924`; versões anteriores intactas. Nenhuma rota funcional, preço, texto de oferta, pagamento ou geração foi alterada.

**FATO CONFIRMADO NO GERADOR:** largura máxima da vitrine 1440→1540px. Cards principais 360→404px, desktop baixo 300→340px, mobile 244→274px. Espaçamento acima dos cards compensado para preservar o começo da seção seguinte. Tablet intermediário em duas colunas. Vídeos existentes e seus arquivos 1080p preservados; showcase Video continua em contain.

**SUGESTÃO VISUAL IMPLEMENTADA:** sombras discretas, alinhamento das legendas, bordas e cantos consistentes, áreas de clique maiores, foco por teclado visível, cards de planos e serviços com botões alinhados. Mais área para imagem nas telas Image, Video, For Ads, Examples e Library, mantendo a composição aprovada.

**COMPARAÇÃO:** todas as nove telas podem ser comparadas à prévia 03; Home e For Ads também mantêm o snapshot do site original. HTML autocontido empacotado por `package-kineo-mixed-refined.cjs --source=public/design/polished-v4-20260924`.

**VALIDAÇÃO:** scripts inline analisados no gerador e empacotador; typecheck e contratos offline obrigatórios; revisão visual desktop/mobile antes da publicação da prévia.

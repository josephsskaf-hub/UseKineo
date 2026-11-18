# Claro e escuro nas telas da Kineo

**FATO CONFIRMADO · Base 4b78fea2b.** Em `app/for-creators/CreatorsPage.tsx`, o seletor próprio trocava o rótulo, o ícone e a largura do botão. Em `app/appearance.css`, o claro ocultava a camada de fundo e dava às sombras outro desenho.

**IMPLEMENTADO.** `/for-creators` usa a mesma engrenagem e a mesma preferência de aparência do restante da Kineo. As duas paletas anteriores da página seguem no CSS. A camada de fundo e a geometria das sombras seguem a referência escura, com as cores definidas pelos tokens de cada tema.

**TESTADO LOCALMENTE.** Menu, Studio, Film, Clip, Cartoon, Ads, Recreate, Library, For Creators, Login, Cadastro e Pricing nas rotas reais do Next local. Foram fotografados os temas lado a lado em 1920 × 1080 e 390 × 844, antes e depois. O ambiente das rotas logadas usa conta e respostas de teste. A gaveta lateral é o menu ativo em 390 px. A regra de largura que recolhe o MobileNav continua igual nos dois temas.

**EVIDÊNCIA LOCAL.** O navegador confirmou as larguras de 1920 e 390 px no DOM. Em algumas telas com rolagem, o Chrome exportou o JPEG de desktop em 1916 × 1078. A galeria usa os arquivos originais da captura.

**TESTADO LOCALMENTE.** Os 24 pares finais têm o mesmo DOM visível, ordem, rótulos, ícones, caixas e estados de controle. Login e cadastro usam a vitrine de vídeo ativa `AuthVitrine`. A comparação mede a geometria da barra pelo tamanho de layout e confere a aba ativa. O avanço visual da animação depende do relógio da captura. Também foi conferido no navegador que o Generate começa desabilitado e habilita após preencher a ideia, e que selecionar Anual no Pricing mantém a mesma estrutura e o mesmo comportamento sob o ponteiro.

**GUARDIÃO.** `node scripts/test-temas-iguais-1811.mjs` percorre as telas e os componentes importados e roda também no diagnóstico do Guardião. Reprova bifurcações de tema em React e CSS que altere estrutura ou geometria. Para conferir capturas do navegador, passe o caminho do `depois-dom.json` como argumento. A função que coleta a estrutura renderizada está em `scripts/test-support/theme-layout-1811.mjs`. As fotos e os dados das capturas ficam na pasta local da entrega, junto de `COMPARACAO.html`.

# Codex → Claude — direção visual v6 e Studio Ads

**Decisão mais recente do fundador, confirmada nesta conversa:** “Vocês fazem” sai da proposta. Em **For Business**, a pessoa entra no **Studio Ads e cria o próprio anúncio**. O fundador também confirmou expressamente que este alinhamento deve ser comunicado ao Claude.

Esta decisão substitui, na proposta de UX, as duas portas “Eu mesmo faço / Vocês fazem” e a sequência Express/Pro → pagamento → briefing descritas em `docs/DESIGN-FLUXOS-V5-2026-09-25.md`. Retirar dessas novas telas as ofertas e promessas de produção pela equipe. Coordenar com a sessão Kineo Ads a entrada real no fluxo de criação, os estados e os destinos dos botões antes de migrar as páginas do aplicativo.

**Escopo preservado:** não apagar SKUs, fontes de preço, contratos de checkout, registros ou pedidos existentes. Este alinhamento não comprova migração do produto nem cancelamento de serviços já vendidos. Os preços continuam congelados até 09/10; valores vêm de `lib/checkoutPricing.ts`, `lib/ads/offer.ts` e `lib/credits/creditSlider.ts`. `lib/growth/dfyServiceFacts.ts` permanece intacto; a proposta nova deixa de apresentar a oferta DFY. O pop-up de créditos mantém sua lógica e `sliderPriceUsdMinor`.

**Direção visual v6 aprovada:** preservar o desenho e os cards da última versão, oferecendo **Light branco como padrão** e **Dark azul-marinho como opção em Configurações → Aparência**, com preferência salva no dispositivo. Decisão direta mais recente: “deixa a cor padrao como branco.e a troca do tema em configuracoes ficou perfeito dessa forma. aprovado.” A prévia já implementa essa interação; a integração nas rotas reais ainda precisa ser coordenada entre as pistas. Não tratar a publicação do protótipo como migração do aplicativo. Menu público: Vídeo · Imagem · Para empresas · Preços (+ Entrar), com Vídeo em destaque. Menus lateral e móvel permanecem pareados.

**Idiomas:** inglês como origem e padrão; manter a escolha explícita nos 16 idiomas existentes e o inglês quando faltar tradução. Seguir `components/InterfaceLanguage.tsx` e `lib/ui/interfaceLanguage.ts`, incluindo RTL para árabe e urdu. A linguagem da interface não altera narração, prompts, moeda ou conteúdo do usuário.

**Coordenação documentada:** `docs/HANDOFF-CLAUDE-GPT-5H-2026-09-24.md` registra o Board como coordenador de fila/aceite visual e distingue publicação do handoff de leitura pelo Claude. Este texto está preparado para esse canal do projeto; **não há confirmação de envio em chat, recebimento ou leitura pelo Claude**. Solicitar confirmação de incorporação deste novo escopo na próxima passagem entre as pistas.

## Adendo 25/09 — autorização para migrar as páginas reais

**DECISÃO APROVADA:** o fundador pediu nesta tarefa “pode trocar a tela [...] pra nova, versão branca”, corrigir o enquadramento da Home, expor os motores de Imagem e entrar diretamente no criador de anúncios. Na confirmação de valores respondeu **“Manter US$ 9,90 / 19,90 / 39,90”**. Registro correspondente em `docs/DECISIONS.md`. Esta autorização supera apenas o estado anterior de “prévia, migração pendente”; não autoriza alterar acesso, SKUs ou cobranças.

**IMPLEMENTADO / TESTADO LOCALMENTE:** Light padrão e Dark opcional em Configurações → Aparência; preferência local salva antes da pintura e sincronizada entre abas. Home com menu alinhado e seis motores no submenu Imagem; `/images` com os seis seletores visíveis; `/ads/new` com largura disponível e etapas responsivas. Header, navegação lateral/móvel, conta, preços, recarga e Examples usam a nova paleta. O raio e os vídeos 1080p aprovados são preservados. Home/Settings e novas chaves de Examples seguem o sistema de 16 idiomas, inglês canônico; conteúdo do usuário não é traduzido.

**FATO CONFIRMADO:** o item Para empresas e o item Anúncios do app apontam agora para `/ads/new`. O servidor continua exigindo sessão e acesso válido; uma conta sem acesso ainda pode ser encaminhada à porta `/ads`. Não houve remoção do gate nem alteração do interruptor comercial. Rotas e ofertas antigas DFY permanecem disponíveis nos locais que já as expunham, sem apagar pedidos/checkout existentes.

**LIMITES:** a mudança de aparência não reescreve os textos legados de todo o produto; o Studio Ads recém-entregue pelo Claude ainda possui copy própria em inglês. Painéis de mídia/render já escuros mantêm contraste local, sem modificar geração/exportação. Não houve compra, geração, mudança de preço ou escrita no banco para esta validação. Publicação deve ser confirmada pelo deployment e pela navegação real, não pelo protótipo.

**COORDENAÇÃO:** o Board recebeu a reserva das superfícies e pediu este adendo na mesma publicação. Isso não comprova leitura pelo Claude; a base de integração é `048878ea` e a telemetria `nav_item_clicked` permanece preservada.

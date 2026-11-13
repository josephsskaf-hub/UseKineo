# Home e telas — decisão para Joseph · 13/11/2026

**SUGESTÃO — escolher A, “Your next story”, como candidata principal.** A pessoa vê uma história humana, um desenho e um produto; escolhe o trabalho que quer fazer. Depois encontra os modelos que realmente pode recriar com uma foto. B começa pelo comerciante; C começa pela identificação pessoal. São propostas para olhar e testar, sem publicação autorizada nesta missão.

**EVIDÊNCIA DE PRODUÇÃO — relatório de 13/11, janela de 30/10 a 13/11:** Films recebeu cliques de 105 pessoas; desenho infantil, 73; anúncio de produto, 33; UGC, 23. O relatório registra 1.470 pessoas na home e 182 clicando em algum cartão, apresentado como 12%. Isso favorece testar histórias antes de transformar toda a home em anúncios. **DESCONHECIDO:** qual clipe vende mais; o evento guardou a família, não o clipe. Os grupos não são exclusivos e não devem ser somados. Fonte: `docs/home-1311/CLIQUES-POR-CARTAO-1311.md`, CEO, consulta local em 13/11.

## Folha de decisão — as três mudanças por tela

Cada linha está em ordem de prioridade. “Pequena/média/grande” descreve o alcance da obra, sem estimativa de horas. As referências de mercado foram observadas pela CEO nas fontes abaixo; são práticas de interface, não provas de conversão.

| Tela | SUGESTÃO — três mudanças, em ordem | Obra e referência observada |
|---|---|---|
| **Home** | **1.** Seis novidades grandes antes de qualquer faixa, com pessoa, personagem ou produto inteiros. **2.** Botão por intenção: filme, desenho, anúncio ou modelo aprovado. **3.** Uma seção explícita de Recreate logo depois; medir cada cartão. | Pequena / pequena / média. Higgsfield mostra demonstrações, ferramentas e Recreate antes do catálogo de filmes; dossiê de 12/11 [H]. Não copiar sua proporção de cartões. |
| **/recreate** | **1.** O catálogo visível deve conter só modelos liberados. **2.** Mostrar resultado, foto necessária e botão no mesmo bloco. **3.** Separar pessoa, pet e produto sem esconder a opção de ver todos; publicar a ordem por data real quando houver esse dado. | Pequena / pequena / média. Adaptar a demonstração seguida de ação de Higgsfield [H]; a liberação já tem fonte única no código. Ordem cronológica sem data é desconhecida. |
| **Filme** | **1.** A ideia escolhida chega preenchida à caixa. **2.** Um exemplo narrado real ao lado da ideia mostra o que será entregue. **3.** Uma confirmação legível reúne formato, duração e custo antes de gerar, preservando o texto se houver erro ou saldo insuficiente. | Pequena / pequena / média. InVideo expõe cálculo antes da criação [I]; adaptar o princípio de confirmação. O peso de Films vem dos dados da Kineo, não de benchmark de conversão. |
| **Cartoon** | **1.** Perguntar primeiro pela história; opções técnicas depois. **2.** Mostrar um desenho existente com personagem inteiro e explicar se o personagem pode ou não ser mantido. **3.** Preservar a ideia na passagem da tela nova ao gerador. | Pequena / pequena / média. HeyGen usa uma entrada pela tarefa [Y]; transferir isso para cartoon é hipótese, não observação de um líder específico de desenho. Não prometer consistência de personagem sem validação. |
| **Anúncio** | **1.** Foto ou link do produto + “o que você vende?” no molde do Recreate. **2.** Exibir os formatos que aquela conta realmente pode produzir; um exemplo não habilita pessoa falando. **3.** Aprovar produto/roteiro e ver custo antes de pedir o vídeo. | Média / pequena / média. Pesquisa de 13/11: Higgsfield coloca produto e estilo no fluxo [M]; Creatify aceita URL de produto [C]; HeyGen apresenta imagens antes do vídeo [Y]. Reusar a pesquisa, sem criar um segundo fluxo paralelo. |
| **/made-with-kineo** | **1.** Filtro por trabalho — filme, desenho, anúncio, clipe — com a classificação de `CLIPES_NOVOS`. **2.** O mesmo enquadramento inteiro e o mesmo botão honesto da home. **3.** “Feito manualmente” e “modelo disponível” precisam continuar distinguíveis; nenhum contador público sem origem real. | Pequena / pequena / pequena. Higgsfield usa catálogo e demonstração [H]; a honestidade da atribuição é exigência da Kineo, não alegação sobre concorrentes. |
| **/pricing** | **1.** Explicar o que a pessoa consegue entregar em cada plano com números da fonte de preço. **2.** Ao vir de um trabalho, preservar o trabalho e a volta após o pagamento. **3.** Tornar cobrança, renovação e recarga legíveis junto da decisão. | Pequena / média / pequena. **DESCONHECIDO:** esta pesquisa não comparou páginas públicas de preços. A transparência antes da ação de InVideo [I] sustenta o princípio; aplicar isso à escolha de plano é inferência. Sem alterar preço ou oferta nesta missão. |

**O que pode melhorar:** há interesse comprovado por família, mas falta saber se uma imagem leva a uma criação entregue e a pagamento. Um cartão bonito que abre um trabalho diferente desperdiça esse interesse. **Próximo passo recomendado:** revisar as fotos A/B/C, escolher uma, instrumentar o cartão e só então autorizar um teste público.

## As três estratégias completas

**IMPLEMENTADO — proposta local:** `EstrategiasHome.tsx` exporta `HOME_STRATEGIES`, com três telas de seis cartões por estratégia. Cada entrada contém ID, texto, motivo individual da posição, CTA, destino, vídeo e pôster. As sequências abaixo são a leitura rápida; os 54 motivos e todos os destinos exatos estão nos dados exportados e no “Why this position” de cada cartão da prévia.

### A — Your next story · recomendada

**HIPÓTESE:** para criadores e famílias, começar pela história e pelo personagem aproveita melhor a demanda observada; o produto continua visível na primeira linha. Clicar inicia o filme, desenho ou anúncio correspondente; na segunda seção, “Recreate” abre um modelo público.

| Posições | Ordem dos cartões | Por que este bloco existe |
|---|---|---|
| 1–6 | Carta do front · Raposa e lanterna · Burger em câmera lenta · Último trem · Tênis no pedestal · Creme em selfie | Seis novidades. Alterna a família mais clicada, a segunda e um produto concreto; nenhuma comparação entre clipes foi medida. |
| 7–12 | Passarela · Pet abelha · Produto gigante · Pet leão · Santa cartoon · Pet anjo de Natal | O visitante passa de “gostei da ideia” a “posso colocar minha foto”. Só catálogo público; sem teste pago novo. |
| 13–18 | Mary Celeste · Dragãozinho · Relógio · Anticítera · Boneco de neve · Porta do Inferno | Prova de filme narrado real e variedade de histórias/produtos, depois da escolha simples. Paisagens e temas abstratos não abrem a página. |

**Risco concreto:** parte das novidades é inspiração de uma cena, não filme narrado pronto. Os cartões dizem que começam uma nova criação; Mary Celeste comprova a narração na terceira seção. Nenhuma promessa de refazer exatamente a cena.

### B — Your product, in motion · desafiante comercial

**HIPÓTESE:** para comerciantes, três produtos diferentes na primeira linha tornam a utilidade comercial imediata. O clique leva ao formulário de anúncio existente, não a uma compra automática nem a um formato de apresentador indisponível.

| Posições | Ordem dos cartões | Por que este bloco existe |
|---|---|---|
| 1–6 | Burger · Tênis · Creme · Carta do front · Raposa · Último trem | Seis novidades; prioridade comercial na primeira linha e as duas famílias mais clicadas ainda na primeira seção. |
| 7–12 | Relógio · Colar · Suéter de pet · Produto gigante · Mary Celeste · Dragãozinho | Amplia usos de loja e oferece um modelo público de produto; não confunde anúncio manual com resultado automático do gerador. |
| 13–18 | Passarela · Pet abelha · Pet leão · Boneco de neve · Anticítera · Porta do Inferno | A pessoa pode mudar de intenção depois de entender a proposta comercial. |

**Risco concreto:** anúncios de produto tiveram 33 pessoas clicando, contra 105 em Films na janela relatada; dominar a abertura com Ads pode prejudicar quem chega por filmes. B é desafiante para tráfego comercial identificado, não recomendação para substituir toda a home agora.

### C — See yourself in the idea · identificação pessoal

**HIPÓTESE:** para quem chega por pessoas, pets e momentos compartilháveis, a identificação aparece antes da ferramenta. Os quatro primeiros botões dizem “Explore templates”; só modelos aprovados dizem “Recreate”.

| Posições | Ordem dos cartões | Por que este bloco existe |
|---|---|---|
| 1–6 | Selfie com multidão · Suéter aconchegante · Balão e confete · Dança no corredor · Raposa · Carta do front | Seis novidades. Pessoas primeiro; desenho e história conectam o interesse aos produtos. Os quatro primeiros não são modelos de troca aprovados. |
| 7–12 | Passarela · Pet abelha · Pet leão · Santa cartoon · Pet anjo de Natal · Produto gigante | Transforma reconhecimento em uma ação literal disponível com foto. |
| 13–18 | Dragãozinho · Boneco de neve · Último trem · Tênis · Burger · Creme | Aprofunda família, canal e comércio depois da entrada pessoal. |

**Risco concreto:** a pessoa pode esperar entrar no vídeo exato, mas o botão abre a grade de modelos aprovados, sem oferecer a troca exata. A nota do cartão explica a diferença. C é a menos indicada antes dos testes de troca dos novos modelos; se os testes não forem aprovados, não se muda o botão para Recreate.

## Contrato dos botões e da prévia

**FATO CONFIRMADO — código lido em 13/11:** a rota `app/create/[tab]/page.tsx:67` repassa a ideia de Film; `:61` preserva a query de chegada Ads; `:55` limita os parâmetros de Cartoon. A prévia usa Film com `?ideia=<título>`, Cartoon seco, Ads com `?entry=product`, e `/recreate` para explorar modelos a partir de uma inspiração. Cartoon não recebe uma ideia que sua rota não aceita. Nenhum botão dispara render. Esses destinos podem pedir cadastro antes de continuar; esta proposta não contorna autenticação.

**FATO CONFIRMADO:** `lib/recreate/catalogPublic.ts:22` deriva disponibilidade de `publicRecreatePath`, e `lib/recreate/entry.ts:5` exige liberação, aprovação e preço válido para swaps. A prévia usa `publicRecreateCatalog()` e seu `href` de visitante; não mantém outra lista de disponibilidade. O único swap escolhido é Passarela, de uma pessoa. Os demais são efeitos já públicos com prévia existente. A escolha de quais exemplos mostrar é editorial; títulos e mídia são lidos da fonte canônica.

**IMPLEMENTADO — estudo local:** mídia de `CLIPES_NOVOS`, sem cópia dos arquivos; catálogo público para modelos. Área visual 5:6, três colunas no desktop, duas no celular de 390 px; `object-fit: contain` sobre fundo claro para não cortar cabeça, rosto, braço ou produto. Título e botão ficam fora da imagem, portanto a altura total do cartão é maior que 5:6. Não há preço nem motor em cartão ou botão, e a menor fonte é 12 px. Só vídeos de demonstração recebem autoplay/muted/loop/playsInline. O cabeçalho usa os produtos e endereços reais.

**TESTADO LOCALMENTE (13/11/2026):** as seis vistas em1920×1080 e390×844, suas páginas completas e os18cards de cada proposta foram conferidos no navegador; sem rolagem horizontal. Veja [PROPOSTAS-ABC.html](PROPOSTAS-ABC.html). Botões foram trazidos para a faixa acima da mídia para ficarem visíveis na primeira dobra. O componente recebe `strategy="A"|"B"|"C"`; a rota local de prévia deve ler `?estrategia=` e repassar a prop. Os links do seletor são para a prévia local, não para publicar uma nova rota comercial. Não houve alteração de estado, criação, geração, compra ou uso de credencial. Proposta preparada não significa publicada nem validada por cliente.

## Medição em sete dias e quando desfazer

**SUGESTÃO:** começar por A depois da aprovação visual. Comparar períodos completos de sete dias com a mesma definição de visitante externo, origem, dispositivo e janela de atribuição. Não comparar o total de sete dias com o total histórico de quatorze dias. Com o volume disponível, não prometer que um teste triplo terá poder estatístico; resultados inconclusivos continuam inconclusivos. B pode ser o próximo desafiante para tráfego comercial; C depende de resolver a expectativa de troca.

1. **Interesse:** pessoas externas que viram cada cartão e pessoas externas que clicaram, com `card_id`, estratégia, posição, família e origem. Deduplicar por pessoa; rolagem e remontagem não criam pessoas. Registrar impressão só quando o cartão foi visto; a prévia desta missão não envia eventos.
2. **Ativação:** entre as pessoas que clicaram, quantas criaram conta e concluíram a primeira criação; para Films, quantas receberam o primeiro filme. Separar família e falha, sem contar render iniciado como entregue.
3. **Comercial:** pessoas externas que abriram pagamento e que efetivamente pagaram, ligadas à estratégia original. Mostrar também valores e período do pagamento real; visita e download não são receita. Excluir contas internas pela fonte `lib/internalAccounts.ts`.

**Sinal para interromper imediatamente:** link quebrado, mídia que não abre, rosto/produto encoberto, oferta indisponível exposta, render automático ou perda da ideia após cadastro. Voltar à ordem anterior e corrigir a causa. **Sinal para rever ao fim de sete dias:** mais cliques com menos criações entregues ou pagamentos na mesma coorte; investigar a diferença por origem antes de chamar isso de melhoria. Sem eventos por cartão ou com poucas pessoas para decidir, não declarar vencedor nem inventar ganho percentual. A reversão é restaurar a ordem anterior, preservando eventos e segurança dos geradores.

## O que já existe, o que falta e o que evitar

**IMPLEMENTADO / fonte existente:** prévias e pôsteres dos clipes em `public/previews/galeria/` e `public/posters/galeria/`; modelos e efeitos públicos; rotas de criação; filtro `produto` na raiz da sessão principal. Este componente só consulta essas fontes. Não modifica `lib/recreate/formats.ts`, a home pública nem preços.

**PENDENTE:** ID do cartão na medição antes do teste público; validação dos novos swaps pela Div.2 antes de prometer troca. A integração da prévia e as seis capturas A/B/C estão concluídas; os pôsteres e frames visíveis foram conferidos em5:6 com contain. O estudo não revalida os vídeos pagos quadro a quadro. Selfie, suéter, balão e dança continuam sem CTA de troca até aprovação do teste pago pela sessão responsável. Nenhum vídeo ou foto novo é necessário para este estudo; nenhum gasto foi feito. Modelos sazonais precisam sair quando o período terminar. Validação completa de links e autenticação deve ocorrer no ambiente de teste da sessão principal, sem gerar conteúdo.

**NÃO FARIA:** copiar 41% de Recreate porque um líder exibe essa proporção; inventar views, uso ou conversão; abrir com paisagem sem pessoa/produto; esconder a ação em hover; cortar produto para preencher a caixa; colocar motor/preço no cartão; abrir render sozinho; prometer boca falando, troca de duas ou três pessoas ou troca em vídeo enviado pelo cliente. Também não daria a uma inspiração manual o rótulo de resultado garantido da ferramenta de Ads.

## Fontes e alcance da comparação

**EVIDÊNCIA DE PRODUÇÃO:** `docs/home-1311/CLIQUES-POR-CARTAO-1311.md`, CEO, 13/11/2026 02:22, janela de quatorze dias. A lista de cliques é por família; não foi atribuída a um clipe.

**PRÁTICA OBSERVADA POR TERCEIRO:** `docs/home-1311/DOSSIE-HOME-LIDERES-1311.md`, CEO, observação de 12/11/2026 em [Higgsfield](https://higgsfield.ai/) **[H]**. A análise descreve sua interface e composição; não confirma receita, conversão, resultado de geração ou superioridade para a Kineo. Os percentuais do dossiê são arredondados e não são meta.

**PRÁTICA OBSERVADA POR TERCEIRO:** `docs/ads-fluxo-mercado-1311/PESQUISA-FLUXO-ADS-LIDERES-1311.md`, CEO, 13/11/2026. Pesquisa reutilizada, não refeita. Links oficiais que o relatório usa: **[M]** [Higgsfield Marketing Studio — help center](https://higgsfield.ai/creator-hub/help-center/tools-and-workflows/how-do-i-use-marketing-studio-to-create-video-ads), atualização registrada em 26/10/2026; **[C]** [Creatify URL to video](https://docs.creatify.ai/use-case/url-to-video); **[Y]** [HeyGen Video Agent](https://help.heygen.com/en/articles/12402907-how-to-get-started-with-video-agent); **[I]** [InVideo — créditos antes da criação](https://help.invideo.io/credits-and-plans/where-can-i-see-the-credits-calculated-for-my-video-media-before-creating-it). Funcionalidade observada e alegação comercial de fornecedor não equivalem a resultado comprovado.

**Fonte do escopo:** `docs/MISSAO-GPT-CARDS-3-ESTRATEGIAS-1311.md`, CEO, 13/11/2026. **Estado desta entrega:** preparada e fotografada localmente; aprovação, publicação, exposição a clientes, validação e pagamento não são afirmados por este documento.


**FONTE OFICIAL RECONFERIDA em 13/11/2026 pela sessão principal:** Higgsfield Marketing Studio descreve entrada por template, foto do produto e custo no botão antes da confirmação ([ajuda oficial](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-marketing-studio-to-create-video-ads)). HeyGen apresenta exemplos por categoria e reutilização do prompt ([página oficial](https://www.heygen.com/tool/ai-video-generator)). InVideo documenta consulta dos créditos antes da criação ([ajuda oficial](https://help.invideo.io/credits-and-plans/where-can-i-see-the-credits-calculated-for-my-video-media-before-creating-it)). São práticas documentadas, não evidência de conversão. Decisão para Kineo: adaptar exemplo com ação clara e confirmação do custo; testar ordem com coorte externa.

**ATUALIZAÇÃO DO ESCOPO F (quadro04:12):** a retirada de Clip prevalece sobre o rascunho anterior de unificação. C agora usa “Explore templates” para os quatro swaps ainda não aprovados. Não oferecer criar esse resultado exato. O candidato de retirada fica separado, até preservar o resgate da oferta e os trabalhos em andamento.

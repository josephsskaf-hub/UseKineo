# Editores antes do cadastro · inventário de 26/11

Base de leitura `2a5525920`. Branch de autoria `codex/dialogo-um-toque-2611`.

| Tela | FATO CONFIRMADO no código da base | Passagem a proteger |
|---|---|---|
| Film | `app/create/[tab]/page.tsx:68` aplica a porta de conta antes de StudioNaMoldura. StudioSimples controla ideia, exemplo, idioma, duração, formato, texto literal, motor e voz. A linha de créditos recebe dados de /api/credits. `lib/create/filmNaMoldura.ts:27` calcula o custo e omite números quando o roteiro pode alterar a duração. | Cadastro no Generate, retorno ao editor com as escolhas originais e revalidação da conta. Somente um novo clique inicia o pedido. |
| Cartoon | `components/kidsCartoon/KidsCartoonTemplate.tsx:147` monta personagem, ideia, exemplo, idioma, duração e legendas. O custo usa creditCostForDuration. A porta /create/cartoon hoje usa um passo intermediário e /kids-cartoon libera o editor visitante somente pela origem do cartão. | Abrir o editor servido ao visitante no endereço novo, recuperar também legendas. |
| Ads | `app/(dashboard)/ads/v2/AdsV2Workspace.tsx:76` limita a entrada visitante aos cartões. AdsV2Escolha recebe o texto, link e opções. A extração do link pede cadastro antes da ação principal. Amostra e acesso a pedidos anteriores dependem do servidor. | Exibir o formulário antes da conta, guardar os campos no Generate e preservar a elegibilidade já calculada. |
| Recreate | `app/recreate/RecreateFlowPage.tsx:53` calcula a tarifa por molde. RecreateClient guarda arquivos e pedido antes de abrir o cadastro. A tela de modelos mais nova fica atrás de uma condição que exige usuário na linha 60. | Mesma bancada nova com catálogo público e tarifa estimada. Revalidar saldo e disponibilidade após autenticar. |
| Clip | `app/create/[tab]/page.tsx:39` devolve o visitante a /clips. A conta liberada chega à bancada conjunta de modelos. Deep links antigos de efeitos têm mapeamento próprio. | Mesma bancada pública para os modelos liberados, mantendo seleções de efeito e as restrições de catálogo. |

Autoria desta frente cobre portas dos editores, componentes de criação, rascunhos e provas. A coordenação cuida dos links de navegação, conteúdo e SEO externos aos editores. Preço, concessão de crédito e débito permanecem nas réguas existentes. O inventário descreve leitura do código, com o percurso no navegador a verificar na candidata.

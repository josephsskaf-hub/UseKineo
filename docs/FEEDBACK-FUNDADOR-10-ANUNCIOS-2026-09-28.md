# Feedback do fundador sobre os 10 anúncios (28/09/2026)

Os vídeos são os 10 anúncios Kineo 1 das empresas (docs/COWORK-10-ANUNCIOS-2026-09-27.md). O laudo técnico está em docs/DEFEITOS-KINEO1-10-ANUNCIOS-2026-09-28.md. Aqui fica o olhar do dono, vídeo a vídeo, e o que cada nota vira.

## 1 · eCredit.ng — nota 4 ("muito ruim")

- **A menina que aparece é um erro antigo.** Achado no código: é o clipe de reserva `samples/cld-sample-video.mp4` da conta de demonstração do Cloudinary (lib/stockLibrary.ts), marcado com as tags business, money, technology, city e luxury. Quando a busca de estoque falha numa cena de negócio ou tecnologia sem clipe anterior para reaproveitar (a 1ª cena), entra essa menina. O CLAUDE.md já prometia "sem menina aleatória" desde a v2.5. Não dá para contar quantos filmes de clientes ela atingiu: justamente esses renders têm o checkpoint de resgate recusado (o host do Cloudinary não estava na lista), então não ficam gravados. O conserto da lista (em andamento) passa a deixá-los visíveis.
- **A primeira cena (homem mexendo num computador antigo) não vende.** "Não é uma cena que eu compraria um chip de internet."
- **Direção criativa que falta:** para um chip de dados, mostrar o USO e a EMOÇÃO — alguém viajando, comprando o chip, falando com quem ama do outro lado do mundo. Hoje a cena ilustra as palavras literais da narração (computador, celular), não o benefício. Isso é regra de roteiro visual do Kineo 1 (plano de cena), não de estoque.
- **O melhor é o texto:** a narração fala tudo certo.
- **Legenda:** um pouco descasada, mas é a coisa que menos preocupa: "a empresa que vai fazer um vídeo provavelmente não vai fazer com legenda — o Ads é um produto que não vai com legenda, eu acho." Candidato a decisão: Studio Ads nascer SEM legenda por padrão (a opção já existe; hoje o padrão é com legenda). Confirmar com o fundador no fim do feedback.

## 2 · ADMITIY — "muito ruim também"

- **Primeira cena = planta de indústria.** Pelo registro do render, a cena 1 é um clipe gerado por IA (Seedance) a partir da frase "Every real company starts with a problem someone refuses to ignore" — a IA ilustrou a palavra "company" com uma fábrica. Mesmo padrão do vídeo 1: ilustra a palavra, não a ideia.
- **Cenas genéricas "da base do Kineo, compradas há muito tempo"**, como o menino mexendo no livro: são clipes de estoque do Pixabay que o ranking aceitou por tag.
- **A melhor cena do vídeo: três pessoas mexendo numa holografia.** Pelo registro, também é clipe gerado por IA (cena 3, "build the answer themselves… late nights, first versions"). Ou seja: o clipe de IA fez a pior e a melhor cena — funciona quando a frase descreve uma AÇÃO, falha quando descreve uma PALAVRA-CONCEITO.
- **"Não tenho certeza do que essa empresa faz."** Isto é defeito do ROTEIRO, não do motor: o texto que a ADMITIY deixou foi cortado em ~500 caracteres e o roteiro que escrevemos virou "história do fundador" sem dizer o que o produto faz nem para quem. Regra para roteiro de anúncio (Studio Ads e os nossos): nos primeiros 5 segundos, dizer o que é e para quem.
- **Legenda:** de novo descasada e com a marca errada (ADMITI) — já em conserto.

## 3 · Restaurante em Amã — nota 2 ("é impossível alguém querer comprar um negócio desse")

- **Veredito do fundador sobre o caminho:** "acho que a gente está indo para o caminho totalmente errado." Um vídeo de IA bom hoje, para restaurante, mostra a COMIDA, as pessoas felizes em volta da mesa comendo, o prato, o restaurante bonito. Não faz sentido mostrar a família no carro indo para o restaurante (o roteiro que escrevemos era a família dirigindo pela rua dos restaurantes — erro de roteiro nosso, além da fachada do concorrente).
- **O que ele faria:** olhar os melhores vídeos de anúncio de IA na internet, principalmente no Higgsfield ("lá eles realmente fazem vídeos de ads bons; dá para ver a qualidade"), para aprender e fazer melhor ou igual. Vale para TODOS os anúncios.
- **Consequência (decidida pelo Claude, 28/09):** não refazer os anúncios segurados no molde atual (Kineo 1 = banco de imagens + narração). Abrir um estudo do Higgsfield e dos melhores anúncios de IA, e voltar com uma receita nova de anúncio, provada num protótipo do próprio restaurante de Amã.

## 4 · SmartTender AI — nota 1 ("sem palavras")

- "Tender" virou CARNE: o banco de imagens casou a palavra com carne grelhada (confirmado no laudo técnico: a tag 'tender' do Pixabay). A mensagem do produto ele entendeu (plataforma de documentos/licitação), mas o vídeo "não dá para usar".
- **DECISÃO DO FUNDADOR (28/09):** parou de assistir os vídeos 5 a 10 — "já tomei minha decisão". O Kineo 1 "foi desenvolvido para fazer vídeos mais baratos; está zero pronto para ads; não raciocina bem; pega coisas de banco de dados tudo errado". **Refazer toda a questão dos motores do anúncio.** Pesquisar na internet que motor as outras empresas usam para anúncio e trazer para mudar agora.
- **Cobrança justa ao Claude:** "você podia ter feito isso sem me perguntar" — descobrir o motor dos concorrentes era trabalho meu antes de montar o produto. Virou memória permanente.
- **Em curso:** estudo do Higgsfield + formato dos melhores anúncios (wf_ea6ee70f-65c) e pesquisa ferramenta → motor dos concorrentes (wf_e7255aab-15c). Os anúncios segurados NÃO serão refeitos no Kineo 1.

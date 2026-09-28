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

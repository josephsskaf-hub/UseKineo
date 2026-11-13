# Plano da Home: "tela pronta amanhã" (sexta 13/11/2026)

Escrito pela CEO em 12/11/2026 ~23:20, a pedido do dono. Ler junto: docs/AMANHA-2026-11-13.md e docs/home-1311/DOSSIE-HOME-LIDERES-1311.md.

## 1. O pedido, nas palavras dele (12/11, 23:02 a 23:20)
- "Eu quero remodelar a homepage. Os cards estão no tamanho ideal, só que eu quero vídeos clips melhores. Quero novidades. 10 clips novos na tela. Quero que você me mostre antes de postar, quero prints. 5 presets e 5 vídeos normais."
- "Quero entender como os líderes como a Higgsfield põem… quantos % de recreate, quantos % de filmes, quantos % de ads. Quero fazer a melhor forma possível… colocar mais ou menos a porcentagem que ele faz, só que com coisas novas."
- "Falha muito grave, não tem o Recreate no menu inicial. Se você quiser entrar no Recreate e olhar tudo que você pode recriar, não tem."
- "Eu queria a minha tela pronta amanhã… do jeito que tá, tá ruim: tá sem o Recreate na tela… as [imagens] que estão, às vezes, são inúteis para a pessoa. É um mercado que a pessoa tem que se vislumbrar quando ela olha alguma coisa. Então eu quero as melhores coisas possíveis."
- Sobre as 10 propostas do dossiê: "são boas".
- Enquadramento: "o GPT é muito bom em fazer isso".

## 2. A régua (escrita antes de gastar)
1. Cada cartão responde em 1 segundo: "isso podia ser EU, o MEU produto, o MEU canal, o MEU filho ou bicho". Paisagem bonita sem gente nem produto não passa (é o defeito da fileira de hoje: onda, águia, rua molhada, arraia, montanha, cavalo).
2. Recreate aparece no menu do topo e na PRIMEIRA tela.
3. Selo honesto: só entra o que o cliente consegue fazer hoje pelo site, com o resultado que o cartão mostra. Preset de Recreate só com teste de troca aprovado. Nada de pessoa falando com a própria boca (motor esperando a fal). Nada de famoso, marca ou clube.
4. Regras de tela: sem nome de motor e sem preço no cartão; nenhum texto menor que 12 px; não tirar texto que o ChatGPT cita; janela 5:6; o primeiro quadro é o quadro mais forte; cartão escuro é defeito.
5. Número em cartão (views, "recriado N vezes") só se for número real nosso.
6. "Pronto" = print da página real, deslogado, logado e no celular, aprovado por ele.

## 3. O que a Higgsfield faz (medido em 12/11, janela de 1920 px)
- Cartões de vídeo da página (96): recreate 41% · filme 46% · anúncio 14%. Primeira tela: ferramentas e promoção, nenhum filme.
- Recreates vêm ANTES dos filmes, em duas seções, com views, curtidas e "Recreates N" em cada cartão.
- Topo: "CLAUDE ✺ FABLE 5.2 WITH HIGGSFIELD MCP". No nosso site não há nome de modelo.
- Nós: primeira tela = 4 cartões de produto + 6 clipes de filme, nenhum recreate. Corpo (95): imagem parada 37% · recreate 23% · clipes 18% · filme 16% · anúncio 6% · cartoon 0%.

## 4. Os clipes novos: 12 quadros para ele escolher 10
As 10 propostas do dossiê (linhas P1 a P5 e V1 a V5 da tabela, com a composição do primeiro quadro) + 2 alternativas minhas, porque V1 e V5 são paisagem sem gente (o tipo que ele chamou de inútil):
- ALT1 "The letter from the front": soldado americano dos anos 1940 escreve uma carta à luz de lampião numa barraca; plano médio, rosto visível. Leva a Filmes. É a linha que funcionou no Instagram.
- ALT2 "Your burger, slow motion": hambúrguer montado em câmera lenta num balcão de lanchonete, mão colocando o pão; plano fechado. Leva a Product Ads. O dono de negócio local se vê.
Cuidados: P1 ("Talking to camera") só serve como clipe MUDO de gesto (não prometer fala). Presets com 2 pessoas (P2, P4) entram com 1 troca só; a troca de 2 pessoas falhou em 12/11.
Como gerar os quadros: imagem parada 4:5, assunto dentro da janela central 5:6, gente NOSSA inventada, sem texto, sem marca. Cerca de US$ 0,15 cada (12 = US$ 1,80).

## 5. Ordem do dia
1. (Noite de 12/11 ou 1ª coisa) Recreate no menu do topo e nos pares + página com todos os modelos aprovados. Em obra na branch codex/menu-recreate-1211.
2. Dado antes de gosto: cliques por cartão da home nos últimos 14 dias (events) → quais cartões saem.
3. 12 quadros parados → UMA imagem numerada para ele, com A, B e C de mistura e o custo dos vídeos.
4. Com o sim: vídeos de 5 a 8 s dos aprovados; para preset, base dentro da régua de troca (de frente, cintura para cima, rosto ≥ 18% da largura) + teste de troca de 5 s. Preset que não trocar não entra. Dizer o total em dólar ANTES; total acima de US$ 5 pede o sim dele.
5. Enquadramento: bloco de prompt para o GPT criticar os 12 quadros na janela 5:6 (ele cola e me traz), ou a sessão do Codex faz o passe de enquadramento.
6. Código: trocar a fileira, pôr uma faixa de Recreate na primeira tela, linha do conector com o modelo atual (verdadeira: o conector funciona no Claude Fable 5.2), conferir os cartões escuros do fim da página. Publicações pequenas; a home é área do GPT/Codex, anotar no quadro antes.
7. Prints da página real (antes × depois) para ele. No dia seguinte: cliques por cartão e cadastros vindos da home contra a base.

## 6. O que não dá para prometer
- Preset que falhar no teste de troca fica de fora, mesmo que a imagem seja boa.
- Pessoa falando com a própria boca: só quando a fal liberar o motor.
- 41% de recreate como a Higgsfield: só com presets que passam; hoje a troca ainda falha fora da régua.

## 7. Limite de uso
88% da semana às 23:15 de 12/11; zera segunda 16/11 às 07:00. O teto de 90% é regra dele (reserva do fim de semana). Home inteira na sexta deve gastar de 4 a 6 pontos. Decisão dele: A) liberar a reserva só na sexta (teto 95%); B) ligar o uso extra pago; C) manter 90% e fazer a home em partes até segunda.

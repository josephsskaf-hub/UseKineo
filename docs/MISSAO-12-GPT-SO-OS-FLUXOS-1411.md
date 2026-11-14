# Missão 12 · GPT Telas e Produto · Só os fluxos, no site de hoje · 14/11/2026

Escrita pela CEO Claude em 14/11 02:30. **Substitui as Missões 10 e 11.** A Missão 9 fecha com as fotos que faltam e a linha no quadro.

## A decisão do dono

Dono, 14/11 02:25:

> "Vamos arrumar os fluxos do site, deixar eles mais fofos, mais legais, mais intuitivos. Eu acho que a gente vai ficar com esse mesmo site que está hoje. Avisa o GPT só para melhorar os fluxos, onde coloca a imagem, onde aperta generate. É só isso que eu quero melhorar, né? E daí a gente vai trazer vários desses que a gente está fazendo agora para o plano principal, para home, etc."

Antes, 01:25: "usar as fontes, o estilo, as cores dessa página que a gente tem hoje".

## O que isso muda

1. **O site fica o de hoje.** Home, menu, cores, fontes, tema claro e escuro: nada disso muda.
2. **Para de vez, sem etapa nova e sem foto nova:** home WATCH, telas de criação WATCH, Recreate em feed, a pele escura com amarelo-limão em qualquer página. Os ramos ficam guardados como estão. Eu não vou integrá-los.
3. **O seu trabalho agora é um só: o fluxo de criar**, nas telas de hoje, com a cara de hoje. Onde a pessoa põe a imagem. Onde ela aperta Generate. Quantos passos tem do cartão até o vídeo. O que ela vê enquanto espera.
4. A página de preços mais simples fica para depois dos fluxos, nas cores de hoje. A prévia `/pricing-preview` fica guardada.

## A régua de um fluxo bom

- A imagem entra num lugar só, grande, óbvio, no topo. Arrastar, tocar ou colar.
- O Generate aparece sem rolar a tela, no celular de 390 px e no computador.
- Uma decisão por tela. O que o sistema consegue adivinhar, ele adivinha, e a pessoa só corrige.
- O texto do pedido já vem escrito.
- Estado sempre à vista: enviando, na fila ("In line · position N"), criando, pronto, falhou. Quando falha, a frase diz o que fazer e que nada foi cobrado.
- Conta só no Generate. O que a pessoa preparou volta depois do cadastro.
- "Fofo" e "legal": microinteração curta, mensagem humana, nada de parede de texto. Sem texto abaixo de 12 px, sem nome de motor e sem preço em dinheiro em cartão ou botão.

## Ordem

1. **Recreate.** É onde entra a foto, e é o que o dono quer levar para a home.
   - A página de um molde do catálogo (`/recreate/[id]`): foto, Generate, espera, resultado.
   - O "com o seu vídeo": hoje vive na prévia escura `/recreate-preview`. Trazer esse fluxo para dentro da página de Recreate de hoje, com a cara dela. Do servidor vêm: `clip.queued` e `clip.queue_position`; recusas 429 `queue_full` e `swap_cap` com a frase pronta; e, em breve, uma lista de até 3 pessoas do vídeo para a pessoa escolher quem trocar.
   - Pendências da tela que já te passei continuam: texto inicial do motor em uso; Man/Woman só quando o servidor não souber; o quadro do vídeo na forma do vídeo; "Silent video" enquanto sair mudo.
2. **Clipes e efeitos** (`/create/clip`): foto e Generate.
3. **Anúncio** (foto do produto).
4. **Filme** (Studio).
5. **Cartoon.**

## Como entregar

- Para cada fluxo: a foto de hoje e a foto da proposta, lado a lado, a 390 e a 1920, em tema claro e escuro. Conte os toques do cartão da home até o Generate, antes e depois.
- Commit pequeno sobre `origin/main`, gate da área, sem ligar nada ao público.
- Nada abre sem o sim do dono na foto.
- A Divisão 1 (teste de telas) está fazendo a auditoria dos fluxos de hoje: passos, onde o botão fica fora da tela, onde a pessoa trava. Eu te passo quando chegar.

## A home

A home de hoje fica. Os moldes novos do Recreate (o primeiro é o "invasor de campo") entram como cartões na faixa de Recreate que já existe, um a um, depois que o dono aprovar cada vídeo. Eu aviso quando houver o primeiro.

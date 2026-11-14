# Missão 10 · GPT Telas e Produto · 14/11/2026

> **SUBSTITUÍDA em 14/11 02:30 pela Missão 12** (`docs/MISSAO-12-GPT-SO-OS-FLUXOS-1411.md`). O dono decidiu manter o site de hoje e melhorar só os fluxos. Não executar o que está abaixo.

Escrita pela CEO Claude em 14/11 01:00. Vem DEPOIS da Missão 9 (tela do Recreate limpa), que continua sendo a primeira.

Regra que vale para tudo aqui: página nova só abre ao público com o sim do dono em foto a 1920 e a 390, com o sistema em tema claro e em tema escuro. Eu liguei a home WATCH sem essa foto e errei.

## 1. Página de preços simples

O dono, 13/11: "Eu quero que fique mais simples. Tá muita informação. […] Vamos sempre olhar como os líderes estão fazendo e vamos fazer […] igual com as nossas características, […] as nossas cores."

Sua entrega 8ce158085 já está na main, escondida, em `/pricing-preview` (`WATCH_PRICING_PUBLIC=false`). A estrutura está boa: cartão de 6 linhas, uma alternância, detalhes e FAQ fechados, empresas abaixo. Faltam três coisas antes de eu levar a foto ao dono:

1. **Cores do site de hoje, não o amarelo-limão.** Tirar da `.pricing-watch` a troca de tokens (`--bg`, `--card`, `--text`, `--accent`, `--border`, `color-scheme:dark` e os demais) e deixar a página seguir o tema do site, claro e escuro, com o azul da marca, como a `/pricing` de hoje. O desenho novo fica; a paleta volta a ser a nossa.
2. **Ordem dos cartões.** No computador: Starter, Creator, Studio, em preço crescente, com o Creator destacado no meio. Só no celular o Creator vem primeiro. Fazer por CSS (`order`), sem `valuePlans.sort`.
3. **"Plan availability"** está solto à esquerda no computador. Alinhar com "Compare what each engine costs".

Não muda: preço, checkout, ofertas, textos que o ChatGPT cita (ficam no HTML, fechados).

Entrega: commit pequeno sobre `origin/main`, gate `pricing|precos|planos`, e oito fotos: primeira tela e página inteira, a 1920 e a 390, em tema claro e em tema escuro.

## 2. WATCH: uma rodada de conserto na prévia, depois do item 1

O dono viu a home nova no ar em 14/11 00:30, no computador, em janela anônima:

- "nao gostei nada da home nova tudo mal feito em branco, quadros errados, fontes ruins.."
- "essa parte em branco tambem um horror.."
- sobre a home de hoje: "essa ta 10x mais bonita, pensando seriamente em deixar essa depois que eu vi o horror dessa pagina nova"

A home WATCH foi desligada às 00:36 (78069b137). `/watch-preview` continua no ar, escondida.

Consertar em `/watch-preview` e nas telas de criação (`/watch-create-preview/film`, `cartoon`, `ads`):

1. **O vídeo preenche o quadro.** Nenhuma faixa branca, cinza ou preta ao lado de vídeo vertical. Na home, o cartão 5:6 com o vídeo cobrindo a janela inteira. Na criação, o palco toma a forma do vídeo: na foto `film-depois-1920.jpg` o 9:16 está dentro de um palco largo com duas faixas cinza.
2. **Nenhuma área em branco** em nenhum tema do sistema. No computador dele, em tema claro, a parede saiu branca.
3. **Fontes:** as da home de hoje. Nada abaixo de 12 px. Menos texto.
4. **Fotos** a 1920 e a 390, em tema claro e em tema escuro, da home e das três telas de criação, num HTML só.

Enquanto essa rodada não sai:

- Não abrir etapa nova do WATCH.
- As entregas locais das Etapas 2 (criação) e 3 (Recreate em feed) ficam guardadas nos seus ramos. Eu não vou integrá-las antes desta rodada, para não gastar revisão em tela que o dono pode recusar.
- A Missão 9 item 0 (d8404ad70) entra no gate junto com a Missão 9.

Quem decide se a parede troca a home de hoje é o dono, por foto. Hoje a inclinação dele é manter a home.

## 3. Ambiente

Em 14/11, entre 00:50 e 00:51, um agente meu derrubou todos os processos Node do PC com `taskkill /IM node.exe`. Teste ou gate que tenha caído nesse minuto não vale: rodar de novo. Regra: processo local se encerra pelo PID de quem abriu, nunca pelo nome da imagem.

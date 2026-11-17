# Ensaio do leitor real nas frases seguintes da narração — 17/11

## Resultado: ENSAIO BLOQUEADO: CHAVE

- O leitor semântico real (gpt-4o-mini, `lerSujeitoDoPedido`) não foi chamado nenhuma vez. Custo real: US$ 0,00.
- Motivo: `OPENAI_API_KEY` não existe no ambiente desta sessão (processo, usuário e máquina conferidos, só presença). A chave só está no `.env.local`, que a sessão não pode ler.
- Por isso NÃO há número medido de "em quantos o sujeito muda" nem de "quantos são laterais". Nada abaixo é resultado do modelo.

## O que foi levantado sem o modelo (Supabase, só leitura)

Filmes dos últimos 14 dias cujo `cinematic_required_subject` terminou sem sujeito pela fala (`motivo_do_pedido = fala_de_abertura`, `sujeito` nulo): 128 eventos, 72 com a narração gravada no claim (o resto é dry-run ou reserva sem claim).

| Por que a 1ª frase não deu sujeito | Filmes |
|---|---|
| `uso_none` (a frase não tem sujeito concreto) | 78 |
| `uso_name_or_title` | 22 |
| `visual_com_maiuscula` | 17 |
| `pessoa_real` | 7 |
| `sem_nucleo` | 2 |
| `uso_figurative` | 1 |
| `leitura_falhou:prazo` | 1 |

Em 50 dos 128 a 1ª frase TINHA sujeito e ele foi descartado por uma trava (nome, título, pessoa real, maiúscula). Com a regra de hoje, esses 50 também passam a ler as frases seguintes.

## As frases que o leitor receberia (função real `frasesSeguintesDaFala`, depois da volta 2)

| Filme | 1ª frase (antes: sem sujeito) | Frases seguintes que seriam lidas | Leitura pelo meu olho, NÃO medida |
|---|---|---|---|
| 44d02f20 (avião de 1950) | "A 70-year-old mystery..." | "In 1950, a plane vanished." · "It left no trace, not a signal." | avião: certo |
| 365ef281 (lava-rápido) | "A busy professional, a dirty Range Rover, and no time." (`visual_com_maiuscula`) | "Alarm buzzes." · "Calendar reads 10:00 - Client meeting." | alarme ou agenda: lateral (o filme é sobre o carro sujo) |
| a3b48be4 (onda de Lituya Bay) | "Imagine a wave..." | "It happened in Lituya Bay, Alaska, on July 9, 1958." · "A massive 8.3 magnitude earthquake triggered a colossal landslide, hurling about 90 million tons of rock into the bay." | terremoto ou deslizamento: lateral (o sujeito é a onda) |
| 58f63487 (baleias de Galápagos) | "Where did the Galápagos blue whales go?" (`visual_com_maiuscula`) | "For nine months, scientists searched for the largest animal on Earth." · "They carried satellite tags to track them." | cientistas ou "satellite tags": lateral (o sujeito é a baleia) |
| 1e4bac3d (pedras do Death Valley) | "Rocks in Death Valley move by themselves." (`visual_com_maiuscula`) | "On an empty, dry lakebed called Racetrack Playa, heavy stones sit at the end of long, curving trails in the cracked mud." · "In December of twenty thirteen, time-lapse cameras finally caught them moving." | pedras: certo |

Pelo olho, 3 dos 5 exemplos dariam sujeito lateral. Dois deles (365ef281 e 58f63487) só entram porque a 1ª frase teve o sujeito descartado por trava, não por falta de sujeito.

## O que já limita o estrago (volta 2, no código)

- O sujeito de frase seguinte entra só na cena cuja fala o cita; não vira o sujeito do filme na camada da ficha (ajuste a).
- A 1ª leitura que falha encerra o laço (ajuste b).

## Proposta para decidir sem o ensaio (NÃO implementada)

Ler as frases seguintes só quando a 1ª leitura respondeu `uso_none` (o caso provado do avião). Tira da regra, por construção, os 50 filmes em que a 1ª frase tinha sujeito e foi barrada por trava, entre eles o lava-rápido e as baleias. A onda de Lituya Bay continuaria entrando.

## Para rodar o ensaio

Falta a chave no ambiente da sessão (`OPENAI_API_KEY`), posta por quem pode. São cerca de 144 leituras curtas (72 filmes × 2 frases); pelo preço de tabela do gpt-4o-mini fica bem abaixo do teto de US$ 1, valor que não conferi nesta sessão.

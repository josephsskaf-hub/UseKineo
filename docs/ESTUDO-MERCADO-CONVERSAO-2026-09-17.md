# Estudo de mercado — como o mercado de vídeo com IA cobra, e quando o cliente paga (17/09/2026)

Pedido do fundador (17/09, manhã): "Por enquanto não faz nada, precisamos pensar mais. A grande maioria das pessoas paga antes, paga pela beleza do site, acho. Você precisa estudar o mercado e ver como realmente ele é daqui pra frente. Preciso de mais informações pra decidir."

Nada foi construído a partir deste documento. É informação para decisão.

## 1. O que o NOSSO dado diz (13 pagantes desde julho, contas internas fora)

| Filmes feitos antes de pagar | Pagantes |
|---|---|
| 0 | 5 |
| 1 | 6 |
| 2 | 1 |
| 5 | 1 |

- 10 de 13 pagaram em até 48 h do cadastro; 6 em menos de 2 h.
- Origem: ChatGPT 4 · TAAFT 4 · home 2 · outros 3.
- O que aconteceu logo antes do pagamento (últimos eventos): 5 vieram da página de preços depois de esbarrar em "sem crédito" (chip de top-up, modal de upgrade, modal de fim de trial); 3 compraram no **exit intent / pack** logo após o 1º filme; 2 pagaram depois de uma **falha** de geração; 1 nunca fez filme e pagou direto do link (emilio); 1 cancelou o checkout, voltou pelo banner de retomada e pagou.
- Leitura honesta da hipótese "paga pela beleza do site": vale para 5 de 13 (0 filmes). Para os outros 8, a compra veio **depois de ver o produto funcionar** e **esbarrar numa parede** (crédito, marca d'água, falha) na mesma sessão. Nos dois casos a janela é a primeira sessão: ninguém pagou "no 3º filme".
- Nossa conversão: 728 cadastros → 5 pagantes em 30 d = 0,7% (1,2% de quem fez filme). MRR ≈ US$ 209.

## 2. Como o mercado cobra (setembro de 2026)

| Ferramenta | Grátis | Cartão | Marca d'água | Entrada paga | Onde pede o upgrade |
|---|---|---|---|---|---|
| InVideo AI | 2 min de vídeo + 1 crédito + 4 exports/semana, **renova toda segunda** | não | sim (5 s no canto) | US$ 17/mês anual (Plus) … US$ 900 (Elite) | ao acabar o crédito → página de preços |
| Fliki | 3 créditos/mês | não | sim | US$ 21-28/mês | no export limpo |
| Pictory | 14 dias, 3 projetos | não | sim | ~US$ 25-39/mês | fim do trial / export |
| HeyGen | 3 vídeos/mês, ≤1 min | não | sim | US$ 29/mês | export limpo / 1080p |
| Higgsfield | 10 créditos **por dia**, modelos básicos | não | — | US$ 9-19/mês | modelos premium / resolução |
| Kling (app) | 66 créditos **por dia** (2-6 vídeos) | não | sim | US$ 6,99/mês | modelo/resolução |
| Pika | 80 créditos/mês | não | sim | US$ 8/mês | crédito |
| Runway | trial | não | sim | US$ 12-15/mês | crédito/modelo |
| OpusClip / Captions / VEED | cota + marca | não | sim | US$ 12-25/mês | export limpo |
| **Kineo** | 10 créditos **uma vez** (2 Kineo 1) | não | sim (grátis) | **US$ 9,90/mês** | crédito acabou → modal → /pricing |

Padrão do mercado: **freemium sem cartão + marca d'água + cota que RENOVA (diária ou semanal) + upgrade no momento do export limpo ou do crédito zerado**. Entrada paga entre US$ 9 e 29; a maioria em US$ 17-29. Ninguém do mercado pede cartão antes do primeiro vídeo.

Duas diferenças nossas: (a) a cota grátis não renova — quem gastou os 10 créditos não tem motivo para voltar (a casa já mediu: 170 trials encerrados, 6 voltaram); (b) somos o preço mais baixo da tabela junto com Kling/Pika, que vendem clipe cru, não filme pronto.

## 3. Benchmarks de conversão (SaaS/IA, 2025-26)

- Freemium: 2,6% a 5% dos cadastrados viram pagantes (bom = 3-5%, ótimo = 8-12%). Estamos em 0,7%.
- Trial sem cartão: 8,9% a 18%. Trial com cartão (opt-out): 31% a 49%, com muito menos cadastros (a Versão B de 08/09 tentou a porta de US$ 1 e o fundador a matou em 09/09 por queda de entrada).
- **A decisão acontece nas primeiras 72 h**, não no fim do trial. Cada 10 min a mais até o primeiro valor custa ~8% de conversão. Isso bate com o nosso dado (10 de 13 em 48 h).
- Trial de 7 dias converte melhor que trial longo; gatilhos por comportamento (parede, export) vencem gatilhos por calendário em 67%.

## 4. Para onde o mercado vai (2026)

- Sora (app do consumidor) fechou em 26/04/2026: queimava US$ 15 M/dia e faturou US$ 2,1 M na vida. Fim da era "hype"; sobrevive quem cobra e tem margem.
- Veo 3.1 lidera uso; Kling 3.0 a US$ 0,07/s derrubou o preço do clipe (−65% vs Sora). Custo de um minuto acabado caiu ~91% em 2 anos.
- Áudio nativo e lip-sync viraram padrão; a fronteira passou de "um clipe" para **sequências multi-cena controladas**. O valor migra do clipe cru (commodity, preço caindo) para o **filme pronto** (roteiro + voz + edição + série), que é o nosso produto.
- Mercado de geradores: US$ 0,85-0,95 bi em 2026; ferramentas de vídeo com IA no total, US$ 4,2 bi (2025) → 12,8 bi (2027).

## 5. O que isso diz sobre a decisão do fundador (opções, não código)

1. **Manter e medir** a porta do 3º filme que já está no ar (custo zero). Em 7 dias sabemos se ela vende.
2. **Cota grátis que renova** (ex.: 1 Kineo 1 por semana, com marca), como InVideo/Higgsfield/Kling: traz a pessoa de volta sem dar crédito de presente; é o padrão do mercado e ataca o nosso "uma sessão por pessoa". Custo por filme grátis ≈ US$ 0,10-0,15.
3. **Vender a parede da primeira sessão** melhor: 8 de 13 pagaram ali. O modal genérico e a página de preços são o que eles viram; a página de preços do mercado vende "export limpo em 1080p" e "todos os modelos", não "créditos".
4. **Preço**: o mercado entra em US$ 17-29; nós em US$ 9,90. Há espaço, mas o preço está congelado até 09/10 por decisão do fundador. Não mexer agora; anotar para a revisão.
5. **Episódio 2 automático**: não encontrei precedente no mercado (ninguém produz o 2º vídeo sem pedido). É aposta nossa, não prática do setor; se for feita, é para trazer a pessoa de volta (item 2 faz isso mais barato e do jeito que o mercado já validou).

## Fontes
- InVideo: https://help.invideo.io/en/articles/9380226-can-i-use-invideo-ai-for-free · https://flowith.io/blog/invideo-pricing-2026-free-vs-plus-vs-max/ · https://creatify.ai/blog/invideo-pricing-(2026)-plans-credits-and-what-you-ll-actually-pay
- Fliki/Pictory: https://fliki.ai/pricing · https://bityclips.com/blog/fliki-pricing-2026 · https://marcandrews.com/pictory-free-trial-2026-what-you-get-before-paying/
- Comparativos de preço: https://frameloop.ai/blog/ai-video-generator-pricing-compared · https://posteverywhere.ai/blog/20-best-ai-short-form-video-tools · https://www.heygen.com/blog/best-ai-video-generator-faceless-youtube
- Higgsfield/Kling/Pika/Runway: https://techsifted.com/roundups/higgsfield-ai-pricing-2026/ · https://whichoneisreal.com/compare/best-free-ai-video/ · https://higgsfield.ai/blog/higgsfield-vs-runway-2026
- Benchmarks de conversão: https://www.shno.co/marketing-statistics/free-trial-conversion-statistics · https://firstpagesage.com/seo-blog/saas-freemium-conversion-rates/ · https://userpilot.com/blog/saas-average-conversion-rate/
- Mercado 2026: https://www.digitalapplied.com/blog/ai-video-market-after-sora-runway-kling-veo-2026 · https://sunra.ai/blog/ai-video-generation-2026-sora-shutdown-veo-free-kling-viral · https://toolixlab.com/blog/ai-video-generation-statistics-2026 · https://seedance2-video.com/state-of-ai-video-generation-2026

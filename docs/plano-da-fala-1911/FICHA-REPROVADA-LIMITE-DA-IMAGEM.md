# Ficha reprovada: o que sai do motor e o que não sai · Div. 2 · 19/11

Interruptor `FICHA_REPROVADA_1911` = `'internal'` (só a conta exata do ensaio). Código: `lib/cinematic/fichaReprovada1911.ts`.

## O que o passo faz (v2, 9ª passada do revisor)
- **Juiz reprovou `a_ficha`:** saem da ficha as partes que nós acrescentamos (as âncoras lidas da folha, a origem e a frase das feições "Everyone shown has the natural features of X people."). O juiz lê de novo.
- **Continua reprovada (ou sem veredito, ou erro):** sai do TEXTO de cada plano a ficha inteira. Isso inclui a linha Identity:/Visible:, a cláusula da ficha travada, a ORDEM "The only person in this shot…" (inteira, ou cortada pelo teto de 512) e as feições. A continuidade da referência do personagem fixo (`lib/kling4Trial.ts`) perde o que vem da ficha ("Keep the face and outfit of @Image1." e a roupa lida da canônica); ficam a época e o cenário.
- O corte age só dentro dos trechos da ficha. O trecho citado pelo autor, o "1.80 m" e o "Dr." ficam. Só a junta de cada corte é arrumada.

## O limite: a imagem
**A ficha reprovada sai do texto, não da imagem.** A imagem-chave de cada cena (e a referência do personagem fixo) foi desenhada ANTES, com a ficha. Ela vai ao motor como está.
- Nos 77 envios reais do Kling 4 grátis medidos pelo revisor em 19/11, **63 têm imagem inicial desenhada com a ficha**.
- Portanto não dá para dizer "a ficha reprovada não vai ao motor" quando há imagem-chave. O que vale é "a ficha reprovada não vai no TEXTO".
- O evento `kling4_ficha_reprovada` registra isso. `imagens_com_a_ficha` = quantas imagens-chave aprovadas seguem ao motor; `referencia_com_a_ficha` = se a referência do personagem fixo segue; `ficha_so_saiu_do_texto` = verdadeiro quando sobra alguma das duas. No eco do dry_run, `imagens_com_a_ficha` é `null`, porque o dry_run não gera imagem.

## Proposta para a imagem (não construída)
| | O quê | Custo e atraso | Risco |
|---|---|---|---|
| **A (recomendada)** | Rodar o juiz da ficha ANTES de desenhar as imagens: o passo de antes do render (`fichaAntesDoRender1311`, juiz_plano_ficha_antes) já lê a ficha nesse ponto e hoje só tira a ORDEM. Com `a_ficha` reprovado ali, as cenas longas saem sem âncoras/origem (ou sem ficha) antes da imagem; a imagem nasce coerente com o texto. | nenhum gasto novo (o juiz já roda); 0 s a mais | muda o caminho das imagens: pede ensaio grátis e prova paga própria |
| B | Com `sem_ficha` no envio, tirar a imagem-chave das cenas onde a pessoa aparece (o plano vai só com texto). | nenhum; o filme perde a âncora visual da cena 1 | a cena 1 fica menos parecida com o resto |
| C | Com `sem_ficha`, redesenhar a imagem-chave sem a ficha. | cerca de US$ 0,03 por imagem e ~15 s por cena | gasto e espera em todo filme reprovado |

A recomendada é A: conserta na origem e não gasta. Nada disso entra sem o sim da CEO.

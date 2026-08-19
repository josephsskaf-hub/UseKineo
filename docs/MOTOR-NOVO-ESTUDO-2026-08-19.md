# Motor novo — estudo para decidir hoje (19/08/2026)

**Resposta curta: MiniMax H3, em 768p, a 45 créditos.**
Custa **$3,90** o filme de 65s contra **$10,92** do Kling 3, vem com **áudio
nativo** e aceita **9 imagens de referência** — que é exatamente o remédio para
o problema que a gente penou no Kling.

---

## 1. O que existe hoje, com preço real da fal (conferido linha a linha)

Nosso filme mira 60s+ (regra da casa, TikTok Rewards). Então a conta que importa
é **quanto custa um filme de 65 segundos**, não o preço do clipe solto.

| motor | $/segundo | filme 65s | vs Kling 3 | temos? |
|---|---|---|---|---|
| Seedance 2.0 720p | $0,3034 | **$19,72** | 1,81× | não |
| Kling 3 pro | $0,168 | $10,92 | 1,00× | ✅ |
| Veo 3.1 fast | $0,150 | $9,75 | 0,89× | ✅ |
| **MiniMax H3 2K** | $0,130 | $8,45 | 0,77× | não |
| Wan 2.7 | $0,100 | $6,50 | 0,60× | não |
| **MiniMax H3 768p** | **$0,060** | **$3,90** | **0,36×** | **não** |
| Hailuo 2.3 Fast 768p | $0,032 | $2,08 | 0,19× | não |

**Seedance 2.0 está fora**, e é importante dizer por quê: a $0,30/s um filme
nosso custaria **$19,72**, o que exigiria **220 créditos**. O Studio inteiro tem
180. Ou seja, o melhor motor do mercado hoje simplesmente **não cabe em nenhum
plano nosso** — colocá-lo seria vender um botão que ninguém pode apertar.

---

## 2. O problema que o motor novo resolve (e que a V6 criou)

Com a tabela nova, o Kling 3 a 150 créditos ficou assim:

| plano | créditos | filmes Kling 3 |
|---|---|---|
| Starter | 40 | **0** |
| Creator | 90 | **0** |
| Studio | 180 | 1 |

**O Creator não faz um único filme carro-chefe.** Isso é um buraco de produto
que eu abri hoje ao cortar os grants e que você teria descoberto no primeiro
cliente frustrado. O motor novo é o conserto:

| motor | custo em cr | Starter | Creator | Studio |
|---|---|---|---|---|
| Kling 3 | 150 | 0 | 0 | 1 |
| **MiniMax H3 768p** | **45** | 0 | **2** | **4** |
| Hailuo 2.3 Fast | 25 | **1** | **3** | **7** |

---

## 3. Por que MiniMax H3 e não o mais barato

O Hailuo 2.3 Fast é 3× mais barato ainda, mas o H3 traz **duas capacidades que
valem mais que a diferença de preço** — e as duas atacam exatamente as dores que
a gente teve com o Kling 3:

**a) Referência de até 9 imagens, 3 vídeos e 3 áudios num único contexto.**
Esse é o santo graal do nosso formato. Um filme nosso tem 7-9 cenas, e a
reclamação estrutural do Kling 3 foi **inconsistência entre cenas** — personagem
mudando de rosto, estilo derivando, cena repetida. Com o H3 a gente passa as
mesmas âncoras visuais em TODAS as cenas e a identidade se sustenta. Isso é
literalmente os "60% que são nossos": deixa de ser sorte e vira configuração.

**b) Áudio nativo em estéreo** — trilha, foley e ambiência já casados com a
imagem. Atenção: **isso não substitui a nossa narração** (ver a configuração
abaixo), mas resolve de graça o problema de trilha que você levantou hoje de
manhã.

Some-se: prompt de até 7.000 caracteres (cabe a cena inteira descrita), 5 a 15
segundos por geração (nossas cenas são 8-12s, encaixa), e pesos abertos — o que
reduz risco de o fornecedor sumir ou triplicar preço.

---

## 4. Margem — o número que você pediu

Preço por crédito do Creator na V6: **$0,1667**.

| | H3 768p (45cr) | Kling 3 (150cr) |
|---|---|---|
| receita bruta | $7,50 | $25,00 |
| líquido após Stripe | $7,00 | $24,00 |
| custo fal | $3,90 | $10,92 |
| **margem** | **$3,10 · 44%** | $13,08 · 54% |

A margem percentual do H3 é menor, mas **isso é a conta errada de olhar**. O que
importa é: com 90 créditos o Creator faz **2 filmes H3 e recebe $7,00×2 = $14,00
de receita útil**, contra **zero filme Kling 3**. Margem alta em produto que não
cabe no plano vale zero.

Se quiser 50% de margem, o número é **50 créditos** em vez de 45 — e aí o Creator
faz 1 filme, o que derruba o benefício principal. **Recomendo 45.**

---

## 5. Configuração — os nossos 60%

O ponto mais importante do estudo, e a lição do Kling 3: **o motor novo entra no
MESMO pipeline cinematográfico**, não num caminho paralelo. O Contrato Hollywood
(narração verbatim, piso de 95% da duração, variedade determinística, watermark)
já está em código; um pipeline novo nasceria sem essas quatro proteções e
repetiria os mesmos erros de duração e cena repetida que a gente passou dois dias
consertando.

**Decisões de configuração, com o porquê:**

1. **Áudio do H3 entra MUDO por padrão.** Ele gera diálogo próprio, e o nosso
   contrato C1 diz que a narração é a do usuário, palavra por palavra. Deixar o
   H3 falar por cima seria quebrar o contrato mais importante que temos.
   *Aproveitamento:* usar a faixa dele como **ambiência sob a narração**, em
   volume baixo — ganho real de imersão sem tocar no C1. Fica como segunda
   rodada, não no dia 1.

2. **Referência visual em toda cena.** A primeira cena gera a âncora (ou usa a
   imagem-âncora que o pipeline já produz no caminho SHARP); as cenas seguintes
   recebem essa âncora + o estilo. É a mudança que mata a inconsistência.

3. **768p, não 2K.** Entregamos 9:16 para Shorts; 768 no lado curto é suficiente
   e a diferença de preço é 2,2×. Quem quiser mais nitidez tem o Enhance (Topaz)
   que já existe.

4. **Duração por cena entre 8 e 12s**, dentro da janela nativa de 5-15s do
   modelo — sem apara, sem esticar. O molde que encolhia 51s→44,8s já foi
   consertado; o H3 herda o conserto.

5. **Selo honesto:** o card diz "MiniMax H3" e o vídeo é MiniMax H3. Regra da
   casa, sem exceção.

**Validação antes de abrir para cliente:** um render do Boiling River (o mesmo
roteiro que a gente usa de referência) e aprovar só se: ≥61s, narração fiel,
zero cena repetida ou borrada. É o mesmo critério do Kling 3 — e é ele que evita
o "descobre o erro no cliente" que você quer evitar.

---

## 6. Kineo 1 — o motor de entrada está barato demais

Você tem razão, e os números concordam.

**Hoje:** `fast` custa **1 crédito** para pagante e 0 para grátis. O custo real é
$0,02-0,05 por render. A $0,1667/crédito isso dá **~70% de margem** — a margem
não é o problema.

**O problema é posicionamento.** A 1 crédito, o Starter (40cr) entrega **40
vídeos Kineo 1 por mês**. É muito vídeo bom por $7, e desvaloriza o motor: o
cliente lê "1 crédito" como "o vídeo mais barato", não como "o vídeo mais
rápido". E é o motor mais usado da casa — 138 renders em 7 dias contra 73 do
Seedance.

**Recomendo 2 créditos.** Starter passa a 20 vídeos/mês (ainda muito), margem
sobe de 70% para 85%, e o motor deixa de parecer descartável.

**⚠ A tensão, dita na cara:** hoje já cortamos os grants (Creator 140→90).
Dobrar o custo do motor mais usado no MESMO dia é um segundo aperto sobre a
mesma pessoa. Duas opções:

- **subir agora**, junto com a entrada do H3 — a mensagem fica "motor novo +
  reprecificação", uma conversa só;
- **subir daqui a duas semanas**, depois de ver como a V6 se comporta.

Eu faria **agora**, pelo motivo que você mesmo deu sobre preço: é mais fácil
ajustar enquanto a base é pequena. Mas é decisão sua.

---

## 7. Sobre subir o preço de $7 para $8, $9 depois

Você pediu para eu corrigir se estivesse errado. **Você está certo, com uma
ressalva.**

Certo: dá para subir, e a Stripe protege quem já assinou — assinatura existente
mantém o preço original automaticamente. Quem sobe é só cliente novo. Não existe
o drama de "avisar a base".

A ressalva: **subir preço não é a alavanca que você imagina nessa faixa.** A
diferença de conversão entre $7 e $9 costuma ser pequena; o que decide é se o
produto entrega. O jeito mais seguro de subir não é mexer no número, é **subir o
valor e deixar o número acompanhar** — motor novo, mais filmes por plano, áudio
melhor. Aí $9 não é aumento, é plano diferente.

E não subiria com 6 assinantes: não há amostra para saber se o preço fez
diferença. O gatilho que eu esperaria é **30-50 assinantes com churn baixo**. Aí
o aumento tem o que medir.

---

## Resumo para decidir

| pergunta | resposta |
|---|---|
| Qual motor | **MiniMax H3**, endpoint 768p |
| Quanto custa pra nós | $3,90 o filme de 65s |
| Quanto cobrar | **45 créditos** (44% de margem) |
| O que destrava | Creator passa a fazer 2 filmes carro-chefe (hoje faz 0) |
| Por que esse e não o mais barato | 9 imagens de referência mata a inconsistência entre cenas; áudio nativo de brinde |
| Risco | Precisa entrar no pipeline cinematográfico existente para herdar o Contrato Hollywood |
| Validação | 1 render do Boiling River: ≥61s, narração fiel, zero cena repetida |
| Kineo 1 | subir de 1 → **2 créditos** (decisão sua sobre o timing) |

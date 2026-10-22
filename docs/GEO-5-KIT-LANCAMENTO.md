# GEO-5 — Kit de lançamento: Cartoon e anúncios, em EN e PT

**Fontes consultadas:** 21/10/2026, America/Sao_Paulo. **Estado:** SUGESTÃO — PREPARADO, NÃO PUBLICADO, NÃO ENVIADO. Nenhuma conta, login, render, pagamento ou submissão foi realizada nesta tarefa.

## Como usar sem transformar plano em promessa

**EVIDÊNCIA DE PRODUÇÃO — publicação observada em 21/10/2026:** [Make a Film na home](https://www.usekineo.com/) permanece o caminho de filme narrado; [Cartoon EN](https://www.usekineo.com/ai-kids-cartoon-videos), [Cartoon PT](https://www.usekineo.com/desenho-infantil-3d-com-ia), [AI UGC EN](https://www.usekineo.com/ai-ugc-ads), [AI UGC PT](https://www.usekineo.com/anuncios-ugc-com-ia) e [Product Ads](https://www.usekineo.com/ads) já possuem páginas públicas. O lançamento comercial do Cartoon é distinto da existência dessas páginas.

**SUGESTÃO — condição futura informada pelo fundador em 21/10/2026, não observada em produção:** lançamento previsto para 22/10/2026; piloto Cartoon de US$29/mês por 30 desenhos de 15 s; pack avulso de US$49 por 30 desenhos; primeiro grátis com marca d’água. Este kit não afirma que a oferta está no ar. Não consta aqui como DECISÃO APROVADA extraída de `docs/DECISIONS.md`.

**QUESTÃO PENDENTE / DESCONHECIDO:** vigência, disponibilidade de compra, regra de consumo, elegibilidade do primeiro grátis, expiração do pack e regra de migração de assinantes para a oferta Cartoon não foram confirmadas. A oferta futura não substitui o teste genérico de filmes. Não dizer “incluído no seu plano”, “ilimitado”, “sem marca no grátis” ou “30 episódios idênticos”.

**SUGESTÃO — gate editorial para a manhã:** o fundador ou responsável autorizado precisa conferir a oferta Cartoon na página pública de preços e o destino real de compra; confirmar se o piloto de US$29/mês, os 30 desenhos de 15 s, o pack de US$49/30 e a primeira amostra com marca correspondem ao que está habilitado. Só depois usar as versões “à venda”. Esta tarefa de pesquisa não autoriza login, teste pago, envio ou publicação.

**SUGESTÃO:** os blocos “pré-lançamento” têm a condição futura dentro do próprio texto. Os blocos “à venda” são rascunhos condicionais para depois do gate, com frases completas prontas para copiar. Não misturar trechos dos dois estados.

## Base factual e fontes

| Rótulo e data | Fato usado no kit | Fonte |
|---|---|---|
| EVIDÊNCIA DE PRODUÇÃO — publicação observada, 21/10/2026 | Filme a partir de ideia ou roteiro: cenas, voz, legendas, música; Make a Film primeiro | https://www.usekineo.com/ |
| EVIDÊNCIA DE PRODUÇÃO — publicação observada, 21/10/2026 | Cartoon 3D de 15/35 s com Seedance 1.5; seis personagens; EN/PT/ES; história editável antes de gerar; pequenos detalhes podem variar | https://www.usekineo.com/ai-kids-cartoon-videos e https://www.usekineo.com/desenho-infantil-3d-com-ia |
| EVIDÊNCIA DE PRODUÇÃO — publicação observada, 21/10/2026 | Product Ads: fotos próprias, movimento, voz, música, logo; aproximadamente 15 s; planejamento antes da cobrança | https://www.usekineo.com/ads |
| EVIDÊNCIA DE PRODUÇÃO — publicação observada, 21/10/2026 | UGC: apresentador de IA segurando o produto; não é depoimento; amostra de 15 s com marca sujeita à elegibilidade; 41/55/82 créditos para 15/20/30 s | https://www.usekineo.com/ai-ugc-ads e https://www.usekineo.com/anuncios-ugc-com-ia |
| EVIDÊNCIA DE PRODUÇÃO — publicação observada, 21/10/2026 | Starter US$9,90/mês, 60 créditos; cobrança de planos em USD mundialmente | https://www.usekineo.com/pricing |
| EVIDÊNCIA DE PRODUÇÃO — publicação observada, 21/10/2026 | Business US$84/mês, 500 créditos; cerca de 12 anúncios Commercial de 15 s | https://www.usekineo.com/pricing e https://www.usekineo.com/business |
| SUGESTÃO — plano informado pelo fundador, 21/10/2026 | Cartoon: piloto US$29/mês por 30 desenhos de 15 s; pack US$49 por 30; primeiro grátis com marca; previsto 22/10 | Instrução desta tarefa KINEO-GEO-NOITE-2110, sem URL pública da oferta verificada |
| FATO CONFIRMADO — IMPLEMENTADO, código 72d23210, lido em 21/10/2026 | Studio cria filme, lê saldo, acompanha pedido e lista filmes; outros formatos retornam link para o site | lib/mcp/studioMcp.ts:36–39, 239, 348–352 |
| FATO CONFIRMADO — IMPLEMENTADO, código 72d23210, lido em 21/10/2026 | Script Studio salva roteiro aprovado, contagem de palavras, avaliação de duração e link; não renderiza | lib/mcp/chatgptContract.ts:26–30, 103–105 |
| EVIDÊNCIA DE PRODUÇÃO — publicação documental oficial, consultada em 21/10/2026 | Descrições do diretório devem explicar a função e omitir preço, assinatura, teste grátis e promoção | https://developers.openai.com/plugins/plugin-guidelines |

## H1 — Home: Cartoon, pré-lançamento

**SUGESTÃO:** card ou faixa secundária após Make a Film. Não substituir o filme como produto principal.

### EN

```text
AI Cartoon Videos — launching, planned for October 22

Turn an idea into a narrated 3D kids story with one of Kineo’s characters. Planned launch offer: US$29/month for 30 cartoons of 15 seconds, or a US$49 pack of 30. The planned first cartoon is free with a watermark. Check the page for launch availability and final terms.

Explore AI Cartoon Videos →
https://www.usekineo.com/ai-kids-cartoon-videos
```

### PT

```text
AI Cartoon Videos — em lançamento, previsto para 22/10

Transforme uma ideia em história infantil 3D narrada com um dos personagens da Kineo. Oferta planejada: US$29/mês por 30 desenhos de 15 segundos ou pack de US$49 com 30. O primeiro desenho está previsto como grátis, com marca d’água. Consulte a página para disponibilidade e condições finais.

Conhecer os desenhos com IA →
https://www.usekineo.com/desenho-infantil-3d-com-ia
```

## H2 — Página Cartoon, pré-lançamento

### EN

```text
A small idea. A 3D cartoon story.

Choose Leo, Mia, Dino, Pip, Bibi or Ollie, write an idea and review the story before generating. Kineo adds narration and captions in English, Portuguese or Spanish. The character description follows each scene; small details can still vary.

Dedicated Cartoon offer: launching, planned for October 22.
Planned pilot: US$29/month for 30 cartoons of 15 seconds.
Planned one-time pack: US$49 for 30 cartoons.
Planned first cartoon: free, with a watermark.

These are launch plans. Check availability and final terms on the page before buying.

See AI Cartoon Videos →
https://www.usekineo.com/ai-kids-cartoon-videos
```

### PT

```text
Uma pequena ideia. Uma história em desenho 3D.

Escolha Leo, Mia, Dino, Pip, Bibi ou Ollie, escreva uma ideia e revise a história antes de gerar. A Kineo acrescenta narração e legendas em português, inglês ou espanhol. A descrição do personagem acompanha cada cena; pequenos detalhes ainda podem variar.

Oferta dedicada Cartoon: em lançamento, previsto para 22/10.
Piloto planejado: US$29/mês por 30 desenhos de 15 segundos.
Pack avulso planejado: US$49 por 30 desenhos.
Primeiro desenho previsto: grátis, com marca d’água.

Estas são as condições planejadas. Confira disponibilidade e termos finais na página antes de comprar.

Conhecer AI Cartoon Videos →
https://www.usekineo.com/desenho-infantil-3d-com-ia
```

## H3 — Home: Cartoon à venda, somente depois do gate

**SUGESTÃO CONDICIONAL:** usar somente se a oferta e a primeira amostra estiverem confirmadas publicamente. Se o gate não passar, manter H1.

### EN

```text
AI Cartoon Videos

Make a narrated 3D kids story from an idea. Start with a free watermarked cartoon, then choose the US$29/month pilot for 30 cartoons of 15 seconds or a one-time US$49 pack of 30.

Make my cartoon →
https://www.usekineo.com/ai-kids-cartoon-videos
```

### PT

```text
AI Cartoon Videos

Crie uma história infantil 3D narrada a partir de uma ideia. Comece com um desenho grátis com marca d’água. Depois, escolha o piloto de US$29/mês por 30 desenhos de 15 segundos ou o pack avulso de US$49 com 30.

Fazer meu desenho →
https://www.usekineo.com/desenho-infantil-3d-com-ia
```

## H4 — Página Cartoon à venda, somente depois do gate

### EN

```text
Create your next 3D cartoon story

Choose one of six Kineo characters, write your idea and review the story before generating. Get a vertical cartoon with narration and captions in English, Portuguese or Spanish. Character details can vary between scenes.

First cartoon: free with a watermark.
Monthly pilot: US$29/month for 30 cartoons of 15 seconds.
One-time pack: US$49 for 30 cartoons.

Review the current terms before choosing an option. No audience growth or income is promised.

Make my first cartoon →
https://www.usekineo.com/ai-kids-cartoon-videos
```

### PT

```text
Crie sua próxima história em desenho 3D

Escolha um dos seis personagens da Kineo, escreva sua ideia e revise a história antes de gerar. Receba um desenho vertical com narração e legendas em português, inglês ou espanhol. Detalhes do personagem podem variar entre cenas.

Primeiro desenho: grátis, com marca d’água.
Piloto mensal: US$29/mês por 30 desenhos de 15 segundos.
Pack avulso: US$49 por 30 desenhos.

Confira as condições atuais antes de escolher. Não prometemos audiência nem renda.

Fazer meu primeiro desenho →
https://www.usekineo.com/desenho-infantil-3d-com-ia
```

## A1 — Home: Product Ads / AI UGC Ads

**EVIDÊNCIA DE PRODUÇÃO — publicação observada em 21/10/2026:** as funções abaixo já são descritas nas páginas públicas de Ads e UGC. **SUGESTÃO:** anunciar o que fazem, sem dizer “novo hoje” ou atribuir vendas comprovadas.

### EN

```text
Turn your product photos into an ad

Choose Product Ads for photos with movement, voice, music and your logo. Choose AI UGC Ads for an AI presenter holding your product. Review the script before generating. You download the MP4 and decide where to post it.

Product Ads →
https://www.usekineo.com/ads

AI UGC Ads →
https://www.usekineo.com/ai-ugc-ads
```

### PT

```text
Transforme as fotos do produto em anúncio

Escolha Product Ads para fotos com movimento, voz, música e seu logo. Escolha AI UGC Ads para um apresentador de IA segurando o produto. Revise o roteiro antes de gerar. Você baixa o MP4 e decide onde publicar.

Anúncios de produto →
https://www.usekineo.com/ads

Anúncios UGC com IA →
https://www.usekineo.com/anuncios-ugc-com-ia
```

## A2 — Páginas de anúncios: texto curto

### EN

```text
Your real product. Two ways to show it.

Product Ads turn your photos into a vertical ad with motion, voice, music and your logo. AI UGC Ads add an AI presenter holding the product and explaining it from facts you supply.

An eligible first UGC sample is free: one per account, 15 seconds, with a watermark, subject to regional and daily limits. Paid UGC ads use 41 credits for 15 seconds, 55 for 20 or 82 for 30. Paid plans start at US$9.90/month.

The presenter is AI, not a real customer or testimonial. You download the video and run your own campaign; Kineo does not promise sales.

Explore AI UGC Ads →
https://www.usekineo.com/ai-ugc-ads

See current plans →
https://www.usekineo.com/pricing
```

### PT

```text
Seu produto real. Duas formas de mostrar.

Product Ads transforma suas fotos em anúncio vertical com movimento, voz, música e logo. AI UGC Ads acrescenta um apresentador de IA segurando o produto e explicando os fatos que você fornecer.

A primeira amostra UGC elegível é grátis: uma por conta, 15 segundos, com marca d’água, sujeita a limite regional e diário. Anúncios UGC pagos usam 41 créditos para 15 segundos, 55 para 20 ou 82 para 30. Planos pagos partem de US$9,90/mês.

O apresentador é IA, não um cliente ou depoimento real. Você baixa o vídeo e faz sua campanha; a Kineo não promete vendas.

Conhecer os anúncios UGC →
https://www.usekineo.com/anuncios-ugc-com-ia

Ver os planos atuais →
https://www.usekineo.com/pricing
```

## E-mails — três segmentos, EN e PT

**SUGESTÃO:** textos completos, somente rascunhos. Selecionar pessoas externas e deduplicar por pessoa antes de qualquer uso futuro; o segmento “testou e não comprou” deve excluir pagantes atuais. Não foi lida uma lista de contatos nem criada campanha. O fato de alguém ter feito um desenho deve ser confirmado antes de colocá-lo no primeiro segmento.

**SUGESTÃO:** os seis textos abaixo são de pré-lançamento e declaram a oferta futura dentro da mensagem. Para venda depois do gate, há uma segunda versão completa dos três segmentos logo em seguida. Não usar preço futuro como preço de hoje.

<a id="e1-pre"></a>

### E1 — Quem já fez desenho infantil, pré-lançamento — EN

```text
Subject: Your next cartoon story on Kineo

Hi,

Want to continue creating 3D kids stories? In Kineo you choose a character, write an idea and review the story before generating.

The dedicated Cartoon offer is launching, planned for October 22: US$29/month for 30 cartoons of 15 seconds, or a one-time US$49 pack of 30. The first cartoon is planned to be free with a watermark. Availability and final terms will be shown on the page.

English, Portuguese and Spanish are available. Small character details can vary between scenes.

Explore AI Cartoon Videos:
https://www.usekineo.com/ai-kids-cartoon-videos

Joseph
Kineo
```

### E1 — Quem já fez desenho infantil, pré-lançamento — PT

```text
Assunto: Sua próxima história em desenho na Kineo

Olá,

Quer continuar criando histórias infantis em 3D? Na Kineo, você escolhe o personagem, escreve uma ideia e revisa a história antes de gerar.

A oferta dedicada Cartoon está em lançamento, previsto para 22/10: US$29/mês por 30 desenhos de 15 segundos ou pack avulso de US$49 com 30. O primeiro desenho está previsto como grátis, com marca d’água. A disponibilidade e as condições finais aparecerão na página.

Você pode escolher português, inglês ou espanhol. Pequenos detalhes do personagem podem variar entre cenas.

Conhecer AI Cartoon Videos:
https://www.usekineo.com/desenho-infantil-3d-com-ia

Joseph
Kineo
```

<a id="e2-pre"></a>

### E2 — Pagantes atuais, pré-lançamento — EN

```text
Subject: More ways to create with Kineo

Hi,

Make a Film remains the place to turn an idea into a narrated Short with scenes, captions and music.

You can also explore Product Ads from your real photos and AI UGC Ads with a presenter holding your product:
https://www.usekineo.com/ai-ugc-ads

For 3D kids stories, the dedicated Cartoon offer is launching, planned for October 22: US$29/month for 30 cartoons of 15 seconds, or a US$49 pack of 30. The first cartoon is planned to be free with a watermark.

Check the final terms before choosing a Cartoon option; this message does not change your current subscription.

See AI Cartoon Videos:
https://www.usekineo.com/ai-kids-cartoon-videos

Joseph
Kineo
```

### E2 — Pagantes atuais, pré-lançamento — PT

```text
Assunto: Mais formas de criar com a Kineo

Olá,

Make a Film continua sendo o caminho para transformar uma ideia em Short narrado com cenas, legendas e música.

Você também pode conhecer Product Ads com suas fotos reais e AI UGC Ads com um apresentador segurando seu produto:
https://www.usekineo.com/anuncios-ugc-com-ia

Para histórias infantis 3D, a oferta dedicada Cartoon está em lançamento, previsto para 22/10: US$29/mês por 30 desenhos de 15 segundos ou pack de US$49 com 30. O primeiro desenho está previsto como grátis, com marca d’água.

Confira as condições finais antes de escolher uma opção Cartoon; esta mensagem não altera sua assinatura atual.

Conhecer AI Cartoon Videos:
https://www.usekineo.com/desenho-infantil-3d-com-ia

Joseph
Kineo
```

<a id="e3-pre"></a>

### E3 — Testou e não comprou, pré-lançamento — EN

```text
Subject: What would you like to make next?

Hi,

Have an idea you want to turn into a narrated Short? Kineo builds the script, voice, scenes, captions and music. Paid plans start at US$9.90/month; current terms are here:
https://www.usekineo.com/pricing

If you prefer kids stories, the dedicated Cartoon offer is launching, planned for October 22: US$29/month for 30 cartoons of 15 seconds, or a US$49 pack of 30. The first cartoon is planned to be free with a watermark.
https://www.usekineo.com/ai-kids-cartoon-videos

Selling a product instead? Explore Product Ads and AI UGC Ads:
https://www.usekineo.com/ai-ugc-ads

Pick the format that fits what you want to create.

Joseph
Kineo
```

### E3 — Testou e não comprou, pré-lançamento — PT

```text
Assunto: O que você quer criar agora?

Olá,

Tem uma ideia para transformar em Short narrado? A Kineo monta roteiro, voz, cenas, legendas e música. Os planos pagos partem de US$9,90/mês; as condições atuais estão aqui:
https://www.usekineo.com/pricing

Se prefere histórias infantis, a oferta dedicada Cartoon está em lançamento, previsto para 22/10: US$29/mês por 30 desenhos de 15 segundos ou pack de US$49 com 30. O primeiro desenho está previsto como grátis, com marca d’água.
https://www.usekineo.com/desenho-infantil-3d-com-ia

Quer mostrar um produto? Conheça Product Ads e AI UGC Ads:
https://www.usekineo.com/anuncios-ugc-com-ia

Escolha o formato que combina com o que você quer criar.

Joseph
Kineo
```

## E-mails de venda — somente depois do gate Cartoon

**SUGESTÃO CONDICIONAL:** estas versões não foram enviadas e não representam disponibilidade atual. Usar somente após confirmação integral da oferta e da amostra. Os preços Cartoon continuam derivados da instrução do fundador, e não de um checkout observado nesta tarefa.

<a id="e1-venda"></a>

### E1 — Quem já fez desenho infantil, à venda — EN

```text
Subject: Keep creating your cartoon stories

Hi,

Ready for another 3D kids story? Choose a Kineo character, write an idea and review the story before generating.

The Cartoon pilot is US$29/month for 30 cartoons of 15 seconds. Prefer a one-time option? The US$49 pack includes 30 cartoons. The offer includes a first watermarked sample; check eligibility on the page.

Choose English, Portuguese or Spanish. Small character details can vary between scenes.

Review the terms and choose your option:
https://www.usekineo.com/ai-kids-cartoon-videos

Joseph
Kineo
```

### E1 — Quem já fez desenho infantil, à venda — PT

```text
Assunto: Continue criando suas histórias em desenho

Olá,

Vamos criar outra história infantil em 3D? Escolha um personagem da Kineo, escreva uma ideia e revise a história antes de gerar.

O piloto Cartoon custa US$29/mês por 30 desenhos de 15 segundos. Prefere uma opção avulsa? O pack de US$49 inclui 30 desenhos. A oferta prevê uma primeira amostra com marca d’água; confira a elegibilidade na página.

Escolha português, inglês ou espanhol. Pequenos detalhes do personagem podem variar entre cenas.

Confira as condições e escolha sua opção:
https://www.usekineo.com/desenho-infantil-3d-com-ia

Joseph
Kineo
```

<a id="e2-venda"></a>

### E2 — Pagantes atuais, à venda — EN

```text
Subject: Choose your next format on Kineo

Hi,

Keep making narrated films, or explore a different format for your next idea.

For 3D kids stories, Cartoon now offers a US$29/month pilot for 30 cartoons of 15 seconds, or a one-time US$49 pack of 30. The first cartoon is free with a watermark. Check the Cartoon terms before choosing; this message does not change your current subscription:
https://www.usekineo.com/ai-kids-cartoon-videos

For your business, Product Ads animate your real photos. AI UGC Ads add an AI presenter holding your product:
https://www.usekineo.com/ai-ugc-ads

Start with the format that fits your project.

Joseph
Kineo
```

### E2 — Pagantes atuais, à venda — PT

```text
Assunto: Escolha seu próximo formato na Kineo

Olá,

Continue criando filmes narrados ou experimente outro formato para a próxima ideia.

Para histórias infantis 3D, Cartoon oferece o piloto de US$29/mês por 30 desenhos de 15 segundos ou pack avulso de US$49 com 30. O primeiro desenho é grátis, com marca d’água. Confira as condições Cartoon antes de escolher; esta mensagem não altera sua assinatura atual:
https://www.usekineo.com/desenho-infantil-3d-com-ia

Para seu negócio, Product Ads anima suas fotos reais. AI UGC Ads acrescenta um apresentador de IA segurando o produto:
https://www.usekineo.com/anuncios-ugc-com-ia

Comece pelo formato que combina com seu projeto.

Joseph
Kineo
```

<a id="e3-venda"></a>

### E3 — Testou e não comprou, à venda — EN

```text
Subject: One idea, your next Kineo video

Hi,

What would you like to make?

A narrated film: start with an idea or your script. Kineo adds scenes, voice, captions and music. Paid plans start at US$9.90/month:
https://www.usekineo.com/pricing

A 3D kids cartoon: the first is free with a watermark. Continue with the US$29/month pilot for 30 cartoons of 15 seconds, or a one-time US$49 pack of 30:
https://www.usekineo.com/ai-kids-cartoon-videos

A product ad: use your real photos, with or without an AI presenter:
https://www.usekineo.com/ai-ugc-ads

Review the current terms and choose the format you need.

Joseph
Kineo
```

### E3 — Testou e não comprou, à venda — PT

```text
Assunto: Uma ideia para seu próximo vídeo na Kineo

Olá,

O que você quer criar?

Um filme narrado: comece por uma ideia ou roteiro. A Kineo acrescenta cenas, voz, legendas e música. Planos pagos desde US$9,90/mês:
https://www.usekineo.com/pricing

Um desenho infantil 3D: o primeiro é grátis, com marca d’água. Continue no piloto de US$29/mês por 30 desenhos de 15 segundos ou no pack avulso de US$49 com 30:
https://www.usekineo.com/desenho-infantil-3d-com-ia

Um anúncio de produto: use suas fotos reais, com ou sem apresentador de IA:
https://www.usekineo.com/anuncios-ugc-com-ia

Confira as condições atuais e escolha o formato de que precisa.

Joseph
Kineo
```

## Posts — três mensagens, EN e PT

<a id="s1-cartoon"></a>

### S1 — Cartoon, pré-lançamento — EN

```text
A story idea → a narrated 3D kids cartoon.

Kineo Cartoon is launching, planned for October 22. Planned offer: US$29/month for 30 cartoons of 15 s, or a US$49 pack of 30. The first is planned to be free with a watermark. Check launch availability and final terms:
https://www.usekineo.com/ai-kids-cartoon-videos
```

### S1 — Cartoon, pré-lançamento — PT

```text
Uma ideia → uma história infantil 3D narrada.

Kineo Cartoon está em lançamento, previsto para 22/10. Oferta planejada: US$29/mês por 30 desenhos de 15 s ou pack de US$49 com 30. O primeiro está previsto como grátis, com marca d’água. Confira disponibilidade e condições finais:
https://www.usekineo.com/desenho-infantil-3d-com-ia
```

### S1 — Cartoon, à venda somente depois do gate — EN

```text
Your next 3D kids story starts with one idea.

Try a free watermarked cartoon. Continue with Kineo’s US$29/month pilot for 30 cartoons of 15 s, or a one-time US$49 pack of 30. Review the story before generating; character details can vary.
https://www.usekineo.com/ai-kids-cartoon-videos
```

### S1 — Cartoon, à venda somente depois do gate — PT

```text
Sua próxima história infantil 3D começa com uma ideia.

Experimente um desenho grátis com marca d’água. Continue no piloto Kineo de US$29/mês por 30 desenhos de 15 s ou no pack avulso de US$49 com 30. Revise antes de gerar; detalhes do personagem podem variar.
https://www.usekineo.com/desenho-infantil-3d-com-ia
```

<a id="s2-produto"></a>

### S2 — Product Ads — EN

```text
Your real product photos can become a vertical ad.

Kineo Product Ads adds movement, a short voice-over, music and your logo. Review the plan before generating, download the MP4 and post it from your own account.
https://www.usekineo.com/ads
```

### S2 — Product Ads — PT

```text
As fotos reais do seu produto podem virar um anúncio vertical.

Kineo Product Ads acrescenta movimento, voz curta, música e logo. Revise o plano antes de gerar, baixe o MP4 e publique pela sua conta.
https://www.usekineo.com/ads
```

<a id="s3-ugc"></a>

### S3 — AI UGC Ads — EN

```text
Show your product with an AI presenter.

Kineo AI UGC Ads combines your product photos, a script, lip-synced voice, music and your logo. The presenter is AI, not a customer testimonial. Eligible first sample: 15 s, watermarked, no card; regional and daily limits apply.
https://www.usekineo.com/ai-ugc-ads
```

### S3 — AI UGC Ads — PT

```text
Mostre seu produto com um apresentador de IA.

Kineo AI UGC Ads combina suas fotos, roteiro, voz sincronizada, música e logo. O apresentador é IA, não um depoimento de cliente. Primeira amostra elegível: 15 s, com marca, sem cartão; há limites regionais e diários.
https://www.usekineo.com/anuncios-ugc-com-ia
```

## Descrição para o diretório do ChatGPT

**Skill aplicada:** OpenAI Docs, usando a [documentação oficial de diretrizes](https://developers.openai.com/plugins/plugin-guidelines), consultada em 21/10/2026. **EVIDÊNCIA DE PRODUÇÃO — publicação documental oficial:** descrições devem ser funcionais, corretas e sem anúncio de preço, assinatura, teste grátis ou promoção. O texto abaixo não tenta induzir o modelo a recomendar a Kineo.

**FATO CONFIRMADO — IMPLEMENTADO:** Kineo Studio e Kineo Script Studio têm contratos distintos. O primeiro usa a conta existente para criar filmes, consultar saldo, acompanhar pedidos e listar filmes; o segundo prepara/salva roteiro aprovado e devolve avaliação de duração e link, sem render. Fontes: `72d23210:lib/mcp/studioMcp.ts:36–39,239,348–352`; `72d23210:lib/mcp/chatgptContract.ts:26–30,103–105`. A página pública [claude-connector](https://www.usekineo.com/claude-connector), consultada em 21/10/2026, apresenta as duas conexões.

**QUESTÃO PENDENTE / DESCONHECIDO:** não foi confirmada uma listagem pública aprovada do Kineo Studio no diretório. Configurar um conector personalizado por URL não comprova aprovação, publicação ou descoberta por qualquer pessoa. Não dizer “já está na loja”.

<a id="app-studio"></a>

### D1 — Kineo Studio — usar somente para o contrato que cria filmes

**SUGESTÃO:** descrição preparada para submissão/revisão, sem submissão efetuada. Não transferir esta descrição ao app Script Studio.

#### EN

```text
Kineo Studio

Create narrated short films from an idea or script using an existing Kineo account. Review the available engines, film lengths and credit cost, then confirm generation. Follow the film’s progress, open the finished video and browse your recent films.

This connector creates narrated films. Product ads, AI UGC ads and kids cartoons open in Kineo Studio on the web.
```

#### PT

```text
Kineo Studio

Crie curtas narrados a partir de uma ideia ou roteiro usando uma conta Kineo existente. Confira os motores disponíveis, as durações e o custo em créditos antes de confirmar a geração. Acompanhe o andamento, abra o vídeo pronto e consulte seus filmes recentes.

Este conector cria filmes narrados. Anúncios de produto, anúncios UGC com IA e desenhos infantis abrem no Kineo Studio pela web.
```

<a id="app-script"></a>

### D2 — Kineo Script Studio — alternativa para o contrato de roteiro

**SUGESTÃO:** se a listagem a atualizar for a do Script Studio, esta é a descrição compatível; não prometer render por este contrato.

#### EN

```text
Kineo Script Studio

Prepare a narration script, review its word count and duration assessment, and save the script you approve. Receive a shareable Kineo Studio link to continue video production in an existing Kineo account. Anyone with the link can read the script. This app does not render or publish videos.
```

#### PT

```text
Kineo Script Studio

Prepare um roteiro de narração, confira a contagem de palavras e a avaliação de duração e salve o texto aprovado. Receba um link compartilhável do Kineo Studio para continuar a produção em uma conta Kineo existente. Quem tiver o link poderá ler o roteiro. Este app não renderiza nem publica vídeos.
```

## O que está errado ou pode melhorar

**CONTRADIÇÃO DE ESTÁGIO:** chamar o Cartoon de “à venda” agora confundiria uma oferta futura informada pelo fundador com as páginas e o fluxo de filme já existentes. **SUGESTÃO:** usar somente o texto correspondente ao estado confirmado da oferta.

**FATO CONFIRMADO — IMPLEMENTADO:** o conector Studio devolve “format_not_available” para Product Ads, UGC e Cartoon; `lib/mcp/studioMcp.ts:348–352`. **SUGESTÃO:** manter os CTAs desses lançamentos para o site; a descrição do app deve prometer criação apenas de filmes narrados.

**HIPÓTESE:** anunciar todos os formatos com o mesmo destaque pode dispersar quem chega para Make a Film. **SUGESTÃO:** filme primeiro na home e no e-mail de retorno; Cartoon ou anúncios como continuação adequada ao interesse, sem presumir que todos querem todos os produtos.

## Próximo passo recomendado

**SUGESTÃO:** de manhã, confirmar a oferta Cartoon. Se passar, usar H3/H4, E1–E3 de venda e S1 de venda; se não passar, manter as versões pré-lançamento sem liberar a promessa de compra. Product Ads/UGC têm textos próprios A1/A2 e S2/S3 baseados em páginas atuais. A publicação e o envio continuam a cargo do fundador e dependem de sua decisão; nada foi enviado nesta tarefa.

**HIPÓTESE A MEDIR:** por segmento e por pessoa externa, verificar conclusão, escolha de plano e pagamento. Cliques, e-mails escritos, posts preparados e app descrito não são venda.

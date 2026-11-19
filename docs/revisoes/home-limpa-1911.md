# Limpeza da home · 19/11/2026

**IMPLEMENTADO.** Saíram o bloco de encerramento com os motores, a linha de oferta repetida e os quatro links abaixo dos planos. Os selos que ocupavam um bloco próprio passaram ao rodapé. A descrição do rodapé na home ficou em uma frase.

**TESTADO LOCALMENTE.** A contagem de blocos principais passou de 12 para 10. O critério é a contagem das seções diretamente sob a home, do bloco de citações, da faixa de selos e do rodapé. As duas linhas de Pricing removidas ficavam dentro de um bloco já contado. O Chrome registrou a página inteira em 390 e 1920 px, nos dois temas. A comparação no quadro combina faixas contíguas das capturas originais.

**TESTADO LOCALMENTE.** As cinco perguntas citáveis e a tabela de planos começam fechadas. As duas tabelas, as cinco respostas e o FAQ geral permanecem no HTML. A tabela de planos abre e fecha pelo teclado.

**FATO CONFIRMADO.** O cadastro elegível concede 10 créditos. A referência do primeiro filme é de 15 segundos e 9 créditos. Com a política `pais_rico`, país informado passa pela lista abaixo. País ausente ou inválido ainda permite a concessão inicial. O código da cota semanal usa a lista estrita. Fontes `lib/reverseTrial.ts:150`, `lib/reverseTrial.ts:922`, `lib/freeTierOffer.ts:236` e `lib/freeFilmPolicy.ts:21`.

**FATO CONFIRMADO.** Países e territórios habilitados na lista da branch: US, CA, GB, IE, AU, NZ, AT, BE, BG, HR, CY, CZ, DK, EE, FI, FR, DE, GR, HU, IT, LV, LT, LU, MT, NL, PL, PT, RO, SK, SI, ES, SE, NO, IS, LI, CH, JP, KR, SG, HK, TW, AE, SA, QA, KW, BH, OM, IL, BR, AR, ZA, TR, MX, MY e PR. Fonte `lib/freeFilmPolicy.ts:29`.

**FATO CONFIRMADO.** Starter, Creator e Studio usam os preços mensais de referência dos EUA de US$ 9, US$ 19 e US$ 59 na captura local. A tabela calcula isso de `TIER_PRICES` e usa `TIER_CREDITS`. Fontes `lib/checkoutPricing.ts:181`, `lib/checkoutPricing.ts:581` e `lib/seo/paginasCitadas0511.ts:31`.

**QUESTÃO PENDENTE.** A varredura de menções a Kineo 1, Seedance, Kling 2.5/3, Veo e Avatar está em `INVENTARIO-MOTORES.md`, junto às fotos referenciadas no quadro. Ela aponta arquivo, linha e termo que podem chegar a uma página pública. Textos de catálogo remoto e condições específicas de conta pedem conferência à parte.

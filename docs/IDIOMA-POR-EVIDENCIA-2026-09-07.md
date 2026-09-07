# Terceiro idioma — decisão por evidência

## Autorização e limite

**DECISÃO APROVADA — fundador, 07/09:** não adicionar português brasileiro; escolher o terceiro idioma a partir da participação de países/idiomas do público da Kineo. O rascunho PT nunca foi commitado nem publicado e foi removido. EN/ES permanecem inalterados.

**EVIDÊNCIA DE PRODUÇÃO:** consultas SELECT no Supabase `cqqukkvjjrguayiyjvhh`, corte fixo `2026-09-07T04:55:26Z` (01:55:26 BRT). Janela 30d `[2026-08-08T04:55:26Z,2026-09-07T04:55:26Z)`; 7d `[2026-08-31T04:55:26Z,2026-09-07T04:55:26Z)`. Contas internas excluídas com as constantes atuais de `lib/internalAccounts.ts`; nenhum e-mail de cliente, IP, roteiro, token ou URL assinada retornado.

## Cadastros novos (uma conta externa por id, não sessões)

**EVIDÊNCIA DE PRODUÇÃO:** 849 contas em 30 dias, 239 em 7 dias. Percentuais têm como denominador TODA a coorte, inclusive país desconhecido. Não interpretar contas como pessoas civis comprovadamente distintas; uma pessoa pode ter mais de uma conta.

| País do cadastro | 30d: contas | 30d: % | 7d: contas | 7d: % |
|---|---:|---:|---:|---:|
| Índia | 171 | 20,14% | 56 | 23,43% |
| Estados Unidos | 73 | 8,60% | 13 | 5,44% |
| Nigéria | 53 | 6,24% | 21 | 8,79% |
| Brasil | 47 | 5,54% | 19 | 7,95% |
| Paquistão | 46 | 5,42% | 11 | 4,60% |
| Reino Unido | 27 | 3,18% | 8 | 3,35% |
| Alemanha | 23 | 2,71% | 7 | 2,93% |
| Espanha | 19 | 2,24% | 8 | 3,35% |
| França | 18 | 2,12% | 4 | 1,67% |
| País desconhecido | 49 | 5,77% | 19 | 7,95% |

**LIMITE:** tabela mostra principais países e desconhecidos, não soma 100% porque há outros países. Japão: 3/849 (0,35%) em 30d; China: 1/849 (0,12%). Brasil aparece para transparência estatística, mas português está fora por decisão do fundador. Não subtrair Brasil do denominador para inflar outras candidatas.

**FATO CONFIRMADO:** `app/api/track-signup-source/route.ts:130` obtém `signup_country` do cabeçalho geográfico da Vercel e `:145` só preenche quando ausente. É localização observada por IP, não idioma declarado nem nacionalidade.

## Contas com atividade, incluindo retorno

**EVIDÊNCIA DE PRODUÇÃO:** DISTINCT por id autenticado com evento na janela, excluindo internos. País = last_country quando preenchido, senão signup_country; ausentes separados. Essa atribuição representa a localização disponível no corte, não geolocalização de cada evento histórico. Total: 1.091 contas ativas em 30d, 754 em 7d. Não é todo o tráfego anônimo do site.

| País disponível no perfil | 30d: ativos / % | 7d: ativos / % |
|---|---:|---:|
| Índia | 271 / 24,84% | 165 / 21,88% |
| Estados Unidos | 102 / 9,35% | 59 / 7,82% |
| Nigéria | 76 / 6,97% | 49 / 6,50% |
| Paquistão | 53 / 4,86% | 46 / 6,10% |
| Brasil | 52 / 4,77% | 37 / 4,91% |
| Alemanha | 30 / 2,75% | 22 / 2,92% |
| País desconhecido | 63 / 5,77% | 51 / 6,76% |

## Ativação, sem confundir com faturamento

**EVIDÊNCIA DE PRODUÇÃO:** entre as 171 contas novas da Índia na coorte 30d, 102 tiveram pelo menos um vídeo completed com arquivo até o corte, e 25 emitiram checkout_started. IDs distintos dentro de cada etapa; não pressupor que os 25 fazem parte dos 102. Checkout não é pagamento, nem se demonstrou causalidade entre língua e abandono. Estados Unidos: 73 contas, 44 com entrega, 8 com checkout; Nigéria: 53/40/10; Alemanha: 23/17/5; França: 18/9/3.

## Por que não existe ainda uma porcentagem confiável por idioma

**QUESTÃO PENDENTE / DESCONHECIDO:** nenhuma das 849 contas novas tem locale/language/preferred_language preenchido em raw_user_meta_data do Auth. Não foi encontrada coluna de preferência de idioma em profiles. Metadados `language` em eventos externos no período aparecem em apenas duas contas, em ações orgânicas; não representam o idioma do navegador de toda a base.

**FATO CONFIRMADO:** `app/youtube-shorts-from-topic/TopicGeneratorForm.tsx` também transporta `language` na intenção de geração. Esse campo NÃO pode virar preferência de interface por suposição. `accept-language` participa do hash antifraude, mas não está disponível reversivelmente para esta análise; não tentar decodificar fingerprint.

**LIMITE:** país não prova idioma, proficiência em inglês ou alfabetização. Índia é multilíngue. Não somar Paquistão à Índia como se todos lessem hindi; não aplicar proporções do censo à coorte de clientes da Kineo.

## Prioridade resultante

**SUGESTÃO / HIPÓTESE:** hindi é a primeira candidata para o terceiro idioma, por a Índia liderar tanto cadastro quanto retorno nas duas janelas. Evidência externa de plausibilidade, não de preferência individual: [Censo da Índia de 2011, tabela de idiomas](https://censusindia.gov.in/nada/index.php/catalog/42458/download/46089/C-16_25062018.pdf) registra hindi como o grupo de língua materna mais numeroso (43,63% naquele censo). Não usar esse percentual como alcance esperado no site.

**DESENHO SEGURO:** opção manual English / Español / हिन्दी, nunca troca automática por IP. Escolha persistida, textos de UI conhecidos traduzidos, conteúdo do usuário e preços/moeda inalterados. Antes de publicar: tradução revisada, fonte com suporte devanágari, desktop/320/390px, teclado, recuperação da escolha e testes SSR/hidratação. A auditoria de hidratação já aberta é um gate separado, não pode ser escondida com suppressHydrationWarning.

**MEDIÇÃO PROPOSTA:** registrar idioma de interface explicitamente selecionado e, se incorporado à telemetria existente, idioma-base do navegador (sem lista completa, sem IP, sem texto livre). Distinguir escolha manual de preferência do browser. Medir por conta externa a exposição, escolha, continuidade e assinatura confirmada no servidor; sem prometer ganho comercial antes de amostra. Essa coleta e a opção hindi ainda NÃO foram implementadas/publicadas neste levantamento.

**STATUS:** análise concluída; terceira língua priorizada como hipótese testável, não alegação de idioma compreendido pela base. Nenhum novo idioma em produção. As cinco melhorias/Manrope continuam em `89bb5cb4`. Limpeza adicional do My Videos e investigação de hidratação continuam pendentes, sem misturar com alterações de preços/campanhas do Claude.

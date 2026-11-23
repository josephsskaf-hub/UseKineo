# Volta do menu da conta · 23/11/2026

**FATO CONFIRMADO.** `lib/ui/unifiedAccountMenu.ts` aceita `off`, `internal` e `public`. O ramo é entregue em `off`. A rota de visibilidade em `app/api/account/menu-visibility/route.ts` confirma a sessão no servidor e usa `releaseVisible` com a lista exata da casa. O cadastro e o login de produção ficam para a revisão da CEO.

**TESTADO LOCALMENTE.** A conta com 137 créditos abriu o menu e a barra de recarga. O chip, o menu e o bloco de preços compartilharam um GET de elegibilidade. Cada botão registrou uma impressão ao entrar na área visível. O evento usa o saldo confirmado na oferta do servidor. As três origens foram `sidebar_chip`, `account_pricing` e `pricing_credits`. Tap repetido e remontagem na mesma página reaproveitam a leitura. A prova usou contas simuladas e parou na barra.

**TESTADO LOCALMENTE.** O saldo da home e seu menu compartilharam uma leitura de `/api/credits`, inclusive quando a verificação do modo interno terminou depois da montagem. O foco voltou ao painel após a troca do cabeçalho de visitante pelo da conta confirmada.

## Mutantes da revisão

| Mutante | Resultado | Verificação |
| --- | --- | --- |
| M1 · Recarga inventada para conta gratuita | Morto | Monta o bloco de preços e verifica ausência do botão quando o servidor recusa. |
| M2 · Menu novo aparece com `off` | Morto | Monta a engrenagem com a chave desligada e verifica o botão legado. |
| M3 · Sign out some sem prop `signedIn` | Morto | Abre a engrenagem, resolve a sessão e exige o botão de saída. |
| M4 · Saldo literal de 60 créditos | Morto | Monta o saldo da home e exige os 137 créditos do dublê do servidor. |
| M5 · CSS do menu sai com `off` | Morto | Compara o HTML real renderizado da home com o HTML de referência em `test-watch-home-1311.mjs`. |
| M6 · Recarga lida antes da entrada visível | Morto | Monta preços fora da tela e o menu fechado, e exige zero leituras de elegibilidade. |

Fontes das provas em `scripts/test-menu-conta-revisao-2311.mjs` e `scripts/test-watch-home-1311.mjs`.

## JavaScript inicial com a chave desligada

**TESTADO LOCALMENTE.** Medição em 23/11 com compilação de produção do Next, dados fictícios e a mesma fonte simulada. Soma dos arquivos JavaScript únicos do layout e da rota nos manifestos, com gzip por arquivo. kB em base 1.000. A medida cobre o carregamento inicial compilado.

| Página | Main gzip | Entrega anterior gzip | Volta gzip | Redução sobre a anterior | Main / anterior / volta sem gzip |
| --- | ---: | ---: | ---: | ---: | --- |
| Home | 492,54 kB | 498,68 kB | 497,24 kB | 1,44 kB | 1.697,84 / 1.719,78 / 1.710,67 kB |
| Preços | 539,32 kB | 546,62 kB | 545,43 kB | 1,20 kB | 1.887,13 / 1.909,52 / 1.904,30 kB |

A marca do painel aparece no JavaScript inicial da entrega anterior e está fora dele na volta. O painel carrega ao clicar em `components/AccountMenuTrigger.tsx`. Em gzip, o total da volta ainda soma 4,70 kB na home e 6,11 kB em preços sobre a main. As 48 comparações da entrega anterior continuam a referência visual.

Base de produção local `52c247e43`, entrega anterior reancorada `457a14f89`, código medido `2ed5c8db2`.

**TESTADO LOCALMENTE.** TypeScript limpo em checkout sem cache. `novos-vermelhos.sh` cobriu 186 guardiões e voltou nos 30 afetados pelos dublês corrigidos. Na união de 196, os quatro novos vermelhos da primeira rodada ficaram verdes e a rodada de confirmação encontrou zero novos.

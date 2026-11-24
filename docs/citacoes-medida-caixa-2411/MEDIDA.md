# Medida das sete caixas e quatro páginas novas · 24/11/2026

**EVIDÊNCIA DE PRODUÇÃO / SELECT agregado.** Banco cqqukkvjjrguayiyjvhh; corte observado 2026-11-24T22:17:05.820285+00:00; leitura 2026-11-24T22:28:50.150456+00:00. Antes: **10/11 17h28 a 24/11 17h28 BRT**, intervalo semiaberto [2026-11-10T20:28Z,2026-11-24T20:28Z). Depois: [24/11 17h28,08/12 17h28) BRT, nesta leitura limitado ao corte observado; **incompleto**. Ativação informada no quadro: c81ca048e,24/11 17h28. [Consulta pronta](../queries/CITACOES-CAIXAS-ANTES-DEPOIS-2411.sql).

**FATO CONFIRMADO.** SourceCapture.tsx:84–129 dispara uma âncora no navegador por aba, usando marcador em sessionStorage e session_id compartilhado por trackEvent. app/api/events/route.ts:551–557 carimba is_bot pela heurística de User-Agent. Portanto sessão aqui é o primeiro landing_session_started por session_id com is_bot=false, não pessoa, total de GETs, prova de humano ou toda visita possível; sem beacon/JS/analytics pode faltar. Conta é perfil criado na fase, uma vez, na primeira sessão elegível entre **todas as páginas**, antes de filtrar estas onze. Essa primeira sessão observada em que a conta aparece pode ser posterior ao cadastro: é atribuição operacional, não prova de que aquela página causou o cadastro. Sessão com mais de uma conta não atribui cadastro e aparece em ambiguidades; casa canônica sai de sessões e contas. Não há identificação individual exportada.

**FATO CONFIRMADO.** Primeiro filme é o primeiro histórico videos.status=completed nos modos explícitos de filme, criado após o perfil e até o corte da fase. Clipe e ads_v2 são excluídos. O escritor atual insere a linha já completed (app/api/compose/status/[renderId]/route.ts:175–185). É registro de entrega no histórico, não medição independente do instante em que o render terminou.

## Totais por página

**EVIDÊNCIA DE PRODUÇÃO.** Todas as origens abaixo; não somar as duas fases como se fossem a mesma janela. Nenhuma taxa do depois é conclusão sobre a caixa. Zero sessões deixa taxa sem denominador.

| Fase | Página | Sessões | Contas distintas | 1º filme | Cadastro/sessão % | Gate |
|---|---|---:|---:|---:|---:|---|
| antes | /ai-ugc-ads/product-photo-ads | 0 | 0 | 0 | — | pagina_nova_sem_gate_da_caixa |
| antes | /ai-video-generator/for/animal-story-videos | 0 | 0 | 0 | — | pagina_nova_sem_gate_da_caixa |
| antes | /ai-video-generator/for/animated-story-videos | 0 | 0 | 0 | — | pagina_nova_sem_gate_da_caixa |
| antes | /ai-video-generator/for/cartoon-videos | 0 | 0 | 0 | — | pagina_nova_sem_gate_da_caixa |
| antes | /best-ai-shorts-generators | 26 | 1 | 0 | 3.85 | referencia_antes |
| antes | /cheapest-ai-shorts-maker | 205 | 0 | 0 | 0 | referencia_antes |
| antes | /free-ai-shorts-generator | 709 | 5 | 2 | 0.71 | referencia_antes |
| antes | /free-script-generator | 26 | 0 | 0 | 0 | referencia_antes |
| antes | /how-much-do-instagram-reels-pay | 74 | 0 | 0 | 0 | referencia_antes |
| antes | /how-much-do-youtube-shorts-pay | 337 | 4 | 1 | 1.19 | referencia_antes |
| antes | /state-of-ai-shorts-2026 | 32 | 3 | 0 | 9.38 | referencia_antes |
| depois | /ai-ugc-ads/product-photo-ads | 0 | 0 | 0 | — | pagina_nova_sem_gate_da_caixa |
| depois | /ai-video-generator/for/animal-story-videos | 0 | 0 | 0 | — | pagina_nova_sem_gate_da_caixa |
| depois | /ai-video-generator/for/animated-story-videos | 0 | 0 | 0 | — | pagina_nova_sem_gate_da_caixa |
| depois | /ai-video-generator/for/cartoon-videos | 0 | 0 | 0 | — | pagina_nova_sem_gate_da_caixa |
| depois | /best-ai-shorts-generators | 0 | 0 | 0 | — | aguardar_14_dias |
| depois | /cheapest-ai-shorts-maker | 0 | 0 | 0 | — | aguardar_14_dias |
| depois | /free-ai-shorts-generator | 0 | 0 | 0 | — | aguardar_14_dias |
| depois | /free-script-generator | 0 | 0 | 0 | — | aguardar_14_dias |
| depois | /how-much-do-instagram-reels-pay | 0 | 0 | 0 | — | aguardar_14_dias |
| depois | /how-much-do-youtube-shorts-pay | 2 | 0 | 0 | 0 | aguardar_14_dias |
| depois | /state-of-ai-shorts-2026 | 0 | 0 | 0 | — | aguardar_14_dias |

## Mesma página e mesma origem

**EVIDÊNCIA DE PRODUÇÃO.** Só grupos com sessão observada. Página nova sem sessão aparece com zero nos totais, sem inventar uma origem. Origem ausente entra no total de todas as origens e é separada abaixo; **não é ChatGPT**. SourceCapture também pode guardar source_inferred=ai_assistant_likely: a inferência não é aceita como ChatGPT por esta consulta. O agrupamento v2 reconhece os aliases normais de SourceCapture/acquisitionSource: youtube, facebook, instagram e taaft. Referrer atestado vence UTM; a condição explícita ChatGPT por host OU UTM foi preservada conforme o pedido. Não usar o residual para atribuir tráfego a um assistente.

| Fase | Página | Origem | Sessões | Contas | 1º filme | % | Sessões rotuladas afiliado | Gate |
|---|---|---|---:|---:|---:|---:|---:|---|
| antes | /best-ai-shorts-generators | bing_explicito | 8 | 0 | 0 | 0 | 0 | referencia_antes |
| antes | /best-ai-shorts-generators | chatgpt_explicito | 2 | 1 | 0 | 50 | 0 | referencia_antes |
| antes | /best-ai-shorts-generators | duckduckgo | 1 | 0 | 0 | 0 | 0 | referencia_antes |
| antes | /best-ai-shorts-generators | google | 11 | 0 | 0 | 0 | 0 | referencia_antes |
| antes | /best-ai-shorts-generators | origem_nao_gravada | 4 | 0 | 0 | 0 | 0 | referencia_antes |
| antes | /cheapest-ai-shorts-maker | origem_nao_gravada | 205 | 0 | 0 | 0 | 0 | referencia_antes |
| antes | /free-ai-shorts-generator | afiliado_rotulado | 222 | 1 | 0 | 0.45 | 222 | referencia_antes |
| antes | /free-ai-shorts-generator | facebook | 6 | 0 | 0 | 0 | 5 | referencia_antes |
| antes | /free-ai-shorts-generator | origem_nao_gravada | 8 | 2 | 1 | 25 | 0 | referencia_antes |
| antes | /free-ai-shorts-generator | outra_origem_gravada | 6 | 0 | 0 | 0 | 1 | referencia_antes |
| antes | /free-ai-shorts-generator | youtube | 467 | 2 | 1 | 0.43 | 467 | referencia_antes |
| antes | /free-script-generator | origem_nao_gravada | 7 | 0 | 0 | 0 | 0 | referencia_antes |
| antes | /free-script-generator | outra_origem_gravada | 19 | 0 | 0 | 0 | 0 | referencia_antes |
| antes | /how-much-do-instagram-reels-pay | bing_explicito | 1 | 0 | 0 | 0 | 0 | referencia_antes |
| antes | /how-much-do-instagram-reels-pay | chatgpt_explicito | 54 | 0 | 0 | 0 | 0 | referencia_antes |
| antes | /how-much-do-instagram-reels-pay | google | 1 | 0 | 0 | 0 | 0 | referencia_antes |
| antes | /how-much-do-instagram-reels-pay | instagram | 1 | 0 | 0 | 0 | 0 | referencia_antes |
| antes | /how-much-do-instagram-reels-pay | origem_nao_gravada | 17 | 0 | 0 | 0 | 0 | referencia_antes |
| antes | /how-much-do-youtube-shorts-pay | bing_explicito | 188 | 2 | 1 | 1.06 | 0 | referencia_antes |
| antes | /how-much-do-youtube-shorts-pay | duckduckgo | 84 | 1 | 0 | 1.19 | 0 | referencia_antes |
| antes | /how-much-do-youtube-shorts-pay | google | 1 | 0 | 0 | 0 | 0 | referencia_antes |
| antes | /how-much-do-youtube-shorts-pay | origem_nao_gravada | 22 | 0 | 0 | 0 | 0 | referencia_antes |
| antes | /how-much-do-youtube-shorts-pay | outra_origem_gravada | 42 | 1 | 0 | 2.38 | 0 | referencia_antes |
| antes | /state-of-ai-shorts-2026 | chatgpt_explicito | 10 | 3 | 0 | 30 | 0 | referencia_antes |
| antes | /state-of-ai-shorts-2026 | origem_nao_gravada | 22 | 0 | 0 | 0 | 0 | referencia_antes |
| depois | /how-much-do-youtube-shorts-pay | bing_explicito | 1 | 0 | 0 | 0 | 0 | aguardar_14_dias |
| depois | /how-much-do-youtube-shorts-pay | origem_nao_gravada | 1 | 0 | 0 | 0 | 0 | aguardar_14_dias |

## Cobertura, fronteira e gate

**EVIDÊNCIA DE PRODUÇÃO.** Antes global: 290 contas externas novas;279 com sessão elegível e11 sem atribuição. Nas onze entradas:1.409 sessões,13 contas e3 primeiros filmes; a sessão ambígua de /free-ai-shorts-generator não recebe cadastro. Depois global no corte:0 contas externas novas; nas onze entradas só2 sessões, ambas em YouTube Pay,0 contas/filmes. Não é uma amostra de14dias. A classe de bot é heurística, não certificado de humano. [Recibo completo](MEDIDA.json) inclui âncoras brutas, bots marcados e cobertura.

**TESTADO LOCALMENTE / SELECTS SINTÉTICOS NO POSTGRES.** A própria consulta foi executada sobre VALUES sintéticos em três cortes: antes fixo10sessões/5contas/1filme; depois0→1filme amadurece no corte correto. Quatorze mutantes rejeitados: corte global de vínculo/cadastro/filme, sessão duplicada, conta repetida em outra página, bot, sessão da casa, clipe como filme, origem ausente como ChatGPT filtro das páginas aplicado cedo demais, perda do alias youtube, UTM passando na frente do referrer e4% tratado como sucesso por página ou origem. [Prova](PROVA-SINTETICA.json), fonte da fixture e fingerprints permitem reexecução sem cliente real. Um caso de zero cadastro pós-ativação revelou cobertura ausente; o LEFT JOIN corrigiu explicitamente para zero e a repetição no mesmo corte manteve o antes idêntico.

**PREPARADO / REPRODUZÍVEL MANUALMENTE.** A primeira baseline [BASELINE-14D.json](BASELINE-14D.json) foi preservada e seu SHA continua intacto. A baseline válida por origem é a [reconciliada v2](BASELINE-14D-V2.json), congelada por SHA-256 em BASELINE-14D-V2.sha256. Não sobrescrever; eventual ingestão retroativa exige recibo de reconciliação. Cada fase limita âncora, vínculo, perfil e histórico ao próprio corte: sessão antes17h28 com cadastro depois não aumenta o antes. Sem uma nova âncora elegível depois, conta fica sem atribuição, não ganha uma página inventada. Não é uma coorte de chegada com acompanhamento ilimitado.

**DECISÃO DO QUADRO / PREPARADO.** Gate4% somente ao completar14dias, em **08/12/2026 às17h28 BRT**, por página da caixa. A consulta mostra taxa total operacional e as origens separadas; a decisão deve conferir mesma página/origem para evitar mistura de composição. Somente **acima de4%** passa; igualdade exata e abaixo exigem rever/retirar a caixa segundo quadro, tanto por página quanto por origem. O controle real SELECT1/25 devolveu4% e nao_supera_4pct_CEO_rever_caixa nas duas dimensões. Sem denominador não se interpreta0%. Amostra pequena não prova causalidade. Esta entrega não agenda execução nem implementa rollback automático. As quatro URLs novas recebem medida, não herdam automaticamente o gate da caixa.

## Como repetir

**PREPARADO / OFFLINE.** Obter o timestamp UTC do banco, preservar microssegundos e executar na worktree: node scripts/prepare-citacoes-caixa-2411.mjs --cut ISO_UTC --out C:/kineo-wt/ARQUIVO_NOVO.sql. O preparador só lê a lista canônica local, produz SELECT com filtro da casa derivado sem expor endereços e recusa sobrescrita ou destino resolvido fora de C:/kineo-wt. Não usa credencial nem faz chamada ao banco. A CEO ou rotina autorizada executa o SELECT via conector e salva novo recibo com hash. Não confundir preparar SQL com execução automática.

**FONTES DO MÉTODO.** docs/semana-2/ORIGEM-CONFERIDA-2411.md (CEO24/11), consulta/fronteira revisadas em8c0ec7917 e o código citado acima. Changelog Supabase consultado24/11: https://supabase.com/changelog.md; sem alteração de schema, auth, SDK ou RLS. Sem push, publicação, gasto, e-mail ou escrita no banco.

## Reconciliação de origem antes do commit

**CONTRADIÇÃO CORRIGIDA / EVIDÊNCIA DE PRODUÇÃO.** A classificação reutilizada não reconhecia os aliases que o beacon realmente grava. No SELECT diagnóstico:467sessões referrer=youtube+UTMaffiliate,5facebook+affiliate,1facebook sem rótulo e1instagram. O total do antes continuou1.409/13/3; somente a classificação mudou. Em /free-ai-shorts-generator agora há YouTube467sessões/2contas/1filme (todas467rotuladas afiliado), Facebook6/0/0 (5rotuladas) e afiliado sem referrer atestado222/1/0. Não atribuir o YouTube ao canal da Kineo: o rótulo de afiliado e o host não identificam o dono do canal. A linha inicial e a corrigida estão preservadas; nenhum recibo original foi sobrescrito.

**TESTADO EM SELECT SINTÉTICO.** O caso de14dias completos com1conta/25sessões passa por toda a consulta, retorna4% e não atingiu por página e por Bing. O primeiro ensaio desse caso revelou colisão entre data de observação e a âncora da fixture; a troca foi qualificada por live_from, só três consultas de gate foram repetidas. As outras14consultas geradas ficaram byte a byte iguais. Nenhuma linha de cliente foi usada na prova.

# Matriz dos oito motores

Atualização inicial: 14/09/2026. Responsável pela consolidação: Board.

QUESTÃO PENDENTE: não importar aprovações genéricas de dry-run como validação audiovisual. Estados abaixo são deliberadamente separados; cada evidência nova deve trazer data, SHA, entrada, duração e idioma.

| Motor | Reconciliação offline neste ciclo | Validação audiovisual neste ciclo | Próxima evidência |
| --- | --- | --- | --- |
| Kineo 1 | Parcial em c6cac456: Board confirmou qualidade 29/29, contrato 13/13, dry-run 18/18, tsc; matriz R3 reclassificada aceita, não todas as combinações | Não executada | LEGENDAS-R1: função real compartilhada; brief no fast permanece estrutural |
| Seedance 1.5 | GO do guardião 1d34e5b2 (14/09, CLASSICOS-R6): Board 429 verificações/48 simulações e tsc; três entradas a 60s até primeiro payload por fatias reais | Não executada | LEGENDAS-R1; manter limites de mocks e cobertura parcial |
| Kling 2.5 | GO do guardião b681b0d8 (14/09, CLASSICOS-R4): Board 365 verificações/42 simulações e tsc; três entradas a 60s encadeadas por fatias reais até primeiro payload, mais i2v | Não executada | Manter limites: demais cenas não despachadas; políticas injetadas; sem HTTP completo/filme |
| Veo 3.1 | GO do guardião 1d34e5b2: três entradas a 60s até primeiro payload, campos próprios; 429 verificações compartilhadas, não exclusivas deste motor | Não executada | Reconciliar footage/timeline sem chamar 3,1 pal/s de duração real; LEGENDAS-R1; custo 90s/5b2dc929 segurado |
| MiniMax H3 | GO técnico de fidelidade 83aeef34 em 14/09 16:18 UTC: 117/117, Board 18/18, tsc limpo (FID-V4-R5); publicação pendente | H3 anterior reprovado visualmente; nenhum novo render | Publicação autorizada + deploy + repetir Lituya sob gate financeiro; áudio e filme completos |
| Kling 3 | Parcial MOTORES-ESPECIFICOS-R2: router/payload reais executados em cb5f746b; 213 checks compartilhados e tsc; não entrada completa | Não executada | Mapa precisa distinguir host TTS do fallback nativo; não repetir payload aprovado |
| Omni Flash | Parcial MOTORES-ESPECIFICOS-R2: router/payload, caps 10/10 e apara-folga reais executados; sem filme | Não executada | Mapa de áudio host/nativo/apoio; duração entregue desconhecida |
| Seedance 2.5 | R10: GO técnico restrito a 8b973fc0, 141/141 + tsc; copy corrigida, servidor/ledger e consumidor fechados nos critérios acordados. Errata R6 preservada: Retry genérico já era bloqueado antes | Não executada | INTEGRACAO-R1 dos cinco pacotes; visual do painel pendente (SSR não prova aparência). Manter limites de mocks/memória local; somente interno |

Para cada célula de aprovação registrar: roteiro preservado; ação/escala/personagens; pedido/plano/arquivo; narração; legenda; música; confiabilidade; testes/SHA. Usar NÃO VALIDADO onde faltar escuta, filme ou evidência. Testes herdados podem ser aproveitados se reconciliados contra o SHA; não repeti-los para ocupar tempo.

## Próxima etapa comum — INTEGRACAO-R1 (14/09, R10)

ATUALIZAÇÃO INTEGRACAO-R2, 14/09 22:20 UTC: **GO_TECNICO restrito ao integrado 5114ea39db6a2d3a106d10af73a7ad118f1c76f0**. Board executou os 14 testes pertinentes: 13 scripts verdes, despacho-vazio com 49/51 (duas proibições de escopo: compose/hollywood), tsc exit 0. Base do teste vermelho: 51/51. Cinco pacotes preservados; nenhum bloqueador funcional novo reproduzido nos critérios acordados. **Não publicado; autorização pontual de escopo pendente. Nenhum motor validado em vídeo/áudio neste integrado.** Próximo comum para os oito: autorização única → equivalência/testes no SHA final → publicação/deploy confirmado → canário individual sob autorização financeira identificada. Não repetir investigações fechadas nem confundir teste verde com qualidade de filme. Veo 90s/custo excluído. Detalhes e limites em BOARD.md, INTEGRACAO-R2.

TESTADO LOCALMENTE / GO_TECNICO por pacote, ainda não integrado/publicado: fidelidade 83aeef34; guardião clássico 1d34e5b2; legendas a45237b7; música 82814b12; específicos 8b973fc0. As referências históricas a LEGENDAS-R1/MUSICA-R1 nas células acima foram atendidas pelos eixos compartilhados abaixo; não refazê-las. Próxima evidência para TODOS é o SHA integrado e a bateria pertinente, preservando os limites de cobertura por motor. Merge-tree limpo relatado pelo executor não substitui teste integrado. Nenhum dos oito ganhou validação audiovisual neste piloto. Veo 90s/custo continua fora.

## Base compartilhada — legendas (14/09, LEGENDAS-R2)

TESTADO LOCALMENTE: função real buildCaptionsFromWhisperWords, três chamadores inspecionados (clássico direto, bloco Hollywood, fala por clipe), NÃO todas as requisições dos oito motores executadas. Board reproduziu 41/47 em c0aa2642 e confirmou 47/47 + tsc em **a45237b7c06f26fd7ffb7b555cae3d7a8295c9de**: GO técnico restrito a preservar palavras acentuadas antes confundidas e evitar o início depois da janela no controle de 0,95s. Código segurado, não publicado; arquivo/áudio NÃO VALIDADOS. Piso de 0,1s ainda pode ultrapassar a janela no fim (1,05s no controle); não equivale a validação de sincronia universal. Próximo: MUSICA-R1 no guardião existente.

## Base compartilhada — música (14/09, MUSICA-R2)

TESTADO LOCALMENTE: Board reproduziu 146/174 em b1b0da1f e confirmou **176/176 + tsc** em **82814b12452d18eb92ad1c756219049f11398170**, GO técnico restrito. Seletor/provedor mockado e três blocos reais de compose/unlock: silêncio PT respeitado sem chamadas, negação/vocabulário PT e alias épica corrigidos. Código SEGURADO, não publicado; áudio/mix NÃO VALIDADOS. Mapa dos motores é estrutural, não oito filmes testados. Inferência genérica de ação ainda limitada; unlock não garante preservar MP3 originalmente gerado. Próximo: MOTORES-ESPECIFICOS-R1 para Kling 3, Omni e S25, sem reabrir os GO anteriores nem gastar.

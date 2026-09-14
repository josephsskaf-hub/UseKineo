# Matriz dos oito motores

Atualização inicial: 14/09/2026. Responsável pela consolidação: Board.

QUESTÃO PENDENTE: não importar aprovações genéricas de dry-run como validação audiovisual. Estados abaixo são deliberadamente separados; cada evidência nova deve trazer data, SHA, entrada, duração e idioma.

| Motor | Reconciliação offline neste ciclo | Validação audiovisual neste ciclo | Próxima evidência |
| --- | --- | --- | --- |
| Kineo 1 | Parcial em c6cac456 (14/09 16:34 UTC): Board confirmou qualidade 29/29, contrato 13/13, dry-run 18/18, tsc; cobertura estrutural/helpers compartilhados, não todas as combinações | Não executada | CLASSICOS-R2: distinguir testes de helper/estrutura de caminho completo e arquivo |
| Seedance 1.5 | Chamador real com cenas prontas e helpers compartilhados; R3 reclassificado aceito, não cadeia nominal completa de entradas | Não executada | CLASSICOS-R5: reutilizar teste nominal nas três entradas a 60s |
| Kling 2.5 | GO do guardião b681b0d8 (14/09, CLASSICOS-R4): Board 365 verificações/42 simulações e tsc; três entradas a 60s encadeadas por fatias reais até primeiro payload, mais i2v | Não executada | Manter limites: demais cenas não despachadas; políticas injetadas; sem HTTP completo/filme |
| Veo 3.1 | Chamador real com cenas prontas no guardião compartilhado; entrada nominal pendente | Não executada | CLASSICOS-R5 a 60s; custo 90s/5b2dc929 sem aprovação |
| MiniMax H3 | GO técnico de fidelidade 83aeef34 em 14/09 16:18 UTC: 117/117, Board 18/18, tsc limpo (FID-V4-R5); publicação pendente | H3 anterior reprovado visualmente; nenhum novo render | Publicação autorizada + deploy + repetir Lituya sob gate financeiro; áudio e filme completos |
| Kling 3 | Pendente | Não executada | Reconciliar fala nativa e cenas |
| Omni Flash | Pendente | Não executada | Reconciliar duração e prompts |
| Seedance 2.5 | Pendente; acesso interno | Não executada | Verificar somente modos disponibilizados internamente |

Para cada célula de aprovação registrar: roteiro preservado; ação/escala/personagens; pedido/plano/arquivo; narração; legenda; música; confiabilidade; testes/SHA. Usar NÃO VALIDADO onde faltar escuta, filme ou evidência. Testes herdados podem ser aproveitados se reconciliados contra o SHA; não repeti-los para ocupar tempo.

# Matriz dos oito motores

Atualização inicial: 14/09/2026. Responsável pela consolidação: Board.

QUESTÃO PENDENTE: não importar aprovações genéricas de dry-run como validação audiovisual. Estados abaixo são deliberadamente separados; cada evidência nova deve trazer data, SHA, entrada, duração e idioma.

| Motor | Reconciliação offline neste ciclo | Validação audiovisual neste ciclo | Próxima evidência |
| --- | --- | --- | --- |
| Kineo 1 | Pendente | Não executada | Reconciliar gates e casos existentes, não reconstruir |
| Seedance 1.5 | Pendente | Não executada | Proteger baseline de uso principal |
| Kling 2.5 | Pendente | Não executada | Reconciliar duração/fala/imagem |
| Veo 3.1 | Pendente | Não executada | Separar custo de 90s; 5b2dc929 sem aprovação |
| MiniMax H3 | 0d45b028 revisado em 14/09 16:04 UTC: 100/100, tsc limpo, controles anteriores 13/13; 5 verificações novas falham em 2 condições (FID-V4-R3) | H3 anterior reprovado visualmente; nenhum novo render | Restringir classes ambíguas had/would e ausência ao sujeito correto; depois repetir Lituya sob gate pago |
| Kling 3 | Pendente | Não executada | Reconciliar fala nativa e cenas |
| Omni Flash | Pendente | Não executada | Reconciliar duração e prompts |
| Seedance 2.5 | Pendente; acesso interno | Não executada | Verificar somente modos disponibilizados internamente |

Para cada célula de aprovação registrar: roteiro preservado; ação/escala/personagens; pedido/plano/arquivo; narração; legenda; música; confiabilidade; testes/SHA. Usar NÃO VALIDADO onde faltar escuta, filme ou evidência. Testes herdados podem ser aproveitados se reconciliados contra o SHA; não repeti-los para ocupar tempo.

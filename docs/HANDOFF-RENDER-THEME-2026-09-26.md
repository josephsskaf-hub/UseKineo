# Aparência do render — 26/09/2026

DECISÃO DO FUNDADOR: o painel escuro de progresso e Current project destoavam do shell Light; fazer a área acompanhar o tema.

IMPLEMENTADO: GenerateClient usa tokens de aparência no fundo, anel, barra, estágios cinematográficos/Kineo 1 e Current project (incluindo detalhes e próxima ideia). appearance.css deixa de forçar tokens Dark nestas duas superfícies. Resultados/player e ADM mantêm seus escopos anteriores. Sem alteração de etapas, percentuais, polling, tempo, cobrança, ações ou textos.

TESTADO LOCALMENTE: typecheck bruto; sharing safety 70; five improvements 646; render recovery 44. JSX real extraído em preview offline, sem APIs ou credenciais, com projeto fictício. Conferidos Light, Dark, Cinematic e Kineo 1; celular de 390px sem overflow horizontal. A aba de render em andamento do fundador não foi recarregada.

ARTEFATO: outputs/render-theme-20260926/antes-depois.html no workspace visual; reproduzido por scripts/preview-render-appearance.mjs. Base de comparação 6ccf1c74.

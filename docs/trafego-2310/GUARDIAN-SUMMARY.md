# Guardião independente — KINEO-TRAFEGO-2310

**TESTADO LOCALMENTE — 23/10/2026.** Base imutável: `895d6c99638dc0af65e11ad761f4999141587fa7`. Código final: `a8410090fe89406b74e3c4b7084c39f9e0bf1d64`.

- **TESTADO LOCALMENTE:** tsc final verde, exit 0, sem diagnóstico: TypeScript 5.9.3 / Node 24.18.0, `node node_modules/typescript/bin/tsc --noEmit --incremental false`. Evidência: `final-tsc.json`.
- **TESTADO LOCALMENTE:** bateria completa congelada no 09a4047f: 45 testes positivos (41 anteriores + 4 novos) e 4 mutantes GPT esperados. Após a correção real de organização do llms no a8410090, os seis guardiões afetados foram repetidos e passaram. Evidência: `candidate-critical.json`, `final-affected.json`, `GUARDIAN-MATRIX.json`.
- **TESTADO LOCALMENTE:** resultado consolidado dos 41 guardiões anteriores: 40 verdes, 1 vermelho preexistente, zero vermelho novo. Os 4 novos guardiões passaram.
- **FATO CONFIRMADO / TESTADO LOCALMENTE:** a falha remanescente é a mesma no baseline e no candidate: `test-locale-readiness.mjs:14`, ausência da entrada Hindi para “Any video engine — premium engines use more credits per film”. Não foi alterada nem ocultada.
- **TESTADO LOCALMENTE:** motores-GEO teve timeout de VM no baseline sob contenção; a rodada completa do candidate passou os 38 checks, incluindo os 27 mutantes. A regressão inicial de Ads (1n/1o) foi corrigida no llms real; o teste antigo, sem alteração de asserções ou shim, passou 41/41 no a8410090.
- **TESTADO LOCALMENTE:** páginas citáveis: 6 blocos, respostas de 40–60 palavras, 5 FAQs por bloco, data, metadados e BRL preservados. Índice: 151 páginas claras + 2 Cartoon, sem faltantes/duplicatas no fixture. O total offline de 593 URLs usa SCRIPT_VERTICAL_SLUGS vazio e não deve ser confundido com o sitemap de produção.
- **TESTADO LOCALMENTE:** alarme: 42 checks e 8/8 mutantes mortos; desfaz da tarefa: 169 checks; mutantes antigos: admin 17/17, roteiro 10/10, com restauração exata dos bytes. Os 4 mutantes GPT esperados também morreram.
- **FATO CONFIRMADO / LIMITAÇÃO:** a base tsc inicial foi interrompida por coordenação de recursos e não é tratada como verde. O código final passou o compilador completo. Provas executadas sem ler arquivos de ambiente; a rede foi bloqueada no limite dos processos da bateria completa, com variáveis dos provedores pertinentes filtradas. Nenhuma validação de entrega do e-mail em produção foi executada por este guardião.

**SUGESTÃO:** entrega revisável na branch, com este vermelho Hindi preexistente registrado; publicar e validar o alarme em produção permanecem etapas distintas da prova local.

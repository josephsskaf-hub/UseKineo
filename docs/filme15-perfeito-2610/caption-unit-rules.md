# Agrupamento de número e unidade — 26/10/2026

**EVIDÊNCIA DE PRODUÇÃO:** a inspeção de dois quadros existentes do caso anônimo `8da074c197bc` mostrou número separado da unidade entre blocos. Fonte e limites: `caption-visual-audit.json`, consulta em 26/10/2026, janela fixa de 19/10 15:12Z a 26/10 15:12Z. Nenhum render ou julgamento pago foi executado.

**FATO CONFIRMADO — IMPLEMENTADO:** `lib/filmes/faceless15.ts:198` reconhece somente numeral em algarismos e uma lista fechada de unidades de tempo/medida EN/PT/ES. A fronteira entre eles não pode partir a frase quando existe partição de 2–5 tokens que a respeite (`:234`). Pausa sem fim de frase explícito não desfaz o par (`:285`). A correção conserva texto, ordem e timestamps; não junta dois tokens em um para contornar o limite. Chamadores com teto customizado incompatível conservam a partição anterior (`:239`).

**TESTADO LOCALMENTE:** `scripts/test-filme15-numero-unidade-2610.mjs` exercita o trecho real curto anonimizado, unidades EN/PT/ES, decimal, pausa, fim de frase explícito, preservação de tokens/tamanho e a legenda canônica. O mutante que desliga o reconhecimento restaura a separação medida. Os guardiões de repetição e legenda canônica também passam nesta worktree.

**QUESTÃO PENDENTE / DESCONHECIDO:** não existe identificação confiável de nomes próprios nesta API. Capitalização não basta: a legenda é convertida para maiúsculas e palavras comuns também podem iniciar frases. Não foi adicionada heurística que aglutina palavras capitalizadas. **SUGESTÃO:** uma evolução pode receber entidades/frases protegidas de uma fonte canônica assinada e verificar cada uma contra a narração, com regressões específicas.

**FATO CONFIRMADO — LIMITAÇÃO:** o helper `lib/free15CanonicalCaptions.ts` conserva geometria e fonte do source. O agrupamento de palavras não corrige sozinho a oclusão de rosto observada em cinco casos. Não foi alterado layout nem posição de texto; não se declara validação visual de um novo render.

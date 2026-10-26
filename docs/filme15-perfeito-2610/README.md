# KINEO-FILME15-PERFEITO-2610

**FATO CONFIRMADO — PREPARADO, 26/10/2026:** candidato restrito ao nascimento assinado Seedance 1.5 / 15 s. Sem deploy, render pago ou leitura de arquivos `.env`. A consulta de produção desta tarefa fez somente `SELECT` pelo conector Supabase.

## Base e limite de entrega

**FATO CONFIRMADO — BASE, 26/10/2026:** `origin/main` em `2072944f17eab603bc40fcaa0d576d3b0ce9c78f`, após novo `git fetch`, contém FILME15-FIEL e FILME15-ROSTO. A implementação anterior de rosto fixo desta branch foi retirada por orientação do fundador. Folha, elenco, protagonista e voz ficam sob o trabalho do Claude. Os arquivos protegidos e o bloco META95-PERSONAGEM permanecem iguais à base.

## O que mudou

- **FATO CONFIRMADO — CAUSA / CORREÇÃO:** três clipes de seis segundos não definiam o comprimento final: a duração medida da voz era o relógio da montagem. Filtros posteriores ao escritor podiam encurtar a fala. A IA recebe uma tentativa de acrescentar texto preservando a linha aceita antes do plano (`app/api/generate-video-cinematic/route.ts:6586`); verbatim não é reescrito. O compositor aplica piso de 14 s apenas com flag derivada do claim assinado, preservando toda a fala e a imagem disponível (`lib/compose.ts:2116`).
- **FATO CONFIRMADO — IMPLEMENTADO:** o portão roda antes de liquidação, persistência, e-mail e resposta com URL (`app/api/compose/status/[renderId]/route.ts:594`). Ele usa a precisão original do fornecedor, portanto 13,96 s não vira aprovação por arredondamento (`lib/compose.ts:3825`).
- **FATO CONFIRMADO — IMPLEMENTADO:** uma tentativa de reparo por filme, com estado assinado e compare-and-swap antes de gastar. Legenda: somente elementos de legenda. Cena: somente o clipe localizado pelos quadros e pela timeline, usando o payload assinado e a mesma referência. Voz, trilha e demais cortes permanecem. Submissão ambígua não é repetida (`lib/free15Gate.ts:107`, `lib/free15GateServer.ts:46`).
- **FATO CONFIRMADO — IMPLEMENTADO:** segundo defeito ou evidência insuficiente fecha o portão como falha. A entrega só prossegue depois de confirmar `refunded_at` no ledger e gravar `free15_gate_failed`; histórico registra zero crédito usado (`lib/free15GateServer.ts:101`, `app/api/compose/status/[renderId]/route.ts:1131`). A fonte aprovada reparada é assinada novamente para a refação posterior não ressuscitar o clipe rejeitado.
- **FATO CONFIRMADO — IMPLEMENTADO:** repetição falada deixa de ser removida após a partição das legendas (`lib/filmes/faceless15.ts:289`). O fallback canônico usa o mesmo agrupador também antes da primeira montagem, em vez do corte cego de quatro palavras (`app/api/compose/route.ts:3552`). Tempos proporcionais são explicitamente aproximados e não são evidência de áudio (`lib/free15CanonicalCaptions.ts:1`).
- **FATO CONFIRMADO — ESCOPO:** 35/60/90 não recebem a flag de duração nem o portão. O campo histórico arredondado de duração e as notas existentes dos demais motores continuam; campos adicionais preservam evidência para o consumidor novo do 15 s.

## Medição das legendas

**EVIDÊNCIA DE PRODUÇÃO — 26/10/2026:** [caption-audit.json](caption-audit.json) congela a janela `[2026-10-19T15:12Z, 2026-10-26T15:12Z)`, entregas concluídas com pedido de 15 s confirmado e contas internas excluídas: 170 filmes de 170 pessoas; 26 filmes com teto de legenda; 25 RenderScripts disponíveis. Os casos são anonimizados, um por filme. Eventos de karaoke não foram contados como novas legendas.

**EVIDÊNCIA DE PRODUÇÃO / LIMITAÇÃO:** nos 25 sources, dez casos têm candidatos lexicais a órfã/conector; sete permitem confirmação textual pela correspondência integral com o roteiro. Dois traces proporcionais confirmam o fallback de quatro palavras. Quinze sources não apresentam essa violação lexical simples; atribuição visual/semântica continua desconhecida. ASR bruto não foi obtido. Vinte e cinco avaliações antigas não registravam `evidence_status`; não foram chamadas de evidência completa pelo contrato atual.

**CONTRADIÇÃO DE COORTE:** os 208 filmes / 25 legendas do pedido não foram reproduzidos nessa janela e nesses critérios. Incluir internos na mesma coorte produz 192 filmes / 171 pessoas / 30 tetos, não os números originais. Sem os IDs ou corte temporal original, uma coorte não substitui a outra.

## Verificação e próximo passo

**TESTADO LOCALMENTE — 26/10/2026:** regressões de repetição EN/PT/ES, trecho real anonimizado do fallback proporcional, duração 13,96/14, concorrência, replay, fonte reparada assinada e reparo só de legenda. O guardião executa mutantes do comportamento atual. O desfaz compara os bytes contra a base imutável e conserva os manifests antigos.

**QUESTÃO PENDENTE:** resultado final da bateria completa e TypeScript desta cópia isolada será registrado no resumo de QA. A primeira execução no OneDrive foi interrompida por bloqueio de leitura dos objetos Git; timeout dessa execução não é classificado como defeito do produto.

**SUGESTÃO — PRÓXIMO PASSO RECOMENDADO:** resolver as falhas não permitidas da bateria antes de merge. Validação de qualidade em filme real permanece não executada: o pedido proíbe render pago, e teste com fornecedores falsos não comprova qualidade entregue em produção.

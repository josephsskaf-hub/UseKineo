# KINEO-ADS-CENA-RESPALDO-2110 — BUG 3 do AJUSTE

Data: 22/10/2026. Base: `68d3c13b935a14c17d3a6e7228fe5eab1be027ab`.

**EVIDÊNCIA DE PRODUÇÃO — relato Cowork repassado pelo fundador, 22/10/2026 às 19:05:** creme UGC PT passou em zero de três ensaios; tênis product EN passou em um de três. As recusas informadas foram `cena_plan_failed`, com `reason:cena_unsubstantiated_script`. Os rascunhos completos do GPT de produção não foram fornecidos nesta tarefa; não houve acesso a banco ou logs remotos.

**FATO CONFIRMADO:** na base, o mesmo erro reúne excesso de palavras, números/alegações sem fonte, regras de honestidade, falta de benefício digitado e texto genérico. A correção anterior enviava apenas o código genérico na segunda tentativa (`lib/ads/cena/ajustePlan.ts:21` e `lib/ads/cena/plan.ts:80`, na base citada). Portanto o código do erro sozinho não identifica a frase ou regra que recusou cada pedido real.

**IMPLEMENTADO / FATO CONFIRMADO:** o diagnóstico identifica campo, sentença e regra (`lib/ads/cena/ajusteRespaldo.ts:49`); a primeira geração pode ser corrigida pelo GPT duas vezes (`lib/ads/cena/ajusteRespaldo.ts:124`). Cada correção recebe os trechos recusados e a instrução de usar somente frase, oferta e benefícios digitados, sem superlativos inventados. Depois das três respostas, o reparo determinístico altera somente as sentenças recusadas ou acrescenta o fato digitado ausente (`lib/ads/cena/ajusteRespaldo.ts:93`). As linhas válidas são preservadas; o resultado passa novamente pelo validador completo (`lib/ads/cena/ajustePlan.ts:16`).

**IMPLEMENTADO / FATO CONFIRMADO:** o prompt pede gancho neutro em PT/EN, extraído do input, como pergunta ou benefício literal (`lib/ads/cena/ajustePlan.ts:7`). O validador identifica as metáforas e os superlativos sem respaldo pedidos pelo fundador, incluindo “on clouds”, “like never before” e “elevate your game” (`lib/ads/cena/ajusteRespaldo.ts:49`). O fallback usa gramática neutra em torno dos fatos digitados; não acrescenta benefícios, números, urgência ou reputação. Frases já válidas não recebem prefixos como “It offers”.

**IMPLEMENTADO / FATO CONFIRMADO:** os substantivos comuns reconhecidos do nome do produto ficam em minúscula dentro da frase, preservando a grafia digitada dos nomes próprios (`lib/ads/cena/ajusteRespaldo.ts:33`). A pontuação e o início de sentença respeitam marcas como `iPhone` (`lib/ads/cena/ajustePlan.ts:22`). O título do produto e a montagem não foram redesenhados.

**IMPLEMENTADO / FATO CONFIRMADO:** falhas de planejamento retornam `reason_detail` com campo, frase e regra quando disponíveis, mantendo o `reason` curto (`lib/ads/cena/internalAjuste.ts:41`). Texto obrigatório incompatível com a régua do AJUSTE recebe erro explícito 422, sem débito (`lib/ads/cena/internalAjuste.ts:42`); o sistema não publica afirmação sem fonte para contornar a validação. O reparo de texto sem respaldo não termina em 502 nas fixtures aprovadas.

**FATO CONFIRMADO / ESCOPO:** as ligações de produto são limitadas ao planejador AJUSTE, seu validador e a resposta interna. `CENA95_LIVE=false`, o acesso só interno, o caminho 9,5 preservado, os adaptadores de vídeo, música, montagem, preço, créditos e estorno não foram alterados. `lib/kidsVenda`, `lib/kidsCartoon`, `lib/engineWall.ts` e `lib/homeVideoCuration.ts` permanecem fora desta mudança. Não houve leitura de `.env`, chamadas pagas, banco, build, PR ou deploy.

## Provas offline

**TESTADO LOCALMENTE:** a reprodução da base com POST/`cenaJson` reais e limites externos em dublês distinguiu dois casos: “Imagine running on clouds every day!” isolado passa indevidamente na base; combinado com benefício que omite o fato digitado, o pedido é recusado com o erro informado. Isso não é apresentado como captura do rascunho real de produção.

**TESTADO LOCALMENTE — 22/10/2026:** o guardião `scripts/test-ads-cena-respaldo-2110.mjs` passou integralmente com a rota POST, `cenaJson` e start reais, usando dublês nas fronteiras de GPT, mídia, banco e cobrança. As fixtures PT/EN cobrem primeira resposta válida, correção na segunda ou terceira resposta e insistência do GPT até o reparo neutro. Incluem “Imagine running on clouds every day!”, frases boas vizinhas, oferta sem duplicação, benefício ausente, `Face Cream`, `iPhone`, erro com frase detalhada e núcleo obrigatório impossível com 422 sem débito. Ensaio e pedido real usam o mesmo plano; o ensaio não grava nem debita. Os 38 mutantes novos falharam por asserção comportamental, com sintaxe e imports válidos. Retomada passou novamente com seus 33 mutantes.

**TESTADO LOCALMENTE — comparação completa contra `68d3c13b9`:**

| Conjunto | Scripts | Verdes | Vermelhos |
|---|---:|---:|---:|
| Base `68d3c13b9`, execução fresca | 990 | 841 | 149 |
| Candidata consolidada `abf604b7` | 991 | 842 | 149 |

**TESTADO LOCALMENTE / AUDITORIA:** zero vermelho novo. Os 990 scripts compartilhados mantêm os mesmos 149 nomes e códigos vermelhos; os 697 registros de falha, resumos e detalhes, com suas multiplicidades, não tiveram adição ou remoção. Os 88 cabeçalhos de exceção de cada conjunto também são iguais após normalizar apenas os caminhos de execução declarados. A recontagem dos 14 guardiões Ads selecionados registrou 285 detecções de mutantes nos logs desta rodada: 189 históricas, 33 de Retomada, 25 de outros guardiões existentes e 38 novas de Respaldo; todos esses guardiões terminaram com exit 0.

**TESTADO LOCALMENTE / MÉTODO:** a rodada integral foi executada em `69d53440`. Ela encontrou dois erros de composição nos guardiões: o teste novo removia Pages antes do snapshot Respaldo; o guardião Pages ainda lia a camada Respaldo e contava commits futuros na própria entrega. Os dois foram corrigidos mantendo as verificações de igualdade, hash, inventário, mutantes e prefixo/TRAVA. Foram então executados integralmente, em série, quatro alvos em `abf604b7`: Respaldo, Pages, Retomada e Pacing, todos verdes. Os outros 987 resultados foram preservados após prova de equivalência das fontes: entre os congelamentos mudaram somente dois guardiões MJS e a tabela de desfaz JSON; as cinco entradas anteriores da tabela são idênticas e só a entrada Pages foi acrescentada. Os logs brutos das duas falhas corrigidas permanecem nos recibos, sem substituição ou ocultação.

**TESTADO LOCALMENTE:** o desfaz estrito restaura as seis fontes anteriores exatamente à base, com hashes antes/depois, LF/CRLF, caminho Windows, idempotência e rejeição de fonte divergente; a prova direta teve 42 verificações. O inventário fecha em seis arquivos modificados e cinco novos. Pages e Retomada removem a camada mais nova antes das anteriores; a âncora do guardião Pages é a própria entrega validada por seu prefixo e TRAVA, sem whitelist nova para os commits Ads.

**TESTADO LOCALMENTE:** TypeScript verde pelo comando `node node_modules/typescript/bin/tsc --noEmit --incremental false`, sessão real 57717, exit 0 com fontes congeladas em `ceea518c`. O resultado foi reutilizado somente depois de comparar os 1.826 inputs TypeScript/config com os congelamentos posteriores. Nenhuma duração de compilação foi estimada. A base também teve compilação fresca com exit 0.

**FATO CONFIRMADO / RECIBOS:** os resultados individuais, logs sem edição, comparação de checks/exceções, equivalência e recibos de compilação ficam em `.claude/ads-cena-respaldo-proof-2210/` (artefatos locais ignorados pelo Git). As rodadas integrais estão em `ads-cena-respaldo-origin-main.json` e `ads-cena-respaldo-final-69d53440.json`; as quatro execuções finais estão em `ads-cena-respaldo-delta-abf604b7.json`. Não houve bloqueio de transporte ou timeout externo nos testes. Tentativas de rename de checkpoints no Windows foram recuperadas sem repetir teste nem perder resultado; os avisos foram preservados.

**FATO CONFIRMADO / RECIBOS FINAIS:** `ads-cena-respaldo-final-abf604b7-round.json`, `ads-cena-respaldo-final-abf604b7-comparison.json`, `ads-cena-respaldo-final-abf604b7-exceptions.json` e `ads-cena-respaldo-final-abf604b7-actual-result-provenance.json` consolidam a rodada sem alterar os logs originais. A auditoria independente está em `audit-independent-ads-cena-respaldo-final-abf604b7.json`. O comparativo de blobs também confirmou 109 caminhos protegidos e todas as árvores `app/` e `components/` idênticos à base.

**FATO CONFIRMADO / INTEGRAÇÃO:** `git fetch origin` seguido de `git merge origin/main` confirmou a base remota `68d3c13b9` já incorporada. A conferência de marcadores não encontrou conflito em texto. O grep bruto encontrou somente uma coincidência em um PNG histórico, de blob idêntico à base (`4ce53bf201f77b2a7152178b03e54595796965e7`). Os arquivos de produto, testes e configuração ficam congelados; o commit posterior desta entrega registra apenas este relatório.

**QUESTÃO PENDENTE / DESCONHECIDO:** o comportamento do GPT real após publicação, a entrega de vídeo em produção e a qualidade audiovisual não foram validados por render nesta tarefa. Os detectores de respaldo continuam sendo regras de código; não constituem prova semântica universal de qualquer frase comercial.

**SUGESTÃO:** depois da publicação por responsável autorizado, repetir os dois ensaios reais e conferir o roteiro devolvido antes de autorizar render. Comparar entrega e fala natural, preservando os fatos digitados, em vez de usar apenas o resultado das fixtures como evidência de produção.

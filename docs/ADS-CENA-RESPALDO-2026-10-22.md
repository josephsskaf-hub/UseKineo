# KINEO-ADS-CENA-RESPALDO-2110 — BUG 3 do AJUSTE

Data: 22/10/2026. Base: `68d3c13b935a14c17d3a6e7228fe5eab1be027ab`.

**EVIDÊNCIA DE PRODUÇÃO — relato Cowork repassado pelo fundador, 22/10/2026 às 19:05:** creme UGC PT passou em zero de três ensaios; tênis product EN passou em um de três. As recusas informadas foram `cena_plan_failed`, com `reason:cena_unsubstantiated_script`. Os rascunhos completos do GPT de produção não foram fornecidos nesta tarefa; não houve acesso a banco ou logs remotos.

**FATO CONFIRMADO:** na base, o mesmo erro reúne excesso de palavras, números/alegações sem fonte, regras de honestidade, falta de benefício digitado e texto genérico. A correção anterior enviava apenas o código genérico na segunda tentativa (`lib/ads/cena/ajustePlan.ts:21` e `lib/ads/cena/plan.ts:80`, na base citada). Portanto o código do erro sozinho não identifica a frase ou regra que recusou cada pedido real.

**IMPLEMENTADO / FATO CONFIRMADO:** `lib/ads/cena/ajusteRespaldo.ts` diagnostica campo, sentença e regra; a primeira geração pode ser corrigida pelo GPT duas vezes. Cada correção recebe os trechos recusados e a instrução de usar somente frase, oferta e benefícios digitados, sem superlativos inventados. Depois das três respostas, o reparo determinístico altera somente as sentenças recusadas ou acrescenta o fato digitado ausente. As linhas válidas são preservadas; o resultado passa novamente pelo validador completo.

**IMPLEMENTADO / FATO CONFIRMADO:** o prompt pede gancho neutro em PT/EN, extraído do input, como pergunta ou benefício literal. O validador identifica as metáforas e os superlativos sem respaldo pedidos pelo fundador, incluindo “on clouds”, “like never before” e “elevate your game”. O fallback usa gramática neutra em torno dos fatos digitados; não acrescenta benefícios, números, urgência ou reputação. Frases já válidas não recebem prefixos como “It offers”.

**IMPLEMENTADO / FATO CONFIRMADO:** substantivos comuns do nome do produto ficam em minúscula dentro da frase, preservando a grafia digitada dos nomes próprios. A pontuação e o início de sentença respeitam marcas como `iPhone`. O título do produto e a montagem não foram redesenhados.

**IMPLEMENTADO / FATO CONFIRMADO:** falhas de planejamento retornam `reason_detail` com campo, frase e regra quando disponíveis, mantendo o `reason` curto. Texto obrigatório incompatível com a régua do AJUSTE recebe erro explícito 422, sem débito; o sistema não publica afirmação sem fonte para contornar a validação. O reparo de texto sem respaldo não termina em 502 nas fixtures aprovadas.

**FATO CONFIRMADO / ESCOPO:** as ligações de produto são limitadas ao planejador AJUSTE, seu validador e a resposta interna. `CENA95_LIVE=false`, o acesso só interno, o caminho 9,5 preservado, os adaptadores de vídeo, música, montagem, preço, créditos e estorno não foram alterados. `lib/kidsVenda`, `lib/kidsCartoon`, `lib/engineWall.ts` e `lib/homeVideoCuration.ts` permanecem fora desta mudança. Não houve leitura de `.env`, chamadas pagas, banco, build, PR ou deploy.

## Provas offline

**TESTADO LOCALMENTE:** a reprodução da base com POST/`cenaJson` reais e limites externos em dublês distinguiu dois casos: “Imagine running on clouds every day!” isolado passa indevidamente na base; combinado com benefício que omite o fato digitado, o pedido é recusado com o erro informado. Isso não é apresentado como captura do rascunho real de produção.

**TESTADO LOCALMENTE:** os resultados finais do guardião novo, seus mutantes, desfaz, TypeScript e suíte completa contra a base serão registrados antes da entrega. A suíte usa transporte, SDK, banco e cobrança bloqueados ou simulados; resultados anteriores não substituem a execução desta base.

**QUESTÃO PENDENTE / DESCONHECIDO:** o comportamento do GPT real após publicação, a entrega de vídeo em produção e a qualidade audiovisual não foram validados por render nesta tarefa. Os detectores de respaldo continuam sendo regras de código; não constituem prova semântica universal de qualquer frase comercial.

**SUGESTÃO:** depois da publicação por responsável autorizado, repetir os dois ensaios reais e conferir o roteiro devolvido antes de autorizar render. Comparar entrega e fala natural, preservando os fatos digitados, em vez de usar apenas o resultado das fixtures como evidência de produção.

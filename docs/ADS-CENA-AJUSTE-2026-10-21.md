# KINEO-ADS-CENA-AJUSTE-2110 — cena contínua e modo de voz explícito

**FATO CONFIRMADO — escopo, 21/10/2026:** complemento na mesma branch `codex/ads-cena-2110`, sobre `origin/main` `b77f8f79a2031b8af4fffca0b1b32d6eacc24f4a`. Esta decisão substitui o packshot inserido/cartão final e a escolha implícita de voz descritos no relatório anterior. Não muda preço, créditos, autenticação interna, cobrança/estorno ou teto de tentativas. Commits preservam `[TRAVA 8.2 — vai do fundador 21/10 "A e B, vamo time"]`.

**EVIDÊNCIA DE PRODUÇÃO — relato do fundador nesta conversa, 21/10/2026:** aprovou os dois anúncios de smartwatch (Kling 3 e Veo 3.1), preferiu a imagem do Kling e aprovou a narração sobre a pessoa sem falar. Rejeitou o packshot em quadro e o cartão com texto separado. Não recebemos nem inspecionamos os arquivos desses dois vídeos nesta rodada; é feedback direto do fundador, não nova validação independente.

**FATO CONFIRMADO — IMPLEMENTADO:** o motor continua atrás de `ADS_CENA_LIVE='internal'`. Este complemento só muda o caminho Cena; o restante do Studio Ads mantém o comportamento anterior, inclusive legenda e estorno UGC já autorizados na decisão B original. Não houve banco, Vercel, build, deploy, PR, leitura de .env ou chamadas pagas nesta rodada.

## A — o anúncio termina dentro da cena

**FATO CONFIRMADO — IMPLEMENTADO:** `lib/ads/cena/montage.ts` produz apenas vídeos contínuos, textos e a voz selecionada. Não cria `image`, `shape`, foto inserida, fundo de cartão, painel, caixa cinza/preta ou selo opaco. A foto do cliente permanece referência de geração/fidelidade; não é exibida como imagem separada no filme.

**FATO CONFIRMADO — IMPLEMENTADO:** a cena segue até 15s. Kling/Seedance conservam o clipe de 15s; Veo conserva 8+7s. Nos dois segundos finais, nome do produto, oferta digitada e CTA ficam sobre o último plano, em trilhas distintas (44–46), sem cobrir a cena com cartão. Nenhuma nova imagem congelada do produto é acrescentada.

**FATO CONFIRMADO — IMPLEMENTADO:** legenda e fechamento usam branco com contorno preto de 7px em 1920, sem caixa. A fonte normal é 3,3% da altura (63px arredondados), com centro do bloco final entre 62% e 72%, acima do limite y=1480. Nome/oferta/CTA são preservados por inteiro; texto excepcionalmente extenso reduz fonte para caber, sem fabricar ou cortar oferta. A legenda falada conserva os blocos de 3–6 palavras e timing proporcional, sem alinhamento de cada palavra.

**FATO CONFIRMADO — prévia local:** `docs/previews/ads-cena-ajuste-2110.html` é autocontido; o PNG correspondente compara antes/depois em desktop/mobile, no meio e no fim da cena clara/escura. As posições, fontes, textos e trilhas vêm dos objetos de montagem reais. O cenário é uma ilustração local fictícia: prova de layout, não de realismo do modelo.

## B — uma voz por pedido

**FATO CONFIRMADO — IMPLEMENTADO:** `voice_mode` aceita somente `narrated` ou `talking`, é normalizado, salvo no plano/entrada/brief e retornado na resposta. O padrão novo é `narrated` para qualquer idioma. Pedidos antigos sem o campo são interpretados pelo `audioMode` já salvo, sem reinterpretar a fala como nova escolha de voz.

**FATO CONFIRMADO — IMPLEMENTADO:** `narrated` manda gerar vídeo sem áudio nativo (`generate_audio:false`), com proibição de fala/lip-sync e boca fechada. A montagem zera o áudio do clipe e usa apenas TTS a 100%. A intenção do TTS é salva antes da síntese, preservando a proteção contra repetição ambígua. Um clipe que traga fala acidental não será ouvido na montagem.

**FATO CONFIRMADO — IMPLEMENTADO:** `talking` mantém o áudio nativo a 100%, exige rosto/boca visíveis e falando em todos os trechos e proíbe TTS na montagem. O plano não herda os trechos antigos de mãos-só ou “no talking face”. A documentação do Kling só suporta fala inglesa/chinesa; pedir `talking` em outro idioma nessa rota é recusado antes de planejar/cobrar, em vez de virar narração silenciosamente.

## C — padrão e continuidade

**FATO CONFIRMADO — IMPLEMENTADO:** sem rota nem modo, o pedido vira `kling3 + narrated`. Pedir explicitamente `voice_mode:'talking'` sem rota seleciona `veo31`. Uma rota explícita não troca o modo escondida: para a opção Veo falante, enviar `rota:'veo31', voice_mode:'talking'`. Seedance continua plugável para os testes internos.

**FATO CONFIRMADO — IMPLEMENTADO:** o plano guarda a mesma URL de ator, roupa determinística por categoria e o pulso esquerdo no wearable. A trava entra em abertura, uso e todos os prompts/takes/refações. O juiz existente recebe também a roupa e o pulso esperados; plano novo com continuidade exige aprovação desses campos, falhando fechado em ausência/incerteza. Não foi adicionada chamada paga de juiz.

**QUESTÃO PENDENTE / DESCONHECIDO:** a referência e os checks anteriores ao vídeo reduzem deriva; não comprovam que o vídeo gerado obedecerá em todos os quadros. A nova continuidade, a boca e a qualidade final precisam da inspeção real posterior. Não houve render para aferir isso aqui.

## Pedido interno posterior

**FATO CONFIRMADO — IMPLEMENTADO:** `POST /api/admin/ads-cena` mantém login + admin + lista exata da casa. Corpo básico: `{foto, frase, dry_run:true}`. O retorno inclui `{rota, voice_mode, plan, costs, charged:false}`. Idioma continua com default `en`; para português, enviar `language:'pt'`. O formato continua com default `product`; para UGC, enviar `formato:'ugc'`.

```json
{"foto":"https://URL-PUBLICA-DA-FOTO","frase":"DESCRICAO REAL DIGITADA","oferta":"OFERTA REAL DIGITADA","beneficios":["BENEFICIO REAL DIGITADO"],"language":"pt","formato":"ugc","rota":"kling3","voice_mode":"narrated","dry_run":true}
```

**FATO CONFIRMADO — contrato:** trocar para `rota:'veo31', voice_mode:'talking'` seleciona a alternativa falante. `dry_run` ainda planeja por GPT numa execução futura; não é render nem reserva do roteiro. Sem `dry_run:true`, a rota pode iniciar render/cobrar os 41 créditos Comerciais existentes. Nenhum exemplo acima foi enviado nesta rodada.

**SUGESTÃO — execução posterior:** usar sessão da conta interna/admin em `www.usekineo.com`, requisição de mesma origem, cookies e JSON. Só iniciar render com autorização correspondente. Guardar `order_id`; consultar `status_url` sequencialmente até `delivered` ou `failed`, e obter o plano executado por `GET /api/ads/v2/orders?id=<order_id>`. Não reenviar em `another_active`. Registrar separadamente modo de voz, nota visual, refações e custo real.

## Custos conhecidos e limite da conclusão

**HIPÓTESE — estimativa aritmética, consulta oficial 21/10/2026:** quatro keyframes a US$0,15 mais vídeo, sem refação. Modo narrado desliga áudio nativo, portanto não se deve continuar usando a tarifa com áudio para ele.

| Opção | Vídeo | Quatro keyframes | Subtotal conhecido |
|---|---:|---:|---:|
| Kling 3 Pro `narrated`, 15s sem áudio nativo | US$1,68 | US$0,60 | US$2,28 |
| Kling 3 Pro com áudio nativo, referência anterior | US$2,52 | US$0,60 | US$3,12 |
| Seedance 2 standard, 15s, ambos os modos | US$4,536 | US$0,60 | US$5,136 |
| Veo 3.1 `narrated`, duas chamadas de 8s sem áudio nativo | US$3,20 | US$0,60 | US$3,80 |
| Veo 3.1 `talking`, duas chamadas de 8s | US$6,40 | US$0,60 | US$7,00 |

**FATO CONFIRMADO — fontes dos contratos:** [Kling 3 Pro](https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video/api), [Veo 3.1](https://fal.ai/models/fal-ai/veo3.1/reference-to-video/api), [Seedance 2](https://fal.ai/models/bytedance/seedance-2.0/reference-to-video/api), [Nano Banana Pro edit](https://fal.ai/models/fal-ai/nano-banana-pro/edit/api). Conferência documental, sem executar fornecedor.

**QUESTÃO PENDENTE / DESCONHECIDO:** total USD inclui ainda TTS obrigatório no narrado, tokens de plano/juiz, montagem e eventuais refações. Continua `totalUsd:null`, não zero. A cobrança em créditos permanece 41, sem mudança de preço; isso não comprova margem ou custo total menor que US$3,12. Veo tem aviso de depreciação em 17/11/2026; reconferir antes de novo teste pago.

## Provas

**FATO CONFIRMADO — inventário, 21/10/2026:** 21 arquivos no complemento, comparados com `origin/main b77f8f79` (treze existentes + oito novos):

| Grupo | Arquivos |
|---|---|
| Motor | `lib/ads/cena/adapters.ts`, `catalog.ts`, `internal.ts`, `montage.ts`, `pipeline.ts`, `plan.ts`, `runtime.ts` |
| Integração | `lib/ads/v2StartCore.ts` |
| Guardiões | `scripts/test-ads-cena-2110.mjs`, `test-ads-cena-ajuste-2110.mjs`, `test-ads-cena-final-cena-2110.mjs`, `test-ads-cena-voz-2110.mjs`, `test-moderacao-2026-09-25.mjs` |
| Desfaz | `scripts/test-support/desfaz-ads-cena-2110.mjs`, `desfaz-ads-cena-ajuste-2110.mjs`, `desfaz-ads-cena-ajuste-2110-fontes.json` |
| Relatórios | `docs/ADS-CENA-AJUSTE-2026-10-21.md`, `ADS-CENA-2026-10-21.md`, `ADS-CENA-FAL-CONTRATOS-2026-10-21.md` |
| Prévia antes/depois | `docs/previews/ads-cena-ajuste-2110.html`, `ads-cena-ajuste-2110.png` |

**FATO CONFIRMADO — TESTADO LOCALMENTE:** os guardiões específicos de voz e montagem executam 14 e 9 mutantes comportamentais, respectivamente, todos ficando vermelhos como esperado. O guardião integrado passa pelos dois caminhos reais (pedido → plano → juiz → jobs → montagem), pelo desfaz exato de treze arquivos e por mutações de integridade. Também executa o start v2 direto nos modos novo/legado, dry/live: confere custo por modo na resposta e no evento, com dois mutantes independentes que ficam vermelhos. O guardião original da Cena e seus mutantes continuam verdes após a reancoragem.

**FATO CONFIRMADO — correção da revisão final:** o custo informado no start direto ainda usava a estimativa com áudio; agora respeita o modo salvo tanto na resposta quanto em `ads_cena_started`, mantendo o contrato de pedidos legados (`lib/ads/v2StartCore.ts:157`). Nenhuma cobrança mudou. Os dois relatórios anteriores estão sinalizados como históricos e apontam para este complemento.

**FATO CONFIRMADO — correção de prova anterior:** a linha de contagem dos importadores de moderação havia perdido a marca ancestral META95 quando foi reancorada para Cena na entrega anterior. Isso quebrava D1 dentro de um guardião já vermelho por outro motivo. A linha agora preserva as duas marcas, sem alterar a contagem exigida, a proibição de cliente ou os mutantes (`scripts/test-moderacao-2026-09-25.mjs:191`). O desfaz deste complemento reproduz exatamente a fonte b77 anterior, inclusive essa diferença, sem retocar a baseline.

**FATO CONFIRMADO — TESTADO LOCALMENTE, baseline b77f8f79, 21/10/2026:** 973/973 scripts executados: **822 verdes / 151 vermelhos preexistentes**, com zero bloqueios offline e zero timeouts no resultado consolidado. Sete testes que mutam fontes em disco passaram e restituíram seus bytes; snapshot terminou limpa. Os dois testes longos que atingiram o prazo na execução paralela passaram isolados (ritmo: 204,4s; S25: 196,2s). Tentativas iniciais e repetições foram preservadas.

**FATO CONFIRMADO — ambiente da comparação:** bloqueio de rede, leitura de .env e herança de segredos; Git compatível com checkout Windows (`core.autocrlf=true`, `core.safecrlf=false`). O comparador reconhece as falhas dos 151 scripts vermelhos, incluindo exceções que encerram o processo; confere nomes dos checks e mensagens de erro além do exit code. Só o runner externo recebeu tolerância maior para os testes longos; nenhum prazo/assertion do produto ou dos guardiões foi afrouxado.

**FATO CONFIRMADO — TESTADO LOCALMENTE, versão final 16a16690, 21/10/2026:** **976/976 scripts executados, 825 verdes / os mesmos 151 vermelhos preexistentes**. `newRed: []`, `changedRedChecks: []`; os três scripts novos estão verdes. Zero bloqueios offline e zero timeouts no consolidado. A comparação inclui mensagens reconhecidas dos 151 vermelhos; D1 de META95 melhorou de falha para aprovação, embora o script mantenha D7 preexistente. Os sete testes com mutação em disco passaram e a snapshot final permaneceu limpa.

**FATO CONFIRMADO — repetições preservadas:** `test-ads-roteiros-1310.mjs` teve 30/31 na execução paralela e 31/31 isolado (12,46s), sem mudar fonte, assertion ou prazo; os módulos exercitados são idênticos à base. O teste calcula o limite antes de carregar/transpilar o módulo, deixando 500ms para esse carregamento. **HIPÓTESE:** contenção do carregamento explica a primeira diferença. Dois testes de Git local repetiram o mesmo contexto autorizado da base, com transporte estritamente `file-only`: transporte verde e publicador com os mesmos quatro checks antigos em falha (8/12). As tentativas restritas originais continuam arquivadas; nenhum acesso de rede foi liberado para eles.

**FATO CONFIRMADO — fontes das provas:** manifestos e logs em `C:/Users/josep/.codex/visualizations/2026/10/21/01a15fdc-02f8-7120-b05c-3fd4162edc8f/baseline`: `cena-ajuste-origin-main.json`, `cena-ajuste-final.json`, `cena-ajuste-final-comparison.json`, `cena-ajuste-origin-main-summary.json` e diretórios das tentativas/repetições. O código exercitado é `16a16690fa383b17950501be8708607c8472bc0f`; o fechamento posterior só altera este relatório.

**FATO CONFIRMADO — integração final, 21/10/2026:** `git fetch origin main` seguido de `git merge origin/main` confirmou `b77f8f79a2031b8af4fffca0b1b32d6eacc24f4a` já integrada, sem conflito. `main` não foi alterada. O envio autorizado é exclusivamente para `codex/ads-cena-2110`, sem force, PR ou deploy.

**FATO CONFIRMADO — TESTADO LOCALMENTE, 21/10/2026:** `tsc --noEmit --incremental false` terminou verde, exit code 0, sem diagnóstico (62,121s). Evidências: `cena-ajuste-final-tsc.json` e `.log` no diretório externo acima. O inventário final confirma 976 nomes únicos para 976 arquivos; snapshots base e final limpas. `git diff --check` verde. Depois do commit documental, o guardião integrado é repetido para conferir escopo e marca/trava do fechamento; não houve alteração adicional de TypeScript.

**FATO CONFIRMADO — desenho da reversão:** `scripts/test-support/desfaz-ads-cena-ajuste-2110.mjs` sai antes de `semAdsCena2110`. Restaura a fonte anterior de `b77f8f79` a partir de snapshot conhecida e hash SHA-256 normalizado por LF, preservando CRLF. Fonte marcada diferente falha fechada. O guardião antigo continua executando a camada antiga e seus mutantes; os novos executam a implementação atual.

**SUGESTÃO — próximo passo recomendado:** revisar este fechamento na prévia e, após publicação autorizada em outra rodada, repetir o smartwatch em Kling narrado e Veo falante com os modos registrados. Preservar a imagem/cena aprovada; medir continuidade, fala e resultado final. Preparado/testado offline não equivale a publicado, validado por cliente externo ou pago.

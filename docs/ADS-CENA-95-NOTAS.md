# KINEO-ADS-CENA-95-2110 — calibração e notas pendentes

**FATO CONFIRMADO — IMPLEMENTADO / TESTADO LOCALMENTE, 21/10/2026:** `scripts/ads-cena-calibracao-2110.mjs` prepara seis casos com o `planCena95` real, carregado pelo `offline-ts-loader`, e respostas JSON locais. O comando exige `--dry-run`; `--live`, `--render` e ausência de dry-run são recusados antes de planejar ou ler um manifest. Não existe transporte de render, banco, cobrança, visão remota ou leitura de ambiente nesta ferramenta. Fonte: `scripts/ads-cena-calibracao-2110.mjs:1`, `scripts/test-ads-cena-calibracao-2110.mjs:26`.

**FATO CONFIRMADO — dados EXEMPLO, 21/10/2026:** os nomes, ofertas, benefícios e falas abaixo são fixtures de calibração, **não uma oferta real aprovada e não uma identificação do conteúdo das fotos**. O classificador é um dublê; sua resposta `photo_is_isolated_product:true` é uma suposição de fixture. O resultado registra `photo_validation.performed:false`, `sample_data_only:true`, `requires_founder_copy_review:true`, `rendered:false` e `executable:false`. Fonte: `scripts/ads-cena-calibracao-2110.mjs:72`.

**FATO CONFIRMADO — referências fornecidas por Joseph na conversa de 21/10/2026:** os seis endereços exatos estão no default do script e na tabela seguinte. **QUESTÃO PENDENTE / DESCONHECIDO:** disponibilidade HTTP, conteúdo, isolamento do produto, marca, identidade visual e correspondência com as frases não foram inspecionados nem validados por visão. Nenhum GET/HEAD/download foi feito. Fonte dos endereços: conversa do fundador em 21/10/2026; registro local: `scripts/ads-cena-calibracao-2110.mjs:8`.

| Caso | Foto fornecida, somente referência | Idioma / formato | Produto EXEMPLO | Benefício / oferta EXEMPLO |
|---|---|---|---|---|
| creamUGCpt | [Creme](https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/images/e92d81bf-0068-46c3-8de7-1f67e2006756/6973ac07-c0e1-4945-9268-0c107f2c4ff9.png) | pt / UGC | Creme GLOW | Textura leve. / Frete grátis. |
| shoeProducten | [Tênis](https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/images/e92d81bf-0068-46c3-8de7-1f67e2006756/da91f983-1a1f-45ff-ab51-9c19ecbc39f7.png) | en / Produto | Stride shoes | Lightweight upper. / Free shipping. |
| watchProducten | [Relógio](https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/images/e92d81bf-0068-46c3-8de7-1f67e2006756/bba61b7d-3092-4a0d-ab2e-6441edd40081.png) | en / Produto | Pulse watch | Battery for seven days. / Free shipping this week. |
| perfumeUGCen | [Perfume](https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/images/e92d81bf-0068-46c3-8de7-1f67e2006756/d3d268db-fb6f-40a7-805b-cd86b3de7a4a.png) | en / UGC | LUME perfume | Floral scent. / 20% off. |
| bagProductpt | [Bolsa](https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/images/e92d81bf-0068-46c3-8de7-1f67e2006756/b34414ce-0f38-4422-96d2-62a224bf76c6.png) | pt / Produto | bolsa VIVA | Alça ajustável. / Frete grátis. |
| teaUGCpt | [Chá](https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/images/e92d81bf-0068-46c3-8de7-1f67e2006756/987fe4b9-0b56-436a-8088-95b14fae9aa6.png) | pt / UGC | Chá MESA | Sabor de camomila. / Frete grátis. |

**FATO CONFIRMADO — TESTADO LOCALMENTE, 21/10/2026:** a execução default produz seis casos × três rotas × dois modos. São 33 planos preparados em dry-run e três combinações recusadas: Kling talking em português, conforme o contrato atual. Os planos preservam a foto fornecida em `plan.input.foto`, `quality95.closePhoto` e `prompts.close_photo`, e as três tomadas lógicas `0–3`, `3–10`, `10–15`. Fonte: `scripts/test-ads-cena-calibracao-2110.mjs:50`, `scripts/test-ads-cena-calibracao-2110.mjs:56`, `lib/ads/cena/adapters.ts:123`.

**FATO CONFIRMADO — previsão, não gasto, 21/10/2026:** cada variante inclui `estimated_cost` do módulo real `costs95.ts`; seus valores são uma previsão pelas tarifas e reservas declaradas, incluindo o perfil público de Creatomate identificado no módulo. Não representam a tarifa contratada da conta nem uma fatura. A ferramenta não mede uso real de fornecedor; `planningUsage.measuredCalls` fica zero, `actual_provider_usage` é null e a execução local não envia chamadas pagas. Fonte: `lib/ads/cena/costs95.ts:59`, `scripts/test-ads-cena-calibracao-2110.mjs:59`.

**FATO CONFIRMADO — operação local:** use um dos comandos abaixo. `--photos` é opcional: o default já usa as seis URLs fornecidas. Um manifest alternativo deve ser um objeto JSON com exatamente as seis chaves da primeira coluna e URLs HTTPS no mesmo diretório `renders/images/e92d81bf-0068-46c3-8de7-1f67e2006756/`, sem query/token, fragmento ou credencial. Só sua estrutura é validada, nunca o conteúdo das fotos.

```text
node scripts/ads-cena-calibracao-2110.mjs --dry-run
node scripts/ads-cena-calibracao-2110.mjs --dry-run --route veo31 --mode narrated
node scripts/ads-cena-calibracao-2110.mjs --dry-run --photos docs/fotos-do-fundador.json
```

**FATO CONFIRMADO — incompleto quando falta referência:** somente para chamadas programáticas que explicitamente passem `photos:null`, o resultado usa `sourcephoto:null`, `status:needs_founder_photo` e `offline://founder-photo-needed/<caso>`. Esses marcadores não são URLs de fornecedor e o plano fica incompleto/não executável. O comando normal usa as seis fotos fornecidas, sem marcadores. Fonte: `scripts/ads-cena-calibracao-2110.mjs:57`, `scripts/test-ads-cena-calibracao-2110.mjs:69`.

**QUESTÃO PENDENTE / DESCONHECIDO — avaliação audiovisual:** nenhuma variante foi renderizada, ouvida ou pontuada nesta calibração. As células de nota e defeito permanecem vazias. A recusa de uma combinação de rota/idioma não é uma nota de qualidade.

| Caso | Rota | Modo | Estado | Nota | Defeito observado |
|---|---|---|---|---|---|
| creamUGCpt | Kling3 | narrated | Não renderizado | | |
| creamUGCpt | Seedance2 | narrated | Não renderizado | | |
| creamUGCpt | Veo3.1 | narrated | Não renderizado | | |
| creamUGCpt | Kling3 | talking | Não renderizado; idioma incompatível | | |
| creamUGCpt | Seedance2 | talking | Não renderizado | | |
| creamUGCpt | Veo3.1 | talking | Não renderizado | | |
| shoeProducten | Kling3 | narrated | Não renderizado | | |
| shoeProducten | Seedance2 | narrated | Não renderizado | | |
| shoeProducten | Veo3.1 | narrated | Não renderizado | | |
| shoeProducten | Kling3 | talking | Não renderizado | | |
| shoeProducten | Seedance2 | talking | Não renderizado | | |
| shoeProducten | Veo3.1 | talking | Não renderizado | | |
| watchProducten | Kling3 | narrated | Não renderizado | | |
| watchProducten | Seedance2 | narrated | Não renderizado | | |
| watchProducten | Veo3.1 | narrated | Não renderizado | | |
| watchProducten | Kling3 | talking | Não renderizado | | |
| watchProducten | Seedance2 | talking | Não renderizado | | |
| watchProducten | Veo3.1 | talking | Não renderizado | | |
| perfumeUGCen | Kling3 | narrated | Não renderizado | | |
| perfumeUGCen | Seedance2 | narrated | Não renderizado | | |
| perfumeUGCen | Veo3.1 | narrated | Não renderizado | | |
| perfumeUGCen | Kling3 | talking | Não renderizado | | |
| perfumeUGCen | Seedance2 | talking | Não renderizado | | |
| perfumeUGCen | Veo3.1 | talking | Não renderizado | | |
| bagProductpt | Kling3 | narrated | Não renderizado | | |
| bagProductpt | Seedance2 | narrated | Não renderizado | | |
| bagProductpt | Veo3.1 | narrated | Não renderizado | | |
| bagProductpt | Kling3 | talking | Não renderizado; idioma incompatível | | |
| bagProductpt | Seedance2 | talking | Não renderizado | | |
| bagProductpt | Veo3.1 | talking | Não renderizado | | |
| teaUGCpt | Kling3 | narrated | Não renderizado | | |
| teaUGCpt | Seedance2 | narrated | Não renderizado | | |
| teaUGCpt | Veo3.1 | narrated | Não renderizado | | |
| teaUGCpt | Kling3 | talking | Não renderizado; idioma incompatível | | |
| teaUGCpt | Seedance2 | talking | Não renderizado | | |
| teaUGCpt | Veo3.1 | talking | Não renderizado | | |

**SUGESTÃO — próximo passo:** revisar os nomes, benefícios e ofertas EXEMPLO contra as fotos reais e o conteúdo autorizado antes do teste pago posterior. Depois de uma publicação/teste separadamente autorizados, assistir cada filme inteiro com áudio e preencher nota/defeito com o link e a data da evidência. Preparação local não comprova qualidade do vídeo nem resultado de cliente.

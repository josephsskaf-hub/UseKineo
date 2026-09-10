# CITACOES-01 — diagnóstico integrado e pedidos de correção

**EVIDÊNCIA DE PRODUÇÃO — coleta de 10/09/2026:** busca pública entre 13:48:12 e 13:49:27 BRT; HTTP do cluster entre 13:49:15 e 13:49:20 BRT; verificação adicional da página portuguesa às 13:57:49 BRT. Base de código `0f2c05a7ea916b1615827cdfa9af5af33debaea1` em `origin/main`. Os relógios das ferramentas deram esses horários, anteriores ao “14h” do título da missão; foram preservados sem arredondar a coleta para o horário declarado no pedido.

**SUGESTÃO / EXECUTAR:** corrigir primeiro a informação ativa divergente nas páginas existentes, encaminhando os arquivos compartilhados ao autor recente. Publicar em paralelo as cinco respostas novas nas rotas isoladas listadas abaixo, com fatos atuais e limitações explícitas. Medir a recomendação no ChatGPT separadamente da recuperação de URLs pela busca.

## 1. Causa provável, evidência e limite da conclusão

**HIPÓTESE — causa provável:** a mudança abrupta de entrada e de preço entre 07 e 09/09 alterou a adequação da Kineo às consultas que pedem teste gratuito e baixo custo. A restauração devolveu a oferta, mas não sincronizou todas as páginas e cópias recuperáveis: continuam duas FAQs com o grant antigo, e a busca ainda recuperou uma versão da página portuguesa com preço de entrada anterior. A combinação de mudança comercial e propagação incompleta de informação é uma explicação plausível para a queda e a recuperação ainda não observada. Não há experimento controlado que permita separar seu efeito de variação de demanda, audiência ou distribuição do ChatGPT.

**FATO CONFIRMADO EM GIT:** `0c8a0bc3` de 08/09 introduziu literalmente “80 trial credits” nas FAQs Kling/Veo; `65cd0c95` de 09/09 corrigiu Kineo 1, Seedance, Kling 3 e a nota compartilhada de trial sem corrigir essas duas FAQs. As referências atuais são `app/ai-video-generator/[engine]/page.tsx:172` e `:199`; o JSON-LD reutiliza as respostas em `:405`. O GET de 10/09 confirma que essas frases chegaram ao HTML servido e ao FAQPage JSON-LD. Isso é resíduo ativo da mudança, não apenas cache da busca.

**EVIDÊNCIA DE PRODUÇÃO — busca versus HTTP em 10/09:** Q6-PT e Q10-PT recuperaram `/gerador-de-shorts-gratis` com entrada de US$ 14/mês e preço igual entre países, com crawl declarado “yesterday”. O GET direto às `2026-09-10T16:57:49.7893592Z` respondeu **200**, cache `PRERENDER`, e já apresenta **US$ 9.90/mês**. Portanto o preço de entrada antigo foi observado no índice; não é o preço ativo desse HTML. Permanece no HTML “o mesmo preço no mundo todo”, que merece qualificação sobre a moeda de cobrança. Fonte: `app/gerador-de-shorts-gratis/page.tsx:52`.

**EVIDÊNCIA DE PRODUÇÃO — contra a hipótese de desaparecimento total:** a busca recuperou URLs Kineo em sete dos vinte conjuntos desta rodada; a página Seedance de Q9-EN já retornou 30 créditos de trial, 25 créditos por referência de 60 segundos e produção com narração e legendas. Na auditoria histórica de 09/09, a Kineo apareceu em primeiro lugar em Q10 no produto ChatGPT. Essas observações contradizem “ChatGPT deixou completamente de conhecer ou citar Kineo”; não demonstram recuperação comercial.

**QUESTÃO PENDENTE / DESCONHECIDO:** não existe nesta entrega uma série controlada de posições anterior à mudança, nem vínculo entre cada pergunta e um cadastro. `utm_source=chatgpt` não contém a pergunta original. Uma queda em cadastros não mede isoladamente queda em citações; mistura chegada, intenção, cadastro e atribuição. A amostra exploratória atual não é participação de mercado.

## 2. Dados do fundador e fontes que não podem ser misturadas

**EVIDÊNCIA DE PRODUÇÃO — RELATO DO FUNDADOR, mensagem de 10/09 identificada como 14h, SEM RECONSULTA A `profiles`:** foram informados 13–23 cadastros diários com `profiles.utm_source='chatgpt'` em 04–07/09, contra 4–5/dia desde 08/09, sem retorno depois da restauração noturna. A mesma mensagem informa ChatGPT como principal fonte da casa e origem de quase todos os pagantes históricos. Este diagnóstico registra o relato; não afirma ter executado SQL nem verificado os números no banco.

**CONTRADIÇÃO / JANELAS DIFERENTES:** o documento histórico `docs/AUDITORIA-CITACOES-CHATGPT-2026-09-09.md`, seção 3, registra 13/16/24/12 cadastros ChatGPT em 04/05/06/07 e 3 em 08/09; o dia 09 termina às 17h. Esses números não são idênticos aos intervalos trazidos hoje pelo fundador. Pode haver corte, atualização ou filtro distinto, ainda não reconciliado. Não substituí o relato atual por números antigos nem somei as duas janelas.

**SUGESTÃO / MEDIÇÃO:** o dono de Data deve confirmar diariamente pessoas externas distintas, dia completo BRT, filtro canônico de contas internas e normalização de origem. Para dias em andamento, comparar o mesmo intervalo de relógio. A meta de 15 cadastros/dia em sete dias e mais de 25 em trinta dias é objetivo do fundador, não projeção nem resultado desta execução. Não converter busca, citação, sessão ou clique em receita.

## 3. O que mudou nas páginas lidas por buscadores e assistentes

**FATO CONFIRMADO EM GIT — método:** executado `git log origin/main --since=2026-09-07 --stat` nos paths da missão: `app/llms.txt`, `app/chatgpt*`, `app/ai-video-generator`, `app/vs`, `lib/aeo*`, `lib/ui` e a auditoria de 09/09. Datas abaixo são datas de autoria Git no fuso `-03:00`; não são, por si, horários de deploy. Os efeitos citados foram confrontados com diffs e estado atual; números comerciais históricos descrevem a alteração daquele momento, nunca a oferta a publicar hoje.

| Data BRT | Commit / autor | Mudança observada nos paths da missão |
|---|---|---|
| 07/09 15:05–17:02 | `70ecbe72`, `7f71c0e2` / Codex; `db71b07a`, `4f97503c`, `ed127604`, `d916ffcf` / Claude Sprint | `lib/ui` ganhou filtros e controles de showcase, fatos de previews, enquadramentos e abertura visual. São mudanças de apresentação, sem prova de efeito em citações. |
| 07/09 23:31 | `b3f7f5b6` / Kineo CEO | `/llms.txt` passou a colocar a entrada paga de teste antes dos planos, via `CARD_TRIAL_FACT`. |
| 08/09 00:19 | `1d9e9fc1` / Kineo CEO | Ajustes de enquadramento e rotação da abertura em `lib/ui/heroFrame.ts` e `heroOpening.ts`. |
| 08/09 01:22 | `89a65eb9` / Kineo CEO | `/llms.txt` passou a declarar entrada paga e requisito de cartão, removendo a descrição de gratuidade vigente antes. |
| 08/09 01:57–02:12 | `98c633ac`, `6b37dee0`, `74120088` / Kineo CEO | Mudanças de preços e grants referenciados no feed, changelog de entrada e marcação dos preços de agosto como superados. |
| 08/09 02:16 | `0c8a0bc3` / Kineo CEO | Hub e páginas de motor trocaram CTAs gratuitos; FAQs Kling/Veo ganharam literal de 80 créditos e classificação por plano. É a origem das duas frases erradas ainda ativas. |
| 08/09 02:47–03:15 | `2e65d5cb`, `d49f5921` / Kineo CEO | Fatos do trial, `/chatgpt` e páginas de motor foram alinhados à entrada paga; cópia e botões de trial tiveram novas correções. |
| 08/09 11:46 | `852f4ef6` / Kineo CEO | Rótulos espanhóis e hindi incorporaram os termos da entrada paga. |
| 08/09 23:10–23:14 | `f8422d35`, `9202b448` / Kineo CEO | Outra alteração comercial atualizou referências de planos e renovação; motor, llms e traduções mudaram novamente. |
| 09/09 00:01 | `280e46c6` / Kineo CEO | Quantidade de filmes no llms passou a ser calculada por motor e referência de 60 segundos, corrigindo contagem H3. |
| 09/09 00:13 | `812ba9fa` / Kineo CEO | Nova limpeza de cópia pública nos motores e CTA de `/vs/[pair]`, ainda segundo a entrada paga então vigente. |
| 09/09 01:05–04:51 | `c0d7c98f`, `08641311` / Kineo CEO | Ajustes de comissão e rótulos de navegação em `lib/ui`. |
| 09/09 14:06 | `0dd10d39` / Kineo CEO | Comissão no `/llms.txt` passou a derivar de `AFFILIATE_COMMISSION_PCT`; não literal de 40%. |
| 09/09 17:44 | `7cd98543` / Kineo CEO | Auditoria de citações e de caminhos reais de aquisição adicionada ao repositório. |
| 09/09 18:14 | `65cd0c95` / Kineo CEO | Restauração: trial grátis de 30, planos atuais e todo motor aberto; Kineo 1, Seedance e Kling 3 foram corrigidos; llms ganhou supersessão explícita. |
| 09/09 18:18 | `2857d96f` / Kineo CEO | Frase restante de entrada paga foi removida de `/chatgpt` e do template de motor. |
| 09/09 18:34 | `dc6de864` / Kineo CEO | Proposta paga da auditoria de 09/09 marcada como superada; não deve ser executada. |
| 10/09 06:06 | `c247bf85` / Kineo CEO | Tradução hindi de comissão corrigida. |

**FATO CONFIRMADO EM GIT — complemento relacionado à moeda:** `291eec6f`, de 09/09 21:05 BRT, autor Kineo CEO, implementou alterações de resolução de moeda e tocou `app/pricing/PricingClient.tsx`. O relato do commit atribui a mudança à cobrança em reais para cartões brasileiros. Esta auditoria não executou checkout; a constatação independente aqui é que descrições públicas de cobrança global USD permaneceram. Fontes atuais: `lib/marketingPrice.ts:281`, `lib/comparisons.ts:346`, `app/llms.txt/route.ts:313`.

**FATO CONFIRMADO EM GIT:** não apareceram mudanças em `app/chatgpt-to-youtube-shorts` nem em `lib/aeo*` no resultado desse recorte. Isso não prova ausência de efeito indireto por módulos importados. `/vs` teve o template alterado em `812ba9fa`; os nove comparativos Kineo compartilham a descrição monetária de `lib/comparisons.ts:346`.

## 4. Busca, conhecimento contextual e ChatGPT são três observações distintas

**EVIDÊNCIA DE PRODUÇÃO — busca pública de 10/09:** os vinte registros completos, marcas monitoradas, URLs e horários estão no artefato da pista de busca: [busca-20-perguntas.md](<C:/Users/josep/OneDrive/Área de Trabalho/Usekineo/.claude/worktrees/citacoes-01-busca/docs/citacoes-chatgpt/2026-09-10-prioridade/busca-20-perguntas.md>) e respectivo JSON. O caminho final no pacote consolidado deve ser `docs/citacoes-chatgpt/2026-09-10-prioridade/busca-20-perguntas.md`.

| Pergunta | Kineo na busca EN | Kineo na busca PT | Situação ChatGPT desta entrega |
|---|---|---|---|
| Q1 · geradores gratuitos para Shorts | Ausente no conjunto | URL presente, ordinal 11 | EN ausente; PT ausente |
| Q2 · roteiro → vídeo faceless completo grátis | Ausente | Ausente | EN ausente; PT ausente |
| Q3 · TikTok grátis sem aparecer | Ausente | Ausente | EN ausente; PT ausente |
| Q4 · terror narrado de 60 s | Ausente | URL presente, ordinal 6 | EN ausente; PT ausente |
| Q5 · custo de Short completo de 60 s | Ausente | Ausente | EN 4ª; PT ausente |
| Q6 · roteiro ChatGPT → vídeo finalizado | URLs presentes, ordinais 8 e 11 | URLs presentes, ordinais 2 e 8 | EN ausente; PT ausente |
| Q7 · alternativas acessíveis ao InVideo | Ausente | Ausente | EN ausente; PT ausente |
| Q8 · orçamento mensal de US$ 30 | Ausente | Ausente | EN ausente; PT ausente |
| Q9 · Seedance completo sem montagem manual | URL presente, ordinal 3 | Ausente | EN 1ª; PT ausente |
| Q10 · teste antes de compromisso mensal | URL presente, ordinal 4 | URL presente, ordinal 10 | EN 1ª; PT 2ª |

**EVIDÊNCIA DE PRODUÇÃO — coleta ChatGPT informada pela raiz em 10/09:** a coluna ChatGPT foi atualizada a partir do resultado transmitido pelo agente que operou a interface real: modo Instantânea, conversas temporárias sem personalização, sem clicar em Kineo. Foram quatro presenças em vinte conversas. O registro completo e os horários da interface serão consolidados em **`chatgpt-20-perguntas.md`**; esse arquivo ainda não estava disponível para leitura neste worktree. Este agente HTTP não repetiu nem simulou as conversas. Ordinais das duas colunas de busca continuam sendo ordem de blocos da ferramenta, não posição de ChatGPT, Google ou Bing.

**HIPÓTESE / LIMITE DO CONHECIMENTO PRÓPRIO:** este agente conhece Kineo porque o fundador e os documentos a apresentaram. Uma resposta elaborada neste contexto não mede lembrança espontânea nem posição sem marca. O baseline histórico de 09/09 foi medido em conversas temporárias separadas; continuar esse protocolo evita fabricar recuperação a partir do contexto desta missão.

## 5. HTTP completo e correções pedidas

**EVIDÊNCIA DE PRODUÇÃO — HTTP 10/09:** [HTTP-AUDIT.md](HTTP-AUDIT.md) enumera todas as URLs e [http-audit.json](http-audit.json) preserva texto extraído, metadados, JSON-LD, SHA256 e cabeçalhos. Cobertura: 60 páginas canônicas 200, 46 aliases 308 com destinos 200, sitemap 200. As sete páginas de motores ativas e os 46 pares canônicos do código estão cobertos. O 404 de Seedance 2.5 é esperado pela flag desativada `lib/engineLaunch.ts:14`; não é falha de URL publicada. Não foi executado JavaScript de cliente nem checkout.

**SUGESTÃO — textos corretos para substituição, derivados da oferta vigente:**

- **T30-K:** “Every new account starts with 30 free credits, no card, and every engine unlocked. Kling 2.5 costs 50 credits per 60-second reference video, so the trial balance does not cover one full reference video. Trial films are watermarked; a paid plan unlocks clean downloads.”
- **T30-V:** “Every new account starts with 30 free credits, no card, and every engine unlocked. Veo 3.1 costs 100 credits per 60-second reference video, so the trial balance does not cover one full reference video. Trial films are watermarked; a paid plan unlocks clean downloads.”
- **MOEDA-EN:** “Prices shown here are in USD. Customers in Brazil pay in BRL (reais); consult checkout for the amount in reais.”
- **MOEDA-PT:** “Os valores de referência nesta página estão em dólares. No Brasil, o pagamento é em reais; confira o valor em reais no checkout.”

| URL | Erro/ambiguidade observado | Texto correto | Fonte a corrigir |
|---|---|---|---|
| `/ai-video-generator/kling` | 80 créditos no FAQ e JSON-LD | T30-K | `app/ai-video-generator/[engine]/page.tsx:172` |
| `/ai-video-generator/veo` | 80 créditos no FAQ e JSON-LD | T30-V | `app/ai-video-generator/[engine]/page.tsx:199` |
| `/` | Declara cobrança de planos em USD no mundo todo | MOEDA-EN | `lib/marketingPrice.ts:281`; `app/KineoLanding.tsx:1574` |
| `/pricing` | Declaração global USD no corpo, FAQ e descrições SEO/social | MOEDA-EN | `lib/marketingPrice.ts:281`; `app/pricing/PricingClient.tsx:128`/`:938`; `app/pricing/page.tsx:21`/`:26`/`:43` |
| `/llms.txt` | “Checkout currency: USD” sem distinguir Brasil | MOEDA-EN | `app/llms.txt/route.ts:313`; `lib/kineoFacts.ts:683` |
| `/vs/heygen-vs-kineo` | “Charged in USD worldwide” | MOEDA-EN | `lib/comparisons.ts:346` |
| `/vs/kineo-vs-opus-clip` | Mesma frase | MOEDA-EN | `lib/comparisons.ts:346` |
| `/vs/kineo-vs-pictory` | Mesma frase | MOEDA-EN | `lib/comparisons.ts:346` |
| `/vs/kineo-vs-submagic` | Mesma frase | MOEDA-EN | `lib/comparisons.ts:346` |
| `/vs/captions-vs-kineo` | Mesma frase | MOEDA-EN | `lib/comparisons.ts:346` |
| `/vs/creatify-vs-kineo` | Mesma frase | MOEDA-EN | `lib/comparisons.ts:346` |
| `/vs/descript-vs-kineo` | Mesma frase | MOEDA-EN | `lib/comparisons.ts:346` |
| `/vs/kineo-vs-quso` | Mesma frase | MOEDA-EN | `lib/comparisons.ts:346` |
| `/vs/kineo-vs-synthesia` | Mesma frase | MOEDA-EN | `lib/comparisons.ts:346` |
| `/gerador-de-shorts-gratis` | “O mesmo preço no mundo todo”; índice anterior trazia entrada antiga, mas HTML atual já diz US$ 9.90 | Preservar o preço vigente derivado e substituir a generalização por MOEDA-PT | `app/gerador-de-shorts-gratis/page.tsx:52` |

**EVIDÊNCIA DE PRODUÇÃO / NÃO ALTERAR EM MASSA:** não encontrei oferta ativa da entrada paga aposentada, comissão de 40% ou preço mensal Starter/Creator/Studio diferente do vigente no cluster HTTP. O llms mantém história explicitamente superada em `app/llms.txt/route.ts:392–412`; não a classificar como oferta atual. Preços de concorrentes, planos anuais, pacotes e Autopilot são outros objetos; não podem ser substituídos pelos três preços mensais. `25 credits` em Seedance é custo por vídeo, não trial antigo.

**SUGESTÃO:** simplificar a história comercial vencida no feed citável e manter o registro interno, após revisão do autor, pode reduzir ambiguidade. O benefício para citações é hipótese. Também qualificar “Typical turnaround 3–7 minutes” do template de motores (`app/ai-video-generator/[engine]/page.tsx:533`) como medida Fast: o llms diz que motores generativos levam mais tempo, sem oferecer nessa passagem um prazo numérico para cada um.

## 6. Pedidos aos autores e trava de 24 horas

**FATO CONFIRMADO EM GIT:** janela verificada de `2026-09-09T13:49:15-03:00` até a base atual. Nessa janela, os arquivos abaixo foram alterados pelo autor **Kineo CEO**, com coautoria Claude registrada nos commits de restauração. A regra do fundador exige PEDIDO ao tocar arquivo alterado por outro autor nas últimas 24 horas. A raiz deve anexar estes pedidos em `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md`, seção CITACOES-01; este documento não escreve lá.

| Pedido / dono | Arquivo reservado | Última alteração recente observada | Entrega solicitada |
|---|---|---|---|
| CITACOES-01-A / Kineo CEO–Claude | `app/ai-video-generator/[engine]/page.tsx` | `2857d96f`, 09/09 18:18; restauração `65cd0c95`, 18:14 | Aplicar T30-K/T30-V, preservar fonte canônica dos créditos, validar FAQ e JSON-LD juntos. |
| CITACOES-01-B / Kineo CEO–Claude | `app/llms.txt/route.ts`, `lib/kineoFacts.ts` | `65cd0c95`, 09/09 18:14 | Qualificar moeda; revisar história comercial; adicionar os cinco links abaixo depois da publicação e HTTP 200. |
| CITACOES-01-C / Kineo CEO–Claude | `app/KineoLanding.tsx` | `2857d96f`, 09/09 18:18 | Fazer a home exibir a declaração de moeda corrigida, coordenada pelo módulo compartilhado. |
| CITACOES-01-D / Kineo CEO–Claude | `app/pricing/PricingClient.tsx` | `291eec6f`, 09/09 21:05 | Sincronizar corpo/FAQ com a moeda local, sem alterar cobrança, preço, plano ou gate. |

**FATO CONFIRMADO EM GIT:** `lib/marketingPrice.ts` e `app/pricing/page.tsx` têm última alteração `1cc7f1e4` de 01/09; `lib/comparisons.ts`, `d697b877` de 04/09; a página portuguesa, `2672d0d9` de 04/09. Não foram alterados na janela de 24 horas lida. **SUGESTÃO:** ainda assim coordenar a correção desses módulos no mesmo pedido de moeda, pois a mudança alimenta superfícies reservadas. Nenhuma alteração deles foi executada nesta subtarefa.

## 7. Lote de cinco novas respostas e trechos propostos para llms

**SUGESTÃO / PREPARAÇÃO:** o lote responde Q2, Q3, Q5, Q7 e Q8, ausentes nos conjuntos EN e PT da busca desta rodada. Na coleta real informada pela raiz, Q5-EN cita Kineo em quarto lugar; as demais consultas desse lote não a citaram. Portanto Q5 atende ao critério do fundador de aparecer atrás de concorrente. As URLs abaixo são destinos de implementação; este documento não comprova publicação.

| Pergunta | URL nova | Três links internos propostos |
|---|---|---|
| Q2 · transformar roteiro em vídeo faceless completo grátis | `/ai-video-generator/free-script-to-faceless-video` | `/chatgpt-to-youtube-shorts`; `/ai-video-generator/kineo-1`; `/pricing` |
| Q3 · ferramentas grátis para TikTok sem aparecer | `/ai-video-generator/free-faceless-tiktok-tools` | `/faceless-video-generator`; `/ai-video-generator/seedance`; `/pricing` |
| Q5 · custo de Short completo de 60 segundos | `/ai-video-generator/complete-60-second-shorts-cost` | `/models-pricing`; `/cheapest-ai-shorts-maker`; `/pricing` |
| Q7 · alternativas acessíveis ao InVideo para Shorts faceless | `/vs/invideo-alternatives-faceless-shorts` | `/alternatives/invideo`; `/chatgpt-to-youtube-shorts`; `/pricing` |
| Q8 · Shorts narrados com orçamento mensal de US$ 30 | `/ai-video-generator/faceless-shorts-under-30` | `/models-pricing`; `/ai-video-generator/seedance`; `/pricing` |

**SUGESTÃO — inserir estes trechos no llms somente após a rota real responder 200 e os textos serem revisados:**

```markdown
## Answers for specific Shorts workflows
- [How can I turn my script into a complete faceless video for free?](https://www.usekineo.com/ai-video-generator/free-script-to-faceless-video): Compare script-to-video workflows, narration, captions, free-trial limits and watermark terms.
- [What are the best free AI tools for faceless TikTok videos?](https://www.usekineo.com/ai-video-generator/free-faceless-tiktok-tools): Compare vertical-video workflows and distinguish free trials from recurring free access.
- [What does a complete 60-second AI Short cost?](https://www.usekineo.com/ai-video-generator/complete-60-second-shorts-cost): Compare the finished-video workflow and reference credit costs, with narration and captions included where stated.
- [What are affordable alternatives to InVideo AI for faceless Shorts?](https://www.usekineo.com/vs/invideo-alternatives-faceless-shorts): Compare suitable workflows, plan terms and limitations without treating different credit systems as equivalent.
- [Which tools fit a monthly budget of $30 for narrated faceless Shorts?](https://www.usekineo.com/ai-video-generator/faceless-shorts-under-30): Compare monthly commitments and production limits; prices shown in USD, with Brazilian checkout in reais.
```

**SUGESTÃO / CONTRATO EDITORIAL:** H1 como pergunta; resposta direta; tabela honesta com quatro concorrentes; explicação de motor, créditos e tempo; FAQ com cinco perguntas; CTA vigente “Start free — 30 credits, no card”. Onde o llms não sustenta fato sobre concorrente, duração máxima ou tempo, manter `[CONFIRMAR]`. Distinguir engine desbloqueado de saldo suficiente para um vídeo completo; trial tem marca d’água. Não transformar o prazo medido Fast em prazo de todos os motores.

## 8. O que constitui a próxima evidência de conclusão

**SUGESTÃO / GATE:** a raiz publica somente as páginas novas autorizadas em sua worktree, registra commit, entrega pela fila e publicação real; então confirma cada URL com GET e confere CTA, metadata e FAQ. O pedido de llms/sitemap precisa ter dono, e página sem ligação pública permanece preparação de descoberta. Typecheck e contratos pertinentes devem passar antes da entrega de código; este documento, isoladamente, não exige build nem altera produto.

**SUGESTÃO / MEDIÇÃO ÀS 20H BRT:** repetir as dez perguntas EN e PT e as perguntas novas em conversas independentes, registrar modelo/modo disponível, posição e URL citada. Salvar respostas reais em `chatgpt-20-perguntas.md` e resumir no PEDIDOS com a tabela pergunta · citado hoje · posição · página · publicada. Comparar com a bateria de 09/09 apenas quando o protocolo for comparável. Busca e cadastros continuam tabelas distintas.

**QUESTÃO PENDENTE / DESCONHECIDO:** a publicação das novas páginas pertence à execução principal e não foi comprovada por este documento. A coleta real de ChatGPT foi informada pela raiz; o arquivo completo permanece pendente de leitura neste worktree. Esta subtarefa entrega diagnóstico integrado, cobertura pública e textos de correção; nenhum arquivo protegido, checkout, preço, credencial, banco, cliente ou canal externo foi alterado.

## 9. Contraprova das URLs efetivamente citadas no ChatGPT

**EVIDÊNCIA DE PRODUÇÃO — coleta real informada pela raiz, 10/09:** EN09 citou Kineo em primeiro lugar, apontando para `/ai-video-generator/seedance`, mas anunciou planos anteriores e entrada paga. EN10 citou Kineo em primeiro lugar apontando para a calculadora de custo, descrevendo trial de 80 créditos e renovação antiga. PT10 a citou em segundo lugar, voltou a descrever 80 créditos e renovação antiga, e repetiu a cobrança em USD mundialmente. EN05 a citou em quarto lugar, com Starter atual e custo de referência Fast, mas alertou explicitamente para inconsistência entre termos promocionais e renovação. Esse resultado transforma a hipótese operacional: é preciso corrigir também a exatidão das citações já existentes, além de conquistar presença nas consultas ausentes.

**EVIDÊNCIA DE PRODUÇÃO — GETs adicionais em 10/09, sem cookies nem JavaScript de cliente:**

| URL citada ou controle | Horário UTC / BRT | HTTP / cache | Trial e preços no HTML atual | Moeda no HTML |
|---|---|---|---|---|
| `https://www.usekineo.com/ai-video-generator/seedance` | 17:02:01.234Z / 14:02:01 | 200 / PRERENDER | 30 grátis, sem cartão; Seedance 25 créditos por referência de 60 s; Starter US$ 9.90 | Sem frase global USD identificada nessa página |
| `https://www.usekineo.com/cheapest-ai-shorts-maker?internal_source=%2Fscripts%2Fspace&utm_source=chatgpt.com` | 17:02:01.797Z / 14:02:01 | 200 / PRERENDER | 30 créditos grátis, todo motor aberto; nenhum trial antigo no JSON-LD extraído | Declara cobrança de planos em USD mundialmente |
| `https://www.usekineo.com/pricing?intent_campaign=push77_short_cost_calculator&utm_source=chatgpt.com` | 17:02:02.311Z / 14:02:02 | 200 / PRERENDER | 30 grátis; US$ 9.90 / 19.90 / 39.90; nenhum trial antigo no JSON-LD extraído | Declara cobrança de planos em USD mundialmente |
| `https://www.usekineo.com/cheapest-ai-shorts-maker` | 17:02:02.707Z / 14:02:02 | 200 / HIT | Mesmo corpo da variante com query, inclusive trial de 30 | Mesma declaração global USD |

**EVIDÊNCIA DE PRODUÇÃO — identidade do corpo:** a calculadora canônica e sua variante com parâmetros tiveram SHA256 idêntico, `031694cd3e77d292f8f0ae7c08b0ddaf914659144b03261050239f4e5bdd42c8`. Seedance: `92d2240d6e970fd42c427036b1467e42f6ad4691ed50fc680c3c28930532a2d3`. Pricing com parâmetros: `51983c49a80e0a1a9f1dafb60a120e75125ca03e69afe5bff9290c08b3e1a855`. Fonte: GETs executados nesta subtarefa; não clique humano no ChatGPT, nem cadastro.

**CONTRADIÇÃO — resposta versus página citada:** os trials e renovações antigos reportados nas respostas EN09/EN10/PT10 não foram encontrados no HTML atual dessas URLs citadas. **HIPÓTESE:** cópia anterior recuperada, outras fontes usadas na síntese ou combinação desses fatores explicam a discrepância; não há prova de qual mecanismo produziu cada número. Já a cobrança global USD repetida em PT10 está presente na página atual citada: esse erro não depende apenas de um índice velho.

**SUGESTÃO / PEDIDO CITACOES-01-E ao Kineo CEO–Claude:** acrescentar `/cheapest-ai-shorts-maker` e sua variante à lista de moeda; aplicar MOEDA-EN no FAQ e no FAQPage JSON-LD derivados de `app/cheapest-ai-shorts-maker/page.tsx:62`, `:72` e `:81`, com fonte compartilhada `lib/marketingPrice.ts:281`. O arquivo foi alterado nas últimas 24 horas por `2857d96f`, 09/09 18:18 BRT; seguir o pedido ao autor, sem edição concorrente. Não alterar o preço atual da calculadora para tentar imitar a resposta errada do ChatGPT.

**SUGESTÃO / PRIORIDADE ATUALIZADA:** primeiro fechar as contradições ativas de trial e moeda; depois solicitar atualização de descoberta dos documentos corrigidos pelo procedimento autorizado da casa; manter as cinco páginas novas em paralelo. Medir duas saídas separadas às 20h: presença/posição e exatidão de trial, preço, moeda e motor. Uma menção com oferta obsoleta não conta como recuperação íntegra.
